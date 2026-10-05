import re

pdf1_realistic = [
    {"cell": 1, "houseNumber": "8"},
    {"cell": 2, "houseNumber": "8"},
    {"cell": 3, "houseNumber": "138"},
    {"cell": 4, "houseNumber": "9"},
    {"cell": 5, "houseNumber": "9"},
    {"cell": 6, "houseNumber": "129"},
    {"cell": 7, "houseNumber": "9"},
    {"cell": 8, "houseNumber": "9"},
    {"cell": 9, "houseNumber": "1"},
    {"cell": 10, "houseNumber": "10"},
    {"cell": 11, "houseNumber": "10"},
    {"cell": 12, "houseNumber": "10"},
    {"cell": 13, "houseNumber": "10"},
    {"cell": 14, "houseNumber": "10"},
    {"cell": 15, "houseNumber": "10"},
    {"cell": 16, "houseNumber": "10"},
    {"cell": 17, "houseNumber": "10"},
    {"cell": 18, "houseNumber": "211"},
    {"cell": 19, "houseNumber": "211"},
    {"cell": 20, "houseNumber": "74"},
    {"cell": 21, "houseNumber": "4"},
    {"cell": 22, "houseNumber": "11"},
    {"cell": 23, "houseNumber": "11"},
    {"cell": 24, "houseNumber": "11"},
    {"cell": 25, "houseNumber": "411"},
    {"cell": 26, "houseNumber": "12"},
    {"cell": 27, "houseNumber": "1312"},
    {"cell": 28, "houseNumber": "212"},
    {"cell": 29, "houseNumber": "212"},
    {"cell": 30, "houseNumber": "212"},
]

pdf2_realistic = [
    {"cell": 1, "houseNumber": "00"},
    {"cell": 2, "houseNumber": "130"},
    {"cell": 3, "houseNumber": "1"},
    {"cell": 4, "houseNumber": "00"},
    {"cell": 5, "houseNumber": "0"},
    {"cell": 6, "houseNumber": "172"},
    {"cell": 7, "houseNumber": "112"},
    {"cell": 8, "houseNumber": "2112"},
    {"cell": 9, "houseNumber": "4215"},
    {"cell": 10, "houseNumber": "1261"},
    {"cell": 11, "houseNumber": "2417"},
    {"cell": 12, "houseNumber": "4194"},
    {"cell": 13, "houseNumber": "4194"},
    {"cell": 14, "houseNumber": "4194"},
    {"cell": 15, "houseNumber": "4194"},
    {"cell": 16, "houseNumber": "4194"},
    {"cell": 17, "houseNumber": "4194"},
    {"cell": 18, "houseNumber": "1"},
    {"cell": 19, "houseNumber": "4795"},
    {"cell": 20, "houseNumber": "4195"},
    {"cell": 21, "houseNumber": "4195"},
    {"cell": 22, "houseNumber": "4195"},
    {"cell": 23, "houseNumber": "4196"},
    {"cell": 24, "houseNumber": "4196"},
    {"cell": 25, "houseNumber": "4196"},
    {"cell": 26, "houseNumber": "4197"},
    {"cell": 27, "houseNumber": "497"},
    {"cell": 28, "houseNumber": "497"},
    {"cell": 29, "houseNumber": "497"},
    {"cell": 30, "houseNumber": "1"},
]

def is_repeated_in_records(records_list, idx, val, count=1):
    if not val:
        return False
    n = len(records_list)
    matches = 0
    val_str = str(val).strip()
    for j in range(idx + 1, min(n, idx + 1 + count)):
        other = str(records_list[j].get("houseNumber") or "").strip()
        clean_other = re.sub(r"\D", "", other)
        clean_val = re.sub(r"\D", "", val_str)
        if clean_other and clean_val and (clean_other == clean_val or (len(clean_other) > len(clean_val) and clean_other.endswith(clean_val))):
            matches += 1
    return matches >= 1

