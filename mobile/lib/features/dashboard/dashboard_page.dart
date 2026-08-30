import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';
import '../activity/activity_page.dart';
import '../areas/area_directory_page.dart';
import '../families/family_page.dart';
import '../reports/configurable_print_page.dart';
import '../uploads/upload_page.dart';
import '../voters/voter_management_page.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key, required this.onNavigate});
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context) => FutureBlock<Map<String, dynamic>>(
        load: () => api.get('/api/reports/dashboard'),
        builder: (data) {
          if (MediaQuery.sizeOf(context).width < 700) {
            return _PhoneDashboard(data: data, onNavigate: onNavigate);
          }
          if (api.user?['role'] == 'booth') {
            return _BoothManagerHome(data: data, onNavigate: onNavigate);
          }
          final total = _number(data['members']);
          final families = _number(data['families']);
          final booths = _number(data['booths']);
          final review = _group(data, 'verification', 'needs_review') +
              _group(data, 'verification', 'duplicate');
          final congress = _group(data, 'support', 'supporter');
          final opposite = _group(data, 'support', 'opposite');
          final other = (total - congress - opposite).clamp(0, total);
          final villages = List<Map<String, dynamic>>.from(
            (data['villageDistribution'] as List? ?? [])
                .map((e) => Map<String, dynamic>.from(e)),
          );
          final assembly = Map<String, dynamic>.from(data['assembly'] ?? {});
          final assemblyId = Map<String, dynamic>.from(assembly['_id'] ?? {});

          return AppPage(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            children: [
              AppHeroBanner(
                title: 'नमस्कार, ${api.user?['name'] ?? 'Admin'} 👋',
                subtitle:
                    'आज के जरूरी काम, मतदाता जानकारी और संगठन की स्थिति एक ही जगह देखें',
                icon: Icons.dashboard_customize_rounded,
                trailing: Wrap(spacing: 10, runSpacing: 10, children: [
                  VisualSummaryCard(
                    title: 'विधानसभा',
                    value: '${assemblyId['number'] ?? '-'}',
                    subtitle: '${assemblyId['name'] ?? 'चयनित नहीं'}',
                    icon: Icons.account_balance_rounded,
                    color: blue,
                  ),
                  VisualSummaryCard(
                    title: 'आज जोड़े',
                    value: '${_number(data['createdToday'])}',
                    subtitle: 'नए मतदाता',
                    icon: Icons.person_add_alt_1_rounded,
                    color: green,
                  ),
                ]),
                primaryAction: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: blue,
                  ),
                  onPressed: () => onNavigate(1),
                  icon: const Icon(Icons.search_rounded),
                  label: const Text('मतदाता खोजें'),
                ),
                secondaryAction: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                  ),
                  onPressed: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const UploadPage())),
                  icon: const Icon(Icons.upload_file_rounded),
                  label: const Text('फाइल अपलोड'),
                ),
              ),
              _MetricGrid(items: [
                _MetricData('कुल मतदाता', '$total', Icons.groups_rounded, blue,
                    '${_number(data['createdToday'])} आज जोड़े'),
                _MetricData('कुल परिवार', '$families', Icons.home_work_rounded,
                    green, 'परिवार रिकॉर्ड'),
                _MetricData('कुल बूथ', '$booths', Icons.how_to_vote_rounded,
                    orange, 'सक्रिय क्षेत्र'),
                _MetricData(
                    'समीक्षा जरूरी',
                    '$review',
                    Icons.fact_check_rounded,
                    review > 0 ? rose : green,
                    review > 0 ? 'डेटा जाँचें' : 'सब ठीक है'),
              ]),
              const _SectionHeading(
                  title: 'जरूरी काम',
                  subtitle: 'रोज़ इस्तेमाल होने वाले मुख्य विकल्प'),
              _ActionGrid(actions: [
                _ActionData(Icons.search_rounded, 'मतदाता खोजें',
                    'नाम, EPIC, मोबाइल या गाँव से', blue, () => onNavigate(1)),
                _ActionData(
                    Icons.person_add_alt_1_rounded,
                    'नया मतदाता',
                    'नया रिकॉर्ड जोड़ें और सत्यापित करें',
                    green,
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const VoterManagementPage()))),
                _ActionData(
                    Icons.upload_file_rounded,
                    'डेटा इम्पोर्ट',
                    'PDF, Excel या CSV अपलोड करें',
                    orange,
                    () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const UploadPage()))),
                _ActionData(
                    Icons.account_balance_rounded,
                    'क्षेत्र एवं गाँव',
                    'विधानसभा से गाँव तक प्रबंधन',
                    purple,
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const AreaDirectoryPage()))),
                _ActionData(
                    Icons.family_restroom_rounded,
                    'परिवार प्रबंधन',
                    'घर और परिवार के सदस्य देखें',
                    green,
                    () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const FamilyPage()))),
                _ActionData(
                    Icons.print_rounded,
                    'चयन एवं प्रिंट',
                    'चुनी हुई जानकारी के साथ एक साथ प्रिंट करें',
                    blue,
                    () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ConfigurablePrintPage()))),
              ]),
              LayoutBuilder(builder: (context, constraints) {
                final width = constraints.maxWidth >= 900
                    ? (constraints.maxWidth - 12) / 2
                    : constraints.maxWidth;
                return Wrap(spacing: 12, runSpacing: 12, children: [
                  SizedBox(
                      width: width,
                      child: _VillageCard(items: villages, total: total)),
                  SizedBox(
                      width: width,
                      child: _SupportCard(
                          total: total,
                          congress: congress,
                          opposite: opposite,
                          other: other)),
                  SizedBox(
                      width: width,
                      child: _QualityCard(
                          missingMobile: _number(data['missingMobile']),
                          missingHouse: _number(data['missingHouseNumber']),
                          review: review,
                          total: total,
                          onOpen: () => onNavigate(1))),
                  SizedBox(
                      width: width,
                      child: _ActivityCard(
                          items: List.from(data['recentActivity'] ?? []))),
                ]);
              }),
            ],
          );
        },
      );
}

