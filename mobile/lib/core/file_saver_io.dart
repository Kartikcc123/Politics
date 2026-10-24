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
    var savePath = path;
    final dotIdx = filename.lastIndexOf('.');
    if (dotIdx != -1) {
      final ext = filename.substring(dotIdx);
      if (!savePath.toLowerCase().endsWith(ext.toLowerCase())) {
        savePath = '$savePath$ext';
      }
    }
    await File(savePath).writeAsBytes(bytes, flush: true);
    return savePath;
  } catch (_) {
    Directory? dir;
    try {
      dir = await getDownloadsDirectory();
    } catch (_) {}
    if (dir == null && Platform.isWindows && Platform.environment['USERPROFILE'] != null) {
      final userDownloads = Directory('${Platform.environment['USERPROFILE']}\\Downloads');
      if (userDownloads.existsSync()) dir = userDownloads;
    }
    dir ??= await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$filename');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }
}
