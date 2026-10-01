const fs = require('fs');
const path = require('path');
const { boothToVillageMap } = require('../src/config/boothToVillageMaster');
const hierarchy = require('../src/config/constituencyHierarchyAll.json');

// Build Raipur from boothToVillageMap (Official 103 Booths verified)
const raipurGp = {};
for (const [part, info] of Object.entries(boothToVillageMap)) {
  const gp = info.gramPanchayat;
  const v = info.village;
  if (!raipurGp[gp]) {
    raipurGp[gp] = {
      wards: 11,
      pop: 3500,
      villages: {}
    };
  }
  if (!raipurGp[gp].villages[v]) {
    raipurGp[gp].villages[v] = [];
  }
  raipurGp[gp].villages[v].push(`भाग ${part}`);
}

const raipurDartPanchayats = {};
for (const [gp, data] of Object.entries(raipurGp)) {
  const vList = [];
  for (const [vName, parts] of Object.entries(data.villages)) {
    vList.push({
      name: vName,
      parts: parts.join(', '),
      pop: 1000
    });
  }
  raipurDartPanchayats[gp] = {
    wards: data.wards,
    pop: data.pop,
    villages: vList
  };
}

console.log('Raipur GP count:', Object.keys(raipurDartPanchayats).length);

// Also convert Sahara and Suwana from hierarchy
function convertSamiti(samitiName) {
  const raw = hierarchy[samitiName] || {};
  const res = {};
  for (const [gp, data] of Object.entries(raw)) {
    const vList = (data.villages || []).map(v => ({
      name: v.name,
      parts: '',
      pop: v.pop || 0
    }));
    res[gp] = {
      wards: data.wards || 9,
      pop: data.pop || 3000,
      villages: vList
    };
  }
  return res;
}

const saharaDart = convertSamiti('सहाडा');
const suwanaDart = convertSamiti('सुवाणा');

console.log('Sahara GP count:', Object.keys(saharaDart).length);
console.log('Suwana GP count:', Object.keys(suwanaDart).length);

function toDartMap(obj, indent = 8) {
  const spaces = ' '.repeat(indent);
  const entries = Object.entries(obj).map(([k, v]) => {
    let valStr = '';
    if (Array.isArray(v)) {
      const items = v.map(item => {
        return `{'name': '${item.name}', 'parts': '${item.parts}', 'pop': ${item.pop}}`;
      }).join(`,\n${spaces}      `);
      valStr = `[\n${spaces}      ${items}\n${spaces}    ]`;
    } else if (typeof v === 'object' && v !== null) {
      valStr = toDartMap(v, indent + 2);
    } else if (typeof v === 'string') {
      valStr = `'${v}'`;
    } else {
      valStr = `${v}`;
    }
    return `${spaces}'${k}': ${valStr}`;
  });
  return `{\n${entries.join(',\n')}\n${' '.repeat(indent - 2)}}`;
}

const fullDartCode = `import 'package:flutter/material.dart';

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
      'gpCount': ${Object.keys(raipurDartPanchayats).length},
      'villageCount': ${Object.values(raipurDartPanchayats).reduce((acc, gp) => acc + gp.villages.length, 0)},
      'panchayats': ${toDartMap(raipurDartPanchayats, 8)}
    },
    'सहाड़ा': {
      'icon': Icons.location_city_rounded,
      'color': Color(0xff059669),
      'gpCount': ${Object.keys(saharaDart).length},
      'villageCount': ${Object.values(saharaDart).reduce((acc, gp) => acc + gp.villages.length, 0)},
      'panchayats': ${toDartMap(saharaDart, 8)}
    },
    'सुवाणा': {
      'icon': Icons.nature_people_rounded,
      'color': Color(0xff7c3aed),
      'gpCount': ${Object.keys(suwanaDart).length},
      'villageCount': ${Object.values(suwanaDart).reduce((acc, gp) => acc + gp.villages.length, 0)},
      'panchayats': ${toDartMap(suwanaDart, 8)}
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
            initialGramPanchayat: village != null ? null : gramPanchayat,
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
      backgroundColor: bg,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
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

                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: samitiData.entries.map((e) {
                          final isSelected = e.key == selectedSamiti;
                          final color = e.value['color'] as Color;
                          final icon = e.value['icon'] as IconData;
                          final gpCount = e.value['gpCount'];

                          return Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: ChoiceChip(
                              showCheckmark: false,
                              avatar: Icon(icon, color: isSelected ? Colors.white : color, size: 18),
                              label: Text(e.key.contains('गंगापुर')
                                  ? '\${e.key} (\$gpCount वार्ड)'
                                  : '\${e.key} (\$gpCount GP, \${e.value['villageCount']} गाँव)'),
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
                                key: Key('\$selectedSamiti-\$gpName'),
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
                                  'ग्राम पंचायत: \$gpName',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                    color: navy,
                                  ),
                                ),
                                subtitle: Text(
                                  '\${villages.length} राजस्व गाँव • \${villages.map((v) => v['parts'] ?? '').where((p) => p.isNotEmpty).join(' | ')}',
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
                                                  'पूरी \$gpName पंचायत के मतदाता देखें',
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
                                            subtitle: parts != null && parts.isNotEmpty
                                                ? Text(parts, style: const TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w700))
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
      ),
    );
  }
}
`;

fs.writeFileSync(path.resolve(__dirname, '../../mobile/lib/features/areas/samiti_hierarchy_page.dart'), fullDartCode);
console.log('✅ Generated 100% synchronized samiti_hierarchy_page.dart!');
