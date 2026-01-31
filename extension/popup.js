// Helm - Browser Control Popup Script v2

document.addEventListener('DOMContentLoaded', () => {
  const statusCard = document.getElementById('statusCard');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusLabel = document.getElementById('statusLabel');
  const statusInfo = document.getElementById('statusInfo');
  const reconnectBtn = document.getElementById('reconnect');
  const portInput = document.getElementById('port');
  const savePortBtn = document.getElementById('savePort');
  const serverInfo = document.getElementById('serverInfo');
  const sessionsList = document.getElementById('sessionsList');

  let currentTabId = null;

  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      currentTabId = tabs[0].id;
    }
  });

  // Load saved port
  chrome.storage.local.get(['wsPort'], (result) => {
    const port = result.wsPort || 9876;
    portInput.value = port;
  });

  // Update status and sessions
  function updateStatus() {
    chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
      if (!response) return;

      const port = response.port || 9876;

      // Connection status
      if (response.connected) {
        statusCard.className = 'status-card connected';
        statusIndicator.className = 'status-indicator online';
        statusLabel.textContent = 'Connected';
        statusInfo.textContent = `ws://localhost:${port}`;
      } else {
        statusCard.className = 'status-card disconnected';
        statusIndicator.className = 'status-indicator offline';
        statusLabel.textContent = 'Disconnected';
        statusInfo.textContent = `ws://localhost:${port}`;
      }

      // Server info
      const protocol = response.protocolVersion || 2;
      serverInfo.textContent = `ws://localhost:${port}`;

      // Sessions list
      renderSessions(response.sessions || [], response.defaultSessionId, response.tabRouting || {});
    });
  }

  // Render sessions
  function renderSessions(sessions, defaultSessionId, tabRouting) {
    if (sessions.length === 0) {
      sessionsList.innerHTML = `
        <div class="no-sessions">
          <div class="no-sessions-icon">⎈</div>
          <div>No sessions connected</div>
        </div>
      `;
      return;
    }

    // Check if current tab is assigned to any session
    const currentTabSession = currentTabId ? tabRouting[currentTabId] : null;

    sessionsList.innerHTML = sessions.map(session => {
      const isDefault = session.sessionId === defaultSessionId;
      const hasWindow = session.windowId != null;

      return `
        <div class="session-item" data-session-id="${session.sessionId}">
          <div class="session-info">
            <div class="session-label">
              ${session.label}
              ${isDefault ? '⭐' : ''}
            </div>
            <div class="session-id">${session.sessionId}</div>
          </div>
          <div class="session-actions">
            <span class="session-status ${session.status}">${session.status}</span>
            ${hasWindow ? `<button class="btn btn-sm btn-secondary focus-btn" data-window="${session.windowId}">Focus</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers for focus buttons
    sessionsList.querySelectorAll('.focus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const windowId = parseInt(btn.dataset.window, 10);
        focusWindow(windowId);
      });
    });
  }

  // Focus a session's window
  function focusWindow(windowId) {
    chrome.windows.update(windowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to focus window:', chrome.runtime.lastError);
      }
    });
  }

  // Initial status check
  updateStatus();

  // Save port button
  savePortBtn.addEventListener('click', () => {
    const port = parseInt(portInput.value, 10);
    if (port >= 1024 && port <= 65535) {
      chrome.storage.local.set({ wsPort: port }, () => {
        chrome.runtime.sendMessage({ type: 'setPort', port }, () => {
          statusLabel.textContent = 'Port saved...';
          setTimeout(updateStatus, 1500);
        });
      });
    }
  });

  // Reconnect button
  reconnectBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'reconnect' }, () => {
      statusLabel.textContent = 'Reconnecting...';
      setTimeout(updateStatus, 1000);
    });
  });

  // Auto-refresh status
  setInterval(updateStatus, 2000);

  // Listen for storage changes (session updates)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.sessions || changes.defaultSessionId || changes.tabRouting) {
      updateStatus();
    }
  });
});
