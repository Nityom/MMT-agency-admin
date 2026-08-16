"use client";

import { Banknote, ChevronLeft, ChevronRight, Printer, Trash2, X } from "lucide-react";
import { useState } from "react";

export function Button({ children, onClick, secondary = false, type = "button" }: { children: React.ReactNode; onClick?: () => void; secondary?: boolean; type?: "button" | "submit" }) {
  return <button type={type} className={secondary ? "op-button secondary" : "op-button"} onClick={onClick}>{children}</button>;
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
export function Actions({ edit, payment, view, remove }: { edit?: () => void; payment?: () => void; view?: () => void; remove?: () => void }) { return <span className="op-actions">{edit && <button title="Edit" onClick={edit}><ChevronRight size={17}/></button>}{payment && <button title="Record payment" onClick={payment}><Banknote size={16}/></button>}{view && <button title="Print / preview" onClick={view}><Printer size={16}/></button>}{remove && <button className="delete" title="Delete" onClick={remove}><Trash2 size={16}/></button>}</span>; }

export function FormField({ label, name, type = "text", defaultValue, required = false, min }: { label: string; name: string; type?: string; defaultValue?: string | number; required?: boolean; min?: number }) {
  return <label className="op-field"><span>{label}</span><input name={name} type={type} defaultValue={defaultValue} required={required} min={min ?? (type === "number" ? 0 : undefined)}/></label>;
}

export function FormSelect({ label, name, options, defaultValue, required = false }: { label: string; name: string; options: { value: string | number; label: string }[]; defaultValue?: string | number; required?: boolean }) {
  return <label className="op-field"><span>{label}</span><select name={name} defaultValue={defaultValue ?? ""} required={required}><option value="">Select</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const printable = title.endsWith("· client ledger") || title.endsWith("· complete record");
  return <div className={`op-modal-backdrop${printable ? " op-print-ledger-modal" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="op-modal"><header><h2>{title}</h2><span className="op-modal-actions">{printable && <button className="op-modal-print" onClick={() => window.print()}><Printer size={17}/>Print all records</button>}<button title="Close" onClick={close}><X/></button></span></header>{children}</section></div>;
}