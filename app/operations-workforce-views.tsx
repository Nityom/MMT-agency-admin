"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Banknote,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import {
  addDays,
  calculateEmployeeLedger,
  getAdvanceOutstanding,
  getEmployeeAdvancesWithRecoveries,
  getEmployeeCurrentStatus,
  getEmployeeGrossEarned,
  inclusiveDays,
  weekFor,
  type Employee,
  type EmployeeRate,
  type FleetStore,
  type PayrollPayment,
  type PayrollPreview,
} from "./fleet-domain";
import { Actions, AttendanceCalendar, Button, Modal, Row, Status, Table } from "./operations-components";
import { Metric, PageHead } from "./operations-reports";
import { fmt, isoToday, money } from "./operations-utils";

export type AttendanceRow = { employee: Employee; rate: EmployeeRate | undefined; present: boolean | undefined };

export type AttendanceViewProps = {
  store: FleetStore;
  attendanceDate: string;
  attendanceDirty: boolean;
  attendanceRows: AttendanceRow[];
  allEmployees: Employee[];
  activeEmployeeIds: number[];
  selectAttendanceDate: (date: string) => void;
  markAllPresent: () => void;
  markAllAbsent: () => void;
  setEmployeeAttendance: (employeeId: number, present: boolean) => void;
  saveAttendance: () => void;
  attendanceReportFrom: string;
  attendanceReportTo: string;
  setAttendanceReportFrom: (date: string) => void;
  setAttendanceReportTo: (date: string) => void;
};

export function AttendanceView({
  store,
  attendanceDate,
  attendanceDirty,
  attendanceRows,
  allEmployees,
  activeEmployeeIds,
  selectAttendanceDate,
  markAllPresent,
  markAllAbsent,
  setEmployeeAttendance,
  saveAttendance,
  attendanceReportFrom,
  attendanceReportTo,
  setAttendanceReportFrom,
  setAttendanceReportTo,
}: AttendanceViewProps) {
  const reportDates = Object.keys(store.attendance)
    .filter((date) => date >= attendanceReportFrom && date <= attendanceReportTo)
    .sort();

  const sortedAllEmployees = [...allEmployees].sort((a, b) => {
    if (a.status === "Active" && b.status !== "Active") return -1;
    if (a.status !== "Active" && b.status === "Active") return 1;
    return a.name.localeCompare(b.name);
  });

  const sortedAttendanceRows = [...attendanceRows].sort((a, b) => {
    if (a.employee.status === "Active" && b.employee.status !== "Active") return -1;
    if (a.employee.status !== "Active" && b.employee.status === "Active") return 1;
    return a.employee.name.localeCompare(b.employee.name);
  });

  return (
    <>
      <PageHead
        title="Daily attendance"
        detail="Record attendance for all active employees, with or without a campaign"
      />
      <div className="op-attendance-layout">
        <AttendanceCalendar
          key={attendanceDate.slice(0, 7)}
          selected={attendanceDate}
          attendance={store.attendance}
          employeeIds={activeEmployeeIds}
          onSelect={selectAttendanceDate}
        />
        <section className="op-attendance-sheet">
          <div className="op-toolbar">
            <label className="op-field">
              <span>Attendance date</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => selectAttendanceDate(event.target.value)}
              />
            </label>
            <Button secondary onClick={markAllPresent}>
              Mark all present
            </Button>
            <Button secondary onClick={markAllAbsent}>
              Mark all absent
            </Button>
            <span className="op-attendance-save-top">
              <Button onClick={saveAttendance}>
                <Check size={17} />
                Save attendance
              </Button>
            </span>
          </div>
          {attendanceDirty && <p className="op-unsaved">Unsaved changes</p>}
          {sortedAttendanceRows.length ? (
            <Table headers={["Employee", "Location and rate", "Present", "Absent"]}>
              {sortedAttendanceRows.map(({ employee, rate, present }) => (
                <Row key={employee.id}>
                  <b>{employee.name}</b>
                  <span>
                    {rate?.location ?? "No rate"} · {money(rate?.dailyRate ?? 0)}/day
                  </span>
                  <button
                    className={`op-attendance ${present ? "active" : ""}`}
                    onClick={() => setEmployeeAttendance(employee.id, true)}
                  >
                    <Check />
                    Present
                  </button>
                  <button
                    className={`op-attendance ${present === false ? "absent" : ""}`}
                    onClick={() => setEmployeeAttendance(employee.id, false)}
                  >
                    <X />
                    Absent
                  </button>
                </Row>
              ))}
            </Table>
          ) : (
            <div className="op-empty-state">
              <CalendarDays />
              <h2>No active employees</h2>
              <p>Add or activate an employee before recording attendance.</p>
            </div>
          )}
          <div className="op-attendance-save-bottom">
            <Button onClick={saveAttendance}>
              <Check size={17} />
              Save attendance
            </Button>
          </div>
        </section>
      </div>

      <section className="op-section-title">
        <h2>Attendance report</h2>
      </section>
      <div className="op-toolbar">
        <label className="op-field">
          <span>From</span>
          <input
            type="date"
            value={attendanceReportFrom}
            onChange={(event) => setAttendanceReportFrom(event.target.value)}
          />
        </label>
        <label className="op-field">
          <span>To</span>
          <input
            type="date"
            value={attendanceReportTo}
            onChange={(event) => setAttendanceReportTo(event.target.value)}
          />
        </label>
      </div>
      <Table headers={["Employee", "Status", "Present days", "Absent days", "Total days"]}>
        {sortedAllEmployees.map((employee) => {
          const present = reportDates.filter(
            (date) => store.attendance[date]?.[employee.id] === true
          ).length;
          const absent = reportDates.length - present;
          return (
            <Row key={`report-${employee.id}`}>
              <b>{employee.name}</b>
              <Status>{getEmployeeCurrentStatus(employee)}</Status>
              <strong style={{ color: "#1f6a53" }}>{present} days</strong>
              <strong style={{ color: absent > 0 ? "#a13e34" : "#687670" }}>
                {absent} days
              </strong>
              <span>{reportDates.length} days</span>
            </Row>
          );
        })}
      </Table>
    </>
  );
}

