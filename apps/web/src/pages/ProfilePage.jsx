import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ACTION_METADATA } from '@saveraks/shared/constants';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Gift,
  Recycle,
  LogOut,
  RefreshCw,
  UserRound,
  XCircle,
} from 'lucide-react';

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    const [actionResult, rewardResult] = await Promise.allSettled([
      api.get('/api/actions/me'),
      api.get('/api/marketplace/redemptions'),
    ]);
    if (actionResult.status === 'fulfilled')
      setActions(Array.isArray(actionResult.value.data) ? actionResult.value.data : []);
    else setError(actionResult.reason?.message || 'โหลดประวัติกิจกรรมไม่สำเร็จ');
    if (rewardResult.status === 'fulfilled')
      setRedemptions(Array.isArray(rewardResult.value.data) ? rewardResult.value.data : []);
    else
      setError((previous) =>
        previous
          ? `${previous} · โหลดประวัติแลกของไม่สำเร็จ`
          : rewardResult.reason?.message || 'โหลดประวัติแลกของไม่สำเร็จ',
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const history = useMemo(
    () =>
      [
        ...actions.map((item) => ({ ...item, recordType: 'action' })),
        ...redemptions.map((item) => ({ ...item, recordType: 'redemption' })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [actions, redemptions],
  );
  const filtered =
    filter === 'all'
      ? history
      : history.filter((item) =>
          filter === 'actions' ? item.recordType === 'action' : item.recordType === 'redemption',
        );
  const signOut = async () => {
    setError('');
    try {
      await logout();
      navigate('/login');
    } catch (requestError) {
      setError(requestError.message || 'ออกจากระบบไม่สำเร็จ');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MY ACCOUNT"
        title="โปรไฟล์ของฉัน"
        description="ข้อมูลบัญชี คะแนน และประวัติจากระบบ"
        action={
          <button
            type="button"
            onClick={() => {
              refreshUser();
              loadHistory();
            }}
            className="button-secondary"
            disabled={loading}
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            รีเฟรชข้อมูล
          </button>
        }
      />
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-5 page-enter" style={{ animationDelay: '40ms' }}>
          <section className="overflow-hidden rounded-[28px] bg-brand-primary p-5 text-white shadow-xl shadow-brand-primary/10 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-white">
                <UserRound className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-brand-soft">
                  {user?.role || 'ACCOUNT'}
                </p>
                <h2 className="mt-1 break-words text-lg font-black">{user?.displayName || '—'}</h2>
                <p className="mt-1 text-xs text-white/60">
                  {user?.studentId
                    ? `รหัสนักเรียน ${user.studentId}`
                    : user?.email || 'ไม่มีอีเมลในบัญชี'}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/[.08] p-3">
                <p className="text-[10px] font-bold text-white/55">ระดับชั้น / สถานะ</p>
                <p className="mt-1 text-sm font-extrabold">
                  {user?.gradeLevel === 'บุคคลทั่วไป'
                    ? 'บุคคลทั่วไป'
                    : user?.gradeLevel
                      ? `ม.${user.gradeLevel}/${user.classroom || '—'}`
                      : 'ไม่มีข้อมูล'}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[.08] p-3">
                <p className="text-[10px] font-bold text-white/55">อีเมล</p>
                <p className="mt-1 truncate text-xs font-extrabold">
                  {user?.email || 'ไม่มีข้อมูล'}
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-bold text-white/55">ยอดคะแนนปัจจุบัน</p>
              <p className="mt-1 text-3xl font-black tabular-nums">
                {Number(user?.points || 0).toLocaleString('th-TH')}{' '}
                <small className="text-sm">แต้ม</small>
              </p>
            </div>
          </section>

          <section className="card-panel">
            <div className="flex items-center gap-3">
              <Recycle className="h-5 w-5 text-brand-primary" aria-hidden="true" />
              <div>
                <p className="eyebrow">IMPACT</p>
                <h2 className="text-sm font-extrabold">ผลกระทบที่ยืนยันแล้ว</h2>
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tabular-nums">
              {Number(user?.totalCo2Saved || 0).toLocaleString('th-TH')}{' '}
              <small className="text-sm font-bold text-brand-muted">กก. CO₂e</small>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">
              ยอดสะสมจากรายการที่ระบบอนุมัติแล้ว
            </p>
          </section>

          <section className="card-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">BADGES</p>
                <h2 className="section-title !text-base">เหรียญที่ได้รับ</h2>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-[11px] font-black text-brand-primary">
                {user?.badges?.length || 0}
              </span>
            </div>
            {Array.isArray(user?.badges) && user.badges.length ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {user.badges.map((badge) => (
                  <div
                    key={badge.code}
                    className="flex items-center gap-2 rounded-xl bg-brand-canvas p-3"
                  >
                    <BadgeCheck className="h-5 w-5 shrink-0 text-brand-positive" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold">{badge.name}</p>
                      <p className="text-[10px] text-brand-muted">
                        {new Date(badge.awardedAt).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-brand-canvas p-3 text-xs text-brand-muted">
                ยังไม่มีเหรียญที่ได้รับในระบบ
              </p>
            )}
          </section>

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>

        <section className="card-panel page-enter" style={{ animationDelay: '80ms' }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">ACCOUNT HISTORY</p>
              <h2 className="section-title">ประวัติกิจกรรมและคูปอง</h2>
            </div>
            <Link to="/submit" className="button-primary !px-3 !py-2 text-[11px]">
              ส่งกิจกรรมใหม่ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex gap-1 rounded-xl bg-brand-canvas p-1">
            <FilterButton current={filter} value="all" onClick={setFilter}>
              ทั้งหมด
            </FilterButton>
            <FilterButton current={filter} value="actions" onClick={setFilter}>
              กิจกรรม
            </FilterButton>
            <FilterButton current={filter} value="redemptions" onClick={setFilter}>
              คูปอง
            </FilterButton>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-brand-muted">กำลังโหลดประวัติ…</div>
          ) : filtered.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-brand-canvas p-8 text-center">
              <p className="text-sm font-extrabold">ยังไม่มีประวัติในหมวดนี้</p>
              <p className="mt-1 text-xs text-brand-muted">รายการใหม่จะแสดงหลังบันทึกในระบบ</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {filtered.map((item) => (
                <HistoryItem key={`${item.recordType}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterButton({ current, value, onClick, children }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={current === value}
      className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-extrabold transition ${current === value ? 'bg-brand-primary text-white' : 'text-brand-muted hover:bg-white'}`}
    >
      {children}
    </button>
  );
}
function HistoryItem({ item }) {
  const reward = item.recordType === 'redemption';
  const status = item.status;
  const Icon = reward
    ? Gift
    : status === 'APPROVED'
      ? CheckCircle2
      : status === 'PENDING'
        ? Clock3
        : XCircle;
  const title = reward ? item.rewardTitle : ACTION_METADATA[item.type]?.nameThai || item.type;
  const value = reward ? -Number(item.costAtPurchase || 0) : Number(item.pointsAwarded || 0);
  const stateLabel = reward
    ? status === 'CLAIMED'
      ? 'รับสิทธิ์แล้ว'
      : status === 'PENDING'
        ? 'พร้อมใช้'
        : status
    : { APPROVED: 'อนุมัติแล้ว', PENDING: 'รอตรวจสอบ', REJECTED: 'ไม่อนุมัติ' }[status] || status;
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-brand-soft bg-white p-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${reward ? 'bg-brand-canvas text-brand-positive' : status === 'APPROVED' ? 'bg-brand-soft text-brand-primary' : status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-50 text-red-700'}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-brand-ink">{title}</p>
        <p className="mt-1 text-[10px] text-brand-muted">
          {stateLabel} ·{' '}
          {new Date(item.createdAt).toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
        {item.rejectReason && (
          <p className="mt-1 text-[10px] text-red-700">เหตุผล: {item.rejectReason}</p>
        )}
        {reward && (
          <p className="mt-1 font-mono text-[10px] font-bold text-brand-primary">
            {item.redemptionCode}
          </p>
        )}
      </div>
      <b
        className={`shrink-0 text-xs font-black tabular-nums ${value < 0 ? 'text-brand-ink' : status === 'APPROVED' ? 'text-brand-positive' : 'text-brand-muted'}`}
      >
        {value > 0 ? '+' : ''}
        {value} <small>แต้ม</small>
      </b>
    </article>
  );
}