class _PhoneDashboard extends StatelessWidget {
  const _PhoneDashboard({required this.data, required this.onNavigate});

  final Map<String, dynamic> data;
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context) {
    final total = _number(data['members']);
    final today = _number(data['createdToday']);
    final families = _number(data['families']);
    final review = _group(data, 'verification', 'needs_review') +
        _group(data, 'verification', 'duplicate');
    final activities = List.from(data['recentActivity'] ?? const []);
    return RefreshIndicator(
      onRefresh: () async => api.notifyDataChanged(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 110),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xff1769e8), Color(0xff377ff0)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x291769e8),
                    blurRadius: 22,
                    offset: Offset(0, 10)),
              ],
            ),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Overview',
                            style:
                                TextStyle(color: Colors.white70, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text('नमस्ते, ${api.user?['name'] ?? 'Admin'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w900)),
                      ]),
                ),
                const Icon(Icons.insights_rounded,
                    color: Colors.white, size: 28),
              ]),
              const SizedBox(height: 20),
              Row(children: [
                _PhoneMetric(value: '$total', label: 'मतदाता'),
                _PhoneMetric(value: '$today', label: 'आज जोड़े'),
                _PhoneMetric(value: '$families', label: 'परिवार'),
                _PhoneMetric(value: '$review', label: 'Review'),
              ]),
            ]),
          ),
          const SizedBox(height: 22),
          const Text('Quick Actions',
              style: TextStyle(
                  color: navy, fontSize: 17, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: border),
            ),
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _PhoneQuickAction(
                    icon: Icons.person_search_rounded,
                    label: 'खोजें',
                    color: blue,
                    onTap: () => onNavigate(1),
                  ),
                  _PhoneQuickAction(
                    icon: Icons.person_add_alt_1_rounded,
                    label: 'नया संपर्क',
                    color: green,
                    onTap: () => showDialog(
                      context: context,
                      builder: (_) => VoterForm(onSaved: api.notifyDataChanged),
                    ),
                  ),
                  _PhoneQuickAction(
                    icon: Icons.upload_file_rounded,
                    label: 'PDF Upload',
                    color: orange,
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const UploadPage())),
                  ),
                  _PhoneQuickAction(
                    icon: Icons.family_restroom_rounded,
                    label: 'परिवार',
                    color: purple,
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const FamilyPage())),
                  ),
                ]),
          ),
          const SizedBox(height: 22),
          Row(children: [
            const Expanded(
              child: Text('हाल की गतिविधियाँ',
                  style: TextStyle(
                      color: navy, fontSize: 17, fontWeight: FontWeight.w900)),
            ),
            TextButton(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const ActivityPage())),
              child: const Text('सभी देखें'),
            ),
          ]),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: border),
            ),
            child: activities.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(28),
                    child: Center(
                      child: Text('अभी कोई नई activity नहीं है',
                          style: TextStyle(color: muted)),
                    ),
                  )
                : Column(
                    children: activities.take(6).map((activity) {
                      final item = activity is Map ? activity : const {};
                      final action =
                          _activityLabel(item['action'] ?? item['type']);
                      final description = _activityDescription(item);
                      final visual =
                          _activityVisual(item['action'] ?? item['type']);
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: visual.$2.withValues(alpha: .11),
                          foregroundColor: visual.$2,
                          child: Icon(visual.$1, size: 20),
                        ),
                        title: Text(action,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: navy, fontWeight: FontWeight.w800)),
                        subtitle: description.isEmpty
                            ? null
                            : Text(description,
                                maxLines: 2, overflow: TextOverflow.ellipsis),
                      );
                    }).toList(),
                  ),
          ),
        ],
      ),
    );
  }
}

