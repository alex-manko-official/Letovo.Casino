// functions/_middleware.js
// Cloudflare Pages Function – middleware implementing Managed Challenge
// for all requests except static assets.

export async function onRequest(context) {
  const { request } = context;

  // 1️⃣ Exclude static assets (including audio files)
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();

  const staticExt = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|mp3|wav|ogg|aac)($|\?)/;
  if (staticExt.test(pathname)) {
    return await context.next();
  }

  // 2️⃣ If request already has cf_chl_ cookie, skip challenge
  const cookieHeader = request.headers.get('Cookie') || '';
  if (cookieHeader.includes('cf_chl_')) {
    return await context.next();
  }

  // 3️⃣ Otherwise return 403 without body – Cloudflare will inject its JS challenge
  return new Response(null, { status: 403 });
}
