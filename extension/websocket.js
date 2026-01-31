// Helm - WebSocket Connection

import {
  wsPort,
  ws,
  setWs,
  reconnectInterval,
  setReconnectInterval,
  isConnected,
  setIsConnected,
  keepAliveInterval,
  setKeepAliveInterval,
  setSessions,
  setDefaultSessionId,
} from './state.js';
import { handleServerMessage } from './handlers.js';

const KEEPALIVE_ALARM = 'keepalive-alarm';

// Get WebSocket URL
function getWsUrl() {
  return `ws://localhost:${wsPort}`;
}

// Setup alarm-based keepalive (survives service worker sleep)
export function setupKeepaliveAlarm() {
  chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.4 }); // ~24 seconds

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === KEEPALIVE_ALARM) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('[Helm] Alarm: reconnecting...');
        connect();
      } else {
        ws.send(JSON.stringify({ type: 'keepalive' }));
      }
    }
  });
}

// Start keepalive interval (backup)
export function startKeepAlive() {
  if (keepAliveInterval) return;
  setKeepAliveInterval(
    setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'keepalive' }));
      }
    }, 25000)
  );
}

// Stop keepalive interval
export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    setKeepAliveInterval(null);
  }
}

// Schedule reconnect
function scheduleReconnect() {
  if (!reconnectInterval) {
    setReconnectInterval(
      setInterval(() => {
        console.log('[Helm] Attempting to reconnect...');
        connect();
      }, 3000)
    );
  }
}

// Send message to server
export function sendMessage(message) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Connect to WebSocket server
export function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  try {
    const socket = new WebSocket(getWsUrl());
    setWs(socket);

    socket.onopen = () => {
      console.log('[Helm] Connected to MCP server');
      setIsConnected(true);
      chrome.storage.local.set({ connected: true });
      startKeepAlive();

      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        setReconnectInterval(null);
      }

      // Send hello message (v2 protocol)
      sendMessage({
        type: 'hello',
        payload: {
          extensionVersion: '2.0.0',
          profileId: 'default',
          capabilities: ['tabs', 'screenshots', 'dom', 'cookies', 'debugger'],
        },
      });
    };

    socket.onclose = () => {
      console.log('[Helm] Disconnected from MCP server');
      setIsConnected(false);
      setSessions([]);
      setDefaultSessionId(null);
      chrome.storage.local.set({
        connected: false,
        sessions: [],
        defaultSessionId: null,
      });
      stopKeepAlive();
      scheduleReconnect();
    };

    socket.onerror = (error) => {
      console.error('[Helm] WebSocket error:', error);
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await handleServerMessage(message);
      } catch (error) {
        console.error('[Helm] Error handling message:', error);
      }
    };
  } catch (error) {
    console.error('[Helm] Connection error:', error);
    scheduleReconnect();
  }
}

// Disconnect and reconnect
export function reconnect() {
  if (ws) {
    ws.close();
    setWs(null);
  }
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    setReconnectInterval(null);
  }
  connect();
}
