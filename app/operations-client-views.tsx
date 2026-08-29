"use client";

import { useState } from "react";
import { ReceiptText, Search } from "lucide-react";
import type { Bill, CampaignBooking, Client, ClientCategory, FleetStore } from "./fleet-domain";
import { Actions, Button, Row, Status, Table } from "./operations-components";
import { CampaignSlotCard } from "./operations-campaigns";
import { ClientLedgerModal } from "./operations-client-ledger";
import { PageHead } from "./operations-reports";
import { billBalance, billPaid, bookingStatus, clientCategories, clientOverallBalance, fmt, money } from "./operations-utils";

type ClientCampaignFilter = "Search" | "Ongoing" | "Completed";

export type ClientsViewProps = {
  store: FleetStore;
  clientCampaignFilter: ClientCampaignFilter;
  clientCategoryFilter: ClientCategory | "All";
  clientSearch: string;
  normalizedClientSearch: string;
  matchingClients: Client[];
  visibleClients: Client[];
  ledgerClientId: number | null;
  setClientCampaignFilter: (filter: ClientCampaignFilter) => void;
  setClientCategoryFilter: (category: ClientCategory | "All") => void;
  setClientSearch: (search: string) => void;
  addClient: () => void;
  openLedger: (clientId: number) => void;
  closeLedger: () => void;
  viewBill: (bill: Bill) => void;
  createBill: (clientId: number) => void;
  editClient: (clientId: number) => void;
  removeClient: (clientId: number) => void;
};

export function ClientsView({ store, clientCampaignFilter, clientCategoryFilter, clientSearch, normalizedClientSearch, matchingClients, visibleClients, ledgerClientId, setClientCampaignFilter, setClientCategoryFilter, setClientSearch, addClient, openLedger, closeLedger, viewBill, createBill, editClient, removeClient }: ClientsViewProps) {
  return <><PageHead title="Client profiles" detail={`${store.clients.length.toLocaleString("en-IN")} contacts available by search, category, or campaign status`} action="Add client" onAction={addClient}/><div className="op-client-filter">{(["Search", "Ongoing", "Completed"] as const).map((filter) => <button className={clientCampaignFilter === filter ? "active" : ""} onClick={() => setClientCampaignFilter(filter)} key={filter}>{filter === "Ongoing" ? "Going on" : filter === "Completed" ? "Campaign done" : "Search"}</button>)}</div><div className="op-category-filter">{(["All", ...clientCategories] as (ClientCategory | "All")[]).map((category) => <button className={clientCategoryFilter === category ? "active" : ""} onClick={() => setClientCategoryFilter(category)} key={category}>{category}</button>)}</div><div className="op-toolbar op-client-search"><label className="op-search"><Search/><input placeholder="Search name, phone, or category" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)}/></label>{(normalizedClientSearch || clientCampaignFilter !== "Search" || clientCategoryFilter !== "All") && <p>Showing <b>{visibleClients.length}</b> of <b>{matchingClients.length.toLocaleString("en-IN")}</b> matches</p>}</div>{visibleClients.length ? <section className="op-client-grid">{visibleClients.map((client) => { const clientBills = store.bills.filter((bill) => bill.clientId === client.id), balance = clientBills.reduce((sum, bill) => sum + billBalance(bill), 0); return <article key={client.id}><header><span>{client.firmName.slice(0, 2).toUpperCase()}</span><div><h2>{client.firmName}</h2><p>{client.ownerName || "Imported contact"}</p></div><Status>{client.status}</Status></header><address>{client.address || "No address saved"}</address><p>{client.mobile || "No phone"}{client.alternatePhone && <><br/>{client.alternatePhone} · Alternate</>}<br/>{client.email || "No email"}{client.dateOfBirth && <><br/>DOB: {fmt(client.dateOfBirth)}</>}</p><div className="op-category-list">{client.categories.length ? client.categories.map((category) => <span key={category}>{category}</span>) : <small>No categories</small>}</div><section className="op-client-balance"><span>Outstanding balance</span><strong>{money(balance)}</strong><small>{clientBills.length} invoices · {store.campaignBookings.filter((booking) => booking.clientId === client.id).length} bookings</small></section><footer><Button secondary onClick={() => openLedger(client.id)}><ReceiptText size={16}/>View ledger</Button><Button secondary onClick={() => createBill(client.id)}>Create bill</Button><Actions edit={() => editClient(client.id)} remove={() => removeClient(client.id)}/></footer></article>; })}</section> : <div className="op-empty-state"><Search/><h2>{clientCampaignFilter === "Ongoing" ? "No campaigns going on" : clientCampaignFilter === "Completed" ? "No completed campaigns" : clientCategoryFilter !== "All" ? `No ${clientCategoryFilter} clients` : normalizedClientSearch ? "No contacts found" : "Search contacts"}</h2><p>{clientCampaignFilter === "Ongoing" ? "Clients appear here while their campaign dates are active." : clientCampaignFilter === "Completed" ? "Clients appear here after a campaign is completed, stopped, or billed." : clientCategoryFilter !== "All" ? `Assign the ${clientCategoryFilter} category to clients to list them here.` : normalizedClientSearch ? "Try a different name, phone number, or category." : "Enter a contact name, phone number, or select a category to view matching clients."}</p></div>}{matchingClients.length > visibleClients.length && <p className="op-result-limit">Refine your search to see the remaining {(matchingClients.length - visibleClients.length).toLocaleString("en-IN")} contacts.</p>}{ledgerClientId && <ClientLedgerModal store={store} clientId={ledgerClientId} close={closeLedger} viewBill={viewBill}/>}</>;
}

