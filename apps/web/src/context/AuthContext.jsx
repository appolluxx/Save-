import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  const [authSuccessCount, setAuthSuccessCount] = useState(0);

  const refreshUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      const currentUser = response?.success ? response.data : null;
      setUser(currentUser);
      setConnectionError('');
      return currentUser;
    } catch (error) {
      setUser(null);
      setConnectionError(error.status === 401 ? '' : error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const acceptSession = (response) => {
    if (!response?.success || !response.data?.user) {
      throw new Error('ระบบไม่ได้ส่งข้อมูลบัญชีกลับมา กรุณาลองอีกครั้ง');
    }
    setConnectionError('');
    setUser(response.data.user);
    setAuthSuccessCount((count) => count + 1);
    return response.data.user;
  };

  const login = async (identifier, password) =>
    acceptSession(await api.post('/api/auth/login', { identifier, password }));

  const registerStudent = async (data) =>
    acceptSession(await api.post('/api/auth/register/student', data));

  const registerStaff = async (data) =>
    acceptSession(await api.post('/api/auth/register/staff', data));

  const registerExternal = async (data) =>
    acceptSession(await api.post('/api/auth/register/external', data));

  const googleLogin = async (idToken) =>
    acceptSession(await api.post('/api/auth/google', { idToken }));

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // Even if the network drops or API is unreachable, ensure user state is cleared
    } finally {
      setUser(null);
    }
  };

  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        connectionError,
        authSuccessCount,
        isAuthenticated: Boolean(user),
        isStaffOrAdmin,
        login,
        registerStudent,
        registerStaff,
        registerExternal,
        googleLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
