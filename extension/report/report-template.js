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

  // Compute top post by impressions
  const mostImpressions = posts.slice().sort((a,b) => (b.impressions||0) - (a.impressions||0))[0];
  
  // Compute additional stats
  const totalLikes = posts.reduce((s, p) => s + (Number(p.likes) || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (Number(p.comments) || 0), 0);
  const avgEngagement = posts.length > 0 ? ((totalLikes + totalComments) / posts.length).toFixed(1) : 0;

  function card(title, contentHtml, gradient = 'from-blue-600 via-green-600 to-black-600') {
    return `<div class="card-wrapper">
      <div class="card-inner bg-gradient-to-br ${gradient}">
        <h2 class="card-title">${escapeHtml(title)}</h2>
        <div class="card-content">${contentHtml}</div>
      </div>
    </div>`;
  }

  const cards = [];

  // Hero card
  cards.push(card('📆Your Year in Review', `
    <div class="hero-content">
      <div class="hero-stat">
        <div class="hero-number">${numberWithCommas(totalImpressions || 0)}</div>
        <div class="hero-label">Total Impressions</div>
      </div>
      <div class="hero-divider"></div>
      <div class="hero-stat">
        <div class="hero-number">${numberWithCommas(membersReached)}</div>
        <div class="hero-label">Members Reached</div>
      </div>
    </div>
  `, 'from-blue-600 via-cyan-600 to-teal-600'));

  // Top post
  if (mostImpressions) {
    const p = mostImpressions;
    const impressionsTxt = numberWithCommas(p.impressions || 0);
    const likesTxt = numberWithCommas(p.likes || 0);
    const commentsTxt = numberWithCommas(p.comments || 0);

    cards.push(card('🏆 Your Top Performing Post', `
      <div class="post-metrics">
        <div class="metric">
          <span class="metric-icon">👁️</span>
          <span class="metric-value">${impressionsTxt}</span>
          <span class="metric-label">impressions</span>
        </div>
        <div class="metric">
          <span class="metric-icon">❤️</span>
          <span class="metric-value">${likesTxt}</span>
          <span class="metric-label">likes</span>
        </div>
        <div class="metric">
          <span class="metric-icon">💬</span>
          <span class="metric-value">${commentsTxt}</span>
          <span class="metric-label">comments</span>
        </div>
      </div>
  `, 'from-amber-600 via-orange-600 to-red-600'));
  }

  // Create icon HTML if available
  const iconHtml = iconDataURL 
    ? `<img src="${escapeHtml(iconDataURL)}" alt="LinkedIn Wrapped" class="header-icon" />`
    : '';

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Your LinkedIn Wrapped</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body { 
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; 
        background: linear-gradient(135deg, #1DB954 0%, #0A66C2 50%, #000000ff 100%);
        color: white; 
        padding: 24px;
        min-height: 100vh;
      }
      
      .container {
        max-width: 920px;
        margin: 0 auto;
      }
      
      .header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 48px;
        animation: fadeInDown 0.8s ease-out;
      }
      
      .header-icon {
        width: 80px;
        height: 80px;
        filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
        animation: float 3s ease-in-out infinite;
      }
      
      .header-content {
        flex: 1;
      }
      
      .header-title {
        font-size: 48px;
        font-weight: 900;
        letter-spacing: -2px;
        background: linear-gradient(135deg, #fff 0%, #f0f9ff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 8px;
      }
      
      .header-subtitle {
        font-size: 18px;
        color: rgba(255,255,255,0.8);
        font-weight: 500;
      }
      
      .card-wrapper {
        margin-bottom: 32px;
        animation: fadeInUp 0.8s ease-out backwards;
      }
      
      .card-wrapper:nth-child(1) { animation-delay: 0.1s; }
      .card-wrapper:nth-child(2) { animation-delay: 0.2s; }
      .card-wrapper:nth-child(3) { animation-delay: 0.3s; }
      .card-wrapper:nth-child(4) { animation-delay: 0.4s; }
      
      .card-inner {
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .card-inner::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
        pointer-events: none;
      }
      
      .card-inner:hover {
        transform: translateY(-8px);
        box-shadow: 0 30px 80px rgba(0,0,0,0.4);
      }
      
      .card-title {
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: rgba(255,255,255,0.9);
        margin-bottom: 24px;
        position: relative;
        z-index: 1;
      }
      
      .card-content {
        position: relative;
        z-index: 1;
      }
      
      .hero-content {
        display: flex;
        align-items: center;
        justify-content: space-around;
        gap: 40px;
      }
      
      .hero-stat {
        flex: 1;
        text-align: center;
      }
      
      .hero-number {
        font-size: 72px;
        font-weight: 900;
        line-height: 1;
        margin-bottom: 12px;
        background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .hero-label {
        font-size: 16px;
        font-weight: 600;
        color: rgba(255,255,255,0.9);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .hero-divider {
        width: 2px;
        height: 100px;
        background: linear-gradient(180deg, transparent, rgba(255,255,255,0.3), transparent);
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 32px;
      }
      
      .stat-item {
        text-align: center;
        padding: 24px;
        background: rgba(255,255,255,0.1);
        border-radius: 16px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }
      
      .stat-item:hover {
        background: rgba(255,255,255,0.15);
        transform: scale(1.05);
      }
      
      .stat-icon {
        font-size: 48px;
        margin-bottom: 16px;
        display: block;
        animation: bounce 2s ease-in-out infinite;
      }
      
      .stat-item:nth-child(2) .stat-icon { animation-delay: 0.2s; }
      .stat-item:nth-child(3) .stat-icon { animation-delay: 0.4s; }
      .stat-item:nth-child(4) .stat-icon { animation-delay: 0.6s; }
      
      .stat-number {
        font-size: 48px;
        font-weight: 800;
        margin-bottom: 8px;
      }
      
      .stat-label {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255,255,255,0.8);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .post-text {
        font-size: 18px;
        line-height: 1.6;
        margin-bottom: 24px;
        color: rgba(255,255,255,0.95);
        font-weight: 500;
      }
      
      .post-metrics {
        display: flex;
        gap: 32px;
        flex-wrap: wrap;
        justify-content: space-between;
      }
      
      .metric {
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        background: rgba(255,255,255,0.15);
        border-radius: 12px;
        transition: all 0.3s ease;
        justify-content: center;
      }
      
      .metric:hover {
        background: rgba(255,255,255,0.2);
        transform: translateY(-2px);
      }
      
      .metric-icon {
        font-size: 24px;
      }
      
      .metric-value {
        font-size: 24px;
        font-weight: 700;
      }
      
      .metric-label {
        font-size: 14px;
        color: rgba(255,255,255,0.8);
        font-weight: 500;
      }
      
      .actions {
        margin-top: 48px;
        text-align: center;
        animation: fadeInUp 1s ease-out backwards;
        animation-delay: 0.5s;
      }
      
      .actions-title {
        font-size: 16px;
        color: rgba(255,255,255,0.8);
        margin-bottom: 20px;
        font-weight: 500;
      }
      
      .btn {
        display: inline-block;
        padding: 16px 32px;
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 12px;
        color: white;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .btn:hover {
        background: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.5);
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      }
      
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      
      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      
      @media (max-width: 768px) {
        .header-title {
          font-size: 36px;
        }
        
        .hero-content {
          flex-direction: column;
          gap: 32px;
        }
        
        .hero-divider {
          width: 100px;
          height: 2px;
        }
        
        .stats-grid {
          grid-template-columns: 1fr;
          gap: 20px;
        }
        
        .hero-number {
          font-size: 56px;
        }
        
        .stat-number {
          font-size: 36px;
        }
        
        .post-metrics {
          flex-direction: column;
          gap: 16px;
          justify-content: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        ${iconHtml}
        <div class="header-content">
          <div class="header-title">Your LinkedIn Wrapped</div>
          <div class="header-subtitle">A year of growth, engagement, and impact ✨</div>
        </div>
      </div>

      <div>
        ${cards.join('\n')}
      </div>

      <div class="actions">
        <div class="actions-title">Want to save your report?</div>
        <button id="exportAll" class="btn">📸 Export as Images</button>
      </div>
    </div>

    <script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
    <script>
      document.getElementById('exportAll').addEventListener('click', async () => {
        const cards = Array.from(document.querySelectorAll('.card-inner'));
        const btn = document.getElementById('exportAll');
        btn.textContent = '⏳ Generating...';
        btn.disabled = true;
        
        for (let i=0;i<cards.length;i++){
          const el = cards[i];
          const canvas = await html2canvas(el, { 
            scale: 2,
            backgroundColor: null,
            logging: false
          });
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = 'linkedin_wrapped_' + (i+1) + '.png';
          a.click();
          await new Promise(r => setTimeout(r, 300));
        }
        
        btn.textContent = 'Downloaded!';
        setTimeout(() => {
          btn.textContent = '📸 Export as Images';
          btn.disabled = false;
        }, 2000);
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