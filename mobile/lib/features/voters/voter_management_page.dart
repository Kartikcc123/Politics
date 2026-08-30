import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/download_helper.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/picked_file_source.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/mobile_components.dart';
import '../../widgets/voter_phonebook.dart'
    show voterPhotoHeaders, voterPhotoUrl;
import '../families/family_members.dart';
import '../reports/configurable_print_page.dart';
import 'voter_contact_actions.dart';
import 'voter_edit_page.dart';

class VoterManagementPage extends StatefulWidget {
  const VoterManagementPage({
    super.key,
    this.initialAreaId,
    this.initialAreaName,
    this.initialProfileCompletionStatus,
  });

  final String? initialAreaId;
  final String? initialAreaName;
  final String? initialProfileCompletionStatus;

  @override
  State<VoterManagementPage> createState() => _VoterManagementPageState();
}

class _VoterManagementPageState extends State<VoterManagementPage> {
  final search = TextEditingController();
  final sectionNumber = TextEditingController();
  final boothNumber = TextEditingController();
  final location = TextEditingController();
  final village = TextEditingController();
  final pinCode = TextEditingController();
  final voterSerial = TextEditingController();
  final gramPanchayat = TextEditingController();
  final tehsil = TextEditingController();
  final municipality = TextEditingController();
  final municipalWardNumber = TextEditingController();
  final caste = TextEditingController();
  final occupation = TextEditingController();
  final organizationPost = TextEditingController();
  final sectionName = TextEditingController();
  final assemblyNumber = TextEditingController();
  final searchFocus = FocusNode();
  final speech = SpeechToText();
  final selectedIds = <String>{};
  final selectedOptionFilters = <String, Map<String, String>>{};
  final selectedOptionLabels = <String, String>{};
  final recentFilters = <_RecentFilter>[];
  bool listening = false;
  bool showAdvancedFilters = false;
  bool favoriteOnly = false;
  bool searchOptionsVisible = false;
  String gender = '';
  String verificationStatus = '';
  String profileCompletionStatus = '';
  String support = '';
  String partyPreferenceFilter = '';
  String contactTypeFilter = '';
  String rollType = 'assembly';
  String matchStatus = '';
  String queryMode = '';
  String nameLetter = '';
  int currentPage = 1;
  late Future<Map<String, dynamic>> dashboardFuture;
  late Future<VoterPageResult> votersFuture;
  Timer? searchDebounce;
  static const int pageSize = 100;

  void refreshVoters() {
    votersFuture = OfflineVoterCache.loadPage(
      query: filterQuery,
      page: currentPage,
      limit: pageSize,
    );
  }

  void filtersChanged() => setState(() {
        currentPage = 1;
        refreshVoters();
      });

  void searchChanged(String _) {
    searchDebounce?.cancel();
    setState(() {});
    searchDebounce = Timer(const Duration(milliseconds: 450), () {
      if (mounted) filtersChanged();
    });
  }

  @override
  void initState() {
    super.initState();
    searchFocus.addListener(() {
      if (mounted && searchOptionsVisible != searchFocus.hasFocus) {
        setState(() => searchOptionsVisible = searchFocus.hasFocus);
      }
    });
    profileCompletionStatus = widget.initialProfileCompletionStatus ?? '';
    dashboardFuture = api.get('/api/reports/dashboard');
    refreshVoters();
  }

  @override
  void dispose() {
    searchDebounce?.cancel();
    search.dispose();
    sectionNumber.dispose();
    boothNumber.dispose();
    location.dispose();
    village.dispose();
    pinCode.dispose();
    voterSerial.dispose();
    gramPanchayat.dispose();
    tehsil.dispose();
    municipality.dispose();
    municipalWardNumber.dispose();
    caste.dispose();
    occupation.dispose();
    organizationPost.dispose();
    sectionName.dispose();
    assemblyNumber.dispose();
    searchFocus.dispose();
    speech.stop();
    super.dispose();
  }

  Map<String, String?> get filterQuery {
    final query = <String, String?>{
      'q': search.text.trim(),
      'sectionNumber': sectionNumber.text.trim(),
      'sectionName': sectionName.text.trim(),
      'partNumber': boothNumber.text.trim(),
      'assemblyNumber': assemblyNumber.text.trim(),
      'location': location.text.trim(),
      'village': village.text.trim(),
      'pinCode': pinCode.text.trim(),
      'voterSerial': voterSerial.text.trim(),
      'gramPanchayat': gramPanchayat.text.trim(),
      'tehsil': tehsil.text.trim(),
      'municipality': municipality.text.trim(),
      'rollType': rollType,
      'matchStatus': matchStatus,
      'municipalWard': municipalWardNumber.text.trim(),
      'caste': caste.text.trim(),
      'occupation': occupation.text.trim(),
      'organizationPost': organizationPost.text.trim(),
      'contactType': api.user?['role'] == 'booth' ? 'voter' : contactTypeFilter,
      'partyPreference': partyPreferenceFilter,
      'gender': gender,
      'verificationStatus': verificationStatus,
      'profileCompletionStatus': profileCompletionStatus,
      'favorite': favoriteOnly ? 'true' : '',
      'area': widget.initialAreaId,
      'letter': nameLetter,
      if (queryMode.isNotEmpty) 'qMode': queryMode,
      if (queryMode.isEmpty && nameLetter.isNotEmpty) 'qMode': 'name',
    };
    for (final values in selectedOptionFilters.values) {
      query.addAll(values);
    }
    return query;
  }

  Future<void> toggleVoiceSearch() async {
    if (listening) {
      await speech.stop();
      if (mounted) setState(() => listening = false);
      return;
    }
    final available = await speech.initialize(
      onStatus: (status) {
        if (mounted && (status == 'done' || status == 'notListening')) {
          setState(() => listening = false);
        }
      },
      onError: (_) {
        if (mounted) setState(() => listening = false);
      },
    );
    if (!available) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('इस डिवाइस पर voice search उपलब्ध नहीं है।')),
      );
      return;
    }
    setState(() => listening = true);
    await speech.listen(
      listenOptions: SpeechListenOptions(
        localeId: 'hi_IN',
        listenMode: ListenMode.search,
        partialResults: true,
      ),
      onResult: (result) {
        search.text = result.recognizedWords;
        search.selection = TextSelection.collapsed(offset: search.text.length);
        setState(() {});
        if (result.finalResult) filtersChanged();
      },
    );
  }

  void clearFilters() {
    for (final controller in [
      search,
      sectionNumber,
      sectionName,
      boothNumber,
      assemblyNumber,
      location,
      village,
      pinCode,
      voterSerial,
      gramPanchayat,
      tehsil,
      municipality,
      municipalWardNumber,
      caste,
      occupation,
      organizationPost,
    ]) {
      controller.clear();
    }
    setState(() {
      support = '';
      partyPreferenceFilter = '';
      gender = '';
      verificationStatus = '';
      profileCompletionStatus = '';
      favoriteOnly = false;
      contactTypeFilter = '';
      rollType = 'assembly';
      matchStatus = '';
      queryMode = '';
      nameLetter = '';
      currentPage = 1;
      selectedIds.clear();
      selectedOptionFilters.clear();
      selectedOptionLabels.clear();
      refreshVoters();
    });
  }

  String _filterValue(String field, TextEditingController controller) =>
      selectedOptionLabels[field] ?? controller.text.trim();

  String get partVillageValue =>
      selectedOptionLabels['partVillage'] ??
      [
        if (village.text.trim().isNotEmpty) village.text.trim(),
        if (boothNumber.text.trim().isNotEmpty)
          'भाग ${boothNumber.text.trim()}',
      ].join(' · ');

  void _rememberRecentFilter(String field, String title, _FilterOption option) {
    recentFilters.removeWhere(
        (item) => item.field == field && item.label == option.label);
    recentFilters.insert(
      0,
      _RecentFilter(
        field: field,
        title: title,
        label: option.label,
        filters: option.filters,
      ),
    );
    if (recentFilters.length > 8) {
      recentFilters.removeRange(8, recentFilters.length);
    }
  }

  void _applyRecentFilter(_RecentFilter filter) => setState(() {
        if (filter.field == 'partVillage') {
          for (final field in ['village', 'partNumber', 'section']) {
            selectedOptionFilters.remove(field);
            selectedOptionLabels.remove(field);
          }
          village.text = filter.filters['village'] ?? '';
          boothNumber.text = filter.filters['partNumber'] ?? '';
          sectionNumber.clear();
          sectionName.clear();
        } else if (filter.field == 'section') {
          sectionNumber.text = filter.filters['sectionNumber'] ?? '';
          sectionName.text = filter.filters['sectionName'] ?? filter.label;
        }
        selectedOptionFilters[filter.field] = filter.filters;
        selectedOptionLabels[filter.field] = filter.label;
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });

  void _clearFilterText(TextEditingController controller) => setState(() {
        controller.clear();
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });

  void _clearSmartOrText(String field, TextEditingController controller) =>
      setState(() {
        selectedOptionFilters.remove(field);
        selectedOptionLabels.remove(field);
        controller.clear();
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });

