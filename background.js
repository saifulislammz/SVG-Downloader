chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we can inject the content script
    const [existingTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Try to send message, if it fails, inject content script first
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "toggleSelection" });
    } catch (e) {
      // If content script is not loaded, inject it first
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Then send message
      await chrome.tabs.sendMessage(tab.id, { action: "toggleSelection" });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}); 