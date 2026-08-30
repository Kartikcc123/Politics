import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/picked_file_source.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/mobile_components.dart';
import 'import_review_page.dart';
import 'smart_excel_import_page.dart';

class UploadPage extends StatefulWidget {
  const UploadPage({super.key});

  @override
  State<UploadPage> createState() => _UploadPageState();
}

class _UploadPageState extends State<UploadPage> {
  String status = '';
  bool uploading = false;
  String? currentFile;
  int currentBytes = 0;
  int uploadedBytes = 0;
  int uploadTotalBytes = 0;
  bool serverProcessing = false;
  int processedRecords = 0;
  int totalRecords = 0;
  int importedRecords = 0;
  int skippedRecords = 0;
  int ocrPagesProcessed = 0;
  int ocrPagesTotal = 0;
  int ocrCardsProcessed = 0;
  int ocrCardsTotal = 0;
  String processingStage = '';
  Map<String, dynamic>? lastResult;
  List<Map<String, dynamic>> failedRecords = const [];
  String pdfListType = 'assembly';

  double? get progressValue {
    if (!uploading) return null;
    if (!serverProcessing && uploadTotalBytes > 0) {
      return (uploadedBytes / uploadTotalBytes).clamp(0, 1).toDouble();
    }
    if (totalRecords > 0) {
      return (processedRecords / totalRecords).clamp(0, 1).toDouble();
    }
    if (ocrCardsTotal > 0) {
      return (ocrCardsProcessed / ocrCardsTotal).clamp(0, 1).toDouble();
    }
    if (ocrPagesTotal > 0) {
      return (ocrPagesProcessed / ocrPagesTotal).clamp(0, 1).toDouble();
    }
    return null;
  }

  String get progressHeadline {
    if (!serverProcessing) return 'फाइल सुरक्षित अपलोड हो रही है';
    if (ocrPagesTotal > 0 && ocrPagesProcessed < ocrPagesTotal) {
      return 'PDF के पेज पढ़े जा रहे हैं';
    }
    if (ocrCardsTotal > 0 && ocrCardsProcessed < ocrCardsTotal) {
      return 'मतदाता कार्ड पहचाने जा रहे हैं';
    }
    return 'मतदाता रिकॉर्ड तैयार हो रहे हैं';
  }

  Future<Map<String, dynamic>> waitForImportCompletion(String uploadId) async {
    final deadline = DateTime.now().add(const Duration(minutes: 90));
    while (DateTime.now().isBefore(deadline)) {
      Map<String, dynamic> progress;
      try {
        progress = await api.get('/api/import/status/$uploadId');
      } catch (error) {
        if (!api.isTemporaryFailure(error)) rethrow;
        if (mounted) {
          setState(() {
            serverProcessing = true;
            processingStage =
                'Server reconnecting. OCR will continue automatically';
          });
        }
        await Future.delayed(const Duration(seconds: 5));
        continue;
      }
      if (!mounted) return progress;
      setState(() {
        processingStage = (progress['stage'] ?? '').toString();
        processedRecords = ((progress['processed'] ?? 0) as num).toInt();
        totalRecords = ((progress['total'] ?? 0) as num).toInt();
        importedRecords = ((progress['imported'] ?? 0) as num).toInt();
        skippedRecords = ((progress['skipped'] ?? 0) as num).toInt();
        ocrPagesProcessed =
            ((progress['ocrPagesProcessed'] ?? 0) as num).toInt();
        ocrPagesTotal = ((progress['ocrPagesTotal'] ?? 0) as num).toInt();
        ocrCardsProcessed =
            ((progress['ocrCardsProcessed'] ?? 0) as num).toInt();
        ocrCardsTotal = ((progress['ocrCardsTotal'] ?? 0) as num).toInt();
        serverProcessing = true;
      });
      if (progress['status'] == 'completed') {
        final result = progress['result'];
        if (result is Map) return Map<String, dynamic>.from(result);
        return progress;
      }
      if (progress['status'] == 'failed') {
        throw Exception(_localizedStage(
            (progress['stage'] ?? 'PDF import failed').toString()));
      }
      await Future.delayed(const Duration(seconds: 2));
    }
    throw Exception(
        'PDF का आयात अभी चल रहा है। कुछ देर बाद मतदाता सूची दोबारा खोलकर देखें।');
  }

