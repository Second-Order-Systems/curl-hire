#!/usr/bin/env bash
__HEADER__

#: This file is a template. The Worker fills in the header above and the settings
#: below from apply.config.js, and drops these #: lines. To see the finished
#: script, run: npm run preview

set -u

__CONFIG__

TTY="${CURL_HIRE_TTY:-/dev/tty}"

if ! { : < "$TTY"; } 2>/dev/null; then
  echo "This needs an interactive terminal. Run: $RUN"
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "This needs curl. Install it and run again."
  exit 1
fi

if [ -t 1 ]; then
  B=$'\033[1m'; D=$'\033[2m'; A=$'\033[38;5;141m'; R=$'\033[38;5;203m'; G=$'\033[38;5;114m'; N=$'\033[0m'
else
  B=""; D=""; A=""; R=""; G=""; N=""
fi

START=$(date +%s)
CMDS=""
EGGS=""
EDITS=0
TOKEN=""
APP_ID=""
TOTAL=${#KEYS[@]}
ANSWERS=()
TIMES=()

say()  { printf '%s\n' "$*"; }
err()  { printf '%s%s%s\n' "$R" "$*" "$N"; }
dim()  { printf '%s%s%s\n' "$D" "$*" "$N"; }
trim() { local s="$1"; s="${s#"${s%%[![:space:]]*}"}"; s="${s%"${s##*[![:space:]]}"}"; printf '%s' "$s"; }
clip() { local s="$1" n="$2"; if [ "${#s}" -gt "$n" ]; then printf '%s…' "${s:0:$((n-1))}"; else printf '%s' "$s"; fi; }
add_egg() { case " $EGGS " in *" $1 "*) ;; *) EGGS="${EGGS:+$EGGS }$1" ;; esac; }
valid_email() { case "$1" in *" "*) return 1 ;; ?*@?*.?*) return 0 ;; *) return 1 ;; esac; }
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
words() { printf '%s' "$1" | wc -w | tr -d ' '; }
is_ascii() { ! printf '%s' "$1" | LC_ALL=C grep -q '[^ -~]'; }
stop() { printf '\n%sStopped. Nothing was sent.%s\n' "$D" "$N"; exit 130; }

banner() {
  printf '%s' "$A"; logo; printf '%s\n' "$N"
  printf '%s%s%s\n' "$B" "$TITLE" "$N"
  [ -n "$DETAILS" ] && dim "$DETAILS"
  [ -n "$WEBSITE" ] && printf '%s%s%s\n' "$A" "$WEBSITE" "$N"
  echo
  intro
  echo
  say "Type ${A}apply${N} to begin, or ${A}help${N} to look around."
  echo
}

shell_loop() {
  local raw cmd lc
  while :; do
    raw=""
    IFS= read -r -e -p "$PS_NAME ~ \$ " raw || exit 0
    cmd=$(trim "$raw")
    [ -z "$cmd" ] && continue
    [ "${#CMDS}" -lt 1500 ] && CMDS="${CMDS:+$CMDS | }$cmd"
    lc=$(printf '%s' "$cmd" | tr '[:upper:]' '[:lower:]' | tr -s ' ')
    case "$lc" in
      apply|start|./apply) return ;;
      clear) clear 2>/dev/null || printf '\n\n' ;;
      exit|quit|logout|:q|:wq) say "See you."; exit 0 ;;
      site|web|website) if [ -n "$WEBSITE" ]; then say "$WEBSITE"; else say "Command not found. Try help."; fi; echo ;;
      *)
        case "$PAGES" in
          *" $lc "*) page "$lc"; echo ;;
          *) hidden "$lc" || say "Command not found. Try help." ;;
        esac ;;
    esac
  done
}

