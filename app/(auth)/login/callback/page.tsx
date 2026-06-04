// app/login/callback/page.tsx - REFACTORED WITH DEBUG MODE
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { API_BASE_URL } from "@/utils/env";

function CallbackContent() {
  const searchParams = useSearchParams();

  // Parse URL parameters
  const [code, setCode] = useState<string | null>(searchParams.get("code"));
  const [state, setState] = useState<string | null>(searchParams.get("state"));
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const autoMode = false;

  // UI State
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeResult, setExchangeResult] = useState<{
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    error?: string;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Validation state
  const [stateValid, setStateValid] = useState<boolean | null>(null);
  const savedState =
    typeof window !== "undefined"
      ? sessionStorage.getItem("oauth_state")
      : null;
  const [codeVerifier, setCodeVerifier] = useState<string | null>(null);

  // Thêm useEffect để load từ sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const verifier = sessionStorage.getItem("oauth_code_verifier");
      setCodeVerifier(verifier);
      console.log(
        "🔐 Retrieved code_verifier:",
        verifier ? "Found" : "Not found"
      );
    }
  }, []);

  const [hasOpener, setHasOpener] = useState(false);

  useEffect(() => {
    setHasOpener(!!window.opener);
  }, []);

  /**
   * Countdown timer for code expiration
   */
  useEffect(() => {
    if (timeLeft <= 0 || !code) return;

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, code]);

  /**
   * Validate state and retrieve PKCE code_verifier on mount
   */
  useEffect(() => {
    // Validate state
    if (state && savedState) {
      const isValid = state === savedState;
      setStateValid(isValid);
      console.log("🔐 State validation:", {
        received: state,
        saved: savedState,
        valid: isValid,
      });
    }
  }, [state, savedState]);

  /**
   * Handle OAuth errors from Authorization Server
   */
  useEffect(() => {
    if (error) {
      console.error("❌ OAuth Error from Authorization Server:", error);

      // Notify parent window
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: "oauth_error",
            error: error,
            message: errorDescription || "Authorization failed",
          },
          window.location.origin
        );

        // Close popup after delay
        // setTimeout(() => {
        //   window.close();
        // }, 3000);
      }
    }
  }, [error, errorDescription]);

  /**
   * AUTO MODE: Automatically exchange tokens on mount
   */
  useEffect(() => {
    if (autoMode && code && !error && stateValid !== false && !exchangeResult) {
      console.log("🤖 Auto mode enabled - exchanging tokens automatically...");
      // Wait a bit for state validation to complete
      setTimeout(() => {
        handleExchange();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, code, error, stateValid, exchangeResult]);

  /**
   * Exchange authorization code for tokens
   */

  const handleExchange = async () => {
    if (!code) {
      alert("No authorization code available");
      return;
    }

    if (timeLeft <= 0) {
      alert("Authorization code has expired");
      return;
    }

    // if (stateValid === false) {
    //   alert("State validation failed - possible security issue");
    //   return;
    // }

    setIsExchanging(true);
    setExchangeResult(null);

    // if (!codeVerifier) {
    //   console.error("❌ Code verifier not found in sessionStorage");
    //   setExchangeResult({
    //     success: false,
    //     error: "missing_code_verifier",
    //     message: "PKCE code verifier không tìm thấy. Vui lòng đăng nhập lại.",
    //   });
    //   return;
    // }

    try {
      console.log("🔄 Exchanging authorization code for tokens...");

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          state,
          code_verifier: codeVerifier,
        }),
        // credentials: "include",
      });

      const data = await response.json();
      console.log("Exchange token", data);

      if (!response.ok) {
        // Check if it's an IdP error
        if (data.idpError) {
          // console.error("❌ IdP Error:", data.error, "-", data.message);

          // Map error codes to user-friendly messages
          const errorMessages: Record<string, string> = {
            // ===== OAuth standard errors =====
            unsupported_grant_type:
              "Phương thức xác thực không được hỗ trợ. Vui lòng sử dụng đăng nhập hợp lệ.",

            invalid_client:
              "Thông tin Client không hợp lệ. Vui lòng liên hệ bộ phận hỗ trợ.",

            invalid_grant:
              "Mã xác thực đã hết hạn, không hợp lệ hoặc đã được sử dụng. Vui lòng đăng nhập lại.",

            invalid_request:
              "Yêu cầu xác thực không hợp lệ hoặc thiếu thông tin cần thiết.",

            access_denied: "Xác thực bị từ chối. Vui lòng thử lại.",

            server_error:
              "Hệ thống xác thực đang gặp sự cố. Vui lòng thử lại sau.",

            network_error:
              "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",

            // ===== Internal / detailed grant errors (backend custom) =====
            invalid_client_id:
              "Client ID không hợp lệ. Vui lòng kiểm tra cấu hình ứng dụng.",

            invalid_client_secret:
              "Client Secret không hợp lệ. Vui lòng kiểm tra cấu hình ứng dụng.",

            code_not_found:
              "Authorization Code không tồn tại. Vui lòng đăng nhập lại.",

            code_already_used:
              "Authorization Code đã được sử dụng. Vui lòng đăng nhập lại.",

            code_expired:
              "Authorization Code đã hết hạn. Vui lòng đăng nhập lại.",

            client_id_mismatch: "Client ID không khớp với mã xác thực.",

            redirect_uri_mismatch:
              "Redirect uri không khớp. Vui lòng liên hệ hỗ trợ.",

            state_mismatch: "State không hợp lệ. Vui lòng thử đăng nhập lại.",

            invalid_refresh_token:
              "Refresh token không hợp lệ hoặc đã hết hạn hoặc không khớp client_id",

            refresh_token_is_revoked: "Refresh token đã bị revoke",

            refresh_token_expired: "Refresh token đã hết hạn",

            no_code_verifier_found:
              "Thiếu code_verifier cho authorization code yêu cầu PKCE",

            unsupported_method: "Chỉ hỗ trợ challenge method S256",

            invalid_code_verifier:
              "code_verifier không khớp với code_challenge đã lưu",

            nonce_used: "Nonce đã được sử dụng",

            // ===== Fallback =====
            unknown_error: "Đã xảy ra lỗi không xác định. Vui lòng thử lại.",
          };

          const userMessage =
            errorMessages[data.error as keyof typeof errorMessages] ||
            data.message;

          setExchangeResult({
            success: false,
            error: data.error,
            message: userMessage,
          });

          // throw new Error(userMessage);
          return;
        }

        // Regular error
        setExchangeResult({
          success: false,
          error: data.error || "unknown_error",
          message: data.message || "Token exchange failed",
        });

        return;
      }

      console.log("✅ Token exchange successful:", {
        hasAccessToken: !!data.accessToken,
        hasIdToken: !!data.idToken,
        hasRefreshToken: !!data.refreshToken,
      });

      // Validate ID Token (including nonce)
      if (data.idToken) {
        const isValid = validateIdToken(data.idToken);
        if (!isValid) {
          setExchangeResult({
            success: false,
            error: "id_token_validation_failed",
            message:
              "ID Token validation failed (nonce mismatch or invalid token)",
          });
          return; // ← Dừng execution
        }
        console.log("✅ ID Token validation passed");
      }

      // Store tokens in localstorage
      if (data.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
      }
      if (data.idToken) {
        localStorage.setItem("id_token", data.idToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken);
      }
      if (data.userInfo) {
        localStorage.setItem("user_infor", JSON.stringify(data.userInfo));
      }

      // Clear security tokens
      sessionStorage.removeItem("oauth_state");
      sessionStorage.removeItem("oauth_nonce");
      sessionStorage.removeItem("oauth_code_verifier");

      setExchangeResult({
        success: true,
        data,
      });

      // Notify parent window of success
      if (window.opener && !window.opener.closed) {
        console.log("📤 Sending success message to parent window");
        window.opener.postMessage(
          {
            type: "oauth_success",
          },
          window.location.origin
        );

        // Auto-close popup after 2 seconds in auto mode
        if (autoMode) {
          setTimeout(() => {
            window.close();
          }, 2000);
        }
      }
    } catch (err) {
      console.error("❌ Token exchange failed:", err);

      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";

      // setExchangeResult({
      //   success: false,
      //   error: errorMessage,
      // });

      // Notify parent window of error
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: "oauth_error",
            error: "token_exchange_failed",
            message: errorMessage,
          },
          window.location.origin
        );
      }
    } finally {
      setIsExchanging(false);
    }
  };

  /**
   * Validate ID Token (including nonce)
   */
  const validateIdToken = (idToken: string): boolean => {
    try {
      // Decode JWT payload
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        console.error("❌ Invalid JWT format");
        return false;
      }

      const payloadBase64 = parts[1];
      const payload = JSON.parse(atob(payloadBase64));

      console.log("🔍 Validating ID Token:", payload);

      // 1. Validate nonce (Replay Protection)
      const savedNonce = sessionStorage.getItem("oauth_nonce");
      if (payload.nonce !== savedNonce) {
        console.error("❌ Nonce mismatch!", {
          received: payload.nonce,
          expected: savedNonce,
        });
        return false;
      }
      console.log("✅ Nonce validation passed");

      // 2. Validate expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.error("❌ ID Token expired");
        return false;
      }
      console.log("✅ Expiration validation passed");

      // 3. Validate audience
      const clientId = process.env.NEXT_PUBLIC_OAUTH_WIFAKEY_CLIENT_ID;
      if (clientId && payload.aud !== clientId) {
        console.error("❌ Invalid audience", {
          received: payload.aud,
          expected: clientId,
        });
        return false;
      }
      console.log("✅ Audience validation passed");

      // 4. Validate issuer (optional)
      const expectedIssuer = process.env.NEXT_PUBLIC_OAUTH_ISSUER;
      if (expectedIssuer && payload.iss !== expectedIssuer) {
        console.error("❌ Invalid issuer");
        return false;
      }
      console.log("✅ Issuer validation passed");

      return true;
    } catch (error) {
      console.error("❌ ID Token validation error:", error);
      return false;
    }
  };

  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  /**
   * Copy to clipboard
   */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  /**
   * Decode JWT for display
   */
  const decodeJWT = (token: string) => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch {
      return null;
    }
  };

  // ========================================================================
  // RENDER: OAuth Error from Authorization Server
  // ========================================================================
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-2xl border-t-4 border-t-red-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              OAuth Error
            </CardTitle>
            <CardDescription>The authorization request failed</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold">{error}</AlertTitle>
              <AlertDescription className="mt-2">
                {errorDescription || "No description provided"}
              </AlertDescription>
            </Alert>

            <div className="mt-4 p-4 bg-slate-100 rounded-md">
              <h4 className="text-sm font-semibold mb-2">Debug Information</h4>
              <dl className="space-y-1 text-sm font-mono">
                <div className="flex gap-2">
                  <dt className="text-gray-600">Error Code:</dt>
                  <dd className="font-semibold text-red-600">{error}</dd>
                </div>
                {state && (
                  <div className="flex gap-2">
                    <dt className="text-gray-600">State:</dt>
                    <dd className="break-all">{state}</dd>
                  </div>
                )}
              </dl>
            </div>

            {window.opener && (
              <p className="text-sm text-gray-600 mt-4">
                Redirecting you back... This window will close in 3 seconds.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => window.close()}>
              Close Window
            </Button>
            <Button onClick={() => (window.location.href = "/login")}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ========================================================================
  // RENDER: No Authorization Code
  // ========================================================================
  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Authorization Code</CardTitle>
            <CardDescription>
              This page should be accessed via OAuth redirect
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No authorization code was found in the URL. Please start the
                OAuth flow from the login page.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => (window.location.href = "/login")}
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ========================================================================
  // RENDER: Main Debug UI (Before Exchange)
  // ========================================================================
  if (!exchangeResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-2xl border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              OAuth Callback Debug
              {autoMode && (
                <Badge variant="secondary" className="ml-2">
                  Auto Mode
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Authorization code received. Review details and exchange for
              tokens.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* State Validation Status */}
            {state && (
              <Alert
                className={
                  stateValid
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                }
              >
                {stateValid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">
                      State Validated ✓
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                      CSRF protection check passed
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    {/* <XCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-800">
                      State Mismatch
                    </AlertTitle>
                    <AlertDescription className="text-red-700">
                      Security validation failed - this could be a CSRF attack
                    </AlertDescription> */}
                  </>
                )}
              </Alert>
            )}

            {/* Authorization Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-2">
                Authorization Code
                <Badge variant="secondary" className="text-xs">
                  {code.length} chars
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={code ?? ""}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono text-xs bg-slate-100"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(code, "code")}
                >
                  {copied === "code" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Code Verifier (PKCE) */}
            <div className="space-y-2">
              <Label htmlFor="codeVerifier" className="flex items-center gap-2">
                Code Verifier
                <Badge variant="secondary" className="text-xs">
                  PKCE
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="codeVerifier"
                  value={codeVerifier ?? ""}
                  onChange={(e) => setCodeVerifier(e.target.value)}
                  className="font-mono text-xs bg-slate-100"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      sessionStorage.getItem("oauth_code_verifier") || "",
                      "code_verifier"
                    )
                  }
                >
                  {copied === "code_verifier" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Code Expiration Timer */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Code Expiration Time
              </Label>
              <div
                className={`flex h-12 w-full items-center justify-center rounded-md border px-3 py-2 text-lg font-mono font-bold shadow-sm transition-colors ${timeLeft === 0
                  ? "border-red-500 bg-red-50 text-red-600 animate-pulse"
                  : timeLeft < 60
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-green-500 bg-green-50 text-green-600"
                  }`}
              >
                {timeLeft > 0 ? formatTime(timeLeft) : "EXPIRED"}
              </div>
            </div>

            {/* State Parameter */}
            {state && (
              <div className="space-y-2">
                <Label htmlFor="state">State Parameter</Label>
                <div className="flex gap-2">
                  <Input
                    id="state"
                    value={state ?? ""}
                    className="font-mono text-xs bg-slate-100"
                    onChange={(e) => setState(e.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(state, "state")}
                  >
                    {copied === "state" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Auto Mode Info */}
            {autoMode && isExchanging && (
              <Alert className="border-blue-500 bg-blue-50">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertTitle className="text-blue-800">
                  Auto Exchange in Progress...
                </AlertTitle>
                <AlertDescription className="text-blue-700">
                  Tokens are being exchanged automatically. Please wait...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleExchange}
              disabled={isExchanging || timeLeft <= 0}
            >
              {isExchanging ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exchanging...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Exchange for Tokens
                </>
              )}
            </Button>
            {hasOpener && (
              <Button variant="outline" onClick={() => window.close()}>
                Close
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ========================================================================
  // RENDER: Success State (After Exchange)
  // ========================================================================
  return (
    <Card
      className={`w-full max-w-2xl border-t-4 ${exchangeResult.success ? "border-t-green-600" : "border-t-red-600"
        }`}
    >
      <CardHeader>
        <CardTitle
          className={`flex items-center gap-2 ${exchangeResult.success ? "text-green-600" : "text-red-600"
            }`}
        >
          {exchangeResult.success ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}

          {exchangeResult.success
            ? "Token Exchange Successful!"
            : "Token Exchange Failed"}
        </CardTitle>
        <CardDescription>
          {exchangeResult.success
            ? window.opener && autoMode
              ? "This window will close automatically."
              : "Tokens have been obtained and stored."
            : "An error occurred during token exchange."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!exchangeResult.success && (
          <Alert className="border-red-500 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">
              {exchangeResult.error}
            </AlertTitle>
            {exchangeResult.message && (
              <AlertDescription className="text-red-700">
                Messgae: {exchangeResult.message}
              </AlertDescription>
            )}
          </Alert>
        )}

        {/* Token Details (Only on Success) */}
        {exchangeResult.success && exchangeResult.data && (
          <>
            {/* Authorization Code Info */}
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-2">
                Authorization Code (Used)
                <Badge variant="secondary" className="text-xs">
                  {code.length} chars
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={code ?? ""}
                  readOnly
                  className="font-mono text-xs bg-slate-100"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(code, "code")}
                >
                  {copied === "code" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Token Details (Expandable) */}
            <div className="space-y-2">
              {/* Access Token */}
              {exchangeResult.data.accessToken && (
                <details className="bg-white p-3 rounded border">
                  <summary className="cursor-pointer font-semibold text-sm">
                    Access Token (
                    {exchangeResult.data.accessToken.substring(0, 20)}...)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="bg-slate-100 p-2 rounded overflow-auto max-h-32">
                      <code className="text-xs break-all">
                        {exchangeResult.data.accessToken}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          exchangeResult.data.accessToken,
                          "access_token"
                        )
                      }
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </details>
              )}

              {/* ID Token */}
              {exchangeResult.data.idToken && (
                <details className="bg-white p-3 rounded border">
                  <summary className="cursor-pointer font-semibold text-sm">
                    ID Token (JWT) - Decoded Payload
                  </summary>
                  <div className="mt-2 space-y-2">
                    <pre className="bg-slate-100 p-3 rounded overflow-auto max-h-48 text-xs">
                      {JSON.stringify(
                        decodeJWT(exchangeResult.data.idToken),
                        null,
                        2
                      )}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(exchangeResult.data.idToken, "id_token")
                      }
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Token
                    </Button>
                  </div>
                </details>
              )}

              {/* Refresh Token */}
              {exchangeResult.data.refreshToken && (
                <details className="bg-white p-3 rounded border">
                  <summary className="cursor-pointer font-semibold text-sm">
                    Refresh Token
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="bg-slate-100 p-2 rounded overflow-auto max-h-32">
                      <code className="text-xs break-all">
                        {exchangeResult.data.refreshToken}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          exchangeResult.data.refreshToken,
                          "refresh_token"
                        )
                      }
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </details>
              )}

              {/* Token Metadata */}
              <div className="bg-white p-3 rounded border text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Token Type:</span>
                    <span className="ml-2 font-semibold">
                      {exchangeResult.data.tokenType || "Bearer"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Expires In:</span>
                    <span className="ml-2 font-semibold">
                      {exchangeResult.data.expiresIn}s
                    </span>
                  </div>
                  {exchangeResult.data.scope && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Scope:</span>
                      <span className="ml-2 font-semibold">
                        {exchangeResult.data.scope}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {exchangeResult.success ? (
          <>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/login")}
            >
              Login Again
            </Button>
            {window.opener && (
              <Button variant="outline" onClick={() => window.close()}>
                Close
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              className="flex-1"
              onClick={() => (window.location.href = "/login")}
            >
              Try Again
            </Button>
            {window.opener && (
              <Button variant="outline" onClick={() => window.close()}>
                Close
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
