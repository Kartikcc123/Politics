import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';

class BulkMessagePage extends StatefulWidget {
  const BulkMessagePage({super.key, this.initialEventType = 'general'});

  final String initialEventType;

  @override
  State<BulkMessagePage> createState() => _BulkMessagePageState();
}

class _BulkMessagePageState extends State<BulkMessagePage> {
  final title = TextEditingController(text: 'WhatsApp Campaign');
  final message = TextEditingController();
  final eventName = TextEditingController();
  final templateName = TextEditingController();
  final customPhones = TextEditingController();

  // Filters
  final selectedFilters = <String, Map<String, String>>{};
  final selectedLabels = <String, String>{};

  // State
  String eventType = 'general';
  String senderId = '';
  DateTime occasionDate = DateTime.now();
  DateTime scheduledAt = DateTime.now();
  int batchSize = 10;
  int intervalSeconds = 60;
  int messageDelaySeconds = 5;
  int dailyLimit = 200;
  int refreshKey = 0;
  bool sending = false;
  Map<String, dynamic>? preview;

  // Recipient Mode: 'db' (database filters), 'custom' (manual phone numbers), 'direct' (whatsapp groups)
  String recipientMode = 'db';

  // Photo / Media Attachment
  String? pickedImagePath;
  String? pickedImageName;
  bool attachPhoto = true;

  // Live Voters preview
  List<Map<String, dynamic>> previewVoters = [];
  bool loadingPreviewVoters = false;
  final Set<String> selectedVoterIds = {};

  @override
  void initState() {
    super.initState();
    eventType = widget.initialEventType;
    message.text = defaultDrafts[eventType] ?? defaultDrafts['general']!;
  }

  static const defaultDrafts = {
    'general': 'नमस्कार {{name}} जी,\n\nआशा है आप सपरिवार सकुशल होंगे।',
    'birthday':
        '🎂 जन्मदिन की हार्दिक शुभकामनाएँ {{name}} जी! आपका जीवन सुख, स्वास्थ्य और सफलता से भरा रहे।',
    'anniversary':
        '💐 विवाह वर्षगाँठ की हार्दिक शुभकामनाएँ {{name}} जी! आपका दाम्पत्य जीवन सदैव सुखमय रहे।',
    'event':
        'नमस्कार {{name}} जी, आपको {{event}} में सादर आमंत्रित किया जाता है।\nस्थान: {{village}}\nदिनांक: {{date}}। कृपया पधारें।',
    'meeting':
        'नमस्कार {{name}} जी, {{event}} बैठक {{date}} को आयोजित है। स्थान: {{village}}। कृपया समय पर पधारें।',
    'vote':
        'सादर प्रणाम {{name}} जी, लोकतंत्र के महापर्व में अपने अमूल्य मत का प्रयोग अवश्य करें। आपका एक वोट क्षेत्र के विकास के लिए महत्वपूर्ण है।\nवार्ड/भाग: {{ward}}',
  };

  static const typeLabels = {
    'general': 'सामान्य संदेश',
    'birthday': 'जन्मदिन बधाई',
    'anniversary': 'विवाह वर्षगाँठ',
    'event': 'कार्यक्रम / निमंत्रण',
    'meeting': 'बैठक सूचना',
    'vote': 'मतदान अपील',
  };

  Map<String, dynamic> get campaignBody {
    final body = <String, dynamic>{
      'title': title.text.trim(),
      'message': message.text.trim(),
      'sender': senderId,
      'eventType': eventType,
      'eventName': eventName.text.trim(),
      'occasionDate': DateFormat('yyyy-MM-dd').format(occasionDate),
      'eventDate': DateFormat('dd/MM/yyyy').format(occasionDate),
      'scheduledAt': scheduledAt.toUtc().toIso8601String(),
      'batchSize': batchSize,
      'intervalSeconds': intervalSeconds,
      'messageDelaySeconds': messageDelaySeconds,
      'dailyLimit': dailyLimit,
      'quietHoursStart': 20,
      'quietHoursEnd': 8,
      'templateName': templateName.text.trim(),
      'templateLanguage': 'hi',
    };
    if (recipientMode == 'custom') {
      final nums = customPhones.text
          .split(RegExp(r'[\n,;]'))
          .map((e) => e.replaceAll(RegExp(r'\D'), '').trim())
          .where((e) => e.length >= 10)
          .toList();
      body['customRecipients'] = nums;
    } else {
      for (final values in selectedFilters.values) {
        body.addAll(values);
      }
    }
    return body;
  }

