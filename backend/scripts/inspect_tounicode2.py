import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\Raipur\RAIPUR-Ward No-008.pdf')
for i, obj in enumerate(reader.trailer['/Root']['/Pages']['/Kids']):
    page = obj.get_object()
    res = page.get('/Resources')
    if res:
        res_obj = res.get_object()
        print(f"Page {i+1} resources keys:", list(res_obj.keys()))
        if '/Font' in res_obj:
            fonts = res_obj['/Font'].get_object()
            for fk, fv in fonts.items():
                f_obj = fv.get_object()
                print(f"  Font {fk}: {f_obj.get('/BaseFont')} encoding={f_obj.get('/Encoding')}")
                if '/ToUnicode' in f_obj:
                    tu = f_obj['/ToUnicode'].get_object().get_data().decode('utf-8', errors='ignore')
                    print("    ToUnicode:\n" + "\n".join(tu.splitlines()[:20]))
    break
