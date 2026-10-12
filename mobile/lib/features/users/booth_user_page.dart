import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';

class BoothUserPage extends StatefulWidget {
  const BoothUserPage({super.key});

  @override
  State<BoothUserPage> createState() => _BoothUserPageState();
}

class _BoothUserPageState extends State<BoothUserPage> with SingleTickerProviderStateMixin {
  late TabController tabController;
  final searchController = TextEditingController();
  final voterSearchController = TextEditingController();
  final speech = SpeechToText();
  bool isListening = false;

  Map<String, dynamic>? hierarchyData;
  List<Map<String, dynamic>> allUsers = [];
  bool loading = true;
  String? errorMessage;

  // Selected filters
  String? selectedPanchayat;
  String? selectedWard;
  String? selectedPart;
  String scopeType = 'all'; // 'all', 'panchayat', 'ward', 'booth'

  int refreshKey = 0;

  @override
  void initState() {
    super.initState();
    tabController = TabController(length: 4, vsync: this);
    _loadInitialData();
  }

  @override
  void dispose() {
    tabController.dispose();
    searchController.dispose();
    voterSearchController.dispose();
    speech.stop();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() {
      loading = true;
      errorMessage = null;
    });
    try {
      final hierarchyRes = await api.get('/api/auth/hierarchy-options');
      final usersRes = await api.list('/api/auth/users');

      if (mounted) {
        setState(() {
          hierarchyData = hierarchyRes;
          allUsers = usersRes.whereType<Map>().map((u) => Map<String, dynamic>.from(u)).toList();
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          errorMessage = 'डेटा लोड करने में त्रुटि: $e';
          loading = false;
        });
      }
    }
  }

  void _refresh() {
    setState(() => refreshKey++);
    _loadInitialData();
  }

  List<Map<String, dynamic>> get panchayats {
    if (hierarchyData == null || hierarchyData!['panchayats'] == null) return [];
    final list = hierarchyData!['panchayats'] as List;
    return list.whereType<Map>().map((p) => Map<String, dynamic>.from(p)).toList();
  }

  List<String> get parts {
    if (hierarchyData == null || hierarchyData!['parts'] == null) return [];
    final list = hierarchyData!['parts'] as List;
    return list.map((p) => p.toString()).toList();
  }

  List<Map<String, dynamic>> get filteredUsers {
    final q = searchController.text.trim().toLowerCase();
    return allUsers.where((user) {
      if (q.isNotEmpty) {
        final name = (user['name'] ?? '').toString().toLowerCase();
        final email = (user['email'] ?? '').toString().toLowerCase();
        final phone = (user['phone'] ?? '').toString().toLowerCase();
        final gps = (user['assignedGramPanchayats'] as List? ?? []).join(' ').toLowerCase();
        final wards = (user['assignedWards'] as List? ?? []).join(' ').toLowerCase();
        final pParts = (user['assignedParts'] as List? ?? []).join(' ').toLowerCase();
        if (!name.contains(q) &&
            !email.contains(q) &&
            !phone.contains(q) &&
            !gps.contains(q) &&
            !wards.contains(q) &&
            !pParts.contains(q)) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const AppPage(children: [
        Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())),
      ]);
    }

    if (errorMessage != null) {
      return AppPage(children: [
        Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline_rounded, color: Colors.red, size: 48),
            const SizedBox(height: 12),
            Text(errorMessage!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _loadInitialData,
              icon: const Icon(Icons.refresh),
              label: const Text('पुनः प्रयास करें'),
            ),
          ]),
        ),
      ]);
    }

    final totalManagers = allUsers.length;
    final activeManagers = allUsers.where((u) => u['active'] != false).length;

    return AppPage(children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xff1e3a8a), Color(0xff2563eb)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(color: const Color(0xff2563eb).withValues(alpha: .28), blurRadius: 18, offset: const Offset(0, 8)),
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .18),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.manage_accounts_rounded, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('मैनेजर एवं कार्यकर्ता प्रबंधन',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text('${hierarchyData?['samiti'] ?? 'विधानसभा क्षेत्र'} · कुल $totalManagers प्रभारी',
                    style: TextStyle(color: Colors.white.withValues(alpha: .85), fontSize: 12)),
              ]),
            ),
            ElevatedButton.icon(
              onPressed: () => _openAddEditDialog(),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xff1e3a8a),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.person_add_rounded, size: 18),
              label: const Text('नया प्रभारी', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ]),
          const SizedBox(height: 16),
          Row(children: [
            _metricPill('कुल पंचायतें', '${panchayats.length} GP'),
            const SizedBox(width: 8),
            _metricPill('सक्रिय प्रभारी', '$activeManagers Active'),
            const SizedBox(width: 8),
            _metricPill('कुल भाग/बूथ', '${parts.length} Parts'),
          ]),
        ]),
      ),
      const SizedBox(height: 16),

      // Tab selector
      Container(
        decoration: BoxDecoration(
          color: const Color(0xffedf2f7),
          borderRadius: BorderRadius.circular(16),
        ),
        child: TabBar(
          controller: tabController,
          labelColor: Colors.white,
          unselectedLabelColor: navy,
          indicatorSize: TabBarIndicatorSize.tab,
          indicator: BoxDecoration(
            color: const Color(0xff2563eb),
            borderRadius: BorderRadius.circular(14),
          ),
          dividerColor: Colors.transparent,
          tabs: const [
            Tab(icon: Icon(Icons.groups_rounded, size: 18), text: 'सभी प्रभारी'),
            Tab(icon: Icon(Icons.location_city_rounded, size: 18), text: 'पंचायतवार'),
            Tab(icon: Icon(Icons.maps_home_work_rounded, size: 18), text: 'वार्डवार'),
            Tab(icon: Icon(Icons.how_to_vote_rounded, size: 18), text: 'बूथ/भागवार'),
          ],
        ),
      ),
      const SizedBox(height: 14),

      // Search Bar
      TextField(
        controller: searchController,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.search_rounded, color: Color(0xff2563eb)),
          suffixIcon: searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18),
                  onPressed: () => setState(() => searchController.clear()),
                )
              : null,
          hintText: 'प्रभारी का नाम, फोन, पंचायत या वार्ड खोजें...',
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xff2563eb), width: 1.5)),
        ),
      ),
      const SizedBox(height: 14),

      // Tab Views
      SizedBox(
        height: 620,
        child: TabBarView(
          controller: tabController,
          children: [
            _buildAllManagersView(),
            _buildPanchayatManagersView(),
            _buildWardManagersView(),
            _buildBoothManagersView(),
          ],
        ),
      ),
    ]);
  }

  Widget _metricPill(String label, String value) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: .15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: TextStyle(color: Colors.white.withValues(alpha: .75), fontSize: 10)),
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
          ]),
        ),
      );

  // TAB 1: ALL MANAGERS LIST
  Widget _buildAllManagersView() {
    final list = filteredUsers;
    if (list.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.person_off_rounded, color: muted, size: 48),
          const SizedBox(height: 10),
          const Text('कोई प्रभारी नहीं मिला।', style: TextStyle(color: muted, fontSize: 15)),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: () => _openAddEditDialog(),
            icon: const Icon(Icons.add),
            label: const Text('नया प्रभारी जोड़ें'),
          ),
        ]),
      );
    }

    return ListView.separated(
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, index) => _ManagerCard(
        user: list[index],
        onEdit: () => _openAddEditDialog(user: list[index]),
        onToggleActive: (active) => _toggleUserActive(list[index], active),
        onDelete: () => _deleteUser(list[index]),
        onShowWorkStats: () => _showUserWorkStats(list[index]),
      ),
    );
  }

  // TAB 2: PANCHAYAT LEVEL
  Widget _buildPanchayatManagersView() {
    final pList = panchayats;
    return ListView.separated(
      itemCount: pList.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, index) {
        final gp = pList[index];
        final gpName = '${gp['name'] ?? ''}';
        final gpManagers = allUsers.where((u) {
          final assignedGps = (u['assignedGramPanchayats'] as List? ?? []).map((e) => e.toString());
          return assignedGps.contains(gpName);
        }).toList();

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: const Color(0xffeff6ff), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.location_city_rounded, color: Color(0xff2563eb), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(gpName, style: const TextStyle(color: navy, fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('${gp['totalVoters'] ?? 0} मतदाता · ${(gp['wards'] as List? ?? []).length} वार्ड · ${(gp['villages'] as List? ?? []).length} गाँव',
                      style: const TextStyle(color: muted, fontSize: 11)),
                ]),
              ),
              IconButton(
                tooltip: 'इस पंचायत में नया प्रभारी जोड़ें',
                onPressed: () => _openAddEditDialog(initialPanchayat: gpName, initialScope: 'panchayat'),
                style: IconButton.styleFrom(backgroundColor: const Color(0xffeff6ff), foregroundColor: const Color(0xff2563eb)),
                icon: const Icon(Icons.person_add_alt_1_rounded, size: 20),
              ),
            ]),
            if (gpManagers.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(height: 1, color: border),
              const SizedBox(height: 8),
              Text('नियुक्त प्रभारी (${gpManagers.length}):', style: const TextStyle(color: navy, fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              for (final u in gpManagers)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: _MiniUserRow(
                    user: u,
                    onEdit: () => _openAddEditDialog(user: u),
                    onDelete: () => _deleteUser(u),
                    onShowWorkStats: () => _showUserWorkStats(u),
                  ),
                ),
            ] else ...[
              const SizedBox(height: 8),
              const Text('⚠️ कोई संपूर्ण पंचायत प्रभारी नियुक्त नहीं है।', style: TextStyle(color: Colors.orange, fontSize: 11)),
            ],
          ]),
        );
      },
    );
  }

  // TAB 3: WARD LEVEL
  Widget _buildWardManagersView() {
    final pList = panchayats;
    return Column(children: [
      // Dropdown to pick Panchayat
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            hint: const Text('ग्राम पंचायत चुनें...'),
            value: selectedPanchayat ?? (pList.isNotEmpty ? '${pList.first['name']}' : null),
            onChanged: (val) => setState(() => selectedPanchayat = val),
            items: pList.map((p) => DropdownMenuItem(value: '${p['name']}', child: Text('पंचायत: ${p['name']}'))).toList(),
          ),
        ),
      ),
      const SizedBox(height: 10),
      Expanded(
        child: Builder(builder: (_) {
          final curGpName = selectedPanchayat ?? (pList.isNotEmpty ? '${pList.first['name']}' : '');
          final curGp = pList.firstWhere((p) => '${p['name']}' == curGpName, orElse: () => {});
          final wards = (curGp['wards'] as List? ?? []).map((w) => w.toString()).toList();

          if (wards.isEmpty) {
            return const Center(child: Text('इस पंचायत में वार्ड डेटा उपलब्ध नहीं है।', style: TextStyle(color: muted)));
          }

          return ListView.separated(
            itemCount: wards.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, index) {
              final wardNum = wards[index];
              final wardManagers = allUsers.where((u) {
                final assignedGps = (u['assignedGramPanchayats'] as List? ?? []).map((e) => e.toString());
                final assignedWards = (u['assignedWards'] as List? ?? []).map((e) => e.toString());
                return assignedGps.contains(curGpName) && assignedWards.contains(wardNum);
              }).toList();

              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: const Color(0xffecfdf5), borderRadius: BorderRadius.circular(10)),
                      child: Text('वार्ड $wardNum', style: const TextStyle(color: Color(0xff059669), fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('$curGpName (वार्ड $wardNum)', style: const TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                    IconButton(
                      tooltip: 'वार्ड प्रभारी नियुक्त करें',
                      onPressed: () => _openAddEditDialog(initialPanchayat: curGpName, initialWard: wardNum, initialScope: 'ward'),
                      icon: const Icon(Icons.person_add_alt_1_rounded, color: Color(0xff059669), size: 20),
                    ),
                  ]),
                  if (wardManagers.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    for (final u in wardManagers)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: _MiniUserRow(
                          user: u,
                          onEdit: () => _openAddEditDialog(user: u),
                          onDelete: () => _deleteUser(u),
                          onShowWorkStats: () => _showUserWorkStats(u),
                        ),
                      ),
                  ] else ...[
                    const SizedBox(height: 4),
                    const Text('प्रभारी नियुक्त नहीं', style: TextStyle(color: muted, fontSize: 11)),
                  ],
                ]),
              );
            },
          );
        }),
      ),
    ]);
  }

  // TAB 4: BOOTH / PART LEVEL
  Widget _buildBoothManagersView() {
    final pList = parts;
    return ListView.separated(
      itemCount: pList.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, index) {
        final partNum = pList[index];
        final partManagers = allUsers.where((u) {
          final assignedParts = (u['assignedParts'] as List? ?? []).map((e) => e.toString());
          return assignedParts.contains(partNum);
        }).toList();

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(color: const Color(0xffeff6ff), borderRadius: BorderRadius.circular(10)),
                child: Text('भाग #$partNum', style: const TextStyle(color: Color(0xff2563eb), fontWeight: FontWeight.bold, fontSize: 13)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text('बूथ / भाग संख्या $partNum', style: const TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 14)),
              ),
              IconButton(
                tooltip: 'बूथ प्रभारी नियुक्त करें',
                onPressed: () => _openAddEditDialog(initialPart: partNum, initialScope: 'booth'),
                icon: const Icon(Icons.person_add_alt_1_rounded, color: Color(0xff2563eb), size: 20),
              ),
            ]),
            if (partManagers.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final u in partManagers)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: _MiniUserRow(
                    user: u,
                    onEdit: () => _openAddEditDialog(user: u),
                    onDelete: () => _deleteUser(u),
                    onShowWorkStats: () => _showUserWorkStats(u),
                  ),
                ),
            ] else ...[
              const SizedBox(height: 4),
              const Text('बूथ प्रभारी नियुक्त नहीं', style: TextStyle(color: muted, fontSize: 11)),
            ],
          ]),
        );
      },
    );
  }

  void _showUserWorkStats(Map<String, dynamic> user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UserWorkStatsSheet(user: user),
    );
  }

  Future<void> _toggleUserActive(Map<String, dynamic> user, bool active) async {
    try {
      await api.put('/api/auth/users/${user['_id']}', {'active': active});
      setState(() => user['active'] = active);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${user['name']} को ${active ? 'सक्रिय' : 'निष्क्रिय'} किया गया।')),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _deleteUser(Map<String, dynamic> user) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('प्रभारी को हटाएं?'),
        content: Text('क्या आप सचमुच "${user['name']}" को हटाना चाहते हैं?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('रद्द करें')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('हटाएं', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await api.delete('/api/auth/users/${user['_id']}');
        _refresh();
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _openAddEditDialog({
    Map<String, dynamic>? user,
    String? initialPanchayat,
    String? initialWard,
    String? initialPart,
    String? initialScope,
  }) {
    showDialog(
      context: context,
      builder: (_) => _AddEditManagerDialog(
        user: user,
        panchayats: panchayats,
        parts: parts,
        hierarchyData: hierarchyData,
        initialPanchayat: initialPanchayat,
        initialWard: initialWard,
        initialPart: initialPart,
        initialScope: initialScope,
        onSaved: _refresh,
      ),
    );
  }
}

// MANAGER CARD WIDGET
class _ManagerCard extends StatelessWidget {
  const _ManagerCard({
    required this.user,
    required this.onEdit,
    required this.onToggleActive,
    required this.onDelete,
    this.onShowWorkStats,
  });

  final Map<String, dynamic> user;
  final VoidCallback onEdit;
  final ValueChanged<bool> onToggleActive;
  final VoidCallback onDelete;
  final VoidCallback? onShowWorkStats;

  @override
  Widget build(BuildContext context) {
    final name = '${user['name'] ?? '-'}';
    final email = '${user['email'] ?? '-'}';
    final phone = '${user['phone'] ?? ''}';
    final role = '${user['role'] ?? 'user'}';
    final active = user['active'] != false;
    final gps = (user['assignedGramPanchayats'] as List? ?? []).map((e) => e.toString()).toList();
    final wards = (user['assignedWards'] as List? ?? []).map((e) => e.toString()).toList();
    final pParts = (user['assignedParts'] as List? ?? []).map((e) => e.toString()).toList();

    String roleTitle = 'कार्यकर्ता';
    Color roleColor = Colors.blueGrey;
    if (role == 'admin') {
      roleTitle = 'व्यवस्थापक (Admin)';
      roleColor = const Color(0xffea4335);
    } else if (role == 'booth') {
      roleTitle = 'बूथ प्रबंधक';
      roleColor = const Color(0xff2563eb);
    } else if (role == 'ward_head') {
      roleTitle = 'वार्ड प्रभारी';
      roleColor = const Color(0xff059669);
    } else if (gps.isNotEmpty && wards.isEmpty) {
      roleTitle = 'पंचायत संयोजक';
      roleColor = const Color(0xff7c3aed);
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: active ? border : Colors.red.withValues(alpha: .3)),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: roleColor.withValues(alpha: .14),
            child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'M',
                style: TextStyle(color: roleColor, fontWeight: FontWeight.bold, fontSize: 18)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: navy, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: roleColor.withValues(alpha: .12), borderRadius: BorderRadius.circular(8)),
                  child: Text(roleTitle, style: TextStyle(color: roleColor, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ]),
              const SizedBox(height: 2),
              Text(phone.isNotEmpty ? '📞 $phone · ✉️ $email' : '✉️ $email',
                  maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: muted, fontSize: 12)),
            ]),
          ),
        ]),
        const SizedBox(height: 10),
        // Scope badges
        Wrap(spacing: 6, runSpacing: 4, children: [
          if (gps.isNotEmpty)
            for (final gp in gps)
              _tag('🏛️ GP: $gp', const Color(0xff7c3aed)),
          if (wards.isNotEmpty)
            for (final w in wards)
              _tag('🏘️ वार्ड #$w', const Color(0xff059669)),
          if (pParts.isNotEmpty)
            for (final p in pParts)
              _tag('🗳️ भाग #$p', const Color(0xff2563eb)),
          if (gps.isEmpty && wards.isEmpty && pParts.isEmpty && role == 'admin')
            _tag('🌐 संपूर्ण विधानसभा क्षेत्र', const Color(0xffea4335)),
          if (role != 'admin') ...[
            if ((user['allowedRollType'] ?? 'municipal') == 'municipal')
              _tag('📋 केवल वार्ड सूची', const Color(0xff0d9488)),
            if (user['allowedRollType'] == 'assembly')
              _tag('📋 केवल विधानसभा सूची', const Color(0xffd97706)),
            if (user['allowedRollType'] == 'all')
              _tag('📋 दोनों सूचियां', const Color(0xff4f46e5)),
          ],
        ]),
        const SizedBox(height: 10),
        const Divider(height: 1, color: border),
        const SizedBox(height: 6),
        Row(children: [
          Switch(
            value: active,
            activeColor: const Color(0xff2563eb),
            onChanged: onToggleActive,
          ),
          Text(active ? 'सक्रिय (Active)' : 'निष्क्रिय (Disabled)', style: TextStyle(color: active ? navy : muted, fontSize: 12)),
          const Spacer(),
          if (onShowWorkStats != null)
            IconButton(
              tooltip: 'कार्य विवरण (Work Stats)',
              onPressed: onShowWorkStats,
              icon: const Icon(Icons.assessment_rounded, color: Color(0xff7c3aed), size: 20),
            ),
          if (phone.isNotEmpty) ...[
            IconButton(
              tooltip: 'कॉल करें ($phone)',
              onPressed: () => callNumber(context, phone),
              icon: const Icon(Icons.call_rounded, color: green, size: 20),
            ),
            IconButton(
              tooltip: 'WhatsApp संदेश भेजें',
              onPressed: () => openWhatsApp(context, phone, message: 'नमस्कार $name जी,'),
              icon: const Icon(Icons.chat_rounded, color: Color(0xff25d366), size: 20),
            ),
          ],
          IconButton(
            tooltip: 'संपादित करें',
            onPressed: onEdit,
            icon: const Icon(Icons.edit_rounded, color: Color(0xff2563eb), size: 20),
          ),
          IconButton(
            tooltip: 'हटाएं',
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 20),
          ),
        ]),
      ]),
    );
  }

  Widget _tag(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(6)),
        child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
      );
}

