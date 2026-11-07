import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');

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
    return response.data.user;
  };

  const login = async (identifier, password) =>
    acceptSession(await api.post('/api/auth/login', { identifier, password }));

  const registerStudent = async (data) =>
    acceptSession(await api.post('/api/auth/register/student', data));

  const registerStaff = async (data) =>
    acceptSession(await api.post('/api/auth/register/staff', data));

  const googleLogin = async (idToken) =>
    acceptSession(await api.post('/api/auth/google', { idToken }));

  const logout = async () => {
    const response = await api.post('/api/auth/logout', {});
    if (!response?.success) throw new Error('ระบบยังยืนยันการออกจากระบบไม่ได้');
    setUser(null);
  };

  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        connectionError,
        isAuthenticated: Boolean(user),
        isStaffOrAdmin,
        login,
        registerStudent,
        registerStaff,
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
