# Awareness Metrics Catalogue

## Meaning and limits

Awareness metrics turn an abstract life horizon into concrete opportunities. They are prompts for attention, not predictions, diagnoses, productivity scores, or promises about the future.

Every remaining metric ends at one of:

- the configured life horizon;
- an explicit date, such as retirement or a child's eighteenth birthday;
- a shared horizon supplied for a relationship metric.

The interface must expose assumptions such as `70/min` or `3/week`. It must never present an estimated biological rate as an exact medical measurement.

## Implemented metrics

| Metric | Required data | Calculation | Accuracy and interpretation |
|---|---|---|---|
| Heartbeats | Average beats per minute | Remaining minutes × BPM | Rate estimate, not a lifespan or cardiac prediction. A wearable-derived long-term average may improve the estimate. |
| Breaths | Average breaths per minute | Remaining minutes × breaths/minute | Rate estimate; sleep, exercise, health, and age all change respiratory rate. |
| Wakeful hours | Average sleep hours per day | Remaining hours × `(24 − sleepHours) / 24` | Long-term allocation estimate. |
| Weekends | None beyond the life horizon | Saturdays between today and the horizon | Calendar count. The current weekend is included when applicable. |
| Sunsets | None beyond the life horizon | Calendar days through the horizon | Opportunity estimate; does not account for location, weather, or whether a sunset is visible. |
| Christmases | Celebration hours per occurrence | December 25 occurrences before the horizon; occurrences × celebration hours | Calendar count plus a personal time estimate. It can represent another annual observance by a future configurable annual-event metric. |
| Family meals | Meals per week; optional shared end date | Remaining weeks × meals/week | Personal frequency estimate. `untilDate` can constrain it to a realistic shared horizon. |

## Potential biological and embodied metrics

| Metric | Potential data/details |
|---|---|
| Sleeping nights/hours | Average sleep per night; optional age-based schedule changes |
| Meals remaining | Meals per day; fasting pattern; optional end date |
| Steps or walking distance | Average steps/day or distance/day; unit preference |
| Exercise sessions | Sessions/week; planned active-years horizon |
| Heartbeats during exercise | Exercise sessions/week, minutes/session, exercise BPM; clearly separate from baseline estimates |
| Healthy mobility days | User-selected mobility horizon date; must not infer health expectancy |
| Outdoor hours | Hours/week; seasonal profile if desired |
| Screen-free hours | Hours/week or target allocation; should remain descriptive rather than scored |

## Potential recurring-world metrics

| Metric | Potential data/details |
|---|---|
| Sunrises | Horizon; optional location if astronomical precision is desired |
| Full moons | Horizon; astronomical calculation or fixed average lunar cycle |
| Springs, summers, autumns, winters | Hemisphere; horizon; preferred season definition |
| Birthdays | Birth date; horizon |
| New Years | Horizon; calendar system |
| Religious observances | Event rule/calendar; celebration hours; faith/calendar system |
| Weekdays | Selected days of week; horizon |
| Long weekends | Region and holiday calendar |
| Local festivals | Event dates or recurrence rule |
| Elections | Country/region and election interval; dates can change |

## Potential relationship metrics

These are often the most emotionally meaningful and require the most care. They should use an explicit shared horizon whenever possible rather than silently using the user's horizon.

| Metric | Potential data/details |
|---|---|
| Meals with family | Frequency/week; shared horizon date |
| Visits to parents | Visits/year; shared horizon date |
| Calls with parents or friends | Calls/week or month; shared horizon date |
| Evenings with a partner | Evenings/week; optional shared horizon |
| Days living with children | Child birth date; household/end date |
| Time before a child turns 18 | Child birth date; hours/week; automatically derived eighteenth birthday |
| Family holidays | Trips/year; days/trip; shared horizon |
| Gatherings with close friends | Events/month or year; shared horizon |
| Time with a pet | Pet birth/adoption date; user-selected shared horizon; no inferred lifespan by default |
| Shared meals with a named person | Meals/week; shared horizon; local label |

Names and personal dates should remain local. No metric requires network access.

## Potential work and craft metrics

| Metric | Potential data/details |
|---|---|
| Workdays before retirement | Retirement date; working weekdays; holidays/vacation weeks |
| Working hours before retirement | Retirement date; hours/week; vacation weeks/year |
| Deep-work sessions | Sessions/week; session duration; career or project horizon |
| Creative hours | Hours/week; end date or life horizon |
| Books readable | Books/year or pages/week; optional current reading rate |
| Songs, paintings, essays, or projects | Output frequency; horizon; must avoid turning creativity into a quota |
| Courses or skills | Months/item or items/year; horizon |
| Mentoring conversations | Frequency/month; career horizon |
| Commutes | Workdays/week; remote-work ratio; retirement date |
| Commute hours | Commute duration; round trips/week; retirement date |

## Potential experience metrics

| Metric | Potential data/details |
|---|---|
| Vacations | Trips/year; horizon |
| Vacation days | Days/year; horizon |
| Journeys | Trips/year; optional mobility horizon |
| Concerts, plays, or cinema visits | Events/year; horizon |
| Restaurant meals | Frequency/month; horizon |
| Hikes | Frequency/month or season; active horizon |
| Ocean visits | Frequency/year; horizon |
| Countries or places visitable | Trips/year; not a claim about unique destinations |
| Celebration hours | Event recurrence; hours/event; horizon |
| Quiet mornings | Mornings/week; horizon |
| Unscheduled weekends | Fraction or count/year; horizon |

## Potential resource-allocation metrics

These describe available allocations rather than achievement.

| Metric | Potential data/details |
|---|---|
| Free hours | Work, sleep, care, and maintenance hours/week |
| Personal evenings | Evenings/week not assigned to recurring obligations |
| Learning hours | Hours/week; horizon |
| Community/volunteer hours | Hours/month; horizon |
| Time in nature | Hours/week; horizon |
| Money earned or spendable | Income/savings assumptions; currency; inflation; high uncertainty and privacy sensitivity |
| Carbon budget | Region/methodology; annual footprint; selected budget; too uncertain for the initial plugin |

## Configuration design rules

- Every metric has `enabled`.
- Rates and frequencies are explicit and bounded to plausible input ranges.
- Personal deadline metrics can set `untilDate` in `YYYY-MM-DD` format.
- An empty `untilDate` falls back to the life horizon.
- Metric order should eventually be user-configurable without creating a second schema.
- Disabled metrics perform no calculation and occupy no space.
- The first implementation uses built-in metric types rather than a premature general-purpose formula language.

## Display rules

- Use at most two columns of compact counters.
- Show the assumption beneath estimated values: `@ 70/min`, `3 meals/week`, etc.
- Use plain labels, never motivational scoring or warnings.
- Keep the compact life bar visible above the counters.
- Avoid animation that competes for attention; countdown values update naturally with the second clock.
- If enabled metrics make the panel too tall, prefer user-controlled ordering or paging over returning to a long dashboard.
