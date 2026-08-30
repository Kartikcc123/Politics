import 'dart:convert';

import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';
import '../../widgets/voter_phonebook.dart';
import '../voters/voter_management_page.dart';

class BoothPage extends StatefulWidget {
  const BoothPage({super.key});

  @override
  State<BoothPage> createState() => _BoothPageState();
}

bool _isMappedBooth(Map<String, dynamic> booth) {
  final memberCount = (booth['memberCount'] as num?)?.toInt() ?? 0;
  final hierarchy = booth['voterHierarchy'] as List? ?? const [];
  final locations = booth['locationNames'] as List? ?? const [];
  return memberCount > 0 || hierarchy.isNotEmpty || locations.isNotEmpty;
}

class _BoothPageState extends State<BoothPage> {
  final search = TextEditingController();

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBlock<List<dynamic>>(
        load: () => api.list('/api/booths'),
        builder: (items) => FutureBlock<List<dynamic>>(
          load: () => api.list('/api/auth/users'),
          builder: (usersRaw) {
            final booths = items
                .whereType<Map>()
                .map((item) => Map<String, dynamic>.from(item))
                .where(_isMappedBooth)
                .toList();
            final boothIds = booths.map((booth) => '${booth['_id']}').toSet();
            final managers = usersRaw
                .whereType<Map>()
                .map((item) => Map<String, dynamic>.from(item))
                .where((user) =>
                    user['role'] == 'booth' &&
                    user['active'] != false &&
                    boothIds.contains(_assignedBoothId(user)))
                .toList();
            final query = search.text.toLowerCase().trim();
            final filtered = booths.where((booth) {
              final ward =
                  booth['ward'] is Map ? booth['ward'] as Map : const {};
              final haystack =
                  '${booth['number'] ?? ''} ${booth['name'] ?? ''} ${booth['area'] ?? ''} ${booth['address'] ?? ''} ${ward['number'] ?? ''}'
                      .toLowerCase();
              return query.isEmpty || haystack.contains(query);
            }).toList();
            final activeManagers =
                managers.where((user) => user['active'] != false).length;
            final voterCount = managers.fold<int>(
                0, (sum, user) => sum + _boothStat(user, 'boothVoterCount'));
            final compact = MediaQuery.sizeOf(context).width < 600;
            return AppPage(children: [
              if (compact)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: softBlue,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xffcfe0fb)),
                  ),
                  child: Row(children: [
                    const CircleAvatar(
                      radius: 24,
                      backgroundColor: blue,
                      foregroundColor: Colors.white,
                      child: Icon(Icons.how_to_vote_rounded),
                    ),
                    const SizedBox(width: 11),
                    const Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('बूथ प्रबंधन',
                                style: TextStyle(
                                    color: navy,
                                    fontSize: 19,
                                    fontWeight: FontWeight.w900)),
                            Text('बूथ, manager और voter mapping',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: muted, fontSize: 12)),
                          ]),
                    ),
                    IconButton.filled(
                      tooltip: 'नया बूथ',
                      onPressed: () => _openForm(),
                      icon: const Icon(Icons.add_rounded),
                    ),
                  ]),
                )
              else
                PremiumFeatureHero(
                  title: 'बूथ प्रबंधन',
                  subtitle:
                      'बूथ की जानकारी, ward mapping और address एक जगह संभालें।',
                  icon: Icons.how_to_vote_rounded,
                  badges: const ['Ward linked', 'Organized', 'Secure'],
                  action: FilledButton.icon(
                    onPressed: () => _openForm(),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('नया बूथ'),
                  ),
                ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(children: [
                  _BoothMetric('कुल बूथ', booths.length,
                      Icons.how_to_vote_rounded, blue),
                  const SizedBox(width: 8),
                  _BoothMetric('Active manager', activeManagers,
                      Icons.verified_user_rounded, green),
                  const SizedBox(width: 8),
                  _BoothMetric('Mapped voters', voterCount,
                      Icons.groups_rounded, purple),
                ]),
              ),
              const SizedBox(height: 4),
              TextField(
                controller: search,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'बूथ नंबर, नाम, वार्ड या क्षेत्र खोजें...',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: search.text.isEmpty
                      ? null
                      : IconButton(
                          tooltip: 'Search साफ करें',
                          onPressed: () {
                            search.clear();
                            setState(() {});
                          },
                          icon: const Icon(Icons.close_rounded),
                        ),
                ),
              ),
              PremiumSectionTitle(
                title: 'सभी बूथ (${filtered.length}/${booths.length})',
                subtitle: 'संपादित करने के लिए card पर tap करें',
                icon: Icons.location_city_rounded,
              ),
              if (booths.isEmpty)
                PremiumEmptyState(
                  icon: Icons.how_to_vote_outlined,
                  title: 'अभी कोई बूथ नहीं है',
                  subtitle: 'पहला बूथ जोड़कर प्रबंधन शुरू करें',
                  action: FilledButton.icon(
                    onPressed: () => _openForm(),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('बूथ जोड़ें'),
                  ),
                )
              else if (query.isEmpty)
                _BoothHierarchyDirectory(
                    booths: booths, onOpen: _openHierarchyVoters)
              else
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: filtered.asMap().entries.map((entry) {
                    final booth = entry.value;
                    final boothIndex = entry.key;
                    final groupLabel = _boothGroupLabel(booth);
                    final showGroup = boothIndex == 0 ||
                        _boothGroupLabel(filtered[boothIndex - 1]) !=
                            groupLabel;
                    final ward =
                        booth['ward'] is Map ? booth['ward'] as Map : const {};
                    final assigned = managers
                        .where((user) =>
                            _assignedBoothId(user) == '${booth['_id']}')
                        .toList();
                    final active =
                        assigned.where((u) => u['active'] != false).length;
                    final rawBoothName = '${booth['name'] ?? ''}'.trim();
                    final boothName =
                        rawBoothName.isEmpty || rawBoothName == '-'
                            ? ('${booth['area'] ?? booth['address'] ?? ''}'
                                    .trim()
                                    .isEmpty
                                ? 'Booth ${booth['number'] ?? '-'}'
                                : '${booth['area'] ?? booth['address']}')
                            : rawBoothName;
                    final voters = assigned.fold<int>(
                        0,
                        (sum, user) =>
                            sum + _boothStat(user, 'boothVoterCount'));
                    return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (showGroup) _BoothGroupHeader(label: groupLabel),
                          InkWell(
                            onTap: () => _openForm(booth),
                            borderRadius: BorderRadius.circular(22),
                            child: Container(
                              width: 360,
                              padding: const EdgeInsets.all(15),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(22),
                                border: Border.all(color: border),
                                boxShadow: const [
                                  BoxShadow(
                                      color: Color(0x0c071b4b),
                                      blurRadius: 16,
                                      offset: Offset(0, 8)),
                                ],
                              ),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(children: [
                                      Container(
                                        width: 52,
                                        height: 52,
                                        decoration: BoxDecoration(
                                            color: softBlue,
                                            borderRadius:
                                                BorderRadius.circular(18)),
                                        child: const Icon(
                                            Icons.how_to_vote_rounded,
                                            color: blue),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(' ${booth['number'] ?? '-'}',
                                                  style: const TextStyle(
                                                      color: navy,
                                                      fontSize: 17,
                                                      fontWeight:
                                                          FontWeight.w900)),
                                              Text(boothName,
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                      color: muted,
                                                      fontWeight:
                                                          FontWeight.w700)),
                                            ]),
                                      ),
                                      Chip(
                                        avatar: Icon(
                                            assigned.isEmpty
                                                ? Icons.warning_amber_rounded
                                                : Icons.verified_rounded,
                                            color: assigned.isEmpty
                                                ? orange
                                                : green,
                                            size: 16),
                                        label: Text(assigned.isEmpty
                                            ? 'Manager '
                                            : '$active active'),
                                      ),
                                    ]),
                                    const SizedBox(height: 12),
                                    Text(
                                      [
                                        if ('${ward['number'] ?? ''}'
                                            .isNotEmpty)
                                          'वार्ड ${ward['number']}',
                                        '${booth['area'] ?? ''}',
                                        '${booth['address'] ?? ''}',
                                      ]
                                          .where((value) =>
                                              value.trim().isNotEmpty)
                                          .join(' · '),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          color: muted, fontSize: 12),
                                    ),
                                    const SizedBox(height: 12),
                                    Wrap(spacing: 8, runSpacing: 8, children: [
                                      _BoothPill(
                                          Icons.supervisor_account_rounded,
                                          '${assigned.length} manager'),
                                      _BoothPill(Icons.groups_rounded,
                                          '$voters voters'),
                                      _BoothPill(Icons.edit_rounded, 'Edit'),
                                      if (api.user?['role'] == 'admin')
                                        OutlinedButton.icon(
                                          onPressed: () => _deleteBooth(booth),
                                          icon: const Icon(
                                              Icons.delete_outline_rounded,
                                              size: 16,
                                              color: Colors.red),
                                          label: const Text('Delete',
                                              style:
                                                  TextStyle(color: Colors.red)),
                                          style: OutlinedButton.styleFrom(
                                              visualDensity:
                                                  VisualDensity.compact,
                                              side: const BorderSide(
                                                  color: Color(0x33ef4444)),
                                              shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          20))),
                                        ),
                                    ]),
                                  ]),
                            ),
                          ),
                        ]);
                  }).toList(),
                ),
            ]);
          },
        ),
      );

  Future<void> _openHierarchyVoters(Map<String, dynamic> node) async {
    final sectionNames =
        (node['sectionNames'] as List? ?? [node['sectionName']])
            .map((value) => '$value'.trim())
            .where((value) => value.isNotEmpty)
            .toList();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
              '${node['village'] ?? '-'} · अनुभाग ${node['sectionNumber'] ?? ''}'),
          const SizedBox(height: 3),
          Text('${node['sectionName'] ?? '-'}',
              style: const TextStyle(color: muted, fontSize: 14)),
        ]),
        content: SizedBox(
          width: 620,
          height: MediaQuery.sizeOf(dialogContext).height * .68,
          child: FutureBuilder<Map<String, dynamic>>(
            future: api.getQuery('/api/members', {
              'assemblyName': '${node['assemblyName'] ?? ''}',
              'village': '${node['village'] ?? ''}',
              'sectionNames': jsonEncode(sectionNames),
              'paged': 'true',
              'page': '1',
              'limit': '200',
            }),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Center(
                    child: Text('${snapshot.error}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red)));
              }
              final voters = List<Map<String, dynamic>>.from(
                (snapshot.data?['items'] as List? ?? const [])
                    .whereType<Map>()
                    .map((item) => Map<String, dynamic>.from(item)),
              );
              if (voters.isEmpty) {
                return const Center(
                    child: Text('इस अनुभाग में मतदाता नहीं मिले।'));
              }
              return ListView.separated(
                itemCount: voters.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, index) {
                  final voter = voters[index];
                  return ListTile(
                    leading: VoterAvatar(voter: voter, size: 48),
                    title: Text('${voter['name'] ?? '-'}',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text([
                      if ('${voter['guardianName'] ?? ''}'.trim().isNotEmpty)
                        'पिता/पति: ${voter['guardianName']}',
                      if ('${voter['voterId'] ?? ''}'.trim().isNotEmpty)
                        'EPIC: ${voter['voterId']}',
                    ].join(' · ')),
                    trailing: Text('${voter['houseNumber'] ?? ''}'),
                    onTap: () => Navigator.push(
                      dialogContext,
                      MaterialPageRoute(
                        builder: (_) => VoterDetailPage(
                          voter: voter,
                          onChanged: () {},
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('बंद करें'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteBooth(Map<String, dynamic> booth) async {
    final id = '${booth['_id'] ?? ''}';
    if (id.isEmpty) return;
    final label = '${booth['name'] ?? ''}'.trim().isNotEmpty
        ? '${booth['name']}'
        : 'Booth ${booth['number'] ?? '-'}';
    final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
              title: const Text('Delete booth?'),
              content: Text(
                  'Delete "$label"? Assigned managers and voters will no longer be linked to this booth.'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(dialogContext, false),
                    child: const Text('Cancel')),
                FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () => Navigator.pop(dialogContext, true),
                    child: const Text('Delete')),
              ],
            ));
    if (confirmed != true || !mounted) return;
    try {
      await api.delete('/api/booths/$id');
      if (mounted) {
        setState(() {});
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Booth deleted')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', ''))));
      }
    }
  }

  Future<void> _openForm([Map<String, dynamic>? booth]) async {
    final name = TextEditingController(text: '${booth?['name'] ?? ''}');
    final number = TextEditingController(text: '${booth?['number'] ?? ''}');
    final ward = TextEditingController(
        text: booth?['ward'] is Map ? '${booth!['ward']['number'] ?? ''}' : '');
    final area = TextEditingController(text: '${booth?['area'] ?? ''}');
    final address = TextEditingController(text: '${booth?['address'] ?? ''}');
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(children: [
          const CircleAvatar(
            backgroundColor: softBlue,
            child: Icon(Icons.how_to_vote_rounded, color: blue),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(booth == null ? '  ' : 'बूथ संपादित करें',
                style: const TextStyle(fontWeight: FontWeight.w900)),
          ),
        ]),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
                controller: number,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'बूथ संख्या *',
                    prefixIcon: Icon(Icons.confirmation_number_rounded),
                    helperText: 'जैसे 79, 80, 81')),
            const SizedBox(height: 10),
            TextField(
                controller: name,
                decoration: const InputDecoration(
                    labelText: 'अनुभाग / गाँव नाम *',
                    prefixIcon: Icon(Icons.home_work_rounded),
                    helperText: 'PDF में आया अनुभाग या गाँव नाम')),
            const SizedBox(height: 10),
            TextField(
                controller: ward,
                decoration: const InputDecoration(
                    labelText: 'वार्ड संख्या / नाम *',
                    prefixIcon: Icon(Icons.map_rounded))),
            const SizedBox(height: 10),
            TextField(
                controller: area,
                decoration: const InputDecoration(
                    labelText: 'गाँव / क्षेत्र',
                    prefixIcon: Icon(Icons.location_city_rounded))),
            const SizedBox(height: 10),
            TextField(
                controller: address,
                maxLines: 2,
                decoration: const InputDecoration(
                    labelText: 'पूरा पता',
                    prefixIcon: Icon(Icons.location_on_rounded))),
          ]),
        ),
        actions: [
          if (booth != null)
            TextButton.icon(
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              onPressed: () async {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (dialogContext) => AlertDialog(
                    title: const Text('बूथ हटाएँ?'),
                    content: const Text(
                        'इस बूथ की mapping हट जाएगी। जुड़े voters को पहले दूसरे बूथ में assign करें।'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(dialogContext, false),
                          child: const Text('रद्द करें')),
                      FilledButton(
                        style:
                            FilledButton.styleFrom(backgroundColor: Colors.red),
                        onPressed: () => Navigator.pop(dialogContext, true),
                        child: const Text('हटाएँ'),
                      ),
                    ],
                  ),
                );
                if (ok != true) return;
                try {
                  await api.delete('/api/booths/${booth['_id']}');
                  if (context.mounted) Navigator.pop(context, true);
                } catch (error) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(error
                              .toString()
                              .replaceFirst('Exception: ', ''))),
                    );
                  }
                }
              },
              icon: const Icon(Icons.delete_outline_rounded),
              label: const Text('बूथ हटाएँ'),
            ),
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
    try {
      final body = {
        'number': number.text.trim(),
        'name': name.text.trim(),
        'ward': ward.text.trim(),
        'area': area.text.trim(),
        'address': address.text.trim(),
      };
      if (booth == null) {
        await api.post('/api/booths', body);
      } else {
        await api.put('/api/booths/${booth['_id']}', body);
      }
      if (mounted) setState(() {});
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', ''))));
      }
    } finally {
      name.dispose();
      number.dispose();
      ward.dispose();
      area.dispose();
      address.dispose();
    }
  }
}

