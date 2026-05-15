import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    expiresAt: null,
    loading: true
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      const data = await api.getCustomerMe();
      setState({ user: data.user, expiresAt: data.expiresAt || null, loading: false });
      return data.user;
    } catch (_error) {
      setState({ user: null, expiresAt: null, loading: false });
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signup = useCallback(async (body) => {
    const data = await api.customerSignup(body);
    setState({ user: data.user, expiresAt: data.expiresAt || null, loading: false });
    return data;
  }, []);

  const login = useCallback(async (body) => {
    const data = await api.customerLogin(body);
    setState({ user: data.user, expiresAt: data.expiresAt || null, loading: false });
    return data;
  }, []);

  const logout = useCallback(async () => {
    await api.customerLogout();
    setState({ user: null, expiresAt: null, loading: false });
  }, []);

  const resetPassword = useCallback(async (body) => {
    const data = await api.resetCustomerPassword(body);
    setState({ user: data.user, expiresAt: data.expiresAt || null, loading: false });
    return data;
  }, []);

  const updateProfile = useCallback(async (body) => {
    const data = await api.updateCustomerProfile(body);
    setState((current) => ({ ...current, user: data.user, loading: false }));
    return data;
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      expiresAt: state.expiresAt,
      loading: state.loading,
      authenticated: Boolean(state.user),
      refresh,
      signup,
      login,
      logout,
      resetPassword,
      updateProfile
    }),
    [login, logout, refresh, resetPassword, signup, state.expiresAt, state.loading, state.user, updateProfile]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  }
  return context;
}
