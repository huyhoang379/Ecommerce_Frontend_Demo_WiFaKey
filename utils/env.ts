export const API_BASE_URL =
  "http://localhost:8000";

export const FRONTEND_BASE_URL =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "http://localhost:3001";

export const OAUTH_LOGIN_URL =
  process.env.NEXT_PUBLIC_OAUTH_WIFAKEY_URL ||
  "http://localhost:3000/oauth/signin";
