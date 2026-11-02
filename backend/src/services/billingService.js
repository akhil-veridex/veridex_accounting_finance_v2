const mongoose = require('mongoose');
const BigNumber = require('bignumber.js');
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
  ExternalIdMap,
  Journal,
  JournalEntry,
  LedgerAccount
} = require('../models');
const { publishAndProcessDomainEvent, dispatchOutboxEventRecord } = require('./domainEventPublisher');
const { legacyDirectPost } = require('./legacyPostingAdapter');
const { createOutboxEvent } = require('./outboxService');
const { withOptionalTransaction } = require('../utils/transactionHelper');
const { shouldUseLegacyAdapter } = require('../utils/resolvePostingMode');

/**
 * Seed default billing plans for a tenant if none exist.
 */
async function seedDefaultBillingPlans(tenantId) {
  const existing = await BillingPlan.find({ tenant_id: tenantId });
  if (existing.length > 0) return existing;

  const defaults = [
    {
      tenant_id: tenantId,
      plan_code: 'FULL_PAY',
      plan_name: 'Full Pay (100% Upfront)',
      description: 'Single upfront annual payment with zero installment fees',
      installment_count: 1,
      down_payment_pct: mongoose.Types.Decimal128.fromString('100.00'),
      installment_fee: mongoose.Types.Decimal128.fromString('0.00'),
      interval_months: 0
    },
    {
      tenant_id: tenantId,
      plan_code: '4_PAY_25_DOWN',
      plan_name: '4-Pay (25% Down + 3 Installments)',
      description: '25% down payment + $150 policy fee followed by 3 quarterly installments',
      installment_count: 4,
      down_payment_pct: mongoose.Types.Decimal128.fromString('25.00'),
      installment_fee: mongoose.Types.Decimal128.fromString('0.00'), // Fee is distinct on deposit
      interval_months: 3
    },
    {
      tenant_id: tenantId,
      plan_code: '10_PAY',
      plan_name: '10-Pay Monthly',
      description: '20% down payment followed by 9 equal monthly installments with $15 fee',
      installment_count: 10,
      down_payment_pct: mongoose.Types.Decimal128.fromString('20.00'),
      installment_fee: mongoose.Types.Decimal128.fromString('15.00'),
      interval_months: 1
    }
  ];

  return await BillingPlan.insertMany(defaults);
}

/**
 * Generate Installment Schedule from Billing Plan & Policy Details.
 * For 4-Pay $37,650 + $150 policy fee:
 * Down payment = 25% * $37,650 = $9,412.50 (+ $150 fee) = $9,562.50.
 * Remaining 3 installments = $9,412.50 each.
 */
async function generateInstallmentSchedule({
  tenantId,
  billingAccountId,
  policyId,
  policyNumber,
  effectiveDate,
  totalPremium,
  policyFee = '0.00',
  taxAmount = '0.00',
  billingPlanCode = '4_PAY_25_DOWN',
  billingPolicySnapshotId = null,
  billingTransactionSnapshotId = null
}) {
  const plan = await BillingPlan.findOne({ tenant_id: tenantId, plan_code: billingPlanCode });
  if (!plan) {
    throw new Error(`Billing plan ${billingPlanCode} not found`);
  }

  // Clear existing unbilled schedule for this policy to ensure idempotency
  await InstallmentSchedule.deleteMany({
    tenant_id: tenantId,
    $or: [
      { policy_id: policyId },
      { policy_number: policyNumber }
    ],
    status: 'SCHEDULED'
  });

  const premiumBN = new BigNumber(totalPremium.toString());
  const feeBN = new BigNumber(policyFee.toString());
  const taxBN = new BigNumber(taxAmount.toString());
  const count = plan.installment_count;

  const schedules = [];
  const effDate = new Date(effectiveDate);

  if (count === 1) {
    // Single pay
    const total = premiumBN.plus(feeBN).plus(taxBN);
    schedules.push({
      tenant_id: tenantId,
      billing_account_id: billingAccountId,
      billing_policy_snapshot_id: billingPolicySnapshotId,
      billing_transaction_snapshot_id: billingTransactionSnapshotId,
      policy_id: policyId,
      policy_number: policyNumber,
      installment_number: 1,
      installment_no: 1,
      due_date: effDate,
      premium_amount: mongoose.Types.Decimal128.fromString(premiumBN.toFixed(2)),
      fee_amount: mongoose.Types.Decimal128.fromString(feeBN.toFixed(2)),
      tax_amount: mongoose.Types.Decimal128.fromString(taxBN.toFixed(2)),
      total_amount: mongoose.Types.Decimal128.fromString(total.toFixed(2)),
      amount: mongoose.Types.Decimal128.fromString(total.toFixed(2)),
      balance_amount: mongoose.Types.Decimal128.fromString(total.toFixed(2)),
      status: 'SCHEDULED'
    });
  } else {
    const downPct = new BigNumber(plan.down_payment_pct.toString()).dividedBy(100);
    const downPremium = premiumBN.multipliedBy(downPct).dp(2, BigNumber.ROUND_HALF_UP);
    const remainingPremium = premiumBN.minus(downPremium);
    const remainingInstallmentsCount = count - 1;
    const baseInstallment = remainingPremium.dividedBy(remainingInstallmentsCount).dp(2, BigNumber.ROUND_DOWN);

    // Installment 1: Down Payment (+ full initial policy fee + initial tax)
    const inst1Total = downPremium.plus(feeBN).plus(taxBN);
    schedules.push({
      tenant_id: tenantId,
      billing_account_id: billingAccountId,
      billing_policy_snapshot_id: billingPolicySnapshotId,
      billing_transaction_snapshot_id: billingTransactionSnapshotId,
      policy_id: policyId,
      policy_number: policyNumber,
      installment_number: 1,
      installment_no: 1,
      due_date: new Date(effDate),
      premium_amount: mongoose.Types.Decimal128.fromString(downPremium.toFixed(2)),
      fee_amount: mongoose.Types.Decimal128.fromString(feeBN.toFixed(2)),
      tax_amount: mongoose.Types.Decimal128.fromString(taxBN.toFixed(2)),
      total_amount: mongoose.Types.Decimal128.fromString(inst1Total.toFixed(2)),
      amount: mongoose.Types.Decimal128.fromString(inst1Total.toFixed(2)),
      balance_amount: mongoose.Types.Decimal128.fromString(inst1Total.toFixed(2)),
      status: 'SCHEDULED'
    });

    // Subsequent installments
    let runningRemaining = remainingPremium;
    for (let i = 2; i <= count; i++) {
      const nextDate = new Date(effDate);
      nextDate.setMonth(nextDate.getMonth() + (i - 1) * (plan.interval_months || 1));

      let instPremium;
      if (i === count) {
        // Last installment absorbs any penny rounding remainder
        instPremium = runningRemaining;
      } else {
        instPremium = baseInstallment;
        runningRemaining = runningRemaining.minus(instPremium);
      }

      schedules.push({
        tenant_id: tenantId,
        billing_account_id: billingAccountId,
        billing_policy_snapshot_id: billingPolicySnapshotId,
        billing_transaction_snapshot_id: billingTransactionSnapshotId,
        policy_id: policyId,
        policy_number: policyNumber,
        installment_number: i,
        installment_no: i,
        due_date: nextDate,
        premium_amount: mongoose.Types.Decimal128.fromString(instPremium.toFixed(2)),
        fee_amount: mongoose.Types.Decimal128.fromString('0.00'),
        tax_amount: mongoose.Types.Decimal128.fromString('0.00'),
        total_amount: mongoose.Types.Decimal128.fromString(instPremium.toFixed(2)),
        amount: mongoose.Types.Decimal128.fromString(instPremium.toFixed(2)),
        balance_amount: mongoose.Types.Decimal128.fromString(instPremium.toFixed(2)),
        status: 'SCHEDULED'
      });
    }
  }

  return await InstallmentSchedule.insertMany(schedules);
}

