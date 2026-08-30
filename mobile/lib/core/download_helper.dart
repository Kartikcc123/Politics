import 'package:flutter/material.dart';

import 'api_client.dart';
import 'file_saver.dart';

Future<void> saveApiFile(
  BuildContext context, {
  required String path,
  required String fallbackName,
  Map<String, String?> query = const {},
}) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    final file =
        await api.download(path, query: query, fallbackName: fallbackName);
    final savedPath = await saveBytes(file.filename, file.bytes);
    if (savedPath == null) return;
    messenger.showSnackBar(
        SnackBar(content: Text('डाउनलोड सेव हो गया: ${file.filename}')));
  } catch (error) {
    messenger.showSnackBar(SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', ''))));
  }
}
