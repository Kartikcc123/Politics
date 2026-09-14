import 'dart:io' as io;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/india_locations.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/picked_file_source.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';
import '../../widgets/voter_phonebook.dart'
    show voterPhotoHeaders, voterPhotoUrl;

class VoterEditPage extends StatefulWidget {
  const VoterEditPage({
    super.key,
    required this.voter,
    required this.onSaved,
    this.voterList,
    this.currentIndex,
    this.onVoterChanged,
  });
  final Map<String, dynamic> voter;
  final VoidCallback onSaved;
  final List<Map<String, dynamic>>? voterList;
  final int? currentIndex;
  final ValueChanged<int>? onVoterChanged;

  @override
  State<VoterEditPage> createState() => _VoterEditPageState();
}

class _VoterEditPageState extends State<VoterEditPage> {
  final formKey = GlobalKey<FormState>();
  final fields = <String, TextEditingController>{};
  bool saving = false;
  bool recheckingOcr = false;
  final editPageController = PageController();
  int editStep = 0;
  PlatformFile? selectedPhoto;
  String gender = '';
  String relationType = '';
  String partyPreference = 'undecided';
  String verificationStatus = 'pending';
  String profileCompletionStatus = 'pending';
  late Map<String, dynamic> currentVoter;
  late int currentIndex;

  bool get _isBoothVoter =>
      api.user?['role'] == 'booth' && currentVoter['contactType'] != 'personal';

  static const _sourceLockedFields = {
    'name',
    'surname',
    'guardianName',
    'age',
    'voterId',
    'voterSerial',
    'houseNumber',
    'assemblyNumber',
    'assemblyName',
    'partNumber',
    'sectionNumber',
    'sectionName',
    'tehsil',
    'gramPanchayat',
    'village',
  };

  static const fieldKeys = [
    'name',
    'surname',
    'guardianName',
    'age',
    'dob',
    'mobile',
    'altMobile',
    'voterId',
    'voterSerial',
    'houseNumber',
    'address',
    'location',
    'googleMapUrl',
    'partyAffiliation',
    'assemblyNumber',
    'assemblyName',
    'partNumber',
    'sectionNumber',
    'sectionName',
    'tehsil',
    'gramPanchayat',
    'village',
    'municipality',
    'caste',
    'subCaste',
    'organizationPost',
    'organizationLevel',
    'occupation',
    'workplaceState',
    'workplaceCity',
    'workplaceVillage',
    'spouseName',
    'marriageState',
    'marriageCity',
    'marriageVillage',
    'education',
    'anniversary',
    'notes',
  ];

