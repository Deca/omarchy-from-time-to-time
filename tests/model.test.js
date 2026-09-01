const assert = require("assert")
const fs = require("fs")
const path = require("path")
const vm = require("vm")

const context = { Array, Date, JSON, Math, Number, String, console, isFinite }
vm.createContext(context)
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "Model.js"), "utf8"),
  context
)

function parse(overrides = {}) {
  return context.parseConfig(JSON.stringify(Object.assign({ schedule: [] }, overrides)))
}

const config = parse({
  life: { enabled: true, birthDate: "1990-01-01", horizonYears: 90 },
  metrics: {
    weekends: { enabled: true },
    sunsets: { enabled: true },
    christmas: { enabled: true }
  },
  schedule: [
    { id: "sleep", label: "Sleep", start: "23:00", end: "07:00", days: ["mon"] },
    { id: "work", label: "Work", start: "09:00", end: "17:00", days: ["tue"] }
  ]
})

assert.equal(config._error, "")
assert.equal(config.schedule.length, 2)
assert.equal(config.life.birthDate, "1990-01-01")
assert.equal(config.life.horizonYears, 90)
assert.equal(config.visualization.mode, "perspective")
assert.equal(config.visualization.cards.count, 6)
assert.deepEqual(Array.from(config.visualization.cards.fixed), ["lifeWeek", "weekends", "sunsets", "christmas"])
assert.equal(config.metrics.lifeWeek.enabled, true)
assert.equal(config.metrics.heartbeats.beatsPerMinute, 70)
assert.equal(config.metrics.familyMeals.enabled, false)
assert.equal(config.metrics.books.enabled, false)
assert.equal(config.metrics.books.booksPerMonth, 1)
assert.equal(config.metrics.childhoodDays.enabled, false)
assert.equal(config.metrics.astronomicalEvents.enabled, false)
assert.deepEqual(Array.from(config.metrics.astronomicalEvents.events), [])
assert.equal(config.metrics.parentCalls, undefined)
assert.equal(config.metrics.systemSessions, undefined)
assert.equal(config.metrics.experiments, undefined)
assert.equal(config.metrics.mentoringConversations, undefined)
assert.equal(config.metrics.makingSessions, undefined)
assert.equal(config.metrics.culturalNights, undefined)
assert.equal(config.metrics.contemplativeSessions, undefined)
assert.equal(config.metrics.resiliencePractice, undefined)
assert.equal(new Set(Array.from(context.CARD_METRIC_IDS)).size, context.CARD_METRIC_IDS.length)
assert.equal(context.selectedCardIds(config, 1).length, 0)

const mondayNight = new Date(2026, 7, 24, 23, 30)
const tuesdayMorning = new Date(2026, 7, 25, 6, 30)
const tuesdayNoon = new Date(2026, 7, 25, 12, 0)

assert.equal(context.activeBlock(config.schedule, mondayNight).id, "sleep")
assert.equal(context.activeBlock(config.schedule, tuesdayMorning).id, "sleep")
assert.equal(context.activeBlock(config.schedule, tuesdayNoon).id, "work")
assert.equal(context.activeBlock(config.schedule, tuesdayNoon).remainingMinutes, 300)
assert.equal(context.nextBlock(config.schedule, tuesdayMorning).id, "work")
assert.deepEqual(
  Array.from(context.daySegments(config.schedule, tuesdayMorning), segment => [
    segment.id,
    segment.startMinute,
    segment.endMinute
  ]),
  [
    ["sleep-carry", 0, 420],
    ["work-today", 540, 1020]
  ]
)

const now = new Date(2026, 5, 15, 12, 0)
const life = context.lifeStats("1990-01-01", 90, now)
assert.equal(life.valid, true)
assert(life.elapsedWeeks > 1850 && life.elapsedWeeks < 1950)
assert.equal(context.lifeStats("", 90, new Date()).valid, false)

// Perspective behavior remains contextual and is the default mode.
const ordinary = context.perspective(config, life, new Date(2026, 7, 28, 12, 0))
assert.equal(ordinary.kind, "weekends")
assert.match(ordinary.headline, /Saturdays ahead$/)
assert.equal(ordinary.context, "The next one is in 1 day.")
assert.match(ordinary.supporting, /sunsets · 54 Christmases$/)

const saturday = context.perspective(config, life, new Date(2026, 7, 29, 12, 0))
assert.equal(saturday.kind, "weekends")
assert.equal(saturday.context, "One of them is already here.")

