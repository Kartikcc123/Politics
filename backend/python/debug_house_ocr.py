import os
import sys
import cv2
import pytesseract
from pathlib import Path

pdf_file = Path(__file__).resolve().parent.parent / "sample-data" / "DOC-3pages.pdf"
print("Debug House OCR for PDF:", pdf_file)

# Render page 1 and page 3 using pdftoppm or fitz if available, or check rendered images
from ocr_worker import process_page

output_dir = Path(__file__).resolve().parent.parent / "scratch" / "ocr_debug"
output_dir.mkdir(parents=True, exist_ok=True)

# Run process_page on rendered page if exists
import glob
renders = glob.glob(str(Path(__file__).resolve().parent.parent / "backend" / "uploads" / "ocr" / "*" / "render-*.png"))
if not renders:
    renders = glob.glob(str(Path(__file__).resolve().parent.parent / "uploads" / "ocr" / "*" / "render-*.png"))

print("Found renders:", renders)
