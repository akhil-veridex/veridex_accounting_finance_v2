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
      .sort({ createdAt: -1 });

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
      dimensions
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
    const { billing_account_id, amount, payment_method, reference_number, payment_date, target_invoice_id, is_fiduciary } = req.body;
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

module.exports = {
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


