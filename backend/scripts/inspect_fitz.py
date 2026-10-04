import fitz # PyMuPDF
doc = fitz.open(r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf')
page = doc[2] # Page 3
for block in page.get_text("blocks"):
    print(block[:4], repr(block[4][:100]))
