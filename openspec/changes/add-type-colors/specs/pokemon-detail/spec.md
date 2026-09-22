# pokemon-detail

## ADDED Requirements

### Requirement: Type badges are coloured by type
The detail view SHALL render each type badge using that type's colour treatment, and SHALL keep the type's text label visible so that colour remains a redundant cue rather than the only one.

#### Scenario: Each badge carries its own type's colour
- **WHEN** the detail view is open for a Pokémon with two different types
- **THEN** each type badge is rendered with the colour treatment of its own type, and the two badges differ

#### Scenario: Label remains visible
- **WHEN** a type badge is rendered with its colour treatment
- **THEN** the type's name is still displayed as text within the badge

#### Scenario: Unknown type renders neutrally
- **WHEN** the detail view is open for a Pokémon whose type is not a known type
- **THEN** that badge is rendered with the neutral treatment and the view renders without error
