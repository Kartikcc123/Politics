import json
import gc
import os
import re
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
import unicodedata
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from pathlib import Path

import cv2
import numpy as np
import pytesseract


def auto_deskew(image):
    """
    Detect image skew angle via text contours / minAreaRect.
    Only rotates if skew angle theta is bounded between 0.4 deg and 5.0 deg.
    Returns original image if theta < 0.4 deg (straight page) or > 5.0 deg (unreliable).
    """
    if image is None or getattr(image, "size", 0) == 0:
        return image
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        coords = np.column_stack(np.where(thresh > 0))
        if coords.shape[0] < 100:
            return image
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        abs_angle = abs(angle)
        if 0.4 <= abs_angle <= 5.0:
            h, w = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            return rotated
    except Exception as err:
        sys.stderr.write(f"Warning: auto_deskew skipped due to error: {err}\n")
    return image

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

try:
    if sys.stdin and hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")
    if sys.stdout and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if sys.stderr and hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


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
    # Fix broken halant conjuncts like 'सन् ्वरा' -> 'सन्वरा'
    text = re.sub(r"\s*([\u094d])\s*", r"\1", text)
    text = clean(text).strip(" .-|:")
    if not text:
        return ""
    # Remove leading/trailing OCR noise tokens in a loop until clean
    noise_pattern = r"(?:\s+[.]?\s*)(?:का|की|के|न|अक|नो|यु|है|ह|हे|ः|छु|ब्|ब्र|क्र|अक|।|\||रे|सी|कः|बॉ|छः|जा|छ्क्र|हु|पे|जमा|खत|ऋण|कक|अर|कोड|करार|जज|मय|कं|कि|थे|छआ|चय|दय|द|स|क|ख|ग|घ|च|ज|ट|त|प|म|य|र|ल|व)$"
    while len(text.split()) > 1:
        cleaned_t = re.sub(noise_pattern, "", text)
        cleaned_t = re.sub(r"\s+\b(?:रे|सी|कः|बॉ|छः|जा|छ्क्र)\b$", "", cleaned_t)
        if cleaned_t == text:
            break
        text = clean(cleaned_t).strip(" .-|:")

    # Devanagari OCR Spelling Fixes (common Tesseract misreads)
    text = re.sub(r"(?:^|\s)स्रुखी(?=$|\s)", " सुखी ", text)
    text = re.sub(r"(?:^|\s)हंन््?जा(?=$|\s)", " हंजा ", text)
    text = re.sub(r"(?:^|\s)डालच्नद(?=$|\s)", " डालचन्द ", text)
    text = re.sub(r"(?:^|\s)सन््वरा(?=$|\s)", " संवरा ", text)
    text = re.sub(r"(?:^|\s)मॉगी(?=$|\s)", " मांगी ", text)
    text = re.sub(r"(?:^|\s)भागदती(?=$|\s)", " भागवती ", text)
    text = re.sub(r"(?:^|\s)नेनुराम(?=$|\s)", " नैनुराम ", text)
    text = re.sub(r"(?<=\u0900-\u097F)चित्\b|(?<=\u0900-\u097F)चन्त\b|(?<=\u0900-\u097F)चन्च\b|(?<=\u0900-\u097F)चनद\b|(?<=\u0900-\u097F)च्द\b", "चन्द", text)
    text = re.sub(r"(?:^|\s)(?:दाल्चन्द|दालचन्द)(?=$|\s)", " डालचन्द ", text)
    text = re.sub(r"(?:^|\s)दाल्(?=$|\s)", " डाल ", text)
    text = re.sub(r"(?:^|\s)(?:सन्वरा|सन्देरा)(?=$|\s)", " संवरा ", text)
    text = re.sub(r"(?:^|\s)(?:सुगणी|सुगी)(?=$|\s)", " सुखी ", text)
    text = re.sub(r"(?:^|\s)बब्रा(?=$|\s)", " बन्ना ", text)
    text = re.sub(r"(?:^|\s)बब्रालाल(?=$|\s)", " बन्नालाल ", text)
    text = re.sub(r"(?:^|\s)(?:लाटुलाल|लाडुलाल|लादुलाल)(?=$|\s)", " लादूलाल ", text)
    text = re.sub(r"(?:^|\s)(?:लाटु|लाडु|लादु)(?=$|\s)", " लादू ", text)
    text = re.sub(r"(?:^|\s)डालु(?=$|\s)", " डालू ", text)
    text = re.sub(r"(?<=\u0900-\u097F)ताल\b", "लाल", text)
    text = re.sub(r"\bअरजुर्नलाल\b|\bअरजुनलाल\b|\bअजुर्नलाल\b|\bअजपुर्नताल\b|\bअजपुर्नलाल\b|\bअर्जुुनलाल\b", "अर्जुनलाल", text)
    text = re.sub(r"(?<=\u0900-\u097F)ताम\b", "राम", text)
    text = re.sub(r"\bकुमारr\b|\bकुभार\b|\bकुसार\b|\bकुनार\b|\bकुभारr\b", "कुमार", text)
    text = re.sub(r"\bदेबी\b", "देवी", text)
    text = re.sub(r"\bगोर्धघन\b|\bगोवर्धण\b|\bगोर्चन\b", "गोर्धन", text)
    text = re.sub(r"(?<=\u0900-\u097F)चित्\b|(?<=\u0900-\u097F)चन्त\b|(?<=\u0900-\u097F)चन्च\b", "चन्द", text)
    text = re.sub(r"\bप्रिाप\b|\bप्रिा\b|\bप्रताश\b", "प्रताप", text)
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
    HINDI_NAME_DICT.update(["नारायण", "सांवरी", "सांयरी", "गोर्धन", "गोवर्धन", "डूगां", "डूंगर", "माधू"])
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
            # Protect gender matras: never replace if ending in 'ी' or 'ा' differs
            if clean_tok.endswith("ी") != candidate.endswith("ी"):
                continue
            if clean_tok.endswith("ा") != candidate.endswith("ा"):
                continue
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
    # Map Devanagari digits ०-९ to ASCII digits 0-9
    normalized = (value or "").translate(
        str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f", "0123456789")
    )
    # Strip noise characters around digits and join split digits (e.g. '376 1' -> '3761')
    normalized = re.sub(r"(?<=\d)\s+(?=\d)", "", normalized)
    
    # Extract numeric house number part + optional Devanagari/Hindi letter suffix (e.g. "2145 क" or "2145-A" or "4201")
    raw_str = re.sub(r"^(?:[:\|/\\!\-\.\[\]\(\)]+\s*)+", "", normalized.strip())
    match = re.search(r"(?<!\d)(\d{1,5}(?:[/\-]\d{1,5})?)(?:\s*([A-Za-z\u0900-\u097F]))?(?!\d)", raw_str)
    if not match:
        return ""
    val = match.group(1)
    raw_suffix = match.group(2) if match.group(2) else ""
    # Filter out single-character Hindi/English noise letters (e.g., 'ह', 'x', 'r') attached to house numbers
    suffix = raw_suffix if (raw_suffix and (raw_suffix in ("क", "ख", "ग", "घ", "A", "B", "C", "D", "E", "F", "K"))) else ""

    # If hyphenated with identical numbers (e.g., 3-3 -> 3, 56-56 -> 56)
    if "-" in val or "/" in val:
        parts = re.split(r"[/\-]", val)
        if len(parts) == 2 and parts[0] == parts[1]:
            val = parts[0]

    return f"{val} {suffix}".strip() if suffix else val



def get_digits(value):
    """Return the ASCII digits in an OCR value, including Devanagari digits."""
    normalized = str(value or "").translate(
        str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f", "0123456789")
    )
    return "".join(re.findall(r"\d", normalized))

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


