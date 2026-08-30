import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../features/notifications/celebrations_page.dart';

class NavItem {
  const NavItem(this.label, this.icon, this.page);
  final String label;
  final IconData icon;
  final Widget page;
}

class CongressMark extends StatelessWidget {
  const CongressMark({super.key, this.size = 46});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: const [
            BoxShadow(
                color: Color(0x1f071b4b), blurRadius: 14, offset: Offset(0, 5)),
          ],
          border: Border.all(
              color: Colors.white.withValues(alpha: .75), width: 1.4),
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [orange, Colors.white, green],
            stops: [0, .48, 1],
          ),
        ),
        alignment: Alignment.center,
        child: Text('INC',
            style: TextStyle(
                color: navy,
                fontSize: size * .24,
                fontWeight: FontWeight.w900,
                letterSpacing: -.5)),
      );
}

class MobileHeader extends StatelessWidget {
  const MobileHeader({
    super.key,
    this.title = 'मतदाता फ़ोन बुक',
    this.onSearch,
    this.onLogout,
    this.showNotifications = true,
  });

  final String title;
  final VoidCallback? onSearch;
  final VoidCallback? onLogout;
  final bool showNotifications;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 420;
          final veryCompact = constraints.maxWidth < 350;
          final scaledText = MediaQuery.textScalerOf(context).scale(1) > 1.2;
          final hasDrawer = Scaffold.maybeOf(context)?.hasDrawer ?? false;
          final actionSize = veryCompact ? 40.0 : 44.0;

          Widget action({required Widget child}) => SizedBox(
                width: actionSize,
                height: actionSize,
                child: child,
              );

          return Container(
            padding: EdgeInsets.fromLTRB(
              compact ? 4 : 14,
              5,
              compact ? 4 : 14,
              7,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: border)),
            ),
            child: SafeArea(
              bottom: false,
              child: Row(children: [
                if (hasDrawer)
                  action(
                    child: IconButton(
                      key: const ValueKey('header-menu'),
                      tooltip: 'मेनू खोलें',
                      visualDensity: VisualDensity.compact,
                      onPressed: () => Scaffold.of(context).openDrawer(),
                      icon: Icon(
                        Icons.menu_rounded,
                        color: navy,
                        size: veryCompact ? 24 : 27,
                      ),
                    ),
                  ),
                SizedBox(width: hasDrawer ? 2 : 6),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: navy,
                          fontSize: compact ? 17 : 18,
                          height: 1.1,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      if (!veryCompact && !scaledText) ...[
                        const SizedBox(height: 2),
                        const Text(
                          'आसान मतदाता संपर्क और प्रबंधन',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: muted, fontSize: 10),
                        ),
                      ],
                    ],
                  ),
                ),
                if (onSearch != null)
                  action(
                    child: IconButton(
                      key: const ValueKey('header-search'),
                      tooltip: 'मतदाता खोजें',
                      visualDensity: VisualDensity.compact,
                      onPressed: onSearch,
                      icon: const Icon(Icons.search_rounded, color: navy),
                    ),
                  ),
                if (showNotifications)
                  action(
                    child: FutureBuilder<Map<String, dynamic>>(
                      future: api.get('/api/notifications/today'),
                      builder: (context, snapshot) {
                        final count = snapshot.data?['count'] ?? 0;
                        return Stack(clipBehavior: Clip.none, children: [
                          IconButton.filledTonal(
                            key: const ValueKey('header-notifications'),
                            tooltip: 'आज की सूचनाएँ',
                            visualDensity: VisualDensity.compact,
                            style: IconButton.styleFrom(
                              backgroundColor: softBlue,
                            ),
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const CelebrationsPage(),
                              ),
                            ),
                            icon: const Icon(
                              Icons.notifications_none_rounded,
                              color: navy,
                              size: 22,
                            ),
                          ),
                          if (count > 0)
                            Positioned(
                              right: 0,
                              top: -2,
                              child: Container(
                                constraints: const BoxConstraints(minWidth: 18),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: rose,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 1.5,
                                  ),
                                ),
                                child: Text(
                                  count > 99 ? '99+' : '$count',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ),
                        ]);
                      },
                    ),
                  ),
                if (onLogout != null)
                  action(
                    child: PopupMenuButton<String>(
                      key: const ValueKey('header-account-menu'),
                      tooltip: 'खाता विकल्प',
                      icon: const Icon(Icons.more_vert_rounded, color: navy),
                      onSelected: (value) {
                        if (value == 'logout') onLogout!();
                      },
                      itemBuilder: (_) => const [
                        PopupMenuItem(
                          value: 'logout',
                          child: Row(children: [
                            Icon(Icons.logout_rounded, color: rose),
                            SizedBox(width: 10),
                            Text('लॉग आउट'),
                          ]),
                        ),
                      ],
                    ),
                  ),
              ]),
            ),
          );
        },
      );
}

