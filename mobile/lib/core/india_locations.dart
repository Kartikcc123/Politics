library;

/// Comprehensive dataset of Indian States and major Cities/Districts
/// for quick and easy dropdown selection in Political Booth Management app.

class IndiaLocations {
  static const List<String> states = [
    'राजस्थान (Rajasthan)',
    'गुजरात (Gujarat)',
    'मध्य प्रदेश (Madhya Pradesh)',
    'महाराष्ट्र (Maharashtra)',
    'उत्तर प्रदेश (Uttar Pradesh)',
    'दिल्ली (Delhi)',
    'हरियाणा (Haryana)',
    'पंजाब (Punjab)',
    'कर्नाटक (Karnataka)',
    'तमिलनाडु (Tamil Nadu)',
    'तेलंगाना (Telangana)',
    'आंध्र प्रदेश (Andhra Pradesh)',
    'बिहार (Bihar)',
    'पश्चिम बंगाल (West Bengal)',
    'उत्तराखंड (Uttarakhand)',
    'हिमाचल प्रदेश (Himachal Pradesh)',
    'झारखंड (Jharkhand)',
    'छत्तीसगढ़ (Chhattisgarh)',
    'ओडिशा (Odisha)',
    'असम (Assam)',
    'केरल (Kerala)',
    'जम्मू और कश्मीर (Jammu & Kashmir)',
    'गोवा (Goa)',
    'अन्य (Other)'
  ];

