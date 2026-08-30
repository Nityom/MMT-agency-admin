export type ISODate = string;

export type EmployeeStatus = "Active" | "Inactive";
export type VehicleType = "E-rickshaw" | "Rickshaw";
export type VehicleStatus = "Running" | "Maintenance" | "Inactive";
export type BillStatus = "Paid" | "Pending" | "Overdue";
export type PaymentMode = "Cash" | "Cheque" | "UPI";
export type ExpenseTreatment = "Business cost" | "Employee reimbursement" | "Employee deduction";
export type ClientCategory = "Rickshaw" | "E-rickshaw" | "Paper" | "Social media" | "Calendar" | "Other";

export type Employee = {
  id: number;
  name: string;
  status: EmployeeStatus;
  monthlySalary: number;
};

export type EmployeeRate = {
  id: number;
  employeeId: number;
  location: string;
  dailyRate: number;
  effectiveFrom: ISODate;
  effectiveTo?: ISODate;
};

export type Vehicle = {
  id: number;
  number: string;
  type: VehicleType;
  status: VehicleStatus;
};

export type Client = {
  id: number;
  firmName: string;
  ownerName: string;
  address: string;
  mobile: string;
  alternatePhone?: string;
  dateOfBirth: ISODate | "";
  email: string;
  categories: ClientCategory[];
  status: EmployeeStatus;
};

export type CampaignFacility = {
  id: number;
  category: BillChargeCategory;
  description: string;
  quantity: number;
  rate: number;
};

export type CampaignVehiclePeriod = {
  id: number;
  type: VehicleType;
  vehicleIds: number[];
  startDate: ISODate;
  endDate: ISODate;
  quantity: number;
  dailyRate: number;
};

export type CampaignBooking = {
  id: number;
  month: string;
  clientId: number;
  client: ClientSnapshot;
  startDate: ISODate;
  endDate: ISODate;
  vehiclePeriods: CampaignVehiclePeriod[];
  rickshawCount?: number;
  rickshawDailyRate?: number;
  eRickshawCount?: number;
  eRickshawDailyRate?: number;
  facilities: CampaignFacility[];
  stoppedAt?: ISODate;
  generatedBillId?: number;
};

export type Assignment = {
  id: number;
  employeeId: number;
  vehicleId: number;
  clientId: number | null;
  effectiveFrom: ISODate;
  effectiveTo?: ISODate;
  contractedDays?: number;
  billingDailyRate?: number;
};

export type EmployeeExpenseCategory =
  | "Breakfast"
  | "Tea"
  | "Ticket"
  | "Railway pass"
  | "Meal"
  | "Puncture repair"
  | "Other";

export type EmployeeExpense = {
  id: number;
  employeeId: number;
  employeeName?: string;
  date: ISODate;
  category: EmployeeExpenseCategory;
  description: string;
  amount: number;
  treatment: ExpenseTreatment;
};

export type Advance = {
  id: number;
  employeeId: number;
  employeeName?: string;
  date: ISODate;
  amount: number;
  recovered: number;
  note: string;
};

export type EmployeePayment = {
  id: number;
  employeeId: number;
  date: ISODate;
  amount: number;
  paymentType: "Salary" | "Advance" | "Bonus" | "Other";
  reference: string;
  note: string;
  linkedPayrollId?: number;
};

export type PayrollPayment = {
  id: number;
  employeeId: number;
  periodStart: ISODate;
  periodEnd: ISODate;
  payoutDate: ISODate;
  gross: number;
  reimbursements: number;
  deductions: number;
  advanceRecovery: number;
  net: number;
  paidAmount?: number;
  status: "Pending" | "Paid";
  paidAt?: ISODate;
};

export type BillVehicleLine = {
  id: number;
  vehicleId: number;
  label?: string;
  quantity?: number;
  startDate: ISODate;
  endDate: ISODate;
  bookedDays: number;
  advertisementDays: number;
  offDays: number;
  dailyRate: number;
  driverNames: string[];
};

export type BillChargeCategory =
  | "Banner / printing"
  | "Pasting"
  | "Recording"
  | "Municipal tax"
  | "Design"
  | "Tea"
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Miscellaneous"
  | "Discount";

