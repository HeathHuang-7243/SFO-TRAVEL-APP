#!/usr/bin/env python3
"""Drive real release APK password screens on the isolated CI emulator."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

PASSWORD = "test-password-123"  # Synthetic CI fixture only.


def adb(*args):
    return subprocess.check_output(["adb", *args], text=True, timeout=30)


def nodes():
    adb("shell", "uiautomator", "dump", "/sdcard/sfo-upgrade-ui.xml")
    return list(ET.fromstring(adb("shell", "cat", "/sdcard/sfo-upgrade-ui.xml")).iter("node"))


def visible(node):
    bounds = list(map(int, re.findall(r"\d+", node.get("bounds", ""))))
    return len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]


def wait_for(predicate):
    deadline = time.monotonic() + 100
    while time.monotonic() < deadline:
        current = nodes()
        match = next((n for n in current if predicate(n) and visible(n)), None)
        if match is not None:
            return match
        time.sleep(1)
    raise RuntimeError("Password screen did not reach the expected state")


def tap(node):
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
    adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))


def fill(identifier, password):
    node = wait_for(lambda n: n.get("resource-id", "").endswith(identifier))
    tap(node)
    adb("shell", "input", "text", password)


def submit(setup=False):
    labels = ("设置密码并继续", "Set password and continue") if setup else ("解锁并继续", "Unlock and continue")
    tap(wait_for(lambda n: any(n.get("text") == label or n.get("content-desc") == label for label in labels)))


def ready():
    wait_for(lambda n: any(text in n.get("text", "") + n.get("content-desc", "") for text in ("欢迎使用", "Welcome to Bay Companion", "出差概览", "Overview")))


action = sys.argv[1]
if action == "setup":
    fill("access-new-password", PASSWORD)
    fill("access-repeat-password", PASSWORD)
    submit(True)
    ready()
elif action == "wrong":
    fill("access-current-password", "wrong-password")
    submit()
    wait_for(lambda n: "密码不正确" in n.get("text", "") or "Incorrect password" in n.get("text", ""))
elif action == "unlock":
    fill("access-current-password", PASSWORD)
    submit()
    ready()
elif action == "ready":
    ready()
else:
    raise ValueError("Unknown action")
print("Password UI check passed:", action)
