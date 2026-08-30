import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/mobile_components.dart';
import '../activity/activity_page.dart';
import '../areas/area_directory_page.dart';
import '../areas/master_data_import_page.dart';
import '../booths/booth_page.dart';
import '../messages/bulk_message_page.dart';
import '../reminders/reminder_dashboard_page.dart';
import '../uploads/admin_review_hub_page.dart';
import '../reports/reports_page.dart';
import '../reports/political_dashboard_page.dart';
import '../reports/configurable_print_page.dart';
import '../uploads/smart_excel_import_page.dart';
import '../settings/settings_page.dart';
import '../uploads/upload_page.dart';
import '../users/booth_user_page.dart';

class MorePage extends StatelessWidget {
  const MorePage({super.key, required this.role});
  final String role;

  @override
  Widget build(BuildContext context) {
    final importOptions = <_Option>[
      _Option(
          'गाँव एवं पंचायत मास्टर',
          'गाँव, पंचायत, PIN, जनसंख्या, वार्ड और मतदाता देखें',
          Icons.holiday_village_outlined,
          green,
          const AreaDirectoryPage()),
      if (role == 'admin')
        _Option(
            'लोकेशन मास्टर आयात',
            'पंचायत, गाँव, जनसंख्या, वार्ड और पिन कोड master में जोड़ें',
            Icons.storage_rounded,
            blue,
            const MasterDataImportPage()),
      if (role == 'admin')
  _Option('PDF / Excel अपलोड', 'मतदाता सूची से एक साथ रिकॉर्ड जोड़ें',
          Icons.cloud_upload_rounded, orange, const UploadPage()),
      if (role == 'admin')
        _Option('Excel का विस्तृत आयात', 'कॉलम मिलाएं और रिकॉर्ड पहले जांचें',
            Icons.rule_folder_rounded, green, const SmartExcelImportPage()),
      if (role == 'admin')
        _Option(
            'Admin Review',
            'OCR, location और अधूरी survey जानकारी की pending queues देखें',
            Icons.fact_check_rounded,
            orange,
            const AdminReviewHubPage()),
    ];
    final workOptions = <_Option>[
      _Option('विस्तृत प्रिंट', 'चुने हुए मतदाता और जानकारी प्रिंट करें',
          Icons.print_rounded, blue, const ConfigurablePrintPage()),
      if (role == 'admin')
        _Option('WhatsApp अभियान', 'संदेश बनाएं और समूह में भेजें',
            Icons.campaign_rounded, green, const BulkMessagePage()),
      _Option(
          'संपर्क अनुस्मारक',
          'आज के, लंबित और आने वाले काम देखें',
          Icons.notifications_active_rounded,
          orange,
          const ReminderDashboardPage()),
    ];
    final reportOptions = <_Option>[
      _Option('राजनीतिक विश्लेषण', 'मजबूत, कमजोर बूथ और अनिर्णीत मतदाता देखें',
          Icons.insights_rounded, blue, const PoliticalDashboardPage()),
      _Option('रिपोर्ट', 'सभी रिपोर्ट देखें और डाउनलोड करें',
          Icons.bar_chart_rounded, orange, const ReportsPage()),
      _Option('गतिविधि लॉग', 'आयात, बदलाव और उपयोगकर्ता गतिविधि देखें',
          Icons.history_rounded, const Color(0xff10a9a0), const ActivityPage()),
    ];
    final adminOptions = <_Option>[
      if (role == 'admin')
        _Option('बूथ प्रबंधन', 'बूथ की जानकारी जोड़ें और बदलें',
            Icons.how_to_vote_rounded, blue, const BoothPage()),
      if (role == 'admin')
        _Option('बूथ उपयोगकर्ता', 'उपयोगकर्ता जोड़ें और बूथ निर्धारित करें',
            Icons.supervisor_account_rounded, green, const BoothUserPage()),
      _Option('सेटिंग्स', 'बैकअप, सिंक और ऐप की सेटिंग्स',
          Icons.settings_rounded, purple, const SettingsPage()),
    ];

    if (MediaQuery.sizeOf(context).width < 700) {
      return AppPage(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 110),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: border),
            ),
            child: Row(children: [
              const CircleAvatar(
                radius: 27,
                backgroundColor: softBlue,
                foregroundColor: blue,
                child: Icon(Icons.person_rounded, size: 28),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${api.user?['name'] ?? 'User'}',
                          style: const TextStyle(
                              color: navy,
                              fontSize: 17,
                              fontWeight: FontWeight.w900)),
                      Text(role == 'admin' ? 'Administrator' : 'Booth Manager',
                          style: const TextStyle(color: muted, fontSize: 11)),
                    ]),
              ),
              IconButton.filledTonal(
                onPressed: () =>
                    _open(context, const SettingsPage(), 'सेटिंग्स'),
                icon: const Icon(Icons.settings_rounded, color: blue),
              ),
            ]),
          ),
          _PhoneMoreSection(title: 'आयात और डेटा', options: importOptions),
          _PhoneMoreSection(title: 'काम और संपर्क', options: workOptions),
          _PhoneMoreSection(
              title: 'रिपोर्ट और विश्लेषण', options: reportOptions),
          _PhoneMoreSection(title: 'प्रबंधन', options: adminOptions),
        ],
      );
    }
    return AppPage(children: [
      AppHeroBanner(
        title: 'अधिक विकल्प',
        subtitle: 'सभी अतिरिक्त सुविधाएं यहां आसानी से मिलेंगी',
        icon: Icons.grid_view_rounded,
        primaryAction: FilledButton.icon(
          style: FilledButton.styleFrom(
              backgroundColor: Colors.white, foregroundColor: blue),
          onPressed: () =>
              _open(context, const UploadPage(), 'PDF / Excel अपलोड'),
          icon: const Icon(Icons.upload_file_rounded),
          label: const Text('फाइल अपलोड'),
        ),
      ),
      _OptionSection(
          title: 'जानकारी का आयात और समीक्षा', options: importOptions),
      _OptionSection(title: 'काम और संपर्क', options: workOptions),
      _OptionSection(title: 'रिपोर्ट और विश्लेषण', options: reportOptions),
      _OptionSection(title: 'प्रबंधन और सेटिंग्स', options: adminOptions),
    ]);
  }

  static void _open(BuildContext context, Widget page, String title) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _StandalonePage(title: title, child: page),
      ),
    );
  }
}

