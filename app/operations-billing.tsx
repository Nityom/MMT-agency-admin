"use client";

import { Check, FileText, Gauge, Plus, Printer, ReceiptText, Trash2, TrendingDown, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  addDays,
  Bill,
  BillCharge,
  BillChargeCategory,
  BillVehicleLine,
  CampaignBooking,
  calculateBillTotal,
  campaignDurationMonths,
  ClientReceipt,
  FleetStore,
  inclusiveDays,
  OtherBill,
  PaymentMode,
  nextBillNumber,
} from "./fleet-domain";
import { Button, FormField, Modal } from "./operations-components";
import { InvoiceHeader } from "./invoice-header";
import { PageHead } from "./operations-reports";
import {
  amount,
  billBalance,
  billPaid,
  bookingEnd,
  bookingVehicleLines,
  campaignChargeCategories,
  campaignSlotKey,
  campaignSlotPresentDays,
  findAllCampaignBills,
  findCampaignBillForRange,
  fmt,
  input,
  isoToday,
  money,
  nextId,
  vehiclePresentDays,
} from "./operations-utils";

type BillLineDraft = Omit<BillVehicleLine, "id" | "driverNames" | "bookedDays">;
type ChargeDraft = Omit<BillCharge, "id" | "amount">;

export function BillingComposer({
  store,
  initialClientId,
  bill,
  campaignBooking,
  cancel,
  save,
}: {
  store: FleetStore;
  initialClientId: number;
  bill?: Bill | null;
  campaignBooking?: CampaignBooking | null;
  cancel: () => void;
  save: (bill: Bill, appliedReceiptIds?: number[]) => void;
}) {
  const linkedCampaign =
    campaignBooking ??
    (bill
      ? store.campaignBookings.find(
          (b) =>
            b.generatedBillId === bill.id ||
            (bill.id && b.id === bill.id) ||
            b.clientId === bill.clientId,
        )
      : undefined);

  const effectiveClientSnapshot =
    campaignBooking?.client ??
    linkedCampaign?.client ??
    bill?.client;

  const effectiveFirmName = (
    effectiveClientSnapshot?.firmName ||
    ""
  ).trim();

  const effectiveOwnerName =
    effectiveClientSnapshot?.ownerName ||
    "";

  const clientByFirm = effectiveFirmName
    ? store.clients.find(
        (c) =>
          c.firmName.trim().toLowerCase() ===
          effectiveFirmName.toLowerCase(),
      )
    : undefined;

  const clientById = store.clients.find(
    (c) => c.id === (campaignBooking?.clientId || bill?.clientId || initialClientId),
  );

  const matchedClient =
    clientByFirm ??
    (effectiveFirmName &&
    clientById &&
    clientById.firmName.trim().toLowerCase() !==
      effectiveFirmName.toLowerCase()
      ? undefined
      : clientById);

  const initialBillingClientId =
    clientByFirm?.id ??
    (effectiveFirmName
      ? clientById &&
        clientById.firmName.trim().toLowerCase() ===
          effectiveFirmName.toLowerCase()
        ? clientById.id
        : -999
      : (clientById?.id ?? initialClientId ?? store.clients[0]?.id ?? 0));
  const initialBillDate = bill?.billDate ?? isoToday();

  const calculateDaysForLine = (
    vehicleId: number,
    start: string,
    end: string,
  ) => {
    if (!start || !end || start > end) {
      return { advertisementDays: 0, offDays: 0, bookedDays: 0 };
    }
    const bookedDays = inclusiveDays(start, end);
    let presentDays = 0;
    let hasAttendanceRecords = false;

    if (vehicleId > 0) {
      const dates = Array.from({ length: bookedDays }, (_, offset) =>
        addDays(start, offset),
      );
      hasAttendanceRecords = dates.some(
        (d) => store.vehicleAttendance[d]?.[vehicleId] !== undefined,
      );
      presentDays = vehiclePresentDays(store, vehicleId, start, end);
    } else if (vehicleId < 0) {
      const absId = Math.abs(vehicleId);
      const slotIndex = (absId % 100) - 1;
      const rem = Math.floor(absId / 100);
      const periodId = rem % 100;
      const bookingId = Math.floor(rem / 100);
      const booking = store.campaignBookings.find((b) => b.id === bookingId);
      const period = booking?.vehiclePeriods.find((p) => p.id === periodId);
      const legacyVehicleId = period?.vehicleIds[slotIndex];

      const dates = Array.from({ length: bookedDays }, (_, offset) =>
        addDays(start, offset),
      );
      hasAttendanceRecords = dates.some(
        (d) =>
          store.campaignAttendance[d]?.[
            campaignSlotKey(bookingId, periodId, slotIndex)
          ] !== undefined ||
          (legacyVehicleId &&
            store.vehicleAttendance[d]?.[legacyVehicleId] !== undefined),
      );
      presentDays = campaignSlotPresentDays(
        store,
        bookingId,
        periodId,
        slotIndex,
        start,
        end,
        legacyVehicleId,
      );
    }

    const finalPresent = hasAttendanceRecords ? presentDays : bookedDays;
    return {
      bookedDays,
      advertisementDays: finalPresent,
      offDays: Math.max(0, bookedDays - finalPresent),
    };
  };

  const campaignLine = (
    vehicleId: number,
    selectedClientId: number,
    throughDate: string,
  ): BillLineDraft => {
    const vehicleLabel =
      store.vehicles.find((vehicle) => vehicle.id === vehicleId)?.number ??
      "Vehicle";
    const match = store.campaignBookings
      .flatMap((booking) =>
        booking.clientId === selectedClientId
          ? booking.vehiclePeriods.map((period) => ({ booking, period }))
          : [],
      )
      .filter(
        ({ period }) =>
          period.vehicleIds.includes(vehicleId) &&
          period.startDate <= throughDate,
      )
      .sort((left, right) =>
        right.period.startDate.localeCompare(left.period.startDate),
      )[0];
    if (!match)
      return {
        vehicleId,
        label: vehicleLabel,
        startDate: throughDate,
        endDate: throughDate,
        advertisementDays: 0,
        offDays: 0,
        dailyRate: 0,
      };
    const endDate = [
      match.period.endDate,
      bookingEnd(match.booking),
      throughDate,
    ].sort()[0];
    const { advertisementDays, offDays } = calculateDaysForLine(
      vehicleId,
      match.period.startDate,
      endDate,
    );
    return {
      vehicleId,
      label: vehicleLabel,
      startDate: match.period.startDate,
      endDate,
      advertisementDays,
      offDays,
      dailyRate: match.period.dailyRate,
    };
  };
  const initialVehicleId =
    store.campaignBookings
      .filter((booking) => booking.clientId === initialBillingClientId)
      .flatMap((booking) =>
        booking.vehiclePeriods.flatMap((period) => period.vehicleIds),
      )[0] ??
    store.vehicles[0]?.id ??
    0;
  const [clientId, setClientId] = useState(initialBillingClientId);
  const [billDate, setBillDate] = useState(initialBillDate);

  const availableReceipts = (store.receipts ?? []).filter((r) => {
    if (bill && r.billId === bill.id) return true;
    if (r.status === "Billed" && r.billId && (!bill || r.billId !== bill.id)) return false;
    const isClientMatch =
      r.clientId === clientId ||
      r.clientId === initialBillingClientId ||
      (effectiveFirmName &&
        r.client?.firmName &&
        r.client.firmName.trim().toLowerCase() === effectiveFirmName.toLowerCase());
    return isClientMatch;
  });

  const isExistingSavedBill = Boolean(bill && store.bills.some((b) => b.id === bill.id));

  const [selectedReceiptIds, setSelectedReceiptIds] = useState<number[]>(() => {
    if (isExistingSavedBill && bill) {
      return (store.receipts ?? [])
        .filter((r) => r.billId === bill.id)
        .map((r) => r.id);
    }
    // For new bills (including generated campaign bills), auto-select all unbilled receipts
    return availableReceipts.map((r) => r.id);
  });

  const selectedReceiptsTotal = availableReceipts
    .filter((r) => selectedReceiptIds.includes(r.id))
    .reduce((sum, r) => sum + r.amount, 0);

  const [extraAdvance, setExtraAdvance] = useState<number>(() => {
    if (isExistingSavedBill && bill) {
      const initialLinkedReceiptsSum = (store.receipts ?? [])
        .filter((r) => r.billId === bill.id)
        .reduce((sum, r) => sum + r.amount, 0);
      return Math.max(0, (bill.advanceReceived ?? 0) - initialLinkedReceiptsSum);
    }
    return 0;
  });

  const advance = selectedReceiptsTotal + (Number(extraAdvance) || 0);
  const [paymentMode] = useState<PaymentMode>(
    bill?.paymentMode ?? "Cash",
  );
  const [markFullPayment, setMarkFullPayment] = useState(false);
  const [fullPaymentDate, setFullPaymentDate] = useState(isoToday());
  const [lines, setLines] = useState<BillLineDraft[]>(
    bill
      ? bill.vehicleLines.map((line) => ({
          vehicleId: line.vehicleId,
          label: line.label,
          quantity: line.quantity,
          startDate: line.startDate,
          endDate: line.endDate,
          advertisementDays: line.advertisementDays,
          offDays: line.offDays,
          dailyRate: line.dailyRate,
        }))
      : [
          campaignLine(
            initialVehicleId,
            initialBillingClientId,
            initialBillDate,
          ),
        ],
  );
  const [charges, setCharges] = useState<ChargeDraft[]>(
    bill
      ? bill.charges.map((charge) => ({
          category: charge.category,
          description: charge.description,
          quantity: charge.quantity,
          rate: charge.rate,
          fromDate: charge.fromDate,
          toDate: charge.toDate,
          recurring: charge.recurring,
          design: charge.design,
        }))
      : [],
  );
  const updateLine = (index: number, patch: Partial<BillLineDraft>) =>
    setLines((current) =>
      current.map((line, itemIndex) =>
        itemIndex === index ? { ...line, ...patch } : line,
      ),
    );
  const updateCharge = (index: number, patch: Partial<ChargeDraft>) =>
    setCharges((current) =>
      current.map((charge, itemIndex) =>
        itemIndex === index ? { ...charge, ...patch } : charge,
      ),
    );
  const finalLines: BillVehicleLine[] = lines.map((line, index) => {
    const bookedDays =
      line.startDate <= line.endDate
        ? inclusiveDays(line.startDate, line.endDate)
        : 0;
    return {
      ...line,
      id: index + 1,
      bookedDays,
      advertisementDays: line.advertisementDays,
      offDays: Math.max(0, bookedDays - line.advertisementDays),
      driverNames: [],
    };
  });
  const finalCharges: BillCharge[] = charges.map((charge, index) => ({
    ...charge,
    id: index + 1,
    amount: charge.quantity * charge.rate,
  }));
  const [payments, setPayments] = useState<Bill["payments"]>(bill?.payments ?? []);
  const [enableLoss, setEnableLoss] = useState<boolean>((bill?.lossAmount ?? 0) > 0);
  const [lossAmount, setLossAmount] = useState<number>(bill?.lossAmount ?? 0);
  const [lossReason, setLossReason] = useState<string>(bill?.lossReason ?? "Client underpayment settlement");
  const [lossDate, setLossDate] = useState<string>(bill?.lossDate ?? isoToday());

  const total = calculateBillTotal(finalLines, finalCharges);
  const activeLoss = enableLoss ? (Number(lossAmount) || 0) : 0;
  const totalCollected = advance + payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = Math.max(0, total - totalCollected - activeLoss);

  const submit = () => {
    const client =
      store.clients.find((item) => item.id === clientId) ??
      matchedClient ??
      effectiveClientSnapshot ??
      bill?.client;
    if (!client || !lines.length) return;
    const finalPayments: Bill["payments"] =
      bill && markFullPayment && remainingBalance > 0
        ? [
            ...payments,
            {
              id: nextId(payments),
              date: fullPaymentDate,
              amount: remainingBalance,
              mode: paymentMode,
              reference: "",
              note: "Full payment recorded while editing bill",
            },
          ]
        : payments;
    const finalPaid = advance + finalPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const finalClientId =
      client && "id" in client && typeof (client as any).id === "number" && (client as any).id > 0
        ? (client as any).id
        : clientId > 0
          ? clientId
          : 0;
    let cleanPayments = finalPayments;
    let cleanAdvance = advance;
    if (activeLoss > 0 && (finalPaid + activeLoss) > total) {
      let excess = (finalPaid + activeLoss) - total;
      if (excess > 0 && cleanPayments.length > 0) {
        cleanPayments = [...cleanPayments];
        for (let i = cleanPayments.length - 1; i >= 0 && excess > 0; i--) {
          const deduction = Math.min(cleanPayments[i].amount, excess);
          cleanPayments[i] = { ...cleanPayments[i], amount: cleanPayments[i].amount - deduction };
          excess -= deduction;
        }
        cleanPayments = cleanPayments.filter((p) => p.amount > 0);
      }
      if (excess > 0 && cleanAdvance > 0) {
        cleanAdvance = Math.max(0, cleanAdvance - excess);
      }
    }
    const cleanPaid = cleanAdvance + cleanPayments.reduce((sum, p) => sum + p.amount, 0);
    save({
      id: bill?.id ?? nextId(store.bills),
      number: bill?.number ?? nextBillNumber(store.bills, store.nextBillNumber),
      billDate,
      clientId: finalClientId,
      client: {
        firmName: client.firmName,
        ownerName: client.ownerName,
        address: client.address,
        mobile: client.mobile,
        email: client.email,
      },
      vehicleLines: finalLines,
      charges: finalCharges,
      advanceReceived: cleanAdvance,
      paymentMode,
      payments: cleanPayments,
      total,
      lossAmount: activeLoss > 0 ? activeLoss : undefined,
      lossReason: activeLoss > 0 ? lossReason.trim() : undefined,
      lossDate: activeLoss > 0 ? lossDate : undefined,
      status: (cleanPaid + activeLoss) >= total ? "Paid" : "Pending",
    }, selectedReceiptIds);
  };
  return (
    <div className="op-workspace">
      <PageHead
        title={
          bill
            ? `Edit bill INV-${String(bill.number).padStart(4, "0")}`
            : "Generate detailed bill"
        }
        detail="Per vehicle, per present day"
      />
      <section className="op-editor">
        <div className="op-form-grid">
          <label className="op-field">
            <span>Client profile</span>
            <select
              value={clientId}
              onChange={(event) => {
                const selectedClientId = Number(event.target.value);
                setClientId(selectedClientId);
                const newClientUnbilled = (store.receipts ?? [])
                  .filter((r) => r.clientId === selectedClientId && (r.status !== "Billed" || !r.billId))
                  .map((r) => r.id);
                setSelectedReceiptIds(newClientUnbilled);
                setExtraAdvance(0);
                const firstVehicleId =
                  store.campaignBookings
                    .filter(
                      (booking) => booking.clientId === selectedClientId,
                    )
                    .flatMap((booking) =>
                      booking.vehiclePeriods.flatMap(
                        (period) => period.vehicleIds,
                      ),
                    )[0] ??
                  store.vehicles[0]?.id ??
                  0;
                if (!bill) {
                  setLines([
                    campaignLine(firstVehicleId, selectedClientId, billDate),
                  ]);
                }
              }}
            >
              {!store.clients.some((client) => client.id === clientId) &&
                (effectiveFirmName || bill?.client || matchedClient) && (
                  <option value={clientId}>
                    {effectiveFirmName ||
                      bill?.client?.firmName ||
                      matchedClient?.firmName}{" "}
                    {effectiveOwnerName ||
                    bill?.client?.ownerName ||
                    matchedClient?.ownerName
                      ? `· ${effectiveOwnerName || bill?.client?.ownerName || matchedClient?.ownerName}`
                      : ""}
                  </option>
                )}
              {store.clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.firmName} {client.ownerName ? `· ${client.ownerName}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="op-field">
            <span>Bill date</span>
            <input
              type="date"
              value={billDate}
              onChange={(event) => {
                const date = event.target.value;
                setBillDate(date);
                if (!bill)
                  setLines((current) =>
                    current.map((line) =>
                      campaignLine(line.vehicleId, clientId, date),
                    ),
                  );
              }}
            />
          </label>
        </div>
        <div className="op-section-title">
          <h2>Vehicle lines</h2>
          <Button
            secondary
            onClick={() => {
              const vehicleId =
                store.campaignBookings
                  .filter((booking) => booking.clientId === clientId)
                  .flatMap((booking) =>
                    booking.vehiclePeriods.flatMap(
                      (period) => period.vehicleIds,
                    ),
                  )
                  .find((id) => !lines.some((line) => line.vehicleId === id)) ??
                store.vehicles[0]?.id ??
                0;
              setLines((current) => [
                ...current,
                campaignLine(vehicleId, clientId, billDate),
              ]);
            }}
          >
            <Plus size={16} />
            Vehicle
          </Button>
        </div>
        {lines.map((line, index) => (
          <div className="op-line-editor" key={index}>
            <label>
              <span>Vehicle</span>
              <select
                value={line.vehicleId}
                onChange={(event) => {
                  const newVehicleId = Number(event.target.value);
                  const base = campaignLine(newVehicleId, clientId, billDate);
                  const { advertisementDays, offDays } = calculateDaysForLine(
                    newVehicleId,
                    base.startDate,
                    base.endDate,
                  );
                  updateLine(index, {
                    ...base,
                    advertisementDays,
                    offDays,
                  });
                }}
              >
                {store.vehicles.map((vehicle) => (
                  <option value={vehicle.id} key={vehicle.id}>
                    {vehicle.number} · {vehicle.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>From date</span>
              <input
                type="date"
                value={line.startDate}
                onChange={(event) => {
                  const startDate = event.target.value;
                  const { advertisementDays, offDays } = calculateDaysForLine(
                    line.vehicleId,
                    startDate,
                    line.endDate,
                  );
                  updateLine(index, {
                    startDate,
                    advertisementDays,
                    offDays,
                  });
                }}
              />
            </label>
            <label>
              <span>To date</span>
              <input
                type="date"
                value={line.endDate}
                onChange={(event) => {
                  const endDate = event.target.value;
                  const { advertisementDays, offDays } = calculateDaysForLine(
                    line.vehicleId,
                    line.startDate,
                    endDate,
                  );
                  updateLine(index, {
                    endDate,
                    advertisementDays,
                    offDays,
                  });
                }}
              />
            </label>
            <label>
              <span>Present days</span>
              <input
                type="number"
                min="0"
                value={line.advertisementDays}
                onChange={(event) => {
                  const advertisementDays = Number(event.target.value);
                  const bookedDays =
                    line.startDate <= line.endDate
                      ? inclusiveDays(line.startDate, line.endDate)
                      : 0;
                  updateLine(index, {
                    advertisementDays,
                    offDays: Math.max(0, bookedDays - advertisementDays),
                  });
                }}
              />
            </label>
            <label>
              <span>Daily rent</span>
              <input
                type="number"
                min="0"
                value={line.dailyRate}
                onChange={(event) =>
                  updateLine(index, { dailyRate: Number(event.target.value) })
                }
              />
            </label>
            <b style={{ display: "flex", alignItems: "center", fontSize: "15px" }}>
              {money(
                line.advertisementDays *
                  line.dailyRate *
                  (line.quantity ?? 1),
              )}
            </b>
            <button
              title="Remove line"
              onClick={() =>
                setLines((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
            <small>
              {inclusiveDays(line.startDate, line.endDate)} booked days ·{" "}
              {line.advertisementDays} present days (editable) ·{" "}
              {line.offDays} absent days
            </small>
          </div>
        ))}
        <div className="op-section-title">
          <h2>Charges and discounts</h2>
          <Button
            secondary
            onClick={() =>
              setCharges((current) => [
                ...current,
                {
                  category: "Banner / printing",
                  description: "",
                  quantity: 1,
                  rate: 0,
                },
              ])
            }
          >
            <Plus size={16} />
            Charge
          </Button>
        </div>
        {charges.map((charge, index) => (
          <div className="op-charge-editor" key={index}>
            <select
              value={charge.category}
              onChange={(event) => {
                const category = event.target.value as BillChargeCategory;
                const startDate = charge.fromDate || lines[0]?.startDate || billDate;
                const endDate = charge.toDate || lines[0]?.endDate || billDate;
                const duration = campaignDurationMonths(startDate, endDate);
                if (category === "Municipal tax") {
                  updateCharge(index, {
                    category,
                    quantity: duration,
                    description: charge.description || `Municipal tax (${duration} mo)`,
                    fromDate: startDate,
                    toDate: endDate,
                  });
                } else {
                  updateCharge(index, { category });
                }
              }}
            >
              {[
                "Banner / printing",
                "Pasting",
                "Recording",
                "Municipal tax",
                "Design",
                "Tea",
                "Breakfast",
                "Lunch",
                "Dinner",
                "Miscellaneous",
                "Discount",
              ].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <input
              placeholder="Size, vehicle type, or agreed details"
              value={charge.description}
              onChange={(event) =>
                updateCharge(index, { description: event.target.value })
              }
            />
            <input
              aria-label="Quantity"
              type="number"
              min="0"
              value={charge.quantity}
              onChange={(event) =>
                updateCharge(index, { quantity: Number(event.target.value) })
              }
            />
            <input
              aria-label="Rate"
              type="number"
              min="0"
              step="0.01"
              value={charge.rate}
              onChange={(event) =>
                updateCharge(index, { rate: Number(event.target.value) })
              }
            />
            <label className="op-charge-date"><span>From date</span><input aria-label="From date" type="date" value={charge.fromDate ?? ""} onChange={(event) => updateCharge(index, { fromDate: event.target.value })} /></label>
            <label className="op-charge-date"><span>To date</span><input aria-label="To date" type="date" value={charge.toDate ?? ""} onChange={(event) => updateCharge(index, { toDate: event.target.value })} /></label>
            <b>{money(charge.quantity * charge.rate)}</b>
            <button
              title="Remove charge"
              onClick={() =>
                setCharges((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {availableReceipts.length > 0 && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "14px 16px",
              margin: "12px 0 16px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <b style={{ color: "#166534", fontSize: "14px" }}>
                  Client Receipts Found ({availableReceipts.length} receipt{availableReceipts.length > 1 ? "s" : ""})
                </b>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#4b5563" }}>
                  Selected receipts will be summed into this bill&apos;s advance received:
                </p>
              </div>
              <Button
                secondary
                type="button"
                style={{ fontSize: "12px", padding: "4px 10px" }}
                onClick={() => {
                  if (selectedReceiptIds.length === availableReceipts.length) {
                    setSelectedReceiptIds([]);
                  } else {
                    setSelectedReceiptIds(availableReceipts.map((r) => r.id));
                  }
                }}
              >
                {selectedReceiptIds.length === availableReceipts.length
                  ? "Deselect all"
                  : "Select all"}
              </Button>
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              {availableReceipts.map((r) => {
                const isSelected = selectedReceiptIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: isSelected ? "#dcfce7" : "#ffffff",
                      border: `1px solid ${isSelected ? "#86efac" : "#e5e7eb"}`,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReceiptIds((curr) => [...curr, r.id]);
                          } else {
                            setSelectedReceiptIds((curr) =>
                              curr.filter((id) => id !== r.id),
                            );
                          }
                        }}
                      />
                      <div>
                        <b>REC-{String(r.number).padStart(4, "0")}</b>
                        <span style={{ color: "#4b5563", marginLeft: "8px" }}>
                          {fmt(r.receiptDate)} · {r.paymentMode}
                          {r.note ? ` · ${r.note}` : ""}
                        </span>
                      </div>
                    </div>
                    <strong style={{ color: "#166534" }}>{money(r.amount)}</strong>
                  </label>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid #bbf7d0",
                fontSize: "13px",
              }}
            >
              <span>Selected Receipts Sum:</span>
              <strong style={{ color: "#166534", fontSize: "14px" }}>
                {money(selectedReceiptsTotal)}
              </strong>
            </div>
          </div>
        )}
        <div className="op-bill-total">
          {availableReceipts.length > 0 ? (
            <div style={{ display: "grid", gap: "6px" }}>
              <label className="op-field">
                <span>Additional manual advance (₹)</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={extraAdvance || ""}
                  onChange={(event) =>
                    setExtraAdvance(Math.max(0, Number(event.target.value)))
                  }
                />
              </label>
              <div
                style={{
                  fontSize: "13px",
                  display: "flex",
                  justifyContent: "space-between",
                  background: "#f3f7f4",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span>Total Advance Applied:</span>
                <b style={{ color: "#1f6a53" }}>{money(advance)}</b>
              </div>
            </div>
          ) : (
            <label className="op-field">
              <span>Client advance received</span>
              <input
                type="number"
                min="0"
                value={extraAdvance || ""}
                onChange={(event) =>
                  setExtraAdvance(Math.max(0, Number(event.target.value)))
                }
              />
            </label>
          )}
          {bill && (
            <div style={{ display: "grid", gap: "2px", textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: "#687670" }}>Total collected (Advance + Payments)</span>
              <b>{money(totalCollected)}</b>
            </div>
          )}

          {bill && payments.length > 0 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "grid",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  Installment Payments on this Bill ({payments.length}):
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Adjust amounts if the client paid less
                </span>
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {payments.map((p, pIdx) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "white",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <b>Installment #{pIdx + 1}</b> · <span style={{ color: "#64748b" }}>{fmt(p.date)}</span> ·{" "}
                      <span style={{ fontWeight: 600, color: "#0f766e" }}>{p.mode}</span>
                      {p.note && <span style={{ color: "#64748b" }}> · {p.note}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Amount: ₹</span>
                      <input
                        type="number"
                        min="0"
                        value={p.amount}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setPayments((curr) =>
                            curr.map((item) => (item.id === p.id ? { ...item, amount: val } : item))
                          );
                        }}
                        style={{
                          width: "110px",
                          height: "32px",
                          padding: "0 8px",
                          borderRadius: "4px",
                          border: "1px solid #94a3b8",
                          fontWeight: 700,
                          textAlign: "right",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove installment payment of ${money(p.amount)}?`)) {
                            setPayments((curr) => curr.filter((item) => item.id !== p.id));
                          }
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        title="Delete installment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bill && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                background: enableLoss ? "#fff5f5" : "#f8faf9",
                border: `1px solid ${enableLoss ? "#fed7d7" : "#e2e8f0"}`,
                display: "grid",
                gap: "8px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: enableLoss ? "#9b2c2c" : "#2d3748",
                  fontSize: "13.5px",
                }}
              >
                <input
                  type="checkbox"
                  checked={enableLoss}
                  onChange={(e) => {
                    setEnableLoss(e.target.checked);
                    if (e.target.checked && (!lossAmount || lossAmount <= 0)) {
                      setLossAmount(remainingBalance > 0 ? remainingBalance : 0);
                    }
                  }}
                  style={{ width: "16px", height: "16px", accentColor: "#c53030" }}
                />
                Record / Adjust Credit Note for this bill
              </label>
              {enableLoss && (
                <>
                  <div className="op-form-grid" style={{ gap: "10px" }}>
                    <label className="op-field">
                      <span>Credit Note Amount (₹)</span>
                      <input
                        type="number"
                        min="0"
                        value={lossAmount || ""}
                        onChange={(e) => setLossAmount(Math.max(0, Number(e.target.value)))}
                        placeholder="e.g. 500"
                        required
                      />
                    </label>
                    <label className="op-field">
                      <span>Credit Note Date</span>
                      <input
                        type="date"
                        value={lossDate}
                        onChange={(e) => setLossDate(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <label className="op-field" style={{ margin: 0 }}>
                    <span>Credit Note Reason / Note</span>
                    <input
                      type="text"
                      value={lossReason}
                      onChange={(e) => setLossReason(e.target.value)}
                      placeholder="e.g. Client underpayment / short-payment settlement"
                    />
                  </label>
                  <small style={{ color: "#742a2a", fontSize: "12px" }}>
                    Settlement credit note allowance — deducted from receivable balance and shown on receipts and reports.
                  </small>
                </>
              )}
            </div>
          )}

          {bill && remainingBalance > 0 && !enableLoss && (
            <div className="op-full-payment">
              <label>
                <input
                  type="checkbox"
                  checked={markFullPayment}
                  onChange={(event) => setMarkFullPayment(event.target.checked)}
                />
                <span>Mark full payment received</span>
              </label>
              {markFullPayment && (
                <label className="op-field">
                  <span>Full payment date</span>
                  <input
                    type="date"
                    value={fullPaymentDate}
                    onChange={(event) => setFullPaymentDate(event.target.value)}
                  />
                </label>
              )}
            </div>
          )}

          <div style={{ display: "grid", gap: "4px", textAlign: "right", marginTop: "8px" }}>
            <span style={{ fontSize: "13px", color: "#687670" }}>
              Total Collected: <b>{money(totalCollected)}</b>
            </span>
            {activeLoss > 0 && (
              <span style={{ fontSize: "13px", color: "#c2410c", fontWeight: 700 }}>
                Credit Note: −{money(activeLoss)}
              </span>
            )}
          </div>
          <p>
            <span>Bill total</span>
            <strong>{money(total)}</strong>
            <small style={{ color: remainingBalance === 0 ? "#1f6a53" : "#9a493d", fontWeight: 700 }}>
              {remainingBalance === 0
                ? "Balance ₹0 (Settled / Paid)"
                : `Balance ${money(markFullPayment ? 0 : remainingBalance)}`}
            </small>
          </p>
        </div>
        <footer className="op-editor-actions">
          <Button secondary onClick={cancel}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <FileText size={17} />
            {bill
              ? markFullPayment
                ? "Save bill & mark paid"
                : "Save bill changes"
              : "Generate bill"}
          </Button>
        </footer>
      </section>
    </div>
  );
}

