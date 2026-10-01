#!/bin/zsh
# Build Steady for the simulator, install it, and launch it.
# Usage: ios/scripts/preview.sh [screenshot-path]
set -eu
SIM="${STEADY_SIM:-85062548-922D-4CDE-9F2B-F97523AFF240}"   # iPhone 18 Pro
BUNDLE_ID="app.steady.mobile.s8d3c7a1"
DERIVED="/private/var/folders/3w/b_x86_3j4wv8c64_f6rh21mw0000gn/T/opencode/steady-derived"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"
xcodebuild build \
  -project Steady.xcodeproj \
  -scheme Steady \
  -configuration Debug \
  -destination "id=$SIM" \
  -derivedDataPath "$DERIVED" \
  CODE_SIGNING_ALLOWED=NO \
  -quiet

APP="$DERIVED/Build/Products/Debug-iphonesimulator/Steady.app"
test -d "$APP"

xcrun simctl bootstatus "$SIM" -b >/dev/null 2>&1 || true
xcrun simctl terminate "$SIM" "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl install "$SIM" "$APP"
xcrun simctl launch "$SIM" "$BUNDLE_ID" >/dev/null

# Give the web view time to load and the animals module time to restore.
sleep "${STEADY_WAIT:-5}"

if [ -n "${1:-}" ]; then
  xcrun simctl io "$SIM" screenshot --type=png "$1" >/dev/null 2>&1
  echo "screenshot: $1"
fi
echo "launched on $SIM"
