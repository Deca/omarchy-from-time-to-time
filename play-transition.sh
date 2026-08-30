#!/usr/bin/env bash
set -euo pipefail

# One transition may be observed by a timeline instance on every monitor.
# Claim its deterministic event key under a lock before playing anything.
event_key=${1:-}
event_kind=${2:-}
start_sound=${3:-}
end_sound=${4:-}
quiet_enabled=${5:-false}
quiet_start=${6:-22:00}
quiet_end=${7:-07:00}

[[ -n $event_key ]] || exit 0

state_root=${XDG_STATE_HOME:-"$HOME/.local/state"}/omarchy
state_file=$state_root/timeline-alert.state
lock_file=$state_root/timeline-alert.lock
mkdir -p "$state_root"

exec 9>"$lock_file"
flock 9
previous_key=""
[[ -f $state_file ]] && IFS= read -r previous_key < "$state_file" || true
[[ $previous_key == "$event_key" ]] && exit 0
printf '%s\n' "$event_key" > "$state_file.tmp.$$"
mv -f "$state_file.tmp.$$" "$state_file"
flock -u 9

minutes_for_time() {
  local value=$1 hour minute
  [[ $value =~ ^([0-9]{2}):([0-9]{2})$ ]] || return 1
  hour=${BASH_REMATCH[1]}
  minute=${BASH_REMATCH[2]}
  (( 10#$hour <= 23 && 10#$minute <= 59 )) || return 1
  printf '%d\n' "$((10#$hour * 60 + 10#$minute))"
}

if [[ $quiet_enabled == true ]]; then
  now_minutes=$((10#$(date +%H) * 60 + 10#$(date +%M)))
  start_minutes=$(minutes_for_time "$quiet_start") || start_minutes=1320
  end_minutes=$(minutes_for_time "$quiet_end") || end_minutes=420

  if (( start_minutes == end_minutes )); then
    exit 0
  elif (( start_minutes < end_minutes )); then
    (( now_minutes >= start_minutes && now_minutes < end_minutes )) && exit 0
  else
    (( now_minutes >= start_minutes || now_minutes < end_minutes )) && exit 0
  fi
fi

play() {
  local sound=$1
  [[ -n $sound && -r $sound ]] || return 0
  pw-play "$sound" >/dev/null 2>&1 || true
}

case "$event_kind" in
  start)  play "$start_sound" ;;
  end)    play "$end_sound" ;;
  switch)
    play "$end_sound"
    sleep 0.12
    play "$start_sound"
    ;;
esac
