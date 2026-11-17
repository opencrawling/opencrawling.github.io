#!/usr/bin/env python3
"""Synchronize OpenCrawling GA and latest Nightly RC metadata into data/releases.json."""

from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request
from typing import Any

REPO = os.environ.get("OPENCRAWLING_REPO", "opencrawling/opencrawling")
API_BASE = f"https://api.github.com/repos/{REPO}"
ROOT_DIR = pathlib.Path(__file__).resolve().parent.parent
OUT_FILE = ROOT_DIR / "data" / "releases.json"

RC_TAG_RE = re.compile(r"^v\d+\.\d+\.\d+-rc(\.[0-9A-Za-z_-]+)?$", re.IGNORECASE)
SEMVER_RE = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$")


def github_get(url: str, accept: str = "application/vnd.github+json") -> bytes:
    headers = {
        "Accept": accept,
        "User-Agent": "opencrawling-website-release-sync",
    }
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def github_json(url: str) -> Any:
    return json.loads(github_get(url).decode("utf-8"))


def resolve_tag_commit_sha(tag_name: str) -> str:
    try:
        ref = github_json(f"{API_BASE}/git/ref/tags/{tag_name}")
        obj = ref.get("object", {})
        if obj.get("type") == "tag" and obj.get("url"):
            tag_obj = github_json(obj["url"])
            return tag_obj.get("object", {}).get("sha", obj.get("sha", ""))
        return obj.get("sha", "")
    except Exception:
        return ""


def parse_semver(version: str) -> tuple[int, int, int, int, str]:
    match = SEMVER_RE.match(version or "")
    if not match:
        return (0, 0, 0, 0, "")
    major, minor, patch = int(match.group(1)), int(match.group(2)), int(match.group(3))
    pre = match.group(4) or ""
    is_ga = 1 if not pre else 0
    return (major, minor, patch, is_ga, pre)


def parse_sha256sums(assets: list[dict[str, Any]]) -> dict[str, str]:
    sums: dict[str, str] = {}
    sums_asset = next((a for a in assets if a.get("name") == "SHA256SUMS.txt"), None)
    if not sums_asset:
        return sums
    try:
        raw = github_get(sums_asset["browser_download_url"], accept="application/octet-stream").decode("utf-8", errors="replace")
        for line in raw.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and re.fullmatch(r"[0-9a-fA-F]{64}", parts[0]):
                filename = parts[-1].lstrip("*")
                sums[pathlib.Path(filename).name] = parts[0].lower()
    except Exception:
        pass
    return sums


def classify_asset(name: str) -> tuple[str, str, int]:
    if name.startswith("opencrawling-platform-dist-") and name.endswith(".zip"):
        return ("distribution", "Full Platform Distribution (Runtime, Embedding, Admin UI, CLI)", 10)
    if name.startswith("opencrawling-runtime-dist-") and name.endswith(".zip"):
        return ("distribution", "Standalone Runtime & MCP Server Distribution", 11)
    if name.startswith("opencrawling-embedding-service-dist-") and name.endswith(".zip"):
        return ("distribution", "Stateless Embedding Service Distribution", 12)
    if name.startswith("opencrawling-admin-ui-dist-") and name.endswith(".zip"):
        return ("distribution", "Standalone Admin UI Static Bundle", 13)
    if name.startswith("opencrawling-cli-dist-") and name.endswith(".zip"):
        return ("distribution", "Standalone CLI Distribution (with launchers)", 14)
    if name.startswith("oc-cli-") and name.endswith(".jar"):
        return ("cli", "Standalone Executable CLI JAR (Java 25)", 20)
    if name.startswith("oc-java-client-sdk-") and name.endswith(".jar"):
        return ("sdk", "Java Client SDK JAR", 21)
    if name.startswith("OpenCrawling-User-and-Installation-Guide") and name.endswith(".pdf"):
        return ("docs", "User & Installation Guide (PDF)", 30)
    if name.startswith("OpenCrawling-Reference-Documentation-") and name.endswith(".pdf"):
        return ("docs", "Complete Reference Documentation (PDF)", 31)
    if name.startswith("docker-compose-") and name.endswith(".yml"):
        return ("compose", f"Docker Compose Stack ({name})", 40)
    return ("other", name, 99)


