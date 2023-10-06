# Roadie Tech Insights Action

This Action allows CI to run Tech Insights checks and scorecards to identify the health of your branch

### Prerequisites

[Roadie Backstage](https://roadie.io/) customers may access this via the Roadie API. Please reach out to
support@roadie.io for more info.

### Required Inputs:

- `catalog-info-path`: Path to the yaml file representing the Backstage entity linked to this repository/PR. Defaults
  to `./catalog-info.yaml`
- `scorecard-id`: The id of the scorecard to run
- `check-id`: The id of the check to run

**One of** `scorecard-id` or `check-id` is required.

### Optional Inputs

- `entity-selector`: An index of the entity to use from a multiyaml manifest file.

Supplying an `entity-selector` allows the action to identify the correct entities from the loaded entity manifest file.
This input takes in a number and the number is used as an index accessor to identify the correct manifest from a
multiyaml file.

### Example usage

#### Run a scorecard

```yaml
on:
  pull-request:
    branches:
      - main
jobs:
  run_tech_insights_scorecard:
    runs-on: ubuntu-latest
    steps:
      - name: Run Tech Insights scorecard
        uses: roadiehq/tech-insights-action
        with:
          api-token: ${{ secrets.ROADIE_API_KEY }}
          catalog-info-path: './catalog-info.yaml'
          scorecard-id: 1111-2222-3333
```

#### Run an individual Check

```yaml
on:
  pull-request:
    branches:
      - main
jobs:
  run_tech_insights_scorecard:
    runs-on: ubuntu-latest
    steps:
      - name: Run Tech Insights scorecard
        uses: roadiehq/tech-insights-action
        with:
          api-token: ${{ secrets.ROADIE_API_KEY }}
          catalog-info-path: './catalog-info.yaml'
          check-id: 1111-2222-3333
```