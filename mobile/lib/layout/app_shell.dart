import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../features/analytics/party_analytics_page.dart';
import '../features/areas/samiti_hierarchy_page.dart';
import '../features/more/more_page.dart';
import '../features/voters/voter_management_page.dart';
import '../features/auth/login_page.dart';
import 'app_layout.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.role});
  final String role;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int selected = 0;
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

  List<NavItem> get items {
    final isAdmin = widget.role == 'admin';
    final canUploadPdf = api.user?['permissions']?['canUploadPdf'] == true ||
        api.user?['permissions']?['canImportData'] == true;

    if (!isAdmin && !canUploadPdf) {
      return [
        NavItem(
          'मतदाता सूची',
          Icons.groups_rounded,
          VoterManagementPage(key: ValueKey('voters-$refreshVersion')),
        ),
        NavItem(
          'गाँव व पंचायत',
          Icons.holiday_village_rounded,
          SamitiHierarchyPage(key: ValueKey('samiti-hierarchy-$refreshVersion')),
        ),
        NavItem(
          'पार्टी गणना',
          Icons.analytics_rounded,
          PartyAnalyticsPage(key: ValueKey('party-analytics-$refreshVersion')),
        ),
      ];
    }

    return [
      NavItem(
        'क्षेत्र व गाँव',
        Icons.holiday_village_outlined,
        SamitiHierarchyPage(key: ValueKey('samiti-hierarchy-$refreshVersion')),
      ),
      NavItem(
        'सभी मतदाता',
        Icons.groups_outlined,
        VoterManagementPage(key: ValueKey('voters-$refreshVersion')),
      ),
      NavItem(
        'पार्टी गणना',
        Icons.analytics_outlined,
        PartyAnalyticsPage(key: ValueKey('party-analytics-$refreshVersion')),
      ),
      NavItem(
        'अधिक',
        Icons.grid_view_rounded,
        MorePage(key: ValueKey('more-$refreshVersion'), role: widget.role),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final currentItems = items;
    return Scaffold(
      drawer: wide || widget.role == 'booth'
          ? null
          : AppDrawer(
              role: widget.role,
              onLogout: logout,
            ),
      body: Row(children: [
        if (wide)
          DesktopSidebar(
              items: currentItems, selected: selected, onSelect: select),
        Expanded(
          child: Column(children: [
            MobileHeader(
              title: currentItems[selected].label,
              onSearch: () => select(widget.role == 'booth' ? 0 : 1),
              onLogout: widget.role == 'booth' ? logout : null,
              showNotifications: widget.role != 'booth',
            ),
            Expanded(
              child: wide
                  ? IndexedStack(
                      index: selected,
                      children: currentItems.map((e) => e.page).toList(),
                    )
                  : PageView(
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
          ]),
        ),
      ]),
      bottomNavigationBar: wide || widget.role == 'booth'
          ? null
          : _PhoneBottomBar(selected: selected, onSelect: select),
    );
  }
}

class _PhoneBottomBar extends StatelessWidget {
  const _PhoneBottomBar({required this.selected, required this.onSelect});

  final int selected;
  final ValueChanged<int> onSelect;

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
              _PhoneNavButton(
                label: 'क्षेत्र व गाँव',
                icon: selected == 0 ? Icons.holiday_village_rounded : Icons.holiday_village_outlined,
                selected: selected == 0,
                onTap: () => onSelect(0),
              ),
              _PhoneNavButton(
                label: 'सभी मतदाता',
                icon: selected == 1 ? Icons.groups_rounded : Icons.groups_outlined,
                selected: selected == 1,
                onTap: () => onSelect(1),
              ),
              _PhoneNavButton(
                label: 'अधिक',
                icon: selected == 2 ? Icons.grid_view_rounded : Icons.grid_view_outlined,
                selected: selected == 2,
                onTap: () => onSelect(2),
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
