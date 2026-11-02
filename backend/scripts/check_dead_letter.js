require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const outboxColl = mongoose.connection.collection('outbox_events');
  const evts = await outboxColl.find({
    event_id: { $in: ['EVT-BILLING-INVOICE-ISSUED-INV-2026-00001-mvw537z8', 'EVT-BILLING-INVOICE-ISSUED-INV-2026-00001-mvw4u62y'] }
  }).toArray();
  for (const e of evts) {
    console.log(e.event_id, 'Category:', e.last_error_category, 'Msg:', e.last_error_message);
  }
  await mongoose.disconnect();
}
test().catch(console.error);