class _PhoneMetric extends StatelessWidget {
  const _PhoneMetric({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 19,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white70, fontSize: 10)),
        ]),
      );
}

class _PhoneQuickAction extends StatelessWidget {
  const _PhoneQuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withValues(alpha: .10),
                ),
                child: Icon(icon, color: color, size: 21),
              ),
              const SizedBox(height: 7),
              Text(label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: navy, fontSize: 10, fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
      );
}

String _assignedBoothLabel(Map<String, dynamic> booth) {
  final name = '${booth['name'] ?? ''}'.trim();
  final number = '${booth['number'] ?? ''}'.trim();
  if (name.isNotEmpty && name != '-') return 'भाग: $name';
  if (number.isNotEmpty) return 'भाग: $number';
  return 'निर्धारित भाग';
}

class _MetricData {
  const _MetricData(
      this.label, this.value, this.icon, this.color, this.caption);
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String caption;
}

class _BoothManagerHome extends StatelessWidget {
  const _BoothManagerHome({required this.data, required this.onNavigate});

  final Map<String, dynamic> data;
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context) {
    final user = api.user ?? const <String, dynamic>{};
    // Prefer fresh API data so a renamed booth is visible without logging in again.
    final booth = Map<String, dynamic>.from(
        data['assignedBooth'] ?? user['assignedBooth'] ?? {});
    final total = _number(data['members']);
    final families = _number(data['families']);
    final today = _number(data['createdToday']);
    final missingMobile = _number(data['missingMobile']);
    final missingHouse = _number(data['missingHouseNumber']);
    final review = _group(data, 'verification', 'needs_review') +
        _group(data, 'verification', 'duplicate');
    final supporter = _group(data, 'support', 'supporter');
    final opposite = _group(data, 'support', 'opposite');
    final neutral = (total - supporter - opposite).clamp(0, total);

    return AppPage(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: royalBlue,
            borderRadius: BorderRadius.circular(12),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1f071b4b),
                  blurRadius: 18,
                  offset: Offset(0, 8)),
            ],
          ),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const CircleAvatar(
                backgroundColor: Colors.white,
                foregroundColor: blue,
                child: Icon(Icons.admin_panel_settings_rounded),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('नमस्कार, ${user['name'] ?? 'बूथ प्रबंधक'}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w900)),
                      Text(_assignedBoothLabel(booth),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 12)),
                    ]),
              ),
            ]),
            const SizedBox(height: 14),
            Wrap(spacing: 8, runSpacing: 8, children: [
              _LightPill(Icons.how_to_vote_rounded, '$total मतदाता'),
              _LightPill(Icons.home_work_rounded, '$families परिवार'),
              _LightPill(Icons.person_add_alt_rounded, 'आज $today जोड़े'),
            ]),
          ]),
        ),
        LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth >= 760 ? 4 : 2;
          final width = (constraints.maxWidth - (columns - 1) * 10) / columns;
          return Wrap(spacing: 10, runSpacing: 10, children: [
            SizedBox(
                width: width,
                child: MetricCard(
                    label: 'मतदाता',
                    value: '$total',
                    icon: Icons.groups_rounded,
                    color: blue,
                    caption: 'आपका बूथ')),
            SizedBox(
                width: width,
                child: MetricCard(
                    label: 'समर्थक',
                    value: '$supporter',
                    icon: Icons.thumb_up_alt_rounded,
                    color: green,
                    caption: 'चिह्नित समर्थन')),
            SizedBox(
                width: width,
                child: MetricCard(
                    label: 'समीक्षा',
                    value: '$review',
                    icon: Icons.fact_check_rounded,
                    color: review > 0 ? orange : green,
                    caption: 'जांच आवश्यक')),
            SizedBox(
                width: width,
                child: MetricCard(
                    label: 'अधूरी जानकारी',
                    value: '${missingMobile + missingHouse}',
                    icon: Icons.error_outline_rounded,
                    color: rose,
                    caption: 'मोबाइल / घर संख्या')),
          ]);
        }),
        _SectionHeading(
            title: 'जरूरी काम', subtitle: 'अपना काम सीधे यहां से खोलें'),
        _ActionGrid(actions: [
          _ActionData(Icons.search_rounded, 'मतदाता खोजें',
              'नाम, EPIC, मोबाइल या घर से खोजें', blue, () => onNavigate(1)),
          _ActionData(Icons.assignment_turned_in_outlined, 'जानकारी पूरी करें',
              'बाकी voter survey जानकारी भरें', green, () => onNavigate(1)),
          _ActionData(Icons.print_rounded, 'सूची प्रिंट करें',
              'चुने हुए मतदाताओं की जानकारी प्रिंट करें', orange, () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const ConfigurablePrintPage()));
          }),
          _ActionData(Icons.family_restroom_rounded, 'परिवार',
              'परिवार रिकॉर्ड देखें', purple, () => onNavigate(2)),
        ]),
        LayoutBuilder(builder: (context, constraints) {
          final wide = constraints.maxWidth >= 780;
          final width =
              wide ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth;
          return Wrap(spacing: 12, runSpacing: 12, children: [
            SizedBox(
              width: width,
              child: SectionCard(
                title: 'समर्थन स्थिति',
                subtitle: 'इस बूथ की वर्तमान राजनीतिक स्थिति',
                icon: Icons.pie_chart_rounded,
                child: Row(children: [
                  DonutChart(
                    values: [
                      supporter.toDouble(),
                      opposite.toDouble(),
                      neutral.toDouble(),
                    ],
                    colors: const [blue, orange, purple],
                    center: '$total',
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(children: [
                      _LegendRow('समर्थक', supporter, blue),
                      _LegendRow('विपक्ष', opposite, orange),
                      _LegendRow('तटस्थ', neutral, purple),
                    ]),
                  ),
                ]),
              ),
            ),
            SizedBox(
              width: width,
              child: SectionCard(
                title: 'जानकारी सुधारें',
                subtitle: 'अधूरी मतदाता जानकारी पूरी करें',
                icon: Icons.checklist_rounded,
                action: TextButton(
                    onPressed: () => onNavigate(1),
                    child: const Text('मतदाता खोलें')),
                child: Column(children: [
                  _QualityRow(Icons.phone_rounded, 'मोबाइल नंबर नहीं है',
                      missingMobile, total, rose),
                  _QualityRow(Icons.home_rounded, 'घर संख्या नहीं है',
                      missingHouse, total, orange),
                  _QualityRow(Icons.fact_check_rounded, 'समीक्षा आवश्यक',
                      review, total, purple),
                ]),
              ),
            ),
          ]);
        }),
      ],
    );
  }
}

