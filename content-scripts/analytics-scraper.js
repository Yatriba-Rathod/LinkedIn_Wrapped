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
      } catch (e) { }
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

  // 🔥 NEW BLOCK START — FINAL WORKING IMPRESSIONS PARSER
  function parseContentImpressionsPage() {
    const stats = {};

    try {
      // 🔥 Only select the section whose header is EXACTLY "Discovery"
      const discoveryHeader = Array.from(document.querySelectorAll("h2"))
        .find(h2 => h2.innerText.trim().toLowerCase() === "discovery");

      if (!discoveryHeader) {
        console.log("[scraper] Discovery header not found");
        return stats;
      }

      // The UL we want is inside the same card container
      const discoverySection = discoveryHeader.closest("section");

      if (!discoverySection) {
        console.log("[scraper] Discovery section not found");
        return stats;
      }

      const ul = discoverySection.querySelector("ul.member-analytics-addon-summary");

      if (!ul) {
        console.log("[scraper] Discovery UL not found inside the correct section");
        return stats;
      }


      const items = Array.from(
        ul.querySelectorAll("li.member-analytics-addon-summary__list-item")
      );

      console.log("[scraper] found list items:", items.length);

      items.forEach((li) => {

        // 🔥 CHANGED LINE — Correct selectors for the value element
        const valueP = li.querySelector(
          "p.text-body-medium-bold, p.text-heading-large"
        );

        let raw = "";
        if (valueP) {
          raw = valueP.textContent.trim();

          if (!raw) {
            // 🔥 CHANGED LINE — Properly unwrap HTML comments
            raw = valueP.innerHTML.replace(/<!--\s*(.*?)\s*-->/g, "$1").trim();
          }
        }

        const number = parseNumber(raw);

        // 🔥 CHANGED LINE — Correct selector for label element
        const labelP = li.querySelector(
          "p.member-analytics-addon-list-item__description"
        );

        let label = labelP
          ? labelP.textContent.replace(/<!--\s*(.*?)\s*-->/g, "$1").trim()
          : "";

        label = label.toLowerCase();

        console.log("[scraper] extracted:", { label, number });

        if (!number || !label) return;

        if (label.includes("impressions")) stats.impressions = number;
        if (label.includes("members reached")) stats.membersReached = number;
      });

      console.log("[scraper] FINAL DISCOVERY STATS:", stats);
      return stats;
    } catch (err) {
      console.error("[scraper] error in parseContentImpressionsPage:", err);
      return stats;
    }
  }
  // 🔥 NEW BLOCK END

  (async function run() {
    await stabilize();
    const url = location.href;
    const payload = { scrapedFrom: url, scrapedAt: nowISO(), topPosts: [], profileStats: {}, meta: {} };

    try {
      if (url.includes('/analytics/creator/top-posts')) {
        payload.topPosts = parseTopPostsFromCreatorPage();
        payload.meta.page = 'creator-top-posts';
      } else if (url.includes('/analytics/creator/content')) {
        // 🔥 CHANGED LINE — use new impressions parser
        payload.profileStats = parseContentImpressionsPage();
        payload.meta.page = 'creator-content-impressions';
      } else {
        payload.topPosts = parseTopPostsFromCreatorPage();
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
