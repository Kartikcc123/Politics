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
      ]);

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
