import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf')
page = reader.pages[2] # Page 3
fonts = page['/Resources']['/Font']
for k, font_ref in fonts.items():
    font = font_ref.get_object()
    print("Font:", k, font.get('/BaseFont'), font.get('/Subtype'), font.get('/Encoding'))
    if '/ToUnicode' in font:
        stream = font['/ToUnicode'].get_object().get_data().decode('utf-8', errors='ignore')
        print("ToUnicode for", k, ":\n", stream[:500])