# Prints why an answer was refused (and how to fix it), and returns 1 if it looks like junk.
check_answer() {
  local i=$1 v="$2" what lv n w letters vowels nonspace j t count domain m
  [ -z "$v" ] && return 0
  what=$(lower "${LABEL[$i]}")
  lv=$(lower "$v")
  n=${#v}
  if [ "$n" -lt "${MIN[$i]}" ]; then
    echo "Too short: that's $n character$([ "$n" = 1 ] || echo s), and this one needs at least ${MIN[$i]}. Tell us a bit more."; return 1
  fi
  w=$(words "$v")
  if [ "$w" -lt "${MINW[$i]}" ]; then
    echo "Too short: that's $w word$([ "$w" = 1 ] || echo s), and this one needs at least ${MINW[$i]}."; return 1
  fi

  case "${TYPE[$i]}" in
    name)
      if case "$JUNK" in *" $lv "*) true ;; *) false ;; esac; then
        echo "\"$v\" looks like a placeholder, not a real $what."; return 1
      fi
      if ! printf '%s' "$v" | grep -q '[[:alpha:]]'; then echo "A $what needs letters. \"$v\" has none."; return 1; fi
      if printf '%s' "$v" | grep -Eq '@|https?:'; then echo "Just your $what here, without emails or links."; return 1; fi
      if printf '%s' "$v" | grep -Eq '[0-9]{3,}'; then echo "A $what shouldn't contain long numbers."; return 1; fi ;;
    email)
      if ! valid_email "$v"; then echo "That isn't a valid email address. It should look like name@example.com, with no spaces."; return 1; fi
      domain=$(lower "${v##*@}")
      case "$DISPOSABLE" in *" $domain "*)
        echo "Temporary inboxes like $domain aren't accepted. Use an email you'll check, because that's where we'll reply."; return 1 ;;
      esac ;;
    links)
      set -f; count=0
      for t in $v; do
        count=$((count+1))
        if ! printf '%s' "$t" | grep -Eq '^(@[A-Za-z0-9_.-]{1,40}|(https?://)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(/[^[:space:]]*)?)$'; then
          set +f
          echo "\"$(clip "$t" 30)\" isn't a link or @handle. Use links like github.com/you or handles like @you, separated by spaces."; return 1
        fi
      done
      set +f
      if [ "$count" -gt 8 ]; then echo "That's $count links, and the limit is 8. Keep your best ones."; return 1; fi ;;
  esac

  if [ "${PROSE[$i]}" = 1 ]; then
    if case "$JUNK" in *" $lv "*) true ;; *) false ;; esac; then
      echo "\"$v\" reads like a placeholder, not an answer. Short is fine, but tell us something real."; return 1
    fi
    if printf '%s' "$v" | grep -q '\(.\)\1\{4,\}'; then
      echo "The same character is repeated 5 or more times in a row, which looks like filler. Try again?"; return 1
    fi
    m=$(printf '%s' "$lv" | grep -Eo 'asdf|qwert|zxcv|hjkl|lorem ipsum' | head -1)
    if [ -n "$m" ]; then echo "\"$m\" looks like keyboard mashing or placeholder text. Give us a real answer."; return 1; fi
    if is_ascii "$v"; then
      letters=$(printf '%s' "$v" | tr -cd 'A-Za-z' | wc -c | tr -d ' ')
      nonspace=$(printf '%s' "$v" | tr -d ' \t' | wc -c | tr -d ' ')
      if [ $((letters * 2)) -lt "$nonspace" ]; then
        echo "That's mostly symbols or numbers. Answer in words, please."; return 1
      fi
      if [ "$letters" -ge 20 ]; then
        vowels=$(printf '%s' "$v" | tr -cd 'AEIOUaeiou' | wc -c | tr -d ' ')
        if [ $((vowels * 100)) -lt $((letters * 15)) ] || [ $((vowels * 100)) -gt $((letters * 70)) ]; then
          echo "That doesn't read like real words (the mix of letters looks random). If it's full of technical terms, add a few plain words around them."; return 1
        fi
      fi
    fi
    for ((j = 0; j < TOTAL; j++)); do
      [ "$j" = "$i" ] && continue
      [ "${PROSE[$j]}" = 1 ] || continue
      if [ -n "${ANSWERS[$j]:-}" ] && [ "$(lower "${ANSWERS[$j]}")" = "$lv" ]; then
        echo "That's the same answer you gave for \"${LABEL[$j]}\". Each question needs its own answer."; return 1
      fi
    done
  fi
  return 0
}

# ── Asking ───────────────────────────────────────────────────────
ask_step() {
  local i=$1 t0 val key len k o msg where
  local opts=()
  echo
  where="${SECTION[$i]:+${SECTION[$i]} · }"
  dim "$(printf '%s%d of %d' "$where" $((i+1)) "$TOTAL")"
  printf '%s%s%s\n' "$B" "${PROMPT[$i]}" "$N"
  [ -n "${HINT[$i]}" ] && dim "${HINT[$i]}"
  t0=$(date +%s)

  if [ "${TYPE[$i]}" = choice ]; then
    IFS='|' read -r -a opts <<< "${OPT[$i]}"
    k=1
    for o in "${opts[@]}"; do
      printf '  %s%d%s  %s\n' "$A" "$k" "$N" "$o"
      k=$((k+1))
    done
    while :; do
      key=""
      printf '%s›%s ' "$A" "$N"
      IFS= read -r -n 1 key || stop
      echo
      case "$key" in
        [1-9]) if [ "$key" -le "${#opts[@]}" ]; then val="${opts[$((key-1))]}"; break; fi ;;
      esac
      err "That key isn't one of the options. Press a number from 1 to ${#opts[@]}."
    done
  else
    while :; do
      val=""
      IFS= read -r -e -p "› " val || stop
      val=$(trim "$val")
      len=${#val}
      if [ -z "$val" ]; then
        [ "${REQ[$i]}" = 1 ] && { err "This one needs an answer. A sentence is enough."; continue; }
        break
      fi
      if [ "$len" -gt "${LIMIT[$i]}" ]; then err "Too long: that's $len characters, and the limit is ${LIMIT[$i]}. Trim it down."; continue; fi
      if ! msg=$(check_answer "$i" "$val"); then err "$msg"; continue; fi
      break
    done
  fi

  ANSWERS[$i]="$val"
  TIMES[$i]=$(( ${TIMES[$i]:-0} + $(date +%s) - t0 ))
}

