# Spec Delta

## Purpose

Defines the observable behavior of browsing the paginated Pokémon catalog, including how entries are displayed, how pagination behaves, and how loading, error, and empty states are presented to the user.

## ADDED Requirements

### Requirement: Single Catalog Load Per Session
The catalog index SHALL be loaded exactly once per session, as a single lightweight request, and reused for all subsequent browsing within that session.

#### Scenario: Catalog is browsed across multiple pages
- **WHEN** the user navigates between pages of the catalog during a session
- **THEN** no additional catalog index request is made beyond the initial load

#### Scenario: Catalog index is already loaded
- **WHEN** the catalog is requested again after having already been loaded in the current session
- **THEN** the previously loaded catalog index is reused without issuing a new request

### Requirement: Catalog Entry Display
Each catalog entry SHALL display the Pokémon's name and a thumbnail image.

#### Scenario: Catalog entries are rendered
- **WHEN** the catalog finishes loading with available entries
- **THEN** each visible entry shows its name and a thumbnail image

### Requirement: Zero-Waterfall Thumbnail Resolution
Thumbnail images for catalog entries SHALL be resolved without issuing any additional per-Pokemon request.

#### Scenario: Catalog page renders thumbnails
- **WHEN** a page of catalog entries is displayed
- **THEN** no additional network request is made per entry to obtain its thumbnail

### Requirement: Catalog Pagination
The catalog SHALL be paginated with 20 entries per page, using 1-indexed page numbers. Forward navigation SHALL be disabled on the last page and backward navigation SHALL be disabled on the first page. The total number of pages SHALL be shown to the user.

#### Scenario: Viewing the first page
- **WHEN** the user is on page 1 of the catalog
- **THEN** backward navigation is disabled and the total page count is shown

#### Scenario: Viewing the last page
- **WHEN** the user is on the last page of the catalog
- **THEN** forward navigation is disabled

#### Scenario: Navigating between pages
- **WHEN** the user navigates forward or backward between pages that are not at a boundary
- **THEN** the catalog displays the corresponding 20 entries for the selected page and both navigation directions remain enabled

### Requirement: Distinct Catalog States
The catalog SHALL present loading, error, and empty states as visually and textually distinct from one another and from the populated state.

#### Scenario: Catalog is loading
- **WHEN** the catalog index has not finished loading
- **THEN** a loading state is shown instead of catalog entries or an error message

#### Scenario: Catalog load fails
- **WHEN** the catalog index fails to load
- **THEN** an error state is shown instead of catalog entries or a loading indicator

#### Scenario: Catalog has no entries
- **WHEN** the catalog index loads successfully but contains no entries
- **THEN** an empty state is shown instead of catalog entries, a loading indicator, or an error message

### Requirement: Catalog Error Feedback and Retry
When loading the catalog fails, the error message shown SHALL match the class of failure (not-found, rate-limited, or network), and the user SHALL be able to retry the load.

#### Scenario: Catalog load fails with a rate-limit error
- **WHEN** the catalog index fails to load due to rate limiting
- **THEN** a message indicating the request was rate-limited is shown and the user can retry the load

#### Scenario: Catalog load fails with a network error
- **WHEN** the catalog index fails to load due to a network error
- **THEN** a message indicating a network failure is shown and the user can retry the load

#### Scenario: Catalog load fails with a not-found error
- **WHEN** the catalog index fails to load because the resource was not found
- **THEN** a message indicating the resource was not found is shown and the user can retry the load

#### Scenario: User retries after a failed load
- **WHEN** the user triggers a retry after a failed catalog load
- **THEN** the catalog load is attempted again
