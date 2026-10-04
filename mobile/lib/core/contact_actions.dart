import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
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

Future<void> shareVoterDetails(
  BuildContext context,
  Map<String, dynamic> voter, {
  String? targetNumber,
}) async {
  final name = '${voter['name'] ?? '-'}'.trim();
  final relative = '${voter['guardianName'] ?? voter['relativeName'] ?? '-'}'.trim();
  final epic = '${voter['voterId'] ?? '-'}'.trim();
  final partNo = '${voter['partNumber'] ?? '-'}'.trim();
  final asmSerial = '${voter['voterSerial'] ?? '-'}'.trim();
  final wardNo = '${voter['wardNumber'] ?? (voter['municipalWardNumbers'] is List && (voter['municipalWardNumbers'] as List).isNotEmpty ? voter['municipalWardNumbers'][0] : '-')}'.trim();
  final wardSerial = '${voter['wardVoterSerial'] ?? '-'}'.trim();
  final village = '${voter['village'] ?? '-'}'.trim();
  final gp = '${voter['gramPanchayat'] ?? '-'}'.trim();
  final house = '${voter['houseNumber'] ?? '-'}'.trim();
  final section = '${voter['sectionName'] ?? '-'}'.trim();
  final mobile = '${voter['mobile'] ?? ''}'.trim();
  final caste = '${voter['caste'] ?? ''}'.trim();
  final photo = '${voter['photo'] ?? voter['photoUrl'] ?? voter['cardImage'] ?? ''}'.trim();

  final buffer = StringBuffer();
  buffer.writeln('📋 *मतदाता पर्ची / विवरण (Voter Slip)*');
  buffer.writeln('━━━━━━━━━━━━━━━━━━━━');
  buffer.writeln('👤 *नाम:* $name');
  if (relative != '-' && relative.isNotEmpty) {
    buffer.writeln('👨 *पिता/पति:* $relative');
  }
  if (epic != '-' && epic.isNotEmpty) {
    buffer.writeln('🆔 *EPIC (वोटर ID):* $epic');
  }
  if (asmSerial != '-' || partNo != '-') {
    buffer.writeln('🗳️ *वि.स. भाग:* #$partNo · *वि.स. क्रमांक:* #$asmSerial');
  }
  if (wardNo != '-' || wardSerial != '-') {
    buffer.writeln('🏛️ *वार्ड संख्या:* #$wardNo · *वार्ड क्रमांक:* #$wardSerial');
  }
  if (house != '-' && house != '.' && house != '0' && house.isNotEmpty) {
    buffer.writeln('🏠 *मकान नं.:* $house');
  }
  if (village != '-' && village.isNotEmpty) {
    buffer.writeln('📍 *गाँव/मोहल्ला:* $village${section != '-' && section.isNotEmpty ? ' ($section)' : ''}');
  }
  if (gp != '-' && gp.isNotEmpty) {
    buffer.writeln('🗺️ *ग्राम पंचायत:* $gp');
  }
  if (caste.isNotEmpty) {
    buffer.writeln('🏷️ *जाति:* $caste');
  }
  if (mobile.isNotEmpty) {
    buffer.writeln('📞 *मोबाइल:* $mobile');
  }
  buffer.writeln('━━━━━━━━━━━━━━━━━━━━');
  buffer.writeln('🚩 *Political CRM Dashboard*');

  final msg = buffer.toString();

  // Download/extract the actual photo file directly so it shares as an image attachment
  File? tempPhotoFile;
  try {
    if (photo.isNotEmpty) {
      if (photo.startsWith('http://') || photo.startsWith('https://')) {
        final res = await http.get(Uri.parse(photo)).timeout(const Duration(seconds: 8));
        if (res.statusCode == 200 && res.bodyBytes.isNotEmpty) {
          final tempDir = await getTemporaryDirectory();
          final ext = photo.contains('.png') ? 'png' : 'jpg';
          final voterId = voter['_id'] ?? voter['voterId'] ?? DateTime.now().millisecondsSinceEpoch;
          final file = File('${tempDir.path}/voter_${voterId}_share.$ext');
          await file.writeAsBytes(res.bodyBytes);
          tempPhotoFile = file;
        }
      } else if (photo.startsWith('data:image')) {
        final commaIdx = photo.indexOf(',');
        final base64Str = commaIdx != -1 ? photo.substring(commaIdx + 1) : photo;
        final bytes = base64Decode(base64Str);
        final tempDir = await getTemporaryDirectory();
        final voterId = voter['_id'] ?? voter['voterId'] ?? DateTime.now().millisecondsSinceEpoch;
        final file = File('${tempDir.path}/voter_${voterId}_share.jpg');
        await file.writeAsBytes(bytes);
        tempPhotoFile = file;
      }
    }
  } catch (_) {
    // If photo download times out or fails, proceed to fallback text sharing
  }

  try {
    if (tempPhotoFile != null && await tempPhotoFile.exists()) {
      await SharePlus.instance.share(
        ShareParams(
          text: msg,
          subject: 'मतदाता विवरण - $name',
          files: [XFile(tempPhotoFile.path)],
        ),
      );
      return;
    }

    var num = (targetNumber ?? '').replaceAll(RegExp(r'\D'), '');
    if (num.length == 10) num = '91$num';
    if (num.isNotEmpty) {
      final uri = Uri.parse('https://wa.me/$num?text=${Uri.encodeComponent(msg)}');
      if (await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        return;
      }
    }

    await SharePlus.instance.share(
      ShareParams(
        text: msg,
        subject: 'मतदाता विवरण - $name',
      ),
    );
  } catch (_) {
    if (context.mounted) _error(context, 'शेयर नहीं किया जा सका।');
  }
}

void _error(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}


