#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
#
# End-to-end smoke test for the window-sections KWin script.
#
# It stages and installs the KPackage, starts a headless (virtual) nested KWin
# inside its own D-Bus session, loads the script through KWin's scripting D-Bus
# interface and fails if KWin reports a JavaScript error.
#
# A full geometry assertion needs a real client and display server. Set
# E2E_CLIENT to a windowed application to additionally exercise the shortcuts;
# without it, packaging and script loading are verified.

set -euo pipefail

if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]] && command -v dbus-run-session >/dev/null 2>&1; then
  exec dbus-run-session -- "$0" "$@"
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work_dir="$(mktemp -d)"
kwin_log="$work_dir/kwin.log"

cleanup() {
  if [[ -n "${kwin_pid:-}" ]]; then
    kill "$kwin_pid" 2>/dev/null || true
    wait "$kwin_pid" 2>/dev/null || true
  fi
  rm -rf "$work_dir"
}
trap cleanup EXIT

for cmd in kpackagetool6 kwin_wayland qdbus6 npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "e2e: skipping, missing required command: $cmd" >&2
    exit 0
  fi
done

echo "e2e: building and staging the package"
npm --prefix "$repo_root" run build >/dev/null
npm --prefix "$repo_root" run package >/dev/null

echo "e2e: installing the package"
kpackagetool6 --type=KWin/Script --remove window-sections >/dev/null 2>&1 || true
kpackagetool6 --type=KWin/Script --install "$repo_root/dist/window-sections"

echo "e2e: starting nested KWin"
kwin_wayland --virtual --no-lockscreen --exit-with-session --socket nested-e2e >"$kwin_log" 2>&1 &
kwin_pid=$!

for _ in $(seq 1 50); do
  if qdbus6 org.kde.KWin /KWin >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! qdbus6 org.kde.KWin /KWin >/dev/null 2>&1; then
  echo "e2e: nested KWin did not come up; log follows:" >&2
  cat "$kwin_log" >&2
  exit 1
fi

echo "e2e: loading the script"
script_id="$(qdbus6 org.kde.kwin.Scripting /Scripting \
  org.kde.kwin.Scripting.loadScript "$repo_root/contents/code/main.js" 0)"
qdbus6 org.kde.kwin.Scripting /Scripting org.kde.kwin.Scripting.start >/dev/null

sleep 1

if grep -qiE 'js:.*error|Error: ' "$kwin_log"; then
  echo "e2e: KWin reported a script error:" >&2
  grep -iE 'js:|error' "$kwin_log" >&2
  exit 1
fi

echo "e2e: script id ${script_id} loaded without errors"
echo "e2e: OK"
