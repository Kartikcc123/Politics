import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../messages/bulk_message_page.dart';
import '../voters/voter_edit_page.dart';

class CelebrationsPage extends StatefulWidget {
  const CelebrationsPage({super.key});
  @override
  State<CelebrationsPage> createState() => _CelebrationsPageState();
}

class _CelebrationsPageState extends State<CelebrationsPage> {
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('आज के Birthday / Anniversary'),
          actions: [
            IconButton(
              tooltip: 'Birthday bulk campaign',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const BulkMessagePage(
                    initialEventType: 'birthday',
                  ),
                ),
              ),
              icon: const Icon(Icons.campaign_rounded),
            ),
          ],
        ),
        body: AppPage(children: [
          FutureBlock<Map<String, dynamic>>(
            load: () => api.get('/api/notifications/today'),
            builder: (data) => Column(children: [
              _group('🎂 जन्मदिन', List.from(data['birthdays'] ?? []), true),
              const SizedBox(height: 16),
              _group('💐 विवाह वर्षगाँठ',
                  List.from(data['anniversaries'] ?? []), false),
            ]),
          ),
        ]),
      );

  Widget _group(String title, List<dynamic> items, bool birthday) => Panel(
        title: '$title (${items.length})',
        child: items.isEmpty
            ? const Text('आज कोई कार्यक्रम नहीं है।')
            : Column(
                children: items.map((raw) {
                  final voter = Map<String, dynamic>.from(raw);
                  return ListTile(
                    leading: CircleAvatar(
                        child: Icon(birthday
                            ? Icons.cake_outlined
                            : Icons.favorite_outline)),
                    title: Text(
                        '${voter['name'] ?? ''} ${voter['surname'] ?? ''}',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text(
                        '${voter['mobile'] ?? '-'} • ${voter['village'] ?? voter['location'] ?? ''}'),
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => VoterEditPage(
                                voter: voter, onSaved: () => setState(() {})))),
                    trailing: IconButton(
                      tooltip: 'WhatsApp greeting',
                      icon: const Icon(Icons.chat, color: Colors.green),
                      onPressed: () => openWhatsApp(
                        context,
                        '${voter['mobile'] ?? ''}',
                        message: birthday
                            ? '🎂 जन्मदिन की हार्दिक शुभकामनाएँ ${voter['name'] ?? ''} जी! आपका जीवन सुख, स्वास्थ्य और सफलता से भरा रहे।'
                            : '💐 विवाह वर्षगाँठ की हार्दिक शुभकामनाएँ ${voter['name'] ?? ''} जी! आपका दाम्पत्य जीवन सदैव सुखमय रहे।',
                      ),
                    ),
                  );
                }).toList(),
              ),
      );
}