/**
 * Create and Issue an Invoice from an Installment or direct parameters.
 * Automatically posts double-entry GL journal:
 * Debit 1100 Premium Receivable
 * Credit 2200 Unearned Premium Reserve (for premium portion)
 * Credit 4100 Policy Fee Income (for fee portion)
 */
async function issueInvoice({
  tenantId,
  userId,
  billingAccountId,
  policyId,
  installmentNumber = 1,
  invoiceDate = new Date(),
  lines = [], // [{ line_type: 'PREMIUM', description, amount, ledger_account_code }]
  carrierId = null,
  carrierName = null,
  brokerId = null,
  brokerName = null,
  dimensions = {},
  useEventPipeline = null,
  useMigrationAdapter = false,
  correlationId = null,
  dispatchImmediately = null
}) {
  const isLegacy = await shouldUseLegacyAdapter({
    tenantId,
    eventCode: 'billing.invoice.issued',
    useMigrationAdapter
  });

  const { invoice, createdLines, outboxEvent, legacyGlResult } = await withOptionalTransaction(async (session) => {
    const billingAccount = await BillingAccount.findOne({ _id: billingAccountId, tenant_id: tenantId }).session(session);
    if (!billingAccount) throw new Error('Billing account not found');

    const existingInvoice = await Invoice.findOne({
      tenant_id: tenantId,
      policy_id: policyId,
      installment_number: installmentNumber,
      status: { $in: ['ISSUED', 'PARTIALLY_PAID', 'PAID'] }
    }).session(session);
    if (existingInvoice) {
      throw new Error(`Invoice already issued for policy ${policyId} installment #${installmentNumber} (${existingInvoice.invoice_number})`);
    }

    let totalAmountBN = new BigNumber(0);
    for (const l of lines) {
      const amt = new BigNumber(l.amount.toString());
      if (amt.isLessThanOrEqualTo(0)) throw new Error('Invoice line amount must be greater than zero');
      totalAmountBN = totalAmountBN.plus(amt);
    }

    const invoiceCount = await Invoice.countDocuments({ tenant_id: tenantId }).session(session);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const matchingSched = await InstallmentSchedule.findOne({
      tenant_id: tenantId,
      billing_account_id: billingAccountId,
      installment_number: installmentNumber
    }).session(session);

    // If installment already had endorsement delta booked to GL during endorsement, avoid double-posting delta
    let deltaAlreadyBooked = new BigNumber(0);
    if (matchingSched && matchingSched.dimensions && matchingSched.dimensions.endorsement_delta) {
      deltaAlreadyBooked = new BigNumber(matchingSched.dimensions.endorsement_delta.toString());
    }
    const glPostAmountBN = totalAmountBN.minus(deltaAlreadyBooked);

    let lGlResult = null;
    if (isLegacy && glPostAmountBN.isGreaterThan(0)) {
      const journalLines = [
        {
          account_code: '1100',
          debit: glPostAmountBN.toFixed(2),
          credit: '0.00',
          memo: `Dr AR for Invoice ${invoiceNumber}`
        }
      ];

      for (const l of lines) {
        const lineAmt = new BigNumber(l.amount.toString());
        // If line is premium and delta was already booked, adjust credit to 2200
        const creditAmt = (l.line_type !== 'FEE' && deltaAlreadyBooked.isGreaterThan(0))
          ? lineAmt.minus(deltaAlreadyBooked).dp(2)
          : lineAmt;

        if (creditAmt.isGreaterThan(0)) {
          journalLines.push({
            account_code: l.ledger_account_code || (l.line_type === 'FEE' ? '4100' : '2200'),
            debit: '0.00',
            credit: creditAmt.toFixed(2),
            memo: `Cr ${l.description}`
          });
        }
      }

      lGlResult = await legacyDirectPost({
        tenantId,
        userId,
        postingDate: invoiceDate,
        sourceModule: 'BILLING_INVOICE',
        referenceId: invoiceNumber,
        memo: `Billing Invoice ${invoiceNumber} - ${billingAccount.customer_name}`,
        lines: journalLines
      });
    }

    // Resolve Carrier and Broker details
    let resolvedCarrierName = carrierName || billingAccount.carrier_name;
    let resolvedBrokerName = brokerName || billingAccount.broker_name;
    let resolvedCarrierId = carrierId || billingAccount.carrier_id;
    let resolvedBrokerId = brokerId || billingAccount.broker_id;

    if (!resolvedCarrierName) {
      const polLink = await BillingAccountPolicy.findOne({ tenant_id: tenantId, policy_id: policyId }).session(session);
      if (polLink && polLink.carrier_name) resolvedCarrierName = polLink.carrier_name;
    }

    const mergedDimensions = {
      ...(billingAccount.dimensions || {}),
      ...(dimensions || {})
    };
    if (resolvedCarrierName) mergedDimensions.carrier_name = resolvedCarrierName;
    if (resolvedCarrierId) mergedDimensions.carrier_id = String(resolvedCarrierId);
    if (resolvedBrokerName) mergedDimensions.broker_name = resolvedBrokerName;
    if (resolvedBrokerId) mergedDimensions.broker_id = String(resolvedBrokerId);

    const invDoc = new Invoice({
      tenant_id: tenantId,
      billing_account_id: billingAccountId,
      policy_id: policyId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      installment_number: installmentNumber,
      total_amount: mongoose.Types.Decimal128.fromString(totalAmountBN.toFixed(2)),
      amount_paid: mongoose.Types.Decimal128.fromString('0.00'),
      balance_due: mongoose.Types.Decimal128.fromString(totalAmountBN.toFixed(2)),
      status: 'ISSUED',
      journal_id: lGlResult ? lGlResult.journal._id : null,
      memo: `Policy ${policyId} Installment #${installmentNumber}`,
      carrier_id: resolvedCarrierId || null,
      carrier_name: resolvedCarrierName || null,
      broker_id: resolvedBrokerId || null,
      broker_name: resolvedBrokerName || null,
      dimensions: mergedDimensions
    });
    await invDoc.save({ session });

    const crLines = [];
    for (let idx = 0; idx < lines.length; idx++) {
      const l = lines[idx];
      const lineDoc = new InvoiceLine({
        tenant_id: tenantId,
        invoice_id: invDoc._id,
        installment_id: matchingSched ? matchingSched._id : null,
        billing_transaction_snapshot_id: matchingSched ? matchingSched.billing_transaction_snapshot_id : null,
        line_number: idx + 1,
        line_type: l.line_type || 'PREMIUM',
        description: l.description,
        amount: mongoose.Types.Decimal128.fromString(new BigNumber(l.amount.toString()).toFixed(2)),
        tax_amount: mongoose.Types.Decimal128.fromString(new BigNumber(l.tax_amount || 0).toFixed(2)),
        currency_code: 'USD',
        ledger_account_code: l.ledger_account_code || (l.line_type === 'FEE' ? '4100' : '2200')
      });
      await lineDoc.save({ session });
      crLines.push(lineDoc);
    }

    await InstallmentSchedule.updateOne(
      { tenant_id: tenantId, policy_id: policyId, installment_number: installmentNumber },
      { status: 'BILLED', invoice_id: invDoc._id },
      { session }
    );

    const currentAccBal = new BigNumber(billingAccount.current_balance ? billingAccount.current_balance.toString() : '0');
    billingAccount.current_balance = mongoose.Types.Decimal128.fromString(currentAccBal.plus(glPostAmountBN).toFixed(2));
    await billingAccount.save({ session });

    let oEvent = null;
    if (!isLegacy) {
      const premiumLines = lines.filter(l => l.line_type !== 'FEE');
      const feeLines = lines.filter(l => l.line_type === 'FEE');
      const premiumAmt = premiumLines.reduce((acc, l) => acc.plus(new BigNumber(l.amount.toString())), new BigNumber(0)).toNumber();
      const feeAmt = feeLines.reduce((acc, l) => acc.plus(new BigNumber(l.amount.toString())), new BigNumber(0)).toNumber();

      const eventResult = await publishAndProcessDomainEvent({
        tenantId,
        eventType: 'billing.invoice.issued',
        eventVersion: '1.0.0',
        sourceModule: 'BILLING',
        sourceEntityType: 'Invoice',
        sourceEntityId: invoiceNumber,
        sourceTransactionId: invoiceNumber,
        correlationId: correlationId || `CORR-${invoiceNumber}`,
        occurredAt: invoiceDate,
        payload: {
          invoice_id: String(invDoc._id),
          invoice_number: invoiceNumber,
          policy_id: String(policyId),
          billing_account_id: String(billingAccountId),
          installment_number: installmentNumber,
          total_amount: totalAmountBN.toNumber(),
          premium_amount: premiumAmt,
          gross_premium: premiumAmt,
          fee_amount: feeAmt,
          policy_fee: feeAmt,
          transaction_type: 'DIRECT_BILL',
          currency: 'USD',
          customer_name: billingAccount.customer_name,
          carrier_id: resolvedCarrierId ? String(resolvedCarrierId) : undefined,
          carrier_name: resolvedCarrierName || undefined,
          broker_id: resolvedBrokerId ? String(resolvedBrokerId) : undefined,
          broker_name: resolvedBrokerName || undefined,
          dimensions: mergedDimensions
        },
        userId,
        session,
        dispatchImmediately: false
      });
      oEvent = eventResult.outboxEvent;
    }

    return {
      invoice: invDoc,
      createdLines: crLines,
      outboxEvent: oEvent,
      legacyGlResult: lGlResult
    };
  });

  let glResult = legacyGlResult;
  let eventDriven = false;

  // Post-commit dispatch outside MongoDB transaction
  if (!isLegacy && outboxEvent) {
    const shouldDispatch = dispatchImmediately !== null ? dispatchImmediately : !useEventPipeline;
    if (shouldDispatch) {
      try {
        const dispatchResult = await dispatchOutboxEventRecord(outboxEvent, { userId });
        if (dispatchResult.journal) {
          glResult = { journal: dispatchResult.journal };
          invoice.journal_id = dispatchResult.journal._id;
          await Invoice.updateOne({ _id: invoice._id }, { journal_id: dispatchResult.journal._id });
        }
      } catch (dispatchErr) {
        console.error(`[BillingService] Immediate event dispatch failed for ${invoice.invoice_number}:`, dispatchErr.message);
        // Fallback to direct GL posting so the invoice is never left without balanced double-entry GL records
        try {
          const premiumLines = (lines || []).filter(l => l.line_type !== 'FEE');
          const feeLines = (lines || []).filter(l => l.line_type === 'FEE');
          const premAmt = premiumLines.reduce((acc, l) => acc.plus(new BigNumber(l.amount.toString())), new BigNumber(0));
          const feeAmt = feeLines.reduce((acc, l) => acc.plus(new BigNumber(l.amount.toString())), new BigNumber(0));
          const totAmt = premAmt.plus(feeAmt);

          const fallbackLines = [
            { account_code: '1100', debit: totAmt.toFixed(2), credit: '0.00', memo: `Dr AR for Invoice ${invoice.invoice_number}` }
          ];
          if (premAmt.isGreaterThan(0)) {
            fallbackLines.push({ account_code: '2200', debit: '0.00', credit: premAmt.toFixed(2), memo: `Cr UPR for Invoice ${invoice.invoice_number}` });
          }
          if (feeAmt.isGreaterThan(0)) {
            fallbackLines.push({ account_code: '4100', debit: '0.00', credit: feeAmt.toFixed(2), memo: `Cr Policy Fee Income for Invoice ${invoice.invoice_number}` });
          }

          const fallbackGl = await legacyDirectPost({
            tenantId,
            userId,
            postingDate: invoiceDate,
            sourceModule: 'BILLING_INVOICE',
            referenceId: invoice.invoice_number,
            memo: `Billing Invoice ${invoice.invoice_number}`,
            lines: fallbackLines
          });
          if (fallbackGl && fallbackGl.journal) {
            glResult = fallbackGl;
            invoice.journal_id = fallbackGl.journal._id;
            await Invoice.updateOne({ _id: invoice._id }, { journal_id: fallbackGl.journal._id });
          }
        } catch (fallbackErr) {
          console.error('[BillingService] Fallback GL posting error:', fallbackErr.message);
        }
      }
    }
    eventDriven = true;
  }

  return {
    invoice,
    lines: createdLines,
    journal: glResult ? glResult.journal : null,
    outboxEvent,
    eventDriven
  };
}

