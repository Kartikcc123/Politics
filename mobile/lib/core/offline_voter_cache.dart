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
      await merge(online);
      hasPendingEdits().then((hasPending) {
        if (hasPending) syncPendingEdits();
      });
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

      // Always save all loaded voter items into offline device cache
      if (items.isNotEmpty) {
        await merge(items);
      }

      // Automatically sync any offline pending edits in the background when connected
      hasPendingEdits().then((hasPending) {
        if (hasPending) syncPendingEdits();
      });

      return VoterPageResult(
        items: items,
        total: total,
        page: ((online['page'] ?? page) as num).toInt(),
        limit: ((online['limit'] ?? limit) as num).toInt(),
        pages: ((online['pages'] ?? 1) as num).toInt(),
        offline: false,
      );
    } catch (_) {
      final cached = await read();
      final filtered = _filter(cached, query);
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

  static Future<List<dynamic>> _readRaw() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      return List<dynamic>.from(jsonDecode(raw));
    } catch (_) {
      return [];
    }
  }

  static Future<void> merge(List<dynamic> voters) async {
    if (voters.isEmpty) return;
    final byId = <String, dynamic>{};
    for (final item in await _readRaw()) {
      final id = _itemId(item);
      if (id.isNotEmpty) byId[id] = item;
    }
    for (final item in voters) {
      final id = _itemId(item);
      if (id.isNotEmpty) byId[id] = item;
    }
    const maxCacheLimit = 25000;
    var list = byId.values.toList();
    if (list.length > maxCacheLimit) {
      list = list.sublist(list.length - maxCacheLimit);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(list));
    await prefs.setString(_updatedKey, DateTime.now().toIso8601String());
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
    final kept = (await _readRaw())
        .where((item) => !remove.contains(_itemId(item)))
        .toList();
    await save(kept);
  }

  static Future<List<dynamic>> read() async {
    final rawList = await _readRaw();
    final pendingEdits = await getPendingEdits();
    if (pendingEdits.isEmpty) return rawList;

    final byId = <String, Map<String, dynamic>>{};
    for (final item in rawList) {
      if (item is Map) {
        final id = _itemId(item);
        if (id.isNotEmpty) byId[id] = Map<String, dynamic>.from(item);
      }
    }
    for (final entry in pendingEdits.entries) {
      final voterId = entry.key;
      final editData = entry.value is Map ? entry.value as Map : {};
      final body = editData['body'] is Map
          ? Map<String, dynamic>.from(editData['body'] as Map)
          : null;
      if (body != null) {
        if (byId.containsKey(voterId)) {
          byId[voterId]!.addAll(body);
          byId[voterId]!['_offlineDraft'] = true;
          byId[voterId]!['_draftSavedAt'] = editData['enqueuedAt'];
        } else {
          final newDraft = Map<String, dynamic>.from(body);
          newDraft['_id'] = voterId;
          newDraft['id'] = voterId;
          newDraft['_offlineDraft'] = true;
          newDraft['_draftSavedAt'] = editData['enqueuedAt'];
          byId[voterId] = newDraft;
        }
      }
    }
    return byId.values.toList();
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
      final personal = item['contactType'] == 'personal';
      final contactType = query['contactType'] ?? '';
      if (contactType == 'personal' && !personal) return false;
      if (contactType == 'voter' && personal) return false;

      if (!personal) {
        final rollType = query['rollType'] ?? '';
        final hasAssembly = item['hasAssemblyMembership'] == true ||
            (item['hasAssemblyMembership'] == null &&
                '${item['assemblyNumber'] ?? ''}'.trim().isNotEmpty);
        final hasWard = item['hasMunicipalMembership'] == true ||
            '${item['wardNumber'] ?? ''}'.trim().isNotEmpty ||
            '${item['panchayatSamitiWard'] ?? ''}'.trim().isNotEmpty ||
            '${item['samitiWard'] ?? ''}'.trim().isNotEmpty;
        if (rollType == 'assembly' && !hasAssembly) return false;
        if ((rollType == 'municipal' || rollType == 'ward') && !hasWard) {
          return false;
        }
        final matchStatus = query['matchStatus'];
        if (matchStatus == 'both' && (!hasAssembly || !hasWard)) {
          return false;
        }
        if (matchStatus == 'assembly_only' && (!hasAssembly || hasWard)) {
          return false;
        }
        if ((matchStatus == 'municipal_only' || matchStatus == 'ward_only') &&
            (!hasWard || hasAssembly)) {
          return false;
        }
      }
      final wardQuery = (query['municipalWard'] ??
              query['wardNumber'] ??
              query['panchayatSamitiWard'] ??
              query['samitiWard'] ??
              '')
          .replaceAll(RegExp(r'\D'), '');
      if (wardQuery.isNotEmpty) {
        final wards = [
          item['wardNumber'],
          item['panchayatSamitiWard'],
          item['samitiWard'],
          ...(item['municipalWardNumbers'] as List? ?? const []),
        ].map((value) => '$value'.replaceAll(RegExp(r'\D'), '')).toSet();
        if (!wards.contains(wardQuery)) return false;
      }
      final samitiQuery =
          _normalize(query['panchayatSamiti'] ?? query['samiti'] ?? '');
      if (samitiQuery.isNotEmpty) {
        final itemSamiti = _normalize(
            '${item['panchayatSamiti'] ?? item['samiti'] ?? item['tehsil'] ?? ''}');
        if (itemSamiti.isNotEmpty &&
            !itemSamiti.contains(samitiQuery) &&
            !samitiQuery.contains(itemSamiti)) {
          return false;
        }
      }
      final rating = int.tryParse(query['favoriteRating'] ?? '');
      if (rating != null && (item['favoriteRating'] as num?)?.toInt() != rating) {
        return false;
      }
      final letter = (query['letter'] ?? '').trim().toLowerCase();
      if (letter.isNotEmpty &&
          !'${item['name'] ?? ''}'.trim().toLowerCase().startsWith(letter)) {
        return false;
      }
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
        final serial = _normalize('${item['voterSerial'] ?? ''}');
        bool matchesToken(String token) {
          // Keep cached results identical to the server: a number entered in
          // general search is an exact voter serial, never a substring.
          if (mode.isEmpty && RegExp(r'^\d+$').hasMatch(token)) {
            return serial == token;
          }
          return text.contains(token);
        }
        if (!queryTokens.every(matchesToken)) return false;
      }
      if (query['favorite'] == 'true' && item['isFavorite'] != true) {
        return false;
      }
      if (query['favoriteRating'] != null && query['favoriteRating'].toString().isNotEmpty) {
        final reqRating = int.tryParse(query['favoriteRating'].toString()) ?? 0;
        final itemRating = int.tryParse('${item['favoriteRating']}') ?? (item['isFavorite'] == true ? 1 : 0);
        if (reqRating > 0 && itemRating != reqRating) {
          return false;
        }
      }
      if (query['updatedBy'] != null && query['updatedBy'].toString().isNotEmpty) {
        final targetUser = query['updatedBy'].toString();
        final itemUpdatedBy = item['updatedBy'];
        final updatedById = itemUpdatedBy is Map ? '${itemUpdatedBy['_id'] ?? ''}' : '$itemUpdatedBy';
        if (updatedById != targetUser) return false;
      }
      final groupId = query['groupId'] ?? '';
      if (groupId.isNotEmpty) {
        final groups = item['groups'] as List? ?? const [];
        if (!groups.any((group) => _itemId(group) == groupId)) return false;
      }
      for (final key in [
        'supportLevel',
        'partyPreference',
        'gender',
        'verificationStatus',
        'profileCompletionStatus',
        'assemblyNumber',
        'assemblyName',
        'partNumber',
        'area',
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
          if (key == 'pinCode' ||
              key == 'voterSerial' ||
              key == 'assemblyNumber' ||
              key == 'partNumber' ||
              key == 'sectionNumber' ||
              key == 'supportLevel' ||
              key == 'partyPreference' ||
              key == 'profileCompletionStatus' ||
              key == 'area') {
            final compared = key == 'area' ? _itemId(item[key]) : actual;
            if (key == 'voterSerial' ||
                key == 'partNumber' ||
                key == 'sectionNumber') {
              if (_parseSerial(compared) != _parseSerial(expected)) {
                return false;
              }
              continue;
            }
            if (_normalize(compared) != _normalize(expected)) return false;
            continue;
          }
          if (key == 'gender') {
            if (!actual.startsWith(expected.toLowerCase())) return false;
            continue;
          }
          if (key == 'caste') {
            final expLower = expected.toLowerCase().trim();
            final actLower = actual.toLowerCase().trim();
            if (expLower == actLower) continue;
            if (actLower.contains(expLower) || expLower.contains(actLower)) continue;
            if ((expLower.contains('brahm') || expLower.contains('ब्राह्')) && (actLower.contains('brahm') || actLower.contains('ब्राह्'))) continue;
            if ((expLower.contains('lohar') || expLower.contains('लोहार')) && (actLower.contains('lohar') || actLower.contains('लोहार'))) continue;
            if ((expLower.contains('jain') || expLower.contains('जैन')) && (actLower.contains('jain') || actLower.contains('जैन'))) continue;
            if ((expLower.contains('teli') || expLower.contains('तेली')) && (actLower.contains('teli') || actLower.contains('तेली'))) continue;
            if ((expLower.contains('jat') || expLower.contains('जाट')) && (actLower.contains('jat') || actLower.contains('जाट'))) continue;
            if ((expLower.contains('gurjar') || expLower.contains('गुर्जर')) && (actLower.contains('gurjar') || actLower.contains('गुर्जर'))) continue;
            return false;
          }
          if (key == 'gramPanchayat') {
            final exp = _normalize(expected);
            final act = _normalize(actual);
            if (exp == act) continue;
            if ((exp.contains('कोशि') || exp.contains('कोशी') || exp.contains('kosh')) &&
                (act.contains('कोशि') || act.contains('कोशी') || act.contains('kosh'))) {
              continue;
            }
            if (!actual.contains(expected.toLowerCase())) return false;
            continue;
          }
          if (!actual.contains(expected.toLowerCase())) return false;
        }
      }
      return true;
    }).toList();

    final hasWardSort = (query['gramPanchayat'] ?? '').isNotEmpty ||
        (query['municipalWard'] ?? '').isNotEmpty ||
        (query['wardNumber'] ?? '').isNotEmpty ||
        (query['panchayatSamitiWard'] ?? '').isNotEmpty ||
        (query['samitiWard'] ?? '').isNotEmpty ||
        (query['rollType'] == 'municipal' || query['rollType'] == 'ward');

    filtered.sort((a, b) {
      final mapA = a is Map ? a : {};
      final mapB = b is Map ? b : {};
      if (hasWardSort) {
        final wA = _parseSerial(mapA['wardNumber']);
        final wB = _parseSerial(mapB['wardNumber']);
        if (wA != wB) return wA.compareTo(wB);
        final wsA = _parseSerial(mapA['wardVoterSerial']);
        final wsB = _parseSerial(mapB['wardVoterSerial']);
        if (wsA != wsB) return wsA.compareTo(wsB);
      }
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
        if (k != 'rollType' || entry.value == null || entry.value!.isEmpty || entry.value == 'all') {
          continue;
        }
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

  // --- Offline Draft / Pending Sync Queue (WhatsApp-style) ---
  static const _pendingEditsKey = 'offline_pending_voter_edits_v1';

  static Future<void> enqueuePendingEdit(String voterId, Map<String, dynamic> body) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pendingEditsKey);
    final map = raw != null ? Map<String, dynamic>.from(jsonDecode(raw)) : <String, dynamic>{};
    map[voterId] = {
      'id': voterId,
      'body': body,
      'enqueuedAt': DateTime.now().toIso8601String(),
    };
    await prefs.setString(_pendingEditsKey, jsonEncode(map));
  }

  static Future<Map<String, dynamic>> getPendingEdits() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pendingEditsKey);
    if (raw == null) return {};
    return Map<String, dynamic>.from(jsonDecode(raw));
  }

  static Future<bool> hasPendingEdits() async {
    final edits = await getPendingEdits();
    return edits.isNotEmpty;
  }

  static Future<bool> isVoterPendingSync(String voterId) async {
    if (voterId.isEmpty) return false;
    final edits = await getPendingEdits();
    return edits.containsKey(voterId);
  }

  static Future<int> syncPendingEdits() async {
    final edits = await getPendingEdits();
    if (edits.isEmpty) return 0;
    int syncedCount = 0;
    final remaining = Map<String, dynamic>.from(edits);

    for (final entry in edits.entries) {
      final voterId = entry.key;
      final data = entry.value is Map ? entry.value as Map : {};
      final body = data['body'] is Map ? Map<String, dynamic>.from(data['body'] as Map) : null;
      if (body == null) {
        remaining.remove(voterId);
        continue;
      }
      try {
        final res = await api.put('/api/members/$voterId', body);
        if (res is Map<String, dynamic>) {
          await merge([res]);
        }
        remaining.remove(voterId);
        syncedCount++;
      } catch (e) {
        // If server unreachable, stop and wait for network
        break;
      }
    }

    final prefs = await SharedPreferences.getInstance();
    if (remaining.isEmpty) {
      await prefs.remove(_pendingEditsKey);
    } else {
      await prefs.setString(_pendingEditsKey, jsonEncode(remaining));
    }
    return syncedCount;
  }
}
