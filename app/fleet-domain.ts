export type ISODate = string;

export type EmployeeStatus = "Active" | "Inactive";
export type VehicleType = "E-rickshaw" | "Rickshaw";
export type VehicleStatus = "Running" | "Maintenance" | "Inactive";
export type BillStatus = "Paid" | "Pending" | "Overdue";
export type ExpenseTreatment = "Business cost" | "Employee reimbursement" | "Employee deduction";
export type ClientCategory = "Rickshaw" | "E-rickshaw" | "Paper" | "Social media" | "Calendar" | "Other";

export type Employee = {
  id: number;
  name: string;
  status: EmployeeStatus;
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
  date: ISODate;
  category: EmployeeExpenseCategory;
  description: string;
  amount: number;
  treatment: ExpenseTreatment;
};

export type Advance = {
  id: number;
  employeeId: number;
  date: ISODate;
  amount: number;
  recovered: number;
  note: string;
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
};

export type ClientSnapshot = Pick<Client, "firmName" | "ownerName" | "address" | "mobile" | "email">;

export type BillPayment = {
  id: number;
  date: ISODate;
  amount: number;
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
  payments: BillPayment[];
  total: number;
  status: BillStatus;
};

export type BusinessExpenseCategory =
  | "Maintenance"
  | "Printing"
  | "Pasting"
  | "Bond / banner material"
  | "Self travel"
  | "Miscellaneous";

export type BusinessExpensePayment = {
  id: number;
  date: ISODate;
  amount: number;
  reference: string;
  note: string;
};

export type BusinessExpense = {
  id: number;
  date: ISODate;
  clientId?: number;
  clientName?: string;
  category: BusinessExpenseCategory;
  description: string;
  purpose: string;
  paidTo: string;
  reference: string;
  quantity?: number;
  unit?: string;
  supplierRate?: number;
  amount: number;
  clientBillingAmount?: number;
  paidAmount?: number;
  paidDate?: ISODate;
  payments?: BusinessExpensePayment[];
};

export type CompanyProfile = {
  name: string;
  address: string;
  mobile: string;
  email: string;
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
  vehicles: Vehicle[];
  clients: Client[];
  campaignBookings: CampaignBooking[];
  assignments: Assignment[];
  attendance: Record<ISODate, Record<number, boolean>>;
  vehicleAttendance: Record<ISODate, Record<number, boolean>>;
  employeeExpenses: EmployeeExpense[];
  advances: Advance[];
  payrollPayments: PayrollPayment[];
  bills: Bill[];
  businessExpenses: BusinessExpense[];
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

export function weekFor(date: ISODate): { start: ISODate; end: ISODate; payoutDate: ISODate } {
  const value = new Date(`${date}T00:00:00Z`);
  const daysFromMonday = (value.getUTCDay() + 6) % 7;
  const start = addDays(date, -daysFromMonday);
  const end = addDays(start, 6);
  return { start, end, payoutDate: addDays(end, 1) };
}

export function rateOnDate(rates: EmployeeRate[], employeeId: number, date: ISODate): EmployeeRate | undefined {
  return rates
    .filter((rate) => rate.employeeId === employeeId && rate.effectiveFrom <= date && (!rate.effectiveTo || rate.effectiveTo >= date))
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0];
}

export type PayrollPreview = Omit<PayrollPayment, "id" | "status" | "paidAt"> & {
  presentDays: number;
  rateBreakdown: { location: string; dailyRate: number; days: number; amount: number }[];
};