// ignore: unused_element
  void _clearLocationFilters() => setState(() {
        for (final field in [
          'assembly',
          'partVillage',
          'village',
          'gramPanchayat',
          'partNumber',
          'section',
        ]) {
          selectedOptionFilters.remove(field);
          selectedOptionLabels.remove(field);
        }
        assemblyNumber.clear();
        village.clear();
        gramPanchayat.clear();
        boothNumber.clear();
        sectionNumber.clear();
        sectionName.clear();
        voterSerial.clear();
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });

  List<_ActiveFilterData> get activeFilterChips {
    final chips = <_ActiveFilterData>[];
    void add(String label, String value, VoidCallback onClear) {
      final clean = value.trim();
      if (clean.isEmpty) return;
      chips
          .add(_ActiveFilterData(label: label, value: clean, onClear: onClear));
    }

    add('Search', search.text, () => _clearFilterText(search));
    if (favoriteOnly) {
      add(
          'सूची',
          'Favorites',
          () => setState(() {
                favoriteOnly = false;
                currentPage = 1;
                refreshVoters();
              }));
    }
    add(
        'Type',
        _contactTypeFilterLabel(contactTypeFilter),
        () => setState(() {
              contactTypeFilter = '';
              rollType = 'assembly';
              matchStatus = '';
              currentPage = 1;
              selectedIds.clear();
              refreshVoters();
            }));
    add(
        'अक्षर',
        nameLetter,
        () => setState(() {
              nameLetter = '';
              currentPage = 1;
              selectedIds.clear();
              refreshVoters();
            }));
    add(
        'पार्टी',
        _partyPreferenceLabel(partyPreferenceFilter),
        () => setState(() {
              partyPreferenceFilter = '';
              currentPage = 1;
              selectedIds.clear();
              refreshVoters();
            }));
    add(
        'लिंग',
        _genderLabel(gender),
        () => setState(() {
              gender = '';
              currentPage = 1;
              selectedIds.clear();
              refreshVoters();
            }));
    add(
        'सर्वे',
        profileCompletionStatus == 'complete'
            ? 'पूर्ण'
            : (profileCompletionStatus == 'pending' ? 'बाकी' : ''),
        () => setState(() {
              profileCompletionStatus = '';
              favoriteOnly = false;
              currentPage = 1;
              selectedIds.clear();
              refreshVoters();
            }));
    add(
        'सत्यापन',
        _verificationLabel(verificationStatus),
        () => setState(() {
              verificationStatus = '';
              profileCompletionStatus = '';
              favoriteOnly = false;
              currentPage = 1;
              selectedIds.clear();
              refreshVoters();
            }));
    add('विधानसभा', _filterValue('assembly', assemblyNumber),
        () => _clearSmartOrText('assembly', assemblyNumber));
    add('भाग / गाँव', partVillageValue, _clearPartVillageFilter);
    add('अनुभाग / मोहल्ला', _filterValue('section', sectionName),
        _clearSectionFilter);
    add('तहसील', _filterValue('tehsil', tehsil),
        () => _clearSmartOrText('tehsil', tehsil));
    add('नगर पालिका', _filterValue('municipality', municipality),
        () => _clearSmartOrText('municipality', municipality));
    add('स्थान', location.text, () => _clearFilterText(location));
    add('PIN', pinCode.text, () => _clearFilterText(pinCode));
    add('क्रम संख्या', voterSerial.text, () => _clearFilterText(voterSerial));
    add('जाति', _filterValue('caste', caste),
        () => _clearSmartOrText('caste', caste));
    add('पद', _filterValue('organizationPost', organizationPost),
        () => _clearSmartOrText('organizationPost', organizationPost));
    add('Vyavsay', _filterValue('occupation', occupation),
        () => _clearSmartOrText('occupation', occupation));
    return chips;
  }

  String _contactTypeFilterLabel(String value) => switch (value) {
        'voter' => 'Matdata',
        'personal' => 'Personal',
        _ => '',
      };

  void _setContactTypeFilter(String value) => setState(() {
        contactTypeFilter = value;
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });

  String _partyPreferenceLabel(String value) => switch (value) {
        'congress' => 'Congress',
        'bjp' => 'BJP',
        'nota' => 'NOTA',
        'other' => 'अन्य पार्टी',
        'undecided' => 'पार्टी तय नहीं',
        _ => '',
      };

  String _genderLabel(String value) => switch (value) {
        'male' => 'पुरुष',
        'female' => 'महिला',
        'other' => 'अन्य',
        _ => '',
      };

  String _verificationLabel(String value) => switch (value) {
        'pending' => 'लंबित',
        'verified' => 'सत्यापित',
        'needs_review' => 'Review आवश्यक',
        'duplicate' => 'डुप्लीकेट',
        _ => '',
      };

  String quickSearchMode(String label) {
    final text = label.toLowerCase();
    if (text.contains('पिता') ||
        text.contains('पति') ||
        text.contains('father')) {
      return 'guardian';
    }
    if (text.contains('epic')) return 'epic';
    if (text.contains('घर') || text.contains('house')) return 'house';
    if (text.contains('मोबाइल') || text.contains('mobile')) return 'mobile';
    if (text.contains('pin')) return 'pin';
    if (text.contains('गाँव') || text.contains('village')) return 'village';
    return 'name';
  }

  void useQuickSearch(String mode) {
    final cleanMode = mode.startsWith('जैसे') ? 'नाम' : mode;
    setState(() {
      queryMode = quickSearchMode(cleanMode);
      currentPage = 1;
      selectedIds.clear();
      refreshVoters();
    });
    searchFocus.requestFocus();
  }

  String get queryModeLabel => switch (queryMode) {
        'name' => 'नाम',
        'guardian' => 'पिता/पति',
        'epic' => 'EPIC',
        'house' => 'घर',
        'mobile' => 'मोबाइल',
        'pin' => 'PIN',
        'village' => 'गाँव',
        _ => '',
      };

  Future<void> openLocationCorrection() async {
    final changed = await showDialog<bool>(
      context: context,
      builder: (_) => const _LocationCorrectionDialog(),
    );
    if (changed == true && mounted) {
      setState(() {
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });
    }
  }

  static const smartFieldKeys = <String, List<String>>{
    'assembly': ['assemblyNumber', 'assemblyName'],
    'partVillage': ['village', 'partNumber'],
    'village': ['village'],
    'pinCode': ['pinCode'],
    'gramPanchayat': ['gramPanchayat'],
    'tehsil': ['tehsil'],
    'municipality': ['municipality'],
    'partNumber': ['partNumber'],
    'section': ['sectionNumber', 'sectionName'],
    'caste': ['caste'],
    'occupation': ['occupation'],
    'organizationPost': ['organizationPost'],
  };

  Future<void> openSmartFilter(String field, String title) async {
    if (field == 'section' &&
        api.user?['role'] != 'booth' &&
        partVillageValue.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('पहले भाग / गाँव चुनें।')),
      );
      return;
    }
    final current = Map<String, String?>.from(filterQuery);
    for (final key in smartFieldKeys[field] ?? const <String>[]) {
      current.remove(key);
    }
    for (final key in selectedOptionFilters[field]?.keys ?? const <String>[]) {
      current.remove(key);
    }
    final option = await showDialog<_FilterOption>(
      context: context,
      builder: (_) => _FilterOptionDialog(
        field: field,
        title: title,
        currentFilters: current,
      ),
    );
    if (option == null || !mounted) return;
    setState(() {
      if (field == 'partVillage') {
        for (final oldField in ['village', 'partNumber', 'section']) {
          selectedOptionFilters.remove(oldField);
          selectedOptionLabels.remove(oldField);
        }
        village.text = option.filters['village'] ?? '';
        boothNumber.text = option.filters['partNumber'] ?? '';
        sectionNumber.clear();
        sectionName.clear();
      } else if (field == 'section') {
        sectionNumber.text = option.filters['sectionNumber'] ?? '';
        sectionName.text = option.filters['sectionName'] ?? option.label;
      }
      selectedOptionFilters[field] = option.filters;
      selectedOptionLabels[field] = option.label;
      _rememberRecentFilter(field, title, option);
      currentPage = 1;
      selectedIds.clear();
      refreshVoters();
    });
  }

  Future<_FilterOption?> pickFilterOption(
    String field,
    String title,
    Map<String, String?> currentFilters,
  ) =>
      showDialog<_FilterOption>(
        context: context,
        builder: (_) => _FilterOptionDialog(
          field: field,
          title: title,
          currentFilters: currentFilters,
        ),
      );

  void _clearPartVillageFilter() => setState(() {
        for (final field in [
          'partVillage',
          'village',
          'partNumber',
          'section'
        ]) {
          selectedOptionFilters.remove(field);
          selectedOptionLabels.remove(field);
        }
        village.clear();
        boothNumber.clear();
        sectionNumber.clear();
        sectionName.clear();
        voterSerial.clear();
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });

  void _clearSectionFilter() => setState(() {
        selectedOptionFilters.remove('section');
        selectedOptionLabels.remove('section');
        sectionNumber.clear();
        sectionName.clear();
        voterSerial.clear();
        currentPage = 1;
        selectedIds.clear();
        refreshVoters();
      });

  void clearSmartFilter(String field) {
    if (field == 'partVillage') {
      _clearPartVillageFilter();
      return;
    }
    if (field == 'section') {
      _clearSectionFilter();
      return;
    }
    setState(() {
      selectedOptionFilters.remove(field);
      selectedOptionLabels.remove(field);
      currentPage = 1;
      selectedIds.clear();
      refreshVoters();
    });
  }

  Future<void> openCustomPrint() async {
    final options = await showDialog<_PrintOptions>(
      context: context,
      builder: (_) => _PrintOptionsDialog(selectedCount: selectedIds.length),
    );
    if (options == null || !mounted) return;
    await printApiPdf(
      context,
      path: '/api/print/members.pdf',
      jobName: selectedIds.isEmpty ? 'फ़िल्टर किए मतदाता' : 'चयनित मतदाता',
      query: {
        ...filterQuery,
        if (selectedIds.isNotEmpty) 'ids': selectedIds.join(','),
        'fields': options.fields.join(','),
        'columns': '${options.columns}',
        'photo': '${options.photo}',
        'paperSize': options.paperSize,
        'orientation': options.orientation,
      },
    );
  }

  bool _isMemberAlreadyMissing(Object error) {
    return error.toString().toLowerCase().contains('member not found');
  }

  Future<void> deleteSelectedContacts() async {
    if (selectedIds.isEmpty) return;
    final ids = selectedIds.toList();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.delete_outline_rounded,
            color: Colors.red, size: 42),
        title: const Text('Delete selected contacts?'),
        content: Text(
            '${ids.length} selected contact permanently delete ho jayenge.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    var deletedCount = 0;
    final locallyRemoved = <String>[];

    try {
      final result = await api.post('/api/members/bulk-delete', {'ids': ids});
      deletedCount = (result['deletedCount'] as num?)?.toInt() ?? 0;
      final serverDeletedIds =
          (result['deletedIds'] as List?)?.map((e) => e.toString()).toList() ??
              [];
      if (serverDeletedIds.isNotEmpty) {
        locallyRemoved.addAll(serverDeletedIds);
      } else if (deletedCount > 0) {
        locallyRemoved.addAll(ids);
      }
    } catch (_) {
      try {
        final result =
            await api.deleteWithBody('/api/members/bulk', {'ids': ids});
        deletedCount = (result['deletedCount'] as num?)?.toInt() ?? 0;
        final serverDeletedIds = (result['deletedIds'] as List?)
                ?.map((e) => e.toString())
                .toList() ??
            [];
        if (serverDeletedIds.isNotEmpty) {
          locallyRemoved.addAll(serverDeletedIds);
        } else if (deletedCount > 0) {
          locallyRemoved.addAll(ids);
        }
      } catch (_) {
        for (final id in ids) {
          try {
            await api.delete('/api/members/$id');
            locallyRemoved.add(id);
            deletedCount += 1;
          } catch (error) {
            if (_isMemberAlreadyMissing(error)) {
              locallyRemoved.add(id);
            }
          }
        }
      }
    }

    if (locallyRemoved.isNotEmpty) {
      await OfflineVoterCache.removeByIds(locallyRemoved);
    } else if (deletedCount == 0) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'कोई मतदाता delete नहीं हुआ। Admin login या delete permission जांचें।',
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    api.notifyDataChanged();

    if (!mounted) return;
    setState(() {
      selectedIds.clear();
      currentPage = 1;
      refreshVoters();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$deletedCount मतदाता हटा दिए गए')),
    );
  }

  Future<void> deleteAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded,
            color: Colors.red, size: 42),
        title: const Text('सभी मतदाता हटा दें?'),
        content: const Text(
          'यह सभी मतदाताओं और संबंधित परिवारों को स्थायी रूप से हटा देगा। '
          'इस कार्रवाई को वापस नहीं किया जा सकता।',
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('रद्द करें')),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.delete_forever),
            label: const Text('हाँ, सभी हटाएं'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final result = await api.deleteWithBody(
        '/api/members',
        {'confirmation': 'DELETE ALL VOTERS'},
      );
      await OfflineVoterCache.clear();
      api.notifyDataChanged();
      if (!mounted) return;
      setState(() {
        selectedIds.clear();
        currentPage = 1;
        refreshVoters();
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            '${result['deletedMembers'] ?? 0} मतदाता और ${result['deletedFamilies'] ?? 0} परिवार हटा दिए गए'),
      ));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> openPhoneFilters() async {
    var nextSupport = support;
    var nextGender = gender;
    var nextVerification = verificationStatus;
    var nextProfileCompletion = profileCompletionStatus;
    final nextVillage = TextEditingController(text: village.text);
    final nextBooth = TextEditingController(text: boothNumber.text);
    final nextPartVillage = TextEditingController(text: partVillageValue);
    final nextSectionNumber = TextEditingController(text: sectionNumber.text);
    final nextSectionName = TextEditingController(text: sectionName.text);
    final nextSection = TextEditingController(
      text: _filterValue('section', sectionName),
    );
    final nextPosition = TextEditingController(text: organizationPost.text);
    final nextOccupation = TextEditingController(text: occupation.text);
    final nextPinCode = TextEditingController(text: pinCode.text);
    final nextVoterSerial = TextEditingController(text: voterSerial.text);

    void applyPhoneFilters() => setState(() {
          support = nextSupport;
          gender = nextGender;
          verificationStatus = nextVerification;
          profileCompletionStatus = nextProfileCompletion;
          for (final field in [
            'partVillage',
            'village',
            'partNumber',
            'section',
          ]) {
            selectedOptionFilters.remove(field);
            selectedOptionLabels.remove(field);
          }
          village.text = nextVillage.text.trim();
          boothNumber.text = nextBooth.text.trim();
          sectionNumber.text = nextSectionNumber.text.trim();
          sectionName.text = nextSectionName.text.trim();
          organizationPost.text = nextPosition.text.trim();
          occupation.text = nextOccupation.text.trim();
          pinCode.text = nextPinCode.text.trim();
          voterSerial.text =
              nextVillage.text.trim().isEmpty && nextBooth.text.trim().isEmpty
                  ? ''
                  : nextVoterSerial.text.trim();
          currentPage = 1;
          selectedIds.clear();
          refreshVoters();
        });

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            12,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: border,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const SizedBox(height: 18),
              Row(children: [
                const Expanded(
                  child: Text('मतदाता फ़िल्टर',
                      style: TextStyle(
                          color: navy,
                          fontSize: 19,
                          fontWeight: FontWeight.w900)),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(sheetContext);
                    clearFilters();
                  },
                  child: const Text('Reset'),
                ),
              ]),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: nextSupport,
                decoration: const InputDecoration(
                    labelText: 'श्रेणी',
                    prefixIcon: Icon(Icons.groups_rounded)),
                items: const [
                  DropdownMenuItem(value: '', child: Text('सभी मतदाता')),
                  DropdownMenuItem(value: 'supporter', child: Text('समर्थक')),
                  DropdownMenuItem(value: 'neutral', child: Text('तटस्थ')),
                  DropdownMenuItem(value: 'opposite', child: Text('विरोधी')),
                  DropdownMenuItem(value: 'undecided', child: Text('अनिर्णीत')),
                ],
                onChanged: (value) =>
                    setSheetState(() => nextSupport = value ?? ''),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: nextGender,
                decoration: const InputDecoration(
                    labelText: 'लिंग', prefixIcon: Icon(Icons.person_outline)),
                items: const [
                  DropdownMenuItem(value: '', child: Text('सभी')),
                  DropdownMenuItem(value: 'male', child: Text('पुरुष')),
                  DropdownMenuItem(value: 'female', child: Text('महिला')),
                  DropdownMenuItem(value: 'other', child: Text('अन्य')),
                ],
                onChanged: (value) =>
                    setSheetState(() => nextGender = value ?? ''),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nextPartVillage,
                readOnly: true,
                decoration: InputDecoration(
                  labelText: 'भाग / गाँव',
                  prefixIcon: const Icon(Icons.holiday_village_outlined),
                  suffixIcon: const Icon(Icons.list_alt_rounded),
                ),
                onTap: () async {
                  final option = await pickFilterOption(
                    'partVillage',
                    'भाग / गाँव',
                    {
                      if (nextSupport.isNotEmpty) 'supportLevel': nextSupport,
                      if (nextGender.isNotEmpty) 'gender': nextGender,
                      if (nextVerification.isNotEmpty)
                        'verificationStatus': nextVerification,
                    },
                  );
                  if (option == null) return;
                  setSheetState(() {
                    nextPartVillage.text = option.label;
                    nextVillage.text = option.filters['village'] ?? '';
                    nextBooth.text = option.filters['partNumber'] ?? '';
                    nextSection.clear();
                    nextSectionNumber.clear();
                    nextSectionName.clear();
                    nextVoterSerial.clear();
                  });
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nextVoterSerial,
                enabled: nextVillage.text.trim().isNotEmpty ||
                    nextBooth.text.trim().isNotEmpty,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'मतदाता क्रम संख्या',
                  hintText: 'पहले भाग / गाँव चुनें',
                  prefixIcon: Icon(Icons.format_list_numbered_rounded),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nextPinCode,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(
                  labelText: 'PIN नंबर',
                  prefixIcon: Icon(Icons.pin_drop_outlined),
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nextSection,
                readOnly: true,
                decoration: InputDecoration(
                  labelText: 'अनुभाग / मोहल्ला',
                  prefixIcon: const Icon(Icons.segment_rounded),
                  suffixIcon: const Icon(Icons.list_alt_rounded),
                ),
                onTap: () async {
                  if (nextVillage.text.trim().isEmpty &&
                      nextBooth.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('पहले भाग / गाँव चुनें।')),
                    );
                    return;
                  }
                  final option = await pickFilterOption(
                    'section',
                    'अनुभाग / मोहल्ला',
                    {
                      if (nextSupport.isNotEmpty) 'supportLevel': nextSupport,
                      if (nextGender.isNotEmpty) 'gender': nextGender,
                      if (nextVerification.isNotEmpty)
                        'verificationStatus': nextVerification,
                      if (nextVillage.text.trim().isNotEmpty)
                        'village': nextVillage.text.trim(),
                      if (nextBooth.text.trim().isNotEmpty)
                        'partNumber': nextBooth.text.trim(),
                    },
                  );
                  if (option == null) return;
                  setSheetState(() {
                    nextSection.text = option.label;
                    nextSectionNumber.text =
                        option.filters['sectionNumber'] ?? '';
                    nextSectionName.text = option.filters['sectionName'] ?? '';
                  });
                  applyPhoneFilters();
                  if (sheetContext.mounted) Navigator.pop(sheetContext);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nextPosition,
                decoration: InputDecoration(
                  labelText: 'Pad / Position',
                  prefixIcon: const Icon(Icons.badge_outlined),
                  suffixIcon: IconButton(
                    tooltip: 'Database se position chunein',
                    icon: const Icon(Icons.list_alt_rounded),
                    onPressed: () async {
                      final option = await pickFilterOption(
                          'organizationPost', 'Pad / Position', {
                        if (nextSupport.isNotEmpty) 'supportLevel': nextSupport,
                        if (nextGender.isNotEmpty) 'gender': nextGender,
                        if (nextVerification.isNotEmpty)
                          'verificationStatus': nextVerification,
                        if (nextVillage.text.trim().isNotEmpty)
                          'village': nextVillage.text.trim(),
                        if (nextBooth.text.trim().isNotEmpty)
                          'partNumber': nextBooth.text.trim(),
                      });
                      if (option == null) return;
                      setSheetState(() => nextPosition.text =
                          option.filters['organizationPost'] ?? option.label);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nextOccupation,
                decoration: InputDecoration(
                  labelText: 'Vyavsay',
                  prefixIcon: const Icon(Icons.work_outline),
                  suffixIcon: IconButton(
                    tooltip: 'Database se vyavsay chunein',
                    icon: const Icon(Icons.list_alt_rounded),
                    onPressed: () async {
                      final option =
                          await pickFilterOption('occupation', 'Vyavsay', {
                        if (nextSupport.isNotEmpty) 'supportLevel': nextSupport,
                        if (nextGender.isNotEmpty) 'gender': nextGender,
                        if (nextVerification.isNotEmpty)
                          'verificationStatus': nextVerification,
                        if (nextVillage.text.trim().isNotEmpty)
                          'village': nextVillage.text.trim(),
                        if (nextBooth.text.trim().isNotEmpty)
                          'partNumber': nextBooth.text.trim(),
                        if (nextPosition.text.trim().isNotEmpty)
                          'organizationPost': nextPosition.text.trim(),
                      });
                      if (option == null) return;
                      setSheetState(() => nextOccupation.text =
                          option.filters['occupation'] ?? option.label);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: nextVerification,
                decoration: const InputDecoration(
                    labelText: 'डेटा स्थिति',
                    prefixIcon: Icon(Icons.fact_check_outlined)),
                items: const [
                  DropdownMenuItem(value: '', child: Text('सभी')),
                  DropdownMenuItem(value: 'verified', child: Text('सत्यापित')),
                  DropdownMenuItem(
                      value: 'needs_review', child: Text('Review आवश्यक')),
                  DropdownMenuItem(value: 'pending', child: Text('लंबित')),
                ],
                onChanged: (value) =>
                    setSheetState(() => nextVerification = value ?? ''),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: nextProfileCompletion,
                decoration: const InputDecoration(
                    labelText: 'सर्वे जानकारी',
                    prefixIcon: Icon(Icons.fact_check_outlined)),
                items: const [
                  DropdownMenuItem(value: '', child: Text('सभी')),
                  DropdownMenuItem(
                      value: 'pending', child: Text('जानकारी बाकी')),
                  DropdownMenuItem(
                      value: 'complete', child: Text('जानकारी पूर्ण')),
                ],
                onChanged: (value) =>
                    setSheetState(() => nextProfileCompletion = value ?? ''),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton.icon(
                  onPressed: () {
                    applyPhoneFilters();
                    Navigator.pop(sheetContext);
                  },
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('फ़िल्टर लागू करें'),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
    nextVillage.dispose();
    nextBooth.dispose();
    nextPartVillage.dispose();
    nextSectionNumber.dispose();
    nextSectionName.dispose();
    nextSection.dispose();
    nextPosition.dispose();
    nextOccupation.dispose();
    nextPinCode.dispose();
    nextVoterSerial.dispose();
  }

  Widget buildPhoneBookMobile(BuildContext context) => RefreshIndicator(
        onRefresh: () async {
          setState(refreshVoters);
          await votersFuture;
        },
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
          children: [
            _EasyVoterSearchCard(
              controller: search,
              focusNode: searchFocus,
              listening: listening,
              selectedMode: queryMode,
              selectedModeLabel: queryModeLabel,
              showOptions: searchOptionsVisible,
              onChanged: searchChanged,
              onSubmitted: (_) => filtersChanged(),
              onClear: () {
                search.clear();
                filtersChanged();
              },
              onMic: toggleVoiceSearch,
              onQuickPick: useQuickSearch,
              expandedFilters: api.user?['role'] == 'admin'
                  ? _RollFilterStrip(
                      rollType: rollType,
                      matchStatus: matchStatus,
                      wardController: municipalWardNumber,
                      onChanged: (roll, match) => setState(() {
                        rollType = roll;
                        matchStatus = match;
                        currentPage = 1;
                        refreshVoters();
                      }),
                      onWardSubmitted: (_) => filtersChanged(),
                    )
                  : null,
            ),
            const SizedBox(height: 12),
            if (api.user?['role'] == 'booth')
              _BoothWorkStrip(
                incompleteSelected: profileCompletionStatus == 'pending',
                reviewSelected: verificationStatus == 'needs_review',
                onAll: () => setState(() {
                  support = '';
                  verificationStatus = '';
                  profileCompletionStatus = '';
                  favoriteOnly = false;
                  currentPage = 1;
                  refreshVoters();
                }),
                onIncomplete: () => setState(() {
                  support = '';
                  verificationStatus = '';
                  profileCompletionStatus = 'pending';
                  currentPage = 1;
                  refreshVoters();
                }),
                onReview: () => setState(() {
                  support = '';
                  profileCompletionStatus = '';
                  favoriteOnly = false;
                  verificationStatus = 'needs_review';
                  currentPage = 1;
                  refreshVoters();
                }),
              )
            else
              _PhoneCombinedFilterStrip(
                contactType: contactTypeFilter,
                showPersonal: api.user?['role'] != 'booth',
                partyPreference: partyPreferenceFilter,
                reviewSelected: verificationStatus == 'needs_review',
                onAll: () => setState(() {
                  contactTypeFilter = '';
                  rollType = 'assembly';
                  matchStatus = '';
                  support = '';
                  partyPreferenceFilter = '';
                  verificationStatus = '';
                  profileCompletionStatus = '';
                  favoriteOnly = false;
                  currentPage = 1;
                  refreshVoters();
                }),
                onAllDoubleTap: () => _setContactTypeFilter('personal'),
                onParty: (value) => setState(() {
                  partyPreferenceFilter = value;
                  verificationStatus = '';
                  profileCompletionStatus = '';
                  favoriteOnly = false;
                  currentPage = 1;
                  refreshVoters();
                }),
                onReview: () => setState(() {
                  support = '';
                  partyPreferenceFilter = '';
                  verificationStatus = 'needs_review';
                  currentPage = 1;
                  refreshVoters();
                }),
              ),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: Text(
                  api.user?['role'] == 'booth' ? 'मतदाता' : 'संपर्क',
                  style: const TextStyle(
                    color: navy,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              if (api.user?['role'] == 'admin')
                IconButton(
                  tooltip: favoriteOnly ? 'सभी संपर्क' : 'Favorites',
                  onPressed: () => setState(() {
                    favoriteOnly = !favoriteOnly;
                    currentPage = 1;
                    refreshVoters();
                  }),
                  icon: Icon(
                    favoriteOnly
                        ? Icons.star_rounded
                        : Icons.star_border_rounded,
                    color: favoriteOnly ? orange : muted,
                  ),
                ),
              IconButton(
                tooltip: 'फ़िल्टर',
                onPressed: openPhoneFilters,
                icon: const Icon(Icons.tune_rounded, color: navy),
              ),
              IconButton(
                tooltip: 'नाम क्रम',
                onPressed: () => showModalBottomSheet<void>(
                  context: context,
                  backgroundColor: Colors.white,
                  builder: (_) => SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: _AlphabetFilterBar(
                        selected: nameLetter,
                        onChanged: (letter) {
                          Navigator.pop(context);
                          setState(() {
                            nameLetter = letter;
                            currentPage = 1;
                            refreshVoters();
                          });
                        },
                      ),
                    ),
                  ),
                ),
                icon: const Icon(Icons.sort_by_alpha_rounded, color: navy),
              ),
            ]),
            _ActiveFilterChips(
              items: activeFilterChips,
              onClearAll: clearFilters,
              compact: true,
            ),
            if (api.user?['role'] == 'booth')
              _DatabaseFilterPicker(
                label: 'अपने गाँव का अनुभाग',
                icon: Icons.segment_rounded,
                value: _filterValue('section', sectionName),
                onTap: () => openSmartFilter('section', 'अपने गाँव का अनुभाग'),
                onClear: _clearSectionFilter,
              ),
            _RecentFilterStrip(
              items: recentFilters,
              onTap: _applyRecentFilter,
            ),
            const SizedBox(height: 8),
            FutureBuilder<VoterPageResult>(
              future: votersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Padding(
                      padding: EdgeInsets.all(36),
                      child: Center(child: CircularProgressIndicator()));
                }
                if (snapshot.hasError) {
                  return _PhoneMessage(
                    icon: Icons.cloud_off_rounded,
                    title: 'डेटा लोड नहीं हुआ',
                    subtitle: '${snapshot.error}',
                    onRetry: () => setState(refreshVoters),
                  );
                }
                final result = snapshot.data!;
                if (result.items.isEmpty) {
                  return Column(
                    children: [
                      _PhoneMessage(
                        icon: Icons.person_search_rounded,
                        title: 'कोई मतदाता नहीं मिला',
                        subtitle:
                            'नाम की spelling बदलें या फ़िल्टर हटाकर खोजें।',
                        onRetry: clearFilters,
                      ),
                    ],
                  );
                }
                return Column(
                  children: [
                    _PhoneContactList(
                      result: result,
                      selectedIds: selectedIds,
                      onSelectionChanged: (id, selected) => setState(() {
                        if (selected) {
                          selectedIds.add(id);
                        } else {
                          selectedIds.remove(id);
                        }
                      }),
                      onSelectPage: (ids, selected) => setState(() {
                        if (selected) {
                          selectedIds.addAll(ids);
                        } else {
                          selectedIds.removeAll(ids);
                        }
                      }),
                      onDeleteSelected: deleteSelectedContacts,
                      onClearSelection: () => setState(selectedIds.clear),
                      onChanged: () => setState(refreshVoters),
                      onPageChanged: (page) => setState(() {
                        currentPage = page;
                        selectedIds.clear();
                        refreshVoters();
                      }),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.sizeOf(context).width < 700) {
      return buildPhoneBookMobile(context);
    }
    return AppPage(children: [
      PageHeading(
        title: 'मतदाता प्रबंधन',
        subtitle: 'नाम, EPIC, मोबाइल, गाँव या घर संख्या से तेजी से खोजें',
        action: Builder(builder: (context) {
          final compact = MediaQuery.sizeOf(context).width < 520;
          return Wrap(spacing: 8, runSpacing: 8, children: [
            if (api.user?['role'] == 'admin')
              OutlinedButton.icon(
                onPressed: () => setState(() {
                  favoriteOnly = !favoriteOnly;
                  currentPage = 1;
                  refreshVoters();
                }),
                icon: Icon(favoriteOnly
                    ? Icons.star_rounded
                    : Icons.star_border_rounded),
                label: Text(favoriteOnly ? 'सभी मतदाता' : 'Favorites'),
              ),
            if (api.user?['role'] != 'booth')
              OutlinedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const ConfigurablePrintPage()),
                ),
                icon: const Icon(Icons.print_rounded),
                label: Text(compact ? 'Bulk Print' : 'Smart Bulk Print'),
              ),
            if (api.user?['role'] == 'admin')
              OutlinedButton.icon(
                onPressed: openLocationCorrection,
                icon: const Icon(Icons.edit_location_alt_rounded),
                label: Text(compact ? 'Location Fix' : 'Location Bulk Fix'),
              ),
            if (api.user?['role'] != 'booth')
              FilledButton.icon(
                onPressed: () => showDialog(
                    context: context,
                    builder: (_) =>
                        VoterForm(onSaved: () => setState(refreshVoters))),
                icon: const Icon(Icons.add),
                label: Text(compact ? 'नया मतदाता' : 'नया मतदाता जोड़ें'),
              ),
          ]);
        }),
      ),
      LayoutBuilder(builder: (context, constraints) {
        final compact = constraints.maxWidth < 620;
        final searchBox = _EasyVoterSearchField(
          controller: search,
          focusNode: searchFocus,
          listening: listening,
          selectedMode: queryMode,
          selectedModeLabel: queryModeLabel,
          onChanged: searchChanged,
          onSubmitted: (_) {
            searchDebounce?.cancel();
            filtersChanged();
          },
          onClear: () {
            searchDebounce?.cancel();
            search.clear();
            filtersChanged();
          },
          onMic: toggleVoiceSearch,
          compact: compact,
        );
        final filterButton = api.user?['role'] == 'booth'
            ? const SizedBox.shrink()
            : OutlinedButton.icon(
                onPressed: () =>
                    setState(() => showAdvancedFilters = !showAdvancedFilters),
                icon: Icon(
                  showAdvancedFilters
                      ? Icons.filter_alt_rounded
                      : Icons.tune_rounded,
                  color: blue,
                ),
                label: Text(
                    showAdvancedFilters ? 'फ़िल्टर छिपाएँ' : 'एडवांस फ़िल्टर'),
              );
        if (compact) {
          return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                searchBox,
                const SizedBox(height: 10),
                filterButton,
              ]);
        }
        return Row(children: [
          Expanded(child: searchBox),
          const SizedBox(width: 10),
          filterButton,
        ]);
      }),
      if (listening)
        const Padding(
          padding: EdgeInsets.only(top: 6),
          child: Text('सुन रहा हूँ… नाम, पिता/पति, EPIC या मोबाइल बोलें',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.w700)),
        ),
      const SizedBox(height: 8),
      if (searchOptionsVisible)
        _SearchHelpStrip(selectedMode: queryMode, onPick: useQuickSearch),
      if (api.user?["role"] == "admin") ...[
        _RollFilterStrip(
          rollType: rollType,
          matchStatus: matchStatus,
          wardController: municipalWardNumber,
          onChanged: (roll, match) => setState(() {
            rollType = roll;
            matchStatus = match;
            currentPage = 1;
            refreshVoters();
          }),
          onWardSubmitted: (_) => filtersChanged(),
        ),
        const SizedBox(height: 8),
      ],
      if (api.user?['role'] != 'booth') ...[
        _ContactTypeFilterChips(
          selected: contactTypeFilter,
          onChanged: _setContactTypeFilter,
        ),
        const SizedBox(height: 8),
      ],
      if (api.user?['role'] != 'booth')
        _SmartSearchPanel(
          selectedLabels: selectedOptionLabels,
          onPick: openSmartFilter,
          onClear: clearSmartFilter,
          onClearAll: selectedOptionLabels.isEmpty
              ? null
              : () => setState(() {
                    selectedOptionFilters.clear();
                    selectedOptionLabels.clear();
                    village.clear();
                    boothNumber.clear();
                    sectionNumber.clear();
                    sectionName.clear();
                    currentPage = 1;
                    selectedIds.clear();
                    refreshVoters();
                  }),
        ),
      _ActiveFilterChips(
        items: activeFilterChips,
        onClearAll: clearFilters,
      ),
      if (api.user?['role'] == 'booth')
        _DatabaseFilterPicker(
          label: 'अपने गाँव का अनुभाग',
          icon: Icons.segment_rounded,
          value: _filterValue('section', sectionName),
          onTap: () => openSmartFilter('section', 'अपने गाँव का अनुभाग'),
          onClear: _clearSectionFilter,
        ),
      _RecentFilterStrip(
        items: recentFilters,
        onTap: _applyRecentFilter,
      ),
      if (showAdvancedFilters) ...[
        const SizedBox(height: 10),
        SectionCard(
          title: 'एडवांस खोज',
          action: TextButton.icon(
            onPressed: clearFilters,
            icon: const Icon(Icons.clear_all),
            label: const Text('सभी साफ करें'),
          ),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text(
              'Type करें या field के list icon से database options scroll/search करके चुनें।',
              style: TextStyle(
                  color: muted, fontSize: 12, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Wrap(spacing: 10, runSpacing: 10, children: [
              _SearchFilter(
                  controller: assemblyNumber,
                  label: 'विधानसभा संख्या',
                  icon: Icons.account_balance_outlined,
                  onChanged: (_) => filtersChanged(),
                  onPick: () => openSmartFilter('assembly', 'विधानसभा')),
              _DatabaseFilterPicker(
                label: 'भाग / गाँव',
                icon: Icons.holiday_village_outlined,
                value: partVillageValue,
                onTap: () => openSmartFilter('partVillage', 'भाग / गाँव'),
                onClear: _clearPartVillageFilter,
              ),
              _DatabaseFilterPicker(
                label: 'अनुभाग / मोहल्ला',
                icon: Icons.segment_rounded,
                value: _filterValue('section', sectionName),
                onTap: () => openSmartFilter('section', 'अनुभाग / मोहल्ला'),
                onClear: _clearSectionFilter,
              ),
              _SearchFilter(
                  controller: gramPanchayat,
                  label: 'ग्राम पंचायत',
                  icon: Icons.holiday_village_outlined,
                  onChanged: (_) => filtersChanged(),
                  onPick: () =>
                      openSmartFilter('gramPanchayat', 'ग्राम पंचायत')),
              _SearchFilter(
                  controller: tehsil,
                  label: 'तहसील',
                  icon: Icons.location_city_outlined,
                  onChanged: (_) => filtersChanged(),
                  onPick: () => openSmartFilter('tehsil', 'तहसील')),
              _SearchFilter(
                  controller: municipality,
                  label: 'नगर पालिका',
                  icon: Icons.apartment_outlined,
                  onChanged: (_) => filtersChanged(),
                  onPick: () => openSmartFilter('municipality', 'नगर पालिका')),
              _SearchFilter(
                  controller: location,
                  label: 'पता / स्थान',
                  icon: Icons.location_on_outlined,
                  onChanged: (_) => filtersChanged()),
              _SearchFilter(
                  controller: pinCode,
                  label: 'PIN कोड',
                  icon: Icons.pin_drop_outlined,
                  onChanged: (_) => filtersChanged(),
                  onPick: () => openSmartFilter('pinCode', 'PIN कोड')),
              _SearchFilter(
                  controller: voterSerial,
                  label: 'मतदाता क्रम संख्या',
                  icon: Icons.format_list_numbered_rounded,
                  enabled: partVillageValue.trim().isNotEmpty,
                  onChanged: (_) => filtersChanged()),
              _SearchFilter(
                  controller: caste,
                  label: 'जाति',
                  icon: Icons.groups_2_outlined,
                  onChanged: (_) => filtersChanged(),
                  onPick: () => openSmartFilter('caste', 'जाति')),
              _SearchFilter(
                  controller: organizationPost,
                  label: 'राजनीतिक पद',
                  icon: Icons.badge_outlined,
                  onChanged: (_) => filtersChanged(),
                  onPick: () =>
                      openSmartFilter('organizationPost', 'संगठन पद')),
              _SearchFilter(
                  controller: occupation,
                  label: 'Vyavsay',
                  icon: Icons.work_outline,
                  onChanged: (_) => filtersChanged(),
                  onPick: () => openSmartFilter('occupation', 'Vyavsay')),
              _FilterDropdown(
                label: 'सर्वे स्थिति',
                value: profileCompletionStatus,
                items: const {
                  '': 'सभी',
                  'pending': 'जानकारी बाकी',
                  'complete': 'जानकारी पूर्ण',
                },
                onChanged: (value) => setState(() {
                  profileCompletionStatus = value;
                  refreshVoters();
                }),
              ),
              _FilterDropdown(
                label: 'पार्टी',
                value: partyPreferenceFilter,
                items: const {
                  '': 'सभी',
                  'congress': '✋ Congress',
                  'bjp': '🪷 BJP',
                  'nota': 'NOTA',
                  'other': '◆ अन्य पार्टी',
                  'undecided': 'पार्टी तय नहीं',
                },
                onChanged: (value) => setState(() {
                  partyPreferenceFilter = value;
                  currentPage = 1;
                  refreshVoters();
                }),
              ),
              _FilterDropdown(
                label: 'लिंग',
                value: gender,
                items: const {
                  '': 'सभी',
                  'male': 'पुरुष',
                  'female': 'महिला',
                  'other': 'अन्य',
                },
                onChanged: (value) => setState(() {
                  gender = value;
                  currentPage = 1;
                  refreshVoters();
                }),
              ),
              _FilterDropdown(
                label: 'सत्यापन',
                value: verificationStatus,
                items: const {
                  '': 'सभी',
                  'pending': 'लंबित',
                  'verified': 'सत्यापित',
                  'needs_review': 'Review आवश्यक',
                  'duplicate': 'डुप्लीकेट',
                },
                onChanged: (value) => setState(() {
                  verificationStatus = value;
                  currentPage = 1;
                  refreshVoters();
                }),
              ),
            ]),
          ]),
        ),
      ],
      FutureBuilder<Map<String, dynamic>>(
        future: dashboardFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(30),
                child: CircularProgressIndicator(),
              ),
            );
          }
          if (snapshot.hasError) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Text('${snapshot.error}',
                  style: const TextStyle(color: Colors.red)),
            );
          }
          final d = snapshot.data ?? const <String, dynamic>{};
          return LayoutBuilder(builder: (context, constraints) {
            final columns = constraints.maxWidth >= 720
                ? 3
                : constraints.maxWidth >= 360
                    ? 2
                    : 1;
            final width = (constraints.maxWidth - (columns - 1) * 10) / columns;
            final items = [
              MetricCard(
                  label: 'कुल मतदाता',
                  value: '${d['members'] ?? 0}',
                  icon: Icons.groups,
                  color: blue),
              MetricCard(
                  label: 'समर्थक मतदाता',
                  value: '${_supportCount(d, 'supporter')}',
                  icon: Icons.group,
                  color: green),
              MetricCard(
                  label: 'विरोधी मतदाता',
                  value: '${_supportCount(d, 'opposite')}',
                  icon: Icons.local_florist,
                  color: orange),
            ];
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: items
                  .map((card) => SizedBox(width: width, child: card))
                  .toList(),
            );
          });
        },
      ),
      _AlphabetFilterBar(
        selected: nameLetter,
        onChanged: (letter) => setState(() {
          nameLetter = letter;
          currentPage = 1;
          selectedIds.clear();
          refreshVoters();
        }),
      ),
      FutureBuilder<VoterPageResult>(
        future: votersFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(30),
                child: CircularProgressIndicator(),
              ),
            );
          }
          if (snapshot.hasError) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Text('${snapshot.error}',
                  style: const TextStyle(color: Colors.red)),
            );
          }
          final result = snapshot.data!;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _FilterResultSummary(
                total: result.total,
                shown: result.items.length,
                activeFilters: activeFilterChips.length,
              ),
              const SizedBox(height: 10),
              VoterTable(
                items: result.items
                    .map((e) => Map<String, dynamic>.from(e))
                    .toList(),
                refresh: () => setState(refreshVoters),
                onDeleteAll: deleteAll,
                onDeleteSelected: deleteSelectedContacts,
                total: result.total,
                page: result.page,
                pages: result.pages,
                onPageChanged: (page) => setState(() {
                  currentPage = page;
                  refreshVoters();
                }),
                pageSize: result.limit,
                selectedIds: selectedIds,
                onSelectionChanged: (id, selected) => setState(() {
                  if (selected) {
                    selectedIds.add(id);
                  } else {
                    selectedIds.remove(id);
                  }
                }),
                onSelectPage: (ids, selected) => setState(() {
                  if (selected) {
                    selectedIds.addAll(ids);
                  } else {
                    selectedIds.removeAll(ids);
                  }
                }),
              ),
            ],
          );
        },
      ),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: const Color(0xfff2f6ff),
            borderRadius: BorderRadius.circular(10)),
        child: Wrap(spacing: 8, runSpacing: 8, children: [
          if (selectedIds.isNotEmpty)
            Chip(
              avatar: const Icon(Icons.check_circle, color: green, size: 18),
              label: Text('${selectedIds.length} मतदाता चयनित'),
              onDeleted: () => setState(selectedIds.clear),
            ),
          OutlinedButton.icon(
              onPressed: () => saveApiFile(context,
                      path: '/api/export/members.xlsx',
                      fallbackName: 'voters.xlsx',
                      query: {
                        ...filterQuery,
                        if (selectedIds.isNotEmpty)
                          'ids': selectedIds.join(','),
                      }),
              icon: const Icon(Icons.table_view, color: green),
              label:
                  Text(selectedIds.isEmpty ? 'फ़िल्टर Excel' : 'चयनित Excel')),
          FilledButton.icon(
              onPressed: openCustomPrint,
              icon: const Icon(Icons.print),
              label: Text(selectedIds.isEmpty
                  ? 'कस्टम Bulk Print'
                  : 'चयनित (${selectedIds.length}) Print')),
        ]),
      )
    ]);
  }
}

