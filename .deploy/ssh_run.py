#!/usr/bin/env python3
"""Run a remote command on the Vultr server via paramiko.

Usage:
  python ssh_run.py "<command>"

Reads password from env var VULTR_SSH_PASSWORD so it never appears in
process args / shell history.
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
    print("Usage: ssh_run.py '<command>'", file=sys.stderr)
    sys.exit(2)

cmd = sys.argv[1]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(
        hostname=HOST,
        port=PORT,
        username=USER,
        password=PASS,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
        look_for_keys=False,
        allow_agent=False,
    )
except Exception as e:
    print(f"SSH CONNECT FAILED: {type(e).__name__}: {e}", file=sys.stderr)
    sys.exit(3)

# Use get_pty so commands that probe a tty (apt, docker, etc.) behave.
stdin, stdout, stderr = client.exec_command(cmd, get_pty=False, timeout=600)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
rc = stdout.channel.recv_exit_status()
client.close()

# Stream stdout, then stderr if present, then exit with the remote rc.
sys.stdout.write(out)
if err:
    sys.stderr.write(err)
sys.exit(rc)
