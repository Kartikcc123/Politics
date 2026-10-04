import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';

class ConfigurablePrintPage extends StatefulWidget {
  const ConfigurablePrintPage({super.key});

  @override
  State<ConfigurablePrintPage> createState() => _ConfigurablePrintPageState();
}

class _ConfigurablePrintPageState extends State<ConfigurablePrintPage> {
  int currentStep = 0; // 0: Area / Hierarchy, 1: Layout & Shape, 2: Fields & Customization, 3: Preview & Print
  bool loading = true;
  String? errorMessage;
  bool isPrinting = false;
  bool isSharing = false;

  Map<String, dynamic>? hierarchyData;
  List<String> allGramPanchayats = [];
  List<Map<String, dynamic>> allParts = [];

  // Hierarchy Selection State
  String selectedSamiti = 'रायपुर समिति';
  String? selectedGramPanchayat;
  String scopeType = 'all_panchayat'; // 'all_panchayat', 'all_wards', 'specific_ward', 'specific_part'
  String? selectedWard;
  String? selectedPart;

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

  // Pre-configured Samiti to GP mapping
  final Map<String, List<String>> samitiMapping = {
    'रायपुर समिति': [
      'रायपुर', 'भींटा', 'मोखुंदा', 'नाहरी', 'बोराना', 'सगरेव', 'थला',
      'पालरा', 'पानोतिया', 'मासिंगपुरा', 'सरेवाड़ी', 'खेमाणा', 'नाथडियास',
      'सुरस', 'बोरियापुरा', 'आसींद', 'गांगलास', 'कोटड़ी'
    ],
    'सहाड़ा समिति': [
      'सहाड़ा', 'गंगापुर', 'पोटला', 'उललाई', 'लाडपुरा', 'माताजी का खेड़ा',
      'भगवानपुरा', 'रायपुरिया', 'सोनियाना', 'कोशिथल'
    ],
    'समस्त / अन्य पंचायतें': [],
  };

  @override
  void initState() {
    super.initState();
    _loadHierarchy();
  }

