#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path


SERVICE = "astro-blog-pull-deploy.service"
STATE_FILE = Path("/home/ubuntu/nginx-blog/.deployed-source-state")


def run(args, timeout=900):
    return subprocess.run(
        args,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def read_state():
    try:
        return STATE_FILE.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return ""


def print_recent_logs():
    result = run(["journalctl", "-u", SERVICE, "-n", "80", "--no-pager"], timeout=30)
    print("RECENT_LOGS:")
    print((result.stdout or result.stderr or "").strip())


before = read_state()
start = run(["sudo", "-n", "systemctl", "start", SERVICE])
after = read_state()

status = run(
    [
        "systemctl",
        "show",
        SERVICE,
        "-p",
        "ActiveState",
        "-p",
        "SubState",
        "-p",
        "Result",
        "-p",
        "ExecMainStatus",
        "--no-pager",
    ],
    timeout=30,
)

if start.returncode != 0:
    print("STATUS: failure")
    print("DETAIL: systemctl start failed")
    print(f"EXIT_CODE: {start.returncode}")
    if start.stdout.strip():
        print("STDOUT:")
        print(start.stdout.strip())
    if start.stderr.strip():
        print("STDERR:")
        print(start.stderr.strip())
    print_recent_logs()
    sys.exit(0)

status_text = (status.stdout or status.stderr or "").strip()
if "Result=success" not in status_text or "ExecMainStatus=0" not in status_text:
    print("STATUS: failure")
    print("DETAIL: service did not finish cleanly")
    print(status_text)
    print_recent_logs()
    sys.exit(0)

if before == after:
    print("STATUS: no-change")
    print(f"STATE: {after or 'empty'}")
    print(json.dumps({"wakeAgent": False}, ensure_ascii=False))
    sys.exit(0)

print("STATUS: deployed")
print(f"BEFORE: {before or 'empty'}")
print(f"AFTER: {after or 'empty'}")
print_recent_logs()
