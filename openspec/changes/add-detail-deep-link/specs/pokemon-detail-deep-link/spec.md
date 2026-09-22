# pokemon-detail-deep-link

## ADDED Requirements

### Requirement: Canonical detail URL
The system SHALL expose each Pokémon's detail view at the path `/pokemon/:idOrName`, registered as a child route of the catalog route, so that the detail view has a shareable, bookmarkable address. The catalog view SHALL remain mounted while a detail route is matched.

#### Scenario: Detail route matches by numeric ID
- **WHEN** the application is navigated to `/pokemon/25`
- **THEN** the detail route matches with an `idOrName` parameter of `25` and the detail modal is rendered

#### Scenario: Detail route matches by name
- **WHEN** the application is navigated to `/pokemon/pikachu`
- **THEN** the detail route matches with an `idOrName` parameter of `pikachu` and the detail modal is rendered

#### Scenario: Catalog view stays mounted behind the modal
- **WHEN** a detail route is matched
- **THEN** the catalog view is mounted at the same time as the detail modal and its list state is preserved

#### Scenario: Navigating between two detail URLs does not remount the catalog
- **WHEN** the application navigates from `/pokemon/25` to `/pokemon/26`
- **THEN** the catalog view is not unmounted or re-initialised and the modal shows the second Pokémon

### Requirement: Cold resolution of a deep link
On a direct load of a detail URL the system SHALL resolve the Pokémon's detail data directly from the detail store, without requiring the catalog list to have loaded first. The modal's loading, error, and loaded states SHALL depend only on that Pokémon's own detail state and SHALL NOT depend on the catalog list's status.

#### Scenario: Detail resolves while the catalog is still loading
- **WHEN** the application is loaded directly at `/pokemon/25` and the catalog list request has not resolved
- **THEN** the detail request is issued immediately and the modal reaches its loaded state and renders the detail content while the catalog list is still loading

#### Scenario: Catalog initialises in parallel on a deep-link entry
- **WHEN** the application is loaded directly at `/pokemon/25`
- **THEN** the catalog list initialisation is also started, and exactly one catalog request is issued for the session

#### Scenario: Reload of a detail URL restores the same view
- **WHEN** the user reloads the page while at `/pokemon/pikachu`
- **THEN** the detail modal reopens for that Pokémon with the same content it showed before the reload

### Requirement: Route parameter normalisation
The system SHALL normalise the `idOrName` route parameter before resolving it: a value consisting only of digits SHALL be converted to a number, and any other value SHALL be trimmed and lowercased. An empty or whitespace-only value SHALL yield no lookup key. The normalised key SHALL address the detail store's cache, which is keyed by both numeric ID and lowercase name, so that either URL form resolves to the same cached entry.

#### Scenario: A numeric parameter becomes a numeric key
- **WHEN** the parameter is `25` or `025`
- **THEN** the normalised lookup key is the number `25`

#### Scenario: A name parameter is lowercased and trimmed
- **WHEN** the parameter is `PIKACHU`, `Pikachu`, or ` Pikachu `
- **THEN** the normalised lookup key is the string `pikachu`

#### Scenario: An empty parameter yields no key
- **WHEN** the parameter is empty or contains only whitespace
- **THEN** normalisation yields no lookup key and no detail request is issued

#### Scenario: Both URL forms share one cached entry
- **WHEN** the user visits `/pokemon/pikachu` and then `/pokemon/25` in the same session
- **THEN** exactly one detail request is issued and the second navigation renders the loaded state from cache without a loading state

### Requirement: Invalid identifier in the URL
When the detail request for a URL parameter fails with a `NotFoundError`, the system SHALL render the modal's error state for that failure class and SHALL leave the URL unchanged. The system SHALL NOT redirect to the catalog route and SHALL NOT rewrite the address.

#### Scenario: Unknown ID renders the not-found error in the modal
- **WHEN** the application is loaded at `/pokemon/99999` and the detail request fails with a `NotFoundError`
- **THEN** the modal renders the not-found error message with its retry action

#### Scenario: The address is preserved on a failed lookup
- **WHEN** the detail request for the URL parameter has failed with a `NotFoundError`
- **THEN** the current route is still `/pokemon/99999` and no redirect has occurred

#### Scenario: Transient failures on a deep link stay retryable in place
- **WHEN** the detail request for a deep-linked URL fails with a `RateLimitError` or a `NetworkError`
- **THEN** the modal renders the error message for that failure class with a retry action, and activating retry re-issues the request for the same URL parameter

