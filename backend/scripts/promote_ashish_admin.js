const mongoose = require('mongoose');
const User = require('../src/models/User');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const res = await User.updateOne(
    { email: 'ashishsharma01710171@gmail.com' },
    {
      $set: {
        role: 'admin',
        permissions: {
          canBackup: true,
          canPrintProfiles: true,
          canExportData: true,
          canViewFullMobile: true,
          canViewReports: true,
          canImportData: true,
          canCreateVoters: true,
          canEditVoters: true,
          canEditPhoto: true,
          canDeleteVoters: true
        }
      }
    }
  );
  console.log('✅ Promoted Ashish Sharma to Super Admin:', res.modifiedCount);
  process.exit(0);
}

run().catch(console.error);
