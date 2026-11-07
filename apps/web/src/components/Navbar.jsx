import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';

export function Navbar() {
  const { user, isStaffOrAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const navigate = useNavigate();

  async function signOut() {
    setLogoutError('');
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setLogoutError(error.message || 'ออกจากระบบไม่สำเร็จ');
    }
  }

  return (
    <header className="app-mobile-header sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-brand-surface px-4 sm:px-6 xl:hidden">
      <Link to="/" className="flex items-center" aria-label="SaveRaks, ไปหน้าแรก">
        <BrandLogo className="h-10 w-10 object-contain" />
      </Link>

      {user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="account-trigger"
            aria-expanded={open}
            aria-label="เมนูบัญชีผู้ใช้"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-600">
              <UserRound aria-hidden="true" className="h-4 w-4" />
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-gray-500" />
          </button>

          {open && (
            <div className="account-menu">
              <div className="border-b border-gray-100 px-3 py-2.5">
                <p className="truncate text-sm font-bold text-gray-900">{user.displayName}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {isStaffOrAdmin ? 'เจ้าหน้าที่' : user.studentId || user.email || 'นักเรียน'}
                </p>
              </div>
              <Link to="/profile" onClick={() => setOpen(false)} className="account-menu-link">
                ข้อมูลบัญชี
              </Link>
              {logoutError && (
                <p role="alert" className="px-3 pb-2 text-xs font-semibold text-red-700">
                  {logoutError}
                </p>
              )}
              <button type="button" onClick={signOut} className="account-menu-link text-red-700">
                <LogOut aria-hidden="true" className="h-4 w-4" />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link to="/login" className="button-primary !min-h-10 !px-4 !py-2 text-xs">
          เข้าสู่ระบบ
        </Link>
      )}
    </header>
  );
}
