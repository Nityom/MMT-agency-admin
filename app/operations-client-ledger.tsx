import { Banknote, CalendarDays, Check, FileText, Printer, ReceiptText, WalletCards, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { addDays, Bill, BillCharge, calculateBillTotal, FleetStore, inclusiveDays } from "./fleet-domain";
import { Button, Modal, Status } from "./operations-components";
import { BillReceipt } from "./operations-billing";
import {
  billBalance,
  billPaid,
  bookingEnd,
  bookingStatus,
  bookingVehicleLines,
  campaignSlotKey,
  clientOverallBalance,
  fmt,
  isoToday,
  money,
  otherBillBalance,
  otherBillPaid,
} from "./operations-utils";

export function ClientLedgerPrintModal({
  store,
  client,
  from,
  to,
  overall,
  overallTotalPresentDays,
  timeline,
  close,
}: {
  store: FleetStore;
  client: FleetStore["clients"][number];
  from: string;
  to: string;
  overall: ReturnType<typeof clientOverallBalance>;
  overallTotalPresentDays: number;
  timeline: {
    key: string;
    date: string;
    type: string;
    detail: string;
    status: string;
    amount: number | null;
    isCredit: boolean;
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
          <h1>CLIENT STATEMENT OF ACCOUNT & LEDGER</h1>
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
              {from && to ? `${fmt(from)} to ${fmt(to)}` : "All Time"}
            </p>
            <p>
              <b>Statement Date</b>
              <br />
              {fmt(isoToday())}
            </p>
            <p className="invoice-bill-to">
              <b>Client / Firm</b>
              <br />
              <strong>{client.firmName}</strong>
              <br />
              <span>
                {client.ownerName ? `${client.ownerName} · ` : ""}{client.mobile || "No mobile"}
                <br />
                {client.address || "No address saved"}
              </span>
            </p>
          </section>

          {/* Financial Summary */}
          <section className="op-supplier-print-summary" style={{ gridTemplateColumns: "repeat(4, 1fr)", margin: "14px 0" }}>
            <p>
              <span>Total Billed</span>
              <strong>{money(overall.billed)}</strong>
            </p>
            <p>
              <span>Total Received</span>
              <strong>{money(overall.received)}</strong>
            </p>
            <p>
              <span>Outstanding Balance</span>
              <strong style={{ color: overall.outstanding > 0 ? "#9a493d" : "#1f6a53" }}>
                {money(overall.balance)}
              </strong>
            </p>
            <p>
              <span>Present Attendance</span>
              <strong>{overallTotalPresentDays} days</strong>
            </p>
          </section>

          <h2 className="op-print-section-title">Ledger Transactions & Activity</h2>
          <table className="invoice-expenses op-supplier-print-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction / Activity</th>
                <th>Details</th>
                <th>Status</th>
                <th>Debit (+)</th>
                <th>Credit (−)</th>
              </tr>
            </thead>
            <tbody>
              {timeline.length ? (
                timeline.map((item) => (
                  <tr key={item.key}>
                    <td>{fmt(item.date)}</td>
                    <td><b>{item.type}</b></td>
                    <td>{item.detail}</td>
                    <td>{item.status}</td>
                    <td>
                      {item.amount !== null && !item.isCredit ? money(Math.abs(item.amount)) : "—"}
                    </td>
                    <td>
                      {item.amount !== null && item.isCredit ? money(Math.abs(item.amount)) : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No transactions in selected period</td>
                </tr>
              )}
            </tbody>
          </table>

          <section className="op-invoice-total">
            <p>
              <span>Final Outstanding Balance</span>
              <strong style={{ color: overall.outstanding > 0 ? "#9a493d" : "#1f6a53" }}>
                {money(overall.balance)}
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

export function ClientLedgerModal({
  store,
  clientId,
  close,
  viewBill,
}: {
  store: FleetStore;
  clientId: number;
  close: () => void;
  viewBill?: (bill: Bill) => void;
}) {
  const client = store.clients.find((item) => item.id === clientId);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeReceipt, setActiveReceipt] = useState<{ bill: Bill; payment?: Bill["payments"][number] | null } | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  if (!client) return null;

  // Overall financial position across all-time (consistent across all screens)
  const overall = clientOverallBalance(store, clientId);

  const targetName = client.firmName.toLowerCase().trim();
  const isBaba = targetName.includes("baba") && targetName.includes("son");

  const clientBills = store.bills.filter(
    (bill) =>
      bill.clientId === clientId ||
      (bill.client?.firmName && bill.client.firmName.toLowerCase().trim() === targetName) ||
      (isBaba && (bill.client?.firmName?.toLowerCase().includes("baba") ?? false))
  );

  const clientOtherBills = store.otherBills.filter(
    (bill) =>
      bill.clientId === clientId ||
      (bill.client?.firmName && bill.client.firmName.toLowerCase().trim() === targetName) ||
      (isBaba && (bill.client?.firmName?.toLowerCase().includes("baba") ?? false))
  );

  const clientBookings = store.campaignBookings.filter(
    (booking) =>
      booking.clientId === clientId ||
      (booking.client?.firmName && booking.client.firmName.toLowerCase().trim() === targetName) ||
      (isBaba && (booking.client?.firmName?.toLowerCase().includes("baba") ?? false))
  );

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);

  // Filtered dataset for chronological display in selected date range
  const filteredBills = clientBills.filter((bill) => inRange(bill.billDate));
  const filteredOtherBills = clientOtherBills.filter((bill) => inRange(bill.billDate));
  const filteredBookings = clientBookings.filter((booking) => (!to || booking.startDate <= to) && (!from || bookingEnd(booking) >= from));

  // Present attendance slots for the client
  const attendanceRecords = filteredBookings.flatMap((booking) => {
    const start = from && booking.startDate < from ? from : booking.startDate;
    const end = to && bookingEnd(booking) > to ? to : bookingEnd(booking);
    if (end < start) return [];

    return Array.from({ length: inclusiveDays(start, end) }, (_, offset) => addDays(start, offset)).flatMap((date) => {
      const periods = booking.vehiclePeriods.filter((period) => period.startDate <= date && period.endDate >= date);
      const slots = periods.flatMap((period) =>
        Array.from({ length: period.quantity }, (_, slotIndex) => ({
          key: campaignSlotKey(booking.id, period.id, slotIndex),
          vehicleId: period.vehicleIds[slotIndex],
          type: period.type,
        }))
      );
      if (!slots.length) return [];
      const presentSlots = slots.filter((slot) =>
        store.campaignAttendance[date]?.[slot.key] ?? (slot.vehicleId ? store.vehicleAttendance[date]?.[slot.vehicleId] : false)
      ).length;
      if (presentSlots === 0) return [];
      return [{
        key: `attendance-${booking.id}-${date}`,
        date,
        type: "Present Attendance",
        detail: `${presentSlots}/${slots.length} slots active · Campaign ${fmt(booking.startDate)} to ${fmt(bookingEnd(booking))}`,
        status: "Present",
        presentSlots,
        totalSlots: slots.length,
      }];
    });
  });

  const totalPresentDays = attendanceRecords.reduce((sum, r) => sum + r.presentSlots, 0);

  // Overall All-Time Present Attendance Count for Client across all campaigns
  const overallAttendanceRecords = clientBookings.flatMap((booking) => {
    const end = bookingEnd(booking);
    if (end < booking.startDate) return [];
    return Array.from({ length: inclusiveDays(booking.startDate, end) }, (_, offset) => addDays(booking.startDate, offset)).flatMap((date) => {
      const periods = booking.vehiclePeriods.filter((period) => period.startDate <= date && period.endDate >= date);
      const slots = periods.flatMap((period) =>
        Array.from({ length: period.quantity }, (_, slotIndex) => ({
          key: campaignSlotKey(booking.id, period.id, slotIndex),
          vehicleId: period.vehicleIds[slotIndex],
        }))
      );
      if (!slots.length) return [];
      const presentSlots = slots.filter((slot) =>
        store.campaignAttendance[date]?.[slot.key] ?? (slot.vehicleId ? store.vehicleAttendance[date]?.[slot.vehicleId] : false)
      ).length;
      return presentSlots > 0 ? [presentSlots] : [];
    });
  });
  const overallTotalPresentDays = overallAttendanceRecords.reduce((sum, count) => sum + count, 0);

  // Build Chronological Transactions
  const billRows = filteredBills.map((bill) => ({
    key: `bill-${bill.id}`,
    date: bill.billDate,
    type: `Invoice INV-${String(bill.number).padStart(4, "0")}`,
    detail: `${bill.vehicleLines.length} vehicle lines · Billed ${money(bill.total)} · Balance ${money(billBalance(bill))}`,
    status: billBalance(bill) === 0 ? "Paid" : "Pending",
    amount: bill.total,
    isCredit: false,
    bill,
    payment: null as Bill["payments"][number] | null,
    isAdvance: false,
  }));

  const otherBillRows = filteredOtherBills.map((bill) => ({
    key: `otherbill-${bill.id}`,
    date: bill.billDate,
    type: `Other Bill #${String(bill.number).padStart(4, "0")} (${bill.category})`,
    detail: `${bill.items.length} items · Billed ${money(bill.total)} · Balance ${money(otherBillBalance(bill))}`,
    status: otherBillBalance(bill) === 0 ? "Paid" : "Pending",
    amount: bill.total,
    isCredit: false,
    bill: undefined as Bill | undefined,
    payment: null as Bill["payments"][number] | null,
    isAdvance: false,
  }));

  const paymentRows = filteredBills.flatMap((bill) => [
    ...(bill.advanceReceived > 0
      ? [{
          key: `adv-${bill.id}`,
          date: bill.billDate,
          type: `Advance received (INV-${String(bill.number).padStart(4, "0")})`,
          detail: `${bill.paymentMode} · Advance on invoice generation`,
          status: "Received",
          amount: -bill.advanceReceived,
          isCredit: true,
          bill,
          payment: null as Bill["payments"][number] | null,
          isAdvance: true,
        }]
      : []),
    ...bill.payments.map((payment) => ({
      key: `pay-${bill.id}-${payment.id}`,
      date: payment.date,
      type: `Payment (INV-${String(bill.number).padStart(4, "0")})`,
      detail: `${payment.mode} · Ref: ${payment.reference || payment.note || "Installment"}`,
      status: "Received",
      amount: -payment.amount,
      isCredit: true,
      bill,
      payment,
      isAdvance: false,
    })),
  ]);

  const bookingRows = filteredBookings.map((booking) => {
    const charges: BillCharge[] = booking.facilities.map((facility) => ({ ...facility, amount: facility.quantity * facility.rate }));
    const estimate = calculateBillTotal(bookingVehicleLines(store, booking, isoToday() < bookingEnd(booking) ? isoToday() : bookingEnd(booking)), charges);
    return {
      key: `booking-${booking.id}`,
      date: booking.startDate,
      type: "Campaign booking",
      detail: `${fmt(booking.startDate)} to ${fmt(bookingEnd(booking))} · ${booking.vehiclePeriods.length} vehicle intervals`,
      status: bookingStatus(booking),
      amount: estimate,
      isCredit: false,
      bill: undefined as Bill | undefined,
      payment: null as Bill["payments"][number] | null,
      isAdvance: false,
    };
  });

  const timeline = [
    ...billRows,
    ...otherBillRows,
    ...paymentRows,
    ...attendanceRecords.map((a) => ({
      key: a.key,
      date: a.date,
      type: a.type,
      detail: a.detail,
      status: a.status,
      amount: null as number | null,
      isCredit: false,
      bill: undefined as Bill | undefined,
      payment: null as Bill["payments"][number] | null,
      isAdvance: false,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Modal title={`${client.firmName} · Complete Client Ledger`} close={close}>
        <div className="op-client-ledger">
          <section className="op-ledger-profile">
            <div>
              <b>{client.firmName}</b>
              <span>
                {client.ownerName ? `${client.ownerName} · ` : ""}{client.mobile || "No mobile"}
                {client.email ? ` · ${client.email}` : ""}
              </span>
              <small>{client.address || "No address"} · {clientBookings.length} campaigns · {clientBills.length} invoices</small>
            </div>
            {client.categories?.length > 0 && (
              <div className="op-category-list">
                {client.categories.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            )}
          </section>

          {/* Overall Financial Position (Never changes based on date filters) */}
          <section className="op-ledger-totals">
            <p>
              <span>Total Billed</span>
              <b>{money(overall.billed)}</b>
            </p>
            <p>
              <span>Total Received</span>
              <b style={{ color: "#1f6a53" }}>{money(overall.received)}</b>
            </p>
            <p>
              <span>Remaining Balance</span>
              <strong style={{ color: overall.outstanding > 0 ? "#9a493d" : "#1f6a53" }}>
                {money(overall.balance)}
              </strong>
            </p>
            <p>
              <span>Overall Present Attendance</span>
              <b style={{ color: "#1f6a53" }}>{overallTotalPresentDays} days</b>
            </p>
            {totalPresentDays !== overallTotalPresentDays && (
              <p>
                <span>In-Range Present</span>
                <b>{totalPresentDays} days</b>
              </p>
            )}
          </section>

          {/* Date Filter Toolbar for Chronological Activity */}
          <div className="op-toolbar" style={{ background: "#f3f7f4", padding: "10px 14px", borderRadius: "7px", flexWrap: "wrap", gap: "8px" }}>
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
                setFrom("2020-01-01");
                setTo(isoToday());
              }}
            >
              All Time
            </Button>
            <Button
              secondary
              onClick={() => setPrintModalOpen(true)}
            >
              <Printer size={16} />
              Print ledger
            </Button>
          </div>

          <div className="op-section-title">
            <h2>Chronological Ledger Activity ({timeline.length} records in range)</h2>
          </div>

          {timeline.length ? (
            <section className="op-ledger-list">
              {timeline.map((item) => (
                <article key={item.key}>
                  <time>{fmt(item.date)}</time>
                  <div>
                    <b>{item.type}</b>
                    <small>{item.detail}</small>
                  </div>
                  <Status>{item.status}</Status>
                  <strong className={item.isCredit ? "credit" : ""}>
                    {item.amount === null ? (
                      "—"
                    ) : (
                      <>
                        {item.amount < 0 ? "−" : "+"}
                        {money(Math.abs(item.amount))}
                      </>
                    )}
                  </strong>
                  <span className="op-ledger-row-actions">
                    {item.bill && (
                      <button
                        className="op-icon"
                        title="View invoice"
                        onClick={() => viewBill?.(item.bill!)}
                      >
                        <FileText size={16} />
                      </button>
                    )}
                    {item.isCredit && item.bill && (
                      <button
                        className="op-icon"
                        title="Print payment receipt"
                        onClick={() => setActiveReceipt({ bill: item.bill!, payment: item.payment })}
                      >
                        <Printer size={16} />
                      </button>
                    )}
                  </span>
                </article>
              ))}
            </section>
          ) : (
            <div className="op-empty-state">
              <ReceiptText />
              <h2>No activity in selected date range</h2>
              <p>Try expanding the date range to see older invoices, payments, and attendance.</p>
            </div>
          )}

          <footer>
            <Button secondary onClick={() => setPrintModalOpen(true)}>
              <Printer size={16} />
              Print ledger
            </Button>
            <Button secondary onClick={close}>
              Close
            </Button>
          </footer>
        </div>
      </Modal>

      {printModalOpen && (
        <ClientLedgerPrintModal
          store={store}
          client={client}
          from={from}
          to={to}
          overall={overall}
          overallTotalPresentDays={overallTotalPresentDays}
          timeline={timeline}
          close={() => setPrintModalOpen(false)}
        />
      )}

      {activeReceipt && (
        <BillReceipt
          bill={activeReceipt.bill}
          payment={activeReceipt.payment}
          store={store}
          close={() => setActiveReceipt(null)}
        />
      )}
    </>
  );
}