const evening = context.perspective(config, life, new Date(2026, 7, 28, 18, 0))
assert.equal(evening.kind, "sunsets")
assert.equal(evening.context, "One of them belongs to today.")

const christmas = context.perspective(config, life, new Date(2026, 11, 25, 12, 0))
assert.equal(christmas.kind, "christmas")
assert.equal(christmas.headline, "54 Christmases in this horizon")
assert.equal(christmas.context, "This is one of them.")

const rolloverDate = new Date(2026, 7, 24, 8, 0)
const rollover = context.perspective(config, life, rolloverDate)
assert.equal(rollover.kind, "week")
assert.match(rollover.headline, /^Week [\d,]+ ended\.$/)
assert.equal(rollover.context, "A new week begins.")
const noRollover = parse({
  life: { birthDate: "1990-01-01" },
  metrics: { lifeWeek: { enabled: false } }
})
assert.notEqual(context.perspective(noRollover, context.lifeStats("1990-01-01", 90, rolloverDate), rolloverDate).kind, "week")

// Card configuration normalization and selection invariants.
const cardsConfig = parse({
  life: { birthDate: "1990-01-01", horizonYears: 90 },
  visualization: {
    mode: "cards",
    cards: { count: 6, fixed: ["christmas", "lifeWeek", "weekends", "sunsets"] }
  }
})
assert.equal(cardsConfig.visualization.mode, "cards")
const firstDeck = context.cardDeck(cardsConfig, life, now, 17)
const repeatedDeck = context.cardDeck(cardsConfig, life, new Date(now.getTime() + 1000), 17)
const otherDeck = context.cardDeck(cardsConfig, life, now, 23)
const firstIds = Array.from(firstDeck, card => card.id)
assert.equal(firstDeck.length, 6)
assert.deepEqual(firstIds.slice(0, 4), ["christmas", "lifeWeek", "weekends", "sunsets"])
assert.deepEqual(Array.from(repeatedDeck, card => card.id), firstIds)
assert.notDeepEqual(Array.from(otherDeck, card => card.id), firstIds)
assert.equal(new Set(firstIds).size, firstIds.length)

const issuesConfig = parse({
  visualization: {
    mode: "dashboard",
    cards: {
      count: 0,
      fixed: ["unknown", "sunsets", "sunsets", "breaths"]
    }
  },
  metrics: { breaths: { enabled: false } }
})
assert.equal(issuesConfig.visualization.mode, "perspective")
assert.equal(issuesConfig.visualization.cards.count, 6)
assert.deepEqual(Array.from(issuesConfig.visualization.cards.fixed), ["sunsets"])
assert(issuesConfig._issues.some(issue => issue.includes("visualization.mode")))
assert(issuesConfig._issues.some(issue => issue.includes("cards.count")))
assert(issuesConfig._issues.some(issue => issue.includes("Unknown card metric")))
assert(issuesConfig._issues.some(issue => issue.includes("Disabled card metric")))
assert(issuesConfig._issues.some(issue => issue.includes("Duplicate card metric")))

const relationship = parse({
  life: { birthDate: "1990-01-01", horizonYears: 90 },
  visualization: { mode: "cards", cards: { count: 2, fixed: ["familyMeals"] } },
  metrics: { familyMeals: { enabled: true, timesPerWeek: 3, untilDate: "2030-01-01" } }
})
const relationshipDeck = context.cardDeck(relationship, life, now, 2)
assert.equal(relationshipDeck.length, 2)
const familyMeals = relationshipDeck.find(card => card.id === "familyMeals")
assert(familyMeals)
assert.equal(familyMeals.kind, "number")
assert.equal(familyMeals.label, "Estimated family meals ahead")
assert.match(familyMeals.detail, /At 3 per week until 2030-01-01\./)
assert.match(familyMeals.countdown, /^next estimate in /)
assert(Number(familyMeals.headline.replace(/,/g, "")) > 500)

const fourCards = parse({
  visualization: { mode: "cards", cards: { count: 4, fixed: [] } }
})
assert.equal(context.cardDeck(fourCards, life, now, 5).length, 4)

const sevenCards = parse({
  visualization: { mode: "cards", cards: { count: 7, fixed: [] } }
})
assert.equal(sevenCards.visualization.cards.count, 7)
assert.equal(context.cardDeck(sevenCards, life, now, 5).length, 7)
assert.equal(parse({ visualization: { mode: "cards", cards: { count: 99, fixed: [] } } })
  .visualization.cards.count, 99)

