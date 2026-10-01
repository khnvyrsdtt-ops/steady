#!/bin/zsh
# Temporary diagnostic runner (removed before delivery).
set -eu
SIM=85062548-922D-4CDE-9F2B-F97523AFF240
T=/private/var/folders/3w/b_x86_3j4wv8c64_f6rh21mw0000gn/T/opencode
DD="$T/steady-derived"
xcrun simctl terminate "$SIM" app.steady.mobile.s8d3c7a1 >/dev/null 2>&1 || true
xcrun simctl install "$SIM" "$DD/Build/Products/Debug-iphonesimulator/Steady.app"
SIMCTL_CHILD_STEADY_DRIVE="$1" xcrun simctl launch --console-pty --terminate-running-process \
  "$SIM" app.steady.mobile.s8d3c7a1 >"$T/drive.log" 2>&1 &
p=$!
sleep "${2:-7}"
if [ -n "${3:-}" ]; then xcrun simctl io "$SIM" screenshot "$3" >/dev/null 2>&1; fi
kill $p >/dev/null 2>&1 || true
sed 's/^DIAG| //' "$T/drive.log" | grep -E '^(ANIMAL|ST)\|' || true
