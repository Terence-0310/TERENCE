#!/usr/bin/env python3
"""Upload a local script to the server and execute it.

Usage:
  python ssh_upload_run.py <local-script> [<remote-tmp-name>]

Sends the script via SFTP to /tmp/<name>, makes it executable, runs it,
captures full stdout+stderr, and prints the combined output.
"""
import os
import sys
import paramiko

HOST = os.environ.get("VULTR_HOST", "139.180.133.28")
USER = os.environ.get("VULTR_USER", "root")
PASS = os.environ.get("VULTR_SSH_PASSWORD")
PORT = int(os.environ.get("VULTR_PORT", "22"))

if not PASS:
    print("ERROR: VULTR_SSH_PASSWORD env var is empty", file=sys.stderr)
    sys.exit(2)
if len(sys.argv) < 2:
    print("Usage: ssh_upload_run.py <local> [<remote-name>]", file=sys.stderr)
    sys.exit(2)

local = sys.argv[1]
remote_name = sys.argv[2] if len(sys.argv) >= 3 else os.path.basename(local)
remote = f"/tmp/{remote_name}"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    hostname=HOST, port=PORT, username=USER, password=PASS,
    timeout=30, banner_timeout=30, auth_timeout=30,
    look_for_keys=False, allow_agent=False,
)

sftp = client.open_sftp()
sftp.put(local, remote)
sftp.chmod(remote, 0o755)
sftp.close()

stdin, stdout, stderr = client.exec_command(f"bash {remote}", get_pty=False, timeout=600)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
rc = stdout.channel.recv_exit_status()
client.close()

sys.stdout.write(out)
if err:
    sys.stderr.write(err)
sys.exit(rc)
