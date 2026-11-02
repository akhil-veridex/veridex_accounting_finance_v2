require('dotenv').config();
const mongoose = require('mongoose');
const { Invoice, Journal, LedgerAccount } = require('../src/models');

async function findOrphanInvoices() {
  await mongoose.connect(process.env.MONGODB_URI);
  const invoices = await Invoice.find({
    $or: [
      { journal_id: null },
      { journal_id: { $exists: false } }
    ]
  });

  console.log('Invoices with no journal_id:', invoices.length);
  for (const inv of invoices) {
    console.log({
      tenant_id: inv.tenant_id,
      invoice_number: inv.invoice_number,
      installment_number: inv.installment_number,
      total_amount: inv.total_amount ? inv.total_amount.toString() : null,
      balance_due: inv.balance_due ? inv.balance_due.toString() : null,
      status: inv.status
    });
  }

  await mongoose.disconnect();
}
findOrphanInvoices().catch(console.error);
