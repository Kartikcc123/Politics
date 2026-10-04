const fs = require('fs');
const officialPanchayats = require('../src/config/raipurOfficial29Panchayats.json');

function buildDartFile() {
  let raipurDart = '';
  for (const gp of officialPanchayats) {
    raipurDart += `        '${gp.name}': {\n`;
    raipurDart += `          'wards': ${gp.wards},\n`;
    raipurDart += `          'pop': ${gp.pop},\n`;
    raipurDart += `          'villages': [\n`;

    const vLines = gp.villages.map(v => {
      return `            {'name': '${v.name}', 'parts': '', 'pop': ${v.pop}}`;
    });

    raipurDart += vLines.join(',\n') + '\n';
    raipurDart += `          ]\n`;
    raipurDart += `        },\n`;
  }

  const dartCode = `import 'package:flutter/material.dart';

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

  static const samitiData = <String, Map<String, dynamic>>{
    'रायपुर': {
      'icon': Icons.account_balance_rounded,
      'color': Color(0xff1457f5),
      'gpCount': 29,
      'villageCount': 105,
      'panchayats': {
${raipurDart.trimEnd()}
      }
    },
    'सहाड़ा': {
      'icon': Icons.location_city_rounded,
      'color': Color(0xff059669),
      'gpCount': 0,
      'villageCount': 0,
      'panchayats': {}
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

  void _openVoters({String? village, String? gramPanchayat, String? tehsil, String? ward}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(
            title: Text(village != null
                ? 'गाँव: $village'
                : (gramPanchayat != null
                    ? (ward != null ? '$gramPanchayat (वार्ड $ward)' : 'पंचायत: $gramPanchayat')
                    : '$tehsil')),
          ),
          body: VoterManagementPage(
            initialVillage: village,
            initialGramPanchayat: village != null ? null : gramPanchayat,
            initialWard: ward,
            initialTehsil: (village != null || gramPanchayat != null) ? null : tehsil,
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
        final cleanQ = q.replaceAll(RegExp(r'[^\\u0900-\\u097F\\da-zA-Z]'), '');
        final matchGp = gpName.toLowerCase().contains(q) || gpName.replaceAll(RegExp(r'[^\\u0900-\\u097F\\da-zA-Z]'), '').contains(cleanQ);

        final matchedVillages = villages.where((v) {
          final vName = (v['name'] ?? '').toString().toLowerCase();
          final parts = (v['parts'] ?? '').toString().toLowerCase();
          final cleanV = vName.replaceAll(RegExp(r'[^\\u0900-\\u097F\\da-zA-Z]'), '');
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
                                return Text(
                                  '\${villages.length} गाँव • \$wardCount वार्ड \${popCount > 0 ? '• \$popCount जनसंख्या' : ''}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 12, color: muted),
                                );
                              }),
                              children: [
                                Container(
                                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Divider(color: border, height: 1),
                                      const SizedBox(height: 8),

                                      InkWell(
                                        onTap: () => _openVoters(gramPanchayat: gpName),
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
                                      const SizedBox(height: 10),

                                      Builder(builder: (context) {
                                        final gpInfo = panchayatsMap[gpName] as Map<String, dynamic>? ?? {};
                                        final wardCount = gpInfo['wards'] as int? ?? 0;
                                        if (wardCount <= 0) return const SizedBox.shrink();

                                        return Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                const Icon(Icons.grid_view_rounded, size: 13, color: muted),
                                                const SizedBox(width: 5),
                                                Text(
                                                  'वार्डवार फ़िल्टर (\$wardCount वार्ड):',
                                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            SingleChildScrollView(
                                              scrollDirection: Axis.horizontal,
                                              child: Row(
                                                children: List.generate(wardCount, (wIdx) {
                                                  final wNum = '\${wIdx + 1}';
                                                  return Padding(
                                                    padding: const EdgeInsets.only(right: 6),
                                                    child: ActionChip(
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                      visualDensity: VisualDensity.compact,
                                                      label: Text('वार्ड \$wNum', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: navy)),
                                                      backgroundColor: Colors.white,
                                                      side: const BorderSide(color: border),
                                                      onPressed: () => _openVoters(gramPanchayat: gpName, ward: wNum),
                                                    ),
                                                  );
                                                }),
                                              ),
                                            ),
                                            const SizedBox(height: 10),
                                          ],
                                        );
                                      }),

                                      const Row(
                                        children: [
                                          Icon(Icons.location_city_rounded, size: 13, color: muted),
                                          SizedBox(width: 5),
                                          Text(
                                            'सम्मिलित राजस्व गाँव / मजरे:',
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),

                                      ...villages.map((v) {
                                        final vName = v['name'] as String;
                                        final pop = v['pop'] as int? ?? 0;

                                        return ListTile(
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          leading: const Icon(Icons.location_on_outlined, color: blue, size: 20),
                                          title: Text(
                                            vName,
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: navy),
                                          ),
                                          subtitle: pop > 0
                                              ? Text('जनसंख्या: \$pop', style: const TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w700))
                                              : null,
                                          trailing: FilledButton.tonal(
                                            style: FilledButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            onPressed: () => _openVoters(village: vName),
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
    );
  }
}
`;

  fs.writeFileSync('./mobile/lib/features/areas/samiti_hierarchy_page.dart', dartCode, 'utf8');
  console.log('🎉 Completely rewrote and perfected samiti_hierarchy_page.dart!');
}

buildDartFile();
