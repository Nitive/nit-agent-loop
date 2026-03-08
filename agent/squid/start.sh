#!/usr/bin/env bash
set -euo pipefail

mkdir -p /run/squid /var/log/squid /var/spool/squid
chown -R proxy:proxy /run/squid /var/log/squid /var/spool/squid

exec squid -N -f /etc/squid/squid.conf
