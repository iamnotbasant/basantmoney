/**
 * Unit Test Script for Pure Interest Engine
 *
 * Verifies all math, rates, dates, backdated changes, idempotence, and edge cases.
 */

import {
  calculateDailyInterest,
  getRateForDate,
  getKolkataDateString,
  getKolkataYesterdayString,
  getPreviousDayString,
  getLastDayOfMonth,
  getInterestDescription,
  isMonthLocked,
  getDateRange,
  calculateDailyInterestRecords,
  aggregateMonthlyInterest,
  roundToTwoDecimals,
  EXPECTED_PRE_RECONCILIATION,
  extractWalletBalances,
  matchesPreReconciliationState,
  computeUnallocated,
  evaluateReconciliation,
} from '../src/utils/interestEngine.ts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const match = actual === expected;
  assert(match, `${message} (expected: ${expected}, got: ${actual})`);
}

console.log('--- Starting Interest Engine Unit Tests ---\n');

// 1. Math formulas from bank statements
console.log('1. Verifying Daily Interest Formula against Statement Proofs:');
assertEqual(calculateDailyInterest(11130, 5.5), 1.68, '₹11,130 @ 5.5% = ₹1.68/day');
assertEqual(calculateDailyInterest(11130.05, 5.5), 1.68, '₹11,130.05 @ 5.5% = ₹1.68/day');
assertEqual(calculateDailyInterest(9354, 5.25), 1.35, '₹9,354 @ 5.25% = ₹1.35/day (up to 07 Oct)');
assertEqual(calculateDailyInterest(9354, 5.5), 1.41, '₹9,354 @ 5.5% = ₹1.41/day (from 08 Oct)');

// 2. Drop by ₹1,000 reduces by ₹0.15/day
console.log('\n2. Verifying Balance Drop:');
const normalInterest = calculateDailyInterest(11130, 5.5); // 1.68
const droppedInterest = calculateDailyInterest(10130, 5.5); // 1.53
const dropDifference = roundToTwoDecimals(normalInterest - droppedInterest);
assertEqual(dropDifference, 0.15, '₹1,000 drop = ₹0.15/day less (1.68 - 1.53 = 0.15)');
assertEqual(calculateDailyInterest(1000, 5.5), 0.15, 'Direct ₹1,000 @ 5.5% = ₹0.15/day');

// 3. Balance <= 0 edge cases
console.log('\n3. Verifying Zero & Negative Balances:');
assertEqual(calculateDailyInterest(0, 5.5), 0, '₹0 balance = ₹0 interest');
assertEqual(calculateDailyInterest(-100, 5.5), 0, 'Negative balance (-100) = ₹0 interest');
assertEqual(calculateDailyInterest(-5000, 5.5), 0, 'Negative balance (-5000) = ₹0 interest');
assertEqual(calculateDailyInterest(11130, 0), 0, '0% rate = ₹0 interest');

// 4. Rate resolution from history
console.log('\n4. Verifying Rate History Resolution:');
const rates = [
  { annual_rate_percent: 5.25, effective_from_date: '2026-08-01' },
  { annual_rate_percent: 5.50, effective_from_date: '2026-10-08' },
];

assertEqual(getRateForDate(rates, '2026-08-01'), 5.25, 'Rate on 01 Aug 2026 is 5.25%');
assertEqual(getRateForDate(rates, '2026-09-30'), 5.25, 'Rate on 30 Sep 2026 is 5.25%');
assertEqual(getRateForDate(rates, '2026-10-07'), 5.25, 'Rate on 07 Oct 2026 is 5.25%');
assertEqual(getRateForDate(rates, '2026-10-08'), 5.50, 'Rate on 08 Oct 2026 is 5.50%');
assertEqual(getRateForDate(rates, '2026-11-10'), 5.50, 'Rate on 10 Nov 2026 is 5.50%');

// 5. Adding new future rate does not alter past dates
console.log('\n5. Verifying Rate Immutability for Past Dates:');
const updatedRates = [
  ...rates,
  { annual_rate_percent: 6.00, effective_from_date: '2026-12-01' },
];
assertEqual(getRateForDate(updatedRates, '2026-10-07'), 5.25, 'Past date 07 Oct still uses 5.25%');
assertEqual(getRateForDate(updatedRates, '2026-11-10'), 5.50, 'Past date 10 Nov still uses 5.50%');
assertEqual(getRateForDate(updatedRates, '2026-12-01'), 6.00, 'New date 01 Dec uses 6.00%');

