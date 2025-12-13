(function () {
  'use strict';
  console.log('[scraper] start', location.href);

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const nowISO = () => new Date().toISOString();

  // Helper function if not already defined
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
      await wait(600);
    }
    await wait(900);
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

  function parseContentImpressionsPage() {
    const stats = {};

    try {      
      // Find the Discovery section
      const allH2s = Array.from(document.querySelectorAll("h2"));
      console.log("[scraper] Found h2 elements:", allH2s.length);
      allH2s.forEach((h2, i) => console.log(`[scraper] h2[${i}]:`, h2.innerText.trim()));
      
      const discoveryHeader = allH2s.find(h2 => h2.innerText.trim().toLowerCase() === "discovery");

      if (!discoveryHeader) {
        console.log("[scraper] Discovery header not found");
        return stats;
      }
      console.log("[scraper] Found Discovery header");

      const discoverySection = discoveryHeader.closest("section");
      if (!discoverySection) {
        console.log("[scraper] Discovery section not found");
        return stats;
      }
      console.log("[scraper] Found Discovery section");

      const ul = discoverySection.querySelector("ul.member-analytics-addon-summary");
      if (!ul) {
        console.log("[scraper] Discovery UL not found");
        // Try alternative: just look for any li items in the section
        const allLis = discoverySection.querySelectorAll("li");
        console.log("[scraper] Found", allLis.length, "li elements in section (without UL class)");
        return stats;
      }
      console.log("[scraper] Found UL element");

      const items = Array.from(
        ul.querySelectorAll("li.member-analytics-addon-summary__list-item")
      );

      console.log("[scraper] found list items:", items.length);

      items.forEach((li, index) => {
        console.log(`[scraper] === Processing item ${index} ===`);
        
        // Try to find ANY p tag with a number-like value
        const allPTags = li.querySelectorAll("p");
        console.log(`[scraper] Item ${index} has ${allPTags.length} p tags`);
        
        allPTags.forEach((p, pIndex) => {
          console.log(`[scraper] p[${pIndex}] classes:`, p.className);
          console.log(`[scraper] p[${pIndex}] textContent:`, p.textContent.trim());
          console.log(`[scraper] p[${pIndex}] innerHTML:`, p.innerHTML);
        });

        // Get the value - try multiple selectors
        const valueP = li.querySelector(
          "p.text-body-medium-bold, p.text-heading-large, p.text-body-medium-bold.pr1.text-heading-large, p[class*='text-heading']"
        );

        let raw = "";
        if (valueP) {
          // First try direct textContent
          raw = valueP.textContent.trim();
          
          // If empty, try innerHTML and strip HTML comments
          if (!raw) {
            const innerHTML = valueP.innerHTML;
            // Remove HTML comments: <!--something-->
            raw = innerHTML.replace(/<!--\s*/g, '').replace(/\s*-->/g, '').trim();
          }
          
          console.log("[scraper] raw value extracted:", raw);
        } else {
          console.log("[scraper] No value element found!");
        }

        const number = parseNumber(raw);
        console.log("[scraper] parsed number:", number);

        // Get the label
        const labelP = li.querySelector(
          "p.member-analytics-addon-list-item__description, p[class*='description']"
        );

        let label = "";
        if (labelP) {
          // Try textContent first
          label = labelP.textContent.trim();
          
          // If empty, strip HTML comments from innerHTML
          if (!label) {
            const innerHTML = labelP.innerHTML;
            label = innerHTML.replace(/<!--\s*/g, '').replace(/\s*-->/g, '').trim();
          }
          console.log("[scraper] raw label:", label);
        } else {
          console.log("[scraper] No label element found!");
        }

        label = label.toLowerCase();

        console.log("[scraper] extracted:", { label, raw, number });

        if (!number) {
          console.log("[scraper] skipping - no valid number");
          return;
        }
        
        if (!label) {
          console.log("[scraper] WARNING: no label but have number:", number);
        }

        // More flexible matching
        if (label.includes("impression") || label.includes("total impression")) {
          stats.impressions = number;
          console.log("[scraper] SET impressions:", number);
        }
        else if (label.includes("members reached") || label.includes("reached")) {
          stats.membersReached = number;
          console.log("[scraper] SET membersReached:", number);
        }
        // Fallback: if we haven't set impressions yet and this is the first item
        else if (!stats.impressions && index === 0) {
          stats.impressions = number;
          console.log("[scraper] SET impressions (fallback first item):", number);
        }
        // Fallback: if we have impressions but not members reached, and this is second item
        else if (stats.impressions && !stats.membersReached && index === 1) {
          stats.membersReached = number;
          console.log("[scraper] SET membersReached (fallback second item):", number);
        }
      });

      console.log("[scraper] === FINAL DISCOVERY STATS ===", stats);
      return stats;
    } catch (err) {
      console.error("[scraper] error in parseContentImpressionsPage:", err);
      return stats;
    }
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
