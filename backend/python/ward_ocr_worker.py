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
    modern = re.search(r"([A-Z]{3})([0-9OILSZBG]{7})", raw)
    if modern:
        tail = modern.group(2).translate(str.maketrans("OILSZBG", "0115286"))
        return modern.group(1) + tail
    legacy = re.search(r"R[A-Z]/([0-9OIL]{1,3})/([0-9OIL]{1,3})/([0-9OIL]{4,8})", raw)
    if legacy:
        parts = [part.translate(str.maketrans("OIL", "011")) for part in legacy.groups()]
        return "RJ/" + "/".join(parts)
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


def clean_person_name(value):
    if not value:
        return ""
    text = re.sub(r"[^\u0900-\u097F\s.-]", " ", value)
    text = clean(text).strip(" .-")
    text = re.sub(r"(?<=\u0900-\u097F)ताल\b", "लाल", text)
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
    return clean(text).strip(" .-")


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
    anchors, page_data = voter_name_anchors(image)
    records = []
    seen = set()
    column_width = width / 3
    row_tops = []
    for anchor_top, _ in anchors:
        if not any(abs(anchor_top - row_top) < height * 0.025 for row_top in row_tops):
            row_tops.append(anchor_top)
    row_tops.sort()
    hint_position_offset = None
    for anchor_index, (name_top, column) in enumerate(anchors, start=1):
        top = max(0, round(name_top - height * 0.032))
        bottom = min(height, round(name_top + height * 0.062))
        left = max(0, round(width * 0.03 + column * width * 0.292))
        right = min(width, round(left + width * 0.30))
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
            geometric_index = row_index * 3 + column
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
            photo_left = max(left, round(left + (right - left) * 0.790))
            photo_right = max(photo_left + 1, round(left + (right - left) * 0.985))
            photo_top = max(0, round(name_top - height * 0.020))
            photo_bottom = min(height, round(name_top + height * 0.062))
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
    print(json.dumps({"header": header, "headerText": "\n".join(headers), "records": records}, ensure_ascii=False))


if __name__ == "__main__":
    main()
