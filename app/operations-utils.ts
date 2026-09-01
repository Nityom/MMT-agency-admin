import {
  addDays,
  Bill,
  BillChargeCategory,
  BillVehicleLine,
  BusinessExpenseCategory,
  CampaignBooking,
  CampaignFacility,
  CampaignVehiclePeriod,
  ClientCategory,
  FleetStore,
  inclusiveDays,
  OtherBill,
  VehicleType,
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

export const clientOverallBalance = (store: FleetStore, clientId: number) => {
  const targetClient = store.clients.find((c) => c.id === clientId);
  const targetName = targetClient?.firmName?.toLowerCase().trim() ?? "";
  const isBabaTarget = targetName.includes("baba") && targetName.includes("son");

  const clientBills = store.bills.filter(
    (bill) =>
      bill.clientId === clientId ||
      (targetName &&
        (bill.client?.firmName?.toLowerCase().trim() === targetName ||
         (isBabaTarget && (bill.client?.firmName?.toLowerCase().includes("baba") ?? false))))
  );
  const clientOtherBills = store.otherBills.filter(
    (bill) =>
      bill.clientId === clientId ||
      (targetName &&
        (bill.client?.firmName?.toLowerCase().trim() === targetName ||
         (isBabaTarget && (bill.client?.firmName?.toLowerCase().includes("baba") ?? false))))
  );
  const billed =
    clientBills.reduce((sum, bill) => sum + bill.total, 0) +
    clientOtherBills.reduce((sum, bill) => sum + bill.total, 0);
  const received =
    clientBills.reduce((sum, bill) => sum + billPaid(bill), 0) +
    clientOtherBills.reduce((sum, bill) => sum + otherBillPaid(bill), 0);
  const balance = billed - received;
  return {
    billed,
    received,
    balance,
    outstanding: Math.max(0, balance),
    billCount: clientBills.length,
    otherBillCount: clientOtherBills.length,
  };
};

export const supplierPaid = (expense: FleetStore["businessExpenses"][number]) => Math.min(expense.amount, (expense.paidAmount ?? expense.amount) + (expense.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0));
export const supplierBalance = (expense: FleetStore["businessExpenses"][number]) => Math.max(0, expense.amount - supplierPaid(expense));
export const expenseClientBilling = (expense: FleetStore["businessExpenses"][number]) => expense.category === "Self travel" || expense.category === "Self stay" ? 0 : expense.clientBillingAmount ?? expense.amount;
export const expenseProfit = (expense: FleetStore["businessExpenses"][number]) => expenseClientBilling(expense) - expense.amount;

export const reportProfitCategories = [{ value: "All", label: "All" }, { value: "Printing", label: "Banner" }, { value: "Pasting", label: "Pasting" }, { value: "Recording", label: "Recording" }, { value: "Purchase", label: "Purchase" }, { value: "Labour charges", label: "Labour" }, { value: "Paper", label: "Paper" }, { value: "Calendar", label: "Calendar" }, { value: "Self travel", label: "Self expense" }, { value: "Self stay", label: "Salary" }] as const satisfies readonly { value: BusinessExpenseCategory | "All"; label: string }[];
export type ReportProfitCategory = (typeof reportProfitCategories)[number]["value"] | "Self stay";
export const matchesReportCategory = (expense: FleetStore["businessExpenses"][number], category: ReportProfitCategory) => {
  if (category === "All") return true;
  if (category === "Self travel") return expense.category === "Self travel" || expense.category === "Self stay";
  return expense.category === category;
};

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
export const findCampaignBillForRange = (store: FleetStore, booking: CampaignBooking, fromDate: string, toDate: string): Bill | undefined => {
  if (booking.generatedBillId) {
    const direct = store.bills.find((b) => b.id === booking.generatedBillId);
    if (direct) {
      const lineMatch = direct.vehicleLines.some((l) => l.startDate === fromDate && l.endDate === toDate);
      if (lineMatch || (fromDate === booking.startDate && toDate === bookingEnd(booking))) {
        return direct;
      }
    }
  }
  const bookingVehicleBill = store.bills.find((bill) =>
    bill.vehicleLines.some((line) => {
      const isLinked = line.vehicleId < 0 && Math.floor(Math.abs(line.vehicleId) / 10000) === booking.id;
      return isLinked && line.startDate === fromDate && line.endDate === toDate;
    })
  );
  if (bookingVehicleBill) return bookingVehicleBill;
  const actualClientId = booking.clientId;
  const clientFirm = booking.client?.firmName?.trim().toLowerCase();
  return store.bills.find((bill) => {
    const isSameClient = bill.clientId === actualClientId || (clientFirm && bill.client?.firmName?.trim().toLowerCase() === clientFirm);
    if (!isSameClient) return false;
    return bill.vehicleLines.some((line) => line.startDate === fromDate && line.endDate === toDate);
  });
};
export const findAllCampaignBills = (store: FleetStore, booking: CampaignBooking): Bill[] => {
  const actualClientId = booking.clientId;
  const clientFirm = booking.client?.firmName?.trim().toLowerCase();
  const cEnd = bookingEnd(booking);
  const matches = store.bills.filter((bill) => {
    if (booking.generatedBillId && bill.id === booking.generatedBillId) return true;
    const hasBookingLine = bill.vehicleLines.some((line) => {
      return line.vehicleId < 0 && Math.floor(Math.abs(line.vehicleId) / 10000) === booking.id;
    });
    if (hasBookingLine) return true;
    const isSameClient = bill.clientId === actualClientId || (clientFirm && bill.client?.firmName?.trim().toLowerCase() === clientFirm);
    if (!isSameClient) return false;
    return bill.vehicleLines.some((line) => (line.startDate >= booking.startDate && line.startDate <= cEnd) || (line.endDate >= booking.startDate && line.endDate <= cEnd));
  });
  return Array.from(new Map(matches.map((b) => [b.id, b])).values());
};

export const consolidateCampaignBookings = (bookings: CampaignBooking[]): CampaignBooking[] => {
  const byClient = new Map<string, CampaignBooking[]>();
  for (const b of bookings) {
    const key = b.clientId ? `id_${b.clientId}` : `name_${b.client?.firmName?.trim().toLowerCase()}`;
    const list = byClient.get(key) ?? [];
    list.push(b);
    byClient.set(key, list);
  }

  const result: CampaignBooking[] = [];
  for (const clientBookings of byClient.values()) {
    if (clientBookings.length === 1) {
      result.push(clientBookings[0]);
      continue;
    }

    const sorted = [...clientBookings].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];

    const allStarts = sorted.map((b) => b.startDate);
    const allEnds = sorted.map((b) => bookingEnd(b));
    const minStart = [...allStarts].sort()[0];
    const maxEnd = [...allEnds].sort().slice(-1)[0];

    const mergedPeriods: CampaignVehiclePeriod[] = [];
    const periodsByType = new Map<VehicleType, CampaignVehiclePeriod[]>();
    for (const b of sorted) {
      for (const vp of b.vehiclePeriods) {
        const typeKey: VehicleType = vp.type || "Rickshaw";
        const list = periodsByType.get(typeKey) ?? [];
        list.push(vp);
        periodsByType.set(typeKey, list);
      }
    }

    let pIndex = 1;
    for (const [type, vps] of periodsByType.entries()) {
      const maxQuantity = Math.max(...vps.map((p) => p.quantity || 1));
      const latestRate = vps[vps.length - 1]?.dailyRate ?? 0;
      const allVehIds = Array.from(new Set(vps.flatMap((p) => p.vehicleIds || [])));
      mergedPeriods.push({
        id: pIndex++,
        type,
        startDate: minStart,
        endDate: maxEnd,
        quantity: maxQuantity,
        dailyRate: latestRate,
        vehicleIds: allVehIds,
      });
    }

    const facilityKeys = new Set<string>();
    const mergedFacilities: CampaignFacility[] = [];
    let fIndex = 1;
    for (const b of sorted) {
      for (const f of b.facilities || []) {
        const fKey = `${f.category}_${f.description}`;
        if (!facilityKeys.has(fKey)) {
          facilityKeys.add(fKey);
          mergedFacilities.push({ ...f, id: fIndex++ });
        }
      }
    }

    const isAnyActive = sorted.some((b) => !b.stoppedAt);
    const stoppedAt = isAnyActive ? undefined : latest.stoppedAt;
    const month = earliest.month || minStart.slice(0, 7);

    result.push({
      ...earliest,
      id: earliest.id,
      month,
      startDate: minStart,
      endDate: maxEnd,
      stoppedAt,
      generatedBillId: latest.generatedBillId ?? earliest.generatedBillId,
      vehiclePeriods: mergedPeriods.length > 0 ? mergedPeriods : earliest.vehiclePeriods,
      facilities: mergedFacilities,
    });
  }

  return result.sort((a, b) => b.startDate.localeCompare(a.startDate));
};