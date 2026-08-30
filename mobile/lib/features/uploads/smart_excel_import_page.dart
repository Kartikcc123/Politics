import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/picked_file_source.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';

class SmartExcelImportPage extends StatefulWidget {
  const SmartExcelImportPage({super.key});
  @override
  State<SmartExcelImportPage> createState() => _SmartExcelImportPageState();
}

class _SmartExcelImportPageState extends State<SmartExcelImportPage> {
  Map<String, dynamic>? preview;
  Map<String, String> mapping = {};
  Map<String, dynamic>? validation;
  final corrections = <String, Map<String, String>>{};
  String? ward;
  String? booth;
  bool busy = false;

  Future<void> pick() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['xlsx', 'xls', 'csv'],
      withData: kIsWeb,
      withReadStream: !kIsWeb,
    );
    if (result == null) return;
    final file = result.files.single;
    setState(() => busy = true);
    final data = await api.uploadFile(
      '/api/import-previews',
      filename: file.name,
      filePath: pickedFilePath(file),
      bytes: pickedFileBytes(file),
      fileStream: file.readStream,
      fileLength: file.size,
    );
    setState(() {
      preview = data;
      mapping = Map<String, String>.from(data['suggestedMapping'] ?? {});
      validation = Map<String, dynamic>.from(data['summary'] ?? {});
      busy = false;
    });
  }

  Future<void> validate() async {
    final result = await api.post(
        '/api/import-previews/${preview!['previewId']}/validate',
        {'mapping': mapping, 'corrections': corrections});
    setState(() => validation = result);
  }

  Future<void> commit() async {
    if (ward == null || booth == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('वार्ड और बूथ चुनें।')));
      return;
    }
    final confirmed = await _confirmFinalImport();
    if (confirmed != true) return;
    setState(() => busy = true);
    try {
      final result = await api
          .post('/api/import-previews/${preview!['previewId']}/commit', {
        'mapping': mapping,
        'ward': ward,
        'booth': booth,
      });
      await OfflineVoterCache.clear();
      api.notifyDataChanged();
      if (!mounted) return;
      setState(() {
        preview = null;
        validation = null;
        corrections.clear();
        busy = false;
        ward = null;
        booth = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            '${result['created']} नए मतदाता जोड़े गए, ${result['updated']} रिकॉर्ड अपडेट हुए और ${result['reviewRequired']} रिकॉर्ड समीक्षा के लिए रखे गए।'),
      ));
    } catch (error) {
      if (!mounted) return;
      setState(() => busy = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Import failed: $error'),
      ));
    }
  }

  @override
  Widget build(BuildContext context) => AppPage(children: [
        PremiumFeatureHero(
          title: 'Excel से मतदाता आयात',
          subtitle:
              'कॉलम मिलाएं, records validate करें और जांच के बाद ही मतदाता जोड़ें।',
          icon: Icons.table_view_rounded,
          accent: green,
          badges: const ['Preview', 'Validation', 'Safe import'],
          action: FilledButton.icon(
              onPressed: busy ? null : pick,
              icon: const Icon(Icons.upload_file),
              label: const Text('Excel चुनें')),
        ),
        if (busy) const LinearProgressIndicator(),
        if (!busy && preview == null)
          PremiumEmptyState(
            icon: Icons.upload_file_rounded,
            title: 'Excel या CSV फाइल चुनें',
            subtitle:
                'पहले preview और validation दिखेगा—आपकी मंजूरी के बिना records import नहीं होंगे।',
            action: FilledButton.icon(
              onPressed: pick,
              icon: const Icon(Icons.folder_open_rounded),
              label: const Text('फाइल चुनें'),
            ),
          ),
        if (preview != null) ...[
          _summary(),
          _previewTable(),
          _invalidCorrectionPanel(),
          Panel(
            title: 'कॉलम और स्थान चुनें',
            child: Column(children: [
              _sectionHeader(
                icon: Icons.swap_horiz_rounded,
                title: 'कॉलम मिलान',
                subtitle: 'Excel के column को सही voter field से match करें।',
              ),
              ...List<String>.from(preview!['headers'] ?? [])
                  .map((header) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _MappingRow(
                          header: header,
                          value: mapping[header] ?? '',
                          targets: List<String>.from(preview!['targets'] ?? []),
                          onChanged: (value) =>
                              setState(() => mapping[header] = value ?? ''),
                        ),
                      )),
              const SizedBox(height: 14),
              _sectionHeader(
                icon: Icons.location_on_rounded,
                title: 'Default वार्ड / बूथ',
                subtitle:
                    'Excel में missing ward/booth हो तो यह default value लगेगी।',
              ),
              Wrap(spacing: 12, runSpacing: 12, children: [
                FutureBlock<List<dynamic>>(
                  load: () => api.list('/api/wards'),
                  builder: (items) => SizedBox(
                    width: 330,
                    child: _SearchablePickerField(
                      label: 'वार्ड चुनें *',
                      icon: Icons.map_rounded,
                      value: ward,
                      options: _locationOptions(items),
                      onChanged: (value) => setState(() => ward = value),
                    ),
                  ),
                ),
                FutureBlock<List<dynamic>>(
                  load: () => api.list('/api/booths'),
                  builder: (items) => SizedBox(
                    width: 330,
                    child: _SearchablePickerField(
                      label: 'बूथ चुनें *',
                      icon: Icons.how_to_vote_rounded,
                      value: booth,
                      options: _locationOptions(items),
                      onChanged: (value) => setState(() => booth = value),
                    ),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              Wrap(spacing: 10, children: [
                OutlinedButton.icon(
                    onPressed: validate,
                    icon: const Icon(Icons.fact_check),
                    label: const Text('दोबारा जांचें')),
                FilledButton.icon(
                    onPressed: commit,
                    icon: const Icon(Icons.save),
                    label: const Text('मतदाता जोड़ें')),
              ]),
            ]),
          ),
        ],
      ]);

  Widget _summary() {
    final data = validation ?? {};
    final missing =
        _asInt(data['missingRequired']) + _asInt(data['invalidEpic']);
    final duplicates =
        _asInt(data['fileDuplicates']) + _asInt(data['mobileDuplicates']);
    return Panel(
      title: 'Import summary',
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Wrap(spacing: 10, runSpacing: 10, children: [
          _metric('कुल रिकॉर्ड', data['total'], Icons.table_rows_rounded, blue),
          _metric('नए', data['creates'], Icons.person_add_alt_1_rounded, green),
          _metric(
              'अपडेट', data['updates'], Icons.update_rounded, Colors.orange),
          _metric('Missing / गलत', missing, Icons.error_outline_rounded,
              Colors.redAccent),
          _metric('Duplicate', duplicates, Icons.copy_rounded, purple),
        ]),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: duplicates > 0 || missing > 0
                ? Colors.orange.withValues(alpha: .08)
                : green.withValues(alpha: .08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: duplicates > 0 || missing > 0
                  ? Colors.orange.withValues(alpha: .25)
                  : green.withValues(alpha: .25),
            ),
          ),
          child: Row(children: [
            Icon(
              duplicates > 0 || missing > 0
                  ? Icons.warning_amber_rounded
                  : Icons.verified_rounded,
              color: duplicates > 0 || missing > 0 ? Colors.orange : green,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                duplicates > 0 || missing > 0
                    ? 'Import से पहले missing data और duplicate records review कर लें।'
                    : 'Preview साफ दिख रहा है — final confirmation के बाद import करें।',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ]),
        )
      ]),
    );
  }

  Widget _previewTable() {
    final headers =
        List<String>.from(preview!['headers'] ?? []).take(6).toList();
    final rows = List.from(preview!['sampleRows'] ?? []).take(8).toList();
    if (headers.isEmpty || rows.isEmpty) return const SizedBox.shrink();
    return Panel(
      title: 'Preview table',
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
          'पहले ${rows.length} rows देखें। अगर column गलत match है तो नीचे “कॉलम मिलान” में ठीक करें।',
          style: TextStyle(color: Colors.grey.shade700),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowColor:
                  WidgetStatePropertyAll(blue.withValues(alpha: .08)),
              border: TableBorder.all(
                color: Colors.grey.withValues(alpha: .18),
                borderRadius: BorderRadius.circular(16),
              ),
              columns: [
                const DataColumn(label: Text('#')),
                ...headers.map((header) => DataColumn(
                    label: Text(header,
                        style: const TextStyle(fontWeight: FontWeight.w800)))),
              ],
              rows: rows.asMap().entries.map((entry) {
                final data = Map<String, dynamic>.from(entry.value);
                return DataRow(cells: [
                  DataCell(Text('${entry.key + 1}')),
                  ...headers.map((header) => DataCell(SizedBox(
                        width: 130,
                        child: Text(
                          '${data[header] ?? ''}'.trim().isEmpty
                              ? '—'
                              : '${data[header]}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ))),
                ]);
              }).toList(),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _invalidCorrectionPanel() {
    final rows = List.from(validation?['invalidRows'] ?? []);
    if (rows.isEmpty) return const SizedBox.shrink();
    return Panel(
      title: 'गलत रिकॉर्ड ठीक करें',
      child: Column(
        children: rows.map((raw) {
          final row = Map<String, dynamic>.from(raw);
          return ListTile(
            title: Text('पंक्ति ${row['row']} • ${row['name'] ?? '-'}'),
            subtitle: Text(
                'EPIC: ${row['voterId'] ?? '-'} • क्षेत्र: ${row['areaName'] ?? '-'} • पद: ${row['organizationPost'] ?? '-'}'),
            trailing: OutlinedButton(
                onPressed: () => _correctRow(row),
                child: const Text('ठीक करें')),
          );
        }).toList(),
      ),
    );
  }

  Future<void> _correctRow(Map<String, dynamic> row) async {
    final epic = TextEditingController(text: '${row['voterId'] ?? ''}');
    final area = TextEditingController(text: '${row['areaName'] ?? ''}');
    final post =
        TextEditingController(text: '${row['organizationPost'] ?? ''}');
    final mobile = TextEditingController(text: '${row['mobile'] ?? ''}');
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('पंक्ति ${row['row']} में सुधार'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: epic,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'EPIC')),
          TextField(
              controller: mobile,
              decoration: const InputDecoration(labelText: 'मोबाइल')),
          TextField(
              controller: area,
              decoration: const InputDecoration(
                  labelText: 'क्षेत्र / पंचायत / नगरपालिका')),
          TextField(
              controller: post,
              decoration: const InputDecoration(labelText: 'संगठन का पद')),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('रद्द करें')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('सहेजें')),
        ],
      ),
    );
    if (save != true) return;
    corrections['${row['row']}'] = {
      'voterId': epic.text.trim(),
      'mobile': mobile.text.trim(),
      'areaName': area.text.trim(),
      'organizationPost': post.text.trim(),
    };
    await validate();
  }

  Future<bool?> _confirmFinalImport() {
    final data = validation ?? {};
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Final import confirm करें'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text(
              'क्या आप selected ward/booth और current column mapping के साथ records import करना चाहते हैं?'),
          const SizedBox(height: 14),
          _confirmRow('कुल रिकॉर्ड', data['total']),
          _confirmRow('नए मतदाता', data['creates']),
          _confirmRow('अपडेट होंगे', data['updates']),
          _confirmRow('Review / गलत EPIC', data['invalidEpic']),
          _confirmRow(
              'Duplicate मिले',
              _asInt(data['fileDuplicates']) +
                  _asInt(data['mobileDuplicates'])),
        ]),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.check_rounded),
            label: const Text('हाँ, Import करें'),
          ),
        ],
      ),
    );
  }

  Widget _confirmRow(String label, dynamic value) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(children: [
          Expanded(child: Text(label)),
          Text('${value ?? 0}',
              style: const TextStyle(fontWeight: FontWeight.w900)),
        ]),
      );

  Widget _sectionHeader({
    required IconData icon,
    required String title,
    required String subtitle,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: blue.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: blue),
          ),
          const SizedBox(width: 10),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w900)),
              Text(subtitle, style: TextStyle(color: Colors.grey.shade700)),
            ]),
          ),
        ]),
      );

  List<_PickerOption> _locationOptions(List<dynamic> items) =>
      items.map((item) {
        final data = Map<String, dynamic>.from(item);
        final number = '${data['number'] ?? ''}'.trim();
        final name = '${data['name'] ?? ''}'.trim();
        return _PickerOption(
          id: '${data['_id']}',
          title: [number, name].where((part) => part.isNotEmpty).join(' - '),
          subtitle: '${data['wardNumber'] ?? data['areaName'] ?? ''}'.trim(),
        );
      }).toList();

  int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  Widget _metric(String label, dynamic value, IconData icon, Color color) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .08),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: color.withValues(alpha: .18)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${value ?? 0}',
                style: TextStyle(fontWeight: FontWeight.w900, color: color)),
            Text(label,
                style:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          ]),
        ]),
      );
}

