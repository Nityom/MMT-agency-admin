"use client";

import {
  Banknote,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Plus,
  Printer,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bill,
  calculatePayroll,
  FleetStore,
  OtherBill,
} from "./fleet-domain";
import {
  Button,
  Modal,
  Row,
  Status,
  Table,
} from "./operations-components";
import {
  billBalance,
  billPaid,
  expenseClientBilling,
  expenseProfit,
  fmt,
  money,
  ReportProfitCategory,
  reportProfitCategories,
} from "./operations-utils";

export type ReportDetailKind =
  | "business"
  | "periodOutstanding"
  | "expenses"
  | "allOutstanding";

export function PageHead({
  title,
  detail,
  action,
  onAction,
}: {
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
}) {
  const printableSupplierLedger = title === "Maintenance payment ledger";
  const printablePayroll = title === "Weekly payroll";
  const campaignQuotations = title === "Monthly campaign bookings";
  const printablePage = printableSupplierLedger || printablePayroll;
  const visibleTitle = title.replace(/payroll/gi, "salary");
  const visibleDetail = detail.replace(/payroll/gi, "salary");
  return (
    <div
      className={`op-page-head${printablePage ? " op-print-page-head" : ""}`}
    >
      <div>
        <p>{visibleDetail}</p>
        <h1>{visibleTitle}</h1>
      </div>
      <span className="op-page-head-actions">
        {printableSupplierLedger && (
          <Button secondary onClick={() => window.print()}>
            <Printer size={17} />
            Print ledger
          </Button>
        )}
        {printablePayroll && (
          <Button secondary onClick={() => window.print()}>
            <Printer size={17} />
            Print salary
          </Button>
        )}
        {campaignQuotations && <CampaignHistoryFilter />}
        {campaignQuotations && (
          <Button
            secondary
            onClick={() =>
              window.dispatchEvent(new Event("fleetflow:quotation-picker"))
            }
          >
            <Printer size={17} />
            Print quotation
          </Button>
        )}
        {action && (
          <Button onClick={onAction}>
            <Plus size={18} />
            {action}
          </Button>
        )}
      </span>
    </div>
  );
}

export function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Banknote;
}) {
  const visibleLabel = label.replace(/payroll/gi, "salary");
  const visibleDetail = detail.replace(/payroll/gi, "salary");
  const reportDetail = (
    {
      "Business in period": "business",
      "Outstanding in period": "periodOutstanding",
      "Total expenses in period": "expenses",
      "All-time outstanding": "allOutstanding",
    } as const
  )[label];
  if (reportDetail)
    return (
      <button
        type="button"
        className="op-metric op-metric-button"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent<ReportDetailKind>("fleetflow:report-detail", {
              detail: reportDetail,
            }),
          )
        }
        aria-label={`Open ${visibleLabel} details`}
      >
        <span>
          <Icon size={21} />
        </span>
        <p>{visibleLabel}</p>
        <strong>{value}</strong>
        <small>{visibleDetail}</small>
        <ChevronRight className="op-metric-open" size={17} />
      </button>
    );
  return (
    <article className="op-metric">
      <span>
        <Icon size={21} />
      </span>
      <p>{visibleLabel}</p>
      <strong>{value}</strong>
      <small>{visibleDetail}</small>
    </article>
  );
}

