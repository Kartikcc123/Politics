import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

class VoterPageResult {
  const VoterPageResult({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.pages,
    this.offline = false,
  });

  final List<dynamic> items;
  final int total;
  final int page;
  final int limit;
  final int pages;
  final bool offline;
}

class OfflineVoterCache {
  static const _key = 'offline_voters_v1';
  static const _updatedKey = 'offline_voters_updated_at';

  static Future<List<dynamic>> load({
    Map<String, String?> query = const {},
  }) async {
    try {
      final online = await api.list('/api/members', query);
      await save(online);
      return online;
    } catch (_) {
      final cached = await read();
      return _filter(cached, query);
    }
  }

  static Future<VoterPageResult> loadPage({
    Map<String, String?> query = const {},
    int page = 1,
    int limit = 100,
  }) async {
    final pagedQuery = {
      ...query,
      'paged': 'true',
      'page': '$page',
      'limit': '$limit',
    };
    try {
      final online = await api.getQuery('/api/members', pagedQuery);
      final items = List<dynamic>.from(online['items'] as List? ?? []);
      final total = ((online['total'] ?? items.length) as num).toInt();
      if (!_hasActiveFilters(query)) {
        if (page == 1 && total <= items.length) {
          await save(items);
        } else {
          await merge(items);
        }
      }
      return VoterPageResult(
        items: items,
        total: total,
        page: ((online['page'] ?? page) as num).toInt(),
        limit: ((online['limit'] ?? limit) as num).toInt(),
        pages: ((online['pages'] ?? 1) as num).toInt(),
      );
    } catch (_) {
      final filtered = _filter(await read(), query);
      final start = (page - 1) * limit;
      final end = start + limit;
      final items = start >= filtered.length
          ? <dynamic>[]
          : filtered.sublist(
              start, end > filtered.length ? filtered.length : end);
      return VoterPageResult(
        items: items,
        total: filtered.length,
        page: page,
        limit: limit,
        pages: filtered.isEmpty ? 1 : ((filtered.length - 1) ~/ limit) + 1,
        offline: true,
      );
    }
  }

