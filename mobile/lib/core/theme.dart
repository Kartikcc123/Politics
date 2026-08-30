import 'package:flutter/material.dart';

const blue = Color(0xff1457f5);
const royalBlue = Color(0xff073bb5);
const navy = Color(0xff071b4b);
const deepNavy = Color(0xff03122b);
const bg = Color(0xfff7f9fd);
const border = Color(0xffdde5f3);
const muted = Color(0xff667394);
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
      centerTitle: false,
      titleTextStyle:
          TextStyle(color: navy, fontSize: 18, fontWeight: FontWeight.w900),
      surfaceTintColor: Colors.transparent,
    ),
    dividerTheme: const DividerThemeData(color: Color(0xffedf0f5), space: 1),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      showDragHandle: false,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: deepNavy,
      contentTextStyle:
          const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: softBlue,
      labelTextStyle: WidgetStatePropertyAll(
        TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: navy),
      ),
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
      shadowColor: const Color(0x14071b4b),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xffe8edf5)),
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
