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
        ),
        alignment: Alignment.center,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(size / 2),
          child: Image.asset(
            'assets/voter_phone_book_logo.png',
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Icon(Icons.contact_phone_rounded,
                size: size * .6, color: royalBlue),
          ),
        ),
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

class DesktopNavSection {
  const DesktopNavSection({
    required this.title,
    required this.items,
  });
  final String title;
  final List<NavItem> items;
}

class DesktopHeader extends StatelessWidget {
  const DesktopHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.onRefresh,
    this.onSearch,
    this.onLogout,
    this.showNotifications = true,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final VoidCallback? onRefresh;
  final VoidCallback? onSearch;
  final VoidCallback? onLogout;
  final bool showNotifications;

  @override
  Widget build(BuildContext context) {
    final user = api.user;
    final userName = user?['name'] ?? 'User';
    final userRole = user?['role'] == 'admin' ? 'व्यवस्थापक (Admin)' : 'बूथ प्रबंधक';

    return Container(
      height: 66,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: border)),
        boxShadow: [
          BoxShadow(
            color: Color(0x08071b4b),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: softBlue,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: blue, size: 20),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'होम / ',
                      style: TextStyle(
                        color: muted.withValues(alpha: 0.7),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      title,
                      style: const TextStyle(
                        color: navy,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                if (subtitle != null && subtitle!.isNotEmpty)
                  Text(
                    subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: muted, fontSize: 11),
                  ),
              ],
            ),
          ),
          // Live Database Status Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: softGreen,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: green.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: green,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'लाइव कनेक्टेड',
                  style: TextStyle(
                    color: Color(0xff0f766e),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          if (onRefresh != null) ...[
            IconButton(
              tooltip: 'डेटा रिफ्रेश करें',
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh_rounded, color: navy, size: 21),
            ),
            const SizedBox(width: 4),
          ],
          if (showNotifications) ...[
            FutureBuilder<Map<String, dynamic>>(
              future: api.get('/api/notifications/today'),
              builder: (context, snapshot) {
                final count = snapshot.data?['count'] ?? 0;
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    IconButton.filledTonal(
                      tooltip: 'आज की सूचनाएँ',
                      style: IconButton.styleFrom(backgroundColor: softBlue),
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const CelebrationsPage(),
                        ),
                      ),
                      icon: const Icon(
                        Icons.notifications_none_rounded,
                        color: navy,
                        size: 21,
                      ),
                    ),
                    if (count > 0)
                      Positioned(
                        right: -2,
                        top: -2,
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 18),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
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
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(width: 12),
          ],
          // User Chip with Dropdown
          PopupMenuButton<String>(
            tooltip: 'खाता विकल्प',
            offset: const Offset(0, 50),
            onSelected: (value) {
              if (value == 'logout' && onLogout != null) onLogout!();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      userName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        color: navy,
                      ),
                    ),
                    Text(
                      userRole,
                      style: const TextStyle(fontSize: 11, color: muted),
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout_rounded, color: rose, size: 20),
                    SizedBox(width: 10),
                    Text('लॉग आउट', style: TextStyle(color: rose, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ],
            child: Container(
              padding: const EdgeInsets.fromLTRB(10, 6, 12, 6),
              decoration: BoxDecoration(
                color: const Color(0xfff1f5f9),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: border),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: blue,
                    child: Text(
                      userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        userName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: navy,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        userRole,
                        style: const TextStyle(color: muted, fontSize: 10),
                      ),
                    ],
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.keyboard_arrow_down_rounded, color: muted, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class DesktopSidebar extends StatefulWidget {
  const DesktopSidebar({
    super.key,
    required this.sections,
    required this.selectedIndex,
    required this.onSelect,
    required this.onLogout,
  });

  final List<DesktopNavSection> sections;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final VoidCallback onLogout;

  @override
  State<DesktopSidebar> createState() => _DesktopSidebarState();
}

class _DesktopSidebarState extends State<DesktopSidebar> {
  bool collapsed = false;
  String query = '';
  final searchController = TextEditingController();

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = api.user;
    final userName = user?['name'] ?? 'User';
    final userRole = user?['role'] == 'admin' ? 'व्यवस्थापक (Admin)' : 'बूथ प्रबंधक';

    // Calculate flat index mapping
    int globalIndex = 0;
    final renderedSections = <Widget>[];

    for (final section in widget.sections) {
      final matchingItems = <MapEntry<int, NavItem>>[];
      for (final item in section.items) {
        final curIdx = globalIndex++;
        if (query.isEmpty ||
            item.label.toLowerCase().contains(query.toLowerCase())) {
          matchingItems.add(MapEntry(curIdx, item));
        }
      }

      if (matchingItems.isEmpty) continue;

      renderedSections.add(
        Padding(
          padding: EdgeInsets.fromLTRB(
            collapsed ? 4 : 14,
            14,
            collapsed ? 4 : 14,
            6,
          ),
          child: collapsed
              ? const Divider(color: Color(0x1fffffff), height: 1)
              : Text(
                  section.title.toUpperCase(),
                  style: const TextStyle(
                    color: Color(0xff8da4c4),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                  ),
                ),
        ),
      );

      for (final entry in matchingItems) {
        final idx = entry.key;
        final item = entry.value;
        final isSelected = widget.selectedIndex == idx;

        renderedSections.add(
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            child: Tooltip(
              message: collapsed ? item.label : '',
              waitDuration: const Duration(milliseconds: 300),
              child: Material(
                color: isSelected
                    ? blue
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  hoverColor: Colors.white.withValues(alpha: 0.08),
                  onTap: () => widget.onSelect(idx),
                  child: Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: collapsed ? 0 : 12,
                      vertical: 9,
                    ),
                    alignment:
                        collapsed ? Alignment.center : Alignment.centerLeft,
                    child: Row(
                      mainAxisAlignment: collapsed
                          ? MainAxisAlignment.center
                          : MainAxisAlignment.start,
                      children: [
                        Icon(
                          item.icon,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xffcbd5e1),
                          size: 20,
                        ),
                        if (!collapsed) ...[
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : const Color(0xfff1f5f9),
                                fontSize: 13,
                                fontWeight: isSelected
                                    ? FontWeight.w900
                                    : FontWeight.w600,
                              ),
                            ),
                          ),
                          if (isSelected)
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      width: collapsed ? 72 : 260,
      color: deepNavy,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header: Logo and Title + Collapse Toggle
            Container(
              padding: EdgeInsets.fromLTRB(
                collapsed ? 12 : 16,
                16,
                collapsed ? 12 : 12,
                16,
              ),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0x1fffffff))),
              ),
              child: Row(
                children: [
                  const CongressMark(size: 38),
                  if (!collapsed) ...[
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Voter CRM Pro',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            'डिजिटल वोटर फ़ोन बुक',
                            style: TextStyle(
                              color: Color(0xff94a3b8),
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    tooltip: collapsed ? 'साइडबार खोलें' : 'साइडबार छोटा करें',
                    onPressed: () => setState(() => collapsed = !collapsed),
                    icon: Icon(
                      collapsed
                          ? Icons.menu_open_rounded
                          : Icons.menu_rounded,
                      color: const Color(0xffcbd5e1),
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),

            // Search Bar in Sidebar (when not collapsed)
            if (!collapsed) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
                child: SizedBox(
                  height: 36,
                  child: TextField(
                    controller: searchController,
                    onChanged: (val) => setState(() => query = val.trim()),
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'मॉड्यूल खोजें...',
                      hintStyle: const TextStyle(
                        color: Color(0xff64748b),
                        fontSize: 12,
                      ),
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                        color: Color(0xff64748b),
                        size: 16,
                      ),
                      suffixIcon: query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(
                                Icons.clear_rounded,
                                color: Color(0xff94a3b8),
                                size: 14,
                              ),
                              onPressed: () {
                                searchController.clear();
                                setState(() => query = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.06),
                      contentPadding: EdgeInsets.zero,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
              ),
            ],

            // Main Menu List
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 6),
                children: renderedSections,
              ),
            ),

            // Footer: User Card and Logout
            Container(
              padding: EdgeInsets.all(collapsed ? 8 : 12),
              decoration: const BoxDecoration(
                color: Color(0xff020b1c),
                border: Border(top: BorderSide(color: Color(0x1fffffff))),
              ),
              child: collapsed
                  ? IconButton(
                      tooltip: 'लॉग आउट',
                      onPressed: widget.onLogout,
                      icon: const Icon(Icons.logout_rounded, color: rose, size: 20),
                    )
                  : Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: softBlue,
                          child: Text(
                            userName.isNotEmpty
                                ? userName[0].toUpperCase()
                                : 'U',
                            style: const TextStyle(
                              color: blue,
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                userName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                userRole,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xff94a3b8),
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'लॉग आउट',
                          visualDensity: VisualDensity.compact,
                          onPressed: widget.onLogout,
                          icon: const Icon(
                            Icons.logout_rounded,
                            color: rose,
                            size: 18,
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
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
                    'Voter Phone Book',
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
