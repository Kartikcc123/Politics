import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';

class ImportReviewPage extends StatefulWidget {
  const ImportReviewPage({super.key});

  @override
  State<ImportReviewPage> createState() => _ImportReviewPageState();
}

class _ImportReviewPageState extends State<ImportReviewPage> {
  @override
  Widget build(BuildContext context) => AppPage(children: [
        const PremiumFeatureHero(
            title: 'EPIC समीक्षा सूची',
            subtitle:
                'OCR में अधूरे या अस्पष्ट EPIC records को आसानी से जांचकर ठीक करें।',
            icon: Icons.fact_check_rounded,
            accent: purple,
            badges: ['Review', 'Correct', 'Verified']),
        FutureBlock<List<dynamic>>(
          load: () => api.list('/api/import-reviews'),
          builder: (items) => items.isEmpty
              ? const PremiumEmptyState(
                  icon: Icons.verified_rounded,
                  title: 'सभी EPIC records ठीक हैं',
                  subtitle: 'अभी review के लिए कोई अधूरा record नहीं है।',
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: items.map((raw) {
                    final item = Map<String, dynamic>.from(raw);
                    final voter =
                        Map<String, dynamic>.from(item['suggestedData'] ?? {});
                    return _ReviewRecordCard(
                      item: item,
                      voter: voter,
                      onResolve: () => _resolve(item),
                    );
                  }).toList(),
                ),
        ),
      ]);

  Future<void> _resolve(Map<String, dynamic> item) async {
    final voter = Map<String, dynamic>.from(item['suggestedData'] ?? {});
    final epic = TextEditingController(text: '${voter['voterId'] ?? ''}');
    String? error;
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog.fullscreen(
          child: Scaffold(
            backgroundColor: const Color(0xfff7f8fb),
            appBar: AppBar(
              backgroundColor: Colors.white,
              foregroundColor: navy,
              title: const Text('OCR record ठीक करें',
                  style: TextStyle(fontWeight: FontWeight.w900)),
            ),
            bottomNavigationBar: SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: border)),
                  boxShadow: [
                    BoxShadow(
                        color: Color(0x14071b4b),
                        blurRadius: 18,
                        offset: Offset(0, -8)),
                  ],
                ),
                child: Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context, false),
                      icon: const Icon(Icons.close_rounded),
                      label: const Text('रद्द करें'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton.icon(
                      onPressed: () {
                        final value = epic.text.trim().toUpperCase();
                        final valid =
                            RegExp(r'^[A-Z]{3}[0-9]{7}$').hasMatch(value);
                        if (!valid) {
                          setDialogState(() => error =
                              'EPIC format सही नहीं है। उदाहरण: ABC1234567');
                          return;
                        }
                        epic.text = value;
                        Navigator.pop(context, true);
                      },
                      icon: const Icon(Icons.save_rounded),
                      label: const Text('सहेजें'),
                    ),
                  ),
                ]),
              ),
            ),
            body: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 110),
              children: [
                _ReviewRecordCard(
                  item: item,
                  voter: voter,
                  onResolve: () {},
                  compactAction: true,
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: border),
                  ),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('सही EPIC नंबर डालें',
                            style: TextStyle(
                                color: navy,
                                fontSize: 17,
                                fontWeight: FontWeight.w900)),
                        const SizedBox(height: 10),
                        TextField(
                          controller: epic,
                          textCapitalization: TextCapitalization.characters,
                          onChanged: (value) {
                            final upper = value.toUpperCase();
                            if (upper != value) {
                              epic.value = TextEditingValue(
                                text: upper,
                                selection: TextSelection.collapsed(
                                    offset: upper.length),
                              );
                            }
                            if (error != null) {
                              setDialogState(() => error = null);
                            }
                          },
                          decoration: InputDecoration(
                            labelText: 'EPIC नंबर *',
                            hintText: 'ABC1234567',
                            prefixIcon: const Icon(Icons.badge_outlined),
                            errorText: error,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Format: 3 capital letters + 7 digits. OCR में ? या गलत अक्षर हो तो यहाँ ठीक करें।',
                          style: TextStyle(color: muted, fontSize: 12),
                        ),
                      ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (save != true) return;
    await api.post('/api/import-reviews/${item['_id']}/resolve',
        {'voterId': epic.text.trim()});
    if (mounted) setState(() {});
  }
}

