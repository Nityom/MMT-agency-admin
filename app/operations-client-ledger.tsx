"use client";

import { Printer, ReceiptText } from "lucide-react";
import { useState } from "react";
import { addDays, Bill, calculateBillTotal, FleetStore, inclusiveDays } from "./fleet-domain";
import { Modal, Status } from "./operations-components";
import { billBalance, billPaid, bookingEnd, bookingVehicleLines, campaignSlotKey, fmt, isoToday, money } from "./operations-utils";

export function ClientLedgerModal({ store, clientId, close, viewBill }: { store: FleetStore; clientId: number; close: () => void; viewBill: (bill: Bill) => void }) {
  const client = store.clients.find((item) => item.id === clientId);
  const [from, setFrom] = useState(`${isoToday().slice(0, 7)}-01`);
  const [to, setTo] = useState(isoToday());
  if (!client) return null;
  const bills = store.bills.filter((bill) => bill.clientId === clientId && bill.billDate >= from && bill.billDate <= to);
  const bookings = store.campaignBookings.filter((booking) => booking.clientId === clientId && booking.startDate <= to && bookingEnd(booking) >= from);
  const billed = bills.reduce((sum, bill) => sum + bill.total, 0);
  const received = bills.reduce((sum, bill) => sum + billPaid(bill), 0);
  const outstanding = bills.reduce((sum, bill) => sum + billBalance(bill), 0);
  const preBill = bookings.reduce((sum, booking) => sum + (booking.generatedBillId ? 0 : calculateBillTotal(bookingVehicleLines(store, booking, bookingEnd(booking)), booking.facilities.map((facility) => ({ ...facility, amount: facility.quantity * facility.rate })))), 0);
  const dates = [...new Set(bookings.flatMap((booking) => {
    const start = booking.startDate > from ? booking.startDate : from;
    const end = bookingEnd(booking) < to ? bookingEnd(booking) : to;
    return end < start ? [] : Array.from({ length: inclusiveDays(start, end) }, (_, index) => addDays(start, index));
  }))].sort();
  const attendance = dates.map((date) => {
    const slots = bookings.flatMap((booking) => booking.vehiclePeriods.flatMap((period) => Array.from({ length: period.quantity }, (_, index) => ({ key: campaignSlotKey(booking.id, period.id, index), vehicleId: period.vehicleIds[index] }))));
    const present = slots.filter((slot) => store.campaignAttendance[date]?.[slot.key] ?? (slot.vehicleId ? store.vehicleAttendance[date]?.[slot.vehicleId] : false)).length;
    return { date, present, total: slots.length };
  });
  return <Modal title={`${client.firmName} · client ledger`} close={close}><div className="op-client-ledger"><section className="op-ledger-profile"><div><b>{client.firmName}</b><span>{client.ownerName || "No concerned person"} · {client.mobile || "No phone"}</span><small>{client.address || "No address"}</small></div></section><div className="op-toolbar"><label className="op-field"><span>From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="op-field"><span>To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div><section className="op-ledger-totals"><p><span>Total billed</span><b>{money(billed)}</b></p><p><span>Total received</span><b>{money(received)}</b></p><p><span>Pending balance</span><strong>{money(outstanding)}</strong></p><p><span>Before bill</span><strong>{money(preBill)}</strong></p></section><div className="op-section-title"><h2>Attendance calendar</h2></div>{attendance.length ? <section className="op-ledger-list">{attendance.map((row) => <article key={row.date}><time>{fmt(row.date)}</time><div><b>{row.present}/{row.total} slots present</b><small>{row.total - row.present} absent</small></div><Status>{row.present === row.total ? "Present" : row.present ? "Partial" : "Absent"}</Status></article>)}</section> : <div className="op-empty-state"><ReceiptText/><h2>No attendance in range</h2></div>}<div className="op-section-title"><h2>Invoices in range</h2></div>{bills.length ? <section className="op-ledger-list">{bills.map((bill) => <article key={bill.id}><time>{fmt(bill.billDate)}</time><div><b>INV-{String(bill.number).padStart(4, "0")}</b><small>{money(bill.total)} billed · {money(billBalance(bill))} pending</small></div><Status>{billBalance(bill) ? "Pending" : "Paid"}</Status><button className="op-icon" title="View invoice" onClick={() => viewBill(bill)}><Printer size={16}/></button></article>)}</section> : <div className="op-empty-state"><ReceiptText/><h2>No invoices in range</h2></div>}</div></Modal>;
}
