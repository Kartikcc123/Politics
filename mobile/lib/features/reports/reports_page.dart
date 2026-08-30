import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/download_helper.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';
import '../families/family_page.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';
import 'configurable_print_page.dart';
import 'political_dashboard_page.dart';

class ReportsPage extends StatelessWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context) => FutureBlock<Map<String, dynamic>>(
        load: () => api.get('/api/reports/dashboard'),
        builder: (data) {
          final total = _number(data['members']);
          final families = _number(data['families']);
          final booths = _number(data['booths']);
          final congress = _support(data, 'supporter');
          final bjp = _support(data, 'opposite');
          final other = (total - congress - bjp).clamp(0, total);
          if (MediaQuery.sizeOf(context).width < 700) {
            return _PhoneReports(
              total: total,
              families: families,
              booths: booths,
              supporter: congress,
              opposite: bjp,
              other: other,
            );
          }
          return AppPage(children: [
            PageHeading(
              title: 'रिपोर्ट',
              subtitle: 'विभिन्न प्रकार की रिपोर्ट देखें और डाउनलोड करें',
              action: FilledButton.icon(
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const ConfigurablePrintPage())),
                  icon: const Icon(Icons.print_rounded),
                  label: const Text('मतदाता सूची प्रिंट')),
            ),
            _reportNavigation(context),
            LayoutBuilder(builder: (context, constraints) {
              final columns = constraints.maxWidth > 720 ? 4 : 2;
              final width =
                  (constraints.maxWidth - (columns - 1) * 10) / columns;
              final cards = [
                MetricCard(
                    label: 'कुल मतदाता',
                    value: '$total',
                    icon: Icons.groups,
                    color: blue),
                MetricCard(
                    label: 'कुल परिवार',
                    value: '$families',
                    icon: Icons.family_restroom,
                    color: green),
                MetricCard(
                    label: 'कांग्रेस समर्थक',
                    value: '$congress',
                    icon: Icons.group,
                    color: green),
                MetricCard(
                    label: 'भाजपा समर्थक',
                    value: '$bjp',
                    icon: Icons.local_florist,
                    color: orange),
                MetricCard(
                    label: 'अन्य / तटस्थ',
                    value: '$other',
                    icon: Icons.help_outline,
                    color: rose),
                MetricCard(
                    label: 'कुल बूथ',
                    value: '$booths',
                    icon: Icons.home_outlined,
                    color: green),
              ];
              return Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: cards
                      .map((c) => SizedBox(width: width, child: c))
                      .toList());
            }),
            LayoutBuilder(builder: (context, constraints) {
              final width = constraints.maxWidth > 720
                  ? (constraints.maxWidth - 12) / 2
                  : constraints.maxWidth;
              return Wrap(spacing: 12, runSpacing: 12, children: [
                SizedBox(
                  width: width,
                  child: SectionCard(
                    title: 'समर्थन स्तर के अनुसार',
                    child: Row(children: [
                      DonutChart(values: [
                        congress.toDouble(),
                        bjp.toDouble(),
                        other.toDouble()
                      ], colors: const [
                        green,
                        orange,
                        purple
                      ], center: '$total'),
                      Expanded(
                          child: Column(children: [
                        _legend('कांग्रेस समर्थक', congress, green),
                        _legend('भाजपा समर्थक', bjp, orange),
                        _legend('अन्य / तटस्थ', other, purple),
                      ])),
                    ]),
                  ),
                ),
                SizedBox(
                  width: width,
                  child: const SectionCard(
                    title: 'बूथ अनुसार मतदाता',
                    child: SizedBox(height: 190, child: _BarChart()),
                  ),
                ),
              ]);
            }),
            const SectionCard(
              title: 'त्वरित रिपोर्ट',
              child: Wrap(spacing: 10, runSpacing: 10, children: [
                _ReportTile(Icons.groups, 'मतदाता सूची', blue),
                _ReportTile(Icons.bar_chart, 'समर्थन स्तर रिपोर्ट', green),
                _ReportTile(Icons.home, 'परिवार सूची', orange),
                _ReportTile(Icons.local_florist, 'राजनीतिक श्रेणी', purple),
                _ReportTile(Icons.location_on, 'बूथ वार रिपोर्ट', rose),
              ]),
            ),
            Wrap(spacing: 8, runSpacing: 8, children: [
              OutlinedButton.icon(
                  onPressed: () => saveApiFile(context,
                      path: '/api/export/members.profiles.pdf',
                      fallbackName: 'report.pdf'),
                  icon: const Icon(Icons.picture_as_pdf, color: Colors.red),
                  label: const Text('PDF डाउनलोड करें')),
              OutlinedButton.icon(
                  onPressed: () => saveApiFile(context,
                      path: '/api/export/members.xlsx',
                      fallbackName: 'report.xlsx'),
                  icon: const Icon(Icons.table_view, color: green),
                  label: const Text('Excel डाउनलोड करें')),
              OutlinedButton.icon(
                  onPressed: () => printApiPdf(context,
                      path: '/api/export/members.profiles.pdf',
                      jobName: 'मतदाता रिपोर्ट'),
                  icon: const Icon(Icons.print, color: blue),
                  label: const Text('प्रिंट करें')),
            ]),
          ]);
        },
      );

  Widget _reportNavigation(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          _tab('सारांश', true, () {}),
          _tab(
              'मतदाता सूची',
              false,
              () => _openReportPage(
                  context, 'मतदाता सूची', const ConfigurablePrintPage())),
          _tab(
              'परिवार',
              false,
              () => _openReportPage(
                  context, 'परिवार रिपोर्ट', const FamilyPage())),
          _tab(
              'राजनीतिक',
              false,
              () => _openReportPage(
                  context, 'राजनीतिक रिपोर्ट', const PoliticalDashboardPage())),
          _tab(
              'बूथ रिपोर्ट',
              false,
              () => _openReportPage(
                  context, 'बूथ रिपोर्ट', const ConfigurablePrintPage())),
        ]),
      );

  void _openReportPage(BuildContext context, String title, Widget page) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: const Color(0xfff7f8fb),
          appBar: AppBar(title: Text(title)),
          body: page,
        ),
      ),
    );
  }

  Widget _tab(String label, bool selected, VoidCallback onPressed) => Container(
        margin: const EdgeInsets.only(right: 8),
        child: selected
            ? FilledButton.icon(
                onPressed: onPressed,
                icon: const Icon(Icons.bar_chart, size: 18),
                label: Text(label))
            : OutlinedButton(onPressed: onPressed, child: Text(label)),
      );
  Widget _legend(String label, int value, Color color) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(children: [
          Container(width: 9, height: 9, color: color),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 11))),
          Text('$value', style: const TextStyle(fontWeight: FontWeight.w800)),
        ]),
      );
}

