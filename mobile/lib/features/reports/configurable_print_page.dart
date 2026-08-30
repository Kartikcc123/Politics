// ignore_for_file: unused_element, unused_element_parameter

import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';

class ConfigurablePrintPage extends StatefulWidget {
  const ConfigurablePrintPage({super.key});

  @override
  State<ConfigurablePrintPage> createState() => _ConfigurablePrintPageState();
}

class _ConfigurablePrintPageState extends State<ConfigurablePrintPage> {
  final search = TextEditingController();
  final selectedIds = <String>{};
  final selectedOptionFilters = <String, Map<String, String>>{};
  final selectedOptionLabels = <String, String>{};
  final excludedIds = <String>{};
  final selectedFields = <String>{
    'name',
    'voterId',
    'guardianName',
    'mobile',
    'houseNumber',
    'village',
    'gramPanchayat',
    'section',
  };

  String support = '';
  String verification = '';
  String paper = 'A4';
  String orientation = 'portrait';
  int columns = 2;
  int page = 1;
  bool photo = true;
  bool selectAllFiltered = false;
  bool missingMobile = false;
  bool missingHouse = false;
  bool votersExpanded = true;
  bool fieldsExpanded = false;
  bool layoutExpanded = false;
  bool generateExpanded = false;
  final bool showInlineVoterDetails = false;
  int currentStep = 0;
  String fieldCategory = 'identity';
  int refreshKey = 0;
  late Future<Map<String, dynamic>> votersFuture;
  static const pageSize = 50;

  static const availableFields = <String, String>{
    'name': 'नाम',
    'voterId': 'EPIC',
    'mobile': 'मोबाइल',
    'altMobile': 'अन्य मोबाइल',
    'guardianName': 'पिता / पति का नाम',
    'relationType': 'संबंध',
    'age': 'उम्र',
    'gender': 'लिंग',
    'houseNumber': 'घर संख्या',
    'address': 'पता',
    'village': 'गाँव',
    'gramPanchayat': 'ग्राम पंचायत',
    'tehsil': 'तहसील',
    'municipality': 'नगर पालिका',
    'caste': 'जाति',
    'subCaste': 'उपजाति',
    'occupation': 'व्यवसाय',
    'education': 'शिक्षा',
    'organizationPost': 'संगठन पद',
    'supportLevel': 'समर्थन',
    'assembly': 'विधानसभा',
    'partNumber': 'भाग / बूथ',
    'section': 'अनुभाग',
    'booth': 'बूथ',
    'ward': 'वार्ड',
  };

  static const fieldCategories = <String, List<String>>{
    'identity': [
      'name',
      'voterId',
      'guardianName',
      'relationType',
      'age',
      'gender'
    ],
    'contact': ['mobile', 'altMobile', 'address', 'houseNumber'],
    'location': [
      'village',
      'gramPanchayat',
      'tehsil',
      'municipality',
      'assembly',
      'partNumber',
      'section',
      'booth',
      'ward'
    ],
    'profile': [
      'caste',
      'subCaste',
      'occupation',
      'education',
      'organizationPost',
      'supportLevel'
    ],
  };

  static const fieldCategoryLabels = <String, String>{
    'identity': 'पहचान',
    'contact': 'संपर्क',
    'location': 'क्षेत्र',
    'profile': 'प्रोफ़ाइल',
  };

  Map<String, String?> get filters {
    final result = <String, String?>{
      'q': search.text.trim(),
      'supportLevel': support,
      'verificationStatus': verification,
      if (missingMobile) 'missingMobile': 'true',
      if (missingHouse) 'missingHouse': 'true',
    };
    for (final values in selectedOptionFilters.values) {
      result.addAll(values);
    }
    return result;
  }

  Map<String, String?> get listQuery => {
        ...filters,
        'paged': 'true',
        'page': '$page',
        'limit': '$pageSize',
        '_refresh': '$refreshKey',
      };

