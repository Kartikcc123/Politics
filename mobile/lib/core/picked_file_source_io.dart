import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

String? pickedFilePath(PlatformFile file) => file.path;

Uint8List? pickedFileBytes(PlatformFile file) => null;
