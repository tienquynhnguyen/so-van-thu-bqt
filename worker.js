/**
 * Cloudflare Worker (Static Assets) — điểm vào chính.
 * - Đường dẫn /api : proxy sang Google Apps Script, URL thật giữ bí mật
 *   trong biến môi trường GAS_URL (khai báo ở Dashboard, không nằm trong repo).
 * - Mọi đường dẫn khác: trả về file tĩnh (index.html, ...) như bình thường
 *   thông qua binding ASSETS đã khai báo trong wrangler.jsonc.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api') {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env) {
  if (request.method === 'GET') {
    return json({ ok: true, data: 'Proxy /api đang hoạt động.' });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Phương thức không được hỗ trợ.' }, 405);
  }

  if (!env.GAS_URL) {
    return json({ ok: false, error: 'Chưa cấu hình biến môi trường GAS_URL trên Cloudflare.' }, 500);
  }

  let bodyText;
  try {
    bodyText = await request.text();
  } catch (e) {
    return json({ ok: false, error: 'Không đọc được nội dung yêu cầu.' }, 400);
  }

  try {
    const gasRes = await fetch(env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: bodyText
    });
    const text = await gasRes.text();
    return new Response(text, {
      status: 200, // luôn 200 ở tầng proxy; lỗi nghiệp vụ nằm trong field "ok" của JSON
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (err) {
    return json({ ok: false, error: 'Không kết nối được tới máy chủ xử lý (Apps Script). Vui lòng thử lại.' }, 502);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
