
"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, Search, RefreshCw, ArrowDownToLine,
  CheckCircle2, XCircle, Clock, Banknote, Wallet,
  Play, AlertCircle
} from "lucide-react";
import Link from "next/link";

const API = "http://127.0.0.1:8000";

type Transaction = {
  id: number;
  transaction_id: string;
  atm_code: string | null;
  amount: number;
  status: string;
  created_at: string;
};

type ATM = {
  id: number;
  atm_code: string;
  code?: string;
  name?: string;
  location?: string;
  status?: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [atmCode, setAtmCode] = useState("");
  const [amount, setAmount] = useState("");
  const [dispenseSuccess, setDispenseSuccess] = useState("true");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");


async function loadData() {
  try {
    setError("");

    const [txnResponse, atmResponse] = await Promise.all([
      fetch(`${API}/transactions`),
      fetch(`${API}/atms`)
    ]);

    if (!txnResponse.ok || !atmResponse.ok) {
      throw new Error("Unable to load data");
    }

    const txnData = await txnResponse.json();
    const atmData = await atmResponse.json();

    const txnList = Array.isArray(txnData)
      ? txnData
      : Array.isArray(txnData.transactions)
      ? txnData.transactions
      : Array.isArray(txnData.data)
      ? txnData.data
      : [];

    const atmList = Array.isArray(atmData)
      ? atmData
      : Array.isArray(atmData.atms)
      ? atmData.atms
      : Array.isArray(atmData.data)
      ? atmData.data
      : [];

    setTransactions(txnList);
    setAtms(atmList);

    if (atmList.length > 0 && !atmCode) {
      setAtmCode(
        atmList[0].atm_code ||
        atmList[0].code ||
        ""
      );
    }

  } catch (err) {
    console.error("Loading error:", err);
    setError("Unable to load ATM or transaction data. Check FastAPI.");
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadData();
  }, []);

  async function simulateWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const withdrawalAmount = Number(amount);

    if (!atmCode) {
      setMessage("Please select an ATM.");
      setMessageType("error");
      return;
    }

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setMessage("Enter a valid withdrawal amount.");
      setMessageType("error");
      return;
    }

    if (withdrawalAmount % 100 !== 0) {
      setMessage("Enter an amount in multiples of ₹100.");
      setMessageType("error");
      return;
    }

    setProcessing(true);

    const transactionId = `TXN${Date.now()}`;

    try {
      const response = await fetch(`${API}/transactions/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          atm_code: atmCode,
          amount: withdrawalAmount,
          dispense_success: dispenseSuccess === "true"
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Withdrawal simulation failed.");
      }

      setMessage(
        `Transaction ${result.status || "processed"}! Transaction ID: ${transactionId}`
      );
      setMessageType(
        result.status === "FAILED" ? "error" : "success"
      );

      setAmount("");
      await loadData();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to process transaction."
      );
      setMessageType("error");
    } finally {
      setProcessing(false);
    }
  }

  const filtered = transactions.filter(txn => {
    const matchesSearch =
      txn.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      (txn.atm_code || "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "ALL" || txn.status === filter;

    return matchesSearch && matchesFilter;
  });

  const totalAmount = transactions
    .filter(t => t.status === "COMMITTED")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const successCount = transactions.filter(
    t => t.status === "COMMITTED"
  ).length;

  const failedCount = transactions.filter(
    t => t.status === "FAILED"
  ).length;

  return (
    <main className="min-h-screen bg-[#080d18] p-5 text-slate-100 md:p-9">
      <div className="mx-auto max-w-7xl space-y-8">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2 text-sm text-cyan-400">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Transaction Management</h1>
            <p className="mt-2 text-sm text-slate-400">
              Simulate ATM withdrawals and monitor transaction activity.
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800"
          >
            <RefreshCw size={17} /> Refresh
          </button>
        </header>

        {/* Withdrawal Simulator */}
        <section className="rounded-2xl border border-cyan-500/20 bg-[#111a2b] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">ATM Withdrawal Simulator</h2>
              <p className="text-sm text-slate-400">
                Test successful and failed ATM withdrawal scenarios.
              </p>
            </div>
          </div>

          <form onSubmit={simulateWithdrawal} className="grid gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Select ATM
              </label>
              <select
                value={atmCode}
                onChange={e => setAtmCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0b1423] px-4 py-3 outline-none focus:border-cyan-500"
                required
              >
                <option value="">Choose an ATM</option>
                {atms.map((atm, index) => {
                  const code = atm.atm_code || atm.code || "";
                  return (
                    <option key={atm.id || index} value={code}>
                      {code} {atm.location ? `- ${atm.location}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Withdrawal Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount (e.g. 2000)"
                className="w-full rounded-xl border border-slate-700 bg-[#0b1423] px-4 py-3 outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Cash Dispensing Result
              </label>
              <select
                value={dispenseSuccess}
                onChange={e => setDispenseSuccess(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0b1423] px-4 py-3 outline-none focus:border-cyan-500"
              >
                <option value="true">Successful Dispensing</option>
                <option value="false">Simulate Dispensing Failure</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={processing || atms.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={17} />
                {processing ? "Processing..." : "Simulate Withdrawal"}
              </button>
            </div>
          </form>

          {message && (
            <div className={`mt-5 flex items-center gap-2 rounded-xl border p-4 text-sm ${
              messageType === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}>
              {messageType === "success"
                ? <CheckCircle2 size={18} />
                : <AlertCircle size={18} />}
              {message}
            </div>
          )}

          {atms.length === 0 && !loading && (
            <p className="mt-4 text-sm text-amber-400">
              No ATMs found. Check your backend ATM records.
            </p>
          )}
        </section>

        {/* Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Transactions", value: transactions.length, icon: Banknote },
            { label: "Successful", value: successCount, icon: CheckCircle2 },
            { label: "Failed", value: failedCount, icon: XCircle },
            {
              label: "Successful Withdrawals",
              value: `₹${totalAmount.toLocaleString("en-IN")}`,
              icon: ArrowDownToLine
            }
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5">
                <Icon size={23} className="mb-5 text-cyan-400" />
                <p className="text-sm text-slate-400">{item.label}</p>
                <h2 className="mt-2 text-2xl font-bold">{item.value}</h2>
              </div>
            );
          })}
        </section>

        {/* Transaction History */}
        <section className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5 md:p-6">
          <h2 className="mb-5 text-xl font-bold">Transaction History</h2>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-[#0b1423] px-4">
              <Search size={18} className="text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search transaction ID or ATM code..."
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>

            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-[#0b1423] px-4 py-3 text-sm outline-none"
            >
              <option value="ALL">All Transactions</option>
              <option value="COMMITTED">Successful</option>
              <option value="FAILED">Failed</option>
              <option value="HELD">Held</option>
              <option value="PENDING">Pending</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="pb-4">Transaction ID</th>
                  <th className="pb-4">ATM Code</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4">Date & Time</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(txn => (
                  <tr key={txn.id} className="border-b border-slate-800/70">
                    <td className="py-5 font-semibold">{txn.transaction_id}</td>
                    <td className="py-5 text-slate-400">{txn.atm_code || "—"}</td>
                    <td className="py-5">₹{Number(txn.amount).toLocaleString("en-IN")}</td>
                    <td className="py-5 text-slate-400">
                      {new Date(txn.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="py-5">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                        txn.status === "COMMITTED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : txn.status === "FAILED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {txn.status === "COMMITTED"
                          ? <CheckCircle2 size={14} />
                          : txn.status === "FAILED"
                          ? <XCircle size={14} />
                          : <Clock size={14} />}
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <p className="py-10 text-center text-slate-500">
                No matching transactions found.
              </p>
            )}

            {loading && (
              <p className="py-10 text-center text-slate-400">
                Loading transactions...
              </p>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-600">
          ATMGuard – ATM Fault-Tolerance and Transaction Recovery Platform
        </p>
      </div>
    </main>
  );
}
