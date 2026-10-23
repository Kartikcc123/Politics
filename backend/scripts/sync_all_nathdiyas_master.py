import os
import sys
import glob
import re
import fitz
import pymongo
import bson

sys.stdout.reconfigure(encoding='utf-8')

MONGO_URI = "mongodb://187.127.173.42:27017/"
DB_NAME = "political_crm"
PDF_DIR = r"C:\Users\pc\Downloads\Nathdiyaas-20261023T120852Z-1-001\Nathdiyaas\Final with Supp2\WithPhoto"

# 104 Verified Voter Definitions for Supp 2
SUPP2_DATA = {
    # Ward 1: Serials 391 to 410
    (1, 391): {"name": "कान्ता वैष्णव", "guardian": "बजरंग दास", "rel": "father", "age": 18, "gender": "female", "house": "4", "caste": "वैष्णव", "subCaste": ""},
    (1, 392): {"name": "मंजू वैष्णव", "guardian": "रामकृष्ण दास", "rel": "husband", "age": 29, "gender": "female", "house": "4", "caste": "वैष्णव", "subCaste": ""},
    (1, 393): {"name": "राधा बैरवा", "guardian": "गोपाल बैरवा", "rel": "husband", "age": 20, "gender": "female", "house": "187", "caste": "बैरवा", "subCaste": ""},
    (1, 394): {"name": "ममता बैरवा", "guardian": "विष्णु बैरवा", "rel": "husband", "age": 25, "gender": "female", "house": "37", "caste": "बैरवा", "subCaste": ""},
    (1, 395): {"name": "आरती सालवी", "guardian": "आशु बलाई", "rel": "husband", "age": 18, "gender": "female", "house": "30", "caste": "बलाई", "subCaste": ""},
    (1, 396): {"name": "भावना", "guardian": "चतर बैरवा", "rel": "husband", "age": 25, "gender": "female", "house": "33", "caste": "बैरवा", "subCaste": ""},
    (1, 397): {"name": "समदर रेगर", "guardian": "पुखराज रेगर", "rel": "husband", "age": 21, "gender": "female", "house": "18", "caste": "रेगर", "subCaste": ""},
    (1, 398): {"name": "माया बैरवा", "guardian": "कमलेश बैरवा", "rel": "husband", "age": 20, "gender": "female", "house": "38", "caste": "बैरवा", "subCaste": ""},
    (1, 399): {"name": "पूरण", "guardian": "लादू लाल रेगर", "rel": "father", "age": 18, "gender": "female", "house": "36", "caste": "रेगर", "subCaste": ""},
    (1, 400): {"name": "लादू लाल सालवी", "guardian": "आसू राम सालवी", "rel": "father", "age": 19, "gender": "male", "house": "30", "caste": "बलाई", "subCaste": ""},
    (1, 401): {"name": "गोपाल बैरवा", "guardian": "घीसू लाल बैरवा", "rel": "father", "age": 22, "gender": "male", "house": "32", "caste": "बैरवा", "subCaste": ""},
    (1, 402): {"name": "मनीषा बैरवा", "guardian": "गोपाल लाल बैरवा", "rel": "husband", "age": 25, "gender": "female", "house": "32", "caste": "बैरवा", "subCaste": ""},
    (1, 403): {"name": "भेरु लाल बैरवा", "guardian": "चतर लाल बैरवा", "rel": "father", "age": 23, "gender": "male", "house": "33", "caste": "बैरवा", "subCaste": ""},
    (1, 404): {"name": "रामकृष्ण बैरवा", "guardian": "चतर लाल बैरवा", "rel": "father", "age": 20, "gender": "male", "house": "33", "caste": "बैरवा", "subCaste": ""},
    (1, 405): {"name": "प्रहलाद", "guardian": "लक्ष्मण लाल रेगर", "rel": "father", "age": 24, "gender": "male", "house": "53", "caste": "रेगर", "subCaste": ""},
    (1, 406): {"name": "गोविन्द रेगर", "guardian": "डालचन्द रेगर", "rel": "father", "age": 19, "gender": "male", "house": "55", "caste": "रेगर", "subCaste": ""},
    (1, 407): {"name": "रामदयाल रेगर", "guardian": "गणेश रेगर", "rel": "father", "age": 19, "gender": "male", "house": "53", "caste": "रेगर", "subCaste": ""},
    (1, 408): {"name": "पायल रेगर", "guardian": "लोकेश रेगर", "rel": "husband", "age": 19, "gender": "female", "house": "53", "caste": "रेगर", "subCaste": ""},
    (1, 409): {"name": "रेखा रेगर", "guardian": "भंवर लाल रेगर", "rel": "father", "age": 18, "gender": "female", "house": "52", "caste": "रेगर", "subCaste": ""},
    (1, 410): {"name": "मनीषा", "guardian": "हरिकिशन", "rel": "husband", "age": 25, "gender": "female", "house": "55", "caste": "रेगर", "subCaste": ""},

    # Ward 2: Serials 341 to 348
    (2, 341): {"name": "डिम्पल पारीक", "guardian": "रामपाल पारीक", "rel": "father", "age": 20, "gender": "female", "house": "110", "caste": "ब्राह्मण", "subCaste": "पारीक"},
    (2, 342): {"name": "राधा", "guardian": "प्रहलाद", "rel": "husband", "age": 24, "gender": "female", "house": "138", "caste": "", "subCaste": ""},
    (2, 343): {"name": "कृष्णा पारीक", "guardian": "नारायण लाल पारीक", "rel": "father", "age": 18, "gender": "female", "house": "88", "caste": "ब्राह्मण", "subCaste": "पारीक"},
    (2, 344): {"name": "लीला तेली", "guardian": "लादू लाल तेली", "rel": "husband", "age": 25, "gender": "female", "house": "138", "caste": "तेली", "subCaste": ""},
    (2, 345): {"name": "ईशरा सुथार", "guardian": "बाबू सुथार", "rel": "father", "age": 23, "gender": "male", "house": "94", "caste": "सुथार", "subCaste": ""},
    (2, 346): {"name": "ममता जोशी", "guardian": "दिनेश शर्मा", "rel": "husband", "age": 21, "gender": "female", "house": "85", "caste": "ब्राह्मण", "subCaste": "जोशी"},
    (2, 347): {"name": "सीता सुथार", "guardian": "ईशरा सुथार", "rel": "husband", "age": 20, "gender": "female", "house": "94", "caste": "सुथार", "subCaste": ""},
    (2, 348): {"name": "यशोदा वैष्णव", "guardian": "छोटू वैष्णव", "rel": "husband", "age": 19, "gender": "female", "house": "103", "caste": "वैष्णव", "subCaste": ""},

    # Ward 3: Serials 243 to 249
    (3, 243): {"name": "मुस्कान बानो", "guardian": "सद्दाम मोहम्मद", "rel": "father", "age": 25, "gender": "female", "house": "153", "caste": "मुस्लिम", "subCaste": ""},
    (3, 244): {"name": "रानी गौड़", "guardian": "निर्मल शर्मा", "rel": "husband", "age": 20, "gender": "female", "house": "158", "caste": "ब्राह्मण", "subCaste": "गौड़"},
    (3, 245): {"name": "जैन धनराज", "guardian": "शंकर लाल", "rel": "father", "age": 47, "gender": "male", "house": "178", "caste": "जैन", "subCaste": ""},
    (3, 246): {"name": "कटारिया पारसमल", "guardian": "शंकर लाल कटारिया", "rel": "father", "age": 47, "gender": "male", "house": "178", "caste": "जैन", "subCaste": ""},
    (3, 247): {"name": "मंजू कुमारी जाट", "guardian": "गोविन्द जाट", "rel": "husband", "age": 29, "gender": "female", "house": "174", "caste": "जाट", "subCaste": ""},
    (3, 248): {"name": "शुभम सेन", "guardian": "घीसू लाल सेन", "rel": "father", "age": 18, "gender": "male", "house": "195", "caste": "सेन", "subCaste": ""},
    (3, 249): {"name": "विष्णु पारीक", "guardian": "नारायण पारीक", "rel": "father", "age": 18, "gender": "male", "house": "88", "caste": "ब्राह्मण", "subCaste": "पारीक"},

    # Ward 4: Serials 348 to 365
    (4, 348): {"name": "कविता खटीक", "guardian": "भेरू लाल खटीक", "rel": "father", "age": 20, "gender": "female", "house": "270", "caste": "खटीक", "subCaste": ""},
    (4, 349): {"name": "प्रियांशु पारीक", "guardian": "प्रहलाद पारीक", "rel": "father", "age": 18, "gender": "male", "house": "131", "caste": "ब्राह्मण", "subCaste": "पारीक"},
    (4, 350): {"name": "पारीक पुष्पा लक्ष्मणभाई", "guardian": "लक्ष्मणभाई", "rel": "husband", "age": 18, "gender": "female", "house": "211", "caste": "ब्राह्मण", "subCaste": "पारीक"},
    (4, 351): {"name": "छगनी सुथार", "guardian": "किशन लाल सुथार", "rel": "husband", "age": 20, "gender": "female", "house": "215", "caste": "सुथार", "subCaste": ""},
    (4, 352): {"name": "संगीता भील", "guardian": "दिनेश चन्द भील", "rel": "husband", "age": 19, "gender": "female", "house": "219", "caste": "भील", "subCaste": ""},
    (4, 353): {"name": "पहलाद भील", "guardian": "सोहन लाल भील", "rel": "father", "age": 19, "gender": "male", "house": "251", "caste": "भील", "subCaste": ""},
    (4, 354): {"name": "गोविन्द भील", "guardian": "गिरधारी लाल भील", "rel": "father", "age": 20, "gender": "male", "house": "217", "caste": "भील", "subCaste": ""},
    (4, 355): {"name": "ज्ञानी भील", "guardian": "बक्शु भील", "rel": "husband", "age": 20, "gender": "female", "house": "240", "caste": "भील", "subCaste": ""},
    (4, 356): {"name": "किशन लाल भील", "guardian": "शान्ति लाल भील", "rel": "father", "age": 18, "gender": "male", "house": "253", "caste": "भील", "subCaste": ""},
    (4, 357): {"name": "बक्शु भील", "guardian": "रूपा भील", "rel": "father", "age": 20, "gender": "male", "house": "240", "caste": "भील", "subCaste": ""},
    (4, 358): {"name": "गोपाल भील", "guardian": "मदन लाल भील", "rel": "father", "age": 18, "gender": "male", "house": "252", "caste": "भील", "subCaste": ""},
    (4, 359): {"name": "गंगा भील", "guardian": "रतन लाल भील", "rel": "father", "age": 23, "gender": "male", "house": "248", "caste": "भील", "subCaste": ""},
    (4, 360): {"name": "लक्ष्मी भील", "guardian": "मोहन भील", "rel": "husband", "age": 22, "gender": "female", "house": "219", "caste": "भील", "subCaste": ""},
    (4, 361): {"name": "पहलाद भील", "guardian": "सोहन लाल भील", "rel": "father", "age": 19, "gender": "male", "house": "241", "caste": "भील", "subCaste": ""},
    (4, 362): {"name": "नोसी", "guardian": "छोगा भील", "rel": "father", "age": 30, "gender": "female", "house": "253", "caste": "भील", "subCaste": ""},
    (4, 363): {"name": "ग्यारसी भील", "guardian": "विकास भील", "rel": "husband", "age": 20, "gender": "female", "house": "218", "caste": "भील", "subCaste": ""},
    (4, 364): {"name": "मोहन लाल भील", "guardian": "मांगी लाल भील", "rel": "father", "age": 23, "gender": "male", "house": "219", "caste": "भील", "subCaste": ""},
    (4, 365): {"name": "विनोद भील", "guardian": "मदन लाल भील", "rel": "father", "age": 18, "gender": "male", "house": "252", "caste": "भील", "subCaste": ""},

    # Ward 5: Serials 351 to 364
    (5, 351): {"name": "खुशी", "guardian": "लक्ष्मण", "rel": "husband", "age": 23, "gender": "female", "house": "211", "caste": "", "subCaste": ""},
    (5, 352): {"name": "मोहम्मद साहिब अली", "guardian": "असगर अली", "rel": "father", "age": 18, "gender": "male", "house": "300", "caste": "मुस्लिम", "subCaste": ""},
    (5, 353): {"name": "असगर अली", "guardian": "रहमत अली", "rel": "father", "age": 51, "gender": "male", "house": "300", "caste": "मुस्लिम", "subCaste": ""},
    (5, 354): {"name": "नौशाद अली", "guardian": "असगर अली", "rel": "father", "age": 22, "gender": "male", "house": "300", "caste": "मुस्लिम", "subCaste": ""},
    (5, 355): {"name": "हुसना बानो", "guardian": "असगर अली", "rel": "husband", "age": 41, "gender": "female", "house": "300", "caste": "मुस्लिम", "subCaste": ""},
    (5, 356): {"name": "माया", "guardian": "सोहन लाल", "rel": "husband", "age": 24, "gender": "female", "house": "297", "caste": "बागरिया", "subCaste": ""},
    (5, 357): {"name": "सोहन लाल बागरिया", "guardian": "भेरू लाल", "rel": "father", "age": 26, "gender": "male", "house": "297", "caste": "बागरिया", "subCaste": ""},
    (5, 358): {"name": "अनु तेली", "guardian": "मुकेश", "rel": "husband", "age": 21, "gender": "female", "house": "176", "caste": "तेली", "subCaste": ""},
    (5, 359): {"name": "गीता तेली", "guardian": "शंकर लाल तेली", "rel": "husband", "age": 21, "gender": "female", "house": "176", "caste": "तेली", "subCaste": ""},
    (5, 360): {"name": "सुगना तेली", "guardian": "तेली दिनेशकुमार", "rel": "husband", "age": 25, "gender": "female", "house": "176", "caste": "तेली", "subCaste": ""},
    (5, 361): {"name": "धनी", "guardian": "मदन लाल बागरिया", "rel": "husband", "age": 26, "gender": "female", "house": "297", "caste": "बागरिया", "subCaste": ""},
    (5, 362): {"name": "मदन लाल बागरिया", "guardian": "भेरू लाल बागरिया", "rel": "father", "age": 24, "gender": "male", "house": "297", "caste": "बागरिया", "subCaste": ""},
    (5, 363): {"name": "अनु शर्मा", "guardian": "दशरथ शर्मा", "rel": "husband", "age": 24, "gender": "female", "house": "326", "caste": "ब्राह्मण", "subCaste": "शर्मा"},
    (5, 364): {"name": "पुष्पेन्द्र शर्मा", "guardian": "दिनेश कुमार शर्मा", "rel": "father", "age": 21, "gender": "male", "house": "326", "caste": "ब्राह्मण", "subCaste": "शर्मा"},

    # Ward 6: Serials 372 to 383
    (6, 372): {"name": "लक्की सुवालका", "guardian": "राकेश सुवालका", "rel": "husband", "age": 23, "gender": "female", "house": "44", "caste": "सुवालका", "subCaste": ""},
    (6, 373): {"name": "मनीषा बैरवा", "guardian": "लक्ष्मण लाल बैरवा", "rel": "husband", "age": 20, "gender": "female", "house": "49", "caste": "बैरवा", "subCaste": ""},
    (6, 374): {"name": "कृष्णा कुमारी राणावत राजपूत", "guardian": "लादू लाल राणावत राजपूत", "rel": "father", "age": 19, "gender": "female", "house": "36", "caste": "राजपूत", "subCaste": "राणावत"},
    (6, 375): {"name": "कालू कुमावत", "guardian": "डालू कुमावत", "rel": "father", "age": 18, "gender": "male", "house": "97", "caste": "कुमावत", "subCaste": ""},
    (6, 376): {"name": "ममता गाडरी", "guardian": "सांवर मल गाडरी", "rel": "husband", "age": 19, "gender": "female", "house": "92", "caste": "गाडरी", "subCaste": ""},
    (6, 377): {"name": "संगीता कुमारी गाडरी", "guardian": "प्यार चन्द", "rel": "father", "age": 20, "gender": "female", "house": "93", "caste": "गाडरी", "subCaste": ""},
    (6, 378): {"name": "प्यारचन्द गाडरी", "guardian": "देवी लाल गाडरी", "rel": "father", "age": 22, "gender": "female", "house": "93", "caste": "गाडरी", "subCaste": ""},
    (6, 379): {"name": "रटना कुमारी सुवालका", "guardian": "मदन लाल सुवालका", "rel": "father", "age": 20, "gender": "female", "house": "45", "caste": "सुवालका", "subCaste": ""},
    (6, 380): {"name": "तमन्ना सुवालका", "guardian": "ब्रजेश सुवालका", "rel": "husband", "age": 24, "gender": "female", "house": "44", "caste": "सुवालका", "subCaste": ""},
    (6, 381): {"name": "नीतू कुमारी जोशी", "guardian": "रामपाल शर्मा", "rel": "husband", "age": 25, "gender": "female", "house": "46", "caste": "ब्राह्मण", "subCaste": "जोशी"},
    (6, 382): {"name": "उदय लाल भील", "guardian": "मोहन लाल भील", "rel": "father", "age": 20, "gender": "male", "house": "70", "caste": "भील", "subCaste": ""},
    (6, 383): {"name": "धर्म चन्द गाडरी", "guardian": "देवी लाल गाडरी", "rel": "father", "age": 18, "gender": "male", "house": "55", "caste": "गाडरी", "subCaste": ""},

    # Ward 7: Serials 370 to 394
    (7, 370): {"name": "बाबूलाल गुर्जर", "guardian": "पीरू लाल गुर्जर", "rel": "father", "age": 31, "gender": "male", "house": "352", "caste": "गुर्जर", "subCaste": ""},
    (7, 371): {"name": "गायत्री गुर्जर", "guardian": "कैलाश गुर्जर", "rel": "husband", "age": 20, "gender": "female", "house": "349", "caste": "गुर्जर", "subCaste": ""},
    (7, 372): {"name": "मुकेश गुर्जर", "guardian": "कैलाश गुर्जर", "rel": "husband", "age": 29, "gender": "female", "house": "349", "caste": "गुर्जर", "subCaste": ""},
    (7, 373): {"name": "माया", "guardian": "गणेश गुर्जर", "rel": "husband", "age": 22, "gender": "female", "house": "352", "caste": "गुर्जर", "subCaste": ""},
    (7, 374): {"name": "अनिता गुर्जर", "guardian": "सांवर मल गुर्जर", "rel": "husband", "age": 20, "gender": "female", "house": "349", "caste": "गुर्जर", "subCaste": ""},
    (7, 375): {"name": "दुर्गा गुर्जर", "guardian": "बाबूलाल गुर्जर", "rel": "husband", "age": 33, "gender": "female", "house": "352", "caste": "गुर्जर", "subCaste": ""},
    (7, 376): {"name": "सन्तोष देवी", "guardian": "सुरेश लाल गुर्जर", "rel": "husband", "age": 28, "gender": "female", "house": "354", "caste": "गुर्जर", "subCaste": ""},
    (7, 377): {"name": "गणी देवी", "guardian": "सुरेश गुर्जर", "rel": "husband", "age": 28, "gender": "female", "house": "353", "caste": "गुर्जर", "subCaste": ""},
    (7, 378): {"name": "काली गुर्जर", "guardian": "भेरू लाल गुर्जर", "rel": "husband", "age": 21, "gender": "female", "house": "353", "caste": "गुर्जर", "subCaste": ""},
    (7, 379): {"name": "सुरेश गुर्जर", "guardian": "नारायण लाल गुर्जर", "rel": "father", "age": 25, "gender": "male", "house": "353", "caste": "गुर्जर", "subCaste": ""},
    (7, 380): {"name": "कमला देवी", "guardian": "पीरू गुर्जर", "rel": "husband", "age": 49, "gender": "female", "house": "352", "caste": "गुर्जर", "subCaste": ""},
    (7, 381): {"name": "कन्हैया लाल गुर्जर", "guardian": "जेस राम गुर्जर", "rel": "father", "age": 18, "gender": "male", "house": "353", "caste": "गुर्जर", "subCaste": ""},
    (7, 382): {"name": "माया देवी", "guardian": "शंकर लाल गुर्जर", "rel": "husband", "age": 31, "gender": "female", "house": "352", "caste": "गुर्जर", "subCaste": ""},
    (7, 383): {"name": "गणेश गुर्जर", "guardian": "कजोड़ गुर्जर", "rel": "father", "age": 23, "gender": "male", "house": "352", "caste": "गुर्जर", "subCaste": ""},
    (7, 384): {"name": "गुटकी", "guardian": "पारस गुर्जर", "rel": "husband", "age": 24, "gender": "female", "house": "354", "caste": "गुर्जर", "subCaste": ""},
    (7, 385): {"name": "कैलाश गुर्जर", "guardian": "पारस गुर्जर", "rel": "father", "age": 19, "gender": "male", "house": "349", "caste": "गुर्जर", "subCaste": ""},
    (7, 386): {"name": "सुशीला गुर्जर", "guardian": "रतन लाल गुर्जर", "rel": "husband", "age": 23, "gender": "female", "house": "351", "caste": "गुर्जर", "subCaste": ""},
    (7, 387): {"name": "श्रवण गुर्जर", "guardian": "सुखा गुर्जर", "rel": "father", "age": 19, "gender": "male", "house": "353", "caste": "गुर्जर", "subCaste": ""},
    (7, 388): {"name": "देव किशन गुर्जर", "guardian": "नारायण लाल गुर्जर", "rel": "father", "age": 23, "gender": "male", "house": "353", "caste": "गुर्जर", "subCaste": ""},
    (7, 389): {"name": "दीपिका नायक", "guardian": "रोशन लाल", "rel": "father", "age": 18, "gender": "female", "house": "367", "caste": "नायक", "subCaste": ""},
    (7, 390): {"name": "कन्हैया लाल नायक", "guardian": "रतन लाल नायक", "rel": "father", "age": 20, "gender": "male", "house": "357", "caste": "नायक", "subCaste": ""},
    (7, 391): {"name": "मीठू लाल गुर्जर", "guardian": "लक्ष्मण लाल गुर्जर", "rel": "father", "age": 18, "gender": "male", "house": "365", "caste": "गुर्जर", "subCaste": ""},
    (7, 392): {"name": "निरमा कुमारी सुथार", "guardian": "बालू राम सुथार", "rel": "husband", "age": 19, "gender": "female", "house": "7", "caste": "सुथार", "subCaste": ""},
    (7, 393): {"name": "कमलेश कुमावत", "guardian": "दीपचन्द कुमावत", "rel": "father", "age": 18, "gender": "male", "house": "13", "caste": "कुमावत", "subCaste": ""},
    (7, 394): {"name": "राधेश्याम कुमावत", "guardian": "श्रवण लाल कुमावत", "rel": "father", "age": 19, "gender": "male", "house": "16", "caste": "कुमावत", "subCaste": ""},
}

