"use client";

import { Banknote, CalendarDays, Printer, ReceiptText, WalletCards } from "lucide-react";
import {
  addDays, Bill, BillCharge, calculateBillTotal, calculateEmployeeLedger, FleetStore, groupAttendanceRanges, inclusiveDays, rateOnDate,
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
    return Array.from({ length: inclusiveDays(booking.startDate, throughDate) }, (_, offset) => addDays(booking.startDate, offset)).flatMap((date) => {
      const periods = booking.vehiclePeriods.filter((period) => period.startDate <= date && period.endDate >= date);
      const slots = periods.flatMap((period) => Array.from({ length: period.quantity }, (_, slotIndex) => ({ key: campaignSlotKey(booking.id, period.id, slotIndex), legacyVehicleId: period.vehicleIds[slotIndex] })));
      if (!slots.length) return [];
      const presentSlots = slots.filter((slot) => store.campaignAttendance[date]?.[slot.key] ?? (slot.legacyVehicleId ? store.vehicleAttendance[date]?.[slot.legacyVehicleId] : false)).length;
      const absentSlots = slots.length - presentSlots;
      return [{ key: `attendance-${booking.id}-${date}`, date, type: "Campaign attendance", detail: `${presentSlots}/${slots.length} slots active · Campaign ${fmt(booking.startDate)} to ${fmt(bookingEnd(booking))}`, status: presentSlots === slots.length ? "Present" : presentSlots ? "Partial" : "Not Marked", presentSlots }];
    });
  });
  const totalPresentDays = attendanceRecords.reduce((sum, record) => sum + record.presentSlots, 0);
  const bookingRows = bookings.map((booking) => { const charges: BillCharge[] = booking.facilities.map((facility) => ({ ...facility, amount: facility.quantity * facility.rate })); return { key: `booking-${booking.id}`, date: booking.startDate, type: "Campaign booking", detail: `${fmt(booking.startDate)} to ${fmt(bookingEnd(booking))} · ${booking.vehiclePeriods.length} vehicle intervals`, status: bookingStatus(booking), amount: calculateBillTotal(bookingVehicleLines(store, booking, isoToday() < bookingEnd(booking) ? isoToday() : bookingEnd(booking)), charges) as number | null, bill: undefined as Bill | undefined }; });
  const attendanceRows = attendanceRecords.map((record) => ({ key: record.key, date: record.date, type: record.type, detail: record.detail, status: record.status, amount: null as number | null, bill: undefined as Bill | undefined }));
  const billRows = bills.map((bill) => ({ key: `bill-${bill.id}`, date: bill.billDate, type: `Invoice INV-${String(bill.number).padStart(4, "0")}`, detail: `Billing date ${fmt(bill.billDate)} · Total ${money(bill.total)} · Balance ${money(billBalance(bill))}`, status: billBalance(bill) ? "Pending" : "Paid", amount: bill.total as number | null, bill }));
  const paymentRows = bills.flatMap((bill) => [...(bill.advanceReceived ? [{ key: `advance-${bill.id}`, date: bill.billDate, type: "Advance received", detail: `${bill.paymentMode} · Billing date ${fmt(bill.billDate)} · INV-${String(bill.number).padStart(4, "0")}`, status: "Received", amount: -bill.advanceReceived as number | null, bill: undefined as Bill | undefined }] : []), ...bill.payments.map((payment) => ({ key: `payment-${bill.id}-${payment.id}`, date: payment.date, type: "Payment received", detail: `${payment.mode} · Payment date ${fmt(payment.date)} · ${payment.reference || payment.note || "Receipt"} · INV-${String(bill.number).padStart(4, "0")}`, status: "Received", amount: -payment.amount as number | null, bill: undefined as Bill | undefined }))]);
  const transactions = [...bookingRows, ...attendanceRows, ...billRows, ...paymentRows].sort((left, right) => right.date.localeCompare(left.date) || left.type.localeCompare(right.type));
  return <Modal title={`${client.firmName} · client ledger`} close={close}><div className="op-client-ledger"><section className="op-ledger-profile"><div><b>{client.firmName}</b><span>{client.ownerName || "No owner name"} · {client.mobile} · {client.email || "No email"}</span><small>{client.address} · {bookings.length} campaign bookings</small></div><div className="op-category-list">{client.categories.map((category) => <span key={category}>{category}</span>)}</div></section><section className="op-ledger-totals"><p><span>Total billed</span><b>{money(totalBilled)}</b></p><p><span>Advance received</span><b>{money(totalAdvance)}</b></p><p><span>Installments received</span><b>{money(totalInstallments)}</b></p><p><span>Total received</span><b>{money(totalReceived)}</b></p><p><span>Outstanding balance</span><strong>{money(balance)}</strong></p><p><span>Present slot-days</span><b>{totalPresentDays}</b></p></section><div className="op-section-title"><h2>Complete client activity history</h2></div>{transactions.length ? <section className="op-ledger-list">{transactions.map((transaction) => <article key={transaction.key}><time>{fmt(transaction.date)}</time><div><b>{transaction.type}</b><small>{transaction.detail}</small></div><Status>{transaction.status}</Status><strong className={transaction.amount !== null && transaction.amount < 0 ? "credit" : ""}>{transaction.amount === null ? "—" : <>{transaction.amount < 0 ? "−" : ""}{money(Math.abs(transaction.amount))}</>}</strong>{transaction.bill && <span className="op-ledger-row-actions">{billBalance(transaction.bill) > 0 && <button title="Receive amount" onClick={() => window.dispatchEvent(new CustomEvent("fleetflow:receive-payment", { detail: transaction.bill!.id }))}><Banknote size={16}/></button>}<button title="View invoice" onClick={() => viewBill(transaction.bill!)}><Printer size={16}/></button></span>}</article>)}</section> : <div className="op-empty-state"><ReceiptText/><h2>No client activity</h2><p>Campaign attendance, bills, advances, and payments will appear here.</p></div>}<footer><Button secondary onClick={close}>Close</Button></footer></div></Modal>;
}

export function EmployeeRecordModal({ store, employeeId, close }: { store: FleetStore; employeeId: number; close: () => void }) {
  const employee = store.employees.find((item) => item.id === employeeId);
  if (!employee) return null;
  
  const ledger = calculateEmployeeLedger(store, employeeId);
  const payroll = store.payrollPayments.filter((item) => item.employeeId === employeeId);
  const advances = store.advances.filter((item) => item.employeeId === employeeId);
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