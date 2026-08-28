"use client";

import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { addDays, type FleetStore } from "./fleet-domain";
import {
  ClientDonut,
  Metric,
  PageHead,
  ReportProfitSection,
  TrendGraph,
} from "./operations-reports";
import {
  billBalance,
  fmt,
  isoToday,
  money,
  type ReportProfitCategory,
} from "./operations-utils";

type ReportPeriod = "Month" | "Quarter" | "Year" | "Date range";

type ReportsViewProps = {
  store: FleetStore;
  reportPeriod: ReportPeriod;
  setReportPeriod: (period: ReportPeriod) => void;
  reportMonth: string;
  setReportMonth: (month: string) => void;
  reportQuarter: number;
  setReportQuarter: (quarter: number) => void;
  reportQuarterYear: number;
  setReportQuarterYear: (year: number) => void;
  reportYear: number;
  setReportYear: (year: number) => void;
  reportFrom: string;
  setReportFrom: (date: string) => void;
  reportTo: string;
  setReportTo: (date: string) => void;
  reportStart: string;
  reportEnd: string;
  reportProfitCategory: ReportProfitCategory;
  reportCategorySupplierCost: number;
  reportCategoryClientBilling: number;
  reportCategoryProfit: number;
  reportCategoryRecordCount: number;
  reportProfitBreakdown: {
    value: ReportProfitCategory;
    label: string;
    records: FleetStore["businessExpenses"];
    profit: number;
  }[];
  setReportProfitCategory: (category: ReportProfitCategory) => void;
  reportTrend: { label: string; revenue: number; expenses: number }[];
  reportClientChart: { label: string; value: number }[];
  reportRevenue: number;
  reportOutstanding: number;
  reportBills: FleetStore["bills"];
  reportTotalExpenses: number;
  reportExpenses: FleetStore["businessExpenses"];
  reportEmployeeExpenses: FleetStore["employeeExpenses"];
  reportPayroll: FleetStore["payrollPayments"];
  outstanding: number;
};

