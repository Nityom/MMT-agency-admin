"use client";

import { Banknote, CalendarDays, Check, Download, Plus, Search, WalletCards, X } from "lucide-react";
import type { Employee, EmployeeRate, FleetStore, PayrollPayment, PayrollPreview } from "./fleet-domain";
import { Actions, AttendanceCalendar, Button, Row, Status, Table } from "./operations-components";
import { Metric, PageHead, PayrollAdvanceRecovery } from "./operations-reports";
import { fmt, money } from "./operations-utils";

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

export function AttendanceView({ store, attendanceDate, attendanceDirty, attendanceRows, allEmployees, activeEmployeeIds, selectAttendanceDate, markAllPresent, markAllAbsent, setEmployeeAttendance, saveAttendance, attendanceReportFrom, attendanceReportTo, setAttendanceReportFrom, setAttendanceReportTo }: AttendanceViewProps) {
  const reportDates = Object.keys(store.attendance).filter((date) => date >= attendanceReportFrom && date <= attendanceReportTo).sort();
  return <><PageHead title="Daily attendance" detail="Record attendance for all active employees, with or without a campaign"/><div className="op-attendance-layout"><AttendanceCalendar key={attendanceDate.slice(0, 7)} selected={attendanceDate} attendance={store.attendance} employeeIds={activeEmployeeIds} onSelect={selectAttendanceDate}/><section className="op-attendance-sheet"><div className="op-toolbar"><label className="op-field"><span>Attendance date</span><input type="date" value={attendanceDate} onChange={(event) => selectAttendanceDate(event.target.value)}/></label><Button secondary onClick={markAllPresent}>Mark all present</Button><Button secondary onClick={markAllAbsent}>Mark all absent</Button><span className="op-attendance-save-top"><Button onClick={saveAttendance}><Check size={17}/>Save attendance</Button></span></div>{attendanceDirty && <p className="op-unsaved">Unsaved changes</p>}{attendanceRows.length ? <Table headers={["Employee", "Location and rate", "Present", "Absent"]}>{attendanceRows.map(({ employee, rate, present }) => <Row key={employee.id}><b>{employee.name}</b><span>{rate?.location ?? "No rate"} · {money(rate?.dailyRate ?? 0)}/day</span><button className={`op-attendance ${present ? "active" : ""}`} onClick={() => setEmployeeAttendance(employee.id, true)}><Check/>Present</button><button className={`op-attendance ${present === false ? "absent" : ""}`} onClick={() => setEmployeeAttendance(employee.id, false)}><X/>Absent</button></Row>)}</Table> : <div className="op-empty-state"><CalendarDays/><h2>No active employees</h2><p>Add or activate an employee before recording attendance.</p></div>}<div className="op-attendance-save-bottom"><Button onClick={saveAttendance}><Check size={17}/>Save attendance</Button></div></section></div><section className="op-section-title"><h2>Attendance report</h2></section><div className="op-toolbar"><label className="op-field"><span>From</span><input type="date" value={attendanceReportFrom} onChange={(event) => setAttendanceReportFrom(event.target.value)}/></label><label className="op-field"><span>To</span><input type="date" value={attendanceReportTo} onChange={(event) => setAttendanceReportTo(event.target.value)}/></label></div><Table headers={["Employee", "Status", "Present days", "Absent days", "Recorded days"]}>{allEmployees.map((employee) => { const present = reportDates.filter((date) => store.attendance[date]?.[employee.id] === true).length; const absent = reportDates.filter((date) => store.attendance[date]?.[employee.id] === false).length; return <Row key={`report-${employee.id}`}><b>{employee.name}</b><Status>{employee.status}</Status><strong>{present}</strong><strong>{absent}</strong><span>{present + absent}</span></Row>; })}</Table></>;
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

export function EmployeesView({ store, search, employeeRows, employeeRateHistory, setSearch, addEmployee, addRate, openEmployeeRecord, editEmployee, removeEmployee }: EmployeesViewProps) {
  return <><PageHead title="Employees" detail="Click an employee name to view payroll, advances, attendance, and all past records" action="Add employee" onAction={addEmployee}/><div className="op-toolbar"><label className="op-search"><Search/><input placeholder="Search employee or location" value={search} onChange={(event) => setSearch(event.target.value)}/></label><Button secondary onClick={addRate}><Plus/>Add rate / transfer</Button></div><Table headers={["Employee", "Current location", "Daily rate", "Effective from", "Status", ""]}>{employeeRows.map(({ employee, rate }) => <Row key={employee.id}><button className="op-name-button" onClick={() => openEmployeeRecord(employee.id)}>{employee.name}</button><span>{rate?.location ?? "No location"}</span><strong>{money(rate?.dailyRate ?? 0)}/day</strong><span>{fmt(rate?.effectiveFrom ?? "")}</span><Status>{employee.status}</Status><Actions edit={() => editEmployee(employee.id)} remove={() => removeEmployee(employee.id)}/></Row>)}</Table><section className="op-history"><h2>Rate and location history</h2>{employeeRateHistory.map((rate) => <p key={rate.id}><b>{store.employees.find((item) => item.id === rate.employeeId)?.name}</b><span>{rate.location} · {money(rate.dailyRate)}/day</span><small>{fmt(rate.effectiveFrom)} to {rate.effectiveTo ? fmt(rate.effectiveTo) : "Current"}</small></p>)}</section></>;
}

export type PayrollRow = { preview: PayrollPreview; employee: Employee | undefined; saved: PayrollPayment | undefined };

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
  setPayrollWeek: (week: string) => void;
  releasePayroll: () => void;
  setPayrollStatus: (preview: PayrollPreview, status: "Pending" | "Paid", paidAmount?: number) => void;
  exportPayroll: () => void;
};

