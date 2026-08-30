import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/theme.dart';

class MetricCard extends StatelessWidget {
  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.caption,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? caption;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0f071b4b),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Stack(children: [
          Positioned(
            right: -18,
            top: -20,
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withValues(alpha: .08),
              ),
            ),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    color.withValues(alpha: .16),
                    color.withValues(alpha: .05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(height: 12),
            Text(label,
                maxLines: 2,
                style: const TextStyle(
                    color: navy, fontWeight: FontWeight.w800, fontSize: 12)),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(
                    color: navy, fontWeight: FontWeight.w900, fontSize: 24)),
            if (caption != null) ...[
              const SizedBox(height: 5),
              Text(caption!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      color: color, fontSize: 11, fontWeight: FontWeight.w800)),
            ],
          ]),
        ]),
      );
}

class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.title,
    required this.child,
    this.action,
    this.subtitle,
    this.icon,
  });
  final String title;
  final Widget child;
  final Widget? action;
  final String? subtitle;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0d071b4b),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: LayoutBuilder(builder: (context, constraints) {
          final compact = constraints.maxWidth < 520;
          final titleBlock =
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (icon != null) ...[
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: softBlue,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: blue, size: 20),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          color: navy)),
                  if (subtitle != null) ...[
                    const SizedBox(height: 3),
                    Text(subtitle!,
                        style: const TextStyle(color: muted, fontSize: 12)),
                  ],
                ],
              ),
            ),
          ]);

          final header = action == null
              ? titleBlock
              : compact
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        titleBlock,
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: action!,
                        ),
                      ],
                    )
                  : Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                          Expanded(child: titleBlock),
                          const SizedBox(width: 10),
                          Flexible(child: action!),
                        ]);

          return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                header,
                const SizedBox(height: 16),
                child,
              ]);
        }),
      );
}

class AppHeroBanner extends StatelessWidget {
  const AppHeroBanner({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.trailing,
    this.primaryAction,
    this.secondaryAction,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Widget? trailing;
  final Widget? primaryAction;
  final Widget? secondaryAction;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xff073bb5), Color(0xff1457f5), Color(0xff2196ff)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2b073bb5),
              blurRadius: 24,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _HeroPatternPainter())),
          LayoutBuilder(builder: (context, constraints) {
            final compact = constraints.maxWidth < 620;
            final content = Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .16),
                      border: Border.all(color: Colors.white24),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(icon, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 13),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  height: 1.15)),
                          const SizedBox(height: 6),
                          Text(subtitle,
                              style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                  height: 1.35)),
                        ]),
                  ),
                ]),
                if (primaryAction != null || secondaryAction != null) ...[
                  const SizedBox(height: 16),
                  Wrap(spacing: 10, runSpacing: 10, children: [
                    if (primaryAction != null) primaryAction!,
                    if (secondaryAction != null) secondaryAction!,
                  ]),
                ],
              ],
            );
            if (compact || trailing == null) return content;
            return Row(children: [
              Expanded(child: content),
              const SizedBox(width: 14),
              trailing!,
            ]);
          }),
        ]),
      );
}

class PremiumFeatureHero extends StatelessWidget {
  const PremiumFeatureHero({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.accent = blue,
    this.badges = const [],
    this.action,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color accent;
  final List<String> badges;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xfff5f9ff), Color(0xffdceaff), Color(0xffbdd8ff)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xffcfe0fb)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x171457f5),
              blurRadius: 24,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Stack(children: [
          Positioned(
            right: -28,
            top: -42,
            child: Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: .34),
              ),
            ),
          ),
          Positioned(
            right: 8,
            bottom: -26,
            child: Transform.rotate(
              angle: -.11,
              child: Container(
                width: 86,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .72),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.white),
                ),
                child: Icon(icon, color: accent, size: 43),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 74),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: accent.withValues(alpha: .24),
                      blurRadius: 16,
                      offset: const Offset(0, 7),
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 27),
              ),
              const SizedBox(height: 15),
              Text(title,
                  style: const TextStyle(
                      color: navy,
                      fontSize: 23,
                      height: 1.15,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 7),
              Text(subtitle,
                  style: const TextStyle(
                      color: Color(0xff40557f), fontSize: 13, height: 1.45)),
              if (badges.isNotEmpty) ...[
                const SizedBox(height: 15),
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: badges
                      .map((label) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: .78),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child:
                                Row(mainAxisSize: MainAxisSize.min, children: [
                              const Icon(Icons.check_circle_rounded,
                                  color: green, size: 15),
                              const SizedBox(width: 5),
                              Text(label,
                                  style: const TextStyle(
                                      color: Color(0xff176a3b),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900)),
                            ]),
                          ))
                      .toList(),
                ),
              ],
              if (action != null) ...[
                const SizedBox(height: 16),
                action!,
              ],
            ]),
          ),
        ]),
      );
}

class PremiumSectionTitle extends StatelessWidget {
  const PremiumSectionTitle({
    super.key,
    required this.title,
    required this.icon,
    this.subtitle,
    this.action,
  });
  final String title;
  final String? subtitle;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: softBlue,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, color: blue, size: 19),
          ),
          const SizedBox(width: 10),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                  style: const TextStyle(
                      color: navy, fontSize: 17, fontWeight: FontWeight.w900)),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(subtitle!,
                    style: const TextStyle(color: muted, fontSize: 11)),
              ],
            ]),
          ),
          if (action != null) action!,
        ],
      );
}