const excessFixed = parse({
  visualization: {
    mode: "cards",
    cards: { count: 2, fixed: ["lifeWeek", "weekends", "sunsets", "christmas"] }
  }
})
assert.deepEqual(Array.from(excessFixed.visualization.cards.fixed), ["lifeWeek", "weekends"])
assert(excessFixed._issues.filter(issue => issue.includes("exceeds visualization.cards.count")).length === 2)
assert.deepEqual(
  Array.from(context.cardDeck(excessFixed, life, now, 1), card => card.id),
  ["lifeWeek", "weekends"]
)

const sparseMetrics = {}
for (const id of ["lifeWeek", "weekends", "sunsets", "christmas", "heartbeats", "breaths", "wakefulHours", "familyMeals"])
  sparseMetrics[id] = { enabled: id === "lifeWeek" }
const sparse = parse({
  life: { birthDate: "1990-01-01" },
  visualization: { mode: "cards", cards: { count: 6, fixed: [] } },
  metrics: sparseMetrics
})
assert.deepEqual(Array.from(context.cardDeck(sparse, life, now, 99), card => card.id), ["lifeWeek"])
assert.deepEqual(Array.from(context.selectedCardIds(config, 1)), [])

// Card models include bounded estimates and a compact whole-horizon strip.
const lifeWeekCard = firstDeck.find(card => card.id === "lifeWeek")
assert.equal(lifeWeekCard.kind, "week-strip")
assert.equal(lifeWeekCard.totalInHorizon, 52)
assert.equal(lifeWeekCard.completedInHorizon, lifeWeekCard.currentInHorizon - 1)
assert.match(lifeWeekCard.headline, /^Week [\d,]+$/)

const personalLife = context.lifeStats("1981-06-23", 90, new Date(2026, 7, 31, 12, 0))
const personalCard = context.cardDeck(cardsConfig, personalLife, new Date(2026, 7, 31, 12, 0), 17)
  .find(card => card.id === "lifeWeek")
assert.equal(personalCard.detail, "year 45 · week 10")
assert.equal(personalCard.reflection, "year 45 · week 10 · enough for one thing")
assert.equal(personalCard.totalInHorizon, 52)
assert(personalCard.currentInHorizon > 26 && personalCard.currentInHorizon < 29)

const reflections = {
  weekends: "You don't need to fill a free day.",
  sunsets: "The day was worth noticing.",
  christmas: "Tradition is ordinary time, remembered.",
  heartbeats: "The body keeps time on its own.",
  breaths: "Most of life arrives this quietly.",
  wakefulHours: "Attention, not hours, makes a day.",
  familyMeals: "A meal is time made visible between people."
}
for (const id of Object.keys(reflections))
  assert.equal(context.cardViewModel(id, relationship, life, now).reflection, reflections[id])

const heartbeatCard = context.cardViewModel("heartbeats", relationship, life, now)
const breathCard = context.cardViewModel("breaths", relationship, life, now)
assert.equal(
  heartbeatCard.headline,
  context.groupedInteger(life.remainingMinutes * relationship.metrics.heartbeats.beatsPerMinute)
)
assert.equal(
  breathCard.headline,
  context.groupedInteger(life.remainingMinutes * relationship.metrics.breaths.breathsPerMinute)
)
assert.match(heartbeatCard.headline, /^\d{1,3}(,\d{3})+$/)
assert.match(breathCard.headline, /^\d{1,3}(,\d{3})+$/)

// Curated interest cards share recurring math while retaining explicit IDs, copy, and parameters.
const expansionMetrics = {
  seasons: { enabled: true },
  childhoodDays: { enabled: true, untilDate: "2030-01-01" },
  workdays: { enabled: true, retirementDate: "2030-01-01", daysPerWeek: 5, vacationWeeksPerYear: 5 },
  daysUntilWobbly: { enabled: true, untilDate: "2030-01-01" },
  doomsday: { enabled: true, untilDate: "2030-01-01" }
}
for (const spec of Array.from(context.RECURRING_CARD_SPECS)) {
  expansionMetrics[spec.id] = { enabled: true, untilDate: "2030-01-01" }
  expansionMetrics[spec.id][spec.rateKey] = 2
}
const expansion = parse({
  life: { birthDate: "1990-01-01", horizonYears: 90 },
  visualization: { mode: "cards", cards: { count: 8, fixed: ["books", "runningSessions"] } },
  metrics: expansionMetrics
})
assert.deepEqual(Array.from(expansion.visualization.cards.fixed), ["books", "runningSessions"])
for (const spec of Array.from(context.RECURRING_CARD_SPECS)) {
  const card = context.cardViewModel(spec.id, expansion, life, now)
  assert.equal(card.orientation, spec.orientation)
  assert(card.headline !== "0")
  assert(card.reflection.length > 20 && card.reflection.length <= 40)
  assert.match(card.countdown, /^next estimate in /)
}
assert.match(context.cardViewModel("books", expansion, life, now).detail, /At 2 per month/)
assert.match(context.cardViewModel("nightLife", expansion, life, now).detail, /At 2 per month/)
assert.equal(context.cardViewModel("runningSessions", expansion, life, now).label, "Runs before your knees object")
const seasonsCard = context.cardViewModel("seasons", expansion, life, now)
assert(seasonsCard.headline !== "0")
assert.match(seasonsCard.countdown, /^next season in /)

