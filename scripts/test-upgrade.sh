#!/usr/bin/env bash
set -euo pipefail
# Runs only on an isolated, rootable CI emulator. No production device or data.
baseline="$1"
candidate="$2"
package=com.heathhuang.sfotravel
capture_failure() {
  mkdir -p test-results/upgrade
  adb shell uiautomator dump /sdcard/sfo-upgrade-ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/sfo-upgrade-ui.xml test-results/upgrade/ui.xml >/dev/null 2>&1 || true
  adb exec-out screencap -p > test-results/upgrade/screen.png || true
  adb logcat -d -t 1200 > test-results/upgrade/logcat.txt || true
}
trap capture_failure ERR
adb root
adb wait-for-device
adb shell settings put secure show_ime_with_hard_keyboard 0
adb install "$baseline"
adb shell am start -n "$package/.MainActivity"
python scripts/upgrade-lock-ui.py setup
ready=false
for attempt in $(seq 1 40); do
  if adb shell test -f "/data/data/$package/databases/sfo_travelSQLite.db"; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then echo 'Baseline database was not initialized'; exit 1; fi
adb shell am force-stop "$package"
database_before="$(adb shell sha256sum "/data/data/$package/databases/sfo_travelSQLite.db" | tr -d '\r')"
password_before="$(adb shell sha256sum "/data/data/$package/shared_prefs/access_lock.xml" | tr -d '\r')"
adb shell mkdir -p "/data/data/$package/files"
adb shell "echo sfo-upgrade-preserved > /data/data/$package/files/upgrade-marker.txt"
adb install -r "$candidate"
database_after="$(adb shell sha256sum "/data/data/$package/databases/sfo_travelSQLite.db" | tr -d '\r')"
test "$database_before" = "$database_after"
test "$password_before" = "$(adb shell sha256sum "/data/data/$package/shared_prefs/access_lock.xml" | tr -d '\r')"
adb shell am start -n "$package/.MainActivity"
python scripts/upgrade-lock-ui.py wrong
test "$database_before" = "$(adb shell sha256sum "/data/data/$package/databases/sfo_travelSQLite.db" | tr -d '\r')"
python scripts/upgrade-lock-ui.py unlock
adb shell test -f "/data/data/$package/databases/sfo_travelSQLite.db"
marker="$(adb shell cat "/data/data/$package/files/upgrade-marker.txt" | tr -d '\r')"
test "$marker" = sfo-upgrade-preserved
adb shell am force-stop "$package"
adb shell am start -n "$package/.MainActivity"
python scripts/upgrade-lock-ui.py ready
echo 'Same-signer upgrade retained the password, database and private file marker; wrong passwords did not erase records.'
