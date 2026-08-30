import 'package:flutter/material.dart';

import 'core/api_client.dart';
import 'core/theme.dart';
import 'features/auth/login_page.dart';
import 'layout/app_shell.dart';

class CongressBoothApp extends StatelessWidget {
  const CongressBoothApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'कांग्रेस बूथ प्रबंधन',
      theme: buildAppTheme(),
      home: ValueListenableBuilder<int>(
        valueListenable: api.authVersion,
        builder: (context, version, _) => AuthGate(
          key: ValueKey('auth-gate-$version'),
        ),
      ),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final Future<bool> _session = api.validateSession();

  @override
  Widget build(BuildContext context) => FutureBuilder<bool>(
        future: _session,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          if (snapshot.data == true && api.user != null) {
            return AppShell(role: api.user?['role'] ?? 'booth');
          }
          return const LoginPage();
        },
      );
}
