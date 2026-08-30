import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:political_booth_crm/app.dart';
import 'package:political_booth_crm/features/auth/login_page.dart';
import 'package:political_booth_crm/layout/app_layout.dart';
import 'package:political_booth_crm/widgets/voter_phonebook.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('login screen renders CRM title and login button',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const CongressBoothApp());
    await tester.pumpAndSettle();

    expect(find.byType(LoginPage), findsOneWidget);
  });

  testWidgets('mobile header stays responsive and opens its drawer at 320px',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          drawer: const Drawer(child: Text('Navigation drawer')),
          body: Builder(
            builder: (context) => const MobileHeader(
              title: 'बहुत लंबा मतदाता प्रबंधन शीर्षक',
            ),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('header-menu')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('header-menu')));
    await tester.pumpAndSettle();
    expect(find.text('Navigation drawer'), findsOneWidget);
  });

  testWidgets('mobile header handles large accessibility text', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          drawer: const Drawer(child: SizedBox()),
          body: Builder(
            builder: (context) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: const TextScaler.linear(1.6),
              ),
              child: const MobileHeader(title: 'मतदाता'),
            ),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('header-notifications')), findsOneWidget);
  });

  testWidgets('voter phone row stays usable at 320px with photo fallback',
      (tester) async {
    var profileOpened = false;
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: VoterPhoneTile(
            voter: const {
              'name': 'रामलाल शर्मा',
              'guardianName': 'मोहनलाल शर्मा',
              'mobile': '9876543210',
              'voterId': 'ABC1234567',
              'houseNumber': '42',
              'photo': '',
            },
            onTap: () => profileOpened = true,
            trailing: FilledButton(
              onPressed: () {},
              child: const Text('चुनें'),
            ),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('रामलाल शर्मा'), findsOneWidget);
    expect(find.text('चुनें'), findsOneWidget);
    expect(find.byType(VoterAvatar), findsOneWidget);
    await tester.tap(find.text('रामलाल शर्मा'));
    expect(profileOpened, isTrue);
  });

  testWidgets('phonebook call and WhatsApp actions fit a small phone',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: VoterPhoneTile(voter: {
            'name': 'सीमा देवी',
            'guardianName': 'रमेश कुमार',
            'mobile': '9876543210',
            'voterId': 'XYZ1234567',
            'houseNumber': '18',
            'photo': '',
          }),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.byIcon(Icons.call_rounded), findsOneWidget);
    expect(find.byIcon(Icons.chat_rounded), findsOneWidget);
  });
}