  Future<void> upload(bool pdf) async {
    if (uploading) return;
    final ok = await api.validateSession();
    if (!ok) {
      setState(() => status =
          'आपका लॉगिन सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।');
      return;
    }
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: pdf ? ['pdf'] : ['xlsx', 'xls', 'csv'],
      withData: kIsWeb,
      withReadStream: !kIsWeb,
    );
    if (picked == null) return;
    final file = picked.files.single;
    if (file.size <= 0) {
      setState(() => status = 'चुनी गई फाइल खाली है या पढ़ी नहीं जा सकती।');
      return;
    }
    const maxUploadBytes = 250 * 1024 * 1024;
    if (file.size > maxUploadBytes) {
      setState(() => status =
          'फाइल बहुत बड़ी है। अधिकतम 250 MB की फाइल अपलोड की जा सकती है।');
      return;
    }
    setState(() {
      uploading = true;
      currentFile = file.name;
      currentBytes = file.size;
      uploadedBytes = 0;
      uploadTotalBytes = file.size;
      serverProcessing = false;
      processedRecords = 0;
      totalRecords = 0;
      importedRecords = 0;
      skippedRecords = 0;
      ocrPagesProcessed = 0;
      ocrPagesTotal = 0;
      ocrCardsProcessed = 0;
      ocrCardsTotal = 0;
      processingStage = '';
      lastResult = null;
      failedRecords = const [];
      status = 'फाइल अपलोड हो रही है। बड़ी PDF में कुछ समय लग सकता है…';
    });
    final uploadId = 'upload-${DateTime.now().millisecondsSinceEpoch}';
    try {
      void updateProgress(int sent, int total) {
        if (!mounted) return;
        setState(() {
          uploadedBytes = sent;
          uploadTotalBytes = total > 0 ? total : file.size;
          if (sent >= uploadTotalBytes && uploadTotalBytes > 0) {
            serverProcessing = true;
            status = 'फाइल अपलोड हो गई। अब मतदाता रिकॉर्ड तैयार हो रहे हैं…';
          }
        });
      }

      var res = pdf
          ? await api.uploadPdfResumable(
              uploadId: uploadId,
              filename: file.name,
              fileLength: file.size,
              bytes: pickedFileBytes(file),
              fileStream: file.readStream,
              onProgress: updateProgress,
              listType: pdfListType,
            )
          : await api.uploadFile(
              '/api/import/members',
              filename: file.name,
              filePath: pickedFilePath(file),
              bytes: pickedFileBytes(file),
              fileStream: file.readStream,
              fileLength: file.size,
              fields: {'uploadId': uploadId},
              onProgress: updateProgress,
            );
      if (res['processing'] == true) {
        if (!mounted) return;
        setState(() {
          serverProcessing = true;
          status =
              'फाइल अपलोड हो गई। PDF पढ़कर मतदाता रिकॉर्ड बनाए जा रहे हैं…';
        });
        res = await waitForImportCompletion(uploadId);
      }
      await OfflineVoterCache.clear();
      api.notifyDataChanged();
      if (!mounted) return;
      setState(() {
        lastResult = Map<String, dynamic>.from(res);
        failedRecords = _extractFailedRecords(res);
        status =
            'आयात सफल रहा। ${res['imported'] ?? 0} मतदाता जोड़े गए और ${(res['skipped'] as List? ?? []).length} रिकॉर्ड समीक्षा के लिए छोड़े गए। मतदाता सूची अपने आप अपडेट हो गई है।';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        lastResult = null;
        failedRecords = const [];
        status = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  Widget buildPhoneUpload(BuildContext context) => AppPage(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 110),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xff0c52d9), Color(0xff367df0)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(22),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x261457f5),
                    blurRadius: 24,
                    offset: Offset(0, 10)),
              ],
            ),
            child: const Row(children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: Color(0x26ffffff),
                foregroundColor: Colors.white,
                child: Icon(Icons.cloud_upload_rounded, size: 30),
              ),
              SizedBox(width: 15),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('मतदाता डेटा आयात',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w900)),
                      SizedBox(height: 4),
                      Text('PDF, Excel या CSV से एक साथ मतदाता जोड़ें',
                          style:
                              TextStyle(color: Colors.white70, fontSize: 12)),
                    ]),
              ),
            ]),
          ),
          _RollTypeSelector(
            value: pdfListType,
            enabled: !uploading,
            onChanged: (value) => setState(() => pdfListType = value),
          ),
          const Padding(
            padding: EdgeInsets.only(top: 5),
            child: Text('फाइल का प्रकार चुनें',
                style: TextStyle(
                    color: navy, fontSize: 17, fontWeight: FontWeight.w900)),
          ),
          _UploadCard(
            title: 'मतदाता सूची PDF',
            description: 'स्कैन और टेक्स्ट—दोनों PDF में OCR अपने आप चलेगा',
            badge: 'OCR',
            icon: Icons.picture_as_pdf_rounded,
            color: rose,
            enabled: !uploading,
            onTap: () => upload(true),
          ),
          _UploadCard(
            title: 'Excel या CSV फाइल',
            description: 'कई मतदाता रिकॉर्ड तेजी से एक साथ आयात करें',
            badge: 'FAST',
            icon: Icons.table_view_rounded,
            color: green,
            enabled: !uploading,
            onTap: () => upload(false),
          ),
          _ReviewBeforeSaveCard(
            enabled: !uploading,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SmartExcelImportPage()),
            ),
          ),
          const _ServerMemoryWarning(),
          if (uploading) _PhoneImportProgress(state: this),
          if (!uploading && status.isNotEmpty)
            _PhoneImportResult(
              success: status.startsWith('आयात सफल'),
              message: status,
              filename: currentFile,
              result: lastResult,
              failedRecords: failedRecords,
              onReview: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ImportReviewPage()),
              ),
            ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xfff4f7fc),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: border),
            ),
            child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.shield_outlined, color: blue, size: 21),
                    SizedBox(width: 9),
                    Text('सुरक्षित और आसान आयात',
                        style: TextStyle(
                            color: navy, fontWeight: FontWeight.w900)),
                  ]),
                  SizedBox(height: 12),
                  _Tip(text: 'अधिकतम 250 MB की फाइल चुन सकते हैं'),
                  _Tip(text: 'PDF में photo और voter card OCR से पढ़े जाएंगे'),
                  _Tip(text: 'ऐप खुला रखें—progress इसी screen पर दिखेगी'),
                  _Tip(text: 'आयात पूरा होते ही Contacts अपने आप update होंगे'),
                ]),
          ),
        ],
      );

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.sizeOf(context).width < 700) {
      return buildPhoneUpload(context);
    }
    return AppPage(children: [
      const PageHeading(
        title: 'PDF / Excel अपलोड',
        subtitle: 'मतदाता सूची की PDF, Excel या CSV फाइल अपलोड करें',
      ),
      _RollTypeSelector(
        value: pdfListType,
        enabled: !uploading,
        onChanged: (value) => setState(() => pdfListType = value),
      ),
      LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth > 650
              ? (constraints.maxWidth - 12) / 2
              : constraints.maxWidth;
          return Wrap(spacing: 12, runSpacing: 12, children: [
            SizedBox(
              width: width,
              child: _UploadCard(
                title: 'मतदाता सूची PDF',
                description: 'टेक्स्ट और स्कैन की हुई दोनों PDF समर्थित हैं',
                icon: Icons.picture_as_pdf,
                color: Colors.red,
                enabled: !uploading,
                onTap: () => upload(true),
              ),
            ),
            SizedBox(
              width: width,
              child: _UploadCard(
                title: 'Excel / CSV',
                description: 'एक साथ कई मतदाता रिकॉर्ड जोड़ें',
                icon: Icons.table_view,
                color: green,
                enabled: !uploading,
                onTap: () => upload(false),
              ),
            ),
          ]);
        },
      ),
      _ReviewBeforeSaveCard(
        enabled: !uploading,
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SmartExcelImportPage()),
        ),
      ),
      const _ServerMemoryWarning(),
      if (uploading || status.isNotEmpty)
        SectionCard(
          title: uploading ? 'अपलोड और आयात जारी है' : 'अपलोड का परिणाम',
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (currentFile != null)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: Color(0xffeef3ff),
                  child: Icon(Icons.insert_drive_file, color: blue),
                ),
                title: Text(currentFile!,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text(_formatBytes(currentBytes)),
              ),
            if (uploading) ...[
              LinearProgressIndicator(
                minHeight: 7,
                value: serverProcessing
                    ? totalRecords > 0
                        ? (processedRecords / totalRecords)
                            .clamp(0, 1)
                            .toDouble()
                        : ocrCardsTotal > 0
                            ? (ocrCardsProcessed / ocrCardsTotal)
                                .clamp(0, 1)
                                .toDouble()
                            : ocrPagesTotal > 0
                                ? (ocrPagesProcessed / ocrPagesTotal)
                                    .clamp(0, 1)
                                    .toDouble()
                                : null
                    : uploadTotalBytes > 0
                        ? (uploadedBytes / uploadTotalBytes)
                            .clamp(0, 1)
                            .toDouble()
                        : null,
              ),
              const SizedBox(height: 10),
              Text(
                serverProcessing
                    ? totalRecords > 0
                        ? '$totalRecords में से $processedRecords रिकॉर्ड तैयार हुए • $importedRecords जोड़े गए • $skippedRecords छोड़े गए'
                        : ocrCardsTotal > 0
                            ? '$ocrCardsTotal में से $ocrCardsProcessed संभावित मतदाता रिकॉर्ड पढ़े गए'
                            : ocrPagesTotal > 0
                                ? 'PDF के $ocrPagesTotal में से $ocrPagesProcessed पेज पढ़े गए'
                                : '${processingStage.isEmpty ? 'PDF पढ़ी जा रही है' : _localizedStage(processingStage)}…'
                    : '${_formatBytes(uploadTotalBytes > 0 ? uploadTotalBytes : currentBytes)} में से ${_formatBytes(uploadedBytes)} अपलोड हुआ',
                style:
                    const TextStyle(color: navy, fontWeight: FontWeight.w800),
              ),
              if (serverProcessing && processingStage.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(_localizedStage(processingStage),
                    style: const TextStyle(color: muted)),
              ],
              const SizedBox(height: 8),
              const Text(
                'कृपया ऐप बंद न करें। फाइल अपलोड होने के बाद PDF पढ़ने और मतदाता जोड़ने में कुछ मिनट लग सकते हैं।',
                style: TextStyle(color: muted),
              ),
            ] else
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    status,
                    style: TextStyle(
                      color: status.startsWith('आयात सफल') ? green : Colors.red,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (lastResult != null) ...[
                    const SizedBox(height: 12),
                    _ImportReviewSummary(
                      result: lastResult!,
                      failedRecords: failedRecords,
                      onReview: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ImportReviewPage()),
                      ),
                    ),
                  ],
                ],
              ),
          ]),
        ),
      const SectionCard(
        title: 'जरूरी जानकारी',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('• अधिकतम 250 MB की फाइल अपलोड की जा सकती है।'),
          Text('• अपलोड और रिकॉर्ड आयात की प्रगति अलग-अलग दिखाई जाएगी।'),
          Text('• स्कैन की हुई PDF पढ़ने में कुछ मिनट लग सकते हैं।'),
          Text('• PDF में मिले वार्ड और बूथ अपने आप बनाए जाएंगे।'),
        ]),
      ),
    ]);
  }
}

