"use client";

import { useState } from "react";
import Image from "next/image";
import { Banknote, CalendarDays, FileText, Pencil, Printer, ReceiptText, WalletCards, X } from "lucide-react";
import {
  addDays, Bill, BillCharge, calculateBillTotal, calculateEmployeeLedger, calculatePayrollRange, FleetStore, getAdvanceOutstanding, getEmployeeAdvancesWithRecoveries, getEmployeeCurrentStatus, groupAttendanceRanges, inclusiveDays, rateOnDate,
} from "./fleet-domain";
import { Button, Modal, Status } from "./operations-components";
import {
  billBalance, billPaid, bookingEnd, bookingStatus, bookingVehicleLines,
  calcEmployeeSettlement, campaignSlotKey, fmt, isoToday, money,
} from "./operations-utils";

export function ClientLedgerModal({ store, clientId, close, viewBill }: { store: FleetStore; clientId: number; close: () => void; viewBill: (bill: Bill) => void }) {
  const client = store.clients.find((item) => item.id === clientId);
  if (!client) return null;
  const bills = store.bills.filter((bill) => bill.clientId === clientId);
  const bookings = store.campaignBookings.filter((booking) => booking.clientId === clientId);
  const totalBilled = bills.reduce((sum, bill) => sum + bill.total, 0);
  const totalAdvance = bills.reduce((sum, bill) => sum + bill.advanceReceived, 0);
  const totalInstallments = bills.reduce((sum, bill) => sum + bill.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
  const totalReceived = bills.reduce((sum, bill) => sum + billPaid(bill), 0);
  const balance = bills.reduce((sum, bill) => sum + billBalance(bill), 0);
  const attendanceRecords = bookings.flatMap((booking) => {
    const throughDate = isoToday() < bookingEnd(booking) ? isoToday() : bookingEnd(booking);
    if (throughDate < booking.startDate) return [];
    const days = inclusiveDays(booking.startDate, throughDate);
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(booking.startDate, index);
      const vehicleDays = bookingVehicleLines(store, booking, date).filter((vehicle) => store.vehicleAttendance[date]?.[vehicle.vehicleId] === true).length;
      return { date, vehicleDays };
    });
  });
  const totalPresentDays = attendanceRecords.reduce((sum, item) => sum + item.vehicleDays, 0);
  const transactions = [
    ...bills.map((bill) => ({ key: `bill-${bill.id}`, date: bill.billDate, type: "Invoice generated", detail: `${bill.number} · ${bill.total} total`, status: "Billed", amount: bill.total, bill })),
    ...bills.filter((bill) => bill.advanceReceived > 0).map((bill) => ({ key: `bill-adv-${bill.id}`, date: bill.billDate, type: "Advance received", detail: `${bill.number} booking advance`, status: "Paid", amount: -bill.advanceReceived, bill: undefined })),
    ...bills.flatMap((bill) => (bill.payments ?? []).map((payment) => ({ key: `bill-pay-${payment.id}`, date: payment.date, type: `Payment received (${payment.mode || "Cash"})`, detail: `${bill.number} installment · ${payment.reference || payment.note || "No reference"}`, status: "Paid", amount: -payment.amount, bill: undefined }))),
    ...attendanceRecords.filter((item) => item.vehicleDays > 0).map((item) => ({ key: `att-${item.date}`, date: item.date, type: "Campaign duty", detail: `${item.vehicleDays} vehicle(s) active on campaign`, status: "Present", amount: null, bill: undefined })),
  ].sort((left, right) => right.date.localeCompare(left.date));
  return <Modal title={`${client.firmName} · client ledger`} close={close}><div className="op-client-ledger"><section className="op-ledger-profile"><div><b>{client.firmName}</b><span>{client.ownerName || "No owner name"} · {client.mobile} · {client.email || "No email"}</span><small>{client.address} · {bookings.length} campaign bookings</small></div><div className="op-category-list">{client.categories.map((category) => <span key={category}>{category}</span>)}</div></section><section className="op-ledger-totals"><p><span>Total billed</span><b>{money(totalBilled)}</b></p><p><span>Advance received</span><b>{money(totalAdvance)}</b></p><p><span>Installments received</span><b>{money(totalInstallments)}</b></p><p><span>Total received</span><b>{money(totalReceived)}</b></p><p><span>Outstanding balance</span><strong>{money(balance)}</strong></p><p><span>Present slot-days</span><b>{totalPresentDays}</b></p></section><div className="op-section-title"><h2>Complete client activity history</h2></div>{transactions.length ? <section className="op-ledger-list">{transactions.map((transaction) => <article key={transaction.key}><time>{fmt(transaction.date)}</time><div><b>{transaction.type}</b><small>{transaction.detail}</small></div><Status>{transaction.status}</Status><strong className={transaction.amount !== null && transaction.amount < 0 ? "credit" : ""}>{transaction.amount === null ? "—" : <>{transaction.amount < 0 ? "−" : ""}{money(Math.abs(transaction.amount))}</>}</strong>{transaction.bill && <span className="op-ledger-row-actions">{billBalance(transaction.bill) > 0 && <button title="Receive amount" onClick={() => window.dispatchEvent(new CustomEvent("fleetflow:receive-payment", { detail: transaction.bill!.id }))}><Banknote size={16}/></button>}<button title="View invoice" onClick={() => viewBill(transaction.bill!)}><Printer size={16}/></button></span>}</article>)}</section> : <div className="op-empty-state"><ReceiptText/><h2>No client activity</h2><p>Campaign attendance, bills, advances, and payments will appear here.</p></div>}<footer><Button secondary onClick={close}>Close</Button></footer></div></Modal>;
}

