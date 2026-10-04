import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf')
page = reader.pages[2] # page 3
print(page.extract_text()[:2000])
