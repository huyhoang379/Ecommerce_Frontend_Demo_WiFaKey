"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock } from "lucide-react"; // Thêm icon
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "@/utils/env";

interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const UserInforPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userInfo, setUserInfo] = useState<any>(null);
  const [tokenClaims, setTokenClaims] = useState<JwtPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // State cho bộ đếm thời gian
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString("vi-VN");
  };

  // Hàm tính toán thời gian còn lại (chạy mỗi giây)
  useEffect(() => {
    if (!tokenClaims?.exp || !tokenClaims?.iat) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const totalDuration = tokenClaims.exp! - tokenClaims.iat!;
      const remaining = tokenClaims.exp! - now;

      if (remaining <= 0) {
        setTimeLeft("Đã hết hạn");
        setProgress(100);
        setIsExpired(true);
        clearInterval(interval);
      } else {
        // Format thời gian còn lại: MM:SS
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        setTimeLeft(`${minutes} phút ${seconds} giây`);
        setIsExpired(false);

        // Tính % thanh progress (càng gần hết hạn càng đầy)
        const percent = ((totalDuration - remaining) / totalDuration) * 100;
        setProgress(percent);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenClaims]);

  const handleGetData = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    // 1. GIẢI MÃ TOKEN
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      setTokenClaims(decoded);
    } catch (error) {
      console.error("Invalid Token format", error);
    }

    // 2. GỌI API
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const data = await response.json();
      if (data.success) {
        setUserInfo(data.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGetData();
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto mt-10">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Session Debugger</CardTitle>
            <CardDescription>Inspect Session & Token Data</CardDescription>
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-bold ${
              userInfo
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {loading
              ? "Checking..."
              : userInfo
              ? "SERVER VERIFIED"
              : "SERVER REJECTED"}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="server" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="server">Server Response</TabsTrigger>
            <TabsTrigger value="token">Decoded Token</TabsTrigger>
          </TabsList>

          <TabsContent value="server" className="mt-4 space-y-4">
            {userInfo ? (
              <div className="flex flex-col gap-4">
                {/* <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Email (from DB)
                  </Label>
                  <Input
                    value={userInfo.email}
                    readOnly
                    className="h-8 font-medium"
                  />
                </div> */}
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Ecommerce User ID
                  </Label>
                  <Input
                    value={userInfo.id}
                    readOnly
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Linked WiFaKey ID
                  </Label>
                  <Input
                    value={userInfo.idpUserId}
                    readOnly
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500 text-center py-4">
                Không thể lấy dữ liệu từ Server.
              </p>
            )}
          </TabsContent>

          <TabsContent value="token" className="mt-4 space-y-5">
            {tokenClaims ? (
              <>
                {/* --- PHẦN MỚI: TOKEN LIFESPAN --- */}
                <div
                  className={`p-4 rounded-lg border ${
                    isExpired
                      ? "bg-red-50 border-red-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Clock
                        className={`w-4 h-4 ${
                          isExpired ? "text-red-500" : "text-blue-500"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold uppercase ${
                          isExpired ? "text-red-600" : "text-blue-600"
                        }`}
                      >
                        Token Lifespan
                      </span>
                    </div>
                    <span
                      className={`text-sm font-mono font-bold ${
                        isExpired ? "text-red-600" : "text-blue-700"
                      }`}
                    >
                      {timeLeft}
                    </span>
                  </div>

                  {/* Progress Bar thủ công (để không phụ thuộc component ngoài) */}
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-black/5">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${
                        isExpired ? "bg-red-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                    <span>
                      Issued:{" "}
                      {new Date(
                        (tokenClaims.iat || 0) * 1000
                      ).toLocaleTimeString()}
                    </span>
                    <span>
                      Expires:{" "}
                      {new Date(
                        (tokenClaims.exp || 0) * 1000
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {/* --- HẾT PHẦN MỚI --- */}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-100 rounded-md">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Issued At (iat)
                      </p>
                      <p className="text-xs font-mono">
                        {formatTime(tokenClaims.iat)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-md">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Expires At (exp)
                      </p>
                      <p className="text-xs font-mono">
                        {formatTime(tokenClaims.exp)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md bg-slate-950 p-4 overflow-x-auto">
                    <Label className="text-white mb-2 block">
                      Raw Payload JSON
                    </Label>
                    <pre className="text-xs text-green-400 font-mono">
                      {JSON.stringify(tokenClaims, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Không tìm thấy Token trong LocalStorage.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default UserInforPage;