class _MiniUserRow extends StatelessWidget {
  const _MiniUserRow({
    required this.user,
    required this.onEdit,
    required this.onDelete,
    this.onShowWorkStats,
  });
  final Map<String, dynamic> user;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onShowWorkStats;

  @override
  Widget build(BuildContext context) {
    final phone = '${user['phone'] ?? ''}'.trim();
    final name = '${user['name'] ?? ''}'.trim();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: const Color(0xfff8fafc), borderRadius: BorderRadius.circular(10), border: Border.all(color: border)),
      child: Row(children: [
        const Icon(Icons.person, size: 16, color: Color(0xff2563eb)),
        const SizedBox(width: 8),
        Expanded(
          child: Text('$name (${phone.isNotEmpty ? phone : user['email']})',
              maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: navy, fontSize: 12, fontWeight: FontWeight.bold)),
        ),
        if (onShowWorkStats != null) ...[
          IconButton(
            icon: const Icon(Icons.assessment_rounded, size: 18, color: Color(0xff7c3aed)),
            tooltip: 'कार्य विवरण',
            onPressed: onShowWorkStats,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            constraints: const BoxConstraints(),
          ),
          const SizedBox(width: 4),
        ],
        if (phone.isNotEmpty) ...[
          IconButton(
            icon: const Icon(Icons.call_rounded, size: 18, color: green),
            tooltip: 'कॉल करें ($phone)',
            onPressed: () => callNumber(context, phone),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            constraints: const BoxConstraints(),
          ),
          const SizedBox(width: 4),
          IconButton(
            icon: const Icon(Icons.chat_rounded, size: 18, color: Color(0xff25d366)),
            tooltip: 'WhatsApp',
            onPressed: () => openWhatsApp(context, phone, message: 'नमस्कार $name जी,'),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            constraints: const BoxConstraints(),
          ),
          const SizedBox(width: 6),
        ],
        IconButton(icon: const Icon(Icons.edit, size: 16, color: Color(0xff2563eb)), onPressed: onEdit, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
        const SizedBox(width: 8),
        IconButton(icon: const Icon(Icons.delete, size: 16, color: Colors.red), onPressed: onDelete, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
      ]),
    );
  }
}

