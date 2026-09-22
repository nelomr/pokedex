# pokemon-detail

## ADDED Requirements

### Requirement: Open the detail modal from a catalog card
The system SHALL open an accessible detail modal for a Pokémon when the user activates its catalog card, and SHALL request that Pokémon's detail data at most once per identifier per session.

#### Scenario: Card click opens the modal
- **WHEN** the user clicks a catalog card for a Pokémon
- **THEN** a modal opens showing that Pokémon's detail content

#### Scenario: Card is keyboard operable
- **WHEN** the user moves focus to a catalog card and presses Enter or Space
- **THEN** the modal opens for that Pokémon, identically to a click

#### Scenario: Detail data is fetched once per Pokémon
- **WHEN** the user opens, closes, and reopens the modal for the same Pokémon
- **THEN** exactly one detail request is issued for that Pokémon

#### Scenario: Concurrent opens do not duplicate a request
- **WHEN** a detail request for a Pokémon is already in flight and the same Pokémon is requested again
- **THEN** no second request is issued and both callers resolve from the single in-flight request

### Requirement: Detail content
The modal SHALL present the Pokémon's name, national ID, official artwork, types, abilities, base stats, height, and weight, using SI units derived from the PokéAPI response.

#### Scenario: Detail fields are rendered
- **WHEN** the modal is open with successfully loaded detail data
- **THEN** the Pokémon's name, ID, types, abilities, and each base stat with its value are visible

#### Scenario: Height and weight are converted to SI units
- **WHEN** the API returns `height: 7` (decimetres) and `weight: 69` (hectograms)
- **THEN** the mapped domain model exposes `0.7` metres and `6.9` kilograms

#### Scenario: Missing or non-numeric measurements are safe
- **WHEN** the API response omits height or weight, or carries a non-numeric value
- **THEN** the mapper yields `null` for that measurement and the modal renders a placeholder instead of `NaN`

#### Scenario: Artwork failure falls back to the placeholder
- **WHEN** the official artwork image fails to load
- **THEN** the local placeholder image is displayed in its place

### Requirement: Modal loading and error states
The modal SHALL render distinct loading, error, and loaded states, and an error SHALL offer a retry that re-issues the detail request for that Pokémon.

#### Scenario: Loading state while the request is in flight
- **WHEN** the modal opens and the detail request has not yet resolved
- **THEN** the modal renders a loading state rather than empty or partial detail content

#### Scenario: Cached detail skips the loading state entirely
- **WHEN** the modal opens for a Pokémon whose detail is already cached
- **THEN** the loaded state renders immediately and no loading state is shown

#### Scenario: Failure renders a typed error with retry
- **WHEN** the detail request fails with a `NotFoundError`, `RateLimitError`, or `NetworkError`
- **THEN** the modal renders an error state whose message corresponds to that failure class and exposes a retry action

#### Scenario: Retry re-issues the request
- **WHEN** the user activates retry from the error state
- **THEN** a new detail request is issued for that Pokémon and the modal returns to the loading state

#### Scenario: A failed detail request does not affect the catalog
- **WHEN** a detail request fails
- **THEN** the catalog list status and error remain unchanged and the catalog stays browsable after the modal is closed

### Requirement: Loading skeleton
While a detail request is in flight the modal SHALL render a content-shaped skeleton placeholder whose layout mirrors the loaded detail — artwork, title, type badges, and stat rows — so that the modal's dimensions do not change when the real content replaces it. The skeleton SHALL be marked `aria-busy="true"` and SHALL NOT expose its placeholder blocks as readable content to assistive technology.

#### Scenario: Skeleton replaces a generic loading indicator
- **WHEN** the modal is in its loading state
- **THEN** the skeleton placeholder is rendered in place of the detail content, with placeholder blocks for the artwork, the title, the type badges, and each stat row

#### Scenario: Layout does not shift when data arrives
- **WHEN** the detail request resolves and the loaded content replaces the skeleton
- **THEN** the modal surface's dimensions are unchanged from those it had while the skeleton was displayed

#### Scenario: Skeleton is announced as busy, not as content
- **WHEN** the skeleton is rendered
- **THEN** its container carries `aria-busy="true"` and its placeholder blocks are hidden from assistive technology

#### Scenario: Skeleton is removed on failure
- **WHEN** the detail request fails
- **THEN** the skeleton is removed and the error state with its retry action is rendered in its place

#### Scenario: Reduced motion suppresses the shimmer
- **WHEN** the user's system requests reduced motion
- **THEN** the skeleton renders as static placeholder blocks with no shimmer animation

### Requirement: WAI-ARIA dialog semantics
The modal SHALL implement the WAI-ARIA dialog pattern: `role="dialog"`, `aria-modal="true"`, and an accessible name provided through `aria-labelledby` referencing the modal title.

#### Scenario: Dialog attributes are present
- **WHEN** the modal is open
- **THEN** its root element carries `role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` whose value is the id of the visible modal title

#### Scenario: Content outside the dialog is inert to assistive technology
- **WHEN** the modal is open
- **THEN** the page content behind the modal is not reachable by sequential keyboard navigation

### Requirement: Focus management
The modal SHALL move focus into itself on open, trap Tab and Shift+Tab within its focusable elements while open, and restore focus to the triggering element on close.

#### Scenario: Focus moves into the dialog on open
- **WHEN** the modal opens
- **THEN** focus is placed on the first focusable element inside the modal

#### Scenario: Tab wraps forward at the last element
- **WHEN** focus is on the last focusable element inside the modal and the user presses Tab
- **THEN** focus moves to the first focusable element inside the modal

#### Scenario: Shift+Tab wraps backward at the first element
- **WHEN** focus is on the first focusable element inside the modal and the user presses Shift+Tab
- **THEN** focus moves to the last focusable element inside the modal

#### Scenario: Focus returns to the trigger on close
- **WHEN** the modal is closed by any means
- **THEN** focus is restored to the catalog card that opened it

### Requirement: Dismissal
The modal SHALL close on Escape, on activation of its close control, and on a click on the backdrop outside the modal surface, and SHALL NOT close on a click inside the modal surface.

#### Scenario: Escape closes the modal
- **WHEN** the modal is open and the user presses Escape
- **THEN** the modal closes

#### Scenario: Backdrop click closes the modal
- **WHEN** the user clicks the backdrop outside the modal surface
- **THEN** the modal closes

#### Scenario: Inside click does not close the modal
- **WHEN** the user clicks inside the modal surface
- **THEN** the modal stays open

#### Scenario: Close control closes the modal
- **WHEN** the user activates the modal's close control
- **THEN** the modal closes

### Requirement: Body scroll lock without layout shift
While the modal is open the system SHALL prevent scrolling of the page behind it, compensating for the removed scrollbar width so the underlying layout does not shift, and SHALL restore the original scroll behavior on close.

#### Scenario: Background scrolling is locked while open
- **WHEN** the modal is open
- **THEN** the document body is prevented from scrolling

#### Scenario: Scrollbar width is compensated
- **WHEN** the scroll lock is applied on a page with a visible scrollbar
- **THEN** a compensating inline padding equal to the scrollbar width is applied to the body

#### Scenario: Original state is restored on close
- **WHEN** the modal closes
- **THEN** the body's overflow and padding are restored to the values they had before the modal opened
