require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const j5s = await mongoose.connection.collection('journals').find({ journal_number: 'JE-2026-00005' }).toArray();
  console.log('JE-2026-00005 count:', j5s.length);
  for (const j of j5s) {
    console.log('Tenant:', j.tenant_id, 'Total Debit:', j.total_debit ? j.total_debit.toString() : j.total_amount, j.memo);
  }

  const stmts = await mongoose.connection.collection('settlement_statements').find({}).toArray();
  console.log('Settlement statements count:', stmts.length);
  for (const s of stmts) {
    console.log('Tenant:', s.tenant_id, s.statement_number, s.status, s.net_due_carrier ? s.net_due_carrier.toString() : null);
  }

  await mongoose.disconnect();
}
test().catch(console.error);
