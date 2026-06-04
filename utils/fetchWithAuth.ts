import { API_BASE_URL } from "./env";

/**
 * Custom fetch wrapper to handle automatic token refresh when receiving a 401 Unauthorized response.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // 1. Kiểm tra xem Access Token đã hết hạn chưa (dựa trên thông tin lưu ở LocalStorage)
  const expiresAtStr = localStorage.getItem("access_token_expires_at");
  if (expiresAtStr) {
    const expiresAt = parseInt(expiresAtStr, 10);
    // Buffer 5s để đảm bảo token không hết hạn giữa chừng
    if (Date.now() >= expiresAt - 5000) {
      console.warn("⚠️ Access Token đã hết hạn trên Frontend, tiến hành tự động Refresh Token...");
      return await performRefreshTokenAndRetry(url, options);
    }
  }

  // 2. Lấy token hiện tại (Dùng id_token vì backend hiện tại dùng JwtStrategy)
  const token = localStorage.getItem("id_token");

  // Đảm bảo header được khởi tạo
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Bỏ qua cảnh báo ngrok nếu dùng ngrok
  headers.set("ngrok-skip-browser-warning", "true");

  const response = await fetch(url, { ...options, headers });

  // 3. Nếu không lỗi 401 thì trả về bình thường
  if (response.status !== 401) {
    return response;
  }

  console.warn("⚠️ API trả về 401 Unauthorized, tiến hành tự động Refresh Token...");
  return await performRefreshTokenAndRetry(url, options);
}

/**
 * Hàm phụ trợ thực hiện Refresh Token và gọi lại API
 */
async function performRefreshTokenAndRetry(url: string, options: RequestInit = {}): Promise<Response> {
  const refreshToken = localStorage.getItem("refresh_token");
  
  if (!refreshToken) {
    console.error("❌ Không có Refresh Token. Buộc đăng xuất.");
    forceLogout();
    throw new Error("Phiên đăng nhập hết hạn, không có refresh token.");
  }

  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" 
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await refreshResponse.json();

    if (refreshResponse.ok && !data.idpError) {
      console.log("✅ Refresh Token thành công!");
      
      // Lưu token mới
      if (data.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
        if (data.expiresIn) {
          const expiresAt = Date.now() + data.expiresIn * 1000;
          localStorage.setItem("access_token_expires_at", expiresAt.toString());
          localStorage.setItem("access_token_expires_in", data.expiresIn.toString());
        }
      }
      
      if (data.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken);
      }
      
      let tokenToUse = localStorage.getItem("id_token");

      // 4. Cập nhật header và gọi lại API gốc
      const headers = new Headers(options.headers || {});
      if (tokenToUse) {
        headers.set("Authorization", `Bearer ${tokenToUse}`);
      }
      headers.set("ngrok-skip-browser-warning", "true");
      
      return await fetch(url, { ...options, headers });
      
    } else {
      console.error("❌ Refresh Token thất bại (có thể đã hết hạn hoặc bị thu hồi).");
      forceLogout();
      throw new Error("Refresh token thất bại");
    }
  } catch (error) {
    console.error("❌ Lỗi mạng khi gọi Refresh Token.", error);
    forceLogout();
    throw error;
  }
}

// Xoá session và chuyển hướng về đăng nhập
function forceLogout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("id_token");
  localStorage.removeItem("access_token_expires_at");
  localStorage.removeItem("access_token_expires_in");
  localStorage.removeItem("user_infor");
  
  // Chuyển hướng người dùng (nếu đang ở môi trường trình duyệt)
  if (typeof window !== "undefined") {
    // Có thể dùng window.location để redirect về /login nếu muốn:
    // window.location.href = "/login?session_expired=true";
    alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    window.location.href = "/login";
  }
}
