import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';

class VoterContactActions extends StatelessWidget {
  const VoterContactActions({super.key, required this.voter});
  final Map<String, dynamic> voter;

  @override
  Widget build(BuildContext context) =>
      Wrap(spacing: 8, runSpacing: 8, children: [
        FilledButton.icon(
          onPressed: () => callNumber(context, '${voter['mobile'] ?? ''}'),
          icon: const Icon(Icons.call),
          label: const Text('कॉल'),
        ),
        FilledButton.icon(
          style: FilledButton.styleFrom(backgroundColor: Colors.green),
          onPressed: () => openWhatsApp(
            context,
            '${voter['mobile'] ?? ''}',
            message: 'नमस्कार ${voter['name'] ?? ''} जी,',
          ),
          icon: const Icon(Icons.chat),
          label: const Text('WhatsApp'),
        ),
        OutlinedButton.icon(
          onPressed: () => _addFollowUp(context),
          icon: const Icon(Icons.notification_add_outlined),
          label: const Text('Follow-up'),
        ),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xffea4335),
            side: const BorderSide(color: Color(0xfffca5a5)),
          ),
          onPressed: () {
            final mapUrl = (voter['googleMapUrl'] ?? '').toString().trim();
            if (mapUrl.isNotEmpty) {
              launchMapLocation(context, mapUrl);
            } else {
              final searchParts = [
                voter['houseNumber'],
                voter['address'],
                voter['location'],
                voter['village'],
                voter['gramPanchayat'],
                voter['tehsil'],
                'Rajasthan',
              ]
                  .where((p) => p != null && p.toString().trim().isNotEmpty)
                  .map((p) => p.toString().trim())
                  .toList();
              final q = searchParts.take(3).join(', ');
              if (q.isNotEmpty) {
                launchMapLocation(context,
                    'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(q)}');
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('लोकेशन या पता उपलब्ध नहीं है।')),
                );
              }
            }
          },
          icon: const Icon(Icons.location_on_rounded, size: 18),
          label: const Text('मैप'),
        ),
        OutlinedButton.icon(
          onPressed: () => _manageGroups(context),
          icon: const Icon(Icons.label_outline, size: 18),
          label: const Text('ग्रुप'),
        ),
        InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () async {
            final res = await api.toggleFavorite(voter['_id']);
            voter['isFavorite'] = res['isFavorite'] == true;
            voter['favoriteRating'] = res['favoriteRating'] ?? (voter['isFavorite'] == true ? 1 : 0);
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(res['message'] ?? (voter['isFavorite'] == true ? 'पसंदीदा में जोड़ा गया।' : 'पसंदीदा से हटाया गया।'))),
              );
            }
          },
          onLongPress: () => _showStarPicker(context),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: _buildStarWidget(voter['favoriteRating'] ?? (voter['isFavorite'] == true ? 1 : 0)),
          ),
        ),
      ]);

  Widget _buildStarWidget(dynamic rawRating) {
    final rating = int.tryParse('$rawRating') ?? 0;
    if (rating <= 0) {
      return const Icon(Icons.star_border, color: Colors.grey);
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.star, color: Colors.amber.shade700, size: 20),
        if (rating > 1) ...[
          const SizedBox(width: 2),
          Text(
            '$rating★',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.amber.shade900,
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _showStarPicker(BuildContext context) async {
    final current = int.tryParse('${voter['favoriteRating']}') ?? (voter['isFavorite'] == true ? 1 : 0);
    final chosen = await showModalBottomSheet<int>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('पसंदीदा स्टार चुनें (Favorite Priority)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            ListTile(
              leading: const Icon(Icons.star_border, color: Colors.grey),
              title: const Text('पसंदीदा से हटाएं (0 Star)'),
              trailing: current == 0 ? const Icon(Icons.check, color: Colors.blue) : null,
              onTap: () => Navigator.pop(context, 0),
            ),
            ListTile(
              leading: const Icon(Icons.star, color: Colors.amber),
              title: const Text('★ 1 Star - सामान्य समर्थक'),
              trailing: current == 1 ? const Icon(Icons.check, color: Colors.blue) : null,
              onTap: () => Navigator.pop(context, 1),
            ),
            ListTile(
              leading: Row(mainAxisSize: MainAxisSize.min, children: const [Icon(Icons.star, color: Colors.amber, size: 18), Icon(Icons.star, color: Colors.amber, size: 18)]),
              title: const Text('★★ 2 Star - प्रमुख समर्थक / कार्यकर्ता'),
              trailing: current == 2 ? const Icon(Icons.check, color: Colors.blue) : null,
              onTap: () => Navigator.pop(context, 2),
            ),
            ListTile(
              leading: Row(mainAxisSize: MainAxisSize.min, children: const [Icon(Icons.star, color: Colors.amber, size: 18), Icon(Icons.star, color: Colors.amber, size: 18), Icon(Icons.star, color: Colors.amber, size: 18)]),
              title: const Text('★★★ 3 Star - VIP / परिवार / कोर वोटर'),
              trailing: current == 3 ? const Icon(Icons.check, color: Colors.blue) : null,
              onTap: () => Navigator.pop(context, 3),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (chosen != null) {
      final res = await api.toggleFavorite(voter['_id'], rating: chosen);
      voter['isFavorite'] = res['isFavorite'] == true;
      voter['favoriteRating'] = res['favoriteRating'] ?? chosen;
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message'] ?? 'पसंदीदा अपडेट हो गया।')),
        );
      }
    }
  }

  Future<void> _manageGroups(BuildContext context) async {
    List<dynamic> allGroups = [];
    try {
      allGroups = await api.getGroups();
    } catch (_) {}

    final List<String> currentGroupIds = (voter['groups'] as List<dynamic>? ?? [])
        .map((g) => g is Map ? '${g['_id']}' : '$g')
        .toList();

    if (!context.mounted) return;

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text('कस्टम ग्रुप्स (Google Contacts Style)'),
            content: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (allGroups.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('अभी कोई ग्रुप नहीं है। नीचे बटन दबाकर नया ग्रुप बनाएं।', style: TextStyle(color: Colors.grey)),
                    )
                  else
                    Flexible(
                      child: SingleChildScrollView(
                        child: Column(
                          children: allGroups.map((g) {
                            final gId = '${g['_id']}';
                            final gName = '${g['name']}';
                            final isChecked = currentGroupIds.contains(gId);
                            return CheckboxListTile(
                              value: isChecked,
                              title: Text(gName),
                              secondary: const Icon(Icons.label, color: Color(0xff1A73E8)),
                              onChanged: (val) {
                                setState(() {
                                  if (val == true) {
                                    if (!currentGroupIds.contains(gId)) currentGroupIds.add(gId);
                                  } else {
                                    currentGroupIds.remove(gId);
                                  }
                                });
                              },
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  const Divider(),
                  TextButton.icon(
                    icon: const Icon(Icons.add_circle_outline),
                    label: const Text('+ नया ग्रुप बनाएं (Create Group)'),
                    onPressed: () async {
                      final nameCtrl = TextEditingController();
                      final created = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('नया ग्रुप बनाएं'),
                          content: TextField(
                            controller: nameCtrl,
                            autofocus: true,
                            decoration: const InputDecoration(
                              labelText: 'ग्रुप का नाम (उदा. परिवार, युवा, व्यापारी)',
                              hintText: 'ग्रुप नाम दर्ज करें',
                            ),
                          ),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('रद्द करें')),
                            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('बनाएं')),
                          ],
                        ),
                      );
                      if (created == true && nameCtrl.text.trim().isNotEmpty) {
                        try {
                          final res = await api.createGroup(nameCtrl.text.trim());
                          final newG = res['group'];
                          if (newG != null) {
                            allGroups = await api.getGroups();
                            currentGroupIds.add('${newG['_id']}');
                            setState(() {});
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('ग्रुप बनाने में त्रुटि: $e')),
                            );
                          }
                        }
                      }
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('रद्द करें')),
              FilledButton(
                onPressed: () async {
                  try {
                    final res = await api.assignMemberGroups('${voter['_id']}', currentGroupIds);
                    voter['groups'] = res['member']?['groups'] ?? currentGroupIds;
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('ग्रुप्स सफलतापूर्वक सहेजे गए।')),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('ग्रुप्स सहेजने में त्रुटि: $e')),
                      );
                    }
                  }
                },
                child: const Text('सहेजें (Save)'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _addFollowUp(BuildContext context) async {
    final title = TextEditingController(text: 'फोन पर संपर्क');
    final notes = TextEditingController();
    DateTime dueAt = DateTime.now().add(const Duration(days: 1));
    String type = 'call';
    String priority = 'medium';
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Follow-up reminder'),
          content: SizedBox(
            width: 420,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                  controller: title,
                  decoration: const InputDecoration(labelText: 'कार्य')),
              const SizedBox(height: 10),
              DropdownButtonFormField(
                initialValue: type,
                decoration: const InputDecoration(labelText: 'प्रकार'),
                items: const [
                  DropdownMenuItem(value: 'call', child: Text('कॉल')),
                  DropdownMenuItem(value: 'whatsapp', child: Text('WhatsApp')),
                  DropdownMenuItem(value: 'visit', child: Text('मुलाकात')),
                  DropdownMenuItem(value: 'meeting', child: Text('बैठक')),
                  DropdownMenuItem(value: 'other', child: Text('अन्य')),
                ],
                onChanged: (value) => setState(() => type = '$value'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField(
                initialValue: priority,
                decoration: const InputDecoration(labelText: 'प्राथमिकता'),
                items: const [
                  DropdownMenuItem(value: 'high', child: Text('उच्च')),
                  DropdownMenuItem(value: 'medium', child: Text('सामान्य')),
                  DropdownMenuItem(value: 'low', child: Text('कम')),
                ],
                onChanged: (value) => setState(() => priority = '$value'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('तारीख'),
                subtitle: Text(DateFormat('dd-MM-yyyy').format(dueAt)),
                trailing: const Icon(Icons.calendar_month),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 3650)),
                    initialDate: dueAt,
                  );
                  if (picked != null) setState(() => dueAt = picked);
                },
              ),
              TextField(
                  controller: notes,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'नोट')),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('रद्द करें')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('सहेजें')),
          ],
        ),
      ),
    );
    if (save != true || title.text.trim().isEmpty) return;
    await api.post('/api/follow-ups/${voter['_id']}', {
      'title': title.text.trim(),
      'notes': notes.text.trim(),
      'type': type,
      'priority': priority,
      'dueAt': dueAt.toIso8601String(),
    });
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Follow-up reminder जोड़ दिया गया।')));
    }
  }
}
