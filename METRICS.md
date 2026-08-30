# Awareness Metrics Catalogue

## Purpose of this document

This is a research catalogue, not the product's settings menu or feature checklist. Its purpose is to preserve potentially meaningful ideas while allowing the interface to say no to almost all of them.

From Time to Time defaults to one featured perspective at a time. Its alternative Cards mode is deliberately bounded to six slots and a curated set; this catalogue must not turn into an unbounded dashboard backlog.

Awareness metrics turn an abstract life horizon into concrete opportunities. They are prompts for attention, not predictions, diagnoses, productivity scores, or promises about the future.

## Current implemented set

Perspective uses five ideas, while Cards adds four explicitly estimated allocations, including one relationship-oriented card:

| Perspective | Required data | Interpretation |
|---|---|---|
| Life progress | Birth date and chosen horizon | A compact frame, explicitly not a death prediction. |
| Weekly rollover | Birth date | Once each personal life-week changes, acknowledge the week that ended and the one beginning. |
| Saturdays | Life horizon | Calendar Saturdays remaining; the current Saturday is included. |
| Sunsets | Life horizon | One opportunity per remaining calendar day; not an astronomical or weather-aware forecast. |
| Christmases | Life horizon | December 25 occurrences in the horizon; optional because the observance is not universal. |
| Estimated heartbeats | Remaining horizon minutes and configured BPM | A rate-based estimate, never a medical prediction. |
| Estimated breaths | Remaining horizon minutes and configured breaths/minute | A rate-based estimate, never a medical prediction. |
| Estimated waking hours | Remaining horizon and configured sleep/day | A rough allocation rather than a promise of usable time. |
| Family meals | Meals/week and optional shared horizon date | A simple estimate of recurring shared opportunities; it does not infer closeness or guarantee attendance. |

Perspective gives one contextual idea prominence and reduces the others to a supporting sentence. Cards shows at most six enabled ideas, preserving configured fixed cards and selecting rotating cards only when the panel opens. Neither mode scores the user.

## Admission test for a future metric

A candidate should enter the product only when it:

1. changes what deserves attention in a recognizable context;
2. can be expressed in one strong sentence;
3. uses honest, minimal assumptions;
4. is more affecting than one of the current choices;
5. does not require a general-purpose formula or dashboard system.

Metrics not meeting that bar remain research below.

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

- Global enablement is separate from Cards placement.
- Cards supports only 2, 4, or 6 slots; fixed IDs provide explicit order and remaining enabled IDs form the rotation pool.
- A future metric brings only the minimum data needed for its chosen perspective or curated card.
- No general-purpose formula language or arbitrary card builder.
- Disabled metrics perform no calculation and occupy no space.
- `familyMeals` is the first relationship-oriented card; it requires an explicit frequency and supports an optional shared horizon date.
- Additional relationship metrics remain deferred until they have an honest shared horizon and satisfactory copy.

## Display rules

- Render Perspective or Cards, never both.
- Perspective gives one idea prominence and reduces other enabled contextual ideas to one supporting sentence.
- Cards never exceeds six slots, duplicates metrics, invents filler, or reshuffles while open.
- Use a small live countdown when it makes a lower-level change legible; do not add motion for its own sake.
- Treat copy, order, typography, and whitespace as the interface.
- Keep the compact life bar visible above either visualization.
- Use plain language, never motivational scoring, warnings, streaks, confetti, or mortality decoration.
- Avoid constant motion; meaningful calendar, life-week, and panel-opening transitions provide punctuated salience.
