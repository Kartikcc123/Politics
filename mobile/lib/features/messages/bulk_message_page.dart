import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
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
  final selectedFilters = <String, Map<String, String>>{};
  final selectedLabels = <String, String>{};

  String eventType = 'general';
  String senderId = '';
  DateTime occasionDate = DateTime.now();
  DateTime scheduledAt = DateTime.now();
  int batchSize = 10;
  int intervalSeconds = 60;
  int messageDelaySeconds = 3;
  int dailyLimit = 200;
  int refreshKey = 0;
  bool sending = false;
  Map<String, dynamic>? preview;

  @override
  void initState() {
    super.initState();
    eventType = widget.initialEventType;
    message.text = defaultDrafts[eventType] ?? defaultDrafts['general']!;
  }

  static const defaultDrafts = {
    'general': 'नमस्कार {{name}} जी,',
    'birthday':
        '🎂 जन्मदिन की हार्दिक शुभकामनाएँ {{name}} जी! आपका जीवन सुख, स्वास्थ्य और सफलता से भरा रहे।',
    'anniversary':
        '💐 विवाह वर्षगाँठ की हार्दिक शुभकामनाएँ {{name}} जी! आपका दाम्पत्य जीवन सदैव सुखमय रहे।',
    'event':
        'नमस्कार {{name}} जी, आपको {{event}} में सादर आमंत्रित किया जाता है। दिनांक: {{date}}।',
    'meeting':
        'नमस्कार {{name}} जी, {{event}} बैठक {{date}} को आयोजित है। कृपया समय पर पधारें।',
  };
  static const typeLabels = {
    'general': 'सामान्य संदेश',
    'birthday': 'जन्मदिन',
    'anniversary': 'विवाह वर्षगाँठ',
    'event': 'कार्यक्रम',
    'meeting': 'बैठक',
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
    for (final values in selectedFilters.values) {
      body.addAll(values);
    }
    return body;
  }

  @override
  void dispose() {
    title.dispose();
    message.dispose();
    eventName.dispose();
    templateName.dispose();
    super.dispose();
  }

  Future<void> loadPreview() async {
    setState(() => preview = null);
    try {
      final result = await api.post('/api/messages/preview', campaignBody);
      if (mounted) setState(() => preview = result);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', ''))));
    }
  }

  Future<void> queueCampaign() async {
    if (senderId.isEmpty || message.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Sender और message draft दोनों जरूरी हैं।')));
      return;
    }
    if (preview == null) await loadPreview();
    if (!mounted || _number(preview?['eligible']) == 0) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        icon: const Icon(Icons.schedule_send_rounded, color: green, size: 40),
        title: const Text('Campaign queue करें?'),
        content: Text(
          '${preview?['eligible'] ?? 0} opt-in recipients को $batchSize messages के batch में, '
          'हर $intervalSeconds seconds के अंतर से भेजा जाएगा।\n\n'
          'रात 8 बजे से सुबह 8 बजे तक sending अपने-आप रुकेगी।',
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('रद्द करें')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Queue करें')),
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
        content: Text('${result['total'] ?? 0} messages safely queued'),
      ));
    } catch (error) {
      if (!mounted) return;
      setState(() => sending = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', ''))));
    }
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
              decoration: const InputDecoration(labelText: 'Sender name'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: number,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'WhatsApp number',
                hintText: '9876543210',
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Save करने के बाद QR बनेगा। Phone में WhatsApp → Linked devices → Link a device खोलकर scan करें। Session backend में सुरक्षित रहेगा।',
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
                    const SnackBar(
                      content: Text('Sender name aur WhatsApp number required hain.'),
                    ),
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
                    content:
                        Text(error.toString().replaceFirst('Exception: ', '')),
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
        title: const Text('Sender delete karein?'),
        content: const Text(
            'Is WhatsApp sender number ko list se hata diya jayega. Connected session bhi logout/disconnect hoga.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('WhatsApp sender deleted')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', '')),
      ));
    }
  }

  Future<void> openQrConnect(String id) async {
    if (id.isEmpty) return;
    try {
      await api.post('/api/messages/senders/$id/connect', {});
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ));
      }
    }
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
  }

  Future<void> selectDate({required bool schedule}) async {
    final base = schedule ? scheduledAt : occasionDate;
    final date = await showDatePicker(
      context: context,
      initialDate: base,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (date == null || !mounted) return;
    if (!schedule) {
      setState(() {
        occasionDate = date;
        preview = null;
      });
      return;
    }
    final time = await showTimePicker(
        context: context, initialTime: TimeOfDay.fromDateTime(base));
    if (time == null || !mounted) return;
    setState(() => scheduledAt =
        DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<dynamic>>(
        key: ValueKey('senders-$refreshKey'),
        future: api.list('/api/messages/senders'),
        builder: (context, senderSnapshot) {
          final senders = List<Map<String, dynamic>>.from(
            (senderSnapshot.data ?? [])
                .map((item) => Map<String, dynamic>.from(item)),
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
              title: 'WhatsApp अभियान',
              subtitle:
                  'सहमति वाले contacts को सुरक्षित batches में personal message भेजें।',
              icon: Icons.campaign_rounded,
              accent: green,
              badges: const ['Opt-in', 'Batch control', 'History'],
              action: FilledButton.icon(
                  onPressed: saveSender,
                  icon: const Icon(Icons.add_call),
                  label: const Text('Sender जोड़ें')),
            ),
            _SafetyBanner(),
            SectionCard(
              title: '1. Sender और occasion',
              child: Wrap(spacing: 10, runSpacing: 10, children: [
                SizedBox(
                  width: 260,
                  child: DropdownButtonFormField<String>(
                    key: ValueKey('sender-$senderId-${senders.length}'),
                    initialValue: senderId.isEmpty ? null : senderId,
                    decoration: const InputDecoration(
                        labelText: 'WhatsApp sender number'),
                    items: senders
                        .map((sender) => DropdownMenuItem(
                              value: '${sender['_id']}',
                              child: Text(
                                  '${sender['name']} · ${sender['displayNumber']}'),
                            ))
                        .toList(),
                    onChanged: (value) =>
                        setState(() => senderId = value ?? ''),
                  ),
                ),
                if (senderId.isNotEmpty)
                  OutlinedButton.icon(
                    onPressed: () => openQrConnect(senderId),
                    icon: Icon(
                      selectedSender?['connectionStatus'] == 'connected'
                          ? Icons.link_rounded
                          : Icons.qr_code_2_rounded,
                      color: selectedSender?['connectionStatus'] == 'connected'
                          ? green
                          : blue,
                    ),
                    label: Text(
                      selectedSender?['connectionStatus'] == 'connected'
                          ? 'Connected'
                          : 'QR Connect',
                    ),
                  ),
                if (senderId.isNotEmpty)
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(foregroundColor: rose),
                    onPressed: () => deleteSender(senderId),
                    icon: const Icon(Icons.delete_outline_rounded),
                    label: const Text('Delete sender'),
                  ),
                SizedBox(
                  width: 210,
                  child: DropdownButtonFormField<String>(
                    initialValue: eventType,
                    decoration:
                        const InputDecoration(labelText: 'Campaign type'),
                    items: typeLabels.entries
                        .map((entry) => DropdownMenuItem(
                              value: entry.key,
                              child: Text(entry.value),
                            ))
                        .toList(),
                    onChanged: (value) => setState(() {
                      eventType = value ?? 'general';
                      message.text = defaultDrafts[eventType] ?? '';
                      title.text = typeLabels[eventType] ?? 'WhatsApp Campaign';
                      preview = null;
                    }),
                  ),
                ),
                if (eventType == 'event' || eventType == 'meeting')
                  SizedBox(
                      width: 230,
                      child: TextField(
                        controller: eventName,
                        decoration: const InputDecoration(
                            labelText: 'कार्यक्रम / बैठक नाम'),
                      )),
                if (eventType == 'birthday' ||
                    eventType == 'anniversary' ||
                    eventType == 'event' ||
                    eventType == 'meeting')
                  _DateButton(
                    label: eventType == 'birthday' || eventType == 'anniversary'
                        ? 'Occasion date'
                        : 'कार्यक्रम दिनांक',
                    value: DateFormat('dd MMM yyyy').format(occasionDate),
                    onTap: () => selectDate(schedule: false),
                  ),
              ]),
            ),
            SectionCard(
              title: '2. Recipients चुनें',
              action: preview == null
                  ? null
                  : Chip(
                      avatar: const Icon(Icons.groups_rounded,
                          color: green, size: 18),
                      label: Text('${preview?['eligible'] ?? 0} eligible'),
                    ),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(spacing: 9, runSpacing: 9, children: [
                      _FilterPicker(
                          'विधानसभा',
                          Icons.account_balance_rounded,
                          selectedLabels['assembly'],
                          () => selectFilter('assembly', 'विधानसभा'),
                          () => setState(() {
                                selectedFilters.remove('assembly');
                                selectedLabels.remove('assembly');
                                preview = null;
                              })),
                      _FilterPicker(
                          'गाँव',
                          Icons.location_city_rounded,
                          selectedLabels['village'],
                          () => selectFilter('village', 'गाँव'),
                          () => setState(() {
                                selectedFilters.remove('village');
                                selectedLabels.remove('village');
                                preview = null;
                              })),
                      _FilterPicker(
                          'ग्राम पंचायत',
                          Icons.holiday_village_rounded,
                          selectedLabels['gramPanchayat'],
                          () => selectFilter('gramPanchayat', 'ग्राम पंचायत'),
                          () => setState(() {
                                selectedFilters.remove('gramPanchayat');
                                selectedLabels.remove('gramPanchayat');
                                preview = null;
                              })),
                      _FilterPicker(
                          'तहसील',
                          Icons.apartment_rounded,
                          selectedLabels['tehsil'],
                          () => selectFilter('tehsil', 'तहसील'),
                          () => setState(() {
                                selectedFilters.remove('tehsil');
                                selectedLabels.remove('tehsil');
                                preview = null;
                              })),
                    ]),
                    const SizedBox(height: 12),
                    FilledButton.tonalIcon(
                        onPressed: loadPreview,
                        icon: const Icon(Icons.preview_rounded),
                        label: const Text('Recipients preview करें')),
                    if (preview != null) ...[
                      const SizedBox(height: 12),
                      Wrap(spacing: 10, runSpacing: 10, children: [
                        _CountBox(
                            'Matched', _number(preview?['matched']), blue),
                        _CountBox('Opt-in eligible',
                            _number(preview?['eligible']), green),
                        _CountBox('Mobile missing',
                            _number(preview?['missingMobile']), orange),
                        _CountBox(
                            'Opt-out', _number(preview?['optedOut']), rose),
                      ]),
                    ],
                  ]),
            ),
            FutureBuilder<List<dynamic>>(
              future: api.list('/api/messages/templates'),
              builder: (context, templateSnapshot) {
                final templates = List<Map<String, dynamic>>.from(
                  (templateSnapshot.data ?? [])
                      .map((item) => Map<String, dynamic>.from(item)),
                );
                return SectionCard(
                  title: '3. Message draft',
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: templates
                                .where((item) =>
                                    eventType == 'general' ||
                                    item['category'] == eventType)
                                .map((item) => ActionChip(
                                      avatar: const Icon(
                                          Icons.auto_awesome_rounded,
                                          size: 18),
                                      label: Text('${item['title']}'),
                                      onPressed: () => setState(() => message
                                          .text = '${item['body'] ?? ''}'),
                                    ))
                                .toList()),
                        const SizedBox(height: 12),
                        TextField(
                          controller: message,
                          minLines: 5,
                          maxLines: 9,
                          decoration: const InputDecoration(
                            labelText: 'Message draft',
                            hintText: 'नमस्कार {{name}} जी...',
                            helperText:
                                'Variables: {{name}}, {{surname}}, {{village}}, {{event}}, {{date}}',
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: templateName,
                          decoration: const InputDecoration(
                            labelText:
                                'Approved Meta template name (recommended)',
                            helperText:
                                '24-hour window के बाहर approved template आवश्यक हो सकता है।',
                          ),
                        ),
                      ]),
                );
              },
            ),
            SectionCard(
              title: '4. Safe sending schedule',
              child: Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _NumberDropdown(
                        'Batch size',
                        batchSize,
                        const [5, 10, 15, 20],
                        (value) => setState(() => batchSize = value)),
                    _NumberDropdown(
                        'Batch interval',
                        intervalSeconds,
                        const [30, 60, 120, 300],
                        (value) => setState(() => intervalSeconds = value),
                        suffix: ' sec'),
                    _NumberDropdown(
                        'हर message के बीच',
                        messageDelaySeconds,
                        const [2, 3, 5, 10],
                        (value) => setState(() => messageDelaySeconds = value),
                        suffix: ' sec'),
                    _NumberDropdown(
                        'Daily limit',
                        dailyLimit,
                        const [50, 100, 200, 500],
                        (value) => setState(() => dailyLimit = value)),
                    _DateButton(
                        label: 'Start time',
                        value:
                            DateFormat('dd MMM, hh:mm a').format(scheduledAt),
                        onTap: () => selectDate(schedule: true)),
                  ]),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: const Color(0xffeaf8f0),
                  border: Border.all(color: const Color(0xffbde8cd)),
                  borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(Icons.verified_user_rounded, color: green, size: 30),
                const SizedBox(width: 12),
                Expanded(
                    child: Text(
                  '${preview?['eligible'] ?? 0} recipients · $batchSize per batch · message gap $messageDelaySeconds sec · batch gap $intervalSeconds sec',
                  style:
                      const TextStyle(color: navy, fontWeight: FontWeight.w900),
                )),
                FilledButton.icon(
                    onPressed: sending ? null : queueCampaign,
                    icon: sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.schedule_send_rounded),
                    label: const Text('Campaign queue करें')),
              ]),
            ),
            _CampaignHistory(
                refreshKey: refreshKey,
                onChanged: () => setState(() => refreshKey++)),
          ]);
        },
      );
}

