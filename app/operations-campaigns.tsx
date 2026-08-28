"use client";

import { CalendarDays, Check, FileText, Plus, Printer, Trash2, X } from "lucide-react";
import type React from "react";
import { type FormEvent, useEffect, useState } from "react";
import {
  BillCharge,
  BillChargeCategory,
  CampaignBooking,
  CampaignVehiclePeriod,
  calculateBillTotal,
  FleetStore,
  inclusiveDays,
} from "./fleet-domain";
import {
  AttendanceCalendar,
  Button,
  FormField,
  Modal,
  Status,
} from "./operations-components";
import { PageHead } from "./operations-reports";
import {
  bookingEnd,
  bookingStatus,
  bookingVehicleLines,
  campaignChargeCategories,
  campaignSlotKey,
  campaignSlotPresentDays,
  fmt,
  input,
  isoToday,
  money,
  nextId,
  vehiclePresentDays,
} from "./operations-utils";

type ChargeDraft = Omit<BillCharge, "id" | "amount">;
type VehiclePeriodDraft = Omit<CampaignVehiclePeriod, "id">;

export function CampaignBookingForm({
  store,
  booking,
  close,
  save,
}: {
  store: FleetStore;
  booking?: CampaignBooking | null;
  close: () => void;
  save: (booking: CampaignBooking) => void;
}) {
  const initialMonth = booking?.month ?? isoToday().slice(0, 7);
  const initialStartDate = booking?.startDate ?? `${initialMonth}-01`;
  const initialEndDate =
    booking?.endDate ??
    `${initialMonth}-${new Date(Number(initialMonth.slice(0, 4)), Number(initialMonth.slice(5, 7)), 0).getDate()}`;
  const [clientId, setClientId] = useState(
    booking?.clientId ??
      store.clients.find((client) => client.status === "Active")?.id ??
      0,
  );
  const [clientQuery, setClientQuery] = useState(
    booking ? booking.client.mobile : "",
  );
  const [campaignClientName, setCampaignClientName] = useState(
    booking?.client.firmName ??
      store.clients.find((client) => client.status === "Active")?.firmName ??
      "",
  );
  const [clientResultLimit, setClientResultLimit] = useState(100);
  const [campaignStartDate, setCampaignStartDate] = useState(initialStartDate);
  const [campaignEndDate, setCampaignEndDate] = useState(initialEndDate);
  const [facilities, setFacilities] = useState<ChargeDraft[]>(
    booking?.facilities.map(({ category, description, quantity, rate }) => ({
      category,
      description,
      quantity,
      rate,
    })) ?? [],
  );
  const [vehiclePeriods, setVehiclePeriods] = useState<VehiclePeriodDraft[]>(
    booking?.vehiclePeriods ?? [
      {
        type: "Rickshaw",
        vehicleIds: [],
        startDate: initialStartDate,
        endDate: initialEndDate,
        quantity: 1,
        dailyRate: 0,
      },
    ],
  );
  const [formError, setFormError] = useState("");
  const client = store.clients.find((item) => item.id === clientId);
  const normalizedClientQuery = clientQuery.trim().toLowerCase();
  const matchingClients = store.clients
    .filter((item) => item.status === "Active" || item.id === booking?.clientId)
    .filter(
      (item) =>
        !normalizedClientQuery ||
        `${item.firmName} ${item.ownerName} ${item.mobile} ${item.alternatePhone ?? ""}`
          .toLowerCase()
          .includes(normalizedClientQuery),
    );
  const clientMatches = matchingClients.slice(0, clientResultLimit);
  const updateFacility = (index: number, patch: Partial<ChargeDraft>) =>
    setFacilities((current) =>
      current.map((facility, itemIndex) =>
        itemIndex === index ? { ...facility, ...patch } : facility,
      ),
    );
  const updateVehiclePeriod = (
    index: number,
    patch: Partial<VehiclePeriodDraft>,
  ) =>
    setVehiclePeriods((current) =>
      current.map((period, itemIndex) =>
        itemIndex === index ? { ...period, ...patch } : period,
      ),
    );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!client) return;
    const startDate = input(data, "startDate"),
      endDate = input(data, "endDate"),
      stoppedAt = input(data, "stoppedAt");
    if (endDate < startDate || (stoppedAt && stoppedAt < startDate)) {
      const field = event.currentTarget.elements.namedItem(
        endDate < startDate ? "endDate" : "stoppedAt",
      ) as HTMLInputElement;
      field.setCustomValidity(
        "Date must be on or after the campaign start date.",
      );
      field.reportValidity();
      return;
    }
    if (
      !vehiclePeriods.length ||
      vehiclePeriods.some(
        (period) =>
          period.endDate < period.startDate ||
          period.startDate < startDate ||
          period.endDate > endDate ||
          period.quantity < 1 ||
          period.dailyRate < 0,
      )
    ) {
      setFormError(
        "Each interval must be within the campaign dates and include at least one vehicle slot.",
      );
      return;
    }
    save({
      id: booking?.id ?? nextId(store.campaignBookings),
      month: input(data, "month"),
      clientId,
      client: {
        firmName: campaignClientName.trim() || client.firmName,
        ownerName: client.ownerName,
        address: client.address,
        mobile: client.mobile,
        email: client.email,
      },
      startDate,
      endDate,
      vehiclePeriods: vehiclePeriods.map((period, index) => ({
        ...period,
        id: index + 1,
        vehicleIds: [],
      })),
      facilities: facilities.map((facility, index) => ({
        ...facility,
        id: index + 1,
      })),
      ...(stoppedAt ? { stoppedAt } : {}),
      ...(booking?.generatedBillId
        ? { generatedBillId: booking.generatedBillId }
        : {}),
    });
  };
  return (
    <Modal
      title={booking ? "Edit campaign booking" : "New monthly campaign booking"}
      close={close}
    >
      <form className="op-form op-campaign-form" onSubmit={submit}>
        <div className="op-form-grid">
          <FormField
            label="Booking month"
            name="month"
            type="month"
            defaultValue={initialMonth}
            required
          />
          <label className="op-field">
            <span>Find existing client</span>
            <input
              value={clientQuery}
              placeholder="Search client name or phone number"
              onChange={(event) => {
                setClientQuery(event.target.value);
                setClientResultLimit(100);
              }}
            />
          </label>
        </div>
        <label className="op-field">
          <span>
            Existing client ({matchingClients.length.toLocaleString("en-IN")}{" "}
            matches)
          </span>
          <select
            value={
              clientMatches.some((item) => item.id === clientId) ? clientId : ""
            }
            onChange={(event) => {
              const nextClientId = Number(event.target.value);
              setClientId(nextClientId);
              setCampaignClientName(
                store.clients.find((item) => item.id === nextClientId)
                  ?.firmName ?? "",
              );
            }}
            required
          >
            <option value="">Select client</option>
            {clientMatches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.firmName}
                {item.ownerName ? ` · ${item.ownerName}` : ""}
                {item.mobile ? ` · ${item.mobile}` : ""}
              </option>
            ))}
          </select>
        </label>
        {clientMatches.length < matchingClients.length && (
          <Button
            secondary
            onClick={() => setClientResultLimit((current) => current + 100)}
          >
            Show 100 more clients (
            {(matchingClients.length - clientMatches.length).toLocaleString(
              "en-IN",
            )}{" "}
            remaining)
          </Button>
        )}
        {client && (
          <section className="op-client-prefill">
            <label className="op-field">
              <span>Campaign client name</span>
              <input
                value={campaignClientName}
                onChange={(event) => setCampaignClientName(event.target.value)}
                required
              />
            </label>
            <span>
              {client.ownerName} · {client.mobile}
            </span>
            <span>{client.address}</span>
            <small>
              {client.email || "No email"} ·{" "}
              {client.categories.join(", ") || "No category selected"}
            </small>
          </section>
        )}
        <div className="op-form-grid">
          <label className="op-field">
            <span>Tentative start date</span>
            <input
              name="startDate"
              type="date"
              value={campaignStartDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setVehiclePeriods((current) =>
                  current.map((period) =>
                    period.startDate === campaignStartDate
                      ? { ...period, startDate: nextDate }
                      : period,
                  ),
                );
                setCampaignStartDate(nextDate);
              }}
              required
            />
          </label>
          <label className="op-field">
            <span>Tentative end date</span>
            <input
              name="endDate"
              type="date"
              value={campaignEndDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setVehiclePeriods((current) =>
                  current.map((period) =>
                    period.endDate === campaignEndDate
                      ? { ...period, endDate: nextDate }
                      : period,
                  ),
                );
                setCampaignEndDate(nextDate);
              }}
              required
            />
          </label>
        </div>
        <div className="op-section-title">
          <h2>Vehicle time intervals</h2>
          <Button
            secondary
            onClick={() =>
              setVehiclePeriods((current) => [
                ...current,
                {
                  type: "Rickshaw",
                  vehicleIds: [],
                  startDate: campaignStartDate,
                  endDate: campaignEndDate,
                  quantity: 1,
                  dailyRate: 0,
                },
              ])
            }
          >
            <Plus size={16} />
            Add interval
          </Button>
        </div>
        {vehiclePeriods.map((period, index) => (
          <div className="op-vehicle-period" key={index}>
            <label>
              <span>Vehicle type</span>
              <select
                value={period.type}
                onChange={(event) =>
                  updateVehiclePeriod(index, {
                    type: event.target.value as CampaignVehiclePeriod["type"],
                    vehicleIds: [],
                  })
                }
              >
                <option>Rickshaw</option>
                <option>E-rickshaw</option>
              </select>
            </label>
            <label>
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                value={period.quantity}
                onChange={(event) =>
                  updateVehiclePeriod(index, {
                    quantity: Math.max(1, Number(event.target.value)),
                  })
                }
              />
            </label>
            <label>
              <span>From</span>
              <input
                type="date"
                value={period.startDate}
                onChange={(event) =>
                  updateVehiclePeriod(index, { startDate: event.target.value })
                }
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={period.endDate}
                onChange={(event) =>
                  updateVehiclePeriod(index, { endDate: event.target.value })
                }
              />
            </label>
            <label>
              <span>Rate / day</span>
              <input
                type="number"
                min="0"
                value={period.dailyRate}
                onChange={(event) =>
                  updateVehiclePeriod(index, {
                    dailyRate: Number(event.target.value),
                  })
                }
              />
            </label>
            <button
              type="button"
              title="Remove interval"
              onClick={() =>
                setVehiclePeriods((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
            <small>
              {inclusiveDays(period.startDate, period.endDate)} days ·{" "}
              {period.quantity} {period.type} slots · Estimated{" "}
              {money(
                inclusiveDays(period.startDate, period.endDate) *
                  period.quantity *
                  period.dailyRate,
              )}
            </small>
          </div>
        ))}
        {formError && <p className="op-form-error">{formError}</p>}
        <div className="op-section-title">
          <h2>Other facilities</h2>
          <Button
            secondary
            onClick={() =>
              setFacilities((current) => [
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
            Facility
          </Button>
        </div>
        {facilities.map((facility, index) => (
          <div className="op-charge-editor" key={index}>
            <select
              value={facility.category}
              onChange={(event) =>
                updateFacility(index, {
                  category: event.target.value as BillChargeCategory,
                })
              }
            >
              {campaignChargeCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <input
              placeholder="Size or agreed details"
              value={facility.description}
              onChange={(event) =>
                updateFacility(index, { description: event.target.value })
              }
            />
            <input
              aria-label="Quantity"
              type="number"
              min="0"
              value={facility.quantity}
              onChange={(event) =>
                updateFacility(index, { quantity: Number(event.target.value) })
              }
            />
            <input
              aria-label="Rate"
              type="number"
              min="0"
              value={facility.rate}
              onChange={(event) =>
                updateFacility(index, { rate: Number(event.target.value) })
              }
            />
            <b>{money(facility.quantity * facility.rate)}</b>
            <button
              type="button"
              title="Remove facility"
              onClick={() =>
                setFacilities((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {booking && (
          <FormField
            label="Scheduled stop date (optional)"
            name="stoppedAt"
            type="date"
            defaultValue={booking.stoppedAt}
          />
        )}
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            Save booking
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function LegacyCampaignBookingCard({
  store,
  booking,
  edit,
  deleteBooking,
  stop,
  generateBill,
}: {
  store: FleetStore;
  booking: CampaignBooking;
  edit: () => void;
  deleteBooking: () => void;
  stop: () => void;
  generateBill: () => void;
}) {
  const status = bookingStatus(booking),
    totalDays = inclusiveDays(booking.startDate, bookingEnd(booking));
  const vehicleLines = bookingVehicleLines(
    store,
    booking,
    isoToday() < bookingEnd(booking) ? isoToday() : bookingEnd(booking),
  );
  const totalPresentDays = vehicleLines.reduce(
    (sum, line) => sum + line.advertisementDays,
    0,
  );
  const totalVehicleDays = vehicleLines.reduce(
    (sum, line) => sum + line.bookedDays,
    0,
  );
  const estimateCharges: BillCharge[] = booking.facilities.map((facility) => ({
    ...facility,
    amount: facility.quantity * facility.rate,
  }));
  const estimate = calculateBillTotal(vehicleLines, estimateCharges);
  return (
    <article>
      <header>
        <div>
          <small>
            {new Date(`${booking.month}-01T00:00:00`).toLocaleDateString(
              "en-IN",
              { month: "long", year: "numeric" },
            )}
          </small>
          <h2>{booking.client.firmName}</h2>
          <p>
            {booking.client.ownerName} · {booking.client.mobile}
          </p>
        </div>
        <Status>{status}</Status>
      </header>
      <section className="op-campaign-facts">
        <p>
          <span>Campaign period</span>
          <b>
            {fmt(booking.startDate)} to {fmt(bookingEnd(booking))}
          </b>
          {booking.stoppedAt && (
            <small>Scheduled/actual stop: {fmt(booking.stoppedAt)}</small>
          )}
        </p>
        <p>
          <span>Vehicle attendance</span>
          <b>
            {totalPresentDays}/{totalVehicleDays || totalDays} vehicle-days
            Present
          </b>
          <small>Recorded independently in Vehicles</small>
        </p>
        <p>
          <span>Bill from attendance</span>
          <b>{money(estimate)}</b>
          <small>{booking.facilities.length} other facilities</small>
        </p>
      </section>
      <section className="op-period-list">
        {booking.vehiclePeriods.flatMap((period) => {
          const effectiveEnd = [
            period.endDate,
            bookingEnd(booking),
            isoToday(),
          ].sort()[0];
          return period.vehicleIds.map((vehicleId) => {
            const vehicle = store.vehicles.find(
                (item) => item.id === vehicleId,
              ),
              periodDays =
                effectiveEnd < period.startDate
                  ? 0
                  : inclusiveDays(period.startDate, effectiveEnd),
              presentDays =
                effectiveEnd < period.startDate
                  ? 0
                  : vehiclePresentDays(
                      store,
                      vehicleId,
                      period.startDate,
                      effectiveEnd,
                    );
            return (
              <div key={`${period.id}-${vehicleId}`}>
                <b>{vehicle?.number ?? period.type}</b>
                <span>
                  {fmt(period.startDate)} to {fmt(effectiveEnd)}
                </span>
                <span>
                  {presentDays}/{periodDays} days Present
                </span>
                <strong>{money(presentDays * period.dailyRate)}</strong>
                <small>
                  {period.type} · {money(period.dailyRate)} per present day
                </small>
              </div>
            );
          });
        })}
      </section>
      <footer>
        <Button secondary onClick={edit}>
          Edit / extend / schedule stop
        </Button>
        <Button secondary onClick={deleteBooking}>Delete campaign</Button>
        {status === "Active" && (
          <Button secondary onClick={stop}>
            Stop now
          </Button>
        )}
        {status !== "Scheduled" && (
          <Button onClick={generateBill}>
            <FileText size={17} />
            {status === "Billed"
              ? "View bill"
              : status === "Active"
                ? "Generate bill to date"
                : "Generate final bill"}
          </Button>
        )}
      </footer>
    </article>
  );
}

function CampaignSlotCardContent({
  store,
  booking,
  edit,
  renew,
  deleteBooking,
  stop,
  generateBill,
}: {
  store: FleetStore;
  booking: CampaignBooking;
  edit: () => void;
  renew: () => void;
  deleteBooking: () => void;
  stop: () => void;
  generateBill: () => void;
}) {
  if (booking.vehiclePeriods.some((period) => period.quantity < 1))
    return (
      <LegacyCampaignBookingCard
        store={store}
        booking={booking}
        edit={edit}
        deleteBooking={deleteBooking}
        stop={stop}
        generateBill={generateBill}
      />
    );
  const status = bookingStatus(booking);
  const vehicleLines = bookingVehicleLines(
    store,
    booking,
    isoToday() < bookingEnd(booking) ? isoToday() : bookingEnd(booking),
  );
  const totalPresentDays = vehicleLines.reduce(
    (sum, line) => sum + line.advertisementDays,
    0,
  );
  const totalSlotDays = vehicleLines.reduce(
    (sum, line) => sum + line.bookedDays,
    0,
  );
  const estimateCharges: BillCharge[] = booking.facilities.map((facility) => ({
    ...facility,
    amount: facility.quantity * facility.rate,
  }));
  const estimate = calculateBillTotal(vehicleLines, estimateCharges);
  return (
    <article>
      <header>
        <div>
          <small>
            {new Date(`${booking.month}-01T00:00:00`).toLocaleDateString(
              "en-IN",
              { month: "long", year: "numeric" },
            )}
          </small>
          <h2>{booking.client.firmName}</h2>
          <p>
            {booking.client.ownerName} · {booking.client.mobile}
          </p>
        </div>
        <Status>{status}</Status>
      </header>
      <section className="op-campaign-facts">
        <p>
          <span>Campaign period</span>
          <b>
            {fmt(booking.startDate)} to {fmt(bookingEnd(booking))}
          </b>
        </p>
        <p>
          <span>Campaign attendance</span>
          <b>
            {totalPresentDays}/{totalSlotDays} slot-days Present
          </b>
          <small>Recorded by party and vehicle type</small>
        </p>
        <p>
          <span>Bill from attendance</span>
          <b>{money(estimate)}</b>
          <small>{booking.facilities.length} other facilities</small>
        </p>
      </section>
      <section className="op-period-list">
        {booking.vehiclePeriods.flatMap((period) => {
          const effectiveEnd = [
            period.endDate,
            bookingEnd(booking),
            isoToday(),
          ].sort()[0];
          return Array.from({ length: period.quantity }, (_, slotIndex) => {
            const periodDays =
                effectiveEnd < period.startDate
                  ? 0
                  : inclusiveDays(period.startDate, effectiveEnd),
              presentDays =
                effectiveEnd < period.startDate
                  ? 0
                  : campaignSlotPresentDays(
                      store,
                      booking.id,
                      period.id,
                      slotIndex,
                      period.startDate,
                      effectiveEnd,
                      period.vehicleIds[slotIndex],
                    );
            return (
              <div key={campaignSlotKey(booking.id, period.id, slotIndex)}>
                <b>
                  {period.type} {slotIndex + 1}
                </b>
                <span>
                  {fmt(period.startDate)} to {fmt(effectiveEnd)}
                </span>
                <span>
                  {presentDays}/{periodDays} days Present
                </span>
                <strong>{money(presentDays * period.dailyRate)}</strong>
                <small>
                  {booking.client.firmName} · {money(period.dailyRate)} per
                  present day
                </small>
              </div>
            );
          });
        })}
      </section>
      <footer>
        <Button secondary onClick={edit}>
          Edit / extend / schedule stop
        </Button>
        {status !== "Active" && <Button secondary onClick={renew}>Renew campaign</Button>}
        <Button secondary onClick={deleteBooking}>Delete campaign</Button>
        {status === "Active" && (
          <Button secondary onClick={stop}>
            Stop now
          </Button>
        )}
        {status !== "Scheduled" && (
          <Button onClick={generateBill}>
            <FileText size={17} />
            {status === "Billed"
              ? "View bill"
              : status === "Active"
                ? "Generate bill to date"
                : "Generate final bill"}
          </Button>
        )}
      </footer>
    </article>
  );
}

export function CampaignSlotCard({
  store,
  booking,
  edit,
  renew,
  deleteBooking,
  stop,
  generateBill,
}: {
  store: FleetStore;
  booking: CampaignBooking;
  edit: () => void;
  renew: () => void;
  deleteBooking: () => void;
  stop: () => void;
  generateBill: () => void;
}) {
  const [filteredMonth, setFilteredMonth] = useState("");
  useEffect(() => {
    const receiveMonth = (event: Event) =>
      setFilteredMonth((event as CustomEvent<string>).detail);
    window.addEventListener("fleetflow:campaign-month", receiveMonth);
    window.addEventListener("fleetflow:campaign-month-current", receiveMonth);
    window.dispatchEvent(new Event("fleetflow:campaign-month-current-request"));
    return () => {
      window.removeEventListener("fleetflow:campaign-month", receiveMonth);
      window.removeEventListener(
        "fleetflow:campaign-month-current",
        receiveMonth,
      );
    };
  }, []);
  if (filteredMonth)
    return (
      <article className="op-campaign-contact-card">
        <b>{booking.client.firmName}</b>
        <a
          href={
            booking.client.mobile ? `tel:${booking.client.mobile}` : undefined
          }
        >
          {booking.client.mobile || "No contact number"}
        </a>
      </article>
    );
  const printQuotation = () =>
    window.dispatchEvent(
      new CustomEvent<number>("fleetflow:campaign-quotation", {
        detail: booking.id,
      }),
    );
  return (
    <div className="op-campaign-with-quotation">
      <CampaignSlotCardContent
        store={store}
        booking={booking}
        edit={edit}
        renew={renew}
        deleteBooking={deleteBooking}
        stop={stop}
        generateBill={generateBill}
      />
      <div className="op-campaign-quotation-action">
        <Button secondary onClick={printQuotation}>
          <Printer size={17} />
          Print quotation
        </Button>
      </div>
    </div>
  );
}

export function CampaignAttendanceView({
  store,
  setStore,
  notify,
}: {
  store: FleetStore;
  setStore: React.Dispatch<React.SetStateAction<FleetStore>>;
  notify: (message: string) => void;
}) {
  const [date, setDate] = useState(isoToday());
  const [draft, setDraft] = useState<Record<string, boolean>>(() => ({
    ...(store.campaignAttendance[isoToday()] ?? {}),
  }));
  const [dirty, setDirty] = useState(false);
  const bookings = store.campaignBookings
    .filter(
      (booking) => booking.startDate <= date && bookingEnd(booking) >= date,
    )
    .map((booking) => ({
      booking,
      periods: booking.vehiclePeriods.filter(
        (period) => period.startDate <= date && period.endDate >= date,
      ),
    }))
    .filter(({ periods }) => periods.length > 0);
  const slots = bookings.flatMap(({ booking, periods }) =>
    periods.flatMap((period) =>
      Array.from({ length: period.quantity }, (_, slotIndex) =>
        campaignSlotKey(booking.id, period.id, slotIndex),
      ),
    ),
  );
  const selectDate = (nextDate: string) => {
    if (
      dirty &&
      !window.confirm("Discard unsaved campaign attendance changes?")
    )
      return;
    setDate(nextDate);
    setDraft({ ...(store.campaignAttendance[nextDate] ?? {}) });
    setDirty(false);
  };
  const mark = (key: string, present: boolean) => {
    setDraft((current) => ({ ...current, [key]: present }));
    setDirty(true);
  };
  const save = () => {
    setStore((current) => ({
      ...current,
      campaignAttendance: { ...current.campaignAttendance, [date]: draft },
    }));
    setDirty(false);
    notify(`Campaign attendance saved for ${fmt(date)}`);
  };
  const calendarAttendance = { ...store.campaignAttendance, [date]: draft };
  return (
    <>
      <PageHead
        title="Campaign attendance"
        detail="Mark requested vehicle slots by party; no vehicle assignment is required"
      />
      <div className="op-attendance-layout">
        <AttendanceCalendar
          key={`campaign-${date.slice(0, 7)}`}
          selected={date}
          attendance={calendarAttendance}
          employeeIds={slots}
          onSelect={selectDate}
        />
        <section className="op-attendance-sheet">
          <div className="op-toolbar">
            <label className="op-field">
              <span>Attendance date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => selectDate(event.target.value)}
              />
            </label>
            <Button
              secondary
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  ...Object.fromEntries(slots.map((key) => [key, true])),
                }));
                setDirty(true);
              }}
            >
              Mark all present
            </Button>
            <Button
              secondary
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  ...Object.fromEntries(slots.map((key) => [key, false])),
                }));
                setDirty(true);
              }}
            >
              Mark all absent
            </Button>
            <Button onClick={save}>
              <Check size={17} />
              Save attendance
            </Button>
          </div>
          {dirty && <p className="op-unsaved">Unsaved changes</p>}
          {bookings.length ? (
            <section className="op-campaign-attendance-list">
              {bookings.map(({ booking, periods }) => (
                <article key={booking.id}>
                  <header>
                    <div>
                      <h2>{booking.client.firmName}</h2>
                      <p>
                        {fmt(booking.startDate)} to {fmt(bookingEnd(booking))}
                      </p>
                    </div>
                    <Status>{bookingStatus(booking)}</Status>
                  </header>
                  {periods.map((period) => (
                    <section key={period.id}>
                      <h3>
                        {period.type} <span>{period.quantity} slots</span>
                      </h3>
                      <div className="op-campaign-slot-grid">
                        {Array.from(
                          { length: period.quantity },
                          (_, slotIndex) => {
                            const key = campaignSlotKey(
                                booking.id,
                                period.id,
                                slotIndex,
                              ),
                              present =
                                draft[key] ??
                                (period.vehicleIds[slotIndex]
                                  ? store.vehicleAttendance[date]?.[
                                      period.vehicleIds[slotIndex]
                                    ]
                                  : undefined);
                            return (
                              <article key={key}>
                                <b>
                                  {period.type} {slotIndex + 1}
                                </b>
                                <small>
                                  {money(period.dailyRate)} / present day
                                </small>
                                <div>
                                  <button
                                    className={`op-attendance ${present === true ? "active" : ""}`}
                                    onClick={() => mark(key, true)}
                                  >
                                    <Check />
                                    Present
                                  </button>
                                  <button
                                    className={`op-attendance ${present === false ? "absent" : ""}`}
                                    onClick={() => mark(key, false)}
                                  >
                                    <X />
                                    Absent
                                  </button>
                                </div>
                              </article>
                            );
                          },
                        )}
                      </div>
                    </section>
                  ))}
                </article>
              ))}
            </section>
          ) : (
            <div className="op-empty-state">
              <CalendarDays />
              <h2>No campaign slots on this date</h2>
              <p>
                Create a campaign with vehicle quantities or choose a date
                within a campaign period.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

