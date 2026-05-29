#!/usr/bin/env python3
"""Bulk-sync local files listed in .deploy/files_to_sync.txt to /var/www/TERENCE.

For each file:
  - mkdir -p parent on remote
  - read local binary, normalise CRLF→LF for text files
  - upload via putfo with file_size + confirm

Does NOT back up before overwrite (we already have a backup directory from the
earlier sync, and there are 250+ files here — too many to copy each one).
"""
import os
import sys
import time
import paramiko
from io import BytesIO

HOST = os.environ.get("VULTR_HOST", "139.180.133.28")
USER = os.environ.get("VULTR_USER", "root")
PASS = os.environ.get("VULTR_SSH_PASSWORD")
REMOTE_ROOT = "/var/www/TERENCE"
LIST_FILE = ".deploy/files_to_sync.txt"


def main():
    if not PASS:
        print("ERROR: VULTR_SSH_PASSWORD env var is empty", file=sys.stderr)
        sys.exit(2)

    if not os.path.exists(LIST_FILE):
        print(f"ERROR: {LIST_FILE} not found", file=sys.stderr)
        sys.exit(2)

    with open(LIST_FILE, "r", encoding="utf-8") as f:
        files = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]

    print(f"Files to sync: {len(files)}")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=HOST, username=USER, password=PASS,
        timeout=30, banner_timeout=30, auth_timeout=30,
        look_for_keys=False, allow_agent=False,
    )
    sftp = client.open_sftp()

    text_exts = (".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".sh",
                 ".env", ".example", ".css", ".html", ".prisma", ".sql",
                 ".yml", ".yaml", ".txt")

    dir_cache = set()

    def ensure_dir(remote_dir: str):
        if remote_dir in dir_cache or remote_dir in ("", "/"):
            return
        parts = remote_dir.strip("/").split("/")
        cur = ""
        for p in parts:
            cur = f"{cur}/{p}"
            if cur in dir_cache:
                continue
            try:
                sftp.stat(cur)
            except IOError:
                try:
                    sftp.mkdir(cur)
                except IOError:
                    pass
            dir_cache.add(cur)

    pushed = 0
    skipped = 0
    failed = 0
    t0 = time.time()
    for i, rel in enumerate(files, 1):
        local = os.path.join(os.getcwd(), rel)
        if not os.path.exists(local) or not os.path.isfile(local):
            skipped += 1
            continue

        with open(local, "rb") as f:
            data = f.read()
        if local.endswith(text_exts):
            data = data.replace(b"\r\n", b"\n")

        remote = f"{REMOTE_ROOT}/{rel}".replace("\\", "/")
        ensure_dir(os.path.dirname(remote))

        try:
            sftp.putfo(BytesIO(data), remote, file_size=len(data), confirm=True)
            pushed += 1
            if i % 20 == 0 or i == len(files):
                elapsed = time.time() - t0
                print(f"  [{i}/{len(files)}] +{pushed} pushed ({elapsed:.0f}s)")
        except Exception as e:
            failed += 1
            print(f"  ✗ {rel}: {type(e).__name__}: {e}", file=sys.stderr)

    sftp.close()
    client.close()
    print(f"\nDone: pushed={pushed}, skipped(missing local)={skipped}, failed={failed}")


if __name__ == "__main__":
    main()
