import { Banknote, ChevronLeft, ChevronRight, Pencil, Printer, ReceiptText, Trash2, X } from "lucide-react";
import { useState } from "react";
import { FleetStore, PaymentMode } from "./fleet-domain";
import { fmt, money } from "./operations-utils";

export function PaymentReceiptModal({
  store,
  paidTo,
  description,
  category,
  payment,
  close,
}: {
  store: FleetStore;
  paidTo: string;
  description?: string;
  category?: string;
  payment: {
    id?: number;
    date: string;
    amount: number;
    mode?: PaymentMode;
    reference?: string;
    note?: string;
  };
  close: () => void;
}) {
  const supplierInfo = (store.suppliers ?? []).find(
    (s) => s.name.trim().toLowerCase() === paidTo.trim().toLowerCase()
  );

  return (
    <div className="invoice-backdrop">
      <div className="invoice-dialog" style={{ width: "min(640px, 100%)" }}>
        <div className="invoice-toolbar">
          <Button secondary onClick={close}>
            <X size={17} />
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={17} />
            Print receipt
          </Button>
        </div>
        <article className="invoice-sheet" style={{ minHeight: "auto", padding: "24px" }}>
          <header className="invoice-brand" style={{ marginBottom: "16px", borderRadius: "6px" }}>
            <ReceiptText size={32} />
            <div>
              <h2>{store.company.name}</h2>
              <p>{store.company.address} · {store.company.mobile}</p>
            </div>
          </header>
          <h1 style={{ fontSize: "22px", margin: "16px 0", borderBottom: "2px solid #222", paddingBottom: "8px" }}>
            PAYMENT RECEIPT
          </h1>
          <table className="op-supplier-ledger-table" style={{ width: "100%", fontSize: "14px", marginBottom: "20px" }}>
            <tbody>
              <tr>
                <th style={{ width: "35%", background: "#f3f7f4" }}>Receipt Date</th>
                <td><b>{fmt(payment.date)}</b></td>
              </tr>
              <tr>
                <th style={{ background: "#f3f7f4" }}>Supplier / Party</th>
                <td><b>{paidTo}</b></td>
              </tr>
              {supplierInfo?.phone && (
                <tr>
                  <th style={{ background: "#f3f7f4" }}>Phone / Mobile</th>
                  <td>{supplierInfo.phone}</td>
                </tr>
              )}
              {supplierInfo?.address && (
                <tr>
                  <th style={{ background: "#f3f7f4" }}>Address / Location</th>
                  <td>{supplierInfo.address}</td>
                </tr>
              )}
              {category && (
                <tr>
                  <th style={{ background: "#f3f7f4" }}>Work Category</th>
                  <td>{category}</td>
                </tr>
              )}
              {description && (
                <tr>
                  <th style={{ background: "#f3f7f4" }}>Work / Item Details</th>
                  <td>{description}</td>
                </tr>
              )}
              <tr>
                <th style={{ background: "#f3f7f4" }}>Payment Mode</th>
                <td><strong style={{ color: "#1f6a53" }}>{payment.mode || "Cash"}</strong></td>
              </tr>
              {payment.reference && (
                <tr>
                  <th style={{ background: "#f3f7f4" }}>Reference No. / Vehicle</th>
                  <td>{payment.reference}</td>
                </tr>
              )}
              {payment.note && (
                <tr>
                  <th style={{ background: "#f3f7f4" }}>Note / Details</th>
                  <td>{payment.note}</td>
                </tr>
              )}
              <tr style={{ background: "#eef6f1", fontSize: "16px" }}>
                <th>Amount Paid</th>
                <td><strong style={{ fontSize: "20px", color: "#165944" }}>{money(payment.amount)}</strong></td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "14px", borderTop: "1px dashed #999" }}>
            <small style={{ color: "#666" }}>Computer generated receipt · {store.company.name}</small>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <img
                src="/sign.png"
                alt="Authorized Signatory"
                style={{ height: "46px", width: "auto", objectFit: "contain", marginBottom: "4px" }}
              />
              <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>Authorized Signatory</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export function Button({ children, onClick, secondary = false, type = "button", className, style }: { children: React.ReactNode; onClick?: () => void; secondary?: boolean; type?: "button" | "submit"; className?: string; style?: React.CSSProperties }) {
  const baseClass = secondary ? "op-button secondary" : "op-button";
  return <button type={type} className={className ? `${baseClass} ${className}` : baseClass} onClick={onClick} style={style}>{children}</button>;
}

