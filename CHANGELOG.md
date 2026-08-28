# Changelog

All notable changes to Nirmal are documented in this file.

Versioning follows [Semantic Versioning](https://semver.org/): MAJOR for breaking changes, MINOR for backward-compatible features, and PATCH for backward-compatible fixes.


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
