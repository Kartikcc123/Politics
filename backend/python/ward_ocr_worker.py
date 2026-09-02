import json
import os
import re
import sys
from pathlib import Path

import cv2
import pytesseract

cv2.setNumThreads(1)
sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Auto-configure tesseract binary path on Windows if not in PATH
if sys.platform.startswith("win"):
    for tess_path in [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        Path.home() / "AppData" / "Local" / "Programs" / "Tesseract-OCR" / "tesseract.exe",
    ]:
        if Path(tess_path).exists():
            pytesseract.pytesseract.tesseract_cmd = str(tess_path)
            tess_dir = str(Path(tess_path).parent)
            if tess_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = tess_dir + os.pathsep + os.environ.get("PATH", "")
            break


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def digits(value):
    return (value or "").translate(str.maketrans("०१२३४५६७८९", "0123456789"))


def field(text, labels):
    pattern = r"(?:" + "|".join(labels) + r")\s*[:：]?\s*([^\n]+)"
    match = re.search(pattern, text, re.IGNORECASE)
    return clean(match.group(1)).strip(" -,:;|।") if match else ""


def normalize_epic(value):
    raw = re.sub(r"[^A-Z0-9/]", "", str(value or "").upper())
    letter_map = str.maketrans({"0": "O", "1": "I", "2": "Z", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B", "3": "E"})
    digit_map = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8", "G": "6", "T": "7", "A": "4", "E": "3"})
    modern = re.search(r"([A-Z0-9]{3})([A-Z0-9]{7})", raw)
    if modern:
        prefix = modern.group(1).translate(letter_map)
        tail = modern.group(2).translate(digit_map)
        if re.fullmatch(r"[A-Z]{3}", prefix) and re.fullmatch(r"\d{7}", tail):
            return prefix + tail
    legacy = re.search(r"([A-Z]{2,3})/([0-9OILSZBG]{1,3})/([0-9OILSZBG]{1,3})/([0-9OILSZBG]{4,8})", raw)
    if legacy:
        prefix = legacy.group(1)
        parts = [part.translate(digit_map) for part in legacy.groups()[1:]]
        return prefix + "/" + "/".join(parts)
    return ""


def parse_header(text):
    normalized = digits(text)
    municipality = field(normalized, [
        r"नगर(?:निगम|परिषद|पालिका)\s*(?:का\s*)?नाम",
    ])
    municipality = re.split(r"\s*(?:विधानसभा|वार्ड|भाग)\b", municipality, maxsplit=1)[0]
    assembly = re.search(r"विधानसभा[^\n:]{0,80}[:：-]*\s*(\d{1,3})\s*[-–]\s*([^\n]+)", normalized)
    ward = re.search(r"वार्ड\s*(?:संख्या|नं\.?|नम्बर)?\s*[:：]?\s*(\d{1,4})", normalized)
    part = re.search(r"भाग\s*(?:संख्या|नं\.?|नम्बर)?\s*[:：]?\s*(\d{1,4})", normalized)
    station = field(normalized, [r"मतदान\s*केन्द्र(?:\s*की\s*संख्या\s*एवं\s*पता)?"])
    return {
        "municipality": municipality,
        "assemblyNumber": assembly.group(1) if assembly else "",
        "assemblyName": clean(assembly.group(2)).strip(" -,:;|।") if assembly else "",
        "wardNumber": ward.group(1) if ward else "",
        "partNumber": part.group(1) if part else "",
        "pollingStation": station,
    }


def opencv_contour_grid_segmentation(image):
    """Detect voter card bounding rectangles using OpenCV Morphological Line & Contour Analysis.
    Works for any page size (A4, A3, letter) and any grid layout (2-col x 8-row, 3-col x 10-row, etc.)."""
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape[:2]
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 2)
        
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (max(10, width // 25), 1))
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(10, height // 35)))
        
        horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
        vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)
        
        table_grid = cv2.add(horizontal, vertical)
        contours, _ = cv2.findContours(table_grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        
        card_boxes = []
        min_area = (width * height) * 0.005
        max_area = (width * height) * 0.15
        
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            area = w * h
            aspect_ratio = w / float(h)
            if min_area <= area <= max_area and 1.2 <= aspect_ratio <= 4.5:
                card_boxes.append((y, x, w, h))
                
        if len(card_boxes) >= 4:
            row_bin = max(10, int(height * 0.04))
            card_boxes.sort(key=lambda b: (b[0] // row_bin, b[1]))
            return card_boxes
    except Exception:
        pass
    return []


def voter_name_anchors(image):
    data = pytesseract.image_to_data(
        image,
        lang=os.getenv("OCR_LANGUAGES", "hin+eng"),
        config="--psm 6",
        output_type=pytesseract.Output.DICT,
    )
    height, width = image.shape[:2]
    anchors = []
    for index, raw in enumerate(data.get("text", [])):
        text = clean(raw)
        if not re.match(r"^(?:नाम|ara)\s*[:：]?", text, re.IGNORECASE):
            continue
        top = int(data["top"][index])
        left = int(data["left"][index])
        if top < height * 0.13 or top > height * 0.93:
            continue
        column = min(2, max(0, int((left + int(data["width"][index]) / 2) / (width / 3))))
        anchors.append((top, column))
    # OCR may emit duplicate label fragments. One anchor per row/column is enough.
    accepted = []
    for top, column in sorted(anchors):
        if any(abs(top - old_top) < height * 0.018 and column == old_column for old_top, old_column in accepted):
            continue
        accepted.append((top, column))
    row_groups = []
    for top, column in accepted:
        group = next((item for item in row_groups if abs(item["top"] - top) < height * 0.025), None)
        if group is None:
            group = {"top": top, "items": []}
            row_groups.append(group)
        group["items"].append((top, column))
        group["top"] = min(group["top"], top)
    ordered = []
    for group in sorted(row_groups, key=lambda item: item["top"]):
        by_column = {}
        for top, column in group["items"]:
            by_column.setdefault(column, top)
        ordered.extend((by_column[column], column) for column in sorted(by_column))
    return ordered, data


def card_text_from_page_data(data, left, top, right, bottom):
    lines = {}
    for index, raw in enumerate(data.get("text", [])):
        text = clean(raw)
        if not text:
            continue
        word_left = int(data["left"][index])
        word_top = int(data["top"][index])
        word_right = word_left + int(data["width"][index])
        word_bottom = word_top + int(data["height"][index])
        center_x = (word_left + word_right) / 2
        center_y = (word_top + word_bottom) / 2
        if not (left <= center_x <= right and top <= center_y <= bottom):
            continue
        key = (int(data["block_num"][index]), int(data["par_num"][index]), int(data["line_num"][index]))
        lines.setdefault(key, []).append((word_top, word_left, text))
    ordered = sorted(lines.values(), key=lambda words: (min(word[0] for word in words), min(word[1] for word in words)))
    return "\n".join(
        " ".join(word[2] for word in sorted(words, key=lambda item: item[1]))
        for words in ordered
    )


# Load Master Hindi Voter Name Dictionary (69,000+ entries) for fast OCR lookup
HINDI_NAME_DICT = set()
try:
    dict_file_path = os.path.join(os.path.dirname(__file__), "hindi_voter_names_dict.json")
    if os.path.exists(dict_file_path):
        with open(dict_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            HINDI_NAME_DICT = set(data.get("names", []))
except Exception as e:
    pass


def correct_name_with_dictionary(name_text):
    if not name_text or not HINDI_NAME_DICT:
        return name_text
    tokens = name_text.split()
    corrected = []
    for token in tokens:
        clean_tok = re.sub(r"[^\u0900-\u097F]", "", token)
        if not clean_tok or len(clean_tok) < 2:
            corrected.append(token)
            continue
        if clean_tok in HINDI_NAME_DICT:
            corrected.append(clean_tok)
            continue
        best_match = None
        best_ratio = 0.85
        len_tok = len(clean_tok)
        candidates = [w for w in HINDI_NAME_DICT if abs(len(w) - len_tok) <= 1 and w[0] == clean_tok[0]]
        for candidate in candidates:
            r = pytesseract.difflib.SequenceMatcher(None, clean_tok, candidate).ratio() if hasattr(pytesseract, "difflib") else 0
            if r > best_ratio:
                best_ratio = r
                best_match = candidate
        corrected.append(best_match if best_match else token)
    return " ".join(corrected)


def clean_person_name(value):
    if not value:
        return ""
    text = re.sub(r"[^\u0900-\u097F\s.-]", " ", value)
    text = clean(text).strip(" .-")
    text = re.sub(r"(?:^|\s)(?:सुगणी|सुगी)(?=$|\s)", " सुखी ", text)
    text = re.sub(r"(?:^|\s)बब्रा(?=$|\s)", " बन्ना ", text)
    text = re.sub(r"(?:^|\s)बब्रालाल(?=$|\s)", " बन्नालाल ", text)
    text = re.sub(r"(?:^|\s)(?:लाटुलाल|लाडुलाल|लादुलाल)(?=$|\s)", " लादूलाल ", text)
    text = re.sub(r"(?:^|\s)(?:लाटु|लाडु|लादु)(?=$|\s)", " लादू ", text)
    text = re.sub(r"(?:^|\s)डालु(?=$|\s)", " डालू ", text)
    text = re.sub(r"(?<=\u0900-\u097F)ताल\b", "लाल", text)
    text = re.sub(r"\bअजपुर्नताल\b|\bअजपुर्नलाल\b|\bअर्जुुनलाल\b", "अर्जुनलाल", text)
    text = re.sub(r"(?<=\u0900-\u097F)ताम\b", "राम", text)
    text = re.sub(r"\bकुमारr\b|\bकुभार\b|\bकुसार\b|\bकुनार\b", "कुमार", text)
    text = re.sub(r"\bदेबी\b", "देवी", text)
    text = re.sub(r"\bगोर्धघन\b|\bगोवर्धण\b", "गोवर्धन", text)
    text = re.sub(r"(?<=\u0900-\u097F)चित्\b|(?<=\u0900-\u097F)चन्त\b|(?<=\u0900-\u097F)चन्च\b", "चन्द", text)
    text = re.sub(r"\bप्रिाप\b|\bप्रिा\b|\bप्रताश\b", "प्रताप", text)
    text = re.sub(r"\bकन्द्रया\b|\bकन्हेया\b", "कन्हैया", text)
    text = re.sub(r"\bरतनी ब्\b|\bरतनी ब्र\b|\bकेली ब्\b", lambda m: m.group(0).replace("ब्", "बाई").replace("ब्र", "बाई"), text)
    text = re.sub(r"\bपुशपा\b", "पुष्पा", text)
    text = re.sub(r"\bकुमावतत\b", "कुमावत", text)
    text = re.sub(r"\bपूजा क्र\b", "पूजा", text)
    text = clean(text).strip(" .-")
    return correct_name_with_dictionary(text)


def parse_card(text, epic_text, epic_hint, page_no, cell_no):
    value = digits(text)
    serial_match = re.search(r"(?:^|\n)\s*[\[|(_-]*\s*(\d{1,4})\b", value)
    epic = normalize_epic(epic_hint) or normalize_epic(epic_text) or normalize_epic(value)
    name = field(value, [r"(?:^|\n)\s*[|I\[\]()._-]*\s*नाम"])
    guardian_match = re.search(
        r"(?:पिता|पति|माता)\s*का\s*नाम\s*[:：]?\s*([^\n]+)", value,
    )
    relation = ""
    guardian = ""
    if guardian_match:
        label = guardian_match.group(0).split("का", 1)[0]
        relation = "father" if "पिता" in label else "husband" if "पति" in label else "mother"
        guardian = clean(guardian_match.group(1)).strip(" -,:;|।")
    if not guardian_match:
        generic_guardian = re.search(r"का\s*नाम\s*[:：]?\s*([^\n]+)", value)
        if generic_guardian:
            guardian = clean(generic_guardian.group(1)).strip(" -,:;|।")
    house = field(value, [r"मकान\s*(?:संख्या|नं\.?)"])
    house_match = re.search(r"[0-9]+(?:[/\-][0-9A-Za-z]+)?", house)
    age_match = re.search(r"आयु\s*[:：]?\s*(\d{1,3})", value)
    gender_match = re.search(r"लिंग\s*[:：]?\s*([^\s\n]+)", value)
    gender_raw = gender_match.group(1) if gender_match else ""
    gender = "female" if re.search(r"स्त्री|महिला", gender_raw) else "male" if re.search(r"पुरूष|पुरुष", gender_raw) else ""
    if not gender:
        gender = "female" if re.search(r"स्त्री|महिला", value) else "male" if re.search(r"पुरूष|पुरुष", value) else ""
    if not name:
        for raw_line in value.splitlines():
            line = clean(raw_line).strip(" |I[]()._-:।")
            if not line or re.search(r"(?:का\s*नाम|मकान|आयु|लिंग)", line):
                continue
            line = re.sub(r"^नाम\s*[:：]?\s*", "", line)
            line = re.sub(r"^[^\u0900-\u097F]+", "", line)
            if len(re.findall(r"[\u0900-\u097F]", line)) >= 2:
                name = line
                break
    name = re.split(r"\s+(?:पिता|पति|माता|मकान|आयु|लिंग)\b", name, maxsplit=1)[0]
    name = re.sub(r"\s+नाम$", "", clean(name)).strip(" -,:;|।")
    guardian = re.split(r"\s+(?:मकान|आयु|लिंग)\b", guardian, maxsplit=1)[0]
    name = clean_person_name(name)
    guardian = clean_person_name(guardian)
    if re.search(r"पूरक|नामावली|नगरपालिका|विधानसभा|निर्वाचन", name):
        return None
    if not name or len(re.findall(r"[\u0900-\u097F]", name)) < 2:
        return None
    
    # Check for DELETED / निरस्त / विलोपित watermark or label text
    is_deleted = bool(re.search(r"निरस्त|विलोपित|निरस्तीकरण|विलोपन|DELETED|DELETION|CANCELLED|EXPIRED", value, re.IGNORECASE))

    # Summary/certificate pages also contain isolated name labels. A real voter
    # card must carry either an exact EPIC hint or normal voter fields.
    has_voter_fields = bool(serial_match and age_match and (house_match or guardian))
    if not epic and not has_voter_fields:
        return None
    return {
        "voterSerial": serial_match.group(1) if serial_match else "",
        "voterId": epic,
        "name": name,
        "guardianName": guardian,
        "relationType": relation,
        "houseNumber": house_match.group(0) if house_match else "",
        "age": int(age_match.group(1)) if age_match else None,
        "gender": gender,
        "pageNumber": page_no,
        "cell": cell_no,
        "photo": "",
        "rawText": clean(text),
        "isDeleted": is_deleted,
        "sourceAction": "delete" if is_deleted else "upsert",
        "ocrNeedsReview": not bool(epic),
        "ocrReviewReasons": [] if epic else ["ward_epic_missing_or_invalid"],
    }


def process_page(page_path, page_no, epic_hints, photo_output_dir=None):
    image = cv2.imread(str(page_path))
    if image is None:
        return "", [], ""
    height, width = image.shape[:2]
    header_region = image[:round(height * 0.24), :]
    header_text = pytesseract.image_to_string(
        header_region, lang=os.getenv("OCR_LANGUAGES", "hin+eng"), config="--psm 6",
    )
    
    # Layer 1: Try OpenCV Morphological Contour Grid Segmentation first
    contour_boxes = opencv_contour_grid_segmentation(image)
    anchors, page_data = voter_name_anchors(image)
    records = []
    seen = set()
    
    # Dynamic Column & Layout Detection (Supports 2-Column or 3-Column Ward PDFs)
    detected_cols = set(col for _, col in anchors)
    cols_count = 2 if (detected_cols and max(detected_cols) <= 1) else 3
    col_w = width / cols_count

    row_tops = []
    for anchor_top, _ in anchors:
        if not any(abs(anchor_top - row_top) < height * 0.025 for row_top in row_tops):
            row_tops.append(anchor_top)
    row_tops.sort()
    
    # Calculate dynamic row height spacing if multiple rows exist
    avg_row_h = (row_tops[-1] - row_tops[0]) / max(1, len(row_tops) - 1) if len(row_tops) > 1 else height * 0.09
    
    # Build card bounding slices (OpenCV Contour Bounding Boxes vs Anchor Grid Slices)
    card_regions = []
    if contour_boxes:
        for idx, (cy, cx, cw, ch) in enumerate(contour_boxes, start=1):
            column = min(cols_count - 1, max(0, int((cx + cw / 2) / (width / cols_count))))
            card_regions.append((cy + ch * 0.35, column, cy, cy + ch, cx, cx + cw))
    else:
        for name_top, column in anchors:
            top = max(0, round(name_top - avg_row_h * 0.35))
            bottom = min(height, round(name_top + avg_row_h * 0.65))
            left = max(0, round(column * col_w + col_w * 0.02))
            right = min(width, round(left + col_w * 0.96))
            card_regions.append((name_top, column, top, bottom, left, right))

    hint_position_offset = None
    for anchor_index, (name_top, column, top, bottom, left, right) in enumerate(card_regions, start=1):
        card = image[top:bottom, left:right]
        if card.size == 0:
            continue
        text = card_text_from_page_data(page_data, left, top, right, bottom)
        epic_text = ""
        serial_match = re.search(r"(?:^|\n)\s*[\[|(_-]*\s*(\d{1,4})\b", digits(text))
        serial = serial_match.group(1) if serial_match else ""
        hint_item = {}
        if isinstance(epic_hints, list):
            row_index = min(range(len(row_tops)), key=lambda index: abs(row_tops[index] - name_top)) if row_tops else 0
            geometric_index = row_index * cols_count + column
            matched_index = next((index for index, item in enumerate(epic_hints) if serial and str(item.get("serial") or "") == serial), None)
            if matched_index is not None:
                hint_item = epic_hints[matched_index]
                hint_position_offset = matched_index - geometric_index
            if not hint_item:
                hint_index = geometric_index + (hint_position_offset or 0)
                hint_item = epic_hints[hint_index] if 0 <= hint_index < len(epic_hints) else {}
        hint = hint_item.get("epic", "") if isinstance(hint_item, dict) else ""
        record = parse_card(text, epic_text, hint, page_no, anchor_index)
        if not record or not record.get("age") or not record.get("houseNumber") or not record.get("guardianName"):
            gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=2.2, fy=2.2, interpolation=cv2.INTER_CUBIC)
            gray = cv2.createCLAHE(2.0, (8, 8)).apply(gray)
            text = pytesseract.image_to_string(
                gray, lang=os.getenv("OCR_LANGUAGES", "hin+eng"), config="--psm 6",
            )
            epic_crop = gray[:max(1, round(gray.shape[0] * 0.28)), :]
            epic_text = pytesseract.image_to_string(
                epic_crop, lang="eng", config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/",
            )
            retry_record = parse_card(text, epic_text, hint, page_no, anchor_index)
            if retry_record:
                if record:
                    for key in ("name", "guardianName", "relationType", "houseNumber", "age", "gender", "voterId"):
                        if not record.get(key) and retry_record.get(key):
                            record[key] = retry_record[key]
                else:
                    record = retry_record
        if record and isinstance(hint_item, dict):
            record["voterSerial"] = str(hint_item.get("serial") or record.get("voterSerial") or "")
            record["sourceAction"] = str(hint_item.get("action") or "upsert")
            if hint_item and not hint_item.get("epic"):
                record["voterId"] = ""
                record["ocrNeedsReview"] = True
                record["ocrReviewReasons"] = ["ward_epic_missing_or_invalid"]
        if record and isinstance(epic_hints, list) and not hint_item:
            record["voterId"] = ""
            record["ocrNeedsReview"] = True
            record["ocrReviewReasons"] = ["ward_epic_missing_or_invalid"]
        if not record:
            continue
        identity = (record["voterSerial"], record["name"], column, round(name_top / max(1, height * 0.02)))
        if identity in seen:
            continue
        seen.add(identity)
        if photo_output_dir:
            card_h = max(1, bottom - top)
            card_w = max(1, right - left)
            photo_left = max(left, round(left + card_w * 0.720))
            photo_right = min(right, round(left + card_w * 0.985))
            photo_top = max(0, round(top + card_h * 0.12))
            photo_bottom = min(height, round(bottom - card_h * 0.05))
            portrait = image[photo_top:photo_bottom, photo_left:photo_right]
            if portrait.size:
                portrait = cv2.resize(portrait, (160, 200), interpolation=cv2.INTER_AREA)
                serial_name = re.sub(r"[^A-Za-z0-9_-]", "-", record.get("voterSerial") or str(anchor_index))
                photo_path = Path(photo_output_dir) / f"ward-p{page_no}-v{serial_name}.jpg"
                cv2.imwrite(str(photo_path), portrait, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
                record["photo"] = str(photo_path)
        records.append(record)
    return header_text, records, clean(header_text)


def main():
    payload = json.loads(sys.stdin.read())
    pages = [Path(value) for value in payload["pages"]]
    page_numbers = payload.get("pageNumbers") or list(range(1, len(pages) + 1))
    hints = payload.get("epicHints") or {}
    photo_output_dir = payload.get("photoOutputDir")
    if photo_output_dir:
        Path(photo_output_dir).mkdir(parents=True, exist_ok=True)
    if os.getenv("TESSERACT_PATH"):
        pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH")
    headers = []
    records = []
    for page_no, page in zip(page_numbers, pages):
        header_text, page_records, _ = process_page(page, page_no, hints.get(str(page_no), {}), photo_output_dir)
        headers.append(header_text)
        records.extend(page_records)
        print(json.dumps({"type": "progress", "page": page_no}), file=sys.stderr, flush=True)
    header = {}
    for text in headers:
        parsed = parse_header(text)
        for key, value in parsed.items():
            if value and not header.get(key):
                header[key] = value
    for record in records:
        record.update({key: value for key, value in header.items() if value})

    # Household Family Tree Consensus Repair Engine for Ward PDFs
    from difflib import SequenceMatcher
    house_groups = {}
    for r in records:
        h = str(r.get("houseNumber") or "").strip()
        if h and h not in ("0", "-", "00"):
            house_groups.setdefault(h, []).append(r)
    
    for h, group in house_groups.items():
        if len(group) >= 2:
            counts = {}
            for rec in group:
                g = clean(rec.get("guardianName"))
                v = clean(rec.get("name"))
                if g and len(g) >= 3:
                    counts[g] = counts.get(g, 0) + 1
                if v and len(v) >= 3:
                    counts[v] = counts.get(v, 0) + 1
            sorted_cands = [g for g, c in sorted(counts.items(), key=lambda x: (-x[1], -len(x[0]))) if len(g) >= 3]
            if sorted_cands:
                anchor = sorted_cands[0]
                for rec in group:
                    g = clean(rec.get("guardianName"))
                    if g and g != anchor and len(g) >= 2:
                        sim = SequenceMatcher(None, g, anchor).ratio()
                        if sim >= 0.65 or (g[:2] == anchor[:2] and (g in anchor or anchor in g)):
                            rec["guardianName"] = anchor

    print(json.dumps({"header": header, "headerText": "\n".join(headers), "records": records}, ensure_ascii=False))


if __name__ == "__main__":
    main()
