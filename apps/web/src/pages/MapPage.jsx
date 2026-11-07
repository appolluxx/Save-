import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LocateFixed,
  MapPin,
  PackageCheck,
  Recycle,
  RefreshCw,
  Send,
  Trash2,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { PIN_TYPES } from '@saveraks/shared/constants';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

const pinMetadata = {
  [PIN_TYPES.FULL_BIN]: {
    label: 'ถังขยะเต็ม',
    icon: <Trash2 className="h-5 w-5" />,
    color: 'text-amber-700',
  },
  [PIN_TYPES.HAZARD]: {
    label: 'จุดอันตราย',
    icon: <TriangleAlert className="h-5 w-5" />,
    color: 'text-red-700',
  },
  [PIN_TYPES.RECYCLING_STATION]: {
    label: 'จุดรีไซเคิล',
    icon: <Recycle className="h-5 w-5" />,
    color: 'text-brand-primary',
  },
  [PIN_TYPES.COMPOST_SITE]: {
    label: 'จุดทำปุ๋ย',
    icon: <PackageCheck className="h-5 w-5" />,
    color: 'text-green-700',
  },
  [PIN_TYPES.MAINTENANCE]: {
    label: 'แจ้งซ่อมบำรุง',
    icon: <Wrench className="h-5 w-5" />,
    color: 'text-slate-700',
  },
};

