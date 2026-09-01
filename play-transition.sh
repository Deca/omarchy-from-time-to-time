#!/usr/bin/env bash
set -euo pipefail

# One transition may be observed by a timeline instance on every monitor.
# Claim a deterministic marker in the owner-only runtime directory before
# playing anything. mkdir is atomic and never follows a pre-planted object at
# the marker path, so duplicate observers and unsafe paths both fail closed.
event_key=${1:-}
event_kind=${2:-}
start_sound=${3:-}
end_sound=${4:-}
quiet_enabled=${5:-false}
quiet_start=${6:-22:00}
quiet_end=${7:-07:00}

[[ -n $event_key ]] || exit 0

umask 077
runtime_root=${XDG_RUNTIME_DIR:-}
[[ -n $runtime_root && -d $runtime_root && ! -L $runtime_root && -O $runtime_root ]] || exit 0
[[ $(stat -c '%a' -- "$runtime_root" 2>/dev/null) == 700 ]] || exit 0

state_root=$runtime_root/from-time-to-time-alerts
if [[ -e $state_root || -L $state_root ]]; then
  [[ -d $state_root && ! -L $state_root && -O $state_root ]] || exit 0
else
  mkdir -m 700 -- "$state_root" 2>/dev/null || exit 0
fi
chmod 700 -- "$state_root" 2>/dev/null || exit 0
[[ $(stat -c '%a' -- "$state_root" 2>/dev/null) == 700 ]] || exit 0

event_hash=$(printf '%s' "$event_key" | sha256sum)
event_hash=${event_hash%% *}
[[ $event_hash =~ ^[[:xdigit:]]{64}$ ]] || exit 0
marker=$state_root/$event_hash
mkdir -m 700 -- "$marker" 2>/dev/null || exit 0
[[ -d $marker && ! -L $marker && -O $marker ]] || exit 0
[[ $(stat -c '%a' -- "$marker" 2>/dev/null) == 700 ]] || exit 0

# Keep this event and at most 63 other plugin-owned markers. rmdir only removes
# validated empty directories and cannot follow a path replaced with a symlink.
max_event_markers=64
kept_markers=1
for candidate in "$state_root"/*; do
  candidate_name=${candidate##*/}
  [[ $candidate != "$marker" ]] || continue
  [[ $candidate_name =~ ^[[:xdigit:]]{64}$ ]] || continue
  [[ -d $candidate && ! -L $candidate && -O $candidate ]] || continue

  if (( kept_markers < max_event_markers )); then
    kept_markers=$((kept_markers + 1))
  else
    rmdir -- "$candidate" 2>/dev/null || true
  fi
done

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
  timeout --signal=TERM --kill-after=1s 5s pw-play -- "$sound" >/dev/null 2>&1 || true
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
