const mongoose = require('mongoose');

async function testIndexOptions() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const collection = mongoose.connection.db.collection('members');

  // Query with exact filter matching partialFilterExpression
  const exp1 = await collection.find({ voterId: 'SNE1307248' }).hint('voterId_1').explain('executionStats');
  console.log('With hint voterId_1:');
  console.log('Index used:', exp1.queryPlanner?.winningPlan?.inputStage?.indexName);
  console.log('Execution time ms:', exp1.executionStats?.executionTimeMillis);
  console.log('Docs examined:', exp1.executionStats?.totalDocsExamined);

  await mongoose.disconnect();
}

testIndexOptions().catch(console.error);
