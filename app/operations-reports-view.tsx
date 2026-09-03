import Image from "next/image";
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
  X,
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
  billPaid,
  calcEmployeeSettlement,
  clientCategories,
  clientOverallBalance,
  fmt,
  isoToday,
  money,
  otherBillBalance,
  otherBillPaid,
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

export function OutstandingBillsPrintModal({
  store,
  periodLabel,
  bills,
  totalBilled,
  totalReceived,
  totalOutstanding,
  close,
}: {
  store: FleetStore;
  periodLabel: string;
  bills: {
    key: string;
    id: number;
    billType: string;
    number: string;
    date: string;
    clientId: number;
    firmName: string;
    ownerName: string;
    phone: string;
    categories: string[];
    total: number;
    paid: number;
    balance: number;
    status: string;
  }[];
  totalBilled: number;
  totalReceived: number;
  totalOutstanding: number;
  close: () => void;
}) {
  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog op-plain-ledger-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print Outstanding List / PDF
          </Button>
        </div>
        <article className="invoice-sheet op-client-statement-sheet">
          <header className="invoice-brand">
            <ReceiptText size={30} />
            <h2>{store.company.name}</h2>
          </header>
          <h1>CLIENT OUTSTANDING BILLS & RECEIVABLES STATEMENT</h1>
          <section className="invoice-company">
            <p>{store.company.address}</p>
            <p>
              Mobile: {store.company.mobile} | Email: {store.company.email}
            </p>
          </section>
          <section className="invoice-meta">
            <p>
              <b>Statement Period</b>
              <br />
              {periodLabel}
            </p>
            <p>
              <b>Report Generated</b>
              <br />
              {fmt(isoToday())}
            </p>
            <p className="invoice-bill-to">
              <b>Summary Scope</b>
              <br />
              <strong>{bills.length} Outstanding Bill{bills.length === 1 ? "" : "s"}</strong>
              <br />
              <span>Pending Receivables across all client accounts</span>
            </p>
          </section>

          {/* Financial Summary */}
          <section className="op-client-print-summary" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <p>
              <span>Total Invoice Amount</span>
              <strong>{money(totalBilled)}</strong>
            </p>
            <p>
              <span>Total Collections</span>
              <strong>{money(totalReceived)}</strong>
            </p>
            <p>
              <span>Net Outstanding Balance</span>
              <strong style={{ color: "#9a493d" }}>
                {money(totalOutstanding)}
              </strong>
            </p>
          </section>

          <h2 className="op-print-section-title">Itemized Client Outstanding Bills</h2>
          <table className="invoice-expenses op-client-print-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>Bill Date</th>
                <th>Client / Firm Name</th>
                <th>Contact Person</th>
                <th>Phone Number</th>
                <th>Bill / Invoice #</th>
                <th>Total Billed</th>
                <th>Received</th>
                <th>Outstanding Due</th>
              </tr>
            </thead>
            <tbody>
              {bills.length ? (
                bills.map((item, index) => (
                  <tr key={item.key}>
                    <td>{index + 1}</td>
                    <td>{fmt(item.date)}</td>
                    <td><b>{item.firmName}</b></td>
                    <td>{item.ownerName || "—"}</td>
                    <td>{item.phone || "—"}</td>
                    <td>
                      <b>{item.number}</b>
                      <br />
                      <small style={{ color: "#555" }}>{item.billType}</small>
                    </td>
                    <td>{money(item.total)}</td>
                    <td>{money(item.paid)}</td>
                    <td style={{ color: "#9a493d", fontWeight: 700 }}>{money(item.balance)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "20px" }}>
                    No outstanding bills in the selected period
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8faf9", fontWeight: 700 }}>
                <td colSpan={6} style={{ textAlign: "right", padding: "10px" }}>
                  Total Pending Receivables ({bills.length} bills):
                </td>
                <td>{money(totalBilled)}</td>
                <td>{money(totalReceived)}</td>
                <td style={{ color: "#9a493d", fontSize: "15px" }}>{money(totalOutstanding)}</td>
              </tr>
            </tfoot>
          </table>

          <section className="op-invoice-total">
            <p>
              <span>Total Outstanding Amount to Collect</span>
              <strong style={{ color: "#9a493d" }}>
                {money(totalOutstanding)}
              </strong>
            </p>
          </section>

          <footer className="invoice-footer">
            <div>
              <h3>Bank details for RTGS / NEFT</h3>
              <p><b>Account:</b> {store.company.accountName}</p>
              <p><b>Bank:</b> {store.company.bankName} · {store.company.branch}</p>
              <p><b>A/C No:</b> {store.company.accountNumber || "Update in company settings"}</p>
              <p><b>IFSC:</b> {store.company.ifsc || "Update in company settings"}</p>
            </div>
            <div className="invoice-signature">
              <p>For {store.company.name}</p>
              <Image
                className="invoice-signature-mark"
                src="/sign.png"
                alt="Authorized Signatory"
                width={700}
                height={278}
              />
              <b>Authorized Signatory</b>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

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
  const currentYear = Number(isoToday().slice(0, 4));
  const currentMonthStr = isoToday().slice(0, 7);

  // Helper for computing start, end, isAllTime, label
  const computeReportRange = (
    period: "Month" | "Quarter" | "Year" | "Date range" | "All time",
    monthVal: string,
    quarter: number,
    quarterYear: number,
    yearVal: number,
    fromVal: string,
    toVal: string
  ) => {
    if (period === "All time" || monthVal === "all") {
      return { start: "2020-01-01", end: "2099-12-31", isAllTime: true, label: "All Time Records" };
    }
    if (period === "Month") {
      const [y, m] = monthVal.split("-").map(Number);
      const daysInM = new Date(y, m, 0).getDate();
      const start = `${monthVal}-01`;
      const end = `${monthVal}-${String(daysInM).padStart(2, "0")}`;
      const label = `${new Date(`${start}T00:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })} (${fmt(start)} to ${fmt(end)})`;
      return { start, end, isAllTime: false, label };
    }
    if (period === "Quarter") {
      const startM = (quarter - 1) * 3 + 1;
      const endM = quarter * 3;
      const endDay = new Date(quarterYear, endM, 0).getDate();
      const start = `${quarterYear}-${String(startM).padStart(2, "0")}-01`;
      const end = `${quarterYear}-${String(endM).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      const label = `Q${quarter} ${quarterYear} (${fmt(start)} to ${fmt(end)})`;
      return { start, end, isAllTime: false, label };
    }
    if (period === "Year") {
      const start = `${yearVal}-01-01`;
      const end = `${yearVal}-12-31`;
      const label = `Full Year ${yearVal} (${fmt(start)} to ${fmt(end)})`;
      return { start, end, isAllTime: false, label };
    }
    // Date range
    const start = fromVal || "2020-01-01";
    const end = toVal || "2099-12-31";
    const isAllTime = !fromVal && !toVal;
    const label = isAllTime ? "All Time Records" : `${fmt(start)} to ${fmt(end)}`;
    return { start, end, isAllTime, label };
  };

  // Employee Report Period State
  const [employeeReportPeriod, setEmployeeReportPeriod] = useState<"Month" | "Quarter" | "Year" | "Date range" | "All time">("Month");
  const [employeeReportMonth, setEmployeeReportMonth] = useState<string>(currentMonthStr);
  const [employeeReportQuarter, setEmployeeReportQuarter] = useState<number>(Math.floor(Number(isoToday().slice(5, 7)) / 3.1) + 1);
  const [employeeReportQuarterYear, setEmployeeReportQuarterYear] = useState<number>(currentYear);
  const [employeeReportYear, setEmployeeReportYear] = useState<number>(currentYear);
  const [employeeReportFrom, setEmployeeReportFrom] = useState<string>(`${currentMonthStr}-01`);
  const [employeeReportTo, setEmployeeReportTo] = useState<string>(isoToday());
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [selectedEmployeeRecordId, setSelectedEmployeeRecordId] = useState<number | null>(null);

  // Client Report Period State
  const [clientReportPeriod, setClientReportPeriod] = useState<"Month" | "Quarter" | "Year" | "Date range" | "All time">("Month");
  const [clientReportMonth, setClientReportMonth] = useState<string>(currentMonthStr);
  const [clientReportQuarter, setClientReportQuarter] = useState<number>(Math.floor(Number(isoToday().slice(5, 7)) / 3.1) + 1);
  const [clientReportQuarterYear, setClientReportQuarterYear] = useState<number>(currentYear);
  const [clientReportYear, setClientReportYear] = useState<number>(currentYear);
  const [clientReportFrom, setClientReportFrom] = useState<string>(`${currentMonthStr}-01`);
  const [clientReportTo, setClientReportTo] = useState<string>(isoToday());
  const [clientSearch, setClientSearch] = useState<string>("");
  const [clientCategoryFilter, setClientCategoryFilter] = useState<ClientCategory | "All">("All");
  const [clientReportSubTab, setClientReportSubTab] = useState<"accounts" | "outstandingBills">("accounts");
  const [outstandingBillsPrintOpen, setOutstandingBillsPrintOpen] = useState(false);
  const [selectedClientLedgerId, setSelectedClientLedgerId] = useState<number | null>(null);

  // Maintenance Report Period State
  const [maintenanceReportPeriod, setMaintenanceReportPeriod] = useState<"Month" | "Quarter" | "Year" | "Date range" | "All time">("Month");
  const [maintenanceMonth, setMaintenanceMonth] = useState<string>(currentMonthStr);
  const [maintenanceQuarter, setMaintenanceQuarter] = useState<number>(Math.floor(Number(isoToday().slice(5, 7)) / 3.1) + 1);
  const [maintenanceQuarterYear, setMaintenanceQuarterYear] = useState<number>(currentYear);
  const [maintenanceYear, setMaintenanceYear] = useState<number>(currentYear);
  const [maintenanceFrom, setMaintenanceFrom] = useState<string>(`${currentMonthStr}-01`);
  const [maintenanceTo, setMaintenanceTo] = useState<string>(isoToday());
  const [maintenanceSearch, setMaintenanceSearch] = useState<string>("");
  const [maintenanceCategoryFilter, setMaintenanceCategoryFilter] = useState<BusinessExpenseCategory | "All">("All");

  // Effective Ranges
  const empRange = computeReportRange(employeeReportPeriod, employeeReportMonth, employeeReportQuarter, employeeReportQuarterYear, employeeReportYear, employeeReportFrom, employeeReportTo);
  const isEmpAllTime = empRange.isAllTime;
  const empMonthStart = empRange.start;
  const empMonthEnd = empRange.end;

  const clientRange = computeReportRange(clientReportPeriod, clientReportMonth, clientReportQuarter, clientReportQuarterYear, clientReportYear, clientReportFrom, clientReportTo);
  const isClientAllTime = clientRange.isAllTime;
  const clientMonthStart = clientRange.start;
  const clientMonthEnd = clientRange.end;

  const maintRange = computeReportRange(maintenanceReportPeriod, maintenanceMonth, maintenanceQuarter, maintenanceQuarterYear, maintenanceYear, maintenanceFrom, maintenanceTo);
  const isMaintAllTime = maintRange.isAllTime;
  const maintMonthStart = maintRange.start;
  const maintMonthEnd = maintRange.end;

  const reportAdvances = store.advances.filter((a) => a.date >= reportStart && a.date <= reportEnd);

  // -------------------------------------------------------------
  // Employee Report Computations (Supports All Time, Month, Quarter, Year, Date Range)
  // -------------------------------------------------------------
  const employeeRows = store.employees.map((employee) => {
    const status = getEmployeeCurrentStatus(employee, isEmpAllTime ? isoToday() : empMonthEnd);
    const midMonthDate = isEmpAllTime ? isoToday() : empMonthEnd;
    const rateInfo = rateOnDate(store.employeeRates, employee.id, midMonthDate) ?? store.employeeRates.find((r) => r.employeeId === employee.id);
    const dailyRate = rateInfo?.dailyRate ?? 0;
    const location = rateInfo?.location ?? "Unassigned";

    let presentDays = 0;
    for (const dateStr of Object.keys(store.attendance)) {
      if (isEmpAllTime || (dateStr >= empMonthStart && dateStr <= empMonthEnd)) {
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
  // Client Report Computations (Supports All Time, Month, Quarter, Year, Date Range)
  // -------------------------------------------------------------
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
  // Client Outstanding Bills List Computations
  // -------------------------------------------------------------
  const allClientOutstandingBills = [
    ...store.bills.map((bill) => {
      const balance = billBalance(bill);
      const paid = billPaid(bill);
      const clientFirmName = bill.client?.firmName || "Unknown Client";
      const clientPhone = bill.client?.mobile || "";
      const clientOwner = bill.client?.ownerName || "";
      const clientCategories = store.clients.find((c) => c.id === bill.clientId)?.categories || [];
      return {
        key: `bill-${bill.id}`,
        id: bill.id,
        billType: "Campaign Invoice",
        number: `INV-${String(bill.number).padStart(4, "0")}`,
        date: bill.billDate,
        clientId: bill.clientId,
        firmName: clientFirmName,
        ownerName: clientOwner,
        phone: clientPhone,
        categories: clientCategories,
        total: bill.total,
        paid,
        balance,
        status: bill.status,
      };
    }),
    ...store.otherBills.map((bill) => {
      const balance = otherBillBalance(bill);
      const paid = otherBillPaid(bill);
      const clientFirmName = bill.client?.firmName || "Unknown Client";
      const clientPhone = bill.client?.mobile || "";
      const clientOwner = bill.client?.ownerName || "";
      const clientCategories = store.clients.find((c) => c.id === bill.clientId)?.categories || [];
      return {
        key: `otherbill-${bill.id}`,
        id: bill.id,
        billType: `Other Bill (${bill.category})`,
        number: `#${String(bill.number).padStart(4, "0")}`,
        date: bill.billDate,
        clientId: bill.clientId,
        firmName: clientFirmName,
        ownerName: clientOwner,
        phone: clientPhone,
        categories: clientCategories,
        total: bill.total,
        paid,
        balance,
        status: bill.status,
      };
    }),
  ]
    .filter((item) => item.balance > 0)
    .filter((item) => isClientAllTime || (item.date >= clientMonthStart && item.date <= clientMonthEnd))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredOutstandingBills = allClientOutstandingBills.filter((item) => {
    if (clientCategoryFilter !== "All" && !item.categories.includes(clientCategoryFilter)) {
      return false;
    }
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase().trim();
    return (
      item.firmName.toLowerCase().includes(q) ||
      item.ownerName.toLowerCase().includes(q) ||
      item.phone.includes(q) ||
      item.number.toLowerCase().includes(q) ||
      item.billType.toLowerCase().includes(q)
    );
  });

  const totalOutstandingBillAmount = filteredOutstandingBills.reduce((sum, b) => sum + b.balance, 0);

  // -------------------------------------------------------------
  // Maintenance Report Computations (Supports All Time, Month, Quarter, Year, Date Range)
  // -------------------------------------------------------------
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
            <div className="op-period-tabs">
              {(["Month", "Quarter", "Year", "Date range", "All time"] as const).map(
                (period) => (
                  <button
                    key={period}
                    type="button"
                    className={employeeReportPeriod === period ? "active" : ""}
                    onClick={() => setEmployeeReportPeriod(period)}
                  >
                    {period}
                  </button>
                ),
              )}
            </div>

            {/* Month Selector */}
            {employeeReportPeriod === "Month" && (
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
                  {empRange.label}
                </p>
              </div>
            )}

            {/* Quarter Selector */}
            {employeeReportPeriod === "Quarter" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "130px" }}>
                  <span>Year</span>
                  <select
                    value={employeeReportQuarterYear}
                    onChange={(e) => setEmployeeReportQuarterYear(Number(e.target.value))}
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
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
                      className={employeeReportQuarter === q ? "active" : ""}
                      onClick={() => setEmployeeReportQuarter(q)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {empRange.label}
                </p>
              </div>
            )}

            {/* Year Selector */}
            {employeeReportPeriod === "Year" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "130px" }}>
                  <span>Choose Year</span>
                  <select
                    value={employeeReportYear}
                    onChange={(e) => setEmployeeReportYear(Number(e.target.value))}
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
                <div className="op-salary-tabs" style={{ margin: 0 }}>
                  <button type="button" onClick={() => setEmployeeReportYear(employeeReportYear - 1)}>
                    ← {employeeReportYear - 1}
                  </button>
                  <button
                    type="button"
                    className={employeeReportYear === currentYear ? "active" : ""}
                    onClick={() => setEmployeeReportYear(currentYear)}
                  >
                    Current Year ({currentYear})
                  </button>
                  <button type="button" onClick={() => setEmployeeReportYear(employeeReportYear + 1)}>
                    {employeeReportYear + 1} →
                  </button>
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {empRange.label}
                </p>
              </div>
            )}

            {/* Date Range Selector */}
            {employeeReportPeriod === "Date range" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "160px" }}>
                  <span>From</span>
                  <input
                    type="date"
                    value={employeeReportFrom}
                    onChange={(e) => setEmployeeReportFrom(e.target.value)}
                  />
                </label>
                <span style={{ paddingBottom: "10px" }}>to</span>
                <label className="op-field" style={{ width: "160px" }}>
                  <span>To</span>
                  <input
                    type="date"
                    value={employeeReportTo}
                    onChange={(e) => setEmployeeReportTo(e.target.value)}
                  />
                </label>
                <div className="op-salary-tabs" style={{ margin: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeReportFrom(addDays(isoToday(), -6));
                      setEmployeeReportTo(isoToday());
                    }}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeReportFrom(addDays(isoToday(), -29));
                      setEmployeeReportTo(isoToday());
                    }}
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeReportFrom(`${currentMonthStr}-01`);
                      setEmployeeReportTo(isoToday());
                    }}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeReportFrom(`${currentYear}-01-01`);
                      setEmployeeReportTo(isoToday());
                    }}
                  >
                    This Year
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeReportFrom("");
                      setEmployeeReportTo("");
                    }}
                  >
                    All Time
                  </button>
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {empRange.label}
                </p>
              </div>
            )}

            {/* All Time */}
            {employeeReportPeriod === "All time" && (
              <div className="op-report-range">
                <p>
                  <CalendarDays size={17} />
                  Showing all employee payroll and attendance records from start of business
                </p>
              </div>
            )}
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
              Showing <b>{filteredEmployeeRows.length}</b> of <b>{employeeRows.length}</b> employees ({empRange.label})
            </p>
          </div>

          {/* Employee Monthly Payroll Table */}
          {filteredEmployeeRows.length ? (
            <Table
              headers={[
                "Employee",
                "Location & Rate",
                isEmpAllTime ? "Total Attendance" : "Period Attendance",
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
                    <b>{row.presentDays} {row.presentDays === 1 ? "day present" : "days present"}</b>
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
          {/* Period & Date Range Selector for Client Report */}
          <div className="op-report-period">
            <div className="op-period-tabs">
              {(["Month", "Quarter", "Year", "Date range", "All time"] as const).map(
                (period) => (
                  <button
                    key={period}
                    type="button"
                    className={clientReportPeriod === period ? "active" : ""}
                    onClick={() => setClientReportPeriod(period)}
                  >
                    {period}
                  </button>
                ),
              )}
            </div>

            {/* Month Selector */}
            {clientReportPeriod === "Month" && (
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
                  {clientRange.label}
                </p>
              </div>
            )}

            {/* Quarter Selector */}
            {clientReportPeriod === "Quarter" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "130px" }}>
                  <span>Year</span>
                  <select
                    value={clientReportQuarterYear}
                    onChange={(e) => setClientReportQuarterYear(Number(e.target.value))}
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
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
                      className={clientReportQuarter === q ? "active" : ""}
                      onClick={() => setClientReportQuarter(q)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {clientRange.label}
                </p>
              </div>
            )}

            {/* Year Selector */}
            {clientReportPeriod === "Year" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "130px" }}>
                  <span>Choose Year</span>
                  <select
                    value={clientReportYear}
                    onChange={(e) => setClientReportYear(Number(e.target.value))}
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
                <div className="op-salary-tabs" style={{ margin: 0 }}>
                  <button type="button" onClick={() => setClientReportYear(clientReportYear - 1)}>
                    ← {clientReportYear - 1}
                  </button>
                  <button
                    type="button"
                    className={clientReportYear === currentYear ? "active" : ""}
                    onClick={() => setClientReportYear(currentYear)}
                  >
                    Current Year ({currentYear})
                  </button>
                  <button type="button" onClick={() => setClientReportYear(clientReportYear + 1)}>
                    {clientReportYear + 1} →
                  </button>
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {clientRange.label}
                </p>
              </div>
            )}

            {/* Date Range Selector */}
            {clientReportPeriod === "Date range" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "160px" }}>
                  <span>From</span>
                  <input
                    type="date"
                    value={clientReportFrom}
                    onChange={(e) => setClientReportFrom(e.target.value)}
                  />
                </label>
                <span style={{ paddingBottom: "10px" }}>to</span>
                <label className="op-field" style={{ width: "160px" }}>
                  <span>To</span>
                  <input
                    type="date"
                    value={clientReportTo}
                    onChange={(e) => setClientReportTo(e.target.value)}
                  />
                </label>
                <div className="op-salary-tabs" style={{ margin: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setClientReportFrom(addDays(isoToday(), -6));
                      setClientReportTo(isoToday());
                    }}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientReportFrom(addDays(isoToday(), -29));
                      setClientReportTo(isoToday());
                    }}
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientReportFrom(`${currentMonthStr}-01`);
                      setClientReportTo(isoToday());
                    }}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientReportFrom(`${currentYear}-01-01`);
                      setClientReportTo(isoToday());
                    }}
                  >
                    This Year
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientReportFrom("");
                      setClientReportTo("");
                    }}
                  >
                    All Time
                  </button>
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {clientRange.label}
                </p>
              </div>
            )}

            {/* All Time */}
            {clientReportPeriod === "All time" && (
              <div className="op-report-range">
                <p>
                  <CalendarDays size={17} />
                  Showing all client campaigns, bills, and payment records from start of business
                </p>
              </div>
            )}
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
            <div
              style={{ cursor: "pointer" }}
              onClick={() => setClientReportSubTab("outstandingBills")}
              title="Click to view full Outstanding Bills List"
            >
              <Metric
                label={isClientAllTime ? "Total Outstanding Receivables" : "Outstanding Balance"}
                value={money(clientTotalOutstanding)}
                detail="Click to view full bills list →"
                icon={WalletCards}
              />
            </div>
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

          {/* Sub Navigation Tabs: Client Accounts vs Outstanding Bills List */}
          <div className="op-salary-tabs" style={{ margin: "16px 0 10px 0" }}>
            <button
              type="button"
              className={clientReportSubTab === "accounts" ? "active" : ""}
              onClick={() => setClientReportSubTab("accounts")}
            >
              Client Accounts Summary ({filteredClientMetrics.length})
            </button>
            <button
              type="button"
              className={clientReportSubTab === "outstandingBills" ? "active" : ""}
              onClick={() => setClientReportSubTab("outstandingBills")}
              style={{
                backgroundColor: clientReportSubTab === "outstandingBills" ? "#b91c1c" : undefined,
                borderColor: clientReportSubTab === "outstandingBills" ? "#b91c1c" : undefined,
                color: clientReportSubTab === "outstandingBills" ? "#ffffff" : undefined,
                fontWeight: 700,
              }}
            >
              Outstanding Bills List ({filteredOutstandingBills.length})
              {totalOutstandingBillAmount > 0 ? ` · ${money(totalOutstandingBillAmount)} Due` : ""}
            </button>
          </div>

          {/* Search Toolbar */}
          <div className="op-toolbar">
            <label className="op-search">
              <Search />
              <input
                placeholder={
                  clientReportSubTab === "outstandingBills"
                    ? "Search outstanding bills by client, phone, or invoice number..."
                    : "Search client firm name, contact person, or phone..."
                }
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </label>
            <p>
              {clientReportSubTab === "outstandingBills" ? (
                <>
                  Showing <b>{filteredOutstandingBills.length}</b> of <b>{allClientOutstandingBills.length}</b> outstanding bills ({clientRange.label})
                </>
              ) : (
                <>
                  Showing <b>{filteredClientMetrics.length}</b> of <b>{allClientMetrics.length}</b> campaign clients ({clientRange.label})
                </>
              )}
            </p>
            {clientReportSubTab === "outstandingBills" && (
              <Button secondary onClick={() => setOutstandingBillsPrintOpen(true)}>
                <Printer size={16} />
                Print Outstanding List
              </Button>
            )}
          </div>

          {/* Conditional View Rendering: Outstanding Bills vs Client Accounts */}
          {clientReportSubTab === "outstandingBills" ? (
            filteredOutstandingBills.length ? (
              <Table
                headers={[
                  "Bill Date",
                  "Client / Firm Name",
                  "Phone & Contact",
                  "Bill / Invoice #",
                  "Total Billed",
                  "Received",
                  "Outstanding Amount",
                  "Status",
                  "",
                ]}
              >
                {filteredOutstandingBills.map((item) => (
                  <Row key={item.key}>
                    <span>{fmt(item.date)}</span>
                    <b>
                      <button
                        type="button"
                        className="op-link-button"
                        style={{ textDecoration: "none", fontWeight: 700, color: "#14493a", textAlign: "left" }}
                        onClick={() => setSelectedClientLedgerId(item.clientId)}
                      >
                        {item.firmName}
                      </button>
                      {item.ownerName && <small>{item.ownerName}</small>}
                    </b>
                    <span>
                      {item.phone ? (
                        <a
                          href={`tel:${item.phone}`}
                          style={{ color: "#1f6a53", fontWeight: 600, textDecoration: "none" }}
                          title="Click to call"
                        >
                          {item.phone}
                        </a>
                      ) : (
                        <small style={{ color: "#888" }}>No phone</small>
                      )}
                    </span>
                    <span>
                      <b>{item.number}</b>
                      <small>{item.billType}</small>
                    </span>
                    <strong>{money(item.total)}</strong>
                    <span style={{ color: "#1f6a53" }}>
                      <b>{money(item.paid)}</b>
                    </span>
                    <span>
                      <b style={{ color: "#b91c1c", fontSize: "14px" }}>
                        {money(item.balance)}
                      </b>
                      <small style={{ color: "#b91c1c", fontWeight: 700 }}>Unpaid Balance</small>
                    </span>
                    <Status>{item.status === "Overdue" ? "Overdue" : "Pending"}</Status>
                    <Button secondary onClick={() => setSelectedClientLedgerId(item.clientId)}>
                      <ReceiptText size={15} />
                      Open ledger
                    </Button>
                  </Row>
                ))}
              </Table>
            ) : (
              <div className="op-empty-state">
                <Check />
                <h2>No outstanding bills</h2>
                <p>All client bills are settled or no unpaid bills match the selected period/filter.</p>
              </div>
            )
          ) : (
            /* Client Financial Accounts Table */
            filteredClientMetrics.length ? (
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
                      {item.client.mobile ? (
                        <a
                          href={`tel:${item.client.mobile}`}
                          style={{ color: "#1f6a53", fontWeight: 600, textDecoration: "none" }}
                          title="Click to call"
                        >
                          <b>{item.client.mobile}</b>
                        </a>
                      ) : (
                        <b>No mobile</b>
                      )}
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
            )
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. MAINTENANCE REPORT TAB                                                 */}
      {/* ========================================================================= */}
      {activeReportTab === "maintenance" && (
        <>
          {/* Period & Date Range Selector for Maintenance Report */}
          <div className="op-report-period">
            <div className="op-period-tabs">
              {(["Month", "Quarter", "Year", "Date range", "All time"] as const).map(
                (period) => (
                  <button
                    key={period}
                    type="button"
                    className={maintenanceReportPeriod === period ? "active" : ""}
                    onClick={() => setMaintenanceReportPeriod(period)}
                  >
                    {period}
                  </button>
                ),
              )}
            </div>

            {/* Month Selector */}
            {maintenanceReportPeriod === "Month" && (
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
                  {maintRange.label}
                </p>
              </div>
            )}

            {/* Quarter Selector */}
            {maintenanceReportPeriod === "Quarter" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "130px" }}>
                  <span>Year</span>
                  <select
                    value={maintenanceQuarterYear}
                    onChange={(e) => setMaintenanceQuarterYear(Number(e.target.value))}
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
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
                      className={maintenanceQuarter === q ? "active" : ""}
                      onClick={() => setMaintenanceQuarter(q)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {maintRange.label}
                </p>
              </div>
            )}

            {/* Year Selector */}
            {maintenanceReportPeriod === "Year" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "130px" }}>
                  <span>Choose Year</span>
                  <select
                    value={maintenanceYear}
                    onChange={(e) => setMaintenanceYear(Number(e.target.value))}
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
                <div className="op-salary-tabs" style={{ margin: 0 }}>
                  <button type="button" onClick={() => setMaintenanceYear(maintenanceYear - 1)}>
                    ← {maintenanceYear - 1}
                  </button>
                  <button
                    type="button"
                    className={maintenanceYear === currentYear ? "active" : ""}
                    onClick={() => setMaintenanceYear(currentYear)}
                  >
                    Current Year ({currentYear})
                  </button>
                  <button type="button" onClick={() => setMaintenanceYear(maintenanceYear + 1)}>
                    {maintenanceYear + 1} →
                  </button>
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {maintRange.label}
                </p>
              </div>
            )}

            {/* Date Range Selector */}
            {maintenanceReportPeriod === "Date range" && (
              <div
                className="op-report-range"
                style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}
              >
                <label className="op-field" style={{ width: "160px" }}>
                  <span>From</span>
                  <input
                    type="date"
                    value={maintenanceFrom}
                    onChange={(e) => setMaintenanceFrom(e.target.value)}
                  />
                </label>
                <span style={{ paddingBottom: "10px" }}>to</span>
                <label className="op-field" style={{ width: "160px" }}>
                  <span>To</span>
                  <input
                    type="date"
                    value={maintenanceTo}
                    onChange={(e) => setMaintenanceTo(e.target.value)}
                  />
                </label>
                <div className="op-salary-tabs" style={{ margin: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMaintenanceFrom(addDays(isoToday(), -6));
                      setMaintenanceTo(isoToday());
                    }}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMaintenanceFrom(addDays(isoToday(), -29));
                      setMaintenanceTo(isoToday());
                    }}
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMaintenanceFrom(`${currentMonthStr}-01`);
                      setMaintenanceTo(isoToday());
                    }}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMaintenanceFrom(`${currentYear}-01-01`);
                      setMaintenanceTo(isoToday());
                    }}
                  >
                    This Year
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMaintenanceFrom("");
                      setMaintenanceTo("");
                    }}
                  >
                    All Time
                  </button>
                </div>
                <p style={{ marginLeft: "auto" }}>
                  <CalendarDays size={17} />
                  {maintRange.label}
                </p>
              </div>
            )}

            {/* All Time */}
            {maintenanceReportPeriod === "All time" && (
              <div className="op-report-range">
                <p>
                  <CalendarDays size={17} />
                  Showing all supplier work and maintenance payment records from start of business
                </p>
              </div>
            )}
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

      {outstandingBillsPrintOpen && (
        <OutstandingBillsPrintModal
          store={store}
          periodLabel={clientRange.label}
          bills={filteredOutstandingBills}
          totalBilled={filteredOutstandingBills.reduce((sum, b) => sum + b.total, 0)}
          totalReceived={filteredOutstandingBills.reduce((sum, b) => sum + b.paid, 0)}
          totalOutstanding={totalOutstandingBillAmount}
          close={() => setOutstandingBillsPrintOpen(false)}
        />
      )}
    </>
  );
}