class _ActiveFilterData {
  const _ActiveFilterData({
    required this.label,
    required this.value,
    required this.onClear,
  });

  final String label;
  final String value;
  final VoidCallback onClear;
}

class _RecentFilter {
  const _RecentFilter({
    required this.field,
    required this.title,
    required this.label,
    required this.filters,
  });

  final String field;
  final String title;
  final String label;
  final Map<String, String> filters;
}

class _RollFilterStrip extends StatelessWidget {
  const _RollFilterStrip(
      {required this.rollType,
      required this.matchStatus,
      required this.wardController,
      required this.onChanged,
      required this.onWardSubmitted});
  final String rollType;
  final String matchStatus;
  final TextEditingController wardController;
  final void Function(String rollType, String matchStatus) onChanged;
  final ValueChanged<String> onWardSubmitted;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(10, 9, 10, 10),
        decoration: BoxDecoration(
            color: const Color(0xfff7f9ff),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xffdbe5f6))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Row(children: [
            Icon(Icons.filter_alt_outlined, color: blue, size: 17),
            SizedBox(width: 6),
            Text('सूची फ़िल्टर',
                style: TextStyle(color: navy, fontWeight: FontWeight.w900))
          ]),
          const SizedBox(height: 8),
          SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: [
                ChoiceChip(
                    visualDensity: VisualDensity.compact,
                    label: const Text('विधानसभा'),
                    selected: rollType == 'assembly' && matchStatus.isEmpty,
                    onSelected: (_) => onChanged('assembly', '')),
                const SizedBox(width: 6),
                ChoiceChip(
                    visualDensity: VisualDensity.compact,
                    label: const Text('Ward'),
                    selected: rollType == 'municipal' && matchStatus.isEmpty,
                    onSelected: (_) => onChanged('municipal', '')),
                const SizedBox(width: 6),
                ChoiceChip(
                    visualDensity: VisualDensity.compact,
                    label: const Text('दोनों'),
                    selected: matchStatus == 'both',
                    onSelected: (_) => onChanged('all', 'both')),
                const SizedBox(width: 6),
                ChoiceChip(
                    visualDensity: VisualDensity.compact,
                    label: const Text('केवल विधानसभा'),
                    selected: matchStatus == 'assembly_only',
                    onSelected: (_) => onChanged('all', 'assembly_only')),
                const SizedBox(width: 6),
                ChoiceChip(
                    visualDensity: VisualDensity.compact,
                    label: const Text('केवल Ward'),
                    selected: matchStatus == 'municipal_only',
                    onSelected: (_) => onChanged('all', 'municipal_only')),
                const SizedBox(width: 8),
                SizedBox(
                    width: 102,
                    child: TextField(
                        controller: wardController,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.search,
                        onSubmitted: onWardSubmitted,
                        decoration: const InputDecoration(
                            isDense: true,
                            hintText: 'Ward नं.',
                            prefixIcon:
                                Icon(Icons.grid_view_rounded, size: 17)))),
              ])),
        ]),
      );
}

class _ContactTypeFilterChips extends StatelessWidget {
  const _ContactTypeFilterChips({
    required this.selected,
    required this.onChanged,
  });

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget chip({
      required String value,
      required String label,
      required IconData icon,
    }) {
      final isSelected = selected == value;
      return ChoiceChip(
        selected: isSelected,
        onSelected: (_) => onChanged(value),
        avatar: Icon(
          icon,
          size: 18,
          color: isSelected ? Colors.white : blue,
        ),
        label: Text(label),
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : navy,
          fontWeight: FontWeight.w800,
        ),
        selectedColor: blue,
        backgroundColor: Colors.white,
        side: BorderSide(color: isSelected ? blue : border),
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        chip(value: '', label: 'All', icon: Icons.people_alt_rounded),
        const SizedBox(width: 8),
        chip(
          value: 'personal',
          label: 'Personal',
          icon: Icons.person_pin_circle_rounded,
        ),
      ]),
    );
  }
}

class _ActiveFilterChips extends StatelessWidget {
  const _ActiveFilterChips({
    required this.items,
    required this.onClearAll,
    this.compact = false,
  });

  final List<_ActiveFilterData> items;
  final VoidCallback onClearAll;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: EdgeInsets.only(top: compact ? 8 : 10, bottom: compact ? 2 : 0),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xfff8fbff),
          borderRadius: BorderRadius.circular(compact ? 18 : 20),
          border: Border.all(color: border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.filter_alt_rounded, color: blue, size: 18),
            const SizedBox(width: 7),
            Text('${items.length} active filters',
                style: const TextStyle(
                    color: navy, fontWeight: FontWeight.w900, fontSize: 13)),
            const Spacer(),
            TextButton(
              onPressed: onClearAll,
              child: const Text('Reset all'),
            ),
          ]),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: items
                .map((item) => InputChip(
                      avatar: const Icon(Icons.check_circle_rounded,
                          color: green, size: 17),
                      label: Text('${item.label}: ${item.value}'),
                      onDeleted: item.onClear,
                      labelStyle: const TextStyle(
                          color: navy, fontWeight: FontWeight.w800),
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: border),
                    ))
                .toList(),
          ),
        ]),
      ),
    );
  }
}

// ignore: unused_element
class _LocationFilterCard extends StatelessWidget {
  const _LocationFilterCard({
    required this.assembly,
    required this.partVillage,
    required this.section,
    required this.onPickAssembly,
    required this.onPickPartVillage,
    required this.onPickSection,
    required this.onClear,
  }) : compact = false;

  final String assembly;
  final String partVillage;
  final String section;
  final VoidCallback onPickAssembly;
  final VoidCallback onPickPartVillage;
  final VoidCallback onPickSection;
  final VoidCallback onClear;
  final bool compact;

  bool get hasAny =>
      assembly.trim().isNotEmpty ||
      partVillage.trim().isNotEmpty ||
      section.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(top: compact ? 8 : 10),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(compact ? 12 : 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(compact ? 18 : 22),
            border: Border.all(
                color: hasAny ? blue.withValues(alpha: .28) : border),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0c071b4b),
                blurRadius: 18,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: softBlue,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(Icons.map_rounded, color: blue, size: 20),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'भाग / गाँव → अनुभाग / मोहल्ला',
                        style: TextStyle(
                          color: navy,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'पहले भाग / गाँव चुनें, फिर उससे संबंधित अनुभाग चुनें',
                        style: TextStyle(color: muted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                if (hasAny)
                  IconButton(
                    tooltip: 'Location filter हटाएँ',
                    onPressed: onClear,
                    icon: const Icon(Icons.close_rounded, color: muted),
                  ),
              ]),
              const SizedBox(height: 11),
              LayoutBuilder(builder: (context, constraints) {
                final chipWidth = constraints.maxWidth < 520
                    ? constraints.maxWidth
                    : compact
                        ? 150.0
                        : 190.0;
                return Wrap(spacing: 8, runSpacing: 8, children: [
                  _LocationPickChip(
                    width: chipWidth,
                    label: 'विधानसभा',
                    value: assembly,
                    icon: Icons.account_balance_rounded,
                    onTap: onPickAssembly,
                  ),
                  _LocationPickChip(
                    width: chipWidth,
                    label: 'भाग / गाँव',
                    value: partVillage,
                    icon: Icons.holiday_village_rounded,
                    onTap: onPickPartVillage,
                  ),
                  _LocationPickChip(
                    width: chipWidth,
                    label: 'अनुभाग / मोहल्ला',
                    value: section,
                    icon: Icons.segment_rounded,
                    onTap: partVillage.trim().isNotEmpty
                        ? onPickSection
                        : () => ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('पहले भाग / गाँव चुनें।'),
                              ),
                            ),
                  ),
                ]);
              }),
            ],
          ),
        ),
      );
}

class _LocationPickChip extends StatelessWidget {
  const _LocationPickChip({
    required this.width,
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
  });

  final double width;
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selected = value.trim().isNotEmpty;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: width,
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? softBlue : const Color(0xfff7f9ff),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: selected ? blue.withValues(alpha: .35) : border),
        ),
        child: Row(children: [
          Icon(icon, color: selected ? blue : muted, size: 18),
          const SizedBox(width: 7),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(color: muted, fontSize: 9.5)),
              const SizedBox(height: 2),
              Text(selected ? value : 'चुनें',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      color: selected ? navy : muted,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w900)),
            ]),
          ),
          const Icon(Icons.keyboard_arrow_down_rounded, color: muted, size: 18),
        ]),
      ),
    );
  }
}

class _RecentFilterStrip extends StatelessWidget {
  const _RecentFilterStrip({required this.items, required this.onTap});

  final List<_RecentFilter> items;
  final ValueChanged<_RecentFilter> onTap;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Recent filters',
            style: TextStyle(
                color: navy, fontWeight: FontWeight.w900, fontSize: 13)),
        const SizedBox(height: 7),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: items
                .map((item) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        avatar: const Icon(Icons.history_rounded, size: 17),
                        label: Text('${item.title}: ${item.label}'),
                        onPressed: () => onTap(item),
                      ),
                    ))
                .toList(),
          ),
        ),
      ]),
    );
  }
}

class _FilterResultSummary extends StatelessWidget {
  const _FilterResultSummary({
    required this.total,
    required this.shown,
    required this.activeFilters,
  });

  final int total;
  final int shown;
  final int activeFilters;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: const Color(0xffeef6ff),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: blue.withValues(alpha: .16)),
        ),
        child: Row(children: [
          const Icon(Icons.people_alt_rounded, color: blue, size: 20),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              activeFilters == 0
                  ? '$total मतदाता मिले'
                  : '$total मतदाता मिले • $activeFilters filter active',
              style: const TextStyle(color: navy, fontWeight: FontWeight.w900),
            ),
          ),
          Text('इस पेज: $shown',
              style:
                  const TextStyle(color: muted, fontWeight: FontWeight.w800)),
        ]),
      );
}

class _SmartSearchPanel extends StatelessWidget {
  const _SmartSearchPanel({
    required this.selectedLabels,
    required this.onPick,
    required this.onClear,
    required this.onClearAll,
  });

  final Map<String, String> selectedLabels;
  final void Function(String field, String title) onPick;
  final ValueChanged<String> onClear;
  final VoidCallback? onClearAll;

  static const fields = <_SmartFilterDef>[
    _SmartFilterDef('assembly', 'विधानसभा', Icons.account_balance_rounded),
    _SmartFilterDef('partVillage', 'भाग / गाँव', Icons.holiday_village_rounded),
    _SmartFilterDef(
        'gramPanchayat', 'ग्राम पंचायत', Icons.holiday_village_rounded),
    _SmartFilterDef('tehsil', 'तहसील', Icons.apartment_rounded),
    _SmartFilterDef('municipality', 'नगर पालिका', Icons.location_city_outlined),
    _SmartFilterDef(
        'section', 'अनुभाग / मोहल्ला', Icons.format_list_numbered_rounded),
    _SmartFilterDef('caste', 'जाति', Icons.groups_2_rounded),
    _SmartFilterDef('occupation', 'Vyavsay', Icons.work_rounded),
    _SmartFilterDef('organizationPost', 'संगठन पद', Icons.badge_rounded),
  ];

