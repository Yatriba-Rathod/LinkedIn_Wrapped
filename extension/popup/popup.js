// popup.js
console.log('[popup] loaded');
const startBtn = document.getElementById('start');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const helpBtn = document.getElementById('help');

function log(msg){
  console.log('[popup]', msg);
  logEl.innerText += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(s){ statusEl.innerText = s; log(s); }

function extractUsername(url){
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // common pattern: /in/username
    if (parts[0] === 'in' && parts[1]) return parts[1];
    // fallback: first valid token
    return parts[0] || null;
  } catch(e){ return null; }
}

// list of analytics URLs to scrape (templates). They rely on your session (must be logged in).
function buildAnalyticsUrls(username) {
  return [
    // Top posts analytics page (past 365 days param included optionally)
    `https://www.linkedin.com/analytics/creator/top-posts/?timeRange=past_365_days`,
    `https://www.linkedin.com/analytics/creator/content/?endDate=2025-12-10&metricType=IMPRESSIONS&startDate=2024-12-11&timeRange=past_365_days`
  ];
}

// inject scraper into tab
async function injectScraper(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['analytics-scraper.js']
    });
    log(`Injected scraper into tab ${tabId}`);
  } catch (err) {
    log(`Failed to inject into ${tabId}: ${err.message}`);
  }
}

startBtn.addEventListener('click', async () => {
  console.log('[popup] start button clicked');
  const profileUrl = document.getElementById('profileUrl').value.trim();
  if (!profileUrl) return alert('Please paste your LinkedIn profile URL.');

  // ensure background memory/storage cleared to avoid accumulation
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'CLEAR_COLLECTED' }, (resp) => {
      console.log('[popup] CLEAR_COLLECTED response', resp);
      resolve(resp);
    });
  });

  const username = extractUsername(profileUrl);
  console.log('[popup] extracted username=', username);
  if (!username) return alert('Could not extract username from URL. Please paste a full profile URL (e.g. https://www.linkedin.com/in/username/)');

  const openTabs = document.getElementById('openTabs').checked;
  setStatus('Starting: building analytics URLs...');

  const urls = buildAnalyticsUrls(username);
  console.log('[popup] analytics urls:', urls);
  setStatus(`Prepared ${urls.length} pages to open.`);

  // clear previous collected state stored in background (optional)
  await chrome.storage.local.set({ collected: {} });

  // open each analytics page in background (inactive) and inject scraper after load
  const openedTabIds = [];
  for (const url of urls) {
    try {
      // `openTabs` checkbox means "open in background tabs (recommended)" —
      // when checked we should open tabs inactive so the popup stays open.
      const tab = await chrome.tabs.create({ url, active: openTabs ? false : true });
      console.log('[popup] opened tab', tab.id, url);
      openedTabIds.push(tab.id);
      setStatus(`Opened ${url} in tab ${tab.id}. Waiting to load...`);
      // naive wait: better: detect tab change to 'complete' via tabs.onUpdated, but quick approach:
      await new Promise(res => setTimeout(res, 3000));
      await injectScraper(tab.id);
      console.log('[popup] injector called for tab', tab.id);
      // allow the content script to run and send data
      await new Promise(res => setTimeout(res, 2000));
      // ask background to close the tab if we prefer background cleanup handled by scraper
      if (!openTabs) {
        try { await chrome.tabs.remove(tab.id); } catch(e){/*ignore*/ }
      }
    } catch (err) {
      log('Error opening or injecting: ' + err.message);
      console.error('[popup] error opening/injecting', err);
    }
  }

  setStatus('Waiting for scrapers to send data (short pause)...');
  // wait a few seconds for all content scripts to send messages
  await new Promise(res => setTimeout(res, 2500));

  // request collected data from background
  chrome.runtime.sendMessage({ action: 'GET_COLLECTED' }, (resp) => {
    console.log('[popup] GET_COLLECTED response', resp);
    if (!resp || resp.status !== 'ok') {
      setStatus('Could not fetch collected data. Try again or check console.');
      return;
    }
    const collected = resp.collected || [];
    setStatus(`Collected ${collected.length} data chunks. Building report...`);
    // Build report HTML using ui/report-template.js createReportHtml(reportData)
    // We'll create a blob and open in new tab
    import('../report/report-template.js').then(mod => {
      try {
        const reportData = normalizeCollected(collected);
        const html = mod.createReportHtml(reportData);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        chrome.tabs.create({ url, active: true }).then(() => {
          console.log('[popup] report tab created');
        }).catch(e => console.error('[popup] failed to open report tab', e));
        setStatus('Report opened in new tab!');
      } catch (e) {
        setStatus('Failed to create report: ' + e.message);
      }
    }).catch(err => {
      setStatus('Failed to load report generator: ' + err);
      console.error('[popup] failed to import report-template', err);
    });
  });
});

helpBtn.addEventListener('click', () => {
  console.log('[popup] help clicked');
  alert('How this works:\n1) Paste your own LinkedIn profile url (must be logged in to LinkedIn in this browser).\n2) The extension opens LinkedIn analytics pages and runs a scraper inside them (this runs in your browser only).\n3) The extracted data is processed locally into a Spotify-style report.\nPrivacy: data is processed locally; no uploads unless you explicitly choose to share.');
});

function normalizeCollected(collectedChunks) {
  // collectedChunks is an array of objects returned by content scripts
  // We will attempt to merge arrays into a single normalized object. Each content script
  // should return { topPosts: [...], profileStats: {...}, ... } as available.
  const posts = [];
  const stats = {};
  collectedChunks.forEach(chunk => {
    if (!chunk) return;
    if (chunk.topPosts && Array.isArray(chunk.topPosts)) posts.push(...chunk.topPosts);
    if (chunk.profileStats) Object.assign(stats, chunk.profileStats);
    if (chunk.other) {
      if (!stats.other) stats.other = [];
      stats.other.push(chunk.other);
    }
  });

  return { posts, stats };
}