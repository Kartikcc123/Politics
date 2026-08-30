import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/print_helper.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';

class FamilyPage extends StatefulWidget {
  const FamilyPage({super.key});

  @override
  State<FamilyPage> createState() => _FamilyPageState();
}

class _FamilyPageState extends State<FamilyPage> {
  final search = TextEditingController();
  void refresh() => setState(() {});

  @override
  Widget build(BuildContext context) => AppPage(children: [
        PageHeading(
          title: 'परिवार प्रबंधन',
          subtitle: 'परिवारों की सूची और जानकारी',
          action: FilledButton.icon(
            onPressed: () => showDialog(
              context: context,
              builder: (_) => FamilyForm(onSaved: refresh),
            ),
            icon: const Icon(Icons.add),
            label: const Text('नया परिवार जोड़ें'),
          ),
        ),
        Wrap(spacing: 12, runSpacing: 12, children: [
          SizedBox(
            width: 360,
            child: TextField(
              controller: search,
              onChanged: (_) => refresh(),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                labelText: 'परिवार प्रमुख, घर संख्या या पता खोजें',
              ),
            ),
          ),
          OutlinedButton.icon(
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (dialogContext) => AlertDialog(
                  icon: const Icon(Icons.family_restroom_rounded,
                      color: Colors.orange, size: 42),
                  title: const Text('परिवार दोबारा बनाएँ?'),
                  content: const Text(
                    'पहले से saved सभी परिवार हट जाएंगे। नई voter list में एक ही बूथ, अनुभाग और घर संख्या वाले मतदाताओं का परिवार बनेगा और सबसे अधिक उम्र वाला सदस्य मुखिया होगा।',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(dialogContext, false),
                      child: const Text('रद्द करें'),
                    ),
                    FilledButton.icon(
                      onPressed: () => Navigator.pop(dialogContext, true),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('हटाकर बनाएँ'),
                    ),
                  ],
                ),
              );
              if (confirmed != true) return;
              final result = await api.post('/api/families/rebuild', {});
              refresh();
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text(
                  '${result['families'] ?? 0} नए परिवार बने। '
                  '${result['assignedMembers'] ?? 0} मतदाता जोड़े गए और '
                  '${result['skippedMissingHouse'] ?? 0} मतदाताओं की घर संख्या खाली है।',
                ),
              ));
            },
            icon: const Icon(Icons.refresh),
            label: const Text('मतदाताओं से परिवार बनाएं'),
          ),
        ]),
        FutureBlock<Map<String, dynamic>>(
          load: () => api.get('/api/families/summary'),
          builder: (summary) => SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              SizedBox(
                  width: 155,
                  child: MetricCard(
                      label: 'कुल परिवार',
                      value: '${summary['totalFamilies'] ?? 0}',
                      icon: Icons.groups,
                      color: blue)),
              const SizedBox(width: 8),
              SizedBox(
                  width: 155,
                  child: MetricCard(
                      label: 'कुल घर',
                      value: '${summary['totalHomes'] ?? 0}',
                      icon: Icons.home,
                      color: green)),
              const SizedBox(width: 8),
              SizedBox(
                  width: 155,
                  child: MetricCard(
                      label: 'परिवार सदस्य',
                      value: '${summary['totalMembers'] ?? 0}',
                      icon: Icons.group,
                      color: purple)),
              const SizedBox(width: 8),
              SizedBox(
                  width: 170,
                  child: MetricCard(
                      label: 'Review आवश्यक',
                      value: '${summary['unassignedVoters'] ?? 0}',
                      icon: Icons.rule_folder_outlined,
                      color: Colors.orange,
                      caption:
                          'घर संख्या खाली: ${summary['missingHouseNumber'] ?? 0}')),
            ]),
          ),
        ),
        FutureBlock<List<dynamic>>(
          load: () => api.list('/api/families', {'q': search.text}),
          builder: (families) => SectionCard(
            title: 'परिवार सूची (${families.length})',
            child: Column(
              children: families
                  .map(
                    (family) => Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                            child: Icon(Icons.home_outlined)),
                        title: Text(
                            '${family['headName'] ?? family['familyHead']?['name'] ?? '-'}'),
                        subtitle: Text(
                          'घर: ${family['houseNumber'] ?? '-'} | सदस्य: ${(family['members'] as List? ?? []).length}\n${family['address'] ?? ''}',
                        ),
                        isThreeLine: true,
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => FamilyDetailDialog(
                            family: Map<String, dynamic>.from(family),
                            onChanged: refresh,
                          ),
                        ),
                        trailing: IconButton(
                          tooltip: 'परिवार प्रिंट',
                          onPressed: () => printApiPdf(
                            context,
                            path: '/api/export/members.profiles.pdf',
                            jobName: 'परिवार ${family['houseNumber'] ?? ''}',
                            query: {
                              'ids': (family['members'] as List? ?? [])
                                  .map((m) => '${m['_id'] ?? m}')
                                  .join(','),
                            },
                          ),
                          icon: const Icon(Icons.print),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        ),
      ]);
}

