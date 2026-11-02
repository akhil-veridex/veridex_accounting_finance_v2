require('dotenv').config();
const mongoose = require('mongoose');
const { PostingRule, PostingRuleLine, EventDefinition } = require('../src/models');
const { simulateJournalFromEvent } = require('../src/services/eventSimulatorService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tid = new mongoose.Types.ObjectId('6ae5aafc06759c4bd3d16798');

  const rules = await PostingRule.find({ tenant_id: tid, event_type: { $regex: 'invoice.issued', $options: 'i' } });
  console.log(`Rules for tenant ${tid}:`, rules.length);
  for (const r of rules) {
    const lines = await PostingRuleLine.find({ posting_rule_id: r._id });
    console.log({
      rule_code: r.rule_code,
      status: r.status,
      version: r.version,
      criteria_count: r.criteria ? r.criteria.length : 0,
      lines_count: lines.length
    });
    lines.forEach(l => {
      console.log('  Line:', l.direction, l.account_code, 'amount_field:', l.amount_field, 'formula:', l.amount_formula, 'condition:', l.condition_expression);
    });
  }

  console.log('\n--- SIMULATING INSTALLMENT #2 INVOICE ---');
  const simInst2 = await simulateJournalFromEvent({
    tenantId: tid,
    eventCode: 'billing.invoice.issued',
    schemaVersion: '1.0.0',
    occurrenceDate: new Date(),
    payload: {
      invoice_number: 'INV-2026-00002',
      installment_number: 2,
      total_amount: 11819.90,
      premium_amount: 11819.90,
      gross_premium: 11819.90,
      fee_amount: 0,
      policy_fee: 0,
      transaction_type: 'DIRECT_BILL',
      currency: 'USD'
    }
  });
  console.log('Sim Inst 2 result:', {
    success: simInst2.success,
    stage: simInst2.stage,
    errors: simInst2.errors,
    balanced: simInst2.balanced,
    total_debit: simInst2.total_debit,
    total_credit: simInst2.total_credit,
    lines: simInst2.lines
  });

  await mongoose.disconnect();
}
test().catch(console.error);