class _RollTypeSelector extends StatelessWidget {
  const _RollTypeSelector(
      {required this.value, required this.enabled, required this.onChanged});

  final String value;
  final bool enabled;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('PDF सूची का प्रकार',
              style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            ChoiceChip(
              label: const Text('विधानसभा सूची'),
              selected: value == 'assembly',
              onSelected: enabled ? (_) => onChanged('assembly') : null,
            ),
            ChoiceChip(
              label: const Text('नगरपालिका Ward सूची'),
              selected: value == 'municipal',
              onSelected: enabled ? (_) => onChanged('municipal') : null,
            ),
          ]),
          const SizedBox(height: 8),
          Text(
            value == 'municipal'
                ? 'EPIC match होने पर केवल Ward detail जुड़ेगी; विधानसभा data overwrite नहीं होगा।'
                : 'यह default सूची है और existing विधानसभा OCR इस्तेमाल करेगी।',
            style: const TextStyle(color: muted, fontSize: 12),
          ),
        ]),
      );
}

class _UploadCard extends StatelessWidget {
  const _UploadCard({
    required this.title,
    required this.description,
    this.badge,
    required this.icon,
    required this.color,
    required this.enabled,
    required this.onTap,
  });
  final String title;
  final String description;
  final String? badge;
  final IconData icon;
  final Color color;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: border),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(children: [
            CircleAvatar(
              radius: 27,
              backgroundColor: color.withValues(alpha: .1),
              child: Icon(icon, color: color, size: 30),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(
                        child: Text(title,
                            style: const TextStyle(
                                color: navy,
                                fontSize: 16,
                                fontWeight: FontWeight.w900)),
                      ),
                      if (badge != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: .1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(badge!,
                              style: TextStyle(
                                  color: color,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900)),
                        ),
                    ]),
                    const SizedBox(height: 5),
                    Text(description,
                        style: const TextStyle(color: muted, fontSize: 12)),
                  ]),
            ),
            const Icon(Icons.chevron_right_rounded, color: muted),
          ]),
        ),
      );
}