/**
 * Process Customer Cash Receipt and Waterfall Allocation against open invoices.
 * Posts GL Journal:
 * Debit 1010 Premium Trust (or 1000 Operating Cash)
 * Credit 1100 Premium Receivable (for allocated amount)
 * Credit 2190 Unapplied Cash Suspense (for excess payment amount)
 */
async function processPaymentReceipt({
  tenantId,
  userId,
  billingAccountId,
  amount,
  paymentMethod = 'ACH',
  referenceNumber = '',
  paymentDate = new Date(),
  targetInvoiceId = null,
  isFiduciary = true,
  useMigrationAdapter = false
}) {
  const isLegacy = await shouldUseLegacyAdapter({
    tenantId,
    eventCode: 'billing.payment.received',
    useMigrationAdapter
  });

  const { payment, createdAllocations, outboxEvent, legacyGlResult } = await withOptionalTransaction(async (session) => {
    const billingAccount = await BillingAccount.findOne({ _id: billingAccountId, tenant_id: tenantId }).session(session);
    if (!billingAccount) throw new Error('Billing account not found');

    const paymentAmountBN = new BigNumber(amount.toString());
    if (paymentAmountBN.isLessThanOrEqualTo(0)) {
      throw new Error('Payment amount must be greater than zero');
    }

    const pCount = await Payment.countDocuments({ tenant_id: tenantId }).session(session);
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(pCount + 1).padStart(5, '0')}`;

    // Find candidate open invoices for allocation
    let invoiceQuery = {
      tenant_id: tenantId,
      billing_account_id: billingAccountId,
      status: { $in: ['ISSUED', 'PARTIALLY_PAID'] }
    };
    if (targetInvoiceId) {
      invoiceQuery._id = targetInvoiceId;
    }

    // Sort oldest due date first (standard waterfall)
    const openInvoices = await Invoice.find(invoiceQuery).session(session).sort({ due_date: 1, createdAt: 1 });

    let unallocatedBN = paymentAmountBN;
    let totalAllocatedBN = new BigNumber(0);
    const allocationRecords = [];

    for (const inv of openInvoices) {
      if (unallocatedBN.isZero()) break;

      const invBalance = new BigNumber(inv.balance_due.toString());
      if (invBalance.isLessThanOrEqualTo(0)) continue;

      const allocAmt = BigNumber.min(unallocatedBN, invBalance);
      unallocatedBN = unallocatedBN.minus(allocAmt);
      totalAllocatedBN = totalAllocatedBN.plus(allocAmt);

      const newInvBalance = invBalance.minus(allocAmt);
      const newPaidAmount = new BigNumber(inv.amount_paid.toString()).plus(allocAmt);
      inv.balance_due = mongoose.Types.Decimal128.fromString(newInvBalance.toFixed(2));
      inv.amount_paid = mongoose.Types.Decimal128.fromString(newPaidAmount.toFixed(2));
      inv.status = newInvBalance.isZero() ? 'PAID' : 'PARTIALLY_PAID';
      await inv.save({ session });

      allocationRecords.push({
        invoice_id: inv._id,
        installment_number: inv.installment_number,
        allocated_amount: allocAmt
      });

      // Update corresponding installment schedule if exists
      if (inv.installment_number) {
        await InstallmentSchedule.updateOne(
          { tenant_id: tenantId, invoice_id: inv._id },
          {
            paid_amount: mongoose.Types.Decimal128.fromString(newPaidAmount.toFixed(2)),
            balance_amount: mongoose.Types.Decimal128.fromString(newInvBalance.toFixed(2)),
            status: newInvBalance.isZero() ? 'PAID' : 'PARTIALLY_PAID'
          },
          { session }
        );
      }
    }

    let lGlResult = null;
    if (isLegacy) {
      const cashAccountCode = isFiduciary ? '1010' : '1000';
      const journalLines = [
        {
          account_code: cashAccountCode,
          debit: paymentAmountBN.toFixed(2),
          credit: '0.00',
          memo: `Dr Cash received via ${paymentMethod} (${paymentNumber})`
        }
      ];

      if (totalAllocatedBN.isGreaterThan(0)) {
        journalLines.push({
          account_code: '1100',
          debit: '0.00',
          credit: totalAllocatedBN.toFixed(2),
          memo: `Cr AR knocked off by Payment ${paymentNumber}`
        });
      }

      if (unallocatedBN.isGreaterThan(0)) {
        journalLines.push({
          account_code: '2190',
          debit: '0.00',
          credit: unallocatedBN.toFixed(2),
          memo: `Cr Unapplied Cash Suspense for excess payment ${paymentNumber}`
        });
      }

      lGlResult = await legacyDirectPost({
        tenantId,
        userId,
        postingDate: paymentDate,
        sourceModule: 'BILLING_PAYMENT',
        referenceId: paymentNumber,
        memo: `Customer Cash Receipt ${paymentNumber} - ${billingAccount.customer_name}`,
        lines: journalLines
      });
    }

    // 2. Persist Payment Header
    const paymentStatus = unallocatedBN.isZero()
      ? 'FULLY_ALLOCATED'
      : totalAllocatedBN.isGreaterThan(0)
      ? 'PARTIALLY_ALLOCATED'
      : 'RECEIVED';

    const paymentDoc = new Payment({
      tenant_id: tenantId,
      billing_account_id: billingAccountId,
      payment_number: paymentNumber,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      amount: mongoose.Types.Decimal128.fromString(paymentAmountBN.toFixed(2)),
      allocated_amount: mongoose.Types.Decimal128.fromString(totalAllocatedBN.toFixed(2)),
      unapplied_amount: mongoose.Types.Decimal128.fromString(unallocatedBN.toFixed(2)),
      status: paymentStatus,
      journal_id: lGlResult && lGlResult.journal ? lGlResult.journal._id : null,
      notes: `Simulated receipt via ${paymentMethod}`
    });
    await paymentDoc.save({ session });

    // 3. Persist Allocation Records
    const crAllocations = [];
    for (const alloc of allocationRecords) {
      const allocDoc = new PaymentAllocation({
        tenant_id: tenantId,
        payment_id: paymentDoc._id,
        invoice_id: alloc.invoice_id,
        allocated_amount: mongoose.Types.Decimal128.fromString(alloc.allocated_amount.toFixed(2)),
        allocation_type: 'WATERFALL',
        status: 'APPLIED'
      });
      await allocDoc.save({ session });
      crAllocations.push(allocDoc);
    }

    // 4. Update Billing Account balances
    const curBalBN = new BigNumber(billingAccount.current_balance ? billingAccount.current_balance.toString() : '0');
    const unappliedAccBN = new BigNumber(billingAccount.unapplied_cash ? billingAccount.unapplied_cash.toString() : '0');

    billingAccount.current_balance = mongoose.Types.Decimal128.fromString(
      BigNumber.max(0, curBalBN.minus(totalAllocatedBN)).toFixed(2)
    );
    billingAccount.unapplied_cash = mongoose.Types.Decimal128.fromString(
      unappliedAccBN.plus(unallocatedBN).toFixed(2)
    );
    await billingAccount.save({ session });

    let oEvent = null;
    if (!isLegacy) {
      const eventResult = await publishAndProcessDomainEvent({
        tenantId,
        eventType: 'billing.payment.received',
        eventVersion: '1.0.0',
        sourceModule: 'BILLING',
        sourceEntityType: 'Payment',
        sourceEntityId: paymentNumber,
        sourceTransactionId: paymentNumber,
        correlationId: `CORR-PMT-${paymentNumber}`,
        occurredAt: paymentDate,
        payload: {
          payment_id: String(paymentDoc._id),
          payment_number: paymentNumber,
          billing_account_id: String(billingAccountId),
          policy_id: openInvoices[0]?.policy_id ? String(openInvoices[0].policy_id) : (billingAccount.policies?.[0]?.policy_id ? String(billingAccount.policies[0].policy_id) : ''),
          invoice_id: targetInvoiceId ? String(targetInvoiceId) : (openInvoices[0] ? String(openInvoices[0]._id) : ''),
          amount: paymentAmountBN.toNumber(),
          payment_amount: paymentAmountBN.toNumber(),
          allocated_amount: totalAllocatedBN.toNumber(),
          unapplied_amount: unallocatedBN.toNumber(),
          payment_method: paymentMethod,
          reference_number: referenceNumber || '',
          is_fiduciary: Boolean(isFiduciary),
          currency: 'USD'
        },
        userId,
        session,
        dispatchImmediately: false
      });
      oEvent = eventResult.outboxEvent;
    }

    return {
      payment: paymentDoc,
      createdAllocations: crAllocations,
      outboxEvent: oEvent,
      legacyGlResult: lGlResult
    };
  });

  let glResult = legacyGlResult;
  let eventDriven = false;

  // Post-commit dispatch outside MongoDB transaction
  if (!isLegacy && outboxEvent) {
    const dispatchResult = await dispatchOutboxEventRecord(outboxEvent, { userId });
    if (dispatchResult.journal) {
      glResult = { journal: dispatchResult.journal };
      payment.journal_id = dispatchResult.journal._id;
      await Payment.updateOne({ _id: payment._id }, { journal_id: dispatchResult.journal._id });
    }
    eventDriven = true;
  }

  return {
    payment,
    allocations: createdAllocations,
    journal: glResult ? glResult.journal : null,
    outboxEvent,
    eventDriven
  };
}

/**
 * Create Billing Adjustment (Fee Waiver, Credit Memo, Bad Debt Write-off)
 */
async function createAdjustment({
  tenantId,
  userId,
  billingAccountId,
  invoiceId = null,
  adjustmentType,
  amount,
  reasonCode,
  reasonDescription = '',
  useMigrationAdapter = false
}) {
  const isLegacy = await shouldUseLegacyAdapter({
    tenantId,
    eventCode: 'billing.adjustment.applied',
    useMigrationAdapter
  });

  const { adjustment, outboxEvent, legacyGlResult } = await withOptionalTransaction(async (session) => {
    const billingAccount = await BillingAccount.findOne({ _id: billingAccountId, tenant_id: tenantId }).session(session);
    if (!billingAccount) throw new Error('Billing account not found');

    const adjAmountBN = new BigNumber(amount.toString());
    if (adjAmountBN.isLessThanOrEqualTo(0)) throw new Error('Adjustment amount must be positive');

    // F-06: Strict validation against invoice open balance
    let invToAdjust = null;
    if (invoiceId) {
      invToAdjust = await Invoice.findOne({ _id: invoiceId, tenant_id: tenantId }).session(session);
      if (!invToAdjust) throw new Error('Invoice not found');
      const invCurBal = new BigNumber(invToAdjust.balance_due.toString());
      if (adjAmountBN.isGreaterThan(invCurBal)) {
        throw new Error(`Adjustment amount ($${adjAmountBN.toFixed(2)}) cannot exceed open invoice balance ($${invCurBal.toFixed(2)})`);
      }
    }

    const count = await BillingAdjustment.countDocuments({ tenant_id: tenantId }).session(session);
    const adjustmentNumber = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    let lGlResult = null;
    if (isLegacy) {
      const debitAccount = adjustmentType === 'FEE_WAIVER' ? '4100' : '5000';
      lGlResult = await legacyDirectPost({
        tenantId,
        userId,
        postingDate: new Date(),
        sourceModule: 'BILLING_ADJUSTMENT',
        referenceId: adjustmentNumber,
        memo: `Billing Adjustment ${adjustmentNumber} (${adjustmentType}): ${reasonDescription}`,
        lines: [
          {
            account_code: debitAccount,
            debit: adjAmountBN.toFixed(2),
            credit: '0.00',
            memo: `Dr ${adjustmentType} adjustment`
          },
          {
            account_code: '1100',
            debit: '0.00',
            credit: adjAmountBN.toFixed(2),
            memo: `Cr AR knocked off by ${adjustmentNumber}`
          }
        ]
      });
    }

    const adjDoc = new BillingAdjustment({
      tenant_id: tenantId,
      billing_account_id: billingAccountId,
      invoice_id: invoiceId || null,
      adjustment_number: adjustmentNumber,
      adjustment_type: adjustmentType,
      amount: mongoose.Types.Decimal128.fromString(adjAmountBN.toFixed(2)),
      reason_code: reasonCode,
      reason_description: reasonDescription,
      approved_by_user_id: userId,
      approved_at: new Date(),
      journal_id: lGlResult ? lGlResult.journal._id : null,
      status: 'APPLIED'
    });
    await adjDoc.save({ session });

    // If tied to an invoice, knock off invoice balance exactly
    if (invToAdjust) {
      const invCurBal = new BigNumber(invToAdjust.balance_due.toString());
      const newBalance = invCurBal.minus(adjAmountBN);
      invToAdjust.balance_due = mongoose.Types.Decimal128.fromString(newBalance.toFixed(2));
      if (newBalance.isZero()) {
        invToAdjust.status = 'PAID';
      }
      await invToAdjust.save({ session });
    }

    // Update account current balance
    const curBal = new BigNumber(billingAccount.current_balance ? billingAccount.current_balance.toString() : '0');
    billingAccount.current_balance = mongoose.Types.Decimal128.fromString(BigNumber.max(0, curBal.minus(adjAmountBN)).toFixed(2));
    await billingAccount.save({ session });

    let oEvent = null;
    if (!isLegacy) {
      const eventResult = await publishAndProcessDomainEvent({
        tenantId,
        eventType: 'billing.adjustment.applied',
        eventVersion: '1.0.0',
        sourceModule: 'BILLING',
        sourceEntityType: 'BillingAdjustment',
        sourceEntityId: adjustmentNumber,
        sourceTransactionId: adjustmentNumber,
        correlationId: `CORR-ADJ-${adjustmentNumber}`,
        occurredAt: new Date(),
        payload: {
          adjustment_number: adjustmentNumber,
          billing_account_id: String(billingAccountId),
          invoice_id: invoiceId ? String(invoiceId) : null,
          adjustment_type: adjustmentType,
          amount: adjAmountBN.toNumber(),
          reason_code: reasonCode,
          reason_description: reasonDescription,
          currency: 'USD'
        },
        userId,
        session,
        dispatchImmediately: false
      });
      oEvent = eventResult.outboxEvent;
    }

    return {
      adjustment: adjDoc,
      outboxEvent: oEvent,
      legacyGlResult: lGlResult
    };
  });

  let glResult = legacyGlResult;
  let eventDriven = false;

  // Post-commit dispatch outside MongoDB transaction
  if (!isLegacy && outboxEvent) {
    const dispatchResult = await dispatchOutboxEventRecord(outboxEvent, { userId });
    if (dispatchResult.journal) {
      glResult = { journal: dispatchResult.journal };
      adjustment.journal_id = dispatchResult.journal._id;
      await BillingAdjustment.updateOne({ _id: adjustment._id }, { journal_id: dispatchResult.journal._id });
    }
    eventDriven = true;
  }

  return {
    adjustment,
    journal: glResult ? glResult.journal : null,
    outboxEvent,
    eventDriven
  };
}

/**
 * Create or Update a Billing Policy Snapshot (Module 35 standalone operation)
 */
async function createOrUpdatePolicySnapshot({
  tenantId,
  policyNumber,
  sourceEntityId = '',
  sourceVersion = 'v1.0',
  effectiveDate,
  expirationDate,
  payerPartyId = null,
  insuredPartyId = null,
  carrierPartyId = null,
  totalPremium = '0.00',
  totalFees = '0.00',
  totalTaxes = '0.00',
  lineOfBusiness = 'COMMERCIAL_AUTO',
  status = 'BOUND',
  snapshotJson = {}
}) {
  const cleanNumber = policyNumber.trim().toUpperCase();
  let snap = await BillingPolicySnapshot.findOne({
    tenant_id: tenantId,
    policy_number: cleanNumber,
    source_version: sourceVersion
  });

  const effDate = new Date(effectiveDate);
  const expDate = expirationDate ? new Date(expirationDate) : new Date(new Date(effDate).setFullYear(effDate.getFullYear() + 1));

  if (!snap) {
    snap = await BillingPolicySnapshot.create({
      tenant_id: tenantId,
      policy_number: cleanNumber,
      source_entity_id: sourceEntityId || cleanNumber,
      source_version: sourceVersion,
      source_event_position: 1,
      source_updated_at: new Date(),
      effective_date: effDate,
      expiration_date: expDate,
      payer_party_id: payerPartyId,
      insured_party_id: insuredPartyId,
      carrier_party_id: carrierPartyId,
      total_premium: mongoose.Types.Decimal128.fromString(String(totalPremium)),
      total_fees: mongoose.Types.Decimal128.fromString(String(totalFees)),
      total_taxes: mongoose.Types.Decimal128.fromString(String(totalTaxes)),
      line_of_business: lineOfBusiness,
      status,
      snapshot_json: snapshotJson
    });
  } else {
    snap.effective_date = effDate;
    snap.expiration_date = expDate;
    if (payerPartyId) snap.payer_party_id = payerPartyId;
    if (insuredPartyId) snap.insured_party_id = insuredPartyId;
    if (carrierPartyId) snap.carrier_party_id = carrierPartyId;
    snap.total_premium = mongoose.Types.Decimal128.fromString(String(totalPremium));
    snap.total_fees = mongoose.Types.Decimal128.fromString(String(totalFees));
    snap.total_taxes = mongoose.Types.Decimal128.fromString(String(totalTaxes));
    snap.status = status;
    snap.snapshot_json = { ...(snap.snapshot_json || {}), ...snapshotJson };
    await snap.save();
  }

  return snap;
}

/**
 * Create a Billing Transaction Snapshot (Module 35 underwriting transaction change)
 */
async function createTransactionSnapshot({
  tenantId,
  policySnapshotId,
  sourceEntityId = '',
  transactionType = 'NEW_BUSINESS',
  effectiveDate,
  premiumChange = '0.00',
  charges = '0.00',
  taxes = '0.00',
  snapshotJson = {}
}) {
  const txSnap = await BillingTransactionSnapshot.create({
    tenant_id: tenantId,
    billing_policy_snapshot_id: policySnapshotId,
    source_entity_id: sourceEntityId || `PTX-${transactionType}-${Date.now()}`,
    source_event_position: 1,
    transaction_type: transactionType,
    effective_date: new Date(effectiveDate),
    premium_change: mongoose.Types.Decimal128.fromString(String(premiumChange)),
    charges: mongoose.Types.Decimal128.fromString(String(charges)),
    taxes: mongoose.Types.Decimal128.fromString(String(taxes)),
    currency_code: 'USD',
    snapshot_json: snapshotJson
  });
  return txSnap;
}

/**
 * Create a Premium Finance Agreement (Module 12)
 */
async function createPremiumFinanceAgreement({
  tenantId,
  billingAccountId,
  billingAccountPolicyId,
  financeCompanyPartyId = null,
  agreementNumber,
  amountFinanced,
  downPayment = '0.00',
  interestRate = '0.00',
  notes = ''
}) {
  const cleanAgreement = agreementNumber.trim().toUpperCase();
  const agreement = await PremiumFinanceAgreement.create({
    tenant_id: tenantId,
    billing_account_id: billingAccountId,
    billing_account_policy_id: billingAccountPolicyId,
    finance_company_party_id: financeCompanyPartyId,
    agreement_number: cleanAgreement,
    amount_financed: mongoose.Types.Decimal128.fromString(String(amountFinanced)),
    down_payment: mongoose.Types.Decimal128.fromString(String(downPayment)),
    interest_rate: mongoose.Types.Decimal128.fromString(String(interestRate)),
    currency_code: 'USD',
    status: 'ACTIVE',
    notes
  });
  return agreement;
}

/**
 * Apply Policy Mid-Term Endorsement (Scenario 2: Truck T5 Pro-Rata Delta $7,222.19)
 * Supports two sub-scenarios / billing methods:
 * 1. STANDALONE_INVOICE (Option A): Creates a standalone endorsement invoice/schedule for $7,222.19. Existing installments stay unchanged at $9,412.50.
 * 2. SPREAD_INSTALLMENTS (Option B - US Commercial Auto Default): Spreads $7,222.19 across remaining unbilled installments (+$2,407.40 to Inst #2, #3, and +$2,407.39 to Inst #4).
 * Both post the required GL Entry:
 *   Debit 1100 Premium Receivable: deltaPremium ($7,222.19)
 *   Credit 2200 Unearned Premium Reserve: deltaPremium ($7,222.19)
 * Updates Policy Snapshot total premium: $37,650.00 + $7,222.19 = $44,872.19.
 * Records Underwriting Transaction Snapshot (type: ENDORSEMENT).
 */
async function applyPolicyEndorsement({
  tenantId,
  userId,
  policyNumber = 'POL-TX-8821',
  endorsementNumber = 'END-2026-00001',
  vehicleId = 'TRUCK-T5',
  effectiveDate = '2026-09-01',
  annualRate = '8700.00',
  activeDays = 303,
  deltaPremium = '7222.19',
  billingOption = 'SPREAD_INSTALLMENTS', // 'SPREAD_INSTALLMENTS' | 'STANDALONE_INVOICE'
  billingAccountId = null,
  autoIssueStandaloneInvoice = true,
  useMigrationAdapter = false
}) {
  const cleanPolicyNumber = policyNumber.trim().toUpperCase();
  const deltaBN = new BigNumber(deltaPremium.toString());
  if (deltaBN.isLessThanOrEqualTo(0)) {
    throw new Error('Endorsement delta premium must be greater than zero');
  }

  // 1. Resolve Billing Account & Linked Policy
  let polLink = await BillingAccountPolicy.findOne({
    tenant_id: tenantId,
    $or: [{ policy_number: cleanPolicyNumber }, { policy_id: cleanPolicyNumber }]
  });

  const bAccId = billingAccountId || (polLink ? polLink.billing_account_id : null);
  const billingAccount = await BillingAccount.findOne({
    tenant_id: tenantId,
    ...(bAccId ? { _id: bAccId } : {})
  });
  if (!billingAccount) {
    throw new Error('Billing account not found for policy endorsement');
  }

  // 2. Resolve & Update Policy Snapshot (Module 35 ERD)
  let policySnapshot = await BillingPolicySnapshot.findOne({
    tenant_id: tenantId,
    policy_number: cleanPolicyNumber
  });

  const effDate = new Date(effectiveDate);
  const oldSnapPrem = policySnapshot ? new BigNumber(policySnapshot.total_premium.toString()) : new BigNumber('37650.00');
  const revisedSnapPrem = oldSnapPrem.plus(deltaBN);

  if (policySnapshot) {
    policySnapshot.total_premium = mongoose.Types.Decimal128.fromString(revisedSnapPrem.toFixed(2));
    policySnapshot.snapshot_json = {
      ...(policySnapshot.snapshot_json || {}),
      endorsement_applied: true,
      endorsement_number: endorsementNumber,
      vehicle_id: vehicleId,
      delta_premium: deltaBN.toFixed(2),
      billing_option: billingOption,
      revised_total_premium: revisedSnapPrem.toFixed(2)
    };
    await policySnapshot.save();
  }

  if (polLink) {
    polLink.total_premium = mongoose.Types.Decimal128.fromString(revisedSnapPrem.toFixed(2));
    await polLink.save();
  }

  // 3. Create Underwriting Transaction Snapshot (Module 35 ERD)
  const txSnap = await BillingTransactionSnapshot.create({
    tenant_id: tenantId,
    billing_policy_snapshot_id: policySnapshot ? policySnapshot._id : null,
    source_entity_id: endorsementNumber,
    source_event_position: 2,
    transaction_type: 'ENDORSEMENT',
    effective_date: effDate,
    premium_change: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
    charges: mongoose.Types.Decimal128.fromString('0.00'),
    taxes: mongoose.Types.Decimal128.fromString('0.00'),
    currency_code: 'USD',
    snapshot_json: {
      endorsement_number: endorsementNumber,
      vehicle_id: vehicleId,
      annual_rate: String(annualRate),
      active_days: Number(activeDays),
      delta_premium: deltaBN.toFixed(2),
      billing_option: billingOption
    }
  });

  // 4. Post Double-Entry GL Journal Entry (Guide Scenario 2: GL Step 1)
  // Debit 1100 Premium Receivable: $7,222.19
  // Credit 2200 Unearned Premium Reserve: $7,222.19
  const isLegacy = await shouldUseLegacyAdapter({
    tenantId,
    eventCode: 'policy.endorsement.issued',
    useMigrationAdapter
  });

  let glResult = null;
  if (isLegacy) {
    const journalLines = [
      {
        account_code: '1100',
        debit: deltaBN.toFixed(2),
        credit: '0.00',
        memo: `Dr 1100 AR - Endorsement ${endorsementNumber} (${vehicleId})`
      },
      {
        account_code: '2200',
        debit: '0.00',
        credit: deltaBN.toFixed(2),
        memo: `Cr 2200 UPR - Endorsement ${endorsementNumber} (${vehicleId})`
      }
    ];

    glResult = await legacyDirectPost({
      tenantId,
      userId,
      postingDate: effDate,
      sourceModule: 'POLICY_ENDORSEMENT',
      referenceId: endorsementNumber,
      memo: `Endorsement ${endorsementNumber} - Truck ${vehicleId} Pro-Rata Delta (${billingOption})`,
      lines: journalLines
    });
  } else {
    const eventResult = await publishAndProcessDomainEvent({
      tenantId,
      eventType: 'policy.endorsement.issued',
      eventVersion: '1.0.0',
      sourceModule: 'POLICY_ENDORSEMENT',
      sourceEntityType: 'Policy',
      sourceEntityId: cleanPolicyNumber,
      sourceTransactionId: endorsementNumber,
      correlationId: `CORR-END-${endorsementNumber}`,
      occurredAt: effDate,
      payload: {
        policy_id: cleanPolicyNumber,
        endorsement_number: endorsementNumber,
        vehicle_id: vehicleId,
        delta_premium: deltaBN.toNumber(),
        active_days: Number(activeDays),
        billing_option: billingOption
      },
      userId,
      dispatchImmediately: true
    });
    glResult = eventResult;
  }

  // 5. Update Billing Account current_balance (+ delta)
  const curAccBal = new BigNumber(billingAccount.current_balance ? billingAccount.current_balance.toString() : '0');
  billingAccount.current_balance = mongoose.Types.Decimal128.fromString(curAccBal.plus(deltaBN).toFixed(2));
  await billingAccount.save();

  // 6. Execute Sub-Scenario Billing Logic
  let updatedSchedules = [];
  let standaloneInvoice = null;
  let standaloneSchedule = null;

  if (billingOption === 'SPREAD_INSTALLMENTS') {
    // Sub-Scenario 2: Spread delta across remaining unbilled installments
    const unbilledSchedules = await InstallmentSchedule.find({
      tenant_id: tenantId,
      $or: [{ policy_number: cleanPolicyNumber }, { policy_id: cleanPolicyNumber }],
      status: 'SCHEDULED'
    }).sort({ installment_number: 1 });

    if (unbilledSchedules.length === 0) {
      throw new Error(`No scheduled installments found for policy ${cleanPolicyNumber} to spread delta across.`);
    }

    const count = unbilledSchedules.length;
    const baseDelta = deltaBN.dividedBy(count).dp(2, BigNumber.ROUND_HALF_UP); // 7222.19 / 3 = 2407.40
    let runningDelta = deltaBN;

    for (let i = 0; i < count; i++) {
      const sched = unbilledSchedules[i];
      let deltaForInst;
      if (i === count - 1) {
        deltaForInst = runningDelta; // absorbs penny remainder (e.g. 2407.39)
      } else {
        deltaForInst = baseDelta;
        runningDelta = runningDelta.minus(baseDelta);
      }

      const oldPrem = new BigNumber(sched.premium_amount ? sched.premium_amount.toString() : '0');
      const oldTotal = new BigNumber(sched.total_amount ? sched.total_amount.toString() : '0');
      const newPrem = oldPrem.plus(deltaForInst);
      const newTotal = oldTotal.plus(deltaForInst);

      sched.premium_amount = mongoose.Types.Decimal128.fromString(newPrem.toFixed(2));
      sched.total_amount = mongoose.Types.Decimal128.fromString(newTotal.toFixed(2));
      sched.amount = mongoose.Types.Decimal128.fromString(newTotal.toFixed(2));
      sched.balance_amount = mongoose.Types.Decimal128.fromString(newTotal.toFixed(2));
      sched.billing_transaction_snapshot_id = txSnap._id;
      sched.dimensions = {
        ...(sched.dimensions || {}),
        endorsement_number: endorsementNumber,
        vehicle_id: vehicleId,
        endorsement_delta: deltaForInst.toFixed(2),
        base_premium: oldPrem.toFixed(2)
      };
      await sched.save();
      updatedSchedules.push(sched);
    }
  } else {
    // Sub-Scenario 1: Standalone Single Endorsement Invoice (Option A)
    const existingScheds = await InstallmentSchedule.find({
      tenant_id: tenantId,
      $or: [{ policy_number: cleanPolicyNumber }, { policy_id: cleanPolicyNumber }]
    }).sort({ installment_number: -1 });

    const nextInstNo = (existingScheds[0]?.installment_number || 4) + 1;
    const invCount = await Invoice.countDocuments({ tenant_id: tenantId });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(5, '0')}`;
    const dueDate = new Date('2026-09-05');

    standaloneSchedule = await InstallmentSchedule.create({
      tenant_id: tenantId,
      billing_account_id: billingAccount._id,
      billing_policy_snapshot_id: policySnapshot ? policySnapshot._id : null,
      billing_transaction_snapshot_id: txSnap._id,
      policy_id: cleanPolicyNumber,
      policy_number: cleanPolicyNumber,
      installment_number: nextInstNo,
      installment_no: nextInstNo,
      due_date: dueDate,
      premium_amount: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
      fee_amount: mongoose.Types.Decimal128.fromString('0.00'),
      tax_amount: mongoose.Types.Decimal128.fromString('0.00'),
      total_amount: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
      amount: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
      balance_amount: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
      status: autoIssueStandaloneInvoice ? 'BILLED' : 'SCHEDULED',
      dimensions: {
        endorsement_number: endorsementNumber,
        vehicle_id: vehicleId,
        standalone_endorsement: true
      }
    });

    if (autoIssueStandaloneInvoice) {
      standaloneInvoice = await Invoice.create({
        tenant_id: tenantId,
        billing_account_id: billingAccount._id,
        policy_id: cleanPolicyNumber,
        invoice_number: invoiceNumber,
        invoice_date: effDate,
        due_date: dueDate,
        installment_number: nextInstNo,
        total_amount: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
        amount_paid: mongoose.Types.Decimal128.fromString('0.00'),
        balance_due: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
        status: 'ISSUED',
        journal_id: glResult?.journal?._id || glResult?._id || null,
        memo: `Endorsement ${endorsementNumber} - Truck ${vehicleId} Pro-Rata Delta Premium`,
        carrier_id: billingAccount.carrier_id || null,
        carrier_name: billingAccount.carrier_name || 'Summit Mutual Insurance Company',
        broker_id: billingAccount.broker_id || null,
        broker_name: billingAccount.broker_name || 'Brightline Insurance Brokerage LLC',
        dimensions: {
          carrier_name: billingAccount.carrier_name || 'Summit Mutual Insurance Company',
          broker_name: billingAccount.broker_name || 'Brightline Insurance Brokerage LLC',
          endorsement_number: endorsementNumber,
          vehicle_id: vehicleId,
          standalone_endorsement: true
        }
      });

      await InvoiceLine.create({
        tenant_id: tenantId,
        invoice_id: standaloneInvoice._id,
        installment_id: standaloneSchedule._id,
        billing_transaction_snapshot_id: txSnap._id,
        line_number: 1,
        line_type: 'PREMIUM',
        description: `Endorsement ${endorsementNumber} - Truck ${vehicleId} Pro-Rata Premium (303 Days)`,
        amount: mongoose.Types.Decimal128.fromString(deltaBN.toFixed(2)),
        tax_amount: mongoose.Types.Decimal128.fromString('0.00'),
        currency_code: 'USD',
        ledger_account_code: '2200'
      });

      standaloneSchedule.invoice_id = standaloneInvoice._id;
      await standaloneSchedule.save();
    }
  }

  return {
    success: true,
    policyNumber: cleanPolicyNumber,
    endorsementNumber,
    billingOption,
    deltaPremium: deltaBN.toFixed(2),
    revisedPolicyPremium: revisedSnapPrem.toFixed(2),
    journal: glResult?.journal || glResult,
    transactionSnapshot: txSnap,
    updatedSchedules,
    standaloneSchedule,
    standaloneInvoice
  };
}

