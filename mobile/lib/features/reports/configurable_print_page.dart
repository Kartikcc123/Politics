import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/hierarchy_data.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';

class ConfigurablePrintPage extends StatefulWidget {
  const ConfigurablePrintPage({super.key});

  @override
  State<ConfigurablePrintPage> createState() => _ConfigurablePrintPageState();
}

class _ConfigurablePrintPageState extends State<ConfigurablePrintPage> {
  int currentStep = 0; // 0: Area & Scope, 1: Layout & Shape, 2: Fields & Customization, 3: Preview & Print
  bool loading = true;
  String? errorMessage;
  bool isPrinting = false;
  bool isSharing = false;

  Map<String, dynamic>? liveHierarchyData;

  // Search filter
  final searchController = TextEditingController();
  String gpSearchQuery = '';

  // Hierarchy Selection State
  String selectedSamiti = 'रायपुर';
  String? selectedGramPanchayat = 'भींटा';
  String? selectedVillage;
  String? selectedWard;
  String? selectedPart;
  String scopeType = 'all_panchayat'; // 'all_samiti', 'all_panchayat', 'specific_village', 'specific_ward', 'specific_part'

  // Layout & Shape Configuration
  String paperSize = 'A4';
  String orientation = 'portrait'; // 'portrait' | 'landscape'
  int columns = 2; // 1, 2, 3
  bool includePhoto = true;
  bool includeCoverPage = true;

  // Field Customization
  final Set<String> selectedFields = {
    'name',
    'voterId',
    'voterSerial',
    'partNumber',
    'wardNumber',
    'wardVoterSerial',
    'guardianName',
    'mobile',
    'houseNumber',
    'village',
    'gramPanchayat',
    'caste',
    'age',
    'gender',
  };

  @override
  void initState() {
    super.initState();
    _loadHierarchy();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  Future<void> _loadHierarchy() async {
    setState(() {
      loading = true;
      errorMessage = null;
    });
    try {
      final res = await api.get('/api/auth/hierarchy-options');
      if (mounted) {
        setState(() {
          liveHierarchyData = res;
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          // Still allow using static samitiHierarchyData if API call fails
          loading = false;
        });
      }
    }
  }

  List<String> get availablePanchayats {
    final cur = samitiHierarchyData[selectedSamiti];
    if (cur == null) return [];
    final panchayatsMap = cur['panchayats'] as Map<String, dynamic>? ?? {};
    final list = panchayatsMap.keys.toList();
    list.sort((a, b) => a.compareTo(b));
    return list;
  }

  List<Map<String, dynamic>> get availableVillages {
    if (selectedGramPanchayat == null) return [];
    final cur = samitiHierarchyData[selectedSamiti];
    if (cur == null) return [];
    final panchayatsMap = cur['panchayats'] as Map<String, dynamic>? ?? {};
    final gpData = panchayatsMap[selectedGramPanchayat] as Map<String, dynamic>?;
    if (gpData == null) return [];
    final villages = gpData['villages'] as List? ?? [];
    return villages.map((v) => Map<String, dynamic>.from(v as Map)).toList();
  }

  List<String> get availableWards {
    if (selectedGramPanchayat == null) return [];
    final cur = samitiHierarchyData[selectedSamiti];
    if (cur == null) return [];
    final panchayatsMap = cur['panchayats'] as Map<String, dynamic>? ?? {};
    final gpData = panchayatsMap[selectedGramPanchayat] as Map<String, dynamic>?;
    final wardCount = gpData?['wards'] as int? ?? 11;
    return List.generate(wardCount, (i) => '${i + 1}');
  }

  List<Map<String, dynamic>> get availableParts {
    if (liveHierarchyData == null) return [];
    final panchayats = liveHierarchyData?['panchayats'];
    if (panchayats is List && selectedGramPanchayat != null) {
      final cleanGp = selectedGramPanchayat!.trim();
      for (final p in panchayats) {
        if (p is Map) {
          final pName = '${p['name']}'.trim();
          if (pName == cleanGp || cleanGp.contains(pName) || pName.contains(cleanGp)) {
            final parts = p['parts'];
            if (parts is List && parts.isNotEmpty) {
              final list = parts.whereType<Map>().map((x) => Map<String, dynamic>.from(x)).toList();
              list.sort((a, b) => (int.tryParse('${a['partNumber']}') ?? 0).compareTo(int.tryParse('${b['partNumber']}') ?? 0));
              return list;
            }
          }
        }
      }
    }
    final rawParts = liveHierarchyData?['parts'];
    if (rawParts is List) {
      final list = rawParts.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).where((p) => '${p['gramPanchayat']}'.trim() == selectedGramPanchayat).toList();
      if (list.isNotEmpty) {
        list.sort((a, b) => (int.tryParse('${a['partNumber']}') ?? 0).compareTo(int.tryParse('${b['partNumber']}') ?? 0));
        return list;
      }
    }
    return [];
  }