  @override
  void dispose() {
    editPageController.dispose();
    for (final controller in fields.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    currentVoter = widget.voter;
    currentIndex = widget.currentIndex ?? 0;
    _loadVoterData(currentVoter);
  }

  void _loadVoterData(Map<String, dynamic> voterData) {
    for (final key in fieldKeys) {
      if (!fields.containsKey(key)) {
        fields[key] = TextEditingController();
      }
      fields[key]!.text = _value(voterData[key], key);
    }
    gender = '${voterData['gender'] ?? ''}';
    relationType = '${voterData['relationType'] ?? ''}';
    partyPreference = '${voterData['partyPreference'] ?? 'undecided'}';
    verificationStatus = '${voterData['verificationStatus'] ?? 'pending'}';
    profileCompletionStatus =
        '${voterData['profileCompletionStatus'] ?? 'pending'}';
    selectedPhoto = null;
  }

  void _switchVoter(int newIndex) {
    if (widget.voterList == null ||
        newIndex < 0 ||
        newIndex >= widget.voterList!.length) {
      return;
    }
    setState(() {
      currentIndex = newIndex;
      currentVoter = widget.voterList![newIndex];
      _loadVoterData(currentVoter);
    });
    widget.onVoterChanged?.call(newIndex);
  }

  String _value(dynamic value, [String key = '']) {
    if (value == null) return '';
    final text = '$value';
    final parsed = DateTime.tryParse(text);
    if ((key == 'dob' || key == 'anniversary') && parsed != null) {
      return DateFormat('MM-dd').format(parsed.toLocal());
    }
    return text.contains('T') && text.length >= 10
        ? text.substring(0, 10)
        : text;
  }

  DateTime _monthDayInitial(String key) {
    final text = fields[key]?.text.trim() ?? '';
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

  Future<DateTime?> _pickMonthDay(String key, String label) async {
    var selected = _monthDayInitial(key);
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

  Future<void> save({bool addAnother = false}) async {
    if (!formKey.currentState!.validate()) return;
    setState(() => saving = true);
    try {
      final body = <String, dynamic>{
        for (final entry in fields.entries) entry.key: entry.value.text.trim(),
        'gender': gender,
        'relationType': relationType,
        'partyPreference': partyPreference,
        'verificationStatus': verificationStatus,
        'profileCompletionStatus': profileCompletionStatus,
      };
      if (body['age'] == '') body['age'] = null;
      for (final dateKey in ['dob', 'anniversary']) {
        final original = widget.voter[dateKey];
        final originalText = original == null ? '' : '$original'.trim();
        if ('${body[dateKey] ?? ''}'.trim().isEmpty && originalText.isEmpty) {
          body.remove(dateKey);
        }
      }
      late final dynamic updated;
      if (selectedPhoto != null) {
        updated = await api.uploadFile(
          '/api/members/${currentVoter['_id']}',
          method: 'PUT',
          filename: selectedPhoto!.name,
          fileField: 'photo',
          filePath: pickedFilePath(selectedPhoto!),
          bytes: pickedFileBytes(selectedPhoto!),
          fields: body.map(
              (key, value) => MapEntry(key, value == null ? '' : '$value')),
        );
      } else {
        updated = await api.put('/api/members/${currentVoter['_id']}', body);
      }
      if (updated is Map<String, dynamic>) {
        final savedVoter = Map<String, dynamic>.from(updated);
        currentVoter = savedVoter;
        final list = widget.voterList;
        if (list != null && currentIndex >= 0 && currentIndex < list.length) {
          list[currentIndex] = savedVoter;
        }
        await OfflineVoterCache.merge([savedVoter]);
      }
      api.notifyDataChanged();
      widget.onSaved();
      if (!mounted) return;
      final hasNextVoter = widget.voterList != null &&
          currentIndex < widget.voterList!.length - 1;
      if (hasNextVoter) {
        _switchVoter(currentIndex + 1);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('जानकारी सहेज दी गई। अगला मतदाता खुल गया।'),
        ));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('मतदाता जानकारी सहेज दी गई')));
        Navigator.pop(context);
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> recheckOcr() async {
    if (api.user?['role'] != 'admin' || recheckingOcr) return;
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.document_scanner_outlined, color: blue, size: 40),
        title: const Text('2nd Pass OCR Re-check शुरू करें?'),
        content: const Text(
            'इस मतदाता के सुरक्षित वोटर-कार्ड इमेज को OCR द्वारा पुनः स्कैन किया जाएगा और EPIC, नाम, संबंध, घर संख्या, आयु, लिंग आदि स्वतः अपडेट होंगे।'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('रद्द करें')),
          FilledButton.icon(
            icon: const Icon(Icons.play_arrow_rounded),
            onPressed: () => Navigator.pop(context, true),
            label: const Text('Re-check शुरू करें'),
          ),
        ],
      ),
    );
    if (yes != true) return;
    setState(() => recheckingOcr = true);

    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const PopScope(
        canPop: false,
        child: AlertDialog(
          content: Row(
            children: [
              SizedBox(
                width: 36,
                height: 36,
                child: CircularProgressIndicator(strokeWidth: 3),
              ),
              SizedBox(width: 20),
              Expanded(
                child: Text('कार्ड OCR दोबारा स्कैन हो रहा है...\nकृपया प्रतीक्षा करें।'),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      final updated = await api.post('/api/members/${currentVoter['_id']}/recheck-ocr', {});
      final members = updated['members'] as List?;
      final item = members != null && members.isNotEmpty ? members.first['member'] : null;
      if (item is Map) {
        currentVoter = Map<String, dynamic>.from(item);
        _loadVoterData(currentVoter);
        await OfflineVoterCache.merge([currentVoter]);
      }
      api.notifyDataChanged();
      widget.onSaved();
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop(); // Dismiss loading
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('✅ OCR re-check पूर्ण: विवरण स्वतः अपडेट हो गए हैं।'),
          backgroundColor: Colors.green,
        ));
      }
    } catch (error) {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop(); // Dismiss loading
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('OCR re-check विफल: $error'),
          backgroundColor: Colors.red,
        ));
      }
    } finally {
      if (mounted) setState(() => recheckingOcr = false);
    }
  }
  Future<void> remove() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('मतदाता हटाएं?'),
        content: const Text('यह रिकॉर्ड स्थायी रूप से हट जाएगा।'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('रद्द करें')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('हटाएं')),
        ],
      ),
    );
    if (yes != true) return;
    final voterId = '${widget.voter['_id']}';
    await api.delete('/api/members/$voterId');
    await OfflineVoterCache.removeByIds([voterId]);
    api.notifyDataChanged();
    widget.onSaved();
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xfff7f8fb),
        appBar: AppBar(
          toolbarHeight: 66,
          backgroundColor: Colors.white,
          foregroundColor: navy,
          surfaceTintColor: Colors.white,
          title: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('मतदाता संपादित करें',
                    style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
                Text('मतदाता की जानकारी अपडेट करें',
                    style: TextStyle(color: muted, fontSize: 11)),
              ]),
          actions: [
            if (widget.voterList != null && widget.voterList!.isNotEmpty) ...[
              IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                tooltip: 'पिछला मतदाता',
                onPressed: currentIndex > 0
                    ? () => _switchVoter(currentIndex - 1)
                    : null,
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: blue.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${currentIndex + 1}/${widget.voterList!.length}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 12, color: blue),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.arrow_forward_ios_rounded, size: 18),
                tooltip: 'अगला मतदाता',
                onPressed: currentIndex < widget.voterList!.length - 1
                    ? () => _switchVoter(currentIndex + 1)
                    : null,
              ),
              const SizedBox(width: 4),
            ],
            if (api.user?['role'] != 'booth')
              IconButton.filledTonal(
                tooltip: 'प्रोफाइल प्रिंट करें',
                onPressed: () => printApiPdf(context,
                    path: '/api/export/members/${currentVoter['_id']}.pdf',
                    jobName: 'मतदाता प्रोफाइल'),
                icon: const Icon(Icons.print_rounded, color: blue),
              ),
            const SizedBox(width: 12),
          ],
        ),
        bottomNavigationBar: _stickySaveBar(),
        body: Form(
          key: formKey,
          child: Column(children: [
            _stepHeader(),
            Expanded(
              child: PageView(
                controller: editPageController,
                onPageChanged: (value) => setState(() => editStep = value),
                children: _editPages(),
              ),
            ),
          ]),
        ),
      );

  Widget _stepHeader() {
    const labels = ['व्यक्तिगत', 'चुनावी पता', 'राजनीतिक', 'सर्वे'];
    const icons = [
      Icons.person_outline_rounded,
      Icons.how_to_vote_outlined,
      Icons.groups_outlined,
      Icons.fact_check_outlined,
    ];
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      child: Column(children: [
        Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: softBlue,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icons[editStep], color: blue, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(labels[editStep],
                    style: const TextStyle(
                        color: navy,
                        fontSize: 15,
                        fontWeight: FontWeight.w900)),
                Text('चरण ${editStep + 1} / ${labels.length}',
                    style: const TextStyle(color: muted, fontSize: 11)),
              ],
            ),
          ),
        ]),
        const SizedBox(height: 10),
        Row(
            children: List.generate(labels.length, (index) {
          final active = index <= editStep;
          return Expanded(
            child: Padding(
              padding:
                  EdgeInsets.only(right: index == labels.length - 1 ? 0 : 6),
              child: InkWell(
                onTap: () => _moveStep(index),
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? blue : border,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          );
        })),
      ]),
    );
  }

  List<Widget> _editPages() => [
        _stepPage([
          _profile(),
          _ocrCardReview(),
          _section('व्यक्तिगत जानकारी', Icons.person_outline, [
            if (_isBoothVoter)
              const _FullWidth(Text(
                'मतदाता सूची से प्राप्त जानकारी केवल Admin Review में बदली जा सकती है।',
                style: TextStyle(color: muted, fontWeight: FontWeight.w700),
              )),
            _field('name', 'नाम *', icon: Icons.person_rounded, required: true),
            _field('surname', 'उपनाम', icon: Icons.badge_rounded),
            _field('guardianName', 'पिता / पति का नाम',
                icon: Icons.family_restroom_rounded),
            _dropdown(
                'संबंध',
                relationType,
                const {
                  '': 'चुनें',
                  'father': 'पिता',
                  'husband': 'पति',
                  'mother': 'माता',
                  'other': 'अन्य'
                },
                (v) => relationType = v,
                enabled: !_isBoothVoter),
            _field('age', 'उम्र', icon: Icons.cake_rounded, number: true),
            _dateField('dob', 'जन्म तिथि'),
            _genderCards(),
            _field('mobile', 'मोबाइल नंबर',
                icon: Icons.call_rounded, number: true),
            _field('altMobile', 'वैकल्पिक मोबाइल नंबर',
                icon: Icons.phone_iphone_rounded, number: true),
          ]),
        ]),
        _stepPage([
          _section('पता एवं चुनाव जानकारी', Icons.home_outlined, [
            _field('houseNumber', 'घर संख्या'),
            _field('address', 'पूरा पता', lines: 3),
            _field('location', 'स्थान / क्षेत्र'),
            _field('voterId', 'मतदाता आईडी (EPIC)'),
            _field('voterSerial', 'मतदाता क्रमांक'),
            _field('assemblyNumber', 'विधानसभा संख्या'),
            _field('assemblyName', 'विधानसभा क्षेत्र'),
            _field('partNumber', 'भाग / बूथ संख्या'),
            _field('sectionNumber', 'अनुभाग संख्या'),
            _field('sectionName', 'अनुभाग नाम'),
            _field('tehsil', 'तहसील'),
            _field('gramPanchayat', 'ग्राम पंचायत'),
            _field('village', 'गाँव'),
            _field('municipality', 'नगर पालिका / वार्ड'),
            _googleMapLocationSection(),
          ]),
        ]),
        _stepPage([
          _section('राजनीतिक जानकारी', Icons.groups_outlined, [
            _dropdown(
                'पार्टी पसंद',
                partyPreference,
                const {
                  'undecided': 'अभी तय नहीं',
                  'congress': 'Congress - हाथ',
                  'bjp': 'BJP - कमल',
                  'nota': 'NOTA',
                  'other': 'अन्य पार्टी'
                },
                (v) => partyPreference = v),
            _dropdown(
                'सत्यापन स्थिति',
                verificationStatus,
                const {
                  'pending': 'लंबित',
                  'verified': 'सत्यापित',
                  'needs_review': 'पुनः जांच',
                  'duplicate': 'डुप्लीकेट'
                },
                (v) => verificationStatus = v,
                enabled: !_isBoothVoter),
            _field('organizationPost', 'राजनीतिक / सामाजिक पद'),
            _field('organizationLevel', 'पद स्तर (गाँव/मंडल/ब्लॉक/जिला)'),
            _field('caste', 'जाति'),
            _field('subCaste', 'उपजाति'),
            _field('notes', 'टिप्पणी / विशेष जानकारी', lines: 4, full: true),
          ]),
        ]),
        _stepPage([
          _section('व्यवसाय एवं कार्य-स्थान', Icons.work_outline, [
            _field('occupation', 'व्यवसाय'),
            _field('education', 'शिक्षा'),
            _field('workplaceVillage', 'कार्य-स्थान गाँव'),
            _statePickerField('workplaceState', 'कार्य-स्थान राज्य'),
            _cityPickerField('workplaceCity', 'कार्य-स्थान शहर',
                stateKey: 'workplaceState'),
          ]),
          _section('विवाह संबंधी जानकारी', Icons.favorite_outline, [
            _field('spouseName', 'जीवनसाथी का नाम'),
            _dateField('anniversary', 'विवाह वर्षगांठ'),
            _field('marriageVillage', 'विवाह संबंध वाला गाँव'),
            _statePickerField('marriageState', 'विवाह संबंध वाला राज्य'),
            _cityPickerField('marriageCity', 'विवाह संबंध वाला शहर',
                stateKey: 'marriageState'),
          ]),
          _section('सर्वे पूर्णता', Icons.fact_check_outlined, [
            _dropdown(
                'जानकारी की स्थिति',
                profileCompletionStatus,
                const {
                  'pending': 'जानकारी बाकी है',
                  'complete': 'सभी जानकारी दर्ज है',
                },
                (v) => profileCompletionStatus = v),
          ]),
          if (!_isBoothVoter) _dangerActions(),
        ]),
      ];

  Widget _stepPage(List<Widget> children) => ListView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        children: children,
      );

  Widget _ocrCardReview() {
    final source = widget.voter['sourceDocument'];
    final rawPath =
        source is Map ? '${source['ocrCardImage'] ?? ''}'.trim() : '';
    final path = rawPath.isNotEmpty
        ? rawPath
        : '${widget.voter['ocrCardImage'] ?? widget.voter['cardImage'] ?? ''}'
            .trim();
    if (path.isEmpty) return const SizedBox.shrink();
    final url = voterPhotoUrl(path);
    final reasons = (widget.voter['ocrReviewReasons'] as List?)
            ?.map((value) => '$value')
            .where((value) => value.isNotEmpty)
            .toList() ??
        const <String>[];
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.document_scanner_outlined, color: blue, size: 20),
          SizedBox(width: 8),
          Text('मूल मतदाता कार्ड',
              style: TextStyle(fontWeight: FontWeight.w900, color: navy)),
        ]),
        if (reasons.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text('जांच: ${reasons.join(', ')}',
              style: const TextStyle(color: Color(0xffa15c00), fontSize: 12)),
        ],
        const SizedBox(height: 10),
        SizedBox(
          height: 240,
          width: double.infinity,
          child: ClipRect(
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 5,
              child: Image.network(url,
                  headers: voterPhotoHeaders(url),
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Center(
                      child: Text('मूल कार्ड image उपलब्ध नहीं है'))),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () =>
                  setState(() => verificationStatus = 'needs_review'),
              icon: const Icon(Icons.edit_outlined),
              label: const Text('गलत है, सुधारें'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: FilledButton.icon(
              onPressed: saving
                  ? null
                  : () {
                      setState(() => verificationStatus = 'verified');
                      save();
                    },
              icon: const Icon(Icons.verified_outlined),
              label: const Text('सही है'),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _profile() {
    final mobile =
        fields['mobile']?.text.trim() ?? '${widget.voter['mobile'] ?? ''}';
    final name = fields['name']?.text.trim().isNotEmpty == true
        ? fields['name']!.text.trim()
        : '${widget.voter['name'] ?? '-'}';
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0f071b4b),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          InkWell(
            onTap: _pickPhoto,
            borderRadius: BorderRadius.circular(24),
            child: Stack(clipBehavior: Clip.none, children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border:
                      Border.all(color: blue.withValues(alpha: .25), width: 2),
                ),
                child: ClipOval(
                  child:
                      SizedBox(width: 100, height: 100, child: _photoPreview()),
                ),
              ),
              Positioned(
                right: -4,
                bottom: 6,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
                  decoration: BoxDecoration(
                    color: blue,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: const [
                      BoxShadow(color: Color(0x330d6efd), blurRadius: 10),
                    ],
                  ),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.camera_alt_rounded,
                        color: Colors.white, size: 15),
                    SizedBox(width: 4),
                    Text('फोटो',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w900)),
                  ]),
                ),
              ),
            ]),
          ),
          const SizedBox(width: 18),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(name,
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: navy)),
                const SizedBox(height: 8),
                _ProfileMiniRow(
                    Icons.badge_outlined,
                    'मतदाता आईडी (EPIC)',
                    fields['voterId']!.text.isEmpty
                        ? '-'
                        : fields['voterId']!.text),
                const SizedBox(height: 5),
                _ProfileMiniRow(
                    Icons.tag_rounded,
                    'मतदाता क्रमांक',
                    fields['voterSerial']!.text.isEmpty
                        ? '-'
                        : fields['voterSerial']!.text),
                const SizedBox(height: 8),
                Text(
                    'अंतिम अपडेट: ${_formattedDate(widget.voter['updatedAt'])}',
                    style: const TextStyle(color: muted, fontSize: 12)),
              ])),
        ]),
        const SizedBox(height: 16),
        Wrap(spacing: 9, runSpacing: 9, children: [
          _HeroAction(
            icon: Icons.call_rounded,
            label: 'कॉल',
            color: green,
            onTap: () => callNumber(context, mobile),
          ),
          _HeroAction(
            icon: Icons.chat_rounded,
            label: 'WhatsApp',
            color: const Color(0xff25d366),
            onTap: () =>
                openWhatsApp(context, mobile, message: 'नमस्कार $name जी,'),
          ),
          _HeroAction(
            icon: Icons.sms_rounded,
            label: 'SMS',
            color: blue,
            onTap: _sendSms,
          ),
          _HeroAction(
            icon: Icons.bookmark_border_rounded,
            label: 'सेव करें',
            color: navy,
            onTap: saving ? null : save,
          ),
        ]),
      ]),
    );
  }

  Future<void> _sendSms() async {
    final mobile = (fields['mobile']?.text ?? '${widget.voter['mobile'] ?? ''}')
        .replaceAll(RegExp(r'\D'), '');
    if (mobile.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('SMS के लिए मोबाइल नंबर उपलब्ध नहीं है।')));
      return;
    }
    final uri = Uri.parse('sms:$mobile');
    if (!await launchUrl(uri) && mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('SMS app नहीं खुल सकी।')));
    }
  }

  Widget _genderCards() => _FullWidth(
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('लिंग',
              style: TextStyle(color: muted, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Wrap(spacing: 10, runSpacing: 10, children: [
            _ChoiceCard(
              selected: gender == 'male',
              icon: Icons.male_rounded,
              label: 'पुरुष',
              onTap:
                  _isBoothVoter ? null : () => setState(() => gender = 'male'),
            ),
            _ChoiceCard(
              selected: gender == 'female',
              icon: Icons.female_rounded,
              label: 'महिला',
              onTap: _isBoothVoter
                  ? null
                  : () => setState(() => gender = 'female'),
            ),
            _ChoiceCard(
              selected: gender == 'other',
              icon: Icons.person_outline_rounded,
              label: 'अन्य',
              onTap:
                  _isBoothVoter ? null : () => setState(() => gender = 'other'),
            ),
          ]),
        ]),
      );

  void _moveStep(int target) {
    if (target < 0 || target > 3) return;
    editPageController.animateToPage(target,
        duration: const Duration(milliseconds: 220), curve: Curves.easeOut);
  }

  Widget _stickySaveBar() => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: border)),
            boxShadow: [
              BoxShadow(
                  color: Color(0x14071b4b),
                  blurRadius: 18,
                  offset: Offset(0, -8)),
            ],
          ),
          child: Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: saving || editStep == 0
                    ? null
                    : () => _moveStep(editStep - 1),
                icon: const Icon(Icons.arrow_back_rounded),
                label: const Text('पिछला'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: FilledButton.icon(
                onPressed: saving
                    ? null
                    : editStep < 3
                        ? () => _moveStep(editStep + 1)
                        : save,
                icon: saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Icon(editStep < 3
                        ? Icons.arrow_forward_rounded
                        : Icons.save_rounded),
                label: Text(saving
                    ? 'सहेज रहे हैं...'
                    : editStep < 3
                        ? 'अगला'
                        : 'सुरक्षित करें'),
              ),
            ),
          ]),
        ),
      );

  Widget _photoPreview() {
    if (selectedPhoto != null) {
      if (selectedPhoto!.bytes != null) {
        return Image.memory(selectedPhoto!.bytes!, fit: BoxFit.contain);
      }
      final path = pickedFilePath(selectedPhoto!);
      if (path != null && path.isNotEmpty) {
        return Image.file(io.File(path), fit: BoxFit.contain);
      }
    }
    final photo = '${currentVoter['photo'] ?? widget.voter['photo'] ?? ''}'.trim();
    if (photo.isNotEmpty) {
      final url = photo.startsWith('http') ? photo : '${api.baseUrl}$photo';
      return Image.network(
        url,
        headers: voterPhotoHeaders(url),
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 52),
      );
    }
    return const ColoredBox(
        color: Color(0xffeef3ff), child: Icon(Icons.person, size: 52));
  }

  Future<void> _pickPhoto() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.image,
      withData: kIsWeb,
    );
    if (result == null || !mounted) return;
    setState(() => selectedPhoto = result.files.single);
  }

  Widget _section(String title, IconData icon, List<Widget> children) => Card(
        elevation: 0,
        color: Colors.white,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: const BorderSide(color: border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(icon, color: blue),
              const SizedBox(width: 9),
              Text(title,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w900, color: navy))
            ]),
            const Divider(height: 24),
            LayoutBuilder(builder: (context, box) {
              final width =
                  box.maxWidth < 700 ? box.maxWidth : (box.maxWidth - 24) / 3;
              return Wrap(
                  spacing: 12,
                  runSpacing: 14,
                  children: children
                      .map((child) => SizedBox(
                          width: child is _FullWidth ? box.maxWidth : width,
                          child: child is _FullWidth ? child.child : child))
                      .toList());
            }),
          ]),
        ),
      );

  Widget _field(String key, String label,
      {bool required = false,
      bool number = false,
      int lines = 1,
      bool full = false,
      bool readOnly = false,
      IconData? icon}) {
    final locked =
        readOnly || (_isBoothVoter && _sourceLockedFields.contains(key));
    final field = TextFormField(
      controller: fields[key],
      readOnly: locked,
      maxLines: lines,
      keyboardType: number ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: icon == null ? null : Icon(icon, size: 20),
        suffixIcon:
            locked ? const Icon(Icons.lock_outline_rounded, size: 18) : null,
      ),
      validator: required
          ? (value) =>
              value == null || value.trim().isEmpty ? '$label आवश्यक है' : null
          : null,
    );
    return full ? _FullWidth(field) : field;
  }

  Widget _dateField(String key, String label) => TextFormField(
        controller: fields[key],
        readOnly: true,
        decoration: InputDecoration(
            labelText: label,
            helperText: key == 'dob'
                ? 'सिर्फ तारीख और महीना चुनें — year नहीं'
                : 'तारीख और महीना चुनें',
            prefixIcon: const Icon(Icons.calendar_today_rounded),
            suffixIcon: Row(mainAxisSize: MainAxisSize.min, children: [
              if (fields[key]!.text.isNotEmpty)
                IconButton(
                  tooltip: 'तारीख हटाएँ',
                  onPressed: () => setState(() => fields[key]!.clear()),
                  icon: const Icon(Icons.close_rounded, size: 18),
                ),
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.calendar_month_outlined),
              ),
            ])),
        onTap: () async {
          final date = await _pickMonthDay(key, label);
          if (date != null) {
            setState(
                () => fields[key]!.text = DateFormat('MM-dd').format(date));
          }
        },
      );

  Widget _dropdown(String label, String value, Map<String, String> items,
          ValueChanged<String> changed,
          {bool enabled = true}) =>
      DropdownButtonFormField<String>(
        initialValue: items.containsKey(value) ? value : items.keys.first,
        decoration: InputDecoration(labelText: label),
        items: items.entries
            .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
            .toList(),
        onChanged: enabled
            ? (v) => setState(() {
                  if (v != null) changed(v);
                })
            : null,
      );

  Widget _googleMapLocationSection() {
    final currentUrl = (fields['googleMapUrl']?.text ?? '').trim();
    final hasUrl = currentUrl.isNotEmpty;

    return _FullWidth(
      Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: hasUrl ? const Color(0xfff0fdf4) : const Color(0xfff8fafc),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasUrl ? const Color(0xffbbf7d0) : const Color(0xffe2e8f0),
            width: 1.5,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  hasUrl ? Icons.check_circle_rounded : Icons.map_outlined,
                  color: hasUrl ? const Color(0xff16a34a) : blue,
                  size: 22,
                ),
                const SizedBox(width: 8),
                Text(
                  hasUrl ? 'Google Maps लोकेशन सेट है' : 'Google Maps लोकेशन',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: hasUrl ? const Color(0xff15803d) : navy,
                  ),
                ),
              ],
            ),
            if (hasUrl) ...[
              const SizedBox(height: 6),
              Text(
                currentUrl,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.tonalIcon(
                    icon: const Icon(Icons.open_in_new_rounded, size: 17),
                    label: const Text('Maps में खोलें'),
                    onPressed: () async {
                      final uri = Uri.parse(currentUrl);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri,
                            mode: LaunchMode.externalApplication);
                      } else {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Maps नहीं खुल सका।')),
                          );
                        }
                      }
                    },
                  ),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.edit_location_alt_rounded, size: 17),
                    label: const Text('बदलें'),
                    onPressed: _openGoogleMapLocationPicker,
                  ),
                  TextButton.icon(
                    icon: const Icon(Icons.delete_outline_rounded,
                        color: Colors.red, size: 17),
                    label: const Text('हटाएं',
                        style: TextStyle(color: Colors.red)),
                    onPressed: () =>
                        setState(() => fields['googleMapUrl']!.clear()),
                  ),
                ],
              ),
            ] else ...[
              const SizedBox(height: 6),
              const Text(
                'मतदाता के घर/दुकान की Google Maps लोकेशन आसानी से जोड़ें ताकि नेविगेशन में सुविधा रहे।',
                style: TextStyle(fontSize: 13, color: muted),
              ),
              const SizedBox(height: 10),
              FilledButton.icon(
                icon: const Icon(Icons.add_location_alt_rounded),
                label: const Text('Google Maps से लोकेशन सेट करें'),
                onPressed: _openGoogleMapLocationPicker,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _openGoogleMapLocationPicker() async {
    final addressParts = [
      fields['houseNumber']?.text,
      fields['address']?.text,
      fields['location']?.text,
      fields['village']?.text,
      fields['gramPanchayat']?.text,
      fields['tehsil']?.text,
      'Rajasthan',
      'India'
    ]
        .where((p) => p != null && p.trim().isNotEmpty)
        .map((p) => p!.trim())
        .toList();

    final suggestedQuery = addressParts.take(4).join(', ');

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            12,
            16,
            MediaQuery.of(sheetCtx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Row(
                children: [
                  Icon(Icons.pin_drop_rounded, color: Colors.red, size: 24),
                  SizedBox(width: 8),
                  Text(
                    'Google Maps लोकेशन चुनें',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: navy),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (suggestedQuery.isNotEmpty)
                Card(
                  elevation: 0,
                  color: const Color(0xffeff6ff),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xffbfdbfe)),
                  ),
                  child: ListTile(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xff3b82f6),
                      child: Icon(Icons.home_rounded,
                          color: Colors.white, size: 20),
                    ),
                    title: const Text(
                      'मतदाता के पते से लोकेशन लिंक बनाएं (1-Click)',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    subtitle: Text(
                      suggestedQuery,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          const TextStyle(fontSize: 12, color: Colors.black87),
                    ),
                    trailing:
                        const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () {
                      final mapUrl =
                          'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(suggestedQuery)}';
                      setState(() => fields['googleMapUrl']!.text = mapUrl);
                      Navigator.pop(sheetCtx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text(
                                '✅ पते से Google Maps लिंक सेट हो गया।')),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 10),
              Card(
                elevation: 0,
                color: const Color(0xfff8fafc),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xffe2e8f0)),
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xff10b981),
                    child: Icon(Icons.search_rounded,
                        color: Colors.white, size: 20),
                  ),
                  title: const Text(
                    'लैंडमार्क या जगह के नाम से खोजें',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  subtitle: const Text(
                    'दुकान, चौराहा, स्कूल या मंदिर का नाम लिखकर लिंक बनाएं',
                    style: TextStyle(fontSize: 12, color: muted),
                  ),
                  trailing:
                      const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                  onTap: () async {
                    Navigator.pop(sheetCtx);
                    final query =
                        await _promptPlaceSearchDialog(suggestedQuery);
                    if (query != null && query.trim().isNotEmpty) {
                      final mapUrl =
                          'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query.trim())}';
                      setState(() => fields['googleMapUrl']!.text = mapUrl);
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content:
                                  Text('✅ Google Maps लिंक सेट हो गया।')),
                        );
                      }
                    }
                  },
                ),
              ),
              const SizedBox(height: 10),
              Card(
                elevation: 0,
                color: const Color(0xfff8fafc),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xffe2e8f0)),
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xffea4335),
                    child:
                        Icon(Icons.map_rounded, color: Colors.white, size: 20),
                  ),
                  title: const Text(
                    'Google Maps ऐप खोलें',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  subtitle: const Text(
                    'Maps ऐप में लोकेशन देखें और शेयर लिंक क्लिपबोर्ड पर कॉपी करें',
                    style: TextStyle(fontSize: 12, color: muted),
                  ),
                  trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                  onTap: () async {
                    final query = suggestedQuery.isNotEmpty
                        ? suggestedQuery
                        : 'Rajasthan';
                    final mapUri = Uri.parse(
                        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}');
                    if (await canLaunchUrl(mapUri)) {
                      await launchUrl(mapUri,
                          mode: LaunchMode.externalApplication);
                    }
                  },
                ),
              ),
              const SizedBox(height: 10),
              ListTile(
                leading: const Icon(Icons.content_paste_rounded, color: blue),
                title: const Text(
                    'क्लिपबोर्ड से लिंक चिपकाएं (Paste from Clipboard)'),
                onTap: () async {
                  final data =
                      await Clipboard.getData(Clipboard.kTextPlain);
                  final text = (data?.text ?? '').trim();
                  if (text.isNotEmpty) {
                    setState(() => fields['googleMapUrl']!.text = text);
                    if (sheetCtx.mounted) Navigator.pop(sheetCtx);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(
                                '✅ लिंक चिपकाया गया: ${text.length > 35 ? "${text.substring(0, 35)}..." : text}')),
                      );
                    }
                  } else {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('क्लिपबोर्ड खाली है।')),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<String?> _promptPlaceSearchDialog(String initialText) async {
    final textCtrl = TextEditingController(text: initialText);
    return showDialog<String>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('जगह या लैंडमार्क खोजें'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'गाँव, मोहल्ला, दुकान या लैंडमार्क का नाम लिखें:',
              style: TextStyle(fontSize: 13, color: muted),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: textCtrl,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'उदा. बस स्टैंड गंगापुर या शनि मंदिर',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.place_rounded),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('रद्द करें'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogCtx, textCtrl.text),
            child: const Text('लिंक सेट करें'),
          ),
        ],
      ),
    );
  }

  Widget _statePickerField(String key, String label,
      {ValueChanged<String>? onStateChanged}) {
    final controller = fields[key]!;
    final locked = _isBoothVoter && _sourceLockedFields.contains(key);
    return InkWell(
      onTap: locked ? null : () => _showStatePicker(key, label, onStateChanged),
      borderRadius: BorderRadius.circular(10),
      child: IgnorePointer(
        child: TextFormField(
          controller: controller,
          readOnly: true,
          decoration: InputDecoration(
            labelText: label,
            prefixIcon: const Icon(Icons.map_outlined, size: 20),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (controller.text.isNotEmpty && !locked)
                  IconButton(
                    icon: const Icon(Icons.clear_rounded, size: 18),
                    onPressed: () => setState(() => controller.clear()),
                  ),
                const Icon(Icons.arrow_drop_down_rounded, size: 24),
                const SizedBox(width: 6),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _cityPickerField(String key, String label,
      {required String stateKey}) {
    final controller = fields[key]!;
    final locked = _isBoothVoter && _sourceLockedFields.contains(key);
    return InkWell(
      onTap: locked ? null : () => _showCityPicker(key, label, stateKey),
      borderRadius: BorderRadius.circular(10),
      child: IgnorePointer(
        child: TextFormField(
          controller: controller,
          readOnly: true,
          decoration: InputDecoration(
            labelText: label,
            prefixIcon: const Icon(Icons.location_city_rounded, size: 20),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (controller.text.isNotEmpty && !locked)
                  IconButton(
                    icon: const Icon(Icons.clear_rounded, size: 18),
                    onPressed: () => setState(() => controller.clear()),
                  ),
                const Icon(Icons.arrow_drop_down_rounded, size: 24),
                const SizedBox(width: 6),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _showStatePicker(String key, String label,
      ValueChanged<String>? onStateChanged) async {
    final controller = fields[key]!;
    String searchQuery = '';
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filteredStates = IndiaLocations.states.where((s) {
              final q = searchQuery.toLowerCase().trim();
              return q.isEmpty || s.toLowerCase().contains(q);
            }).toList();

            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.75,
              minChildSize: 0.4,
              maxChildSize: 0.9,
              builder: (ctx, scrollController) {
                return Column(
                  children: [
                    Container(
                      margin: const EdgeInsets.symmetric(vertical: 10),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                      child: Row(
                        children: [
                          const Icon(Icons.map_rounded, color: blue),
                          const SizedBox(width: 8),
                          Text(
                            label,
                            style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                color: navy),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            icon: const Icon(Icons.edit_note_rounded, size: 18),
                            label: const Text('हाथ से लिखें'),
                            onPressed: () async {
                              Navigator.pop(sheetCtx);
                              final custom =
                                  await _showCustomTextInputDialog(label);
                              if (custom != null && custom.trim().isNotEmpty) {
                                setState(() {
                                  controller.text = custom.trim();
                                  onStateChanged?.call(custom.trim());
                                });
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 4),
                      child: TextField(
                        autofocus: false,
                        decoration: InputDecoration(
                          hintText:
                              'राज्य खोजें (उदा. राजस्थान, गुजरात, MP)...',
                          prefixIcon: const Icon(Icons.search_rounded),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                        ),
                        onChanged: (val) =>
                            setSheetState(() => searchQuery = val),
                      ),
                    ),
                    const Divider(height: 16),
                    Expanded(
                      child: ListView.builder(
                        controller: scrollController,
                        itemCount: filteredStates.length,
                        itemBuilder: (context, idx) {
                          final state = filteredStates[idx];
                          final isSelected = controller.text == state ||
                              (controller.text.isNotEmpty &&
                                  state.startsWith(controller.text));
                          return ListTile(
                            leading: Icon(
                              isSelected
                                  ? Icons.check_circle_rounded
                                  : Icons.radio_button_unchecked_rounded,
                              color: isSelected ? blue : Colors.grey,
                            ),
                            title: Text(
                              state,
                              style: TextStyle(
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isSelected ? blue : Colors.black87,
                              ),
                            ),
                            onTap: () => Navigator.pop(sheetCtx, state),
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );

    if (result != null) {
      setState(() {
        controller.text = result;
        onStateChanged?.call(result);
      });
    }
  }

  Future<void> _showCityPicker(
      String key, String label, String stateKey) async {
    final controller = fields[key]!;
    final currentState = fields[stateKey]?.text.trim();
    final cities = IndiaLocations.getCities(currentState);
    String searchQuery = '';

    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filteredCities = cities.where((c) {
              final q = searchQuery.toLowerCase().trim();
              return q.isEmpty || c.toLowerCase().contains(q);
            }).toList();

            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.75,
              minChildSize: 0.4,
              maxChildSize: 0.9,
              builder: (ctx, scrollController) {
                return Column(
                  children: [
                    Container(
                      margin: const EdgeInsets.symmetric(vertical: 10),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                      child: Row(
                        children: [
                          const Icon(Icons.location_city_rounded, color: blue),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              currentState != null && currentState.isNotEmpty
                                  ? '$label ($currentState)'
                                  : label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: navy),
                            ),
                          ),
                          TextButton.icon(
                            icon: const Icon(Icons.edit_note_rounded, size: 18),
                            label: const Text('नया शहर लिखें'),
                            onPressed: () async {
                              Navigator.pop(sheetCtx);
                              final custom =
                                  await _showCustomTextInputDialog(label);
                              if (custom != null && custom.trim().isNotEmpty) {
                                setState(
                                    () => controller.text = custom.trim());
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 4),
                      child: TextField(
                        autofocus: false,
                        decoration: InputDecoration(
                          hintText:
                              'शहर / कस्बा खोजें (उदा. भीलवाड़ा, गंगापुर, जयपुर)...',
                          prefixIcon: const Icon(Icons.search_rounded),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                        ),
                        onChanged: (val) =>
                            setSheetState(() => searchQuery = val),
                      ),
                    ),
                    const Divider(height: 16),
                    Expanded(
                      child: ListView.builder(
                        controller: scrollController,
                        itemCount: filteredCities.length,
                        itemBuilder: (context, idx) {
                          final city = filteredCities[idx];
                          final isSelected = controller.text == city ||
                              (controller.text.isNotEmpty &&
                                  city.startsWith(controller.text));
                          return ListTile(
                            leading: Icon(
                              isSelected
                                  ? Icons.check_circle_rounded
                                  : Icons.location_on_outlined,
                              color: isSelected ? blue : Colors.grey,
                            ),
                            title: Text(
                              city,
                              style: TextStyle(
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isSelected ? blue : Colors.black87,
                              ),
                            ),
                            onTap: () => Navigator.pop(sheetCtx, city),
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );

    if (result != null) {
      setState(() => controller.text = result);
    }
  }

  Future<String?> _showCustomTextInputDialog(String title) async {
    final textCtrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text('$title दर्ज करें'),
        content: TextField(
          controller: textCtrl,
          autofocus: true,
          decoration: InputDecoration(
            labelText: title,
            hintText: 'नाम लिखें...',
            border: const OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('रद्द करें'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogCtx, textCtrl.text),
            child: const Text('सुरक्षित करें'),
          ),
        ],
      ),
    );
  }

  Widget _dangerActions() => Padding(
        padding: const EdgeInsets.only(bottom: 24),
        child: Wrap(
            alignment: WrapAlignment.end,
            spacing: 12,
            runSpacing: 10,
            children: [
              OutlinedButton.icon(
                  onPressed: saving ? null : remove,
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  label:
                      const Text('हटाएं', style: TextStyle(color: Colors.red))),
            ]),
      );

  String _formattedDate(dynamic raw) {
    final date = DateTime.tryParse('${raw ?? ''}');
    return date == null
        ? '-'
        : DateFormat('dd MMM yyyy, hh:mm a').format(date.toLocal());
  }
}

class _FullWidth extends StatelessWidget {
  const _FullWidth(this.child);
  final Widget child;
  @override
  Widget build(BuildContext context) => child;
}

class _HeroAction extends StatelessWidget {
  const _HeroAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 116,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: .08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: .18)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: navy, fontSize: 12, fontWeight: FontWeight.w900)),
          ]),
        ),
      );
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard({
    required this.selected,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 124,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: selected ? softBlue : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: selected ? blue : border, width: 1.2),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, color: selected ? blue : muted, size: 21),
            const SizedBox(width: 7),
            Text(label,
                style: TextStyle(
                    color: selected ? blue : navy,
                    fontWeight: FontWeight.w900)),
          ]),
        ),
      );
}

class _ProfileMiniRow extends StatelessWidget {
  const _ProfileMiniRow(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: softBlue,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: blue, size: 15),
        ),
        const SizedBox(width: 9),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(color: muted, fontSize: 11)),
            Text(value,
                style: const TextStyle(
                    color: navy, fontSize: 14, fontWeight: FontWeight.w900)),
          ]),
        ),
      ]);
}
