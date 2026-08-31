"use client";

import {
  Banknote, Check, CircleDollarSign,
  FileText, Printer, ReceiptText, Search, Trash2, Truck,
  UsersRound, WalletCards, Wrench, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  addDays, Bill, BillCharge, BillVehicleLine, BusinessExpenseCategory, CampaignBooking,
  calculateBillTotal, calculateEmployeeLedger, calculatePayrollRange,
  ClientCategory, FleetStore, getEmployeeAdvancesWithRecoveries, inclusiveDays, PaymentMode,
  nextBillNumber, PayrollPayment, rateOnDate, weekFor,
} from "./fleet-domain";
import { Actions, AttendanceCalendar, Button, Row, Status, Table } from "./operations-components";
import {
  BillPaymentModal, BillReceipt, BillingComposer, CampaignBillModeModal, CampaignQuotation,
  ConsolidateBillsModal, ConsolidatedInvoice, Invoice, QuotationComposer,
} from "./operations-billing";
import { CampaignAttendanceView, CampaignBookingForm } from "./operations-campaigns";
import { CampaignsView, ClientLedgersView, ClientsView } from "./operations-client-views";
import { QuotationsView } from "./operations-quotations";
import { EntryForm, MaintenanceEntryForm } from "./operations-forms";
import { BillingView, ExpensesView, OverviewView } from "./operations-finance-views";
import { OtherBillLedgersView, OtherBillsView } from "./operations-other-bills";
import { EmployeeAdvanceHistoryModal, EmployeeRecordModal } from "./operations-records";
import {
  Metric, PageHead, ReportCategoryDetailModal,
  ReportDetailModal,
} from "./operations-reports";
import { ReportsView } from "./operations-reports-view";
import { AttendanceView, EmployeesView, PayrollView } from "./operations-workforce-views";
import {
  billBalance, bookingEnd, bookingStatus, bookingVehicleLines,
  campaignMonthOptions, campaignSlotPresentDays, expenseClientBilling,
  expenseProfit, findCampaignBillForRange, fmt, isoToday, matchesReportCategory, money, nextId, otherBillBalance, otherBillCost,
  ReportProfitCategory, reportProfitCategories, supplierBalance, supplierPaid,
} from "./operations-utils";
import { EditableSelfExpensesView } from "./operations-expenses";
import { MaintenanceManager } from "./maintenance-manager";
import type { Dialog } from "./operations-forms";
import type { ReportDetailKind } from "./operations-reports";
export { SelfExpensesView } from "./operations-expenses";
import { useFleetStore } from "./use-fleet-store";
import {
  MaintenancePaymentReceiptModal,
  SupplierCardsView,
  SupplierPaymentModal,
} from "./operations-suppliers";
import { OperationsShell, type View } from "./operations-shell";
export { SupplierLedgerPrint, SupplierProfilesView, SupplierStatementPrint } from "./operations-suppliers";


type ImportedContact = { id: number; firmName: string; mobile: string; alternatePhone?: string };

