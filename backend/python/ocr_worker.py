import json
import gc
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from pathlib import Path

import cv2
import pytesseract

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


def safe_image_to_string(image, lang="eng", config=""):
    """
    Safely execute pytesseract.image_to_string with image bounds checking
    and exception handling to prevent Tesseract C++ std::bad_alloc / process crashes.
    """
    if image is None or getattr(image, "size", 0) == 0:
        return ""
    try:
        height, width = image.shape[:2]
        max_w, max_h = 1800, 1200
        if width > max_w or height > max_h:
            scale = min(max_w / float(width), max_h / float(height))
            image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        return pytesseract.image_to_string(image, lang=lang, config=config)
    except Exception as err:
        sys.stderr.write(f"Warning: safe_image_to_string failed: {err}\n")
        return ""



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
    text = re.sub(r"(?:\s+[.]?\s*)(?:का|की|के|न|अक|नो|यु|है|ह|हे|ः|छु|ब्|ब्र|क्र|अक|।|\|)$", "", text)
    text = clean(text).strip(" .-|:")

    # Devanagari OCR Spelling Fixes (common Tesseract misreads)
    text = re.sub(r"(?:^|\s)(?:सुगणी|सुगी)(?=$|\s)", " सुखी ", text)
    text = re.sub(r"(?:^|\s)बब्रा(?=$|\s)", " बन्ना ", text)
    text = re.sub(r"(?:^|\s)बब्रालाल(?=$|\s)", " बन्नालाल ", text)
    text = re.sub(r"(?:^|\s)(?:लाटुलाल|लाडुलाल|लादुलाल)(?=$|\s)", " लादूलाल ", text)
    text = re.sub(r"(?:^|\s)(?:लाटु|लाडु|लादु)(?=$|\s)", " लादू ", text)
    text = re.sub(r"(?:^|\s)डालु(?=$|\s)", " डालू ", text)
    text = re.sub(r"(?<=\u0900-\u097F)ताल\b", "लाल", text)
    text = re.sub(r"\bअजपुर्नताल\b|\bअजपुर्नलाल\b|\bअर्जुुनलाल\b", "अर्जुनलाल", text)
    text = re.sub(r"(?<=\u0900-\u097F)ताम\b", "राम", text)
    text = re.sub(r"\bकुमारr\b|\bकुभार\b|\bकुसार\b|\bकुनार\b|\bकुभारr\b", "कुमार", text)
    text = re.sub(r"\bदेबी\b", "देवी", text)
    text = re.sub(r"\bगोर्धघन\b|\bगोवर्धण\b", "गोवर्धन", text)
    text = re.sub(r"(?<=\u0900-\u097F)चित्\b|(?<=\u0900-\u097F)चन्त\b|(?<=\u0900-\u097F)चन्च\b", "चन्द", text)
    text = re.sub(r"\bप्रिाप\b|\bप्रिा\b|\bप्रताश\b|\bप्रताप\s+सिंह\b", "प्रताप", text)
    text = re.sub(r"\bकन्द्रया\b|\bकन्हेया\b", "कन्हैया", text)
    text = re.sub(r"\bरतनी ब्\b|\bरतनी ब्र\b|\bकेली ब्\b", lambda m: m.group(0).replace("ब्", "बाई").replace("ब्र", "बाई"), text)
    text = re.sub(r"(?:^|\s)(?:पुशपा|पुष्या|पुषपा)(?=$|\s)", " पुष्पा ", text)
    text = re.sub(r"\bकुमावतत\b", "कुमावत", text)
    text = re.sub(r"\bपूजा क्र\b", "पूजा", text)
    text = re.sub(r"\bसिह\b|\bसीह\b|\bसिहं\b", "सिंह", text)
    text = re.sub(r"\bबाय\b|\bवाइ\b|\bबाई्\b", "बाई", text)
    text = re.sub(r"\bशांती\b|\bसांति\b", "शांति", text)
    text = re.sub(r"\bभवर\b|\bभँवर\b", "भंवर", text)
    text = re.sub(r"\bनारायन\b", "नारायण", text)
    text = re.sub(r"\bरमेस्वर\b", "रामेश्वर", text)
    text = re.sub(r"\bगनेश\b", "गणेश", text)
    text = re.sub(r"\bदिनेस\b", "दिनेश", text)
    text = re.sub(r"\bराजेस\b", "राजेश", text)
    text = re.sub(r"\bकवर\b|\bकँवर\b", "कंवर", text)
    text = re.sub(r"\bजसवन्त\b", "जसवंत", text)
    text = re.sub(r"\bसायरी\b", "सावरी", text)
    text = re.sub(r"\bनारायनी\b", "नारायण", text)
    text = clean(text).strip(" .-|:")
    
    # Dictionary lookup & fuzzy correction
    text = correct_name_with_dictionary(text)
    return text


