# Spec Delta

## Purpose

Defines the timeout, retry, and error-classification contract that governs every request the system makes to the public PokéAPI, so callers can react predictably to definitive and transient failures.

## ADDED Requirements

### Requirement: Request Timeout
Every request to the PokéAPI SHALL be aborted if no response is received within 8 seconds, and the abort SHALL surface as a network error.

#### Scenario: Request exceeds the timeout window
- **WHEN** a request to the PokéAPI has not completed after 8 seconds
- **THEN** the request is aborted and a network error is surfaced to the caller

### Requirement: Definitive Failure Handling
A response with status `404`, or any other non-successful status that is not transient (any `4xx` other than `429`), SHALL be treated as a definitive failure: it SHALL NOT be retried and SHALL surface as a not-found error. A definitive failure SHALL NOT be reported as a network error.

#### Scenario: Resource does not exist
- **WHEN** the PokéAPI responds with status `404`
- **THEN** no retry is attempted and a not-found error is surfaced to the caller

#### Scenario: Request is rejected with another client error
- **WHEN** the PokéAPI responds with a `4xx` status other than `404` or `429`
- **THEN** no retry is attempted and a not-found error is surfaced to the caller, not a network error

### Requirement: Transient Failure Retries
A response with status `429` or any `5xx` status SHALL be treated as transient and SHALL be retried up to 2 times, using exponential backoff with jitter of approximately 1 second before the first retry and 2 seconds before the second retry.

#### Scenario: Server returns a transient error
- **WHEN** the PokéAPI responds with status `429` or a `5xx` status
- **THEN** the request is retried, waiting approximately 1 second before the first retry and approximately 2 seconds before the second retry, up to a maximum of 2 retries

### Requirement: Exhausted Retry Classification
When retries are exhausted, the error surfaced to the caller SHALL be classified by the status of the last failed attempt: a last failure of `429` SHALL surface a rate-limit error, and a last failure of `5xx` SHALL surface a network error.

#### Scenario: Retries exhausted after repeated rate limiting
- **WHEN** every attempt, including retries, ends with status `429`
- **THEN** a rate-limit error is surfaced to the caller

#### Scenario: Retries exhausted after repeated server errors
- **WHEN** every attempt, including retries, ends with a `5xx` status
- **THEN** a network error is surfaced to the caller

### Requirement: Connection Loss Handling
A request that fails due to loss of network connectivity SHALL surface as a network error.

#### Scenario: Connection is lost mid-request
- **WHEN** a request to the PokéAPI fails because the connection is lost
- **THEN** a network error is surfaced to the caller

### Requirement: Observable Error Classification
Callers SHALL be able to distinguish not-found, rate-limit, and network failures from one another.

#### Scenario: Caller inspects the failure class
- **WHEN** a request to the PokéAPI fails for any reason
- **THEN** the caller can determine whether the failure is a not-found error, a rate-limit error, or a network error
