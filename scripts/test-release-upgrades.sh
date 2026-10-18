#!/usr/bin/env bash
set -euo pipefail
# Run on the disposable CI emulator only; never reset a physical installation.
test "${GITHUB_ACTIONS:-}" = true
test "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1
candidate=android/app/build/outputs/apk/release/app-release.apk
bash scripts/test-upgrade.sh "$RUNNER_TEMP/sfo-baselines/stable/SFOBusinessTravel-v1.3.4.apk" "$candidate"
if [ "$RELEASE_TAG" = v1.4.0 ]; then
  adb uninstall com.heathhuang.sfotravel
  bash scripts/test-upgrade.sh "$RUNNER_TEMP/sfo-baselines/beta/SFOBusinessTravel-v1.3.4b.apk" "$candidate"
fi
