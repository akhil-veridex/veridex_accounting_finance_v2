require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkAllDbs() {
  const uri = process.env.MONGODB_URI;
  // base uri without db name
  const client = new MongoClient(uri);
  await client.connect();

  const dbs = ['veridex_finance_Accounting_Akhilesh', 'veridex_Tally_Accounting_Akhilesh', 'veridex_finance_Akhilesh', 'veridex_finance'];

  for (const dbName of dbs) {
    const db = client.db(dbName);
    const accs = await db.collection('ledger_accounts').find({
      $or: [
        { account_code: '1010' },
        { account_code: '1100' }
      ]
    }).toArray();

    console.log(`=== DB: ${dbName} (found ${accs.length} accounts) ===`);
    for (const a of accs) {
      const bal = a.current_balance ? a.current_balance.toString() : '0';
      if (bal.includes('4637') || bal.includes('16417') || bal.includes('45022') || bal.includes('28604')) {
        console.log(`  MATCH: ${a.account_code} ${a.account_name} bal=${bal} tenant=${a.tenant_id}`);
      }
    }

    // Check JournalEntry sums
    const distinctTenants = await db.collection('journal_entries').distinct('tenant_id');
    for (const tid of distinctTenants) {
      const entries = await db.collection('journal_entries').find({ tenant_id: tid }).toArray();
      let d1010 = 0, c1010 = 0, d1100 = 0, c1100 = 0;
      entries.forEach(e => {
        const d = parseFloat(e.debit ? e.debit.toString() : 0);
        const c = parseFloat(e.credit ? e.credit.toString() : 0);
        if (e.account_code === '1010') { d1010 += d; c1010 += c; }
        if (e.account_code === '1100') { d1100 += d; c1100 += c; }
      });
      if (d1010 > 20000 || c1100 > 20000) {
        console.log(`  DB: ${dbName} Tenant: ${tid} -> 1010 Dr=${d1010.toFixed(2)}, Cr=${c1010.toFixed(2)} | 1100 Dr=${d1100.toFixed(2)}, Cr=${c1100.toFixed(2)}`);
      }
    }
  }

  await client.close();
}
checkAllDbs().catch(console.error);
