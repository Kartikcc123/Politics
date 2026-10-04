import subprocess
import xml.etree.ElementTree as ET

pdf_path = r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf'
out = subprocess.run(['pdftotext', '-bbox', '-f', '3', '-l', '3', pdf_path, '-'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
root = ET.fromstring(out.stdout)

# Find all words in card 9 region (x in [380, 565], y around row 3)
for page in root.findall('.//{http://www.w3.org/1999/xhtml}page'):
    for word in page.findall('.//{http://www.w3.org/1999/xhtml}word'):
        xMin = float(word.attrib['xMin'])
        yMin = float(word.attrib['yMin'])
        txt = word.text
        if xMin > 380 and yMin > 300 and yMin < 450:
            print(f"x={xMin:.1f}, y={yMin:.1f}: '{txt}'")
