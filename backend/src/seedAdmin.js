require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDB = require('./config/db');
const User = require('./models/User');
const { seedDefaultParties } = require('./utils/partySeed');

async function seed() {
  await connectDB();
  await seedDefaultParties();
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPass123';
  const exists = await User.findOne({ email });
  if (exists) {
    exists.password = await bcrypt.hash(password, 12);
    exists.role = 'admin';
    exists.active = true;
    exists.permissions = { ...exists.permissions, canPrintProfiles: true };
    await exists.save();
    console.log(`Admin password reset: ${email}`);
    process.exit(0);
  }
  await User.create({
    name: 'System Admin',
    email,
    password: await bcrypt.hash(password, 12),
    role: 'admin',
    permissions: { canPrintProfiles: true },
  });
  console.log(`Admin created: ${email}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