  Map<String, String> get printQueryParams {
    final params = <String, String>{
      'fields': selectedFields.join(','),
      'columns': '$columns',
      'photo': '$includePhoto',
      'paperSize': paperSize,
      'orientation': orientation,
      'includeCoverPage': '$includeCoverPage',
      'limit': '10000',
    };

    if (scopeType == 'all_samiti') {
      params['tehsil'] = selectedSamiti;
      params['title'] = '$selectedSamiti समिति संपूर्ण मतदाता सूची';
    } else if (scopeType == 'specific_village' && selectedVillage != null && selectedVillage!.isNotEmpty) {
      if (selectedGramPanchayat != null) params['gramPanchayat'] = selectedGramPanchayat!;
      params['village'] = selectedVillage!;
      params['title'] = '${selectedGramPanchayat ?? selectedSamiti} - $selectedVillage मतदाता सूची';
    } else if (scopeType == 'specific_ward' && selectedWard != null && selectedWard!.isNotEmpty) {
      if (selectedGramPanchayat != null) params['gramPanchayat'] = selectedGramPanchayat!;
      params['wardNumber'] = selectedWard!;
      params['title'] = '${selectedGramPanchayat ?? selectedSamiti} - वार्ड $selectedWard मतदाता सूची';
    } else if (scopeType == 'specific_part' && selectedPart != null && selectedPart!.isNotEmpty) {
      params['partNumber'] = selectedPart!;
      params['title'] = 'भाग #$selectedPart ${selectedGramPanchayat != null ? "($selectedGramPanchayat)" : ""} मतदाता सूची';
    } else {
      if (selectedGramPanchayat != null) params['gramPanchayat'] = selectedGramPanchayat!;
      params['title'] = '$selectedGramPanchayat संपूर्ण पंचायत मतदाता सूची';
    }

    return params;
  }

  String get printJobName {
    if (scopeType == 'all_samiti') return '${selectedSamiti}_Complete_List';
    final gp = selectedGramPanchayat ?? selectedSamiti;
    if (scopeType == 'specific_village' && selectedVillage != null) return '${gp}_${selectedVillage}_List';
    if (scopeType == 'specific_ward' && selectedWard != null) return '${gp}_Ward_$selectedWard';
    if (scopeType == 'specific_part' && selectedPart != null) return 'Part_$selectedPart';
    return '${gp}_Complete_List';
  }

