import pypdf

reader = pypdf.PdfReader(r'C:\Users\Ashish Sharma\Downloads\KHEMANA-\KHEMANA-Ward No-001.pdf')
for obj_num in range(1, 200):
    try:
        indirect_obj = reader.get_object((obj_num, 0))
        if isinstance(indirect_obj, dict) and indirect_obj.get('/Type') == '/Font':
            print(f"\nFound Font Obj #{obj_num}:")
            print("  BaseFont:", indirect_obj.get('/BaseFont'))
            print("  Encoding:", indirect_obj.get('/Encoding'))
            if '/ToUnicode' in indirect_obj:
                u_obj = indirect_obj['/ToUnicode'].get_object()
                print("  ToUnicode data:")
                data = u_obj.get_data().decode('utf-8', errors='replace')
                print(data)
    except Exception as e:
        pass