const astronomyConfig = parse({
  life: { birthDate: "1990-01-01", horizonYears: 90 },
  metrics: {
    astronomicalEvents: {
      enabled: true,
      events: [
        { name: "Later close approach", date: "2029-04-13" },
        { name: "Past eclipse", date: "2025-03-29" },
        { name: "Next total eclipse", date: "2027-08-02" }
      ]
    }
  }
})
assert.deepEqual(
  Array.from(astronomyConfig.metrics.astronomicalEvents.events, event => event.name),
  ["Past eclipse", "Next total eclipse", "Later close approach"]
)
const astronomyCard = context.cardViewModel("astronomicalEvents", astronomyConfig, life, now)
assert.equal(astronomyCard.orientation, "cosmic")
assert.equal(astronomyCard.label, "Days until Next total eclipse")
assert.equal(astronomyCard.detail, "Next configured event · 2027-08-02")
assert(Number(astronomyCard.headline.replace(/,/g, "")) > 300)
const astronomyOnEventDay = context.cardViewModel(
  "astronomicalEvents", astronomyConfig, life, new Date(2027, 7, 2, 12, 0))
assert.equal(astronomyOnEventDay.headline, "0")
assert.equal(astronomyOnEventDay.countdown, "today")
const astronomyAfterEvent = context.cardViewModel(
  "astronomicalEvents", astronomyConfig, life, new Date(2027, 7, 3, 12, 0))
assert.equal(astronomyAfterEvent.label, "Days until Later close approach")

const invalidAstronomy = parse({
  metrics: {
    astronomicalEvents: {
      enabled: true,
      events: [{ name: "", date: "2030-01-01" }, { name: "Bad date", date: "tomorrow" }]
    }
  }
})
assert.equal(invalidAstronomy.metrics.astronomicalEvents.enabled, false)
assert(invalidAstronomy._issues.some(issue => issue.includes("astronomicalEvents.events[0]")))
assert(invalidAstronomy._issues.some(issue => issue.includes("at least one valid event")))

const childhoodCard = context.cardViewModel("childhoodDays", expansion, life, now)
assert.equal(childhoodCard.orientation, "social")
assert.equal(childhoodCard.label, "Days before your child leaves home")
assert(Number(childhoodCard.headline.replace(/,/g, "")) > 1000)
const workdaysCard = context.cardViewModel("workdays", expansion, life, now)
assert.equal(workdaysCard.orientation, "practical")
assert(Number(workdaysCard.headline.replace(/,/g, "")) > 500)
const mobilityCard = context.cardViewModel("daysUntilWobbly", expansion, life, now)
assert.equal(mobilityCard.orientation, "health")
assert.equal(mobilityCard.label, "Days until the wheels come off")
assert(Number(mobilityCard.headline.replace(/,/g, "")) > 1000)
const doomsdayCard = context.cardViewModel("doomsday", expansion, life, now)
assert.equal(doomsdayCard.orientation, "resilience")
assert.equal(doomsdayCard.label, "Days until doomsday")

// Personal card copy is normalized from timeline.json and layered over built-in view models.
const customCopyConfig = parse({
  life: { birthDate: "1990-01-01", horizonYears: 90 },
  visualization: { mode: "cards", cards: { count: 1, fixed: ["doomsday"] } },
  metrics: {
    doomsday: {
      enabled: true,
      untilDate: "2030-01-01",
      label: "  Days until the grid goes dark  ",
      reflection: "  Beans, batteries, and bad decisions  "
    }
  }
})
assert.equal(customCopyConfig.metrics.doomsday.label, "Days until the grid goes dark")
assert.equal(customCopyConfig.metrics.doomsday.reflection, "Beans, batteries, and bad decisions")
const customDoomsdayCard = context.cardDeck(customCopyConfig, life, now, 3)[0]
assert.equal(customDoomsdayCard.label, "Days until the grid goes dark")
assert.equal(customDoomsdayCard.reflection, "Beans, batteries, and bad decisions")

