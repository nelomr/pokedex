# Spec Delta

## Purpose

This delta makes the catalog state contract exhaustive: the catalog before its first load starts is treated as loading, and retrying a failed load is a store responsibility.

## MODIFIED Requirements

### Requirement: Distinct Catalog States
The catalog SHALL present loading, error, and empty states as visually and textually distinct from one another and from the populated state. Exactly one catalog state SHALL be rendered at any time. A catalog whose load has not started yet SHALL be presented with the loading state.

#### Scenario: Catalog is loading
- **WHEN** the catalog index has not finished loading
- **THEN** a loading state is shown instead of catalog entries or an error message

#### Scenario: Catalog load has not started
- **WHEN** the catalog index load has not been started yet
- **THEN** the loading state is shown instead of an empty area

#### Scenario: Catalog load fails
- **WHEN** the catalog index fails to load
- **THEN** an error state is shown instead of catalog entries or a loading indicator

#### Scenario: Catalog has no entries
- **WHEN** the catalog index loads successfully but contains no entries
- **THEN** an empty state is shown instead of catalog entries, a loading indicator, or an error message

## ADDED Requirements

### Requirement: Store-Owned Catalog Retry
Retrying a failed catalog load SHALL be exposed as a single store action that resets the failure and starts a new load; callers SHALL NOT mutate the catalog status directly.

#### Scenario: Retry after a failed load
- **WHEN** the catalog is in the error state and the retry action is invoked
- **THEN** the catalog status transitions to loading and a new catalog request is made

#### Scenario: Retry while the catalog is already loaded
- **WHEN** the catalog has loaded successfully and the retry action is invoked
- **THEN** no new catalog request is made and the catalog stays in the success state
