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

  // OFFICIAL 29 GRAM PANCHAYATS OF RAIPUR (100% Verified from VIDHANSHABHA 2028.xlsx)
  static const raipurPanchayats = <String, Map<String, dynamic>>{
    'आशाहोली': {
      'wards': 9,
      'pop': 3156,
      'villages': [
        {'name': 'आशाहोली', 'pop': 3156},
      ],
    },
    'कलालखेड़ी': {
      'wards': 7,
      'pop': 2868,
      'villages': [
        {'name': 'थोरियाखेड़ी', 'pop': 711},
        {'name': 'कलालखेड़ी', 'pop': 918},
        {'name': 'बाड़ी', 'pop': 1239},
      ],
    },
    'कोट': {
      'wards': 9,
      'pop': 3063,
      'villages': [
        {'name': 'कोट', 'pop': 2001},
        {'name': 'छातोल', 'pop': 411},
        {'name': 'मेरनियाखेड़ा', 'pop': 651},
      ],
    },
    'खाखरमाला': {
      'wards': 7,
      'pop': 2837,
      'villages': [
        {'name': 'रेबारियों की ढाणी', 'pop': 400},
        {'name': 'खाखरमाला', 'pop': 603},
        {'name': 'नान्दूड़ा', 'pop': 275},
        {'name': 'टुंगच', 'pop': 1035},
        {'name': 'सिंरोडी', 'pop': 524},
      ],
    },
    'खेमाणा': {
      'wards': 9,
      'pop': 2709,
      'villages': [
        {'name': 'खेमाणा', 'pop': 2327},
        {'name': 'खरडाया', 'pop': 0},
        {'name': 'थोरियाखेड़ा', 'pop': 382},
      ],
    },
    'गलवा': {
      'wards': 7,
      'pop': 2896,
      'villages': [
        {'name': 'गलवा', 'pop': 1555},
        {'name': 'सज्जनपुरा', 'pop': 0},
        {'name': 'रालीखेड़ा', 'pop': 308},
        {'name': 'लाठियाखेड़ी', 'pop': 217},
        {'name': 'टोकरा', 'pop': 816},
        {'name': 'रतनपुरा', 'pop': 0},
      ],
    },
    'गल्यावड़ी': {
      'wards': 7,
      'pop': 2791,
      'villages': [
        {'name': 'गल्यावड़ी', 'pop': 1652},
        {'name': 'केमुनिया', 'pop': 561},
        {'name': 'पचातरों का खेड़ा', 'pop': 578},
      ],
    },
    'चारोट': {
      'wards': 7,
      'pop': 2926,
      'villages': [
        {'name': 'चारोट', 'pop': 904},
        {'name': 'आसुणा', 'pop': 715},
        {'name': 'गोविन्दपुरा', 'pop': 431},
        {'name': 'किशोरपुरा', 'pop': 251},
        {'name': 'सिंहपुरा', 'pop': 625},
      ],
    },
    'झाड़ोल': {
      'wards': 9,
      'pop': 3741,
      'villages': [
        {'name': 'झडोल', 'pop': 3430},
        {'name': 'नयाखेड़ा', 'pop': 311},
      ],
    },
    'थला': {
      'wards': 9,
      'pop': 3651,
      'villages': [
        {'name': 'थला', 'pop': 1980},
        {'name': 'मोखमपुरा', 'pop': 1114},
        {'name': 'पिथलपुरा', 'pop': 557},
      ],
    },
    'देवरिया': {
      'wards': 7,
      'pop': 2902,
      'villages': [
        {'name': 'देवरिया', 'pop': 2902},
        {'name': 'मानपुरा', 'pop': 0},
      ],
    },
    'नाथड़ियास': {
      'wards': 7,
      'pop': 2999,
      'villages': [
        {'name': 'नाथडियास', 'pop': 2362},
        {'name': 'मोटरों का खेड़ा', 'pop': 369},
        {'name': 'देवली', 'pop': 675},
        {'name': 'आसपुर', 'pop': 637},
      ],
    },
    'नान्दशा जागीर': {
      'wards': 11,
      'pop': 4264,
      'villages': [
        {'name': 'नान्दशा जागीर', 'pop': 2265},
        {'name': 'परबती', 'pop': 544},
        {'name': 'बाडियाकलां', 'pop': 590},
        {'name': 'बाडियाखुर्द', 'pop': 865},
      ],
    },
    'नारायणखेड़ा': {
      'wards': 9,
      'pop': 3049,
      'villages': [
        {'name': 'नारायणखेड़ा', 'pop': 828},
        {'name': 'सरंगु', 'pop': 202},
        {'name': 'खुटिया', 'pop': 949},
        {'name': 'आम्बाखेड़ा', 'pop': 369},
        {'name': 'तेल्याखेड़ी', 'pop': 376},
        {'name': 'खुटियाखेड़ा', 'pop': 325},
      ],
    },
    'नाहरी': {
      'wards': 9,
      'pop': 3050,
      'villages': [
        {'name': 'नाहरी', 'pop': 3050},
        {'name': 'फतेहपुरा', 'pop': 0},
        {'name': 'दुल्हेपुरा', 'pop': 0},
      ],
    },
    'पनोतिया': {
      'wards': 7,
      'pop': 2961,
      'villages': [
        {'name': 'पनोतिया', 'pop': 1666},
        {'name': 'जोगरास', 'pop': 1295},
      ],
    },
    'पालरा': {
      'wards': 7,
      'pop': 2685,
      'villages': [
        {'name': 'पालरा', 'pop': 2346},
        {'name': 'खाननिया', 'pop': 339},
      ],
    },
    'पीथा का खेड़ा': {
      'wards': 11,
      'pop': 4354,
      'villages': [
        {'name': 'पीथा का खेड़ा', 'pop': 1140},
        {'name': 'मंडोल', 'pop': 619},
        {'name': 'ढिकाणी', 'pop': 148},
        {'name': 'रामा', 'pop': 1171},
        {'name': 'लडकी', 'pop': 1276},
      ],
    },
    'बकाण': {
      'wards': 7,
      'pop': 2715,
      'villages': [
        {'name': 'बकाण', 'pop': 475},
        {'name': 'लखाहोली', 'pop': 808},
        {'name': 'राणास', 'pop': 1039},
        {'name': 'दियास', 'pop': 393},
      ],
    },
    'बागोलिया': {
      'wards': 9,
      'pop': 3144,
      'villages': [
        {'name': 'बागोलिया', 'pop': 1444},
        {'name': 'अर्जुनगढ़', 'pop': 128},
        {'name': 'गाडरीखेड़ा', 'pop': 852},
        {'name': 'पाटियाखेड़ा', 'pop': 720},
      ],
    },
    'बागड़': {
      'wards': 9,
      'pop': 3261,
      'villages': [
        {'name': 'बागड़', 'pop': 1199},
        {'name': 'मंडी', 'pop': 493},
        {'name': 'मियाला', 'pop': 854},
        {'name': 'जलामली', 'pop': 546},
        {'name': 'कारोल', 'pop': 169},
      ],
    },
    'बोराणा': {
      'wards': 11,
      'pop': 4616,
      'villages': [
        {'name': 'बोराणा', 'pop': 4616},
      ],
    },
    'बोरियापुरा': {
      'wards': 7,
      'pop': 2491,
      'villages': [
        {'name': 'बोरियापुरा', 'pop': 1547},
        {'name': 'रेवाडा', 'pop': 629},
        {'name': 'शिवनाथपुरा', 'pop': 315},
        {'name': 'तोलास', 'pop': 0},
      ],
    },
    'भींटा': {
      'wards': 11,
      'pop': 4872,
      'villages': [
        {'name': 'भीटा', 'pop': 1231},
        {'name': 'सेमलाट', 'pop': 57},
        {'name': 'रूपाखेडा', 'pop': 619},
        {'name': 'सरेवडी', 'pop': 1191},
        {'name': 'सरेवडी का बाडीया', 'pop': 256},
        {'name': 'जोरावरपुरा', 'pop': 315},
        {'name': 'भटेवर', 'pop': 1459},
      ],
    },
    'मासिंगपुरा': {
      'wards': 7,
      'pop': 2797,
      'villages': [
        {'name': 'मासिंगपुरा', 'pop': 1250},
        {'name': 'डांगडा', 'pop': 380},
        {'name': 'डांगडी', 'pop': 779},
        {'name': 'ठिकरिया', 'pop': 388},
      ],
    },
    'मोखुन्दा': {
      'wards': 9,
      'pop': 3327,
      'villages': [
        {'name': 'मौखुन्दा', 'pop': 2751},
        {'name': 'तेलीखेड़ा', 'pop': 0},
        {'name': 'माण्डकाखेड़ा', 'pop': 576},
      ],
    },
    'रायपुर': {
      'wards': 17,
      'pop': 7372,
      'villages': [
        {'name': 'रायपुर', 'pop': 7372},
        {'name': 'सुरजपुरा', 'pop': 0},
      ],
    },
    'सागरेव': {
      'wards': 9,
      'pop': 3601,
      'villages': [
        {'name': 'सगरेव', 'pop': 3087},
        {'name': 'नयाखेड़ा जाटान्', 'pop': 0},
        {'name': 'जगपुरा', 'pop': 514},
      ],
    },
    'सुरास': {
      'wards': 7,
      'pop': 2771,
      'villages': [
        {'name': 'सुरास', 'pop': 1179},
        {'name': 'लक्ष्मीपुरा', 'pop': 0},
        {'name': 'धुलखेडा', 'pop': 1387},
        {'name': 'भीलखेड़ी', 'pop': 205},
      ],
    },
  };

  static const Map<String, Map<String, String>> gpWardMukhyaGrams = {
    'भीटा': {
      '1': 'भींटा - सेमलाट',
      '2': 'भींटा',
      '3': 'भींटा',
      '4': 'सरेवडी',
      '5': 'सरेवडी',
      '6': 'सरेवडी का बाडीया',
      '7': 'जोरावरपुरा',
      '8': 'भटेवर',
      '9': 'भटेवर',
      '10': 'भटेवर',
      '11': 'रूपा का खेडा',
    },
    'भींटा': {
      '1': 'भींटा - सेमलाट',
      '2': 'भींटा',
      '3': 'भींटा',
      '4': 'सरेवडी',
      '5': 'सरेवडी',
      '6': 'सरेवडी का बाडीया',
      '7': 'जोरावरपुरा',
      '8': 'भटेवर',
      '9': 'भटेवर',
      '10': 'भटेवर',
      '11': 'रूपा का खेडा',
    },
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

  void _handleVillageClick(String vName, String currentGp) {
    final cleanV = vName.trim();
    final matches = villageToSamitiWardsLookup[cleanV] ??
        villageToSamitiWardsLookup[vName] ??
        [];

    if (matches.length > 1) {
      // Village is common across multiple Samiti Wards or Gram Panchayats!
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.fromLTRB(18, 20, 18, 30),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xffeff6ff),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.location_on_rounded, color: Color(0xff2563eb), size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'गाँव: $cleanV',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: navy),
                        ),
                        const Text(
                          'यह गाँव एक से अधिक वार्ड/पंचायत में सम्मिलित है',
                          style: TextStyle(fontSize: 11.5, color: muted, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Text(
                'कृपया संबंधित वार्ड चुनें:',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: navy),
              ),
              const SizedBox(height: 8),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: matches.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, idx) {
                    final m = matches[idx];
                    final sName = '${m['samiti'] ?? ''}'.trim();
                    final wLabel = '${m['samitiWard'] ?? ''}'.trim();
                    final gp = '${m['gramPanchayat'] ?? ''}'.trim();
                    final pop = m['population'] as int? ?? 0;

                    return InkWell(
                      onTap: () {
                        Navigator.pop(ctx);
                        _openVoters(
                          village: cleanV,
                          gramPanchayat: gp,
                          samitiWard: wLabel,
                          samiti: sName,
                        );
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xfff8fafc),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.account_balance_rounded, color: Color(0xff2563eb), size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '$sName · $wLabel',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: navy),
                                  ),
                                  Text(
                                    'पंचायत: $gp ${pop > 0 ? "• जनसंख्या: $pop" : ""}',
                                    style: const TextStyle(fontSize: 12, color: muted),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xff2563eb)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    } else if (matches.length == 1) {
      final m = matches.first;
      _openVoters(
        village: cleanV,
        gramPanchayat: '${m['gramPanchayat'] ?? currentGp}'.trim(),
        samitiWard: '${m['samitiWard'] ?? ''}'.trim(),
        samiti: '${m['samiti'] ?? ''}'.trim(),
      );
    } else {
      _openVoters(
        village: cleanV,
        gramPanchayat: currentGp,
      );
    }
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
                                            final mukhyaGram = gpWardMukhyaGrams[gpName]?[wNum] ?? '';
                                            final chipText = mukhyaGram.isNotEmpty
                                                ? (count > 0 ? 'वार्ड $wNum: $mukhyaGram ($count)' : 'वार्ड $wNum: $mukhyaGram')
                                                : (count > 0 ? 'वार्ड $wNum ($count)' : 'वार्ड $wNum');
                                            return Padding(
                                              padding: const EdgeInsets.only(right: 6),
                                              child: ActionChip(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                visualDensity: VisualDensity.compact,
                                                label: Text(
                                                  chipText,
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

                                  LayoutBuilder(builder: (context, constraints) {
                                    final isWide = constraints.maxWidth >= 600;
                                    final colWidth = isWide ? (constraints.maxWidth - 10) / 2 : constraints.maxWidth;
                                    return Wrap(
                                      spacing: 10,
                                      runSpacing: 8,
                                      children: villages.map((v) {
                                        final vName = v['name'] as String;
                                        final pop = v['pop'] as int? ?? 0;

                                        return SizedBox(
                                          width: colWidth,
                                          child: Container(
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
                                                  onPressed: () => _handleVillageClick(vName, gpName),
                                                  child: const Text('मतदाता ➔', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                                                ),
                                              ],
                                            ),
                                          ),
                                        );
                                      }).toList(),
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
    final rawSamitiWards = liveHierarchyData?['samitiWards'] as Map<String, dynamic>?;
    final samitiWardsAll = (rawSamitiWards != null && rawSamitiWards.isNotEmpty)
        ? rawSamitiWards
        : officialSamitiWardsData;
    final currentSamitiData = (samitiWardsAll[selectedSamitiForWards] as Map<String, dynamic>?) ??
        (officialSamitiWardsData[selectedSamitiForWards] as Map<String, dynamic>?) ??
        {};
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
