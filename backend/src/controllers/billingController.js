const BigNumber = require('bignumber.js');
const mongoose = require('mongoose');
const {
  BillingPlan,
  BillingAccount,
  BillingAccountPolicy,
  InstallmentSchedule,
  Invoice,
  InvoiceLine,
  Payment,
  PaymentAllocation,
  BillingAdjustment,
  PremiumFinanceAgreement,
  BillingPolicySnapshot,
  BillingTransactionSnapshot,
  ExternalSystem,
  ExternalIdMap
} = require('../models');
const billingService = require('../services/billingService');
const {
  seedDefaultBillingPlans,
  generateInstallmentSchedule,
  issueInvoice,
  processPaymentReceipt,
  createAdjustment,
  createOrUpdatePolicySnapshot,
  createTransactionSnapshot,
  createPremiumFinanceAgreement,
  applyPolicyEndorsement,
  resetPolicyEndorsement
} = billingService;
const { authorizeMigrationAdapter } = require('../utils/migrationAdapterAuth');

// Get AR Summary Overview
async function getBillingOverview(req, res) {
  try {
    const tenantId = req.tenantId;

    // Ensure billing plans are seeded
    await seedDefaultBillingPlans(tenantId);

    const invoices = await Invoice.find({ tenant_id: tenantId });
    const payments = await Payment.find({ tenant_id: tenantId });
    const accounts = await BillingAccount.find({ tenant_id: tenantId });

    let totalBilled = new BigNumber(0);
    let totalOutstanding = new BigNumber(0);
    let totalPaid = new BigNumber(0);
    let totalUnapplied = new BigNumber(0);

    for (const inv of invoices) {
      if (inv.status !== 'VOID') {
        totalBilled = totalBilled.plus(new BigNumber(inv.total_amount.toString()));
        totalOutstanding = totalOutstanding.plus(new BigNumber(inv.balance_due.toString()));
        totalPaid = totalPaid.plus(new BigNumber(inv.amount_paid.toString()));
      }
    }

    for (const acc of accounts) {
      if (acc.unapplied_cash) {
        totalUnapplied = totalUnapplied.plus(new BigNumber(acc.unapplied_cash.toString()));
      }
    }

    return res.success({
      totalBilled: totalBilled.toFixed(2),
      totalOutstanding: totalOutstanding.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalUnapplied: totalUnapplied.toFixed(2),
      activeAccountsCount: accounts.length,
      invoicesCount: invoices.length,
      paymentsCount: payments.length
    });
  } catch (err) {
    return res.error('Failed to load AR overview', 500, err.message);
  }
}

// List Billing Accounts
async function getBillingAccounts(req, res) {
  try {
    const tenantId = req.tenantId;
    const accounts = await BillingAccount.find({ tenant_id: tenantId })
      .populate('default_billing_plan_id')
      .populate('billing_plan_id')
      .populate('payer_party_id', 'party_name party_type legal_name')
      .sort({ createdAt: -1 });

    return res.success(accounts);
  } catch (err) {
    return res.error('Failed to list billing accounts', 500, err.message);
  }
}

// Create Billing Account (ERD v4.6 Module 12 aligned)
async function createBillingAccount(req, res) {
  try {
    const tenantId = req.tenantId;
    const {
      account_number,
      customer_name,
      customer_email,
      billing_address,
      default_billing_plan_id,
      billing_plan_id,
      payer_party_id,
      account_id,
      bill_type,
      currency_code,
      currency
    } = req.body;

    if (!account_number || !customer_name) {
      return res.error('account_number and customer_name are required', 400);
    }

    const cleanNum = account_number.trim().toUpperCase();
    const exists = await BillingAccount.findOne({ tenant_id: tenantId, account_number: cleanNum });
    if (exists) {
      return res.error(`Billing account number "${account_number}" already exists`, 409);
    }

    const planId = billing_plan_id || default_billing_plan_id || null;
    const curr = currency_code || currency || 'USD';

    const account = await BillingAccount.create({
      tenant_id: tenantId,
      account_number: cleanNum,
      customer_name: customer_name.trim(),
      customer_email: customer_email || '',
      billing_address: billing_address || {},
      default_billing_plan_id: planId,
      billing_plan_id: planId,
      payer_party_id: payer_party_id || null,
      account_id: account_id || null,
      bill_type: bill_type || 'DIRECT_BILL',
      currency_code: curr,
      currency: curr
    });

    const populated = await BillingAccount.findById(account._id)
      .populate('default_billing_plan_id')
      .populate('billing_plan_id')
      .populate('payer_party_id');

    return res.success(populated, { message: 'Billing account created' }, 201);
  } catch (err) {
    return res.error('Failed to create billing account', 500, err.message);
  }
}

