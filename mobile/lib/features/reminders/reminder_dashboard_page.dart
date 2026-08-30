import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/mobile_components.dart';
import '../voters/voter_edit_page.dart';

class ReminderDashboardPage extends StatefulWidget {
  const ReminderDashboardPage({super.key});

  @override
  State<ReminderDashboardPage> createState() => _ReminderDashboardPageState();
}

class _ReminderDashboardPageState extends State<ReminderDashboardPage> {
  @override
  Widget build(BuildContext context) => AppPage(children: [
        const PremiumFeatureHero(
          title: 'Follow-up Dashboard',
          subtitle: 'आज के, overdue और आने वाले voter contacts एक जगह संभालें।',
          icon: Icons.notifications_active_rounded,
          accent: orange,
          badges: ['आज', 'आने वाले', 'Call & WhatsApp'],
        ),
        FutureBlock<Map<String, dynamic>>(
          load: () => api.get('/api/follow-ups/dashboard'),
          builder: (data) => DefaultTabController(
            length: 3,
            child: Column(children: [
              TabBar(tabs: [
                Tab(text: 'Overdue (${_items(data, 'overdue').length})'),
                Tab(text: 'आज (${_items(data, 'today').length})'),
                Tab(text: 'आने वाले (${_items(data, 'upcoming').length})'),
              ]),
              SizedBox(
                height: 560,
                child: TabBarView(children: [
                  _ReminderList(
                      items: _items(data, 'overdue'),
                      refresh: () => setState(() {}),
                      color: Colors.red),
                  _ReminderList(
                      items: _items(data, 'today'),
                      refresh: () => setState(() {}),
                      color: orange),
                  _ReminderList(
                      items: _items(data, 'upcoming'),
                      refresh: () => setState(() {}),
                      color: blue),
                ]),
              ),
            ]),
          ),
        ),
      ]);

  List<dynamic> _items(Map<String, dynamic> data, String key) =>
      List.from(data[key] ?? []);
}

class _ReminderList extends StatelessWidget {
  const _ReminderList(
      {required this.items, required this.refresh, required this.color});
  final List<dynamic> items;
  final VoidCallback refresh;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Center(child: Text('कोई reminder नहीं है'));
    }
    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = Map<String, dynamic>.from(items[index]);
        final member = Map<String, dynamic>.from(item['member']);
        final followUp = Map<String, dynamic>.from(item['followUp']);
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(children: [
              InkWell(
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            VoterEditPage(voter: member, onSaved: refresh))),
                child: Row(children: [
                  CircleAvatar(
                      backgroundColor: color.withValues(alpha: .12),
                      child: Icon(Icons.notifications_active, color: color)),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${member['name'] ?? ''}',
                              style: const TextStyle(
                                  color: navy,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900)),
                          const SizedBox(height: 2),
                          Text('${followUp['title'] ?? 'Follow-up'}',
                              style:
                                  const TextStyle(color: muted, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(
                              '${DateFormat('dd-MM-yyyy').format(DateTime.parse('${followUp['dueAt']}'))} · ${member['village'] ?? member['organizationPost'] ?? ''}',
                              style: TextStyle(
                                  color: color,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800)),
                        ]),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: muted),
                ]),
              ),
              const Divider(height: 22),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () =>
                        callNumber(context, '${member['mobile'] ?? ''}'),
                    icon: const Icon(Icons.call_rounded, color: blue, size: 18),
                    label: const Text('Call'),
                  ),
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => openWhatsApp(
                        context, '${member['mobile'] ?? ''}',
                        message: 'नमस्कार ${member['name'] ?? ''} जी,'),
                    icon:
                        const Icon(Icons.chat_rounded, color: green, size: 18),
                    label: const Text('WhatsApp'),
                  ),
                ),
                const SizedBox(width: 7),
                IconButton.filled(
                  tooltip: 'पूरा करें',
                  onPressed: () async {
                    await api.put(
                        '/api/follow-ups/${member['_id']}/${followUp['_id']}',
                        {'status': 'done'});
                    refresh();
                  },
                  style: IconButton.styleFrom(backgroundColor: green),
                  icon: const Icon(Icons.check_rounded, color: Colors.white),
                ),
              ]),
            ]),
          ),
        );
      },
    );
  }
}