class _MappingRow extends StatelessWidget {
  const _MappingRow({
    required this.header,
    required this.value,
    required this.targets,
    required this.onChanged,
  });

  final String header;
  final String value;
  final List<String> targets;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.withValues(alpha: .18)),
        ),
        child: Row(children: [
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(header, style: const TextStyle(fontWeight: FontWeight.w900)),
              Text('Excel column',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ]),
          ),
          const Icon(Icons.arrow_forward_rounded, color: Colors.grey),
          const SizedBox(width: 10),
          Expanded(
            child: DropdownButtonFormField<String>(
              initialValue: value,
              decoration: const InputDecoration(labelText: 'Voter field'),
              items: [
                const DropdownMenuItem(value: '', child: Text('छोड़ें')),
                ...targets.map((target) =>
                    DropdownMenuItem(value: target, child: Text(target))),
              ],
              onChanged: onChanged,
            ),
          ),
        ]),
      );
}

class _PickerOption {
  const _PickerOption({
    required this.id,
    required this.title,
    this.subtitle = '',
  });

  final String id;
  final String title;
  final String subtitle;
}

class _SearchablePickerField extends StatelessWidget {
  const _SearchablePickerField({
    required this.label,
    required this.icon,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final String label;
  final IconData icon;
  final String? value;
  final List<_PickerOption> options;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final selected = options.cast<_PickerOption?>().firstWhere(
          (option) => option?.id == value,
          orElse: () => null,
        );
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () async {
        final picked = await showModalBottomSheet<String>(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          builder: (context) => _SearchablePickerSheet(
            label: label,
            options: options,
            selectedId: value,
          ),
        );
        if (picked != null) onChanged(picked);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          suffixIcon: const Icon(Icons.search_rounded),
        ),
        child: Text(
          selected?.title ?? 'Search करके चुनें',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: selected == null ? Colors.grey.shade600 : null,
          ),
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}

class _SearchablePickerSheet extends StatefulWidget {
  const _SearchablePickerSheet({
    required this.label,
    required this.options,
    this.selectedId,
  });

  final String label;
  final List<_PickerOption> options;
  final String? selectedId;

  @override
  State<_SearchablePickerSheet> createState() => _SearchablePickerSheetState();
}

class _SearchablePickerSheetState extends State<_SearchablePickerSheet> {
  String query = '';

  @override
  Widget build(BuildContext context) {
    final normalized = query.trim().toLowerCase();
    final filtered = widget.options.where((option) {
      final text = '${option.title} ${option.subtitle}'.toLowerCase();
      return normalized.isEmpty || text.contains(normalized);
    }).toList();
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            Expanded(
              child: Text(widget.label,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w900)),
            ),
            IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close_rounded),
            ),
          ]),
          TextField(
            autofocus: true,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search_rounded),
              hintText: 'नाम, नंबर या booth search करें...',
            ),
            onChanged: (value) => setState(() => query = value),
          ),
          const SizedBox(height: 12),
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final option = filtered[index];
                final selected = option.id == widget.selectedId;
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor:
                        selected ? blue : blue.withValues(alpha: .08),
                    child: Icon(
                      selected
                          ? Icons.check_rounded
                          : Icons.location_on_rounded,
                      color: selected ? Colors.white : blue,
                    ),
                  ),
                  title: Text(option.title,
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle:
                      option.subtitle.isEmpty ? null : Text(option.subtitle),
                  onTap: () => Navigator.pop(context, option.id),
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}