  @override
  Widget build(BuildContext context) => SectionCard(
        title: 'स्मार्ट खोज',
        subtitle:
            'नाम, पिता/पति का नाम, EPIC, मोबाइल या घर संख्या लिखकर तुरंत खोजें',
        icon: Icons.manage_search_rounded,
        action: onClearAll == null
            ? null
            : TextButton.icon(
                onPressed: onClearAll,
                icon: const Icon(Icons.clear_all_rounded),
                label: const Text('सभी साफ करें'),
              ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(
            spacing: 9,
            runSpacing: 9,
            children: fields
                .map((field) => _DatabaseFilterPicker(
                      label: field.label,
                      icon: field.icon,
                      value: selectedLabels[field.field],
                      onTap: () => onPick(field.field, field.label),
                      onClear: () => onClear(field.field),
                    ))
                .toList(),
          ),
          if (selectedLabels.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: selectedLabels.entries
                  .map((entry) => InputChip(
                        avatar: const Icon(Icons.check_circle_rounded,
                            color: green, size: 18),
                        label: Text(entry.value),
                        onDeleted: () => onClear(entry.key),
                      ))
                  .toList(),
            ),
          ],
          const SizedBox(height: 10),
          const Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [
              _SearchHintChip(Icons.person_search_rounded, 'मतदाता नाम'),
              _SearchHintChip(Icons.family_restroom_rounded, 'पिता/पति नाम'),
              _SearchHintChip(Icons.badge_outlined, 'EPIC'),
              _SearchHintChip(Icons.home_rounded, 'घर संख्या'),
              _SearchHintChip(Icons.phone_rounded, 'मोबाइल'),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Tip: “रामलाल मोहन” जैसे नाम + पिता/पति नाम साथ लिखने पर भी search चलेगा।',
            style: TextStyle(color: muted, fontSize: 12),
          ),
        ]),
      );
}

IconData _searchModeIcon(String mode) => switch (mode) {
      'name' => Icons.person_search_rounded,
      'guardian' => Icons.family_restroom_rounded,
      'epic' => Icons.badge_outlined,
      'house' => Icons.home_rounded,
      'mobile' => Icons.phone_rounded,
      'pin' => Icons.pin_drop_outlined,
      'village' => Icons.holiday_village_outlined,
      _ => Icons.search_rounded,
    };

class _EasyVoterSearchCard extends StatelessWidget {
  const _EasyVoterSearchCard(
      {required this.controller,
      required this.focusNode,
      required this.listening,
      required this.selectedMode,
      required this.selectedModeLabel,
      required this.showOptions,
      required this.onChanged,
      required this.onSubmitted,
      required this.onClear,
      required this.onMic,
      required this.onQuickPick,
      this.expandedFilters});
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool listening;
  final String selectedMode;
  final String selectedModeLabel;
  final bool showOptions;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onClear;
  final VoidCallback onMic;
  final ValueChanged<String> onQuickPick;
  final Widget? expandedFilters;
  @override
  Widget build(BuildContext context) => TextFieldTapRegion(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _EasyVoterSearchField(
              controller: controller,
              focusNode: focusNode,
              listening: listening,
              selectedMode: selectedMode,
              selectedModeLabel: selectedModeLabel,
              onChanged: onChanged,
              onSubmitted: onSubmitted,
              onClear: onClear,
              onMic: onMic,
              compact: true),
          if (listening) ...[
            const SizedBox(height: 8),
            const Text('सुन रहा हूँ… नाम, पिता/पति, EPIC या मोबाइल बोलें',
                style: TextStyle(
                    color: Colors.red,
                    fontSize: 12,
                    fontWeight: FontWeight.w800))
          ],
          if (showOptions) ...[
            const SizedBox(height: 10),
            _SearchHelpStrip(
                compact: true, selectedMode: selectedMode, onPick: onQuickPick),
            if (expandedFilters != null) ...[
              const SizedBox(height: 8),
              expandedFilters!
            ],
          ],
        ]),
      );
}

class _EasyVoterSearchField extends StatelessWidget {
  const _EasyVoterSearchField({
    required this.controller,
    required this.focusNode,
    required this.listening,
    required this.selectedMode,
    required this.selectedModeLabel,
    required this.onChanged,
    required this.onSubmitted,
    required this.onClear,
    required this.onMic,
    this.compact = false,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool listening;
  final String selectedMode;
  final String selectedModeLabel;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onClear;
  final VoidCallback onMic;
  final bool compact;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        focusNode: focusNode,
        onTapOutside: (_) => focusNode.unfocus(),
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        onSubmitted: onSubmitted,
        style: const TextStyle(fontWeight: FontWeight.w800, color: navy),
        decoration: InputDecoration(
          hintText: selectedModeLabel.isNotEmpty
              ? '$selectedModeLabel से खोजें...'
              : compact
                  ? 'नाम, पिता/पति, EPIC, मोबाइल...'
                  : 'नाम, पिता/पति, EPIC, मोबाइल, घर, गाँव या पंचायत खोजें...',
          hintStyle: const TextStyle(color: muted, fontWeight: FontWeight.w600),
          prefixIcon: Icon(
            selectedMode.isEmpty
                ? Icons.search_rounded
                : _searchModeIcon(selectedMode),
            color: blue,
          ),
          suffixIcon: Row(mainAxisSize: MainAxisSize.min, children: [
            if (controller.text.isNotEmpty)
              IconButton(
                tooltip: 'खोज साफ करें',
                onPressed: onClear,
                icon: const Icon(Icons.close_rounded),
              ),
            IconButton(
              tooltip: listening ? 'सुनना बंद करें' : 'बोलकर खोजें',
              onPressed: onMic,
              icon: Icon(
                listening ? Icons.mic_rounded : Icons.mic_none_rounded,
                color: listening ? Colors.red : blue,
              ),
            ),
          ]),
          filled: true,
          fillColor: const Color(0xfff7f9ff),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: blue, width: 1.4),
          ),
        ),
      );
}

class _SearchHelpStrip extends StatelessWidget {
  const _SearchHelpStrip({
    this.compact = false,
    this.selectedMode = '',
    this.onPick,
  });
  final bool compact;
  final String selectedMode;
  final ValueChanged<String>? onPick;

  List<Widget> get chips => [
        _SearchHintChip(Icons.person_search_rounded, 'नाम',
            selected: selectedMode == 'name', onTap: onPick),
        _SearchHintChip(Icons.family_restroom_rounded, 'पिता/पति',
            selected: selectedMode == 'guardian', onTap: onPick),
        _SearchHintChip(Icons.badge_outlined, 'EPIC',
            selected: selectedMode == 'epic', onTap: onPick),
        _SearchHintChip(Icons.home_rounded, 'घर',
            selected: selectedMode == 'house', onTap: onPick),
        _SearchHintChip(Icons.phone_rounded, 'मोबाइल',
            selected: selectedMode == 'mobile', onTap: onPick),
        _SearchHintChip(Icons.holiday_village_outlined, 'गाँव',
            selected: selectedMode == 'village', onTap: onPick),
        _SearchHintChip(Icons.pin_drop_outlined, 'PIN',
            selected: selectedMode == 'pin', onTap: onPick),
      ];

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          for (var index = 0; index < chips.length; index++) ...[
            if (index > 0) const SizedBox(width: 7),
            chips[index],
          ],
        ]),
      );
    }
    return Wrap(
      spacing: 7,
      runSpacing: 7,
      children: [
        ...chips,
        _SearchHintChip(Icons.lightbulb_outline_rounded, 'जैसे: राम मोहन',
            onTap: onPick),
      ],
    );
  }
}

class _SearchHintChip extends StatelessWidget {
  const _SearchHintChip(
    this.icon,
    this.label, {
    this.selected = false,
    this.onTap,
  });
  final IconData icon;
  final String label;
  final bool selected;
  final ValueChanged<String>? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap == null ? null : () => onTap!(label),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? softBlue : const Color(0xfff6f8fc),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? blue : border),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, color: selected ? blue : muted, size: 14),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: selected ? blue : navy,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ]),
        ),
      );
}

class _BoothWorkStrip extends StatelessWidget {
  const _BoothWorkStrip({
    required this.incompleteSelected,
    required this.reviewSelected,
    required this.onAll,
    required this.onIncomplete,
    required this.onReview,
  });

  final bool incompleteSelected;
  final bool reviewSelected;
  final VoidCallback onAll;
  final VoidCallback onIncomplete;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(
          child: _BoothTaskButton(
            label: 'सभी',
            icon: Icons.people_alt_outlined,
            selected: !incompleteSelected && !reviewSelected,
            onTap: onAll,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _BoothTaskButton(
            label: 'जानकारी बाकी',
            icon: Icons.assignment_late_outlined,
            selected: incompleteSelected,
            onTap: onIncomplete,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _BoothTaskButton(
            label: 'Review',
            icon: Icons.fact_check_outlined,
            selected: reviewSelected,
            onTap: onReview,
          ),
        ),
      ]);
}

class _BoothTaskButton extends StatelessWidget {
  const _BoothTaskButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: 58,
          padding: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(
            color: selected ? blue : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: selected ? blue : border),
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 19, color: selected ? Colors.white : blue),
            const SizedBox(height: 4),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(label,
                  maxLines: 1,
                  style: TextStyle(
                      color: selected ? Colors.white : navy,
                      fontSize: 11,
                      fontWeight: FontWeight.w900)),
            ),
          ]),
        ),
      );
}

class _PhoneCombinedFilterStrip extends StatelessWidget {
  const _PhoneCombinedFilterStrip({
    required this.contactType,
    required this.showPersonal,
    required this.partyPreference,
    required this.reviewSelected,
    required this.onAll,
    required this.onAllDoubleTap,
    required this.onParty,
    required this.onReview,
  });

  final String contactType;
  final bool showPersonal;
  final String partyPreference;
  final bool reviewSelected;
  final VoidCallback onAll;
  final VoidCallback onAllDoubleTap;
  final ValueChanged<String> onParty;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    Widget chip({
      required String label,
      required Widget avatar,
      required Color color,
      required bool selected,
      required VoidCallback onTap,
      VoidCallback? onDoubleTap,
    }) =>
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onDoubleTap: onDoubleTap,
            child: ChoiceChip(
              selected: selected,
              onSelected: (_) => onTap(),
              avatar: avatar,
              label: Text(label),
              labelStyle: TextStyle(
                color: selected ? Colors.white : navy,
                fontWeight: FontWeight.w800,
              ),
              selectedColor: color,
              backgroundColor: Colors.white,
              side: BorderSide(color: selected ? color : border),
              showCheckmark: false,
            ),
          ),
        );

    Widget partyChip(String value, String label, Color color) => chip(
          label: label,
          avatar: PartyPreferenceChip(value: value, size: 24),
          color: color,
          selected: partyPreference == value,
          onTap: () => onParty(value),
        );

    final allSelected =
        contactType.isEmpty && partyPreference.isEmpty && !reviewSelected;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        chip(
          label: 'All',
          avatar: Icon(Icons.people_alt_rounded,
              size: 17, color: allSelected ? Colors.white : blue),
          color: blue,
          selected: allSelected,
          onTap: onAll,
          onDoubleTap: showPersonal ? onAllDoubleTap : null,
        ),
        partyChip('congress', 'Congress', green),
        partyChip('bjp', 'BJP', orange),
        partyChip('nota', 'NOTA', muted),
        partyChip('other', 'Any Party', purple),
        chip(
          label: 'Review',
          avatar: Icon(Icons.fact_check_rounded,
              size: 17, color: reviewSelected ? Colors.white : purple),
          color: purple,
          selected: reviewSelected,
          onTap: onReview,
        ),
      ]),
    );
  }
}

// ignore: unused_element
class _PhoneCategoryStrip extends StatelessWidget {
  const _PhoneCategoryStrip({
    required this.selected,
    required this.reviewSelected,
    required this.onChanged,
    required this.onReview,
  });

  final String selected;
  final bool reviewSelected;
  final ValueChanged<String> onChanged;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          _PhoneCategory(
            label: 'सभी',
            icon: Icons.contacts_rounded,
            color: blue,
            selected: selected.isEmpty && !reviewSelected,
            onTap: () => onChanged(''),
          ),
          _PhoneCategory(
            label: 'समर्थक',
            icon: Icons.thumb_up_rounded,
            color: green,
            selected: selected == 'supporter',
            onTap: () => onChanged('supporter'),
          ),
          _PhoneCategory(
            label: 'तटस्थ',
            icon: Icons.people_alt_rounded,
            color: orange,
            selected: selected == 'neutral',
            onTap: () => onChanged('neutral'),
          ),
          _PhoneCategory(
            label: 'विरोधी',
            icon: Icons.trending_down_rounded,
            color: rose,
            selected: selected == 'opposite',
            onTap: () => onChanged('opposite'),
          ),
          _PhoneCategory(
            label: 'Review',
            icon: Icons.fact_check_rounded,
            color: purple,
            selected: reviewSelected,
            onTap: onReview,
          ),
        ]),
      );
}

class _PhoneCategory extends StatelessWidget {
  const _PhoneCategory({
    required this.label,
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
            child: Column(children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: selected ? color : color.withValues(alpha: .11),
                  shape: BoxShape.circle,
                  boxShadow: selected
                      ? [
                          BoxShadow(
                              color: color.withValues(alpha: .22),
                              blurRadius: 12)
                        ]
                      : null,
                ),
                child: Icon(icon, color: selected ? Colors.white : color),
              ),
              const SizedBox(height: 6),
              Text(label,
                  style: TextStyle(
                      color: selected ? navy : muted,
                      fontSize: 11,
                      fontWeight:
                          selected ? FontWeight.w900 : FontWeight.w700)),
            ]),
          ),
        ),
      );
}

class _PhoneContactList extends StatelessWidget {
  const _PhoneContactList({
    required this.result,
    required this.selectedIds,
    required this.onSelectionChanged,
    required this.onSelectPage,
    required this.onDeleteSelected,
    required this.onClearSelection,
    required this.onChanged,
    required this.onPageChanged,
  });

  final VoterPageResult result;
  final Set<String> selectedIds;
  final void Function(String id, bool selected) onSelectionChanged;
  final void Function(Iterable<String> ids, bool selected) onSelectPage;
  final VoidCallback onDeleteSelected;
  final VoidCallback onClearSelection;
  final VoidCallback onChanged;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    final contacts = result.items
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    String initialOf(Map<String, dynamic> voter) {
      final name = '${voter['name'] ?? ''}'.trim();
      return name.isEmpty ? '#' : name.characters.first;
    }

    final pageIds = contacts.map((voter) => '${voter['_id']}').toList();
    final allSelected =
        pageIds.isNotEmpty && pageIds.every(selectedIds.contains);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text('${result.total} मतदाता मिले',
            style: const TextStyle(color: muted, fontSize: 12)),
      ),
      if (selectedIds.isNotEmpty)
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xfffff5f5),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.red.withValues(alpha: .18)),
          ),
          child: Row(children: [
            Expanded(
              child: Text('${selectedIds.length} selected',
                  style: const TextStyle(
                      color: navy, fontWeight: FontWeight.w900)),
            ),
            TextButton(
              onPressed: pageIds.isEmpty
                  ? null
                  : () => onSelectPage(pageIds, !allSelected),
              child: Text(allSelected ? 'Unselect all' : 'Select all'),
            ),
            IconButton(
              tooltip: 'Clear',
              onPressed: onClearSelection,
              icon: const Icon(Icons.close_rounded),
            ),
            IconButton.filled(
              tooltip: 'Delete selected',
              style: IconButton.styleFrom(backgroundColor: Colors.red),
              onPressed: onDeleteSelected,
              icon: const Icon(Icons.delete_outline_rounded),
            ),
          ]),
        ),
      for (var index = 0; index < contacts.length; index++) ...[
        if (index == 0 ||
            initialOf(contacts[index]) != initialOf(contacts[index - 1]))
          Padding(
            padding: EdgeInsets.only(top: index == 0 ? 8 : 18, bottom: 6),
            child: Text(
              initialOf(contacts[index]),
              style: const TextStyle(
                color: muted,
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        _PhoneContactTile(
          voter: contacts[index],
          selected: selectedIds.contains('${contacts[index]['_id']}'),
          selectionMode: selectedIds.isNotEmpty,
          onSelected: (selected) =>
              onSelectionChanged('${contacts[index]['_id']}', selected),
          onChanged: onChanged,
        ),
      ],
      if (result.pages > 1)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            IconButton.outlined(
              onPressed:
                  result.page > 1 ? () => onPageChanged(result.page - 1) : null,
              icon: const Icon(Icons.chevron_left_rounded),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text('${result.page} / ${result.pages}',
                  style: const TextStyle(
                      color: navy, fontWeight: FontWeight.w900)),
            ),
            IconButton.outlined(
              onPressed: result.page < result.pages
                  ? () => onPageChanged(result.page + 1)
                  : null,
              icon: const Icon(Icons.chevron_right_rounded),
            ),
          ]),
        ),
    ]);
  }
}

class _PhoneContactTile extends StatelessWidget {
  const _PhoneContactTile({
    required this.voter,
    required this.selected,
    required this.selectionMode,
    required this.onSelected,
    required this.onChanged,
  });

  final Map<String, dynamic> voter;
  final bool selected;
  final bool selectionMode;
  final ValueChanged<bool> onSelected;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final mobile = '${voter['mobile'] ?? ''}'.trim();
    final village = '${voter['village'] ?? ''}'.trim();
    final ward = voter['ward'] is Map ? '${voter['ward']['number'] ?? ''}' : '';
    final hasAssembly = voter['hasAssemblyMembership'] == true ||
        '${voter['assemblyNumber'] ?? ''}'.isNotEmpty;
    final hasMunicipal = voter['hasMunicipalMembership'] == true;
    final municipalWards = (voter['municipalWardNumbers'] as List? ?? const [])
        .map((value) => '$value')
        .join(', ');
    final place = [
      if (ward.isNotEmpty) 'वार्ड $ward',
      if (village.isNotEmpty) village,
    ].join(' · ');
    return Material(
      color: selected ? const Color(0xffeef5ff) : Colors.white,
      child: InkWell(
        onTap: () {
          if (selectionMode) {
            onSelected(!selected);
            return;
          }
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  VoterDetailPage(voter: voter, onChanged: onChanged),
            ),
          );
        },
        onLongPress: () => onSelected(!selected),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xffedf0f5))),
          ),
          child: Row(children: [
            if (selectionMode || selected) ...[
              Checkbox(
                value: selected,
                onChanged: (value) => onSelected(value ?? false),
                visualDensity: VisualDensity.compact,
              ),
            ],
            _VoterPhoto(photo: voter['photo'], radius: 25),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${voter['name'] ?? '-'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: navy,
                            fontSize: 15,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(
                        mobile.isEmpty
                            ? 'EPIC: ${voter['voterId'] ?? '-'}'
                            : mobile,
                        style: const TextStyle(color: muted, fontSize: 12)),
                    if (place.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(place,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: muted, fontSize: 11)),
                    ],
                    const SizedBox(height: 5),
                    Wrap(spacing: 5, runSpacing: 4, children: [
                      if (hasAssembly)
                        const _MembershipBadge(label: 'विधानसभा', color: blue),
                      if (hasMunicipal)
                        _MembershipBadge(
                            label: municipalWards.isEmpty
                                ? 'Ward सूची'
                                : 'Ward $municipalWards',
                            color: green),
                      if (hasAssembly && !hasMunicipal)
                        const _MembershipBadge(
                            label: 'Ward सूची में नहीं', color: muted),
                    ]),
                    if (!['', 'undecided'].contains(
                        '${voter['partyPreference'] ?? 'undecided'}')) ...[
                      const SizedBox(height: 6),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: PartyPreferenceChip(
                          value: '${voter['partyPreference'] ?? 'undecided'}',
                        ),
                      ),
                    ],
                  ]),
            ),
            if (api.user?['role'] == 'admin')
              IconButton(
                tooltip: voter['isFavorite'] == true
                    ? 'Favorites से हटाएं'
                    : 'Favorites में जोड़ें',
                onPressed: () async {
                  final updated =
                      await api.put('/api/members/${voter['_id']}', {
                    'isFavorite': voter['isFavorite'] != true,
                  });
                  voter['isFavorite'] = updated['isFavorite'] == true;
                  await OfflineVoterCache.merge([updated]);
                  onChanged();
                },
                icon: Icon(
                  voter['isFavorite'] == true
                      ? Icons.star_rounded
                      : Icons.star_border_rounded,
                  color: voter['isFavorite'] == true ? orange : muted,
                ),
              ),
            IconButton(
              tooltip: 'कॉल करें',
              onPressed:
                  mobile.isEmpty ? null : () => callNumber(context, mobile),
              style: IconButton.styleFrom(
                backgroundColor: const Color(0xffeaf8f0),
                foregroundColor: green,
              ),
              icon: const Icon(Icons.call_rounded, size: 20),
            ),
          ]),
        ),
      ),
    );
  }
}

class _MembershipBadge extends StatelessWidget {
  const _MembershipBadge({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        decoration: BoxDecoration(
            color: color.withValues(alpha: .10),
            borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            style: TextStyle(
                color: color, fontSize: 10, fontWeight: FontWeight.w800)),
      );
}

class _PhoneMessage extends StatelessWidget {
  const _PhoneMessage({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onRetry,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 18),
        child: Column(children: [
          Icon(icon, size: 48, color: blue),
          const SizedBox(height: 12),
          Text(title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: navy, fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(color: muted, fontSize: 12)),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('फिर कोशिश करें'),
          ),
        ]),
      );
}

class _SmartFilterDef {
  const _SmartFilterDef(this.field, this.label, this.icon);
  final String field;
  final String label;
  final IconData icon;
}

class _AlphabetFilterBar extends StatelessWidget {
  const _AlphabetFilterBar({required this.selected, required this.onChanged});

  final String selected;
  final ValueChanged<String> onChanged;

  static const english = <String>[
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
  ];

