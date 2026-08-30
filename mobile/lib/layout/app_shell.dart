import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/families/family_page.dart';
import '../features/more/more_page.dart';
import '../features/reports/reports_page.dart';
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
    if (widget.role == 'booth') {
      return [
        NavItem(
            'संपर्क',
            Icons.people_alt_rounded,
            VoterManagementPage(
                key: ValueKey('booth-contacts-$refreshVersion'))),
      ];
    }
    return [
      NavItem(
        'होम',
        Icons.home_outlined,
        DashboardPage(
          key: ValueKey('dashboard-$refreshVersion'),
          onNavigate: select,
        ),
      ),
      NavItem(
        'मतदाता',
        Icons.groups_outlined,
        VoterManagementPage(key: ValueKey('voters-$refreshVersion')),
      ),
      NavItem(
        'परिवार',
        Icons.family_restroom,
        FamilyPage(key: ValueKey('families-$refreshVersion')),
      ),
      NavItem(
        'रिपोर्ट',
        Icons.bar_chart_outlined,
        ReportsPage(key: ValueKey('reports-$refreshVersion')),
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
      floatingActionButton: wide ||
              (widget.role == 'booth' &&
                  api.user?['permissions']?['canCreateVoters'] == false)
          ? null
          : FloatingActionButton(
              tooltip: 'नया मतदाता जोड़ें',
              backgroundColor: blue,
              foregroundColor: Colors.white,
              shape: const CircleBorder(),
              onPressed: () => showDialog(
                context: context,
                builder: (_) => VoterForm(
                  onSaved: () {
                    api.notifyDataChanged();
                    select(1);
                  },
                ),
              ),
              child: const Icon(Icons.add_rounded, size: 32),
            ),
      floatingActionButtonLocation:
          wide ? null : FloatingActionButtonLocation.centerDocked,
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
  Widget build(BuildContext context) => BottomAppBar(
        height: 72,
        padding: EdgeInsets.zero,
        color: Colors.white,
        elevation: 12,
        shadowColor: const Color(0x26071b4b),
        shape: const CircularNotchedRectangle(),
        notchMargin: 9,
        child: SafeArea(
          top: false,
          child: Row(children: [
            _PhoneNavButton(
              label: 'होम',
              icon: Icons.home_rounded,
              selected: selected == 0,
              onTap: () => onSelect(0),
            ),
            _PhoneNavButton(
              label: 'संपर्क',
              icon: Icons.people_alt_rounded,
              selected: selected == 1,
              onTap: () => onSelect(1),
            ),
            const SizedBox(width: 68),
            _PhoneNavButton(
              label: 'रिपोर्ट',
              icon: Icons.bar_chart_rounded,
              selected: selected == 3,
              onTap: () => onSelect(3),
            ),
            _PhoneNavButton(
              label: 'अधिक',
              icon: Icons.menu_rounded,
              selected: selected == 4,
              onTap: () => onSelect(4),
            ),
          ]),
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
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, color: selected ? blue : muted, size: 23),
            const SizedBox(height: 3),
            Text(label,
                style: TextStyle(
                    color: selected ? blue : muted,
                    fontSize: 10,
                    fontWeight: selected ? FontWeight.w900 : FontWeight.w700)),
          ]),
        ),
      );
}
