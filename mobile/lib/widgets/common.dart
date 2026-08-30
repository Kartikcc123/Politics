import 'package:flutter/material.dart';

import '../core/theme.dart';

class Panel extends StatelessWidget {
  const Panel({super.key, required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w900, color: navy)),
            const SizedBox(height: 14),
            child,
          ]),
        ),
      );
}

class LayoutGrid extends StatelessWidget {
  const LayoutGrid({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.of(context).size.width > 1000;
    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: children
          .map((c) => SizedBox(
              width: wide
                  ? (MediaQuery.of(context).size.width - 310) / 2
                  : double.infinity,
              child: c))
          .toList(),
    );
  }
}

class SimpleRow extends StatelessWidget {
  const SimpleRow(this.left, this.right, {super.key});
  final String left;
  final String right;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          Expanded(child: Text(left)),
          Text(right, style: const TextStyle(fontWeight: FontWeight.w900))
        ]),
      );
}

class SimpleMetric extends StatelessWidget {
  const SimpleMetric(this.icon, this.label, this.value, {super.key});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        CircleAvatar(
            backgroundColor: Colors.green.withValues(alpha: .1),
            child: Icon(icon, color: Colors.green)),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label),
          Text(value,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18))
        ]),
      ]);
}

class FutureBlock<T> extends StatefulWidget {
  const FutureBlock({super.key, required this.load, required this.builder});

  final Future<T> Function() load;
  final Widget Function(T data) builder;

  @override
  State<FutureBlock<T>> createState() => _FutureBlockState<T>();
}

class _FutureBlockState<T> extends State<FutureBlock<T>> {
  late Future<T> future;

  @override
  void initState() {
    super.initState();
    future = widget.load();
  }

  void retry() => setState(() => future = widget.load());

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
        future: future,
        builder: (_, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(30),
                child: CircularProgressIndicator(),
              ),
            );
          }
          if (snap.hasError) {
            return Center(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 420),
                margin: const EdgeInsets.all(20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xffffd4d4)),
                ),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.cloud_off_rounded,
                      size: 42, color: Colors.redAccent),
                  const SizedBox(height: 10),
                  const Text('डेटा लोड नहीं हो पाया',
                      style:
                          TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text('${snap.error}',
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: retry,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('फिर से कोशिश करें'),
                  ),
                ]),
              ),
            );
          }
          return widget.builder(snap.data as T);
        },
      );
}
