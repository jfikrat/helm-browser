// Helm Side Panel

const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');
const statusInfo = document.getElementById('statusInfo');
const sessionsList = document.getElementById('sessionsList');
const portInput = document.getElementById('portInput');
const savePort = document.getElementById('savePort');
const reconnect = document.getElementById('reconnect');

// Load saved port
chrome.storage.local.get(['wsPort'], (result) => {
  portInput.value = result.wsPort || 9876;
});

// Update status
function updateStatus() {
  chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
    if (!response) return;

    const port = response.port || 9876;

    // Status
    if (response.connected) {
      statusDot.classList.add('online');
      statusLabel.textContent = 'Connected';
    } else {
      statusDot.classList.remove('online');
      statusLabel.textContent = 'Disconnected';
    }
    statusInfo.textContent = `ws://localhost:${port}`;

    // Sessions
    renderSessions(response.sessions || []);
  });
}

function renderSessions(sessions) {
  if (sessions.length === 0) {
    sessionsList.innerHTML = `
      <div class="no-sessions">
        <div class="no-sessions-icon">⎈</div>
        <div>No sessions connected</div>
      </div>
    `;
    return;
  }

  sessionsList.innerHTML = sessions.map(session => `
    <div class="session-card" data-session-id="${session.sessionId}">
      <div class="session-header">
        <span class="session-label">${escapeHtml(session.label)}</span>
        <span class="session-status ${session.status}">${session.status}</span>
      </div>
      <div class="session-id">${session.sessionId}</div>
      <div class="session-actions">
        <button class="btn btn-primary focus-btn" data-session="${session.sessionId}">
          Focus
        </button>
      </div>
    </div>
  `).join('');

  // Focus handlers - ask background to focus session's window
  sessionsList.querySelectorAll('.focus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sessionId = btn.dataset.session;
      btn.textContent = 'Focusing...';

      chrome.runtime.sendMessage({ type: 'focusSession', sessionId }, (response) => {
        if (response?.success) {
          btn.textContent = 'Focused!';
        } else {
          btn.textContent = response?.error || 'No window';
        }
        setTimeout(() => btn.textContent = 'Focus', 1000);
      });
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Save port
savePort.addEventListener('click', () => {
  const port = parseInt(portInput.value, 10);
  if (port >= 1024 && port <= 65535) {
    chrome.storage.local.set({ wsPort: port });
    chrome.runtime.sendMessage({ type: 'setPort', port }, () => {
      savePort.textContent = 'Saved!';
      setTimeout(() => savePort.textContent = 'Save', 1000);
    });
  }
});

// Reconnect
reconnect.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'reconnect' }, () => {
    reconnect.textContent = 'Reconnecting...';
    setTimeout(() => {
      reconnect.textContent = 'Reconnect';
      updateStatus();
    }, 1500);
  });
});

// Initial + periodic update
updateStatus();
setInterval(updateStatus, 2000);

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.sessions) {
    updateStatus();
  }
});
