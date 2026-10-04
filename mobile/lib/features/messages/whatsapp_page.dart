import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/theme.dart';

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
  String? _pickedImageName;

  // Filter selections
  String _selectedVillage = 'all'; // 'all' or village name
  String _selectedPart = 'all'; // 'all' or part number
  String _selectedCaste = 'all'; // 'all' or caste name
  bool _onlyWithMobile = true;

  // Options from DB
  List<Map<String, dynamic>> _villageOptions = [];
  List<Map<String, dynamic>> _partOptions = [];
  List<Map<String, dynamic>> _casteOptions = [];
  bool _loadingFilters = true;

  // Voters
  List<Map<String, dynamic>> _voters = [];
  bool _loadingVoters = false;
  final Set<String> _selectedVoterIds = {};

  // Quick message presets
  static const Map<String, String> _presets = {
    'सामान्य': 'नमस्कार {{name}} जी,\n\nआशा है आप सपरिवार सकुशल होंगे।',
    'बधाई/शुभकामनाएँ': 'हार्दिक शुभकामनाएँ {{name}} जी! 💐\nआपके सुख, समृद्धि एवं उत्तम स्वास्थ्य की कामना करते हैं।',
    'निमंत्रण/कार्यक्रम': 'सादर प्रणाम {{name}} जी,\n\nआपको हमारे आगामी विशेष कार्यक्रम में सादर आमंत्रित किया जाता है।\nस्थान: {{village}}\nकृपया सपरिवार पधारकर अनुग्रहित करें।',
    'मतदान अपील': 'सादर प्रणाम {{name}} जी,\n\nलोकतंत्र के महापर्व में अपने अमूल्य मत का प्रयोग अवश्य करें। आपका एक वोट क्षेत्र के विकास के लिए महत्वपूर्ण है।\nवार्ड/भाग: {{ward}}',
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
    setState(() => _loadingFilters = true);

    try {
      // 1. Fetch live distinct villages from DB
      final dynamic vRes = await api.get('/api/members/field-values?field=village&limit=300');
      if (vRes is Map && vRes['items'] is List) {
        final raw = vRes['items'] as List;
        _villageOptions = raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
      }

      // 2. Fetch live distinct parts from DB
      final dynamic pRes = await api.get('/api/members/field-values?field=partNumber&limit=300');
      if (pRes is Map && pRes['items'] is List) {
        final raw = pRes['items'] as List;
        _partOptions = raw
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

      // 3. Fetch live distinct castes from DB
      final dynamic cRes = await api.get('/api/members/field-values?field=caste&limit=150');
      if (cRes is Map && cRes['items'] is List) {
        final raw = cRes['items'] as List;
        _casteOptions = raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((e) => (e['value'] ?? '').toString().trim().isNotEmpty)
            .toList();
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _loadingFilters = false);
      _fetchVoters();
    }
  }

  Future<void> _fetchVoters() async {
    setState(() => _loadingVoters = true);
    try {
      final queryParams = <String, String>{
        'limit': '500',
        'paged': 'false',
      };
      if (_onlyWithMobile) queryParams['hasMobile'] = 'true';
      if (_selectedVillage != 'all') queryParams['village'] = _selectedVillage;
      if (_selectedPart != 'all') queryParams['partNumber'] = _selectedPart;
      if (_selectedCaste != 'all') queryParams['caste'] = _selectedCaste;
      final q = _searchController.text.trim();
      if (q.isNotEmpty) queryParams['q'] = q;

      final dynamic res = await api.get('/api/members?${Uri(queryParameters: queryParams).query}');
      List<Map<String, dynamic>> items = [];
      if (res is List) {
        final rawList = res;
        items = rawList
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      } else if (res is Map && res['items'] is List) {
        final rawList = res['items'] as List;
        items = rawList
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
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

  Future<void> _pickImage() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );
      if (result != null && result.files.isNotEmpty) {
        final path = result.files.first.path;
        if (path != null) {
          setState(() {
            _pickedImagePath = path;
            _pickedImageName = result.files.first.name;
          });
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

  Future<void> _sendToSingleVoter(Map<String, dynamic> voter) async {
    final mobile = (voter['mobile'] ?? '').toString().replaceAll(RegExp(r'\D'), '');
    if (mobile.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('इस मतदाता का मोबाइल नंबर दर्ज नहीं है।')),
      );
      return;
    }

    final rendered = _renderMessage(voter);

    if (_pickedImagePath != null && File(_pickedImagePath!).existsSync()) {
      try {
        await SharePlus.instance.share(
          ShareParams(
            text: rendered,
            files: [XFile(_pickedImagePath!)],
          ),
        );
        return;
      } catch (_) {}
    }

    if (mounted) {
      await openWhatsApp(context, mobile, message: rendered);
    }
  }

  Future<void> _shareDirectToWhatsApp() async {
    final rendered = _renderMessage(null);
    if (_pickedImagePath != null && File(_pickedImagePath!).existsSync()) {
      try {
        await SharePlus.instance.share(
          ShareParams(
            text: rendered,
            files: [XFile(_pickedImagePath!)],
          ),
        );
        return;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('शेयर नहीं हो सका: $e')),
          );
        }
      }
    } else {
      await SharePlus.instance.share(
        ShareParams(text: rendered),
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
        renderMessage: _renderMessage,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalWithMobile = _voters.where((v) => (v['mobile'] ?? '').toString().trim().isNotEmpty).length;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        title: const Text('WhatsApp संदेश केंद्र', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: blue,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          tabs: const [
            Tab(icon: Icon(Icons.groups_rounded), text: 'मतदाता सूची (गाँव/वार्ड)'),
            Tab(icon: Icon(Icons.share_rounded), text: 'डायरेक्ट शेयर व संपर्क'),
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
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.campaign_rounded, color: blue, size: 22),
                const SizedBox(width: 8),
                const Text('पोस्टर व संदेश तैयार करें', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const Spacer(),
                if (_pickedImagePath == null)
                  FilledButton.tonalIcon(
                    onPressed: _pickImage,
                    icon: const Icon(Icons.add_photo_alternate_rounded, size: 18),
                    label: const Text('फोटो / पोस्टर', style: TextStyle(fontSize: 12)),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                  ),
              ],
            ),
            if (_pickedImagePath != null) ...[
              const SizedBox(height: 10),
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
                      child: Image.file(
                        File(_pickedImagePath!),
                        width: 48,
                        height: 48,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('📷 पोस्टर जुड़ा हुआ है', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green)),
                          Text(_pickedImageName ?? 'poster.jpg', style: const TextStyle(fontSize: 11, color: muted), overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                      onPressed: _removeImage,
                      tooltip: 'फोटो हटाएं',
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 10),
            TextField(
              controller: _messageController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'यहाँ अपना संदेश लिखें... (उदा. नमस्कार {{name}} जी...)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: blue, width: 2)),
                filled: true,
                fillColor: Colors.grey.shade50,
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 8),
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
                      onPressed: () => setState(() => _messageController.text = e.value),
                    ),
                  )),
                ],
              ),
            ),
            const SizedBox(height: 4),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  const Text('टैग जोड़ें: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: muted)),
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
    );
  }

  Widget _tagChip(String label, String tag) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 11, color: blue, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.grey.shade100,
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
    return Column(
      children: [
        _buildComposerCard(),
        _buildFiltersCard(),
        _buildVoterListHeader(totalWithMobile),
        Expanded(
          child: _loadingVoters
              ? const Center(child: CircularProgressIndicator())
              : _voters.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.person_search_rounded, size: 54, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          const Text('कोई मतदाता नहीं मिला।', style: TextStyle(fontWeight: FontWeight.bold, color: muted)),
                          const Text('कृपया गाँव, भाग या जाति फ़िल्टर बदलें।', style: TextStyle(fontSize: 12, color: muted)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
                      itemCount: _voters.length,
                      itemBuilder: (ctx, idx) => _buildVoterCard(_voters[idx]),
                    ),
        ),
      ],
    );
  }

  Widget _buildFiltersCard() {
    return Card(
      elevation: 1,
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            // Row 1: Village & Part Dropdowns
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<String>(
                    value: _villageOptions.any((v) => v['value'] == _selectedVillage) ? _selectedVillage : 'all',
                    decoration: InputDecoration(
                      labelText: 'गाँव / पंचायत',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      isDense: true,
                    ),
                    items: [
                      const DropdownMenuItem(value: 'all', child: Text('सभी गाँव / पंचायत', style: TextStyle(fontSize: 13))),
                      ..._villageOptions.map((v) => DropdownMenuItem(
                            value: '${v['value']}',
                            child: Text('${v['label'] ?? v['value']} (${v['count'] ?? ''})', style: const TextStyle(fontSize: 13)),
                          )),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedVillage = val);
                        _fetchVoters();
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<String>(
                    value: _partOptions.any((p) => p['value'] == _selectedPart) ? _selectedPart : 'all',
                    decoration: InputDecoration(
                      labelText: 'भाग / बूथ',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      isDense: true,
                    ),
                    items: [
                      const DropdownMenuItem(value: 'all', child: Text('सभी भाग', style: TextStyle(fontSize: 13))),
                      ..._partOptions.map((p) => DropdownMenuItem(
                            value: '${p['value']}',
                            child: Text('भाग ${p['value']} (${p['count'] ?? ''})', style: const TextStyle(fontSize: 13)),
                          )),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedPart = val);
                        _fetchVoters();
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Row 2: Caste Filter & Live Search
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _casteOptions.any((c) => c['value'] == _selectedCaste) ? _selectedCaste : 'all',
                    decoration: InputDecoration(
                      labelText: 'जाति फ़िल्टर',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      isDense: true,
                    ),
                    items: [
                      const DropdownMenuItem(value: 'all', child: Text('सभी जातियाँ', style: TextStyle(fontSize: 13))),
                      ..._casteOptions.map((c) => DropdownMenuItem(
                            value: '${c['value']}',
                            child: Text('${c['label'] ?? c['value']} (${c['count'] ?? ''})', style: const TextStyle(fontSize: 13)),
                          )),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedCaste = val);
                        _fetchVoters();
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: (_) => _fetchVoters(),
                    decoration: InputDecoration(
                      hintText: 'नाम, मोबाइल...',
                      hintStyle: const TextStyle(fontSize: 12),
                      prefixIcon: const Icon(Icons.search_rounded, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
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
            const SizedBox(height: 4),
            Row(
              children: [
                Checkbox(
                  value: _onlyWithMobile,
                  activeColor: green,
                  visualDensity: VisualDensity.compact,
                  onChanged: (val) {
                    setState(() => _onlyWithMobile = val ?? true);
                    _fetchVoters();
                  },
                ),
                const Text('केवल मोबाइल नंबर वाले मतदाता दिखाएँ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const Spacer(),
                IconButton.filledTonal(
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  onPressed: _fetchVoters,
                  tooltip: 'सूची ताज़ा करें',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVoterListHeader(int totalWithMobile) {
    final allSelected = _voters.isNotEmpty &&
        _selectedVoterIds.length == _voters.where((v) => (v['mobile'] ?? '').toString().trim().isNotEmpty).length;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Row(
              children: [
                const Icon(Icons.phone_iphone_rounded, color: green, size: 15),
                const SizedBox(width: 4),
                Text(
                  'मोबाइल उपलब्ध: $totalWithMobile / ${_voters.length}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: green),
                ),
              ],
            ),
          ),
          const Spacer(),
          TextButton.icon(
            onPressed: () {
              setState(() {
                if (allSelected) {
                  _selectedVoterIds.clear();
                } else {
                  _selectedVoterIds.clear();
                  for (final v in _voters) {
                    final mob = (v['mobile'] ?? '').toString().trim();
                    final id = (v['_id'] ?? '').toString();
                    if (mob.isNotEmpty && id.isNotEmpty) {
                      _selectedVoterIds.add(id);
                    }
                  }
                }
              });
            },
            icon: Icon(allSelected ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded, size: 18),
            label: Text(allSelected ? 'सभी हटाएं' : 'सभी चुनें (${_selectedVoterIds.length})', style: const TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _buildVoterCard(Map<String, dynamic> voter) {
    final id = (voter['_id'] ?? '').toString();
    final name = (voter['name'] ?? voter['fullName'] ?? 'अज्ञात').toString().trim();
    final guardian = (voter['guardianName'] ?? '').toString().trim();
    final mobile = (voter['mobile'] ?? '').toString().trim();
    final caste = (voter['caste'] ?? '').toString().trim();
    final village = (voter['village'] ?? voter['gramPanchayat'] ?? '').toString().trim();
    final ward = (voter['wardNumber'] ?? voter['partNumber'] ?? '').toString().trim();
    final isSelected = _selectedVoterIds.contains(id);
    final hasMobile = mobile.isNotEmpty;

    return Card(
      elevation: 0.8,
      margin: const EdgeInsets.symmetric(vertical: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? Colors.green.shade300 : Colors.grey.shade200,
          width: isSelected ? 1.5 : 1,
        ),
      ),
      color: isSelected ? Colors.green.shade50.withValues(alpha: 0.3) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            Checkbox(
              value: isSelected,
              activeColor: green,
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      if (caste.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(caste, style: const TextStyle(fontSize: 10, color: blue, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                  if (guardian.isNotEmpty)
                    Text('पिता/पति: $guardian', style: const TextStyle(fontSize: 12, color: muted)),
                  const SizedBox(height: 3),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      if (village.isNotEmpty)
                        _smallPill(Icons.holiday_village_outlined, village),
                      if (ward.isNotEmpty)
                        _smallPill(Icons.location_on_outlined, 'भाग/वार्ड $ward'),
                      if (hasMobile)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.phone_rounded, color: green, size: 11),
                              const SizedBox(width: 3),
                              Text(mobile, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: green)),
                            ],
                          ),
                        )
                      else
                        const Text('मोबाइल नहीं है', style: TextStyle(fontSize: 11, color: Colors.redAccent)),
                    ],
                  ),
                ],
              ),
            ),
            if (hasMobile)
              FilledButton.icon(
                onPressed: () => _sendToSingleVoter(voter),
                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 14),
                label: const Text('WhatsApp', style: TextStyle(fontSize: 11)),
                style: FilledButton.styleFrom(
                  backgroundColor: green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  visualDensity: VisualDensity.compact,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _smallPill(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: muted),
          const SizedBox(width: 3),
          Text(text, style: const TextStyle(fontSize: 10, color: muted, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildBottomActionBar() {
    final count = _selectedVoterIds.length;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -3)),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: _startAssistedDispatch,
                icon: const Icon(Icons.send_rounded, color: Colors.white),
                label: Text(
                  'चुने हुए $count मतदाताओं को भेजें (Fast Send)',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: green,
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
                    Icon(Icons.share_rounded, color: blue, size: 24),
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
                    label: const Text('WhatsApp पर शेयर करें (Direct Share)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    style: FilledButton.styleFrom(
                      backgroundColor: green,
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
                    Icon(Icons.person_add_alt_1_rounded, color: blue, size: 24),
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
                          hintText: '10 अंकों का मोबाइल नंबर',
                          prefixIcon: const Icon(Icons.phone_rounded),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: () {
                        final num = _customPhoneController.text.trim();
                        if (num.length < 10) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('कृपया सही 10-अंकों का मोबाइल नंबर लिखें।')),
                          );
                          return;
                        }
                        _sendToSingleVoter({'mobile': num, 'name': 'साथी'});
                      },
                      icon: const Icon(Icons.send_rounded, size: 18),
                      label: const Text('भेजें'),
                      style: FilledButton.styleFrom(
                        backgroundColor: green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
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
    required this.renderMessage,
  });

  final List<Map<String, dynamic>> voters;
  final String? imagePath;
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
    final msg = widget.renderMessage(voter);

    _sentIndices.add(_currentIndex);

    if (widget.imagePath != null && File(widget.imagePath!).existsSync()) {
      try {
        await SharePlus.instance.share(
          ShareParams(
            text: msg,
            files: [XFile(widget.imagePath!)],
          ),
        );
      } catch (_) {}
    } else {
      if (mounted) {
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
                const Icon(Icons.bolt_rounded, color: green, size: 28),
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
              color: green,
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
            const SizedBox(height: 6),
            Text(
              'प्रगति: ${_currentIndex + 1} / ${widget.voters.length} (भेजे गए: ${_sentIndices.length})',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: muted),
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
                        backgroundColor: blue.withValues(alpha: 0.1),
                        child: Text('${_currentIndex + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: blue)),
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
                        child: Text(mobile, style: const TextStyle(fontWeight: FontWeight.bold, color: green)),
                      ),
                    ],
                  ),
                  if (village.isNotEmpty || ward.isNotEmpty) ...[
                    const SizedBox(height: 8),
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
                      backgroundColor: green,
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