// ADD / EDIT MANAGER DIALOG
class _AddEditManagerDialog extends StatefulWidget {
  const _AddEditManagerDialog({
    this.user,
    required this.panchayats,
    required this.parts,
    this.hierarchyData,
    this.initialPanchayat,
    this.initialWard,
    this.initialPart,
    this.initialScope,
    required this.onSaved,
  });

  final Map<String, dynamic>? user;
  final List<Map<String, dynamic>> panchayats;
  final List<String> parts;
  final Map<String, dynamic>? hierarchyData;
  final String? initialPanchayat;
  final String? initialWard;
  final String? initialPart;
  final String? initialScope;
  final VoidCallback onSaved;

  @override
  State<_AddEditManagerDialog> createState() => _AddEditManagerDialogState();
}

class _AddEditManagerDialogState extends State<_AddEditManagerDialog> {
  final nameController = TextEditingController();
  final phoneController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final voterSearchController = TextEditingController();

  // Primary access type: 'municipal' vs 'assembly'
  String selectedRollCategory = 'municipal';
  String selectedSamiti = 'रायपुर';
  String selectedScope = 'panchayat'; // 'panchayat' or 'ward' (for municipal), 'booth' (for assembly)
  String? selectedGp;
  String? selectedWard;
  String? selectedPart;
  String selectedRole = 'booth';
  String selectedRollType = 'municipal'; // 'municipal', 'assembly', 'all'
  bool selectFromVoters = true;

