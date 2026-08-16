"use client";

import {
  Banknote,
  Check,
  FileText,
  Gauge,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import Image from "next/image";
import React, { FormEvent, useState } from "react";
import {
  FleetStore,
  OtherBill,
  OtherBillCategory,
  PaymentMode,
} from "./fleet-domain";
import {
  Button,
  FormField,
  FormSelect,
  Modal,
  Row,
  Status,
  Table,
} from "./operations-components";
import { Metric, PageHead } from "./operations-reports";
import {
  amount,
  fmt,
  input,
  isoToday,
  money,
  nextId,
  otherBillBalance,
  otherBillPaid,
} from "./operations-utils";

function OtherBillForm({
  store,
  bill,
  close,
  save,
}: {
  store: FleetStore;
  bill?: OtherBill | null;
  close: () => void;
  save: (bill: OtherBill) => void;
}) {
  const [clientId, setClientId] = useState(
    bill?.clientId ?? store.clients[0]?.id ?? 0,
  );
  const [category, setCategory] = useState<OtherBillCategory>(
    bill?.category ?? "Paper",
  );
  const [items, setItems] = useState(
    (
      bill?.items ?? [
        {
          id: 1,
          description: "",
          quantity: 1,
          unit: "copies",
          rate: 0,
          amount: 0,
          costRate: 0,
          costAmount: 0,
        },
      ]
    ).map((item) => ({ ...item })),
  );
  const updateItem = (index: number, patch: Partial<(typeof items)[number]>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const total = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const costTotal = items.reduce(
    (sum, item) => sum + item.quantity * (item.costRate ?? 0),
    0,
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget),
      client = store.clients.find((item) => item.id === clientId);
    if (
      !client ||
      !items.length ||
      items.some((item) => !item.description.trim())
    )
      return;
    const savedItems = items.map((item, index) => ({
      ...item,
      id: index + 1,
      amount: item.quantity * item.rate,
      costAmount: item.quantity * (item.costRate ?? 0),
    }));
    const payments = bill?.payments ?? [];
    save({
      id: bill?.id ?? nextId(store.otherBills),
      number: bill?.number ?? store.nextOtherBillNumber,
      billDate: input(data, "billDate"),
      clientId,
      client: {
        firmName: client.firmName,
        ownerName: client.ownerName,
        address: client.address,
        mobile: client.mobile,
        email: client.email,
      },
      category,
      items: savedItems,
      payments,
      total,
      status:
        payments.reduce((sum, payment) => sum + payment.amount, 0) >= total
          ? "Paid"
          : "Pending",
    });
  };
  return (
    <Modal
      title={
        bill
          ? `Edit other bill OTH-${String(bill.number).padStart(4, "0")}`
          : "New paper / calendar bill"
      }
      close={close}
    >
      <form className="op-form op-other-bill-form" onSubmit={submit}>
        <div className="op-form-grid">
          <label className="op-field">
            <span>Client profile</span>
            <select
              value={clientId}
              onChange={(event) => setClientId(Number(event.target.value))}
              required
            >
              {store.clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.firmName} · {client.ownerName || client.mobile}
                </option>
              ))}
            </select>
          </label>
          <label className="op-field">
            <span>Bill category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as OtherBillCategory)
              }
            >
              <option>Paper</option>
              <option>Calendar</option>
            </select>
          </label>
        </div>
        <FormField
          label="Bill date"
          name="billDate"
          type="date"
          defaultValue={bill?.billDate ?? isoToday()}
          required
        />
        <div className="op-section-title">
          <h2>Bill items</h2>
          <Button
            secondary
            onClick={() =>
              setItems((current) => [
                ...current,
                {
                  id: nextId(current),
                  description: "",
                  quantity: 1,
                  unit: category === "Paper" ? "copies" : "pieces",
                  rate: 0,
                  amount: 0,
                  costRate: 0,
                  costAmount: 0,
                },
              ])
            }
          >
            <Plus size={16} />
            Add item
          </Button>
        </div>
        {items.map((item, index) => (
          <div className="op-other-bill-item" key={item.id}>
            <label>
              <span>Item description</span>
              <input
                value={item.description}
                onChange={(event) =>
                  updateItem(index, { description: event.target.value })
                }
                required
              />
            </label>
            <label>
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) =>
                  updateItem(index, {
                    quantity: Math.max(1, Number(event.target.value)),
                  })
                }
              />
            </label>
            <label>
              <span>Unit</span>
              <input
                value={item.unit}
                onChange={(event) =>
                  updateItem(index, { unit: event.target.value })
                }
              />
            </label>
            <label>
              <span>Client rate</span>
              <input
                type="number"
                min="0"
                value={item.rate}
                onChange={(event) =>
                  updateItem(index, { rate: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span>Cost rate</span>
              <input
                type="number"
                min="0"
                value={item.costRate ?? 0}
                onChange={(event) =>
                  updateItem(index, { costRate: Number(event.target.value) })
                }
              />
            </label>
            <strong>{money(item.quantity * item.rate)}</strong>
            <button
              type="button"
              title="Remove item"
              onClick={() =>
                setItems((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <section className="op-maintenance-calculation">
          <span>Client billing {money(total)}</span>
          <span>Cost {money(costTotal)}</span>
          <strong>Profit {money(total - costTotal)}</strong>
          <small>{items.length} item records</small>
        </section>
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            Save bill
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function OtherBillPaymentModal({
  bill,
  close,
  save,
}: {
  bill: OtherBill;
  close: () => void;
  save: (payment: OtherBill["payments"][number]) => void;
}) {
  const balance = otherBillBalance(bill);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget),
      paymentAmount = amount(data, "amount");
    if (paymentAmount <= 0 || paymentAmount > balance) return;
    save({
      id: nextId(bill.payments),
      date: input(data, "date"),
      amount: paymentAmount,
      mode: input(data, "mode") as PaymentMode,
      reference: input(data, "reference"),
      note: input(data, "note"),
    });
  };
  return (
    <Modal
      title={`Receive payment · OTH-${String(bill.number).padStart(4, "0")}`}
      close={close}
    >
      <form className="op-form" onSubmit={submit}>
        <p className="op-form-note">
          Received {money(otherBillPaid(bill))} · Remaining {money(balance)}
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
            label="Amount"
            name="amount"
            type="number"
            defaultValue={balance}
            min={1}
            required
          />
          <FormSelect
            label="Payment mode"
            name="mode"
            defaultValue="Cash"
            options={["Cash", "Cheque", "UPI"].map((value) => ({
              value,
              label: value,
            }))}
            required
          />
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

function OtherBillPrint({
  bill,
  store,
  close,
}: {
  bill: OtherBill;
  store: FleetStore;
  close: () => void;
}) {
  const balance = otherBillBalance(bill);
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
            Print / PDF
          </Button>
        </div>
        <article className="invoice-sheet op-invoice op-other-bill-print">
          <header className="invoice-brand">
            <Gauge size={30} />
            <h2>{store.company.name}</h2>
          </header>
          <h1>{bill.category.toUpperCase()} BILL</h1>
          <section className="invoice-company">
            <p>{store.company.address}</p>
            <p>
              Mobile: {store.company.mobile} | Email: {store.company.email}
            </p>
          </section>
          <section className="invoice-meta">
            <p>
              <b>Bill No:</b> OTH-{String(bill.number).padStart(4, "0")}
            </p>
            <p>
              <b>Bill Date:</b> {fmt(bill.billDate)}
            </p>
            <p className="invoice-bill-to">
              <b>Bill To:</b> {bill.client.firmName}
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
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{money(item.rate)}</td>
                  <td>{money(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bill.payments.length > 0 && (
            <table className="invoice-expenses op-payment-history">
              <thead>
                <tr>
                  <th>Payment date</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{fmt(payment.date)}</td>
                    <td>{payment.mode}</td>
                    <td>{payment.reference || payment.note || "Payment"}</td>
                    <td>{money(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <section className="op-invoice-total">
            <p>
              <span>Total</span>
              <b>{money(bill.total)}</b>
            </p>
            <p>
              <span>Received</span>
              <b>−{money(otherBillPaid(bill))}</b>
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
                <b>Bank:</b> {store.company.bankName}
              </p>
              <p>
                <b>Branch Name:</b> {store.company.branch}
              </p>
              <p>
                <b>A/C No:</b> {store.company.accountNumber}
              </p>
              <p>
                <b>IFSC:</b> {store.company.ifsc}
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
                alt="Proprietor signature"
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

function OtherBillClientLedger({
  store,
  clientId,
  close,
  printBill,
}: {
  store: FleetStore;
  clientId: number;
  close: () => void;
  printBill: (bill: OtherBill) => void;
}) {
  const client = store.clients.find((item) => item.id === clientId),
    bills = store.otherBills
      .filter((bill) => bill.clientId === clientId)
      .sort((left, right) => right.billDate.localeCompare(left.billDate));
  if (!client) return null;
  const billed = bills.reduce((sum, bill) => sum + bill.total, 0),
    received = bills.reduce((sum, bill) => sum + otherBillPaid(bill), 0);
  const records = bills
    .flatMap((bill) => [
      {
        key: `bill-${bill.id}`,
        date: bill.billDate,
        type: `${bill.category} bill`,
        detail: `OTH-${String(bill.number).padStart(4, "0")} · ${bill.items.length} items`,
        amount: bill.total,
        bill,
      },
      ...bill.payments.map((payment) => ({
        key: `payment-${bill.id}-${payment.id}`,
        date: payment.date,
        type: "Payment received",
        detail: `OTH-${String(bill.number).padStart(4, "0")} · ${payment.mode} · ${payment.reference || payment.note || "No reference"}`,
        amount: -payment.amount,
        bill: null,
      })),
    ])
    .sort((left, right) => right.date.localeCompare(left.date));
  return (
    <Modal title={`${client.firmName} · client ledger`} close={close}>
      <div className="op-client-ledger">
        <section className="op-ledger-profile">
          <div>
            <b>{client.firmName}</b>
            <span>
              {client.ownerName || "No owner name"} · {client.mobile}
            </span>
            <small>Paper and calendar bill ledger</small>
          </div>
        </section>
        <section className="op-ledger-totals">
          <p>
            <span>Total billed</span>
            <b>{money(billed)}</b>
          </p>
          <p>
            <span>Total received</span>
            <b>{money(received)}</b>
          </p>
          <p>
            <span>Outstanding</span>
            <strong>{money(billed - received)}</strong>
          </p>
          <p>
            <span>Bills</span>
            <b>{bills.length}</b>
          </p>
        </section>
        <div className="op-section-title">
          <h2>Complete activity history</h2>
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
                <Status>{record.amount < 0 ? "Received" : "Billed"}</Status>
                <strong className={record.amount < 0 ? "credit" : ""}>
                  {record.amount < 0 ? "−" : ""}
                  {money(Math.abs(record.amount))}
                </strong>
                {record.bill && (
                  <span className="op-ledger-row-actions">
                    <button
                      title="Print bill"
                      onClick={() => printBill(record.bill!)}
                    >
                      <Printer size={16} />
                    </button>
                  </span>
                )}
              </article>
            ))}
          </section>
        ) : (
          <div className="op-empty-state">
            <ReceiptText />
            <h2>No other bill records</h2>
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

export function OtherBillsView({
  store,
  setStore,
  notify,
}: {
  store: FleetStore;
  setStore: React.Dispatch<React.SetStateAction<FleetStore>>;
  notify: (message: string) => void;
}) {
  const [editingBill, setEditingBill] = useState<OtherBill | null | undefined>(
      undefined,
    ),
    [paymentBill, setPaymentBill] = useState<OtherBill | null>(null),
    [printBill, setPrintBill] = useState<OtherBill | null>(null);
  const billed = store.otherBills.reduce((sum, bill) => sum + bill.total, 0),
    received = store.otherBills.reduce(
      (sum, bill) => sum + otherBillPaid(bill),
      0,
    ),
    balance = store.otherBills.reduce(
      (sum, bill) => sum + otherBillBalance(bill),
      0,
    );
  const saveBill = (saved: OtherBill) => {
    setStore((current) => ({
      ...current,
      otherBills: current.otherBills.some((bill) => bill.id === saved.id)
        ? current.otherBills.map((bill) =>
            bill.id === saved.id ? saved : bill,
          )
        : [...current.otherBills, saved],
      nextOtherBillNumber: current.otherBills.some(
        (bill) => bill.id === saved.id,
      )
        ? current.nextOtherBillNumber
        : saved.number + 1,
    }));
    setEditingBill(undefined);
    setPrintBill(saved);
    notify("Other bill saved");
  };
  return (
    <>
      <PageHead
        title="Paper & calendar bills"
        detail="Create bills, record payments, and maintain separate balances"
        action="New bill"
        onAction={() => setEditingBill(null)}
      />
      <section className="op-metrics">
        <Metric
          label="Total billed"
          value={money(billed)}
          detail={`${store.otherBills.length} paper and calendar bills`}
          icon={FileText}
        />
        <Metric
          label="Received"
          value={money(received)}
          detail="All recorded payments"
          icon={Check}
        />
        <Metric
          label="Outstanding"
          value={money(balance)}
          detail={`${store.otherBills.filter((bill) => otherBillBalance(bill) > 0).length} unpaid bills`}
          icon={WalletCards}
        />
        <Metric
          label="Paid bills"
          value={String(
            store.otherBills.filter((bill) => otherBillBalance(bill) === 0)
              .length,
          )}
          detail="Fully settled records"
          icon={ReceiptText}
        />
      </section>
      {store.otherBills.length ? (
        <Table
          headers={[
            "Bill",
            "Date",
            "Client",
            "Category",
            "Items",
            "Total",
            "Received",
            "Balance",
            "Status",
            "Actions",
          ]}
        >
          {[...store.otherBills]
            .sort((left, right) => right.billDate.localeCompare(left.billDate))
            .map((bill) => (
              <Row key={bill.id}>
                <b>OTH-{String(bill.number).padStart(4, "0")}</b>
                <span>{fmt(bill.billDate)}</span>
                <b>
                  {bill.client.firmName}
                  <small>{bill.client.mobile}</small>
                </b>
                <Status>{bill.category}</Status>
                <span>{bill.items.length} items</span>
                <strong>{money(bill.total)}</strong>
                <span>{money(otherBillPaid(bill))}</span>
                <strong>{money(otherBillBalance(bill))}</strong>
                <Status>
                  {otherBillBalance(bill) === 0 ? "Paid" : "Pending"}
                </Status>
                <span className="op-actions">
                  {otherBillBalance(bill) > 0 && (
                    <button
                      title="Receive payment"
                      onClick={() => setPaymentBill(bill)}
                    >
                      <Banknote size={16} />
                    </button>
                  )}
                  <button title="Print bill" onClick={() => setPrintBill(bill)}>
                    <Printer size={16} />
                  </button>
                  <button
                    title="Edit bill"
                    onClick={() => setEditingBill(bill)}
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    className="delete"
                    title="Delete bill"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Delete this other bill and its payments?",
                        )
                      )
                        return;
                      setStore((current) => ({
                        ...current,
                        otherBills: current.otherBills.filter(
                          (item) => item.id !== bill.id,
                        ),
                      }));
                    }}
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
          <h2>No paper or calendar bills</h2>
          <p>
            Create a bill from a client profile to begin this separate ledger.
          </p>
        </div>
      )}
      {editingBill !== undefined && (
        <OtherBillForm
          store={store}
          bill={editingBill}
          close={() => setEditingBill(undefined)}
          save={saveBill}
        />
      )}{" "}
      {paymentBill && (
        <OtherBillPaymentModal
          bill={paymentBill}
          close={() => setPaymentBill(null)}
          save={(payment) => {
            setStore((current) => ({
              ...current,
              otherBills: current.otherBills.map((bill) =>
                bill.id === paymentBill.id
                  ? {
                      ...bill,
                      payments: [...bill.payments, payment],
                      status:
                        otherBillPaid({
                          ...bill,
                          payments: [...bill.payments, payment],
                        }) >= bill.total
                          ? "Paid"
                          : "Pending",
                    }
                  : bill,
              ),
            }));
            setPaymentBill(null);
            notify("Other bill payment recorded");
          }}
        />
      )}{" "}
      {printBill && (
        <OtherBillPrint
          bill={printBill}
          store={store}
          close={() => setPrintBill(null)}
        />
      )}
    </>
  );
}

export function OtherBillLedgersView({ store }: { store: FleetStore }) {
  const [clientId, setClientId] = useState<number | null>(null),
    [printBill, setPrintBill] = useState<OtherBill | null>(null),
    [search, setSearch] = useState("");
  const clients = store.clients
    .filter((client) =>
      store.otherBills.some((bill) => bill.clientId === client.id),
    )
    .filter((client) =>
      `${client.firmName} ${client.ownerName} ${client.mobile}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );
  if (printBill)
    return (
      <OtherBillPrint
        bill={printBill}
        store={store}
        close={() => setPrintBill(null)}
      />
    );
  return (
    <>
      <PageHead
        title="Other bill ledger"
        detail="Paper and calendar billing, receipts, and outstanding by client"
      />
      <div className="op-toolbar">
        <label className="op-search">
          <Search />
          <input
            placeholder="Search client name or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <p>{clients.length} client ledgers</p>
      </div>
      {clients.length ? (
        <Table
          headers={[
            "Client",
            "Contact",
            "Paper bills",
            "Calendar bills",
            "Total billed",
            "Received",
            "Outstanding",
            "",
          ]}
        >
          {clients.map((client) => {
            const bills = store.otherBills.filter(
                (bill) => bill.clientId === client.id,
              ),
              billed = bills.reduce((sum, bill) => sum + bill.total, 0),
              received = bills.reduce(
                (sum, bill) => sum + otherBillPaid(bill),
                0,
              );
            return (
              <Row key={client.id}>
                <b>
                  {client.firmName}
                  <small>{client.ownerName}</small>
                </b>
                <span>{client.mobile || "No phone"}</span>
                <span>
                  {bills.filter((bill) => bill.category === "Paper").length}
                </span>
                <span>
                  {bills.filter((bill) => bill.category === "Calendar").length}
                </span>
                <strong>{money(billed)}</strong>
                <span>{money(received)}</span>
                <strong>{money(billed - received)}</strong>
                <Button secondary onClick={() => setClientId(client.id)}>
                  <ReceiptText size={16} />
                  Open ledger
                </Button>
              </Row>
            );
          })}
        </Table>
      ) : (
        <div className="op-empty-state">
          <ReceiptText />
          <h2>No other bill ledgers</h2>
          <p>
            Clients appear after their first Paper or Calendar bill is saved.
          </p>
        </div>
      )}
      {clientId && (
        <OtherBillClientLedger
          store={store}
          clientId={clientId}
          close={() => setClientId(null)}
          printBill={(bill) => setPrintBill(bill)}
        />
      )}
    </>
  );
}

