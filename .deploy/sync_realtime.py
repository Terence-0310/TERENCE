#!/usr/bin/env python3
"""Push the realtime Socket.IO refactor (TCoin / Ads / Watch progress / Admin)
to /var/www/TERENCE. Same SFTP pattern as sync_missing.py — binary, mkdir -p,
no destructive removes. Run via:

  $env:VULTR_SSH_PASSWORD='...'; python .deploy/sync_realtime.py
"""
import os
import sys
from io import BytesIO
import paramiko

HOST = os.environ.get("VULTR_HOST", "139.180.133.28")
USER = os.environ.get("VULTR_USER", "root")
PASS = os.environ.get("VULTR_SSH_PASSWORD")
REMOTE_ROOT = "/var/www/TERENCE"

FILES = [
    # === Server bootstrap ===
    "server.ts",
    # === Realtime layer (server) ===
    "src/be/shared/realtime/notify.ts",
    "src/be/shared/realtime/socket-handlers.ts",
    # === Service-layer emits ===
    "src/be/modules/tcoin/tcoin.repository.ts",
    "src/be/modules/tcoin/tcoin.service.ts",
    "src/be/modules/ads/ads.service.ts",
    # === Frontend realtime client + hooks ===
    "src/fe/lib/realtime/client.ts",
    "src/fe/lib/realtime/hooks.ts",
    # === Pages wired to realtime ===
    "app/tcoin/page.tsx",
    "app/dashboard/ads/page.tsx",
    "src/fe/components/player/WatchPageClient.tsx",
    # === Documentation ===
    "docs/realtime-system-report.md",
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
    client.connect(
        hostname=HOST,
        username=USER,
        password=PASS,
        timeout=30,
        look_for_keys=False,
        allow_agent=False,
    )

    sftp = client.open_sftp()
    dir_cache = set()
    pushed = 0
    skipped = 0

    for rel in FILES:
        local = os.path.join(os.getcwd(), rel)
        if not os.path.exists(local):
            print(f"  SKIP (missing local): {rel}")
            skipped += 1
            continue
        with open(local, "rb") as f:
            data = f.read().replace(b"\r\n", b"\n")
        remote = f"{REMOTE_ROOT}/{rel}".replace("\\", "/")
        ensure_remote_dir(sftp, os.path.dirname(remote), dir_cache)
        sftp.putfo(BytesIO(data), remote, file_size=len(data), confirm=True)
        print(f"  + {rel} ({len(data)} bytes)")
        pushed += 1

    sftp.close()
    client.close()
    print(f"\nDone: {pushed} pushed, {skipped} skipped.")


if __name__ == "__main__":
    main()
