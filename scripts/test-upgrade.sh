#!/usr/bin/env bash
set -euo pipefail
# Runs only on an isolated, rootable CI emulator. No production device or data.
baseline="$1"
candidate="$2"
package=com.heathhuang.sfotravel
adb root
adb wait-for-device
adb install "$baseline"
adb shell am start -n "$package/.MainActivity"
ready=false
for attempt in $(seq 1 40); do
  if adb shell test -f "/data/data/$package/databases/sfo_travelSQLite.db"; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then echo 'Baseline database was not initialized'; exit 1; fi
adb shell am force-stop "$package"
database_before="$(adb shell sha256sum "/data/data/$package/databases/sfo_travelSQLite.db" | tr -d '\r')"
adb shell mkdir -p "/data/data/$package/files"
adb shell "echo sfo-upgrade-preserved > /data/data/$package/files/upgrade-marker.txt"
adb install -r "$candidate"
database_after="$(adb shell sha256sum "/data/data/$package/databases/sfo_travelSQLite.db" | tr -d '\r')"
test "$database_before" = "$database_after"
adb shell am start -n "$package/.MainActivity"
adb shell test -f "/data/data/$package/databases/sfo_travelSQLite.db"
marker="$(adb shell cat "/data/data/$package/files/upgrade-marker.txt" | tr -d '\r')"
test "$marker" = sfo-upgrade-preserved
echo 'Same-signer version upgrade preserved the database and private file marker.'
