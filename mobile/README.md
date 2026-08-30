# Political Booth Management CRM - Flutter

Flutter client for Android-first mobile and responsive desktop layouts.

## Run

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:5000
```

For desktop/web, use your machine backend URL:

```bash
flutter run --dart-define=API_URL=http://localhost:5000
```

The UI has only two panels: Admin Panel and Booth Panel. Navigation is selected after login from the authenticated user role.
