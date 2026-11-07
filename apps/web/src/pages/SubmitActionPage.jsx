import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Send,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { ACTION_METADATA, ACTION_TYPES } from '@saveraks/shared/constants';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function SubmitActionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const fileInput = useRef(null);
  const [type, setType] = useState(
    Object.values(ACTION_TYPES).includes(searchParams.get('type'))
      ? searchParams.get('type')
      : ACTION_TYPES.RECYCLE_PET,
  );
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [location, setLocation] = useState(null);
  const [locationState, setLocationState] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestedType = searchParams.get('type');
    if (Object.values(ACTION_TYPES).includes(requestedType)) setType(requestedType);
  }, [searchParams]);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (candidate) => {
    if (!candidate) return;
    if (!allowedTypes.includes(candidate.type)) {
      setError('รองรับไฟล์ JPG, PNG หรือ WebP เท่านั้น');
      return;
    }
    if (candidate.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }
    setError('');
    setResult(null);
    setFile(candidate);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationState('ready');
        setError('');
      },
      () => {
        setLocationState('error');
        setError('ระบุตำแหน่งไม่ได้ ตรวจสอบสิทธิ์ตำแหน่งของเบราว์เซอร์แล้วลองอีกครั้ง');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('กรุณาแนบภาพถ่ายหลักฐาน 1 ภาพ');
      return;
    }
    setLoading(true);
    try {
      const body = new FormData();
      body.append('type', type);
      body.append('description', description.trim());
      body.append('image', file);
      if (location) {
        body.append('latitude', String(location.latitude));
        body.append('longitude', String(location.longitude));
      }
      const response = await api.upload('/api/actions', body);
      const action = response.data?.action;
      if (!response.success || !action)
        throw new Error('ระบบไม่ได้ยืนยันการรับรายการ กรุณาตรวจสอบประวัติกิจกรรมก่อนส่งซ้ำ');
      setResult({
        action,
        message: response.data.message || 'ระบบรับรายการแล้ว',
      });
      await refreshUser();
    } catch (requestError) {
      setError(requestError.message || 'ส่งรายการไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="YOUR CONTRIBUTION"
        title="บันทึกภารกิจ"
        description="เลือกประเภทกิจกรรม แนบภาพจริง แล้วส่งให้ระบบตรวจสอบ"
        action={
          <Link to="/profile" className="button-secondary">
            <ArrowLeft className="h-4 w-4" />
            ประวัติของฉัน
          </Link>
        }
      />
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {result && (
        <ResultNotice
          result={result}
          onClose={() => {
            setResult(null);
            setFile(null);
            setDescription('');
          }}
        />
      )}

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="card-panel page-enter" style={{ animationDelay: '40ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">STEP 01 · ACTIVITY</p>
              <h2 className="section-title">เลือกประเภทกิจกรรม</h2>
            </div>
            <span className="step-index">01</span>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {Object.values(ACTION_TYPES).map((actionType) => {
              const item = ACTION_METADATA[actionType];
              const active = type === actionType;
              return (
                <button
                  key={actionType}
                  type="button"
                  onClick={() => {
                    setType(actionType);
                    setResult(null);
                  }}
                  aria-pressed={active}
                  className={`activity-choice ${active ? 'activity-choice-active' : ''}`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${active ? 'bg-brand-accent text-brand-primary' : 'bg-brand-soft text-brand-primary'}`}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <b className="block text-xs font-extrabold leading-snug">{item.nameThai}</b>
                    <small className="mt-1 block text-[10px] font-medium leading-snug opacity-70">
                      {item.description}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5">
            <label className="mb-2 block text-sm font-extrabold">
              รายละเอียดเพิ่มเติม <span className="font-medium text-brand-muted">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="อธิบายสิ่งที่ทำ เช่น จุดที่ทำกิจกรรมหรือรายละเอียดที่ช่วยให้ตรวจสอบได้"
              className="form-control resize-y"
            />
            <p className="mt-1 text-right text-[11px] text-brand-muted">{description.length}/500</p>
          </div>
          <div className="mt-4 rounded-2xl bg-brand-canvas p-4">
            <p className="text-xs font-extrabold text-brand-ink">ประเภทที่เลือก</p>
            <p className="mt-1 text-sm font-bold text-brand-positive">
              {ACTION_METADATA[type]?.nameThai}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-brand-body">
              คะแนนและผลกระทบจะมาจากผลตรวจฝั่งระบบหลังส่งรายการ
            </p>
          </div>
        </section>

        <section className="card-panel page-enter" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">STEP 02 · EVIDENCE</p>
              <h2 className="section-title">แนบภาพหลักฐาน</h2>
            </div>
            <span className="step-index">02</span>
          </div>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(event) => {
              chooseFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={`evidence-uploader mt-5 ${preview ? 'has-image' : ''}`}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="ตัวอย่างภาพหลักฐานที่เลือก"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-xl bg-brand-primary/90 px-3 py-2 text-xs font-bold text-white">
                  <ImagePlus className="h-4 w-4" />
                  เปลี่ยนภาพ
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center px-4 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-primary">
                  <UploadCloud className="h-7 w-7" />
                </span>
                <b className="mt-3 text-sm">ถ่ายหรือเลือกภาพ</b>
                <small className="mt-1 text-xs text-brand-muted">
                  JPG, PNG, WebP · ไฟล์ไม่เกิน 5 MB · 1 ภาพ
                </small>
              </span>
            )}
          </button>
          {file && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-canvas px-3 py-2 text-xs">
              <span className="truncate font-semibold">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="ลบภาพ"
                className="ml-3 text-red-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="mt-5 rounded-2xl border border-brand-soft p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">แนบตำแหน่ง (ไม่บังคับ)</p>
                <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                  บันทึกพิกัดจากอุปกรณ์เมื่อคุณอนุญาต เพื่อประกอบการตรวจสอบ
                </p>
                {location && (
                  <p className="mt-2 text-[11px] font-semibold text-brand-positive">
                    พร้อมแนบพิกัด {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locationState === 'loading'}
                className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-extrabold text-brand-primary disabled:opacity-50"
              >
                {locationState === 'loading' ? 'กำลังหา…' : location ? 'อัปเดต' : 'ระบุตำแหน่ง'}
              </button>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-2xl bg-brand-canvas p-3 text-xs leading-relaxed text-brand-body">
            <input
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-primary"
            />
            ฉันยืนยันว่าภาพนี้เป็นหลักฐานของกิจกรรมที่ฉันส่ง และข้อมูลประกอบเป็นความจริง
          </label>
          <button
            type="submit"
            disabled={loading || Boolean(result)}
            className="button-primary mt-5 w-full justify-center py-3.5"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                กำลังส่งและตรวจสอบ…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                ส่งหลักฐาน
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-brand-muted">
            ผลส่งและสถานะอนุมัติจะปรากฏในประวัติกิจกรรมของคุณ
          </p>
        </section>
      </form>
    </div>
  );
}

function ResultNotice({ result, onClose }) {
  const action = result.action;
  const pending = action.status === 'PENDING';
  const approved = action.status === 'APPROVED';
  const Icon = pending ? Clock3 : approved ? CheckCircle2 : XCircle;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border p-4 ${pending ? 'border-amber-200 bg-amber-50 text-amber-900' : approved ? 'border-gray-200 bg-brand-canvas text-brand-ink' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <b className="text-sm">
          {pending
            ? 'ส่งเข้าคิวรอตรวจแล้ว'
            : approved
              ? 'ระบบอนุมัติรายการแล้ว'
              : 'รายการถูกปฏิเสธ'}
        </b>
        <p className="mt-1 text-xs leading-relaxed">{result.message}</p>
        <p className="mt-1 text-[11px]">
          สถานะ: {action.status} · {Number(action.pointsAwarded || 0).toLocaleString('th-TH')} แต้ม
        </p>
        {action.rejectReason && <p className="mt-1 text-xs">เหตุผล: {action.rejectReason}</p>}
        <div className="mt-2 flex gap-3 text-xs font-bold underline">
          <Link to="/profile">ดูประวัติ</Link>
          <button type="button" onClick={onClose}>
            ส่งรายการใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
