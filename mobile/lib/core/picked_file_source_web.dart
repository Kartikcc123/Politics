import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

String? pickedFilePath(PlatformFile file) => null;

Uint8List? pickedFileBytes(PlatformFile file) => file.bytes;
