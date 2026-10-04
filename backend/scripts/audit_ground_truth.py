import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python"))
import ocr_worker

golden_path = Path(__file__).resolve().parent.parent / "test" / "fixtures" / "bheeta-page3.golden.json"

with open(golden_path, "r", encoding="utf-8") as f:
    golden = json.load(f)["records"]

print("=" * 115)
print("             EXACT CARD-BY-CARD AUDIT: OCR OUTPUT vs ADMIN-VERIFIED GROUND TRUTH")
print("=" * 115)
header = f"{'#':<3} | {'Field':<10} | {'OCR Result':<25} | {'Ground Truth':<25} | {'Match?':<6}"
print(header)
print("-" * 115)

field_stats = {"voterSerial": 0, "voterId": 0, "name": 0, "guardianName": 0, "houseNumber": 0, "age": 0, "gender": 0}
total_cards = len(golden)

diff_summary = []

for i, g in enumerate(golden):
    img_name = f"card_p3_c{i+1}.jpg"
    card_path = Path(__file__).resolve().parent.parent.parent / img_name
    if not card_path.exists():
        print(f"Missing image {img_name}")
        continue

    res = ocr_worker.process_card_image(str(card_path))

    card_mismatches = []
    for f_key in ["voterSerial", "voterId", "name", "guardianName", "houseNumber", "age", "gender"]:
        ocr_val = str(res.get(f_key, "") if res.get(f_key) is not None else "").strip()
        gold_val = str(g.get(f_key, "") if g.get(f_key) is not None else "").strip()

        # Normalize minor spacing for comparison display
        is_exact = ocr_val.replace(" ", "") == gold_val.replace(" ", "")
        if is_exact:
            field_stats[f_key] += 1
        else:
            card_mismatches.append((f_key, ocr_val, gold_val))

    card_status = "PERFECT" if not card_mismatches else f"{len(card_mismatches)} diff(s)"
    s_ocr = str(res.get("voterSerial", ""))
    s_gold = str(g.get("voterSerial", ""))
    n_ocr = str(res.get("name", ""))
    n_gold = str(g.get("name", ""))
    e_ocr = str(res.get("voterId", ""))
    e_gold = str(g.get("voterId", ""))
    h_ocr = str(res.get("houseNumber", ""))
    h_gold = str(g.get("houseNumber", ""))
    a_ocr = str(res.get("age", ""))
    a_gold = str(g.get("age", ""))

    print(f"Card #{i+1:2d} | Serial: {s_ocr:>2s} (True: {s_gold:>2s}) | EPIC: {e_ocr:<10s} (True: {e_gold:<10s}) | Name: {n_ocr:<12s} (True: {n_gold:<12s}) | House: {h_ocr:>2s} (True: {h_gold:>2s}) | Age: {a_ocr:>2s} (True: {a_gold:>2s}) | {card_status}")
    if card_mismatches:
        for fk, ov, gv in card_mismatches:
            diff_summary.append((i + 1, fk, ov, gv))

print("=" * 115)
print("                                 FIELD-LEVEL ACCURACY SUMMARY")
print("=" * 115)
for f_key, count in field_stats.items():
    pct = (count / total_cards) * 100
    print(f"  * {f_key.ljust(15)}: {count:2d} / {total_cards:2d} ({pct:5.1f}% match with real data)")

if diff_summary:
    print("\n--- SPECIFIC DIFFERENCES FOUND ---")
    for c_num, fk, ov, gv in diff_summary:
        print(f"  Card #{c_num:2d} -> [{fk}]: OCR got '{ov}' | Real was '{gv}'")
else:
    print("\nALL 30 CARDS MATCHED 100% WITH ZERO DIFFERENCES!")
