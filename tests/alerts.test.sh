#!/usr/bin/env bash
set -euo pipefail

temp=$(mktemp -d)
trap 'rm -rf "$temp"' EXIT
mkdir -p "$temp/bin" "$temp/state"

cat > "$temp/bin/pw-play" <<'PLAYER'
#!/usr/bin/env bash
printf 'played:%s\n' "$1" >> "$CALLS"
PLAYER
chmod +x "$temp/bin/pw-play"
: > "$temp/start.oga"
: > "$temp/end.oga"

export PATH="$temp/bin:$PATH"
export XDG_STATE_HOME="$temp/state"
export CALLS="$temp/calls"
script=$(cd "$(dirname "$0")/.." && pwd)/play-transition.sh

"$script" test-start start "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
"$script" test-start start "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
[[ $(wc -l < "$temp/calls") -eq 1 ]]

"$script" test-switch switch "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
[[ $(wc -l < "$temp/calls") -eq 3 ]]

printf '%s\n' "From Time to Time alert tests passed"