class _PhoneReports extends StatelessWidget {
  const _PhoneReports({
    required this.total,
    required this.families,
    required this.booths,
    required this.supporter,
    required this.opposite,
    required this.other,
  });
  final int total;
  final int families;
  final int booths;
  final int supporter;
  final int opposite;
  final int other;

  @override
  Widget build(BuildContext context) => AppPage(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 110),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xff173b88), Color(0xff1457f5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(22),
            ),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                CircleAvatar(
                  backgroundColor: Color(0x24ffffff),
                  foregroundColor: Colors.white,
                  child: Icon(Icons.insights_rounded),
                ),
                SizedBox(width: 11),
                Text('मतदाता रिपोर्ट',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w900)),
              ]),
              const SizedBox(height: 18),
              Row(children: [
                _ReportHeroMetric(value: '$total', label: 'मतदाता'),
                _ReportHeroMetric(value: '$families', label: 'परिवार'),
                _ReportHeroMetric(value: '$booths', label: 'बूथ'),
              ]),
            ]),
          ),
          const Text('समर्थन स्थिति',
              style: TextStyle(
                  color: navy, fontSize: 17, fontWeight: FontWeight.w900)),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: border),
            ),
            child: Column(children: [
              _SupportProgress(
                  label: 'समर्थक',
                  value: supporter,
                  total: total,
                  color: green),
              _SupportProgress(
                  label: 'विरोधी', value: opposite, total: total, color: rose),
              _SupportProgress(
                  label: 'अन्य / तटस्थ',
                  value: other,
                  total: total,
                  color: purple),
            ]),
          ),
          const Text('डाउनलोड और प्रिंट',
              style: TextStyle(
                  color: navy, fontSize: 17, fontWeight: FontWeight.w900)),
          _ReportAction(
            icon: Icons.picture_as_pdf_rounded,
            color: rose,
            title: 'Photo सहित PDF रिपोर्ट',
            subtitle: 'मतदाता profile cards की PDF डाउनलोड करें',
            onTap: () => saveApiFile(context,
                path: '/api/export/members.profiles.pdf',
                fallbackName: 'voter-report.pdf'),
          ),
          _ReportAction(
            icon: Icons.table_view_rounded,
            color: green,
            title: 'Excel मतदाता सूची',
            subtitle: 'Search और sorting के लिए पूरी Excel file',
            onTap: () => saveApiFile(context,
                path: '/api/export/members.xlsx', fallbackName: 'voters.xlsx'),
          ),
          _ReportAction(
            icon: Icons.print_rounded,
            color: blue,
            title: 'Custom Print बनाएं',
            subtitle: 'Fields, columns और photo अपनी जरूरत से चुनें',
            onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const ConfigurablePrintPage())),
          ),
        ],
      );
}