export type EmployeeRow = { employee: Employee; rate: EmployeeRate | undefined };

export type EmployeesViewProps = {
  store: FleetStore;
  search: string;
  employeeRows: EmployeeRow[];
  employeeRateHistory: EmployeeRate[];
  setSearch: (search: string) => void;
  addEmployee: () => void;
  addRate: () => void;
  openEmployeeRecord: (employeeId: number) => void;
  editEmployee: (employeeId: number) => void;
  removeEmployee: (employeeId: number) => void;
};

export function EmployeesView({
  store,
  search,
  employeeRows,
  employeeRateHistory,
  setSearch,
  addEmployee,
  addRate,
  openEmployeeRecord,
  editEmployee,
  removeEmployee,
}: EmployeesViewProps) {
  return (
    <>
      <PageHead
        title="Employees"
        detail="Click an employee name to view payroll, advances, attendance, and all past records"
        action="Add employee"
        onAction={addEmployee}
      />
      <div className="op-toolbar">
        <label className="op-search">
          <Search />
          <input
            placeholder="Search employee or location"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Button secondary onClick={addRate}>
          <Plus />
          Add rate / transfer
        </Button>
      </div>
      <Table
        headers={[
          "Employee",
          "Current location",
          "Daily rate",
          "Inactive / Active date",
          "Overall balance",
          "Effective from",
          "Status",
          "",
        ]}
      >
        {employeeRows.map(({ employee, rate }) => {
          const overallBalance = calculateEmployeeLedger(store, employee.id).remainingBalance;
          const currentStatus = getEmployeeCurrentStatus(employee);
          const scheduleText = currentStatus === "Inactive"
            ? employee.activeFrom
              ? `Active: ${fmt(employee.activeFrom)}`
              : employee.inactiveFrom
              ? `Inactive: ${fmt(employee.inactiveFrom)}`
              : "—"
            : employee.inactiveFrom
            ? `Inactive: ${fmt(employee.inactiveFrom)}`
            : "—";
          return (
            <Row key={employee.id}>
              <button
                className="op-name-button"
                onClick={() => openEmployeeRecord(employee.id)}
              >
                {employee.name}
              </button>
              <span>{rate?.location ?? "No location"}</span>
              <strong>{money(rate?.dailyRate ?? 0)}/day</strong>
              <small style={{ color: currentStatus === "Inactive" ? "#9a493d" : "#687670", fontWeight: 600 }}>{scheduleText}</small>
              <strong style={{ color: overallBalance > 0 ? "#9a493d" : "#1f6a53" }}>
                {money(overallBalance)}
              </strong>
              <span>{fmt(rate?.effectiveFrom ?? "")}</span>
              <Status>{currentStatus}</Status>
              <Actions
                edit={() => editEmployee(employee.id)}
                remove={() => removeEmployee(employee.id)}
              />
            </Row>
          );
        })}
      </Table>
      <section className="op-history">
        <h2>Rate and location history</h2>
        {employeeRateHistory.map((rate) => (
          <p key={rate.id}>
            <b>{store.employees.find((item) => item.id === rate.employeeId)?.name}</b>
            <span>
              {rate.location} · {money(rate.dailyRate)}/day
            </span>
            <small>
              {fmt(rate.effectiveFrom)} to{" "}
              {rate.effectiveTo ? fmt(rate.effectiveTo) : "Current"}
            </small>
          </p>
        ))}
      </section>
    </>
  );
}

