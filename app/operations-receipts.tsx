"use client";

import {
  Banknote,
  Check,
  FileText,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState, useMemo } from "react";
import {
  ClientReceipt,
  FleetStore,
  ISODate,
  nextReceiptNumber,
  PaymentMode,
} from "./fleet-domain";
import { InvoiceHeader } from "./invoice-header";
import { Button, Modal, Row, Status, Table } from "./operations-components";
import { fmt, isoToday, money, nextId } from "./operations-utils";

const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Cheque", "RTGS", "NEFT"];

export function ClientReceiptFormModal({
  store,
  initialClientId,
  receipt,
  close,
  save,
  remove,
}: {
  store: FleetStore;
  initialClientId?: number | null;
  receipt?: ClientReceipt | null;
  close: () => void;
  save: (receipt: ClientReceipt) => void;
  remove?: (receiptId: number) => void;
}) {
  const [clientId, setClientId] = useState<number>(
    receipt?.clientId ??
    initialClientId ??
    (store.clients.length > 0 ? store.clients[0].id : 0)
  );

  const selectedClient =
    store.clients.find((c) => c.id === clientId) ??
    (receipt?.client
      ? {
          id: clientId,
          firmName: receipt.client.firmName,
          ownerName: receipt.client.ownerName,
          address: receipt.client.address,
          mobile: receipt.client.mobile,
          email: receipt.client.email,
        }
      : undefined);

  const [receiptDate, setReceiptDate] = useState<ISODate>(
    receipt?.receiptDate ?? isoToday(),
  );
  const [amount, setAmount] = useState<number | string>(
    receipt?.amount !== undefined ? receipt.amount : "",
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    receipt?.paymentMode ?? "Cash",
  );
  const [reference, setReference] = useState<string>(receipt?.reference ?? "");
  const [note, setNote] = useState<string>(receipt?.note ?? "");
  const [enableLoss, setEnableLoss] = useState<boolean>((receipt?.lossAmount ?? 0) > 0);
  const [lossAmount, setLossAmount] = useState<number | string>(receipt?.lossAmount ?? "");
  const [lossReason, setLossReason] = useState<string>(receipt?.lossReason ?? "Client underpayment settlement");
  const [lossDate, setLossDate] = useState<string>(receipt?.lossDate ?? (receipt?.receiptDate ?? isoToday()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }
    if (!selectedClient && !receipt?.client) {
      alert("Please select a valid client.");
      return;
    }

    const clientSnapshot = selectedClient
      ? {
          firmName: selectedClient.firmName,
          ownerName: selectedClient.ownerName || "",
          address: selectedClient.address || "",
          mobile: selectedClient.mobile || "",
          email: selectedClient.email || "",
        }
      : receipt!.client;

    const receiptNumber =
      receipt?.number ??
      nextReceiptNumber(store.receipts ?? [], store.nextReceiptNumber ?? 1);

    const activeLoss = enableLoss ? (Number(lossAmount) || 0) : 0;

    const savedReceipt: ClientReceipt = {
      id: receipt?.id ?? nextId(store.receipts ?? []),
      number: receiptNumber,
      receiptDate,
      clientId,
      client: clientSnapshot,
      amount: numAmount,
      paymentMode,
      reference: reference.trim(),
      note: note.trim(),
      status: receipt?.status ?? "Unbilled",
      billId: receipt?.billId,
      billNumber: receipt?.billNumber,
      lossAmount: activeLoss > 0 ? activeLoss : undefined,
      lossReason: activeLoss > 0 ? lossReason.trim() : undefined,
      lossDate: activeLoss > 0 ? lossDate : undefined,
    };

    save(savedReceipt);
  };

  return (
    <Modal
      title={
        receipt
          ? `Edit Receipt REC-${String(receipt.number).padStart(4, "0")}`
          : "Generate Client Payment Receipt"
      }
      close={close}
    >
      <form
        onSubmit={handleSubmit}
        className="op-form op-receipt-form"
        style={{ padding: "26px 30px", display: "grid", gap: "18px" }}
      >
        <p
          style={{
            margin: "0",
            color: "#475569",
            fontSize: "13.5px",
            lineHeight: "1.5",
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        >
          Issue an official money receipt for advance, booking tokens, or partial payments received from a client. When generating the final bill, all unbilled receipts can be summed automatically.
        </p>

        <label className="op-field">
          <span>Client / Firm Name</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(Number(e.target.value))}
            required
            style={{ fontWeight: 600, fontSize: "14px" }}
          >
            {store.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firmName} {c.ownerName ? `(${c.ownerName})` : ""} · {c.mobile || "No phone"}
              </option>
            ))}
          </select>
        </label>

        {selectedClient && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "14px 18px",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#166534",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Client
              </span>
              <h3
                style={{
                  margin: "2px 0 0",
                  fontSize: "16px",
                  color: "#14532d",
                  fontWeight: 700,
                }}
              >
                {selectedClient.firmName}
              </h3>
              {selectedClient.ownerName && (
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#166534" }}>
                  {selectedClient.ownerName}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right", fontSize: "13px", color: "#15803d" }}>
              <b>{selectedClient.mobile || "No phone"}</b>
              {selectedClient.address && (
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#4b5563" }}>
                  {selectedClient.address}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="op-form-grid" style={{ gap: "14px" }}>
          <label className="op-field">
            <span>Receipt Date</span>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              required
            />
          </label>

          <label className="op-field">
            <span>Amount Received (₹)</span>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </label>
        </div>

        <div className="op-form-grid" style={{ gap: "14px" }}>
          <label className="op-field">
            <span>Payment Mode</span>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="op-field">
            <span>Reference / Transaction ID (Optional)</span>
            <input
              type="text"
              placeholder="UPI Ref / Cheque No / RTGS UTR"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
        </div>

        <label className="op-field">
          <span>Purpose / Note / Remarks (Optional)</span>
          <input
            type="text"
            placeholder="e.g. Advance token for campaign / Booking deposit"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div
          style={{
            marginTop: "2px",
            padding: "14px",
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
              onChange={(e) => setEnableLoss(e.target.checked)}
            />
            Record / Adjust Credit Note for this client receipt
          </label>

          {enableLoss && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="op-form-grid" style={{ gap: "12px" }}>
                <label className="op-field">
                  <span style={{ color: "#c2410c" }}>Credit Note Amount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={lossAmount}
                    onChange={(e) => setLossAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="Credit note / settlement allowance"
                    required={enableLoss}
                  />
                </label>
                <label className="op-field">
                  <span style={{ color: "#c2410c" }}>Credit Note Date</span>
                  <input
                    type="date"
                    value={lossDate}
                    onChange={(e) => setLossDate(e.target.value)}
                  />
                </label>
              </div>
              <label className="op-field">
                <span style={{ color: "#c2410c" }}>Credit Note Reason / Note</span>
                <input
                  type="text"
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  placeholder="e.g. Underpayment settlement / haircut"
                />
              </label>
              <small style={{ color: "#c2410c", fontSize: "11px", fontWeight: 600 }}>
                * Credit note settlement will be recorded and shown on receipt.
              </small>
            </div>
          )}
        </div>

        <footer
          style={{
            marginTop: "8px",
            paddingTop: "18px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {receipt && remove && (
            <Button
              secondary
              type="button"
              style={{ color: "#a13e34", marginRight: "auto" }}
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete receipt REC-${String(receipt.number).padStart(4, "0")} of ${money(receipt.amount)}?`
                  )
                ) {
                  close();
                  remove(receipt.id);
                }
              }}
            >
              <Trash2 size={16} />
              Delete receipt
            </Button>
          )}
          <Button secondary onClick={close} type="button">
            Cancel
          </Button>
          <Button type="submit">
            <Check size={16} />
            {receipt ? "Save changes" : "Generate receipt"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function ClientReceiptViewModal({
  receipt,
  store,
  close,
  edit,
  remove,
}: {
  receipt: ClientReceipt;
  store: FleetStore;
  close: () => void;
  edit?: (receipt: ClientReceipt) => void;
  remove?: (receiptId: number) => void;
}) {
  const receiptNo = `REC-${String(receipt.number).padStart(4, "0")}`;

  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog" style={{ width: "min(680px, 100%)" }}>
        <div className="invoice-toolbar" style={{ flexWrap: "wrap", gap: "8px" }}>
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          {edit && (
            <Button
              secondary
              onClick={() => {
                close();
                edit(receipt);
              }}
            >
              Edit receipt
            </Button>
          )}
          {remove && (
            <Button
              secondary
              style={{ color: "#a13e34" }}
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete receipt ${receiptNo} for ${money(
                      receipt.amount,
                    )}?`,
                  )
                ) {
                  close();
                  remove(receipt.id);
                }
              }}
            >
              <Trash2 size={16} />
              Delete
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print receipt
          </Button>
        </div>

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
              <b>Receipt Date:</b> {fmt(receipt.receiptDate)}
            </p>
            <p>
              <b>Status:</b>{" "}
              {receipt.status === "Billed" ? (
                <span style={{ color: "#1f6a53", fontWeight: 700 }}>
                  Applied to Bill INV-
                  {String(receipt.billNumber ?? "").padStart(4, "0")}
                </span>
              ) : (
                <span style={{ color: "#8b5cf6", fontWeight: 700 }}>
                  Advance Deposit (Unbilled)
                </span>
              )}
            </p>
            <p className="invoice-bill-to">
              <b>Received From:</b> {receipt.client.firmName}
              <br />
              <span>
                {receipt.client.ownerName ? `${receipt.client.ownerName} · ` : ""}
                {receipt.client.mobile || "No mobile"}
                {receipt.client.address ? ` · ${receipt.client.address}` : ""}
              </span>
            </p>
          </section>

          <table className="invoice-table" style={{ margin: "14px 0" }}>
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Receipt Date</th>
                <th style={{ width: "18%" }}>Mode</th>
                <th style={{ width: "35%" }}>Reference / Purpose</th>
                <th style={{ width: "25%", textAlign: "right" }}>Amount Received</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>{fmt(receipt.receiptDate)}</b>
                </td>
                <td>
                  <strong style={{ color: "#1f6a53" }}>{receipt.paymentMode}</strong>
                </td>
                <td>
                  {receipt.reference && (
                    <div>
                      <b>Ref:</b> {receipt.reference}
                    </div>
                  )}
                  {receipt.note ? (
                    <div>{receipt.note}</div>
                  ) : (
                    <span style={{ color: "#687670" }}>Advance payment received</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <b style={{ fontSize: "17px", color: "#1f6a53" }}>
                    {money(receipt.amount)}
                  </b>
                </td>
              </tr>
            </tbody>
          </table>

          <section className="op-invoice-total">
            <p>
              <span>Total Amount Received</span>
              <strong style={{ color: "#1f6a53", fontSize: "19px" }}>
                {money(receipt.amount)}
              </strong>
            </p>
            {receipt.lossAmount ? (
              <p style={{ color: "#c2410c" }}>
                <span>Credit Note ({receipt.lossReason || "Settlement"})</span>
                <b>{money(receipt.lossAmount)}</b>
              </p>
            ) : null}
            {receipt.status === "Billed" && receipt.billNumber && (
              <p>
                <span>Included In Bill</span>
                <b>INV-{String(receipt.billNumber).padStart(4, "0")}</b>
              </p>
            )}
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
                <b>IFSC:</b> {store.company.ifsc || "Update in company settings"}
              </p>
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

export function ClientReceiptsRegister({
  store,
  openCreateReceipt,
  viewReceipt,
  editReceipt,
  removeReceipt,
  viewBill,
}: {
  store: FleetStore;
  openCreateReceipt: (clientId?: number) => void;
  viewReceipt: (receipt: ClientReceipt) => void;
  editReceipt: (receipt: ClientReceipt) => void;
  removeReceipt: (receiptId: number) => void;
  viewBill?: (billNumberOrId: number) => void;
}) {
  const [filter, setFilter] = useState<"all" | "unbilled" | "billed">("all");
  const [query, setQuery] = useState("");

  const allReceipts = store.receipts ?? [];

  const filteredReceipts = useMemo(() => {
    return allReceipts
      .filter((r) => {
        if (filter === "unbilled" && (r.status === "Billed" || r.billId)) return false;
        if (filter === "billed" && (r.status !== "Billed" && !r.billId)) return false;
        if (!query.trim()) return true;

        const q = query.trim().toLowerCase();
        const recNum = `rec-${String(r.number).padStart(4, "0")}`.toLowerCase();
        const firm = (r.client?.firmName || "").toLowerCase();
        const owner = (r.client?.ownerName || "").toLowerCase();
        const mobile = r.client?.mobile || "";
        const note = (r.note || "").toLowerCase();
        const ref = (r.reference || "").toLowerCase();
        const invNum = r.billNumber ? `inv-${String(r.billNumber).padStart(4, "0")}`.toLowerCase() : "";

        return (
          recNum.includes(q) ||
          firm.includes(q) ||
          owner.includes(q) ||
          mobile.includes(q) ||
          note.includes(q) ||
          ref.includes(q) ||
          invNum.includes(q)
        );
      })
      .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate) || b.number - a.number);
  }, [allReceipts, filter, query]);

  const totalReceiptsAmount = allReceipts.reduce((sum, r) => sum + r.amount, 0);
  const unbilledReceiptsAmount = allReceipts
    .filter((r) => r.status !== "Billed" && !r.billId)
    .reduce((sum, r) => sum + r.amount, 0);
  const billedReceiptsAmount = allReceipts
    .filter((r) => r.status === "Billed" || r.billId)
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <div
        className="op-period-tabs"
        style={{ marginBottom: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}
      >
        <Button
          secondary={filter !== "all"}
          onClick={() => setFilter("all")}
        >
          All Receipts ({allReceipts.length})
        </Button>
        <Button
          secondary={filter !== "unbilled"}
          onClick={() => setFilter("unbilled")}
        >
          Unbilled / Deposits (
          {allReceipts.filter((r) => r.status !== "Billed" && !r.billId).length}
          )
        </Button>
        <Button
          secondary={filter !== "billed"}
          onClick={() => setFilter("billed")}
        >
          Applied to Bills (
          {allReceipts.filter((r) => r.status === "Billed" || r.billId).length}
          )
        </Button>
      </div>

      <div className="op-toolbar">
        <label className="op-search">
          <Search />
          <input
            placeholder="Search receipt #, client firm, phone, note, or reference"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button onClick={() => openCreateReceipt()}>
          <Plus size={16} />
          Generate receipt
        </Button>
        <Button secondary onClick={() => window.print()}>
          <Printer size={16} />
          Print register
        </Button>
        <p>
          {filteredReceipts.length} of {allReceipts.length} receipts
        </p>
      </div>

      <section className="op-metrics three">
        <div className="op-metric">
          <span>Total Receipts Collected</span>
          <strong>{money(totalReceiptsAmount)}</strong>
          <small>{allReceipts.length} receipts recorded</small>
        </div>
        <div className="op-metric">
          <span>Unbilled Advance / Token</span>
          <strong style={{ color: "#8b5cf6" }}>{money(unbilledReceiptsAmount)}</strong>
          <small>
            {allReceipts.filter((r) => r.status !== "Billed" && !r.billId).length} receipts pending bill
          </small>
        </div>
        <div className="op-metric">
          <span>Applied to Final Bills</span>
          <strong style={{ color: "#1f6a53" }}>{money(billedReceiptsAmount)}</strong>
          <small>
            {allReceipts.filter((r) => r.status === "Billed" || r.billId).length} receipts credited into invoices
          </small>
        </div>
      </section>

      {filteredReceipts.length ? (
        <Table
          headers={[
            "Receipt #",
            "Client",
            "Date",
            "Amount",
            "Payment mode",
            "Reference / Note",
            "Status",
            "",
          ]}
        >
          {filteredReceipts.map((r) => (
            <Row key={r.id}>
              <b>REC-{String(r.number).padStart(4, "0")}</b>
              <span>
                {r.client?.firmName || "Client"}
                <small>{r.client?.mobile || r.client?.ownerName}</small>
              </span>
              <span>{fmt(r.receiptDate)}</span>
              <strong>{money(r.amount)}</strong>
              <span>
                <b>{r.paymentMode}</b>
              </span>
              <span>
                {r.reference ? <b>Ref: {r.reference}</b> : null}
                {r.note ? <small>{r.note}</small> : <small style={{ color: "#888" }}>Advance payment</small>}
              </span>
              <span>
                {r.status === "Billed" || r.billId ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: "#e6f4ea",
                      color: "#137333",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    Applied to INV-{String(r.billNumber ?? "").padStart(4, "0")}
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: "#f3e8ff",
                      color: "#6b21a8",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    Unbilled Deposit
                  </span>
                )}
              </span>
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  className="op-icon"
                  title="View / Print Receipt"
                  onClick={() => viewReceipt(r)}
                >
                  <Printer size={16} />
                </button>
                <button
                  className="op-icon"
                  title="Edit Receipt"
                  onClick={() => editReceipt(r)}
                >
                  <FileText size={16} />
                </button>
                <button
                  className="op-icon"
                  title="Delete Receipt"
                  style={{ color: "#a13e34" }}
                  onClick={() => removeReceipt(r.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Row>
          ))}
        </Table>
      ) : (
        <div className="op-empty-state">
          <ReceiptText />
          <h2>No receipts found</h2>
          <p>
            {query
              ? "Try adjusting your search criteria."
              : "Generate money receipts for small client amounts and deposits before billing."}
          </p>
          <div style={{ marginTop: "12px" }}>
            <Button onClick={() => openCreateReceipt()}>
              <Plus size={16} />
              Generate first receipt
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
