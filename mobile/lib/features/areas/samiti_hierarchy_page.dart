import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../voters/voter_management_page.dart';
import 'official_samiti_wards_data.dart';

class SamitiHierarchyPage extends StatefulWidget {
  const SamitiHierarchyPage({super.key});

  @override
  State<SamitiHierarchyPage> createState() => _SamitiHierarchyPageState();
}

class _SamitiHierarchyPageState extends State<SamitiHierarchyPage> {
  // Tab 1 (Gram Panchayat) state
  final gpSearchController = TextEditingController();
  String gpQuery = '';
  String? expandedPanchayat;
  final Map<String, Map<String, int>> _liveGpWardCounts = {};

  // Tab 2 (Samiti Ward) state
  final wardSearchController = TextEditingController();
  String wardQuery = '';
  String selectedSamitiForWards = 'रायपुर';
  String? expandedWardKey;

  Map<String, dynamic>? liveHierarchyData;

  @override
  void initState() {
    super.initState();
    _fetchLiveHierarchy();
  }

  @override
  void dispose() {
    gpSearchController.dispose();
    wardSearchController.dispose();
    super.dispose();
  }

  Future<void> _fetchLiveHierarchy() async {
    try {
      final res = await api.get('/api/auth/hierarchy-options');
      if (mounted) {
        setState(() => liveHierarchyData = res);
      }
    } catch (_) {}
  }

  Future<void> _fetchWardCountsForGp(String gpName) async {
    final cleanGp = gpName.trim();
    if (_liveGpWardCounts.containsKey(cleanGp)) return;
    _liveGpWardCounts[cleanGp] = {};
    try {
      final res = await api.getQuery('/api/members/field-values', {
        'field': 'wardNumber',
        'gramPanchayat': cleanGp,
        'limit': '100',
      });
      final items = res['items'] as List? ?? [];
      final Map<String, int> counts = {};
      for (final item in items) {
        if (item is Map) {
          final rawVal = '${item['value'] ?? item['label'] ?? ''}';
          final numVal = rawVal.replaceAll(RegExp(r'\D'), '').trim();
          final c = (item['count'] as num?)?.toInt() ?? 0;
          if (numVal.isNotEmpty && c > 0) {
            counts[numVal] = (counts[numVal] ?? 0) + c;
          }
        }
      }
      if (mounted && counts.isNotEmpty) {
        setState(() {
          _liveGpWardCounts[cleanGp] = counts;
        });
      }
    } catch (_) {}
  }

  Map<String, int> getGpWardCounts(String gpName) {
    final cleanGp = gpName.trim();
    if (_liveGpWardCounts.containsKey(cleanGp) && _liveGpWardCounts[cleanGp]!.isNotEmpty) {
      return _liveGpWardCounts[cleanGp]!;
    }
    final panchayats = liveHierarchyData?['panchayats'];
    if (panchayats is List) {
      for (final p in panchayats) {
        if (p is Map) {
          final pName = '${p['name']}'.trim();
          if (pName == cleanGp || cleanGp.contains(pName) || pName.contains(cleanGp)) {
            final rawCounts = p['wardCounts'];
            if (rawCounts is Map && rawCounts.isNotEmpty) {
              final Map<String, int> result = {};
              rawCounts.forEach((k, v) {
                result[k.toString()] = int.tryParse(v.toString()) ?? 0;
              });
              return result;
            }
          }
        }
      }
    }
    _fetchWardCountsForGp(cleanGp);
    return _liveGpWardCounts[cleanGp] ?? {};
  }

  List<Map<String, dynamic>> getGpParts(String gpName) {
    if (liveHierarchyData == null) return [];
    final cleanGp = gpName.trim();

    final panchayats = liveHierarchyData?['panchayats'];
    if (panchayats is List) {
      for (final p in panchayats) {
        if (p is Map) {
          final pName = '${p['name']}'.trim();
          if (pName == cleanGp || cleanGp.contains(pName) || pName.contains(cleanGp)) {
            final parts = p['parts'];
            if (parts is List && parts.isNotEmpty) {
              final list = parts.whereType<Map>().map((x) => Map<String, dynamic>.from(x)).toList();
              list.sort((a, b) {
                final aNum = int.tryParse('${a['partNumber']}') ?? 0;
                final bNum = int.tryParse('${b['partNumber']}') ?? 0;
                return aNum.compareTo(bNum);
              });
              return list;
            }
          }
        }
      }
    }

    final rawParts = liveHierarchyData?['parts'];
    if (rawParts is List) {
      final list = rawParts
          .whereType<Map>()
          .map((p) => Map<String, dynamic>.from(p))
          .where((p) => '${p['gramPanchayat']}'.trim() == cleanGp)
          .toList();

      if (list.isNotEmpty) {
        list.sort((a, b) {
          final aNum = int.tryParse('${a['partNumber']}') ?? 0;
          final bNum = int.tryParse('${b['partNumber']}') ?? 0;
          return aNum.compareTo(bNum);
        });
        return list;
      }
    }
    return [];
  }

