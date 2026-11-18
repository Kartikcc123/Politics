import argparse
import base64
import json
import os
import re
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import pymupdf

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))


def configure_bundled_tools():
    """Prefer bundled Poppler/Tesseract next to executable or backend, fallback to system."""
    candidates = [
        SCRIPT_DIR.parent / "ocr_bundle",
        Path(sys.executable).resolve().parent / "ocr_bundle",
        Path.cwd() / "ocr_bundle",
    ]
    for bundle in candidates:
        poppler_bin = bundle / "poppler" / "bin"
        tess_dir = bundle / "tesseract"
        tessdata_dir = bundle / "tessdata"
        if poppler_bin.exists():
            os.environ["PATH"] = str(poppler_bin) + os.pathsep + os.environ.get("PATH", "")
        if tess_dir.exists():
            os.environ["PATH"] = str(tess_dir) + os.pathsep + os.environ.get("PATH", "")
            tess_exe = tess_dir / "tesseract.exe"
            if tess_exe.exists():
                os.environ["TESSERACT_PATH"] = str(tess_exe)
        if tessdata_dir.exists() and (tessdata_dir / "hin.traineddata").exists():
            os.environ["TESSDATA_PREFIX"] = str(tessdata_dir)

    # Fallback common Windows Winget/Program Files paths
    win_tess = Path(r"C:\Program Files\Tesseract-OCR")
    if win_tess.exists() and str(win_tess) not in os.environ.get("PATH", ""):
        os.environ["PATH"] = str(win_tess) + os.pathsep + os.environ.get("PATH", "")


configure_bundled_tools()
import ocr_worker  # noqa: E402


def emit(event):
    print(json.dumps(event, ensure_ascii=False), flush=True)


def extract_part_number(pdf_path: Path) -> str:
    m = (
        re.search(r"-(?:HIN|ENG|RAJ|MAR|GUJ)-(\d{1,4})(?:\.pdf|_|$)", pdf_path.name, re.IGNORECASE)
        or re.search(r"(?:part|booth|ps)[_-]?(\d{1,4})\.pdf$", pdf_path.name, re.IGNORECASE)
        or re.search(r"[-_](\d{1,4})\.pdf$", pdf_path.name, re.IGNORECASE)
        or re.search(r"^(\d{1,4})\.pdf$", pdf_path.name, re.IGNORECASE)
    )
    if m:
        num = int(m.group(1))
        if 1 <= num <= 9999 and num != 2026:
            return str(num)
    return ""


def parse_parts_filter(parts_arg: str):
    if not parts_arg or parts_arg.strip().lower() in ("all", "*"):
        return None
    selected = set()
    for chunk in parts_arg.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            a, b = chunk.split("-", 1)
            if a.strip().isdigit() and b.strip().isdigit():
                for n in range(int(a), int(b) + 1):
                    selected.add(str(n))
        elif chunk.isdigit():
            selected.add(str(int(chunk)))
    return selected or None