  // Voter Search State
  List<Map<String, dynamic>> foundVoters = [];
  bool searchingVoters = false;
  Map<String, dynamic>? selectedVoter;

  // Permissions
  bool canViewFullMobile = true;
  bool canEditVoters = true;
  bool canCreateVoters = true;
  bool canEditPhoto = true;
  bool canEditParty = true;
  bool canEditAnubhag = true;
  bool canMarkVoted = true;
  bool canDeleteVoters = false;
  bool canExportData = false;
  bool canPrintProfiles = true;
  bool canViewReports = true;

  bool saving = false;
  bool showPassword = false;

  List<String> get samitiList {
    final list = widget.hierarchyData?['samitis'] as List?;
    if (list != null && list.isNotEmpty) {
      return list.map((e) => e.toString()).toList();
    }
    final samitis = <String>{};
    for (final p in widget.panchayats) {
      final s = (p['samiti'] ?? '').toString();
      if (s.isNotEmpty) samitis.add(s);
    }
    return samitis.isNotEmpty ? samitis.toList() : ['रायपुर', 'सहाड़ा'];
  }

  List<Map<String, dynamic>> get filteredPanchayats {
    if (selectedSamiti.isEmpty) return widget.panchayats;
    final list = widget.panchayats.where((p) => (p['samiti'] ?? 'रायपुर') == selectedSamiti).toList();
    return list.isNotEmpty ? list : widget.panchayats;
  }

