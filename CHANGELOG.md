# Changelog

All notable changes to Nirmal are documented in this file.

Versioning follows [Semantic Versioning](https://semver.org/): MAJOR for breaking changes, MINOR for backward-compatible features, and PATCH for backward-compatible fixes.


## [5.5.0] - 2026-11-17

### Added

- Quotation print formats Quotation India 17112026 Template Typst and Quotation Export 17112026 Template Typst, built in the Print Format Editor and rendered with Typst. The page frame, logo, page number, and Declaration repeat on every page; HSN codes are grouped in the Description heading, and the Part No is shown when it differs from the item name. The Export format adds the shipping details and Ex-Works price headings.
- Quotation print formats Quotation India 17112026 Template Pluto and Quotation Export 17112026 Template Pluto, rendered with PlutoPrint. The India format uses the selected letter head; the Export format carries its own header with a pink title bar.
- Delivery Note Form 17112026, Sales Order Form 17112026, and Sales Invoice Form 17112026 print formats, rendered with PlutoPrint.
- In these Quotation print formats, Total Before Tax is the Sub Total plus the non-tax charges, so it is correct regardless of the order of rows in the Taxes and Charges table.

## [5.4.0] - 2026-10-05

### Changed

- Creating a Sales Order from a Quotation no longer auto-populates the Customer's Purchase Order No and Date from the Quotation's Purchase Enquiry No and Date.

## [5.3.0] - 2026-09-10

### Added

- Quotation, Sales Order, and Sales Invoice can no longer be submitted if the Customer does not have an Email Id.

### Changed

- A Customer can be created without an Email Id again; it will no longer be disabled automatically.

## [5.2.0] - 2026-08-27

### Added

- Customer Quick Entry now requires an Email ID before it can be saved.

### Changed

- A Customer with no Email ID (own, or via its Primary Contact) is no longer blocked from saving. It is saved and automatically disabled with a warning instead, and stays disabled until a Primary Contact with an Email ID is linked and it is enabled manually.

## [5.1.0] - 2026-08-27

### Added

- PDF template export support.

### Fixed

- Minor bug fixes.

## [5.0.1] - 2026-08-26

### Fixed

- Fixed dialog closing behavior.
- Refactored button click handling.

## [5.0.0] - 2026-08-21

### Added

- Added BOM explosion support in quotations.

### Changed

- Removed the obsolete custom field patch.
- Moved the Purchase Enquiry "By" value to comments.
