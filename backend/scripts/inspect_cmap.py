import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf')
for idx, page in enumerate(reader.pages):
    if '/Resources' in page:
        res = page['/Resources']
        if '/Font' in res:
            fonts = res['/Font']
            for fk, fv in fonts.items():
                f_obj = fv.get_object()
                print(f"Page {idx+1} Font {fk}: {f_obj.get('/BaseFont')}")
                if '/ToUnicode' in f_obj:
                    tu = f_obj['/ToUnicode'].get_object().get_data().decode('utf-8', errors='ignore')
                    print(f"--- ToUnicode for {fk} ---")
                    print(tu)
            break
