"use client";

import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import type { FleetStore } from "./fleet-domain";
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
  money,
  type ReportProfitCategory,
} from "./operations-utils";

type ReportPeriod = "Month" | "Quarter" | "Year" | "Date range";

type ReportsViewProps = {
  store: FleetStore;
  reportPeriod: ReportPeriod;
  setReportPeriod: (period: ReportPeriod) => void;
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
        {reportPeriod === "Date range" && (
          <div className="op-report-range">
            <label className="op-field">
              <span>From</span>
              <input
                type="date"
                value={reportFrom}
                onChange={(event) => setReportFrom(event.target.value)}
              />
            </label>
            <span>to</span>
            <label className="op-field">
              <span>To</span>
              <input
                type="date"
                value={reportTo}
                onChange={(event) => setReportTo(event.target.value)}
              />
            </label>
            <p>
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