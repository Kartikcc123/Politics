import cv2
import numpy as np
import sys
import os

# Add python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))
from ocr_worker import detect_card_boxes, ocr_serial, parse_card

img_path = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'test_amli_p3.png')
img = cv2.imread(img_path)
print(f"Image shape: {img.shape}")

boxes = detect_card_boxes(img)
print(f"Total boxes detected: {len(boxes)}")

for i, b in enumerate(boxes):
    card = img[b[1]:b[1]+b[3], b[0]:b[0]+b[2]]
    s, d = ocr_serial(card)
    row = i // 3
    col = i % 3
    print(f"Card {i+1:02d} (row {row}, col {col}): box={b} -> serial='{s}'")
