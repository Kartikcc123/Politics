import os, json, glob

ocr_dirs = sorted(glob.glob("uploads/ocr/*-01-bheeta--1-"))
if not ocr_dirs:
    print("No bheeta OCR directory found")
    exit(1)

latest_dir = ocr_dirs[-1]
print(f"Inspecting directory: {latest_dir}")

import sys
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("python"))
from ocr_worker import process_card_image, safe_image_to_string
import cv2

# Let's inspect the cards in that directory
for c in range(1, 31):
    card_path = os.path.join(latest_dir, f"card_p3_c{c}.jpg")
    if not os.path.exists(card_path):
        continue
    res = process_card_image(card_path)
    print(f"Card #{c:02d}: Serial={res.get('voterSerial')} | EPIC={res.get('voterId')} | Name={res.get('name')} | Guardian={res.get('guardianName')} ({res.get('relationType')}) | House={res.get('houseNumber')} | Age={res.get('age')} | Gender={res.get('gender')}")
