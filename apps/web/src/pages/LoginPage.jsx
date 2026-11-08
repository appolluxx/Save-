import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Eye, EyeOff, Loader2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { BrandLogo } from '../components/BrandLogo.jsx';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') === 'staff' ? 'staff' : 'student';
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register');
  const { login, registerStudent, registerStaff, connectionError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => setIsRegister(searchParams.get('mode') === 'register'), [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfoMessage('');
    if (isRegister && !agreedTerms) {
      setError('กรุณายืนยันว่าได้อ่านข้อกำหนดและนโยบายความเป็นส่วนตัว');
      return;
    }
    setLoading(true);
    try {
      if (!isRegister) {
        const user = await login(identifier.trim(), password);
        navigate(user.role === 'STAFF' || user.role === 'ADMIN' ? '/admin' : '/');
      } else if (role === 'student') {
        const verifyRes = await api.post('/api/auth/verify-student', {
          studentId: identifier.trim(),
        });
        if (verifyRes.data?.notice) {
          setInfoMessage(verifyRes.data.notice);
        }
        const user = await registerStudent({
          studentId: identifier.trim(),
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          password,
        });
        navigate(user.role === 'STAFF' || user.role === 'ADMIN' ? '/admin' : '/');
      } else {
        const user = await registerStaff({
          email: identifier.trim(),
          displayName: displayName.trim(),
          password,
          staffInviteCode: inviteCode.trim(),
        });
        navigate(user.role === 'STAFF' || user.role === 'ADMIN' ? '/admin' : '/');
      }
    } catch (submitError) {
      setError(submitError.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const title = !isRegister
    ? `เข้าสู่ระบบ${role === 'student' ? 'นักเรียน' : 'เจ้าหน้าที่'}`
    : `ลงทะเบียน${role === 'student' ? 'นักเรียน' : 'เจ้าหน้าที่'}`;

  return (
    <main className="auth-page flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <section className="auth-card mx-auto flex min-h-[min(720px,calc(100vh-3rem))] w-full max-w-[460px] flex-col overflow-hidden rounded-3xl bg-white">
        <div className="border-b border-gray-200 bg-white px-6 pb-6 pt-6 sm:px-9 sm:pt-8">
          <button
            onClick={() => navigate('/onboarding')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="mt-6 flex items-center gap-3">
            <BrandLogo className="h-12 w-12 rounded-xl object-contain" />
            <div>
              <p className="text-xs font-semibold text-gray-500">SaveRaks · สุรศักดิ์มนตรี</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                {title}
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-600">
            บันทึกกิจกรรมและติดตามผลจากข้อมูลบัญชีของคุณ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-6 py-7 sm:px-9">
          {(error || connectionError) && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error || connectionError}
            </div>
          )}
          {infoMessage && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-800"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span>{infoMessage}</span>
            </div>
          )}
          {isRegister && (
            <Field
              label="ชื่อและนามสกุล"
              value={displayName}
              onChange={setDisplayName}
              placeholder="ชื่อที่ใช้ในระบบ"
              required
              autoComplete="name"
            />
          )}
          <div>
            <Field
              label={
                role === 'student'
                  ? isRegister
                    ? 'เลขประจำตัว 5 หลัก'
                    : 'เลขประจำตัว / อีเมล'
                  : 'อีเมลเจ้าหน้าที่'
              }
              value={identifier}
              onChange={setIdentifier}
              placeholder={
                role === 'student'
                  ? isRegister
                    ? 'เช่น 53580 หรือ 12345'
                    : 'เลขประจำตัวหรืออีเมล'
                  : 'name@school.ac.th'
              }
              required
              autoComplete={role === 'student' && !isRegister ? 'username' : 'email'}
              type={role === 'staff' ? 'email' : 'text'}
              maxLength={role === 'student' && isRegister ? 5 : undefined}
              inputMode={role === 'student' && isRegister ? 'numeric' : undefined}
            />
            {isRegister && role === 'student' && (
              <p className="mt-1.5 text-xs text-gray-500">
                💡 สำหรับนักเรียนสุรศักดิ์มนตรี (หากไม่พบในระบบทะเบียน จะเปิดบัญชีเป็น <strong>บุคคลทั่วไป</strong> ให้อัตโนมัติ)
              </p>
            )}
          </div>
          {isRegister && role === 'student' && (
            <Field
              label="อีเมล (ไม่บังคับ)"
              value={email}
              onChange={setEmail}
              placeholder="name@example.com"
              type="email"
              autoComplete="email"
            />
          )}
          {isRegister && role === 'staff' && (
            <Field
              label="รหัสเชิญเจ้าหน้าที่"
              value={inviteCode}
              onChange={setInviteCode}
              placeholder="กรอกรหัสจากผู้ดูแลระบบ"
              required
              autoComplete="off"
            />
          )}
          <div>
            <label
              htmlFor="password-field"
              className="mb-1.5 block text-sm font-bold text-brand-ink"
            >
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                id="password-field"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 8 : 1}
                className="w-full rounded-2xl border border-gray-200 bg-brand-canvas px-4 py-3 pr-12 text-sm font-medium outline-none transition focus:border-brand-positive focus:ring-4 focus:ring-brand-primary/20"
                placeholder={isRegister ? 'อย่างน้อย 8 ตัวอักษร' : 'กรอกรหัสผ่าน'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute inset-y-0 right-3 grid place-items-center text-gray-500"
              >
                <span className="sr-only">{showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}</span>
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <Eye aria-hidden="true" className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          {isRegister && (
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-brand-body">
              <input
                type="checkbox"
                required
                checked={agreedTerms}
                onChange={(event) => setAgreedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-brand-primary"
              />
              ฉันยืนยันว่าได้อ่านข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว
            </label>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-primary px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-brand-primary/15 transition hover:-translate-y-0.5 hover:bg-brand-primary active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังดำเนินการ…
              </>
            ) : isRegister ? (
              'สร้างบัญชี'
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
          <p className="mt-auto pt-3 text-center text-sm text-brand-muted">
            {isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister((value) => !value);
                setError('');
              }}
              className="font-extrabold text-brand-primary underline decoration-brand-positive decoration-2 underline-offset-4"
            >
              {isRegister ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, id, ...props }) {
  const inputId = id || `field-${label.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold text-brand-ink">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-brand-canvas px-4 py-3 text-sm font-medium outline-none transition focus:border-brand-positive focus:ring-4 focus:ring-brand-primary/20"
      />
    </div>
  );
}
