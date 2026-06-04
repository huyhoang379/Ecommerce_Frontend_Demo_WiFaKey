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
  const [newAccessToken, setNewAccessToken] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Load Token từ LocalStorage
  useEffect(() => {
    setOldAccessToken(localStorage.getItem("access_token") || "");
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
}: {
  token: string;
  title: string;
  type: "old" | "new";
}) => {
  if (!token) {
    return (
      <div
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 min-h-[400px] ${
          type === "new"
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
    return (
      <div className="text-red-500 p-4 border rounded">Token không hợp lệ</div>
    );
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
          className={`font-bold text-sm ${
            type === "new" ? "text-green-700" : "text-slate-700"
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
                  className={`text-[10px] font-bold ${
                    isExpired ? "text-red-500" : "text-green-600"
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