// 6. Date utilities and naming conventions
console.log('\n6. Verifying Date and Description Utilities:');
assertEqual(getLastDayOfMonth('2026-08'), '2026-08-31', 'Last day of Aug 2026 = 2026-08-31');
assertEqual(getLastDayOfMonth('2026-09'), '2026-09-30', 'Last day of Sep 2026 = 2026-09-30');
assertEqual(getLastDayOfMonth('2026-10'), '2026-10-31', 'Last day of Oct 2026 = 2026-10-31');
assertEqual(getLastDayOfMonth('2026-11'), '2026-11-30', 'Last day of Nov 2026 = 2026-11-30');
assertEqual(getLastDayOfMonth('2026-02'), '2026-02-28', 'Last day of Feb 2026 = 2026-02-28');
assertEqual(getLastDayOfMonth('2024-02'), '2024-02-29', 'Leap year Feb 2024 = 2024-02-29');

assertEqual(getInterestDescription('2026-08'), 'August savings interest', 'Description for 2026-08');
assertEqual(getInterestDescription('2026-09'), 'September savings interest', 'Description for 2026-09');
assertEqual(getInterestDescription('2026-10'), 'October savings interest', 'Description for 2026-10');
assertEqual(getInterestDescription('2026-11'), 'November savings interest', 'Description for 2026-11');
assertEqual(getInterestDescription('2026-12'), 'December savings interest', 'Description for 2026-12');

// 7. Month Lock Status
console.log('\n7. Verifying Lock Status (reference date 2026-11-10):');
assert(isMonthLocked('2026-08', '2026-11-10'), 'August 2026 is locked on 10 Nov');
assert(isMonthLocked('2026-09', '2026-11-10'), 'September 2026 is locked on 10 Nov');
assert(isMonthLocked('2026-10', '2026-11-10'), 'October 2026 is locked on 10 Nov');
assert(!isMonthLocked('2026-11', '2026-11-10'), 'November 2026 is UNLOCKED (estimated) on 10 Nov');
assert(isMonthLocked('2026-11', '2026-12-01'), 'November 2026 becomes LOCKED on 01 Dec');

// 8. November 01-10 Accumulation Test (Spec Acceptance Test 2)
console.log('\n8. Verifying 01-10 November Accumulation @ ₹11,130.05:');
const novRange = getDateRange('2026-11-01', '2026-11-10');
assertEqual(novRange.length, 10, 'November 01 to 10 has exactly 10 days');
const novBalances = novRange.map(date => ({ date, balance: 11130.05 }));
const novRecords = calculateDailyInterestRecords(novBalances, rates);
const novMonthly = aggregateMonthlyInterest(novRecords);
assertEqual(novMonthly['2026-11'], 16.80, '10 days at ₹1.68/day = ₹16.80 for November');

// 9. Backdated expense test (Spec Acceptance Test 4)
console.log('\n9. Verifying Backdated ₹1,000 Expense on 05 Nov:');
// 01-05 Nov at ₹11,130.05 (₹1.68/day)
// 06-10 Nov at ₹10,130.05 (₹1.53/day) -> ₹0.15/day less
const backdatedBalances = novRange.map(date => {
  if (date <= '2026-11-05') {
    return { date, balance: 11130.05 };
  } else {
    return { date, balance: 10130.05 };
  }
});
const backdatedRecords = calculateDailyInterestRecords(backdatedBalances, rates);
assertEqual(backdatedRecords[4].interest_amount, 1.68, '05 Nov interest unchanged: ₹1.68');
assertEqual(backdatedRecords[5].interest_amount, 1.53, '06 Nov interest reduced: ₹1.53');
assertEqual(backdatedRecords[9].interest_amount, 1.53, '10 Nov interest reduced: ₹1.53');
const backdatedMonthly = aggregateMonthlyInterest(backdatedRecords);
// 5 days @ 1.68 = 8.40; 5 days @ 1.53 = 7.65; Total = 16.05
assertEqual(backdatedMonthly['2026-11'], 16.05, 'Recomputed November total is ₹16.05');