export function calculatePayroll(store: FleetStore, employeeId: number, weekStart: ISODate): PayrollPreview {
  const weekEnd = addDays(weekStart, 6);
  const breakdown = new Map<string, PayrollPreview["rateBreakdown"][number]>();
  let presentDays = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(weekStart, offset);
    if (!store.attendance[date]?.[employeeId]) continue;
    presentDays += 1;
    const rate = rateOnDate(store.employeeRates, employeeId, date);
    if (!rate) continue;
    const key = `${rate.location}:${rate.dailyRate}`;
    const current = breakdown.get(key) ?? { location: rate.location, dailyRate: rate.dailyRate, days: 0, amount: 0 };
    current.days += 1;
    current.amount += rate.dailyRate;
    breakdown.set(key, current);
  }

  const relevantExpenses = store.employeeExpenses.filter((expense) => expense.employeeId === employeeId && expense.date >= weekStart && expense.date <= weekEnd);
  const reimbursements = relevantExpenses.filter((expense) => expense.treatment === "Employee reimbursement").reduce((sum, expense) => sum + expense.amount, 0);
  const deductions = relevantExpenses.filter((expense) => expense.treatment === "Employee deduction").reduce((sum, expense) => sum + expense.amount, 0);
  const gross = [...breakdown.values()].reduce((sum, item) => sum + item.amount, 0);
  const priorPayment = store.payrollPayments.find((payment) => payment.employeeId === employeeId && payment.periodStart === weekStart);
  const outstandingAdvance = store.advances.filter((advance) => advance.employeeId === employeeId).reduce((sum, advance) => sum + Math.max(0, advance.amount - advance.recovered), 0);
  const advanceRecovery = priorPayment?.advanceRecovery ?? Math.min(outstandingAdvance, Math.max(0, gross + reimbursements - deductions));

  return {
    employeeId,
    periodStart: weekStart,
    periodEnd: weekEnd,
    payoutDate: addDays(weekEnd, 1),
    presentDays,
    rateBreakdown: [...breakdown.values()],
    gross,
    reimbursements,
    deductions,
    advanceRecovery,
    net: gross + reimbursements - deductions - advanceRecovery,
  };
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

const defaultCompany: CompanyProfile = {
  name: "MMT Agency",
  address: "Near Namdev Math, Malgujaripura, Wardha 442 001",
  mobile: "9850545111",
  email: "madhav.bhalerao25@gmail.com",
  bankName: "Bank of India",
  accountName: "MMT Agency",
  accountNumber: "",
  ifsc: "",
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
      name: migrated.company.name === "Mrunal Multi Task Agency" ? "MMT Agency" : migrated.company.name,
      accountName: migrated.company.accountName === "Mrunal Multi Task Agency" ? "MMT Agency" : migrated.company.accountName,
    };
    return {
      ...migrated,
      company,
      clients: migrated.clients.map((client) => ({ ...client, categories: Array.isArray(client.categories) ? client.categories : [] })),
      campaignBookings: Array.isArray(migrated.campaignBookings) ? migrated.campaignBookings.map((booking) => ({
        ...booking,
        vehiclePeriods: (Array.isArray(booking.vehiclePeriods) ? booking.vehiclePeriods : [
          ...(booking.rickshawCount ? [{ id: 1, type: "Rickshaw" as const, startDate: booking.startDate, endDate: booking.endDate, quantity: booking.rickshawCount, dailyRate: booking.rickshawDailyRate ?? 0 }] : []),
          ...(booking.eRickshawCount ? [{ id: 2, type: "E-rickshaw" as const, startDate: booking.startDate, endDate: booking.endDate, quantity: booking.eRickshawCount, dailyRate: booking.eRickshawDailyRate ?? 0 }] : []),
        ]).map((period) => ({
          ...period,
          vehicleIds: Array.isArray((period as Partial<CampaignVehiclePeriod>).vehicleIds)
            ? (period as CampaignVehiclePeriod).vehicleIds
            : migrated.vehicles.filter((vehicle) => vehicle.type === period.type).slice(0, period.quantity).map((vehicle) => vehicle.id),
        })),
      })) : [],
      vehicleAttendance: migrated.vehicleAttendance ?? {},
      bills: migrated.bills.map((bill) => ({ ...bill, payments: Array.isArray(bill.payments) ? bill.payments : [] })),
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
    .map((expense) => ({ id: number(expense.id), employeeId: employees.find((employee) => text(expense.reference).includes(employee.name))?.id ?? 0, date: text(expense.date), category: "Other", description: text(expense.description), amount: number(expense.amount), treatment: text(expense.direction) === "Driver deduction" ? "Employee deduction" : "Employee reimbursement" }));

  return {
    ...fallback,
    employees,
    employeeRates,
    vehicles,
    clients,
    assignments,
    attendance: record(source.attendance) as FleetStore["attendance"],
    vehicleAttendance: {},
    employeeExpenses,
    bills,
    businessExpenses,
    nextBillNumber: nextBillNumber(bills, fallback.nextBillNumber),
  };
}

export const emptyStore: FleetStore = {
  schemaVersion: 2,
  company: defaultCompany,
  nextBillNumber: 45,
  employees: [],
  employeeRates: [],
  vehicles: [],
  clients: [],
  campaignBookings: [],
  assignments: [],
  attendance: {},
  vehicleAttendance: {},
  employeeExpenses: [],
  advances: [],
  payrollPayments: [],
  bills: [],
  businessExpenses: [],
};