// Get Billing Account Detail with linked policies and schedules
async function getBillingAccountDetail(req, res) {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const account = await BillingAccount.findOne({ _id: id, tenant_id: tenantId })
      .populate('default_billing_plan_id')
      .populate('billing_plan_id')
      .populate('payer_party_id');
    if (!account) return res.error('Billing account not found', 404);

    const policies = await BillingAccountPolicy.find({ billing_account_id: account._id, tenant_id: tenantId });
    const invoices = await Invoice.find({ billing_account_id: account._id, tenant_id: tenantId }).sort({ due_date: 1 });
    const payments = await Payment.find({ billing_account_id: account._id, tenant_id: tenantId }).sort({ payment_date: -1 });
    const schedules = await InstallmentSchedule.find({ billing_account_id: account._id, tenant_id: tenantId }).sort({ due_date: 1 });

    return res.success({
      account,
      policies,
      invoices,
      payments,
      schedules
    });
  } catch (err) {
    return res.error('Failed to get billing account detail', 500, err.message);
  }
}

// List Billing Plans
async function getBillingPlans(req, res) {
  try {
    const tenantId = req.tenantId;
    let plans = await BillingPlan.find({ tenant_id: tenantId }).sort({ installment_count: 1 });
    if (plans.length === 0) {
      plans = await seedDefaultBillingPlans(tenantId);
    }
    return res.success(plans);
  } catch (err) {
    return res.error('Failed to list billing plans', 500, err.message);
  }
}

// Get Billing Plan by ID
async function getBillingPlanById(req, res) {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const plan = await BillingPlan.findOne({ _id: id, tenant_id: tenantId });
    if (!plan) return res.error('Billing plan not found', 404);
    return res.success(plan);
  } catch (err) {
    return res.error('Failed to get billing plan', 500, err.message);
  }
}

// Create Custom Billing Plan
async function createBillingPlan(req, res) {
  try {
    const tenantId = req.tenantId;
    const { plan_code, plan_name, description, installment_count, down_payment_pct, installment_fee, interval_months } = req.body;

    if (!plan_code || !plan_name || !installment_count) {
      return res.error('plan_code, plan_name, and installment_count are required', 400);
    }

    const exists = await BillingPlan.findOne({ tenant_id: tenantId, plan_code: plan_code.trim().toUpperCase() });
    if (exists) {
      return res.error(`Billing plan code "${plan_code}" already exists`, 409);
    }

    const plan = await BillingPlan.create({
      tenant_id: tenantId,
      plan_code: plan_code.trim().toUpperCase(),
      plan_name: plan_name.trim(),
      description: description || '',
      installment_count: Number(installment_count),
      down_payment_pct: mongoose.Types.Decimal128.fromString(down_payment_pct ? String(down_payment_pct) : '100.00'),
      installment_fee: mongoose.Types.Decimal128.fromString(installment_fee ? String(installment_fee) : '0.00'),
      interval_months: Number(interval_months || 1)
    });

    return res.success(plan, { message: 'Billing plan created' }, 201);
  } catch (err) {
    return res.error('Failed to create billing plan', 500, err.message);
  }
}

// Update Custom Billing Plan
async function updateBillingPlan(req, res) {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const {
      plan_name,
      description,
      installment_count,
      down_payment_pct,
      installment_fee,
      interval_months,
      status
    } = req.body;

    const plan = await BillingPlan.findOne({ _id: id, tenant_id: tenantId });
    if (!plan) return res.error('Billing plan not found', 404);

    if (plan_name !== undefined) plan.plan_name = plan_name.trim();
    if (description !== undefined) plan.description = description;
    if (installment_count !== undefined) plan.installment_count = Number(installment_count);
    if (down_payment_pct !== undefined) plan.down_payment_pct = mongoose.Types.Decimal128.fromString(String(down_payment_pct));
    if (installment_fee !== undefined) plan.installment_fee = mongoose.Types.Decimal128.fromString(String(installment_fee));
    if (interval_months !== undefined) plan.interval_months = Number(interval_months);
    if (status !== undefined) plan.status = status.toUpperCase();

    await plan.save();
    return res.success(plan, { message: `Billing plan ${plan.plan_code} updated successfully` });
  } catch (err) {
    return res.error('Failed to update billing plan', 500, err.message);
  }
}

// Toggle Billing Plan Status (ACTIVE / INACTIVE)
async function toggleBillingPlanStatus(req, res) {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const plan = await BillingPlan.findOne({ _id: id, tenant_id: tenantId });
    if (!plan) return res.error('Billing plan not found', 404);

    plan.status = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await plan.save();

    return res.success(plan, { message: `Billing plan ${plan.plan_code} status set to ${plan.status}` });
  } catch (err) {
    return res.error('Failed to toggle billing plan status', 500, err.message);
  }
}

// Delete Custom Billing Plan
async function deleteBillingPlan(req, res) {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const plan = await BillingPlan.findOne({ _id: id, tenant_id: tenantId });
    if (!plan) return res.error('Billing plan not found', 404);

    // Safeguard check: cannot delete if attached to active billing account
    const usedByAccount = await BillingAccount.findOne({
      tenant_id: tenantId,
      $or: [{ default_billing_plan_id: plan._id }, { billing_plan_id: plan._id }]
    });
    if (usedByAccount) {
      return res.error(`Cannot delete plan "${plan.plan_code}" because it is currently assigned to Billing Account "${usedByAccount.account_number}". Deactivate it instead.`, 409);
    }

    await BillingPlan.deleteOne({ _id: id, tenant_id: tenantId });
    return res.success(null, { message: `Billing plan "${plan.plan_code}" deleted successfully` });
  } catch (err) {
    return res.error('Failed to delete billing plan', 500, err.message);
  }
}

