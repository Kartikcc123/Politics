import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../widgets/common.dart';

int countGroup(Map data, String key) => (data['support'] as List? ?? [])
    .where((e) => e['_id'] == key)
    .fold<int>(0, (a, e) => a + ((e['count'] ?? 0) as int));

List<Map<String, dynamic>> supportRows(Map data) =>
    (data['support'] as List? ?? [])
        .map((e) => {'label': e['_id'] ?? 'unknown', 'value': e['count'] ?? 0})
        .toList();

class Stat extends StatelessWidget {
  const Stat(this.label, this.value, this.icon, this.color, {super.key});
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 190,
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(children: [
              CircleAvatar(
                  backgroundColor: color.withValues(alpha: .1),
                  child: Icon(icon, color: color)),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label,
                          style: const TextStyle(
                              color: Color(0xff405070),
                              fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(value,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                  fontWeight: FontWeight.w900, color: navy)),
                    ]),
              ),
            ]),
          ),
        ),
      );
}

class QuickActions extends StatelessWidget {
  const QuickActions({super.key});

  @override
  Widget build(BuildContext context) => Panel(
      title: 'त्वरित कार्य',
      child: Wrap(spacing: 12, runSpacing: 12, children: const [
        ActionBox(Icons.person_add_alt, 'नया मतदाता जोड़ें'),
        ActionBox(Icons.family_restroom, 'परिवार जोड़ें'),
        ActionBox(Icons.search, 'मतदाता खोजें'),
        ActionBox(Icons.chat, 'व्हाट्सएप संदेश'),
        ActionBox(Icons.picture_as_pdf, 'PDF अपलोड करें'),
        ActionBox(Icons.print, 'प्रिंट / PDF'),
      ]));
}

class ActionBox extends StatelessWidget {
  const ActionBox(this.icon, this.label, {super.key});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 170,
        child: OutlinedButton.icon(
          onPressed: () {},
          icon: Icon(icon),
          label: Text(label),
          style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.all(18),
              alignment: Alignment.centerLeft),
        ),
      );
}

class BoothSummary extends StatelessWidget {
  const BoothSummary({super.key});

  @override
  Widget build(BuildContext context) => const Panel(
      title: 'बूथ अनुसार मतदाता',
      child: Column(children: [
        SimpleRow('बूथ - 1', '1,250'),
        SimpleRow('बूथ - 2', '1,180'),
        SimpleRow('बूथ - 3', '1,310'),
        SimpleRow('बूथ - 4', '1,220'),
      ]));
}

class RecentActivity extends StatelessWidget {
  const RecentActivity({super.key, required this.items});
  final List items;

  @override
  Widget build(BuildContext context) => Panel(
        title: 'हाल की गतिविधियाँ',
        child: Column(
          children: items
              .take(6)
              .map((a) => ListTile(
                  leading: const Icon(Icons.check_circle, color: Colors.green),
                  title: Text('${a['action'] ?? '-'}'),
                  subtitle: Text('${a['createdAt'] ?? ''}')))
              .toList(),
        ),
      );
}

class TodaySummary extends StatelessWidget {
  const TodaySummary({super.key});

  @override
  Widget build(BuildContext context) => const Panel(
      title: 'आज का सारांश',
      child: Wrap(spacing: 40, runSpacing: 12, children: [
        SimpleMetric(Icons.group_add, 'आज जोड़े गए मतदाता', '32'),
        SimpleMetric(Icons.verified, 'आज सत्यापित मतदाता', '18'),
        SimpleMetric(Icons.chat, 'आज भेजे गए संदेश', '256'),
        SimpleMetric(Icons.home, 'आज विजिट किए घर', '85'),
      ]));
}

class StatusCard extends StatelessWidget {
  const StatusCard({super.key, required this.title, required this.items});
  final String title;
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) => Panel(
        title: title,
        child: Column(
            children: items.isEmpty
                ? const [Text('डेटा उपलब्ध नहीं')]
                : items
                    .map((e) => SimpleRow('${e['label']}', '${e['value']}'))
                    .toList()),
      );
}
