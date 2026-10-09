import os
import glob
import pypdf
import re
import json

folders = [
    r"C:\Users\Ashish Sharma\Downloads\Masinghpura_Wards",
    r"C:\Users\Ashish Sharma\Downloads\Nahri_Wards",
    r"C:\Users\Ashish Sharma\Downloads\narayankhera",
    r"C:\Users\Ashish Sharma\Downloads\c",
    r"C:\Users\Ashish Sharma\Downloads\o",
    r"C:\Users\Ashish Sharma\Downloads\Borana",
    r"C:\Users\Ashish Sharma\Downloads\w",
    r"C:\Users\Ashish Sharma\Downloads\boriyapur",
    r"C:\Users\Ashish Sharma\Downloads\5",
    r"C:\Users\Ashish Sharma\Downloads\Nahri",
    r"C:\Users\Ashish Sharma\Downloads\Masinghpur",
    r"C:\Users\Ashish Sharma\Downloads\mokhunda",
    r"C:\Users\Ashish Sharma\Downloads\suras",
    r"C:\Users\Ashish Sharma\Downloads\sagrev",
    r"C:\Users\Ashish Sharma\Downloads\Raipur",
    r"C:\Users\Ashish Sharma\Downloads\palra",
    r"C:\Users\Ashish Sharma\Downloads\panotiya",
    r"C:\Users\Ashish Sharma\Downloads\Nathdiyas",
    r"C:\Users\Ashish Sharma\Downloads\KHEMANA-",
    r"C:\Users\Ashish Sharma\Downloads\THALA",
    r"C:\Users\Ashish Sharma\Downloads\nandasa",
    r"C:\Users\Ashish Sharma\Downloads"
]

all_pdf_files = []
for folder in folders:
    if os.path.exists(folder):
        for root, dirs, files in os.walk(folder):
            for f in files:
                if f.lower().endswith(".pdf") and not f.startswith("2026-EROLLGEN"):
                    full_p = os.path.join(root, f)
                    if full_p not in all_pdf_files:
                        all_pdf_files.append(full_p)

print(f"Total unique Ward PDF files found: {len(all_pdf_files)}")

# Sample list of files
for p in all_pdf_files[:25]:
    print("  ", p)

with open(r"d:\Users\Ashish Sharma\OneDrive\Documents\Downloads\Politics-main\Politics-main\backend\scripts\all_ward_pdf_paths.json", "w", encoding="utf-8") as out:
    json.dump(all_pdf_files, out, ensure_ascii=False, indent=2)

print(f"\nSaved all {len(all_pdf_files)} PDF paths to all_ward_pdf_paths.json")
