import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';

class ActivityPage extends StatelessWidget {
  const ActivityPage({super.key});

  @override
  Widget build(BuildContext context) => FutureBlock<List<dynamic>>(
        load: () => api.list('/api/activity'),
        builder: (items) => AppPage(children: [
          const PremiumFeatureHero(
            title: 'गतिविधि इतिहास',
            subtitle: 'ऐप में हुए जरूरी बदलाव आसान भाषा और timeline में देखें।',
            icon: Icons.history_rounded,
            accent: Color(0xff10a9a0),
            badges: ['Readable', 'Latest', 'Secure log'],
          ),
          if (items.isEmpty)
            const _ActivityEmpty()
          else
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: border),
              ),
              child: Column(
                children: items.take(100).map((raw) {
                  final item = Map<String, dynamic>.from(raw as Map);
                  final visual = _visual(item['action']);
                  return Container(
                    padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
                    decoration: const BoxDecoration(
                      border:
                          Border(bottom: BorderSide(color: Color(0xffedf0f5))),
                    ),
                    child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: visual.$2.withValues(alpha: .11),
                            ),
                            child: Icon(visual.$1, color: visual.$2, size: 21),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_label(item['action']),
                                      style: const TextStyle(
                                          color: navy,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w900)),
                                  const SizedBox(height: 3),
                                  Text(_description(item),
                                      style: const TextStyle(
                                          color: muted, fontSize: 12)),
                                ]),
                          ),
                        ]),
                  );
                }).toList(),
              ),
            ),
        ]),
      );
}

class _ActivityEmpty extends StatelessWidget {
  const _ActivityEmpty();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 54, horizontal: 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: border),
        ),
        child: const Center(
          child: Column(children: [
            Icon(Icons.history_toggle_off_rounded, color: blue, size: 48),
            SizedBox(height: 12),
            Text('अभी कोई गतिविधि नहीं है',
                style: TextStyle(
                    color: navy, fontSize: 16, fontWeight: FontWeight.w900)),
            SizedBox(height: 4),
            Text('नए बदलाव यहाँ दिखाई देंगे', style: TextStyle(color: muted)),
          ]),
        ),
      );
}

String _label(dynamic raw) {
  final action = '${raw ?? ''}'.toLowerCase();
  const labels = {
    'member.created': 'नया मतदाता जोड़ा गया',
    'member.updated': 'मतदाता जानकारी बदली गई',
    'member.deleted': 'मतदाता हटाया गया',
    'members.imported': 'मतदाता सूची आयात हुई',
    'import.completed': 'फाइल आयात पूरा हुआ',
    'family.created': 'नया परिवार बनाया गया',
    'family.updated': 'परिवार जानकारी बदली गई',
    'user.created': 'नया उपयोगकर्ता जोड़ा गया',
    'booth.created': 'नया बूथ जोड़ा गया',
    'booth.updated': 'बूथ जानकारी बदली गई',
    'auth.login': 'ऐप में लॉगिन किया गया',
  };
  if (labels[action] != null) return labels[action]!;
  if (action.contains('import')) return 'डेटा आयात किया गया';
  if (action.contains('update')) return 'जानकारी अपडेट की गई';
  if (action.contains('create')) return 'नया रिकॉर्ड जोड़ा गया';
  if (action.contains('delete')) return 'रिकॉर्ड हटाया गया';
  return 'ऐप गतिविधि';
}

String _description(Map item) {
  final after = item['after'];
  final before = item['before'];
  final person = after is Map
      ? '${after['name'] ?? after['title'] ?? ''}'.trim()
      : before is Map
          ? '${before['name'] ?? before['title'] ?? ''}'.trim()
          : '';
  final actor = item['user'] is Map
      ? '${item['user']['name'] ?? ''}'.trim()
      : '${item['userName'] ?? ''}'.trim();
  final date = _date(item['createdAt']);
  final values = [
    if (person.isNotEmpty) person,
    if (actor.isNotEmpty) 'द्वारा $actor',
    if (date.isNotEmpty) date,
  ];
  return values.isEmpty ? 'रिकॉर्ड अपडेट हुआ' : values.join(' · ');
}

(IconData, Color) _visual(dynamic raw) {
  final action = '${raw ?? ''}'.toLowerCase();
  if (action.contains('import')) return (Icons.upload_file_rounded, orange);
  if (action.contains('delete')) return (Icons.delete_outline_rounded, rose);
  if (action.contains('create')) return (Icons.person_add_alt_rounded, green);
  if (action.contains('update')) return (Icons.edit_note_rounded, blue);
  return (Icons.history_rounded, purple);
}

String _date(dynamic raw) {
  final date = DateTime.tryParse('${raw ?? ''}')?.toLocal();
  if (date == null) return '';
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(date.day)}/${two(date.month)}/${date.year} · ${two(date.hour)}:${two(date.minute)}';
}