class FamilyDetailDialog extends StatelessWidget {
  const FamilyDetailDialog(
      {super.key, required this.family, required this.onChanged});
  final Map<String, dynamic> family;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final members = family['members'] as List? ?? [];
    return AlertDialog(
      title: Text('${family['headName'] ?? 'परिवार विवरण'}'),
      content: SizedBox(
        width: 720,
        child: SingleChildScrollView(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('घर संख्या: ${family['houseNumber'] ?? '-'}'),
            Text('पता: ${family['address'] ?? '-'}'),
            Text('राजनीतिक स्थिति: ${family['politicalStatus'] ?? '-'}'),
            Text('टिप्पणी: ${family['remarks'] ?? '-'}'),
            const Divider(height: 28),
            const Text('परिवार सदस्य',
                style: TextStyle(fontWeight: FontWeight.w900)),
            ...members.map(
              (m) => ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person)),
                title: Text('${m['name'] ?? '-'}'),
                subtitle:
                    Text('${m['guardianName'] ?? ''} | ${m['mobile'] ?? ''}'),
              ),
            ),
          ]),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () async {
            await api.delete('/api/families/${family['_id']}');
            onChanged();
            if (context.mounted) Navigator.pop(context);
          },
          child: const Text('हटाएं', style: TextStyle(color: Colors.red)),
        ),
        OutlinedButton.icon(
          onPressed: () => showDialog(
            context: context,
            builder: (_) => FamilyForm(family: family, onSaved: onChanged),
          ),
          icon: const Icon(Icons.edit),
          label: const Text('संपादित करें'),
        ),
        FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('बंद करें')),
      ],
    );
  }
}

class FamilyForm extends StatefulWidget {
  const FamilyForm({super.key, this.family, required this.onSaved});
  final Map<String, dynamic>? family;
  final VoidCallback onSaved;

  @override
  State<FamilyForm> createState() => _FamilyFormState();
}

class _FamilyFormState extends State<FamilyForm> {
  late final headName =
      TextEditingController(text: widget.family?['headName'] ?? '');
  late final houseNumber =
      TextEditingController(text: widget.family?['houseNumber'] ?? '');
  late final address =
      TextEditingController(text: widget.family?['address'] ?? '');
  late final remarks =
      TextEditingController(text: widget.family?['remarks'] ?? '');
  String politicalStatus = 'undecided';
  String? boothId;
  String? wardId;
  final selectedMembers = <String>{};

  @override
  void initState() {
    super.initState();
    politicalStatus = widget.family?['politicalStatus'] ?? 'undecided';
    boothId = widget.family?['booth']?['_id'] ?? widget.family?['booth'];
    wardId = widget.family?['ward']?['_id'] ?? widget.family?['ward'];
    selectedMembers.addAll(
      (widget.family?['members'] as List? ?? []).map((m) => '${m['_id'] ?? m}'),
    );
  }

