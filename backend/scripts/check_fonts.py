import pypdf
reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf')
page = reader.pages[2]
print("Fonts on page 3:")
for font in page.get('/Resources', {}).get('/Font', {}).values():
    print(font)
