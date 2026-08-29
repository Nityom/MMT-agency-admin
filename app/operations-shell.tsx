"use client";

import {
  Banknote, BarChart3, CalendarDays, ChevronDown, FileText, Gauge, Menu,
  ReceiptText, Truck, UserRound, UsersRound, WalletCards, Wrench, X,
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type View = "overview" | "attendance" | "employees" | "employeeExpenses" | "employeeAdvances" | "vehicles" | "vehicleAttendance" | "clients" | "quotations" | "ledgers" | "campaigns" | "payroll" | "billing" | "otherBilling" | "otherBillLedgers" | "expenses" | "selfExpenses" | "maintenance" | "maintenanceLedger" | "maintenanceProfile" | "supplierProfiles" | "bannerPrinting" | "pasting" | "recording" | "purchase" | "labourCharges" | "reports";

const navSections = [
  { label: "Dashboard", icon: Gauge, items: [{ key: "overview", label: "Overview", icon: Gauge, view: "overview" }] },
  { label: "Employee", icon: UsersRound, items: [{ key: "employees", label: "Profile", icon: UserRound, view: "employees" }, { key: "attendance", label: "Attendance", icon: CalendarDays, view: "attendance" }, { key: "employee-expense", label: "Employee expense", icon: ReceiptText, view: "employeeExpenses" }, { key: "employee-advance", label: "Employee advance", icon: Banknote, view: "employeeAdvances" }, { key: "payroll", label: "Salary", icon: WalletCards, view: "payroll" }] },
  { label: "Client", icon: UserRound, items: [{ key: "clients", label: "Profile & new client", icon: UserRound, view: "clients" }, { key: "quotations", label: "Quotations & proposals", icon: FileText, view: "quotations" }, { key: "campaigns", label: "Campaigns", icon: CalendarDays, view: "campaigns" }, { key: "vehicles", label: "Client attendance", icon: Truck, view: "vehicles" }, { key: "billing", label: "Bills & payments", icon: FileText, view: "billing" }, { key: "ledgers", label: "Ledger & receipts", icon: ReceiptText, view: "ledgers" }] },
  { label: "My other bills", icon: FileText, items: [{ key: "other-billing", label: "Paper & calendar bills", icon: FileText, view: "otherBilling" }, { key: "other-bill-ledgers", label: "Ledger", icon: ReceiptText, view: "otherBillLedgers" }] },
  { label: "Self expenses", icon: ReceiptText, items: [{ key: "self-expenses", label: "Travel & stay", icon: ReceiptText, view: "selfExpenses" }] },
  { label: "Maintenance", icon: Wrench, items: [{ key: "maintenance-profile", label: "Profile", icon: UserRound, view: "supplierProfiles" }] },
  { label: "Reports", icon: BarChart3, items: [{ key: "reports", label: "Business reports", icon: BarChart3, view: "reports" }] },
] as const;

export function OperationsShell({
  children,
  dialogContent,
  go,
  menu,
  openNavSections,
  pendingPayrollCount,
  setMenu,
  setOpenNavSections,
  view,
}: {
  children: ReactNode;
  dialogContent?: ReactNode;
  go: (view: View) => void;
  menu: boolean;
  openNavSections: Set<string>;
  pendingPayrollCount: number;
  setMenu: Dispatch<SetStateAction<boolean>>;
  setOpenNavSections: Dispatch<SetStateAction<Set<string>>>;
  view: View;
}) {
  return <div className="op-shell"><aside className={menu ? "open" : ""}><div className="op-brand"><Gauge/><span><b>MMT Agency</b><small>OPERATIONS</small></span><button onClick={() => setMenu(false)}><X/></button></div><nav>{navSections.map((section) => { const expanded = openNavSections.has(section.label), SectionIcon = section.icon; return <section className={`op-nav-section ${expanded ? "expanded" : ""}`} key={section.label}><button className="op-nav-parent" aria-expanded={expanded} onClick={() => setOpenNavSections((current) => { const next = new Set(current); if (next.has(section.label)) next.delete(section.label); else next.add(section.label); return next; })}><SectionIcon size={20}/><span>{section.label}</span><ChevronDown className="op-nav-chevron" size={17}/></button>{expanded && <div className="op-nav-children">{section.items.map((item) => { const Icon = item.icon; return <button className={view === item.view ? "active" : ""} key={item.key} onClick={() => go(item.view)}><Icon size={18}/><span>{item.label}</span>{item.key === "payroll" && <i>{pendingPayrollCount}</i>}</button>; })}</div>}</section>; })}</nav></aside>{menu && <button className="op-menu-scrim" aria-label="Close navigation" onClick={() => setMenu(false)}/>}<main><header className="op-mobile-head"><button aria-label="Open navigation" onClick={() => setMenu(true)}><Menu/></button><b>MMT Agency</b></header><div className="op-content">{children}</div></main>{dialogContent}</div>;
}