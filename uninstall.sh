#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"
PACKED_DIR="$REPO_ROOT/packed"
PACKED_CRX="$PACKED_DIR/extension.crx"
PACKED_KEY="$PACKED_DIR/extension.pem"

log() {
  printf '[helm-uninstall] %s\n' "$1"
}

compute_extension_id() {
  local key_path="$1"

  if [[ ! -f "$key_path" ]]; then
    return 1
  fi

  openssl rsa -in "$key_path" -pubout -outform DER 2>/dev/null \
    | openssl dgst -sha256 -binary \
    | od -An -tx1 -v \
    | tr -d ' \n' \
    | cut -c1-32 \
    | tr '0-9a-f' 'a-p'
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

remove_packed_artifacts() {
  rm -f "$PACKED_CRX" "$PACKED_KEY"
}

remove_linux_external_extension() {
  local extension_id
  extension_id="$(compute_extension_id "$PACKED_KEY" || true)"
  if [[ -z "$extension_id" ]]; then
    return
  fi

  local targets=()
  local target

  if command -v google-chrome-stable >/dev/null 2>&1 || command -v google-chrome >/dev/null 2>&1; then
    targets+=("/opt/google/chrome/extensions/$extension_id.json" "/usr/share/google-chrome/extensions/$extension_id.json")
  fi

  if command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1; then
    targets+=("/usr/share/chromium/extensions/$extension_id.json")
  fi

  for target in "${targets[@]}"; do
    if [[ -f "$target" ]]; then
      if [[ -w "$target" ]]; then
        rm -f "$target"
      elif command -v sudo >/dev/null 2>&1; then
        sudo rm -f "$target"
      fi
    fi
  done

  remove_packed_artifacts
  log "Removed Linux external extension manifests and packaged artifacts"
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
      remove_linux_external_extension
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
  remove_packed_artifacts
  print_manual_cleanup
}

main "$@"
