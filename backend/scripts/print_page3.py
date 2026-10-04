import subprocess
import xml.etree.ElementTree as ET

pdf_path = r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf'
out = subprocess.run(['pdftotext', '-f', '3', '-l', '3', pdf_path, '-'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print(out.stdout.decode('utf-8', errors='ignore'))
