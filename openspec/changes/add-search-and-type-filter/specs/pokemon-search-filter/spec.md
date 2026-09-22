# Spec Delta

## Purpose

Defines the observable behavior of narrowing the Pokémon catalog by name search and by type, including how the two filters combine, how filtering is debounced, and how a no-results state is presented.

## ADDED Requirements

### Requirement: Name Search Filtering
The catalog SHALL be filtered by a case-insensitive partial match against each entry's name when a search query is provided.

#### Scenario: Searching by a partial name
- **WHEN** the user enters a partial Pokémon name in the search field
- **THEN** only entries whose name contains that text, case-insensitively, are shown

#### Scenario: Clearing the search query
- **WHEN** the user clears the search field
- **THEN** the catalog is no longer filtered by name

### Requirement: Debounced Search Input
Filtering by name SHALL NOT be re-evaluated on every keystroke; it SHALL be applied after a short pause in typing.

#### Scenario: Typing in the search field
- **WHEN** the user types several characters in quick succession
- **THEN** the catalog is filtered once after the user pauses typing, not after each individual keystroke

### Requirement: Type Filtering
The catalog SHALL be narrowed to Pokémon belonging to a selected type, and clearing the type selection SHALL restore the unfiltered set with respect to type.

#### Scenario: Selecting a type
- **WHEN** the user selects a Pokémon type
- **THEN** only entries belonging to that type are shown

#### Scenario: Clearing the selected type
- **WHEN** the user clears the selected type
- **THEN** the catalog is no longer filtered by type

### Requirement: Combined Search and Type Filtering
Name search and type filtering SHALL combine so that only entries satisfying both conditions are shown.

#### Scenario: Searching within a selected type
- **WHEN** the user has both a search query and a selected type active
- **THEN** only entries matching the search query and belonging to the selected type are shown

### Requirement: Filter Change Resets Pagination
Changing either the search query or the selected type SHALL return the user to the first page of results.

#### Scenario: Changing the search query while on a later page
- **WHEN** the user changes the search query while viewing a page other than the first
- **THEN** the displayed page returns to the first page of the newly filtered results

#### Scenario: Changing the selected type while on a later page
- **WHEN** the user changes the selected type while viewing a page other than the first
- **THEN** the displayed page returns to the first page of the newly filtered results

### Requirement: No-Results State
A distinct no-results state SHALL be shown when the active filters exclude every catalog entry, separate from the loading, error, and empty-catalog states.

#### Scenario: Filters exclude every entry
- **WHEN** the applied search query and/or selected type match no catalog entries
- **THEN** a no-results state is shown instead of catalog entries, a loading indicator, an error message, or the empty-catalog state

### Requirement: Per-Type Data Fetched At Most Once Per Session
Data required to filter by a given type SHALL be fetched at most once per session; re-selecting an already-fetched type SHALL NOT issue a new request.

#### Scenario: Selecting the same type again
- **WHEN** the user selects a type that has already been selected earlier in the session
- **THEN** no additional request is made to retrieve that type's data

### Requirement: Type Filter Failure Handling
A failure to load data for a selected type SHALL surface a filter-scoped error without affecting the already-loaded catalog.

#### Scenario: Type data fails to load
- **WHEN** the data required to filter by the selected type fails to load
- **THEN** a filter-scoped error is shown and the already-loaded catalog remains browsable

### Requirement: Search Mode Selection
The user SHALL be able to choose whether the search matches by name or by number, and the active mode SHALL be visibly indicated at all times.

#### Scenario: The active mode is indicated
- **WHEN** the user views the search controls
- **THEN** the currently active search mode (name or number) is visibly indicated

#### Scenario: The user switches mode
- **WHEN** the user selects the other search mode
- **THEN** subsequent searches match according to the newly selected mode

### Requirement: Search by Exact Number
In number mode, the catalog SHALL be narrowed to the entry whose number matches the entered value exactly.

#### Scenario: An existing number matches exactly one entry
- **WHEN** the user, in number mode, enters a number that belongs to a catalog entry
- **THEN** only that entry is shown

#### Scenario: A number no Pokémon carries yields no results
- **WHEN** the user, in number mode, enters a number that does not belong to any catalog entry
- **THEN** no entries are shown

#### Scenario: A number that is a prefix of other numbers does not match those other entries
- **WHEN** the user, in number mode, enters a number that is a prefix of other, longer numbers in the catalog
- **THEN** only the entry whose number matches exactly is shown, and entries whose number merely starts with the entered digits are excluded

### Requirement: Entries Without a Resolvable Number
Entries whose number cannot be resolved SHALL be excluded from number-mode results and MUST NOT be treated as any numeric value.

#### Scenario: An unresolvable entry is excluded from a number search
- **WHEN** the catalog contains an entry whose number cannot be resolved
- **THEN** that entry is never returned by a number-mode search, for any entered value

#### Scenario: That same entry is still findable by name
- **WHEN** the user switches to name mode and searches for that entry's name
- **THEN** the entry is shown as a normal name-search match

### Requirement: Search Mode Change Resets Query and Page
Changing the search mode SHALL clear the current query and return the user to the first page.

#### Scenario: Switching mode with an active query
- **WHEN** the user has an active search query and switches search mode
- **THEN** the search query is cleared and no results are excluded by the previous query

#### Scenario: Switching mode while on a later page
- **WHEN** the user is viewing a page other than the first and switches search mode
- **THEN** the displayed page returns to the first page

### Requirement: Mode-Restricted Input
The search input SHALL accept only values valid for the active mode, rejecting text in number mode.

#### Scenario: Non-numeric characters are rejected in number mode
- **WHEN** the user, in number mode, attempts to enter a non-numeric character
- **THEN** that character is not accepted into the search query

#### Scenario: The input communicates the active search mode to assistive technology
- **WHEN** a user relying on assistive technology focuses the search input
- **THEN** the announced label reflects the currently active search mode
