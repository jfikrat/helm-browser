#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"

log() {
  printf '[helm-uninstall] %s\n' "$1"
}

remove_systemd_service() {
  local service_path="$HOME/.config/systemd/user/helm-daemon.service"

  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user disable --now helm-daemon.service >/dev/null 2>&1 || true
    systemctl --user daemon-reload >/dev/null 2>&1 || true
  fi

  rm -f "$service_path"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user daemon-reload >/dev/null 2>&1 || true
  fi
  log "Removed systemd user service"
}

remove_launchd_service() {
  local plist_path="$HOME/Library/LaunchAgents/com.helm.browser.daemon.plist"
  local uid
  uid="$(id -u)"

  if command -v launchctl >/dev/null 2>&1; then
    launchctl bootout "gui/$uid" "$plist_path" >/dev/null 2>&1 || true
  fi

  rm -f "$plist_path"
  rm -f "$HOME/Library/Logs/helm-daemon.log" "$HOME/Library/Logs/helm-daemon.err.log"
  log "Removed launchd agent"
}

remove_dependencies() {
  for dir in daemon server client; do
    rm -rf "$REPO_ROOT/$dir/node_modules"
  done
  log "Removed installed dependencies from daemon/, server/, and client/"
}

print_manual_cleanup() {
  printf '\n'
  printf 'Helm uninstall complete.\n\n'
  printf 'Manual cleanup remaining:\n'
  printf '1. Open chrome://extensions\n'
  printf '2. Remove or disable the unpacked Helm extension if you no longer need it\n'
}

main() {
  case "$OS" in
    Linux)
      remove_systemd_service
      ;;
    Darwin)
      remove_launchd_service
      ;;
    *)
      printf '[helm-uninstall] Unsupported OS: %s\n' "$OS" >&2
      exit 1
      ;;
  esac

  remove_dependencies
  print_manual_cleanup
}

main "$@"
