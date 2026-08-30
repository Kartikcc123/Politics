import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../voters/voter_management_page.dart';
import 'import_review_page.dart';
import 'location_review_page.dart';

class AdminReviewHubPage extends StatefulWidget {
  const AdminReviewHubPage({super.key});

  @override
  State<AdminReviewHubPage> createState() => _AdminReviewHubPageState();
}

class _AdminReviewHubPageState extends State<AdminReviewHubPage> {
  int revision = 0;

  Future<Map<String, int>> _counts() async {
    final results = await Future.wait([
      api.list('/api/import-reviews'),
      api.list('/api/members/location-reviews', {'status': 'pending'}),
      api.getQuery('/api/members', {
        'profileCompletionStatus': 'pending',
        'paged': 'true',
        'page': '1',
        'limit': '1',
      }),
    ]);
    final voterResult = Map<String, dynamic>.from(results[2] as Map);
    return {
      'ocr': (results[0] as List).length,
      'location': (results[1] as List).length,
      'survey': (voterResult['total'] as num?)?.toInt() ?? 0,
    };
  }

  Future<void> _open(Widget page) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => page));
    if (mounted) setState(() => revision += 1);
  }

  void _openNext(Map<String, int> counts) {
    if ((counts['ocr'] ?? 0) > 0) {
      _open(const ImportReviewPage());
    } else if ((counts['location'] ?? 0) > 0) {
      _open(const LocationReviewPage());
    } else if ((counts['survey'] ?? 0) > 0) {
      _open(const VoterManagementPage(
        initialProfileCompletionStatus: 'pending',
      ));
    }
  }
  @override
  Widget build(BuildContext context) => AppPage(
        key: ValueKey(revision),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 110),
        children: [
          Row(children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Admin Review',
                      style: TextStyle(
                          color: navy,
                          fontSize: 24,
                          fontWeight: FontWeight.w900)),
                  SizedBox(height: 4),
                  Text('OCR, location और survey की pending queues',
                      style: TextStyle(color: muted)),
                ],
              ),
            ),
            IconButton.outlined(
              tooltip: 'Refresh',
              onPressed: () => setState(() => revision += 1),
              icon: const Icon(Icons.refresh_rounded),
            ),
          ]),
          const SizedBox(height: 18),
          FutureBuilder<Map<String, int>>(
            future: _counts(),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(
                    child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ));
              }
              if (snapshot.hasError) {
                return _ReviewError(onRetry: () => setState(() => revision += 1));
              }
              final counts = snapshot.data ?? const {};
              final total = counts.values.fold<int>(0, (sum, value) => sum + value);
              return Column(children: [
                _ReviewSummary(
                  total: total,
                  onStart: total == 0 ? null : () => _openNext(counts),
                ),
                const SizedBox(height: 12),
                _ReviewQueueTile(
                  title: 'OCR / EPIC समीक्षा',
                  subtitle: 'अस्पष्ट या अधूरे voter records',
                  count: counts['ocr'] ?? 0,
                  icon: Icons.document_scanner_outlined,
                  color: purple,
                  onTap: () => _open(const ImportReviewPage()),
                ),
                _ReviewQueueTile(
                  title: 'लोकेशन समीक्षा',
                  subtitle: 'Raw OCR और master suggestion मिलाएं',
                  count: counts['location'] ?? 0,
                  icon: Icons.edit_location_alt_outlined,
                  color: orange,
                  onTap: () => _open(const LocationReviewPage()),
                ),
                _ReviewQueueTile(
                  title: 'Survey जानकारी बाकी',
                  subtitle: 'Booth manager द्वारा पूरा किया जाना है',
                  count: counts['survey'] ?? 0,
                  icon: Icons.assignment_late_outlined,
                  color: blue,
                  onTap: () => _open(const VoterManagementPage(
                    initialProfileCompletionStatus: 'pending',
                  )),
                ),
              ]);
            },
          ),
        ],
      );
}

class _ReviewSummary extends StatelessWidget {
  const _ReviewSummary({required this.total, required this.onStart});
  final int total;
  final VoidCallback? onStart;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: total == 0 ? softGreen : softBlue,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: total == 0 ? green : blue),
        ),
        child: Row(children: [
          Icon(total == 0 ? Icons.task_alt_rounded : Icons.pending_actions_rounded,
              color: total == 0 ? green : blue, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(total == 0 ? 'सभी reviews पूरे हैं' : '$total pending reviews',
                    style: const TextStyle(
                        color: navy, fontSize: 16, fontWeight: FontWeight.w900)),
                Text(total == 0 ? 'नई pending entry नहीं है' : 'सबसे जरूरी queue से शुरू करें',
                    style: const TextStyle(color: muted, fontSize: 12)),
              ],
            ),
          ),
          if (onStart != null)
            FilledButton.icon(
              onPressed: onStart,
              icon: const Icon(Icons.play_arrow_rounded, size: 18),
              label: const Text('शुरू करें'),
            ),
        ]),
      );
}
class _ReviewQueueTile extends StatelessWidget {
  const _ReviewQueueTile({
    required this.title,
    required this.subtitle,
    required this.count,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final int count;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: border),
        ),
        child: ListTile(
          minVerticalPadding: 14,
          leading: CircleAvatar(
            backgroundColor: color.withValues(alpha: .10),
            foregroundColor: color,
            child: Icon(icon),
          ),
          title: Text(title,
              style: const TextStyle(color: navy, fontWeight: FontWeight.w900)),
          subtitle: Text(subtitle, style: const TextStyle(color: muted)),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            Container(
              constraints: const BoxConstraints(minWidth: 30),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: count > 0 ? color.withValues(alpha: .10) : softGreen,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text('$count',
                  style: TextStyle(
                      color: count > 0 ? color : green,
                      fontWeight: FontWeight.w900)),
            ),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded),
          ]),
          onTap: onTap,
        ),
      );
}

class _ReviewError extends StatelessWidget {
  const _ReviewError({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(children: [
          const Icon(Icons.cloud_off_outlined, color: muted, size: 40),
          const SizedBox(height: 10),
          const Text('Review counts load नहीं हुए।'),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('फिर कोशिश करें'),
          ),
        ]),
      );
}