  @override
  void initState() {
    super.initState();
    if (widget.user != null) {
      final u = widget.user!;
      nameController.text = '${u['name'] ?? ''}';
      phoneController.text = '${u['phone'] ?? ''}';
      emailController.text = '${u['email'] ?? ''}';
      selectedRole = '${u['role'] ?? 'booth'}';

      final gps = (u['assignedGramPanchayats'] as List? ?? []).map((e) => e.toString()).toList();
      final wards = (u['assignedWards'] as List? ?? []).map((e) => e.toString()).toList();
      final pParts = (u['assignedParts'] as List? ?? []).map((e) => e.toString()).toList();
      final rollType = '${u['allowedRollType'] ?? ''}';

      if (rollType == 'assembly' || (pParts.isNotEmpty && gps.isEmpty)) {
        selectedRollCategory = 'assembly';
        selectedRollType = 'assembly';
        selectedPart = pParts.isNotEmpty ? pParts.first : (widget.parts.isNotEmpty ? widget.parts.first : null);
        selectedScope = 'booth';
      } else {
        selectedRollCategory = 'municipal';
        selectedRollType = 'municipal';
        selectedGp = gps.isNotEmpty ? gps.first : null;
        if (wards.isNotEmpty && wards.length == 1) {
          selectedScope = 'ward';
          selectedWard = wards.first;
        } else {
          selectedScope = 'panchayat';
        }
      }

      if (selectedGp != null) {
        final found = widget.panchayats.firstWhere((p) => '${p['name']}' == selectedGp, orElse: () => {});
        if (found['samiti'] != null) {
          selectedSamiti = found['samiti'].toString();
        }
      }

      final perms = (u['permissions'] as Map?) ?? {};
      canViewFullMobile = perms['canViewFullMobile'] != false;
      canEditVoters = perms['canEditVoters'] != false;
      canCreateVoters = perms['canCreateVoters'] != false;
      canEditPhoto = perms['canEditPhoto'] != false;
      canEditParty = perms['canEditParty'] != false;
      canEditAnubhag = perms['canEditAnubhag'] != false;
      canMarkVoted = perms['canMarkVoted'] != false;
      canDeleteVoters = perms['canDeleteVoters'] == true;
      canExportData = perms['canExportData'] == true;
      canPrintProfiles = perms['canPrintProfiles'] != false;
      canViewReports = perms['canViewReports'] != false;
      selectFromVoters = false;
    } else {
      if (widget.initialScope == 'booth' || widget.initialPart != null) {
        selectedRollCategory = 'assembly';
        selectedRollType = 'assembly';
        selectedScope = 'booth';
        selectedPart = widget.initialPart ?? (widget.parts.isNotEmpty ? widget.parts.first : null);
        selectedRole = 'booth';
      } else {
        selectedRollCategory = 'municipal';
        selectedRollType = 'municipal';
        selectedScope = widget.initialScope ?? 'panchayat';
        selectedGp = widget.initialPanchayat ?? (filteredPanchayats.isNotEmpty ? '${filteredPanchayats.first['name']}' : null);
        selectedWard = widget.initialWard;
        selectedRole = selectedScope == 'ward' ? 'ward_head' : 'booth';

        if (selectedGp != null) {
          final found = widget.panchayats.firstWhere((p) => '${p['name']}' == selectedGp, orElse: () => {});
          if (found['samiti'] != null) {
            selectedSamiti = found['samiti'].toString();
          }
        }
      }
    }

    _searchVoters();
  }

  @override
  void dispose() {
    nameController.dispose();
    phoneController.dispose();
    emailController.dispose();
    passwordController.dispose();
    voterSearchController.dispose();
    super.dispose();
  }

  Future<void> _searchVoters() async {
    if (!mounted) return;
    setState(() => searchingVoters = true);

    try {
      final queryParams = <String, String>{'limit': '15'};
      if (selectedRollCategory == 'assembly') {
        if (selectedPart != null && selectedPart!.isNotEmpty) {
          queryParams['partNumber'] = selectedPart!;
        }
      } else {
        if (selectedGp != null && selectedGp!.isNotEmpty) {
          queryParams['gramPanchayat'] = selectedGp!;
        }
        if (selectedScope == 'ward' && selectedWard != null && selectedWard!.isNotEmpty) {
          queryParams['wardNumber'] = selectedWard!;
        }
      }
      final q = voterSearchController.text.trim();
      if (q.isNotEmpty) {
        queryParams['q'] = q;
      }

      final uri = Uri(path: '/api/members', queryParameters: queryParams).toString();
      final dynamic res = await api.get(uri);
      final List rawList;
      if (res is Map && res['items'] is List) {
        rawList = res['items'] as List;
      } else if (res is List) {
        rawList = res;
      } else {
        rawList = [];
      }

      if (mounted) {
        setState(() {
          foundVoters = rawList.whereType<Map>().map((v) => Map<String, dynamic>.from(v)).toList();
          searchingVoters = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => searchingVoters = false);
    }
  }

  void _onSelectVoter(Map<String, dynamic> v) {
    setState(() {
      selectedVoter = v;
      nameController.text = '${v['name'] ?? ''}'.trim();
      final mobile = '${v['mobile'] ?? ''}'.replaceAll(RegExp(r'\D'), '');
      if (mobile.length == 10) phoneController.text = mobile;
      if (mobile.length == 10 && (emailController.text.isEmpty || emailController.text.endsWith('@crm.com'))) {
        emailController.text = '$mobile@crm.com';
      } else {
        final epic = '${v['voterId'] ?? ''}'.trim().toLowerCase().replaceAll('/', '_');
        if (emailController.text.isEmpty && epic.isNotEmpty) {
          emailController.text = '$epic@crm.com';
        }
      }
      if (passwordController.text.isEmpty) {
        passwordController.text = '123456';
      }
    });
  }

  Future<void> _save() async {
    final name = nameController.text.trim();
    var email = emailController.text.trim().toLowerCase();
    final phone = phoneController.text.trim();
    final password = passwordController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('कृपया नाम दर्ज करें।')));
      return;
    }

    if (email.isEmpty) {
      if (phone.length >= 10) {
        email = '$phone@crm.com';
      } else {
        final clean = name.replaceAll(RegExp(r'\s+'), '').toLowerCase();
        email = '$clean${DateTime.now().millisecondsSinceEpoch % 10000}@crm.com';
      }
    }

    if (widget.user == null && (password.isEmpty || password.length < 6)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')));
      return;
    }