class _ReviewRecordCard extends StatelessWidget {
  const _ReviewRecordCard({
    required this.item,
    required this.voter,
    required this.onResolve,
    this.compactAction = false,
  });

  final Map<String, dynamic> item;
  final Map<String, dynamic> voter;
  final VoidCallback onResolve;
  final bool compactAction;

  @override
  Widget build(BuildContext context) {
    final reason = '${item['reason'] ?? 'Review required'}';
    final reasonInfo = _reasonInfo(reason);
    final name = '${voter['name'] ?? ''}'.trim();
    final epic = '${voter['voterId'] ?? ''}'.trim();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: reasonInfo.color.withValues(alpha: .25)),
        boxShadow: const [
          BoxShadow(
              color: Color(0x0c071b4b), blurRadius: 16, offset: Offset(0, 8)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(
            radius: 25,
            backgroundColor: reasonInfo.color.withValues(alpha: .10),
            child: Icon(reasonInfo.icon, color: reasonInfo.color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name.isEmpty ? 'नाम missing / unreadable' : name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: navy, fontSize: 16, fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text(
                [
                  if ('${voter['guardianName'] ?? ''}'.trim().isNotEmpty)
                    'पिता/पति: ${voter['guardianName']}',
                  if ('${voter['houseNumber'] ?? ''}'.trim().isNotEmpty)
                    'घर ${voter['houseNumber']}',
                ].join(' · '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: muted, fontSize: 12),
              ),
            ]),
          ),
          _ReasonBadge(info: reasonInfo),
        ]),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          _MiniInfo(Icons.badge_outlined,
              epic.isEmpty ? 'EPIC missing' : 'EPIC: $epic'),
          _MiniInfo(
              Icons.phone_rounded,
              '${voter['mobile'] ?? ''}'.trim().isEmpty
                  ? 'Mobile missing'
                  : '${voter['mobile']}'),
          _MiniInfo(Icons.location_on_rounded,
              '${voter['village'] ?? voter['address'] ?? 'Location missing'}'),
        ]),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: reasonInfo.color.withValues(alpha: .07),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Text('Reason: $reason',
              style: const TextStyle(color: navy, fontWeight: FontWeight.w800)),
        ),
        if (!compactAction) ...[
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: onResolve,
              icon: const Icon(Icons.edit_rounded, size: 17),
              label: const Text('EPIC ठीक करें'),
            ),
          ),
        ],
      ]),
    );
  }
}

class _ReasonBadge extends StatelessWidget {
  const _ReasonBadge({required this.info});
  final _ReasonInfo info;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: info.color.withValues(alpha: .10),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(info.label,
            style: TextStyle(
                color: info.color, fontSize: 10, fontWeight: FontWeight.w900)),
      );
}

class _MiniInfo extends StatelessWidget {
  const _MiniInfo(this.icon, this.label);
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xfff7f9ff),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: blue, size: 14),
          const SizedBox(width: 5),
          Text(label,
              style: const TextStyle(
                  color: navy, fontSize: 11, fontWeight: FontWeight.w800)),
        ]),
      );
}

class _ReasonInfo {
  const _ReasonInfo(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;
}

_ReasonInfo _reasonInfo(String reason) {
  final lower = reason.toLowerCase();
  if (lower.contains('name')) {
    return const _ReasonInfo('Name missing', Icons.person_off_rounded, rose);
  }
  if (lower.contains('duplicate')) {
    return const _ReasonInfo('Duplicate', Icons.copy_rounded, orange);
  }
  if (lower.contains('epic') || lower.contains('voter')) {
    return const _ReasonInfo('EPIC issue', Icons.badge_outlined, purple);
  }
  if (lower.contains('missing')) {
    return const _ReasonInfo('Missing data', Icons.error_outline_rounded, rose);
  }
  return const _ReasonInfo('Review', Icons.fact_check_rounded, blue);
}
