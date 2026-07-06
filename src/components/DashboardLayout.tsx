import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  BookOpen,
  Printer,
  UserCog,
  ClipboardList,
  MessageSquare,
  Download,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DASHBOARD_PATHS, ROLE_DISPLAY_NAMES } from "@/const";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: Record<string, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", path: "/dashboard/super-admin", icon: <Home className="w-5 h-5" /> },
    { label: "Commandants", path: "/dashboard/super-admin?tab=commandants", icon: <UserCog className="w-5 h-5" /> },
    { label: "Batches", path: "/dashboard/super-admin?tab=batches", icon: <BookOpen className="w-5 h-5" /> },
    { label: "All Users", path: "/dashboard/super-admin?tab=users", icon: <Users className="w-5 h-5" /> },
    { label: "Settings", path: "/dashboard/super-admin?tab=settings", icon: <Settings className="w-5 h-5" /> },
  ],
  state_commandant: [
    { label: "Dashboard", path: "/dashboard/state-commandant", icon: <Home className="w-5 h-5" /> },
    { label: "Corps Members", path: "/dashboard/state-commandant?tab=members", icon: <Users className="w-5 h-5" /> },
    { label: "Batches", path: "/dashboard/state-commandant?tab=batches", icon: <BookOpen className="w-5 h-5" /> },
    { label: "Print Reports", path: "/dashboard/state-commandant?tab=print", icon: <Printer className="w-5 h-5" /> },
  ],
  camp_commandant: [
    { label: "Dashboard", path: "/dashboard/camp-commandant", icon: <Home className="w-5 h-5" /> },
    { label: "Corps Members", path: "/dashboard/camp-commandant?tab=members", icon: <Users className="w-5 h-5" /> },
    { label: "Staff Management", path: "/dashboard/camp-commandant?tab=staff", icon: <UserCog className="w-5 h-5" /> },
    { label: "Batches", path: "/dashboard/camp-commandant?tab=batches", icon: <BookOpen className="w-5 h-5" /> },
    { label: "Print Reports", path: "/dashboard/camp-commandant?tab=print", icon: <Printer className="w-5 h-5" /> },
    { label: "Export CSV", path: "/dashboard/camp-commandant?tab=export", icon: <Download className="w-5 h-5" /> },
  ],
  platoon_instructor: [
    { label: "Dashboard", path: "/dashboard/instructor", icon: <Home className="w-5 h-5" /> },
    { label: "My Platoon", path: "/dashboard/instructor?tab=platoon", icon: <Users className="w-5 h-5" /> },
    { label: "Evaluations", path: "/dashboard/instructor?tab=evaluations", icon: <ClipboardList className="w-5 h-5" /> },
    { label: "Print", path: "/dashboard/instructor?tab=print", icon: <Printer className="w-5 h-5" /> },
  ],
  man_o_war_instructor: [
    { label: "Dashboard", path: "/dashboard/man-o-war", icon: <Home className="w-5 h-5" /> },
    { label: "My Platoon", path: "/dashboard/man-o-war?tab=platoon", icon: <Users className="w-5 h-5" /> },
    { label: "Evaluations", path: "/dashboard/man-o-war?tab=evaluations", icon: <ClipboardList className="w-5 h-5" /> },
    { label: "Print", path: "/dashboard/man-o-war?tab=print", icon: <Printer className="w-5 h-5" /> },
  ],
  soldier: [
    { label: "Dashboard", path: "/dashboard/soldier", icon: <Home className="w-5 h-5" /> },
    { label: "My Platoon", path: "/dashboard/soldier?tab=platoon", icon: <Users className="w-5 h-5" /> },
    { label: "Comments", path: "/dashboard/soldier?tab=comments", icon: <MessageSquare className="w-5 h-5" /> },
  ],
};

export default function DashboardLayout({
  children,
  title,
  requiredRole,
}: {
  children: React.ReactNode;
  title?: string;
  requiredRole?: string;
}) {
  const { user, logout, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user || !requiredRole || user.role === requiredRole) return;

    const dashboardPath = DASHBOARD_PATHS[user.role] || "/";
    if (location.pathname !== dashboardPath) {
      navigate(dashboardPath, { replace: true });
    }
  }, [user, requiredRole, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole && user.role !== requiredRole) return null;

  const navItems = NAV_ITEMS[user.role] || [];
  const roleDisplay = ROLE_DISPLAY_NAMES[user.role] || "Staff";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-green-800 text-white transition-all duration-300 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarCollapsed ? "w-16" : "w-64"}`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between p-4 border-b border-green-700 ${sidebarCollapsed ? "px-2" : ""}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-300" />
              <div className="min-w-0">
                <h1 className="font-bold text-sm leading-tight truncate">{user.fullName}</h1>
                <p className="text-xs text-green-300">{roleDisplay}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && <Shield className="w-8 h-8 text-green-300 mx-auto" />}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-green-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block p-1 hover:bg-green-700 rounded"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path.split("?")[0] &&
              (item.path.includes("?")
                ? location.search === item.path.split("?")[1]?.replace("?", "?")
                : !location.search);

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  sidebarCollapsed ? "justify-center px-2" : ""
                } ${
                  isActive
                    ? "bg-green-700 border-r-2 border-green-300"
                    : "hover:bg-green-700/50 text-green-100"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className={`border-t border-green-700 p-4 ${sidebarCollapsed ? "px-2" : ""}`}>
          {!sidebarCollapsed && (
            <div className="mb-3">
              <p className="text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-green-300">{user.username}</p>
            </div>
          )}
          <button
            onClick={logout}
            className={`flex items-center gap-2 text-red-300 hover:text-red-200 hover:bg-green-700/50 rounded-lg px-3 py-2 transition-colors w-full ${
              sidebarCollapsed ? "justify-center px-2" : ""
            }`}
            title={sidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b px-3 sm:px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 leading-tight truncate">{user.fullName}</h1>
            <p className="text-xs text-gray-500 leading-tight truncate">{roleDisplay}</p>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6 lg:p-8">
          {title && (
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
