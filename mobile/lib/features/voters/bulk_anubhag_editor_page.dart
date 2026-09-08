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
  String filterType = 'partNumber'; // 'partNumber' or 'village'
  String? selectedVillage;
  String? selectedPartNumber;
  
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
    _loadFilterOptions();
  }

  @override
  void dispose() {
    villageNameController.dispose();
    sectionNameController.dispose();
    sectionNumberController.dispose();
    fromSerialController.dispose();
    toSerialController.dispose();
    super.dispose();
  }

  Future<void> _loadFilterOptions() async {
    setState(() => loading = true);
    try {
      final res = await api.get('/api/members/filter-options');
      if (res is Map<String, dynamic>) {
        final rawVillages = (res['villages'] as List?)?.map((e) => '$e').where((e) => e.isNotEmpty).toList() ?? [];
        final rawParts = (res['partNumbers'] as List?)?.map((e) => '$e').where((e) => e.isNotEmpty).toList() ?? [];
        final rawSections = (res['sectionNames'] as List?)?.map((e) => '$e').where((e) => e.isNotEmpty).toList() ?? [];
        setState(() {
          villages = rawVillages;
          partNumbers = rawParts;
          existingSections = rawSections;
          if (partNumbers.isNotEmpty) {
            filterType = 'partNumber';
            selectedPartNumber = partNumbers.first;
          } else if (villages.isNotEmpty) {
            filterType = 'village';
            selectedVillage = villages.first;
          }
        });
        await _fetchVoters();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('फ़िल्टर लोड नहीं हो पाए: $e')));
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _fetchVoters() async {
    setState(() => loading = true);
    try {
      final query = <String, String>{
        'limit': '1000',
        'sortBy': 'voterSerial',
      };
      if (filterType == 'partNumber' && selectedPartNumber != null) {
        query['partNumber'] = selectedPartNumber!;
      } else if (filterType == 'village' && selectedVillage != null) {
        query['village'] = selectedVillage!;
      }

      final res = await api.get('/api/members', query: query);
      final items = (res is Map && res['items'] is List)
          ? List<Map<String, dynamic>>.from(res['items'])
          : [];

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

  void _applySerialRangeSelection() {
    final from = int.tryParse(fromSerialController.text.trim());
    final to = int.tryParse(toSerialController.text.trim());
    if (from == null || to == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया सही सीरियल नंबर (जैसे 1 से 60) दर्ज करें।')),
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
      SnackBar(content: Text('सीरियल ${from} से ${to} तक के ${rangeIds.length} मतदाता चुने गए')),
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
          SnackBar(content: Text('सफलतापूर्वक ${count} वोटरों का डेटा अपडेट हो गया! ✅')),
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
            Text('भाग / बूथ या गाँव के वोटरों का गाँव और अनुभाग सही करें', style: TextStyle(color: muted, fontSize: 11)),
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
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -4))],
        ),
        child: SafeArea(
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: primary,
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

  Widget _buildTopFilterCard() {
    return Card(
      margin: const EdgeInsets.all(12),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(filterType == 'partNumber' ? Icons.how_to_vote_rounded : Icons.location_city_rounded, color: primary, size: 20),
                const SizedBox(width: 8),
                Text(filterType == 'partNumber' ? 'भाग संख्या चुनें:' : 'गाँव चुनें:', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: filterType == 'partNumber' ? selectedPartNumber : selectedVillage,
                      items: (filterType == 'partNumber' ? partNumbers : villages)
                          .map((v) => DropdownMenuItem(value: v, child: Text(filterType == 'partNumber' ? 'भाग $v' : v)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            if (filterType == 'partNumber') {
                              selectedPartNumber = val;
                            } else {
                              selectedVillage = val;
                            }
                          });
                          _fetchVoters();
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
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
                  label: const Text('सभी वोटर'),
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
      color: Colors.blue.shade50.withOpacity(0.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.blue.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('गाँव और अनुभाग (Anubhag) सेट करें:', style: TextStyle(fontWeight: FontWeight.bold, color: navy)),
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
                          });
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
            const Divider(height: 16),
            const Text('सीरियल नंबर रेंज से चुनें (Optional):', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: fromSerialController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'From Serial (1)',
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
                      hintText: 'To Serial (60)',
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
            activeColor: primary,
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
