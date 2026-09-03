"use client";

import { Check, Printer } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  addDays,
  BusinessExpenseCategory,
  ClientCategory,
  EmployeeExpenseCategory,
  ExpenseTreatment,
  FleetStore,
  getEmployeeCurrentStatus,
  PaymentMode,
  rateOnDate,
} from "./fleet-domain";
import {
  Button,
  FormField,
  FormSelect,
  MaintenancePaymentReceiptModal,
  Modal,
} from "./operations-components";
import {
  amount,
  clientCategories,
  fmt,
  input,
  isoToday,
  money,
  nextId,
} from "./operations-utils";

export type Dialog =
  | "employee"
  | "rate"
  | "vehicle"
  | "client"
  | "employeeExpense"
  | "advance"
  | "businessExpense"
  | "company"
  | null;

export function EntryForm({
  dialog,
  store,
  employeeId,
  clientId,
  vehicleId,
  advanceId,
  close,
  commit,
}: {
  dialog: Exclude<Dialog, null>;
  store: FleetStore;
  employeeId?: number | null;
  clientId?: number | null;
  vehicleId?: number | null;
  advanceId?: number | null;
  close: () => void;
  commit: (store: FleetStore, message: string) => void;
}) {
  const editingAdvance =
    dialog === "advance"
      ? store.advances.find((item) => item.id === advanceId)
      : undefined;
  const editingBusinessExpense =
    dialog === "businessExpense"
      ? store.businessExpenses.find((item) => item.id === clientId)
      : undefined;
  const [expenseClientId, setExpenseClientId] = useState(
    editingBusinessExpense?.clientId ?? 0,
  );
  const [expenseClientQuery, setExpenseClientQuery] = useState(
    editingBusinessExpense?.clientName ?? "",
  );
  const normalizedExpenseClientQuery = expenseClientQuery.trim().toLowerCase();
  const expenseClientMatches = normalizedExpenseClientQuery
    ? store.clients
        .filter((client) =>
          `${client.firmName} ${client.ownerName} ${client.mobile} ${client.alternatePhone ?? ""}`
            .toLowerCase()
            .includes(normalizedExpenseClientQuery),
        )
        .slice(0, 100)
    : [];
  const expenseClientLabel = (client: (typeof store.clients)[number]) =>
    `${client.firmName}${client.mobile ? ` · ${client.mobile}` : ""}`;
  const [expenseQuantity, setExpenseQuantity] = useState(
    editingBusinessExpense?.quantity ?? 0,
  );
  const [expenseSupplierRate, setExpenseSupplierRate] = useState(
    editingBusinessExpense?.supplierRate ??
      (editingBusinessExpense?.quantity
        ? editingBusinessExpense.amount / editingBusinessExpense.quantity
        : editingBusinessExpense?.amount) ??
      0,
  );
  const [expenseDiscount, setExpenseDiscount] = useState(
    editingBusinessExpense?.discount ?? 0,
  );
  const [expenseSupplierBill, setExpenseSupplierBill] = useState(0);
  const [expensePaid, setExpensePaid] = useState(
    editingBusinessExpense?.paidAmount ?? editingBusinessExpense?.amount ?? 0,
  );
  const [expenseClientBill, setExpenseClientBill] = useState(
    editingBusinessExpense?.clientBillingAmount ?? 0,
  );
  const calculatedGrossSupplierBill =
    expenseQuantity > 0
      ? expenseQuantity * expenseSupplierRate
      : expenseSupplierRate;
  const calculatedSupplierBill =
    expenseSupplierBill || Math.max(0, calculatedGrossSupplierBill - expenseDiscount);
  const calculatedSupplierBalance = Math.max(
    0,
    calculatedSupplierBill - expensePaid,
  );
  const calculatedProfit = expenseClientBill - calculatedSupplierBill;
  const editingEmployee =
    dialog === "employee"
      ? store.employees.find((item) => item.id === employeeId)
      : undefined;
  const [employeeStatus, setEmployeeStatus] = useState<"Active" | "Inactive">(
    editingEmployee ? getEmployeeCurrentStatus(editingEmployee) : "Active"
  );
  useEffect(() => {
    if (editingEmployee) {
      setEmployeeStatus(getEmployeeCurrentStatus(editingEmployee));
    }
  }, [editingEmployee]);
  const currentEmployeeRate = editingEmployee
    ? rateOnDate(store.employeeRates, editingEmployee.id, isoToday())
    : undefined;
  const editingClient =
    dialog === "client"
      ? store.clients.find((item) => item.id === clientId)
      : undefined;
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientFirmName, setClientFirmName] = useState(editingClient?.firmName ?? "");
  const [clientOwnerName, setClientOwnerName] = useState(editingClient?.ownerName ?? "");
  const [clientAddress, setClientAddress] = useState(editingClient?.address ?? "");
  const [clientMobile, setClientMobile] = useState(editingClient?.mobile ?? "");
  const [clientAlternatePhone, setClientAlternatePhone] = useState(editingClient?.alternatePhone ?? "");
  const [clientDateOfBirth, setClientDateOfBirth] = useState(editingClient?.dateOfBirth ?? "");
  const [clientEmail, setClientEmail] = useState(editingClient?.email ?? "");
  const [clientCategoriesState, setClientCategoriesState] = useState<ClientCategory[]>(editingClient?.categories ?? []);

  useEffect(() => {
    if (editingClient) {
      setSelectedClientId(editingClient.id);
      setClientFirmName(editingClient.firmName);
      setClientOwnerName(editingClient.ownerName || "");
      setClientAddress(editingClient.address || "");
      setClientMobile(editingClient.mobile || "");
      setClientAlternatePhone(editingClient.alternatePhone || "");
      setClientDateOfBirth(editingClient.dateOfBirth || "");
      setClientEmail(editingClient.email || "");
      setClientCategoriesState(editingClient.categories || []);
    } else {
      setSelectedClientId(null);
      setClientSearchQuery("");
      setClientFirmName("");
      setClientOwnerName("");
      setClientAddress("");
      setClientMobile("");
      setClientAlternatePhone("");
      setClientDateOfBirth("");
      setClientEmail("");
      setClientCategoriesState([]);
    }
  }, [editingClient, dialog]);
  const editingVehicle =
    dialog === "vehicle"
      ? store.vehicles.find((item) => item.id === vehicleId)
      : undefined;
  const titles: Record<Exclude<Dialog, null>, string> = {
    employee: editingEmployee ? "Edit employee and daily rate" : "Add employee",
    rate: "Add rate / transfer",
    vehicle: editingVehicle ? "Edit vehicle" : "Add vehicle",
    client: editingClient ? "Edit client profile" : "Add client",
    employeeExpense: "Record employee expense",
    advance: editingAdvance ? "Edit employee advance" : "Record employee advance",
    businessExpense: editingBusinessExpense
      ? "Edit business expense"
      : "Add business expense",
    company: "Company and bank details",
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let updated = store;
    if (dialog === "employee") {
      const savedEmployeeId = editingEmployee?.id ?? nextId(store.employees);
      const effectiveFrom = input(data, "effectiveFrom");
      const location = input(data, "location");
      const dailyRate = amount(data, "dailyRate");
      const rateChanged =
        !editingEmployee ||
        currentEmployeeRate?.location !== location ||
        currentEmployeeRate.dailyRate !== dailyRate;
      const laterRate = store.employeeRates
        .filter(
          (rate) =>
            rate.employeeId === savedEmployeeId &&
            rate.effectiveFrom > effectiveFrom,
        )
        .sort((left, right) =>
          left.effectiveFrom.localeCompare(right.effectiveFrom),
        )[0];
      const ratesWithoutSameDate = store.employeeRates.filter(
        (rate) =>
          rate.employeeId !== savedEmployeeId ||
          rate.effectiveFrom !== effectiveFrom,
      );
      const employeeRates = rateChanged
        ? [
            ...ratesWithoutSameDate.map((rate) =>
              rate.employeeId === savedEmployeeId &&
              rate.effectiveFrom < effectiveFrom &&
              (!rate.effectiveTo || rate.effectiveTo >= effectiveFrom)
                ? { ...rate, effectiveTo: addDays(effectiveFrom, -1) }
                : rate,
            ),
            {
              id: nextId(store.employeeRates),
              employeeId: savedEmployeeId,
              location,
              dailyRate,
              effectiveFrom,
              ...(laterRate
                ? { effectiveTo: addDays(laterRate.effectiveFrom, -1) }
                : {}),
            },
          ]
        : store.employeeRates;
      const inputStatus = (input(data, "status") || (editingEmployee ? editingEmployee.status : "Active")) as "Active" | "Inactive";
      const activeFrom = input(data, "activeFrom") || undefined;
      const inactiveFrom = input(data, "inactiveFrom") || undefined;
      let finalStatus: "Active" | "Inactive" = inputStatus;

      if (inputStatus === "Inactive") {
        if (activeFrom && isoToday() >= activeFrom) {
          finalStatus = "Active";
        } else {
          finalStatus = "Inactive";
        }
      } else {
        if (inactiveFrom && isoToday() >= inactiveFrom) {
          finalStatus = "Inactive";
        } else {
          finalStatus = "Active";
        }
      }

      updated = {
        ...store,
        employees: editingEmployee
          ? store.employees.map((employee) =>
              employee.id === savedEmployeeId
                ? {
                    ...employee,
                    name: input(data, "name"),
                    status: finalStatus,
                    monthlySalary: amount(data, "monthlySalary"),
                    activeFrom,
                    inactiveFrom,
                  }
                : employee,
            )
          : [
              ...store.employees,
              {
                id: savedEmployeeId,
                name: input(data, "name"),
                status: finalStatus,
                monthlySalary: amount(data, "monthlySalary"),
                activeFrom,
                inactiveFrom,
              },
            ],
        employeeRates,
      };
    }
    if (dialog === "rate") {
      const employeeId = amount(data, "employeeId"),
        effectiveFrom = input(data, "effectiveFrom"),
        previousDay = addDays(effectiveFrom, -1);
      updated = {
        ...store,
        employeeRates: [
          ...store.employeeRates.map((rate) =>
            rate.employeeId === employeeId &&
            !rate.effectiveTo &&
            rate.effectiveFrom < effectiveFrom
              ? { ...rate, effectiveTo: previousDay }
              : rate,
          ),
          {
            id: nextId(store.employeeRates),
            employeeId,
            location: input(data, "location"),
            dailyRate: amount(data, "dailyRate"),
            effectiveFrom,
          },
        ],
      };
    }
    if (dialog === "vehicle") {
      const vehicle = {
        number: input(data, "number").toUpperCase(),
        type: input(data, "vehicleType") as "E-rickshaw" | "Rickshaw",
        status: (editingVehicle ? input(data, "vehicleStatus") : "Running") as
          | "Running"
          | "Maintenance"
          | "Inactive",
      };
      updated = {
        ...store,
        vehicles: editingVehicle
          ? store.vehicles.map((item) =>
              item.id === editingVehicle.id ? { ...item, ...vehicle } : item,
            )
          : [...store.vehicles, { id: nextId(store.vehicles), ...vehicle }],
      };
    }
    if (dialog === "client") {
      const activeClientId = editingClient?.id ?? selectedClientId;
      const profile = {
        firmName: clientFirmName.trim() || input(data, "firmName"),
        ownerName: clientOwnerName.trim() || input(data, "ownerName"),
        address: clientAddress.trim() || input(data, "address"),
        mobile: clientMobile.trim() || input(data, "mobile"),
        alternatePhone: clientAlternatePhone.trim() || input(data, "alternatePhone"),
        dateOfBirth: clientDateOfBirth.trim() || input(data, "dateOfBirth"),
        email: clientEmail.trim() || input(data, "email"),
        categories: clientCategoriesState,
        status: (editingClient ? input(data, "status") : "Active") as
          | "Active"
          | "Inactive",
      };
      updated = {
        ...store,
        clients: activeClientId
          ? store.clients.map((client) =>
              client.id === activeClientId
                ? { ...client, ...profile }
                : client,
            )
          : [...store.clients, { id: nextId(store.clients), ...profile }],
      };
    }
    if (dialog === "employeeExpense") {
      const employeeId = amount(data, "employeeId");
      updated = {
        ...store,
        employeeExpenses: [
          ...store.employeeExpenses,
          {
            id: nextId(store.employeeExpenses),
            employeeId,
            employeeName:
              store.employees.find((employee) => employee.id === employeeId)
                ?.name ?? "Unassigned employee",
            date: input(data, "date"),
            category: input(data, "category") as EmployeeExpenseCategory,
            description: input(data, "description"),
            amount: amount(data, "amount"),
            treatment: input(data, "treatment") as ExpenseTreatment,
          },
        ],
      };
    }
    if (dialog === "advance") {
      const employeeId = amount(data, "employeeId");
      const advanceData = {
        employeeId,
        employeeName:
          store.employees.find((employee) => employee.id === employeeId)
            ?.name ?? "Unassigned employee",
        date: input(data, "date"),
        amount: amount(data, "amount"),
        recovered: editingAdvance ? editingAdvance.recovered : 0,
        note: input(data, "note"),
      };
      updated = {
        ...store,
        advances: editingAdvance
          ? store.advances.map((item) =>
              item.id === editingAdvance.id ? { ...item, ...advanceData } : item,
            )
          : [
              ...store.advances,
              {
                id: nextId(store.advances),
                ...advanceData,
              },
            ],
      };
    }
    if (dialog === "businessExpense") {
      const grossBillAmount =
        amount(data, "quantity") > 0
          ? amount(data, "quantity") * amount(data, "supplierRate")
          : amount(data, "supplierRate");
      const discountVal = amount(data, "discount");
      const supplierBillAmount =
        amount(data, "amount") || Math.max(0, grossBillAmount - discountVal);
      const selectedClient = store.clients.find(
        (client) => client.id === expenseClientId,
      );
      if (!selectedClient) return;
      const expense = {
        id: editingBusinessExpense?.id ?? nextId(store.businessExpenses),
        date: input(data, "date"),
        clientId: selectedClient.id,
        clientName: selectedClient.firmName,
        category: (input(data, "category") as BusinessExpenseCategory) || "Printing",
        description: input(data, "description").trim() || "Maintenance work",
        purpose: input(data, "purpose"),
        paidTo: input(data, "paidTo"),
        reference: input(data, "reference"),
        quantity: amount(data, "quantity"),
        unit: input(data, "unit"),
        supplierRate: amount(data, "supplierRate"),
        discount: discountVal,
        amount: supplierBillAmount,
        clientBillingAmount: amount(data, "clientBillingAmount"),
        paidAmount: Math.min(supplierBillAmount, amount(data, "paidAmount")),
        paidDate: input(data, "paidDate"),
        payments: editingBusinessExpense?.payments ?? [],
      };
      updated = {
        ...store,
        businessExpenses: editingBusinessExpense
          ? store.businessExpenses.map((item) =>
              item.id === expense.id ? expense : item,
            )
          : [...store.businessExpenses, expense],
      };
    }
    if (dialog === "company")
      updated = {
        ...store,
        company: {
          name: input(data, "companyName"),
          address: input(data, "address"),
          mobile: input(data, "mobile"),
          email: input(data, "email"),
          pan: input(data, "pan").toUpperCase(),
          bankName: input(data, "bankName"),
          accountName: input(data, "accountName"),
          accountNumber: input(data, "accountNumber"),
          ifsc: input(data, "ifsc").toUpperCase(),
          branch: input(data, "branch"),
        },
      };
    commit(updated, `${titles[dialog]} saved`);
  };
  const employeeOptions = store.employees.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  return (
    <Modal title={titles[dialog]} close={close}>
      <form
        className={`op-form ${dialog === "businessExpense" ? "op-business-expense-form" : ""}`}
        onSubmit={submit}
      >
        {dialog === "employee" && (
          <>
            <div className="op-form-grid">
              <FormField
                label="Full name"
                name="name"
                defaultValue={editingEmployee?.name}
                required
              />
              <FormField
                label="Monthly salary (₹)"
                name="monthlySalary"
                type="number"
                defaultValue={editingEmployee?.monthlySalary ?? 0}
                required
              />
            </div>
            {editingEmployee && (
              <label className="op-field">
                <span>Status</span>
                <select
                  name="status"
                  value={employeeStatus}
                  onChange={(e) => setEmployeeStatus(e.target.value as "Active" | "Inactive")}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            )}
            <div className="op-form-grid">
              <FormField
                label={editingEmployee ? "Location" : "Starting location"}
                name="location"
                defaultValue={currentEmployeeRate?.location}
                required
              />
              <FormField
                label="Daily rate (₹ per day)"
                name="dailyRate"
                type="number"
                defaultValue={currentEmployeeRate?.dailyRate}
                required
              />
            </div>
            <div className="op-form-grid">
              {employeeStatus === "Inactive" ? (
                <FormField
                  label="Active date (Optional)"
                  name="activeFrom"
                  type="date"
                  defaultValue=""
                />
              ) : (
                <FormField
                  label="Inactive date (Optional)"
                  name="inactiveFrom"
                  type="date"
                  defaultValue=""
                />
              )}
              <FormField
                label={editingEmployee ? "Rate effective from" : "Rate effective from"}
                name="effectiveFrom"
                type="date"
                defaultValue={editingEmployee ? (currentEmployeeRate?.effectiveFrom ?? isoToday()) : isoToday()}
                required
              />
            </div>
          </>
        )}
        {dialog === "rate" && (
          <>
            <FormSelect
              label="Employee"
              name="employeeId"
              options={employeeOptions}
              required
            />
            <div className="op-form-grid">
              <FormField label="New location" name="location" required />
              <FormField
                label="New daily rate"
                name="dailyRate"
                type="number"
                required
              />
            </div>
            <FormField
              label="Effective from exact date"
              name="effectiveFrom"
              type="date"
              defaultValue={isoToday()}
              required
            />
          </>
        )}
        {dialog === "vehicle" && (
          <>
            <div className="op-form-grid">
              <FormField
                label="Vehicle number"
                name="number"
                defaultValue={editingVehicle?.number}
                required
              />
              <FormSelect
                label="Vehicle type"
                name="vehicleType"
                defaultValue={editingVehicle?.type}
                options={[
                  { value: "E-rickshaw", label: "E-rickshaw" },
                  { value: "Rickshaw", label: "Rickshaw" },
                ]}
                required
              />
            </div>
            {editingVehicle && (
              <FormSelect
                label="Vehicle status"
                name="vehicleStatus"
                defaultValue={editingVehicle.status}
                options={[
                  { value: "Running", label: "Running" },
                  { value: "Maintenance", label: "Maintenance" },
                  { value: "Inactive", label: "Inactive" },
                ]}
                required
              />
            )}
          </>
        )}
        {dialog === "client" && (
          <>
            {!editingClient && (
              <div style={{ marginBottom: "14px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px", textTransform: "uppercase" }}>
                  Search and pick from existing contacts ({store.clients.length.toLocaleString("en-IN")} available)
                </span>
                <input
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #94a3b8", borderRadius: "6px", fontSize: "14px" }}
                  placeholder="Type name, phone, or firm to search contacts..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                />
                {clientSearchQuery.trim() && (
                  <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#ffffff", marginTop: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                    {store.clients
                      .filter((c) =>
                        `${c.firmName} ${c.ownerName || ""} ${c.mobile || ""} ${c.alternatePhone || ""} ${c.address || ""}`
                          .toLowerCase()
                          .includes(clientSearchQuery.trim().toLowerCase())
                      )
                      .slice(0, 50)
                      .map((c) => (
                        <div
                          key={c.id}
                          style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "13px" }}
                          onMouseDown={() => {
                            setSelectedClientId(c.id);
                            setClientFirmName(c.firmName);
                            setClientOwnerName(c.ownerName || "");
                            setClientAddress(c.address || "");
                            setClientMobile(c.mobile || "");
                            setClientAlternatePhone(c.alternatePhone || "");
                            setClientDateOfBirth(c.dateOfBirth || "");
                            setClientEmail(c.email || "");
                            setClientCategoriesState(c.categories || []);
                            setClientSearchQuery("");
                          }}
                        >
                          <b>{c.firmName}</b> {c.ownerName ? `· ${c.ownerName}` : ""} {c.mobile ? `· ${c.mobile}` : ""} {c.address ? `· ${c.address}` : ""}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            <div className="op-form-grid">
              <label className="op-field">
                <span>Firm name</span>
                <input
                  name="firmName"
                  value={clientFirmName}
                  onChange={(e) => setClientFirmName(e.target.value)}
                  placeholder="Firm / Client Name"
                  required
                />
              </label>
              <label className="op-field">
                <span>Concerned person name</span>
                <input
                  name="ownerName"
                  value={clientOwnerName}
                  onChange={(e) => setClientOwnerName(e.target.value)}
                  placeholder="Contact person"
                />
              </label>
            </div>
            <label className="op-field">
              <span>Address</span>
              <input
                name="address"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Client address / Location"
              />
            </label>
            <div className="op-form-grid">
              <label className="op-field">
                <span>Mobile number</span>
                <input
                  name="mobile"
                  value={clientMobile}
                  onChange={(e) => setClientMobile(e.target.value)}
                  placeholder="+91..."
                />
              </label>
              <label className="op-field">
                <span>Alternate phone</span>
                <input
                  name="alternatePhone"
                  value={clientAlternatePhone}
                  onChange={(e) => setClientAlternatePhone(e.target.value)}
                  placeholder="Alternate contact number"
                />
              </label>
            </div>
            <label className="op-field">
              <span>Date of birth</span>
              <input
                name="dateOfBirth"
                type="date"
                value={clientDateOfBirth}
                onChange={(e) => setClientDateOfBirth(e.target.value)}
              />
            </label>
            <fieldset className="op-check-group">
              <legend>Client categories</legend>
              {clientCategories.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    name="categories"
                    value={category}
                    checked={clientCategoriesState.includes(category)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setClientCategoriesState((prev) => [...prev, category]);
                      } else {
                        setClientCategoriesState((prev) => prev.filter((c) => c !== category));
                      }
                    }}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </fieldset>
            <div className="op-form-grid">
              <label className="op-field">
                <span>Mail ID</span>
                <input
                  name="email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </label>
              {editingClient && (
                <FormSelect
                  label="Status"
                  name="status"
                  defaultValue={editingClient.status}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                  required
                />
              )}
            </div>
          </>
        )}
        {dialog === "employeeExpense" && (
          <>
            <FormSelect
              label="Employee"
              name="employeeId"
              options={employeeOptions}
              required
            />
            <div className="op-form-grid">
              <FormField
                label="Date"
                name="date"
                type="date"
                defaultValue={isoToday()}
                required
              />
              <FormSelect
                label="Category"
                name="category"
                options={[
                  "Breakfast",
                  "Tea",
                  "Ticket",
                  "Railway pass",
                  "Meal",
                  "Puncture repair",
                  "Other",
                ].map((value) => ({ value, label: value }))}
                required
              />
            </div>
            <FormField label="Details" name="description" required />
            <div className="op-form-grid">
              <FormField label="Amount" name="amount" type="number" required />
              <FormSelect
                label="Treatment"
                name="treatment"
                options={[
                  { value: "Business cost", label: "Company paid" },
                  {
                    value: "Employee reimbursement",
                    label: "Reimburse employee",
                  },
                  { value: "Employee deduction", label: "Deduct from salary" },
                ]}
                required
              />
            </div>
          </>
        )}
        {dialog === "advance" && (
          <>
            <p className="op-form-note">
              This amount is recorded against the employee and recovered
              automatically from upcoming salary without reducing pay below
              zero.
            </p>
            <FormSelect
              label="Employee"
              name="employeeId"
              defaultValue={editingAdvance ? editingAdvance.employeeId : (employeeId ?? undefined)}
              options={employeeOptions}
              required
            />
            <div className="op-form-grid">
              <FormField
                label="Advance date"
                name="date"
                type="date"
                defaultValue={editingAdvance ? editingAdvance.date : isoToday()}
                required
              />
              <FormField
                label="Advance amount"
                name="amount"
                type="number"
                min={1}
                defaultValue={editingAdvance ? editingAdvance.amount : undefined}
                required
              />
            </div>
            <FormField
              label="Reason / note"
              name="note"
              defaultValue={editingAdvance ? editingAdvance.note : undefined}
            />
          </>
        )}
        {dialog === "businessExpense" && (
          <label className="op-field">
            <span>
              Client / party
              {normalizedExpenseClientQuery
                ? ` (${expenseClientMatches.length}${expenseClientMatches.length === 100 ? "+" : ""} matches)`
                : ""}
            </span>
            <input
              list="expense-client-options"
              value={expenseClientQuery}
              placeholder="Type client name or phone, then select"
              onChange={(event) => {
                const query = event.target.value;
                const selectedClient = store.clients.find(
                  (client) => expenseClientLabel(client) === query,
                );
                setExpenseClientQuery(query);
                setExpenseClientId(selectedClient?.id ?? 0);
                const legacyInput =
                  event.currentTarget.form?.elements.namedItem("clientName");
                if (legacyInput instanceof HTMLInputElement)
                  legacyInput.value = selectedClient?.firmName ?? "";
              }}
              autoComplete="off"
              required
            />
            <datalist id="expense-client-options">
              {expenseClientMatches.map((client) => (
                <option value={expenseClientLabel(client)} key={client.id} />
              ))}
            </datalist>
          </label>
        )}
        {dialog === "businessExpense" && (
          <>
            <div className="op-form-grid">
              <FormField
                label="Date"
                name="date"
                type="date"
                defaultValue={editingBusinessExpense?.date ?? isoToday()}
                required
              />
              <FormSelect
                label="Account"
                name="category"
                defaultValue={editingBusinessExpense?.category}
                options={[
                  "Maintenance",
                  "Printing",
                  "Pasting",
                  "Bond / banner material",
                  "Self travel",
                  "Miscellaneous",
                ].map((value) => ({ value, label: value }))}
                required
              />
            </div>
            <div className="op-form-grid">
              <FormField
                label="Client / party"
                name="clientName"
                defaultValue={editingBusinessExpense?.clientName}
                required
              />
              <FormField
                label="Supplier / printer name"
                name="paidTo"
                defaultValue={editingBusinessExpense?.paidTo ?? "Ravi Printing"}
                required
              />
            </div>
            <FormField
              label="Work / banner type (optional)"
              name="description"
              defaultValue={editingBusinessExpense?.description}
            />
            <div className="op-form-grid">
              <FormField
                label="Purpose / details"
                name="purpose"
                defaultValue={editingBusinessExpense?.purpose}
              />
              <FormField
                label="Vehicle / reference"
                name="reference"
                defaultValue={editingBusinessExpense?.reference}
              />
            </div>
            <div className="op-form-grid">
              <label className="op-field">
                <span>Quantity / square feet</span>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  value={expenseQuantity || ""}
                  onChange={(event) =>
                    setExpenseQuantity(Number(event.target.value))
                  }
                />
              </label>
              <FormField
                label="Unit"
                name="unit"
                defaultValue={editingBusinessExpense?.unit ?? "sq ft"}
              />
            </div>
            <div className="op-form-grid">
              <label className="op-field">
                <span>Supplier rate</span>
                <input
                  name="supplierRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseSupplierRate}
                  onChange={(event) =>
                    setExpenseSupplierRate(event.target.value === "" ? 0 : Number(event.target.value))
                  }
                />
              </label>
              <label className="op-field">
                <span>Discount</span>
                <input
                  name="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseDiscount || ""}
                  onChange={(event) =>
                    setExpenseDiscount(Number(event.target.value))
                  }
                  placeholder="Discount amount"
                />
              </label>
            </div>
            <div className="op-form-grid">
              <label className="op-field">
                <span>Supplier billing amount</span>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  value={expenseSupplierBill || ""}
                  placeholder={
                    calculatedSupplierBill
                      ? String(calculatedSupplierBill)
                      : "Auto from quantity × rate - discount"
                  }
                  onChange={(event) =>
                    setExpenseSupplierBill(Number(event.target.value))
                  }
                />
              </label>
            </div>
            <div className="op-form-grid">
              <label className="op-field">
                <span>Amount paid to supplier</span>
                <input
                  name="paidAmount"
                  type="number"
                  min="0"
                  max={calculatedSupplierBill || undefined}
                  value={expensePaid || ""}
                  onChange={(event) =>
                    setExpensePaid(Number(event.target.value))
                  }
                />
              </label>
              <FormField
                label="Supplier payment date"
                name="paidDate"
                type="date"
                defaultValue={editingBusinessExpense?.paidDate}
              />
            </div>
            <label className="op-field">
              <span>Amount charged to client</span>
              <input
                name="clientBillingAmount"
                type="number"
                min="0"
                value={expenseClientBill || ""}
                onChange={(event) =>
                  setExpenseClientBill(Number(event.target.value))
                }
              />
            </label>
            <section className="op-expense-margin">
              <p>
                <span>Supplier bill</span>
                <b>{money(calculatedSupplierBill)}</b>
              </p>
              <p>
                <span>Supplier balance</span>
                <strong>{money(calculatedSupplierBalance)}</strong>
              </p>
              <p>
                <span>Your profit</span>
                <b className={calculatedProfit < 0 ? "loss" : ""}>
                  {money(calculatedProfit)}
                </b>
              </p>
            </section>
          </>
        )}
        {dialog === "company" && (
          <>
            <FormField
              label="Company name"
              name="companyName"
              defaultValue={store.company.name}
              required
            />
            <FormField
              label="Company address"
              name="address"
              defaultValue={store.company.address}
              required
            />
            <div className="op-form-grid">
              <FormField
                label="Mobile number"
                name="mobile"
                defaultValue={store.company.mobile}
                required
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                defaultValue={store.company.email}
              />
            </div>
            <FormField
              label="PAN number"
              name="pan"
              defaultValue={store.company.pan}
            />
            <div className="op-form-grid">
              <FormField
                label="Bank name"
                name="bankName"
                defaultValue={store.company.bankName}
                required
              />
              <FormField
                label="Branch name"
                name="branch"
                defaultValue={store.company.branch}
                required
              />
            </div>
            <FormField
              label="Account holder name"
              name="accountName"
              defaultValue={store.company.accountName}
              required
            />
            <div className="op-form-grid">
              <FormField
                label="Account number"
                name="accountNumber"
                defaultValue={store.company.accountNumber}
                required
              />
              <FormField
                label="IFSC code"
                name="ifsc"
                defaultValue={store.company.ifsc}
                required
              />
            </div>
          </>
        )}
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            Save
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function MaintenanceEntryForm({
  category,
  expense,
  supplierName,
  store,
  close,
  save,
}: {
  category?: BusinessExpenseCategory;
  expense?: FleetStore["businessExpenses"][number];
  supplierName?: string;
  store: FleetStore;
  close: () => void;
  save: (expense: FleetStore["businessExpenses"][number]) => void;
}) {
  const [quantity, setQuantity] = useState(expense?.quantity ?? 0);
  const [supplierRate, setSupplierRate] = useState(expense?.supplierRate ?? expense?.amount ?? 0);
  const [discount, setDiscount] = useState(expense?.discount ?? 0);
  const [clientBillingAmount, setClientBillingAmount] = useState(expense?.clientBillingAmount ?? 0);
  const [clientSearch, setClientSearch] = useState(expense?.clientName ?? "");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState(expense?.campaignId ?? 0);
  const [showReceipt, setShowReceipt] = useState(false);
  const grossAmount = quantity > 0 ? quantity * supplierRate : supplierRate;
  const calculatedAmount = Math.max(0, grossAmount - discount);
  const calculatedProfit = clientBillingAmount > 0 ? clientBillingAmount - calculatedAmount : 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const campaignId = selectedCampaignId || amount(data, "campaignId");
    const campaign = store.campaignBookings.find(
      (item) => item.id === campaignId,
    );
    const clientId = campaign?.clientId ?? amount(data, "clientId");
    const client = store.clients.find((item) => item.id === clientId);
    const manualClientName = input(data, "clientName").trim();
    const supplierBill = calculatedAmount;
    const clientBillingVal = amount(data, "clientBillingAmount");
    save({
      id: expense?.id ?? nextId(store.businessExpenses),
      date: input(data, "date"),
      ...(client
        ? { clientId: client.id, clientName: manualClientName || client.firmName }
        : campaign
          ? {
              clientId: campaign.clientId,
              clientName: campaign.client.firmName,
            }
              : manualClientName ? { clientName: manualClientName } : {}),
      ...(campaign ? { campaignId: campaign.id } : {}),
      category: (category ?? input(data, "category") ?? "Printing") as BusinessExpenseCategory,
      description: input(data, "description").trim() || `${category || input(data, "category") || "Maintenance"} work`,
      purpose: input(data, "purpose"),
      paidTo: supplierName ?? input(data, "paidTo"),
      reference: input(data, "reference"),
      quantity,
      unit: input(data, "unit"),
      supplierRate,
      discount,
      amount: supplierBill,
      clientBillingAmount: clientBillingVal,
      paidAmount: expense?.paidAmount ?? 0,
      payments: expense?.payments ?? [],
    });
  };
  const categories: BusinessExpenseCategory[] = [
    "Printing",
    "Pasting",
    "Recording",
    "Purchase",
    "Labour charges",
  ];
  return (
    <Modal
      title={
        expense
          ? "Edit maintenance work"
          : supplierName
            ? `Add charge · ${supplierName}`
            : "Add maintenance work"
      }
      close={close}
    >
      <form className="op-form" onSubmit={submit}>
        <div className="op-form-grid">
          <FormField
            label="Date"
            name="date"
            type="date"
            defaultValue={expense?.date ?? isoToday()}
            required
          />
          <FormSelect
            label="Work category"
            name="category"
            options={categories.map((cat) => ({
              value: cat,
              label: cat === "Printing" ? "Banner printing" : cat,
            }))}
            defaultValue={expense?.category ?? category}
            required
          />
        </div>
        <div className="op-form-grid">
          <label className="op-field">
            <span>Supplied to client (optional)</span>
            <input name="clientName" value={clientSearch} placeholder="Search or enter client name" onChange={(event) => setClientSearch(event.target.value)} />
            <select name="clientId" defaultValue={expense?.clientId ?? ""} onChange={(event) => setClientSearch(store.clients.find((client) => client.id === Number(event.target.value))?.firmName ?? "")}>
              <option value="">No linked client</option>
              {store.clients.filter((client) => `${client.firmName} ${client.mobile}`.toLowerCase().includes(clientSearch.trim().toLowerCase())).map((client) => <option value={client.id} key={client.id}>{client.firmName} · {client.mobile}</option>)}
            </select>
          </label>
          <label className="op-field">
            <span>From campaign (optional)</span>
            <input
              placeholder="Search campaign by client or date"
              value={campaignSearch}
              onChange={(event) => setCampaignSearch(event.target.value)}
            />
            <select
              name="campaignId"
              value={selectedCampaignId || ""}
              onChange={(event) => {
                const id = Number(event.target.value);
                setSelectedCampaignId(id);
                const camp = store.campaignBookings.find((c) => c.id === id);
                if (camp) {
                  setClientSearch(camp.client.firmName);
                }
              }}
            >
              <option value="">No linked campaign</option>
              {store.campaignBookings
                .filter((campaign) => {
                  const query = campaignSearch.trim().toLowerCase();
                  if (!query) return true;
                  return (
                    campaign.client.firmName.toLowerCase().includes(query) ||
                    (campaign.client.ownerName || "").toLowerCase().includes(query) ||
                    campaign.client.mobile.includes(query) ||
                    campaign.startDate.includes(query) ||
                    campaign.endDate.includes(query) ||
                    String(campaign.id).includes(query)
                  );
                })
                .map((campaign) => (
                  <option value={campaign.id} key={campaign.id}>
                    {campaign.client.firmName} · {fmt(campaign.startDate)} to {fmt(campaign.endDate)}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <FormField label="Work / item details (optional)" name="description" defaultValue={expense?.description} />
        <div className="op-form-grid">
          {supplierName ? (
            <p className="op-form-note">
              Supplier: <b>{supplierName}</b>
            </p>
          ) : (
            <FormField label="Supplier profile name" name="paidTo" defaultValue={expense?.paidTo} required />
          )}
          <FormField label="Reference / vehicle" name="reference" defaultValue={expense?.reference} />
        </div>
        <FormField label="Purpose / notes" name="purpose" defaultValue={expense?.purpose} />
        <div className="op-form-grid">
          <label className="op-field">
            <span>Quantity / sq ft</span>
            <input
              name="quantity"
              type="number"
              min="0"
              step="any"
              value={quantity || ""}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>
          <FormSelect
            label="Unit"
            name="unit"
            defaultValue={expense?.unit ?? "sq ft"}
            options={[
              { value: "sq ft", label: "Square feet" },
              { value: "units", label: "Units" },
              { value: "job", label: "Job" },
            ]}
          />
        </div>
        <div className="op-form-grid">
          <label className="op-field">
            <span>Supplier rate / charge</span>
            <input
              name="supplierRate"
              type="number"
              min="0"
              step="0.01"
              value={supplierRate}
              onChange={(event) => setSupplierRate(event.target.value === "" ? 0 : Number(event.target.value))}
            />
          </label>
          <label className="op-field">
            <span>Discount (optional)</span>
            <input
              name="discount"
              type="number"
              min="0"
              step="0.01"
              value={discount || ""}
              onChange={(event) => setDiscount(Number(event.target.value))}
              placeholder="Discount amount"
            />
          </label>
        </div>
        <div className="op-form-grid">
          <label className="op-field">
            <span>Amount charged to client</span>
            <input
              name="clientBillingAmount"
              type="number"
              min="0"
              step="0.01"
              value={clientBillingAmount || ""}
              onChange={(event) => setClientBillingAmount(Number(event.target.value))}
              placeholder="Client billing amount"
            />
          </label>
        </div>
        <section className="op-maintenance-calculation">
          <span>Gross charge</span>
          <strong>{money(grossAmount)}</strong>
          {discount > 0 && (
            <>
              <span>Discount</span>
              <strong className="op-profit">- {money(discount)}</strong>
            </>
          )}
          <span>Calculated net supplier bill</span>
          <strong>{money(calculatedAmount)}</strong>
          <small>
            {quantity > 0
              ? `${quantity} × ${money(supplierRate)}${discount > 0 ? ` - ${money(discount)} discount` : ""}`
              : discount > 0
                ? `${money(supplierRate)} - ${money(discount)} discount`
                : "Enter quantity for quantity × rate, or use rate as the total"}
          </small>
          <span>Amount charged to client</span>
          <strong>{money(clientBillingAmount)}</strong>
          <span>Calculated profit</span>
          <strong className={calculatedProfit < 0 ? "op-loss" : "op-profit"}>
            {money(calculatedProfit)}
          </strong>
        </section>
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          {(expense?.paidAmount || (expense?.payments?.length ?? 0) > 0) && (
            <Button secondary onClick={() => setShowReceipt(true)}>
              <Printer size={16} />
              Generate receipt
            </Button>
          )}
          <Button type="submit">
            <Check size={17} />
            Save record
          </Button>
        </footer>
      </form>
      {showReceipt && (
        <MaintenancePaymentReceiptModal
          store={store}
          paidTo={supplierName ?? expense?.paidTo ?? "Supplier"}
          description={expense?.description}
          category={expense?.category ?? category}
          payment={{
            date: expense?.paidDate ?? expense?.date ?? isoToday(),
            amount: expense?.paidAmount || (expense?.payments?.[0]?.amount ?? calculatedAmount),
            mode: expense?.payments?.[0]?.mode ?? "Cash",
            reference: expense?.reference,
          }}
          close={() => setShowReceipt(false)}
        />
      )}
    </Modal>
  );
}