  static Future<void> save(List<dynamic> voters) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(voters));
    await prefs.setString(_updatedKey, DateTime.now().toIso8601String());
  }

  static Future<void> merge(List<dynamic> voters) async {
    final byId = <String, dynamic>{};
    for (final item in await read()) {
      final id = _itemId(item);
      if (id.isNotEmpty) byId[id] = item;
    }
    for (final item in voters) {
      final id = _itemId(item);
      if (id.isNotEmpty) byId[id] = item;
    }
    await save(byId.values.toList());
  }

  static String _itemId(dynamic item) {
    if (item is! Map) return '';
    final raw = item['_id'] ?? item['id'];
    if (raw == null) return '';
    if (raw is String) return raw.trim();
    if (raw is Map) {
      final oid = raw[r'$oid'] ?? raw['oid'] ?? raw['_id'] ?? raw['id'];
      if (oid != null) return oid.toString().trim();
    }
    return raw.toString().trim();
  }

  static Future<void> removeByIds(Iterable<String> ids) async {
    final remove =
        ids.map((id) => id.trim()).where((id) => id.isNotEmpty).toSet();
    if (remove.isEmpty) return;
    final kept = (await read())
        .where((item) => !remove.contains(_itemId(item)))
        .toList();
    await save(kept);
  }

  static Future<List<dynamic>> read() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    return List<dynamic>.from(jsonDecode(raw));
  }

  static Future<String?> lastUpdated() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_updatedKey);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    await prefs.remove(_updatedKey);
  }

  static List<dynamic> _filter(
      List<dynamic> items, Map<String, String?> query) {
    final q = _normalize(query['q'] ?? '');
    final queryTokens =
        q.split(' ').where((token) => token.isNotEmpty).toList();
    final filtered = items.where((raw) {
      final item = Map<String, dynamic>.from(raw);
      if (queryTokens.isNotEmpty) {
        final mode = (query['qMode'] ?? '').trim().toLowerCase();
        final details = List<dynamic>.from(item['extraDetails'] as List? ?? []);
        final allText = [
          item['name'], item['surname'], item['mobile'], item['altMobile'],
          item['voterId'], item['voterSerial'], item['guardianName'],
          item['houseNumber'], item['address'], item['village'],
          item['gramPanchayat'], item['tehsil'], item['municipality'],
          item['location'], item['caste'], item['subCaste'],
          item['organizationPost'], item['occupation'], item['contactType'],
          item['sectionNumber'], item['sectionName'], item['assemblyNumber'],
          item['assemblyName'], item['partNumber'],
          ...details.expand((detail) => [detail['label'], detail['value']]),
        ];
        final scopedText = switch (mode) {
          'name' => [item['name'], item['surname']],
          'guardian' => [item['guardianName']],
          'epic' => [item['voterId']],
          'mobile' => [item['mobile'], item['altMobile']],
          'house' => [item['houseNumber']],
          _ => allText,
        };
        final text = _normalize(scopedText.join(' '));
        if (!queryTokens.every(text.contains)) return false;
      }
      if (query['favorite'] == 'true' && item['isFavorite'] != true) {
        return false;
      }
      for (final key in [
        'supportLevel',
        'partyPreference',
        'gender',
        'verificationStatus',
        'profileCompletionStatus',
        'assemblyNumber',
        'partNumber',
        'voterSerial',
        'pinCode',
        'sectionNumber',
        'sectionName',
        'location',
        'village',
        'gramPanchayat',
        'tehsil',
        'municipality',
        'caste',
        'organizationPost',
        'occupation',
        'contactType',
        'area'
      ]) {
        final expected = query[key];
        if (expected != null && expected.isNotEmpty) {
          final actual = '${item[key] ?? ''}'.toLowerCase();
          if (key == 'verificationStatus') {
            final expLower = expected.toLowerCase();
            if (expLower == 'needs_review' || expLower == 'review') {
              final status = '${item['verificationStatus'] ?? ''}'.toLowerCase();
              final hasReasons = (item['ocrReviewReasons'] as List?)?.isNotEmpty == true;
              final isNeedsReview = status == 'needs_review' || status == 'duplicate' || item['ocrNeedsReview'] == true || hasReasons;
              if (!isNeedsReview) return false;
              continue;
            }
          }
          if (key == 'pinCode' || key == 'voterSerial') {
            if (_normalize(actual) != _normalize(expected)) return false;
            continue;
          }
          if (!actual.contains(expected.toLowerCase())) return false;
        }
      }
      return true;
    }).toList();

    filtered.sort((a, b) {
      final mapA = a is Map ? a : {};
      final mapB = b is Map ? b : {};
      final sA = _parseSerial(mapA['voterSerial']);
      final sB = _parseSerial(mapB['voterSerial']);
      if (sA != sB) return sA.compareTo(sB);
      return String.fromCharCodes('${mapA['name'] ?? ''}'.codeUnits)
          .compareTo(String.fromCharCodes('${mapB['name'] ?? ''}'.codeUnits));
    });

    return filtered;
  }

  static int _parseSerial(dynamic val) {
    if (val == null) return 9999999;
    final digits = _normalize(val.toString()).replaceAll(RegExp(r'\D'), '');
    return int.tryParse(digits) ?? 9999999;
  }

  static bool _hasActiveFilters(Map<String, String?> query) {
    for (final entry in query.entries) {
      final k = entry.key;
      if (k == 'rollType' || k == 'paged' || k == 'page' || k == 'limit' || k == 'qMode') {
        continue;
      }
      if (entry.value != null && entry.value!.trim().isNotEmpty) {
        return true;
      }
    }
    return false;
  }

  static String _normalize(String value) {
    const hindi = '०१२३४५६७८९';
    var normalized = value;
    for (var index = 0; index < hindi.length; index++) {
      normalized = normalized.replaceAll(hindi[index], '$index');
    }
    return normalized
        .toLowerCase()
        .replaceAll(RegExp(r'[\u200b-\u200f\u2060\ufeff]'), '')
        .replaceAll(RegExp(r'[\s,./:;|_()+\-]+'), ' ')
        .trim();
  }
}
