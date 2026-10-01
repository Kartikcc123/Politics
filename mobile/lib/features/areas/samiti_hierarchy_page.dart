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
      'villageCount': 102,
      'panchayats': {
        'भीटा': {
          'wards': 11,
          'pop': 4872,
          'villages': [
            {'name': 'भीटा', 'parts': '', 'pop': 1231},
            {'name': 'सेमलाट', 'parts': '', 'pop': 57},
            {'name': 'रूपाखेडा', 'parts': '', 'pop': 619},
            {'name': 'सरेवडी', 'parts': '', 'pop': 1191},
            {'name': 'सरेवडी का बाडीया', 'parts': '', 'pop': 0},
            {'name': 'जोरावरपुरा', 'parts': '', 'pop': 315},
            {'name': 'भटेवर', 'parts': 'भाग 4', 'pop': 1459},
          ]
        },
        'कलाल खेडी': {
          'wards': 7,
          'pop': 2868,
          'villages': [
            {'name': 'थोरियाखेडी', 'parts': '', 'pop': 711},
            {'name': 'कलाल खेडी', 'parts': '', 'pop': 918},
            {'name': 'बाडी', 'parts': '', 'pop': 1239},
          ]
        },
        'पीथा का खेड़ा': {
          'wards': 11,
          'pop': 4354,
          'villages': [
            {'name': 'पीथा का खेड़ा', 'parts': '', 'pop': 1140},
            {'name': 'मंडोल', 'parts': '', 'pop': 619},
            {'name': 'ढिकाणी', 'parts': '', 'pop': 148},
            {'name': 'रामा', 'parts': 'भाग 8', 'pop': 1171},
            {'name': 'लडकी', 'parts': '', 'pop': 1276},
          ]
        },
        'खेमाणा': {
          'wards': 9,
          'pop': 2709,
          'villages': [
            {'name': 'खेमाणा', 'parts': 'भाग 37, भाग 38', 'pop': 2327},
            {'name': 'खरडाया', 'parts': '', 'pop': 0},
            {'name': 'थोरियाखेडा', 'parts': '', 'pop': 382},
          ]
        },
        'चारोट': {
          'wards': 7,
          'pop': 2926,
          'villages': [
            {'name': 'चारोट', 'parts': 'भाग 35, भाग 36', 'pop': 904},
            {'name': 'आसुणा', 'parts': '', 'pop': 715},
            {'name': 'गोविन्दपुरा', 'parts': '', 'pop': 431},
            {'name': 'किशोरपुरा', 'parts': '', 'pop': 251},
            {'name': 'सिंहपुरा', 'parts': 'भाग 29', 'pop': 625},
          ]
        },
        'गल्यावडी': {
          'wards': 7,
          'pop': 2791,
          'villages': [
            {'name': 'गल्यावडी', 'parts': '', 'pop': 1652},
            {'name': 'केमुनिया', 'parts': '', 'pop': 561},
            {'name': 'पचातरों का खेडा', 'parts': '', 'pop': 578},
          ]
        },
        'खाखरमाला': {
          'wards': 7,
          'pop': 2837,
          'villages': [
            {'name': 'रेबारियो की ढ़ाणी', 'parts': '', 'pop': 400},
            {'name': 'खाखरमाला', 'parts': 'भाग 18', 'pop': 603},
            {'name': 'नान्दुडा', 'parts': '', 'pop': 275},
            {'name': 'टुंगच', 'parts': '', 'pop': 1035},
            {'name': 'सिंरोडी', 'parts': '', 'pop': 524},
          ]
        },
        'गलवा': {
          'wards': 7,
          'pop': 2896,
          'villages': [
            {'name': 'गलवा', 'parts': 'भाग 33, भाग 34', 'pop': 1555},
            {'name': 'सज्जनपुरा', 'parts': '', 'pop': 0},
            {'name': 'रालीखेडा', 'parts': '', 'pop': 308},
            {'name': 'लाठियाखेडी', 'parts': '', 'pop': 217},
            {'name': 'टोकरा', 'parts': 'भाग 28', 'pop': 816},
            {'name': 'रतनपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'मौखुन्दा': {
          'wards': 9,
          'pop': 3327,
          'villages': [
            {'name': 'मौखुन्दा', 'parts': '', 'pop': 2751},
            {'name': 'तेलीखेडा', 'parts': '', 'pop': 0},
            {'name': 'माण्डकाखेडा', 'parts': '', 'pop': 576},
          ]
        },
        'मासिंगपुरा': {
          'wards': 7,
          'pop': 2797,
          'villages': [
            {'name': 'मासिंगपुरा', 'parts': 'भाग 22', 'pop': 1250},
            {'name': 'डांगडा', 'parts': '', 'pop': 380},
            {'name': 'डांगडी', 'parts': '', 'pop': 779},
            {'name': 'ठिकरिया', 'parts': '', 'pop': 388},
          ]
        },
        'झडोल': {
          'wards': 9,
          'pop': 3741,
          'villages': [
            {'name': 'झडोल', 'parts': '', 'pop': 3430},
            {'name': 'नयाखेड़ा', 'parts': '', 'pop': 311},
          ]
        },
        'नाहरी': {
          'wards': 9,
          'pop': 3050,
          'villages': [
            {'name': 'नाहरी', 'parts': 'भाग 85', 'pop': 3050},
            {'name': 'फतेहपुरा', 'parts': 'भाग 86, भाग 87', 'pop': 0},
            {'name': 'दुल्हेपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'पनोतिया': {
          'wards': 7,
          'pop': 2961,
          'villages': [
            {'name': 'पनोतिया', 'parts': '', 'pop': 1666},
            {'name': 'जोगरास', 'parts': 'भाग 83, भाग 84', 'pop': 1295},
          ]
        },
        'नाथडियास': {
          'wards': 7,
          'pop': 2999,
          'villages': [
            {'name': 'नाथडियास', 'parts': '', 'pop': 2362},
            {'name': 'मोटरों का खेडा', 'parts': '', 'pop': 0},
            {'name': 'आसपुर', 'parts': 'भाग 81', 'pop': 637},
          ]
        },
        'थला': {
          'wards': 9,
          'pop': 3651,
          'villages': [
            {'name': 'थला', 'parts': '', 'pop': 1980},
            {'name': 'मोखमपुरा', 'parts': 'भाग 79', 'pop': 1114},
            {'name': 'पिथलपुरा', 'parts': '', 'pop': 557},
          ]
        },
        'सुरास': {
          'wards': 7,
          'pop': 2771,
          'villages': [
            {'name': 'सुरास', 'parts': 'भाग 53, भाग 54', 'pop': 1179},
            {'name': 'लक्ष्मीपुरा', 'parts': '', 'pop': 0},
            {'name': 'धुलखेडा', 'parts': '', 'pop': 1387},
            {'name': 'भीलखेडी', 'parts': '', 'pop': 205},
          ]
        },
        'बागोलिया': {
          'wards': 9,
          'pop': 3144,
          'villages': [
            {'name': 'बागोलिया', 'parts': 'भाग 56, भाग 57', 'pop': 1444},
            {'name': 'अर्जुनगढ', 'parts': '', 'pop': 128},
            {'name': 'गाडरीखेडा', 'parts': '', 'pop': 852},
            {'name': 'पाटियाखेडा', 'parts': '', 'pop': 720},
          ]
        },
        'पालरां': {
          'wards': 7,
          'pop': 2685,
          'villages': [
            {'name': 'पालरां', 'parts': 'भाग 39, भाग 40', 'pop': 2346},
            {'name': 'खाननिया', 'parts': '', 'pop': 339},
          ]
        },
        'बोराणा': {
          'wards': 11,
          'pop': 4616,
          'villages': [
            {'name': 'बोराणा', 'parts': 'भाग 44, भाग 45, भाग 46, भाग 47', 'pop': 4616},
          ]
        },
        'आशाहोली': {
          'wards': 9,
          'pop': 3156,
          'villages': [
            {'name': 'आशाहोली', 'parts': 'भाग 93, भाग 94', 'pop': 3156},
          ]
        },
        'बकाण': {
          'wards': 7,
          'pop': 2715,
          'villages': [
            {'name': 'बकाण', 'parts': '', 'pop': 475},
            {'name': 'लखाहोली', 'parts': '', 'pop': 808},
            {'name': 'राणास', 'parts': '', 'pop': 1039},
            {'name': 'दियास', 'parts': '', 'pop': 393},
          ]
        },
        'नान्दशा जागीर': {
          'wards': 11,
          'pop': 4264,
          'villages': [
            {'name': 'नान्दशा जागीर', 'parts': 'भाग 74', 'pop': 2265},
            {'name': 'परबती', 'parts': '', 'pop': 544},
            {'name': 'बाडियाकलां', 'parts': '', 'pop': 590},
            {'name': 'बाडियाखुर्द', 'parts': '', 'pop': 865},
          ]
        },
        'बोरियापुरा': {
          'wards': 7,
          'pop': 2491,
          'villages': [
            {'name': 'बोरियापुरा', 'parts': '', 'pop': 1547},
            {'name': 'रेवाडा', 'parts': '', 'pop': 629},
            {'name': 'शिवनाथपुरा', 'parts': '', 'pop': 315},
            {'name': 'तोलास', 'parts': '', 'pop': 0},
          ]
        },
        'सगरेव': {
          'wards': 9,
          'pop': 3601,
          'villages': [
            {'name': 'सगरेव', 'parts': 'भाग 62, भाग 63', 'pop': 3087},
            {'name': 'नयाखेड़ा जाटान्', 'parts': '', 'pop': 0},
            {'name': 'जगपुरा', 'parts': '', 'pop': 514},
          ]
        },
        'नारायणखेड़ा': {
          'wards': 9,
          'pop': 3049,
          'villages': [
            {'name': 'नारायणखेड़ा', 'parts': '', 'pop': 828},
            {'name': 'सरंगु', 'parts': '', 'pop': 202},
            {'name': 'खुटिया', 'parts': '', 'pop': 949},
            {'name': 'आम्बाखेड़ा', 'parts': '', 'pop': 369},
            {'name': 'तेल्याखेड़ी', 'parts': '', 'pop': 376},
            {'name': 'खुटियाखेड़ा', 'parts': '', 'pop': 325},
          ]
        },
        'देवरिया': {
          'wards': 7,
          'pop': 2902,
          'villages': [
            {'name': 'देवरिया', 'parts': 'भाग 30, भाग 31, भाग 32', 'pop': 2902},
            {'name': 'मानपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'कोट': {
          'wards': 9,
          'pop': 3063,
          'villages': [
            {'name': 'कोट', 'parts': 'भाग 14, भाग 15', 'pop': 2001},
            {'name': 'छातोल', 'parts': 'भाग 10', 'pop': 411},
            {'name': 'मेरनियाखेड़ा', 'parts': '', 'pop': 651},
          ]
        },
        'बागड़': {
          'wards': 9,
          'pop': 3261,
          'villages': [
            {'name': 'बागड़', 'parts': '', 'pop': 1199},
            {'name': 'मंडी', 'parts': '', 'pop': 493},
            {'name': 'मियाला', 'parts': 'भाग 11', 'pop': 854},
            {'name': 'जलामली', 'parts': '', 'pop': 546},
            {'name': 'कारोल', 'parts': '', 'pop': 169},
          ]
        },
        'रायपुर': {
          'wards': 17,
          'pop': 7372,
          'villages': [
            {'name': 'रायपुर', 'parts': 'भाग 64, भाग 65, भाग 66, भाग 67, भाग 68, भाग 69', 'pop': 7372},
            {'name': 'सुरजपुरा', 'parts': '', 'pop': 0},
          ]
        },
      }
    },
    'सहाड़ा': {
      'icon': Icons.location_city_rounded,
      'color': Color(0xff059669),
      'gpCount': 30,
      'villageCount': 115,
      'panchayats': {
        'आमली': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'आमली', 'parts': 'भाग 101, भाग 102, भाग 103', 'pop': 0},
            {'name': 'बालाजी नगर', 'parts': '', 'pop': 0},
            {'name': 'रामरतन नगर', 'parts': '', 'pop': 0},
            {'name': 'संतोष नगर', 'parts': '', 'pop': 0},
          ]
        },
        'चीडखेडा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'चीडखेडा', 'parts': '', 'pop': 0},
            {'name': 'अडसीपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'उम्मेदपुरा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'उम्मेदपुरा', 'parts': '', 'pop': 0},
            {'name': 'आटावाडा', 'parts': '', 'pop': 0},
            {'name': 'निमखेडा', 'parts': '', 'pop': 0},
            {'name': 'अरनिया जागीर', 'parts': '', 'pop': 0},
            {'name': 'कैलाशपुरी', 'parts': '', 'pop': 0},
            {'name': 'पालरा', 'parts': '', 'pop': 0},
            {'name': 'सुरत सिंह जी का खेडा', 'parts': '', 'pop': 0},
          ]
        },
        'कोशीथल': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'कोशीथल', 'parts': '', 'pop': 0},
            {'name': 'अरनोटा', 'parts': '', 'pop': 0},
          ]
        },
        'चावण्डिया': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'मटुनिया', 'parts': '', 'pop': 0},
            {'name': 'चावण्डिया', 'parts': '', 'pop': 0},
            {'name': 'ठेकला', 'parts': '', 'pop': 0},
            {'name': 'भुतेला', 'parts': '', 'pop': 0},
          ]
        },
        'उल्लाई': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'उल्लाई', 'parts': '', 'pop': 0},
            {'name': 'रूपारेल', 'parts': '', 'pop': 0},
            {'name': 'जादुखेडा', 'parts': '', 'pop': 0},
            {'name': 'हरिपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'कांगणी': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'कांगणी', 'parts': '', 'pop': 0},
            {'name': 'गाडरीखेडा', 'parts': '', 'pop': 0},
            {'name': 'सिरोही खेडा', 'parts': '', 'pop': 0},
            {'name': 'उदलियास', 'parts': '', 'pop': 0},
            {'name': 'गुमानपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'सालेरा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'जयसिंहपुरा', 'parts': '', 'pop': 0},
            {'name': 'विजयपुरा', 'parts': '', 'pop': 0},
            {'name': 'सालेरा', 'parts': '', 'pop': 0},
            {'name': 'रतनपुरा', 'parts': '', 'pop': 0},
            {'name': 'गिरडिया', 'parts': '', 'pop': 0},
            {'name': 'हाडिया खेडी', 'parts': '', 'pop': 0},
          ]
        },
        'गोवलिया': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'गोवलिया', 'parts': '', 'pop': 0},
            {'name': 'खजुरिया', 'parts': '', 'pop': 0},
            {'name': 'कालाखेडा', 'parts': '', 'pop': 0},
            {'name': 'गोवलिया का खेडा', 'parts': '', 'pop': 0},
            {'name': 'भगवानपुरा', 'parts': '', 'pop': 0},
            {'name': 'रूपपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'नेगडिया खेडा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'नेगडिया खेडा', 'parts': '', 'pop': 0},
            {'name': 'छापरी', 'parts': '', 'pop': 0},
            {'name': 'फूखिया', 'parts': '', 'pop': 0},
            {'name': 'अर्जुनपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'खांखला': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'खांखला', 'parts': '', 'pop': 0},
            {'name': 'ममता नगर', 'parts': '', 'pop': 0},
            {'name': 'गुजरिया खेडा', 'parts': '', 'pop': 0},
          ]
        },
        'सातलियास': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सातलियास', 'parts': '', 'pop': 0},
            {'name': 'गणेशपुरा खालशा', 'parts': '', 'pop': 0},
            {'name': 'टपरिया खेडी', 'parts': '', 'pop': 0},
            {'name': 'मेहन्दी', 'parts': '', 'pop': 0},
            {'name': 'सांगास', 'parts': '', 'pop': 0},
            {'name': 'दियास', 'parts': '', 'pop': 0},
            {'name': 'करणजी की खेडी', 'parts': '', 'pop': 0},
          ]
        },
        'माझावास': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'माझावास', 'parts': '', 'pop': 0},
            {'name': 'रायथलियास', 'parts': '', 'pop': 0},
            {'name': 'सुलतानपुरा', 'parts': '', 'pop': 0},
            {'name': 'रंगीला', 'parts': '', 'pop': 0},
          ]
        },
        'सुरावास': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सुरावास', 'parts': '', 'pop': 0},
            {'name': 'धागंडास', 'parts': '', 'pop': 0},
            {'name': 'उम्मेदपुरा', 'parts': '', 'pop': 0},
            {'name': 'मण्डपिया', 'parts': '', 'pop': 0},
          ]
        },
        'पोटलां': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'पोटलां', 'parts': '', 'pop': 0},
          ]
        },
        'सरगांव': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सरगांव', 'parts': '', 'pop': 0},
            {'name': 'तिरोली', 'parts': '', 'pop': 0},
            {'name': 'लक्ष्मीपुरा', 'parts': '', 'pop': 0},
            {'name': 'टोडी', 'parts': '', 'pop': 0},
          ]
        },
        'भरक': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'भरक', 'parts': '', 'pop': 0},
            {'name': 'पिछोरिया खेडा', 'parts': '', 'pop': 0},
            {'name': 'आलोली', 'parts': '', 'pop': 0},
          ]
        },
        'सहाडा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सहाडा', 'parts': '', 'pop': 0},
            {'name': 'शंकरपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'डेलाना': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'डेलाना', 'parts': '', 'pop': 0},
            {'name': 'कालीमंगरी', 'parts': '', 'pop': 0},
            {'name': 'खातीखेडा', 'parts': '', 'pop': 0},
            {'name': 'रधुनाथपुरा', 'parts': '', 'pop': 0},
            {'name': 'माणकनगर', 'parts': '', 'pop': 0},
          ]
        },
        'नान्दशा खालसा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'नान्दशा खालसा', 'parts': '', 'pop': 0},
            {'name': 'झुमपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'शिवरती': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'शिवरती', 'parts': '', 'pop': 0},
            {'name': 'कालाढुंढा', 'parts': '', 'pop': 0},
            {'name': 'दरीबा', 'parts': '', 'pop': 0},
            {'name': 'सल्यावडी', 'parts': '', 'pop': 0},
          ]
        },
        'ढोसर': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'ढोसर', 'parts': '', 'pop': 0},
            {'name': 'गठीला', 'parts': '', 'pop': 0},
            {'name': 'गठीला खेडा', 'parts': '', 'pop': 0},
            {'name': 'बाधपुरा', 'parts': '', 'pop': 0},
            {'name': 'साकरिया', 'parts': '', 'pop': 0},
            {'name': 'सतढुंढिया', 'parts': '', 'pop': 0},
          ]
        },
        'गणेशपुरा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सुरजपुरा', 'parts': '', 'pop': 0},
            {'name': 'गणेशपुरा', 'parts': '', 'pop': 0},
            {'name': 'गलोदिया', 'parts': '', 'pop': 0},
            {'name': 'नाथ जी का खेडा', 'parts': '', 'pop': 0},
            {'name': 'गायत्री नगर', 'parts': '', 'pop': 0},
            {'name': 'श्रीराम नगर', 'parts': '', 'pop': 0},
            {'name': 'लखमनियास', 'parts': '', 'pop': 0},
          ]
        },
        'लाखोला': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'लाखोला', 'parts': '', 'pop': 0},
            {'name': 'नयाखेडा', 'parts': '', 'pop': 0},
            {'name': 'बघेरा', 'parts': '', 'pop': 0},
          ]
        },
        'गुढा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'गुढा', 'parts': '', 'pop': 0},
            {'name': 'गुढा खेडा', 'parts': '', 'pop': 0},
          ]
        },
        'अरनिया खालसा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'अरनिया खालसा', 'parts': '', 'pop': 0},
            {'name': 'रामपुरिया', 'parts': '', 'pop': 0},
            {'name': 'चमरसिंह जी का खेडा', 'parts': '', 'pop': 0},
            {'name': 'बिकराई', 'parts': '', 'pop': 0},
          ]
        },
        'सोनियाणा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सोनियाणा', 'parts': '', 'pop': 0},
            {'name': 'रामाखेडा', 'parts': '', 'pop': 0},
            {'name': 'झबरकिया', 'parts': '', 'pop': 0},
          ]
        },
        'भूणास': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'भूणास', 'parts': '', 'pop': 0},
            {'name': 'रामदेव नगर', 'parts': '', 'pop': 0},
            {'name': 'मेघरास', 'parts': '', 'pop': 0},
          ]
        },
        'मेघरास': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'माकडिया', 'parts': '', 'pop': 0},
            {'name': 'उंचकिया', 'parts': '', 'pop': 0},
          ]
        },
        'महेन्द्रगढ': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'महेन्द्रगढ', 'parts': '', 'pop': 0},
            {'name': 'पाबुनगर', 'parts': '', 'pop': 0},
          ]
        },
      }
    },
    'सुवाणा': {
      'icon': Icons.landscape_rounded,
      'color': Color(0xff7c3aed),
      'gpCount': 19,
      'villageCount': 68,
      'panchayats': {
        'बीलिया कलां': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'बीलिया कलां', 'parts': '', 'pop': 0},
            {'name': 'नारायणपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'दरीबा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'दरीबा', 'parts': '', 'pop': 0},
            {'name': 'सालमपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'कोटडी': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'कोटडी', 'parts': '', 'pop': 0},
            {'name': 'समोडी', 'parts': '', 'pop': 0},
            {'name': 'कीरतपुरा', 'parts': '', 'pop': 0},
            {'name': 'ईरास', 'parts': '', 'pop': 0},
          ]
        },
        'गुन्दली': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'गुन्दली', 'parts': '', 'pop': 0},
            {'name': 'दादीया', 'parts': '', 'pop': 0},
          ]
        },
        'ओझाघर': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'ओझाघर', 'parts': '', 'pop': 0},
            {'name': 'रायडा', 'parts': '', 'pop': 0},
            {'name': 'रघुनाथपुरा', 'parts': '', 'pop': 0},
            {'name': 'राजपुरा', 'parts': '', 'pop': 0},
            {'name': 'लापलियाखेडा', 'parts': '', 'pop': 0},
            {'name': 'टीलाखेडा', 'parts': '', 'pop': 0},
          ]
        },
        'सांगवा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सांगवा', 'parts': '', 'pop': 0},
            {'name': 'तिलोली', 'parts': '', 'pop': 0},
            {'name': 'एकलिंगपुरा', 'parts': '', 'pop': 0},
            {'name': 'आबाखेडी', 'parts': '', 'pop': 0},
            {'name': 'छापरी', 'parts': '', 'pop': 0},
          ]
        },
        'रामपुरिया': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'रामपुरिया', 'parts': '', 'pop': 0},
            {'name': 'बांसडा', 'parts': '', 'pop': 0},
            {'name': 'सुन्दरपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'कोचरिया': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'मण्डपिया', 'parts': '', 'pop': 0},
            {'name': 'कोचरिया', 'parts': '', 'pop': 0},
            {'name': 'रूपपुरा', 'parts': '', 'pop': 0},
            {'name': 'मुजरास', 'parts': '', 'pop': 0},
          ]
        },
        'कारोईकलां': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'कारोईकलां', 'parts': '', 'pop': 0},
            {'name': 'रतनपुरा', 'parts': '', 'pop': 0},
            {'name': 'कल्याणपुरा', 'parts': '', 'pop': 0},
            {'name': 'कारोईखुर्द', 'parts': '', 'pop': 0},
          ]
        },
        'मोमी': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'जागदरी', 'parts': '', 'pop': 0},
            {'name': 'पाबूनगर', 'parts': '', 'pop': 0},
            {'name': 'मोमी', 'parts': '', 'pop': 0},
            {'name': 'चावण्डरी', 'parts': '', 'pop': 0},
          ]
        },
        'सेथुरिया': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'चेनपुरा', 'parts': '', 'pop': 0},
            {'name': 'सैथुरिया', 'parts': '', 'pop': 0},
            {'name': 'केसरपुरा', 'parts': '', 'pop': 0},
            {'name': 'दांता', 'parts': '', 'pop': 0},
          ]
        },
        'सोपुरा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'गोवलिया', 'parts': '', 'pop': 0},
            {'name': 'कानपुरा', 'parts': '', 'pop': 0},
            {'name': 'सोपुरा', 'parts': '', 'pop': 0},
            {'name': 'तगडीया', 'parts': '', 'pop': 0},
            {'name': 'कैलाशपुरी', 'parts': '', 'pop': 0},
          ]
        },
        'गुरलां': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'गुरला', 'parts': '', 'pop': 0},
            {'name': 'पार्वतीपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'भोपालगढ': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'भोपालगढ', 'parts': '', 'pop': 0},
            {'name': 'ढोलीखेडा', 'parts': '', 'pop': 0},
            {'name': 'नौगांवा', 'parts': '', 'pop': 0},
          ]
        },
        'दूडिया': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'दुडिया', 'parts': '', 'pop': 0},
            {'name': 'खेत हजारिया', 'parts': '', 'pop': 0},
            {'name': 'जवासिया', 'parts': '', 'pop': 0},
            {'name': 'सायला', 'parts': '', 'pop': 0},
          ]
        },
        'आमली पुरावतन': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'शिवपुरा', 'parts': '', 'pop': 0},
            {'name': 'आमली पुरावतन', 'parts': '', 'pop': 0},
            {'name': 'छाछेडी', 'parts': '', 'pop': 0},
          ]
        },
        'ओज्याडा': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'सगतपुरिया', 'parts': '', 'pop': 0},
            {'name': 'ओज्याडा', 'parts': '', 'pop': 0},
          ]
        },
        'बरडोद': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'मोहनपुरा', 'parts': '', 'pop': 0},
            {'name': 'बरडोद', 'parts': '', 'pop': 0},
            {'name': 'कान्याखेडी', 'parts': '', 'pop': 0},
            {'name': 'तख्तपुरा', 'parts': '', 'pop': 0},
          ]
        },
        'खैराबाद': {
          'wards': 0,
          'pop': 0,
          'villages': [
            {'name': 'खैराबाद', 'parts': '', 'pop': 0},
            {'name': 'थला का खेडा', 'parts': '', 'pop': 0},
            {'name': 'भैसाकुण्डल', 'parts': '', 'pop': 0},
            {'name': 'देवली', 'parts': '', 'pop': 0},
            {'name': 'राजोला', 'parts': '', 'pop': 0},
          ]
        },
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
          'villages': List.generate(35, (i) => {'name': 'वार्ड ' + (i + 1), 'parts': 'वार्ड ' + (i + 1), 'pop': 1000})
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