  // OFFICIAL 29 GRAM PANCHAYATS OF RAIPUR (Pristine, canonical)
  static const raipurPanchayats = <String, Map<String, dynamic>>{
    'भींटा': {
      'wards': 11,
      'pop': 4872,
      'villages': [
        {'name': 'भींटा', 'pop': 1231},
        {'name': 'सेमलाट', 'pop': 57},
        {'name': 'रूपाखेड़ा', 'pop': 619},
        {'name': 'सरेवड़ी', 'pop': 1191},
        {'name': 'सरेवड़ी का बाड़ीया', 'pop': 0},
        {'name': 'जोरावरपुरा', 'pop': 315},
        {'name': 'भटेवर', 'pop': 1459}
      ]
    },
    'कलालखेड़ी': {
      'wards': 7,
      'pop': 2868,
      'villages': [
        {'name': 'थोरियाखेड़ा', 'pop': 711},
        {'name': 'कलालखेड़ी', 'pop': 918},
        {'name': 'खेड़ा कलाल खेडी', 'pop': 0},
        {'name': 'उबरावेल', 'pop': 0},
        {'name': 'बाड़ी', 'pop': 1239}
      ]
    },
    'पीथाकाखेड़ा': {
      'wards': 11,
      'pop': 4354,
      'villages': [
        {'name': 'पीथाकाखेड़ा', 'pop': 1140},
        {'name': 'मंडोल', 'pop': 619},
        {'name': 'ढिकाणी', 'pop': 148},
        {'name': 'रामा', 'pop': 1171},
        {'name': 'लड़की', 'pop': 1276}
      ]
    },
    'खेमाणा': {
      'wards': 9,
      'pop': 3354,
      'villages': [
        {'name': 'खेमाणा', 'pop': 2392},
        {'name': 'कांगण', 'pop': 962}
      ]
    },
    'गल्यावड़ी': {
      'wards': 7,
      'pop': 2557,
      'villages': [
        {'name': 'गल्यावड़ी', 'pop': 1421},
        {'name': 'भगवानपुरा', 'pop': 249},
        {'name': 'भीमसिंहजी का खेड़ा', 'pop': 887}
      ]
    },
    'खाखरमाला': {
      'wards': 9,
      'pop': 3491,
      'villages': [
        {'name': 'खाखरमाला', 'pop': 1779},
        {'name': 'गुढ़ा', 'pop': 532},
        {'name': 'खालसा की ढाणी', 'pop': 200},
        {'name': 'जागीर की ढाणी', 'pop': 980}
      ]
    },
    'चारोट': {
      'wards': 11,
      'pop': 4531,
      'villages': [
        {'name': 'चारोट', 'pop': 1888},
        {'name': 'सांठो का खेड़ा', 'pop': 251},
        {'name': 'सोनिया का खेड़ा', 'pop': 0},
        {'name': 'चांदा का खेड़ा', 'pop': 356},
        {'name': 'खजुरिया', 'pop': 884},
        {'name': 'राणावतों की धूणी', 'pop': 517},
        {'name': 'लाछी', 'pop': 635}
      ]
    },
    'मोखुन्दा': {
      'wards': 9,
      'pop': 3291,
      'villages': [
        {'name': 'मोखुन्दा', 'pop': 2826},
        {'name': 'रामपुरा', 'pop': 465}
      ]
    },
    'मासिंगपुरा': {
      'wards': 9,
      'pop': 3491,
      'villages': [
        {'name': 'मासिंगपुरा', 'pop': 1515},
        {'name': 'कुआं का बाड़िया', 'pop': 187},
        {'name': 'कास्यां', 'pop': 924},
        {'name': 'खेमली', 'pop': 865}
      ]
    },
    'गलवा': {
      'wards': 11,
      'pop': 4627,
      'villages': [
        {'name': 'गलवा', 'pop': 1999},
        {'name': 'खतावत का बाड़िया', 'pop': 193},
        {'name': 'बामनिया', 'pop': 1362},
        {'name': 'सादेड़ा', 'pop': 1073}
      ]
    },
    'झाड़ोल': {
      'wards': 11,
      'pop': 4897,
      'villages': [
        {'name': 'झाड़ोल', 'pop': 3409},
        {'name': 'सुवा का बाड़िया', 'pop': 461},
        {'name': 'अमरपुरा', 'pop': 328},
        {'name': 'उदयरामजी का गुढ़ा', 'pop': 699}
      ]
    },
    'थला': {
      'wards': 11,
      'pop': 4280,
      'villages': [
        {'name': 'थला', 'pop': 3217},
        {'name': 'रामदेवरा', 'pop': 267},
        {'name': 'किशनपुरा', 'pop': 796}
      ]
    },
    'सुरास': {
      'wards': 9,
      'pop': 3000,
      'villages': [
        {'name': 'सुरास', 'pop': 1179},
        {'name': 'लक्ष्मीपुरा', 'pop': 0},
        {'name': 'धुलखेड़ा', 'pop': 1387},
        {'name': 'भीलखेड़ी', 'pop': 205}
      ]
    },
    'बागोलिया': {
      'wards': 9,
      'pop': 3144,
      'villages': [
        {'name': 'बागोलिया', 'pop': 1444},
        {'name': 'अंजनगढ़', 'pop': 128},
        {'name': 'गाड़रीखेड़ा', 'pop': 852},
        {'name': 'पाटियाखेड़ा', 'pop': 720}
      ]
    },
    'पालरा': {
      'wards': 7,
      'pop': 2685,
      'villages': [
        {'name': 'पालरा', 'pop': 2346},
        {'name': 'खाननिया', 'pop': 339}
      ]
    },
    'बोराणा': {
      'wards': 11,
      'pop': 4616,
      'villages': [
        {'name': 'बोराणा', 'pop': 4616}
      ]
    },
    'आशाहोली': {
      'wards': 9,
      'pop': 3156,
      'villages': [
        {'name': 'आशाहोली', 'pop': 3156}
      ]
    },
    'बकाण': {
      'wards': 7,
      'pop': 2715,
      'villages': [
        {'name': 'लखाहोली', 'pop': 475},
        {'name': 'बकाण', 'pop': 808},
        {'name': 'राणास', 'pop': 1039},
        {'name': 'दियास', 'pop': 393}
      ]
    },
    'नान्दशा जागीर': {
      'wards': 11,
      'pop': 4264,
      'villages': [
        {'name': 'नान्दशा जागीर', 'pop': 2265},
        {'name': 'परबती', 'pop': 544},
        {'name': 'बाड़ियाकलां', 'pop': 590},
        {'name': 'बाड़ियाखुर्द', 'pop': 865}
      ]
    },
    'बोरियापुरा': {
      'wards': 7,
      'pop': 2491,
      'villages': [
        {'name': 'बोरियापुरा', 'pop': 1547},
        {'name': 'रेवाड़ा', 'pop': 629},
        {'name': 'शिवनाथपुरा', 'pop': 315},
        {'name': 'तोलास', 'pop': 0}
      ]
    },
    'सगरेव': {
      'wards': 9,
      'pop': 3601,
      'villages': [
        {'name': 'सगरेव', 'pop': 3087},
        {'name': 'नयाखेड़ा जाटान', 'pop': 0},
        {'name': 'जगपुरा', 'pop': 514}
      ]
    },
    'नारायणखेड़ा': {
      'wards': 9,
      'pop': 3049,
      'villages': [
        {'name': 'नारायणखेड़ा', 'pop': 828},
        {'name': 'सरंगु', 'pop': 202},
        {'name': 'खुटियां', 'pop': 949},
        {'name': 'आम्बाखेड़ा', 'pop': 369},
        {'name': 'तेज्याखेड़ी', 'pop': 376},
        {'name': 'खुटियांखेड़ा', 'pop': 325}
      ]
    },
    'देवरिया': {
      'wards': 7,
      'pop': 2902,
      'villages': [
        {'name': 'देवरिया', 'pop': 2902},
        {'name': 'मानपुरा', 'pop': 0}
      ]
    },
    'कोट': {
      'wards': 9,
      'pop': 3063,
      'villages': [
        {'name': 'कोट', 'pop': 2529},
        {'name': 'मोखमपुरा', 'pop': 534}
      ]
    },
    'बागड़': {
      'wards': 9,
      'pop': 3373,
      'villages': [
        {'name': 'बागड़', 'pop': 1730},
        {'name': 'दलेलपुरा', 'pop': 161},
        {'name': 'बंशी का बाड़िया', 'pop': 162},
        {'name': 'खेड़ा बागड़', 'pop': 729},
        {'name': 'नया बागड़', 'pop': 449},
        {'name': 'पहाड़पुरा', 'pop': 142}
      ]
    },
    'नाहरी': {
      'wards': 9,
      'pop': 3110,
      'villages': [
        {'name': 'नाहरी', 'pop': 2529},
        {'name': 'रूपाहेली', 'pop': 581}
      ]
    },
    'पनोतिया': {
      'wards': 9,
      'pop': 3047,
      'villages': [
        {'name': 'पनोतिया', 'pop': 1400},
        {'name': 'जीवा का खेड़ा', 'pop': 600},
        {'name': 'भीलखेड़ा', 'pop': 347},
        {'name': 'मोखमपुरा', 'pop': 700}
      ]
    },
    'नाथड़ियास': {
      'wards': 11,
      'pop': 4700,
      'villages': [
        {'name': 'नाथड़ियास', 'pop': 4700}
      ]
    },
    'रायपुर': {
      'wards': 13,
      'pop': 6727,
      'villages': [
        {'name': 'रायपुर', 'pop': 5500},
        {'name': 'कुवां का खेड़ा', 'pop': 1227}
      ]
    }
  };

