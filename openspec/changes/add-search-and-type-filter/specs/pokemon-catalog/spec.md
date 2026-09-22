# Spec Delta

## Purpose

This delta narrows pagination to operate over the currently filtered result set rather than the full catalog.

## MODIFIED Requirements

### Requirement: Catalog Pagination
The catalog SHALL be paginated with 20 entries per page, using 1-indexed page numbers, over the currently filtered result set. Forward navigation SHALL be disabled on the last page and backward navigation SHALL be disabled on the first page. The total number of pages SHALL be shown to the user and SHALL reflect the filtered result set.

#### Scenario: Viewing the first page
- **WHEN** the user is on page 1 of the filtered catalog
- **THEN** backward navigation is disabled and the total page count is shown

#### Scenario: Viewing the last page
- **WHEN** the user is on the last page of the filtered catalog
- **THEN** forward navigation is disabled

#### Scenario: Navigating between pages
- **WHEN** the user navigates forward or backward between pages that are not at a boundary
- **THEN** the catalog displays the corresponding 20 entries of the filtered result set for the selected page and both navigation directions remain enabled

#### Scenario: Total page count recomputes when a filter narrows the result set
- **WHEN** a search query or type filter is applied that narrows the catalog to fewer entries
- **THEN** the total page count shown reflects the size of the filtered result set rather than the full catalog
