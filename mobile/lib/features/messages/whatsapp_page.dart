import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/file_saver.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/phone_contacts_bridge.dart';
import '../../core/theme.dart';
import '../../utils/excel_generator.dart';
import '../contacts/device_phonebook_page.dart';
import 'bulk_message_page.dart';

class WhatsAppPage extends StatefulWidget {
  const WhatsAppPage({super.key, this.initialEventType = 'general'});

  final String initialEventType;

  @override
  State<WhatsAppPage> createState() => _WhatsAppPageState();
}

class _WhatsAppPageState extends State<WhatsAppPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _messageController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _customPhoneController = TextEditingController();
  String _customContactName = 'साथी';

  // Media
  String? _pickedImagePath;
  Uint8List? _pickedImageBytes;
  String? _pickedImageName;

  bool get _hasPickedImage =>
      _pickedImageBytes != null ||
      (_pickedImagePath != null && !kIsWeb && File(_pickedImagePath!).existsSync());

  // UI state
  bool _isComposerExpanded = false;
  bool _isFiltersExpanded = false;
  bool _isSending = false;

  // Live Server Campaign State & Tracking
  Map<String, dynamic>? _activeCampaign;
  bool _isLoadingCampaignStatus = false;
  Timer? _campaignPollTimer;

  // Filter selections
  String _sourceFilter = 'all'; // 'all', 'phone', 'app', 'fav'
  bool _antiBanRotatingGreetings = true;
  String _selectedSamiti = 'all';
  String _selectedGramPanchayat = 'all';
  String _selectedVillage = 'all';
  String _selectedWard = 'all';
  String _selectedPart = 'all';
  String _selectedCaste = 'all';
  String _selectedParty = 'all'; // 'all', 'congress', 'bjp', 'nota', 'other'
  String _selectedGender = 'all'; // 'all', 'male', 'female', 'other'
  String _selectedReligion = 'all'; // 'all', 'hindu', 'muslim'
  bool _onlyWithMobile = true;

  static bool isMuslim(Map<String, dynamic> v) {
    final c = (v['caste'] ?? '').toString();
    final s = (v['surname'] ?? '').toString();
    final n = (v['name'] ?? v['fullName'] ?? '').toString();
    final pattern = RegExp(
      r'(मुस्लिम|पठान|कुरैशी|क़ुरैशी|शेख|अंसारी|सिलावट|पिंजारा|सैयद|काजी|मोह|खान|खां|अली|हुसैन|इरफान|अब्दुल|साकिर|शब्बीर|जावेद|रिजवान|फारुक|रफीक|सलीम|शकील|अकील|मुबारक|मुस्ताक|मुश्ताक|इस्माइल|इब्राहिम|साजिद|शाहिद|नसीर|बशीर|इकबाल|अकबर)',
      caseSensitive: false,
    );
    return pattern.hasMatch(c) || pattern.hasMatch(s) || pattern.hasMatch(n);
  }

  int _phoneCount = 0;
  int _appCount = 0;
  int _favCount = 0;

  static const List<String> _antiBanGreetings = [
    'नमस्कार',
    'सादर प्रणाम',
    'राम-राम',
    'नमस्ते',
    'जय श्री राम',
  ];

  // Options from DB
  List<Map<String, dynamic>> _samitiOptions = [];
  List<Map<String, dynamic>> _gramPanchayatOptions = [];
  List<Map<String, dynamic>> _villageOptions = [];
  List<Map<String, dynamic>> _wardOptions = [];
  List<Map<String, dynamic>> _partOptions = [];
  List<Map<String, dynamic>> _casteOptions = [];

  // Voters
  List<Map<String, dynamic>> _voters = [];
  bool _loadingVoters = false;
  final Set<String> _selectedVoterIds = {};

  // Quick message presets
  static const Map<String, String> _presets = {
    'सामान्य': 'नमस्कार {{name}} जी,\n\nआशा है आप सपरिवार सकुशल होंगे। आपके निरंतर सहयोग व स्नेह के लिए हार्दिक धन्यवाद।',
    'बधाई/शुभकामनाएँ': 'हार्दिक शुभकामनाएँ {{name}} जी! 💐\nईश्वर से आपके सुख, उत्तम स्वास्थ्य एवं उज्ज्वल भविष्य की कामना करते हैं।',
    'मतदान अपील': 'सादर प्रणाम {{name}} जी,\n\nलोकतंत्र के महापर्व में अपने अमूल्य मत का प्रयोग अवश्य करें। आपका एक वोट क्षेत्र के विकास के लिए महत्वपूर्ण है।\nवार्ड/भाग: {{ward}}',
    'निमंत्रण/कार्यक्रम': 'सादर प्रणाम {{name}} जी,\n\nआपको हमारे आगामी विशेष कार्यक्रम में सादर आमंत्रित किया जाता है।\nस्थान: {{village}}\nकृपया सपरिवार पधारकर अनुग्रहित करें।',
    'हाथ (Congress)': 'सादर प्रणाम {{name}} जी,\n\nक्षेत्र के सर्वांगीण विकास व जनकल्याण के लिए कांग्रेस पार्टी को अपना अमूल्य मत व आशीर्वाद दें।\nचुनाव चिन्ह: ✋ हाथ का निशान',
    'कमल (BJP)': 'सादर प्रणाम {{name}} जी,\n\nसशक्त भारत व निरंतर विकास के लिए भारतीय जनता पार्टी को अपना बहुमूल्य मत व आशीर्वाद प्रदान करें।\nचुनाव चिन्ह: 🪷 कमल का फूल',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _messageController.text = _presets['सामान्य']!;
    PhoneContactsBridge.fetchDeviceContacts().then((_) {
      if (mounted) setState(() {});
    });
    _customPhoneController.addListener(_onCustomPhoneChanged);
    _loadAllFilters();
    _loadActiveCampaign();
    _campaignPollTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (mounted) _loadActiveCampaign();
    });
  }

  void _onCustomPhoneChanged() {
    final raw = _customPhoneController.text.trim();
    final clean = raw.replaceAll(RegExp(r'\D'), '');
    if (clean.length >= 10) {
      final resolved = PhoneContactsBridge.resolveNameForNumber(clean);
      if (resolved.isNotEmpty && resolved != 'साथी' && resolved != _customContactName) {
        setState(() => _customContactName = resolved);
      }
    }
  }

  @override
  void dispose() {
    _campaignPollTimer?.cancel();
    _tabController.dispose();
    _messageController.dispose();
    _searchController.dispose();
    _customPhoneController.removeListener(_onCustomPhoneChanged);
    _customPhoneController.dispose();
    super.dispose();
  }

  Future<void> _loadActiveCampaign() async {
    try {
      final res = await api.list('/api/messages/history');
      if (res.isNotEmpty) {
        final campaigns = <Map<String, dynamic>>[];
        for (final item in res) {
          if (item is Map) {
            campaigns.add(Map<String, dynamic>.from(item));
          }
        }
        if (campaigns.isNotEmpty) {
          final active = campaigns.firstWhere(
            (c) => ['running', 'scheduled', 'paused'].contains(c['status']),
            orElse: () => campaigns.first,
          );
          if (mounted) {
            setState(() {
              _activeCampaign = active;
            });
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _controlCampaign(String id, String action) async {
    setState(() => _isLoadingCampaignStatus = true);
    try {
      await api.post('/api/messages/campaigns/$id/control', {'action': action});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(action == 'pause'
                ? '⏸️ अभियान रोक दिया गया।'
                : (action == 'resume' ? '▶️ अभियान फिर से शुरू किया गया।' : '⏹️ अभियान रद्द कर दिया गया।')),
            backgroundColor: action == 'cancel' ? Colors.redAccent : const Color(0xff16a34a),
          ),
        );
      }
      await _loadActiveCampaign();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('त्रुटि: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingCampaignStatus = false);
    }
  }

  Future<void> _loadAllFilters() async {
    await Future.wait([
      _loadSamitiOptions(),
      _loadGramPanchayatOptions(),
      _loadVillageOptions(),
      _loadWardOptions(),
      _loadPartOptions(),
      _loadCasteOptions(),
    ]);
    if (mounted) {
      _fetchVoters();
    }
  }

  Future<void> _loadSamitiOptions() async {
    try {
      final dynamic res = await api.get('/api/members/field-values?field=samiti&limit=100');
      if (res is Map && res['items'] is List) {
        _samitiOptions = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
      }
    } catch (_) {}
  }

  Future<void> _loadGramPanchayatOptions() async {
    try {
      final q = <String, String>{'field': 'panchayat', 'limit': '300'};
      if (_selectedSamiti != 'all') q['samiti'] = _selectedSamiti;
      final dynamic res = await api.get('/api/members/field-values?${Uri(queryParameters: q).query}');
      if (res is Map && res['items'] is List) {
        _gramPanchayatOptions = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
      }
    } catch (_) {}
  }

  Future<void> _loadVillageOptions() async {
    try {
      final q = <String, String>{'field': 'village', 'limit': '300'};
      if (_selectedSamiti != 'all') q['samiti'] = _selectedSamiti;
      if (_selectedGramPanchayat != 'all') q['gramPanchayat'] = _selectedGramPanchayat;
      final dynamic res = await api.get('/api/members/field-values?${Uri(queryParameters: q).query}');
      if (res is Map && res['items'] is List) {
        _villageOptions = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
      }
    } catch (_) {}
  }

  Future<void> _loadWardOptions() async {
    try {
      final q = <String, String>{'field': 'ward', 'limit': '300'};
      if (_selectedSamiti != 'all') q['samiti'] = _selectedSamiti;
      if (_selectedGramPanchayat != 'all') q['gramPanchayat'] = _selectedGramPanchayat;
      if (_selectedVillage != 'all') q['village'] = _selectedVillage;
      final dynamic res = await api.get('/api/members/field-values?${Uri(queryParameters: q).query}');
      if (res is Map && res['items'] is List) {
        _wardOptions = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
        _wardOptions.sort((a, b) {
          final aNum = int.tryParse('${a['value']}') ?? 0;
          final bNum = int.tryParse('${b['value']}') ?? 0;
          return aNum.compareTo(bNum);
        });
      }
    } catch (_) {}
  }

  Future<void> _loadPartOptions() async {
    try {
      final q = <String, String>{'field': 'partNumber', 'limit': '300'};
      if (_selectedSamiti != 'all') q['samiti'] = _selectedSamiti;
      if (_selectedGramPanchayat != 'all') q['gramPanchayat'] = _selectedGramPanchayat;
      if (_selectedVillage != 'all') q['village'] = _selectedVillage;
      final dynamic res = await api.get('/api/members/field-values?${Uri(queryParameters: q).query}');
      if (res is Map && res['items'] is List) {
        _partOptions = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
        _partOptions.sort((a, b) {
          final aNum = int.tryParse('${a['value']}') ?? 0;
          final bNum = int.tryParse('${b['value']}') ?? 0;
          return aNum.compareTo(bNum);
        });
      }
    } catch (_) {}
  }

  Future<void> _loadCasteOptions() async {
    try {
      final qParams = <String, String>{
        'field': 'caste',
        'limit': '500',
      };
      if (_selectedSamiti != 'all') qParams['tehsil'] = _selectedSamiti;
      if (_selectedGramPanchayat != 'all') qParams['gramPanchayat'] = _selectedGramPanchayat;
      if (_selectedVillage != 'all') qParams['village'] = _selectedVillage;
      if (_selectedWard != 'all') qParams['wardNumber'] = _selectedWard;
      if (_selectedPart != 'all') qParams['partNumber'] = _selectedPart;

      final dynamic res = await api.getQuery('/api/members/field-values', qParams);
      if (res is Map && res['items'] is List) {
        _casteOptions = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
      }
    } catch (_) {}
  }

  Future<void> _fetchVoters() async {
    setState(() => _loadingVoters = true);
    try {
      // 1. Fetch Phonebook Contacts from Device Bridge
      List<Map<String, dynamic>> phoneItems = [];
      try {
        final rawPhoneList = await PhoneContactsBridge.fetchDeviceContacts();
        for (final c in rawPhoneList) {
          final phones = (c['phones'] as List?) ?? [];
          final primaryPhone = phones.isNotEmpty ? '${phones[0]['number'] ?? ''}'.trim() : '';
          final addrs = (c['addresses'] as List?) ?? [];
          final location = addrs.isNotEmpty ? '${addrs[0]['city'] ?? addrs[0]['address'] ?? ''}'.trim() : '';
          final cId = '${c['id'] ?? ''}';
          final displayName = '${c['displayName'] ?? ''}'.trim();
          if (primaryPhone.isNotEmpty) {
            phoneItems.add({
              '_id': 'phone_$cId',
              'source': 'phone',
              'name': displayName.isNotEmpty ? displayName : primaryPhone,
              'mobile': primaryPhone,
              'village': location,
              'isPhoneContact': true,
              'rawContact': c,
            });
          }
        }
      } catch (e) {
        debugPrint('Phone contacts fetch error: $e');
      }

      // 2. Fetch App Voters from API or Offline Cache
      List<Map<String, dynamic>> appItems = [];
      try {
        final queryParams = <String, String>{
          'limit': '3000',
          'paged': 'false',
        };
        if (_onlyWithMobile) queryParams['hasMobile'] = 'true';
        if (_selectedSamiti != 'all') queryParams['tehsil'] = _selectedSamiti;
        if (_selectedGramPanchayat != 'all') queryParams['gramPanchayat'] = _selectedGramPanchayat;
        if (_selectedVillage != 'all') queryParams['village'] = _selectedVillage;
        if (_selectedWard != 'all') queryParams['wardNumber'] = _selectedWard;
        if (_selectedPart != 'all') queryParams['partNumber'] = _selectedPart;
        if (_selectedCaste != 'all') queryParams['caste'] = _selectedCaste;
        if (_selectedParty != 'all') queryParams['partyPreference'] = _selectedParty;
        if (_selectedGender != 'all') queryParams['gender'] = _selectedGender;
        if (_selectedReligion != 'all') queryParams['religion'] = _selectedReligion;
        final q = _searchController.text.trim();
        if (q.isNotEmpty) queryParams['q'] = q;

        final dynamic res = await api.get('/api/members?${Uri(queryParameters: queryParams).query}');
        if (res is List) {
          appItems = res.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        } else if (res is Map && res['items'] is List) {
          appItems = (res['items'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      } catch (_) {
        try {
          final cached = await OfflineVoterCache.read();
          appItems = cached.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        } catch (_) {}
      }

      // Additional Client-side party filter guarantee
      if (_selectedParty != 'all') {
        appItems = appItems.where((v) {
          final p = (v['partyPreference'] ?? '').toString().toLowerCase().trim();
          if (_selectedParty == 'other') {
            return p == 'other' || p == 'अन्य';
          }
          return p == _selectedParty.toLowerCase();
        }).toList();
      }

      for (final v in appItems) {
        v['source'] ??= 'app';
      }

      // 3. Count categories
      final phoneTotal = phoneItems.length;
      final appTotal = appItems.length;
      final favTotal = appItems.where((v) => v['isFavorite'] == true).length;

      // 4. Filter and Combine based on _sourceFilter
      List<Map<String, dynamic>> combined = [];
      final q = _searchController.text.trim().toLowerCase();

      if (_sourceFilter == 'phone') {
        combined = phoneItems;
      } else if (_sourceFilter == 'app') {
        combined = appItems;
      } else if (_sourceFilter == 'fav') {
        combined = appItems.where((v) => v['isFavorite'] == true).toList();
      } else {
        // 'all' -> Phone + App (merged with phonebook precedence for names)
        final seenNumbers = <String>{};
        for (final v in appItems) {
          final mob = PhoneContactsBridge.normalize10Digit('${v['mobile'] ?? ''}');
          if (mob.isNotEmpty) seenNumbers.add(mob);
          combined.add(v);
        }
        for (final p in phoneItems) {
          final mob = PhoneContactsBridge.normalize10Digit('${p['mobile'] ?? ''}');
          if (mob.isNotEmpty && !seenNumbers.contains(mob)) {
            combined.add(p);
          }
        }
      }

      // Search query filter for phone contacts too
      if (q.isNotEmpty) {
        combined = combined.where((v) {
          final n = '${v['name'] ?? ''}'.toLowerCase();
          final m = '${v['mobile'] ?? ''}'.toLowerCase();
          final l = '${v['village'] ?? ''}'.toLowerCase();
          return n.contains(q) || m.contains(q) || l.contains(q);
        }).toList();
      }

      if (_onlyWithMobile) {
        combined = combined.where((v) => '${v['mobile'] ?? ''}'.trim().isNotEmpty).toList();
      }

      if (_selectedGender != 'all') {
        combined = combined.where((v) {
          final g = (v['gender'] ?? '').toString().toLowerCase().trim();
          if (_selectedGender == 'male') {
            return g == 'male' || g == 'm' || g == 'पुरुष' || g == 'पुरूष';
          } else if (_selectedGender == 'female') {
            return g == 'female' || g == 'f' || g == 'महिला' || g == 'स्त्री';
          }
          return true;
        }).toList();
      }

      if (_selectedReligion != 'all') {
        combined = combined.where((v) {
          final muslim = isMuslim(v);
          if (_selectedReligion == 'muslim') return muslim;
          if (_selectedReligion == 'hindu') return !muslim;
          return true;
        }).toList();
      }

      if (mounted) {
        setState(() {
          _voters = combined;
          _phoneCount = phoneTotal;
          _appCount = appTotal;
          _favCount = favTotal;
          _loadingVoters = false;
          _selectedVoterIds.clear();
          for (final v in _voters) {
            final mob = (v['mobile'] ?? '').toString().trim();
            final id = (v['_id'] ?? '').toString();
            if (mob.isNotEmpty && id.isNotEmpty) {
              _selectedVoterIds.add(id);
            }
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingVoters = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Voters लोड नहीं हो सके: $e')),
        );
      }
    }
  }

  Future<void> _openCastePicker() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _SearchableCasteBottomSheet(
        casteOptions: _casteOptions,
        selectedCaste: _selectedCaste,
      ),
    );
    if (selected != null && mounted) {
      setState(() => _selectedCaste = selected);
      _fetchVoters();
    }
  }

  Future<void> _pickImage() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );
      if (result != null && result.files.isNotEmpty) {
        final picked = result.files.first;
        final name = picked.name;
        Uint8List? rawBytes = picked.bytes;
        String? path;
        if (!kIsWeb) {
          try {
            path = picked.path;
            if (rawBytes == null && path != null && File(path).existsSync()) {
              rawBytes = File(path).readAsBytesSync();
            }
          } catch (_) {}
        }

        if (rawBytes != null && rawBytes.isNotEmpty) {
          String finalPath = path ?? '';
          if (!kIsWeb) {
            try {
              final tempDir = await getTemporaryDirectory();
              final ext = name.contains('.') ? name.split('.').last : 'jpg';
              final localCopy = File('${tempDir.path}/whatsapp_poster_${DateTime.now().millisecondsSinceEpoch}.$ext');
              await localCopy.writeAsBytes(rawBytes);
              finalPath = localCopy.path;
            } catch (_) {}
          }

          setState(() {
            _pickedImageBytes = rawBytes;
            _pickedImagePath = finalPath.isNotEmpty ? finalPath : path;
            _pickedImageName = name;
          });

          if (mounted) {
            final sizeKb = (rawBytes.length / 1024).toStringAsFixed(1);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('📷 फोटो/पोस्टर तैयार है: $name ($sizeKb KB)'),
                backgroundColor: const Color(0xff16a34a),
                duration: const Duration(seconds: 2),
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('फोटो नहीं चुनी जा सकी: $e')),
        );
      }
    }
  }

  void _removeImage() {
    setState(() {
      _pickedImagePath = null;
      _pickedImageBytes = null;
      _pickedImageName = null;
    });
  }

  String _renderMessage(Map<String, dynamic>? voter, {int? sequenceIndex}) {
    String msg = _messageController.text;
    final mobile = (voter?['mobile'] ?? '').toString().trim();
    final rawName = (voter?['name'] ?? voter?['fullName'] ?? '').toString().trim();
    final resolvedName = PhoneContactsBridge.resolveNameForNumber(
      mobile,
      rawName.isNotEmpty && rawName != 'साथी' ? rawName : null,
    );
    final displayName = (resolvedName.isNotEmpty && resolvedName != 'साथी')
        ? resolvedName
        : (rawName.isNotEmpty && rawName != 'साथी' ? rawName : 'साथी');
    final village = (voter?['village'] ?? voter?['gramPanchayat'] ?? '').toString().trim();
    final ward = (voter?['wardNumber'] ?? voter?['partNumber'] ?? '').toString().trim();
    final guardian = (voter?['guardianName'] ?? '').toString().trim();

    msg = msg.replaceAll('{{name}}', displayName);
    msg = msg.replaceAll('{{village}}', village);
    msg = msg.replaceAll('{{ward}}', ward);
    msg = msg.replaceAll('{{guardian}}', guardian);

    // Anti-ban greeting variation:
    if (_antiBanRotatingGreetings && sequenceIndex != null) {
      final greeting = _antiBanGreetings[sequenceIndex % _antiBanGreetings.length];
      for (final g in _antiBanGreetings) {
        if (msg.startsWith(g)) {
          msg = msg.replaceFirst(g, greeting);
          break;
        }
      }
    }
    return msg;
  }

  Future<void> _sendToSingleVoter(Map<String, dynamic> voter, {bool forceDirectChat = false}) async {
    if (_isSending) return;
    final mobile = (voter['mobile'] ?? '').toString().replaceAll(RegExp(r'\D'), '');
    final name = (voter['name'] ?? voter['fullName'] ?? 'साथी').toString().trim();
    final resolvedName = PhoneContactsBridge.resolveNameForNumber(mobile, name);
    final rendered = _renderMessage(voter);

    if (mobile.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('इस मतदाता का मोबाइल नंबर दर्ज नहीं है।')),
      );
      return;
    }

    _isSending = true;

    // Direct WhatsApp Chat mode
    if (forceDirectChat || !_hasPickedImage) {
      try {
        if (mounted) {
          await openWhatsApp(context, mobile, message: rendered, recipientName: resolvedName);
        }
      } finally {
        _isSending = false;
      }
      return;
    }

    // Photo + Caption Share mode
    try {
      await Clipboard.setData(ClipboardData(text: mobile));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('फोटो तैयार है! $resolvedName का नंबर ($mobile) कॉपी हो गया। WhatsApp में सर्च/पेस्ट करें।'),
                ),
              ],
            ),
            backgroundColor: const Color(0xff16a34a),
            duration: const Duration(seconds: 4),
          ),
        );
      }

      final ext = (_pickedImageName ?? _pickedImagePath ?? '').toLowerCase();
      final mime = ext.endsWith('.png') ? 'image/png' : 'image/jpeg';
      final xFile = _pickedImageBytes != null
          ? XFile.fromData(_pickedImageBytes!, mimeType: mime, name: _pickedImageName ?? 'poster.jpg')
          : XFile(_pickedImagePath!, mimeType: mime, name: _pickedImageName ?? 'poster.jpg');
      final textToSend = rendered.trim().isNotEmpty ? rendered : null;

      await SharePlus.instance.share(
        ShareParams(
          text: textToSend,
          files: [xFile],
          subject: 'मतदाता संदेश - $resolvedName',
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('फोटो शेयर नहीं हो सका: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      _isSending = false;
    }
  }

  Future<void> _shareDirectToWhatsApp() async {
    final rendered = _renderMessage(null);
    final textToSend = rendered.trim().isNotEmpty ? rendered : null;
    if (_hasPickedImage) {
      try {
        final ext = (_pickedImageName ?? _pickedImagePath ?? '').toLowerCase();
        final mime = ext.endsWith('.png') ? 'image/png' : 'image/jpeg';
        final xFile = _pickedImageBytes != null
            ? XFile.fromData(_pickedImageBytes!, mimeType: mime, name: _pickedImageName ?? 'poster.jpg')
            : XFile(_pickedImagePath!, mimeType: mime, name: _pickedImageName ?? 'poster.jpg');

        await SharePlus.instance.share(
          ShareParams(
            text: textToSend,
            files: [xFile],
            subject: 'WhatsApp संदेश',
          ),
        );
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('शेयर नहीं हो सका: $e')),
          );
        }
      }
    } else if (textToSend != null) {
      await SharePlus.instance.share(
        ShareParams(text: textToSend),
      );
    }
  }

  void _startAssistedDispatch({bool autoMode = false}) {
    final targetVoters = _voters.where((v) {
      final id = (v['_id'] ?? '').toString();
      final mob = (v['mobile'] ?? '').toString().trim();
      return _selectedVoterIds.contains(id) && mob.isNotEmpty;
    }).toList();

    if (targetVoters.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया कम से कम एक मोबाइल नंबर वाले मतदाता को चुनें।')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AssistedDispatchSheet(
        voters: targetVoters,
        imagePath: _pickedImagePath,
        imageBytes: _pickedImageBytes,
        imageName: _pickedImageName,
        renderMessage: _renderMessage,
        antiBanGreetingsEnabled: _antiBanRotatingGreetings,
        startInAutoMode: autoMode,
      ),
    );
  }

  void _showBulkSendOptionModal() {
    final targetVoters = _voters.where((v) {
      final id = (v['_id'] ?? '').toString();
      final mob = (v['mobile'] ?? '').toString().trim();
      return _selectedVoterIds.contains(id) && mob.isNotEmpty;
    }).toList();

    if (targetVoters.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया कम से कम एक मोबाइल नंबर वाले मतदाता को चुनें।')),
      );
      return;
    }

    final totalCount = targetVoters.length;
    final genderText = _selectedGender == 'male'
        ? 'पुरुष '
        : (_selectedGender == 'female' ? 'महिला ' : '');
    final religionText = _selectedReligion == 'hindu'
        ? 'हिन्दू '
        : (_selectedReligion == 'muslim' ? 'मुस्लिम ' : '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xff16a34a).withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.send_rounded, color: Color(0xff16a34a), size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'बल्क संदेश माध्यम ($totalCount $genderText$religionTextमतदाता)',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xff1e293b)),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'संदेश भेजने का सुरक्षित तरीका चुनें:',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Option 1: Server Background Auto-Broadcast (Recommended & Zero Ban)
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  _sendViaServerQueue(targetVoters);
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xfff0fdf4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xff86efac), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xff16a34a).withValues(alpha: 0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xff16a34a),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      '🤖 सर्वर ऑटो-ब्रॉडकास्ट',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xff14532d)),
                                    ),
                                    SizedBox(width: 6),
                                    Chip(
                                      label: Text('100% सुरक्षित', style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                                      backgroundColor: Color(0xff16a34a),
                                      padding: EdgeInsets.zero,
                                      visualDensity: VisualDensity.compact,
                                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                  ],
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'हैंड्स-फ्री · बैकग्राउंड डिलीवरी · एंटी-बैन सुरक्षित',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xff15803d)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, color: Color(0xffbbf7d0)),
                      const SizedBox(height: 10),
                      _buildModalFeatureBullet(Icons.phonelink_erase_rounded, 'फ़ोन पर WhatsApp नहीं खुलेगा (स्क्रीन एकदम फ़्री रहेगी)'),
                      _buildModalFeatureBullet(Icons.shield_rounded, 'Anti-Ban सुरक्षा: 5-10s रैंडम डिले + हर 5 मैसेज बाद ब्रेक'),
                      _buildModalFeatureBullet(Icons.loop_rounded, 'डायनामिक ग्रीटिंग्स (नमस्कार/प्रणाम) ताकि स्पैम न लगे'),
                      if (_hasPickedImage)
                        _buildModalFeatureBullet(Icons.image_rounded, 'संलग्न फ़ोटो/पोस्टर भी सर्वर से साथ जाएगा'),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // Option 2: Phone WhatsApp App (Assisted)
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  _startAssistedDispatch(autoMode: true);
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xfff8fafc),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xffcbd5e1)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xff64748b),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.phone_android_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '📱 फ़ोन WhatsApp ऐप से 1-by-1 भेजें',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xff334155)),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'आपके फ़ोन का WhatsApp ऐप एक-एक करके खुलेगा',
                              style: TextStyle(fontSize: 11, color: Color(0xff64748b)),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Colors.grey),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModalFeatureBullet(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: const Color(0xff16a34a)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 11.5, color: Color(0xff1e293b), fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _reconnectWhatsAppSender(Map<String, dynamic> sender, List<Map<String, dynamic>> targetVoters) async {
    final senderId = sender['_id'];
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(color: Color(0xff16a34a)),
            SizedBox(width: 18),
            Expanded(child: Text('WhatsApp सर्वर से पुनः कनेक्ट हो रहा है...\nकृपया 5-10 सेकंड प्रतीक्षा करें।', style: TextStyle(fontSize: 13))),
          ],
        ),
      ),
    );

    try {
      await api.post('/api/messages/senders/$senderId/connect', {});
      bool isReady = false;
      for (int i = 0; i < 12; i++) {
        await Future.delayed(const Duration(seconds: 1));
        try {
          final statusRes = await api.get('/api/messages/senders/$senderId/status');
          if (statusRes['connectionStatus'] == 'connected') {
            isReady = true;
            break;
          }
        } catch (_) {}
      }

      if (!mounted) return;
      Navigator.pop(context); // close loading dialog

      if (isReady) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 WhatsApp सर्वर से सफलता पूर्वक कनेक्ट हो गया!'),
            backgroundColor: Color(0xff16a34a),
          ),
        );
        _sendViaServerQueue(targetVoters);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚠️ WhatsApp कनेक्ट नहीं हो सका। कृपया ऊपर QR आइकन दबाकर QR कोड स्कैन करें।'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('कनेक्ट त्रुटि: $e'), backgroundColor: Colors.redAccent),
      );
    }
  }

  Future<void> _sendViaServerQueue(List<Map<String, dynamic>> targetVoters) async {
    List<Map<String, dynamic>> senders = [];
    try {
      final res = await api.list('/api/messages/senders');
      senders = List<Map<String, dynamic>>.from(
        res.map((item) => Map<String, dynamic>.from(item)),
      );
    } catch (e) {
      debugPrint('Error fetching senders: $e');
    }

    final activeSenders = senders.where((s) => s['connectionStatus'] == 'connected').toList();
    if (activeSenders.isEmpty) {
      if (!mounted) return;
      final existingSender = senders.isNotEmpty ? senders.first : null;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 40),
          title: const Text('WhatsApp Sender कनेक्ट नहीं है'),
          content: Text(
            existingSender != null
                ? 'सर्वर बैकग्राउंड से 100% हैंड्स-फ्री और एंटी-बैन ऑटो-मैसेज (फोटो सहित) भेजने के लिए WhatsApp कनेक्ट होना आवश्यक है।\n\n'
                  'पंजीकृत नंबर: ${existingSender['name']} (${existingSender['displayNumber']})\n\n'
                  'आप नीचे "पुनः कनेक्ट करें" दबाकर बिना QR स्कैन किए पुनः कनेक्ट कर सकते हैं।'
                : 'सर्वर बैकग्राउंड से ऑटो-मैसेज भेजने के लिए कम से कम एक WhatsApp नंबर कनेक्ट होना चाहिए।\n\n'
                  '1. ऊपर दाईं ओर QR आइकन दबाकर QR स्कैन करें।\n'
                  '2. या फिर आप सीधे "फ़ोन ऐप से भेजें" विकल्प का उपयोग कर सकते हैं।',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('रद्द करें'),
            ),
            if (existingSender != null)
              FilledButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  _reconnectWhatsAppSender(existingSender, targetVoters);
                },
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('पुनः कनेक्ट करें'),
                style: FilledButton.styleFrom(backgroundColor: const Color(0xff16a34a)),
              ),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                _startAssistedDispatch(autoMode: true);
              },
              icon: const Icon(Icons.phone_android_rounded, size: 16),
              label: const Text('फ़ोन ऐप से भेजें'),
            ),
          ],
        ),
      );
      return;
    }

    final defaultSender = activeSenders.firstWhere(
      (s) => s['isDefault'] == true,
      orElse: () => activeSenders.first,
    );

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.verified_user_rounded, color: Color(0xff16a34a), size: 44),
        title: const Text('सर्वर ऑटो-ब्रॉडकास्ट शुरू करें?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'कुल ${targetVoters.length} मतदाताओं को बैकग्राउंड में संदेश भेजा जाएगा।',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xfff1f5f9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('• प्रेषक: ${defaultSender['name']} (${defaultSender['displayNumber']})',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const Text('• 100% Anti-Ban: 5-10s रैंडम मानवीय अंतराल',
                      style: TextStyle(fontSize: 12, color: Color(0xff16a34a), fontWeight: FontWeight.bold)),
                  const Text('• हर 5 संदेश बाद 45-70s कूल-डाउन ब्रेक',
                      style: TextStyle(fontSize: 12, color: Color(0xff16a34a), fontWeight: FontWeight.bold)),
                  const Text('• फ़ोन पर WhatsApp नहीं खुलेगा (स्क्रीन फ़्री)',
                      style: TextStyle(fontSize: 12, color: Color(0xff1e3a8a), fontWeight: FontWeight.bold)),
                  if (_hasPickedImage)
                    Text('• संलग्न पोस्टर / फ़ोटो साथ जाएगी (${_pickedImageName ?? "poster.jpg"}) 🖼️',
                        style: const TextStyle(fontSize: 12, color: Colors.purple, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('रद्द करें'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.rocket_launch_rounded, size: 16),
            label: const Text('Queue & Start'),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xff16a34a)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isSending = true);
    try {
      final customRecipientsWithNames = <Map<String, String>>[];
      final cleanNums = <String>[];

      for (final v in targetVoters) {
        final mob = (v['mobile'] ?? '').toString().replaceAll(RegExp(r'\D'), '');
        if (mob.length < 10) continue;
        final rawName = (v['name'] ?? v['fullName'] ?? '').toString().trim();
        final resName = PhoneContactsBridge.resolveNameForNumber(mob, rawName);
        final finalName = resName.isNotEmpty && resName != 'साथी' ? resName : (rawName.isNotEmpty ? rawName : 'साथी');
        if (!cleanNums.contains(mob)) {
          cleanNums.add(mob);
          customRecipientsWithNames.add({
            'mobile': mob,
            'name': finalName,
          });
        }
      }

      if (cleanNums.isEmpty) {
        throw 'कोई वैध 10-अंकों का मोबाइल नंबर नहीं मिला।';
      }

      final body = <String, dynamic>{
        'title': 'WhatsApp संदेश - ${DateFormat('dd MMM hh:mm a').format(DateTime.now())}',
        'message': _messageController.text.trim().isNotEmpty
            ? _messageController.text.trim()
            : _presets['सामान्य']!,
        'sender': '${defaultSender['_id']}',
        'eventType': 'general',
        'scheduledAt': DateTime.now().toUtc().toIso8601String(),
        'batchSize': 5,
        'intervalSeconds': 90,
        'messageDelaySeconds': 28,
        'dailyLimit': 400,
        'quietHoursStart': 20,
        'quietHoursEnd': 8,
        'recipientMode': 'custom',
        'customRecipients': cleanNums,
        'customRecipientsWithNames': customRecipientsWithNames,
      };

      if (_hasPickedImage) {
        try {
          Uint8List? bytes = _pickedImageBytes;
          if (bytes == null && _pickedImagePath != null && !kIsWeb && File(_pickedImagePath!).existsSync()) {
            bytes = File(_pickedImagePath!).readAsBytesSync();
          }
          if (bytes != null && bytes.isNotEmpty) {
            final ext = (_pickedImageName ?? _pickedImagePath ?? '').toLowerCase();
            final mime = ext.endsWith('.png') ? 'image/png' : 'image/jpeg';
            body['mediaData'] = base64Encode(bytes);
            body['mediaMimeType'] = mime;
            body['mediaFilename'] = _pickedImageName ?? 'poster.jpg';
            debugPrint('[WhatsApp Bulk] Attached media: ${body['mediaFilename']} (${bytes.length} bytes)');
          } else {
            debugPrint('[WhatsApp Bulk] Warning: _hasPickedImage true but bytes could not be loaded');
          }
        } catch (e) {
          debugPrint('Error attaching image: $e');
        }
      }

      final res = await api.post('/api/messages/broadcast', body);

      if (!mounted) return;
      final hasMediaAttached = body.containsKey('mediaData');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🎉 ${res['total'] ?? cleanNums.length} संदेश ${hasMediaAttached ? "फ़ोटो/पोस्टर सहित " : ""}सर्वर बैकग्राउंड कतार में जोड़े गए! आपका फ़ोन WhatsApp नहीं खोलेगा।'),
          backgroundColor: const Color(0xff16a34a),
          duration: const Duration(seconds: 5),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('त्रुटि: ${e.toString().replaceFirst('Exception: ', '')}'),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalWithMobile = _voters.where((v) => (v['mobile'] ?? '').toString().trim().isNotEmpty).length;

    return Scaffold(
      backgroundColor: const Color(0xfff8fafc),
      appBar: AppBar(
        title: const Text('WhatsApp संदेश केंद्र', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: const Color(0xff1e3a8a),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'लाइव अभियान स्थिति (Live Campaign Tracker)',
            icon: const Icon(Icons.analytics_outlined),
            onPressed: _showCampaignTrackerModal,
          ),
          IconButton(
            tooltip: 'QR कनेक्ट व बल्क अभियान',
            icon: const Icon(Icons.qr_code_scanner_rounded),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BulkMessagePage()),
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.amberAccent,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
          tabs: const [
            Tab(icon: Icon(Icons.how_to_vote_rounded, size: 20), text: 'मतदाता सूची व पार्टी बल्क'),
            Tab(icon: Icon(Icons.share_rounded, size: 20), text: 'डायरेक्ट शेयर व संपर्क'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildVoterListTab(totalWithMobile),
          _buildDirectShareTab(),
        ],
      ),
      bottomNavigationBar: _selectedVoterIds.isNotEmpty
          ? _buildBottomActionBar()
          : null,
    );
  }

  Widget _buildActiveCampaignBanner() {
    if (_activeCampaign == null) return const SizedBox.shrink();

    final status = (_activeCampaign!['status'] ?? '').toString();
    final isActive = ['running', 'scheduled', 'paused'].contains(status);
    final isRunning = status == 'running' || status == 'scheduled';
    final isPaused = status == 'paused';

    if (!isActive) {
      return Container(
        margin: const EdgeInsets.fromLTRB(10, 8, 10, 2),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xffe2e8f0)),
        ),
        child: Row(
          children: [
            Icon(
              status == 'completed' ? Icons.check_circle_rounded : Icons.cancel_rounded,
              color: status == 'completed' ? const Color(0xff16a34a) : Colors.grey,
              size: 18,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'अंतिम अभियान: ${_activeCampaign!['title'] ?? ''} (${status == 'completed' ? "पूर्ण ✅" : "रद्द ⏹️"}) · ${_activeCampaign!['sentCount'] ?? 0}/${_activeCampaign!['totalEligible'] ?? 0} भेजे गए',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xff475569)),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            TextButton(
              onPressed: _showCampaignTrackerModal,
              style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: EdgeInsets.zero),
              child: const Text('सभी देखें', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }

    final total = (_activeCampaign!['totalEligible'] ?? 0) as int;
    final sent = (_activeCampaign!['sentCount'] ?? 0) as int;
    final failed = (_activeCampaign!['failedCount'] ?? 0) as int;
    final pending = (total - sent - failed).clamp(0, total);
    final double progress = total > 0 ? (sent / total).clamp(0.0, 1.0) : 0.0;
    final percent = (progress * 100).toStringAsFixed(1);
    final id = (_activeCampaign!['_id'] ?? '').toString();

    return Container(
      margin: const EdgeInsets.fromLTRB(10, 8, 10, 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isRunning ? const Color(0xfff0fdf4) : const Color(0xfffff7ed),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isRunning ? const Color(0xff86efac) : const Color(0xfffed7aa),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: (isRunning ? const Color(0xff16a34a) : Colors.orange).withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isRunning ? const Color(0xff16a34a) : Colors.orange,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isRunning ? Icons.rocket_launch_rounded : Icons.pause_rounded,
                  color: Colors.white,
                  size: 16,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isRunning ? '📡 सर्वर बैकग्राउंड अभियान चालू है' : '⏸️ सर्वर अभियान रुका हुआ है (Paused)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: isRunning ? const Color(0xff14532d) : const Color(0xff9a3412),
                      ),
                    ),
                    Text(
                      _activeCampaign!['title'] ?? 'WhatsApp Campaign',
                      style: const TextStyle(fontSize: 11.5, color: Color(0xff64748b)),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: _isLoadingCampaignStatus
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.refresh_rounded, size: 20),
                onPressed: _loadActiveCampaign,
                tooltip: 'ताज़ा करें',
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: isRunning ? const Color(0xffdcfce7) : const Color(0xffffedd5),
              valueColor: AlwaysStoppedAnimation<Color>(isRunning ? const Color(0xff16a34a) : Colors.orange),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('✅ भेजे: $sent / $total ($percent%)',
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xff14532d))),
              Text('⏳ कतार: $pending',
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xff1e3a8a))),
              if (failed > 0)
                Text('❌ विफल: $failed',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.red)),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 4),
          Row(
            children: [
              if (isPaused)
                TextButton.icon(
                  onPressed: () => _controlCampaign(id, 'resume'),
                  icon: const Icon(Icons.play_arrow_rounded, size: 16, color: Color(0xff16a34a)),
                  label: const Text('फिर चलाएं (Resume)', style: TextStyle(fontSize: 11.5, color: Color(0xff16a34a), fontWeight: FontWeight.bold)),
                )
              else
                TextButton.icon(
                  onPressed: () => _controlCampaign(id, 'pause'),
                  icon: const Icon(Icons.pause_rounded, size: 16, color: Colors.orange),
                  label: const Text('रोकें (Pause)', style: TextStyle(fontSize: 11.5, color: Colors.orange, fontWeight: FontWeight.bold)),
                ),
              const SizedBox(width: 4),
              TextButton.icon(
                onPressed: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('अभियान रद्द करें?'),
                      content: const Text('क्या आप सचमुच इस सर्वर अभियान को पूरी तरह रोकना व रद्द करना चाहते हैं?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('नहीं')),
                        FilledButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          style: FilledButton.styleFrom(backgroundColor: Colors.red),
                          child: const Text('हाँ, रद्द करें'),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    _controlCampaign(id, 'cancel');
                  }
                },
                icon: const Icon(Icons.stop_circle_outlined, size: 16, color: Colors.red),
                label: const Text('रद्द करें', style: TextStyle(fontSize: 11.5, color: Colors.red, fontWeight: FontWeight.bold)),
              ),
              const Spacer(),
              TextButton(
                onPressed: _showCampaignTrackerModal,
                child: const Text('पूरा विवरण 📋', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _showCampaignTrackerModal() async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.78,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.analytics_rounded, color: Color(0xff1e3a8a), size: 24),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'अभियान स्थिति व इतिहास (Campaign Tracker)',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xff1e293b)),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: FutureBuilder<List<dynamic>>(
                future: api.list('/api/messages/history'),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: Color(0xff16a34a)));
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('त्रुटि: ${snapshot.error}'));
                  }
                  final list = snapshot.data is List
                      ? List<Map<String, dynamic>>.from(
                          snapshot.data!.map((item) => Map<String, dynamic>.from(item as Map)))
                      : <Map<String, dynamic>>[];
                  if (list.isEmpty) {
                    return const Center(
                      child: Text('अभी कोई अभियान इतिहास उपलब्ध नहीं है।', style: TextStyle(color: Colors.grey)),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, i) {
                      final c = list[i];
                      final st = (c['status'] ?? '').toString();
                      final isRun = st == 'running' || st == 'scheduled';
                      final isPsd = st == 'paused';
                      final tot = (c['totalEligible'] ?? 0) as int;
                      final snt = (c['sentCount'] ?? 0) as int;
                      final fld = (c['failedCount'] ?? 0) as int;
                      final pnd = (tot - snt - fld).clamp(0, tot);
                      final prg = tot > 0 ? (snt / tot).clamp(0.0, 1.0) : 0.0;
                      final dtStr = c['createdAt'] != null
                          ? DateFormat('dd MMM, hh:mm a').format(DateTime.parse(c['createdAt']).toLocal())
                          : '';
                      final cId = (c['_id'] ?? '').toString();

                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isRun ? const Color(0xfff0fdf4) : const Color(0xfff8fafc),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isRun ? const Color(0xff86efac) : const Color(0xffe2e8f0),
                            width: isRun ? 1.5 : 1.0,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    c['title'] ?? 'WhatsApp Campaign',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isRun
                                        ? const Color(0xff16a34a)
                                        : (isPsd ? Colors.orange : (st == 'completed' ? Colors.blue : Colors.grey)),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    isRun ? '🟢 चालू (Running)' : (isPsd ? '⏸️ रुका हुआ' : (st == 'completed' ? '✅ पूर्ण' : '⏹️ रद्द')),
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text('दिनांक: $dtStr | प्रेषक: ${c['sender']?['name'] ?? ''} (${c['sender']?['displayNumber'] ?? ''})',
                                style: const TextStyle(fontSize: 11, color: Color(0xff64748b))),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: prg,
                                minHeight: 6,
                                backgroundColor: Colors.grey.shade200,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  isRun ? const Color(0xff16a34a) : Colors.blue,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('✅ भेजे: $snt', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xff16a34a))),
                                Text('⏳ बाकी: $pnd', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xff1e3a8a))),
                                Text('❌ विफल: $fld', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.red)),
                                Text('कुल: $tot', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.grey)),
                              ],
                            ),
                            if (isRun || isPsd) ...[
                              const Divider(height: 14),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  if (isPsd)
                                    FilledButton.icon(
                                      onPressed: () {
                                        Navigator.pop(ctx);
                                        _controlCampaign(cId, 'resume');
                                      },
                                      icon: const Icon(Icons.play_arrow_rounded, size: 14),
                                      label: const Text('फिर चलाएं', style: TextStyle(fontSize: 11)),
                                      style: FilledButton.styleFrom(backgroundColor: const Color(0xff16a34a), visualDensity: VisualDensity.compact),
                                    )
                                  else
                                    OutlinedButton.icon(
                                      onPressed: () {
                                        Navigator.pop(ctx);
                                        _controlCampaign(cId, 'pause');
                                      },
                                      icon: const Icon(Icons.pause_rounded, size: 14),
                                      label: const Text('रोकें', style: TextStyle(fontSize: 11)),
                                      style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                                    ),
                                  const SizedBox(width: 8),
                                  TextButton.icon(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _controlCampaign(cId, 'cancel');
                                    },
                                    icon: const Icon(Icons.close_rounded, size: 14, color: Colors.red),
                                    label: const Text('रद्द करें', style: TextStyle(fontSize: 11, color: Colors.red)),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComposerCard() {
    return Container(
      margin: const EdgeInsets.fromLTRB(10, 8, 10, 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
        border: Border.all(color: const Color(0xffe2e8f0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Toggle
          InkWell(
            onTap: () => setState(() => _isComposerExpanded = !_isComposerExpanded),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: const Color(0xffeff6ff),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.edit_note_rounded, color: Color(0xff1d4ed8), size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text('संदेश व पोस्टर', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xff0f172a))),
                            const SizedBox(width: 8),
                            if (_hasPickedImage)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: Colors.green.shade300),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.photo_rounded, size: 12, color: Colors.green),
                                    SizedBox(width: 3),
                                    Text('फोटो जुड़ी है', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green)),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        Text(
                          _messageController.text.replaceAll('\n', ' ').trim(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _isComposerExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: const Color(0xff1d4ed8),
                  ),
                ],
              ),
            ),
          ),
          if (_isComposerExpanded) ...[
            const Divider(height: 1, color: Color(0xfff1f5f9)),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Photo selection bar
                  if (!_hasPickedImage)
                    InkWell(
                      onTap: _pickImage,
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xfff0fdf4),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xffbbf7d0), style: BorderStyle.solid),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_photo_alternate_rounded, color: Color(0xff16a34a), size: 20),
                            SizedBox(width: 8),
                            Text('संदेश के साथ पोस्टर / फ़ोटो जोड़ें (+ Add Image)', style: TextStyle(color: Color(0xff16a34a), fontWeight: FontWeight.w700, fontSize: 13)),
                          ],
                        ),
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: _pickedImageBytes != null
                                ? Image.memory(
                                    _pickedImageBytes!,
                                    width: 44,
                                    height: 44,
                                    fit: BoxFit.cover,
                                  )
                                : Image.file(
                                    File(_pickedImagePath!),
                                    width: 44,
                                    height: 44,
                                    fit: BoxFit.cover,
                                  ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('📷 पोस्टर तैयार है', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.green)),
                                Text(_pickedImageName ?? 'poster.jpg', style: const TextStyle(fontSize: 11, color: muted), overflow: TextOverflow.ellipsis),
                              ],
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _pickImage,
                            icon: const Icon(Icons.cached_rounded, size: 16),
                            label: const Text('बदलें', style: TextStyle(fontSize: 11)),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 20),
                            onPressed: _removeImage,
                            tooltip: 'फोटो हटाएं',
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 10),
                  // Message TextField
                  TextField(
                    controller: _messageController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'यहाँ अपना संदेश लिखें... (उदा. नमस्कार {{name}} जी...)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xff1d4ed8), width: 1.5)),
                      filled: true,
                      fillColor: const Color(0xfff8fafc),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Quick Template Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        const Text('टेम्पलेट: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: muted)),
                        ..._presets.entries.map((e) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ActionChip(
                            label: Text(e.key, style: const TextStyle(fontSize: 11)),
                            backgroundColor: Colors.blue.shade50,
                            side: BorderSide(color: Colors.blue.shade100),
                            onPressed: () => setState(() => _messageController.text = e.value),
                          ),
                        )),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Tag chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        const Text('टैग: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: muted)),
                        _tagChip('+ नाम', '{{name}}'),
                        _tagChip('+ गाँव/स्थान', '{{village}}'),
                        _tagChip('+ वार्ड/भाग', '{{ward}}'),
                        _tagChip('+ पिता/पति', '{{guardian}}'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tagChip(String label, String tag) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 11, color: Color(0xff1d4ed8), fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xffeff6ff),
        side: const BorderSide(color: Color(0xffbfdbfe)),
        padding: EdgeInsets.zero,
        onPressed: () {
          final text = _messageController.text;
          final sel = _messageController.selection;
          if (sel.isValid && sel.start >= 0) {
            final newText = text.replaceRange(sel.start, sel.end, tag);
            _messageController.value = TextEditingValue(
              text: newText,
              selection: TextSelection.collapsed(offset: sel.start + tag.length),
            );
          } else {
            _messageController.text += ' $tag';
          }
        },
      ),
    );
  }

  Widget _buildVoterListTab(int totalWithMobile) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildActiveCampaignBanner(),
              _buildComposerCard(),
              _buildFiltersCard(),
              _buildVoterListHeader(totalWithMobile),
            ],
          ),
        ),
        if (_loadingVoters)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 12),
                  Text('मतदाता सूची लोड हो रही है...', style: TextStyle(color: muted, fontSize: 13)),
                ],
              ),
            ),
          )
        else if (_voters.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.person_search_rounded, size: 54, color: Colors.grey.shade400),
                      const SizedBox(height: 10),
                      const Text('कोई मतदाता नहीं मिला।', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xff334155))),
                      const SizedBox(height: 4),
                      const Text('कृपया पार्टी, ग्राम पंचायत या वार्ड फ़िल्टर बदलकर देखें।', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: muted)),
                      const SizedBox(height: 14),
                      FilledButton.tonalIcon(
                        onPressed: () {
                          setState(() {
                            _selectedParty = 'all';
                            _selectedGramPanchayat = 'all';
                            _selectedVillage = 'all';
                            _selectedWard = 'all';
                            _selectedCaste = 'all';
                            _searchController.clear();
                          });
                          _fetchVoters();
                        },
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('सभी फ़िल्टर साफ़ करें (Reset)'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(10, 0, 10, 84),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, idx) => _buildVoterCard(_voters[idx]),
                childCount: _voters.length,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildFiltersCard() {
    return Container(
      margin: const EdgeInsets.fromLTRB(10, 4, 10, 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
        border: Border.all(color: const Color(0xffe2e8f0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Source Filter Strip Always visible
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
            child: _buildSourceFilterStrip(),
          ),
          const Divider(height: 1, color: Color(0xfff1f5f9)),

          // Party Filter Strip Always visible
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            child: _buildPartyFilterStrip(),
          ),
          const Divider(height: 1, color: Color(0xfff1f5f9)),

          // Gender Filter Strip Always visible
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            child: _buildGenderFilterStrip(),
          ),
          const Divider(height: 1, color: Color(0xfff1f5f9)),

          // Religion Filter Strip Always visible
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            child: _buildReligionFilterStrip(),
          ),

          // Location Filters Toggle
          InkWell(
            onTap: () => setState(() => _isFiltersExpanded = !_isFiltersExpanded),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xfff8fafc),
                border: Border(
                  top: BorderSide(color: Colors.grey.shade200),
                  bottom: BorderSide(color: _isFiltersExpanded ? Colors.grey.shade200 : Colors.transparent),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.tune_rounded, size: 16, color: Color(0xff1d4ed8)),
                  const SizedBox(width: 6),
                  const Text('स्थान व वार्ड फ़िल्टर', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xff1d4ed8))),
                  const Spacer(),
                  Text(
                    _isFiltersExpanded ? 'कम दिखाएँ' : 'विस्तार करें',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                  ),
                  Icon(
                    _isFiltersExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    size: 18,
                    color: Colors.grey.shade600,
                  ),
                ],
              ),
            ),
          ),

          if (_isFiltersExpanded)
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                children: [
                  // Row 1: Samiti & GP
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _samitiOptions.any((s) => s['value'] == _selectedSamiti) ? _selectedSamiti : 'all',
                          decoration: InputDecoration(
                            labelText: 'समिति / ब्लॉक',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            isDense: true,
                          ),
                          items: [
                            const DropdownMenuItem(value: 'all', child: Text('सभी समितियाँ', style: TextStyle(fontSize: 12.5))),
                            ..._samitiOptions.map((s) => DropdownMenuItem(
                                  value: '${s['value']}',
                                  child: Text('${s['label'] ?? s['value']}', style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                                )),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setState(() {
                                _selectedSamiti = val;
                                _selectedGramPanchayat = 'all';
                                _selectedVillage = 'all';
                                _selectedPart = 'all';
                                _selectedCaste = 'all';
                              });
                              _loadGramPanchayatOptions();
                              _loadVillageOptions();
                              _loadPartOptions();
                              _loadCasteOptions();
                              _fetchVoters();
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _gramPanchayatOptions.any((g) => g['value'] == _selectedGramPanchayat) ? _selectedGramPanchayat : 'all',
                          decoration: InputDecoration(
                            labelText: 'ग्राम पंचायत',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            isDense: true,
                          ),
                          items: [
                            const DropdownMenuItem(value: 'all', child: Text('सभी पंचायतें', style: TextStyle(fontSize: 12.5))),
                            ..._gramPanchayatOptions.map((g) => DropdownMenuItem(
                                  value: '${g['value']}',
                                  child: Text('${g['label'] ?? g['value']}', style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                                )),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setState(() {
                                _selectedGramPanchayat = val;
                                _selectedVillage = 'all';
                                _selectedPart = 'all';
                                _selectedCaste = 'all';
                              });
                              _loadVillageOptions();
                              _loadPartOptions();
                              _loadCasteOptions();
                              _fetchVoters();
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Row 2: Village & Ward
                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: DropdownButtonFormField<String>(
                          value: _villageOptions.any((v) => v['value'] == _selectedVillage) ? _selectedVillage : 'all',
                          decoration: InputDecoration(
                            labelText: 'गाँव',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            isDense: true,
                          ),
                          items: [
                            const DropdownMenuItem(value: 'all', child: Text('सभी गाँव', style: TextStyle(fontSize: 12.5))),
                            ..._villageOptions.map((v) => DropdownMenuItem(
                                  value: '${v['value']}',
                                  child: Text('${v['label'] ?? v['value']}', style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                                )),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setState(() {
                                _selectedVillage = val;
                                _selectedWard = 'all';
                                _selectedPart = 'all';
                                _selectedCaste = 'all';
                              });
                              _loadWardOptions();
                              _loadPartOptions();
                              _loadCasteOptions();
                              _fetchVoters();
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: DropdownButtonFormField<String>(
                          value: _wardOptions.any((w) => w['value'] == _selectedWard) ? _selectedWard : 'all',
                          decoration: InputDecoration(
                            labelText: 'वार्ड',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            isDense: true,
                          ),
                          items: [
                            const DropdownMenuItem(value: 'all', child: Text('सभी वार्ड', style: TextStyle(fontSize: 12.5))),
                            ..._wardOptions.map((w) => DropdownMenuItem(
                                  value: '${w['value']}',
                                  child: Text('वार्ड ${w['value']}', style: const TextStyle(fontSize: 12.5)),
                                )),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setState(() {
                                _selectedWard = val;
                                _selectedCaste = 'all';
                              });
                              _loadCasteOptions();
                              _fetchVoters();
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Row 3: Caste & Live Search
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: _openCastePicker,
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              border: Border.all(color: _selectedCaste != 'all' ? const Color(0xff1d4ed8) : Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(8),
                              color: _selectedCaste != 'all' ? const Color(0xffeff6ff) : Colors.white,
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.groups_2_rounded, size: 16, color: _selectedCaste != 'all' ? const Color(0xff1d4ed8) : Colors.grey.shade600),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _selectedCaste == 'all' ? 'जाति (सभी)' : _selectedCaste,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: _selectedCaste != 'all' ? FontWeight.bold : FontWeight.normal,
                                      color: _selectedCaste != 'all' ? const Color(0xff1d4ed8) : Colors.black87,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (_selectedCaste != 'all')
                                  GestureDetector(
                                    onTap: () {
                                      setState(() => _selectedCaste = 'all');
                                      _fetchVoters();
                                    },
                                    child: const Icon(Icons.cancel, size: 16, color: Colors.grey),
                                  )
                                else
                                  const Icon(Icons.arrow_drop_down, size: 18, color: Colors.grey),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onSubmitted: (_) => _fetchVoters(),
                          decoration: InputDecoration(
                            hintText: 'नाम, मोबाइल खोजें...',
                            hintStyle: const TextStyle(fontSize: 12),
                            prefixIcon: const Icon(Icons.search_rounded, size: 18),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 16),
                                    onPressed: () {
                                      _searchController.clear();
                                      _fetchVoters();
                                    },
                                  )
                                : null,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            isDense: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Checkbox(
                        value: _onlyWithMobile,
                        activeColor: const Color(0xff16a34a),
                        visualDensity: VisualDensity.compact,
                        onChanged: (val) {
                          setState(() => _onlyWithMobile = val ?? true);
                          _fetchVoters();
                        },
                      ),
                      const Text(
                        'केवल मोबाइल नंबर वाले मतदाता दिखाएँ',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xff334155)),
                      ),
                      const Spacer(),
                      IconButton.filledTonal(
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        onPressed: _fetchVoters,
                        tooltip: 'सूची ताज़ा करें',
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSourceFilterStrip() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.contacts_rounded, size: 16, color: Color(0xff1d4ed8)),
            const SizedBox(width: 6),
            const Text(
              'संपर्क स्रोत (Data Source):',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xff0f172a)),
            ),
            const Spacer(),
            InkWell(
              onTap: () {
                setState(() => _antiBanRotatingGreetings = !_antiBanRotatingGreetings);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: _antiBanRotatingGreetings ? const Color(0xffecfdf5) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _antiBanRotatingGreetings ? const Color(0xff10b981) : Colors.grey.shade300),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _antiBanRotatingGreetings ? Icons.verified_user_rounded : Icons.shield_outlined,
                      size: 13,
                      color: _antiBanRotatingGreetings ? const Color(0xff059669) : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _antiBanRotatingGreetings ? 'एंटी-बैन रोटेशन ऑन ✅' : 'एंटी-बैन ऑफ',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: _antiBanRotatingGreetings ? const Color(0xff059669) : Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildSourceChip('all', '🔄 सभी (Phone + App)', '${_phoneCount + _appCount}'),
              const SizedBox(width: 6),
              _buildSourceChip('phone', '📱 फ़ोनबुक संपर्क', '$_phoneCount'),
              const SizedBox(width: 6),
              _buildSourceChip('app', '🏛️ ऐप मतदाता', '$_appCount'),
              const SizedBox(width: 6),
              _buildSourceChip('fav', '⭐ पसंदीदा', '$_favCount'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSourceChip(String value, String label, String count) {
    final isSelected = _sourceFilter == value;
    return ChoiceChip(
      selected: isSelected,
      selectedColor: const Color(0xff1e3a8a),
      backgroundColor: Colors.white,
      side: BorderSide(
        color: isSelected ? const Color(0xff1e3a8a) : Colors.grey.shade300,
        width: isSelected ? 1.5 : 1,
      ),
      label: Text('$label ($count)'),
      labelStyle: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w800,
        color: isSelected ? Colors.white : const Color(0xff0f172a),
      ),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      onSelected: (_) {
        setState(() => _sourceFilter = value);
        _fetchVoters();
      },
    );
  }

  Widget _buildPartyFilterStrip() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.how_to_vote_rounded, size: 16, color: Color(0xff1d4ed8)),
            const SizedBox(width: 6),
            const Text(
              'पार्टी अनुसार बल्क फ़िल्टर:',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xff0f172a)),
            ),
            const Spacer(),
            if (_selectedParty != 'all')
              GestureDetector(
                onTap: () {
                  setState(() => _selectedParty = 'all');
                  _fetchVoters();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.close_rounded, size: 12, color: Colors.red),
                      SizedBox(width: 3),
                      Text('फ़िल्टर हटाएं', style: TextStyle(fontSize: 10.5, color: Colors.red, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildPartyFilterChip(
                value: 'all',
                label: 'सभी (All)',
                color: const Color(0xff1e3a8a),
                avatar: const Icon(Icons.people_alt_rounded, size: 16),
              ),
              const SizedBox(width: 8),
              _buildPartyFilterChip(
                value: 'congress',
                label: 'Congress',
                color: const Color(0xff16a34a),
                avatar: Image.asset('assets/party/congress.png', width: 18, height: 18, errorBuilder: (_, __, ___) => const Icon(Icons.how_to_vote, size: 16)),
              ),
              const SizedBox(width: 8),
              _buildPartyFilterChip(
                value: 'bjp',
                label: 'BJP',
                color: const Color(0xffea580c),
                avatar: Image.asset('assets/party/bjp.png', width: 18, height: 18, errorBuilder: (_, __, ___) => const Icon(Icons.how_to_vote, size: 16)),
              ),
              const SizedBox(width: 8),
              _buildPartyFilterChip(
                value: 'nota',
                label: 'NOTA',
                color: Colors.grey.shade700,
                avatar: Image.asset('assets/party/nota.png', width: 18, height: 18, errorBuilder: (_, __, ___) => const Icon(Icons.block, size: 16)),
              ),
              const SizedBox(width: 8),
              _buildPartyFilterChip(
                value: 'other',
                label: 'अन्य पार्टी',
                color: const Color(0xff7c3aed),
                avatar: const Icon(Icons.how_to_vote_outlined, size: 16),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPartyFilterChip({
    required String value,
    required String label,
    required Color color,
    required Widget avatar,
  }) {
    final isSelected = _selectedParty == value;
    return ChoiceChip(
      selected: isSelected,
      onSelected: (_) {
        setState(() {
          _selectedParty = isSelected && value != 'all' ? 'all' : value;
        });
        _fetchVoters();
      },
      avatar: avatar,
      label: Text(label),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : const Color(0xff0f172a),
        fontWeight: FontWeight.w800,
        fontSize: 12,
      ),
      selectedColor: color,
      backgroundColor: Colors.white,
      side: BorderSide(
        color: isSelected ? color : Colors.grey.shade300,
        width: isSelected ? 1.5 : 1,
      ),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }

  Widget _buildGenderFilterStrip() {
    final maleCount = _voters.where((v) {
      final g = (v['gender'] ?? '').toString().toLowerCase().trim();
      return g == 'male' || g == 'm' || g == 'पुरुष' || g == 'पुरूष';
    }).length;
    final femaleCount = _voters.where((v) {
      final g = (v['gender'] ?? '').toString().toLowerCase().trim();
      return g == 'female' || g == 'f' || g == 'महिला' || g == 'स्त्री';
    }).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.wc_rounded, size: 16, color: Color(0xff0284c7)),
            const SizedBox(width: 6),
            const Text(
              'लिंग अनुसार बल्क फ़िल्टर (Gender):',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xff0f172a)),
            ),
            const Spacer(),
            if (_selectedGender != 'all')
              GestureDetector(
                onTap: () {
                  setState(() => _selectedGender = 'all');
                  _fetchVoters();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.close_rounded, size: 12, color: Colors.red),
                      SizedBox(width: 3),
                      Text('फ़िल्टर हटाएं', style: TextStyle(fontSize: 10.5, color: Colors.red, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildGenderFilterChip(
                value: 'all',
                label: 'सभी (${_voters.length})',
                color: const Color(0xff1e3a8a),
                icon: Icons.people_outline_rounded,
              ),
              const SizedBox(width: 8),
              _buildGenderFilterChip(
                value: 'male',
                label: '👨 पुरुष (Male${maleCount > 0 ? " · $maleCount" : ""})',
                color: const Color(0xff0284c7),
                icon: Icons.male_rounded,
              ),
              const SizedBox(width: 8),
              _buildGenderFilterChip(
                value: 'female',
                label: '👩 महिला (Female${femaleCount > 0 ? " · $femaleCount" : ""})',
                color: const Color(0xffdb2777),
                icon: Icons.female_rounded,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildGenderFilterChip({
    required String value,
    required String label,
    required Color color,
    required IconData icon,
  }) {
    final isSelected = _selectedGender == value;
    return ChoiceChip(
      selected: isSelected,
      onSelected: (_) {
        setState(() {
          _selectedGender = isSelected && value != 'all' ? 'all' : value;
        });
        _fetchVoters();
      },
      avatar: Icon(icon, size: 16, color: isSelected ? Colors.white : color),
      label: Text(label),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : const Color(0xff0f172a),
        fontWeight: FontWeight.w800,
        fontSize: 12,
      ),
      selectedColor: color,
      backgroundColor: Colors.white,
      side: BorderSide(
        color: isSelected ? color : Colors.grey.shade300,
        width: isSelected ? 1.5 : 1,
      ),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }

  Widget _buildReligionFilterStrip() {
    final muslimCount = _voters.where((v) => isMuslim(v)).length;
    final hinduCount = _voters.length - muslimCount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.temple_hindu_rounded, size: 16, color: Color(0xffea580c)),
            const SizedBox(width: 6),
            const Text(
              'धर्म अनुसार बल्क फ़िल्टर (Religion):',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xff0f172a)),
            ),
            const Spacer(),
            if (_selectedReligion != 'all')
              GestureDetector(
                onTap: () {
                  setState(() => _selectedReligion = 'all');
                  _fetchVoters();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.close_rounded, size: 12, color: Colors.red),
                      SizedBox(width: 3),
                      Text('फ़िल्टर हटाएं', style: TextStyle(fontSize: 10.5, color: Colors.red, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildReligionFilterChip(
                value: 'all',
                label: 'सभी (${_voters.length})',
                color: const Color(0xff1e3a8a),
                icon: Icons.people_outline_rounded,
              ),
              const SizedBox(width: 8),
              _buildReligionFilterChip(
                value: 'hindu',
                label: '🚩 हिन्दू (${hinduCount > 0 ? hinduCount : 0})',
                color: const Color(0xffea580c),
                icon: Icons.temple_hindu_rounded,
              ),
              const SizedBox(width: 8),
              _buildReligionFilterChip(
                value: 'muslim',
                label: '🌙 मुस्लिम (${muslimCount > 0 ? muslimCount : 0})',
                color: const Color(0xff059669),
                icon: Icons.mosque_rounded,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReligionFilterChip({
    required String value,
    required String label,
    required Color color,
    required IconData icon,
  }) {
    final isSelected = _selectedReligion == value;
    return ChoiceChip(
      selected: isSelected,
      onSelected: (_) {
        setState(() {
          _selectedReligion = isSelected && value != 'all' ? 'all' : value;
        });
        _fetchVoters();
      },
      avatar: Icon(icon, size: 16, color: isSelected ? Colors.white : color),
      label: Text(label),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : const Color(0xff0f172a),
        fontWeight: FontWeight.w800,
        fontSize: 12,
      ),
      selectedColor: color,
      backgroundColor: Colors.white,
      side: BorderSide(
        color: isSelected ? color : Colors.grey.shade300,
        width: isSelected ? 1.5 : 1,
      ),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }

  Widget _buildVoterListHeader(int totalWithMobile) {
    final availableVoters = _voters.where((v) => (v['mobile'] ?? '').toString().trim().isNotEmpty).toList();
    final allSelected = availableVoters.isNotEmpty && _selectedVoterIds.length >= availableVoters.length;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xfff1f5f9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(Icons.phone_iphone_rounded, color: Colors.green.shade700, size: 16),
          const SizedBox(width: 4),
          Text(
            'मोबाइल: $totalWithMobile / ${_voters.length}',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.green.shade800),
          ),
          if (_selectedParty != 'all') ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _getPartyColor(_selectedParty).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                _selectedParty.toUpperCase(),
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: _getPartyColor(_selectedParty)),
              ),
            ),
          ],
          if (_selectedGender != 'all') ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: (_selectedGender == 'female' ? const Color(0xffdb2777) : const Color(0xff0284c7)).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                _selectedGender == 'female' ? '👩 महिला' : '👨 पुरुष',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: _selectedGender == 'female' ? const Color(0xffdb2777) : const Color(0xff0284c7),
                ),
              ),
            ),
          ],
          if (_selectedReligion != 'all') ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: (_selectedReligion == 'muslim' ? const Color(0xff059669) : const Color(0xffea580c)).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                _selectedReligion == 'muslim' ? '🌙 मुस्लिम' : '🚩 हिन्दू',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: _selectedReligion == 'muslim' ? const Color(0xff059669) : const Color(0xffea580c),
                ),
              ),
            ),
          ],
          const Spacer(),
          InkWell(
            onTap: () {
              setState(() {
                if (allSelected) {
                  _selectedVoterIds.clear();
                } else {
                  _selectedVoterIds.clear();
                  for (final v in availableVoters) {
                    final id = (v['_id'] ?? '').toString();
                    if (id.isNotEmpty) _selectedVoterIds.add(id);
                  }
                }
              });
            },
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    allSelected ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                    size: 18,
                    color: allSelected ? const Color(0xff16a34a) : Colors.grey.shade600,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    allSelected ? 'सभी हटाएं' : 'सभी चुनें (${_selectedVoterIds.length})',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: allSelected ? const Color(0xff16a34a) : const Color(0xff1e3a8a),
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

  Color _getPartyColor(String party) {
    switch (party.toLowerCase()) {
      case 'congress':
        return const Color(0xff16a34a);
      case 'bjp':
        return const Color(0xffea580c);
      case 'nota':
        return Colors.grey.shade800;
      case 'other':
        return const Color(0xff7c3aed);
      default:
        return const Color(0xff1e3a8a);
    }
  }

  Widget _buildVoterCard(Map<String, dynamic> voter) {
    final id = (voter['_id'] ?? '').toString();
    final name = (voter['name'] ?? voter['fullName'] ?? 'अज्ञात').toString().trim();
    final guardian = (voter['guardianName'] ?? '').toString().trim();
    final mobile = (voter['mobile'] ?? '').toString().trim();
    final caste = (voter['caste'] ?? '').toString().trim();
    final village = (voter['village'] ?? voter['gramPanchayat'] ?? '').toString().trim();
    final ward = (voter['wardNumber'] ?? voter['partNumber'] ?? '').toString().trim();
    final party = (voter['partyPreference'] ?? '').toString().trim();
    final gender = (voter['gender'] ?? '').toString().toLowerCase().trim();
    final isSelected = _selectedVoterIds.contains(id);
    final hasMobile = mobile.isNotEmpty;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xfff0fdf4) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelected ? const Color(0xff22c55e) : const Color(0xffe2e8f0),
          width: isSelected ? 1.6 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isSelected ? 0.05 : 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Checkbox(
              value: isSelected,
              activeColor: const Color(0xff16a34a),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              visualDensity: VisualDensity.compact,
              onChanged: hasMobile
                  ? (val) {
                      setState(() {
                        if (val == true) {
                          _selectedVoterIds.add(id);
                        } else {
                          _selectedVoterIds.remove(id);
                        }
                      });
                    }
                  : null,
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (voter['isFavorite'] == true)
                        const Padding(
                          padding: EdgeInsets.only(right: 4),
                          child: Icon(Icons.star_rounded, color: orange, size: 16),
                        ),
                      Flexible(
                        child: Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xff0f172a)),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        margin: const EdgeInsets.only(left: 6),
                        decoration: BoxDecoration(
                          color: (voter['source'] == 'phone' || voter['isPhoneContact'] == true)
                              ? softGreen
                              : softOrange,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          (voter['source'] == 'phone' || voter['isPhoneContact'] == true)
                              ? '📱 फ़ोनबुक'
                              : '🏛️ ऐप',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            color: (voter['source'] == 'phone' || voter['isPhoneContact'] == true)
                                ? green
                                : orange,
                          ),
                        ),
                      ),
                      if (caste.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xfffef3c7),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xfff59e0b).withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.people_alt_rounded, size: 10, color: Color(0xffb45309)),
                              const SizedBox(width: 3),
                              Text(caste, style: const TextStyle(fontSize: 10.5, color: Color(0xff92400e), fontWeight: FontWeight.w900)),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (guardian.isNotEmpty)
                    Text('पिता/पति: $guardian', style: const TextStyle(fontSize: 11.5, color: muted)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      if (gender.isNotEmpty) ...[
                        if (gender == 'female' || gender == 'f' || gender == 'महिला' || gender == 'स्त्री')
                          _smallPill(Icons.female_rounded, 'महिला', color: const Color(0xffdb2777))
                        else if (gender == 'male' || gender == 'm' || gender == 'पुरुष' || gender == 'पुरूष')
                          _smallPill(Icons.male_rounded, 'पुरुष', color: const Color(0xff0284c7)),
                      ],
                      if (party.isNotEmpty && party != 'undecided')
                        _partyPill(party),
                      if (village.isNotEmpty)
                        _smallPill(Icons.holiday_village_outlined, village),
                      if (ward.isNotEmpty)
                        _smallPill(Icons.location_on_outlined, 'वार्ड $ward'),
                      if (hasMobile)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.green.shade200),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.phone_rounded, color: Color(0xff16a34a), size: 11),
                              const SizedBox(width: 3),
                              Text(mobile, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xff16a34a))),
                            ],
                          ),
                        )
                      else
                        const Text('मोबाइल नहीं है', style: TextStyle(fontSize: 11, color: Colors.redAccent, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Actions Column
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (hasMobile) ...[
                  // Primary Send Button
                  FilledButton.icon(
                    onPressed: () => _sendToSingleVoter(voter, forceDirectChat: !_hasPickedImage),
                    icon: Icon(_hasPickedImage ? Icons.photo_size_select_actual_rounded : Icons.chat_bubble_outline_rounded, size: 13),
                    label: Text(_hasPickedImage ? 'पोस्टर भेजें' : 'WhatsApp', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xff16a34a),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      visualDensity: VisualDensity.compact,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  if (_hasPickedImage) ...[
                    const SizedBox(height: 3),
                    InkWell(
                      onTap: () => _sendToSingleVoter(voter, forceDirectChat: true),
                      child: const Text('केवल चैट खोलें', style: TextStyle(fontSize: 10, color: Color(0xff1d4ed8), fontWeight: FontWeight.w600)),
                    ),
                  ],
                ] else
                  OutlinedButton.icon(
                    onPressed: () => _promptAndSend(voter),
                    icon: const Icon(Icons.send_rounded, size: 12),
                    label: const Text('भेजें', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xff1d4ed8),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      visualDensity: VisualDensity.compact,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _promptAndSend(Map<String, dynamic> voter) {
    final phoneCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${voter['name'] ?? 'मतदाता'} को संदेश भेजें', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('इस मतदाता का मोबाइल नंबर दर्ज करें या सीधे WhatsApp शेयर करें:', style: TextStyle(fontSize: 13, color: muted)),
            const SizedBox(height: 12),
            TextField(
              controller: phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'मोबाइल नंबर',
                hintText: '10 अंकों का नंबर',
                prefixIcon: const Icon(Icons.phone_rounded),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _shareDirectToWhatsApp();
            },
            child: const Text('WhatsApp शेयर'),
          ),
          FilledButton(
            onPressed: () {
              final num = phoneCtrl.text.trim();
              if (num.length >= 10) {
                Navigator.pop(ctx);
                final updated = Map<String, dynamic>.from(voter);
                updated['mobile'] = num;
                _sendToSingleVoter(updated);
              }
            },
            style: FilledButton.styleFrom(backgroundColor: const Color(0xff16a34a)),
            child: const Text('WhatsApp पर भेजें'),
          ),
        ],
      ),
    );
  }

  Widget _partyPill(String party) {
    Color bg;
    Color fg;
    String label;
    Widget? icon;
    switch (party.toLowerCase()) {
      case 'congress':
        bg = Colors.green.shade50;
        fg = const Color(0xff16a34a);
        label = 'Congress';
        icon = Image.asset('assets/party/congress.png', width: 13, height: 13, errorBuilder: (_, __, ___) => const Icon(Icons.how_to_vote, size: 12, color: Color(0xff16a34a)));
        break;
      case 'bjp':
        bg = Colors.orange.shade50;
        fg = const Color(0xffea580c);
        label = 'BJP';
        icon = Image.asset('assets/party/bjp.png', width: 13, height: 13, errorBuilder: (_, __, ___) => const Icon(Icons.how_to_vote, size: 12, color: Color(0xffea580c)));
        break;
      case 'nota':
        bg = Colors.grey.shade100;
        fg = Colors.grey.shade800;
        label = 'NOTA';
        icon = Image.asset('assets/party/nota.png', width: 13, height: 13, errorBuilder: (_, __, ___) => const Icon(Icons.block, size: 12, color: Colors.grey));
        break;
      case 'other':
        bg = Colors.purple.shade50;
        fg = const Color(0xff7c3aed);
        label = 'अन्य';
        break;
      default:
        bg = Colors.grey.shade100;
        fg = muted;
        label = party;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: fg.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            icon,
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(fontSize: 10.5, color: fg, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _smallPill(IconData icon, String text, {Color? color, Color? bgColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor ?? (color != null ? color.withValues(alpha: 0.1) : Colors.grey.shade100),
        borderRadius: BorderRadius.circular(4),
        border: color != null ? Border.all(color: color.withValues(alpha: 0.3)) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color ?? muted),
          const SizedBox(width: 3),
          Text(text, style: TextStyle(fontSize: 10.5, color: color ?? const Color(0xff334155), fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _buildBottomActionBar() {
    final count = _selectedVoterIds.length;
    final partyLabel = _selectedParty != 'all' ? ' ${_selectedParty.toUpperCase()}' : '';
    final genderLabel = _selectedGender == 'male'
        ? ' (पुरुष)'
        : (_selectedGender == 'female' ? ' (महिला)' : '');
    final religionLabel = _selectedReligion == 'hindu'
        ? ' (हिन्दू)'
        : (_selectedReligion == 'muslim' ? ' (मुस्लिम)' : '');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 14, offset: const Offset(0, -4)),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              flex: 6,
              child: FilledButton.icon(
                onPressed: _showBulkSendOptionModal,
                icon: const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 18),
                label: Text(
                  '🚀 बल्क ऑटो-सेंड ($count$partyLabel$genderLabel$religionLabel)',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                  overflow: TextOverflow.ellipsis,
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xff16a34a),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 4,
              child: OutlinedButton.icon(
                onPressed: () => _startAssistedDispatch(autoMode: false),
                icon: const Icon(Icons.touch_app_rounded, size: 16),
                label: const Text(
                  'स्टेप-बाय-स्टेप',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                  overflow: TextOverflow.ellipsis,
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xff1e3a8a),
                  side: const BorderSide(color: Color(0xff1e3a8a), width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDirectShareTab() {
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        _buildActiveCampaignBanner(),
        _buildComposerCard(),
        const SizedBox(height: 12),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.share_rounded, color: Color(0xff1d4ed8), size: 24),
                    SizedBox(width: 10),
                    Text('WhatsApp ग्रुप्स व संपर्कों में शेयर करें', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'अपने फ़ोन के किसी भी WhatsApp ग्रुप, ब्रॉडकास्ट लिस्ट या कॉन्टैक्ट को एक क्लिक में फोटो और कैप्शन भेजें।',
                  style: TextStyle(color: muted, fontSize: 13),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _shareDirectToWhatsApp,
                    icon: const Icon(Icons.share_rounded),
                    label: const Text('WhatsApp पर शेयर करें (Direct Share)', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold)),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xff16a34a),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.person_add_alt_1_rounded, color: Color(0xff1d4ed8), size: 24),
                    SizedBox(width: 10),
                    Text('कस्टम नंबर पर डायरेक्ट भेजें', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'किसी भी 10-अंकों के मोबाइल नंबर पर तुरंत फोटो/कैप्शन भेजें:',
                  style: TextStyle(color: muted, fontSize: 13),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _customPhoneController,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          hintText: '10 अंकों का मोबाइल नंबर दर्ज करें',
                          prefixIcon: const Icon(Icons.phone_rounded),
                          suffixIcon: IconButton(
                            tooltip: 'फ़ोनबुक से चुनें',
                            icon: const Icon(Icons.contact_phone_rounded, color: Color(0xff1d4ed8)),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => DevicePhonebookPage(
                                    onSelectContact: (contact) {
                                      if (contact.phones.isNotEmpty) {
                                        setState(() {
                                          _customPhoneController.text =
                                              contact.phones.first.number.replaceAll(RegExp(r'\D'), '');
                                          _customContactName = contact.displayName.trim().isNotEmpty
                                              ? contact.displayName.trim()
                                              : 'साथी';
                                        });
                                      }
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
                if (_customContactName != 'साथी') ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, size: 14, color: Color(0xff16a34a)),
                      const SizedBox(width: 4),
                      Text(
                        'चुना गया संपर्क: $_customContactName',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xff16a34a)),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                if (_hasPickedImage) ...[
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _isSending ? null : () {
                            final num = _customPhoneController.text.trim();
                            if (num.length < 10) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('कृपया सही 10-अंकों का मोबाइल नंबर लिखें।')),
                              );
                              return;
                            }
                            _sendToSingleVoter({'mobile': num, 'name': _customContactName}, forceDirectChat: false);
                          },
                          icon: const Icon(Icons.share_rounded, size: 18),
                          label: const Text('फोटो + संदेश शेयर (WhatsApp)', style: TextStyle(fontWeight: FontWeight.bold)),
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xff16a34a),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isSending ? null : () {
                            final num = _customPhoneController.text.trim();
                            if (num.length < 10) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('कृपया सही 10-अंकों का मोबाइल नंबर लिखें।')),
                              );
                              return;
                            }
                            _sendToSingleVoter({'mobile': num, 'name': _customContactName}, forceDirectChat: true);
                          },
                          icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                          label: const Text('सीधा चैट (Direct WhatsApp)'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xff1d4ed8),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ] else ...[
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _isSending ? null : () {
                            final num = _customPhoneController.text.trim();
                            if (num.length < 10) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('कृपया सही 10-अंकों का मोबाइल नंबर लिखें।')),
                              );
                              return;
                            }
                            _sendToSingleVoter({'mobile': num, 'name': _customContactName}, forceDirectChat: true);
                          },
                          icon: const Icon(Icons.send_rounded, size: 18),
                          label: const Text('सीधा WhatsApp पर संदेश भेजें', style: TextStyle(fontWeight: FontWeight.bold)),
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xff16a34a),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AssistedDispatchSheet extends StatefulWidget {
  const _AssistedDispatchSheet({
    required this.voters,
    required this.imagePath,
    this.imageBytes,
    required this.imageName,
    required this.renderMessage,
    this.antiBanGreetingsEnabled = true,
    this.startInAutoMode = false,
  });

  final List<Map<String, dynamic>> voters;
  final String? imagePath;
  final Uint8List? imageBytes;
  final String? imageName;
  final String Function(Map<String, dynamic> voter, {int? sequenceIndex}) renderMessage;
  final bool antiBanGreetingsEnabled;
  final bool startInAutoMode;

  @override
  State<_AssistedDispatchSheet> createState() => _AssistedDispatchSheetState();
}

