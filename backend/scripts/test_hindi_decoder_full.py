import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def decode_sec_hindi_word(word):
    if not word:
        return ""
    
    w = word.strip()
    
    # 1. Exact / Full word override dictionary (common names, titles, relations)
    exact_dict = {
        'दकरल': 'देवी',
        'दक रल': 'देवी',
        'दकरर': 'देवा',
        'लरल': 'लाल',
        'लरलल': 'लाली',
        'कच मररल': 'कुमारी',
        'कच मररत': 'कुमावत',
        'कच मरर': 'कुमार',
        'गचजर': 'गुर्जर',
        'गचजरर': 'गुर्जर',
        'जकतल': 'जेती',
        'रक रत': 'रेवत',
        'लरदब': 'लादू',
        'करपरल': 'कंवरी',
        'करवरल': 'कंवरी',
        'भकरर': 'भेरा',
        'पकमल': 'पेमी',
        'पकमदकरल': 'पेमी देवी',
        'मलनर': 'मीना',
        'सलमर': 'सीमा',
        'पबजर': 'पूजा',
        'पलनत': 'प्रीति',
        'समतर': 'ममता',
        'ममतर': 'ममता',
        'ममतक': 'ममता',
        'सचगनर': 'सुगना',
        'कप चन': 'कंचन',
        'कपचन': 'कंचन',
        'भगरतल': 'भगवती',
        'हलरर': 'हीरा',
        'नगरधररल': 'गिरधारीलाल',
        'नगरधर': 'गिरधारी',
        'भरगब': 'भागू',
        'भरगच': 'भागू',
        'सयहन': 'सोहन',
        'भरगलरस': 'भागीरथ',
        'ननद': 'नन्द',
        'कजयडल': 'कजोडी',
        'गयहर': 'गोहरू',
        'गयहजब': 'गोहरू',
        'हगरमल': 'हगामी',
        'दकशनर': 'किशना',
        'नकशना': 'किशना',
        'नयसल': 'नोसी',
        'नकसल': 'नोसी',
        'नरररजण': 'नारायण',
        'नरररजणल': 'नारायणी',
        'शपकरल': 'शंकरी',
        'मरपगल': 'मांगी',
        'सनतयकक': 'सन्तोकी',
        'चपपरलरल': 'चंपालाल',
        'चप रलरल': 'चंपालाल',
        'चपपर': 'चंपा',
        'सचशललर': 'सुशीला',
        'कदशल जर': 'कौशल्या',
        'कमलर': 'कमला',
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
        'मयहललर': 'मोहल्ला',
        'खकडर': 'खेड़ा',
        'सयररजरप': 'सुरजियों',
        'दकशयरपचरर': 'किशोरपुरा',
        'नपगजल': 'पेगजी',
        'कच पर': 'रूपा',
        'रपपर': 'रूपा',
        'गपगर': 'गंगा',
    }
    
    if w in exact_dict:
        return exact_dict[w]

    # 2. General phonetic / glyph replacement engine:
    res = w
    
    # Pre-substitutions for compound glyphs
    res = res.replace('ससरन', 'स्थान')
    res = res.replace('ककत', 'क्षेत्र')
    res = res.replace('दकरल', 'देवी')
    res = res.replace('दकरर', 'देवा')
    res = res.replace('लरल', 'लाल')
    res = res.replace('लरलल', 'लाली')
    res = res.replace('कच मरर', 'कुमार')
    res = res.replace('कच मररल', 'कुमारी')
    res = res.replace('कच मररत', 'कुमावत')
    res = res.replace('गचजर', 'गुर्जर')
    
    # Consonant / Vowel replacements
    # Matras:
    # 'र' after consonant -> 'ा'
    # 'ल' after consonant -> 'ी'
    # 'क' after consonant -> 'े'
    # 'य' after consonant -> 'ो'
    # 'च' after consonant -> 'ु'
    # 'ब' after consonant -> 'ू'
    # 'प' before/after -> 'ं'
    
    # Let's use regex passes:
    # 1. 'न' before consonant -> 'ि' (choti ee matra placed after consonant in Unicode)
    # e.g. 'न' + [क-ह] -> [क-ह] + 'ि'
    res = re.sub(r'न([क-ह])', r'\1ि', res)
    
    # 2. 'र' as aa matra: [क-ह] + 'र' -> [क-ह] + 'ा'
    # Exception: if double 'र', e.g. 'नरररजण' -> 'न' + 'ा' + 'रा' + 'य' + 'ण'
    res = re.sub(r'([क-ह])र', r'\1ा', res)
    
    # 3. 'ल' as ee matra: [क-ह|ा|ि|ु|ू|े|ो] + 'ल' -> [क-ह] + 'ी'
    res = re.sub(r'([क-ह])ल', r'\1ी', res)
    
    # 4. 'क' as e matra: [क-ह] + 'क' -> [क-ह] + 'े'
    res = re.sub(r'([क-ह])क', r'\1े', res)
    
    # 5. 'य' as o matra: [क-ह] + 'य' -> [क-ह] + 'ो'
    res = re.sub(r'([क-ह])य', r'\1ो', res)
    
    # 6. 'च' as u matra: [क-ह] + 'च' -> [क-ह] + 'ु'
    res = re.sub(r'([क-ह])च', r'\1ु', res)
    
    # 7. 'ब' as oo matra: [क-ह] + 'ब' -> [क-ह] + 'ू'
    res = re.sub(r'([क-ह])ब', r'\1ू', res)
    
    # 8. 'प' as anusvara / bindu: [क-ह] + 'प' -> [क-ह] + 'ं' or 'प' + [क-ह] -> [क-ह] + 'ं'
    res = re.sub(r'([क-ह])प', r'\1ं', res)
    
    # 9. 'ज' as 'य' in Hindi names
    # e.g. 'नारायण'
    res = res.replace('ज', 'य')
    
    # 10. Clean up any invalid combinations
    res = re.sub(r'[ािीुूेैोौं]+', lambda m: m.group(0)[-1] if len(m.group(0)) > 2 else m.group(0), res)
    
    return res

