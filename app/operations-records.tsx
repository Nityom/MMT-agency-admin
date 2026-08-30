"use client";

import { Banknote, CalendarDays, Printer, ReceiptText, WalletCards } from "lucide-react";
import {
  addDays, Bill, BillCharge, calculateBillTotal, calculateEmployeeLedger, FleetStore, getEmployeeAdvancesWithRecoveries, groupAttendanceRanges, inclusiveDays, rateOnDate,
} from "./fleet-domain";
import { Button, Modal, Status } from "./operations-components";
import {
  billBalance, billPaid, bookingEnd, bookingStatus, bookingVehicleLines,
  campaignSlotKey, fmt, isoToday, money,
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
    ...bills.map((bill) => ({ key: `bill-${bill.id}`, date: bill.billDate, type: "Invoice generated", detail: `${bill.number} · ${bill.total} total`, status: billBalance(bill) > 0 ? "Pending" : "Paid", amount: bill.total, bill })),
    ...bills.filter((bill) => bill.advanceReceived > 0).map((bill) => ({ key: `bill-adv-${bill.id}`, date: bill.billDate, type: "Advance received", detail: `${bill.number} booking advance`, status: "Paid", amount: -bill.advanceReceived, bill: undefined })),
    ...bills.flatMap((bill) => (bill.payments ?? []).map((payment) => ({ key: `bill-pay-${payment.id}`, date: payment.date, type: `Payment received (${payment.mode || "Cash"})`, detail: `${bill.number} installment · ${payment.reference || payment.note || "No reference"}`, status: "Paid", amount: -payment.amount, bill: undefined }))),
    ...attendanceRecords.filter((item) => item.vehicleDays > 0).map((item) => ({ key: `att-${item.date}`, date: item.date, type: "Campaign duty", detail: `${item.vehicleDays} vehicle(s) active on campaign`, status: "Present", amount: null, bill: undefined })),
  ].sort((left, right) => right.date.localeCompare(left.date));
  return <Modal title={`${client.firmName} · client ledger`} close={close}><div className="op-client-ledger"><section className="op-ledger-profile"><div><b>{client.firmName}</b><span>{client.ownerName || "No owner name"} · {client.mobile} · {client.email || "No email"}</span><small>{client.address} · {bookings.length} campaign bookings</small></div><div className="op-category-list">{client.categories.map((category) => <span key={category}>{category}</span>)}</div></section><section className="op-ledger-totals"><p><span>Total billed</span><b>{money(totalBilled)}</b></p><p><span>Advance received</span><b>{money(totalAdvance)}</b></p><p><span>Installments received</span><b>{money(totalInstallments)}</b></p><p><span>Total received</span><b>{money(totalReceived)}</b></p><p><span>Outstanding balance</span><strong>{money(balance)}</strong></p><p><span>Present slot-days</span><b>{totalPresentDays}</b></p></section><div className="op-section-title"><h2>Complete client activity history</h2></div>{transactions.length ? <section className="op-ledger-list">{transactions.map((transaction) => <article key={transaction.key}><time>{fmt(transaction.date)}</time><div><b>{transaction.type}</b><small>{transaction.detail}</small></div><Status>{transaction.status}</Status><strong className={transaction.amount !== null && transaction.amount < 0 ? "credit" : ""}>{transaction.amount === null ? "—" : <>{transaction.amount < 0 ? "−" : ""}{money(Math.abs(transaction.amount))}</>}</strong>{transaction.bill && <span className="op-ledger-row-actions">{billBalance(transaction.bill) > 0 && <button title="Receive amount" onClick={() => window.dispatchEvent(new CustomEvent("fleetflow:receive-payment", { detail: transaction.bill!.id }))}><Banknote size={16}/></button>}<button title="View invoice" onClick={() => viewBill(transaction.bill!)}><Printer size={16}/></button></span>}</article>)}</section> : <div className="op-empty-state"><ReceiptText/><h2>No client activity</h2><p>Campaign attendance, bills, advances, and payments will appear here.</p></div>}<footer><Button secondary onClick={close}>Close</Button></footer></div></Modal>;
}