class _AssistedDispatchSheetState extends State<_AssistedDispatchSheet>
    with WidgetsBindingObserver {
  int _currentIndex = 0;
  final Set<int> _sentIndices = {};
  final Set<int> _skippedIndices = {};
  final Map<int, DateTime> _sentTimestamps = {};

  // View Mode: 'dispatch' (Active Queue & Live Stream), 'tracker' (Live Sent vs Pending List), 'rules' (Anti-ban Rules)
  String _activeTab = 'dispatch';
  final TextEditingController _trackerSearch = TextEditingController();

  // Auto-send engine state
  bool _isAutoRunning = false;
  bool _isPaused = false;
  bool _waitingForResume = false;

  // Anti-ban timers
  int _cooldownRemaining = 0;
  Timer? _cooldownTimer;
  int _batchBreakRemaining = 0;
  Timer? _batchBreakTimer;
  Timer? _fallbackAdvanceTimer;

  // Anti-ban safety profiles:
  // 'super_safe': 5-8s jitter delay + 20s cooling pause after every 15 messages (100% recommended)
  // 'standard': 3-5s jitter delay + 15s cooling pause after every 25 messages
  // 'fast': 2-3s jitter delay
  String _safetyMode = 'super_safe';
  final int _batchBreakThreshold = 15;
  final int _batchBreakDuration = 20;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.startInAutoMode) {
      _isAutoRunning = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _startAutoDispatch();
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cooldownTimer?.cancel();
    _batchBreakTimer?.cancel();
    _fallbackAdvanceTimer?.cancel();
    _trackerSearch.dispose();
    super.dispose();
  }

  int _getCooldownSeconds() {
    final rand = DateTime.now().millisecond % 3; // 0, 1, 2 random variance
    switch (_safetyMode) {
      case 'fast':
        return 2 + (rand % 2);
      case 'standard':
        return 3 + rand;
      case 'super_safe':
      default:
        return 5 + rand; // 5, 6, 7 seconds
    }
  }

  void _startAutoDispatch() {
    if (!mounted || widget.voters.isEmpty) return;
    setState(() {
      _isAutoRunning = true;
      _isPaused = false;
      _cooldownRemaining = 0;
      _batchBreakRemaining = 0;
    });
    _dispatchForCurrent(isManualClick: false);
  }

  void _pauseAutoDispatch() {
    _cooldownTimer?.cancel();
    _batchBreakTimer?.cancel();
    _fallbackAdvanceTimer?.cancel();
    setState(() {
      _isPaused = true;
      _waitingForResume = false;
      _cooldownRemaining = 0;
      _batchBreakRemaining = 0;
    });
  }

  void _resumeAutoDispatch() {
    setState(() {
      _isPaused = false;
    });
    _dispatchForCurrent(isManualClick: false);
  }

  void _stopAutoDispatch() {
    _cooldownTimer?.cancel();
    _batchBreakTimer?.cancel();
    _fallbackAdvanceTimer?.cancel();
    setState(() {
      _isAutoRunning = false;
      _isPaused = false;
      _waitingForResume = false;
      _cooldownRemaining = 0;
      _batchBreakRemaining = 0;
    });
  }

  Future<void> _dispatchForCurrent({bool isManualClick = false}) async {
    if (!mounted || _currentIndex >= widget.voters.length) {
      _stopAutoDispatch();
      return;
    }
    if (_cooldownRemaining > 0 || _batchBreakRemaining > 0) return;

    final voter = widget.voters[_currentIndex];
    final rawMobile = (voter['mobile'] ?? '').toString();
    final mobile = rawMobile.replaceAll(RegExp(r'\D'), '');
    final name = (voter['name'] ?? voter['fullName'] ?? 'साथी').toString().trim();
    final resolvedName = PhoneContactsBridge.resolveNameForNumber(mobile, name);
    final msg = widget.renderMessage(voter, sequenceIndex: _currentIndex);

    if (mobile.length < 10) {
      // Auto-skip invalid number
      _skippedIndices.add(_currentIndex);
      if (_currentIndex + 1 < widget.voters.length) {
        setState(() => _currentIndex++);
        if (_isAutoRunning && !_isPaused) {
          _dispatchForCurrent(isManualClick: false);
        }
      } else {
        _stopAutoDispatch();
      }
      return;
    }

    _sentIndices.add(_currentIndex);
    _sentTimestamps[_currentIndex] = DateTime.now();

    if (_isAutoRunning && !_isPaused) {
      _waitingForResume = true;
    }

    if (mounted) setState(() {});

    final bool hasImage = widget.imageBytes != null ||
        (widget.imagePath != null && !kIsWeb && File(widget.imagePath!).existsSync());

    if (hasImage) {
      await Clipboard.setData(ClipboardData(text: mobile));
      final ext = (widget.imageName ?? widget.imagePath ?? '').toLowerCase();
      final mime = ext.endsWith('.png') ? 'image/png' : 'image/jpeg';
      XFile xFile;
      if (widget.imagePath != null && !kIsWeb && File(widget.imagePath!).existsSync()) {
        xFile = XFile(widget.imagePath!, mimeType: mime, name: widget.imageName ?? 'poster.jpg');
      } else if (widget.imageBytes != null && !kIsWeb) {
        final tempDir = await getTemporaryDirectory();
        final tmpFile = File('${tempDir.path}/share_poster_${DateTime.now().millisecondsSinceEpoch}.${mime.endsWith('png') ? 'png' : 'jpg'}');
        await tmpFile.writeAsBytes(widget.imageBytes!);
        xFile = XFile(tmpFile.path, mimeType: mime, name: widget.imageName ?? 'poster.jpg');
      } else {
        xFile = XFile.fromData(widget.imageBytes!, mimeType: mime, name: widget.imageName ?? 'poster.jpg');
      }
      final textToSend = msg.trim().isNotEmpty ? msg : null;

      try {
        await SharePlus.instance.share(
          ShareParams(
            text: textToSend,
            files: [xFile],
            subject: 'मतदाता संदेश - $resolvedName',
          ),
        );
      } catch (e) {
        debugPrint('Share error: $e');
      }
    } else {
      if (mounted) {
        await openWhatsApp(context, mobile, message: msg, recipientName: resolvedName);
      }
    }

    if (_isAutoRunning && !_isPaused) {
      // Fallback timer in case user doesn't exit app or switches back instantly
      _fallbackAdvanceTimer?.cancel();
      _fallbackAdvanceTimer = Timer(const Duration(seconds: 8), () {
        if (!mounted || !_isAutoRunning || _isPaused) return;
        if (_waitingForResume) {
          _handleAutoAdvance();
        }
      });
    } else if (isManualClick) {
      // In manual mode, start short cooldown and proceed
      _startManualCooldown(3);
      if (_currentIndex + 1 < widget.voters.length) {
        setState(() => _currentIndex++);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xff16a34a),
            content: Text('🎉 सभी चुने हुए संपर्कों को संदेश भेजा जा चुका है! ✅'),
          ),
        );
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_isAutoRunning && !_isPaused && _waitingForResume) {
        _fallbackAdvanceTimer?.cancel();
        _handleAutoAdvance();
      }
    }
  }

  void _handleAutoAdvance() {
    if (!mounted || !_isAutoRunning || _isPaused) return;
    _waitingForResume = false;

    // Check completion
    if (_currentIndex + 1 >= widget.voters.length) {
      _stopAutoDispatch();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xff16a34a),
          content: Text('🎉 बधाई! सभी चुने हुए संपर्कों को संदेश सफलतापूर्वक भेजा जा चुका है! ✅'),
        ),
      );
      return;
    }

    // Move to next contact
    setState(() {
      _currentIndex++;
    });

    // Check Anti-Ban batch break rule (e.g. every 15 messages)
    if (_sentIndices.isNotEmpty && (_sentIndices.length % _batchBreakThreshold == 0)) {
      _startBatchCoolingBreak();
    } else {
      _startAutoCooldown(_getCooldownSeconds());
    }
  }

  void _startBatchCoolingBreak() {
    _batchBreakTimer?.cancel();
    setState(() => _batchBreakRemaining = _batchBreakDuration);
    _batchBreakTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_batchBreakRemaining > 1) {
        setState(() => _batchBreakRemaining--);
      } else {
        timer.cancel();
        setState(() => _batchBreakRemaining = 0);
        if (_isAutoRunning && !_isPaused) {
          _dispatchForCurrent(isManualClick: false);
        }
      }
    });
  }

  void _startAutoCooldown(int seconds) {
    _cooldownTimer?.cancel();
    setState(() => _cooldownRemaining = seconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_cooldownRemaining > 1) {
        setState(() => _cooldownRemaining--);
      } else {
        timer.cancel();
        setState(() => _cooldownRemaining = 0);
        if (_isAutoRunning && !_isPaused) {
          _dispatchForCurrent(isManualClick: false);
        }
      }
    });
  }

  void _startManualCooldown(int seconds) {
    _cooldownTimer?.cancel();
    setState(() => _cooldownRemaining = seconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_cooldownRemaining > 1) {
        setState(() => _cooldownRemaining--);
      } else {
        timer.cancel();
        setState(() => _cooldownRemaining = 0);
      }
    });
  }

  void _skipCurrent() {
    if (_currentIndex < widget.voters.length) {
      _skippedIndices.add(_currentIndex);
      if (_currentIndex + 1 < widget.voters.length) {
        setState(() => _currentIndex++);
        if (_isAutoRunning && !_isPaused) {
          _dispatchForCurrent(isManualClick: false);
        }
      } else {
        _stopAutoDispatch();
      }
    }
  }

  // Export Sent & Delivery Report to Excel
  Future<void> _exportDeliveryReport() async {
    final headers = [
      'क्र.सं.',
      'नाम (Name)',
      'मोबाइल (Mobile)',
      'स्थान / गाँव (Location)',
      'स्थिति (Delivery Status)',
      'भेजा गया समय (Timestamp)',
      'संदेश विवरण (Message)',
    ];

    final rows = <List<dynamic>>[];
    for (int i = 0; i < widget.voters.length; i++) {
      final v = widget.voters[i];
      final name = (v['name'] ?? v['fullName'] ?? '').toString().trim();
      final mobile = (v['mobile'] ?? '').toString().trim();
      final resolvedName = PhoneContactsBridge.resolveNameForNumber(mobile, name);
      final village = (v['village'] ?? v['gramPanchayat'] ?? '').toString().trim();
      final status = _sentIndices.contains(i)
          ? 'सफलतापूर्वक भेजा गया (Sent ✅)'
          : (_skippedIndices.contains(i) ? 'स्किप किया गया (Skipped ⏭️)' : 'कतार में बाकी (Pending ⏳)');
      final timeStr = _sentTimestamps[i] != null
          ? '${_sentTimestamps[i]!.hour.toString().padLeft(2, '0')}:${_sentTimestamps[i]!.minute.toString().padLeft(2, '0')}:${_sentTimestamps[i]!.second.toString().padLeft(2, '0')}'
          : '-';
      final msg = widget.renderMessage(v, sequenceIndex: i);

      rows.add([
        i + 1,
        resolvedName,
        mobile,
        village,
        status,
        timeStr,
        msg,
      ]);
    }

    try {
      final xlsxBytes = ExcelGenerator.buildCustomXlsx(
        headers,
        rows,
        sheetName: 'WhatsApp रिपोर्ट',
      );
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final savedPath = await saveBytes(
        'whatsapp_bulk_delivery_report_$timestamp.xlsx',
        Uint8List.fromList(xlsxBytes),
      );
      if (mounted && savedPath != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xff16a34a),
            content: Text('WhatsApp डिलीवरी रिपोर्ट Excel डाउनलोड हो गई! ✅'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('रिपोर्ट डाउनलोड में समस्या: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.voters.length;
    final sentCount = _sentIndices.length;
    final skippedCount = _skippedIndices.length;
    final pendingCount = (total - sentCount - skippedCount).clamp(0, total);
    final voter = _currentIndex < total ? widget.voters[_currentIndex] : null;

    final mobile = voter != null
        ? (voter['mobile'] ?? '').toString().replaceAll(RegExp(r'\D'), '')
        : '';
    final name = voter != null
        ? (voter['name'] ?? voter['fullName'] ?? 'साथी').toString().trim()
        : '';
    final resolvedName = voter != null
        ? PhoneContactsBridge.resolveNameForNumber(mobile, name)
        : '';
    final guardian = voter != null
        ? (voter['guardianName'] ?? voter['relativeName'] ?? '').toString().trim()
        : '';
    final village = voter != null
        ? (voter['village'] ?? voter['gramPanchayat'] ?? '').toString().trim()
        : '';
    final ward = voter != null
        ? (voter['wardNumber'] ?? voter['partNumber'] ?? '').toString().trim()
        : '';
    final party = voter != null
        ? (voter['party'] ?? voter['support'] ?? voter['partyPreference'] ?? '').toString().toLowerCase().trim()
        : '';
    final isPhoneSource = voter != null && (voter['source'] == 'phone' || voter['isPhoneContact'] == true);

    final msg = voter != null
        ? widget.renderMessage(voter, sequenceIndex: _currentIndex)
        : '';

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.94,
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 44,
                height: 4,
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),

            // Header Row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xff16a34a).withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.rocket_launch_rounded, color: Color(0xff16a34a), size: 22),
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WhatsApp बल्क ऑटो-डिस्पैच (Anti-Ban)',
                        style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w900, color: navy),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'हाथों-हाथ स्वतः सेंड • मानवीय रैंडम गैप • 0% नंबर ब्लॉक रिस्क',
                        style: TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Excel रिपोर्ट डाउनलोड करें',
                  icon: const Icon(Icons.download_rounded, color: Color(0xff16a34a)),
                  onPressed: _exportDeliveryReport,
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // 3-Tab Toggle: 'dispatch' vs 'tracker' vs 'rules'
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _activeTab = 'dispatch'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _activeTab == 'dispatch' ? const Color(0xffeff6ff) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _activeTab == 'dispatch' ? const Color(0xff3b82f6) : border,
                        ),
                      ),
                      child: Text(
                        '🎯 ऑटो कतार (${_currentIndex + 1}/$total)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _activeTab == 'dispatch' ? const Color(0xff1d4ed8) : muted,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _activeTab = 'tracker'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _activeTab == 'tracker' ? const Color(0xffecfdf5) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _activeTab == 'tracker' ? const Color(0xff10b981) : border,
                        ),
                      ),
                      child: Text(
                        '📊 किसे गया ($sentCount)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _activeTab == 'tracker' ? const Color(0xff059669) : muted,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _activeTab = 'rules'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _activeTab == 'rules' ? const Color(0xfffef3c7) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _activeTab == 'rules' ? const Color(0xffd97706) : border,
                        ),
                      ),
                      child: Text(
                        '🛡️ सुरक्षा नियम',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _activeTab == 'rules' ? const Color(0xffb45309) : muted,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Overall Progress
            LinearProgressIndicator(
              value: total > 0 ? (_currentIndex + 1) / total : 0,
              backgroundColor: Colors.grey.shade200,
              color: const Color(0xff16a34a),
              minHeight: 5,
              borderRadius: BorderRadius.circular(3),
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                Text(
                  '✅ भेजे गए: $sentCount  |  ⏳ कतार: $pendingCount  |  ⏭️ छोड़े: $skippedCount',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: muted),
                ),
                const Spacer(),
                if (widget.imagePath != null || widget.imageBytes != null)
                  const Text('📷 पोस्टर संलग्न', style: TextStyle(fontSize: 10.5, color: Colors.green, fontWeight: FontWeight.bold)),
              ],
            ),
            const Divider(height: 12),

            // TAB 1: Dispatch & Live Stream View
            if (_activeTab == 'dispatch') ...[
              Expanded(
                child: ListView(
                  children: [
                    // Master Auto Control Center
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _isAutoRunning
                            ? (_isPaused ? const Color(0xfffffbeb) : const Color(0xfff0fdf4))
                            : const Color(0xfff8fafc),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _isAutoRunning
                              ? (_isPaused ? const Color(0xfffef08a) : const Color(0xffbbf7d0))
                              : border,
                          width: 1.5,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _isAutoRunning
                                      ? (_isPaused ? Colors.amber : const Color(0xff16a34a))
                                      : Colors.grey,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _isAutoRunning
                                      ? (_isPaused
                                          ? '⏸️ ऑटो-सेंड रुका हुआ है (Paused)'
                                          : '🚀 ऑटोमैटिक बल्क सेंड सक्रिय है (Sending...)')
                                      : '🚀 हाथों-हाथ बल्क ऑटो-सेंड (Hands-Free)',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13,
                                    color: _isAutoRunning
                                        ? (_isPaused ? const Color(0xffb45309) : const Color(0xff15803d))
                                        : navy,
                                  ),
                                ),
                              ),
                              // Speed Mode selector pill
                              PopupMenuButton<String>(
                                initialValue: _safetyMode,
                                onSelected: (val) => setState(() => _safetyMode = val),
                                tooltip: 'एंटी-बैन स्पीड व सुरक्षा स्तर',
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: border),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.speed_rounded,
                                        size: 14,
                                        color: _safetyMode == 'super_safe'
                                            ? Colors.green
                                            : (_safetyMode == 'standard' ? Colors.blue : Colors.orange),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _safetyMode == 'super_safe'
                                            ? 'अल्ट्रा-सेफ (5-8s)'
                                            : (_safetyMode == 'standard' ? 'मानक (3-5s)' : 'फास्ट (2-3s)'),
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                      const Icon(Icons.arrow_drop_down, size: 16),
                                    ],
                                  ),
                                ),
                                itemBuilder: (_) => const [
                                  PopupMenuItem(
                                    value: 'super_safe',
                                    child: Text('🟢 अल्ट्रा-सेफ (5-8s रैंडम गैप + 15 पर ब्रेक) - अनुशंसित'),
                                  ),
                                  PopupMenuItem(
                                    value: 'standard',
                                    child: Text('🟡 मानक मोड (3-5s रैंडम गैप + 25 पर ब्रेक)'),
                                  ),
                                  PopupMenuItem(
                                    value: 'fast',
                                    child: Text('⚡ फास्ट मोड (2-3s गैप)'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _isAutoRunning
                                ? 'WhatsApp में Send दबाकर Back दबाएं, अगला संपर्क अपने-आप स्वतः खुलेगा।'
                                : 'स्टार्ट दबाने पर हर संपर्क को रैंडम एंटी-बैन गैप के साथ स्वतः मैसेज भेजा जाएगा।',
                            style: const TextStyle(fontSize: 11, color: muted, height: 1.2),
                          ),
                          const SizedBox(height: 10),

                          // Action Control Buttons
                          if (_isAutoRunning)
                            Row(
                              children: [
                                if (!_isPaused)
                                  Expanded(
                                    child: FilledButton.icon(
                                      onPressed: _pauseAutoDispatch,
                                      icon: const Icon(Icons.pause_rounded, size: 18),
                                      label: const Text('पॉज़ करें', style: TextStyle(fontWeight: FontWeight.w800)),
                                      style: FilledButton.styleFrom(
                                        backgroundColor: const Color(0xfff59e0b),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                    ),
                                  )
                                else
                                  Expanded(
                                    child: FilledButton.icon(
                                      onPressed: _resumeAutoDispatch,
                                      icon: const Icon(Icons.play_arrow_rounded, size: 18),
                                      label: const Text('पुनः चालू करें', style: TextStyle(fontWeight: FontWeight.w800)),
                                      style: FilledButton.styleFrom(
                                        backgroundColor: const Color(0xff16a34a),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                    ),
                                  ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  onPressed: _stopAutoDispatch,
                                  icon: const Icon(Icons.stop_rounded, size: 18, color: Colors.red),
                                  label: const Text('स्टॉप', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.red)),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Colors.red),
                                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton(
                                  onPressed: _skipCurrent,
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  child: const Text('छोड़ें'),
                                ),
                              ],
                            )
                          else
                            Row(
                              children: [
                                Expanded(
                                  child: FilledButton.icon(
                                    onPressed: _startAutoDispatch,
                                    icon: const Icon(Icons.rocket_launch_rounded, size: 18),
                                    label: const Text('🚀 ऑटो बल्क सेंड शुरू करें', style: TextStyle(fontWeight: FontWeight.w900)),
                                    style: FilledButton.styleFrom(
                                      backgroundColor: const Color(0xff16a34a),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 11),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton(
                                  onPressed: () => _dispatchForCurrent(isManualClick: true),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  child: const Text('1-भेजें'),
                                ),
                                const SizedBox(width: 6),
                                OutlinedButton(
                                  onPressed: _skipCurrent,
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 10),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  child: const Text('छोड़ें'),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Anti-ban Batch Break Banner
                    if (_batchBreakRemaining > 0)
                      Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xfffff7ed),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xfffdba74)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.shield_rounded, color: Color(0xffea580c), size: 22),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '🛡️ एंटी-बैन कूलिंग ब्रेक: $_batchBreakRemaining सेकंड शेष',
                                    style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xffc2410c), fontSize: 13),
                                  ),
                                  const Text(
                                    'WhatsApp द्वारा नंबर ब्लॉक होने से बचाने के लिए हर 15 संदेश पर 20s का ब्रेक स्वतः लागू होता है।',
                                    style: TextStyle(fontSize: 10.5, color: Color(0xff9a3412)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                    // Normal Cooldown Banner
                    else if (_cooldownRemaining > 0)
                      Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xffeff6ff),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xffbfdbfe)),
                        ),
                        child: Row(
                          children: [
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xff2563eb)),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              '⏳ अगला संदेश $_cooldownRemaining सेकंड में स्वतः भेजा जाएगा...',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xff1d4ed8)),
                            ),
                          ],
                        ),
                      ),

                    // Current Voter Detailed Card
                    if (voter != null) ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xfff8fafc),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: const Color(0xff1e3a8a).withValues(alpha: 0.1),
                                  child: Text(
                                    '${_currentIndex + 1}',
                                    style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xff1e3a8a)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              resolvedName,
                                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: navy),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: isPhoneSource ? softGreen : softOrange,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              isPhoneSource ? '📱 फ़ोनबुक' : '🏛️ ऐप',
                                              style: TextStyle(
                                                fontSize: 9.5,
                                                fontWeight: FontWeight.w800,
                                                color: isPhoneSource ? green : orange,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (guardian.isNotEmpty)
                                        Text('पिता/पति: $guardian', style: const TextStyle(fontSize: 11.5, color: muted)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xffecfdf5),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xffa7f3d0)),
                                  ),
                                  child: Text(
                                    mobile,
                                    style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xff16a34a), fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                            if (party.isNotEmpty && party != 'undecided') ...[
                              const SizedBox(height: 6),
                              Text('पार्टी रुझान: ${party.toUpperCase()}',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xff1e3a8a))),
                            ],
                            if (village.isNotEmpty || ward.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Text('स्थान: ${[village, if (ward.isNotEmpty) "वार्ड $ward"].join(" • ")}',
                                  style: const TextStyle(fontSize: 11.5, color: muted)),
                            ],
                            const Divider(height: 16),
                            Row(
                              children: [
                                const Icon(Icons.chat_bubble_outline_rounded, size: 13, color: muted),
                                const SizedBox(width: 4),
                                const Text('संदेश प्रीव्यू (नाम के साथ):',
                                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: navy)),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xfffef3c7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'एंटी-बैन सुरक्षित',
                                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xffb45309)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              msg,
                              style: const TextStyle(fontSize: 12.5, color: Color(0xff334155), height: 1.3),
                              maxLines: 4,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Live Progress Stream (किसे-किसे गया लाइव स्थिति)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.stream_rounded, size: 16, color: Color(0xff0284c7)),
                                const SizedBox(width: 6),
                                const Text(
                                  '📡 लाइव एक्टिविटी स्ट्रीम (Live Stream)',
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: navy),
                                ),
                                const Spacer(),
                                InkWell(
                                  onTap: () => setState(() => _activeTab = 'tracker'),
                                  child: const Text(
                                    'पूरी सूची देखें >',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: blue),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            // Compact list of recent 2 sent + current + next 2 pending
                            ...List.generate(
                              5,
                              (offset) {
                                final targetIndex = (_currentIndex - 2) + offset;
                                if (targetIndex < 0 || targetIndex >= total) return const SizedBox.shrink();
                                final item = widget.voters[targetIndex];
                                final iName = (item['name'] ?? item['fullName'] ?? '').toString().trim();
                                final iMobile = (item['mobile'] ?? '').toString().trim();
                                final rName = PhoneContactsBridge.resolveNameForNumber(iMobile, iName);
                                final isSent = _sentIndices.contains(targetIndex);
                                final isSkipped = _skippedIndices.contains(targetIndex);
                                final isCurrent = targetIndex == _currentIndex;

                                final timeStr = _sentTimestamps[targetIndex] != null
                                    ? '${_sentTimestamps[targetIndex]!.hour.toString().padLeft(2, '0')}:${_sentTimestamps[targetIndex]!.minute.toString().padLeft(2, '0')}:${_sentTimestamps[targetIndex]!.second.toString().padLeft(2, '0')}'
                                    : '';

                                return Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  child: Row(
                                    children: [
                                      Icon(
                                        isSent
                                            ? Icons.check_circle_rounded
                                            : (isSkipped
                                                ? Icons.skip_next_rounded
                                                : (isCurrent ? Icons.play_circle_fill_rounded : Icons.schedule_rounded)),
                                        size: 15,
                                        color: isSent
                                            ? const Color(0xff16a34a)
                                            : (isSkipped ? Colors.grey : (isCurrent ? const Color(0xff2563eb) : muted)),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          rName,
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w600,
                                            color: isCurrent ? const Color(0xff1e3a8a) : (isSent ? Colors.black87 : muted),
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Text(
                                        iMobile,
                                        style: const TextStyle(fontSize: 11, color: muted),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: isSent
                                              ? const Color(0xffdcfce7)
                                              : (isCurrent ? const Color(0xffdbeafe) : Colors.grey.shade100),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          isSent
                                              ? '✅ $timeStr'
                                              : (isSkipped ? '⏭️ छोड़ दिया' : (isCurrent ? '🚀 सक्रिय' : '⏳ कतार')),
                                          style: TextStyle(
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.bold,
                                            color: isSent
                                                ? const Color(0xff15803d)
                                                : (isCurrent ? const Color(0xff1d4ed8) : muted),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ] else
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Text('सभी संदेश भेजे जा चुके हैं!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ),
                  ],
                ),
              ),
            ]
            // TAB 2: Tracker View (Full List with Search & Excel Export)
            else if (_activeTab == 'tracker') ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: TextField(
                  controller: _trackerSearch,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'नाम या नंबर से खोजें...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 18),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                    filled: true,
                    fillColor: const Color(0xfff8fafc),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
                  ),
                ),
              ),
              Expanded(
                child: ListView.separated(
                  itemCount: total,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (ctx, idx) {
                    final item = widget.voters[idx];
                    final iName = (item['name'] ?? item['fullName'] ?? '').toString().trim();
                    final iMobile = (item['mobile'] ?? '').toString().trim();
                    final resolvedIName = PhoneContactsBridge.resolveNameForNumber(iMobile, iName);

                    final query = _trackerSearch.text.trim().toLowerCase();
                    if (query.isNotEmpty &&
                        !resolvedIName.toLowerCase().contains(query) &&
                        !iMobile.contains(query)) {
                      return const SizedBox.shrink();
                    }

                    final isSent = _sentIndices.contains(idx);
                    final isSkipped = _skippedIndices.contains(idx);
                    final isCurrent = idx == _currentIndex;

                    final timeStr = _sentTimestamps[idx] != null
                        ? '${_sentTimestamps[idx]!.hour.toString().padLeft(2, '0')}:${_sentTimestamps[idx]!.minute.toString().padLeft(2, '0')}:${_sentTimestamps[idx]!.second.toString().padLeft(2, '0')}'
                        : '';

                    return ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 6),
                      leading: CircleAvatar(
                        radius: 14,
                        backgroundColor: isSent
                            ? const Color(0xffdcfce7)
                            : (isSkipped
                                ? Colors.grey.shade200
                                : (isCurrent ? softBlue : Colors.grey.shade100)),
                        child: Icon(
                          isSent
                              ? Icons.check_circle_rounded
                              : (isSkipped ? Icons.skip_next_rounded : Icons.pending_rounded),
                          size: 16,
                          color: isSent
                              ? const Color(0xff16a34a)
                              : (isSkipped ? Colors.grey : (isCurrent ? blue : muted)),
                        ),
                      ),
                      title: Row(
                        children: [
                          Expanded(
                            child: Text(
                              resolvedIName,
                              style: TextStyle(
                                fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w700,
                                fontSize: 13,
                                color: isCurrent ? blue : navy,
                              ),
                            ),
                          ),
                          Text(
                            iMobile,
                            style: const TextStyle(fontSize: 11.5, color: muted, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      subtitle: Row(
                        children: [
                          Text(
                            isSent
                                ? '✅ भेजा गया $timeStr'
                                : (isSkipped ? '⏭️ स्किप किया गया' : (isCurrent ? '👉 वर्तमान कतार' : '⏳ कतार में बाकी')),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSent ? const Color(0xff16a34a) : (isCurrent ? blue : muted),
                            ),
                          ),
                          const Spacer(),
                          if (!isSent)
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _currentIndex = idx;
                                  _activeTab = 'dispatch';
                                });
                              },
                              child: const Text('यहाँ से शुरू करें >', style: TextStyle(fontSize: 11, color: blue, fontWeight: FontWeight.bold)),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _exportDeliveryReport,
                  icon: const Icon(Icons.table_view_rounded, size: 18),
                  label: const Text('Excel में संपूर्ण रिपोर्ट डाउनलोड करें (.xlsx)'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xff16a34a),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ]
            // TAB 3: Anti-Ban Rules Guide
            else if (_activeTab == 'rules') ...[
              Expanded(
                child: ListView(
                  children: [
                    _buildRuleCard(
                      '1. रोटेटिंग अभिवादन (Dynamic Greetings)',
                      'हर संदेश में अभिवादन अपने आप बदलता है (उदा. नमस्कार, सादर प्रणाम, राम-राम, नमस्ते, जय श्री राम, वंदे मातरम)। WhatsApp का स्पैम डिटेक्टर एक जैसे संदेशों को ब्लॉक करता है, लेकिन यहाँ हर संदेश का टेक्स्ट अलग होता है।',
                      Icons.shuffle_rounded,
                      Colors.blue,
                    ),
                    _buildRuleCard(
                      '2. मानवीय रैंडम गैप (Human-like Jitter Delay)',
                      'बॉट की तरह फिक्स 3 सेकंड पर नहीं, बल्कि 4 से 7 सेकंड का रैंडम गैप रहता है। इससे WhatsApp के सर्वर को यह सामान्य मानवीय उपयोग प्रतीत होता है।',
                      Icons.timer_rounded,
                      Colors.green,
                    ),
                    _buildRuleCard(
                      '3. 15 संदेशों पर 20s कूलिंग ब्रेक (Batch Break)',
                      'WhatsApp के एल्गोरिदम में प्रति-मिनट की लिमिट होती है। हर 15 संदेश पूरे होने पर ऐप 20 सेकंड का कूलिंग विश्राम लेता है जिससे नंबर पूरी तरह सुरक्षित रहता है।',
                      Icons.pause_circle_outline_rounded,
                      Colors.orange,
                    ),
                    _buildRuleCard(
                      '4. फ़ोनबुक नाम व पहचान (Personalization)',
                      'हर संदेश में व्यक्ति का वास्तविक नाम या फ़ोन में सेव नाम जाता है। जब प्राप्तकर्ता अपना नाम देखता है तो वह इसे स्पैम रिपोर्ट नहीं करता।',
                      Icons.person_pin_rounded,
                      Colors.purple,
                    ),
                    _buildRuleCard(
                      '5. नियंत्रण व सुरक्षा (Pause/Skip/Stop Anytime)',
                      'किसी भी समय आप अभियान को रोक सकते हैं (पॉज़), संदिग्ध नंबर छोड़ सकते हैं (स्किप) और रियल-टाइम देख सकते हैं कि किस-किस को संदेश गया।',
                      Icons.security_rounded,
                      const Color(0xff16a34a),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRuleCard(String title, String desc, IconData icon, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xfff8fafc),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: navy)),
                const SizedBox(height: 4),
                Text(desc, style: const TextStyle(fontSize: 11.5, color: muted, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchableCasteBottomSheet extends StatefulWidget {
  const _SearchableCasteBottomSheet({
    required this.casteOptions,
    required this.selectedCaste,
  });

  final List<Map<String, dynamic>> casteOptions;
  final String selectedCaste;

  @override
  State<_SearchableCasteBottomSheet> createState() => _SearchableCasteBottomSheetState();
}

class _SearchableCasteBottomSheetState extends State<_SearchableCasteBottomSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.casteOptions.where((c) {
      final val = (c['value'] ?? '').toString().toLowerCase();
      final lbl = (c['label'] ?? '').toString().toLowerCase();
      final q = _query.toLowerCase().trim();
      if (q.isEmpty) return true;
      return val.contains(q) || lbl.contains(q);
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 6),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.groups_2_rounded, color: Color(0xff1d4ed8)),
                const SizedBox(width: 8),
                const Text(
                  'जाति चुनें (Caste Filter)',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navy),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'जाति का नाम लिखें (Type caste name)...',
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xff1d4ed8)),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                filled: true,
                fillColor: const Color(0xfff8fafc),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xffcbd5e1)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xff1d4ed8), width: 1.5),
                ),
              ),
              onChanged: (val) => setState(() => _query = val),
            ),
          ),
          const Divider(height: 16),
          Expanded(
            child: ListView(
              children: [
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: widget.selectedCaste == 'all' ? const Color(0xff1d4ed8) : const Color(0xfff1f5f9),
                    child: Icon(
                      Icons.all_inclusive_rounded,
                      color: widget.selectedCaste == 'all' ? Colors.white : Colors.grey.shade700,
                      size: 20,
                    ),
                  ),
                  title: const Text('सभी जातियाँ (All Castes)', style: TextStyle(fontWeight: FontWeight.w700)),
                  trailing: widget.selectedCaste == 'all'
                      ? const Icon(Icons.check_circle_rounded, color: Color(0xff1d4ed8))
                      : null,
                  onTap: () => Navigator.pop(context, 'all'),
                ),
                const Divider(height: 1),
                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.search_off_rounded, size: 40, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          Text(
                            '"$_query" से मिलती कोई जाति नहीं मिली',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...filtered.map((c) {
                    final val = '${c['value']}';
                    final label = '${c['label'] ?? c['value']}';
                    final count = c['count'] != null ? '${c['count']}' : '';
                    final isSelected = widget.selectedCaste == val;
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: isSelected ? const Color(0xff1d4ed8) : const Color(0xfff1f5f9),
                        child: Text(
                          label.isNotEmpty ? label.characters.first : '?',
                          style: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xff1d4ed8),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      title: Text(label, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.w500)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (count.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xff1d4ed8).withValues(alpha: 0.12) : const Color(0xfff1f5f9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$count मतदाता',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isSelected ? const Color(0xff1d4ed8) : Colors.grey.shade700,
                                ),
                              ),
                            ),
                          if (isSelected) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.check_circle_rounded, color: Color(0xff1d4ed8), size: 20),
                          ],
                        ],
                      ),
                      onTap: () => Navigator.pop(context, val),
                    );
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
