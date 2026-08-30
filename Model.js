var DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
var ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
var DAY_MS = 24 * 60 * 60 * 1000
var WEEK_MS = 7 * DAY_MS
var CARD_METRIC_IDS = [
  "lifeWeek", "weekends", "sunsets", "christmas",
  "heartbeats", "breaths", "wakefulHours", "familyMeals"
]
var DEFAULT_FIXED_CARDS = ["lifeWeek", "weekends", "sunsets", "christmas"]

function defaultMetrics() {
  return {
    lifeWeek: { enabled: true },
    weekends: { enabled: true },
    sunsets: { enabled: true },
    christmas: { enabled: true },
    heartbeats: { enabled: true, beatsPerMinute: 70 },
    breaths: { enabled: true, breathsPerMinute: 14 },
    wakefulHours: { enabled: true, sleepHoursPerDay: 8 },
    familyMeals: { enabled: false, timesPerWeek: 3, untilDate: "" }
  }
}

function defaultConfig() {
  return {
    life: { enabled: true, birthDate: "", horizonYears: 90 },
    visualization: {
      mode: "perspective",
      cards: { count: 6, fixed: DEFAULT_FIXED_CARDS.slice() }
    },
    metrics: defaultMetrics(),
    alerts: {
      enabled: false,
      quietHours: { enabled: false, start: "22:00", end: "07:00" },
      startSound: "/usr/share/sounds/freedesktop/stereo/service-login.oga",
      endSound: "/usr/share/sounds/freedesktop/stereo/complete.oga"
    },
    schedule: [],
    _error: "",
    _issues: []
  }
}

function boundedNumber(value, fallback, minimum, maximum) {
  var number = Number(value)
  return isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback
}

function normalizeMetric(raw, defaults) {
  var source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}
  var result = {}
  for (var key in defaults) result[key] = defaults[key]
  result.enabled = source.enabled === undefined ? defaults.enabled : source.enabled === true
  return { source: source, result: result }
}

function parseTime(value) {
  var match = /^(\d{2}):(\d{2})$/.exec(String(value || ""))
  if (!match) return -1
  var hours = Number(match[1])
  var minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1
  return hours * 60 + minutes
}

function normalizedDays(value) {
  if (value === undefined || value === null) return ALL_DAYS.slice()
  if (!Array.isArray(value)) return []

  var result = []
  for (var i = 0; i < value.length; i++) {
    var index = DAY_NAMES.indexOf(String(value[i]).toLowerCase())
    if (index >= 0 && result.indexOf(index) < 0) result.push(index)
  }
  return result
}

function normalizeEntry(raw, index, issues) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    issues.push("Schedule entry " + (index + 1) + " is not an object")
    return null
  }

  var startMinute = parseTime(raw.start)
  var endMinute = parseTime(raw.end)
  var days = normalizedDays(raw.days)
  if (startMinute < 0 || endMinute < 0) {
    issues.push("Schedule entry " + (index + 1) + " has an invalid time")
    return null
  }
  if (days.length === 0) {
    issues.push("Schedule entry " + (index + 1) + " has no valid days")
    return null
  }

  var id = String(raw.id || ("period-" + (index + 1))).trim()
  var label = String(raw.label || id).trim()
  return {
    id: id || ("period-" + (index + 1)),
    label: label || "Period " + (index + 1),
    start: String(raw.start),
    end: String(raw.end),
    startMinute: startMinute,
    endMinute: endMinute,
    color: typeof raw.color === "string" && raw.color !== "" ? raw.color : "#8be9fd",
    days: days,
    sound: raw.sound !== false,
    startSound: typeof raw.startSound === "string" ? raw.startSound : "",
    endSound: typeof raw.endSound === "string" ? raw.endSound : "",
    sourceIndex: index
  }
}