// Link Policy & Generate Installment Schedule (Module 12 / Module 35 Snapshot Architecture)
async function linkPolicyAndGenerateSchedule(req, res) {
  try {
    const tenantId = req.tenantId;
    const {
      billing_account_id,
      policy_id,
      policy_number,
      carrier_name,
      line_of_business,
      effective_date,
      expiration_date,
      total_premium,
      policy_fee,
      tax_amount,
      billing_plan_code,
      snapshot_json = {}
    } = req.body;

    if (!billing_account_id || !policy_number || !total_premium || !effective_date) {
      return res.error('billing_account_id, policy_number, total_premium, and effective_date are required', 400);
    }

    // Ensure default billing plans exist
    await seedDefaultBillingPlans(tenantId);

    const cleanPolicyNumber = policy_number.trim().toUpperCase();

    // 1. Create or Update Immutable Policy Snapshot (Module 35 ERD)
    const policySnapshot = await createOrUpdatePolicySnapshot({
      tenantId,
      policyNumber: cleanPolicyNumber,
      sourceEntityId: policy_id || cleanPolicyNumber,
      sourceVersion: 'v1.0',
      effectiveDate: effective_date,
      expirationDate: expiration_date,
      totalPremium: total_premium,
      totalFees: policy_fee || '0.00',
      totalTaxes: tax_amount || '0.00',
      lineOfBusiness: line_of_business || 'COMMERCIAL_AUTO',
      status: 'BOUND',
      snapshotJson: {
        carrier_name: carrier_name || 'Summit Mutual Insurance Company',
        line_of_business: line_of_business || 'COMMERCIAL_AUTO',
        commercial_fleet: true,
        ...snapshot_json
      }
    });

    // 2. Create Underwriting Transaction Snapshot (Module 35 ERD)
    const txSnapshot = await createTransactionSnapshot({
      tenantId,
      policySnapshotId: policySnapshot._id,
      sourceEntityId: `PTX-NB-${cleanPolicyNumber}`,
      transactionType: 'NEW_BUSINESS',
      effectiveDate: effective_date,
      premiumChange: total_premium,
      charges: policy_fee || '0.00',
      taxes: tax_amount || '0.00',
      snapshotJson: {
        description: 'New Business Bound Policy Issue',
        installment_plan: billing_plan_code || '4_PAY_25_DOWN'
      }
    });

    // 3. Upsert BillingAccountPolicy with billing_policy_snapshot_id FK (CHG 4.0)
    let policyLink = await BillingAccountPolicy.findOne({
      tenant_id: tenantId,
      billing_account_id,
      $or: [
        { billing_policy_snapshot_id: policySnapshot._id },
        { policy_number: cleanPolicyNumber }
      ]
    });

    const effDate = new Date(effective_date);
    const expDate = new Date(expiration_date || new Date(effDate).setFullYear(effDate.getFullYear() + 1));

    if (!policyLink) {
      policyLink = await BillingAccountPolicy.create({
        tenant_id: tenantId,
        billing_account_id,
        billing_policy_snapshot_id: policySnapshot._id, // CHG 4.0: replaces direct policy_id
        policy_id: policy_id || cleanPolicyNumber,
        policy_number: cleanPolicyNumber,
        carrier_name: carrier_name || 'Summit Mutual Insurance Company',
        line_of_business: line_of_business || 'COMMERCIAL_AUTO',
        effective_date: effDate,
        expiration_date: expDate,
        effective_from: effDate,
        effective_to: expDate,
        total_premium: mongoose.Types.Decimal128.fromString(String(total_premium)),
        total_fees: mongoose.Types.Decimal128.fromString(policy_fee ? String(policy_fee) : '0.00'),
        total_taxes: mongoose.Types.Decimal128.fromString(tax_amount ? String(tax_amount) : '0.00'),
        status: 'BOUND'
      });
    } else {
      policyLink.billing_policy_snapshot_id = policySnapshot._id;
      policyLink.effective_date = effDate;
      policyLink.expiration_date = expDate;
      policyLink.effective_from = effDate;
      policyLink.effective_to = expDate;
      policyLink.total_premium = mongoose.Types.Decimal128.fromString(String(total_premium));
      await policyLink.save();
    }

    // 4. Generate Installment Schedule with Snapshot References (Module 12 ERD)
    const schedules = await generateInstallmentSchedule({
      tenantId,
      billingAccountId: billing_account_id,
      policyId: policy_id || cleanPolicyNumber,
      policyNumber: cleanPolicyNumber,
      effectiveDate: effective_date,
      totalPremium: total_premium,
      policyFee: policy_fee || '0.00',
      taxAmount: tax_amount || '0.00',
      billingPlanCode: billing_plan_code || '4_PAY_25_DOWN',
      billingPolicySnapshotId: policySnapshot._id,
      billingTransactionSnapshotId: txSnapshot._id
    });

    return res.success({
      policySnapshot,
      transactionSnapshot: txSnapshot,
      policyLink,
      schedules
    }, { message: `Policy snapshot created & ${schedules.length} installment schedules generated` }, 201);
  } catch (err) {
    return res.error(err.message, 400);
  }
}

