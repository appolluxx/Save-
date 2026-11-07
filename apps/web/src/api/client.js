/**
 * SaveRaks frontend API client.
 *
 * Credentials are sent automatically for HTTP-only cookie authentication.
 * Responses are parsed centrally and returned as structured errors.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function request(endpoint, options = {}) {
  const url = BASE_URL + endpoint;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (cause) {
    const error = new Error(
      'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า API กำลังทำงานแล้วลองอีกครั้ง',
    );
    error.code = cause?.name === 'AbortError' ? 'REQUEST_ABORTED' : 'NETWORK_ERROR';
    error.cause = cause;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      (response.status >= 500
        ? 'เซิร์ฟเวอร์ยังไม่พร้อมใช้งาน กรุณาตรวจสอบ API และฐานข้อมูลแล้วลองอีกครั้ง'
        : 'คำขอไม่สำเร็จ (รหัส ' + response.status + ')');
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    error.details = data?.error?.details || null;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  upload: (endpoint, formData, options) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    }),
};