function parseConfig(text) {
  var config = defaultConfig()
  var raw
  try {
    raw = JSON.parse(String(text || ""))
  } catch (error) {
    config._error = "Cannot parse timeline.json: " + error
    return config
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    config._error = "timeline.json must contain a JSON object"
    return config
  }

  var rawLife = raw.life && typeof raw.life === "object" && !Array.isArray(raw.life) ? raw.life : {}
  config.life.enabled = rawLife.enabled === undefined ? true : rawLife.enabled === true
  config.life.birthDate = typeof rawLife.birthDate === "string"
    ? rawLife.birthDate
    : (typeof raw.birthDate === "string" ? raw.birthDate : "")
  var rawHorizon = rawLife.horizonYears === undefined ? raw.lifeHorizonYears : rawLife.horizonYears
  config.life.horizonYears = Math.round(boundedNumber(rawHorizon, 90, 1, 150))

  var rawAlerts = raw.alerts && typeof raw.alerts === "object" && !Array.isArray(raw.alerts) ? raw.alerts : {}
  config.alerts.enabled = rawAlerts.enabled === undefined ? raw.soundsEnabled === true : rawAlerts.enabled === true
  config.alerts.startSound = typeof rawAlerts.startSound === "string" && rawAlerts.startSound !== ""
    ? rawAlerts.startSound : config.alerts.startSound
  config.alerts.endSound = typeof rawAlerts.endSound === "string" && rawAlerts.endSound !== ""
    ? rawAlerts.endSound : config.alerts.endSound
  var rawQuiet = rawAlerts.quietHours && typeof rawAlerts.quietHours === "object" && !Array.isArray(rawAlerts.quietHours)
    ? rawAlerts.quietHours : {}
  config.alerts.quietHours.enabled = rawQuiet.enabled === true
  config.alerts.quietHours.start = parseTime(rawQuiet.start) >= 0 ? rawQuiet.start : config.alerts.quietHours.start
  config.alerts.quietHours.end = parseTime(rawQuiet.end) >= 0 ? rawQuiet.end : config.alerts.quietHours.end

  var rawMetrics = raw.metrics && typeof raw.metrics === "object" && !Array.isArray(raw.metrics) ? raw.metrics : {}
  var metric

  config.metrics.lifeWeek = normalizeMetric(rawMetrics.lifeWeek, config.metrics.lifeWeek).result
  config.metrics.weekends = normalizeMetric(rawMetrics.weekends, config.metrics.weekends).result
  config.metrics.sunsets = normalizeMetric(rawMetrics.sunsets, config.metrics.sunsets).result
  config.metrics.christmas = normalizeMetric(rawMetrics.christmas, config.metrics.christmas).result

  metric = normalizeMetric(rawMetrics.heartbeats, config.metrics.heartbeats)
  metric.result.beatsPerMinute = boundedNumber(metric.source.beatsPerMinute, metric.result.beatsPerMinute, 20, 250)
  config.metrics.heartbeats = metric.result

  metric = normalizeMetric(rawMetrics.breaths, config.metrics.breaths)
  metric.result.breathsPerMinute = boundedNumber(metric.source.breathsPerMinute, metric.result.breathsPerMinute, 4, 60)
  config.metrics.breaths = metric.result

  metric = normalizeMetric(rawMetrics.wakefulHours, config.metrics.wakefulHours)
  metric.result.sleepHoursPerDay = boundedNumber(metric.source.sleepHoursPerDay, metric.result.sleepHoursPerDay, 0, 24)
  config.metrics.wakefulHours = metric.result

  metric = normalizeMetric(rawMetrics.familyMeals, config.metrics.familyMeals)
  metric.result.timesPerWeek = boundedNumber(metric.source.timesPerWeek, metric.result.timesPerWeek, 0, 50)
  metric.result.untilDate = typeof metric.source.untilDate === "string" ? metric.source.untilDate : ""
  if (metric.result.untilDate !== "" && !parseLocalDate(metric.result.untilDate)) {
    config._issues.push("familyMeals.untilDate must use YYYY-MM-DD")
    metric.result.untilDate = ""
  }
  config.metrics.familyMeals = metric.result

  var rawVisualization = raw.visualization && typeof raw.visualization === "object" && !Array.isArray(raw.visualization)
    ? raw.visualization : {}
  if (rawVisualization.mode === undefined) config.visualization.mode = "perspective"
  else if (rawVisualization.mode === "perspective" || rawVisualization.mode === "cards")
    config.visualization.mode = rawVisualization.mode
  else {
    config.visualization.mode = "perspective"
    config._issues.push("visualization.mode must be perspective or cards; using perspective")
  }

  var rawCards = rawVisualization.cards && typeof rawVisualization.cards === "object" && !Array.isArray(rawVisualization.cards)
    ? rawVisualization.cards : {}
  if (rawCards.count !== undefined) {
    var requestedCount = Number(rawCards.count)
    if (requestedCount === 2 || requestedCount === 4 || requestedCount === 6)
      config.visualization.cards.count = requestedCount
    else
      config._issues.push("visualization.cards.count must be 2, 4, or 6; using 6")
  }

  var requestedFixed = rawCards.fixed === undefined ? DEFAULT_FIXED_CARDS : rawCards.fixed
  config.visualization.cards.fixed = []
  if (!Array.isArray(requestedFixed)) {
    config._issues.push("visualization.cards.fixed must be an array; using no fixed cards")
  } else {
    for (var fixedIndex = 0; fixedIndex < requestedFixed.length; fixedIndex++) {
      var fixedId = String(requestedFixed[fixedIndex])
      if (CARD_METRIC_IDS.indexOf(fixedId) < 0) {
        config._issues.push("Unknown card metric in visualization.cards.fixed: " + fixedId)
      } else if (!config.metrics[fixedId].enabled) {
        config._issues.push("Disabled card metric ignored in visualization.cards.fixed: " + fixedId)
      } else if (config.visualization.cards.fixed.indexOf(fixedId) >= 0) {
        config._issues.push("Duplicate card metric ignored in visualization.cards.fixed: " + fixedId)
      } else if (config.visualization.cards.fixed.length >= config.visualization.cards.count) {
        config._issues.push("Fixed card exceeds visualization.cards.count and was ignored: " + fixedId)
      } else {
        config.visualization.cards.fixed.push(fixedId)
      }
    }
  }

  if (!Array.isArray(raw.schedule)) {
    config._error = "timeline.json must contain a schedule array"
    return config
  }

  for (var i = 0; i < raw.schedule.length; i++) {
    var entry = normalizeEntry(raw.schedule[i], i, config._issues)
    if (entry) config.schedule.push(entry)
  }
  return config
}

