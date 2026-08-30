import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

Future<String?> saveBytes(String filename, Uint8List bytes) async {
  final path = await FilePicker.platform.saveFile(
    dialogTitle: 'फाइल सेव करें',
    fileName: filename,
  );
  if (path == null) return null;
  await File(path).writeAsBytes(bytes, flush: true);
  return path;
}