  @override
  void initState() {
    super.initState();
    refreshVoters();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  void refreshVoters() {
    votersFuture = api.getQuery('/api/members', listQuery);
  }

  void filtersChanged() => setState(() {
        page = 1;
        refreshKey++;
        selectAllFiltered = false;
        selectedIds.clear();
        excludedIds.clear();
        refreshVoters();
      });

  bool isSelected(String id) =>
      selectAllFiltered ? !excludedIds.contains(id) : selectedIds.contains(id);

  void toggleVoter(String id, bool selected) => setState(() {
        if (selectAllFiltered) {
          selected ? excludedIds.remove(id) : excludedIds.add(id);
        } else {
          selected ? selectedIds.add(id) : selectedIds.remove(id);
        }
      });

  void chooseAllFiltered() => setState(() {
        selectAllFiltered = true;
        selectedIds.clear();
        excludedIds.clear();
        votersExpanded = false;
        fieldsExpanded = true;
      });

  void clearSelection() => setState(() {
        selectAllFiltered = false;
        selectedIds.clear();
        excludedIds.clear();
      });

  void smartSelect(String type) => setState(() {
        if (type == 'missingMobile') missingMobile = true;
        if (type == 'missingHouse') missingHouse = true;
        if (type == 'review') verification = 'needs_review';
        if (type == 'supporter') support = 'supporter';
        page = 1;
        refreshKey++;
        selectAllFiltered = true;
        selectedIds.clear();
        excludedIds.clear();
        refreshVoters();
      });

  void clearSmartFilter(String type) => setState(() {
        if (type == 'missingMobile') missingMobile = false;
        if (type == 'missingHouse') missingHouse = false;
        if (type == 'review') verification = '';
        if (type == 'supporter') support = '';
        page = 1;
        refreshKey++;
        selectAllFiltered = false;
        selectedIds.clear();
        excludedIds.clear();
        refreshVoters();
      });
  Future<void> openOptionSelector(String field, String label) async {
    final current = Map<String, String?>.from(filters);
    for (final key in selectedOptionFilters[field]?.keys ?? const <String>[]) {
      current.remove(key);
    }
    final option = await showDialog<_FilterOption>(
      context: context,
      builder: (_) => _FilterOptionDialog(
        field: field,
        title: label,
        currentFilters: current,
      ),
    );
    if (option == null || !mounted) return;
    setState(() {
      selectedOptionFilters[field] = option.filters;
      selectedOptionLabels[field] = option.label;
      page = 1;
      refreshKey++;
      selectAllFiltered = false;
      selectedIds.clear();
      excludedIds.clear();
      refreshVoters();
    });
  }

  void clearOption(String field) => setState(() {
        selectedOptionFilters.remove(field);
        selectedOptionLabels.remove(field);
        page = 1;
        refreshKey++;
        selectAllFiltered = false;
        selectedIds.clear();
        excludedIds.clear();
        refreshVoters();
      });

  void clearAllFilters() => setState(() {
        search.clear();
        support = '';
        verification = '';
        missingMobile = false;
        missingHouse = false;
        selectedOptionFilters.clear();
        selectedOptionLabels.clear();
        page = 1;
        refreshKey++;
        selectAllFiltered = false;
        selectedIds.clear();
        excludedIds.clear();
        votersExpanded = false;
        fieldsExpanded = true;
        refreshVoters();
      });

  Future<void> openAdvancedFilters() async {
    const definitions = <({String key, String label, IconData icon})>[
      (key: 'assembly', label: 'विधानसभा', icon: Icons.account_balance_rounded),
      (key: 'village', label: 'गाँव', icon: Icons.location_city_rounded),
      (
        key: 'gramPanchayat',
        label: 'ग्राम पंचायत',
        icon: Icons.holiday_village_rounded
      ),
      (key: 'tehsil', label: 'तहसील', icon: Icons.apartment_rounded),
      (
        key: 'municipality',
        label: 'नगर पालिका',
        icon: Icons.location_city_outlined
      ),
      (key: 'partNumber', label: 'भाग / बूथ', icon: Icons.how_to_vote_rounded),
      (
        key: 'section',
        label: 'अनुभाग',
        icon: Icons.format_list_numbered_rounded
      ),
      (key: 'caste', label: 'जाति', icon: Icons.groups_2_rounded),
      (key: 'organizationPost', label: 'संगठन पद', icon: Icons.badge_rounded),
    ];
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, sheetSetState) {
          final count = selectedOptionLabels.length +
              (support.isEmpty ? 0 : 1) +
              (verification.isEmpty ? 0 : 1) +
              (missingMobile ? 1 : 0) +
              (missingHouse ? 1 : 0);
          return Container(
            constraints: const BoxConstraints(maxWidth: 680),
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
            ),
            child: Column(children: [
              Container(
                width: 44,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: border,
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              Row(children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                      color: softBlue, borderRadius: BorderRadius.circular(13)),
                  child: const Icon(Icons.filter_alt_rounded, color: blue),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Advanced फ़िल्टर',
                            style: TextStyle(
                                color: navy,
                                fontSize: 18,
                                fontWeight: FontWeight.w900)),
                        Text('$count फ़िल्टर सक्रिय',
                            style: const TextStyle(color: muted, fontSize: 11)),
                      ]),
                ),
                if (count > 0)
                  TextButton(
                    onPressed: () {
                      clearAllFilters();
                      sheetSetState(() {});
                    },
                    child: const Text('सब हटाएं'),
                  ),
                IconButton(
                  onPressed: () => Navigator.pop(sheetContext),
                  icon: const Icon(Icons.close_rounded),
                ),
              ]),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  children: [
                    ...definitions.map((definition) => Padding(
                          padding: const EdgeInsets.only(bottom: 9),
                          child: _DatabaseFilterPicker(
                            width: double.infinity,
                            label: definition.label,
                            icon: definition.icon,
                            value: selectedOptionLabels[definition.key],
                            onTap: () async {
                              await openOptionSelector(
                                  definition.key, definition.label);
                              if (sheetContext.mounted) {
                                sheetSetState(() {});
                              }
                            },
                            onClear: () {
                              clearOption(definition.key);
                              sheetSetState(() {});
                            },
                          ),
                        )),
                    _DropFilter(
                      label: 'समर्थन',
                      value: support,
                      width: double.infinity,
                      items: const {
                        '': 'सभी',
                        'supporter': 'समर्थक',
                        'opposite': 'विरोधी',
                        'neutral': 'तटस्थ',
                        'undecided': 'अनिर्णीत',
                      },
                      onChanged: (value) {
                        support = value;
                        filtersChanged();
                        sheetSetState(() {});
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton.icon(
                  onPressed: () => Navigator.pop(sheetContext),
                  icon: const Icon(Icons.check_rounded),
                  label: Text('$count फ़िल्टर लागू करें'),
                ),
              ),
            ]),
          );
        },
      ),
    );
  }

  Future<void> openVoterPicker() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _VoterPickerSheet(
        filters: Map<String, String?>.from(filters),
        isSelected: isSelected,
        onToggle: toggleVoter,
        onSelectAll: chooseAllFiltered,
        onClear: clearSelection,
      ),
    );
    if (!mounted) return;
    if (selectAllFiltered || selectedIds.isNotEmpty) {
      setState(() {
        votersExpanded = false;
        fieldsExpanded = true;
      });
    }
  }

  void applyFieldPreset(String preset) => setState(() {
        selectedFields
          ..clear()
          ..addAll(switch (preset) {
            'basic' => {'name', 'voterId', 'guardianName', 'age', 'gender'},
            'contact' => {
                'name',
                'voterId',
                'mobile',
                'altMobile',
                'village',
                'address'
              },
            'location' => {
                'name',
                'voterId',
                'houseNumber',
                'address',
                'village',
                'gramPanchayat',
                'tehsil',
                'assembly',
                'partNumber',
                'section'
              },
            'political' => {
                'name',
                'voterId',
                'mobile',
                'village',
                'caste',
                'organizationPost',
                'supportLevel'
              },
            _ => availableFields.keys,
          });
      });

  Future<void> printSelected(int filteredTotal) async {
    if (!selectAllFiltered && selectedIds.isEmpty) return;
    final count = selectAllFiltered
        ? (filteredTotal - excludedIds.length).clamp(0, filteredTotal)
        : selectedIds.length;
    try {
      await printApiPdf(
        context,
        path: '/api/print/members.pdf',
        jobName: 'Selected voter list',
        query: {
          ...filters,
          if (selectAllFiltered) 'selectAll': 'true',
          if (!selectAllFiltered) 'ids': selectedIds.join(','),
          if (selectAllFiltered && excludedIds.isNotEmpty)
            'excludedIds': excludedIds.join(','),
          'fields': selectedFields.join(','),
          'paperSize': paper,
          'orientation': orientation,
          'columns': '$columns',
          'photo': '$photo',
          'title': 'Selected voter list ($count)',
        },
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'PDF नहीं बना: ${error.toString().replaceFirst('Exception: ', '')}'),
          action: SnackBarAction(
            label: 'Retry',
            onPressed: () => printSelected(filteredTotal),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
        future: votersFuture,
        builder: (context, snapshot) {
          final data = snapshot.data ?? const <String, dynamic>{};
          final currentItems = List<Map<String, dynamic>>.from(
            (data['items'] as List? ?? const [])
                .map((item) => Map<String, dynamic>.from(item)),
          );
          final total = _number(data['total']);
          final selectedCount = selectAllFiltered
              ? (total - excludedIds.length).clamp(0, total)
              : selectedIds.length;
          final activeFilterCount = selectedOptionLabels.length +
              (search.text.trim().isEmpty ? 0 : 1) +
              (support.isEmpty ? 0 : 1) +
              (verification.isEmpty ? 0 : 1) +
              (missingMobile ? 1 : 0) +
              (missingHouse ? 1 : 0);
          final stepTitles = const [
            'मतदाता',
            'फ़ील्ड',
            'लेआउट',
            'PDF',
          ];
          final canGoNext = switch (currentStep) {
            0 => selectedCount > 0,
            1 => selectedFields.isNotEmpty,
            _ => true,
          };
          final stepContent = switch (currentStep) {
            0 => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _CompactVoterSelectionPanel(
                    search: search,
                    selectedCount: selectedCount,
                    total: total,
                    activeFilterCount: activeFilterCount,
                    selectAllFiltered: selectAllFiltered,
                    onSearch: (_) => filtersChanged(),
                    onAllFiltered: chooseAllFiltered,
                    onMissingMobile: () => smartSelect('missingMobile'),
                    onReview: () => smartSelect('review'),
                    onSupporter: () => smartSelect('supporter'),
                    onOpenFilters: openAdvancedFilters,
                    onOpenVoters: openVoterPicker,
                    onOpenFields: () => setState(() => currentStep = 1),
                  ),
                  const SizedBox(height: 12),
                  _SelectedVoterPreview(
                    selectedCount: selectedCount,
                    selectAllFiltered: selectAllFiltered,
                    voters: currentItems
                        .where((voter) => isSelected('${voter['_id']}'))
                        .take(4)
                        .toList(),
                    fallbackVoters: currentItems.take(4).toList(),
                  ),
                ],
              ),
            1 => _FieldSelectionStep(
                onPreset: applyFieldPreset,
                onClear: () => setState(selectedFields.clear),
                fieldCategory: fieldCategory,
                categoryLabels: fieldCategoryLabels,
                onCategoryChanged: (value) =>
                    setState(() => fieldCategory = value),
                fields: fieldCategories[fieldCategory] ?? const [],
                labels: availableFields,
                selectedFields: selectedFields,
                onFieldChanged: (field, selected) => setState(() => selected
                    ? selectedFields.add(field)
                    : selectedFields.remove(field)),
                onRemoveField: (field) =>
                    setState(() => selectedFields.remove(field)),
              ),
            2 => _LayoutSelectionStep(
                paper: paper,
                orientation: orientation,
                columns: columns,
                photo: photo,
                selectedFields: selectedFields,
                labels: availableFields,
                onPaperChanged: (value) => setState(() => paper = value),
                onOrientationChanged: (value) =>
                    setState(() => orientation = value),
                onColumnsChanged: (value) =>
                    setState(() => columns = int.parse(value)),
                onPhotoChanged: (value) => setState(() => photo = value),
              ),
            _ => _GeneratePdfStep(
                selectedCount: selectedCount,
                fieldCount: selectedFields.length,
                layout:
                    '$paper · ${orientation == 'portrait' ? 'पोर्ट्रेट' : 'लैंडस्केप'} · $columns कार्ड/पंक्ति',
                ready: selectedCount > 0 && selectedFields.isNotEmpty,
                onPrint: () => printSelected(total),
              ),
          };

          final pageContent = AppPage(
            padding: EdgeInsets.fromLTRB(
                MediaQuery.sizeOf(context).width < 640 ? 14 : 20,
                18,
                MediaQuery.sizeOf(context).width < 640 ? 14 : 20,
                110),
            children: [
              _SmartPrintHeader(
                selectedCount: selectedCount,
                fieldCount: selectedFields.length,
                activeFilterCount: activeFilterCount,
                layout:
                    '$paper · ${orientation == 'portrait' ? 'पोर्ट्रेट' : 'लैंडस्केप'} · $columns कार्ड/पंक्ति',
                onOpenVoters: openVoterPicker,
              ),
              _WizardTabs(
                titles: stepTitles,
                currentStep: currentStep,
                onChanged: (step) => setState(() => currentStep = step),
              ),
              _WizardPanel(
                step: currentStep,
                title: switch (currentStep) {
                  0 => 'मतदाता चुनें',
                  1 => 'प्रिंट में दिखने वाली जानकारी',
                  2 => 'लेआउट सेट करें',
                  _ => 'PDF तैयार करें',
                },
                subtitle: switch (currentStep) {
                  0 => 'Search, filters और quick selection से मतदाता चुनें।',
                  1 => 'Preset चुनें या अपनी जरूरत के fields select करें।',
                  2 => 'Paper, card density और photo preview ठीक करें।',
                  _ => 'एक बार summary check करें और PDF बनाएं।',
                },
                icon: switch (currentStep) {
                  0 => Icons.groups_rounded,
                  1 => Icons.fact_check_rounded,
                  2 => Icons.dashboard_customize_rounded,
                  _ => Icons.picture_as_pdf_rounded,
                },
                child: stepContent,
              ),
              _WizardFooter(
                currentStep: currentStep,
                canGoNext: canGoNext,
                readyToPrint: selectedCount > 0 && selectedFields.isNotEmpty,
                onBack: currentStep == 0
                    ? null
                    : () => setState(() => currentStep--),
                onNext: currentStep >= 3
                    ? null
                    : () => setState(() => currentStep++),
                onPrint: () => printSelected(total),
              ),
            ],
          );
          return Stack(children: [
            pageContent,
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _StickyPrintBar(
                selectedCount: selectedCount,
                fieldCount: selectedFields.length,
                ready: selectedCount > 0 && selectedFields.isNotEmpty,
                onPrint: () => printSelected(total),
              ),
            ),
          ]);
        },
      );
}

