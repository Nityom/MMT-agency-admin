"use client";

import { Check, FileText, Gauge, Plus, Printer, Trash2, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  Bill,
  BillCharge,
  BillChargeCategory,
  BillVehicleLine,
  CampaignBooking,
  calculateBillTotal,
  FleetStore,
  inclusiveDays,
  PaymentMode,
  nextBillNumber,
} from "./fleet-domain";
import { Button, FormField, Modal } from "./operations-components";
import { PageHead } from "./operations-reports";
import {
  amount,
  billBalance,
  billPaid,
  bookingEnd,
  bookingVehicleLines,
  campaignChargeCategories,
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
  cancel,
  save,
}: {
  store: FleetStore;
  initialClientId: number;
  bill?: Bill | null;
  cancel: () => void;
  save: (bill: Bill) => void;
}) {
  const initialBillingClientId =
    (bill?.clientId ?? initialClientId) || store.clients[0]?.id || 0;
  const initialBillDate = bill?.billDate ?? isoToday();
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
    const bookedDays = inclusiveDays(match.period.startDate, endDate);
    const presentDays = vehiclePresentDays(
      store,
      vehicleId,
      match.period.startDate,
      endDate,
    );
    return {
      vehicleId,
      label: vehicleLabel,
      startDate: match.period.startDate,
      endDate,
      advertisementDays: presentDays,
      offDays: bookedDays - presentDays,
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
  const [advance, setAdvance] = useState(bill?.advanceReceived ?? 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
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
  const existingPayments = bill?.payments ?? [];
  const remainingBalance = Math.max(
    0,
    total -
      advance -
      existingPayments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const submit = () => {
    const client = store.clients.find((item) => item.id === clientId);
    if (!client || !lines.length) return;
    const payments: Bill["payments"] =
      bill && markFullPayment && remainingBalance > 0
        ? [
            ...existingPayments,
            {
              id: nextId(existingPayments),
              date: fullPaymentDate,
              amount: remainingBalance,
              mode: paymentMode,
              reference: "",
              note: "Full payment recorded while editing bill",
            },
          ]
        : existingPayments;
    const paid =
      advance + payments.reduce((sum, payment) => sum + payment.amount, 0);
    save({
      id: bill?.id ?? nextId(store.bills),
      number: bill?.number ?? nextBillNumber(store.bills, store.nextBillNumber),
      billDate,
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
      advanceReceived: advance,
      paymentMode,
      payments,
      total,
      status: paid >= total ? "Paid" : "Pending",
    });
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
                const selectedClientId = Number(event.target.value),
                  firstVehicleId =
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
                setClientId(selectedClientId);
                setLines([
                  campaignLine(firstVehicleId, selectedClientId, billDate),
                ]);
              }}
            >
              {store.clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.firmName} · {client.ownerName}
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
                onChange={(event) =>
                  updateLine(
                    index,
                    campaignLine(
                      Number(event.target.value),
                      clientId,
                      billDate,
                    ),
                  )
                }
              >
                {store.vehicles.map((vehicle) => (
                  <option value={vehicle.id} key={vehicle.id}>
                    {vehicle.number} · {vehicle.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Start</span>
              <input
                type="date"
                value={line.startDate}
                onChange={(event) =>
                  updateLine(index, { startDate: event.target.value })
                }
              />
            </label>
            <label>
              <span>End</span>
              <input
                type="date"
                value={line.endDate}
                onChange={(event) =>
                  updateLine(index, { endDate: event.target.value })
                }
              />
            </label>
            <label>
              <span>Present days</span>
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
              <span>Absent days</span>
              <input
                type="number"
                min="0"
                value={line.offDays}
                onChange={(event) =>
                  updateLine(index, { offDays: Number(event.target.value) })
                }
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
              {line.advertisementDays} vehicle-present days · Auto-filled from
              campaign vehicle attendance
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
              {[
                "Banner / printing",
                "Pasting",
                "Recording",
                "Municipal tax",
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
        <div className="op-bill-total">
          <label className="op-field">
            <span>Client advance received</span>
            <input
              type="number"
              min="0"
              value={advance}
              onChange={(event) => setAdvance(Number(event.target.value))}
            />
          </label>
          <label className="op-field">
            <span>Overall bill payment mode</span>
            <select
              value={paymentMode}
              onChange={(event) =>
                setPaymentMode(event.target.value as PaymentMode)
              }
            >
              <option>Cash</option>
              <option>Cheque</option>
              <option>UPI</option>
            </select>
          </label>
          {bill && remainingBalance > 0 && (
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
          <p>
            <span>Bill total</span>
            <strong>{money(total)}</strong>
            <small>
              Balance {money(markFullPayment ? 0 : remainingBalance)}
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
  ) => void;
}) {
  const balance = billBalance(bill);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget),
      paidAmount = amount(data, "amount");
    if (paidAmount > balance) {
      const field = event.currentTarget.elements.namedItem(
        "amount",
      ) as HTMLInputElement;
      field.setCustomValidity(
        `Amount cannot exceed the balance of ${money(balance)}.`,
      );
      field.reportValidity();
      return;
    }
    save(
      input(data, "date"),
      paidAmount,
      input(data, "mode") as PaymentMode,
      input(data, "reference"),
      input(data, "note"),
    );
  };
  return (
    <Modal
      title={`Record payment · INV-${String(bill.number).padStart(4, "0")}`}
      close={close}
    >
      <form className="op-form" onSubmit={submit}>
        <p className="op-form-note">
          The full outstanding balance is prefilled. Save it to mark this
          invoice as Paid, or enter a smaller amount for a partial payment. ·
          Paid so far: <b>{money(billPaid(bill))}</b> · Remaining:{" "}
          <b>{money(balance)}</b>
        </p>
        <div className="op-form-grid">
          <FormField
            label="Payment date"
            name="date"
            type="date"
            defaultValue={isoToday()}
            required
          />
          <FormField
            label="Payment amount"
            name="amount"
            type="number"
            defaultValue={balance}
            min={1}
            required
          />
          <label className="op-field">
            <span>Payment mode</span>
            <select name="mode" defaultValue={bill.paymentMode} required>
              <option>Cash</option>
              <option>Cheque</option>
              <option>UPI</option>
            </select>
          </label>
        </div>
        <FormField label="Transaction / receipt reference" name="reference" />
        <FormField label="Note" name="note" />
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            Save payment
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function CampaignBillModeModal({
  booking,
  close,
  generate,
}: {
  booking: CampaignBooking;
  close: () => void;
  generate: (mode: PaymentMode) => void;
}) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  return (
    <Modal title={`Generate bill · ${booking.client.firmName}`} close={close}>
      <div className="op-form">
        <p className="op-form-note">
          Select the overall payment mode for this bill.
        </p>
        <label className="op-field">
          <span>Overall bill payment mode</span>
          <select
            value={paymentMode}
            onChange={(event) =>
              setPaymentMode(event.target.value as PaymentMode)
            }
          >
            <option>Cash</option>
            <option>Cheque</option>
            <option>UPI</option>
          </select>
        </label>
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => generate(paymentMode)}>
            <FileText size={17} />
            Generate bill
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
          <header className="invoice-brand">
            <Gauge size={30} />
            <h2>{store.company.name}</h2>
          </header>
          <h1>CONSOLIDATED INVOICE</h1>
          <section className="invoice-company">
            <p>{store.company.address}</p>
            <p>
              Mobile: {store.company.mobile} | Email: {store.company.email}
            </p>
          </section>
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
          <header className="invoice-brand">
            <Gauge size={30} />
            <h2>{store.company.name}</h2>
          </header>
          <h1>CONSOLIDATED INVOICE</h1>
          <section className="invoice-company">
            <p>{store.company.address}</p>
            <p>
              Mobile: {store.company.mobile} | Email: {store.company.email}
            </p>
          </section>
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
  quotation = false,
}: {
  bill: Bill;
  store: FleetStore;
  close: () => void;
  edit?: () => void;
  quotation?: boolean;
}) {
  const balance = billBalance(bill);
  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog">
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          {!quotation && edit && (
            <Button secondary onClick={edit}>
              <FileText size={17} />
              Edit bill
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            {quotation ? "Print quotation" : "Print / PDF"}
          </Button>
        </div>
        <article className="invoice-sheet op-invoice">
          <header className="invoice-brand">
            <Gauge size={30} />
            <h2>{store.company.name}</h2>
          </header>
          <h1>{quotation ? "QUOTATION" : "INVOICE"}</h1>
          <section className="invoice-company">
            <p>{store.company.address}</p>
            <p>
              Mobile: {store.company.mobile} | Email: {store.company.email}
            </p>
          </section>
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
                <th>Booking</th>
                <th>Booking days</th>
                <th>Present days</th>
                <th>Absent days</th>
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
                      Campaign vehicle attendance
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
                  {bill.advanceReceived > 0 && (
                    <tr>
                      <td>{fmt(bill.billDate)}</td>
                      <td>{bill.paymentMode}</td>
                      <td>Advance received</td>
                      <td>{money(bill.advanceReceived)}</td>
                    </tr>
                  )}
                  {bill.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{fmt(payment.date)}</td>
                      <td>{payment.mode}</td>
                      <td>
                        {payment.reference || payment.note || "Installment"}
                      </td>
                      <td>{money(payment.amount)}</td>
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
                <p>
                  <span>Outstanding</span>
                  <strong>{money(balance)}</strong>
                </p>
              </>
            )}
          </section>
          <footer className="invoice-footer">
            <div>
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
            </div>
            <div className="invoice-signature">
              <Image
                className="invoice-signature-mark"
                src="/sign.png"
                alt="Mrunal Multi Task Agency proprietor signature"
                width={700}
                height={278}
              />
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
          <header className="invoice-brand">
            <Gauge size={30} />
            <h2>{store.company.name}</h2>
          </header>
          <h1>QUOTATION</h1>
          <section className="invoice-company">
            <p>{store.company.address}</p>
            <p>
              Mobile: {store.company.mobile} | Email: {store.company.email}
            </p>
          </section>
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
                {booking.client.ownerName}
                <br />
                {booking.client.address}
                <br />
                {booking.client.mobile} · {booking.client.email}
              </span>
            </p>
          </section>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Booking days</th>
                <th>Quantity</th>
                <th>Rate / day</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {vehicleLines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <b>
                      {line.label ?? "Campaign vehicle"}
                      {line.quantity && line.quantity > 1
                        ? ` × ${line.quantity}`
                        : ""}
                    </b>
                    <br />
                    {fmt(line.startDate)} to {fmt(line.endDate)}
                    <br />
                    Proposed campaign booking
                  </td>
                  <td>{line.bookedDays}</td>
                  <td>{line.quantity ?? 1}</td>
                  <td>{money(line.dailyRate)}</td>
                  <td>
                    {money(
                      line.bookedDays * line.dailyRate * (line.quantity ?? 1),
                    )}
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
            </div>
            <div className="invoice-signature">
              <Image
                className="invoice-signature-mark"
                src="/sign.png"
                alt="Mrunal Multi Task Agency proprietor signature"
                width={700}
                height={278}
              />
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

