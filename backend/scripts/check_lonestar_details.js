require('dotenv').config();
const mongoose = require('mongoose');
const { BillingPolicySnapshot, InstallmentSchedule, BillingAccount, Invoice } = require('../src/models');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tid = new mongoose.Types.ObjectId('6ae5aafc06759c4bd3d16798');

  const policies = await BillingPolicySnapshot.find({ tenant_id: tid });
  console.log('Policies for Lone Star:', policies.length);
  for (const p of policies) {
    console.log({
      policy_id: p._id,
      policy_number: p.policy_number,
      gross_written_premium: p.gross_written_premium ? p.gross_written_premium.toString() : null,
      status: p.status
    });
  }

  const accounts = await BillingAccount.find({ tenant_id: tid });
  console.log('Billing Accounts:', accounts.length);
  for (const a of accounts) {
    console.log({
      _id: a._id,
      policy_number: a.policy_number,
      customer_name: a.customer_name,
      current_balance: a.current_balance ? a.current_balance.toString() : null
    });
  }

  const schedules = await InstallmentSchedule.find({ tenant_id: tid }).sort({ installment_number: 1 });
  console.log('Installment Schedules:', schedules.length);
  for (const s of schedules) {
    console.log({
      installment_number: s.installment_number,
      due_date: s.due_date,
      total_amount: s.total_amount ? s.total_amount.toString() : s.amount ? s.amount.toString() : null,
      balance_amount: s.balance_amount ? s.balance_amount.toString() : null,
      status: s.status,
      invoice_id: s.invoice_id
    });
  }

  const invoices = await Invoice.find({ tenant_id: tid });
  console.log('Invoices:', invoices.length);
  for (const inv of invoices) {
    console.log({
      invoice_number: inv.invoice_number,
      installment_number: inv.installment_number,
      total_amount: inv.total_amount ? inv.total_amount.toString() : null,
      balance_due: inv.balance_due ? inv.balance_due.toString() : null,
      status: inv.status,
      journal_id: inv.journal_id
    });
  }

  await mongoose.disconnect();
}
check().catch(console.error);
