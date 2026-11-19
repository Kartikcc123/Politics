import 'package:flutter/material.dart';

const blue = Color(0xff2563EB);
const royalBlue = Color(0xff1D4ED8);
const navy = Color(0xff0F172A);
const deepNavy = Color(0xff020617);
const bg = Color(0xffF8FAFC);
const border = Color(0xffE2E8F0);
const muted = Color(0xff64748B);
const green = Color(0xff19a957);
const orange = Color(0xffff8500);
const purple = Color(0xff7a3ff2);
const rose = Color(0xffff3868);
const sky = Color(0xff35b8ff);
const softBlue = Color(0xffedf4ff);
const softGreen = Color(0xffeaf8f0);
const softOrange = Color(0xfffff4e7);

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: 'NotoSansDevanagari',
    scaffoldBackgroundColor: bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: blue,
      primary: blue,
      surface: Colors.white,
    ),
    iconTheme: const IconThemeData(color: navy, size: 22),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle:
          TextStyle(color: navy, fontSize: 17, fontWeight: FontWeight.w800),
      surfaceTintColor: Colors.transparent,
    ),
    dividerTheme: const DividerThemeData(color: Color(0xffE2E8F0), space: 1),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      showDragHandle: false,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xffE2E8F0)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: deepNavy,
      contentTextStyle:
          const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      indicatorColor: softBlue,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: blue, size: 22);
        }
        return const IconThemeData(color: muted, size: 22);
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w800, color: blue);
        }
        return const TextStyle(
            fontSize: 11, fontWeight: FontWeight.w600, color: muted);
      }),
    ),
    textTheme: const TextTheme(
      headlineSmall: TextStyle(color: navy, fontWeight: FontWeight.w800),
      titleLarge: TextStyle(color: navy, fontWeight: FontWeight.w800),
      titleMedium: TextStyle(color: navy, fontWeight: FontWeight.w700),
      bodyMedium: TextStyle(color: navy),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shadowColor: const Color(0x0A0F172A),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xffE2E8F0)),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: navy,
      textColor: navy,
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 3),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(15),
        borderSide: const BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(15),
        borderSide: const BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(15),
        borderSide: const BorderSide(color: blue, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: blue,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: navy,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        side: const BorderSide(color: border),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: softBlue,
      selectedColor: blue.withValues(alpha: .14),
      checkmarkColor: blue,
      labelStyle: const TextStyle(color: navy, fontWeight: FontWeight.w700),
      side: const BorderSide(color: border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
  );
}