def build_release_entry(release: dict[str, Any], compare_base: str | None = None) -> dict[str, Any]:
    tag = release["tag_name"]
    version = tag[1:] if tag.startswith("v") else tag
    assets_raw = release.get("assets", [])
    asset_by_name = {a["name"]: a for a in assets_raw if a.get("name")}
    sha256_map = parse_sha256sums(assets_raw)

    items: list[dict[str, Any]] = []
    for asset in assets_raw:
        name = asset.get("name", "")
        if (
            not name
            or name.endswith(".sha256")
            or name.endswith(".sigstore.json")
            or name.endswith(".intoto.jsonl")
            or name.endswith(".asc")
            or name in {"SHA256SUMS.txt", "cosign.pub"}
        ):
            continue

        category, label, order = classify_asset(name)
        sha_asset = asset_by_name.get(f"{name}.sha256")
        sha256 = sha256_map.get(name)
        if not sha256 and sha_asset:
            try:
                raw_sha = github_get(sha_asset["browser_download_url"], accept="application/octet-stream").decode("utf-8", errors="replace").strip().split()
                if raw_sha and re.fullmatch(r"[0-9a-fA-F]{64}", raw_sha[0]):
                    sha256 = raw_sha[0].lower()
            except Exception:
                pass
        sig_asset = asset_by_name.get(f"{name}.sigstore.json")
        asc_asset = asset_by_name.get(f"{name}.asc")

        items.append(
            {
                "name": name,
                "category": category,
                "label": label,
                "order": order,
                "sizeBytes": asset.get("size", 0),
                "downloadUrl": asset.get("browser_download_url", ""),
                "sha256": sha256,
                "sha256Url": sha_asset["browser_download_url"] if sha_asset else None,
                "sigstoreUrl": sig_asset["browser_download_url"] if sig_asset else None,
                "ascUrl": asc_asset["browser_download_url"] if asc_asset else None,
            }
        )

    items.sort(key=lambda x: (x["order"], x["name"]))
    for item in items:
        item.pop("order", None)

    commit_sha = resolve_tag_commit_sha(tag) or release.get("target_commitish", "")
    is_rc = bool(release.get("prerelease")) or ("-" in version)
    base_ver = version.split("-")[0]

    slsa_asset = next(
        (
            a
            for a in assets_raw
            if a.get("name") == "multiple.intoto.jsonl" or a.get("name", "").endswith(".intoto.jsonl")
        ),
        None,
    )
    sums_asset = asset_by_name.get("SHA256SUMS.txt")
    sums_sig = asset_by_name.get("SHA256SUMS.txt.sigstore.json")
    cosign_pub = asset_by_name.get("cosign.pub")

    compare_url = None
    if compare_base and commit_sha:
        compare_url = f"https://github.com/{REPO}/compare/{compare_base}...{commit_sha}"

    return {
        "version": version,
        "baseVersion": base_ver,
        "tag": tag,
        "name": release.get("name") or f"OpenCrawling {tag}",
        "prerelease": bool(release.get("prerelease")),
        "publishedAt": release.get("published_at") or release.get("created_at"),
        "commitSha": commit_sha,
        "shortSha": commit_sha[:8] if commit_sha else None,
        "releaseUrl": release.get("html_url"),
        "compareUrl": compare_url,
        "dockerTag": version,
        "dockerRollingTag": "rc" if is_rc else "latest",
        "dockerSeriesTag": f"{base_ver}-rc" if is_rc else ".".join(base_ver.split(".")[:2]),
        "assets": items,
        "verification": {
            "sha256SumsUrl": sums_asset["browser_download_url"] if sums_asset else None,
            "cosignBundleUrl": sums_sig["browser_download_url"] if sums_sig else None,
            "cosignPubUrl": cosign_pub["browser_download_url"] if cosign_pub else None,
            "slsaProvenanceUrl": slsa_asset["browser_download_url"] if slsa_asset else None,
        },
    }


def main() -> int:
    releases = github_json(f"{API_BASE}/releases?per_page=30")
    published = [r for r in releases if not r.get("draft")]

    ga_candidates = [r for r in published if not r.get("prerelease") and "-" not in (r.get("tag_name") or "")]
    ga_candidates.sort(key=lambda r: (parse_semver(r.get("tag_name", "")), r.get("published_at", "")), reverse=True)
    latest_ga = ga_candidates[0] if ga_candidates else None

    rc_candidates = [
        r
        for r in published
        if r.get("prerelease") or RC_TAG_RE.match(r.get("tag_name") or "") or "-rc" in (r.get("tag_name") or "").lower()
    ]
    rc_candidates.sort(key=lambda r: (r.get("published_at") or r.get("created_at") or "", parse_semver(r.get("tag_name", ""))), reverse=True)
    latest_rc = rc_candidates[0] if rc_candidates else None

    # Hide an older RC if a newer GA release already superseded its base version
    if latest_ga and latest_rc:
        ga_ver = parse_semver(latest_ga.get("tag_name", ""))
        rc_ver = parse_semver(latest_rc.get("tag_name", ""))
        if rc_ver[:3] <= ga_ver[:3]:
            latest_rc = None

    stable_entry = build_release_entry(latest_ga) if latest_ga else None
    rc_entry = (
        build_release_entry(latest_rc, compare_base=stable_entry["tag"] if stable_entry else None)
        if latest_rc
        else None
    )

    payload = {
        "repository": REPO,
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stable": stable_entry,
        "rc": rc_entry,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_FILE} (stable={stable_entry['tag'] if stable_entry else 'none'}, rc={rc_entry['tag'] if rc_entry else 'none'})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