def decode_sec_hindi_full(text):
    if not text:
        return ""
    # Clean noise
    text = re.sub(r'Photo\s*is\s*Available', '', text, flags=re.I)
    text = re.sub(r'Available', '', text, flags=re.I)
    text = re.sub(r'Photo', '', text, flags=re.I)
    text = re.sub(r'is', '', text, flags=re.I)
    
    words = text.strip().split()
    decoded_words = [decode_sec_hindi_word(w) for w in words]
    return ' '.join(decoded_words)

# Test on our list of samples
samples = [
    "सचशललर दकरल",
    "कदशल जर दकरल",
    "कमलर दकरल",
    "पकमदकरल",
    "मलनर दकरल",
    "सचशललर दकरल",
    "सलमरदकरल",
    "पबजर दकरल",
    "लरलल दकरल",
    "पलनत दकरल",
    "समतर दकरल",
    "शपकरल दकरल कच मररत",
    "सचगनरदकरल",
    "कप चनदकरल",
    "भगरतल दकरल",
    "नरररजणल",
    "चपपर लरल",
    "नगरधररल",
    "सनतयकक",
    "भरगब",
    "सयहन लरल",
    "भरगलरस",
    "ननद लरल",
    "ममतर कच मररल",
    "जकतल",
    "रक रत",
    "लरदब",
    "करपरल",
    "कजयडल मल गचजर",
    "भकरर",
    "कच पर",
    "गपगर दकरल",
    "दकरर",
    "पकमल",
    "गयहर",
    "हगरमल",
    "दकशनर",
    "नयसल",
    "नरररजण",
    "शपकरल",
    "मरपगल लरल",
]

print(f"{'RAW INPUT':25} | {'DECODED OUTPUT'}")
print("-" * 50)
for s in samples:
    dec = decode_sec_hindi_full(s)
    print(f"{s:25} | {dec}")
