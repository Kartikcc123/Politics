import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/theme.dart';
import '../features/voters/voter_management_page.dart';

class HierarchicalLocationNavigator extends StatefulWidget {
  const HierarchicalLocationNavigator({
    super.key,
    this.onSelectLocation,
    this.compact = false,
  });

  final void Function(Map<String, String> locationFilter)? onSelectLocation;
  final bool compact;

  @override
  State<HierarchicalLocationNavigator> createState() =>
      _HierarchicalLocationNavigatorState();
}

class _HierarchicalLocationNavigatorState
    extends State<HierarchicalLocationNavigator> {
  List<Map<String, dynamic>> _treeData = [];
  bool _loading = true;

  String _selectedSamiti = 'रायपुर';
  final List<String> _samitiList = ['रायपुर', 'सहाड़ा', 'सुवाणा', 'गंगापुर'];
  Map<String, dynamic>? _selectedPanchayat;
  Map<String, dynamic>? _selectedVillage;
  String? _selectedPart;

  @override
  void initState() {
    super.initState();
    _loadHierarchy();
  }

  Future<void> _loadHierarchy() async {
    try {
      final res = await api.get('/api/areas/tree');
      if (res is List) {
        setState(() {
          _treeData = (res as List)
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
          _loading = false;
        });
      }
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> _getPanchayats() {
    if (_treeData.isEmpty) return [];
    final root = _treeData.first;
    final tehsils = List<Map<String, dynamic>>.from(
      (root['children'] as List? ?? []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
    );
    if (tehsils.isEmpty) {
      return List<Map<String, dynamic>>.from(
        (root['children'] as List? ?? []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
      );
    }
    final tehsil = tehsils.firstWhere(
      (t) => '${t['name']}'.contains(_selectedSamiti),
      orElse: () => tehsils.first,
    );
    return List<Map<String, dynamic>>.from(
      (tehsil['children'] as List? ?? []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
    );
  }

  List<Map<String, dynamic>> _getVillages() {
    if (_selectedPanchayat == null) return [];
    return List<Map<String, dynamic>>.from(
      (_selectedPanchayat!['children'] as List? ?? []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
    );
  }

  void _openVoters({
    String? village,
    String? gramPanchayat,
    String? partNumber,
    String? sectionName,
  }) {
    if (widget.onSelectLocation != null) {
      widget.onSelectLocation!({
        if (village != null && village.isNotEmpty) 'village': village,
        if (gramPanchayat != null && gramPanchayat.isNotEmpty)
          'gramPanchayat': gramPanchayat,
        if (partNumber != null && partNumber.isNotEmpty) 'partNumber': partNumber,
        if (sectionName != null && sectionName.isNotEmpty)
          'sectionName': sectionName,
      });
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VoterManagementPage(
          initialVillage: village,
          initialGramPanchayat: gramPanchayat,
          initialPartNumber: partNumber,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    final panchayats = _getPanchayats();
    final villages = _getVillages();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: softBlue,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.account_tree_rounded,
                    color: blue, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'पंचायत समिति ➔ ग्राम पंचायत ➔ गाँव ➔ भाग',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        color: navy,
                      ),
                    ),
                    Text(
                      '1-क्लिक में किसी भी पंचायत, गाँव या भाग के वोटर देखें',
                      style: TextStyle(fontSize: 11, color: muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Samiti / Body Selector Bar
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _samitiList.map((sName) {
                final isSelected = _selectedSamiti == sName;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    avatar: Icon(
                      sName == 'गंगापुर'
                          ? Icons.apartment_rounded
                          : Icons.account_balance_rounded,
                      size: 14,
                      color: isSelected ? Colors.white : blue,
                    ),
                    label: Text(sName == 'गंगापुर'
                        ? 'नगरपालिका: $sName'
                        : 'समिति: $sName'),
                    selected: isSelected,
                    selectedColor: blue,
                    backgroundColor: const Color(0xfff1f5f9),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : navy,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                    onSelected: (val) {
                      if (val) {
                        setState(() {
                          _selectedSamiti = sName;
                          _selectedPanchayat = null;
                          _selectedVillage = null;
                          _selectedPart = null;
                        });
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // Breadcrumbs Bar
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _BreadcrumbChip(
                  label: '🏛️ समिति: $_selectedSamiti',
                  isSelected: _selectedPanchayat == null,
                  onTap: () => setState(() {
                    _selectedPanchayat = null;
                    _selectedVillage = null;
                    _selectedPart = null;
                  }),
                ),
                if (_selectedPanchayat != null) ...[
                  const Icon(Icons.chevron_right_rounded,
                      size: 18, color: muted),
                  _BreadcrumbChip(
                    label: '🏢 ${_selectedPanchayat!['name']}',
                    isSelected: _selectedVillage == null,
                    onTap: () => setState(() {
                      _selectedVillage = null;
                      _selectedPart = null;
                    }),
                  ),
                ],
                if (_selectedVillage != null) ...[
                  const Icon(Icons.chevron_right_rounded,
                      size: 18, color: muted),
                  _BreadcrumbChip(
                    label: '🏡 ${_selectedVillage!['name']}',
                    isSelected: _selectedPart == null,
                    onTap: () => setState(() {
                      _selectedPart = null;
                    }),
                  ),
                ],
                if (_selectedPart != null) ...[
                  const Icon(Icons.chevron_right_rounded,
                      size: 18, color: muted),
                  _BreadcrumbChip(
                    label: '🗳️ भाग: $_selectedPart',
                    isSelected: true,
                    onTap: () {},
                  ),
                ],
              ],
            ),
          ),
          const Divider(height: 24),

          // Level 1: Select Gram Panchayat (29 Panchayats)
          if (_selectedPanchayat == null) ...[
            Row(
              children: [
                Text(
                  'ग्राम पंचायत चुनें (${panchayats.length}):',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: navy,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => _openVoters(gramPanchayat: ''),
                  icon: const Icon(Icons.groups_rounded, size: 16),
                  label: const Text('सभी मतदाता'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: panchayats.map((p) {
                final count = p['voterCount'] ?? 0;
                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => setState(() {
                    _selectedPanchayat = p;
                    _selectedVillage = null;
                    _selectedPart = null;
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xfff5f8ff),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: softBlue),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.location_city_rounded,
                            size: 16, color: blue),
                        const SizedBox(width: 6),
                        Text(
                          '${p['name']}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: navy,
                          ),
                        ),
                        if (count > 0) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: softBlue,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '$count',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: blue,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],

          // Level 2: Select Village inside chosen Panchayat
          if (_selectedPanchayat != null && _selectedVillage == null) ...[
            Row(
              children: [
                Expanded(
                  child: Text(
                    '🏢 ${_selectedPanchayat!['name']} के सम्मिलित गाँव (${villages.length}):',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      color: navy,
                    ),
                  ),
                ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: blue,
                    visualDensity: VisualDensity.compact,
                  ),
                  onPressed: () => _openVoters(
                      gramPanchayat: '${_selectedPanchayat!['name']}'),
                  icon: const Icon(Icons.people_alt_rounded, size: 15),
                  label: const Text('पूरी पंचायत के वोटर'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: villages.map((v) {
                final vCount = v['voterCount'] ?? 0;
                final pop = v['population'] ?? 0;
                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => setState(() {
                    _selectedVillage = v;
                    _selectedPart = null;
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xfff0fdf4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xffbbf7d0)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.home_work_rounded,
                            size: 16, color: green),
                        const SizedBox(width: 6),
                        Text(
                          '${v['name']}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: Color(0xff14532d),
                          ),
                        ),
                        if (vCount > 0 || pop > 0) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xffdcfce7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              vCount > 0 ? '$vCount वोटर' : 'आबादी: $pop',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: green,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],

          // Level 3: View Booths / Parts & Sections of chosen Village
          if (_selectedVillage != null) ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '🏡 गाँव: ${_selectedVillage!['name']}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          color: navy,
                        ),
                      ),
                      Text(
                        'ग्राम पंचायत: ${_selectedPanchayat!['name']} | मतदाता/आबादी: ${_selectedVillage!['voterCount'] ?? _selectedVillage!['population'] ?? '-'}',
                        style: const TextStyle(fontSize: 11, color: muted),
                      ),
                    ],
                  ),
                ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: blue,
                    visualDensity: VisualDensity.compact,
                  ),
                  onPressed: () => _openVoters(
                    village: '${_selectedVillage!['name']}',
                    gramPanchayat: '${_selectedPanchayat!['name']}',
                  ),
                  icon: const Icon(Icons.groups_rounded, size: 16),
                  label: Text('${_selectedVillage!['name']} के सभी वोटर'),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Parts / Booths in this village
            if (_selectedVillage!['partNumbers'] is List &&
                (_selectedVillage!['partNumbers'] as List).isNotEmpty) ...[
              const Text(
                'सम्मिलित भाग संख्या (बूथ):',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  color: navy,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List<String>.from(_selectedVillage!['partNumbers'])
                    .map((pNum) {
                  return ActionChip(
                    avatar: const Icon(Icons.how_to_vote_rounded,
                        size: 15, color: orange),
                    label: Text('भाग संख्या $pNum के वोटर'),
                    backgroundColor: const Color(0xfffff7ed),
                    side: const BorderSide(color: Color(0xfffed7aa)),
                    labelStyle: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Color(0xff9a3412),
                    ),
                    onPressed: () => _openVoters(
                      village: '${_selectedVillage!['name']}',
                      gramPanchayat: '${_selectedPanchayat!['name']}',
                      partNumber: pNum,
                    ),
                  );
                }).toList(),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xfff8fafc),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        size: 16, color: muted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'इस गाँव (${_selectedVillage!['name']}) के सभी मतदाताओं को देखने के लिए ऊपर दिए गए बटन पर क्लिक करें।',
                        style: const TextStyle(fontSize: 11, color: muted),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _BreadcrumbChip extends StatelessWidget {
  const _BreadcrumbChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? blue : const Color(0xfff1f5f9),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : navy,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

