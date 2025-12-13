function numberWithCommas(x){
  if (x === undefined || x === null) return '0';
  return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}

export function createReportHtml(reportData, iconDataURL = null) {
  console.log('[report-template] createReportHtml called', reportData);
  const posts = reportData?.posts || reportData?.topPosts || [];
  const profileStats = reportData?.stats || reportData?.profileStats || {};

  const totalImpressions = Number(
    profileStats.impressions != null
      ? profileStats.impressions
      : posts.reduce((s, p) => s + (Number(p.impressions) || 0), 0)
  ) || 0;  
  const membersReached = Number(profileStats.membersReached ?? 0);

  // compute top post by impressions
  const mostImpressions = posts.slice().sort((a,b) => (b.impressions||0) - (a.impressions||0))[0];

  function card(title, contentHtml) {
    return `<div class="rounded-3xl p-6 shadow-xl bg-gradient-to-br from-indigo-700 to-rose-500/60 text-white mb-6">
      <h2 class="text-sm uppercase tracking-widest text-white/90">${escapeHtml(title)}</h2>
      <div class="mt-3 text-3xl font-extrabold">${contentHtml}</div>
    </div>`;
  }

  const cards = [];

  // Year in numbers: only Total Impressions and Members Reached
  cards.push(card('Year in numbers', `
    <div class="grid grid-cols-2 gap-4">
      <div class="text-center">
        <div class="text-5xl">${numberWithCommas(totalImpressions || 0)}</div>
        <div class="text-sm">Total impressions</div>
      </div>
      <div class="text-center">
        <div class="text-5xl">${numberWithCommas(membersReached)}</div>
        <div class="text-sm">Members reached</div>
      </div>
    </div>
  `));

  // Top post by impressions (show impressions, likes, comments)
  if (mostImpressions) {
    const p = mostImpressions;
    const postText = escapeHtml((p.text || '').slice(0, 280) || '(no text)');
    const impressionsTxt = numberWithCommas(p.impressions || 0);
    const likesTxt = numberWithCommas(p.likes || 0);
    const commentsTxt = numberWithCommas(p.comments || 0);

    cards.push(card('Top post by impressions', `
      <div class="max-w-prose text-base font-medium mb-3">${postText}</div>
      <div class="text-sm text-white/90">Impressions: <strong>${impressionsTxt}</strong> · Likes: <strong>${likesTxt}</strong> · Comments: <strong>${commentsTxt}</strong></div>
      ${p.link ? `<div class="mt-3 text-xs text-white/70">Source: <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" class="underline">${escapeHtml(p.link)}</a></div>` : ''}
    `));
  }

  // Create icon HTML if available
  const iconHtml = iconDataURL 
    ? `<img src="${escapeHtml(iconDataURL)}" alt="LinkedIn Wrapped" class="w-16 h-16 mr-4" />`
    : '';

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Your LinkedIn Wrapped</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: linear-gradient(180deg,#0f172a 0%, #071024 100%); color: white; padding: 24px; }
      .card { max-width: 920px; margin: 0 auto; }
      .top-title { font-size: 44px; font-weight: 800; letter-spacing: -1px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="mb-8 flex items-center">
        ${iconHtml}
        <div>
          <div class="top-title">Your LinkedIn Wrapped</div>
          <div class="text-slate-300 mt-2">A snapshot of your activity (data extracted from pages you opened)</div>
        </div>
      </div>

      <div>
        ${cards.join('\n')}
      </div>

      <div class="mt-8 text-sm text-slate-300">
        <p>Export: Use the browser's "Save as..." or use the Export button below to produce PNGs of each card.</p>
        <div class="mt-3 flex gap-2">
          <button id="exportAll" class="px-4 py-2 rounded bg-white text-black font-semibold">Export cards as PNG</button>
        </div>
      </div>
    </div>

    <script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
    <script>
      function numberWithCommas(x){ if (x === undefined || x === null) return '0'; return String(x).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ","); }
      document.getElementById('exportAll').addEventListener('click', async () => {
        const cards = Array.from(document.querySelectorAll('.rounded-3xl'));
        for (let i=0;i<cards.length;i++){
          const el = cards[i];
          const canvas = await html2canvas(el, { scale: 2 });
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wrapped_card_' + (i+1) + '.png';
          a.click();
        }
      });
    </script>
  </body>
  </html>`;

  return html;
}

if (typeof window !== 'undefined') {
  window.__TEST_createReportHtml = (data) => {
    try { const out = createReportHtml(data); console.log('[report-template] html length', out.length); return out; }
    catch (e) { console.error('[report-template] test error', e); return null; }
  };
}