export type ClientLedgersViewProps = {
  store: FleetStore;
  ledgerSearch: string;
  normalizedLedgerSearch: string;
  ledgerClients: Client[];
  visibleLedgerClients: Client[];
  ledgerClientId: number | null;
  setLedgerSearch: (search: string) => void;
  openLedger: (clientId: number) => void;
  closeLedger: () => void;
  viewBill: (bill: Bill) => void;
};

export function ClientLedgersView({ store, ledgerSearch, normalizedLedgerSearch, ledgerClients, visibleLedgerClients, ledgerClientId, setLedgerSearch, openLedger, closeLedger, viewBill }: ClientLedgersViewProps) {
  return <><PageHead title="Client ledgers" detail="Campaigns, invoices, receipts, and outstanding balances by client"/><div className="op-toolbar"><label className="op-search"><Search/><input placeholder="Search client name or phone" value={ledgerSearch} onChange={(event) => setLedgerSearch(event.target.value)}/></label><p>{visibleLedgerClients.length} of {ledgerClients.length.toLocaleString("en-IN")} ledgers</p></div>{visibleLedgerClients.length ? <Table headers={["Client", "Contact", "Campaigns", "Invoices", "Total billed", "Received / balance", ""]}>{visibleLedgerClients.map((client) => { const campaigns = store.campaignBookings.filter((booking) => booking.clientId === client.id), bills = store.bills.filter((bill) => bill.clientId === client.id), overall = clientOverallBalance(store, client.id); return <Row key={client.id}><b>{client.firmName}<small>{client.ownerName || "Imported contact"}</small></b><span>{client.mobile || "No phone"}<small>{client.email || "No email"}</small></span><span>{campaigns.length}</span><span>{bills.length}</span><strong>{money(overall.billed)}</strong><span><b>{money(overall.received)} received</b><small style={{ color: overall.outstanding > 0 ? "#9a493d" : "#1f6a53", fontWeight: 600 }}>{money(overall.balance)} outstanding</small></span><Button secondary onClick={() => openLedger(client.id)}><ReceiptText size={16}/>Open ledger</Button></Row>; })}</Table> : <div className="op-empty-state"><ReceiptText/><h2>{normalizedLedgerSearch ? "No clients found" : "No active ledgers"}</h2><p>{normalizedLedgerSearch ? "Try a different client name or phone number." : "Clients appear here after a campaign or invoice is created."}</p></div>}{ledgerClients.length > visibleLedgerClients.length && <p className="op-result-limit">Refine your search to see the remaining {(ledgerClients.length - visibleLedgerClients.length).toLocaleString("en-IN")} ledgers.</p>}{ledgerClientId && <ClientLedgerModal store={store} clientId={ledgerClientId} close={closeLedger} viewBill={viewBill}/>}</>;
}