export function MapPage() {
  const { user, isStaffOrAdmin } = useAuth();
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [kind, setKind] = useState(PIN_TYPES.FULL_BIN);
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const loadPins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/pins');
      if (!response.success || !Array.isArray(response.data))
        throw new Error('ข้อมูลจุดรายงานจากระบบไม่ถูกต้อง');
      setPins(response.data);
    } catch (requestError) {
      setError(requestError.message || 'โหลดจุดรายงานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  const locate = () => {
    if (!navigator.geolocation) {
      setError('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }
    setLocationLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setError('ระบุตำแหน่งไม่ได้ ตรวจสอบสิทธิ์ตำแหน่งของเบราว์เซอร์แล้วลองอีกครั้ง');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const report = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!user) {
      setError('เข้าสู่ระบบก่อนส่งรายงาน');
      return;
    }
    if (!position) {
      setError('กรุณาระบุตำแหน่งก่อนส่งรายงาน');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post('/api/pins', {
        type: kind,
        description: description.trim(),
        ...position,
      });
      if (!response.success || !response.data?.id) throw new Error('ระบบไม่ได้ยืนยันการรับรายงาน');
      setNotice(response.message || 'ระบบรับรายงานแล้ว');
      setDescription('');
      setPosition(null);
      await loadPins();
    } catch (requestError) {
      setError(requestError.message || 'ส่งรายงานไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (id) => {
    setError('');
    setNotice('');
    try {
      setResolvingId(id);
      const response = await api.patch(`/api/pins/${id}/resolve`, {});
      if (!response.success) throw new Error('ระบบไม่ได้ยืนยันการอัปเดตสถานะ');
      setNotice('อัปเดตสถานะเป็นแก้ไขแล้ว');
      await loadPins();
    } catch (requestError) {
      setError(requestError.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CAMPUS REPORTS"
        title="จุดรายงานในโรงเรียน"
        description="แสดงรายงานและพิกัดที่ผู้ใช้ส่งเข้าระบบจริง"
        action={
          <button type="button" onClick={loadPins} className="button-secondary" disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            รีเฟรช
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
      {notice && (
        <div
          role="status"
          className="flex gap-2 rounded-2xl border border-gray-200 bg-brand-canvas p-4 text-sm font-semibold text-brand-ink"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="card-panel page-enter" style={{ animationDelay: '40ms' }}>
          <p className="eyebrow">NEW REPORT</p>
          <h2 className="section-title">แจ้งจุดหรือปัญหา</h2>
          {!user ? (
            <div className="mt-5 rounded-2xl bg-brand-canvas p-5 text-sm leading-relaxed text-brand-body">
              เข้าสู่ระบบเพื่อส่งรายงานพร้อมพิกัดจากอุปกรณ์ของคุณ{' '}
              <Link className="font-extrabold text-brand-primary underline" to="/login">
                เข้าสู่ระบบ
              </Link>
            </div>
          ) : (
            <form onSubmit={report} className="mt-5 space-y-4">
              <div>
                <label htmlFor="pin-type" className="mb-2 block text-xs font-extrabold">
                  ประเภท
                </label>
                <select
                  id="pin-type"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                  className="form-control"
                >
                  {Object.entries(pinMetadata).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pin-description" className="mb-2 block text-xs font-extrabold">
                  รายละเอียด
                </label>
                <textarea
                  id="pin-description"
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="ระบุสิ่งที่พบและบริเวณโดยสังเขป"
                  className="form-control resize-y"
                />
                <p className="mt-1 text-right text-[11px] text-brand-muted">
                  {description.length}/1000
                </p>
              </div>
              <div className="rounded-2xl border border-brand-soft p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-canvas text-brand-positive">
                    <LocateFixed className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">ตำแหน่งรายงาน</p>
                    {position ? (
                      <p className="mt-1 text-xs font-semibold text-brand-positive">
                        {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-brand-muted">
                        ต้องอนุญาตตำแหน่งเพื่อปักพิกัดจริง
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={locate}
                    disabled={locationLoading}
                    className="button-secondary !px-3 !py-2 text-[11px]"
                  >
                    {locationLoading ? 'กำลังหา…' : position ? 'อัปเดต' : 'ระบุตำแหน่ง'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving || !position}
                className="button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    กำลังส่ง…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    ส่งรายงาน
                  </>
                )}
              </button>
              <p className="text-[11px] leading-relaxed text-brand-muted">
                รายงานนี้จะแสดงเฉพาะเมื่อระบบบันทึกสำเร็จ และทีมงานสามารถเปลี่ยนสถานะได้
              </p>
            </form>
          )}
        </section>

        <section className="card-panel page-enter" style={{ animationDelay: '80ms' }}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">OPEN & IN PROGRESS</p>
              <h2 className="section-title">รายการที่ยังเปิดอยู่</h2>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold text-brand-primary">
              {loading ? '…' : pins.length}
            </span>
          </div>
          {loading ? (
            <div className="mt-5 flex items-center gap-2 py-8 text-sm text-brand-muted">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              กำลังโหลดข้อมูลรายงาน…
            </div>
          ) : pins.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-brand-canvas p-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-primary">
                <MapPin className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-extrabold">ยังไม่มีรายงานที่เปิดอยู่</p>
              <p className="mt-1 text-xs text-brand-muted">
                เมื่อมีผู้ส่งรายงานพร้อมพิกัด รายการจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {pins.map((pin) => {
                const meta = pinMetadata[pin.type] || {
                  label: pin.type,
                  icon: <MapPin className="h-5 w-5" />,
                  color: 'text-slate-700',
                };
                const mapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(pin.latitude)}&mlon=${encodeURIComponent(pin.longitude)}#map=19/${encodeURIComponent(pin.latitude)}/${encodeURIComponent(pin.longitude)}`;
                return (
                  <article
                    key={pin.id}
                    className="rounded-2xl border border-brand-soft p-4 transition hover:border-brand-positive"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${meta.color}`}
                        >
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold">{meta.label}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-brand-body">
                            {pin.description}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${pin.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
                      >
                        {pin.status === 'OPEN' ? 'รอดำเนินการ' : 'กำลังดำเนินการ'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-brand-soft pt-3">
                      <span className="text-[10px] text-brand-muted">
                        {Number(pin.latitude).toFixed(4)}, {Number(pin.longitude).toFixed(4)} ·{' '}
                        {new Date(pin.createdAt).toLocaleString('th-TH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-primary"
                        >
                          เปิดแผนที่ <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        {isStaffOrAdmin && (
                          <button
                            type="button"
                            onClick={() => resolve(pin.id)}
                            disabled={resolvingId === pin.id}
                            className="rounded-lg bg-brand-primary px-2.5 py-1.5 text-[10px] font-bold text-white disabled:cursor-wait disabled:opacity-60"
                          >
                            {resolvingId === pin.id ? 'กำลังบันทึก…' : 'ปิดรายงาน'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-canvas p-3 text-[11px] leading-relaxed text-brand-muted">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            หน้านี้แสดงเฉพาะพิกัดรายงานที่มีในระบบ ไม่แสดงตำแหน่งถังหรืออาคารที่ยังไม่มีข้อมูลจริง
          </p>
        </section>
      </div>
    </div>
  );
}