  @override
  void dispose() {
    title.dispose();
    message.dispose();
    eventName.dispose();
    templateName.dispose();
    customPhones.dispose();
    super.dispose();
  }

  Future<void> pickImage() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );
      if (result != null && result.files.isNotEmpty) {
        final path = result.files.first.path;
        if (path != null) {
          setState(() {
            pickedImagePath = path;
            pickedImageName = result.files.first.name;
            attachPhoto = true;
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

  void removeImage() {
    setState(() {
      pickedImagePath = null;
      pickedImageName = null;
    });
  }

  Future<void> loadPreview() async {
    setState(() => preview = null);
    try {
      final result = await api.post('/api/messages/preview', campaignBody);
      if (mounted) {
        setState(() => preview = result);
        _fetchPreviewVotersList();
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', ''))));
    }
  }

  Future<void> _fetchPreviewVotersList() async {
    setState(() => loadingPreviewVoters = true);
    try {
      final queryParams = <String, String>{'limit': '100', 'paged': 'false'};
      for (final values in selectedFilters.values) {
        for (final entry in values.entries) {
          queryParams[entry.key] = entry.value;
        }
      }
      final dynamic res = await api.get('/api/members?${Uri(queryParameters: queryParams).query}');
      List<Map<String, dynamic>> items = [];
      if (res is List) {
        items = res.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      } else if (res is Map && res['items'] is List) {
        items = (res['items'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      }
      if (mounted) {
        setState(() {
          previewVoters = items;
          loadingPreviewVoters = false;
          selectedVoterIds.clear();
          for (final v in previewVoters) {
            final id = (v['_id'] ?? '').toString();
            if (id.isNotEmpty) selectedVoterIds.add(id);
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => loadingPreviewVoters = false);
    }
  }

  String renderVoterMessage(Map<String, dynamic>? voter) {
    String msg = message.text;
    final name = (voter?['name'] ?? voter?['fullName'] ?? '').toString().trim();
    final village = (voter?['village'] ?? voter?['gramPanchayat'] ?? '').toString().trim();
    final ward = (voter?['wardNumber'] ?? voter?['partNumber'] ?? '').toString().trim();
    final guardian = (voter?['guardianName'] ?? '').toString().trim();
    final evName = eventName.text.trim();
    final dt = DateFormat('dd/MM/yyyy').format(occasionDate);

    msg = msg.replaceAll('{{name}}', name.isNotEmpty ? name : 'साथी');
    msg = msg.replaceAll('{{village}}', village);
    msg = msg.replaceAll('{{ward}}', ward);
    msg = msg.replaceAll('{{guardian}}', guardian);
    msg = msg.replaceAll('{{event}}', evName.isNotEmpty ? evName : 'विशेष कार्यक्रम');
    msg = msg.replaceAll('{{date}}', dt);
    return msg;
  }

  Future<void> queueCampaign() async {
    if (senderId.isEmpty || message.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Sender और संदेश दोनों जरूरी हैं।')));
      return;
    }
    if (preview == null) await loadPreview();
    if (!mounted || _number(preview?['eligible']) == 0) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        icon: const Icon(Icons.schedule_send_rounded, color: green, size: 40),
        title: const Text('WhatsApp Auto Campaign शुरू करें?'),
        content: Text(
          '${preview?['eligible'] ?? 0} मतदाताओं को $batchSize संदेश के सुरक्षित बैच में, '
          'हर संदेश के बीच $messageDelaySeconds सेकंड का अंतर देकर भेजा जाएगा।\n\n'
          'रात 8 बजे से सुबह 8 बजे तक sending अपने-आप रुकेगी।',
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('रद्द करें')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              style: FilledButton.styleFrom(backgroundColor: green),
              child: const Text('Queue & Start')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => sending = true);
    try {
      final result = await api.post('/api/messages/broadcast', campaignBody);
      if (!mounted) return;
      setState(() {
        sending = false;
        refreshKey++;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('${result['total'] ?? 0} संदेश ऑटो-कतार (Queue) में जोड़े गए।'),
      ));
    } catch (error) {
      if (!mounted) return;
      setState(() => sending = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', ''))));
    }
  }

  void startFastSendAssistant() {
    List<Map<String, dynamic>> targets = [];
    if (recipientMode == 'custom') {
      final nums = customPhones.text
          .split(RegExp(r'[\n,;]'))
          .map((e) => e.replaceAll(RegExp(r'\D'), '').trim())
          .where((e) => e.length >= 10)
          .toList();
      targets = nums.map((n) => {'name': 'साथी', 'mobile': n}).toList();
    } else {
      targets = previewVoters.where((v) {
        final id = (v['_id'] ?? '').toString();
        final mob = (v['mobile'] ?? '').toString().trim();
        return selectedVoterIds.contains(id) && mob.isNotEmpty;
      }).toList();
    }

    if (targets.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया कम से कम 1 मोबाइल नंबर वाले प्राप्तकर्ता को चुनें।')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _FastSendSheet(
        voters: targets,
        imagePath: attachPhoto ? pickedImagePath : null,
        renderMessage: renderVoterMessage,
      ),
    );
  }

  Future<void> directShareToWhatsApp() async {
    final rendered = renderVoterMessage(null);
    if (attachPhoto && pickedImagePath != null && File(pickedImagePath!).existsSync()) {
      try {
        await SharePlus.instance.share(
          ShareParams(text: rendered, files: [XFile(pickedImagePath!)]),
        );
        return;
      } catch (_) {}
    }
    await SharePlus.instance.share(ShareParams(text: rendered));
  }

  Future<void> saveSender() async {
    final name = TextEditingController();
    final number = TextEditingController();
    final senderId = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('WhatsApp QR sender जोड़ें'),
        content: SizedBox(
          width: 520,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Sender Name (उदा. मुख्य नंबर)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: number,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'WhatsApp Mobile Number',
                hintText: '9876543210',
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Save करने के बाद QR बनेगा। फ़ोन में WhatsApp → Linked devices → Link a device खोलकर scan करें। Session सुरक्षित रहेगा।',
              style: TextStyle(color: muted, fontSize: 12, height: 1.4),
            ),
          ]),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('रद्द करें')),
          FilledButton.icon(
            onPressed: () async {
              final cleanName = name.text.trim();
              final cleanNumber = number.text.trim();
              if (cleanName.isEmpty || cleanNumber.isEmpty) {
                if (mounted) {
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    const SnackBar(content: Text('Sender name और Mobile number जरूरी हैं।')),
                  );
                }
                return;
              }
              try {
                final result = await api.post('/api/messages/senders', {
                  'name': cleanName,
                  'displayNumber': cleanNumber,
                  'provider': 'whatsapp_web',
                  'isDefault': true,
                });
                if (context.mounted) Navigator.pop(context, '${result['_id']}');
              } catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(error.toString().replaceFirst('Exception: ', '')),
                  ));
                }
              }
            },
            icon: const Icon(Icons.qr_code_2_rounded),
            label: const Text('Save एवं QR बनाएँ'),
          ),
        ],
      ),
    );
    name.dispose();
    number.dispose();
    if (senderId != null && mounted) {
      setState(() {
        this.senderId = senderId;
        refreshKey++;
      });
      await openQrConnect(senderId);
    }
  }

  Future<void> deleteSender(String id) async {
    if (id.isEmpty) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sender delete करें?'),
        content: const Text('इस WhatsApp sender number को हटा दिया जाएगा।'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: rose),
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await api.delete('/api/messages/senders/$id');
      if (!mounted) return;
      setState(() {
        if (senderId == id) senderId = '';
        refreshKey++;
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sender deleted')));
    } catch (_) {}
  }

  Future<void> openQrConnect(String id) async {
    if (id.isEmpty) return;
    try {
      await api.post('/api/messages/senders/$id/connect', {});
    } catch (_) {}
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _QrConnectDialog(senderId: id),
    );
    if (mounted) setState(() => refreshKey++);
  }

  Future<void> selectFilter(String field, String label) async {
    final option = await showDialog<_MessageFilterOption>(
      context: context,
      builder: (_) => _MessageFilterDialog(
        field: field,
        title: label,
        currentFilters: {
          for (final entry in selectedFilters.entries)
            if (entry.key != field) ...entry.value,
        },
      ),
    );
    if (option == null || !mounted) return;
    setState(() {
      selectedFilters[field] = option.filters;
      selectedLabels[field] = option.label;
      preview = null;
    });
    loadPreview();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<dynamic>>(
        key: ValueKey('senders-$refreshKey'),
        future: api.list('/api/messages/senders'),
        builder: (context, senderSnapshot) {
          final senders = List<Map<String, dynamic>>.from(
            (senderSnapshot.data ?? []).map((item) => Map<String, dynamic>.from(item)),
          );
          if (senderId.isEmpty && senders.isNotEmpty) {
            final preferred = senders.cast<Map<String, dynamic>>().firstWhere(
                (item) => item['isDefault'] == true,
                orElse: () => senders.first);
            senderId = '${preferred['_id']}';
          }
          Map<String, dynamic>? selectedSender;
          for (final sender in senders) {
            if ('${sender['_id']}' == senderId) selectedSender = sender;
          }

          return AppPage(children: [
            PremiumFeatureHero(
              title: 'WhatsApp महा-अभियान केंद्र',
              subtitle: 'QR कोड लिंक डिवाइस, पोस्टर/फोटो शेयर, लाइव वोटर फ़िल्टर एवं एंटी-बैन टाइमर के साथ।',
              icon: Icons.campaign_rounded,
              accent: green,
              badges: const ['QR Link', 'Poster + Tag', 'Anti-Ban Gap', 'Fast Send'],
              action: FilledButton.icon(
                  onPressed: saveSender,
                  icon: const Icon(Icons.add_call),
                  label: const Text('Sender जोड़ें')),
            ),

            // STEP 1: SENDER & QR CONNECT
            SectionCard(
              title: '1. WhatsApp Sender व Anti-Ban सेटिंग्स',
              action: senderId.isEmpty
                  ? null
                  : Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: selectedSender?['connectionStatus'] == 'connected' ? Colors.green.shade50 : Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            selectedSender?['connectionStatus'] == 'connected' ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
                            size: 14,
                            color: selectedSender?['connectionStatus'] == 'connected' ? green : orange,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            selectedSender?['connectionStatus'] == 'connected' ? 'Connected' : 'QR Scan जरूरी',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: selectedSender?['connectionStatus'] == 'connected' ? green : orange,
                            ),
                          ),
                        ],
                      ),
                    ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(spacing: 10, runSpacing: 10, children: [
                    SizedBox(
                      width: 260,
                      child: DropdownButtonFormField<String>(
                        key: ValueKey('sender-$senderId-${senders.length}'),
                        initialValue: senderId.isEmpty ? null : senderId,
                        decoration: const InputDecoration(labelText: 'WhatsApp Sender नंबर'),
                        items: senders
                            .map((sender) => DropdownMenuItem(
                                  value: '${sender['_id']}',
                                  child: Text('${sender['name']} · ${sender['displayNumber']}'),
                                ))
                            .toList(),
                        onChanged: (value) => setState(() => senderId = value ?? ''),
                      ),
                    ),
                    if (senderId.isNotEmpty)
                      FilledButton.tonalIcon(
                        onPressed: () => openQrConnect(senderId),
                        icon: Icon(
                          selectedSender?['connectionStatus'] == 'connected' ? Icons.qr_code_rounded : Icons.qr_code_2_rounded,
                          color: green,
                        ),
                        label: Text(selectedSender?['connectionStatus'] == 'connected' ? 'QR Reconnect' : 'QR Scan करें'),
                      ),
                    if (senderId.isNotEmpty)
                      IconButton(
                        tooltip: 'Sender हटाएं',
                        icon: const Icon(Icons.delete_outline_rounded, color: rose),
                        onPressed: () => deleteSender(senderId),
                      ),
                  ]),
                  const Divider(height: 24),
                  Row(
                    children: [
                      const Icon(Icons.timer_outlined, size: 18, color: blue),
                      const SizedBox(width: 6),
                      Text('मैसेज टाइमर गैप (Anti-Ban): $messageDelaySeconds सेकंड', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  Slider(
                    value: messageDelaySeconds.toDouble(),
                    min: 3,
                    max: 20,
                    divisions: 17,
                    activeColor: green,
                    label: '$messageDelaySeconds सेकंड',
                    onChanged: (v) => setState(() => messageDelaySeconds = v.round()),
                  ),
                  const Text('व्हाट्सएप ब्लॉक/बैन से बचने के लिए हर मैसेज के बीच 5-10 सेकंड का गैप रखें।', style: TextStyle(fontSize: 11, color: muted)),
                ],
              ),
            ),

            // STEP 2: RECIPIENTS & FILTERS
            SectionCard(
              title: '2. Recipients (मतदाता / संपर्क) चुनें',
              action: preview == null
                  ? null
                  : Chip(
                      avatar: const Icon(Icons.groups_rounded, color: green, size: 18),
                      label: Text('${preview?['eligible'] ?? 0} मतदाता'),
                    ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'db', label: Text('डेटाबेस वोटर फ़िल्टर'), icon: Icon(Icons.how_to_vote_rounded)),
                      ButtonSegment(value: 'custom', label: Text('कस्टम नंबर दर्ज करें'), icon: Icon(Icons.edit_note_rounded)),
                      ButtonSegment(value: 'direct', label: Text('ग्रुप/स्टेटस शेयर'), icon: Icon(Icons.share_rounded)),
                    ],
                    selected: {recipientMode},
                    onSelectionChanged: (val) => setState(() {
                      recipientMode = val.first;
                      preview = null;
                    }),
                  ),
                  const SizedBox(height: 14),

                  if (recipientMode == 'db') ...[
                    Wrap(spacing: 9, runSpacing: 9, children: [
                      _FilterPicker('जाति फ़िल्टर', Icons.groups_2_rounded, selectedLabels['caste'],
                          () => selectFilter('caste', 'जाति'), () => setState(() {
                                selectedFilters.remove('caste');
                                selectedLabels.remove('caste');
                                preview = null;
                              })),
                      _FilterPicker('गाँव / पंचायत', Icons.location_city_rounded, selectedLabels['village'],
                          () => selectFilter('village', 'गाँव / पंचायत'), () => setState(() {
                                selectedFilters.remove('village');
                                selectedLabels.remove('village');
                                preview = null;
                              })),
                      _FilterPicker('भाग / बूथ', Icons.how_to_vote_rounded, selectedLabels['booth'],
                          () => selectFilter('booth', 'भाग / बूथ'), () => setState(() {
                                selectedFilters.remove('booth');
                                selectedLabels.remove('booth');
                                preview = null;
                              })),
                      _FilterPicker('विधानसभा', Icons.account_balance_rounded, selectedLabels['assembly'],
                          () => selectFilter('assembly', 'विधानसभा'), () => setState(() {
                                selectedFilters.remove('assembly');
                                selectedLabels.remove('assembly');
                                preview = null;
                              })),
                    ]),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        FilledButton.tonalIcon(
                          onPressed: loadPreview,
                          icon: const Icon(Icons.search_rounded, size: 18),
                          label: const Text('मतदाता प्रीव्यू लोड करें'),
                        ),
                        if (selectedLabels.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: () => setState(() {
                              selectedFilters.clear();
                              selectedLabels.clear();
                              preview = null;
                              previewVoters.clear();
                            }),
                            child: const Text('सभी फ़िल्टर साफ़ करें'),
                          ),
                        ],
                      ],
                    ),
                    if (previewVoters.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Text('लोड हुए मतदाता: ${previewVoters.length}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const Spacer(),
                          TextButton(
                            onPressed: () {
                              setState(() {
                                if (selectedVoterIds.length == previewVoters.length) {
                                  selectedVoterIds.clear();
                                } else {
                                  selectedVoterIds.clear();
                                  for (final v in previewVoters) {
                                    final id = (v['_id'] ?? '').toString();
                                    if (id.isNotEmpty) selectedVoterIds.add(id);
                                  }
                                }
                              });
                            },
                            child: Text(selectedVoterIds.length == previewVoters.length ? 'सब हटाएं' : 'सभी चुनें (${selectedVoterIds.length})'),
                          ),
                        ],
                      ),
                      Container(
                        height: 180,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ListView.builder(
                          itemCount: previewVoters.length,
                          itemBuilder: (ctx, i) {
                            final v = previewVoters[i];
                            final id = (v['_id'] ?? '').toString();
                            final name = (v['name'] ?? '').toString();
                            final mob = (v['mobile'] ?? '').toString();
                            final vil = (v['village'] ?? '').toString();
                            final isSel = selectedVoterIds.contains(id);

                            return CheckboxListTile(
                              dense: true,
                              value: isSel,
                              title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              subtitle: Text('$vil · ${mob.isNotEmpty ? mob : "मोबाइल नहीं"}', style: const TextStyle(fontSize: 11, color: muted)),
                              onChanged: (val) {
                                setState(() {
                                  if (val == true) {
                                    selectedVoterIds.add(id);
                                  } else {
                                    selectedVoterIds.remove(id);
                                  }
                                });
                              },
                            );
                          },
                        ),
                      ),
                    ],
                  ] else if (recipientMode == 'custom') ...[
                    TextField(
                      controller: customPhones,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'मोबाइल नंबर दर्ज करें (एक से अधिक नंबर कॉमा या नई लाइन में लिखें)',
                        hintText: '9876543210, 9876543211\n9876543212',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ] else ...[
                    const Text(
                      'ग्रुप / स्टेटस शेयर मोड: आपका संदेश और पोस्टर आपके फ़ोन के WhatsApp में शेयर किया जाएगा, जिससे आप किसी भी ग्रुप या स्टेटस पर पोस्ट कर सकते हैं।',
                      style: TextStyle(fontSize: 13, color: muted),
                    ),
                  ],
                ],
              ),
            ),

            // STEP 3: MESSAGE & POSTER / PHOTO
            SectionCard(
              title: '3. संदेश व फोटो / पोस्टर कंपोज़र',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (pickedImagePath == null)
                        FilledButton.tonalIcon(
                          onPressed: pickImage,
                          icon: const Icon(Icons.add_photo_alternate_rounded, size: 18),
                          label: const Text('फोटो / पोस्टर जोड़ें'),
                        )
                      else ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(File(pickedImagePath!), width: 44, height: 44, fit: BoxFit.cover),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(pickedImageName ?? 'poster.jpg', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                              Row(
                                children: [
                                  Checkbox(
                                    value: attachPhoto,
                                    visualDensity: VisualDensity.compact,
                                    onChanged: (v) => setState(() => attachPhoto = v ?? true),
                                  ),
                                  const Text('फोटो के साथ भेजें', style: TextStyle(fontSize: 11)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                          onPressed: removeImage,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    SizedBox(
                      width: 220,
                      child: DropdownButtonFormField<String>(
                        initialValue: eventType,
                        decoration: const InputDecoration(labelText: 'टेम्पलेट प्रकार'),
                        items: typeLabels.entries
                            .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              eventType = val;
                              message.text = defaultDrafts[val] ?? '';
                              title.text = typeLabels[val] ?? 'WhatsApp Campaign';
                            });
                          }
                        },
                      ),
                    ),
                    if (eventType == 'event' || eventType == 'meeting')
                      SizedBox(
                        width: 220,
                        child: TextField(
                          controller: eventName,
                          decoration: const InputDecoration(labelText: 'कार्यक्रम / बैठक का नाम'),
                        ),
                      ),
                  ]),
                  const SizedBox(height: 10),
                  TextField(
                    controller: message,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'संदेश ड्राफ्ट (Message Draft)',
                      hintText: 'यहाँ अपना संदेश लिखें...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 6),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        const Text('टैग जोड़ें: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: muted)),
                        _tagChip('+ नाम', '{{name}}'),
                        _tagChip('+ गाँव', '{{village}}'),
                        _tagChip('+ वार्ड/भाग', '{{ward}}'),
                        _tagChip('+ पिता/पति', '{{guardian}}'),
                        _tagChip('+ कार्यक्रम', '{{event}}'),
                        _tagChip('+ दिनांक', '{{date}}'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('संदेश प्रीव्यू (Preview):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: muted)),
                        const SizedBox(height: 4),
                        Text(renderVoterMessage(null), style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // STEP 4: DISPATCH ACTIONS
            SectionCard(
              title: '4. WhatsApp पर भेजें (Dispatch Options)',
              child: Column(
                children: [
                  if (recipientMode == 'direct')
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: directShareToWhatsApp,
                        icon: const Icon(Icons.share_rounded),
                        label: const Text('WhatsApp ग्रुप / स्टेटस पर शेयर करें', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        style: FilledButton.styleFrom(
                          backgroundColor: green,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    )
                  else ...[
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: queueCampaign,
                            icon: const Icon(Icons.rocket_launch_rounded),
                            label: const Text('🤖 ऑटो ब्रॉडकास्ट (Server)'),
                            style: FilledButton.styleFrom(
                              backgroundColor: green,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: FilledButton.tonalIcon(
                            onPressed: startFastSendAssistant,
                            icon: const Icon(Icons.bolt_rounded),
                            label: const Text('⚡ फ़ास्ट असिस्टेंट (1-by-1)'),
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text('• ऑटो ब्रॉडकास्ट: बैकएंड सर्वर आपके जुड़े WhatsApp से हर 5 सेकंड में स्वतः भेजता रहेगा।\n• फ़ास्ट असिस्टेंट: फ़ोन के WhatsApp ऐप को 1-by-1 खोलकर तुरंत भेजने का तरीका।', style: TextStyle(fontSize: 11, color: muted)),
                  ],
                ],
              ),
            ),
          ]);
        },
      );

  Widget _tagChip(String label, String tag) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 11, color: blue, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.blue.shade50,
        padding: EdgeInsets.zero,
        onPressed: () {
          final text = message.text;
          final sel = message.selection;
          if (sel.isValid && sel.start >= 0) {
            final newText = text.replaceRange(sel.start, sel.end, tag);
            message.value = TextEditingValue(
              text: newText,
              selection: TextSelection.collapsed(offset: sel.start + tag.length),
            );
          } else {
            message.text += ' $tag';
          }
        },
      ),
    );
  }
}

