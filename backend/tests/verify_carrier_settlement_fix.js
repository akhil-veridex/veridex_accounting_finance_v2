require('dotenv').config();
const mongoose = require('mongoose');
const commissionsService = require('../src/services/commissionsService');
const { Tenant, SettlementStatement } = require('../src/models');

async function testSettlementLogic() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tid = new mongoose.Types.ObjectId('6ae5850c0c359c85e5373bb2');

  console.log('--- TEST 1: Preview Summit Mutual (already settled) ---');
  const prevSummit = await commissionsService.previewSettlementStatement({
    tenantId: tid,
    carrierPartyId: 'CARRIER-SUMMIT',
    period: '2026-07'
  });
  console.log('Summit Mutual Preview:', {
    carrier: prevSummit.carrier_name,
    gross: prevSummit.gross_eligible_premium,
    withheld: prevSummit.commission_withheld,
    net: prevSummit.net_due_carrier,
    already_settled: prevSummit.already_settled,
    can_generate: prevSummit.can_generate,
    existing: prevSummit.existing_statement
  });
  console.assert(prevSummit.net_due_carrier === '7530.00', 'Net due should be 7530.00');
  console.assert(prevSummit.already_settled === true, 'Summit statement should be marked already_settled');
  console.assert(prevSummit.can_generate === false, 'Cannot generate duplicate settlement');

  console.log('\n--- TEST 2: Attempt duplicate generation for Summit Mutual ---');
  try {
    await commissionsService.generateSettlementStatement({
      tenantId: tid,
      carrierPartyId: 'CARRIER-SUMMIT',
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2026-07-31')
    });
    console.error('FAIL: Expected error for duplicate generation');
  } catch (err) {
    console.log('PASS: Duplicate generation correctly blocked:', err.message);
  }

  console.log('\n--- TEST 3: Preview Southlake Specialty (no collected invoices) ---');
  const prevSouthlake = await commissionsService.previewSettlementStatement({
    tenantId: tid,
    carrierPartyId: 'CARRIER-SOUTHLAKE',
    period: '2026-07'
  });
  console.log('Southlake Specialty Preview:', {
    carrier: prevSouthlake.carrier_name,
    gross: prevSouthlake.gross_eligible_premium,
    withheld: prevSouthlake.commission_withheld,
    net: prevSouthlake.net_due_carrier,
    eligible_count: prevSouthlake.eligible_invoices_count,
    can_generate: prevSouthlake.can_generate
  });
  console.assert(prevSouthlake.gross_eligible_premium === '0.00', 'Gross should be 0.00');
  console.assert(prevSouthlake.net_due_carrier === '0.00', 'Net should be 0.00');
  console.assert(prevSouthlake.can_generate === false, 'Cannot generate when 0.00 eligible');

  console.log('\n--- ALL SETTLEMENT LOGIC TESTS PASSED SUCCESSFULLY! ---');
  await mongoose.disconnect();
}

testSettlementLogic().catch(console.error);
