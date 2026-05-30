// Master HTML wrapper for all MyMathsHero emails.
// Brand: navy #1B2B4B, gold #C49A1A.

export function baseTemplate({ title, previewText, content, footerText }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'MyMathsHero'}</title>
  ${previewText ? `<meta name="description" content="${previewText}">` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #F0F4F8;
      color: #1B2B4B;
    }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header {
      background-color: #1B2B4B;
      border-radius: 16px 16px 0 0;
      padding: 32px 40px;
      text-align: center;
    }
    .header-logo { font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.5px; }
    .header-logo span { color: #C49A1A; }
    .header-tagline { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 4px; }
    .gold-bar { height: 4px; background: linear-gradient(90deg, #C49A1A, #F0C040, #C49A1A); }
    .body { background: white; padding: 40px; }
    .footer {
      background-color: #1B2B4B;
      border-radius: 0 0 16px 16px;
      padding: 24px 40px;
      text-align: center;
    }
    .footer p { color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.6; }
    .footer a { color: #C49A1A; text-decoration: none; }
    h1 { font-size: 24px; font-weight: 800; color: #1B2B4B; margin-bottom: 16px; }
    h2 { font-size: 18px; font-weight: 700; color: #1B2B4B; margin-bottom: 12px; margin-top: 24px; }
    p { font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 16px; }
    .btn {
      display: inline-block;
      background-color: #1B2B4B;
      color: white !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
      border: 2px solid #C49A1A;
      margin: 8px 0;
    }
    .btn-gold { background-color: #C49A1A; border-color: #C49A1A; }
    .stat-card {
      background: #F0F4F8;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 12px;
      border-left: 4px solid #C49A1A;
    }
    .stat-card .label {
      font-size: 12px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .stat-card .value { font-size: 22px; font-weight: 800; color: #1B2B4B; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .divider { height: 1px; background: #E2E8F0; margin: 24px 0; }
    .highlight-box {
      background: #FFFBEB;
      border: 1px solid #C49A1A;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .badge {
      display: inline-block;
      background: #1B2B4B;
      color: #C49A1A;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>` : ''}
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">MyMaths<span>Hero</span></div>
      <div class="header-tagline">Personalised AI Maths Learning</div>
    </div>
    <div class="gold-bar"></div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>${footerText || `© ${new Date().getFullYear()} MyMathsHero. All rights reserved.`}</p>
      <p style="margin-top: 8px;">
        <a href="https://mymathshero.com.au">mymathshero.com.au</a> ·
        <a href="mailto:hello@mymathshero.com.au">hello@mymathshero.com.au</a>
      </p>
      <p style="margin-top: 8px;">Melbourne, Australia</p>
    </div>
  </div>
</body>
</html>`
}
