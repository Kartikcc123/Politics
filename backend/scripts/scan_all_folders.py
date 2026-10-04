import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

downloads = r'C:\Users\Ashish Sharma\Downloads'
print(f"Scanning {downloads} for Panchayat folders and PDFs...\n")

folders = []
try:
    for item in os.listdir(downloads):
        item_path = os.path.join(downloads, item)
        if os.path.isdir(item_path):
            pdfs = [f for f in os.listdir(item_path) if f.lower().endswith('.pdf')]
            if pdfs:
                folders.append((item, item_path, len(pdfs), pdfs[:3]))
except Exception as e:
    print(f"Error: {e}")

print(f"Found {len(folders)} folders with PDFs:")
for name, path, count, sample_pdfs in sorted(folders):
    print(f"- {name} ({count} PDFs): e.g. {sample_pdfs}")
