#!/usr/bin/env python3
"""Run a local shell script on the remote server without an SFTP step.

Reads the script content from the local file, base64-encodes it, ships it
in a single `bash -c` invocation, decodes server-side, and runs it. Works
around CRLF / SFTP size-mismatch issues on Windows.

Usage:
  python ssh_run_script.py <local-script>
"""
import base64
import os
import sys
import paramiko

# Windows defaults stdout to cp1252 which barfs on any non-Latin glyph the
# remote shell emits (e.g. systemd's pretty tree-drawing chars). Force UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HOST = os.environ.get("VULTR_HOST", "139.180.133.28")
USER = os.environ.get("VULTR_USER", "root")
PASS = os.environ.get("VULTR_SSH_PASSWORD")
PORT = int(os.environ.get("VULTR_PORT", "22"))

if not PASS:
    print("ERROR: VULTR_SSH_PASSWORD env var is empty", file=sys.stderr)
    sys.exit(2)
if len(sys.argv) < 2:
    print("Usage: ssh_run_script.py <local-script>", file=sys.stderr)
    sys.exit(2)

with open(sys.argv[1], "rb") as f:
    # Normalise any \r\n -> \n so bash doesn't choke on Windows line endings.
    script = f.read().replace(b"\r\n", b"\n")

b64 = base64.b64encode(script).decode("ascii")
remote_cmd = f"echo {b64} | base64 -d | bash"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    hostname=HOST, port=PORT, username=USER, password=PASS,
    timeout=30, banner_timeout=30, auth_timeout=30,
    look_for_keys=False, allow_agent=False,
)

stdin, stdout, stderr = client.exec_command(remote_cmd, get_pty=False, timeout=600)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
rc = stdout.channel.recv_exit_status()
client.close()

sys.stdout.write(out)
if err:
    sys.stderr.write(err)
sys.exit(rc)