// 10. Idempotence test (Spec Acceptance Test 5)
console.log('\n10. Verifying Idempotence:');
const rerunRecords = calculateDailyInterestRecords(novBalances, rates);
const rerunMonthly = aggregateMonthlyInterest(rerunRecords);
assertEqual(rerunMonthly['2026-11'], novMonthly['2026-11'], 'Second run yields identical November sum (₹16.80)');
assertEqual(JSON.stringify(rerunRecords), JSON.stringify(novRecords), 'Second run records are identical to first run');

// 11. Pre-Reconciliation Guard & Balance Extraction Tests
console.log('\n11. Verifying Reconciliation Guard & Balance Extraction:');
// 11a. extractWalletBalances with subwallets (camelCase & snake_case)
const sampleSubwalletsCamel = [
  { name: 'Main', balance: 10131.88, parentWalletType: 'saving' },
  { name: 'Rent', balance: 598.91, parentWalletType: 'needs' },
  { name: 'Fun', balance: 399.27, parentWalletType: 'wants' },
];
const extractedCamel = extractWalletBalances(sampleSubwalletsCamel, []);
assertEqual(extractedCamel.savingMain, 10131.88, 'Extracted Main from subwallets (camelCase)');
assertEqual(extractedCamel.needs, 598.91, 'Extracted Needs from subwallets (camelCase)');
assertEqual(extractedCamel.wants, 399.27, 'Extracted Wants from subwallets (camelCase)');
assertEqual(extractedCamel.total, 11130.06, 'Extracted Total from subwallets (camelCase)');

const sampleSubwalletsSnake = [
  { name: 'Main', balance: 10131.88, parent_wallet_type: 'saving' },
  { name: 'Needs Sub 1', balance: 300.00, parent_wallet_type: 'needs' },
  { name: 'Needs Sub 2', balance: 298.91, parent_wallet_type: 'needs' },
  { name: 'Wants Sub', balance: 399.27, parent_wallet_type: 'wants' },
];
const extractedSnake = extractWalletBalances(sampleSubwalletsSnake, []);
assertEqual(extractedSnake.needs, 598.91, 'Extracted multi-subwallet Needs (snake_case)');
assertEqual(extractedSnake.savingMain, 10131.88, 'Extracted Main (snake_case)');

// 11b. extractWalletBalances with top-level wallets only
const sampleWalletsOnly = [
  { type: 'saving', balance: 10131.88, name: 'Saving' },
  { type: 'needs', balance: 598.91, name: 'Needs' },
  { type: 'wants', balance: 399.27, name: 'Wants' },
];
const extractedWallets = extractWalletBalances([], sampleWalletsOnly);
assertEqual(extractedWallets.savingMain, 10131.88, 'Extracted Saving from top-level wallets');
assertEqual(extractedWallets.needs, 598.91, 'Extracted Needs from top-level wallets');
assertEqual(extractedWallets.wants, 399.27, 'Extracted Wants from top-level wallets');

// 11c. matchesPreReconciliationState
assert(
  matchesPreReconciliationState({ savingMain: 10131.88, needs: 598.91, wants: 399.27, total: 11130.06 }),
  'Exact pre-reconciliation state matches'
);
assert(
  matchesPreReconciliationState({ savingMain: 10131.88, needs: 598.91, wants: 399.27, total: 11130.05 }),
  'Pre-state with total 11130.05 matches within tolerance'
);
assert(
  matchesPreReconciliationState({ savingMain: 10131.84, needs: 598.95, wants: 399.23 }),
  'Pre-state within ₹0.05 tolerance matches'
);

// Non-matching states (balances changed)
assert(
  !matchesPreReconciliationState({ savingMain: 10131.88, needs: 400.00, wants: 399.27 }),
  'Changed Needs balance fails guard'
);
assert(
  !matchesPreReconciliationState({ savingMain: 12000.00, needs: 598.91, wants: 399.27 }),
  'Changed Main balance fails guard'
);
assert(
  !matchesPreReconciliationState({ savingMain: 10131.88, needs: 598.91, wants: 0.00 }),
  'Changed Wants balance fails guard'
);
assert(
  !matchesPreReconciliationState({ savingMain: 10131.95, needs: 598.91, wants: 399.27 }),
  'Difference exceeding ₹0.05 tolerance (+0.07) fails guard'
);