class _StickyPrintBar extends StatelessWidget {
  const _StickyPrintBar({
    required this.selectedCount,
    required this.fieldCount,
    required this.ready,
    required this.onPrint,
  });

  final int selectedCount;
  final int fieldCount;
  final bool ready;
  final VoidCallback onPrint;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: border)),
            boxShadow: [
              BoxShadow(
                  color: Color(0x18071b4b),
                  blurRadius: 20,
                  offset: Offset(0, -8)),
            ],
          ),
          child: Row(children: [
            Expanded(
              child: Text(
                '$selectedCount मतदाता • $fieldCount fields',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(color: navy, fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(width: 12),
            FilledButton.icon(
              onPressed: ready ? onPrint : null,
              icon: const Icon(Icons.print_rounded),
              label: const Text('PDF बनाएं'),
            ),
          ]),
        ),
      );
}

class _SelectedVoterPreview extends StatelessWidget {
  const _SelectedVoterPreview({
    required this.selectedCount,
    required this.selectAllFiltered,
    required this.voters,
    required this.fallbackVoters,
  });

  final int selectedCount;
  final bool selectAllFiltered;
  final List<Map<String, dynamic>> voters;
  final List<Map<String, dynamic>> fallbackVoters;

  @override
  Widget build(BuildContext context) {
    final preview =
        voters.isEmpty && selectAllFiltered ? fallbackVoters : voters;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xfff8fbff),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.preview_rounded, color: blue, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              selectedCount == 0
                  ? 'Selected voter preview'
                  : selectAllFiltered
                      ? 'Filtered voters preview ($selectedCount selected)'
                      : 'Selected voter preview ($selectedCount selected)',
              style: const TextStyle(color: navy, fontWeight: FontWeight.w900),
            ),
          ),
        ]),
        const SizedBox(height: 8),
        if (selectedCount == 0)
          const Text('मतदाता चुनने के बाद यहाँ sample cards दिखेंगे।',
              style: TextStyle(color: muted, fontWeight: FontWeight.w700))
        else if (preview.isEmpty)
          const Text('Selection saved है — preview के लिए voter picker खोलें।',
              style: TextStyle(color: muted, fontWeight: FontWeight.w700))
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: preview
                .map((voter) => Container(
                      width: 220,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: border),
                      ),
                      child: Row(children: [
                        const CircleAvatar(
                          radius: 18,
                          backgroundColor: softBlue,
                          child: Icon(Icons.person_rounded, color: blue),
                        ),
                        const SizedBox(width: 9),
                        Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${voter['name'] ?? '-'}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        color: navy,
                                        fontWeight: FontWeight.w900)),
                                Text(
                                    'EPIC ${voter['voterId'] ?? '-'} · घर ${voter['houseNumber'] ?? '-'}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        color: muted, fontSize: 11)),
                              ]),
                        ),
                      ]),
                    ))
                .toList(),
          ),
      ]),
    );
  }
}

class _SmartPrintHeader extends StatelessWidget {
  const _SmartPrintHeader(
      {required this.selectedCount,
      required this.fieldCount,
      required this.activeFilterCount,
      required this.layout,
      required this.onOpenVoters});
  final int selectedCount;
  final int fieldCount;
  final int activeFilterCount;
  final String layout;
  final VoidCallback onOpenVoters;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 640;
    Widget stat(IconData icon, String label, Color color) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
          decoration: BoxDecoration(
              color: color.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(12)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 5),
            Text(label,
                style: const TextStyle(
                    color: navy, fontSize: 11, fontWeight: FontWeight.w800)),
          ]),
        );
    return Container(
      padding: EdgeInsets.all(compact ? 12 : 16),
      decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
              width: compact ? 40 : 46,
              height: compact ? 40 : 46,
              decoration: BoxDecoration(
                  color: softBlue, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.print_rounded, color: blue)),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('विस्तृत प्रिंट',
                    style: TextStyle(
                        color: navy,
                        fontSize: compact ? 18 : 20,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text('मतदाता चुनें और PDF बनाएं',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: muted, fontSize: 12)),
              ])),
          IconButton.filledTonal(
              tooltip: 'चयनित मतदाता देखें',
              onPressed: onOpenVoters,
              icon: const Icon(Icons.people_alt_rounded)),
        ]),
        const SizedBox(height: 10),
        if (compact)
          SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: [
                stat(Icons.groups_rounded, '$selectedCount मतदाता', orange),
                const SizedBox(width: 7),
                stat(Icons.view_list_rounded, '$fieldCount fields', green),
                const SizedBox(width: 7),
                stat(Icons.tune_rounded, '$activeFilterCount filters', blue),
              ]))
        else
          Wrap(spacing: 10, runSpacing: 8, children: [
            stat(Icons.groups_rounded, '$selectedCount मतदाता चुने', orange),
            stat(Icons.view_list_rounded, '$fieldCount fields चुने', green),
            stat(Icons.tune_rounded, '$activeFilterCount filters सक्रिय', blue),
            stat(Icons.article_rounded, layout, purple),
          ]),
      ]),
    );
  }
}

