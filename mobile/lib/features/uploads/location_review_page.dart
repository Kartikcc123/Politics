import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';

class LocationReviewPage extends StatefulWidget {
  const LocationReviewPage({super.key});

  @override
  State<LocationReviewPage> createState() => _LocationReviewPageState();
}

class _LocationReviewPageState extends State<LocationReviewPage> {
  final search = TextEditingController();
  Timer? debounce;
  String status = 'pending';
  int revision = 0;

  @override
  void dispose() {
    debounce?.cancel();
    search.dispose();
    super.dispose();
  }

  Future<List<dynamic>> _load() => api.list('/api/members/location-reviews', {
    'status': status,
    'q': search.text.trim(),
    'revision': '$revision',
  });

  void _refresh() => setState(() => revision += 1);

  Future<void> _verify(Map<String, dynamic> voter) async {
    final resolution = Map<String, dynamic>.from(voter['locationResolution'] ?? {});
    final suggested = Map<String, dynamic>.from(resolution['suggested'] ?? {});
    final tehsil = TextEditingController(text: '${suggested['tehsil'] ?? voter['tehsil'] ?? ''}');
    final panchayat = TextEditingController(text: '${suggested['gramPanchayat'] ?? voter['gramPanchayat'] ?? ''}');
    final village = TextEditingController(text: '${suggested['village'] ?? voter['village'] ?? ''}');
    final pin = TextEditingController(text: '${suggested['pinCode'] ?? voter['pinCode'] ?? ''}');
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('लोकेशन सत्यापित करें'),
        content: SizedBox(width: 440, child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: tehsil, decoration: const InputDecoration(labelText: 'तहसील')),
          const SizedBox(height: 10),
          TextField(controller: panchayat, decoration: const InputDecoration(labelText: 'ग्राम पंचायत')),
          const SizedBox(height: 10),
          TextField(controller: village, decoration: const InputDecoration(labelText: 'गाँव')),
          const SizedBox(height: 10),
          TextField(controller: pin, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'PIN')),
        ])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('रद्द करें')),
          FilledButton.icon(onPressed: () => Navigator.pop(context, true), icon: const Icon(Icons.verified_outlined), label: const Text('सत्यापित करें')),
        ],
      ),
    );
    if (approved != true) return;
    await api.post('/api/members/location-reviews/${voter['_id']}/resolve', {
      'decision': 'verify',
      'tehsil': tehsil.text.trim(),
      'gramPanchayat': panchayat.text.trim(),
      'village': village.text.trim(),
      'pinCode': pin.text.trim(),
    });
    if (mounted) _refresh();
  }

  Future<void> _reject(Map<String, dynamic> voter) async {
    final note = TextEditingController();
    final rejected = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Suggestion अस्वीकार करें?'),
        content: TextField(controller: note, maxLines: 3, decoration: const InputDecoration(labelText: 'कारण / नोट', hintText: 'गलत गाँव, अस्पष्ट OCR...')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('रद्द करें')),
          FilledButton(onPressed: () => Navigator.pop(context, true), style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text('अस्वीकार करें')),
        ],
      ),
    );
    if (rejected != true) return;
    await api.post('/api/members/location-reviews/${voter['_id']}/resolve', {'decision': 'reject', 'note': note.text.trim()});
    if (mounted) _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('लोकेशन समीक्षा')),
    body: AppPage(children: [
      const Text('लोकेशन समीक्षा', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: navy)),
      const SizedBox(height: 6),
      const Text('OCR value और master suggestion की तुलना करके सही गाँव, पंचायत और PIN सत्यापित करें।', style: TextStyle(color: muted)),
      const SizedBox(height: 16),
      TextField(
        controller: search,
        onChanged: (_) { debounce?.cancel(); debounce = Timer(const Duration(milliseconds: 400), _refresh); },
        decoration: InputDecoration(prefixIcon: const Icon(Icons.search_rounded), hintText: 'नाम, EPIC, गाँव या PIN खोजें...', suffixIcon: search.text.isEmpty ? null : IconButton(onPressed: () { search.clear(); _refresh(); }, icon: const Icon(Icons.close_rounded))),
      ),
      const SizedBox(height: 10),
      SegmentedButton<String>(
        segments: const [ButtonSegment(value: 'pending', label: Text('Pending'), icon: Icon(Icons.pending_actions_outlined)), ButtonSegment(value: 'rejected', label: Text('Rejected'), icon: Icon(Icons.block_outlined))],
        selected: {status},
        onSelectionChanged: (value) => setState(() { status = value.first; revision += 1; }),
      ),
      const SizedBox(height: 16),
      FutureBuilder<List<dynamic>>(
        key: ValueKey('$status|$revision'),
        future: _load(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
          if (snapshot.hasError) return Center(child: Text('${snapshot.error}', style: const TextStyle(color: Colors.red)));
          final items = snapshot.data ?? [];
          if (items.isEmpty) return const _EmptyReview();
          return Column(children: items.map((raw) => _LocationReviewCard(voter: Map<String, dynamic>.from(raw), onVerify: _verify, onReject: _reject)).toList());
        },
      ),
    ]),
  );
}

