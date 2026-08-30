import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../core/download_helper.dart';

import '../../core/api_client.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/theme.dart';
import '../auth/login_page.dart';
import '../../layout/app_layout.dart';
import '../../widgets/mobile_components.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  @override
  Widget build(BuildContext context) => AppPage(children: [
        const PremiumFeatureHero(
          title: 'सेटिंग्स और सुरक्षा',
          subtitle:
              'Account, data backup और app security को सुरक्षित रूप से manage करें।',
          icon: Icons.settings_rounded,
          accent: purple,
          badges: ['Secure', 'Backup', 'Account'],
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: border),
          ),
          child: Row(children: [
            const CircleAvatar(
              radius: 28,
              backgroundColor: softBlue,
              foregroundColor: blue,
              child: Icon(Icons.person_rounded, size: 29),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${api.user?['name'] ?? 'User'}',
                        style: const TextStyle(
                            color: navy,
                            fontSize: 17,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 2),
                    Text('${api.user?['email'] ?? ''}',
                        style: const TextStyle(color: muted, fontSize: 11)),
                    const SizedBox(height: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: softGreen,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                          '${api.user?['role'] ?? 'user'}'.toUpperCase(),
                          style: const TextStyle(
                              color: green,
                              fontSize: 9,
                              fontWeight: FontWeight.w900)),
                    ),
                  ]),
            ),
          ]),
        ),
        if (api.user?['role'] == 'admin')
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const PremiumSectionTitle(
              title: 'Data Security',
              subtitle: 'Backup download या सुरक्षित restore करें',
              icon: Icons.shield_outlined,
            ),
            const SizedBox(height: 10),
            _SettingsAction(
              icon: Icons.cloud_download_rounded,
              color: blue,
              title: 'Backup डाउनलोड करें',
              subtitle: 'सभी जरूरी records की JSON backup file',
              onTap: () => saveApiFile(context,
                  path: '/api/export/backup',
                  fallbackName: 'political-crm-backup.json'),
            ),
            const SizedBox(height: 10),
            _SettingsAction(
              icon: Icons.restore_rounded,
              color: green,
              title: 'Backup Restore करें',
              subtitle: 'पहले से डाउनलोड backup से data वापस लाएं',
              onTap: _restore,
            ),
          ]),
        const PremiumSectionTitle(
          title: 'Account',
          subtitle: 'इस device पर login session manage करें',
          icon: Icons.manage_accounts_outlined,
        ),
        _SettingsAction(
          icon: Icons.logout_rounded,
          color: rose,
          title: 'लॉगआउट',
          subtitle: 'इस device से सुरक्षित रूप से बाहर निकलें',
          onTap: () {
            api.logout();
            Navigator.pushReplacement(
                context, MaterialPageRoute(builder: (_) => const LoginPage()));
          },
        ),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xfff4f7fc),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
          ),
          child: const Row(children: [
            Icon(Icons.lock_outline_rounded, color: blue, size: 20),
            SizedBox(width: 9),
            Expanded(
                child: Text(
              'आपका data encrypted connection से server पर भेजा जाता है।',
              style: TextStyle(color: muted, fontSize: 11),
            )),
          ]),
        ),
      ]);
  Future<void> _restore() async {
    final picked = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['json'],
        withData: true);
    if (picked == null || picked.files.single.bytes == null || !mounted) return;
    final data = Map<String, dynamic>.from(
        jsonDecode(utf8.decode(picked.files.single.bytes!)));
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Backup restore करें?'),
        content: Text(
            '${(data['members'] as List? ?? []).length} voter records update/restore होंगे।'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Restore')),
        ],
      ),
    );
    if (yes != true) return;
    final result = await api.post(
        '/api/security/restore', {...data, 'confirmation': 'RESTORE BACKUP'});
    await OfflineVoterCache.clear();
    api.notifyDataChanged();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Restored ${result['restoredMembers']} voters')));
    }
  }
}

class _SettingsAction extends StatelessWidget {
  const _SettingsAction({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: border),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withValues(alpha: .1),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              color: navy,
                              fontSize: 14,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 2),
                      Text(subtitle,
                          style: const TextStyle(color: muted, fontSize: 11)),
                    ]),
              ),
              const Icon(Icons.chevron_right_rounded, color: muted),
            ]),
          ),
        ),
      );
}
