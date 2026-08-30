import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class NetworkRequestException implements Exception {
  const NetworkRequestException(this.message);

  final String message;

  @override
  String toString() => message;
}

class DownloadedFile {
  const DownloadedFile({
    required this.bytes,
    required this.filename,
    required this.contentType,
  });

  final Uint8List bytes;
  final String filename;
  final String contentType;
}

class Api {
  Api({required this.baseUrl});

  final String baseUrl;
  String? token;
  Map<String, dynamic>? user;
  final ValueNotifier<int> dataVersion = ValueNotifier<int>(0);
  final ValueNotifier<int> authVersion = ValueNotifier<int>(0);

  static const _tokenKey = 'auth_token_v1';
  static const _userKey = 'auth_user_v1';

  void notifyDataChanged() {
    dataVersion.value++;
  }

  Future<void> restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = prefs.getString(_tokenKey);
    final savedUser = prefs.getString(_userKey);
    if (savedToken == null || savedToken.isEmpty) return;
    token = savedToken;
    if (savedUser != null && savedUser.isNotEmpty) {
      try {
        user = Map<String, dynamic>.from(json.decode(savedUser));
      } catch (_) {
        user = null;
      }
    }
  }

  Future<void> _persistSession() async {
    final prefs = await SharedPreferences.getInstance();
    if (token == null || token!.isEmpty) {
      await prefs.remove(_tokenKey);
      await prefs.remove(_userKey);
      return;
    }
    await prefs.setString(_tokenKey, token!);
    if (user != null) await prefs.setString(_userKey, json.encode(user));
  }

  Future<void> _clearSession() async {
    token = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  Future<Never> _expireSession() async {
    await _clearSession();
    authVersion.value++;
    throw const NetworkRequestException(
      'आपका सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।',
    );
  }

  Map<String, String> get headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  bool _isTransientNetworkError(Object error) {
    if (error is NetworkRequestException) return true;
    final message = error.toString().toLowerCase();
    return message.contains('socketexception') ||
        message.contains('failed host lookup') ||
        message.contains('connection reset by peer') ||
        message.contains('connection closed') ||
        message.contains('connection refused') ||
        message.contains('network is unreachable') ||
        message.contains('clientexception') ||
        message.contains('xmlhttprequest error') ||
        message.contains('failed to fetch');
  }

  bool _isTemporaryServerError(Object error) {
    final message = error.toString().toLowerCase();
    return message.contains('server') &&
        (message.contains('temporarily') ||
            message.contains('restart') ||
            message.contains('503') ||
            message.contains('502') ||
            message.contains('504'));
  }

  bool isTemporaryFailure(Object error) =>
      _isTransientNetworkError(error) || _isTemporaryServerError(error);

  NetworkRequestException _friendlyNetworkError(Object error) {
    final message = error.toString().toLowerCase();
    if (message.contains('failed host lookup')) {
      return const NetworkRequestException(
        'सर्वर का पता नहीं मिला। इंटरनेट चालू रखें, VPN या Private DNS बंद करके फिर प्रयास करें।',
      );
    }
    if (message.contains('connection reset by peer') ||
        message.contains('connection closed')) {
      return const NetworkRequestException(
        'सर्वर से कनेक्शन बीच में बंद हो गया। नेटवर्क बदलकर फिर अपलोड करें।',
      );
    }
    return const NetworkRequestException(
      'सर्वर से संपर्क नहीं हो सका। इंटरनेट कनेक्शन जांचकर फिर प्रयास करें।',
    );
  }

  Future<T> _withNetworkRetry<T>(
    Future<T> Function() operation, {
    int attempts = 3,
    bool retryConnectionReset = true,
  }) async {
    Object? lastError;
    for (var attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (!isTemporaryFailure(error)) rethrow;
        lastError = error;
        final message = error.toString().toLowerCase();
        if (!retryConnectionReset &&
            (message.contains('connection reset by peer') ||
                message.contains('connection closed'))) {
          break;
        }
        if (attempt < attempts) {
          await Future.delayed(Duration(seconds: attempt));
        }
      }
    }
    throw _friendlyNetworkError(lastError!);
  }

  Future<dynamic> _send(Future<http.Response> future) async {
    final res = await future;
    if (res.statusCode == 401) return _expireSession();
    if (res.statusCode == 502 ||
        res.statusCode == 503 ||
        res.statusCode == 504) {
      throw NetworkRequestException(
          'Server is restarting or temporarily unavailable (${res.statusCode}).');
    }
    dynamic body;
    final contentType = res.headers['content-type'] ?? '';
    if (res.body.isEmpty) {
      body = null;
    } else if (contentType.contains('application/json') ||
        res.body.trimLeft().startsWith('{') ||
        res.body.trimLeft().startsWith('[')) {
      body = json.decode(res.body);
    } else {
      final compactPreview = res.body.replaceAll(RegExp(r'\s+'), ' ').trim();
      final preview = compactPreview.substring(
          0, compactPreview.length > 80 ? 80 : compactPreview.length);
      if (res.body.trimLeft().startsWith('<!DOCTYPE html') ||
          res.body.trimLeft().startsWith('<html')) {
        throw const NetworkRequestException(
          'सर्वर अभी शुरू या reconnect हो रहा है। ऐप अपने आप दोबारा जांच करेगा।',
        );
      }
      throw Exception(
          'सर्वर से सही उत्तर नहीं मिला। $baseUrl पर सेवा की स्थिति जांचें। विवरण: $preview');
    }
    if (res.statusCode >= 400) {
      throw Exception(body is Map
          ? (body['message'] ?? body['msg'] ?? body.toString())
          : 'Request failed');
    }
    return body;
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await _withNetworkRetry(() => _send(http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: headers,
        body: json.encode({'email': email, 'password': password}))));
    token = data['token'];
    user = Map<String, dynamic>.from(data['user']);
    await _persistSession();
    return user!;
  }

  Future<bool> validateSession() async {
    if (token == null) await restoreSession();
    if (token == null) return false;
    try {
      user = await get('/api/auth/me');
      await _persistSession();
      return true;
    } catch (error) {
      if (error is NetworkRequestException || _isTemporaryServerError(error)) {
        return user != null;
      }
      await _clearSession();
      return false;
    }
  }

  void logout() {
    _clearSession();
  }

  Future<List<dynamic>> list(String path,
      [Map<String, String?> query = const {}]) async {
    final clean = <String, String>{};
    for (final entry in query.entries) {
      final value = entry.value;
      if (value != null && value.isNotEmpty) clean[entry.key] = value;
    }
    return List<dynamic>.from(await _withNetworkRetry<dynamic>(() => _send(
          http.get(
            Uri.parse('$baseUrl$path').replace(queryParameters: clean),
            headers: headers,
          ),
        )));
  }

  Future<Map<String, dynamic>> get(String path) async =>
      Map<String, dynamic>.from(await _withNetworkRetry<dynamic>(
          () => _send(http.get(Uri.parse('$baseUrl$path'), headers: headers))));
  Future<Map<String, dynamic>> getQuery(String path,
      [Map<String, String?> query = const {}]) async {
    final clean = <String, String>{};
    for (final entry in query.entries) {
      final value = entry.value;
      if (value != null && value.isNotEmpty) clean[entry.key] = value;
    }
    return Map<String, dynamic>.from(await _withNetworkRetry<dynamic>(() =>
        _send(http.get(
            Uri.parse('$baseUrl$path').replace(queryParameters: clean),
            headers: headers))));
  }

  Future<Map<String, dynamic>> post(String path, Map data) async =>
      Map<String, dynamic>.from(await _withNetworkRetry<dynamic>(
          () => _send(http.post(
                Uri.parse('$baseUrl$path'),
                headers: headers,
                body: json.encode(data),
              )),
          attempts: 1));
  Future<Map<String, dynamic>> put(String path, Map data) async =>
      Map<String, dynamic>.from(await _withNetworkRetry<dynamic>(
          () => _send(http.put(
                Uri.parse('$baseUrl$path'),
                headers: headers,
                body: json.encode(data),
              )),
          attempts: 1));
  Future<void> delete(String path) async => await _withNetworkRetry(
      () => _send(http.delete(Uri.parse('$baseUrl$path'), headers: headers)),
      attempts: 1);
  Future<Map<String, dynamic>> deleteWithBody(String path, Map data) async =>
      Map<String, dynamic>.from(
        await _withNetworkRetry<dynamic>(
            () => _send(http.delete(Uri.parse('$baseUrl$path'),
                headers: headers, body: json.encode(data))),
            attempts: 1),
      );

  Future<DownloadedFile> download(String path,
      {Map<String, String?> query = const {},
      String fallbackName = 'download'}) async {
    final clean = <String, String>{};
    for (final entry in query.entries) {
      final value = entry.value;
      if (value != null && value.isNotEmpty) clean[entry.key] = value;
    }
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: clean);
    final res = await _withNetworkRetry(() => http.get(uri, headers: headers));
    if (res.statusCode == 401) return _expireSession();
    if (res.statusCode >= 400) {
      final contentType = res.headers['content-type'] ?? '';
      if (contentType.contains('application/json') ||
          res.body.trimLeft().startsWith('{')) {
        final body = json.decode(res.body);
        throw Exception(body is Map
            ? (body['message'] ?? body['msg'] ?? body.toString())
            : 'Download failed');
      }
      throw Exception('Download failed with status ${res.statusCode}');
    }
    return DownloadedFile(
      bytes: res.bodyBytes,
      filename: _filenameFromDisposition(res.headers['content-disposition']) ??
          fallbackName,
      contentType: res.headers['content-type'] ?? 'application/octet-stream',
    );
  }

  Future<Map<String, dynamic>> uploadBytes(String path, Uint8List bytes,
      String filename, Map<String, String> fields) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.fields.addAll(fields);
    request.files
        .add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return Map<String, dynamic>.from(await _send(Future.value(response)));
  }

  Future<Map<String, dynamic>> uploadFile(
    String path, {
    String method = 'POST',
    required String filename,
    String fileField = 'file',
    String? filePath,
    Uint8List? bytes,
    Stream<List<int>>? fileStream,
    int? fileLength,
    Map<String, String> fields = const {},
    void Function(int sent, int total)? onProgress,
  }) async {
    final uploadId = fields['uploadId'];
    final uri = uploadId == null || uploadId.isEmpty
        ? Uri.parse('$baseUrl$path')
        : Uri.parse('$baseUrl$path')
            .replace(queryParameters: {'uploadId': uploadId});
    Future<Map<String, dynamic>> sendRequest({
      String? pathSource,
      Uint8List? byteSource,
      Stream<List<int>>? streamSource,
    }) async {
      final request = http.MultipartRequest(method, uri);
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
      request.fields.addAll(fields);
      if (pathSource != null && pathSource.isNotEmpty) {
        final file = await http.MultipartFile.fromPath(fileField, pathSource,
            filename: filename);
        request.files.add(_trackMultipartProgress(file, onProgress));
      } else if (byteSource != null) {
        final file = http.MultipartFile.fromBytes(fileField, byteSource,
            filename: filename);
        request.files.add(_trackMultipartProgress(file, onProgress));
      } else if (streamSource != null && fileLength != null && fileLength > 0) {
        final file = http.MultipartFile(fileField, streamSource, fileLength,
            filename: filename);
        request.files.add(_trackMultipartProgress(file, onProgress));
      } else {
        throw Exception('चुनी गई फाइल पढ़ी नहीं जा सकी।');
      }
      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);
      return Map<String, dynamic>.from(await _send(Future.value(response)));
    }

    if (filePath != null && filePath.isNotEmpty) {
      try {
        return await _withNetworkRetry(
          () => sendRequest(pathSource: filePath),
          attempts: 1,
          retryConnectionReset: false,
        );
      } catch (error) {
        final message = error.toString().toLowerCase();
        final unreadablePath = message.contains('filesystemexception') ||
            message.contains('cannot open file') ||
            message.contains('no such file');
        if (!unreadablePath || fileStream == null) rethrow;
      }
    }
    if (bytes != null) {
      return _withNetworkRetry(
        () => sendRequest(byteSource: bytes),
        attempts: 1,
        retryConnectionReset: false,
      );
    }
    if (fileStream != null) {
      return _withNetworkRetry(
        () => sendRequest(streamSource: fileStream),
        attempts: 1,
      );
    }
    throw Exception('चुनी गई फाइल पढ़ी नहीं जा सकी।');
  }

  Future<Map<String, dynamic>> uploadPdfResumable({
    required String uploadId,
    required String filename,
    required int fileLength,
    Uint8List? bytes,
    Stream<List<int>>? fileStream,
    void Function(int sent, int total)? onProgress,
    String listType = 'assembly',
  }) async {
    const chunkSize = 512 * 1024;
    if (fileLength < 1 || (bytes == null && fileStream == null)) {
      throw Exception('Selected PDF could not be read.');
    }
    final totalChunks = (fileLength / chunkSize).ceil();
    final source = bytes != null ? Stream<List<int>>.value(bytes) : fileStream!;
    var pending = <int>[];
    var index = 0;
    var sent = 0;

    Future<void> sendChunk(Uint8List chunk, int chunkIndex) async {
      final uri = Uri.parse(
          '$baseUrl/api/import/members/pdf/chunks/$uploadId/$chunkIndex');
      await _withNetworkRetry<dynamic>(
        () => _send(http.put(uri,
            headers: {
              if (token != null) 'Authorization': 'Bearer $token',
              'Content-Type': 'application/octet-stream',
              'X-Total-Chunks': '$totalChunks',
              'X-Total-Bytes': '$fileLength',
            },
            body: chunk)),
        attempts: 5,
      );
      sent += chunk.length;
      onProgress?.call(sent, fileLength);
    }

    await for (final data in source) {
      pending.addAll(data);
      while (pending.length >= chunkSize) {
        final chunk = Uint8List.fromList(pending.sublist(0, chunkSize));
        pending = pending.sublist(chunkSize);
        await sendChunk(chunk, index++);
      }
    }
    if (pending.isNotEmpty) {
      await sendChunk(Uint8List.fromList(pending), index++);
    }
    if (sent != fileLength || index != totalChunks) {
      throw Exception(
          'PDF could not be read completely. Please select it again.');
    }
    try {
      return await post('/api/import/members/pdf/chunks/$uploadId/complete', {
        'filename': filename,
        'uploadId': uploadId,
        'listType': listType,
      });
    } catch (error) {
      if (!isTemporaryFailure(error)) rethrow;
      await Future.delayed(const Duration(seconds: 2));
      try {
        final progress = await get('/api/import/status/$uploadId');
        if (progress['status'] == 'uploading') {
          return await post(
            '/api/import/members/pdf/chunks/$uploadId/complete',
            {'filename': filename, 'uploadId': uploadId, 'listType': listType},
          );
        }
      } catch (statusError) {
        if (!isTemporaryFailure(statusError)) rethrow;
      }
      return {
        'processing': true,
        'uploadId': uploadId,
        'message': 'Upload received; checking server processing status.',
      };
    }
  }

  http.MultipartFile _trackMultipartProgress(
    http.MultipartFile file,
    void Function(int sent, int total)? onProgress,
  ) {
    if (onProgress == null) return file;
    var sent = 0;
    final stream = file.finalize().transform(
      StreamTransformer<List<int>, List<int>>.fromHandlers(
        handleData: (data, sink) {
          sent += data.length;
          onProgress(sent, file.length);
          sink.add(data);
        },
      ),
    );
    return http.MultipartFile(file.field, stream, file.length,
        filename: file.filename, contentType: file.contentType);
  }

  String? _filenameFromDisposition(String? header) {
    if (header == null || header.isEmpty) return null;
    final utf = RegExp("filename\\*=UTF-8''([^;]+)").firstMatch(header);
    if (utf != null) return Uri.decodeComponent(utf.group(1)!);
    final plain = RegExp('filename="?([^";]+)"?').firstMatch(header);
    return plain?.group(1);
  }
}
