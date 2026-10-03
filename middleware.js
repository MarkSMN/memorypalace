// Vercel Routing Middleware — password gate for /studio.
// Runs on Vercel's servers before the page is sent, so the studio can't be
// seen without the password. The password is NOT in this file: it's the
// STUDIO_PASSWORD environment variable (Vercel → Project → Settings).
//
// No password yet → a one-field password page (same look as the game).
// Right password  → a 30-day cookie holding a hash of it (never the password),
//                   then straight into the studio.

export const config = { matcher: ['/studio', '/studio/:path*'] };

const COOKIE = 'mp_studio';

async function token(pw) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('memory-palace-studio:' + pw));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function middleware(request) {
  const want = process.env.STUDIO_PASSWORD;
  if (!want) return new Response('The studio is closed.', { status: 503 });
  const good = await token(want);

  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([a-f0-9]+)'));
  if (m && m[1] === good) return;                       // signed in: let it through

  if (request.method === 'POST') {
    const form = await request.formData();
    if (String(form.get('password') || '') === want) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/studio/',
          'Set-Cookie': `${COOKIE}=${good}; Path=/studio; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }
    return page(true);
  }
  return page(false);
}

function page(wrong) {
  // Same frame as the game: title at the top, footer at the bottom, and one
  // password box (styled like the site's buttons) floating alone in the middle.
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Memory Palace · Studio</title>
<link rel="icon" type="image/png" href="/favicon.png">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{background:#fff;color:#1d1726;display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
  header{padding:22px 0 0;text-align:center}
  header a{color:inherit;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
  main{flex:1;display:flex;align-items:center;justify-content:center}
  input{width:190px;font:inherit;font-size:12px;color:#1d1726;text-align:center;letter-spacing:.08em;
    border:1px solid #e4e0ea;background:#fff;border-radius:7px;padding:7px 13px;outline:none}
  input::placeholder{color:#8a8494;letter-spacing:0}
  input:hover,input:focus{border-color:#c47a45}
  input.wrong{border-color:#c47a45;animation:no .36s}
  @keyframes no{20%{transform:translateX(-5px)}45%{transform:translateX(4px)}70%{transform:translateX(-2px)}}
  footer{padding:0 0 18px;text-align:center;font-size:11px;color:#8a8494}
  @media (max-width:760px){header{padding-top:12px}footer{padding-bottom:12px}}
</style></head><body>
<header><a href="/">Memory Palace</a></header>
<main><form method="post" action="/studio/">
  <input class="${wrong ? 'wrong' : ''}" type="password" name="password" placeholder="Password"
    aria-label="Password" autocomplete="current-password" autofocus required>
</form></main>
<footer>&copy; Mark Schoening 2026</footer>
</body></html>`, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