export default function OperationsApp() {
  const { store, setStore, storageReady } = useFleetStore();
  const [view, setView] = useState<View>("overview"), [menu, setMenu] = useState(false), [dialog, setDialog] = useState<Dialog>(null), [toast, setToast] = useState(""), [search, setSearch] = useState(""), [clientSearch, setClientSearch] = useState(""), [campaignSearch, setCampaignSearch] = useState(""), [campaignMonth, setCampaignMonth] = useState(""), [ledgerSearch, setLedgerSearch] = useState(""), [billingSearch, setBillingSearch] = useState(""), [clientCampaignFilter, setClientCampaignFilter] = useState<"Search" | "Ongoing" | "Completed">("Search"), [clientCategoryFilter, setClientCategoryFilter] = useState<ClientCategory | "All">("All");
  const [openNavSections, setOpenNavSections] = useState<Set<string>>(() => new Set());
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [employeeRecordId, setEmployeeRecordId] = useState<number | null>(null);
  const [maintenanceEntryCategory, setMaintenanceEntryCategory] = useState<BusinessExpenseCategory>();
  const [maintenancePaymentExpense, setMaintenancePaymentExpense] = useState<FleetStore["businessExpenses"][number] | null>(null);
  const [receiptModal, setReceiptModal] = useState<{ paidTo: string; description?: string; category?: string; payment: { id?: number; date: string; amount: number; mode?: PaymentMode; reference?: string; note?: string } } | null>(null);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [ledgerClientId, setLedgerClientId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<CampaignBooking | null>(null);
  const [renewingCampaign, setRenewingCampaign] = useState(false);
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [campaignBillBooking, setCampaignBillBooking] = useState<CampaignBooking | null>(null);
  const [draftCampaignBooking, setDraftCampaignBooking] = useState<CampaignBooking | null>(null);
  useEffect(() => {
    if (!renewingCampaign || !editingCampaign || store.campaignBookings.some((booking) => booking.id === editingCampaign.id)) return;
    setStore((current) => ({ ...current, campaignBookings: [...current.campaignBookings, editingCampaign] }));
  }, [editingCampaign, renewingCampaign, setStore, store.campaignBookings]);
  const [composeQuotation, setComposeQuotation] = useState(false);
  const [quotationDraft, setQuotationDraft] = useState<Bill | null>(null);
  const [quotationBooking, setQuotationBooking] = useState<CampaignBooking | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [consolidateOpen, setConsolidateOpen] = useState(false);
  const [consolidatedBills, setConsolidatedBills] = useState<Bill[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(isoToday()), [attendanceReportFrom, setAttendanceReportFrom] = useState(`${isoToday().slice(0, 7)}-01`), [attendanceReportTo, setAttendanceReportTo] = useState(isoToday()), [payrollWeek, setPayrollWeek] = useState(weekFor(isoToday()).start), [payrollPeriodEnd, setPayrollPeriodEnd] = useState(weekFor(isoToday()).end), [composeBill, setComposeBill] = useState(false), [billingClientId, setBillingClientId] = useState(0), [invoice, setInvoice] = useState<Bill | null>(null), [receipt, setReceipt] = useState<Bill | null>(null), [reportPeriod, setReportPeriod] = useState<"Month" | "Quarter" | "Year" | "Date range">("Month");
  const [reportFrom, setReportFrom] = useState(`${isoToday().slice(0, 7)}-01`), [reportTo, setReportTo] = useState(isoToday());
  const [reportMonth, setReportMonth] = useState(() => isoToday().slice(0, 7));
  const [reportQuarter, setReportQuarter] = useState(() => Math.floor((Number(isoToday().slice(5, 7)) - 1) / 3) + 1);
  const [reportQuarterYear, setReportQuarterYear] = useState(() => Number(isoToday().slice(0, 4)));
  const [reportYear, setReportYear] = useState(() => Number(isoToday().slice(0, 4)));
  const [reportProfitCategory, setSelectedReportProfitCategory] = useState<ReportProfitCategory>("All");
  const [reportCategoryDetail, setReportCategoryDetail] = useState<ReportProfitCategory | null>(null);
  const [reportDetail, setReportDetail] = useState<ReportDetailKind | null>(null);
  const [attendanceDraft, setAttendanceDraft] = useState<Record<number, boolean>>(() => ({ ...(store.attendance[isoToday()] ?? {}) }));
  const [attendanceDirty, setAttendanceDirty] = useState(false);
  const [vehicleAttendanceDate, setVehicleAttendanceDate] = useState(isoToday());
  const [vehicleAttendanceDraft, setVehicleAttendanceDraft] = useState<Record<number, boolean>>(() => ({ ...(store.vehicleAttendance[isoToday()] ?? {}) }));
  const [vehicleAttendanceDirty, setVehicleAttendanceDirty] = useState(false);
  const [advanceSearch, setAdvanceSearch] = useState("");
  const [advanceHistoryEmployeeId, setAdvanceHistoryEmployeeId] = useState<number | null>(null);
  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    fetch("/imported-contacts.json").then((response) => response.json() as Promise<ImportedContact[]>).then((contacts) => {
      if (cancelled) return;
      setStore((current) => {
        const existingIds = new Set(current.clients.map((client) => client.id));
        const existingPhones = new Set(current.clients.flatMap((client) => [client.mobile, client.alternatePhone].filter(Boolean)));
        const existingNames = new Set(current.clients.map((client) => client.firmName.trim().toLowerCase()));
        const imported = contacts.filter((contact) => !existingIds.has(contact.id) && !(contact.mobile ? existingPhones.has(contact.mobile) : existingNames.has(contact.firmName.trim().toLowerCase()))).map((contact) => ({ ...contact, ownerName: "", address: "", dateOfBirth: "" as const, email: "", categories: [] as ClientCategory[], status: "Active" as const }));
        return imported.length ? { ...current, clients: [...current.clients, ...imported] } : current;
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [setStore, storageReady]);
  useEffect(() => { const receivePayment = (event: Event) => setPaymentBill(store.bills.find((bill) => bill.id === (event as CustomEvent<number>).detail) ?? null); window.addEventListener("fleetflow:receive-payment", receivePayment); return () => window.removeEventListener("fleetflow:receive-payment", receivePayment); }, [store.bills]);
  useEffect(() => { const openReportDetail = (event: Event) => setReportDetail((event as CustomEvent<ReportDetailKind>).detail); window.addEventListener("fleetflow:report-detail", openReportDetail); return () => window.removeEventListener("fleetflow:report-detail", openReportDetail); }, []);
  useEffect(() => { const openQuotation = (event: Event) => setQuotationBooking(store.campaignBookings.find((booking) => booking.id === (event as CustomEvent<number>).detail) ?? null); window.addEventListener("fleetflow:campaign-quotation", openQuotation); return () => window.removeEventListener("fleetflow:campaign-quotation", openQuotation); }, [store.campaignBookings]);
  useEffect(() => { const openQuotationComposer = () => setComposeQuotation(true); window.addEventListener("fleetflow:quotation-picker", openQuotationComposer); return () => window.removeEventListener("fleetflow:quotation-picker", openQuotationComposer); }, []);
  useEffect(() => { const selectCampaignMonth = (event: Event) => setCampaignMonth((event as CustomEvent<string>).detail); window.addEventListener("fleetflow:campaign-month", selectCampaignMonth); return () => window.removeEventListener("fleetflow:campaign-month", selectCampaignMonth); }, []);
  useEffect(() => { const sendCurrentCampaignMonth = () => window.dispatchEvent(new CustomEvent<string>("fleetflow:campaign-month-current", { detail: campaignMonth })); window.addEventListener("fleetflow:campaign-month-current-request", sendCurrentCampaignMonth); return () => window.removeEventListener("fleetflow:campaign-month-current-request", sendCurrentCampaignMonth); }, [campaignMonth]);
  useEffect(() => {
    const sendCampaignMonths = () => window.dispatchEvent(new CustomEvent<string[]>("fleetflow:campaign-month-options", { detail: campaignMonthOptions(store.campaignBookings) }));
    window.addEventListener("fleetflow:campaign-month-options-request", sendCampaignMonths);
    queueMicrotask(sendCampaignMonths);
    return () => window.removeEventListener("fleetflow:campaign-month-options-request", sendCampaignMonths);
  }, [store.campaignBookings]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  const commit = (updated: FleetStore, message: string) => { setStore(updated); setDialog(null); notify(message); };
  const setReportProfitCategory = (category: ReportProfitCategory) => { setSelectedReportProfitCategory(category); setReportCategoryDetail(category); };
  const selectAttendanceDate = (date: string) => { if (attendanceDirty && !window.confirm("Discard unsaved attendance changes?")) return; setAttendanceDate(date); setAttendanceDraft({ ...(store.attendance[date] ?? {}) }); setAttendanceDirty(false); };
  const markAllEmployeesPresent = () => { setAttendanceDraft((current) => ({ ...current, ...Object.fromEntries(attendanceEmployees.map((employee) => [employee.id, true])) })); setAttendanceDirty(true); };
  const markAllEmployeesAbsent = () => { setAttendanceDraft((current) => ({ ...current, ...Object.fromEntries(attendanceEmployees.map((employee) => [employee.id, false])) })); setAttendanceDirty(true); };
  const setEmployeeAttendance = (employeeId: number, present: boolean) => { setAttendanceDraft((current) => ({ ...current, [employeeId]: present })); setAttendanceDirty(true); };
  const saveAttendance = () => { setStore((current) => ({ ...current, attendance: { ...current.attendance, [attendanceDate]: attendanceDraft } })); setAttendanceDirty(false); notify(`Attendance saved for ${fmt(attendanceDate)}`); };
  const selectVehicleAttendanceDate = (date: string) => { if (vehicleAttendanceDirty && !window.confirm("Discard unsaved vehicle attendance changes?")) return; setVehicleAttendanceDate(date); setVehicleAttendanceDraft({ ...(store.vehicleAttendance[date] ?? {}) }); setVehicleAttendanceDirty(false); };
  const saveVehicleAttendance = () => { setStore((current) => ({ ...current, vehicleAttendance: { ...current.vehicleAttendance, [vehicleAttendanceDate]: vehicleAttendanceDraft } })); setVehicleAttendanceDirty(false); notify(`Vehicle attendance saved for ${fmt(vehicleAttendanceDate)}`); };
  const remove = (collection: "employees" | "vehicles" | "clients" | "businessExpenses", id: number) => { if (!window.confirm("Delete this record?")) return; setStore((current) => ({ ...current, [collection]: current[collection].filter((item) => item.id !== id) })); };
  const removeBill = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this bill? This will also un-link it from any campaign.")) return;
    setStore((current) => ({
      ...current,
      bills: current.bills.filter((b) => b.id !== id),
      campaignBookings: current.campaignBookings.map((c) =>
        c.generatedBillId === id ? { ...c, generatedBillId: undefined } : c
      ),
    }));
    if (invoice?.id === id) setInvoice(null);
    notify("Bill deleted successfully");
  };
  const go = (next: View) => { setView(next); setMenu(false); setComposeBill(false); };
  const activeEmployees = store.employees.filter((item) => item.status === "Active");
  const activeEmployeeIds = activeEmployees.map((employee) => employee.id);
  const attendanceEmployees = activeEmployees;
  const attendanceRows = attendanceEmployees.map((employee) => ({ employee, rate: rateOnDate(store.employeeRates, employee.id, attendanceDate), present: attendanceDraft[employee.id] }));
  const employeeRows = store.employees.filter((employee) => `${employee.name} ${rateOnDate(store.employeeRates, employee.id, isoToday())?.location}`.toLowerCase().includes(search.toLowerCase())).map((employee) => ({ employee, rate: rateOnDate(store.employeeRates, employee.id, isoToday()) }));
  const employeeRateHistory = [...store.employeeRates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const attendanceVehicles = store.vehicles.filter((vehicle) => vehicle.status !== "Inactive");
  const attendanceVehicleIds = attendanceVehicles.map((vehicle) => vehicle.id);
  const isBookingOngoing = (booking: CampaignBooking) =>
    !booking.stoppedAt &&
    isoToday() >= booking.startDate &&
    isoToday() <= bookingEnd(booking);
  const activeCampaigns = store.campaignBookings.filter(isBookingOngoing);
  const campaignForVehicleOnDate = (vehicleId: number, date: string) =>
    store.campaignBookings
      .flatMap((booking) =>
        booking.vehiclePeriods.map((period) => ({ booking, period })),
      )
      .find(
        ({ booking, period }) =>
          (!booking.stoppedAt || date < booking.stoppedAt) &&
          period.vehicleIds.includes(vehicleId) &&
          period.startDate <= date &&
          period.endDate >= date &&
          booking.startDate <= date &&
          bookingEnd(booking) >= date,
      );
  const normalizedClientSearch = clientSearch.trim().toLowerCase();
  const campaignClientIds = new Set(store.campaignBookings.filter((booking) => clientCampaignFilter === "Ongoing" ? isBookingOngoing(booking) : clientCampaignFilter === "Completed" ? (!isBookingOngoing(booking) && (Boolean(booking.stoppedAt) || isoToday() > bookingEnd(booking))) : false).map((booking) => booking.clientId));
  const matchingClients = store.clients.filter((client) => {
    const matchesSearch = !normalizedClientSearch || `${client.firmName} ${client.mobile} ${client.alternatePhone ?? ""} ${client.categories.join(" ")}`.toLowerCase().includes(normalizedClientSearch);
    const matchesCategory = clientCategoryFilter === "All" || client.categories.includes(clientCategoryFilter);
    if (clientCampaignFilter === "Search") return (Boolean(normalizedClientSearch) || clientCategoryFilter !== "All") && matchesSearch && matchesCategory;
    return campaignClientIds.has(client.id) && matchesSearch && matchesCategory;
  });
  const visibleClients = matchingClients.slice(0, 100);
  const normalizedCampaignSearch = campaignSearch.trim().toLowerCase();
  const selectedCampaignMonthStart = campaignMonth ? `${campaignMonth}-01` : "";
  const selectedCampaignMonthEnd = campaignMonth ? `${campaignMonth}-${new Date(Number(campaignMonth.slice(0, 4)), Number(campaignMonth.slice(5, 7)), 0).getDate()}` : "";
  const matchingCampaignBookings = [...store.campaignBookings].filter((booking) => {
    const matchesClient = `${booking.client.firmName} ${booking.client.ownerName} ${booking.client.mobile}`.toLowerCase().includes(normalizedCampaignSearch);
    const matchesMonth = !campaignMonth || booking.startDate <= selectedCampaignMonthEnd && bookingEnd(booking) >= selectedCampaignMonthStart;
    return matchesClient && matchesMonth;
  }).sort((left, right) => right.startDate.localeCompare(left.startDate));
  const filteredCampaignBookings = campaignMonth ? Array.from(new Map(matchingCampaignBookings.map((booking) => [booking.clientId, booking])).values()).sort((left, right) => left.client.firmName.localeCompare(right.client.firmName)) : matchingCampaignBookings;
  const normalizedLedgerSearch = ledgerSearch.trim().toLowerCase();
  const ledgerClients = store.clients.filter((client) => {
    const hasCampaign = store.campaignBookings.some((booking) => booking.clientId === client.id);
    if (!hasCampaign) return false;
    if (!normalizedLedgerSearch) return true;
    return `${client.firmName} ${client.ownerName} ${client.mobile} ${client.alternatePhone ?? ""}`.toLowerCase().includes(normalizedLedgerSearch);
  });
  const visibleLedgerClients = ledgerClients.slice(0, 100);
  const normalizedBillingSearch = billingSearch.trim().toLowerCase();
  const filteredBills = store.bills.filter((bill) => {
    const status = billBalance(bill) === 0 ? "paid" : bill.status === "Overdue" ? "overdue" : "pending";
    return `${bill.number} INV-${String(bill.number).padStart(4, "0")} ${bill.client.firmName} ${bill.client.ownerName} ${bill.client.mobile} ${status}`.toLowerCase().includes(normalizedBillingSearch);
  });
  const currentWeek = weekFor(isoToday());
  const payrollPreviews = store.employees.map((employee) => calculatePayrollRange(store, employee.id, payrollWeek, payrollPeriodEnd));
  const payrollGrossTotal = payrollPreviews.reduce((sum, preview) => sum + preview.gross, 0);
  const payrollAdvanceRecoveryTotal = payrollPreviews.reduce((sum, preview) => sum + preview.advanceRecovery, 0);
  const payrollOutstandingAdvanceTotal = store.advances.filter((advance) => advance.date <= addDays(payrollPeriodEnd, 1)).reduce((sum, advance) => sum + Math.max(0, advance.amount - advance.recovered), 0);
  const payrollNetTotal = payrollPreviews.reduce((sum, preview) => sum + preview.net, 0);
  const payrollPayoutDate = addDays(payrollPeriodEnd, 1);
  const payrollRemainingAdvanceTotal = Math.max(0, payrollOutstandingAdvanceTotal - payrollAdvanceRecoveryTotal);
  const payrollRows = payrollPreviews.map((preview) => {
    const saved = store.payrollPayments.find(
      (item) => item.employeeId === preview.employeeId &&
        ((item.periodStart === payrollWeek && item.periodEnd === payrollPeriodEnd) || item.periodStart === payrollWeek)
    );
    const paid =
      saved?.status === "Paid"
        ? Math.min(saved.paidAmount ?? preview.net, preview.net)
        : (saved?.paidAmount ?? 0);
    const periodBalance = Math.max(0, preview.net - paid);
    const overallBalance = calculateEmployeeLedger(store, preview.employeeId).remainingBalance;
    return {
      preview,
      employee: store.employees.find((item) => item.id === preview.employeeId),
      saved,
      paid,
      balance: overallBalance,
      periodBalance,
    };
  });
  const payrollPaidTotal = payrollRows.reduce((sum, row) => sum + row.paid, 0);
  const payrollRemainingBalanceTotal = payrollRows.reduce(
    (sum, row) => sum + row.periodBalance,
    0
  );
  const selectPayrollWeek = (date: string) => setPayrollWeek(date);
  const setPayrollRange = (start: string, end: string) => {
    setPayrollWeek(start);
    setPayrollPeriodEnd(end);
  };
  const outstanding = store.bills.reduce((sum, bill) => sum + billBalance(bill), 0) + store.otherBills.reduce((sum, bill) => sum + otherBillBalance(bill), 0);
  const totalBusiness = store.bills.reduce((sum, bill) => sum + bill.total, 0) + store.otherBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalExpenses = store.businessExpenses.reduce((sum, expense) => sum + expense.amount, 0) + store.employeeExpenses.filter((expense) => expense.treatment !== "Employee deduction").reduce((sum, expense) => sum + expense.amount, 0) + store.otherBills.reduce((sum, bill) => sum + otherBillCost(bill), 0);
  const totalSupplierPaid = store.businessExpenses.reduce((sum, expense) => sum + supplierPaid(expense), 0);
  const totalSupplierBalance = store.businessExpenses.reduce((sum, expense) => sum + supplierBalance(expense), 0);
  const totalExpenseProfit = store.businessExpenses.reduce((sum, expense) => sum + expenseProfit(expense), 0);
  const generateCampaignBill = (
    booking: CampaignBooking,
    paymentMode?: PaymentMode,
    options?: {
      billScope: "full" | "monthly" | "custom";
      fromDate: string;
      toDate: string;
      billLabel?: string;
      existingBillId?: number;
    }
  ) => {
    if (!paymentMode) {
      setCampaignBillBooking(booking);
      return;
    }
    const fromDate = options?.fromDate || booking.startDate;
    const toDate =
      options?.toDate ||
      (isoToday() < bookingEnd(booking) ? isoToday() : bookingEnd(booking));

    const existingBill = options?.existingBillId
      ? store.bills.find((b) => b.id === options.existingBillId)
      : findCampaignBillForRange(store, booking, fromDate, toDate);

    if (existingBill) {
      setCampaignBillBooking(null);
      setDraftCampaignBooking(booking);
      setEditingBill(existingBill);
      setBillingClientId(existingBill.clientId);
      setComposeBill(true);
      notify(`Editing existing bill INV-${String(existingBill.number).padStart(4, "0")}`);
      return;
    }

    const vehicleLines: BillVehicleLine[] = booking.vehiclePeriods.flatMap(
      (period, periodIndex) => {
        const effectiveStart =
          period.startDate > fromDate ? period.startDate : fromDate;
        const effectiveEnd = [
          period.endDate,
          bookingEnd(booking),
          toDate,
        ].sort()[0];
        if (effectiveEnd < effectiveStart) return [];
        const bookedDays = inclusiveDays(effectiveStart, effectiveEnd);
        return Array.from({ length: period.quantity }, (_, slotIndex) => {
          const presentDays = campaignSlotPresentDays(
            store,
            booking.id,
            period.id,
            slotIndex,
            effectiveStart,
            effectiveEnd,
            period.vehicleIds[slotIndex],
          );
          const lineLabel = options?.billLabel
            ? `${booking.client.firmName} · ${period.type} ${slotIndex + 1} (${options.billLabel})`
            : `${booking.client.firmName} · ${period.type} ${slotIndex + 1}`;
          return {
            id: periodIndex * 100 + slotIndex + 1,
            vehicleId: -(
              booking.id * 10000 +
              period.id * 100 +
              slotIndex +
              1
            ),
            label: lineLabel,
            quantity: 1,
            startDate: effectiveStart,
            endDate: effectiveEnd,
            bookedDays,
            advertisementDays: presentDays,
            offDays: bookedDays - presentDays,
            dailyRate: period.dailyRate,
            driverNames: [],
          };
        });
      },
    );

    const charges: BillCharge[] = booking.facilities.map((facility) => ({
      ...facility,
      amount: facility.quantity * facility.rate,
    }));

    const matchedClient =
      (booking.client?.firmName
        ? store.clients.find(
            (c) =>
              c.firmName.trim().toLowerCase() ===
              booking.client.firmName.trim().toLowerCase(),
          )
        : undefined) ??
      store.clients.find((c) => c.id === booking.clientId);

    const actualClientId = matchedClient?.id ?? booking.clientId;

    const bill: Bill = {
      id: nextId(store.bills),
      number: nextBillNumber(store.bills, store.nextBillNumber),
      billDate: isoToday(),
      clientId: actualClientId,
      client: matchedClient
        ? {
            firmName: matchedClient.firmName,
            ownerName: matchedClient.ownerName,
            address: matchedClient.address,
            mobile: matchedClient.mobile,
            email: matchedClient.email,
          }
        : booking.client,
      vehicleLines,
      charges,
      advanceReceived: 0,
      paymentMode,
      payments: [],
      total: calculateBillTotal(vehicleLines, charges),
      status: "Pending",
    };
    setCampaignBillBooking(null);
    setDraftCampaignBooking(booking);
    setEditingBill(bill);
    setBillingClientId(actualClientId);
    setComposeBill(true);
  };
  const setPayrollStatus = (preview: (typeof payrollPreviews)[number], status: "Pending" | "Paid", paidAmount?: number) => {
    setStore((current) => {
      const existing = current.payrollPayments.find((payment) => payment.employeeId === preview.employeeId && ((payment.periodStart === preview.periodStart && payment.periodEnd === preview.periodEnd) || payment.periodStart === preview.periodStart));
      const actualPaid = paidAmount !== undefined ? paidAmount : status === "Paid" ? preview.net : (existing?.paidAmount ?? 0);
      const isFullPaid = actualPaid >= preview.net;
      const payment: PayrollPayment = {
        ...preview,
        id: existing?.id ?? nextId(current.payrollPayments),
        status: isFullPaid ? "Paid" : "Pending",
        paidAmount: actualPaid,
        ...(isFullPaid ? { paidAt: existing?.paidAt ?? isoToday() } : {}),
      };
      const payrollPayments = [...current.payrollPayments.filter((item) => item.id !== payment.id && !(item.employeeId === preview.employeeId && item.periodStart === preview.periodStart)), payment];
      const paidRecoveries = new Map(current.employees.map((employee) => [employee.id, payrollPayments.filter((item) => item.employeeId === employee.id && item.status === "Paid").reduce((sum, item) => sum + item.advanceRecovery, 0)]));
      const advances = current.advances.map((advanceItem) => {
        const earlierAmount = current.advances.filter((item) => item.employeeId === advanceItem.employeeId && (item.date < advanceItem.date || (item.date === advanceItem.date && item.id < advanceItem.id))).reduce((sum, item) => sum + item.amount, 0);
        return { ...advanceItem, recovered: Math.min(advanceItem.amount, Math.max(0, (paidRecoveries.get(advanceItem.employeeId) ?? 0) - earlierAmount)) };
      });
      return { ...current, payrollPayments, advances };
    });
    notify(`Salary ${paidAmount !== undefined ? `payment of ${money(paidAmount)} saved` : `marked ${status.toLowerCase()}`}`);
  };
  const exportPayroll = () => {
    const rows = [["Employee", "Period from", "Period to", "Days in Period", "Present days", "Absent days", "Gross Earned", "Extras / Reimb", "Deductions", "Advance Recovery", "Net Salary", "Paid Amount", "Remaining Balance", "Status"], ...payrollRows.map(({ preview, employee, saved, paid, balance }) => [employee?.name ?? "", preview.periodStart, preview.periodEnd, String(preview.totalDays), String(preview.presentDays), String(preview.absentDays), String(preview.gross), String(preview.reimbursements), String(preview.deductions), String(preview.advanceRecovery), String(preview.net), String(paid), String(balance), preview.net === 0 ? "No dues" : balance === 0 && paid > 0 ? "Paid" : paid > 0 ? "Partial" : "Pending"])];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `salary-${payrollWeek}-to-${payrollPeriodEnd}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const releasePayroll = () => {
    const firstPaymentId = nextId(store.payrollPayments);
    const payments: PayrollPayment[] = payrollPreviews.map((preview, index) => {
      const existing = store.payrollPayments.find((item) => item.employeeId === preview.employeeId && item.periodStart === payrollWeek);
      return {
        ...preview,
        id: existing?.id ?? firstPaymentId + index,
        status: "Paid" as const,
        paidAmount: preview.net,
        paidAt: existing?.paidAt ?? isoToday(),
      };
    });
    const updatedPayrollPayments = [...store.payrollPayments.filter((item) => item.periodStart !== payrollWeek), ...payments];
    const paidRecoveries = new Map(
      store.employees.map((employee) => [
        employee.id,
        updatedPayrollPayments
          .filter((item) => item.employeeId === employee.id && (item.status === "Paid" || (item.paidAmount ?? 0) >= item.net))
          .reduce((sum, item) => sum + item.advanceRecovery, 0),
      ])
    );
    setStore((current) => ({
      ...current,
      payrollPayments: updatedPayrollPayments,
      advances: current.advances.map((advanceItem) => {
        const totalRecovery = paidRecoveries.get(advanceItem.employeeId) ?? 0;
        const earlier = current.advances.filter((item) => item.employeeId === advanceItem.employeeId && (item.date < advanceItem.date || (item.date === advanceItem.date && item.id < advanceItem.id))).reduce((sum, item) => sum + item.amount, 0);
        return { ...advanceItem, recovered: Math.min(advanceItem.amount, Math.max(0, totalRecovery - earlier)) };
      }),
    }));
    notify(`All salaries marked paid for period ${fmt(payrollWeek)} – ${fmt(payrollPeriodEnd)}`);
  };
  let reportStart = `${isoToday().slice(0, 7)}-01`;
  let reportEnd = isoToday();

  if (reportPeriod === "Month") {
    const [yStr, mStr] = reportMonth.split("-");
    const yearNum = Number(yStr) || Number(isoToday().slice(0, 4));
    const monthNum = Number(mStr) || Number(isoToday().slice(5, 7));
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    reportStart = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
    reportEnd = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  } else if (reportPeriod === "Quarter") {
    const qStartMonth = (reportQuarter - 1) * 3 + 1;
    const qEndMonth = reportQuarter * 3;
    const lastDay = new Date(reportQuarterYear, qEndMonth, 0).getDate();
    reportStart = `${reportQuarterYear}-${String(qStartMonth).padStart(2, "0")}-01`;
    reportEnd = `${reportQuarterYear}-${String(qEndMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  } else if (reportPeriod === "Year") {
    reportStart = `${reportYear}-01-01`;
    reportEnd = `${reportYear}-12-31`;
  } else if (reportPeriod === "Date range") {
    reportStart = reportFrom <= reportTo ? reportFrom : reportTo;
    reportEnd = reportFrom <= reportTo ? reportTo : reportFrom;
  }

  const isBillInPeriod = (bill: Bill) => {
    if (bill.billDate >= reportStart && bill.billDate <= reportEnd) return true;
    if (bill.vehicleLines && bill.vehicleLines.length > 0) {
      if (bill.vehicleLines.some((line) => line.startDate <= reportEnd && line.endDate >= reportStart)) {
        return true;
      }
    }
    return false;
  };

  const reportBills = store.bills.filter(isBillInPeriod);
  const reportOtherBills = store.otherBills.filter((bill) => bill.billDate >= reportStart && bill.billDate <= reportEnd);
  const reportOtherBillExpenses: FleetStore["businessExpenses"] = reportOtherBills.map((bill) => ({
    id: -bill.id,
    date: bill.billDate,
    category: bill.category === "Other" ? "Miscellaneous" : bill.category,
    description: bill.items.map((item) => item.description).filter(Boolean).join(", ") || `${bill.category} bill`,
    purpose: `${bill.category} bill #${String(bill.number).padStart(4, "0")}`,
    paidTo: "Paper / calendar supplier",
    reference: "",
    amount: otherBillCost(bill),
    clientId: bill.clientId,
    clientName: bill.client.firmName,
    clientBillingAmount: bill.total,
    paidAmount: otherBillCost(bill),
  }));

  const reportExpenses = [
    ...store.businessExpenses.filter((expense) => expense.date >= reportStart && expense.date <= reportEnd),
    ...reportOtherBillExpenses,
  ];
  const reportEmployeeExpenses = store.employeeExpenses.filter(
    (expense) => expense.date >= reportStart && expense.date <= reportEnd && expense.treatment !== "Employee deduction",
  );
  const reportPayroll = store.payrollPayments.filter(
    (payment) => payment.status === "Paid" && payment.paidAt && payment.paidAt >= reportStart && payment.paidAt <= reportEnd,
  );

  const reportRevenue = reportBills.reduce((sum, item) => sum + item.total, 0) + reportOtherBills.reduce((sum, item) => sum + item.total, 0);
  const reportOutstanding = reportBills.reduce((sum, bill) => sum + billBalance(bill), 0) + reportOtherBills.reduce((sum, bill) => sum + otherBillBalance(bill), 0);
  const reportTotalExpenses = reportExpenses.reduce((sum, item) => sum + item.amount, 0) + reportEmployeeExpenses.reduce((sum, item) => sum + item.amount, 0) + reportPayroll.reduce((sum, item) => sum + item.net, 0);

  const reportSalaryExpenses: FleetStore["businessExpenses"] = reportPayroll.map((payment) => ({
    id: payment.id,
    date: payment.paidAt ?? payment.payoutDate,
    category: "Self stay",
    description: store.employees.find((employee) => employee.id === payment.employeeId)?.name ?? "Employee salary",
    purpose: `${fmt(payment.periodStart)} to ${fmt(payment.periodEnd)}`,
    paidTo: "Employee salary",
    reference: "",
    amount: payment.net,
    clientBillingAmount: 0,
    paidAmount: payment.net,
  }));

  const getCategoryClientBilling = (cat: ReportProfitCategory) => {
    if (cat === "All") {
      return reportRevenue;
    }
    if (cat === "Printing") {
      const billCharges = reportBills.reduce((sum, b) => sum + b.charges.filter((c) => c.category === "Banner / printing").reduce((s, c) => s + c.amount, 0), 0);
      const expenseBilling = reportExpenses.filter((e) => e.category === "Printing").reduce((sum, e) => sum + expenseClientBilling(e), 0);
      return billCharges + expenseBilling;
    }
    if (cat === "Pasting") {
      const billCharges = reportBills.reduce((sum, b) => sum + b.charges.filter((c) => c.category === "Pasting").reduce((s, c) => s + c.amount, 0), 0);
      const expenseBilling = reportExpenses.filter((e) => e.category === "Pasting").reduce((sum, e) => sum + expenseClientBilling(e), 0);
      return billCharges + expenseBilling;
    }
    if (cat === "Recording") {
      const billCharges = reportBills.reduce((sum, b) => sum + b.charges.filter((c) => c.category === "Recording").reduce((s, c) => s + c.amount, 0), 0);
      const expenseBilling = reportExpenses.filter((e) => e.category === "Recording").reduce((sum, e) => sum + expenseClientBilling(e), 0);
      return billCharges + expenseBilling;
    }
    if (cat === "Paper") {
      return reportOtherBills.filter((b) => b.category === "Paper").reduce((sum, b) => sum + b.total, 0);
    }
    if (cat === "Calendar") {
      return reportOtherBills.filter((b) => b.category === "Calendar").reduce((sum, b) => sum + b.total, 0);
    }
    if (cat === "Self travel" || cat === "Self stay") {
      return 0;
    }
    return reportExpenses.filter((e) => e.category === cat).reduce((sum, e) => sum + expenseClientBilling(e), 0);
  };

  const getCategorySupplierCost = (cat: ReportProfitCategory) => {
    if (cat === "All") {
      return reportTotalExpenses;
    }
    if (cat === "Self stay") {
      return reportPayroll.reduce((sum, item) => sum + item.net, 0);
    }
    if (cat === "Paper") {
      return reportOtherBills.filter((b) => b.category === "Paper").reduce((sum, b) => sum + otherBillCost(b), 0) + reportExpenses.filter((e) => e.category === "Paper").reduce((sum, e) => sum + e.amount, 0);
    }
    if (cat === "Calendar") {
      return reportOtherBills.filter((b) => b.category === "Calendar").reduce((sum, b) => sum + otherBillCost(b), 0) + reportExpenses.filter((e) => e.category === "Calendar").reduce((sum, e) => sum + e.amount, 0);
    }
    return reportExpenses.filter((e) => matchesReportCategory(e, cat)).reduce((sum, e) => sum + e.amount, 0);
  };

  const reportCategoryClientBilling = getCategoryClientBilling(reportProfitCategory);
  const reportCategorySupplierCost = getCategorySupplierCost(reportProfitCategory);
  const reportCategoryProfit = reportCategoryClientBilling - reportCategorySupplierCost;

  const reportCategoryExpenses = reportProfitCategory === "Self stay"
    ? reportSalaryExpenses
    : reportExpenses.filter((expense) => matchesReportCategory(expense, reportProfitCategory));

  const reportCategoryRecordCount = reportProfitCategory === "All"
    ? reportBills.length + reportOtherBills.length + reportExpenses.length + reportPayroll.length
    : reportCategoryExpenses.length;

  const reportProfitBreakdown = reportProfitCategories.map((category) => {
    const billing = getCategoryClientBilling(category.value);
    const cost = getCategorySupplierCost(category.value);
    const profit = billing - cost;
    const records = category.value === "Self stay"
      ? reportSalaryExpenses
      : reportExpenses.filter((expense) => matchesReportCategory(expense, category.value));
    return { ...category, records, profit };
  });

  const reportClientChart = store.clients.map((client) => ({
    label: client.firmName,
    value: reportBills.filter((bill) => bill.clientId === client.id).reduce((sum, bill) => sum + bill.total, 0) + reportOtherBills.filter((bill) => bill.clientId === client.id).reduce((sum, bill) => sum + bill.total, 0),
  })).filter((item) => item.value > 0);

  const graphTotalDays = inclusiveDays(reportStart, reportEnd);
  const graphBucketCount = reportPeriod === "Month" ? 4 : reportPeriod === "Quarter" ? 6 : reportPeriod === "Year" ? 12 : graphTotalDays <= 31 ? Math.min(7, graphTotalDays) : graphTotalDays <= 120 ? 8 : 12;
  const reportTrend = Array.from({ length: graphBucketCount }, (_, index) => {
    const start = addDays(reportStart, Math.floor(index * graphTotalDays / graphBucketCount));
    const end = index === graphBucketCount - 1 ? reportEnd : addDays(reportStart, Math.floor((index + 1) * graphTotalDays / graphBucketCount) - 1);
    const revenue = reportBills.filter((item) => (item.billDate >= start && item.billDate <= end) || item.vehicleLines?.some((l) => l.startDate <= end && l.endDate >= start)).reduce((sum, item) => sum + item.total, 0) + reportOtherBills.filter((item) => item.billDate >= start && item.billDate <= end).reduce((sum, item) => sum + item.total, 0);
    const expenses = reportExpenses.filter((item) => item.date >= start && item.date <= end).reduce((sum, item) => sum + item.amount, 0) + reportEmployeeExpenses.filter((item) => item.date >= start && item.date <= end).reduce((sum, item) => sum + item.amount, 0) + reportPayroll.filter((item) => item.paidAt && item.paidAt >= start && item.paidAt <= end).reduce((sum, item) => sum + item.net, 0);
    return { label: reportPeriod === "Year" ? new Date(`${start}T00:00:00`).toLocaleDateString("en-IN", { month: "short" }) : `${fmt(start).split(" ")[0]} ${fmt(start).split(" ")[1]}`, revenue, expenses };
  });

  const pendingPayrollCount = store.payrollPayments.filter((payment) => payment.status === "Pending").length;

  if (composeBill) return <BillingComposer store={store} initialClientId={billingClientId} bill={editingBill} campaignBooking={draftCampaignBooking} cancel={() => { setComposeBill(false); setEditingBill(null); setDraftCampaignBooking(null); }} save={(bill) => { const isExisting = store.bills.some((item) => item.id === bill.id); setStore((current) => ({ ...current, bills: isExisting ? current.bills.map((item) => item.id === bill.id ? bill : item) : [...current.bills, bill], nextBillNumber: isExisting ? current.nextBillNumber : bill.number + 1, campaignBookings: draftCampaignBooking ? current.campaignBookings.map((item) => item.id === draftCampaignBooking.id ? { ...item, generatedBillId: bill.id } : item) : current.campaignBookings })); setComposeBill(false); setEditingBill(null); setDraftCampaignBooking(null); setInvoice(bill); notify("Bill saved and receipt ready"); }}/>;
  if (composeQuotation) return <QuotationComposer store={store} cancel={() => setComposeQuotation(false)} preview={(quotation) => { setComposeQuotation(false); setQuotationDraft(quotation); }}/>;
  if (quotationDraft) return <Invoice bill={quotationDraft} store={store} quotation close={() => setQuotationDraft(null)}/>;
  if (campaignBillBooking) return <CampaignBillModeModal booking={campaignBillBooking} store={store} close={() => setCampaignBillBooking(null)} generate={(paymentMode, options) => generateCampaignBill(campaignBillBooking, paymentMode, options)} viewBill={(bill) => { setCampaignBillBooking(null); setInvoice(bill); }} onEditExisting={(bill) => { setCampaignBillBooking(null); setDraftCampaignBooking(campaignBillBooking); setEditingBill(bill); setBillingClientId(bill.clientId); setComposeBill(true); notify(`Editing existing bill INV-${String(bill.number).padStart(4, "0")}`); }}/>;
  if (quotationBooking) return <CampaignQuotation booking={quotationBooking} store={store} close={() => setQuotationBooking(null)}/>;
  if (employeeRecordId) return <EmployeeRecordModal store={store} employeeId={employeeRecordId} close={() => setEmployeeRecordId(null)}/>;
  if (advanceHistoryEmployeeId) return <EmployeeAdvanceHistoryModal store={store} employeeId={advanceHistoryEmployeeId} close={() => setAdvanceHistoryEmployeeId(null)}/>;

  const recordViewShell = (content: React.ReactNode) => <OperationsShell menu={menu} setMenu={setMenu} openNavSections={openNavSections} setOpenNavSections={setOpenNavSections} view={view} go={go} pendingPayrollCount={pendingPayrollCount} dialogContent={dialog && <EntryForm dialog={dialog} store={store} employeeId={editingEmployeeId} clientId={editingClientId} vehicleId={editingVehicleId} close={() => setDialog(null)} commit={commit}/>}>{content}</OperationsShell>;
  if (view === "otherBilling") return recordViewShell(<OtherBillsView store={store} setStore={setStore} notify={notify}/>);
  if (view === "otherBillLedgers") return recordViewShell(<OtherBillLedgersView store={store}/>);
  if (view === "maintenanceLedger") return recordViewShell(<MaintenanceManager store={store} setStore={setStore} notify={notify} remove={remove}/>);
  if (view === "supplierProfiles") return recordViewShell(<SupplierCardsView store={store} setStore={setStore} notify={notify} remove={remove}/>);
  if (view === "selfExpenses") return recordViewShell(<EditableSelfExpensesView store={store} setStore={setStore} notify={notify}/>);
  if (view === "maintenance") {
    const categories: { value: BusinessExpenseCategory; label: string; icon: typeof Wrench }[] = [{ value: "Printing", label: "Banner printing", icon: Printer }, { value: "Pasting", label: "Pasting", icon: FileText }, { value: "Recording", label: "Recording", icon: ReceiptText }, { value: "Purchase", label: "Purchase", icon: WalletCards }, { value: "Labour charges", label: "Labour charges", icon: UsersRound }];
    const categoryValues = new Set<BusinessExpenseCategory>(categories.map((category) => category.value));
    const records = store.businessExpenses.filter((expense) => categoryValues.has(expense.category)).sort((left, right) => right.date.localeCompare(left.date));
    const supplierTotal = records.reduce((sum, expense) => sum + expense.amount, 0), paidTotal = records.reduce((sum, expense) => sum + supplierPaid(expense), 0), balanceTotal = records.reduce((sum, expense) => sum + supplierBalance(expense), 0);
    return recordViewShell(<><PageHead title="Maintenance payments & ledger" detail="Categorise work and keep every supplier, purchase, and labour payment" action="Add maintenance work" onAction={() => setMaintenanceEntryCategory("Printing")}/><section className="op-account-grid">{categories.map((category) => { const Icon = category.icon, total = records.filter((expense) => expense.category === category.value).reduce((sum, expense) => sum + expense.amount, 0); return <article key={category.value}><Icon/><span>{category.label}</span><strong>{money(total)}</strong></article>; })}</section><section className="op-metrics three"><Metric label="Total bills" value={money(supplierTotal)} detail={`${records.length} maintenance records`} icon={ReceiptText}/><Metric label="Total paid" value={money(paidTotal)} detail="Opening and installment payments" icon={Check}/><Metric label="Outstanding" value={money(balanceTotal)} detail="Remaining maintenance balance" icon={WalletCards}/></section><section className="op-account-ledger"><div className="op-section-title"><div><h2>Maintenance payment ledger</h2><p>Each work record keeps its complete payment history.</p></div></div>{records.length ? records.map((expense) => <article className="op-account-entry" key={expense.id}><header><div><b>{expense.description}</b><span>{expense.category === "Printing" ? "Banner printing" : expense.category} · {expense.clientName || "Internal work"} · {fmt(expense.date)}</span></div><div><b>{money(expense.amount)} bill</b><strong>{money(supplierBalance(expense))} balance</strong></div></header><p>{expense.paidTo || "Supplier not specified"}{expense.reference ? ` · ${expense.reference}` : ""}</p><div className="op-installment-list">{expense.paidAmount && expense.paidAmount > 0 ? <span><b>{fmt(expense.paidDate ?? expense.date)}</b>Opening payment<strong>{money(expense.paidAmount)}</strong><button className="op-icon" title="Print receipt" style={{ marginLeft: "8px" }} onClick={() => setReceiptModal({ paidTo: expense.paidTo || "Supplier", description: expense.description, category: expense.category, payment: { date: expense.paidDate ?? expense.date, amount: expense.paidAmount!, mode: "Cash" } })}><Printer size={14}/></button></span> : null}{(expense.payments ?? []).map((payment) => <span key={payment.id}><b>{fmt(payment.date)}</b>{payment.mode ? `${payment.mode} · ` : ""}{payment.reference || payment.note || "Installment"}<strong>{money(payment.amount)}</strong><button className="op-icon" title="Print receipt" style={{ marginLeft: "8px" }} onClick={() => setReceiptModal({ paidTo: expense.paidTo || "Supplier", description: expense.description, category: expense.category, payment })}><Printer size={14}/></button></span>)}</div><footer className="op-maintenance-actions">{supplierBalance(expense) > 0 && <Button secondary onClick={() => setMaintenancePaymentExpense(expense)}><Banknote size={16}/>Add payment</Button>}<button className="op-icon" title="Delete record" onClick={() => remove("businessExpenses", expense.id)}><Trash2 size={16}/></button></footer></article>) : <div className="op-empty-state"><Wrench/><h2>No maintenance records</h2><p>Add work and choose one of the five maintenance categories to start the ledger.</p></div>}</section>{maintenanceEntryCategory && <MaintenanceEntryForm store={store} close={() => setMaintenanceEntryCategory(undefined)} save={(expense) => { setStore((current) => ({ ...current, businessExpenses: [...current.businessExpenses, expense] })); setMaintenanceEntryCategory(undefined); notify("Maintenance record saved"); }}/>} {maintenancePaymentExpense && <SupplierPaymentModal expense={maintenancePaymentExpense} close={() => setMaintenancePaymentExpense(null)} save={(date, paidAmount, mode, reference, note) => { setStore((current) => ({ ...current, businessExpenses: current.businessExpenses.map((expense) => expense.id === maintenancePaymentExpense.id ? { ...expense, payments: [...(expense.payments ?? []), { id: nextId(expense.payments ?? []), date, amount: paidAmount, mode, reference, note }] } : expense) })); setMaintenancePaymentExpense(null); notify("Maintenance payment recorded"); }}/>} {receiptModal && <MaintenancePaymentReceiptModal store={store} paidTo={receiptModal.paidTo} description={receiptModal.description} category={receiptModal.category} payment={receiptModal.payment} close={() => setReceiptModal(null)} opacity-100/>}</>);
  }
  const maintenanceSections: { view: View; label: string; category: BusinessExpenseCategory; icon: typeof Wrench }[] = [
    { view: "bannerPrinting", label: "Banner printing", category: "Printing", icon: Printer },
    { view: "pasting", label: "Pasting", category: "Pasting", icon: FileText },
    { view: "recording", label: "Recording", category: "Recording", icon: ReceiptText },
    { view: "purchase", label: "Purchase", category: "Purchase", icon: WalletCards },
    { view: "labourCharges", label: "Labour charges", category: "Labour charges", icon: UsersRound },
  ];
  const selectedMaintenance = maintenanceSections.find((section) => section.view === view);
  if (view === "maintenanceProfile" || selectedMaintenance) {
    const records = selectedMaintenance ? store.businessExpenses.filter((expense) => expense.category === selectedMaintenance.category) : store.businessExpenses.filter((expense) => maintenanceSections.some((section) => section.category === expense.category) || expense.category === "Maintenance");
    const title = selectedMaintenance?.label ?? "Maintenance profile";
    const entryCategory = selectedMaintenance?.category ?? "Maintenance";
    const supplierTotal = records.reduce((sum, expense) => sum + expense.amount, 0);
    const paidTotal = records.reduce((sum, expense) => sum + supplierPaid(expense), 0);
    const balanceTotal = records.reduce((sum, expense) => sum + supplierBalance(expense), 0);
    return recordViewShell(<><PageHead title={title} detail={selectedMaintenance ? `Maintain ${selectedMaintenance.label.toLowerCase()} work, supplier payments, and balances` : "Summary of printing, pasting, recording, purchases, and labour charges"} action={`Add ${selectedMaintenance?.label.toLowerCase() ?? "maintenance"}`} onAction={() => setMaintenanceEntryCategory(entryCategory)}/>{view === "maintenanceProfile" && <section className="op-account-grid">{maintenanceSections.map((section) => { const Icon = section.icon; const total = store.businessExpenses.filter((expense) => expense.category === section.category).reduce((sum, expense) => sum + expense.amount, 0); return <article key={section.category}><Icon/><span>{section.label}</span><strong>{money(total)}</strong></article>; })}</section>}<section className="op-metrics three"><Metric label="Supplier bills" value={money(supplierTotal)} detail={`${records.length} records`} icon={ReceiptText}/><Metric label="Paid" value={money(paidTotal)} detail="Payments recorded" icon={Check}/><Metric label="Balance" value={money(balanceTotal)} detail="Still payable" icon={WalletCards}/></section>{records.length ? <Table headers={["Date", "Client / party", "Work / item", "Supplier / worker", "Quantity", "Bill", "Paid", "Balance", ""]}>{[...records].sort((left, right) => right.date.localeCompare(left.date)).map((expense) => <Row key={expense.id}><span>{fmt(expense.date)}</span><span>{expense.clientName || "Internal work"}</span><b>{expense.description}<small>{expense.purpose}</small></b><span>{expense.paidTo || "Not specified"}<small>{expense.reference}</small></span><span>{expense.quantity ? `${expense.quantity} ${expense.unit || "units"}` : "—"}</span><strong>{money(expense.amount)}</strong><span>{money(supplierPaid(expense))}</span><strong>{money(supplierBalance(expense))}</strong><Actions remove={() => remove("businessExpenses", expense.id)}/></Row>)}</Table> : <div className="op-empty-state"><Wrench/><h2>No {title.toLowerCase()} records</h2><p>Add the first record to maintain supplier, worker, payment, and balance details.</p></div>}{maintenanceEntryCategory && <MaintenanceEntryForm category={maintenanceEntryCategory} store={store} close={() => setMaintenanceEntryCategory(undefined)} save={(expense) => { setStore((current) => ({ ...current, businessExpenses: [...current.businessExpenses, expense] })); setMaintenanceEntryCategory(undefined); notify("Maintenance record saved"); }}/>}</>);
  }
  if (view === "employeeExpenses") {
    const expenseTotal = store.employeeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const reimbursementTotal = store.employeeExpenses.filter((expense) => expense.treatment === "Employee reimbursement").reduce((sum, expense) => sum + expense.amount, 0);
    const deductionTotal = store.employeeExpenses.filter((expense) => expense.treatment === "Employee deduction").reduce((sum, expense) => sum + expense.amount, 0);
    return recordViewShell(<><PageHead title="Employee expenses" detail="Maintain reimbursements, deductions, and company-paid employee costs" action="Add expense" onAction={() => setDialog("employeeExpense")}/><section className="op-metrics three"><Metric label="Total recorded" value={money(expenseTotal)} detail={`${store.employeeExpenses.length} expense records`} icon={ReceiptText}/><Metric label="To reimburse" value={money(reimbursementTotal)} detail="Added to employee salary" icon={WalletCards}/><Metric label="Salary deductions" value={money(deductionTotal)} detail="Deducted from employee salary" icon={Banknote}/></section>{store.employeeExpenses.length ? <Table headers={["Date", "Employee", "Category", "Details", "Salary treatment", "Amount", ""]}>{[...store.employeeExpenses].sort((left, right) => right.date.localeCompare(left.date)).map((expense) => <Row key={expense.id}><span>{fmt(expense.date)}</span><b>{store.employees.find((employee) => employee.id === expense.employeeId)?.name ?? expense.employeeName ?? "Unassigned employee"}</b><span>{expense.category}</span><span>{expense.description}</span><Status>{expense.treatment}</Status><strong>{money(expense.amount)}</strong><Actions remove={() => { if (!window.confirm("Delete this employee expense?")) return; setStore((current) => ({ ...current, employeeExpenses: current.employeeExpenses.filter((item) => item.id !== expense.id) })); }}/></Row>)}</Table> : <div className="op-empty-state"><ReceiptText/><h2>No employee expenses</h2><p>Add an expense to include it in salary calculations and retain its history.</p></div>}</>);
  }
  if (view === "employeeAdvances") {
    const allAdvancesWithRecoveries = getEmployeeAdvancesWithRecoveries(store);
    const advanceTotal = allAdvancesWithRecoveries.reduce((sum, advance) => sum + advance.amount, 0);
    const recoveredTotal = allAdvancesWithRecoveries.reduce((sum, advance) => sum + advance.recovered, 0);
    const advanceBalance = Math.max(0, advanceTotal - recoveredTotal);
    const normalizedAdvanceSearch = advanceSearch.trim().toLowerCase();
    const filteredAdvances = allAdvancesWithRecoveries.filter((advance) => {
      const empName = (store.employees.find((e) => e.id === advance.employeeId)?.name ?? advance.employeeName ?? "").toLowerCase();
      const note = (advance.note || "").toLowerCase();
      const date = fmt(advance.date).toLowerCase();
      const amountStr = String(advance.amount);
      return (
        !normalizedAdvanceSearch ||
        empName.includes(normalizedAdvanceSearch) ||
        note.includes(normalizedAdvanceSearch) ||
        date.includes(normalizedAdvanceSearch) ||
        amountStr.includes(normalizedAdvanceSearch)
      );
    });

    return recordViewShell(
      <>
        <PageHead
          title="Employee advances"
          detail="Track issued advances and automatic salary recovery"
          action="Add advance"
          onAction={() => setDialog("advance")}
        />
        <section className="op-metrics">
          <Metric label="Advances issued" value={money(advanceTotal)} detail={`${store.advances.length} advance records`} icon={Banknote} />
          <Metric label="Recovered" value={money(recoveredTotal)} detail="Recovered through paid salary" icon={Check} />
          <Metric label="Scheduled recovery" value={money(payrollAdvanceRecoveryTotal)} detail={`Salary payout ${fmt(addDays(payrollWeek, 7))}`} icon={CircleDollarSign} />
          <Metric label="Outstanding" value={money(advanceBalance)} detail="Remaining employee balance" icon={WalletCards} />
        </section>

        <div className="op-toolbar" style={{ marginBottom: 14 }}>
          <label className="op-search" style={{ minWidth: 260, maxWidth: 420 }}>
            <Search size={16} />
            <input
              placeholder="Search advances by employee, reason, date..."
              value={advanceSearch}
              onChange={(e) => setAdvanceSearch(e.target.value)}
            />
          </label>
        </div>

        {filteredAdvances.length ? (
          <Table headers={["Date", "Employee", "Reason", "Advance", "Recovered", "Balance", ""]}>
            {[...filteredAdvances]
              .sort((left, right) => right.date.localeCompare(left.date))
              .map((advance) => {
                const emp = store.employees.find((employee) => employee.id === advance.employeeId);
                const empName = emp?.name ?? advance.employeeName ?? "Unassigned employee";
                return (
                  <Row key={advance.id}>
                    <span>{fmt(advance.date)}</span>
                    <div>
                      {advance.employeeId ? (
                        <button
                          type="button"
                          className="op-name-button"
                          onClick={() => setAdvanceHistoryEmployeeId(advance.employeeId)}
                          title={`Click to view advance history for ${empName}`}
                        >
                          {empName}
                        </button>
                      ) : (
                        <b>{empName}</b>
                      )}
                    </div>
                    <span>{advance.note || "Employee advance"}</span>
                    <strong>{money(advance.amount)}</strong>
                    <span style={{ color: advance.recovered > 0 ? "#15803d" : "inherit" }}>
                      {money(advance.recovered)}
                    </span>
                    <strong style={{ color: advance.amount - advance.recovered > 0 ? "#b45309" : "#15803d" }}>
                      {money(Math.max(0, advance.amount - advance.recovered))}
                    </strong>
                    <Actions
                      remove={() => {
                        if (!window.confirm("Delete this employee advance?")) return;
                        setStore((current) => ({
                          ...current,
                          advances: current.advances.filter((item) => item.id !== advance.id),
                        }));
                      }}
                    />
                  </Row>
                );
              })}
          </Table>
        ) : (
          <div className="op-empty-state">
            <Banknote />
            <h2>{normalizedAdvanceSearch ? "No matching advances found" : "No employee advances"}</h2>
            <p>
              {normalizedAdvanceSearch
                ? "Try searching for another employee name or keyword."
                : "Add an advance to track its balance and recover it through salary."}
            </p>
          </div>
        )}
      </>
    );
  }
  if (String(view) === "vehicles") return recordViewShell(<CampaignAttendanceView store={store} setStore={setStore} notify={notify}/>);
  if (view === "vehicleAttendance") return recordViewShell(<>
    <PageHead title="Vehicle attendance" detail="Mark vehicle attendance separately for the selected date"/>
    <div className="op-attendance-layout">
      <AttendanceCalendar key={`vehicle-only-${vehicleAttendanceDate.slice(0, 7)}`} selected={vehicleAttendanceDate} attendance={store.vehicleAttendance} employeeIds={attendanceVehicleIds} onSelect={selectVehicleAttendanceDate}/>
      <section className="op-attendance-sheet">
        <div className="op-toolbar">
          <label className="op-field"><span>Attendance date</span><input type="date" value={vehicleAttendanceDate} onChange={(event) => selectVehicleAttendanceDate(event.target.value)}/></label>
          <Button secondary onClick={() => { setVehicleAttendanceDraft((current) => ({ ...current, ...Object.fromEntries(attendanceVehicles.map((vehicle) => [vehicle.id, true])) })); setVehicleAttendanceDirty(true); }}>Mark all present</Button>
          <span className="op-attendance-save-top"><Button onClick={saveVehicleAttendance}><Check size={17}/>Save attendance</Button></span>
        </div>
        {vehicleAttendanceDirty && <p className="op-unsaved">Unsaved changes</p>}
        {attendanceVehicles.length ? <Table headers={["Vehicle", "Campaign on this date", "Present", "Absent"]}>{attendanceVehicles.map((vehicle) => { const campaign = campaignForVehicleOnDate(vehicle.id, vehicleAttendanceDate), present = vehicleAttendanceDraft[vehicle.id]; return <Row key={vehicle.id}><b>{vehicle.number}<small>{vehicle.type}</small></b><span>{campaign?.booking.client.firmName ?? "No campaign"}{campaign && <small>{fmt(campaign.period.startDate)} to {fmt(campaign.period.endDate)}</small>}</span><button className={`op-attendance ${present ? "active" : ""}`} onClick={() => { setVehicleAttendanceDraft((current) => ({ ...current, [vehicle.id]: true })); setVehicleAttendanceDirty(true); }}><Check/>Present</button><button className={`op-attendance ${present === false ? "absent" : ""}`} onClick={() => { setVehicleAttendanceDraft((current) => ({ ...current, [vehicle.id]: false })); setVehicleAttendanceDirty(true); }}><X/>Absent</button></Row>; })}</Table> : <div className="op-empty-state"><Truck/><h2>No active vehicles</h2><p>Add a vehicle before recording vehicle attendance.</p></div>}
        <div className="op-attendance-save-bottom"><Button onClick={saveVehicleAttendance}><Check size={17}/>Save attendance</Button></div>
      </section>
    </div>
  </>);


  const finalDialogContent = <>
    {dialog && <EntryForm dialog={dialog} store={store} employeeId={editingEmployeeId} clientId={editingClientId} vehicleId={editingVehicleId} close={() => { setDialog(null); setEditingEmployeeId(null); setEditingClientId(null); setEditingVehicleId(null); }} commit={(updated, message) => { setEditingEmployeeId(null); setEditingClientId(null); setEditingVehicleId(null); commit(updated, message); }}/>} {campaignFormOpen && <CampaignBookingForm store={store} booking={editingCampaign} close={() => { setCampaignFormOpen(false); setEditingCampaign(null); }} save={(booking) => { setStore((current) => ({ ...current, campaignBookings: editingCampaign ? current.campaignBookings.map((item) => item.id === booking.id ? booking : item) : [...current.campaignBookings, booking] })); setCampaignFormOpen(false); setEditingCampaign(null); notify("Campaign booking saved"); }}/>} {paymentBill && <BillPaymentModal bill={paymentBill} close={() => setPaymentBill(null)} save={(date, receivedAmount, mode, reference, note) => { setStore((current) => ({ ...current, bills: current.bills.map((bill) => { if (bill.id !== paymentBill.id) return bill; const payments = [...(bill.payments ?? []), { id: nextId(bill.payments ?? []), date, amount: receivedAmount, mode, reference, note }]; return { ...bill, payments, status: bill.advanceReceived + payments.reduce((sum, payment) => sum + payment.amount, 0) >= bill.total ? "Paid" : "Pending" }; }) })); setPaymentBill(null); notify(`${mode} installment recorded`); }}/>} {consolidateOpen && <ConsolidateBillsModal store={store} close={() => setConsolidateOpen(false)} preview={(bills) => { setConsolidateOpen(false); setConsolidatedBills(bills); }}/>} {invoice && <Invoice bill={invoice} store={store} close={() => setInvoice(null)} edit={() => { setEditingBill(invoice); setBillingClientId(invoice.clientId); setInvoice(null); setComposeBill(true); }} remove={() => removeBill(invoice.id)} generateReceipt={() => { setReceipt(invoice); setInvoice(null); }}/>} {receipt && <BillReceipt bill={receipt} store={store} close={() => setReceipt(null)}/>} {consolidatedBills.length > 0 && <ConsolidatedInvoice bills={consolidatedBills.map((selected) => store.bills.find((bill) => bill.id === selected.id) ?? selected)} store={store} close={() => setConsolidatedBills([])}/>} {toast && <div className="op-toast"><Check/>{toast}</div>}
  </>;
  return <OperationsShell menu={menu} setMenu={setMenu} openNavSections={openNavSections} setOpenNavSections={setOpenNavSections} view={view} go={go} pendingPayrollCount={pendingPayrollCount} dialogContent={finalDialogContent}>
    {view === "overview" && <OverviewView store={store} totalBusiness={totalBusiness} outstanding={outstanding} totalExpenses={totalExpenses} activeEmployees={activeEmployees} currentWeek={currentWeek} activeCampaigns={activeCampaigns}/>}
    {view === "attendance" && <AttendanceView store={store} attendanceDate={attendanceDate} attendanceDirty={attendanceDirty} attendanceRows={attendanceRows} allEmployees={store.employees} activeEmployeeIds={activeEmployeeIds} selectAttendanceDate={selectAttendanceDate} markAllPresent={markAllEmployeesPresent} markAllAbsent={markAllEmployeesAbsent} setEmployeeAttendance={setEmployeeAttendance} saveAttendance={saveAttendance} attendanceReportFrom={attendanceReportFrom} attendanceReportTo={attendanceReportTo} setAttendanceReportFrom={setAttendanceReportFrom} setAttendanceReportTo={setAttendanceReportTo}/>}
    {view === "employees" && <EmployeesView store={store} search={search} employeeRows={employeeRows} employeeRateHistory={employeeRateHistory} setSearch={setSearch} addEmployee={() => { setEditingEmployeeId(null); setDialog("employee"); }} addRate={() => setDialog("rate")} openEmployeeRecord={setEmployeeRecordId} editEmployee={(employeeId) => { setEditingEmployeeId(employeeId); setDialog("employee"); }} removeEmployee={(employeeId) => remove("employees", employeeId)}/>}
    {view === "vehicles" && <><PageHead title="Vehicles" detail="Vehicle attendance is independent and drives campaign billing" action="Add vehicle" onAction={() => { setEditingVehicleId(null); setDialog("vehicle"); }}/><Table headers={["Vehicle", "Type", "Current campaign", "Today", "Vehicle status", ""]}>{store.vehicles.map((vehicle) => { const campaign = campaignForVehicleOnDate(vehicle.id, isoToday()); return <Row key={vehicle.id}><b>{vehicle.number}</b><span>{vehicle.type}</span><span>{campaign?.booking.client.firmName ?? "No campaign"}{campaign && <small>{fmt(campaign.period.startDate)} to {fmt(campaign.period.endDate)}</small>}</span><Status>{store.vehicleAttendance[isoToday()]?.[vehicle.id] === true ? "Present" : store.vehicleAttendance[isoToday()]?.[vehicle.id] === false ? "Absent" : "Not marked"}</Status><Status>{vehicle.status}</Status><Actions edit={() => { setEditingVehicleId(vehicle.id); setDialog("vehicle"); }} remove={() => remove("vehicles", vehicle.id)}/></Row>; })}</Table><h2 className="op-list-title">Vehicle attendance</h2><div className="op-attendance-layout"><AttendanceCalendar key={`vehicle-${vehicleAttendanceDate.slice(0, 7)}`} selected={vehicleAttendanceDate} attendance={store.vehicleAttendance} employeeIds={attendanceVehicleIds} onSelect={selectVehicleAttendanceDate}/><section className="op-attendance-sheet"><div className="op-toolbar"><label className="op-field"><span>Attendance date</span><input type="date" value={vehicleAttendanceDate} onChange={(event) => selectVehicleAttendanceDate(event.target.value)}/></label><Button secondary onClick={() => { setVehicleAttendanceDraft((current) => ({ ...current, ...Object.fromEntries(attendanceVehicles.map((vehicle) => [vehicle.id, true])) })); setVehicleAttendanceDirty(true); }}>Mark all present</Button><span className="op-attendance-save-top"><Button onClick={saveVehicleAttendance}><Check size={17}/>Save vehicle attendance</Button></span></div>{vehicleAttendanceDirty && <p className="op-unsaved">Unsaved changes</p>}<Table headers={["Vehicle", "Campaign on this date", "Present", "Absent"]}>{attendanceVehicles.map((vehicle) => { const campaign = campaignForVehicleOnDate(vehicle.id, vehicleAttendanceDate), present = vehicleAttendanceDraft[vehicle.id]; return <Row key={vehicle.id}><b>{vehicle.number}<small>{vehicle.type}</small></b><span>{campaign?.booking.client.firmName ?? "No campaign"}{campaign && <small>{money(campaign.period.dailyRate)}/present day</small>}</span><button className={`op-attendance ${present ? "active" : ""}`} onClick={() => { setVehicleAttendanceDraft((current) => ({ ...current, [vehicle.id]: true })); setVehicleAttendanceDirty(true); }}><Check/>Present</button><button className={`op-attendance ${present === false ? "absent" : ""}`} onClick={() => { setVehicleAttendanceDraft((current) => ({ ...current, [vehicle.id]: false })); setVehicleAttendanceDirty(true); }}><X/>Absent</button></Row>; })}</Table><div className="op-attendance-save-bottom"><Button onClick={saveVehicleAttendance}><Check size={17}/>Save vehicle attendance</Button></div></section></div></>}
    {view === "clients" && <ClientsView store={store} clientCampaignFilter={clientCampaignFilter} clientCategoryFilter={clientCategoryFilter} clientSearch={clientSearch} normalizedClientSearch={normalizedClientSearch} matchingClients={matchingClients} visibleClients={visibleClients} ledgerClientId={ledgerClientId} setClientCampaignFilter={setClientCampaignFilter} setClientCategoryFilter={setClientCategoryFilter} setClientSearch={setClientSearch} addClient={() => { setEditingClientId(null); setDialog("client"); }} openLedger={setLedgerClientId} closeLedger={() => setLedgerClientId(null)} viewBill={(bill) => { setLedgerClientId(null); setInvoice(bill); }} createBill={(clientId) => { setBillingClientId(clientId); setEditingBill(null); setComposeBill(true); }} editClient={(clientId) => { setEditingClientId(clientId); setDialog("client"); }} removeClient={(clientId) => remove("clients", clientId)}/>}
    {view === "quotations" && <QuotationsView store={store} setStore={setStore} notify={notify} />}
    {view === "ledgers" && <ClientLedgersView store={store} ledgerSearch={ledgerSearch} normalizedLedgerSearch={normalizedLedgerSearch} ledgerClients={ledgerClients} visibleLedgerClients={visibleLedgerClients} ledgerClientId={ledgerClientId} setLedgerSearch={setLedgerSearch} openLedger={setLedgerClientId} closeLedger={() => setLedgerClientId(null)} viewBill={(bill) => { setLedgerClientId(null); setInvoice(bill); }}/>}
    {view === "campaigns" && <CampaignsView store={store} campaignSearch={campaignSearch} normalizedCampaignSearch={normalizedCampaignSearch} filteredCampaignBookings={filteredCampaignBookings} setCampaignSearch={setCampaignSearch} newBooking={() => { setEditingCampaign(null); setRenewingCampaign(false); setCampaignFormOpen(true); }} editBooking={(booking) => { setEditingCampaign(booking); setRenewingCampaign(false); setCampaignFormOpen(true); }} renewBooking={(booking) => { const currentEnd = bookingEnd(booking); const endYear = Number(currentEnd.slice(0, 4)); const endMonth = Number(currentEnd.slice(5, 7)); const nextMonthDate = new Date(Date.UTC(endYear, endMonth, 1)); const nextEndDay = new Date(Date.UTC(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1, 0)).getUTCDate(); const nextEndDate = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextEndDay).padStart(2, "0")}`; const renewed = { ...booking, id: booking.id, startDate: booking.startDate, endDate: nextEndDate > booking.endDate ? nextEndDate : booking.endDate, stoppedAt: undefined, vehiclePeriods: booking.vehiclePeriods.map((period) => ({ ...period, endDate: nextEndDate > period.endDate ? nextEndDate : period.endDate })) }; setEditingCampaign(renewed); setRenewingCampaign(false); setCampaignFormOpen(true); }} deleteBooking={(booking) => { if (!window.confirm("Delete this campaign and its attendance link?")) return; setStore((current) => ({ ...current, campaignBookings: current.campaignBookings.filter((item) => item.id !== booking.id) })); notify("Campaign deleted"); }} stopBooking={(booking) => { if (!window.confirm("Stop this campaign immediately?")) return; setStore((current) => ({ ...current, campaignBookings: current.campaignBookings.map((item) => item.id === booking.id ? { ...item, stoppedAt: isoToday() } : item) })); notify("Campaign stopped"); }} generateBill={generateCampaignBill} viewBill={(bill) => setInvoice(bill)}/>}
    {view === "payroll" && (
      <PayrollView
        store={store}
        payrollWeek={payrollWeek}
        payrollPeriodEnd={payrollPeriodEnd}
        payrollPayoutDate={payrollPayoutDate}
        payrollRows={payrollRows}
        payrollGrossTotal={payrollGrossTotal}
        payrollAdvanceRecoveryTotal={payrollAdvanceRecoveryTotal}
        payrollRemainingAdvanceTotal={payrollRemainingAdvanceTotal}
        payrollNetTotal={payrollNetTotal}
        payrollPaidTotal={payrollPaidTotal}
        payrollRemainingBalanceTotal={payrollRemainingBalanceTotal}
        setPayrollWeek={selectPayrollWeek}
        setPayrollPeriodEnd={setPayrollPeriodEnd}
        setPayrollRange={setPayrollRange}
        releasePayroll={releasePayroll}
        setPayrollStatus={setPayrollStatus}
        exportPayroll={exportPayroll}
        openEmployeeRecord={setEmployeeRecordId}
      />
    )} 
    {view === "billing" && <BillingView store={store} billingSearch={billingSearch} filteredBills={filteredBills} totalBusiness={totalBusiness} outstanding={outstanding} setBillingSearch={setBillingSearch} generateBill={() => { setEditingBill(null); setComposeBill(true); }} openCompanyDetails={() => setDialog("company")} combineClientBills={() => setConsolidateOpen(true)} editBill={(bill) => { setEditingBill(bill); setBillingClientId(bill.clientId); setComposeBill(true); }} recordPayment={setPaymentBill} viewBill={setInvoice} removeBill={removeBill}/>}
    {view === "expenses" && <ExpensesView
      store={store}
      totalSupplierPaid={totalSupplierPaid}
      totalSupplierBalance={totalSupplierBalance}
      totalExpenseProfit={totalExpenseProfit}
      addBusinessExpense={() => { setEditingClientId(null); setDialog("businessExpense"); }}
      addEmployeeExpense={() => setDialog("employeeExpense")}
      addEmployeeAdvance={() => setDialog("advance")}
      editBusinessExpense={(expenseId) => { setEditingClientId(expenseId); setDialog("businessExpense"); }}
      removeBusinessExpense={(expenseId) => remove("businessExpenses", expenseId)}
      savePayment={(expenseId, date, paidAmount, reference, note) => {
        setStore((current) => ({
          ...current,
          businessExpenses: current.businessExpenses.map((expense) => expense.id === expenseId ? { ...expense, payments: [...(expense.payments ?? []), { id: nextId(expense.payments ?? []), date, amount: paidAmount, reference, note }] } : expense),
        }));
        notify("Supplier installment recorded");
      }}
    />}
    {view === "reports" && (
      <ReportsView
        store={store}
        reportPeriod={reportPeriod}
        setReportPeriod={setReportPeriod}
        reportMonth={reportMonth}
        setReportMonth={setReportMonth}
        reportQuarter={reportQuarter}
        setReportQuarter={setReportQuarter}
        reportQuarterYear={reportQuarterYear}
        setReportQuarterYear={setReportQuarterYear}
        reportYear={reportYear}
        setReportYear={setReportYear}
        reportFrom={reportFrom}
        setReportFrom={setReportFrom}
        reportTo={reportTo}
        setReportTo={setReportTo}
        reportStart={reportStart}
        reportEnd={reportEnd}
        reportProfitCategory={reportProfitCategory}
        reportCategorySupplierCost={reportCategorySupplierCost}
        reportCategoryClientBilling={reportCategoryClientBilling}
        reportCategoryProfit={reportCategoryProfit}
        reportCategoryRecordCount={reportCategoryExpenses.length}
        reportProfitBreakdown={reportProfitBreakdown}
        setReportProfitCategory={setReportProfitCategory}
        reportTrend={reportTrend}
        reportClientChart={reportClientChart}
        reportRevenue={reportRevenue}
        reportOutstanding={reportOutstanding}
        reportBills={reportBills}
        reportTotalExpenses={reportTotalExpenses}
        reportExpenses={reportExpenses}
        reportEmployeeExpenses={reportEmployeeExpenses}
        reportPayroll={reportPayroll}
        outstanding={outstanding}
      />
    )}
  </OperationsShell>;
}