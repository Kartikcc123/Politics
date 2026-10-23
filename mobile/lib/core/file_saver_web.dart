import 'dart:html' as html;
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

Future<String?> saveBytes(String filename, Uint8List bytes) async {
  try {
    // 1. Universal Web & Electron direct download via Blob + AnchorElement
    final blob = html.Blob([bytes], 'application/octet-stream');
    final url = html.Url.createObjectUrlFromBlob(blob);
    final anchor = html.AnchorElement(href: url)
      ..setAttribute('download', filename)
      ..style.display = 'none';
    html.document.body?.children.add(anchor);
    anchor.click();
    html.document.body?.children.remove(anchor);
    html.Url.revokeObjectUrl(url);
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