    if (selectedRollCategory == 'assembly') {
      if (selectedPart == null || selectedPart!.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('कृपया भाग/बूथ संख्या चुनें।')));
        return;
      }
    } else {
      if (selectedGp == null || selectedGp!.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('कृपया ग्राम पंचायत चुनें।')));
        return;
      }
      if (selectedScope == 'ward' && (selectedWard == null || selectedWard!.trim().isEmpty)) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('कृपया वार्ड नंबर चुनें।')));
        return;
      }
    }

    setState(() => saving = true);

    final curGp = widget.panchayats.firstWhere((p) => '${p['name']}' == selectedGp, orElse: () => {});
    final allGpWards = (curGp['wards'] as List? ?? []).map((w) => w.toString()).toList();

    List<String> assignedWardsList = [];
    List<String> assignedGpsList = [];
    List<String> assignedPartsList = [];

    if (selectedRollCategory == 'assembly') {
      assignedPartsList = selectedPart != null ? [selectedPart!] : [];
    } else {
      assignedGpsList = selectedGp != null ? [selectedGp!] : [];
      if (selectedScope == 'ward' && selectedWard != null && selectedWard!.isNotEmpty) {
        assignedWardsList = [selectedWard!];
      } else {
        assignedWardsList = allGpWards;
      }
    }

    final payload = <String, dynamic>{
      'name': name,
      'email': email,
      'phone': phone,
      'role': selectedRole,
      'allowedRollType': selectedRollType,
      'assignedGramPanchayats': assignedGpsList,
      'assignedWards': assignedWardsList,
      'assignedParts': assignedPartsList,
      'assignedVoterId': selectedVoter?['voterId'] ?? '',
      'permissions': {
        'canViewFullMobile': canViewFullMobile,
        'canEditVoters': canEditVoters,
        'canCreateVoters': canCreateVoters,
        'canEditPhoto': canEditPhoto,
        'canEditParty': canEditParty,
        'canEditAnubhag': canEditAnubhag,
        'canMarkVoted': canMarkVoted,
        'canDeleteVoters': canDeleteVoters,
        'canExportData': canExportData,
        'canPrintProfiles': canPrintProfiles,
        'canViewReports': canViewReports,
      },
    };

    if (password.isNotEmpty) {
      payload['password'] = password;
    }

    try {
      if (widget.user != null) {
        await api.put('/api/auth/users/${widget.user!['_id']}', payload);
      } else {
        await api.post('/api/auth/users', payload);
      }
      widget.onSaved();
      if (mounted) {
        Navigator.pop(context);
        if (widget.user == null) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(children: [
                Icon(Icons.check_circle_rounded, color: Colors.green, size: 28),
                SizedBox(width: 10),
                Text('प्रभारी बनाया गया!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ]),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('नाम: $name', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('लॉगिन: ${phone.isNotEmpty ? phone : email}'),
                  Text('ईमेल: $email'),
                  Text('पासवर्ड: $password', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xff2563eb))),
                  const SizedBox(height: 12),
                  const Text(
                    'नोट: यूजर अपने 10-अंकों के मोबाइल नंबर या ईमेल और इसी पासवर्ड से ऐप में लॉगिन कर सकते हैं।',
                    style: TextStyle(color: Colors.blueGrey, fontSize: 12),
                  ),
                ],
              ),
              actions: [
                FilledButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('समझ गया (OK)'),
                ),
              ],
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('प्रभारी अपडेट हो गया।')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final curGp = widget.panchayats.firstWhere((p) => '${p['name']}' == selectedGp, orElse: () => {});
    final wards = (curGp['wards'] as List? ?? []).map((w) => w.toString()).toList();

    return AlertDialog(
      titlePadding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
      contentPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: Row(children: [
        Icon(widget.user != null ? Icons.edit_note_rounded : Icons.person_add_rounded, color: const Color(0xff2563eb)),
        const SizedBox(width: 10),
        Expanded(
          child: Text(widget.user != null ? 'प्रभारी एक्सेस संपादित करें' : 'नया प्रभारी नियुक्त करें',
              style: const TextStyle(color: navy, fontSize: 18, fontWeight: FontWeight.bold)),
        ),
      ]),
      content: SizedBox(
        width: 600,
        height: 580,
        child: SingleChildScrollView(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 10),
            // STEP 1: PRIMARY ROLL TYPE
            const Text('१. मतदाता सूची एक्सेस प्रकार (Access Type):',
                style: TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: _accessCategoryCard(
                  title: '🏢 नगरपालिका / पंचायत',
                  subtitle: 'वार्ड व पंचायत आधारित',
                  icon: Icons.location_city_rounded,
                  isSelected: selectedRollCategory == 'municipal',
                  onTap: () {
                    setState(() {
                      selectedRollCategory = 'municipal';
                      selectedRollType = 'municipal';
                      selectedScope = 'panchayat';
                      selectedPart = null;
                      if (selectedGp == null && filteredPanchayats.isNotEmpty) {
                        selectedGp = '${filteredPanchayats.first['name']}';
                      }
                    });
                    _searchVoters();
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _accessCategoryCard(
                  title: '🏛️ विधानसभा',
                  subtitle: 'भाग/बूथ संख्या (1-315)',
                  icon: Icons.how_to_vote_rounded,
                  isSelected: selectedRollCategory == 'assembly',
                  onTap: () {
                    setState(() {
                      selectedRollCategory = 'assembly';
                      selectedRollType = 'assembly';
                      selectedScope = 'booth';
                      selectedGp = null;
                      selectedWard = null;
                      if (selectedPart == null && widget.parts.isNotEmpty) {
                        selectedPart = widget.parts.first;
                      }
                    });
                    _searchVoters();
                  },
                ),
              ),
            ]),
            const SizedBox(height: 14),

            // If Assembly selected:
            if (selectedRollCategory == 'assembly') ...[
              const Text('विधानसभा भाग (बूथ) संख्या चुनें (1 - 315):',
                  style: TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(color: const Color(0xfff8fafc), borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: selectedPart ?? (widget.parts.isNotEmpty ? widget.parts.first : null),
                    hint: const Text('भाग संख्या चुनें...'),
                    onChanged: (val) {
                      setState(() => selectedPart = val);
                      _searchVoters();
                    },
                    items: widget.parts.map((p) => DropdownMenuItem(value: p, child: Text('🗳️ भाग संख्या $p (बूथ $p)'))).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // If Municipal / Panchayat selected:
            if (selectedRollCategory == 'municipal') ...[
              // Step 1.1: Samiti Selection
              const Text('पंचायत समिति चुनें:', style: TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                children: samitiList.map((sam) {
                  final isSel = selectedSamiti == sam;
                  return ChoiceChip(
                    label: Text('समिति: $sam', style: TextStyle(fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                    selected: isSel,
                    onSelected: (val) {
                      if (val) {
                        setState(() {
                          selectedSamiti = sam;
                          final fps = filteredPanchayats;
                          selectedGp = fps.isNotEmpty ? '${fps.first['name']}' : null;
                          selectedWard = null;
                        });
                        _searchVoters();
                      }
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),

              // Step 1.2: Gram Panchayat Selection
              const Text('ग्राम पंचायत चुनें:', style: TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(color: const Color(0xfff8fafc), borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: selectedGp ?? (filteredPanchayats.isNotEmpty ? '${filteredPanchayats.first['name']}' : null),
                    hint: const Text('ग्राम पंचायत चुनें...'),
                    onChanged: (val) {
                      setState(() {
                        selectedGp = val;
                        selectedWard = null;
                      });
                      _searchVoters();
                    },
                    items: filteredPanchayats.map((p) => DropdownMenuItem(
                      value: '${p['name']}',
                      child: Text('🏛️ पंचायत: ${p['name']} (${p['totalVoters'] ?? 0} वोटर्स)'),
                    )).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Step 1.3: Access Scope (Whole Panchayat vs Specific Ward)
              const Text('एक्सेस का स्तर (Scope Level):', style: TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Row(children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('🟢 सम्पूर्ण पंचायत')),
                    selected: selectedScope == 'panchayat',
                    onSelected: (_) {
                      setState(() {
                        selectedScope = 'panchayat';
                        selectedWard = null;
                        selectedRole = 'booth';
                      });
                      _searchVoters();
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('🔵 विशिष्ट वार्ड')),
                    selected: selectedScope == 'ward',
                    onSelected: (_) {
                      setState(() {
                        selectedScope = 'ward';
                        selectedRole = 'ward_head';
                      });
                      _searchVoters();
                    },
                  ),
                ),
              ]),
              const SizedBox(height: 10),

              if (selectedScope == 'ward') ...[
                const Text('वार्ड नंबर चुनें:', style: TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(color: const Color(0xfff8fafc), borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: selectedWard,
                      hint: const Text('वार्ड नंबर चुनें...'),
                      onChanged: (val) {
                        setState(() => selectedWard = val);
                        _searchVoters();
                      },
                      items: wards.map((w) => DropdownMenuItem(value: w, child: Text('🏘️ वार्ड नंबर $w'))).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ],

            const Divider(color: border, height: 24),

            // STEP 2: CHOOSE FROM VOTERS OR CUSTOM
            Row(children: [
              const Text('२. प्रभारी विवरण:', style: TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 13)),
              const Spacer(),
              ChoiceChip(
                label: const Text('मतदाता में से चुनें'),
                selected: selectFromVoters,
                onSelected: (val) => setState(() => selectFromVoters = true),
              ),
              const SizedBox(width: 6),
              ChoiceChip(
                label: const Text('कस्टम यूजर'),
                selected: !selectFromVoters,
                onSelected: (val) => setState(() => selectFromVoters = false),
              ),
            ]),
            const SizedBox(height: 10),

            if (selectFromVoters) ...[
              TextField(
                controller: voterSearchController,
                onChanged: (_) => _searchVoters(),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search, size: 18),
                  hintText: 'इस क्षेत्र में मतदाता खोजें (नाम / EPIC)...',
                  isDense: true,
                  filled: true,
                  fillColor: const Color(0xfff8fafc),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
                ),
              ),
              const SizedBox(height: 8),
              if (searchingVoters)
                const Center(child: Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))))
              else if (foundVoters.isEmpty)
                const Padding(padding: EdgeInsets.all(8), child: Text('कोई मतदाता नहीं मिला।', style: TextStyle(color: muted, fontSize: 12)))
              else
                Container(
                  height: 160,
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
                  child: ListView.separated(
                    itemCount: foundVoters.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, color: border),
                    itemBuilder: (_, idx) {
                      final v = foundVoters[idx];
                      final isSel = selectedVoter?['voterId'] == v['voterId'];
                      return ListTile(
                        dense: true,
                        selected: isSel,
                        selectedTileColor: const Color(0xffeff6ff),
                        leading: _VoterPhoto(photo: v, radius: 18),
                        title: Text('${v['name'] ?? '-'} (${v['guardianName'] ?? '-'})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        subtitle: Text('EPIC: ${v['voterId'] ?? '-'} · मो: ${v['mobile'] ?? '-'}', style: const TextStyle(fontSize: 10)),
                        trailing: isSel ? const Icon(Icons.check_circle, color: Color(0xff2563eb), size: 18) : null,
                        onTap: () => _onSelectVoter(v),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 12),
            ],

            // Text Inputs
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'प्रभारी का पूरा नाम *', prefixIcon: Icon(Icons.person)),
            ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  onChanged: (val) {
                    final digits = val.replaceAll(RegExp(r'\D'), '');
                    if (widget.user == null && (emailController.text.isEmpty || emailController.text.endsWith('@crm.com'))) {
                      setState(() {
                        emailController.text = digits.isNotEmpty ? '$digits@crm.com' : '';
                      });
                    }
                  },
                  decoration: const InputDecoration(labelText: 'मोबाइल नंबर', prefixIcon: Icon(Icons.phone)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: passwordController,
                  obscureText: !showPassword,
                  decoration: InputDecoration(
                    labelText: widget.user != null ? 'नया पासवर्ड (ऐच्छिक)' : 'पासवर्ड (कम से कम 6 अक्षर) *',
                    prefixIcon: const Icon(Icons.lock),
                    suffixIcon: IconButton(
                      icon: Icon(showPassword ? Icons.visibility_off : Icons.visibility, color: const Color(0xff2563eb), size: 20),
                      onPressed: () => setState(() => showPassword = !showPassword),
                    ),
                  ),
                ),
              ),
            ]),
            const SizedBox(height: 10),
            TextField(
              controller: emailController,
              decoration: const InputDecoration(
                labelText: 'लॉगिन ईमेल / यूजरनेम',
                prefixIcon: Icon(Icons.email),
                helperText: 'यूजर मोबाइल नंबर या इस ईमेल से लॉगिन कर सकते हैं',
              ),
            ),

            const Divider(color: border, height: 24),

            // STEP 3: ROLE & PERMISSIONS
            const Text('३. भूमिका एवं अधिकार (Permissions):', style: TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(color: const Color(0xfff8fafc), borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: selectedRole,
                  onChanged: (val) => setState(() => selectedRole = val ?? 'booth'),
                  items: const [
                    DropdownMenuItem(value: 'booth', child: Text('बूथ / पंचायत प्रबंधक (Manager)')),
                    DropdownMenuItem(value: 'ward_head', child: Text('वार्ड प्रभारी (Ward Head)')),
                    DropdownMenuItem(value: 'worker', child: Text('कार्यकर्ता (Field Worker)')),
                    DropdownMenuItem(value: 'admin', child: Text('व्यवस्थापक (Full Admin)')),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            _permSwitch('📱 मोबाइल नंबर देखें (View Full Mobile)', canViewFullMobile, (v) => setState(() => canViewFullMobile = v)),
            _permSwitch('✏️ मतदाता संपादित करें (Edit Voter)', canEditVoters, (v) => setState(() => canEditVoters = v)),
            _permSwitch('➕ नए मतदाता जोड़ें (Create Voter)', canCreateVoters, (v) => setState(() => canCreateVoters = v)),
            _permSwitch('📷 फोटो बदलें (Upload Photo)', canEditPhoto, (v) => setState(() => canEditPhoto = v)),
            _permSwitch('🚩 पार्टी व रुझान बदलें (Edit Party/Preference)', canEditParty, (v) => setState(() => canEditParty = v)),
            _permSwitch('🗳️ वोट स्थिति मार्क करें (Mark Voted)', canMarkVoted, (v) => setState(() => canMarkVoted = v)),
            _permSwitch('🖨️ प्रिंट एवं एक्सपोर्ट (Print & Export)', canPrintProfiles, (v) => setState(() => canPrintProfiles = v)),
            _permSwitch('📊 रिपोर्ट्स देखें (View Reports)', canViewReports, (v) => setState(() => canViewReports = v)),
            _permSwitch('🗑️ मतदाता हटाएं (Delete Voter)', canDeleteVoters, (v) => setState(() => canDeleteVoters = v)),
          ]),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('रद्द करें', style: TextStyle(color: muted)),
        ),
        ElevatedButton(
          onPressed: saving ? null : _save,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xff2563eb),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: saving
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('सुरक्षित करें (Save Manager)', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _accessCategoryCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xffeff6ff) : const Color(0xfff8fafc),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? const Color(0xff2563eb) : border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 24, color: isSelected ? const Color(0xff2563eb) : muted),
            const SizedBox(height: 6),
            Text(title, textAlign: TextAlign.center, style: TextStyle(color: isSelected ? const Color(0xff2563eb) : navy, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: muted, fontSize: 10)),
          ],
        ),
      ),
    );
  }

  Widget _permSwitch(String title, bool val, ValueChanged<bool> onChange) => Row(
        children: [
          Expanded(child: Text(title, style: const TextStyle(fontSize: 12, color: navy))),
          Transform.scale(scale: 0.8, child: Switch(value: val, activeColor: const Color(0xff2563eb), onChanged: onChange)),
        ],
      );
}

