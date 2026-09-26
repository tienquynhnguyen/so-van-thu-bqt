/**
 * Cloudflare Pages Function — đóng vai trò proxy trung gian.
 * Trình duyệt chỉ gọi /api (cùng domain với trang web), không bao giờ
 * thấy URL thật của Google Apps Script.
 *
 * URL thật được đọc từ biến môi trường GAS_URL, cấu hình trong:
 * Cloudflare Dashboard → Pages project → Settings → Environment variables
 * (đặt dạng "Secret" để không ai xem lại được giá trị sau khi lưu).
 *
 * File này TỰ ĐỘNG có hiệu lực khi nằm trong thư mục functions/ ngay
 * cạnh index.html lúc deploy — không cần cấu hình route gì thêm.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GAS_URL) {
    return json({ ok: false, error: 'Chưa cấu hình biến môi trường GAS_URL trên Cloudflare Pages.' }, 500);
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
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return json({ ok: false, error: 'Không kết nối được tới máy chủ xử lý (Apps Script). Vui lòng thử lại.' }, 502);
  }
}

// Cho phép kiểm tra nhanh proxy còn sống hay không: GET /api
export async function onRequestGet() {
  return json({ ok: true, data: 'Proxy /api đang hoạt động.' });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
