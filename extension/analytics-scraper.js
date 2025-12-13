(function () {
  'use strict';
  console.log('[scraper] START - URL:', location.href);

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const nowISO = () => new Date().toISOString();

  function parseNumber(s) {
    if (s === null || s === undefined) return null;
    const cleaned = String(s).replace(/[^\d\.\,]/g, '').replace(/,/g, '');
    if (cleaned === '') return null;
    const n = cleaned.includes('.') ? parseFloat(cleaned) : parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : null;
  }

  async function waitForPageLoad() {
    console.log('[scraper] Waiting for page load...');
    // Wait for document ready
    for (let i = 0; i < 10; i++) {
      if (document.readyState === 'complete') break;
      await wait(1000);
    }
    // Additional wait for dynamic content
    await wait(3000);
    console.log('[scraper] Page load complete');
  }

  async function scrapeUntilStable(scrapeFn, { interval = 500, maxAttempts = 15, stableRounds = 2 } = {}) {
    let last = null;
    let stableCount = 0;

    console.log('[scraper] Starting stable scrape...');
    for (let i = 0; i < maxAttempts; i++) {
      const current = scrapeFn();
      const currentStr = JSON.stringify(current);
      
      console.log(`[scraper] Attempt ${i + 1}/${maxAttempts}:`, current);

      if (currentStr === JSON.stringify(last)) {
        stableCount++;
        console.log(`[scraper] Stable count: ${stableCount}/${stableRounds}`);
        if (stableCount >= stableRounds) {
          console.log('[scraper] Data stable!');
          return current;
        }
      } else {
        stableCount = 0;
        last = current;
      }

      await wait(interval);
    }

    console.log('[scraper] Max attempts reached, returning last data');
    return last;
  }

  function parseTopPostsFromCreatorPage() {
    console.log('[scraper] Parsing top posts...');
    const posts = [];
    
    // Look for post cards - these contain impressions/views text
    const candidateDivs = Array.from(document.querySelectorAll('div')).filter(div => {
      const t = (div.innerText || '').toLowerCase();
      return t.includes('impressions') || t.includes('views') || t.includes('engagement');
    }).slice(0, 30);

    console.log('[scraper] Found', candidateDivs.length, 'candidate post divs');

    for (const card of candidateDivs) {
      try {
        const text = (card.innerText || '').trim();
        if (!text || text.length < 10) continue;

        // Extract impressions
        const mImp = text.match(/([\d,\.]+)\s*(impressions|views)/i);
        const impressions = mImp ? parseNumber(mImp[1]) : null;

        // Extract likes
        const likesEl = card.querySelector(
          'button[data-reaction-details], button[aria-label*="reaction"], .social-details-social-counts__count-value'
        );
        const likesText = likesEl?.getAttribute?.('aria-label') || likesEl?.innerText || '';
        const likes = parseNumber(likesText.match(/[\d,\.]+/)?.[0]);

        // Extract comments
        const commentsEl = card.querySelector('button[aria-label*="comment"], .comment-count');
        const commentsText = commentsEl?.getAttribute?.('aria-label') || commentsEl?.innerText || '';
        const comments = parseNumber(commentsText.match(/[\d,\.]+/)?.[0]);

        // Extract timestamp
        const timeEl = card.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || null;

        // Get text snippet
        const snippetEl = card.querySelector('p, span') || card;
        const snippet = (snippetEl?.innerText || text).slice(0, 300);

        // Check for media
        const hasImg = !!card.querySelector('img');
        const hasVideo = !!card.querySelector('video');

        if (impressions || likes || comments) {
          posts.push({
            text: snippet,
            impressions,
            likes,
            comments,
            timestamp,
            media: hasVideo ? 'video' : hasImg ? 'image' : 'text',
            scrapedAt: nowISO()
          });
        }
      } catch (e) {
        console.error('[scraper] Error parsing post card:', e);
      }
      if (posts.length >= 10) break;
    }

    // Deduplicate
    const unique = [];
    const seen = new Set();
    for (const p of posts) {
      const key = `${(p.text || '').slice(0, 100)}|${p.impressions}|${p.likes}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    }

    console.log('[scraper] Extracted', unique.length, 'unique posts');
    return unique;
  }

  function parseContentImpressionsPage() {
    console.log('[scraper] Parsing content impressions page...');
    const stats = {};

    try {
      // Find Discovery section header
      const allH2s = Array.from(document.querySelectorAll("h2"));
      console.log('[scraper] Found', allH2s.length, 'h2 elements');
      
      const discoveryHeader = allH2s.find(h2 => 
        h2.innerText.trim().toLowerCase() === "discovery"
      );

      if (!discoveryHeader) {
        console.log('[scraper] Discovery header not found');
        return stats;
      }

      const discoverySection = discoveryHeader.closest("section");
      if (!discoverySection) {
        console.log('[scraper] Discovery section not found');
        return stats;
      }

      // Find list items
      const listItems = discoverySection.querySelectorAll("li");
      console.log('[scraper] Found', listItems.length, 'list items');

      listItems.forEach((li, index) => {
        // Get the value element
        const valueEl = li.querySelector(
          "p.text-body-medium-bold, p.text-heading-large, p[class*='text-heading'], p[class*='bold']"
        );
        
        if (!valueEl || valueEl.offsetParent === null) {
          return; // Skip hidden elements
        }

        // Extract value
        let raw = valueEl.textContent.trim();
        if (!raw) {
          raw = valueEl.innerHTML.replace(/<!--.*?-->/g, '').trim();
        }

        const number = parseNumber(raw);
        
        // Get the label
        const labelEl = li.querySelector(
          "p.member-analytics-addon-list-item__description, p[class*='description']"
        );
        
        let label = '';
        if (labelEl) {
          label = labelEl.textContent.trim();
          if (!label) {
            label = labelEl.innerHTML.replace(/<!--.*?-->/g, '').trim();
          }
        }
        
        label = label.toLowerCase();

        console.log(`[scraper] Item ${index}: label="${label}" value=${number}`);

        // Skip invalid data
        if (!number || number <= 0 || Number.isNaN(number)) {
          return;
        }

        // Match labels
        if (label.includes("impression") || label.includes("total impression")) {
          stats.impressions = number;
        } else if (label.includes("members reached") || label.includes("reached")) {
          stats.membersReached = number;
        } else if (!stats.impressions && index === 0) {
          // Fallback: first item is likely impressions
          stats.impressions = number;
        } else if (stats.impressions && !stats.membersReached && index === 1) {
          // Fallback: second item is likely members reached
          stats.membersReached = number;
        }
      });

      console.log('[scraper] Final stats:', stats);
      return stats;
    } catch (err) {
      console.error('[scraper] Error in parseContentImpressionsPage:', err);
      return stats;
    }
  }

  async function sendDataToBackground(payload) {
    return new Promise((resolve) => {
      console.log('[scraper] Sending data to background:', payload);
      
      if (!chrome?.runtime?.sendMessage) {
        console.error('[scraper] chrome.runtime.sendMessage not available');
        resolve(false);
        return;
      }

      chrome.runtime.sendMessage(
        {
          action: 'SCRAPED_DATA',
          data: payload,
          fromUrl: location.href,
          closeTab: false // Don't auto-close, let popup handle it
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[scraper] Error sending message:', chrome.runtime.lastError);
            resolve(false);
          } else {
            console.log('[scraper] Message sent successfully:', response);
            resolve(true);
          }
        }
      );
    });
  }

  (async function run() {
    console.log('[scraper] Running scraper...');
    
    await waitForPageLoad();
    
    const url = location.href;
    const payload = {
      scrapedFrom: url,
      scrapedAt: nowISO(),
      topPosts: [],
      profileStats: {},
      meta: {}
    };

    try {
      if (url.includes('/analytics/creator/top-posts')) {
        console.log('[scraper] Detected: top-posts page');
        payload.topPosts = parseTopPostsFromCreatorPage();
        payload.meta.page = 'creator-top-posts';
      } else if (url.includes('/analytics/creator/content')) {
        console.log('[scraper] Detected: content impressions page');
        payload.profileStats = await scrapeUntilStable(parseContentImpressionsPage, {
          interval: 800,
          maxAttempts: 15,
          stableRounds: 2
        });
        payload.meta.page = 'creator-content-impressions';
      } else {
        console.log('[scraper] Detected: fallback page');
        payload.topPosts = parseTopPostsFromCreatorPage();
        payload.meta.page = 'fallback';
      }

      console.log('[scraper] Extraction complete:', payload);
    } catch (err) {
      console.error('[scraper] Extraction error:', err);
      payload.error = String(err);
    }

    // Send data to background
    const sent = await sendDataToBackground(payload);
    if (sent) {
      console.log('[scraper] ✓ Data sent successfully');
    } else {
      console.error('[scraper] ✗ Failed to send data');
    }
  })();
})();