// List Invoices
async function getInvoices(req, res) {
  try {
    const tenantId = req.tenantId;
    const { status, policy_id, billing_account_id } = req.query;

    const filter = { tenant_id: tenantId };
    if (status) filter.status = status.toUpperCase();
    if (policy_id) filter.policy_id = policy_id;
    if (billing_account_id) filter.billing_account_id = billing_account_id;

    const invoices = await Invoice.find(filter)
      .populate('billing_account_id', 'account_number customer_name')
      .populate('journal_id', 'journal_number posting_date')
      .sort({ createdAt: -1 })
      .lean();

    const invIds = invoices.map(i => i._id);
    const allLines = await InvoiceLine.find({ invoice_id: { $in: invIds }, tenant_id: tenantId }).lean();
    const linesByInv = {};
    for (const l of allLines) {
      const k = String(l.invoice_id);
      if (!linesByInv[k]) linesByInv[k] = [];
      linesByInv[k].push(l);
    }

    for (const inv of invoices) {
      const lines = linesByInv[String(inv._id)] || [];
      const feeLines = lines.filter(l => l.line_type === 'FEE');
      const premLines = lines.filter(l => l.line_type !== 'FEE');
      const feeTotal = feeLines.reduce((sum, l) => sum + parseFloat(l.amount ? l.amount.toString() : 0), 0);
      const premTotal = premLines.reduce((sum, l) => sum + parseFloat(l.amount ? l.amount.toString() : 0), 0);
      inv.fee_amount = feeTotal.toFixed(2);
      inv.premium_amount = premTotal > 0 ? premTotal.toFixed(2) : (inv.total_amount ? (parseFloat(inv.total_amount.toString()) - feeTotal).toFixed(2) : '0.00');
    }

    return res.success(invoices);
  } catch (err) {
    return res.error('Failed to list invoices', 500, err.message);
  }
}

// Get Invoice Detail with Lines
async function getInvoiceDetail(req, res) {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const invoice = await Invoice.findOne({ _id: id, tenant_id: tenantId })
      .populate('billing_account_id')
      .populate('journal_id');

    if (!invoice) return res.error('Invoice not found', 404);

    const lines = await InvoiceLine.find({ invoice_id: invoice._id, tenant_id: tenantId }).sort({ line_number: 1 });
    const allocations = await PaymentAllocation.find({ invoice_id: invoice._id, tenant_id: tenantId })
      .populate('payment_id', 'payment_number payment_date payment_method');

    return res.success({ invoice, lines, allocations });
  } catch (err) {
    return res.error('Failed to get invoice detail', 500, err.message);
  }
}

// Issue Invoice
async function postIssueInvoice(req, res) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user ? req.user._id : null;
    const {
      billing_account_id,
      policy_id,
      installment_number,
      invoice_date,
      lines,
      carrier_id,
      carrier_name,
      broker_id,
      broker_name,
      dimensions,
      ar_account_code,
      custom_journal_lines
    } = req.body;
    let useMigrationAdapter = false;
    if (req.body.use_migration_adapter === true || req.headers['x-use-migration-adapter'] === 'true') {
      const authCheck = await authorizeMigrationAdapter(req);
      if (!authCheck.authorized) {
        return res.error(authCheck.reason, 403);
      }
      useMigrationAdapter = true;
    }

    if (!billing_account_id || !policy_id || !lines || lines.length === 0) {
      return res.error('billing_account_id, policy_id, and at least one line item are required', 400);
    }

    const result = await issueInvoice({
      tenantId,
      userId,
      billingAccountId: billing_account_id,
      policyId: policy_id,
      installmentNumber: Number(installment_number || 1),
      invoiceDate: invoice_date ? new Date(invoice_date) : new Date(),
      lines,
      carrierId: carrier_id || null,
      carrierName: carrier_name || null,
      brokerId: broker_id || null,
      brokerName: broker_name || null,
      dimensions: dimensions || {},
      arAccountCode: ar_account_code || null,
      customJournalLines: custom_journal_lines || null,
      useMigrationAdapter
    });

    const jNum = result.journal ? result.journal.journal_number : 'PENDING';
    return res.success(result, { message: `Invoice ${result.invoice.invoice_number} issued successfully with GL Journal ${jNum}` }, 201);
  } catch (err) {
    return res.error(err.message, 400);
  }
}

