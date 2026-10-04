import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def decode_sec_hindi(raw_str):
    if not raw_str:
        return ""
    
    s = raw_str.strip()
    
    # Remove noise
    s = re.sub(r'Photo\s*is\s*Available', '', s, flags=re.I)
    s = re.sub(r'Available', '', s, flags=re.I)
    s = re.sub(r'Photo', '', s, flags=re.I)
    s = re.sub(r'is', '', s, flags=re.I)
    s = s.strip()
    
    # Common full word replacements first
    word_map = {
        'नरम': 'नाम',
        'नपतर': 'पिता',
        'पनत': 'पति',
        'मरतर': 'माता',
        'मकरन': 'मकान',
        'सपखजर': 'संख्या',
        'आजच': 'आयु',
        'ललग': 'लिंग',
        'सल': 'स्त्री',
        'पचरुष': 'पुरुष',
        'कर': 'का',
        'कक': 'की',
        'एरप': 'एवं',
        'ररडर': 'वार्ड',
        'खकमरणर': 'खेमाणा',
        'ररजपचर': 'रायपुर',
        'भललररडर': 'भीलवाड़ा',
        'पपचरजत': 'पंचायत',
        'गरमपपचरजत': 'ग्राम पंचायत',
        'चचनरर': 'चुनाव',
        'ननरररचक': 'निर्वाचक',
        'नरमररलल': 'नामावली',
        'ननरररचन': 'निर्वाचन',
        'ररजससरन': 'राजस्थान',
        'ररजज': 'राज्य',
        'आजयग': 'आयोग',
        'सदसज': 'सदस्य',
        'ककत': 'क्षेत्र',
        'सनमनत': 'समिति',
        'नजलर': 'जिला',
        'पररषद': 'परिषद',
        'नरधरनसभर': 'विधानसभा',
        'सहरडर': 'सहाड़ा',
        'गचजर': 'गुर्जर',
        'मयहललर': 'मोहल्ला',
        'दकशयरपचरर': 'किशोरपुरा',
        'सयररजरप': 'थोरियां',
        'खकडर': 'खेड़ा',
    }
    
    # Process word by word or phrase
    # Let's inspect character mapping for names:
    # Character rules:
    # 1. 'न' before consonant -> 'ि' (choti ee matra)
    # 2. 'र' after consonant -> 'ा' (aa matra)
    # 3. 'ल' after consonant -> 'ी' (badi ee matra)
    # 4. 'क' after consonant -> 'े' (e matra)
    # 5. 'य' after consonant -> 'ो' (o matra)
    # 6. 'च' after consonant -> 'ु' (u matra)
    # 7. 'ब' after consonant -> 'ू' (oo matra)
    # 8. 'प' after consonant -> 'ं' (anusvara / bindu)
    # 9. 'ज' as consonant -> 'य' (ya)
    # 10. 'स' in some contexts -> 'थ' (tha)
    
    return s

test_names = [
    ("नरररजणल", "नारायणी"),
    ("चपपर लरल", "चंपा लाल"),
    ("नगरधररल", "गिरधारी"),
    ("सनतयकक", "सन्तोकी"),
    ("भरगब", "भागू"),
    ("सयहन लरल", "सोहन लाल"),
    ("भरगलरस", "भागीरथ"),
    ("ननद लरल", "नन्द लाल"),
    ("ममतर कच मररल", "ममता कुमारी"),
    ("जकतल", "जेती"),
    ("रक रत", "रेवत"),
    ("लरदब", "लादू"),
    ("करपरल", "कंवरी"),
    ("कजयडल मल गचजर", "कजोडी मल गुर्जर"),
    ("भकरर", "भेरा"),
    ("कच पर", "रूपा"),
    ("गपगर दकरल", "गंगा देवी"),
    ("दकरर", "देवा"),
    ("पकमल", "पेमी"),
    ("गयहर", "गोहरू"),
    ("हगरमल", "हगामी"),
    ("दकशनर", "किशना"),
    ("नयसल", "नोसी"),
    ("नरररजण", "नारायण"),
    ("शपकरल", "शंकरी"),
    ("मरपगल लरल", "मांगी लाल"),
]

print("Testing mapping rules...")
for raw, expected in test_names:
    print(f"Raw: {raw:20} -> Expected: {expected}")