#### Scenario: The catalog stays usable behind a failed deep link
- **WHEN** a deep-linked detail request has failed
- **THEN** the catalog behind the modal remains browsable once the modal is closed

### Requirement: Catalog cards link to the detail URL
Each catalog card SHALL render as a link whose target is the detail route for its Pokémon, so that a detail URL can be opened in a new tab, copied, or activated by the browser's standard link affordances.

#### Scenario: A card renders a real link
- **WHEN** the catalog renders a card for a Pokémon
- **THEN** the card's root element is an anchor whose `href` is that Pokémon's detail path

#### Scenario: Clicking a card navigates to the detail route
- **WHEN** the user clicks a catalog card
- **THEN** the application navigates to that Pokémon's detail URL and the modal opens

#### Scenario: The card emits no selection event
- **WHEN** the user activates a catalog card
- **THEN** the card emits no `select` event and the catalog view holds no local selected-Pokémon state

### Requirement: History navigation drives the modal
Browser Back and Forward SHALL open and close the detail modal by changing the matched route, without any additional history listener. All modal teardown — the focus trap, the document listeners, and the body scroll lock — SHALL be released when the modal is unmounted by a history navigation, not only when it is closed by a dismissal control.

#### Scenario: Back closes the modal
- **WHEN** the user opens the modal from a card and then presses browser Back
- **THEN** the modal is unmounted and the catalog route is current

#### Scenario: Forward reopens the modal
- **WHEN** the user has pressed Back to close the modal and then presses browser Forward
- **THEN** the detail route is current again and the modal reopens with focus inside it

#### Scenario: Scroll lock is released by a history-driven close
- **WHEN** the modal is closed by a browser Back navigation
- **THEN** the body's overflow and padding are restored to the values they had before the modal opened

#### Scenario: Listeners are released by a history-driven close
- **WHEN** the modal is closed by a browser Back navigation
- **THEN** no document listener added by the modal remains registered

### Requirement: Catalog pagination follows a resolved deep link
When a detail route resolves, the system SHALL advance the catalog's current page to the page containing that Pokémon in the currently active filtered list. The system SHALL perform this synchronisation only when the Pokémon is present in that filtered list as it stands; when the identifier is invalid, or when the Pokémon is excluded by the active search query or the active type filter, the current page SHALL remain unchanged. The synchronisation SHALL run once per resolution and SHALL NOT pin the current page thereafter. When the catalog list has not finished loading at resolution time, the synchronisation SHALL be deferred until the catalog load succeeds, and SHALL be dropped if the catalog load fails. The synchronisation SHALL NOT alter the search query, the search mode, or the type filter, and SHALL NOT affect the detail modal's own loading or error states.

#### Scenario: Deep link advances to the page holding the Pokémon
- **WHEN** the application is loaded at a detail URL for a Pokémon that sits on the third page of the currently active filtered list
- **THEN** the catalog's current page becomes the third page and that Pokémon's card is among the paginated items

#### Scenario: An invalid identifier leaves pagination untouched
- **WHEN** the application is loaded at a detail URL whose identifier resolves to no Pokémon and the detail request fails with a `NotFoundError`
- **THEN** the catalog's current page is unchanged

#### Scenario: A Pokémon excluded by the active search query leaves pagination untouched
- **WHEN** a detail URL resolves for a valid Pokémon while a search query is active that excludes that Pokémon from the filtered list
- **THEN** the catalog's current page is unchanged and the modal still shows that Pokémon's detail

#### Scenario: A Pokémon excluded by the active type filter leaves pagination untouched
- **WHEN** a detail URL resolves for a valid Pokémon while a type filter is active that excludes that Pokémon from the filtered list
- **THEN** the catalog's current page is unchanged and the modal still shows that Pokémon's detail

#### Scenario: Changing a filter after the jump still resets to the first page
- **WHEN** the catalog's page has been advanced by a resolved deep link and the user then changes the search query or the type filter
- **THEN** the current page resets to the first page, exactly as it does without a deep link, and is not restored to the deep-linked Pokémon's page

#### Scenario: The sync waits for a catalog still in flight
- **WHEN** a detail URL resolves while the catalog list request is still in flight
- **THEN** the current page is unchanged while the catalog is loading, and once the catalog load succeeds the current page becomes the page containing that Pokémon in the filtered list

#### Scenario: A failed catalog load drops the pending sync
- **WHEN** a detail URL resolves while the catalog list request is in flight and that request then fails
- **THEN** no pagination change occurs and the modal's own loaded or error state is unaffected
