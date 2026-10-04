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
  final search = TextEditingController();
  String query = '';
  String selectedSamiti = 'रायपुर';
  String? expandedPanchayat;
  Map<String, dynamic>? liveHierarchyData;

  @override
  void initState() {
    super.initState();
    _fetchLiveHierarchy();
  }

  Future<void> _fetchLiveHierarchy() async {
    try {
      final res = await api.get('/api/auth/hierarchy-options');
      if (mounted) {
        setState(() => liveHierarchyData = res);
      }
    } catch (_) {}
  }

  List<Map<String, dynamic>> getGpParts(String gpName) {
    if (liveHierarchyData == null) return [];
    final cleanGp = gpName.trim();

    // 1. Check from panchayats array in liveHierarchyData
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

    // 2. Fallback to raw parts list if structured as part objects
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

  static const samitiData = <String, Map<String, dynamic>>{
    'रायपुर': {
      'icon': Icons.account_balance_rounded,
      'color': Color(0xff1457f5),
      'gpCount': 29,
      'villageCount': 105,
      'panchayats': {
        'भींटा': {
          'wards': 11,
          'pop': 4872,
          'villages': [
            {'name': 'भींटा', 'parts': '', 'pop': 1231},
            {'name': 'सेमलाट', 'parts': '', 'pop': 57},
            {'name': 'रूपाखेड़ा', 'parts': '', 'pop': 619},
            {'name': 'सरेवड़ी', 'parts': '', 'pop': 1191},
            {'name': 'सरेवड़ी का बाड़ीया', 'parts': '', 'pop': 0},
            {'name': 'जोरावरपुरा', 'parts': '', 'pop': 315},
            {'name': 'भटेवर', 'parts': '', 'pop': 1459}
          ]
        },
        'कलालखेड़ी': {
          'wards': 7,
          'pop': 2868,
          'villages': [
            {'name': 'थोरियाखेड़ा', 'parts': '', 'pop': 711},
            {'name': 'कलालखेड़ी', 'parts': '', 'pop': 918},
            {'name': 'बाड़ी', 'parts': '', 'pop': 1239}
          ]
        },
        'पीथाकाखेड़ा': {
          'wards': 11,
          'pop': 4354,
          'villages': [
            {'name': 'पीथाकाखेड़ा', 'parts': '', 'pop': 1140},
            {'name': 'मंडोल', 'parts': '', 'pop': 619},
            {'name': 'ढिकाणी', 'parts': '', 'pop': 148},
            {'name': 'रामा', 'parts': '', 'pop': 1171},
            {'name': 'लड़की', 'parts': '', 'pop': 1276}
          ]
        },
        'खेमाणा': {
          'wards': 9,
          'pop': 2709,
          'villages': [
            {'name': 'खेमाणा', 'parts': '', 'pop': 2327},
            {'name': 'खरडाया', 'parts': '', 'pop': 0},
            {'name': 'थोरियाखेड़ा', 'parts': '', 'pop': 382}
          ]
        },
        'चारोट': {
          'wards': 7,
          'pop': 2926,
          'villages': [
            {'name': 'चारोट', 'parts': '', 'pop': 904},
            {'name': 'आसूणा', 'parts': '', 'pop': 715},
            {'name': 'गोविन्दपुरा', 'parts': '', 'pop': 431},
            {'name': 'किशोरपुरा', 'parts': '', 'pop': 251},
            {'name': 'सिंहपुरा', 'parts': '', 'pop': 625}
          ]
        },
        'गल्यावड़ी': {
          'wards': 7,
          'pop': 2791,
          'villages': [
            {'name': 'गल्यावड़ी', 'parts': '', 'pop': 1652},
            {'name': 'केमुनिया', 'parts': '', 'pop': 561},
            {'name': 'पचातरों का खेड़ा', 'parts': '', 'pop': 578}
          ]
        },
        'खाखरमाला': {
          'wards': 7,
          'pop': 2837,
          'villages': [
            {'name': 'रेबारियों की ढाणी', 'parts': '', 'pop': 400},
            {'name': 'खाखरमाला', 'parts': '', 'pop': 603},
            {'name': 'नान्दूड़ा', 'parts': '', 'pop': 275},
            {'name': 'टुंगच', 'parts': '', 'pop': 1035},
            {'name': 'सिरोड़ी', 'parts': '', 'pop': 524}
          ]
        },
        'गलवा': {
          'wards': 7,
          'pop': 2896,
          'villages': [
            {'name': 'गलवा', 'parts': '', 'pop': 1555},
            {'name': 'सज्जनपुरा', 'parts': '', 'pop': 0},
            {'name': 'रालीखेड़ा', 'parts': '', 'pop': 308},
            {'name': 'लाठियाखेड़ी', 'parts': '', 'pop': 217},
            {'name': 'टोकरा', 'parts': '', 'pop': 816},
            {'name': 'रतनपुरा', 'parts': '', 'pop': 0}
          ]
        },
        'मोखुन्दा': {
          'wards': 9,
          'pop': 3327,
          'villages': [
            {'name': 'मोखुन्दा', 'parts': '', 'pop': 2751},
            {'name': 'तेलीखेड़ा', 'parts': '', 'pop': 0},
            {'name': 'माण्डकाखेड़ा', 'parts': '', 'pop': 576}
          ]
        },
        'मासिंगपुरा': {
          'wards': 7,
          'pop': 2797,
          'villages': [
            {'name': 'मासिंगपुरा', 'parts': '', 'pop': 1250},
            {'name': 'डांगडा', 'parts': '', 'pop': 380},
            {'name': 'डांगडी', 'parts': '', 'pop': 779},
            {'name': 'ठिकरिया', 'parts': '', 'pop': 388}
          ]
        },
        'झाड़ोल': {
          'wards': 9,
          'pop': 3741,
          'villages': [
            {'name': 'झाड़ोल', 'parts': '', 'pop': 3430},
            {'name': 'नयाखेड़ा', 'parts': '', 'pop': 311}
          ]
        },
        'नाहरी': {
          'wards': 9,
          'pop': 3050,
          'villages': [
            {'name': 'नाहरी', 'parts': '', 'pop': 3050},
            {'name': 'फतेहपुरा', 'parts': '', 'pop': 0},
            {'name': 'दुल्हेपुरा', 'parts': '', 'pop': 0}
          ]
        },
        'पनोतिया': {
          'wards': 7,
          'pop': 2961,
          'villages': [
            {'name': 'जोगरास', 'parts': '', 'pop': 1666},
            {'name': 'पनोतिया', 'parts': '', 'pop': 1295}
          ]
        },
        'नाथड़ियास': {
          'wards': 7,
          'pop': 2999,
          'villages': [
            {'name': 'नाथड़ियास', 'parts': '', 'pop': 2362},
            {'name': 'मोटरों का खेड़ा', 'parts': '', 'pop': 0},
            {'name': 'आसपुर', 'parts': '', 'pop': 637}
          ]
        },
        'थला': {
          'wards': 9,
          'pop': 3651,
          'villages': [
            {'name': 'थला', 'parts': '', 'pop': 1980},
            {'name': 'मोखमपुरा', 'parts': '', 'pop': 1114},
            {'name': 'पिथलपुरा', 'parts': '', 'pop': 557}
          ]
        },
        'सुरास': {
          'wards': 7,
          'pop': 2771,
          'villages': [
            {'name': 'सुरास', 'parts': '', 'pop': 1179},
            {'name': 'लक्ष्मीपुरा', 'parts': '', 'pop': 0},
            {'name': 'धुलखेड़ा', 'parts': '', 'pop': 1387},
            {'name': 'भीलखेड़ी', 'parts': '', 'pop': 205}
          ]
        },
        'बागोलिया': {
          'wards': 9,
          'pop': 3144,
          'villages': [
            {'name': 'बागोलिया', 'parts': '', 'pop': 1444},
            {'name': 'अंजनगढ़', 'parts': '', 'pop': 128},
            {'name': 'गाड़रीखेड़ा', 'parts': '', 'pop': 852},
            {'name': 'पाटियाखेड़ा', 'parts': '', 'pop': 720}
          ]
        },
        'पालरां': {
          'wards': 7,
          'pop': 2685,
          'villages': [
            {'name': 'पालरां', 'parts': '', 'pop': 2346},
            {'name': 'खाननिया', 'parts': '', 'pop': 339}
          ]
        },
        'बोराणा': {
          'wards': 11,
          'pop': 4616,
          'villages': [
            {'name': 'बोराणा', 'parts': '', 'pop': 4616}
          ]
        },
        'आशाहोली': {
          'wards': 9,
          'pop': 3156,
          'villages': [
            {'name': 'आशाहोली', 'parts': '', 'pop': 3156}
          ]
        },
        'बकाण': {
          'wards': 7,
          'pop': 2715,
          'villages': [
            {'name': 'लखाहोली', 'parts': '', 'pop': 475},
            {'name': 'बकाण', 'parts': '', 'pop': 808},
            {'name': 'राणास', 'parts': '', 'pop': 1039},
            {'name': 'दियास', 'parts': '', 'pop': 393}
          ]
        },
        'नान्दशा जागीर': {
          'wards': 11,
          'pop': 4264,
          'villages': [
            {'name': 'नान्दशा जागीर', 'parts': '', 'pop': 2265},
            {'name': 'परबती', 'parts': '', 'pop': 544},
            {'name': 'बाड़ियाकलां', 'parts': '', 'pop': 590},
            {'name': 'बाड़ियाखुर्द', 'parts': '', 'pop': 865}
          ]
        },
        'बोरियापुरा': {
          'wards': 7,
          'pop': 2491,
          'villages': [
            {'name': 'बोरियापुरा', 'parts': '', 'pop': 1547},
            {'name': 'रेवाड़ा', 'parts': '', 'pop': 629},
            {'name': 'शिवनाथपुरा', 'parts': '', 'pop': 315},
            {'name': 'तोलास', 'parts': '', 'pop': 0}
          ]
        },
        'सगरेव': {
          'wards': 9,
          'pop': 3601,
          'villages': [
            {'name': 'सगरेव', 'parts': '', 'pop': 3087},
            {'name': 'नयाखेड़ा जाटान', 'parts': '', 'pop': 0},
            {'name': 'जगपुरा', 'parts': '', 'pop': 514}
          ]
        },
        'नारायणखेड़ा': {
          'wards': 9,
          'pop': 3049,
          'villages': [
            {'name': 'नारायणखेड़ा', 'parts': '', 'pop': 828},
            {'name': 'सरंगु', 'parts': '', 'pop': 202},
            {'name': 'खुटियां', 'parts': '', 'pop': 949},
            {'name': 'आम्बाखेड़ा', 'parts': '', 'pop': 369},
            {'name': 'तेज्याखेड़ी', 'parts': '', 'pop': 376},
            {'name': 'खुटियांखेड़ा', 'parts': '', 'pop': 325}
          ]
        },
        'देवरिया': {
          'wards': 7,
          'pop': 2902,
          'villages': [
            {'name': 'देवरिया', 'parts': '', 'pop': 2902},
            {'name': 'मानपुरा', 'parts': '', 'pop': 0}
          ]
        },
        'कोट': {
          'wards': 9,
          'pop': 3063,
          'villages': [
            {'name': 'कोट', 'parts': '', 'pop': 2001},
            {'name': 'छातोल', 'parts': '', 'pop': 411},
            {'name': 'मेरनियाखेड़ा', 'parts': '', 'pop': 651}
          ]
        },
        'बागड़': {
          'wards': 9,
          'pop': 3261,
          'villages': [
            {'name': 'बागड़', 'parts': '', 'pop': 1199},
            {'name': 'मंडी', 'parts': '', 'pop': 493},
            {'name': 'मियाला', 'parts': '', 'pop': 854},
            {'name': 'जलामली', 'parts': '', 'pop': 546},
            {'name': 'कारोल', 'parts': '', 'pop': 169}
          ]
        },
        'रायपुर': {
          'wards': 17,
          'pop': 7372,
          'villages': [
            {'name': 'रायपुर', 'parts': '', 'pop': 7372},
            {'name': 'सुरजपुरा', 'parts': '', 'pop': 0}
          ]
        },
      }
    },
    'सहाड़ा': {
      'icon': Icons.location_city_rounded,
      'color': Color(0xff059669),
      'gpCount': 22,
      'villageCount': 85,
      'panchayats': {
        'पोटलां': {
          'wards': 11,
          'pop': 5459,
          'villages': [
            {'name': 'पोटलां', 'parts': '158, 159, 160, 161, 162, 163, 164', 'pop': 5459}
          ]
        },
        'लाखोला': {
          'wards': 9,
          'pop': 3763,
          'villages': [
            {'name': 'लाखोला', 'parts': '165, 166, 167, 168, 169, 170, 171', 'pop': 3763}
          ]
        },
        'सहाड़ा': {
          'wards': 9,
          'pop': 3576,
          'villages': [
            {'name': 'सहाड़ा', 'parts': '172, 173, 174, 175, 176, 177', 'pop': 3576}
          ]
        },
        'खांखला': {
          'wards': 9,
          'pop': 2462,
          'villages': [
            {'name': 'खांखला', 'parts': '126, 127, 128, 129', 'pop': 2462}
          ]
        },
        'अरनिया': {
          'wards': 9,
          'pop': 2420,
          'villages': [
            {'name': 'अरनिया', 'parts': '130, 131, 132, 133, 134', 'pop': 2420}
          ]
        },
        'उल्लाई': {
          'wards': 9,
          'pop': 2279,
          'villages': [
            {'name': 'उल्लाई', 'parts': '135, 136, 137, 138', 'pop': 2279}
          ]
        },
        'भूणास': {
          'wards': 9,
          'pop': 2263,
          'villages': [
            {'name': 'भूणास', 'parts': '195, 196, 197, 198, 199', 'pop': 2263}
          ]
        },
        'महेन्द्र गढ़': {
          'wards': 9,
          'pop': 2113,
          'villages': [
            {'name': 'महेन्द्र गढ़', 'parts': '143, 144, 145, 146, 147', 'pop': 2113}
          ]
        },
        'रायथलियास': {
          'wards': 7,
          'pop': 1435,
          'villages': [
            {'name': 'रायथलियास', 'parts': '148, 149, 150', 'pop': 1435}
          ]
        },
        'गलोदिया': {
          'wards': 9,
          'pop': 1850,
          'villages': [
            {'name': 'गलोदिया', 'parts': '208, 209, 210, 211, 212', 'pop': 1850}
          ]
        },
        'सांगवा': {
          'wards': 9,
          'pop': 1750,
          'villages': [
            {'name': 'सांगवा', 'parts': '205, 206, 207', 'pop': 1750}
          ]
        },
        'समोडी': {
          'wards': 9,
          'pop': 1600,
          'villages': [
            {'name': 'समोडी', 'parts': '230, 231, 232', 'pop': 1600}
          ]
        },
        'बांसड़ा': {
          'wards': 7,
          'pop': 1400,
          'villages': [
            {'name': 'बांसड़ा', 'parts': '223, 224, 225', 'pop': 1400}
          ]
        },
        'सुन्दरपुरा': {
          'wards': 7,
          'pop': 1350,
          'villages': [
            {'name': 'सुन्दरपुरा', 'parts': '233, 234, 235', 'pop': 1350}
          ]
        },
        'जवासिया': {
          'wards': 7,
          'pop': 1300,
          'villages': [
            {'name': 'जवासिया', 'parts': '242, 243, 244', 'pop': 1300}
          ]
        },
        'दुदिया': {
          'wards': 7,
          'pop': 1250,
          'villages': [
            {'name': 'दुदिया', 'parts': '239, 240, 241', 'pop': 1250}
          ]
        },
      }
    },
    'सुवाणा': {
      'icon': Icons.nature_people_rounded,
      'color': Color(0xff7c3aed),
      'gpCount': 19,
      'villageCount': 68,
      'panchayats': {
        'बीलिया कलां': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'बीलिया कलां', 'parts': '', 'pop': 0},
            {'name': 'नारायणपुरा', 'parts': '', 'pop': 0}
          ]
        },
        'दरीबा': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'दरीबा', 'parts': '', 'pop': 0},
            {'name': 'सालमपुरा', 'parts': '', 'pop': 0}
          ]
        },
        'कोटडी': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'कोटडी', 'parts': '', 'pop': 0},
            {'name': 'समोडी', 'parts': '', 'pop': 0},
            {'name': 'बालोदिया', 'parts': '', 'pop': 0},
            {'name': 'कवलियास', 'parts': '', 'pop': 0}
          ]
        },
        'कवलियास': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'कवलियास', 'parts': '', 'pop': 0},
            {'name': 'सरेवडी', 'parts': '', 'pop': 0}
          ]
        },
        'कुवारिया': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'कुवारिया', 'parts': '', 'pop': 0}
          ]
        },
        'मांडल': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'मांडल', 'parts': '', 'pop': 0}
          ]
        },
        'महेन्द्रगढ़': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'महेन्द्रगढ़', 'parts': '', 'pop': 0}
          ]
        },
        'पीपली': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'पीपली', 'parts': '', 'pop': 0}
          ]
        },
        'रायपुरिया': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'रायपुरिया', 'parts': '', 'pop': 0}
          ]
        },
        'रूपहेली': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'रूपहेली', 'parts': '', 'pop': 0}
          ]
        },
        'सांगानेर': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'सांगानेर', 'parts': '', 'pop': 0}
          ]
        },
        'सवाईपुर': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'सवाईपुर', 'parts': '', 'pop': 0}
          ]
        },
        'सोनियाणा': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'सोनियाणा', 'parts': '', 'pop': 0}
          ]
        },
        'सुवाणा': {
          'wards': 9,
          'pop': 3000,
          'villages': [
            {'name': 'सुवाणा', 'parts': '', 'pop': 0}
          ]
        }
      }
    },
    'गंगापुर (नगरपालिका)': {
      'icon': Icons.apartment_rounded,
      'color': Color(0xffea580c),
      'gpCount': 35,
      'villageCount': 35,
      'panchayats': {
        'गंगापुर शहरी': {
          'wards': 35,
          'pop': 35000,
          'villages': [
            {'name': 'वार्ड 1', 'parts': 'वार्ड 1', 'pop': 1000},
            {'name': 'वार्ड 2', 'parts': 'वार्ड 2', 'pop': 1000},
            {'name': 'वार्ड 3', 'parts': 'वार्ड 3', 'pop': 1000},
            {'name': 'वार्ड 4', 'parts': 'वार्ड 4', 'pop': 1000},
            {'name': 'वार्ड 5', 'parts': 'वार्ड 5', 'pop': 1000},
            {'name': 'वार्ड 6', 'parts': 'वार्ड 6', 'pop': 1000},
            {'name': 'वार्ड 7', 'parts': 'वार्ड 7', 'pop': 1000},
            {'name': 'वार्ड 8', 'parts': 'वार्ड 8', 'pop': 1000},
            {'name': 'वार्ड 9', 'parts': 'वार्ड 9', 'pop': 1000},
            {'name': 'वार्ड 10', 'parts': 'वार्ड 10', 'pop': 1000},
            {'name': 'वार्ड 11', 'parts': 'वार्ड 11', 'pop': 1000},
            {'name': 'वार्ड 12', 'parts': 'वार्ड 12', 'pop': 1000},
            {'name': 'वार्ड 13', 'parts': 'वार्ड 13', 'pop': 1000},
            {'name': 'वार्ड 14', 'parts': 'वार्ड 14', 'pop': 1000},
            {'name': 'वार्ड 15', 'parts': 'वार्ड 15', 'pop': 1000},
            {'name': 'वार्ड 16', 'parts': 'वार्ड 16', 'pop': 1000},
            {'name': 'वार्ड 17', 'parts': 'वार्ड 17', 'pop': 1000},
            {'name': 'वार्ड 18', 'parts': 'वार्ड 18', 'pop': 1000},
            {'name': 'वार्ड 19', 'parts': 'वार्ड 19', 'pop': 1000},
            {'name': 'वार्ड 20', 'parts': 'वार्ड 20', 'pop': 1000},
            {'name': 'वार्ड 21', 'parts': 'वार्ड 21', 'pop': 1000},
            {'name': 'वार्ड 22', 'parts': 'वार्ड 22', 'pop': 1000},
            {'name': 'वार्ड 23', 'parts': 'वार्ड 23', 'pop': 1000},
            {'name': 'वार्ड 24', 'parts': 'वार्ड 24', 'pop': 1000},
            {'name': 'वार्ड 25', 'parts': 'वार्ड 25', 'pop': 1000},
            {'name': 'वार्ड 26', 'parts': 'वार्ड 26', 'pop': 1000},
            {'name': 'वार्ड 27', 'parts': 'वार्ड 27', 'pop': 1000},
            {'name': 'वार्ड 28', 'parts': 'वार्ड 28', 'pop': 1000},
            {'name': 'वार्ड 29', 'parts': 'वार्ड 29', 'pop': 1000},
            {'name': 'वार्ड 30', 'parts': 'वार्ड 30', 'pop': 1000},
            {'name': 'वार्ड 31', 'parts': 'वार्ड 31', 'pop': 1000},
            {'name': 'वार्ड 32', 'parts': 'वार्ड 32', 'pop': 1000},
            {'name': 'वार्ड 33', 'parts': 'वार्ड 33', 'pop': 1000},
            {'name': 'वार्ड 34', 'parts': 'वार्ड 34', 'pop': 1000},
            {'name': 'वार्ड 35', 'parts': 'वार्ड 35', 'pop': 1000},
          ]
        }
      }
    }
  };

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  void _openVoters({
    String? village,
    String? gramPanchayat,
    String? tehsil,
    String? ward,
    String? partNumber,
  }) {
    String titleText = '';
    if (partNumber != null && partNumber.isNotEmpty) {
      titleText = 'भाग #$partNumber ${village != null ? '($village)' : (gramPanchayat != null ? '($gramPanchayat)' : '')}';
    } else if (village != null && village.isNotEmpty) {
      titleText = 'गाँव: $village';
    } else if (gramPanchayat != null && gramPanchayat.isNotEmpty) {
      titleText = ward != null ? '$gramPanchayat (वार्ड $ward)' : 'पंचायत: $gramPanchayat';
    } else {
      titleText = tehsil ?? 'मतदाता सूची';
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(
            title: Text(titleText),
          ),
          body: VoterManagementPage(
            initialVillage: village,
            initialGramPanchayat: village != null ? null : gramPanchayat,
            initialWard: ward,
            initialPartNumber: partNumber,
            initialTehsil: (village != null || gramPanchayat != null || (partNumber != null && partNumber.isNotEmpty)) ? null : tehsil,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final curData = samitiData[selectedSamiti] ?? samitiData['रायपुर']!;
    final panchayatsMap = curData['panchayats'] as Map<String, dynamic>;

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
      appBar: AppBar(
        title: const Text('क्षेत्र व गाँव (पंचायत समिति)'),
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: search,
                    onChanged: (val) => setState(() => query = val),
                    decoration: InputDecoration(
                      hintText: 'ग्राम पंचायत या गाँव खोजें...',
                      prefixIcon: const Icon(Icons.search_rounded, color: muted),
                      suffixIcon: query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18),
                              onPressed: () {
                                search.clear();
                                setState(() => query = '');
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

                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: samitiData.entries.map((e) {
                        final isSelected = selectedSamiti == e.key;
                        final color = e.value['color'] as Color;
                        final icon = e.value['icon'] as IconData;

                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            avatar: Icon(icon, size: 18, color: isSelected ? Colors.white : color),
                            label: Text(e.key),
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
                  const SizedBox(height: 14),

                  InkWell(
                    onTap: () => _openVoters(tehsil: selectedSamiti),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: (curData['color'] as Color).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: (curData['color'] as Color).withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.groups_rounded, color: curData['color'] as Color, size: 22),
                          const SizedBox(width: 10),
                          Text(
                            '👥 पूरी $selectedSamiti के सभी मतदाता देखें',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: curData['color'] as Color,
                            ),
                          ),
                          const Spacer(),
                          Icon(Icons.arrow_forward_ios_rounded, size: 14, color: curData['color'] as Color),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),

          filteredPanchayats.isEmpty
              ? const SliverFillRemaining(
                  child: Center(
                    child: Text(
                      'कोई पंचायत या गाँव नहीं मिला',
                      style: TextStyle(color: muted, fontWeight: FontWeight.w700),
                    ),
                  ),
                )
              : SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                  sliver: SliverList(
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
                              subtitle: Builder(builder: (context) {
                                final gpInfo = panchayatsMap[gpName] as Map<String, dynamic>? ?? {};
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
                                    final gpInfo = panchayatsMap[gpName] as Map<String, dynamic>? ?? {};
                                    final wardCount = gpInfo['wards'] as int? ?? 0;
                                    final gpParts = getGpParts(gpName);

                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Divider(color: border, height: 1),
                                        const SizedBox(height: 8),

                                        // 1. पूरी पंचायत के सभी मतदाता देखें
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

                                        // 2. भागवार व वार्डवार क्विक चिप्स (Clean Horizontal Filter Sections)
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
                                          SingleChildScrollView(
                                            scrollDirection: Axis.horizontal,
                                            child: Row(
                                              children: List.generate(wardCount, (wIdx) {
                                                final wNum = '${wIdx + 1}';
                                                return Padding(
                                                  padding: const EdgeInsets.only(right: 6),
                                                  child: ActionChip(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                    visualDensity: VisualDensity.compact,
                                                    label: Text('वार्ड $wNum', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: navy)),
                                                    backgroundColor: Colors.white,
                                                    side: const BorderSide(color: border),
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                    onPressed: () => _openVoters(gramPanchayat: gpName, ward: wNum),
                                                  ),
                                                );
                                              }),
                                            ),
                                          ),
                                          const SizedBox(height: 14),
                                        ],

                                        // 3. सम्मिलित राजस्व गाँव व बूथ (Clean Spacious Village Cards)
                                        Row(
                                          children: [
                                            const Icon(Icons.location_city_rounded, size: 14, color: navy),
                                            const SizedBox(width: 6),
                                            Text(
                                              'सम्मिलित राजस्व गाँव व बूथ (${villages.length}):',
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),

                                        ...villages.map((v) {
                                          final vName = v['name'] as String;
                                          final pop = v['pop'] as int? ?? 0;

                                          // Match parts for this village
                                          final vClean = vName.trim().toLowerCase();
                                          final matchedParts = gpParts.where((p) {
                                            final vList = (p['villages'] as List? ?? []).map((e) => e.toString().trim().toLowerCase()).toList();
                                            return vList.any((vill) => vill.contains(vClean) || vClean.contains(vill));
                                          }).toList();

                                          final matchedPartNums = matchedParts.map((p) => '${p['partNumber']}').toList();

                                          return Container(
                                            margin: const EdgeInsets.only(bottom: 8),
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(color: border.withValues(alpha: 0.8)),
                                              boxShadow: [
                                                BoxShadow(
                                                  color: Colors.black.withValues(alpha: 0.02),
                                                  blurRadius: 4,
                                                  offset: const Offset(0, 1),
                                                ),
                                              ],
                                            ),
                                            child: Row(
                                              crossAxisAlignment: CrossAxisAlignment.center,
                                              children: [
                                                Container(
                                                  width: 36,
                                                  height: 36,
                                                  decoration: BoxDecoration(
                                                    color: matchedPartNums.isNotEmpty ? const Color(0xffeff6ff) : const Color(0xfff8fafc),
                                                    shape: BoxShape.circle,
                                                  ),
                                                  alignment: Alignment.center,
                                                  child: Icon(
                                                    Icons.location_on_rounded,
                                                    color: matchedPartNums.isNotEmpty ? blue : muted,
                                                    size: 18,
                                                  ),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Row(
                                                        children: [
                                                          Flexible(
                                                            child: Text(
                                                              vName,
                                                              style: const TextStyle(
                                                                fontWeight: FontWeight.w800,
                                                                fontSize: 14,
                                                                color: navy,
                                                              ),
                                                              overflow: TextOverflow.ellipsis,
                                                            ),
                                                          ),
                                                          if (matchedPartNums.isNotEmpty) ...[
                                                            const SizedBox(width: 6),
                                                            Container(
                                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                              decoration: BoxDecoration(
                                                                color: orange.withValues(alpha: 0.12),
                                                                borderRadius: BorderRadius.circular(6),
                                                                border: Border.all(color: orange.withValues(alpha: 0.3)),
                                                              ),
                                                              child: Text(
                                                                matchedPartNums.length <= 2
                                                                    ? 'भाग ${matchedPartNums.map((n) => "#$n").join(", ")}'
                                                                    : '${matchedPartNums.length} भाग / बूथ',
                                                                style: const TextStyle(
                                                                  fontSize: 10,
                                                                  fontWeight: FontWeight.w900,
                                                                  color: orange,
                                                                ),
                                                              ),
                                                            ),
                                                          ],
                                                        ],
                                                      ),
                                                      const SizedBox(height: 3),
                                                      Text(
                                                        matchedPartNums.length > 2
                                                            ? 'बूथ: भाग #${matchedPartNums.first} से #${matchedPartNums.last} (${matchedPartNums.length} बूथ) ${pop > 0 ? "• जनसंख्या: $pop" : ""}'
                                                            : (matchedPartNums.isNotEmpty
                                                                ? 'बूथ: भाग ${matchedPartNums.map((n) => "#$n").join(", ")} ${pop > 0 ? "• जनसंख्या: $pop" : ""}'
                                                                : (pop > 0 ? 'जनसंख्या: $pop' : 'ग्राम पंचायत $gpName')),
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                        style: const TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w600),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                FilledButton.tonal(
                                                  style: FilledButton.styleFrom(
                                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                    visualDensity: VisualDensity.compact,
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                  ),
                                                  onPressed: () => _openVoters(
                                                    village: vName,
                                                    gramPanchayat: gpName,
                                                    partNumber: matchedPartNums.length == 1 ? matchedPartNums.first : null,
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
      ),
    );
  }
}