def ocr_house(card, card_full_text=None):
    """Read the full house-number row and parse the value using bilingual multi-scale OCR."""
    height, width = card.shape[:2]
    
    house_label_pattern = (
        r"(?:"
        r"(?:गृह|गह|गुह|ग्ह|गृ|गृ\.|गृ०|मकान|House|H\.?No|Te|ye|Hea|Hen|Ge)\s*(?:संख्या|सख्या|सं\.?|सं०|नं\.?|क्र\.?|Number|No\.?)?"
        r"|(?:संख्या|सख्या|सं\.?|सं०|नं\.?)\s*"
        r")\s*[:：;\-।|!.]?\s*([^\n]+)"
    )

    c_full = ""
    if card_full_text:
        house_line_full = field(card_full_text, house_label_pattern)
        c_full = clean_house(house_line_full)

    # Crop house number ROI (y: 0.48 to 0.78, x: 0.00 to 0.75)
    # Widen to 0.75 so 4-digit house numbers (e.g. 3761) and trailing 1/pipes are not sliced off
    region = card[
        round(height * 0.48):round(height * 0.78),
        0:round(width * 0.75),
    ]
    if region.size == 0:
        return c_full
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    
    # 1. Primary English Digit Detection:
    # Check Otsu binary threshold first (crisp digits), followed by grayscale.
    # Eliminates Devanagari font confusion (such as Tesseract misreading thin '01' as '04' or '1' as '7')
    eng_candidates = []
    try:
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        for img_variant in [thresh, gray]:
            res_eng = cv2.resize(img_variant, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
            data = pytesseract.image_to_data(res_eng, lang="eng", config="--psm 6", output_type=pytesseract.Output.DICT)
            h_box, w_box = res_eng.shape[:2]
            for i in range(len(data['text'])):
                txt = data['text'][i].strip()
                if not txt:
                    continue
                top = data['top'][i]
                left = data['left'][i]
                # House row is in upper half of region (above Age row), right of Hindi label
                if top < h_box * 0.55 and left >= w_box * 0.18:
                    c = clean_house(txt)
                    if c and any(ch.isdigit() for ch in c):
                        eng_candidates.append(c)
            if eng_candidates:
                break
    except Exception:
        pass

    # 2. Devanagari line extraction & suffix detection:
    if eng_candidates:
        primary_eng = eng_candidates[0]
        # Fast single pass for Devanagari suffix (e.g. 'क', 'ख')
        gray_res = cv2.resize(gray, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)
        clahe_img = cv2.createCLAHE(2.5, (8, 8)).apply(gray_res)
        t_hin = safe_image_to_string(clahe_img, lang="hin+eng", config="--psm 6")
        house_line = field(t_hin, house_label_pattern)
        if house_line:
            suffix_match = re.search(r"[\u0900-\u097F]+$", house_line)
            if suffix_match and suffix_match.group(0) in ("क", "ख", "ग", "घ"):
                primary_eng = f"{primary_eng} {suffix_match.group(0)}"
        return primary_eng

    # If no English bounding box digits, run focused Devanagari passes (CLAHE & Otsu)
    c1_values = []
    gray_res = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    variants = [
        cv2.createCLAHE(2.5, (8, 8)).apply(gray_res),
        cv2.threshold(gray_res, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
    ]
    for variant in variants:
        t_hin = safe_image_to_string(variant, lang="hin+eng", config="--psm 6")
        house_line = field(t_hin, house_label_pattern)
        c1 = clean_house(house_line)
        if c1:
            c1_values.append(c1)

    if c1_values:
        counts = {v: c1_values.count(v) for v in set(c1_values)}
        winner, _ = max(counts.items(), key=lambda x: (x[1], len(re.findall(r"\d", x[0]))))
        for v in counts.keys():
            v_digits = "".join(re.findall(r"\d", v))
            winner_digits = "".join(re.findall(r"\d", winner))
            if len(v_digits) > len(winner_digits) and (v_digits.startswith(winner_digits) or v_digits.endswith(winner_digits)):
                winner = v
        if winner:
            return winner

    if c_full:
        return c_full

    # 3. Targeted fallback: strictly read the right half of the house ROI (after label) for digits
    sub_region = region[:, round(region.shape[1] * 0.18):]
    if sub_region.size > 0:
        sub_gray = cv2.cvtColor(sub_region, cv2.COLOR_BGR2GRAY)
        sub_res = cv2.resize(sub_gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        sub_thresh = cv2.threshold(sub_res, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        for v in (sub_res, sub_thresh):
            for psm in (7, 6):
                txt = safe_image_to_string(v, lang="eng", config=f"--psm {psm} -c tessedit_char_whitelist=0123456789/-")
                cand = clean_house(txt)
                if cand and any(ch.isdigit() for ch in cand) and len(cand) >= 1:
                    return cand

    return c_full


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


def ocr_serial(card, card_full_text=""):
    """Dedicated pass for serial number box at top-left of voter card."""
    height, width = card.shape[:2]
    candidates = []

    # 1. Fast Primary Path: Direct serial box crop (x: 0.02..0.38, y: 0.01..0.20)
    s_region = card[round(height * 0.01):round(height * 0.20), round(width * 0.02):round(width * 0.38)]
    if s_region.size > 0:
        s_gray = cv2.cvtColor(s_region, cv2.COLOR_BGR2GRAY)
        s_res = cv2.resize(s_gray, None, fx=3.5, fy=3.5, interpolation=cv2.INTER_CUBIC)
        s_pad = cv2.copyMakeBorder(s_res, 15, 15, 15, 15, cv2.BORDER_CONSTANT, value=255)
        s_clahe = cv2.createCLAHE(3.0, (8, 8)).apply(s_pad)
        for psm in (6, 7):
            txt = safe_image_to_string(s_clahe, lang="eng", config=f"--psm {psm} -c tessedit_char_whitelist=0123456789").strip()
            if txt and txt.isdigit() and 1 <= int(txt) <= 99999:
                candidates.append(txt)
        if len(candidates) >= 2 and candidates[0] == candidates[1]:
            return candidates[0], False

    # 2. Dedicated serial box region (x: 0.0..0.42, y: 0.0..0.22)
    region = card[0:round(height * 0.22), 0:round(width * 0.42)]
    if region.size > 0:
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        thresh_inv = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)[1]
        contours, _ = cv2.findContours(thresh_inv, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        box_contours = []
        for c in contours:
            bx, by, bw, bh = cv2.boundingRect(c)
            if bw > region.shape[1] * 0.25 and bh > region.shape[0] * 0.25:
                box_contours.append((bw * bh, bx, by, bw, bh))
        box_contours.sort()

        for _, bx, by, bw, bh in box_contours:
            pad_x = max(2, round(bw * 0.02))
            pad_y = max(2, round(bh * 0.04))
            crops = [
                region[by + 2 : by + bh - 2, max(0, bx - 1) : min(region.shape[1], bx + bw + 1)],
                region[by + pad_y : by + bh - pad_y, bx + pad_x : bx + bw - pad_x],
            ]
            if bw > 25:
                crops.append(region[by + pad_y : by + bh - pad_y, bx + round(bw * 0.50) : bx + bw - pad_x])
            for inner in crops:
                if inner.size > 0:
                    padded = cv2.copyMakeBorder(inner, 15, 15, 20, 20, cv2.BORDER_CONSTANT, value=[255, 255, 255])
                    p_gray = cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY) if len(padded.shape) == 3 else padded
                    res = cv2.resize(p_gray, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
                    clahe = cv2.createCLAHE(3.0, (8, 8)).apply(res)
                    thresh = cv2.threshold(res, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
                    for var in (clahe, res, thresh):
                        for psm in (7, 6):
                            try:
                                txt = safe_image_to_string(
                                    var,
                                    lang="eng",
                                    config=f"--psm {psm} -c tessedit_char_whitelist=0123456789"
                                ).strip()
                                if txt and txt.isdigit() and 1 <= int(txt) <= 99999:
                                    candidates.append(txt)
                                    if candidates.count(txt) >= 3:
                                        break
                            except Exception:
                                pass
                        if any(candidates.count(c) >= 3 for c in set(candidates)):
                            break
                    if any(candidates.count(c) >= 3 for c in set(candidates)):
                        break
            if any(candidates.count(c) >= 3 for c in set(candidates)):
                break

    # 2. Fallback to full-text ONLY if dedicated box crops found no candidates
    if not candidates and card_full_text:
        m_top = re.search(r"(?:^|\n)\s*[#№\|\[\(!Ilसंक्रN\.\s\-]*\s*(\d{1,5})\s*[|\]\)]?\s*(?:[A-Z]{3}\d{7}|RJ/|[A-Z0-9]{10})", card_full_text, re.IGNORECASE)
        if not m_top:
            m_top = re.search(r"(?:^|\n)\s*[#№\|\[\(!Ilसंक्रN\.\s\-]*\s*(\d{1,5})\s*(?:\||\s+[A-Z0-9]{5,})", card_full_text, re.IGNORECASE)
        if m_top:
            s_val = m_top.group(1).strip()
            if s_val and 1 <= int(s_val) <= 99999:
                candidates.append(s_val)

    if not candidates:
        return "", False

    # Score candidates: merge truncated variants into the longer number and discount truncated fragment
    counts = {}
    for c in candidates:
        counts[c] = counts.get(c, 0.0) + 1.0

    for c, cnt in list(counts.items()):
        for other in list(counts.keys()):
            if other != c and len(other) > len(c) and (other.startswith(c) or other.endswith(c)):
                counts[other] += cnt * 1.0
                counts[c] *= 0.5

    sorted_candidates = sorted(counts.items(), key=lambda item: (item[1], len(item[0])), reverse=True)
    winner, support = sorted_candidates[0]

    runner_up_support = sorted_candidates[1][1] if len(sorted_candidates) > 1 else 0.0
    disagreement = bool(runner_up_support >= support * 0.65)
    return winner, disagreement



def ocr_gender(card):
    def extract(text):
        normalized = clean(text)
        if "महिला" in normalized:
            return "female"
        if "पुरुष" in normalized:
            return "male"
        return ""
    return _dual_fixed_choice(card, 0.58, 0.88, 0.15, 0.62, extract, language="hin")

def ocr_age(card, card_full_text=""):
    """Retry only the printed age row; never infer an age from nearby fields."""
    # 1. Primary: Context-bound age directly from labeled card text
    if card_full_text:
        # Repair glyph 1 misrecognitions like 3], 2], 3|
        repaired_text = re.sub(
            r"([0-9०-९])([\]\|!IliI\)])(?=\s*(?:लिंग|महिला|पुरुष|$|\n))",
            r"\g<1>1",
            card_full_text,
        )
        match = re.search(
            r"(?:उम्र|उप्र|आयु|Age|3म्र|34)[^\d\n]{0,15}([0-9०-९]{2})",
            repaired_text,
            re.IGNORECASE,
        )
        if match:
            val = match.group(1).translate(str.maketrans("०१२३४५६७८९", "0123456789"))
            if val.isdigit() and 18 <= int(val) <= 120:
                return int(val)

    # Check if text had only a single leading digit e.g. 'उम्र : 6' or 'उम्र : 8'
    prefix_digit = ""
    if card_full_text:
        m1 = re.search(
            r"(?:उम्र|उप्र|आयु|Age|3म्र|34)[^\d\n]{0,15}([1-9०-९])(?=\s*(?:लिंग|महिला|पुरुष|$|\n))",
            card_full_text,
            re.IGNORECASE,
        )
        if m1:
            prefix_digit = m1.group(1).translate(str.maketrans("०१२३४५६७८९", "0123456789"))

    height, width = card.shape[:2]
    # Age row is line 4 of the card body (y: 0.58..0.76, x: 0..0.55)
    row = card[round(height * 0.58):round(height * 0.76), 0:round(width * 0.55)]
    if row.size > 0:
        gray = cv2.cvtColor(row, cv2.COLOR_BGR2GRAY)
        res = cv2.resize(gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
        pad = cv2.copyMakeBorder(res, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=255)
        try:
            txt = safe_image_to_string(pad, lang="eng", config="--psm 6 -c tessedit_char_whitelist=0123456789:").strip()
            matches = [int(x) for x in re.findall(r"\b[1-9][0-9]\b", txt) if 18 <= int(x) <= 120]
            if prefix_digit:
                matching = [x for x in matches if str(x).startswith(prefix_digit)]
                if matching:
                    return matching[0]
            elif matches:
                return matches[-1]
        except Exception:
            pass

    # 3. Fallback: hin+eng on age line
    line = card[round(height * 0.50):round(height * 0.88), 0:round(width * 0.55)]
    if line.size > 0:
        line_gray = cv2.cvtColor(line, cv2.COLOR_BGR2GRAY)
        line_res = cv2.resize(line_gray, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)
        clahe = cv2.createCLAHE(2.0, (8, 8)).apply(line_res)
        for var in (clahe, line_res):
            for psm in (6, 11):
                try:
                    text = safe_image_to_string(var, lang="hin+eng", config=f"--psm {psm}")
                    m = re.search(r"(?:उम्र|उप्र|आयु|Age)?[^\d\n]*?([1-9][0-9])(?=\s*(?:लिंग|महिला|पुरुष|वर्ष|:))", text)
                    if m and 18 <= int(m.group(1)) <= 120:
                        return int(m.group(1))
                except Exception:
                    pass
    return None




def field(text, pattern):
    match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
    return clean(match.group(1)) if match else ""


PREFIX_CORRECTIONS = {
    "KOV": "KDY", "KOY": "KDY", "OVO": "KDY", "KDV": "KDY",
    "KOW": "KDY", "KPY": "KDY", "KTY": "KDY", "KDT": "KDY",
    "QDY": "KDY", "ODY": "KDY", "RDY": "KDY", "KOO": "KDY",
    "SSN": "SNE", "SME": "SNE", "SN3": "SNE", "SHE": "SNE",
    "5NE": "SNE", "SNE3": "SNE", "SNEI": "SNE", "SMF": "SNE",
    "ESN": "SNE", "SWE": "SNE", "SNE": "SNE", "KDY": "KDY"
}

DIGIT_MAP = str.maketrans({
    "O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "l": "1",
    "Z": "2", "z": "2"
})


def clean_epic(raw):
    if not raw:
        return ""
    s_raw = str(raw).upper()

    # 1. Legacy format: RJ/xx/xxx/xxxxxx
    m_leg = re.search(r"(RJ|[A-Z]{2,3})/([0-9O]{1,3})/([0-9O]{1,3})/([0-9O]{5,6})", s_raw)
    if m_leg:
        p1 = "RJ" if m_leg.group(1).startswith("R") else m_leg.group(1)
        return (
            p1 + "/" +
            m_leg.group(2).replace("O", "0") + "/" +
            m_leg.group(3).replace("O", "0") + "/" +
            m_leg.group(4).replace("O", "0")
        )

    # 2. Priority 1: Exact 3 letters followed by 7 pure digits (e.g. SNE1956358 in 'a] SNE1956358 |')
    m_exact = re.search(r"(?:^|[^A-Z0-9])([A-Z]{3})\s*([0-9]{7})(?:[^0-9]|$)", s_raw)
    if m_exact:
        p = m_exact.group(1)
        digits = m_exact.group(2)
        p = PREFIX_CORRECTIONS.get(p, p)
        return p + digits

    # 3. Known prefix (SNE, KDY) followed by 7 digits with common OCR letter-digits (O, I, L, Z)
    for p_cand, p_repl in PREFIX_CORRECTIONS.items():
        m_pref = re.search(re.escape(p_cand) + r"\s*([0-9OQDILLZ]{7})", s_raw)
        if m_pref:
            digits = m_pref.group(1).translate(DIGIT_MAP)
            if len(digits) == 7 and digits.isdigit():
                return p_repl + digits

    # 4. Standard 3 letters followed by 7 digits with OCR letter-digits (O, I, L, Z)
    m_std = re.search(r"(?:^|[^A-Z0-9])([A-Z]{3})\s*([0-9OQDILLZ]{7})(?:[^0-9]|$)", s_raw)
    if m_std:
        p = m_std.group(1)
        p = PREFIX_CORRECTIONS.get(p, p)
        digits = m_std.group(2).translate(DIGIT_MAP)
        if len(p) == 3 and len(digits) == 7 and digits.isdigit():
            return p + digits

    # 5. Fallback: Search in compact non-whitespace string
    compact = re.sub(r"[^A-Za-z0-9/]", "", s_raw)
    m_comp = re.search(r"([A-Z]{3})([0-9]{7})", compact)
    if m_comp:
        p = PREFIX_CORRECTIONS.get(m_comp.group(1), m_comp.group(1))
        return p + m_comp.group(2)

    return ""


def epic_from(text):
    return clean_epic(text)


def ocr_epic(card, reference=""):
    height, width = card.shape[:2]
    # Precise ROI: strictly top-right area above voter photo
    crop = card[0:round(height * 0.26), round(width * 0.48):width]
    if crop.size == 0:
        return "", False

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    res = cv2.resize(gray, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
    pad = cv2.copyMakeBorder(res, 15, 15, 15, 15, cv2.BORDER_CONSTANT, value=255)

    whitelist_cfg = "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/"
    cfg7 = f"--psm 7 {whitelist_cfg}"
    cfg6 = f"--psm 6 {whitelist_cfg}"

    cands = []
    # 1. Raw padded with PSM 7 & 6
    for cfg in (cfg7, cfg6):
        c = clean_epic(safe_image_to_string(pad, lang="eng", config=cfg))
        if c and valid_epic(c):
            cands.append(c)

    # 2. CLAHE with PSM 7 & 6
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(pad)
    for cfg in (cfg7, cfg6):
        c = clean_epic(safe_image_to_string(clahe, lang="eng", config=cfg))
        if c and valid_epic(c):
            cands.append(c)

    # 3. Otsu threshold with PSM 7 & 6
    _, otsu = cv2.threshold(pad, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    for cfg in (cfg7, cfg6):
        c = clean_epic(safe_image_to_string(otsu, lang="eng", config=cfg))
        if c and valid_epic(c):
            cands.append(c)

    if cands:
        counts = Counter(cands)
        winner, most = counts.most_common(1)[0]
        return winner, True

    # Wider crop fallback if card header was slightly displaced
    wider = card[0:round(height * 0.30), round(width * 0.42):width]
    if wider.size > 0:
        w_gray = cv2.cvtColor(wider, cv2.COLOR_BGR2GRAY)
        w_res = cv2.resize(w_gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
        w_pad = cv2.copyMakeBorder(w_res, 15, 15, 15, 15, cv2.BORDER_CONSTANT, value=255)
        w_txt = safe_image_to_string(w_pad, lang="eng", config=cfg7)
        w_epic = clean_epic(w_txt)
        if w_epic:
            return w_epic, False

    return reference, False
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
        if values:
            counts = {v: values.count(v) for v in set(values)}
            winner, _ = max(counts.items(), key=lambda item: (item[1], len(re.findall(r"[\u0900-\u097F]", item[0]))))
            suggestion[key] = winner
            if len(set(values)) > 1:
                disagreement = True
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
        field(text, r"(?:(?:गृह|गह|गुह|ग्ह|गृ|गृ\.|गृ०|मकान|House|H\.?No|Te|ye|Hea|Hen|Ge)\s*(?:संख्या|सख्या|सं\.?|सं०|नं\.?|क्र\.?|Number|No\.?)?|(?:संख्या|सख्या|सं\.?|सं०|नं\.?)\s*)[:：;\-।|!.]?\s*([^\n]+)")
    )
    if focused_house:
        house = focused_house
    elif raw_house:
        house = raw_house
    else:
        house = ""
    age_raw = field(
        text,
        r"(?:उम्र|उप्र|आयु)\s*[:：;\-]?\s*([0-9०-९]{1,3})",
    )
    clean_age_raw = re.sub(r"[\]\|।:;\-]", "", age_raw)
    age = clean(clean_age_raw).translate(
        str.maketrans("०१२३४५६७८९", "0123456789")
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
    serial_match = re.search(
        r"(?:^|\n)\s*(?:\[\s*\|*|\||al|en|\d+\|)*\s*(\d{1,5})\s*(?:\||\s+[A-Z0-9]{7,15})",
        text or ""
    )
    voter_serial = serial_match.group(1) if serial_match else ""
    if not voter_serial:
        serial_match_fallback = re.search(r"(?:^|\n)\s*[\[\(\|]?\s*(\d{1,5})\s*[\]\)\|]?", text or "")
        voter_serial = serial_match_fallback.group(1) if serial_match_fallback else ""
    if not voter_serial and cell_no:
        voter_serial = str(cell_no)

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


def preserve_card_serials(records, global_start_serial):
    """Keep card serials authoritative while automatically repairing sequence breaks caused by single-card OCR noise."""
    from collections import Counter
    digit_translation = str.maketrans("०१२३४५६७८९", "0123456789")
    
    raw_serials = []
    for rec in records:
        s = str(rec.get("voterSerial") or "").translate(digit_translation).strip()
        raw_serials.append(int(s) if s.isdigit() and 1 <= int(s) <= 99999 else None)
    
    # 1. First, check if physical cards on the page have a consensus sequence
    consensus_start = None
    if records:
        implied_starts = [
            s - i for i, s in enumerate(raw_serials)
            if s is not None and (s - i) > 0
        ]
        if implied_starts:
            counts = Counter(implied_starts)
            sorted_starts = sorted(counts.items(), key=lambda x: (x[1], x[0]), reverse=True)
            top_start, top_count = sorted_starts[0]
            min_agreed = 2 if len(records) <= 10 else 3
            if top_count >= min_agreed or top_count >= len(records) * 0.20:
                consensus_start = top_start

    # 2. Prefer page physical card consensus; only fall back to global_start_serial if no card consensus exists
    if consensus_start is not None:
        start_serial = consensus_start
    elif isinstance(global_start_serial, int) and global_start_serial > 0:
        start_serial = global_start_serial
    elif records and implied_starts:
        start_serial = sorted_starts[0][0]
    else:
        start_serial = 1

    previous_serial = None

    for index, record in enumerate(records):
        raw = raw_serials[index]
        page_baseline_serial = start_serial + index
        expected_serial = (previous_serial + 1) if (previous_serial is not None and abs(previous_serial + 1 - page_baseline_serial) <= 2) else page_baseline_serial
        next_raw = raw_serials[index + 1] if index + 1 < len(records) else None

        is_exact = (raw is not None and raw == expected_serial)
        is_next_consecutive = (next_raw is not None and next_raw == expected_serial + 1)
        # Check if raw has leading box border noise (e.g. '7172' for '172', or '9551' for '551')
        is_prefix_noise = bool(raw is not None and len(str(raw)) > len(str(expected_serial)) and str(raw).endswith(str(expected_serial)))
        # Check if raw has dropped digits (e.g. '61' for '561', '62' for '562', or '8' for '80')
        is_partial_match = bool(
            raw is not None and
            len(str(raw)) < len(str(expected_serial)) and
            (str(expected_serial).endswith(str(raw)) or str(expected_serial).startswith(str(raw)))
        )
        # Check if raw is a cell index (1..30) while expected serial is much larger
        is_cell_index_noise = bool(raw is not None and raw <= 30 and expected_serial > 30)
        # Check if raw jumps backwards behind previous_serial (e.g. read 8 after 24)
        is_backward_jump = bool(raw is not None and previous_serial is not None and raw <= previous_serial)
        # Check if raw is a true OCR anomaly (backward jump, dropped digit, border prefix digit, or cell index reset)
        is_repairable_anomaly = (
            raw is not None and (
                is_backward_jump or
                is_partial_match or
                is_prefix_noise or
                is_cell_index_noise or
                (is_next_consecutive and abs(raw - expected_serial) > 3)
            )
        )

        if is_exact:
            actual_serial = raw
            record["voterSerial"] = str(actual_serial)
            record["voterSerialConfidence"] = 95
            previous_serial = actual_serial
        elif is_repairable_anomaly or raw is None:
            # Single-card OCR anomaly, dropped digit, border noise, or cell-position reset: repair to expected_serial
            if raw is not None:
                record["rawVoterSerial"] = str(raw)
            record["voterSerial"] = str(expected_serial)
            record["voterSerialConfidence"] = 90 if is_partial_match else 85
            record["serialSequenceExpected"] = str(expected_serial)
            previous_serial = expected_serial
        else:
            # When printed serial is clearly read as a multi-digit number (e.g. 505),
            # PRESERVE it as authoritative ground truth! Never overwrite with array index.
            actual_serial = raw
            record["voterSerial"] = str(actual_serial)
            record["voterSerialConfidence"] = 90
            if actual_serial != expected_serial:
                record["rawVoterSerial"] = str(raw)
                record["serialSequenceExpected"] = str(expected_serial)
                record["serialOcrDisagreement"] = True
            previous_serial = actual_serial


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

    # Standard fallback parameters
    left = round(width * 0.038)
    top = round(height * 0.076)
    card_w = round(width * 0.306)
    card_h = round(height * 0.088)
    gap_x = round(width * 0.007)
    gap_y = round(height * 0.003)

    if len(unique) >= 6:
        try:
            med_w = int(np.median([b[2] for b in unique]))
            med_h = int(np.median([b[3] for b in unique]))
            if not (width * 0.25 <= med_w <= width * 0.35):
                med_w = card_w
            if not (height * 0.065 <= med_h <= height * 0.11):
                med_h = card_h

            # 1. Cluster detected boxes into rows
            sorted_by_y = sorted(unique, key=lambda b: b[1])
            row_clusters = []
            for b in sorted_by_y:
                matched_row = False
                for cl in row_clusters:
                    if abs(np.median([box[1] for box in cl]) - b[1]) < med_h * 0.4:
                        cl.append(b)
                        matched_row = True
                        break
                if not matched_row:
                    row_clusters.append([b])

            row_clusters.sort(key=lambda cl: np.median([box[1] for box in cl]))
            row_ys = [int(np.median([b[1] for b in cl])) for cl in row_clusters]

            # 2. Determine actual row pitch from consecutive row differences
            diffs = [row_ys[i+1] - row_ys[i] for i in range(len(row_ys)-1)]
            valid_diffs = [d for d in diffs if med_h * 0.85 <= d <= med_h * 1.35]
            row_pitch = int(np.median(valid_diffs)) if valid_diffs else int(round(med_h * 1.04))

            # 3. Determine Row 0 Y
            row0_y = row_ys[0]
            if row0_y >= height * 0.12:
                row0_y = row0_y - int(round((row0_y - round(height * 0.076)) / row_pitch)) * row_pitch

            # 4. Determine 3 Column X positions
            c0 = [b[0] for b in unique if b[0] < width * 0.25]
            c1 = [b[0] for b in unique if width * 0.25 <= b[0] < width * 0.58]
            c2 = [b[0] for b in unique if b[0] >= width * 0.58]
            col_x = [
                int(np.median(c0)) if c0 else round(width * 0.038),
                int(np.median(c1)) if c1 else round(width * 0.352),
                int(np.median(c2)) if c2 else round(width * 0.666)
            ]

            # 5. Assemble grid slots, validating missing slots against real content
            final_boxes = []
            for r in range(10):
                exp_y = row0_y + r * row_pitch
                if exp_y + med_h > height - round(height * 0.015):
                    continue
                for c in range(3):
                    exp_x = col_x[c]
                    match = next((b for b in unique if abs(b[0] - exp_x) < width * 0.08 and abs(b[1] - exp_y) < med_h * 0.35), None)
                    if match:
                        final_boxes.append(match)
                    else:
                        # Check if this slot contains actual card content or is blank paper
                        slot_crop = gray[exp_y:min(height, exp_y + med_h), exp_x:min(width, exp_x + med_w)]
                        if slot_crop.size > 0:
                            edges = cv2.Canny(slot_crop, 50, 150)
                            if np.count_nonzero(edges) > 2500:
                                final_boxes.append((exp_x, exp_y, med_w, med_h))

            if len(final_boxes) >= 6:
                return final_boxes
        except Exception:
            pass

    # For partial pages with 1..5 detected real cards (e.g. final main roll page with only 2 cards),
    # return the exact detected physical card boxes directly.
    if 1 <= len(unique) < 6:
        return sorted(unique, key=lambda b: (b[1], b[0]))

    # Standard fallback 3x10 grid (ensures all 30 cards are extracted; empty cards filtered later)
    return [
        (left + col * (card_w + gap_x), top + row * (card_h + gap_y), card_w, card_h)
        for row in range(10)
        for col in range(3)
    ]


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


def _process_single_card(args):
    cell_no, (x, y, w, h), image, page_no, output_dir = args
    output_dir = Path(output_dir)
    card = image[y:y + h, x:x + w]
    photo_rect = detect_photo_box(card)
    px, py, pw, ph = photo_rect
    photo_crop = card[py:py + ph, px:px + pw]
    photo_filename = f"p{page_no}_c{cell_no}.jpg"
    photo_path = str(output_dir / photo_filename)
    cv2.imwrite(photo_path, photo_crop)

    card_filename = f"card_p{page_no}_c{cell_no}.jpg"
    card_path = str(output_dir / card_filename)
    cv2.imwrite(card_path, card)

    # Clean text-only crop: strictly excludes the right-side voter photo and top header
    card_h, card_w = card.shape[:2]
    max_text_w = min(round(card_w * 0.68), px - 2 if px > round(card_w * 0.52) else round(card_w * 0.68))
    body_crop = card[round(card_h * 0.22):round(card_h * 0.98), 0:max_text_w]
    if body_crop.size > 0:
        b_gray = cv2.cvtColor(body_crop, cv2.COLOR_BGR2GRAY)
        b_res = cv2.resize(b_gray, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)
        b_clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(b_res)
        text = safe_image_to_string(b_clahe, lang="hin", config="--psm 6")
    else:
        gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray_clahe = clahe.apply(gray)
        gray_res = cv2.resize(gray_clahe, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        text = safe_image_to_string(gray_res, lang="hin", config="--psm 6")

    # 1. Dedicated high-accuracy EPIC extraction (single-line, 3x scale, padded, multi-pass)
    focused_epic, epic_ok = ocr_epic(card, reference="")
    rec = parse_card(text, focused_epic, photo_path, page_no, cell_no, card_path=card_path)

    # 2. Assign high-accuracy EPIC
    if focused_epic and valid_epic(focused_epic):
        rec["voterId"] = focused_epic
        rec["epicConfidence"] = 98 if epic_ok else 90
    else:
        cand = epic_from(text)
        if cand and valid_epic(cand):
            rec["voterId"] = cand
            rec["epicConfidence"] = 75

    # 3. Dedicated House: prioritize focused_house (Otsu threshold digits) over full-text
    focused_house = ocr_house(card, card_full_text=text)
    if focused_house:
        rec["houseNumber"] = focused_house

    # 4. Dedicated Age: prioritize focused_age from Age bounding box
    focused_age = ocr_age(card, card_full_text=text)
    r_age = rec.get("age")
    if focused_age and 18 <= focused_age <= 120:
        rec["age"] = focused_age
    elif r_age and 18 <= r_age <= 120:
        rec["age"] = r_age

    # 5. Dedicated Serial: top-left box
    focused_serial, serial_disagreement = ocr_serial(card, card_full_text=text)
    if focused_serial:
        rec["voterSerial"] = focused_serial
        rec["voterSerialConfidence"] = 95
    elif rec.get("voterSerial") and str(rec.get("voterSerial")).isdigit():
        rec["voterSerialConfidence"] = 80
    else:
        rec["serialOcrDisagreement"] = True

    # 6. Defer heavy identity OCR only when parsed name/guardian is missing or noisy
    parsed_name = rec.get("name") or ""
    parsed_guardian = rec.get("guardianName") or ""
    name_devanagari = len(re.findall(r"[\u0900-\u097F]", parsed_name))
    guardian_devanagari = len(re.findall(r"[\u0900-\u097F]", parsed_guardian))

    if name_devanagari < 3 or guardian_devanagari < 2 or suspicious_person_name(parsed_name):
        identity_suggestion, identity_disagreement = ocr_identity(card)
        if identity_suggestion.get("name"):
            rec["name"] = identity_suggestion["name"]
        if identity_suggestion.get("guardianName"):
            rec["guardianName"] = identity_suggestion["guardianName"]
        if identity_disagreement:
            rec["identityOcrDisagreement"] = True

    # 7. Gender if missing
    if not rec.get("gender"):
        g_val, _ = ocr_gender(card)
        if g_val:
            rec["gender"] = g_val

    validate_record(rec)
    report_card_progress(page_no, cell_no)
    return rec


def process_card_image(card_path):
    """OCR one already-cropped voter card without page-level smoothing."""
    card = cv2.imread(str(card_path))
    if card is None or card.size == 0:
        raise ValueError("Could not read voter card image")
    card = auto_deskew(card)
    height, width = card.shape[:2]
    photo_rect = detect_photo_box(card)
    px, py, pw, ph = photo_rect
    max_text_w = min(round(width * 0.68), px - 2 if px > round(width * 0.52) else round(width * 0.68))
    body_crop = card[round(height * 0.22):round(height * 0.98), 0:max_text_w]
    if body_crop.size > 0:
        b_gray = cv2.cvtColor(body_crop, cv2.COLOR_BGR2GRAY)
        b_res = cv2.resize(b_gray, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)
        b_clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(b_res)
        text = safe_image_to_string(b_clahe, lang="hin", config="--psm 6")
    else:
        gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        text = safe_image_to_string(cv2.resize(clahe.apply(gray), None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC), lang="hin", config="--psm 6")
    focused_house = ocr_house(card, card_full_text=text)
    focused_age = ocr_age(card, card_full_text=text)
    focused_serial, serial_disagreement = ocr_serial(card, card_full_text=text)
    focused_epic, epic_ok = ocr_epic(card, reference="")

    record = parse_card(text, focused_epic, "", 1, 0, focused_house=focused_house, card_path=str(card_path))
    if focused_house:
        record["houseNumber"] = focused_house

    parsed_name = record.get("name") or ""
    parsed_guardian = record.get("guardianName") or ""
    name_devanagari = len(re.findall(r"[\u0900-\u097F]", parsed_name))
    guardian_devanagari = len(re.findall(r"[\u0900-\u097F]", parsed_guardian))

    if name_devanagari < 3 or guardian_devanagari < 2 or suspicious_person_name(parsed_name):
        identity_suggestion, identity_disagreement = ocr_identity(card)
        if identity_suggestion.get("name"):
            record["name"] = identity_suggestion["name"]
        if identity_suggestion.get("guardianName"):
            record["guardianName"] = identity_suggestion["guardianName"]
        if identity_disagreement:
            record["identityOcrDisagreement"] = True

    r_age = record.get("age")
    if focused_age and 18 <= focused_age <= 120:
        record["age"] = focused_age
    elif r_age and 18 <= r_age <= 120:
        record["age"] = r_age
    record["voterSerial"] = focused_serial
    record["voterSerialConfidence"] = 95 if focused_serial else 0
    if serial_disagreement or not focused_serial:
        record["serialOcrDisagreement"] = True
    if focused_epic and (not record.get("voterId") or epic_ok):
        record["voterId"] = focused_epic
        record["epicConfidence"] = 95

    if not record.get("gender"):
        g_val, _ = ocr_gender(card)
        if g_val:
            record["gender"] = g_val

    validate_record(record)
    return record


def is_voter_page(image, page_no=None):
    """
    Determines whether a page image contains voter cards or is a non-voter page
    (Page 1 Cover, Page 2 Map, or trailing statistical summary / revision tables).
    Returns False for non-voter pages to prevent unwanted cropping of fake cards,
    while correctly recognizing supplementary/addition voter pages (परिवर्धन सूची).
    """
    if image is None or getattr(image, "size", 0) == 0:
        return False
    if page_no is not None and int(page_no) in (1, 2):
        return False

    h, w = image.shape[:2]
    sample = image[int(h * 0.08):int(h * 0.92), int(w * 0.04):int(w * 0.96)]
    text = safe_image_to_string(sample, lang="hin+eng")

    # Count real voter card indicators
    voter_fields = len(re.findall(r"(?:पिता|पति|माता)\s*का\s*नाम|गृह\s*संख्या|(?:उम्र|आयु)\s*[:：]|लिंग\s*[:：]", text))
    has_epic = bool(re.search(r"[A-Z]{3}\s*[0-9]{7}", text))

    # Reject purely statistical summary pages (tables of aggregate counts without individual voter records)
    pure_summary_patterns = [
        r"सांख्यिकीय\s*सारांश",
        r"I\s*\+\s*II\s*-\s*III",
        r"शुद्ध\s*निर्वाचक",
        r"E2\s*-\s*|S2\s*-\s*|R2\s*-\s*|Q2\s*-\s*",
        r"नक्शा|मतदान\s*केन्द्र\s*का\s*भवन",
        r"नामावली\s*का\s*प्रकार\s*\|\s*निर्वाचक\s*नामावली\s*की\s*पहचान",
        r"मतदाताओं\s*की\s*संख्या\s*:\s*\n\s*नामावली",
    ]
    is_pure_summary = any(re.search(p, text, re.IGNORECASE) for p in pure_summary_patterns)
    if is_pure_summary and voter_fields < 2 and not has_epic:
        return False

    boxes = detect_card_boxes(image)
    if len(boxes) >= 1 and (voter_fields >= 1 or has_epic or len(boxes) >= 6):
        return True

    return voter_fields >= 2 or has_epic


def process_page(page_path, output_dir, page_no):
    image = cv2.imread(str(page_path))
    if image is None:
        return []
    if page_no is not None and int(page_no) in (1, 2):
        return []
    image = auto_deskew(image)
    boxes = detect_card_boxes(image)
    if not boxes:
        if not is_voter_page(image, page_no):
            return []
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

    task_args = [
        (cell_no, box, image, page_no, output_dir)
        for cell_no, box in enumerate(boxes, 1)
    ]
    # Process card cells concurrently (default 6 threads per page worker)
    max_workers = max(1, int(os.getenv("OCR_CELL_CONCURRENCY", os.getenv("OCR_THREAD_WORKERS", "6"))))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        records = list(executor.map(_process_single_card, task_args))

    # Filter out completely empty card slots (blank paper regions on partial pages)
    def _is_real_voter_card(r):
        if r.get("isDeleted"):
            return True
        has_epic = bool(r.get("voterId") and valid_epic(r.get("voterId")))
        has_valid_name = bool(r.get("name") and len(re.findall(r"[\u0900-\u097F]", r.get("name") or "")) >= 2 and not re.search(r"^[-\s\.\,]+$", r.get("name") or ""))
        has_guardian = bool(r.get("guardianName") and len(re.findall(r"[\u0900-\u097F]", r.get("guardianName") or "")) >= 2)
        has_age = bool(r.get("age") and 18 <= r.get("age") <= 120)
        has_gender = bool(r.get("gender") in ("M", "F", "O", "पुरुष", "महिला", "अन्य"))
        if has_epic:
            return True
        if has_valid_name and (has_guardian or has_age or has_gender):
            return True
        return False

    records = [r for r in records if _is_real_voter_card(r)]


    # OCR can misread a house number, but a different non-empty number is not

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


def _same_section(left, right):
    """Only compare voter cards when both belong to the same detected section."""
    left_section = str(left.get("sectionNumber") or "").strip()
    right_section = str(right.get("sectionNumber") or "").strip()
    return bool(left_section and right_section and left_section == right_section)


def _set_house_suggestion(record, house, reason, needs_review=True, confidence=85):
    """Keep OCR provenance whenever a house number is inferred from another card."""
    previous = str(record.get("houseNumber") or "").strip()
    if previous == house:
        return False
    record["rawHouseNumber"] = record.get("rawHouseNumber") or previous
    record["suggestedHouseNumber"] = house
    record["houseNumber"] = house
    record["houseNumberConfidence"] = confidence
    record["houseOcrDisagreement"] = True
    if needs_review:
        record["needsReview"] = True
        reasons = record.setdefault("reviewReasons", [])
        if reason not in reasons:
            reasons.append(reason)
    return True


def smooth_house_numbers(records):
    """Apply only same-section, two-sided house-number consensus corrections to empty/missing house fields."""
    if len(records) < 3:
        return records

    ordered = sorted(records, key=lambda record: int(record.get("cell", 0)))
    for index in range(1, len(ordered) - 1):
        previous, current, following = ordered[index - 1], ordered[index], ordered[index + 1]
        if not (_same_section(previous, current) and _same_section(current, following)):
            continue
        previous_house = str(previous.get("houseNumber") or "").strip()
        following_house = str(following.get("houseNumber") or "").strip()
        current_house = str(current.get("houseNumber") or "").strip()
        # Only fill if current card house is empty/unreadable, NEVER overwrite a valid house number (like 4241)
        if previous_house and previous_house == following_house and (not current_house or current_house in ("0", "")):
            _set_house_suggestion(current, previous_house, "same_section_sandwich_house_corrected", needs_review=False, confidence=95)
    return ordered


def reconcile_family_tree_houses(records):
    """Suggest a house only for an unreadable voter card with a same-section guardian match."""
    if not records:
        return records

    household_heads = {}
    for record in records:
        section = str(record.get("sectionNumber") or "").strip()
        name_key = loose_person_key(record.get("name") or "")
        house = str(record.get("houseNumber") or "").strip()
        if section and len(name_key) >= 2 and re.fullmatch(r"\d{1,5}(?:[/\-]\d{1,5})?", house):
            household_heads.setdefault((section, name_key), set()).add(house)

    for record in records:
        section = str(record.get("sectionNumber") or "").strip()
        guardian_key = loose_person_key(record.get("guardianName") or "")
        current_house = str(record.get("houseNumber") or "").strip()
        if not section or len(guardian_key) < 2 or re.fullmatch(r"\d{1,5}(?:[/\-]\d{1,5})?", current_house):
            continue
        matches = household_heads.get((section, guardian_key), set())
        if len(matches) == 1:
            _set_house_suggestion(record, next(iter(matches)), "guardian_same_section_house_suggested", needs_review=True, confidence=85)
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
        str.maketrans("\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f", "0123456789")
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
    # Remove leading assembly name / header text if read before colon
    value = re.sub(r"^[^\n:：;]*?(?:अनुभाग\s*(?:की\s*संख्या\s*व\s*नाम|संख्या|नाम)|section\s*name)[^\n:：;]*[:：;]", "", value, flags=re.IGNORECASE)
    if ":" in value:
        value = value.rsplit(":", 1)[1]
    value = re.sub(r"\[.*?\]", "", value)
    value = re.sub(r"\b[A-Z0-9]{10}\b", "", value)
    value = re.sub(r"[\|=_\"`{}><;~!\?\u0964\u0965]", "", value)
    # Strip noise phrases and English/Latin characters
    value = re.sub(r"\b(?:google|polling|station|view|map|after|aftet|hier|uzar|zadt|merit|oiler|sffzr|freran|ore)\b", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"[A-Za-z]+", " ", value)
    value = re.sub(r"^[\s\-:;|\u0964\u09650-9\u0966-\u096f\\|/\.\,\+=\-–—><;~]+", "", value).strip()
    value = re.sub(r"\s+\d+$", "", value).strip()
    value = re.sub(r"[\s\-:;|\u0964\u0965,.<>;~]+$", "", value).strip()
    value = re.sub(r"\s*,\s*", ", ", value)
    value = re.sub(r"^(?:गम|गाम)\s+", "ग्राम ", value)
    value = re.sub(r"बला[डढ]यों", "बलाइयों", value)
    value = re.sub(r"\bमो\b", "मोहल्ला", value)
    value = re.sub(r"\bमौ\b", "मौहल्ला", value)
    value = re.sub(r"\s{2,}", " ", value).strip()
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
    """Read the numbered section table cleanly from Page 1 without mixing in the location column."""
    height, width = image.shape[:2]
    # Crop strictly the left section column (X: 2.5% to 38.5%, Y: 28% to 52%) to avoid right administrative column bleed
    region = image[round(height * 0.28):round(height * 0.52), round(width * 0.025):round(width * 0.385)]
    if region.size == 0:
        return {}
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    res = cv2.resize(gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(res)
    
    ocr_lang = "hin" if "hin" in os.getenv("OCR_LANGUAGES", "hin+eng") else os.getenv("OCR_LANGUAGES", "hin+eng")
    raw_text = safe_image_to_string(clahe, lang=ocr_lang, config="--psm 6")
    if not raw_text.strip():
        raw_text = safe_image_to_string(clahe, lang="hin+eng", config="--psm 6")

    digit_trans = str.maketrans("०१२३४५६७८९", "0123456789")
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    in_section = False
    sections = {}
    expected_idx = 1
    stop_words = ["3. मतदान", "मतदान केन्द्र", "मतदान केंद्र", "भवन :", "स्थान :", "3."]

    for line in lines:
        if any(k in line for k in ["अनुभागों की संख्या", "संख्या और नाम", "संख्या व नाम"]):
            in_section = True
            continue
        if not in_section:
            if "विवरण" in line:
                in_section = True
            continue
        if any(k in line for k in stop_words):
            break

        clean_l = line.translate(digit_trans)
        clean_l = re.sub(r"[^0-9\u0900-\u097F\s\(\)\,\.\-]", "", clean_l).strip(" :,;|")

        if len(re.findall(r"[\u0900-\u097F]", clean_l)) < 3:
            continue
        if re.search(r"(?:भाग में आने वाले|अनुभागों की|संख्या और नाम|विवरण)", clean_l):
            continue

        m = re.match(r"^(?:[\|\!\?iIl\u0965\u0964\-]*)?([0-9]{1,2})\s*[\-\–\:\.\)]\s*(.+)$", clean_l)
        if m:
            read_num = int(m.group(1))
            name_part = m.group(2).strip()
            if read_num == expected_idx or (read_num == expected_idx + 1 and expected_idx > 1):
                actual_num = read_num
                expected_idx = actual_num + 1
            elif expected_idx == 1 and read_num in (4, 7, 0):
                actual_num = 1
                expected_idx = 2
            elif expected_idx == 10 and read_num == 0:
                actual_num = 10
                expected_idx = 11
            else:
                actual_num = expected_idx
                expected_idx += 1
        else:
            name_part = re.sub(r"^[0-9\-\.\:\s\(\)\|\!\?iIl\u0965\u0964]+", "", clean_l).strip()
            actual_num = expected_idx
            expected_idx += 1

        name_part = re.sub(r"^[0-9\u0966-\u096f\-\.\:\s\(\)\|\!\?iIl\u0965\u0964]+", "", name_part).strip(" -,:;|")
        name_part = re.sub(r"\s{2,}", " ", name_part).strip()

        if len(re.findall(r"[\u0900-\u097F]", name_part)) >= 3:
            sections[str(actual_num)] = name_part

    # Section rows normally repeat the same village after the comma. Use the
    # majority spelling to restore a dropped anusvara/chandrabindu in one row.
    suffix_counts = {}
    for name in sections.values():
        if "," in name:
            suffix = clean(name.rsplit(",", 1)[1]).strip()
            if len(suffix) >= 2:
                suffix_counts[suffix] = suffix_counts.get(suffix, 0) + 1
    if suffix_counts:
        dominant = max(suffix_counts.items(), key=lambda item: item[1])[0]
        dominant_key = re.sub(r"[ंँ]", "", dominant)
        for number, name in list(sections.items()):
            if "," not in name:
                continue
            prefix, suffix = name.rsplit(",", 1)
            if re.sub(r"[ंँ]", "", clean(suffix).strip()) == dominant_key or SequenceMatcher(None, clean(suffix).strip(), dominant).ratio() > 0.6:
                sections[number] = prefix.rstrip() + "," + dominant

    # Filter out spurious isolated section numbers that were misread
    for k in list(sections.keys()):
        if k.isdigit() and (int(k) > 40 or int(k) < 1):
            sections.pop(k, None)

    for k in list(sections.keys()):
        sections[k] = fixed_section_name(sections[k])

    return sections

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
def extract_part_from_filename(filename_or_path):
    if not filename_or_path:
        return ""
    name = Path(filename_or_path).name
    m = re.search(r"-(?:HIN|ENG|RAJ|MAR|GUJ)-(\d{1,4})(?:\.pdf|_|$)", name, re.IGNORECASE)
    if m:
        return str(int(m.group(1)))
    m2 = re.search(r"[-_](\d{1,4})\.pdf$", name, re.IGNORECASE)
    if m2:
        return str(int(m2.group(1)))
    m3 = re.search(r"^(\d{1,4})\.pdf$", name, re.IGNORECASE)
    if m3:
        return str(int(m3.group(1)))
    return ""


def read_fixed_header(page_path, is_voter_page=True):
    image = cv2.imread(str(page_path))
    if image is None:
        return {}
    if is_voter_page:
        assembly_bounds = (0.0, 0.0, 0.76, 0.035)
        part_bounds = (0.70, 0.0, 0.99, 0.045)
        section_bounds = (0.0, 0.015, 0.70, 0.045)
    else:
        assembly_bounds = (0.0, 0.0, 0.99, 0.06)
        part_bounds = (0.70, 0.0, 0.99, 0.05)
        section_bounds = (0.0, 0.30, 0.76, 0.43)
        village_bounds = (0.52, 0.33, 0.92, 0.375)
        pin_bounds = (0.52, 0.42, 0.92, 0.47)

    assembly_digits = ocr_fixed_region(
        image, assembly_bounds, psm=6, whitelist="0123456789",
    )
    part_digits = ocr_fixed_region(
        image, part_bounds, psm=6, whitelist="0123456789",
    )
    part_text_full = safe_image_to_string(
        image[0:round(image.shape[0] * 0.06), round(image.shape[1] * 0.60):image.shape[1]],
        lang="hin+eng",
        config="--psm 6"
    )
    part_match = re.search(r"(?:भाग|part)\s*(?:संख्या|सं\.?|no\.?|number)?\s*[:：;\-]*\s*([0-9\u0966-\u096f]{1,4})", part_text_full, re.IGNORECASE)
    extracted_part = part_match.group(1).translate(str.maketrans("०१२३४५६७८९", "0123456789")) if part_match else fixed_header_number(part_digits, 4, prefer_tail=True)
    fn_part_match = extract_part_from_filename(str(page_path))
    if fn_part_match:
        extracted_part = fn_part_match

    result = {
        "assemblyNumber": fixed_header_number(assembly_digits, 3, prefer_tail=True),
        "partNumber": extracted_part,
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
        ocr_lang = "hin" if "hin" in os.getenv("OCR_LANGUAGES", "hin+eng") else os.getenv("OCR_LANGUAGES", "hin+eng")
        section_text = ocr_fixed_region(
            image,
            (0.01, 0.015, 0.68, 0.045),
            lang=ocr_lang,
            psm=6,
        )
        if not section_text.strip():
            section_text = ocr_fixed_region(
                image,
                (0.01, 0.015, 0.68, 0.045),
                lang="hin+eng",
                psm=6,
            )
        sec_num_match = re.search(
            r"(?:अनुभाग|अिुभाग|अनुमाग|section|\bsec\b)[^\d\n]{0,45}?(?:संख्या|सं\.?|क्रमांक|नं\.?)?\s*[:：;\-]?\s*([0-9\u0966-\u096f]{1,2})\b",
            section_text,
            re.IGNORECASE,
        )
        if not sec_num_match:
            sec_num_match = re.search(r"(?:अनुभाग|section)\b[^\d\n]{0,25}\b([0-9\u0966-\u096f]{1,2})\b", section_text, re.IGNORECASE)
        if sec_num_match:
            result["sectionNumber"] = clean(sec_num_match.group(1)).translate(str.maketrans("०१२३४५६७८९", "0123456789"))
        section_name = fixed_section_name(section_text)
        if section_name:
            result["sectionName"] = section_name
        result["rawSectionHeader"] = section_text
    return {key: value for key, value in result.items() if value}


def parse_header_numbers(text):
    value = text or ""
    normalized = re.sub(r"[ \t]+", " ", value.replace("\r", "\n"))
    digit_map = str.maketrans("०१२३४५६७८९", "0123456789")

    def normalize_digits(raw):
        return clean(raw or "").translate(digit_map)

    def normalize_assembly_number(raw):
        return normalize_digits(raw)

    def normalize_section_number(raw):
        return normalize_digits(raw)

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
        text = re.sub(r"\[.*?\]", "", text)
        text = re.sub(r"\b[A-Z0-9]{10}\b", "", text)
        text = re.sub(r"[\|=_\"`{}]", "", text)
        text = clean(text).strip(" -,:;|")
        text = re.sub(r"वार्ड\s*(?:49|479|9)\s*-\s*20", "वार्ड सं 19-20", text)
        text = re.sub(r"\b(?:49|479)\b", "सं", text)
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
    if not part or not part.group(1):
        # Fallback search for part number when separated by colons/newlines
        part = re.search(r"(?:^|\n)\s*::\s*([0-9\u0966-\u096f]{1,4})", normalized)

    section_map = {}
    section_block = re.search(
        r"(?:भाग\s*में\s*आने\s*वाले\s*अनुभाग[^\n:]*[:\s]*)(.+?)(?=\n\s*(?:3\.\s*मतदान|मतदान\s*केन्द्र|मतदान\s*केंद्र|$))",
        normalized,
        re.IGNORECASE | re.DOTALL,
    )
    section_source = section_block.group(1) if section_block else normalized
    
    # Process section block line by line with sequence continuity
    sec_lines = [clean(l) for l in section_source.splitlines() if clean(l)]
    sec_prev_num = 0
    for l in sec_lines:
        if re.search(r"(?:शहर\s*/\s*मुख्य\s*ग्राम|डाक\s*घर|पिन\s*कोड|3\.\s*मतदान)", l):
            break
        m = re.match(r"^(?:([0-9\u0966-\u096f]{1,2})|[-–|।\?Il])\s*[-–.)\s]?\s*(.+)$", l)
        if m:
            digit_str = m.group(1)
            raw_name_val = m.group(2).strip()
            if digit_str is not None:
                val = int(normalize_digits(digit_str))
                # Fix OCR mistakes: reading 10 as 0 or 11 as 1
                if val == 0 and sec_prev_num == 9:
                    val = 10
                elif val <= sec_prev_num and sec_prev_num >= 9:
                    val = sec_prev_num + 1
                sec_prev_num = val
            else:
                val = sec_prev_num + 1
            s_num = str(val)
            s_name = canonical_section_name(tidy_name(raw_name_val))
            if s_num != "0" and s_name and has_devanagari(s_name) >= 2 and not re.search(r"(?:EPIC|RJ/|मतदाता|पिन|डाक|तहसील|सहाडा)", s_name):
                section_map[s_num] = s_name

    # Remove invalid '0' or empty key if present
    section_map.pop("0", None)
    section_map.pop("", None)

    section_matches = list(re.finditer(
        r"(?:अनुभाग|section|SUT|UM|UT|SU|अिुभाग|अनुमाग|(?:^|\n)\s*अनुभाग\s*की\s*संख्या\s*व\s*नाम)[^\n:：;\-0-9,]{0,60}[:：;\-]?\s*([0-9०-९OQILSZBG\-\|Il?]{1,3})\s*[-–:.)\s]\s*([^\n]+)",
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
            if not re.search(r"(?:विधान\s*सभा|assembly|constituency|AC|furs|Seat|वार्ड|Ward)", m.group(0), re.IGNORECASE)
        ]

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

    raw_pin = labeled_value(
        [r"\u092a\u093f\u0928\s*\u0915\u094b\u0921", r"pin\s*code"], numeric=True
    )
    # Header OCR is only a suggestion. A six-digit hallucination can still look
    # structurally valid, so the verified PIN is supplied by the location master.
    pin_code = ""

    ward_match = re.search(
        r"(?:वार्ड\s*(?:संख्या|नं\.?|number|no\.?|सं\.?)?|ward)\s*[:：\-]*\s*(?:वार्ड\s*संख्या\s*)?([0-9O\u0966-\u096f]{1,4})",
        normalized,
        re.IGNORECASE,
    )
    ward_number = normalize_digits(ward_match.group(1)) if ward_match else ""

    raw_assembly_name = tidy_name(assembly.group(2)) if assembly else ""
    if raw_assembly_name:
        devanagari_count = len(re.findall(r"[\u0900-\u097F]", raw_assembly_name))
        is_garbage = bool(re.search(r"(?:fetst|tetst|\btst\b| भाग aaa|aaa:|\btest\b|\bdemo\b|\bdummy\b)", raw_assembly_name, re.IGNORECASE))
        if devanagari_count < 2 or is_garbage:
            raw_assembly_name = ""

    raw_post_office = labeled_value([r"\u0921\u093e\u0915\s*\u0918\u0930", r"\u0921\u093e\u0915\u0918\u0930", r"\u092a\u094b\u0938\u094d\u091f\s*\u0911\u092b\u093f\u0938", r"post\s*office"])
    if raw_post_office:
        # Strip leading OCR noise numbers/slashes (e.g. '800३७/७०0४ (BHILWARA)' -> 'GANGAPUR (BHILWARA)')
        raw_post_office = re.sub(r"^[0-9\u0966-\u096f/\\\s]+", "", raw_post_office).strip()

    return {
        "assemblyNumber": normalize_assembly_number(assembly.group(1)) if assembly else "",
        "assemblyName": raw_assembly_name,
        "partNumber": normalize_digits(part.group(1)) if (part and part.group(1)) else "",
        "partName": labeled_value([r"\u092d\u093e\u0917\s*(?:\u0915\u093e\s*)?(?:\u0928\u093e\u092e|\u0935\u093f\u0935\u0930\u0923)", r"part\s*(?:name|description)"]),
        "wardNumber": ward_number,
        "sectionNumber": section_number,
        "sectionName": section_name,
        "sectionMap": section_map,
        "village": village,
        "gramPanchayat": labeled_value([r"\u0917\u094d\u0930\u093e\u092e\s*\u092a\u0902\u091a\u093e\u092f\u0924", r"gram\s*panchayat"]),
        "postOffice": raw_post_office,
        "policeStation": labeled_value([r"\u092a\u0941\u0932\u093f\u0938\s*\u0925\u093e\u0928\u093e", r"\u0925\u093e\u0928\u093e", r"police\s*station"]),
        "tehsil": labeled_value([r"\u0924\u0939\u0938\u0940\u0932", r"tehsil"]),
        "district": labeled_value([r"\u091c\u093f\u0932\u093e", r"district"]),
        "pinCode": pin_code,
        "rawPinCode": raw_pin,
    }


def reconcile_card_epics(records):
    """Normalize old-format EPIC constituency codes (e.g. RJ/20/161/ -> RJ/20/151/) by document consensus."""
    prefix_counts = {}
    for r in records:
        v_id = str(r.get("voterId") or "").strip()
        m = re.match(r"^(RJ/\d+/)\d+/", v_id)
        if m:
            full_m = re.match(r"^(RJ/\d+/\d+/)", v_id)
            if full_m:
                pfx = full_m.group(1)
                prefix_counts[pfx] = prefix_counts.get(pfx, 0) + 1
    if prefix_counts:
        dominant_prefix, count = max(prefix_counts.items(), key=lambda x: x[1])
        base_prefix = dominant_prefix[: dominant_prefix.rindex("/")].rsplit("/", 1)[0] + "/"
        for r in records:
            v_id = str(r.get("voterId") or "").strip()
            if v_id.startswith(base_prefix) and not v_id.startswith(dominant_prefix):
                fixed_id = re.sub(r"^" + re.escape(base_prefix) + r"\d+/", dominant_prefix, v_id)
                r["voterId"] = fixed_id


def main():
    payload = json.loads(sys.stdin.read())
    if payload.get("mode") == "single_card":
        if os.getenv("TESSERACT_PATH"):
            pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH")
        print(json.dumps(process_card_image(payload["cardPath"]), ensure_ascii=False))
        return
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
        # Cover/index/detail pages (e.g. Page 2) must not create voter cards,
        # but must still extract sectionMap and master headers!
        if page_no in skip_pages or (page_no is not None and int(page_no) in (1, 2)):
            return read_header(page, is_voter_page=False), [], read_fixed_header(page, is_voter_page=False)

        page_img = cv2.imread(str(page))
        if page_img is not None and not is_voter_page(page_img, page_no):
            return read_header(page, is_voter_page=False), [], read_fixed_header(page, is_voter_page=False)

        header = read_header(page, is_voter_page=True)
        return header, process_page(page, output_dir, page_no), read_fixed_header(page, is_voter_page=True)

    # Use OCR_PAGE_CONCURRENCY to process multiple pages in parallel
    max_workers = max(1, int(os.getenv("OCR_PAGE_CONCURRENCY", os.getenv("MAX_WORKERS", "2"))))
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

    # Filename-based Part Number Extraction (Authoritative Source)
    fn_candidates = [
        payload.get("pdfPath"),
        payload.get("originalFileName"),
        payload.get("fileName"),
        payload.get("outputDir"),
        str(pages[0]) if pages else ""
    ]
    fn_part_num = ""
    for cand in fn_candidates:
        fn_part_num = extract_part_from_filename(cand)
        if fn_part_num:
            break
    if fn_part_num:
        master_context["partNumber"] = fn_part_num

    doc_section_map = {}
    for ph in page_headers:
        if ph.get("sectionMap"):
            for section_key, section_value in ph["sectionMap"].items():
                doc_section_map.setdefault(section_key, section_value)

    # Clean ward string misreads (49-20 / 9-20 -> 19-20)
    for sk, sv in list(doc_section_map.items()):
        if sv:
            doc_section_map[sk] = re.sub(r"वार्ड\s*(?:सं\.?|स|संख्या)?\s*(?:49|9)-20", "वार्ड सं 19-20", sv)

    # Filter non-numeric keys, non-Devanagari values, and clean section names
    for k in list(doc_section_map.keys()):
        val = str(doc_section_map.get(k) or "")
        clean_v = fixed_section_name(val)
        if not str(k).strip().isdigit() or not (1 <= int(k) <= 30) or len(re.findall(r"[\u0900-\u097F]", clean_v)) < 3:
            doc_section_map.pop(k, None)
        else:
            doc_section_map[str(int(k))] = clean_v

    # Filter outlier keys > 40
    for k in list(doc_section_map.keys()):
        if int(k) > 40:
            doc_section_map.pop(k, None)

    # Auto-extract Village from header fields or section names if master village is missing/blank
    if not master_context.get("village"):
        for key_cand in ("policeStation", "gramPanchayat", "partName", "tehsil"):
            val = master_header.get(key_cand)
            if val and len(re.findall(r"[\u0900-\u097F]", val)) >= 2:
                clean_v = re.sub(r"^(?:[0-9\u0966-\u096f]+\s*[-–:]\s*|वार्ड\s*सं?\s*\d+\s*)", "", clean(val)).strip()
                if clean_v and len(re.findall(r"[\u0900-\u097F]", clean_v)) >= 2 and not re.search(r"(?:वार्ड|संख्या)", clean_v):
                    master_context["village"] = clean_v
                    break
        if not master_context.get("village"):
            for sv in doc_section_map.values():
                if sv and "," in sv:
                    parts = [p.strip() for p in sv.split(",") if p.strip()]
                    for cand_part in reversed(parts):
                        extracted = clean(cand_part).strip(" -,:;|\u0964")
                        if len(re.findall(r"[\u0900-\u097F]", extracted)) >= 2 and not re.search(r"(?:वार्ड|ward|संख्या|सं\b)", extracted, re.IGNORECASE):
                            master_context["village"] = extracted
                            break
                    if master_context.get("village"):
                        break

    records = []
    summary_marker = "नामावली का प्रकार"
    last_known_section_num = ""
    last_known_section_name = ""

    for index, result in enumerate(page_records):
        if summary_marker in clean(headers[index]):
            continue
        raw_header = page_headers[index]

        # Self-healing: if voter page header has a valid section number (1..40) & name missing from doc_section_map, heal it
        raw_sec_num = str(raw_header.get("sectionNumber") or "").strip()
        raw_sec_name = fixed_section_name(str(raw_header.get("sectionName") or ""))
        if raw_sec_num and raw_sec_num.isdigit() and 1 <= int(raw_sec_num) <= 40:
            if raw_sec_num not in doc_section_map and raw_sec_name:
                doc_section_map[raw_sec_num] = raw_sec_name

        # The first/master page table is authoritative; voter-page OCR only fills absent keys.
        page_sec_map = {**(raw_header.get("sectionMap") or {}), **doc_section_map}

        hdr_sec_num = str(raw_header.get("sectionNumber") or "").strip()
        hdr_sec_name = raw_sec_name

        # Reject numbers outside realistic section range (1..40)
        if not hdr_sec_num or not hdr_sec_num.isdigit() or not (1 <= int(hdr_sec_num) <= 40):
            hdr_sec_num = ""

        # Scan raw page header text for any section number or section name from page_sec_map
        if page_sec_map:
            raw_sec_hdr = str(raw_header.get("rawSectionHeader") or "").strip()
            page_hdr_clean = clean(raw_sec_hdr + " " + headers[index])

            # 1. Check for explicit section number in page header text (NEVER match part/भाग)
            if not hdr_sec_num:
                sec_match = re.search(r"(?:अनुभाग|अिुभाग|अनुमाग|section|\bsec\b)\s*(?:की\s*संख्या\s*व\s*नाम|संख्या|सं\.?)?\s*[:：;\-]?\s*([0-9\u0966-\u096f]{1,2})\b", page_hdr_clean, re.IGNORECASE)
                if sec_match:
                    cand_num = sec_match.group(1).translate(str.maketrans("०१२३४५६७८९", "0123456789"))
                    if cand_num in page_sec_map:
                        hdr_sec_num = cand_num
                        hdr_sec_name = page_sec_map[cand_num]

            # 2. Check prefix / substring / keyword matching against section names
            if not hdr_sec_num:
                for s_num, s_name in page_sec_map.items():
                    s_clean = clean(s_name)
                    s_pfx = s_clean.split(",")[0].strip()
                    if (s_clean and s_clean in page_hdr_clean) or (s_pfx and len(s_pfx) >= 6 and s_pfx in page_hdr_clean):
                        hdr_sec_num = s_num
                        hdr_sec_name = s_name
                        break
                    keywords = [w for w in re.findall(r"[\u0900-\u097F]{3,}", s_name) if w not in ("की", "का", "के", "बस्ती", "मोहल्ला", "रावला", "छातोल", "ग्राम", "वार्ड", "संख्या")]
                    if any(kw in page_hdr_clean for kw in keywords):
                        hdr_sec_num = s_num
                        hdr_sec_name = s_name
                        break

            # 3. Fuzzy matching against clean section line text
            if not hdr_sec_num:
                best_s_num, best_score = None, 0.0
                match_target = fixed_section_name(raw_sec_hdr) or page_hdr_clean
                for s_num, s_name in page_sec_map.items():
                    score = SequenceMatcher(None, s_name, match_target).ratio()
                    if score > best_score:
                        best_score = score
                        best_s_num = s_num
                if best_s_num and best_score >= 0.35:
                    hdr_sec_num = best_s_num
                    hdr_sec_name = page_sec_map[best_s_num]

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
        # Master context values must not be overwritten by noisy voter page header OCR
        if master_context.get("partNumber"):
            page_header["partNumber"] = master_context["partNumber"]
        if master_context.get("assemblyNumber"):
            page_header["assemblyNumber"] = master_context["assemblyNumber"]
        if master_context.get("wardNumber"):
            page_header["wardNumber"] = master_context["wardNumber"]
        if master_context.get("village"):
            page_header["village"] = master_context["village"]

        for record in result:
            merged = {**page_header, **{key: value for key, value in record.items() if value not in (None, "")}}
            sec_num = hdr_sec_num or last_known_section_num or (list(page_sec_map.keys())[0] if len(page_sec_map) >= 1 else "1")
            merged["sectionNumber"] = sec_num
            if page_sec_map.get(sec_num):
                merged["sectionName"] = page_sec_map[sec_num]
            elif last_known_section_name:
                merged["sectionName"] = last_known_section_name
            records.append(merged)

    # Preserve printed card serials. Sequence information is validation-only.
    preserve_card_serials(records, payload.get("globalStartSerial"))
    # Document-level EPIC constituency code normalization
    reconcile_card_epics(records)
    # Re-run validation after serial integrity checks so a sequence mismatch is
    # persisted as needs_review instead of being silently accepted.
    for record in records:
        validate_record(record)

    # Section Name Auto-Repair: Sync sectionName from doc_section_map and ensure clean Hindi
    for record in records:
        sec_k = str(record.get("sectionNumber") or "").strip()
        if sec_k and doc_section_map.get(sec_k):
            record["sectionName"] = doc_section_map[sec_k]
        elif record.get("sectionName"):
            record["sectionName"] = fixed_section_name(record["sectionName"])

    # Safe document-level house repair rules:
    # - only same-section cards can contribute a neighbour house number;
    # - a guardian match may fill an unreadable house number, but always needs review;
    # - previous-card-only and sequential-gap propagation are deliberately disabled.
    for record in records:
        raw_house = str(record.get("houseNumber") or "").strip()
        record["rawHouseNumber"] = record.get("rawHouseNumber") or raw_house

    for index in range(0, len(records)):
        current = records[index]
        previous = records[index - 1] if index > 0 else None
        following = records[index + 1] if index < len(records) - 1 else None
        current_house = str(current.get("houseNumber") or "").strip()
        
        prev_h = str(previous.get("houseNumber") or "").strip() if previous and _same_section(previous, current) else ""
        foll_h = str(following.get("houseNumber") or "").strip() if following and _same_section(current, following) else ""

        # Sandwich repair: if previous and following have same house (e.g. '151' and '151') and current is unreadable ('0' or empty)
        if prev_h and foll_h and prev_h == foll_h:
            if current_house in ("0", ""):
                current["houseNumber"] = prev_h
                current.setdefault("suggestions", {})["houseNumber"] = prev_h

    # A new/different house number naturally starts a new sequence: there is no
    # previous-card propagation. Guardian matching is scoped to the same section
    # and only fills missing or malformed values, retaining review provenance.
    reconcile_family_tree_houses(records)
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
                    if sim >= 0.85:
                        rec["rawGuardianName"] = g
                        rec["guardianName"] = cand
                        rec.setdefault("reviewReasons", []).append("family_tree_guardian_repaired")
                        break




    header_text = "\n".join(headers[:3])
    doc_header = parse_header_numbers(header_text)
    for k, v in master_context.items():
        if v and (k not in doc_header or not doc_header[k]):
            doc_header[k] = v
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
