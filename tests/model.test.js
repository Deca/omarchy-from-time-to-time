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
    weekends: { enabled: true },
    sunsets: { enabled: true },
    christmas: { enabled: true }
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
assert.equal(config.metrics.weekends.enabled, true)
assert.equal(config.metrics.sunsets.enabled, true)
assert.equal(config.metrics.christmas.enabled, true)

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

const rollover = context.perspective(config, life, new Date(2026, 7, 24, 8, 0))
assert.equal(rollover.kind, "week")
assert.match(rollover.headline, /^Week [\d,]+ ended\.$/)
assert.equal(rollover.context, "A new week begins.")
assert.equal(context.countWeekdayUntil(new Date(2026, 7, 28), new Date(2026, 8, 7), 6), 2)
assert.equal(context.remainingCalendarDays(new Date(2026, 7, 28), new Date(2026, 8, 7)), 10)

assert.equal(context.parseTime("09:30"), 570)
assert.equal(context.parseTime("24:00"), -1)
assert.equal(context.parseTime("9:30"), -1)

console.log("From Time to Time model tests passed")