export type BillCharge = {
  id: number;
  category: BillChargeCategory;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  fromDate?: ISODate;
  toDate?: ISODate;
  recurring?: boolean;
  design?: string;
};

export type ClientSnapshot = Pick<Client, "firmName" | "ownerName" | "address" | "mobile" | "email">;

export type BillPayment = {
  id: number;
  date: ISODate;
  amount: number;
  mode: PaymentMode;
  reference: string;
  note: string;
};

export type Bill = {
  id: number;
  number: number;
  billDate: ISODate;
  clientId: number;
  client: ClientSnapshot;
  vehicleLines: BillVehicleLine[];
  charges: BillCharge[];
  advanceReceived: number;
  paymentMode: PaymentMode;
  payments: BillPayment[];
  total: number;
  status: BillStatus;
};

export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Converted" | "Expired";

export type Quotation = {
  id: number;
  number: number;
  quotationDate: ISODate;
  validUntil?: ISODate;
  clientId: number;
  client: ClientSnapshot;
  vehicleLines: BillVehicleLine[];
  charges: BillCharge[];
  total: number;
  status: QuotationStatus;
  notes?: string;
  campaignBookingId?: number;
};

export function nextQuotationNumber(quotations: Quotation[] = [], fallback = 1): number {
  return Math.max(0, fallback - 1, ...quotations.map((q) => q.number)) + 1;
}

export type OtherBillCategory = "Paper" | "Calendar" | "Other";

export type OtherBillItem = {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  costRate?: number;
  costAmount?: number;
  fromDate?: ISODate;
  toDate?: ISODate;
  publishingDate?: ISODate;
};

export type OtherBill = {
  id: number;
  number: number;
  billDate: ISODate;
  clientId: number;
  client: ClientSnapshot;
  category: OtherBillCategory;
  items: OtherBillItem[];
  payments: BillPayment[];
  total: number;
  status: BillStatus;
  discount?: number;
};

export type BusinessExpenseCategory =
  | "Maintenance"
  | "Printing"
  | "Pasting"
  | "Recording"
  | "Purchase"
  | "Labour charges"
  | "Bond / banner material"
  | "Self travel"
  | "Self stay"
  | "Paper"
  | "Calendar"
  | "Miscellaneous";

export type BusinessExpensePayment = {
  id: number;
  date: ISODate;
  amount: number;
  reference?: string;
  note?: string;
  mode?: PaymentMode;
};

export type SupplierPayment = BusinessExpensePayment & {
  supplierName: string;
};

export type SupplierProfile = {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  createdAt: ISODate;
};

export type SelfExpenseItem = {
  id: number;
  name: string;
  amount: number;
};

export type BusinessExpense = {
  id: number;
  date: ISODate;
  tourName?: string;
  clientId?: number;
  clientName?: string;
  campaignId?: number;
  category: BusinessExpenseCategory;
  description: string;
  purpose: string;
  paidTo: string;
  reference: string;
  quantity?: number;
  unit?: string;
  supplierRate?: number;
  discount?: number;
  amount: number;
  clientBillingAmount?: number;
  paidAmount?: number;
  paidDate?: ISODate;
  payments?: BusinessExpensePayment[];
  fromLocation?: string;
  toLocation?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  items?: SelfExpenseItem[];
};

export type CompanyProfile = {
  name: string;
  address: string;
  mobile: string;
  email: string;
  pan: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
};

export type FleetStore = {
  schemaVersion: 2;
  company: CompanyProfile;
  nextBillNumber: number;
  employees: Employee[];
  employeeRates: EmployeeRate[];
  employeePayments: EmployeePayment[];
  vehicles: Vehicle[];
  clients: Client[];
  campaignBookings: CampaignBooking[];
  assignments: Assignment[];
  attendance: Record<ISODate, Record<number, boolean>>;
  vehicleAttendance: Record<ISODate, Record<number, boolean>>;
  campaignAttendance: Record<ISODate, Record<string, boolean>>;
  employeeExpenses: EmployeeExpense[];
  advances: Advance[];
  payrollPayments: PayrollPayment[];
  bills: Bill[];
  nextQuotationNumber?: number;
  quotations?: Quotation[];
  nextOtherBillNumber: number;
  otherBills: OtherBill[];
  businessExpenses: BusinessExpense[];
  suppliers: SupplierProfile[];
  supplierPayments: SupplierPayment[];
};