class _HeaderMetric extends StatelessWidget {
  const _HeaderMetric(
      this.icon, this.label, this.value, this.color, this.width);
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final double width;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: Row(children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(color: muted, fontSize: 10)),
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: navy, fontWeight: FontWeight.w900, fontSize: 12)),
            ]),
          ),
        ]),
      );
}

class _WizardTabs extends StatelessWidget {
  const _WizardTabs(
      {required this.titles,
      required this.currentStep,
      required this.onChanged});
  final List<String> titles;
  final int currentStep;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 640;
    Widget tab(int index) {
      final selected = index == currentStep;
      return InkWell(
        onTap: () => onChanged(index),
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          constraints: BoxConstraints(minWidth: compact ? 86 : 0),
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
          decoration: BoxDecoration(
              color: selected ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              boxShadow: selected
                  ? const [
                      BoxShadow(
                          color: Color(0x14071b4b),
                          blurRadius: 8,
                          offset: Offset(0, 3))
                    ]
                  : null),
          child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                    width: 20,
                    height: 20,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: selected ? blue : border,
                        shape: BoxShape.circle),
                    child: Text('${index + 1}',
                        style: TextStyle(
                            color: selected ? Colors.white : muted,
                            fontSize: 11,
                            fontWeight: FontWeight.w900))),
                const SizedBox(width: 6),
                Text(titles[index],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: selected ? navy : muted,
                        fontSize: 11,
                        fontWeight: FontWeight.w800)),
              ]),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
          color: const Color(0xffeef3fb),
          borderRadius: BorderRadius.circular(14)),
      child: compact
          ? SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                  children: List.generate(
                      titles.length,
                      (index) => Padding(
                          padding: EdgeInsets.only(
                              right: index == titles.length - 1 ? 0 : 4),
                          child: tab(index)))))
          : Row(
              children: List.generate(
                  titles.length,
                  (index) => Expanded(
                      child: Padding(
                          padding: EdgeInsets.only(
                              right: index == titles.length - 1 ? 0 : 4),
                          child: tab(index))))),
    );
  }
}

class _WizardPanel extends StatelessWidget {
  const _WizardPanel({
    required this.step,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.child,
  });
  final int step;
  final String title;
  final String subtitle;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: softBlue,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: blue, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${step + 1}. $title',
                        style: const TextStyle(
                            color: navy,
                            fontSize: 17,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: muted, fontSize: 12)),
                  ]),
            ),
          ]),
          const Divider(height: 26),
          child,
        ]),
      );
}

class _WizardFooter extends StatelessWidget {
  const _WizardFooter({
    required this.currentStep,
    required this.canGoNext,
    required this.readyToPrint,
    required this.onBack,
    required this.onNext,
    required this.onPrint,
  });
  final int currentStep;
  final bool canGoNext;
  final bool readyToPrint;
  final VoidCallback? onBack;
  final VoidCallback? onNext;
  final VoidCallback onPrint;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(children: [
          OutlinedButton.icon(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_rounded),
            label: const Text('पीछे'),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: currentStep == 3
                ? FilledButton.icon(
                    onPressed: readyToPrint ? onPrint : null,
                    icon: const Icon(Icons.picture_as_pdf_rounded),
                    label: const Text('PDF बनाएं और डाउनलोड करें'),
                  )
                : FilledButton.icon(
                    onPressed: canGoNext ? onNext : null,
                    icon: const Icon(Icons.arrow_forward_rounded),
                    label: const Text('अगला'),
                  ),
          ),
        ]),
      );
}

class _FieldSelectionStep extends StatelessWidget {
  const _FieldSelectionStep({
    required this.onPreset,
    required this.onClear,
    required this.fieldCategory,
    required this.categoryLabels,
    required this.onCategoryChanged,
    required this.fields,
    required this.labels,
    required this.selectedFields,
    required this.onFieldChanged,
    required this.onRemoveField,
  });
  final ValueChanged<String> onPreset;
  final VoidCallback onClear;
  final String fieldCategory;
  final Map<String, String> categoryLabels;
  final ValueChanged<String> onCategoryChanged;
  final List<String> fields;
  final Map<String, String> labels;
  final Set<String> selectedFields;
  final void Function(String field, bool selected) onFieldChanged;
  final ValueChanged<String> onRemoveField;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PresetBar(onPreset: onPreset, onClear: onClear),
          const SizedBox(height: 10),
          _FieldCategoryBar(
            selected: fieldCategory,
            labels: categoryLabels,
            onChanged: onCategoryChanged,
          ),
          const SizedBox(height: 12),
          _FieldCategoryPanel(
            title: categoryLabels[fieldCategory] ?? 'Fields',
            fields: fields,
            labels: labels,
            selectedFields: selectedFields,
            onChanged: onFieldChanged,
          ),
          const SizedBox(height: 12),
          _SelectedFieldSummary(
            count: selectedFields.length,
            fields: selectedFields,
            labels: labels,
            onRemove: onRemoveField,
          ),
        ],
      );
}

class _LayoutSelectionStep extends StatelessWidget {
  const _LayoutSelectionStep({
    required this.paper,
    required this.orientation,
    required this.columns,
    required this.photo,
    required this.selectedFields,
    required this.labels,
    required this.onPaperChanged,
    required this.onOrientationChanged,
    required this.onColumnsChanged,
    required this.onPhotoChanged,
  });
  final String paper;
  final String orientation;
  final int columns;
  final bool photo;
  final Set<String> selectedFields;
  final Map<String, String> labels;
  final ValueChanged<String> onPaperChanged;
  final ValueChanged<String> onOrientationChanged;
  final ValueChanged<String> onColumnsChanged;
  final ValueChanged<bool> onPhotoChanged;

  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (context, constraints) {
        final controls = Wrap(spacing: 10, runSpacing: 10, children: [
          _SimpleDropdown(
              label: 'पेपर',
              value: paper,
              items: const ['A4', 'A3', 'LETTER'],
              onChanged: onPaperChanged),
          _SimpleDropdown(
              label: 'दिशा',
              value: orientation,
              items: const ['portrait', 'landscape'],
              display: const {
                'portrait': 'पोर्ट्रेट',
                'landscape': 'लैंडस्केप'
              },
              onChanged: onOrientationChanged),
          _SimpleDropdown(
              label: 'कार्ड / पंक्ति',
              value: '$columns',
              items: const ['1', '2', '3'],
              onChanged: onColumnsChanged),
          FilterChip(
              avatar: const Icon(Icons.photo_outlined, size: 18),
              label: Text(photo ? 'फोटो शामिल' : 'बिना फोटो'),
              selected: photo,
              onSelected: onPhotoChanged),
        ]);
        final preview = _PrintPreviewMock(
            columns: columns,
            photo: photo,
            fields: selectedFields.take(6).map((key) => labels[key]!).toList());
        if (constraints.maxWidth < 760) {
          return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                controls,
                const SizedBox(height: 8),
                _PhotoPrintNote(photo: photo),
                const SizedBox(height: 16),
                preview,
              ]);
        }
        return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                controls,
                const SizedBox(height: 8),
                _PhotoPrintNote(photo: photo),
              ])),
          const SizedBox(width: 18),
          SizedBox(width: 320, child: preview),
        ]);
      });
}

