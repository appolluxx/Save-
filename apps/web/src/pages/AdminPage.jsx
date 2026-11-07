import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ACTION_METADATA } from '@saveraks/shared/constants';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LoaderCircle,
  Search,
  ShieldAlert,
  Ticket,
  Users,
} from 'lucide-react';

const tabs = [
  { id: 'evidence', label: 'ตรวจหลักฐาน', icon: ClipboardCheck },
  { id: 'users', label: 'นักเรียน', icon: Users },
  { id: 'vouchers', label: 'ตรวจคูปอง', icon: Ticket },
  { id: 'reports', label: 'รายงาน', icon: FileText },
];

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const tab = tabs.some((item) => item.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'evidence';
  const isAdmin = user?.role === 'ADMIN';
  const [evidence, setEvidence] = useState([]);
  const [users, setUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [voucher, setVoucher] = useState('');
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(
    async (section = tab) => {
      setLoading(true);
      setError('');
      try {
        if (section === 'evidence') {
          const response = await api.get('/api/admin/evidence');
          setEvidence(Array.isArray(response.data) ? response.data : []);
        } else if (section === 'users') {
          const suffix = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : '';
          const response = await api.get(`/api/admin/users${suffix}`);
          setUsers(Array.isArray(response.data?.users) ? response.data.users : []);
        } else if (section === 'reports') {
          const response = await api.get('/api/admin/reports');
          setReport(response.data || null);
        }
      } catch (requestError) {
        setError(requestError.message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    },
    [tab, query],
  );

  useEffect(() => {
    if (tab !== 'vouchers') load(tab);
  }, [tab, query, load]);

  const review = async (id, status) => {
    setError('');
    setNotice('');
    const rejectReason = reviewNotes[id]?.trim();
    if (status === 'REJECTED' && (!rejectReason || rejectReason.length < 3)) {
      setError('กรุณากรอกเหตุผลการปฏิเสธอย่างน้อย 3 ตัวอักษร');
      return;
    }
    setReviewingId(id);
    try {
      const response = await api.patch(`/api/admin/evidence/${id}`, {
        status,
        ...(status === 'REJECTED' ? { rejectReason } : {}),
      });
      if (!response.success) throw new Error('ระบบไม่ได้ยืนยันผลตรวจหลักฐาน');
      setNotice(
        status === 'APPROVED'
          ? 'อนุมัติหลักฐานสำเร็จ คะแนนจะอัปเดตจากระบบบัญชี'
          : 'ปฏิเสธหลักฐานและบันทึกเหตุผลแล้ว',
      );
      setReviewNotes((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      await load('evidence');
    } catch (requestError) {
      setError(requestError.message || 'บันทึกผลตรวจไม่สำเร็จ');
    } finally {
      setReviewingId(null);
    }
  };

  const claimVoucher = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const code = voucher.trim().toUpperCase();
    if (!code) {
      setError('กรอกรหัสคูปองก่อนตรวจสอบ');
      return;
    }
    setVoucherBusy(true);
    try {
      const response = await api.patch(
        `/api/marketplace/redemptions/${encodeURIComponent(code)}/claim`,
        {},
      );
      setNotice(
        `รับคูปอง ${response.data?.rewardTitle || ''} ของ ${response.data?.studentName || ''} สำเร็จ`,
      );
      setVoucher('');
    } catch (requestError) {
      setError(requestError.message || 'ตรวจคูปองไม่สำเร็จ');
    } finally {
      setVoucherBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="STAFF WORKSPACE"
        title="ศูนย์จัดการ"
        description="ตรวจหลักฐานและดูข้อมูลที่ระบบบันทึกจริง"
        action={
          <div>
            <p className="text-xs font-semibold text-gray-500">ผู้ใช้งาน</p>
            <p className="mt-1 text-sm font-extrabold text-gray-900">
              {user?.displayName || '—'}{' '}
              <span className="text-xs font-medium text-gray-500">· {user?.role}</span>
            </p>
          </div>
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
      {notice && (
        <div
          role="status"
          className="flex gap-2 rounded-2xl border border-gray-200 bg-brand-canvas p-4 text-sm font-semibold text-brand-ink"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => {
              setNotice('');
              setError('');
              setSearchParams(id === 'evidence' ? {} : { tab: id });
            }}
            className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold transition sm:text-sm ${tab === id ? 'bg-brand-primary text-white shadow-lg' : 'border border-gray-200 bg-white text-brand-body hover:bg-brand-canvas'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'evidence' && (
        <section className="page-enter">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">PENDING QUEUE</p>
              <h2 className="section-title">หลักฐานรอตรวจ</h2>
            </div>
            <button
              onClick={() => load('evidence')}
              className="button-secondary !px-3 !py-2 text-[11px]"
              disabled={loading}
            >
              รีเฟรช
            </button>
          </div>
          {loading ? (
            <Loading text="กำลังโหลดหลักฐาน…" />
          ) : evidence.length === 0 ? (
            <Empty
              icon={ClipboardCheck}
              title="ไม่มีหลักฐานค้างตรวจ"
              text="รายการใหม่จะแสดงหลังนักเรียนส่งหลักฐานและระบบจัดคิวให้ตรวจ"
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {evidence.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm"
                >
                  {item.imageUrl && (
                    <a
                      href={item.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-h-64 overflow-hidden bg-brand-canvas"
                    >
                      <img
                        src={item.thumbnailUrl || item.imageUrl}
                        alt={`หลักฐาน ${item.id}`}
                        className="max-h-64 w-full object-cover transition hover:scale-[1.02]"
                      />
                    </a>
                  )}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold">
                          {item.user?.displayName || 'ไม่ทราบชื่อ'}
                        </p>
                        <p className="mt-1 text-[11px] text-brand-muted">
                          {item.user?.studentId || 'ไม่มีรหัสนักเรียน'}
                          {item.user?.gradeLevel
                            ? ` · ม.${item.user.gradeLevel}/${item.user.classroom || '—'}`
                            : ''}{' '}
                          · {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">
                        รอตรวจสอบ
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-black text-brand-ink">
                      {ACTION_METADATA[item.type]?.nameThai || item.type}
                    </h3>
                    {item.aiSummaryThai && (
                      <p className="mt-2 rounded-xl bg-brand-canvas p-3 text-xs leading-relaxed text-brand-body">
                        AI: {item.aiSummaryThai}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                      {item.aiConfidence != null && (
                        <span className="rounded-full bg-brand-soft px-2.5 py-1 font-bold text-brand-positive">
                          ความมั่นใจ {Math.round(item.aiConfidence * 100)}%
                        </span>
                      )}
                      {item.similarityScore != null && (
                        <span className="rounded-full bg-brand-soft px-2.5 py-1 font-bold text-brand-positive">
                          ความคล้าย {Math.round(item.similarityScore * 100)}%
                        </span>
                      )}
                    </div>
                    {item.suspiciousReason && (
                      <p className="mt-2 flex gap-1.5 text-[11px] text-amber-800">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        {item.suspiciousReason}
                      </p>
                    )}
                    <label className="mt-4 block text-[11px] font-bold text-brand-body">
                      เหตุผลการปฏิเสธ (ต้องกรอกเมื่อปฏิเสธ)
                      <textarea
                        value={reviewNotes[item.id] || ''}
                        onChange={(event) =>
                          setReviewNotes((previous) => ({
                            ...previous,
                            [item.id]: event.target.value,
                          }))
                        }
                        maxLength={500}
                        rows={2}
                        placeholder="อธิบายสิ่งที่ต้องแก้ไข"
                        className="form-control mt-1 resize-y !py-2"
                      />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={reviewingId !== null}
                        onClick={() => review(item.id, 'APPROVED')}
                        className="button-primary flex-1 justify-center !py-2.5 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />
                        อนุมัติ
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId !== null}
                        onClick={() => review(item.id, 'REJECTED')}
                        className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-extrabold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        ปฏิเสธพร้อมเหตุผล
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="card-panel page-enter">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">USER DIRECTORY</p>
              <h2 className="section-title">บัญชีผู้ใช้</h2>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(search);
              }}
              className="flex w-full gap-2 sm:w-auto"
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาชื่อหรือรหัส"
                className="form-control !min-w-0 !py-2 sm:w-64"
              />
              <button className="button-primary !px-3 !py-2">
                <Search className="h-4 w-4" />
                ค้นหา
              </button>
            </form>
          </div>
          {!isAdmin && (
            <p className="mt-3 text-[11px] text-brand-muted">
              บัญชีเจ้าหน้าที่ดูรายการและสถานะได้ การเปลี่ยนสถานะบัญชีสงวนไว้สำหรับผู้ดูแลระบบ
            </p>
          )}
          {loading ? (
            <Loading text="กำลังโหลดบัญชี…" />
          ) : users.length === 0 ? (
            <Empty icon={Users} title="ไม่พบบัญชีผู้ใช้" text="ลองค้นหาด้วยชื่อหรือรหัสนักเรียน" />
          ) : (
            <div className="mt-4 space-y-2">
              {users.map((person) => (
                <UserCard
                  key={person.id}
                  person={person}
                  isAdmin={isAdmin}
                  onChanged={() => load('users')}
                  setError={setError}
                  setNotice={setNotice}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'vouchers' && (
        <section className="card-panel page-enter">
          <p className="eyebrow">VOUCHER CHECK</p>
          <h2 className="section-title">ตรวจรับคูปอง</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-muted">
            ตรวจรหัสจากการแลกที่ระบบบันทึกไว้ การเปลี่ยนสถานะจะใช้ endpoint จริงและป้องกันการรับซ้ำ
          </p>
          <form onSubmit={claimVoucher} className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row">
            <input
              value={voucher}
              onChange={(event) => setVoucher(event.target.value)}
              placeholder="SR-XXXX-XXXX"
              className="form-control flex-1 font-mono uppercase tracking-wider"
              autoComplete="off"
            />
            <button type="submit" disabled={voucherBusy} className="button-primary justify-center">
              {voucherBusy ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  กำลังตรวจ…
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4" />
                  ยืนยันการรับ
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {tab === 'reports' && (
        <section className="card-panel page-enter">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">SYSTEM REPORTS</p>
              <h2 className="section-title">ภาพรวมข้อมูลจริง</h2>
            </div>
            <button
              onClick={() => load('reports')}
              className="button-secondary !px-3 !py-2 text-[11px]"
              disabled={loading}
            >
              รีเฟรช
            </button>
          </div>
          {loading ? (
            <Loading text="กำลังโหลดรายงาน…" />
          ) : report ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="นักเรียนที่ active" value={report.activeStudents} unit="คน" />
                <Metric label="แต้มในระบบ" value={report.totalPointsInCirculation} unit="แต้ม" />
                <Metric label="ลดคาร์บอน" value={report.totalCo2SavedKg} unit="กก. CO₂e" />
                <Metric label="คูปองรับแล้ว" value={report.totalRewardsClaimed} unit="รายการ" />
              </div>
              <h3 className="mt-6 text-sm font-extrabold">สรุปภารกิจแยกตามสถานะ</h3>
              {Array.isArray(report.actionBreakdown) && report.actionBreakdown.length ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-brand-soft">
                  {report.actionBreakdown.map((row, index) => (
                    <div
                      key={`${row.type}-${row.status}`}
                      className={`flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 text-xs ${index ? 'border-t border-brand-soft' : ''}`}
                    >
                      <span className="font-bold">
                        {ACTION_METADATA[row.type]?.nameThai || row.type}
                      </span>
                      <span className="rounded-full bg-brand-canvas px-2 py-1 font-extrabold text-brand-positive">
                        {statusLabel(row.status)}
                      </span>
                      <b className="tabular-nums">{row.count} รายการ</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-brand-canvas p-4 text-xs text-brand-muted">
                  ยังไม่มีข้อมูลกิจกรรม
                </p>
              )}
            </>
          ) : (
            <Empty icon={FileText} title="ยังไม่มีรายงาน" text="ไม่พบข้อมูลรายงานจาก API" />
          )}
        </section>
      )}
    </div>
  );
}

function Loading({ text }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-brand-muted">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}
function Empty({ icon: Icon, title, text }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-brand-canvas p-8 text-center">
      <Icon className="mx-auto h-7 w-7 text-gray-400" />
      <p className="mt-3 text-sm font-extrabold">{title}</p>
      <p className="mt-1 text-xs text-brand-muted">{text}</p>
    </div>
  );
}
function Metric({ label, value, unit }) {
  return (
    <div className="rounded-2xl bg-brand-canvas p-4">
      <p className="text-[11px] font-bold text-brand-muted">{label}</p>
      <p className="mt-2 text-xl font-black tabular-nums">
        {Number(value || 0).toLocaleString('th-TH')} <small className="text-xs">{unit}</small>
      </p>
    </div>
  );
}
function statusLabel(status) {
  return { APPROVED: 'อนุมัติแล้ว', PENDING: 'รอตรวจ', REJECTED: 'ปฏิเสธ' }[status] || status;
}
function formatDate(value) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function UserCard({ person, isAdmin, onChanged, setError, setNotice }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const changeStatus = async () => {
    if (!reason.trim()) {
      setError('กรุณาระบุเหตุผลก่อนเปลี่ยนสถานะบัญชี');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.patch(`/api/admin/users/${person.id}/status`, {
        isActive: !person.isActive,
        reason: reason.trim(),
      });
      setNotice('อัปเดตสถานะบัญชีแล้ว');
      setReason('');
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || 'เปลี่ยนสถานะไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-2xl border border-brand-soft bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-black text-brand-primary">
          {[...(person.displayName || '?')][0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold">{person.displayName}</p>
          <p className="mt-1 text-[10px] text-brand-muted">
            {person.studentId || person.email || 'ไม่มีรหัส'} ·{' '}
            {person.gradeLevel ? `ม.${person.gradeLevel}/${person.classroom || '—'}` : person.role}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${person.isActive ? 'bg-brand-canvas text-brand-positive' : 'bg-red-100 text-red-800'}`}
        >
          {person.isActive ? 'ใช้งาน' : 'ระงับ'}
        </span>
        <b className="text-xs tabular-nums">
          {Number(person.points || 0).toLocaleString('th-TH')} แต้ม
        </b>
      </div>
      {isAdmin && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="เหตุผลการเปลี่ยนสถานะ"
            className="form-control !py-2 text-xs"
          />
          <button
            type="button"
            disabled={busy}
            onClick={changeStatus}
            className="shrink-0 rounded-xl border border-red-200 px-3 py-2 text-[11px] font-extrabold text-red-700 hover:bg-red-50"
          >
            {busy ? 'กำลังบันทึก…' : person.isActive ? 'ระงับบัญชี' : 'เปิดใช้งาน'}
          </button>
        </div>
      )}
    </article>
  );
}
