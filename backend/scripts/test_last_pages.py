import cv2, json, sys, os
sys.path.append('backend/python')
from ocr_worker import detect_card_boxes, _process_single_card, is_voter_page, safe_image_to_string, process_page

print("=== PAGE 28 ===")
img28 = cv2.imread('backend/uploads/test_pages/page_28.png')
boxes28 = detect_card_boxes(img28)
print(f"Page 28 boxes detected: {len(boxes28)}")
for i, b in enumerate(boxes28[:10]):
    r = _process_single_card((i+1, b, img28, 28, 'backend/uploads/test_pages'))
    print(f"Box {i+1}: serial={r.get('voterSerial')}, name={r.get('name')}, guardian={r.get('guardianName')}, epic={r.get('voterId')}, age={r.get('age')}")

print("\n=== PAGE 29 ===")
img29 = cv2.imread('backend/uploads/test_pages/page_29.png')
boxes29 = detect_card_boxes(img29)
print(f"Page 29 boxes detected: {len(boxes29)}")
for i, b in enumerate(boxes29):
    r = _process_single_card((i+1, b, img29, 29, 'backend/uploads/test_pages'))
    print(f"Box {i+1}: serial={r.get('voterSerial')}, name={r.get('name')}, guardian={r.get('guardianName')}, epic={r.get('voterId')}, age={r.get('age')}")

print("\n=== PAGE 30 ===")
img30 = cv2.imread('backend/uploads/test_pages/page_30.png')
boxes30 = detect_card_boxes(img30)
print(f"Page 30 boxes detected: {len(boxes30)}")
print(f"Page 30 is_voter_page: {is_voter_page(img30, 30)}")
