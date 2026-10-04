import os, sys, cv2, subprocess, numpy as np
sys.path.insert(0, os.path.abspath('.'))
from python.ocr_worker import ocr_epic, safe_image_to_string, detect_card_boxes, clean_epic

pdf_path = 'D:/Randeep Trivedi Voter list/Final Publication 21.02.2026/2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-121.pdf'
out_prefix = 'scratch_part121_p12'
subprocess.run(['pdftoppm', '-png', '-singlefile', '-r', '200', '-f', '12', '-l', '12', pdf_path, out_prefix], check=True)

img = cv2.imread(out_prefix + '.png')
boxes = detect_card_boxes(img)
print(f'Detected {len(boxes)} boxes on Page 12')

# Let's find card with Ankit / 296
for i, (x, y, w, h) in enumerate(boxes):
    card = img[y:y+h, x:x+w]
    winner, ok = ocr_epic(card)
    
    # Check if this card contains 296 or SNE1512565 / SNE1812565
    crop = card[0:round(h * 0.28), round(w * 0.38):w]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    res = cv2.resize(gray, None, fx=3.2, fy=3.2, interpolation=cv2.INTER_CUBIC)
    
    txt = safe_image_to_string(res, lang="eng", config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/").strip()
    if '1512565' in txt or '1812565' in txt or '1512565' in winner or '1812565' in winner:
        print(f'Found target card at slot {i+1}!')
        print(f'Current ocr_epic returned: {winner}')
        
        # Test various preprocessing variations
        # 1. Unsharp mask
        gaussian = cv2.GaussianBlur(res, (0, 0), 2.0)
        unsharp = cv2.addWeighted(res, 1.8, gaussian, -0.8, 0)
        u_txt = clean_epic(safe_image_to_string(unsharp, lang="eng", config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/"))
        print(f'Unsharp mask PSM 7: {u_txt}')
        
        # 2. Adaptive threshold with smaller block
        adapt = cv2.adaptiveThreshold(res, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 9)
        a_txt = clean_epic(safe_image_to_string(adapt, lang="eng", config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/"))
        print(f'Adaptive 15/9 PSM 7: {a_txt}')
        
        # 3. Lanczos resize with gamma
        res_lanc = cv2.resize(gray, None, fx=3.5, fy=3.5, interpolation=cv2.INTER_LANCZOS4)
        l_txt = clean_epic(safe_image_to_string(res_lanc, lang="eng", config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/"))
        print(f'Lanczos PSM 7: {l_txt}')
        
        # 4. Otsu with Morph open (to disconnect 5 from becoming 8)
        _, otsu = cv2.threshold(res, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        k_open = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        opened = cv2.morphologyEx(otsu, cv2.MORPH_OPEN, k_open)
        o_txt = clean_epic(safe_image_to_string(opened, lang="eng", config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/"))
        print(f'Otsu Open PSM 7: {o_txt}')
        
        break