class _ReportHeroMetric extends StatelessWidget {
  const _ReportHeroMetric({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w900)),
          Text(label,
              style: const TextStyle(color: Colors.white70, fontSize: 11)),
        ]),
      );
}

class _SupportProgress extends StatelessWidget {
  const _SupportProgress({
    required this.label,
    required this.value,
    required this.total,
    required this.color,
  });
  final String label;
  final int value;
  final int total;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final ratio = total <= 0 ? 0.0 : (value / total).clamp(0, 1).toDouble();
    return Padding(
      padding: const EdgeInsets.only(bottom: 17),
      child: Column(children: [
        Row(children: [
          Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Expanded(
              child: Text(label,
                  style: const TextStyle(
                      color: navy, fontWeight: FontWeight.w700))),
          Text('$value · ${(ratio * 100).round()}%',
              style: const TextStyle(
                  color: muted, fontSize: 12, fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
              value: ratio,
              minHeight: 8,
              color: color,
              backgroundColor: color.withValues(alpha: .1)),
        ),
      ]),
    );
  }
}

class _ReportAction extends StatelessWidget {
  const _ReportAction({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: border),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(15),
            child: Row(children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                    shape: BoxShape.circle, color: color.withValues(alpha: .1)),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              color: navy,
                              fontSize: 14,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 3),
                      Text(subtitle,
                          style: const TextStyle(color: muted, fontSize: 11)),
                    ]),
              ),
              const Icon(Icons.chevron_right_rounded, color: muted),
            ]),
          ),
        ),
      );
}

class _ReportTile extends StatelessWidget {
  const _ReportTile(this.icon, this.label, this.color);

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ConfigurablePrintPage()),
          ),
          child: SizedBox(
            width: 150,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                CircleAvatar(
                  backgroundColor: color.withValues(alpha: .1),
                  child: Icon(icon, color: color),
                ),
                const SizedBox(height: 8),
                Text(label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                const Icon(Icons.arrow_forward_rounded, size: 16, color: muted),
              ]),
            ),
          ),
        ),
      );
}

class _BarChart extends StatelessWidget {
  const _BarChart();
  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: const [
          _Bar('बूथ 1', .78, '5,120'),
          _Bar('बूथ 2', .7, '4,980'),
          _Bar('बूथ 3', .85, '5,250'),
          _Bar('बूथ 4', .75, '5,000'),
          _Bar('बूथ 5', .8, '5,070'),
        ],
      );
}

class _Bar extends StatelessWidget {
  const _Bar(this.label, this.height, this.value);
  final String label;
  final double height;
  final String value;
  @override
  Widget build(BuildContext context) =>
      Column(mainAxisAlignment: MainAxisAlignment.end, children: [
        Text(value,
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700)),
        const SizedBox(height: 5),
        Container(
            width: 26,
            height: 140 * height,
            decoration: BoxDecoration(
                color: blue, borderRadius: BorderRadius.circular(4))),
        const SizedBox(height: 5),
        Text(label, style: const TextStyle(fontSize: 9)),
      ]);
}

int _number(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
int _support(Map data, String key) => (data['support'] as List? ?? [])
    .where((e) => e['_id'] == key)
    .fold<int>(0, (sum, e) => sum + _number(e['count']));
