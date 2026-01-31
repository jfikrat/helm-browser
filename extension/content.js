// Helm - Content Script
// This runs in the context of web pages

console.log('[Helm] Content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getPageInfo') {
    sendResponse({
      title: document.title,
      url: window.location.href,
      readyState: document.readyState
    });
  }
  return true;
});