class _LightPill extends StatelessWidget {
  const _LightPill(this.icon, this.text);

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .14),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white24),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: Colors.white, size: 15),
          const SizedBox(width: 5),
          Text(text,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w800)),
        ]),
      );
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.items});
  final List<_MetricData> items;

  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (_, constraints) {
        final columns = constraints.maxWidth >= 1000
            ? 4
            : constraints.maxWidth >= 360
                ? 2
                : 1;
        final width = (constraints.maxWidth - (columns - 1) * 12) / columns;
        return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: items
                .map((item) => SizedBox(
                    width: width,
                    child: MetricCard(
                        label: item.label,
                        value: item.value,
                        icon: item.icon,
                        color: item.color,
                        caption: item.caption)))
                .toList());
      });
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: navy, fontSize: 19, fontWeight: FontWeight.w900)),
          const SizedBox(height: 3),
          Text(subtitle, style: const TextStyle(color: muted, fontSize: 12)),
        ],
      );
}

class _ActionData {
  const _ActionData(
      this.icon, this.title, this.subtitle, this.color, this.onTap);
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
}

class _ActionGrid extends StatelessWidget {
  const _ActionGrid({required this.actions});
  final List<_ActionData> actions;

  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (_, constraints) {
        final columns = constraints.maxWidth >= 1050
            ? 3
            : constraints.maxWidth >= 560
                ? 2
                : 1;
        final width = (constraints.maxWidth - (columns - 1) * 12) / columns;
        return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: actions
                .map((action) =>
                    SizedBox(width: width, child: _ActionCard(data: action)))
                .toList());
      });
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({required this.data});
  final _ActionData data;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: border)),
        child: InkWell(
          onTap: data.onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                      color: data.color.withValues(alpha: .1),
                      borderRadius: BorderRadius.circular(13)),
                  child: Icon(data.icon, color: data.color, size: 25)),
              const SizedBox(width: 13),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(data.title,
                        style: const TextStyle(
                            color: navy,
                            fontSize: 14,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(data.subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: muted, fontSize: 11)),
                  ])),
              const Icon(Icons.arrow_forward_ios_rounded,
                  color: Color(0xffa8b3ca), size: 15),
            ]),
          ),
        ),
      );
}

