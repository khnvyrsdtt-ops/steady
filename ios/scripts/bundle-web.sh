#!/bin/sh
set -eu
# Only the public, offline web application belongs in the release bundle.
STEADY_WEB_SOURCE="${SRCROOT}/../app/public"
STEADY_WEB_DESTINATION="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/Web"
test -n "${TARGET_BUILD_DIR}"
test "${UNLOCALIZED_RESOURCES_FOLDER_PATH}" = 'Steady.app'
case "${STEADY_WEB_DESTINATION}" in
  /*/Steady.app/Web) ;;
  *) echo 'Refusing to sync outside the Steady app bundle.' >&2; exit 1 ;;
esac
test -f "${STEADY_WEB_SOURCE}/index.html"
mkdir -p "${STEADY_WEB_DESTINATION}"
/usr/bin/rsync -a --delete --exclude='.DS_Store' --exclude='.*' "${STEADY_WEB_SOURCE}/" "${STEADY_WEB_DESTINATION}/"
# This declared resource output must advance even when only a nested file
# changes, so Xcode refreshes its signature after bundling the latest content.
/usr/bin/touch "${STEADY_WEB_DESTINATION}"
