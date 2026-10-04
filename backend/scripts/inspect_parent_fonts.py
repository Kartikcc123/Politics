import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\KHEMANA-\KHEMANA-Ward No-001.pdf')
parent = reader.pages[2]['/Parent'].get_object()
print("Parent keys:", list(parent.keys()))
if '/Resources' in parent:
    res = parent['/Resources'].get_object()
    print("Parent Resources keys:", list(res.keys()))
    if '/Font' in res:
        fonts = res['/Font'].get_object()
        for k, v in fonts.items():
            f_obj = v.get_object()
            print(f"\nFont {k}:")
            print("  BaseFont:", f_obj.get('/BaseFont'))
            print("  Encoding:", f_obj.get('/Encoding'))
            if '/ToUnicode' in f_obj:
                u_obj = f_obj['/ToUnicode'].get_object()
                print("  ToUnicode data:")
                print(u_obj.get_data().decode('utf-8', errors='replace'))