const defaultCopyConfig = parse({
  metrics: { doomsday: { enabled: true, untilDate: "2030-01-01", label: "  ", reflection: "" } }
})
const defaultDoomsdayCard = context.cardViewModel("doomsday", defaultCopyConfig, life, now)
assert.equal(defaultDoomsdayCard.label, "Days until doomsday")
assert.equal(defaultDoomsdayCard.reflection, "Stock the bunker before the sirens.")

const invalidRequired = parse({
  metrics: {
    childhoodDays: { enabled: true, untilDate: "" },
    workdays: { enabled: true, retirementDate: "not-a-date" },
    daysUntilWobbly: { enabled: true, untilDate: "" },
    doomsday: { enabled: true, untilDate: "not-a-date" },
    runningSessions: { enabled: true, timesPerWeek: 3, untilDate: "" },
    nightLife: { enabled: true, nightsPerMonth: 1, untilDate: "" }
  }
})
assert.equal(invalidRequired.metrics.childhoodDays.enabled, false)
assert.equal(invalidRequired.metrics.workdays.enabled, false)
assert.equal(invalidRequired.metrics.daysUntilWobbly.enabled, false)
assert.equal(invalidRequired.metrics.doomsday.enabled, false)
assert.equal(invalidRequired.metrics.runningSessions.enabled, false)
assert.equal(invalidRequired.metrics.nightLife.enabled, false)
assert.equal(invalidRequired._issues.length, 6)

const clamped = parse({
  life: { birthDate: "1990-01-01" },
  visualization: {
    mode: "cards",
    cards: { count: 6, fixed: ["heartbeats", "breaths", "wakefulHours"] }
  },
  metrics: {
    lifeWeek: { enabled: false },
    heartbeats: { enabled: true, beatsPerMinute: 999 },
    breaths: { enabled: true, breathsPerMinute: 1 },
    wakefulHours: { enabled: true, sleepHoursPerDay: 30 },
    familyMeals: { enabled: true, timesPerWeek: 99, untilDate: "bad-date" }
  }
})
assert.equal(clamped.metrics.heartbeats.beatsPerMinute, 250)
assert.equal(clamped.metrics.breaths.breathsPerMinute, 4)
assert.equal(clamped.metrics.wakefulHours.sleepHoursPerDay, 24)
assert.equal(clamped.metrics.familyMeals.timesPerWeek, 50)
assert.equal(clamped.metrics.familyMeals.untilDate, "")
assert(clamped._issues.some(issue => issue.includes("familyMeals.untilDate")))
assert.equal(clamped.metrics.familyMeals.enabled, true)
const clampedDeck = context.cardDeck(clamped, life, now, 7)
assert(clampedDeck.some(card => card.id === "heartbeats" && card.detail.includes("250")
  && /heartbeats remain$/.test(card.countdown)))
assert(clampedDeck.some(card => card.id === "breaths" && card.detail.includes("4")
  && /breaths remain$/.test(card.countdown)))
assert(clampedDeck.some(card => card.id === "wakefulHours" && card.headline === "0h 00m" && card.countdown === "no waking time allocated"))
assert.equal(context.formatCountdown(90061000), "1d 01:01:01")
assert.equal(context.unitCountdown(1, "heartbeat", "heartbeats"), "1 heartbeat remains")
assert.equal(context.unitCountdown(2, "heartbeat", "heartbeats"), "2 heartbeats remain")

assert(firstDeck.every(card => typeof card.rotating === "boolean"))
assert(firstDeck.slice(0, 4).every(card => card.rotating === false))
assert(firstDeck.slice(4).every(card => card.rotating === true))
assert.equal(context.cardDeck(cardsConfig, { valid: false }, now, 1).length, 0)
assert.equal(context.countWeekdayUntil(new Date(2026, 7, 28), new Date(2026, 8, 7), 6), 2)
assert.equal(context.remainingCalendarDays(new Date(2026, 7, 28), new Date(2026, 8, 7)), 10)
assert.equal(context.parseTime("09:30"), 570)
assert.equal(context.parseTime("24:00"), -1)
assert.equal(context.parseTime("9:30"), -1)

console.log("From Time to Time model tests passed")
