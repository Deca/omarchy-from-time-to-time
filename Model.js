var DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
var ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
var DAY_MS = 24 * 60 * 60 * 1000
var WEEK_MS = 7 * DAY_MS

function defaultMetrics() {
  return {
    heartbeats: { enabled: true, beatsPerMinute: 70 },
    breaths: { enabled: true, breathsPerMinute: 14 },
    wakefulHours: { enabled: true, sleepHoursPerDay: 8 },
    weekends: { enabled: true },
    sunsets: { enabled: true },
    christmas: { enabled: true, celebrationHoursPerYear: 12, showHours: true },
    familyMeals: { enabled: false, timesPerWeek: 3, untilDate: "" }
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
  var metric

  metric = normalizeMetric(rawMetrics.heartbeats, config.metrics.heartbeats)
  metric.result.beatsPerMinute = boundedNumber(metric.source.beatsPerMinute, metric.result.beatsPerMinute, 20, 250)
  config.metrics.heartbeats = metric.result

  metric = normalizeMetric(rawMetrics.breaths, config.metrics.breaths)
  metric.result.breathsPerMinute = boundedNumber(metric.source.breathsPerMinute, metric.result.breathsPerMinute, 4, 60)
  config.metrics.breaths = metric.result

  metric = normalizeMetric(rawMetrics.wakefulHours, config.metrics.wakefulHours)
  metric.result.sleepHoursPerDay = boundedNumber(metric.source.sleepHoursPerDay, metric.result.sleepHoursPerDay, 0, 24)
  config.metrics.wakefulHours = metric.result

  metric = normalizeMetric(rawMetrics.weekends, config.metrics.weekends)
  config.metrics.weekends = metric.result

  metric = normalizeMetric(rawMetrics.sunsets, config.metrics.sunsets)
  config.metrics.sunsets = metric.result

  metric = normalizeMetric(rawMetrics.christmas, config.metrics.christmas)
  metric.result.celebrationHoursPerYear = boundedNumber(metric.source.celebrationHoursPerYear, metric.result.celebrationHoursPerYear, 0, 168)
  metric.result.showHours = metric.source.showHours === undefined ? metric.result.showHours : metric.source.showHours === true
  config.metrics.christmas = metric.result

  metric = normalizeMetric(rawMetrics.familyMeals, config.metrics.familyMeals)
  metric.result.timesPerWeek = boundedNumber(metric.source.timesPerWeek, metric.result.timesPerWeek, 0, 50)
  metric.result.untilDate = typeof metric.source.untilDate === "string" ? metric.source.untilDate : ""
  if (metric.result.untilDate !== "" && !parseLocalDate(metric.result.untilDate)) {
    config._issues.push("familyMeals.untilDate must use YYYY-MM-DD")
    metric.result.untilDate = ""
  }
  config.metrics.familyMeals = metric.result

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

function twoDigits(value) {
  return value < 10 ? "0" + value : String(value)
}

function formatCountdown(milliseconds) {
  var seconds = Math.max(0, Math.floor(milliseconds / 1000))
  var days = Math.floor(seconds / 86400)
  seconds -= days * 86400
  var hours = Math.floor(seconds / 3600)
  seconds -= hours * 3600
  var minutes = Math.floor(seconds / 60)
  seconds -= minutes * 60
  return (days > 0 ? days + "d " : "")
    + twoDigits(hours) + ":" + twoDigits(minutes) + ":" + twoDigits(seconds)
}

function formatHoursMinutes(minutes) {
  var wholeMinutes = Math.max(0, Math.floor(minutes))
  return groupedInteger(Math.floor(wholeMinutes / 60)) + "h " + twoDigits(wholeMinutes % 60) + "m"
}

function nextWeekday(now, weekday) {
  var offset = (weekday - now.getDay() + 7) % 7
  if (offset === 0) offset = 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, 0, 0, 0)
}

function nextAnnualDate(now, month, day) {
  var candidate = new Date(now.getFullYear(), month, day, 0, 0, 0, 0)
  if (candidate <= now) candidate = new Date(now.getFullYear() + 1, month, day, 0, 0, 0, 0)
  return candidate
}

function nextRoundedDrop(millisecondsRemaining, unitsPerMillisecond) {
  if (millisecondsRemaining <= 0 || unitsPerMillisecond <= 0) return 0
  var units = millisecondsRemaining * unitsPerMillisecond
  var threshold = Math.round(units) - 0.5
  return Math.max(0, (units - threshold) / unitsPerMillisecond)
}

function awarenessMetrics(config, life, now) {
  if (!life || !life.valid || !config || !config.metrics) return []

  var result = []
  var metrics = config.metrics
  var remainingMinutes = life.remainingMinutes

  if (metrics.heartbeats.enabled) {
    result.push({
      id: "heartbeats",
      label: "HEARTBEATS",
      value: groupedInteger(remainingMinutes * metrics.heartbeats.beatsPerMinute),
      detail: "estimated @ " + metrics.heartbeats.beatsPerMinute + "/min",
      countdown: "↓ counting every second"
    })
  }

  if (metrics.breaths.enabled) {
    result.push({
      id: "breaths",
      label: "BREATHS",
      value: groupedInteger(remainingMinutes * metrics.breaths.breathsPerMinute),
      detail: "estimated @ " + metrics.breaths.breathsPerMinute + "/min",
      countdown: "↓ counting live"
    })
  }

  if (metrics.wakefulHours.enabled) {
    var awakeRatio = (24 - metrics.wakefulHours.sleepHoursPerDay) / 24
    result.push({
      id: "wakefulHours",
      label: "WAKEFUL HOURS",
      value: formatHoursMinutes(remainingMinutes * awakeRatio),
      detail: metrics.wakefulHours.sleepHoursPerDay + "h sleep/day",
      countdown: "↓ allocated time remaining"
    })
  }

  if (metrics.weekends.enabled) {
    var comingSaturday = nextWeekday(now, 6)
    result.push({
      id: "weekends",
      label: "WEEKENDS",
      value: groupedInteger(countWeekdayUntil(now, life.boundary, 6)),
      detail: "calendar Saturdays",
      countdown: comingSaturday < life.boundary
        ? "next in " + formatCountdown(comingSaturday.getTime() - now.getTime())
        : "no further occurrence"
    })
  }

  if (metrics.sunsets.enabled) {
    var nextDay = dayStart(now, 1)
    result.push({
      id: "sunsets",
      label: "SUNSETS",
      value: groupedInteger(remainingCalendarDays(now, life.boundary)),
      detail: "one opportunity/day",
      countdown: "next count in " + formatCountdown(nextDay.getTime() - now.getTime())
    })
  }

  if (metrics.christmas.enabled) {
    var christmases = countAnnualDateUntil(now, life.boundary, 11, 25)
    var christmasDetail = "through " + life.boundary.getFullYear()
    var nextChristmas = nextAnnualDate(now, 11, 25)
    if (metrics.christmas.showHours)
      christmasDetail = groupedInteger(christmases * metrics.christmas.celebrationHoursPerYear) + " celebration hours"
    result.push({
      id: "christmas",
      label: "CHRISTMASES",
      value: groupedInteger(christmases),
      detail: christmasDetail,
      countdown: nextChristmas < life.boundary
        ? "next in " + formatCountdown(nextChristmas.getTime() - now.getTime())
        : "no further occurrence"
    })
  }

  if (metrics.familyMeals.enabled) {
    var mealsBoundary = parseLocalDate(metrics.familyMeals.untilDate) || life.boundary
    var mealsMilliseconds = Math.max(0, mealsBoundary.getTime() - now.getTime())
    var mealsPerMillisecond = metrics.familyMeals.timesPerWeek / WEEK_MS
    result.push({
      id: "familyMeals",
      label: "FAMILY MEALS",
      value: groupedInteger(mealsMilliseconds * mealsPerMillisecond),
      detail: metrics.familyMeals.timesPerWeek + "/week"
        + (metrics.familyMeals.untilDate ? " until " + metrics.familyMeals.untilDate : ""),
      countdown: "next estimate drop in "
        + formatCountdown(nextRoundedDrop(mealsMilliseconds, mealsPerMillisecond))
    })
  }

  return result
}
