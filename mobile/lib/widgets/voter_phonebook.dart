import 'dart:async';

import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../core/api_client.dart';
import '../core/contact_actions.dart';
import '../core/theme.dart';

String voterPhotoUrl(dynamic value, [dynamic fallback]) {
  var photo = '';
  if (value is Map) {
    photo = '${value['photo'] ?? value['sourceDocument']?['ocrCardImage'] ?? value['ocrCardImage'] ?? ''}'.trim();
  } else {
    photo = '${value ?? ''}'.trim();
    if (photo.isEmpty && fallback != null) {
      if (fallback is Map) {
        photo = '${fallback['photo'] ?? fallback['sourceDocument']?['ocrCardImage'] ?? fallback['ocrCardImage'] ?? ''}'.trim();
      } else {
        photo = '${fallback ?? ''}'.trim();
      }
    }
  }
  photo = photo.replaceAll('\\', '/');
  if (photo.isEmpty) return '';
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    final uri = Uri.tryParse(photo);
    if (uri != null &&
        uri.host.endsWith('.amazonaws.com') &&
        uri.pathSegments.isNotEmpty) {
      final key = uri.pathSegments.last;
      return '${api.baseUrl}/media/s3/${Uri.encodeComponent(key)}';
    }
    return Uri.encodeFull(photo);
  }
  final path = photo.startsWith('/') ? photo : '/$photo';
  return Uri.encodeFull('${api.baseUrl}$path');
}

Map<String, String>? voterPhotoHeaders(String url) {
  final ownMediaPrefix = '${api.baseUrl}/media/';
  return url.startsWith(ownMediaPrefix) ? api.headers : null;
}

class VoterAvatar extends StatelessWidget {
  const VoterAvatar({super.key, required this.voter, this.size = 48});

  final Map<String, dynamic> voter;
  final double size;

  @override
  Widget build(BuildContext context) {
    final url = voterPhotoUrl(voter);
    final name = '${voter['name'] ?? ''}'.trim();
    final fallback = name.isEmpty ? '?' : name.characters.first.toUpperCase();
    return ClipOval(
      child: Container(
        width: size,
        height: size,
        color: softBlue,
        alignment: Alignment.center,
        child: url.isEmpty
            ? Text(fallback,
                style:
                    const TextStyle(color: blue, fontWeight: FontWeight.w900))
            : Image.network(
                url,
                headers: voterPhotoHeaders(url),
                width: size,
                height: size,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Text(fallback,
                    style: const TextStyle(
                        color: blue, fontWeight: FontWeight.w900)),
              ),
      ),
    );
  }
}

class SectionVoterPhonebook extends StatefulWidget {
  const SectionVoterPhonebook({
    super.key,
    required this.query,
    this.onOpenVoter,
  });

  final Map<String, String?> query;
  final ValueChanged<Map<String, dynamic>>? onOpenVoter;

  @override
  State<SectionVoterPhonebook> createState() => _SectionVoterPhonebookState();
}

class _SectionVoterPhonebookState extends State<SectionVoterPhonebook> {
  final search = TextEditingController();
  final speech = SpeechToText();
  Timer? debounce;
  bool listening = false;
  int version = 0;

  @override
  void dispose() {
    debounce?.cancel();
    speech.stop();
    search.dispose();
    super.dispose();
  }

