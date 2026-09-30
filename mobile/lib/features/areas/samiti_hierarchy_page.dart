import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/mobile_components.dart';
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

  // Master Hierarchy for 179 - Sahara (Raipur, Sahara, Suwana, Gangapur)
  static const samitiData = <String, Map<String, dynamic>>{
    'रायपुर': {
      'icon': Icons.account_balance_rounded,
      'color': Color(0xff1457f5),
      'gpCount': 29,
      'villageCount': 102,
      'panchayats': {
        'भींटा': {
          'villages': [
            {'name': 'भींटा', 'parts': 'भाग 1, 2'},
            {'name': 'धोरिया खेड़ा', 'parts': 'भाग 3'},
            {'name': 'भटेवर', 'parts': 'भाग 4'},
          ]
        },
        'सरेवड़ी': {
          'villages': [
            {'name': 'सरेवड़ी', 'parts': 'भाग 5, 6'},
            {'name': 'लड़की', 'parts': 'भाग 7'},
            {'name': 'रामा', 'parts': 'भाग 8'},
            {'name': 'जलामाली', 'parts': 'भाग 9'},
          ]
        },
        'छातोल': {
          'villages': [
            {'name': 'छातोल', 'parts': 'भाग 10'},
            {'name': 'मियाला', 'parts': 'भाग 11'},
          ]
        },
        'बागड़': {
          'villages': [
            {'name': 'बागड़', 'parts': 'भाग 12'},
            {'name': 'सिरोड़ी', 'parts': 'भाग 13'},
          ]
        },
        'कोट': {
          'villages': [
            {'name': 'कोट', 'parts': 'भाग 14, 15'},
            {'name': 'टूणगाच', 'parts': 'भाग 16, 17'},
          ]
        },
        'खाखरमाला': {
          'villages': [
            {'name': 'खाखरमाला', 'parts': 'भाग 18'},
            {'name': 'आसूणा', 'parts': 'भाग 19'},
          ]
        },
        'मोखुन्दा': {
          'villages': [
            {'name': 'मोखुन्दा', 'parts': 'भाग 20, 21'},
          ]
        },
        'मासिंगपुरा': {
          'villages': [
            {'name': 'मासिंगपुरा', 'parts': 'भाग 22'},
            {'name': 'मांडका खेड़ा', 'parts': 'भाग 23'},
            {'name': 'डूंगरी', 'parts': 'भाग 24'},
          ]
        },
        'झाड़ोल': {
          'villages': [
            {'name': 'झाड़ोल', 'parts': 'भाग 25, 26, 27'},
            {'name': 'टोकरा', 'parts': 'भाग 28'},
            {'name': 'सिंहपुरा', 'parts': 'भाग 29'},
          ]
        },
        'देवरिया': {
          'villages': [
            {'name': 'देवरिया', 'parts': 'भाग 30, 31, 32'},
          ]
        },
        'गलवा': {
          'villages': [
            {'name': 'गलवा', 'parts': 'भाग 33, 34'},
          ]
        },
        'चारोट': {
          'villages': [
            {'name': 'चारोट', 'parts': 'भाग 35, 36'},
          ]
        },
        'खेमाणा': {
          'villages': [
            {'name': 'खेमाणा', 'parts': 'भाग 37, 38'},
          ]
        },
        'पालरां': {
          'villages': [
            {'name': 'पालरां', 'parts': 'भाग 39, 40'},
            {'name': 'मेरिया खेड़ा', 'parts': 'भाग 41'},
          ]
        },
        'पीथा का खेड़ा': {
          'villages': [
            {'name': 'पीथा का खेड़ा', 'parts': 'भाग 42'},
            {'name': 'मांडोल', 'parts': 'भाग 43'},
          ]
        },
        'बोराणा': {
          'villages': [
            {'name': 'बोराणा', 'parts': 'भाग 44, 45, 46, 47'},
          ]
        },
        'कलालखेड़ी': {
          'villages': [
            {'name': 'धूल खेड़ा', 'parts': 'भाग 48, 49'},
            {'name': 'कलालखेड़ी', 'parts': 'भाग 50, 51'},
            {'name': 'बरी', 'parts': 'भाग 52'},
          ]
        },
        'सुरास': {
          'villages': [
            {'name': 'सुरास', 'parts': 'भाग 53, 54'},
            {'name': 'पाबियों का खेड़ा', 'parts': 'भाग 55'},
          ]
        },
        'बागोलिया': {
          'villages': [
            {'name': 'बागोलिया', 'parts': 'भाग 56, 57'},
          ]
        },
        'थाला': {
          'villages': [
            {'name': 'थाला', 'parts': 'भाग 58'},
            {'name': 'गाडरी खेड़ा', 'parts': 'भाग 59'},
            {'name': 'चीतरपुरा', 'parts': 'भाग 60, 61'},
          ]
        },
        'सगरेव': {
          'villages': [
            {'name': 'सगरेव', 'parts': 'भाग 62, 63'},
          ]
        },
        'रायपुर': {
          'villages': [
            {'name': 'रायपुर', 'parts': 'भाग 64, 65, 66, 67, 68, 69'},
          ]
        },
        'गल्यावड़ी': {
          'villages': [
            {'name': 'केमरिया', 'parts': 'भाग 70, 71'},
            {'name': 'गल्यावड़ी', 'parts': 'भाग 72, 73'},
          ]
        },
        'नान्दशा जागीर': {
          'villages': [
            {'name': 'नान्दशा जागीर', 'parts': 'भाग 74'},
          ]
        },
        'पानोतिया': {
          'villages': [
            {'name': 'पानोतिया', 'parts': 'भाग 75, 76, 82'},
            {'name': 'खूटिया', 'parts': 'भाग 77, 78'},
          ]
        },
        'नाथड़ियास': {
          'villages': [
            {'name': 'मोखमपुरा', 'parts': 'भाग 79'},
            {'name': 'नाथड़ियास', 'parts': 'भाग 80'},
            {'name': 'आसपुर', 'parts': 'भाग 81'},
          ]
        },
        'नाहरी': {
          'villages': [
            {'name': 'जोगरास', 'parts': 'भाग 83, 84'},
            {'name': 'नाहरी', 'parts': 'भाग 85'},
            {'name': 'फतेहपुरा', 'parts': 'भाग 86, 87'},
          ]
        },
        'नारायणखेड़ा': {
          'villages': [
            {'name': 'नारायणखेड़ा', 'parts': 'भाग 88'},
            {'name': 'बाड़िया कलां', 'parts': 'भाग 89'},
          ]
        },
        'बकाण': {
          'villages': [
            {'name': 'बाड़िया खुर्द / बकाण', 'parts': 'भाग 90'},
          ]
        },
        'आशाहोली': {
          'villages': [
            {'name': 'लखाहाली', 'parts': 'भाग 91'},
            {'name': 'रामरास', 'parts': 'भाग 92'},
            {'name': 'आशाहोली', 'parts': 'भाग 93, 94'},
            {'name': 'लेली तोलास', 'parts': 'भाग 95'},
          ]
        },
        'बोरियापुरा': {
          'villages': [
            {'name': 'देवाड़ा', 'parts': 'भाग 96'},
            {'name': 'नरियापुरा', 'parts': 'भाग 97, 98'},
            {'name': 'उड़सीपुरा', 'parts': 'भाग 99, 100'},
          ]
        },
        'आमली': {
          'villages': [
            {'name': 'आमली', 'parts': 'भाग 101, 102, 103'},
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
      'villageCount': 68,
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
      'villageCount': 35,
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

    // Filter panchayats/villages by search query
    final filteredPanchayats = <String, List<Map<String, dynamic>>>{};
    for (final entry in panchayatsMap.entries) {
      final gpName = entry.key;
      final villages = List<Map<String, dynamic>>.from(entry.value['villages'] ?? []);

      if (query.isEmpty) {
        filteredPanchayats[gpName] = villages;
      } else {
        final q = query.toLowerCase().trim();
        final matchGp = gpName.toLowerCase().contains(q);
        final matchedVillages = villages.where((v) {
          final vName = (v['name'] ?? '').toString().toLowerCase();
          final parts = (v['parts'] ?? '').toString().toLowerCase();
          return vName.contains(q) || parts.contains(q);
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

                    // Google Contacts style search bar
                    TextField(
                      controller: search,
                      onChanged: (v) => setState(() => query = v),
                      decoration: InputDecoration(
                        hintText: 'गाँव, पंचायत या भाग संख्या खोजें (जैसे: भींटा, कोट, 5)...',
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
                          final villageCount = e.value['villageCount'];

                          return Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: ChoiceChip(
                              showCheckmark: false,
                              avatar: Icon(icon, color: isSelected ? Colors.white : color, size: 18),
                              label: Text('${e.key} ($gpCount GP, $villageCount गाँव)'),
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

                                          return ListTile(
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            leading: const Icon(Icons.location_on_outlined, color: blue, size: 20),
                                            title: Text(
                                              vName,
                                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: navy),
                                            ),
                                            subtitle: parts != null
                                                ? Text(parts, style: const TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w600))
                                                : null,
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