  static const hindi = <String>[
    'अ',
    'आ',
    'इ',
    'ई',
    'उ',
    'ऊ',
    'ए',
    'ऐ',
    'ओ',
    'औ',
    'क',
    'ख',
    'ग',
    'घ',
    'च',
    'छ',
    'ज',
    'झ',
    'ट',
    'ठ',
    'ड',
    'ढ',
    'ण',
    'त',
    'थ',
    'द',
    'ध',
    'न',
    'प',
    'फ',
    'ब',
    'भ',
    'म',
    'य',
    'र',
    'ल',
    'व',
    'श',
    'ष',
    'स',
    'ह',
  ];

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.sort_by_alpha_rounded, color: blue, size: 20),
            const SizedBox(width: 8),
            const Expanded(
              child: Text('Name starts with',
                  style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
            ),
            if (selected.isNotEmpty)
              TextButton(
                  onPressed: () => onChanged(''), child: const Text('All')),
          ]),
          const SizedBox(height: 6),
          _LetterScroller(
            letters: const ['', ...english, ...hindi],
            selected: selected,
            onChanged: onChanged,
          ),
        ]),
      );
}

class _LetterScroller extends StatelessWidget {
  const _LetterScroller({
    required this.letters,
    required this.selected,
    required this.onChanged,
  });

  final List<String> letters;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: letters
              .map((letter) => Padding(
                    padding: const EdgeInsets.only(right: 5),
                    child: ChoiceChip(
                      label: Text(letter.isEmpty ? 'All' : letter),
                      selected: selected == letter,
                      visualDensity: VisualDensity.compact,
                      onSelected: (_) =>
                          onChanged(selected == letter ? '' : letter),
                    ),
                  ))
              .toList(),
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
  });

  final String label;
  final IconData icon;
  final String? value;
  final VoidCallback onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final selected = value != null && value!.trim().isNotEmpty;
    return SizedBox(
      width: MediaQuery.sizeOf(context).width < 420 ? double.infinity : 205,
      child: Material(
        color: selected ? const Color(0xffedf4ff) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(13),
          side: BorderSide(color: selected ? blue : border),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(13),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
            child: Row(children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: selected ? blue.withValues(alpha: .11) : softBlue,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, color: selected ? blue : muted, size: 19),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label,
                          style: const TextStyle(color: muted, fontSize: 10)),
                      const SizedBox(height: 2),
                      Text(selected ? value! : 'Database से चुनें',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              color: selected ? navy : muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w900)),
                    ]),
              ),
              if (selected)
                IconButton(
                  tooltip: 'हटाएँ',
                  visualDensity: VisualDensity.compact,
                  onPressed: onClear,
                  icon: const Icon(Icons.close_rounded, size: 18),
                )
              else
                const Icon(Icons.arrow_drop_down_rounded, color: muted),
            ]),
          ),
        ),
      ),
    );
  }
}

String _sectionMergeKey(String value) => value
    .toLowerCase()
    .replaceAll(RegExp(r'[ऀ-ःऺ-्॑-ॗॢॣ]'), '')
    .replaceAll(RegExp(r'[^a-z0-9ऀ-ॿ]'), '');

int _sectionNameDistance(String left, String right) {
  final a = left.runes.toList();
  final b = right.runes.toList();
  var previous = List<int>.generate(b.length + 1, (index) => index);
  for (var row = 1; row <= a.length; row++) {
    final current = <int>[row];
    for (var column = 1; column <= b.length; column++) {
      current.add([
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] == b[column - 1] ? 0 : 1),
      ].reduce((left, right) => left < right ? left : right));
    }
    previous = current;
  }
  return previous[b.length];
}

bool _matchingSectionNames(String leftValue, String rightValue) {
  final left = _sectionMergeKey(leftValue);
  final right = _sectionMergeKey(rightValue);
  if (left.length < 3 || right.length < 3) return false;
  final numberPattern = RegExp(r'd+');
  final leftNumbers = numberPattern
      .allMatches(leftValue)
      .map((match) => match.group(0))
      .toList();
  final rightNumbers = numberPattern
      .allMatches(rightValue)
      .map((match) => match.group(0))
      .toList();
  if (leftNumbers.isNotEmpty &&
      rightNumbers.isNotEmpty &&
      leftNumbers.join('|') != rightNumbers.join('|')) {
    return false;
  }
  if (left == right) return true;
  final longest = left.length > right.length ? left.length : right.length;
  final shortest = left.length < right.length ? left.length : right.length;
  if ((left.contains(right) || right.contains(left)) &&
      shortest / longest >= .72) {
    return true;
  }
  final allowedDistance = (longest * .18).floor();
  return _sectionNameDistance(left, right) <
      (allowedDistance < 1 ? 2 : allowedDistance + 1);
}

class _FilterOption {
  const _FilterOption({
    required this.label,
    required this.count,
    required this.filters,
  });

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
  final selectedForMerge = <String>{};
  bool mergeMode = false;
  bool merging = false;

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> mergeSelectedSections(List<_FilterOption> options) async {
    if (selectedForMerge.length != 2 || merging) return;
    final selected = options
        .where((option) => selectedForMerge.contains(option.label))
        .toList();
    if (selected.length != 2) return;
    if (!_matchingSectionNames(selected[0].label, selected[1].label)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('केवल मिलते-जुलते अनुभाग नाम merge किए जा सकते हैं।'),
        ),
      );
      return;
    }
    final targetLabel = await showDialog<String>(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: const Text('कौन-सा अनुभाग नाम रखना है?'),
        children: [
          for (final option in selected)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(dialogContext, option.label),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.check_circle_rounded, color: green),
                title: Text(option.label,
                    style: const TextStyle(
                        color: navy, fontWeight: FontWeight.w900)),
                subtitle: Text('${option.count} मतदाता'),
              ),
            ),
          const Divider(height: 1),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('रद्द करें'),
          ),
        ],
      ),
    );
    if (targetLabel == null || !mounted) return;
    final sourceOption =
        selected.firstWhere((option) => option.label != targetLabel);
    const allowed = {
      'assemblyNumber',
      'assemblyName',
      'gramPanchayat',
      'village',
      'partNumber',
      'sectionNumber',
      'sectionName'
    };
    final source = <String, String>{};
    for (final entry in widget.currentFilters.entries) {
      final value = entry.value?.trim() ?? '';
      if (allowed.contains(entry.key) && value.isNotEmpty) {
        source[entry.key] = value;
      }
    }
    source
      ..remove('sectionName')
      ..addAll(sourceOption.filters);
    setState(() => merging = true);
    try {
      final preview = await api.post('/api/members/bulk-location-correction', {
        'dryRun': true,
        'mergeMatchingOnly': true,
        'source': source,
        'updates': {'sectionName': targetLabel},
      });
      if (!mounted) return;
      final count = (preview['matched'] as num?)?.toInt() ?? 0;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Merge confirm करें?'),
          content: Text(
            '${sourceOption.label} के $count voters को $targetLabel में merge किया जाएगा।',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('रद्द करें'),
            ),
            FilledButton.icon(
              onPressed:
                  count == 0 ? null : () => Navigator.pop(dialogContext, true),
              icon: const Icon(Icons.merge_rounded),
              label: const Text('Merge करें'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      final result = await api.post('/api/members/bulk-location-correction', {
        'dryRun': false,
        'mergeMatchingOnly': true,
        'source': source,
        'updates': {'sectionName': targetLabel},
      });
      if (!mounted) return;
      final updated = result['updated'] ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$updated voters merge हो गए।'),
          backgroundColor: green,
        ),
      );
      setState(() {
        selectedForMerge.clear();
        mergeMode = false;
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => merging = false);
    }
  }

  Future<void> mergeSectionOption(_FilterOption option) async {
    final targetFilters = Map<String, String?>.from(widget.currentFilters)
      ..remove('q')
      ..remove('qMode');
    List<_FilterOption> available;
    try {
      final response = await api.getQuery('/api/members/filter-options', {
        ...targetFilters,
        'field': 'section',
        'q': '',
        'limit': '160',
      });
      available = List<Map<String, dynamic>>.from(
        (response['items'] as List? ?? const [])
            .map((item) => Map<String, dynamic>.from(item)),
      ).map(_FilterOption.fromMap).toList();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
      return;
    }
    if (!mounted) return;
    final targets = available
        .where((item) => item.label.trim() != option.label.trim())
        .toList();
    if (targets.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Merge करने के लिए दूसरा अनुभाग नहीं मिला।')),
      );
      return;
    }
    final next = await showDialog<String>(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: Text('“${option.label}” को किसमें merge करें?'),
        children: [
          for (final target in targets)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(dialogContext, target.label),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.merge_rounded, color: green),
                title: Text(target.label,
                    style: const TextStyle(
                        color: navy, fontWeight: FontWeight.w900)),
                subtitle: Text('${target.count} मतदाता'),
              ),
            ),
          const Divider(height: 1),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('रद्द करें'),
          ),
        ],
      ),
    );
    if (next == null || next.isEmpty || next == option.label || !mounted) {
      return;
    }
    const allowed = {
      'assemblyNumber',
      'assemblyName',
      'gramPanchayat',
      'village',
      'partNumber',
      'sectionNumber',
      'sectionName'
    };
    final source = <String, String>{};
    for (final entry in widget.currentFilters.entries) {
      final value = entry.value?.trim() ?? '';
      if (allowed.contains(entry.key) && value.isNotEmpty) {
        source[entry.key] = value;
      }
    }
    source.addAll(option.filters);
    try {
      final preview = await api.post('/api/members/bulk-location-correction', {
        'dryRun': true,
        'source': source,
        'updates': {'sectionName': next},
      });
      if (!mounted) return;
      final count = (preview['matched'] as num?)?.toInt() ?? 0;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Merge confirm करें?'),
          content: Text(
              '$count voters में “${option.label}” को “$next” किया जाएगा। यह बदलाव filters, booth hierarchy और family pages में भी लागू होगा।'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('रद्द करें'),
            ),
            FilledButton(
              onPressed:
                  count == 0 ? null : () => Navigator.pop(dialogContext, true),
              child: const Text('Merge करें'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      final result = await api.post('/api/members/bulk-location-correction', {
        'dryRun': false,
        'source': source,
        'updates': {'sectionName': next},
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content:
            Text('${result['updated'] ?? 0} voters का अनुभाग merge हो गया।'),
      ));
      setState(() {});
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', '')),
      ));
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        titlePadding: const EdgeInsets.fromLTRB(20, 18, 12, 8),
        contentPadding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        title: Row(children: [
          Expanded(
            child: Text('${widget.title} चुनें',
                style:
                    const TextStyle(color: navy, fontWeight: FontWeight.w900)),
          ),
          if (widget.field == 'section' && api.user?['role'] == 'admin')
            TextButton.icon(
              onPressed: merging
                  ? null
                  : () => setState(() {
                        mergeMode = !mergeMode;
                        selectedForMerge.clear();
                      }),
              icon: Icon(mergeMode ? Icons.close_rounded : Icons.merge_rounded),
              label: Text(mergeMode ? 'बंद करें' : 'Merge'),
            ),
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close_rounded),
          ),
        ]),
        content: SizedBox(
          width: 540,
          height: MediaQuery.sizeOf(context).height * .72,
          child: Column(children: [
            TextField(
              controller: search,
              autofocus: true,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search_rounded),
                hintText: '${widget.title} search करें...',
                suffixIcon: search.text.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          search.clear();
                          setState(() {});
                        },
                        icon: const Icon(Icons.close_rounded),
                      ),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                future: api.getQuery('/api/members/filter-options', {
                  ...widget.currentFilters,
                  'field': widget.field,
                  'q': search.text.trim(),
                  'limit': '160',
                }),
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(
                      child: Text('${snapshot.error}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.red)),
                    );
                  }
                  final options = List<Map<String, dynamic>>.from(
                    (snapshot.data?['items'] as List? ?? [])
                        .map((item) => Map<String, dynamic>.from(item)),
                  ).map(_FilterOption.fromMap).toList();
                  if (options.isEmpty) {
                    return const EmptyIllustration(
                      icon: Icons.search_off_rounded,
                      title: 'Matching option नहीं मिला',
                      subtitle:
                          'थोड़ा अलग शब्द type करें या manual filter use करें',
                    );
                  }
                  final selectedOptions = options
                      .where(
                          (option) => selectedForMerge.contains(option.label))
                      .toList();
                  final namesMatch = selectedOptions.length == 2 &&
                      _matchingSectionNames(
                        selectedOptions[0].label,
                        selectedOptions[1].label,
                      );
                  return Column(children: [
                    if (mergeMode)
                      Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: softBlue,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: border),
                        ),
                        child: Row(children: [
                          Expanded(
                            child: Text(
                              selectedOptions.length == 2 && !namesMatch
                                  ? 'नाम match नहीं करते'
                                  : '${selectedForMerge.length}/2 अनुभाग चुने गए',
                              style: TextStyle(
                                color:
                                    selectedOptions.length == 2 && !namesMatch
                                        ? Colors.red
                                        : navy,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          if (merging)
                            const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          else
                            FilledButton.icon(
                              onPressed: namesMatch
                                  ? () => mergeSelectedSections(options)
                                  : null,
                              icon: const Icon(Icons.merge_rounded, size: 18),
                              label: const Text('Merge करें'),
                            ),
                        ]),
                      ),
                    Expanded(
                      child: ListView.separated(
                        itemCount: options.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, index) {
                          final option = options[index];
                          final selected =
                              selectedForMerge.contains(option.label);
                          void selectForMerge() {
                            if (selected) {
                              setState(
                                  () => selectedForMerge.remove(option.label));
                            } else if (selectedForMerge.length < 2) {
                              setState(
                                  () => selectedForMerge.add(option.label));
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content:
                                      Text('Merge के लिए केवल 2 अनुभाग चुनें।'),
                                ),
                              );
                            }
                          }

                          return ListTile(
                            leading: mergeMode
                                ? Checkbox(
                                    value: selected,
                                    onChanged: merging
                                        ? null
                                        : (_) => selectForMerge(),
                                  )
                                : CircleAvatar(
                                    backgroundColor: softBlue,
                                    child: Text('${index + 1}',
                                        style: const TextStyle(
                                            color: blue,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w900)),
                                  ),
                            title: Text(option.label,
                                style: const TextStyle(
                                    color: navy, fontWeight: FontWeight.w900)),
                            subtitle: Text('${option.count} मतदाता'),
                            trailing: mergeMode
                                ? null
                                : const Icon(Icons.chevron_right_rounded),
                            onTap: merging
                                ? null
                                : mergeMode
                                    ? selectForMerge
                                    : () => Navigator.pop(context, option),
                          );
                        },
                      ),
                    ),
                  ]);
                },
              ),
            ),
          ]),
        ),
      );
}

class _SearchFilter extends StatelessWidget {
  const _SearchFilter(
      {required this.controller,
      required this.label,
      required this.icon,
      required this.onChanged,
      this.onPick,
      this.enabled = true});
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final ValueChanged<String> onChanged;
  final VoidCallback? onPick;
  final bool enabled;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 220,
        child: TextField(
          controller: controller,
          enabled: enabled,
          onChanged: onChanged,
          decoration: InputDecoration(
            labelText: label,
            prefixIcon: Icon(icon, size: 20),
            suffixIcon: Row(mainAxisSize: MainAxisSize.min, children: [
              if (onPick != null)
                IconButton(
                  tooltip: 'List से चुनें',
                  onPressed: onPick,
                  icon: const Icon(Icons.list_alt_rounded, size: 18),
                ),
              if (controller.text.isNotEmpty)
                IconButton(
                  tooltip: 'साफ करें',
                  onPressed: () {
                    controller.clear();
                    onChanged('');
                  },
                  icon: const Icon(Icons.close, size: 18),
                ),
            ]),
          ),
        ),
      );
}

class _FilterDropdown extends StatelessWidget {
  const _FilterDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String value;
  final Map<String, String> items;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 180,
        child: DropdownButtonFormField<String>(
          key: ValueKey('$label-$value'),
          initialValue: value,
          decoration: InputDecoration(labelText: label),
          items: items.entries
              .map((entry) =>
                  DropdownMenuItem(value: entry.key, child: Text(entry.value)))
              .toList(),
          onChanged: (next) => onChanged(next ?? ''),
        ),
      );
}

class _PrintOptions {
  const _PrintOptions({
    required this.fields,
    required this.columns,
    required this.photo,
    required this.paperSize,
    required this.orientation,
  });

  final Set<String> fields;
  final int columns;
  final bool photo;
  final String paperSize;
  final String orientation;
}

class _LocationCorrectionDialog extends StatefulWidget {
  const _LocationCorrectionDialog();

  @override
  State<_LocationCorrectionDialog> createState() =>
      _LocationCorrectionDialogState();
}

class _LocationCorrectionDialogState extends State<_LocationCorrectionDialog> {
  final smartQuery = TextEditingController();
  final sourceAssemblyNumber = TextEditingController();
  final sourceAssemblyName = TextEditingController();
  final sourceGramPanchayat = TextEditingController();
  final sourceVillage = TextEditingController();
  final sourcePartNumber = TextEditingController();
  final sourceSectionNumber = TextEditingController();
  final sourceSectionName = TextEditingController();

  final newAssemblyNumber = TextEditingController();
  final newAssemblyName = TextEditingController();
  final newGramPanchayat = TextEditingController();
  final newVillage = TextEditingController();
  final newPartNumber = TextEditingController();
  final newTehsil = TextEditingController();
  final newSectionNumber = TextEditingController();
  final newSectionName = TextEditingController();

  bool loading = false;
  bool advancedMode = false;
  Timer? previewDebounce;
  int? matched;
  List<Map<String, dynamic>> sample = const [];
  String? error;

  Map<String, String> get source => {
        if (!advancedMode) 'smartQuery': smartQuery.text.trim(),
        'assemblyNumber': sourceAssemblyNumber.text.trim(),
        'assemblyName': sourceAssemblyName.text.trim(),
        'gramPanchayat': sourceGramPanchayat.text.trim(),
        'village': sourceVillage.text.trim(),
        'partNumber': sourcePartNumber.text.trim(),
        'sectionNumber': sourceSectionNumber.text.trim(),
        'sectionName': sourceSectionName.text.trim(),
      }..removeWhere((_, value) => value.isEmpty);

  Map<String, String> get updates => {
        'assemblyNumber': newAssemblyNumber.text.trim(),
        'assemblyName': newAssemblyName.text.trim(),
        'gramPanchayat': newGramPanchayat.text.trim(),
        'village': newVillage.text.trim(),
        'partNumber': newPartNumber.text.trim(),
        'tehsil': newTehsil.text.trim(),
        'sectionNumber': newSectionNumber.text.trim(),
        'sectionName': newSectionName.text.trim(),
      }..removeWhere((_, value) => value.isEmpty);

  bool get validSource {
    final hasLocationKey = sourceVillage.text.trim().isNotEmpty ||
        sourceSectionName.text.trim().isNotEmpty;
    return advancedMode
        ? hasLocationKey && source.length >= 2
        : smartQuery.text.trim().length >= 2 ||
            (hasLocationKey && source.length >= 2);
  }

  int get step {
    if (matched != null) return 3;
    if (updates.isNotEmpty && validSource) return 2;
    if (validSource) return 1;
    return 0;
  }

  void clearPreview() {
    matched = null;
    sample = const [];
  }

  void schedulePreview() {
    previewDebounce?.cancel();
    if (!validSource) return;
    previewDebounce = Timer(const Duration(milliseconds: 550), () {
      if (mounted) preview(silent: true);
    });
  }

