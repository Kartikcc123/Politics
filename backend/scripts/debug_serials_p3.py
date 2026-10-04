import glob, os, sys, cv2
sys.path.insert(0, os.path.abspath('.'))
from pathlib import Path
from python.ocr_worker import ocr_serial

renders = sorted(glob.glob("uploads/ocr/*/render-3.png"), key=os.path.getmtime)
print("Latest render:", renders[-1] if renders else None)
if renders:
    img = cv2.imread(renders[-1])
    if img is None:
        print("Failed to read image!")
    from python.ocr_worker import detect_card_boxes
    boxes = detect_card_boxes(img)
    print("Boxes count:", len(boxes))
    for i, b in enumerate(boxes[:18]):
        x, y, w, h = b
        card = img[y:y+h, x:x+w]
        s, dis = ocr_serial(card)
        print(f"Slot {i+1}: raw serial OCR = '{s}', disagreement={dis}")
