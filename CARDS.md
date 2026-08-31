# Card Catalogue

Cards are finite prompts for attention, not goals or forecasts. At most six appear at once. Every optional card is disabled by default until its assumptions are configured deliberately.

## Managing the deck

```json
{
  "visualization": {
    "mode": "cards",
    "cards": {
      "count": 6,
      "fixed": ["lifeWeek", "books"]
    }
  },
  "metrics": {
    "books": {
      "enabled": true,
      "timesPerYear": 12,
      "untilDate": ""
    }
  }
}
```

- `count` accepts `2`, `4`, or `6`.
- `fixed` is ordered. Fixed cards appear first.
- Other enabled cards rotate into the open slots when the panel opens.
- Selection remains stable while the panel is open.
- Empty `untilDate` values use the configured life horizon.
- Dates use local `YYYY-MM-DD` values.
- Rates describe an assumption, not a target. Set a rate to `0` when no estimate is useful.

## Core cards

| ID | Meaning | Parameters |
|---|---|---|
| `lifeWeek` | Current life week and compact horizon position | life birth date and horizon |
| `weekends` | Saturdays in the life horizon | none |
| `sunsets` | Remaining calendar-day opportunities | none |
| `christmas` | December 25 occurrences | none |
| `heartbeats` | Estimated remaining heartbeats | `beatsPerMinute` |
| `breaths` | Estimated remaining breaths | `breathsPerMinute` |
| `wakefulHours` | Estimated waking allocation | `sleepHoursPerDay` |
| `familyMeals` | Estimated shared family meals | `timesPerWeek`, optional `untilDate` |
| `seasons` | Meteorological season changes | none |

## Relationship and life-stage cards

| ID | Meaning | Parameters |
|---|---|---|
| `parentVisits` | Visits with parents | `timesPerYear`, optional `untilDate` |
| `parentCalls` | Calls with parents | `timesPerWeek`, optional `untilDate` |
| `partnerEvenings` | Evenings shared with a partner | `timesPerWeek`, optional `untilDate` |
| `childhoodHours` | Shared hours before a child turns 18 | `childBirthDate`, `hoursPerWeek` |

Use an explicit `untilDate` when a relationship has a more honest shared horizon than the user's life horizon. Names and dates remain local.

## Interest and orientation cards

| Orientation | Card ID | Counted opportunity | Parameters |
|---|---|---|---|
| Technical / Systems | `systemSessions` | System-shaping sessions | `timesPerMonth`, optional `untilDate` |
| Scientific / Analytical | `experiments` | Experiments | `timesPerMonth`, optional `untilDate` |
| Intellectual / Scholarly | `books` | Books within reach | `timesPerYear`, optional `untilDate` |
| Philosophical / Existential | `quietMornings` | Quiet mornings | `timesPerWeek`, optional `untilDate` |
| Creative / Artistic | `creativeSessions` | Creative sessions | `timesPerWeek`, optional `untilDate` |
| Physical / Athletic | `trainingSessions` | Training sessions | `timesPerWeek`, optional `untilDate` |
| Health / Biological | `mobilityDays` | Days in a user-chosen mobility horizon | required `untilDate` |
| Nature / Outdoors / Adventure | `hikes`, `oceanVisits` | Hikes and ocean visits | rate, optional `untilDate` |
| Social / Relational | relationship cards above | Shared visits, calls, evenings, and hours | card-specific |
| Leadership / Organizational | `mentoringConversations` | Mentoring conversations | `timesPerMonth`, optional `untilDate` |
| Entrepreneurial / Economic | `smallBets` | Small, bounded bets | `timesPerYear`, optional `untilDate` |
| Practical / Maker / Craft | `makingSessions` | Hands-on making sessions | `timesPerMonth`, optional `untilDate` |
| Cultural / Aesthetic | `culturalNights` | Concert, theatre, cinema, or museum nights | `timesPerMonth`, optional `untilDate` |
| Spiritual / Contemplative | `contemplativeSessions` | Contemplative sessions | `timesPerWeek`, optional `untilDate` |
| Civic / Political / Social-change | `volunteerDays` | Volunteer or civic days | `timesPerMonth`, optional `untilDate` |
| Exploratory / Futurist | `journeys` | Journeys into unfamiliar places or work | `timesPerYear`, optional `untilDate` |
| Self-reliance / Resilience | `resiliencePractice` | Preparedness and resilience practice | `timesPerMonth`, optional `untilDate` |

## Work and experience cards

| ID | Meaning | Parameters |
|---|---|---|
| `workdays` | Estimated workdays before retirement | required `retirementDate`, `daysPerWeek`, `vacationWeeksPerYear` |
| `oceanVisits` | Ocean visits | `timesPerYear`, optional `untilDate` |
| `hikes` | Hikes | `timesPerMonth`, optional `untilDate` |
| `journeys` | Journeys | `timesPerYear`, optional `untilDate` |

## Interpretation limits

- Frequency cards multiply the configured rate by time remaining. They do not predict attendance or achievement.
- `childhoodHours` stops at the child's eighteenth birthday and does not judge how the hours are spent.
- `mobilityDays` requires a date chosen by the user. The plugin never infers health expectancy.
- `workdays` is a simple allocation estimate; it does not include public holidays or changing work patterns.
- Seasons use meteorological starts: March 1, June 1, September 1, and December 1.
- Card reflections are original interface copy, not quotations or verdicts.