function dayStart(date, offset) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + (offset || 0), 0, 0, 0, 0)
}

function atMinute(day, minute, extraDays) {
  return new Date(
    day.getFullYear(), day.getMonth(), day.getDate() + (extraDays || 0),
    Math.floor(minute / 60), minute % 60, 0, 0)
}

function occurrence(entry, startDay) {
  var starts = atMinute(startDay, entry.startMinute, 0)
  var crossesMidnight = entry.endMinute <= entry.startMinute
  var ends = atMinute(startDay, entry.endMinute, crossesMidnight ? 1 : 0)
  return {
    id: entry.id,
    label: entry.label,
    color: entry.color,
    start: entry.start,
    end: entry.end,
    sound: entry.sound,
    startSound: entry.startSound,
    endSound: entry.endSound,
    starts: starts,
    ends: ends,
    sourceIndex: entry.sourceIndex
  }
}

function occursOn(entry, day) {
  return entry.days.indexOf(day.getDay()) >= 0
}

function activeBlock(schedule, now) {
  var active = null
  for (var offset = -1; offset <= 0; offset++) {
    var candidateDay = dayStart(now, offset)
    for (var i = 0; i < schedule.length; i++) {
      var entry = schedule[i]
      if (!occursOn(entry, candidateDay)) continue
      var item = occurrence(entry, candidateDay)
      if (now >= item.starts && now < item.ends) active = item
    }
  }

  if (!active) return null
  var durationMs = active.ends.getTime() - active.starts.getTime()
  var elapsedMs = now.getTime() - active.starts.getTime()
  active.durationMinutes = Math.round(durationMs / 60000)
  active.elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000))
  active.remainingMinutes = Math.max(0, Math.ceil((active.ends.getTime() - now.getTime()) / 60000))
  active.progress = durationMs > 0 ? Math.max(0, Math.min(1, elapsedMs / durationMs)) : 0
  return active
}

function nextBlock(schedule, now) {
  var next = null
  for (var offset = 0; offset <= 7; offset++) {
    var candidateDay = dayStart(now, offset)
    for (var i = 0; i < schedule.length; i++) {
      var entry = schedule[i]
      if (!occursOn(entry, candidateDay)) continue
      var item = occurrence(entry, candidateDay)
      if (item.starts <= now) continue
      if (!next || item.starts < next.starts ||
          (item.starts.getTime() === next.starts.getTime() && item.sourceIndex > next.sourceIndex)) next = item
    }
  }
  if (next) next.untilMinutes = Math.max(0, Math.ceil((next.starts.getTime() - now.getTime()) / 60000))
  return next
}

