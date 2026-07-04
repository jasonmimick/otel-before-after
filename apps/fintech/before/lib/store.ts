export type Account = {
  id: string;
  customerId: string;
  type: "checking" | "savings" | "credit";
  balance: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  createdAt: string;
};

export type Transaction = {
  id: string;
  accountId: string;
  type: "debit" | "credit" | "refund";
  amount: number;
  currency: string;
  description: string;
  status: "pending" | "settled" | "declined" | "failed";
  fraudScore?: number;
  createdAt: string;
};

export type Transfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  method: "ach" | "wire" | "internal";
  status: "pending" | "completed" | "failed";
  createdAt: string;
};

export type LoanApplication = {
  id: string;
  applicantId: string;
  amount: number;
  term: number;
  purpose: string;
  status: "submitted" | "approved" | "denied" | "disbursed";
  creditScore?: number;
  interestRate?: number;
  createdAt: string;
};

const accounts: Account[] = [
  { id: "acct_001", customerId: "cust_1", type: "checking", balance: 4820.55, currency: "USD", status: "active", createdAt: "2025-01-15T00:00:00Z" },
  { id: "acct_002", customerId: "cust_1", type: "savings", balance: 18200.00, currency: "USD", status: "active", createdAt: "2025-01-15T00:00:00Z" },
  { id: "acct_003", customerId: "cust_2", type: "checking", balance: 1240.80, currency: "USD", status: "active", createdAt: "2025-03-01T00:00:00Z" },
  { id: "acct_004", customerId: "cust_3", type: "credit", balance: -540.00, currency: "USD", status: "frozen", createdAt: "2024-11-10T00:00:00Z" },
];

const transactions: Transaction[] = [
  { id: "txn_001", accountId: "acct_001", type: "debit", amount: 120.00, currency: "USD", description: "Online purchase", status: "settled", fraudScore: 0.03, createdAt: "2026-06-28T10:00:00Z" },
  { id: "txn_002", accountId: "acct_001", type: "credit", amount: 2500.00, currency: "USD", description: "Payroll deposit", status: "settled", createdAt: "2026-06-27T08:00:00Z" },
  { id: "txn_003", accountId: "acct_003", type: "debit", amount: 9800.00, currency: "USD", description: "Wire transfer attempt", status: "declined", fraudScore: 0.87, createdAt: "2026-06-26T15:30:00Z" },
];

const transfers: Transfer[] = [
  { id: "trf_001", fromAccountId: "acct_001", toAccountId: "acct_002", amount: 500.00, currency: "USD", method: "internal", status: "completed", createdAt: "2026-06-25T12:00:00Z" },
];

const loans: LoanApplication[] = [
  { id: "loan_001", applicantId: "cust_1", amount: 15000, term: 36, purpose: "home improvement", status: "approved", creditScore: 740, interestRate: 7.2, createdAt: "2026-06-20T00:00:00Z" },
  { id: "loan_002", applicantId: "cust_3", amount: 5000, term: 24, purpose: "debt consolidation", status: "denied", creditScore: 580, createdAt: "2026-06-22T00:00:00Z" },
];

export function getAccounts(customerId?: string): Account[] {
  if (customerId) return accounts.filter(a => a.customerId === customerId);
  return accounts;
}
export function getAccount(id: string): Account | undefined {
  return accounts.find(a => a.id === id);
}
export function createAccount(customerId: string, type: Account["type"]): Account {
  const acct: Account = { id: `acct_${Date.now()}`, customerId, type, balance: 0, currency: "USD", status: "active", createdAt: new Date().toISOString() };
  accounts.push(acct);
  return acct;
}

export function getTransactions(accountId?: string): Transaction[] {
  if (accountId) return transactions.filter(t => t.accountId === accountId);
  return transactions;
}
export function createTransaction(accountId: string, type: Transaction["type"], amount: number, description: string, fraudScore: number): Transaction {
  const status = fraudScore > 0.75 ? "declined" : "pending";
  const txn: Transaction = { id: `txn_${Date.now()}`, accountId, type, amount, currency: "USD", description, status, fraudScore, createdAt: new Date().toISOString() };
  transactions.push(txn);
  if (status !== "declined") {
    const acct = accounts.find(a => a.id === accountId);
    if (acct) acct.balance += type === "credit" ? amount : -amount;
  }
  return txn;
}
export function settleTransaction(id: string): Transaction | undefined {
  const txn = transactions.find(t => t.id === id);
  if (txn && txn.status === "pending") { txn.status = "settled"; }
  return txn;
}

export function getTransfers(accountId?: string): Transfer[] {
  if (accountId) return transfers.filter(t => t.fromAccountId === accountId || t.toAccountId === accountId);
  return transfers;
}
export function createTransfer(fromAccountId: string, toAccountId: string, amount: number, method: Transfer["method"]): Transfer {
  const trf: Transfer = { id: `trf_${Date.now()}`, fromAccountId, toAccountId, amount, currency: "USD", method, status: "pending", createdAt: new Date().toISOString() };
  transfers.push(trf);
  return trf;
}
export function completeTransfer(id: string): Transfer | undefined {
  const trf = transfers.find(t => t.id === id);
  if (trf) trf.status = "completed";
  return trf;
}

export function getLoans(applicantId?: string): LoanApplication[] {
  if (applicantId) return loans.filter(l => l.applicantId === applicantId);
  return loans;
}
export function applyForLoan(applicantId: string, amount: number, term: number, purpose: string, creditScore: number): LoanApplication {
  const approved = creditScore >= 650 && amount <= 50000;
  const loan: LoanApplication = {
    id: `loan_${Date.now()}`, applicantId, amount, term, purpose,
    status: approved ? "approved" : "denied",
    creditScore,
    interestRate: approved ? Math.max(5.5, 15 - creditScore / 100) : undefined,
    createdAt: new Date().toISOString(),
  };
  loans.push(loan);
  return loan;
}
