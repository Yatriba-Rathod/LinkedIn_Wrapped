// report.js - LinkedIn Wrapped Report Generator

function numberWithCommas(x) {
  if (x === undefined || x === null) return '0';
  return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

export function createReportHtml(reportData) {
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

  function card(title, contentHtml, delay = '') {
    return `<div class="glass-card rounded-3xl p-8 md:p-12 glow-blue-hover transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] animate-slideInLeft ${delay}">
      <div class="flex items-center gap-3 mb-8">
        <div class="w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
        <h2 class="text-sm md:text-base uppercase tracking-[0.2em] text-blue-100/70 font-bold">${escapeHtml(title)}</h2>
      </div>
      <div class="text-white">${contentHtml}</div>
    </div>`;
  }

  const cards = [];

  // Year in numbers: only Total Impressions and Members Reached
  cards.push(card('Year in numbers', `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div class="text-center group">
        <div class="relative inline-block">
          <div class="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full group-hover:bg-blue-400/30 transition-all"></div>
          <div class="relative text-6xl md:text-7xl font-black leading-none mb-4 gradient-number">${numberWithCommas(totalImpressions || 0)}</div>
        </div>
        <div class="text-lg md:text-xl text-blue-50/80 font-semibold">Total Impressions</div>
        <div class="text-sm text-blue-100/50 mt-2">Views across all your content</div>
      </div>
      <div class="text-center group">
        <div class="relative inline-block">
          <div class="absolute inset-0 bg-purple-400/20 blur-2xl rounded-full group-hover:bg-purple-400/30 transition-all"></div>
          <div class="relative text-6xl md:text-7xl font-black leading-none mb-4 gradient-number">${numberWithCommas(membersReached)}</div>
        </div>
        <div class="text-lg md:text-xl text-blue-50/80 font-semibold">Members Reached</div>
        <div class="text-sm text-blue-100/50 mt-2">Unique professionals engaged</div>
      </div>
    </div>
  `, 'delay-100'));

  // Top post by impressions (show impressions, likes, comments)
  if (mostImpressions) {
    const p = mostImpressions;
    const postText = escapeHtml((p.text || '').slice(0, 280) || '(no text)');
    const impressionsTxt = numberWithCommas(p.impressions || 0);
    const likesTxt = numberWithCommas(p.likes || 0);
    const commentsTxt = numberWithCommas(p.comments || 0);

    cards.push(card('Top post by impressions', `
      <div class="bg-white/5 rounded-2xl p-6 md:p-8 mb-6 border border-white/10">
        <div class="text-lg md:text-xl leading-relaxed text-blue-50/95 font-medium">${postText}</div>
      </div>
      
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 text-center border border-blue-400/20">
          <div class="text-3xl md:text-4xl mb-1">👁</div>
          <div class="text-2xl md:text-3xl font-bold text-white mb-1">${impressionsTxt}</div>
          <div class="text-xs md:text-sm text-blue-100/60 uppercase tracking-wider">Views</div>
        </div>
        <div class="bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-xl p-4 text-center border border-pink-400/20">
          <div class="text-3xl md:text-4xl mb-1">❤️</div>
          <div class="text-2xl md:text-3xl font-bold text-white mb-1">${likesTxt}</div>
          <div class="text-xs md:text-sm text-blue-100/60 uppercase tracking-wider">Likes</div>
        </div>
        <div class="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 text-center border border-purple-400/20">
          <div class="text-3xl md:text-4xl mb-1">💬</div>
          <div class="text-2xl md:text-3xl font-bold text-white mb-1">${commentsTxt}</div>
          <div class="text-xs md:text-sm text-blue-100/60 uppercase tracking-wider">Comments</div>
        </div>
      </div>
      
      ${p.link ? `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors font-medium group">
        <span>View original post</span>
        <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
        </svg>
      </a>` : ''}
    `, 'delay-200'));
  }

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your LinkedIn Wrapped</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-100px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-slideInLeft { animation: slideInLeft 0.8s ease-out backwards; }
    .animate-scaleIn { animation: scaleIn 0.6s ease-out backwards; }
    .delay-100 { animation-delay: 0.1s; }
    .delay-200 { animation-delay: 0.2s; }
    .delay-300 { animation-delay: 0.3s; }
    .delay-400 { animation-delay: 0.4s; }
    .gradient-text-blue { background: linear-gradient(135deg, #ffffff 0%, #60a5fa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .gradient-number { background: linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #dbeafe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .glass-card { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.18); }
    .glass-card:hover { background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); }
    .glow-blue { box-shadow: 0 0 40px rgba(96, 165, 250, 0.4); }
    .glow-blue-hover:hover { box-shadow: 0 0 60px rgba(96, 165, 250, 0.6); }
  </style>
</head>
<body class="bg-gradient-to-br from-[#0066a1] via-[#0a66c2] to-[#004182] min-h-screen">
  
  <!-- Decorative elements -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float"></div>
    <div class="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float" style="animation-delay: 1.5s;"></div>
  </div>

  <div class="relative z-10 max-w-6xl mx-auto px-6 py-16">
    
    <!-- Header -->
    <div class="text-center mb-20 animate-scaleIn">
      <div class="inline-flex items-center justify-center mb-6">
        <img src="assets/icons/icon128.png" alt="LinkedIn" class="w-24 h-24 rounded-3xl shadow-2xl glow-blue bg-white p-4"/>
      </div>
      <h1 class="text-7xl md:text-8xl font-black mb-6 gradient-text-blue tracking-tight">
        Your 2025<br/>LinkedIn Wrapped
      </h1>
      <p class="text-xl md:text-2xl text-blue-50/90 font-medium max-w-2xl mx-auto">
        Your year in professional growth, connections, and impact
      </p>
    </div>

    <!-- Cards -->
    <div class="grid grid-cols-1 gap-8 mb-16">
      ${cards.join('\n')}
    </div>

    <!-- Export Section -->
    <div class="glass-card rounded-3xl p-10 text-center animate-scaleIn delay-400 glow-blue-hover transition-all duration-300">
      <div class="mb-6">
        <h3 class="text-2xl font-bold text-white mb-2">Share Your Story</h3>
        <p class="text-blue-100/80">Download your wrapped cards and share them with your network</p>
      </div>
      <button id="exportAll" class="group relative inline-flex items-center gap-3 bg-white text-[#0a66c2] px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
        <span class="text-2xl">📸</span>
        <span>Export as PNG</span>
        <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
        </svg>
      </button>
    </div>

    <!-- Footer -->
    <div class="mt-16 text-center">
      <p class="text-blue-100/60 text-sm">Made with 💙 for LinkedIn professionals</p>
    </div>

  </div>

  <script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <script>
    document.getElementById('exportAll').addEventListener('click', async () => {
      const cards = Array.from(document.querySelectorAll('.glass-card')).slice(0, -1);
      for (let i=0;i<cards.length;i++){
        const el = cards[i];
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null });
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'linkedin_wrapped_' + (i+1) + '.png';
        a.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });
  </script>
</body>
</html>`;

  return html;
}

if (typeof window !== 'undefined') {
  window.__TEST_createReportHtml = (data) => {
    try {
      const out = createReportHtml(data);
      console.log('[report-template] html length', out.length);
      return out;
    }
    catch (e) {
      console.error('[report-template] test error', e);
      return null;
    }
  };
}

// Export button functionality for static HTML page
if (typeof window !== 'undefined' && document.getElementById('exportAll')) {
  document.getElementById('exportAll').addEventListener('click', async () => {
    const cards = Array.from(document.querySelectorAll('.glass-card')).slice(0, -1);
    for (let i = 0; i < cards.length; i++) {
      const el = cards[i];
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: null });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linkedin_wrapped_' + (i + 1) + '.png';
      a.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });
}