// USER WORK STATS BOTTOM SHEET
class _UserWorkStatsSheet extends StatefulWidget {
  const _UserWorkStatsSheet({required this.user});
  final Map<String, dynamic> user;

  @override
  State<_UserWorkStatsSheet> createState() => _UserWorkStatsSheetState();
}

class _UserWorkStatsSheetState extends State<_UserWorkStatsSheet> {
  bool loading = true;
  String? error;
  Map<String, dynamic>? stats;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    try {
      final res = await api.get('/api/auth/users/${widget.user['_id']}/work-stats');
      if (mounted) {
        setState(() {
          stats = Map<String, dynamic>.from(res);
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = 'त्रुटि: $e';
          loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = '${widget.user['name'] ?? '-'}';
    final role = '${widget.user['role'] ?? 'user'}';
    final phone = '${widget.user['phone'] ?? ''}';

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xff7c3aed).withValues(alpha: 0.15),
                child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Color(0xff7c3aed), fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(color: navy, fontSize: 16, fontWeight: FontWeight.bold)),
                    Text(phone.isNotEmpty ? phone : (widget.user['email'] ?? ''),
                        style: const TextStyle(color: muted, fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xff7c3aed).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('भूमिका: $role', style: const TextStyle(color: Color(0xff7c3aed), fontSize: 11, fontWeight: FontWeight.bold)),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: border),
          const SizedBox(height: 14),
          if (loading)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (error != null)
            Padding(
              padding: const EdgeInsets.all(20),
              child: Center(child: Text(error!, style: const TextStyle(color: Colors.red))),
            )
          else ...[
            // KPI Summary Grid
            Row(
              children: [
                Expanded(child: _kpiCard('✏️ संपादित मतदाता', '${stats?['votersEdited'] ?? 0}', const Color(0xff2563eb))),
                const SizedBox(width: 8),
                Expanded(child: _kpiCard('📱 मोबाइल जोड़े', '${stats?['mobilesAdded'] ?? 0}', const Color(0xff059669))),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _kpiCard('🗳️ वोट स्थिति दर्ज', '${stats?['voteStatusMarked'] ?? 0}', const Color(0xff7c3aed))),
                const SizedBox(width: 8),
                Expanded(child: _kpiCard('⭐ फ़ेवरेट मार्क', '${stats?['favoritesMarked'] ?? 0}', const Color(0xffd97706))),
              ],
            ),
            const SizedBox(height: 16),
            const Text('हाल की गतिविधियां (Recent Activity Log):',
                style: TextStyle(color: navy, fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Expanded(
              child: Builder(
                builder: (_) {
                  final recent = (stats?['recentActivity'] as List? ?? []);
                  if (recent.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(20),
                      alignment: Alignment.center,
                      child: const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.history_rounded, size: 40, color: muted),
                          SizedBox(height: 8),
                          Text('इस यूजर द्वारा अभी तक कोई संपादन कार्य दर्ज नहीं हुआ है।',
                              style: TextStyle(color: muted, fontSize: 12), textAlign: TextAlign.center),
                        ],
                      ),
                    );
                  }
                  return ListView.separated(
                    itemCount: recent.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, color: border),
                    itemBuilder: (_, idx) {
                      final act = recent[idx];
                      final actionStr = '${act['action'] ?? ''}';
                      final createdAt = '${act['createdAt'] ?? ''}';
                      final details = act['details'] as Map? ?? {};

                      String actionLabel = actionStr;
                      IconData actionIcon = Icons.edit_note_rounded;
                      Color iconColor = const Color(0xff2563eb);

                      if (actionStr == 'member.favorite') {
                        actionLabel = 'पसंदीदा (Favorite) मार्क किया';
                        actionIcon = Icons.star_rounded;
                        iconColor = const Color(0xffd97706);
                      } else if (actionStr.contains('vote')) {
                        actionLabel = 'मतदान स्थिति मार्क की';
                        actionIcon = Icons.how_to_vote_rounded;
                        iconColor = const Color(0xff7c3aed);
                      } else if (actionStr.contains('mobile') || details.containsKey('mobile')) {
                        actionLabel = 'मोबाइल नंबर अपडेट किया';
                        actionIcon = Icons.phone_android_rounded;
                        iconColor = const Color(0xff059669);
                      } else if (actionStr.contains('update')) {
                        actionLabel = 'मतदाता विवरण संपादित किया';
                      }

                      String dateDisplay = createdAt;
                      if (createdAt.length >= 10) {
                        try {
                          final dt = DateTime.parse(createdAt).toLocal();
                          dateDisplay = '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
                        } catch (_) {}
                      }

                      return ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          radius: 16,
                          backgroundColor: iconColor.withValues(alpha: 0.12),
                          child: Icon(actionIcon, size: 16, color: iconColor),
                        ),
                        title: Text(actionLabel, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: navy)),
                        subtitle: Text(
                          details['name'] != null ? 'मतदाता: ${details['name']} (${details['voterId'] ?? ''})' : (details['voterId'] != null ? 'EPIC: ${details['voterId']}' : ''),
                          style: const TextStyle(fontSize: 11, color: muted),
                        ),
                        trailing: Text(dateDisplay, style: const TextStyle(fontSize: 10, color: muted)),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _kpiCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

// VOTER PHOTO WIDGET
class _VoterPhoto extends StatelessWidget {
  const _VoterPhoto({required this.photo, required this.radius});
  final Map<String, dynamic> photo;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final url = (photo['photo'] ?? '').toString().trim();
    if (url.isNotEmpty && url.startsWith('http')) {
      return CircleAvatar(
        radius: radius,
        backgroundImage: NetworkImage(url),
        backgroundColor: const Color(0xffeff6ff),
      );
    }
    final name = (photo['name'] ?? 'V').toString().trim();
    return CircleAvatar(
      radius: radius,
      backgroundColor: const Color(0xffeff6ff),
      child: Text(name.isNotEmpty ? name[0] : 'V', style: TextStyle(color: const Color(0xff2563eb), fontWeight: FontWeight.bold, fontSize: radius * 0.8)),
    );
  }
}
