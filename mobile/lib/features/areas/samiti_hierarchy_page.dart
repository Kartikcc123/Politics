import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../voters/voter_management_page.dart';

class SamitiHierarchyPage extends StatefulWidget {
  const SamitiHierarchyPage({super.key});

  @override
  State<SamitiHierarchyPage> createState() => _SamitiHierarchyPageState();
}

class _SamitiHierarchyPageState extends State<SamitiHierarchyPage> {
  final search = TextEditingController();
  String query = '';
  String selectedSamiti = 'रायपुर'; // Default to रायपुर
  String? expandedPanchayat;

  // Official Master Hierarchy matching "पंचायत समिति - रायपुर, जिला - भीलवाड़ा" Official 2026 Govt PDF & Excel 2028
  static const samitiData = <String, Map<String, dynamic>>{
    'रायपुर': {
      'icon': Icons.account_balance_rounded,
      'color': Color(0xff1457f5),
      'gpCount': 29,
      'wardCount': 251,
      'population': 97869,
      'panchayats': {
        'भींटा': {
          'status': 'पुनर्गठित',
          'wards': 11,
          'villages': [
            {'name': 'भींटा', 'parts': 'भाग 1, 2', 'pop': 1231},
            {'name': 'धोरिया खेड़ा', 'parts': 'भाग 3', 'pop': 711},
            {'name': 'भटेवर', 'parts': 'भाग 4', 'pop': 1459},
            {'name': 'रूपाखेड़ा', 'parts': 'भाग 1-4', 'pop': 619},
            {'name': 'सेमलाट', 'parts': 'भींटा', 'pop': 57},
            {'name': 'जोरावरपुरा', 'parts': 'भींटा', 'pop': 315},
          ]
        },
        'कलालखेड़ी': {
          'status': 'नवसृजित',
          'wards': 7,
          'villages': [
            {'name': 'धूल खेड़ा', 'parts': 'भाग 48, 49', 'pop': 1387},
            {'name': 'कलालखेड़ी', 'parts': 'भाग 50, 51', 'pop': 918},
            {'name': 'बरी / बाड़ी', 'parts': 'भाग 52', 'pop': 1239},
          ]
        },
        'पीथाकाखेड़ा': {
          'status': 'यथावत',
          'wards': 11,
          'villages': [
            {'name': 'पीथा का खेड़ा', 'parts': 'भाग 42', 'pop': 1140},
            {'name': 'मांडोल', 'parts': 'भाग 43', 'pop': 619},
            {'name': 'लड़की', 'parts': 'भाग 7', 'pop': 1276},
            {'name': 'रामा', 'parts': 'भाग 8', 'pop': 1171},
            {'name': 'ढिकाणी', 'parts': 'भाग 42', 'pop': 148},
          ]
        },
        'खेमाणा': {
          'status': 'पुनर्गठित',
          'wards': 9,
          'villages': [
            {'name': 'खेमाणा', 'parts': 'भाग 37, 38', 'pop': 2327},
            {'name': 'थोरियाखेड़ा', 'parts': 'भाग 37', 'pop': 382},
            {'name': 'खरडाया', 'parts': 'खेमाणा', 'pop': 0},
          ]
        },
        'चारोट': {
          'status': 'नवसृजित',
          'wards': 7,
          'villages': [
            {'name': 'चारोट', 'parts': 'भाग 35, 36', 'pop': 904},
            {'name': 'आसूणा', 'parts': 'भाग 19', 'pop': 715},
            {'name': 'सिंहपुरा', 'parts': 'भाग 29', 'pop': 625},
            {'name': 'गोविन्दपुरा', 'parts': 'चारोट', 'pop': 431},
            {'name': 'किशोरपुरा', 'parts': 'चारोट', 'pop': 251},
          ]
        },
        'गल्यावड़ी': {
          'status': 'नवसृजित',
          'wards': 7,
          'villages': [
            {'name': 'गल्यावड़ी', 'parts': 'भाग 72, 73', 'pop': 1652},
            {'name': 'केमरिया / केमुनिया', 'parts': 'भाग 70, 71', 'pop': 561},
            {'name': 'पचातरों का खेड़ा', 'parts': 'गल्यावड़ी', 'pop': 578},
            {'name': 'रेबारियों की ढाणी', 'parts': 'गल्यावड़ी', 'pop': 400},
          ]
        },
        'खाखरमाला': {
          'status': 'पुनर्गठित',
          'wards': 7,
          'villages': [
            {'name': 'खाखरमाला', 'parts': 'भाग 18', 'pop': 603},
            {'name': 'टूणगाच / टुंगच', 'parts': 'भाग 16, 17', 'pop': 1035},
            {'name': 'सिरोड़ी', 'parts': 'भाग 13', 'pop': 524},
            {'name': 'नान्दूड़ा', 'parts': 'खाखरमाला', 'pop': 275},
          ]
        },
        'गलवा': {
          'status': 'पुनर्गठित',
          'wards': 7,
          'villages': [
            {'name': 'गलवा', 'parts': 'भाग 33, 34', 'pop': 1555},
            {'name': 'टोकरा', 'parts': 'भाग 28', 'pop': 816},
            {'name': 'रालीखेड़ा', 'parts': 'गलवा', 'pop': 308},
            {'name': 'लाठियाखेड़ी', 'parts': 'गलवा', 'pop': 217},
            {'name': 'सज्जनपुरा', 'parts': 'गलवा', 'pop': 0},
            {'name': 'रतनपुरा', 'parts': 'गलवा', 'pop': 0},
          ]
        },
        'मोखुन्दा': {
          'status': 'पुनर्गठित',
          'wards': 9,
          'villages': [
            {'name': 'मोखुन्दा', 'parts': 'भाग 20, 21', 'pop': 2751},
            {'name': 'माण्डकाखेड़ा', 'parts': 'भाग 23', 'pop': 576},
            {'name': 'तेलीखेड़ा', 'parts': 'मोखुन्दा', 'pop': 0},
          ]
        },
        'मासिंगपुरा': {
          'status': 'नवसृजित',
          'wards': 7,
          'villages': [
            {'name': 'मासिंगपुरा', 'parts': 'भाग 22', 'pop': 1250},
            {'name': 'डूंगरी / डांगडी', 'parts': 'भाग 24', 'pop': 779},
            {'name': 'डांगडा', 'parts': 'मासिंगपुरा', 'pop': 380},
            {'name': 'ठिकरिया', 'parts': 'मासिंगपुरा', 'pop': 388},
          ]
        },
        'झाड़ोल': {
          'status': 'पुनर्गठित',
          'wards': 9,
          'villages': [
            {'name': 'झाड़ोल', 'parts': 'भाग 25, 26, 27', 'pop': 3430},
            {'name': 'नयाखेड़ा', 'parts': 'झाड़ोल', 'pop': 311},
          ]
        },
        'नाहरी': {
          'status': 'पुनर्गठित',
          'wards': 9,
          'villages': [
            {'name': 'नाहरी', 'parts': 'भाग 85', 'pop': 3050},
            {'name': 'फतेहपुरा', 'parts': 'भाग 86, 87', 'pop': 0},
            {'name': 'दुल्हेपुरा', 'parts': 'नाहरी', 'pop': 0},
          ]
        },
        'पानोतिया': {
          'status': 'नवसृजित',
          'wards': 7,
          'villages': [
            {'name': 'जोगरास', 'parts': 'भाग 83, 84', 'pop': 1666},
            {'name': 'पानोतिया', 'parts': 'भाग 75, 76, 82', 'pop': 1295},
            {'name': 'खूटिया', 'parts': 'भाग 77, 78', 'pop': 949},
          ]
        },
        'नाथड़ियास': {
          'status': 'पुनर्गठित',
          'wards': 7,
          'villages': [
            {'name': 'नाथड़ियास', 'parts': 'भाग 80', 'pop': 2362},
            {'name': 'आसपुर', 'parts': 'भाग 81', 'pop': 637},
            {'name': 'मोटरों का खेड़ा', 'parts': 'नाथड़ियास', 'pop': 0},
          ]
        },
        'थाला': {
          'status': 'पुनर्गठित',
          'wards': 9,
          'villages': [
            {'name': 'थाला', 'parts': 'भाग 58', 'pop': 1980},
            {'name': 'मोखमपुरा', 'parts': 'भाग 79', 'pop': 1114},
            {'name': 'पिथलपुरा', 'parts': 'थाला', 'pop': 557},
          ]
        },
        'सुरास': {
          'status': 'नवसृजित',
          'wards': 7,
          'villages': [
            {'name': 'सुरास', 'parts': 'भाग 53, 54', 'pop': 1179},
            {'name': 'पाबियों का खेड़ा', 'parts': 'भाग 55', 'pop': 0},
            {'name': 'धूलखेड़ा', 'parts': 'सुरास', 'pop': 1387},
            {'name': 'भीलखेड़ी', 'parts': 'सुरास', 'pop': 205},
            {'name': 'लक्ष्मीपुरा', 'parts': 'सुरास', 'pop': 0},
          ]
        },
        'बागोलिया': {
          'status': 'पुनर्गठित',
          'wards': 9,
          'villages': [
            {'name': 'बागोलिया', 'parts': 'भाग 56, 57', 'pop': 1444},
            {'name': 'गाडरीखेड़ा', 'parts': 'भाग 59', 'pop': 852},
            {'name': 'पाटियाखेड़ा', 'parts': 'बागोलिया', 'pop': 720},
            {'name': 'अर्जुनगढ़', 'parts': 'बागोलिया', 'pop': 128},
          ]
        },
        'पालरां': {
          'status': 'पुनर्गठित',
          'wards': 7,
          'villages': [
            {'name': 'पालरां', 'parts': 'भाग 39, 40', 'pop': 2346},
            {'name': 'खाननिया', 'parts': 'पालरां', 'pop': 339},
          ]
        },
        'बोराणा': {
          'status': 'पुनर्गठित',
          'wards': 11,
          'villages': [
            {'name': 'बोराणा', 'parts': 'भाग 44, 45, 46, 47', 'pop': 4616},
          ]
        },
        'आशाहोली': {
          'status': 'पुनर्गठित',
          'wards': 9,
          'villages': [
            {'name': 'आशाहोली', 'parts': 'भाग 93, 94', 'pop': 3156},
            {'name': 'लेली तोलास', 'parts': 'भाग 95', 'pop': 0},
          ]
        },
        'बकाण': {
          'status': 'नवसृजित',
          'wards': 7,
          'villages': [
            {'name': 'लखाहाली', 'parts': 'भाग 91', 'pop': 475},
            {'name': 'राणास / रामरास', 'parts': 'भाग 92', 'pop': 1039},
            {'name': 'बकाण / बाड़िया खुर्द', 'parts': 'भाग 90', 'pop': 808},
            {'name': 'दियास', 'parts': 'बकाण', 'pop': 393},
          ]
        },
        'नान्दशा जागीर': {
          'status': 'पुनर्गठित',
          'wards': 11,
          'villages': [
            {'name': 'नान्दशा जागीर', 'parts': 'भाग 74', 'pop': 2265},
            {'name': 'बाड़ियाकलां', 'parts': 'भाग 89', 'pop': 590},
            {'name': 'बाड़ियाखुर्द', 'parts': 'भाग 90', 'pop': 865},
            {'name': 'परबती', 'parts': 'नान्दशा जागीर', 'pop': 544},
          ]
        },
        'बोरियापुरा': {
          'status': 'यथावत',
          'wards': 7,
          'villages': [
            {'name': 'बोरियापुरा', 'parts': 'भाग 96-100', 'pop': 1547},
            {'name': 'रेवाड़ा / देवाड़ा', 'parts': 'भाग 96', 'pop': 629},
            {'name': 'शिवनाथपुरा', 'parts': 'बोरियापुरा', 'pop': 315},
            {'name': 'तोलास', 'parts': 'बोरियापुरा', 'pop': 0},
          ]
        },
        'सगरेव': {
          'status': 'यथावत',
          'wards': 9,
          'villages': [
            {'name': 'सगरेव', 'parts': 'भाग 62, 63', 'pop': 3087},
            {'name': 'जगपुरा', 'parts': 'सगरेव', 'pop': 514},
            {'name': 'नयाखेड़ा जाटान', 'parts': 'सगरेव', 'pop': 0},
          ]
        },
        'नारायणखेड़ा': {
          'status': 'यथावत',
          'wards': 9,
          'villages': [
            {'name': 'नारायणखेड़ा', 'parts': 'भाग 88', 'pop': 828},
            {'name': 'खुटियां', 'parts': 'नारायणखेड़ा', 'pop': 949},
            {'name': 'तेज्याखेड़ी', 'parts': 'नारायणखेड़ा', 'pop': 376},
            {'name': 'आम्बाखेड़ा', 'parts': 'नारायणखेड़ा', 'pop': 369},
            {'name': 'खुटियांखेड़ा', 'parts': 'नारायणखेड़ा', 'pop': 325},
            {'name': 'सरंगु', 'parts': 'नारायणखेड़ा', 'pop': 202},
          ]
        },
        'देवरिया': {
          'status': 'यथावत',
          'wards': 7,
          'villages': [
            {'name': 'देवरिया', 'parts': 'भाग 30, 31, 32', 'pop': 2902},
            {'name': 'मानपुरा', 'parts': 'देवरिया', 'pop': 0},
          ]
        },
        'कोट': {
          'status': 'यथावत',
          'wards': 9,
          'villages': [
            {'name': 'कोट', 'parts': 'भाग 14, 15', 'pop': 2001},
            {'name': 'छातोल', 'parts': 'भाग 10', 'pop': 411},
            {'name': 'मेरियाखेड़ा', 'parts': 'भाग 41', 'pop': 651},
          ]
        },
        'बागड़': {
          'status': 'यथावत',
          'wards': 9,
          'villages': [
            {'name': 'बागड़', 'parts': 'भाग 12', 'pop': 1199},
            {'name': 'मियाला', 'parts': 'भाग 11', 'pop': 854},
            {'name': 'जलामली', 'parts': 'भाग 9', 'pop': 546},
            {'name': 'मंडी', 'parts': 'बागड़', 'pop': 493},
            {'name': 'कारोई', 'parts': 'बागड़', 'pop': 169},
          ]
        },
        'रायपुर': {
          'status': 'पुनर्गठित',
          'wards': 17,
          'villages': [
            {'name': 'रायपुर', 'parts': 'भाग 64, 65, 66, 67, 68, 69', 'pop': 7372},
            {'name': 'सूरजपुरा', 'parts': 'रायपुर', 'pop': 0},
          ]
        },
        'सरेवड़ी': {
          'status': 'सरेवड़ी मंडल',
          'wards': 9,
          'villages': [
            {'name': 'सरेवड़ी', 'parts': 'भाग 5, 6', 'pop': 1191},
            {'name': 'सरेवड़ी का बाड़ीया', 'parts': 'भाग 5', 'pop': 0},
          ]
        },
        'आमली': {
          'status': 'आमली मंडल',
          'wards': 9,
          'villages': [
            {'name': 'आमली', 'parts': 'भाग 101, 102, 103', 'pop': 2800},
          ]
        },
      }
    },
    'सहाड़ा': {
      'icon': Icons.location_city_rounded,
      'color': Color(0xff059669),
      'gpCount': 30,
      'wardCount': 270,
      'population': 115000,
      'panchayats': {
        'सहाड़ा': {'villages': [{'name': 'सहाड़ा'}, {'name': 'सहाड़ा ग्रामीण'}]},
        'पोटलां': {'villages': [{'name': 'पोटलां'}, {'name': 'पोटलां खेड़ा'}]},
        'अरवड़': {'villages': [{'name': 'अरवड़'}, {'name': 'अरवड़ खुर्द'}]},
        'आमेसर': {'villages': [{'name': 'आमेसर'}, {'name': 'आमेसर का खेड़ा'}]},
        'कारोई कलां': {'villages': [{'name': 'कारोई कलां'}, {'name': 'कारोई खुर्द'}]},
        'कोशीथल': {'villages': [{'name': 'कोशीथल'}, {'name': 'कोशीथल ढाणी'}]},
        'गुंदली': {'villages': [{'name': 'गुंदली'}, {'name': 'गुंदली खेड़ा'}]},
        'चावण्डिया': {'villages': [{'name': 'चावण्डिया'}, {'name': 'चावण्डिया खुर्द'}]},
        'जामोली': {'villages': [{'name': 'जामोली'}, {'name': 'जामोली खेड़ा'}]},
        'देवड़ा': {'villages': [{'name': 'देवड़ा'}, {'name': 'देवड़ा का बास'}]},
        'नांदशा': {'villages': [{'name': 'नांदशा'}, {'name': 'नांदशा खुर्द'}]},
        'भगवानपुरा': {'villages': [{'name': 'भगवानपुरा'}, {'name': 'भगवानपुरा खेड़ा'}]},
        'भादू': {'villages': [{'name': 'भादू'}, {'name': 'भादू खेड़ा'}]},
        'मांडल': {'villages': [{'name': 'मांडल'}, {'name': 'मांडल कस्बा'}]},
        'मंगरोप': {'villages': [{'name': 'मंगरोप'}, {'name': 'मंगरोप खुर्द'}]},
        'लसाड़िया': {'villages': [{'name': 'लसाड़िया'}, {'name': 'लसाड़िया खेड़ा'}]},
      }
    },
    'सुवाणा': {
      'icon': Icons.landscape_rounded,
      'color': Color(0xff7c3aed),
      'gpCount': 19,
      'wardCount': 171,
      'population': 68000,
      'panchayats': {
        'सुवाणा': {'villages': [{'name': 'सुवाणा'}, {'name': 'सुवाणा ग्रामीण'}]},
        'हमीरगढ़': {'villages': [{'name': 'हमीरगढ़'}, {'name': 'हमीरगढ़ कस्बा'}]},
        'गुलाबपुरा': {'villages': [{'name': 'गुलाबपुरा'}, {'name': 'गुलाबपुरा ग्रामीण'}]},
        'रूपाहेली': {'villages': [{'name': 'रूपाहेली'}, {'name': 'रूपाहेली खुर्द'}]},
        'आसींद': {'villages': [{'name': 'आसींद'}, {'name': 'आसींद ग्रामीण'}]},
        'बनेड़ा': {'villages': [{'name': 'बनेड़ा'}, {'name': 'बनेड़ा कस्बा'}]},
      }
    },
    'गंगापुर (नगरपालिका)': {
      'icon': Icons.apartment_rounded,
      'color': Color(0xffea580c),
      'gpCount': 35,
      'wardCount': 35,
      'population': 35000,
      'panchayats': {
        'गंगापुर शहरी': {
          'villages': List.generate(35, (i) => {'name': 'वार्ड ${i + 1}', 'parts': 'वार्ड ${i + 1}'})
        }
      }
    }
  };

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  void _openVoters({String? village, String? gramPanchayat, String? tehsil}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(
            title: Text(village != null
                ? 'गाँव: $village'
                : (gramPanchayat != null ? 'पंचायत: $gramPanchayat' : '$tehsil')),
          ),
          body: VoterManagementPage(
            initialVillage: village,
            initialGramPanchayat: gramPanchayat,
            initialTehsil: tehsil,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final curData = samitiData[selectedSamiti] ?? samitiData['रायपुर']!;
    final panchayatsMap = curData['panchayats'] as Map<String, dynamic>;

    // Smart Filter: handles OCR spellings & partial names
    final filteredPanchayats = <String, List<Map<String, dynamic>>>{};
    for (final entry in panchayatsMap.entries) {
      final gpName = entry.key;
      final villages = List<Map<String, dynamic>>.from(entry.value['villages'] ?? []);

      if (query.isEmpty) {
        filteredPanchayats[gpName] = villages;
      } else {
        final q = query.toLowerCase().trim();
        final cleanQ = q.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '');
        final matchGp = gpName.toLowerCase().contains(q) || gpName.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '').contains(cleanQ);

        final matchedVillages = villages.where((v) {
          final vName = (v['name'] ?? '').toString().toLowerCase();
          final parts = (v['parts'] ?? '').toString().toLowerCase();
          final cleanV = vName.replaceAll(RegExp(r'[^\u0900-\u097F\da-zA-Z]'), '');
          return vName.contains(q) || parts.contains(q) || cleanV.contains(cleanQ);
        }).toList();

        if (matchGp || matchedVillages.isNotEmpty) {
          filteredPanchayats[gpName] = matchedVillages.isNotEmpty ? matchedVillages : villages;
        }
      }
    }

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Top Header & Search Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: blue.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.holiday_village_rounded, color: blue, size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'क्षेत्र एवं पंचायत डायरेक्ट्री',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: navy,
                                ),
                              ),
                              Text(
                                '179 - सहाड़ा विधानसभा (रायपुर, सहाड़ा, सुवाणा, गंगापुर)',
                                style: TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Google Contacts style search bar with OCR-tolerant search
                    TextField(
                      controller: search,
                      onChanged: (v) => setState(() => query = v),
                      decoration: InputDecoration(
                        hintText: 'गाँव, पंचायत या भाग खोजें (जैसे: भींटा, कोट, 5, 25)...',
                        prefixIcon: const Icon(Icons.search_rounded, color: navy),
                        suffixIcon: query.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded),
                                onPressed: () => setState(() {
                                  search.clear();
                                  query = '';
                                }),
                              )
                            : null,
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(28),
                          borderSide: const BorderSide(color: border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(28),
                          borderSide: const BorderSide(color: border),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Samiti Selector Tabs
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: samitiData.entries.map((e) {
                          final isSelected = e.key == selectedSamiti;
                          final color = e.value['color'] as Color;
                          final icon = e.value['icon'] as IconData;
                          final gpCount = e.value['gpCount'];
                          final wardCount = e.value['wardCount'];

                          return Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: ChoiceChip(
                              showCheckmark: false,
                              avatar: Icon(icon, color: isSelected ? Colors.white : color, size: 18),
                              label: Text('${e.key} ($gpCount GP, $wardCount वार्ड)'),
                              selected: isSelected,
                              selectedColor: color,
                              backgroundColor: Colors.white,
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : navy,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                                side: BorderSide(color: isSelected ? color : border),
                              ),
                              onSelected: (_) {
                                setState(() {
                                  selectedSamiti = e.key;
                                  expandedPanchayat = null;
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Quick action: View whole Samiti
                    InkWell(
                      onTap: () => _openVoters(tehsil: selectedSamiti.replaceAll(' (नगरपालिका)', '')),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: (curData['color'] as Color).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: (curData['color'] as Color).withValues(alpha: 0.25)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.groups_rounded, color: curData['color'] as Color, size: 20),
                            const SizedBox(width: 10),
                            Text(
                              '👥 पूरी $selectedSamiti के सभी मतदाता देखें',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: curData['color'] as Color,
                                fontSize: 13,
                              ),
                            ),
                            const Spacer(),
                            Icon(Icons.arrow_forward_ios_rounded, size: 14, color: curData['color'] as Color),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Gram Panchayats & Villages List
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 90),
              sliver: filteredPanchayats.isEmpty
                  ? const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Center(
                          child: Text(
                            'कोई पंचायत या गाँव नहीं मिला।',
                            style: TextStyle(color: muted, fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    )
                  : SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final gpName = filteredPanchayats.keys.elementAt(index);
                          final villages = filteredPanchayats[gpName]!;
                          final isExpanded = expandedPanchayat == gpName || query.isNotEmpty;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: border),
                            ),
                            child: Theme(
                              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                              child: ExpansionTile(
                                key: Key('$selectedSamiti-$gpName'),
                                initiallyExpanded: isExpanded,
                                leading: Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: (curData['color'] as Color).withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    gpName.isNotEmpty ? gpName.substring(0, 1) : 'प',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: curData['color'] as Color,
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
                                subtitle: Text(
                                  '${villages.length} राजस्व गाँव • ${villages.map((v) => v['parts'] ?? '').where((p) => p.isNotEmpty).join(' | ')}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 12, color: muted),
                                ),
                                children: [
                                  Container(
                                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                                    child: Column(
                                      children: [
                                        const Divider(color: border, height: 1),
                                        const SizedBox(height: 8),

                                        // 1-Click view whole GP voters
                                        InkWell(
                                          onTap: () => _openVoters(gramPanchayat: gpName, tehsil: selectedSamiti),
                                          borderRadius: BorderRadius.circular(10),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                            decoration: BoxDecoration(
                                              color: softBlue,
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Row(
                                              children: [
                                                const Icon(Icons.people_alt_rounded, size: 16, color: blue),
                                                const SizedBox(width: 8),
                                                Text(
                                                  'पूरी $gpName पंचायत के मतदाता देखें',
                                                  style: const TextStyle(
                                                    color: blue,
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w800,
                                                  ),
                                                ),
                                                const Spacer(),
                                                const Icon(Icons.arrow_forward_rounded, size: 14, color: blue),
                                              ],
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 8),

                                        // Individual Villages List
                                        ...villages.map((v) {
                                          final vName = v['name'] as String;
                                          final parts = v['parts'] as String?;
                                          final pop = v['pop'] as int?;

                                          return ListTile(
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            leading: const Icon(Icons.location_on_outlined, color: blue, size: 20),
                                            title: Text(
                                              vName,
                                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: navy),
                                            ),
                                            subtitle: Row(
                                              children: [
                                                if (parts != null)
                                                  Text(parts, style: const TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w700)),
                                                if (parts != null && pop != null && pop > 0)
                                                  const Text(' • ', style: TextStyle(color: muted, fontSize: 11)),
                                                if (pop != null && pop > 0)
                                                  Text('जनसंख्या: $pop', style: const TextStyle(fontSize: 11, color: green, fontWeight: FontWeight.w700)),
                                              ],
                                            ),
                                            trailing: FilledButton.tonal(
                                              style: FilledButton.styleFrom(
                                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                visualDensity: VisualDensity.compact,
                                              ),
                                              onPressed: () => _openVoters(
                                                village: vName,
                                                gramPanchayat: gpName,
                                                tehsil: selectedSamiti,
                                              ),
                                              child: const Text('मतदाता देखें ➔', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
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
                        childCount: filteredPanchayats.length,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