  Future<void> _handlePrint() async {
    setState(() => isPrinting = true);
    try {
      await printApiPdf(
        context,
        path: '/api/print/members.pdf',
        jobName: printJobName,
        query: printQueryParams,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('प्रिंट करने में त्रुटि: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isPrinting = false);
    }
  }

  Future<void> _handleSharePdf() async {
    setState(() => isSharing = true);
    try {
      final downloaded = await api.download(
        '/api/print/members.pdf',
        query: printQueryParams,
        fallbackName: '$printJobName.pdf',
      );

      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$printJobName.pdf');
      await file.writeAsBytes(downloaded.bytes);

      await SharePlus.instance.share(
        ShareParams(
          text: '📋 $printJobName - मतदाता सूची पीडीएफ',
          files: [XFile(file.path)],
          subject: '$printJobName PDF',
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('शेयर करने में त्रुटि: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isSharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff8fafc),
      appBar: AppBar(
        title: const Text('स्मार्ट PDF प्रिंट व एक्सपोर्ट', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'रिफ्रेश करें',
            onPressed: _loadHierarchy,
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : errorMessage != null
              ? _buildErrorView()
              : Column(
                  children: [
                    _buildStepIndicator(),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 800),
                            child: _buildCurrentStepContent(),
                          ),
                        ),
                      ),
                    ),
                    _buildBottomNavigationBar(),
                  ],
                ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.red, size: 48),
            const SizedBox(height: 12),
            Text(errorMessage ?? 'त्रुटि हुई', textAlign: TextAlign.center, style: const TextStyle(color: navy)),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _loadHierarchy,
              icon: const Icon(Icons.refresh),
              label: const Text('पुनः प्रयास करें'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    final steps = [
      {'icon': Icons.account_balance_rounded, 'title': '1. क्षेत्र व दायरा'},
      {'icon': Icons.dashboard_customize_rounded, 'title': '2. लेआउट व आकार'},
      {'icon': Icons.checklist_rtl_rounded, 'title': '3. फील्ड चयन'},
      {'icon': Icons.print_rounded, 'title': '4. प्रिंट व शेयर'},
    ];

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: List.generate(steps.length, (idx) {
          final isDone = currentStep > idx;
          final isCurrent = currentStep == idx;
          return Expanded(
            child: InkWell(
              onTap: () => setState(() => currentStep = idx),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                decoration: BoxDecoration(
                  color: isCurrent ? royalBlue.withValues(alpha: 0.1) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: isCurrent ? Border.all(color: royalBlue, width: 1.5) : null,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      steps[idx]['icon'] as IconData,
                      size: 20,
                      color: isCurrent ? royalBlue : (isDone ? Colors.green : muted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      steps[idx]['title'] as String,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                        color: isCurrent ? royalBlue : (isDone ? navy : muted),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildCurrentStepContent() {
    switch (currentStep) {
      case 0:
        return _buildStepAreaSelection();
      case 1:
        return _buildStepLayoutConfiguration();
      case 2:
        return _buildStepFieldCustomization();
      case 3:
      default:
        return _buildStepPreviewAndPrint();
    }
  }

  // ================= STEP 1: Area & Hierarchy =================
  Widget _buildStepAreaSelection() {
    final gps = availablePanchayats;
    final filteredGps = gpSearchQuery.trim().isEmpty
        ? gps
        : gps.where((g) => g.toLowerCase().contains(gpSearchQuery.toLowerCase().trim())).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Samiti Selection
        const Text(
          '1. समिति / क्षेत्र चुनें (Select Samiti / Area):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: samitiHierarchyData.keys.map((samiti) {
              final isSel = selectedSamiti == samiti;
              final icon = samitiHierarchyData[samiti]!['icon'] as IconData;
              final color = samitiHierarchyData[samiti]!['color'] as Color;

              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  avatar: Icon(icon, size: 18, color: isSel ? Colors.white : color),
                  label: Text(samiti),
                  selected: isSel,
                  selectedColor: color,
                  backgroundColor: Colors.white,
                  labelStyle: TextStyle(
                    fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                    color: isSel ? Colors.white : navy,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  onSelected: (val) {
                    if (val) {
                      setState(() {
                        selectedSamiti = samiti;
                        final newGps = availablePanchayats;
                        selectedGramPanchayat = newGps.isNotEmpty ? newGps.first : null;
                        selectedVillage = null;
                        selectedWard = null;
                        selectedPart = null;
                      });
                    }
                  },
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 20),

        // 2. Printing Scope (Whole Samiti vs Gram Panchayat vs Village vs Ward vs Part)
        const Text(
          '2. प्रिंट का स्तर चुनें (Select Print Scope):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),

        _buildScopeCard(
          type: 'all_samiti',
          icon: Icons.groups_rounded,
          title: '🌟 पूरी $selectedSamiti समिति का प्रिंट',
          subtitle: 'इस समिति की सभी ग्राम पंचायतों, गाँवों व मतदाताओं का संयुक्त प्रिंट निकालें।',
        ),
        const SizedBox(height: 8),

        _buildScopeCard(
          type: 'all_panchayat',
          icon: Icons.account_balance_rounded,
          title: '🏛️ विशिष्ट ग्राम पंचायत का प्रिंट',
          subtitle: 'किसी एक ग्राम पंचायत के सभी गाँवों और वार्डों की संयुक्त मतदाता सूची।',
        ),
        const SizedBox(height: 8),

        _buildScopeCard(
          type: 'specific_village',
          icon: Icons.location_on_rounded,
          title: '📍 विशिष्ट गाँव / मजरा का प्रिंट',
          subtitle: 'पंचायत के किसी एक राजस्व गाँव या मजरे के मतदाताओं की सूची निकालें।',
        ),
        const SizedBox(height: 8),

        _buildScopeCard(
          type: 'specific_ward',
          icon: Icons.grid_view_rounded,
          title: '📋 विशिष्ट वार्ड का प्रिंट (Specific Ward)',
          subtitle: 'ग्राम पंचायत के किसी एक वार्ड (जैसे वार्ड 1, वार्ड 2) का प्रिंट लें।',
        ),
        const SizedBox(height: 8),

        _buildScopeCard(
          type: 'specific_part',
          icon: Icons.how_to_vote_rounded,
          title: '🗳️ विशिष्ट भाग / बूथ का प्रिंट (Specific Part/Booth)',
          subtitle: 'विशेष भाग संख्या (बूथ) के मतदाताओं की अलग सूची निकालें।',
        ),

        const SizedBox(height: 20),

        // 3. Gram Panchayat Grid & Search (shown unless whole samiti is selected)
        if (scopeType != 'all_samiti') ...[
          Row(
            children: [
              Text(
                '3. $selectedSamiti की ग्राम पंचायत चुनें (${filteredGps.length}):',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: searchController,
            onChanged: (v) => setState(() => gpSearchQuery = v),
            decoration: InputDecoration(
              hintText: 'ग्राम पंचायत खोजें...',
              prefixIcon: const Icon(Icons.search_rounded, size: 20, color: muted),
              suffixIcon: gpSearchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        searchController.clear();
                        setState(() => gpSearchQuery = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
            ),
          ),
          const SizedBox(height: 10),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: filteredGps.map((gp) {
              final isSel = selectedGramPanchayat == gp;
              return InkWell(
                onTap: () => setState(() {
                  selectedGramPanchayat = gp;
                  selectedVillage = null;
                  selectedWard = null;
                  selectedPart = null;
                }),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSel ? royalBlue : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isSel ? royalBlue : border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.location_city_rounded, size: 16, color: isSel ? Colors.white : royalBlue),
                      const SizedBox(width: 6),
                      Text(
                        gp,
                        style: TextStyle(
                          fontWeight: isSel ? FontWeight.bold : FontWeight.w600,
                          color: isSel ? Colors.white : navy,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 20),
        ],

        // 4. Sub-Options: Villages, Wards, or Parts
        if (selectedGramPanchayat != null && scopeType == 'specific_village') ...[
          Text(
            '4. "$selectedGramPanchayat" का गाँव चुनें:',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: availableVillages.map((v) {
              final vName = v['name'] as String;
              final isV = selectedVillage == vName;
              return ChoiceChip(
                label: Text(vName),
                selected: isV,
                selectedColor: royalBlue,
                backgroundColor: Colors.white,
                labelStyle: TextStyle(color: isV ? Colors.white : navy, fontWeight: isV ? FontWeight.bold : FontWeight.normal),
                onSelected: (val) => setState(() => selectedVillage = val ? vName : null),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],

        if (selectedGramPanchayat != null && scopeType == 'specific_ward') ...[
          Text(
            '4. "$selectedGramPanchayat" का वार्ड चुनें:',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: availableWards.map((w) {
              final isW = selectedWard == w;
              return ChoiceChip(
                label: Text('वार्ड $w'),
                selected: isW,
                selectedColor: royalBlue,
                backgroundColor: Colors.white,
                labelStyle: TextStyle(color: isW ? Colors.white : navy, fontWeight: isW ? FontWeight.bold : FontWeight.normal),
                onSelected: (val) => setState(() => selectedWard = val ? w : null),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],

        if (scopeType == 'specific_part') ...[
          Text(
            '4. भाग / बूथ संख्या चुनें:',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
          ),
          const SizedBox(height: 8),
          availableParts.isNotEmpty
              ? Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: availableParts.map((p) {
                    final pNum = '${p['partNumber']}';
                    final isP = selectedPart == pNum;
                    final vCount = p['voterCount'] as int? ?? 0;
                    return ChoiceChip(
                      label: Text('भाग $pNum ${vCount > 0 ? "($vCount)" : ""}'),
                      selected: isP,
                      selectedColor: royalBlue,
                      backgroundColor: Colors.white,
                      labelStyle: TextStyle(color: isP ? Colors.white : navy, fontWeight: isP ? FontWeight.bold : FontWeight.normal),
                      onSelected: (val) => setState(() => selectedPart = val ? pNum : null),
                    );
                  }).toList(),
                )
              : const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('भाग संख्या लोड हो रही है...', style: TextStyle(color: muted, fontSize: 13)),
                ),
          const SizedBox(height: 16),
        ],

        // Selection Summary Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xffeff6ff),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: royalBlue.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.verified_rounded, color: royalBlue, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _getSelectionSummaryText(),
                  style: const TextStyle(color: royalBlue, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _getSelectionSummaryText() {
    if (scopeType == 'all_samiti') return '🎯 आपका चयन: पूरी $selectedSamiti समिति (समस्त ग्राम पंचायतें व गाँव)';
    if (scopeType == 'specific_village') return '🎯 आपका चयन: $selectedSamiti > $selectedGramPanchayat > ${selectedVillage ?? "गाँव चुनें"}';
    if (scopeType == 'specific_ward') return '🎯 आपका चयन: $selectedSamiti > $selectedGramPanchayat > ${selectedWard != null ? "वार्ड $selectedWard" : "वार्ड चुनें"}';
    if (scopeType == 'specific_part') return '🎯 आपका चयन: भाग #${selectedPart ?? "भाग चुनें"}';
    return '🎯 आपका चयन: $selectedSamiti > संपूर्ण $selectedGramPanchayat ग्राम पंचायत';
  }

  Widget _buildScopeCard({
    required String type,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final isSelected = scopeType == type;
    return InkWell(
      onTap: () => setState(() => scopeType = type),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? royalBlue.withValues(alpha: 0.05) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? royalBlue : border, width: isSelected ? 2 : 1),
        ),
        child: Row(
          children: [
            Radio<String>(
              value: type,
              groupValue: scopeType,
              activeColor: royalBlue,
              onChanged: (val) => setState(() => scopeType = val!),
            ),
            const SizedBox(width: 6),
            Icon(icon, color: isSelected ? royalBlue : muted, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isSelected ? royalBlue : navy,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: muted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ================= STEP 2: Layout & Shape =================
  Widget _buildStepLayoutConfiguration() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '1. पेज का आकार (Paper Size):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            _buildSelectableCard(
              title: 'A4 पेपर',
              subtitle: '210 × 297 mm (मानक)',
              icon: Icons.description_rounded,
              isSelected: paperSize == 'A4',
              onTap: () => setState(() => paperSize = 'A4'),
            ),
            const SizedBox(width: 12),
            _buildSelectableCard(
              title: 'Legal / Letter',
              subtitle: '216 × 356 mm (बड़ा पेज)',
              icon: Icons.newspaper_rounded,
              isSelected: paperSize == 'Legal',
              onTap: () => setState(() => paperSize = 'Legal'),
            ),
          ],
        ),

        const SizedBox(height: 24),

        const Text(
          '2. पेज ओरिएंटेशन (Orientation):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            _buildSelectableCard(
              title: 'पोर्ट्रेट (Portrait)',
              subtitle: 'सीधा पेज (लंबाई अधिक)',
              icon: Icons.crop_portrait_rounded,
              isSelected: orientation == 'portrait',
              onTap: () => setState(() => orientation = 'portrait'),
            ),
            const SizedBox(width: 12),
            _buildSelectableCard(
              title: 'लैंडस्केप (Landscape)',
              subtitle: 'आड़ा पेज (चौड़ाई अधिक)',
              icon: Icons.crop_landscape_rounded,
              isSelected: orientation == 'landscape',
              onTap: () => setState(() => orientation = 'landscape'),
            ),
          ],
        ),

        const SizedBox(height: 24),

        const Text(
          '3. कॉलम संख्या (Columns per Page):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            _buildSelectableCard(
              title: '1 कॉलम',
              subtitle: 'बड़ा कार्ड (विस्तृत)',
              icon: Icons.view_agenda_rounded,
              isSelected: columns == 1,
              onTap: () => setState(() => columns = 1),
            ),
            const SizedBox(width: 10),
            _buildSelectableCard(
              title: '2 कॉलम (अनुशंसित)',
              subtitle: '2 मतदाता प्रति पंक्ति',
              icon: Icons.view_column_rounded,
              isSelected: columns == 2,
              onTap: () => setState(() => columns = 2),
            ),
            const SizedBox(width: 10),
            _buildSelectableCard(
              title: '3 कॉलम',
              subtitle: 'अधिक मतदाता / कॉम्पैक्ट',
              icon: Icons.grid_view_rounded,
              isSelected: columns == 3,
              onTap: () => setState(() => columns = 3),
            ),
          ],
        ),

        const SizedBox(height: 24),

        const Text(
          '4. अतिरिक्त विकल्प:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),
        SwitchListTile.adaptive(
          value: includePhoto,
          title: const Text('मतदाता की फोटो शामिल करें', style: TextStyle(fontWeight: FontWeight.w600, color: navy)),
          subtitle: const Text('फोटो उपलब्ध होने पर कार्ड में प्रिंट होगी', style: TextStyle(color: muted, fontSize: 12)),
          activeColor: royalBlue,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) => setState(() => includePhoto = val),
        ),
        SwitchListTile.adaptive(
          value: includeCoverPage,
          title: const Text('प्रथम पेज पर सारांश कवर जोड़ें', style: TextStyle(fontWeight: FontWeight.w600, color: navy)),
          subtitle: const Text('समिति, पंचायत, वार्ड व कुल मतदाता सारांश', style: TextStyle(color: muted, fontSize: 12)),
          activeColor: royalBlue,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) => setState(() => includeCoverPage = val),
        ),
      ],
    );
  }

  Widget _buildSelectableCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
          decoration: BoxDecoration(
            color: isSelected ? royalBlue.withValues(alpha: 0.08) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isSelected ? royalBlue : border, width: isSelected ? 2 : 1),
          ),
          child: Column(
            children: [
              Icon(icon, size: 28, color: isSelected ? royalBlue : muted),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: isSelected ? royalBlue : navy,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10.5, color: muted),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ================= STEP 3: Fields Customization =================
  Widget _buildStepFieldCustomization() {
    final availableFieldsList = [
      {'key': 'name', 'label': 'मतदाता का नाम', 'cat': 'मुख्य'},
      {'key': 'voterId', 'label': 'EPIC / वोटर आईडी', 'cat': 'मुख्य'},
      {'key': 'voterSerial', 'label': 'वि.स. मतदाता क्रमांक', 'cat': 'मुख्य'},
      {'key': 'wardNumber', 'label': 'वार्ड संख्या', 'cat': 'मुख्य'},
      {'key': 'wardVoterSerial', 'label': 'वार्ड क्रमांक', 'cat': 'मुख्य'},
      {'key': 'partNumber', 'label': 'भाग संख्या (बूथ)', 'cat': 'मुख्य'},
      {'key': 'guardianName', 'label': 'पिता / पति का नाम', 'cat': 'व्यक्तिगत'},
      {'key': 'relationType', 'label': 'संबंध प्रकार (पिता/पति)', 'cat': 'व्यक्तिगत'},
      {'key': 'mobile', 'label': 'मोबाइल नंबर', 'cat': 'संपर्क'},
      {'key': 'altMobile', 'label': 'वैकल्पिक मोबाइल', 'cat': 'संपर्क'},
      {'key': 'houseNumber', 'label': 'मकान संख्या', 'cat': 'पता'},
      {'key': 'village', 'label': 'गाँव / मजरा', 'cat': 'पता'},
      {'key': 'gramPanchayat', 'label': 'ग्राम पंचायत', 'cat': 'पता'},
      {'key': 'caste', 'label': 'जाति', 'cat': 'अन्य'},
      {'key': 'subCaste', 'label': 'उपजाति', 'cat': 'अन्य'},
      {'key': 'age', 'label': 'उम्र', 'cat': 'व्यक्तिगत'},
      {'key': 'gender', 'label': 'लिंग (पुरुष/महिला)', 'cat': 'व्यक्तिगत'},
      {'key': 'occupation', 'label': 'व्यवसाय', 'cat': 'अन्य'},
      {'key': 'organizationPost', 'label': 'संगठन पद', 'cat': 'अन्य'},
      {'key': 'supportLevel', 'label': 'समर्थन स्तर', 'cat': 'राजनीतिक'},
      {'key': 'partyPreference', 'label': 'पार्टी रुझान', 'cat': 'राजनीतिक'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'प्रिंट में शामिल फील्ड चुनें:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
            ),
            TextButton.icon(
              onPressed: () {
                setState(() {
                  if (selectedFields.length == availableFieldsList.length) {
                    selectedFields.clear();
                    selectedFields.addAll(['name', 'voterId', 'voterSerial', 'wardNumber']);
                  } else {
                    selectedFields.addAll(availableFieldsList.map((f) => f['key'] as String));
                  }
                });
              },
              icon: Icon(
                selectedFields.length == availableFieldsList.length ? Icons.deselect : Icons.select_all,
                size: 18,
              ),
              label: Text(selectedFields.length == availableFieldsList.length ? 'न्यूनतम रखें' : 'सभी चुनें'),
            ),
          ],
        ),
        const SizedBox(height: 8),

        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border),
          ),
          child: Column(
            children: availableFieldsList.map((f) {
              final key = f['key'] as String;
              final isChecked = selectedFields.contains(key);
              return CheckboxListTile(
                value: isChecked,
                dense: true,
                title: Text(f['label'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: navy, fontSize: 13.5)),
                subtitle: Text('श्रेणी: ${f['cat']}', style: const TextStyle(fontSize: 11, color: muted)),
                activeColor: royalBlue,
                contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                onChanged: (val) {
                  setState(() {
                    if (val == true) {
                      selectedFields.add(key);
                    } else {
                      if (selectedFields.length > 1) selectedFields.remove(key);
                    }
                  });
                },
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // ================= STEP 4: Preview & Print =================
  Widget _buildStepPreviewAndPrint() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'प्रिंट सारांश व कन्फर्मेशन (Print Summary):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 12),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSummaryRow('चुनी गई समिति:', selectedSamiti),
              const Divider(height: 16),
              _buildSummaryRow('प्रिंट स्तर / दायरा:', _getSelectionSummaryText()),
              const Divider(height: 16),
              _buildSummaryRow('पेज आकार व प्रकार:', '$paperSize • ${orientation == 'portrait' ? 'पोर्ट्रेट' : 'लैंडस्केप'} • $columns कॉलम'),
              const Divider(height: 16),
              _buildSummaryRow('फोटो शामिल:', includePhoto ? 'हाँ ✅' : 'नहीं ❌'),
              const Divider(height: 16),
              _buildSummaryRow('कुल चयनित फील्ड:', '${selectedFields.length} फील्ड्स'),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Action Buttons
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: royalBlue,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: isPrinting ? null : _handlePrint,
                icon: isPrinting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.print_rounded),
                label: Text(
                  isPrinting ? 'प्रिंट तैयार हो रहा है...' : 'प्रिंट निकालें (Direct Print)',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: royalBlue, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: isSharing ? null : _handleSharePdf,
                icon: isSharing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.share_rounded, color: royalBlue),
                label: Text(
                  isSharing ? 'PDF डाउनलोड हो रही है...' : 'PDF शेयर करें (WhatsApp / Share)',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: royalBlue),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 140,
          child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: muted, fontSize: 13)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: navy, fontSize: 13.5)),
        ),
      ],
    );
  }

  Widget _buildBottomNavigationBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (currentStep > 0)
            OutlinedButton.icon(
              onPressed: () => setState(() => currentStep--),
              icon: const Icon(Icons.arrow_back),
              label: const Text('पिछला'),
            )
          else
            const SizedBox.shrink(),
          if (currentStep < 3)
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: royalBlue),
              onPressed: () => setState(() => currentStep++),
              icon: const Icon(Icons.arrow_forward),
              label: const Text('आगे बढ़ें'),
            )
          else
            const SizedBox.shrink(),
        ],
      ),
    );
  }
}
