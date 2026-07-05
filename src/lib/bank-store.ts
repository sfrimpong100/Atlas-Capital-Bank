import { useEffect, useState, useCallback } from "react";

export type TxType = "credit" | "debit";
export type TxStatus = "completed" | "pending" | "failed";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  category: string;
  amount: number;
  type: TxType;
  status: TxStatus;
  reference: string;
  accountId: string;
  counterparty?: string;
}

export interface Account {
  id: string;
  name: string;
  type: "Checking" | "Savings" | "Investment";
  number: string;
  balance: number;
  currency: "USD";
  color: "navy" | "emerald" | "indigo";
}

export interface VirtualCard {
  id: string;
  accountId: string;
  last4: string;
  number: string; // formatted with spaces
  holderName: string;
  expiry: string; // MM/YY
  cvc: string;
  type: "Virtual" | "Physical";
  tier: "Metal" | "Gold" | "Platinum" | "Standard";
  frozen: boolean;
  monthlySpend: number;
  monthlyLimit: number;
}

export interface AdminEvent {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target?: string;
  severity: "info" | "warning" | "critical";
}

export interface BankState {
  user: { name: string; email: string; memberSince: string; tier: string };
  accounts: Account[];
  transactions: Transaction[];
  cards: VirtualCard[];
  adminEvents: AdminEvent[];
}

const STORAGE_KEY = "demo-banking-state-v2";

function genRef(seed: number) {
  // Deterministic ref based on index
  const base = (seed * 9301 + 49297) % 233280;
  return "REF-" + base.toString(36).toUpperCase().padStart(6, "0");
}

function stableId(prefix: string, i: number) {
  return `${prefix}_${i.toString(36).padStart(6, "0")}`;
}

function seed(): BankState {
  const checkingId = "acc_checking";
  const savingsId = "acc_savings";
  const investId = "acc_invest";

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const txsRaw: Omit<Transaction, "id" | "reference">[] = [
    { date: new Date(now - 0.2 * day).toISOString(), description: "Salary deposit — Northwind Labs", category: "Income", amount: 6420.0, type: "credit", status: "completed", accountId: checkingId, counterparty: "Northwind Labs Payroll" },
    { date: new Date(now - 1 * day).toISOString(), description: "Whole Foods Market", merchant: "Whole Foods", category: "Groceries", amount: 84.32, type: "debit", status: "completed", accountId: checkingId },
    { date: new Date(now - 1.5 * day).toISOString(), description: "Lyft ride — Downtown", merchant: "Lyft", category: "Transport", amount: 18.45, type: "debit", status: "completed", accountId: checkingId },
    { date: new Date(now - 2 * day).toISOString(), description: "Transfer to Savings", category: "Transfer", amount: 500.0, type: "debit", status: "completed", accountId: checkingId, counterparty: "Savings ••8847" },
    { date: new Date(now - 2 * day).toISOString(), description: "Transfer from Checking", category: "Transfer", amount: 500.0, type: "credit", status: "completed", accountId: savingsId, counterparty: "Checking ••2104" },
    { date: new Date(now - 3 * day).toISOString(), description: "Spotify Premium", merchant: "Spotify", category: "Subscriptions", amount: 11.99, type: "debit", status: "completed", accountId: checkingId },
    { date: new Date(now - 4 * day).toISOString(), description: "Apple Store — AirPods", merchant: "Apple", category: "Shopping", amount: 249.0, type: "debit", status: "completed", accountId: checkingId },
    { date: new Date(now - 5 * day).toISOString(), description: "Refund — Amazon Order", merchant: "Amazon", category: "Refund", amount: 64.2, type: "credit", status: "completed", accountId: checkingId },
    { date: new Date(now - 6 * day).toISOString(), description: "Electric Bill — ConEdison", category: "Utilities", amount: 142.18, type: "debit", status: "completed", accountId: checkingId },
    { date: new Date(now - 7 * day).toISOString(), description: "Dividend — VTI", category: "Income", amount: 38.5, type: "credit", status: "completed", accountId: investId },
    { date: new Date(now - 8 * day).toISOString(), description: "Blue Bottle Coffee", merchant: "Blue Bottle", category: "Dining", amount: 6.75, type: "debit", status: "completed", accountId: checkingId },
    { date: new Date(now - 10 * day).toISOString(), description: "Rent — 412 Hudson St", category: "Housing", amount: 2150.0, type: "debit", status: "completed", accountId: checkingId, counterparty: "Hudson Properties LLC" },
    { date: new Date(now - 12 * day).toISOString(), description: "Interest payment", category: "Income", amount: 12.34, type: "credit", status: "completed", accountId: savingsId },
    { date: new Date(now - 14 * day).toISOString(), description: "Uber Eats — Sushi Yama", merchant: "Uber Eats", category: "Dining", amount: 42.18, type: "debit", status: "completed", accountId: checkingId },
    { date: new Date(now - 16 * day).toISOString(), description: "Stripe payout — Side project", category: "Income", amount: 1240.0, type: "credit", status: "completed", accountId: checkingId, counterparty: "Stripe Payments" },
    { date: new Date(now - 18 * day).toISOString(), description: "Delta Airlines — SFO → JFK", merchant: "Delta", category: "Travel", amount: 412.5, type: "debit", status: "completed", accountId: checkingId },
  ];

  const transactions: Transaction[] = txsRaw.map((t, i) => ({
    ...t,
    id: stableId("tx", i),
    reference: genRef(i + 1),
  }));

  const cards: VirtualCard[] = [
    {
      id: "card_metal_01",
      accountId: checkingId,
      last4: "8361",
      number: "4021 8466 8150 8361",
      holderName: "ALEX MORGAN",
      expiry: "09/29",
      cvc: "•••",
      type: "Physical",
      tier: "Metal",
      frozen: false,
      monthlySpend: 2840.55,
      monthlyLimit: 10000,
    },
    {
      id: "card_gold_01",
      accountId: checkingId,
      last4: "4127",
      number: "4021 5588 2941 4127",
      holderName: "ALEX MORGAN",
      expiry: "03/28",
      cvc: "•••",
      type: "Virtual",
      tier: "Gold",
      frozen: false,
      monthlySpend: 612.4,
      monthlyLimit: 3000,
    },
    {
      id: "card_plat_01",
      accountId: savingsId,
      last4: "9904",
      number: "4021 7733 1102 9904",
      holderName: "ALEX MORGAN",
      expiry: "11/27",
      cvc: "•••",
      type: "Virtual",
      tier: "Platinum",
      frozen: true,
      monthlySpend: 0,
      monthlyLimit: 5000,
    },
  ];

  const adminEvents: AdminEvent[] = [
    { id: "ev_01", ts: new Date(now - 0.1 * day).toISOString(), actor: "system", action: "KYC verification passed", target: "alex.morgan@demo.bank", severity: "info" },
    { id: "ev_02", ts: new Date(now - 0.5 * day).toISOString(), actor: "alex.morgan", action: "New device sign-in", target: "MacBook Pro · Safari", severity: "info" },
    { id: "ev_03", ts: new Date(now - 1.2 * day).toISOString(), actor: "risk-engine", action: "Velocity check triggered", target: "card_gold_01", severity: "warning" },
    { id: "ev_04", ts: new Date(now - 2.4 * day).toISOString(), actor: "ops-admin", action: "Card frozen by request", target: "card_plat_01", severity: "warning" },
    { id: "ev_05", ts: new Date(now - 3.1 * day).toISOString(), actor: "compliance", action: "AML screening clean", target: "alex.morgan@demo.bank", severity: "info" },
    { id: "ev_06", ts: new Date(now - 4.0 * day).toISOString(), actor: "system", action: "Failed login attempt (rate-limited)", target: "203.0.113.42", severity: "critical" },
  ];

  return {
    user: { name: "Alex Morgan", email: "alex.morgan@demo.bank", memberSince: "March 2021", tier: "Metal" },
    accounts: [
      { id: checkingId, name: "Everyday Checking", type: "Checking", number: "4021 8466 8150 8361", balance: 12480.55, currency: "USD", color: "navy" },
      { id: savingsId, name: "High-Yield Savings", type: "Savings", number: "8847 2210 4493 7712", balance: 28930.12, currency: "USD", color: "emerald" },
      { id: investId, name: "Investment Portfolio", type: "Investment", number: "9132 5566 8821 3304", balance: 64210.88, currency: "USD", color: "indigo" },
    ],
    transactions,
    cards,
    adminEvents,
  };
}