export function EmployeeRecordPrintModal({
  store,
  employee,
  from,
  to,
  currentRate,
  currentStatus,
  presentDays,
  earned,
  advancesPaid,
  deducted,
  remainingBalance,
  attendanceRanges,
  records,
  close,
}: {
  store: FleetStore;
  employee: FleetStore["employees"][number];
  from: string;
  to: string;
  currentRate: ReturnType<typeof rateOnDate>;
  currentStatus: string;
  presentDays: number;
  earned: number;
  advancesPaid: number;
  deducted: number;
  remainingBalance: number;
  attendanceRanges: ReturnType<typeof groupAttendanceRanges>;
  records: {
    key: string;
    date: string;
    type: string;
    detail: string;
    status: string;
    amount: number | null;
  }[];
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
            Print Ledger / PDF
          </Button>
        </div>
        <article className="invoice-sheet op-client-statement-sheet">
          <header className="invoice-brand">
            <ReceiptText size={30} />
            <h2>{store.company.name}</h2>
          </header>
          <h1>EMPLOYEE STATEMENT OF ACCOUNT & LEDGER</h1>
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
              {from && to ? `${fmt(from)} to ${fmt(to)}` : "All Time Records"}
            </p>
            <p>
              <b>Statement Date</b>
              <br />
              {fmt(isoToday())}
            </p>
            <p className="invoice-bill-to">
              <b>Employee Details</b>
              <br />
              <strong>{employee.name}</strong>
              <br />
              <span>
                {currentRate?.location ?? "General"} · {money(currentRate?.dailyRate ?? 0)}/day · Monthly base: {money(employee.monthlySalary)}
                <br />
                Status: {currentStatus} · Present Days: {presentDays}
              </span>
            </p>
          </section>

          {/* Financial Summary */}
          <section className="op-client-print-summary">
            <p>
              <span>Salary Earned</span>
              <strong style={{ color: "#15803d" }}>+{money(earned)}</strong>
            </p>
            <p>
              <span>Advances Paid</span>
              <strong style={{ color: "#b91c1c" }}>−{money(advancesPaid)}</strong>
            </p>
            <p>
              <span>Deducted / Settled</span>
              <strong>{money(deducted)}</strong>
            </p>
            <p>
              <span>Balance Position</span>
              <strong style={{ color: remainingBalance > 0 ? "#15803d" : remainingBalance < 0 ? "#b45309" : "#1f6a53" }}>
                {remainingBalance > 0
                  ? `+${money(remainingBalance)} (Salary Due)`
                  : remainingBalance < 0
                  ? `−${money(Math.abs(remainingBalance))} (Advance Due)`
                  : `✓ ${money(0)} (Settled)`}
              </strong>
            </p>
          </section>

          {attendanceRanges.length > 0 && (
            <>
              <h2 className="op-print-section-title">Attendance History</h2>
              <table className="invoice-expenses op-client-print-table" style={{ marginBottom: "14px" }}>
                <thead>
                  <tr>
                    <th>Period / Date</th>
                    <th>Attendance Status</th>
                    <th>Days</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRanges.map((range, idx) => (
                    <tr key={idx}>
                      <td>{range.startDate === range.endDate ? fmt(range.startDate) : `${fmt(range.startDate)} to ${fmt(range.endDate)}`}</td>
                      <td><b>{range.status}</b></td>
                      <td>{range.days} {range.days === 1 ? "day" : "days"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2 className="op-print-section-title">Advances, Payments & Expenses</h2>
          <table className="invoice-expenses op-client-print-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction / Category</th>
                <th>Details</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((item) => (
                  <tr key={item.key}>
                    <td>{fmt(item.date)}</td>
                    <td><b>{item.type}</b></td>
                    <td>{item.detail}</td>
                    <td>{item.status}</td>
                    <td>{item.amount !== null ? money(item.amount) : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No advance or payment records in selected period</td>
                </tr>
              )}
            </tbody>
          </table>

          <section className="op-invoice-total">
            <p>
              <span>Net Ledger Balance</span>
              <strong style={{ color: remainingBalance > 0 ? "#15803d" : remainingBalance < 0 ? "#b45309" : "#1f6a53" }}>
                {remainingBalance > 0
                  ? `+${money(remainingBalance)} (Salary Due)`
                  : remainingBalance < 0
                  ? `−${money(Math.abs(remainingBalance))} (Advance Due)`
                  : `✓ ${money(0)} (Settled)`}
              </strong>
            </p>
          </section>

          <footer className="invoice-footer">
            <div>
              <h3>Company Payroll Verification</h3>
              <p><b>Prepared For:</b> {employee.name}</p>
              <p><b>Company:</b> {store.company.name}</p>
              <p><b>Account:</b> {store.company.accountName}</p>
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

export function EmployeeRecordModal({
  store,
  employeeId,
  close,
}: {
  store: FleetStore;
  employeeId: number;
  close: () => void;
}) {
  const employee = store.employees.find((item) => item.id === employeeId);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);

  if (!employee) return null;

  const allTimeLedger = calculateEmployeeLedger(store, employeeId);
  const isFiltered = Boolean(from || to);
  const settlement = isFiltered
    ? calcEmployeeSettlement(store, employeeId, from || undefined, to || undefined)
    : null;

  const earned = isFiltered && settlement ? settlement.periodEarned : allTimeLedger.totalSalaryPayable;
  const advancesPaid = isFiltered && settlement ? settlement.periodAdvances : allTimeLedger.totalAdvance;
  const deducted = isFiltered && settlement ? settlement.deductedFromAdvance : Math.min(allTimeLedger.totalAdvance, allTimeLedger.totalSalaryPayable);
  const remainingBalance = isFiltered && settlement ? settlement.carryForwardBalance : allTimeLedger.remainingBalance;

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);

  const advances = getEmployeeAdvancesWithRecoveries(store, employeeId).filter((item) => inRange(item.date));
  const payments = (store.employeePayments ?? []).filter((item) => item.employeeId === employeeId && inRange(item.date));
  const expenses = store.employeeExpenses.filter((item) => item.employeeId === employeeId && inRange(item.date));
  const rates = store.employeeRates.filter((item) => item.employeeId === employeeId).sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom));
  const currentRate = rateOnDate(store.employeeRates, employeeId, to || isoToday());

  // Filter attendance within date range
  const allAttendanceDates = Object.keys(store.attendance).sort();
  const rangeAttendance: Record<string, Record<number, boolean>> = {};
  for (const d of allAttendanceDates) {
    if (inRange(d) && store.attendance[d]?.[employeeId] !== undefined) {
      rangeAttendance[d] = { [employeeId]: store.attendance[d][employeeId] };
    }
  }

  const attendanceRanges = groupAttendanceRanges(rangeAttendance, employeeId);
  const presentDays = attendanceRanges.filter((r) => r.status === "Present").reduce((sum, r) => sum + r.days, 0);

  const records = [
    ...advances.map((item) => ({
      key: `advance-${item.id}`,
      date: item.date,
      type: "Employee advance paid",
      detail: `${item.note || "Advance payment"} · Recovered: ${money(item.recovered)} · Remaining: ${money(item.balance)}`,
      status: item.balance === 0 ? "Recovered" : "Outstanding",
      amount: item.amount as number | null,
    })),
    ...payments.map((item) => ({ key: `payment-${item.id}`, date: item.date, type: `Payment: ${item.paymentType}`, detail: `${item.note || item.reference || "No note"}`, status: "Paid", amount: item.amount as number | null })),
    ...expenses.map((item) => ({ key: `expense-${item.id}`, date: item.date, type: item.category, detail: `${item.description} · ${item.treatment}`, status: item.treatment, amount: item.amount as number | null })),
  ].sort((left, right) => right.date.localeCompare(left.date));

  const currentStatus = getEmployeeCurrentStatus(employee, to || undefined);
  const statusDateText = currentStatus === "Inactive"
    ? employee.activeFrom
      ? `Active from: ${fmt(employee.activeFrom)}`
      : employee.inactiveFrom
      ? `Inactive from: ${fmt(employee.inactiveFrom)}`
      : ""
    : employee.inactiveFrom
    ? `Inactive from: ${fmt(employee.inactiveFrom)}`
    : "";

  return (
    <>
      <Modal title={`${employee.name} · complete record`} close={close}>
        <div className="op-client-ledger op-employee-record">
          <section className="op-ledger-profile">
            <div>
              <b>{employee.name}</b>
              <span>{currentRate?.location ?? "No current location"} · {money(currentRate?.dailyRate ?? 0)}/day · Monthly base: {money(employee.monthlySalary)}</span>
              <small>{currentStatus} · {presentDays} present days {statusDateText ? `· ${statusDateText}` : ""}</small>
            </div>
            <Status>{currentStatus}</Status>
          </section>

          {/* Date Filter Toolbar */}
          <div className="op-toolbar" style={{ background: "#f3f7f4", padding: "10px 14px", borderRadius: "7px", flexWrap: "wrap", gap: "8px", margin: "14px 0" }}>
            <label className="op-field" style={{ margin: 0 }}>
              <span>From Date</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="op-field" style={{ margin: 0 }}>
              <span>To Date</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <Button
              secondary
              onClick={() => {
                setFrom(`${isoToday().slice(0, 7)}-01`);
                setTo(isoToday());
              }}
            >
              This Month
            </Button>
            <Button
              secondary
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              All Time
            </Button>
            <Button secondary onClick={() => setPrintModalOpen(true)}>
              <Printer size={16} />
              Print record
            </Button>
          </div>

          <section className="op-ledger-totals">
            <p>
              <span>{isFiltered ? "Salary in period" : "Total salary earned"}</span>
              <b style={{ color: "#15803d" }}>+{money(earned)}</b>
            </p>
            <p>
              <span>{isFiltered ? "Advances in period" : "Total advances paid"}</span>
              <b style={{ color: "#b91c1c" }}>−{money(advancesPaid)}</b>
            </p>
            <p>
              <span>Deducted from advance</span>
              <b>{money(deducted)}</b>
            </p>
            <p>
              <span>{isFiltered ? "Period balance" : "Remaining balance"}</span>
              <strong style={{ color: remainingBalance > 0 ? "#15803d" : remainingBalance < 0 ? "#b45309" : "#1f6a53" }}>
                {remainingBalance > 0
                  ? `+${money(remainingBalance)} (Salary Due)`
                  : remainingBalance < 0
                  ? `−${money(Math.abs(remainingBalance))} (Advance Due)`
                  : `✓ ${money(0)} (Settled)`}
              </strong>
            </p>
          </section>

          <div className="op-section-title">
            <h2>Attendance summary ({attendanceRanges.reduce((sum, r) => sum + r.days, 0)} days recorded)</h2>
          </div>
          {attendanceRanges.length ? (
            <section className="op-history">
              {attendanceRanges.map((range, idx) => (
                <p key={idx}>
                  <b>{range.startDate === range.endDate ? fmt(range.startDate) : `${fmt(range.startDate)} – ${fmt(range.endDate)}`}</b>
                  <span>{range.status}</span>
                  <small>{range.days} {range.days === 1 ? "day" : "days"}</small>
                </p>
              ))}
            </section>
          ) : (
            <div className="op-empty-state">
              <CalendarDays/>
              <h2>No attendance records</h2>
            </div>
          )}

          <div className="op-section-title">
            <h2>Advance & expense history ({records.length} records in range)</h2>
          </div>
          {records.length ? (
            <section className="op-ledger-list">
              {records.map((record) => (
                <article key={record.key}>
                  <time>{fmt(record.date)}</time>
                  <div>
                    <b>{record.type}</b>
                    <small>{record.detail}</small>
                  </div>
                  <Status>{record.status}</Status>
                  <strong>{record.amount === null ? "—" : money(record.amount)}</strong>
                </article>
              ))}
            </section>
          ) : (
            <div className="op-empty-state">
              <ReceiptText/>
              <h2>No advance or payment records</h2>
              <p>Advances and expenses will appear here.</p>
            </div>
          )}

          <div className="op-section-title">
            <h2>Rate and location history</h2>
          </div>
          {rates.length ? (
            <section className="op-history op-employee-rate-history">
              {rates.map((rate) => (
                <p key={rate.id}>
                  <b>{rate.location}</b>
                  <span>{money(rate.dailyRate)}/day</span>
                  <small>{fmt(rate.effectiveFrom)} to {rate.effectiveTo ? fmt(rate.effectiveTo) : "Current"}</small>
                </p>
              ))}
            </section>
          ) : (
            <div className="op-empty-state">
              <WalletCards/>
              <h2>No rate history</h2>
              <p>Add a rate or transfer record for this employee.</p>
            </div>
          )}

          <footer>
            <Button secondary onClick={() => setPrintModalOpen(true)}>
              <Printer size={16} />
              Print record
            </Button>
            <Button secondary onClick={close}>Close</Button>
          </footer>
        </div>
      </Modal>

      {printModalOpen && (
        <EmployeeRecordPrintModal
          store={store}
          employee={employee}
          from={from}
          to={to}
          currentRate={currentRate}
          currentStatus={currentStatus}
          presentDays={presentDays}
          earned={earned}
          advancesPaid={advancesPaid}
          deducted={deducted}
          remainingBalance={remainingBalance}
          attendanceRanges={attendanceRanges}
          records={records}
          close={() => setPrintModalOpen(false)}
        />
      )}
    </>
  );
}

export function EmployeeAdvanceHistoryModal({
  store,
  employeeId,
  close,
  editAdvance,
}: {
  store: FleetStore;
  employeeId: number;
  close: () => void;
  editAdvance?: (advanceId: number) => void;
}) {
  const employee = store.employees.find((item) => item.id === employeeId);
  if (!employee) return null;

  const advances = getEmployeeAdvancesWithRecoveries(store, employeeId).sort((a, b) => b.date.localeCompare(a.date));
  const totalAdvance = advances.reduce((sum, item) => sum + item.amount, 0);
  const outstanding = getAdvanceOutstanding(store, employeeId);
  const totalRecovered = Math.max(0, totalAdvance - outstanding);

  return (
    <Modal title={`${employee.name} · Advance History`} close={close}>
      <div className="op-client-ledger op-employee-record">
        <section className="op-ledger-profile">
          <div>
            <b>{employee.name}</b>
            <span>Status: {employee.status} · Monthly salary base: {money(employee.monthlySalary)}</span>
            <small>{advances.length} advance record(s) on file</small>
          </div>
          <Status>{outstanding > 0 ? "Advance Pending" : "Fully Recovered"}</Status>
        </section>

        <section className="op-ledger-totals">
          <p>
            <span>Total Advances Taken</span>
            <b>{money(totalAdvance)}</b>
          </p>
          <p>
            <span>Salary Deducted</span>
            <b style={{ color: "#15803d" }}>{money(totalRecovered)}</b>
          </p>
          <p>
            <span>Remaining Outstanding</span>
            <strong style={{ color: outstanding > 0 ? "#b45309" : "#15803d" }}>{money(outstanding)}</strong>
          </p>
        </section>

        <div className="op-section-title">
          <h2>Advance Records</h2>
        </div>
        {advances.length ? (
          <section className="op-ledger-list">
            {advances.map((advance) => (
              <article key={advance.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <time>{fmt(advance.date)}</time>
                <div style={{ flex: 1 }}>
                  <b>{advance.note || "Employee Advance"}</b>
                  <small>
                    Taken: {money(advance.amount)} · Recovered: {money(advance.recovered)} · Remaining: {money(advance.balance)}
                  </small>
                </div>
                <Status>{advance.balance === 0 ? "Recovered" : "Outstanding"}</Status>
                <strong className={advance.balance > 0 ? "" : "credit"}>
                  {money(advance.amount)}
                </strong>
                {editAdvance && (
                  <button
                    type="button"
                    className="op-icon"
                    title="Edit advance"
                    style={{
                      background: "#f1f5f3",
                      border: "1px solid #dce4df",
                      borderRadius: "6px",
                      padding: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      color: "#14493a",
                    }}
                    onClick={() => {
                      editAdvance(advance.id);
                      close();
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </article>
            ))}
          </section>
        ) : (
          <div className="op-empty-state">
            <Banknote />
            <h2>No Advance Records</h2>
            <p>No advances recorded for this employee.</p>
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