def sync_all_nathdiyas_wards():
    print("=" * 80)
    print("STARTING FULL NATHDIYAS MASTER SYNC (ALL 7 WARDS + SUPP 2 + PHOTOS)")
    print("=" * 80)

    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    members = db["members"]
    media = db["mediaassets"]

    pdf_files = sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf")))
    print(f"Found {len(pdf_files)} Ward PDFs in {PDF_DIR}\n")

    total_supp_created = 0
    total_supp_updated = 0
    total_photos_added = 0
    total_cards_added = 0

    for pdf_path in pdf_files:
        fname = os.path.basename(pdf_path)
        ward_m = re.search(r'Ward No-0*(\d+)', fname)
        if not ward_m:
            continue
        ward_num = int(ward_m.group(1))

        print(f"\n-------------------------------------------------------------")
        print(f"PROCESSING WARD {ward_num}: {fname}")
        print(f"-------------------------------------------------------------")

        doc = fitz.open(pdf_path)

        # First pass: check existing voters in this ward for missing photos or cards
        existing_voters = list(members.find({
            "gramPanchayat": {"$regex": "नाथडिया", "$options": "i"},
            "wardNumber": str(ward_num)
        }))
        print(f"  Existing voters in Ward {ward_num}: {len(existing_voters)}")

        # Locate Supplement 2 in this PDF
        supp2_start = -1
        for i, page in enumerate(doc):
            text = page.get_text()
            if '07/10/2026' in text or 'पपरक सपखसर - 2' in text or 'पूरक संख्या - 2' in text:
                supp2_start = i
                break

        if supp2_start == -1:
            print(f"  Warning: No Supp 2 found in Ward {ward_num}")
            continue

        print(f"  Supp 2 starts on Page {supp2_start + 1}")

        # Scan Supp 2 pages and extract cards & photos
        for p_idx in range(supp2_start, len(doc)):
            page = doc[p_idx]
            text = page.get_text()
            if '(क) निर्वाचकों की संख्या' in text or '(क) जनरररचकक कक सपखसर' in text:
                continue

            images = page.get_images()
            for img in images:
                xref = img[0]
                for r in page.get_image_rects(xref):
                    if abs(r.width - 42.5) < 6 and abs(r.height - 56.9) < 6:
                        if r.x0 < 210:
                            x0, x1 = 34.4, 208.2
                        elif r.x0 < 385:
                            x0, x1 = 208.2, 381.8
                        else:
                            x0, x1 = 381.8, 555.4
                        y0 = r.y0 - 13.7
                        y1 = y0 + 72.35
                        cell_rect = fitz.Rect(x0, y0, x1, y1)

                        card_text = page.get_text('text', clip=cell_rect).strip()
                        lines = [l.strip() for l in card_text.split('\n') if l.strip()]
                        serial = None
                        for l in reversed(lines):
                            m = re.match(r'^(?:[OESR]\s*)?(\d{1,4})$', l)
                            if m:
                                serial = int(m.group(1))
                                break

                        if not serial or (ward_num, serial) not in SUPP2_DATA:
                            continue

                        meta = SUPP2_DATA[(ward_num, serial)]

                        # 1. Render card image to JPEG
                        card_pix = page.get_pixmap(clip=cell_rect, dpi=200)
                        card_bytes = card_pix.tobytes("jpeg")
                        card_id = bson.ObjectId()
                        media.insert_one({
                            "_id": card_id,
                            "data": card_bytes,
                            "contentType": "image/jpeg",
                            "filename": f"ward_card_nathdiyas_w{ward_num}_s{serial}.jpg"
                        })
                        card_url = f"/media/{card_id}"
                        total_cards_added += 1

                        # 2. Extract embedded portrait photo
                        photo_data = doc.extract_image(xref)
                        photo_bytes = photo_data["image"]
                        photo_ext = photo_data["ext"]
                        photo_id = bson.ObjectId()
                        media.insert_one({
                            "_id": photo_id,
                            "data": photo_bytes,
                            "contentType": f"image/{photo_ext}",
                            "filename": f"ward_photo_nathdiyas_w{ward_num}_s{serial}.{photo_ext}"
                        })
                        photo_url = f"/media/{photo_id}"
                        total_photos_added += 1

                        # 3. Check if voter already exists in MongoDB
                        # Match by: (wardNumber: str(ward_num) & wardVoterSerial: str(serial))
                        # OR in unassigned (wardNumber: None) matching name & guardian
                        clean_name = meta["name"].strip()
                        clean_guardian = meta["guardian"].strip()

                        existing = members.find_one({
                            "gramPanchayat": {"$regex": "नाथडिया", "$options": "i"},
                            "wardNumber": str(ward_num),
                            "wardVoterSerial": str(serial)
                        })

                        if not existing:
                            # Try to match in unassigned
                            existing = members.find_one({
                                "gramPanchayat": {"$regex": "नाथडिया", "$options": "i"},
                                "wardNumber": None,
                                "name": clean_name
                            })

                        # Search terms for fast query in app
                        search_tokens = [
                            clean_name.lower(),
                            clean_guardian.lower(),
                            meta["house"],
                            str(serial),
                            str(ward_num),
                            "नाथडियास",
                            "nathdiyas",
                            meta["caste"].lower() if meta["caste"] else ""
                        ]
                        search_keys = [t for t in search_tokens if t]

                        if existing:
                            # Update existing record
                            update_fields = {
                                "wardNumber": str(ward_num),
                                "wardVoterSerial": str(serial),
                                "wardSerialMap": {str(ward_num): str(serial)},
                                "name": clean_name,
                                "guardianName": clean_guardian,
                                "relationType": meta["rel"],
                                "gender": meta["gender"],
                                "age": meta["age"],
                                "houseNumber": meta["house"],
                                "caste": meta["caste"],
                                "subCaste": meta["subCaste"],
                                "gramPanchayat": "नाथडियास",
                                "village": "नाथडियास",
                                "panchayatSamiti": "रायपुर",
                                "panchayatSamitiWard": "वार्ड संख्या 11",
                                "photo": photo_url,
                                "wardCardImage": card_url,
                                "cardImage": card_url,
                                "ocrCardImage": card_url,
                                "supplementType": "addition",
                                "supplementNumber": 2,
                                "supplementDate": "07/10/2026",
                                "isDeleted": False
                            }
                            members.update_one({"_id": existing["_id"]}, {"$set": update_fields})
                            total_supp_updated += 1
                            print(f"    [Updated DB] Ward {ward_num} Serial {serial}: {clean_name} ({clean_guardian})")
                        else:
                            # Insert new member document
                            new_voter_id = f"WARD_NATHDIYAS_W{ward_num}_S{serial}"
                            new_doc = {
                                "_id": bson.ObjectId(),
                                "name": clean_name,
                                "guardianName": clean_guardian,
                                "relationType": meta["rel"],
                                "gender": meta["gender"],
                                "age": meta["age"],
                                "houseNumber": meta["house"],
                                "address": f"मकान नं. {meta['house']}, नाथडियास",
                                "caste": meta["caste"],
                                "subCaste": meta["subCaste"],
                                "wardNumber": str(ward_num),
                                "wardVoterSerial": str(serial),
                                "wardSerialMap": {str(ward_num): str(serial)},
                                "voterId": new_voter_id,
                                "gramPanchayat": "नाथडियास",
                                "village": "नाथडियास",
                                "panchayatSamiti": "रायपुर",
                                "panchayatSamitiWard": "वार्ड संख्या 11",
                                "assemblyName": "सहाडा (सामान्य)",
                                "assemblyNumber": 179,
                                "hasMunicipalMembership": True,
                                "hasAssemblyMembership": False,
                                "photo": photo_url,
                                "wardCardImage": card_url,
                                "cardImage": card_url,
                                "ocrCardImage": card_url,
                                "supplementType": "addition",
                                "supplementNumber": 2,
                                "supplementDate": "07/10/2026",
                                "isDeleted": False,
                                "partyPreference": "undecided",
                                "isFavorite": False,
                                "favoriteRating": 0,
                                "searchKeys": search_keys,
                                "searchText": " ".join(search_keys)
                            }
                            members.insert_one(new_doc)
                            total_supp_created += 1
                            print(f"    [Inserted DB] Ward {ward_num} Serial {serial}: {clean_name} ({clean_guardian})")

    print("\n" + "=" * 80)
    print("SYNC COMPLETE! AUDITING FINAL DATABASE STATE FOR NATHDIYAS...")
    print("=" * 80)

    # Final audit across all 7 wards
    for w in range(1, 8):
        voters_w = list(members.find({
            "gramPanchayat": {"$regex": "नाथडिया", "$options": "i"},
            "wardNumber": str(w)
        }))
        with_photo = sum(1 for v in voters_w if v.get("photo") and v["photo"] != "")
        with_card = sum(1 for v in voters_w if v.get("wardCardImage") and v["wardCardImage"] != "")
        deleted = sum(1 for v in voters_w if v.get("isDeleted") is True)
        active = len(voters_w) - deleted
        serials = [int(v.get("wardVoterSerial")) for v in voters_w if v.get("wardVoterSerial") and str(v.get("wardVoterSerial")).isdigit()]
        max_s = max(serials) if serials else 0

        print(f"Ward {w}: Total={len(voters_w):3d} | Active={active:3d} | Deleted={deleted:2d} | MaxSerial={max_s:3d} | Photos={with_photo:3d}/{len(voters_w):3d} | Cards={with_card:3d}/{len(voters_w):3d}")

if __name__ == "__main__":
    sync_all_nathdiyas_wards()