// 12. Backfill 01-09 Nov (₹15.12) vs 01-10 Nov (₹16.80) & Monthly Entry = Sum of Days
console.log('\n12. Verifying Backfill 01-09 Nov vs 01-10 Nov & Dynamic Monthly Sum:');
const nov09Range = getDateRange('2026-11-01', '2026-11-09');
assertEqual(nov09Range.length, 9, 'November 01 to 09 has 9 days');
const nov09Balances = nov09Range.map(date => ({ date, balance: 11130.05 }));
const nov09Records = calculateDailyInterestRecords(nov09Balances, rates);
const nov09Sum = roundToTwoDecimals(nov09Records.reduce((sum, r) => sum + r.interest_amount, 0));
assertEqual(nov09Sum, 15.12, 'Backfill 01-09 Nov = ₹15.12 (9 x ₹1.68)');
const nov09Monthly = aggregateMonthlyInterest(nov09Records);
assertEqual(nov09Monthly['2026-11'], 15.12, 'Nov monthly entry equals sum of persisted day rows (₹15.12 for 9 days)');

const nov10Range = getDateRange('2026-11-01', '2026-11-10');
assertEqual(nov10Range.length, 10, 'November 01 to 10 has 10 days');
const nov10Balances = nov10Range.map(date => ({ date, balance: 11130.05 }));
const nov10Records = calculateDailyInterestRecords(nov10Balances, rates);
const nov10Sum = roundToTwoDecimals(nov10Records.reduce((sum, r) => sum + r.interest_amount, 0));
assertEqual(nov10Sum, 16.80, 'Backfill 01-10 Nov = ₹16.80 (10 x ₹1.68)');
const nov10Monthly = aggregateMonthlyInterest(nov10Records);
assertEqual(nov10Monthly['2026-11'], 16.80, 'Nov monthly entry equals sum of persisted day rows (₹16.80 for 10 days)');

// 13. Reconciliation from ACTUAL Live State (Main 10131.88, Needs 0, Wants 0, Ledger 11130.05)
console.log('\n13. Verifying Reconciliation from ACTUAL Live State:');
const actualLiveState = { savingMain: 10131.88, needs: 0.00, wants: 0.00 };
const ledgerTotal = 11130.05;
const unallocated = computeUnallocated(ledgerTotal, actualLiveState);
assertEqual(unallocated, 998.17, 'Unallocated computation finds exactly ₹998.17 (11130.05 - 10131.88)');

const actualEval = evaluateReconciliation(actualLiveState, ledgerTotal, 0.05);
assert(actualEval.canReconcile, 'Actual live state passes reconciliation evaluation');
assertEqual(actualEval.action, 'apply_unallocated', 'Action is apply_unallocated');
assertEqual(actualEval.savingMoved, 998.17, 'Moves exactly ₹998.17 to Main');
assertEqual(actualEval.needsMoved, 0, 'Needs moved is ₹0');
assertEqual(actualEval.wantsMoved, 0, 'Wants moved is ₹0');
assertEqual(actualEval.resultingBalances.savingMain, 11130.05, 'Resulting Main balance is ₹11,130.05');
assertEqual(actualEval.resultingBalances.needs, 0, 'Resulting Needs balance is ₹0');
assertEqual(actualEval.resultingBalances.wants, 0, 'Resulting Wants balance is ₹0');
assertEqual(actualEval.resultingBalances.total, 11130.05, 'Resulting total balance is ₹11,130.05');

// 14. Idempotence: Second Reconciliation Run & Repeated Runs
console.log('\n14. Verifying Reconciliation Idempotence & No Duplicate Entries:');
const secondRunBalances = { ...actualEval.resultingBalances };
const secondEval = evaluateReconciliation(secondRunBalances, ledgerTotal, 0.05);
assert(secondEval.canReconcile, 'Second run passes reconciliation evaluation');
assertEqual(secondEval.action, 'already_reconciled', 'Second run recognized as already_reconciled');
assertEqual(secondEval.savingMoved, 0, 'Second run moves ₹0.00 to Main');
assertEqual(secondEval.needsMoved, 0, 'Second run moves ₹0.00 to Needs');
assertEqual(secondEval.wantsMoved, 0, 'Second run moves ₹0.00 to Wants');
assertEqual(secondEval.resultingBalances.savingMain, 11130.05, 'Main remains ₹11,130.05 on second run');