class _BoothHierarchyDirectory extends StatefulWidget {
  const _BoothHierarchyDirectory({required this.booths, required this.onOpen});
  final List<Map<String, dynamic>> booths;
  final Future<void> Function(Map<String, dynamic> node) onOpen;

  @override
  State<_BoothHierarchyDirectory> createState() =>
      _BoothHierarchyDirectoryState();
}

class _BoothHierarchyDirectoryState extends State<_BoothHierarchyDirectory> {
  String? assembly;
  String? village;

  List<Map<String, dynamic>> get nodes => widget.booths
      .expand((booth) => (booth['voterHierarchy'] as List? ?? const []))
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .where((item) =>
          '${item['assemblyName'] ?? ''}'.trim().isNotEmpty &&
          '${item['village'] ?? ''}'.trim().isNotEmpty &&
          '${item['sectionName'] ?? ''}'.trim().isNotEmpty)
      .toList();

  @override
  Widget build(BuildContext context) {
    if (assembly == null) {
      final assemblies = nodes
          .map((item) => '${item['assemblyName']}')
          .toSet()
          .toList()
        ..sort();
      return _level(
        'विधानसभा चुनें',
        Icons.account_balance_rounded,
        assemblies.map((value) => _DirectoryOption(value, '')).toList(),
        (value) => setState(() => assembly = value),
      );
    }

    final assemblyNodes =
        nodes.where((item) => '${item['assemblyName']}' == assembly).toList();
    if (village == null) {
      final villages = assemblyNodes
          .map((item) => '${item['village']}')
          .toSet()
          .toList()
        ..sort();
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _back('विधानसभा: $assembly', () => setState(() => assembly = null)),
        _level(
          'गाँव चुनें',
          Icons.location_city_rounded,
          villages.map((value) {
            final count = assemblyNodes
                .where((item) => '${item['village']}' == value)
                .fold<int>(
                    0,
                    (sum, item) =>
                        sum + ((item['count'] as num?)?.toInt() ?? 0));
            return _DirectoryOption(value, '$count मतदाता');
          }).toList(),
          (value) => setState(() => village = value),
        ),
      ]);
    }

    final sectionMap = <String, Map<String, dynamic>>{};
    for (final item
        in assemblyNodes.where((item) => '${item['village']}' == village)) {
      final name = '${item['sectionName']}';
      final existing = sectionMap[name];
      if (existing == null) {
        sectionMap[name] = {...item};
      } else {
        existing['count'] = ((existing['count'] as num?)?.toInt() ?? 0) +
            ((item['count'] as num?)?.toInt() ?? 0);
      }
    }
    final sections = sectionMap.values.toList()
      ..sort((a, b) => '${a['sectionName']}'.compareTo('${b['sectionName']}'));
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _back('विधानसभा: $assembly · गाँव: $village',
          () => setState(() => village = null)),
      _level(
        'अनुभाग / मोहल्ला चुनें',
        Icons.view_list_rounded,
        sections
            .map((item) => _DirectoryOption(
                  '${item['sectionName']}',
                  '${item['count'] ?? 0} मतदाता',
                  data: item,
                ))
            .toList(),
        (value) => widget.onOpen(sectionMap[value]!),
      ),
    ]);
  }

  Widget _back(String label, VoidCallback onTap) => Align(
      alignment: Alignment.centerLeft,
      child: TextButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.arrow_back_rounded),
          label: Text(label)));

  Widget _level(String title, IconData icon, List<_DirectoryOption> values,
          ValueChanged<String> onTap) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(title,
                style: const TextStyle(
                    color: navy, fontSize: 16, fontWeight: FontWeight.w900))),
        if (values.isEmpty)
          const Padding(
            padding: EdgeInsets.all(18),
            child: Text('इस स्तर पर कोई mapped data नहीं मिला।'),
          ),
        ...values.map((option) => Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
                leading: Icon(icon, color: blue),
                title: Text(option.label,
                    style: const TextStyle(
                        color: navy, fontWeight: FontWeight.w800)),
                subtitle:
                    option.subtitle.isEmpty ? null : Text(option.subtitle),
                trailing: const Icon(Icons.chevron_right_rounded, color: blue),
                onTap: () => onTap(option.label))))
      ]);
}