  Future<void> _loadHierarchy() async {
    setState(() {
      loading = true;
      errorMessage = null;
    });
    try {
      final res = await api.get('/api/auth/hierarchy-options');
      if (res is Map<String, dynamic>) {
        final gps = (res['gramPanchayats'] is List)
            ? (res['gramPanchayats'] as List).map((e) => e.toString()).toList()
            : <String>[];
        final parts = (res['parts'] is List)
            ? (res['parts'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
            : <Map<String, dynamic>>[];

        setState(() {
          hierarchyData = res;
          allGramPanchayats = gps;
          allParts = parts;

          // Fill other samiti with remainder GPs
          final assignedGps = {...samitiMapping['रायपुर समिति']!, ...samitiMapping['सहाड़ा समिति']!};
          samitiMapping['समस्त / अन्य पंचायतें'] = gps.where((gp) => !assignedGps.contains(gp)).toList();

          if (gps.isNotEmpty && selectedGramPanchayat == null) {
            selectedGramPanchayat = gps.contains('रायपुर') ? 'रायपुर' : gps.first;
          }
          loading = false;
        });
      } else {
        setState(() => loading = false);
      }
    } catch (e) {
      setState(() {
        errorMessage = 'डेटा लोड करने में त्रुटि: $e';
        loading = false;
      });
    }
  }

  List<String> get availableWards {
    if (selectedGramPanchayat == null || hierarchyData == null) return [];
    final gpWardsMap = hierarchyData?['gpWardsMap'] as Map?;
    if (gpWardsMap != null && gpWardsMap[selectedGramPanchayat] is List) {
      return (gpWardsMap[selectedGramPanchayat] as List).map((e) => e.toString()).toList();
    }
    return List.generate(25, (i) => '${i + 1}');
  }

  List<Map<String, dynamic>> get availableParts {
    if (selectedGramPanchayat == null) return allParts;
    return allParts.where((p) => '${p['gramPanchayat']}'.trim() == selectedGramPanchayat).toList();
  }

  Map<String, String> get printQueryParams {
    final params = <String, String>{
      'fields': selectedFields.join(','),
      'columns': '$columns',
      'photo': '$includePhoto',
      'paperSize': paperSize,
      'orientation': orientation,
      'includeCoverPage': '$includeCoverPage',
      'limit': '5000',
    };

    if (selectedGramPanchayat != null && selectedGramPanchayat!.isNotEmpty) {
      params['gramPanchayat'] = selectedGramPanchayat!;
    }

    if (scopeType == 'specific_ward' && selectedWard != null && selectedWard!.isNotEmpty) {
      params['wardNumber'] = selectedWard!;
      params['title'] = '$selectedGramPanchayat - वार्ड $selectedWard मतदाता सूची';
    } else if (scopeType == 'specific_part' && selectedPart != null && selectedPart!.isNotEmpty) {
      params['partNumber'] = selectedPart!;
      params['title'] = '$selectedGramPanchayat - भाग $selectedPart मतदाता सूची';
    } else {
      params['title'] = '$selectedGramPanchayat संपूर्ण पंचायत मतदाता सूची';
    }

    return params;
  }

  String get printJobName {
    final gp = selectedGramPanchayat ?? 'Voters';
    if (scopeType == 'specific_ward' && selectedWard != null) return '${gp}_Ward_$selectedWard';
    if (scopeType == 'specific_part' && selectedPart != null) return '${gp}_Part_$selectedPart';
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
          SnackBar(content: Text('शेयर करने में त्रुटि: $e')),
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
      {'icon': Icons.account_balance_rounded, 'title': '1. क्षेत्र / पंचायत'},
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
    final currentSamitiGps = samitiMapping[selectedSamiti] ?? [];
    final activeGps = currentSamitiGps.isNotEmpty
        ? allGramPanchayats.where((gp) => currentSamitiGps.contains(gp)).toList()
        : allGramPanchayats;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Samiti Tabs
        const Text(
          '1. पंचायत समिति चुनें (Select Panchayat Samiti):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: samitiMapping.keys.map((samiti) {
              final isSel = selectedSamiti == samiti;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(
                    samiti,
                    style: TextStyle(
                      fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                      color: isSel ? Colors.white : navy,
                    ),
                  ),
                  selected: isSel,
                  selectedColor: royalBlue,
                  backgroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  onSelected: (val) {
                    if (val) {
                      setState(() {
                        selectedSamiti = samiti;
                        final newGps = samitiMapping[samiti] ?? [];
                        if (newGps.isNotEmpty) {
                          selectedGramPanchayat = newGps.first;
                        }
                      });
                    }
                  },
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 20),

        // 2. Gram Panchayat Cards Grid
        Text(
          '2. $selectedSamiti की ग्राम पंचायत चुनें:',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: activeGps.map((gp) {
            final isSel = selectedGramPanchayat == gp;
            return InkWell(
              onTap: () => setState(() {
                selectedGramPanchayat = gp;
                selectedWard = null;
                selectedPart = null;
              }),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isSel ? royalBlue : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isSel ? royalBlue : border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    )
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.location_city_rounded,
                      size: 18,
                      color: isSel ? Colors.white : royalBlue,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      gp,
                      style: TextStyle(
                        fontWeight: isSel ? FontWeight.bold : FontWeight.w600,
                        color: isSel ? Colors.white : navy,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 24),

        // 3. Printing Scope (Whole Panchayat vs Ward vs Part)
        if (selectedGramPanchayat != null) ...[
          Text(
            '3. "$selectedGramPanchayat" में क्या प्रिंट करना चाहते हैं?',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
          ),
          const SizedBox(height: 12),

          _buildScopeCard(
            type: 'all_panchayat',
            icon: Icons.public_rounded,
            title: '🌟 संपूर्ण ग्राम पंचायत ($selectedGramPanchayat)',
            subtitle: 'इस पंचायत के सभी वार्ड व मतदाताओं की संयुक्त पूरी पीडीएफ बनेगी।',
          ),
          const SizedBox(height: 8),

          _buildScopeCard(
            type: 'specific_ward',
            icon: Icons.meeting_room_rounded,
            title: '🏛️ किसी विशिष्ट वार्ड का प्रिंट (Specific Ward)',
            subtitle: 'चयनित वार्ड के मतदाताओं की अलग सूची तैयार करें।',
          ),

          if (scopeType == 'specific_ward') ...[
            Padding(
              padding: const EdgeInsets.only(left: 36, top: 10, bottom: 8),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: availableWards.map((w) {
                  final isW = selectedWard == w;
                  return ChoiceChip(
                    label: Text('वार्ड $w'),
                    selected: isW,
                    selectedColor: royalBlue,
                    labelStyle: TextStyle(color: isW ? Colors.white : navy, fontWeight: isW ? FontWeight.bold : FontWeight.normal),
                    onSelected: (val) => setState(() => selectedWard = val ? w : null),
                  );
                }).toList(),
              ),
            ),
          ],

          const SizedBox(height: 8),

          _buildScopeCard(
            type: 'specific_part',
            icon: Icons.how_to_vote_rounded,
            title: '🗳️ किसी विशिष्ट भाग / बूथ का प्रिंट (Specific Part/Booth)',
            subtitle: 'विशेष भाग संख्या (बूथ) के मतदाताओं की सूची निकालें।',
          ),

          if (scopeType == 'specific_part') ...[
            Padding(
              padding: const EdgeInsets.only(left: 36, top: 10, bottom: 8),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: availableParts.map((p) {
                  final pNum = '${p['partNumber']}';
                  final isP = selectedPart == pNum;
                  return ChoiceChip(
                    label: Text('भाग #$pNum ${p['village'] != null ? '(${p['village']})' : ''}'),
                    selected: isP,
                    selectedColor: royalBlue,
                    labelStyle: TextStyle(color: isP ? Colors.white : navy, fontWeight: isP ? FontWeight.bold : FontWeight.normal),
                    onSelected: (val) => setState(() => selectedPart = val ? pNum : null),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ],
    );
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
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? royalBlue.withValues(alpha: 0.05) : Colors.white,
          borderRadius: BorderRadius.circular(14),
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
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isSelected ? royalBlue : navy)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 12, color: muted)),
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
          'पेज आकार और लेआउट डिज़ाइन (Page Shape & Layout):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 16),

        // 1. Orientation
        const Text('1. पेज ओरिएंटेशन (Orientation):', style: TextStyle(fontWeight: FontWeight.w600, color: navy)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildSelectCard(
                icon: Icons.stay_current_portrait_rounded,
                title: 'खड़ा पेज (Portrait)',
                subtitle: 'मानक वर्टिकल पेज (A4)',
                selected: orientation == 'portrait',
                onTap: () => setState(() => orientation = 'portrait'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildSelectCard(
                icon: Icons.stay_current_landscape_rounded,
                title: 'आड़ा पेज (Landscape)',
                subtitle: 'चौड़ा क्षैतिज पेज (Wide)',
                selected: orientation == 'landscape',
                onTap: () => setState(() => orientation = 'landscape'),
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // 2. Columns Grid Layout
        const Text('2. कार्ड लेआउट व कॉलम (Grid Columns):', style: TextStyle(fontWeight: FontWeight.w600, color: navy)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildSelectCard(
                icon: Icons.view_column_rounded,
                title: '2 कॉलम (मानक)',
                subtitle: 'सबसे लोकप्रिय व पढ़ने में आसान',
                selected: columns == 2,
                onTap: () => setState(() => columns = 2),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildSelectCard(
                icon: Icons.table_chart_rounded,
                title: '3 कॉलम (सघन)',
                subtitle: 'कम पेजों में अधिक वोटर',
                selected: columns == 3,
                onTap: () => setState(() => columns = 3),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildSelectCard(
                icon: Icons.view_agenda_rounded,
                title: '1 कॉलम (विस्तृत)',
                subtitle: 'बड़ा कार्ड / पर्ची फॉर्मेट',
                selected: columns == 1,
                onTap: () => setState(() => columns = 1),
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // 3. Toggles (Photo & Cover Page)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border),
          ),
          child: Column(
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: royalBlue,
                title: const Text('🖼️ मतदाता की फोटो शामिल करें (Include Photo)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: const Text('प्रत्येक कार्ड पर वोटर की मूल फोटो प्रिंट होगी।', style: TextStyle(fontSize: 12, color: muted)),
                value: includePhoto,
                onChanged: (val) => setState(() => includePhoto = val),
              ),
              const Divider(height: 20),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: royalBlue,
                title: const Text('📑 आधिकारिक कवर पेज व सारांश (Cover Summary Page)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: const Text('पहले पेज पर जेंडर ब्रेकडाउन, कुल संख्या व क्षेत्र का पूरा विवरण रहेगा।', style: TextStyle(fontSize: 12, color: muted)),
                value: includeCoverPage,
                onChanged: (val) => setState(() => includeCoverPage = val),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSelectCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? royalBlue.withValues(alpha: 0.06) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? royalBlue : border, width: selected ? 2 : 1),
        ),
        child: Column(
          children: [
            Icon(icon, size: 28, color: selected ? royalBlue : muted),
            const SizedBox(height: 6),
            Text(title, textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: selected ? royalBlue : navy)),
            const SizedBox(height: 2),
            Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: muted)),
          ],
        ),
      ),
    );
  }

  // ================= STEP 3: Field Selection =================
  Widget _buildStepFieldCustomization() {
    final fieldCategories = {
      '🆔 पहचान विवरण': {
        'name': 'मतदाता का नाम',
        'voterId': 'EPIC (वोटर ID संख्या)',
        'voterSerial': 'वि.स. मतदाता क्रमांक (#)',
        'partNumber': 'भाग / बूथ संख्या (#)',
        'wardNumber': 'वार्ड संख्या (#)',
        'wardVoterSerial': 'वार्ड मतदाता क्रमांक (#)',
        'guardianName': 'पिता / पति का नाम',
        'age': 'आयु (Age)',
        'gender': 'लिंग (Gender)',
      },
      '📍 संपर्क व पता': {
        'mobile': 'मोबाइल नंबर',
        'houseNumber': 'मकान नंबर',
        'village': 'गाँव / मोहल्ला',
        'gramPanchayat': 'ग्राम पंचायत',
        'address': 'पूरा पता',
      },
      '🚩 सामाजिक व राजनीतिक': {
        'caste': 'जाति (Caste)',
        'supportLevel': 'समर्थन स्तर (Support)',
        'partyPreference': 'पार्टी रुझान / वरीयता',
        'occupation': 'व्यवसाय',
        'organizationPost': 'संगठन पद',
      }
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'कार्ड में क्या-क्या प्रिंट करना है चुनें:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  if (selectedFields.length > 5) {
                    selectedFields.clear();
                    selectedFields.addAll(['name', 'voterId', 'voterSerial', 'partNumber', 'wardNumber']);
                  } else {
                    for (final cat in fieldCategories.values) {
                      selectedFields.addAll(cat.keys);
                    }
                  }
                });
              },
              child: Text(selectedFields.length > 5 ? 'न्यूनतम रखें' : 'सभी चुनें'),
            ),
          ],
        ),
        const SizedBox(height: 12),

        ...fieldCategories.entries.map((category) {
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  category.key,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
                ),
                const Divider(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: category.value.entries.map((field) {
                    final isChecked = selectedFields.contains(field.key);
                    return FilterChip(
                      label: Text(field.value),
                      selected: isChecked,
                      selectedColor: royalBlue,
                      labelStyle: TextStyle(
                        color: isChecked ? Colors.white : navy,
                        fontWeight: isChecked ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      onSelected: (val) {
                        setState(() {
                          if (val) {
                            selectedFields.add(field.key);
                          } else {
                            if (selectedFields.length > 1) {
                              selectedFields.remove(field.key);
                            }
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // ================= STEP 4: Preview & Print =================
  Widget _buildStepPreviewAndPrint() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xff0f172a), Color(0xff1e293b)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: Colors.greenAccent, size: 24),
                  SizedBox(width: 8),
                  Text(
                    'प्रिंट कॉन्फ़िगरेशन तैयार है (Ready to Print)',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _summaryRow('🏛️ समिति / पंचायत:', '$selectedSamiti > $selectedGramPanchayat'),
              _summaryRow(
                '🎯 प्रिंट स्कोप:',
                scopeType == 'specific_ward'
                    ? 'वार्ड $selectedWard'
                    : (scopeType == 'specific_part' ? 'भाग #$selectedPart' : 'संपूर्ण ग्राम पंचायत ($selectedGramPanchayat)'),
              ),
              _summaryRow('📄 पेज ओरिएंटेशन:', orientation == 'portrait' ? 'A4 खड़ा (Portrait)' : 'A4 आड़ा (Landscape)'),
              _summaryRow('📊 कॉलम ग्रिड:', '$columns कॉलम'),
              _summaryRow('🖼️ फोटो स्थिति:', includePhoto ? 'हाँ (फोटो सहित)' : 'नहीं (बिना फोटो)'),
              _summaryRow('📑 कवर पेज:', includeCoverPage ? 'हाँ (सारांश सहित)' : 'नहीं'),
              _summaryRow('🔘 कुल चयनित फील्ड:', '${selectedFields.length} फील्ड्स'),
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
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: isPrinting ? null : _handlePrint,
                icon: isPrinting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.print_rounded, size: 22),
                label: Text(
                  isPrinting ? 'PDF तैयार हो रही है...' : '🖨️ PDF प्रिंट निकालें',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: royalBlue,
                  side: const BorderSide(color: royalBlue, width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: isSharing ? null : _handleSharePdf,
                icon: isSharing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.share_rounded, size: 22),
                label: Text(
                  isSharing ? 'डाउनलोड हो रहा है...' : '📲 PDF शेयर करें',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 140, child: Text(label, style: const TextStyle(color: Colors.white60, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildBottomNavigationBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: border)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (currentStep > 0)
            OutlinedButton.icon(
              onPressed: () => setState(() => currentStep--),
              icon: const Icon(Icons.arrow_back_rounded, size: 18),
              label: const Text('पिछला'),
            )
          else
            const SizedBox.shrink(),
          if (currentStep < 3)
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: royalBlue),
              onPressed: () => setState(() => currentStep++),
              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
              label: const Text('आगे बढ़ें'),
            )
          else
            const SizedBox.shrink(),
        ],
      ),
    );
  }
}