class _FastSendSheet extends StatefulWidget {
  const _FastSendSheet({
    required this.voters,
    required this.imagePath,
    required this.renderMessage,
  });

  final List<Map<String, dynamic>> voters;
  final String? imagePath;
  final String Function(Map<String, dynamic> voter) renderMessage;

  @override
  State<_FastSendSheet> createState() => _FastSendSheetState();
}

class _FastSendSheetState extends State<_FastSendSheet> {
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
          ShareParams(text: msg, files: [XFile(widget.imagePath!)]),
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
          const SnackBar(content: Text('🎉 सभी चुने हुए संपर्कों को संदेश भेजा जा चुका है!')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final voter = widget.voters[_currentIndex];
    final name = (voter['name'] ?? voter['fullName'] ?? '').toString().trim();
    final mobile = (voter['mobile'] ?? '').toString().trim();
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
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
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
            Text('प्रगति: ${_currentIndex + 1} / ${widget.voters.length} (भेजे गए: ${_sentIndices.length})',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: muted)),
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
                        child: Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                        child: Text(mobile, style: const TextStyle(fontWeight: FontWeight.bold, color: green)),
                      ),
                    ],
                  ),
                  const Divider(height: 18),
                  Text(msg, style: const TextStyle(fontSize: 13), maxLines: 3, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (_currentIndex > 0)
                  OutlinedButton(onPressed: () => setState(() => _currentIndex--), child: const Text('पिछला')),
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
                  TextButton(onPressed: () => setState(() => _currentIndex++), child: const Text('छोड़ें')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterPicker extends StatelessWidget {
  const _FilterPicker(
      this.title, this.icon, this.value, this.onTap, this.onClear);
  final String title;
  final IconData icon;
  final String? value;
  final VoidCallback onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final selected = value != null && value!.isNotEmpty;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? softBlue : Colors.white,
          border: Border.all(color: selected ? blue : border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 16, color: selected ? blue : muted),
          const SizedBox(width: 6),
          Text(selected ? value! : title,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: selected ? blue : navy)),
          if (selected) ...[
            const SizedBox(width: 4),
            GestureDetector(
                onTap: onClear,
                child: const Icon(Icons.close_rounded, size: 14, color: blue)),
          ],
        ]),
      ),
    );
  }
}

