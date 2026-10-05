import sys, os, cv2, json, re
from pathlib import Path
import pytesseract

pdf_path = Path(r"C:\Users\Ashish Sharma\OneDrive\Documents\Downloads\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-177.pdf")
print("Testing PDF:", pdf_path.exists())

# We can test process_page or ocr_house on rendered page images if available
# Let's inspect uploads/ocr or scratch/ to see if images exist
import glob
renders = glob.glob(str(Path(__file__).resolve().parent.parent / "backend" / "uploads" / "ocr" / "*" / "page-3.png"))
if not renders:
    renders = glob.glob(str(Path(__file__).resolve().parent.parent / "uploads" / "ocr" / "*" / "page-3.png"))
print("Renders found:", renders)
