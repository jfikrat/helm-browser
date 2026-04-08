#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"

log() {
  printf '[helm-install] %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[helm-install] Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

ensure_bun() {
  if command -v bun >/dev/null 2>&1; then
    return
  fi

  require_cmd curl
  log "Bun not found; installing Bun"
  curl -fsSL https://bun.sh/install | bash

  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"

  if ! command -v bun >/dev/null 2>&1; then
    printf '[helm-install] Bun installation completed but bun is still not on PATH\n' >&2
    printf '[helm-install] Add %s/bin to your PATH and re-run %s/install.sh\n' "${BUN_INSTALL:-$HOME/.bun}" "$REPO_ROOT" >&2
    exit 1
  fi
}

install_dependencies() {
  for dir in daemon server client; do
    log "Installing dependencies in ${dir}/"
    (
      cd "$REPO_ROOT/$dir"
      bun install
    )
  done
}

install_systemd_service() {
  require_cmd systemctl

  local bun_path service_dir service_path
  bun_path="$(command -v bun)"
  service_dir="$HOME/.config/systemd/user"
  service_path="$service_dir/helm-daemon.service"

  mkdir -p "$service_dir"

  cat >"$service_path" <<EOF
[Unit]
Description=Helm Browser Daemon
After=default.target

[Service]
Type=simple
WorkingDirectory=$REPO_ROOT/daemon
ExecStart=$bun_path run $REPO_ROOT/daemon/index.ts
Restart=always
RestartSec=2
Environment=PATH=$(dirname "$bun_path"):/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now helm-daemon.service
  log "Installed and started systemd user service: helm-daemon.service"
}

install_launchd_service() {
  local bun_path agent_dir plist_path uid
  bun_path="$(command -v bun)"
  agent_dir="$HOME/Library/LaunchAgents"
  plist_path="$agent_dir/com.helm.browser.daemon.plist"
  uid="$(id -u)"

  mkdir -p "$agent_dir" "$HOME/Library/Logs"

  cat >"$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.helm.browser.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>$bun_path</string>
    <string>run</string>
    <string>$REPO_ROOT/daemon/index.ts</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REPO_ROOT/daemon</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/helm-daemon.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/helm-daemon.err.log</string>
</dict>
</plist>
EOF

  launchctl bootout "gui/$uid" "$plist_path" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$uid" "$plist_path"
  launchctl kickstart -k "gui/$uid/com.helm.browser.daemon"
  log "Installed and started launchd agent: com.helm.browser.daemon"
}

print_manual_step() {
  printf '\n'
  printf 'Helm install complete.\n\n'
  printf 'Manual step remaining:\n'
  printf '1. Open chrome://extensions\n'
  printf '2. Enable Developer mode\n'
  printf '3. Click Load unpacked and choose:\n'
  printf '   %s/extension\n\n' "$REPO_ROOT"
  printf 'After that, point your MCP client at:\n'
  printf '   bun run %s/client/index.ts\n' "$REPO_ROOT"
}

main() {
  ensure_bun
  install_dependencies

  case "$OS" in
    Linux)
      install_systemd_service
      ;;
    Darwin)
      install_launchd_service
      ;;
    *)
      printf '[helm-install] Unsupported OS: %s\n' "$OS" >&2
      exit 1
      ;;
  esac

  print_manual_step
}

main "$@"