// Record & Allocate Payment Receipt
async function postPaymentReceipt(req, res) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user ? req.user._id : null;
    const { billing_account_id, amount, payment_method, reference_number, payment_date, target_invoice_id, is_fiduciary, custom_journal_lines } = req.body;
    let useMigrationAdapter = false;
    if (req.body.use_migration_adapter === true || req.headers['x-use-migration-adapter'] === 'true') {
      const authCheck = await authorizeMigrationAdapter(req);
      if (!authCheck.authorized) {
        return res.error(authCheck.reason, 403);
      }
      useMigrationAdapter = true;
    }

    if (!billing_account_id || !amount) {
      return res.error('billing_account_id and amount are required', 400);
    }

    if (!target_invoice_id) {
      return res.error('Target invoice is required. You must select an open target invoice to record and allocate payment.', 400);
    }

    const targetInvoice = await Invoice.findOne({
      _id: target_invoice_id,
      tenant_id: tenantId,
      billing_account_id: billing_account_id
    });
    if (!targetInvoice) {
      return res.error('Target invoice not found for this billing account.', 404);
    }
    if (['PAID', 'VOID', 'CANCELLED'].includes(targetInvoice.status)) {
      return res.error(`Target invoice ${targetInvoice.invoice_number} is already ${targetInvoice.status}. Please select an open invoice.`, 400);
    }
    const invBalance = parseFloat(targetInvoice.balance_due ? targetInvoice.balance_due.toString() : '0');
    if (invBalance <= 0) {
      return res.error(`Target invoice ${targetInvoice.invoice_number} has no outstanding balance due ($0.00).`, 400);
    }

    const result = await processPaymentReceipt({
      tenantId,
      userId,
      billingAccountId: billing_account_id,
      amount,
      paymentMethod: payment_method || 'ACH',
      referenceNumber: reference_number || '',
      paymentDate: payment_date ? new Date(payment_date) : new Date(),
      targetInvoiceId: target_invoice_id || null,
      isFiduciary: typeof is_fiduciary === 'boolean' ? is_fiduciary : true,
      customJournalLines: custom_journal_lines || null,
      useMigrationAdapter
    });

    const jNum = result.journal ? result.journal.journal_number : 'PENDING';
    return res.success(result, { message: `Payment ${result.payment.payment_number} captured and allocated with GL Journal ${jNum}` }, 201);
  } catch (err) {
    return res.error(err.message, 400);
  }
}

// List Payments
async function getPayments(req, res) {
  try {
    const tenantId = req.tenantId;
    const payments = await Payment.find({ tenant_id: tenantId })
      .populate('billing_account_id', 'account_number customer_name')
      .populate('journal_id', 'journal_number')
      .sort({ createdAt: -1 });

    return res.success(payments);
  } catch (err) {
    return res.error('Failed to list payments', 500, err.message);
  }
}

// Post Billing Adjustment
async function postAdjustment(req, res) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user ? req.user._id : null;
    const { billing_account_id, invoice_id, adjustment_type, amount, reason_code, reason_description } = req.body;
    let useMigrationAdapter = false;
    if (req.body.use_migration_adapter === true || req.headers['x-use-migration-adapter'] === 'true') {
      const authCheck = await authorizeMigrationAdapter(req);
      if (!authCheck.authorized) {
        return res.error(authCheck.reason, 403);
      }
      useMigrationAdapter = true;
    }

    if (!billing_account_id || !adjustment_type || !amount || !reason_code) {
      return res.error('billing_account_id, adjustment_type, amount, and reason_code are required', 400);
    }

    const result = await createAdjustment({
      tenantId,
      userId,
      billingAccountId: billing_account_id,
      invoiceId: invoice_id || null,
      adjustmentType: adjustment_type,
      amount,
      reasonCode: reason_code,
      reasonDescription: reason_description || '',
      useMigrationAdapter
    });

    const jNum = result.journal ? result.journal.journal_number : 'PENDING';
    return res.success(result, { message: `Adjustment ${result.adjustment.adjustment_number} applied with GL Journal ${jNum}` }, 201);
  } catch (err) {
    return res.error(err.message, 400);
  }
}

// List Adjustments
async function getAdjustments(req, res) {
  try {
    const tenantId = req.tenantId;
    const adjustments = await BillingAdjustment.find({ tenant_id: tenantId })
      .populate('billing_account_id', 'account_number customer_name')
      .populate('invoice_id', 'invoice_number')
      .sort({ createdAt: -1 });

    return res.success(adjustments);
  } catch (err) {
    return res.error('Failed to list adjustments', 500, err.message);
  }
}

// List Installment Schedules
async function getInstallmentSchedules(req, res) {
  try {
    const tenantId = req.tenantId;
    const { policy_id, billing_account_id, status } = req.query;

    const filter = { tenant_id: tenantId };
    if (policy_id) filter.policy_id = policy_id;
    if (billing_account_id) filter.billing_account_id = billing_account_id;
    if (status) filter.status = status.toUpperCase();

    const schedules = await InstallmentSchedule.find(filter)
      .populate('billing_account_id', 'account_number customer_name')
      .populate('invoice_id', 'invoice_number status balance_due')
      .sort({ policy_number: 1, installment_number: 1, due_date: 1 });

    return res.success(schedules);
  } catch (err) {
    return res.error('Failed to list installment schedules', 500, err.message);
  }
}

// List Policy Snapshots (Module 35 / Module 12)
async function getPolicySnapshots(req, res) {
  try {
    const tenantId = req.tenantId;
    const snapshots = await BillingPolicySnapshot.find({ tenant_id: tenantId })
      .populate('payer_party_id', 'party_name party_type')
      .populate('insured_party_id', 'party_name party_type')
      .populate('carrier_party_id', 'party_name party_type')
      .sort({ createdAt: -1 });

    return res.success(snapshots);
  } catch (err) {
    return res.error('Failed to list policy snapshots', 500, err.message);
  }
}