export type PayrollRow = {
  preview: PayrollPreview;
  employee: Employee | undefined;
  saved?: PayrollPayment | undefined;
  paid?: number;
  balance?: number;
};

export type PayrollViewProps = {
  store: FleetStore;
  payrollWeek: string;
  payrollPeriodEnd: string;
  payrollPayoutDate: string;
  payrollRows: PayrollRow[];
  payrollGrossTotal: number;
  payrollAdvanceRecoveryTotal: number;
  payrollRemainingAdvanceTotal: number;
  payrollNetTotal: number;
  payrollPaidTotal?: number;
  payrollRemainingBalanceTotal?: number;
  setPayrollWeek: (week: string) => void;
  setPayrollPeriodEnd?: (end: string) => void;
  setPayrollRange?: (start: string, end: string) => void;
  releasePayroll?: () => void;
  setPayrollStatus?: (
    preview: PayrollPreview,
    status: "Pending" | "Paid",
    paidAmount?: number
  ) => void;
  exportPayroll: () => void;
  openEmployeeRecord?: (employeeId: number) => void;
  addEmployeeAdvance?: (employeeId?: number) => void;
};

export function PayrollView({
  store,
  payrollWeek,
  payrollPeriodEnd,
  payrollRows,
  payrollGrossTotal,
  setPayrollWeek,
  setPayrollPeriodEnd,
  setPayrollRange,
  exportPayroll,
  openEmployeeRecord,
  addEmployeeAdvance,
}: PayrollViewProps) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"All" | "Pending" | "AdvanceOwed" | "Settled">("All");
  const [selectedSlip, setSelectedSlip] = useState<{
    preview: PayrollPreview;
    employee: Employee | undefined;
  } | null>(null);

  const today = isoToday();
  const daysCount = inclusiveDays(payrollWeek, payrollPeriodEnd);

  // Quick Date Range Helpers
  const applyRange = (start: string, end: string) => {
    if (setPayrollRange) {
      setPayrollRange(start, end);
    } else {
      setPayrollWeek(start);
      if (setPayrollPeriodEnd) setPayrollPeriodEnd(end);
    }
  };

  const setPreset = (preset: "thisMonth" | "lastMonth" | "last30Days" | "allTime") => {
    if (preset === "thisMonth") {
      const yearMonth = today.slice(0, 7);
      const parts = yearMonth.split("-").map(Number);
      const lastDay = new Date(parts[0], parts[1], 0).getDate();
      applyRange(`${yearMonth}-01`, `${yearMonth}-${String(lastDay).padStart(2, "0")}`);
    } else if (preset === "lastMonth") {
      const parts = today.split("-").map(Number);
      const prevDate = new Date(parts[0], parts[1] - 2, 1);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(y, prevDate.getMonth() + 1, 0).getDate();
      applyRange(`${y}-${m}-01`, `${y}-${m}-${String(lastDay).padStart(2, "0")}`);
    } else if (preset === "last30Days") {
      applyRange(addDays(today, -29), today);
    } else if (preset === "allTime") {
      applyRange("2026-01-01", today);
    }
  };

  // Pure Plus & Minus calculation per employee:
  // 1. Earned = Gross attendance salary + reimbursements - deductions
  // 2. Advance = Total advances given up to period end
  // 3. Deducted from Advance = min(Earned, Advance)
  // 4. Carry Forward Balance:
  //    - If Advance > Earned: - (Advance - Earned) [Advance Due / Carried forward]
  //    - If Earned > Advance: + (Earned - Advance) [Salary Due to employee]
  //    - If equal: 0 Settled
  const calculatedRows = payrollRows.map((row) => {
    const employeeId = row.preview.employeeId;
    const empEarned = Math.max(0, row.preview.gross + row.preview.reimbursements - row.preview.deductions);
    const empAdvances = store.advances
      .filter((a) => a.employeeId === employeeId && a.date <= payrollPeriodEnd)
      .reduce((sum, a) => sum + a.amount, 0);

    const deductedFromAdvance = Math.min(empAdvances, empEarned);
    const advanceRemaining = Math.max(0, empAdvances - empEarned);
    const salaryPayable = Math.max(0, empEarned - empAdvances);
    const balance = salaryPayable > 0 ? salaryPayable : (advanceRemaining > 0 ? -advanceRemaining : 0);

    const status =
      balance > 0
        ? "Payable"
        : balance < 0
        ? "Advance Due"
        : "Settled";

    return {
      ...row,
      empEarned,
      empAdvances,
      deductedFromAdvance,
      advanceRemaining,
      salaryPayable,
      balance,
      status,
    };
  });

  const totalGross = payrollGrossTotal;
  const totalAdvancesIssued = store.advances
    .filter((a) => a.date <= payrollPeriodEnd)
    .reduce((sum, a) => sum + a.amount, 0);

  const totalDeductedFromAdvance = calculatedRows.reduce((sum, r) => sum + r.deductedFromAdvance, 0);
  const totalPayableSalary = calculatedRows
    .filter((r) => r.salaryPayable > 0)
    .reduce((sum, r) => sum + r.salaryPayable, 0);

  const totalAdvanceSurplus = calculatedRows
    .filter((r) => r.advanceRemaining > 0)
    .reduce((sum, r) => sum + r.advanceRemaining, 0);

  // Filter rows
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = calculatedRows.filter((row) => {
    const empName = row.employee?.name?.toLowerCase() ?? "";
    const matchesSearch =
      !normalizedSearch ||
      empName.includes(normalizedSearch) ||
      row.preview.rateBreakdown.some((r) =>
        r.location.toLowerCase().includes(normalizedSearch)
      );

    if (!matchesSearch) return false;
    if (filterTab === "Pending") return row.salaryPayable > 0;
    if (filterTab === "AdvanceOwed") return row.advanceRemaining > 0;
    if (filterTab === "Settled") return row.balance === 0;
    return true;
  });

  const payableCount = calculatedRows.filter((r) => r.salaryPayable > 0).length;
  const advanceOwedCount = calculatedRows.filter((r) => r.advanceRemaining > 0).length;
  const settledCount = calculatedRows.filter((r) => r.balance === 0).length;

  return (
    <div className="op-salary-workspace">
      <PageHead
        title="Employee Salaries & Advance Ledger"
        detail="Daily attendance salary deducted directly from advance payments with transparent carry-forward balances."
        action={addEmployeeAdvance ? "+ Give Employee Advance" : undefined}
        onAction={addEmployeeAdvance ? () => addEmployeeAdvance() : undefined}
      />

      {/* Date Range & Filter Bar */}
      <section className="op-salary-controls-card">
        <div className="op-salary-period-header">
          <div className="op-salary-presets">
            <span className="op-preset-label">
              <Calendar size={15} /> Quick range:
            </span>
            <button
              type="button"
              className="op-preset-btn"
              onClick={() => setPreset("thisMonth")}
            >
              This Month
            </button>
            <button
              type="button"
              className="op-preset-btn"
              onClick={() => setPreset("lastMonth")}
            >
              Last Month
            </button>
            <button
              type="button"
              className="op-preset-btn"
              onClick={() => setPreset("last30Days")}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              className="op-preset-btn"
              onClick={() => setPreset("allTime")}
            >
              All Time
            </button>
          </div>

          <div className="op-salary-range-inputs">
            <label className="op-date-box">
              <span>From Date</span>
              <input
                type="date"
                value={payrollWeek}
                onChange={(e) => applyRange(e.target.value, payrollPeriodEnd)}
              />
            </label>
            <span className="op-range-arrow">→</span>
            <label className="op-date-box">
              <span>To Date</span>
              <input
                type="date"
                value={payrollPeriodEnd}
                onChange={(e) => applyRange(payrollWeek, e.target.value)}
              />
            </label>
            <div className="op-period-badge">
              <CalendarDays size={16} />
              <span>
                <b>{daysCount}</b> {daysCount === 1 ? "day" : "days"} (
                {fmt(payrollWeek)} – {fmt(payrollPeriodEnd)})
              </span>
            </div>
          </div>
        </div>

        <div className="op-salary-filter-bar">
          <label className="op-search">
            <Search size={16} />
            <input
              placeholder="Search employee or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="op-salary-tabs">
            <button
              type="button"
              className={filterTab === "All" ? "active" : ""}
              onClick={() => setFilterTab("All")}
            >
              All Workforce ({calculatedRows.length})
            </button>
            <button
              type="button"
              className={filterTab === "Pending" ? "active" : ""}
              onClick={() => setFilterTab("Pending")}
            >
              Salary Due ({payableCount})
            </button>
            <button
              type="button"
              className={filterTab === "AdvanceOwed" ? "active" : ""}
              onClick={() => setFilterTab("AdvanceOwed")}
            >
              Advance Remaining ({advanceOwedCount})
            </button>
            <button
              type="button"
              className={filterTab === "Settled" ? "active" : ""}
              onClick={() => setFilterTab("Settled")}
            >
              Settled ({settledCount})
            </button>
          </div>

          <Button secondary onClick={exportPayroll}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </section>

      {/* Summary Metrics */}
      <section className="op-metrics op-salary-metrics">
        <Metric
          label="Total Salary Earned"
          value={money(totalGross)}
          detail={`${calculatedRows.reduce((sum, r) => sum + r.preview.presentDays, 0)} present days in period`}
          icon={Banknote}
        />
        <Metric
          label="Total Advances Given"
          value={money(totalAdvancesIssued)}
          detail="Advances distributed to date"
          icon={WalletCards}
        />
        <div className={`op-metric op-balance-highlight-metric ${totalPayableSalary > 0 ? "has-due" : "all-settled"}`}>
          <header>
            <span>Net Salary Payable</span>
            <Sparkles size={20} />
          </header>
          <b>{money(totalPayableSalary)}</b>
          <small>
            {totalPayableSalary > 0
              ? `${payableCount} employee(s) with salary due`
              : "No outstanding salary payable"}
          </small>
        </div>
        <div className={`op-metric op-balance-highlight-metric ${totalAdvanceSurplus > 0 ? "has-due" : "all-settled"}`}>
          <header>
            <span>Advance Balance Due</span>
            <CheckCircle2 size={20} />
          </header>
          <b>{money(totalAdvanceSurplus)}</b>
          <small>
            {totalAdvanceSurplus > 0
              ? `${advanceOwedCount} employee(s) with advance carried forward`
              : "All employee advances settled"}
          </small>
        </div>
      </section>

      {/* Salary & Advance Table */}
      {filteredRows.length ? (
        <div className="op-salary-table-wrap">
          <Table
            headers={[
              "Employee",
              "Attendance",
              "Salary Earned (+)",
              "Advance Paid (−)",
              "Deducted from Advance",
              "Carry Forward Balance",
              "Actions",
            ]}
          >
            {filteredRows.map(({ preview, employee, empEarned, empAdvances, deductedFromAdvance, advanceRemaining, salaryPayable, balance }) => (
              <Row key={preview.employeeId}>
                <div className="op-employee-info-cell">
                  <button
                    className="op-employee-row-name"
                    onClick={() =>
                      openEmployeeRecord
                        ? openEmployeeRecord(preview.employeeId)
                        : setSelectedSlip({ preview, employee })
                    }
                    title="Click to view employee record"
                  >
                    {employee?.name ?? "Unknown"}
                  </button>
                  <small className="op-subtext">
                    {employee?.monthlySalary && employee.monthlySalary > 0
                      ? `Monthly: ${money(employee.monthlySalary)}`
                      : preview.rateBreakdown[0]?.location
                      ? `${preview.rateBreakdown[0].location} driver`
                      : "Workforce staff"}
                  </small>
                </div>

                <div className="op-attendance-cell">
                  <span
                    className={`op-attendance-pill ${
                      preview.presentDays > 0 ? "present" : "none"
                    }`}
                  >
                    <strong>{preview.presentDays}</strong>
                    <span className="op-slash">/</span>
                    <span>{preview.totalDays} days</span>
                  </span>
                </div>

                <div className="op-daily-rate-cell">
                  <strong className="op-earned-figure">+{money(empEarned)}</strong>
                  <small className="op-subtext">
                    {preview.rateBreakdown
                      .map(
                        (item) =>
                          `${item.days}d × ${money(item.dailyRate)} ${
                            item.location !== "Standard" ? `(${item.location})` : ""
                          }`
                      )
                      .join(" + ") || `${preview.presentDays}d × ₹0`}
                    {preview.reimbursements > 0 ? ` (+${money(preview.reimbursements)} reimb)` : ""}
                    {preview.deductions > 0 ? ` (−${money(preview.deductions)} deduct)` : ""}
                  </small>
                </div>

                <div className="op-advance-cell">
                  {empAdvances > 0 ? (
                    <>
                      <strong className="op-adv-figure">−{money(empAdvances)}</strong>
                      <small className="op-subtext">{money(empAdvances)} given</small>
                    </>
                  ) : (
                    <>
                      <strong className="op-zero-figure">₹0</strong>
                      <small className="op-subtext muted">No advances</small>
                    </>
                  )}
                </div>

                <div className="op-adjustments-cell">
                  {deductedFromAdvance > 0 ? (
                    <>
                      <strong className="op-deduct-figure">−{money(deductedFromAdvance)}</strong>
                      <small className="op-subtext">
                        {deductedFromAdvance >= empEarned && empEarned > 0
                          ? "Fully absorbed"
                          : "Partially absorbed"}
                      </small>
                    </>
                  ) : (
                    <>
                      <strong className="op-zero-figure">₹0</strong>
                      <small className="op-subtext muted">No deduction</small>
                    </>
                  )}
                </div>

                <div className="op-balance-cell">
                  {salaryPayable > 0 ? (
                    <>
                      <span className="op-balance-badge due">
                        +{money(salaryPayable)} Payable
                      </span>
                      <small className="op-subtext due-text">Salary due to employee</small>
                    </>
                  ) : advanceRemaining > 0 ? (
                    <>
                      <span className="op-balance-badge advance-owed">
                        −{money(advanceRemaining)} Advance Due
                      </span>
                      <small className="op-subtext adv-text">
                        Surplus advance
                      </small>
                    </>
                  ) : (
                    <>
                      <span className="op-balance-badge settled">
                        ✓ ₹0 Settled
                      </span>
                      <small className="op-subtext settled-text">
                        All dues settled
                      </small>
                    </>
                  )}
                </div>

                <div className="op-row-actions">
                  {addEmployeeAdvance && (
                    <button
                      type="button"
                      className="op-btn-pay-adv"
                      title={`Give advance to ${employee?.name}`}
                      onClick={() => addEmployeeAdvance(preview.employeeId)}
                    >
                      <Banknote size={14} />
                      + Pay Adv
                    </button>
                  )}
                  <button
                    type="button"
                    className="op-btn-statement"
                    title="View salary statement"
                    onClick={() => setSelectedSlip({ preview, employee })}
                  >
                    <FileText size={14} />
                    Statement
                  </button>
                </div>
              </Row>
            ))}
          </Table>
        </div>
      ) : (
        <div className="op-empty-state">
          <ReceiptText />
          <h2>No salary records found</h2>
          <p>
            {normalizedSearch
              ? "No employee matching your search query."
              : "No employees available for the selected period."}
          </p>
        </div>
      )}

      {/* Salary Slip & Calculation Breakdown Modal */}
      {selectedSlip && (
        <SalarySlipModal
          store={store}
          employee={selectedSlip.employee}
          preview={selectedSlip.preview}
          close={() => setSelectedSlip(null)}
          onAddAdvance={addEmployeeAdvance ? () => {
            const empId = selectedSlip.preview.employeeId;
            setSelectedSlip(null);
            addEmployeeAdvance(empId);
          } : undefined}
        />
      )}
    </div>
  );
}

