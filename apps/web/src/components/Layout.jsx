import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Camera,
  ClipboardCheck,
  Home,
  LogOut,
  MapPinned,
  RefreshCw,
  ScanLine,
  Store,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BottomNav } from './BottomNav.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { Navbar } from './Navbar.jsx';

const STUDENT_LINKS = [
  { to: '/', label: 'ภาพรวม', icon: Home, end: true },
  { to: '/vision', label: 'สแกนขยะ', icon: ScanLine },
  { to: '/submit', label: 'บันทึกภารกิจ', icon: Camera },
  { to: '/map', label: 'แผนที่รายงาน', icon: MapPinned },
  { to: '/shop', label: 'ร้านค้าสวัสดิการ', icon: Store },
  { to: '/leaderboard', label: 'กระดานผู้นำ', icon: Trophy },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
];

export function Layout() {
  const { user, isStaffOrAdmin, logout, connectionError, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');
  const links = isStaffOrAdmin
    ? [
        ...STUDENT_LINKS.filter(({ to }) => to !== '/submit'),
        { to: '/admin', label: 'ศูนย์จัดการ', icon: ClipboardCheck },
      ]
    : STUDENT_LINKS;

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
    <div className="app-shell min-h-screen bg-brand-canvas text-brand-ink">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col border-r border-gray-200 bg-brand-canvas px-3 py-5 md:flex xl:w-56 xl:px-5 xl:py-6">
        <Link
          to="/"
          className="brand-link justify-center xl:justify-start"
          aria-label="SaveRaks, ไปหน้าแรก"
        >
          <BrandLogo className="h-12 w-12 object-contain" />
          <span className="hidden min-w-0 xl:block">
            <span className="block text-base font-extrabold tracking-tight text-gray-900">
              SaveRaks
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
              สุรศักดิ์มนตรี
            </span>
          </span>
        </Link>

        <p className="sidebar-label hidden xl:block">เมนูหลัก</p>
        <nav aria-label="เมนูหลัก" className="sidebar-navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                [
                  'sidebar-link justify-center gap-0 px-2 xl:justify-start xl:gap-3 xl:px-3',
                  isActive && 'is-active',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />
              <span className="hidden xl:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-account hidden xl:block">
          {user ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-600">
                  <UserRound aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{user.displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {isStaffOrAdmin ? (
                      'เจ้าหน้าที่'
                    ) : (
                      <>{Number(user.points || 0).toLocaleString('th-TH')} แต้ม</>
                    )}
                  </p>
                </div>
              </div>
              {logoutError && (
                <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
                  {logoutError}
                </p>
              )}
              <button type="button" onClick={signOut} className="sidebar-signout">
                <LogOut aria-hidden="true" className="h-4 w-4" />
                ออกจากระบบ
              </button>
            </>
          ) : (
            <Link to="/login" className="button-primary w-full justify-center">
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </aside>

      <div className="app-main min-h-screen md:pl-[88px] xl:pl-56">
        <Navbar />
        {connectionError && (
          <div role="alert" className="connection-banner mx-4 mt-4 sm:mx-6 xl:mx-10">
            <p>{connectionError}</p>
            <button type="button" onClick={refreshUser} className="button-secondary">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              ลองเชื่อมต่ออีกครั้ง
            </button>
          </div>
        )}
        <main className="app-content mx-auto w-full max-w-[1280px] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 md:pb-12 xl:px-10 xl:pt-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
