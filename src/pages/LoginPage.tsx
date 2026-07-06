import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { DASHBOARD_PATHS } from "@/const";

type LoginPortal = "staff" | "super_admin";

type LoginPageProps = {
  portal?: LoginPortal;
};

export default function LoginPage({ portal = "staff" }: LoginPageProps) {
  const navigate = useNavigate();
  const isSuperAdminPortal = portal === "super_admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.customAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.user) {
        const dashboardPath = DASHBOARD_PATHS[data.user.role];
        if (dashboardPath) {
          window.location.href = dashboardPath;
        }
      }
    },
    onError: (err) => {
      setError(err.message || "Invalid username or password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    loginMutation.mutate({
      username: username.trim(),
      password: password.trim(),
      portal,
    });
  };

  return (
    <div className="min-h-svh bg-gradient-to-br from-green-700 via-green-600 to-green-800 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="relative bg-white rounded-2xl p-5 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={() => navigate("/")}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isSuperAdminPortal ? "Super Admin Login" : "Staff Login"}
            </h1>
            <p className="text-green-600 font-medium mt-1">
              {isSuperAdminPortal
                ? "Restricted access"
                : "Use your assigned staff account"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all pr-12"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login
                </>
              )}
            </button>
          </form>

          {/* Back to home */}
          <button
            onClick={() => navigate("/")}
            className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