class _QrConnectDialog extends StatefulWidget {
  const _QrConnectDialog({required this.senderId});
  final String senderId;

  @override
  State<_QrConnectDialog> createState() => _QrConnectDialogState();
}

class _QrConnectDialogState extends State<_QrConnectDialog> {
  Timer? timer;
  Map<String, dynamic> status = const {};
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
    timer = Timer.periodic(const Duration(seconds: 2), (_) => load());
  }

  Future<void> load() async {
    try {
      final result =
          await api.get('/api/messages/senders/${widget.senderId}/status');
      if (!mounted) return;
      setState(() {
        status = result;
        loading = false;
      });
      if (result['connectionStatus'] == 'connected') timer?.cancel();
    } catch (_) {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = '${status['connectionStatus'] ?? 'starting'}';
    final connected = state == 'connected';
    final qr = '${status['qrCode'] ?? ''}';
    return AlertDialog(
      title: Row(children: [
        Icon(connected ? Icons.check_circle_rounded : Icons.qr_code_2_rounded,
            color: connected ? green : blue),
        const SizedBox(width: 9),
        Expanded(
            child: Text(connected ? 'WhatsApp Connected' : 'QR Scan करें')),
      ]),
      content: SizedBox(
        width: 430,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (loading || state == 'starting' || state == 'authenticated') ...[
            const Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator()),
            Text(state == 'authenticated'
                ? 'Login हो गया, WhatsApp तैयार हो रहा है…'
                : 'QR तैयार हो रहा है…'),
          ] else if (qr.startsWith('data:image')) ...[
            Container(
              width: 320,
              height: 320,
              padding: const EdgeInsets.all(10),
              color: Colors.white,
              child: Image.memory(base64Decode(qr.split(',').last)),
            ),
            const SizedBox(height: 12),
            const Text(
              'Phone में WhatsApp → Linked devices → Link a device खोलें और QR scan करें।',
              textAlign: TextAlign.center,
              style: TextStyle(color: muted, height: 1.4),
            ),
          ] else if (connected) ...[
            const Icon(Icons.mark_chat_read_rounded, color: green, size: 72),
            const SizedBox(height: 12),
            Text(
                '${status['connectedNumber'] ?? status['displayNumber'] ?? ''}',
                style: const TextStyle(
                    color: navy, fontSize: 18, fontWeight: FontWeight.w900)),
            const Text('यह number campaign sending के लिए तैयार है।',
                style: TextStyle(color: muted)),
          ] else ...[
            const Icon(Icons.error_outline_rounded, color: rose, size: 58),
            const SizedBox(height: 10),
            Text('${status['lastError'] ?? 'QR session शुरू नहीं हो सकी।'}',
                textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.tonalIcon(
              onPressed: () async {
                setState(() => loading = true);
                try {
                  await api.post(
                      '/api/messages/senders/${widget.senderId}/connect', {});
                } catch (error) {
                  if (mounted) {
                    setState(() {
                      status = {
                        ...status,
                        'lastError':
                            error.toString().replaceFirst('Exception: ', ''),
                        'connectionStatus': 'failed'
                      };
                    });
                  }
                }
                await load();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('फिर कोशिश करें'),
            ),
          ],
        ]),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(connected ? 'पूरा हुआ' : 'बंद करें'),
        ),
      ],
    );
  }
}