  Future<void> chooseSourceFromDatabase() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await api.getQuery('/api/members/location-groups', {
        'limit': '300',
      });
      final items = List<Map<String, dynamic>>.from(
        (res['items'] as List? ?? const []).map(
          (item) => Map<String, dynamic>.from(item),
        ),
      );
      if (!mounted) return;
      final selected = await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (_) => _LocationGroupPicker(items: items),
      );
      if (selected == null) return;
      final key = Map<String, dynamic>.from(selected['key'] as Map? ?? {});
      setState(() {
        advancedMode = true;
        sourceAssemblyNumber.text = "${key['assemblyNumber'] ?? ''}";
        sourceAssemblyName.text = "${key['assemblyName'] ?? ''}";
        sourceGramPanchayat.text = "${key['gramPanchayat'] ?? ''}";
        sourceVillage.text = "${key['village'] ?? ''}";
        sourcePartNumber.text = "${key['partNumber'] ?? ''}";
        sourceSectionNumber.text = "${key['sectionNumber'] ?? ''}";
        sourceSectionName.text = "${key['sectionName'] ?? ''}";
        newAssemblyNumber.text = sourceAssemblyNumber.text;
        newAssemblyName.text = sourceAssemblyName.text;
        newGramPanchayat.text = sourceGramPanchayat.text;
        newVillage.text = sourceVillage.text;
        newPartNumber.text = sourcePartNumber.text;
        newSectionNumber.text = sourceSectionNumber.text;
        newSectionName.text = sourceSectionName.text;
        clearPreview();
      });
    } catch (e) {
      setState(() => error = '$e'.replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> preview({bool silent = false}) async {
    if (!validSource) {
      if (!silent) {
        setState(() => error = advancedMode
            ? 'Source में गाँव या अनुभाग के साथ विधानसभा/पंचायत/भाग में से एक और value भरें।'
            : 'Old/wrong info me kam se kam 2 letters likhein, jaise sahara bheeta ya Hier.');
      }
      return;
    }
    setState(() {
      loading = true;
      error = null;
      matched = null;
      sample = const [];
    });
    try {
      final res = await api.post('/api/members/bulk-location-correction', {
        'dryRun': true,
        'source': source,
        'updates': updates,
      });
      setState(() {
        matched = res['matched'] as int? ?? 0;
        sample = List<Map<String, dynamic>>.from(
          (res['sample'] as List? ?? const []).map(
            (item) => Map<String, dynamic>.from(item),
          ),
        );
      });
    } catch (e) {
      setState(() => error = '$e'.replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> apply() async {
    if ((matched ?? 0) < 1) return;
    if (updates.isEmpty) {
      setState(
          () => error = 'Correct location me kam se kam ek field bharein.');
      return;
    }
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Correction apply karein?'),
        content: Text(
            '$matched voters update honge. Same value fields ignore honge, blank new fields old value rakhenge.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Apply')),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await api.post('/api/members/bulk-location-correction', {
        'dryRun': false,
        'source': source,
        'updates': updates,
      });
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['noChange'] == true
            ? 'Koi naya badlav nahi mila.'
            : "${res['updated'] ?? 0} voters ki location update ho gayi."),
      ));
    } catch (e) {
      setState(() => error = '$e'.replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    for (final controller in [
      smartQuery,
      sourceAssemblyNumber,
      sourceAssemblyName,
      sourceGramPanchayat,
      sourceVillage,
      sourcePartNumber,
      sourceSectionNumber,
      sourceSectionName,
      newAssemblyNumber,
      newAssemblyName,
      newGramPanchayat,
      newVillage,
      newPartNumber,
      newTehsil,
      newSectionNumber,
      newSectionName,
    ]) {
      controller.dispose();
    }
    previewDebounce?.cancel();
    super.dispose();
  }

  Widget input(TextEditingController controller, String label, IconData icon,
          {String? hint, bool sourceField = false}) =>
      TextField(
        controller: controller,
        onChanged: (_) => setState(() {
          clearPreview();
          if (sourceField && !advancedMode) schedulePreview();
        }),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icon),
          filled: true,
          fillColor: const Color(0xfff7f9ff),
        ),
      );

  Widget stepPill(int number, String label) {
    final active = step >= number;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: active ? blue : const Color(0xffeef3ff),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(children: [
          Text('$number',
              style: TextStyle(
                  color: active ? Colors.white : navy,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: active ? Colors.white : muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w800)),
        ]),
      ),
    );
  }

  Widget card(
          {required String title,
          required IconData icon,
          required Widget child,
          String? subtitle,
          Color color = blue}) =>
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: border),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0c071b4b), blurRadius: 18, offset: Offset(0, 8))
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            CircleAvatar(
                backgroundColor: color.withValues(alpha: .10),
                child: Icon(icon, color: color)),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(title,
                      style: const TextStyle(
                          color: navy,
                          fontSize: 18,
                          fontWeight: FontWeight.w900)),
                  if (subtitle != null) ...[
                    const SizedBox(height: 3),
                    Text(subtitle,
                        style: const TextStyle(
                            color: muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                  ],
                ])),
          ]),
          const SizedBox(height: 14),
          child,
        ]),
      );

  Widget comparisonTable() {
    const labels = {
      'assemblyNumber': 'Assembly number',
      'assemblyName': 'Assembly name',
      'gramPanchayat': 'Gram panchayat',
      'village': 'Village',
      'partNumber': 'Part / Booth',
      'sectionNumber': 'Section number',
      'sectionName': 'Section / Mohalla',
      'tehsil': 'Tehsil',
    };
    String oldValue(String key) => source[key] ?? 'Blank';
    String newValue(String key) => updates[key] ?? oldValue(key);
    final rows = labels.entries
        .where((entry) =>
            updates.containsKey(entry.key) || source.containsKey(entry.key))
        .toList();
    if (rows.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Old vs New preview',
          style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
      const SizedBox(height: 8),
      ...rows.map((entry) {
        final oldText = oldValue(entry.key);
        final newText = newValue(entry.key);
        final changed = oldText != newText;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: changed ? const Color(0xfff0fff6) : const Color(0xfff7f9ff),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
                color: changed ? green.withValues(alpha: .25) : border),
          ),
          child: Row(children: [
            Expanded(
                child: Text(entry.value,
                    style: const TextStyle(
                        color: navy, fontWeight: FontWeight.w900))),
            Expanded(
                child: Text(oldText,
                    style: const TextStyle(
                        color: muted, fontWeight: FontWeight.w700))),
            const Icon(Icons.arrow_forward_rounded, color: muted, size: 18),
            Expanded(
                child: Text(newText,
                    style: TextStyle(
                        color: changed ? green : muted,
                        fontWeight: FontWeight.w900))),
          ]),
        );
      }),
    ]);
  }

  Widget samplePreview() {
    if (matched == null) {
      return const Text(
          'Preview dabane par matched voters, sample aur current values yahan dikhenge.',
          style: TextStyle(color: muted, fontWeight: FontWeight.w700));
    }
    final currentVillages = sample
        .map((v) => "${v['village'] ?? ''}".trim())
        .where((v) => v.isNotEmpty)
        .toSet()
        .take(4)
        .join(', ');
    final currentPanchayats = sample
        .map((v) => "${v['gramPanchayat'] ?? ''}".trim())
        .where((v) => v.isNotEmpty)
        .toSet()
        .take(4)
        .join(', ');
    final currentParts = sample
        .map((v) => "${v['partNumber'] ?? ''}".trim())
        .where((v) => v.isNotEmpty)
        .toSet()
        .take(4)
        .join(', ');
    final currentSections = sample
        .map((v) => "${v['sectionName'] ?? ''}".trim())
        .where((v) => v.isNotEmpty)
        .toSet()
        .take(4)
        .join(', ');
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: softBlue,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: blue.withValues(alpha: .18))),
        child: Text('$matched voters found',
            style: const TextStyle(
                color: navy, fontSize: 20, fontWeight: FontWeight.w900)),
      ),
      const SizedBox(height: 10),
      if (sample.isNotEmpty) ...[
        Wrap(spacing: 8, runSpacing: 8, children: [
          Chip(
              label: Text(
                  "Village: ${currentVillages.isEmpty ? 'Blank' : currentVillages}")),
          Chip(
              label: Text(
                  "Panchayat: ${currentPanchayats.isEmpty ? 'Blank' : currentPanchayats}")),
          Chip(
              label: Text(
                  "Part: ${currentParts.isEmpty ? 'Blank' : currentParts}")),
          Chip(
              label: Text(
                  "Section: ${currentSections.isEmpty ? 'Blank' : currentSections}")),
        ]),
        const SizedBox(height: 10),
        ...sample.take(5).map((voter) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: const Color(0xfff7f9ff),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: border)),
              child: Row(children: [
                const CircleAvatar(
                    backgroundColor: softBlue,
                    child: Icon(Icons.person_rounded, color: blue)),
                const SizedBox(width: 10),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text("${voter['name'] ?? '-'}",
                          style: const TextStyle(
                              color: navy, fontWeight: FontWeight.w900)),
                      Text(
                          "EPIC ${voter['voterId'] ?? '-'} • घर ${voter['houseNumber'] ?? '-'}",
                          style: const TextStyle(color: muted, fontSize: 12)),
                    ])),
              ]),
            )),
      ],
      if (source.length < 3)
        Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: const Color(0xfffff7ed),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: orange.withValues(alpha: .28))),
          child: const Text(
              'Warning: Village alone is not unique. If result is large, add panchayat/part/assembly too.',
              style: TextStyle(color: navy, fontWeight: FontWeight.w800)),
        ),
    ]);
  }

  @override
  Widget build(BuildContext context) => Dialog.fullscreen(
        child: Scaffold(
          backgroundColor: bg,
          appBar: AppBar(
            title: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Location Master + Bulk Correction'),
                  SizedBox(height: 2),
                  Text('Safely fix wrong OCR location',
                      style: TextStyle(color: muted, fontSize: 12)),
                ]),
            actions: [
              IconButton(
                  onPressed:
                      loading ? null : () => Navigator.pop(context, false),
                  icon: const Icon(Icons.close_rounded))
            ],
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          gradient: const LinearGradient(
                              colors: [Color(0xff1457f5), Color(0xff2188ff)]),
                          borderRadius: BorderRadius.circular(24)),
                      child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.location_on_rounded,
                                color: Colors.white, size: 34),
                            SizedBox(height: 10),
                            Text('Village alone is not unique',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900)),
                            SizedBox(height: 6),
                            Text(
                                'Best key = Assembly + Village + Part + Section/Mohalla',
                                style: TextStyle(
                                    color: Colors.white70,
                                    fontWeight: FontWeight.w700)),
                          ]),
                    ),
                    const SizedBox(height: 12),
                    Row(children: [
                      stepPill(1, 'Old info'),
                      const SizedBox(width: 8),
                      stepPill(2, 'Correct'),
                      const SizedBox(width: 8),
                      stepPill(3, 'Preview')
                    ]),
                    const SizedBox(height: 14),
                    card(
                      title: '1. Search old / wrong info',
                      subtitle: 'Example: sahara bheeta, Hier, bheeta 47',
                      icon: Icons.search_rounded,
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SegmentedButton<bool>(
                              segments: const [
                                ButtonSegment(
                                    value: false,
                                    icon: Icon(Icons.auto_fix_high_rounded),
                                    label: Text('Smart Fix')),
                                ButtonSegment(
                                    value: true,
                                    icon: Icon(Icons.vpn_key_rounded),
                                    label: Text('Safe Key')),
                              ],
                              selected: {advancedMode},
                              onSelectionChanged: (value) => setState(() {
                                advancedMode = value.first;
                                error = null;
                                clearPreview();
                              }),
                            ),
                            const SizedBox(height: 12),
                            if (!advancedMode)
                              input(smartQuery, 'Old search text',
                                  Icons.search_rounded,
                                  hint: 'sahara bheeta / Hier / bheeta',
                                  sourceField: true)
                            else ...[
                              SizedBox(
                                  width: double.infinity,
                                  child: FilledButton.icon(
                                      onPressed: loading
                                          ? null
                                          : chooseSourceFromDatabase,
                                      icon: const Icon(Icons.dataset_rounded),
                                      label: const Text(
                                          'Choose location from database'))),
                              const SizedBox(height: 12),
                              input(sourceAssemblyNumber, 'Assembly number',
                                  Icons.account_balance_outlined,
                                  sourceField: true),
                              const SizedBox(height: 10),
                              input(sourceGramPanchayat, 'Gram panchayat',
                                  Icons.holiday_village_outlined,
                                  sourceField: true),
                              const SizedBox(height: 10),
                              input(sourceVillage, 'Village / OCR text *',
                                  Icons.location_city_rounded,
                                  sourceField: true),
                              const SizedBox(height: 10),
                              input(sourcePartNumber, 'Part / Booth',
                                  Icons.how_to_vote_rounded,
                                  sourceField: true),
                              const SizedBox(height: 10),
                              input(sourceSectionNumber, 'Section number',
                                  Icons.format_list_numbered_rounded,
                                  sourceField: true),
                              const SizedBox(height: 10),
                              input(sourceSectionName, 'Section / Mohalla name',
                                  Icons.location_on_outlined,
                                  sourceField: true),
                              const SizedBox(height: 10),
                              input(sourceAssemblyName, 'Assembly name',
                                  Icons.account_balance_rounded,
                                  sourceField: true),
                            ],
                          ]),
                    ),
                    card(
                      title: '2. Fill correct information',
                      subtitle:
                          'Fill only fields you want to change/add. Same value is allowed.',
                      icon: Icons.edit_location_alt_rounded,
                      color: green,
                      child: Column(children: [
                        input(newGramPanchayat, 'New gram panchayat',
                            Icons.holiday_village_outlined),
                        const SizedBox(height: 10),
                        input(newVillage, 'New village',
                            Icons.location_city_rounded),
                        const SizedBox(height: 10),
                        input(newPartNumber, 'New part / booth',
                            Icons.how_to_vote_rounded),
                        const SizedBox(height: 10),
                        input(newSectionNumber, 'New section number',
                            Icons.format_list_numbered_rounded),
                        const SizedBox(height: 10),
                        input(newSectionName, 'New section / Mohalla name',
                            Icons.location_on_outlined),
                        const SizedBox(height: 10),
                        input(newTehsil, 'New tehsil / block',
                            Icons.apartment_rounded),
                        const SizedBox(height: 10),
                        input(newAssemblyNumber, 'New assembly number',
                            Icons.account_balance_outlined),
                        const SizedBox(height: 10),
                        input(newAssemblyName, 'New assembly name',
                            Icons.account_balance_rounded),
                        const SizedBox(height: 14),
                        comparisonTable(),
                      ]),
                    ),
                    if (error != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            color: const Color(0xfffff1f2),
                            borderRadius: BorderRadius.circular(16),
                            border:
                                Border.all(color: rose.withValues(alpha: .22))),
                        child: Text(error!,
                            style: const TextStyle(
                                color: rose, fontWeight: FontWeight.w900)),
                      ),
                    card(
                        title: '3. Preview affected voters',
                        subtitle: 'Check count and sample before Apply.',
                        icon: Icons.visibility_rounded,
                        color: purple,
                        child: samplePreview()),
                  ]),
            ),
          ),
          bottomNavigationBar: SafeArea(
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
              decoration: const BoxDecoration(color: Colors.white, boxShadow: [
                BoxShadow(
                    color: Color(0x14071b4b),
                    blurRadius: 18,
                    offset: Offset(0, -8))
              ]),
              child: Row(children: [
                Expanded(
                    child: OutlinedButton.icon(
                        onPressed: loading ? null : () => preview(),
                        icon: loading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.visibility_outlined),
                        label: const Text('Preview'))),
                const SizedBox(width: 10),
                Expanded(
                    child: FilledButton.icon(
                        onPressed: loading || matched == null || matched == 0
                            ? null
                            : apply,
                        icon: const Icon(Icons.done_all_rounded),
                        label: const Text('Apply correction'))),
              ]),
            ),
          ),
        ),
      );
}

class _LocationGroupPicker extends StatefulWidget {
  const _LocationGroupPicker({required this.items});
  final List<Map<String, dynamic>> items;

  @override
  State<_LocationGroupPicker> createState() => _LocationGroupPickerState();
}

class _LocationGroupPickerState extends State<_LocationGroupPicker> {
  String q = '';

  @override
  Widget build(BuildContext context) {
    final query = q.toLowerCase();
    final items = widget.items.where((item) {
      final label = "${item['label'] ?? ''}".toLowerCase();
      return query.isEmpty || label.contains(query);
    }).toList();
    return AlertDialog(
      title: const Text('Choose source location'),
      content: SizedBox(
        width: 620,
        height: 560,
        child: Column(children: [
          TextField(
            onChanged: (value) => setState(() => q = value),
            decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search_rounded),
                hintText: 'Search village, panchayat, assembly or part...'),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: items.isEmpty
                ? const Center(child: Text('No location group found'))
                : ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, index) {
                      final item = items[index];
                      final count = item['count'] ?? 0;
                      return InkWell(
                        onTap: () => Navigator.pop(context, item),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: border)),
                          child: Row(children: [
                            const CircleAvatar(
                                backgroundColor: softBlue,
                                child: Icon(Icons.location_on_rounded,
                                    color: blue)),
                            const SizedBox(width: 12),
                            Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Text("${item['label'] ?? '-'}",
                                      style: const TextStyle(
                                          color: navy,
                                          fontWeight: FontWeight.w900)),
                                  const SizedBox(height: 3),
                                  Text('$count voters',
                                      style: const TextStyle(
                                          color: muted, fontSize: 12)),
                                ])),
                            const Icon(Icons.chevron_right_rounded,
                                color: muted),
                          ]),
                        ),
                      );
                    },
                  ),
          ),
        ]),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context), child: const Text('Close'))
      ],
    );
  }
}

class _PrintOptionsDialog extends StatefulWidget {
  const _PrintOptionsDialog({required this.selectedCount});
  final int selectedCount;

  @override
  State<_PrintOptionsDialog> createState() => _PrintOptionsDialogState();
}

class _PrintOptionsDialogState extends State<_PrintOptionsDialog> {
  static const availableFields = <String, String>{
    'name': 'Name',
    'voterId': 'EPIC',
    'mobile': 'Mobile',
    'altMobile': 'Alt mobile',
    'guardianName': 'Father / Husband',
    'relationType': 'Relation',
    'age': 'Age',
    'gender': 'Gender',
    'houseNumber': 'House No.',
    'address': 'Address',
    'village': 'Village',
    'gramPanchayat': 'Gram Panchayat',
    'tehsil': 'Tehsil',
    'municipality': 'Municipality',
    'caste': 'Caste',
    'subCaste': 'Sub caste',
    'occupation': 'Occupation',
    'education': 'Education',
    'organizationPost': 'Org Post',
    'supportLevel': 'Support',
    'assembly': 'Assembly',
    'partNumber': 'Part / Booth',
    'section': 'Section',
    'booth': 'Booth',
    'ward': 'Ward',
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
    'identity': 'Identity',
    'contact': 'Contact',
    'location': 'Location',
    'profile': 'Profile',
  };

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
  int columns = 2;
  bool photo = true;
  String paperSize = 'A4';
  String orientation = 'portrait';
  String fieldCategory = 'identity';

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: Text(widget.selectedCount > 0
            ? 'Print ${widget.selectedCount} selected voters'
            : 'Print filtered voters'),
        content: SizedBox(
          width: 650,
          child: SingleChildScrollView(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Printed details',
                  style: TextStyle(fontWeight: FontWeight.w900, color: navy)),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: fieldCategoryLabels.entries
                      .map((entry) => Padding(
                            padding: const EdgeInsets.only(right: 7),
                            child: ChoiceChip(
                              label: Text(entry.value),
                              selected: fieldCategory == entry.key,
                              visualDensity: VisualDensity.compact,
                              onSelected: (_) =>
                                  setState(() => fieldCategory = entry.key),
                            ),
                          ))
                      .toList(),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xfff7f9fd),
                  border: Border.all(color: border),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: (fieldCategories[fieldCategory] ?? const <String>[])
                      .map((field) => FilterChip(
                            label: Text(availableFields[field] ?? field),
                            selected: selectedFields.contains(field),
                            visualDensity: VisualDensity.compact,
                            onSelected: (selected) => setState(() {
                              if (selected) {
                                selectedFields.add(field);
                              } else {
                                selectedFields.remove(field);
                              }
                            }),
                          ))
                      .toList(),
                ),
              ),
              const SizedBox(height: 8),
              Text('${selectedFields.length} fields selected',
                  style: const TextStyle(color: muted, fontSize: 12)),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: selectedFields
                      .take(6)
                      .map((field) => Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: InputChip(
                              label: Text(availableFields[field] ?? field),
                              visualDensity: VisualDensity.compact,
                              onDeleted: () =>
                                  setState(() => selectedFields.remove(field)),
                            ),
                          ))
                      .toList(),
                ),
              ),
              const Divider(height: 28),
              Wrap(spacing: 12, runSpacing: 12, children: [
                SizedBox(
                  width: 150,
                  child: DropdownButtonFormField<int>(
                    initialValue: columns,
                    decoration: const InputDecoration(labelText: 'Cards / row'),
                    items: const [
                      DropdownMenuItem(value: 1, child: Text('1 card')),
                      DropdownMenuItem(value: 2, child: Text('2 cards')),
                      DropdownMenuItem(value: 3, child: Text('3 cards')),
                    ],
                    onChanged: (value) => setState(() => columns = value ?? 2),
                  ),
                ),
                SizedBox(
                  width: 140,
                  child: DropdownButtonFormField<String>(
                    initialValue: paperSize,
                    decoration: const InputDecoration(labelText: 'Paper'),
                    items: const [
                      DropdownMenuItem(value: 'A4', child: Text('A4')),
                      DropdownMenuItem(value: 'A3', child: Text('A3')),
                      DropdownMenuItem(value: 'LETTER', child: Text('Letter')),
                    ],
                    onChanged: (value) =>
                        setState(() => paperSize = value ?? 'A4'),
                  ),
                ),
                SizedBox(
                  width: 160,
                  child: DropdownButtonFormField<String>(
                    initialValue: orientation,
                    decoration: const InputDecoration(labelText: 'Direction'),
                    items: const [
                      DropdownMenuItem(
                          value: 'portrait', child: Text('Portrait')),
                      DropdownMenuItem(
                          value: 'landscape', child: Text('Landscape')),
                    ],
                    onChanged: (value) =>
                        setState(() => orientation = value ?? 'portrait'),
                  ),
                ),
                FilterChip(
                  avatar: const Icon(Icons.photo_outlined, size: 18),
                  label: const Text('Photo'),
                  selected: photo,
                  onSelected: (value) => setState(() => photo = value),
                ),
              ]),
            ]),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton.icon(
            onPressed: selectedFields.isEmpty
                ? null
                : () => Navigator.pop(
                      context,
                      _PrintOptions(
                        fields: Set.of(selectedFields),
                        columns: columns,
                        photo: photo,
                        paperSize: paperSize,
                        orientation: orientation,
                      ),
                    ),
            icon: const Icon(Icons.print),
            label: const Text('Print'),
          ),
        ],
      );
}

class VoterTable extends StatelessWidget {
  const VoterTable({
    super.key,
    required this.items,
    required this.refresh,
    required this.onDeleteAll,
    required this.onDeleteSelected,
    required this.total,
    required this.page,
    required this.pages,
    required this.pageSize,
    required this.onPageChanged,
    required this.selectedIds,
    required this.onSelectionChanged,
    required this.onSelectPage,
  });

  final List<Map<String, dynamic>> items;
  final VoidCallback refresh;
  final VoidCallback onDeleteAll;
  final VoidCallback onDeleteSelected;
  final int total;
  final int page;
  final int pages;
  final int pageSize;
  final ValueChanged<int> onPageChanged;
  final Set<String> selectedIds;
  final void Function(String id, bool selected) onSelectionChanged;
  final void Function(Iterable<String> ids, bool selected) onSelectPage;