export function EmployeeRecordModal({ store, employeeId, close }: { store: FleetStore; employeeId: number; close: () => void }) {
  const employee = store.employees.find((item) => item.id === employeeId);
  if (!employee) return null;
  
  const ledger = calculateEmployeeLedger(store, employeeId);
  const payroll = store.payrollPayments.filter((item) => item.employeeId === employeeId);
  const advances = getEmployeeAdvancesWithRecoveries(store, employeeId);
  const payments = (store.employeePayments ?? []).filter((item) => item.employeeId === employeeId);
  const expenses = store.employeeExpenses.filter((item) => item.employeeId === employeeId);
  const rates = store.employeeRates.filter((item) => item.employeeId === employeeId).sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom));
  const currentRate = rateOnDate(store.employeeRates, employeeId, isoToday());
  
  const attendanceRanges = groupAttendanceRanges(store.attendance, employeeId);
  const presentDays = attendanceRanges.filter((r) => r.status === "Present").reduce((sum, r) => sum + r.days, 0);
  
  const records = [
    ...payroll.map((item) => ({ key: `payroll-${item.id}`, date: item.paidAt ?? item.payoutDate, type: item.status === "Paid" ? "Salary paid" : "Salary pending", detail: `${fmt(item.periodStart)} to ${fmt(item.periodEnd)} · Gross ${money(item.gross)} · Extras ${money(item.reimbursements)} · Deductions ${money(item.deductions)} · Advance recovery ${money(item.advanceRecovery)}`, status: item.status, amount: item.net as number | null })),
    ...advances.map((item) => ({ key: `advance-${item.id}`, date: item.date, type: "Employee advance", detail: `${item.note || "No note"} · Recovered ${money(item.recovered)} · Outstanding ${money(Math.max(0, item.amount - item.recovered))}`, status: item.amount <= item.recovered ? "Recovered" : "Outstanding", amount: item.amount as number | null })),
    ...payments.map((item) => ({ key: `payment-${item.id}`, date: item.date, type: `Payment: ${item.paymentType}`, detail: `${item.note || item.reference || "No note"}`, status: "Paid", amount: item.amount as number | null })),
    ...expenses.map((item) => ({ key: `expense-${item.id}`, date: item.date, type: item.category, detail: `${item.description} · ${item.treatment}`, status: item.treatment, amount: item.amount as number | null })),
  ].sort((left, right) => right.date.localeCompare(left.date));
  
  return <Modal title={`${employee.name} · complete record`} close={close}><div className="op-client-ledger op-employee-record"><section className="op-ledger-profile"><div><b>{employee.name}</b><span>{currentRate?.location ?? "No current location"} · {money(currentRate?.dailyRate ?? 0)}/day · Monthly: {money(employee.monthlySalary)}</span><small>{employee.status} · {presentDays} present days</small></div><Status>{employee.status}</Status></section><section className="op-ledger-totals"><p><span>Total payable</span><b>{money(ledger.totalSalaryPayable)}</b></p><p><span>Total paid</span><b>{money(ledger.totalPaid)}</b></p><p><span>Remaining balance</span><strong>{money(ledger.remainingBalance)}</strong></p><p><span>Total advance</span><b>{money(ledger.totalAdvance)}</b></p><p><span>Advance outstanding</span><strong>{money(ledger.advanceOutstanding)}</strong></p></section><div className="op-section-title"><h2>Attendance summary</h2></div>{attendanceRanges.length ? <section className="op-history">{attendanceRanges.map((range, idx) => <p key={idx}><b>{range.startDate === range.endDate ? fmt(range.startDate) : `${fmt(range.startDate)} – ${fmt(range.endDate)}`}</b><span>{range.status}</span><small>{range.days} {range.days === 1 ? "day" : "days"}</small></p>)}</section> : <div className="op-empty-state"><CalendarDays/><h2>No attendance records</h2></div>}<div className="op-section-title"><h2>Payment & expense history</h2></div>{records.length ? <section className="op-ledger-list">{records.map((record) => <article key={record.key}><time>{fmt(record.date)}</time><div><b>{record.type}</b><small>{record.detail}</small></div><Status>{record.status}</Status><strong>{record.amount === null ? "—" : money(record.amount)}</strong></article>)}</section> : <div className="op-empty-state"><ReceiptText/><h2>No payment records</h2><p>Salary, advances, expenses, and payments will appear here.</p></div>}<div className="op-section-title"><h2>Rate and location history</h2></div>{rates.length ? <section className="op-history op-employee-rate-history">{rates.map((rate) => <p key={rate.id}><b>{rate.location}</b><span>{money(rate.dailyRate)}/day</span><small>{fmt(rate.effectiveFrom)} to {rate.effectiveTo ? fmt(rate.effectiveTo) : "Current"}</small></p>)}</section> : <div className="op-empty-state"><WalletCards/><h2>No rate history</h2><p>Add a rate or transfer record for this employee.</p></div>}<footer><Button secondary onClick={close}>Close</Button></footer></div></Modal>;
}

