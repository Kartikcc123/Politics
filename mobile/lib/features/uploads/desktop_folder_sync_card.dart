import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';

class DesktopFolderSyncCard extends StatefulWidget {
  const DesktopFolderSyncCard({super.key, this.onCompleted});

  final VoidCallback? onCompleted;

  @override
  State<DesktopFolderSyncCard> createState() => _DesktopFolderSyncCardState();
}

class _DesktopFolderSyncCardState extends State<DesktopFolderSyncCard> {
  final _pathCtrl = TextEditingController();
  final _partsCtrl = TextEditingController(text: 'all');
  bool _running = false;
  String _statusText = '';
  int _fileIndex = 0;
  int _totalFiles = 0;
  int _pageIndex = 0;
  int _totalPages = 0;
  int _totalSynced = 0;
  Process? _proc;

  @override
  void dispose() {
    _proc?.kill();
    _pathCtrl.dispose();
    _partsCtrl.dispose();
    super.dispose();
  }

  String? _resolveScriptPath() {
    final exeDir = File(Platform.resolvedExecutable).parent.path;
    final candidates = [
      '$exeDir\\ocr_bundle\\desktop_folder_sync.py',
      '$exeDir\\desktop_folder_sync.py',
      'C:\\Users\\pc\\Downloads\\Politics-main\\Politics-main\\backend\\python\\desktop_folder_sync.py',
      '${Directory.current.path}\\..\\backend\\python\\desktop_folder_sync.py',
      '${Directory.current.path}\\backend\\python\\desktop_folder_sync.py',
    ];
    for (final c in candidates) {
      if (File(c).existsSync()) return c;
    }
    return null;
  }

  String _resolvePythonCommand() {
    final exeDir = File(Platform.resolvedExecutable).parent.path;
    final bundledPy = '$exeDir\\ocr_bundle\\python\\python.exe';
    if (File(bundledPy).existsSync()) return bundledPy;
    return 'python';
  }

  Future<void> _browseFolder() async {
    final dir = await FilePicker.platform.getDirectoryPath(
      dialogTitle: 'PDF फ़ोल्डर चुनें (जैसे Final Publication 21.02.2026)',
    );
    if (dir != null && dir.isNotEmpty) {
      setState(() => _pathCtrl.text = dir);
    }
  }

