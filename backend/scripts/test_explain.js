const mongoose = require('mongoose');

async function testExplain() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const collection = mongoose.connection.db.collection('members');

  const exp = await collection.find({ voterId: 'SNE1307248' }).explain('executionStats');
  console.log('Index used:', exp.queryPlanner?.winningPlan?.inputStage?.indexName || exp.queryPlanner?.winningPlan?.stage);
  console.log('Execution time ms:', exp.executionStats?.executionTimeMillis);
  console.log('Docs examined:', exp.executionStats?.totalDocsExamined);

  await mongoose.disconnect();
}

testExplain().catch(console.error);
