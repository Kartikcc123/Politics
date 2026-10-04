import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

cmd = ['pdftohtml', '-xml', '-stdout', '-f', '3', '-l', '3', r'C:\Users\Ashish Sharma\Downloads\KHEMANA-\KHEMANA-Ward No-001.pdf']
try:
    res = subprocess.run(cmd, capture_output=True)
    text = res.stdout.decode('utf-8', errors='replace')
    print("pdftohtml output (first 2000 chars):")
    print(text[:2000])
except Exception as e:
    print("Error:", e)
