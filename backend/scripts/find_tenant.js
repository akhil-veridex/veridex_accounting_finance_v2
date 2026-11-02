require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.collection('journal_entries');
  const distinctTenants = await coll.distinct('tenant_id');
  console.log('Distinct tenants in journal_entries:', distinctTenants.length);
  
  for (const tid of distinctTenants) {
    const entries = await coll.find({ tenant_id: tid, account_code: '1010' }).toArray();
    let dr = 0;
    let cr = 0;
    entries.forEach(e => {
      dr += parseFloat(e.debit ? e.debit.toString() : 0);
      cr += parseFloat(e.credit ? e.credit.toString() : 0);
    });
    if (dr > 0 || cr > 0) {
      console.log('Tenant:', String(tid), '1010 Dr:', dr.toFixed(2), 'Cr:', cr.toFixed(2));
    }
  }
  await mongoose.disconnect();
}
test().catch(console.error);
