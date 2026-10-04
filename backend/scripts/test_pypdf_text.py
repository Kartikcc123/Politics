import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\KHEMANA-\KHEMANA-Ward No-001.pdf')
text = reader.pages[2].extract_text()
print("PyPDF Page 3 extracted text (first 1000 chars):")
print(text[:1000])
