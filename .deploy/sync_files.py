#!/usr/bin/env python3
"""Sync the specific files we changed this session to /var/www/TERENCE.

Uses SFTP with binary mode + explicit size check (avoids the CRLF size-
mismatch the earlier put() hit). Creates parent dirs as needed, backs up
the previous version of each existing file to /var/www/TERENCE/.bak-<ts>/.

Does NOT touch:
  - /var/www/TERENCE/.env (handled separately by merge_env.py)
  - /var/www/TERENCE/node_modules
  - /var/www/TERENCE/.next  (will be rebuilt)
  - anything not in the explicit FILES list below
"""
import os
import sys
import time
import paramiko

HOST = os.environ.get("VULTR_HOST", "139.180.133.28")
USER = os.environ.get("VULTR_USER", "root")
PASS = os.environ.get("VULTR_SSH_PASSWORD")
REMOTE_ROOT = "/var/www/TERENCE"

# Files modified or added in THIS session. Keep this list authoritative —
# every entry survives a `rsync --delete`-style audit because we never delete
# remote files, only add/overwrite.
FILES = [
    # Top-level package files (react-quill → react-quill-new)
    "package.json",
    "package-lock.json",
    # FE — header, news, admin
    "src/fe/components/header.tsx",
    "src/fe/components/admin/RichTextEditor.tsx",
    "src/fe/components/news/NewsArticleCard.tsx",
    # Pages — public news + home + edit
    "app/news/page.tsx",
    "app/news/[slug]/page.tsx",
    "app/page.tsx",
    "app/dashboard/news/page.tsx",
    "app/dashboard/tcoin/page.tsx",
    "app/dashboard/tcoin/_components/PaymentsTab.tsx",
    "app/dashboard/tcoin/_components/WalletsTab.tsx",
    "app/dashboard/tcoin/_components/TransactionsModal.tsx",  # NEW
    # API routes — admin TCoin + news AI
    "app/api/admin/tcoin/wallets/route.ts",
    "app/api/admin/tcoin/orders/[id]/confirm/route.ts",       # NEW
    "app/api/admin/tcoin/users/[id]/transactions/route.ts",   # NEW
    "app/api/admin/news/ai-generate/route.ts",                # NEW
    "app/api/v1/reviews/route.ts",
    # BE modules — tcoin + news
    "src/be/modules/tcoin/tcoin.repository.ts",
    "src/be/modules/tcoin/tcoin.service.ts",
    "src/be/modules/tcoin/index.ts",
    "src/be/modules/news/news.service.ts",
    "src/be/modules/news/ai-news-generator.ts",               # NEW
    # Config / env validation
    "lib/env.ts",
    ".env.example",
    "docs/SEPAY_INTEGRATION.md",
]


def sftp_put_binary(sftp, local_path: str, remote_path: str) -> None:
    """Read local file as binary, normalise CRLF→LF for text-ish files,
    and upload using `putfo` with the actual length so paramiko stops
    complaining about size mismatches."""
    with open(local_path, "rb") as f:
        data = f.read()

    text_exts = (".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".sh", ".env", ".example")
    if local_path.endswith(text_exts):
        data = data.replace(b"\r\n", b"\n")

    from io import BytesIO
    bio = BytesIO(data)
    sftp.putfo(bio, remote_path, file_size=len(data), confirm=True)


def ensure_remote_dir(sftp, remote_dir: str) -> None:
    """mkdir -p equivalent for SFTP."""
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}"
        try:
            sftp.stat(cur)
        except IOError:
            try:
                sftp.mkdir(cur)
            except IOError:
                pass


def main():
    if not PASS:
        print("ERROR: VULTR_SSH_PASSWORD env var is empty", file=sys.stderr)
        sys.exit(2)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=HOST, username=USER, password=PASS,
        timeout=30, banner_timeout=30, auth_timeout=30,
        look_for_keys=False, allow_agent=False,
    )
    sftp = client.open_sftp()

    ts = time.strftime("%Y%m%d-%H%M%S")
    backup_dir = f"{REMOTE_ROOT}/.bak-{ts}"
    ensure_remote_dir(sftp, backup_dir)
    print(f"Backup dir: {backup_dir}")

    pushed = 0
    backed_up = 0
    for rel in FILES:
        local = os.path.join(os.getcwd(), rel)
        if not os.path.exists(local):
            print(f"  SKIP (local missing): {rel}")
            continue

        remote = f"{REMOTE_ROOT}/{rel}".replace("\\", "/")
        remote_dir = os.path.dirname(remote)
        ensure_remote_dir(sftp, remote_dir)

        # Back up existing remote file before overwrite.
        try:
            sftp.stat(remote)
            bak = f"{backup_dir}/{rel}".replace("\\", "/")
            ensure_remote_dir(sftp, os.path.dirname(bak))
            # Use the underlying ssh to move atomically — sftp.rename works
            # within same filesystem and avoids re-uploading.
            sftp.rename(remote, bak)
            backed_up += 1
        except IOError:
            pass  # new file

        try:
            sftp_put_binary(sftp, local, remote)
            pushed += 1
            print(f"  ✓ {rel}")
        except Exception as e:
            print(f"  ✗ {rel}: {type(e).__name__}: {e}", file=sys.stderr)

    sftp.close()
    client.close()
    print(f"\nDone: pushed={pushed}, backed_up={backed_up}, backup_dir={backup_dir}")


if __name__ == "__main__":
    main()
