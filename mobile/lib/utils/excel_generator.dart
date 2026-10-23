import 'dart:convert';
import 'package:archive/archive.dart';

class ExcelGenerator {
  static const fieldMetadata = <String, Map<String, String>>{
    'voterSerial': {'label': 'वि.स. क्रमांक (Serial)'},
    'wardVoterSerial': {'label': 'वार्ड क्रमांक (Ward Serial)'},
    'voterId': {'label': 'मतदाता पहचान पत्र (EPIC)'},
    'name': {'label': 'मतदाता का नाम (Name)'},
    'guardianName': {'label': 'पिता / पति का नाम (Father/Husband)'},
    'relationType': {'label': 'संबंध (Relation)'},
    'age': {'label': 'उम्र (Age)'},
    'gender': {'label': 'लिंग (Gender)'},
    'mobile': {'label': 'मोबाइल नंबर (Mobile)'},
    'altMobile': {'label': 'वैकल्पिक मोबाइल'},
    'houseNumber': {'label': 'मकान संख्या (House No)'},
    'village': {'label': 'गाँव / मजरा (Village)'},
    'wardNumber': {'label': 'वार्ड संख्या (Ward No)'},
    'partNumber': {'label': 'भाग संख्या (Part/Booth)'},
    'gramPanchayat': {'label': 'ग्राम पंचायत (Panchayat)'},
    'tehsil': {'label': 'तहसील / समिति'},
    'municipality': {'label': 'नगर पालिका'},
    'caste': {'label': 'जाति (Caste)'},
    'subCaste': {'label': 'उपजाति (Sub-Caste)'},
    'occupation': {'label': 'व्यवसाय (Occupation)'},
    'education': {'label': 'शिक्षा (Education)'},
    'organizationPost': {'label': 'संगठन पद (Designation)'},
    'supportLevel': {'label': 'समर्थन स्तर (Support)'},
    'partyPreference': {'label': 'पार्टी रुझान (Party)'},
    'isFavorite': {'label': 'पसंदीदा (⭐ Favorite)'},
    'favoriteRating': {'label': 'स्टार रेटिंग (Rating)'},
    'sectionName': {'label': 'अनुभाग (Section)'},
    'address': {'label': 'पता (Address)'},
  };

  static String extractFieldValue(Map<String, dynamic> m, String fieldKey) {
    switch (fieldKey) {
      case 'voterSerial':
        return '${m['voterSerial'] ?? ''}'.trim();
      case 'wardVoterSerial':
        return '${m['wardVoterSerial'] ?? ''}'.trim();
      case 'voterId':
        return '${m['voterId'] ?? ''}'.trim();
      case 'name':
        final n = '${m['name'] ?? ''}'.trim();
        final s = '${m['surname'] ?? ''}'.trim();
        return '$n $s'.trim();
      case 'guardianName':
        final g = '${m['guardianName'] ?? ''}'.trim();
        final r = '${m['relativeName'] ?? ''}'.trim();
        return g.isNotEmpty ? g : r;
      case 'relationType':
        final rel = '${m['relationType'] ?? ''}'.trim().toLowerCase();
        if (rel == 'father') return 'पिता';
        if (rel == 'husband') return 'पति';
        if (rel == 'mother') return 'माता';
        if (rel == 'other') return 'अन्य';
        return '${m['relationType'] ?? ''}';
      case 'age':
        return '${m['age'] ?? ''}'.trim();
      case 'gender':
        final g = '${m['gender'] ?? ''}'.trim().toLowerCase();
        if (g == 'male' || g == 'm') return 'पुरुष';
        if (g == 'female' || g == 'f') return 'महिला';
        if (g == 'other' || g == 'o') return 'अन्य';
        return '${m['gender'] ?? ''}';
      case 'mobile':
        return '${m['mobile'] ?? ''}'.trim();
      case 'altMobile':
        return '${m['altMobile'] ?? ''}'.trim();
      case 'houseNumber':
        return '${m['houseNumber'] ?? ''}'.trim();
      case 'village':
        return '${m['village'] ?? m['location'] ?? ''}'.trim();
      case 'wardNumber':
        final w = '${m['wardNumber'] ?? ''}'.trim();
        if (w.isNotEmpty) return w;
        final mw = m['municipalWardNumbers'];
        if (mw is List && mw.isNotEmpty) return '${mw.first}';
        return '';
      case 'partNumber':
        return '${m['partNumber'] ?? ''}'.trim();
      case 'gramPanchayat':
        return '${m['gramPanchayat'] ?? ''}'.trim();
      case 'tehsil':
        return '${m['tehsil'] ?? ''}'.trim();
      case 'municipality':
        return '${m['municipality'] ?? ''}'.trim();
      case 'caste':
        return '${m['caste'] ?? ''}'.trim();
      case 'subCaste':
        return '${m['subCaste'] ?? ''}'.trim();
      case 'occupation':
        return '${m['occupation'] ?? ''}'.trim();
      case 'education':
        return '${m['education'] ?? ''}'.trim();
      case 'organizationPost':
        return '${m['organizationPost'] ?? ''}'.trim();
      case 'supportLevel':
        final s = '${m['supportLevel'] ?? ''}'.trim().toLowerCase();
        if (s == 'supporter') return 'समर्थक';
        if (s == 'opposite') return 'विरोधी';
        if (s == 'neutral') return 'तटस्थ';
        if (s == 'undecided') return 'अनिर्णीत';
        return '${m['supportLevel'] ?? ''}';
      case 'partyPreference':
        final p = m['party'];
        if (p is Map) return '${p['name'] ?? m['partyPreference'] ?? ''}'.trim();
        return '${m['partyPreference'] ?? ''}'.trim();
      case 'isFavorite':
        return (m['isFavorite'] == true) ? 'हाँ' : 'नहीं';
      case 'favoriteRating':
        final r = m['favoriteRating'];
        return r != null && r != 0 ? '$r★' : '';
      case 'sectionName':
        final sNum = '${m['sectionNumber'] ?? ''}'.trim();
        final sName = '${m['sectionName'] ?? ''}'.trim();
        if (sNum.isNotEmpty && sName.isNotEmpty) return '$sNum - $sName';
        return sName.isNotEmpty ? sName : sNum;
      case 'address':
        return '${m['address'] ?? ''}'.trim();
      default:
        return '${m[fieldKey] ?? ''}'.trim();
    }
  }

