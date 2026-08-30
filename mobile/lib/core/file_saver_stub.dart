import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

Future<String?> saveBytes(String filename, Uint8List bytes) {
  return FilePicker.platform.saveFile(
    dialogTitle: 'फाइल सेव करें',
    fileName: filename,
    bytes: bytes,
  );
}