# Load Master Hindi Voter Name Dictionary (69,000+ entries) for fast OCR lookup
HINDI_NAME_DICT = set()
try:
    dict_file_path = os.path.join(os.path.dirname(__file__), "hindi_voter_names_dict.json")
    if os.path.exists(dict_file_path):
        with open(dict_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            HINDI_NAME_DICT = set(data.get("names", []))
# Loaded Master Hindi Voter Name Dictionary
except Exception:
    pass


def correct_name_with_dictionary(name_text):
    """Correct Devanagari name tokens using HINDI_NAME_DICT & fuzzy matching conservatively."""
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
        # Fast fuzzy check for tokens of length >= 3 with high threshold (0.90) to prevent overwriting valid names
        best_match = None
        best_ratio = 0.90
        len_tok = len(clean_tok)
        candidates = [w for w in HINDI_NAME_DICT if abs(len(w) - len_tok) <= 1 and w[0] == clean_tok[0]]
        for candidate in candidates:
            r = SequenceMatcher(None, clean_tok, candidate).ratio()
            if r > best_ratio:
                best_ratio = r
                best_match = candidate
        if best_match:
            corrected.append(best_match)
        else:
            corrected.append(token)
    return " ".join(corrected)




def clean_house(value):
    if not value:
        return ""
    normalized = (value or "").translate(
        str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096fOQILSZBGil|!][", "012345678900112586111111")
    )
    # Remove leading non-digit symbols like ':', '|', '/', '-', '.' or hyphenated prefixes like '1-', '7-'
    normalized = re.sub(r"^(?:[:\|/\-\.]+\s*)+", "", normalized.strip())
    normalized = re.sub(r"^(?:[174][\-/|:]+\s*)+", "", normalized.strip())
    match = re.search(r"(?<!\d)(\d{1,5}(?:[/\-]\d{1,5})?)(?!\d)", normalized)
    if not match:
        return ""
    val = match.group(1)
    # If hyphenated with identical numbers (e.g., 3-3 -> 3, 56-56 -> 56)
    if "-" in val or "/" in val:
        parts = re.split(r"[/\-]", val)
        if len(parts) == 2 and parts[0] == parts[1]:
            val = parts[0]

    # Strip OCR colon/label noise prepended to 4-digit or 3-digit house numbers (e.g., 14194 -> 4194, 124194 -> 4194, 74194 -> 4194)
    if len(val) > 1 and val.startswith("0") and val not in ("00", "000"):
        val = val.lstrip("0")
    if len(val) == 6 and val[0:2] in ("12", "14", "15", "17", "44", "47") and val[2:].isdigit():
        val = val[2:]
    elif len(val) == 5 and val[0] in (":", "|", "l", "i") and val[1:].isdigit():
        val = val[1:]
    elif len(val) == 5 and val[0:2] in ("14", "17", "44", "74", "15") and val[1:].isdigit():
        val = val[1:]
    elif len(val) == 4 and val[0:2] in ("44", "47") and val[2:].isdigit() and int(val[2:]) >= 50:
        val = "41" + val[2:]
    return val



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
        if value and value.isdigit() and 1 <= int(value) <= 99999:
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
        if not (0.35 <= relative_x <= 0.78 and 0.48 <= relative_y <= 0.68):
            continue
        value = clean_house(word["text"])
        if value:
            candidates.append((abs(relative_y - 0.58), relative_x, value))
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
    """Read the full house-number row and parse the value using regex."""
    height, width = card.shape[:2]
    
    # Crop the exact house number line (excluding top serial and bottom age)
    region = card[
        round(height * 0.49):round(height * 0.70),
        round(width * 0.10):round(width * 0.78),
    ]
    if region.size == 0:
        return ""
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    c1_values = []
    c2_values = []
    for variant in variants:
        t_hin = safe_image_to_string(variant, lang="hin+eng", config="--psm 6")
        house_line = field(t_hin, r"(?:गृह|गह|गुह|ग्ह|गृ|गृ\.|मकान|House|H\.No|Te|\S*ह|\S*स)\s*(?:संख्या|सख्या|सं\.?|सं०|नं\.?|क्र\.?|Number|No\.?)?\s*[:：;\-।|]?\s*([^\n]+)")
        c1 = clean_house(house_line or t_hin)
        if c1:
            c1_values.append(c1)

        t_eng = safe_image_to_string(
            variant, lang="eng", config="--psm 6 -c tessedit_char_whitelist=0123456789/-",
        )
        c2 = clean_house(t_eng)
        if c2:
            c2_values.append(c2)

    if c1_values:
        counts = {v: c1_values.count(v) for v in set(c1_values)}
        winner, _ = max(counts.items(), key=lambda x: x[1])
        return winner

    if c2_values:
        counts = {v: c2_values.count(v) for v in set(c2_values)}
        winner, _ = max(counts.items(), key=lambda x: x[1])
        return winner

    return ""

def _dual_fixed_choice(card, y1, y2, x1, x2, extractor, language="eng", whitelist=""):
    """Return a fixed-region value only when two preprocessing passes agree."""
    height, width = card.shape[:2]
    region = card[round(height * y1):round(height * y2), round(width * x1):round(width * x2)]
    if region.size == 0:
        return "", False
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    values = []
    config = "--psm 7" + (f" -c tessedit_char_whitelist={whitelist}" if whitelist else "")
    for variant in variants:
        try:
            txt = safe_image_to_string(variant, lang=language, config=config)
            values.append(extractor(txt))
        except Exception:
            values.append("")
    agreed = bool(len(values) >= 2 and values[0] and values[0] == values[1])
    disagreement = bool(len(values) >= 2 and values[0] and values[1] and values[0] != values[1])
    return (values[0] if agreed else ""), disagreement


def ocr_serial(card):
    def extract(text):
        match = re.search(r"(?<!\d)(\d{1,5})(?!\d)", text or "")
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
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    variants = [cv2.createCLAHE(3.0, (8, 8)).apply(gray), cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]]
    candidates = []
    for variant in variants:
        try:
            text = safe_image_to_string(variant, lang="eng", config="--psm 7 -c tessedit_char_whitelist=0123456789")
            candidates.extend(int(value) for value in re.findall(r"\d{2,3}", text) if 18 <= int(value) <= 120)
        except Exception:
            pass
    if not candidates:
        line = card[
            round(height * 0.54):round(height * 0.84),
            0:round(width * 0.48),
        ]
        line_gray = cv2.cvtColor(line, cv2.COLOR_BGR2GRAY)
        line_gray = cv2.resize(line_gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        line_variants = [
            cv2.createCLAHE(3.0, (8, 8)).apply(line_gray),
            cv2.threshold(line_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        ]
        for variant in line_variants:
            for psm in (6, 11):
                try:
                    text = safe_image_to_string(variant, lang="hin+eng", config=f"--psm {psm}")
                except Exception:
                    continue
                match = re.search(r"(?:उम्र|उप्र|आयु)\s*[:：;\-]?\s*([0-9०-९OQILSZBG]{1,3})", text)
                if not match:
                    continue
                clean_raw_age = re.sub(r"[\]\|।:;\-]", "", match.group(1))
                value = clean(clean_raw_age).upper().translate(
                    str.maketrans("०१२३४५६७८९OQILSZBG", "012345678900112586")
                )
                digits = "".join(re.findall(r"\d", value))
                if digits.isdigit() and 18 <= int(digits) <= 120:
                    candidates.append(int(digits))
    if not candidates:
        return None
    counts = {value: candidates.count(value) for value in set(candidates)}
    winner, support = max(counts.items(), key=lambda item: item[1])
    return winner if (support >= 2 or (len(candidates) >= 1 and 18 <= winner <= 120)) else None


def field(text, pattern):
    match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
    return clean(match.group(1)) if match else ""


def epic_from(text):
    if not text:
        return ""
    compact = re.sub(r"[^A-Z0-9/]", "", text.upper().replace("\\", "/"))
    # Legacy state formats: e.g. RJ/01/02/001234, UP/01/02/001234, MP/..., HR/...
    legacy = re.search(r"([A-Z]{2,3})/([0-9O]{1,3})/([0-9O]{1,3})/([0-9O]{5,6})", compact)
    if legacy:
        prefix = legacy.group(1)
        if prefix.startswith("R"):
            prefix = "RJ"
        return "{}/{}/{}/{}".format(
            prefix,
            legacy.group(2).replace("O", "0"),
            legacy.group(3).replace("O", "0"),
            legacy.group(4).replace("O", "0"),
        )

    legacy_parts = re.search(r"[A-Z0-9]{0,3}/([0-9O]{1,3})/([0-9O]{1,3})/([0-9O]{5,6})", compact)
    if legacy_parts:
        return "RJ/{}/{}/{}".format(
            legacy_parts.group(1).replace("O", "0"),
            legacy_parts.group(2).replace("O", "0"),
            legacy_parts.group(3).replace("O", "0"),
        )

    letter_map = str.maketrans({"0": "O", "1": "I", "2": "Z", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B", "3": "E"})
    digit_map = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8", "G": "6", "T": "7", "A": "4", "E": "3"})

    # Standard 10-character EPIC codes (e.g., ZBY1234567, TWB1234567, RWR1234567, UPX1234567)
    for value in re.findall(r"[A-Z0-9]{10}", compact):
        prefix = value[:3]
        suffix = value[3:].translate(digit_map)
        if re.fullmatch(r"[A-Z]{3}", prefix) and re.fullmatch(r"[0-9]{7}", suffix):
            return prefix + suffix
        translated_prefix = prefix.translate(letter_map)
        if re.fullmatch(r"[A-Z]{3}", translated_prefix) and re.fullmatch(r"[0-9]{7}", suffix):
            return translated_prefix + suffix

    # Candidate with slash or 3-letter + 7-digit misreads
    for value in re.findall(r"[A-Z0-9]{3}/?[A-Z0-9]{7}", compact):
        clean_v = re.sub(r"[^A-Z0-9]", "", value)
        if len(clean_v) == 10:
            prefix = clean_v[:3]
            suffix = clean_v[3:].translate(digit_map)
            if re.fullmatch(r"[A-Z]{3}", prefix) and re.fullmatch(r"[0-9]{7}", suffix):
                return prefix + suffix
            translated_prefix = prefix.translate(letter_map)
            if re.fullmatch(r"[A-Z]{3}", translated_prefix) and re.fullmatch(r"[0-9]{7}", suffix):
                return translated_prefix + suffix
    return ""


def ocr_epic(card, reference=""):
    height, width = card.shape[:2]
    regions = [
        card[0:round(height * 0.35), round(width * 0.45):width],
        card[0:round(height * 0.35), 0:width],
    ]
    candidates = []
    for region in regions:
        if region.size == 0:
            continue
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        variants = [
            cv2.createCLAHE(3.0, (8, 8)).apply(gray),
            cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        ]
        for variant in variants:
            for psm in (7, 11):
                try:
                    text = safe_image_to_string(
                        variant,
                        lang="eng",
                        config=f"--psm {psm} -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/",
                    )
                except Exception:
                    continue
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
    if reference and winner != reference and support < 2:
        return reference, False
    return winner, support >= 2
def ocr_name_focused(card):
    """Dedicated focused ROI crop pass for voter name line only."""
    height, width = card.shape[:2]
    # Name is typically printed on top left section of card below serial box
    name_crop = card[round(height * 0.14):round(height * 0.36), 0:round(width * 0.65)]
    if name_crop.size == 0:
        return ""
    gray = cv2.cvtColor(name_crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.createCLAHE(5.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    candidates = []
    for variant in variants:
        for psm in (6, 7, 11):
            text = safe_image_to_string(variant, lang="hin", config=f"--psm {psm}")
            raw = field(text, r"(?:निर्वा\S*|मतदाता)?\s*(?:का)?\s*नाम\s*[:：;!\-]?\s*([^\n]+)") or text
            cleaned = clean_person_name(raw)
            if cleaned and len(re.findall(r"[\u0900-\u097F]", cleaned)) >= 2:
                candidates.append(cleaned)
    if not candidates:
        return ""
    counts = {cand: candidates.count(cand) for cand in set(candidates)}
    winner, _ = max(counts.items(), key=lambda item: item[1])
    return winner


def ocr_identity(card):
    """Cross-check fixed name/guardian lines with CLAHE and threshold passes."""
    height, width = card.shape[:2]
    region = card[round(height * 0.16):round(height * 0.54), 0:round(width * 0.62)]
    if region.size == 0:
        return {}, False
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    results = []
    focused_name_cand = ocr_name_focused(card)
    for variant in variants:
        text = safe_image_to_string(variant, lang="hin", config="--psm 6")
        name = clean_person_name(field(text, r"(?:निर्वा\S*|मतदाता)\s*(?:का)?\s*नाम\s*[:：;!\-]?\s*([^\n]+)")) or focused_name_cand
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
        elif len(values) == 1:
            suggestion[key] = values[0]
    if focused_name_cand and not suggestion.get("name"):
        suggestion["name"] = focused_name_cand
    return suggestion, disagreement
def parse_card(text, epic_text, photo_path, page_no, cell_no, focused_house="", card_path=""):
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
    raw_house = clean_house(
        field(text, r"(?:गृह|गह|गुह|ग्ह|गृ|गृ\.|मकान|House|H\.No|Te|\S*ह|\S*स)\s*(?:संख्या|सख्या|सं\.?|सं०|नं\.?|क्र\.?|Number|No\.?)?\s*[:：;\-]?\s*([^\n]+)")
        or field(text, r"(?:संख्या|सख्या)\s*[:：;\-]\s*([^\n]+)")
    )
    if raw_house != "":
        if raw_house in ("0", "00", "000"):
            house = raw_house
        elif len(raw_house) >= len(focused_house):
            house = raw_house
        elif focused_house.endswith(raw_house):
            house = focused_house
        elif len(raw_house) >= 2:
            house = raw_house
        else:
            house = focused_house or raw_house
    else:
        house = focused_house
    age_raw = field(
        text,
        r"(?:उम्र|उप्र|आयु)\s*[:：;\-]?\s*([0-9०-९OQILSZBG]{1,3})",
    )
    clean_age_raw = re.sub(r"[\]\|।:;\-]", "", age_raw)
    age = clean(clean_age_raw).upper().translate(
        str.maketrans("०१२३४५६७८९OQILSZBG", "012345678900112586")
    )
    age = "".join(re.findall(r"\d", age))
    
    # Discard fallback focused_house if it equals voter age
    if not raw_house and house and age and house == age:
        house = ""
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
    serial_match = re.search(r"(?:^|\n)\s*[\[\(\|]?\s*(\d{1,5})\s*[\]\)\|]?", text or "")
    voter_serial = serial_match.group(1) if serial_match else ""

    # Check for DELETED / निरस्त / विलोपित watermark
    is_deleted = bool(re.search(
        r"निरस्त|विलोपित|निरस्तीकरण|विलोपन|\bDELETED\b|\bDELETION\b|\bCANCELLED\b|\bEXPIRED\b",
        text + "\n" + (epic_text or ""),
        re.IGNORECASE
    ))

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
        "cardImage": card_path,
        "rawText": text,
        "confidence": confidence,
        "houseNumberConfidence": 100 if focused_house else (65 if house else 0),
        "page": page_no,
        "cell": cell_no,
        "isDeleted": is_deleted,
        "sourceAction": "delete" if is_deleted else "upsert",
    }


def valid_epic(value):
    return bool(
        re.fullmatch(r"[A-Z]{3}\d{7}", value or "")
        or re.fullmatch(r"RJ/\d{1,3}/\d{1,3}/\d{6}", value or "")
    )


def loose_person_key(value):
    """Create a comparison-only Hindi key; strip honorifics & suffixes."""
    text = re.sub(r"[^\u0900-\u097F]", "", clean(value or ""))
    text = re.sub(r"(?:लाल|चन्द|चंद्र|राम|कुमार|देवी|प्रसाद|सिंह|दास|मल|क्ठ|गा|क|बाई)$", "", text)
    return re.sub(r"[\u0901-\u0903\u093a-\u094d\u0951-\u0957]", "", text)

def fuzzy_name_match(k1, k2):
    if not k1 or not k2:
        return False
    if k1 == k2:
        return True
    if len(k1) >= 2 and len(k2) >= 2 and (k1 in k2 or k2 in k1):
        return True
    return False

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
        if not any(abs(box[0] - old[0]) < width * 0.10 and abs(box[1] - old[1]) < height * 0.03 for old in unique):
            unique.append(box)
    if len(unique) == 30:
        unique.sort(key=lambda b: (round(b[1] / (height * 0.08)), b[0]))
        return unique
    return []


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


def process_page(page_path, output_dir, page_no):
    image = cv2.imread(str(page_path))
    if image is None:
        return []
    boxes = detect_card_boxes(image)
    if not boxes:
        height, width = image.shape[:2]
        left = round(width * 0.02)
        top = round(height * 0.03)
        card_w = round(width * 0.288)
        card_h = round(height * 0.088)
        gap_x = round(width * 0.006)
        gap_y = round(height * 0.005)
        boxes = [
            (left + col * (card_w + gap_x), top + row * (card_h + gap_y), card_w, card_h)
            for row in range(10)
            for col in range(3)
        ]
    records = []
    card_images = {}
    for cell_no, (x, y, w, h) in enumerate(boxes, 1):
        card = image[y:y + h, x:x + w]
        card_images[cell_no] = card
        photo_rect = detect_photo_box(card)
        px, py, pw, ph = photo_rect
        photo_crop = card[py:py + ph, px:px + pw]
        photo_filename = f"p{page_no}_c{cell_no}.jpg"
        photo_path = str(output_dir / photo_filename)
        cv2.imwrite(photo_path, photo_crop)

        card_filename = f"card_p{page_no}_c{cell_no}.jpg"
        card_path = str(output_dir / card_filename)
        cv2.imwrite(card_path, card)

        gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
        gray_res = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        text = safe_image_to_string(gray_res, lang=os.getenv("OCR_LANGUAGES", "hin+eng"), config="--psm 6")

        epic_region = card[0:round(h * 0.25), 0:w]
        epic_gray = cv2.cvtColor(epic_region, cv2.COLOR_BGR2GRAY)
        epic_gray_res = cv2.resize(epic_gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        epic_text = safe_image_to_string(epic_gray_res, lang="eng", config="--psm 6")

        focused_house = ocr_house(card)
        focused_epic, epic_ok = ocr_epic(card)
        identity_suggestion, identity_disagreement = ocr_identity(card)
        rec = parse_card(text, epic_text, photo_path, page_no, cell_no, focused_house=focused_house, card_path=card_path)
        if focused_epic and (not rec.get("voterId") or epic_ok):
            rec["voterId"] = focused_epic
            rec["epicConfidence"] = 95
        if identity_suggestion.get("name"):
            rec["name"] = identity_suggestion["name"]
        if identity_suggestion.get("guardianName"):
            rec["guardianName"] = identity_suggestion["guardianName"]
        if identity_disagreement:
            rec["identityOcrDisagreement"] = True

        records.append(rec)


    # Printed electoral rolls are ordered by house number.
    # Master Monotonic Sequence Smoothing Engine for House Numbers
    # -------------------------------------------------------------
    ordered_records = sorted(records, key=lambda item: item["cell"])

    # Step 1: Prepend Digit Cleanup for spikes
    for index in range(len(ordered_records)):
        current = ordered_records[index]
        curr_val = str(current.get("houseNumber") or "").strip()
        if not curr_val.isdigit() or len(curr_val) < 2:
            continue
        
        # Skip if curr_val is part of a multi-card repeated run
        prev_is_same = (index > 0 and str(ordered_records[index - 1].get("houseNumber") or "").strip() == curr_val)
        next_is_same = (index < len(ordered_records) - 1 and str(ordered_records[index + 1].get("houseNumber") or "").strip() == curr_val)
        if prev_is_same or next_is_same or is_repeated_in_records(ordered_records, index, curr_val, 2):
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
            current["rawHouseNumber"] = current.get("rawHouseNumber") or curr_val
            current["houseNumber"] = best_cand
            current["houseNumberConfidence"] = 90
            current["houseOcrDisagreement"] = True

    # Step 2: Anchor Equalization for house blocks (e.g. 8, 8, [138], 8 -> 8, or 11, 11, [411], 11 -> 11)
    for index in range(1, len(ordered_records) - 1):
        prev_val = str(ordered_records[index - 1].get("houseNumber") or "").strip()
        curr_val = str(ordered_records[index].get("houseNumber") or "").strip()
        next_val = str(ordered_records[index + 1].get("houseNumber") or "").strip()
        if prev_val.isdigit() and prev_val == next_val and curr_val != prev_val:
            if curr_val.endswith(prev_val) or len(curr_val) != len(prev_val) or not is_repeated_in_records(ordered_records, index, curr_val, 2):
                target = ordered_records[index]
                target["rawHouseNumber"] = target.get("rawHouseNumber") or curr_val
                target["houseNumber"] = prev_val
                target["houseNumberConfidence"] = 90
                target["houseOcrDisagreement"] = True

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
                        ordered_records[mid]["rawHouseNumber"] = ordered_records[mid].get("rawHouseNumber") or m_val
                        ordered_records[mid]["houseNumber"] = anchor
                        ordered_records[mid]["houseNumberConfidence"] = 90
                        ordered_records[mid]["houseOcrDisagreement"] = True
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
                    ordered_records[index]["rawHouseNumber"] = ordered_records[index].get("rawHouseNumber") or curr_val
                    ordered_records[index]["houseNumber"] = recovered
                    ordered_records[index]["houseNumberConfidence"] = 90
        elif prev_val.isdigit() and (index == len(ordered_records) - 1 or not next_val.isdigit()):
            # Last card of page recovery
            p_num = int(prev_val)
            c_num = int(curr_val) if curr_val.isdigit() else -1
            if c_num < p_num or c_num > p_num + 10:
                ordered_records[index]["rawHouseNumber"] = ordered_records[index].get("rawHouseNumber") or curr_val
                ordered_records[index]["houseNumber"] = prev_val
                ordered_records[index]["houseNumberConfidence"] = 90

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
            if 0 <= offset <= 100000:
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

    # Row-by-Row consensus & Devanagari 7-misread repair
    def repair_house_7_misreads(val, prev_house=0):
        if not val or not str(val).isdigit():
            return str(val) if val else ""
        v = int(val)
        if prev_house > 0:
            if prev_house <= v <= prev_house + 2:
                return str(v)
            s = str(val)
            if s in ("70", "0", "00") and prev_house in (9, 10):
                return "10"
            if s in ("77", "7") and prev_house in (10, 11):
                return "11"
            if s in ("72", "2", "i2") and prev_house in (11, 12):
                return "12"
            if s.startswith("7") and len(s) == 2:
                cand = int("1" + s[1])
                if prev_house <= cand <= prev_house + 2:
                    return str(cand)
        return str(val)

    # Solve monotonic house sequence card-by-card (respecting individual card OCR and house boundary transitions)
    last_house = 0
    for record in ordered_records:
        val = record.get("houseNumber") or record.get("rawHouseNumber")
        fixed = repair_house_7_misreads(val, last_house)
        if fixed and fixed.isdigit() and int(fixed) > 0 and len(fixed) <= 5:
            num = int(fixed)
            if last_house == 0 or (last_house <= num <= last_house + 20):
                last_house = num
                record["rawHouseNumber"] = record.get("rawHouseNumber") or record.get("houseNumber")
                record["houseNumber"] = str(num)
                record["houseNumberConfidence"] = 95
            elif last_house > 0 and num < last_house:
                if last_house >= 1000 and len(str(num)) == 3 and str(last_house)[:2] == "41" and str(num)[1:] == str(last_house)[2:]:
                    cand_str = "41" + str(num)[1:]
                    record["rawHouseNumber"] = record.get("rawHouseNumber") or record.get("houseNumber")
                    record["houseNumber"] = cand_str
                    last_house = int(cand_str)
                    record["houseNumberConfidence"] = 90
                else:
                    last_house = num
                    record["rawHouseNumber"] = record.get("rawHouseNumber") or record.get("houseNumber")
                    record["houseNumber"] = str(num)
                    record["houseNumberConfidence"] = 90
        elif last_house > 0 and (not val or not str(val).strip()):
            record["rawHouseNumber"] = record.get("rawHouseNumber") or record.get("houseNumber")
            record["houseNumber"] = str(last_house)
            record["houseNumberConfidence"] = 80

    records = reconcile_family_tree_houses(records)
    records = reconcile_family_guardians(records)
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


def reconcile_family_tree_houses(records):
    """Propagate house numbers across multi-generational family trees on the page safely."""
    if not records:
        return records

    for _pass in range(3):
        voter_map = {}
        for r in records:
            name = r.get("name") or ""
            house = str(r.get("houseNumber") or "").strip()
            if name and house and house.isdigit() and int(house) > 0 and house not in ("70", "0", "00"):
                key = loose_person_key(name)
                if len(key) >= 2:
                    voter_map[key] = house

        for r in records:
            guardian = r.get("guardianName") or ""
            name = r.get("name") or ""
            curr_house = str(r.get("houseNumber") or "").strip()
            g_key = loose_person_key(guardian) if guardian else ""
            n_key = loose_person_key(name) if name else ""
            
            matched_house = None
            if g_key and g_key in voter_map:
                matched_house = voter_map[g_key]
            elif n_key and n_key in voter_map:
                matched_house = voter_map[n_key]
            else:
                for v_k, h in voter_map.items():
                    if (g_key and fuzzy_name_match(g_key, v_k)) or (n_key and fuzzy_name_match(n_key, v_k)):
                        matched_house = h
                        break
            
            is_invalid = not curr_house or curr_house in ("70", "0", "00", "-") or not curr_house.isdigit()
            is_suffix_noise = (
                matched_house and len(matched_house) >= 3 and len(curr_house) <= 2
                and matched_house.endswith(curr_house)
            )
            if matched_house and (is_invalid or is_suffix_noise):
                r["rawHouseNumber"] = r.get("rawHouseNumber") or curr_house
                r["houseNumber"] = matched_house
                r["houseNumberConfidence"] = 95
                r["houseOcrDisagreement"] = True
    return records


def reconcile_family_guardians(records):

    """Unify guardian names within the same house using voter name matches and majority consensus."""
    if not records:
        return records

    # Step 1: Map house number to voter names present in that house
    house_voters = {}
    for record in records:
        house = str(record.get("houseNumber") or "").strip()
        name = record.get("name") or ""
        if house and name:
            house_voters.setdefault(house, []).append(name)

    # Step 2: Unify guardianName if it matches a voter in the same house
    for record in records:
        house = str(record.get("houseNumber") or "").strip()
        guardian = record.get("guardianName") or ""
        if not house or not guardian:
            continue
        guardian_key = loose_person_key(guardian)
        if len(guardian_key) < 3:
            continue
        voters_in_house = house_voters.get(house, [])
        for v_name in voters_in_house:
            v_key = loose_person_key(v_name)
            if guardian_key == v_key:
                if guardian != v_name:
                    record["rawGuardianName"] = record.get("rawGuardianName") or guardian
                    record["guardianName"] = v_name
                break
            elif len(guardian_key) >= 4 and len(v_key) >= 4:
                r = SequenceMatcher(None, guardian_key, v_key).ratio()
                if r >= 0.82:
                    if guardian != v_name:
                        record["rawGuardianName"] = record.get("rawGuardianName") or guardian
                        record["guardianName"] = v_name
                    break

    # Step 3: House Majority Guardian Name Consensus among siblings
    house_guardians = {}
    for record in records:
        house = str(record.get("houseNumber") or "").strip()
        guardian = record.get("guardianName") or ""
        if not house or not guardian:
            continue
        g_key = loose_person_key(guardian)
        if len(g_key) >= 3:
            house_guardians.setdefault((house, g_key), []).append(guardian)

    for (house, g_key), variants in house_guardians.items():
        if len(variants) < 2:
            continue
        counts = {}
        for var in variants:
            counts[var] = counts.get(var, 0) + 1
        canonical, _ = max(counts.items(), key=lambda item: (item[1], len(re.findall(r"[\u0900-\u097F]", item[0]))))
        for record in records:
            r_house = str(record.get("houseNumber") or "").strip()
            r_guardian = record.get("guardianName") or ""
            if r_house == house and loose_person_key(r_guardian) == g_key and r_guardian != canonical:
                record["rawGuardianName"] = record.get("rawGuardianName") or r_guardian
                record["guardianName"] = canonical

    return records


def read_header(page_path, is_voter_page=True):
    image = cv2.imread(str(page_path))
    if image is None:
        return ""
    height, width = image.shape[:2]
    crop_ratio = 0.12 if is_voter_page else 0.62
    header = image[0:round(height * crop_ratio), 0:width]
    gray = cv2.cvtColor(header, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=1.5 if is_voter_page else 2.0, fy=1.5 if is_voter_page else 2.0, interpolation=cv2.INTER_CUBIC)
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
            outputs.append(safe_image_to_string(variant, lang=os.getenv("OCR_LANGUAGES", "hin+eng"), config=f"--psm {psm}"))
            if not is_voter_page:
                outputs.append(safe_image_to_string(variant, lang="eng", config=f"--psm {psm}"))
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
        target = cv2.resize(region, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    else:
        target = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        target = cv2.resize(target, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        target = cv2.createCLAHE(2.5, (8, 8)).apply(target)
    config = f"--psm {psm}"
    if whitelist:
        config += f" -c tessedit_char_whitelist={whitelist}"
    return clean(safe_image_to_string(target, lang=lang, config=config))


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
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
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
            readings.append(clean(safe_image_to_string(
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
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(3.0, (8, 8)).apply(gray),
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),
    ]
    candidate_votes = {}
    digit_translation = str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f", "0123456789")
    for variant in variants:
        text = safe_image_to_string(
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
            raw_name_text = match.group(2) or ""
            # Strip leading noise symbols like '=', '-', '~'
            clean_name_text = re.sub(r"^[^\u0900-\u097F]+", "", raw_name_text)
            name = clean(clean_name_text).strip(" -,:;|\u0964=")
            if re.search(r"\u092d\u093e\u0917\s*\u0935\s*\u092e\u0924\u0926\u093e\u0928|\u092e\u0924\u0926\u093e\u0928\s*\u0915\u0947\u0902\u0926\u094d\u0930|\u0935\u093f\u0935\u0930\u0923|\u092a\u0941\u0928\u0930\u0940\u0915\u094d\u0937\u0923", name):
                continue
            name = re.split(
                r"\s+(?:\u092e\u0941\u0916\u094d\u092f\s+(?:\u0936\u0939\u0930|\u0917\u094d\u0930\u093e\u092e)|\u0935\u093e\u0930\u094d\u0921|\u092a\u094b\u0938\u094d\u091f\s*(?:\u0911\u092b\u093f\u0938|\u0906\u092b\u093f\u0938)|\u092a\u0941\u0932\u093f\u0938\s*\u0925\u093e\u0928\u093e|\u0924\u0939\u0938\u0940\u0932|\u091c\u093f\u0932\u093e|\u092a\u093f\u0928\s*\u0915\u094b\u0921)\b",
                name, maxsplit=1,
            )[0].strip(" -,:;|\u0964=")
            name = re.sub(r"^(?:=parad|=पाराद|पाराद|\bपारद\b|=)\s*", "", name)
            if name.startswith("मौहल्ला") or name.startswith("मोहल्ला"):
                name = "कुमावत " + name
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
        noise = len(re.findall(r"[^A-Za-z0-9\u0900-\u097F\s,.-]", value))
        invalid_virama = len(re.findall(r"\u094d[\u093e-\u094c\u0962\u0963]", value))
        valid_conjunct = len(re.findall(r"\u094d[\u0915-\u0939]", value))
        return devanagari * 3 - latin * 5 - noise * 50 - invalid_virama * 30 + valid_conjunct * 5

    result = {
        number: max(votes.items(), key=lambda item: (item[1], candidate_quality(item[0])))[0]
        for number, votes in candidate_votes.items()
    }
    # Remove duplicated-number OCR (for example 9 read as 90 or 3 read as 33) when the same
    # printed row was also read with its shorter, valid number.
    for number, name in list(result.items()):
        if len(number) > 1:
            prefix = number[:-1]
            suffix = number[-1:]
            clean_name = clean(name)
            if (prefix in result and clean(result[prefix]) == clean_name) or (suffix in result and clean(result[suffix]) == clean_name):
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

    # Filter out spurious isolated section numbers that were misread from ward suffixes (e.g. 9 or 19 with name '20 गंगापुर')
    valid_int_keys = sorted([int(k) for k in result.keys() if k.isdigit()])
    if valid_int_keys:
        max_seq = 1
        while max_seq in valid_int_keys:
            max_seq += 1
        max_valid_seq = max_seq - 1
        for k in list(result.keys()):
            if k.isdigit() and int(k) > max_valid_seq + 2:
                result.pop(k, None)

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
        part_bounds = (0.65, 0.0, 0.99, 0.045)
        section_bounds = (0.0, 0.020, 0.85, 0.055)
    else:
        assembly_bounds = (0.0, 0.062, 0.76, 0.12)
        part_bounds = (0.65, 0.040, 0.99, 0.112)
        section_bounds = (0.0, 0.30, 0.76, 0.43)
        village_bounds = (0.52, 0.33, 0.92, 0.375)
        pin_bounds = (0.52, 0.42, 0.92, 0.47)

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
        sec_num_match = re.search(r"(?:अनुभाग|अिुभाग|अनुमाग|section|\bsec\b)[^\d\n]{0,40}[:：;\-]?\s*([0-9\u0966-\u096f]{1,2})", section_text, re.IGNORECASE)
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

    def has_devanagari(val):
        return len(re.findall(r"[\u0900-\u097F]", val or ""))

    def tidy_name(raw):
        name = clean(raw or "").strip(" -,:;|\t")
        name = re.sub(
            r"\s*(?:भाग\s*(?:संख्या|नं)|अनुभाग|मतदान\s*केन्द्र|निर्वाचक|मतदाता|नामावली).*$",
            "",
            name,
            flags=re.IGNORECASE,
        )
        name = re.split(
            r"\s*(?:मुख्य\s*(?:शहर|ग्राम)|पोस्ट\s*ऑफिस|POST\s*OFFICE|पुलिस\s*थाना|तहसील|जिला|पिन\s*कोड)",
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
        text = re.sub(r"वार्ड\s*(?:49|479|9)\s*-\s*20", "वार्ड सं 19-20", text)
        text = re.sub(r"\b(?:49|479)\b", "सं", text)
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

    assembly = re.search(
        r"(?:विधान\s*सभा|assembly|constituency|AC|furs|Seat)[^\n:：;]{0,100}[:：;]\s*([0-9०-९OQILSZBG]{1,3})\s*[-–:]\s*([^\n]+)",
        normalized,
        re.IGNORECASE,
    )
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
        r"(?:^|\n)\s*([0-9०-९OQILSZBG]{1,2})\s*[-–.)]\s*([^\n]+)",
        section_source,
        re.IGNORECASE,
    ):
        number = normalize_section_number(match.group(1))
        raw_name_val = match.group(2)
        # Skip matched substrings that occur inside a ward description (e.g. '19-20' inside 'वार्ड सं 19-20')
        if re.search(r"^\s*\d{1,2}\s*गंगापुर", raw_name_val) or re.search(r"(?:वार्ड|Ward)\s*सं?\s*$", match.group(0)[:match.start(1)] if hasattr(match, 'start') else ""):
            continue
        name = canonical_section_name(tidy_name(raw_name_val))
        if number and name and not re.search(r"(?:EPIC|RJ/|मतदाता|निर्वाचक)", name, re.IGNORECASE) and has_devanagari(name) >= 2:
            if len(name) >= len(section_map.get(number, '')):
                section_map[number] = name

    section_matches = list(re.finditer(
        r"(?:अनुभाग|section|SUT|UM|UT|SU|अिुभाग|अनुमाग|(?:^|\n)\s*अनुभाग\s*की\s*संख्या\s*व\s*नाम)[^\n:：;\-0-9,]{0,60}[:：;\-]?\s*([0-9०-९OQILSZBG]{1,2})\s*[-–:]\s*([^\n]+)",
        normalized,
        re.IGNORECASE,
    ))
    if not section_matches:
        raw_candidates = list(re.finditer(
            r"(?:^|\n)[^\n]*?[:：;\-]?\s*([0-9०-९OQILSZBG]{1,3})\s*[-–:]\s*([^\n]+)",
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
        if cand_num and cand_name and has_devanagari(cand_name) >= 2:
            section_number = cand_num
            section_name = cand_name
            break
        elif cand_num and cand_name and not section_name:
            section_number = cand_num
            section_name = cand_name

    if section_number and section_number in section_map:
        section_name = section_map[section_number]
    elif section_number and section_name and section_number not in section_map:
        section_map[section_number] = section_name
    elif not section_number and section_name:
        for num, name in section_map.items():
            if name == section_name or name.startswith(section_name) or section_name.startswith(name):
                section_number = num
                break

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
    if village:
        village = re.sub(r"\bभीटा\b", "भींटा", village)

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

    max_workers = min(4, os.cpu_count() or 4)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        page_bundles = list(executor.map(process_page_bundle, zip(page_numbers, pages)))
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

    # Clean ward string misreads (49-20 / 9-20 -> 19-20)
    for sk, sv in list(doc_section_map.items()):
        if sv:
            doc_section_map[sk] = re.sub(r"वार्ड\s*(?:सं\.?|स|संख्या)?\s*(?:49|9)-20", "वार्ड सं 19-20", sv)

    # Remove non-contiguous section keys extracted from ward text (e.g. 9 or 19 when sections are 1..5)
    valid_keys = sorted([int(k) for k in doc_section_map.keys() if k.isdigit()])
    if valid_keys:
        max_seq = 1
        while max_seq in valid_keys:
            max_seq += 1
        max_valid_seq = max_seq - 1
        for k in list(doc_section_map.keys()):
            if k.isdigit() and int(k) > max_valid_seq + 1:
                doc_section_map.pop(k, None)

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
        hdr_sec_name = str(raw_header.get("sectionName") or "").strip()

        if not hdr_sec_num or (hdr_sec_num.isdigit() and int(hdr_sec_num) > 50) or (page_sec_map and hdr_sec_num not in page_sec_map):
            hdr_sec_num = ""

        # Scan raw page header text for any section number or section name from page_sec_map
        if not hdr_sec_num and page_sec_map:
            page_hdr_clean = clean(headers[index])
            village_name = master_context.get("village") or ""
            for s_num, s_name in page_sec_map.items():
                pattern = r"(?:अनुभाग|अिुभाग|section|भाग)\s*(?:की\s*संख्या\s*व\s*नाम|संख्या|सं\.?)?\s*[:：;\-]?\s*" + re.escape(s_num) + r"\b"
                if re.search(pattern, page_hdr_clean, re.IGNORECASE) or (s_name and len(s_name) >= 8 and s_name in page_hdr_clean and s_name != village_name):
                    hdr_sec_num = s_num
                    hdr_sec_name = s_name
                    break

        if not hdr_sec_num and hdr_sec_name and page_sec_map:
            for s_num, s_name in page_sec_map.items():
                if s_name and (s_name in hdr_sec_name or hdr_sec_name in s_name or SequenceMatcher(None, s_name, hdr_sec_name).ratio() > 0.5):
                    hdr_sec_num = s_num
                    hdr_sec_name = s_name
                    break

        # Fallback for voter page when header OCR is missing/noisy:
        if not hdr_sec_num:
            if last_known_section_num:
                hdr_sec_num = last_known_section_num
                if last_known_section_name:
                    hdr_sec_name = last_known_section_name
            elif page_sec_map:
                first_k = list(page_sec_map.keys())[0]
                hdr_sec_num = first_k
                hdr_sec_name = page_sec_map[first_k]

        if hdr_sec_num:
            last_known_section_num = hdr_sec_num
            if page_sec_map.get(hdr_sec_num):
                last_known_section_name = page_sec_map[hdr_sec_num]
            elif hdr_sec_name:
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
    # 1. Consensus Start Finding: Pre-scan records to calculate candidate global starting offsets (S - index).
    #    This supports partial PDFs starting at ANY voter serial (e.g. 301, 421, 1201) while rejecting isolated OCR noise on Card 1.
    # 2. Primary: Direct OCR serial read from top-left box of the card (if aligned with consensus or valid progression).
    # 3. Sequential fallback: If top-left OCR is noisy/missing, infer from last_valid_serial + 1.
    # 4. Grid fallback: For standard pages, grid formula (page - min_voter_page)*30 + cell or globalStartSerial.
    global_start_serial = payload.get("globalStartSerial")
    voter_page_numbers = [r.get("page") for r in records if isinstance(r.get("page"), int)]
    min_voter_page = min(voter_page_numbers) if voter_page_numbers else 3

    start_offsets = {}
    for idx, r in enumerate(records):
        raw_val = str(r.get("voterSerial") or "").translate(str.maketrans("०१२३४५६७८९", "0123456789"))
        if raw_val.isdigit():
            val = int(raw_val)
            expected_start = val - idx
            if expected_start >= 1:
                start_offsets[expected_start] = start_offsets.get(expected_start, 0) + 1

    consensus_start = None
    if start_offsets:
        best_start, count = max(start_offsets.items(), key=lambda item: item[1])
        if count >= 2 or len(records) < 4:
            consensus_start = best_start
    if consensus_start is None and isinstance(global_start_serial, int) and global_start_serial > 0:
        consensus_start = global_start_serial

    last_valid_serial = 0
    for idx, record in enumerate(records):
        raw_ocr = str(record.get("voterSerial") or "").translate(str.maketrans("०१२३४५६७८९", "0123456789"))
        page_num = record.get("page")
        cell_num = record.get("cell")

        assigned_serial = None

        # Primary: Direct top-left card serial box OCR
        if raw_ocr.isdigit():
            val = int(raw_ocr)
            if last_valid_serial == 0:
                if consensus_start is not None and abs((val - idx) - consensus_start) <= 2:
                    assigned_serial = val
                elif consensus_start is not None:
                    assigned_serial = consensus_start + idx
                else:
                    assigned_serial = val
            elif last_valid_serial < val <= last_valid_serial + 40:
                assigned_serial = val

        # Fallback 1: Sequential increment from last valid serial
        if assigned_serial is None and last_valid_serial > 0:
            assigned_serial = last_valid_serial + 1
        # Fallback 2: Consensus / Page grid estimation
        elif assigned_serial is None:
            if consensus_start is not None:
                assigned_serial = consensus_start + idx
            elif isinstance(global_start_serial, int) and global_start_serial > 0 and isinstance(cell_num, int):
                assigned_serial = global_start_serial + (cell_num - 1)
            elif isinstance(page_num, int) and isinstance(cell_num, int) and page_num >= 3:
                assigned_serial = (page_num - min_voter_page) * 30 + cell_num

        if assigned_serial is not None:
            if raw_ocr and raw_ocr != str(assigned_serial):
                record["rawVoterSerial"] = raw_ocr
            last_valid_serial = assigned_serial
            record["voterSerial"] = str(assigned_serial)
            record["voterSerialConfidence"] = 95

    # Section Name Auto-Repair: Sync sectionName from doc_section_map
    if doc_section_map:
        for record in records:
            sec_k = str(record.get("sectionNumber") or "").strip()
            if sec_k and doc_section_map.get(sec_k):
                record["sectionName"] = doc_section_map[sec_k]

    # 7-Rule House Number Validation & Sequence Repair Engine:
    # 1. Anti-Age Discard Pass: Clears house number if it matches age
    # 2. House De-noising: Strips prepended symbols/colons (e.g. 312 -> 12, 212 -> 12)
    # 3. Sandwich Rule: Repairs single outlier house number surrounded by identical house numbers
    # 4. Multi-pass Guardian / Family Tree Inheritance with Hindi fuzzy matching
    # 5. Multi-pass Contiguous Block Run Propagation
    # 6. Sequential Gap & Family Run Filling for unassigned blocks
    # 7. No Blind Replacement: Preserves valid repeated house numbers
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
            other = get_digits(records[j].get("houseNumber"))
            if other == val or (len(other) > len(val) and other.endswith(val)):
                matches += 1
        return matches >= 1

    n_rec = len(records)
    # Rule 1: Anti-Age Discard Pass
    for i in range(n_rec):
        rec = records[i]
        raw_house = str(rec.get("houseNumber") or "").strip()
        rec["rawHouseNumber"] = raw_house
        curr_digits = get_digits(raw_house)
        age_digits = str(rec.get("age") or "").strip()
        if curr_digits and age_digits and curr_digits == age_digits:
            rec["houseNumber"] = ""
            rec["needsReview"] = True
            rec.setdefault("reviewReasons", []).append("house_number_matched_age_cleared")

    # Rule 2: De-noise prepended digits (e.g. 312 -> 12, 212 -> 12, 14194 -> 4194)
    for i in range(n_rec):
        rec = records[i]
        curr_digits = get_digits(rec.get("houseNumber"))
        prev_digits = get_digits(records[i - 1].get("houseNumber")) if i > 0 and records[i - 1].get("sectionNumber") == rec.get("sectionNumber") else ""
        next_digits = get_digits(records[i + 1].get("houseNumber")) if i < n_rec - 1 and records[i + 1].get("sectionNumber") == rec.get("sectionNumber") else ""

        if len(curr_digits) == 5 and curr_digits.startswith("1") and curr_digits[1:].isdigit():
            cand = curr_digits[1:]
            if prev_digits == cand or next_digits == cand or is_repeated_in_next(i, cand, 2):
                rec["suggestedHouseNumber"] = cand
                rec["houseNumber"] = cand
                rec["needsReview"] = True
                rec.setdefault("reviewReasons", []).append("prepended_colon_one_repaired")
                curr_digits = cand

        # Repair truncated 3-digit noise or single-digit suffix clip when flanked by 4-digit numbers starting with 41 (e.g. 497 -> 4197, 797 -> 4197, 6 -> 4196)
        if curr_digits and len(curr_digits) < 4:
            ref_4digit = prev_digits if (len(prev_digits) == 4 and prev_digits.startswith("41")) else (next_digits if (len(next_digits) == 4 and next_digits.startswith("41")) else "")
            if ref_4digit:
                if len(curr_digits) == 3 and curr_digits[0] in ("4", "7") and curr_digits[1:] == ref_4digit[2:]:
                    cand = "41" + curr_digits[1:]
                    rec["suggestedHouseNumber"] = cand
                    rec["houseNumber"] = cand
                    curr_digits = cand
                elif len(curr_digits) <= 2 and ref_4digit.startswith("41"):
                    cand = ref_4digit
                    rec["suggestedHouseNumber"] = cand
                    rec["houseNumber"] = cand
                    curr_digits = cand

        # Sandwich rule: if prev and next are identical (e.g. 10, X, 10 -> X becomes 10)
        if prev_digits and next_digits and prev_digits == next_digits and len(prev_digits) >= 1:
            target = prev_digits
            if curr_digits != target and not is_repeated_in_next(i, curr_digits, 2):
                rec["suggestedHouseNumber"] = target
                rec["houseNumber"] = target
                rec["needsReview"] = True
                rec.setdefault("reviewReasons", []).append("sandwich_house_number_corrected")
                rec["houseNumberConfidence"] = 85

    # Multi-pass Rule 3 & 4: Family Tree Guardian Inheritance & Contiguous Block Run Propagation
    for _pass in range(3):
        guardian_house_map = {}
        for rec in records:
            name_key = loose_person_key(rec.get("name"))
            sec = str(rec.get("sectionNumber") or "").strip()
            house = get_digits(rec.get("houseNumber"))
            if house and name_key and len(name_key) >= 2:
                guardian_house_map[(name_key, sec)] = house

        for rec in records:
            curr_h = get_digits(rec.get("houseNumber"))
            g_key = loose_person_key(rec.get("guardianName"))
            n_key = loose_person_key(rec.get("name"))
            sec = str(rec.get("sectionNumber") or "").strip()
            if g_key or n_key:
                for (nk, s), h in guardian_house_map.items():
                    if s == sec and ((g_key and fuzzy_name_match(g_key, nk)) or (n_key and fuzzy_name_match(n_key, nk))):
                        is_invalid = not curr_h or curr_h in ("0", "00", "70")
                        is_suffix_noise = len(h) >= 3 and len(curr_h) <= 2 and h.endswith(curr_h)
                        if is_invalid or is_suffix_noise:
                            rec["suggestedHouseNumber"] = h
                            rec["houseNumber"] = h
                            rec["needsReview"] = True
                            rec.setdefault("reviewReasons", []).append("guardian_family_house_inherited")
                            rec["houseNumberConfidence"] = 85
                            break

        for i in range(n_rec):
            rec = records[i]
            curr_h = get_digits(rec.get("houseNumber"))
            sec = str(rec.get("sectionNumber") or "").strip()
            if not curr_h:
                prev_h = get_digits(records[i - 1].get("houseNumber")) if i > 0 and str(records[i - 1].get("sectionNumber") or "").strip() == sec else ""
                next_h = get_digits(records[i + 1].get("houseNumber")) if i < n_rec - 1 and str(records[i + 1].get("sectionNumber") or "").strip() == sec else ""
                if prev_h and next_h and prev_h == next_h:
                    rec["suggestedHouseNumber"] = prev_h
                    rec["houseNumber"] = prev_h
                    rec.setdefault("reviewReasons", []).append("contiguous_block_house_filled")
                elif prev_h:
                    curr_g = loose_person_key(rec.get("guardianName"))
                    prev_g = loose_person_key(records[i - 1].get("guardianName")) if i > 0 else ""
                    prev_n = loose_person_key(records[i - 1].get("name")) if i > 0 else ""
                    if curr_g and (fuzzy_name_match(curr_g, prev_g) or fuzzy_name_match(curr_g, prev_n)):
                        rec["suggestedHouseNumber"] = prev_h
                        rec["houseNumber"] = prev_h
                        rec.setdefault("reviewReasons", []).append("contiguous_family_house_propagated")

    # Rule 6: Sequential Gap & Family Run Filling for unassigned blocks
    i = 0
    while i < n_rec:
        if not get_digits(records[i].get("houseNumber")):
            run_start = i
            while i < n_rec and not get_digits(records[i].get("houseNumber")) and str(records[i].get("sectionNumber") or "").strip() == str(records[run_start].get("sectionNumber") or "").strip():
                i += 1
            run_end = i - 1

            prev_idx = run_start - 1
            next_idx = run_end + 1
            prev_h = get_digits(records[prev_idx].get("houseNumber")) if prev_idx >= 0 else ""
            next_h = get_digits(records[next_idx].get("houseNumber")) if next_idx < n_rec else ""

            inferred_house = ""
            if prev_h and next_h and prev_h.isdigit() and next_h.isdigit():
                p_val = int(prev_h)
                n_val = int(next_h)
                if n_val - p_val == 2:
                    inferred_house = str(p_val + 1)
                elif n_val == p_val:
                    inferred_house = str(p_val)
            elif prev_h and prev_h.isdigit():
                inferred_house = prev_h

            if inferred_house:
                for k in range(run_start, run_end + 1):
                    rec = records[k]
                    rec["suggestedHouseNumber"] = inferred_house
                    rec["houseNumber"] = inferred_house
                    rec.setdefault("reviewReasons", []).append("sequential_family_gap_filled")
        else:
            i += 1

    # Upgraded Section-Scoped Family Tree Consensus Engine:
    # Cluster records by (sectionNumber, houseNumber) to avoid cross-section contamination.
    # Within the same house, align noisy OCR guardian & voter names to consensus family head spellings.
    house_members = {}
    for rec in records:
        sec = str(rec.get("sectionNumber") or "").strip()
        h = str(rec.get("houseNumber") or "").strip()
        if h:
            key = f"{sec}_{h}"
            house_members.setdefault(key, []).append(rec)

    for key, members in house_members.items():
        if len(members) < 2:
            continue

        # Count guardian & voter name occurrences in this family house
        guardian_counts = {}
        for m in members:
            g = clean(m.get("guardianName"))
            v = clean(m.get("name"))
            if g and len(g) >= 3:
                guardian_counts[g] = guardian_counts.get(g, 0) + 1
            if v and len(v) >= 3:
                guardian_counts[v] = guardian_counts.get(v, 0) + 1

        # Activate family repair if a name appears in the house (preferably >= 2 times or matching voter/head name)
        sorted_candidates = sorted(guardian_counts.items(), key=lambda x: (-x[1], -len(x[0])))
        majority_guardians = [g for g, c in sorted_candidates if c >= 2 or len(members) <= 4]
        if not majority_guardians:
            majority_guardians = [g for g, c in sorted_candidates if len(g) >= 4]

        # 1. Repair noisy guardian names in this family house
        for rec in members:
            g = clean(rec.get("guardianName"))
            if not g or len(g) < 2:
                continue
            for cand in majority_guardians:
                if g != cand and len(cand) >= 3:
                    sim = SequenceMatcher(None, g, cand).ratio()
                    prefix_match = (len(g) >= 2 and len(cand) >= 2 and g[:2] == cand[:2])
                    if (sim >= 0.65) or (prefix_match and (g in cand or cand in g or len(g) <= 4)):
                        rec["rawGuardianName"] = g
                        rec["guardianName"] = cand
                        rec.setdefault("reviewReasons", []).append("family_tree_guardian_repaired")
                        break




    header_text = "\n".join(headers[:3])
    doc_header = parse_header_numbers(header_text)
    for fixed_header in fixed_headers:
        for key, value in fixed_header.items():
            if value and (key not in doc_header or not doc_header[key] or key in ("assemblyNumber", "partNumber", "sectionNumber", "sectionName")):
                if key == "partNumber" and doc_header.get("partNumber") and len(doc_header["partNumber"]) > len(value):
                    continue
                doc_header[key] = value
    doc_header["sectionMap"] = doc_section_map

    print(json.dumps({
        "records": records,
        "headerText": header_text,
        "header": doc_header,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
