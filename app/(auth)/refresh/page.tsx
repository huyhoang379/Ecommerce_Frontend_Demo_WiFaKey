"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  ArrowRight,
  Clock,
  ShieldCheck,
  FileJson,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/env";

// Định nghĩa kiểu cho dữ liệu trong Token
interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const RefreshTokenPage = () => {
  const [refreshToken, setRefreshToken] = useState("");
  const [oldAccessToken, setOldAccessToken] = useState("");
  const [oldExpiresAt, setOldExpiresAt] = useState<number | null>(null);
  const [newAccessToken, setNewAccessToken] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Load Token từ LocalStorage
  useEffect(() => {
    setOldAccessToken(localStorage.getItem("access_token") || "");
    const exp = localStorage.getItem("access_token_expires_at");
    if (exp) setOldExpiresAt(Number(exp));
    setRefreshToken(localStorage.getItem("refresh_token") || "");
  }, []);

  // 2. Xử lý Refresh
  const handleRefreshToken = async () => {
    setLoading(true);
    setNewAccessToken(""); // Reset để tạo hiệu ứng loading

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", 'ngrok-skip-browser-warning': 'true', },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      console.log(data);

      if (!data.idpError) {
        setNewAccessToken(data.accessToken);
        localStorage.setItem("access_token", data.accessToken);

        if (data.expiresIn) {
          const expiresAt = Date.now() + data.expiresIn * 1000;
          localStorage.setItem("access_token_expires_at", expiresAt.toString());
          setNewExpiresAt(expiresAt);
        }

        toast.success("Nhận Access Token thành công");

        // Nếu server trả về cả refresh token mới (Rotation)
        if (data.refreshToken) {
          localStorage.setItem("refresh_token", data.refreshToken);
          setRefreshToken(data.refreshToken);
        }
      } else {
        toast.error("Nhận Access Token thất bại", {
          description: data.message || "Unknown error",
        });
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối đến Server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center p-4 bg-slate-50 min-h-screen">
      <Card className="w-full max-w-5xl shadow-lg border-t-4 border-t-blue-600">
        <CardHeader className="bg-white pb-6">
          <CardTitle className="flex items-center gap-2 text-xl">
            <RefreshCw className="h-6 w-6 text-blue-600" />
            Token Refresh Inspector
          </CardTitle>
          <CardDescription>
            So sánh chi tiết Access Token trước và sau khi Refresh
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* INPUT SECTION */}
          <div className="flex flex-col md:flex-row items-end gap-4 p-4 bg-slate-100/50 rounded-lg border">
            <div className="grid w-full gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Current Refresh Token
              </Label>
              <Input
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="font-mono text-xs bg-white"
                placeholder="Paste Refresh Token here..."
              />
            </div>
            <Button
              onClick={handleRefreshToken}
              disabled={loading || !refreshToken}
              className="min-w-[150px] bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Refreshing..." : "Get New Token"}
            </Button>
          </div>

          {/* COMPARISON GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* --- OLD TOKEN COLUMN --- */}
            <TokenDetailViewer
              token={oldAccessToken}
              title="OLD Access Token"
              type="old"
              expiresAt={oldExpiresAt}
            />

            {/* Mũi tên chuyển đổi (chỉ hiện desktop) */}
            <div className="hidden md:flex absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-10 bg-white border rounded-full p-2 shadow-sm text-slate-400">
              <ArrowRight className="h-6 w-6" />
            </div>

            {/* --- NEW TOKEN COLUMN --- */}
            <TokenDetailViewer
              token={newAccessToken}
              title="NEW Access Token"
              type="new"
              expiresAt={newExpiresAt}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- COMPONENT CON: HIỂN THỊ CHI TIẾT 1 TOKEN ---
const TokenDetailViewer = ({
  token,
  title,
  type,
  expiresAt,
}: {
  token: string;
  title: string;
  type: "old" | "new";
  expiresAt?: number | null;
}) => {
  if (!token) {
    return (
      <div
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 min-h-[400px] ${type === "new"
          ? "bg-green-50/30 border-green-200"
          : "bg-slate-50 border-slate-200"
          }`}
      >
        <ShieldCheck className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm font-medium">Waiting for data...</p>
      </div>
    );
  }

  let decoded: JwtPayload | null = null;
  let isExpired = false;
  let timeStr = "";

  // Format Date Helper
  const fmtDate = (ts?: number) =>
    ts ? new Date(ts * 1000).toLocaleString("vi-VN") : "N/A";

  try {
    decoded = jwtDecode<JwtPayload>(token);
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now() / 1000;
    if (decoded.exp) {
      isExpired = decoded.exp < now;
      const diff = Math.floor(Math.abs(decoded.exp - now));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      timeStr = isExpired ? `${m}p ${s}s trước` : `còn ${m}p ${s}s`;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // Nếu không decode được -> Đây là Opaque Token
    // let timeStrOpaque = "";
    // let isExpiredOpaque = false;
    // if (expiresAt) {
    //   const now = Date.now();
    //   isExpiredOpaque = expiresAt < now;
    //   const diff = Math.floor(Math.abs(expiresAt - now) / 1000);
    //   const m = Math.floor(diff / 60);
    //   const s = diff % 60;
    //   timeStrOpaque = isExpiredOpaque ? `${m}p ${s}s trước` : `còn ${m}p ${s}s`;
    // }

    // return (
    //   <div
    //     className={`border rounded-xl flex flex-col overflow-hidden transition-all duration-500 ${isExpiredOpaque ? "bg-red-950/20 border-red-900/50" : "bg-slate-800 border-slate-700"
    //       }`}
    //   >
    //     <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
    //       <h3 className="font-bold text-sm text-slate-200">{title}</h3>
    //       <div className="flex gap-2 items-center">
    //         {expiresAt && (
    //           <span className={`text-[10px] font-bold ${isExpiredOpaque ? 'text-red-400' : 'text-green-400'}`}>
    //             {isExpiredOpaque ? "EXPIRED" : "VALID"} ({timeStrOpaque})
    //           </span>
    //         )}
    //         <Badge className="bg-purple-600 hover:bg-purple-700 text-[10px] px-2 py-0.5 h-5">
    //           OPAQUE TOKEN
    //         </Badge>
    //       </div>
    //     </div>
    //     <div className="p-4 flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[250px] space-y-4">
    //       <ShieldCheck className="w-12 h-12 text-purple-400/50" />
    //       <p className="text-sm font-medium text-center">
    //         Token mã hoá một chiều (Opaque).<br />
    //         Không chứa payload có thể giải mã.
    //       </p>
    //       {expiresAt && (
    //         <div className="mt-2 text-xs flex flex-col items-center gap-1 border border-white/5 bg-black/20 p-2 rounded w-full">
    //           <span className="text-slate-500 font-bold uppercase text-[10px]">Expiration</span>
    //           <span className="font-mono text-slate-300">{new Date(expiresAt).toLocaleString("vi-VN")}</span>
    //         </div>
    //       )}
    //     </div>
    //     <div className="bg-black/20 p-2 text-center border-t border-white/5">
    //       <details className="text-[10px] text-slate-400 cursor-pointer group">
    //         <summary className="group-hover:text-purple-400 font-medium transition-colors">
    //           Show Raw Token
    //         </summary>
    //         <p className="mt-2 text-[9px] font-mono break-all text-left bg-slate-900 p-2 rounded border border-white/10 text-slate-300">
    //           {token}
    //         </p>
    //       </details>
    //     </div>
    //   </div>
    // );
    return <OpaqueTokenViewer token={token} title={title} expiresAt={expiresAt} />;
  }

  // Style dynamic theo loại token
  const containerStyle =
    type === "old"
      ? isExpired
        ? "border-red-200 bg-red-50/50"
        : "border-slate-200 bg-slate-50"
      : "border-green-300 bg-green-50 shadow-md ring-1 ring-green-100";

  return (
    <div
      className={`border rounded-xl flex flex-col overflow-hidden transition-all duration-500 ${containerStyle}`}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/50">
        <h3
          className={`font-bold text-sm ${type === "new" ? "text-green-700" : "text-slate-700"
            }`}
        >
          {title}
        </h3>
        {isExpired ? (
          <Badge variant="destructive" className="text-[10px] px-2 py-0.5 h-5">
            EXPIRED
          </Badge>
        ) : (
          <Badge className="bg-green-600 hover:bg-green-700 text-[10px] px-2 py-0.5 h-5">
            VALID
          </Badge>
        )}
      </div>

      {/* CONTENT TABS */}
      <div className="p-4 flex-1">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 mb-4 bg-black/5">
            <TabsTrigger value="overview" className="text-xs h-6">
              Overview
            </TabsTrigger>
            <TabsTrigger value="payload" className="text-xs h-6">
              Full Payload
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW (Thông tin quan trọng) */}
          <TabsContent value="overview" className="space-y-4">
            {/* Thời gian */}
            <div className="bg-white rounded-lg p-3 border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Expiration
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-mono font-bold text-slate-800">
                  {fmtDate(decoded?.exp)}
                </span>
                <span
                  className={`text-[10px] font-bold ${isExpired ? "text-red-500" : "text-green-600"
                    }`}
                >
                  ({timeStr})
                </span>
              </div>
            </div>

            {/* Thông tin User cơ bản */}
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <User className="w-3 h-3" /> User ID (Subject)
                </Label>
                <div className="mt-1 font-mono text-xs bg-white p-2 rounded border border-black/5 break-all">
                  {decoded?.sub || decoded?.id}
                </div>
              </div>
              {decoded?.email && (
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase">
                    Email
                  </Label>
                  <div className="mt-1 font-mono text-xs bg-white p-2 rounded border border-black/5 break-all">
                    {decoded.email}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: RAW PAYLOAD (JSON đầy đủ) */}
          <TabsContent value="payload">
            <div className="rounded-lg border bg-slate-900 text-slate-50 p-3 overflow-hidden">
              <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-2">
                <FileJson className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Decoded JSON
                </span>
              </div>
              <div className="relative">
                <pre className="text-[10px] font-mono leading-relaxed max-h-[250px] overflow-y-auto custom-scrollbar">
                  {JSON.stringify(decoded, null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* FOOTER: Raw Token String */}
      <div className="bg-black/5 p-2 text-center border-t border-black/5">
        <details className="text-[10px] text-slate-500 cursor-pointer group">
          <summary className="group-hover:text-blue-600 font-medium transition-colors">
            Show Raw Encoded Token
          </summary>
          <p className="mt-2 text-[9px] font-mono break-all text-left bg-white p-2 rounded border border-black/10">
            {token}
          </p>
        </details>
      </div>
    </div>
  );
};

export default RefreshTokenPage;

const OpaqueTokenViewer = ({
  token,
  title,
  expiresAt,
}: {
  token: string;
  title: string;
  expiresAt?: number | null;
}) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  useEffect(() => {
    if (!expiresAt) return;

    // Đọc expires_in từ localstorage nếu có, mặc định 300s
    const expiresInSec = Number(localStorage.getItem("access_token_expires_in")) || 300;
    const totalDurationMs = expiresInSec * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = expiresAt - now;
      if (remainingMs <= 0) {
        setTimeLeft("Đã hết hạn");
        setProgress(100);
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const remainingSec = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(remainingSec / 60);
        const seconds = remainingSec % 60;
        setTimeLeft(`${minutes} phút ${seconds} giây`);
        setIsExpired(false);
        const percent = ((totalDurationMs - remainingMs) / totalDurationMs) * 100;
        setProgress(percent);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return (
    <div
      className={`border rounded-xl flex flex-col overflow-hidden transition-all duration-500 ${isExpired ? "bg-red-950/20 border-red-900/50" : "bg-slate-800 border-slate-700"
        }`}
    >
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
        <h3 className="font-bold text-sm text-slate-200">{title}</h3>
        <Badge className="bg-purple-600 hover:bg-purple-700 text-[10px] px-2 py-0.5 h-5">
          OPAQUE TOKEN
        </Badge>
      </div>
      <div className="p-4 flex-1 flex flex-col items-center text-slate-400 space-y-4">
        <ShieldCheck className="w-12 h-12 text-purple-400/50 mt-4" />
        <p className="text-sm font-medium text-center">
          Token mã hoá một chiều (Opaque).<br />
          Không chứa payload có thể giải mã.
        </p>
        {expiresAt && (
          <div className={`mt-4 p-4 rounded-lg border w-full text-left flex flex-col gap-3 ${isExpired ? "bg-red-950/40 border-red-900/50" : "bg-slate-900 border-slate-700"
            }`}>
            <div className="flex flex-col mb-1 gap-1">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isExpired ? "text-red-400" : "text-purple-400"}`} />
                <span className={`text-xs font-bold uppercase ${isExpired ? "text-red-400" : "text-purple-400"}`}>
                  Token Lifespan
                </span>
              </div>
              <span className={`text-sm font-mono font-bold mt-1 ${isExpired ? "text-red-400" : "text-slate-200"}`}>
                {timeLeft || "Đang tính..."}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${isExpired ? "bg-red-500" : "bg-purple-500"
                  }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
              <span>
                Issued: {new Date(expiresAt - (Number(localStorage.getItem("access_token_expires_in")) || 300) * 1000).toLocaleTimeString()}
              </span>
              <span>
                Expires: {new Date(expiresAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="bg-black/20 p-2 text-center border-t border-white/5">
        <details className="text-[10px] text-slate-400 cursor-pointer group">
          <summary className="group-hover:text-purple-400 font-medium transition-colors">
            Show Raw Token
          </summary>
          <p className="mt-2 text-[9px] font-mono break-all text-left bg-slate-900 p-2 rounded border border-white/10 text-slate-300">
            {token}
          </p>
        </details>
      </div>
    </div>
  );
};