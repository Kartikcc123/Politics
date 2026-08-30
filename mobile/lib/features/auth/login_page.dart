import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_shell.dart';
import '../../layout/app_layout.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController(text: 'admin@example.com');
  final password = TextEditingController(text: 'AdminPass123');
  bool loading = false;
  String error = '';

  Future<void> login() async {
    setState(() {
      loading = true;
      error = '';
    });
    try {
      final user = await api.login(email.text.trim(), password.text);
      if (!mounted) return;
      Navigator.pushReplacement(
          context,
          MaterialPageRoute(
              builder: (_) => AppShell(role: user['role'] ?? 'booth')));
    } catch (e) {
      setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(children: [
        Container(
          height: 280,
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [royalBlue, Color(0xff0456d6)]),
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
          ),
        ),
        SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(22),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: Column(children: [
                  const CongressMark(size: 72),
                  const SizedBox(height: 12),
                  const Text('कांग्रेस संगठन',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 25,
                          fontWeight: FontWeight.w900)),
                  const Text('संगठन ही शक्ति है',
                      style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 28),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(22),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text('स्वागत है',
                                style:
                                    Theme.of(context).textTheme.headlineSmall),
                            const SizedBox(height: 4),
                            const Text('अपने खाते में सुरक्षित लॉगिन करें',
                                style: TextStyle(color: muted)),
                            const SizedBox(height: 22),
                            TextField(
                                controller: email,
                                decoration: const InputDecoration(
                                    labelText: 'मोबाइल / ईमेल',
                                    prefixIcon: Icon(Icons.mail_outline))),
                            const SizedBox(height: 12),
                            TextField(
                                controller: password,
                                obscureText: true,
                                decoration: const InputDecoration(
                                    labelText: 'पासवर्ड',
                                    prefixIcon: Icon(Icons.lock_outline))),
                            Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                    onPressed: () {},
                                    child: const Text('पासवर्ड भूल गए?'))),
                            if (error.isNotEmpty)
                              Text(error,
                                  style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 8),
                            FilledButton.icon(
                              onPressed: loading ? null : login,
                              icon: loading
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2))
                                  : const Icon(Icons.login),
                              label: const Text('लॉगिन'),
                            ),
                          ]),
                    ),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}