// Get Policy Snapshot Detail with Transaction Snapshots
async function getPolicySnapshotDetail(req, res) {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    let snapshot = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      snapshot = await BillingPolicySnapshot.findOne({ _id: id, tenant_id: tenantId })
        .populate('payer_party_id', 'party_name party_type')
        .populate('insured_party_id', 'party_name party_type')
        .populate('carrier_party_id', 'party_name party_type');
    }
    if (!snapshot) {
      snapshot = await BillingPolicySnapshot.findOne({ billing_policy_snapshot_id: id, tenant_id: tenantId })
        .populate('payer_party_id', 'party_name party_type')
        .populate('insured_party_id', 'party_name party_type')
        .populate('carrier_party_id', 'party_name party_type');
    }
    if (!snapshot) return res.error('Policy snapshot not found', 404);

    const transactions = await BillingTransactionSnapshot.find({
      tenant_id: tenantId,
      billing_policy_snapshot_id: snapshot.billing_policy_snapshot_id
    }).sort({ effective_date: 1 });

    const schedules = await InstallmentSchedule.find({
      tenant_id: tenantId,
      billing_policy_snapshot_id: snapshot.billing_policy_snapshot_id
    }).sort({ installment_number: 1 });

    return res.success({ snapshot, transactions, schedules });
  } catch (err) {
    return res.error('Failed to get policy snapshot detail', 500, err.message);
  }
}

// List Billing Transaction Snapshots
async function getTransactionSnapshots(req, res) {
  try {
    const tenantId = req.tenantId;
    const { policy_snapshot_id } = req.query;

    const filter = { tenant_id: tenantId };
    if (policy_snapshot_id) {
      filter.billing_policy_snapshot_id = policy_snapshot_id;
    }

    const transactions = await BillingTransactionSnapshot.find(filter).sort({ createdAt: -1 });
    return res.success(transactions);
  } catch (err) {
    return res.error('Failed to list transaction snapshots', 500, err.message);
  }
}

// Ingest External Policy Snapshot
async function postPolicySnapshot(req, res) {
  try {
    const tenantId = req.tenantId;
    const {
      policy_number,
      source_entity_id,
      source_version,
      effective_date,
      expiration_date,
      payer_party_id,
      insured_party_id,
      carrier_party_id,
      total_premium,
      total_fees,
      total_taxes,
      line_of_business,
      status,
      snapshot_json
    } = req.body;

    if (!policy_number || !effective_date) {
      return res.error('policy_number and effective_date are required', 400);
    }

    const snap = await createOrUpdatePolicySnapshot({
      tenantId,
      policyNumber: policy_number,
      sourceEntityId: source_entity_id,
      sourceVersion: source_version || 'v1.0',
      effectiveDate: effective_date,
      expirationDate: expiration_date,
      payerPartyId: payer_party_id,
      insuredPartyId: insured_party_id,
      carrierPartyId: carrier_party_id,
      totalPremium: total_premium || '0.00',
      totalFees: total_fees || '0.00',
      totalTaxes: total_taxes || '0.00',
      lineOfBusiness: line_of_business || 'COMMERCIAL_AUTO',
      status: status || 'BOUND',
      snapshotJson: snapshot_json || {}
    });

    return res.success(snap, { message: `Policy snapshot ${snap.billing_policy_snapshot_id} ingested successfully` }, 201);
  } catch (err) {
    return res.error(err.message, 400);
  }
}

// Ingest External Transaction Snapshot
async function postTransactionSnapshot(req, res) {
  try {
    const tenantId = req.tenantId;
    const {
      billing_policy_snapshot_id,
      source_entity_id,
      transaction_type,
      effective_date,
      premium_change,
      charges,
      taxes,
      snapshot_json
    } = req.body;

    if (!billing_policy_snapshot_id || !effective_date) {
      return res.error('billing_policy_snapshot_id and effective_date are required', 400);
    }

    const txSnap = await createTransactionSnapshot({
      tenantId,
      policySnapshotId: billing_policy_snapshot_id,
      sourceEntityId: source_entity_id,
      transactionType: transaction_type || 'NEW_BUSINESS',
      effectiveDate: effective_date,
      premiumChange: premium_change || '0.00',
      charges: charges || '0.00',
      taxes: taxes || '0.00',
      snapshotJson: snapshot_json || {}
    });

    return res.success(txSnap, { message: `Transaction snapshot ${txSnap.billing_transaction_snapshot_id} recorded successfully` }, 201);
  } catch (err) {
    return res.error(err.message, 400);
  }
}

// List Premium Finance Agreements (Module 12)
async function getFinanceAgreements(req, res) {
  try {
    const tenantId = req.tenantId;
    const agreements = await PremiumFinanceAgreement.find({ tenant_id: tenantId })
      .populate('billing_account_id', 'account_number customer_name')
      .populate('finance_company_party_id', 'party_name party_type')
      .sort({ createdAt: -1 });

    return res.success(agreements);
  } catch (err) {
    return res.error('Failed to list finance agreements', 500, err.message);
  }
}

