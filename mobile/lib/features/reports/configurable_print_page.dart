import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api_client.dart';
import '../../core/file_saver.dart';
import '../../core/hierarchy_data.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';
import '../../utils/excel_generator.dart';
import '../../widgets/image_crop_dialog.dart';

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
  bool isDownloadingExcel = false;
  bool isSharingExcel = false;

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

  // Quick Print Filters
  bool withMobileOnly = false;
  bool favoritesOnly = false;
  bool verifiedOnly = false;
  String selectedParty = 'all'; // 'all', 'congress', 'bjp', 'undecided', 'nota', 'other'

  // Candidate Campaign Banner & Slip Customization State
  String? campaignBannerUrl;
  Uint8List? campaignBannerBytes;
  Uint8List? candidatePhotoBytes;
  Uint8List? leaderPhotoBytes;
  Uint8List? symbolBytes;
  int campaignCardsPerPage = 8; // 4, 6, 8, 10
  final candidateNameCtrl = TextEditingController(text: '');
  final candidatePostCtrl = TextEditingController(text: '');
  final candidateTaglineCtrl = TextEditingController(text: '');
  final candidatePhoneCtrl = TextEditingController(text: '');
  final candidateSloganCtrl = TextEditingController(text: '');
  final pollingTimeCtrl = TextEditingController(text: 'मतदान समय : प्रातः 7 से सायं 6 बजे तक');
  final pollingStationCtrl = TextEditingController();
  bool isUploadingBanner = false;

  // Color Theme & Typography Controls
  String selectedColorTheme = 'saffron_crimson';
  String selectedTextScale = 'medium'; // 'extra_small_70', 'small_80', 'small', 'medium', 'large', 'extra_large'
  double customFontScale = 1.0;
  String customPrimaryHex = 'b91c1c';
  String customBannerBgHex = 'fffdf6';
  String customBorderHex = 'f59e0b';
  String customTextHex = '1d4ed8';

  // Caste Analysis & Filter State
  String? selectedCaste;
  List<Map<String, dynamic>> casteBreakdown = [];
  bool loadingCaste = false;
  bool showCasteAnalysis = false;

  // Layout & Shape Configuration
  String paperSize = 'A4';
  String orientation = 'portrait'; // 'portrait' | 'landscape'
  int columns = 3; // 1, 2, 3, 4 (Default 3 for 30 voters per page)
  int rowsPerPage = 10; // Default 10 rows for 30 voters per page
  String densityPreset = '30'; // '30', '24', '20', '16', '10', 'custom'
  bool includePhoto = true;
  bool includeCoverPage = false;

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

  static const _prefPrefix = 'admin_campaign_card_v1_';

  void _onFieldChanged() {
    if (mounted) {
      setState(() {});
      _saveCampaignSettings();
    }
  }

  Future<void> _saveCampaignSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('${_prefPrefix}name', candidateNameCtrl.text);
      await prefs.setString('${_prefPrefix}post', candidatePostCtrl.text);
      await prefs.setString('${_prefPrefix}tagline', candidateTaglineCtrl.text);
      await prefs.setString('${_prefPrefix}phone', candidatePhoneCtrl.text);
      await prefs.setString('${_prefPrefix}slogan', candidateSloganCtrl.text);
      await prefs.setString('${_prefPrefix}time', pollingTimeCtrl.text);
      await prefs.setString('${_prefPrefix}station', pollingStationCtrl.text);
      await prefs.setString('${_prefPrefix}theme', selectedColorTheme);
      await prefs.setDouble('${_prefPrefix}fontScale', customFontScale);
      await prefs.setString('${_prefPrefix}textScale', selectedTextScale);
      await prefs.setString('${_prefPrefix}customPrimary', customPrimaryHex);
      await prefs.setString('${_prefPrefix}customBannerBg', customBannerBgHex);
      await prefs.setString('${_prefPrefix}customBorder', customBorderHex);
      await prefs.setString('${_prefPrefix}customText', customTextHex);
      await prefs.setStringList('${_prefPrefix}fields', selectedFields.toList());

      if (candidatePhotoBytes != null && candidatePhotoBytes!.isNotEmpty) {
        await prefs.setString('${_prefPrefix}cand_photo', base64Encode(candidatePhotoBytes!));
      } else {
        await prefs.remove('${_prefPrefix}cand_photo');
      }

      if (leaderPhotoBytes != null && leaderPhotoBytes!.isNotEmpty) {
        await prefs.setString('${_prefPrefix}leader_photo', base64Encode(leaderPhotoBytes!));
      } else {
        await prefs.remove('${_prefPrefix}leader_photo');
      }

      if (symbolBytes != null && symbolBytes!.isNotEmpty) {
        await prefs.setString('${_prefPrefix}symbol', base64Encode(symbolBytes!));
      } else {
        await prefs.remove('${_prefPrefix}symbol');
      }

      if (campaignBannerBytes != null && campaignBannerBytes!.isNotEmpty) {
        await prefs.setString('${_prefPrefix}banner', base64Encode(campaignBannerBytes!));
      } else {
        await prefs.remove('${_prefPrefix}banner');
      }
    } catch (e) {
      debugPrint('Error saving campaign card settings: $e');
    }
  }

  Future<void> _loadSavedCampaignSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final n = prefs.getString('${_prefPrefix}name');
      if (n != null && n.trim().isNotEmpty) candidateNameCtrl.text = n;
      final p = prefs.getString('${_prefPrefix}post');
      if (p != null && p.trim().isNotEmpty) candidatePostCtrl.text = p;
      final t = prefs.getString('${_prefPrefix}tagline');
      if (t != null) candidateTaglineCtrl.text = t;
      final ph = prefs.getString('${_prefPrefix}phone');
      if (ph != null) candidatePhoneCtrl.text = ph;
      final sl = prefs.getString('${_prefPrefix}slogan');
      if (sl != null && sl.trim().isNotEmpty) candidateSloganCtrl.text = sl;
      final tm = prefs.getString('${_prefPrefix}time');
      if (tm != null && tm.trim().isNotEmpty) pollingTimeCtrl.text = tm;
      final st = prefs.getString('${_prefPrefix}station');
      if (st != null) pollingStationCtrl.text = st;
      final th = prefs.getString('${_prefPrefix}theme');
      if (th != null && th.isNotEmpty) selectedColorTheme = th;
      final fs = prefs.getDouble('${_prefPrefix}fontScale');
      if (fs != null && fs > 0) customFontScale = fs;
      final ts = prefs.getString('${_prefPrefix}textScale');
      if (ts != null && ts.isNotEmpty) selectedTextScale = ts;
      final cp = prefs.getString('${_prefPrefix}customPrimary');
      if (cp != null && cp.isNotEmpty) customPrimaryHex = cp;
      final cbg = prefs.getString('${_prefPrefix}customBannerBg');
      if (cbg != null && cbg.isNotEmpty) customBannerBgHex = cbg;
      final cb = prefs.getString('${_prefPrefix}customBorder');
      if (cb != null && cb.isNotEmpty) customBorderHex = cb;
      final ct = prefs.getString('${_prefPrefix}customText');
      if (ct != null && ct.isNotEmpty) customTextHex = ct;
      final flds = prefs.getStringList('${_prefPrefix}fields');
      if (flds != null && flds.isNotEmpty) {
        selectedFields.clear();
        selectedFields.addAll(flds);
      }

      final cPhoto = prefs.getString('${_prefPrefix}cand_photo');
      if (cPhoto != null && cPhoto.isNotEmpty) {
        try { candidatePhotoBytes = base64Decode(cPhoto); } catch (_) {}
      }
      final lPhoto = prefs.getString('${_prefPrefix}leader_photo');
      if (lPhoto != null && lPhoto.isNotEmpty) {
        try { leaderPhotoBytes = base64Decode(lPhoto); } catch (_) {}
      }
      final sImg = prefs.getString('${_prefPrefix}symbol');
      if (sImg != null && sImg.isNotEmpty) {
        try { symbolBytes = base64Decode(sImg); } catch (_) {}
      }
      final bImg = prefs.getString('${_prefPrefix}banner');
      if (bImg != null && bImg.isNotEmpty) {
        try { campaignBannerBytes = base64Decode(bImg); } catch (_) {}
      }

      if (mounted) setState(() {});
    } catch (e) {
      debugPrint('Error loading saved campaign settings: $e');
    }
  }

  Future<void> _resetCampaignSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      for (final key in prefs.getKeys().where((k) => k.startsWith(_prefPrefix))) {
        await prefs.remove(key);
      }
      setState(() {
        candidateNameCtrl.clear();
        candidatePostCtrl.clear();
        candidateTaglineCtrl.clear();
        candidatePhoneCtrl.clear();
        candidateSloganCtrl.clear();
        pollingTimeCtrl.text = 'मतदान समय : प्रातः 7 से सायं 6 बजे तक';
        pollingStationCtrl.clear();
        candidatePhotoBytes = null;
        leaderPhotoBytes = null;
        symbolBytes = null;
        campaignBannerBytes = null;
        customFontScale = 1.0;
        selectedTextScale = 'medium';
        selectedColorTheme = 'saffron_crimson';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('कार्ड सेटिंग्स रीसेट हो गई हैं।')),
        );
      }
    } catch (e) {
      debugPrint('Error resetting campaign settings: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    candidateNameCtrl.addListener(_onFieldChanged);
    candidatePostCtrl.addListener(_onFieldChanged);
    candidateTaglineCtrl.addListener(_onFieldChanged);
    candidatePhoneCtrl.addListener(_onFieldChanged);
    candidateSloganCtrl.addListener(_onFieldChanged);
    pollingTimeCtrl.addListener(_onFieldChanged);
    pollingStationCtrl.addListener(_onFieldChanged);
    _loadHierarchy();
    _loadCasteBreakdown();
    _loadSavedCampaignSettings();
  }

  @override
  void dispose() {
    candidateNameCtrl.removeListener(_onFieldChanged);
    candidatePostCtrl.removeListener(_onFieldChanged);
    candidateTaglineCtrl.removeListener(_onFieldChanged);
    candidatePhoneCtrl.removeListener(_onFieldChanged);
    candidateSloganCtrl.removeListener(_onFieldChanged);
    pollingTimeCtrl.removeListener(_onFieldChanged);
    pollingStationCtrl.removeListener(_onFieldChanged);
    candidateNameCtrl.dispose();
    candidatePostCtrl.dispose();
    candidateTaglineCtrl.dispose();
    candidatePhoneCtrl.dispose();
    candidateSloganCtrl.dispose();
    pollingTimeCtrl.dispose();
    pollingStationCtrl.dispose();
    searchController.dispose();
    super.dispose();
  }

  void _onScopeSelectionChanged() {
    selectedCaste = null;
    _loadCasteBreakdown();
  }

  Future<void> _loadCasteBreakdown() async {
    setState(() => loadingCaste = true);
    try {
      final qParams = <String, String>{
        'field': 'caste',
        'tehsil': selectedSamiti,
        'limit': '200',
      };
      if (scopeType != 'all_samiti' && selectedGramPanchayat != null && selectedGramPanchayat!.isNotEmpty) {
        qParams['gramPanchayat'] = selectedGramPanchayat!;
      }
      if (scopeType == 'specific_village' && selectedVillage != null && selectedVillage!.isNotEmpty) {
        qParams['village'] = selectedVillage!;
      }
      if (scopeType == 'specific_ward' && selectedWard != null && selectedWard!.isNotEmpty) {
        qParams['wardNumber'] = selectedWard!;
      }
      if (scopeType == 'specific_part' && selectedPart != null && selectedPart!.isNotEmpty) {
        qParams['partNumber'] = selectedPart!;
      }
      final res = await api.getQuery('/api/members/field-values', qParams);
      final items = List<Map<String, dynamic>>.from(
        (res['items'] as List? ?? []).map((x) => Map<String, dynamic>.from(x as Map)),
      );
      if (mounted) {
        setState(() {
          casteBreakdown = items;
          loadingCaste = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => loadingCaste = false);
    }
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
    if (liveHierarchyData != null && liveHierarchyData!['panchayats'] is List) {
      final list = <String>[];
      for (final p in (liveHierarchyData!['panchayats'] as List)) {
        if (p is Map) {
          final s = (p['samiti'] ?? '').toString();
          if (s.isEmpty || s == selectedSamiti) {
            final name = '${p['name']}'.trim();
            if (name.isNotEmpty && !list.contains(name)) list.add(name);
          }
        }
      }
      if (list.isNotEmpty) {
        list.sort((a, b) => a.compareTo(b));
        return list;
      }
    }
    final cur = samitiHierarchyData[selectedSamiti];
    if (cur == null) return [];
    final panchayatsMap = cur['panchayats'] as Map<String, dynamic>? ?? {};
    final list = panchayatsMap.keys.toList();
    list.sort((a, b) => a.compareTo(b));
    return list;
  }

  List<Map<String, dynamic>> get availableVillages {
    if (selectedGramPanchayat == null) return [];
    if (liveHierarchyData != null && liveHierarchyData!['panchayats'] is List) {
      final cleanGp = selectedGramPanchayat!.trim();
      for (final p in (liveHierarchyData!['panchayats'] as List)) {
        if (p is Map && '${p['name']}'.trim() == cleanGp) {
          final vList = p['villages'] as List? ?? [];
          if (vList.isNotEmpty) {
            return vList.map((v) {
              if (v is Map) return Map<String, dynamic>.from(v);
              return <String, dynamic>{'name': v.toString()};
            }).toList();
          }
        }
      }
    }
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
    if (liveHierarchyData != null && liveHierarchyData!['panchayats'] is List) {
      final cleanGp = selectedGramPanchayat!.trim();
      for (final p in (liveHierarchyData!['panchayats'] as List)) {
        if (p is Map && '${p['name']}'.trim() == cleanGp) {
          final wList = p['wards'] as List? ?? [];
          if (wList.isNotEmpty) {
            final wards = wList.map((w) => w.toString().trim()).where((w) => w.isNotEmpty).toList();
            wards.sort((a, b) {
              final na = int.tryParse(a) ?? 999;
              final nb = int.tryParse(b) ?? 999;
              return na.compareTo(nb);
            });
            return wards;
          }
        }
      }
    }
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
      'rowsPerPage': '$rowsPerPage',
      'votersPerPage': '${columns * rowsPerPage}',
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
      params['scope'] = 'specific_ward';
      params['electoralListType'] = 'municipal';
      params['sortBy'] = 'wardVoterSerial';
      params['title'] = '${selectedGramPanchayat ?? selectedSamiti} - वार्ड $selectedWard मतदाता सूची';
    } else if (scopeType == 'specific_part' && selectedPart != null && selectedPart!.isNotEmpty) {
      params['partNumber'] = selectedPart!;
      params['scope'] = 'specific_part';
      params['title'] = 'भाग #$selectedPart ${selectedGramPanchayat != null ? "($selectedGramPanchayat)" : ""} मतदाता सूची';
    } else {
      if (selectedGramPanchayat != null) params['gramPanchayat'] = selectedGramPanchayat!;
      params['scope'] = 'all_wards';
      params['electoralListType'] = 'municipal';
      params['sortBy'] = 'wardVoterSerial';
      params['title'] = '$selectedGramPanchayat संपूर्ण पंचायत मतदाता सूची';
    }

    if (selectedCaste != null && selectedCaste!.isNotEmpty && selectedCaste != 'all') {
      params['caste'] = selectedCaste!;
      params['title'] = '${params['title']} - $selectedCaste जाति';
    }

    if (withMobileOnly) {
      params['withMobileOnly'] = 'true';
      params['title'] = '${params['title']} (केवल मोबाइल)';
    }
    if (favoritesOnly) {
      params['favoritesOnly'] = 'true';
      params['title'] = '${params['title']} (केवल फ़ेवरेट)';
    }
    if (verifiedOnly) {
      params['verifiedOnly'] = 'true';
      params['title'] = '${params['title']} (केवल वेरिफाइड)';
    }

    if (selectedParty.isNotEmpty && selectedParty != 'all') {
      params['partyPreference'] = selectedParty;
      params['party'] = selectedParty;
      const partyNames = {
        'congress': 'कांग्रेस',
        'bjp': 'भाजपा',
        'undecided': 'अनिर्णायक',
        'nota': 'नोटा',
        'other': 'अन्य',
      };
      params['title'] = '${params['title']} (${partyNames[selectedParty] ?? selectedParty})';
    }

    if (densityPreset == 'campaign_8') {
      params['layout'] = 'campaign';
      params['campaignSlip'] = 'true';
      params['votersPerPage'] = '$campaignCardsPerPage';
      params['columns'] = '2';
      params['rowsPerPage'] = '${campaignCardsPerPage ~/ 2}';
      if (campaignBannerBytes != null && campaignBannerBytes!.isNotEmpty) {
        final b64 = 'data:image/png;base64,${base64Encode(campaignBannerBytes!)}';
        params['banner'] = b64;
        params['bannerImage'] = b64;
      } else if (campaignBannerUrl != null && campaignBannerUrl!.isNotEmpty) {
        params['bannerUrl'] = campaignBannerUrl!;
        params['banner'] = campaignBannerUrl!;
      }
      if (candidatePhotoBytes != null && candidatePhotoBytes!.isNotEmpty) {
        params['candidatePhoto'] = 'data:image/png;base64,${base64Encode(candidatePhotoBytes!)}';
      }
      if (leaderPhotoBytes != null && leaderPhotoBytes!.isNotEmpty) {
        params['leaderPhoto'] = 'data:image/png;base64,${base64Encode(leaderPhotoBytes!)}';
      }
      if (symbolBytes != null && symbolBytes!.isNotEmpty) {
        final sB64 = 'data:image/png;base64,${base64Encode(symbolBytes!)}';
        params['symbol'] = sB64;
        params['symbolImage'] = sB64;
      }
      if (candidateNameCtrl.text.trim().isNotEmpty) {
        params['candidateName'] = candidateNameCtrl.text.trim();
      }
      if (candidatePostCtrl.text.trim().isNotEmpty) {
        params['candidatePost'] = candidatePostCtrl.text.trim();
      }
      if (candidateTaglineCtrl.text.trim().isNotEmpty) {
        params['candidateTagline'] = candidateTaglineCtrl.text.trim();
      }
      if (candidatePhoneCtrl.text.trim().isNotEmpty) {
        params['candidatePhone'] = candidatePhoneCtrl.text.trim();
      }
      if (candidateSloganCtrl.text.trim().isNotEmpty) {
        params['candidateSlogan'] = candidateSloganCtrl.text.trim();
      }
      if (pollingTimeCtrl.text.trim().isNotEmpty) {
        params['pollingTime'] = pollingTimeCtrl.text.trim();
      }
      if (pollingStationCtrl.text.trim().isNotEmpty) {
        params['pollingStation'] = pollingStationCtrl.text.trim();
      }
      params['colorTheme'] = selectedColorTheme;
      params['textScale'] = selectedTextScale;
      params['fontScale'] = _fontScaleFactor.toStringAsFixed(2);
      params['textScaleFactor'] = _fontScaleFactor.toStringAsFixed(2);
      if (selectedColorTheme == 'custom') {
        params['customPrimaryColor'] = '#$customPrimaryHex';
        params['customBannerBg'] = '#$customBannerBgHex';
        params['customBorderColor'] = '#$customBorderHex';
        params['customTextColor'] = '#$customTextHex';
      }
    }

    return params;
  }

  String get printJobName {
    String base;
    if (scopeType == 'all_samiti') {
      base = '${selectedSamiti}_Complete_List';
    } else {
      final gp = selectedGramPanchayat ?? selectedSamiti;
      if (scopeType == 'specific_village' && selectedVillage != null) {
        base = '${gp}_${selectedVillage}_List';
      } else if (scopeType == 'specific_ward' && selectedWard != null) {
        base = '${gp}_Ward_$selectedWard';
      } else if (scopeType == 'specific_part' && selectedPart != null) {
        base = 'Part_$selectedPart';
      } else {
        base = '${gp}_Complete_List';
      }
    }
    if (selectedCaste != null && selectedCaste!.isNotEmpty && selectedCaste != 'all') {
      base = '${base}_$selectedCaste';
    }
    if (selectedParty.isNotEmpty && selectedParty != 'all') {
      base = '${base}_$selectedParty';
    }
    return base;
  }

  Future<Uint8List> _ensureCompactImage(Uint8List bytes, {int maxDimension = 250}) async {
    try {
      if (bytes.length < 35 * 1024) return bytes;
      final probeCodec = await ui.instantiateImageCodec(bytes);
      final frame = await probeCodec.getNextFrame();
      final origW = frame.image.width;
      final origH = frame.image.height;
      if (origW <= maxDimension && origH <= maxDimension && bytes.length < 60 * 1024) {
        return bytes;
      }
      final int targetW;
      final int targetH;
      if (origW >= origH) {
        targetW = maxDimension;
        targetH = math.max(1, (origH * maxDimension / origW).round());
      } else {
        targetH = maxDimension;
        targetW = math.max(1, (origW * maxDimension / origH).round());
      }
      final codec = await ui.instantiateImageCodec(bytes, targetWidth: targetW, targetHeight: targetH);
      final resizedFrame = await codec.getNextFrame();
      final byteData = await resizedFrame.image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        return byteData.buffer.asUint8List();
      }
    } catch (e) {
      debugPrint('Compact image error: $e');
    }
    return bytes;
  }

  Future<void> _handlePrint() async {
    setState(() => isPrinting = true);
    try {
      // Ensure all images are safely compressed under 45KB to eliminate Nginx 413 error
      if (candidatePhotoBytes != null && candidatePhotoBytes!.length > 40 * 1024) {
        candidatePhotoBytes = await _ensureCompactImage(candidatePhotoBytes!);
      }
      if (leaderPhotoBytes != null && leaderPhotoBytes!.length > 40 * 1024) {
        leaderPhotoBytes = await _ensureCompactImage(leaderPhotoBytes!);
      }
      if (symbolBytes != null && symbolBytes!.length > 40 * 1024) {
        symbolBytes = await _ensureCompactImage(symbolBytes!);
      }
      if (campaignBannerBytes != null && campaignBannerBytes!.length > 70 * 1024) {
        campaignBannerBytes = await _ensureCompactImage(campaignBannerBytes!, maxDimension: 600);
      }

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

  Future<void> _handleBannerPickAndCrop() async {
    try {
      final picked = await pickAndCropImage(
        context,
        title: 'प्रचार बैनर फोटो क्रॉप करें (Campaign Banner)',
        targetAspectRatio: 3.8, // 278:72 aspect ratio matching the top card banner
      );
      if (picked == null) return;

      final compactBytes = await _ensureCompactImage(picked.bytes!, maxDimension: 600);
      setState(() {
        campaignBannerBytes = compactBytes;
        isUploadingBanner = true;
      });

      try {
        final res = await api.uploadFile(
          '/api/print/upload-banner',
          filename: picked.name,
          fileField: 'banner',
          bytes: compactBytes,
          filePath: picked.path,
        );
        if (mounted && res['url'] != null) {
          setState(() {
            campaignBannerUrl = res['url'];
          });
        }
      } catch (uploadErr) {
        // Upload failed or offline, but local cropped bytes are retained for immediate printing!
        debugPrint('Banner upload note: $uploadErr');
      }

      _saveCampaignSettings();

      if (mounted) {
        setState(() => isUploadingBanner = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ प्रचार बैनर फोटो सफलतापूर्वक सेट हो गया'),
            backgroundColor: Color(0xff16a34a),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => isUploadingBanner = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('बैनर चुनने में त्रुटि: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleCandidatePhotoPick() async {
    try {
      final picked = await pickAndCropImage(
        context,
        title: 'प्रत्याशी फोटो (गोल्डन रिंग फ्रेम)',
        circular: true,
        targetAspectRatio: 1.0,
      );
      if (picked != null) {
        final compact = await _ensureCompactImage(picked.bytes!);
        setState(() => candidatePhotoBytes = compact);
        _saveCampaignSettings();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('फोटो चुनने में त्रुटि: $e')));
      }
    }
  }

  Future<void> _handleLeaderPhotoPick() async {
    try {
      final picked = await pickAndCropImage(
        context,
        title: 'वरिष्ठ नेता / समर्थक फोटो (गोल्डन रिंग फ्रेम)',
        circular: true,
        targetAspectRatio: 1.0,
      );
      if (picked != null) {
        final compact = await _ensureCompactImage(picked.bytes!);
        setState(() => leaderPhotoBytes = compact);
        _saveCampaignSettings();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('फोटो चुनने में त्रुटि: $e')));
      }
    }
  }

  Future<void> _handleSymbolPick() async {
    try {
      final picked = await pickAndCropImage(
        context,
        title: 'चुनाव चिह्न (Election Symbol)',
        targetAspectRatio: 1.0,
      );
      if (picked != null) {
        final compact = await _ensureCompactImage(picked.bytes!);
        setState(() => symbolBytes = compact);
        _saveCampaignSettings();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('चुनाव चिह्न चुनने में त्रुटि: $e')));
      }
    }
  }

  Future<void> _setPresetSymbol(String assetPath) async {
    try {
      final byteData = await rootBundle.load(assetPath);
      final bytes = byteData.buffer.asUint8List();
      final compact = await _ensureCompactImage(bytes);
      setState(() => symbolBytes = compact);
      _saveCampaignSettings();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ चुनाव चिह्न सेट हो गया (आप चाहें तो ✂️ क्रॉप भी कर सकते हैं)'),
            duration: Duration(seconds: 2),
            backgroundColor: Color(0xff16a34a),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('चिह्न लोड करने में त्रुटि: $e')));
      }
    }
  }

  Future<void> _handleCropCurrentSymbol() async {
    if (symbolBytes == null) return;
    try {
      final cropped = await cropImageBytes(
        context,
        symbolBytes!,
        title: 'चुनाव चिह्न क्रॉप करें (Crop Symbol)',
        targetAspectRatio: 1.0,
      );
      if (cropped != null) {
        final compact = await _ensureCompactImage(cropped);
        setState(() => symbolBytes = compact);
        _saveCampaignSettings();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('क्रॉप करने में त्रुटि: $e')));
      }
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

  Future<List<int>> _buildClientExcel() async {
    final baseQuery = <String, String>{
      if (selectedGramPanchayat != null && selectedGramPanchayat!.isNotEmpty)
        'gramPanchayat': selectedGramPanchayat!,
      if (scopeType == 'specific_ward' && selectedWard != null && selectedWard!.isNotEmpty)
        'wardNumber': selectedWard!,
      if (scopeType == 'specific_village' && selectedVillage != null && selectedVillage!.isNotEmpty)
        'village': selectedVillage!,
      if (scopeType == 'specific_part' && selectedPart != null && selectedPart!.isNotEmpty)
        'partNumber': selectedPart!,
      if (scopeType == 'all_samiti' && selectedSamiti.isNotEmpty)
        'tehsil': selectedSamiti,
      if (selectedCaste != null && selectedCaste!.isNotEmpty && selectedCaste != 'all')
        'caste': selectedCaste!,
      if (withMobileOnly) 'hasMobile': 'true',
      if (favoritesOnly) 'favorite': 'true',
      if (verifiedOnly) 'verified': 'true',
      if (selectedParty.isNotEmpty && selectedParty != 'all')
        'partyPreference': selectedParty,
      'limit': '3000',
      'paged': 'true',
    };

    final allMembers = <Map<String, dynamic>>[];
    int page = 1;

    while (true) {
      final query = Map<String, String>.from(baseQuery);
      query['page'] = '$page';
      final res = await api.getQuery('/api/members', query);
      final dynamic rawItems = res['items'] ?? res['data'];
      final List<dynamic> rawList = rawItems is List ? rawItems : (res is List ? (res as List) : const []);
      final chunk = rawList.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      if (chunk.isEmpty) break;
      allMembers.addAll(chunk);

      final totalPages = res['pages'] is num ? (res['pages'] as num).toInt() : 1;
      if (page >= totalPages) break;
      page++;
    }

    if (allMembers.isEmpty) {
      throw 'चयनित दायरे में कोई मतदाता रिकॉर्ड नहीं मिला';
    }

    String sheetName = 'मतदाता सूची';
    if (selectedWard != null && selectedWard!.isNotEmpty) {
      sheetName = 'वार्ड $selectedWard';
    } else if (selectedVillage != null && selectedVillage!.isNotEmpty) {
      sheetName = selectedVillage!;
    } else if (selectedGramPanchayat != null && selectedGramPanchayat!.isNotEmpty) {
      sheetName = selectedGramPanchayat!;
    }

    return ExcelGenerator.createXlsx(
      members: allMembers,
      fieldKeys: selectedFields.toList(),
      sheetName: sheetName,
    );
  }

  Future<void> _handleDownloadExcel() async {
    setState(() => isDownloadingExcel = true);
    try {
      final bytes = await _buildClientExcel();
      final filename = '$printJobName.xlsx';
      final savedPath = await saveBytes(filename, Uint8List.fromList(bytes));
      if (mounted && savedPath != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ एक्सेल फ़ाइल सफलतापूर्वक सहेजी गई:\n$savedPath'),
            backgroundColor: const Color(0xff16a34a),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('एक्सेल डाउनलोड करने में त्रुटि: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isDownloadingExcel = false);
    }
  }

  Future<void> _handleShareExcel() async {
    setState(() => isSharingExcel = true);
    try {
      final bytes = await _buildClientExcel();
      final filename = '$printJobName.xlsx';

      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$filename');
      await file.writeAsBytes(bytes);

      await SharePlus.instance.share(
        ShareParams(
          text: '📊 $printJobName - मतदाता सूची एक्सेल फाइल (.xlsx)',
          files: [XFile(file.path)],
          subject: '$printJobName Excel',
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('एक्सेल शेयर करने में त्रुटि: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isSharingExcel = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff8fafc),
      appBar: AppBar(
        title: const Text('स्मार्ट PDF व Excel एक्सपोर्ट', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: isDownloadingExcel
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xff16a34a)))
                : const Icon(Icons.table_view_rounded, color: Color(0xff16a34a)),
            tooltip: 'Excel डाउनलोड करें',
            onPressed: isDownloadingExcel ? null : _handleDownloadExcel,
          ),
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
                        _onScopeSelectionChanged();
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
                  _onScopeSelectionChanged();
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
                onSelected: (val) => setState(() {
                  selectedVillage = val ? vName : null;
                  _onScopeSelectionChanged();
                }),
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
                onSelected: (val) => setState(() {
                  selectedWard = val ? w : null;
                  _onScopeSelectionChanged();
                }),
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
                      onSelected: (val) => setState(() {
                        selectedPart = val ? pNum : null;
                        _onScopeSelectionChanged();
                      }),
                    );
                  }).toList(),
                )
              : const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('भाग संख्या लोड हो रही है...', style: TextStyle(color: muted, fontSize: 13)),
                ),
          const SizedBox(height: 16),
        ],

        // 5. Caste Analysis & Caste Filter Section
        _buildCasteAnalysisAndFilterCard(),
        const SizedBox(height: 16),

        // 6. Quick Print Filters
        _buildQuickFiltersCard(),
        const SizedBox(height: 16),

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

  Widget _buildCasteAnalysisAndFilterCard() {
    final hasCasteFilter = selectedCaste != null && selectedCaste!.isNotEmpty && selectedCaste != 'all';
    final totalVotersInCastes = casteBreakdown.fold<int>(0, (sum, item) => sum + ((item['count'] as num?)?.toInt() ?? 0));

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: hasCasteFilter ? const Color(0xff7c3aed) : border,
          width: hasCasteFilter ? 1.8 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () {
              setState(() => showCasteAnalysis = !showCasteAnalysis);
              if (casteBreakdown.isEmpty) _loadCasteBreakdown();
            },
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xfff5f3ff),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.diversity_3_rounded, color: Color(0xff7c3aed), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              '📊 जाति विश्लेषण व जाति फ़िल्टर',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
                            ),
                            const SizedBox(width: 6),
                            if (casteBreakdown.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xfff3e8ff),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '${casteBreakdown.length} जातियां',
                                  style: const TextStyle(color: Color(0xff7c3aed), fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          hasCasteFilter
                              ? '🎯 चयनित जाति: "$selectedCaste" (केवल इसी जाति का प्रिंट निकलेगा)'
                              : 'जाति अनुसार मतदाता संख्या देखें एवं किसी एक जाति का अलग प्रिंट निकालें',
                          style: TextStyle(
                            fontSize: 12,
                            color: hasCasteFilter ? const Color(0xff7c3aed) : muted,
                            fontWeight: hasCasteFilter ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    showCasteAnalysis ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                    color: muted,
                  ),
                ],
              ),
            ),
          ),
          if (showCasteAnalysis) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'कुल विश्लेषण मतदाता: $totalVotersInCastes',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy),
                      ),
                      const Spacer(),
                      IconButton(
                        tooltip: 'रिफ्रेश जाति डेटा',
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        onPressed: _loadCasteBreakdown,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (loadingCaste)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (casteBreakdown.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: Text('इस क्षेत्र में जाति डेटा उपलब्ध नहीं है।', style: TextStyle(color: muted, fontSize: 13)),
                    )
                  else ...[
                    // Caste Quick Chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ChoiceChip(
                            label: const Text('सभी जातियां (All)'),
                            selected: selectedCaste == null || selectedCaste == '' || selectedCaste == 'all',
                            selectedColor: const Color(0xff7c3aed),
                            backgroundColor: Colors.white,
                            labelStyle: TextStyle(
                              color: (selectedCaste == null || selectedCaste == '' || selectedCaste == 'all')
                                  ? Colors.white
                                  : navy,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              if (val) setState(() => selectedCaste = null);
                            },
                          ),
                          const SizedBox(width: 8),
                          for (final item in casteBreakdown.take(15)) ...[
                            ChoiceChip(
                              label: Text('${item['label']} (${item['count']})'),
                              selected: selectedCaste == '${item['label']}',
                              selectedColor: const Color(0xff7c3aed),
                              backgroundColor: Colors.white,
                              labelStyle: TextStyle(
                                color: selectedCaste == '${item['label']}' ? Colors.white : navy,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              onSelected: (val) {
                                setState(() => selectedCaste = val ? '${item['label']}' : null);
                              },
                            ),
                            const SizedBox(width: 8),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Caste Detailed Breakdown Bars
                    Container(
                      constraints: const BoxConstraints(maxHeight: 240),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: casteBreakdown.take(12).length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, idx) {
                          final item = casteBreakdown[idx];
                          final cName = '${item['label']}';
                          final count = (item['count'] as num?)?.toInt() ?? 0;
                          final mobileCount = (item['mobileCount'] as num?)?.toInt() ?? 0;
                          final percent = totalVotersInCastes > 0 ? (count / totalVotersInCastes) : 0.0;
                          final isSel = selectedCaste == cName;

                          return InkWell(
                            onTap: () {
                              setState(() {
                                selectedCaste = isSel ? null : cName;
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSel ? const Color(0xfff5f3ff) : const Color(0xfff8fafc),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSel ? const Color(0xff7c3aed) : const Color(0xffe2e8f0),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        '#${idx + 1} $cName',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: isSel ? const Color(0xff7c3aed) : navy,
                                        ),
                                      ),
                                      const Spacer(),
                                      Text(
                                        '$count मतदाता (${(percent * 100).toStringAsFixed(1)}%)',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: navy),
                                      ),
                                      if (mobileCount > 0) ...[
                                        const SizedBox(width: 6),
                                        Text('• 📱 $mobileCount', style: const TextStyle(fontSize: 11, color: muted)),
                                      ],
                                      const SizedBox(width: 8),
                                      Icon(
                                        isSel ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                                        size: 18,
                                        color: isSel ? const Color(0xff7c3aed) : muted,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(3),
                                    child: LinearProgressIndicator(
                                      value: percent,
                                      minHeight: 5,
                                      backgroundColor: const Color(0xffe2e8f0),
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        isSel ? const Color(0xff7c3aed) : royalBlue,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _getSelectionSummaryText() {
    String base;
    if (scopeType == 'all_samiti') {
      base = '🎯 आपका चयन: पूरी $selectedSamiti समिति (समस्त ग्राम पंचायतें व गाँव)';
    } else if (scopeType == 'specific_village') {
      base = '🎯 आपका चयन: $selectedSamiti > $selectedGramPanchayat > ${selectedVillage ?? "गाँव चुनें"}';
    } else if (scopeType == 'specific_ward') {
      base = '🎯 आपका चयन: $selectedSamiti > $selectedGramPanchayat > ${selectedWard != null ? "वार्ड $selectedWard" : "वार्ड चुनें"}';
    } else if (scopeType == 'specific_part') {
      base = '🎯 आपका चयन: भाग #${selectedPart ?? "भाग चुनें"}';
    } else {
      base = '🎯 आपका चयन: $selectedSamiti > संपूर्ण $selectedGramPanchayat ग्राम पंचायत';
    }
    if (selectedCaste != null && selectedCaste!.isNotEmpty && selectedCaste != 'all') {
      base += ' | 🏷️ जाति फ़िल्टर: "$selectedCaste"';
    }
    if (withMobileOnly) base += ' | 📱 केवल मोबाइल';
    if (favoritesOnly) base += ' | ⭐ केवल फ़ेवरेट';
    if (verifiedOnly) base += ' | ✅ केवल वेरिफाइड';
    return base;
  }

  Widget _buildQuickFiltersCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.tune_rounded, color: Color(0xff2563eb), size: 20),
              SizedBox(width: 8),
              Text(
                '⚡ त्वरित प्रिंट फ़िल्टर (Quick Print Filters)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilterChip(
                avatar: const Icon(Icons.phone_android_rounded, size: 16),
                label: const Text('📱 केवल मोबाइल नंबर वाले'),
                selected: withMobileOnly,
                selectedColor: const Color(0xffdcfce7),
                checkmarkColor: const Color(0xff16a34a),
                labelStyle: TextStyle(
                  color: withMobileOnly ? const Color(0xff166534) : navy,
                  fontWeight: withMobileOnly ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (val) => setState(() => withMobileOnly = val),
              ),
              FilterChip(
                avatar: const Icon(Icons.star_rounded, size: 16),
                label: const Text('⭐ केवल फ़ेवरेट'),
                selected: favoritesOnly,
                selectedColor: const Color(0xfffef3c7),
                checkmarkColor: const Color(0xffd97706),
                labelStyle: TextStyle(
                  color: favoritesOnly ? const Color(0xffb45309) : navy,
                  fontWeight: favoritesOnly ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (val) => setState(() => favoritesOnly = val),
              ),
              FilterChip(
                avatar: const Icon(Icons.verified_rounded, size: 16),
                label: const Text('✅ केवल वेरिफाइड'),
                selected: verifiedOnly,
                selectedColor: const Color(0xffdbeafe),
                checkmarkColor: const Color(0xff2563eb),
                labelStyle: TextStyle(
                  color: verifiedOnly ? const Color(0xff1e40af) : navy,
                  fontWeight: verifiedOnly ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (val) => setState(() => verifiedOnly = val),
              ),
            ],
          ),
          const Divider(height: 22),
          const Row(
            children: [
              Icon(Icons.flag_rounded, size: 18, color: royalBlue),
              SizedBox(width: 8),
              Text(
                '🚩 पार्टी अनुसार प्रिंट फ़िल्टर (Party Filter):',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: navy),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildPartyFilterChip('all', 'सभी पार्टियां (All)', null),
              _buildPartyFilterChip('congress', 'कांग्रेस (INC)', const Color(0xff16a34a)),
              _buildPartyFilterChip('bjp', 'भाजपा (BJP)', const Color(0xffea580c)),
              _buildPartyFilterChip('undecided', 'अनिर्णायक', const Color(0xff6366f1)),
              _buildPartyFilterChip('nota', 'नोटा (NOTA)', const Color(0xff64748b)),
              _buildPartyFilterChip('other', 'अन्य (Other)', const Color(0xff0284c7)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPartyFilterChip(String value, String label, Color? accentColor) {
    final isSelected = selectedParty == value;
    final color = accentColor ?? royalBlue;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: color.withValues(alpha: 0.16),
      backgroundColor: Colors.grey.shade100,
      labelStyle: TextStyle(
        color: isSelected ? (accentColor ?? royalBlue) : navy,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        fontSize: 12.5,
      ),
      side: BorderSide(
        color: isSelected ? (accentColor ?? royalBlue) : Colors.grey.shade300,
        width: isSelected ? 1.6 : 1,
      ),
      onSelected: (_) => setState(() => selectedParty = value),
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
      onTap: () => setState(() {
        scopeType = type;
        _onScopeSelectionChanged();
      }),
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
    final totalVotersPerPage = columns * rowsPerPage;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '1. पेज ग्रिड व मतदाता संख्या (Voters Per Page):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navy),
        ),
        const SizedBox(height: 4),
        const Text(
          '1 पेज पर कितने मतदाता प्रिंट करने हैं चुनें (30 मतदाता चुनाव आयोग का मानक फॉर्मेट है):',
          style: TextStyle(fontSize: 12, color: muted),
        ),
        const SizedBox(height: 12),

        // Density presets
        Row(
          children: [
            _buildSelectableCard(
              title: '30 मतदाता (मानक)',
              subtitle: '3 × 10 ग्रिड • न्यूनतम पेज',
              icon: Icons.grid_view_rounded,
              isSelected: densityPreset == '30',
              onTap: () => setState(() {
                densityPreset = '30';
                columns = 3;
                rowsPerPage = 10;
              }),
            ),
            const SizedBox(width: 8),
            _buildSelectableCard(
              title: '24 मतदाता',
              subtitle: '3 × 8 ग्रिड • सघन',
              icon: Icons.grid_on_rounded,
              isSelected: densityPreset == '24',
              onTap: () => setState(() {
                densityPreset = '24';
                columns = 3;
                rowsPerPage = 8;
              }),
            ),
            const SizedBox(width: 8),
            _buildSelectableCard(
              title: '20 मतदाता',
              subtitle: '2 × 10 ग्रिड',
              icon: Icons.view_column_rounded,
              isSelected: densityPreset == '20',
              onTap: () => setState(() {
                densityPreset = '20';
                columns = 2;
                rowsPerPage = 10;
              }),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _buildSelectableCard(
              title: '16 मतदाता',
              subtitle: '2 × 8 ग्रिड • संतुलित',
              icon: Icons.dashboard_customize_rounded,
              isSelected: densityPreset == '16',
              onTap: () => setState(() {
                densityPreset = '16';
                columns = 2;
                rowsPerPage = 8;
              }),
            ),
            const SizedBox(width: 8),
            _buildSelectableCard(
              title: '10 मतदाता',
              subtitle: '2 × 5 ग्रिड • बड़ा कार्ड',
              icon: Icons.view_agenda_rounded,
              isSelected: densityPreset == '10',
              onTap: () => setState(() {
                densityPreset = '10';
                columns = 2;
                rowsPerPage = 5;
              }),
            ),
            const SizedBox(width: 8),
            _buildSelectableCard(
              title: 'कस्टम ग्रिड',
              subtitle: 'पंक्ति व कॉलम स्वयं तय करें',
              icon: Icons.tune_rounded,
              isSelected: densityPreset == 'custom',
              onTap: () => setState(() {
                densityPreset = 'custom';
              }),
            ),
          ],
        ),

        const SizedBox(height: 10),
        // Specialized Candidate Campaign Slip Format (User's requested format!)
        InkWell(
          onTap: () => setState(() {
            densityPreset = 'campaign_8';
            columns = 2;
            rowsPerPage = 4;
          }),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: densityPreset == 'campaign_8'
                  ? const LinearGradient(colors: [Color(0xffeff6ff), Color(0xfffef3c7)])
                  : null,
              color: densityPreset == 'campaign_8' ? null : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: densityPreset == 'campaign_8' ? const Color(0xffd97706) : border,
                width: densityPreset == 'campaign_8' ? 2 : 1,
              ),
              boxShadow: densityPreset == 'campaign_8'
                  ? [BoxShadow(color: const Color(0xfff59e0b).withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 3))]
                  : null,
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xfffef3c7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.how_to_vote_rounded, color: Color(0xffd97706), size: 26),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            '🌟 प्रत्याशी चुनाव प्रचार पर्ची (8 पर्ची/पेज)',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: navy),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: const BoxDecoration(
                              color: Color(0xffdc2626),
                              borderRadius: BorderRadius.all(Radius.circular(6)),
                            ),
                            child: const Text('नया', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'ऊपर प्रत्याशी प्रचार फोटो/बैनर + फाड़ने वाली लाइन + मतदाता विवरण, फोटो व वार्ड बॉक्स',
                        style: TextStyle(fontSize: 11.5, color: muted),
                      ),
                    ],
                  ),
                ),
                Radio<String>(
                  value: 'campaign_8',
                  groupValue: densityPreset,
                  activeColor: const Color(0xffd97706),
                  onChanged: (val) => setState(() {
                    densityPreset = val!;
                    columns = 2;
                    rowsPerPage = 4;
                  }),
                ),
              ],
            ),
          ),
        ),

        // Dedicated Campaign Banner & Slip Configuration
        if (densityPreset == 'campaign_8') ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xfff59e0b), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xfff59e0b).withValues(alpha: 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.campaign_rounded, color: Color(0xffd97706), size: 22),
                    SizedBox(width: 8),
                    Text(
                      'प्रत्याशी प्रचार बैनर व पर्ची विवरण',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'हर मतदाता पर्ची के ऊपर प्रत्याशी की बैनर फोटो व नीचे मतदान केंद्र/वार्ड बॉक्स प्रिंट होगा:',
                  style: TextStyle(fontSize: 12, color: muted),
                ),
                const SizedBox(height: 14),

                // Live Interactive WYSIWYG Slip Preview
                _buildLiveCardPreviewWidget(),

                // 1. Cards Per Page Selector (Admin Control)
                const Text('1. पर्ची प्रति पेज संख्या चुनें (Cards Per Page):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: navy)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: [4, 6, 8, 10].map((count) {
                    final isSel = campaignCardsPerPage == count;
                    return ChoiceChip(
                      label: Text('$count पर्ची ${count == 8 ? "(मानक 🌟)" : count == 4 ? "(विशाल)" : ""}'),
                      selected: isSel,
                      selectedColor: const Color(0xfff59e0b),
                      backgroundColor: Colors.white,
                      labelStyle: TextStyle(color: isSel ? Colors.white : navy, fontWeight: isSel ? FontWeight.bold : FontWeight.normal),
                      onSelected: (val) => setState(() {
                        if (val) campaignCardsPerPage = count;
                      }),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 8),

                // 2. Graphic Photos & Symbol (No Background Removal Needed!)
                const Text('2. ग्राफिक फोटो व चुनाव चिह्न (गोल्डन रिंग ऑटो-फ्रेम):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: navy)),
                const SizedBox(height: 4),
                const Text('फोटो का बैकग्राउंड हटाने की जरूरत नहीं है, सिस्टम अपने आप शाही गोल्डन रिंग में सेट करेगा:', style: TextStyle(fontSize: 11, color: muted)),
                const SizedBox(height: 10),

                Row(
                  children: [
                    // Candidate Photo Card
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xfffffbeb),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xfff59e0b)),
                        ),
                        child: Column(
                          children: [
                            const Text('प्रत्याशी फोटो 👤', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xffb45309))),
                            const SizedBox(height: 6),
                            if (candidatePhotoBytes != null) ...[
                              Stack(
                                alignment: Alignment.topRight,
                                children: [
                                  Container(
                                    width: 58,
                                    height: 58,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: const Color(0xfff59e0b), width: 2),
                                      image: DecorationImage(image: MemoryImage(candidatePhotoBytes!), fit: BoxFit.cover),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () { setState(() => candidatePhotoBytes = null); _saveCampaignSettings(); },
                                    child: const CircleAvatar(radius: 10, backgroundColor: Colors.red, child: Icon(Icons.close, size: 12, color: Colors.white)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              TextButton(
                                onPressed: _handleCandidatePhotoPick,
                                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 24)),
                                child: const Text('बदलें', style: TextStyle(fontSize: 11)),
                              ),
                            ] else ...[
                              InkWell(
                                onTap: _handleCandidatePhotoPick,
                                child: const CircleAvatar(
                                  radius: 28,
                                  backgroundColor: Color(0xfffef3c7),
                                  child: Icon(Icons.add_a_photo_rounded, color: Color(0xffd97706), size: 22),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text('गैलरी से चुनें', style: TextStyle(fontSize: 10, color: muted)),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Election Symbol Card
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xfff0fdf4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xff22c55e)),
                        ),
                        child: Column(
                          children: [
                            const Text('चुनाव चिह्न 🗳️', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xff15803d))),
                            const SizedBox(height: 6),
                            if (symbolBytes != null) ...[
                              Stack(
                                alignment: Alignment.topRight,
                                children: [
                                  Container(
                                    width: 58,
                                    height: 58,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: const Color(0xff22c55e), width: 2),
                                      color: Colors.white,
                                    ),
                                    child: ClipOval(
                                      child: Padding(
                                        padding: const EdgeInsets.all(4.0),
                                        child: Image.memory(symbolBytes!, fit: BoxFit.contain),
                                      ),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () { setState(() => symbolBytes = null); _saveCampaignSettings(); },
                                    child: const CircleAvatar(radius: 10, backgroundColor: Colors.red, child: Icon(Icons.close, size: 12, color: Colors.white)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  TextButton(
                                    onPressed: _handleSymbolPick,
                                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(38, 24)),
                                    child: const Text('बदलें', style: TextStyle(fontSize: 10.5, color: Color(0xff15803d))),
                                  ),
                                  const SizedBox(width: 4),
                                  TextButton(
                                    onPressed: _handleCropCurrentSymbol,
                                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(42, 24)),
                                    child: const Text('✂️ क्रॉप', style: TextStyle(fontSize: 10.5, color: Color(0xff2563eb), fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            ] else ...[
                              InkWell(
                                onTap: _handleSymbolPick,
                                child: const CircleAvatar(
                                  radius: 28,
                                  backgroundColor: Color(0xffdcfce7),
                                  child: Icon(Icons.how_to_vote_rounded, color: Color(0xff16a34a), size: 22),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text('गैलरी से चुनें', style: TextStyle(fontSize: 10, color: muted)),
                            ],
                            const SizedBox(height: 4),
                            // Quick 1-click Preset Party Signs
                            Wrap(
                              spacing: 4,
                              runSpacing: 4,
                              alignment: WrapAlignment.center,
                              children: [
                                InkWell(
                                  onTap: () => _setPresetSymbol('assets/party/congress.png'),
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xffe0f2fe),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xff38bdf8)),
                                    ),
                                    child: const Text('✋ कांग्रेस', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xff0369a1))),
                                  ),
                                ),
                                InkWell(
                                  onTap: () => _setPresetSymbol('assets/party/bjp.png'),
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xffffedd5),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xfffb923c)),
                                    ),
                                    child: const Text('🪷 भाजपा', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xffc2410c))),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Senior Leader Photo Card (Optional)
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xffeff6ff),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xff3b82f6)),
                        ),
                        child: Column(
                          children: [
                            const Text('नेता/समर्थक 👥', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xff1d4ed8))),
                            const SizedBox(height: 6),
                            if (leaderPhotoBytes != null) ...[
                              Stack(
                                alignment: Alignment.topRight,
                                children: [
                                  Container(
                                    width: 58,
                                    height: 58,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: const Color(0xff3b82f6), width: 2),
                                      image: DecorationImage(image: MemoryImage(leaderPhotoBytes!), fit: BoxFit.cover),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () { setState(() => leaderPhotoBytes = null); _saveCampaignSettings(); },
                                    child: const CircleAvatar(radius: 10, backgroundColor: Colors.red, child: Icon(Icons.close, size: 12, color: Colors.white)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              TextButton(
                                onPressed: _handleLeaderPhotoPick,
                                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 24)),
                                child: const Text('बदलें', style: TextStyle(fontSize: 11, color: Color(0xff1d4ed8))),
                              ),
                            ] else ...[
                              InkWell(
                                onTap: _handleLeaderPhotoPick,
                                child: const CircleAvatar(
                                  radius: 28,
                                  backgroundColor: Color(0xffdbeafe),
                                  child: Icon(Icons.person_add_alt_1_rounded, color: Color(0xff2563eb), size: 22),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text('ऑप्शनल', style: TextStyle(fontSize: 10, color: muted)),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 8),

                // 3. Candidate & Slogan Details
                const Text('3. प्रत्याशी, टैगलाइन व संदेश (Candidate & Tagline Text):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: navy)),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      flex: 6,
                      child: TextField(
                        controller: candidateNameCtrl,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'प्रत्याशी का नाम',
                          hintText: 'उदा. रामेश्वर लाल',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 4,
                      child: TextField(
                        controller: candidatePostCtrl,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'पद',
                          hintText: 'सरपंच / पार्षद',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Tagline field
                TextField(
                  controller: candidateTaglineCtrl,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: 'टैगलाइन (Tagline) 🌟',
                    hintText: 'उदा. "वार्ड के सर्वांगीण विकास के लिए आपका अपना कर्मठ प्रत्याशी"',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      flex: 5,
                      child: TextField(
                        controller: candidatePhoneCtrl,
                        keyboardType: TextInputType.phone,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'संपर्क मोबाइल',
                          hintText: '9829858296',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 5,
                      child: TextField(
                        controller: pollingTimeCtrl,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'मतदान समय',
                          hintText: 'प्रातः 7 से सायं 6 बजे तक',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: candidateSloganCtrl,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: 'नारा / अपील संदेश',
                    hintText: 'को वोट देकर भारी मतों से विजयी बनावें।',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: pollingStationCtrl,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: 'मतदान केंद्र भवन नाम (वार्ड अनुसार / कस्टम)',
                    hintText: 'उदा. राजकीय उच्च माध्यमिक विद्यालय, ${selectedGramPanchayat ?? "नाथडियास"}',
                    isDense: true,
                    border: const OutlineInputBorder(),
                    helperText: 'यहाँ जो लिखेंगे वह मतदान केंद्र बॉक्स में प्रिंट होगा (खाली रखने पर सरकारी स्कूल नाम स्वतः आएगा)',
                    helperMaxLines: 2,
                    prefixIcon: const Icon(Icons.how_to_vote_outlined, size: 20),
                  ),
                ),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 8),

                // 4. Color Themes & Typography Customization (5 Presets + 1 Custom)
                Row(
                  children: [
                    const Icon(Icons.palette_outlined, size: 18, color: navy),
                    const SizedBox(width: 6),
                    const Text('4. कलर थीम व डिज़ाइन (5 कलर सेट + 1 कस्टम):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: navy)),
                  ],
                ),
                const SizedBox(height: 10),

                // Theme Presets Grid
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildThemePresetCard(
                      key: 'saffron_crimson',
                      title: 'राजसी केशरिया & लाल',
                      subtitle: 'डिफ़ॉल्ट प्रीमियम',
                      bannerColor: const Color(0xfffffdf6),
                      primaryColor: const Color(0xffb91c1c),
                      borderColor: const Color(0xfff59e0b),
                    ),
                    _buildThemePresetCard(
                      key: 'royal_blue',
                      title: 'शाही नीला & गोल्ड',
                      subtitle: 'कांग्रेस / डेमोक्रेटिक',
                      bannerColor: const Color(0xfff0f7ff),
                      primaryColor: const Color(0xff1d4ed8),
                      borderColor: const Color(0xffd97706),
                    ),
                    _buildThemePresetCard(
                      key: 'tiranga_green',
                      title: 'तिरंगा हरा & संतरी',
                      subtitle: 'राष्ट्रीय तिरंगा थीम',
                      bannerColor: const Color(0xfffffbf0),
                      primaryColor: const Color(0xff15803d),
                      borderColor: const Color(0xffea580c),
                    ),
                    _buildThemePresetCard(
                      key: 'imperial_maroon',
                      title: 'शाही मरून & विंटेज',
                      subtitle: 'रीगल वाइन & गोल्ड',
                      bannerColor: const Color(0xfffff7ed),
                      primaryColor: const Color(0xff881337),
                      borderColor: const Color(0xffca8a04),
                    ),
                    _buildThemePresetCard(
                      key: 'slate_dark',
                      title: 'मॉडर्न स्लेट & डार्क',
                      subtitle: 'एग्जीक्यूटिव स्लेट',
                      bannerColor: const Color(0xfff8fafc),
                      primaryColor: const Color(0xff1e293b),
                      borderColor: const Color(0xff475569),
                    ),
                    _buildThemePresetCard(
                      key: 'custom',
                      title: '🎨 कस्टम थीम',
                      subtitle: 'अपनी पसंद के रंग',
                      bannerColor: Color(int.parse('0xff$customBannerBgHex')),
                      primaryColor: Color(int.parse('0xff$customPrimaryHex')),
                      borderColor: Color(int.parse('0xff$customBorderHex')),
                    ),
                  ],
                ),

                // Custom Colors Input if 'custom' is selected
                if (selectedColorTheme == 'custom') ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xfff8fafc),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xffcbd5e1)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('कस्टम कलर कोड (HEX):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: navy)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildColorInput(
                                label: 'वार्ड व फुटर रंग',
                                initialHex: customPrimaryHex,
                                onChanged: (v) => setState(() => customPrimaryHex = v),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildColorInput(
                                label: 'बैनर बैकग्राउंड',
                                initialHex: customBannerBgHex,
                                onChanged: (v) => setState(() => customBannerBgHex = v),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildColorInput(
                                label: 'गोल्ड रिंग / बॉर्डर',
                                initialHex: customBorderHex,
                                onChanged: (v) => setState(() => customBorderHex = v),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildColorInput(
                                label: 'प्रत्याशी नाम रंग',
                                initialHex: customTextHex,
                                onChanged: (v) => setState(() => customTextHex = v),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 14),

                // 5. Text Size Scaling Control
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.format_size_rounded, size: 18, color: navy),
                        const SizedBox(width: 6),
                        const Text('5. पर्ची टेक्स्ट साइज़ (Font Size Scale):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: navy)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xff0284c7).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${(_fontScaleFactor * 100).toInt()}%',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xff0284c7), fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildTextSizeChip('extra_small_70', 'बहुत छोटा (70%)', 0.70),
                      const SizedBox(width: 6),
                      _buildTextSizeChip('small_80', 'छोटा (80%)', 0.80),
                      const SizedBox(width: 6),
                      _buildTextSizeChip('small', 'मध्यम छोटा (90%)', 0.90),
                      const SizedBox(width: 6),
                      _buildTextSizeChip('medium', 'सामान्य (100%)', 1.00),
                      const SizedBox(width: 6),
                      _buildTextSizeChip('large', 'बड़ा (110%)', 1.10),
                      const SizedBox(width: 6),
                      _buildTextSizeChip('extra_large', 'अतिरिक्त बड़ा (120%)', 1.20),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                // Smooth Fine-Grained Slider Control (70% to 130%)
                Row(
                  children: [
                    const Text('70%', style: TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.bold)),
                    Expanded(
                      child: Slider(
                        value: _fontScaleFactor.clamp(0.70, 1.30),
                        min: 0.70,
                        max: 1.30,
                        divisions: 12,
                        label: '${(_fontScaleFactor * 100).toInt()}%',
                        activeColor: const Color(0xff0284c7),
                        onChanged: (val) {
                          setState(() {
                            customFontScale = double.parse(val.toStringAsFixed(2));
                            if (val <= 0.75) {
                              selectedTextScale = 'extra_small_70';
                            } else if (val <= 0.85) {
                              selectedTextScale = 'small_80';
                            } else if (val <= 0.95) {
                              selectedTextScale = 'small';
                            } else if (val <= 1.05) {
                              selectedTextScale = 'medium';
                            } else if (val <= 1.15) {
                              selectedTextScale = 'large';
                            } else {
                              selectedTextScale = 'extra_large';
                            }
                          });
                          _saveCampaignSettings();
                        },
                      ),
                    ),
                    const Text('130%', style: TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.check_circle_outline_rounded, size: 14, color: Color(0xff16a34a)),
                    const SizedBox(width: 4),
                    const Expanded(
                      child: Text('कार्ड डिज़ाइन एवं डेटा स्वतः सुरक्षित (Auto-Saved) रहेगा। बार-बार भरने की आवश्यकता नहीं।', style: TextStyle(fontSize: 11, color: Color(0xff15803d), fontWeight: FontWeight.w600)),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: EdgeInsets.zero),
                      onPressed: _resetCampaignSettings,
                      child: const Text('रीसेट करें', style: TextStyle(fontSize: 11, color: Colors.red)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text('⚡ ऑटो-फिट गारंटी: टेक्स्ट साइज़ 70% से 130% तक बदलने पर भी कार्ड में कोई टेक्स्ट या फोटो ओवरलैप नहीं होगा।', style: TextStyle(fontSize: 10.5, color: muted)),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('या पूर्व-निर्मित पूरा बैनर लगाएं (Full Banner):', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: navy)),
                    if (campaignBannerBytes != null || campaignBannerUrl != null)
                      TextButton.icon(
                        onPressed: () {
                          setState(() {
                            campaignBannerBytes = null;
                            campaignBannerUrl = null;
                          });
                          _saveCampaignSettings();
                        },
                        icon: const Icon(Icons.close, size: 14, color: Colors.red),
                        label: const Text('हटाएं', style: TextStyle(fontSize: 11, color: Colors.red)),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _handleBannerPickAndCrop,
                        icon: const Icon(Icons.image_outlined, size: 14),
                        label: const Text('बैनर चुनें', style: TextStyle(fontSize: 11)),
                      ),
                  ],
                ),
                if (campaignBannerBytes != null) ...[
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.memory(campaignBannerBytes!, height: 60, width: double.infinity, fit: BoxFit.cover),
                  ),
                ],
              ],
            ),
          ),
        ],

        // Custom rows and columns picker
        if (densityPreset == 'custom') ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xfff8fafc),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.tune_rounded, color: royalBlue, size: 18),
                    const SizedBox(width: 8),
                    const Text('कस्टम ग्रिड सेटिंग्स:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: navy)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: royalBlue, borderRadius: BorderRadius.circular(8)),
                      child: Text(
                        'कुल $totalVotersPerPage प्रति पेज',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text('कॉलम संख्या (Columns per Page):', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: navy)),
                const SizedBox(height: 8),
                Row(
                  children: [1, 2, 3, 4].map((c) {
                    final isC = columns == c;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: ChoiceChip(
                          label: Center(child: Text('$c Col')),
                          selected: isC,
                          selectedColor: royalBlue,
                          backgroundColor: Colors.white,
                          labelStyle: TextStyle(color: isC ? Colors.white : navy, fontWeight: isC ? FontWeight.bold : FontWeight.normal, fontSize: 12),
                          onSelected: (_) => setState(() => columns = c),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                const Text('प्रति पेज पंक्तियाँ (Rows per Page):', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: navy)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) {
                    final isR = rowsPerPage == r;
                    return ChoiceChip(
                      label: Text('$r पंक्तियाँ'),
                      selected: isR,
                      selectedColor: royalBlue,
                      backgroundColor: Colors.white,
                      labelStyle: TextStyle(color: isR ? Colors.white : navy, fontWeight: isR ? FontWeight.bold : FontWeight.normal, fontSize: 11.5),
                      onSelected: (_) => setState(() => rowsPerPage = r),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 12),
        // Live calculation banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xffeff6ff),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: royalBlue.withValues(alpha: 0.25)),
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_awesome_rounded, color: royalBlue, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '💡 लेआउट सारांश: 1 पेज पर $totalVotersPerPage मतदाता ($columns कॉलम × $rowsPerPage पंक्तियाँ)। 300 मतदाता केवल ${(300 / totalVotersPerPage).ceil()} पेज में पूरे हो जाएंगे!',
                  style: const TextStyle(color: royalBlue, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 22),

        const Text(
          '2. पेज का आकार (Paper Size):',
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

        const SizedBox(height: 22),

        const Text(
          '3. पेज ओरिएंटेशन (Orientation):',
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

        const SizedBox(height: 22),

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
                  _saveCampaignSettings();
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
              if (densityPreset == 'campaign_8') ...[
                const Divider(height: 16),
                _buildSummaryRow('प्रारूप:', 'प्रत्याशी चुनाव प्रचार पर्ची ($campaignCardsPerPage पर्ची/पेज) 🌟'),
                _buildSummaryRow('प्रत्याशी नाम:', candidateNameCtrl.text.trim().isNotEmpty ? candidateNameCtrl.text.trim() : 'लागू नहीं (सामान्य पर्ची)'),
                if (candidateTaglineCtrl.text.trim().isNotEmpty)
                  _buildSummaryRow('टैगलाइन:', '"${candidateTaglineCtrl.text.trim()}"'),
                _buildSummaryRow('बैनर फोटो:', (candidatePhotoBytes != null) ? 'शाही गोल्डन रिंग फ्रेम सेट है 👑' : ((campaignBannerBytes != null || campaignBannerUrl != null) ? 'कस्टम इमेज सेट है ✅' : 'मानक ग्राफिक बैनर ✅')),
              ],
              if (selectedParty != 'all') ...[
                const Divider(height: 16),
                _buildSummaryRow(
                  'पार्टी फ़िल्टर:',
                  selectedParty == 'congress'
                      ? 'कांग्रेस (INC) 🟢'
                      : selectedParty == 'bjp'
                          ? 'भाजपा (BJP) 🟠'
                          : selectedParty == 'undecided'
                              ? 'अनिर्णायक 🟣'
                              : selectedParty == 'nota'
                                  ? 'नोटा (NOTA) ⚪'
                                  : 'अन्य 🔵',
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Action Buttons
        // 1. Live Interactive PDF Preview (Direct In-App Viewer with Zoom & Pages)
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xff0284c7),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                onPressed: () => openPdfPreview(
                  context,
                  path: '/api/print/members.pdf',
                  jobName: printJobName,
                  query: printQueryParams,
                ),
                icon: const Icon(Icons.remove_red_eye_rounded, size: 22),
                label: const Text(
                  'प्रिंट प्रीव्यू देखें (Live PDF Preview) 👁️',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15.5),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 2. Direct Print Button
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

        const SizedBox(height: 20),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'एक्सेल (Excel) विकल्प',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: muted),
              ),
            ),
            Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 16),

        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xff16a34a),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: isDownloadingExcel ? null : _handleDownloadExcel,
                icon: isDownloadingExcel
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.table_view_rounded),
                label: Text(
                  isDownloadingExcel ? 'एक्सेल तैयार हो रहा है...' : 'Excel फ़ाइल डाउनलोड करें (.xlsx)',
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
                  side: const BorderSide(color: Color(0xff16a34a), width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: isSharingExcel ? null : _handleShareExcel,
                icon: isSharingExcel
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xff16a34a)))
                    : const Icon(Icons.share_rounded, color: Color(0xff16a34a)),
                label: Text(
                  isSharingExcel ? 'एक्सेल भेजा जा रहा है...' : 'Excel शेयर करें (WhatsApp / Share)',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xff16a34a)),
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

  Map<String, Color> _resolveCurrentThemeColors() {
    switch (selectedColorTheme) {
      case 'royal_blue':
        return {
          'primary': const Color(0xff1d4ed8),
          'bannerBg': const Color(0xfff0f7ff),
          'border': const Color(0xffd97706),
          'text': const Color(0xff1d4ed8),
          'badge': const Color(0xff2563eb),
        };
      case 'tiranga_green':
        return {
          'primary': const Color(0xff15803d),
          'bannerBg': const Color(0xfffffbf0),
          'border': const Color(0xffea580c),
          'text': const Color(0xff15803d),
          'badge': const Color(0xff16a34a),
        };
      case 'imperial_maroon':
        return {
          'primary': const Color(0xff881337),
          'bannerBg': const Color(0xfffff7ed),
          'border': const Color(0xffca8a04),
          'text': const Color(0xff881337),
          'badge': const Color(0xff9f1239),
        };
      case 'slate_dark':
        return {
          'primary': const Color(0xff1e293b),
          'bannerBg': const Color(0xfff8fafc),
          'border': const Color(0xff475569),
          'text': const Color(0xff0f172a),
          'badge': const Color(0xff334155),
        };
      case 'custom':
        Color parseHex(String hex, Color def) {
          try {
            final cleaned = hex.replaceAll('#', '').trim();
            if (cleaned.length == 6) {
              return Color(int.parse('0xff$cleaned'));
            }
          } catch (_) {}
          return def;
        }
        return {
          'primary': parseHex(customPrimaryHex, const Color(0xffb91c1c)),
          'bannerBg': parseHex(customBannerBgHex, const Color(0xfffffdf6)),
          'border': parseHex(customBorderHex, const Color(0xfff59e0b)),
          'text': parseHex(customTextHex, const Color(0xff1d4ed8)),
          'badge': parseHex(customPrimaryHex, const Color(0xffb91c1c)),
        };
      case 'saffron_crimson':
      default:
        return {
          'primary': const Color(0xffb91c1c),
          'bannerBg': const Color(0xfffffdf6),
          'border': const Color(0xfff59e0b),
          'text': const Color(0xffb91c1c),
          'badge': const Color(0xffdc2626),
        };
    }
  }

  double get _fontScaleFactor {
    if (customFontScale != 1.0) {
      return customFontScale;
    }
    switch (selectedTextScale) {
      case 'extra_small_70':
        return 0.70;
      case 'small_80':
        return 0.80;
      case 'small':
        return 0.90;
      case 'large':
        return 1.10;
      case 'extra_large':
        return 1.20;
      case 'medium':
      default:
        return 1.0;
    }
  }

  Widget _buildLiveCardPreviewWidget() {
    final theme = _resolveCurrentThemeColors();
    final primary = theme['primary']!;
    final bannerBg = theme['bannerBg']!;
    final borderCol = theme['border']!;
    final textCol = theme['text']!;
    final scale = _fontScaleFactor;
    final isPrimaryLight = primary.computeLuminance() > 0.55;
    final primaryTextColor = isPrimaryLight ? const Color(0xff0f172a) : Colors.white;

    final candidateName = candidateNameCtrl.text.trim().isNotEmpty
        ? candidateNameCtrl.text.trim()
        : 'रामेश्वर लाल जाट';
    final candidatePost = candidatePostCtrl.text.trim().isNotEmpty
        ? candidatePostCtrl.text.trim()
        : 'सरपंच पद प्रत्याशी';
    final candidateTagline = candidateTaglineCtrl.text.trim().isNotEmpty
        ? candidateTaglineCtrl.text.trim()
        : 'वार्ड के सर्वांगीण विकास के लिए आपका अपना कर्मठ प्रत्याशी';
    final candidatePhone = candidatePhoneCtrl.text.trim().isNotEmpty
        ? candidatePhoneCtrl.text.trim()
        : '9829858296';
    final candidateSlogan = candidateSloganCtrl.text.trim().isNotEmpty
        ? candidateSloganCtrl.text.trim()
        : 'को अपना अमूल्य मत देकर भारी बहुमत से विजयी बनावें।';
    final pollingStation = pollingStationCtrl.text.trim().isNotEmpty
        ? pollingStationCtrl.text.trim()
        : 'रा.उ.मा.वि. नाथडियास - कमरा नं 1';
    final pollingTime = pollingTimeCtrl.text.trim().isNotEmpty
        ? pollingTimeCtrl.text.trim()
        : 'मतदान समय : प्रातः 7 से सायं 6 बजे तक';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderCol, width: 2),
        boxShadow: [
          BoxShadow(
            color: primary.withValues(alpha: 0.12),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: primary,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.remove_red_eye_rounded, size: 16, color: Colors.white),
                const SizedBox(width: 6),
                const Text(
                  'लाइव पर्ची प्रीव्यू (Live WYSIWYG Preview)',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'फ़ॉन्ट ${(scale * 100).toInt()}% • $selectedColorTheme',
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          // Slip Card Body
          Padding(
            padding: const EdgeInsets.all(12),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderCol, width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Candidate Banner Header OR Official Election Slip Header
                  if (campaignBannerBytes != null)
                    ClipRRect(
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(10),
                        topRight: Radius.circular(10),
                      ),
                      child: Image.memory(
                        campaignBannerBytes!,
                        height: 70,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    )
                  else if (candidateName.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      decoration: BoxDecoration(
                        color: bannerBg,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(10),
                          topRight: Radius.circular(10),
                        ),
                        border: Border(bottom: BorderSide(color: borderCol, width: 1.5)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Candidate Photo in Gold Ring
                          Container(
                            width: 52,
                            height: 52,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: borderCol, width: 2),
                              color: Colors.white,
                              boxShadow: [
                                BoxShadow(
                                  color: borderCol.withValues(alpha: 0.3),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            child: ClipOval(
                              child: candidatePhotoBytes != null
                                  ? Image.memory(candidatePhotoBytes!, fit: BoxFit.cover)
                                  : Icon(Icons.person, size: 36, color: primary),
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Candidate Details
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  candidateName,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 15 * scale,
                                    color: textCol,
                                    letterSpacing: 0.3,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 1),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: primary,
                                        borderRadius: BorderRadius.circular(4),
                                        border: isPrimaryLight ? Border.all(color: const Color(0xff94a3b8), width: 1.0) : null,
                                      ),
                                      child: Text(
                                        candidatePost,
                                        style: TextStyle(
                                          color: primaryTextColor,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 10 * scale,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      '📞 $candidatePhone',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 10 * scale,
                                        color: primary,
                                      ),
                                    ),
                                  ],
                                ),
                                if (candidateTagline.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    candidateTagline,
                                    style: TextStyle(
                                      fontSize: 9.5 * scale,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xff475569),
                                      fontStyle: FontStyle.italic,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                                const SizedBox(height: 2),
                                Text(
                                  candidateSlogan,
                                  style: TextStyle(
                                    fontSize: 9 * scale,
                                    fontWeight: FontWeight.bold,
                                    color: primary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Symbol / Leader Photo in Ring
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: borderCol, width: 2),
                                  color: Colors.white,
                                  boxShadow: [
                                    BoxShadow(
                                      color: borderCol.withValues(alpha: 0.3),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                                child: ClipOval(
                                  child: symbolBytes != null
                                      ? Padding(
                                          padding: const EdgeInsets.all(4),
                                          child: Image.memory(symbolBytes!, fit: BoxFit.contain),
                                        )
                                      : (leaderPhotoBytes != null
                                          ? Image.memory(leaderPhotoBytes!, fit: BoxFit.cover)
                                          : Icon(Icons.how_to_vote, size: 30, color: borderCol)),
                                ),
                              ),
                              if (symbolBytes != null)
                                Text(
                                  'चुनाव चिह्न',
                                  style: TextStyle(
                                    fontSize: 8.5 * scale,
                                    fontWeight: FontWeight.bold,
                                    color: primary,
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
                      decoration: BoxDecoration(
                        color: const Color(0xfff8fafc),
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(10),
                          topRight: Radius.circular(10),
                        ),
                        border: Border(bottom: BorderSide(color: borderCol, width: 1.0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Container(
                            height: 3,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: const Color(0xff1e40af),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          const SizedBox(height: 5),
                          const Text(
                            'राजस्थान राज्य निर्वाचन आयोग | मतदाता सूचना पर्ची',
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xff1e40af)),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'ग्राम पंचायत : ${selectedGramPanchayat ?? "नारायणखेड़ा"} (वार्ड संख्या : ${selectedWard ?? "5"})',
                            style: TextStyle(fontSize: 12.5 * scale, fontWeight: FontWeight.bold, color: const Color(0xff0f172a)),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'विधानसभा क्षेत्र सं. 179  |  भाग संख्या : ${selectedPart ?? "87"}',
                            style: TextStyle(fontSize: 8.5 * scale, color: const Color(0xff475569), fontWeight: FontWeight.w500),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),

                  // Tear-off dashed divider
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 8),
                    child: Row(
                      children: List.generate(
                        40,
                        (index) => Expanded(
                          child: Container(
                            color: index % 2 == 0 ? Colors.transparent : const Color(0xff94a3b8),
                            height: 1,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const Text(
                    '--- मतदान तिथि से पूर्व बांटी गयी पर्ची, मतदान केन्द्र में जाने से पहले ऊपर का हिस्सा फाड़ दें ---',
                    style: TextStyle(fontSize: 7, color: Color(0xff64748b)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),

                  // Voter Details Box (Realistic 3-Column Layout: Details + Photo + Ward Box)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    color: Colors.white,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Col 1: Serial + EPIC + Voter typography
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Serial + EPIC Box
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xfff1f5f9),
                                      borderRadius: BorderRadius.circular(3),
                                      border: Border.all(color: const Color(0xff475569), width: 0.8),
                                    ),
                                    child: Text(
                                      '1',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10 * scale, color: const Color(0xff0f172a)),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xfff8fafc),
                                        borderRadius: BorderRadius.circular(3),
                                        border: Border.all(color: const Color(0xff334155), width: 0.8),
                                      ),
                                      child: Text(
                                        'SNE1889906',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 9.5 * scale, color: const Color(0xff0f172a)),
                                        textAlign: TextAlign.center,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 5),

                              // Name
                              RichText(
                                text: TextSpan(
                                  children: [
                                    TextSpan(text: 'नाम: ', style: TextStyle(fontSize: 10 * scale, fontWeight: FontWeight.bold, color: const Color(0xff1e293b))),
                                    TextSpan(text: 'भैरू लाल', style: TextStyle(fontSize: 10.5 * scale, fontWeight: FontWeight.bold, color: Colors.black)),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 2),

                              // Guardian (if selected)
                              if (selectedFields.contains('guardianName') || selectedFields.isEmpty) ...[
                                RichText(
                                  text: TextSpan(
                                    children: [
                                      TextSpan(text: 'पिता का नाम: ', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: const Color(0xff1e293b))),
                                      TextSpan(text: 'लड्डू लाल', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: Colors.black)),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 2),
                              ],

                              // House (if selected)
                              if (selectedFields.contains('houseNumber') || selectedFields.isEmpty) ...[
                                RichText(
                                  text: TextSpan(
                                    children: [
                                      TextSpan(text: 'मकान संख्या: ', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: const Color(0xff1e293b))),
                                      TextSpan(text: '235', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: Colors.black)),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 2),
                              ],

                              // Age & Gender (if selected)
                              if (selectedFields.contains('age') || selectedFields.contains('gender') || selectedFields.isEmpty) ...[
                                RichText(
                                  text: TextSpan(
                                    children: [
                                      TextSpan(text: 'आयु: ', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: const Color(0xff1e293b))),
                                      TextSpan(text: '24   ', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: Colors.black)),
                                      TextSpan(text: 'लिंग: ', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: const Color(0xff1e293b))),
                                      TextSpan(text: 'पुरुष', style: TextStyle(fontSize: 9.0 * scale, fontWeight: FontWeight.bold, color: Colors.black)),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 2),
                              ],

                              // Mobile (if selected)
                              if (selectedFields.contains('mobile')) ...[
                                Text(
                                  '📱 9829012345',
                                  style: TextStyle(fontSize: 8.8 * scale, fontWeight: FontWeight.bold, color: const Color(0xff15803d)),
                                ),
                                const SizedBox(height: 2),
                              ],

                              // Caste (if selected)
                              if (selectedFields.contains('caste')) ...[
                                Text(
                                  'जाति: ब्राह्मण',
                                  style: TextStyle(fontSize: 8.5 * scale, fontWeight: FontWeight.bold, color: const Color(0xff4338ca)),
                                ),
                                const SizedBox(height: 2),
                              ],

                              // Village (if selected)
                              if (selectedFields.contains('village')) ...[
                                Text(
                                  'गाँव: नाथडियास',
                                  style: TextStyle(fontSize: 8.5 * scale, fontWeight: FontWeight.bold, color: const Color(0xff334155)),
                                ),
                                const SizedBox(height: 2),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),

                        // Col 2: Voter Photo Box
                        Container(
                          width: 46,
                          height: 58,
                          decoration: BoxDecoration(
                            color: const Color(0xfff1f5f9),
                            borderRadius: BorderRadius.circular(3),
                            border: Border.all(color: const Color(0xffcbd5e1), width: 1.0),
                          ),
                          child: const Icon(Icons.person, color: Color(0xff94a3b8), size: 36),
                        ),
                        const SizedBox(width: 6),

                        // Col 3: Dedicated Ward & Polling Station Box (Auto-Contrast applied!)
                        Container(
                          width: 82,
                          padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 4),
                          decoration: BoxDecoration(
                            color: primary,
                            borderRadius: BorderRadius.circular(4),
                            border: isPrimaryLight ? Border.all(color: const Color(0xff475569), width: 1.0) : null,
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'वार्ड नंबर',
                                style: TextStyle(
                                  color: primaryTextColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 8 * scale,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              Text(
                                '${selectedWard ?? "5"}',
                                style: TextStyle(
                                  color: primaryTextColor,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 16 * scale,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              Container(
                                margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                height: 0.8,
                                color: isPrimaryLight ? const Color(0xff94a3b8) : const Color(0xfffef08a),
                              ),
                              Text(
                                'मतदान केंद्र',
                                style: TextStyle(
                                  color: primaryTextColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 7 * scale,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              Text(
                                pollingStation.isNotEmpty ? pollingStation : 'राजकीय विद्यालय, तेज्याखेड़ी',
                                style: TextStyle(
                                  color: primaryTextColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 6.8 * scale,
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Polling Time & Serial Footer Bar (Auto-Contrast applied!)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: primary,
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(10),
                        bottomRight: Radius.circular(10),
                      ),
                      border: isPrimaryLight ? const Border(top: BorderSide(color: Color(0xff64748b), width: 0.8)) : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          pollingTime,
                          style: TextStyle(
                            color: primaryTextColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 8.8 * scale,
                          ),
                        ),
                        Text(
                          '1',
                          style: TextStyle(
                            color: primaryTextColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 8.5 * scale,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThemePresetCard({
    required String key,
    required String title,
    required String subtitle,
    required Color bannerColor,
    required Color primaryColor,
    required Color borderColor,
  }) {
    final isSelected = selectedColorTheme == key;
    final isPrimLight = primaryColor.computeLuminance() > 0.6;
    final activeThemeColor = isPrimLight ? const Color(0xff2563eb) : primaryColor;
    return InkWell(
      onTap: () { setState(() => selectedColorTheme = key); _saveCampaignSettings(); },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 175,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? activeThemeColor.withValues(alpha: 0.08) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? activeThemeColor : const Color(0xffcbd5e1),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Color Swatches
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: borderColor, width: 1.5),
                color: bannerColor,
              ),
              child: Center(
                child: Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    color: primaryColor,
                    shape: BoxShape.circle,
                    border: isPrimLight ? Border.all(color: const Color(0xff94a3b8), width: 1) : null,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                      color: isSelected ? activeThemeColor : const Color(0xff0f172a),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 9.5, color: Color(0xff64748b)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildColorInput({
    required String label,
    required String initialHex,
    required ValueChanged<String> onChanged,
  }) {
    Color previewColor;
    try {
      previewColor = Color(int.parse('0xff$initialHex'));
    } catch (_) {
      previewColor = Colors.grey;
    }
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: previewColor,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: const Color(0xff94a3b8)),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextFormField(
            initialValue: initialHex,
            decoration: InputDecoration(
              labelText: label,
              prefixText: '#',
              isDense: true,
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            ),
            onChanged: (val) {
              final clean = val.replaceAll('#', '').trim();
              if (clean.length == 6) onChanged(clean);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTextSizeChip(String key, String label, double scaleVal) {
    final isSelected = (selectedTextScale == key) || (_fontScaleFactor == scaleVal);
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selected: isSelected,
      selectedColor: const Color(0xff0284c7).withValues(alpha: 0.18),
      onSelected: (_) {
        setState(() {
          selectedTextScale = key;
          customFontScale = scaleVal;
        });
        _saveCampaignSettings();
      },
      visualDensity: VisualDensity.compact,
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