class _ReviewBeforeSaveCard extends StatelessWidget {
  const _ReviewBeforeSaveCard({required this.enabled, required this.onTap});
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xfff7fff9),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: green.withValues(alpha: .24)),
          ),
          child: const Row(children: [
            CircleAvatar(
              backgroundColor: softGreen,
              child: Icon(Icons.rule_folder_rounded, color: green),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Excel review before save',
                        style: TextStyle(
                            color: navy, fontWeight: FontWeight.w900)),
                    SizedBox(height: 3),
                    Text(
                        'कॉलम मिलाएं, duplicate/missing summary देखें, फिर import करें।',
                        style: TextStyle(color: muted, fontSize: 12)),
                  ]),
            ),
            Icon(Icons.chevron_right_rounded, color: muted),
          ]),
        ),
      );
}

class _ServerMemoryWarning extends StatelessWidget {
  const _ServerMemoryWarning();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xfffff7ed),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: orange.withValues(alpha: .28)),
        ),
        child:
            const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.memory_rounded, color: orange),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Server memory warning: बड़ी/scanned PDF में OCR धीरे चलेगा। 1–2 page test करें, app खुला रखें, और request fail हो तो थोड़ी देर बाद retry करें।',
              style: TextStyle(color: navy, fontWeight: FontWeight.w800),
            ),
          ),
        ]),
      );
}

