import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/mobile_components.dart';

class BulkLocationEditPage extends StatefulWidget {
  const BulkLocationEditPage({super.key});

  @override
  State<BulkLocationEditPage> createState() => _BulkLocationEditPageState();
}

class _BulkLocationEditPageState extends State<BulkLocationEditPage> {
  String selectedTarget = 'village'; // village, sectionName, partNumber, municipalWardNumbers
  
  final sourceTextController = TextEditingController();
  final targetTextController = TextEditingController();
  final sectionNumberController = TextEditingController();
  final partNameController = TextEditingController();

  bool loadingGroups = false;
  bool processing = false;
  List<Map<String, dynamic>> locationGroups = [];
  Map<String, dynamic>? dryRunResult;
  String statusMessage = '';

  @override
  void initState() {
    super.initState();
    _loadLocationGroups();
  }

  @override
  void dispose() {
    sourceTextController.dispose();
    targetTextController.dispose();
    sectionNumberController.dispose();
    partNameController.dispose();
    super.dispose();
  }

  Future<void> _loadLocationGroups() async {
    setState(() => loadingGroups = true);
    try {
      final res = await api.get('/api/members/location-groups');
      if (mounted) {
        setState(() {
          locationGroups = (res['items'] as List? ?? [])
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => statusMessage = 'लोकेशन लिस्ट लोड करने में त्रुटि: $e');
      }
    } finally {
      if (mounted) setState(() => loadingGroups = false);
    }
  }

  Future<void> _runDryRun() async {
    final sourceVal = sourceTextController.text.trim();
    final targetVal = targetTextController.text.trim();
    if (sourceVal.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया पुराना/वर्तमान नाम या फ़िल्टर भरें')),
      );
      return;
    }

    setState(() {
      processing = true;
      dryRunResult = null;
      statusMessage = 'पूर्वावलोकन (Dry Run) जांचा जा रहा है…';
    });

    try {
      final sourceMap = <String, String>{};
      final updatesMap = <String, String>{};

      if (selectedTarget == 'village') {
        sourceMap['village'] = sourceVal;
        if (targetVal.isNotEmpty) updatesMap['village'] = targetVal;
      } else if (selectedTarget == 'sectionName') {
        sourceMap['sectionName'] = sourceVal;
        if (targetVal.isNotEmpty) updatesMap['sectionName'] = targetVal;
        if (sectionNumberController.text.trim().isNotEmpty) {
          updatesMap['sectionNumber'] = sectionNumberController.text.trim();
        }
      } else if (selectedTarget == 'partNumber') {
        sourceMap['partNumber'] = sourceVal;
        if (targetVal.isNotEmpty) updatesMap['partNumber'] = targetVal;
        if (partNameController.text.trim().isNotEmpty) {
          updatesMap['partName'] = partNameController.text.trim();
        }
      } else if (selectedTarget == 'municipalWardNumbers') {
        sourceMap['municipalWardNumbers'] = sourceVal;
        if (targetVal.isNotEmpty) updatesMap['municipalWardNumbers'] = targetVal;
      }

      final res = await api.post('/api/members/bulk-location-correction', {
        'source': sourceMap,
        'updates': updatesMap,
        'dryRun': true,
      });

      if (mounted) {
        setState(() {
          dryRunResult = Map<String, dynamic>.from(res);
          statusMessage = 'कुल ${res['matched'] ?? 0} मतदाता इस फ़िल्टर से मिले।';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => statusMessage = 'त्रुटि: ${e.toString().replaceFirst('Exception: ', '')}');
      }
    } finally {
      if (mounted) setState(() => processing = false);
    }
  }

  Future<void> _applyBulkUpdate() async {
    final sourceVal = sourceTextController.text.trim();
    final targetVal = targetTextController.text.trim();

    if (sourceVal.isEmpty || targetVal.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया पुराना और नया नाम दोनों दर्ज करें')),
      );
      return;
    }

    final matchedCount = dryRunResult?['matched'] ?? 0;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('बल्क सुधार की पुष्टि करें'),
        content: Text(
          'क्या आप $matchedCount मतदाताओं का ${_targetTitle(selectedTarget)} बदलकर "$targetVal" करना चाहते हैं?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('रद्द करें'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: green, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('हाँ, अपडेट करें'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      processing = true;
      statusMessage = 'बल्क अपडेट लागू किया जा रहा है…';
    });