export function AttendanceCalendar<T extends string | number>({ selected, attendance, employeeIds, onSelect }: { selected: string; attendance: Record<string, Record<T, boolean>>; employeeIds: T[]; onSelect: (date: string) => void }) {
  const [month, setMonth] = useState(selected.slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const leadingDays = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const monthLabel = new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const moveMonth = (offset: number) => { const value = new Date(Date.UTC(year, monthNumber - 1 + offset, 1)); setMonth(`${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`); };
  return <section className="op-calendar"><header><button title="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft/></button><h2>{monthLabel}</h2><button title="Next month" onClick={() => moveMonth(1)}><ChevronRight/></button></header><div className="op-calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <b key={day}>{day}</b>)}</div><div className="op-calendar-days">{Array.from({ length: leadingDays }, (_, index) => <span key={`empty-${index}`}/>)}{Array.from({ length: dayCount }, (_, index) => { const day = index + 1, date = `${month}-${String(day).padStart(2, "0")}`, record = attendance[date], marked = employeeIds.filter((id) => record?.[id] !== undefined).length, present = employeeIds.filter((id) => record?.[id]).length, state = employeeIds.length > 0 && marked === employeeIds.length ? "complete" : marked > 0 ? "partial" : ""; return <button className={`${date === selected ? "selected" : ""} ${state}`} onClick={() => onSelect(date)} key={date}><span>{day}</span>{marked > 0 && <small>{present}/{employeeIds.length}</small>}</button>; })}</div><footer><span><i className="complete"/>Saved</span><span><i className="partial"/>Partial</span></footer></section>;
}

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  const signature = headers.join("|");
  const mobileCards = signature === "Employee|Location and rate|Present|Absent" || signature === "Vehicle|Campaign on this date|Present|Absent" ? "attendance" : signature === "Employee|Current location|Daily rate|Effective from|Status|" ? "employees" : signature === "Vehicle|Type|Current campaign|Today|Vehicle status|" ? "fleet" : signature === "Date|Account|Description / purpose|Paid to|Reference|Amount|" ? "expenses" : "";
  return <div className={`op-table-wrap${mobileCards ? ` op-mobile-cards ${mobileCards}` : ""}`}><div className="op-table" style={{ "--cols": headers.length } as React.CSSProperties}><header>{headers.map((header, index) => <b key={`${header}-${index}`}>{header}</b>)}</header>{children}</div></div>;
}

export function Row({ children }: { children: React.ReactNode }) { return <div className="op-row">{children}</div>; }
export function Status({ children }: { children: string }) { return <span className={`op-status ${children.toLowerCase()}`}>{children}</span>; }
export function Actions({ edit, payment, view, remove }: { edit?: () => void; payment?: () => void; view?: () => void; remove?: () => void }) { return <span className="op-actions">{edit && <button title="Edit" onClick={edit}><Pencil size={15}/></button>}{payment && <button title="Record payment" onClick={payment}><Banknote size={16}/></button>}{view && <button title="Print / preview" onClick={view}><Printer size={16}/></button>}{remove && <button className="delete" title="Delete" onClick={remove}><Trash2 size={16}/></button>}</span>; }

export function FormField({ label, name, type = "text", defaultValue, required = false, min, placeholder, autoFocus }: { label: string; name: string; type?: string; defaultValue?: string | number; required?: boolean; min?: number; placeholder?: string; autoFocus?: boolean }) {
  return <label className="op-field"><span>{label}</span><input name={name} type={type} defaultValue={defaultValue} required={required} min={min ?? (type === "number" ? 0 : undefined)} placeholder={placeholder} autoFocus={autoFocus}/></label>;
}

export function FormSelect({ label, name, options, defaultValue, required = false }: { label: string; name: string; options: { value: string | number; label: string }[]; defaultValue?: string | number; required?: boolean }) {
  return <label className="op-field"><span>{label}</span><select name={name} defaultValue={defaultValue ?? ""} required={required}><option value="">Select</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const isSalarySlip = title.toLowerCase().includes("salary slip");
  const isLedger = title.toLowerCase().includes("ledger") || title.toLowerCase().includes("complete record");
  const printable = isLedger || isSalarySlip;
  return <div className={`op-modal-backdrop${printable ? " op-print-ledger-modal" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="op-modal"><header><h2>{title}</h2><span className="op-modal-actions">{printable && <button className="op-modal-print" onClick={() => window.print()}><Printer size={17}/>Print {isSalarySlip ? "salary slip" : "all records"}</button>}<button title="Close" onClick={close}><X/></button></span></header>{children}</section></div>;
}

export const MaintenancePaymentReceiptModal = PaymentReceiptModal;