  void _openVoters({
    String? village,
    String? gramPanchayat,
    String? tehsil,
    String? ward,
    String? partNumber,
    String? samitiWard,
    String? samiti,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => VoterManagementPage(
          initialVillage: village,
          initialGramPanchayat: gramPanchayat,
          initialWard: ward,
          initialPartNumber: partNumber,
          initialPanchayatSamitiWard: samitiWard,
          initialPanchayatSamiti: samiti,
          initialTehsil: (village != null || gramPanchayat != null || (partNumber != null && partNumber.isNotEmpty) || (samitiWard != null && samitiWard.isNotEmpty))
              ? null
              : tehsil,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xfff7f8fb),
        appBar: AppBar(
          title: const Text(
            'क्षेत्र व गाँव प्रबंधन',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
          ),
          bottom: const TabBar(
            labelColor: Color(0xff2563eb),
            unselectedLabelColor: muted,
            indicatorColor: Color(0xff2563eb),
            indicatorWeight: 3,
            labelStyle: TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5),
            unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
            tabs: [
              Tab(
                icon: Icon(Icons.location_city_rounded, size: 20),
                text: 'ग्राम पंचायत व गाँव (29 पंचायतें)',
              ),
              Tab(
                icon: Icon(Icons.account_balance_rounded, size: 20),
                text: 'पंचायत समिति वार्ड',
              ),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildGramPanchayatsTab(),
            _buildSamitiWardsTab(),
          ],
        ),
      ),
    );
  }

  // ============================================================================
  // TAB 1: GRAM PANCHAYAT VIEW (Only 29 Panchayats of Raipur)
  // ============================================================================
  Widget _buildGramPanchayatsTab() {
    final filteredPanchayats = <String, List<Map<String, dynamic>>>{};
    for (final entry in raipurPanchayats.entries) {
      final gpName = entry.key;
      final villages = List<Map<String, dynamic>>.from(entry.value['villages'] ?? []);

      if (gpQuery.isEmpty) {
        filteredPanchayats[gpName] = villages;
      } else {
        final q = gpQuery.toLowerCase().trim();
        final cleanQ = q.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '');
        final matchGp = gpName.toLowerCase().contains(q) ||
            gpName.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '').contains(cleanQ);

        final matchedVillages = villages.where((v) {
          final vName = (v['name'] ?? '').toString().toLowerCase();
          final cleanV = vName.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '');
          return vName.contains(q) || cleanV.contains(cleanQ);
        }).toList();

        if (matchGp || matchedVillages.isNotEmpty) {
          filteredPanchayats[gpName] = matchedVillages.isNotEmpty ? matchedVillages : villages;
        }
      }
    }

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Info banner for 29 GPs
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xffeff6ff),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xffbfdbfe)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline_rounded, color: Color(0xff2563eb), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'रायपुर की सभी 29 अधिकृत ग्राम पंचायतें एवं उनके सम्मिलित राजस्व गाँव।',
                          style: TextStyle(
                            color: Color(0xff1e40af),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Search field
                TextField(
                  controller: gpSearchController,
                  onChanged: (val) => setState(() => gpQuery = val),
                  decoration: InputDecoration(
                    hintText: 'ग्राम पंचायत या गाँव खोजें (जैसे: भींटा, चारोट)...',
                    prefixIcon: const Icon(Icons.search_rounded, color: muted),
                    suffixIcon: gpQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            onPressed: () {
                              gpSearchController.clear();
                              setState(() => gpQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: border),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Full Raipur Voter button
                InkWell(
                  onTap: () => _openVoters(tehsil: 'रायपुर'),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xff1e3a8a), Color(0xff2563eb)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xff2563eb).withValues(alpha: 0.25),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.groups_rounded, color: Colors.white, size: 22),
                        SizedBox(width: 10),
                        Text(
                          '👥 पूरी रायपुर (सभी 29 पंचायतें) के कुल मतदाता देखें',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            color: Colors.white,
                          ),
                        ),
                        Spacer(),
                        Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.white),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),

        if (filteredPanchayats.isEmpty)
          const SliverFillRemaining(
            child: Center(
              child: Text(
                'कोई पंचायत या गाँव नहीं मिला',
                style: TextStyle(color: muted, fontWeight: FontWeight.w700),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final gpName = filteredPanchayats.keys.elementAt(index);
                  final villages = filteredPanchayats[gpName]!;
                  final isExpanded = expandedPanchayat == gpName || gpQuery.isNotEmpty;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: border),
                    ),
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                      child: ExpansionTile(
                        key: Key('gp-$gpName'),
                        initiallyExpanded: isExpanded,
                        leading: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: const Color(0xff2563eb).withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            gpName.isNotEmpty ? gpName.substring(0, 1) : 'प',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              color: Color(0xff2563eb),
                              fontSize: 16,
                            ),
                          ),
                        ),
                        title: Text(
                          'ग्राम पंचायत: $gpName',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: navy,
                          ),
                        ),
                        subtitle: Builder(builder: (context) {
                          final gpInfo = raipurPanchayats[gpName] ?? {};
                          final wardCount = gpInfo['wards'] as int? ?? villages.length;
                          final popCount = gpInfo['pop'] as int? ?? 0;
                          final gpParts = getGpParts(gpName);
                          return Text(
                            '${villages.length} गाँव • $wardCount वार्ड ${gpParts.isNotEmpty ? '• ${gpParts.length} भाग' : ''} ${popCount > 0 ? '• $popCount जनसंख्या' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: muted),
                          );
                        }),
                        children: [
                          Container(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                            child: Builder(builder: (context) {
                              final gpInfo = raipurPanchayats[gpName] ?? {};
                              final wardCount = gpInfo['wards'] as int? ?? 0;
                              final gpParts = getGpParts(gpName);

                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Divider(color: border, height: 1),
                                  const SizedBox(height: 8),

                                  // Button: पूरी पंचायत के सभी मतदाता देखें
                                  InkWell(
                                    onTap: () => _openVoters(gramPanchayat: gpName),
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: softBlue,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: blue.withValues(alpha: 0.2)),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.people_alt_rounded, size: 18, color: blue),
                                          const SizedBox(width: 10),
                                          Text(
                                            'पूरी $gpName पंचायत के सभी मतदाता देखें',
                                            style: const TextStyle(
                                              color: blue,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const Spacer(),
                                          const Icon(Icons.arrow_forward_rounded, size: 16, color: blue),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 14),

                                  // Booth / Part chips
                                  if (gpParts.isNotEmpty) ...[
                                    Row(
                                      children: [
                                        const Icon(Icons.how_to_vote_rounded, size: 14, color: orange),
                                        const SizedBox(width: 6),
                                        Text(
                                          'भागवार / बूथ फ़िल्टर (${gpParts.length} भाग):',
                                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: orange),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    SingleChildScrollView(
                                      scrollDirection: Axis.horizontal,
                                      child: Row(
                                        children: gpParts.map((p) {
                                          final pNum = '${p['partNumber']}';
                                          final vCount = p['voterCount'] as int? ?? 0;
                                          return Padding(
                                            padding: const EdgeInsets.only(right: 6),
                                            child: ActionChip(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              visualDensity: VisualDensity.compact,
                                              label: Text(
                                                'भाग $pNum ${vCount > 0 ? "($vCount)" : ""}',
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: orange),
                                              ),
                                              backgroundColor: const Color(0xfffff7ed),
                                              side: const BorderSide(color: Color(0xffffedd5)),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                              onPressed: () => _openVoters(gramPanchayat: gpName, partNumber: pNum),
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                  ],

                                  // Ward chips
                                  if (wardCount > 0) ...[
                                    Row(
                                      children: [
                                        const Icon(Icons.grid_view_rounded, size: 14, color: muted),
                                        const SizedBox(width: 6),
                                        Text(
                                          'वार्डवार फ़िल्टर ($wardCount वार्ड):',
                                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: muted),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Builder(builder: (context) {
                                      final wardCounts = getGpWardCounts(gpName);
                                      return SingleChildScrollView(
                                        scrollDirection: Axis.horizontal,
                                        child: Row(
                                          children: List.generate(wardCount, (wIdx) {
                                            final wNum = '${wIdx + 1}';
                                            final count = wardCounts[wNum] ?? 0;
                                            return Padding(
                                              padding: const EdgeInsets.only(right: 6),
                                              child: ActionChip(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                visualDensity: VisualDensity.compact,
                                                label: Text(
                                                  count > 0 ? 'वार्ड $wNum ($count)' : 'वार्ड $wNum',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w800,
                                                    color: count > 0 ? const Color(0xff15803d) : navy,
                                                  ),
                                                ),
                                                backgroundColor: count > 0 ? const Color(0xfff0fdf4) : Colors.white,
                                                side: BorderSide(color: count > 0 ? const Color(0xffbbf7d0) : border),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                onPressed: () => _openVoters(gramPanchayat: gpName, ward: wNum),
                                              ),
                                            );
                                          }),
                                        ),
                                      );
                                    }),
                                    const SizedBox(height: 14),
                                  ],

                                  // Revenue Villages list
                                  Row(
                                    children: [
                                      const Icon(Icons.location_city_rounded, size: 14, color: navy),
                                      const SizedBox(width: 6),
                                      Text(
                                        'सम्मिलित राजस्व गाँव (${villages.length}):',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),

                                  ...villages.map((v) {
                                    final vName = v['name'] as String;
                                    final pop = v['pop'] as int? ?? 0;

                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: border.withValues(alpha: 0.8)),
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 34,
                                            height: 34,
                                            decoration: const BoxDecoration(
                                              color: Color(0xffeff6ff),
                                              shape: BoxShape.circle,
                                            ),
                                            alignment: Alignment.center,
                                            child: const Icon(Icons.location_on_rounded, color: blue, size: 18),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  vName,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w800,
                                                    fontSize: 14,
                                                    color: navy,
                                                  ),
                                                ),
                                                if (pop > 0)
                                                  Text(
                                                    'जनसंख्या: $pop',
                                                    style: const TextStyle(fontSize: 11, color: muted),
                                                  ),
                                              ],
                                            ),
                                          ),
                                          FilledButton.tonal(
                                            style: FilledButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              visualDensity: VisualDensity.compact,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                            ),
                                            onPressed: () => _openVoters(
                                              village: vName,
                                              gramPanchayat: gpName,
                                            ),
                                            child: const Text('मतदाता ➔', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                ],
                              );
                            }),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                childCount: filteredPanchayats.length,
              ),
            ),
          ),
      ],
    );
  }

  // ============================================================================
  // TAB 2: PANCHAYAT SAMITI WARD VIEW (Raipur 15, Sahada 19, Suwana 12)
  // ============================================================================
  Widget _buildSamitiWardsTab() {
    // 1. Get Samiti data from liveHierarchyData or fallback to officialSamitiWardsData
    final samitiWardsAll = (liveHierarchyData?['samitiWards'] as Map<String, dynamic>?) ?? officialSamitiWardsData;
    final currentSamitiData = (samitiWardsAll[selectedSamitiForWards] as Map<String, dynamic>?) ?? {};
    final wardsMap = (currentSamitiData['wards'] as Map<String, dynamic>?) ?? {};

    // Sort ward keys numerically
    final sortedWardKeys = wardsMap.keys.toList()
      ..sort((a, b) {
        final numA = int.tryParse(a.replaceAll(RegExp(r'\D'), '')) ?? 0;
        final numB = int.tryParse(b.replaceAll(RegExp(r'\D'), '')) ?? 0;
        return numA.compareTo(numB);
      });

    // 2. Filter by search query
    final filteredWardKeys = sortedWardKeys.where((wKey) {
      if (wardQuery.isEmpty) return true;
      final q = wardQuery.toLowerCase().trim();
      final cleanQ = q.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '');

      // Check ward key/number
      if (wKey.toLowerCase().contains(q) || wKey.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '').contains(cleanQ)) {
        return true;
      }

      final wData = wardsMap[wKey] as Map<String, dynamic>? ?? {};
      final panchayats = (wData['panchayats'] as Map<String, dynamic>?) ?? {};

      for (final gpEntry in panchayats.entries) {
        final gpName = gpEntry.key;
        if (gpName.toLowerCase().contains(q) || gpName.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '').contains(cleanQ)) {
          return true;
        }
        final villages = (gpEntry.value['villages'] as List? ?? []);
        for (final v in villages) {
          final vName = (v is Map ? v['name'] : v).toString();
          if (vName.toLowerCase().contains(q) || vName.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '').contains(cleanQ)) {
            return true;
          }
        }
      }
      return false;
    }).toList();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Samiti Selection Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _samitiChoiceChip('रायपुर (15 वार्ड)', 'रायपुर', const Color(0xff2563eb)),
                      const SizedBox(width: 8),
                      _samitiChoiceChip('सहाड़ा (19 वार्ड)', 'सहाड़ा', const Color(0xff059669)),
                      const SizedBox(width: 8),
                      _samitiChoiceChip('सुवाणा (12 वार्ड)', 'सुवाणा', const Color(0xffd97706)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Search field
                TextField(
                  controller: wardSearchController,
                  onChanged: (val) => setState(() => wardQuery = val),
                  decoration: InputDecoration(
                    hintText: 'वार्ड संख्या, पंचायत या गाँव खोजें (जैसे: वार्ड 1, भींटा)...',
                    prefixIcon: const Icon(Icons.search_rounded, color: muted),
                    suffixIcon: wardQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            onPressed: () {
                              wardSearchController.clear();
                              setState(() => wardQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: border),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Full Samiti Button
                InkWell(
                  onTap: () => _openVoters(
                    tehsil: selectedSamitiForWards,
                    samiti: selectedSamitiForWards,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: selectedSamitiForWards == 'रायपुर'
                            ? [const Color(0xff1e3a8a), const Color(0xff2563eb)]
                            : selectedSamitiForWards == 'सहाड़ा'
                                ? [const Color(0xff065f46), const Color(0xff059669)]
                                : [const Color(0xff92400e), const Color(0xffd97706)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x22000000),
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.groups_rounded, color: Colors.white, size: 22),
                        const SizedBox(width: 10),
                        Text(
                          '👥 पूरी $selectedSamitiForWards समिति के सभी मतदाता देखें',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            color: Colors.white,
                          ),
                        ),
                        const Spacer(),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.white),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),

        if (filteredWardKeys.isEmpty)
          const SliverFillRemaining(
            child: Center(
              child: Text(
                'कोई समिति वार्ड नहीं मिला',
                style: TextStyle(color: muted, fontWeight: FontWeight.w700),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final wardKey = filteredWardKeys[index];
                  final wardData = wardsMap[wardKey] as Map<String, dynamic>? ?? {};
                  final wardNum = '${wardData['wardNumber'] ?? wardKey.replaceAll(RegExp(r'\D'), '')}';
                  final panchayats = (wardData['panchayats'] as Map<String, dynamic>?) ?? {};

                  int totalVillagesInWard = 0;
                  for (final pVal in panchayats.values) {
                    totalVillagesInWard += (pVal['villages'] as List? ?? []).length;
                  }

                  final isExpanded = expandedWardKey == wardKey || wardQuery.isNotEmpty;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: border),
                    ),
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                      child: ExpansionTile(
                        key: Key('$selectedSamitiForWards-$wardKey'),
                        initiallyExpanded: isExpanded,
                        leading: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: _getSamitiThemeColor().withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'W$wardNum',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: _getSamitiThemeColor(),
                              fontSize: 15,
                            ),
                          ),
                        ),
                        title: Text(
                          '$selectedSamitiForWards · $wardKey',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15.5,
                            color: navy,
                          ),
                        ),
                        subtitle: Text(
                          '${panchayats.length} ग्राम पंचायतें • $totalVillagesInWard राजस्व गाँव',
                          style: const TextStyle(fontSize: 12, color: muted),
                        ),
                        children: [
                          Container(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Divider(color: border, height: 1),
                                const SizedBox(height: 8),

                                // Quick button: पुरे वार्ड के मतदाता
                                InkWell(
                                  onTap: () => _openVoters(
                                    samitiWard: wardKey,
                                    samiti: selectedSamitiForWards,
                                    tehsil: selectedSamitiForWards,
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _getSamitiThemeColor().withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: _getSamitiThemeColor().withValues(alpha: 0.25)),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(Icons.how_to_reg_rounded, size: 18, color: _getSamitiThemeColor()),
                                        const SizedBox(width: 10),
                                        Text(
                                          '👥 पूरे $wardKey के सभी मतदाता देखें',
                                          style: TextStyle(
                                            color: _getSamitiThemeColor(),
                                            fontSize: 13,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        const Spacer(),
                                        Icon(Icons.arrow_forward_rounded, size: 16, color: _getSamitiThemeColor()),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),

                                // List of Panchayats and Villages inside this ward
                                const Text(
                                  'सम्मिलित ग्राम पंचायतें व गाँव:',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy),
                                ),
                                const SizedBox(height: 6),

                                ...panchayats.entries.map((gpEntry) {
                                  final gpName = gpEntry.key;
                                  final gpVal = gpEntry.value as Map<String, dynamic>? ?? {};
                                  final villages = (gpVal['villages'] as List? ?? []);
                                  final gpPop = gpVal['population'] as int? ?? 0;
                                  final gpTotalWards = gpVal['totalWards'] as int? ?? 0;

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xfff8fafc),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: border),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            const Icon(Icons.account_balance_rounded, size: 16, color: Color(0xff2563eb)),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                'पंचायत: $gpName ${gpTotalWards > 0 ? "($gpTotalWards वार्ड)" : ""} ${gpPop > 0 ? "• जन: $gpPop" : ""}',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 13,
                                                  color: navy,
                                                ),
                                              ),
                                            ),
                                            TextButton(
                                              style: TextButton.styleFrom(
                                                visualDensity: VisualDensity.compact,
                                                padding: const EdgeInsets.symmetric(horizontal: 8),
                                              ),
                                              onPressed: () => _openVoters(
                                                gramPanchayat: gpName,
                                                samitiWard: wardKey,
                                                samiti: selectedSamitiForWards,
                                              ),
                                              child: const Text('मतदाता ➔', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                                            ),
                                          ],
                                        ),
                                        if (villages.isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Wrap(
                                            spacing: 6,
                                            runSpacing: 4,
                                            children: villages.map((v) {
                                              final vName = (v is Map ? v['name'] : v).toString();
                                              final vPop = v is Map ? (v['population'] as int? ?? 0) : 0;
                                              return InkWell(
                                                onTap: () => _openVoters(
                                                  village: vName,
                                                  gramPanchayat: gpName,
                                                  samitiWard: wardKey,
                                                  samiti: selectedSamitiForWards,
                                                ),
                                                borderRadius: BorderRadius.circular(8),
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: Colors.white,
                                                    borderRadius: BorderRadius.circular(8),
                                                    border: Border.all(color: border),
                                                  ),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      const Icon(Icons.location_on_rounded, size: 12, color: orange),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        vPop > 0 ? '$vName ($vPop)' : vName,
                                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: navy),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              );
                                            }).toList(),
                                          ),
                                        ],
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                childCount: filteredWardKeys.length,
              ),
            ),
          ),
      ],
    );
  }

  Widget _samitiChoiceChip(String label, String samitiKey, Color themeColor) {
    final isSelected = selectedSamitiForWards == samitiKey;
    return ChoiceChip(
      avatar: Icon(
        Icons.account_balance_rounded,
        size: 16,
        color: isSelected ? Colors.white : themeColor,
      ),
      label: Text(label),
      selected: isSelected,
      selectedColor: themeColor,
      backgroundColor: Colors.white,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : navy,
        fontWeight: FontWeight.w800,
        fontSize: 12.5,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: isSelected ? themeColor : border),
      ),
      onSelected: (_) {
        setState(() {
          selectedSamitiForWards = samitiKey;
          expandedWardKey = null;
        });
      },
    );
  }

  Color _getSamitiThemeColor() {
    switch (selectedSamitiForWards) {
      case 'सहाड़ा':
        return const Color(0xff059669);
      case 'सुवाणा':
        return const Color(0xffd97706);
      default:
        return const Color(0xff2563eb);
    }
  }
}
