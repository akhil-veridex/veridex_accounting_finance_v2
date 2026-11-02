require('dotenv').config();
const mongoose = require('mongoose');
const { PostingRule, PostingRuleLine } = require('../src/models');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tid = new mongoose.Types.ObjectId('6ae5aafc06759c4bd3d16798');

  const rule = await PostingRule.findOne({ tenant_id: tid, rule_code: 'RULE_INV_ISSUE' });
  console.log('RULE:', JSON.stringify(rule, null, 2));

  const lines = await PostingRuleLine.find({ posting_rule_id: rule._id });
  console.log('LINES:', JSON.stringify(lines, null, 2));

  await mongoose.disconnect();
}
test().catch(console.error);
