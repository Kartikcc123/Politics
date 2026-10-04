import subprocess
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'C:\Users\Ashish Sharma\Downloads\KHEMANA-\KHEMANA-Ward No-001.pdf'

# Get pdftotext bbox
xml = subprocess.run(['pdftotext', '-bbox', '-f', '3', '-l', '3', pdf_path, '-'], capture_output=True, text=True, encoding='utf-8').stdout

# Parse words
words = []
for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)</word>', xml):
    words.append({
        'x': float(m.group(1)),
        'y': float(m.group(2)),
        'text': m.group(5).strip()
    })

# Filter body
body_words = [w for w in words if 135 <= w['y'] <= 795]

# Group by row and col
# 8 rows of cards approx: y = 160, 250, 340, 430, 520, 610, 700, etc.
# 3 cols: x < 200, 200 <= x < 380, x >= 380

cols = [
    (25, 200),
    (200, 380),
    (380, 565)
]

for row_idx in range(8):
    y_start = 140 + row_idx * 88
    y_end = y_start + 85
    for col_idx, (col_min, col_max) in enumerate(cols):
        card_words = [w for w in body_words if y_start <= w['y'] < y_end and col_min <= w['x'] < col_max]
        if not card_words:
            continue
        card_words.sort(key=lambda w: (round(w['y'] / 4), w['x']))
        card_text = ' '.join(w['text'] for w in card_words)
        print(f"--- Card (Row {row_idx+1}, Col {col_idx+1}) ---")
        print(card_text)