const DAY_MS = 86_400_000;

export function addDays(date: ISODate, days: number): ISODate {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function inclusiveDays(from: ISODate, to: ISODate): number {
  return Math.max(0, Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1);
}

export function campaignDurationMonths(startDate: ISODate, endDate: ISODate): number {
  if (!startDate || !endDate || endDate < startDate) return 1;
  const days = inclusiveDays(startDate, endDate);
  // Exactly 28-31 days is 1 month, 58-62 days is 2 months, etc.
  return Math.max(1, Math.round(days / 30));
}

export function weekFor(date: ISODate): { start: ISODate; end: ISODate; payoutDate: ISODate } {
  const value = new Date(`${date}T00:00:00Z`);
  const daysFromMonday = (value.getUTCDay() + 6) % 7;
  const start = addDays(date, -daysFromMonday);
  const end = addDays(start, 6);
  return { start, end, payoutDate: addDays(end, 1) };
}

export function rateOnDate(rates: EmployeeRate[], employeeId: number, date: ISODate): EmployeeRate | undefined {
  const employeeRates = rates.filter((rate) => rate.employeeId === employeeId);
  if (!employeeRates.length) return undefined;

  // 1. Exact range match where effectiveFrom <= date and (effectiveTo is unset or >= date)
  const exact = employeeRates
    .filter((rate) => rate.effectiveFrom <= date && (!rate.effectiveTo || rate.effectiveTo >= date))
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0];
  if (exact) return exact;

  // 2. If attendance date is earlier than the earliest effectiveFrom, use the baseline earliest rate
  const sortedByFrom = [...employeeRates].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  if (date < sortedByFrom[0].effectiveFrom) {
    return sortedByFrom[0];
  }

  // 3. Fallback to the latest available rate for the employee
  return sortedByFrom[sortedByFrom.length - 1];
}

export type PayrollPreview = Omit<PayrollPayment, "id" | "status" | "paidAt"> & {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  unmarkedDays: number;
  carryForward: number;
  totalAdvance: number;
  remainingAdvance: number;
  rateBreakdown: { location: string; dailyRate: number; days: number; amount: number }[];
};

