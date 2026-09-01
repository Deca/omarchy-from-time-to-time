#!/usr/bin/env bash
set -euo pipefail

temp=$(mktemp -d)
trap 'rm -rf "$temp"' EXIT
mkdir -p "$temp/bin"
mkdir -m700 "$temp/runtime"

cat > "$temp/bin/pw-play" <<'PLAYER'
#!/usr/bin/env bash
printf 'played:%s\n' "$1" >> "$CALLS"
PLAYER
chmod +x "$temp/bin/pw-play"
: > "$temp/start.oga"
: > "$temp/end.oga"

export PATH="$temp/bin:$PATH"
export XDG_RUNTIME_DIR="$temp/runtime"
unset XDG_STATE_HOME
export CALLS="$temp/calls"
script=$(cd "$(dirname "$0")/.." && pwd)/play-transition.sh
state_root="$XDG_RUNTIME_DIR/from-time-to-time-alerts"

"$script" test-start start "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
"$script" test-start start "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
[[ $(wc -l < "$temp/calls") -eq 1 ]]

"$script" test-switch switch "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
[[ $(wc -l < "$temp/calls") -eq 3 ]]
[[ ! -L $state_root && -d $state_root && -O $state_root ]]
[[ $(stat -c '%a' -- "$state_root") == 700 ]]
while IFS= read -r marker; do
  [[ ! -L $marker && -d $marker && -O $marker ]]
  [[ $(stat -c '%a' -- "$marker") == 700 ]]
done < <(find "$state_root" -mindepth 1 -maxdepth 1 -type d)

# A pre-planted marker must suppress playback without following the link.
planted_key=test-planted-marker
planted_hash=$(printf '%s' "$planted_key" | sha256sum | awk '{print $1}')
mkdir "$temp/marker-victim"
ln -s "$temp/marker-victim" "$state_root/$planted_hash"
calls_before=$(wc -l < "$temp/calls")
"$script" "$planted_key" start "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
[[ $(wc -l < "$temp/calls") -eq $calls_before ]]
[[ -z $(find "$temp/marker-victim" -mindepth 1 -print -quit) ]]

# A pre-planted state-root link must fail closed without writing through it.
mkdir -m700 "$temp/linked-runtime" "$temp/root-victim"
ln -s "$temp/root-victim" "$temp/linked-runtime/from-time-to-time-alerts"
XDG_RUNTIME_DIR="$temp/linked-runtime" \
  "$script" test-planted-root start "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
[[ $(wc -l < "$temp/calls") -eq $calls_before ]]
[[ -z $(find "$temp/root-victim" -mindepth 1 -print -quit) ]]

# A broken or malicious sound player must not outlive the playback deadline.
cat > "$temp/bin/pw-play" <<'PLAYER'
#!/usr/bin/env bash
exec sleep 30
PLAYER
chmod +x "$temp/bin/pw-play"
mkdir -m700 "$temp/timeout-runtime"
started=$SECONDS
XDG_RUNTIME_DIR="$temp/timeout-runtime" \
  "$script" test-timeout start "$temp/start.oga" "$temp/end.oga" false 22:00 07:00
elapsed=$((SECONDS - started))
(( elapsed >= 4 && elapsed <= 8 ))

printf '%s\n' "From Time to Time alert tests passed"
