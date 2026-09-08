import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class BulkAnubhagEditorPage extends StatefulWidget {
  const BulkAnubhagEditorPage({super.key});

  @override
  State<BulkAnubhagEditorPage> createState() => _BulkAnubhagEditorPageState();
}

class _BulkAnubhagEditorPageState extends State<BulkAnubhagEditorPage> {
  bool loading = true;
  bool applying = false;
  List<Map<String, dynamic>> voters = [];
  Set<String> selectedIds = {};
  
  List<String> villages = [];
  List<String> partNumbers = [];
  String filterType = 'partNumber'; // 'partNumber' or 'village' or 'all'
  String? selectedVillage;
  String? selectedPartNumber;
  final customPartController = TextEditingController();
  
  List<String> existingSections = [];
  
  final villageNameController = TextEditingController();
  final sectionNameController = TextEditingController();
  final sectionNumberController = TextEditingController();

  final fromSerialController = TextEditingController();
  final toSerialController = TextEditingController();

  bool showMissingOnly = true;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    customPartController.dispose();
    villageNameController.dispose();
    sectionNameController.dispose();
    sectionNumberController.dispose();
    fromSerialController.dispose();
    toSerialController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() => loading = true);
    try {
      await _loadFilterOptions();
      await _fetchVoters();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('डेटा लोड करने में त्रुटि: $e')));
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _loadFilterOptions() async {
    try {
      final res = await api.get('/api/members/filter-options');
      List<String> rawVillages = [];
      List<String> rawParts = [];
      List<String> rawSections = [];

      if (res is Map<String, dynamic>) {
        final vList = res['village'] ?? res['villages'];
        if (vList is List) {
          for (final item in vList) {
            if (item is Map) {
              final val = '${item['value'] ?? item['label'] ?? ''}'.trim();
              if (val.isNotEmpty) rawVillages.add(val);
            } else if (item != null) {
              final val = '$item'.trim();
              if (val.isNotEmpty) rawVillages.add(val);
            }
          }
        }

        final pList = res['partNumber'] ?? res['partNumbers'] ?? res['booth'];
        if (pList is List) {
          for (final item in pList) {
            if (item is Map) {
              final val = '${item['value'] ?? item['label'] ?? ''}'.trim();
              if (val.isNotEmpty) rawParts.add(val);
            } else if (item != null) {
              final val = '$item'.trim();
              if (val.isNotEmpty) rawParts.add(val);
            }
          }
        }

        final sList = res['sectionName'] ?? res['sectionNames'];
        if (sList is List) {
          for (final item in sList) {
            if (item is Map) {
              final val = '${item['value'] ?? item['label'] ?? ''}'.trim();
              if (val.isNotEmpty) rawSections.add(val);
            } else if (item != null) {
              final val = '$item'.trim();
              if (val.isNotEmpty) rawSections.add(val);
            }
          }
        }
      }

      setState(() {
        villages = rawVillages.toSet().toList();
        partNumbers = rawParts.toSet().toList();
        existingSections = rawSections.toSet().toList();
      });
    } catch (_) {}
  }

  Future<void> _fetchVoters() async {
    setState(() => loading = true);
    try {
      final query = <String, String>{
        'paged': 'true',
        'limit': '1000',
        'sortBy': 'voterSerial',
      };
      
      final activePart = selectedPartNumber ?? customPartController.text.trim();
      if (filterType == 'partNumber' && activePart.isNotEmpty) {
        query['partNumber'] = activePart;
      } else if (filterType == 'village' && selectedVillage != null && selectedVillage!.isNotEmpty) {
        query['village'] = selectedVillage!;
      }

      final res = await api.getQuery('/api/members', query);
      final List<Map<String, dynamic>> items = (res is Map && res['items'] is List)
          ? List<Map<String, dynamic>>.from(res['items'])
          : <Map<String, dynamic>>[];

      // Extract part numbers dynamically if list was empty
      if (partNumbers.isEmpty && items.isNotEmpty) {
        final extractedParts = items
            .map((v) => '${v['partNumber'] ?? ''}'.trim())
            .where((p) => p.isNotEmpty)
            .toSet()
            .toList();
        if (extractedParts.isNotEmpty) {
          partNumbers = extractedParts;
          if (selectedPartNumber == null) {
            selectedPartNumber = extractedParts.first;
          }
        }
      }

      // Extract villages dynamically if empty
      if (villages.isEmpty && items.isNotEmpty) {
        final extractedVillages = items
            .map((v) => '${v['village'] ?? ''}'.trim())
            .where((v) => v.isNotEmpty)
            .toSet()
            .toList();
        if (extractedVillages.isNotEmpty) {
          villages = extractedVillages;
        }
      }

      setState(() {
        if (showMissingOnly) {
          voters = items.where((v) => (v['sectionName'] == null || '${v['sectionName']}'.trim().isEmpty)).toList();
        } else {
          voters = items;
        }
        selectedIds = voters.map((e) => '${e['_id']}').toSet();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('मतदाता लोड नहीं हो पाए: $e')));
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _applyQuickRange(int from, int to) {
    fromSerialController.text = '$from';
    toSerialController.text = '$to';
    _applySerialRangeSelection();
  }

  void _applySerialRangeSelection() {
    final from = int.tryParse(fromSerialController.text.trim());
    final to = int.tryParse(toSerialController.text.trim());
    if (from == null || to == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया सही सीरियल नंबर (जैसे 1 से 30) दर्ज करें।')),
      );
      return;
    }
    final rangeIds = <String>{};
    for (final v in voters) {
      final s = int.tryParse('${v['voterSerial'] ?? ''}');
      if (s != null && s >= from && s <= to) {
        rangeIds.add('${v['_id']}');
      }
    }
    setState(() {
      selectedIds = rangeIds;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('सीरियल $from से $to तक के ${rangeIds.length} मतदाता चुने गए')),
    );
  }

  Future<void> _submitBulkUpdate() async {
    final targetVillage = villageNameController.text.trim();
    final targetSection = sectionNameController.text.trim();
    final targetNumber = sectionNumberController.text.trim();
    
    if (targetVillage.isEmpty && targetSection.isEmpty && targetNumber.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया गाँव का नाम या अनुभाग का नाम/नंबर दर्ज करें।')),
      );
      return;
    }
    if (selectedIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया कम से कम एक मतदाता चुनें।')),
      );
      return;
    }

    setState(() => applying = true);
    try {
      final res = await api.post('/api/members/bulk-location-correction', {
        'memberIds': selectedIds.toList(),
        'dryRun': false,
        'updates': {
          if (targetVillage.isNotEmpty) 'village': targetVillage,
          if (targetSection.isNotEmpty) 'sectionName': targetSection,
          if (targetNumber.isNotEmpty) 'sectionNumber': targetNumber,
        },
      });

      final count = res['updated'] ?? selectedIds.length;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('सफलतापूर्वक $count वोटरों का डेटा अपडेट हो गया! ✅')),
        );
      }
      api.notifyDataChanged();
      await _fetchVoters();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('अपडेट विफल रहा: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => applying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff7f8fb),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('बल्क गाँव एवं अनुभाग सुधार', style: TextStyle(color: navy, fontWeight: FontWeight.w900, fontSize: 16)),
            Text('भाग / बूथ के वोटरों का गाँव और अनुभाग सही करें', style: TextStyle(color: muted, fontSize: 11)),
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 1,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildInstructionBanner(),
                _buildTopFilterCard(),
                _buildAnubhagEditorCard(),
                _buildSelectionBar(),
                Expanded(child: _buildVoterList()),
              ],
            ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))],
        ),
        child: SafeArea(
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: (applying || selectedIds.isEmpty) ? null : _submitBulkUpdate,
            icon: applying
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.check_circle_rounded),
            label: Text(
              applying ? 'अपडेट हो रहा है...' : 'चुने गए ${selectedIds.length} वोटरों पर लागू करें',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInstructionBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xfffff8e6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xffffe0b2)),
      ),
      child: const Row(
        children: [
          Icon(Icons.lightbulb_outline_rounded, color: Colors.orange, size: 22),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              '1️⃣ भाग / गाँव चुनें ➔ 2️⃣ सही गाँव व अनुभाग भरें ➔ 3️⃣ सीरियल नंबर चुनें (उदा: 1 से 30) और नीचे बटन दबाएं।',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xff7a4f01)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopFilterCard() {
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 6),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Mode selector
            Row(
              children: [
                ChoiceChip(
                  label: const Text('भाग / बूथ संख्या से'),
                  selected: filterType == 'partNumber',
                  onSelected: (val) {
                    if (val) {
                      setState(() => filterType = 'partNumber');
                      _fetchVoters();
                    }
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('गाँव के नाम से'),
                  selected: filterType == 'village',
                  onSelected: (val) {
                    if (val) {
                      setState(() => filterType = 'village');
                      _fetchVoters();
                    }
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('सभी वोटर'),
                  selected: filterType == 'all',
                  onSelected: (val) {
                    if (val) {
                      setState(() => filterType = 'all');
                      _fetchVoters();
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Selection controls based on filterType
            if (filterType == 'partNumber') ...[
              Row(
                children: [
                  const Icon(Icons.how_to_vote_rounded, color: blue, size: 20),
                  const SizedBox(width: 8),
                  const Text('भाग संख्या:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: SizedBox(
                      height: 38,
                      child: TextField(
                        controller: customPartController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: 'भाग संख्या (उदा: 177)',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.search, size: 18),
                            onPressed: _fetchVoters,
                          ),
                        ),
                        onSubmitted: (_) => _fetchVoters(),
                      ),
                    ),
                  ),
                ],
              ),
              if (partNumbers.isNotEmpty) ...[
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: partNumbers.map((p) {
                      final isSel = selectedPartNumber == p;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text('भाग $p', style: const TextStyle(fontSize: 12)),
                          selected: isSel,
                          onSelected: (selected) {
                            setState(() {
                              selectedPartNumber = selected ? p : null;
                              customPartController.text = selected ? p : '';
                            });
                            _fetchVoters();
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ] else if (filterType == 'village') ...[
              Row(
                children: [
                  const Icon(Icons.location_city_rounded, color: blue, size: 20),
                  const SizedBox(width: 8),
                  const Text('गाँव लें:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: villages.contains(selectedVillage) ? selectedVillage : null,
                      hint: const Text('गाँव चुनें...'),
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      items: villages
                          .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => selectedVillage = val);
                          _fetchVoters();
                        }
                      },
                    ),
                  ),
                ],
              ),
            ],

            const Divider(height: 16),
            Row(
              children: [
                FilterChip(
                  label: const Text('केवल बिना अनुभाग वाले'),
                  selected: showMissingOnly,
                  onSelected: (val) {
                    setState(() => showMissingOnly = val);
                    _fetchVoters();
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('सभी वोटर (अनुभाग सहित)'),
                  selected: !showMissingOnly,
                  onSelected: (val) {
                    setState(() => showMissingOnly = !val);
                    _fetchVoters();
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnubhagEditorCard() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      elevation: 0,
      color: Colors.blue.shade50.withValues(alpha: 0.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.blue.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('सही गाँव और अनुभाग (Anubhag) टाइप करें:', style: TextStyle(fontWeight: FontWeight.bold, color: navy, fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: villageNameController,
              decoration: InputDecoration(
                hintText: 'गाँव का नाम (उदा: भीटा माजरा)',
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: sectionNameController,
                    onChanged: (text) {
                      final match = RegExp(r'^(\d+)').firstMatch(text.trim());
                      if (match != null && sectionNumberController.text.isEmpty) {
                        sectionNumberController.text = match.group(1)!;
                      }
                    },
                    decoration: InputDecoration(
                      hintText: 'अनुभाग नाम (उदा: 1- भीटा माजरा)',
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: sectionNumberController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'नंबर (उदा: 1)',
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
            if (existingSections.isNotEmpty) ...[
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: existingSections.map((sec) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ActionChip(
                        label: Text(sec, style: const TextStyle(fontSize: 11)),
                        backgroundColor: Colors.white,
                        onPressed: () {
                          setState(() {
                            sectionNameController.text = sec;
                            final match = RegExp(r'^(\d+)').firstMatch(sec.trim());
                            if (match != null) {
                              sectionNumberController.text = match.group(1)!;
                            }
                          });
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
            const Divider(height: 16),
            const Text('सीरियल नंबर रेंज से चुनें (1-Click Selection):', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            const SizedBox(height: 6),
            // Quick range buttons
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ActionChip(label: const Text('1 से 30'), onPressed: () => _applyQuickRange(1, 30)),
                  const SizedBox(width: 6),
                  ActionChip(label: const Text('31 से 60'), onPressed: () => _applyQuickRange(31, 60)),
                  const SizedBox(width: 6),
                  ActionChip(label: const Text('61 से 90'), onPressed: () => _applyQuickRange(61, 90)),
                  const SizedBox(width: 6),
                  ActionChip(label: const Text('91 से 120'), onPressed: () => _applyQuickRange(91, 120)),
                  const SizedBox(width: 6),
                  ActionChip(label: Text('सभी (${voters.length})'), onPressed: () => _applyQuickRange(1, 1000)),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: fromSerialController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'From (1)',
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6),
                  child: Text('से'),
                ),
                Expanded(
                  child: TextField(
                    controller: toSerialController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'To (30)',
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _applySerialRangeSelection,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                  child: const Text('रेंज चुनें'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectionBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'कुल वोटर: ${voters.length} | चुने गए: ${selectedIds.length}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: muted),
          ),
          Row(
            children: [
              TextButton(
                onPressed: () => setState(() => selectedIds = voters.map((e) => '${e['_id']}').toSet()),
                child: const Text('सभी चुनें'),
              ),
              TextButton(
                onPressed: () => setState(() => selectedIds.clear()),
                child: const Text('अनसेलेक्ट'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVoterList() {
    if (voters.isEmpty) {
      return const Center(
        child: Text('कोई मतदाता नहीं मिला', style: TextStyle(color: muted, fontSize: 15)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: voters.length,
      itemBuilder: (context, index) {
        final voter = voters[index];
        final id = '${voter['_id']}';
        final isSelected = selectedIds.contains(id);
        final currentSec = voter['sectionName'] ?? 'अनुभाग उपलब्ध नहीं';
        final currentVil = voter['village'] ?? 'गाँव उपलब्ध नहीं';

        return Card(
          margin: const EdgeInsets.only(bottom: 6),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: Colors.grey.shade200)),
          child: CheckboxListTile(
            value: isSelected,
            activeColor: blue,
            onChanged: (val) {
              setState(() {
                if (val == true) {
                  selectedIds.add(id);
                } else {
                  selectedIds.remove(id);
                }
              });
            },
            title: Row(
              children: [
                if (voter['voterSerial'] != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(4)),
                    child: Text('#${voter['voterSerial']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                Expanded(
                  child: Text(
                    '${voter['name'] ?? ''} ${voter['surname'] ?? ''}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ],
            ),
            subtitle: Text(
              'भाग: ${voter['partNumber'] ?? '-'} | मकान: ${voter['houseNumber'] ?? '-'} | गाँव: $currentVil\nअनुभाग: $currentSec',
              style: TextStyle(fontSize: 12, color: (currentSec.contains('उपलब्ध नहीं') || currentVil.contains('उपलब्ध नहीं')) ? Colors.red : muted),
            ),
          ),
        );
      },
    );
  }
}