def smooth_houses(records):
    ordered_records = sorted([dict(r) for r in records], key=lambda item: item["cell"])

    # Step 1: Prepend Digit Cleanup for spikes
    for index in range(len(ordered_records)):
        current = ordered_records[index]
        curr_val = str(current.get("houseNumber") or "").strip()
        if not curr_val.isdigit() or len(curr_val) < 2:
            continue
        
        prev_val = str(ordered_records[index - 1].get("houseNumber") or "").strip() if index > 0 else ""
        next_val = str(ordered_records[index + 1].get("houseNumber") or "").strip() if index < len(ordered_records) - 1 else ""
        
        prev_num = int(prev_val) if prev_val.isdigit() else None
        next_num = int(next_val) if next_val.isdigit() else None
        curr_num = int(curr_val)

        best_cand = None
        min_diff = 999999
        for strip_len in (1, 2):
            if len(curr_val) > strip_len:
                cand = curr_val[strip_len:]
                if cand.isdigit():
                    cand_num = int(cand)
                    # Check A: curr_num is spike over prev_num
                    if prev_num is not None and curr_num > prev_num + 15:
                        diff = cand_num - prev_num
                        if 0 <= diff <= 25 and diff < min_diff:
                            min_diff = diff
                            best_cand = cand
                    # Check B: curr_num is spike over next_num
                    elif next_num is not None and curr_num > next_num + 15:
                        diff = abs(next_num - cand_num)
                        if diff <= 25 and diff < min_diff:
                            min_diff = diff
                            best_cand = cand
                    # Check C: curr_val has prepended noise '1' or '2' before 3-digit number (e.g. 1261 -> 261, 2417 -> 417, 172 -> 72)
                    elif len(curr_val) in (3, 4) and curr_val[0] in ("1", "2") and not is_repeated_in_records(ordered_records, index, curr_val, 2):
                        if next_num is not None and cand_num <= next_num + 50:
                            best_cand = cand

        if best_cand:
            current["houseNumber"] = best_cand

    # Step 2: Anchor Equalization for house blocks (e.g. 8, 8, [138], 8 -> 8, or 11, 11, [411], 11 -> 11)
    for index in range(1, len(ordered_records) - 1):
        prev_val = str(ordered_records[index - 1].get("houseNumber") or "").strip()
        curr_val = str(ordered_records[index].get("houseNumber") or "").strip()
        next_val = str(ordered_records[index + 1].get("houseNumber") or "").strip()
        if prev_val.isdigit() and prev_val == next_val and curr_val != prev_val:
            if curr_val.endswith(prev_val) or len(curr_val) != len(prev_val) or not is_repeated_in_records(ordered_records, index, curr_val, 2):
                ordered_records[index]["houseNumber"] = prev_val

    # Step 3: Run Anchor Smoothing across multi-card gaps (e.g. 12, 1312, 212, 212, 12 -> 12, 12, 12, 12, 12)
    index = 0
    while index < len(ordered_records) - 2:
        anchor = str(ordered_records[index].get("houseNumber") or "").strip()
        if not anchor.isdigit():
            index += 1
            continue
        end = index + 1
        while end < len(ordered_records) and end <= index + 6:
            val = str(ordered_records[end].get("houseNumber") or "").strip()
            if val == anchor:
                for mid in range(index + 1, end):
                    m_val = str(ordered_records[mid].get("houseNumber") or "").strip()
                    if m_val != anchor:
                        ordered_records[mid]["houseNumber"] = anchor
                break
            end += 1
        index += 1

    # Step 4: Recover dropped/misread numbers when flanked by sequence (e.g. 4194, 1, 4195 -> 4194 or 4196, 497, 4197 -> 4197)
    for index in range(len(ordered_records)):
        current = ordered_records[index]
        curr_val = str(current.get("houseNumber") or "").strip()
        prev_val = str(ordered_records[index - 1].get("houseNumber") or "").strip() if index > 0 else ""
        next_val = str(ordered_records[index + 1].get("houseNumber") or "").strip() if index < len(ordered_records) - 1 else ""
        
        if prev_val.isdigit() and next_val.isdigit():
            p_num = int(prev_val)
            n_num = int(next_val)
            if p_num <= n_num <= p_num + 10:
                c_num = int(curr_val) if curr_val.isdigit() else -1
                if c_num < p_num or c_num > n_num + 20:
                    recovered = prev_val if (next_val.endswith(curr_val) or not curr_val.isdigit()) else (next_val if (curr_val in next_val or curr_val.endswith(next_val[-2:])) else prev_val)
                    ordered_records[index]["houseNumber"] = recovered
        elif prev_val.isdigit() and (index == len(ordered_records) - 1 or not next_val.isdigit()):
            # Last card of page recovery
            p_num = int(prev_val)
            c_num = int(curr_val) if curr_val.isdigit() else -1
            if c_num < p_num or c_num > p_num + 10:
                ordered_records[index]["houseNumber"] = prev_val

    return [r["houseNumber"] for r in ordered_records]

print("=== PDF 1 Realistic Smoothed ===")
print(smooth_houses(pdf1_realistic))

print("\n=== PDF 2 Realistic Smoothed ===")
print(smooth_houses(pdf2_realistic))
