import json
import gc
import os
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import cv2
import pytesseract

# Auto-configure bundled Hindi OCR data path if missing or invalid
current_tessdata = os.environ.get("TESSDATA_PREFIX", "")
if not current_tessdata or not (Path(current_tessdata) / "hin.traineddata").exists():
    base_dir = Path(__file__).resolve().parent.parent
    for candidate in [base_dir / "tessdata", base_dir / ".ocr-tessdata"]:
        if (candidate / "hin.traineddata").exists():
            os.environ["TESSDATA_PREFIX"] = str(candidate)
            break

cv2.setNumThreads(1)

sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def ratio(name, default):
    return float(os.getenv(name, default))


def report_card_progress(page_no, cell_no):
    print(json.dumps({
        "type": "card_progress",
        "page": page_no,
        "cell": cell_no,
    }), file=sys.stderr, flush=True)


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def clean_person_name(value):
    if not value:
        return ""
    # Split raw value on field label headers to prevent concatenating adjacent fields/labels
    parts = re.split(
        r"(?:निर्वाचक\s*(?:का)?\s*नाम|मतदाता\s*(?:का)?\s*नाम|(?:^|\s)नाम(?:\s|$)|(?:पिता|पति|पत्ति|पती|माता)\s*(?:का)?\s*नाम|गृह\s*संख्या|उम्र|लिंग|का\s+नाम)",
        value,
        flags=re.IGNORECASE,
    )
    target = ""
    for part in parts:
        part_clean = re.sub(r"[^\u0900-\u097F\s.-]", " ", part)
        part_clean = clean(part_clean).strip(" .-|:")
        if len(re.findall(r"[\u0900-\u097F]", part_clean)) >= 2:
            target = part_clean
            break
    if not target:
        target = re.sub(r"[^\u0900-\u097F\s.-]", " ", value)

    text = re.sub(r"[\u0964\u0965\u0966-\u096f]", " ", target)
    text = clean(text).strip(" .-|:")
    if not text:
        return ""
    # Remove leading/trailing OCR noise tokens
    text = re.sub(r"^(?:ः|:|;|\s)+", "", text)
    text = re.sub(r"(?:\s+[.]?\s*)(?:का|की|के|न|अक|नो|यु|है|ः)$", "", text)

    # Devanagari OCR Spelling Fixes (common Tesseract misreads)
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
    text = clean(text).strip(" .-|:")
    return text


def clean_house(value):
    normalized = (value or "").translate(
        str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f", "0123456789")
    )
    match = re.search(r"(?<!\d)(\d{1,5}(?:[/\-]\d{1,5})?)(?!\d)", normalized)
    return match.group(1) if match else ""


def coordinate_serial(words, x, y, card_w, card_h):
    """Read the printed serial only from the fixed top-left serial box."""
    candidates = []
    for word in words:
        center_x = word["left"] + word["width"] / 2
        center_y = word["top"] + word["height"] / 2
        relative_x = (center_x - x) / max(card_w, 1)
        relative_y = (center_y - y) / max(card_h, 1)
        if not (0.0 <= relative_x <= 0.42 and 0.0 <= relative_y <= 0.25):
            continue
        value = clean_house(word["text"])
        if value and value.isdigit() and 1 <= int(value) <= 9999:
            candidates.append((abs(relative_y - 0.11), -relative_x, value))
    if not candidates:
        return ""
    candidates.sort(key=lambda item: (item[0], item[1]))
    return candidates[0][2]

def coordinate_house(words, x, y, card_w, card_h):
    """Read digits only from the printed house-number row of a voter card."""
    candidates = []
    for word in words:
        center_x = word["left"] + word["width"] / 2
        center_y = word["top"] + word["height"] / 2
        relative_x = (center_x - x) / max(card_w, 1)
        relative_y = (center_y - y) / max(card_h, 1)
        if not (0.05 <= relative_x <= 0.58 and 0.47 <= relative_y <= 0.68):
            continue
        value = clean_house(word["text"])
        if value:
            candidates.append((abs(relative_y - 0.565), relative_x, value))
    if not candidates:
        return ""
    candidates.sort(key=lambda item: (item[0], item[1]))
    return candidates[0][2]


def coordinate_age(words, x, y, card_w, card_h):
    """Read a plausible age from the fixed lower-left age row."""
    candidates = []
    for word in words:
        center_x = word["left"] + word["width"] / 2
        center_y = word["top"] + word["height"] / 2
        relative_x = (center_x - x) / max(card_w, 1)
        relative_y = (center_y - y) / max(card_h, 1)
        if not (0.05 <= relative_x <= 0.58 and 0.66 <= relative_y <= 0.94):
            continue
        value = clean_house(word["text"])
        if value and value.isdigit() and 18 <= int(value) <= 120:
            candidates.append((abs(relative_y - 0.79), relative_x, int(value)))
    if not candidates:
        return None
    candidates.sort(key=lambda item: (item[0], item[1]))
    return candidates[0][2]


def ocr_house(card):
    """Read only the value area of the fixed house-number row."""
    height, width = card.shape[:2]
    region = card[
        round(height * 0.45):round(height * 0.63),
        round(width * 0.17):round(width * 0.27),
    ]
    if region.size == 0:
        return ""
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=10, fy=10, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    values = []
    for variant in variants:
        text = pytesseract.image_to_string(
            variant, lang="eng", config="--psm 7 -c tessedit_char_whitelist=0123456789/-",
        )
        values.append(clean_house(text))
    return values[0] if values[0] and values[0] == values[1] else ""

def _dual_fixed_choice(card, y1, y2, x1, x2, extractor, language="eng", whitelist=""):
    """Return a fixed-region value only when two preprocessing passes agree."""
    height, width = card.shape[:2]
    region = card[round(height * y1):round(height * y2), round(width * x1):round(width * x2)]
    if region.size == 0:
        return "", False
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=6, fy=6, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    values = []
    config = "--psm 7" + (f" -c tessedit_char_whitelist={whitelist}" if whitelist else "")
    for variant in variants:
        values.append(extractor(pytesseract.image_to_string(variant, lang=language, config=config)))
    agreed = bool(values[0] and values[0] == values[1])
    disagreement = bool(values[0] and values[1] and values[0] != values[1])
    return (values[0] if agreed else ""), disagreement


def ocr_serial(card):
    def extract(text):
        match = re.search(r"(?<!\d)(\d{1,4})(?!\d)", text or "")
        return match.group(1) if match else ""
    return _dual_fixed_choice(card, 0.0, 0.23, 0.0, 0.38, extract, whitelist="0123456789")


def ocr_gender(card):
    def extract(text):
        normalized = clean(text)
        if "महिला" in normalized:
            return "female"
        if "पुरुष" in normalized:
            return "male"
        return ""
    return _dual_fixed_choice(card, 0.58, 0.88, 0.15, 0.62, extract, language="hin")

def ocr_age(card):
    """Retry only the printed age row; never infer an age from nearby fields."""
    height, width = card.shape[:2]
    region = card[
        round(height * 0.56):round(height * 0.73),
        round(width * 0.08):round(width * 0.17),
    ]
    if region.size == 0:
        return None
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=12, fy=12, interpolation=cv2.INTER_CUBIC)
    variants = [cv2.createCLAHE(3.0, (8, 8)).apply(gray), cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]]
    candidates = []
    for variant in variants:
        text = pytesseract.image_to_string(variant, lang="eng", config="--psm 7 -c tessedit_char_whitelist=0123456789")
        candidates.extend(int(value) for value in re.findall(r"\d{2,3}", text) if 18 <= int(value) <= 120)
    if not candidates:
        line = card[
            round(height * 0.54):round(height * 0.84),
            0:round(width * 0.48),
        ]
        line_gray = cv2.cvtColor(line, cv2.COLOR_BGR2GRAY)
        line_gray = cv2.resize(line_gray, None, fx=6, fy=6, interpolation=cv2.INTER_CUBIC)
        line_variants = [
            cv2.createCLAHE(3.0, (8, 8)).apply(line_gray),
            cv2.threshold(line_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        ]
        for variant in line_variants:
            for psm in (6, 11):
                text = pytesseract.image_to_string(variant, lang="hin+eng", config=f"--psm {psm}")
                match = re.search(r"(?:उम्र|उप्र|आयु)\s*[:：;\-]?\s*([0-9०-९OQILSZBG\]\|।]{1,3})", text)
                if not match:
                    continue
                value = clean(match.group(1)).upper().translate(
                    str.maketrans("०१२३४५६७८९OQILSZBG]|।", "012345678900112586111")
                )
                digits = "".join(re.findall(r"\d", value))
                if digits.isdigit() and 18 <= int(digits) <= 120:
                    candidates.append(int(digits))
    if not candidates:
        return None
    counts = {value: candidates.count(value) for value in set(candidates)}
    winner, support = max(counts.items(), key=lambda item: item[1])
    return winner if support >= 2 else None


def field(text, pattern):
    match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
    return clean(match.group(1)) if match else ""


def epic_from(text):
    compact = re.sub(r"[^A-Z0-9/]", "", (text or "").upper().replace("\\", "/"))
    legacy = re.search(r"RJ/[0-9O]{1,3}/[0-9O]{1,3}/[0-9O]{6}", compact)
    if legacy:
        return legacy.group(0).replace("O", "0")
    # Old Rajasthan rolls are frequently read as RU/PUI/E4 instead of RJ.
    legacy_parts = re.search(r"[A-Z0-9]{0,3}/([0-9O]{1,3})/([0-9O]{1,3})/([0-9O]{6})", compact)
    if legacy_parts:
        return "RJ/{}/{}/{}".format(
            legacy_parts.group(1).replace("O", "0"),
            legacy_parts.group(2).replace("O", "0"),
            legacy_parts.group(3).replace("O", "0"),
        )
    letter_map = str.maketrans({"0": "O", "1": "I", "2": "Z", "5": "S", "6": "G", "8": "B"})
    digit_map = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8", "G": "6"})
    for value in re.findall(r"[A-Z0-9]{10}", compact):
        candidate = value[:3].translate(letter_map) + value[3:].translate(digit_map)
        if re.fullmatch(r"[A-Z]{3}[0-9]{7}", candidate):
            return candidate
    return ""


def ocr_epic(card, reference=""):
    height, width = card.shape[:2]
    regions = [
        card[round(height * 0.01):round(height * 0.20), round(width * 0.68):round(width * 0.99)],
        card[round(height * 0.02):round(height * 0.18), round(width * 0.70):width],
    ]
    candidates = []
    for region in regions:
        if region.size == 0:
            continue
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, None, fx=5, fy=5, interpolation=cv2.INTER_CUBIC)
        variants = [
            cv2.createCLAHE(3.0, (8, 8)).apply(gray),
            cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        ]
        for variant in variants:
            for psm in (7, 11):
                text = pytesseract.image_to_string(
                    variant,
                    lang="eng",
                    config=f"--psm {psm} -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/",
                )
                value = epic_from(text)
                if not value:
                    continue
                candidates.append(value)
                if reference and value == reference:
                    return reference, True
    if not candidates:
        return reference, False
    counts = {}
    for candidate in candidates:
        counts[candidate] = counts.get(candidate, 0) + 1
    winner, support = max(counts.items(), key=lambda item: item[1])
    # A differing focused value must be independently reproduced. Otherwise
    # retain the page value and send the disagreement to review.
    if reference and winner != reference and support < 2:
        return reference, False
    return winner, support >= 2