class _SafetyBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: const Color(0xfffff8e8),
            border: Border.all(color: const Color(0xffffdf91)),
            borderRadius: BorderRadius.circular(12)),
        child:
            const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.shield_outlined, color: orange),
          SizedBox(width: 10),
          Expanded(
              child: Text(
            'केवल WhatsApp opt-in contacts चुने जाते हैं। Queue controlled batches, daily limit और रात 8 से सुबह 8 quiet hours लागू करती है। इससे risk कम होता है, लेकिन WhatsApp block की guarantee नहीं दी जा सकती—official Business API और approved templates उपयोग करें।',
            style: TextStyle(color: navy, height: 1.4),
          )),
        ]),
      );
}

class _CampaignHistory extends StatelessWidget {
  const _CampaignHistory({required this.refreshKey, required this.onChanged});
  final int refreshKey;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) => FutureBlock<List<dynamic>>(
        key: ValueKey('history-$refreshKey'),
        load: () => api.list('/api/messages/history'),
        builder: (items) => SectionCard(
          title: 'Campaign history',
          child: items.isEmpty
              ? const Text('अभी कोई campaign नहीं है।')
              : Column(
                  children: items.take(20).map((raw) {
                  final item = Map<String, dynamic>.from(raw);
                  final status = '${item['status'] ?? 'scheduled'}';
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor:
                          _statusColor(status).withValues(alpha: .1),
                      child: Icon(Icons.campaign_rounded,
                          color: _statusColor(status)),
                    ),
                    title: Text('${item['title'] ?? 'WhatsApp Campaign'}',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text(
                        '${item['sender']?['displayNumber'] ?? '-'} · ${item['sentCount'] ?? 0}/${item['totalEligible'] ?? 0} sent · ${item['failedCount'] ?? 0} failed'),
                    trailing: Wrap(
                        spacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Chip(label: Text(status)),
                          if (status == 'scheduled' || status == 'running')
                            IconButton(
                                tooltip: 'Pause',
                                onPressed: () => _control(
                                    context, '${item['_id']}', 'pause'),
                                icon: const Icon(Icons.pause_circle_outline)),
                          if (status == 'paused')
                            IconButton(
                                tooltip: 'Resume',
                                onPressed: () => _control(
                                    context, '${item['_id']}', 'resume'),
                                icon: const Icon(Icons.play_circle_outline,
                                    color: green)),
                        ]),
                  );
                }).toList()),
        ),
      );

  Future<void> _control(BuildContext context, String id, String action) async {
    await api.post('/api/messages/campaigns/$id/control', {'action': action});
    onChanged();
  }

  Color _statusColor(String status) => switch (status) {
        'completed' => green,
        'failed' => rose,
        'paused' => orange,
        _ => blue,
      };
}