export function calculatePayrollRange(store: FleetStore, employeeId: number, periodStart: ISODate, periodEnd: ISODate): PayrollPreview {
  const payoutDate = addDays(periodEnd, 1);
  const breakdown = new Map<string, PayrollPreview["rateBreakdown"][number]>();
  const totalDays = inclusiveDays(periodStart, periodEnd);
  let presentDays = 0;
  let absentDays = 0;
  let unmarkedDays = 0;
  const emp = store.employees.find((e) => e.id === employeeId);

  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = addDays(periodStart, offset);
    const attendanceState = store.attendance[date]?.[employeeId];
    if (attendanceState === true) {
      presentDays += 1;
      const rate = rateOnDate(store.employeeRates, employeeId, date);
      const location = rate?.location ?? "Standard";
      const dailyRate = rate?.dailyRate ?? (emp?.monthlySalary ? Math.round(emp.monthlySalary / 30) : 0);
      const key = `${location}:${dailyRate}`;
      const current = breakdown.get(key) ?? { location, dailyRate, days: 0, amount: 0 };
      current.days += 1;
      current.amount += dailyRate;
      breakdown.set(key, current);
    } else if (attendanceState === false) {
      absentDays += 1;
    } else {
      unmarkedDays += 1;
    }
  }

  const relevantExpenses = store.employeeExpenses.filter((expense) => expense.employeeId === employeeId && expense.date >= periodStart && expense.date <= periodEnd);
  const reimbursements = relevantExpenses.filter((expense) => expense.treatment === "Employee reimbursement").reduce((sum, expense) => sum + expense.amount, 0);
  const deductions = relevantExpenses.filter((expense) => expense.treatment === "Employee deduction").reduce((sum, expense) => sum + expense.amount, 0);
  const gross = [...breakdown.values()].reduce((sum, item) => sum + item.amount, 0);
  const paidPayment = store.payrollPayments.find((payment) => payment.employeeId === employeeId && payment.periodStart === periodStart && payment.status === "Paid");

  // Total advance taken up to this period's payout date:
  const totalAdvance = store.advances
    .filter((advance) => advance.employeeId === employeeId && advance.date <= payoutDate)
    .reduce((sum, advance) => sum + advance.amount, 0);

  // Advance already recovered in prior paid payroll periods that ended before this period starts:
  const priorPayrollRecoveries = store.payrollPayments
    .filter((p) => p.employeeId === employeeId && (p.status === "Paid" || (p.paidAmount ?? 0) > 0) && p.periodEnd < periodStart)
    .reduce((sum, p) => sum + (p.advanceRecovery ?? 0), 0);

  // Explicitly recorded recoveries:
  const explicitRecoveries = store.advances
    .filter((advance) => advance.employeeId === employeeId && advance.date <= payoutDate)
    .reduce((sum, advance) => sum + (advance.recovered ?? 0), 0);

  const totalPriorRecovered = Math.max(priorPayrollRecoveries, explicitRecoveries);
  const outstandingAdvance = Math.max(0, totalAdvance - totalPriorRecovered);

  const maxRecoverable = Math.max(0, gross + reimbursements - deductions);
  const autoRecovery = Math.min(outstandingAdvance, maxRecoverable);
  const advanceRecovery = paidPayment && paidPayment.advanceRecovery !== undefined && (paidPayment.advanceRecovery > 0 || outstandingAdvance === 0)
    ? paidPayment.advanceRecovery
    : autoRecovery;
  const remainingAdvance = Math.max(0, outstandingAdvance - advanceRecovery);

  return {
    employeeId,
    periodStart,
    periodEnd,
    payoutDate,
    totalDays,
    presentDays,
    absentDays,
    unmarkedDays,
    rateBreakdown: [...breakdown.values()],
    gross,
    reimbursements,
    deductions,
    advanceRecovery,
    totalAdvance: outstandingAdvance,
    remainingAdvance,
    carryForward: 0,
    net: Math.max(0, gross + reimbursements - deductions - advanceRecovery),
  };
}

export function calculatePayroll(store: FleetStore, employeeId: number, weekStart: ISODate): PayrollPreview {
  return calculatePayrollRange(store, employeeId, weekStart, addDays(weekStart, 6));
}

export type CampaignProgress = {
  completedDays: number;
  requiredDays: number;
  completionDate?: ISODate;
};

export function calculateCampaignProgress(store: FleetStore, assignment: Assignment, throughDate: ISODate): CampaignProgress {
  const requiredDays = assignment.contractedDays ?? 0;
  if (requiredDays <= 0) return { completedDays: 0, requiredDays };

  const attendanceDates = Object.keys(store.attendance)
    .filter((date) => date >= assignment.effectiveFrom && date <= throughDate && (!assignment.effectiveTo || date <= assignment.effectiveTo))
    .sort();
  let completedDays = 0;

  for (const date of attendanceDates) {
    if (!store.attendance[date]?.[assignment.employeeId]) continue;
    completedDays += 1;
    if (completedDays === requiredDays) return { completedDays, requiredDays, completionDate: date };
  }

  return { completedDays, requiredDays };
}

export function driversForVehiclePeriod(store: FleetStore, vehicleId: number, clientId: number, from: ISODate, to: ISODate): string[] {
  const employeeIds = store.assignments
    .filter((assignment) => {
      if (assignment.vehicleId !== vehicleId || assignment.clientId !== clientId || assignment.effectiveFrom > to) return false;
      const completionDate = calculateCampaignProgress(store, assignment, to).completionDate;
      const campaignEnd = completionDate && assignment.effectiveTo
        ? completionDate < assignment.effectiveTo ? completionDate : assignment.effectiveTo
        : completionDate ?? assignment.effectiveTo;
      return !campaignEnd || campaignEnd >= from;
    })
    .map((assignment) => assignment.employeeId);
  return [...new Set(employeeIds)]
    .map((employeeId) => store.employees.find((employee) => employee.id === employeeId)?.name)
    .filter((name): name is string => Boolean(name));
}

