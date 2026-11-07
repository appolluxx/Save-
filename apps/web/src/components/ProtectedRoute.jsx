import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children, requireStaff = false }) {
  const { loading, isAuthenticated, isStaffOrAdmin } = useAuth();

  if (loading) {
    return (
      <div className="access-loading" role="status">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-brand-primary" />
        <p>กำลังตรวจสอบสิทธิ์…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireStaff && !isStaffOrAdmin) {
    return (
      <section className="access-denied" role="alert">
        <ShieldAlert aria-hidden="true" className="h-7 w-7 text-red-700" />
        <h1 className="mt-3 text-lg font-extrabold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-gray-600">
          หน้านี้สงวนไว้สำหรับคุณครูและเจ้าหน้าที่โรงเรียนสุรศักดิ์มนตรี
        </p>
        <Link to="/" className="button-secondary mt-5">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          กลับหน้าหลัก
        </Link>
      </section>
    );
  }

  return children;
}