class _VillageCard extends StatelessWidget {
  const _VillageCard({required this.items, required this.total});
  final List<Map<String, dynamic>> items;
  final int total;

  @override
  Widget build(BuildContext context) {
    final maxValue = items.fold<int>(0, (max, item) {
      final value = _number(item['count']);
      return value > max ? value : max;
    });
    return SectionCard(
      title: 'प्रमुख गाँव',
      subtitle: 'सबसे ज्यादा मतदाता वाले गाँव',
      icon: Icons.location_city_rounded,
      child: items.isEmpty
          ? const _EmptyState(
              icon: Icons.location_city_outlined,
              text: 'गाँव का डेटा अभी उपलब्ध नहीं है')
          : Column(
              children: items.map((item) {
                final value = _number(item['count']);
                final progress = maxValue == 0 ? 0.0 : value / maxValue;
                final percent = total == 0 ? 0 : (value * 100 / total).round();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 13),
                  child: Column(children: [
                    Row(children: [
                      Expanded(
                          child: Text('${item['_id']}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, color: navy))),
                      Text('$value  ·  $percent%',
                          style: const TextStyle(
                              color: muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w700)),
                    ]),
                    const SizedBox(height: 7),
                    LinearProgressIndicator(
                        value: progress,
                        minHeight: 7,
                        borderRadius: BorderRadius.circular(8),
                        backgroundColor: const Color(0xffedf2fa),
                        color: blue),
                  ]),
                );
              }).toList(),
            ),
    );
  }
}

