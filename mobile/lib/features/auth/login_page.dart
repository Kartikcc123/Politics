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
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  String error = '';

  bool showPassword = false;

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
      backgroundColor: bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xff0F172A),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const CongressMark(size: 48),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Voter Phone Book',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Color(0xff0F172A),
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'डिजिटल वोटर फ़ोन बुक एवं बूथ प्रबंधन',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: muted, fontSize: 13.5),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: border),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xff0F172A).withValues(alpha: 0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'लॉगिन करें',
                          style: TextStyle(
                            color: Color(0xff0F172A),
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'अपने एडमिन या बूथ खाते से प्रवेश करें',
                          style: TextStyle(color: muted, fontSize: 12.5),
                        ),
                        const SizedBox(height: 20),
                        TextField(
                          controller: email,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            labelText: 'मोबाइल / ईमेल',
                            prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: password,
                          obscureText: !showPassword,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => loading ? null : login(),
                          decoration: InputDecoration(
                            labelText: 'पासवर्ड',
                            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                            border: const OutlineInputBorder(),
                            suffixIcon: IconButton(
                              icon: Icon(
                                showPassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                size: 20,
                              ),
                              onPressed: () => setState(() => showPassword = !showPassword),
                            ),
                          ),
                        ),
                        if (error.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xffFEF2F2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xffFECACA)),
                            ),
                            child: Text(
                              error,
                              style: const TextStyle(color: Color(0xffB91C1C), fontSize: 12.5, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                        const SizedBox(height: 18),
                        SizedBox(
                          height: 48,
                          child: FilledButton.icon(
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xff0F172A),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: loading ? null : login,
                            icon: loading
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.login_rounded, size: 20),
                            label: Text(
                              loading ? 'जाँच हो रही है…' : 'लॉगिन करें',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
