import os
import sys
import json
import re
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

tess_paths = [
    os.getenv("TESSERACT_PATH"),
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\Ashish Sharma\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
]
for p in tess_paths:
    if p and os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break

from python.ocr_worker import read_header, read_fixed_header, parse_header_numbers

def test_pdf_village(pdf_path):
    print("=" * 60)
    print(f"Testing PDF: {os.path.basename(pdf_path)}")
    print("=" * 60)
    if not os.path.exists(pdf_path):
        print("File not found:", pdf_path)
        return

    doc = fitz.open(pdf_path)
    page1 = doc.load_page(0)
    pix = page1.get_pixmap(dpi=200)
    img_path = "temp_page1_test.png"
    pix.save(img_path)
    doc.close()

    header_text = read_header(img_path, is_voter_page=False)
    fixed = read_fixed_header(img_path, is_voter_page=False)
    parsed = parse_header_numbers(header_text)
    parsed.update(fixed)

    print("\n--- EXTRACTED HEADER INFO ---")
    print(f"विधानसभा (Assembly)   : {parsed.get('assemblyNumber')} - {parsed.get('assemblyName')}")
    print(f"भाग संख्या (Part Number) : {parsed.get('partNumber')}")
    print(f"गाँव का नाम (Village)    : '{parsed.get('village')}'")
    print(f"डाकघर (Post Office)     : '{parsed.get('postOffice')}'")
    print(f"पुलिस थाना (Police Stn)  : '{parsed.get('policeStation')}'")
    print(f"तहसील (Tehsil)           : '{parsed.get('tehsil')}'")
    print(f"जिला (District)         : '{parsed.get('district')}'")
    print(f"पिन कोड (Pin Code)      : '{parsed.get('pinCode') or parsed.get('rawPinCode')}'")

    if parsed.get('sectionMap'):
        print("\n--- ANUBHAG (SECTIONS) MAP ---")
        for k, v in parsed.get('sectionMap', {}).items():
            print(f"  अनुभाग {k}: {v}")

    if os.path.exists(img_path):
        os.remove(img_path)

if __name__ == "__main__":
    pdf112 = r"D:\Randeep Trivedi Voter list\Final Publication 21.02.2026\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-112.pdf"
    pdf1 = r"D:\Randeep Trivedi Voter list\Final Publication 21.02.2026\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-1.pdf"
    
    if os.path.exists(pdf112):
        test_pdf_village(pdf112)
    if os.path.exists(pdf1):
        test_pdf_village(pdf1)
