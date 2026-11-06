import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/contact_actions.dart';
import '../../core/file_saver.dart';
import '../../core/offline_voter_cache.dart';
import '../../core/phone_contacts_bridge.dart';
import '../../core/theme.dart';
import '../../utils/excel_generator.dart';
import '../messages/whatsapp_page.dart';
import '../voters/voter_edit_page.dart';
import '../voters/voter_management_page.dart';

class ContactPhoneItem {
  final String number;
  final String label;
  const ContactPhoneItem({required this.number, this.label = 'Mobile'});
}

class ContactAddressItem {
  final String address;
  final String street;
  final String neighborhood;
  final String city;
  final String state;
  final String postalCode;
  const ContactAddressItem({
    this.address = '',
    this.street = '',
    this.neighborhood = '',
    this.city = '',
    this.state = '',
    this.postalCode = '',
  });
}

class ContactEmailItem {
  final String address;
  final String label;
  const ContactEmailItem({required this.address, this.label = 'Email'});
}

class ContactOrgItem {
  final String company;
  final String title;
  const ContactOrgItem({this.company = '', this.title = ''});
}

class UnifiedContactItem {
  final String id;
  final String? phoneContactId;
  final String displayName;
  final String? phoneSavedName;
  final String? appSavedName;
  final String source; // 'phone', 'app', 'both'
  final List<ContactPhoneItem> phones;
  final List<ContactAddressItem> addresses;
  final List<ContactEmailItem> emails;
  final List<ContactOrgItem> organizations;
  final List<String> notes;
  final Map<String, dynamic>? appVoter;

  const UnifiedContactItem({
    required this.id,
    this.phoneContactId,
    required this.displayName,
    this.phoneSavedName,
    this.appSavedName,
    required this.source,
    this.phones = const [],
    this.addresses = const [],
    this.emails = const [],
    this.organizations = const [],
    this.notes = const [],
    this.appVoter,
  });

  bool get isFavorite => appVoter?['isFavorite'] == true;
  int get favoriteRating =>
      int.tryParse('${appVoter?['favoriteRating'] ?? ''}') ??
      (isFavorite ? 1 : 0);
}

class DevicePhonebookPage extends StatefulWidget {
  const DevicePhonebookPage({super.key, this.onSelectContact});

  /// Optional callback if this page is opened to pick a contact for WhatsApp/messaging
  final ValueChanged<UnifiedContactItem>? onSelectContact;

  @override
  State<DevicePhonebookPage> createState() => _DevicePhonebookPageState();
}