export function SalarySlipModal({
  store,
  employee,
  preview,
  close,
  onAddAdvance,
}: {
  store: FleetStore;
  employee: Employee | undefined;
  preview: PayrollPreview;
  close: () => void;
  onAddAdvance?: () => void;
}) {
  // Pure Plus & Minus calculation:
  const empEarned = Math.max(0, preview.gross + preview.reimbursements - preview.deductions);
  const employeeAdvances = store.advances
    .filter((adv) => adv.employeeId === preview.employeeId && adv.date <= preview.periodEnd)
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalAdvancesIssued = employeeAdvances.reduce((sum, a) => sum + a.amount, 0);

  const deductedFromAdvance = Math.min(totalAdvancesIssued, empEarned);
  const advanceRemaining = Math.max(0, totalAdvancesIssued - empEarned);
  const salaryPayable = Math.max(0, empEarned - totalAdvancesIssued);

  // Relevant itemized expenses
  const relevantExpenses = store.employeeExpenses.filter(
    (expense) =>
      expense.employeeId === preview.employeeId &&
      expense.date >= preview.periodStart &&
      expense.date <= preview.periodEnd
  );
  const reimbursementsList = relevantExpenses.filter(
    (e) => e.treatment === "Employee reimbursement"
  );
  const deductionsList = relevantExpenses.filter(
    (e) => e.treatment === "Employee deduction"
  );

  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog op-salary-slip-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          {onAddAdvance && (
            <Button secondary onClick={onAddAdvance}>
              <Banknote size={17} />
              + Pay Advance
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print / PDF Statement
          </Button>
        </div>

        <article className="invoice-sheet op-salary-slip-sheet">
          <header className="invoice-brand">
            <Gauge size={30} />
            <div>
              <h2>{store.company.name}</h2>
            </div>
          </header>

          <h1>EMPLOYEE SALARY & ADVANCE STATEMENT</h1>

          <section className="invoice-company">
            <p>{store.company.address}</p>
            <p>
              Mobile: {store.company.mobile} &nbsp; | &nbsp; Email: {store.company.email}
            </p>
          </section>

          <section className="invoice-meta">
            <p>
              <b>Employee Name:</b> {employee?.name ?? "Employee"}
              <br />
              <span>
                Monthly Base: {money(employee?.monthlySalary ?? 0)} · Status:{" "}
                {employee?.status ?? "Active"}
              </span>
            </p>
            <p>
              <b>Period:</b> {fmt(preview.periodStart)} to {fmt(preview.periodEnd)}
              <br />
              <span>
                {preview.totalDays} calendar days · Statement Date: {fmt(isoToday())}
              </span>
            </p>
          </section>

          {/* Attendance & Work Summary Table */}
          <table className="invoice-table op-slip-work-table">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Attendance Breakdown & Working Rates</th>
                <th style={{ width: "20%" }}>Present Days</th>
                <th style={{ width: "15%" }}>Daily Rate</th>
                <th style={{ width: "20%" }}>Earned Amount</th>
              </tr>
            </thead>
            <tbody>
              {preview.rateBreakdown.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "left" }}>
                    <b>{item.location || "Standard"} Rate</b>
                    <br />
                    <small>
                      {item.days} present days @ {money(item.dailyRate)}/day
                    </small>
                  </td>
                  <td><b>{item.days} days</b></td>
                  <td>{money(item.dailyRate)}</td>
                  <td>
                    <b>{money(item.amount)}</b>
                  </td>
                </tr>
              ))}
              {!preview.rateBreakdown.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#666" }}>
                    No recorded attendance for this period ({preview.totalDays} days)
                  </td>
                </tr>
              )}
              <tr className="invoice-total">
                <th colSpan={3}>Attendance Gross Salary:</th>
                <th>+{money(preview.gross)}</th>
              </tr>
            </tbody>
          </table>

          {/* Itemized Plus & Minus Statement Table */}
          <table className="invoice-expenses op-slip-calc-table">
            <thead>
              <tr>
                <th style={{ width: "65%" }}>Particulars / Plus & Minus Ledger</th>
                <th style={{ width: "35%", textAlign: "center" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>Attendance Gross Salary</b> ({preview.presentDays} present days)
                </td>
                <td style={{ textAlign: "center", color: "#15803d", fontWeight: "700" }}>
                  +{money(preview.gross)}
                </td>
              </tr>

              {reimbursementsList.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>Reimbursement / Extra:</b> {item.category} ({item.description})
                  </td>
                  <td style={{ textAlign: "center", color: "#15803d", fontWeight: "700" }}>
                    +{money(item.amount)}
                  </td>
                </tr>
              ))}

              {deductionsList.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>Salary Deduction:</b> {item.category} ({item.description})
                  </td>
                  <td style={{ textAlign: "center", color: "#b91c1c", fontWeight: "700" }}>
                    −{money(item.amount)}
                  </td>
                </tr>
              ))}

              <tr className="invoice-total" style={{ background: "#f8fafc" }}>
                <th>Total Salary Earned in Period:</th>
                <td style={{ textAlign: "center", fontWeight: "800", color: "#15803d" }}>
                  +{money(empEarned)}
                </td>
              </tr>

              <tr>
                <td>
                  <b>Total Advances Paid / Given to Employee</b> ({employeeAdvances.length} advance records)
                </td>
                <td style={{ textAlign: "center", color: "#b91c1c", fontWeight: "700" }}>
                  {totalAdvancesIssued > 0 ? `−${money(totalAdvancesIssued)}` : "₹0"}
                </td>
              </tr>

              {deductedFromAdvance > 0 && (
                <tr style={{ background: "#fdf8f6" }}>
                  <td>
                    <b>Salary Deducted Directly from Advance</b>
                    <small style={{ display: "block", color: "#666" }}>
                      Absorbed {money(deductedFromAdvance)} of advance against earned salary
                    </small>
                  </td>
                  <td style={{ textAlign: "center", color: "#b45309", fontWeight: "700" }}>
                    −{money(deductedFromAdvance)}
                  </td>
                </tr>
              )}

              <tr
                className="invoice-grand"
                style={{
                  background: salaryPayable > 0 ? "#e6f9ed" : advanceRemaining > 0 ? "#ffe6d5" : "#f1f5f9",
                }}
              >
                <th>Remaining Carry-Forward Balance:</th>
                <td
                  style={{
                    textAlign: "center",
                    fontWeight: "800",
                    fontSize: "17px",
                    color: salaryPayable > 0 ? "#15803d" : advanceRemaining > 0 ? "#b45309" : "#1f6a53",
                  }}
                >
                  {salaryPayable > 0
                    ? `+${money(salaryPayable)} (Salary Payable)`
                    : advanceRemaining > 0
                    ? `−${money(advanceRemaining)} (Advance Due)`
                    : `✓ ${money(0)} (Settled)`}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Advance History Details */}
          {employeeAdvances.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", color: "#1e293b" }}>
                Advance Payment Records
              </h3>
              <table className="invoice-table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reason / Note</th>
                    <th>Advance Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeAdvances.map((adv) => (
                    <tr key={adv.id}>
                      <td>{fmt(adv.date)}</td>
                      <td>{adv.note || "Employee Advance"}</td>
                      <td style={{ fontWeight: "700", color: "#b91c1c" }}>{money(adv.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="invoice-footer">
            <div>
              <h3>Statement Notes</h3>
              <p>
                <b>Status:</b>{" "}
                {salaryPayable > 0
                  ? `Salary due to employee: ${money(salaryPayable)}`
                  : advanceRemaining > 0
                  ? `Advance balance carried forward: ${money(advanceRemaining)}`
                  : "All salary and advance dues are fully settled."}
              </p>
              <p>
                <b>Generated on:</b> {fmt(isoToday())}
              </p>
              <p>
                This statement reflects direct plus and minus settlement between attendance earnings and advance payments.
              </p>
            </div>
            <div className="invoice-signature">
              <Image
                className="invoice-signature-mark"
                src="/sign.png"
                alt="Authorized Signatory"
                width={700}
                height={278}
              />
              <p style={{ marginTop: "auto", textAlign: "center" }}>
                <b>Authorized Signatory / Employee Signature</b>
              </p>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}