class _ProgressMiniStat extends StatelessWidget {
  const _ProgressMiniStat({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xfff7f9ff),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: blue, size: 16),
          const SizedBox(width: 6),
          Text('$label: $value',
              style: const TextStyle(
                  color: navy, fontSize: 12, fontWeight: FontWeight.w900)),
        ]),
      );
}

class _ImportReviewSummary extends StatelessWidget {
  const _ImportReviewSummary({
    required this.result,
    required this.failedRecords,
    required this.onReview,
  });
  final Map<String, dynamic> result;
  final List<Map<String, dynamic>> failedRecords;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    final imported = _num(result['imported']);
    final created = _num(result['created']);
    final updated = _num(result['updated']);
    final reviewRequired = _num(result['reviewRequired']);
    final skippedCount = result['skipped'] is List
        ? (result['skipped'] as List).length
        : _num(result['skipped']);
    final duplicates = _num(result['duplicateSkipped']) +
        _num(result['fileDuplicates']) +
        _num(result['mobileDuplicates']);
    final missing = failedRecords
        .where((record) =>
            '${record['reason'] ?? ''}'.toLowerCase().contains('missing'))
        .length;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: 8, runSpacing: 8, children: [
        _ImportMetric('Imported', imported, Icons.done_all_rounded, green),
        _ImportMetric('Created', created, Icons.person_add_rounded, blue),
        _ImportMetric('Updated', updated, Icons.edit_note_rounded, purple),
        _ImportMetric(
            'Review', reviewRequired, Icons.fact_check_rounded, orange),
        _ImportMetric('Skipped', skippedCount, Icons.block_rounded, rose),
        _ImportMetric('Duplicate', duplicates, Icons.copy_rounded, orange),
        _ImportMetric(
            'Missing data', missing, Icons.error_outline_rounded, rose),
      ]),
      const SizedBox(height: 12),
      if (reviewRequired > 0)
        OutlinedButton.icon(
          onPressed: onReview,
          icon: const Icon(Icons.fact_check_rounded),
          label: Text('$reviewRequired records review करें'),
        ),
      if (failedRecords.isNotEmpty) ...[
        const SizedBox(height: 12),
        _FailedRecordsList(records: failedRecords),
      ],
    ]);
  }

  static int _num(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}

class _ImportMetric extends StatelessWidget {
  const _ImportMetric(this.label, this.value, this.icon, this.color);
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: .18)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: color, size: 17),
          const SizedBox(width: 6),
          Text('$label: $value',
              style: const TextStyle(
                  color: navy, fontSize: 12, fontWeight: FontWeight.w900)),
        ]),
      );
}