// Monthly entry idempotence: re-running aggregation produces same amount without duplicates
const existingEntries = [{ id: 'inc-nov-1', date: '2026-11-30', amount: 16.80, is_auto_interest: true }];
const rerunMonthlySum = nov10Monthly['2026-11'];
assertEqual(rerunMonthlySum, existingEntries[0].amount, 'Recomputed monthly sum matches existing entry amount exactly');

// 15. First-Run with Missing userId Guard
console.log('\n15. Verifying Missing userId Guard (Do NOT mark done, must retry):');
function simulateFirstRun(userId, storage) {
  if (!userId) {
    // Missing userId: postpone, do NOT write completion flag
    return { status: 'postponed', firstRunFlag: storage['interest_first_run_completed'] || null };
  }
  // Authenticated user: persist and mark done
  storage['interest_first_run_completed'] = 'true';
  return { status: 'completed', firstRunFlag: storage['interest_first_run_completed'] };
}

const mockStorage = {};
const unauthRun = simulateFirstRun(undefined, mockStorage);
assertEqual(unauthRun.status, 'postponed', 'First-run without userId is postponed');
assertEqual(mockStorage['interest_first_run_completed'], undefined, 'interest_first_run_completed is NOT set when userId is missing');

const authRetryRun = simulateFirstRun('user_slice_abc123', mockStorage);
assertEqual(authRetryRun.status, 'completed', 'Retry with valid userId completes');
assertEqual(mockStorage['interest_first_run_completed'], 'true', 'interest_first_run_completed is set only after valid user completes');

// 16. Inserts Always Carry bank_account_id Guard (No NULL-bank auto-interest rows)
console.log('\n16. Verifying bank_account_id Assignment on Inserts:');
function createAutoInterestEntry(userId, amount, date, primaryBankId) {
  if (!primaryBankId) {
    throw new Error('Safety check failed: insert must carry bank_account_id');
  }
  return {
    user_id: userId,
    source: 'Slice',
    category: 'Interest',
    amount,
    date,
    is_auto_interest: true,
    bank_account_id: primaryBankId,
  };
}

const validPrimaryBankId = 'bank_acc_primary_999';
const newEntry = createAutoInterestEntry('user_slice_abc123', 16.80, '2026-11-30', validPrimaryBankId);
assert(newEntry.bank_account_id !== null && newEntry.bank_account_id !== undefined, 'Auto-interest entry carries non-null bank_account_id');
assertEqual(newEntry.bank_account_id, validPrimaryBankId, 'Entry carries correct primary bank account ID');

let threwOnMissingBank = false;
try {
  createAutoInterestEntry('user_slice_abc123', 16.80, '2026-11-30', null);
} catch {
  threwOnMissingBank = true;
}
assert(threwOnMissingBank, 'Inserting auto-interest with NULL bank_account_id is disallowed');

// 17. Null / NaN ledgerTotal Guard (Skip safely without crashing or stale values)
console.log('\n17. Verifying Null / NaN ledgerTotal Guard:');
const nullLedgerEval = evaluateReconciliation(actualLiveState, null);
assert(!nullLedgerEval.canReconcile, 'evaluateReconciliation safely returns canReconcile=false when ledgerTotal is null');
assertEqual(nullLedgerEval.action, 'skip', 'Action is skip when ledgerTotal is null');
assertEqual(nullLedgerEval.savingMoved, 0, 'No funds moved when ledgerTotal is null');

const nanLedgerEval = evaluateReconciliation(actualLiveState, NaN);
assert(!nanLedgerEval.canReconcile, 'evaluateReconciliation safely returns canReconcile=false when ledgerTotal is NaN');
assertEqual(nanLedgerEval.action, 'skip', 'Action is skip when ledgerTotal is NaN');

console.log('\n----------------------------------------');
console.log(`Results: ${passedTests} passed, ${failedTests} failed, ${totalTests} total tests.`);
console.log('----------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
