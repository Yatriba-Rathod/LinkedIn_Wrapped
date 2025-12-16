// popup.js
console.log('[popup] Loaded');

const startBtn = document.getElementById('start');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const helpBtn = document.getElementById('help');

function log(msg) {
  console.log('[popup]', msg);
  const timestamp = new Date().toLocaleTimeString();
  logEl.innerText += `[${timestamp}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(s) {
  statusEl.innerText = s;
  log(s);
}

function extractUsername(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // Pattern: /in/username
    if (parts[0] === 'in' && parts[1]) return parts[1];
    // Fallback
    return parts[0] || null;
  } catch (e) {
    return null;
  }
}

function buildAnalyticsUrls(username) {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    .toISOString().split('T')[0];

  return [
    `https://www.linkedin.com/analytics/creator/top-posts/?timeRange=past_365_days`,
    `https://www.linkedin.com/analytics/creator/content/?endDate=${endDate}&metricType=IMPRESSIONS&startDate=${startDate}&timeRange=past_365_days`
  ];
}

// Wait for a tab to finish loading
async function waitForTabLoad(tabId, maxWait = 30000) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const checkStatus = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.log('[popup] Tab no longer exists:', tabId);
          resolve(false);
          return;
        }

        if (tab.status === 'complete') {
          console.log('[popup] Tab loaded:', tabId);
          resolve(true);
        } else if (Date.now() - startTime > maxWait) {
          console.log('[popup] Tab load timeout:', tabId);
          resolve(false);
        } else {
          setTimeout(checkStatus, 500);
        }
      });
    };
    
    checkStatus();
  });
}

// Convert image to data URL
async function getIconAsDataURL() {
  try {
    const iconUrl = chrome.runtime.getURL('../assets/icons/icon500.png');
    const response = await fetch(iconUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('[popup] failed to load icon', err);
    return null;
  }
}

startBtn.addEventListener('click', async () => {
  console.log('[popup] Start button clicked');
  
  const profileUrl = document.getElementById('profileUrl').value.trim();
  if (!profileUrl) {
    alert('Please paste your LinkedIn profile URL.');
    return;
  }

  // Clear previous logs
  logEl.innerText = '';

  // Extract username
  const username = extractUsername(profileUrl);
  if (!username) {
    alert('Could not extract username from URL. Please use format: https://www.linkedin.com/in/username/');
    return;
  }

  log(`Extracted username: ${username}`);

  // Clear previous collected data
  setStatus('Clearing previous data...');
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'CLEAR_COLLECTED' }, (resp) => {
      console.log('[popup] CLEAR_COLLECTED response:', resp);
      resolve();
    });
  });

  // Build analytics URLs
  const urls = buildAnalyticsUrls(username);
  log(`Prepared ${urls.length} analytics pages to scrape`);

  const openTabs = document.getElementById('openTabs').checked;
  const openedTabIds = [];

  // Open each URL in a new tab
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    setStatus(`Opening page ${i + 1}/${urls.length}...`);
    
    try {
      // Open tab (inactive if checkbox is checked)
      const tab = await chrome.tabs.create({ 
        url, 
        active: false 
      });
      
      openedTabIds.push(tab.id);
      log(`Opened tab ${tab.id}: ${url}`);

      // Wait for tab to load
      setStatus(`Waiting for page ${i + 1}/${urls.length} to load...`);
      const loaded = await waitForTabLoad(tab.id, 15000);
      
      if (!loaded) {
        log(`Tab ${tab.id} may not have loaded completely`);
      } else {
        log(`Tab ${tab.id} loaded successfully`);
      }

      // Give scraper time to run
      await new Promise(r => setTimeout(r, 3000));

    } catch (err) {
      log(`Error with tab: ${err.message}`);
      console.error('[popup] Error:', err);
    }
  }

  // Wait for all scrapers to complete
  setStatus('Waiting for data extraction to complete...');
  log('Waiting 8 seconds for all scrapers to finish...');
  await new Promise(r => setTimeout(r, 5000));

  // Get icon as data URL
  const iconDataURL = await getIconAsDataURL();

  // Retrieve collected data
  setStatus('Retrieving scraped data...');
  chrome.runtime.sendMessage({ action: 'GET_COLLECTED' }, async (resp) => {
    console.log('[popup] GET_COLLECTED response:', resp);

    if (!resp || resp.status !== 'ok') {
      setStatus('Could not retrieve data. Check console for errors.');
      log('Error: No data received from background script');
      return;
    }

    const collected = resp.collected || [];
    log(`Received ${collected.length} data chunks`);

    if (collected.length === 0) {
      setStatus('No data was scraped. Make sure you are logged into LinkedIn.');
      log('Troubleshooting: Open the LinkedIn analytics pages manually and check if they load correctly.');
      return;
    }

    // Build report
    setStatus('Building report...');
    log('Generating report HTML...');

    try {
      const mod = await import('../report/report-template.js');
      const reportData = normalizeCollected(collected);
      
      console.log('[popup] Normalized data:', reportData);
      
      const html = mod.createReportHtml(reportData, iconDataURL);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      await chrome.tabs.create({ url, active: true });
      
      setStatus('Report opened in new tab!');
      log('Success! Your LinkedIn Wrapped report is ready.');

      // Close the analytics tabs after report is successfully created
      log('Cleaning up analytics tabs...');
      for (const tabId of openedTabIds) {
        try {
          await chrome.tabs.remove(tabId);
          log(`Closed tab ${tabId}`);
        } catch (e) {
          // Tab may already be closed or no longer exist
          log(`Tab ${tabId} already closed`);
        }
      }
      log('Cleanup complete');
      
    } catch (e) {
      setStatus('Failed to create report');
      log(`Error: ${e.message}`);
      console.error('[popup] Report generation error:', e);
    }
  });
});

helpBtn.addEventListener('click', () => {
  const helpText = `How this works:

1. Paste your LinkedIn profile URL (you must be logged into LinkedIn)
2. Click "Start Scraping"
3. The extension opens LinkedIn analytics pages in background tabs
4. Data is extracted from these pages (runs locally in your browser)
5. A Spotify-style report is generated from your data

Privacy: All data processing happens locally in your browser. Nothing is uploaded anywhere unless you explicitly share it.

Troubleshooting:
- Make sure you're logged into LinkedIn
- Check that you have analytics access (usually need to post content)
- Try opening the analytics pages manually first to verify access`;

  alert(helpText);
});

function normalizeCollected(collectedChunks) {
  console.log('[popup] Normalizing', collectedChunks.length, 'chunks');
  
  const posts = [];
  const stats = {};

  collectedChunks.forEach((chunk, i) => {
    console.log(`[popup] Processing chunk ${i}:`, chunk);
    
    if (!chunk) return;

    // Collect posts
    if (chunk.topPosts && Array.isArray(chunk.topPosts)) {
      posts.push(...chunk.topPosts);
    }

    // Collect stats
    if (chunk.profileStats) {
      Object.assign(stats, chunk.profileStats);
    }
  });

  console.log('[popup] Normalized:', { posts: posts.length, stats });

  return {
    topPosts: posts,
    profileStats: stats
  };
}