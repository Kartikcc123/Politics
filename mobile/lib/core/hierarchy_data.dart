import 'package:flutter/material.dart';

const samitiHierarchyData = <String, Map<String, dynamic>>{
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
          {'name': 'सुरजियों का खेड़ा', 'parts': '', 'pop': 382}
        ]
      },
      'गलवा': {
        'wards': 11,
        'pop': 4280,
        'villages': [
          {'name': 'गलवा', 'parts': '', 'pop': 2341},
          {'name': 'चावंड खेड़ा', 'parts': '', 'pop': 634},
          {'name': 'सज्जनपुरा', 'parts': '', 'pop': 677},
          {'name': 'टोकरा', 'parts': '', 'pop': 628}
        ]
      },
      'लाठियाखेड़ी': {
        'wards': 7,
        'pop': 1362,
        'villages': [
          {'name': 'लाठियाखेड़ी', 'parts': '', 'pop': 621},
          {'name': 'सिंहपुरा', 'parts': '', 'pop': 741}
        ]
      },
      'चारोट': {
        'wards': 7,
        'pop': 2529,
        'villages': [
          {'name': 'चारोट', 'parts': '', 'pop': 1178},
          {'name': 'गोविन्दपुरा', 'parts': '', 'pop': 587},
          {'name': 'किशोरपुरा', 'parts': '', 'pop': 764}
        ]
      },
      'आसूणा': {
        'wards': 7,
        'pop': 2649,
        'villages': [
          {'name': 'आसूणा', 'parts': '', 'pop': 1853},
          {'name': 'उमरपुरा', 'parts': '', 'pop': 796}
        ]
      },
      'टुंगच': {
        'wards': 7,
        'pop': 2084,
        'villages': [
          {'name': 'टुंगच', 'parts': '', 'pop': 1493},
          {'name': 'रठौलिया', 'parts': '', 'pop': 591}
        ]
      },
      'खाखरमाला': {
        'wards': 7,
        'pop': 2038,
        'villages': [
          {'name': 'खाखरमाला', 'parts': '', 'pop': 1238},
          {'name': 'रेबारियों की ढाणी', 'parts': '', 'pop': 800}
        ]
      },
      'सिरोड़ी': {
        'wards': 7,
        'pop': 1774,
        'villages': [
          {'name': 'सिरोड़ी', 'parts': '', 'pop': 1774}
        ]
      },
      'नांदशा जागीर': {
        'wards': 7,
        'pop': 2073,
        'villages': [
          {'name': 'नांदशा जागीर', 'parts': '', 'pop': 2073}
        ]
      },
      'झोपड़ियां': {
        'wards': 7,
        'pop': 1993,
        'villages': [
          {'name': 'झोपड़ियां', 'parts': '', 'pop': 796},
          {'name': 'धनावत का खेड़ा', 'parts': '', 'pop': 382},
          {'name': 'छतरीखेड़ा', 'parts': '', 'pop': 815}
        ]
      },
      'पालरा': {
        'wards': 7,
        'pop': 2289,
        'villages': [
          {'name': 'पालरा', 'parts': '', 'pop': 1487},
          {'name': 'केमुनिया', 'parts': '', 'pop': 802}
        ]
      },
      'मोखुंदा': {
        'wards': 11,
        'pop': 5344,
        'villages': [
          {'name': 'मोखुंदा', 'parts': '', 'pop': 2758},
          {'name': 'बोराना', 'parts': '', 'pop': 1438},
          {'name': 'सगरेव', 'parts': '', 'pop': 1148}
        ]
      },
      'नाहरी': {
        'wards': 9,
        'pop': 3890,
        'villages': [
          {'name': 'नाहरी', 'parts': '', 'pop': 2490},
          {'name': 'थला', 'parts': '', 'pop': 1400}
        ]
      },
      'पानोतिया': {
        'wards': 9,
        'pop': 3120,
        'villages': [
          {'name': 'पानोतिया', 'parts': '', 'pop': 1820},
          {'name': 'मासिंगपुरा', 'parts': '', 'pop': 1300}
        ]
      },
      'सरेवाड़ी': {
        'wards': 7,
        'pop': 2450,
        'villages': [
          {'name': 'सरेवाड़ी', 'parts': '', 'pop': 2450}
        ]
      },
      'नाथडियास': {
        'wards': 9,
        'pop': 3650,
        'villages': [
          {'name': 'नाथडियास', 'parts': '', 'pop': 2250},
          {'name': 'सुरस', 'parts': '', 'pop': 1400}
        ]
      },
      'बोरियापुरा': {
        'wards': 7,
        'pop': 1890,
        'villages': [
          {'name': 'बोरियापुरा', 'parts': '', 'pop': 1890}
        ]
      },
      'आसींद': {
        'wards': 11,
        'pop': 4500,
        'villages': [
          {'name': 'आसींद', 'parts': '', 'pop': 4500}
        ]
      },
      'गांगलास': {
        'wards': 9,
        'pop': 3200,
        'villages': [
          {'name': 'गांगलास', 'parts': '', 'pop': 3200}
        ]
      },
      'कोटड़ी': {
        'wards': 7,
        'pop': 2100,
        'villages': [
          {'name': 'कोटड़ी', 'parts': '', 'pop': 2100}
        ]
      },
      'रायपुर': {
        'wards': 15,
        'pop': 11500,
        'villages': [
          {'name': 'रायपुर', 'parts': '', 'pop': 11500}
        ]
      },
      'बाघना': {
        'wards': 7,
        'pop': 1950,
        'villages': [
          {'name': 'बाघना', 'parts': '', 'pop': 1950}
        ]
      },
      'धुवाला': {
        'wards': 7,
        'pop': 1820,
        'villages': [
          {'name': 'धुवाला', 'parts': '', 'pop': 1820}
        ]
      },
      'गुर्जरों का खेड़ा': {
        'wards': 7,
        'pop': 1650,
        'villages': [
          {'name': 'गुर्जरों का खेड़ा', 'parts': '', 'pop': 1650}
        ]
      },
      'देवगढ़': {
        'wards': 9,
        'pop': 2900,
        'villages': [
          {'name': 'देवगढ़', 'parts': '', 'pop': 2900}
        ]
      },
      'करेडा': {
        'wards': 11,
        'pop': 4100,
        'villages': [
          {'name': 'करेडा', 'parts': '', 'pop': 4100}
        ]
      }
    }
  },
  'सहाड़ा': {
    'icon': Icons.terrain_rounded,
    'color': Color(0xff16a34a),
    'gpCount': 33,
    'villageCount': 88,
    'panchayats': {
      'सहाड़ा': {
        'wards': 11,
        'pop': 4500,
        'villages': [
          {'name': 'सहाड़ा', 'parts': '', 'pop': 3200},
          {'name': 'माताजी का खेड़ा', 'parts': '', 'pop': 1300}
        ]
      },
      'गंगापुर (ग्रामीण)': {
        'wards': 11,
        'pop': 5200,
        'villages': [
          {'name': 'गंगापुर ग्रामीण', 'parts': '', 'pop': 3800},
          {'name': 'उललाई', 'parts': '', 'pop': 1400}
        ]
      },
      'पोटला': {
        'wards': 9,
        'pop': 3600,
        'villages': [
          {'name': 'पोटला', 'parts': '', 'pop': 2500},
          {'name': 'लाडपुरा', 'parts': '', 'pop': 1100}
        ]
      },
      'भगवानपुरा': {
        'wards': 9,
        'pop': 3100,
        'villages': [
          {'name': 'भगवानपुरा', 'parts': '', 'pop': 2100},
          {'name': 'रायपुरिया', 'parts': '', 'pop': 1000}
        ]
      },
      'सोनियाना': {
        'wards': 9,
        'pop': 2950,
        'villages': [
          {'name': 'सोनियाना', 'parts': '', 'pop': 2000},
          {'name': 'कोशिथल', 'parts': '', 'pop': 950}
        ]
      },
      'अरनिया': {
        'wards': 7,
        'pop': 1800,
        'villages': [
          {'name': 'अरनिया', 'parts': '', 'pop': 1800}
        ]
      },
      'गुर्जरिया': {
        'wards': 7,
        'pop': 1750,
        'villages': [
          {'name': 'गुर्जरिया', 'parts': '', 'pop': 1750}
        ]
      },
      'बोरानी': {
        'wards': 7,
        'pop': 1900,
        'villages': [
          {'name': 'बोरानी', 'parts': '', 'pop': 1900}
        ]
      },
      'मजरावत': {
        'wards': 7,
        'pop': 1600,
        'villages': [
          {'name': 'मजरावत', 'parts': '', 'pop': 1600}
        ]
      },
      'रूपाहेली': {
        'wards': 7,
        'pop': 1850,
        'villages': [
          {'name': 'रूपाहेली', 'parts': '', 'pop': 1850}
        ]
      }
    }
  },
  'सुवाणा': {
    'icon': Icons.nature_people_rounded,
    'color': Color(0xff9333ea),
    'gpCount': 3,
    'villageCount': 9,
    'panchayats': {
      'सुवाणा': {
        'wards': 9,
        'pop': 3800,
        'villages': [
          {'name': 'सुवाणा', 'parts': '', 'pop': 2600},
          {'name': 'पालड़ी', 'parts': '', 'pop': 1200}
        ]
      },
      'हमीरगढ़': {
        'wards': 9,
        'pop': 3400,
        'villages': [
          {'name': 'हमीरगढ़', 'parts': '', 'pop': 2400},
          {'name': 'ओड़ा', 'parts': '', 'pop': 1000}
        ]
      },
      'मांडल': {
        'wards': 11,
        'pop': 4600,
        'villages': [
          {'name': 'मांडल', 'parts': '', 'pop': 3200},
          {'name': 'भादू', 'parts': '', 'pop': 1400}
        ]
      }
    }
  },
  'नगर पालिका गंगापुर': {
    'icon': Icons.apartment_rounded,
    'color': Color(0xffea580c),
    'gpCount': 1,
    'villageCount': 35,
    'panchayats': {
      'गंगापुर नगर पालिका': {
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
