import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../voters/voter_management_page.dart';

class SamitiHierarchyPage extends StatefulWidget {
  const SamitiHierarchyPage({super.key});

  @override
  State<SamitiHierarchyPage> createState() => _SamitiHierarchyPageState();
}

class _SamitiHierarchyPageState extends State<SamitiHierarchyPage> {
  // Navigation stack: 0 = Assembly, 1 = Samiti, 2 = List Type (Raipur), 3 = Panchayats (29 GP) or Parts (1-103), 4 = Wards of GP
  int _navLevel = 0;
  String _selectedAssembly = 'गंगापुर';
  String _selectedSamiti = 'रायपुर';
  String _selectedListType = 'panchayat'; // 'panchayat' or 'assembly_parts'
  Map<String, dynamic>? _selectedGp;
  
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  // Live data
  Map<String, dynamic>? _liveHierarchyData;
  List<Map<String, dynamic>> _raipurParts = [];
  bool _loadingParts = false;

  @override
  void initState() {
    super.initState();
    _fetchLiveHierarchy();
    _fetchRaipurParts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchLiveHierarchy() async {
    try {
      final res = await api.get('/api/auth/hierarchy-options');
      if (mounted) setState(() => _liveHierarchyData = res);
    } catch (_) {}
  }

  Future<void> _fetchRaipurParts() async {
    setState(() => _loadingParts = true);
    try {
      final dynamic res = await api.get('/api/members/field-values?field=partNumber&limit=150');
      if (res is Map && res['items'] is List) {
        final list = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) {
              final n = int.tryParse('${e['value']}') ?? 0;
              return n >= 1 && n <= 103;
            })
            .toList();
        list.sort((a, b) => (int.tryParse('${a['value']}') ?? 0).compareTo(int.tryParse('${b['value']}') ?? 0));
        if (mounted) setState(() => _raipurParts = list);
      }
    } catch (_) {}
    if (mounted) setState(() => _loadingParts = false);
  }

  // 29 Gram Panchayats Data for Raipur
  static const List<Map<String, dynamic>> _raipurPanchayats = [
    {
      'name': 'रायपुर कस्बा / नगर',
      'gp': 'रायपुर',
      'wards': 11,
      'parts': '62, 63, 64, 65, 66, 67, 68',
      'villages': ['रायपुर', 'चीतरपुरा'],
      'icon': Icons.location_city_rounded,
    },
    {
      'name': 'भींटा',
      'gp': 'भींटा',
      'wards': 11,
      'parts': '1, 2, 3, 4, 5, 6, 7',
      'villages': ['भींटा', 'सेमलाट', 'रूपाखेड़ा', 'सरेवड़ी', 'जोरावरपुरा', 'भटेवर'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'कोट',
      'gp': 'कोट',
      'wards': 9,
      'parts': '12, 14, 15, 16, 17, 18',
      'villages': ['कोट', 'टूगंच', 'ठिकरीया', 'खाखरमाला', 'बागड़'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'मोखुन्दा',
      'gp': 'मोखुन्दा',
      'wards': 9,
      'parts': '20, 21, 22, 23',
      'villages': ['मोखुन्दा', 'मार्सिंगपुरा', 'माण्ड का खेड़ा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'झडौल',
      'gp': 'झडौल',
      'wards': 9,
      'parts': '25, 26, 27, 29',
      'villages': ['झडौल', 'सिंहपुरा', 'खेडिया'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'देवरिया',
      'gp': 'देवरिया',
      'wards': 7,
      'parts': '30, 31, 32',
      'villages': ['देवरिया', 'देवरीया'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'चावण्ड खेड़ा',
      'gp': 'चावण्ड खेड़ा',
      'wards': 7,
      'parts': '33, 34, 35, 36',
      'villages': ['चावण्ड खेड़ा', 'गलवा', 'चारोट', 'गोविन्द पुरा', 'टोकरा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'खेमाणा',
      'gp': 'खेमाणा',
      'wards': 9,
      'parts': '37, 38, 39, 40',
      'villages': ['खेमाणा', 'पालरा', 'पचातरा खेडा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'बोराणा',
      'gp': 'बोराणा',
      'wards': 11,
      'parts': '41, 42, 43, 44, 45, 46',
      'villages': ['बोराणा', 'धूलखेड़ा', 'लापिया'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'नान्दशा जागीर',
      'gp': 'नान्दशा जागीर',
      'wards': 9,
      'parts': '47, 48, 49, 50',
      'villages': ['नान्दशा जागीर', 'दांथल', 'गुर्जरों की झोपड़ियां'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'कोशीथल',
      'gp': 'कोशीथल',
      'wards': 11,
      'parts': '51, 52, 53, 54, 55, 56',
      'villages': ['कोशीथल', 'झूंपड़िया', 'जसवंतपुरा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'सगरेव',
      'gp': 'सगरेव',
      'wards': 9,
      'parts': '57, 58, 59, 60, 61',
      'villages': ['सगरेव', 'सुरास', 'खेड़ा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'नान्दशा',
      'gp': 'नान्दशा',
      'wards': 11,
      'parts': '69, 70, 71, 72, 73',
      'villages': ['नान्दशा', 'गल्यावड़ी', 'केमुनिया'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'पावती',
      'gp': 'पावती',
      'wards': 7,
      'parts': '74, 75, 76',
      'villages': ['पावती', 'परबती', 'लड़की'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'थला',
      'gp': 'थला',
      'wards': 9,
      'parts': '77, 78, 79, 80',
      'villages': ['थला', 'बागोलिया', 'गाडरी खेड़ा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'नाथड़ियास',
      'gp': 'नाथड़ियास',
      'wards': 9,
      'parts': '81, 82, 83, 84',
      'villages': ['नाथड़ियास', 'खेड़ी'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'कान्याखेड़ी',
      'gp': 'कान्याखेड़ी',
      'wards': 7,
      'parts': '85, 86',
      'villages': ['कान्याखेड़ी', 'रामपुरा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'बकाण',
      'gp': 'बकाण',
      'wards': 9,
      'parts': '87, 88, 89, 90',
      'villages': ['बकाण', 'बाड़िया खुर्द', 'बाड़िया कलां'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'आशाहोली',
      'gp': 'आशाहोली',
      'wards': 11,
      'parts': '91, 92, 93, 94, 95',
      'villages': ['आशाहोली', 'लखाहोली', 'राणास', 'तोलास'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'बोरियापुरा',
      'gp': 'बोरियापुरा',
      'wards': 11,
      'parts': '96, 97, 98, 99, 100',
      'villages': ['बोरियापुरा', 'रेवाड़ा', 'अडसीपुरा'],
      'icon': Icons.holiday_village_rounded,
    },
    {
      'name': 'आमली',
      'gp': 'आमली',
      'wards': 9,
      'parts': '101, 102, 103',
      'villages': ['आमली', 'मोतीखेडा', 'बड़ा खेड़ा', 'छोटा खेड़ा'],
      'icon': Icons.holiday_village_rounded,
    },
  ];

  void _onBackPressed() {
    setState(() {
      if (_navLevel > 0) {
        _navLevel--;
        _searchController.clear();
        _searchQuery = '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _navLevel == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _navLevel > 0) {
          _onBackPressed();
        }
      },
      child: Scaffold(
        backgroundColor: bg,
        appBar: AppBar(
          title: Text(_appBarTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: blue,
          foregroundColor: Colors.white,
          elevation: 0,
          leading: _navLevel > 0
              ? IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: _onBackPressed,
                )
              : null,
        ),
        body: _buildCurrentLevel(),
      ),
    );
  }

  String get _appBarTitle {
    switch (_navLevel) {
      case 0:
        return 'क्षेत्र व विधानसभा';
      case 1:
        return '$_selectedAssembly - पंचायत समितियाँ';
      case 2:
        return '$_selectedSamiti समिति - सूची चयन';
      case 3:
        return _selectedListType == 'panchayat'
            ? 'रायपुर - 29 ग्राम पंचायतें व गाँव'
            : 'रायपुर - 103 विधानसभा भाग / बूथ';
      case 4:
        return '${_selectedGp?['name']} - वार्ड व गाँव';
      default:
        return 'क्षेत्र व गाँव';
    }
  }

  Widget _buildCurrentLevel() {
    switch (_navLevel) {
      case 0:
        return _buildLevel0Assembly();
      case 1:
        return _buildLevel1Samitis();
      case 2:
        return _buildLevel2ListType();
      case 3:
        return _selectedListType == 'panchayat'
            ? _buildLevel3Panchayats()
            : _buildLevel3AssemblyParts();
      case 4:
        return _buildLevel4GpWards();
      default:
        return const SizedBox.shrink();
    }
  }

  // LEVEL 0: Assembly Selection
  Widget _buildLevel0Assembly() {
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        _infoBanner('विधानसभा क्षेत्र का चयन करें:', 'अपने क्षेत्र की पंचायत समितियों एवं मतदान केंद्रों की सूची देखने के लिए नीचे चुनें।'),
        const SizedBox(height: 12),
        _buildNavCard(
          title: 'गंगापुर / सहाड़ा विधानसभा (179)',
          subtitle: 'कुल 301 मतदान केंद्र | 3 पंचायत समितियाँ | 2,44,000+ मतदाता',
          icon: Icons.account_balance_rounded,
          color: blue,
          badge: 'मुख्य विधानसभा',
          onTap: () {
            setState(() {
              _selectedAssembly = 'गंगापुर';
              _navLevel = 1;
            });
          },
        ),
        const SizedBox(height: 10),
        _buildNavCard(
          title: 'हमीरगढ़ (सहाड़ा क्षेत्र)',
          subtitle: 'हमीरगढ़ तहसील व नगरपालिका क्षेत्र',
          icon: Icons.location_city_rounded,
          color: orange,
          badge: 'सहाड़ा क्षेत्र',
          onTap: () {
            setState(() {
              _selectedAssembly = 'हमीरगढ़';
              _navLevel = 1;
            });
          },
        ),
      ],
    );
  }

  // LEVEL 1: Samitis of Assembly
  Widget _buildLevel1Samitis() {
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        _infoBanner('$_selectedAssembly की पंचायत समितियाँ:', 'कृपया अपनी पंचायत समिति का चयन करें:'),
        const SizedBox(height: 12),
        _buildNavCard(
          title: '🏛️ रायपुर पंचायत समिति',
          subtitle: '29 ग्राम पंचायतें | 103 भाग/बूथ | 105+ राजस्व गाँव | 74,000+ मतदाता',
          icon: Icons.account_balance_rounded,
          color: blue,
          badge: '29 ग्राम पंचायतें (103 भाग)',
          onTap: () {
            setState(() {
              _selectedSamiti = 'रायपुर';
              _navLevel = 2;
            });
          },
        ),
        const SizedBox(height: 10),
        _buildNavCard(
          title: '🏛️ सहाड़ा पंचायत समिति',
          subtitle: 'पोटलां, सहाड़ा, कारोई, लाखोला, आदि क्षेत्र',
          icon: Icons.holiday_village_rounded,
          color: green,
          badge: 'सहाड़ा क्षेत्र',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const VoterManagementPage(initialTehsil: 'सहाड़ा'),
              ),
            );
          },
        ),
        const SizedBox(height: 10),
        _buildNavCard(
          title: '🏛️ सुवाणा पंचायत समिति',
          subtitle: 'सुवाणा एवं हमीरगढ़ सीमावर्ती क्षेत्र',
          icon: Icons.nature_people_rounded,
          color: purple,
          badge: 'सुवाणा क्षेत्र',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const VoterManagementPage(initialTehsil: 'सुवाणा'),
              ),
            );
          },
        ),
      ],
    );
  }

  // LEVEL 2: List Type Selection (29 Panchayats vs 103 Parts)
  Widget _buildLevel2ListType() {
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        _infoBanner('रायपुर समिति - मतदाता सूची का प्रकार चुनें:', 'आप ग्राम पंचायत व वार्ड अनुसार देखना चाहते हैं या विधानसभा के 1 से 103 भाग अनुसार:'),
        const SizedBox(height: 14),
        _buildNavCard(
          title: '🏘️ 29 ग्राम पंचायतें व वार्ड सूची (पंचायत/गाँव)',
          subtitle: 'भींटा, कोट, मोखुन्दा, रायपुर, नान्दशा आदि 29 पंचायतें, उनके राजस्व गाँव एवं 1 से 11 वार्ड्स की सूची',
          icon: Icons.holiday_village_rounded,
          color: blue,
          badge: '29 पंचायतें (वार्ड वार)',
          onTap: () {
            setState(() {
              _selectedListType = 'panchayat';
              _navLevel = 3;
            });
          },
        ),
        const SizedBox(height: 12),
        _buildNavCard(
          title: '🗳️ 1 से 103 विधानसभा भाग / बूथ सूची',
          subtitle: 'विधानसभा के भाग 1 से भाग 103 तक के सभी मतदान केंद्र एवं उनके मतदाताओं की सूची',
          icon: Icons.how_to_vote_rounded,
          color: green,
          badge: '103 भाग (बूथ वार)',
          onTap: () {
            setState(() {
              _selectedListType = 'assembly_parts';
              _navLevel = 3;
            });
          },
        ),
      ],
    );
  }

  // LEVEL 3A: 29 Gram Panchayats Grid/List
  Widget _buildLevel3Panchayats() {
    final filtered = _raipurPanchayats.where((gp) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final name = (gp['name'] ?? '').toString().toLowerCase();
      final villages = (gp['villages'] as List? ?? []).join(' ').toLowerCase();
      final parts = (gp['parts'] ?? '').toString().toLowerCase();
      return name.contains(q) || villages.contains(q) || parts.contains(q);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _searchController,
            onChanged: (v) => setState(() => _searchQuery = v.trim()),
            decoration: InputDecoration(
              hintText: 'ग्राम पंचायत या गाँव का नाम खोजें...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Colors.white,
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
            itemCount: filtered.length,
            itemBuilder: (ctx, idx) {
              final gp = filtered[idx];
              final name = gp['name'];
              final wards = gp['wards'] ?? 9;
              final parts = gp['parts'] ?? '';
              final villages = (gp['villages'] as List? ?? []).join(', ');

              return Card(
                elevation: 1,
                margin: const EdgeInsets.symmetric(vertical: 5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  leading: CircleAvatar(
                    backgroundColor: blue.withValues(alpha: 0.1),
                    child: Icon(gp['icon'] as IconData? ?? Icons.holiday_village_rounded, color: blue),
                  ),
                  title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 3),
                      Text('गाँव: $villages', style: const TextStyle(fontSize: 12, color: muted)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('$wards वार्ड', style: const TextStyle(fontSize: 10, color: blue, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('भाग: $parts', style: const TextStyle(fontSize: 10, color: green, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: muted),
                  onTap: () {
                    setState(() {
                      _selectedGp = gp;
                      _navLevel = 4;
                    });
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // LEVEL 3B: 103 Assembly Parts List
  Widget _buildLevel3AssemblyParts() {
    final filtered = _raipurParts.where((p) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final partNum = '${p['value']}'.toLowerCase();
      final label = '${p['label']}'.toLowerCase();
      return partNum.contains(q) || label.contains(q);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _searchController,
            onChanged: (v) => setState(() => _searchQuery = v.trim()),
            decoration: InputDecoration(
              hintText: 'भाग संख्या (उदा. 62) या गाँव खोजें...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Colors.white,
            ),
          ),
        ),
        Expanded(
          child: _loadingParts
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
                  itemCount: filtered.length,
                  itemBuilder: (ctx, idx) {
                    final p = filtered[idx];
                    final partNum = '${p['value']}';
                    final label = '${p['label'] ?? p['value']}';
                    final count = p['count'] ?? 0;

                    return Card(
                      elevation: 1,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: green.withValues(alpha: 0.1),
                          child: Text(partNum, style: const TextStyle(fontWeight: FontWeight.bold, color: green)),
                        ),
                        title: Text('भाग संख्या $partNum', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text(label, style: const TextStyle(fontSize: 12, color: muted)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('$count मतदाता', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: blue)),
                            const SizedBox(width: 6),
                            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: muted),
                          ],
                        ),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => VoterManagementPage(
                                initialPartNumber: partNum,
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // LEVEL 4: Wards & Villages of selected Gram Panchayat
  Widget _buildLevel4GpWards() {
    final gp = _selectedGp!;
    final name = gp['name'];
    final wardCount = gp['wards'] as int? ?? 9;
    final parts = gp['parts'] ?? '';
    final villages = List<String>.from(gp['villages'] as List? ?? []);

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // GP Header Card
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color: Colors.blue.shade50,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.holiday_village_rounded, color: blue, size: 26),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('ग्राम पंचायत: $name', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: navy)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text('शामिल गाँव: ${villages.join(', ')}', style: const TextStyle(fontSize: 13, color: muted)),
                const SizedBox(height: 4),
                Text('संबंधित भाग संख्या: $parts', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: green)),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => VoterManagementPage(
                            initialGramPanchayat: gp['gp'] ?? name,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.groups_rounded),
                    label: Text('पूरी पंचायत ($name) की सूची देखें'),
                    style: FilledButton.styleFrom(
                      backgroundColor: blue,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        const Text('वार्ड अनुसार मतदाता सूची:', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: navy)),
        const SizedBox(height: 8),
        // Wards List
        ...List.generate(wardCount, (index) {
          final wardNo = index + 1;
          return Card(
            elevation: 1,
            margin: const EdgeInsets.symmetric(vertical: 4),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: blue.withValues(alpha: 0.1),
                child: Text('$wardNo', style: const TextStyle(fontWeight: FontWeight.bold, color: blue)),
              ),
              title: Text('वार्ड संख्या 0$wardNo', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('संबंधित भाग: $parts | गाँव: ${villages.first}', style: const TextStyle(fontSize: 11, color: muted)),
              trailing: FilledButton.tonal(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => VoterManagementPage(
                        initialGramPanchayat: gp['gp'] ?? name,
                        initialWard: '$wardNo',
                      ),
                    ),
                  );
                },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  visualDensity: VisualDensity.compact,
                ),
                child: const Text('मतदाता देखें', style: TextStyle(fontSize: 11)),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _infoBanner(String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: navy)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: muted)),
        ],
      ),
    );
  }

  Widget _buildNavCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String badge,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: color.withValues(alpha: 0.12),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(badge, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
                    ),
                    const SizedBox(height: 4),
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 12, color: muted)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 18, color: muted),
            ],
          ),
        ),
      ),
    );
  }
}
