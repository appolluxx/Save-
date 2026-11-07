import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Camera, ClipboardCheck, Home, MapPinned, Store, Trophy, UserRound } from 'lucide-react';

const STUDENT_ITEMS = [
  { to: '/', label: 'หน้าแรก', icon: Home, end: true },
  { to: '/map', label: 'แผนที่', icon: MapPinned },
  { to: '/submit', label: 'บันทึก', icon: Camera, primary: true },
  { to: '/shop', label: 'ร้านค้า', icon: Store },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
];

const STAFF_ITEMS = [
  { to: '/admin', label: 'ภาพรวม', icon: Home, end: true },
  {
    to: '/admin?tab=evidence',
    label: 'ตรวจงาน',
    icon: ClipboardCheck,
    query: true,
  },
  { to: '/map', label: 'รายงาน', icon: MapPinned },
  { to: '/leaderboard', label: 'อันดับ', icon: Trophy },
  { to: '/profile', label: 'บัญชี', icon: UserRound },
];

export function BottomNav() {
  const { isStaffOrAdmin } = useAuth();
  const location = useLocation();
  const items = isStaffOrAdmin ? STAFF_ITEMS : STUDENT_ITEMS;

  return (
    <nav aria-label="เมนูหลักบนมือถือ" className="app-bottom-nav md:hidden">
      <div className="bottom-nav-items">
        {items.map(({ to, label, icon: Icon, end, primary, query }) => {
          const active = end
            ? location.pathname === to
            : query
              ? location.pathname === '/admin' && location.search === '?tab=evidence'
              : location.pathname === to || location.pathname.startsWith(to + '/');

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={['bottom-nav-link', active && 'is-active', primary && 'is-primary']
                .filter(Boolean)
                .join(' ')}
            >
              <span className="bottom-nav-icon">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              <span className="bottom-nav-label">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
