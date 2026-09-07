// functions/_middleware.js
// Cloudflare Pages Function – блокирует голые HTTP-клиенты (requests, curl,
// wget, urllib, aiohttp, scrapy и т.п.) ещё до Managed Challenge, и запускает
// сам challenge для всего остального нераспознанного трафика.

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();

  // 1) Пропускаем статику без проверок
  const staticExt = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|mp3)($|\?)/;
  if (staticExt.test(pathname)) {
    return await context.next();
  }

  const ua = (request.headers.get('User-Agent') || '').toLowerCase();

  // 2) Явные сигнатуры библиотек/утилит, которыми обычно ходят скрипты.
  //    requests, urllib, http.client и т.п. подставляют свой User-Agent
  //    по умолчанию, если его не переопределить вручную.
  const botUaPatterns = [
    'python-requests',
    'python-urllib',
    'python-httpx',
    'httpx',
    'aiohttp',
    'curl/',
    'wget/',
    'go-http-client',
    'okhttp',
    'libwww-perl',
    'scrapy',
    'node-fetch',
    'axios/',
    'java/',
    'apache-httpclient',
    'postmanruntime',
    'insomnia',
  ];
  if (botUaPatterns.some((p) => ua.includes(p))) {
    return new Response('Forbidden', { status: 403 });
  }
  // 3) Пустой/отсутствующий User-Agent — почти всегда голый HTTP-клиент,
  //    ни один настоящий браузер так не делает.
  if (!ua) {
    return new Response('Forbidden', { status: 403 });
  }
  // 4) Заголовки, которые ставит браузер и которые `requests`/`curl` не
  //    отправляют без явной ручной настройки. Отсутствие сразу нескольких —
  //    сильный сигнал скрипта, а не человека за браузером.
  const hasAcceptLanguage = request.headers.has('Accept-Language');
  const hasSecFetchSite = request.headers.has('Sec-Fetch-Site');
  const hasSecChUa = request.headers.has('Sec-Ch-Ua');
  const looksLikeBrowser =
    [hasAcceptLanguage, hasSecFetchSite, hasSecChUa].filter(Boolean).length >= 2;
  if (!looksLikeBrowser) {
    return new Response('Forbidden', { status: 403 });
  }
  // 5) Уже прошли Managed Challenge — пропускаем дальше
  const cookieHeader = request.headers.get('Cookie') || '';
  if (cookieHeader.includes('cf_chl_')) {
    return await context.next();
  }
  // 6) Всё остальное — на Managed Challenge Cloudflare (403 без тела,
  //    Cloudflare сам подставит JS-челлендж на своём уровне).
  return new Response(null, { status: 403 });
}