import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

String? pickedFilePath(PlatformFile file) => file.path;

Uint8List? pickedFileBytes(PlatformFile file) {
  if (file.bytes != null && file.bytes!.isNotEmpty) return file.bytes;
  if (file.path != null && file.path!.isNotEmpty) {
    try {
      return File(file.path!).readAsBytesSync();
    } catch (_) {}
  }
  return null;
}
