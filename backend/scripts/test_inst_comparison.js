require('dotenv').config();
const mongoose = require('mongoose');
const { simulateJournalFromEvent } = require('../src/services/eventSimulatorService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tid = new mongoose.Types.ObjectId('6ae5aafc06759c4bd3d16798');

  // Payload for Installment 1 (worked)
  const p1 = {
    invoice_id: 'INV-2026-00001',
    invoice_number: 'INV-2026-00001',
    policy_id: 'POL-TX-8821',
    billing_account_id: '6ae5aafc06759c4bd3d16799',
    installment_number: 1,
    total_amount: 9562.5,
    premium_amount: 9412.5,
    gross_premium: 9412.5,
    fee_amount: 150,
    policy_fee: 150,
    transaction_type: 'DIRECT_BILL',
    currency: 'USD'
  };

  const sim1 = await simulateJournalFromEvent({
    tenantId: tid,
    eventCode: 'billing.invoice.issued',
    schemaVersion: '1.0.0',
    occurrenceDate: new Date(),
    payload: p1
  });
  console.log('Sim 1 (Inst 1) result:', {
    success: sim1.success,
    errors: sim1.errors,
    balanced: sim1.balanced,
    total_debit: sim1.total_debit,
    total_credit: sim1.total_credit,
    lines: sim1.lines ? sim1.lines.map(l => ({ code: l.account_code, dr: l.debit, cr: l.credit })) : []
  });

  // Payload for Installment 2 (fee_amount = 0, policy_fee = 0)
  const p2 = {
    invoice_id: 'INV-2026-00002',
    invoice_number: 'INV-2026-00002',
    policy_id: 'POL-TX-8821',
    billing_account_id: '6ae5aafc06759c4bd3d16799',
    installment_number: 2,
    total_amount: 11819.9,
    premium_amount: 11819.9,
    gross_premium: 11819.9,
    fee_amount: 0,
    policy_fee: 0,
    transaction_type: 'DIRECT_BILL',
    currency: 'USD'
  };

  const sim2 = await simulateJournalFromEvent({
    tenantId: tid,
    eventCode: 'billing.invoice.issued',
    schemaVersion: '1.0.0',
    occurrenceDate: new Date(),
    payload: p2
  });
  console.log('Sim 2 (Inst 2) result:', {
    success: sim2.success,
    errors: sim2.errors,
    balanced: sim2.balanced,
    total_debit: sim2.total_debit,
    total_credit: sim2.total_credit,
    lines: sim2.lines ? sim2.lines.map(l => ({ code: l.account_code, dr: l.debit, cr: l.credit })) : []
  });

  await mongoose.disconnect();
}
test().catch(console.error);
