import {
  addDays,
  Bill,
  BillChargeCategory,
  BillVehicleLine,
  BusinessExpenseCategory,
  CampaignBooking,
  ClientCategory,
  FleetStore,
  inclusiveDays,
  OtherBill,
} from "./fleet-domain";

export const isoToday = () => new Date().toISOString().slice(0, 10);
export const money = (value: number) => {
  const isNegative = value < 0;
  const absVal = Math.abs(value);
  const formatted = absVal % 1 !== 0
    ? absVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : absVal.toLocaleString("en-IN");
  return `${isNegative ? "-" : ""}₹${formatted}`;
};
export const nextId = (items: { id: number }[]) => Math.max(0, ...items.map((item) => item.id)) + 1;
export const input = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
export const amount = (data: FormData, name: string) => Number(data.get(name)) || 0;
export const fmt = (date: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const billPaid = (bill: Bill | OtherBill) => ("advanceReceived" in bill ? bill.advanceReceived : 0) + (bill.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
export const billBalance = (bill: Bill | OtherBill) => Math.max(0, bill.total - billPaid(bill));
export const otherBillPaid = (bill: OtherBill) => bill.payments.reduce((sum, payment) => sum + payment.amount, 0);
export const otherBillBalance = (bill: OtherBill) => Math.max(0, bill.total - otherBillPaid(bill));
export const otherBillCost = (bill: OtherBill) => bill.items.reduce((sum, item) => sum + (item.costAmount ?? item.quantity * (item.costRate ?? 0)), 0);
export const supplierPaid = (expense: FleetStore["businessExpenses"][number]) => Math.min(expense.amount, (expense.paidAmount ?? expense.amount) + (expense.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0));
export const supplierBalance = (expense: FleetStore["businessExpenses"][number]) => Math.max(0, expense.amount - supplierPaid(expense));
export const expenseClientBilling = (expense: FleetStore["businessExpenses"][number]) => expense.category === "Self travel" || expense.category === "Self stay" ? 0 : expense.clientBillingAmount ?? expense.amount;
export const expenseProfit = (expense: FleetStore["businessExpenses"][number]) => expenseClientBilling(expense) - expense.amount;

export const reportProfitCategories = [{ value: "All", label: "All" }, { value: "Printing", label: "Banner" }, { value: "Pasting", label: "Pasting" }, { value: "Recording", label: "Recording" }, { value: "Purchase", label: "Purchase" }, { value: "Labour charges", label: "Labour" }, { value: "Paper", label: "Paper" }, { value: "Calendar", label: "Calendar" }, { value: "Self travel", label: "Self expense" }, { value: "Self stay", label: "Salary" }] as const satisfies readonly { value: BusinessExpenseCategory | "All"; label: string }[];
export type ReportProfitCategory = (typeof reportProfitCategories)[number]["value"] | "Self stay";
export const matchesReportCategory = (expense: FleetStore["businessExpenses"][number], category: ReportProfitCategory) => category === "All" || category === "Self travel" ? category === "All" || expense.category === "Self travel" || expense.category === "Self stay" : expense.category === category;

export const clientCategories: ClientCategory[] = ["Rickshaw", "E-rickshaw", "Paper", "Social media", "Calendar", "Other"];
export const campaignChargeCategories: BillChargeCategory[] = ["Banner / printing", "Pasting", "Recording", "Municipal tax", "Design", "Tea", "Breakfast", "Lunch", "Dinner", "Miscellaneous", "Discount"];
export const bookingEnd = (booking: CampaignBooking) => booking.stoppedAt && booking.stoppedAt < booking.endDate ? booking.stoppedAt : booking.endDate;
export const campaignMonthOptions = (bookings: CampaignBooking[]) => Array.from(new Set(bookings.flatMap((booking) => {
  const months: string[] = [];
  let month = booking.startDate.slice(0, 7);
  const finalMonth = bookingEnd(booking).slice(0, 7);
  while (month <= finalMonth) {
    months.push(month);
    const year = Number(month.slice(0, 4)), monthIndex = Number(month.slice(5, 7));
    month = monthIndex === 12 ? `${year + 1}-01` : `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  }
  return months;
}))).sort((left, right) => right.localeCompare(left));
export const bookingStatus = (booking: CampaignBooking) => booking.generatedBillId ? "Billed" : isoToday() < booking.startDate ? "Scheduled" : isoToday() >= bookingEnd(booking) ? booking.stoppedAt ? "Stopped" : "Completed" : "Active";
export const vehiclePresentDays = (store: FleetStore, vehicleId: number, from: string, to: string) => Object.entries(store.vehicleAttendance).filter(([date, attendance]) => date >= from && date <= to && attendance[vehicleId]).length;
export const campaignSlotKey = (bookingId: number, periodId: number, slotIndex: number) => `${bookingId}:${periodId}:${slotIndex}`;
export const campaignSlotPresentDays = (store: FleetStore, bookingId: number, periodId: number, slotIndex: number, from: string, to: string, legacyVehicleId?: number) => Array.from({ length: inclusiveDays(from, to) }, (_, offset) => addDays(from, offset)).filter((date) => store.campaignAttendance[date]?.[campaignSlotKey(bookingId, periodId, slotIndex)] ?? (legacyVehicleId ? store.vehicleAttendance[date]?.[legacyVehicleId] : false)).length;
export const bookingVehicleLines = (store: FleetStore, booking: CampaignBooking, throughDate = bookingEnd(booking)): BillVehicleLine[] => booking.vehiclePeriods.flatMap((period, periodIndex) => {
  const effectiveEnd = [period.endDate, bookingEnd(booking), throughDate].sort()[0];
  if (effectiveEnd < period.startDate) return [];
  const bookedDays = inclusiveDays(period.startDate, effectiveEnd);
  return Array.from({ length: period.quantity }, (_, slotIndex) => {
    const presentDays = campaignSlotPresentDays(store, booking.id, period.id, slotIndex, period.startDate, effectiveEnd, period.vehicleIds[slotIndex]);
    return { id: periodIndex * 100 + slotIndex + 1, vehicleId: -(booking.id * 10000 + period.id * 100 + slotIndex + 1), label: `${booking.client.firmName} · ${period.type} ${slotIndex + 1}`, quantity: 1, startDate: period.startDate, endDate: effectiveEnd, bookedDays, advertisementDays: presentDays, offDays: bookedDays - presentDays, dailyRate: period.dailyRate, driverNames: [] };
  });
});