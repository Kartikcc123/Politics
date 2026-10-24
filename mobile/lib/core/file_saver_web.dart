import 'dart:html' as html;
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

Future<String?> saveBytes(String filename, Uint8List bytes) async {
  try {
    // 1. Universal Web & Electron direct download via Blob + AnchorElement
    final isXlsx = filename.toLowerCase().endsWith('.xlsx');
    final isPdf = filename.toLowerCase().endsWith('.pdf');
    final mimeType = isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : (isPdf ? 'application/pdf' : 'application/octet-stream');

    final blob = html.Blob([bytes], mimeType);
    final url = html.Url.createObjectUrlFromBlob(blob);
    final anchor = html.AnchorElement(href: url)
      ..setAttribute('download', filename)
      ..style.display = 'none';
    html.document.body?.children.add(anchor);
    anchor.click();
    html.document.body?.children.remove(anchor);

    // Keep blob URL alive so browser has time to stream/save the file
    Future.delayed(const Duration(seconds: 45), () {
      try {
        html.Url.revokeObjectUrl(url);
      } catch (_) {}
    });

    return filename;
  } catch (_) {
    try {
      return await FilePicker.platform.saveFile(
        dialogTitle: 'फाइल सेव करें',
        fileName: filename,
        bytes: bytes,
      );
    } catch (_) {
      return null;
    }
  }
}
