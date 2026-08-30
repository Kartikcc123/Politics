import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/picked_file_source.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';

class MasterDataImportPage extends StatefulWidget {
  const MasterDataImportPage({super.key});

  @override
  State<MasterDataImportPage> createState() => _MasterDataImportPageState();
}

class _MasterDataImportPageState extends State<MasterDataImportPage> {
  bool busy = false;
  Map<String, dynamic>? result;

  Future<void> _run(Future<Map<String, dynamic>> Function() action) async {
    setState(() { busy = true; result = null; });
    try {
      final response = await action();
      if (!mounted) return;
      setState(() { busy = false; result = response; });
      api.notifyDataChanged();
    } catch (error) {
      if (!mounted) return;
      setState(() => busy = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _importRaipur() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('रायपुर मास्टर आयात करें?'),
        content: const Text('29 ग्राम पंचायत, उनके सभी गाँव, जनसंख्या और 251 वार्ड repeat-safe तरीके से जोड़े या अपडेट किए जाएंगे।'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('रद्द करें')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('आयात करें')),
        ],
      ),
    );
    if (confirmed == true) {
      await _run(() => api.post('/api/areas/master/import', {'source': 'raipur'}));
    }
  }

  Future<void> _pickMaster() async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['xlsx', 'xls', 'csv', 'json'],
      withData: kIsWeb,
      withReadStream: !kIsWeb,
    );
    if (picked == null) return;
    final file = picked.files.single;
    await _run(() => api.uploadFile(
      '/api/areas/master/import',
      filename: file.name,
      filePath: pickedFilePath(file),
      bytes: pickedFileBytes(file),
      fileStream: file.readStream,
      fileLength: file.size,
      fields: const {'district': 'Bhilwara', 'tehsil': 'Raipur'},
    ));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('लोकेशन मास्टर आयात')),
    body: AppPage(children: [
      const Text('पंचायत और गाँव की प्रमाणित सूची को मतदाता OCR matching के लिए तैयार रखें।', style: TextStyle(color: muted)),
      const SizedBox(height: 20),
      _ImportOption(
        icon: Icons.verified_outlined,
        title: 'रायपुर का verified master',
        subtitle: 'जिला भीलवाड़ा • तहसील रायपुर • 29 पंचायत • 251 वार्ड • जनसंख्या 97,869',
        action: FilledButton.icon(onPressed: busy ? null : _importRaipur, icon: const Icon(Icons.storage_rounded), label: const Text('रायपुर आयात करें')),
      ),
      const SizedBox(height: 12),
      _ImportOption(
        icon: Icons.upload_file_outlined,
        title: 'अपनी master file आयात करें',
        subtitle: 'Excel / CSV / JSON columns: gramPanchayat, panchayatPopulation, wardCount, village, villagePopulation, pinCode, panchayatAliases, villageAliases',
        action: OutlinedButton.icon(onPressed: busy ? null : _pickMaster, icon: const Icon(Icons.file_open_outlined), label: const Text('फाइल चुनें')),
      ),
      if (busy) ...[const SizedBox(height: 20), const LinearProgressIndicator()],
      if (result != null) ...[
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: softGreen, borderRadius: BorderRadius.circular(8), border: Border.all(color: green.withValues(alpha: .3))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [Icon(Icons.check_circle_outline, color: green), SizedBox(width: 8), Text('मास्टर आयात सफल', style: TextStyle(fontWeight: FontWeight.w900, color: navy))]),
            const SizedBox(height: 10),
            Text('${result!['panchayats'] ?? 0} पंचायत • ${result!['villages'] ?? 0} गाँव • ${result!['wards'] ?? 0} वार्ड • जनसंख्या ${result!['population'] ?? 0}'),
          ]),
        ),
      ],
    ]),
  );
}

class _ImportOption extends StatelessWidget {
  const _ImportOption({required this.icon, required this.title, required this.subtitle, required this.action});
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget action;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: border)),
    child: Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 16, runSpacing: 12, children: [
      SizedBox(width: 520, child: Row(children: [
        CircleAvatar(backgroundColor: softBlue, foregroundColor: blue, child: Icon(icon)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w900, color: navy)), const SizedBox(height: 4), Text(subtitle, style: const TextStyle(color: muted))])),
      ])),
      action,
    ]),
  );
}