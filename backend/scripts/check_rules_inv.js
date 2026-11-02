require('dotenv').config();
const mongoose = require('mongoose');
const { PostingRule, PostingRuleLine, EventDefinition } = require('../src/models');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const rules = await PostingRule.find({ event_type: { $regex: 'invoice.issued', $options: 'i' } });
  console.log('Posting rules for invoice.issued:', rules.length);
  for (const r of rules) {
    const lines = await PostingRuleLine.find({ posting_rule_id: r._id });
    console.log({
      tenant_id: r.tenant_id,
      rule_code: r.rule_code,
      event_type: r.event_type,
      status: r.status,
      version: r.version,
      lines_count: lines.length
    });
    lines.forEach(l => {
      console.log('  Line:', l.direction, l.account_code, l.amount_formula || l.amount_field, l.condition_expression);
    });
  }

  const evts = await EventDefinition.find({ event_code: { $regex: 'invoice.issued', $options: 'i' } });
  console.log('Event definitions for invoice.issued:', evts.length);
  for (const e of evts) {
    console.log({
      tenant_id: e.tenant_id,
      event_code: e.event_code,
      status: e.status,
      payload_schema: e.payload_schema ? Object.keys(e.payload_schema.properties || {}) : 'None'
    });
  }

  await mongoose.disconnect();
}
test().catch(console.error);