class _DirectoryOption {
  const _DirectoryOption(this.label, this.subtitle, {this.data});
  final String label;
  final String subtitle;
  final Map<String, dynamic>? data;
}

class _BoothMetric extends StatelessWidget {
  const _BoothMetric(this.label, this.value, this.icon, this.color);
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        width: 160,
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: border),
        ),
        child: Row(children: [
          CircleAvatar(
            backgroundColor: color.withValues(alpha: .10),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$value',
                style: const TextStyle(
                    color: navy, fontSize: 20, fontWeight: FontWeight.w900)),
            Text(label,
                style: const TextStyle(
                    color: muted, fontSize: 12, fontWeight: FontWeight.w700)),
          ]),
        ]),
      );
}

class _BoothPill extends StatelessWidget {
  const _BoothPill(this.icon, this.label);
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xfff7f9ff),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: blue, size: 14),
          const SizedBox(width: 5),
          Text(label,
              style: const TextStyle(
                  color: navy, fontSize: 11, fontWeight: FontWeight.w800)),
        ]),
      );
}

String _boothGroupLabel(Map<String, dynamic> booth) {
  final ward = booth['ward'] is Map ? booth['ward'] as Map : const {};
  final assembly = '${ward['name'] ?? ward['number'] ?? ''}'.trim();
  final village = '${booth['area'] ?? booth['address'] ?? ''}'.trim();
  return [if (assembly.isNotEmpty) assembly, if (village.isNotEmpty) village]
      .join(' ? ');
}

class _BoothGroupHeader extends StatelessWidget {
  const _BoothGroupHeader({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 2),
        child: Row(children: [
          const Icon(Icons.folder_rounded, color: blue, size: 20),
          const SizedBox(width: 8),
          Expanded(
              child: Text(label.isEmpty ? 'Unmapped location' : label,
                  style: const TextStyle(
                      color: navy, fontSize: 15, fontWeight: FontWeight.w900))),
        ]),
      );
}

String _assignedBoothId(Map<String, dynamic> user) {
  final booth = user['assignedBooth'];
  if (booth is Map) return '${booth['_id'] ?? ''}';
  return '${booth ?? ''}';
}

int _boothStat(Map<String, dynamic> user, String key) {
  final value = (user['workStats'] as Map?)?[key];
  return value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}
