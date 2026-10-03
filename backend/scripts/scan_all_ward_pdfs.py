import os
import re

downloads = r'C:\Users\Ashish Sharma\Downloads'
all_pdfs = {}

for root, dirs, files in os.walk(downloads):
    for f in files:
        if f.lower().endswith('.pdf') and ('ward' in f.lower() or 'no-' in f.lower()):
            full_path = os.path.join(root, f)
            # Extract GP prefix and Ward Number
            # e.g. "CHAROT-Ward No-001.pdf" or "AASHAHOLI-Ward No-001.pdf"
            m = re.match(r'([A-Za-z\s-]+?)-Ward\s*No-?0*(\d+)\.pdf', f, re.I)
            if m:
                gp_name = m.group(1).strip().upper()
                ward_no = int(m.group(2))
                if gp_name not in all_pdfs:
                    all_pdfs[gp_name] = {}
                all_pdfs[gp_name][ward_no] = full_path
            else:
                print(f"Other PDF: {f} at {full_path}")

print(f"\nTotal Gram Panchayats with Ward PDFs found: {len(all_pdfs)}\n")
for gp, wards in sorted(all_pdfs.items()):
    sorted_ward_nos = sorted(wards.keys())
    print(f"GP: {gp:25} | Wards: {len(wards):2} (W{sorted_ward_nos[0]}..W{sorted_ward_nos[-1]}) | Sample Path: {list(wards.values())[0]}")