def file_to_data_uri(file_path: str) -> str:
    if not file_path or not os.path.exists(file_path):
        return ""
    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def upload_batch(base_url: str, token: str, header: dict, members: list):
    url = base_url.rstrip("/") + "/api/import/members/json"
    payload = json.dumps({"header": header, "members": members}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                if 200 <= resp.status < 300:
                    return json.loads(resp.read().decode("utf-8"))
        except Exception as err:
            if attempt == 2:
                raise err
            time.sleep(2)


def process_single_pdf(pdf_path: Path, base_url: str, token: str, file_idx: int, total_files: int):
    part_num = extract_part_number(pdf_path)
    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    emit({
        "type": "file_start",
        "file": pdf_path.name,
        "partNumber": part_num,
        "fileIndex": file_idx,
        "totalFiles": total_files,
        "totalPages": total_pages,
    })

    with tempfile.TemporaryDirectory(prefix="desktop-ocr-") as tmp_dir:
        tmp_path = Path(tmp_dir)
        # 1. Cover page (Page 1)
        p1_img = str(tmp_path / "page-1.png")
        doc[0].get_pixmap(dpi=250).save(p1_img)
        cover_header = ocr_worker.read_fixed_header(p1_img, is_voter_page=False)
        if part_num:
            cover_header["partNumber"] = part_num
        section_map = cover_header.get("sectionMap") or {}

        synced_count = 0
        batch = []

        for page_idx in range(2, total_pages):
            page_no = page_idx + 1
            page_img = str(tmp_path / f"page-{page_no}.png")
            doc[page_idx].get_pixmap(dpi=200).save(page_img)

            if not ocr_worker.is_voter_page(ocr_worker.cv2.imread(page_img), page_no):
                emit({"type": "page_done", "file": pdf_path.name, "page": page_no, "totalPages": total_pages, "synced": synced_count})
                continue

            page_hdr = ocr_worker.read_fixed_header(page_img, is_voter_page=True)
            recs = ocr_worker.process_page(page_img, tmp_dir, page_no)

            sec_num = page_hdr.get("sectionNumber") or ""
            sec_name = page_hdr.get("sectionName") or ""
            if sec_num and section_map.get(sec_num):
                mapped = section_map[sec_num]
                if not (sec_name and re.search(r"(?:वार्ड|ward)\s*(?:नं|न॑|न०|no\.?)?\s*$", mapped, re.I) and re.search(r"\d+", sec_name)):
                    sec_name = mapped

            for rec in recs:
                if not rec.get("name"):
                    continue
                member_obj = {
                    "voterSerial": rec.get("voterSerial") or "",
                    "name": rec.get("name") or "",
                    "guardianName": rec.get("guardianName") or "",
                    "relationType": rec.get("relationType") or "",
                    "voterId": rec.get("voterId") or "",
                    "houseNumber": rec.get("houseNumber") or "",
                    "age": rec.get("age"),
                    "gender": rec.get("gender") or "",
                    "sectionNumber": sec_num or rec.get("sectionNumber") or "",
                    "sectionName": sec_name or rec.get("sectionName") or "",
                    "supplementType": page_hdr.get("supplementType") or "",
                    "isDeleted": bool(rec.get("isDeleted") or page_hdr.get("pageIsDeleted")),
                    "photo": file_to_data_uri(rec.get("photo", "")),
                    "cardImage": file_to_data_uri(rec.get("cardImage", "")),
                }
                batch.append(member_obj)
                if len(batch) >= 25:
                    upload_batch(base_url, token, cover_header, batch)
                    synced_count += len(batch)
                    batch = []

            emit({"type": "page_done", "file": pdf_path.name, "page": page_no, "totalPages": total_pages, "synced": synced_count})

        if batch:
            upload_batch(base_url, token, cover_header, batch)
            synced_count += len(batch)

    emit({"type": "file_done", "file": pdf_path.name, "partNumber": part_num, "synced": synced_count})


def main():
    parser = argparse.ArgumentParser(description="Desktop Fast Folder PDF Sync (Laptop CPU -> VPS JSON API)")
    parser.add_argument("--path", required=True, help="Folder path containing PDFs or a single PDF file path")
    parser.add_argument("--base-url", required=True, help="Backend API base URL")
    parser.add_argument("--token", required=True, help="Admin JWT token")
    parser.add_argument("--parts", default="all", help="Optional part numbers e.g. '185,186' or '1-10' or 'all'")
    args = parser.parse_args()

    target = Path(args.path.strip().strip('"'))
    if not target.exists():
        emit({"type": "error", "message": f"Path not found: {target}"})
        sys.exit(1)

    if target.is_file() and target.suffix.lower() == ".pdf":
        pdfs = [target]
    elif target.is_dir():
        pdfs = sorted(target.glob("*.pdf"), key=lambda p: (int(extract_part_number(p)) if extract_part_number(p).isdigit() else 999999, p.name))
    else:
        emit({"type": "error", "message": "Please select a valid PDF file or folder containing PDFs."})
        sys.exit(1)

    allowed = parse_parts_filter(args.parts)
    if allowed:
        pdfs = [p for p in pdfs if extract_part_number(p) in allowed]

    if not pdfs:
        emit({"type": "error", "message": "No matching PDF files found in the selected path."})
        sys.exit(1)

    emit({"type": "scan_done", "totalFiles": len(pdfs)})
    for idx, pdf in enumerate(pdfs, 1):
        try:
            process_single_pdf(pdf, args.base_url, args.token, idx, len(pdfs))
        except Exception as err:
            emit({"type": "file_error", "file": pdf.name, "message": str(err)})

    emit({"type": "all_done", "totalFiles": len(pdfs)})


if __name__ == "__main__":
    main()
