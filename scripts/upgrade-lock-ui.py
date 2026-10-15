#!/usr/bin/env python3
"""Drive real release APK password screens on the isolated CI emulator."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

PASSWORD = "2468"  # Synthetic CI fixture only.


def adb(*args):
    return subprocess.check_output(["adb", *args], text=True, timeout=30)


def nodes():
    adb("shell", "rm", "-f", "/sdcard/sfo-upgrade-ui.xml")
    adb("shell", "uiautomator", "dump", "/sdcard/sfo-upgrade-ui.xml")
    result = list(ET.fromstring(adb("shell", "cat", "/sdcard/sfo-upgrade-ui.xml")).iter("node"))
    # Android WebView exposes EditText nodes but does not export HTML IDs.
    for index, node in enumerate(n for n in result if n.get("class") == "android.widget.EditText"):
        node.set("field-index", str(index))
    return result


def visible(node):
    bounds = list(map(int, re.findall(r"\d+", node.get("bounds", ""))))
    return len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]


def wait_for(predicate, scroll=False):
    deadline = time.monotonic() + 100
    while time.monotonic() < deadline:
        try:
            current = nodes()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError):
            # Cold WebView startup can temporarily have no accessibility root.
            time.sleep(1)
            continue
        match = next((n for n in current if predicate(n) and visible(n)), None)
        if match is not None:
            return match
        if scroll and any(n.get("class") == "android.webkit.WebView" for n in current):
            # Small emulator screens may place the next field/button below the fold.
            view = next(n for n in current if n.get("class") == "android.webkit.WebView")
            x1, y1, x2, y2 = map(int, re.findall(r"\d+", view.get("bounds")))
            x = (x1 + x2) // 2
            adb("shell", "input", "swipe", str(x), str(y1 + (y2-y1)*3//4), str(x), str(y1 + (y2-y1)//3), "300")
        time.sleep(1)
    raise RuntimeError("Password screen did not reach the expected state")


def tap(node):
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
    adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))


def fill(index, password):
    # WebView may report input bounds behind the previous field's keyboard.
    hide_keyboard()
    node = wait_for(lambda n: n.get("field-index") == str(index), scroll=True)
    tap(node)
    wait_for(lambda n: n.get("field-index") == str(index) and n.get("focused") == "true")
    adb("shell", "input", "text", password)


def hide_keyboard():
    # WebView accessibility bounds can extend behind the IME on Android 35.
    # Dismiss it only when shown, so BACK cannot accidentally close the app.
    def shown():
        return re.search(r"\b(?:mInputShown|isInputViewShown)=true\b", adb("shell", "dumpsys", "input_method")) is not None
    if shown():
        adb("shell", "input", "keyevent", "KEYCODE_BACK")
        deadline = time.monotonic() + 10
        while shown():
            if time.monotonic() >= deadline:
                raise RuntimeError("Soft keyboard did not dismiss before submitting")
            time.sleep(0.2)


def submit(setup=False):
    hide_keyboard()
    labels = ("设置密码并继续", "Set password and continue") if setup else ("解锁并继续", "Unlock and continue")
    tap(wait_for(lambda n: any(n.get("text") == label or n.get("content-desc") == label for label in labels), scroll=True))


def ready():
    wait_for(lambda n: any(text in n.get("text", "") + n.get("content-desc", "") for text in ("欢迎使用", "Welcome to Bay Companion", "出差概览", "Overview")))


action = sys.argv[1]
if action == "setup":
    fill(0, PASSWORD)
    fill(1, PASSWORD)
    submit(True)
    ready()
elif action == "wrong":
    fill(0, "wrong-password")
    submit()
    wait_for(lambda n: "密码不正确" in n.get("text", "") or "Incorrect password" in n.get("text", ""))
elif action == "unlock":
    fill(0, PASSWORD)
    submit()
    ready()
elif action == "ready":
    ready()
else:
    raise ValueError("Unknown action")
print("Password UI check passed:", action)