class _PhoneMoreSection extends StatelessWidget {
  const _PhoneMoreSection({required this.title, required this.options});
  final String title;
  final List<_Option> options;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 10),
            child: Text(title,
                style: const TextStyle(
                    color: navy, fontSize: 16, fontWeight: FontWeight.w900)),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: border),
            ),
            child: Column(
              children: options
                  .map((option) => InkWell(
                        onTap: () =>
                            MorePage._open(context, option.page, option.title),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 13),
                          decoration: const BoxDecoration(
                            border: Border(
                                bottom: BorderSide(color: Color(0xffedf0f5))),
                          ),
                          child: Row(children: [
                            Container(
                              width: 43,
                              height: 43,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: option.color.withValues(alpha: .1),
                              ),
                              child: Icon(option.icon,
                                  color: option.color, size: 21),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(option.title,
                                        style: const TextStyle(
                                            color: navy,
                                            fontSize: 14,
                                            fontWeight: FontWeight.w900)),
                                    const SizedBox(height: 2),
                                    Text(option.subtitle,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            color: muted, fontSize: 11)),
                                  ]),
                            ),
                            const Icon(Icons.chevron_right_rounded,
                                color: muted),
                          ]),
                        ),
                      ))
                  .toList(),
            ),
          ),
        ],
      );
}

class _OptionSection extends StatelessWidget {
  const _OptionSection({required this.title, required this.options});
  final String title;
  final List<_Option> options;

  @override
  Widget build(BuildContext context) => SectionCard(
        title: title,
        icon: Icons.apps_rounded,
        child: LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth >= 900
              ? 3
              : constraints.maxWidth >= 560
                  ? 2
                  : 1;
          final width = (constraints.maxWidth - (columns - 1) * 10) / columns;
          return Wrap(
            spacing: 10,
            runSpacing: 10,
            children: options
                .map((option) => SizedBox(
                      width: width,
                      child: QuickActionTile(
                        icon: option.icon,
                        label: option.title,
                        subtitle: option.subtitle,
                        color: option.color,
                        onTap: () =>
                            MorePage._open(context, option.page, option.title),
                      ),
                    ))
                .toList(),
          );
        }),
      );
}

class _StandalonePage extends StatelessWidget {
  const _StandalonePage({required this.title, required this.child});
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    if (child is AreaDirectoryPage || child is MasterDataImportPage) {
      return child;
    }
    return Scaffold(
        appBar: AppBar(
          toolbarHeight: 64,
          title: Text(title),
          backgroundColor: Colors.white,
          foregroundColor: navy,
          surfaceTintColor: Colors.white,
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: navy,
                  backgroundColor: softBlue,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(22)),
                ),
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    icon: const Icon(Icons.help_rounded, color: blue, size: 34),
                    title: Text('$title सहायता'),
                    content: const Text(
                        'इस screen के मुख्य विकल्प ऊपर से नीचे आसान steps में दिए गए हैं। किसी action से पहले चुनी हुई जानकारी ध्यान से जांचें।'),
                    actions: [
                      FilledButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('समझ गया'),
                      ),
                    ],
                  ),
                ),
                icon: const Icon(Icons.help_rounded, size: 18),
                label: const Text('सहायता'),
              ),
            ),
          ],
        ),
        body: child,
      );
  }
}

class _Option {
  const _Option(this.title, this.subtitle, this.icon, this.color, this.page);
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Widget page;
}
