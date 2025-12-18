// background.js
// Collect scraped data from content scripts and keep in memory (and storage).
console.log('[background] loaded');
const collected = {}; // tabId -> array of data chunks

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[background] onMessage', msg, 'from', sender?.tab?.id ?? 'no-tab');

  // new: allow clearing collected state
  if (msg?.action === 'CLEAR_COLLECTED') {
    // clear in-memory collected
    for (const k in collected) delete collected[k];
    // clear persisted storage as well
    chrome.storage.local.set({ collected: {} }, () => {
      console.log('[background] cleared collected (memory + storage)');
      sendResponse({ status: 'ok' });
    });
    return true;
  }

  if (msg?.action === 'SCRAPED_DATA') {
    console.log('[background] SCRAPED_DATA received', msg?.fromUrl ?? sender?.tab?.url);
    const tabId = sender.tab?.id || 'unknown';
    if (!collected[tabId]) collected[tabId] = [];
    collected[tabId].push({ fromUrl: sender.tab?.url || msg.fromUrl, data: msg.data });

    // store to chrome.storage.local as well (optional & helpful for popup retrieval)
    chrome.storage.local.set({ collected }, () => { console.log('[background] stored collected to chrome.storage.local'); });

    // If content script asks to close tab, do it
    if (msg.closeTab && sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(()=>{ console.log('[background] failed to remove tab', sender.tab?.id); });
      console.log('[background] removed tab', sender.tab?.id);
    }

    // Acknowledge
    sendResponse({ status: 'ok' });
    return true;
  }

  // popup asking for collected data
  if (msg?.action === 'GET_COLLECTED') {
    console.log('[background] GET_COLLECTED requested');
    // first try in-memory
    const allInMemory = Object.values(collected).flat().map(c => c.data);
    if (allInMemory.length > 0) {
      console.log('[background] returning in-memory collected', allInMemory.length);
      sendResponse({ status: 'ok', collected: allInMemory });
      return true;
    }
    // fallback: read from storage (handles service worker reloads)
    chrome.storage.local.get('collected', (store) => {
      const storeCollected = store.collected || {};
      const all = Object.values(storeCollected).flat().map(c => c.data);
      console.log('[background] returning stored collected', all.length);
      sendResponse({ status: 'ok', collected: all });
    });
    return true;
  }
});
