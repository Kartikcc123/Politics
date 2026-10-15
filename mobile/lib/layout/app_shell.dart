import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../features/activity/activity_page.dart';
import '../features/analytics/party_analytics_page.dart';
import '../features/areas/area_directory_page.dart';
import '../features/areas/master_data_import_page.dart';
import '../features/areas/samiti_hierarchy_page.dart';
import '../features/auth/login_page.dart';
import '../features/booths/booth_page.dart';
import '../features/members/bulk_location_edit_page.dart';
import '../features/messages/bulk_message_page.dart';
import '../features/messages/whatsapp_page.dart';
import '../features/more/more_page.dart';
import '../features/reminders/reminder_dashboard_page.dart';
import '../features/reports/configurable_print_page.dart';
import '../features/reports/political_dashboard_page.dart';
import '../features/reports/reports_page.dart';
import '../features/settings/settings_page.dart';
import '../features/uploads/admin_review_hub_page.dart';
import '../features/uploads/smart_excel_import_page.dart';
import '../features/uploads/upload_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/users/booth_user_page.dart';
import '../features/voters/voter_management_page.dart';
import 'app_layout.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.role});
  final String role;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int selected = 0;
  int desktopSelected = 0;
  int refreshVersion = 0;
  final pageController = PageController();

  void select(int index) {
    if (index == selected) return;
    setState(() => selected = index);
    if (pageController.hasClients) {
      pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void selectDesktop(int index) {
    if (index == desktopSelected) return;
    setState(() => desktopSelected = index);
  }

  void logout() {
    api.logout();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
    );
  }

  @override
  void initState() {
    super.initState();
    api.dataVersion.addListener(_onDataChanged);
  }

  @override
  void dispose() {
    api.dataVersion.removeListener(_onDataChanged);
    pageController.dispose();
    super.dispose();
  }

  void _onDataChanged() {
    if (mounted) setState(() => refreshVersion = api.dataVersion.value);
  }

  List<NavItem> get mobileItems {
    final isAdmin = widget.role == 'admin';

    if (isAdmin) {
      return [
        NavItem(
          'डैशबोर्ड',
          Icons.home_rounded,
          DashboardPage(
            key: ValueKey('admin-dash-$refreshVersion'),
            onNavigate: select,
          ),
        ),
        NavItem(
          'सभी मतदाता',
          Icons.groups_rounded,
          VoterManagementPage(key: ValueKey('admin-voters-$refreshVersion')),
        ),
        NavItem(
          'क्षेत्र व गाँव',
          Icons.holiday_village_rounded,
          SamitiHierarchyPage(key: ValueKey('admin-samiti-$refreshVersion')),
        ),
        NavItem(
          'पार्टी गणना',
          Icons.analytics_rounded,
          PartyAnalyticsPage(key: ValueKey('admin-analytics-$refreshVersion')),
        ),
        NavItem(
          'अधिक',
          Icons.grid_view_rounded,
          MorePage(key: ValueKey('admin-more-$refreshVersion'), role: widget.role),
        ),
      ];
    }

    // Booth, Ward, and Normal Users
    return [
      NavItem(
        'होम',
        Icons.home_rounded,
        DashboardPage(
          key: ValueKey('user-dash-$refreshVersion'),
          onNavigate: select,
        ),
      ),
      NavItem(
        'मतदाता सूची',
        Icons.groups_rounded,
        VoterManagementPage(key: ValueKey('user-voters-$refreshVersion')),
      ),
      NavItem(
        'फ़ेवरेट',
        Icons.star_rounded,
        VoterManagementPage(
          key: ValueKey('user-fav-$refreshVersion'),
          initialFavoriteFilter: true,
        ),
      ),
      NavItem(
        'पार्टी गणना',
        Icons.analytics_rounded,
        PartyAnalyticsPage(key: ValueKey('user-analytics-$refreshVersion')),
      ),
      NavItem(
        'अधिक',
        Icons.grid_view_rounded,
        MorePage(key: ValueKey('user-more-$refreshVersion'), role: widget.role),
      ),
    ];
  }

  List<DesktopNavSection> get desktopSections {
    final isAdmin = widget.role == 'admin';
    final user = api.user;
    final perms = (user?['permissions'] as Map?) ?? {};

    final canPrint = isAdmin || perms['canPrintProfiles'] == true;
    final canExport = isAdmin || perms['canExportData'] == true;
    final canReport = isAdmin || perms['canViewReports'] == true;

    final sections = <DesktopNavSection>[];

    // 1. मुख्य कार्यक्षेत्र (Core)
    final coreItems = <NavItem>[
      if (isAdmin)
        NavItem(
          'क्षेत्र व गाँव',
          Icons.holiday_village_rounded,
          SamitiHierarchyPage(key: ValueKey('desktop-samiti-$refreshVersion')),
        ),
      NavItem(
        isAdmin ? 'सभी मतदाता' : 'मतदाता सूची',
        Icons.groups_rounded,
        VoterManagementPage(key: ValueKey('desktop-voters-$refreshVersion')),
      ),
      NavItem(
        'पार्टी गणना',
        Icons.analytics_rounded,
        PartyAnalyticsPage(key: ValueKey('desktop-party-$refreshVersion')),
      ),
      if (canReport)
        NavItem(
          'राजनीतिक विश्लेषण',
          Icons.insights_rounded,
          PoliticalDashboardPage(key: ValueKey('desktop-pol-dash-$refreshVersion')),
        ),
    ];
    if (coreItems.isNotEmpty) {
      sections.add(DesktopNavSection(title: 'मुख्य कार्यक्षेत्र', items: coreItems));
    }

    // 2. अभियान व संपर्क (Campaigns & Outreach)
    final campaignItems = <NavItem>[
      if (canExport)
        NavItem(
          'WhatsApp बल्क अभियान',
          Icons.qr_code_scanner_rounded,
          BulkMessagePage(key: ValueKey('desktop-bulk-msg-$refreshVersion')),
        ),
      if (canExport)
        NavItem(
          'WhatsApp संदेश व पोस्टर',
          Icons.campaign_rounded,
          WhatsAppPage(key: ValueKey('desktop-whatsapp-$refreshVersion')),
        ),
      if (canPrint)
        NavItem(
          'विस्तृत प्रिंट',
          Icons.print_rounded,
          ConfigurablePrintPage(key: ValueKey('desktop-print-$refreshVersion')),
        ),
      if (isAdmin || canReport)
        NavItem(
          'संपर्क अनुस्मारक',
          Icons.notifications_active_rounded,
          ReminderDashboardPage(key: ValueKey('desktop-reminders-$refreshVersion')),
        ),
    ];
    if (campaignItems.isNotEmpty) {
      sections.add(DesktopNavSection(title: 'अभियान व संपर्क', items: campaignItems));
    }

    // 3. डेटा व आयात (Data Management)
    final dataItems = <NavItem>[
      if (isAdmin)
        NavItem(
          'गाँव एवं पंचायत मास्टर',
          Icons.holiday_village_outlined,
          AreaDirectoryPage(key: ValueKey('desktop-area-dir-$refreshVersion')),
        ),
      if (isAdmin)
        NavItem(
          'PDF / Excel अपलोड',
          Icons.cloud_upload_rounded,
          UploadPage(key: ValueKey('desktop-upload-$refreshVersion')),
        ),
      if (isAdmin)
        NavItem(
          'स्मार्ट Excel आयात',
          Icons.rule_folder_rounded,
          SmartExcelImportPage(key: ValueKey('desktop-smart-excel-$refreshVersion')),
        ),
      if (isAdmin)
        NavItem(
          'स्थान व अनुभाग सुधार',
          Icons.edit_location_alt_rounded,
          BulkLocationEditPage(key: ValueKey('desktop-bulk-loc-$refreshVersion')),
        ),
      if (isAdmin)
        NavItem(
          'लोकेशन मास्टर आयात',
          Icons.storage_rounded,
          MasterDataImportPage(key: ValueKey('desktop-master-import-$refreshVersion')),
        ),
      if (isAdmin)
        NavItem(
          'Admin Review Hub',
          Icons.fact_check_rounded,
          AdminReviewHubPage(key: ValueKey('desktop-admin-review-$refreshVersion')),
        ),
    ];
    if (dataItems.isNotEmpty) {
      sections.add(DesktopNavSection(title: 'डेटा व मास्टर आयात', items: dataItems));
    }

    // 4. प्रशासन व सेटिंग्स (Admin & Settings)
    final adminItems = <NavItem>[
      if (isAdmin)
        NavItem(
          'बूथ प्रबंधन',
          Icons.how_to_vote_rounded,
          BoothPage(key: ValueKey('desktop-booth-$refreshVersion')),
        ),
      if (isAdmin)
        NavItem(
          'बूथ उपयोगकर्ता',
          Icons.supervisor_account_rounded,
          BoothUserPage(key: ValueKey('desktop-booth-user-$refreshVersion')),
        ),
      if (canReport)
        NavItem(
          'रिपोर्ट और डाउनलोड',
          Icons.bar_chart_rounded,
          ReportsPage(key: ValueKey('desktop-reports-$refreshVersion')),
        ),
      if (isAdmin)
        NavItem(
          'गतिविधि ऑडिट लॉग',
          Icons.history_rounded,
          ActivityPage(key: ValueKey('desktop-activity-$refreshVersion')),
        ),
      NavItem(
        'सिस्टम सेटिंग्स',
        Icons.settings_rounded,
        SettingsPage(key: ValueKey('desktop-settings-$refreshVersion')),
      ),
    ];
    if (adminItems.isNotEmpty) {
      sections.add(DesktopNavSection(title: 'सिस्टम व प्रबंधन', items: adminItems));
    }

    return sections;
  }

  List<NavItem> get flatDesktopItems {
    final list = <NavItem>[];
    for (final sec in desktopSections) {
      list.addAll(sec.items);
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    
    if (wide) {
      final sections = desktopSections;
      final flatItems = flatDesktopItems;
      final safeIdx = (desktopSelected >= 0 && desktopSelected < flatItems.length)
          ? desktopSelected
          : 0;
      final currentItem = flatItems[safeIdx];

      return Scaffold(
        body: Row(
          children: [
            DesktopSidebar(
              sections: sections,
              selectedIndex: safeIdx,
              onSelect: selectDesktop,
              onLogout: logout,
            ),
            Expanded(
              child: Column(
                children: [
                  DesktopHeader(
                    title: currentItem.label,
                    icon: currentItem.icon,
                    onRefresh: () => setState(() => refreshVersion++),
                    onLogout: logout,
                    showNotifications: widget.role != 'booth',
                  ),
                  Expanded(
                    child: IndexedStack(
                      index: safeIdx,
                      children: flatItems.map((e) => e.page).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Phone & Tablet Layout (< 900px)
    final currentItems = mobileItems;
    final safeSelected = (selected >= 0 && selected < currentItems.length) ? selected : 0;

    return Scaffold(
      drawer: AppDrawer(
        role: widget.role,
        onLogout: logout,
      ),
      body: Column(
        children: [
          MobileHeader(
            title: currentItems[safeSelected].label,
            onSearch: () => select(1),
            onLogout: logout,
            showNotifications: true,
          ),
          Expanded(
            child: PageView(
              controller: pageController,
              onPageChanged: (index) {
                if (index != selected) {
                  setState(() => selected = index);
                }
              },
              physics: const PageScrollPhysics(),
              children: currentItems.map((e) => e.page).toList(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _PhoneBottomBar(
        items: currentItems,
        selected: safeSelected,
        onSelect: select,
      ),
    );
  }
}

class _PhoneBottomBar extends StatelessWidget {
  const _PhoneBottomBar({
    required this.items,
    required this.selected,
    required this.onSelect,
  });

  final List<NavItem> items;
  final int selected;
  final ValueChanged<int> onSelect;

  static IconData _filledIcon(IconData icon) {
    final Map<IconData, IconData> filledVariants = {
      Icons.home_outlined: Icons.home_rounded,
      Icons.star_outline_rounded: Icons.star_rounded,
      Icons.holiday_village_outlined: Icons.holiday_village_rounded,
      Icons.groups_outlined: Icons.groups_rounded,
      Icons.grid_view_outlined: Icons.grid_view_rounded,
      Icons.analytics_outlined: Icons.analytics_rounded,
    };
    return filledVariants[icon] ?? icon;
  }

  @override
  Widget build(BuildContext context) => Container(
        height: 64,
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: border, width: 1)),
          boxShadow: [
            BoxShadow(
              color: Color(0x0D071B4B),
              blurRadius: 10,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              for (int i = 0; i < items.length; i++)
                _PhoneNavButton(
                  label: items[i].label,
                  icon: selected == i
                      ? _filledIcon(items[i].icon)
                      : items[i].icon,
                  selected: selected == i,
                  onTap: () => onSelect(i),
                ),
            ],
          ),
        ),
      );
}

class _PhoneNavButton extends StatelessWidget {
  const _PhoneNavButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: InkWell(
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: selected ? blue : muted, size: 24),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  color: selected ? blue : muted,
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
}