  static List<int> createXlsx({
    required List<Map<String, dynamic>> members,
    required List<String> fieldKeys,
    String sheetName = 'मतदाता सूची',
  }) {
    final headers = fieldKeys.map((k) => fieldMetadata[k]?['label'] ?? k).toList();
    final rows = <List<dynamic>>[];

    for (final m in members) {
      final row = <dynamic>[];
      for (final k in fieldKeys) {
        final valStr = extractFieldValue(m, k);
        // If it's a numeric field, convert to num so Excel handles it as a number
        if ((k == 'voterSerial' || k == 'wardVoterSerial' || k == 'age') && valStr.isNotEmpty) {
          final n = num.tryParse(valStr);
          row.add(n ?? valStr);
        } else {
          row.add(valStr);
        }
      }
      rows.add(row);
    }

    return _buildXlsxArchive(headers, rows, sheetName: sheetName);
  }

  static List<int> _buildXlsxArchive(
    List<String> headers,
    List<List<dynamic>> rows, {
    String sheetName = 'Sheet1',
  }) {
    final archive = Archive();

    // 1. [Content_Types].xml
    const contentTypes = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>''';
    final ctBytes = utf8.encode(contentTypes);
    archive.addFile(ArchiveFile('[Content_Types].xml', ctBytes.length, ctBytes));

    // 2. _rels/.rels
    const rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>''';
    final relsBytes = utf8.encode(rels);
    archive.addFile(ArchiveFile('_rels/.rels', relsBytes.length, relsBytes));

    // 3. xl/_rels/workbook.xml.rels
    const wbRels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>''';
    final wbRelsBytes = utf8.encode(wbRels);
    archive.addFile(ArchiveFile('xl/_rels/workbook.xml.rels', wbRelsBytes.length, wbRelsBytes));

    // 4. xl/workbook.xml
    final safeSheetName = sheetName.replaceAll(RegExp(r'[\\/?*:[\]]'), '_').trim();
    final finalSheetName = safeSheetName.isNotEmpty ? safeSheetName : 'Sheet1';
    final wb = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="$finalSheetName" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>''';
    final wbBytes = utf8.encode(wb);
    archive.addFile(ArchiveFile('xl/workbook.xml', wbBytes.length, wbBytes));

    // 5. xl/worksheets/sheet1.xml
    final sb = StringBuffer();
    sb.writeln('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    sb.writeln('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
    sb.writeln('  <sheetData>');

    String escapeXml(String s) {
      return s
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&apos;');
    }

    String colLetter(int colIndex) {
      String res = '';
      int c = colIndex;
      while (c >= 0) {
        res = String.fromCharCode((c % 26) + 65) + res;
        c = (c ~/ 26) - 1;
      }
      return res;
    }

    // Row 1: Headers
    sb.writeln('    <row r="1">');
    for (int c = 0; c < headers.length; c++) {
      final cellRef = '${colLetter(c)}1';
      final val = escapeXml(headers[c]);
      sb.writeln('      <c r="$cellRef" t="inlineStr"><is><t>$val</t></is></c>');
    }
    sb.writeln('    </row>');

    // Rows 2..N: Data
    for (int r = 0; r < rows.length; r++) {
      final rowNum = r + 2;
      final row = rows[r];
      sb.writeln('    <row r="$rowNum">');
      for (int c = 0; c < row.length; c++) {
        final cellRef = '${colLetter(c)}$rowNum';
        final valObj = row[c];
        if (valObj == null) continue;
        if (valObj is num) {
          sb.writeln('      <c r="$cellRef"><v>$valObj</v></c>');
        } else {
          final val = escapeXml(valObj.toString());
          if (val.isEmpty) continue;
          sb.writeln('      <c r="$cellRef" t="inlineStr"><is><t>$val</t></is></c>');
        }
      }
      sb.writeln('    </row>');
    }

    sb.writeln('  </sheetData>');
    sb.writeln('</worksheet>');

    final sheetXml = sb.toString();
    final sheetBytes = utf8.encode(sheetXml);
    archive.addFile(ArchiveFile('xl/worksheets/sheet1.xml', sheetBytes.length, sheetBytes));

    final encoded = ZipEncoder().encode(archive);
    return encoded;
  }
}
