import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

import 'api_client.dart';

/// Opens the interactive in-app PDF preview screen with zoom, paging, direct print, and share
Future<void> openPdfPreview(
  BuildContext context, {
  required String path,
  required String jobName,
  Map<String, String?> query = const {},
}) async {
  await Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => PdfPreviewScreen(
        path: path,
        jobName: jobName,
        query: query,
      ),
    ),
  );
}

/// Print helper with preview-first or direct printing
Future<void> printApiPdf(
  BuildContext context, {
  required String path,
  required String jobName,
  Map<String, String?> query = const {},
  bool showPreviewFirst = true,
}) async {
  if (showPreviewFirst) {
    return openPdfPreview(
      context,
      path: path,
      jobName: jobName,
      query: query,
    );
  }

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

/// In-app Interactive PDF Viewer & Print Preview Screen
class PdfPreviewScreen extends StatefulWidget {
  final String path;
  final String jobName;
  final Map<String, String?> query;

  const PdfPreviewScreen({
    super.key,
    required this.path,
    required this.jobName,
    this.query = const {},
  });

  @override
  State<PdfPreviewScreen> createState() => _PdfPreviewScreenState();
}

class _PdfPreviewScreenState extends State<PdfPreviewScreen> {
  Uint8List? _cachedBytes;
  String? _errorMessage;

  Future<Uint8List> _loadPdf() async {
    if (_cachedBytes != null) return _cachedBytes!;

    try {
      final file = await api.download(
        widget.path,
        query: widget.query,
        fallbackName: '${widget.jobName}.pdf',
      );
      _cachedBytes = Uint8List.fromList(file.bytes);
      if (mounted) {
        setState(() => _errorMessage = null);
      }
      return _cachedBytes!;
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayTitle = widget.jobName.replaceAll('_', ' ');

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'प्रिंट प्रीव्यू (Print Preview)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              displayTitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'पुनः लोड करें',
            onPressed: () {
              setState(() {
                _cachedBytes = null;
                _errorMessage = null;
              });
            },
          ),
        ],
      ),
      body: _errorMessage != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Colors.red, size: 48),
                    const SizedBox(height: 12),
                    Text(
                      'PDF लोड करने में त्रुटि:\n$_errorMessage',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red, fontSize: 14),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () => setState(() {
                        _cachedBytes = null;
                        _errorMessage = null;
                      }),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('दोबारा लोड करें'),
                    ),
                  ],
                ),
              ),
            )
          : PdfPreview(
              build: (format) => _loadPdf(),
              pdfFileName: '${widget.jobName}.pdf',
              allowPrinting: true,
              allowSharing: true,
              canChangeOrientation: false,
              canChangePageFormat: false,
              loadingWidget: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text(
                      'प्रिंट प्रीव्यू तैयार हो रहा है...',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'कृपया प्रतीक्षा करें',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
