import os, sys, cv2
sys.path.insert(0, os.path.abspath('.'))
from python.ocr_worker import ocr_serial, safe_image_to_string, detect_card_boxes

# Render page 3 using pdftoppm
import subprocess
pdf_path = 'D:/Randeep Trivedi Voter list/Final Publication 21.02.2026/2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-129.pdf'
out_prefix = 'scratch_part129_p3'
subprocess.run(['pdftoppm', '-png', '-singlefile', '-r', '200', '-f', '3', '-l', '3', pdf_path, out_prefix], check=True)

img = cv2.imread(out_prefix + '.png')
boxes = detect_card_boxes(img)
print(f'Detected {len(boxes)} boxes')

for i in range(min(18, len(boxes))):
    x, y, w, h = boxes[i]
    card = img[y:y+h, x:x+w]
    s, dis = ocr_serial(card)
    
    # Also inspect top-left region directly
    s_region = card[0:round(h*0.22), 0:round(w*0.42)]
    s_gray = cv2.cvtColor(s_region, cv2.COLOR_BGR2GRAY)
    txt1 = safe_image_to_string(s_gray, lang="eng", config="--psm 6 -c tessedit_char_whitelist=0123456789").strip()
    txt2 = safe_image_to_string(s_gray, lang="eng", config="--psm 7 -c tessedit_char_whitelist=0123456789").strip()
    
    print(f'Slot {i+1}: ocr_serial="{s}" (dis={dis}), direct psm6="{txt1}", psm7="{txt2}"')
