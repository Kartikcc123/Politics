import sys
import json
import os
import subprocess
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python"))
import ocr_worker

pdf_path = Path(__file__).resolve().parent.parent.parent / "sample-data" / "DOC-3pages.pdf"
scratch_dir = Path(__file__).resolve().parent.parent / "scratch"
scratch_dir.mkdir(exist_ok=True)

img_prefix = scratch_dir / "render-3"
img_path = scratch_dir / "render-3.png"

# Render Page 3 using pdftoppm
subprocess.run([
    "pdftoppm", "-png", "-singlefile", "-r", "350",
    "-f", "3", "-l", "3", str(pdf_path), str(img_prefix)
], check=True)

records = ocr_worker.process_page(img_path, scratch_dir, 3)

print("\n" + "=" * 115)
print("                       FULL 30-CARD ACCURACY REPORT FOR PAGE 3 OF DOC-3pages.pdf")
print("=" * 115)
header = f"{'Cell':<5} | {'Serial':<7} | {'EPIC Number':<18} | {'Voter Name':<16} | {'Guardian Name':<16} | {'House':<6} | {'Age':<4} | {'Gender':<7}"
print(header)
print("-" * 115)

for r in records:
    c = str(r.get("cell", ""))
    s = str(r.get("voterSerial", ""))
    e = str(r.get("voterId", ""))
    n = str(r.get("name", ""))
    g = str(r.get("guardianName", ""))
    h = str(r.get("houseNumber", ""))
    a = str(r.get("age", ""))
    gen = str(r.get("gender", ""))
    
    print(f"{c:<5} | {s:<7} | {e:<18} | {n:<16} | {g:<16} | {h:<6} | {a:<4} | {gen:<7}")

print("-" * 115)
print(f"TOTAL CARDS EXTRACTED: {len(records)} / 30\n")