class _PhotoPrintNote extends StatelessWidget {
  const _PhotoPrintNote({required this.photo});
  final bool photo;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: photo ? const Color(0xffecfdf3) : const Color(0xfffff7ed),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: photo ? const Color(0xffbdebd0) : const Color(0xffffdfb3)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(photo ? Icons.check_circle_rounded : Icons.info_outline_rounded,
              color: photo ? green : orange, size: 17),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              photo
                  ? 'PDF में उपलब्ध voter photo print होगी।'
                  : 'Photo print बंद है — जरूरत हो तो chip tap करके चालू करें।',
              style: const TextStyle(
                  color: navy, fontSize: 12, fontWeight: FontWeight.w800),
            ),
          ),
        ]),
      );
}

class _GeneratePdfStep extends StatelessWidget {
  const _GeneratePdfStep({
    required this.selectedCount,
    required this.fieldCount,
    required this.layout,
    required this.ready,
    required this.onPrint,
  });
  final int selectedCount;
  final int fieldCount;
  final String layout;
  final bool ready;
  final VoidCallback onPrint;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ReviewRow(Icons.groups_rounded, 'मतदाता', '$selectedCount चुने'),
          _ReviewRow(Icons.view_list_rounded, 'फ़ील्ड', '$fieldCount चुने'),
          _ReviewRow(Icons.dashboard_customize_rounded, 'लेआउट', layout),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton.icon(
              onPressed: ready ? onPrint : null,
              icon: const Icon(Icons.picture_as_pdf_rounded),
              label: const Text('PDF बनाएं और डाउनलोड करें'),
            ),
          ),
        ],
      );
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xfff8faff),
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(children: [
          Icon(icon, color: blue, size: 20),
          const SizedBox(width: 10),
          Text(label, style: const TextStyle(color: muted, fontSize: 12)),
          const Spacer(),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.right,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(color: navy, fontWeight: FontWeight.w900)),
          ),
        ]),
      );
}

class _PrintStepProgress extends StatelessWidget {
  const _PrintStepProgress({
    required this.selectedCount,
    required this.fieldsReady,
    required this.layoutReady,
  });

  final int selectedCount;
  final bool fieldsReady;
  final bool layoutReady;

  @override
  Widget build(BuildContext context) {
    final activeStep = selectedCount == 0
        ? 0
        : !fieldsReady
            ? 1
            : layoutReady
                ? 3
                : 2;
    const labels = ['मतदाता', 'फ़ील्ड', 'लेआउट', 'PDF'];
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 13),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
              color: Color(0x0d071b4b), blurRadius: 18, offset: Offset(0, 8)),
        ],
      ),
      child: Row(
        children: List.generate(labels.length, (index) {
          final reached = index <= activeStep;
          return Expanded(
            child: Row(children: [
              Expanded(
                child: Column(children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: reached ? blue : const Color(0xffe8edf6),
                      boxShadow: reached
                          ? const [
                              BoxShadow(
                                  color: Color(0x331457f5),
                                  blurRadius: 10,
                                  offset: Offset(0, 4))
                            ]
                          : null,
                    ),
                    alignment: Alignment.center,
                    child: Text('${index + 1}',
                        style: TextStyle(
                            color: reached ? Colors.white : navy,
                            fontWeight: FontWeight.w900)),
                  ),
                  const SizedBox(height: 7),
                  Text(labels[index],
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: reached ? navy : muted,
                          fontSize: 10,
                          fontWeight: FontWeight.w800)),
                ]),
              ),
              if (index < labels.length - 1)
                Container(
                  width: 10,
                  height: 2,
                  margin: const EdgeInsets.only(bottom: 24),
                  color: index < activeStep ? blue : border,
                ),
            ]),
          );
        }),
      ),
    );
  }
}

class _PrintStepCard extends StatelessWidget {
  const _PrintStepCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.expanded,
    required this.onToggle,
    required this.child,
    this.action,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool expanded;
  final VoidCallback onToggle;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border:
              Border.all(color: expanded ? const Color(0xffcbdcff) : border),
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0d071b4b), blurRadius: 18, offset: Offset(0, 8)),
          ],
        ),
        child: Column(children: [
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(18),
            child: Padding(
              padding: const EdgeInsets.all(15),
              child: Row(children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: softBlue,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: blue, size: 21),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            style: const TextStyle(
                                color: navy,
                                fontSize: 16,
                                fontWeight: FontWeight.w900)),
                        const SizedBox(height: 3),
                        Text(subtitle,
                            maxLines: expanded ? 2 : 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: muted, fontSize: 11)),
                      ]),
                ),
                if (action != null) ...[
                  const SizedBox(width: 6),
                  action!,
                ],
                AnimatedRotation(
                  turns: expanded ? .5 : 0,
                  duration: const Duration(milliseconds: 220),
                  child: const Icon(Icons.keyboard_arrow_down_rounded,
                      color: navy),
                ),
              ]),
            ),
          ),
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 220),
            crossFadeState:
                expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Padding(
              padding: const EdgeInsets.fromLTRB(15, 0, 15, 15),
              child: Column(children: [
                const Divider(height: 1),
                const SizedBox(height: 15),
                child,
              ]),
            ),
          ),
        ]),
      );
}

class _SelectionBadge extends StatelessWidget {
  const _SelectionBadge({
    required this.count,
    required this.allFiltered,
    this.onTap,
  });
  final int count;
  final bool allFiltered;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
            decoration: BoxDecoration(
                color: count > 0 ? const Color(0xffeaf8f0) : Colors.white,
                border: Border.all(color: count > 0 ? green : border),
                borderRadius: BorderRadius.circular(10)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(
                  count > 0
                      ? Icons.check_circle_rounded
                      : Icons.touch_app_rounded,
                  color: count > 0 ? green : muted,
                  size: 19),
              const SizedBox(width: 7),
              Text(
                  count > 0
                      ? '$count चुने${allFiltered ? ' (फ़िल्टर से)' : ''}'
                      : 'मतदाता चुनें',
                  style: TextStyle(
                      color: count > 0 ? green : muted,
                      fontWeight: FontWeight.w800)),
            ]),
          ),
        ),
      );
}

class _PresetBar extends StatelessWidget {
  const _PresetBar({required this.onPreset, required this.onClear});

  final ValueChanged<String> onPreset;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          _PresetButton(
              Icons.badge_outlined, 'बुनियादी', () => onPreset('basic')),
          _PresetButton(
              Icons.call_outlined, 'संपर्क', () => onPreset('contact')),
          _PresetButton(
              Icons.map_outlined, 'क्षेत्र', () => onPreset('location')),
          _PresetButton(
              Icons.groups_outlined, 'राजनीतिक', () => onPreset('political')),
          _PresetButton(Icons.done_all_rounded, 'सभी', () => onPreset('all')),
          _PresetButton(Icons.clear_all_rounded, 'हटाएं', onClear),
        ]),
      );
}

class _PresetButton extends StatelessWidget {
  const _PresetButton(this.icon, this.label, this.onTap);

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 7),
        child: ActionChip(
          avatar: Icon(icon, size: 17),
          label: Text(label),
          visualDensity: VisualDensity.compact,
          onPressed: onTap,
        ),
      );
}

class _FieldCategoryBar extends StatelessWidget {
  const _FieldCategoryBar({
    required this.selected,
    required this.labels,
    required this.onChanged,
  });