/**
 * Reset Endorsement to Base Policy State (Helper for Practice & Re-testing)
 */
async function resetPolicyEndorsement({
  tenantId,
  policyNumber = 'POL-TX-8821'
}) {
  const cleanPolicyNumber = policyNumber.trim().toUpperCase();

  // 1. Delete Endorsement Transaction Snapshots
  const txSnaps = await BillingTransactionSnapshot.find({
    tenant_id: tenantId,
    transaction_type: 'ENDORSEMENT'
  });
  const txIds = txSnaps.map(t => t._id);
  await BillingTransactionSnapshot.deleteMany({ _id: { $in: txIds } });

  // 2. Remove any standalone endorsement invoices & lines
  const standInvs = await Invoice.find({
    tenant_id: tenantId,
    policy_id: cleanPolicyNumber,
    'dimensions.standalone_endorsement': true
  });
  for (const inv of standInvs) {
    await InvoiceLine.deleteMany({ invoice_id: inv._id });
    await Invoice.deleteOne({ _id: inv._id });
  }

  // 3. Delete standalone schedules
  await InstallmentSchedule.deleteMany({
    tenant_id: tenantId,
    policy_number: cleanPolicyNumber,
    $or: [
      { 'dimensions.standalone_endorsement': true },
      { installment_number: { $gt: 4 } }
    ]
  });

  // 4. Reset unbilled installments 2, 3, 4 back to $9,412.50
  const schedules = await InstallmentSchedule.find({
    tenant_id: tenantId,
    policy_number: cleanPolicyNumber,
    installment_number: { $in: [2, 3, 4] }
  });
  for (const sched of schedules) {
    sched.premium_amount = mongoose.Types.Decimal128.fromString('9412.50');
    sched.total_amount = mongoose.Types.Decimal128.fromString('9412.50');
    sched.amount = mongoose.Types.Decimal128.fromString('9412.50');
    sched.balance_amount = mongoose.Types.Decimal128.fromString('9412.50');
    sched.status = 'SCHEDULED';
    sched.invoice_id = null;
    if (sched.dimensions) {
      delete sched.dimensions.endorsement_number;
      delete sched.dimensions.vehicle_id;
      delete sched.dimensions.endorsement_delta;
      delete sched.dimensions.base_premium;
    }
    await sched.save();
  }

  // 5. Reset Policy Snapshot & Account Policy back to $37,650.00
  await BillingPolicySnapshot.updateOne(
    { tenant_id: tenantId, policy_number: cleanPolicyNumber },
    {
      total_premium: mongoose.Types.Decimal128.fromString('37650.00'),
      $unset: { 'snapshot_json.endorsement_applied': 1 }
    }
  );
  await BillingAccountPolicy.updateOne(
    { tenant_id: tenantId, policy_number: cleanPolicyNumber },
    { total_premium: mongoose.Types.Decimal128.fromString('37650.00') }
  );

  // 6. Delete Endorsement Journal Entries & Rollback Ledger Account balances
  const endJournals = await Journal.find({
    tenant_id: tenantId,
    $or: [
      { source_module: 'POLICY_ENDORSEMENT' },
      { reference_id: { $regex: '^END-' } }
    ]
  });

  for (const j of endJournals) {
    const jLines = await JournalEntry.find({ journal_id: j._id });
    for (const line of jLines) {
      const acc = await LedgerAccount.findOne({ _id: line.ledger_account_id || line.account_id });
      if (acc) {
        const curDeb = new BigNumber(acc.current_balance_debit ? acc.current_balance_debit.toString() : '0');
        const curCred = new BigNumber(acc.current_balance_credit ? acc.current_balance_credit.toString() : '0');
        const lineDeb = new BigNumber(line.debit ? line.debit.toString() : '0');
        const lineCred = new BigNumber(line.credit ? line.credit.toString() : '0');
        acc.current_balance_debit = mongoose.Types.Decimal128.fromString(curDeb.minus(lineDeb).toFixed(2));
        acc.current_balance_credit = mongoose.Types.Decimal128.fromString(curCred.minus(lineCred).toFixed(2));
        await acc.save();
      }
    }
    await JournalEntry.deleteMany({ journal_id: j._id });
    await Journal.deleteOne({ _id: j._id });
  }

  // 7. Reset Billing Account current_balance
  const bAcc = await BillingAccount.findOne({ tenant_id: tenantId });
  if (bAcc) {
    bAcc.current_balance = mongoose.Types.Decimal128.fromString('0.00');
    await bAcc.save();
  }

  return { success: true, message: `Policy ${cleanPolicyNumber} reset to base 4-pay schedule.` };
}

module.exports = {
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
};
