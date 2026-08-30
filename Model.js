var DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
var ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
var DAY_MS = 24 * 60 * 60 * 1000
var WEEK_MS = 7 * DAY_MS

function defaultMetrics() {
  return {
    weekends: { enabled: true },
    sunsets: { enabled: true },
    christmas: { enabled: true }
  }
}

function defaultConfig() {
  return {
    life: { enabled: true, birthDate: "", horizonYears: 90 },
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
  config.metrics.weekends = normalizeMetric(rawMetrics.weekends, config.metrics.weekends).result
  config.metrics.sunsets = normalizeMetric(rawMetrics.sunsets, config.metrics.sunsets).result
  config.metrics.christmas = normalizeMetric(rawMetrics.christmas, config.metrics.christmas).result

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

  if (isLifeWeekRollover) {
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
