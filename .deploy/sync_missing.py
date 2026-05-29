#!/usr/bin/env python3
"""Push the 2 files build complained were missing."""
import os, sys, paramiko
from io import BytesIO

HOST = os.environ.get("VULTR_HOST", "139.180.133.28")
USER = os.environ.get("VULTR_USER", "root")
PASS = os.environ.get("VULTR_SSH_PASSWORD")
REMOTE_ROOT = "/var/www/TERENCE"

FILES = [
    # === Schema + scripts ===
    "src/dta/prisma/schema.prisma",
    "src/dta/scripts/seed-ads.ts",
    "package.json",
    # === Ads module ===
    "src/be/modules/ads/ads.service.ts",
    "app/api/admin/ads/route.ts",
    "app/api/admin/ads/[id]/route.ts",
    "app/api/ads/active/route.ts",
    "app/api/ads/events/route.ts",
    # === Admin UI ===
    "app/dashboard/ads/page.tsx",
    "app/dashboard/ads/_components/AdFormModal.tsx",
    "app/dashboard/layout.tsx",
    # === Player ad gate ===
    "src/fe/components/player/AdGate.tsx",
    "src/fe/components/player/WatchPageClient.tsx",
    # === TCoin referral ===
    "src/be/modules/tcoin/tcoin.service.ts",
    "src/be/modules/auth/auth.controller.ts",
    "src/be/modules/auth/auth.schema.ts",
    "app/signup/page.tsx",
    "app/tcoin/page.tsx",
    # === Documentation ===
    "docs/tcoin-ads-report.md",
]


def ensure_remote_dir(sftp, remote_dir, cache):
    """mkdir -p on the remote side. `cache` dedupes calls across a sync."""
    if remote_dir in cache or remote_dir in ("", "/"):
        return
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}"
        if cur in cache:
            continue
        try:
            sftp.stat(cur)
        except IOError:
            try:
                sftp.mkdir(cur)
            except IOError:
                pass
        cache.add(cur)


def main():
    if not PASS:
        print("ERROR: VULTR_SSH_PASSWORD env var is empty", file=sys.stderr)
        sys.exit(2)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, username=USER, password=PASS, timeout=30,
                   look_for_keys=False, allow_agent=False)
    sftp = client.open_sftp()
    dir_cache = set()
    for rel in FILES:
        local = os.path.join(os.getcwd(), rel)
        if not os.path.exists(local):
            print(f"  SKIP (missing): {rel}")
            continue
        with open(local, "rb") as f:
            data = f.read().replace(b"\r\n", b"\n")
        remote = f"{REMOTE_ROOT}/{rel}".replace("\\", "/")
        ensure_remote_dir(sftp, os.path.dirname(remote), dir_cache)
        sftp.putfo(BytesIO(data), remote, file_size=len(data), confirm=True)
        print(f"  + {rel} ({len(data)} bytes)")
    sftp.close()
    client.close()


if __name__ == "__main__":
    main()
