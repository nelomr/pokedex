# pokemon-type-colors

## ADDED Requirements

### Requirement: Every known Pokémon type has a colour treatment
The system SHALL define a colour treatment for each of the 18 known Pokémon types, and SHALL make an omitted type a compile-time failure rather than a runtime one.

#### Scenario: All known types resolve
- **WHEN** a colour treatment is requested for each entry of the known type set in turn
- **THEN** every request returns a non-empty treatment

#### Scenario: A type without a treatment fails the build
- **WHEN** a new type is added to the known type set without a corresponding colour treatment
- **THEN** the type check performed by the build fails

### Requirement: Colour treatments are static literal values
The system SHALL store each colour treatment as a complete literal class string, and SHALL NOT assemble class names at runtime, so that the production stylesheet contains every treatment the UI can render.

#### Scenario: Treatments survive a production build
- **WHEN** the application is built for production
- **THEN** each type's colour treatment is present in the emitted stylesheet and renders identically to development

#### Scenario: No treatment is assembled from fragments
- **WHEN** the defined treatments are inspected
- **THEN** each one is a static literal string containing no interpolation fragment

### Requirement: Unknown types degrade to a neutral treatment
The system SHALL return a neutral colour treatment when a colour is requested for a value that is not a known Pokémon type, and SHALL NOT return an absent or empty treatment.

#### Scenario: Unrecognised type slug
- **WHEN** a colour treatment is requested for a string that is not a known type
- **THEN** the neutral treatment is returned

#### Scenario: Lookup never yields nothing
- **WHEN** a colour treatment is requested for any string, known or not
- **THEN** the returned treatment is a non-empty string

### Requirement: Treatments keep their label legible
Each colour treatment SHALL pair its background with a foreground that keeps the type's label readable at the size the badge is rendered.

#### Scenario: Foreground accompanies every background
- **WHEN** the defined treatments are inspected
- **THEN** each one specifies both a background and a foreground colour
