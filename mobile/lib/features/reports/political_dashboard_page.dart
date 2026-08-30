import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';

class PoliticalDashboardPage extends StatelessWidget {
  const PoliticalDashboardPage({super.key});

  @override
  Widget build(BuildContext context) => AppPage(children: [
        const PremiumFeatureHero(
            title: 'राजनीतिक विश्लेषण',
            subtitle:
                'Strong और weak booths के साथ actionable voter insights देखें।',
            icon: Icons.insights_rounded,
            badges: ['Booth strength', 'Influence', 'Actionable']),
        FutureBlock<Map<String, dynamic>>(
          load: () => api.get('/api/political-analytics/dashboard'),
          builder: (data) => Column(children: [
            Wrap(spacing: 10, runSpacing: 10, children: [
              _metric('Strong booths',
                  List.from(data['strongBooths'] ?? []).length, green),
              _metric('Weak booths', List.from(data['weakBooths'] ?? []).length,
                  Colors.red),
              _metric('Influential voters',
                  List.from(data['influential'] ?? []).length, blue),
              _metric('Undecided voters',
                  List.from(data['undecided'] ?? []).length, orange),
            ]),
            const SizedBox(height: 14),
            _booths(
                'Strong booths', List.from(data['strongBooths'] ?? []), green),
            const SizedBox(height: 14),
            _booths(
                'Weak booths', List.from(data['weakBooths'] ?? []), Colors.red),
            const SizedBox(height: 14),
            Panel(
              title: 'Influential voters',
              child: Column(
                  children: List.from(data['influential'] ?? []).map((raw) {
                final item = Map<String, dynamic>.from(raw);
                return ListTile(
                  leading:
                      const Icon(Icons.workspace_premium_outlined, color: blue),
                  title: Text('${item['name'] ?? ''} ${item['surname'] ?? ''}'),
                  subtitle: Text(
                      '${item['organizationPost'] ?? '-'} • ${item['village'] ?? '-'}'),
                  trailing: Text('${item['supportLevel'] ?? ''}'),
                );
              }).toList()),
            ),
          ]),
        ),
      ]);

  Widget _metric(String label, int value, Color color) => SizedBox(
        width: 170,
        child: Card(
            child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(children: [
                  Icon(Icons.analytics_outlined, color: color),
                  Text('$value',
                      style: const TextStyle(
                          fontSize: 24, fontWeight: FontWeight.w900)),
                  Text(label, textAlign: TextAlign.center),
                ]))),
      );

  Widget _booths(String title, List<dynamic> items, Color color) => Panel(
        title: title,
        child: Column(
            children: items.take(12).map((raw) {
          final item = Map<String, dynamic>.from(raw);
          return ListTile(
            leading: CircleAvatar(
                backgroundColor: color.withValues(alpha: .12),
                child: Icon(Icons.how_to_vote_outlined, color: color)),
            title: Text('${item['booth']?['number'] ?? item['_id'] ?? '-'}'),
            subtitle: LinearProgressIndicator(
                value: ((item['supportPercent'] ?? 0) as num).toDouble() / 100),
            trailing:
                Text('${(item['supportPercent'] ?? 0).toStringAsFixed(1)}%'),
          );
        }).toList()),
      );
}