  @override
  Widget build(BuildContext context) {
    final mobile = MediaQuery.sizeOf(context).width < 700;
    final start = total == 0 ? 0 : ((page - 1) * pageSize) + 1;
    final end = ((page - 1) * pageSize) + items.length;
    final pageIds = items.map((item) => '${item['_id']}').toList();
    final allPageSelected =
        pageIds.isNotEmpty && pageIds.every(selectedIds.contains);
    void openProfile(Map<String, dynamic> voter) => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => VoterDetailPage(voter: voter, onChanged: refresh),
          ),
        );
    return SectionCard(
      title: 'मतदाता सूची ($start-$end / $total)',
      subtitle: selectedIds.isEmpty
          ? 'रिकॉर्ड खोलने के लिए card पर tap करें'
          : '${selectedIds.length} मतदाता चयनित',
      icon: Icons.groups_rounded,
      action: Wrap(spacing: 8, runSpacing: 8, children: [
        if (selectedIds.isNotEmpty) ...[
          FilledButton.icon(
            onPressed: onDeleteSelected,
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Delete selected'),
          ),
          OutlinedButton.icon(
            onPressed: () => onSelectPage(selectedIds.toList(), false),
            icon: const Icon(Icons.close_rounded),
            label: const Text('Clear'),
          ),
        ],
        OutlinedButton.icon(
          onPressed: pageIds.isEmpty
              ? null
              : () => onSelectPage(pageIds, !allPageSelected),
          icon: const Icon(Icons.library_add_check_outlined),
          label: Text(
              allPageSelected ? 'इस पेज का चयन हटाएँ' : 'इस पेज के सभी चुनें'),
        ),
        if (api.user?['role'] == 'admin')
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red)),
            onPressed: onDeleteAll,
            icon: const Icon(Icons.delete_forever),
            label: const Text('सभी मतदाता हटाएं'),
          ),
      ]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (mobile)
          items.isEmpty
              ? const EmptyIllustration(
                  icon: Icons.search_off_rounded,
                  title: 'कोई मतदाता नहीं मिला',
                  subtitle:
                      'नाम, पिता/पति का नाम, EPIC, मोबाइल या घर संख्या से खोजें',
                )
              : Column(
                  children: items
                      .asMap()
                      .entries
                      .map((entry) => _VoterRow(
                            index: ((page - 1) * pageSize) + entry.key,
                            member: entry.value,
                            selected:
                                selectedIds.contains('${entry.value['_id']}'),
                            onSelected: (selected) => onSelectionChanged(
                                '${entry.value['_id']}', selected),
                            selectionMode: selectedIds.isNotEmpty,
                            refresh: refresh,
                          ))
                      .toList())
        else
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
                columns: const [
                  DataColumn(label: Text('फोटो')),
                  DataColumn(label: Text('नाम')),
                  DataColumn(label: Text('पिता / पति')),
                  DataColumn(label: Text('मोबाइल')),
                  DataColumn(label: Text('वोटर आईडी')),
                  DataColumn(label: Text('घर नं.')),
                  DataColumn(label: Text('गाँव')),
                  DataColumn(label: Text('समर्थन स्तर')),
                  DataColumn(label: Text('कार्रवाई')),
                ],
                rows: items
                    .map((m) => DataRow(
                          selected: selectedIds.contains('${m['_id']}'),
                          onSelectChanged: (selected) => onSelectionChanged(
                              '${m['_id']}', selected ?? false),
                          cells: [
                            DataCell(
                              _VoterPhoto(photo: m['photo'], radius: 20),
                              onTap: () => openProfile(m),
                            ),
                            DataCell(Text(m['name'] ?? '-'),
                                onTap: () => openProfile(m)),
                            DataCell(Text(m['guardianName'] ?? '-'),
                                onTap: () => openProfile(m)),
                            DataCell(
                                Row(mainAxisSize: MainAxisSize.min, children: [
                                  Text('${m['mobile'] ?? '-'}'),
                                  IconButton(
                                    tooltip: 'कॉल करें',
                                    onPressed: () => callNumber(
                                        context, '${m['mobile'] ?? ''}'),
                                    icon: const Icon(Icons.call,
                                        color: Colors.green),
                                  ),
                                ]),
                                onTap: () => openProfile(m)),
                            DataCell(Text('${m['voterId'] ?? '-'}'),
                                onTap: () => openProfile(m)),
                            DataCell(Text('${m['houseNumber'] ?? '-'}'),
                                onTap: () => openProfile(m)),
                            DataCell(Text('${m['village'] ?? '-'}'),
                                onTap: () => openProfile(m)),
                            DataCell(
                                Chip(
                                    label: Text(
                                        '${m['supportLevel'] ?? 'undecided'}')),
                                onTap: () => openProfile(m)),
                            DataCell(Row(children: [
                              IconButton(
                                  tooltip: 'देखें',
                                  onPressed: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                          builder: (_) => VoterDetailPage(
                                              voter: m, onChanged: refresh))),
                                  icon: const Icon(Icons.visibility,
                                      color: blue)),
                              IconButton(
                                  tooltip: 'संपादित करें',
                                  onPressed: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                          builder: (_) => VoterEditPage(
                                              voter: m, onSaved: refresh))),
                                  icon: const Icon(Icons.edit, color: blue)),
                              IconButton(
                                  tooltip: 'हटाएं',
                                  onPressed: () async {
                                    final id = '${m['_id']}';
                                    await api.delete('/api/members/$id');
                                    await OfflineVoterCache.removeByIds([id]);
                                    refresh();
                                  },
                                  icon: const Icon(Icons.delete_outline,
                                      color: Colors.red)),
                            ])),
                          ],
                        ))
                    .toList()),
          ),
        const SizedBox(height: 12),
        _PaginationBar(page: page, pages: pages, onChanged: onPageChanged),
      ]),
    );
  }
}

class _PaginationBar extends StatelessWidget {
  const _PaginationBar({
    required this.page,
    required this.pages,
    required this.onChanged,
  });

  final int page;
  final int pages;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    if (pages <= 1) return const SizedBox.shrink();
    final numbers = <int>{1, pages};
    for (var i = page - 2; i <= page + 2; i++) {
      if (i >= 1 && i <= pages) numbers.add(i);
    }
    final sorted = numbers.toList()..sort();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        IconButton.outlined(
          tooltip: 'पिछला पृष्ठ',
          onPressed: page <= 1 ? null : () => onChanged(page - 1),
          icon: const Icon(Icons.chevron_left),
        ),
        const SizedBox(width: 6),
        for (var i = 0; i < sorted.length; i++) ...[
          if (i > 0 && sorted[i] - sorted[i - 1] > 1)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6),
              child: Text('...', style: TextStyle(color: muted)),
            ),
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: SizedBox(
              width: 42,
              height: 38,
              child: sorted[i] == page
                  ? FilledButton(
                      onPressed: null,
                      style: FilledButton.styleFrom(
                        disabledBackgroundColor: blue,
                        disabledForegroundColor: Colors.white,
                      ),
                      child: Text('${sorted[i]}'),
                    )
                  : OutlinedButton(
                      onPressed: () => onChanged(sorted[i]),
                      child: Text('${sorted[i]}'),
                    ),
            ),
          ),
        ],
        IconButton.outlined(
          tooltip: 'अगला पृष्ठ',
          onPressed: page >= pages ? null : () => onChanged(page + 1),
          icon: const Icon(Icons.chevron_right),
        ),
      ]),
    );
  }
}

class _VoterRow extends StatelessWidget {
  const _VoterRow({
    required this.index,
    required this.member,
    required this.selected,
    required this.onSelected,
    required this.selectionMode,
    required this.refresh,
  });
  final int index;
  final Map<String, dynamic> member;
  final bool selected;
  final ValueChanged<bool> onSelected;
  final bool selectionMode;
  final VoidCallback refresh;

  @override
  Widget build(BuildContext context) {
    final name = '${member['name'] ?? '-'}';
    final isPersonal = member['contactType'] == 'personal';
    final epic = '${member['voterId'] ?? ''}'.trim();
    final identityText = isPersonal
        ? 'Personal contact'
        : epic.isEmpty
            ? 'EPIC not available'
            : 'EPIC: $epic';
    final guardian = '${member['guardianName'] ?? ''}'.trim();
    final mobile = '${member['mobile'] ?? ''}'.trim();
    final house = '${member['houseNumber'] ?? '-'}';
    final place = [
      '${member['village'] ?? ''}'.trim(),
      '${member['gramPanchayat'] ?? ''}'.trim(),
    ].where((v) => v.isNotEmpty && v != '-').join(' · ');

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: selected ? const Color(0xfff0f6ff) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
              color: selected ? blue.withValues(alpha: .45) : border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            if (selectionMode) {
              onSelected(!selected);
              return;
            }
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    VoterDetailPage(voter: member, onChanged: refresh),
              ),
            );
          },
          onLongPress: () => onSelected(!selected),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Checkbox(
                  value: selected,
                  onChanged: (value) => onSelected(value ?? false),
                  visualDensity: VisualDensity.compact,
                ),
                _VoterPhoto(photo: member['photo'], radius: 24),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: softBlue,
                              borderRadius: BorderRadius.circular(9),
                            ),
                            child: Text('#${index + 1}',
                                style: const TextStyle(
                                    color: blue,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900)),
                          ),
                          const SizedBox(width: 7),
                          Expanded(
                            child: Text(name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    color: navy,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900)),
                          ),
                        ]),
                        const SizedBox(height: 5),
                        Text(
                            guardian.isEmpty
                                ? 'पिता/पति: उपलब्ध नहीं'
                                : 'पिता/पति: $guardian',
                            style: const TextStyle(
                                color: navy,
                                fontSize: 12,
                                fontWeight: FontWeight.w800)),
                        const SizedBox(height: 4),
                        Row(children: [
                          Icon(
                            isPersonal
                                ? Icons.person_pin_circle_outlined
                                : Icons.badge_outlined,
                            size: 14,
                            color: isPersonal ? purple : muted,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(identityText,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    color: isPersonal ? purple : muted,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800)),
                          ),
                        ]),
                        const SizedBox(height: 6),
                        Wrap(spacing: 6, runSpacing: 6, children: [
                          _InfoPill(Icons.home_rounded, 'घर $house'),
                          if (api.user?['role'] == 'admin' &&
                              member['verificationStatus'] == 'needs_review')
                            const _InfoPill(Icons.fact_check_outlined,
                                '\u091c\u093e\u0901\u091a \u0906\u0935\u0936\u094d\u092f\u0915'),
                          if (place.isNotEmpty)
                            _InfoPill(Icons.location_on_rounded, place),
                          if (mobile.isNotEmpty)
                            _InfoPill(Icons.phone_rounded, mobile),
                        ]),
                      ]),
                ),
                PopupMenuButton<String>(
                  onSelected: (action) async {
                    if (action == 'view') {
                      Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => VoterDetailPage(
                                  voter: member, onChanged: refresh)));
                    } else if (action == 'edit') {
                      Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => VoterEditPage(
                                  voter: member, onSaved: refresh)));
                    } else if (action == 'delete') {
                      final id = '${member['_id']}';
                      await api.delete('/api/members/$id');
                      await OfflineVoterCache.removeByIds([id]);
                      refresh();
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'view', child: Text('देखें')),
                    PopupMenuItem(value: 'edit', child: Text('संपादित करें')),
                    PopupMenuItem(value: 'delete', child: Text('हटाएं')),
                  ],
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                PartyPreferenceChip(
                  value: '${member['partyPreference'] ?? 'undecided'}',
                ),
                const Spacer(),
                if (api.user?['role'] == 'admin')
                  IconButton.filledTonal(
                    tooltip: member['isFavorite'] == true
                        ? 'Favorites से हटाएं'
                        : 'Favorites में जोड़ें',
                    onPressed: () async {
                      final updated =
                          await api.put('/api/members/${member['_id']}', {
                        'isFavorite': member['isFavorite'] != true,
                      });
                      member['isFavorite'] = updated['isFavorite'] == true;
                      await OfflineVoterCache.merge([updated]);
                      refresh();
                    },
                    icon: Icon(
                      member['isFavorite'] == true
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: member['isFavorite'] == true ? orange : muted,
                      size: 19,
                    ),
                  ),
                if (api.user?['role'] == 'admin') const SizedBox(width: 6),
                IconButton.filledTonal(
                  tooltip: 'कॉल करें',
                  onPressed:
                      mobile.isEmpty ? null : () => callNumber(context, mobile),
                  icon: const Icon(Icons.call_rounded, color: green, size: 19),
                ),
                const SizedBox(width: 6),
                IconButton.filledTonal(
                  tooltip: 'संपादित करें',
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          VoterEditPage(voter: member, onSaved: refresh),
                    ),
                  ),
                  icon: const Icon(Icons.edit_rounded, color: blue, size: 19),
                ),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xfff6f8fc),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: muted, size: 13),
          const SizedBox(width: 4),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 160),
            child: Text(text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: muted, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ]),
      );
}

class _VoterPhoto extends StatelessWidget {
  const _VoterPhoto({required this.photo, required this.radius});
  final dynamic photo;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final path = '${photo ?? ''}'.trim();
    final url = voterPhotoUrl(path);
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: radius * 2,
        height: radius * 2,
        color: const Color(0xffeef3ff),
        child: path.isEmpty
            ? const Icon(Icons.person, color: muted)
            : Image.network(
                url,
                headers: voterPhotoHeaders(url),
                fit: BoxFit.contain,
                alignment: Alignment.center,
                errorBuilder: (_, __, ___) =>
                    const Icon(Icons.person, color: muted),
              ),
      ),
    );
  }
}

class VoterDetailPage extends StatefulWidget {
  const VoterDetailPage(
      {super.key, required this.voter, required this.onChanged});
  final Map<String, dynamic> voter;
  final VoidCallback onChanged;

  @override
  State<VoterDetailPage> createState() => _VoterDetailPageState();
}

class _VoterDetailPageState extends State<VoterDetailPage> {
  late Map<String, dynamic> voter;

  @override
  void initState() {
    super.initState();
    voter = Map<String, dynamic>.from(widget.voter);
  }

  Future<void> _refreshProfile() async {
    widget.onChanged();
    final id = '${voter['_id'] ?? ''}'.trim();
    if (id.isEmpty) return;
    try {
      final updated = await api.get('/api/members/$id');
      if (mounted) {
        setState(() => voter = Map<String, dynamic>.from(updated));
      }
    } catch (_) {
      // Parent list refresh still runs; retain the last available profile.
    }
  }

  Future<void> _toggleFavorite() async {
    final updated = await api.put('/api/members/${voter['_id']}', {
      'isFavorite': voter['isFavorite'] != true,
    });
    await OfflineVoterCache.merge([updated]);
    if (mounted) {
      setState(() => voter = Map<String, dynamic>.from(updated));
      widget.onChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isBoothManager = api.user?['role'] == 'booth';
    final mobile = '${voter['mobile'] ?? ''}'.trim();
    final place = [
      '${voter['village'] ?? ''}'.trim(),
      '${voter['gramPanchayat'] ?? ''}'.trim(),
    ].where((value) => value.isNotEmpty).join(', ');
    final hasAssembly = voter['hasAssemblyMembership'] == true ||
        '${voter['assemblyNumber'] ?? ''}'.trim().isNotEmpty;
    final hasMunicipal = voter['hasMunicipalMembership'] == true;
    final municipalWards = (voter['municipalWardNumbers'] as List? ?? const [])
        .map((value) => '$value')
        .where((value) => value.trim().isNotEmpty)
        .join(', ');
    final rollStatus = hasAssembly && hasMunicipal
        ? 'Assembly + Ward list'
        : hasMunicipal
            ? 'Ward list only'
            : 'Assembly list only';
    return Scaffold(
      backgroundColor: const Color(0xfff7f8fb),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0,
        title: const Text('मतदाता प्रोफाइल',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
        centerTitle: true,
        actions: [
          if (api.user?['role'] == 'admin')
            IconButton(
              tooltip: voter['isFavorite'] == true
                  ? 'Favorites से हटाएं'
                  : 'Favorites में जोड़ें',
              onPressed: _toggleFavorite,
              icon: Icon(
                voter['isFavorite'] == true
                    ? Icons.star_rounded
                    : Icons.star_border_rounded,
                color: voter['isFavorite'] == true ? orange : null,
              ),
            ),
          PopupMenuButton<String>(
            onSelected: (action) {
              if (action == 'print') {
                printApiPdf(context,
                    path: '/api/export/members/${voter['_id']}.pdf',
                    jobName: 'मतदाता प्रोफाइल');
              } else if (action == 'edit') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        VoterEditPage(voter: voter, onSaved: _refreshProfile),
                  ),
                );
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Text('संपादित करें')),
              if (!isBoothManager)
                const PopupMenuItem(
                    value: 'print', child: Text('प्रोफाइल प्रिंट करें')),
            ],
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 36),
        children: [
          Center(
            child: ClipOval(
              child: _VoterPhoto(photo: voter['photo'], radius: 55),
            ),
          ),
          const SizedBox(height: 12),
          Text('${voter['name'] ?? '-'}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: navy, fontSize: 23, fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          Center(
            child: PartyPreferenceChip(
              value: '${voter['partyPreference'] ?? 'undecided'}',
            ),
          ),
          const SizedBox(height: 20),
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _ProfileAction(
              icon: Icons.call_rounded,
              label: 'Call',
              color: green,
              onTap: () => callNumber(context, mobile),
            ),
            _ProfileAction(
              icon: Icons.chat_rounded,
              label: 'WhatsApp',
              color: const Color(0xff25d366),
              onTap: () => openWhatsApp(context, mobile,
                  message: 'नमस्ते ${voter['name'] ?? ''}'),
            ),
            _ProfileAction(
              icon: Icons.edit_rounded,
              label: 'Edit',
              color: blue,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) =>
                      VoterEditPage(voter: voter, onSaved: _refreshProfile),
                ),
              ),
            ),
            if (!isBoothManager)
              _ProfileAction(
                icon: Icons.print_rounded,
                label: 'Print',
                color: purple,
                onTap: () => printApiPdf(context,
                    path: '/api/export/members/${voter['_id']}.pdf',
                    jobName: 'मतदाता प्रोफाइल'),
              ),
          ]),
          const SizedBox(height: 22),
          _ProfileCard(children: [
            _ProfileInfoRow(
                icon: Icons.phone_rounded,
                title: mobile.isEmpty ? 'मोबाइल उपलब्ध नहीं' : mobile,
                subtitle: 'मोबाइल नंबर'),
            _ProfileInfoRow(
                icon: Icons.badge_outlined,
                title: '${voter['voterId'] ?? '-'}',
                subtitle: 'EPIC नंबर'),
            _ProfileInfoRow(
                icon: Icons.how_to_vote_outlined,
                title: rollStatus,
                subtitle: 'Electoral list status'),
            if (hasMunicipal)
              _ProfileInfoRow(
                  icon: Icons.location_city_outlined,
                  title: municipalWards.isEmpty
                      ? 'Ward number unavailable'
                      : 'Ward $municipalWards',
                  subtitle: 'Municipal Ward membership'),
            _ProfileInfoRow(
                icon: Icons.location_on_rounded,
                title: place.isEmpty ? '${voter['address'] ?? '-'}' : place,
                subtitle: 'पता / क्षेत्र'),
            _ProfileInfoRow(
                icon: Icons.cake_outlined,
                title:
                    '${voter['age'] ?? '-'} वर्ष · ${voter['gender'] ?? '-'}',
                subtitle: 'उम्र / लिंग'),
            _ProfileInfoRow(
                icon: Icons.family_restroom_rounded,
                title: '${voter['guardianName'] ?? '-'}',
                subtitle: 'पिता / पति का नाम',
                last: true),
          ]),
          const SizedBox(height: 18),
          _ProfileSection(
              title: 'पूरी जानकारी', child: DetailList(voter: voter)),
          const SizedBox(height: 12),
          _ProfileSection(
            title: 'परिवार',
            child: FamilyMembers(voter: voter, onChanged: _refreshProfile),
          ),
          const SizedBox(height: 12),
          _ProfileSection(
            title: 'नोट्स और संपर्क',
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${voter['notes'] ?? 'कोई टिप्पणी नहीं'}',
                  style: const TextStyle(color: muted)),
              const SizedBox(height: 12),
              VoterContactActions(voter: voter),
            ]),
          ),
        ],
      ),
    );
  }
}

class _ProfileAction extends StatelessWidget {
  const _ProfileAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Column(children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withValues(alpha: .10),
                border: Border.all(color: color.withValues(alpha: .20)),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 6),
            Text(label,
                style: const TextStyle(
                    color: navy, fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
        ),
      );
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: border),
        ),
        child: Column(children: children),
      );
}

class _ProfileInfoRow extends StatelessWidget {
  const _ProfileInfoRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.last = false,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final bool last;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          border: last
              ? null
              : const Border(bottom: BorderSide(color: Color(0xffedf0f5))),
        ),
        child: Row(children: [
          Icon(icon, color: muted, size: 21),
          const SizedBox(width: 14),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                  style: const TextStyle(
                      color: navy, fontSize: 14, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(subtitle,
                  style: const TextStyle(color: muted, fontSize: 11)),
            ]),
          ),
        ]),
      );
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: const TextStyle(
                  color: navy, fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          child,
        ]),
      );
}

String _ocrReviewLabels(dynamic raw) {
  if (raw is! List) return '-';
  const labels = {
    'name_missing_or_invalid':
        '\u0928\u093e\u092e \u0938\u094d\u092a\u0937\u094d\u091f \u0928\u0939\u0940\u0902',
    'voter_id_missing_or_invalid':
        'EPIC \u0917\u0932\u0924 \u092f\u093e \u0917\u093e\u092f\u092c',
    'house_number_missing_or_invalid':
        '\u0918\u0930 \u0938\u0902\u0916\u094d\u092f\u093e \u0917\u0932\u0924 \u092f\u093e \u0917\u093e\u092f\u092c',
    'age_missing_or_invalid':
        '\u0909\u092e\u094d\u0930 \u0917\u0932\u0924 \u092f\u093e \u0917\u093e\u092f\u092c',
    'gender_missing': '\u0932\u093f\u0902\u0917 \u0917\u093e\u092f\u092c',
    'guardian_missing_or_invalid':
        '\u092a\u093f\u0924\u093e/\u092a\u0924\u093f \u0915\u093e \u0928\u093e\u092e \u0938\u094d\u092a\u0937\u094d\u091f \u0928\u0939\u0940\u0902',
    'low_confidence': '\u0915\u092e OCR confidence',
  };
  return raw.map((value) => labels['$value'] ?? '$value').join(', ');
}

