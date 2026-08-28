"use client";

import {
  Banknote,
  Check,
  FileText,
  Plus,
  ReceiptText,
  Trash2,
  Truck,
  WalletCards,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { BusinessExpenseCategory, FleetStore } from "./fleet-domain";
import { Button, FormField, Modal } from "./operations-components";
import { Metric, PageHead } from "./operations-reports";
import {
  amount,
  fmt,
  input,
  isoToday,
  money,
  nextId,
  supplierBalance,
  supplierPaid,
} from "./operations-utils";

function SupplierPaymentModal({
  expense,
  close,
  save,
}: {
  expense: FleetStore["businessExpenses"][number];
  close: () => void;
  save: (
    date: string,
    paidAmount: number,
    reference: string,
    note: string,
  ) => void;
}) {
  const balance = supplierBalance(expense);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget),
      paidAmount = amount(data, "amount");
    if (paidAmount > balance) {
      const field = event.currentTarget.elements.namedItem(
        "amount",
      ) as HTMLInputElement;
      field.setCustomValidity(
        `Amount cannot exceed the balance of ${money(balance)}.`,
      );
      field.reportValidity();
      return;
    }
    save(
      input(data, "date"),
      paidAmount,
      input(data, "reference"),
      input(data, "note"),
    );
  };
  return (
    <Modal title={`Supplier installment · ${expense.paidTo}`} close={close}>
      <form className="op-form" onSubmit={submit}>
        <p className="op-form-note">
          Account: {expense.category} · Bill: {money(expense.amount)} · Paid:{" "}
          {money(supplierPaid(expense))} · Balance: {money(balance)}
        </p>
        <div className="op-form-grid">
          <FormField
            label="Payment date"
            name="date"
            type="date"
            defaultValue={isoToday()}
            required
          />
          <FormField
            label="Installment amount"
            name="amount"
            type="number"
            min={1}
            required
          />
        </div>
        <FormField label="Transaction / receipt reference" name="reference" />
        <FormField label="Note" name="note" />
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            Save installment
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function SelfExpenseForm({
  close,
  save,
}: {
  close: () => void;
  save: (expense: FleetStore["businessExpenses"][number]) => void;
}) {
  const [category] = useState<"Self travel" | "Self stay">(
    "Self travel",
  );
  const [items, setItems] = useState([{ id: 1, name: "", amount: 0 }]);
  const expenseAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const tourDate = input(data, "tourDate") || input(data, "paidDate") || isoToday();
    const savedItems = items
      .filter((item) => item.name.trim() && item.amount > 0)
      .map((item) => ({ ...item, name: item.name.trim() }));
    if (!savedItems.length) return;
    save({
      id: 0,
      date: tourDate,
      tourName: input(data, "tourName"),
      category,
      description: input(data, "description"),
      purpose: input(data, "purpose"),
      paidTo: "",
      reference: "",
      amount: expenseAmount,
      clientBillingAmount: 0,
      paidAmount: expenseAmount,
      paidDate: input(data, "paidDate"),
      payments: [],
      fromLocation: input(data, "fromLocation"),
      toLocation: input(data, "toLocation"),
      items: savedItems,
    });
  };
  return (
    <Modal title="Add self expense record" close={close}>
      <form className="op-form op-self-expense-form" onSubmit={submit}>
        <div className="op-form-grid">
          <FormField label="Tour name" name="tourName" required />
          <FormField
            label="Payment date"
            name="paidDate"
            type="date"
            defaultValue={isoToday()}
            required
          />
        </div>
        <FormField label="Tour date (optional)" name="tourDate" type="date" />
        <div className="op-form-grid">
          <FormField
            label={category === "Self travel" ? "Travel from" : "Home / origin"}
            name="fromLocation"
            required
          />
          <FormField
            label={category === "Self travel" ? "Travel to" : "Stay location"}
            name="toLocation"
            required
          />
        </div>
        <FormField
          label={
            category === "Self travel"
              ? "Travel details"
              : "Hotel / stay details"
          }
          name="description"
          required
        />
        <FormField label="Description" name="purpose" required />
        <section className="op-self-expense-items">
          <div className="op-section-title">
            <h2>Expense items</h2>
            <Button
              secondary
              onClick={() =>
                setItems((current) => [
                  ...current,
                  { id: nextId(current), name: "", amount: 0 },
                ])
              }
            >
              <Plus size={16} />
              Add item
            </Button>
          </div>
          {items.map((item, index) => (
            <div className="op-self-expense-item" key={item.id}>
              <label className="op-field">
                <span>Field name</span>
                <input
                  value={item.name}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, name: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  required
                />
              </label>
              <label className="op-field">
                <span>Amount</span>
                <input
                  type="number"
                  min="1"
                  value={item.amount || ""}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              amount: Number(event.target.value) || 0,
                            }
                          : entry,
                      ),
                    )
                  }
                  required
                />
              </label>
              <button
                className="op-icon"
                type="button"
                title={`Remove item ${index + 1}`}
                disabled={items.length === 1}
                onClick={() =>
                  setItems((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="op-self-expense-item-total">
            <span>Total amount</span>
            <strong>{money(expenseAmount)}</strong>
          </div>
        </section>
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            Save record
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function SelfExpensesView({
  store,
  setStore,
  notify,
}: {
  store: FleetStore;
  setStore: React.Dispatch<React.SetStateAction<FleetStore>>;
  notify: (message: string) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const records = store.businessExpenses
    .filter(
      (expense) =>
        expense.category === "Self travel" || expense.category === "Self stay",
    )
    .sort((left, right) => right.date.localeCompare(left.date));
  const travelTotal = records
    .filter((expense) => expense.category === "Self travel")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const stayTotal = records
    .filter((expense) => expense.category === "Self stay")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const removeRecord = (id: number) => {
    if (!window.confirm("Delete this self expense record?")) return;
    setStore((current) => ({
      ...current,
      businessExpenses: current.businessExpenses.filter(
        (expense) => expense.id !== id,
      ),
    }));
    notify("Self expense deleted");
  };
  return (
    <>
      <PageHead
        title="Self expenses"
        detail="Complete travel and stay expense records"
        action="Add expense record"
        onAction={() => setFormOpen(true)}
      />
      <section className="op-metrics three">
        <Metric
          label="Total self expenses"
          value={money(travelTotal + stayTotal)}
          detail={`${records.length} saved records`}
          icon={ReceiptText}
        />
        <Metric
          label="Travel expenses"
          value={money(travelTotal)}
          detail={`${records.filter((expense) => expense.category === "Self travel").length} travel records`}
          icon={Truck}
        />
        <Metric
          label="Stay expenses"
          value={money(stayTotal)}
          detail={`${records.filter((expense) => expense.category === "Self stay").length} stay records`}
          icon={WalletCards}
        />
      </section>
      {records.length ? (
        <section className="op-self-expense-list">
          {records.map((expense) => (
            <article key={expense.id}>
              <header>
                <div>
                  <span>
                    {expense.category === "Self travel" ? "Travel" : "Stay"}
                  </span>
                  <h2>{expense.description}</h2>
                  <p>
                    {fmt(expense.startDate ?? expense.date)} to{" "}
                    {fmt(expense.endDate ?? expense.date)} ·{" "}
                    {expense.fromLocation || "Origin not saved"} to{" "}
                    {expense.toLocation || "Destination not saved"}
                  </p>
                </div>
                <strong>{money(expense.amount)}</strong>
              </header>
              <p>{expense.purpose}</p>
              <footer>
                <small>Paid {fmt(expense.paidDate ?? expense.date)}</small>
                <span>
                  <button
                    className="op-icon"
                    title="Delete self expense"
                    onClick={() => removeRecord(expense.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <div className="op-empty-state">
          <ReceiptText />
          <h2>No self expenses</h2>
          <p>Add a travel or stay expense to begin the record history.</p>
        </div>
      )}
      {formOpen && (
        <SelfExpenseForm
          close={() => setFormOpen(false)}
          save={(expense) => {
            const saved = { ...expense, id: nextId(store.businessExpenses) };
            setStore((current) => ({
              ...current,
              businessExpenses: [...current.businessExpenses, saved],
            }));
            setFormOpen(false);
            notify("Self expense saved");
          }}
        />
      )}
    </>
  );
}

function SelfExpenseEditorForm({
  expense,
  close,
  save,
}: {
  expense?: FleetStore["businessExpenses"][number] | null;
  close: () => void;
  save: (expense: FleetStore["businessExpenses"][number]) => void;
}) {
  const [category] = useState<"Self travel" | "Self stay">(
    expense?.category === "Self stay" ? "Self stay" : "Self travel",
  );
  const [items, setItems] = useState(
    expense?.items?.length
      ? expense.items
      : [{ id: 1, name: "Expense", amount: expense?.amount ?? 0 }],
  );
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const tourDate = input(data, "tourDate") || input(data, "paidDate") || isoToday();
    const savedItems = items
      .filter((item) => item.name.trim() && item.amount > 0)
      .map((item) => ({ ...item, name: item.name.trim() }));
    if (!savedItems.length) return;
    save({
      ...expense,
      id: expense?.id ?? 0,
      date: tourDate,
      tourName: input(data, "tourName"),
      category,
      description: input(data, "description"),
      purpose: input(data, "purpose"),
      paidTo: "",
      reference: "",
      amount: total,
      clientBillingAmount: 0,
      paidAmount: total,
      paidDate: input(data, "paidDate"),
      payments: [],
      fromLocation: input(data, "fromLocation"),
      toLocation: input(data, "toLocation"),
      items: savedItems,
    });
  };
  return (
    <Modal
      title={expense ? "Edit self expense record" : "Add self expense record"}
      close={close}
    >
      <form className="op-form op-self-expense-form" onSubmit={submit}>
        <div className="op-form-grid">
          <FormField label="Tour name" name="tourName" defaultValue={expense?.tourName ?? expense?.description} required />
          <FormField
            label="Payment date"
            name="paidDate"
            type="date"
            defaultValue={expense?.paidDate ?? isoToday()}
            required
          />
        </div>
        <FormField label="Tour date (optional)" name="tourDate" type="date" defaultValue={expense?.date} />
        <div className="op-form-grid">
          <FormField
            label={category === "Self travel" ? "Travel from" : "Home / origin"}
            name="fromLocation"
            defaultValue={expense?.fromLocation}
            required
          />
          <FormField
            label={category === "Self travel" ? "Travel to" : "Stay location"}
            name="toLocation"
            defaultValue={expense?.toLocation}
            required
          />
        </div>
        <FormField
          label={
            category === "Self travel"
              ? "Travel details"
              : "Hotel / stay details"
          }
          name="description"
          defaultValue={expense?.description}
          required
        />
        <FormField
          label="Description"
          name="purpose"
          defaultValue={expense?.purpose}
          required
        />
        <section className="op-self-expense-items">
          <div className="op-section-title">
            <h2>Expense items</h2>
            <Button
              secondary
              onClick={() =>
                setItems((current) => [
                  ...current,
                  { id: nextId(current), name: "", amount: 0 },
                ])
              }
            >
              <Plus size={16} />
              Add item
            </Button>
          </div>
          {items.map((item, index) => (
            <div className="op-self-expense-item" key={item.id}>
              <label className="op-field">
                <span>Field name</span>
                <input
                  value={item.name}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, name: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  required
                />
              </label>
              <label className="op-field">
                <span>Amount</span>
                <input
                  type="number"
                  min="1"
                  value={item.amount || ""}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              amount: Number(event.target.value) || 0,
                            }
                          : entry,
                      ),
                    )
                  }
                  required
                />
              </label>
              <button
                className="op-icon"
                type="button"
                title={`Remove item ${index + 1}`}
                disabled={items.length === 1}
                onClick={() =>
                  setItems((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="op-self-expense-item-total">
            <span>Total amount</span>
            <strong>{money(total)}</strong>
          </div>
        </section>
        <footer>
          <Button secondary onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check size={17} />
            {expense ? "Save changes" : "Save record"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function EditableSelfExpensesView({
  store,
  setStore,
  notify,
}: {
  store: FleetStore;
  setStore: React.Dispatch<React.SetStateAction<FleetStore>>;
  notify: (message: string) => void;
}) {
  const [editingExpense, setEditingExpense] = useState<
    FleetStore["businessExpenses"][number] | null | undefined
  >(undefined);
  const records = store.businessExpenses
    .filter(
      (expense) =>
        expense.category === "Self travel" || expense.category === "Self stay",
    )
    .sort((left, right) => right.date.localeCompare(left.date));
  const travelTotal = records
    .filter((expense) => expense.category === "Self travel")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const stayTotal = records
    .filter((expense) => expense.category === "Self stay")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const removeRecord = (id: number) => {
    if (!window.confirm("Delete this self expense record?")) return;
    setStore((current) => ({
      ...current,
      businessExpenses: current.businessExpenses.filter(
        (expense) => expense.id !== id,
      ),
    }));
    notify("Self expense deleted");
  };
  const saveRecord = (expense: FleetStore["businessExpenses"][number]) => {
    const saved = {
      ...expense,
      id: expense.id || nextId(store.businessExpenses),
    };
    setStore((current) => ({
      ...current,
      businessExpenses: current.businessExpenses.some(
        (item) => item.id === saved.id,
      )
        ? current.businessExpenses.map((item) =>
            item.id === saved.id ? saved : item,
          )
        : [...current.businessExpenses, saved],
    }));
    setEditingExpense(undefined);
    notify(expense.id ? "Self expense updated" : "Self expense saved");
  };
  return (
    <>
      <PageHead
        title="Self expenses"
        detail="Complete travel and stay expense records"
        action="Add expense record"
        onAction={() => setEditingExpense(null)}
      />
      <section className="op-metrics three">
        <Metric
          label="Total self expenses"
          value={money(travelTotal + stayTotal)}
          detail={`${records.length} saved records`}
          icon={ReceiptText}
        />
        <Metric
          label="Travel expenses"
          value={money(travelTotal)}
          detail={`${records.filter((expense) => expense.category === "Self travel").length} travel records`}
          icon={Truck}
        />
        <Metric
          label="Stay expenses"
          value={money(stayTotal)}
          detail={`${records.filter((expense) => expense.category === "Self stay").length} stay records`}
          icon={WalletCards}
        />
      </section>
      {records.length ? (
        <section className="op-self-expense-list">
          {records.map((expense) => (
            <article key={expense.id}>
              <header>
                <div>
                  <span>
                    {expense.category === "Self travel" ? "Travel" : "Stay"}
                  </span>
                  <h2>{expense.description}</h2>
                  <p>
                    {fmt(expense.startDate ?? expense.date)} to{" "}
                    {fmt(expense.endDate ?? expense.date)} ·{" "}
                    {expense.fromLocation || "Origin not saved"} to{" "}
                    {expense.toLocation || "Destination not saved"}
                  </p>
                </div>
                <strong>{money(expense.amount)}</strong>
              </header>
              <p>{expense.purpose}</p>
              {expense.items?.length ? (
                <div className="op-self-expense-item-list">
                  {expense.items.map((item) => (
                    <span key={item.id}>
                      <b>{item.name}</b>
                      <strong>{money(item.amount)}</strong>
                    </span>
                  ))}
                </div>
              ) : null}
              <footer>
                <small>Paid {fmt(expense.paidDate ?? expense.date)}</small>
                <span>
                  <button
                    className="op-icon"
                    title="Edit self expense"
                    onClick={() => setEditingExpense(expense)}
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    className="op-icon"
                    title="Delete self expense"
                    onClick={() => removeRecord(expense.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <div className="op-empty-state">
          <ReceiptText />
          <h2>No self expenses</h2>
          <p>Add a travel or stay expense to begin the record history.</p>
        </div>
      )}
      {editingExpense !== undefined && (
        <SelfExpenseEditorForm
          expense={editingExpense}
          close={() => setEditingExpense(undefined)}
          save={saveRecord}
        />
      )}
    </>
  );
}

export function BusinessAccountLedger({
  store,
  savePayment,
}: {
  store: FleetStore;
  savePayment: (
    expenseId: number,
    date: string,
    paidAmount: number,
    reference: string,
    note: string,
  ) => void;
}) {
  const categories: BusinessExpenseCategory[] = [
    "Maintenance",
    "Printing",
    "Pasting",
    "Bond / banner material",
    "Self travel",
    "Miscellaneous",
  ];
  const [account, setAccount] = useState<BusinessExpenseCategory>(
    categories[0],
  );
  const [paymentExpense, setPaymentExpense] = useState<
    FleetStore["businessExpenses"][number] | null
  >(null);
  const records = store.businessExpenses
    .filter((expense) => expense.category === account)
    .sort((left, right) => right.date.localeCompare(left.date));
  return (
    <section className="op-account-ledger">
      <div className="op-section-title">
        <div>
          <h2>Business ledger by account</h2>
          <p>
            Supplier bills and installment history for each expense account.
          </p>
        </div>
      </div>
      <div className="op-period-tabs">
        {categories.map((category) => (
          <button
            className={account === category ? "active" : ""}
            onClick={() => setAccount(category)}
            key={category}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="op-account-ledger-summary">
        <span>{records.length} records</span>
        <b>
          Billed{" "}
          {money(records.reduce((sum, expense) => sum + expense.amount, 0))}
        </b>
        <b>
          Paid{" "}
          {money(
            records.reduce((sum, expense) => sum + supplierPaid(expense), 0),
          )}
        </b>
        <strong>
          Balance{" "}
          {money(
            records.reduce((sum, expense) => sum + supplierBalance(expense), 0),
          )}
        </strong>
      </div>
      {records.length ? (
        records.map((expense) => (
          <article className="op-account-entry" key={expense.id}>
            <header>
              <div>
                <b>{expense.paidTo}</b>
                <span>
                  {expense.clientName} · {fmt(expense.date)}
                </span>
              </div>
              <div>
                <b>{money(expense.amount)} bill</b>
                <strong>{money(supplierBalance(expense))} balance</strong>
              </div>
            </header>
            <p>
              {expense.description}
              {expense.reference ? ` · ${expense.reference}` : ""}
            </p>
            <div className="op-installment-list">
              {expense.paidAmount && expense.paidAmount > 0 ? (
                <span>
                  <b>{fmt(expense.paidDate ?? expense.date)}</b>Opening payment{" "}
                  <strong>{money(expense.paidAmount)}</strong>
                </span>
              ) : null}
              {(expense.payments ?? []).map((payment) => (
                <span key={payment.id}>
                  <b>{fmt(payment.date)}</b>
                  {payment.reference || payment.note || "Installment"}
                  <strong>{money(payment.amount)}</strong>
                </span>
              ))}
            </div>
            {supplierBalance(expense) > 0 && (
              <Button secondary onClick={() => setPaymentExpense(expense)}>
                <Banknote size={16} />
                Add installment
              </Button>
            )}
          </article>
        ))
      ) : (
        <div className="op-empty-state">
          <ReceiptText />
          <h2>No {account.toLowerCase()} records</h2>
          <p>Add a business expense under this account to start its ledger.</p>
        </div>
      )}
      {paymentExpense && (
        <SupplierPaymentModal
          expense={paymentExpense}
          close={() => setPaymentExpense(null)}
          save={(date, paidAmount, reference, note) => {
            savePayment(paymentExpense.id, date, paidAmount, reference, note);
            setPaymentExpense(null);
          }}
        />
      )}
    </section>
  );
}