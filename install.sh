#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"
EXTENSION_DIR="$REPO_ROOT/extension"
PACKED_DIR="$REPO_ROOT/packed"
PACKED_CRX="$PACKED_DIR/extension.crx"
PACKED_KEY="$PACKED_DIR/extension.pem"
MANIFEST_PATH="$EXTENSION_DIR/manifest.json"

EXTENSION_AUTO_INSTALL_STATUS="manual"
EXTENSION_ID=""
EXTENSION_VERSION=""

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

json_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

get_manifest_version() {
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$MANIFEST_PATH" | head -n 1
}

find_chrome_packager() {
  local candidates=(
    "google-chrome-stable"
    "google-chrome"
    "chromium"
    "chromium-browser"
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  )
  local candidate

  for candidate in "${candidates[@]}"; do
    if [[ "$candidate" == /* ]]; then
      if [[ -x "$candidate" ]]; then
        printf '%s\n' "$candidate"
        return 0
      fi
    elif command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done

  return 1
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

pack_extension() {
  local chrome_bin generated_crx generated_key
  chrome_bin="$(find_chrome_packager || true)"

  if [[ -z "$chrome_bin" ]]; then
    log "Chrome/Chromium binary not found; skipping CRX packaging"
    return 1
  fi

  mkdir -p "$PACKED_DIR"
  generated_crx="$REPO_ROOT/extension.crx"
  generated_key="$REPO_ROOT/extension.pem"

  rm -f "$generated_crx"

  if [[ -f "$PACKED_KEY" ]]; then
    "$chrome_bin" --pack-extension="$EXTENSION_DIR" --pack-extension-key="$PACKED_KEY" >/dev/null 2>&1
  else
    "$chrome_bin" --pack-extension="$EXTENSION_DIR" >/dev/null 2>&1
  fi

  if [[ ! -f "$generated_crx" ]]; then
    log "Chrome packaging did not produce $generated_crx"
    return 1
  fi

  mv -f "$generated_crx" "$PACKED_CRX"
  if [[ -f "$generated_key" ]]; then
    mv -f "$generated_key" "$PACKED_KEY"
  fi

  EXTENSION_VERSION="$(get_manifest_version)"
  EXTENSION_ID="$(compute_extension_id "$PACKED_KEY" || true)"

  if [[ -z "$EXTENSION_ID" ]]; then
    log "Failed to derive extension ID from $PACKED_KEY"
    return 1
  fi

  log "Packed extension as $PACKED_CRX (id: $EXTENSION_ID)"
  return 0
}

write_manifest_file() {
  local target_path="$1"
  local content="$2"
  local target_dir
  target_dir="$(dirname "$target_path")"

  if [[ -w "$target_dir" ]] || { [[ -d "$target_dir" ]] && [[ -w "$target_path" ]]; }; then
    mkdir -p "$target_dir"
    printf '%s\n' "$content" >"$target_path"
    return 0
  fi

  if ! command -v sudo >/dev/null 2>&1; then
    log "Cannot write $target_path and sudo is not available"
    return 1
  fi

  local tmpfile
  tmpfile="$(mktemp)"
  printf '%s\n' "$content" >"$tmpfile"
  sudo mkdir -p "$target_dir"
  sudo cp "$tmpfile" "$target_path"
  sudo chmod 644 "$target_path"
  rm -f "$tmpfile"
}

install_linux_external_extension() {
  local manifest_dirs=()
  local content installed_any=0 dir target

  if command -v google-chrome-stable >/dev/null 2>&1 || command -v google-chrome >/dev/null 2>&1; then
    manifest_dirs+=("/opt/google/chrome/extensions" "/usr/share/google-chrome/extensions")
  fi

  if command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1; then
    manifest_dirs+=("/usr/share/chromium/extensions")
  fi

  if [[ "${#manifest_dirs[@]}" -eq 0 ]]; then
    return 1
  fi

  content=$(cat <<EOF
{
  "external_crx": "$(json_string "$PACKED_CRX")",
  "external_version": "$(json_string "$EXTENSION_VERSION")"
}
EOF
)

  for dir in "${manifest_dirs[@]}"; do
    target="$dir/$EXTENSION_ID.json"
    if write_manifest_file "$target" "$content"; then
      log "Installed external extension manifest: $target"
      installed_any=1
    fi
  done

  if [[ "$installed_any" -eq 1 ]]; then
    EXTENSION_AUTO_INSTALL_STATUS="linux-external-crx"
    return 0
  fi

  return 1
}

setup_extension_install() {
  if ! pack_extension; then
    EXTENSION_AUTO_INSTALL_STATUS="manual"
    return
  fi

  case "$OS" in
    Linux)
      if ! install_linux_external_extension; then
        log "Failed to install Linux external extension manifests; leaving extension load as manual"
        EXTENSION_AUTO_INSTALL_STATUS="manual"
      fi
      ;;
    Darwin)
      log "Packed Helm extension, but Chrome on macOS does not support local CRX auto-install. Manual Load unpacked is still required."
      EXTENSION_AUTO_INSTALL_STATUS="manual-macos"
      ;;
    *)
      EXTENSION_AUTO_INSTALL_STATUS="manual"
      ;;
  esac
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

print_post_install_steps() {
  printf '\n'
  printf 'Helm install complete.\n\n'

  case "$EXTENSION_AUTO_INSTALL_STATUS" in
    linux-external-crx)
      printf 'Extension packaging complete.\n'
      printf 'Chrome/Chromium will auto-install Helm from:\n'
      printf '   %s\n\n' "$PACKED_CRX"
      printf 'Next step:\n'
      printf '1. Fully restart Chrome or Chromium\n'
      printf '2. Confirm Helm appears in chrome://extensions\n\n'
      ;;
    manual-macos)
      printf 'Chrome local CRX auto-install is not supported on macOS.\n'
      printf 'Manual step remaining:\n'
      printf '1. Open chrome://extensions\n'
      printf '2. Enable Developer mode\n'
      printf '3. Click Load unpacked and choose:\n'
      printf '   %s/extension\n\n' "$REPO_ROOT"
      ;;
    *)
      printf 'Manual step remaining:\n'
      printf '1. Open chrome://extensions\n'
      printf '2. Enable Developer mode\n'
      printf '3. Click Load unpacked and choose:\n'
      printf '   %s/extension\n\n' "$REPO_ROOT"
      ;;
  esac

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

  setup_extension_install
  print_post_install_steps
}

main "$@"