function CampaignHistoryFilter() {
  const [value, setValue] = useState(""),
    [months, setMonths] = useState<string[]>([]);
  useEffect(() => {
    const receiveMonths = (event: Event) =>
      setMonths((event as CustomEvent<string[]>).detail);
    window.addEventListener("fleetflow:campaign-month-options", receiveMonths);
    window.dispatchEvent(new Event("fleetflow:campaign-month-options-request"));
    return () =>
      window.removeEventListener(
        "fleetflow:campaign-month-options",
        receiveMonths,
      );
  }, []);
  const select = (month: string) => {
    setValue(month);
    window.dispatchEvent(
      new CustomEvent<string>("fleetflow:campaign-month", { detail: month }),
    );
  };
  const selectedLabel = value
    ? new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "";
  return (
    <>
      <label className="op-campaign-history-filter">
        <CalendarDays size={17} />
        <select
          aria-label="Filter campaigns by month and year"
          value={value}
          onChange={(event) => select(event.target.value)}
        >
          <option value="">All months</option>
          {months.map((month) => (
            <option value={month} key={month}>
              {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </option>
          ))}
        </select>
      </label>
      {value && (
        <Button secondary onClick={() => window.print()}>
          <Printer size={17} />
          Print customer list
        </Button>
      )}
      {value && (
        <strong className="op-campaign-print-title">
          Customer List · {selectedLabel}
        </strong>
      )}
    </>
  );
}

export function PayrollAdvanceRecovery({
  store,
  preview,
}: {
  store: FleetStore;
  preview: ReturnType<typeof calculatePayroll>;
}) {
  const outstanding = store.advances
    .filter(
      (advance) =>
        advance.employeeId === preview.employeeId &&
        advance.date <= preview.payoutDate,
    )
    .reduce(
      (sum, advance) => sum + Math.max(0, advance.amount - advance.recovered),
      0,
    );
  const remaining = Math.max(0, outstanding - preview.advanceRecovery);
  return (
    <span>
      <b>{money(preview.advanceRecovery)}</b>
      {remaining > 0 && (
        <small>
          {money(remaining)}{" "}
          {preview.net === 0
            ? "waiting: no payable salary"
            : "remains for future salary"}
        </small>
      )}
    </span>
  );
}

export function ReportProfitSection({
  category,
  supplierCost,
  clientBilling,
  profit,
  recordCount,
  breakdown,
  select,
}: {
  category: ReportProfitCategory;
  supplierCost: number;
  clientBilling: number;
  profit: number;
  recordCount: number;
  breakdown: {
    value: ReportProfitCategory;
    label: string;
    profit: number;
    records: FleetStore["businessExpenses"];
  }[];
  select: (category: ReportProfitCategory) => void;
}) {
  const categoryLabel =
    reportProfitCategories.find((item) => item.value === category)?.label ??
    "All";
  const selfExpenseRecords = breakdown
    .filter((item) => item.value === "Self travel")
    .flatMap((item) => item.records)
    .sort((left, right) => right.date.localeCompare(left.date));
  return (
    <section className="op-report-profit">
      <header>
        <div>
          <h2>Profit by category</h2>
          <p>Client billing minus supplier cost for the selected period.</p>
        </div>
        <div className="op-category-filter">
          {reportProfitCategories.map((item) => (
            <button
              className={category === item.value ? "active" : ""}
              onClick={() => select(item.value)}
              key={item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <section className="op-metrics three">
        <Metric
          label={`${categoryLabel} supplier cost`}
          value={money(supplierCost)}
          detail={`${recordCount} work records`}
          icon={ReceiptText}
        />
        <Metric
          label="Client billing"
          value={money(clientBilling)}
          detail="Amount charged to clients"
          icon={WalletCards}
        />
        <Metric
          label="Gross profit"
          value={money(profit)}
          detail="Client billing minus supplier cost"
          icon={CircleDollarSign}
        />
      </section>
      <div className="op-report-profit-grid">
        {breakdown.map((item) => (
          <button
            className={category === item.value ? "active" : ""}
            onClick={() => select(item.value)}
            key={item.value}
          >
            <span>{item.label}</span>
            <strong className={item.profit < 0 ? "op-loss" : "op-profit"}>
              {money(item.profit)}
            </strong>
            <small>
              {item.value === "Self travel" || item.value === "Self stay"
                ? "Expense"
                : "Profit"}
            </small>
          </button>
        ))}
      </div>
      <section className="op-report-self-expenses">
        <div className="op-section-title">
          <div>
            <h2>Self expense records</h2>
            <p>Travel and stay records within the selected report period.</p>
          </div>
          <strong>
            {money(
              selfExpenseRecords.reduce(
                (sum, expense) => sum + expense.amount,
                0,
              ),
            )}
          </strong>
        </div>
        {selfExpenseRecords.length ? (
          selfExpenseRecords.map((expense) => (
            <article key={expense.id}>
              <time>{fmt(expense.date)}</time>
              <div>
                <b>
                  {expense.category === "Self travel" ? "Travel" : "Stay"} ·{" "}
                  {expense.description}
                </b>
                <small>
                  {expense.fromLocation || "Origin not saved"} to{" "}
                  {expense.toLocation || "Destination not saved"} ·{" "}
                  {expense.purpose}
                </small>
              </div>
              <span>{expense.paidTo}</span>
              <strong>{money(expense.amount)}</strong>
            </article>
          ))
        ) : (
          <div className="op-empty-state">
            <ReceiptText />
            <h2>No self expenses in this period</h2>
            <p>Travel and stay expense bills will appear here automatically.</p>
          </div>
        )}
      </section>
    </section>
  );
}

export function TrendGraph({
  items,
}: {
  items: { label: string; revenue: number; expenses: number }[];
}) {
  const [hovered, setHovered] = useState<{
    index: number;
    type: "revenue" | "expenses";
  } | null>(null);
  const width = 620,
    height = 250,
    left = 48,
    right = 18,
    top = 18,
    bottom = 42;
  const maximum = Math.max(
    1,
    ...items.flatMap((item) => [item.revenue, item.expenses]),
  );
  const x = (index: number) =>
    left + index * ((width - left - right) / Math.max(1, items.length - 1));
  const y = (value: number) =>
    top + (height - top - bottom) * (1 - value / maximum);
  const points = (key: "revenue" | "expenses") =>
    items.map((item, index) => `${x(index)},${y(item[key])}`).join(" ");
  const selected = hovered
    ? {
        ...items[hovered.index],
        type: hovered.type,
        value: items[hovered.index][hovered.type],
      }
    : null;
  const tooltipX = hovered
    ? Math.min(width - 80, Math.max(82, x(hovered.index)))
    : 0;
  const tooltipY = selected ? Math.max(8, y(selected.value) - 54) : 0;
  return (
    <article className="op-graph">
      <header>
        <div>
          <h2>Revenue and expenses trend</h2>
          <p>Hover or focus a point for the exact amount</p>
        </div>
        <span className="op-graph-key">
          <i />
          Revenue <i />
          Expenses
        </span>
      </header>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Revenue and expenses trend graph"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={left}
              x2={width - right}
              y1={y(maximum * ratio)}
              y2={y(maximum * ratio)}
              className="grid"
            />
            <text x={left - 8} y={y(maximum * ratio) + 4} textAnchor="end">
              {money(maximum * ratio)}
            </text>
          </g>
        ))}
        <polyline points={points("revenue")} className="revenue-line" />
        <polyline points={points("expenses")} className="expense-line" />
        {items.map((item, index) => (
          <g key={item.label}>
            <circle
              cx={x(index)}
              cy={y(item.revenue)}
              r="5"
              tabIndex={0}
              role="button"
              aria-label={`${item.label} revenue ${money(item.revenue)}`}
              className={`revenue-dot graph-point ${hovered?.index === index && hovered.type === "revenue" ? "active" : ""}`}
              onMouseEnter={() => setHovered({ index, type: "revenue" })}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered({ index, type: "revenue" })}
              onBlur={() => setHovered(null)}
            />
            <circle
              cx={x(index)}
              cy={y(item.expenses)}
              r="5"
              tabIndex={0}
              role="button"
              aria-label={`${item.label} expenses ${money(item.expenses)}`}
              className={`expense-dot graph-point ${hovered?.index === index && hovered.type === "expenses" ? "active" : ""}`}
              onMouseEnter={() => setHovered({ index, type: "expenses" })}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered({ index, type: "expenses" })}
              onBlur={() => setHovered(null)}
            />
            <text x={x(index)} y={height - 12} textAnchor="middle">
              {item.label}
            </text>
          </g>
        ))}
        {selected && (
          <g
            className="op-chart-tooltip"
            transform={`translate(${tooltipX} ${tooltipY})`}
            pointerEvents="none"
          >
            <rect x="-74" width="148" height="42" rx="5" />
            <text y="15" textAnchor="middle">
              {selected.label}
            </text>
            <text y="31" textAnchor="middle" className="value">
              {selected.type === "revenue" ? "Revenue" : "Expenses"}:{" "}
              {money(selected.value)}
            </text>
          </g>
        )}
      </svg>
    </article>
  );
}

