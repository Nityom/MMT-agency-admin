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
              <Status>{employee.status}</Status>
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
          "Overall balance",
          "Effective from",
          "Status",
          "",
        ]}
      >
        {employeeRows.map(({ employee, rate }) => {
          const overallBalance = calculateEmployeeLedger(store, employee.id).remainingBalance;
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
              <strong style={{ color: overallBalance > 0 ? "#9a493d" : "#1f6a53" }}>
                {money(overallBalance)}
              </strong>
              <span>{fmt(rate?.effectiveFrom ?? "")}</span>
              <Status>{employee.status}</Status>
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
  saved: PayrollPayment | undefined;
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
  releasePayroll: () => void;
  setPayrollStatus: (
    preview: PayrollPreview,
    status: "Pending" | "Paid",
    paidAmount?: number
  ) => void;
  exportPayroll: () => void;
  openEmployeeRecord?: (employeeId: number) => void;
};

export function PayrollView({
  store,
  payrollWeek,
  payrollPeriodEnd,
  payrollPayoutDate,
  payrollRows,
  payrollGrossTotal,
  payrollAdvanceRecoveryTotal,
  payrollRemainingAdvanceTotal,
  payrollNetTotal,
  payrollPaidTotal,
  payrollRemainingBalanceTotal,
  setPayrollWeek,
  setPayrollPeriodEnd,
  setPayrollRange,
  releasePayroll,
  setPayrollStatus,
  exportPayroll,
  openEmployeeRecord,
}: PayrollViewProps) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"All" | "Pending" | "Paid">("All");
  const [selectedSlip, setSelectedSlip] = useState<{
    preview: PayrollPreview;
    employee: Employee | undefined;
    saved: PayrollPayment | undefined;
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

  const setPreset = (preset: "thisMonth" | "lastMonth" | "thisWeek" | "lastWeek") => {
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
    } else if (preset === "thisWeek") {
      const current = weekFor(today);
      applyRange(current.start, current.end);
    } else if (preset === "lastWeek") {
      const current = weekFor(today);
      applyRange(addDays(current.start, -7), addDays(current.start, -1));
    }
  };

  // Compute calculated values for each row
  const calculatedRows = payrollRows.map((row) => {
    const paid =
      row.saved?.status === "Paid"
        ? Math.min(row.saved.paidAmount ?? row.preview.net, row.preview.net)
        : (row.saved?.paidAmount ?? 0);
    const periodBalance = Math.max(0, row.preview.net - paid);
    const overallBalance = calculateEmployeeLedger(store, row.preview.employeeId).remainingBalance;
    const status =
      periodBalance === 0 && (paid > 0 || row.preview.net === 0)
        ? "Paid"
        : periodBalance > 0
        ? "Pending"
        : "No dues";
    return {
      ...row,
      paid,
      balance: overallBalance,
      periodBalance,
      status,
    };
  });

  const totalGross = payrollGrossTotal;
  const totalReimbursements = payrollRows.reduce(
    (sum, r) => sum + r.preview.reimbursements,
    0
  );
  const totalDeductions = payrollRows.reduce(
    (sum, r) => sum + r.preview.deductions,
    0
  );
  const totalAdvanceRecovery = payrollAdvanceRecoveryTotal;
  const totalNet = payrollNetTotal;
  const totalPaid =
    payrollPaidTotal ?? calculatedRows.reduce((sum, r) => sum + r.paid, 0);
  const totalRemaining = calculatedRows.reduce(
    (sum, r) => sum + r.periodBalance,
    0
  );

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
    if (filterTab === "Pending") return row.periodBalance > 0;
    if (filterTab === "Paid") return row.periodBalance === 0 && (row.paid > 0 || row.preview.net === 0);
    return true;
  });

  const pendingCount = calculatedRows.filter((r) => r.periodBalance > 0).length;
  const paidCount = calculatedRows.filter((r) => r.periodBalance === 0 && (r.paid > 0 || r.preview.net === 0)).length;

  return (
    <div className="op-salary-workspace">
      <PageHead
        title="Employee Salaries"
        detail="Calculate attendance, earnings, extras, advances, and track paid vs remaining dues for any date range."
        action="Pay All (Full Salary)"
        onAction={releasePayroll}
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
              onClick={() => setPreset("thisWeek")}
            >
              This Week
            </button>
            <button
              type="button"
              className="op-preset-btn"
              onClick={() => setPreset("lastWeek")}
            >
              Last Week
            </button>
          </div>

          <div className="op-salary-range-inputs">
            <label className="op-date-box">
              <span>Salary From</span>
              <input
                type="date"
                value={payrollWeek}
                onChange={(e) => applyRange(e.target.value, payrollPeriodEnd)}
              />
            </label>
            <span className="op-range-arrow">→</span>
            <label className="op-date-box">
              <span>Salary To</span>
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
              All Employees ({calculatedRows.length})
            </button>
            <button
              type="button"
              className={filterTab === "Pending" ? "active" : ""}
              onClick={() => setFilterTab("Pending")}
            >
              Pending Dues ({pendingCount})
            </button>
            <button
              type="button"
              className={filterTab === "Paid" ? "active" : ""}
              onClick={() => setFilterTab("Paid")}
            >
              Fully Settled ({paidCount})
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
          label="Gross Earned"
          value={money(totalGross)}
          detail={`${calculatedRows.reduce(
            (sum, r) => sum + r.preview.presentDays,
            0
          )} total present days`}
          icon={Banknote}
        />
        <Metric
          label="Adjustments"
          value={`${
            totalReimbursements - totalDeductions - totalAdvanceRecovery >= 0
              ? "+"
              : "−"
          }${money(
            Math.abs(
              totalReimbursements - totalDeductions - totalAdvanceRecovery
            )
          )}`}
          detail={`+${money(totalReimbursements)} reimb · −${money(
            totalDeductions
          )} deduct · −${money(totalAdvanceRecovery)} adv`}
          icon={WalletCards}
        />
        <Metric
          label="Total Net Salary"
          value={money(totalNet)}
          detail="Total payable for period"
          icon={Sparkles}
        />
        <Metric
          label="Total Paid"
          value={money(totalPaid)}
          detail={`${paidCount} of ${calculatedRows.length} employees paid`}
          icon={CheckCircle2}
        />
        <div className={`op-metric op-balance-highlight-metric ${totalRemaining > 0 ? "has-due" : "all-settled"}`}>
          <header>
            <span>Remaining Balance Due</span>
            <WalletCards size={20} />
          </header>
          <b>{money(totalRemaining)}</b>
          <small>
            {totalRemaining > 0
              ? `${pendingCount} employee(s) pending payment`
              : "All employee salaries settled"}
          </small>
        </div>
      </section>

      {/* Salary Table */}
      {filteredRows.length ? (
        <div className="op-salary-table-wrap">
          <Table
            headers={[
              "Employee",
              "Attendance",
              "Daily rate & Gross",
              "Adjustments",
              "Net Salary",
              "Paid Amount",
              "Remaining Balance",
              "Salary Slip",
            ]}
          >
            {filteredRows.map(({ preview, employee, saved, paid, balance, periodBalance, status }) => (
              <Row key={preview.employeeId}>
                <div>
                  <button
                    className="op-name-button"
                    onClick={() =>
                      openEmployeeRecord
                        ? openEmployeeRecord(preview.employeeId)
                        : setSelectedSlip({ preview, employee, saved })
                    }
                    title="Click to view details"
                  >
                    {employee?.name ?? "Unknown"}
                  </button>
                  <small className="op-subtext">
                    Monthly: {money(employee?.monthlySalary ?? 0)}
                  </small>
                </div>

                <div className="op-attendance-cell">
                  <span
                    className={`op-attendance-pill ${
                      preview.presentDays > 0 ? "present" : "none"
                    }`}
                  >
                    <b>{preview.presentDays}</b> / {preview.totalDays} Present days
                  </span>
                </div>

                <div className="op-daily-rate-cell">
                  <strong className="op-gross-val">{money(preview.gross)}</strong>
                  <small className="op-subtext">
                    {preview.rateBreakdown
                      .map(
                        (item) =>
                          `${item.days}d × ${money(item.dailyRate)} ${
                            item.location !== "Standard" ? `(${item.location})` : ""
                          }`
                      )
                      .join(" + ") || `${preview.presentDays}d × ₹0`}
                  </small>
                </div>

                <div className="op-adjustments-cell">
                  {preview.advanceRecovery > 0 && (
                    <span
                      className="op-adj-tag adv"
                      title={`Advance recovery: ${money(preview.advanceRecovery)} deducted from this salary (Total advance: ${money(preview.totalAdvance)}${preview.remainingAdvance > 0 ? `, Remaining balance: ${money(preview.remainingAdvance)}` : ""})`}
                    >
                      −{money(preview.advanceRecovery)} adv
                      {preview.totalAdvance > preview.advanceRecovery && (
                        <small style={{ marginLeft: 3, opacity: 0.85 }}>({money(preview.totalAdvance)} total)</small>
                      )}
                    </span>
                  )}
                  {preview.reimbursements > 0 && (
                    <span className="op-adj-tag reimb" title="Reimbursement / Extras">
                      +{money(preview.reimbursements)}
                    </span>
                  )}
                  {preview.deductions > 0 && (
                    <span className="op-adj-tag deduct" title="Salary Deduction">
                      −{money(preview.deductions)}
                    </span>
                  )}
                  {preview.reimbursements === 0 &&
                    preview.deductions === 0 &&
                    preview.advanceRecovery === 0 && (
                      <span className="op-text-muted">—</span>
                    )}
                </div>

                <div>
                  <strong className="op-net-salary-val">{money(preview.net)}</strong>
                </div>

                <div className="op-paid-input-cell">
                  <div className="op-paid-input-wrap">
                    <span className="op-currency-prefix">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={`op-salary-paid-field ${
                        (saved?.status === "Paid" || paid >= preview.net)
                          ? "is-paid"
                          : ""
                      }`}
                      aria-label={`Paid amount for ${employee?.name}`}
                      value={paid === 0 && !saved ? "" : paid}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setPayrollStatus(
                          preview,
                          val >= preview.net ? "Paid" : "Pending",
                          val
                        );
                      }}
                    />
                  </div>
                  {(saved?.status === "Paid" || paid >= preview.net) ? (
                    <span className="op-paid-badge-pill" title="Fully settled for this period">
                      <Check size={13} /> Paid
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="op-quick-pay-full-btn"
                      title={`Pay full ${money(preview.net)}`}
                      onClick={() => setPayrollStatus(preview, "Paid", preview.net)}
                    >
                      Pay Full
                    </button>
                  )}
                </div>

                <div className="op-balance-cell">
                  {periodBalance > 0 ? (
                    <>
                      <span className="op-balance-badge due">
                        {money(periodBalance)} Due
                      </span>
                      <small className="op-subtext">{paid > 0 ? `Paid ${money(paid)} of ${money(preview.net)}` : "Pending"}</small>
                    </>
                  ) : preview.remainingAdvance > 0 ? (
                    <>
                      <span className="op-balance-badge advance-owed">
                        −{money(preview.remainingAdvance)} Advance Due
                      </span>
                      <small className="op-subtext">
                        {money(preview.remainingAdvance)} forwarded to next period
                      </small>
                    </>
                  ) : (
                    <>
                      <span className="op-balance-badge settled">
                        ✓ {money(0)} Settled
                      </span>
                      <small className="op-subtext">
                        {preview.advanceRecovery > 0
                          ? "Advance fully recovered"
                          : "All dues paid"}
                      </small>
                    </>
                  )}
                </div>

                <div>
                  <Button
                    secondary
                    onClick={() => setSelectedSlip({ preview, employee, saved })}
                  >
                    <FileText size={15} />
                    Slip / Details
                  </Button>
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
          saved={selectedSlip.saved}
          close={() => setSelectedSlip(null)}
          onSavePayment={(amount) => {
            setPayrollStatus(
              selectedSlip.preview,
              amount >= selectedSlip.preview.net && selectedSlip.preview.net > 0
                ? "Paid"
                : "Pending",
              amount
            );
            setSelectedSlip(null);
          }}
        />
      )}
    </div>
  );
}