class _MessageFilterOption {
  const _MessageFilterOption(this.label, this.filters);
  final String label;
  final Map<String, String> filters;
}

class _MessageFilterDialog extends StatefulWidget {
  const _MessageFilterDialog(
      {required this.field, required this.title, required this.currentFilters});
  final String field;
  final String title;
  final Map<String, String> currentFilters;

  @override
  State<_MessageFilterDialog> createState() => _MessageFilterDialogState();
}

class _MessageFilterDialogState extends State<_MessageFilterDialog> {
  final search = TextEditingController();
  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: Text('${widget.title} चुनें'),
        content: SizedBox(
            width: 500,
            height: 520,
            child: Column(children: [
              TextField(
                  controller: search,
                  autofocus: true,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.search),
                      hintText: '${widget.title} खोजें...')),
              const SizedBox(height: 10),
              Expanded(
                  child: FutureBuilder<Map<String, dynamic>>(
                future: api.getQuery('/api/members/filter-options', {
                  ...widget.currentFilters,
                  'field': widget.field,
                  'q': search.text.trim(),
                  'limit': '100'
                }),
                builder: (_, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final items = List<Map<String, dynamic>>.from(
                      (snapshot.data?['items'] as List? ?? [])
                          .map((e) => Map<String, dynamic>.from(e)));
                  if (items.isEmpty) {
                    return const Center(child: Text('कोई option नहीं मिला।'));
                  }
                  return ListView.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, index) {
                        final item = items[index];
                        return ListTile(
                          title: Text('${item['label']}'),
                          subtitle: Text('${item['count']} मतदाता'),
                          onTap: () => Navigator.pop(
                              context,
                              _MessageFilterOption(
                                  '${item['label']}',
                                  Map<String, String>.from((item['filters']
                                          as Map)
                                      .map((k, v) => MapEntry('$k', '$v'))))),
                        );
                      });
                },
              )),
            ])),
      );
}