class _QrConnectDialog extends StatefulWidget {
  const _QrConnectDialog({required this.senderId});
  final String senderId;

  @override
  State<_QrConnectDialog> createState() => _QrConnectDialogState();
}

class _QrConnectDialogState extends State<_QrConnectDialog> {
  Timer? pollTimer;
  Map<String, dynamic>? qrData;
  Map<String, dynamic>? statusData;

  @override
  void initState() {
    super.initState();
    loadQr();
    pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => checkStatus());
  }

  @override
  void dispose() {
    pollTimer?.cancel();
    super.dispose();
  }

  Future<void> loadQr() async {
    try {
      final res = await api.get('/api/messages/senders/${widget.senderId}/qr');
      if (mounted) setState(() => qrData = res);
    } catch (_) {}
  }

  Future<void> checkStatus() async {
    try {
      final res = await api.get('/api/messages/senders/${widget.senderId}/status');
      if (!mounted) return;
      setState(() => statusData = res);
      if (res['connectionStatus'] == 'connected') {
        pollTimer?.cancel();
        Navigator.pop(context);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final qrString = qrData?['qr'] ?? '';
    return AlertDialog(
      title: const Text('WhatsApp QR Scan करें'),
      content: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (qrString.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Image.memory(
                  base64Decode(qrString.split(',').last),
                  width: 220,
                  height: 220,
                  fit: BoxFit.contain,
                ),
              )
            else
              const Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ),
            const SizedBox(height: 12),
            const Text(
              'फ़ोन में WhatsApp खोलें → Settings / 3-dots → Linked Devices → Link a Device पर जाकर यह QR कोड स्कैन करें।',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: muted),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('बंद करें')),
      ],
    );
  }
}