class _LocationReviewCard extends StatelessWidget {
  const _LocationReviewCard({required this.voter, required this.onVerify, required this.onReject});
  final Map<String, dynamic> voter;
  final Future<void> Function(Map<String, dynamic>) onVerify;
  final Future<void> Function(Map<String, dynamic>) onReject;

  String _value(dynamic raw) {
    if (raw is! Map) return '-';
    final parts = [raw['tehsil'], raw['gramPanchayat'], raw['village']].map((e) => '${e ?? ''}'.trim()).where((e) => e.isNotEmpty).toList();
    if ('${raw['pinCode'] ?? ''}'.trim().isNotEmpty) parts.add('PIN ${raw['pinCode']}');
    if (parts.isEmpty && '${raw['sectionName'] ?? ''}'.trim().isNotEmpty) parts.add('${raw['sectionName']}');
    return parts.isEmpty ? '-' : parts.join(' > ');
  }

  @override
  Widget build(BuildContext context) {
    final resolution = Map<String, dynamic>.from(voter['locationResolution'] ?? {});
    final rejected = resolution['status'] == 'rejected';
    return Container(
      margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const CircleAvatar(backgroundColor: softBlue, foregroundColor: blue, child: Icon(Icons.person_pin_circle_outlined)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${voter['name'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w900, color: navy)), Text('${voter['voterId'] ?? '-'} • घर ${voter['houseNumber'] ?? '-'}', style: const TextStyle(color: muted, fontSize: 12))])),
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: softBlue, borderRadius: BorderRadius.circular(6)), child: Text('${resolution['confidence'] ?? 0}%', style: const TextStyle(color: blue, fontWeight: FontWeight.w900))),
        ]),
        const SizedBox(height: 12),
        _CompareRow(label: 'Raw OCR', value: _value(resolution['raw']), color: orange),
        const SizedBox(height: 8),
        _CompareRow(label: 'Suggested', value: _value(resolution['suggested']), color: blue),
        if ('${resolution['matchedAlias'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Matched alias: ${resolution['matchedAlias']}', style: const TextStyle(color: muted, fontSize: 12))),
        if (rejected && '${resolution['reviewNote'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text('नोट: ${resolution['reviewNote']}', style: const TextStyle(color: Colors.red))),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          OutlinedButton.icon(onPressed: () => onReject(voter), icon: const Icon(Icons.close_rounded), label: const Text('Reject')),
          const SizedBox(width: 8),
          FilledButton.icon(onPressed: () => onVerify(voter), icon: const Icon(Icons.verified_outlined), label: const Text('Verify')),
        ]),
      ]),
    );
  }
}

class _CompareRow extends StatelessWidget {
  const _CompareRow({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;
  @override
  Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [SizedBox(width: 90, child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w900))), Expanded(child: Text(value, style: const TextStyle(color: navy, fontWeight: FontWeight.w700)))]);
}

class _EmptyReview extends StatelessWidget {
  const _EmptyReview();
  @override
  Widget build(BuildContext context) => const Padding(padding: EdgeInsets.all(36), child: Column(children: [Icon(Icons.task_alt_rounded, color: green, size: 44), SizedBox(height: 10), Text('कोई location review pending नहीं है।', style: TextStyle(color: navy, fontWeight: FontWeight.w900))]));
}