export type CampaignsViewProps = {
  store: FleetStore;
  campaignSearch: string;
  normalizedCampaignSearch: string;
  filteredCampaignBookings: CampaignBooking[];
  setCampaignSearch: (search: string) => void;
  newBooking: () => void;
  editBooking: (booking: CampaignBooking) => void;
  renewBooking: (booking: CampaignBooking) => void;
  deleteBooking: (booking: CampaignBooking) => void;
  stopBooking: (booking: CampaignBooking) => void;
  generateBill: (booking: CampaignBooking) => void;
};

export function CampaignsView({
  store,
  campaignSearch,
  normalizedCampaignSearch,
  setCampaignSearch,
  newBooking,
  editBooking,
  renewBooking,
  deleteBooking,
  stopBooking,
  generateBill,
}: CampaignsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  const monthOptions = Array.from(
    new Set(
      store.campaignBookings.flatMap((b) => [
        b.month,
        b.startDate.slice(0, 7),
        b.endDate.slice(0, 7),
      ])
    )
  ).filter(Boolean).sort().reverse();

  const displayedBookings = store.campaignBookings.filter((b) => {
    if (
      selectedMonth !== "All" &&
      b.month !== selectedMonth &&
      !b.startDate.startsWith(selectedMonth) &&
      !b.endDate.startsWith(selectedMonth)
    ) {
      return false;
    }
    const status = bookingStatus(b);
    if (selectedStatus !== "All" && status !== selectedStatus) {
      return false;
    }
    const query = campaignSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      b.client.firmName.toLowerCase().includes(query) ||
      (b.client.ownerName || "").toLowerCase().includes(query) ||
      b.client.mobile.includes(query) ||
      status.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <PageHead
        title="Monthly campaign bookings"
        detail="Set vehicle type and quantity; attendance is recorded by party slots"
        action="New booking"
        onAction={newBooking}
      />
      <div className="op-toolbar op-client-search" style={{ flexWrap: "wrap", gap: "10px" }}>
        <label className="op-search" style={{ minWidth: "240px" }}>
          <Search />
          <input
            placeholder="Search campaign by client, phone, or status"
            value={campaignSearch}
            onChange={(event) => setCampaignSearch(event.target.value)}
          />
        </label>
        <label className="op-field" style={{ margin: 0 }}>
          <span>Filter by Month</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="All">All Months</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        </label>
        <div className="op-period-tabs" style={{ display: "flex", gap: "6px" }}>
          {["All", "Active", "Scheduled", "Stopped", "Billed"].map((st) => (
            <Button
              key={st}
              secondary={selectedStatus !== st}
              onClick={() => setSelectedStatus(st)}
            >
              {st}
            </Button>
          ))}
        </div>
        <p style={{ marginLeft: "auto" }}>
          Showing <b>{displayedBookings.length}</b> of <b>{store.campaignBookings.length}</b> campaigns
        </p>
      </div>

      {displayedBookings.length ? (
        <section className="op-campaign-list">
          {displayedBookings.map((booking) => (
            <CampaignSlotCard
              key={booking.id}
              store={store}
              booking={booking}
              edit={() => editBooking(booking)}
              renew={() => renewBooking(booking)}
              deleteBooking={() => deleteBooking(booking)}
              stop={() => stopBooking(booking)}
              generateBill={() => generateBill(booking)}
            />
          ))}
        </section>
      ) : (
        <div className="op-empty-state">
          <Search />
          <h2>
            {campaignSearch || selectedMonth !== "All" || selectedStatus !== "All"
              ? "No matching campaigns found"
              : "No campaign bookings"}
          </h2>
          <p>
            {campaignSearch || selectedMonth !== "All" || selectedStatus !== "All"
              ? "Try selecting another month or adjusting your filters."
              : "Create a monthly booking, select a client, and enter the required count for each vehicle type."}
          </p>
        </div>
      )}
    </>
  );
}