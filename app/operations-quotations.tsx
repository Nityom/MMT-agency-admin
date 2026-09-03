"use client";

import {
  CalendarDays,
  CalendarPlus,
  Check,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  addDays,
  Bill,
  BillCharge,
  BillChargeCategory,
  BillVehicleLine,
  calculateBillTotal,
  campaignDurationMonths,
  ClientSnapshot,
  FleetStore,
  inclusiveDays,
  nextQuotationNumber,
  Quotation,
  QuotationStatus,
} from "./fleet-domain";
import { Invoice } from "./operations-billing";
import { Button, FormField, FormSelect, Modal, Row, Status, Table } from "./operations-components";
import { Metric, PageHead } from "./operations-reports";
import {
  campaignChargeCategories,
  fmt,
  isoToday,
  money,
  nextId,
} from "./operations-utils";

type QuotationLineDraft = Omit<BillVehicleLine, "id" | "driverNames" | "bookedDays">;
type ChargeDraft = Omit<BillCharge, "id" | "amount">;

export function QuotationEditorModal({
  store,
  quotation,
  close,
  save,
}: {
  store: FleetStore;
  quotation?: Quotation | null;
  close: () => void;
  save: (quotation: Quotation) => void;
}) {
  const [clientId, setClientId] = useState(quotation?.clientId || 0);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResultLimit, setClientResultLimit] = useState(100);

  const [campaignClientName, setCampaignClientName] = useState(
    quotation?.client?.firmName || ""
  );
  const [clientOwnerName, setClientOwnerName] = useState(
    quotation?.client?.ownerName || ""
  );
  const [clientMobile, setClientMobile] = useState(
    quotation?.client?.mobile || ""
  );
  const [clientAddress, setClientAddress] = useState(
    quotation?.client?.address || ""
  );
  const [clientEmail, setClientEmail] = useState(
    quotation?.client?.email || ""
  );

  const [quotationStartDate, setQuotationStartDate] = useState(
    quotation?.vehicleLines[0]?.startDate || isoToday()
  );
  const [quotationEndDate, setQuotationEndDate] = useState(
    quotation?.vehicleLines[0]?.endDate || addDays(isoToday(), 30)
  );

  const [status, setStatus] = useState<QuotationStatus>(
    quotation?.status || "Draft"
  );
  const [validUntil, setValidUntil] = useState(
    quotation?.validUntil || ""
  );

  const matchingClients = store.clients.filter((client) => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      client.firmName.toLowerCase().includes(q) ||
      (client.ownerName || "").toLowerCase().includes(q) ||
      client.mobile.includes(q)
    );
  });
  const clientMatches = matchingClients.slice(0, clientResultLimit);
  const existingClient = store.clients.find((c) => c.id === clientId);

  const newLine = (): QuotationLineDraft => ({
    vehicleId: 0,
    label: "",
    quantity: 1,
    startDate: quotationStartDate,
    endDate: quotationEndDate,
    advertisementDays: inclusiveDays(quotationStartDate, quotationEndDate),
    offDays: 0,
    dailyRate: 0,
  });

  const [lines, setLines] = useState<QuotationLineDraft[]>(
    quotation && quotation.vehicleLines.length > 0
      ? quotation.vehicleLines.map((l) => ({ ...l }))
      : [newLine()]
  );

  const [charges, setCharges] = useState<ChargeDraft[]>(
    quotation
      ? quotation.charges.map((c) => ({ ...c }))
      : []
  );

  const updateLine = (index: number, patch: Partial<QuotationLineDraft>) =>
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );

  const updateCharge = (index: number, patch: Partial<ChargeDraft>) =>
    setCharges((current) =>
      current.map((charge, i) => (i === index ? { ...charge, ...patch } : charge))
    );

  const finalLines: BillVehicleLine[] = lines.map((line, index) => {
    const bookedDays =
      line.startDate <= line.endDate
        ? inclusiveDays(line.startDate, line.endDate)
        : 1;
    return {
      ...line,
      id: index + 1,
      bookedDays,
      advertisementDays: line.advertisementDays || bookedDays,
      driverNames: [],
    };
  });

  const finalCharges: BillCharge[] = charges.map((charge, index) => ({
    ...charge,
    id: index + 1,
    amount: charge.quantity * charge.rate,
  }));

  const total = calculateBillTotal(finalLines, finalCharges);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientDetails: ClientSnapshot = {
      firmName: campaignClientName.trim() || existingClient?.firmName || "Quotation Client",
      ownerName: clientOwnerName.trim() || existingClient?.ownerName || "",
      mobile: clientMobile.trim() || existingClient?.mobile || "",
      address: clientAddress.trim() || existingClient?.address || "",
      email: clientEmail.trim() || existingClient?.email || "",
    };

    save({
      id: quotation?.id || nextId(store.quotations || []),
      number: quotation?.number || nextQuotationNumber(store.quotations, store.nextQuotationNumber || 1),
      quotationDate: quotationStartDate,
      validUntil: validUntil || undefined,
      clientId: clientId || 0,
      client: clientDetails,
      vehicleLines: finalLines,
      charges: finalCharges,
      total,
      status,
      campaignBookingId: quotation?.campaignBookingId,
    });
  };

  return (
    <Modal
      title={quotation ? `Edit Quotation QT-${String(quotation.number).padStart(4, "0")}` : "New Quotation / Proposal"}
      close={close}
    >
      <form className="op-form op-campaign-form" onSubmit={submit}>
        <div className="op-form-grid">
          <label className="op-field">
            <span>Find existing client</span>
            <input
              value={clientQuery}
              placeholder="Search client name or phone number"
              onChange={(e) => {
                setClientQuery(e.target.value);
                setClientResultLimit(100);
              }}
            />
          </label>
          <label className="op-field">
            <span>
              Existing client ({matchingClients.length.toLocaleString("en-IN")} matches)
            </span>
            <select
              value={clientMatches.some((item) => item.id === clientId) ? clientId : ""}
              onChange={(e) => {
                const nextClientId = Number(e.target.value);
                setClientId(nextClientId);
                const selClient = store.clients.find((item) => item.id === nextClientId);
                if (selClient) {
                  setCampaignClientName(selClient.firmName);
                  setClientOwnerName(selClient.ownerName || "");
                  setClientMobile(selClient.mobile || "");
                  setClientAddress(selClient.address || "");
                  setClientEmail(selClient.email || "");
                } else {
                  setCampaignClientName("");
                  setClientOwnerName("");
                  setClientMobile("");
                  setClientAddress("");
                  setClientEmail("");
                }
              }}
            >
              <option value="">Select client or enter details below</option>
              {clientMatches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firmName} {c.ownerName ? `· ${c.ownerName}` : ""} {c.mobile ? `· ${c.mobile}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {clientMatches.length < matchingClients.length && (
          <Button
            secondary
            type="button"
            onClick={() => setClientResultLimit((current) => current + 100)}
          >
            Show 100 more clients (
            {(matchingClients.length - clientMatches.length).toLocaleString(
              "en-IN",
            )}{" "}
            remaining)
          </Button>
        )}

        <section className="op-client-prefill">
          <label className="op-field">
            <span>Campaign client name</span>
            <input
              value={campaignClientName}
              placeholder="Client / Firm name"
              onChange={(e) => setCampaignClientName(e.target.value)}
              required
            />
          </label>
          <div className="op-form-grid" style={{ marginTop: "8px" }}>
            <label className="op-field">
              <span>Contact Person</span>
              <input
                value={clientOwnerName}
                placeholder="Owner / Manager name"
                onChange={(e) => setClientOwnerName(e.target.value)}
              />
            </label>
            <label className="op-field">
              <span>Mobile Number</span>
              <input
                value={clientMobile}
                placeholder="Phone number"
                onChange={(e) => setClientMobile(e.target.value)}
                required
              />
            </label>
            <label className="op-field">
              <span>Address / Location</span>
              <input
                value={clientAddress}
                placeholder="Address"
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </label>
            <label className="op-field">
              <span>Email (Optional)</span>
              <input
                value={clientEmail}
                placeholder="Email address"
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </label>
          </div>
        </section>

        <div className="op-form-grid">
          <label className="op-field">
            <span>Tentative start date</span>
            <input
              name="startDate"
              type="date"
              value={quotationStartDate}
              onChange={(e) => {
                const nextDate = e.target.value;
                setLines((curr) =>
                  curr.map((l) =>
                    l.startDate === quotationStartDate
                      ? {
                          ...l,
                          startDate: nextDate,
                          advertisementDays:
                            nextDate <= l.endDate ? inclusiveDays(nextDate, l.endDate) : 1,
                        }
                      : l
                  )
                );
                setQuotationStartDate(nextDate);
              }}
              required
            />
          </label>
          <label className="op-field">
            <span>Tentative end date</span>
            <input
              name="endDate"
              type="date"
              value={quotationEndDate}
              onChange={(e) => {
                const nextDate = e.target.value;
                setLines((curr) =>
                  curr.map((l) =>
                    l.endDate === quotationEndDate
                      ? {
                          ...l,
                          endDate: nextDate,
                          advertisementDays:
                            l.startDate <= nextDate ? inclusiveDays(l.startDate, nextDate) : 1,
                        }
                      : l
                  )
                );
                setQuotationEndDate(nextDate);
              }}
              required
            />
          </label>
          <label className="op-field">
            <span>Quotation Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as QuotationStatus)}
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent to Client</option>
              <option value="Accepted">Accepted by Client</option>
              <option value="Converted">Converted to Campaign</option>
            </select>
          </label>
          <label className="op-field">
            <span>Valid Until (Optional)</span>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </label>
        </div>

        <div className="op-section-title">
          <h2>Vehicle time intervals</h2>
          <Button
            secondary
            type="button"
            onClick={() => setLines((curr) => [...curr, newLine()])}
          >
            <Plus size={16} /> Add interval
          </Button>
        </div>

        {lines.map((line, index) => {
          const days =
            line.startDate <= line.endDate ? inclusiveDays(line.startDate, line.endDate) : 1;
          return (
            <div className="op-vehicle-period" key={index}>
              <label>
                <span>Vehicle type / description</span>
                <input
                  value={line.label}
                  placeholder="e.g. Rickshaw, E-rickshaw"
                  onChange={(e) => updateLine(index, { label: e.target.value })}
                  required
                />
              </label>
              <label>
                <span>Quantity</span>
                <input
                  type="number"
                  min="1"
                  value={line.quantity || 1}
                  onChange={(e) =>
                    updateLine(index, { quantity: Math.max(1, Number(e.target.value)) })
                  }
                  required
                />
              </label>
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={line.startDate}
                  onChange={(e) => {
                    const start = e.target.value;
                    const adDays = start <= line.endDate ? inclusiveDays(start, line.endDate) : 1;
                    updateLine(index, { startDate: start, advertisementDays: adDays });
                  }}
                  required
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={line.endDate}
                  onChange={(e) => {
                    const end = e.target.value;
                    const adDays = line.startDate <= end ? inclusiveDays(line.startDate, end) : 1;
                    updateLine(index, { endDate: end, advertisementDays: adDays });
                  }}
                  required
                />
              </label>
              <label>
                <span>Rate / day</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={line.dailyRate ? line.dailyRate : ""}
                  onChange={(e) =>
                    updateLine(index, { dailyRate: Number(e.target.value) || 0 })
                  }
                  required
                />
              </label>
              <button
                type="button"
                title="Remove interval"
                onClick={() => setLines((curr) => curr.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </button>
              <small>
                {days} Total Days · {line.quantity || 1} slots · Estimated{" "}
                {money(days * (line.quantity || 1) * line.dailyRate)}
              </small>
            </div>
          );
        })}

        <div className="op-section-title">
          <h2>Other facilities & charges</h2>
          <Button
            secondary
            type="button"
            onClick={() =>
              setCharges((curr) => [
                ...curr,
                {
                  category: "Banner / printing",
                  description: "",
                  quantity: 1,
                  rate: 0,
                },
              ])
            }
          >
            <Plus size={16} /> Facility / Charge
          </Button>
        </div>

        {charges.map((charge, index) => (
          <div className="op-charge-editor" key={index}>
            <select
              value={charge.category}
              onChange={(e) =>
                updateCharge(index, { category: e.target.value as BillChargeCategory })
              }
            >
              {campaignChargeCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              placeholder="Description / details"
              value={charge.description}
              onChange={(e) => updateCharge(index, { description: e.target.value })}
            />
            <input
              aria-label="Quantity"
              type="number"
              min="1"
              value={charge.quantity}
              onChange={(e) =>
                updateCharge(index, { quantity: Number(e.target.value) || 1 })
              }
            />
            <input
              aria-label="Rate"
              type="number"
              min="0"
              value={charge.rate}
              onChange={(e) =>
                updateCharge(index, { rate: Number(e.target.value) || 0 })
              }
            />
            <b>
              {charge.category === "Discount" ? "−" : ""}
              {money(charge.quantity * charge.rate)}
            </b>
            <button
              type="button"
              title="Remove charge"
              onClick={() => setCharges((curr) => curr.filter((_, i) => i !== index))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <div className="op-bill-total" style={{ marginTop: "14px", padding: "12px 16px", background: "#e8f3ee", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#14493a" }}>
            Total Quotation Amount
          </span>
          <strong style={{ fontSize: "20px", color: "#0e3b2e" }}>
            {money(total)}
          </strong>
        </div>

        <footer>
          <Button secondary type="button" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            {quotation ? "Save Quotation Changes" : "Create Quotation"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function QuotationPrintModal({
  quotation,
  store,
  close,
}: {
  quotation: Quotation;
  store: FleetStore;
  close: () => void;
}) {
  const quotationBill: Bill = {
    id: quotation.id,
    number: quotation.number,
    billDate: quotation.quotationDate,
    clientId: quotation.clientId,
    client: quotation.client,
    vehicleLines: quotation.vehicleLines,
    charges: quotation.charges,
    advanceReceived: 0,
    paymentMode: "Cash",
    payments: [],
    total: quotation.total,
    status: "Pending",
  };

  return (
    <Invoice
      bill={quotationBill}
      store={store}
      quotation={true}
      close={close}
    />
  );
}

export function QuotationsView({
  store,
  setStore,
  notify,
}: {
  store: FleetStore;
  setStore: React.Dispatch<React.SetStateAction<FleetStore>>;
  notify: (msg: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null | undefined>(undefined);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

  const quotations = store.quotations || [];

  const filtered = quotations.filter((q) => {
    if (statusFilter !== "All" && q.status !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const num = `qt-${String(q.number).padStart(4, "0")}`.toLowerCase();
    return (
      num.includes(query) ||
      q.client.firmName.toLowerCase().includes(query) ||
      (q.client.ownerName || "").toLowerCase().includes(query) ||
      q.client.mobile.includes(query)
    );
  });

  const totalValue = quotations.reduce((sum, q) => sum + q.total, 0);
  const activeQuotations = quotations.filter((q) => q.status === "Draft" || q.status === "Sent");

  const saveQuotation = (saved: Quotation) => {
    setStore((current) => {
      const list = current.quotations || [];
      const exists = list.some((item) => item.id === saved.id);
      return {
        ...current,
        quotations: exists
          ? list.map((item) => (item.id === saved.id ? saved : item))
          : [...list, saved],
        nextQuotationNumber: Math.max(current.nextQuotationNumber || 1, saved.number + 1),
      };
    });
    setEditingQuotation(undefined);
    notify("Quotation saved successfully");
  };

  const deleteQuotation = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this quotation?")) return;
    setStore((current) => ({
      ...current,
      quotations: (current.quotations || []).filter((q) => q.id !== id),
    }));
    notify("Quotation deleted");
  };

  const restoreAllClientQuotations = () => {
    const akGandhiClient = store.clients.find((c) =>
      c.firmName.toLowerCase().includes("gandhi"),
    ) || {
      id: 999,
      firmName: "A. k. Gandhi Tvs, Bhandara",
      ownerName: "Shri Manindra Panhire",
      mobile: "+919859061000",
      email: "",
      address: "Jilha parishad chouk, bhandara",
      categories: ["Automobile"],
    };

    const qtn1: Quotation = {
      id: 1,
      number: 1,
      quotationDate: "2026-08-01",
      clientId: akGandhiClient.id,
      client: {
        firmName: akGandhiClient.firmName,
        ownerName: akGandhiClient.ownerName,
        address: akGandhiClient.address,
        mobile: akGandhiClient.mobile,
        email: akGandhiClient.email,
      },
      vehicleLines: [
        {
          id: 1,
          vehicleId: 0,
          label: "Rickshaw",
          quantity: 1,
          startDate: "2026-08-01",
          endDate: "2026-08-30",
          bookedDays: 30,
          advertisementDays: 30,
          offDays: 0,
          dailyRate: 800,
          driverNames: [],
        },
      ],
      charges: [
        {
          id: 1,
          category: "Banner / printing",
          description: "Ricksha banner",
          quantity: 1,
          rate: 3100,
          amount: 3100,
        },
        {
          id: 2,
          category: "Pasting",
          description: "",
          quantity: 1,
          rate: 900,
          amount: 900,
        },
        {
          id: 3,
          category: "Municipal tax",
          description: "",
          quantity: 1,
          rate: 300,
          amount: 300,
        },
        {
          id: 4,
          category: "Miscellaneous",
          description: "Lunch and dinner",
          quantity: 1,
          rate: 2500,
          amount: 2500,
        },
      ],
      total: 30800,
      status: "Sent",
    };

    const qtn2: Quotation = {
      id: 2,
      number: 2,
      quotationDate: "2026-09-01",
      clientId: akGandhiClient.id,
      client: {
        firmName: akGandhiClient.firmName,
        ownerName: akGandhiClient.ownerName,
        address: akGandhiClient.address,
        mobile: akGandhiClient.mobile,
        email: akGandhiClient.email,
      },
      vehicleLines: [
        {
          id: 1,
          vehicleId: 0,
          label: "Rickshaw",
          quantity: 1,
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          bookedDays: 30,
          advertisementDays: 30,
          offDays: 0,
          dailyRate: 800,
          driverNames: [],
        },
      ],
      charges: [
        {
          id: 1,
          category: "Banner / printing",
          description: "Ricksha banner",
          quantity: 1,
          rate: 3100,
          amount: 3100,
        },
        {
          id: 2,
          category: "Pasting",
          description: "",
          quantity: 1,
          rate: 900,
          amount: 900,
        },
        {
          id: 3,
          category: "Municipal tax",
          description: "",
          quantity: 1,
          rate: 300,
          amount: 300,
        },
        {
          id: 4,
          category: "Miscellaneous",
          description: "Lunch and dinner",
          quantity: 1,
          rate: 2500,
          amount: 2500,
        },
      ],
      total: 30800,
      status: "Draft",
    };

    const restoredList = [qtn2, qtn1];
    setStore((current) => {
      const existingIds = new Set(restoredList.map((q) => q.number));
      const remaining = (current.quotations || []).filter((q) => !existingIds.has(q.number));
      return {
        ...current,
        quotations: [...restoredList, ...remaining].sort((a, b) => b.number - a.number),
        nextQuotationNumber: Math.max(current.nextQuotationNumber || 1, 4),
      };
    });
    notify("All client quotations restored successfully!");
  };



  const convertToCampaign = (q: Quotation) => {
    if (
      !window.confirm(
        `Convert Quotation QT-${String(q.number).padStart(4, "0")} into an active Campaign Booking for ${q.client.firmName}?`
      )
    )
      return;

    let client = store.clients.find((c) => c.id === q.clientId);
    let updatedClients = store.clients;
    let finalClientId = q.clientId;

    if (!client) {
      finalClientId = nextId(store.clients);
      client = {
        id: finalClientId,
        firmName: q.client.firmName,
        ownerName: q.client.ownerName || "",
        mobile: q.client.mobile || "",
        address: q.client.address || "",
        email: q.client.email || "",
        dateOfBirth: "",
        categories: ["Other"],
        status: "Active",
      };
      updatedClients = [...store.clients, client];
    }

    const startDate = q.vehicleLines[0]?.startDate || q.quotationDate;
    const endDate = q.vehicleLines[0]?.endDate || addDays(q.quotationDate, 30);
    const month = startDate.slice(0, 7);

    const vehiclePeriods = q.vehicleLines.map((line, idx) => ({
      id: idx + 1,
      type: (line.label?.toLowerCase().includes("e-rickshaw")
        ? "E-rickshaw"
        : "Rickshaw") as "Rickshaw" | "E-rickshaw",
      vehicleIds: [],
      startDate: line.startDate,
      endDate: line.endDate,
      quantity: line.quantity || 1,
      dailyRate: line.dailyRate,
    }));

    const facilities = q.charges.map((charge, idx) => ({
      id: idx + 1,
      category: charge.category,
      description: charge.description || "",
      quantity: charge.quantity || 1,
      rate: charge.rate || 0,
    }));

    const newBooking = {
      id: nextId(store.campaignBookings),
      month,
      clientId: finalClientId,
      client: {
        firmName: client.firmName,
        ownerName: client.ownerName || "",
        address: client.address || "",
        mobile: client.mobile || "",
        email: client.email || "",
      },
      startDate,
      endDate,
      vehiclePeriods,
      facilities,
    };

    setStore((current) => ({
      ...current,
      clients: updatedClients,
      campaignBookings: [...current.campaignBookings, newBooking],
      quotations: (current.quotations || []).filter((item) => item.id !== q.id),
    }));

    notify(
      `Quotation QT-${String(q.number).padStart(4, "0")} converted to active Campaign for ${q.client.firmName}`
    );
  };

  return (
    <>
      <PageHead
        title="Client Quotations"
        detail="Generate, edit, track and print custom estimates & campaign proposals"
        action="New Quotation"
        onAction={() => setEditingQuotation(null)}
      />

      <div className="op-toolbar">
        <label className="op-search">
          <Search />
          <input
            placeholder="Search quotation by #, client name, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="op-period-tabs" style={{ display: "flex", gap: "6px" }}>
          {["All", "Draft", "Sent", "Accepted", "Converted"].map((st) => (
            <Button
              key={st}
              secondary={statusFilter !== st}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </Button>
          ))}
        </div>
        <p>
          {filtered.length} of {quotations.length} quotations
        </p>
        <Button secondary onClick={restoreAllClientQuotations}>
          <RotateCcw size={15} />
          Restore Client Quotations
        </Button>
      </div>

      <section className="op-metrics three">
        <Metric
          label="Total Proposals"
          value={String(quotations.length)}
          detail="All quotations"
          icon={FileText}
        />
        <Metric
          label="Active / Sent"
          value={String(activeQuotations.length)}
          detail="Awaiting approval"
          icon={CalendarDays}
        />
        <Metric
          label="Total Quotation Value"
          value={money(totalValue)}
          detail="Potential business"
          icon={Check}
        />
      </section>

      {filtered.length ? (
        <Table
          headers={[
            "Quotation #",
            "Client",
            "Date",
            "Items",
            "Total Amount",
            "Status",
            "Actions",
          ]}
        >
          {filtered.map((q) => (
            <Row key={q.id}>
              <b>QT-{String(q.number).padStart(4, "0")}</b>
              <span>
                {q.client.firmName}
                <small>{q.client.mobile}</small>
              </span>
              <span>{fmt(q.quotationDate)}</span>
              <span>{q.vehicleLines.length + q.charges.length} items</span>
              <strong>{money(q.total)}</strong>
              <Status>{q.status}</Status>
              <span className="op-actions">
                <button
                  type="button"
                  onClick={() => convertToCampaign(q)}
                  title="Convert to active Campaign booking"
                  style={{
                    color: "#185b47",
                    background: "#e8f3ee",
                    borderColor: "#c2dbd1",
                  }}
                >
                  <CalendarPlus size={16} />
                </button>
                <button
                  title="Print quotation"
                  onClick={() => setViewingQuotation(q)}
                >
                  <Printer size={16} />
                </button>
                <button
                  title="Edit quotation"
                  onClick={() => setEditingQuotation(q)}
                >
                  <FileText size={16} />
                </button>
                <button
                  className="delete"
                  title="Delete quotation"
                  onClick={() => deleteQuotation(q.id)}
                >
                  <Trash2 size={16} />
                </button>
              </span>
            </Row>
          ))}
        </Table>
      ) : (
        <div className="op-empty-state">
          <FileText />
          <h2>No quotations found</h2>
          <p>
            {search || statusFilter !== "All"
              ? "Try adjusting your search or status filter."
              : "Create your first quotation for a client."}
          </p>
        </div>
      )}

      {editingQuotation !== undefined && (
        <QuotationEditorModal
          store={store}
          quotation={editingQuotation}
          close={() => setEditingQuotation(undefined)}
          save={saveQuotation}
        />
      )}

      {viewingQuotation && (
        <QuotationPrintModal
          quotation={viewingQuotation}
          store={store}
          close={() => setViewingQuotation(null)}
        />
      )}
    </>
  );
}
