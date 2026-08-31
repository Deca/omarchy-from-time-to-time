# Card Catalogue

Cards make finite windows of life visible. They are prompts for attention, not goals, diagnoses, or forecasts. Optional cards stay disabled until their assumptions are configured deliberately.

The strongest cards describe an opportunity that exists only while a relationship, age, ability, or other condition lasts. Prefer an honest cutoff date over silently extending every habit across the full life horizon.

## Managing the deck

```json
{
  "visualization": {
    "mode": "cards",
    "cards": {
      "count": 8,
      "fixed": ["lifeWeek", "books"]
    }
  },
  "metrics": {
    "books": {
      "enabled": true,
      "booksPerMonth": 1,
      "untilDate": ""
    }
  }
}
```

- `count` accepts any positive whole number. The deck shows up to that many enabled cards; there is no 2/4/6 slot restriction.
- `fixed` is ordered. Fixed cards appear first with the neutral card color.
- Other enabled cards rotate into open slots when the panel opens and use an accent-tinted card color.
- Selection remains stable while the panel is open.
- Empty optional `untilDate` values use the configured life horizon.
- Dates use local `YYYY-MM-DD` values.
- Rates describe observed habits, not targets. Set a rate to `0` when no estimate is useful.

## Core cards

| ID | Meaning | Parameters |
|---|---|---|
| `lifeWeek` | Current life week and compact horizon position | life birth date and horizon |
| `weekends` | Saturdays in the life horizon | none |
| `sunsets` | Remaining calendar-day opportunities | none |
| `christmas` | December 25 occurrences | none |
| `heartbeats` | Estimated remaining heartbeats, with the live countdown expressed in heartbeats | `beatsPerMinute` |
| `breaths` | Estimated remaining breaths, with the live countdown expressed in breaths | `breathsPerMinute` |
| `wakefulHours` | Estimated waking allocation | `sleepHoursPerDay` |
| `familyMeals` | Estimated shared family meals | `timesPerWeek`, optional `untilDate` |
| `seasons` | Meteorological season changes | none |

## Relationship and life-stage cards

| ID | Meaning | Parameters |
|---|---|---|
| `parentVisits` | Visits with parents during a chosen shared horizon | `timesPerYear`, optional `untilDate` |
| `partnerEvenings` | Evenings shared with a partner | `timesPerWeek`, optional `untilDate` |
| `childhoodDays` | Calendar days before a child becomes an adult or leaves home | required `untilDate` |

`childhoodDays` intentionally uses a user-chosen date. Families and leaving-home ages differ, so the plugin does not infer the boundary from a birth date.

## Time-window cards

| ID | Counted opportunity | Parameters |
|---|---|---|
| `books` | Books still readable at the user's observed monthly pace | `booksPerMonth`, optional `untilDate` |
| `runningSessions` | Runs before a user-chosen active-life cutoff | `timesPerWeek`, required `untilDate` |
| `daysUntilWobbly` | Days until the user's deliberately blunt mobility cutoff | required `untilDate` |
| `nightLife` | Nights out before that life stage is expected to end | `nightsPerMonth`, required `untilDate` |
| `doomsday` | Days until a prepper's hypothetical climax date | required `untilDate` |
| `workdays` | Workdays before retirement | required `retirementDate`, `daysPerWeek`, `vacationWeeksPerYear` |

These dates are personal thought experiments. The plugin never infers disability, health expectancy, family milestones, or disaster risk.

## Other finite opportunities

| ID | Counted opportunity | Parameters |
|---|---|---|
| `quietMornings` | Quiet mornings | `timesPerWeek`, optional `untilDate` |
| `creativeSessions` | Creative sessions | `timesPerWeek`, optional `untilDate` |
| `trainingSessions` | Training sessions | `timesPerWeek`, optional `untilDate` |
| `oceanVisits` | Ocean visits | `timesPerYear`, optional `untilDate` |
| `hikes` | Hikes | `timesPerMonth`, optional `untilDate` |
| `smallBets` | Small, bounded bets | `timesPerYear`, optional `untilDate` |
| `volunteerDays` | Volunteer or civic days | `timesPerMonth`, optional `untilDate` |
| `journeys` | Journeys into unfamiliar places or work | `timesPerYear`, optional `untilDate` |

## Interpretation limits

- Frequency cards multiply the configured rate by time remaining. They do not predict attendance or achievement.
- Required cutoff dates make a limited period explicit; they are user assumptions, not medical or social predictions.
- `workdays` is a simple allocation estimate and excludes public holidays or changing work patterns.
- Seasons use meteorological starts: March 1, June 1, September 1, and December 1.
- Card reflections are original interface copy, not quotations or verdicts.
