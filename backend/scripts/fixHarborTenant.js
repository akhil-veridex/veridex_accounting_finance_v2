require('dotenv').config();
const mongoose = require('mongoose');
const BigNumber = require('bignumber.js');
const { SettlementStatement, SettlementLine, Journal, JournalEntry, LedgerAccount, Invoice } = require('../src/models');

async function fixHarborTenant() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tid = new mongoose.Types.ObjectId('6ae5850c0c359c85e5373bb2');

  console.log('--- Step 1: Cleaning duplicate settlement SETTLE-2026-00002 ---');
  const s2 = await SettlementStatement.findOne({ tenant_id: tid, statement_number: 'SETTLE-2026-00002' });
  if (s2) {
    await SettlementLine.deleteMany({ statement_id: s2._id });
    await SettlementStatement.deleteOne({ _id: s2._id });
    console.log('Deleted duplicate SETTLE-2026-00002 and its lines.');
  }

  console.log('--- Step 2: Correcting SETTLE-2026-00001 to Installment #1 exact amounts ---');
  const s1 = await SettlementStatement.findOne({ tenant_id: tid, statement_number: 'SETTLE-2026-00001' });
  if (s1) {
    s1.gross_eligible_premium = mongoose.Types.Decimal128.fromString('9412.50');
    s1.commission_withheld = mongoose.Types.Decimal128.fromString('1882.50');
    s1.claims_offset = mongoose.Types.Decimal128.fromString('0.00');
    s1.net_due_carrier = mongoose.Types.Decimal128.fromString('7530.00');
    s1.settlement_formula_notes = 'Net Due = Gross Premium ($9,412.50) - MGA Commission Withheld ($1,882.50) - Claims Offset ($0.00) = $7,530.00';
    await s1.save();
    console.log('Updated SETTLE-2026-00001: Gross=$9,412.50, Withheld=$1,882.50, Net Due=$7,530.00');

    // Update lines
    await SettlementLine.deleteMany({ statement_id: s1._id });
    await SettlementLine.create([
      {
        tenant_id: tid,
        statement_id: s1._id,
        line_number: 1,
        line_type: 'GROSS_PREMIUM',
        source_entity_type: 'POLICY_TRANSACTION',
        source_entity_id: 'POL-TX-8821-INV-INV-2026-00001',
        description: 'Lone Pine Trucking Gross Written Premium (Installment #1)',
        amount: mongoose.Types.Decimal128.fromString('9412.50')
      },
      {
        tenant_id: tid,
        statement_id: s1._id,
        line_number: 2,
        line_type: 'COMMISSION_WITHHELD',
        source_entity_type: 'COMMISSION_TRANSACTION',
        source_entity_id: 'COMM-AGR-CARRIER-SUMMIT',
        description: 'MGA Authorized Commission Withheld (20%) for Summit Mutual Insurance Company',
        amount: mongoose.Types.Decimal128.fromString('-1882.50')
      }
    ]);
    console.log('Recreated Settlement lines for SETTLE-2026-00001.');
  }

  console.log('--- Step 3: Correcting JE-2026-00005 to $7,530.00 disbursement ---');
  const j5 = await Journal.findOne({ tenant_id: tid, journal_number: 'JE-2026-00005' });
  if (j5) {
    j5.total_debit = mongoose.Types.Decimal128.fromString('7530.00');
    j5.total_credit = mongoose.Types.Decimal128.fromString('7530.00');
    j5.memo = 'Carrier Settlement Disbursement: Summit Mutual Insurance Company ($7,530.00 Net Remittance)';
    await j5.save();

    await JournalEntry.deleteMany({ journal_id: j5._id });
    const acc2010 = await LedgerAccount.findOne({ tenant_id: tid, account_code: '2010' });
    const acc1010 = await LedgerAccount.findOne({ tenant_id: tid, account_code: '1010' });

    await JournalEntry.create([
      {
        tenant_id: tid,
        journal_id: j5._id,
        line_number: 1,
        ledger_account_id: acc2010._id,
        account_code: '2010',
        debit: mongoose.Types.Decimal128.fromString('7530.00'),
        credit: mongoose.Types.Decimal128.fromString('0.00'),
        memo: 'Discharge Due to Carrier liability for SETTLE-2026-00001',
        dimensions: { carrier_id: 'CARRIER-SUMMIT', statement_number: 'SETTLE-2026-00001' }
      },
      {
        tenant_id: tid,
        journal_id: j5._id,
        line_number: 2,
        ledger_account_id: acc1010._id,
        account_code: '1010',
        debit: mongoose.Types.Decimal128.fromString('0.00'),
        credit: mongoose.Types.Decimal128.fromString('7530.00'),
        memo: 'Carrier Net Premium Remittance wire from Texas § 4053 Premium Trust',
        dimensions: { carrier_id: 'CARRIER-SUMMIT', statement_number: 'SETTLE-2026-00001' }
      }
    ]);
    console.log('Updated JE-2026-00005 lines: Dr 2010 $7,530.00 / Cr 1010 $7,530.00');
  }

  console.log('--- Step 4: Recalculating all Ledger Account balances from Journal Entries ---');
  const accounts = await LedgerAccount.find({ tenant_id: tid });
  const allEntries = await JournalEntry.find({ tenant_id: tid });

  const drMap = {};
  const crMap = {};
  for (const e of allEntries) {
    const code = e.account_code;
    const dr = new BigNumber(e.debit ? e.debit.toString() : 0);
    const cr = new BigNumber(e.credit ? e.credit.toString() : 0);
    drMap[code] = (drMap[code] || new BigNumber(0)).plus(dr);
    crMap[code] = (crMap[code] || new BigNumber(0)).plus(cr);
  }

  console.log('Account Balances after recalculation:');
  for (const acc of accounts) {
    const dr = drMap[acc.account_code] || new BigNumber(0);
    const cr = crMap[acc.account_code] || new BigNumber(0);
    let bal;
    if (acc.normal_balance === 'DEBIT') {
      bal = dr.minus(cr);
    } else {
      bal = cr.minus(dr);
    }
    acc.current_balance = mongoose.Types.Decimal128.fromString(bal.toFixed(2));
    await acc.save();
    if (dr.gt(0) || cr.gt(0) || !bal.isZero()) {
      console.log('  Account ' + acc.account_code + ' (' + acc.account_name + '): DR=' + dr.toFixed(2) + ', CR=' + cr.toFixed(2) + ', Balance=' + bal.toFixed(2) + ' ' + acc.normal_balance);
    }
  }

  console.log('--- Step 5: Verify Trial Balance ---');
  const { computeTrialBalance } = require('../src/services/journalPostingService');
  const tb = await computeTrialBalance(tid);
  console.log('Trial Balance Summary:');
  console.log('  Total Debits: ' + tb.total_debit);
  console.log('  Total Credits: ' + tb.total_credit);
  console.log('  Difference: ' + tb.difference);
  console.log('  Is Balanced: ' + tb.is_balanced);

  await mongoose.disconnect();
}
fixHarborTenant().catch(console.error);