export function calculateBillTotal(vehicleLines: BillVehicleLine[], charges: BillCharge[]): number {
  const vehicleTotal = vehicleLines.reduce((sum, line) => sum + line.advertisementDays * line.dailyRate * (line.quantity ?? 1), 0);
  return vehicleTotal + charges.reduce((sum, charge) => sum + (charge.category === "Discount" ? -Math.abs(charge.amount) : charge.amount), 0);
}

export function nextBillNumber(bills: Bill[], configuredNext: number): number {
  return Math.max(configuredNext, ...bills.map((bill) => bill.number + 1));
}

export type EmployeeLedger = {
  totalSalaryPayable: number;
  totalPaid: number;
  remainingBalance: number;
  totalAdvance: number;
  advanceOutstanding: number;
};

export function calculateEmployeeLedger(store: FleetStore, employeeId: number): EmployeeLedger {
  const employee = store.employees.find((e) => e.id === employeeId);
  const advances = store.advances.filter((a) => a.employeeId === employeeId);
  const totalAdvance = advances.reduce((sum, a) => sum + a.amount, 0);
  const advanceRecovered = advances.reduce((sum, a) => sum + a.recovered, 0);
  const advanceOutstanding = Math.max(0, totalAdvance - advanceRecovered);

  const payrollPayments = store.payrollPayments.filter((p) => p.employeeId === employeeId);
  const employeePayments = (store.employeePayments ?? []).filter((p) => p.employeeId === employeeId);

  const pendingSalaryDues = payrollPayments.reduce((sum, p) => {
    const paid = p.status === "Paid" ? (p.paidAmount ?? p.net) : (p.paidAmount ?? 0);
    return sum + Math.max(0, p.net - paid);
  }, 0);

  const totalPaid = payrollPayments.reduce((sum, p) => sum + (p.paidAmount ?? (p.status === "Paid" ? p.net : 0)), 0) +
                    employeePayments.reduce((sum, p) => sum + p.amount, 0);

  const totalSalaryPayable = payrollPayments.reduce((sum, p) => sum + p.gross, 0) + (employee?.monthlySalary ?? 0);
  const remainingBalance = pendingSalaryDues > 0 ? pendingSalaryDues : advanceOutstanding > 0 ? -advanceOutstanding : 0;

  return {
    totalSalaryPayable,
    totalPaid,
    remainingBalance,
    totalAdvance,
    advanceOutstanding,
  };
}

export type AttendanceRange = {
  startDate: ISODate;
  endDate: ISODate;
  status: "Present" | "Absent";
  days: number;
};

export function groupAttendanceRanges(attendance: Record<ISODate, Record<number, boolean>>, employeeId: number): AttendanceRange[] {
  const dates = Object.keys(attendance)
    .filter((date) => attendance[date][employeeId] !== undefined)
    .sort();
  
  if (dates.length === 0) return [];
  
  const ranges: AttendanceRange[] = [];
  let currentStart = dates[0];
  let currentStatus = attendance[dates[0]][employeeId] ? "Present" : "Absent";
  
  for (let i = 1; i < dates.length; i++) {
    const date = dates[i];
    const status = attendance[date][employeeId] ? "Present" : "Absent";
    const prevDate = dates[i - 1];
    const isConsecutive = addDays(prevDate, 1) === date;
    
    if (status !== currentStatus || !isConsecutive) {
      ranges.push({
        startDate: currentStart,
        endDate: prevDate,
        status: currentStatus as "Present" | "Absent",
        days: inclusiveDays(currentStart, prevDate),
      });
      currentStart = date;
      currentStatus = status;
    }
  }
  
  ranges.push({
    startDate: currentStart,
    endDate: dates[dates.length - 1],
    status: currentStatus as "Present" | "Absent",
    days: inclusiveDays(currentStart, dates[dates.length - 1]),
  });
  
  return ranges;
}