  void changed(String _) {
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => version++);
    });
  }

  Future<void> toggleVoice() async {
    if (listening) {
      await speech.stop();
      if (mounted) setState(() => listening = false);
      return;
    }
    final available = await speech.initialize(
      onStatus: (status) {
        if (mounted && (status == 'done' || status == 'notListening')) {
          setState(() => listening = false);
        }
      },
      onError: (_) {
        if (mounted) setState(() => listening = false);
      },
    );
    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('इस डिवाइस पर voice search उपलब्ध नहीं है।')));
      }
      return;
    }
    setState(() => listening = true);
    await speech.listen(
      listenOptions: SpeechListenOptions(
        localeId: 'hi_IN',
        listenMode: ListenMode.search,
        partialResults: true,
      ),
      onResult: (result) {
        search.text = result.recognizedWords;
        search.selection = TextSelection.collapsed(offset: search.text.length);
        if (mounted) setState(() {});
        if (result.finalResult && mounted) setState(() => version++);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final query = <String, String?>{
      ...widget.query,
      'contactType': 'voter',
      'q': search.text.trim(),
      'paged': 'true',
      'page': '1',
      'limit': '200',
    };
    return Column(children: [
      TextField(
        controller: search,
        onChanged: changed,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'नाम, पिता/पति, मोबाइल, EPIC या मकान नंबर',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: Row(mainAxisSize: MainAxisSize.min, children: [
            if (search.text.isNotEmpty)
              IconButton(
                tooltip: 'खोज साफ करें',
                onPressed: () {
                  debounce?.cancel();
                  search.clear();
                  setState(() => version++);
                },
                icon: const Icon(Icons.close_rounded),
              ),
            IconButton(
              tooltip: listening ? 'सुनना बंद करें' : 'बोलकर खोजें',
              onPressed: toggleVoice,
              icon: Icon(listening ? Icons.mic_rounded : Icons.mic_none_rounded,
                  color: listening ? Colors.red : blue),
            ),
          ]),
        ),
      ),
      if (listening)
        const Padding(
          padding: EdgeInsets.only(top: 7),
          child: Row(children: [
            SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2)),
            SizedBox(width: 7),
            Text('सुन रहा है…', style: TextStyle(color: blue)),
          ]),
        ),
      const SizedBox(height: 12),
      Expanded(
        child: FutureBuilder<Map<String, dynamic>>(
          key: ValueKey(version),
          future: api.getQuery('/api/members', query),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(
                child: Text('${snapshot.error}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.red)),
              );
            }
            final voters = (snapshot.data?['items'] as List? ?? const [])
                .whereType<Map>()
                .map((item) => Map<String, dynamic>.from(item))
                .toList();
            if (voters.isEmpty) {
              return Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.person_search_rounded,
                      size: 52, color: muted),
                  const SizedBox(height: 8),
                  const Text('कोई मतदाता नहीं मिला',
                      style:
                          TextStyle(color: navy, fontWeight: FontWeight.w900)),
                  if (search.text.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        search.clear();
                        setState(() => version++);
                      },
                      child: const Text('खोज साफ करें'),
                    ),
                ]),
              );
            }
            return ListView.separated(
              itemCount: voters.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, index) => VoterPhoneTile(
                voter: voters[index],
                onTap: widget.onOpenVoter == null
                    ? null
                    : () => widget.onOpenVoter!(voters[index]),
              ),
            );
          },
        ),
      ),
    ]);
  }
}

class VoterPhoneTile extends StatelessWidget {
  const VoterPhoneTile({
    super.key,
    required this.voter,
    this.trailing,
    this.onTap,
  });

  final Map<String, dynamic> voter;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final guardian = '${voter['guardianName'] ?? ''}'.trim();
    final mobile = '${voter['mobile'] ?? ''}'.trim();
    final epic = '${voter['voterId'] ?? ''}'.trim();
    final house = '${voter['houseNumber'] ?? ''}'.trim();
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          VoterAvatar(voter: voter, size: 48),
          const SizedBox(width: 11),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${voter['name'] ?? '-'} ${voter['surname'] ?? ''}'.trim(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: navy, fontWeight: FontWeight.w900)),
              if (guardian.isNotEmpty)
                Text('पिता/पति: $guardian',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: muted, fontSize: 12)),
              const SizedBox(height: 3),
              Wrap(spacing: 10, runSpacing: 3, children: [
                if (mobile.isNotEmpty) Text(mobile, style: _metaStyle),
                if (epic.isNotEmpty) Text('EPIC $epic', style: _metaStyle),
                if (house.isNotEmpty) Text('मकान $house', style: _metaStyle),
              ]),
            ]),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            trailing!,
          ] else if (mobile.isNotEmpty) ...[
            IconButton(
              tooltip: 'Call',
              visualDensity: VisualDensity.compact,
              onPressed: () => callNumber(context, mobile),
              icon: const Icon(Icons.call_rounded, color: green),
            ),
            IconButton(
              tooltip: 'WhatsApp',
              visualDensity: VisualDensity.compact,
              onPressed: () => openWhatsApp(context, mobile,
                  message: 'नमस्कार ${voter['name'] ?? ''}'),
              icon: const Icon(Icons.chat_rounded, color: green),
            ),
          ],
        ]),
      ),
    );
  }
}

const _metaStyle =
    TextStyle(color: muted, fontSize: 11, fontWeight: FontWeight.w700);