  Future<void> save() async {
    final members = await api.list('/api/members');
    final head = members
        .cast<Map>()
        .where((m) => selectedMembers.contains('${m['_id']}'))
        .firstOrNull;
    final body = {
      'headName': headName.text.trim(),
      'houseNumber': houseNumber.text.trim(),
      'address': address.text.trim(),
      'remarks': remarks.text.trim(),
      'politicalStatus': politicalStatus,
      'ward': wardId,
      'booth': boothId,
      'members': selectedMembers.toList(),
      if (head != null) 'familyHead': head['_id'],
    };
    if (widget.family == null) {
      await api.post('/api/families', body);
    } else {
      await api.put('/api/families/${widget.family!['_id']}', body);
    }
    widget.onSaved();
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: Text(
            widget.family == null ? 'परिवार जोड़ें' : 'परिवार संपादित करें'),
        content: SizedBox(
          width: 760,
          child: SingleChildScrollView(
            child: Column(children: [
              Wrap(spacing: 12, runSpacing: 12, children: [
                field(headName, 'परिवार प्रमुख'),
                field(houseNumber, 'घर संख्या'),
                field(address, 'पता'),
                field(remarks, 'टिप्पणी'),
                SizedBox(
                  width: 340,
                  child: DropdownButtonFormField<String>(
                    initialValue: politicalStatus,
                    decoration:
                        const InputDecoration(labelText: 'राजनीतिक स्थिति'),
                    items: const [
                      DropdownMenuItem(
                          value: 'congress', child: Text('कांग्रेस')),
                      DropdownMenuItem(value: 'bjp', child: Text('भाजपा')),
                      DropdownMenuItem(value: 'other', child: Text('अन्य')),
                      DropdownMenuItem(value: 'neutral', child: Text('तटस्थ')),
                      DropdownMenuItem(
                          value: 'undecided', child: Text('अनिर्णीत')),
                    ],
                    onChanged: (value) =>
                        setState(() => politicalStatus = value!),
                  ),
                ),
                FutureBlock<List<dynamic>>(
                  load: () => api.list('/api/booths'),
                  builder: (booths) => SizedBox(
                    width: 340,
                    child: DropdownButtonFormField<String>(
                      initialValue: boothId,
                      decoration: const InputDecoration(labelText: 'बूथ'),
                      items: booths
                          .map((b) => DropdownMenuItem<String>(
                                value: '${b['_id']}',
                                child: Text('${b['number']} - ${b['name']}'),
                              ))
                          .toList(),
                      onChanged: (value) {
                        final booth =
                            booths.firstWhere((b) => '${b['_id']}' == value);
                        setState(() {
                          boothId = value;
                          wardId = booth['ward']?['_id'] ?? booth['ward'];
                        });
                      },
                    ),
                  ),
                ),
              ]),
              const SizedBox(height: 16),
              const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('सदस्य चुनें',
                      style: TextStyle(fontWeight: FontWeight.w900))),
              FutureBlock<List<dynamic>>(
                load: () => api.list('/api/members', {'booth': boothId}),
                builder: (members) => Column(
                  children: members
                      .map(
                        (m) => CheckboxListTile(
                          value: selectedMembers.contains('${m['_id']}'),
                          onChanged: (value) => setState(() {
                            if (value == true) {
                              selectedMembers.add('${m['_id']}');
                            } else {
                              selectedMembers.remove('${m['_id']}');
                            }
                          }),
                          title: Text('${m['name'] ?? '-'}'),
                          subtitle: Text(
                              'घर ${m['houseNumber'] ?? '-'} | ${m['mobile'] ?? ''}'),
                        ),
                      )
                      .toList(),
                ),
              ),
            ]),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('रद्द करें')),
          FilledButton.icon(
              onPressed: save,
              icon: const Icon(Icons.save),
              label: const Text('सेव करें')),
        ],
      );

  Widget field(TextEditingController controller, String label) => SizedBox(
        width: 340,
        child: TextField(
            controller: controller,
            decoration: InputDecoration(labelText: label)),
      );
}

class FamilyMembers extends StatelessWidget {
  const FamilyMembers(
      {super.key, required this.voter, required this.onChanged});
  final Map voter;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final family = List<Map>.from(voter['family'] ?? []);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: const [
          DataColumn(label: Text('नाम')),
          DataColumn(label: Text('संबंध')),
          DataColumn(label: Text('मोबाइल')),
        ],
        rows: family
            .map(
              (f) => DataRow(cells: [
                DataCell(Text('${f['name'] ?? '-'}')),
                DataCell(Text('${f['relation'] ?? '-'}')),
                DataCell(Text('${f['mobile'] ?? '-'}')),
              ]),
            )
            .toList(),
      ),
    );
  }
}

extension FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
