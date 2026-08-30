import 'package:flutter/material.dart';
import '../core/api_client.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  bool loading = false;

  void submit() async {
    setState(() => loading = true);

    try {
      final r = await api.login(emailCtrl.text, passCtrl.text);
      if (!mounted) return;
      if (r['token'] != null) {
        // naive role redirect
        final role = r['user']['role'] ?? 'booth';
        if (role == 'admin') {
          Navigator.pushReplacementNamed(context, '/admin');
        } else {
          Navigator.pushReplacementNamed(context, '/booth');
        }
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(r['msg'] ?? 'Login failed')));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error')));
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Card(
          margin: EdgeInsets.all(24),
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Political Booth CRM',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 12),
                TextField(
                  controller: emailCtrl,
                  decoration: InputDecoration(labelText: 'Email'),
                ),
                TextField(
                  controller: passCtrl,
                  decoration: InputDecoration(labelText: 'Password'),
                  obscureText: true,
                ),
                SizedBox(height: 12),
                ElevatedButton(
                  onPressed: loading ? null : submit,
                  child: loading
                      ? CircularProgressIndicator(color: Colors.white)
                      : Text('Login'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