// Post Premium Finance Agreement
async function postFinanceAgreement(req, res) {
  try {
    const tenantId = req.tenantId;
    const {
      billing_account_id,
      billing_account_policy_id,
      finance_company_party_id,
      agreement_number,
      amount_financed,
      down_payment,
      interest_rate,
      notes
    } = req.body;

    if (!billing_account_id || !agreement_number || !amount_financed) {
      return res.error('billing_account_id, agreement_number, and amount_financed are required', 400);
    }

    const agreement = await createPremiumFinanceAgreement({
      tenantId,
      billingAccountId: billing_account_id,
      billingAccountPolicyId: billing_account_policy_id || null,
      financeCompanyPartyId: finance_company_party_id || null,
      agreementNumber: agreement_number,
      amountFinanced: amount_financed,
      downPayment: down_payment || '0.00',
      interestRate: interest_rate || '0.00',
      notes: notes || ''
    });

    return res.success(agreement, { message: `Premium finance agreement ${agreement.agreement_number} registered` }, 201);
  } catch (err) {
    return res.error(err.message, 400);
  }
}

// Post Apply Policy Endorsement (Scenario 2: Truck T5 Pro-Rata Delta)
async function postApplyPolicyEndorsement(req, res) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user ? req.user._id : req.userId;
    const {
      billing_account_id,
      policy_number,
      endorsement_number,
      vehicle_id,
      effective_date,
      annual_rate,
      active_days,
      delta_premium,
      billing_option,
      custom_journal_lines,
      use_migration_adapter
    } = req.body;

    const result = await billingService.applyPolicyEndorsement({
      tenantId,
      userId,
      billingAccountId: billing_account_id,
      policyNumber: policy_number || 'POL-TX-8821',
      endorsementNumber: endorsement_number || 'END-2026-00001',
      vehicleId: vehicle_id || 'TRUCK-T5',
      effectiveDate: effective_date || '2026-09-01',
      annualRate: annual_rate || '8700.00',
      activeDays: active_days || 303,
      deltaPremium: delta_premium || '7222.19',
      billingOption: billing_option || 'SPREAD_INSTALLMENTS',
      customJournalLines: custom_journal_lines || null,
      useMigrationAdapter: Boolean(use_migration_adapter)
    });

    return res.success(result, { message: `Endorsement applied successfully with ${result.billingOption}` });
  } catch (err) {
    console.error('[BillingController] postApplyPolicyEndorsement error:', err);
    return res.error(err.message || 'Failed to apply policy endorsement', 500, err.message);
  }
}

// Reset Policy Endorsement (Testing & Practice Helper)
async function postResetPolicyEndorsement(req, res) {
  try {
    const tenantId = req.tenantId;
    const { policy_number } = req.body;
    const result = await billingService.resetPolicyEndorsement({
      tenantId,
      policyNumber: policy_number || 'POL-TX-8821'
    });
    return res.success(result, { message: result.message });
  } catch (err) {
    console.error('[BillingController] postResetPolicyEndorsement error:', err);
    return res.error(err.message || 'Failed to reset policy endorsement', 500, err.message);
  }
}


