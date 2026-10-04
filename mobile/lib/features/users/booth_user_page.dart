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
          hierarchyData = hierarchyRes is Map<String, dynamic> ? hierarchyRes : {};
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
                child: Row(children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: const Color(0xffecfdf5), borderRadius: BorderRadius.circular(10)),
                    child: Text('वार्ड $wardNum', style: const TextStyle(color: Color(0xff059669), fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('$curGpName (वार्ड $wardNum)', style: const TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 14)),
                      if (wardManagers.isNotEmpty)
                        Text('${wardManagers.map((m) => m['name']).join(', ')} (${wardManagers.first['phone'] ?? wardManagers.first['email']})',
                            style: const TextStyle(color: Color(0xff059669), fontSize: 11, fontWeight: FontWeight.w600))
                      else
                        const Text('प्रभारी नियुक्त नहीं', style: TextStyle(color: muted, fontSize: 11)),
                    ]),
                  ),
                  IconButton(
                    tooltip: 'वार्ड प्रभारी नियुक्त करें',
                    onPressed: () => _openAddEditDialog(initialPanchayat: curGpName, initialWard: wardNum, initialScope: 'ward'),
                    icon: const Icon(Icons.person_add_alt_1_rounded, color: Color(0xff059669), size: 20),
                  ),
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
          child: Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(color: const Color(0xffeff6ff), borderRadius: BorderRadius.circular(10)),
              child: Text('भाग #$partNum', style: const TextStyle(color: Color(0xff2563eb), fontWeight: FontWeight.bold, fontSize: 13)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('बूथ / भाग संख्या $partNum', style: const TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 14)),
                if (partManagers.isNotEmpty)
                  Text('प्रभारी: ${partManagers.map((m) => m['name']).join(', ')}', style: const TextStyle(color: Color(0xff2563eb), fontSize: 11, fontWeight: FontWeight.w600))
                else
                  const Text('बूथ प्रभारी नियुक्त नहीं', style: TextStyle(color: muted, fontSize: 11)),
              ]),
            ),
            IconButton(
              tooltip: 'बूथ प्रभारी नियुक्त करें',
              onPressed: () => _openAddEditDialog(initialPart: partNum, initialScope: 'booth'),
              icon: const Icon(Icons.person_add_alt_1_rounded, color: Color(0xff2563eb), size: 20),
            ),
          ]),
        );
      },
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
  });

  final Map<String, dynamic> user;
  final VoidCallback onEdit;
  final ValueChanged<bool> onToggleActive;
  final VoidCallback onDelete;

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
      roleTitle = 'बूथ मैनेजर';
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
  const _MiniUserRow({required this.user, required this.onEdit, required this.onDelete});
  final Map<String, dynamic> user;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

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
    this.initialPanchayat,
    this.initialWard,
    this.initialPart,
    this.initialScope,
    required this.onSaved,
  });

  final Map<String, dynamic>? user;
  final List<Map<String, dynamic>> panchayats;
  final List<String> parts;
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

  String selectedScope = 'panchayat'; // 'panchayat', 'ward', 'booth', 'all'
  String? selectedGp;
  String? selectedWard;
  String? selectedPart;
  String selectedRole = 'booth'; // 'admin', 'ward_head', 'booth', 'worker', 'user'
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

      if (wards.isNotEmpty) {
        selectedScope = 'ward';
        selectedGp = gps.isNotEmpty ? gps.first : null;
        selectedWard = wards.first;
      } else if (gps.isNotEmpty) {
        selectedScope = 'panchayat';
        selectedGp = gps.first;
      } else if (pParts.isNotEmpty) {
        selectedScope = 'booth';
        selectedPart = pParts.first;
      } else {
        selectedScope = 'all';
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
      selectedScope = widget.initialScope ?? 'panchayat';
      selectedGp = widget.initialPanchayat ?? (widget.panchayats.isNotEmpty ? '${widget.panchayats.first['name']}' : null);
      selectedWard = widget.initialWard;
      selectedPart = widget.initialPart;
      if (selectedScope == 'ward') selectedRole = 'ward_head';
      if (selectedScope == 'panchayat') selectedRole = 'booth';
      if (selectedScope == 'booth') selectedRole = 'booth';
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
      final queryParams = <String, String>{
        'limit': '15',
      };
      if (selectedGp != null && selectedGp!.isNotEmpty) {
        queryParams['gramPanchayat'] = selectedGp!;
      }
      if (selectedScope == 'ward' && selectedWard != null && selectedWard!.isNotEmpty) {
        queryParams['wardNumber'] = selectedWard!;
      }
      if (selectedScope == 'booth' && selectedPart != null && selectedPart!.isNotEmpty) {
        queryParams['partNumber'] = selectedPart!;
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
      final epic = '${v['voterId'] ?? ''}'.trim().toLowerCase().replaceAll('/', '_');
      if (emailController.text.isEmpty && epic.isNotEmpty) {
        emailController.text = '$epic@crm.com';
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

    setState(() => saving = true);

    final payload = <String, dynamic>{
      'name': name,
      'email': email,
      'phone': phone,
      'role': selectedRole,
      'assignedGramPanchayats': selectedGp != null && selectedScope != 'all' && selectedScope != 'booth' ? [selectedGp!] : [],
      'assignedWards': selectedScope == 'ward' && selectedWard != null ? [selectedWard!] : [],
      'assignedParts': selectedScope == 'booth' && selectedPart != null ? [selectedPart!] : [],
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.user != null ? 'प्रभारी अपडेट हो गया।' : 'नया प्रभारी सफलतापूर्वक बनाया गया।')),
        );
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
          child: Text(widget.user != null ? 'प्रभारी संपादित करें' : 'नया प्रभारी नियुक्त करें',
              style: const TextStyle(color: navy, fontSize: 18, fontWeight: FontWeight.bold)),
        ),
      ]),
      content: SizedBox(
        width: 600,
        height: 580,
        child: SingleChildScrollView(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 10),
            // STEP 1: SCOPE SELECTOR
            const Text('१. कार्यक्षेत्र का स्तर चुनें (Scope Level):', style: TextStyle(color: navy, fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            Row(children: [
              _scopeChip('panchayat', '🏛️ पंचायत स्तर', Icons.location_city),
              const SizedBox(width: 8),
              _scopeChip('ward', '🏘️ वार्ड स्तर', Icons.maps_home_work),
              const SizedBox(width: 8),
              _scopeChip('booth', '🗳️ भाग/बूथ स्तर', Icons.how_to_vote),
            ]),
            const SizedBox(height: 12),

            // Dropdowns based on scope
            if (selectedScope == 'panchayat' || selectedScope == 'ward') ...[
              const Text('ग्राम पंचायत:', style: TextStyle(color: muted, fontSize: 12)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(color: const Color(0xfff8fafc), borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: selectedGp,
                    hint: const Text('पंचायत चुनें...'),
                    onChanged: (val) {
                      setState(() {
                        selectedGp = val;
                        selectedWard = null;
                      });
                      _searchVoters();
                    },
                    items: widget.panchayats.map((p) => DropdownMenuItem(value: '${p['name']}', child: Text('पंचायत: ${p['name']} (${p['totalVoters']} वोटर्स)'))).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],

            if (selectedScope == 'ward') ...[
              const Text('वार्ड नंबर:', style: TextStyle(color: muted, fontSize: 12)),
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
                    items: wards.map((w) => DropdownMenuItem(value: w, child: Text('वार्ड नंबर $w'))).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],

            if (selectedScope == 'booth') ...[
              const Text('भाग / बूथ संख्या:', style: TextStyle(color: muted, fontSize: 12)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(color: const Color(0xfff8fafc), borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: selectedPart,
                    hint: const Text('भाग संख्या चुनें...'),
                    onChanged: (val) {
                      setState(() => selectedPart = val);
                      _searchVoters();
                    },
                    items: widget.parts.map((p) => DropdownMenuItem(value: p, child: Text('भाग संख्या $p'))).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 10),
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
                  decoration: const InputDecoration(labelText: 'मोबाइल नंबर', prefixIcon: Icon(Icons.phone)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: widget.user != null ? 'नया पासवर्ड (ऐच्छिक)' : 'पासवर्ड (कम से कम 6 अक्षर) *',
                    prefixIcon: const Icon(Icons.lock),
                  ),
                ),
              ),
            ]),
            const SizedBox(height: 10),
            TextField(
              controller: emailController,
              decoration: const InputDecoration(labelText: 'लॉगिन ईमेल / यूजरनेम', prefixIcon: Icon(Icons.email)),
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
                    DropdownMenuItem(value: 'booth', child: Text('बूथ मैनेजर (Booth Manager)')),
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

  Widget _scopeChip(String type, String label, IconData icon) {
    final isSel = selectedScope == type;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            selectedScope = type;
            if (type == 'ward') selectedRole = 'ward_head';
            if (type == 'booth') selectedRole = 'booth';
            if (type == 'panchayat') selectedRole = 'booth';
          });
          _searchVoters();
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
          decoration: BoxDecoration(
            color: isSel ? const Color(0xff2563eb) : const Color(0xfff1f5f9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSel ? const Color(0xff2563eb) : border),
          ),
          child: Column(children: [
            Icon(icon, size: 18, color: isSel ? Colors.white : navy),
            const SizedBox(height: 4),
            Text(label, textAlign: TextAlign.center, style: TextStyle(color: isSel ? Colors.white : navy, fontSize: 10, fontWeight: FontWeight.bold)),
          ]),
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