  final String selected;
  final Map<String, String> labels;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: labels.entries
              .map((entry) => Padding(
                    padding: const EdgeInsets.only(right: 7),
                    child: ChoiceChip(
                      label: Text(entry.value),
                      selected: selected == entry.key,
                      visualDensity: VisualDensity.compact,
                      onSelected: (_) => onChanged(entry.key),
                    ),
                  ))
              .toList(),
        ),
      );
}

class _FieldCategoryPanel extends StatelessWidget {
  const _FieldCategoryPanel({
    required this.title,
    required this.fields,
    required this.labels,
    required this.selectedFields,
    required this.onChanged,
  });

  final String title;
  final List<String> fields;
  final Map<String, String> labels;
  final Set<String> selectedFields;
  final void Function(String field, bool selected) onChanged;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xfff7f9fd),
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: const TextStyle(color: navy, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: fields
                .map((field) => FilterChip(
                      label: Text(labels[field] ?? field),
                      selected: selectedFields.contains(field),
                      visualDensity: VisualDensity.compact,
                      onSelected: (value) => onChanged(field, value),
                    ))
                .toList(),
          ),
        ]),
      );
}

class _SelectedFieldSummary extends StatelessWidget {
  const _SelectedFieldSummary({
    required this.count,
    required this.fields,
    required this.labels,
    required this.onRemove,
  });

  final int count;
  final Set<String> fields;
  final Map<String, String> labels;
  final ValueChanged<String> onRemove;

  @override
  Widget build(BuildContext context) {
    final preview = fields.take(6).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('$count फ़ील्ड चुने गए',
          style: const TextStyle(color: muted, fontSize: 12)),
      if (preview.isNotEmpty) ...[
        const SizedBox(height: 6),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: preview
                .map((field) => Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: InputChip(
                        label: Text(labels[field] ?? field),
                        visualDensity: VisualDensity.compact,
                        onDeleted: () => onRemove(field),
                      ),
                    ))
                .toList(),
          ),
        ),
      ],
    ]);
  }
}

class _PrintSetupSummary extends StatelessWidget {
  const _PrintSetupSummary({
    required this.selectedCount,
    required this.fieldCount,
    required this.activeFilterCount,
    required this.layout,
    required this.ready,
  });

  final int selectedCount;
  final int fieldCount;
  final int activeFilterCount;
  final String layout;
  final bool ready;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ready ? const Color(0xffeaf8f0) : Colors.white,
          border: Border.all(color: ready ? green : border),
          borderRadius: BorderRadius.circular(10),
        ),
        child: LayoutBuilder(builder: (context, constraints) {
          final itemWidth = constraints.maxWidth < 720
              ? (constraints.maxWidth - 8) / 2
              : (constraints.maxWidth - 24) / 4;
          return Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _SummaryPill(
                icon: Icons.groups_rounded,
                label: 'मतदाता',
                value: '$selectedCount चुने',
                color: selectedCount > 0 ? green : orange,
                width: itemWidth,
              ),
              _SummaryPill(
                icon: Icons.filter_alt_rounded,
                label: 'फ़िल्टर',
                value: '$activeFilterCount सक्रिय',
                color: blue,
                width: itemWidth,
              ),
              _SummaryPill(
                icon: Icons.view_list_rounded,
                label: 'फ़ील्ड',
                value: '$fieldCount चुने',
                color: fieldCount > 0 ? green : rose,
                width: itemWidth,
              ),
              _SummaryPill(
                icon: Icons.description_rounded,
                label: 'लेआउट',
                value: layout,
                color: purple,
                width: itemWidth,
              ),
            ],
          );
        }),
      );
}

class _SummaryPill extends StatelessWidget {
  const _SummaryPill({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.width,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final double width;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: Row(children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(color: muted, fontSize: 11)),
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: navy, fontWeight: FontWeight.w900, fontSize: 12)),
            ]),
          ),
        ]),
      );
}

class _CompactVoterSelectionPanel extends StatelessWidget {
  const _CompactVoterSelectionPanel({
    required this.search,
    required this.selectedCount,
    required this.total,
    required this.activeFilterCount,
    required this.selectAllFiltered,
    required this.onSearch,
    required this.onAllFiltered,
    required this.onMissingMobile,
    required this.onReview,
    required this.onSupporter,
    required this.onOpenFilters,
    required this.onOpenVoters,
    required this.onOpenFields,
  });

  final TextEditingController search;
  final int selectedCount;
  final int total;
  final int activeFilterCount;
  final bool selectAllFiltered;
  final ValueChanged<String> onSearch;
  final VoidCallback onAllFiltered;
  final VoidCallback onMissingMobile;
  final VoidCallback onReview;
  final VoidCallback onSupporter;
  final VoidCallback onOpenFilters;
  final VoidCallback onOpenVoters;
  final VoidCallback onOpenFields;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: search,
            onChanged: onSearch,
            decoration: InputDecoration(
              hintText: 'नाम, EPIC, मोबाइल या घर संख्या खोजें...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: search.text.isEmpty
                  ? null
                  : IconButton(
                      onPressed: () {
                        search.clear();
                        onSearch('');
                      },
                      icon: const Icon(Icons.close_rounded),
                    ),
            ),
          ),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: onOpenFilters,
                icon: const Icon(Icons.tune_rounded),
                label: Text(activeFilterCount == 0
                    ? 'Advanced फ़िल्टर'
                    : 'फ़िल्टर ($activeFilterCount)'),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: FilledButton.tonalIcon(
                onPressed: onOpenVoters,
                icon: const Icon(Icons.people_alt_rounded),
                label: Text(selectedCount == 0
                    ? 'मतदाता चुनें'
                    : '$selectedCount चयनित'),
              ),
            ),
          ]),
          const SizedBox(height: 13),
          const Text('जल्दी चुनें',
              style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          SizedBox(
            height: 92,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _CompactQuickCard(
                  icon: Icons.select_all_rounded,
                  title: 'फ़िल्टर के सभी',
                  subtitle: '$total मतदाता',
                  color: blue,
                  selected: selectAllFiltered,
                  onTap: onAllFiltered,
                ),
                _CompactQuickCard(
                  icon: Icons.phone_disabled_rounded,
                  title: 'मोबाइल नहीं',
                  subtitle: 'बिना नंबर',
                  color: rose,
                  onTap: onMissingMobile,
                ),
                _CompactQuickCard(
                  icon: Icons.fact_check_rounded,
                  title: 'समीक्षा जरूरी',
                  subtitle: 'Review सूची',
                  color: purple,
                  onTap: onReview,
                ),
                _CompactQuickCard(
                  icon: Icons.thumb_up_alt_rounded,
                  title: 'समर्थक',
                  subtitle: 'Supporter सूची',
                  color: green,
                  onTap: onSupporter,
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Material(
            color: const Color(0xffedf4ff),
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: selectedCount == 0 ? onOpenVoters : onOpenFields,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                child: Row(children: [
                  const Icon(Icons.info_outline_rounded, color: blue, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      selectedCount == 0
                          ? 'अभी कोई मतदाता नहीं चुना गया'
                          : '$selectedCount मतदाता चुने गए',
                      style: const TextStyle(
                          color: blue, fontWeight: FontWeight.w800),
                    ),
                  ),
                  Text(selectedCount == 0 ? 'चुनें' : 'अगला: फ़ील्ड',
                      style: const TextStyle(
                          color: blue, fontWeight: FontWeight.w900)),
                  const Icon(Icons.chevron_right_rounded, color: blue),
                ]),
              ),
            ),
          ),
        ],
      );
}

class _CompactQuickCard extends StatelessWidget {
  const _CompactQuickCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.selected = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) => Container(
        width: 150,
        margin: const EdgeInsets.only(right: 8),
        child: Material(
          color: selected ? color.withValues(alpha: .12) : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(13),
            side: BorderSide(
                color: selected ? color : color.withValues(alpha: .25)),
          ),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(13),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Row(children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: navy,
                                fontSize: 11,
                                fontWeight: FontWeight.w900)),
                        const SizedBox(height: 3),
                        Text(subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: muted, fontSize: 9)),
                      ]),
                ),
                if (selected)
                  Icon(Icons.check_circle_rounded, color: color, size: 17),
              ]),
            ),
          ),
        ),
      );
}