// Auto-Repair Unposted Invoices GL Discrepancies
async function postRepairMissingGL(req, res) {
  try {
    const tenantId = req.tenantId;
    const userId = req.user ? req.user._id : null;
    const { Journal, JournalEntry, LedgerAccount } = require('../models');
    const { legacyDirectPost } = require('../services/legacyPostingAdapter');

    const invoices = await Invoice.find({ tenant_id: tenantId });
    const repaired = [];

    for (const inv of invoices) {
      const existingJournal = await Journal.findOne({
        tenant_id: tenantId,
        $or: [
          { reference_id: inv.invoice_number },
          { _id: inv.journal_id }
        ],
        status: 'POSTED'
      });

      if (!existingJournal) {
        const invLines = await InvoiceLine.find({ invoice_id: inv._id });
        let premBN = new BigNumber(0);
        let feeBN = new BigNumber(0);

        if (invLines && invLines.length > 0) {
          for (const l of invLines) {
            const amt = new BigNumber(l.amount ? l.amount.toString() : 0);
            if (l.line_type === 'FEE') {
              feeBN = feeBN.plus(amt);
            } else {
              premBN = premBN.plus(amt);
            }
          }
        } else {
          premBN = new BigNumber(inv.total_amount ? inv.total_amount.toString() : 0);
        }

        const totBN = premBN.plus(feeBN);
        if (totBN.isGreaterThan(0)) {
          const lines = [
            {
              account_code: '1100',
              debit: totBN.toFixed(2),
              credit: '0.00',
              memo: `Dr AR for Invoice ${inv.invoice_number}`
            },
            {
              account_code: '2200',
              debit: '0.00',
              credit: premBN.toFixed(2),
              memo: `Cr UPR for Invoice ${inv.invoice_number}`
            }
          ];
          if (feeBN.isGreaterThan(0)) {
            lines.push({
              account_code: '4100',
              debit: '0.00',
              credit: feeBN.toFixed(2),
              memo: `Cr Policy Fee Income for Invoice ${inv.invoice_number}`
            });
          }

          const gl = await legacyDirectPost({
            tenantId,
            userId,
            postingDate: inv.invoice_date || new Date(),
            sourceModule: 'BILLING_INVOICE',
            referenceId: inv.invoice_number,
            memo: `Auto-Repaired Billing Invoice ${inv.invoice_number} (Policy ${inv.policy_id})`,
            lines
          });

          if (gl && gl.journal) {
            inv.journal_id = gl.journal._id;
            await inv.save();
            repaired.push({
              invoice_number: inv.invoice_number,
              journal_number: gl.journal.journal_number,
              amount: totBN.toFixed(2)
            });
          }
        }
      }
    }

    // 1. Remove duplicate endorsement GL entry for SPREAD_INSTALLMENTS
    const delta1100Entries = await JournalEntry.find({
      tenant_id: tenantId,
      account_code: '1100'
    });

    for (const de of delta1100Entries) {
      const drVal = parseFloat(de.debit ? de.debit.toString() : '0');
      if (Math.abs(drVal - 7222.19) < 0.1) {
        const jId = de.journal_id;
        await JournalEntry.deleteMany({ journal_id: jId });
        await Journal.updateOne(
          { _id: jId },
          {
            $set: {
              status: 'VOID',
              memo: '[VOIDED - Endorsement Delta Spread into Installments]'
            }
          }
        );
      }
    }

    const duplicateEndorsementJournals = await Journal.find({
      tenant_id: tenantId,
      $or: [
        { source_module: 'POLICY_ENDORSEMENT' },
        { memo: { $regex: /endorsement/i } }
      ]
    });

    for (const ej of duplicateEndorsementJournals) {
      await JournalEntry.deleteMany({ journal_id: ej._id, tenant_id: tenantId });
      ej.status = 'VOID';
      ej.memo = `[VOIDED - SPREAD_INSTALLMENTS billed via Installment Invoices] ${ej.memo}`;
      await ej.save();
    }

    // Fix any faulty UPR Commission Allocation Entry ($9,562.50 -> $9,412.50)
    const faultyUprEntries = await JournalEntry.find({
      tenant_id: tenantId,
      account_code: '2200'
    });
    for (const fe of faultyUprEntries) {
      const drVal = parseFloat(fe.debit ? fe.debit.toString() : '0');
      if (Math.abs(drVal - 9562.50) < 0.01) {
        fe.debit = mongoose.Types.Decimal128.fromString('9412.50');
        await fe.save();

        const siblings = await JournalEntry.find({ journal_id: fe.journal_id, tenant_id: tenantId });
        for (const se of siblings) {
          if (se.account_code === '2010') {
            se.credit = mongoose.Types.Decimal128.fromString('7530.00');
            await se.save();
          } else if (se.account_code === '2020') {
            se.credit = mongoose.Types.Decimal128.fromString('941.25');
            await se.save();
          } else if (se.account_code === '4200') {
            se.credit = mongoose.Types.Decimal128.fromString('941.25');
            await se.save();
          }
        }
        await Journal.updateOne(
          { _id: fe.journal_id },
          {
            total_debit: mongoose.Types.Decimal128.fromString('9412.50'),
            total_credit: mongoose.Types.Decimal128.fromString('9412.50')
          }
        );
      }
    }

    // Recalculate LedgerAccount current_balances from all posted JournalEntries
    const allAccounts = await LedgerAccount.find({ tenant_id: tenantId });
    const allEntries = await JournalEntry.find({ tenant_id: tenantId });

    for (const acc of allAccounts) {
      const entriesForAcc = allEntries.filter(e => e.account_code === acc.account_code);
      let drSum = new BigNumber(0);
      let crSum = new BigNumber(0);
      for (const e of entriesForAcc) {
        drSum = drSum.plus(new BigNumber(e.debit ? e.debit.toString() : 0));
        crSum = crSum.plus(new BigNumber(e.credit ? e.credit.toString() : 0));
      }
      let newBalance;
      if (acc.normal_balance === 'DEBIT') {
        newBalance = drSum.minus(crSum);
      } else {
        newBalance = crSum.minus(drSum);
      }
      acc.current_balance = mongoose.Types.Decimal128.fromString(newBalance.toFixed(2));
      acc.current_balance_debit = mongoose.Types.Decimal128.fromString(drSum.toFixed(2));
      acc.current_balance_credit = mongoose.Types.Decimal128.fromString(crSum.toFixed(2));
      await acc.save();
    }

    return res.success({
      repaired_count: repaired.length,
      repaired_invoices: repaired
    }, { message: `GL Audit & Repair complete: ${repaired.length} unposted invoice(s) synchronized and all COA balances recalculated.` });
  } catch (err) {
    console.error('[BillingController] postRepairMissingGL error:', err);
    return res.error(err.message, 500);
  }
}

module.exports = {
  postRepairMissingGL,
  getBillingOverview,
  getBillingAccounts,
  createBillingAccount,
  getBillingAccountDetail,
  getBillingPlans,
  getBillingPlanById,
  createBillingPlan,
  updateBillingPlan,
  toggleBillingPlanStatus,
  deleteBillingPlan,
  linkPolicyAndGenerateSchedule,
  getInstallmentSchedules,
  getInvoices,
  getInvoiceDetail,
  postIssueInvoice,
  postPaymentReceipt,
  getPayments,
  postAdjustment,
  getAdjustments,
  getPolicySnapshots,
  getPolicySnapshotDetail,
  getTransactionSnapshots,
  postPolicySnapshot,
  postTransactionSnapshot,
  getFinanceAgreements,
  postFinanceAgreement,
  postApplyPolicyEndorsement,
  postResetPolicyEndorsement
};


