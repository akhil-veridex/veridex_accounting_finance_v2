require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.collection('journals');
  const today = new Date('2026-11-01');
  const recentJournals = await coll.find({ created_at: { $gte: today } }).sort({ created_at: -1 }).toArray();
  console.log('Journals created since Nov 1, 2026:', recentJournals.length);
  for (const j of recentJournals) {
    console.log(j.tenant_id, j.journal_number, j.source_module, j.total_debit ? j.total_debit.toString() : j.total_amount, j.created_at);
  }

  // Also check all journals where total_debit is around 11819 or 9412 or 9562 or 35897 or 4487
  const custom = await coll.find({
    $or: [
      { journal_number: { $in: ['JE-2026-00011', 'JE-2026-00012', 'JE-2026-00013'] } },
      { memo: { $regex: '4487|35897|11819', $options: 'i' } }
    ]
  }).toArray();
  console.log('Custom search journals found:', custom.length);
  for (const c of custom) {
    console.log(c.tenant_id, c.journal_number, c.memo, c.total_debit ? c.total_debit.toString() : null);
  }

  await mongoose.disconnect();
}
test().catch(console.error);