class PremiumEmptyState extends StatelessWidget {
  const PremiumEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 42, horizontal: 22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: border),
        ),
        child: Column(children: [
          Container(
            width: 66,
            height: 66,
            decoration:
                const BoxDecoration(shape: BoxShape.circle, color: softBlue),
            child: Icon(icon, color: blue, size: 32),
          ),
          const SizedBox(height: 13),
          Text(title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: navy, fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(color: muted, fontSize: 12)),
          if (action != null) ...[
            const SizedBox(height: 16),
            action!,
          ],
        ]),
      );
}

class VisualSummaryCard extends StatelessWidget {
  const VisualSummaryCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Container(
        width: 154,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .96),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: .4)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(
            backgroundColor: color.withValues(alpha: .12),
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 12),
          Text(title,
              style: const TextStyle(
                  color: navy, fontSize: 11, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  color: navy, fontSize: 22, fontWeight: FontWeight.w900)),
          if (subtitle != null)
            Text(subtitle!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: muted, fontSize: 10)),
        ]),
      );
}

class QuickActionTile extends StatelessWidget {
  const QuickActionTile({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.subtitle,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            constraints: const BoxConstraints(minHeight: 78),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            child: Row(children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: .1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                    Text(label,
                        style: const TextStyle(
                            color: navy,
                            fontWeight: FontWeight.w900,
                            fontSize: 13)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 3),
                      Text(subtitle!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: muted, fontSize: 11)),
                    ],
                  ])),
              const Icon(Icons.chevron_right_rounded, color: Color(0xff9aa8c0)),
            ]),
          ),
        ),
      );
}

class EmptyIllustration extends StatelessWidget {
  const EmptyIllustration({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  final IconData icon;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 16),
        child: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 78,
              height: 78,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(colors: [softBlue, Color(0xffffffff)]),
              ),
              child: Icon(icon, color: blue, size: 34),
            ),
            const SizedBox(height: 12),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: navy, fontSize: 15, fontWeight: FontWeight.w900)),
            if (subtitle != null) ...[
              const SizedBox(height: 5),
              Text(subtitle!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: muted, fontSize: 12)),
            ],
          ]),
        ),
      );
}

class DonutChart extends StatelessWidget {
  const DonutChart(
      {super.key,
      required this.values,
      required this.colors,
      required this.center});
  final List<double> values;
  final List<Color> colors;
  final String center;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 160,
        height: 160,
        child: CustomPaint(
          painter: _DonutPainter(values, colors),
          child: Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('कुल', style: TextStyle(color: muted, fontSize: 12)),
              Text(center,
                  style: const TextStyle(
                      color: navy, fontSize: 20, fontWeight: FontWeight.w900)),
            ]),
          ),
        ),
      );
}

class _DonutPainter extends CustomPainter {
  _DonutPainter(this.values, this.colors);
  final List<double> values;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    final total = values.fold<double>(0, (sum, value) => sum + value);
    final rect = Offset.zero & size;
    var start = -math.pi / 2;
    for (var i = 0; i < values.length; i++) {
      final sweep = total == 0 ? 0.0 : values[i] / total * math.pi * 2;
      canvas.drawArc(
        rect.deflate(18),
        start,
        sweep,
        false,
        Paint()
          ..color = colors[i % colors.length]
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeWidth = 28,
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      oldDelegate.values != values;
}

class PartyPreferenceChip extends StatelessWidget {
  const PartyPreferenceChip({super.key, required this.value, this.size = 30});

  final String value;
  final double size;

  @override
  Widget build(BuildContext context) {
    final label = switch (value) {
      'congress' => 'Congress',
      'bjp' => 'BJP',
      'nota' => 'NOTA',
      'other' => 'अन्य पार्टी',
      _ => 'पार्टी तय नहीं',
    };
    final asset = switch (value) {
      'congress' => 'assets/party/congress.png',
      'bjp' => 'assets/party/bjp.png',
      'nota' => 'assets/party/nota.png',
      _ => null,
    };
    final mark = asset == null
        ? Icon(
            value == 'other'
                ? Icons.how_to_vote_outlined
                : Icons.help_outline_rounded,
            size: size,
            color: value == 'other' ? purple : muted,
          )
        : Image.asset(
            asset,
            width: size,
            height: size,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.medium,
          );
    return Tooltip(
      message: label,
      child: Semantics(
        label: label,
        image: true,
        child: SizedBox(width: size, height: size, child: mark),
      ),
    );
  }
}
class SupportChip extends StatelessWidget {
  const SupportChip({super.key, required this.value});
  final String value;

  @override
  Widget build(BuildContext context) {
    final config = switch (value) {
      'supporter' => (
          Icons.star_rounded,
          green,
          const Color(0xffeaf8f0),
          'समर्थक'
        ),
      'opposite' => (
          Icons.circle_rounded,
          rose,
          const Color(0xffffedf1),
          'विरोधी'
        ),
      'neutral' => (
          Icons.square_rounded,
          orange,
          const Color(0xfffff3e7),
          'तटस्थ'
        ),
      _ => (
          Icons.change_history_rounded,
          rose,
          const Color(0xffffedf1),
          'अनिर्णीत'
        ),
    };
    return Semantics(
      label: config.$4,
      child: Container(
        width: 32,
        height: 32,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: config.$3,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(config.$1, color: config.$2, size: 20),
      ),
    );
  }
}

class _HeroPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final circle = Paint()..color = Colors.white.withValues(alpha: .08);
    canvas.drawCircle(Offset(size.width - 36, 18), 58, circle);
    canvas.drawCircle(Offset(size.width - 120, size.height + 18), 86, circle);
    final line = Paint()
      ..color = Colors.white.withValues(alpha: .08)
      ..strokeWidth = 1.2;
    for (var i = 0; i < 6; i++) {
      final y = 24.0 + i * 24;
      canvas.drawLine(
          Offset(size.width * .58, y), Offset(size.width, y + 44), line);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
