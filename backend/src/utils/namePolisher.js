const { decodeSecHindi } = require('./secHindiDecoder');

const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

// Comprehensive English to Hindi transliteration dictionary for voter names
const englishToHindiMap = {
  'anil': 'अनिल',
  'sunil': 'सुनील',
  'suresh': 'सुरेश',
  'ramesh': 'रमेश',
  'mukesh': 'मुकेश',
  'dinesh': 'दिनेश',
  'mahesh': 'महेश',
  'kamlesh': 'कमलेश',
  'rajesh': 'राजेश',
  'naresh': 'नरेश',
  'rakesh': 'राकेश',
  'uderam': 'उदयराम',
  'uderamji': 'उदयराम',
  'magana': 'मंगना',
  'magaña': 'मंगना',
  'magan': 'मगन',
  'revat': 'रेवत',
  'bagtavr': 'बगतावर',
  'bagtawar': 'बगतावर',
  'sohanlal': 'सोहनलाल',
  'ramgni': 'रामगणी',
  'paravin': 'परवीन',
  'parveen': 'परवीन',
  'pravin': 'प्रवीण',
  'gulphsa': 'गुलफशा',
  'gulfsha': 'गुलफशा',
  'asman': 'उस्मान',
  'usman': 'उस्मान',
  'goepi': 'गोपी',
  'gopi': 'गोपी',
  'jagdis': 'जगदीश',
  'jgdish': 'जगदीश',
  'jagdish': 'जगदीश',
  'digesha': 'दिगेश',
  'genaram': 'गेणाराम',
  'rameshwar': 'रामेश्वर',
  'raymal': 'रायमल',
  'parlad': 'प्रहलाद',
  'sviti': 'स्वीटी',
  'sweety': 'स्वीटी',
  'gulafamabegam': 'गुलफाम बेगम',
  'balkrishan': 'बालकृष्ण',
  'prtab': 'प्रताप',
  'pratap': 'प्रताप',
  'nosar': 'नोसर',
  'giravanr': 'गिरवर',
  'girwar': 'गिरवर',
  'deuu': 'देऊ',
  'samta': 'समता',
  'pardip': 'प्रदीप',
  'pradeep': 'प्रदीप',
  'devidas': 'देवीदास',
  'nfisa': 'नफीसा',
  'nafisa': 'नफीसा',
  'mangibogam': 'मांगी बेगम',
  'tirkanl': 'त्रिलोक',
  'fefakaevar': 'पेपा कंवर',
  'sedu': 'सेडू',
  'sawariya': 'सांवरिया',
  'balshankar': 'बालशंकर',
  'indear': 'इन्दर',
  'baxiram': 'बख्शीराम',
  'mainull': 'मैनुद्दीन',
  'hemsingh': 'हेमसिंह',
  'hem': 'हेम',
  'singh': 'सिंह',
  'lal': 'लाल',
  'ram': 'राम',
  'devi': 'देवी',
  'bai': 'बाई',
  'kanwar': 'कंवर',
  'kumar': 'कुमार',
  'kumari': 'कुमारी',
  'sharma': 'शर्मा',
  'verma': 'वर्मा',
  'jain': 'जैन',
  'gupta': 'गुप्ता',
  'sen': 'सेन',
  'darji': 'दर्जी',
  'suthar': 'सुथार',
  'gurjar': 'गुर्जर',
  'jat': 'जाट',
  'rajput': 'राजपूत',
  'salvi': 'सालवी',
  'kumawat': 'कुमावत',
  'prajapat': 'प्रजापत',
  'khatik': 'खटीक',
  'bairwa': 'बैरवा',
  'bhil': 'भील',
  'balai': 'बलाई',
  'meena': 'मीणा',
  'meghwal': 'मेघवाल',
  'soni': 'सोनी',
  'teli': 'तेली',
  'mali': 'माली',
  'vaishnav': 'वैष्णव',
  'parik': 'पारीक',
  'choudhary': 'चौधरी',
  'rathore': 'राठौड़',
  'solanki': 'सोलंकी',
  'panwar': 'पंवार',
  'gehlot': 'गहलोत',
  'chouhan': 'चौहान',
  'radheshyam': 'राधेश्याम',
  'gopal': 'गोपाल',
  'mohan': 'मोहन',
  'sohan': 'सोहन',
  'roshan': 'रोशन',
  'shankar': 'शंकर',
  'laxman': 'लक्ष्मण',
  'ganesh': 'गणेश',
  'kailash': 'कैलाश',
  'om': 'ओम',
  'prakash': 'प्रकाश',
  'ratan': 'रतन',
  'prem': 'प्रेम',
  'kanhaiya': 'कन्हैया',
  'bhagwan': 'भगवान',
  'uday': 'उदय',
  'jamna': 'जमना',
  'subhash': 'सुभाष',
  'rajendra': 'राजेंद्र',
  'surendra': 'सुरेंद्र',
  'narendra': 'नरेंद्र',
  'gajendra': 'गजेंद्र',
  'virendra': 'वीरेंद्र',
  'jitendra': 'जितेंद्र',
  'dharmendra': 'धर्मेंद्र',
  'harendra': 'हरेंद्र',
  'jitu': 'जीतू',
  'sonu': 'सोनू',
  'raju': 'राजू',
  'pintu': 'पिंटू',
  'pappu': 'पप्पू',
  'chetan': 'चेतन',
  'kishan': 'किशन',
  'paras': 'पारस',
  'nena': 'नेना',
  'tulsi': 'तुलसी',
  'chhitar': 'छीतर',
  'tej': 'तेज',
  'suwa': 'सुवा',
  'aasu': 'आसू',
  'khem': 'खेम',
  'kistoor': 'किस्तूर',
  'dal': 'डाल',
  'chatar': 'चतर',
  'bhoj': 'भोज',
  'hari': 'हरि',
  'gokul': 'गोकुल',
  'hazari': 'हजारी',
  'babu': 'बाबू',
  'amba': 'अम्बा',
  'murli': 'मुरली',
  'bansi': 'बंसी',
  'daya': 'दया',
  'chunni': 'चुन्नी',
  'chhoga': 'छोगा',
  'khema': 'खेमा',
  'kalu': 'कालू',
  'nand': 'नंद',
  'amra': 'अमरा',
  'naru': 'नारू',
  'dhanna': 'धन्ना',
  'channa': 'चन्ना',
  'panna': 'पन्ना',
  'duda': 'दूदा',
  'man': 'मान',
  'raghu': 'रघु',
  'baldev': 'बलदेव',
  'achal': 'अचल',
  'sajjan': 'सज्जन',
  'kalyan': 'कल्याण',
  'bhanwar': 'भंवर',
  'bhim': 'भीम',
  'nathu': 'नाथू',
  'balu': 'बालू',
  'mitthu': 'मिट्ठू',
  'nanu': 'नानू',
  'khum': 'खुम',
  'vikram': 'विक्रम',
  'veera': 'वीरा',
  'sanwar': 'सांवर',
  'sampat': 'संपत',
  'keshu': 'केशू',
  'bhagwati': 'भगवती',
  'chuna': 'चुना',
  'mishri': 'मिश्री',
  'amar': 'अमर',
  'gauri': 'गौरी',
  'bhur': 'भूर',
  'ganpat': 'गणपत',
  'murlidhar': 'मुरलीधर',
  'turchi': 'तुलछी',
  'tulchha': 'तुलछा',
  'gangaram': 'गंगाराम',
  'dayaram': 'दयाराम',
  'mishrilal': 'मिश्रीलाल',
  'daulat': 'दौलत',
  'chhotu': 'छोटू',
  'chhogaram': 'छोगाराम',
  'sawai': 'सवाई',
  'babulal': 'बाबूलाल',
  'nathulal': 'नाथूलाल',
  'mangilal': 'मांगीलाल',
  'dudaram': 'दूदाराम',
  'sugni': 'सुगणी',
  'sugna': 'सुगना',
  'kailashi': 'कैलाशी',
  'santok': 'सन्तोक',
  'santosh': 'संतोष',
  'radha': 'राधा',
  'meena': 'मीना',
  'sushila': 'सुशीला',
  'kamla': 'कमला',
  'shanti': 'शान्ति',
  'parsi': 'पारसी',
  'leela': 'लीला',
  'santu': 'संतु',
  'geeta': 'गीता',
  'kesar': 'केसर',
  'anita': 'अनीता',
  'manju': 'मंजू',
  'pushpa': 'पुष्पा',
  'rekha': 'रेखा',
  'bhavna': 'भावना',
  'pooja': 'पूजा',
  'mamta': 'ममता',
  'indra': 'इन्द्रा',
  'sumitra': 'सुमित्रा',
  'tara': 'तारा',
  'kiran': 'किरण',
  'manjari': 'मंजरी',
  'urmila': 'उर्मिला',
  'mangni': 'मंगनी',
  'kanku': 'कंकू',
  'lehri': 'लहरी',
  'dhati': 'धाटी',
  'kamli': 'कमली',
  'hanja': 'हंजा',
  'sowani': 'सोवनी',
  'bagtawari': 'बगतावरी',
  'bali': 'बाली',
  'nahi': 'नाही',
  'sati': 'साती',
  'rupi': 'रूपी',
  'pyari': 'प्यारी',
  'machra': 'मचरा',
  'chhagubai': 'छगुबाई',
  'sudi': 'सुडी',
  'mohni': 'मोहनी',
  'rashtra': 'राष्ट्र',
  'dakhu': 'दाखू',
  'amri': 'अमरी',
  'ghani': 'घणी',
  'rukmani': 'रूकमणी',
  'ramibai': 'रामीबाई',
  'narayani': 'नारायणी',
  'bhanwari': 'भंवरी',
  'kanchan': 'कंचन',
  'tina': 'टीना',
  'pinki': 'पिंकी',
  'sangeeta': 'संगीता',
  'sanju': 'संजू',
  'seema': 'सीमा',
  'deepmala': 'दीपमाला',
  'gheesibai': 'घीसीबाई',
  'tipu': 'टिपू',
  'sukhi': 'सुखी',
  'gangadevi': 'गंगादेवी',
  'fepi': 'फेपी',
  'hiri': 'हीरी',
  'sharda': 'शारदा',
  'nathi': 'नाथी',
  'shanu': 'शानु',
  'seeta': 'सीता',
  'sita': 'सीता',
  'dali': 'डाली',
  'sohanbai': 'सोहनबाई',
  'meera': 'मीरा',
  'mira': 'मीरा',
  'harjubai': 'हरजुबाई',
  'udi': 'उदी',
  'devibai': 'देवीबाई',
  'lehribai': 'लहरीबाई',
  'chandi': 'चांदी',
  'mithu': 'मीठू'
};

