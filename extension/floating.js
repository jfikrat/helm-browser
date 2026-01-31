// Helm Floating Panel - Content Script

(function() {
  // Don't inject on extension pages
  if (window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'chrome:' ||
      window.location.protocol === 'about:') {
    return;
  }

  // Check if already injected
  if (document.getElementById('helm-floating-root')) return;

  // Create root element
  const root = document.createElement('div');
  root.id = 'helm-floating-root';

  // Helm icon SVG
  const helmIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;

  root.innerHTML = `
    <button id="helm-toggle" title="Helm Browser Control">
      ${helmIcon}
    </button>
    <div id="helm-panel">
      <div class="helm-panel-header">
        <h3>Helm</h3>
        <div class="helm-status-dot offline" id="helm-status-dot"></div>
      </div>
      <div class="helm-panel-content" id="helm-panel-content">
        <div class="helm-no-sessions">
          <div class="helm-no-sessions-icon">⎈</div>
          <div>Connecting...</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  // Elements
  const toggle = document.getElementById('helm-toggle');
  const panel = document.getElementById('helm-panel');
  const statusDot = document.getElementById('helm-status-dot');
  const content = document.getElementById('helm-panel-content');

  let isOpen = false;
  let sessions = [];
  let isConnected = false;

  // Toggle panel
  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) {
      requestStatus();
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !root.contains(e.target)) {
      isOpen = false;
      panel.classList.remove('open');
    }
  });

  // Make panel draggable
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  const header = root.querySelector('.helm-panel-header');
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = root.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    root.style.left = x + 'px';
    root.style.top = y + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Request status from background
  function requestStatus() {
    chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Helm: Failed to get status', chrome.runtime.lastError);
        return;
      }
      if (response) {
        updateUI(response);
      }
    });
  }

  // Update UI
  function updateUI(data) {
    isConnected = data.connected;
    sessions = data.sessions || [];

    // Status dot
    statusDot.classList.toggle('offline', !isConnected);

    // Toggle badge
    if (sessions.length > 0) {
      toggle.classList.add('has-sessions');
      toggle.setAttribute('data-count', sessions.length);
    } else {
      toggle.classList.remove('has-sessions');
    }

    // Content
    if (!isConnected) {
      content.innerHTML = `
        <div class="helm-no-sessions">
          <div class="helm-no-sessions-icon">⚠️</div>
          <div>Not connected</div>
        </div>
      `;
      return;
    }

    if (sessions.length === 0) {
      content.innerHTML = `
        <div class="helm-no-sessions">
          <div class="helm-no-sessions-icon">⎈</div>
          <div>No sessions</div>
        </div>
      `;
      return;
    }

    content.innerHTML = sessions.map(session => `
      <div class="helm-session" data-session-id="${session.sessionId}">
        <div class="helm-session-header">
          <span class="helm-session-label">${escapeHtml(session.label)}</span>
          <span class="helm-session-status ${session.status}">${session.status}</span>
        </div>
        <div class="helm-session-id">${session.sessionId}</div>
        ${session.windowId ? `
          <div class="helm-session-actions">
            <button class="helm-btn helm-focus-btn" data-window="${session.windowId}">Focus Window</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Focus button handlers
    content.querySelectorAll('.helm-focus-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const windowId = parseInt(btn.dataset.window, 10);
        chrome.runtime.sendMessage({ type: 'focusWindow', windowId });
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Listen for updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'statusUpdate') {
      updateUI(message.data);
    }
  });

  // Initial status request
  setTimeout(requestStatus, 500);

  // Periodic refresh when panel is open
  setInterval(() => {
    if (isOpen) {
      requestStatus();
    }
  }, 3000);
})();