String _locationSnapshotText(dynamic raw) {
  if (raw is! Map) return '-';
  final parts = [
    raw['tehsil'],
    raw['gramPanchayat'],
    raw['village'],
  ]
      .map((value) => '$value'.trim())
      .where((value) => value.isNotEmpty && value != 'null')
      .toList();
  final pin = '${raw['pinCode'] ?? ''}'.trim();
  if (pin.isNotEmpty) parts.add('PIN $pin');
  final section = '${raw['sectionName'] ?? ''}'.trim();
  if (parts.isEmpty && section.isNotEmpty) parts.add(section);
  return parts.isEmpty ? '-' : parts.join(' > ');
}

class DetailList extends StatelessWidget {
  const DetailList({super.key, required this.voter});
  final Map voter;

  String _join(Iterable<dynamic> values, [String separator = ' / ']) => values
      .map((value) => '${value ?? ''}'.trim())
      .where((value) => value.isNotEmpty && value != '-')
      .join(separator);

  @override
  Widget build(BuildContext context) => Column(children: [
        info('नाम', voter['name']),
        info('मतदाता पहचान पत्र (EPIC)', voter['voterId']),
        info('पिता / पति का नाम', voter['guardianName']),
        info('घर संख्या', voter['houseNumber']),
        info('उम्र / लिंग', _join([voter['age'], voter['gender']])),
        info('जन्म तिथि', formatMonthDay(voter['dob'])),
        info('मोबाइल', voter['mobile']),
        info('वैकल्पिक मोबाइल', voter['altMobile']),
        info('पता', voter['address']),
        info('गाँव', voter['village']),
        info('ग्राम पंचायत', voter['gramPanchayat']),
        info('तहसील / ब्लॉक', voter['tehsil']),
        info('PIN', voter['pinCode']),
        info('नगर पालिका', voter['municipality']),
        info('जाति', voter['caste']),
        info('उपजाति', voter['subCaste']),
        info('व्यवसाय', voter['occupation']),
        info('शिक्षा', voter['education']),
        info(
            'कार्य-स्थान',
            _join([
              voter['workplaceVillage'],
              voter['workplaceCity'],
              voter['workplaceState']
            ], ', ')),
        info('जीवनसाथी', voter['spouseName']),
        info('विवाह वर्षगांठ', formatMonthDay(voter['anniversary'])),
        info(
            'विवाह संबंध स्थान',
            _join([
              voter['marriageVillage'],
              voter['marriageCity'],
              voter['marriageState']
            ], ', ')),
        info('संगठन पद', voter['organizationPost']),
        info('विधानसभा',
            _join([voter['assemblyNumber'], voter['assemblyName']], ' - ')),
        info(
            'भाग / अनुभाग',
            _join([
              voter['partNumber'],
              voter['sectionNumber'],
              voter['sectionName']
            ])),
        info('वार्ड / बूथ',
            _join([voter['ward']?['number'], voter['booth']?['number']])),
        info(
            'सर्वे स्थिति',
            voter['profileCompletionStatus'] == 'complete'
                ? 'जानकारी पूर्ण'
                : 'जानकारी बाकी'),
        if (api.user?['role'] == 'admin')
          info(
              'OCR validation',
              voter['ocrValidationPassed'] == true
                  ? 'नियमों से सत्यापित'
                  : 'पुनः जाँच आवश्यक'),
        if (api.user?['role'] == 'admin')
          info('OCR confidence', voter['ocrConfidence']),
        if (api.user?['role'] == 'admin')
          info('House confidence', voter['houseNumberConfidence']),
        if (api.user?['role'] == 'admin')
          info('Location confidence', voter['locationMatchConfidence']),
        if (api.user?['role'] == 'admin')
          info('Raw location',
              _locationSnapshotText(voter['locationResolution']?['raw'])),
        if (api.user?['role'] == 'admin')
          info('Suggested location',
              _locationSnapshotText(voter['locationResolution']?['suggested'])),
        if (api.user?['role'] == 'admin')
          info('Verified location',
              _locationSnapshotText(voter['locationResolution']?['verified'])),
        if (api.user?['role'] == 'admin')
          info('Location status', voter['locationResolution']?['status']),
        if (api.user?['role'] == 'admin' &&
            voter['ocrReviewReasons'] is List &&
            (voter['ocrReviewReasons'] as List).isNotEmpty)
          info('Review reasons', _ocrReviewLabels(voter['ocrReviewReasons'])),
        ..._extraDetails(voter['extraDetails']),
      ]);

  List<Widget> _extraDetails(dynamic details) {
    if (details is! List) return const [];
    return details
        .whereType<Map>()
        .where((item) =>
            '${item['label'] ?? ''}'.trim().isNotEmpty &&
            '${item['value'] ?? ''}'.trim().isNotEmpty)
        .map((item) => info('${item['label']}', item['value']))
        .toList();
  }

  Widget info(String key, dynamic value) {
    final text = '${value ?? ''}'.trim();
    if (text.isEmpty || text == '-') return const SizedBox.shrink();
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(key, style: const TextStyle(color: Color(0xff63708a))),
      subtitle: Text(text, style: const TextStyle(fontWeight: FontWeight.w800)),
    );
  }
}

class VoterForm extends StatefulWidget {
  const VoterForm({super.key, this.voter, required this.onSaved});
  final Map<String, dynamic>? voter;
  final VoidCallback onSaved;

  @override
  State<VoterForm> createState() => _VoterFormState();
}

class _VoterFormState extends State<VoterForm> {
  final ctrls = <String, TextEditingController>{};
  String partyPreference = 'undecided';
  String gender = '';
  String contactType = 'voter';
  PlatformFile? selectedPhoto;
  bool saving = false;
  String? formError;

  bool get isPersonal => contactType == 'personal';
  bool get canChooseType =>
      api.user?['role'] == 'admin' && widget.voter == null;

  @override
  void initState() {
    super.initState();
    for (final f in [
      'name',
      'guardianName',
      'age',
      'dob',
      'mobile',
      'altMobile',
      'voterId',
      'houseNumber',
      'address',
      'occupation',
      'education',
      'notes',
      'ward',
      'booth'
    ]) {
      ctrls[f] =
          TextEditingController(text: initialFormValue(f, widget.voter?[f]));
    }
    partyPreference = widget.voter?['partyPreference'] ?? 'undecided';
    gender = '${widget.voter?['gender'] ?? ''}';
    contactType = '${widget.voter?['contactType'] ?? 'voter'}';
  }

  Future<void> save() async {
    if (saving) return;
    if (ctrls['name']!.text.trim().isEmpty) {
      showError('Name is required.');
      return;
    }
    if (!isPersonal && ctrls['voterId']!.text.trim().isEmpty) {
      showError('EPIC is required for Matdata contact.');
      return;
    }
    if (isPersonal &&
        ctrls['mobile']!.text.trim().isEmpty &&
        ctrls['address']!.text.trim().isEmpty) {
      showError('Personal contact ke liye mobile ya address me se ek bharein.');
      return;
    }
    setState(() {
      saving = true;
      formError = null;
    });
    final body = <String, dynamic>{
      for (final e in ctrls.entries) e.key: e.value.text.trim(),
      'gender': gender,
      'partyPreference': partyPreference,
      'contactType': contactType,
    };
    for (final dateKey in ['dob']) {
      final original = widget.voter?[dateKey];
      final originalText = original == null ? '' : '$original'.trim();
      if ('${body[dateKey] ?? ''}'.trim().isEmpty && originalText.isEmpty) {
        body.remove(dateKey);
      }
    }
    if (isPersonal && ctrls['voterId']!.text.trim().isEmpty) {
      body.remove('voterId');
    }
    try {
      if (selectedPhoto != null) {
        await api.uploadFile(
          widget.voter == null
              ? '/api/members'
              : '/api/members/${widget.voter!['_id']}',
          method: widget.voter == null ? 'POST' : 'PUT',
          filename: selectedPhoto!.name,
          fileField: 'photo',
          filePath: pickedFilePath(selectedPhoto!),
          bytes: pickedFileBytes(selectedPhoto!),
          fields: body.map((key, value) => MapEntry(key, '$value')),
        );
      } else if (widget.voter == null) {
        await api.post('/api/members', body);
      } else {
        await api.put('/api/members/${widget.voter!['_id']}', body);
      }
      widget.onSaved();
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(isPersonal
                ? 'Personal contact saved.'
                : 'Matdata contact saved.')),
      );
    } catch (e) {
      showError('$e'.replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> pickPhoto() async {
    final result = await FilePicker.platform
        .pickFiles(type: FileType.image, withData: true, withReadStream: false);
    if (result == null || !mounted) return;
    final file = result.files.single;
    if (file.size > 10 * 1024 * 1024) {
      showError('Photo 10 MB se chhoti honi chahiye.');
      return;
    }
    setState(() => selectedPhoto = file);
  }

  void showError(String message) {
    if (mounted) setState(() => formError = message);
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  void dispose() {
    for (final controller in ctrls.values) {
      controller.dispose();
    }
    super.dispose();
  }

  String initialFormValue(String key, dynamic value) {
    if (value == null) return '';
    final text = '$value';
    final parsed = DateTime.tryParse(text);
    if (key == 'dob' && parsed != null) {
      return DateFormat('MM-dd').format(parsed.toLocal());
    }
    return text;
  }

  DateTime monthDayInitial(String key) {
    final text = ctrls[key]?.text.trim() ?? '';
    final parts = text.split('-');
    if (parts.length == 2) {
      final month = int.tryParse(parts[0]);
      final day = int.tryParse(parts[1]);
      if (month != null && day != null) return DateTime(2000, month, day);
    }
    final parsed = DateTime.tryParse(text);
    return parsed == null
        ? DateTime(2000, DateTime.now().month, DateTime.now().day)
        : DateTime(2000, parsed.month, parsed.day);
  }

  Future<DateTime?> pickMonthDay(String key, String label) async {
    var selected = monthDayInitial(key);
    return showDialog<DateTime>(
      context: context,
      builder: (context) => StatefulBuilder(builder: (context, setDialogState) {
        final days = DateUtils.getDaysInMonth(2000, selected.month);
        return AlertDialog(
          title: Text(label),
          content: SizedBox(
            width: 360,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              DropdownButtonFormField<int>(
                initialValue: selected.month,
                decoration: const InputDecoration(labelText: 'महीना'),
                items: List.generate(12, (i) => i + 1)
                    .map((month) => DropdownMenuItem(
                          value: month,
                          child: Text(DateFormat('MMMM')
                              .format(DateTime(2000, month, 1))),
                        ))
                    .toList(),
                onChanged: (month) => setDialogState(() {
                  if (month == null) return;
                  final maxDay = DateUtils.getDaysInMonth(2000, month);
                  selected =
                      DateTime(2000, month, selected.day.clamp(1, maxDay));
                }),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 240,
                child: GridView.count(
                  crossAxisCount: 7,
                  mainAxisSpacing: 6,
                  crossAxisSpacing: 6,
                  children: List.generate(days, (i) {
                    final day = i + 1;
                    final picked = day == selected.day;
                    return InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => setDialogState(
                          () => selected = DateTime(2000, selected.month, day)),
                      child: Container(
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: picked ? blue : const Color(0xfff3f6fb),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text('$day',
                            style: TextStyle(
                                color: picked ? Colors.white : navy,
                                fontWeight: FontWeight.w800)),
                      ),
                    );
                  }),
                ),
              ),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(context, selected),
                child: const Text('Select')),
          ],
        );
      }),
    );
  }

  Widget monthDayField(String key, {IconData? icon}) => TextField(
        controller: ctrls[key],
        readOnly: true,
        decoration: InputDecoration(
          labelText: voterFieldLabel(key),
          helperText: 'सिर्फ तारीख और महीना चुनें — year नहीं',
          prefixIcon: icon == null ? null : Icon(icon),
          suffixIcon: Row(mainAxisSize: MainAxisSize.min, children: [
            if (ctrls[key]!.text.isNotEmpty)
              IconButton(
                onPressed: () => setState(() => ctrls[key]!.clear()),
                icon: const Icon(Icons.close_rounded, size: 18),
              ),
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Icon(Icons.calendar_month_outlined),
            ),
          ]),
        ),
        onTap: () async {
          final picked = await pickMonthDay(key, voterFieldLabel(key));
          if (picked != null) {
            setState(
                () => ctrls[key]!.text = DateFormat('MM-dd').format(picked));
          }
        },
      );
  Widget photoPicker() {
    final bytes = selectedPhoto?.bytes;
    return Center(
      child: InkWell(
        onTap: saving ? null : pickPhoto,
        borderRadius: BorderRadius.circular(70),
        child: Column(children: [
          Stack(clipBehavior: Clip.none, children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xffeef2f8),
                border: Border.all(color: Colors.white, width: 4),
                boxShadow: const [
                  BoxShadow(
                      color: Color(0x17071b4b),
                      blurRadius: 18,
                      offset: Offset(0, 8))
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: bytes != null
                  ? Image.memory(bytes, fit: BoxFit.cover)
                  : widget.voter?['photo'] != null
                      ? _VoterPhoto(photo: widget.voter?['photo'], radius: 48)
                      : Icon(
                          isPersonal
                              ? Icons.person_pin_circle_outlined
                              : Icons.camera_alt_rounded,
                          color: muted,
                          size: 34),
            ),
            Positioned(
              right: -2,
              bottom: 2,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                    color: blue,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3)),
                child: const Icon(Icons.add_a_photo_rounded,
                    color: Colors.white, size: 15),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          Text(
              selectedPhoto == null
                  ? 'Add photo'
                  : '${selectedPhoto!.name} ? tap to change',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: muted, fontSize: 12, fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }

  Widget formField(String key,
          {IconData? icon,
          TextInputType? keyboardType,
          bool required = false,
          String? helperText}) =>
      TextField(
        controller: ctrls[key],
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: '${voterFieldLabel(key)}${required ? ' *' : ''}',
          prefixIcon: icon == null ? null : Icon(icon),
          helperText: helperText,
        ),
      );

  Widget genderOption(String value, String label, IconData icon) => Expanded(
        child: InkWell(
          onTap: () => setState(() => gender = value),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
                color: gender == value ? softBlue : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: gender == value ? blue : border)),
            child: Column(children: [
              Icon(icon, color: gender == value ? blue : muted),
              const SizedBox(height: 4),
              Text(label,
                  style: TextStyle(
                      color: gender == value ? blue : navy,
                      fontSize: 12,
                      fontWeight: FontWeight.w800)),
            ]),
          ),
        ),
      );

  Widget typeCard(String value, IconData icon, String title, String subtitle) {
    final selected = contactType == value;
    return Expanded(
      child: InkWell(
        onTap: canChooseType ? () => setState(() => contactType = value) : null,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
              color: selected ? softBlue : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: selected ? blue : border)),
          child: Row(children: [
            CircleAvatar(
                backgroundColor: selected ? blue : const Color(0xffeef3ff),
                child: Icon(icon,
                    color: selected ? Colors.white : muted, size: 20)),
            const SizedBox(width: 10),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(title,
                      style: TextStyle(
                          color: selected ? blue : navy,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: const TextStyle(
                          color: muted,
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ])),
          ]),
        ),
      ),
    );
  }

  Widget contactTypeSelector() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Contact type',
            style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        Row(children: [
          typeCard('voter', Icons.badge_rounded, 'Matdata', 'EPIC required'),
          const SizedBox(width: 10),
          typeCard('personal', Icons.person_pin_circle_outlined, 'Personal',
              'EPIC optional'),
        ]),
        if (isPersonal) ...[
          const SizedBox(height: 8),
          const Text(
              'Personal contact voter count/print me default include nahi hoga.',
              style: TextStyle(
                  color: muted, fontSize: 11, fontWeight: FontWeight.w700)),
        ],
      ]);

  List<Widget> formChildren() => [
        photoPicker(),
        const SizedBox(height: 18),
        if (api.user?['role'] == 'admin') ...[
          contactTypeSelector(),
          const SizedBox(height: 14)
        ],
        if (formError != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: const Color(0xfffff1f3),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: rose.withValues(alpha: .25))),
            child: Text(formError!,
                style: const TextStyle(
                    color: navy, fontSize: 12, fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 12),
        ],
        formField('name', icon: Icons.person_outline, required: true),
        const SizedBox(height: 12),
        formField('guardianName', icon: Icons.family_restroom_outlined),
        const SizedBox(height: 12),
        formField('houseNumber', icon: Icons.home_outlined),
        const SizedBox(height: 12),
        const Text('Gender',
            style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        Row(children: [
          genderOption('male', 'Male', Icons.male_rounded),
          const SizedBox(width: 9),
          genderOption('female', 'Female', Icons.female_rounded),
          const SizedBox(width: 9),
          genderOption('other', 'Other', Icons.person_outline_rounded),
        ]),
        const SizedBox(height: 12),
        formField('age',
            icon: Icons.cake_outlined,
            keyboardType: TextInputType.number,
            required: !isPersonal),
        const SizedBox(height: 12),
        monthDayField('dob', icon: Icons.calendar_today_outlined),
        const SizedBox(height: 12),
        formField('mobile',
            icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
        const SizedBox(height: 12),
        formField('altMobile',
            icon: Icons.phone_android_outlined,
            keyboardType: TextInputType.phone),
        const SizedBox(height: 12),
        formField('voterId',
            icon: isPersonal ? Icons.badge_outlined : Icons.badge_rounded,
            required: !isPersonal,
            helperText: isPersonal ? 'Optional for personal contacts' : null),
        const SizedBox(height: 12),
        formField('address', icon: Icons.location_on_outlined),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: partyPreference,
          decoration: const InputDecoration(
              labelText: 'पार्टी', prefixIcon: Icon(Icons.how_to_vote)),
          items: const [
            DropdownMenuItem(value: 'congress', child: Text('✋ Congress')),
            DropdownMenuItem(value: 'bjp', child: Text('🪷 BJP')),
            DropdownMenuItem(value: 'nota', child: Text('NOTA')),
            DropdownMenuItem(value: 'other', child: Text('◆ अन्य पार्टी')),
            DropdownMenuItem(value: 'undecided', child: Text('पार्टी तय नहीं')),
          ],
          onChanged: (v) => setState(() => partyPreference = v ?? 'undecided'),
        ),
        const SizedBox(height: 12),
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: const Text('More information',
              style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
          children: [
            formField('occupation', icon: Icons.work_outline),
            const SizedBox(height: 12),
            formField('education', icon: Icons.school_outlined),
            const SizedBox(height: 12),
            formField('notes', icon: Icons.notes_outlined),
            const SizedBox(height: 12),
            formField('ward', icon: Icons.location_city_outlined),
            const SizedBox(height: 12),
            formField('booth', icon: Icons.how_to_vote_outlined),
          ],
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final mobile = MediaQuery.sizeOf(context).width < 700;
    final title = widget.voter == null ? 'Add new contact' : 'Edit contact';
    final subtitle = isPersonal
        ? 'Save personal contact without EPIC'
        : 'Save matdata contact';
    final form = ListView(
        padding: EdgeInsets.fromLTRB(16, mobile ? 12 : 18, 16, 22),
        shrinkWrap: !mobile,
        children: formChildren());
    if (mobile) {
      return Dialog.fullscreen(
        child: Scaffold(
          backgroundColor: const Color(0xfff7f8fb),
          appBar: AppBar(
            backgroundColor: Colors.white,
            foregroundColor: navy,
            elevation: 0,
            leading: IconButton(
                onPressed: saving ? null : () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back_rounded)),
            title:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w900)),
              Text(subtitle,
                  style: const TextStyle(color: muted, fontSize: 11)),
            ]),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 10),
                child: FilledButton.icon(
                  onPressed: saving ? null : save,
                  icon: saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.save_rounded, size: 18),
                  label: const Text('Save'),
                ),
              )
            ],
          ),
          body: form,
        ),
      );
    }
    return AlertDialog(
      title: Text(title),
      content: SizedBox(width: 520, height: 680, child: form),
      actions: [
        TextButton(
            onPressed: saving ? null : () => Navigator.pop(context),
            child: const Text('Cancel')),
        FilledButton.icon(
            onPressed: saving ? null : save,
            icon: saving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save),
            label: Text(saving ? 'Saving...' : 'Save')),
      ],
    );
  }
}

String formatMonthDay(dynamic value) {
  final parsed = DateTime.tryParse('$value');
  if (parsed == null) return '-';
  return DateFormat('dd MMMM').format(parsed.toLocal());
}

String voterFieldLabel(String key) =>
    {
      'name': 'नाम',
      'guardianName': 'पिता / पति का नाम',
      'age': 'उम्र',
      'dob': 'जन्म तिथि',
      'gender': 'लिंग',
      'mobile': 'मोबाइल नंबर',
      'altMobile': 'वैकल्पिक मोबाइल',
      'voterId': 'मतदाता पहचान पत्र (EPIC)',
      'houseNumber': 'घर संख्या',
      'address': 'पता',
      'occupation': 'व्यवसाय',
      'education': 'शिक्षा',
      'notes': 'टिप्पणी',
      'ward': 'वार्ड ID',
      'booth': 'बूथ ID',
    }[key] ??
    key;

int _supportCount(Map data, String key) => (data['support'] as List? ?? [])
    .where((e) => e['_id'] == key)
    .fold<int>(0, (sum, e) => sum + ((e['count'] ?? 0) as num).toInt());

int _number(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