class _VoterPickerSheet extends StatefulWidget {
  const _VoterPickerSheet({
    required this.filters,
    required this.isSelected,
    required this.onToggle,
    required this.onSelectAll,
    required this.onClear,
  });

  final Map<String, String?> filters;
  final bool Function(String id) isSelected;
  final void Function(String id, bool selected) onToggle;
  final VoidCallback onSelectAll;
  final VoidCallback onClear;

  @override
  State<_VoterPickerSheet> createState() => _VoterPickerSheetState();
}

class _VoterPickerSheetState extends State<_VoterPickerSheet> {
  int page = 1;
  static const pageSize = 40;
  late Future<Map<String, dynamic>> future;

  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    future = api.getQuery('/api/members', {
      ...widget.filters,
      'paged': 'true',
      'page': '$page',
      'limit': '$pageSize',
    });
  }

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(maxWidth: 720),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 10, 10),
            child: Column(children: [
              Container(
                width: 44,
                height: 4,
                margin: const EdgeInsets.only(bottom: 13),
                decoration: BoxDecoration(
                    color: border, borderRadius: BorderRadius.circular(20)),
              ),
              Row(children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                      color: softBlue, borderRadius: BorderRadius.circular(13)),
                  child: const Icon(Icons.people_alt_rounded, color: blue),
                ),
                const SizedBox(width: 11),
                const Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('मतदाता चुनें',
                            style: TextStyle(
                                color: navy,
                                fontSize: 18,
                                fontWeight: FontWeight.w900)),
                        Text('चेकबॉक्स से अपनी पसंद के मतदाता चुनें',
                            style: TextStyle(color: muted, fontSize: 11)),
                      ]),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: () => setState(widget.onSelectAll),
                    icon: const Icon(Icons.select_all_rounded),
                    label: const Text('सभी परिणाम चुनें'),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => setState(widget.onClear),
                  child: const Text('चयन हटाएं'),
                ),
              ]),
            ]),
          ),
          const Divider(height: 1),
          Expanded(
            child: FutureBuilder<Map<String, dynamic>>(
              future: future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text('${snapshot.error}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: rose)),
                    ),
                  );
                }
                final data = snapshot.data ?? const <String, dynamic>{};
                final voters = List<Map<String, dynamic>>.from(
                  (data['items'] as List? ?? [])
                      .map((item) => Map<String, dynamic>.from(item)),
                );
                final total = _number(data['total']);
                final pages = _number(data['pages']).clamp(1, 999999);
                if (voters.isEmpty) {
                  return const Center(
                    child: Text('इस खोज या फ़िल्टर में कोई मतदाता नहीं मिला।',
                        style: TextStyle(color: muted)),
                  );
                }
                return Column(children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                    child: Row(children: [
                      Text('$total मतदाता',
                          style: const TextStyle(
                              color: navy, fontWeight: FontWeight.w900)),
                      const Spacer(),
                      Text('पेज $page / $pages',
                          style: const TextStyle(color: muted, fontSize: 11)),
                    ]),
                  ),
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(10, 4, 10, 10),
                      itemCount: voters.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, index) {
                        final voter = voters[index];
                        final id = '${voter['_id']}';
                        return _VoterChoice(
                          voter: voter,
                          selected: widget.isSelected(id),
                          onChanged: (selected) {
                            widget.onToggle(id, selected);
                            setState(() {});
                          },
                        );
                      },
                    ),
                  ),
                  if (pages > 1)
                    SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                        child: Row(children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: page <= 1
                                  ? null
                                  : () => setState(() {
                                        page--;
                                        load();
                                      }),
                              icon: const Icon(Icons.chevron_left_rounded),
                              label: const Text('पिछला'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: FilledButton.tonalIcon(
                              onPressed: page >= pages
                                  ? null
                                  : () => setState(() {
                                        page++;
                                        load();
                                      }),
                              icon: const Icon(Icons.chevron_right_rounded),
                              label: const Text('अगला'),
                            ),
                          ),
                        ]),
                      ),
                    ),
                ]);
              },
            ),
          ),
        ]),
      );
}

class _QuickSelectPanel extends StatelessWidget {
  const _QuickSelectPanel({
    required this.onMissingMobile,
    required this.onMissingHouse,
    required this.onReview,
    required this.onSupporter,
    required this.onAllFiltered,
  });

  final VoidCallback onMissingMobile;
  final VoidCallback onMissingHouse;
  final VoidCallback onReview;
  final VoidCallback onSupporter;
  final VoidCallback onAllFiltered;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('जल्दी चुनें',
              style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          LayoutBuilder(builder: (context, constraints) {
            final wide = constraints.maxWidth >= 760;
            final width =
                wide ? (constraints.maxWidth - 16) / 3 : constraints.maxWidth;
            return Wrap(spacing: 8, runSpacing: 8, children: [
              _QuickSelectTile(
                icon: Icons.select_all_rounded,
                title: 'फ़िल्टर के सभी मतदाता',
                subtitle: 'मौजूदा फ़िल्टर से मिले सभी मतदाता चुनें',
                color: blue,
                width: width,
                onTap: onAllFiltered,
              ),
              _QuickSelectTile(
                icon: Icons.phone_disabled_rounded,
                title: 'मोबाइल नहीं है',
                subtitle: 'बिना मोबाइल नंबर वाले मतदाता चुनें',
                color: rose,
                width: width,
                onTap: onMissingMobile,
              ),
              _QuickSelectTile(
                icon: Icons.other_houses_rounded,
                title: 'घर संख्या नहीं है',
                subtitle: 'बिना घर संख्या वाले मतदाता चुनें',
                color: orange,
                width: width,
                onTap: onMissingHouse,
              ),
              _QuickSelectTile(
                icon: Icons.fact_check_rounded,
                title: 'समीक्षा जरूरी',
                subtitle: 'समीक्षा के लिए चिह्नित मतदाता चुनें',
                color: purple,
                width: width,
                onTap: onReview,
              ),
              _QuickSelectTile(
                icon: Icons.groups_rounded,
                title: 'समर्थक',
                subtitle: 'केवल समर्थक मतदाता चुनें',
                color: green,
                width: width,
                onTap: onSupporter,
              ),
            ]);
          }),
        ],
      );
}

class _QuickSelectTile extends StatelessWidget {
  const _QuickSelectTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.width,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final double width;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: Material(
          color: color.withValues(alpha: .06),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: color.withValues(alpha: .28)),
          ),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            style: const TextStyle(
                                color: navy, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 2),
                        Text(subtitle,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: muted, fontSize: 11)),
                      ]),
                ),
                const Icon(Icons.chevron_right_rounded, color: muted),
              ]),
            ),
          ),
        ),
      );
}

class _FilterOption {
  const _FilterOption(
      {required this.label, required this.count, required this.filters});
  final String label;
  final int count;
  final Map<String, String> filters;

  factory _FilterOption.fromMap(Map<String, dynamic> map) => _FilterOption(
        label: '${map['label'] ?? map['value'] ?? '-'}',
        count: _number(map['count']),
        filters: Map<String, String>.from(
          (map['filters'] as Map? ?? const {}).map(
            (key, value) => MapEntry('$key', '$value'),
          ),
        ),
      );
}

class _FilterOptionDialog extends StatefulWidget {
  const _FilterOptionDialog({
    required this.field,
    required this.title,
    required this.currentFilters,
  });
  final String field;
  final String title;
  final Map<String, String?> currentFilters;

  @override
  State<_FilterOptionDialog> createState() => _FilterOptionDialogState();
}

