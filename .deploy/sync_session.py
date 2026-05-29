#!/usr/bin/env python3
"""Push this session's edits to /var/www/TERENCE.

Scope: only the files we deliberately changed in this work session
(watch-party call fix, chat realtime, news icon, person search, seed).

Set the password before running:
    $env:VULTR_SSH_PASSWORD='...'
    python .deploy/sync_session.py
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
    # Watch party call fix — surface LiveKit errors, fix stage race
    "src/fe/features/watch-party/hooks/useLiveKitRoom.ts",
    "src/fe/features/watch-party/hooks/usePartyCall.ts",
    "src/fe/components/watch-party/call/CallContainer.tsx",
    # Chat realtime fairness — chat always via Socket.IO
    "lib/watch-party/realtime.ts",
    # News section — remove icon
    "src/fe/components/news/MovieNewsSection.tsx",
    # Browse / person search fallback
    "src/be/modules/tmdb/legacy/person-search.ts",
    "app/browse/page.tsx",
    # Seed.ts — remove mock seed block so future seeds don't re-introduce mocks
    "src/dta/prisma/seed.ts",
    # Cleanup script for mock data (admin/dev use on prod if ever needed)
    "scripts/cleanup-mock-data.ts",
    # LiveKit credentials probe (admin/dev tool)
    "scripts/check-livekit.ts",
]


def ensure_remote_dir(sftp, remote_dir, cache):
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
    total_bytes = 0

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
        size_kb = len(data) / 1024
        print(f"  + {rel} ({size_kb:.1f} KB)")
        pushed += 1
        total_bytes += len(data)

    sftp.close()
    client.close()
    print(f"\nDone: {pushed} pushed ({total_bytes/1024:.1f} KB), {skipped} skipped.")


if __name__ == "__main__":
    main()
