import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python"))
import ocr_worker

p3_path = Path(__file__).resolve().parent.parent / "temp_p3.png"
scratch_dir = Path(__file__).resolve().parent.parent / "scratch"

records = ocr_worker.process_page(p3_path, scratch_dir, 3)

print("\n================ PAGE 3 HOUSE NUMBERS EXTRACTION RESULT ================", flush=True)
print(f"{'Cell':<6} | {'House Number':<15} | {'Voter Name':<20} | {'EPIC':<15}", flush=True)
print("-" * 65, flush=True)
for r in records:
    c = r.get("cell")
    h = r.get("houseNumber") or "-"
    n = r.get("name") or "-"
    v = r.get("voterId") or "-"
    print(f"{c:<6} | {h:<15} | {n:<20} | {v:<15}", flush=True)
