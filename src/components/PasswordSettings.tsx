import { useState } from "react";
import { Lock } from "lucide-react";
import { ROLE_DISPLAY_NAMES } from "@/const";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function PasswordSettings() {
  const { user } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const changePassword = trpc.customAuth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordForm(EMPTY_PASSWORD_FORM);
    },
    onError: (err) => {
      setPasswordSuccess(false);
      setPasswordError(err.message);
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 12) {
      setPasswordError("Password must be at least 12 characters");
      return;
    }
    changePassword.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const cancelPasswordChange = () => {
    setShowPasswordForm(false);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordError("");
    setPasswordSuccess(false);
    changePassword.reset();
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Account Settings</h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b">
            <span className="text-gray-500">System Name</span>
            <span className="font-medium sm:text-right">NYSC Camp Evaluation System</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b">
            <span className="text-gray-500">Name</span>
            <span className="font-medium sm:text-right">{user?.fullName}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b">
            <span className="text-gray-500">Role</span>
            <span className="font-medium sm:text-right">
              {user ? ROLE_DISPLAY_NAMES[user.role] : "Staff"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
        {passwordSuccess && (
          <p role="status" className="text-green-600 text-sm mb-4">
            Password changed successfully!
          </p>
        )}
        {!showPasswordForm ? (
          <button
            onClick={() => {
              setPasswordSuccess(false);
              setShowPasswordForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && <p role="alert" className="text-red-500 text-sm">{passwordError}</p>}
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Current Password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <input
              type="password"
              minLength={12}
              autoComplete="new-password"
              placeholder="New Password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <input
              type="password"
              minLength={12}
              autoComplete="new-password"
              placeholder="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {changePassword.isPending ? "Changing..." : "Change"}
              </button>
              <button
                type="button"
                onClick={cancelPasswordChange}
                disabled={changePassword.isPending}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
