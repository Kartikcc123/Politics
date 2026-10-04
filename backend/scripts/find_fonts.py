import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\KHEMANA-\KHEMANA-Ward No-001.pdf')
for i, page in enumerate(reader.pages):
    print(f"Page {i+1} keys:", list(page.keys()))
    if '/Resources' in page:
        print(f"Page {i+1} Resources:", list(page['/Resources'].keys()))
        if '/Font' in page['/Resources']:
            print(f"Page {i+1} Fonts:", list(page['/Resources']['/Font'].keys()))
            break
