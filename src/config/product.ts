/**
 * Product facts used in legal pages, support links and emails. Rankoya is the
 * official product name and app.rankoya.uk its production host; change them
 * here and every page follows. Support and agency mailboxes are assumed.
 */
export const PRODUCT = {
  name: "Rankoya",
  company: "NETSACH TECH LTD",
  /** Postal address used in the legal documents. Confirm against the registered office. */
  address: "3568 Dodge Street, Omaha, NE 68131",
  /** Governing law and data protection regulator for the legal documents. */
  jurisdiction: "England and Wales",
  appUrl: "https://app.rankoya.uk/",
  marketingUrl: "https://rankoya.uk/",
  supportEmail: "support@rankoya.uk",
  agencyEmail: "agency@rankoya.uk",
} as const;