class DesktopSidebar extends StatelessWidget {
  const DesktopSidebar(
      {super.key,
      required this.items,
      required this.selected,
      required this.onSelect});
  final List<NavItem> items;
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) => Material(
        color: deepNavy,
        child: SizedBox(
          width: 236,
          child: SafeArea(
            child: Column(children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 20, 16, 18),
                child: Row(children: [
                  CongressMark(size: 42),
                  SizedBox(width: 10),
                  Expanded(
                      child: Text('कांग्रेस संगठन\nप्रबंधन प्रणाली',
                          style: TextStyle(
                              color: Colors.white,
                              height: 1.25,
                              fontWeight: FontWeight.w900))),
                ]),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: items.length,
                  itemBuilder: (_, i) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: ListTile(
                      selected: selected == i,
                      selectedTileColor: blue,
                      tileColor: Colors.white.withValues(alpha: .03),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      leading: Icon(items[i].icon, color: Colors.white),
                      title: Text(items[i].label,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800)),
                      onTap: () => onSelect(i),
                    ),
                  ),
                ),
              ),
            ]),
          ),
        ),
      );
}

class AppPage extends StatelessWidget {
  const AppPage({super.key, required this.children, this.padding});
  final List<Widget> children;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final resolvedPadding = padding ??
        EdgeInsets.fromLTRB(
            width < 640 ? 14 : 20, 18, width < 640 ? 14 : 20, 30);
    return Material(
      color: bg,
      child: ListView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: resolvedPadding,
        children: children
            .map((e) =>
                Padding(padding: const EdgeInsets.only(bottom: 16), child: e))
            .toList(),
      ),
    );
  }
}

class PageHeading extends StatelessWidget {
  const PageHeading(
      {super.key, required this.title, this.subtitle, this.action});
  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final compact = c.maxWidth < 620;
        final text =
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!, style: const TextStyle(color: muted)),
          ],
        ]);
        if (action == null) return text;
        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [text, const SizedBox(height: 12), action!],
          );
        }
        return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: text),
          action!,
        ]);
      });
}

class AppDrawer extends StatelessWidget {
  const AppDrawer({
    super.key,
    required this.role,
    required this.onLogout,
  });

  final String role;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) => Drawer(
        child: SafeArea(
          child: Column(children: [
            const Padding(
              padding: EdgeInsets.all(20),
              child: Row(children: [
                CongressMark(),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'कांग्रेस संगठन',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: navy,
                    ),
                  ),
                ),
              ]),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: softBlue,
                child: Icon(Icons.person_outline, color: blue),
              ),
              title: Text(
                api.user?['name'] ?? 'User',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              subtitle: Text(role),
            ),
            const Spacer(),
            const Divider(height: 1),
            ListTile(
              key: const ValueKey('drawer-logout'),
              leading: const Icon(Icons.logout_rounded, color: rose),
              title: const Text(
                'लॉग आउट',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              onTap: onLogout,
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 10, 20, 20),
              child: Text(
                'सुरक्षित मतदाता प्रबंधन प्रणाली',
                textAlign: TextAlign.center,
                style: TextStyle(color: muted),
              ),
            ),
          ]),
        ),
      );
}
