import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { DASHBOARD_PATHS } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
  requireRole?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath = "/",
    requireRole,
  } = options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.customAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.customAuth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      window.location.href = "/";
    },
  });

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
    if (user && requireRole && user.role !== requireRole) {
      // Redirect to their proper dashboard
      const correctPath = DASHBOARD_PATHS[user.role];
      if (correctPath && window.location.pathname !== correctPath) {
        navigate(correctPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath, requireRole]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isLoading, logoutMutation.isPending, error, logout, refetch]
  );
}
