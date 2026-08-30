import 'package:flutter/material.dart';

class BoothDashboard extends StatelessWidget {
  const BoothDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Booth Dashboard')),
      body: Padding(
        padding: EdgeInsets.all(12),
        child: Column(children: [
          Card(
              child: ListTile(
                  title: Text('Assigned Booth'), subtitle: Text('Booth 12'))),
          Card(
              child:
                  ListTile(title: Text('Todays Visits'), subtitle: Text('8'))),
        ]),
      ),
    );
  }
}
