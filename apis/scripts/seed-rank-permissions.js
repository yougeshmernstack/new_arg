require('dotenv').config();
const mongoose = require('mongoose');
const seed = require('../SERVICES/WellnessPermissionSeed');

async function main() {
  const dbName = (process.env.DB_NAME || 'wellness').replace(/['"]/g, '').trim();
  const uri = `mongodb://localhost:27017/${dbName}`;
  console.log('Connecting:', uri);
  await mongoose.connect(uri);
  const result = await seed.seed();
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
