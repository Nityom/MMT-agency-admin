"use client";

import {
  Banknote,
  CalendarDays,
  Check,
  CircleDollarSign,
  FileText,
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
  filteredBills,
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
  return (
    <>
      <PageHead
        title="Client billing"
        detail="Per vehicle, dates, running days, charges and installments"
        action="Generate bill"
        onAction={generateBill}
      />
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
        <p>
          {filteredBills.length} of {store.bills.length} invoices
        </p>
      </div>
      <section className="op-metrics three">
        <Metric
          label="Total business"
          value={money(totalBusiness)}
          detail={`${store.bills.length} invoices`}
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
          label="Outstanding"
          value={money(outstanding)}
          detail="After all receipts"
          icon={WalletCards}
        />
      </section>
      {filteredBills.length ? (
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
          {filteredBills.map((bill) => {
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
            Try a different invoice number, client name, phone number, or
            payment status.
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