class _FilterPicker extends StatelessWidget {
  const _FilterPicker(
      this.label, this.icon, this.value, this.onTap, this.onClear);
  final String label;
  final IconData icon;
  final String? value;
  final VoidCallback onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final selected = value != null;
    return SizedBox(
      width: 220,
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
            padding: const EdgeInsets.fromLTRB(12, 9, 5, 9),
            child: Row(children: [
              Icon(icon, color: selected ? blue : muted, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(selected ? value! : '$label चुनें',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: selected ? navy : muted,
                        fontWeight: FontWeight.w700)),
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

class _DateButton extends StatelessWidget {
  const _DateButton(
      {required this.label, required this.value, required this.onTap});
  final String label;
  final String value;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 220,
      child: OutlinedButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.calendar_month_rounded),
          label: Text('$label: $value')));
}

class _NumberDropdown extends StatelessWidget {
  const _NumberDropdown(this.label, this.value, this.items, this.onChanged,
      {this.suffix = ''});
  final String label;
  final int value;
  final List<int> items;
  final ValueChanged<int> onChanged;
  final String suffix;
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 170,
      child: DropdownButtonFormField<int>(
        initialValue: value,
        decoration: InputDecoration(labelText: label),
        items: items
            .map((item) =>
                DropdownMenuItem(value: item, child: Text('$item$suffix')))
            .toList(),
        onChanged: (value) => onChanged(value!),
      ));
}

class _CountBox extends StatelessWidget {
  const _CountBox(this.label, this.value, this.color);
  final String label;
  final int value;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        width: 145,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: color.withValues(alpha: .07),
            borderRadius: BorderRadius.circular(10)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: muted, fontSize: 11)),
          Text('$value',
              style: TextStyle(
                  color: color, fontSize: 20, fontWeight: FontWeight.w900)),
        ]),
      );
}

int _number(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
