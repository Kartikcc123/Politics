const mongoose = require('mongoose');

async function recreateIndex() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const collection = mongoose.connection.db.collection('members');

  console.log('Dropping old voterId_1 index...');
  try {
    await collection.dropIndex('voterId_1');
    console.log('Dropped voterId_1');
  } catch (e) {
    console.log('Drop index error:', e.message);
  }

  console.log('Creating standard index on voterId...');
  await collection.createIndex({ voterId: 1 });
  console.log('Standard index created!');

  const exp = await collection.find({ voterId: 'SNE1307248' }).explain('executionStats');
  console.log('Winning stage:', exp.queryPlanner?.winningPlan?.inputStage?.stage || exp.queryPlanner?.winningPlan?.stage);
  console.log('Execution time ms:', exp.executionStats?.executionTimeMillis);
  console.log('Docs examined:', exp.executionStats?.totalDocsExamined);

  await mongoose.disconnect();
}

recreateIndex().catch(console.error);