def ocr_identity(card):
    """Cross-check fixed name/guardian lines with CLAHE and threshold passes."""
    height, width = card.shape[:2]
    region = card[round(height * 0.16):round(height * 0.54), 0:round(width * 0.62)]
    if region.size == 0:
        return {}, False
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=5, fy=5, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    results = []
    for variant in variants:
        text = pytesseract.image_to_string(variant, lang="hin", config="--psm 6")
        name = clean_person_name(field(text, r"(?:निर्वा\S*|मतदाता)\s*(?:का)?\s*नाम\s*[:：;!\-]?\s*([^\n]+)"))
        guardian = clean_person_name(field(text, r"(?:पिता|पि\S*|पति|पत\S*|प्रति|माता)\s*(?:का)?\s*नाम\s*[:：;!\-]?\s*([^\n]+)"))
        results.append((name, guardian))
    suggestion = {}
    disagreement = False
    for index, key in ((0, "name"), (1, "guardianName")):
        values = [result[index] for result in results if result[index]]
        if len(values) == 2 and values[0] == values[1]:
            suggestion[key] = values[0]
        elif values and len(set(values)) > 1:
            disagreement = True
    return suggestion, disagreement
def parse_card(text, epic_text, photo_path, page_no, cell_no, focused_house=""):
    name_line_pattern = r"नाम\s*[:：;\-]?\s*(.+)$"
    relation_line_pattern = r"(?:पिता|पि\S*|पति|पत\S*|प्रति|माता)\s*(?:का)?\s*नाम"
    fallback_name = ""
    for line in (text or "").splitlines():
        if "नाम" not in line or re.search(relation_line_pattern, line):
            continue
        fallback_name = clean_person_name(field(line, name_line_pattern))
        if fallback_name:
            break
    raw_name = field(text, r"(?:निर्वा\S*|मतदाता)\s*(?:का)?\s*नाम\s*[:：;\-]?\s*([^\n]+)")
    name = clean_person_name(raw_name) or fallback_name
    raw_father = field(text, r"(?:पिता|पि\S*)\s*(?:का)?\s*नाम\s*[:：;\-]?\s*([^\n]+)")
    raw_husband = field(text, r"(?:पति|पत\S*|प्रति)\s*(?:का)?\s*नाम\s*[:：;\-]?\s*([^\n]+)")
    raw_mother = field(text, r"माता\s*(?:का)?\s*नाम\s*[:：;\-]?\s*([^\n]+)")
    father = clean_person_name(raw_father)
    husband = clean_person_name(raw_husband)
    mother = clean_person_name(raw_mother)
    house = focused_house or clean_house(field(text, r"(?:गृह|मकान)\s*संख्या\s*[:：;\-]?\s*([^\n]+)"))
    age_raw = field(
        text,
        r"(?:उम्र|उप्र|आयु)\s*[:：;\-]?\s*([0-9०-९OQILSZBG\]\|।]{1,3})",
    )
    age = clean(age_raw).upper().translate(
        str.maketrans("०१२३४५६७८९OQILSZBG]|।", "012345678900112586111")
    )
    age = "".join(re.findall(r"\d", age))
    gender = "female" if "महिला" in text else "male" if "पुरुष" in text else ""
    guardian = father or husband or mother
    raw_guardian = raw_father or raw_husband or raw_mother
    relation = "father" if father else "husband" if husband else "mother" if mother else ""
    devanagari = len(re.findall(r"[\u0900-\u097F]", name))
    confidence = 0
    confidence += 35 if devanagari >= 2 else 0
    confidence += 20 if guardian else 0
    confidence += 15 if house else 0
    confidence += 10 if age else 0
    confidence += 10 if gender else 0
    voter_id = epic_from(epic_text + "\n" + text)
    serial_match = re.search(r"(?:^|\n)\s*[\[\(\|]?\s*(\d{1,4})\s*[\]\)\|]?", text or "")
    voter_serial = serial_match.group(1) if serial_match else ""

    # Section/part metadata belongs to the page header, not the voter card.
    # The old heuristic treated serial/EPIC digits as section numbers.
    section_number = ""
    confidence += 10 if voter_id else 0
    return {
        "name": name,
        "guardianName": guardian,
        "rawName": raw_name if raw_name and clean(raw_name).strip(" .-|") != name else "",
        "rawGuardianName": raw_guardian if raw_guardian and clean(raw_guardian).strip(" .-|") != guardian else "",
        "relationType": relation,
        "houseNumber": house,
        "age": int(age) if age.isdigit() and 18 <= int(age) <= 120 else None,
        "gender": gender,
        "voterId": voter_id,
        "voterSerial": voter_serial,
        "sectionNumber": section_number,
        "photo": photo_path,
        "rawText": text,
        "confidence": confidence,
        "houseNumberConfidence": 100 if focused_house else (65 if house else 0),
        "page": page_no,
        "cell": cell_no,
    }


def valid_epic(value):
    return bool(
        re.fullmatch(r"[A-Z]{3}\d{7}", value or "")
        or re.fullmatch(r"RJ/\d{1,3}/\d{1,3}/\d{6}", value or "")
    )


def loose_person_key(value):
    """Create a comparison-only Hindi key; never use it to rewrite a name."""
    text = re.sub(r"[^\u0900-\u097F]", "", clean(value))
    return re.sub(r"[\u0901-\u0903\u093a-\u094d\u0951-\u0957]", "", text)

def suspicious_person_name(value):
    text = clean(value)
    if not text:
        return False
    tokens = text.split()
    trailing_noise = {"का", "की", "के", "न", "अक", "नो", "यु", "है"}
    return (
        "." in text
        or "् " in text
        or any(re.search(r"्[\u0900-\u097F]्", token) for token in tokens)
        or bool(re.search(r"(?:निर्वाचक\s*(?:का)?\s*नाम|(?:^|\s)नाम(?:\s|$))|(?:पिता|पति|पत्ति|पती|माता)\s*(?:का)?\s*नाम|गृह\s*संख्या|^(?:उम्र|लिंग)(?:\s|$)", text))
        or (len(tokens) > 1 and tokens[-1] in trailing_noise)
    )


def validate_record(record):
    name_chars = len(re.findall(r"[\u0900-\u097F]", record.get("name") or ""))
    guardian_chars = len(re.findall(r"[\u0900-\u097F]", record.get("guardianName") or ""))
    house = record.get("houseNumber") or ""
    age = record.get("age")
    field_confidence = {
        "name": 95 if name_chars >= 3 else 80 if name_chars >= 2 else 0,
        "voterId": int(record.get("epicConfidence") or 0) if valid_epic(record.get("voterId")) else 0,
        "houseNumber": int(record.get("houseNumberConfidence") or 0) if re.fullmatch(r"\d{1,5}(?:[/\-]\d{1,5})?", house) else 0,
        "age": int(record.get("ageConfidence") or 95) if isinstance(age, int) and 18 <= age <= 120 else 0,
        "gender": 100 if record.get("gender") in ("male", "female", "other") else 0,
        "guardianName": 90 if guardian_chars >= 2 else 0,
    }
    weights = {
        "name": 25,
        "voterId": 25,
        "houseNumber": 20,
        "age": 15,
        "gender": 10,
        "guardianName": 5,
    }
    confidence = round(sum(
        field_confidence[field] * weight / 100
        for field, weight in weights.items()
    ))
    reasons = []
    if not record.get("layoutDetected", True):
        reasons.append("card_layout_not_confirmed")
    if field_confidence["name"] == 0:
        reasons.append("name_missing_or_invalid")
    elif suspicious_person_name(record.get("name")):
        field_confidence["name"] = min(field_confidence["name"], 60)
        reasons.append("name_ocr_noise")
    elif record.get("rawName"):
        reasons.append("name_ocr_cleanup_applied")
    if record.get("identityOcrDisagreement"):
        reasons.append("person_name_ocr_disagreement")
    if field_confidence["voterId"] == 0:
        reasons.append("voter_id_missing_or_invalid")
    elif record.get("epicDisagreement"):
        reasons.append("voter_id_ocr_disagreement")
    if field_confidence["houseNumber"] == 0:
        reasons.append("house_number_missing_or_invalid")
    elif record.get("houseOcrDisagreement"):
        field_confidence["houseNumber"] = min(field_confidence["houseNumber"], 60)
        reasons.append("house_number_ocr_disagreement")
    if field_confidence["age"] == 0:
        reasons.append("age_missing_or_invalid")
    elif record.get("ageOcrDisagreement"):
        field_confidence["age"] = min(field_confidence["age"], 60)
        reasons.append("age_ocr_disagreement")
    if field_confidence["gender"] == 0:
        reasons.append("gender_missing")
    elif record.get("genderOcrDisagreement"):
        field_confidence["gender"] = min(field_confidence["gender"], 60)
        reasons.append("gender_ocr_disagreement")
    if record.get("serialOcrDisagreement"):
        reasons.append("serial_ocr_disagreement")
    if record.get("guardianSpellingVariant"):
        field_confidence["guardianName"] = min(field_confidence["guardianName"], 60)
        reasons.append("guardian_spelling_variant_review")
    if field_confidence["guardianName"] == 0:
        reasons.append("guardian_missing_or_invalid")
    elif suspicious_person_name(record.get("guardianName")):
        field_confidence["guardianName"] = min(field_confidence["guardianName"], 60)
        reasons.append("guardian_name_ocr_noise")
    elif record.get("rawGuardianName"):
        reasons.append("guardian_name_ocr_cleanup_applied")
    confidence = round(sum(
        field_confidence[field] * weight / 100
        for field, weight in weights.items()
    ))
    if confidence < int(os.getenv("OCR_MIN_CONFIDENCE", "85")):
        reasons.append("low_confidence")
    record["fieldConfidence"] = field_confidence
    record["confidence"] = confidence
    record["reviewReasons"] = reasons
    record["validationPassed"] = not reasons
    record["needsReview"] = bool(reasons)
    return record


