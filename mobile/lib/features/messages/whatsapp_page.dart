import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/theme.dart';
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

  // Filter selections
  String _selectedSamiti = 'all';
  String _selectedGramPanchayat = 'all';
  String _selectedVillage = 'all';
  String _selectedWard = 'all';
  String _selectedPart = 'all';
  String _selectedCaste = 'all';
  String _selectedParty = 'all'; // 'all', 'congress', 'bjp', 'nota', 'other'
  bool _onlyWithMobile = true;

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
    _loadAllFilters();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _messageController.dispose();
    _searchController.dispose();
    _customPhoneController.dispose();
    super.dispose();
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
      final queryParams = <String, String>{
        'limit': '1000',
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
      final q = _searchController.text.trim();
      if (q.isNotEmpty) queryParams['q'] = q;

      final dynamic res = await api.get('/api/members?${Uri(queryParameters: queryParams).query}');
      List<Map<String, dynamic>> items = [];
      if (res is List) {
        items = res
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      } else if (res is Map && res['items'] is List) {
        items = (res['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }

      // Additional Client-side party filter guarantee
      if (_selectedParty != 'all') {
        items = items.where((v) {
          final p = (v['partyPreference'] ?? '').toString().toLowerCase().trim();
          if (_selectedParty == 'other') {
            return p == 'other' || p == 'अन्य';
          }
          return p == _selectedParty.toLowerCase();
        }).toList();
      }

      if (mounted) {
        setState(() {
          _voters = items;
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
        final bytes = picked.bytes;
        final path = picked.path;

        if (bytes != null) {
          setState(() {
            _pickedImageBytes = bytes;
            _pickedImageName = name;
            _pickedImagePath = path;
          });
        } else if (path != null && !kIsWeb) {
          final originalFile = File(path);
          if (await originalFile.exists()) {
            final tempDir = await getTemporaryDirectory();
            final ext = path.contains('.') ? path.split('.').last : 'jpg';
            final localCopy = File('${tempDir.path}/whatsapp_poster_${DateTime.now().millisecondsSinceEpoch}.$ext');
            await originalFile.copy(localCopy.path);
            final diskBytes = await localCopy.readAsBytes();
            setState(() {
              _pickedImagePath = localCopy.path;
              _pickedImageBytes = diskBytes;
              _pickedImageName = name;
            });
          }
        }

        if (_hasPickedImage && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('📷 फोटो/पोस्टर सफलतापूर्वक जुड़ गया है!'),
              backgroundColor: Color(0xff16a34a),
              duration: Duration(seconds: 2),
            ),
          );
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

  String _renderMessage(Map<String, dynamic>? voter) {
    String msg = _messageController.text;
    final name = (voter?['name'] ?? voter?['fullName'] ?? 'मतदाता').toString().trim();
    final village = (voter?['village'] ?? voter?['gramPanchayat'] ?? '').toString().trim();
    final ward = (voter?['wardNumber'] ?? voter?['partNumber'] ?? '').toString().trim();
    final guardian = (voter?['guardianName'] ?? '').toString().trim();

    msg = msg.replaceAll('{{name}}', name.isNotEmpty ? name : 'साथी');
    msg = msg.replaceAll('{{village}}', village);
    msg = msg.replaceAll('{{ward}}', ward);
    msg = msg.replaceAll('{{guardian}}', guardian);
    return msg;
  }

  Future<void> _sendToSingleVoter(Map<String, dynamic> voter, {bool forceDirectChat = false}) async {
    if (_isSending) return;
    final mobile = (voter['mobile'] ?? '').toString().replaceAll(RegExp(r'\D'), '');
    final name = (voter['name'] ?? voter['fullName'] ?? 'मतदाता').toString().trim();
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
          await openWhatsApp(context, mobile, message: rendered);
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
                  child: Text('फोटो तैयार है! $name का नंबर ($mobile) कॉपी हो गया। WhatsApp में सर्च/पेस्ट करें।'),
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
          subject: 'मतदाता संदेश - $name',
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

  void _startAssistedDispatch() {
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
      ),
    );
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
          // Party Filter Strip Always visible
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
            child: _buildPartyFilterStrip(),
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
                      Flexible(
                        child: Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: Color(0xff0f172a)),
                          overflow: TextOverflow.ellipsis,
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

  Widget _smallPill(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: muted),
          const SizedBox(width: 3),
          Text(text, style: const TextStyle(fontSize: 10.5, color: Color(0xff334155), fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildBottomActionBar() {
    final count = _selectedVoterIds.length;
    final partyLabel = _selectedParty != 'all' ? ' ${_selectedParty.toUpperCase()}' : '';
    final partyColor = _getPartyColor(_selectedParty);

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
              child: FilledButton.icon(
                onPressed: _startAssistedDispatch,
                icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                label: Text(
                  'चुने हुए $count$partyLabel मतदाताओं को बल्क भेजें (Fast Send)',
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: partyColor == const Color(0xff1e3a8a) ? const Color(0xff16a34a) : partyColor,
                  foregroundColor: Colors.white,
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
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
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
                            _sendToSingleVoter({'mobile': num, 'name': 'साथी'}, forceDirectChat: false);
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
                            _sendToSingleVoter({'mobile': num, 'name': 'साथी'}, forceDirectChat: true);
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
                            _sendToSingleVoter({'mobile': num, 'name': 'साथी'}, forceDirectChat: true);
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
  });

  final List<Map<String, dynamic>> voters;
  final String? imagePath;
  final Uint8List? imageBytes;
  final String? imageName;
  final String Function(Map<String, dynamic> voter) renderMessage;

  @override
  State<_AssistedDispatchSheet> createState() => _AssistedDispatchSheetState();
}

class _AssistedDispatchSheetState extends State<_AssistedDispatchSheet> {
  int _currentIndex = 0;
  final Set<int> _sentIndices = {};

  Future<void> _sendCurrentAndNext() async {
    if (_currentIndex >= widget.voters.length) return;
    final voter = widget.voters[_currentIndex];
    final mobile = (voter['mobile'] ?? '').toString().replaceAll(RegExp(r'\D'), '');
    final name = (voter['name'] ?? voter['fullName'] ?? 'मतदाता').toString().trim();
    final msg = widget.renderMessage(voter);

    _sentIndices.add(_currentIndex);

    final bool hasImage = widget.imageBytes != null ||
        (widget.imagePath != null && !kIsWeb && File(widget.imagePath!).existsSync());

    if (hasImage) {
      if (mobile.isNotEmpty) {
        await Clipboard.setData(ClipboardData(text: mobile));
      }
      final ext = (widget.imageName ?? widget.imagePath ?? '').toLowerCase();
      final mime = ext.endsWith('.png') ? 'image/png' : 'image/jpeg';
      final xFile = widget.imageBytes != null
          ? XFile.fromData(widget.imageBytes!, mimeType: mime, name: widget.imageName ?? 'poster.jpg')
          : XFile(widget.imagePath!, mimeType: mime, name: widget.imageName ?? 'poster.jpg');
      final textToSend = msg.trim().isNotEmpty ? msg : null;

      try {
        await SharePlus.instance.share(
          ShareParams(
            text: textToSend,
            files: [xFile],
            subject: 'मतदाता संदेश - $name',
          ),
        );
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('शेयर नहीं हो सका: $e')),
          );
        }
      }
    } else {
      if (mounted && mobile.isNotEmpty) {
        await openWhatsApp(context, mobile, message: msg);
      }
    }

    if (mounted) {
      if (_currentIndex + 1 < widget.voters.length) {
        setState(() => _currentIndex++);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🎉 सभी चुने हुए मतदाताओं को संदेश भेजा जा चुका है!')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final voter = widget.voters[_currentIndex];
    final name = (voter['name'] ?? voter['fullName'] ?? '').toString().trim();
    final guardian = (voter['guardianName'] ?? '').toString().trim();
    final mobile = (voter['mobile'] ?? '').toString().trim();
    final village = (voter['village'] ?? '').toString().trim();
    final ward = (voter['wardNumber'] ?? voter['partNumber'] ?? '').toString().trim();
    final party = (voter['partyPreference'] ?? '').toString().trim();
    final msg = widget.renderMessage(voter);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.bolt_rounded, color: Color(0xff16a34a), size: 28),
                const SizedBox(width: 8),
                const Text('फास्ट WhatsApp असिस्टेंट', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: (_currentIndex + 1) / widget.voters.length,
              backgroundColor: Colors.grey.shade200,
              color: const Color(0xff16a34a),
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  'प्रगति: ${_currentIndex + 1} / ${widget.voters.length} (भेजे गए: ${_sentIndices.length})',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: muted),
                ),
                if (widget.imagePath != null) ...[
                  const Spacer(),
                  const Text('📷 पोस्टर जुड़ा हुआ है', style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
                ],
              ],
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: const Color(0xff1e3a8a).withValues(alpha: 0.1),
                        child: Text('${_currentIndex + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xff1e3a8a))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            if (guardian.isNotEmpty)
                              Text('पिता/पति: $guardian', style: const TextStyle(fontSize: 12, color: muted)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(mobile, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xff16a34a))),
                      ),
                    ],
                  ),
                  if (party.isNotEmpty && party != 'undecided') ...[
                    const SizedBox(height: 6),
                    Text('पार्टी: ${party.toUpperCase()}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xff1e3a8a))),
                  ],
                  if (village.isNotEmpty || ward.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text('स्थान: $village | भाग/वार्ड: $ward', style: const TextStyle(fontSize: 12, color: muted)),
                  ],
                  const Divider(height: 18),
                  const Text('संदेश प्रीव्यू:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: muted)),
                  const SizedBox(height: 4),
                  Text(
                    msg,
                    style: const TextStyle(fontSize: 13),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (_currentIndex > 0)
                  OutlinedButton(
                    onPressed: () => setState(() => _currentIndex--),
                    child: const Text('पिछला'),
                  ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _sendCurrentAndNext,
                    icon: const Icon(Icons.send_rounded),
                    label: const Text('WhatsApp पर भेजें और अगला', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xff16a34a),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                if (_currentIndex + 1 < widget.voters.length)
                  TextButton(
                    onPressed: () => setState(() => _currentIndex++),
                    child: const Text('छोड़ें'),
                  ),
              ],
            ),
          ],
        ),
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
