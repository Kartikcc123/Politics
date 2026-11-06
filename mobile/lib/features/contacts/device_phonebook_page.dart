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
import '../../core/theme.dart';
import '../../utils/excel_generator.dart';
import '../voters/voter_edit_page.dart';

class ContactPhoneItem {
  final String number;
  final String label;
  const ContactPhoneItem({required this.number, this.label = 'Mobile'});
}

class ContactAddressItem {
  final String address;
  final String street;
  final String city;
  final String state;
  final String postalCode;
  const ContactAddressItem({
    this.address = '',
    this.street = '',
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
    required this.source,
    this.phones = const [],
    this.addresses = const [],
    this.emails = const [],
    this.organizations = const [],
    this.notes = const [],
    this.appVoter,
  });
}

class DevicePhonebookPage extends StatefulWidget {
  const DevicePhonebookPage({super.key, this.onSelectContact});

  /// Optional callback if this page is opened to pick a contact for WhatsApp/messaging
  final ValueChanged<UnifiedContactItem>? onSelectContact;

  @override
  State<DevicePhonebookPage> createState() => _DevicePhonebookPageState();
}

class _DevicePhonebookPageState extends State<DevicePhonebookPage> {
  static const MethodChannel _channel =
      MethodChannel('com.example.political_booth_crm/contacts');

  bool _loading = true;
  bool _permissionDenied = false;
  List<UnifiedContactItem> _allContacts = [];
  List<UnifiedContactItem> _filteredContacts = [];

  int _phoneCount = 0;
  int _appCount = 0;
  int _bothCount = 0;

  // Search & Filters
  final TextEditingController _searchCtrl = TextEditingController();
  final SpeechToText _speech = SpeechToText();
  bool _listening = false;
  Timer? _debounceTimer;

