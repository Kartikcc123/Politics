const fs = require('fs');
const path = require('path');

const folders = [
  "C:\\Users\\Ashish Sharma\\Downloads\\THALA",
  "C:\\Users\\Ashish Sharma\\Downloads\\Mobile Devices",
  "C:\\Users\\Ashish Sharma\\Downloads\\KHEMANA-",
  "C:\\Users\\Ashish Sharma\\Downloads\\Nathdiyas",
  "C:\\Users\\Ashish Sharma\\Downloads\\panotiya",
  "C:\\Users\\Ashish Sharma\\Downloads\\palra",
  "C:\\Users\\Ashish Sharma\\Downloads\\Raipur",
  "C:\\Users\\Ashish Sharma\\Downloads\\sagrev",
  "C:\\Users\\Ashish Sharma\\Downloads\\suras",
  "C:\\Users\\Ashish Sharma\\Downloads\\mokhunda",
  "C:\\Users\\Ashish Sharma\\Downloads\\Masinghpura_Wards",
  "C:\\Users\\Ashish Sharma\\Downloads\\Masinghpur",
  "C:\\Users\\Ashish Sharma\\Downloads\\Nahri_Wards",
  "C:\\Users\\Ashish Sharma\\Downloads\\Nahri",
  "C:\\Users\\Ashish Sharma\\Downloads\\5",
  "C:\\Users\\Ashish Sharma\\Downloads\\boriyapur",
  "C:\\Users\\Ashish Sharma\\Downloads\\w",
  "C:\\Users\\Ashish Sharma\\Downloads\\Borana",
  "C:\\Users\\Ashish Sharma\\Downloads\\o",
  "C:\\Users\\Ashish Sharma\\Downloads\\c",
  "C:\\Users\\Ashish Sharma\\Downloads\\narayankhera",
  "C:\\Users\\Ashish Sharma\\Downloads\\nandasa",
  "C:\\Users\\Ashish Sharma\\Downloads\\WithoutPhoto"
];

for (const dir of folders) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    console.log(`Folder: ${dir} -> ${files.length} items`);
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`   PDFs (${pdfs.length}):`, pdfs.slice(0, 5));
  } else {
    console.log(`Folder NOT found: ${dir}`);
  }
}
