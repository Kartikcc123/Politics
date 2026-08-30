import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

import 'api_client.dart';

Future<void> printApiPdf(
  BuildContext context, {
  required String path,
  required String jobName,
  Map<String, String?> query = const {},
}) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    final file = await api.download(
      path,
      query: query,
      fallbackName: '$jobName.pdf',
    );
    await Printing.layoutPdf(
      name: jobName,
      onLayout: (_) async => file.bytes,
    );
  } catch (error) {
    messenger.showSnackBar(
      SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', '')),
      ),
    );
  }
}