function daySegments(schedule, now) {
  var result = []
  var today = dayStart(now, 0)
  var yesterday = dayStart(now, -1)

  for (var i = 0; i < schedule.length; i++) {
    var entry = schedule[i]

    if (occursOn(entry, yesterday) && entry.endMinute <= entry.startMinute) {
      result.push({
        id: entry.id + "-carry",
        label: entry.label,
        color: entry.color,
        startMinute: 0,
        endMinute: entry.endMinute,
        sourceIndex: entry.sourceIndex
      })
    }

    if (occursOn(entry, today)) {
      result.push({
        id: entry.id + "-today",
        label: entry.label,
        color: entry.color,
        startMinute: entry.startMinute,
        endMinute: entry.endMinute <= entry.startMinute ? 1440 : entry.endMinute,
        sourceIndex: entry.sourceIndex
      })
    }
  }
  return result
}

function minuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}

function formatDuration(minutes) {
  var value = Math.max(0, Math.round(Number(minutes) || 0))
  var hours = Math.floor(value / 60)
  var rest = value % 60
  if (hours > 0 && rest > 0) return hours + "h " + rest + "m"
  if (hours > 0) return hours + "h"
  return rest + "m"
}

function parseLocalDate(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""))
  if (!match) return null
  var year = Number(match[1])
  var month = Number(match[2]) - 1
  var day = Number(match[3])
  var date = new Date(year, month, day, 0, 0, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date
}

function lifeStats(birthDate, horizonYears, now) {
  var born = parseLocalDate(birthDate)
  if (!born || born > now) return { valid: false }

  var horizon = Math.max(1, Math.min(150, Math.round(Number(horizonYears) || 90)))
  var boundary = new Date(born.getFullYear() + horizon, born.getMonth(), born.getDate(), 0, 0, 0, 0)
  var totalMs = Math.max(1, boundary.getTime() - born.getTime())
  var elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - born.getTime()))
  var totalWeeks = Math.max(1, Math.ceil(totalMs / WEEK_MS))
  var elapsedWeeks = Math.max(0, Math.min(totalWeeks, Math.floor(elapsedMs / WEEK_MS)))
  return {
    valid: true,
    birthDate: born,
    boundary: boundary,
    horizonYears: horizon,
    totalWeeks: totalWeeks,
    elapsedWeeks: elapsedWeeks,
    currentWeek: elapsedWeeks < totalWeeks ? elapsedWeeks : -1,
    remainingMinutes: Math.max(0, (boundary.getTime() - now.getTime()) / 60000),
    progress: elapsedMs / totalMs,
    percent: Math.round(elapsedMs / totalMs * 1000) / 10
  }
}