class _FailedRecordsList extends StatelessWidget {
  const _FailedRecordsList({required this.records});
  final List<Map<String, dynamic>> records;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xfffff8fa),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: rose.withValues(alpha: .20)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Failed / skipped records',
              style: TextStyle(color: navy, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          ...records.take(8).map((record) {
            final row = record['row'] ?? record['item']?['row'] ?? '-';
            final reason = record['reason'] ?? 'Unknown reason';
            final name =
                record['item']?['name'] ?? record['row']?['name'] ?? '';
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                  '• Row $row ${name.toString().isEmpty ? '' : '· $name'} — $reason',
                  style: const TextStyle(color: navy, fontSize: 12)),
            );
          }),
          if (records.length > 8)
            Text('+${records.length - 8} और records review में हैं',
                style: const TextStyle(color: muted, fontSize: 12)),
        ]),
      );
}

class _PhoneImportProgress extends StatelessWidget {
  const _PhoneImportProgress({required this.state});
  final _UploadPageState state;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: blue.withValues(alpha: .22)),
          boxShadow: const [
            BoxShadow(
                color: Color(0x101457f5), blurRadius: 18, offset: Offset(0, 8)),
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const SizedBox(
              width: 42,
              height: 42,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(state.progressHeadline,
                        style: const TextStyle(
                            color: navy,
                            fontSize: 15,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 3),
                    Text(state.currentFile ?? 'चुनी हुई फाइल',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: muted, fontSize: 12)),
                  ]),
            ),
          ]),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: LinearProgressIndicator(
              value: state.progressValue,
              minHeight: 9,
              backgroundColor: softBlue,
            ),
          ),
          const SizedBox(height: 10),
          Text(_phoneProgressText(state),
              style: const TextStyle(
                  color: navy, fontSize: 12, fontWeight: FontWeight.w700)),
          if (state.ocrPagesTotal > 0 || state.ocrCardsTotal > 0) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (state.ocrPagesTotal > 0)
                _ProgressMiniStat(
                    icon: Icons.picture_as_pdf_rounded,
                    label: 'OCR pages',
                    value: '${state.ocrPagesProcessed}/${state.ocrPagesTotal}'),
              if (state.ocrCardsTotal > 0)
                _ProgressMiniStat(
                    icon: Icons.badge_rounded,
                    label: 'Voter cards',
                    value: '${state.ocrCardsProcessed}/${state.ocrCardsTotal}'),
            ]),
          ],
          const SizedBox(height: 16),
          _ImportStep(label: 'फाइल अपलोड', done: state.serverProcessing),
          _ImportStep(
              label: 'PDF / OCR पढ़ना',
              active: state.serverProcessing,
              done: state.totalRecords > 0),
          _ImportStep(
              label: 'मतदाता रिकॉर्ड बनाना',
              active: state.totalRecords > 0,
              last: true),
        ]),
      );
}

class _ImportStep extends StatelessWidget {
  const _ImportStep(
      {required this.label,
      this.done = false,
      this.active = false,
      this.last = false});
  final String label;
  final bool done;
  final bool active;
  final bool last;

  @override
  Widget build(BuildContext context) => Row(children: [
        Column(children: [
          Icon(done ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: done
                  ? green
                  : active
                      ? blue
                      : border,
              size: 20),
          if (!last)
            Container(width: 2, height: 16, color: done ? green : border),
        ]),
        const SizedBox(width: 9),
        Padding(
          padding: EdgeInsets.only(bottom: last ? 0 : 16),
          child: Text(label,
              style: TextStyle(
                  color: done || active ? navy : muted,
                  fontSize: 12,
                  fontWeight:
                      done || active ? FontWeight.w800 : FontWeight.w500)),
        ),
      ]);
}

class _PhoneImportResult extends StatelessWidget {
  const _PhoneImportResult({
    required this.success,
    required this.message,
    required this.filename,
    required this.result,
    required this.failedRecords,
    required this.onReview,
  });
  final bool success;
  final String message;
  final String? filename;
  final Map<String, dynamic>? result;
  final List<Map<String, dynamic>> failedRecords;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: success ? softGreen : const Color(0xfffff1f4),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: (success ? green : rose).withValues(alpha: .25)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(
              success
                  ? Icons.check_circle_rounded
                  : Icons.error_outline_rounded,
              color: success ? green : rose,
              size: 30),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(success ? 'आयात सफल रहा' : 'आयात पूरा नहीं हुआ',
                  style: const TextStyle(
                      color: navy, fontSize: 15, fontWeight: FontWeight.w900)),
              if (filename != null) ...[
                const SizedBox(height: 2),
                Text(filename!,
                    style: const TextStyle(color: muted, fontSize: 11)),
              ],
              const SizedBox(height: 7),
              Text(message, style: const TextStyle(color: navy, fontSize: 12)),
              if (result != null) ...[
                const SizedBox(height: 12),
                _ImportReviewSummary(
                  result: result!,
                  failedRecords: failedRecords,
                  onReview: onReview,
                ),
              ],
            ]),
          ),
        ]),
      );
}

