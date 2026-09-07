import type { View } from "./operations-shell";

/**
 * Maps each View key to a clean URL slug and back.
 * All slugs are lowercase-kebab so they look good in the address bar.
 */
export const VIEW_TO_SLUG: Record<View, string> = {
  overview:            "overview",
  attendance:          "attendance",
  employees:           "employees",
  employeeExpenses:    "employee-expenses",
  employeeAdvances:    "employee-advances",
  vehicles:            "vehicles",
  vehicleAttendance:   "vehicle-attendance",
  clients:             "clients",
  quotations:          "quotations",
  ledgers:             "ledgers",
  campaigns:           "campaigns",
  payroll:             "payroll",
  billing:             "billing",
  otherBilling:        "other-billing",
  otherBillLedgers:    "other-bill-ledgers",
  expenses:            "expenses",
  selfExpenses:        "self-expenses",
  maintenance:         "maintenance",
  maintenanceLedger:   "maintenance-ledger",
  maintenanceProfile:  "maintenance-profile",
  supplierProfiles:    "supplier-profiles",
  bannerPrinting:      "banner-printing",
  pasting:             "pasting",
  recording:           "recording",
  purchase:            "purchase",
  labourCharges:       "labour-charges",
  reports:             "reports",
  employeeReports:     "employee-reports",
  clientReports:       "client-reports",
  maintenanceReports:  "maintenance-reports",
};

// Reverse map: slug → View
export const SLUG_TO_VIEW: Record<string, View> = Object.fromEntries(
  Object.entries(VIEW_TO_SLUG).map(([view, slug]) => [slug, view as View])
);

export const DEFAULT_VIEW: View = "overview";
