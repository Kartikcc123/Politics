import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\KHEMANA-\KHEMANA-Ward No-001.pdf')
root = reader.trailer['/Root'].get_object()
print("Root keys:", list(root.keys()))
pages = root['/Pages'].get_object()
print("Pages keys:", list(pages.keys()))
if '/Resources' in pages:
    res = pages['/Resources'].get_object()
    print("Root Pages Resources keys:", list(res.keys()))
    if '/Font' in res:
        fonts = res['/Font'].get_object()
        for k, v in fonts.items():
            f_obj = v.get_object()
            print(f"\nFont {k}:")
            print("  BaseFont:", f_obj.get('/BaseFont'))
            print("  Encoding:", f_obj.get('/Encoding'))
            if '/ToUnicode' in f_obj:
                u_obj = f_obj['/ToUnicode'].get_object()
                print("  ToUnicode data snippet:")
                data = u_obj.get_data().decode('utf-8', errors='replace')
                print(data[:600])
