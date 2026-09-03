import 'package:flutter/foundation.dart';

import '../services/api.dart';

const productionApiUrl = 'https://politics.mathxmedia.tech';

String _defaultApiUrl() {
  if (kDebugMode) {
    if (kIsWeb) {
      final page = Uri.base;
      final isLocal = page.host == 'localhost' || page.host == '127.0.0.1';
      if (!isLocal) return productionApiUrl;
      final scheme = page.scheme == 'https' ? 'https' : 'http';
      return '$scheme://${page.host}:5000';
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000';
    }
    return 'http://localhost:5000';
  }
  return productionApiUrl;
}

const configuredApiUrl = String.fromEnvironment('API_URL');

final api = Api(
  baseUrl: configuredApiUrl.isNotEmpty ? configuredApiUrl : _defaultApiUrl(),
);
