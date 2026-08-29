"use client";

import { useState } from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  CircleDollarSign,
  FileText,
  Printer,
  ReceiptText,
  Search,
  UserRound,
  WalletCards,
  Wrench,
} from "lucide-react";
import {
  calculatePayroll,
  type Bill,
  type CampaignBooking,
  type FleetStore,
  type weekFor,
} from "./fleet-domain";
import { Actions, Button, Row, Status, Table } from "./operations-components";
import { BusinessAccountLedger } from "./operations-expenses";
import { Metric, PageHead } from "./operations-reports";
import {
  billBalance,
  billPaid,
  bookingEnd,
  expenseProfit,
  fmt,
  isoToday,
  money,
  supplierBalance,
  supplierPaid,
} from "./operations-utils";

export type OverviewViewProps = {
  store: FleetStore;
  totalBusiness: number;
  outstanding: number;
  totalExpenses: number;
  activeEmployees: FleetStore["employees"];
  currentWeek: ReturnType<typeof weekFor>;
  activeCampaigns: CampaignBooking[];
};

export function OverviewView({
  store,
  totalBusiness,
  outstanding,
  totalExpenses,
  activeEmployees,
  currentWeek,
  activeCampaigns,
}: OverviewViewProps) {
  return (
    <>
      <PageHead title="Operations overview" detail={fmt(isoToday())} />
      <section className="op-metrics">
        <Metric
          label="Total business"
          value={money(totalBusiness)}
          detail={`${store.bills.length} bills`}
          icon={CircleDollarSign}
        />
        <Metric
          label="Outstanding"
          value={money(outstanding)}
          detail="Pending client balance"
          icon={WalletCards}
        />
        <Metric
          label="Total expenses"
          value={money(totalExpenses)}
          detail="Business and employee costs"
          icon={ReceiptText}
        />
        <Metric
          label="This week payroll"
          value={money(
            activeEmployees.reduce(
              (sum, item) =>
                sum + calculatePayroll(store, item.id, currentWeek.start).net,
              0,
            ),
          )}
          detail={`Payable ${fmt(currentWeek.payoutDate)}`}
          icon={Banknote}
        />
      </section>
      <section className="op-dashboard-grid">
        <article className="op-panel op-active-campaigns">
          <header>
            <div>
              <h2>Active campaigns</h2>
              <span>{activeCampaigns.length} running now</span>
            </div>
            <CalendarDays size={20} />
          </header>
          {activeCampaigns.length ? (
            <div className="op-active-campaign-list">
              {activeCampaigns.map((booking) => (
                <article key={booking.id}>
                  <div className="op-active-campaign-date">
                    <b>
                      {new Date(
                        `${booking.startDate}T00:00:00`,
                      ).toLocaleDateString("en-IN", { day: "2-digit" })}
                    </b>
                    <span>
                      {new Date(
                        `${booking.startDate}T00:00:00`,
                      ).toLocaleDateString("en-IN", { month: "short" })}
                    </span>
                  </div>
                  <div className="op-active-campaign-client">
                    <b>{booking.client.firmName}</b>
                    <span>
                      {booking.client.ownerName ||
                        booking.client.mobile ||
                        "Campaign client"}
                    </span>
                  </div>
                  <Status>Active</Status>
                  <div className="op-active-campaign-facts">
                    <span>
                      <CalendarDays size={15} />
                      {fmt(booking.startDate)} to {fmt(bookingEnd(booking))}
                    </span>
                    <strong>
                      {booking.vehiclePeriods.reduce(
                        (sum, period) => sum + period.quantity,
                        0,
                      )}{" "}
                      vehicle slots
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="op-panel-empty">
              <CalendarDays size={24} />
              <b>No active campaigns</b>
              <span>Campaigns running today will appear here.</span>
            </div>
          )}
        </article>
        <article className="op-panel">
          <h2>Needs collection</h2>
          {store.bills
            .filter((item) => billBalance(item) > 0)
            .map((bill) => (
              <p key={bill.id}>
                <b>{bill.client.firmName}</b>
                <span>
                  INV-{String(bill.number).padStart(4, "0")} ·{" "}
                  {money(billBalance(bill))}
                </span>
              </p>
            ))}
        </article>
      </section>
    </>
  );
}

export type BillingViewProps = {
  store: FleetStore;
  billingSearch: string;
  filteredBills: Bill[];
  totalBusiness: number;
  outstanding: number;
  setBillingSearch: (value: string) => void;
  generateBill: () => void;
  openCompanyDetails: () => void;
  combineClientBills: () => void;
  editBill: (bill: Bill) => void;
  recordPayment: (bill: Bill) => void;
  viewBill: (bill: Bill) => void;
};

export function BillingView({
  store,
  billingSearch,
  filteredBills: initialFilteredBills,
  totalBusiness,
  outstanding,
  setBillingSearch,
  generateBill,
  openCompanyDetails,
  combineClientBills,
  editBill,
  recordPayment,
  viewBill,
}: BillingViewProps) {
  const [periodMode, setPeriodMode] = useState<"all" | "month" | "range">("all");
  const [selectedMonth, setSelectedMonth] = useState(isoToday().slice(0, 7));
  const [fromDate, setFromDate] = useState(isoToday().slice(0, 8) + "01");
  const [toDate, setToDate] = useState(isoToday());

  const displayedBills = store.bills.filter((bill) => {
    if (periodMode === "month" && !bill.billDate.startsWith(selectedMonth)) return false;
    if (periodMode === "range" && (bill.billDate < fromDate || bill.billDate > toDate)) return false;
    const query = billingSearch.trim().toLowerCase();
    if (!query) return true;
    const invoiceNum = `inv-${String(bill.number).padStart(4, "0")}`.toLowerCase();
    return (
      invoiceNum.includes(query) ||
      bill.client.firmName.toLowerCase().includes(query) ||
      (bill.client.ownerName || "").toLowerCase().includes(query) ||
      bill.client.mobile.includes(query) ||
      bill.status.toLowerCase().includes(query)
    );
  });

  const periodBilled = displayedBills.reduce((sum, b) => sum + b.total, 0);
  const periodCollected = displayedBills.reduce((sum, b) => sum + billPaid(b), 0);

  const prevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    setSelectedMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    setSelectedMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <>
      <PageHead
        title="Client billing"
        detail="Per vehicle, dates, running days, charges and installments"
        action="Generate bill"
        onAction={generateBill}
      />
      <div className="op-period-tabs" style={{ marginBottom: "14px", display: "flex", gap: "8px" }}>
        <Button secondary={periodMode !== "all"} onClick={() => setPeriodMode("all")}>
          All Invoices
        </Button>
        <Button secondary={periodMode !== "month"} onClick={() => setPeriodMode("month")}>
          <CalendarDays size={16} />
          Monthly Billing
        </Button>
        <Button secondary={periodMode !== "range"} onClick={() => setPeriodMode("range")}>
          <CalendarDays size={16} />
          Date Range
        </Button>
      </div>

      {periodMode === "month" && (
        <div className="op-toolbar" style={{ background: "#f3f7f4", padding: "10px 14px", borderRadius: "7px", marginBottom: "14px" }}>
          <Button secondary onClick={prevMonth}>← Prev Month</Button>
          <label className="op-field" style={{ margin: 0 }}>
            <span>Select Billing Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </label>
          <Button secondary onClick={nextMonth}>Next Month →</Button>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </p>
        </div>
      )}

      {periodMode === "range" && (
        <div className="op-toolbar" style={{ background: "#f3f7f4", padding: "10px 14px", borderRadius: "7px", marginBottom: "14px", gap: "12px" }}>
          <label className="op-field" style={{ margin: 0 }}>
            <span>From Date</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="op-field" style={{ margin: 0 }}>
            <span>To Date</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <Button
            secondary
            onClick={() => {
              setFromDate(isoToday().slice(0, 8) + "01");
              setToDate(isoToday());
            }}
          >
            This Month
          </Button>
        </div>
      )}

      <div className="op-toolbar">
        <label className="op-search">
          <Search />
          <input
            placeholder="Search invoice, client, phone, or status"
            value={billingSearch}
            onChange={(event) => setBillingSearch(event.target.value)}
          />
        </label>
        <Button secondary onClick={openCompanyDetails}>
          <Banknote />
          Company & RTGS details
        </Button>
        <Button secondary onClick={combineClientBills}>
          <FileText />
          Combine client bills
        </Button>
        <Button secondary onClick={() => window.print()}>
          <Printer size={16} />
          Print billing statement
        </Button>
        <p>
          {displayedBills.length} of {store.bills.length} invoices
        </p>
      </div>
      <section className="op-metrics three">
        <Metric
          label="Total business"
          value={money(totalBusiness)}
          detail={`${store.bills.length} invoices (all-time)`}
          icon={FileText}
        />
        <Metric
          label="Collected"
          value={money(
            store.bills.reduce(
              (sum, bill) => sum + Math.min(bill.total, billPaid(bill)),
              0,
            ),
          )}
          detail="Advances and installments"
          icon={Check}
        />
        <Metric
          label="Overall outstanding"
          value={money(outstanding)}
          detail="Across all clients"
          icon={WalletCards}
        />
      </section>

      {periodMode !== "all" && (
        <div className="op-account-ledger-summary" style={{ margin: "12px 0" }}>
          <span>
            <b>Filtered Period:</b> {periodMode === "month" ? fmt(selectedMonth + "-01") : `${fmt(fromDate)} to ${fmt(toDate)}`}
          </span>
          <span>Billed: <b>{money(periodBilled)}</b></span>
          <span>Collected: <b>{money(periodCollected)}</b></span>
          <strong>Pending: {money(Math.max(0, periodBilled - periodCollected))}</strong>
        </div>
      )}

      {displayedBills.length ? (
        <Table
          headers={[
            "Bill",
            "Client",
            "Bill date",
            "Vehicles",
            "Total",
            "Received",
            "Balance",
            "Status",
            "",
          ]}
        >
          {displayedBills.map((bill) => {
            const latestPayment = [...(bill.payments ?? [])].sort((left, right) =>
              right.date.localeCompare(left.date),
            )[0];
            return (
              <Row key={bill.id}>
                <b>INV-{String(bill.number).padStart(4, "0")}</b>
                <span>
                  {bill.client.firmName}
                  <small>{bill.client.mobile}</small>
                </span>
                <span>{fmt(bill.billDate)}</span>
                <span>
                  {bill.vehicleLines.reduce(
                    (sum, line) => sum + (line.quantity ?? 1),
                    0,
                  )}
                </span>
                <strong>{money(bill.total)}</strong>
                <span>
                  <b>{money(billPaid(bill))}</b>
                  <small>
                    {latestPayment
                      ? `${latestPayment.mode} · Last ${fmt(latestPayment.date)}`
                      : bill.advanceReceived
                        ? `${bill.paymentMode} · Advance received`
                        : `${bill.paymentMode} · No payment`}
                  </small>
                </span>
                <strong>{money(billBalance(bill))}</strong>
                <Status>
                  {billBalance(bill) === 0
                    ? "Paid"
                    : bill.status === "Overdue"
                      ? "Overdue"
                      : "Pending"}
                </Status>
                <Actions
                  edit={() => editBill(bill)}
                  payment={
                    billBalance(bill) > 0
                      ? () => recordPayment(bill)
                      : undefined
                  }
                  view={() => viewBill(bill)}
                />
              </Row>
            );
          })}
        </Table>
      ) : (
        <div className="op-empty-state">
          <Search />
          <h2>No invoices found</h2>
          <p>
            Try a different invoice number, client name, phone number, or period filter.
          </p>
        </div>
      )}
    </>
  );
}

export type ExpensesViewProps = {
  store: FleetStore;
  totalSupplierPaid: number;
  totalSupplierBalance: number;
  totalExpenseProfit: number;
  addBusinessExpense: () => void;
  addEmployeeExpense: () => void;
  addEmployeeAdvance: () => void;
  editBusinessExpense: (expenseId: number) => void;
  removeBusinessExpense: (expenseId: number) => void;
  savePayment: (
    expenseId: number,
    date: string,
    paidAmount: number,
    reference: string,
    note: string,
  ) => void;
};

export function ExpensesView({
  store,
  totalSupplierPaid,
  totalSupplierBalance,
  totalExpenseProfit,
  addBusinessExpense,
  addEmployeeExpense,
  addEmployeeAdvance,
  editBusinessExpense,
  removeBusinessExpense,
  savePayment,
}: ExpensesViewProps) {
  return (
    <>
      <PageHead
        title="Expense accounts"
        detail="Supplier bills, payments, balances, client charges, and profit"
        action="Business expense"
        onAction={addBusinessExpense}
      />
      <div className="op-toolbar">
        <Button secondary onClick={addEmployeeExpense}>
          <UserRound />
          Employee expense
        </Button>
        <Button secondary onClick={addEmployeeAdvance}>
          <Banknote />
          Employee advance
        </Button>
      </div>
      <section className="op-metrics">
        <Metric
          label="Supplier bills"
          value={money(
            store.businessExpenses.reduce(
              (sum, expense) => sum + expense.amount,
              0,
            ),
          )}
          detail={`${store.businessExpenses.length} business expenses`}
          icon={ReceiptText}
        />
        <Metric
          label="Paid to suppliers"
          value={money(totalSupplierPaid)}
          detail="Payments recorded"
          icon={Check}
        />
        <Metric
          label="Supplier balance"
          value={money(totalSupplierBalance)}
          detail="Still payable"
          icon={WalletCards}
        />
        <Metric
          label="Gross profit"
          value={money(totalExpenseProfit)}
          detail="Client charges minus supplier bills"
          icon={CircleDollarSign}
        />
      </section>
      <section className="op-account-grid">
        {[
          "Maintenance",
          "Printing",
          "Pasting",
          "Bond / banner material",
          "Self travel",
          "Miscellaneous",
        ].map((category) => (
          <article key={category}>
            <Wrench />
            <span>{category}</span>
            <strong>
              {money(
                store.businessExpenses
                  .filter((item) => item.category === category)
                  .reduce((sum, item) => sum + item.amount, 0),
              )}
            </strong>
          </article>
        ))}
      </section>
      <h2 className="op-list-title">Business expense ledger</h2>
      <Table
        headers={[
          "Date",
          "Client / supplier",
          "Work / vehicle",
          "Qty × rate",
          "Client charged",
          "Supplier bill",
          "Paid",
          "Balance",
          "Profit",
          "",
        ]}
      >
        {store.businessExpenses.map((expense) => (
          <Row key={expense.id}>
            <span>{fmt(expense.date)}</span>
            <span>
              <b>{expense.clientName || "No client saved"}</b>
              <small>{expense.paidTo}</small>
            </span>
            <span>
              <b>{expense.description}</b>
              <small>{expense.reference || expense.purpose}</small>
            </span>
            <span>
              {expense.quantity
                ? `${expense.quantity} ${expense.unit || "units"}`
                : "—"}
              <small>
                {expense.supplierRate
                  ? `× ${money(expense.supplierRate)}`
                  : expense.category}
              </small>
            </span>
            <strong>
              {money(expense.clientBillingAmount ?? expense.amount)}
            </strong>
            <strong>{money(expense.amount)}</strong>
            <span>
              <b>{money(supplierPaid(expense))}</b>
              <small>
                {expense.paidDate ? fmt(expense.paidDate) : "No payment date"}
              </small>
            </span>
            <strong>{money(supplierBalance(expense))}</strong>
            <strong
              className={expenseProfit(expense) < 0 ? "op-loss" : "op-profit"}
            >
              {money(expenseProfit(expense))}
            </strong>
            <Actions
              edit={() => editBusinessExpense(expense.id)}
              remove={() => removeBusinessExpense(expense.id)}
            />
          </Row>
        ))}
      </Table>
      <h2 className="op-list-title">Employee incidentals and advances</h2>
      <Table
        headers={[
          "Date",
          "Employee",
          "Category",
          "Details",
          "Treatment",
          "Amount",
        ]}
      >
        {store.employeeExpenses.map((expense) => (
          <Row key={`expense-${expense.id}`}>
            <span>{fmt(expense.date)}</span>
            <b>
              {
                store.employees.find((item) => item.id === expense.employeeId)
                  ?.name
              }
            </b>
            <span>{expense.category}</span>
            <span>{expense.description}</span>
            <span>{expense.treatment}</span>
            <strong>{money(expense.amount)}</strong>
          </Row>
        ))}
        {store.advances.map((advanceItem) => (
          <Row key={`advance-${advanceItem.id}`}>
            <span>{fmt(advanceItem.date)}</span>
            <b>
              {
                store.employees.find(
                  (item) => item.id === advanceItem.employeeId,
                )?.name
              }
            </b>
            <span>Advance</span>
            <span>{advanceItem.note}</span>
            <span>Recovered {money(advanceItem.recovered)}</span>
            <strong>{money(advanceItem.amount)}</strong>
          </Row>
        ))}
      </Table>
      <BusinessAccountLedger store={store} savePayment={savePayment} />
    </>
  );
}