  static const Map<String, List<String>> citiesByState = {
    'राजस्थान (Rajasthan)': [
      'भीलवाड़ा (Bhilwara)',
      'गंगापुर (Gangapur)',
      'सहाड़ा (Sahada)',
      'रायपुर (Raipur)',
      'आसींद (Asind)',
      'मांडल (Mandal)',
      'शाहपुरा (Shahpura)',
      'कोटड़ी (Kotri)',
      'जहाजपुर (Jahazpur)',
      'बिजौलिया (Bijolia)',
      'माण्डलगढ़ (Mandalgarh)',
      'जयपुर (Jaipur)',
      'जोधपुर (Jodhpur)',
      'उदयपुर (Udaipur)',
      'कोटा (Kota)',
      'अजमेर (Ajmer)',
      'बीकानेर (Bikaner)',
      'चित्तौड़गढ़ (Chittorgarh)',
      'राजसमंद (Rajsamand)',
      'पाली (Pali)',
      'नागौर (Nagaur)',
      'अलवर (Alwar)',
      'भरतपुर (Bharatpur)',
      'सीकर (Sikar)',
      'झुंझुनू (Jhunjhunu)',
      'टोंक (Tonk)',
      'बाड़मेर (Barmer)',
      'जैसलमेर (Jaisalmer)',
      'जालौर (Jalore)',
      'सिरोही (Sirohi)',
      'डूंगरपुर (Dungarpur)',
      'बांसवाड़ा (Banswara)',
      'प्रतापगढ़ (Pratapgarh)',
      'दौसा (Dausa)',
      'सवाई माधोपुर (Sawai Madhopur)',
      'धौलपुर (Dholpur)',
      'करौली (Karauli)',
      'बूंदी (Bundi)',
      'बारां (Baran)',
      'झालावाड़ (Jhalawar)',
      'चूरू (Churu)',
      'श्रीगंगानगर (Sri Ganganagar)',
      'हनुमानगढ़ (Hanumangarh)',
      'अन्य शहर (Other City)'
    ],
    'गुजरात (Gujarat)': [
      'अहमदाबाद (Ahmedabad)',
      'सूरत (Surat)',
      'वडोदरा (Vadodara)',
      'राजकोट (Rajkot)',
      'गांधीनगर (Gandhinagar)',
      'भावनगर (Bhavnagar)',
      'जामनगर (Jamnagar)',
      'जूनागढ़ (Junagadh)',
      'आनंद (Anand)',
      'भरूच (Bharuch)',
      'वापी (Vapi)',
      'नवसारी (Navsari)',
      'हिम्मतनगर (Himmatnagar)',
      'मेहसाणा (Mehsana)',
      'पालनपुर (Palanpur)',
      'अन्य शहर (Other City)'
    ],
    'महाराष्ट्र (Maharashtra)': [
      'मुंबई (Mumbai)',
      'पुणे (Pune)',
      'नागपुर (Nagpur)',
      'ठाणे (Thane)',
      'नासिक (Nashik)',
      'औरंगाबाद (Aurangabad / Chh. Sambhajinagar)',
      'नवी मुंबई (Navi Mumbai)',
      'सोलापुर (Solapur)',
      'कोल्हापुर (Kolhapur)',
      'अमरावती (Amravati)',
      'नांदेड़ (Nanded)',
      'सांगली (Sangli)',
      'जलगांव (Jalgaon)',
      'अहमदनगर (Ahmednagar)',
      'अन्य शहर (Other City)'
    ],
    'मध्य प्रदेश (Madhya Pradesh)': [
      'इंदौर (Indore)',
      'भोपाल (Bhopal)',
      'जबलपुर (Jabalpur)',
      'ग्वालियर (Gwalior)',
      'उज्जैन (Ujjain)',
      'रतलाम (Ratlam)',
      'मंदसौर (Mandsaur)',
      'नीमच (Neemuch)',
      'सागर (Sagar)',
      'देवास (Dewas)',
      'सतना (Satna)',
      'रीवा (Rewa)',
      'अन्य शहर (Other City)'
    ],
    'दिल्ली (Delhi)': [
      'नई दिल्ली (New Delhi)',
      'केंद्रीय दिल्ली (Central Delhi)',
      'उत्तर दिल्ली (North Delhi)',
      'दक्षिण दिल्ली (South Delhi)',
      'पूर्व दिल्ली (East Delhi)',
      'पश्चिम दिल्ली (West Delhi)',
      'द्वारका (Dwarka)',
      'रोहिणी (Rohini)',
      'अन्य (Other)'
    ],
    'उत्तर प्रदेश (Uttar Pradesh)': [
      'लखनऊ (Lucknow)',
      'कानपुर (Kanpur)',
      'नोएडा (Noida)',
      'ग्रेटर नोएडा (Greater Noida)',
      'गाजियाबाद (Ghaziabad)',
      'वाराणसी (Varanasi)',
      'प्रयागराज (Prayagraj)',
      'आगरा (Agra)',
      'मेरठ (Meerut)',
      'मथुरा (Mathura)',
      'बरेली (Bareilly)',
      'गोरखपुर (Gorakhpur)',
      'अन्य शहर (Other City)'
    ],
    'हरियाणा (Haryana)': [
      'गुरुग्राम (Gurugram)',
      'फरीदाबाद (Faridabad)',
      'पानीपत (Panipat)',
      'अंबाला (Ambala)',
      'हिसार (Hisar)',
      'करनाल (Karnal)',
      'रोहतक (Rohtak)',
      'सोनीपत (Sonipat)',
      'पंचकुला (Panchkula)',
      'अन्य शहर (Other City)'
    ],
    'पंजाब (Punjab)': [
      'चंडीगढ़ (Chandigarh)',
      'लुधियाना (Ludhiana)',
      'अमृतसर (Amritsar)',
      'जालंधर (Jalandhar)',
      'पटियाला (Patiala)',
      'बठिंडा (Bathinda)',
      'मोहाली (Mohali)',
      'अन्य शहर (Other City)'
    ],
    'कर्नाटक (Karnataka)': [
      'बेंगलुरु (Bengaluru)',
      'मैसूर (Mysuru)',
      'हुबली (Hubli)',
      'मंगलुरु (Mangaluru)',
      'बेलगाम (Belgaum)',
      'अन्य शहर (Other City)'
    ],
    'तमिलनाडु (Tamil Nadu)': [
      'चेन्नई (Chennai)',
      'कोयंबटूर (Coimbatore)',
      'मदुरै (Madurai)',
      'तिरुचिरापल्ली (Tiruchirappalli)',
      'सलेम (Salem)',
      'अन्य शहर (Other City)'
    ],
    'तेलंगाना (Telangana)': [
      'हैदराबाद (Hyderabad)',
      'सिकंदराबाद (Secunderabad)',
      'वारंगल (Warangal)',
      'अन्य शहर (Other City)'
    ],
    'बिहार (Bihar)': [
      'पटना (Patna)',
      'गया (Gaya)',
      'भागलपुर (Bhagalpur)',
      'मुजफ्फरपुर (Muzaffarpur)',
      'दरभंगा (Darbhanga)',
      'अन्य शहर (Other City)'
    ],
    'पश्चिम बंगाल (West Bengal)': [
      'कोलकाता (Kolkata)',
      'हावड़ा (Howrah)',
      'सिलीगुड़ी (Siliguri)',
      'दुर्गापुर (Durgapur)',
      'आसनसोल (Asansol)',
      'अन्य शहर (Other City)'
    ],
    'उत्तराखंड (Uttarakhand)': [
      'देहरादून (Dehradun)',
      'हरिद्वार (Haridwar)',
      'ऋषिकेश (Rishikesh)',
      'हल्द्वानी (Haldwani)',
      'रुड़की (Roorkee)',
      'अन्य शहर (Other City)'
    ],
  };

  static List<String> getCities(String? stateName) {
    if (stateName == null || stateName.isEmpty) {
      return citiesByState['राजस्थान (Rajasthan)']!;
    }
    for (final entry in citiesByState.entries) {
      if (entry.key == stateName || entry.key.contains(stateName) || stateName.contains(entry.key.split(' ').first)) {
        return entry.value;
      }
    }
    return [
      'अन्य शहर (Other City)',
      'भीलवाड़ा (Bhilwara)',
      'जयपुर (Jaipur)',
      'उदयपुर (Udaipur)',
      'जोधपुर (Jodhpur)',
      'अहमदाबाद (Ahmedabad)',
      'मुंबई (Mumbai)',
      'सूरत (Surat)',
      'दिल्ली (Delhi)'
    ];
  }
}