  Future<void> _startSync() async {
    final targetPath = _pathCtrl.text.trim();
    if (targetPath.isEmpty) {
      setState(() => _statusText = 'कृपया फ़ोल्डर या PDF का path डालें।');
      return;
    }
    final scriptPath = _resolveScriptPath();
    if (scriptPath == null) {
      setState(() => _statusText = 'desktop_folder_sync.py नहीं मिला।');
      return;
    }
    final token = api.token;
    if (token == null || token.isEmpty) {
      setState(() => _statusText = 'कृपया पहले लॉगिन करें।');
      return;
    }

    setState(() {
      _running = true;
      _fileIndex = 0;
      _totalFiles = 0;
      _pageIndex = 0;
      _totalPages = 0;
      _totalSynced = 0;
      _statusText = 'Laptop CPU पर PDF स्कैन शुरू हो रहा है…';
    });

    try {
      final proc = await Process.start(
        _resolvePythonCommand(),
        [
          scriptPath,
          '--path',
          targetPath,
          '--base-url',
          api.baseUrl,
          '--token',
          token,
          '--parts',
          _partsCtrl.text.trim().isEmpty ? 'all' : _partsCtrl.text.trim(),
        ],
        runInShell: false,
      );
      _proc = proc;

      proc.stdout
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen((line) {
        if (!mounted || line.trim().isEmpty) return;
        try {
          final ev = jsonDecode(line) as Map<String, dynamic>;
          final type = ev['type'];
          setState(() {
            if (type == 'scan_done') {
              _totalFiles = (ev['totalFiles'] as num?)?.toInt() ?? 0;
              _statusText = 'कुल $_totalFiles PDF मिलीं। OCR शुरू हो रहा है…';
            } else if (type == 'file_start') {
              _fileIndex = (ev['fileIndex'] as num?)?.toInt() ?? 0;
              _totalFiles = (ev['totalFiles'] as num?)?.toInt() ?? _totalFiles;
              _pageIndex = 0;
              _totalPages = (ev['totalPages'] as num?)?.toInt() ?? 0;
              _statusText = '[$_fileIndex/$_totalFiles] ${ev['file']} पढ़ा जा रहा है…';
            } else if (type == 'page_done') {
              _pageIndex = (ev['page'] as num?)?.toInt() ?? _pageIndex;
              _totalPages = (ev['totalPages'] as num?)?.toInt() ?? _totalPages;
              _statusText = '[$_fileIndex/$_totalFiles] पेज $_pageIndex/$_totalPages पूरा (${ev['synced'] ?? 0} मतदाता भेजे गए)';
            } else if (type == 'file_done') {
              _totalSynced += (ev['synced'] as num?)?.toInt() ?? 0;
              _statusText = '✅ ${ev['file']} पूरा (${ev['synced']} मतदाता सेव)';
            } else if (type == 'file_error' || type == 'error') {
              _statusText = '⚠️ ${ev['message']}';
            } else if (type == 'all_done') {
              _statusText = '🎉 पूरा! कुल $_totalFiles PDF से $_totalSynced मतदाता VPS पर सेव हो गए।';
            }
          });
        } catch (_) {}
      });

      final code = await proc.exitCode;
      if (!mounted) return;
      setState(() {
        _running = false;
        _proc = null;
        if (code != 0 && !_statusText.startsWith('⚠️')) {
          _statusText = 'प्रक्रिया कोड $code के साथ बंद हुई।';
        }
      });
      if (code == 0) widget.onCompleted?.call();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _running = false;
        _proc = null;
        _statusText = 'Error: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb || !Platform.isWindows) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: blue.withValues(alpha: .25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.bolt_rounded, color: blue),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Desktop Fast Folder Sync (Laptop CPU)',
                  style: TextStyle(
                    color: navy,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'पूरे फ़ोल्डर या किसी एक PDF का path डालें—OCR आपके Laptop के CPU पर तेज़ी से चलेगा और डेटा सीधे VPS/S3 पर सेव होगा।',
            style: TextStyle(color: muted, fontSize: 12),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _pathCtrl,
                  enabled: !_running,
                  decoration: const InputDecoration(
                    labelText: 'Folder या PDF Path',
                    hintText: r'C:\Users\pc\Downloads\Final Publication 21.02.2026',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: _running ? null : _browseFolder,
                icon: const Icon(Icons.folder_open_rounded),
                label: const Text('Browse'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              SizedBox(
                width: 160,
                child: TextField(
                  controller: _partsCtrl,
                  enabled: !_running,
                  decoration: const InputDecoration(
                    labelText: 'भाग (Parts)',
                    hintText: 'all या 185,186',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _running ? null : _startSync,
                  icon: Icon(_running ? Icons.hourglass_top_rounded : Icons.play_arrow_rounded),
                  label: Text(_running ? 'Laptop OCR चल रहा है…' : 'Fast Sync शुरू करें'),
                ),
              ),
              if (_running) ...[
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'रोकें',
                  onPressed: () {
                    _proc?.kill();
                    setState(() {
                      _running = false;
                      _statusText = 'रोक दिया गया।';
                    });
                  },
                  icon: const Icon(Icons.stop_circle_outlined, color: Colors.red),
                ),
              ],
            ],
          ),
          if (_running && _totalPages > 0) ...[
            const SizedBox(height: 10),
            LinearProgressIndicator(value: (_pageIndex / _totalPages).clamp(0, 1).toDouble()),
          ],
          if (_statusText.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(_statusText, style: const TextStyle(color: navy, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ],
      ),
    );
  }
}