review() {
  local i v choice
  while :; do
    echo
    printf '%sHere'"'"'s what you wrote.%s\n\n' "$B" "$N"
    for ((i = 0; i < TOTAL; i++)); do
      v="${ANSWERS[$i]:-}"
      if [ -z "$v" ]; then v="${D}(skipped)${N}"; else v=$(clip "$v" 48); fi
      printf '  %s%2d%s  %-18s %s\n' "$A" $((i+1)) "$N" "$(clip "${LABEL[$i]}" 18)" "$v"
    done
    echo
    dim "Press Enter to send, or type a number to edit that answer."
    choice=""
    IFS= read -r -p "› " choice || stop
    choice=$(trim "$choice")
    [ -z "$choice" ] && return
    case "$choice" in
      *[!0-9]*) err "Type a number, or just press Enter to send." ;;
      *) if [ "$choice" -ge 1 ] && [ "$choice" -le "$TOTAL" ]; then
           EDITS=$((EDITS+1)); ask_step $((choice-1))
         else
           err "Pick a number from 1 to $TOTAL."
         fi ;;
    esac
  done
}

submit() {
  local i args=() resp again
  for ((i = 0; i < TOTAL; i++)); do
    args+=(--data-urlencode "${KEYS[$i]}=${ANSWERS[$i]:-}")
    args+=(--data-urlencode "t_${KEYS[$i]}=${TIMES[$i]:-0}")
  done
  args+=(
    --data-urlencode "token=${TOKEN:-}"
    --data-urlencode "total=$(( $(date +%s) - START ))"
    --data-urlencode "commands=$CMDS"
    --data-urlencode "eggs=$EGGS"
    --data-urlencode "edits=$EDITS"
    --data-urlencode "os=$(uname -s 2>/dev/null)"
    --data-urlencode "shell=${SHELL:-}"
    --data-urlencode "term=${TERM:-}"
    --data-urlencode "cols=$(tput cols 2>/dev/null || echo)"
  )
  while :; do
    echo
    dim "Sending…"
    resp=$(curl -sS -m 20 -X POST "$API/submit" -A "curl-hire/1" "${args[@]}" 2>&1)
    case "$resp" in
      "$ID_PREFIX"-*) APP_ID=$(trim "$resp"); return 0 ;;
    esac
    err "Not sent. $(clip "$(trim "$resp")" 160)"
    again=""
    IFS= read -r -p "Press Enter to try again, or q to quit. " again || again=q
    case "$again" in q|Q) say "Nothing was sent. You can run the command again anytime."; exit 1 ;; esac
  done
}

done_screen() {
  echo
  printf '%s✓ Received. Thank you.%s\n\n' "$G$B" "$N"
  printf '%sWhat happens next%s\n' "$B" "$N"
  next_steps
  echo
  printf '%sYour application ID:%s %s%s%s\n\n' "$D" "$N" "$A" "$APP_ID" "$N"
  closing
  echo
}

# ── Run ──────────────────────────────────────────────────────────
# Everything runs inside main, and the call sits on the last line, so bash has
# read the whole script before stdin is switched to your keyboard.
main() {
  exec 0<"$TTY"
  trap stop INT
  banner
  shell_loop
  TOKEN=$(curl -s -m 10 "$API/start" 2>/dev/null || true)
  if ! printf '%s' "$TOKEN" | grep -Eq '^[0-9]+\.[0-9a-f]{64}$'; then
    if [ -z "$TOKEN" ]; then err "Couldn't reach $API. Check your connection, then run the command again."
    else err "$(clip "$(trim "$TOKEN")" 200)"; fi
    exit 1
  fi
  dim "Enter moves on. Choices take one key press."
  local s
  for ((s = 0; s < TOTAL; s++)); do ask_step "$s"; done
  review
  submit
  done_screen
}

main "$@"; exit $?