class _DevicePhonebookPageState extends State<DevicePhonebookPage>
    with WidgetsBindingObserver, AutomaticKeepAliveClientMixin {
  static const MethodChannel _channel =
      MethodChannel('com.example.political_booth_crm/contacts');

  @override
  bool get wantKeepAlive => true;

  bool _loading = true;
  bool _permissionDenied = false;
  List<UnifiedContactItem> _allContacts = [];
  List<UnifiedContactItem> _filteredContacts = [];

  int _phoneCount = 0;
  int _appCount = 0;
  int _bothCount = 0;
  int _favCount = 0;

  // Preserve scroll position across in-place refreshes & edits
  final ScrollController _scrollController = ScrollController();

  // Search & Filters
  final TextEditingController _searchCtrl = TextEditingController();
  final SpeechToText _speech = SpeechToText();
  bool _listening = false;
  Timer? _debounceTimer;

  // Source filter: 'all' (Phone + App), 'phone' (Phone Only), 'app' (App Only), 'both' (Matched in Both), 'fav' (Favorites)
  String _sourceFilter = 'all';

  // Alphabet filter: 'सभी', 'A'..'Z'
  String _selectedLetter = 'सभी';
  static const List<String> _alphabetList = [
    'सभी',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ];

  // Location filter
  String _selectedLocation = 'सभी';
  List<String> _availableLocations = ['सभी'];

  // Quick attribute filter: 'all', 'with_location', 'with_phone', 'with_notes'
  String _activeFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    api.dataVersion.addListener(_onExternalDataChanged);
    PhoneContactsBridge.version.addListener(_onExternalDataChanged);
    _loadAllData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    api.dataVersion.removeListener(_onExternalDataChanged);
    PhoneContactsBridge.version.removeListener(_onExternalDataChanged);
    _debounceTimer?.cancel();
    _speech.stop();
    _searchCtrl.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Auto-reload silently when returning from native phonebook or WhatsApp
      _loadAllData(silent: true);
    }
  }

  void _onExternalDataChanged() {
    if (mounted) {
      _loadAllData(silent: true);
    }
  }

  String _normalize10Digit(String raw) {
    return PhoneContactsBridge.normalize10Digit(raw);
  }

  Future<void> _loadAllData({bool silent = false}) async {
    if (!silent && _allContacts.isEmpty) {
      setState(() {
        _loading = true;
        _permissionDenied = false;
      });
    }

    List<UnifiedContactItem> phoneItems = [];
    bool permDenied = false;

    // 1. Load Device Phonebook Contacts (on Android)
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      try {
        final rawList =
            await PhoneContactsBridge.fetchDeviceContacts(forceRefresh: true);
        if (rawList.isEmpty) {
          final granted =
              await _channel.invokeMethod<bool>('requestPermission') ?? false;
          if (!granted) {
            permDenied = true;
          }
        }
        for (final map in rawList) {
          final cId = '${map['id'] ?? ''}';
          final name = '${map['displayName'] ?? ''}'.trim();

          final phonesRaw = (map['phones'] as List?) ?? [];
          final phones = phonesRaw
              .whereType<Map>()
              .map((p) {
                return ContactPhoneItem(
                  number: '${p['number'] ?? ''}'.trim(),
                  label: '${p['label'] ?? 'Mobile'}'.trim(),
                );
              })
              .where((p) => p.number.isNotEmpty)
              .toList();

          final addrsRaw = (map['addresses'] as List?) ?? [];
          final addresses = addrsRaw.whereType<Map>().map((a) {
            return ContactAddressItem(
              address: '${a['address'] ?? ''}'.trim(),
              street: '${a['street'] ?? ''}'.trim(),
              neighborhood: '${a['neighborhood'] ?? ''}'.trim(),
              city: '${a['city'] ?? ''}'.trim(),
              state: '${a['state'] ?? ''}'.trim(),
              postalCode: '${a['postalCode'] ?? ''}'.trim(),
            );
          }).toList();

          final emailsRaw = (map['emails'] as List?) ?? [];
          final emails = emailsRaw
              .whereType<Map>()
              .map((e) {
                return ContactEmailItem(
                  address: '${e['address'] ?? ''}'.trim(),
                  label: '${e['label'] ?? 'Email'}'.trim(),
                );
              })
              .where((e) => e.address.isNotEmpty)
              .toList();

          final orgsRaw = (map['organizations'] as List?) ?? [];
          final orgs = orgsRaw.whereType<Map>().map((o) {
            return ContactOrgItem(
              company: '${o['company'] ?? ''}'.trim(),
              title: '${o['title'] ?? ''}'.trim(),
            );
          }).toList();

          final notesRaw = (map['notes'] as List?) ?? [];
          final notes = notesRaw
              .map((n) => '$n'.trim())
              .where((n) => n.isNotEmpty)
              .toList();

          final resolvedDisplay = name.isNotEmpty
              ? name
              : (phones.isNotEmpty ? phones.first.number : 'अज्ञात संपर्क');

          phoneItems.add(
            UnifiedContactItem(
              id: 'phone_$cId',
              phoneContactId: cId,
              displayName: resolvedDisplay,
              phoneSavedName: name.isNotEmpty ? name : null,
              source: 'phone',
              phones: phones,
              addresses: addresses,
              emails: emails,
              organizations: orgs,
              notes: notes,
            ),
          );
        }
      } catch (e) {
        debugPrint('Phonebook load error: $e');
      }
    }

    // 2. Load App Saved Voters / Contacts (from API or Offline Cache)
    List<Map<String, dynamic>> appVoters = [];
    try {
      final pageRes = await OfflineVoterCache.loadPage(
        query: const {'mobileFilter': 'has_mobile'},
        page: 1,
        limit: 4000,
      );
      appVoters = pageRes.items
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      try {
        final cached = await OfflineVoterCache.read();
        appVoters = cached
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((v) => '${v['mobile'] ?? ''}'.trim().isNotEmpty)
            .toList();
      } catch (_) {}
    }

    // 3. Merge & Index by 10-digit phone number
    final phoneBy10Digit = <String, int>{};
    final mergedList = <UnifiedContactItem>[...phoneItems];

    for (int i = 0; i < mergedList.length; i++) {
      for (final p in mergedList[i].phones) {
        final norm = _normalize10Digit(p.number);
        if (norm.length == 10) {
          phoneBy10Digit[norm] = i;
        }
      }
    }

    int appOnlyCounter = 0;
    int bothCounter = 0;
    int favCounter = 0;

    for (final v in appVoters) {
      final vId = '${v['_id'] ?? v['id'] ?? ''}';
      final vName = '${v['name'] ?? ''}'.trim();
      final vMobile = '${v['mobile'] ?? ''}'.trim();
      final vAltMobile = '${v['altMobile'] ?? ''}'.trim();
      final vVillage = '${v['village'] ?? v['location'] ?? ''}'.trim();
      final vGp = '${v['gramPanchayat'] ?? ''}'.trim();
      final vWard = '${v['wardNumber'] ?? ''}'.trim();
      final vPart = '${v['partNumber'] ?? ''}'.trim();
      final vGuardian = '${v['guardianName'] ?? v['relativeName'] ?? ''}'.trim();
      final vPost = '${v['organizationPost'] ?? v['occupation'] ?? ''}'.trim();
      final vEpic = '${v['voterId'] ?? ''}'.trim();
      if (v['isFavorite'] == true) favCounter++;

      final normMobile = _normalize10Digit(vMobile);
      if (normMobile.length == 10 && phoneBy10Digit.containsKey(normMobile)) {
        // Matched in BOTH Phonebook and App!
        final idx = phoneBy10Digit[normMobile]!;
        final existing = mergedList[idx];
        final extraNotes = <String>[
          ...existing.notes,
          if (vEpic.isNotEmpty && !existing.notes.any((n) => n.contains(vEpic)))
            'EPIC: $vEpic',
          if (vGuardian.isNotEmpty &&
              !existing.notes.any((n) => n.contains(vGuardian)))
            'पिता/पति: $vGuardian',
          if ((vPart.isNotEmpty || vWard.isNotEmpty) &&
              !existing.notes.any((n) => n.contains('भाग:')))
            'भाग: $vPart | वार्ड: $vWard',
        ];
        final extraAddresses = <ContactAddressItem>[
          ...existing.addresses,
          if (existing.addresses.isEmpty &&
              (vVillage.isNotEmpty || vGp.isNotEmpty))
            ContactAddressItem(
              address:
                  [vVillage, if (vGp.isNotEmpty) 'पंचायत: $vGp'].join(', '),
              city: vVillage,
              state: vGp,
            ),
        ];
        mergedList[idx] = UnifiedContactItem(
          id: existing.id,
          phoneContactId: existing.phoneContactId,
          displayName: existing.displayName,
          phoneSavedName: existing.phoneSavedName ?? existing.displayName,
          appSavedName: vName.isNotEmpty ? vName : null,
          source: 'both',
          phones: existing.phones,
          addresses: extraAddresses,
          emails: existing.emails,
          organizations: existing.organizations.isNotEmpty
              ? existing.organizations
              : (vPost.isNotEmpty
                  ? [ContactOrgItem(company: vPost)]
                  : const []),
          notes: extraNotes,
          appVoter: v,
        );
        bothCounter++;
      } else {
        // App Only Contact
        final phones = <ContactPhoneItem>[
          if (vMobile.isNotEmpty)
            ContactPhoneItem(number: vMobile, label: 'App Mobile'),
          if (vAltMobile.isNotEmpty)
            ContactPhoneItem(number: vAltMobile, label: 'Alt Mobile'),
        ];
        final locString = [
          if (vVillage.isNotEmpty) vVillage,
          if (vGp.isNotEmpty && vGp != vVillage) 'पं. $vGp',
          if (vWard.isNotEmpty) 'वार्ड $vWard',
        ].join(', ');

        final notes = <String>[
          if (vGuardian.isNotEmpty) 'पिता/पति: $vGuardian',
          if (vEpic.isNotEmpty) 'EPIC: $vEpic',
          if (vPart.isNotEmpty) 'बूथ/भाग: $vPart',
        ];

        mergedList.add(
          UnifiedContactItem(
            id: 'app_$vId',
            displayName: vName.isNotEmpty
                ? vName
                : (vMobile.isNotEmpty ? vMobile : 'मतदाता'),
            appSavedName: vName.isNotEmpty ? vName : null,
            source: 'app',
            phones: phones,
            addresses: locString.isNotEmpty
                ? [
                    ContactAddressItem(
                        address: locString, city: vVillage, state: vGp)
                  ]
                : const [],
            organizations: vPost.isNotEmpty
                ? [ContactOrgItem(company: vPost)]
                : const [],
            notes: notes,
            appVoter: v,
          ),
        );
        appOnlyCounter++;
      }
    }

    // 4. Extract unique locations for filter chips
    final locSet = <String>{'सभी'};
    for (final c in mergedList) {
      for (final a in c.addresses) {
        final summary = _extractLocationSummary(a);
        if (summary.isNotEmpty) locSet.add(summary);
      }
    }

    if (mounted) {
      setState(() {
        _allContacts = mergedList;
        _phoneCount = phoneItems.length;
        _appCount = appOnlyCounter + bothCounter;
        _bothCount = bothCounter;
        _favCount = favCounter;
        _availableLocations = locSet.toList();
        _permissionDenied = permDenied && mergedList.isEmpty;
        _applyFilters();
        _loading = false;
      });
    }
  }

  String _extractLocationSummary(ContactAddressItem addr) {
    if (addr.city.trim().isNotEmpty) return addr.city.trim();
    if (addr.neighborhood.trim().isNotEmpty) return addr.neighborhood.trim();
    if (addr.street.trim().isNotEmpty) return addr.street.trim();
    if (addr.address.trim().isNotEmpty) {
      final firstPart = addr.address.split(',').first.trim();
      return firstPart;
    }
    return '';
  }

  String _getContactFullAddress(UnifiedContactItem contact) {
    if (contact.addresses.isEmpty) {
      final v = contact.appVoter;
      if (v != null) {
        return [
          if ('${v['houseNumber'] ?? ''}'.trim().isNotEmpty)
            'मकान ${v['houseNumber']}',
          '${v['village'] ?? ''}'.trim(),
          '${v['gramPanchayat'] ?? ''}'.trim(),
        ].where((s) => s.isNotEmpty).join(', ');
      }
      return '';
    }
    final a = contact.addresses.first;
    if (a.address.trim().isNotEmpty) return a.address.trim();
    final components = [
      if (a.street.trim().isNotEmpty) a.street.trim(),
      if (a.neighborhood.trim().isNotEmpty) a.neighborhood.trim(),
      if (a.city.trim().isNotEmpty) a.city.trim(),
      if (a.state.trim().isNotEmpty) a.state.trim(),
      if (a.postalCode.trim().isNotEmpty) a.postalCode.trim(),
    ];
    return components.join(', ');
  }

  void _applyFilters() {
    final q = _searchCtrl.text.trim().toLowerCase();
    final cleanQ = q.replaceAll(RegExp(r'[^0-9]'), '');

    _filteredContacts = _allContacts.where((c) {
      // 1. Data Source Filter ('all', 'phone', 'app', 'both', 'fav')
      if (_sourceFilter == 'phone' &&
          c.source != 'phone' &&
          c.source != 'both') {
        return false;
      }
      if (_sourceFilter == 'app' && c.source != 'app' && c.source != 'both') {
        return false;
      }
      if (_sourceFilter == 'both' && c.source != 'both') {
        return false;
      }
      if (_sourceFilter == 'fav' && !c.isFavorite) {
        return false;
      }

      // 2. Alphabet Letter Filter (A, B, C...)
      if (_selectedLetter != 'सभी') {
        final trimmed = c.displayName.trim().toUpperCase();
        if (trimmed.isEmpty || !trimmed.startsWith(_selectedLetter)) {
          return false;
        }
      }

      // 3. Location Filter
      if (_selectedLocation != 'सभी') {
        final hasLoc = c.addresses.any((a) {
          final summary = _extractLocationSummary(a).toLowerCase();
          return summary == _selectedLocation.toLowerCase() ||
              a.address
                  .toLowerCase()
                  .contains(_selectedLocation.toLowerCase()) ||
              a.city.toLowerCase() == _selectedLocation.toLowerCase();
        });
        if (!hasLoc) return false;
      }

      // 4. Quick Filter
      if (_activeFilter == 'with_location' && c.addresses.isEmpty) {
        return false;
      }
      if (_activeFilter == 'with_phone' && c.phones.isEmpty) {
        return false;
      }
      if (_activeFilter == 'with_notes' && c.notes.isEmpty) {
        return false;
      }

      // 5. Search Text Filter
      if (q.isNotEmpty) {
        final nameMatch = c.displayName.toLowerCase().contains(q) ||
            (c.appSavedName?.toLowerCase().contains(q) ?? false) ||
            (c.phoneSavedName?.toLowerCase().contains(q) ?? false);
        final notesMatch = c.notes.any((n) => n.toLowerCase().contains(q));
        final orgMatch = c.organizations.any((o) =>
            o.company.toLowerCase().contains(q) ||
            o.title.toLowerCase().contains(q));
        final addressMatch = c.addresses.any((a) =>
            a.address.toLowerCase().contains(q) ||
            a.city.toLowerCase().contains(q) ||
            a.street.toLowerCase().contains(q) ||
            a.neighborhood.toLowerCase().contains(q) ||
            a.state.toLowerCase().contains(q));
        final epicMatch =
            '${c.appVoter?['voterId'] ?? ''}'.toLowerCase().contains(q) ||
                '${c.appVoter?['guardianName'] ?? ''}'.toLowerCase().contains(q);

        bool phoneMatch = false;
        if (cleanQ.isNotEmpty) {
          phoneMatch = c.phones.any((p) {
            final cleanNum = p.number.replaceAll(RegExp(r'[^0-9]'), '');
            return cleanNum.contains(cleanQ);
          });
        }

        if (!nameMatch &&
            !notesMatch &&
            !orgMatch &&
            !addressMatch &&
            !epicMatch &&
            !phoneMatch) {
          return false;
        }
      }

      return true;
    }).toList();

    _filteredContacts.sort(
      (a, b) =>
          a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()),
    );
  }

  void _onSearchChanged(String _) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 180), () {
      if (mounted) {
        setState(() => _applyFilters());
      }
    });
  }

  // Export ALL filtered contacts to Excel (.xlsx) or CSV (no 50-record limit)
  Future<void> _exportContacts({required bool asCsv}) async {
    if (_filteredContacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('निर्यात करने के लिए कोई संपर्क नहीं है।')),
      );
      return;
    }

    final headers = [
      'क्र.सं.',
      'स्रोत (Source)',
      'फ़ोनबुक / मुख्य नाम (Name)',
      'ऐप मतदाता नाम (App Name)',
      'मुख्य मोबाइल (Primary Mobile)',
      'अन्य नंबर (Alternate Phones)',
      'EPIC / वोटर आईडी',
      'पिता / पति का नाम',
      'वार्ड संख्या',
      'भाग / बूथ संख्या',
      'लोकेशन / गाँव / पता (Location/Address)',
      'पद / संस्था (Organization)',
      'ईमेल (Email)',
      'नोट / विवरण (Notes/Details)',
    ];

    final rows = <List<dynamic>>[];
    for (int i = 0; i < _filteredContacts.length; i++) {
      final c = _filteredContacts[i];
      final v = c.appVoter;
      final sourceLabel = c.source == 'both'
          ? 'फ़ोन + ऐप (Both)'
          : (c.source == 'phone' ? 'लोकल फ़ोनबुक (Phone)' : 'ऐप डेटा (App)');
      final primaryPhone = c.phones.isNotEmpty ? c.phones.first.number : '';
      final otherPhones = c.phones.length > 1
          ? c.phones.skip(1).map((p) => p.number).join(', ')
          : '';
      final addr = _getContactFullAddress(c);
      final org =
          c.organizations.map((o) => '${o.company} ${o.title}'.trim()).join(', ');
      final email = c.emails.map((e) => e.address).join(', ');
      final note = c.notes.join(' | ');

      rows.add([
        i + 1,
        sourceLabel,
        c.displayName,
        c.appSavedName ?? '${v?['name'] ?? ''}',
        primaryPhone,
        otherPhones,
        '${v?['voterId'] ?? ''}',
        '${v?['guardianName'] ?? ''}',
        '${v?['wardNumber'] ?? ''}',
        '${v?['partNumber'] ?? ''}',
        addr,
        org,
        email,
        note,
      ]);
    }

    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      if (asCsv) {
        final sb = StringBuffer();
        sb.write('\uFEFF'); // UTF-8 BOM for Excel Hindi support
        sb.writeln(headers.map((h) => '"${h.replaceAll('"', '""')}"').join(','));
        for (final r in rows) {
          sb.writeln(
              r.map((cell) => '"${'$cell'.replaceAll('"', '""')}"').join(','));
        }
        final bytes = Uint8List.fromList(utf8.encode(sb.toString()));
        final savedPath =
            await saveBytes('sampark_contacts_$timestamp.csv', bytes);
        if (mounted && savedPath != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(
                    'CSV फ़ाइल तैयार हो गई (कुल ${_filteredContacts.length} संपर्क)')),
          );
        }
      } else {
        final xlsxBytes = ExcelGenerator.buildCustomXlsx(
          headers,
          rows,
          sheetName: 'संपर्क सूची (${_filteredContacts.length})',
        );
        final savedPath = await saveBytes(
          'sampark_contacts_$timestamp.xlsx',
          Uint8List.fromList(xlsxBytes),
        );
        if (mounted && savedPath != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                backgroundColor: green,
                content: Text(
                    'Excel (.xlsx) फ़ाइल डाउनलोड हो गई (संपूर्ण ${_filteredContacts.length} संपर्क) ✅')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('एक्सपोर्ट में त्रुटि: $e')),
        );
      }
    }
  }

  Future<void> _toggleVoiceSearch() async {
    if (_listening) {
      await _speech.stop();
      if (mounted) setState(() => _listening = false);
      return;
    }

    final available = await _speech.initialize(
      onStatus: (status) {
        if (mounted && (status == 'done' || status == 'notListening')) {
          setState(() => _listening = false);
        }
      },
      onError: (_) {
        if (mounted) setState(() => _listening = false);
      },
    );

    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('वॉइस सर्च उपलब्ध नहीं है।')),
        );
      }
      return;
    }

    setState(() => _listening = true);
    await _speech.listen(
      listenOptions: SpeechListenOptions(
        localeId: 'hi_IN',
        listenMode: ListenMode.search,
        partialResults: true,
      ),
      onResult: (result) {
        _searchCtrl.text = result.recognizedWords;
        _searchCtrl.selection =
            TextSelection.collapsed(offset: _searchCtrl.text.length);
        if (mounted) {
          setState(() => _applyFilters());
        }
      },
    );
  }

  Future<void> _sendWhatsAppMessage(UnifiedContactItem contact,
      [String? specificPhone]) async {
    final phone = specificPhone ??
        (contact.phones.isNotEmpty ? contact.phones.first.number : '');
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('इस संपर्क का मोबाइल नंबर उपलब्ध नहीं है।')),
      );
      return;
    }

    final resolvedName = PhoneContactsBridge.resolveNameForNumber(
      phone,
      contact.displayName,
    );
    final greetingName = resolvedName.isNotEmpty ? resolvedName : 'मित्र';
    final message = "नमस्ते $greetingName जी,\n\nआशा है आप सकुशल होंगे।";

    await openWhatsApp(context, phone,
        message: message, recipientName: greetingName);
  }

  Future<void> _editInNativePhonebook(UnifiedContactItem contact) async {
    try {
      if (contact.phoneContactId != null &&
          contact.phoneContactId!.isNotEmpty) {
        await _channel
            .invokeMethod('openExternalEdit', {'id': contact.phoneContactId});
      } else {
        final primaryPhone =
            contact.phones.isNotEmpty ? contact.phones.first.number : '';
        await _channel.invokeMethod('openExternalInsert', {
          'name': contact.displayName,
          'phone': primaryPhone,
          'address': _getContactFullAddress(contact),
        });
      }
      await Future.delayed(const Duration(milliseconds: 500));
      await _loadAllData(silent: true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('फ़ोन एडिटर खोलने में समस्या: $e')),
        );
      }
    }
  }

  Future<void> _openCreateNewContactDialog() async {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final orgCtrl = TextEditingController();
    final noteCtrl = TextEditingController();

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.person_add_alt_1_rounded, color: blue),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'नया संपर्क जोड़ें (फ़ोनबुक + ऐप)',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'पूरा नाम (Full Name) *',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'मोबाइल नंबर (Mobile Number) *',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressCtrl,
                decoration: const InputDecoration(
                  labelText: 'लोकेशन / गाँव / पता',
                  hintText: 'उदा. रायपुर, वार्ड 5',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: orgCtrl,
                decoration: const InputDecoration(
                  labelText: 'पद / संस्था / व्यवसाय',
                  prefixIcon: Icon(Icons.work_outline_rounded),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'नोट / विवरण',
                  prefixIcon: Icon(Icons.note_alt_outlined),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('रद्द करें'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.save_rounded),
            label: const Text('सेव करें'),
          ),
        ],
      ),
    );

    if (created == true && phoneCtrl.text.trim().isNotEmpty) {
      await PhoneContactsBridge.upsertDeviceContact(
        name: nameCtrl.text.trim(),
        phone: phoneCtrl.text.trim(),
        address: addressCtrl.text.trim(),
        organization: orgCtrl.text.trim(),
        note: noteCtrl.text.trim(),
      );
      await _loadAllData(silent: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: green,
            content: Text('नया संपर्क मोबाइल फ़ोनबुक में सेव हो गया! ✅'),
          ),
        );
      }
    }
  }

  Future<void> _openInAppEditDialog(UnifiedContactItem contact) async {
    // If linked to an App Voter, user can choose full Voter Edit or Quick Contact Edit
    if (contact.appVoter != null && contact.phoneContactId == null) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => VoterEditPage(
            voter: contact.appVoter!,
            onSaved: () => _loadAllData(silent: true),
          ),
        ),
      );
      await _loadAllData(silent: true);
      return;
    }

    final nameCtrl = TextEditingController(text: contact.displayName);
    final phoneCtrl = TextEditingController(
      text: contact.phones.isNotEmpty ? contact.phones.first.number : '',
    );
    final addressCtrl = TextEditingController(
      text: _getContactFullAddress(contact),
    );
    final orgCtrl = TextEditingController(
      text: contact.organizations.isNotEmpty
          ? contact.organizations.first.company
          : '',
    );
    final noteCtrl = TextEditingController(
      text: contact.notes.isNotEmpty ? contact.notes.first : '',
    );

    final action = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.edit_note_rounded, color: blue),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'संपर्क सुधारें (फ़ोनबुक + ऐप सिंक)',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'नाम (Full Name)',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'मोबाइल नंबर',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressCtrl,
                decoration: const InputDecoration(
                  labelText: 'लोकेशन / पता / गाँव / शहर',
                  hintText: 'उदा. गांधी नगर, रायपुर',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: orgCtrl,
                decoration: const InputDecoration(
                  labelText: 'पद / संस्था / व्यवसाय',
                  prefixIcon: Icon(Icons.work_outline_rounded),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'नोट / टिप्पणी (Remark)',
                  prefixIcon: Icon(Icons.note_alt_outlined),
                ),
              ),
              if (contact.appVoter != null) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.badge_outlined, size: 18),
                    label: const Text('पूरा मतदाता फॉर्म खोलें (Full Voter Edit)'),
                    onPressed: () => Navigator.pop(ctx, 'full_voter_edit'),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('रद्द करें'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: blue,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, 'save'),
            icon: const Icon(Icons.check_rounded, size: 18),
            label: const Text('सेव करें (Phone + App)'),
          ),
        ],
      ),
    );

    if (action == 'full_voter_edit' && contact.appVoter != null) {
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => VoterEditPage(
            voter: contact.appVoter!,
            onSaved: () => _loadAllData(silent: true),
          ),
        ),
      );
      await _loadAllData(silent: true);
      return;
    }

    if (action == 'save') {
      try {
        final ok = await PhoneContactsBridge.upsertDeviceContact(
          contactId: contact.phoneContactId,
          name: nameCtrl.text.trim(),
          phone: phoneCtrl.text.trim(),
          address: addressCtrl.text.trim(),
          organization: orgCtrl.text.trim(),
          note: noteCtrl.text.trim(),
        );

        // Also update linked App Voter if matched in both
        if (contact.appVoter != null && contact.appVoter!['_id'] != null) {
          final updatedBody = {
            'name': nameCtrl.text.trim(),
            'mobile': phoneCtrl.text.trim(),
            'address': addressCtrl.text.trim(),
            if (orgCtrl.text.trim().isNotEmpty)
              'organizationPost': orgCtrl.text.trim(),
          };
          try {
            final res = await api.put(
                '/api/members/${contact.appVoter!['_id']}', updatedBody);
            await OfflineVoterCache.merge([res]);
          } catch (_) {
            await OfflineVoterCache.enqueuePendingEdit(
                '${contact.appVoter!['_id']}', updatedBody);
          }
        }

        await _loadAllData(silent: true);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: ok ? green : orange,
              content: Text(
                ok
                    ? 'संपर्क लोकल फ़ोनबुक और ऐप में सफलतापूर्वक अपडेट हो गया! ✅'
                    : 'संपर्क अपडेट किया गया।',
              ),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('अपडेट विफल: $e')),
          );
        }
      }
    }
  }

  Future<void> _openFullContactProfile(UnifiedContactItem contact) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => UnifiedContactProfilePage(
          contact: contact,
          onChanged: () => _loadAllData(silent: true),
          onEditInApp: () => _openInAppEditDialog(contact),
          onEditInPhone: () => _editInNativePhonebook(contact),
        ),
      ),
    );
    await _loadAllData(silent: true);
  }

  Widget _buildSourceBadge(UnifiedContactItem contact) {
    final source = contact.source;
    if (source == 'both') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: const Color(0xffe0f2fe),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text(
          '📱+🏛️ फ़ोन व ऐप',
          style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Color(0xff0369a1)),
        ),
      );
    }
    if (source == 'phone') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: softGreen,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text(
          '📱 फ़ोनबुक',
          style: TextStyle(
              fontSize: 10, fontWeight: FontWeight.w800, color: green),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: softOrange,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Text(
        '🏛️ ऐप मतदाता',
        style:
            TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: orange),
      ),
    );
  }

  Widget _buildAvatar(UnifiedContactItem contact, {double size = 46}) {
    final name = contact.displayName.trim();
    final letter = name.isNotEmpty ? name.characters.first.toUpperCase() : '?';

    // Google Contacts-inspired soft avatar palette
    final List<Color> bgColors = [
      const Color(0xffe8f0fe),
      const Color(0xffe6f4ea),
      const Color(0xfffef7e0),
      const Color(0xfffce8e6),
      const Color(0xfff3e8fd),
      const Color(0xffe0f2fe),
    ];
    final List<Color> fgColors = [
      const Color(0xff1967d2),
      const Color(0xff137333),
      const Color(0xffb06000),
      const Color(0xffc5221f),
      const Color(0xff7627bb),
      const Color(0xff0369a1),
    ];
    final hash = name.codeUnits.fold<int>(0, (a, b) => a + b);
    final idx = hash % bgColors.length;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bgColors[idx],
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        letter,
        style: TextStyle(
          color: fgColors[idx],
          fontWeight: FontWeight.w900,
          fontSize: size * 0.42,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: const Color(0xfff8fafc),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xff1a73e8),
        foregroundColor: Colors.white,
        onPressed: _openCreateNewContactDialog,
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: const Text('नया संपर्क',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: _loading
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 12),
                  Text('फ़ोनबुक और ऐप के सभी संपर्क लोड हो रहे हैं…',
                      style:
                          TextStyle(color: navy, fontWeight: FontWeight.w600)),
                ],
              ),
            )
          : _permissionDenied
              ? _buildPermissionDeniedView()
              : Column(
                  children: [
                    // 1. Google Contacts-Style Search Pill & Action Bar
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: const Color(0xfff1f5f9),
                                    borderRadius: BorderRadius.circular(28),
                                  ),
                                  child: TextField(
                                    controller: _searchCtrl,
                                    onChanged: _onSearchChanged,
                                    decoration: InputDecoration(
                                      hintText:
                                          'संपर्क खोजें (नाम, नंबर, लोकेशन, गाँव, EPIC)...',
                                      hintStyle: const TextStyle(
                                          fontSize: 13.5, color: muted),
                                      prefixIcon: const Icon(
                                          Icons.search_rounded,
                                          color: navy),
                                      border: InputBorder.none,
                                      enabledBorder: InputBorder.none,
                                      focusedBorder: InputBorder.none,
                                      isDense: true,
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                              horizontal: 14, vertical: 12),
                                      suffixIcon: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          if (_searchCtrl.text.isNotEmpty)
                                            IconButton(
                                              tooltip: 'खोज साफ करें',
                                              icon: const Icon(
                                                  Icons.close_rounded,
                                                  size: 18),
                                              onPressed: () {
                                                _searchCtrl.clear();
                                                setState(
                                                    () => _applyFilters());
                                              },
                                            ),
                                          IconButton(
                                            tooltip: _listening
                                                ? 'सुनना बंद करें'
                                                : 'बोलकर खोजें',
                                            icon: Icon(
                                              _listening
                                                  ? Icons.mic_rounded
                                                  : Icons.mic_none_rounded,
                                              color: _listening
                                                  ? Colors.red
                                                  : blue,
                                              size: 20,
                                            ),
                                            onPressed: _toggleVoiceSearch,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              IconButton.filledTonal(
                                style: IconButton.styleFrom(
                                  backgroundColor: const Color(0xffdcfce7),
                                  foregroundColor: const Color(0xff15803d),
                                ),
                                tooltip: 'WhatsApp बल्क संदेश भेजें',
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => Scaffold(
                                        appBar: AppBar(
                                          title: const Text(
                                              'WhatsApp बल्क व सुरक्षित शेयर'),
                                        ),
                                        body: const WhatsAppPage(),
                                      ),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.chat_rounded, size: 20),
                              ),
                              const SizedBox(width: 4),
                              PopupMenuButton<String>(
                                tooltip: 'Excel / CSV डाउनलोड करें',
                                icon: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: const BoxDecoration(
                                    color: softBlue,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.download_rounded,
                                      color: blue, size: 20),
                                ),
                                onSelected: (val) {
                                  if (val == 'xlsx') {
                                    _exportContacts(asCsv: false);
                                  } else if (val == 'csv') {
                                    _exportContacts(asCsv: true);
                                  } else if (val == 'refresh') {
                                    _loadAllData();
                                  }
                                },
                                itemBuilder: (_) => [
                                  PopupMenuItem(
                                    value: 'xlsx',
                                    child: Row(
                                      children: [
                                        const Icon(Icons.table_view_rounded,
                                            color: green, size: 20),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                              'Excel (.xlsx) डाउनलोड (${_filteredContacts.length} संपर्क)'),
                                        ),
                                      ],
                                    ),
                                  ),
                                  PopupMenuItem(
                                    value: 'csv',
                                    child: Row(
                                      children: [
                                        const Icon(Icons.description_outlined,
                                            color: blue, size: 20),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                              'CSV फ़ाइल डाउनलोड (${_filteredContacts.length} संपर्क)'),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const PopupMenuItem(
                                    value: 'refresh',
                                    child: Row(
                                      children: [
                                        Icon(Icons.sync_rounded,
                                            color: navy, size: 20),
                                        SizedBox(width: 8),
                                        Text('फ़ोनबुक सिंक करें'),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // 2. Source Filter Chips: All / Phonebook / App / Both / Favorites
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildSourceFilterChip(
                                  label: 'सभी (${_allContacts.length})',
                                  icon: Icons.contacts_rounded,
                                  value: 'all',
                                ),
                                const SizedBox(width: 6),
                                _buildSourceFilterChip(
                                  label: 'फ़ोनबुक ($_phoneCount)',
                                  icon: Icons.phone_android_rounded,
                                  value: 'phone',
                                ),
                                const SizedBox(width: 6),
                                _buildSourceFilterChip(
                                  label: 'ऐप मतदाता ($_appCount)',
                                  icon: Icons.how_to_vote_rounded,
                                  value: 'app',
                                ),
                                const SizedBox(width: 6),
                                _buildSourceFilterChip(
                                  label: 'दोनों में कॉमन ($_bothCount)',
                                  icon: Icons.merge_type_rounded,
                                  value: 'both',
                                ),
                                const SizedBox(width: 6),
                                _buildSourceFilterChip(
                                  label: 'पसंदीदा ($_favCount)',
                                  icon: Icons.star_rounded,
                                  value: 'fav',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // 3. A-Z Alphabet Filter Bar
                    Container(
                      color: Colors.white,
                      height: 34,
                      padding: const EdgeInsets.only(bottom: 4),
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: _alphabetList.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 4),
                        itemBuilder: (context, idx) {
                          final letter = _alphabetList[idx];
                          final active = _selectedLetter == letter;
                          return InkWell(
                            onTap: () {
                              setState(() {
                                _selectedLetter = letter;
                                _applyFilters();
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 3),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: active
                                    ? const Color(0xff1a73e8)
                                    : const Color(0xfff8fafc),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: active
                                        ? const Color(0xff1a73e8)
                                        : border),
                              ),
                              child: Text(
                                letter,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: active ? Colors.white : navy,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    // 4. Location & Quick Attribute Filter Section
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.only(bottom: 6),
                      child: _buildFilterSection(),
                    ),

                    // 5. Status & Count Bar + Direct Excel Export Button
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: const BoxDecoration(
                        color: Color(0xfff1f5f9),
                        border: Border(
                          top: BorderSide(color: border),
                          bottom: BorderSide(color: border),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.people_alt_outlined,
                              size: 15, color: muted),
                          const SizedBox(width: 6),
                          Text(
                            'कुल संपर्क: ${_filteredContacts.length} / ${_allContacts.length}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: navy,
                            ),
                          ),
                          const Spacer(),
                          if (_selectedLocation != 'सभी' ||
                              _selectedLetter != 'सभी' ||
                              _activeFilter != 'all' ||
                              _sourceFilter != 'all')
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _selectedLocation = 'सभी';
                                    _selectedLetter = 'सभी';
                                    _activeFilter = 'all';
                                    _sourceFilter = 'all';
                                    _applyFilters();
                                  });
                                },
                                child: const Text(
                                  'फ़िल्टर हटाएँ ✕',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.red,
                                  ),
                                ),
                              ),
                            ),
                          InkWell(
                            onTap: () => _exportContacts(asCsv: false),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: softGreen,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                    color: green.withValues(alpha: 0.3)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.table_view_rounded,
                                      size: 13, color: green),
                                  SizedBox(width: 4),
                                  Text(
                                    'Excel निकालें',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: green,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // 6. Google Contacts-Style List
                    Expanded(
                      child: _filteredContacts.isEmpty
                          ? const Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.contact_phone_outlined,
                                      size: 54, color: muted),
                                  SizedBox(height: 8),
                                  Text(
                                    'कोई संपर्क नहीं मिला',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: navy,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'खोज शब्द या फ़िल्टर बदलकर दोबारा प्रयास करें।',
                                    style:
                                        TextStyle(color: muted, fontSize: 13),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.only(bottom: 88),
                              itemCount: _filteredContacts.length,
                              itemBuilder: (context, index) {
                                final contact = _filteredContacts[index];
                                final prevContact = index > 0
                                    ? _filteredContacts[index - 1]
                                    : null;
                                final curInitial = contact.displayName
                                        .trim()
                                        .isNotEmpty
                                    ? contact.displayName
                                        .trim()
                                        .characters
                                        .first
                                        .toUpperCase()
                                    : '#';
                                final prevInitial = prevContact != null &&
                                        prevContact.displayName
                                            .trim()
                                            .isNotEmpty
                                    ? prevContact.displayName
                                        .trim()
                                        .characters
                                        .first
                                        .toUpperCase()
                                    : '';
                                final showHeader =
                                    index == 0 || curInitial != prevInitial;

                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (showHeader)
                                      Padding(
                                        padding: const EdgeInsets.fromLTRB(
                                            18, 10, 16, 4),
                                        child: Text(
                                          curInitial,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w900,
                                            color: Color(0xff1a73e8),
                                          ),
                                        ),
                                      ),
                                    _buildContactTile(contact),
                                  ],
                                );
                              },
                            ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildSourceFilterChip({
    required String label,
    required IconData icon,
    required String value,
  }) {
    final active = _sourceFilter == value;
    return InkWell(
      onTap: () {
        setState(() {
          _sourceFilter = value;
          _applyFilters();
        });
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? const Color(0xffe8f0fe) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? const Color(0xff1a73e8) : border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 15,
              color: active ? const Color(0xff1a73e8) : muted,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: active ? const Color(0xff1a73e8) : navy,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_availableLocations.length > 1)
          SizedBox(
            height: 32,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _availableLocations.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (context, idx) {
                final loc = _availableLocations[idx];
                final isSelected = _selectedLocation == loc;
                return ChoiceChip(
                  visualDensity: VisualDensity.compact,
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (loc != 'सभी')
                        const Icon(Icons.location_on,
                            size: 13, color: Colors.red),
                      if (loc != 'सभी') const SizedBox(width: 3),
                      Text(loc),
                    ],
                  ),
                  selected: isSelected,
                  selectedColor: softBlue,
                  labelStyle: TextStyle(
                    color: isSelected ? blue : navy,
                    fontSize: 11,
                    fontWeight:
                        isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (selected) {
                    setState(() {
                      _selectedLocation = selected ? loc : 'सभी';
                      _applyFilters();
                    });
                  },
                );
              },
            ),
          ),
        const SizedBox(height: 4),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              _buildFilterBadge('सभी संपर्क', 'all'),
              const SizedBox(width: 6),
              _buildFilterBadge('📍 लोकेशन/पते वाले', 'with_location'),
              const SizedBox(width: 6),
              _buildFilterBadge('📞 नंबर वाले', 'with_phone'),
              const SizedBox(width: 6),
              _buildFilterBadge('📝 नोट/विवरण वाले', 'with_notes'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilterBadge(String label, String key) {
    final active = _activeFilter == key;
    return InkWell(
      onTap: () {
        setState(() {
          _activeFilter = key;
          _applyFilters();
        });
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? navy : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: active ? navy : border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : navy,
          ),
        ),
      ),
    );
  }

  Widget _buildContactTile(UnifiedContactItem contact) {
    final primaryPhone =
        contact.phones.isNotEmpty ? contact.phones.first.number : '';
    final addressText = _getContactFullAddress(contact);
    final v = contact.appVoter;
    final epic = '${v?['voterId'] ?? ''}'.trim();
    final ward = '${v?['wardNumber'] ?? ''}'.trim();
    final part = '${v?['partNumber'] ?? ''}'.trim();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2.5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xffedf2f7)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        onTap: () {
          if (widget.onSelectContact != null) {
            widget.onSelectContact!(contact);
            Navigator.pop(context);
          } else {
            _openFullContactProfile(contact);
          }
        },
        leading: _buildAvatar(contact),
        title: Row(
          children: [
            Expanded(
              child: Text(
                contact.displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                  color: navy,
                ),
              ),
            ),
            if (contact.isFavorite)
              const Padding(
                padding: EdgeInsets.only(right: 4),
                child: Icon(Icons.star_rounded, color: orange, size: 16),
              ),
            _buildSourceBadge(contact),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (contact.appSavedName != null &&
                contact.phoneSavedName != null &&
                contact.appSavedName != contact.phoneSavedName)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  'मतदाता सूची नाम: ${contact.appSavedName}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xff0369a1),
                      fontWeight: FontWeight.w600),
                ),
              ),
            if (primaryPhone.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Row(
                  children: [
                    const Icon(Icons.phone_rounded, size: 13, color: muted),
                    const SizedBox(width: 4),
                    Text(
                      primaryPhone,
                      style: const TextStyle(
                        fontSize: 13,
                        color: navy,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (contact.phones.length > 1)
                      Padding(
                        padding: const EdgeInsets.only(left: 6),
                        child: Text(
                          '+${contact.phones.length - 1} और',
                          style: const TextStyle(
                              fontSize: 11,
                              color: blue,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                  ],
                ),
              ),
            if (addressText.isNotEmpty ||
                epic.isNotEmpty ||
                ward.isNotEmpty ||
                part.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (addressText.isNotEmpty)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.location_on,
                              size: 12, color: Colors.red),
                          const SizedBox(width: 2),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 190),
                            child: Text(
                              addressText,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style:
                                  const TextStyle(fontSize: 11.5, color: muted),
                            ),
                          ),
                        ],
                      ),
                    if (ward.isNotEmpty)
                      Text(
                        '• वार्ड $ward',
                        style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xff059669),
                            fontWeight: FontWeight.w700),
                      ),
                    if (part.isNotEmpty)
                      Text(
                        '• बूथ $part',
                        style: const TextStyle(
                            fontSize: 11,
                            color: blue,
                            fontWeight: FontWeight.w700),
                      ),
                  ],
                ),
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (primaryPhone.isNotEmpty) ...[
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'कॉल करें',
                icon: const Icon(Icons.call_rounded, color: green, size: 20),
                onPressed: () => callNumber(context, primaryPhone),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'WhatsApp भेजें',
                icon: const Icon(Icons.chat_bubble_rounded,
                    color: Color(0xff25D366), size: 19),
                onPressed: () => _sendWhatsAppMessage(contact, primaryPhone),
              ),
            ],
            IconButton(
              visualDensity: VisualDensity.compact,
              tooltip: 'एडिट करें',
              icon: const Icon(Icons.edit_outlined, color: blue, size: 19),
              onPressed: () => _openInAppEditDialog(contact),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionDeniedView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.contact_phone_rounded, size: 72, color: blue),
            const SizedBox(height: 16),
            const Text(
              'फ़ोनबुक एक्सेस की अनुमति चाहिए',
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w900, color: navy),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            const Text(
              'फ़ोन में सेव सभी संपर्क, उनकी लोकेशन और मोबाइल नंबर देखने और नाम के साथ WhatsApp संदेश भेजने के लिए कृपया अनुमति प्रदान करें।',
              style: TextStyle(fontSize: 14, color: muted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: blue,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.lock_open_rounded),
              label: const Text(
                'अनुमति दें (Allow Permission)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              onPressed: () => _loadAllData(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Full Voter-Style + Google Contacts-Style Profile Page for any Contact (Phonebook, App, or Both)
class UnifiedContactProfilePage extends StatefulWidget {
  const UnifiedContactProfilePage({
    super.key,
    required this.contact,
    required this.onChanged,
    required this.onEditInApp,
    required this.onEditInPhone,
  });

  final UnifiedContactItem contact;
  final VoidCallback onChanged;
  final Future<void> Function() onEditInApp;
  final Future<void> Function() onEditInPhone;

  @override
  State<UnifiedContactProfilePage> createState() =>
      _UnifiedContactProfilePageState();
}

class _UnifiedContactProfilePageState extends State<UnifiedContactProfilePage> {
  late UnifiedContactItem _contact;
  Map<String, dynamic>? _voter;

  @override
  void initState() {
    super.initState();
    _contact = widget.contact;
    _voter = _contact.appVoter != null
        ? Map<String, dynamic>.from(_contact.appVoter!)
        : null;
  }

  String _fullAddress() {
    if (_contact.addresses.isNotEmpty) {
      final a = _contact.addresses.first;
      if (a.address.trim().isNotEmpty) return a.address.trim();
      return [a.street, a.neighborhood, a.city, a.state, a.postalCode]
          .where((s) => s.trim().isNotEmpty)
          .join(', ');
    }
    if (_voter != null) {
      return [
        if ('${_voter!['houseNumber'] ?? ''}'.trim().isNotEmpty)
          'मकान नं. ${_voter!['houseNumber']}',
        '${_voter!['village'] ?? ''}'.trim(),
        '${_voter!['gramPanchayat'] ?? ''}'.trim(),
        '${_voter!['tehsil'] ?? ''}'.trim(),
      ].where((s) => s.isNotEmpty).join(', ');
    }
    return '';
  }

  Future<void> _toggleFavorite() async {
    if (_voter == null || _voter!['_id'] == null) return;
    final current = int.tryParse('${_voter!['favoriteRating']}') ??
        (_voter!['isFavorite'] == true ? 1 : 0);
    final next = current == 0 ? 1 : 0;
    try {
      final res = await api.toggleFavorite('${_voter!['_id']}', rating: next);
      if (mounted) {
        setState(() {
          _voter!['isFavorite'] = res['isFavorite'] == true;
          _voter!['favoriteRating'] =
              res['favoriteRating'] ?? (_voter!['isFavorite'] == true ? 1 : 0);
        });
        widget.onChanged();
      }
      if (res['member'] is Map) {
        await OfflineVoterCache.merge([res['member']]);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final primaryPhone =
        _contact.phones.isNotEmpty ? _contact.phones.first.number : '';
    final addressText = _fullAddress();
    final orgText = _contact.organizations
        .map((o) => '${o.company} ${o.title}'.trim())
        .where((s) => s.isNotEmpty)
        .join(', ');
    final v = _voter;

    final rawGender = '${v?['gender'] ?? ''}'.trim().toLowerCase();
    final genderLabel = rawGender == 'male' || rawGender == 'm'
        ? 'पुरुष'
        : rawGender == 'female' || rawGender == 'f'
            ? 'महिला'
            : rawGender.isNotEmpty
                ? '${v?['gender']}'
                : '-';

    return Scaffold(
      backgroundColor: const Color(0xfff7f8fb),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0,
        title: const Text(
          'संपर्क व मतदाता प्रोफाइल',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
        ),
        actions: [
          if (v != null && v['_id'] != null)
            IconButton(
              tooltip: 'पसंदीदा (Favorite)',
              onPressed: _toggleFavorite,
              icon: Icon(
                v['isFavorite'] == true
                    ? Icons.star_rounded
                    : Icons.star_border_rounded,
                color: v['isFavorite'] == true ? orange : navy,
              ),
            ),
          IconButton(
            tooltip: 'ऐप व फ़ोन में सुधारें',
            icon: const Icon(Icons.edit_rounded, color: blue),
            onPressed: () async {
              await widget.onEditInApp();
              if (mounted) Navigator.pop(context);
            },
          ),
          IconButton(
            tooltip: 'लोकल फ़ोन कांटेक्ट ऐप में खोलें',
            icon: const Icon(Icons.contact_phone_rounded, color: green),
            onPressed: () async {
              await widget.onEditInPhone();
              if (mounted) Navigator.pop(context);
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          // 1. Header Card (Google Contacts + Voter Profile Style)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: border),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 42,
                  backgroundColor: const Color(0xffe8f0fe),
                  child: Text(
                    _contact.displayName.trim().isNotEmpty
                        ? _contact.displayName
                            .trim()
                            .characters
                            .first
                            .toUpperCase()
                        : '?',
                    style: const TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      color: Color(0xff1967d2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _contact.displayName,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: navy,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                if (_contact.appSavedName != null &&
                    _contact.appSavedName != _contact.displayName) ...[
                  const SizedBox(height: 4),
                  Text(
                    'मतदाता सूची में नाम: ${_contact.appSavedName}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xff0369a1),
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
                if (orgText.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    orgText,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: muted,
                        fontSize: 13,
                        fontWeight: FontWeight.w600),
                  ),
                ],
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  alignment: WrapAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _contact.source == 'both'
                            ? const Color(0xffe0f2fe)
                            : (_contact.source == 'phone'
                                ? softGreen
                                : softOrange),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _contact.source == 'both'
                            ? '📱 लोकल फ़ोनबुक + 🏛️ ऐप मतदाता'
                            : (_contact.source == 'phone'
                                ? '📱 लोकल मोबाइल फ़ोनबुक संपर्क'
                                : '🏛️ ऐप मतदाता संपर्क'),
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _contact.source == 'both'
                              ? const Color(0xff0369a1)
                              : (_contact.source == 'phone' ? green : orange),
                        ),
                      ),
                    ),
                    if (v != null &&
                        '${v['partyPreference'] ?? ''}'.trim().isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: softBlue,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'पार्टी रुझान: ${v['partyPreference']}',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: blue,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 18),

                // Action Row: Call, WhatsApp, SMS, Edit, Map, Share
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildQuickAction(
                      icon: Icons.call_rounded,
                      label: 'Call',
                      color: green,
                      onTap: () => callNumber(context, primaryPhone),
                    ),
                    _buildQuickAction(
                      icon: Icons.chat_rounded,
                      label: 'WhatsApp',
                      color: const Color(0xff25D366),
                      onTap: () => openWhatsApp(
                        context,
                        primaryPhone,
                        recipientName: _contact.displayName,
                        message:
                            'नमस्ते ${_contact.displayName} जी,\n\nआशा है आप सकुशल होंगे।',
                      ),
                    ),
                    _buildQuickAction(
                      icon: Icons.sms_rounded,
                      label: 'SMS',
                      color: const Color(0xff0284c7),
                      onTap: () => sendSmsMessage(
                        context,
                        primaryPhone,
                        message: 'नमस्ते ${_contact.displayName} जी',
                      ),
                    ),
                    _buildQuickAction(
                      icon: Icons.edit_rounded,
                      label: 'Edit',
                      color: blue,
                      onTap: () async {
                        await widget.onEditInApp();
                        if (mounted) Navigator.pop(context);
                      },
                    ),
                    _buildQuickAction(
                      icon: Icons.location_on_rounded,
                      label: 'Map',
                      color: const Color(0xffea4335),
                      onTap: () {
                        if (addressText.isNotEmpty) {
                          launchMapLocation(
                            context,
                            'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(addressText)}',
                          );
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('लोकेशन या पता उपलब्ध नहीं है।')),
                          );
                        }
                      },
                    ),
                    _buildQuickAction(
                      icon: Icons.share_rounded,
                      label: 'Share',
                      color: purple,
                      onTap: () {
                        final shareText = '''
👤 नाम: ${_contact.displayName}
📞 फ़ोन: ${_contact.phones.map((p) => p.number).join(', ')}
📍 पता/लोकेशन: ${addressText.isNotEmpty ? addressText : '-'}
${v != null ? '🗳️ EPIC: ${v['voterId'] ?? '-'} | वार्ड: ${v['wardNumber'] ?? '-'} | भाग: ${v['partNumber'] ?? '-'}' : ''}
📝 विवरण: ${_contact.notes.join(' | ')}
''';
                        SharePlus.instance
                            .share(ShareParams(text: shareText.trim()));
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. Mobile Phonebook Details Card (Numbers, Saved Locations, Emails, Notes)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.phone_android_rounded,
                        color: Color(0xff1a73e8), size: 20),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'मोबाइल फ़ोनबुक व संपर्क विवरण',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15.5,
                          color: navy,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      style: TextButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                      ),
                      onPressed: () async {
                        await widget.onEditInPhone();
                        if (mounted) Navigator.pop(context);
                      },
                      icon: const Icon(Icons.open_in_new_rounded, size: 15),
                      label: Text(
                        _contact.phoneContactId != null
                            ? 'फ़ोन में खोलें'
                            : 'फ़ोन में सेव करें',
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                const Divider(),
                if (_contact.phones.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('मोबाइल नंबर उपलब्ध नहीं है',
                        style: TextStyle(color: muted)),
                  )
                else
                  for (final p in _contact.phones)
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: const CircleAvatar(
                        radius: 18,
                        backgroundColor: softBlue,
                        child: Icon(Icons.phone_rounded, color: blue, size: 18),
                      ),
                      title: Text(
                        p.number,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: navy),
                      ),
                      subtitle: Text(p.label,
                          style: const TextStyle(fontSize: 11.5, color: muted)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: 'कॉल करें',
                            icon: const Icon(Icons.call_rounded, color: green),
                            onPressed: () => callNumber(context, p.number),
                          ),
                          IconButton(
                            tooltip: 'WhatsApp भेजें',
                            icon: const Icon(Icons.chat_bubble_rounded,
                                color: Color(0xff25D366)),
                            onPressed: () => openWhatsApp(
                              context,
                              p.number,
                              recipientName: _contact.displayName,
                              message:
                                  'नमस्ते ${_contact.displayName} जी,\n\nआशा है आप सकुशल होंगे।',
                            ),
                          ),
                        ],
                      ),
                    ),

                // Saved Addresses / Locations in Phonebook
                if (_contact.addresses.isNotEmpty || addressText.isNotEmpty) ...[
                  const Divider(),
                  const Padding(
                    padding: EdgeInsets.only(top: 4, bottom: 6),
                    child: Text(
                      '📍 सेव की गई लोकेशन / पता (Saved Locations)',
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: blue),
                    ),
                  ),
                  if (_contact.addresses.isNotEmpty)
                    for (final a in _contact.addresses)
                      Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xfff8fafc),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.location_on_rounded,
                                color: Colors.red, size: 22),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    a.address.isNotEmpty
                                        ? a.address
                                        : [
                                            a.street,
                                            a.neighborhood,
                                            a.city,
                                            a.state,
                                            a.postalCode
                                          ]
                                            .where((s) => s.isNotEmpty)
                                            .join(', '),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13.5,
                                      color: navy,
                                    ),
                                  ),
                                  if (a.city.isNotEmpty ||
                                      a.postalCode.isNotEmpty)
                                    Text(
                                      [
                                        if (a.city.isNotEmpty) 'शहर/गाँव: ${a.city}',
                                        if (a.postalCode.isNotEmpty)
                                          'पिन: ${a.postalCode}',
                                      ].join(' • '),
                                      style: const TextStyle(
                                          fontSize: 11.5, color: muted),
                                    ),
                                ],
                              ),
                            ),
                            IconButton(
                              tooltip: 'Google Maps पर खोलें',
                              icon: const Icon(Icons.directions_rounded,
                                  color: blue),
                              onPressed: () => launchMapLocation(
                                context,
                                'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(a.address.isNotEmpty ? a.address : a.city)}',
                              ),
                            ),
                          ],
                        ),
                      )
                  else
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xfff8fafc),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: border),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.location_on_rounded,
                              color: Colors.red, size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              addressText,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, color: navy),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],

                // Emails
                if (_contact.emails.isNotEmpty) ...[
                  const Divider(),
                  const Padding(
                    padding: EdgeInsets.only(top: 4, bottom: 4),
                    child: Text(
                      '✉️ ईमेल (Saved Emails)',
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: blue),
                    ),
                  ),
                  for (final e in _contact.emails)
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading:
                          const Icon(Icons.email_outlined, color: muted, size: 20),
                      title: Text(e.address,
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(e.label),
                      trailing: IconButton(
                        icon: const Icon(Icons.send_rounded,
                            color: blue, size: 18),
                        onPressed: () =>
                            launchUrl(Uri.parse('mailto:${e.address}')),
                      ),
                    ),
                ],

                // Notes
                if (_contact.notes.isNotEmpty) ...[
                  const Divider(),
                  const Padding(
                    padding: EdgeInsets.only(top: 4, bottom: 6),
                    child: Text(
                      '📝 फ़ोनबुक नोट्स / विवरण (Saved Notes)',
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: blue),
                    ),
                  ),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xfffffbeb),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xfffef3c7)),
                    ),
                    child: Text(
                      _contact.notes.join('\n'),
                      style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xff92400e),
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 3. Voter Profile Details Card (Matches VoterDetailPage)
          if (v != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.how_to_vote_rounded,
                          color: Color(0xff059669), size: 22),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'मतदाता प्रोफाइल विवरण (App Voter Data)',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15.5,
                            color: navy,
                          ),
                        ),
                      ),
                      FilledButton.tonalIcon(
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => VoterDetailPage(
                                voter: v,
                                onChanged: widget.onChanged,
                              ),
                            ),
                          );
                          widget.onChanged();
                        },
                        icon: const Icon(Icons.badge_outlined, size: 16),
                        label: const Text('पर्ची व परिवार देखें',
                            style: TextStyle(
                                fontSize: 11.5, fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  _buildVoterRow(Icons.badge_outlined, 'EPIC / वोटर आईडी',
                      '${v['voterId'] ?? '-'}'),
                  _buildVoterRow(
                    Icons.how_to_reg_rounded,
                    'वार्ड संख्या व क्रमांक',
                    'वार्ड #${v['wardNumber'] ?? '-'}  ·  क्रमांक #${v['wardVoterSerial'] ?? '-'}',
                  ),
                  _buildVoterRow(
                    Icons.account_balance_rounded,
                    'विधानसभा भाग / बूथ व क्रमांक',
                    'भाग #${v['partNumber'] ?? '-'}  ·  क्रमांक #${v['voterSerial'] ?? '-'}',
                  ),
                  _buildVoterRow(Icons.family_restroom_rounded,
                      'पिता / पति का नाम', '${v['guardianName'] ?? '-'}'),
                  _buildVoterRow(Icons.cake_outlined, 'उम्र व लिंग',
                      '${v['age'] ?? '-'} वर्ष · $genderLabel'),
                  _buildVoterRow(Icons.home_work_outlined, 'मकान संख्या',
                      '${v['houseNumber'] ?? '-'}'),
                  _buildVoterRow(
                    Icons.holiday_village_outlined,
                    'गाँव व ग्राम पंचायत',
                    [
                      '${v['village'] ?? ''}'.trim(),
                      '${v['gramPanchayat'] ?? ''}'.trim()
                    ].where((s) => s.isNotEmpty).join(' · '),
                  ),
                  _buildVoterRow(
                    Icons.people_outline_rounded,
                    'जाति / उपजाति',
                    [
                      '${v['caste'] ?? ''}'.trim(),
                      '${v['subCaste'] ?? ''}'.trim()
                    ].where((s) => s.isNotEmpty).join(' / '),
                  ),
                  _buildVoterRow(Icons.work_outline_rounded,
                      'संगठन पद / व्यवसाय',
                      [
                        '${v['organizationPost'] ?? ''}'.trim(),
                        '${v['occupation'] ?? ''}'.trim()
                      ].where((s) => s.isNotEmpty).join(' · ')),
                  _buildVoterRow(
                    Icons.flag_outlined,
                    'पार्टी व समर्थन स्तर',
                    '${v['partyPreference'] ?? 'undecided'} (${v['supportLevel'] ?? 'neutral'})',
                    isLast: true,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQuickAction({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Column(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withValues(alpha: 0.12),
                border: Border.all(color: color.withValues(alpha: 0.25)),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              style: const TextStyle(
                color: navy,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVoterRow(IconData icon, String label, String value,
      {bool isLast = false}) {
    final displayVal = value.trim().isEmpty ? '-' : value.trim();
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(bottom: BorderSide(color: Color(0xfff1f5f9))),
      ),
      child: Row(
        children: [
          Icon(icon, color: blue, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontSize: 11.5, color: muted)),
                const SizedBox(height: 2),
                Text(
                  displayVal,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: navy,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
