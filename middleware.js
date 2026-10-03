// Vercel Routing Middleware — password gate for /studio.
// Runs on Vercel's servers before the page is sent, so the studio
// can't be seen without the password. The password is NOT in this file:
// set STUDIO_PASSWORD in Vercel → Project → Settings → Environment Variables.
// The browser shows its own sign-in box; any username works.

export const config = { matcher: ['/studio', '/studio/:path*'] };

export default function middleware(request) {
  const want = process.env.STUDIO_PASSWORD;
  const auth = request.headers.get('authorization') || '';
  if (want && auth.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    const password = decoded.slice(decoded.indexOf(':') + 1);
    if (password === want) return;          // let the request through
  }
  return new Response('Password required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Memory Palace Studio", charset="UTF-8"' },
  });
}