export function ClientDonut({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const colors = [
    "#28735e",
    "#c98d2c",
    "#477aa8",
    "#9a5c78",
    "#6f8051",
    "#b65e4e",
  ];
  const total = items.reduce((sum, item) => sum + item.value, 0),
    radius = 64,
    circumference = 2 * Math.PI * radius;
  const selected = hoveredIndex === null ? null : items[hoveredIndex];
  return (
    <article className="op-graph op-donut">
      <header>
        <div>
          <h2>Revenue by client</h2>
          <p>Hover or focus a segment for client details</p>
        </div>
      </header>
      {total ? (
        <div>
          <svg
            viewBox="0 0 180 180"
            role="img"
            aria-label="Client revenue distribution graph"
          >
            <circle cx="90" cy="90" r={radius} className="donut-base" />
            {items.map((item, index) => {
              const length = (item.value / total) * circumference;
              const offset = items
                .slice(0, index)
                .reduce(
                  (sum, previous) =>
                    sum + (previous.value / total) * circumference,
                  0,
                );
              return (
                <circle
                  key={item.label}
                  cx="90"
                  cy="90"
                  r={radius}
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.label}: ${money(item.value)}, ${Math.round((item.value / total) * 100)} percent`}
                  className={`donut-segment ${hoveredIndex === index ? "active" : ""}`}
                  stroke={colors[index % colors.length]}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                />
              );
            })}
            <text x="90" y="82" textAnchor="middle">
              {selected ? selected.label.slice(0, 16) : "Total"}
            </text>
            <text x="90" y="101" textAnchor="middle" className="donut-total">
              {money(selected?.value ?? total)}
            </text>
            {selected && (
              <text x="90" y="117" textAnchor="middle">
                {Math.round((selected.value / total) * 100)}% of revenue
              </text>
            )}
          </svg>
          <section>
            {items.map((item, index) => (
              <p
                key={item.label}
                tabIndex={0}
                className={hoveredIndex === index ? "active" : ""}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
              >
                <i style={{ background: colors[index % colors.length] }} />
                <span>{item.label}</span>
                <b>{Math.round((item.value / total) * 100)}%</b>
                <small>{money(item.value)}</small>
              </p>
            ))}
          </section>
        </div>
      ) : (
        <div className="op-graph-empty">No billed revenue in this period</div>
      )}
    </article>
  );
}

export function ReportDetailModal({
  kind,
  store,
  reportStart,
  reportEnd,
  reportBills,
  reportOtherBills,
  reportExpenses,
  reportEmployeeExpenses,
  reportPayroll,
  close,
}: {
  kind: ReportDetailKind;
  store: FleetStore;
  reportStart: string;
  reportEnd: string;
  reportBills: Bill[];
  reportOtherBills: OtherBill[];
  reportExpenses: FleetStore["businessExpenses"];
  reportEmployeeExpenses: FleetStore["employeeExpenses"];
  reportPayroll: FleetStore["payrollPayments"];
  close: () => void;
}) {
  const periodBillRecords: (Bill | OtherBill)[] = [
    ...reportBills,
    ...reportOtherBills,
  ];
  const periodBills =
    kind === "periodOutstanding"
      ? periodBillRecords.filter((bill) => billBalance(bill) > 0)
      : periodBillRecords;
  const allOutstandingBills: (Bill | OtherBill)[] = [
    ...store.bills,
    ...store.otherBills,
  ]
    .filter((bill) => billBalance(bill) > 0)
    .sort((left, right) => right.billDate.localeCompare(left.billDate));
  const bills =
    kind === "allOutstanding"
      ? allOutstandingBills
      : [...periodBills].sort((left, right) =>
          right.billDate.localeCompare(left.billDate),
        );
  const titles: Record<ReportDetailKind, string> = {
    business: "Business in period",
    periodOutstanding: "Outstanding in period",
    expenses: "Total expenses in period",
    allOutstanding: "All-time outstanding",
  };
  const total =
    kind === "expenses"
      ? reportExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
        reportEmployeeExpenses.reduce(
          (sum, expense) => sum + expense.amount,
          0,
        ) +
        reportPayroll.reduce((sum, payment) => sum + payment.net, 0)
      : bills.reduce(
          (sum, bill) =>
            sum + (kind === "business" ? bill.total : billBalance(bill)),
          0,
        );
  const expenseRows = [
    ...reportExpenses.map((expense) => ({
      key: `business-${expense.id}`,
      date: expense.date,
      type:
        expense.category === "Self travel" || expense.category === "Self stay"
          ? "Self expense"
          : "Business expense",
      party: expense.paidTo || expense.clientName || "Not saved",
      detail: expense.description,
      amount: expense.amount,
    })),
    ...reportEmployeeExpenses.map((expense) => ({
      key: `employee-${expense.id}`,
      date: expense.date,
      type: "Employee expense",
      party:
        store.employees.find((employee) => employee.id === expense.employeeId)
          ?.name ??
        expense.employeeName ??
        "Employee",
      detail: `${expense.category} · ${expense.description}`,
      amount: expense.amount,
    })),
    ...reportPayroll.map((payment) => ({
      key: `salary-${payment.id}`,
      date: payment.paidAt ?? payment.payoutDate,
      type: "Salary",
      party:
        store.employees.find((employee) => employee.id === payment.employeeId)
          ?.name ?? "Employee",
      detail: `${fmt(payment.periodStart)} to ${fmt(payment.periodEnd)}`,
      amount: payment.net,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));
  return (
    <Modal title={titles[kind]} close={close}>
      <div className="op-report-detail">
        <section className="op-report-detail-summary">
          <div>
            <span>
              {kind === "allOutstanding"
                ? "All recorded dates"
                : `${fmt(reportStart)} to ${fmt(reportEnd)}`}
            </span>
            <strong>{money(total)}</strong>
          </div>
          <p>
            {kind === "expenses"
              ? `${expenseRows.length} expense records`
              : `${bills.length} invoice records`}
          </p>
        </section>
        {kind === "expenses" ? (
          expenseRows.length ? (
            <Table
              headers={[
                "Date",
                "Expense type",
                "Paid to / employee",
                "Details",
                "Amount",
              ]}
            >
              {expenseRows.map((expense) => (
                <Row key={expense.key}>
                  <span>{fmt(expense.date)}</span>
                  <Status>{expense.type}</Status>
                  <b>{expense.party}</b>
                  <span>{expense.detail}</span>
                  <strong>{money(expense.amount)}</strong>
                </Row>
              ))}
            </Table>
          ) : (
            <div className="op-empty-state">
              <ReceiptText />
              <h2>No expenses in this period</h2>
              <p>
                Business, employee, and paid salary records will appear here.
              </p>
            </div>
          )
        ) : bills.length ? (
          <Table
            headers={[
              "Bill date",
              "Invoice",
              "Client",
              "Bill total",
              "Received",
              "Balance",
              "Status",
            ]}
          >
            {bills.map((bill) => (
              <Row key={bill.id}>
                <span>{fmt(bill.billDate)}</span>
                <b>INV-{String(bill.number).padStart(4, "0")}</b>
                <span>
                  {bill.client.firmName}
                  <small>{bill.client.mobile || "No phone"}</small>
                </span>
                <strong>{money(bill.total)}</strong>
                <span>{money(billPaid(bill))}</span>
                <strong>{money(billBalance(bill))}</strong>
                <Status>
                  {billBalance(bill) === 0
                    ? "Paid"
                    : bill.status === "Overdue"
                      ? "Overdue"
                      : "Pending"}
                </Status>
              </Row>
            ))}
          </Table>
        ) : (
          <div className="op-empty-state">
            <FileText />
            <h2>No invoice records</h2>
            <p>Invoices matching this report card will appear here.</p>
          </div>
        )}
        <footer>
          <Button secondary onClick={close}>
            Close
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

export function ReportCategoryDetailModal({
  item,
  reportStart,
  reportEnd,
  close,
}: {
  item: {
    value: ReportProfitCategory;
    label: string;
    profit: number;
    records: FleetStore["businessExpenses"];
  };
  reportStart: string;
  reportEnd: string;
  close: () => void;
}) {
  const records = [...item.records].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
  const supplierCost = records.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const clientBilling = records.reduce(
    (sum, expense) => sum + expenseClientBilling(expense),
    0,
  );
  const recordType = (expense: FleetStore["businessExpenses"][number]) =>
    expense.paidTo === "Employee salary"
      ? "Salary"
      : expense.category === "Self travel" || expense.category === "Self stay"
        ? "Self expense"
        : item.label;
  return (
    <Modal title={`${item.label} details`} close={close}>
      <div className="op-report-detail">
        <section className="op-report-detail-summary">
          <div>
            <span>
              {fmt(reportStart)} to {fmt(reportEnd)}
            </span>
            <strong className={item.profit < 0 ? "op-loss" : "op-profit"}>
              {money(item.profit)}
            </strong>
          </div>
          <p>
            {records.length} records · Cost {money(supplierCost)} · Client
            billing {money(clientBilling)}
          </p>
        </section>
        {records.length ? (
          <Table
            headers={[
              "Date",
              "Type",
              "Description",
              "Paid to / client",
              "Cost",
              "Client billed",
              "Profit / expense",
            ]}
          >
            {records.map((expense) => {
              const recordProfit = expenseProfit(expense);
              return (
                <Row key={`${recordType(expense)}-${expense.id}`}>
                  <span>{fmt(expense.date)}</span>
                  <Status>{recordType(expense)}</Status>
                  <b>
                    {expense.description}
                    <small>{expense.purpose || expense.reference}</small>
                  </b>
                  <span>
                    {expense.clientName || expense.paidTo || "Not saved"}
                  </span>
                  <strong>{money(expense.amount)}</strong>
                  <span>{money(expenseClientBilling(expense))}</span>
                  <strong
                    className={recordProfit < 0 ? "op-loss" : "op-profit"}
                  >
                    {money(recordProfit)}
                  </strong>
                </Row>
              );
            })}
          </Table>
        ) : (
          <div className="op-empty-state">
            <ReceiptText />
            <h2>No {item.label.toLowerCase()} records</h2>
            <p>Records in the selected report period will appear here.</p>
          </div>
        )}
        <footer>
          <Button secondary onClick={close}>
            Close
          </Button>
        </footer>
      </div>
    </Modal>
  );
}