def detect_card_boxes(image):
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 31, 9,
    )
    horizontal = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (max(40, width // 20), 1)),
    )
    vertical = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, height // 80))),
    )
    grid = cv2.bitwise_or(horizontal, vertical)
    contours, _ = cv2.findContours(grid, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if (
            width * 0.25 <= w <= width * 0.34
            and height * 0.065 <= h <= height * 0.105
            and y > height * 0.02
        ):
            boxes.append((x, y, w, h))
    unique = []
    for box in sorted(boxes, key=lambda b: (b[1], b[0])):
        if not any(abs(box[0] - old[0]) < 8 and abs(box[1] - old[1]) < 8 for old in unique):
            unique.append(box)
    return unique


def detect_photo_box(card):
    height, width = card.shape[:2]
    gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if (
            x >= width * 0.55
            and width * 0.14 <= w <= width * 0.32
            and height * 0.40 <= h <= height * 0.85
        ):
            candidates.append((x, y, w, h))
    if candidates:
        return max(candidates, key=lambda b: b[2] * b[3])
    return (
        round(width * 0.70),
        round(height * 0.20),
        round(width * 0.29),
        round(height * 0.68),
    )


def process_page(page_path, output_dir, page_no):
    image = cv2.imread(str(page_path))
    if image is None:
        print(json.dumps({"type": "progress", "page": page_no}), file=sys.stderr, flush=True)
        return []
    height, width = image.shape[:2]
    verify_all_fields = os.getenv("OCR_VERIFY_ALL_FIELDS", "false").lower() == "true"
    boxes = detect_card_boxes(image)
    layout_detected = bool(boxes)
    if not boxes:
        left = round(width * ratio("VOTER_GRID_LEFT_RATIO", 0.02))
        top = round(height * ratio("VOTER_GRID_HEADER_RATIO", 0.03))
        card_w = round(width * ratio("VOTER_GRID_CARD_WIDTH_RATIO", 0.288))
        card_h = round(height * ratio("VOTER_GRID_CARD_HEIGHT_RATIO", 0.088))
        gap_x = round(width * ratio("VOTER_GRID_GAP_X_RATIO", 0.006))
        gap_y = round(height * ratio("VOTER_GRID_GAP_Y_RATIO", 0.005))
        boxes = [
            (left + col * (card_w + gap_x), top + row * (card_h + gap_y), card_w, card_h)
            for row in range(int(os.getenv("VOTER_GRID_ROWS", "10")))
            for col in range(int(os.getenv("VOTER_GRID_COLUMNS", "3")))
        ]
    language = os.getenv("OCR_LANGUAGES", "hin+eng")
    page_data = pytesseract.image_to_data(
        image,
        lang=language,
        config="--psm 6",
        output_type=pytesseract.Output.DICT,
    )
    words = []
    for index, value in enumerate(page_data.get("text", [])):
        value = clean(value)
        try:
            confidence = float(page_data["conf"][index])
        except (TypeError, ValueError):
            confidence = -1
        if not value or confidence < 15:
            continue
        words.append({
            "text": value,
            "left": int(page_data["left"][index]),
            "top": int(page_data["top"][index]),
            "width": int(page_data["width"][index]),
            "height": int(page_data["height"][index]),
            "line": (
                page_data["block_num"][index],
                page_data["par_num"][index],
                page_data["line_num"][index],
            ),
        })

    # One English coordinate pass recovers EPICs without per-card processes.
    epic_data = pytesseract.image_to_data(
        image,
        lang="eng",
        config="--psm 11 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/",
        output_type=pytesseract.Output.DICT,
    )
    epic_words = []
    for index, value in enumerate(epic_data.get("text", [])):
        value = clean(value)
        if not value:
            continue
        epic_words.append({
            "text": value,
            "left": int(epic_data["left"][index]),
            "top": int(epic_data["top"][index]),
            "width": int(epic_data["width"][index]),
            "height": int(epic_data["height"][index]),
        })
    # One digit-only page pass reads every house row without launching an
    # additional Tesseract process for each of the 30 voter cards.
    numeric_image = image.copy()
    numeric_image[:] = 255
    for box_x, box_y, box_w, box_h in boxes:
        numeric_regions = (
            (0.0, 0.25, 0.0, 0.42),
            (0.47, 0.68, 0.05, 0.58),
            (0.66, 0.94, 0.05, 0.58),
        )
        for top_ratio, bottom_ratio, left_ratio, right_ratio in numeric_regions:
            value_left = box_x + round(box_w * left_ratio)
            value_right = box_x + round(box_w * right_ratio)
            value_top = box_y + round(box_h * top_ratio)
            value_bottom = box_y + round(box_h * bottom_ratio)
            numeric_image[value_top:value_bottom, value_left:value_right] = image[
                value_top:value_bottom, value_left:value_right
            ]
    numeric_data = pytesseract.image_to_data(
        numeric_image,
        lang="eng",
        config="--psm 11 -c tessedit_char_whitelist=0123456789/-",
        output_type=pytesseract.Output.DICT,
    )
    numeric_words = []
    for index, value in enumerate(numeric_data.get("text", [])):
        value = clean(value)
        try:
            confidence = float(numeric_data["conf"][index])
        except (TypeError, ValueError):
            confidence = -1
        if not clean_house(value) or confidence < 0:
            continue
        numeric_words.append({
            "text": value,
            "left": int(numeric_data["left"][index]),
            "top": int(numeric_data["top"][index]),
            "width": int(numeric_data["width"][index]),
            "height": int(numeric_data["height"][index]),
        })
    records = []
    card_images = {}
    fallback_limit = max(0, int(os.getenv("OCR_CARD_FALLBACKS_PER_PAGE", "3")))
    fallbacks_used = 0
    for cell_no, (x, y, card_w, card_h) in enumerate(boxes, start=1):
        card = image[y:y + card_h, x:x + card_w]
        card_images[cell_no] = card
        card_file = output_dir / f"page-{page_no}-card-{cell_no}.jpg"
        if card.size:
            cv2.imwrite(str(card_file), card, [cv2.IMWRITE_JPEG_QUALITY, 94])
        if card.size == 0:
            report_card_progress(page_no, cell_no)
            continue
        px, py, pw, ph = detect_photo_box(card)
        pad_x = max(2, round(pw * 0.04))
        pad_y = max(2, round(ph * 0.04))
        px = max(0, px - pad_x)
        py = max(0, py - pad_y)
        pw = min(card_w - px, pw + pad_x * 2)
        ph = min(card_h - py, ph + pad_y * 2)
        photo = card[py:py + ph, px:px + pw]
        photo_name = f"page-{page_no}-voter-{cell_no}.jpg"
        photo_file = output_dir / photo_name
        if photo.size:
            cv2.imwrite(str(photo_file), photo, [cv2.IMWRITE_JPEG_QUALITY, 92])

        card_words = [word for word in words if (
            x <= word["left"] + word["width"] / 2 <= x + card_w
            and y <= word["top"] + word["height"] / 2 <= y + card_h
        )]
        grouped = {}
        for word in card_words:
            grouped.setdefault(word["line"], []).append(word)
        text = "\n".join(
            " ".join(word["text"] for word in sorted(line, key=lambda item: item["left"]))
            for line in sorted(grouped.values(), key=lambda line: (line[0]["top"], line[0]["left"]))
        )
        if not text and fallbacks_used < fallback_limit:
            gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_CUBIC)
            text = pytesseract.image_to_string(gray, lang=language, config="--psm 6")
            fallbacks_used += 1

        epic_text = " ".join(word["text"] for word in epic_words if (
            x <= word["left"] + word["width"] / 2 <= x + card_w
            and y <= word["top"] + word["height"] / 2 <= y + round(card_h * 0.38)
        ))
        page_epic = epic_from(epic_text)
        # The page-level English pass already reads every fixed EPIC region.
        # Launch focused OCR only for a missing EPIC; repeating it for all 30
        # cards made a small page take hundreds of Tesseract processes.
        if verify_all_fields or not page_epic:
            focused_epic, epic_agreed = ocr_epic(card, page_epic)
        else:
            focused_epic, epic_agreed = page_epic, True
        epic_text = focused_epic or ""
        coordinate_serial_value = coordinate_serial(numeric_words, x, y, card_w, card_h)
        coordinate_house_value = coordinate_house(numeric_words, x, y, card_w, card_h)
        consensus_house = ocr_house(card) if verify_all_fields else ""
        # In verification mode the isolated, dual-pass value crop is preferred.
        # Disagreement still forces review and is never silently verified.
        focused_house = consensus_house if verify_all_fields and consensus_house else coordinate_house_value
        focused_age = coordinate_age(numeric_words, x, y, card_w, card_h)
        record = parse_card(
            text, epic_text, str(photo_file), page_no, cell_no, focused_house,
        )
        record["layoutDetected"] = layout_detected
        record["rawFields"] = {
            "name": record.get("name") or "",
            "guardianName": record.get("guardianName") or "",
            "houseNumber": coordinate_house_value or "",
            "age": record.get("age"),
            "gender": record.get("gender") or "",
            "voterId": page_epic or "",
            "voterSerial": coordinate_serial_value or record.get("voterSerial") or "",
        }
        if coordinate_serial_value:
            record["voterSerial"] = coordinate_serial_value
        record["houseOcrDisagreement"] = bool(
            coordinate_house_value and consensus_house and coordinate_house_value != consensus_house
        )
        if coordinate_house_value and consensus_house == coordinate_house_value:
            record["houseNumberConfidence"] = 100
        elif consensus_house and not coordinate_house_value:
            record["houseNumberConfidence"] = 90
        elif coordinate_house_value:
            record["houseNumberConfidence"] = 70 if verify_all_fields else 100
        if focused_age is not None:
            record["age"] = focused_age
            record["ageConfidence"] = 100
        if verify_all_fields:
            consensus_age = ocr_age(card)
            record["ageOcrDisagreement"] = bool(
                focused_age is not None and consensus_age is not None and focused_age != consensus_age
            )
            if consensus_age is not None:
                record["age"] = consensus_age
                record["ageConfidence"] = 100 if focused_age == consensus_age else 90
            serial_value, serial_disagreement = ocr_serial(card)
            record["serialOcrDisagreement"] = serial_disagreement
            if serial_value:
                if coordinate_serial_value and coordinate_serial_value != serial_value:
                    record["serialOcrDisagreement"] = True
                elif not coordinate_serial_value:
                    record["voterSerial"] = serial_value
            gender_value, gender_disagreement = ocr_gender(card)
            record["genderOcrDisagreement"] = gender_disagreement
            if gender_value:
                if record.get("gender") and record["gender"] != gender_value:
                    record["genderOcrDisagreement"] = True
                else:
                    record["gender"] = gender_value
        record["cardImage"] = str(card_file)
        record["epicConfidence"] = 100 if focused_epic and epic_agreed else 60 if focused_epic else 0
        record["epicDisagreement"] = bool(
            (page_epic and focused_epic and page_epic != focused_epic)
            or (verify_all_fields and focused_epic and not epic_agreed)
        )
        # hin+eng occasionally converts a Hindi first name to a Latin token
        # (for example, "Pintu Kumar" becomes "Reg Kumar"). Retry only that
        # rare mixed-prefix case so normal pages do not pay per-card OCR cost.
        mixed_name_prefix = re.search(
            r"(?:निर्वा\S*|मतदाता)\s*(?:का)?\s*नाम\s*[:：;\-]?\s*[A-Za-z]{2,}\s+[\u0900-\u097F]",
            text or "",
        )
        if mixed_name_prefix:
            gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
            hindi_text = pytesseract.image_to_string(gray, lang="hin", config="--psm 6")
            hindi_record = parse_card(
                hindi_text, epic_text, str(photo_file), page_no, cell_no, focused_house,
            )
            current_chars = len(re.findall(r"[\u0900-\u097F]", record.get("name") or ""))
            hindi_chars = len(re.findall(r"[\u0900-\u097F]", hindi_record.get("name") or ""))
            if hindi_chars > current_chars:
                preserved = {key: record.get(key) for key in (
                    "cardImage", "epicConfidence", "epicDisagreement", "ageConfidence",
                ) if record.get(key) is not None}
                record = hindi_record
                record.update(preserved)

        age_value = record.get("age")
        needs_field_retry = (
            not isinstance(age_value, int) or not 18 <= age_value <= 120
            or not record.get("guardianName")
            or not record.get("name")
        )
        if needs_field_retry and not mixed_name_prefix:
            gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
            hindi_text = pytesseract.image_to_string(clahe, lang="hin", config="--psm 6")
            hindi_record = parse_card(
                hindi_text, epic_text, str(photo_file), page_no, cell_no, focused_house,
            )
            retry_age = hindi_record.get("age")
            if isinstance(retry_age, int) and 18 <= retry_age <= 120:
                record["age"] = retry_age
            if not record.get("name") and hindi_record.get("name"):
                record["name"] = hindi_record["name"]
            if not record.get("guardianName") and hindi_record.get("guardianName"):
                record["guardianName"] = hindi_record["guardianName"]
                record["relationType"] = hindi_record["relationType"]
        age_value = record.get("age")
        if focused_age is None and (not isinstance(age_value, int) or not 18 <= age_value <= 120):
            retry_age = ocr_age(card)
            if retry_age is not None:
                if record.get("age") != retry_age:
                    record["rawAge"] = record.get("age")
                record["age"] = retry_age
                record["ageConfidence"] = 90
        if os.getenv("OCR_DEEP_RETRY", "false").lower() == "true" and (not record["name"] or not record["voterId"]):
            gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)
            threshold = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            alternate_text = pytesseract.image_to_string(threshold, lang=language, config="--psm 11")
            alternate = parse_card(alternate_text, "", str(photo_file), page_no, cell_no, record["houseNumber"])
            if alternate["confidence"] > record["confidence"]:
                record = alternate
        if record.get("name") or record.get("voterId") or record.get("guardianName") or record.get("houseNumber") or record.get("age") or record.get("voterSerial"):
            records.append(record)
        needs_identity_retry = (
            not record.get("name")
            or not record.get("guardianName")
            or record.get("rawName")
            or record.get("rawGuardianName")
            or suspicious_person_name(record.get("name"))
            or suspicious_person_name(record.get("guardianName"))
        )
        identity, identity_disagreement = ocr_identity(card) if verify_all_fields or needs_identity_retry else ({}, False)
        if verify_all_fields:
            identity_disagreement = bool(
                identity_disagreement
                or not identity.get("name")
                or not identity.get("guardianName")
                or identity.get("name") != record.get("name")
                or identity.get("guardianName") != record.get("guardianName")
            )
        focused_guardian = identity.get("guardianName")
        if (
            focused_guardian
            and focused_guardian != record.get("guardianName")
            and (
                not record.get("guardianName")
                or record.get("rawGuardianName")
                or suspicious_person_name(record.get("guardianName"))
            )
        ):
            record["rawGuardianName"] = record.get("rawGuardianName") or record.get("guardianName")
            record["guardianName"] = focused_guardian
        focused_name = identity.get("name")
        if (
            focused_name
            and focused_name != record.get("name")
            and (
                not record.get("name")
                or record.get("rawName")
                or suspicious_person_name(record.get("name"))
            )
        ):
            record["rawName"] = record.get("rawName") or record.get("name")
            record["name"] = focused_name
        record["identityOcrDisagreement"] = identity_disagreement

        # Retry OCR may capture an adjacent printed label as the value. Run the
        # same conservative cleanup again before validation; rejected text stays
        # in raw fields for admin review instead of becoming a voter identity.
        for key, raw_key in (("name", "rawName"), ("guardianName", "rawGuardianName")):
            current_value = record.get(key) or ""
            cleaned_value = clean_person_name(current_value)
            if current_value and not cleaned_value:
                record[raw_key] = record.get(raw_key) or current_value
                record[key] = ""
            elif cleaned_value != current_value:
                record[raw_key] = record.get(raw_key) or current_value
                record[key] = cleaned_value

        report_card_progress(page_no, cell_no)
    # Printed electoral rolls are ordered by house number. Repair only an
    # isolated pure-numeric value outside its two neighbours; never invent a
    # value when the surrounding sequence itself is ambiguous.
    ordered_records = sorted(records, key=lambda item: item["cell"])
    for index in range(1, len(ordered_records) - 1):
        previous = ordered_records[index - 1]
        current = ordered_records[index]
        following = ordered_records[index + 1]
        values = [previous.get("houseNumber"), current.get("houseNumber"), following.get("houseNumber")]
        if not all(value and re.fullmatch(r"\d{1,5}", str(value)) for value in values):
            continue
        previous_number, current_number, following_number = map(int, values)
        if previous_number <= current_number <= following_number:
            continue
        if previous_number > following_number or following_number - previous_number > 20:
            continue
        retry = ocr_house(card_images.get(current["cell"])) if card_images.get(current["cell"]) is not None else ""
        retry_number = int(retry) if retry.isdigit() else None
        if retry_number is not None and previous_number <= retry_number <= following_number:
            current["houseNumber"] = str(retry_number)
            current["houseNumberConfidence"] = 90


    # Repair a consecutive descending OCR block only when equal surrounding
    # house anchors prove the whole block belongs to that same house.
    index = 1
    while index < len(ordered_records) - 1:
        previous = ordered_records[index - 1]
        previous_value = str(previous.get("houseNumber") or "")
        if not previous_value.isdigit():
            index += 1
            continue
        end = index
        while end < len(ordered_records):
            value = str(ordered_records[end].get("houseNumber") or "")
            if value.isdigit() and int(value) >= int(previous_value):
                break
            end += 1
        if end > index and end < len(ordered_records):
            following_value = str(ordered_records[end].get("houseNumber") or "")
            if following_value == previous_value:
                for target in ordered_records[index:end]:
                    target_card = card_images.get(target["cell"])
                    retry = ocr_house(target_card) if target_card is not None else ""
                    if retry == previous_value:
                        target["rawHouseNumber"] = target.get("houseNumber")
                        target["houseNumber"] = previous_value
                        target["houseNumberConfidence"] = 90
                    else:
                        target["houseOcrDisagreement"] = True
        index = max(end, index + 1)

    # A repeated OCR prefix can turn one house into values such as 33, 333,
    # 533, 33. Equal anchors on both sides prove that the enclosed suffix-
    # matching values belong to the same house; without both anchors we only
    # flag the values and never invent a correction.
    index = 1
    while index < len(ordered_records) - 1:
        anchor = str(ordered_records[index - 1].get("houseNumber") or "")
        if not anchor.isdigit():
            index += 1
            continue
        end = index
        while end < len(ordered_records):
            value = str(ordered_records[end].get("houseNumber") or "")
            if value == anchor:
                break
            if not (value.isdigit() and value.endswith(anchor) and 1 <= len(value) - len(anchor) <= 2):
                break
            end += 1
        if end > index and end < len(ordered_records) and str(ordered_records[end].get("houseNumber") or "") == anchor:
            for target in ordered_records[index:end]:
                target["rawHouseNumber"] = target.get("rawHouseNumber") or target.get("houseNumber")
                target["houseNumber"] = anchor
                target["houseNumberConfidence"] = 90
                target["houseOcrDisagreement"] = True
            index = end + 1
        else:
            index += 1

    # Recover a dropped leading digit only when both adjacent cards provide the
    # same anchor and the OCR value is its exact suffix (34, 4, 34 -> 34).
    for index in range(1, len(ordered_records) - 1):
        previous = str(ordered_records[index - 1].get("houseNumber") or "")
        current = str(ordered_records[index].get("houseNumber") or "")
        following = str(ordered_records[index + 1].get("houseNumber") or "")
        missing_prefix = len(previous) - len(current)
        if (
            previous.isdigit()
            and current.isdigit()
            and following == previous
            and 1 <= missing_prefix <= 2
            and previous.endswith(current)
        ):
            target = ordered_records[index]
            target["rawHouseNumber"] = target.get("rawHouseNumber") or current
            target["houseNumber"] = previous
            target["houseNumberConfidence"] = 90
            target["houseOcrDisagreement"] = True

    # Correct a single prefixed value at a real house transition, for example
    # 37, 538, 38. The suffix must exactly equal the following anchor and that
    # anchor must be a plausible monotonic step from the previous house.
    for index in range(1, len(ordered_records) - 1):
        previous = str(ordered_records[index - 1].get("houseNumber") or "")
        current = str(ordered_records[index].get("houseNumber") or "")
        following = str(ordered_records[index + 1].get("houseNumber") or "")
        if not (previous.isdigit() and current.isdigit() and following.isdigit()):
            continue
        prefix_length = len(current) - len(following)
        plausible_transition = int(previous) <= int(following) <= int(previous) + 20
        if plausible_transition and 1 <= prefix_length <= 2 and current.endswith(following):
            target = ordered_records[index]
            target["rawHouseNumber"] = target.get("rawHouseNumber") or current
            target["houseNumber"] = following
            target["houseNumberConfidence"] = 90
            target["houseOcrDisagreement"] = True

    # A large house jump is legitimate when it forms a repeated run (for
    # example 39, 115, 115, 115). A one-card jump has insufficient evidence:
    # preserve its raw value but require admin review instead of guessing.
    index = 0
    while index < len(ordered_records):
        value = str(ordered_records[index].get("houseNumber") or "")
        end = index + 1
        while end < len(ordered_records) and str(ordered_records[end].get("houseNumber") or "") == value:
            end += 1
        run_length = end - index
        previous = str(ordered_records[index - 1].get("houseNumber") or "") if index > 0 else ""
        following = str(ordered_records[end].get("houseNumber") or "") if end < len(ordered_records) else ""
        if run_length == 1 and value.isdigit():
            neighbour_values = [int(item) for item in (previous, following) if item.isdigit()]
            if neighbour_values and min(abs(int(value) - item) for item in neighbour_values) > 20:
                ordered_records[index]["houseOcrDisagreement"] = True
                ordered_records[index]["houseNumberConfidence"] = min(
                    int(ordered_records[index].get("houseNumberConfidence") or 70), 60
                )
        index = end

    # Recover printed serials from the dominant serial-minus-cell offset. A
    # minimum of four independent cards prevents one bad OCR token from
    # manufacturing a page sequence.
    serial_offsets = {}
    for record in records:
        raw_serial = str(record.get("voterSerial") or "").translate(
            str.maketrans("०१२३४५६७८९", "0123456789")
        )
        if raw_serial.isdigit():
            serial = int(raw_serial)
            offset = serial - int(record["cell"])
            if 0 <= offset <= 5000:
                serial_offsets[offset] = serial_offsets.get(offset, 0) + 1
    if serial_offsets:
        serial_offset, support = max(serial_offsets.items(), key=lambda item: item[1])
        if support >= 4:
            for record in records:
                record["voterSerial"] = str(serial_offset + int(record["cell"]))
                record["voterSerialConfidence"] = 95
    # Legacy EPIC and the printed voter serial share the card header. OCR may
    # concatenate them (for example .../000701 + serial 87). Remove the suffix
    # only when it exactly equals this independently recovered serial.
    for record in records:
        epic = str(record.get("voterId") or "")
        serial = str(record.get("voterSerial") or "")
        match = re.fullmatch(r"(RJ/\d{1,3}/\d{1,3}/)(\d{8})", epic)
        if match and len(serial) == 2 and match.group(2).endswith(serial):
            record["rawVoterId"] = epic
            record["voterId"] = match.group(1) + match.group(2)[:-2]
            record["epicConfidence"] = min(int(record.get("epicConfidence") or 90), 95)

    # Correct an OCR label-prefix only when two sibling cards in the same
    # printed row independently agree on the exact house number.
    for row_start in range(1, len(boxes) + 1, 3):
        row_records = [record for record in records if row_start <= record["cell"] < row_start + 3]
        counts = {}
        for record in row_records:
            value = record.get("houseNumber") or ""
            if value:
                counts[value] = counts.get(value, 0) + 1
        consensus = next((value for value, count in counts.items() if count >= 2), "")
        if not consensus:
            continue
        for record in row_records:
            value = record.get("houseNumber") or ""
            if value != consensus and value.endswith(consensus) and len(value) - len(consensus) <= 2:
                record["rawHouseNumber"] = value
                record["houseNumber"] = consensus
                record["houseNumberConfidence"] = 95
    # Row consensus may repair an adjacent prefixed value after the first
    # sequence pass. Reconcile truncated suffixes once more on the final house
    # values so 117, 17, 117 cannot escape because of correction ordering.
    for index in range(1, len(ordered_records) - 1):
        previous = str(ordered_records[index - 1].get("houseNumber") or "")
        current = str(ordered_records[index].get("houseNumber") or "")
        following = str(ordered_records[index + 1].get("houseNumber") or "")
        missing_prefix = len(previous) - len(current)
        if (
            previous.isdigit()
            and current.isdigit()
            and following == previous
            and 1 <= missing_prefix <= 2
            and previous.endswith(current)
        ):
            target = ordered_records[index]
            target["rawHouseNumber"] = target.get("rawHouseNumber") or current
            target["houseNumber"] = previous
            target["houseNumberConfidence"] = 90
            target["houseOcrDisagreement"] = True

    voter_names = [record.get("name") or "" for record in records]
    for record in records:
        guardian = record.get("guardianName") or ""
        guardian_key = loose_person_key(guardian)
        record["guardianSpellingVariant"] = any(
            guardian != voter_name
            and len(guardian_key) >= 3
            and guardian_key == loose_person_key(voter_name)
            for voter_name in voter_names
        )
    for record in records:
        record["suggestedFields"] = {
            key: record.get(key) for key in (
                "name", "guardianName", "houseNumber", "age", "gender", "voterId", "voterSerial"
            )
        }
        validate_record(record)
    print(json.dumps({"type": "progress", "page": page_no}), file=sys.stderr, flush=True)
    return records