class _SupportCard extends StatelessWidget {
  const _SupportCard(
      {required this.total,
      required this.congress,
      required this.opposite,
      required this.other});
  final int total;
  final int congress;
  final int opposite;
  final int other;

  @override
  Widget build(BuildContext context) => SectionCard(
        title: 'समर्थन स्थिति',
        subtitle: 'समर्थक, विपक्ष और अनिर्णीत मतदाताओं का सारांश',
        icon: Icons.pie_chart_rounded,
        child: Row(children: [
          DonutChart(values: [
            congress.toDouble(),
            opposite.toDouble(),
            other.toDouble()
          ], colors: const [
            blue,
            orange,
            purple
          ], center: '$total'),
          const SizedBox(width: 16),
          Expanded(
              child: Column(children: [
            _LegendRow('कांग्रेस समर्थक', congress, blue),
            _LegendRow('विपक्ष समर्थक', opposite, orange),
            _LegendRow('तटस्थ / अनिर्णीत', other, purple),
          ])),
        ]),
      );
}

class _LegendRow extends StatelessWidget {
  const _LegendRow(this.label, this.value, this.color);
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(children: [
          Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                  color: color, borderRadius: BorderRadius.circular(3))),
          const SizedBox(width: 8),
          Expanded(
              child: Text(label,
                  style: const TextStyle(color: muted, fontSize: 12))),
          Text('$value',
              style: const TextStyle(color: navy, fontWeight: FontWeight.w900)),
        ]),
      );
}

class _QualityCard extends StatelessWidget {
  const _QualityCard(
      {required this.missingMobile,
      required this.missingHouse,
      required this.review,
      required this.total,
      required this.onOpen});
  final int missingMobile;
  final int missingHouse;
  final int review;
  final int total;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) => SectionCard(
        title: 'डेटा गुणवत्ता',
        subtitle: 'गलत या अधूरी जानकारी जल्दी पहचानें',
        icon: Icons.health_and_safety_rounded,
        action:
            TextButton(onPressed: onOpen, child: const Text('रिकॉर्ड देखें')),
        child: Column(children: [
          _QualityRow(Icons.phone_rounded, 'मोबाइल नंबर नहीं है', missingMobile,
              total, rose),
          _QualityRow(Icons.home_rounded, 'घर संख्या नहीं है', missingHouse,
              total, orange),
          _QualityRow(Icons.fact_check_rounded, 'मैनुअल समीक्षा जरूरी', review,
              total, purple),
        ]),
      );
}