class _MessageFilterOption {
  const _MessageFilterOption({required this.label, required this.filters});
  final String label;
  final Map<String, String> filters;
}

class _MessageFilterDialog extends StatefulWidget {
  const _MessageFilterDialog({
    required this.field,
    required this.title,
    required this.currentFilters,
  });
  final String field;
  final String title;
  final Map<String, String> currentFilters;

  @override
  State<_MessageFilterDialog> createState() => _MessageFilterDialogState();
}

class _MessageFilterDialogState extends State<_MessageFilterDialog> {
  final search = TextEditingController();
  List<Map<String, dynamic>> options = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadOptions();
  }

  Future<void> loadOptions() async {
    try {
      final res = await api.get('/api/members/field-values?field=${widget.field}&limit=200');
      if (res is Map && res['items'] is List) {
        options = (res['items'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final q = search.text.toLowerCase();
    final filtered = options.where((o) => '${o['label'] ?? o['value']}'.toLowerCase().contains(q)).toList();

    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 360,
        height: 420,
        child: Column(
          children: [
            TextField(
              controller: search,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: 'सर्च करें...',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (ctx, i) {
                        final item = filtered[i];
                        final val = '${item['value']}';
                        final lab = '${item['label'] ?? item['value']}';
                        final cnt = item['count'] ?? 0;

                        return ListTile(
                          dense: true,
                          title: Text(lab),
                          trailing: Text('$cnt', style: const TextStyle(fontWeight: FontWeight.bold, color: blue)),
                          onTap: () {
                            Navigator.pop(
                              context,
                              _MessageFilterOption(
                                label: lab,
                                filters: {widget.field: val},
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
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
      ],
    );
  }
}

int _number(dynamic val) {
  if (val is num) return val.toInt();
  return int.tryParse('$val') ?? 0;
}
