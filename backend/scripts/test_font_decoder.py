import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def decode_sec_rajasthan_font(text):
    if not text:
        return ''
    
    # 1. Clean up known noise
    text = re.sub(r'Photo\s*is\s*Available', '', text, flags=re.I)
    text = re.sub(r'Available', '', text, flags=re.I)
    text = re.sub(r'Photo', '', text, flags=re.I)
    text = re.sub(r'is', '', text, flags=re.I)
    
    # Let's inspect character codes and substitutions
    # Let's see the sequence of transformations:
    
    # Specific multi-char clusters first:
    clusters = [
        ('ससरन', 'स्थान'),
        ('ककत', 'क्षेत्र'),
        ('ननरररचन', 'निर्वाचन'),
        ('ननरररचक', 'निर्वाचक'),
        ('नरमररलल', 'नामावली'),
        ('पपचरजत', 'पंचायत'),
        ('गरमपपचरजत', 'ग्राम पंचायत'),
        ('ररजससरन', 'राजस्थान'),
        ('भललररडर', 'भीलवाड़ा'),
        ('ररजपचर', 'रायपुर'),
        ('खकमरणर', 'खेमाणा'),
        ('ररडर', 'वार्ड'),
        ('चचनरर', 'चुनाव'),
        ('सनमनत', 'समिति'),
        ('नजलरपररषद', 'जिला परिषद'),
        ('सदसज', 'सदस्य'),
        ('आजयग', 'आयोग'),
        ('ररजज', 'राज्य'),
        ('पचरुष', 'पुरुष'),
        ('सल', 'स्त्री'),
        ('मकरन', 'मकान'),
        ('सपखजर', 'संख्या'),
        ('आजच', 'आयु'),
        ('ललग', 'लिंग'),
        ('नरम', 'नाम'),
        ('नपतर', 'पिता'),
        ('पनत', 'पति'),
        ('मरतर', 'माता'),
    ]
    
    for src, dst in clusters:
        text = text.replace(src, dst)
        
    return text

print("Testing cluster replacements...")
sample = "नरम: नरररजणल पनत कर नरम: चपरलरल मकरन सपखजर: 31 आजच : 25 ललग: सल"
print("Original:", sample)
print("Decoded :", decode_sec_rajasthan_font(sample))
