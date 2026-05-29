#!/usr/bin/env python3
"""Merge new env keys into the server's /var/www/TERENCE/.env.

Strategy:
  - For each new key, set or replace it (last-write-wins per key, since the
    remote file has duplicates).
  - For every other line, preserve verbatim — including the production
    DATABASE_URL, NEXTAUTH_URL, SMTP creds, etc.

This script is the ONE place secrets are sent to the server. It writes the
new content via SFTP after backing up the original to
/var/www/TERENCE/.env.bak-<ts>.
"""
import os
import sys
import time
import paramiko
from io import BytesIO

HOST = os.environ.get("VULTR_HOST", "139.180.133.28")
USER = os.environ.get("VULTR_USER", "root")
PASS = os.environ.get("VULTR_SSH_PASSWORD")
ENV_PATH = "/var/www/TERENCE/.env"

# Keys to add or update. Values come from local .env / hard-coded for the
# rotation we just did. ANY KEY ALREADY in the remote file with a NON-EMPTY
# value is left alone (so we don't clobber a different prod GNews/Gemini key
# the user may have set out-of-band). Empty-string values DO get replaced.
NEW_KEYS = {
    # Gemini AI (news auto-generator)
    "GEMINI_API_KEY": "AIzaSyC4wwp67HR4-EzsVKTOj7XYfm0QF-sOxLY",
    "GEMINI_MODEL": "gemini-2.5-flash",
    # GNews (overwrite only if currently empty)
    "GNEWS_API_KEY": "1cfc05b3ace701ac88b0c31dc359a1fe",
    # SePay payments — bank identity and webhook secret
    "SEPAY_BANK_CODE": "MBBank",
    "SEPAY_BANK_ACCOUNT": "0385272094",
    "SEPAY_PAYMENT_PREFIX": "TCOIN",
    "SEPAY_WEBHOOK_API_KEY": "TERENCE_SEPAY_9xK2mLpQ7vR1aBcD",
    # Cron endpoints (production requires this per lib/env.ts)
    "CRON_SECRET": "cron_e52d8c301da2efa2bae7c49e8e8b59af966c4a0fc2964a3d",
}

# Keys we will always force-replace (don't preserve prod value). Use sparingly;
# the goal is to not clobber the user's curated production config.
FORCE_REPLACE = {
    # Gemini model name moved (2.0-flash → 2.5-flash for free tier) — always
    # write the current value.
    "GEMINI_MODEL",
}


def main():
    if not PASS:
        print("ERROR: VULTR_SSH_PASSWORD env var is empty", file=sys.stderr)
        sys.exit(2)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=HOST, username=USER, password=PASS,
        timeout=30, look_for_keys=False, allow_agent=False,
    )
    sftp = client.open_sftp()

    # Read current remote .env
    with sftp.open(ENV_PATH, "rb") as f:
        original = f.read()
    print(f"Original .env: {len(original)} bytes")

    # Back up before touching anything.
    ts = time.strftime("%Y%m%d-%H%M%S")
    bak = f"{ENV_PATH}.bak-{ts}"
    with sftp.open(bak, "wb") as f:
        f.write(original)
    print(f"Backup: {bak}")

    # Decode + walk lines. Keep order; track which keys we've seen so we can
    # update in place (rather than append at the bottom which loses grouping).
    text = original.decode("utf-8", errors="replace").replace("\r\n", "\n")
    lines = text.split("\n")

    seen = set()
    out_lines = []
    actions = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            out_lines.append(line)
            continue
        if "=" not in stripped:
            out_lines.append(line)
            continue
        key = stripped.split("=", 1)[0].strip()
        existing_value = stripped.split("=", 1)[1].strip().strip('"').strip("'")

        if key in NEW_KEYS:
            if key in seen:
                # Duplicate of a key we already wrote — drop it.
                actions.append(f"  - drop duplicate {key}")
                continue
            new_val = NEW_KEYS[key]
            # Preserve non-empty prod value unless this key is in FORCE_REPLACE.
            if existing_value and key not in FORCE_REPLACE:
                out_lines.append(line)
                actions.append(f"  · keep existing {key} (non-empty)")
            else:
                out_lines.append(f"{key}={new_val}")
                actions.append(f"  ✎ set {key}")
            seen.add(key)
        else:
            out_lines.append(line)

    # Any NEW_KEYS we never saw → append.
    appended = [k for k in NEW_KEYS if k not in seen]
    if appended:
        out_lines.append("")
        out_lines.append("# === Added by deploy session (Claude) ===")
        for k in appended:
            out_lines.append(f"{k}={NEW_KEYS[k]}")
            actions.append(f"  + append {k}")

    new_content = "\n".join(out_lines).rstrip() + "\n"

    print("\nActions:")
    for a in actions:
        print(a)

    # Write atomically via temp-then-rename. paramiko's `rename` is the
    # legacy SFTP one which refuses to overwrite an existing path; use
    # `posix_rename` (OpenSSH extension) so we can atomically replace the
    # existing .env without a remove-then-rename window.
    tmp = f"{ENV_PATH}.tmp-{ts}"
    data = new_content.encode("utf-8")
    bio = BytesIO(data)
    sftp.putfo(bio, tmp, file_size=len(data), confirm=True)
    try:
        sftp.posix_rename(tmp, ENV_PATH)
    except (AttributeError, IOError):
        # Older SSH server without the posix-rename extension — fall back to
        # remove-then-rename. Tiny race window, acceptable here.
        try:
            sftp.remove(ENV_PATH)
        except IOError:
            pass
        sftp.rename(tmp, ENV_PATH)
    sftp.chmod(ENV_PATH, 0o600)

    print(f"\nWrote {len(data)} bytes to {ENV_PATH} (mode 0600)")
    print(f"Backup preserved at {bak}")
    sftp.close()
    client.close()


if __name__ == "__main__":
    main()