function calendarDayNumber(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

function remainingCalendarDays(now, boundary) {
  return Math.max(0, calendarDayNumber(boundary) - calendarDayNumber(now))
}

function countWeekdayUntil(now, boundary, weekday) {
  var days = remainingCalendarDays(now, boundary)
  if (days <= 0) return 0
  var offset = (weekday - now.getDay() + 7) % 7
  if (offset >= days) return 0
  return 1 + Math.floor((days - 1 - offset) / 7)
}

function countAnnualDateUntil(now, boundary, month, day) {
  var count = 0
  var today = dayStart(now, 0)
  for (var year = now.getFullYear(); year <= boundary.getFullYear(); year++) {
    var candidate = new Date(year, month, day, 0, 0, 0, 0)
    if (candidate >= today && candidate < boundary) count++
  }
  return count
}

function groupedInteger(value) {
  var text = String(Math.max(0, Math.round(Number(value) || 0)))
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function compactNumber(value) {
  var number = Math.max(0, Number(value) || 0)
  function compact(divisor, suffix) {
    var scaled = number / divisor
    var digits = scaled >= 100 ? 0 : (scaled >= 10 ? 1 : 2)
    return scaled.toFixed(digits).replace(/(\.[0-9])0$/, "$1").replace(/\.0+$/, "") + suffix
  }
  if (number >= 1000000000) return compact(1000000000, "B")
  if (number >= 1000000) return compact(1000000, "M")
  if (number >= 100000) return compact(1000, "K")
  return groupedInteger(number)
}

function seededShuffle(values, seed) {
  var result = values.slice()
  var state = (Math.floor(Number(seed) || 0) ^ 0x9e3779b9) >>> 0
  function random() {
    state += 0x6d2b79f5
    var value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
  for (var i = result.length - 1; i > 0; i--) {
    var index = Math.floor(random() * (i + 1))
    var current = result[i]
    result[i] = result[index]
    result[index] = current
  }
  return result
}

function selectedCardIds(config, openingSeed) {
  if (!config || !config.visualization || config.visualization.mode !== "cards") return []
  var fixed = config.visualization.cards.fixed.slice()
  var candidates = []
  for (var i = 0; i < CARD_METRIC_IDS.length; i++) {
    var id = CARD_METRIC_IDS[i]
    if (config.metrics[id].enabled && fixed.indexOf(id) < 0) candidates.push(id)
  }
  var dynamicCount = Math.max(0, config.visualization.cards.count - fixed.length)
  return fixed.concat(seededShuffle(candidates, openingSeed).slice(0, dynamicCount))
}

function personalYearPosition(life, now) {
  var age = now.getFullYear() - life.birthDate.getFullYear()
  var anniversary = new Date(
    life.birthDate.getFullYear() + age, life.birthDate.getMonth(), life.birthDate.getDate(), 0, 0, 0, 0)
  if (anniversary > now) {
    age--
    anniversary = new Date(
      life.birthDate.getFullYear() + age, life.birthDate.getMonth(), life.birthDate.getDate(), 0, 0, 0, 0)
  }
  var next = new Date(
    life.birthDate.getFullYear() + age + 1, life.birthDate.getMonth(), life.birthDate.getDate(), 0, 0, 0, 0)
  var progress = Math.max(0, Math.min(0.999999, (now.getTime() - anniversary.getTime()) / (next.getTime() - anniversary.getTime())))
  var current = Math.floor(progress * 52) + 1
  return { year: age + 1, completed: current - 1, current: current, total: 52 }
}

function cardViewModel(id, config, life, now) {
  var metrics = config.metrics
  if (id === "lifeWeek") {
    var position = personalYearPosition(life, now)
    var week = Math.max(1, Math.min(life.totalWeeks, life.elapsedWeeks + 1))
    return {
      id: id,
      kind: "week-strip",
      headline: "Week " + groupedInteger(week),
      label: "of " + groupedInteger(life.totalWeeks) + " in this horizon",
      detail: "year " + position.year + " · week " + position.current,
      completedInYear: position.completed,
      currentInYear: position.current,
      totalInYear: position.total
    }
  }
  if (id === "weekends") {
    var weekends = countWeekdayUntil(now, life.boundary, 6)
    return {
      id: id, kind: "number", headline: groupedInteger(weekends), label: "Saturdays ahead",
      detail: now.getDay() === 6 ? "One of them is already here." : "The next one is still ahead."
    }
  }
  if (id === "sunsets") {
    return {
      id: id, kind: "number", headline: groupedInteger(remainingCalendarDays(now, life.boundary)),
      label: "Sunsets ahead", detail: "One calendar-day opportunity at a time."
    }
  }
  if (id === "christmas") {
    return {
      id: id, kind: "number", headline: groupedInteger(countAnnualDateUntil(now, life.boundary, 11, 25)),
      label: "Christmases in this horizon",
      detail: now.getMonth() === 11 && now.getDate() === 25 ? "This is one of them." : "Each one is still ahead."
    }
  }
  if (id === "heartbeats") {
    return {
      id: id, kind: "number", headline: compactNumber(life.remainingMinutes * metrics.heartbeats.beatsPerMinute),
      label: "Estimated heartbeats ahead", detail: "At " + metrics.heartbeats.beatsPerMinute + " beats per minute."
    }
  }
  if (id === "breaths") {
    return {
      id: id, kind: "number", headline: compactNumber(life.remainingMinutes * metrics.breaths.breathsPerMinute),
      label: "Estimated breaths ahead", detail: "At " + metrics.breaths.breathsPerMinute + " breaths per minute."
    }
  }
  if (id === "wakefulHours") {
    var awakeRatio = (24 - metrics.wakefulHours.sleepHoursPerDay) / 24
    return {
      id: id, kind: "number", headline: groupedInteger(life.remainingMinutes * awakeRatio / 60),
      label: "Estimated waking hours ahead", detail: "Allowing " + metrics.wakefulHours.sleepHoursPerDay + " hours of sleep per day."
    }
  }
  if (id === "familyMeals") {
    var mealsBoundary = parseLocalDate(metrics.familyMeals.untilDate) || life.boundary
    if (mealsBoundary > life.boundary) mealsBoundary = life.boundary
    var mealsRemainingMinutes = Math.max(0, (mealsBoundary.getTime() - now.getTime()) / 60000)
    var meals = mealsRemainingMinutes / (WEEK_MS / 60000) * metrics.familyMeals.timesPerWeek
    var mealHorizon = metrics.familyMeals.untilDate
      ? " until " + metrics.familyMeals.untilDate
      : " across this life horizon"
    return {
      id: id, kind: "number", headline: groupedInteger(meals),
      label: "Estimated family meals ahead",
      detail: "At " + metrics.familyMeals.timesPerWeek + " per week" + mealHorizon + "."
    }
  }
  return null
}

function cardDeck(config, life, now, openingSeed) {
  if (!life || !life.valid || !config || !config.metrics) return []
  var ids = selectedCardIds(config, openingSeed)
  var cards = []
  for (var i = 0; i < ids.length; i++) {
    var card = cardViewModel(ids[i], config, life, now)
    if (card) cards.push(card)
  }
  return cards
}

function metricSummary(metrics, counts, excluded) {
  var parts = []
  if (metrics.weekends.enabled && excluded !== "weekends")
    parts.push(groupedInteger(counts.weekends) + " Saturdays")
  if (metrics.sunsets.enabled && excluded !== "sunsets")
    parts.push(groupedInteger(counts.sunsets) + " sunsets")
  if (metrics.christmas.enabled && excluded !== "christmas")
    parts.push(groupedInteger(counts.christmas) + " Christmases")
  return parts.join(" · ")
}

function perspective(config, life, now) {
  if (!life || !life.valid || !config || !config.metrics)
    return { visible: false, kind: "", headline: "", context: "", supporting: "" }

  var metrics = config.metrics
  var counts = {
    weekends: countWeekdayUntil(now, life.boundary, 6),
    sunsets: remainingCalendarDays(now, life.boundary),
    christmas: countAnnualDateUntil(now, life.boundary, 11, 25)
  }
  var daysLived = calendarDayNumber(now) - calendarDayNumber(life.birthDate)
  var isChristmas = now.getMonth() === 11 && now.getDate() === 25
  var isLifeWeekRollover = daysLived > 0 && daysLived % 7 === 0 && now.getHours() < 12

  if (metrics.christmas.enabled && isChristmas) {
    return {
      visible: true,
      kind: "christmas",
      headline: groupedInteger(counts.christmas) + " Christmases in this horizon",
      context: "This is one of them.",
      supporting: metricSummary(metrics, counts, "christmas")
    }
  }

  if (metrics.lifeWeek.enabled && isLifeWeekRollover) {
    return {
      visible: true,
      kind: "week",
      headline: "Week " + groupedInteger(Math.floor(daysLived / 7)) + " ended.",
      context: "A new week begins.",
      supporting: metricSummary(metrics, counts, "")
    }
  }

  if (metrics.weekends.enabled && now.getDay() === 6) {
    return {
      visible: true,
      kind: "weekends",
      headline: groupedInteger(counts.weekends) + " Saturdays ahead",
      context: "One of them is already here.",
      supporting: metricSummary(metrics, counts, "weekends")
    }
  }

  if (metrics.sunsets.enabled && now.getHours() >= 16) {
    return {
      visible: true,
      kind: "sunsets",
      headline: groupedInteger(counts.sunsets) + " sunsets ahead",
      context: "One of them belongs to today.",
      supporting: metricSummary(metrics, counts, "sunsets")
    }
  }

  if (metrics.weekends.enabled) {
    var daysUntilSaturday = (6 - now.getDay() + 7) % 7
    if (daysUntilSaturday === 0) daysUntilSaturday = 7
    return {
      visible: true,
      kind: "weekends",
      headline: groupedInteger(counts.weekends) + " Saturdays ahead",
      context: "The next one is in " + daysUntilSaturday + (daysUntilSaturday === 1 ? " day." : " days."),
      supporting: metricSummary(metrics, counts, "weekends")
    }
  }

  if (metrics.sunsets.enabled) {
    return {
      visible: true,
      kind: "sunsets",
      headline: groupedInteger(counts.sunsets) + " sunsets ahead",
      context: "One of them belongs to today.",
      supporting: metricSummary(metrics, counts, "sunsets")
    }
  }

  if (metrics.christmas.enabled) {
    return {
      visible: true,
      kind: "christmas",
      headline: groupedInteger(counts.christmas) + " Christmases in this horizon",
      context: "Each one is still ahead.",
      supporting: ""
    }
  }

  return { visible: false, kind: "", headline: "", context: "", supporting: "" }
}
