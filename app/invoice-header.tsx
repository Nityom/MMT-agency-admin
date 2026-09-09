import React from "react";
import { CompanyProfile } from "./fleet-domain";

export interface InvoiceHeaderProps {
  title?: string;
  badge?: string;
  company?: Partial<CompanyProfile>;
}

export function InvoiceHeader({
  title = "INVOICE",
  badge,
  company,
}: InvoiceHeaderProps) {
  const compName = company?.name || "Mrunal Multi Task Agency";
  const compAddr = company?.address || "Near Namdev Math, Malgujaripura, Wardha 442 001";
  const compMobile = company?.mobile || "9850545111";
  const compEmail = company?.email || "madhav.bhalerao25@gmail.com";
  const compPan = company?.pan;

  // Auto-detect badge if not explicitly provided
  const derivedBadge = badge || (
    title.toUpperCase().includes("QUOTATION")
      ? "ESTIMATE / QUOTATION"
      : title.toUpperCase().includes("RECEIPT")
      ? "PAYMENT RECEIPT"
      : title.toUpperCase().includes("STATEMENT")
      ? "ACCOUNT STATEMENT"
      : undefined
  );

  return (
    <header className="inv-creative-header">
      {/* Top Colorful Brand Accent Line */}
      <div className="inv-creative-accent-strip" />

      {/* Main Letterhead Body */}
      <div className="inv-creative-body">
        {/* Left Column: Brand & Logo */}
        <div className="inv-creative-brand">
          <img
            src="/logo.png"
            alt={compName}
            className="inv-creative-logo"
          />
        </div>

        {/* Right Column: Document Type & Contact */}
        <div className="inv-creative-info">
          <div className="inv-creative-title-row">
            {derivedBadge && derivedBadge !== "TAX INVOICE" && (
              <span className="inv-creative-pill">{derivedBadge}</span>
            )}
            <h1 className="inv-creative-heading">{title}</h1>
          </div>
          <div className="inv-creative-details">
            <p className="inv-creative-addr">{compAddr}</p>
            <p className="inv-creative-contact">
              <span><b>Mobile:</b> {compMobile}</span>
              <span className="inv-creative-sep">•</span>
              <span><b>Email:</b> {compEmail}</span>
              {compPan && (
                <>
                  <span className="inv-creative-sep">•</span>
                  <span><b>PAN:</b> {compPan}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Separator Line */}
      <div className="inv-creative-divider">
        <div className="inv-creative-divider-accent" />
      </div>
    </header>
  );
}