export function ReportsView({
  store,
  reportPeriod,
  setReportPeriod,
  reportMonth,
  setReportMonth,
  reportQuarter,
  setReportQuarter,
  reportQuarterYear,
  setReportQuarterYear,
  reportYear,
  setReportYear,
  reportFrom,
  setReportFrom,
  reportTo,
  setReportTo,
  reportStart,
  reportEnd,
  reportProfitCategory,
  reportCategorySupplierCost,
  reportCategoryClientBilling,
  reportCategoryProfit,
  reportCategoryRecordCount,
  reportProfitBreakdown,
  setReportProfitCategory,
  reportTrend,
  reportClientChart,
  reportRevenue,
  reportOutstanding,
  reportBills,
  reportTotalExpenses,
  reportExpenses,
  reportEmployeeExpenses,
  reportPayroll,
  outstanding,
}: ReportsViewProps) {
  const currentYear = Number(isoToday().slice(0, 4));
  const currentMonthStr = isoToday().slice(0, 7);

  return (
    <>
      <PageHead
        title="Business reports"
        detail="Revenue, outstanding, expenses, and profit by work category"
      />

      <div className="op-report-period">
        <div className="op-period-tabs">
          {(["Month", "Quarter", "Year", "Date range"] as const).map(
            (period) => (
              <button
                className={reportPeriod === period ? "active" : ""}
                onClick={() => setReportPeriod(period)}
                key={period}
              >
                {period}
              </button>
            ),
          )}
        </div>

        {/* Month Selector */}
        {reportPeriod === "Month" && (
          <div
            className="op-report-range"
            style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
          >
            <label className="op-field" style={{ width: "180px" }}>
              <span>Choose Month</span>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) =>
                  setReportMonth(e.target.value || currentMonthStr)
                }
              />
            </label>

            <div className="op-salary-tabs" style={{ margin: 0 }}>
              <button
                type="button"
                onClick={() => {
                  const [y, m] = reportMonth.split("-").map(Number);
                  const prev = new Date(y, m - 2, 1);
                  setReportMonth(
                    `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
                  );
                }}
              >
                ← Prev Month
              </button>
              <button
                type="button"
                className={reportMonth === currentMonthStr ? "active" : ""}
                onClick={() => setReportMonth(currentMonthStr)}
              >
                Current Month
              </button>
              <button
                type="button"
                onClick={() => {
                  const [y, m] = reportMonth.split("-").map(Number);
                  const next = new Date(y, m, 1);
                  setReportMonth(
                    `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
                  );
                }}
              >
                Next Month →
              </button>
            </div>

            <p style={{ marginLeft: "auto" }}>
              <CalendarDays size={17} />
              {new Date(`${reportStart}T00:00:00`).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}{" "}
              ({fmt(reportStart)} to {fmt(reportEnd)})
            </p>
          </div>
        )}

        {/* Quarter Selector */}
        {reportPeriod === "Quarter" && (
          <div
            className="op-report-range"
            style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
          >
            <label className="op-field" style={{ width: "130px" }}>
              <span>Year</span>
              <select
                value={reportQuarterYear}
                onChange={(e) => setReportQuarterYear(Number(e.target.value))}
              >
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="op-salary-tabs" style={{ margin: 0 }}>
              {[
                { q: 1, label: "Q1 (Jan – Mar)" },
                { q: 2, label: "Q2 (Apr – Jun)" },
                { q: 3, label: "Q3 (Jul – Sep)" },
                { q: 4, label: "Q4 (Oct – Dec)" },
              ].map(({ q, label }) => (
                <button
                  key={q}
                  type="button"
                  className={reportQuarter === q ? "active" : ""}
                  onClick={() => setReportQuarter(q)}
                >
                  {label}
                </button>
              ))}
            </div>

            <p style={{ marginLeft: "auto" }}>
              <CalendarDays size={17} />
              Q{reportQuarter} {reportQuarterYear} ({fmt(reportStart)} to{" "}
              {fmt(reportEnd)})
            </p>
          </div>
        )}

        {/* Year Selector */}
        {reportPeriod === "Year" && (
          <div
            className="op-report-range"
            style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
          >
            <label className="op-field" style={{ width: "130px" }}>
              <span>Choose Year</span>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
              >
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="op-salary-tabs" style={{ margin: 0 }}>
              <button
                type="button"
                onClick={() => setReportYear(reportYear - 1)}
              >
                ← {reportYear - 1}
              </button>
              <button
                type="button"
                className={reportYear === currentYear ? "active" : ""}
                onClick={() => setReportYear(currentYear)}
              >
                Current Year ({currentYear})
              </button>
              <button
                type="button"
                onClick={() => setReportYear(reportYear + 1)}
              >
                {reportYear + 1} →
              </button>
            </div>

            <p style={{ marginLeft: "auto" }}>
              <CalendarDays size={17} />
              Full Year {reportYear} ({fmt(reportStart)} to {fmt(reportEnd)})
            </p>
          </div>
        )}

        {/* Date Range Selector */}
        {reportPeriod === "Date range" && (
          <div
            className="op-report-range"
            style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
          >
            <label className="op-field" style={{ width: "160px" }}>
              <span>From</span>
              <input
                type="date"
                value={reportFrom}
                onChange={(event) => setReportFrom(event.target.value)}
              />
            </label>
            <span style={{ paddingBottom: "10px" }}>to</span>
            <label className="op-field" style={{ width: "160px" }}>
              <span>To</span>
              <input
                type="date"
                value={reportTo}
                onChange={(event) => setReportTo(event.target.value)}
              />
            </label>

            <div className="op-salary-tabs" style={{ margin: 0 }}>
              <button
                type="button"
                onClick={() => {
                  setReportFrom(addDays(isoToday(), -6));
                  setReportTo(isoToday());
                }}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportFrom(addDays(isoToday(), -29));
                  setReportTo(isoToday());
                }}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportFrom(`${currentMonthStr}-01`);
                  setReportTo(isoToday());
                }}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => {
                  const currM = Number(isoToday().slice(5, 7));
                  const fyStart = currM >= 4 ? currentYear : currentYear - 1;
                  setReportFrom(`${fyStart}-04-01`);
                  setReportTo(isoToday());
                }}
              >
                FY {Number(isoToday().slice(5, 7)) >= 4 ? `${currentYear}–${currentYear + 1}` : `${currentYear - 1}–${currentYear}`}
              </button>
            </div>

            <p style={{ marginLeft: "auto" }}>
              <CalendarDays size={17} />
              {fmt(reportStart)} to {fmt(reportEnd)}
            </p>
          </div>
        )}
      </div>
      <ReportProfitSection
        category={reportProfitCategory}
        supplierCost={reportCategorySupplierCost}
        clientBilling={reportCategoryClientBilling}
        profit={reportCategoryProfit}
        recordCount={reportCategoryRecordCount}
        breakdown={reportProfitBreakdown}
        select={setReportProfitCategory}
      />
      <section className="op-report-charts">
        <TrendGraph items={reportTrend} />
        <ClientDonut items={reportClientChart} />
      </section>
      <section className="op-metrics">
        <Metric
          label="Business in period"
          value={money(reportRevenue)}
          detail={`${fmt(reportStart)} to ${fmt(reportEnd)}`}
          icon={CircleDollarSign}
        />
        <Metric
          label="Outstanding in period"
          value={money(reportOutstanding)}
          detail={`${reportBills.filter((item) => billBalance(item) > 0).length} unpaid bills`}
          icon={WalletCards}
        />
        <Metric
          label="Total expenses in period"
          value={money(reportTotalExpenses)}
          detail={`${reportExpenses.length} business · ${reportEmployeeExpenses.length} employee · ${reportPayroll.length} payroll`}
          icon={ReceiptText}
        />
        <Metric
          label="All-time outstanding"
          value={money(outstanding)}
          detail="Across all clients"
          icon={BarChart3}
        />
      </section>
      <div className="op-dashboard-grid">
        <article className="op-panel">
          <h2>Outstanding by client</h2>
          {store.clients.map((client) => {
            const value = store.bills
              .filter((bill) => bill.clientId === client.id)
              .reduce((sum, bill) => sum + billBalance(bill), 0);
            return value > 0 ? (
              <p key={client.id}>
                <b>{client.firmName}</b>
                <span>{money(value)}</span>
              </p>
            ) : null;
          })}
        </article>
        <article className="op-panel">
          <h2>Expenses by account</h2>
          {[
            "Maintenance",
            "Printing",
            "Pasting",
            "Bond / banner material",
            "Self travel",
            "Miscellaneous",
          ].map((category) => (
            <p key={category}>
              <b>{category}</b>
              <span>
                {money(
                  reportExpenses
                    .filter((item) => item.category === category)
                    .reduce((sum, item) => sum + item.amount, 0),
                )}
              </span>
            </p>
          ))}
          <p>
            <b>Employee incidentals</b>
            <span>
              {money(
                reportEmployeeExpenses.reduce(
                  (sum, item) => sum + item.amount,
                  0,
                ),
              )}
            </span>
          </p>
          <p>
            <b>Payroll paid</b>
            <span>
              {money(
                reportPayroll.reduce((sum, item) => sum + item.net, 0),
              )}
            </span>
          </p>
        </article>
      </div>
    </>
  );
}