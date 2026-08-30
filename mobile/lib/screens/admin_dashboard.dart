import 'package:flutter/material.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Admin Dashboard')),
      body: Padding(
        padding: EdgeInsets.all(12),
        child: Column(children: [
          Card(
              child:
                  ListTile(title: Text('Total Wards'), subtitle: Text('12'))),
          Card(
              child:
                  ListTile(title: Text('Total Booths'), subtitle: Text('120'))),
          Card(
              child: ListTile(
                  title: Text('Total Members'), subtitle: Text('4,230'))),
        ]),
      ),
    );
  }
}