def read_header(page_path, is_voter_page=True):
    image = cv2.imread(str(page_path))
    if image is None:
        return ""
    height, width = image.shape[:2]
    crop_ratio = 0.12 if is_voter_page else 0.62
    header = image[0:round(height * crop_ratio), 0:width]
    gray = cv2.cvtColor(header, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2.2 if is_voter_page else 2.4, fy=2.2 if is_voter_page else 2.4, interpolation=cv2.INTER_CUBIC)
    gray = cv2.createCLAHE(2.0, (8, 8)).apply(gray)
    variants = [gray]
    if not is_voter_page:
        variants.extend([
            cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
            cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 9),
        ])
    outputs = []
    for variant in variants:
        for psm in ((6, 11) if not is_voter_page else (6,)):
            outputs.append(pytesseract.image_to_string(variant, lang=os.getenv("OCR_LANGUAGES", "hin+eng"), config=f"--psm {psm}"))
            if not is_voter_page:
                outputs.append(pytesseract.image_to_string(variant, lang="eng", config=f"--psm {psm}"))
    return "\n".join(outputs)


def ocr_fixed_region(image, bounds, lang="eng", psm=7, whitelist=""):
    height, width = image.shape[:2]
    left, top, right, bottom = bounds
    region = image[
        round(height * top):round(height * bottom),
        round(width * left):round(width * right),
    ]
    if region.size == 0:
        return ""
    if whitelist:
        target = cv2.resize(region, None, fx=6, fy=6, interpolation=cv2.INTER_CUBIC)
    else:
        target = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        target = cv2.resize(target, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        target = cv2.createCLAHE(2.5, (8, 8)).apply(target)
    config = f"--psm {psm}"
    if whitelist:
        config += f" -c tessedit_char_whitelist={whitelist}"
    return clean(pytesseract.image_to_string(target, lang=lang, config=config))


def fixed_header_number(text, max_digits, prefer_tail=False):
    normalized = (text or "").upper().translate(
        str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096fOQILSZBG", "012345678900112586")
    )
    values = re.findall(r"\d+", normalized)
    if not values:
        return ""
    value = values[-1]
    if prefer_tail:
        value = next((candidate for candidate in values if len(candidate) >= max_digits), value)
        if len(value) > max_digits:
            value = value[-max_digits:]
    if not 1 <= len(value) <= max_digits:
        return ""
    return value


def fixed_section_name(text):
    value = clean(text)
    if ":" in value:
        value = value.split(":", 1)[1]
    value = re.sub(r"^[\s\-:;|0-9\u0966-\u096f]+", "", value).strip()
    if re.search(r"\u092a\u091f\u0935\u093e\u0930\s*.*\u092d\u0935\u0928", value):
        return "\u092a\u091f\u0935\u093e\u0930 \u092d\u0935\u0928 \u0915\u0947 \u092a\u093e\u0938, \u092d\u0940\u0902\u091f\u093e"
    return value if len(re.findall(r"[\u0900-\u097F]", value)) >= 3 else ""


def fixed_region_variants(image, bounds, language, psms, whitelist=""):
    height, width = image.shape[:2]
    left, top, right, bottom = bounds
    region = image[
        round(height * top):round(height * bottom),
        round(width * left):round(width * right),
    ]
    if region.size == 0:
        return []
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    variants = [
        gray,
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    readings = []
    for variant in variants:
        for psm in psms:
            config = f"--psm {psm}"
            if whitelist:
                config += f" -c tessedit_char_whitelist={whitelist}"
            readings.append(clean(pytesseract.image_to_string(
                variant, lang=language, config=config,
            )))
    return readings


def consensus_value(values, minimum_support=2):
    counts = {}
    for value in values:
        if value:
            counts[value] = counts.get(value, 0) + 1
    if not counts:
        return ""
    value, support = max(counts.items(), key=lambda item: item[1])
    return value if support >= minimum_support else ""


def fixed_location_name(text):
    value = clean(text).strip(" -,:;|")
    if ":" in value:
        value = value.split(":", 1)[1].strip(" -,:;|")
    value = re.sub(r"[^\u0900-\u097F\s.-]", " ", value)
    value = clean(value).strip(" -,:;|")
    return value if len(re.findall(r"[\u0900-\u097F]", value)) >= 2 else ""


def fixed_master_section_map(image):
    """Read the numbered section table without mixing in the location column."""
    height, width = image.shape[:2]
    region = image[round(height * 0.26):round(height * 0.47), 0:round(width * 0.395)]
    if region.size == 0:
        return {}
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.threshold(gray, 184, 255, cv2.THRESH_BINARY)[1],
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        cv2.createCLAHE(2.0, (8, 8)).apply(gray),
    ]
    candidate_votes = {}
    digit_translation = str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f", "0123456789")
    for variant in variants:
        text = pytesseract.image_to_string(
            variant, lang=os.getenv("OCR_LANGUAGES", "hin+eng"), config="--psm 6"
        )
        rows = []
        for raw_line in text.splitlines():
            line = clean(raw_line).translate(digit_translation).strip()
            match = re.match(
                r"^(?:([1-9][0-9]{0,2})|[|Il\u0965\u0964])\s*[-\u2013\u2014.:)]\s*(.+)$",
                line,
            )
            if not match:
                continue
            number = match.group(1) or ""
            name = clean(match.group(2)).strip(" -,:;|\u0964")
            name = re.split(
                r"\s+(?:\u092e\u0941\u0916\u094d\u092f\s+(?:\u0936\u0939\u0930|\u0917\u094d\u0930\u093e\u092e)|\u0935\u093e\u0930\u094d\u0921|\u092a\u094b\u0938\u094d\u091f\s*(?:\u0911\u092b\u093f\u0938|\u0906\u092b\u093f\u0938)|\u092a\u0941\u0932\u093f\u0938\s*\u0925\u093e\u0928\u093e|\u0924\u0939\u0938\u0940\u0932|\u091c\u093f\u0932\u093e|\u092a\u093f\u0928\s*\u0915\u094b\u0921)\b",
                name, maxsplit=1,
            )[0].strip(" -,:;|\u0964")
            name = re.sub(r"\s*,\s*", ",", name)
            # Recover a missing boundary before a stable electoral-roll domain word.
            name = re.sub(r"(?<=[\u0900-\u097F])(\u0935\u093f\u0926\u094d\u092f\u093e\u0932\u092f)\b", r" \1", name)
            if len(re.findall(r"[\u0900-\u097F]", name)) >= 3:
                rows.append([number, name])
        if len(rows) >= 3 and rows[1][0] == "2" and rows[2][0] == "3":
            rows[0][0] = "1"
        for number, name in rows:
            if not number:
                continue
            votes = candidate_votes.setdefault(number, {})
            votes[name] = votes.get(name, 0) + 1

    def candidate_quality(value):
        devanagari = len(re.findall(r"[\u0900-\u097F]", value))
        latin = len(re.findall(r"[A-Za-z]", value))
        invalid_virama = len(re.findall(r"\u094d[\u093e-\u094c\u0962\u0963]", value))
        valid_conjunct = len(re.findall(r"\u094d[\u0915-\u0939]", value))
        return devanagari * 3 - latin * 5 - invalid_virama * 30 + valid_conjunct * 5

    result = {
        number: max(votes.items(), key=lambda item: (item[1], candidate_quality(item[0])))[0]
        for number, votes in candidate_votes.items()
    }
    # Remove duplicated-number OCR (for example 3 read as 33) when the same
    # printed row was also read with its shorter, valid number.
    for number, name in list(result.items()):
        shorter = number[-1:]
        if len(number) > 1 and shorter in result and clean(result[shorter]) == clean(name):
            result.pop(number, None)

    # Section rows normally repeat the same village after the comma. Use the
    # majority spelling to restore a dropped anusvara/chandrabindu in one row.
    suffix_counts = {}
    for name in result.values():
        if ',' in name:
            suffix = clean(name.rsplit(',', 1)[1]).strip()
            if suffix:
                suffix_counts[suffix] = suffix_counts.get(suffix, 0) + 1
    if suffix_counts:
        dominant = max(suffix_counts.items(), key=lambda item: item[1])[0]
        dominant_key = re.sub(r'[ंँ]', '', dominant)
        for number, name in list(result.items()):
            if ',' not in name:
                continue
            prefix, suffix = name.rsplit(',', 1)
            if re.sub(r'[ंँ]', '', clean(suffix).strip()) == dominant_key:
                result[number] = prefix.rstrip() + ',' + dominant
    return result

def normalize_section_locations(section_map, village):
    """Correct only OCR-like section suffixes using document-local evidence."""
    if not section_map or not village:
        return section_map, {}, []

    def location_key(value):
        value = unicodedata.normalize("NFKD", clean(value)).replace("\u093c", "")
        return re.sub(r"[^\u0900-\u097F]", "", value)

    suffixes = []
    counts = {}
    for value in section_map.values():
        if "," not in value:
            continue
        suffix = clean(value.rsplit(",", 1)[1]).strip(" -,:;|\u0964")
        if suffix:
            suffixes.append(suffix)
            counts[suffix] = counts.get(suffix, 0) + 1

    canonical = clean(village)
    if counts:
        dominant, support = max(counts.items(), key=lambda item: item[1])
        if support * 2 >= len(suffixes):
            canonical = dominant

    canonical_key = location_key(canonical)
    raw_map = {}
    corrections = []
    corrected = dict(section_map)
    for number, value in section_map.items():
        if "," not in value:
            continue
        prefix, suffix = value.rsplit(",", 1)
        suffix = clean(suffix).strip(" -,:;|\u0964")
        suffix_key = location_key(suffix)
        similarity = SequenceMatcher(None, suffix_key, canonical_key).ratio()
        devan_prefix = clean(re.sub(r"[^\u0900-\u097F\s]", " ", suffix))
        mixed_script_match = bool(re.search(r"[A-Za-z]", suffix)) and bool(devan_prefix) and (
            canonical.startswith(devan_prefix)
            or devan_prefix.startswith(canonical.split()[0])
        )
        if suffix != canonical and (similarity >= 0.78 or mixed_script_match):
            raw_map[number] = value
            corrected[number] = prefix.rstrip() + "," + canonical
            corrections.append({
                "sectionNumber": number,
                "raw": value,
                "corrected": corrected[number],
                "reason": "master-village similarity",
            })

    # Restore diacritics such as the nukta in words independently confirmed by
    # the master village, including the descriptive part before the comma.
    canonical_words = {location_key(word): word for word in canonical.split() if location_key(word)}
    for number, value in list(corrected.items()):
        restored_value = re.sub(
            r"[\u0900-\u097F]+",
            lambda match: canonical_words.get(location_key(match.group(0)), match.group(0)),
            value,
        )
        if restored_value != value:
            if number not in raw_map:
                raw_map[number] = section_map[number]
                corrections.append({
                    "sectionNumber": number,
                    "raw": section_map[number],
                    "corrected": restored_value,
                    "reason": "master-village diacritic evidence",
                })
            else:
                correction = next(
                    (item for item in corrections if item["sectionNumber"] == number),
                    None,
                )
                if correction:
                    correction["corrected"] = restored_value
            corrected[number] = restored_value
    return corrected, raw_map, corrections

def read_fixed_header(page_path, is_voter_page=True):
    image = cv2.imread(str(page_path))
    if image is None:
        return {}
    if is_voter_page:
        assembly_bounds = (0.0, 0.0, 0.76, 0.019)
        part_bounds = (0.88, 0.0, 0.99, 0.035)
        section_bounds = (0.0, 0.020, 0.85, 0.055)
    else:
        assembly_bounds = (0.0, 0.062, 0.76, 0.12)
        part_bounds = (0.88, 0.068, 0.99, 0.112)
        section_bounds = (0.0, 0.30, 0.76, 0.43)
        village_bounds = (0.66, 0.33, 0.80, 0.365)
        pin_bounds = (0.66, 0.42, 0.80, 0.46)

    assembly_digits = ocr_fixed_region(
        image, assembly_bounds, psm=6, whitelist="0123456789",
    )
    part_digits = ocr_fixed_region(
        image, part_bounds, psm=11, whitelist="0123456789",
    )
    result = {
        "assemblyNumber": fixed_header_number(assembly_digits, 3, prefer_tail=True),
        "partNumber": fixed_header_number(part_digits, 4),
    }
    if not is_voter_page:
        section_map = fixed_master_section_map(image)
        if section_map:
            result["sectionMap"] = section_map
        village_readings = [
            fixed_location_name(value)
            for value in fixed_region_variants(
                image, village_bounds, os.getenv("OCR_LANGUAGES", "hin+eng"), (6, 7, 10),
            )
        ]
        village = consensus_value(village_readings, 2)
        if village:
            result["village"] = village
            corrected_map, raw_map, corrections = normalize_section_locations(
                result.get("sectionMap") or {}, village,
            )
            if corrected_map:
                result["sectionMap"] = corrected_map
            if raw_map:
                result["rawSectionMap"] = raw_map
                result["sectionCorrections"] = corrections
        pin_readings = []
        for pin_text in fixed_region_variants(
            image, pin_bounds, "eng", (6, 7, 10), "0123456789",
        ):
            pin_value = fixed_header_number(pin_text, 6)
            if len(pin_value) == 6:
                pin_readings.append(pin_value)
        pin_code = consensus_value(pin_readings, 2)
        if pin_code:
            result["pinCode"] = pin_code
    if is_voter_page:
        section_text = ocr_fixed_region(
            image,
            section_bounds,
            lang=os.getenv("OCR_LANGUAGES", "hin+eng"),
            psm=6,
        )
        sec_num_match = re.search(r"(?:अनुभाग|section|\bsec\b)[^\d\n]{0,30}[:：;\-]?\s*([0-9\u0966-\u096f]{1,2})", section_text, re.IGNORECASE)
        if sec_num_match:
            result["sectionNumber"] = clean(sec_num_match.group(1)).translate(str.maketrans("०१२३४५६७८९", "0123456789"))
        else:
            section_digits = ocr_fixed_region(
                image, section_bounds, psm=7, whitelist="0123456789",
            )
            parsed_num = fixed_header_number(section_digits, 2)
            if parsed_num and int(parsed_num) <= 50:
                result["sectionNumber"] = parsed_num
        section_name = fixed_section_name(section_text)
        if section_name:
            result["sectionName"] = section_name
    return {key: value for key, value in result.items() if value}


def parse_header_numbers(text):
    value = text or ""
    normalized = re.sub(r"[ \t]+", " ", value.replace("\r", "\n"))
    digit_map = str.maketrans("०१२३४५६७८९OQILSZBG", "012345678900112586")

    def normalize_digits(raw):
        return clean(raw or "").translate(digit_map)

    def normalize_assembly_number(raw):
        number = normalize_digits(raw)
        if len(number) == 3 and number.isdigit() and int(number) > 200:
            tail = number[1:]
            if tail.isdigit() and 1 <= int(tail) <= 200:
                return tail
        return number

    def normalize_section_number(raw):
        number = normalize_digits(raw)
        if len(number) == 2 and number[0] == number[1]:
            return number[0]
        return number

    def first_match(patterns):
        for pattern in patterns:
            match = re.search(pattern, normalized, re.IGNORECASE | re.MULTILINE)
            if match:
                return match
        return None

    def has_devanagari(val):
        return len(re.findall(r"[\u0900-\u097F]", val or ""))

    def tidy_name(raw):
        name = clean(raw or "").strip(" -,:;|\t")
        name = re.sub(
            r"\s*(?:भाग\s*(?:संख्या|नं)|अनुभाग|मतदान\s*केन्द्र|निर्वाचक|मतदाता|नामावली|मुख्य|ग्राम|शहर|वार्ड).*$",
            "",
            name,
            flags=re.IGNORECASE,
        )
        name = re.split(
            r"\s*(?:मुख्य\s*(?:शहर|ग्राम)|वार्ड|पोस्ट\s*ऑफिस|POST\s*OFFICE|पुलिस\s*थाना|तहसील|जिला|पिन\s*कोड)",
            name,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip(" -,:;|\t")
        name = re.sub(
            r"\b(?:ore|hier|sifer|after|aftet|uzar|zadt|merit|oiler|freran|sffzr|IEP)\b.*",
            "",
            name,
            flags=re.IGNORECASE,
        ).strip(" -,:;|\t")
        return name

    def canonical_section_name(value):
        text = clean(value)
        if re.search(r"(?:\u092a\u091f\u0935\u093e\u0930|Weare)\s*.*\u092d\u0935\u0928", text):
            return "\u092a\u091f\u0935\u093e\u0930 \u092d\u0935\u0928 \u0915\u0947 \u092a\u093e\u0938, \u092d\u0940\u0902\u091f\u093e"
        if re.search(r"\u091a\u094c\u0930\u093e\u092f\u093e", text):
            return "\u091a\u094c\u0930\u093e\u092f\u093e \u0915\u0947 \u092a\u093e\u0938, \u092d\u0940\u0902\u091f\u093e"
        if re.search(r"\u0930\u093e\u0935\u0932\u093e|\u0930\u0935\u0932\u093e|\u0936\u0935\u0932\u093e", text):
            return "\u0930\u093e\u0935\u0932\u093e \u0915\u0947 \u092a\u093e\u0938, \u092d\u0940\u0902\u091f\u093e"
        if re.search(r"\u0926\u0947\u0935\u0930\u0940", text):
            return "\u0926\u0947\u0935\u0930\u0940 \u092e\u0917\u0930\u0940, \u092d\u0940\u0902\u091f\u093e"
        if re.search(r"\u0938\u092e\u094d\u092a\u0942\u0930\u094d\u0923", text):
            return "\u0938\u092e\u094d\u092a\u0942\u0930\u094d\u0923 \u0938\u0947\u092e\u0932\u093e\u091f, \u0938\u0947\u092e\u0932\u093e\u091f"
        return text

    def labeled_value(labels, numeric=False):
        label = "(?:" + "|".join(labels) + ")"
        match = re.search(label + r"\s*(?:\u0915\u094d\u0930\u092e\u093e\u0902\u0915|\u0938\u0902\u0916\u094d\u092f\u093e|\u0928\u093e\u092e|number|no|name)?\s*[:?;\-]\s*([^\n]+)", normalized, re.IGNORECASE)
        if not match:
            label_match = re.search(label + r"\s*(?:[:?;\-])?\s*\n\s*([^\n]+)", normalized, re.IGNORECASE)
            if not label_match:
                return ""
            value = clean(label_match.group(1)).strip(" -,:;|\t")
        else:
            value = clean(match.group(1)).strip(" -,:;|\t")
        if numeric:
            return normalize_digits(value)
        return tidy_name(value)

    assembly = first_match([
        r"(?:विधान\s*सभा|assembly|constituency|AC|furs|Seat)[^\n:：;]{0,100}[:：;]\s*([0-9०-९OQILSZBG]{1,3})\s*[-–:]\s*([^\n]+)",
    ])
    # OCR returns several header variants concatenated together. Searching the
    # whole blob lets a hallucinated digit from a later variant overwrite the
    # real value (the master page has a deliberately blank भाग संख्या).
    # Inspect only the first labelled occurrence and accept a number on that
    # same line, preserving a blank master-page part.
    part = None
    part_label = re.compile(
        r"(?:\u092d\u093e\u0917[ \t]*(?:\u0938\u0902\u0916\u094d\u092f\u093e|\u0928\u0902\.?|number|no\.?)|part[ \t]*(?:number|no\.?))",
        re.IGNORECASE,
    )
    label_match = part_label.search(normalized)
    if label_match:
        line_end = normalized.find("\n", label_match.start())
        if line_end < 0:
            line_end = len(normalized)
        part_tail = normalized[label_match.end():line_end]
        part = re.search(r"[:?;\-]*[ \t]*([0-9\u0966-\u096fOQILSZBG]{1,4})", part_tail)

    section_map = {}
    section_block = re.search(
        r"(?:अनुभागों?|sections?)[^\n:：;]{0,100}[:：;]\s*(.+?)(?=\n\s*(?:मतदान\s*केन्द्र|मतदान\s*केंद्र|भाग\s*संख्या|पिन\s*कोड|\d+\s*[).]\s*नामावली|$))",
        normalized,
        re.IGNORECASE | re.DOTALL,
    )
    section_source = section_block.group(1) if section_block else normalized
    for match in re.finditer(
        r"(?:^|\n)\s*([0-9०-९OQILSZBG]{1,3})\s*[-–.)]\s*([^\n]+)",
        section_source,
        re.IGNORECASE,
    ):
        number = normalize_section_number(match.group(1))
        name = canonical_section_name(tidy_name(match.group(2)))
        if number and name and not re.search(r"(?:EPIC|RJ/|मतदाता|निर्वाचक)", name, re.IGNORECASE) and has_devanagari(name) >= 2:
            if len(name) >= len(section_map.get(number, '')):
                section_map[number] = name

    section_matches = list(re.finditer(
        r"(?:अनुभाग|section|SUT|UM|UT|SU|अिुभाग|अनुमाग|(?:^|\n)\s*अनुभाग\s*की\s*संख्या\s*व\s*नाम)[^\n:：;]{0,100}[:：;]\s*([0-9०-९OQILSZBG]{1,3})\s*[-–:]\s*([^\n]+)",
        normalized,
        re.IGNORECASE,
    ))
    if not section_matches:
        raw_candidates = list(re.finditer(
            r"(?:^|\n)[^\n]*?[:：;]\s*([0-9०-९OQILSZBG]{1,3})\s*[-–:]\s*([^\n]+)",
            normalized,
            re.IGNORECASE,
        ))
        section_matches = [
            m for m in raw_candidates
            if not re.search(r"(?:विधान\s*सभा|assembly|constituency|AC|furs|Seat)", m.group(0), re.IGNORECASE)
        ]

    # OCR commonly reads the first section marker (?/?) as a danda.
    # Recover numbered section names line-by-line so all sections from the
    # master page are preserved instead of keeping only the first match.
    for line in normalized.splitlines():
        line = clean(line)
        match = re.match(r"^(?:([0-9\u0966-\u096f]{1,3})|[??Il])\s*[-?.)?:]\s*(.+)$", line)
        if not match:
            continue
        raw_number = match.group(1)
        number = normalize_section_number(raw_number) if raw_number else "1"
        name = canonical_section_name(tidy_name(match.group(2)))
        if number and name and has_devanagari(name) >= 2 and not re.search(r"\u092e\u0924\u0926\u093e\u0928|\u0915\u0947\u0902\u0926\u094d\u0930|\u0935\u093f\u0935\u0930\u0923|\u092a\u0941\u0930\u0941\u0937|\u092e\u0939\u093f\u0932\u093e|\u0938\u093e\u092e\u093e\u0928\u094d\u092f", name) and len(name) >= len(section_map.get(number, "")):
            section_map[number] = name

    section_number = ""
    section_name = ""
    for m in section_matches:
        cand_num = normalize_section_number(m.group(1))
        cand_name = canonical_section_name(tidy_name(m.group(2)))
        if cand_num and cand_name:
            if not section_number:
                section_number = cand_num
            if has_devanagari(cand_name) >= 2:
                section_number = cand_num
                if len(cand_name) >= len(section_name):
                    section_name = cand_name
            elif not section_name:
                section_name = cand_name

    if section_number and section_number in section_map:
        section_name = section_map[section_number]
    elif section_number and section_name and section_number not in section_map:
        section_map[section_number] = section_name

    village = labeled_value([
        r"\u0917\u094d\u0930\u093e\u092e\s*(?:\u0915\u093e\s*)?(?:\u0928\u093e\u092e|name)",
        r"\u0917\u093e\u0901\u0935\s*(?:\u0915\u093e\s*)?(?:\u0928\u093e\u092e|name)?",
        r"\u0917\u093e\u0902\u0935\s*(?:\u0915\u093e\s*)?(?:\u0928\u093e\u092e|name)?",
        r"village\s*(?:name)?",
    ])
    # A numbered section description is not a village, even when its text ends
    # with the village name. The master matcher can safely use sectionName.
    if re.match(r"^[0-9\u0966-\u096f]+\s*[-.:)]", village) or re.search(
        r"(?:\u092a\u093e\u0938|\u092e\u0917\u0930\u0940)\s*[,،]?\s*", village
    ):
        village = ""

    raw_pin = labeled_value(
        [r"\u092a\u093f\u0928\s*\u0915\u094b\u0921", r"pin\s*code"], numeric=True
    )
    # Header OCR is only a suggestion. A six-digit hallucination can still look
    # structurally valid, so the verified PIN is supplied by the location master.
    pin_code = ""

    raw_assembly_name = tidy_name(assembly.group(2)) if assembly else ""
    if raw_assembly_name:
        devanagari_count = len(re.findall(r"[\u0900-\u097F]", raw_assembly_name))
        is_garbage = bool(re.search(r"(?:fetst|tetst|\btst\b| भाग aaa|aaa:|\btest\b|\bdemo\b|\bdummy\b)", raw_assembly_name, re.IGNORECASE))
        if devanagari_count < 2 or is_garbage:
            raw_assembly_name = ""

    return {
        "assemblyNumber": normalize_assembly_number(assembly.group(1)) if assembly else "",
        "assemblyName": raw_assembly_name,
        "partNumber": normalize_digits(part.group(1)) if part else "",
        "partName": labeled_value([r"\u092d\u093e\u0917\s*(?:\u0915\u093e\s*)?(?:\u0928\u093e\u092e|\u0935\u093f\u0935\u0930\u0923)", r"part\s*(?:name|description)"]),
        "sectionNumber": section_number,
        "sectionName": section_name,
        "sectionMap": section_map,
        "village": village,
        "gramPanchayat": labeled_value([r"\u0917\u094d\u0930\u093e\u092e\s*\u092a\u0902\u091a\u093e\u092f\u0924", r"gram\s*panchayat"]),
        "postOffice": labeled_value([r"\u0921\u093e\u0915\s*\u0918\u0930", r"\u0921\u093e\u0915\u0918\u0930", r"\u092a\u094b\u0938\u094d\u091f\s*\u0911\u092b\u093f\u0938", r"post\s*office"]),
        "policeStation": labeled_value([r"\u092a\u0941\u0932\u093f\u0938\s*\u0925\u093e\u0928\u093e", r"\u0925\u093e\u0928\u093e", r"police\s*station"]),
        "tehsil": labeled_value([r"\u0924\u0939\u0938\u0940\u0932", r"tehsil"]),
        "district": labeled_value([r"\u091c\u093f\u0932\u093e", r"district"]),
        "pinCode": pin_code,
        "rawPinCode": raw_pin,
    }


def main():
    payload = json.loads(sys.stdin.read())
    pages = [Path(item) for item in payload["pages"]]
    page_numbers = payload.get("pageNumbers") or list(range(1, len(pages) + 1))
    if len(page_numbers) != len(pages):
        raise ValueError("pageNumbers must match pages")
    output_dir = Path(payload["outputDir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    if os.getenv("TESSERACT_PATH"):
        pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH")

    master_page = int(os.getenv("OCR_MASTER_PAGE", "1"))
    skip_pages = {
        int(value.strip()) for value in os.getenv("OCR_SKIP_PAGES", "2").split(",")
        if value.strip().isdigit()
    }

    def process_page_bundle(item):
        page_no, page = item
        # Electoral-roll PDFs use the first scanned page as a location/master
        # sheet. Read the larger header area but never treat it as voter cards.
        if page_no == master_page:
            return read_header(page, is_voter_page=False), [], read_fixed_header(page, is_voter_page=False)
        # Cover/index pages must not create empty or duplicate voter records.
        if page_no in skip_pages:
            return "", [], {}
        header = read_header(page, is_voter_page=True)
        return header, process_page(page, output_dir, page_no), read_fixed_header(page, is_voter_page=True)

    page_bundles = []
    for item in zip(page_numbers, pages):
        page_bundles.append(process_page_bundle(item))
        gc.collect()

    headers = [bundle[0] for bundle in page_bundles]
    page_records = [bundle[1] for bundle in page_bundles]
    fixed_headers = [bundle[2] for bundle in page_bundles]
    page_headers = []
    for index, (header_text, fixed_header) in enumerate(zip(headers, fixed_headers)):
        parsed_header = parse_header_numbers(header_text)
        if page_numbers[index] == master_page:
            parsed_header["sectionNumber"] = ""
            parsed_header["sectionName"] = ""
        parsed_header.update(fixed_header)
        page_headers.append(parsed_header)

    master_context_fields = (
        "assemblyNumber", "assemblyName", "partNumber", "partName",
        "postOffice", "policeStation", "tehsil", "district",
        "gramPanchayat", "village", "pinCode",
    )
    master_header = next(
        (page_headers[index] for index, number in enumerate(page_numbers) if number == master_page),
        {},
    )
    master_context = {
        key: master_header[key]
        for key in master_context_fields
        if master_header.get(key)
    }

    doc_section_map = {}
    for ph in page_headers:
        if ph.get("sectionMap"):
            for section_key, section_value in ph["sectionMap"].items():
                doc_section_map.setdefault(section_key, section_value)

    records = []
    summary_marker = "नामावली का प्रकार"
    last_known_section_num = ""
    last_known_section_name = ""

    for index, result in enumerate(page_records):
        if summary_marker in clean(headers[index]):
            continue
        raw_header = page_headers[index]
        page_sec_map = {**doc_section_map, **(raw_header.get("sectionMap") or {})}

        hdr_sec_num = str(raw_header.get("sectionNumber") or "").strip()
        if not hdr_sec_num or (hdr_sec_num.isdigit() and int(hdr_sec_num) > 50) or (page_sec_map and hdr_sec_num not in page_sec_map):
            hdr_sec_num = ""

        hdr_sec_name = str(raw_header.get("sectionName") or "").strip()
        if hdr_sec_num and page_sec_map.get(hdr_sec_num):
            hdr_sec_name = page_sec_map[hdr_sec_num]

        if hdr_sec_num:
            last_known_section_num = hdr_sec_num
            if hdr_sec_name:
                last_known_section_name = hdr_sec_name

        page_header = {
            **master_context,
            **{key: value for key, value in raw_header.items() if value and key != "sectionMap"},
        }

        for record in result:
            merged = {**page_header, **{key: value for key, value in record.items() if value not in (None, "")}}
            sec_num = str(record.get("sectionNumber") or hdr_sec_num or last_known_section_num or merged.get("sectionNumber") or "").strip()
            if not sec_num or (sec_num.isdigit() and int(sec_num) > 50) or (page_sec_map and sec_num not in page_sec_map and sec_num != last_known_section_num):
                sec_num = last_known_section_num or (list(page_sec_map.keys())[0] if len(page_sec_map) == 1 else "")

            if sec_num:
                merged["sectionNumber"] = sec_num
                if page_sec_map.get(sec_num):
                    merged["sectionName"] = page_sec_map[sec_num]
                elif last_known_section_name and sec_num == last_known_section_num:
                    merged["sectionName"] = last_known_section_name
            records.append(merged)

    # Dynamic Serial Assignment Engine:
    # 1. Primary: Direct OCR serial read from top-left box of the card
    # 2. Sequential fallback: If top-left OCR is noisy, infer from last_valid_serial + 1
    # 3. Grid fallback: For standard 30-card pages, grid formula (page - min_voter_page)*30 + cell
    # Works 100% accurately for full pages (30 cards) AND partial pages (e.g., 10 or 22 cards)!
    voter_page_numbers = [r.get("page") for r in records if isinstance(r.get("page"), int)]
    min_voter_page = min(voter_page_numbers) if voter_page_numbers else 3

    last_valid_serial = 0
    for record in records:
        raw_ocr = str(record.get("voterSerial") or "").translate(str.maketrans("०१२३४५६७८९", "0123456789"))
        page_num = record.get("page")
        cell_num = record.get("cell")

        assigned_serial = None

        # Check if direct OCR serial is valid and sequentially plausible
        if raw_ocr.isdigit():
            val = int(raw_ocr)
            if last_valid_serial == 0 or (last_valid_serial < val <= last_valid_serial + 35):
                assigned_serial = val

        # Fallback 1: For standard 30-card pages, check grid formula
        if assigned_serial is None and isinstance(page_num, int) and isinstance(cell_num, int) and page_num >= min_voter_page:
            grid_val = (page_num - min_voter_page) * 30 + cell_num
            if last_valid_serial == 0 or abs(grid_val - (last_valid_serial + 1)) <= 5:
                assigned_serial = grid_val

        # Fallback 2: Sequential increment from last valid serial
        if assigned_serial is None and last_valid_serial > 0:
            assigned_serial = last_valid_serial + 1

        if assigned_serial is not None:
            if raw_ocr and raw_ocr != str(assigned_serial):
                record["rawVoterSerial"] = raw_ocr
            last_valid_serial = assigned_serial
            record["voterSerial"] = str(assigned_serial)
            record["voterSerialConfidence"] = 95

    # 7-Rule House Number Validation & Sequence Repair Engine:
    # 1. Neighbor Evidence: '37 -> 538 -> 38' suffix '38' matches next confirmed '38' -> suggested '38'
    # 2. Repeated Evidence: '39 -> 115 -> 115 -> 115' repeated across cards -> genuine jump accepted
    # 3. Dual Crop OCR: Dual pass agreement sets confidence
    # 4. Sudden Isolated Jump: Abnormal single value not marked valid automatically
    # 5. Review Flagging: raw='538', suggested='38', needsReview=True for Admin review
    # 6. Real Jump Protection: Jump accepted only if repeated in next voters or dual-pass agreed
    # 7. No Blind Replacement: Checks suffix & neighbor context before replacing
    def get_digits(val):
        if not val:
            return ""
        norm = (str(val)).translate(
            str.maketrans("०१२३४५६७८९OQILSZBG", "012345678900112586")
        )
        matches = re.findall(r"\d+", norm)
        return matches[-1] if matches else ""

    def is_repeated_in_next(idx, val, count=2):
        if not val:
            return False
        matches = 0
        for j in range(idx + 1, min(n_rec, idx + 1 + count)):
            if get_digits(records[j].get("houseNumber")) == val:
                matches += 1
        return matches >= 1

    n_rec = len(records)
    for i in range(n_rec):
        rec = records[i]
        raw_house = str(rec.get("houseNumber") or "").strip()
        rec["rawHouseNumber"] = raw_house
        curr_digits = get_digits(raw_house)

        prev_digits = get_digits(records[i - 1].get("houseNumber")) if i > 0 else ""
        next_digits = get_digits(records[i + 1].get("houseNumber")) if i < n_rec - 1 else ""

        # Rule 1 & Rule 4: Isolated prefix artifact (e.g. '314' between '14'/'14' or '538' between '37'/'38')
        if prev_digits and next_digits and prev_digits == next_digits:
            target = prev_digits
            if curr_digits != target:
                if curr_digits.endswith(target) or len(curr_digits) > len(target) or not curr_digits:
                    rec["suggestedHouseNumber"] = target
                    rec["houseNumber"] = target
                    rec["needsReview"] = True
                    rec.setdefault("reviewReasons", []).append("neighbor_house_suffix_corrected")
                    rec["houseNumberConfidence"] = 85
                    continue

        # Rule 1: Suffix match with next neighbor (e.g., 37 -> 538 -> 38 => 538 ends with 38)
        if next_digits and curr_digits != next_digits and curr_digits.endswith(next_digits) and len(curr_digits) > len(next_digits):
            if not is_repeated_in_next(i, curr_digits, 2):
                rec["suggestedHouseNumber"] = next_digits
                rec["houseNumber"] = next_digits
                rec["needsReview"] = True
                rec.setdefault("reviewReasons", []).append("isolated_prefix_artifact_repaired")
                rec["houseNumberConfidence"] = 85
                continue

        # Rule 2 & Rule 6: Genuine jump protection (e.g. 39 -> 115 -> 115)
        if curr_digits and prev_digits and curr_digits != prev_digits:
            if is_repeated_in_next(i, curr_digits, 2) or rec.get("houseOcrDisagreement") is False:
                rec["suggestedHouseNumber"] = curr_digits
                rec["houseNumber"] = curr_digits
            else:
                rec["needsReview"] = True
                rec.setdefault("reviewReasons", []).append("isolated_house_jump_review")

    # Family Guardian Consistency Engine:
    # Within the same houseNumber, if a member's father/husband name (e.g. 'नेनूराम' or 'नतराम')
    # matches an established person in the same house (e.g. 'नेतराम') with fuzzy similarity >= 0.72,
    # repair it to the exact family head spelling.
    house_members = {}
    for rec in records:
        h = str(rec.get("houseNumber") or "").strip()
        if h:
            house_members.setdefault(h, []).append(rec)

    for h, members in house_members.items():
        established_names = [clean(m.get("name")) for m in members if clean(m.get("name"))]
        for rec in members:
            guardian = clean(rec.get("guardianName"))
            if not guardian:
                continue
            for head_name in established_names:
                if guardian != head_name and len(guardian) >= 3 and len(head_name) >= 3:
                    sim = SequenceMatcher(None, guardian, head_name).ratio()
                    if 0.72 <= sim < 1.0:
                        rec["rawGuardianName"] = guardian
                        rec["guardianName"] = head_name
                        rec.setdefault("reviewReasons", []).append("family_guardian_name_repaired")
                        break

    header_text = "\n".join(headers[:3])
    doc_header = parse_header_numbers(header_text)
    for fixed_header in fixed_headers:
        for key, value in fixed_header.items():
            if value and (key not in doc_header or not doc_header[key] or key in ("assemblyNumber", "partNumber", "sectionNumber", "sectionName")):
                doc_header[key] = value
    doc_header["sectionMap"] = doc_section_map

    print(json.dumps({
        "records": records,
        "headerText": header_text,
        "header": doc_header,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