export function PayrollView({ store, payrollWeek, payrollPeriodEnd, payrollPayoutDate, payrollRows, payrollGrossTotal, payrollAdvanceRecoveryTotal, payrollRemainingAdvanceTotal, payrollNetTotal, setPayrollWeek, releasePayroll, setPayrollStatus, exportPayroll }: PayrollViewProps) {
  return <><PageHead title="Weekly payroll" detail="Monday–Sunday attendance, paid following Monday" action="Release all" onAction={releasePayroll}/><section className="op-toolbar"><label className="op-field"><span>Week starts Monday</span><input type="date" value={payrollWeek} onChange={(event) => setPayrollWeek(event.target.value)}/></label><Button secondary onClick={exportPayroll}><Download size={16}/>Export salary</Button><p className="op-pay-date"><CalendarDays/>Period {fmt(payrollWeek)}–{fmt(payrollPeriodEnd)}<b>Payout {fmt(payrollPayoutDate)}</b></p></section><section className="op-metrics three"><Metric label="Gross payable" value={money(payrollGrossTotal)} detail="After extras and deductions" icon={Banknote}/><Metric label="Advance recovery" value={money(payrollAdvanceRecoveryTotal)} detail={`${money(payrollRemainingAdvanceTotal)} remains for future payroll`} icon={WalletCards}/><Metric label="Net payout" value={money(payrollNetTotal)} detail="Final amount to release" icon={Check}/></section><Table headers={["Employee", "Present", "Rate breakdown", "Gross", "Extras / deductions", "Advance recovery", "Salary", "Amount paid", "Balance"]}>{payrollRows.map(({ preview, employee, saved }) => { const paid = saved?.paidAmount ?? 0; const balance = preview.net - paid; return <Row key={preview.employeeId}><b>{employee?.name}<small><Status>{saved?.status ?? "Pending"}</Status></small></b><span>{preview.presentDays}/7 days</span><span>{preview.rateBreakdown.map((item) => `${item.days}d × ${money(item.dailyRate)} ${item.location}`).join(" + ") || "No payable attendance"}{preview.carryForward > 0 && <small>Carry forward {money(preview.carryForward)}</small>}</span><strong>{money(preview.gross)}</strong><span>+{money(preview.reimbursements)} / −{money(preview.deductions)}</span><PayrollAdvanceRecovery store={store} preview={preview}/><strong>{money(preview.net)}</strong><input className="op-number-input" type="number" min="0" step="0.01" aria-label={`Amount paid for ${employee?.name ?? "employee"}`} value={saved?.paidAmount ?? ""} placeholder="Enter amount" onChange={(event) => { const val = Number(event.target.value); setPayrollStatus(preview, val > 0 ? "Paid" : "Pending", val); }}/><strong className={balance < 0 ? "is-negative" : balance === 0 && paid > 0 ? "op-profit" : ""}>{money(balance)}</strong></Row>; })}</Table></>;
}