class _FilterOptionDialogState extends State<_FilterOptionDialog> {
  final search = TextEditingController();

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        titlePadding: const EdgeInsets.fromLTRB(20, 18, 12, 8),
        contentPadding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        title: Row(children: [
          Expanded(
              child: Text('${widget.title} चुनें',
                  style: const TextStyle(
                      color: navy, fontWeight: FontWeight.w900))),
          IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close_rounded)),
        ]),
        content: SizedBox(
          width: 520,
          height: 560,
          child: Column(children: [
            TextField(
              controller: search,
              autofocus: true,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search_rounded),
                hintText: '${widget.title} खोजें...',
                suffixIcon: search.text.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          search.clear();
                          setState(() {});
                        },
                        icon: const Icon(Icons.close_rounded)),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                future: api.getQuery('/api/members/filter-options', {
                  ...widget.currentFilters,
                  'field': widget.field,
                  'q': search.text.trim(),
                  'limit': '120',
                }),
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(
                        child: Text('${snapshot.error}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.red)));
                  }
                  final options = List<Map<String, dynamic>>.from(
                    (snapshot.data?['items'] as List? ?? [])
                        .map((item) => Map<String, dynamic>.from(item)),
                  ).map(_FilterOption.fromMap).toList();
                  if (options.isEmpty) {
                    return const Center(
                        child: Text('Database में कोई विकल्प नहीं मिला।',
                            style: TextStyle(color: muted)));
                  }
                  return ListView.separated(
                    itemCount: options.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, index) {
                      final option = options[index];
                      return ListTile(
                        leading: const CircleAvatar(
                            backgroundColor: Color(0xffedf4ff),
                            child: Icon(Icons.location_on_rounded,
                                color: blue, size: 20)),
                        title: Text(option.label,
                            style: const TextStyle(
                                color: navy, fontWeight: FontWeight.w800)),
                        subtitle: Text('${option.count} मतदाता'),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => Navigator.pop(context, option),
                      );
                    },
                  );
                },
              ),
            ),
          ]),
        ),
      );
}

class _DatabaseFilterPicker extends StatelessWidget {
  const _DatabaseFilterPicker({
    required this.label,
    required this.icon,
    required this.value,
    required this.onTap,
    required this.onClear,
    this.width = 210,
  });
  final String label;
  final IconData icon;
  final String? value;
  final VoidCallback onTap;
  final VoidCallback onClear;
  final double width;

  @override
  Widget build(BuildContext context) {
    final selected = value != null && value!.trim().isNotEmpty;
    return SizedBox(
      width: width,
      child: Material(
        color: selected ? const Color(0xffedf4ff) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(color: selected ? blue : border),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 9, 6, 9),
            child: Row(children: [
              Icon(icon, color: selected ? blue : muted, size: 21),
              const SizedBox(width: 9),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(label,
                        style: const TextStyle(color: muted, fontSize: 10)),
                    const SizedBox(height: 2),
                    Text(selected ? value! : 'Select from database',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            color: selected ? navy : muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w800)),
                  ])),
              if (selected)
                IconButton(
                    tooltip: 'Remove',
                    visualDensity: VisualDensity.compact,
                    onPressed: onClear,
                    icon: const Icon(Icons.close_rounded, size: 18))
              else
                const Icon(Icons.arrow_drop_down_rounded, color: muted),
            ]),
          ),
        ),
      ),
    );
  }
}

class _SearchBox extends StatelessWidget {
  const _SearchBox(
      {required this.controller,
      required this.label,
      required this.icon,
      required this.onChanged,
      this.width = 180});
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final ValueChanged<String> onChanged;
  final double width;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          decoration: InputDecoration(
              labelText: label, prefixIcon: Icon(icon, size: 20)),
        ),
      );
}

class _DropFilter extends StatelessWidget {
  const _DropFilter(
      {required this.label,
      required this.value,
      required this.items,
      required this.onChanged,
      this.width = 180});
  final String label;
  final String value;
  final Map<String, String> items;
  final ValueChanged<String> onChanged;
  final double width;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: DropdownButtonFormField<String>(
          key: ValueKey('$label-$value'),
          initialValue: value,
          decoration: InputDecoration(labelText: label),
          items: items.entries
              .map((entry) =>
                  DropdownMenuItem(value: entry.key, child: Text(entry.value)))
              .toList(),
          onChanged: (value) => onChanged(value ?? ''),
        ),
      );
}

class _SimpleDropdown extends StatelessWidget {
  const _SimpleDropdown(
      {required this.label,
      required this.value,
      required this.items,
      required this.onChanged,
      this.display = const {}});
  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;
  final Map<String, String> display;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 180,
        child: DropdownButtonFormField<String>(
          key: ValueKey('$label-$value'),
          initialValue: value,
          decoration: InputDecoration(labelText: label),
          items: items
              .map((item) => DropdownMenuItem(
                  value: item, child: Text(display[item] ?? item)))
              .toList(),
          onChanged: (value) => onChanged(value!),
        ),
      );
}

class _VoterChoice extends StatelessWidget {
  const _VoterChoice(
      {required this.voter, required this.selected, required this.onChanged});
  final Map<String, dynamic> voter;
  final bool selected;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? const Color(0xffedf4ff) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: CheckboxListTile(
          value: selected,
          onChanged: (value) => onChanged(value ?? false),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          title: Text('${voter['name'] ?? '-'}',
              style: const TextStyle(color: navy, fontWeight: FontWeight.w800)),
          subtitle: Text(
            '${voter['voterId'] ?? '-'} - House ${voter['houseNumber'] ?? '-'} - ${voter['village'] ?? voter['location'] ?? '-'}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          secondary: Text('${voter['mobile'] ?? ''}',
              style: const TextStyle(color: muted, fontSize: 12)),
        ),
      );
}

class _PrintPreviewMock extends StatelessWidget {
  const _PrintPreviewMock(
      {required this.columns, required this.photo, required this.fields});
  final int columns;
  final bool photo;
  final List<String> fields;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: const Color(0xffe8edf5),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border)),
        child: AspectRatio(
          aspectRatio: 1.414,
          child: Container(
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 8)
                ]),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Text('Voter list preview',
                    style: TextStyle(
                        color: navy, fontSize: 8, fontWeight: FontWeight.w900)),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: photo
                        ? const Color(0xffe9f8ef)
                        : const Color(0xfffff7ed),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(photo ? 'PHOTO ON' : 'PHOTO OFF',
                      style: TextStyle(
                          color: photo ? green : orange,
                          fontSize: 5,
                          fontWeight: FontWeight.w900)),
                ),
              ]),
              const Divider(height: 8),
              Expanded(
                child: GridView.builder(
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      crossAxisSpacing: 4,
                      mainAxisSpacing: 4,
                      childAspectRatio: .9),
                  itemCount: columns * 2,
                  itemBuilder: (_, __) => Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                        border: Border.all(color: border),
                        borderRadius: BorderRadius.circular(5)),
                    child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (photo) ...[
                            Container(
                              width: 17,
                              height: 23,
                              decoration: BoxDecoration(
                                color: const Color(0xffe9eef7),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: const Icon(Icons.person_rounded,
                                  color: muted, size: 10),
                            ),
                            const SizedBox(width: 3),
                          ],
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: (fields.isEmpty
                                          ? const ['नाम', 'EPIC', 'घर']
                                          : fields)
                                      .take(5)
                                      .map((field) => Padding(
                                          padding:
                                              const EdgeInsets.only(bottom: 2),
                                          child: Text('$field: -',
                                              maxLines: 1,
                                              style: const TextStyle(
                                                  fontSize: 4, color: navy))))
                                      .toList())),
                        ]),
                  ),
                ),
              ),
            ]),
          ),
        ),
      );
}

int _number(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
