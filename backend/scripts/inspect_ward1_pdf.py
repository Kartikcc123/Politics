import fitz
import json

doc = fitz.open(r'C:\Users\Ashish Sharma\Downloads\c\BHEETA-Ward No-001.pdf')
print(f'Total pages: {len(doc)}')

for pno in range(len(doc)):
    page = doc[pno]
    text = page.get_text()
    if 'SNE0151910' in text or 'SNE1226919' in text or 'KDY0910042' in text or '105' in text or '106' in text or '35' in text:
        print(f'--- PAGE {pno + 1} ---')
        lines = text.split('\n')
        for i, l in enumerate(lines):
            if any(k in l for k in ['SNE0151910', 'SNE1226919', 'KDY0910042', 'सीता', 'मदन', 'लहरी']):
                context = '\n'.join(lines[max(0, i-5):min(len(lines), i+10)])
                print(f'Found match on page {pno+1}:\n{context}\n-------------------')
