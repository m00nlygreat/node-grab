chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (e) {
    console.error('Injection failed', e);
  }
});

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'capture') {
      const { width, height, devicePixelRatio } = msg;
      const windowId = sender.tab.windowId;
      chrome.windows.get(windowId, { populate: false }, (win) => {
        const originalWidth = win.width;
        const originalHeight = win.height;
        const scale = devicePixelRatio || 1;
        const targetWidth = Math.round(width * scale);
        const targetHeight = Math.round(height * scale);
        chrome.windows.update(windowId, { width: targetWidth, height: targetHeight }, () => {
          chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
            chrome.windows.update(windowId, { width: originalWidth, height: originalHeight }, () => {
              sendResponse({ image: dataUrl });
            });
          });
        });
      });
      return true; // keep message channel open for async response
    }
  });
