#!/usr/bin/env bash
set -euo pipefail
# Only the disposable GitHub emulator; never a user's device.
package=com.heathhuang.sfotravel
capture_failure() {
  mkdir -p test-results/fresh
  adb shell uiautomator dump /sdcard/sfo-fresh-ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/sfo-fresh-ui.xml test-results/fresh/ui.xml >/dev/null 2>&1 || true
  adb exec-out screencap -p > test-results/fresh/screen.png || true
  adb logcat -d -t 1200 > test-results/fresh/logcat.txt || true
}
trap capture_failure ERR
test "${GITHUB_ACTIONS:-}" = true
test "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1
# adbd restarts during this command and can close the client connection.
adb root || true
adb wait-for-device
test "$(adb shell id -u | tr -d '\r')" = 0
test -z "$(adb shell pm path "$package" | tr -d '\r')"
adb shell settings put system screen_off_timeout 2147483647
adb shell svc power stayon true
adb shell settings put secure show_ime_with_hard_keyboard 0
adb install "$1"
adb shell am start -n "$package/.MainActivity"
python scripts/upgrade-lock-ui.py setup
adb shell test -f "/data/data/$package/databases/sfo_travelSQLite.db"
adb shell test -f "/data/data/$package/shared_prefs/access_lock.xml"
adb shell am force-stop "$package"
adb shell am start -n "$package/.MainActivity"
python scripts/upgrade-lock-ui.py ready
mkdir -p test-results/fresh
adb exec-out screencap -p > test-results/fresh/installed.png
echo 'Actual public v1.3.2 APK installed on a clean emulator, set a password, initialized storage and reopened successfully.'
# Reset only our test installation before the separate historical upgrade test.
adb uninstall "$package"
