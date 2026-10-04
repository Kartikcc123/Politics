import cv2, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))
from ocr_worker import detect_card_boxes, ocr_serial, preserve_card_serials

for p, start in [('test_p4_6-04.png', 31), ('test_p4_6-05.png', 61)]:
    img = cv2.imread(os.path.join(os.path.dirname(__file__), '..', 'uploads', p))
    boxes = detect_card_boxes(img)
    recs = []
    for i, b in enumerate(boxes):
        card = img[b[1]:b[1]+b[3], b[0]:b[0]+b[2]]
        s, _ = ocr_serial(card)
        recs.append({'cell': i+1, 'voterSerial': s, 'rawVoterSerial': s})
    preserve_card_serials(recs, start)
    print(f"=== {p} Serials ===")
    for r in recs:
        print(f"Cell {r['cell']:02d}: final={r.get('voterSerial')} | raw={r.get('rawVoterSerial')}")
