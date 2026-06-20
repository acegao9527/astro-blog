#!/usr/bin/env python3
import html
import json
import re
import subprocess
import sys
from pathlib import Path


SERVICE = "astro-blog-pull-deploy.service"
STATE_FILE = Path("/home/ubuntu/nginx-blog/.deployed-source-state")
DIST_POST_DIR = Path("/home/ubuntu/astro-blog-src/dist/post")
POSTS_SNAPSHOT_FILE = Path("/home/ubuntu/nginx-blog/.deployed-posts.json")
H1_PATTERN = re.compile(r"<h1(?:\s[^>]*)?>(.*?)</h1>", re.IGNORECASE | re.DOTALL)
TAG_PATTERN = re.compile(r"<[^>]+>")


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


def read_posts_snapshot():
    try:
        raw = json.loads(POSTS_SNAPSHOT_FILE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except json.JSONDecodeError:
        return None

    posts = raw.get("posts", [])
    if not isinstance(posts, list):
        return None

    normalized = []
    for post in posts:
        if not isinstance(post, dict):
            continue
        slug = str(post.get("slug", "")).strip()
        if not slug:
            continue
        normalized.append(
            {
                "slug": slug,
                "title": str(post.get("title") or slug).strip(),
                "url": str(post.get("url") or f"/post/{slug}/").strip(),
            },
        )

    return {
        "count": len(normalized),
        "posts": sorted(normalized, key=lambda item: item["slug"]),
    }


def normalize_html_text(value):
    value = TAG_PATTERN.sub("", value)
    return html.unescape(value).strip()


def extract_title(index_path, fallback):
    text = index_path.read_text(encoding="utf-8", errors="ignore")
    match = H1_PATTERN.search(text)
    if not match:
        return fallback
    return normalize_html_text(match.group(1)) or fallback


def collect_deployed_posts():
    if not DIST_POST_DIR.exists():
        raise RuntimeError(f"post directory not found: {DIST_POST_DIR}")

    posts = []
    for index_path in sorted(DIST_POST_DIR.glob("*/index.html")):
        slug = index_path.parent.name
        posts.append(
            {
                "slug": slug,
                "title": extract_title(index_path, slug),
                "url": f"/post/{slug}/",
            },
        )

    if not posts:
        raise RuntimeError(f"no deployed posts found under {DIST_POST_DIR}")

    return {
        "count": len(posts),
        "posts": sorted(posts, key=lambda item: item["slug"]),
    }


def write_posts_snapshot(snapshot):
    POSTS_SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    POSTS_SNAPSHOT_FILE.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def diff_posts(before_snapshot, after_snapshot):
    before_posts = {
        post["slug"]: post for post in (before_snapshot or {"posts": []})["posts"]
    }
    after_posts = {post["slug"]: post for post in after_snapshot["posts"]}

    added = [
        after_posts[slug]
        for slug in sorted(set(after_posts) - set(before_posts))
    ]
    removed = [
        before_posts[slug]
        for slug in sorted(set(before_posts) - set(after_posts))
    ]
    return added, removed


def print_posts(label, posts):
    print(f"{label}:")
    if not posts:
        print("- none")
        return

    for post in posts:
        print(f"- {post['title']} ({post['slug']})")


def print_recent_logs():
    result = run(["journalctl", "-u", SERVICE, "-n", "80", "--no-pager"], timeout=30)
    print("RECENT_LOGS:")
    print((result.stdout or result.stderr or "").strip())


before = read_state()
before_posts = read_posts_snapshot()
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

try:
    after_posts = collect_deployed_posts()
except Exception as error:
    print("STATUS: failure")
    print("DETAIL: could not collect deployed post snapshot")
    print(f"ERROR: {error}")
    print_recent_logs()
    sys.exit(0)

added_posts, removed_posts = diff_posts(before_posts, after_posts)
write_posts_snapshot(after_posts)

if before_posts is None:
    print("STATUS: posts-snapshot-initialized")
    print(f"STATE: {after or 'empty'}")
    print(f"POST_COUNT: {after_posts['count']}")
    print(json.dumps({"wakeAgent": False}, ensure_ascii=False))
    sys.exit(0)

if not added_posts and not removed_posts:
    if before == after:
        print("STATUS: no-change")
    else:
        print("STATUS: deployed-no-post-change")
    print(f"BEFORE: {before or 'empty'}")
    print(f"AFTER: {after or 'empty'}")
    print(f"POST_COUNT: {after_posts['count']}")
    print(json.dumps({"wakeAgent": False}, ensure_ascii=False))
    sys.exit(0)

print("STATUS: posts-changed")
print(f"BEFORE: {before or 'empty'}")
print(f"AFTER: {after or 'empty'}")
print(f"BEFORE_COUNT: {before_posts['count']}")
print(f"AFTER_COUNT: {after_posts['count']}")
print_posts("ADDED", added_posts)
print_posts("REMOVED", removed_posts)
print_recent_logs()
