// ui/report-template.js
export function createReportHtml(reportData) {
  // simple computations
  const posts = reportData.posts || [];
  const totalPosts = posts.length;
  const totalImpressions = posts.reduce((s,p) => s + (p.impressions || 0), 0);
  const totalLikes = posts.reduce((s,p) => s + (p.likes || 0), 0);
  const totalComments = posts.reduce((s,p) => s + (p.comments || 0), 0);

  const mostLiked = posts.slice().sort((a,b) => (b.likes || 0) - (a.likes || 0))[0];
  const mostImpressions = posts.slice().sort((a,b) => (b.impressions || 0) - (a.impressions || 0))[0];

  // hashtags frequency
  const hashtagCounts = {};
  posts.forEach(p => {
    const txt = p.text || '';
    const matches = txt.match(/#\w+/g) || [];
    matches.forEach(h => hashtagCounts[h.toLowerCase()] = (hashtagCounts[h.toLowerCase()] || 0) + 1);
  });
  const topHashtags = Object.entries(hashtagCounts).sort((a,b) => b[1]-a[1]).slice(0,5);

  const cardsHtml = [];

  function card(title, contentHtml){
    return `<div class="rounded-3xl p-6 shadow-xl bg-gradient-to-br from-indigo-700 to-rose-500/60 text-white mb-6">
      <h2 class="text-sm uppercase tracking-widest text-white/90">${title}</h2>
      <div class="mt-3 text-3xl font-extrabold">${contentHtml}</div>
    </div>`;
  }

  // card: summary
  cardsHtml.push(card('Year in numbers', `
    <div class="grid grid-cols-2 gap-4">
      <div class="text-center"><div class="text-5xl">${totalPosts}</div><div class="text-sm">Posts</div></div>
      <div class="text-center"><div class="text-5xl">${numberWithCommas(totalImpressions)}</div><div class="text-sm">Impressions</div></div>
      <div class="text-center"><div class="text-5xl">${numberWithCommas(totalLikes)}</div><div class="text-sm">Likes</div></div>
      <div class="text-center"><div class="text-5xl">${numberWithCommas(totalComments)}</div><div class="text-sm">Comments</div></div>
    </div>
  `));

  // card: most liked
  if (mostLiked) {
    cardsHtml.push(card('Post with most impression', `<div class="text-base font-medium max-w-prose">${escapeHtml(mostLiked.text || '(no text)')}</div>
      <div class="mt-3 text-sm">Likes: ${numberWithCommas(mostLiked.likes||0)} · Comments: ${numberWithCommas(mostLiked.comments||0)} · Impressions: ${numberWithCommas(mostLiked.impressions||0)}</div>`));
  }

  // card: most impressions
  if (mostImpressions && mostImpressions !== mostLiked) {
    cardsHtml.push(card('Most impressions', `<div class="text-base font-medium max-w-prose">${escapeHtml(mostImpressions.text || '(no text)')}</div>
      <div class="mt-3 text-sm">Impressions: ${numberWithCommas(mostImpressions.impressions||0)} · Likes: ${numberWithCommas(mostImpressions.likes||0)}</div>`));
  }

  // card: top hashtags
  const hashtagsHtml = topHashtags.length ? topHashtags.map(h=>`<div class="inline-block mr-2 px-3 py-1 rounded-full bg-white/20">${escapeHtml(h[0])} · ${h[1]}</div>`).join('') : '<div class="text-sm text-white/80">No hashtags detected</div>';
  cardsHtml.push(card('Top hashtags', hashtagsHtml));

  // build page
  const html = `
  <!doctype html>
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
      <div class="mb-8">
        <div class="top-title">Your LinkedIn Wrapped</div>
        <div class="text-slate-300 mt-2">A snapshot of your activity (data extracted from pages you opened)</div>
      </div>

      <div>
        ${cardsHtml.join('\n')}
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
      function numberWithCommas(x){ return x.toString().replace(/\B(?=(\\d{3})+(?!\\d))/g, ","); }
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
  </html>
  `;

  return html;
}

function numberWithCommas(x){
  if (x === undefined || x === null) return '0';
  return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}
