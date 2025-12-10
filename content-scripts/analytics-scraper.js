(function () {
  'use strict';
  console.log('[scraper] start', location.href);

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const nowISO = () => new Date().toISOString();

  function parseNumber(s) {
    if (s === null || s === undefined) return null;
    const cleaned = String(s).replace(/[^\d\.\,]/g, '').replace(/,/g, '');
    if (cleaned === '') return null;
    const n = cleaned.includes('.') ? parseFloat(cleaned) : parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : null;
  }

  function findElementsByText(regex, root = document.body) {
    const results = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el && el.innerText && regex.test(el.innerText)) results.push(el);
    }
    return results;
  }

  function extractNearbyNumber(el) {
    if (!el) return null;
    const candidates = [];
    const push = node => {
      if (!node) return;
      const txt = (node.innerText || '').trim();
      if (/\d/.test(txt)) candidates.push(txt);
    };
    push(el);
    push(el.parentElement);
    push(el.nextElementSibling);
    push(el.previousElementSibling);
    if (el.querySelector) {
      const child = el.querySelector('*');
      if (child) push(child);
    }
    for (const c of candidates) {
      const n = parseNumber(c);
      if (n !== null) return n;
    }
    return null;
  }

  async function stabilize() {
    for (let i = 0; i < 8; i++) {
      if (document.readyState === 'complete') break;
      await wait(300);
    }
    await wait(600);
  }

  function parseTopPostsFromCreatorPage() {
    const posts = [];
    const candidateDivs = Array.from(document.querySelectorAll('div')).filter(div => {
      const t = (div.innerText || '').toLowerCase();
      return t.includes('impressions') || t.includes('views') || t.includes('engagement');
    }).slice(0, 80);

    for (const card of candidateDivs) {
      try {
        const text = (card.innerText || '').trim();
        if (!text || text.length < 10) continue;
        const mImp = text.match(/([\d,\.]+)\s*(impressions|views)/i);
        const impressions = mImp ? parseNumber(mImp[1]) : null;

        // Prefer aria-label/data-reaction-details for likes (matches screenshot)
        const likesEl = card.querySelector(
          'button[data-reaction-details], button[aria-label*="reaction"], button[aria-label*="reactions"], .social-details-social-counts__count-value'
        );
        const likesLabel = likesEl?.getAttribute?.('aria-label') || likesEl?.innerText || '';
        const likes = likesLabel ? parseNumber(likesLabel.match(/[\d,\.]+/)?.[0] ?? likesLabel) : null;

        const commentsEl = card.querySelector('button[aria-label*="comment"], .comment-count, [data-test-comments-count]');
        const commentsLabel = commentsEl?.getAttribute?.('aria-label') || commentsEl?.innerText || '';
        const comments = commentsLabel ? parseNumber(commentsLabel.match(/[\d,\.]+/)?.[0] ?? commentsLabel) : null;

        const timeEl = card.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || null;
        const snippetEl = card.querySelector('p, span') || card;
        const snippet = (snippetEl?.innerText || text).slice(0, 500);
        const hasImg = !!card.querySelector('img');
        const hasVideo = !!card.querySelector('video');

        posts.push({
          sourceUrl: location.href,
          scrapedAt: nowISO(),
          text: snippet,
          impressions,
          likes,
          comments,
          timestamp,
          media: hasVideo ? 'video' : hasImg ? 'image' : 'text'
        });
      } catch (e) { /* ignore card parse errors */ }
      if (posts.length >= 10) break;
    }

    const out = [];
    const seen = new Set();
    for (const p of posts) {
      const key = (p.text || '').slice(0, 120) + '|' + (p.impressions || '') + '|' + (p.likes || '');
      if (!seen.has(key)) { seen.add(key); out.push(p); }
    }
    return out;
  }

  function parseRecentActivitySharesPage() {
    const posts = [];
    const containers = Array.from(document.querySelectorAll('div.occludable-update,div.feed-shared-update-v2,div.feed-shared-update'));
    const fallback = containers.length === 0
      ? Array.from(document.querySelectorAll('div')).filter(d => {
        const t = (d.innerText || '').toLowerCase();
        return t.includes('like') && t.includes('comment') && t.includes('share');
      }).slice(0, 60)
      : containers;
    for (const el of fallback) {
      const parsed = parsePostFromElement(el);
      if (parsed) posts.push(parsed);
      if (posts.length >= 20) break;
    }
    const uniq = [];
    const keys = new Set();
    for (const p of posts) {
      const key = (p.text || '').slice(0, 120) + '|' + (p.timestamp || '');
      if (!keys.has(key)) { keys.add(key); uniq.push(p); }
    }
    return uniq;
  }

  function parsePostFromElement(el) {
    try {
      const textEl = el.querySelector('span[dir="ltr"],span.break-words,div.update-components-text,div.feed-shared-update-v2__description');
      const text = textEl ? textEl.innerText.trim() : (el.innerText || '').slice(0, 400);

      const likesEl = el.querySelector('button[data-reaction-details], button[aria-label*="reaction"], .social-details-social-counts__count-value');
      const likesLabel = likesEl?.getAttribute?.('aria-label') || likesEl?.innerText || '';
      const likes = likesLabel ? parseNumber(likesLabel.match(/[\d,\.]+/)?.[0] ?? likesLabel) : null;

      const commentsEl = el.querySelector('button[aria-label*="comment"], .comment-count, [data-test-comments-count]');
      const commentsLabel = commentsEl?.getAttribute?.('aria-label') || commentsEl?.innerText || '';
      const comments = commentsLabel ? parseNumber(commentsLabel.match(/[\d,\.]+/)?.[0] ?? commentsLabel) : null;

      const timeEl = el.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || null;
      const hasImg = !!el.querySelector('img');
      const hasVideo = !!el.querySelector('video');

      return {
        sourceUrl: location.href,
        scrapedAt: nowISO(),
        text: text.slice(0, 200),
        impressions: null,
        likes,
        comments,
        timestamp,
        media: hasVideo ? 'video' : hasImg ? 'image' : 'text'
      };
    } catch (e) {
      return null;
    }
  }

  // function parseProfileViewsPage() {
  //   const stats = {};
  //   const pvEls = findElementsByText(/profile views|profile viewed|views/i);
  //   for (const el of pvEls) {
  //     const n = extractNearbyNumber(el);
  //     if (n !== null) { stats.profileViews = n; break; }
  //   }
  //   const saEls = findElementsByText(/search appearances|appeared in search|search/i);
  //   for (const el of saEls) {
  //     const n = extractNearbyNumber(el);
  //     if (n !== null) { stats.searchAppearances = n; break; }
  //   }
  //   return stats;
  // }

  function parseContentImpressionsPage() {
    const stats = {};

    // 1) Prefer the structured "Discovery" block if present
    const discoveryUl = document.querySelector('ul.member-analytics-addon-summary');
    if (discoveryUl) {
      const items = Array.from(discoveryUl.querySelectorAll('li.member-analytics-addon-summary__list-item'));
      for (const li of items) {
        // value element shown in your HTML: <p class="text-body-medium-bold pr1 text-heading-large">30,036</p>
        const valueEl = li.querySelector('p.text-body-medium-bold, p.text-heading-large, .text-heading-large, p');
        const labelEl = li.querySelector('p.member-analytics-addon-list-item__description, .member-analytics-addon-list-item__description');
        const rawVal = (valueEl?.innerText || '').replace(/\u00A0/g, ' ').trim();
        const label = (labelEl?.innerText || '').trim().toLowerCase();

        if (rawVal) {
          const n = parseNumber(rawVal);
          if (n != null) {
            if (/impressions?/i.test(label) || label.includes('impressions')) {
              stats.impressions = n;
            } else if (/members?\s+reached/i.test(label) || label.includes('members reached')) {
              stats.membersReached = n;
            } else {
              // if label absent, try to infer by order: first -> impressions, second -> members reached
              if (stats.impressions == null) stats.impressions = n;
              else if (stats.membersReached == null) stats.membersReached = n;
            }
          }
        }
      }

      // ensure numbers are Number typed
      if (stats.impressions != null) stats.impressions = Number(stats.impressions);
      if (stats.membersReached != null) stats.membersReached = Number(stats.membersReached);

      // return early if we found at least impressions (and ideally membersReached)
      if (stats.impressions != null || stats.membersReached != null) return stats;
    }

    // 2) Fallback to document-wide heuristics (existing robust logic)
    // (keep your prior collect/label heuristics)
    // ...existing fallback code...
    // reuse previously implemented helper logic:
    const fallback = (function() {
      const res = {};
      const impEls = findElementsByText(/\bimpressions\b/i);
      for (const el of impEls) {
        const n = extractNearbyNumber(el);
        if (n != null) { res.impressions = n; break; }
      }
      const mrEls = findElementsByText(/members?\s+reached/i);
      for (const el of mrEls) {
        const n = extractNearbyNumber(el);
        if (n != null) { res.membersReached = n; break; }
      }
      return res;
    })();

    if (fallback.impressions != null) stats.impressions = fallback.impressions;
    if (fallback.membersReached != null) stats.membersReached = fallback.membersReached;

    return stats;
  }

  (async function run() {
    await stabilize();
    const url = location.href;
    const payload = { scrapedFrom: url, scrapedAt: nowISO(), topPosts: [], profileStats: {}, meta: {} };

    try {
      if (url.includes('/analytics/creator/top-posts')) {
        payload.topPosts = parseTopPostsFromCreatorPage();
        payload.meta.page = 'creator-top-posts';
      } else if (url.includes('/analytics/creator/content')) {
        payload.profileStats = parseContentImpressionsPage();
        payload.meta.page = 'creator-content-impressions';
      // } else if (url.includes('/detail/recent-activity/shares') || url.includes('/recent-activity')) {
      //   payload.topPosts = parseRecentActivitySharesPage();
      //   payload.meta.page = 'recent-activity-shares';
      // } else if (url.includes('/analytics/profile-views') || url.includes('/profile-views')) {
      //   payload.profileStats = parseProfileViewsPage();
      //   payload.meta.page = 'profile-views';
      } else {
        payload.topPosts = parseTopPostsFromCreatorPage();
        // payload.profileStats = parseProfileViewsPage();
        payload.meta.page = 'fallback';
      }
      console.log('[scraper] extracted', payload);
    } catch (err) {
      console.error('[scraper] extraction error', err);
      payload.error = String(err);
    }

    try {
      chrome.runtime.sendMessage({ action: 'SCRAPED_DATA', data: payload, fromUrl: location.href, closeTab: true }, resp => {
        console.log('[scraper] sent to background', resp);
      });
    } catch (e) {
      console.error('[scraper] sendMessage failed', e);
    }
  })();
})();