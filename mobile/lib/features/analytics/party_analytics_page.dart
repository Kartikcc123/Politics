import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../layout/app_layout.dart';
import '../../widgets/common.dart';

class PartyAnalyticsPage extends StatefulWidget {
  const PartyAnalyticsPage({super.key});

  @override
  State<PartyAnalyticsPage> createState() => _PartyAnalyticsPageState();
}

class _PartyAnalyticsPageState extends State<PartyAnalyticsPage> {
  String groupBy = 'gramPanchayat'; // 'gramPanchayat', 'village', 'ward'
  String search = '';
  final searchController = TextEditingController();
  int refreshKey = 0;

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  void refresh() {
    setState(() => refreshKey++);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBlock<Map<String, dynamic>>(
      key: ValueKey('party-analytics-$groupBy-$refreshKey'),
      load: () async {
        final res = await api.get('/api/members/party-analytics?groupBy=$groupBy');
        return Map<String, dynamic>.from(res as Map);
      },
      builder: (data) {
        final totals = Map<String, dynamic>.from(data['totals'] ?? {});
        final breakdownRaw = (data['breakdown'] as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();

        final filtered = search.trim().isEmpty
            ? breakdownRaw
            : breakdownRaw
                .where((item) => '${item['name']}'
                    .toLowerCase()
                    .contains(search.trim().toLowerCase()))
                .toList();

        return AppPage(
          children: [
            _headerCard(totals),
            const SizedBox(height: 12),
            _scopeToggle(),
            const SizedBox(height: 12),
            _searchBar(),
            const SizedBox(height: 12),
            if (filtered.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text(
                    'कोई डेटा नहीं मिला',
                    style: TextStyle(color: muted, fontSize: 16),
                  ),
                ),
              )
            else
              ...filtered.map((item) => _breakdownCard(item)),
          ],
        );
      },
    );
  }

  Widget _headerCard(Map<String, dynamic> totals) {
    final totalVoters = totals['totalVoters'] ?? 0;
    final congress = totals['congress'] ?? 0;
    final bjp = totals['bjp'] ?? 0;
    final undecided = totals['undecided'] ?? 0;
    final voted = totals['voted'] ?? 0;
    final pending = totals['pendingVotes'] ?? 0;

    final lead = congress - bjp;
    final leadText = lead > 0
        ? '✋ कांग्रेस +$lead बढ़त पर'
        : (lead < 0 ? '🪷 भाजपा +${lead.abs()} बढ़त पर' : 'बराबर (Tie)');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [deepNavy, royalBlue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: royalBlue.withValues(alpha: .3),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.analytics_rounded, color: Colors.white, size: 24),
                  SizedBox(width: 8),
                  Text(
                    'लाइव पार्टी गणना व विश्लेषण',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
                onPressed: refresh,
                tooltip: 'रिफ्रेश करें',
              ),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              leadText,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _metricBox('कुल मतदाता', '$totalVoters', Colors.white),
              const SizedBox(width: 8),
              _metricBox('✋ कांग्रेस', '$congress', const Color(0xff4ade80)),
              const SizedBox(width: 8),
              _metricBox('🪷 भाजपा', '$bjp', const Color(0xfff87171)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _metricBox('अनिर्णीत', '$undecided', Colors.white70),
              const SizedBox(width: 8),
              _metricBox('🗳️ वोट डले', '$voted', const Color(0xff60a5fa)),
              const SizedBox(width: 8),
              _metricBox('बाकी वोट', '$pending', Colors.white70),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricBox(String title, String value, Color valColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: .15)),
        ),
        child: Column(
          children: [
            Text(
              title,
              style: const TextStyle(color: Colors.white70, fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                color: valColor,
                fontWeight: FontWeight.w900,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _scopeToggle() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          _toggleBtn('ग्राम पंचायत', 'gramPanchayat'),
          _toggleBtn('गाँव अनुसार', 'village'),
          _toggleBtn('वार्ड अनुसार', 'ward'),
        ],
      ),
    );
  }

  Widget _toggleBtn(String label, String value) {
    final isSel = groupBy == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => groupBy = value),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSel ? blue : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSel ? Colors.white : navy,
              fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _searchBar() {
    return TextField(
      controller: searchController,
      onChanged: (v) => setState(() => search = v),
      decoration: InputDecoration(
        hintText: groupBy == 'village'
            ? 'गाँव का नाम खोजें...'
            : (groupBy == 'ward' ? 'वार्ड खोजें...' : 'ग्राम पंचायत खोजें...'),
        prefixIcon: const Icon(Icons.search_rounded, color: muted),
        suffixIcon: search.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.clear_rounded),
                onPressed: () {
                  searchController.clear();
                  setState(() => search = '');
                },
              )
            : null,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: border),
        ),
      ),
    );
  }

  Widget _breakdownCard(Map<String, dynamic> item) {
    final name = '${item['name']}';
    final total = item['totalVoters'] ?? 0;
    final congress = item['congress'] ?? 0;
    final bjp = item['bjp'] ?? 0;
    final undecided = item['undecided'] ?? 0;
    final voted = item['voted'] ?? 0;

    final congPct = total > 0 ? ((congress / total) * 100).toStringAsFixed(1) : '0';
    final bjpPct = total > 0 ? ((bjp / total) * 100).toStringAsFixed(1) : '0';
    final votedPct = total > 0 ? ((voted / total) * 100).toStringAsFixed(1) : '0';

    final margin = congress - bjp;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: border),
      ),
      elevation: 0,
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: navy,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: margin > 0
                        ? const Color(0xffecfdf5)
                        : (margin < 0 ? const Color(0xfffef2f2) : bg),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: margin > 0
                          ? green.withValues(alpha: .3)
                          : (margin < 0 ? rose.withValues(alpha: .3) : border),
                    ),
                  ),
                  child: Text(
                    margin > 0
                        ? '✋ +$margin Lead'
                        : (margin < 0 ? '🪷 +${margin.abs()} Lead' : 'बराबर'),
                    style: TextStyle(
                      color: margin > 0 ? green : (margin < 0 ? rose : muted),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Text(
                  'कुल मतदाता: $total',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const Spacer(),
                Text(
                  'वोट डले: $voted ($votedPct%)',
                  style: const TextStyle(color: blue, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: SizedBox(
                height: 10,
                child: Row(
                  children: [
                    if (congress > 0)
                      Expanded(
                        flex: congress,
                        child: Container(color: const Color(0xff16a34a)),
                      ),
                    if (bjp > 0)
                      Expanded(
                        flex: bjp,
                        child: Container(color: const Color(0xffdc2626)),
                      ),
                    if (undecided > 0)
                      Expanded(
                        flex: undecided,
                        child: Container(color: const Color(0xffcbd5e1)),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('✋ कांग्रेस: $congress ($congPct%)',
                    style: const TextStyle(color: Color(0xff16a34a), fontSize: 12, fontWeight: FontWeight.w600)),
                Text('🪷 भाजपा: $bjp ($bjpPct%)',
                    style: const TextStyle(color: Color(0xffdc2626), fontSize: 12, fontWeight: FontWeight.w600)),
                Text('⚪ अनिर्णीत: $undecided',
                    style: const TextStyle(color: muted, fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
