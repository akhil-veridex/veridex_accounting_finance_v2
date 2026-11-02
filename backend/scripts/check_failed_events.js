require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const outboxColl = mongoose.connection.collection('outbox_events');
  const inboxColl = mongoose.connection.collection('inbox_messages');

  const failedOutbox = await outboxColl.find({
    status: { $in: ['RETRY', 'DEAD_LETTER'] }
  }).sort({ _id: -1 }).limit(20).toArray();

  console.log('Failed outbox events count:', failedOutbox.length);
  for (const o of failedOutbox) {
    console.log({
      tenant_id: o.tenant_id,
      event_id: o.event_id,
      event_type: o.event_type,
      status: o.status,
      last_error_category: o.last_error_category,
      last_error_message: o.last_error_message,
      payload: o.payload
    });
  }

  const failedInbox = await inboxColl.find({
    status: { $in: ['FAILED', 'DEAD_LETTER', 'RETRY'] }
  }).sort({ _id: -1 }).limit(20).toArray();

  console.log('Failed inbox messages count:', failedInbox.length);
  for (const i of failedInbox) {
    console.log({
      tenant_id: i.tenant_id,
      event_id: i.event_id,
      status: i.status,
      error_category: i.error_category,
      error_message: i.error_message
    });
  }

  await mongoose.disconnect();
}
test().catch(console.error);
