const fs = require('fs');

// The 29 Official Gram Panchayats of Raipur Panchayat Samiti from the 3-page official PDF
const raipurOfficialPanchayats = [
  {
    name: 'भींटा',
    pop: 4872,
    wards: 11,
    villages: [
      { name: 'भींटा', pop: 1231 },
      { name: 'सेमलाट', pop: 57 },
      { name: 'रूपाखेड़ा', pop: 619 },
      { name: 'सरेवड़ी', pop: 1191 },
      { name: 'सरेवड़ी का बाड़ीया', pop: 0 },
      { name: 'जोरावरपुरा', pop: 315 },
      { name: 'भटेवर', pop: 1459 }
    ]
  },
  {
    name: 'कलालखेड़ी',
    pop: 2868,
    wards: 7,
    villages: [
      { name: 'थोरियाखेड़ा', pop: 711 },
      { name: 'कलालखेड़ी', pop: 918 },
      { name: 'बाड़ी', pop: 1239 }
    ]
  },
  {
    name: 'पीथाकाखेड़ा',
    pop: 4354,
    wards: 11,
    villages: [
      { name: 'पीथाकाखेड़ा', pop: 1140 },
      { name: 'मंडोल', pop: 619 },
      { name: 'ढिकाणी', pop: 148 },
      { name: 'रामा', pop: 1171 },
      { name: 'लड़की', pop: 1276 }
    ]
  },
  {
    name: 'खेमाणा',
    pop: 2709,
    wards: 9,
    villages: [
      { name: 'खेमाणा', pop: 2327 },
      { name: 'खरडाया', pop: 0 },
      { name: 'थोरियाखेड़ा', pop: 382 }
    ]
  },
  {
    name: 'चारोट',
    pop: 2926,
    wards: 7,
    villages: [
      { name: 'चारोट', pop: 904 },
      { name: 'आसूणा', pop: 715 },
      { name: 'गोविन्दपुरा', pop: 431 },
      { name: 'किशोरपुरा', pop: 251 },
      { name: 'सिंहपुरा', pop: 625 }
    ]
  },
  {
    name: 'गल्यावड़ी',
    pop: 2791,
    wards: 7,
    villages: [
      { name: 'गल्यावड़ी', pop: 1652 },
      { name: 'केमुनिया', pop: 561 },
      { name: 'पचातरों का खेड़ा', pop: 578 }
    ]
  },
  {
    name: 'खाखरमाला',
    pop: 2837,
    wards: 7,
    villages: [
      { name: 'रेबारियों की ढाणी', pop: 400 },
      { name: 'खाखरमाला', pop: 603 },
      { name: 'नान्दूड़ा', pop: 275 },
      { name: 'टुंगच', pop: 1035 },
      { name: 'सिरोड़ी', pop: 524 }
    ]
  },
  {
    name: 'गलवा',
    pop: 2896,
    wards: 7,
    villages: [
      { name: 'गलवा', pop: 1555 },
      { name: 'सज्जनपुरा', pop: 0 },
      { name: 'रालीखेड़ा', pop: 308 },
      { name: 'लाठियाखेड़ी', pop: 217 },
      { name: 'टोकरा', pop: 816 },
      { name: 'रतनपुरा', pop: 0 }
    ]
  },
  {
    name: 'मोखुन्दा',
    pop: 3327,
    wards: 9,
    villages: [
      { name: 'मोखुन्दा', pop: 2751 },
      { name: 'तेलीखेड़ा', pop: 0 },
      { name: 'माण्डकाखेड़ा', pop: 576 }
    ]
  },
  {
    name: 'मासिंगपुरा',
    pop: 2797,
    wards: 7,
    villages: [
      { name: 'मासिंगपुरा', pop: 1250 },
      { name: 'डांगडा', pop: 380 },
      { name: 'डांगडी', pop: 779 },
      { name: 'ठिकरिया', pop: 388 }
    ]
  },
  {
    name: 'झाड़ोल',
    pop: 3741,
    wards: 9,
    villages: [
      { name: 'झाड़ोल', pop: 3430 },
      { name: 'नयाखेड़ा', pop: 311 }
    ]
  },
  {
    name: 'नाहरी',
    pop: 3050,
    wards: 9,
    villages: [
      { name: 'नाहरी', pop: 3050 },
      { name: 'फतेहपुरा', pop: 0 },
      { name: 'दुल्हेपुरा', pop: 0 }
    ]
  },
  {
    name: 'पनोतिया',
    pop: 2961,
    wards: 7,
    villages: [
      { name: 'जोगरास', pop: 1666 },
      { name: 'पनोतिया', pop: 1295 }
    ]
  },
  {
    name: 'नाथड़ियास',
    pop: 2999,
    wards: 7,
    villages: [
      { name: 'नाथड़ियास', pop: 2362 },
      { name: 'मोटरों का खेड़ा', pop: 0 },
      { name: 'आसपुर', pop: 637 }
    ]
  },
  {
    name: 'थला',
    pop: 3651,
    wards: 9,
    villages: [
      { name: 'थला', pop: 1980 },
      { name: 'मोखमपुरा', pop: 1114 },
      { name: 'पिथलपुरा', pop: 557 }
    ]
  },
  {
    name: 'सुरास',
    pop: 2771,
    wards: 7,
    villages: [
      { name: 'सुरास', pop: 1179 },
      { name: 'लक्ष्मीपुरा', pop: 0 },
      { name: 'धुलखेड़ा', pop: 1387 },
      { name: 'भीलखेड़ी', pop: 205 }
    ]
  },
  {
    name: 'बागोलिया',
    pop: 3144,
    wards: 9,
    villages: [
      { name: 'बागोलिया', pop: 1444 },
      { name: 'अंजनगढ़', pop: 128 },
      { name: 'गाड़रीखेड़ा', pop: 852 },
      { name: 'पाटियाखेड़ा', pop: 720 }
    ]
  },
  {
    name: 'पालरां',
    pop: 2685,
    wards: 7,
    villages: [
      { name: 'पालरां', pop: 2346 },
      { name: 'खाननिया', pop: 339 }
    ]
  },
  {
    name: 'बोराणा',
    pop: 4616,
    wards: 11,
    villages: [
      { name: 'बोराणा', pop: 4616 }
    ]
  },
  {
    name: 'आशाहोली',
    pop: 3156,
    wards: 9,
    villages: [
      { name: 'आशाहोली', pop: 3156 }
    ]
  },
  {
    name: 'बकाण',
    pop: 2715,
    wards: 7,
    villages: [
      { name: 'लखाहोली', pop: 475 },
      { name: 'बकाण', pop: 808 },
      { name: 'राणास', pop: 1039 },
      { name: 'दियास', pop: 393 }
    ]
  },
  {
    name: 'नान्दशा जागीर',
    pop: 4264,
    wards: 11,
    villages: [
      { name: 'नान्दशा जागीर', pop: 2265 },
      { name: 'परबती', pop: 544 },
      { name: 'बाड़ियाकलां', pop: 590 },
      { name: 'बाड़ियाखुर्द', pop: 865 }
    ]
  },
  {
    name: 'बोरियापुरा',
    pop: 2491,
    wards: 7,
    villages: [
      { name: 'बोरियापुरा', pop: 1547 },
      { name: 'रेवाड़ा', pop: 629 },
      { name: 'शिवनाथपुरा', pop: 315 },
      { name: 'तोलास', pop: 0 }
    ]
  },
  {
    name: 'सगरेव',
    pop: 3601,
    wards: 9,
    villages: [
      { name: 'सगरेव', pop: 3087 },
      { name: 'नयाखेड़ा जाटान', pop: 0 },
      { name: 'जगपुरा', pop: 514 }
    ]
  },
  {
    name: 'नारायणखेड़ा',
    pop: 3049,
    wards: 9,
    villages: [
      { name: 'नारायणखेड़ा', pop: 828 },
      { name: 'सरंगु', pop: 202 },
      { name: 'खुटियां', pop: 949 },
      { name: 'आम्बाखेड़ा', pop: 369 },
      { name: 'तेज्याखेड़ी', pop: 376 },
      { name: 'खुटियांखेड़ा', pop: 325 }
    ]
  },
  {
    name: 'देवरिया',
    pop: 2902,
    wards: 7,
    villages: [
      { name: 'देवरिया', pop: 2902 },
      { name: 'मानपुरा', pop: 0 }
    ]
  },
  {
    name: 'कोट',
    pop: 3063,
    wards: 9,
    villages: [
      { name: 'कोट', pop: 2001 },
      { name: 'छातोल', pop: 411 },
      { name: 'मेरनियाखेड़ा', pop: 651 }
    ]
  },
  {
    name: 'बागड़',
    pop: 3261,
    wards: 9,
    villages: [
      { name: 'बागड़', pop: 1199 },
      { name: 'मंडी', pop: 493 },
      { name: 'मियाला', pop: 854 },
      { name: 'जलामली', pop: 546 },
      { name: 'कारोल', pop: 169 }
    ]
  },
  {
    name: 'रायपुर',
    pop: 7372,
    wards: 17,
    villages: [
      { name: 'रायपुर', pop: 7372 },
      { name: 'सुरजपुरा', pop: 0 }
    ]
  }
];

// Save this master configuration
fs.writeFileSync('./backend/src/config/raipurOfficial29Panchayats.json', JSON.stringify(raipurOfficialPanchayats, null, 2), 'utf8');
console.log('✅ Created raipurOfficial29Panchayats.json with 29 Panchayats and 251 Wards!');