export function QuotationComposer({
  store,
  cancel,
  preview,
}: {
  store: FleetStore;
  cancel: () => void;
  preview: (quotation: Bill) => void;
}) {
  const [clientId, setClientId] = useState(store.clients[0]?.id ?? 0);
  const [quotationDate, setQuotationDate] = useState(isoToday());
  const newLine = (vehicleId = store.vehicles[0]?.id ?? 0): BillLineDraft => {
    const vehicle = store.vehicles.find((item) => item.id === vehicleId);
    return {
      vehicleId,
      label: vehicle
        ? `${vehicle.number} · ${vehicle.type}`
        : "Campaign vehicle",
      quantity: 1,
      startDate: quotationDate,
      endDate: quotationDate,
      advertisementDays: 1,
      offDays: 0,
      dailyRate: 0,
    };
  };
  const [lines, setLines] = useState<BillLineDraft[]>([newLine()]);
  const [charges, setCharges] = useState<ChargeDraft[]>([]);
  const updateLine = (index: number, patch: Partial<BillLineDraft>) =>
    setLines((current) =>
      current.map((line, itemIndex) =>
        itemIndex === index ? { ...line, ...patch } : line,
      ),
    );
  const updateCharge = (index: number, patch: Partial<ChargeDraft>) =>
    setCharges((current) =>
      current.map((charge, itemIndex) =>
        itemIndex === index ? { ...charge, ...patch } : charge,
      ),
    );
  const finalLines: BillVehicleLine[] = lines.map((line, index) => ({
    ...line,
    id: index + 1,
    bookedDays:
      line.startDate <= line.endDate
        ? inclusiveDays(line.startDate, line.endDate)
        : 0,
    driverNames: [],
  }));
  const finalCharges: BillCharge[] = charges.map((charge, index) => ({
    ...charge,
    id: index + 1,
    amount: charge.quantity * charge.rate,
  }));
  const total = calculateBillTotal(finalLines, finalCharges);
  const submit = () => {
    const client = store.clients.find((item) => item.id === clientId);
    if (!client || !lines.length) return;
    preview({
      id: 0,
      number: nextBillNumber(store.bills, store.nextBillNumber),
      billDate: quotationDate,
      clientId,
      client: {
        firmName: client.firmName,
        ownerName: client.ownerName,
        address: client.address,
        mobile: client.mobile,
        email: client.email,
      },
      vehicleLines: finalLines,
      charges: finalCharges,
      advanceReceived: 0,
      paymentMode: "Cash",
      payments: [],
      total,
      status: "Pending",
    });
  };
  return (
    <div className="op-workspace">
      <PageHead
        title="Create quotation"
        detail="Select a client profile and enter the proposed work"
      />
      <section className="op-editor">
        <div className="op-form-grid">
          <label className="op-field">
            <span>Client profile</span>
            <select
              value={clientId}
              onChange={(event) => setClientId(Number(event.target.value))}
            >
              {store.clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.firmName} · {client.ownerName || client.mobile}
                </option>
              ))}
            </select>
          </label>
          <label className="op-field">
            <span>Quotation date</span>
            <input
              type="date"
              value={quotationDate}
              onChange={(event) => setQuotationDate(event.target.value)}
            />
          </label>
        </div>
        <div className="op-section-title">
          <h2>Vehicle lines</h2>
          <Button
            secondary
            onClick={() => setLines((current) => [...current, newLine()])}
          >
            <Plus size={16} />
            Vehicle
          </Button>
        </div>
        {lines.map((line, index) => (
          <div className="op-line-editor op-quotation-line" key={index}>
            <label>
              <span>Vehicle</span>
              <select
                value={line.vehicleId}
                onChange={(event) => {
                  const vehicleId = Number(event.target.value),
                    vehicle = store.vehicles.find(
                      (item) => item.id === vehicleId,
                    );
                  updateLine(index, {
                    vehicleId,
                    label: vehicle
                      ? `${vehicle.number} · ${vehicle.type}`
                      : "Campaign vehicle",
                  });
                }}
              >
                {store.vehicles.map((vehicle) => (
                  <option value={vehicle.id} key={vehicle.id}>
                    {vehicle.number} · {vehicle.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                value={line.quantity ?? 1}
                onChange={(event) =>
                  updateLine(index, {
                    quantity: Math.max(1, Number(event.target.value)),
                  })
                }
              />
            </label>
            <label>
              <span>Start</span>
              <input
                type="date"
                value={line.startDate}
                onChange={(event) => {
                  const startDate = event.target.value;
                  updateLine(index, {
                    startDate,
                    advertisementDays:
                      startDate <= line.endDate
                        ? inclusiveDays(startDate, line.endDate)
                        : 0,
                  });
                }}
              />
            </label>
            <label>
              <span>End</span>
              <input
                type="date"
                value={line.endDate}
                onChange={(event) => {
                  const endDate = event.target.value;
                  updateLine(index, {
                    endDate,
                    advertisementDays:
                      line.startDate <= endDate
                        ? inclusiveDays(line.startDate, endDate)
                        : 0,
                  });
                }}
              />
            </label>
            <label>
              <span>Billable days</span>
              <input
                type="number"
                min="0"
                value={line.advertisementDays}
                onChange={(event) =>
                  updateLine(index, {
                    advertisementDays: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              <span>Rate / day</span>
              <input
                type="number"
                min="0"
                value={line.dailyRate}
                onChange={(event) =>
                  updateLine(index, { dailyRate: Number(event.target.value) })
                }
              />
            </label>
            <button
              title="Remove line"
              onClick={() =>
                setLines((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
            <small>
              {line.advertisementDays} days × {line.quantity ?? 1} ×{" "}
              {money(line.dailyRate)} ={" "}
              {money(
                line.advertisementDays * (line.quantity ?? 1) * line.dailyRate,
              )}
            </small>
          </div>
        ))}
        <div className="op-section-title">
          <h2>Charges and discounts</h2>
          <Button
            secondary
            onClick={() =>
              setCharges((current) => [
                ...current,
                {
                  category: "Banner / printing",
                  description: "",
                  quantity: 1,
                  rate: 0,
                },
              ])
            }
          >
            <Plus size={16} />
            Charge
          </Button>
        </div>
        {charges.map((charge, index) => (
          <div className="op-charge-editor" key={index}>
            <select
              value={charge.category}
              onChange={(event) =>
                updateCharge(index, {
                  category: event.target.value as BillChargeCategory,
                })
              }
            >
              {campaignChargeCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <input
              placeholder="Size, vehicle type, or agreed details"
              value={charge.description}
              onChange={(event) =>
                updateCharge(index, { description: event.target.value })
              }
            />
            <input
              aria-label="Quantity"
              type="number"
              min="0"
              value={charge.quantity}
              onChange={(event) =>
                updateCharge(index, { quantity: Number(event.target.value) })
              }
            />
            <input
              aria-label="Rate"
              type="number"
              min="0"
              value={charge.rate}
              onChange={(event) =>
                updateCharge(index, { rate: Number(event.target.value) })
              }
            />
            <b>{money(charge.quantity * charge.rate)}</b>
            <button
              title="Remove charge"
              onClick={() =>
                setCharges((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <div className="op-bill-total op-quotation-total">
          <p>
            <span>Quotation total</span>
            <strong>{money(total)}</strong>
            <small>No invoice or payment record will be created.</small>
          </p>
        </div>
        <footer className="op-editor-actions">
          <Button secondary onClick={cancel}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <FileText size={17} />
            Preview quotation
          </Button>
        </footer>
      </section>
    </div>
  );
}

export function BillPaymentModal({
  bill,
  close,
  save,
}: {
  bill: Bill;
  close: () => void;
  save: (
    date: string,
    amount: number,
    mode: PaymentMode,
    reference: string,
    note: string,
    lossOptions?: { lossAmount: number; lossReason?: string },
  ) => void;
}) {
  const balance = billBalance(bill);
  const [payAmount, setPayAmount] = useState<number>(balance);
  const remainingUnpaid = Math.max(0, balance - payAmount);
  const [recordLoss, setRecordLoss] = useState(false);
  const [lossAmount, setLossAmount] = useState<number>(remainingUnpaid);
  const [lossReason, setLossReason] = useState("Client underpayment settlement / bad debt");
  const [date, setDate] = useState(isoToday());
  const [mode, setMode] = useState<PaymentMode>(bill.paymentMode || "Cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (payAmount > balance) {
      alert(`Amount cannot exceed the balance of ${money(balance)}.`);
      return;
    }
    const lossOpts =
      recordLoss && lossAmount > 0
        ? { lossAmount: Math.min(lossAmount, remainingUnpaid), lossReason }
        : undefined;
    save(date, payAmount, mode, reference, note, lossOpts);
  };

  return (
    <Modal
      title={
        payAmount === 0
          ? `Record Credit Note Settlement · INV-${String(bill.number).padStart(4, "0")}`
          : `Record payment · INV-${String(bill.number).padStart(4, "0")}`
      }
      close={close}
    >
      <form className="op-form" onSubmit={submit}>
        <p className="op-form-note">
          The full outstanding balance is prefilled. Save it to mark this
          invoice as Paid, or enter a smaller amount for a partial payment. ·
          Paid so far: <b>{money(billPaid(bill))}</b> · Remaining:{" "}
          <b>{money(balance)}</b>
          {Boolean(bill.lossAmount && bill.lossAmount > 0) && (
            <span> · Previous Credit Note: <b style={{ color: "#c2410c" }}>{money(bill.lossAmount!)}</b></span>
          )}
        </p>
        <div className="op-form-grid">
          <label className="op-field">
            <span>{payAmount > 0 ? "Payment date" : "Date recorded"}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="op-field">
            <span>Amount received (₹)</span>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setPayAmount(val);
                const rem = Math.max(0, balance - val);
                if (rem > 0) {
                  setLossAmount(rem);
                  if (val === 0) setRecordLoss(true);
                } else {
                  setRecordLoss(false);
                }
              }}
              min={0}
              max={balance}
              required
            />
          </label>
          {payAmount > 0 && (
            <label className="op-field">
              <span>Payment mode (for received amount)</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
                required
              >
                <option>Cash</option>
                <option>Cheque</option>
                <option>UPI</option>
                <option>Bank transfer</option>
                <option>Online</option>
              </select>
            </label>
          )}
        </div>
        {payAmount > 0 && (
          <>
            <label className="op-field">
              <span>Transaction / receipt reference</span>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <label className="op-field">
              <span>Payment note</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </>
        )}

        {remainingUnpaid > 0 && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: recordLoss ? "#fff5f5" : "#f8faf9",
              border: `1px solid ${recordLoss ? "#fed7d7" : "#e2e8f0"}`,
              display: "grid",
              gap: "8px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontWeight: 600,
                color: recordLoss ? "#9b2c2c" : "#2d3748",
                fontSize: "13px",
              }}
            >
              <input
                type="checkbox"
                checked={recordLoss}
                onChange={(e) => {
                  setRecordLoss(e.target.checked);
                  if (e.target.checked && (!lossAmount || lossAmount <= 0)) {
                    setLossAmount(remainingUnpaid);
                  }
                }}
                style={{ width: "16px", height: "16px", accentColor: "#c53030" }}
              />
              Record remaining balance of {money(remainingUnpaid)} as Credit Note (client underpayment settlement / haircut)
            </label>
            <small style={{ color: "#742a2a", margin: "-4px 0 0 24px", fontSize: "12px" }}>
              Credit notes are recorded as settlement discounts without payment mode.
            </small>
            {recordLoss && (
              <div className="op-form-grid" style={{ marginTop: "4px" }}>
                <label className="op-field">
                  <span>Credit Note amount (₹)</span>
                  <input
                    type="number"
                    min={0}
                    max={bill.total}
                    value={lossAmount}
                    onChange={(e) => setLossAmount(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </label>
                <label className="op-field">
                  <span>Credit Note reason / note</span>
                  <input
                    type="text"
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    placeholder="e.g. Client short-paid remainder"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            style={
              payAmount === 0
                ? { background: "#c53030", borderColor: "#c53030", color: "white" }
                : undefined
            }
          >
            {payAmount === 0 ? (
              <>
                <TrendingDown size={17} />
                Save client loss
              </>
            ) : recordLoss ? (
              <>
                <Check size={17} />
                Save payment & record loss
              </>
            ) : (
              <>
                <Check size={17} />
                Save payment
              </>
            )}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function RecordLossModal({
  bill,
  close,
  save,
}: {
  bill: Bill | OtherBill;
  close: () => void;
  save: (lossAmount: number, lossReason?: string, lossDate?: string) => void;
}) {
  const currentPaid = billPaid(bill);
  const currentLoss = bill.lossAmount ?? 0;
  const suggestedLoss = currentLoss > 0 ? currentLoss : Math.max(0, bill.total - currentPaid);
  const [lossAmount, setLossAmount] = useState(suggestedLoss);
  const [lossReason, setLossReason] = useState(bill.lossReason ?? "Client underpayment / bad debt settlement");
  const [lossDate, setLossDate] = useState(bill.lossDate ?? isoToday());

  const remainingAfterLoss = Math.max(0, bill.total - currentPaid - (Number(lossAmount) || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(lossAmount) || 0;
    save(amountVal, lossReason.trim(), lossDate);
  };

  const invoiceLabel = "vehicleLines" in bill
    ? `INV-${String(bill.number).padStart(4, "0")}`
    : `OTH-${String(bill.number).padStart(4, "0")}`;

  return (
    <Modal
      title={`Record Credit Note · ${invoiceLabel}`}
      close={close}
      width="min(620px, 96vw)"
    >
      <form className="op-form" onSubmit={handleSubmit}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "7px",
            background: "#fff5f5",
            border: "1px solid #fed7d7",
            display: "grid",
            gap: "4px",
            fontSize: "13px",
            color: "#9b2c2c",
          }}
        >
          <b>Client: {bill.client.firmName}</b>
          <span>
            Bill Total: <b>{money(bill.total)}</b> · Paid so far: <b>{money(currentPaid)}</b>
          </span>
          <span>
            Unpaid remainder: <b>{money(Math.max(0, bill.total - currentPaid))}</b>
          </span>
          <small style={{ color: "#742a2a", marginTop: "2px" }}>
            Record the settled discount / credit note amount so you can track total credit notes, see settlement allowances, and maintain accurate ledger balances.
          </small>
        </div>

        <div className="op-form-grid">
          <label className="op-field">
            <span>Credit Note Amount (₹)</span>
            <input
              type="number"
              min="0"
              max={bill.total}
              value={lossAmount}
              onChange={(e) => setLossAmount(Math.max(0, Number(e.target.value)))}
              required
            />
          </label>
          <label className="op-field">
            <span>Credit Note Date</span>
            <input
              type="date"
              value={lossDate}
              onChange={(e) => setLossDate(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="op-field">
          <span>Reason / Note</span>
          <input
            type="text"
            placeholder="e.g. Client underpayment settlement, negotiated haircut, credit note"
            value={lossReason}
            onChange={(e) => setLossReason(e.target.value)}
          />
        </label>

        {Number(lossAmount) > 0 && (
          <p style={{ margin: "4px 0 0", color: "#c2410c", fontSize: "12px", fontWeight: 600 }}>
            • {money(Number(lossAmount))} will be recorded as a Credit Note.
          </p>
        )}

        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          {currentLoss > 0 && (
            <Button
              secondary
              style={{ color: "#a1483b" }}
              onClick={() => save(0, undefined, undefined)}
            >
              Clear Credit Note
            </Button>
          )}
          <Button type="submit" style={{ background: "#c2410c", borderColor: "#c2410c", color: "white" }}>
            Save Credit Note
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function CampaignBillModeModal({
  booking,
  store,
  close,
  generate,
  viewBill,
  onEditExisting,
  recordLoss,
  generateReceipt,
  viewReceipt,
  editReceipt,
  removeReceipt,
}: {
  booking: CampaignBooking;
  store?: FleetStore;
  close: () => void;
  generate: (
    mode: PaymentMode,
    options?: {
      billScope: "full" | "monthly" | "custom";
      fromDate: string;
      toDate: string;
      billLabel?: string;
      existingBillId?: number;
    }
  ) => void;
  viewBill?: (bill: Bill) => void;
  onEditExisting?: (bill: Bill) => void;
  recordLoss?: (bill: Bill) => void;
  generateReceipt?: (clientId?: number) => void;
  viewReceipt?: (receipt: ClientReceipt) => void;
  editReceipt?: (receipt: ClientReceipt) => void;
  removeReceipt?: (receiptId: number) => void;
}) {
  const endDate = bookingEnd(booking);

  const actualClientId =
    (store?.clients ?? []).find(
      (c) =>
        c.id === booking.clientId ||
        (booking.client.mobile && c.mobile === booking.client.mobile) ||
        c.firmName.trim().toLowerCase() === booking.client.firmName.trim().toLowerCase()
    )?.id ?? booking.clientId;

  const campaignReceipts = (store?.receipts ?? []).filter((r) => {
    if (actualClientId && r.clientId === actualClientId) return true;
    if (
      r.client?.firmName &&
      booking.client.firmName &&
      r.client.firmName.trim().toLowerCase() === booking.client.firmName.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  const totalReceiptsAmount = campaignReceipts.reduce((sum, r) => sum + r.amount, 0);
  const unbilledReceipts = campaignReceipts.filter((r) => r.status !== "Billed" && !r.billId);
  const unbilledReceiptsAmount = unbilledReceipts.reduce((sum, r) => sum + r.amount, 0);
  
  // Calculate monthly periods for the campaign
  const monthlyPeriods: { label: string; from: string; to: string; existingBill?: Bill }[] = [];
  let cur = new Date(booking.startDate);
  const fin = new Date(endDate);
  let cycle = 1;
  while (cur <= fin) {
    const next = new Date(cur);
    next.setMonth(next.getMonth() + 1);
    next.setDate(next.getDate() - 1);
    const chunkEnd = next < fin ? next : fin;
    const fromStr = cur.toISOString().slice(0, 10);
    const toStr = chunkEnd.toISOString().slice(0, 10);
    const mName = cur.toLocaleString("default", { month: "short", year: "numeric" });
    const existingBill = store ? findCampaignBillForRange(store, booking, fromStr, toStr) : undefined;
    monthlyPeriods.push({
      label: `Month ${cycle} (${mName}: ${fmt(fromStr)} to ${fmt(toStr)})`,
      from: fromStr,
      to: toStr,
      existingBill,
    });
    cur = new Date(chunkEnd);
    cur.setDate(cur.getDate() + 1);
    cycle++;
  }

  const [scope, setScope] = useState<"full" | "monthly" | "custom">(
    monthlyPeriods.length > 1 ? "monthly" : "full"
  );
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const [customFrom, setCustomFrom] = useState(booking.startDate);
  const [customTo, setCustomTo] = useState(endDate);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");

  const effectiveFrom =
    scope === "monthly" && monthlyPeriods[selectedPeriodIdx]
      ? monthlyPeriods[selectedPeriodIdx].from
      : scope === "custom"
        ? customFrom
        : booking.startDate;

  const effectiveTo =
    scope === "monthly" && monthlyPeriods[selectedPeriodIdx]
      ? monthlyPeriods[selectedPeriodIdx].to
      : scope === "custom"
        ? customTo
        : endDate;

  const currentExistingBill = store
    ? findCampaignBillForRange(store, booking, effectiveFrom, effectiveTo)
    : undefined;

  const handleGenerate = () => {
    if (currentExistingBill) {
      if (onEditExisting) {
        onEditExisting(currentExistingBill);
        return;
      }
    }
    if (scope === "monthly" && monthlyPeriods[selectedPeriodIdx]) {
      const p = monthlyPeriods[selectedPeriodIdx];
      generate(paymentMode, {
        billScope: "monthly",
        fromDate: p.from,
        toDate: p.to,
        billLabel: p.label,
        existingBillId: currentExistingBill?.id,
      });
    } else if (scope === "custom") {
      generate(paymentMode, {
        billScope: "custom",
        fromDate: customFrom,
        toDate: customTo,
        billLabel: `${fmt(customFrom)} to ${fmt(customTo)}`,
        existingBillId: currentExistingBill?.id,
      });
    } else {
      generate(paymentMode, {
        billScope: "full",
        fromDate: booking.startDate,
        toDate: endDate,
        existingBillId: currentExistingBill?.id,
      });
    }
  };

  const allCampaignBills = store ? findAllCampaignBills(store, booking) : [];

  return (
    <Modal
      title={`Campaign Billing & Invoices · ${booking.client.firmName}`}
      close={close}
      width="min(1080px, 96vw)"
      className="op-campaign-billing-modal"
      style={{ width: "min(1080px, 96vw)", maxWidth: "96vw", overflowX: "hidden" }}
    >
      <div className="op-form op-campaign-billing-modal" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        <p className="op-form-note">
          Campaign booking: <b>{fmt(booking.startDate)}</b> to <b>{fmt(endDate)}</b>
        </p>

        {/* Client Receipts Section */}
        <div
          style={{
            padding: "13px 15px",
            borderRadius: "8px",
            background: "#f7f2fc",
            border: "1px solid #d9c8f3",
            display: "grid",
            gap: "8px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <ReceiptText size={17} style={{ color: "#6b21a8" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#581c87" }}>
                Client Advance Receipts ({campaignReceipts.length}):
              </span>
              {campaignReceipts.length > 0 && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#581c87",
                    background: "#ede4f9",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: 600,
                  }}
                >
                  Total: {money(totalReceiptsAmount)}
                  {unbilledReceiptsAmount > 0 ? ` · ${money(unbilledReceiptsAmount)} Unbilled Advance` : ""}
                </span>
              )}
            </div>
            {generateReceipt && (
              <Button
                secondary
                onClick={() => generateReceipt(actualClientId)}
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  minHeight: "32px",
                  borderColor: "#c084fc",
                  color: "#6b21a8",
                  background: "white",
                  fontWeight: 700,
                  flexShrink: 0,
                  marginLeft: "auto",
                }}
              >
                <Plus size={14} /> + Generate receipt
              </Button>
            )}
          </div>

          {campaignReceipts.length === 0 ? (
            <div
              style={{
                padding: "10px 14px",
                background: "white",
                borderRadius: "6px",
                border: "1px dashed #d8cbef",
                fontSize: "12px",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span>No advance receipts recorded yet for this client. You can create payment receipts anytime to credit them into bills.</span>
              {generateReceipt && (
                <Button
                  secondary
                  onClick={() => generateReceipt(actualClientId)}
                  style={{ fontSize: "12px", padding: "3px 8px", minHeight: "28px", marginLeft: "auto" }}
                >
                  <Plus size={13} /> Add receipt
                </Button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "6px" }}>
              {campaignReceipts.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "8px 12px",
                    background: "white",
                    borderRadius: "6px",
                    border: "1px solid #dfd3f4",
                    fontSize: "13px",
                    flexWrap: "wrap",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px 8px", flexWrap: "wrap", minWidth: 0 }}>
                    <b style={{ color: "#6b21a8", whiteSpace: "nowrap" }}>REC-{String(r.number).padStart(4, "0")}</b>
                    <span style={{ color: "#9ca3af" }}>·</span>
                    <span style={{ color: "#4b5563", whiteSpace: "nowrap" }}>{fmt(r.receiptDate)}</span>
                    <span style={{ color: "#9ca3af" }}>·</span>
                    <b style={{ color: "#165b47", whiteSpace: "nowrap" }}>{money(r.amount)}</b>
                    <span style={{ color: "#9ca3af" }}>·</span>
                    <span style={{ color: "#54645f", whiteSpace: "nowrap" }}>{r.paymentMode}</span>
                    {r.reference ? (
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>({r.reference})</span>
                    ) : null}
                    <span style={{ color: "#9ca3af" }}>·</span>
                    {r.status === "Billed" || r.billId ? (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: "#e6f4ea",
                          color: "#137333",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Billed {r.billNumber ? `(INV-${String(r.billNumber).padStart(4, "0")})` : ""}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: "#fef3c7",
                          color: "#92400e",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Advance Available (Unbilled)
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "auto" }}>
                    {viewReceipt && (
                      <Button secondary onClick={() => viewReceipt(r)} title="View printable receipt">
                        <Printer size={14} /> View
                      </Button>
                    )}
                    {editReceipt && (
                      <Button secondary onClick={() => editReceipt(r)} title="Edit receipt details">
                        <FileText size={14} /> Edit
                      </Button>
                    )}
                    {removeReceipt && (
                      <Button
                        secondary
                        style={{ color: "#a1483b" }}
                        onClick={() => removeReceipt(r.id)}
                        title="Delete receipt"
                      >
                        <Trash2 size={14} /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {allCampaignBills.length > 0 && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#edf7f3",
              border: "1px solid #b8ddd0",
              display: "grid",
              gap: "8px",
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#165b47" }}>
              Existing bills for this campaign ({allCampaignBills.length}):
            </span>
            <div style={{ display: "grid", gap: "6px" }}>
              {allCampaignBills.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "8px 12px",
                    background: "white",
                    borderRadius: "6px",
                    border: "1px solid #cfe3da",
                    fontSize: "13px",
                    flexWrap: "wrap",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", minWidth: 0 }}>
                    <b style={{ color: "#165b47", whiteSpace: "nowrap" }}>INV-{String(b.number).padStart(4, "0")}</b>
                    <span style={{ color: "#54645f" }}>·</span>
                    <span style={{ color: "#54645f", whiteSpace: "nowrap" }}>
                      {b.vehicleLines[0]?.startDate
                        ? `${fmt(b.vehicleLines[0].startDate)} to ${fmt(b.vehicleLines[0].endDate)}`
                        : fmt(b.billDate)}
                    </span>
                    <span style={{ color: "#54645f" }}>·</span>
                    <b style={{ whiteSpace: "nowrap" }}>{money(b.total)}</b>
                    <span style={{ color: "#54645f" }}>·</span>
                    <span style={{ fontWeight: 600, color: b.status === "Paid" ? "#195f4b" : "#854d0e", whiteSpace: "nowrap" }}>
                      {b.status}
                    </span>
                    {b.lossAmount ? (
                      <>
                        <span style={{ color: "#54645f" }}>·</span>
                        <span style={{ color: "#c2410c", background: "#ffedd5", padding: "1px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                          Credit Note: {money(b.lossAmount)}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "auto" }}>
                    {recordLoss && (
                      <Button
                        secondary
                        onClick={() => recordLoss(b)}
                        style={{ color: b.lossAmount ? "#c2410c" : "#7c2d12", borderColor: "#fed7aa", fontSize: "12px", padding: "4px 8px" }}
                      >
                        <TrendingDown size={14} /> {b.lossAmount ? "Edit Credit Note" : "Credit Note"}
                      </Button>
                    )}
                    {viewBill && (
                      <Button secondary onClick={() => viewBill(b)}>
                        <Printer size={14} /> View
                      </Button>
                    )}
                    {onEditExisting && (
                      <Button secondary onClick={() => onEditExisting(b)}>
                        <FileText size={14} /> Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="op-field">
          <span>Bill Scope</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
          >
            <option value="full">Full Campaign Bill ({fmt(booking.startDate)} to {fmt(endDate)})</option>
            {monthlyPeriods.length > 0 && (
              <option value="monthly">Monthly Bill (Select Specific Month)</option>
            )}
            <option value="custom">Custom Date Range</option>
          </select>
        </label>

        {scope === "monthly" && (
          <label className="op-field">
            <span>Select Month to Bill</span>
            <select
              value={selectedPeriodIdx}
              onChange={(e) => setSelectedPeriodIdx(Number(e.target.value))}
            >
              {monthlyPeriods.map((p, idx) => (
                <option key={idx} value={idx}>
                  {p.label}{p.existingBill ? ` · [Already Billed: INV-${String(p.existingBill.number).padStart(4, "0")}]` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {scope === "custom" && (
          <>
            <div className="op-form-grid">
              <label className="op-field">
                <span>From Date</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="op-field">
                <span>To Date</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
            {customFrom && customTo && customFrom <= customTo && (
              <p className="op-form-note" style={{ margin: "2px 0 0" }}>
                Billing range: <b>{inclusiveDays(customFrom, customTo)} days</b> ({fmt(customFrom)} to {fmt(customTo)})
              </p>
            )}
          </>
        )}

        {currentExistingBill && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#fffbeb",
              border: "1px solid #f59e0b",
              color: "#92400e",
              display: "grid",
              gap: "4px",
              fontSize: "13px",
            }}
          >
            <b style={{ color: "#b45309" }}>
              ⚠️ A bill for this period already exists: INV-{String(currentExistingBill.number).padStart(4, "0")}
            </b>
            <span>
              Bill Date: <b>{fmt(currentExistingBill.billDate)}</b> · Total: <b>{money(currentExistingBill.total)}</b> · Status: <b>{currentExistingBill.status}</b>
            </span>
            <span style={{ fontSize: "12px", color: "#78350f" }}>
              To prevent duplicate bills, clicking below will edit the existing bill directly.
            </span>
          </div>
        )}

        <label className="op-field">
          <span>Payment Mode</span>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
          >
            <option>Cash</option>
            <option>UPI</option>
            <option>Cheque</option>
            <option>Bank transfer</option>
            <option>Online</option>
          </select>
        </label>

        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          {generateReceipt && (
            <Button
              secondary
              onClick={() => generateReceipt(actualClientId)}
              style={{ color: "#6b21a8", borderColor: "#d8cbef" }}
            >
              <ReceiptText size={16} />
              + Generate receipt
            </Button>
          )}
          {currentExistingBill && viewBill && (
            <Button secondary onClick={() => viewBill(currentExistingBill)}>
              <Printer size={17} />
              View bill
            </Button>
          )}
          {currentExistingBill && (
            <Button
              secondary
              onClick={() => {
                if (scope === "monthly" && monthlyPeriods[selectedPeriodIdx]) {
                  const p = monthlyPeriods[selectedPeriodIdx];
                  generate(paymentMode, {
                    billScope: "monthly",
                    fromDate: p.from,
                    toDate: p.to,
                    billLabel: p.label,
                  });
                } else if (scope === "custom") {
                  generate(paymentMode, {
                    billScope: "custom",
                    fromDate: customFrom,
                    toDate: customTo,
                    billLabel: `${fmt(customFrom)} to ${fmt(customTo)}`,
                  });
                } else {
                  generate(paymentMode, {
                    billScope: "full",
                    fromDate: booking.startDate,
                    toDate: endDate,
                  });
                }
              }}
            >
              <FileText size={17} />
              Generate new bill anyway
            </Button>
          )}
          <Button onClick={handleGenerate}>
            <FileText size={17} />
            {currentExistingBill ? `Edit existing bill (INV-${String(currentExistingBill.number).padStart(4, "0")})` : `Generate Bill (${fmt(effectiveFrom)} to ${fmt(effectiveTo)})`}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

export function ConsolidateBillsModal({
  store,
  close,
  preview,
}: {
  store: FleetStore;
  close: () => void;
  preview: (bills: Bill[]) => void;
}) {
  const eligibleClients = store.clients.filter((client) =>
    store.bills.some((bill) => bill.clientId === client.id),
  );
  const [clientId, setClientId] = useState(eligibleClients[0]?.id ?? 0);
  const clientBills = store.bills
    .filter((bill) => bill.clientId === clientId)
    .sort((left, right) => left.billDate.localeCompare(right.billDate));
  const [selectedIds, setSelectedIds] = useState<number[]>(
    clientBills.map((bill) => bill.id),
  );
  const selectedBills = clientBills.filter((bill) =>
    selectedIds.includes(bill.id),
  );
  return (
    <Modal title="Combine client bills" close={close}>
      <div className="op-form">
        <label className="op-field">
          <span>Client</span>
          <select
            value={clientId}
            onChange={(event) => {
              const nextClientId = Number(event.target.value);
              setClientId(nextClientId);
              setSelectedIds(
                store.bills
                  .filter((bill) => bill.clientId === nextClientId)
                  .map((bill) => bill.id),
              );
            }}
          >
            {eligibleClients.map((client) => (
              <option value={client.id} key={client.id}>
                {client.firmName}
              </option>
            ))}
          </select>
        </label>
        <section className="op-bill-selector">
          {clientBills.map((bill) => (
            <label key={bill.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(bill.id)}
                onChange={() =>
                  setSelectedIds((current) =>
                    current.includes(bill.id)
                      ? current.filter((id) => id !== bill.id)
                      : [...current, bill.id],
                  )
                }
              />
              <span>
                <b>INV-{String(bill.number).padStart(4, "0")}</b>
                <small>
                  {fmt(bill.billDate)} · Total {money(bill.total)} · Balance{" "}
                  {money(billBalance(bill))}
                </small>
              </span>
            </label>
          ))}
        </section>
        <div className="op-consolidated-summary">
          <span>{selectedBills.length} bills selected</span>
          <b>
            Total{" "}
            {money(selectedBills.reduce((sum, bill) => sum + bill.total, 0))}
          </b>
          <strong>
            Balance{" "}
            {money(
              selectedBills.reduce((sum, bill) => sum + billBalance(bill), 0),
            )}
          </strong>
        </div>
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedBills.length && preview(selectedBills)}
          >
            <FileText size={17} />
            Preview combined bill
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

export function ConsolidatedInvoice({
  bills,
  store,
  close,
}: {
  bills: Bill[];
  store: FleetStore;
  close: () => void;
}) {
  const total = bills.reduce((sum, bill) => sum + bill.total, 0),
    paid = bills.reduce((sum, bill) => sum + billPaid(bill), 0),
    balance = Math.max(0, total - paid),
    client = bills[0]?.client;
  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog consolidated-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print / PDF
          </Button>
        </div>
        <article className="invoice-sheet op-invoice op-consolidated-invoice">
          <InvoiceHeader
            title="CONSOLIDATED INVOICE"
            company={store.company}
          />
          <section className="invoice-meta">
            <p>
              <b>Statement Date:</b> {fmt(isoToday())}
            </p>
            <p>
              <b>Included Bills:</b> {bills.length}
            </p>
            <p className="invoice-bill-to">
              <b>Bill To:</b> {client?.firmName}
              <br />
              <span>
                {client?.ownerName}
                <br />
                {client?.address}
                <br />
                {client?.mobile} · {client?.email}
              </span>
            </p>
          </section>
          {bills.map((bill) => (
            <section className="op-consolidated-bill" key={bill.id}>
              <header>
                <h2>INV-{String(bill.number).padStart(4, "0")}</h2>
                <span>{fmt(bill.billDate)}</span>
              </header>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Vehicle / period / drivers</th>
                    <th>Booked</th>
                    <th>Ad days</th>
                    <th>Off</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.vehicleLines.map((line) => {
                    const vehicle = store.vehicles.find(
                      (item) => item.id === line.vehicleId,
                    );
                    return (
                      <tr key={line.id}>
                        <td>
                          <b>
                            {line.label ??
                              `${vehicle?.number ?? "Vehicle"} · ${vehicle?.type ?? ""}`}
                            {line.quantity && line.quantity > 1
                              ? ` × ${line.quantity}`
                              : ""}
                          </b>
                          <br />
                          {fmt(line.startDate)} to {fmt(line.endDate)}
                          <br />
                          {line.label
                            ? "Campaign booking"
                            : `Drivers: ${line.driverNames.join(", ") || "Unassigned"}`}
                        </td>
                        <td>{line.bookedDays}</td>
                        <td>{line.advertisementDays}</td>
                        <td>{line.offDays}</td>
                        <td>{money(line.dailyRate)}</td>
                        <td>
                          {money(
                            line.advertisementDays *
                              line.dailyRate *
                              (line.quantity ?? 1),
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="op-consolidated-bill-total">
                <span>Total {money(bill.total)}</span>
                <span>Paid {money(billPaid(bill))}</span>
                <b>Balance {money(billBalance(bill))}</b>
              </div>
            </section>
          ))}
          <section className="op-invoice-total">
            <p>
              <span>Combined total</span>
              <b>{money(total)}</b>
            </p>
            <p>
              <span>Total received</span>
              <b>−{money(paid)}</b>
            </p>
            <p>
              <span>Outstanding</span>
              <strong>{money(balance)}</strong>
            </p>
          </section>
          <footer className="invoice-footer">
            <div>
              <h3>Bank details for RTGS / NEFT</h3>
              <p>
                <b>Account:</b> {store.company.accountName}
              </p>
              <p>
                <b>Bank:</b> {store.company.bankName} · {store.company.branch}
              </p>
              <p>
                <b>A/C No:</b>{" "}
                {store.company.accountNumber || "Update in company settings"}
              </p>
              <p>
                <b>IFSC:</b>{" "}
                {store.company.ifsc || "Update in company settings"}
              </p>
            </div>
            <div>
              <p>For {store.company.name}</p>
              <b>Authorized Signatory</b>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog consolidated-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print / PDF
          </Button>
        </div>
        <article className="invoice-sheet op-invoice op-consolidated-invoice">
          <InvoiceHeader
            title="CONSOLIDATED INVOICE"
            company={store.company}
          />
          <section className="invoice-meta">
            <p>
              <b>Statement Date:</b> {fmt(isoToday())}
            </p>
            <p>
              <b>Included Bills:</b> {bills.length}
            </p>
            <p className="invoice-bill-to">
              <b>Bill To:</b> {client?.firmName}
              <br />
              <span>
                {client?.ownerName}
                <br />
                {client?.address}
                <br />
                {client?.mobile} · {client?.email}
              </span>
            </p>
          </section>
          {bills.map((bill) => (
            <section className="op-consolidated-bill" key={bill.id}>
              <header>
                <h2>INV-{String(bill.number).padStart(4, "0")}</h2>
                <span>{fmt(bill.billDate)}</span>
              </header>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Vehicle / period / drivers</th>
                    <th>Booked</th>
                    <th>Ad days</th>
                    <th>Off</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.vehicleLines.map((line) => {
                    const vehicle = store.vehicles.find(
                      (item) => item.id === line.vehicleId,
                    );
                    return (
                      <tr key={line.id}>
                        <td>
                          <b>
                            {vehicle?.number ?? "Vehicle"} · {vehicle?.type}
                          </b>
                          <br />
                          {fmt(line.startDate)} to {fmt(line.endDate)}
                          <br />
                          Drivers: {line.driverNames.join(", ") || "Unassigned"}
                        </td>
                        <td>{line.bookedDays}</td>
                        <td>{line.advertisementDays}</td>
                        <td>{line.offDays}</td>
                        <td>{money(line.dailyRate)}</td>
                        <td>
                          {money(line.advertisementDays * line.dailyRate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="op-consolidated-bill-total">
                <span>Total {money(bill.total)}</span>
                <span>Paid {money(billPaid(bill))}</span>
                <b>Balance {money(billBalance(bill))}</b>
              </div>
            </section>
          ))}
          <section className="op-invoice-total">
            <p>
              <span>Combined total</span>
              <b>{money(total)}</b>
            </p>
            <p>
              <span>Total received</span>
              <b>−{money(paid)}</b>
            </p>
            <p>
              <strong>Balance payable</strong>
              <strong>{money(balance)}</strong>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}

export function Invoice({
  bill,
  store,
  close,
  edit,
  remove,
  recordLoss,
  quotation = false,
  generateReceipt,
}: {
  bill: Bill;
  store: FleetStore;
  close: () => void;
  edit?: () => void;
  remove?: () => void;
  recordLoss?: (bill: Bill) => void;
  quotation?: boolean;
  generateReceipt?: (payment?: Bill["payments"][number] | null) => void;
}) {
  const balance = billBalance(bill);
  const selectedFacilities = (bill.facilities ?? []).filter((facility) => facility.selected);
  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          {!quotation && recordLoss && (
            <Button
              secondary
              onClick={() => recordLoss(bill)}
              style={{
                color: bill.lossAmount ? "#c2410c" : "#7c2d12",
                borderColor: "#fed7aa",
                background: "#fff7ed",
                fontWeight: 600,
              }}
            >
              <TrendingDown size={17} />
              {bill.lossAmount ? `Credit Note: ${money(bill.lossAmount)}` : "Credit Note"}
            </Button>
          )}
          {!quotation && edit && (
            <Button secondary onClick={edit}>
              <FileText size={17} />
              Edit bill
            </Button>
          )}
          {!quotation && remove && (
            <Button
              secondary
              onClick={remove}
              style={{ color: "#a13e34" }}
            >
              <Trash2 size={17} />
              Delete bill
            </Button>
          )}
          {!quotation && generateReceipt && (bill.advanceReceived > 0 || bill.payments.length > 0) && (
            <Button secondary onClick={() => generateReceipt(null)}>
              <ReceiptText size={17} />
              Print Receipt
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            {quotation ? "Print quotation" : "Print bill"}
          </Button>
        </div>
        <article className="invoice-sheet op-invoice">
          <InvoiceHeader
            title={quotation ? "QUOTATION" : "INVOICE"}
            badge={quotation ? "ESTIMATE / QUOTATION" : undefined}
            company={store.company}
          />
          <section className="invoice-meta">
            <p>
              <b>{quotation ? "Quotation No:" : "Bill No:"}</b>{" "}
              {quotation ? "QTN" : "INV"}-{String(bill.number).padStart(4, "0")}
            </p>
            <p>
              <b>{quotation ? "Quotation Date:" : "Bill Date:"}</b>{" "}
              {fmt(bill.billDate)}
            </p>
            <p className="invoice-bill-to">
              <b>{quotation ? "Quotation To:" : "Bill To:"}</b>{" "}
              {bill.client.firmName}
              <br />
              <span>
                {bill.client.ownerName}
                <br />
                {bill.client.address}
                <br />
                {bill.client.mobile} · {bill.client.email}
              </span>
            </p>
          </section>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Booking / Vehicle</th>
                <th>Date range</th>
                <th>{quotation ? "Total Days" : "Present days"}</th>
                <th>Rate / day</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.vehicleLines.map((line) => {
                const vehicle = store.vehicles.find(
                  (item) => item.id === line.vehicleId,
                );
                return (
                  <tr key={line.id}>
                    <td>
                      <b>
                        {line.label ??
                          `${vehicle?.number ?? "Vehicle"} · ${vehicle?.type ?? ""}`}
                        {line.quantity && line.quantity > 1
                          ? ` × ${line.quantity}`
                          : ""}
                      </b>
                      <br />
                      {fmt(line.startDate)} to {fmt(line.endDate)}
                      <br />
                      {quotation ? "Proposed campaign vehicle service" : "Campaign vehicle attendance"}
                    </td>
                    <td>{fmt(line.startDate)} to {fmt(line.endDate)}</td>
                    <td><b>{line.advertisementDays} {quotation ? "days" : ""}</b></td>
                    <td>{money(line.dailyRate)}</td>
                    <td>
                      {money(
                        line.advertisementDays *
                          line.dailyRate *
                          (line.quantity ?? 1),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {bill.charges.length > 0 && (
            <table className="invoice-expenses">
              <thead>
                <tr>
                  <th>Other charges / discount</th>
                  <th>Details</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.charges.map((charge) => (
                  <tr key={charge.id}>
                    <td>{charge.category}</td>
                    <td>{charge.description}</td>
                    <td>
                      {charge.category === "Discount" ? "−" : ""}
                      {money(charge.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!quotation &&
            (bill.advanceReceived > 0 || bill.payments.length > 0) && (
              <table className="invoice-expenses op-payment-history">
                <thead>
                  <tr>
                    <th>Payment date</th>
                    <th>Payment mode</th>
                    <th>Receipt / reference</th>
                    <th>Amount received</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.advanceReceived > 0 && (() => {
                    const linkedReceipts = (store.receipts ?? []).filter(
                      (r) => r.billId === bill.id,
                    );
                    return (
                      <tr>
                        <td>{fmt(bill.billDate)}</td>
                        <td>{bill.paymentMode}</td>
                        <td>
                          Advance received
                          {linkedReceipts.length > 0 && (
                            <div
                              style={{
                                fontSize: "11.5px",
                                color: "#166534",
                                marginTop: "3px",
                                fontWeight: 500,
                              }}
                            >
                              Includes Receipts:{" "}
                              {linkedReceipts
                                .map(
                                  (r) =>
                                    `REC-${String(r.number).padStart(4, "0")} (${money(r.amount)})`,
                                )
                                .join(", ")}
                            </div>
                          )}
                        </td>
                        <td>
                          <b>{money(bill.advanceReceived)}</b>
                        </td>
                      </tr>
                    );
                  })()}
                  {bill.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{fmt(payment.date)}</td>
                      <td>{payment.mode}</td>
                      <td>
                        {payment.reference || payment.note || "Installment"}
                      </td>
                      <td><b>{money(payment.amount)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          <section className="op-invoice-total">
            {quotation ? (
              <p>
                <span>Quotation total</span>
                <strong>{money(bill.total)}</strong>
              </p>
            ) : (
              <>
                <p>
                  <span>Total</span>
                  <b>{money(bill.total)}</b>
                </p>
                <p>
                  <span>Total received</span>
                  <b>−{money(billPaid(bill))}</b>
                </p>
                {bill.lossAmount ? (
                  <p style={{ color: "#c2410c" }}>
                    <span>Credit Note ({bill.lossReason || "Settlement"})</span>
                    <b>−{money(bill.lossAmount)}</b>
                  </p>
                ) : null}
                <p>
                  <span>Outstanding</span>
                  <strong>{money(balance)}</strong>
                </p>
              </>
            )}
          </section>
          <footer className="invoice-footer">
            <div>
              {quotation ? (
                <>
                  <h3>Facilities</h3>
                  {selectedFacilities.length > 0 ? (
                    selectedFacilities.map((facility) => (
                      <p key={facility.name}>
                        <b>{facility.name}:</b> {facility.fromTime} to {facility.toTime}
                      </p>
                    ))
                  ) : (
                    <p>No additional facilities selected.</p>
                  )}
                </>
              ) : (
                <>
                  <h3>Bank details for RTGS / NEFT</h3>
                  <p>
                    <b>Account:</b> {store.company.accountName}
                  </p>
                  <p>
                    <b>Bank:</b> {store.company.bankName}
                  </p>
                  <p>
                    <b>Branch Name:</b> {store.company.branch}
                  </p>
                  <p>
                    <b>A/C No:</b>{" "}
                    {store.company.accountNumber || "Update in company settings"}
                  </p>
                  <p>
                    <b>IFSC:</b>{" "}
                    {store.company.ifsc || "Update in company settings"}
                  </p>
                  {store.company.pan && (
                    <p>
                      <b>PAN No:</b> {store.company.pan}
                    </p>
                  )}
                </>
              )}
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

export function CampaignQuotation({
  booking,
  store,
  close,
}: {
  booking: CampaignBooking;
  store: FleetStore;
  close: () => void;
}) {
  const vehicleLines = bookingVehicleLines(
    store,
    booking,
    bookingEnd(booking),
  ).map((line) => ({
    ...line,
    advertisementDays: line.bookedDays,
    offDays: 0,
  }));
  const charges: BillCharge[] = booking.facilities.map((facility) => ({
    ...facility,
    amount: facility.quantity * facility.rate,
  }));
  const total = calculateBillTotal(vehicleLines, charges);
  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print quotation
          </Button>
        </div>
        <article className="invoice-sheet op-invoice op-quotation">
          <InvoiceHeader
            title="QUOTATION"
            badge="ESTIMATE / QUOTATION"
            company={store.company}
          />
          <section className="invoice-meta">
            <p>
              <b>Quotation No:</b> QTN-{String(booking.id).padStart(4, "0")}
            </p>
            <p>
              <b>Quotation Date:</b> {fmt(isoToday())}
            </p>
            <p className="invoice-bill-to">
              <b>Quotation To:</b> {booking.client.firmName}
              <br />
              <span>
                {booking.client.ownerName ? `${booking.client.ownerName} · ` : ""}{booking.client.mobile}
                {booking.client.address ? ` · ${booking.client.address}` : ""}
              </span>
            </p>
          </section>
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Booking / Vehicle</th>
                <th style={{ width: "22%" }}>Date range</th>
                <th style={{ width: "15%" }}>Total Days</th>
                <th style={{ width: "13%" }}>Rate / day</th>
                <th style={{ width: "15%" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {vehicleLines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <b>
                      {line.label ?? "Campaign vehicle"}
                      {line.quantity && line.quantity > 1
                        ? ` × ${line.quantity} units`
                        : ""}
                    </b>
                    <br />
                    {fmt(line.startDate)} to {fmt(line.endDate)}
                    <br />
                    Proposed campaign booking
                  </td>
                  <td>{fmt(line.startDate)} to {fmt(line.endDate)}</td>
                  <td><b>{line.bookedDays} days</b>{line.quantity && line.quantity > 1 ? ` (${line.quantity} units)` : ""}</td>
                  <td>{money(line.dailyRate)}</td>
                  <td>
                    <b>
                      {money(
                        line.bookedDays * line.dailyRate * (line.quantity ?? 1),
                      )}
                    </b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {charges.length > 0 && (
            <table className="invoice-expenses">
              <thead>
                <tr>
                  <th>Other charges / discount</th>
                  <th>Details</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <td>{charge.category}</td>
                    <td>{charge.description}</td>
                    <td>
                      {charge.category === "Discount" ? "−" : ""}
                      {money(charge.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <section className="op-invoice-total">
            <p>
              <span>Quotation total</span>
              <strong>{money(total)}</strong>
            </p>
          </section>
          <footer className="invoice-footer">
            <div>
              <h3>Facilities</h3>
              {booking.facilities.length > 0 ? (
                booking.facilities.map((facility) => (
                  <p key={facility.id}>
                    <b>{facility.category}:</b> {facility.description || "Included"}
                  </p>
                ))
              ) : (
                <p>No additional facilities selected.</p>
              )}
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

export function BillReceipt({
  bill,
  payment,
  store,
  close,
  onUpdateBill,
}: {
  bill: Bill;
  payment?: Bill["payments"][number] | null;
  store: FleetStore;
  close: () => void;
  onUpdateBill?: (updatedBill: Bill) => void;
}) {
  const initialPaymentId = payment
    ? payment.id
    : bill.payments.length > 0
      ? bill.payments[bill.payments.length - 1].id
      : "ADV";
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | "ADV">(initialPaymentId);

  const activePayment =
    selectedPaymentId === "ADV"
      ? null
      : (bill.payments.find((p) => p.id === selectedPaymentId) ??
        (bill.payments.length > 0 ? bill.payments[bill.payments.length - 1] : null));

  const paymentAmount = activePayment ? activePayment.amount : bill.advanceReceived;
  const paymentDate = activePayment ? activePayment.date : bill.billDate;
  const paymentMode = activePayment ? activePayment.mode : bill.paymentMode;
  const paymentRef = activePayment ? activePayment.reference : "Advance payment";
  const paymentNote = activePayment ? activePayment.note : "";
  const totalPaid = billPaid(bill);
  const balance = billBalance(bill);
  const receiptNo = activePayment
    ? `REC-${String(bill.number).padStart(4, "0")}-${activePayment.id}`
    : `REC-${String(bill.number).padStart(4, "0")}-ADV`;

  const totalInstallmentOptions =
    (bill.advanceReceived > 0 ? 1 : 0) + bill.payments.length;

  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(paymentDate);
  const [editAmount, setEditAmount] = useState<number | string>(paymentAmount);
  const [editMode, setEditMode] = useState<PaymentMode>(paymentMode);
  const [editRef, setEditRef] = useState(paymentRef || "");
  const [editNote, setEditNote] = useState(paymentNote || "");
  const [enableLoss, setEnableLoss] = useState<boolean>((bill.lossAmount ?? 0) > 0);
  const [editLossAmount, setEditLossAmount] = useState<number | string>(bill.lossAmount ?? "");
  const [editLossReason, setEditLossReason] = useState<string>(bill.lossReason ?? "Client underpayment settlement");
  const [editLossDate, setEditLossDate] = useState<string>(bill.lossDate ?? paymentDate);

  const handleOpenEdit = () => {
    setEditDate(paymentDate);
    setEditAmount(paymentAmount);
    setEditMode(paymentMode);
    setEditRef(paymentRef || "");
    setEditNote(paymentNote || "");
    setEnableLoss((bill.lossAmount ?? 0) > 0);
    setEditLossAmount(bill.lossAmount ?? "");
    setEditLossReason(bill.lossReason ?? "Client underpayment settlement");
    setEditLossDate(bill.lossDate ?? paymentDate);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateBill) return;
    const numAmount = Number(editAmount) || 0;
    const activeLoss = enableLoss ? (Number(editLossAmount) || 0) : 0;
    if (activePayment) {
      let updatedPayments = bill.payments.map((p) =>
        p.id === activePayment.id
          ? { ...p, date: editDate, amount: numAmount, mode: editMode, reference: editRef.trim(), note: editNote.trim() }
          : p
      );
      const rawPaid = bill.advanceReceived + updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      let excess = Math.max(0, (rawPaid + activeLoss) - bill.total);
      if (excess > 0) {
        updatedPayments = updatedPayments.map((p) => {
          if (p.id === activePayment.id) {
            const deduction = Math.min(p.amount, excess);
            excess -= deduction;
            return { ...p, amount: p.amount - deduction };
          }
          return p;
        }).filter((p) => p.amount > 0);
      }
      const newPaid = bill.advanceReceived + updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, bill.total - newPaid - activeLoss);
      const updatedBill: Bill = {
        ...bill,
        payments: updatedPayments,
        lossAmount: activeLoss > 0 ? activeLoss : undefined,
        lossReason: activeLoss > 0 ? editLossReason.trim() : undefined,
        lossDate: activeLoss > 0 ? editLossDate : undefined,
        status: remaining === 0 ? "Paid" : "Pending",
      };
      onUpdateBill(updatedBill);
    } else {
      let adv = numAmount;
      const otherPaymentsSum = (bill.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
      let excess = Math.max(0, (adv + otherPaymentsSum + activeLoss) - bill.total);
      if (excess > 0) {
        adv = Math.max(0, adv - excess);
      }
      const newPaid = adv + otherPaymentsSum;
      const remaining = Math.max(0, bill.total - newPaid - activeLoss);
      const updatedBill: Bill = {
        ...bill,
        advanceReceived: adv,
        billDate: editDate,
        paymentMode: editMode,
        lossAmount: activeLoss > 0 ? activeLoss : undefined,
        lossReason: activeLoss > 0 ? editLossReason.trim() : undefined,
        lossDate: activeLoss > 0 ? editLossDate : undefined,
        status: remaining === 0 ? "Paid" : "Pending",
      };
      onUpdateBill(updatedBill);
    }
    setIsEditing(false);
  };

  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog" style={{ width: "min(680px, 100%)" }}>
        <div className="invoice-toolbar" style={{ flexWrap: "wrap", gap: "8px" }}>
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          {totalInstallmentOptions > 1 && (
            <select
              value={selectedPaymentId}
              onChange={(e) =>
                setSelectedPaymentId(
                  e.target.value === "ADV" ? "ADV" : Number(e.target.value)
                )
              }
              style={{
                padding: "7px 12px",
                borderRadius: "6px",
                border: "1px solid #107050",
                background: "#f0fdf4",
                color: "#14493a",
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              {bill.advanceReceived > 0 && (
                <option value="ADV">
                  Advance Receipt · {money(bill.advanceReceived)} ({fmt(bill.billDate)})
                </option>
              )}
              {bill.payments.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  Installment #{idx + 1} Receipt · {money(p.amount)} ({fmt(p.date)})
                </option>
              ))}
            </select>
          )}
          {onUpdateBill && (
            <Button secondary onClick={handleOpenEdit}>
              <FileText size={16} />
              Edit receipt
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print receipt
          </Button>
        </div>

        {isEditing && (
          <Modal title={`Edit Receipt · ${receiptNo}`} close={() => setIsEditing(false)}>
            <form onSubmit={handleSaveEdit} className="op-form" style={{ padding: "16px 20px" }}>
              <div className="op-form-grid">
                <label className="op-field">
                  <span>Receipt Date</span>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                  />
                </label>
                <label className="op-field">
                  <span>Amount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </label>
                <label className="op-field">
                  <span>Payment Mode</span>
                  <select
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value as PaymentMode)}
                    required
                  >
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>UPI</option>
                    <option>Bank transfer</option>
                    <option>Online</option>
                  </select>
                </label>
              </div>
              <label className="op-field">
                <span>Transaction / Reference</span>
                <input
                  type="text"
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
                  placeholder="e.g. UTR / Cheque No / Reference"
                />
              </label>
              <label className="op-field">
                <span>Note</span>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Installment / token / deposit"
                />
              </label>

              <div
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  background: enableLoss ? "#fef2f2" : "#f8fafc",
                  border: enableLoss ? "1px solid #fecaca" : "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: enableLoss ? "#991b1b" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enableLoss}
                    onChange={(e) => {
                      setEnableLoss(e.target.checked);
                      if (e.target.checked && (!editLossAmount || Number(editLossAmount) <= 0)) {
                        const currentOtherPaid = activePayment
                          ? bill.advanceReceived + bill.payments.filter((p) => p.id !== activePayment.id).reduce((sum, p) => sum + p.amount, 0)
                          : (bill.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
                        const estRemaining = Math.max(0, bill.total - currentOtherPaid - (Number(editAmount) || 0));
                        setEditLossAmount(estRemaining);
                      }
                    }}
                  />
                  Record / Adjust Credit Note on this bill
                </label>

                {enableLoss && (
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div className="op-form-grid" style={{ gap: "12px" }}>
                      <label className="op-field">
                        <span style={{ color: "#c2410c" }}>Credit Note Amount (₹)</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={editLossAmount}
                          onChange={(e) => setEditLossAmount(Math.max(0, Number(e.target.value)))}
                          placeholder="Credit note / settlement allowance"
                          required={enableLoss}
                        />
                      </label>
                      <label className="op-field">
                        <span style={{ color: "#c2410c" }}>Credit Note Date</span>
                        <input
                          type="date"
                          value={editLossDate}
                          onChange={(e) => setEditLossDate(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="op-field">
                      <span style={{ color: "#c2410c" }}>Credit Note Reason / Note</span>
                      <input
                        type="text"
                        value={editLossReason}
                        onChange={(e) => setEditLossReason(e.target.value)}
                        placeholder="e.g. Client underpayment settlement"
                      />
                    </label>
                    <small style={{ color: "#c2410c", fontSize: "11px", fontWeight: 600 }}>
                      * Credit Note settlement will be recorded and shown on receipt.
                    </small>
                  </div>
                )}
              </div>

              <footer>
                <Button secondary type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Check size={17} />
                  Save changes
                </Button>
              </footer>
            </form>
          </Modal>
        )}
        <article className="invoice-sheet op-invoice">
          <InvoiceHeader
            title="PAYMENT RECEIPT"
            badge="OFFICIAL RECEIPT"
            company={store.company}
          />
          <section className="invoice-meta">
            <p>
              <b>Receipt No:</b> {receiptNo}
            </p>
            <p>
              <b>Receipt Date:</b> {fmt(paymentDate)}
            </p>
            <p>
              <b>Invoice No:</b> INV-{String(bill.number).padStart(4, "0")}
            </p>
            <p>
              <b>Invoice Date:</b> {fmt(bill.billDate)}
            </p>
            <p className="invoice-bill-to">
              <b>Received From:</b> {bill.client.firmName}
              <br />
              <span>
                {bill.client.ownerName ? `${bill.client.ownerName} · ` : ""}{bill.client.mobile}
                {bill.client.address ? ` · ${bill.client.address}` : ""}
              </span>
            </p>
          </section>
          <table className="invoice-table" style={{ margin: "14px 0" }}>
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Payment Date</th>
                <th style={{ width: "20%" }}>Mode</th>
                <th style={{ width: "30%" }}>Reference / Note</th>
                <th style={{ width: "25%" }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>{fmt(paymentDate)}</b></td>
                <td><strong style={{ color: "#1f6a53" }}>{paymentMode}</strong></td>
                <td>{paymentRef || paymentNote || "Payment received"}</td>
                <td><b style={{ fontSize: "16px", color: "#1f6a53" }}>{money(paymentAmount)}</b></td>
              </tr>
            </tbody>
          </table>
          <section className="op-invoice-total">
            <p>
              <span>Invoice Total</span>
              <b>{money(bill.total)}</b>
            </p>
            <p>
              <span>This Receipt Amount</span>
              <strong style={{ color: "#1f6a53" }}>{money(paymentAmount)}</strong>
            </p>
            <p>
              <span>Total Received to Date</span>
              <b>{money(totalPaid)}</b>
            </p>
            {bill.lossAmount ? (
              <p style={{ color: "#c2410c" }}>
                <span>Credit Note ({bill.lossReason || "Settlement"})</span>
                <b>−{money(bill.lossAmount)}</b>
              </p>
            ) : null}
            <p>
              <span>Remaining Invoice Balance</span>
              <strong>{money(balance)}</strong>
            </p>
          </section>
          <footer className="invoice-footer">
            <div>
              <p>
                <b>Payment Status:</b>{" "}
                {balance === 0
                  ? (bill.lossAmount ? "Settled (Fully Paid with Credit Note)" : "Fully Paid")
                  : "Partial Payment"}
              </p>
              {paymentNote && (
                <p style={{ marginTop: "4px" }}>
                  <b>Note:</b> {paymentNote}
                </p>
              )}
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