function load(): BankState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as Partial<BankState>;
    // Migration safety: ensure new fields exist
    const base = seed();
    return {
      user: parsed.user ?? base.user,
      accounts: parsed.accounts ?? base.accounts,
      transactions: parsed.transactions ?? base.transactions,
      cards: parsed.cards ?? base.cards,
      adminEvents: parsed.adminEvents ?? base.adminEvents,
    };
  } catch {
    return seed();
  }
}

function save(state: BankState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("bank-state-changed"));
}

export function resetState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("bank-state-changed"));
}

export function useBankState() {
  // Always initialize from seed for SSR-safe hydration; load from localStorage in effect
  const [state, setState] = useState<BankState>(() => seed());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setState(load());
    sync();
    setHydrated(true);
    window.addEventListener("bank-state-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("bank-state-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const transfer = useCallback(
    (fromId: string, toId: string, amount: number, note: string): Transaction | null => {
      const s = load();
      const from = s.accounts.find((a) => a.id === fromId);
      const to = s.accounts.find((a) => a.id === toId);
      if (!from || !to || amount <= 0 || from.balance < amount) return null;
      from.balance -= amount;
      to.balance += amount;
      const ref = genRef(Date.now() % 100000);
      const date = new Date().toISOString();
      const id = "tx_" + Date.now().toString(36);
      const debit: Transaction = { id, date, description: note || `Transfer to ${to.name}`, category: "Transfer", amount, type: "debit", status: "completed", reference: ref, accountId: fromId, counterparty: `${to.name} ••${to.number.slice(-4)}` };
      const credit: Transaction = { id: id + "_c", date, description: note || `Transfer from ${from.name}`, category: "Transfer", amount, type: "credit", status: "completed", reference: ref, accountId: toId, counterparty: `${from.name} ••${from.number.slice(-4)}` };
      s.transactions = [debit, credit, ...s.transactions];
      save(s);
      return debit;
    },
    [],
  );

  const toggleCardFreeze = useCallback((cardId: string) => {
    const s = load();
    const c = s.cards.find((c) => c.id === cardId);
    if (!c) return;
    c.frozen = !c.frozen;
    s.adminEvents = [
      { id: "ev_" + Date.now().toString(36), ts: new Date().toISOString(), actor: "alex.morgan", action: c.frozen ? "Card frozen" : "Card unfrozen", target: cardId, severity: "warning" },
      ...s.adminEvents,
    ];
    save(s);
  }, []);

  return { state, hydrated, transfer, toggleCardFreeze, reset: resetState };
}

export function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function mask(number: string) {
  const last4 = number.replace(/\s/g, "").slice(-4);
  return `•••• ${last4}`;
}