export function SalarySlipModal({
  store,
  employee,
  preview,
  saved,
  close,
  onSavePayment,
}: {
  store: FleetStore;
  employee: Employee | undefined;
  preview: PayrollPreview;
  saved: PayrollPayment | undefined;
  close: () => void;
  onSavePayment: (amount: number) => void;
}) {
  const currentPaid =
    saved?.paidAmount ?? (saved?.status === "Paid" ? preview.net : 0);
  const [paymentDraft, setPaymentDraft] = useState<number>(currentPaid);

  const balance = Math.max(0, preview.net - paymentDraft);

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

  // Outstanding advances
  const employeeAdvances = store.advances.filter(
    (adv) => adv.employeeId === preview.employeeId
  );
  const totalAdvanceIssued = employeeAdvances.reduce((sum, a) => sum + a.amount, 0);
  const totalAdvanceRecovered = employeeAdvances.reduce(
    (sum, a) => sum + a.recovered,
    0
  );
  const currentOutstandingAdvance = Math.max(
    0,
    totalAdvanceIssued - totalAdvanceRecovered
  );

  const totalEarnings = preview.gross + preview.reimbursements + preview.carryForward;
  const totalDeductions = preview.deductions + preview.advanceRecovery;

  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog op-salary-slip-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print / PDF Salary Slip
          </Button>
        </div>

        <article className="invoice-sheet op-salary-slip-sheet">
          <header className="invoice-brand">
            <Gauge size={30} />
            <div>
              <h2>{store.company.name}</h2>
            </div>
          </header>

          <h1>EMPLOYEE SALARY SLIP</h1>

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
              <b>Pay Period:</b> {fmt(preview.periodStart)} to {fmt(preview.periodEnd)}
              <br />
              <span>
                {preview.totalDays} calendar days · Payout: {fmt(preview.payoutDate)}
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
                <th colSpan={3}>Base Attendance Gross:</th>
                <th>{money(preview.gross)}</th>
              </tr>
            </tbody>
          </table>

          {/* Itemized Earnings vs Deductions Summary Table */}
          <table className="invoice-expenses op-slip-calc-table">
            <thead>
              <tr>
                <th style={{ width: "65%" }}>Particulars / Salary Adjustments</th>
                <th style={{ width: "35%", textAlign: "center" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>Basic Attendance Gross Pay</b> ({preview.presentDays} days worked)
                </td>
                <td style={{ textAlign: "center" }}>
                  <b>+{money(preview.gross)}</b>
                </td>
              </tr>

              {reimbursementsList.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>Reimbursement / Extra:</b> {item.category} ({item.description})
                  </td>
                  <td style={{ textAlign: "center", color: "#15803d" }}>
                    +{money(item.amount)}
                  </td>
                </tr>
              ))}

              {deductionsList.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>Salary Deduction:</b> {item.category} ({item.description})
                  </td>
                  <td style={{ textAlign: "center", color: "#b91c1c" }}>
                    −{money(item.amount)}
                  </td>
                </tr>
              ))}

              {preview.advanceRecovery > 0 && (
                <tr>
                  <td>
                    <b>Advance Recovery / Deduction</b>
                    <small style={{ display: "block", color: "#666" }}>
                      Total advance taken: {money(preview.totalAdvance)}
                      {preview.remainingAdvance > 0 ? (
                        <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                          {" "}· Remaining balance to recover later: {money(preview.remainingAdvance)}
                        </span>
                      ) : (
                        <span style={{ color: "#15803d", fontWeight: 600 }}>
                          {" "}· Fully recovered
                        </span>
                      )}
                    </small>
                  </td>
                  <td style={{ textAlign: "center", color: "#b91c1c" }}>
                    −{money(preview.advanceRecovery)}
                  </td>
                </tr>
              )}

              <tr className="invoice-grand">
                <th>Total Net Salary Payable:</th>
                <td style={{ textAlign: "center", fontWeight: "800", fontSize: "16px" }}>
                  {money(preview.net)}
                </td>
              </tr>

              <tr>
                <th>Amount Paid / Disbursed:</th>
                <td style={{ textAlign: "center", fontWeight: "700", color: "#047857" }}>
                  {money(paymentDraft)}
                </td>
              </tr>

              <tr className="invoice-grand" style={{ background: balance > 0 ? "#ffe6d5" : "#e6f9ed" }}>
                <th>Period Balance Due:</th>
                <td
                  style={{
                    textAlign: "center",
                    fontWeight: "800",
                    fontSize: "17px",
                    color: balance > 0 ? "#c2410c" : "#15803d",
                  }}
                >
                  {balance > 0 ? `${money(balance)} (Pending)` : `✓ ${money(0)} (Settled)`}
                </td>
              </tr>

              <tr className="invoice-grand" style={{ background: "#f1f5f9" }}>
                <th>Employee Overall Remaining Balance:</th>
                <td
                  style={{
                    textAlign: "center",
                    fontWeight: "800",
                    fontSize: "17px",
                    color:
                      calculateEmployeeLedger(store, preview.employeeId).remainingBalance > 0
                        ? "#9a493d"
                        : calculateEmployeeLedger(store, preview.employeeId).remainingBalance < 0
                        ? "#b45309"
                        : "#1f6a53",
                  }}
                >
                  {calculateEmployeeLedger(store, preview.employeeId).remainingBalance < 0
                    ? `−${money(Math.abs(calculateEmployeeLedger(store, preview.employeeId).remainingBalance))} (Advance Due)`
                    : calculateEmployeeLedger(store, preview.employeeId).remainingBalance > 0
                    ? `${money(calculateEmployeeLedger(store, preview.employeeId).remainingBalance)} (Pending)`
                    : `✓ ${money(0)} (Settled)`}
                </td>
              </tr>
            </tbody>
          </table>

          <footer className="invoice-footer">
            <div>
              <h3>Payment Notes</h3>
              <p>
                <b>Status:</b>{" "}
                {balance === 0 && paymentDraft > 0
                  ? "Fully Paid & Settled"
                  : paymentDraft > 0
                  ? "Partially Paid"
                  : "Payment Pending"}
              </p>
              <p>
                <b>Slip Generated:</b> {fmt(isoToday())}
              </p>
              <p>
                This salary statement is a computer-generated voucher and reflects complete attendance, addition, and deduction records.
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

        {/* Screen-Only Payment Recorder Card */}
        <section className="op-slip-screen-payment-card">
          <h4>Record or Update Payment Amount</h4>
          <div className="op-slip-payment-controls">
            <label className="op-field">
              <span>Amount Paid (₹)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={paymentDraft === 0 && !saved ? "" : paymentDraft}
                placeholder="Enter paid amount"
                onChange={(e) => setPaymentDraft(Number(e.target.value) || 0)}
              />
            </label>
            <Button
              secondary
              onClick={() => setPaymentDraft(preview.net)}
              type="button"
            >
              Pay Full ({money(preview.net)})
            </Button>
            <Button
              onClick={() => {
                onSavePayment(paymentDraft);
                close();
              }}
            >
              <Check size={16} />
              Save Payment & Close
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}