export function EmployeeAdvanceHistoryModal({ store, employeeId, close }: { store: FleetStore; employeeId: number; close: () => void }) {
  const employee = store.employees.find((item) => item.id === employeeId);
  if (!employee) return null;

  const advances = getEmployeeAdvancesWithRecoveries(store, employeeId).sort((a, b) => b.date.localeCompare(a.date));
  const totalAdvance = advances.reduce((sum, item) => sum + item.amount, 0);
  const totalRecovered = advances.reduce((sum, item) => sum + item.recovered, 0);
  const outstanding = Math.max(0, totalAdvance - totalRecovered);

  const payrollRecoveries = store.payrollPayments
    .filter((p) => p.employeeId === employeeId && p.advanceRecovery > 0)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));

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
            <span>Total Recovered</span>
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
            {advances.map((advance) => {
              const bal = Math.max(0, advance.amount - advance.recovered);
              return (
                <article key={advance.id}>
                  <time>{fmt(advance.date)}</time>
                  <div>
                    <b>{advance.note || "Employee Advance"}</b>
                    <small>
                      Taken: {money(advance.amount)} · Recovered: {money(advance.recovered)} · Remaining: {money(bal)}
                    </small>
                  </div>
                  <Status>{bal === 0 ? "Recovered" : "Outstanding"}</Status>
                  <strong className={bal > 0 ? "" : "credit"}>
                    {money(advance.amount)}
                  </strong>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="op-empty-state">
            <Banknote />
            <h2>No Advance Records</h2>
            <p>No advances recorded for this employee.</p>
          </div>
        )}

        <div className="op-section-title">
          <h2>Salary Recovery History</h2>
        </div>
        {payrollRecoveries.length ? (
          <section className="op-ledger-list">
            {payrollRecoveries.map((p) => (
              <article key={p.id}>
                <time>{fmt(p.paidAt ?? p.payoutDate)}</time>
                <div>
                  <b>Salary Advance Deduction</b>
                  <small>
                    Period: {fmt(p.periodStart)} – {fmt(p.periodEnd)} · Gross: {money(p.gross)} · Net Paid: {money(p.paidAmount ?? p.net)}
                  </small>
                </div>
                <Status>{p.status}</Status>
                <strong style={{ color: "#15803d" }}>−{money(p.advanceRecovery)}</strong>
              </article>
            ))}
          </section>
        ) : (
          <div className="op-empty-state">
            <ReceiptText />
            <h2>No Salary Recoveries Yet</h2>
            <p>Advance deductions will appear here when salary is paid.</p>
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