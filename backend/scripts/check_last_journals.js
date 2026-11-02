require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.collection('journals');
  const count = await coll.countDocuments();
  console.log('Total journals in DB:', count);

  const last20 = await coll.find({}).sort({ _id: -1 }).limit(20).toArray();
  console.log('--- LAST 20 JOURNALS BY _id ---');
  for (const j of last20) {
    console.log(j.tenant_id, j.journal_number, j.source_module, j.total_debit ? j.total_debit.toString() : j.total_amount, j.created_at, j.memo);
  }

  // Also check ledger_accounts sorted by updatedAt or last activity
  const accColl = mongoose.connection.collection('ledger_accounts');
  const accWithActivity = await accColl.find({
    $or: [
      { current_balance: { $ne: '0.00' } },
      { current_balance: { $ne: 0 } }
    ]
  }).toArray();
  console.log('--- ACCOUNTS WITH NONZERO BALANCE ---');
  for (const a of accWithActivity) {
    const bal = a.current_balance ? a.current_balance.toString() : '0';
    if (bal !== '0.00' && bal !== '0') {
      console.log(a.tenant_id, a.account_code, a.account_name, bal);
    }
  }

  await mongoose.disconnect();
}
test().catch(console.error);
