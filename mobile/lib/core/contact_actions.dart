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

Future<void> launchMapLocation(BuildContext context, String? rawUrl) async {
  var trimmed = (rawUrl ?? '').trim();
  if (trimmed.isEmpty) {
    _error(context, 'लोकेशन लिंक उपलब्ध नहीं है।');
    return;
  }
  if (!trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('geo:')) {
    trimmed = 'https://$trimmed';
  }
  final uri = Uri.tryParse(trimmed);
  if (uri == null) {
    _error(context, 'अमान्य Maps लिंक');
    return;
  }
  try {
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched) {
      final launchedDef =
          await launchUrl(uri, mode: LaunchMode.platformDefault);
      if (!launchedDef) {
        await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
      }
    }
  } catch (_) {
    try {
      await launchUrl(uri, mode: LaunchMode.platformDefault);
    } catch (_) {
      if (context.mounted) {
        _error(context, 'Maps नहीं खुल सका। कृपया ब्राउज़र या Google Maps जांचें।');
      }
    }
  }
}

void _error(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}