  // Source filter: 'all' (Phone + App), 'phone' (Phone Only), 'app' (App Only), 'both' (Matched in Both)
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
    _loadAllData();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _speech.stop();
    _searchCtrl.dispose();
    super.dispose();
  }

  String _normalize10Digit(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 10) {
      return digits.substring(digits.length - 10);
    }
    return digits;
  }

  Future<void> _loadAllData() async {
    setState(() {
      _loading = true;
      _permissionDenied = false;
    });

    List<UnifiedContactItem> phoneItems = [];
    bool permDenied = false;

    // 1. Load Device Phonebook Contacts (on Android)
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      try {
        final granted = await _channel.invokeMethod<bool>('requestPermission') ?? false;
        if (!granted) {
          permDenied = true;
        } else {
          final rawList = await _channel.invokeMethod<List<dynamic>>('getContacts') ?? [];
          for (final raw in rawList) {
            if (raw is! Map) continue;
            final map = Map<String, dynamic>.from(raw);
            final cId = '${map['id'] ?? ''}';
            final name = '${map['displayName'] ?? ''}'.trim();

            final phonesRaw = (map['phones'] as List?) ?? [];
            final phones = phonesRaw.whereType<Map>().map((p) {
              return ContactPhoneItem(
                number: '${p['number'] ?? ''}'.trim(),
                label: '${p['label'] ?? 'Mobile'}'.trim(),
              );
            }).where((p) => p.number.isNotEmpty).toList();

            final addrsRaw = (map['addresses'] as List?) ?? [];
            final addresses = addrsRaw.whereType<Map>().map((a) {
              return ContactAddressItem(
                address: '${a['address'] ?? ''}'.trim(),
                street: '${a['street'] ?? ''}'.trim(),
                city: '${a['city'] ?? ''}'.trim(),
                state: '${a['state'] ?? ''}'.trim(),
                postalCode: '${a['postalCode'] ?? ''}'.trim(),
              );
            }).toList();

            final emailsRaw = (map['emails'] as List?) ?? [];
            final emails = emailsRaw.whereType<Map>().map((e) {
              return ContactEmailItem(
                address: '${e['address'] ?? ''}'.trim(),
                label: '${e['label'] ?? 'Email'}'.trim(),
              );
            }).where((e) => e.address.isNotEmpty).toList();

            final orgsRaw = (map['organizations'] as List?) ?? [];
            final orgs = orgsRaw.whereType<Map>().map((o) {
              return ContactOrgItem(
                company: '${o['company'] ?? ''}'.trim(),
                title: '${o['title'] ?? ''}'.trim(),
              );
            }).toList();

            final notesRaw = (map['notes'] as List?) ?? [];
            final notes = notesRaw.map((n) => '$n'.trim()).where((n) => n.isNotEmpty).toList();

            phoneItems.add(
              UnifiedContactItem(
                id: 'phone_$cId',
                phoneContactId: cId,
                displayName: name.isNotEmpty ? name : (phones.isNotEmpty ? phones.first.number : 'अज्ञात संपर्क'),
                source: 'phone',
                phones: phones,
                addresses: addresses,
                emails: emails,
                organizations: orgs,
                notes: notes,
              ),
            );
          }
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
        limit: 2500,
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

      final normMobile = _normalize10Digit(vMobile);
      if (normMobile.length == 10 && phoneBy10Digit.containsKey(normMobile)) {
        // Matched in BOTH Phonebook and App!
        final idx = phoneBy10Digit[normMobile]!;
        final existing = mergedList[idx];
        final extraNotes = <String>[
          ...existing.notes,
          if (vEpic.isNotEmpty) 'EPIC: $vEpic',
          if (vGuardian.isNotEmpty) 'पिता/पति: $vGuardian',
          if (vPart.isNotEmpty || vWard.isNotEmpty) 'भाग: $vPart | वार्ड: $vWard',
        ];
        final extraAddresses = <ContactAddressItem>[
          ...existing.addresses,
          if (existing.addresses.isEmpty && (vVillage.isNotEmpty || vGp.isNotEmpty))
            ContactAddressItem(
              address: [vVillage, if (vGp.isNotEmpty) 'पंचायत: $vGp'].join(', '),
              city: vVillage,
              state: vGp,
            ),
        ];
        mergedList[idx] = UnifiedContactItem(
          id: existing.id,
          phoneContactId: existing.phoneContactId,
          displayName: existing.displayName,
          source: 'both',
          phones: existing.phones,
          addresses: extraAddresses,
          emails: existing.emails,
          organizations: existing.organizations.isNotEmpty
              ? existing.organizations
              : (vPost.isNotEmpty ? [ContactOrgItem(company: vPost)] : const []),
          notes: extraNotes,
          appVoter: v,
        );
        bothCounter++;
      } else {
        // App Only Contact
        final phones = <ContactPhoneItem>[
          if (vMobile.isNotEmpty) ContactPhoneItem(number: vMobile, label: 'App Mobile'),
          if (vAltMobile.isNotEmpty) ContactPhoneItem(number: vAltMobile, label: 'Alt Mobile'),
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
            displayName: vName.isNotEmpty ? vName : (vMobile.isNotEmpty ? vMobile : 'मतदाता'),
            source: 'app',
            phones: phones,
            addresses: locString.isNotEmpty
                ? [ContactAddressItem(address: locString, city: vVillage, state: vGp)]
                : const [],
            organizations: vPost.isNotEmpty ? [ContactOrgItem(company: vPost)] : const [],
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
        _availableLocations = locSet.toList();
        _permissionDenied = permDenied && mergedList.isEmpty;
        _applyFilters();
        _loading = false;
      });
    }
  }

  String _extractLocationSummary(ContactAddressItem addr) {
    if (addr.city.trim().isNotEmpty) return addr.city.trim();
    if (addr.street.trim().isNotEmpty) return addr.street.trim();
    if (addr.address.trim().isNotEmpty) {
      final firstPart = addr.address.split(',').first.trim();
      return firstPart;
    }
    return '';
  }

  String _getContactFullAddress(UnifiedContactItem contact) {
    if (contact.addresses.isEmpty) return '';
    final a = contact.addresses.first;
    if (a.address.trim().isNotEmpty) return a.address.trim();
    final components = [
      if (a.street.trim().isNotEmpty) a.street.trim(),
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
      // 1. Data Source Filter ('all', 'phone', 'app', 'both')
      if (_sourceFilter == 'phone' && c.source != 'phone' && c.source != 'both') {
        return false;
      }
      if (_sourceFilter == 'app' && c.source != 'app' && c.source != 'both') {
        return false;
      }
      if (_sourceFilter == 'both' && c.source != 'both') {
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
              a.address.toLowerCase().contains(_selectedLocation.toLowerCase()) ||
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
        final nameMatch = c.displayName.toLowerCase().contains(q);
        final notesMatch = c.notes.any((n) => n.toLowerCase().contains(q));
        final orgMatch = c.organizations.any(
            (o) => o.company.toLowerCase().contains(q) || o.title.toLowerCase().contains(q));
        final addressMatch = c.addresses.any((a) =>
            a.address.toLowerCase().contains(q) ||
            a.city.toLowerCase().contains(q) ||
            a.street.toLowerCase().contains(q) ||
            a.state.toLowerCase().contains(q));

        bool phoneMatch = false;
        if (cleanQ.isNotEmpty) {
          phoneMatch = c.phones.any((p) {
            final cleanNum = p.number.replaceAll(RegExp(r'[^0-9]'), '');
            return cleanNum.contains(cleanQ);
          });
        }

        if (!nameMatch && !notesMatch && !orgMatch && !addressMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    }).toList();

    _filteredContacts.sort(
      (a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()),
    );
  }

  void _onSearchChanged(String _) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 220), () {
      if (mounted) {
        setState(() => _applyFilters());
      }
    });
  }

  // Export to Excel (.xlsx) or CSV
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
      'नाम (Name)',
      'मुख्य मोबाइल (Primary Mobile)',
      'अन्य नंबर (Alternate Phones)',
      'लोकेशन / गाँव / पता (Location/Address)',
      'पद / संस्था (Organization)',
      'ईमेल (Email)',
      'नोट / विवरण (Notes/Details)',
    ];

    final rows = <List<dynamic>>[];
    for (int i = 0; i < _filteredContacts.length; i++) {
      final c = _filteredContacts[i];
      final sourceLabel = c.source == 'both'
          ? 'फ़ोन + ऐप (Both)'
          : (c.source == 'phone' ? 'लोकल फ़ोनबुक (Phone)' : 'ऐप डेटा (App)');
      final primaryPhone = c.phones.isNotEmpty ? c.phones.first.number : '';
      final otherPhones = c.phones.length > 1
          ? c.phones.skip(1).map((p) => p.number).join(', ')
          : '';
      final addr = _getContactFullAddress(c);
      final org = c.organizations.map((o) => '${o.company} ${o.title}'.trim()).join(', ');
      final email = c.emails.map((e) => e.address).join(', ');
      final note = c.notes.join(' | ');

      rows.add([
        i + 1,
        sourceLabel,
        c.displayName,
        primaryPhone,
        otherPhones,
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
          sb.writeln(r.map((cell) => '"${'$cell'.replaceAll('"', '""')}"').join(','));
        }
        final bytes = Uint8List.fromList(utf8.encode(sb.toString()));
        final savedPath = await saveBytes('phonebook_contacts_$timestamp.csv', bytes);
        if (mounted && savedPath != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('CSV फ़ाइल तैयार हो गई (${_filteredContacts.length} संपर्क)')),
          );
        }
      } else {
        final xlsxBytes = ExcelGenerator.buildCustomXlsx(
          headers,
          rows,
          sheetName: 'संपर्क सूची',
        );
        final savedPath = await saveBytes(
          'phonebook_contacts_$timestamp.xlsx',
          Uint8List.fromList(xlsxBytes),
        );
        if (mounted && savedPath != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Excel (.xlsx) फ़ाइल तैयार हो गई (${_filteredContacts.length} संपर्क)')),
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
        _searchCtrl.selection = TextSelection.collapsed(offset: _searchCtrl.text.length);
        if (mounted) {
          setState(() => _applyFilters());
        }
      },
    );
  }

  Future<void> _sendWhatsAppMessage(UnifiedContactItem contact, [String? specificPhone]) async {
    final phone = specificPhone ?? (contact.phones.isNotEmpty ? contact.phones.first.number : '');
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('इस संपर्क का मोबाइल नंबर उपलब्ध नहीं है।')),
      );
      return;
    }

    final name = contact.displayName.trim();
    final greetingName = name.isNotEmpty ? name : 'मित्र';
    final message = "नमस्ते $greetingName जी,\n\nआशा है आप सकुशल होंगे।";

    await openWhatsApp(context, phone, message: message);
  }

  Future<void> _editInNativePhonebook(UnifiedContactItem contact) async {
    try {
      if (contact.phoneContactId != null && contact.phoneContactId!.isNotEmpty) {
        await _channel.invokeMethod('openExternalEdit', {'id': contact.phoneContactId});
      } else {
        final primaryPhone = contact.phones.isNotEmpty ? contact.phones.first.number : '';
        await _channel.invokeMethod('openExternalInsert', {
          'name': contact.displayName,
          'phone': primaryPhone,
          'address': _getContactFullAddress(contact),
        });
      }
      await Future.delayed(const Duration(milliseconds: 600));
      await _loadAllData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('फ़ोन एडिटर खोलने में समस्या: $e')),
        );
      }
    }
  }

  Future<void> _openInAppEditDialog(UnifiedContactItem contact) async {
    // If it's an App-only voter and has appVoter map, allow editing Voter profile OR saving to phonebook
    if (contact.phoneContactId == null && contact.appVoter != null) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => VoterEditPage(
            voter: contact.appVoter!,
            onSaved: _loadAllData,
          ),
        ),
      );
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
      text: contact.organizations.isNotEmpty ? contact.organizations.first.company : '',
    );
    final noteCtrl = TextEditingController(
      text: contact.notes.isNotEmpty ? contact.notes.first : '',
    );

    final updated = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.edit_note_rounded, color: blue),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'संपर्क सुधारें (लोकल फ़ोनबुक)',
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
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('रद्द करें'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: blue,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('सेव करें (Save to Phone)'),
          ),
        ],
      ),
    );

    if (updated == true && contact.phoneContactId != null) {
      setState(() => _loading = true);
      try {
        final ok = await _channel.invokeMethod<bool>('updateContact', {
              'id': contact.phoneContactId,
              'name': nameCtrl.text.trim(),
              'phone': phoneCtrl.text.trim(),
              'address': addressCtrl.text.trim(),
              'organization': orgCtrl.text.trim(),
              'note': noteCtrl.text.trim(),
            }) ??
            false;

        // Also update linked App Voter if matched in both
        if (contact.appVoter != null && contact.appVoter!['_id'] != null) {
          try {
            await api.put('/api/members/${contact.appVoter!['_id']}', {
              'name': nameCtrl.text.trim(),
              'mobile': phoneCtrl.text.trim(),
              'address': addressCtrl.text.trim(),
            });
          } catch (_) {}
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                ok
                    ? 'संपर्क लोकल फ़ोनबुक में सफलतापूर्वक अपडेट हो गया!'
                    : 'फ़ोनबुक अपडेट नहीं हो सका।',
              ),
            ),
          );
        }
        await _loadAllData();
      } catch (e) {
        if (mounted) {
          setState(() => _loading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('अपडेट विफल: $e')),
          );
        }
      }
    }
  }

  Widget _buildSourceBadge(String source) {
    if (source == 'both') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: const Color(0xffe0f2fe),
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text(
          '📱+🏛️ फ़ोन व ऐप',
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xff0369a1)),
        ),
      );
    }
    if (source == 'phone') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: softGreen,
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text(
          '📱 फ़ोनबुक',
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: green),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: softOrange,
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Text(
        '🏛️ ऐप मतदाता',
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: orange),
      ),
    );
  }

  void _showContactDetailsSheet(UnifiedContactItem contact) {
    final addressText = _getContactFullAddress(contact);
    final noteText = contact.notes.join('\n');
    final orgText = contact.organizations
        .map((o) => '${o.company} ${o.title}'.trim())
        .where((s) => s.isNotEmpty)
        .join(', ');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.68,
        minChildSize: 0.45,
        maxChildSize: 0.92,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: ListView(
            controller: scrollController,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildAvatar(contact, size: 60),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSourceBadge(contact.source),
                        const SizedBox(height: 4),
                        Text(
                          contact.displayName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: navy,
                          ),
                        ),
                        if (orgText.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              orgText,
                              style: const TextStyle(color: muted, fontSize: 13),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(),

              // Phone Numbers
              if (contact.phones.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'फ़ोन नंबर (Phone Numbers)',
                    style: TextStyle(fontWeight: FontWeight.w900, color: blue, fontSize: 13),
                  ),
                ),
                for (final p in contact.phones)
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
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    subtitle: Text(p.label),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          tooltip: 'कॉल करें',
                          icon: const Icon(Icons.call, color: green),
                          onPressed: () => callNumber(context, p.number),
                        ),
                        IconButton(
                          tooltip: 'WhatsApp संदेश भेजें',
                          icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xff25D366)),
                          onPressed: () => _sendWhatsAppMessage(contact, p.number),
                        ),
                      ],
                    ),
                  ),
              ],

              // Location / Address
              if (addressText.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text(
                  'लोकेशन व पता (Saved Location)',
                  style: TextStyle(fontWeight: FontWeight.w900, color: blue, fontSize: 13),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xfff8fafc),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on_rounded, color: Colors.red, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          addressText,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: navy,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Google Maps पर देखें',
                        icon: const Icon(Icons.map_rounded, color: blue),
                        onPressed: () => launchMapLocation(
                          context,
                          'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(addressText)}',
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Emails
              if (contact.emails.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text(
                  'ईमेल (Emails)',
                  style: TextStyle(fontWeight: FontWeight.w900, color: blue, fontSize: 13),
                ),
                for (final e in contact.emails)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.email_outlined, color: muted),
                    title: Text(e.address),
                    subtitle: Text(e.label),
                    trailing: IconButton(
                      icon: const Icon(Icons.send_rounded, color: blue),
                      onPressed: () => launchUrl(Uri.parse('mailto:${e.address}')),
                    ),
                  ),
              ],

              // Notes / Voter Details
              if (noteText.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text(
                  'नोट / अतिरिक्त विवरण (Notes & Info)',
                  style: TextStyle(fontWeight: FontWeight.w900, color: blue, fontSize: 13),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xfffffbeb),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xfffef3c7)),
                  ),
                  child: Text(
                    noteText,
                    style: const TextStyle(fontSize: 13, color: Color(0xff92400e)),
                  ),
                ),
              ],

              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: blue),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.edit_note_rounded, color: blue),
                      label: const Text('ऐप में सुधारें', style: TextStyle(color: blue)),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _openInAppEditDialog(contact);
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.contact_phone_rounded),
                      label: Text(
                        contact.phoneContactId != null ? 'फ़ोन में एडिट करें' : 'फ़ोन में सेव करें',
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _editInNativePhonebook(contact);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                icon: const Icon(Icons.share_rounded, size: 18),
                label: const Text('संपर्क विवरण शेयर करें'),
                onPressed: () {
                  final shareText = '''
👤 नाम: ${contact.displayName}
📞 फ़ोन: ${contact.phones.isNotEmpty ? contact.phones.map((p) => p.number).join(', ') : '-'}
📍 लोकेशन/पता: ${addressText.isNotEmpty ? addressText : '-'}
📝 विवरण: ${noteText.isNotEmpty ? noteText : '-'}
''';
                  SharePlus.instance.share(
                    ShareParams(
                      text: shareText,
                      subject: '${contact.displayName} का संपर्क',
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(UnifiedContactItem contact, {double size = 46}) {
    final name = contact.displayName.trim();
    final letter = name.isNotEmpty ? name.characters.first.toUpperCase() : '?';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: contact.source == 'phone'
            ? softGreen
            : (contact.source == 'both' ? const Color(0xffe0f2fe) : softBlue),
        shape: BoxShape.circle,
        border: Border.all(color: border),
      ),
      alignment: Alignment.center,
      child: Text(
        letter,
        style: TextStyle(
          color: contact.source == 'phone' ? green : blue,
          fontWeight: FontWeight.w900,
          fontSize: size * 0.42,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('फ़ोनबुक व ऐप संपर्क डायरेक्टरी'),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Excel / CSV डाउनलोड करें',
            icon: const Icon(Icons.download_rounded, color: green),
            onSelected: (val) {
              if (val == 'xlsx') {
                _exportContacts(asCsv: false);
              } else if (val == 'csv') {
                _exportContacts(asCsv: true);
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'xlsx',
                child: Row(
                  children: [
                    Icon(Icons.table_view_rounded, color: green, size: 20),
                    SizedBox(width: 8),
                    Text('Excel (.xlsx) डाउनलोड करें'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'csv',
                child: Row(
                  children: [
                    Icon(Icons.description_outlined, color: blue, size: 20),
                    SizedBox(width: 8),
                    Text('CSV फ़ाइल डाउनलोड करें'),
                  ],
                ),
              ),
            ],
          ),
          IconButton(
            tooltip: 'रिफ्रेश करें',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadAllData,
          ),
          IconButton(
            tooltip: 'फ़ोन में नया संपर्क जोड़ें',
            icon: const Icon(Icons.person_add_alt_1_rounded),
            onPressed: () async {
              try {
                await _channel.invokeMethod('openExternalInsert', <String, String>{});
                await Future.delayed(const Duration(milliseconds: 600));
                await _loadAllData();
              } catch (_) {}
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 12),
                  Text('फ़ोनबुक और ऐप के संपर्क लोड हो रहे हैं…', style: TextStyle(color: navy)),
                ],
              ),
            )
          : _permissionDenied
              ? _buildPermissionDeniedView()
              : Column(
                  children: [
                    // 1. Source Filter Bar: Phone + App / Phone Only / App Only / Both
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildSourceFilterChip(
                              label: '🔄 सभी (${_allContacts.length})',
                              value: 'all',
                            ),
                            const SizedBox(width: 8),
                            _buildSourceFilterChip(
                              label: '📱 फ़ोनबुक ($_phoneCount)',
                              value: 'phone',
                            ),
                            const SizedBox(width: 8),
                            _buildSourceFilterChip(
                              label: '🏛️ ऐप डेटा ($_appCount)',
                              value: 'app',
                            ),
                            const SizedBox(width: 8),
                            _buildSourceFilterChip(
                              label: '🔗 दोनों में कॉमन ($_bothCount)',
                              value: 'both',
                            ),
                          ],
                        ),
                      ),
                    ),

                    // 2. Search & Voice Bar + Direct Excel Button
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchCtrl,
                              onChanged: _onSearchChanged,
                              decoration: InputDecoration(
                                hintText: 'नाम, नंबर, लोकेशन, गाँव या नोट खोजें...',
                                prefixIcon: const Icon(Icons.search_rounded),
                                filled: true,
                                fillColor: Colors.white,
                                isDense: true,
                                contentPadding:
                                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: border),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: border),
                                ),
                                suffixIcon: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (_searchCtrl.text.isNotEmpty)
                                      IconButton(
                                        tooltip: 'खोज साफ करें',
                                        icon: const Icon(Icons.close_rounded, size: 18),
                                        onPressed: () {
                                          _searchCtrl.clear();
                                          setState(() => _applyFilters());
                                        },
                                      ),
                                    IconButton(
                                      tooltip: _listening ? 'सुनना बंद करें' : 'बोलकर खोजें',
                                      icon: Icon(
                                        _listening ? Icons.mic_rounded : Icons.mic_none_rounded,
                                        color: _listening ? Colors.red : blue,
                                        size: 20,
                                      ),
                                      onPressed: _toggleVoiceSearch,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          FilledButton.tonalIcon(
                            style: FilledButton.styleFrom(
                              backgroundColor: softGreen,
                              foregroundColor: green,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () => _exportContacts(asCsv: false),
                            icon: const Icon(Icons.table_view_rounded, size: 18),
                            label: const Text(
                              'Excel',
                              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // 3. A-Z Alphabet Filter Bar
                    SizedBox(
                      height: 32,
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
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: active ? navy : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: active ? navy : border),
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
                    const SizedBox(height: 6),

                    // 4. Location & Quick Attribute Filter Section
                    _buildFilterSection(),

                    // 5. Status & Count Bar
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      child: Row(
                        children: [
                          Text(
                            'दिख रहे संपर्क: ${_filteredContacts.length} / ${_allContacts.length}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: muted,
                            ),
                          ),
                          const Spacer(),
                          if (_selectedLocation != 'सभी' || _selectedLetter != 'सभी')
                            TextButton.icon(
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                                minimumSize: const Size(0, 24),
                              ),
                              onPressed: () {
                                setState(() {
                                  _selectedLocation = 'सभी';
                                  _selectedLetter = 'सभी';
                                  _activeFilter = 'all';
                                  _sourceFilter = 'all';
                                  _applyFilters();
                                });
                              },
                              icon: const Icon(Icons.filter_alt_off_rounded, size: 14),
                              label: const Text('फ़िल्टर हटाएँ', style: TextStyle(fontSize: 11)),
                            ),
                        ],
                      ),
                    ),
                    const Divider(height: 6),

                    // 6. Contact List
                    Expanded(
                      child: _filteredContacts.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.contact_phone_outlined, size: 54, color: muted),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'कोई संपर्क नहीं मिला',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: navy,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'खोज शब्द या फ़िल्टर बदलकर दोबारा प्रयास करें।',
                                    style: TextStyle(color: muted, fontSize: 13),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              itemCount: _filteredContacts.length,
                              separatorBuilder: (_, __) => const Divider(height: 1, indent: 68),
                              itemBuilder: (context, index) {
                                final contact = _filteredContacts[index];
                                return _buildContactTile(contact);
                              },
                            ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildSourceFilterChip({required String label, required String value}) {
    final active = _sourceFilter == value;
    return InkWell(
      onTap: () {
        setState(() {
          _sourceFilter = value;
          _applyFilters();
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? blue : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: active ? blue : border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: active ? Colors.white : navy,
          ),
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
            height: 34,
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
                        const Icon(Icons.location_on, size: 13, color: Colors.red),
                      if (loc != 'सभी') const SizedBox(width: 3),
                      Text(loc),
                    ],
                  ),
                  selected: isSelected,
                  selectedColor: softBlue,
                  labelStyle: TextStyle(
                    color: isSelected ? blue : navy,
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
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
              _buildFilterBadge('सभी', 'all'),
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
          color: active ? blue : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: active ? blue : border),
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
    final primaryPhone = contact.phones.isNotEmpty ? contact.phones.first.number : '';
    final addressText = _getContactFullAddress(contact);

    return ListTile(
      dense: false,
      onTap: () {
        if (widget.onSelectContact != null) {
          widget.onSelectContact!(contact);
          Navigator.pop(context);
        } else {
          _showContactDetailsSheet(contact);
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
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navy),
            ),
          ),
          const SizedBox(width: 6),
          _buildSourceBadge(contact.source),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (contact.phones.length > 1)
                    Padding(
                      padding: const EdgeInsets.only(left: 6),
                      child: Text(
                        '+${contact.phones.length - 1} और',
                        style: const TextStyle(fontSize: 11, color: blue),
                      ),
                    ),
                ],
              ),
            ),
          if (addressText.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Row(
                children: [
                  const Icon(Icons.location_on, size: 13, color: Colors.red),
                  const SizedBox(width: 3),
                  Expanded(
                    child: Text(
                      addressText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: muted),
                    ),
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
              icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xff25D366), size: 20),
              onPressed: () => _sendWhatsAppMessage(contact, primaryPhone),
            ),
          ],
          PopupMenuButton<String>(
            tooltip: 'अधिक विकल्प',
            icon: const Icon(Icons.more_vert_rounded, color: muted),
            onSelected: (val) {
              if (val == 'edit_app') {
                _openInAppEditDialog(contact);
              } else if (val == 'edit_phone') {
                _editInNativePhonebook(contact);
              } else if (val == 'details') {
                _showContactDetailsSheet(contact);
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'details',
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 18),
                    SizedBox(width: 8),
                    Text('पूरा विवरण देखें'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'edit_app',
                child: Row(
                  children: [
                    Icon(Icons.edit_note_rounded, size: 18, color: blue),
                    SizedBox(width: 8),
                    Text('ऐप में एडिट करें'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'edit_phone',
                child: Row(
                  children: [
                    const Icon(Icons.open_in_new_rounded, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      contact.phoneContactId != null
                          ? 'फ़ोन कांटेक्ट में बदलें'
                          : 'फ़ोनबुक में सेव करें',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
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
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: navy),
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
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.lock_open_rounded),
              label: const Text(
                'अनुमति दें (Allow Permission)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              onPressed: _loadAllData,
            ),
          ],
        ),
      ),
    );
  }
}
