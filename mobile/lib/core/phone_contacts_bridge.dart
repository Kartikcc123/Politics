import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class PhoneContactsBridge {
  static const MethodChannel channel =
      MethodChannel('com.example.political_booth_crm/contacts');

  /// Notifies listeners whenever device contacts are loaded or updated
  static final ValueNotifier<int> version = ValueNotifier<int>(0);

  /// Cached 10-digit mobile -> displayName from local device phonebook
  static final Map<String, String> phoneToNameMap = <String, String>{};

  /// Cached raw list of device contacts
  static List<Map<String, dynamic>> cachedDeviceContacts = <Map<String, dynamic>>[];

  static String normalize10Digit(String? raw) {
    final digits = (raw ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 10) {
      return digits.substring(digits.length - 10);
    }
    return digits;
  }

  /// Lookup phonebook displayName for a phone number (returns null if not in phonebook)
  static String? lookupPhonebookName(String? phone) {
    final norm = normalize10Digit(phone);
    if (norm.length == 10) {
      if (phoneToNameMap.containsKey(norm)) {
        final name = phoneToNameMap[norm]?.trim();
        if (name != null && name.isNotEmpty && name != 'साथी') return name;
      }
      for (final c in cachedDeviceContacts) {
        final name = '${c['displayName'] ?? ''}'.trim();
        if (name.isEmpty || name == 'साथी') continue;
        final phones = (c['phones'] as List?) ?? [];
        for (final p in phones) {
          final raw = p is Map ? '${p['number'] ?? ''}' : '$p';
          if (normalize10Digit(raw) == norm) {
            phoneToNameMap[norm] = name;
            return name;
          }
        }
      }
    }
    return null;
  }

  /// Resolves the best display name for a phone number (prefers saved Phonebook name if available)
  static String resolveNameForNumber(
    String? phone, [
    String? fallbackName,
  ]) {
    final saved = lookupPhonebookName(phone);
    if (saved != null && saved.isNotEmpty && saved != 'साथी') {
      return saved;
    }
    final fb = (fallbackName ?? '').trim();
    if (fb.isNotEmpty && fb != '-' && fb != 'साथी') return fb;
    return 'साथी';
  }

  static Future<bool> requestPermission() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      return await channel.invokeMethod<bool>('requestPermission') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<List<Map<String, dynamic>>> fetchDeviceContacts({
    bool requestIfNeeded = true,
    bool forceRefresh = false,
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return const [];
    }
    if (!forceRefresh && cachedDeviceContacts.isNotEmpty) {
      return cachedDeviceContacts;
    }
    try {
      if (requestIfNeeded) {
        final granted = await requestPermission();
        if (!granted) return cachedDeviceContacts;
      }
      final rawList = await channel.invokeMethod<List<dynamic>>('getContacts') ?? [];
      final parsed = <Map<String, dynamic>>[];
      final nextMap = <String, String>{};

      for (final raw in rawList) {
        if (raw is! Map) continue;
        final map = Map<String, dynamic>.from(raw);
        parsed.add(map);
        final name = '${map['displayName'] ?? ''}'.trim();
        final phonesRaw = (map['phones'] as List?) ?? const [];
        for (final p in phonesRaw) {
          if (p is Map) {
            final numStr = '${p['number'] ?? ''}'.trim();
            final norm = normalize10Digit(numStr);
            if (norm.length == 10 && name.isNotEmpty) {
              nextMap[norm] = name;
            }
          }
        }
      }

      cachedDeviceContacts = parsed;
      phoneToNameMap
        ..clear()
        ..addAll(nextMap);
      return parsed;
    } catch (_) {
      return cachedDeviceContacts;
    }
  }

  /// Inserts or updates contact in local phone's native Phonebook
  static Future<bool> upsertDeviceContact({
    String? contactId,
    required String name,
    required String phone,
    String address = '',
    String organization = '',
    String note = '',
    String email = '',
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    final norm = normalize10Digit(phone);
    if (norm.length < 10 && phone.trim().isEmpty) return false;

    try {
      final ok = await channel.invokeMethod<bool>('upsertContact', {
            'id': contactId ?? '',
            'name': name.trim(),
            'phone': phone.trim(),
            'address': address.trim(),
            'note': note.trim(),
            'organization': organization.trim(),
            'email': email.trim(),
          }) ??
          false;
      if (ok) {
        if (norm.length == 10 && name.trim().isNotEmpty) {
          phoneToNameMap[norm] = name.trim();
        }
        await fetchDeviceContacts(requestIfNeeded: false, forceRefresh: true);
        version.value++;
      }
      return ok;
    } catch (_) {
      return false;
    }
  }

  /// Automatically saves or updates an App Voter/Contact in the local mobile phonebook
  static Future<bool> autoSaveVoterToPhone(
    Map<String, dynamic> voter, {
    String? contactId,
  }) async {
    final mobile = '${voter['mobile'] ?? ''}'.trim();
    final name = [
      '${voter['name'] ?? ''}'.trim(),
      '${voter['surname'] ?? ''}'.trim(),
    ].where((s) => s.isNotEmpty).join(' ').trim();
    if (name.isEmpty) return false;

    final addressParts = <String>[
      if ('${voter['houseNumber'] ?? ''}'.trim().isNotEmpty)
        'मकान: ${voter['houseNumber']}'.trim(),
      if ('${voter['address'] ?? ''}'.trim().isNotEmpty)
        '${voter['address']}'.trim(),
      if ('${voter['village'] ?? voter['location'] ?? ''}'.trim().isNotEmpty)
        '${voter['village'] ?? voter['location']}'.trim(),
      if ('${voter['gramPanchayat'] ?? ''}'.trim().isNotEmpty)
        'पं. ${voter['gramPanchayat']}'.trim(),
      if ('${voter['wardNumber'] ?? ''}'.trim().isNotEmpty)
        'वार्ड ${voter['wardNumber']}'.trim(),
    ];
    final address = addressParts.join(', ');

    final noteParts = <String>[
      if ('${voter['guardianName'] ?? voter['relativeName'] ?? ''}'.trim().isNotEmpty)
        'पिता/पति: ${voter['guardianName'] ?? voter['relativeName']}'.trim(),
      if ('${voter['voterId'] ?? ''}'.trim().isNotEmpty)
        'EPIC: ${voter['voterId']}'.trim(),
      if ('${voter['partNumber'] ?? ''}'.trim().isNotEmpty)
        'भाग: ${voter['partNumber']}'.trim(),
      if ('${voter['caste'] ?? ''}'.trim().isNotEmpty)
        'जाति: ${voter['caste']}'.trim(),
      if ('${voter['notes'] ?? ''}'.trim().isNotEmpty)
        '${voter['notes']}'.trim(),
    ];
    final note = noteParts.join(' | ');
    final org = '${voter['organizationPost'] ?? voter['occupation'] ?? ''}'.trim();

    return upsertDeviceContact(
      contactId: contactId,
      name: name,
      phone: mobile,
      address: address,
      note: note,
      organization: org,
      email: '${voter['email'] ?? ''}'.trim(),
    );
  }
}
