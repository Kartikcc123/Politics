import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

Future<String?> saveBytes(String filename, Uint8List bytes) async {
  if (Platform.isAndroid) {
    try {
      final dir = await getDownloadsDirectory() ??
          await getExternalStorageDirectory() ??
          await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$filename');
      await file.writeAsBytes(bytes, flush: true);
      await SharePlus.instance.share(
        ShareParams(
          text: 'फ़ाइल: $filename',
          files: [XFile(file.path)],
          subject: filename,
        ),
      );
      return file.path;
    } catch (_) {
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$filename');
      await file.writeAsBytes(bytes, flush: true);
      await SharePlus.instance.share(
        ShareParams(
          text: 'फ़ाइल: $filename',
          files: [XFile(file.path)],
          subject: filename,
        ),
      );
      return file.path;
    }
  }

  try {
    final path = await FilePicker.platform.saveFile(
      dialogTitle: 'फाइल सेव करें',
      fileName: filename,
    );
    if (path == null) return null;
    await File(path).writeAsBytes(bytes, flush: true);
    return path;
  } catch (_) {
    final dir = await getDownloadsDirectory() ??
        await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$filename');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }
}