const defaultCompany: CompanyProfile = {
  name: "Mrunal Multi Task Agency",
  address: "Near Namdev Math, Malgujaripura, Wardha 442 001",
  mobile: "9850545111",
  email: "madhav.bhalerao25@gmail.com",
  pan: "BEYPB6075B",
  bankName: "Bank of India",
  accountName: "Mrunal Multi Task Agency",
  accountNumber: "23213213213",
  ifsc: "ABCD000211",
  branch: "Wardha",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function array(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function migrateStore(value: unknown, fallback: FleetStore): FleetStore {
  const source = record(value);
  if (source.schemaVersion === 2) {
    const migrated = { ...fallback, ...source } as FleetStore;
    const company = {
      ...migrated.company,
      name: migrated.company.name === "MMT Agency" ? "Mrunal Multi Task Agency" : migrated.company.name,
      pan: migrated.company.pan || fallback.company.pan,
      accountName: "Mrunal Multi Task Agency",
      bankName: "Bank of India",
      branch: "Wardha",
      accountNumber: "23213213213",
      ifsc: "ABCD000211",
    };
    const suppliers = Array.isArray(migrated.suppliers) ? migrated.suppliers : Array.from(new Map(migrated.businessExpenses.map((expense) => expense.paidTo.trim()).filter(Boolean).map((name) => [name.toLowerCase(), name])).values()).map((name, index) => ({ id: index + 1, name, createdAt: new Date().toISOString().slice(0, 10) }));
    return {
      ...migrated,
      company,
      employees: migrated.employees.map((employee) => ({ ...employee, monthlySalary: employee.monthlySalary ?? 0 })),
      employeePayments: Array.isArray(migrated.employeePayments) ? migrated.employeePayments : [],
      clients: migrated.clients.map((client) => ({ ...client, categories: Array.isArray(client.categories) ? client.categories : [] })),
      campaignBookings: Array.isArray(migrated.campaignBookings) ? migrated.campaignBookings.map((booking) => ({
        ...booking,
        vehiclePeriods: (Array.isArray(booking.vehiclePeriods) ? booking.vehiclePeriods : [
          ...(booking.rickshawCount ? [{ id: 1, type: "Rickshaw" as const, startDate: booking.startDate, endDate: booking.endDate, quantity: booking.rickshawCount, dailyRate: booking.rickshawDailyRate ?? 0 }] : []),
          ...(booking.eRickshawCount ? [{ id: 2, type: "E-rickshaw" as const, startDate: booking.startDate, endDate: booking.endDate, quantity: booking.eRickshawCount, dailyRate: booking.eRickshawDailyRate ?? 0 }] : []),
        ]).map((period) => ({
          ...period,
          quantity: Math.max(1, number(period.quantity, Array.isArray((period as Partial<CampaignVehiclePeriod>).vehicleIds) ? (period as CampaignVehiclePeriod).vehicleIds?.length : 1)),
          vehicleIds: Array.isArray((period as Partial<CampaignVehiclePeriod>).vehicleIds) ? (period as CampaignVehiclePeriod).vehicleIds : [],
        })),
      })) : [],
      vehicleAttendance: migrated.vehicleAttendance ?? {},
      campaignAttendance: migrated.campaignAttendance ?? {},
      suppliers,
      supplierPayments: Array.isArray(migrated.supplierPayments) ? migrated.supplierPayments : [],
      nextOtherBillNumber: migrated.nextOtherBillNumber || 1,
      otherBills: Array.isArray(migrated.otherBills) ? migrated.otherBills.map((bill) => ({ ...bill, items: bill.items.map((item) => ({ ...item, costRate: item.costRate ?? 0, costAmount: item.costAmount ?? item.quantity * (item.costRate ?? 0) })) })) : [],
      employeeExpenses: migrated.employeeExpenses.map((expense) => ({ ...expense, employeeName: expense.employeeName || migrated.employees.find((employee) => employee.id === expense.employeeId)?.name || "Unassigned employee" })),
      advances: migrated.advances.map((advance) => ({ ...advance, employeeName: advance.employeeName || migrated.employees.find((employee) => employee.id === advance.employeeId)?.name || "Unassigned employee" })),
      bills: migrated.bills.map((bill) => {
        const legacyBill = bill as Bill & { advancePaymentMode?: PaymentMode };
        const legacyPayments = (Array.isArray(bill.payments) ? bill.payments : []) as (Omit<BillPayment, "mode"> & { mode?: PaymentMode })[];
        const paymentMode = legacyBill.paymentMode ?? legacyBill.advancePaymentMode ?? legacyPayments.find((payment) => payment.mode)?.mode ?? "Cash";
        return {
          ...bill,
          paymentMode,
          payments: legacyPayments.map((payment) => ({ ...payment, mode: payment.mode ?? paymentMode })),
        };
      }),
      quotations: Array.isArray(migrated.quotations) ? migrated.quotations : [],
      nextQuotationNumber: migrated.nextQuotationNumber || 1,
    };
  }

  const legacyDrivers = array(source.drivers);
  const legacyVehicles = array(source.vehicles);
  const legacyParties = array(source.parties);
  const legacyBills = array(source.bills);
  const legacyExpenses = array(source.expenses);

  const employees: Employee[] = legacyDrivers.map((driver) => ({
    id: number(driver.id),
    name: text(driver.name),
    status: text(driver.status) === "Inactive" ? "Inactive" : "Active",
    monthlySalary: number(driver.salary, 0),
  }));
  const employeeRates: EmployeeRate[] = legacyDrivers.map((driver, index) => ({
    id: index + 1,
    employeeId: number(driver.id),
    location: text(driver.location, "Wardha"),
    dailyRate: Math.round(number(driver.salary) / 30),
    effectiveFrom: "2026-01-01",
  }));
  const vehicles: Vehicle[] = legacyVehicles.map((vehicle) => ({
    id: number(vehicle.id),
    number: text(vehicle.number),
    type: text(vehicle.type) === "Rickshaw" ? "Rickshaw" : "E-rickshaw",
    status: (["Running", "Maintenance", "Inactive"].includes(text(vehicle.status)) ? text(vehicle.status) : "Inactive") as VehicleStatus,
  }));
  const clients: Client[] = legacyParties.map((party) => ({
    id: number(party.id),
    firmName: text(party.name),
    ownerName: "",
    address: "",
    mobile: text(party.contact),
    dateOfBirth: "",
    email: text(party.contact).includes("@") ? text(party.contact) : "",
    categories: [],
    status: text(party.status) === "Inactive" ? "Inactive" : "Active",
  }));
  const assignments: Assignment[] = legacyDrivers.flatMap((driver, index) => {
    const vehicleId = number(driver.vehicleId);
    if (!vehicleId) return [];
    const vehicle = legacyVehicles.find((item) => number(item.id) === vehicleId);
    return [{ id: index + 1, employeeId: number(driver.id), vehicleId, clientId: number(vehicle?.partyId) || null, effectiveFrom: "2026-01-01" }];
  });
  const bills: Bill[] = legacyBills.map((legacy, index) => {
    const clientId = number(legacy.partyId);
    const client = clients.find((item) => item.id === clientId);
    const vehicleCount = Math.max(1, number(legacy.vehicles, 1));
    const totalDays = number(legacy.days);
    const rate = number(legacy.rate);
    const vehicleLines: BillVehicleLine[] = Array.from({ length: vehicleCount }, (_, lineIndex) => {
      const bookedDays = Math.floor(totalDays / vehicleCount) + (lineIndex < totalDays % vehicleCount ? 1 : 0);
      const vehicle = vehicles.filter((item) => legacyVehicles.find((old) => number(old.id) === item.id && number(old.partyId) === clientId))[lineIndex];
      return { id: lineIndex + 1, vehicleId: vehicle?.id ?? 0, startDate: text(legacy.from), endDate: text(legacy.to), bookedDays, advertisementDays: bookedDays, offDays: 0, dailyRate: rate, driverNames: vehicle ? driversForVehiclePeriod({ ...fallback, employees, assignments }, vehicle.id, clientId, text(legacy.from), text(legacy.to)) : [] };
    });
    const additionalAmount = number(legacy.lineAmount);
    const charges: BillCharge[] = additionalAmount ? [{ id: 1, category: "Miscellaneous", description: text(legacy.lineDescription, "Additional charge"), quantity: 1, rate: additionalAmount, amount: additionalAmount }] : [];
    return {
      id: number(legacy.id, index + 1),
      number: Number(text(legacy.no).match(/\d+/)?.[0]) || 42 + index,
      billDate: text(legacy.from, "2026-08-01"),
      clientId,
      client: { firmName: client?.firmName ?? text(legacy.partyName, "Customer"), ownerName: client?.ownerName ?? "", address: client?.address ?? "", mobile: client?.mobile ?? text(legacy.partyContact), email: client?.email ?? "" },
      vehicleLines,
      charges,
      advanceReceived: number(legacy.advance),
      paymentMode: "Cash",
      payments: [],
      total: number(legacy.total, calculateBillTotal(vehicleLines, charges)),
      status: (["Paid", "Pending", "Overdue"].includes(text(legacy.status)) ? text(legacy.status) : "Pending") as BillStatus,
    };
  });
  const businessExpenses: BusinessExpense[] = legacyExpenses
    .filter((expense) => text(expense.direction) === "Business cost")
    .map((expense) => ({ id: number(expense.id), date: text(expense.date), category: text(expense.type) === "Maintenance" ? "Maintenance" : "Miscellaneous", description: text(expense.description), purpose: text(expense.description), paidTo: "", reference: text(expense.reference), amount: number(expense.amount) }));
  const employeeExpenses: EmployeeExpense[] = legacyExpenses
    .filter((expense) => text(expense.direction) !== "Business cost")
    .map((expense) => { const employee = employees.find((item) => text(expense.reference).includes(item.name)); return { id: number(expense.id), employeeId: employee?.id ?? 0, employeeName: employee?.name ?? "Unassigned employee", date: text(expense.date), category: "Other", description: text(expense.description), amount: number(expense.amount), treatment: text(expense.direction) === "Driver deduction" ? "Employee deduction" : "Employee reimbursement" }; });

  return {
    ...fallback,
    employees,
    employeeRates,
    employeePayments: [],
    vehicles,
    clients,
    assignments,
    attendance: record(source.attendance) as FleetStore["attendance"],
    vehicleAttendance: {},
    employeeExpenses,
    bills,
    otherBills: Array.isArray(source.otherBills) ? source.otherBills : fallback.otherBills ?? [],
    businessExpenses,
    suppliers: Array.isArray(source.suppliers) ? source.suppliers : fallback.suppliers ?? [],
    supplierPayments: Array.isArray(source.supplierPayments) ? source.supplierPayments : fallback.supplierPayments ?? [],
    quotations: Array.isArray(source.quotations) ? source.quotations : fallback.quotations ?? [],
    nextQuotationNumber: number(source.nextQuotationNumber, fallback.nextQuotationNumber ?? 1),
    nextBillNumber: nextBillNumber(bills, fallback.nextBillNumber),
    nextOtherBillNumber: number(source.nextOtherBillNumber, fallback.nextOtherBillNumber ?? 1),
  };
}

export const emptyStore: FleetStore = {
  schemaVersion: 2,
  company: defaultCompany,
  nextBillNumber: 45,
  nextOtherBillNumber: 1,
  nextQuotationNumber: 1,
  employees: [],
  employeeRates: [],
  employeePayments: [],
  vehicles: [],
  clients: [],
  campaignBookings: [],
  assignments: [],
  attendance: {},
  vehicleAttendance: {},
  campaignAttendance: {},
  employeeExpenses: [],
  advances: [],
  payrollPayments: [],
  bills: [],
  otherBills: [],
  businessExpenses: [],
  suppliers: [],
  supplierPayments: [],
  quotations: [],
};