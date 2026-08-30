# From Time to Time

A calm Omarchy bar timeline for seeing the current period, the shape of today, and the time of a life.

It is an awareness instrument—not a task manager, productivity score, or medical prediction.

![From Time to Time panel](preview.png)

## Features

- Compact current-period label, progress, and remaining time
- Full 24-hour schedule with overnight and weekday-aware periods
- Compact life-horizon progress
- Perspective mode: one context-aware reflection drawn from Saturdays, sunsets, Christmases, and the weekly life rollover
- Cards mode: a bounded two-column deck with fixed and per-opening rotating metrics
- An original 52-mark personal-year strip that makes the current life-week tangible
- Optional start/end sounds with quiet hours
- Startup, suspend/resume, and multi-monitor alert safeguards
- Local JSON configuration with no account, telemetry, or network access

## Requirements

- Omarchy Quattro with the Quickshell-based Omarchy shell
- `bash`, `flock`, and `pw-play` for transition alerts
- Freedesktop sound files for the default cues, or custom readable sound paths

The plugin runs unsandboxed with your normal user permissions. It does not use `sudo`, install packages, or contact remote services.

## Install

```sh
omarchy plugin add https://github.com/Deca/omarchy-from-time-to-time.git --enable
omarchy bar move io.github.deca.from-time-to-time --section center
```

Create a personal configuration without overwriting an existing one:

```sh
install -Dm600 -n \
  "$HOME/.config/omarchy/plugins/io.github.deca.from-time-to-time/timeline.example.json" \
  "$HOME/.config/omarchy/timeline.json"
```

Then edit:

```text
~/.config/omarchy/timeline.json
```

Changes are loaded automatically. Without a personal configuration, the plugin remains usable in an empty state and displays setup guidance.

## Configure

Set `life.birthDate` to an ISO local date:

```json
{
  "life": {
    "enabled": true,
    "birthDate": "1990-01-01",
    "horizonYears": 90
  }
}
```

The complete sanitized schema is in [`timeline.example.json`](timeline.example.json). This is strict JSON, so explanatory notes use ignored keys such as `_note` rather than `//` comments.

### Schedule periods

```json
{
  "id": "work",
  "label": "Work",
  "start": "09:00",
  "end": "17:00",
  "color": "#8be9fd",
  "days": ["mon", "tue", "wed", "thu", "fri"]
}
```

A period ending before it starts crosses midnight. `days` identifies the day on which the period starts. Supported names are `sun`, `mon`, `tue`, `wed`, `thu`, `fri`, and `sat`.

Schedule entries should not overlap. If they do, the later entry wins the compact current-period view while both remain visible in the timeline.

### Transition alerts

Global alerts are configured under `alerts`:

```json
{
  "alerts": {
    "enabled": true,
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "07:00"
    },
    "startSound": "/usr/share/sounds/freedesktop/stereo/service-login.oga",
    "endSound": "/usr/share/sounds/freedesktop/stereo/complete.oga"
  }
}
```

Quiet hours may cross midnight. Each period plays alerts by default. Set `"sound": false` on an individual period, or give it `startSound` and `endSound` overrides.

Alerts suppress cues on startup and configuration reload, stale cues after suspend or clock jumps, and duplicate playback from multiple monitors.

### Visualization modes

Perspective is the default. It chooses one featured reflection rather than presenting a dashboard of equally weighted counters. Context decides what deserves prominence: Christmas Day, the start of a personal life-week, Saturday, and local evening can each change the copy.

Set `visualization.mode` to `cards` for a bounded alternative:

```json
{
  "visualization": {
    "mode": "cards",
    "cards": {
      "count": 6,
      "fixed": ["lifeWeek", "weekends", "sunsets", "christmas"]
    }
  }
}
```

`count` accepts `2`, `4`, or `6`. Fixed IDs keep their listed order. Enabled card metrics not fixed form the rotation pool; enough are selected without replacement each time the panel opens and remain in place while it is open. If too few metrics are available, the panel shows fewer cards rather than duplicates or filler.

The initial card set is `lifeWeek`, `weekends`, `sunsets`, `christmas`, `heartbeats`, `breaths`, `wakefulHours`, and `familyMeals`. Cards include a small live countdown to the next meaningful estimate or calendar change; values such as waking time retain a lower-level hours/minutes readout. Rate-based values are estimates to the chosen horizon, not medical predictions. `familyMeals` is disabled in the example because it describes a personal relationship; enable it only when its assumptions feel useful.

#### Managing cards

Each card has an `enabled` switch under `metrics`. Disabled cards cannot be fixed or selected for rotation. `visualization.cards.fixed` is an ordered list: those cards appear first and do not rotate. Every other enabled card is a candidate for the remaining slots. Change the list to choose a different balance, for example:

```json
{
  "visualization": {
    "mode": "cards",
    "cards": {
      "count": 4,
      "fixed": ["lifeWeek", "familyMeals"]
    }
  },
  "metrics": {
    "familyMeals": {
      "enabled": true,
      "timesPerWeek": 3,
      "untilDate": "2030-01-01"
    }
  }
}
```

`familyMeals` estimates meals from now until `untilDate` at `timesPerWeek`. If `untilDate` is empty, it uses the life horizon; a date beyond the life horizon is capped there. This is a simple frequency estimate, not a promise that meals will happen. Use an explicit date when the relationship has a more meaningful shared horizon.

Changes reload automatically. Open the panel after changing configuration, or press `R` while focused / middle-click the bar to reload. A bad mode, card count, unknown ID, disabled fixed ID, duplicate, or excess fixed ID is ignored and shown as a configuration issue in the panel. If fewer enabled cards exist than requested slots, fewer cards are shown.

[`METRICS.md`](METRICS.md) remains a research catalogue and admission test for future ideas—not a menu of promised features.

## Interactions

- Left click: open or close the panel
- Middle click: reload configuration
- Escape: close the panel
- `R` while the panel is focused: reload configuration

The panel can also be controlled through the shell:

```sh
omarchy-shell shell summon io.github.deca.from-time-to-time '{}'
omarchy-shell shell hide io.github.deca.from-time-to-time
```

## Remove

```sh
omarchy plugin remove io.github.deca.from-time-to-time
```

Removal intentionally leaves your personal configuration in place. Delete it separately only if you no longer want it:

```sh
rm "$HOME/.config/omarchy/timeline.json"
```

## Development

```sh
omarchy plugin validate .
node tests/model.test.js
tests/alerts.test.sh
```

## License

[MIT](LICENSE). Portions follow Omarchy's MIT-licensed clock/bar-widget structure; the original copyright notice is preserved.
