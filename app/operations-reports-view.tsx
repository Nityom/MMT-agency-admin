import {
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  FileText,
  IndianRupee,
  Printer,
  ReceiptText,
  Search,
  TrendingUp,
  UsersRound,
  WalletCards,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  addDays,
  type BusinessExpenseCategory,
  type ClientCategory,
  type FleetStore,
  getEmployeeCurrentStatus,
  rateOnDate,
} from "./fleet-domain";
import {
  ClientDonut,
  Metric,
  PageHead,
  ReportProfitSection,
  TrendGraph,
} from "./operations-reports";
import { Button, Row, Status, Table } from "./operations-components";
import { EmployeeRecordModal } from "./operations-records";
import { ClientLedgerModal } from "./operations-client-ledger";
import {
  billBalance,
  calcEmployeeSettlement,
  clientCategories,
  clientOverallBalance,
  fmt,
  isoToday,
  money,
  otherBillBalance,
  supplierBalance,
  supplierPaid,
  type ReportProfitCategory,
} from "./operations-utils";

type ReportPeriod = "Month" | "Quarter" | "Year" | "Date range";

const monthPresets = [
  { value: "all", label: "All Time" },
  { value: "2026-04", label: "April 2026" },
  { value: "2026-05", label: "May 2026" },
  { value: "2026-06", label: "June 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
];

const maintenanceCategories: { value: BusinessExpenseCategory | "All"; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Printing", label: "Banner Printing" },
  { value: "Pasting", label: "Pasting" },
  { value: "Recording", label: "Recording" },
  { value: "Purchase", label: "Purchase" },
  { value: "Labour charges", label: "Labour charges" },
  { value: "Maintenance", label: "Vehicle Maintenance" },
];

type ReportsViewProps = {
  store: FleetStore;
  initialTab?: "business" | "employees" | "clients" | "maintenance";
  onTabChange?: (tab: "business" | "employees" | "clients" | "maintenance") => void;
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
  reportPayroll?: FleetStore["payrollPayments"];
  outstanding: number;
};

export function ReportsView({
  store,
  initialTab = "business",
  onTabChange,
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
  outstanding,
}: ReportsViewProps) {
  const [activeReportTab, setActiveReportTab] = useState<"business" | "employees" | "clients" | "maintenance">(initialTab);
  
  useEffect(() => {
    setActiveReportTab(initialTab);
  }, [initialTab]);

  // Sync state if initialTab changes from parent
  const handleTabChange = (tab: "business" | "employees" | "clients" | "maintenance") => {
    setActiveReportTab(tab);
    onTabChange?.(tab);
  };
  const [employeeReportMonth, setEmployeeReportMonth] = useState<string>("all");
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [selectedEmployeeRecordId, setSelectedEmployeeRecordId] = useState<number | null>(null);

  const [clientReportMonth, setClientReportMonth] = useState<string>("all");
  const [clientSearch, setClientSearch] = useState<string>("");
  const [clientCategoryFilter, setClientCategoryFilter] = useState<ClientCategory | "All">("All");
  const [selectedClientLedgerId, setSelectedClientLedgerId] = useState<number | null>(null);

  const [maintenanceMonth, setMaintenanceMonth] = useState<string>("all");
  const [maintenanceSearch, setMaintenanceSearch] = useState<string>("");
  const [maintenanceCategoryFilter, setMaintenanceCategoryFilter] = useState<BusinessExpenseCategory | "All">("All");

  const currentYear = Number(isoToday().slice(0, 4));
  const currentMonthStr = isoToday().slice(0, 7);
  const reportAdvances = store.advances.filter((a) => a.date >= reportStart && a.date <= reportEnd);

  // -------------------------------------------------------------
  // Employee Report Computations (Supports All Time and Monthly)
  // -------------------------------------------------------------
  const isEmpAllTime = employeeReportMonth === "all";
  const [empY, empM] = isEmpAllTime ? [currentYear, 1] : employeeReportMonth.split("-").map(Number);
  const daysInEmpMonth = isEmpAllTime ? 30 : new Date(empY, empM, 0).getDate();
  const empMonthStart = isEmpAllTime ? "2020-01-01" : `${employeeReportMonth}-01`;
  const empMonthEnd = isEmpAllTime ? "2099-12-31" : `${employeeReportMonth}-${String(daysInEmpMonth).padStart(2, "0")}`;

  const employeeRows = store.employees.map((employee) => {
    const status = getEmployeeCurrentStatus(employee, isEmpAllTime ? isoToday() : empMonthEnd);
    const midMonthDate = isEmpAllTime ? isoToday() : `${employeeReportMonth}-15`;
    const rateInfo = rateOnDate(store.employeeRates, employee.id, midMonthDate) ?? store.employeeRates.find((r) => r.employeeId === employee.id);
    const dailyRate = rateInfo?.dailyRate ?? 0;
    const location = rateInfo?.location ?? "Unassigned";

    let presentDays = 0;
    if (isEmpAllTime) {
      for (const dateStr of Object.keys(store.attendance)) {
        if (store.attendance[dateStr]?.[employee.id] === true) {
          presentDays++;
        }
      }
    } else {
      for (let day = 1; day <= daysInEmpMonth; day++) {
        const dateStr = `${employeeReportMonth}-${String(day).padStart(2, "0")}`;
        if (store.attendance[dateStr]?.[employee.id] === true) {
          presentDays++;
        }
      }
    }

    const settlement = calcEmployeeSettlement(
      store,
      employee.id,
      isEmpAllTime ? undefined : empMonthStart,
      isEmpAllTime ? undefined : empMonthEnd
    );

    const grossEarned = settlement.periodEarned;
    const advancesInMonth = settlement.periodAdvances;
    const deductedFromAdvance = settlement.deductedFromAdvance;
    const carryForwardBalance = settlement.carryForwardBalance;

    return {
      employee,
      status,
      location,
      dailyRate,
      presentDays,
      daysInEmpMonth,
      grossEarned,
      advancesInMonth,
      deductedFromAdvance,
      carryForwardBalance,
    };
  });

  const filteredEmployeeRows = employeeRows.filter((row) => {
    if (!employeeSearch.trim()) return true;
    const q = employeeSearch.toLowerCase().trim();
    return (
      row.employee.name.toLowerCase().includes(q) ||
      row.location.toLowerCase().includes(q) ||
      row.status.toLowerCase().includes(q)
    );
  });

  const empTotalGross = employeeRows.reduce((sum, r) => sum + r.grossEarned, 0);
  const empTotalAdvancesInMonth = employeeRows.reduce((sum, r) => sum + r.advancesInMonth, 0);
  const empTotalDeducted = employeeRows.reduce((sum, r) => sum + r.deductedFromAdvance, 0);
  const empTotalCarryForward = employeeRows.reduce((sum, r) => sum + Math.max(0, r.carryForwardBalance), 0);
  const empTotalAttendanceDays = employeeRows.reduce((sum, r) => sum + r.presentDays, 0);

  // -------------------------------------------------------------
  // Client Report Computations (Supports All Time and Monthly)
  // -------------------------------------------------------------
  const isClientAllTime = clientReportMonth === "all";
  const [cY, cM] = isClientAllTime ? [currentYear, 1] : clientReportMonth.split("-").map(Number);
  const daysInClientMonth = isClientAllTime ? 30 : new Date(cY, cM, 0).getDate();
  const clientMonthStart = isClientAllTime ? "2020-01-01" : `${clientReportMonth}-01`;
  const clientMonthEnd = isClientAllTime ? "2099-12-31" : `${clientReportMonth}-${String(daysInClientMonth).padStart(2, "0")}`;

  const campaignClients = store.clients.filter((client) => {
    const targetName = client.firmName.toLowerCase().trim();
    const isBaba = targetName.includes("baba") && targetName.includes("son");
    const hasCampaign = store.campaignBookings.some(
      (b) =>
        b.clientId === client.id ||
        (b.client?.firmName && b.client.firmName.toLowerCase().trim() === targetName) ||
        (isBaba && (b.client?.firmName?.toLowerCase().includes("baba") ?? false))
    );
    const hasBill = store.bills.some(
      (b) =>
        b.clientId === client.id ||
        (b.client?.firmName && b.client.firmName.toLowerCase().trim() === targetName) ||
        (isBaba && (b.client?.firmName?.toLowerCase().includes("baba") ?? false))
    );
    const hasOtherBill = store.otherBills.some(
      (b) =>
        b.clientId === client.id ||
        (b.client?.firmName && b.client.firmName.toLowerCase().trim() === targetName) ||
        (isBaba && (b.client?.firmName?.toLowerCase().includes("baba") ?? false))
    );
    return hasCampaign || hasBill || hasOtherBill;
  });

  const allClientMetrics = campaignClients.map((client) => {
    const targetName = client.firmName.toLowerCase().trim();
    const isBaba = targetName.includes("baba") && targetName.includes("son");
    const overall = clientOverallBalance(store, client.id);

    const matchedCampaigns = store.campaignBookings.filter(
      (b) =>
        b.clientId === client.id ||
        (b.client?.firmName && b.client.firmName.toLowerCase().trim() === targetName) ||
        (isBaba && (b.client?.firmName?.toLowerCase().includes("baba") ?? false))
    );

    const matchedBills = store.bills.filter(
      (b) =>
        b.clientId === client.id ||
        (b.client?.firmName && b.client.firmName.toLowerCase().trim() === targetName) ||
        (isBaba && (b.client?.firmName?.toLowerCase().includes("baba") ?? false))
    );

    const matchedOtherBills = store.otherBills.filter(
      (b) =>
        b.clientId === client.id ||
        (b.client?.firmName && b.client.firmName.toLowerCase().trim() === targetName) ||
        (isBaba && (b.client?.firmName?.toLowerCase().includes("baba") ?? false))
    );

    const periodBills = isClientAllTime
      ? matchedBills
      : matchedBills.filter((b) => b.billDate >= clientMonthStart && b.billDate <= clientMonthEnd);

    const periodOtherBills = isClientAllTime
      ? matchedOtherBills
      : matchedOtherBills.filter((b) => b.billDate >= clientMonthStart && b.billDate <= clientMonthEnd);

    const periodBilled = periodBills.reduce((sum, b) => sum + b.total, 0) + periodOtherBills.reduce((sum, b) => sum + b.total, 0);
    const periodReceived = periodBills.reduce((sum, b) => sum + (b.total - billBalance(b)), 0) + periodOtherBills.reduce((sum, b) => sum + (b.total - otherBillBalance(b)), 0);
    const periodBalance = periodBilled - periodReceived;

    return {
      client,
      overall: isClientAllTime ? overall : { billed: periodBilled, received: periodReceived, outstanding: Math.max(0, periodBalance), balance: periodBalance },
      campaignsCount: matchedCampaigns.length,
      invoicesCount: isClientAllTime ? matchedBills.length + matchedOtherBills.length : periodBills.length + periodOtherBills.length,
    };
  });

  const clientTotalBilled = allClientMetrics.reduce((sum, c) => sum + c.overall.billed, 0);
  const clientTotalReceived = allClientMetrics.reduce((sum, c) => sum + c.overall.received, 0);
  const clientTotalOutstanding = allClientMetrics.reduce((sum, c) => sum + c.overall.outstanding, 0);
  const clientTotalActiveCampaigns = store.campaignBookings.filter(
    (b) => !b.stoppedAt && isoToday() >= b.startDate && isoToday() <= (b.endDate || b.startDate)
  ).length;

  const filteredClientMetrics = allClientMetrics.filter((item) => {
    if (clientCategoryFilter !== "All" && !item.client.categories.includes(clientCategoryFilter)) {
      return false;
    }
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase().trim();
    return (
      item.client.firmName.toLowerCase().includes(q) ||
      (item.client.ownerName || "").toLowerCase().includes(q) ||
      item.client.mobile.includes(q) ||
      (item.client.email || "").toLowerCase().includes(q)
    );
  });

  // -------------------------------------------------------------
  // Maintenance Report Computations (Supports All Time and Monthly)
  // -------------------------------------------------------------
  const isMaintAllTime = maintenanceMonth === "all";
  const [maintY, maintM] = isMaintAllTime ? [currentYear, 1] : maintenanceMonth.split("-").map(Number);
  const daysInMaintMonth = isMaintAllTime ? 30 : new Date(maintY, maintM, 0).getDate();
  const maintMonthStart = isMaintAllTime ? "2020-01-01" : `${maintenanceMonth}-01`;
  const maintMonthEnd = isMaintAllTime ? "2099-12-31" : `${maintenanceMonth}-${String(daysInMaintMonth).padStart(2, "0")}`;

  const allMaintenanceExpenses = store.businessExpenses.filter((expense) => {
    // Check date range if not all time
    if (!isMaintAllTime && (expense.date < maintMonthStart || expense.date > maintMonthEnd)) return false;
    // Check category filter
    if (maintenanceCategoryFilter !== "All" && expense.category !== maintenanceCategoryFilter) return false;
    // Check search query
    if (!maintenanceSearch.trim()) return true;
    const q = maintenanceSearch.toLowerCase().trim();
    return (
      (expense.paidTo || "").toLowerCase().includes(q) ||
      expense.description.toLowerCase().includes(q) ||
      (expense.clientName || "").toLowerCase().includes(q) ||
      (expense.reference || "").toLowerCase().includes(q) ||
      expense.category.toLowerCase().includes(q)
    );
  });

  const maintTotalBilled = allMaintenanceExpenses.reduce((sum, e) => sum + e.amount, 0);
  const maintTotalPaid = allMaintenanceExpenses.reduce((sum, e) => sum + supplierPaid(e), 0);
  const maintTotalBalance = allMaintenanceExpenses.reduce((sum, e) => sum + supplierBalance(e), 0);

  return (
    <>
      <PageHead
        title={
          activeReportTab === "employees"
            ? "Employee reports"
            : activeReportTab === "clients"
            ? "Client reports"
            : activeReportTab === "maintenance"
            ? "Maintenance reports"
            : "Business reports"
        }
        detail={
          activeReportTab === "employees"
            ? "Workforce attendance, salary earnings, advance recovery, and net payout by month"
            : activeReportTab === "clients"
            ? "Campaign billing, collections received, and outstanding receivables by client"
            : activeReportTab === "maintenance"
            ? "Supplier work, vendor expenses, repairs, payment history, and payable balances"
            : "Revenue, outstanding, expenses, and profit by work category"
        }
      />

      {/* ========================================================================= */}
      {/* 1. BUSINESS REPORT TAB                                                    */}
      {/* ========================================================================= */}
      {activeReportTab === "business" && (
        <>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", marginBottom: "6px" }}>
                  {monthPresets.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`op-button ${reportMonth === m.value ? "" : "secondary"}`}
                      style={{
                        padding: "5px 12px",
                        fontSize: "12px",
                        borderRadius: "20px",
                        fontWeight: 600,
                        backgroundColor: reportMonth === m.value ? "#2b765f" : "#ffffff",
                        color: reportMonth === m.value ? "#ffffff" : "#32443e",
                        border: reportMonth === m.value ? "1px solid #2b765f" : "1px solid #dce4df",
                      }}
                      onClick={() => setReportMonth(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <label className="op-field" style={{ width: "170px" }}>
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

          <section className="op-section-title">
            <h2>Overall Period Financial Summary</h2>
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
              detail={`${reportExpenses.length} business · ${reportEmployeeExpenses.length} employee · ${reportAdvances.length} advances`}
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
                const value = clientOverallBalance(store, client.id).outstanding;
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
                <b>Workforce attendance & wages</b>
                <span>
                  {money(
                    store.employees.reduce((total, employee) => {
                      let earned = 0;
                      let curr = reportStart;
                      while (curr <= reportEnd) {
                        if (store.attendance[curr]?.[employee.id] === true) {
                          const [y, m] = curr.split("-").map(Number);
                          const daysInMonth = new Date(y, m, 0).getDate();
                          const rateInfo = rateOnDate(store.employeeRates, employee.id, curr) ?? store.employeeRates.find((r) => r.employeeId === employee.id);
                          const dailyRate = rateInfo?.dailyRate ?? 0;
                          const monthlyDailyBase = employee.monthlySalary > 0 ? Math.round(employee.monthlySalary / daysInMonth) : 0;
                          earned += (dailyRate + monthlyDailyBase);
                        }
                        curr = addDays(curr, 1);
                      }
                      return total + earned;
                    }, 0)
                  )}
                </span>
              </p>
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
                <b>Advances issued</b>
                <span>
                  {money(reportAdvances.reduce((sum, item) => sum + item.amount, 0))}
                </span>
              </p>
            </article>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. EMPLOYEE REPORT TAB                                                    */}
      {/* ========================================================================= */}
      {activeReportTab === "employees" && (
        <>
          <div className="op-report-period">
            <div
              className="op-report-range"
              style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
            >
              {/* Quick Month Filter Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", marginBottom: "6px" }}>
                {monthPresets.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`op-button ${employeeReportMonth === m.value ? "" : "secondary"}`}
                    style={{
                      padding: "5px 12px",
                      fontSize: "12px",
                      borderRadius: "20px",
                      fontWeight: 600,
                      backgroundColor: employeeReportMonth === m.value ? "#2b765f" : "#ffffff",
                      color: employeeReportMonth === m.value ? "#ffffff" : "#32443e",
                      border: employeeReportMonth === m.value ? "1px solid #2b765f" : "1px solid #dce4df",
                    }}
                    onClick={() => setEmployeeReportMonth(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <label className="op-field" style={{ width: "170px" }}>
                <span>Select Month</span>
                <input
                  type="month"
                  value={employeeReportMonth === "all" ? "" : employeeReportMonth}
                  onChange={(e) => setEmployeeReportMonth(e.target.value || "all")}
                />
              </label>

              <div className="op-salary-tabs" style={{ margin: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    const baseMonth = employeeReportMonth === "all" ? currentMonthStr : employeeReportMonth;
                    const [y, m] = baseMonth.split("-").map(Number);
                    const prev = new Date(y, m - 2, 1);
                    setEmployeeReportMonth(
                      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                >
                  ← Prev Month
                </button>
                <button
                  type="button"
                  className={employeeReportMonth === currentMonthStr ? "active" : ""}
                  onClick={() => setEmployeeReportMonth(currentMonthStr)}
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const baseMonth = employeeReportMonth === "all" ? currentMonthStr : employeeReportMonth;
                    const [y, m] = baseMonth.split("-").map(Number);
                    const next = new Date(y, m, 1);
                    setEmployeeReportMonth(
                      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                >
                  Next Month →
                </button>
              </div>

              <p style={{ marginLeft: "auto" }}>
                <CalendarDays size={17} />
                {isEmpAllTime
                  ? "All Time Records"
                  : `${new Date(`${empMonthStart}T00:00:00`).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })} (${fmt(empMonthStart)} to ${fmt(empMonthEnd)})`}
              </p>
            </div>
          </div>

          {/* Workforce Summary KPIs for Selected Period */}
          <section className="op-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <Metric
              label={isEmpAllTime ? "All-Time Workforce Earned" : "Workforce Gross Earned"}
              value={money(empTotalGross)}
              detail={`${empTotalAttendanceDays} present days across staff`}
              icon={CircleDollarSign}
            />
            <Metric
              label={isEmpAllTime ? "All-Time Advances Issued" : "Advances in Month"}
              value={money(empTotalAdvancesInMonth)}
              detail={isEmpAllTime ? "Total lifetime advances issued" : "Total advances taken in period"}
              icon={WalletCards}
            />
            <Metric
              label={isEmpAllTime ? "All-Time Advances Settled" : "Deducted from Advances"}
              value={money(empTotalDeducted)}
              detail="Settled against salary earnings"
              icon={Check}
            />
            <Metric
              label={isEmpAllTime ? "All-Time Net Salary Due" : "Net Salary Due"}
              value={money(empTotalCarryForward)}
              detail="Carry forward balance due"
              icon={TrendingUp}
            />
          </section>

          {/* Search Toolbar */}
          <div className="op-toolbar" style={{ marginTop: "18px" }}>
            <label className="op-search">
              <Search />
              <input
                placeholder="Search employee by name, location, or status"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </label>
            <p>
              Showing <b>{filteredEmployeeRows.length}</b> of <b>{employeeRows.length}</b> employees ({isEmpAllTime ? "All Time" : employeeReportMonth})
            </p>
          </div>

          {/* Employee Monthly Payroll Table */}
          {filteredEmployeeRows.length ? (
            <Table
              headers={[
                "Employee",
                "Location & Rate",
                isEmpAllTime ? "Total Attendance" : "Month Attendance",
                "Salary Earned",
                "Advance Paid",
                "Deducted",
                "Balance Due / Carry",
                "Status",
                "",
              ]}
            >
              {filteredEmployeeRows.map((row) => (
                <Row key={row.employee.id}>
                  <b>
                    <button
                      type="button"
                      className="op-link-button"
                      style={{ textDecoration: "none", fontWeight: 700, color: "#14493a", textAlign: "left" }}
                      onClick={() => setSelectedEmployeeRecordId(row.employee.id)}
                    >
                      {row.employee.name}
                    </button>
                    <small>ID #{row.employee.id} {row.employee.monthlySalary > 0 ? `· Base ${money(row.employee.monthlySalary)}` : ""}</small>
                  </b>
                  <span>
                    <b>{row.location}</b>
                    <small>{money(row.dailyRate)}/day</small>
                  </span>
                  <span>
                    <b>{row.presentDays} {isEmpAllTime ? "days present" : `/ ${row.daysInEmpMonth} days`}</b>
                    <small>{row.presentDays > 0 ? `${row.presentDays}d × ${money(row.dailyRate)}` : "No attendance"}</small>
                  </span>
                  <strong style={{ color: "#1f6a53" }}>
                    {money(row.grossEarned)}
                  </strong>
                  <span style={{ color: row.advancesInMonth > 0 ? "#9a493d" : "#556760" }}>
                    <b>{money(row.advancesInMonth)}</b>
                  </span>
                  <span style={{ color: row.deductedFromAdvance > 0 ? "#1f6a53" : "#74817d" }}>
                    <b>{money(row.deductedFromAdvance)}</b>
                  </span>
                  <span>
                    <b style={{ color: row.carryForwardBalance >= 0 ? "#14493a" : "#9a493d", fontSize: "14px" }}>
                      {row.carryForwardBalance >= 0 ? "+" : "−"}{money(Math.abs(row.carryForwardBalance))}
                    </b>
                    <small>{row.carryForwardBalance >= 0 ? "Salary Due" : "Advance Due"}</small>
                  </span>
                  <Status>{row.status}</Status>
                  <Button secondary onClick={() => setSelectedEmployeeRecordId(row.employee.id)}>
                    <FileText size={15} />
                    View record
                  </Button>
                </Row>
              ))}
            </Table>
          ) : (
            <div className="op-empty-state">
              <UsersRound />
              <h2>No employees found</h2>
              <p>Try searching for a different name or clear the search filter.</p>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. CLIENT REPORT TAB                                                      */}
      {/* ========================================================================= */}
      {activeReportTab === "clients" && (
        <>
          {/* Period & Month Selector for Client Report */}
          <div className="op-report-period">
            <div
              className="op-report-range"
              style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
            >
              {/* Quick Month Filter Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", marginBottom: "6px" }}>
                {monthPresets.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`op-button ${clientReportMonth === m.value ? "" : "secondary"}`}
                    style={{
                      padding: "5px 12px",
                      fontSize: "12px",
                      borderRadius: "20px",
                      fontWeight: 600,
                      backgroundColor: clientReportMonth === m.value ? "#2b765f" : "#ffffff",
                      color: clientReportMonth === m.value ? "#ffffff" : "#32443e",
                      border: clientReportMonth === m.value ? "1px solid #2b765f" : "1px solid #dce4df",
                    }}
                    onClick={() => setClientReportMonth(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <label className="op-field" style={{ width: "170px" }}>
                <span>Select Month</span>
                <input
                  type="month"
                  value={clientReportMonth === "all" ? "" : clientReportMonth}
                  onChange={(e) => setClientReportMonth(e.target.value || "all")}
                />
              </label>

              <div className="op-salary-tabs" style={{ margin: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    const baseMonth = clientReportMonth === "all" ? currentMonthStr : clientReportMonth;
                    const [y, m] = baseMonth.split("-").map(Number);
                    const prev = new Date(y, m - 2, 1);
                    setClientReportMonth(
                      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                >
                  ← Prev Month
                </button>
                <button
                  type="button"
                  className={clientReportMonth === currentMonthStr ? "active" : ""}
                  onClick={() => setClientReportMonth(currentMonthStr)}
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const baseMonth = clientReportMonth === "all" ? currentMonthStr : clientReportMonth;
                    const [y, m] = baseMonth.split("-").map(Number);
                    const next = new Date(y, m, 1);
                    setClientReportMonth(
                      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                >
                  Next Month →
                </button>
              </div>

              <p style={{ marginLeft: "auto" }}>
                <CalendarDays size={17} />
                {isClientAllTime
                  ? "All Time Records"
                  : `${new Date(`${clientMonthStart}T00:00:00`).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })} (${fmt(clientMonthStart)} to ${fmt(clientMonthEnd)})`}
              </p>
            </div>
          </div>

          {/* Summary KPIs */}
          <section className="op-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <Metric
              label={isClientAllTime ? "Total Client Billed (All Time)" : "Total Client Billed"}
              value={money(clientTotalBilled)}
              detail={isClientAllTime ? "Lifetime total across all invoices & vouchers" : "Total billed in selected period"}
              icon={CircleDollarSign}
            />
            <Metric
              label={isClientAllTime ? "Total Collections Received" : "Collections in Period"}
              value={money(clientTotalReceived)}
              detail="Total advances and installments received"
              icon={Check}
            />
            <Metric
              label={isClientAllTime ? "Total Outstanding Receivables" : "Outstanding Balance"}
              value={money(clientTotalOutstanding)}
              detail="Pending collection balance"
              icon={WalletCards}
            />
            <Metric
              label="Active Campaigns"
              value={String(clientTotalActiveCampaigns)}
              detail="Currently running campaigns"
              icon={Building2}
            />
          </section>

          {/* Category Filter Pills */}
          <div className="op-category-filter" style={{ marginTop: "18px" }}>
            {(["All", ...clientCategories] as (ClientCategory | "All")[]).map((category) => (
              <button
                className={clientCategoryFilter === category ? "active" : ""}
                onClick={() => setClientCategoryFilter(category)}
                key={category}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Toolbar */}
          <div className="op-toolbar">
            <label className="op-search">
              <Search />
              <input
                placeholder="Search client firm name, contact person, or phone"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </label>
            <p>
              Showing <b>{filteredClientMetrics.length}</b> of <b>{allClientMetrics.length}</b> campaign clients
            </p>
          </div>

          {/* Client Financial Accounts Table */}
          {filteredClientMetrics.length ? (
            <Table
              headers={[
                "Client / Firm",
                "Contact Details",
                "Campaigns",
                "Invoices",
                "Total Billed",
                "Received",
                "Outstanding Balance",
                "",
              ]}
            >
              {filteredClientMetrics.map((item) => (
                <Row key={item.client.id}>
                  <b>
                    <button
                      type="button"
                      className="op-link-button"
                      style={{ textDecoration: "none", fontWeight: 700, color: "#14493a", textAlign: "left" }}
                      onClick={() => setSelectedClientLedgerId(item.client.id)}
                    >
                      {item.client.firmName}
                    </button>
                    <small>{item.client.ownerName ? `${item.client.ownerName} · ` : ""}{item.client.address || "Wardha"}</small>
                  </b>
                  <span>
                    <b>{item.client.mobile || "No mobile"}</b>
                    <small>{item.client.email || "No email"}</small>
                  </span>
                  <span>
                    <b>{item.campaignsCount}</b>
                    <small>{item.campaignsCount === 1 ? "booking" : "bookings"}</small>
                  </span>
                  <span>
                    <b>{item.invoicesCount}</b>
                    <small>{item.invoicesCount === 1 ? "bill" : "bills"}</small>
                  </span>
                  <strong>{money(item.overall.billed)}</strong>
                  <span style={{ color: "#1f6a53" }}>
                    <b>{money(item.overall.received)}</b>
                  </span>
                  <span>
                    <b style={{ color: item.overall.outstanding > 0 ? "#9a493d" : "#1f6a53", fontSize: "14px" }}>
                      {money(item.overall.balance)}
                    </b>
                    <small style={{ color: item.overall.outstanding > 0 ? "#9a493d" : "#1f6a53" }}>
                      {item.overall.outstanding > 0 ? "Outstanding" : "Settled"}
                    </small>
                  </span>
                  <Button secondary onClick={() => setSelectedClientLedgerId(item.client.id)}>
                    <ReceiptText size={15} />
                    Open ledger
                  </Button>
                </Row>
              ))}
            </Table>
          ) : (
            <div className="op-empty-state">
              <ReceiptText />
              <h2>No campaign clients found</h2>
              <p>Try refining your search name or selecting another category.</p>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. MAINTENANCE REPORT TAB                                                 */}
      {/* ========================================================================= */}
      {activeReportTab === "maintenance" && (
        <>
          {/* Month Selector for Maintenance */}
          <div className="op-report-period">
            <div
              className="op-report-range"
              style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
            >
              {/* Quick Month Filter Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", marginBottom: "6px" }}>
                {monthPresets.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`op-button ${maintenanceMonth === m.value ? "" : "secondary"}`}
                    style={{
                      padding: "5px 12px",
                      fontSize: "12px",
                      borderRadius: "20px",
                      fontWeight: 600,
                      backgroundColor: maintenanceMonth === m.value ? "#2b765f" : "#ffffff",
                      color: maintenanceMonth === m.value ? "#ffffff" : "#32443e",
                      border: maintenanceMonth === m.value ? "1px solid #2b765f" : "1px solid #dce4df",
                    }}
                    onClick={() => setMaintenanceMonth(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <label className="op-field" style={{ width: "170px" }}>
                <span>Select Month</span>
                <input
                  type="month"
                  value={maintenanceMonth === "all" ? "" : maintenanceMonth}
                  onChange={(e) => setMaintenanceMonth(e.target.value || "all")}
                />
              </label>

              <div className="op-salary-tabs" style={{ margin: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    const baseMonth = maintenanceMonth === "all" ? currentMonthStr : maintenanceMonth;
                    const [y, m] = baseMonth.split("-").map(Number);
                    const prev = new Date(y, m - 2, 1);
                    setMaintenanceMonth(
                      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                >
                  ← Prev Month
                </button>
                <button
                  type="button"
                  className={maintenanceMonth === currentMonthStr ? "active" : ""}
                  onClick={() => setMaintenanceMonth(currentMonthStr)}
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const baseMonth = maintenanceMonth === "all" ? currentMonthStr : maintenanceMonth;
                    const [y, m] = baseMonth.split("-").map(Number);
                    const next = new Date(y, m, 1);
                    setMaintenanceMonth(
                      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                >
                  Next Month →
                </button>
              </div>

              <p style={{ marginLeft: "auto" }}>
                <CalendarDays size={17} />
                {isMaintAllTime
                  ? "All Time Records"
                  : `${new Date(`${maintMonthStart}T00:00:00`).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })} (${fmt(maintMonthStart)} to ${fmt(maintMonthEnd)})`}
              </p>
            </div>
          </div>

          {/* Summary KPIs */}
          <section className="op-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <Metric
              label="Supplier Work Bills"
              value={money(maintTotalBilled)}
              detail={`${allMaintenanceExpenses.length} maintenance records in period`}
              icon={ReceiptText}
            />
            <Metric
              label="Supplier Payments Made"
              value={money(maintTotalPaid)}
              detail="Opening and installment payments recorded"
              icon={Check}
            />
            <Metric
              label="Outstanding Payable"
              value={money(maintTotalBalance)}
              detail="Remaining supplier balance to clear"
              icon={WalletCards}
            />
            <Metric
              label="Work Records"
              value={String(allMaintenanceExpenses.length)}
              detail="Total maintenance entries"
              icon={Wrench}
            />
          </section>

          {/* Category Filter Pills */}
          <div className="op-category-filter" style={{ marginTop: "18px" }}>
            {maintenanceCategories.map((category) => (
              <button
                className={maintenanceCategoryFilter === category.value ? "active" : ""}
                onClick={() => setMaintenanceCategoryFilter(category.value)}
                key={category.value}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Search Toolbar */}
          <div className="op-toolbar">
            <label className="op-search">
              <Search />
              <input
                placeholder="Search by supplier name, work description, or client..."
                value={maintenanceSearch}
                onChange={(e) => setMaintenanceSearch(e.target.value)}
              />
            </label>
            <p>
              Showing <b>{allMaintenanceExpenses.length}</b> records
            </p>
          </div>

          {/* Maintenance Records Table */}
          {allMaintenanceExpenses.length ? (
            <Table
              headers={[
                "Date",
                "Supplier / Worker",
                "Work / Item",
                "Category",
                "Client / Reference",
                "Bill",
                "Paid",
                "Balance",
              ]}
            >
              {[...allMaintenanceExpenses]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((expense) => {
                  const paid = supplierPaid(expense);
                  const balance = supplierBalance(expense);
                  return (
                    <Row key={expense.id}>
                      <span>{fmt(expense.date)}</span>
                      <b>
                        {expense.paidTo || "Unassigned Supplier"}
                        <small>{expense.reference || "No reference"}</small>
                      </b>
                      <span>
                        <b>{expense.description}</b>
                        {expense.purpose && <small>{expense.purpose}</small>}
                      </span>
                      <span>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            backgroundColor: "#edf4f1",
                            color: "#185b47",
                          }}
                        >
                          {expense.category === "Printing" ? "Banner Printing" : expense.category}
                        </span>
                      </span>
                      <span>
                        <b>{expense.clientName || "Internal Agency"}</b>
                      </span>
                      <strong>{money(expense.amount)}</strong>
                      <span style={{ color: "#1f6a53" }}>
                        <b>{money(paid)}</b>
                      </span>
                      <span>
                        <b style={{ color: balance > 0 ? "#9a493d" : "#1f6a53" }}>
                          {money(balance)}
                        </b>
                        <small style={{ color: balance > 0 ? "#9a493d" : "#1f6a53" }}>
                          {balance > 0 ? "Payable" : "Cleared"}
                        </small>
                      </span>
                    </Row>
                  );
                })}
            </Table>
          ) : (
            <div className="op-empty-state">
              <Wrench />
              <h2>No maintenance records found</h2>
              <p>Try refining your search query or selecting a different month/category.</p>
            </div>
          )}
        </>
      )}

      {/* Record & Ledger Modals */}
      {selectedEmployeeRecordId && (
        <EmployeeRecordModal
          store={store}
          employeeId={selectedEmployeeRecordId}
          close={() => setSelectedEmployeeRecordId(null)}
        />
      )}

      {selectedClientLedgerId && (
        <ClientLedgerModal
          store={store}
          clientId={selectedClientLedgerId}
          close={() => setSelectedClientLedgerId(null)}
        />
      )}
    </>
  );
}