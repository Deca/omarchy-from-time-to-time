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

const config = context.parseConfig(JSON.stringify({
  life: { enabled: true, birthDate: "1990-01-01", horizonYears: 90 },
  metrics: {
    heartbeats: { enabled: true, beatsPerMinute: 65 },
    breaths: { enabled: true, breathsPerMinute: 12 },
    wakefulHours: { enabled: true, sleepHoursPerDay: 8 },
    weekends: { enabled: true },
    sunsets: { enabled: true },
    christmas: { enabled: true, celebrationHoursPerYear: 12, showHours: true },
    familyMeals: { enabled: true, timesPerWeek: 3, untilDate: "2030-01-01" }
  },
  schedule: [
    { id: "sleep", label: "Sleep", start: "23:00", end: "07:00", days: ["mon"] },
    { id: "work", label: "Work", start: "09:00", end: "17:00", days: ["tue"] }
  ]
}))

assert.equal(config._error, "")
assert.equal(config.schedule.length, 2)
assert.equal(config.life.birthDate, "1990-01-01")
assert.equal(config.life.horizonYears, 90)
assert.equal(config.metrics.heartbeats.beatsPerMinute, 65)

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

const life = context.lifeStats("1990-01-01", 90, new Date(2026, 5, 15))
assert.equal(life.valid, true)
assert(life.elapsedWeeks > 1850 && life.elapsedWeeks < 1950)
assert.equal(context.lifeStats("", 90, new Date()).valid, false)

const awareness = context.awarenessMetrics(config, life, new Date(2026, 7, 28, 12, 0))
assert.deepEqual(Array.from(awareness, metric => metric.id), [
  "heartbeats", "breaths", "wakefulHours", "weekends", "sunsets", "christmas", "familyMeals"
])
assert.equal(awareness.find(metric => metric.id === "christmas").value, "54")
assert.match(awareness.find(metric => metric.id === "christmas").countdown, /^next in /)
assert.equal(context.formatCountdown(90061000), "1d 01:01:01")
assert.equal(context.countWeekdayUntil(new Date(2026, 7, 28), new Date(2026, 8, 7), 6), 2)
assert.equal(context.remainingCalendarDays(new Date(2026, 7, 28), new Date(2026, 8, 7)), 10)

assert.equal(context.parseTime("09:30"), 570)
assert.equal(context.parseTime("24:00"), -1)
assert.equal(context.parseTime("9:30"), -1)

console.log("From Time to Time model tests passed")