class _Tip extends StatelessWidget {
  const _Tip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 7),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Padding(
            padding: EdgeInsets.only(top: 3),
            child: Icon(Icons.check_circle_rounded, color: green, size: 15),
          ),
          const SizedBox(width: 8),
          Expanded(
              child: Text(text,
                  style: const TextStyle(color: muted, fontSize: 12))),
        ]),
      );
}

String _phoneProgressText(_UploadPageState state) {
  if (!state.serverProcessing) {
    return '${_formatBytes(state.uploadedBytes)} / ${_formatBytes(state.uploadTotalBytes)}';
  }
  if (state.ocrPagesTotal > 0) {
    return '${state.ocrPagesProcessed} / ${state.ocrPagesTotal} पेज पढ़े गए';
  }
  if (state.ocrCardsTotal > 0) {
    return '${state.ocrCardsProcessed} / ${state.ocrCardsTotal} voter cards पढ़े गए';
  }
  if (state.totalRecords > 0) {
    return '${state.processedRecords} / ${state.totalRecords} रिकॉर्ड तैयार · ${state.importedRecords} जोड़े';
  }
  return state.processingStage.isEmpty
      ? 'सर्वर पर processing शुरू हो रही है…'
      : _localizedStage(state.processingStage);
}

List<Map<String, dynamic>> _extractFailedRecords(Map<String, dynamic> result) {
  final raw = result['failed'] ?? result['failedRecords'] ?? result['skipped'];
  if (raw is! List) return const [];
  return raw
      .whereType<Object?>()
      .map((item) {
        if (item is Map) return Map<String, dynamic>.from(item);
        return {'reason': '$item'};
      })
      .where((item) => item.isNotEmpty)
      .toList();
}

String _formatBytes(int bytes) {
  if (bytes >= 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  return '$bytes बाइट';
}

String _localizedStage(String stage) {
  const stages = {
    'Waiting for upload': 'फाइल अपलोड होने की प्रतीक्षा है',
    'Receiving file on server': 'फाइल सर्वर पर भेजी जा रही है',
    'Upload received. Preparing import':
        'फाइल मिल गई, आयात की तैयारी हो रही है',
    'Upload received. PDF/OCR import running in background':
        'PDF पढ़कर मतदाता रिकॉर्ड बनाए जा रहे हैं',
    'Reading PDF/OCR text': 'PDF का टेक्स्ट पढ़ा जा रहा है',
    'Reading Excel/CSV file': 'Excel / CSV फाइल पढ़ी जा रही है',
    'Importing voter rows': 'मतदाता रिकॉर्ड जोड़े जा रहे हैं',
    'PDF records detected': 'PDF में मिले मतदाता रिकॉर्ड तैयार किए जा रहे हैं',
    'Building family records': 'परिवार रिकॉर्ड बनाए जा रहे हैं',
    'Import complete': 'आयात पूरा हो गया',
    'PDF import failed': 'PDF का आयात असफल रहा',
    'Excel/CSV import failed': 'Excel / CSV का आयात असफल रहा',
    'Preparing PDF pages for OCR': 'PDF के पेज OCR के लिए तैयार हो रहे हैं',
  };
  final pageProgress =
      RegExp(r'^Reading PDF pages (\d+) / (\d+)$').firstMatch(stage);
  if (pageProgress != null) {
    return 'PDF के ${pageProgress.group(2)} में से ${pageProgress.group(1)} पेज पढ़े गए';
  }
  final cardProgress =
      RegExp(r'^Reading voter cards (\d+) / (\d+)$').firstMatch(stage);
  if (cardProgress != null) {
    return '${cardProgress.group(2)} में से ${cardProgress.group(1)} संभावित मतदाता रिकॉर्ड पढ़े गए';
  }
  return stages[stage] ?? stage;
}
