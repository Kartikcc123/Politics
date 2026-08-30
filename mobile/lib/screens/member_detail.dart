import 'package:flutter/material.dart';

class MemberDetail extends StatelessWidget {
  final Map member;
  const MemberDetail({super.key, required this.member});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${member['name'] ?? ''}')),
      body: Padding(
        padding: EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (member['photo'] != null) Image.network(member['photo']),
          Text('${member['name']} ${member['surname']}',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          Text('Mobile: ${member['mobile'] ?? ''}'),
          Text('Address: ${member['address'] ?? ''}'),
          Text('Party: ${member['party']?['name'] ?? ''}'),
        ]),
      ),
    );
  }
}
