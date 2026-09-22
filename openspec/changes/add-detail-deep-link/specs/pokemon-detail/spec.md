# pokemon-detail

## MODIFIED Requirements

### Requirement: Open the detail modal from a catalog card
The system SHALL open an accessible detail modal for a Pokémon when the user activates its catalog card, by navigating to that Pokémon's detail route rather than by setting local component state, and SHALL request that Pokémon's detail data at most once per identifier per session.

#### Scenario: Card click opens the modal
- **WHEN** the user clicks a catalog card for a Pokémon
- **THEN** the application navigates to that Pokémon's detail URL and a modal opens showing that Pokémon's detail content

#### Scenario: Card is keyboard operable
- **WHEN** the user moves focus to a catalog card and presses Enter
- **THEN** the application navigates to that Pokémon's detail URL and the modal opens, identically to a click

#### Scenario: Detail data is fetched once per Pokémon
- **WHEN** the user opens, closes, and reopens the modal for the same Pokémon
- **THEN** exactly one detail request is issued for that Pokémon

#### Scenario: Concurrent opens do not duplicate a request
- **WHEN** a detail request for a Pokémon is already in flight and the same Pokémon is requested again
- **THEN** no second request is issued and both callers resolve from the single in-flight request

#### Scenario: The modal opens without a card activation
- **WHEN** the application is loaded directly at a Pokémon's detail URL
- **THEN** the modal opens for that Pokémon with no card having been activated

### Requirement: Focus management
The modal SHALL move focus into itself on open, trap Tab and Shift+Tab within its focusable elements while open, and restore focus on close to the element that triggered it. When no triggering element was recorded, or the recorded element is no longer in the document, the modal SHALL instead move focus to the catalog view's heading, which SHALL be programmatically focusable. Focus SHALL NOT be left on the document body after a close.

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
- **WHEN** the modal was opened from a catalog card and is closed by any means
- **THEN** focus is restored to the catalog card that opened it

#### Scenario: Focus falls back to the catalog heading on a cold entry
- **WHEN** the modal was opened by a direct load of a detail URL, with no triggering element, and is then closed
- **THEN** focus is moved to the catalog view's heading and is not left on the document body

#### Scenario: Focus is managed when the modal is closed by history navigation
- **WHEN** the modal is closed by a browser Back navigation
- **THEN** focus is moved to the recorded trigger if it is still in the document, and to the catalog heading otherwise

### Requirement: Dismissal
The modal SHALL close on Escape, on activation of its close control, and on a click on the backdrop outside the modal surface, and SHALL NOT close on a click inside the modal surface. Every dismissal SHALL close the modal by navigating to the catalog route, so that the address always reflects whether the modal is open. Dismissal SHALL NOT depend on a previous history entry existing.

#### Scenario: Escape closes the modal
- **WHEN** the modal is open and the user presses Escape
- **THEN** the application navigates to the catalog route and the modal closes

#### Scenario: Backdrop click closes the modal
- **WHEN** the user clicks the backdrop outside the modal surface
- **THEN** the application navigates to the catalog route and the modal closes

#### Scenario: Inside click does not close the modal
- **WHEN** the user clicks inside the modal surface
- **THEN** the modal stays open and the route is unchanged

#### Scenario: Close control closes the modal
- **WHEN** the user activates the modal's close control
- **THEN** the application navigates to the catalog route and the modal closes

#### Scenario: Dismissal works on a cold deep-link entry
- **WHEN** the application was loaded directly at a detail URL, with no earlier history entry, and the user presses Escape
- **THEN** the catalog route becomes current, the modal is unmounted, and the application is not navigated away from