    try {
      final sourceMap = <String, String>{};
      final updatesMap = <String, String>{};

      if (selectedTarget == 'village') {
        sourceMap['village'] = sourceVal;
        updatesMap['village'] = targetVal;
      } else if (selectedTarget == 'sectionName') {
        sourceMap['sectionName'] = sourceVal;
        updatesMap['sectionName'] = targetVal;
        if (sectionNumberController.text.trim().isNotEmpty) {
          updatesMap['sectionNumber'] = sectionNumberController.text.trim();
        }
      } else if (selectedTarget == 'partNumber') {
        sourceMap['partNumber'] = sourceVal;
        updatesMap['partNumber'] = targetVal;
        if (partNameController.text.trim().isNotEmpty) {
          updatesMap['partName'] = partNameController.text.trim();
        }
      } else if (selectedTarget == 'municipalWardNumbers') {
        sourceMap['municipalWardNumbers'] = sourceVal;
        updatesMap['municipalWardNumbers'] = targetVal;
      }

      final res = await api.post('/api/members/bulk-location-correction', {
        'source': sourceMap,
        'updates': updatesMap,
        'dryRun': false,
      });

      await OfflineVoterCache.clear();
      api.notifyDataChanged();

      if (mounted) {
        setState(() {
          statusMessage =
              'सफलता! ${res['updated'] ?? 0} मतदाताओं का ${_targetTitle(selectedTarget)} सफलतापूर्वक अपडेट हो गया।';
          dryRunResult = null;
        });
        _loadLocationGroups();
      }
    } catch (e) {
      if (mounted) {
        setState(() => statusMessage = 'अपडेट करने में त्रुटि: ${e.toString().replaceFirst('Exception: ', '')}');
      }
    } finally {
      if (mounted) setState(() => processing = false);
    }
  }

  String _targetTitle(String type) {
    switch (type) {
      case 'village':
        return 'गाँव (Village)';
      case 'sectionName':
        return 'अनुभाग (Section)';
      case 'partNumber':
        return 'भाग (Part Number)';
      case 'municipalWardNumbers':
        return 'वार्ड (Ward)';
      default:
        return 'लोकेशन';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.sizeOf(context).width < 700;
    return AppPage(
      padding: EdgeInsets.fromLTRB(16, 14, 16, isMobile ? 110 : 20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xff0f766e), Color(0xff14b8a6)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(22),
            boxShadow: const [
              BoxShadow(color: Color(0x2614b8a6), blurRadius: 20, offset: Offset(0, 8)),
            ],
          ),
          child: const Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: Color(0x26ffffff),
                foregroundColor: Colors.white,
                child: Icon(Icons.edit_location_alt_rounded, size: 28),
              ),
              SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'स्थान व अनुभाग बल्क सुधार',
                      style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'गलत अनुभाग, गाँव, भाग या वार्ड के नाम एक साथ सही करें',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        const Text('सुधार का प्रकार चुनें:', style: TextStyle(color: navy, fontWeight: FontWeight.w900, fontSize: 15)),
        const SizedBox(height: 8),

        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _ChipOption(
              label: '🏡 गाँव (Village)',
              selected: selectedTarget == 'village',
              onSelected: (_) => setState(() {
                selectedTarget = 'village';
                dryRunResult = null;
              }),
            ),
            _ChipOption(
              label: '📑 अनुभाग (Section)',
              selected: selectedTarget == 'sectionName',
              onSelected: (_) => setState(() {
                selectedTarget = 'sectionName';
                dryRunResult = null;
              }),
            ),
            _ChipOption(
              label: '🔢 भाग (Part Number)',
              selected: selectedTarget == 'partNumber',
              onSelected: (_) => setState(() {
                selectedTarget = 'partNumber';
                dryRunResult = null;
              }),
            ),
            _ChipOption(
              label: '🏛️ वार्ड (Ward)',
              selected: selectedTarget == 'municipalWardNumbers',
              onSelected: (_) => setState(() {
                selectedTarget = 'municipalWardNumbers';
                dryRunResult = null;
              }),
            ),
          ],
        ),

        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '1. वर्तमान (गलत) ${_targetTitle(selectedTarget)} दर्ज करें या चुनें:',
                style: const TextStyle(color: navy, fontWeight: FontWeight.w800, fontSize: 14),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: sourceTextController,
                decoration: InputDecoration(
                  labelText: 'पुराना नाम / नंबर (उदा: गलत अनुभाग या गाँव)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
              if (locationGroups.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text('मौजूदा ग्रुप्स में से चुनें:', style: TextStyle(color: muted, fontSize: 12)),
                const SizedBox(height: 6),
                Container(
                  constraints: const BoxConstraints(maxHeight: 140),
                  child: SingleChildScrollView(
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: locationGroups.map((g) {
                        final key = g['key'] as Map? ?? {};
                        String display = '';
                        if (selectedTarget == 'village') display = key['village'] ?? '';
                        if (selectedTarget == 'sectionName') display = key['sectionName'] ?? '';
                        if (selectedTarget == 'partNumber') display = key['partNumber'] ?? '';
                        if (selectedTarget == 'municipalWardNumbers') display = key['gramPanchayat'] ?? '';
                        if (display.trim().isEmpty) return const SizedBox.shrink();
                        final count = g['count'] ?? 0;
                        return ActionChip(
                          avatar: Text('$count', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: blue)),
                          label: Text(display, style: const TextStyle(fontSize: 12)),
                          onPressed: () {
                            setState(() {
                              sourceTextController.text = display;
                            });
                          },
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '2. सही नया ${_targetTitle(selectedTarget)} दर्ज करें:',
                style: const TextStyle(color: navy, fontWeight: FontWeight.w800, fontSize: 14),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: targetTextController,
                decoration: InputDecoration(
                  labelText: 'नया सही नाम / नंबर',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.check_circle_outline_rounded, color: green),
                ),
              ),
              if (selectedTarget == 'sectionName') ...[
                const SizedBox(height: 10),
                TextField(
                  controller: sectionNumberController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'अनुभाग संख्या (ऐच्छिक / Optional Section Number)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    prefixIcon: const Icon(Icons.format_list_numbered_rounded),
                  ),
                ),
              ],
              if (selectedTarget == 'partNumber') ...[
                const SizedBox(height: 10),
                TextField(
                  controller: partNameController,
                  decoration: InputDecoration(
                    labelText: 'भाग का नाम (ऐच्छिक / Optional Part Name)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    prefixIcon: const Icon(Icons.badge_outlined),
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: processing ? null : _runDryRun,
                icon: const Icon(Icons.find_in_page_rounded),
                label: const Text('पूर्वावलोकन (Dry Run)'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: processing || dryRunResult == null ? null : _applyBulkUpdate,
                icon: const Icon(Icons.done_all_rounded),
                label: const Text('बल्क अपडेट लागू करें'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ),

        if (statusMessage.isNotEmpty) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: statusMessage.startsWith('सफलता') ? const Color(0xfff0fdf4) : const Color(0xffeff6ff),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: statusMessage.startsWith('सफलता') ? green.withValues(alpha: .3) : blue.withValues(alpha: .3),
              ),
            ),
            child: Text(
              statusMessage,
              style: TextStyle(
                color: statusMessage.startsWith('सफलता') ? green : navy,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],

        if (dryRunResult != null) ...[
          const SizedBox(height: 16),
          SectionCard(
            title: 'प्रभावित होने वाले मतदाता (${dryRunResult!['matched'] ?? 0})',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('नमूना रिकॉर्ड (Sample Voters):', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...((dryRunResult!['sample'] as List? ?? []).map((s) {
                  final m = Map<String, dynamic>.from(s as Map);
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    leading: const CircleAvatar(
                      radius: 14,
                      backgroundColor: Color(0xffe2e8f0),
                      child: Icon(Icons.person, size: 16, color: navy),
                    ),
                    title: Text(m['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text('EPIC: ${m['voterId'] ?? '-'} • अनुभाग: ${m['sectionName'] ?? '-'} • गाँव: ${m['village'] ?? '-'}'),
                  );
                })),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _ChipOption extends StatelessWidget {
  const _ChipOption({required this.label, required this.selected, required this.onSelected});
  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
      selected: selected,
      selectedColor: const Color(0xff14b8a6).withValues(alpha: 0.2),
      onSelected: onSelected,
    );
  }
}
