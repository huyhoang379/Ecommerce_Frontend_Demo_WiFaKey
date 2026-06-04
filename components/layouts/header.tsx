"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  RefreshCw,
  LogOut,
  ShieldAlert,
  LogIn,
  Ban,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/env";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const navItems = [
    {
      name: "Login OAuth Test",
      href: "/login",
      icon: <LogIn className="w-4 h-4" />,
    },
    {
      name: "User Session Info",
      href: "/infor",
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      name: "Refresh Token Test",
      href: "/refresh",
      icon: <RefreshCw className="w-4 h-4" />,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    toast.success("Session cleared successfully!");
    router.push("/login");
    setTimeout(() => window.location.reload(), 100);
    setShowLogoutDialog(false);
  };

  const handleRevoke = async () => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken || !refreshToken) {
      toast.error("Vui lòng đăng nhập để tiếp tục.");
      setShowRevokeDialog(false);
      return;
    }

    setIsRevoking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Revoke Refresh Token thành công!");
        localStorage.removeItem("refresh_token");
      } else {
        toast.error("Revoke Refresh Token thất bại", {
          description: data.message || "Something went wrong.",
        });
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error revoke: ", error);
      toast.error("Revoke Refresh Token thất bại", {
        description: error.message || "Something went wrong.",
      });
    } finally {
      setIsRevoking(false);
      setShowRevokeDialog(false);
    }
  };

  return (
    <>
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo / Brand */}
          <div
            className="flex items-center gap-2 font-bold text-lg md:text-xl text-slate-800 cursor-pointer flex-shrink-0"
            onClick={() => router.push("/")}
          >
            <div className="bg-slate-900 text-white p-1.5 rounded-md">
              <ShieldAlert className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="hidden sm:block">OAuth Debugger</span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg border">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeDialog(true)}
              className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
            >
              <Ban className="w-4 h-4" />
              <span className="hidden lg:inline">Revoke Token</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowLogoutDialog(true)}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Clear Session</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold text-slate-700">
                  Navigation
                </div>
                <DropdownMenuSeparator />
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={isActive ? "bg-blue-50 text-blue-600" : ""}
                    >
                      {item.icon}
                      <span className="ml-2">{item.name}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm font-semibold text-slate-700">
                  Actions
                </div>
                <DropdownMenuItem
                  onClick={() => setShowRevokeDialog(true)}
                  className="text-orange-600"
                >
                  <Ban className="w-4 h-4" />
                  <span className="ml-2">Revoke Token</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowLogoutDialog(true)}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="ml-2">Clear Session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-500" />
              Clear Session
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa toàn bộ Token? Bạn sẽ cần đăng nhập lại để
              tiếp tục sử dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Token Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-orange-500" />
              Revoke Refresh Token
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn revoke refresh token? Token sẽ không thể sử dụng
              để làm mới access token nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRevoking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Header;