function transliterateEnglishToHindi(text) {
  if (!text) return '';
  let str = String(text).trim();

  // If purely English or contains English words, replace word by word
  return str.replace(/[a-zA-ZñÑáéíóúÁÉÍÓÚ]+/g, (word) => {
    const lower = word.toLowerCase();
    if (englishToHindiMap[lower]) {
      return englishToHindiMap[lower];
    }
    // Simple phonetics fallback
    return word;
  });
}

function polishHindiName(rawStr) {
  if (!rawStr) return '';
  let s = String(rawStr).trim();

  // 1. Remove trailing EPIC or serial tokens
  s = s.replace(/\s*(?:[OESR]?\s*\d{1,4})?\s*[A-Z]{2,4}\/?\d{6,10}.*$/gi, '');
  s = s.replace(/\s*RJ\/\d{2}\/\d{2,4}\/\d{5,8}.*$/gi, '');
  s = s.replace(/\s*KDY\d{6,10}.*$/gi, '');
  s = s.replace(/\s*SNE\d{6,10}.*$/gi, '');
  // 2. Decode legacy SEC font glyphs ONLY if raw legacy tokens are present
  if (/(?:लरल|दकरल|कचमर|कपमर|गचजर|लसपह|ससह|बबररर|सपसरर|सरलरल|पसररद|पकरश|भपरर|भररलरल|ररधकश|सपगलतर|सचशल|दकरललरल|नरसबलरल|अजचरन)/.test(s)) {
    s = decodeSecHindi(s);
  }

  // 3. Transliterate English names if any
  s = transliterateEnglishToHindi(s);

  // 4. Inversion / cleanup fixes for common OCR/transcription artifacts
  s = s.replace(/उदोाम/g, 'उदयराम');
  s = s.replace(/धा्म/g, 'धर्म');
  s = s.replace(/नि्द/g, 'नन्द');
  s = s.replace(/कालूेलिया/g, 'कालबेलिया');
  s = s.replace(/सांवािया/g, 'सांवरिया');
  s = s.replace(/बालशंका/g, 'बालशंकर');
  s = s.replace(/इन्दा(?=$|\s)/g, 'इन्दर');
  s = s.replace(/पेपा कंवा(?=$|\s)/g, 'पेपा कंवर');
  s = s.replace(/(?:^|\s)कंवा(?=$|\s)/g, ' कंवर');
  s = s.replace(/रामेश्वा(?=$|\s)/g, 'रामेश्वर');
  s = s.replace(/पाश मल/g, 'पारसमल');

  // Common OCR mangled names:
  s = s.replace(/रतलिाल/g, 'रतनलाल');
  s = s.replace(/किशलिाल/g, 'किशनलाल');
  s = s.replace(/लहाी/g, 'लहरी');
  s = s.replace(/बदाी\s*लाल/g, 'बद्रीलाल');
  s = s.replace(/(?:^|\s)बदाी(?=$|\s)/g, ' बद्री');
  s = s.replace(/शंकाी/g, 'शंकरी');
  s = s.replace(/शंकालाल/g, 'शंकरलाल');
  s = s.replace(/मदलिाल/g, 'मदनलाल');
  s = s.replace(/भंवाी/g, 'भंवरी');
  s = s.replace(/रोशलिाल/g, 'रोशनलाल');
  s = s.replace(/सोहलिाल/g, 'सोहनलाल');
  s = s.replace(/मोहलिाल/g, 'मोहनलाल');
  s = s.replace(/भंवालाल/g, 'भंवरलाल');
  s = s.replace(/सायाी/g, 'सायरी');
  s = s.replace(/(?:^|\s)हालाल(?=$|\s)/g, ' हीरालाल');
  s = s.replace(/रामेश्वालाल/g, 'रामेश्वरलाल');
  s = s.replace(/लादंलाल/g, 'लादूलाल');
  s = s.replace(/(?:^|\s)लादं(?=$|\s)/g, ' लादू');
  s = s.replace(/प्याराचंद/g, 'प्यारचंद');

  // 5. Remove unwanted symbols/digits
  s = s.replace(/^[:\s\-#.,ः~|0-9]+/, '').replace(/[:\s\-#.,ः~|0-9]+$/, '').trim();
  s = s.replace(/[\d_~`!@#$%^&*()+=/\\;:<>{}[\]|"?]/g, ' ');

  // 5. Normalization of corrupted font combinations and OCR errors:
  // Surnames & Castes
  s = s.replace(/(?:^|\s)शा्मा(?=$|\s)/g, ' शर्मा');
  s = s.replace(/(?:^|\s)शमा(?=$|\s)/g, ' शर्मा');
  s = s.replace(/(?:^|\s)शमरर(?=$|\s)/g, ' शर्मा');
  s = s.replace(/(?:^|\s)श्चर्मा(?=$|\s)/g, ' शर्मा');
  s = s.replace(/(?:^|\s)श्षर्मा(?=$|\s)/g, ' शर्मा');
  s = s.replace(/(?:^|\s)क्षर्मा(?=$|\s)/g, ' शर्मा');
  s = s.replace(/(?:^|\s)राधाशर्मा(?=$|\s)/g, ' राधा शर्मा');
  s = s.replace(/(?:^|\s)चंडीदेवशर्मा(?=$|\s)/g, ' चंडी देव शर्मा');
  
  s = s.replace(/(?:^|\s)वा्मा(?=$|\s)/g, ' वर्मा');
  s = s.replace(/(?:^|\s)श्वा्मा(?=$|\s)/g, ' वर्मा');
  s = s.replace(/(?:^|\s)श्वर्मा(?=$|\s)/g, ' वर्मा');
  s = s.replace(/(?:^|\s)पप्पुवर्मा(?=$|\s)/g, ' पप्पू वर्मा');
  s = s.replace(/(?:^|\s)सम्तंलालवा्मा(?=$|\s)/g, ' सन्तलाल वर्मा');

  s = s.replace(/(?:^|\s)सुसार(?=$|\s)/g, ' सुथार');
  s = s.replace(/(?:^|\s)सचररर(?=$|\s)/g, ' सुथार');
  s = s.replace(/(?:^|\s)सतथरर(?=$|\s)/g, ' सुथार');
  
  s = s.replace(/(?:^|\s)चुडंारत(?=$|\s)/g, ' चुंडावत');
  s = s.replace(/(?:^|\s)चुडारत(?=$|\s)/g, ' चुंडावत');
  s = s.replace(/(?:^|\s)रारत(?=$|\s)/g, ' रावत');
  
  s = s.replace(/(?:^|\s)लसग(?=$|\s)/g, ' सिंह');
  s = s.replace(/(?:^|\s)लसपह(?=$|\s)/g, ' सिंह');
  s = s.replace(/(?:^|\s)ससह(?=$|\s)/g, ' सिंह');
  s = s.replace(/(?:^|\s)लसह(?=$|\s)/g, ' सिंह');

  s = s.replace(/(?:^|\s)खतले(?=$|\s)/g, ' खटीक');
  s = s.replace(/(?:^|\s)खतलिक(?=$|\s)/g, ' खटीक');
  s = s.replace(/(?:^|\s)खटभक(?=$|\s)/g, ' खटीक');
  s = s.replace(/(?:^|\s)खटलक(?=$|\s)/g, ' खटीक');
  s = s.replace(/(?:^|\s)रोशलिालखतले(?=$|\s)/g, ' रोशनलाल खटीक');

  s = s.replace(/(?:^|\s)रभषणा(?=$|\s)/g, ' वैष्णव');
  s = s.replace(/(?:^|\s)रभषण(?=$|\s)/g, ' वैष्णव');

  s = s.replace(/(?:^|\s)कच मररत|कचमररत|कप मररत|कपमररत(?=$|\s)/g, ' कुमावत');
  s = s.replace(/(?:^|\s)कच मरर|कचमरर|कप मरर|कपमरर|कुनार|कुसार(?=$|\s)/g, ' कुमार');

  s = s.replace(/(?:^|\s)सपसरर|सरलरल|सालाभ(?=$|\s)/g, ' सालवी');
  s = s.replace(/(?:^|\s)डकबरल(?=$|\s)/g, ' डाकोत');
  s = s.replace(/(?:^|\s)लयहरर|लुह्मार(?=$|\s)/g, ' लोहार');

  // First names & Titles
  s = s.replace(/(?:^|\s)दंलं(?=$|\s)/g, ' दलपत');
  s = s.replace(/(?:^|\s)अजंान(?=$|\s)/g, ' अर्जुन');
  s = s.replace(/(?:^|\s)अजंलल(?=$|\s)/g, ' अंजलि');
  s = s.replace(/(?:^|\s)अजंाि(?=$|\s)/g, ' अंजलि');
  s = s.replace(/(?:^|\s)अजंलि(?=$|\s)/g, ' अंजलि');
  s = s.replace(/(?:^|\s)अजंु|अजंू(?=$|\s)/g, ' अंजू');
  s = s.replace(/(?:^|\s)अजंा(?=$|\s)/g, ' अंजू');
  s = s.replace(/(?:^|\s)अजिच(?=$|\s)/g, ' अनीता');
  s = s.replace(/(?:^|\s)छभंा(?=$|\s)/g, ' छीपा');
  s = s.replace(/(?:^|\s)छभता(?=$|\s)/g, ' छीता');
  s = s.replace(/(?:^|\s)अणछभ(?=$|\s)/g, ' अनछी');
  s = s.replace(/(?:^|\s)भं दं(?=$|\s)/g, ' भंवर');
  
  s = s.replace(/(?:^|\s)प्रह्माद|प्रद्माद(?=$|\s)/g, ' प्रहलाद');
  s = s.replace(/(?:^|\s)मनिष(?=$|\s)/g, ' मनीष');
  s = s.replace(/(?:^|\s)मनिषा(?=$|\s)/g, ' मनीषा');
  s = s.replace(/(?:^|\s)कािश्मा(?=$|\s)/g, ' करिश्मा');
  s = s.replace(/(?:^|\s)अबदंल(?=$|\s)/g, ' अब्दुल');
  s = s.replace(/(?:^|\s)उच्छभकंवर|उच्छबकंवर|उच्छभ|उच्छलकनवर(?=$|\s)/g, ' उत्सव कंवर');
  s = s.replace(/(?:^|\s)धर्माचन|धर्माचंद(?=$|\s)/g, ' धर्मचंद');
  s = s.replace(/(?:^|\s)धर्मारम(?=$|\s)/g, ' धर्माराम');
  s = s.replace(/(?:^|\s)धा्माज(?=$|\s)/g, ' धर्मराज');
  s = s.replace(/(?:^|\s)धा्मानाथ(?=$|\s)/g, ' धर्मनाथ');
  s = s.replace(/(?:^|\s)धा्मा(?=$|\s)/g, ' धर्म');
  s = s.replace(/(?:^|\s)धर्माभील(?=$|\s)/g, ' धर्मा भील');
  s = s.replace(/(?:^|\s)रुक्मादेवी(?=$|\s)/g, ' रुक्मा देवी');
  s = s.replace(/(?:^|\s)जुम्मादेवी(?=$|\s)/g, ' जुम्मा देवी');
  s = s.replace(/(?:^|\s)होक्माकंवर(?=$|\s)/g, ' हुक्मा कंवर');
  s = s.replace(/(?:^|\s)उस्मानामोहम्मद(?=$|\s)/g, ' उस्मान मोहम्मद');
  s = s.replace(/(?:^|\s)उस्मानमोहम्मद(?=$|\s)/g, ' उस्मान मोहम्मद');
  s = s.replace(/(?:^|\s)इस्माइलमौहम्मद(?=$|\s)/g, ' इस्माइल मोहम्मद');
  s = s.replace(/(?:^|\s)इस्माइलखान(?=$|\s)/g, ' इस्माइल खान');
  s = s.replace(/(?:^|\s)इस्मालखान(?=$|\s)/g, ' इस्माइल खान');
  s = s.replace(/(?:^|\s)इस्माल(?=$|\s)/g, ' इस्माइल');
  s = s.replace(/(?:^|\s)इम्मामाबक्श(?=$|\s)/g, ' इमाम बख्श');
  s = s.replace(/(?:^|\s)लकमण(?=$|\s)/g, ' लक्ष्मण');
  s = s.replace(/(?:^|\s)ले्ष्मी(?=$|\s)/g, ' लक्ष्मी');
  s = s.replace(/(?:^|\s)लकमल|लकम(?=$|\s)/g, ' लक्ष्मी');
  s = s.replace(/(?:^|\s)सुामद(?=$|\s)/g, ' सुमेर');
  s = s.replace(/(?:^|\s)रिबि(?=$|\s)/g, ' रवि');
  s = s.replace(/(?:^|\s)महहद(?=$|\s)/g, ' महेंद्र');
  s = s.replace(/(?:^|\s)शूतान(?=$|\s)/g, ' शैतान');
  s = s.replace(/(?:^|\s)सजग्या(?=$|\s)/g, ' सज्जन');
  s = s.replace(/(?:^|\s)परश मल(?=$|\s)/g, ' पारसमल');
  s = s.replace(/(?:^|\s)मनोहा(?=$|\s)/g, ' मनोहर');
  s = s.replace(/(?:^|\s)अमाना(?=$|\s)/g, ' आमिना');

  // Common Hindi typos and ligatures
  s = s.replace(/्+/g, '्');
  s = s.replace(/न््/g, 'न्');
  s = s.replace(/न्\s*्/g, 'न्');
  s = s.replace(/श्ं/g, 'शं');
  s = s.replace(/([ािीुूेैोौ्])\1+/g, '$1');

  // Remaining isolated English or debris
  s = s.replace(/[a-zA-Z]/g, '').trim();
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}

// Export for test and production
module.exports = { polishHindiName, transliterateEnglishToHindi };
