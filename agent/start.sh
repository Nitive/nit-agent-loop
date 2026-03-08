#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p "/tmp"
sudo chmod 1777 "/tmp"

sudo mkdir -p "/ctmp"
sudo chmod 1777 "/ctmp"

sudo chown "$(id -u):$(id -g)" ~
sudo chmod 700 ~
find ~ -type d -user root | xargs -I{} sudo chown "$(id -u):$(id -g)" {};

echo "Setting configuration..."
git config core.pager delta
git config interactive.diffFilter "delta --color-only"
git config delta.navigate true

echo "Installing mise dependencies"
mise install
eval "$(mise activate bash)"

export COREPACK_DEFAULT_TO_LATEST=0
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
mkdir -p ~/.local/bin
corepack enable

echo "Installing pnpm..."
pnpm config set store-dir ~/.pnpm-store --global

echo "Installing codex..."
pnpm install -g @openai/codex@$(pnpm info @openai/codex --json | jq -r .version)

cat <<EOF > ~/.bash_aliases
eval "\$(mise activate bash)"

alias ll='ls -lA'

set -o vi
EOF

if [ ! -f ~/.ssh/id.pub ]; then
  ssh-keygen -t ed25519 -f ~/.ssh/id -N ''
fi

if [ ! -f ~/.ssh/authorized_keys ]; then
  cat ~/.ssh/id.pub > ~/.ssh/authorized_keys
fi

cat <<EOF > ~/.ssh/container-known-hosts
[127.0.0.1]:2255 $(cat /etc/ssh/ssh_host_ed25519_key.pub)
EOF

sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/g' /etc/ssh/sshd_config

sudo mkdir -p /run/sshd
sudo /usr/sbin/sshd

exec node -e "
import fs from 'node:fs'
process.stdin.resume()
;['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => process.exit())
})
fs.writeFileSync('/ctmp/started', '1', 'utf8')
console.log('Started')
"
