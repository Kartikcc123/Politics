import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

Future<void> callNumber(BuildContext context, String? number) async {
  final mobile = (number ?? '').replaceAll(RegExp(r'\D'), '');
  if (mobile.isEmpty) return _error(context, 'मोबाइल नंबर उपलब्ध नहीं है।');
  if (!await launchUrl(Uri.parse('tel:$mobile')) && context.mounted) {
    _error(context, 'Call app नहीं खुल सकी।');
  }
}

Future<void> openWhatsApp(
  BuildContext context,
  String? number, {
  String message = '',
}) async {
  var mobile = (number ?? '').replaceAll(RegExp(r'\D'), '');
  if (mobile.isEmpty) return _error(context, 'WhatsApp नंबर उपलब्ध नहीं है।');
  if (mobile.length == 10) mobile = '91$mobile';
  final uri =
      Uri.parse('https://wa.me/$mobile?text=${Uri.encodeComponent(message)}');
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
      context.mounted) {
    _error(context, 'WhatsApp नहीं खुल सका।');
  }
}

void _error(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}