class _QualityRow extends StatelessWidget {
  const _QualityRow(this.icon, this.label, this.value, this.total, this.color);
  final IconData icon;
  final String label;
  final int value;
  final int total;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final ratio = total == 0 ? 0.0 : (value / total).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(children: [
        Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
                color: color.withValues(alpha: .09),
                borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20)),
        const SizedBox(width: 11),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
                child: Text(label,
                    style: const TextStyle(
                        color: navy,
                        fontSize: 12,
                        fontWeight: FontWeight.w700))),
            Text('$value',
                style: TextStyle(color: color, fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 6),
          LinearProgressIndicator(
              value: ratio,
              minHeight: 5,
              borderRadius: BorderRadius.circular(5),
              backgroundColor: const Color(0xffedf2fa),
              color: color),
        ])),
      ]),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.items});
  final List items;

  @override
  Widget build(BuildContext context) => SectionCard(
        title: 'हाल की गतिविधि',
        subtitle: 'हाल के बदलाव और आयात की जानकारी',
        icon: Icons.history_rounded,
        child: items.isEmpty
            ? const _EmptyState(
                icon: Icons.history_rounded,
                text: 'अभी कोई गतिविधि दर्ज नहीं है')
            : Column(
                children: items.take(5).map((raw) {
                  final item = Map<String, dynamic>.from(raw);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(children: [
                      const CircleAvatar(
                          radius: 19,
                          backgroundColor: Color(0xffeaf8f0),
                          child: Icon(Icons.check_rounded,
                              color: green, size: 20)),
                      const SizedBox(width: 11),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text('${item['action'] ?? 'रिकॉर्ड अपडेट हुआ'}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    color: navy,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800)),
                            const SizedBox(height: 2),
                            Text(_formatDate(item['createdAt']),
                                style: const TextStyle(
                                    color: muted, fontSize: 11)),
                          ])),
                    ]),
                  );
                }).toList(),
              ),
      );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 30),
        child: Center(
            child: Column(children: [
          Icon(icon, color: const Color(0xff9ba9c1), size: 34),
          const SizedBox(height: 9),
          Text(text,
              textAlign: TextAlign.center,
              style: const TextStyle(color: muted)),
        ])),
      );
}

int _number(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;

int _group(Map data, String collection, String key) =>
    (data[collection] as List? ?? [])
        .where((e) => e['_id'] == key)
        .fold<int>(0, (sum, e) => sum + _number(e['count']));

String _formatDate(dynamic value) {
  final date = DateTime.tryParse('$value')?.toLocal();
  if (date == null) return '';
  String two(int number) => number.toString().padLeft(2, '0');
  return '${two(date.day)}/${two(date.month)}/${date.year}  ${two(date.hour)}:${two(date.minute)}';
}

String _activityLabel(dynamic raw) {
  final action = '${raw ?? ''}'.trim().toLowerCase();
  const labels = <String, String>{
    'member.created': 'नया मतदाता जोड़ा गया',
    'member.updated': 'मतदाता जानकारी बदली गई',
    'member.deleted': 'मतदाता रिकॉर्ड हटाया गया',
    'members.imported': 'मतदाता सूची आयात हुई',
    'import.completed': 'फाइल आयात पूरा हुआ',
    'family.created': 'नया परिवार बनाया गया',
    'family.updated': 'परिवार जानकारी बदली गई',
    'user.created': 'नया उपयोगकर्ता जोड़ा गया',
    'booth.created': 'नया बूथ जोड़ा गया',
    'booth.updated': 'बूथ जानकारी बदली गई',
    'auth.login': 'ऐप में लॉगिन किया गया',
  };
  if (labels.containsKey(action)) return labels[action]!;
  if (action.contains('import')) return 'डेटा आयात किया गया';
  if (action.contains('update')) return 'जानकारी अपडेट की गई';
  if (action.contains('create')) return 'नया रिकॉर्ड जोड़ा गया';
  if (action.contains('delete')) return 'रिकॉर्ड हटाया गया';
  return 'ऐप गतिविधि';
}

String _activityDescription(Map item) {
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
  final date = _formatDate(item['createdAt']);
  return [person, if (actor.isNotEmpty) 'द्वारा $actor', date]
      .where((value) => value.isNotEmpty)
      .join(' · ');
}

(IconData, Color) _activityVisual(dynamic raw) {
  final action = '${raw ?? ''}'.toLowerCase();
  if (action.contains('import')) return (Icons.upload_file_rounded, orange);
  if (action.contains('delete')) return (Icons.delete_outline_rounded, rose);
  if (action.contains('create')) return (Icons.person_add_alt_rounded, green);
  if (action.contains('update')) return (Icons.edit_note_rounded, blue);
  return (Icons.history_rounded, purple);
}
