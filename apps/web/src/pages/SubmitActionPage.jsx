import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  Info,
  LoaderCircle,
  Send,
  XCircle,
} from 'lucide-react';
import { ACTION_METADATA, ACTION_TYPES, BIN_CATEGORIES } from '@saveraks/shared/constants';
import { api } from '../api/client.js';
import { compressImageForUpload } from '../features/compressImageForUpload.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const AI_CATEGORY_LABELS = Object.freeze({
  ORGANIC_FOOD: 'ขยะเปียก / เศษอาหาร',
  GENERAL_WRAPPER: 'ขยะทั่วไป / ซองบรรจุภัณฑ์',
  HAZARDOUS_BATTERY: 'ขยะอันตราย / แบตเตอรี่',
  MANUAL_REVIEW: 'ยังจำแนกประเภทไม่ได้',
});

export function SubmitActionPage() {
  const { refreshUser } = useAuth();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('กรุณาถ่ายรูปขยะก่อนส่งให้ AI');
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append('image', await compressImageForUpload(file));
      const response = await api.upload('/api/actions', body);
      const data = response.data;
      if (!response.success || (!data?.action && !data?.analysis)) {
        throw new Error('ระบบไม่ได้ส่งผลวิเคราะห์กลับมา กรุณาลองใหม่');
      }

      setResult({
        action: data.action || null,
        analysis: data.analysis || null,
        message: data.message || 'AI วิเคราะห์ภาพเสร็จแล้ว',
      });
      if (data.action) await refreshUser();
    } catch (requestError) {
      setError(requestError.message || 'วิเคราะห์ภาพไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setError('');
    setFile(null);
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="AI WASTE SCAN"
        title="สแกนและบันทึกขยะ"
        description="ถ่ายรูปขยะหนึ่งภาพ แล้วให้ AI จำแนกประเภทและบันทึกภารกิจให้โดยอัตโนมัติ"
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

      {result && <ScanResult result={result} onReset={resetScan} />}

      <form onSubmit={submit} className="mx-auto grid w-full max-w-3xl gap-5">
        <section className="card-panel page-enter" style={{ animationDelay: '40ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">STEP 01 · PHOTO</p>
              <h2 className="section-title">ถ่ายรูปขยะ</h2>
            </div>
            <span className="step-index">01</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-brand-muted">
            ระบบจะอ่านชนิดขยะจากภาพให้เอง ไม่ต้องเลือกประเภทกิจกรรม
          </p>
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
            aria-label={preview ? 'เปลี่ยนรูปขยะ' : 'ถ่ายรูปขยะ'}
            className={`evidence-uploader mt-5 ${preview ? 'has-image' : ''}`}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="ตัวอย่างรูปขยะที่เลือก"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-xl bg-brand-primary/90 px-3 py-2 text-xs font-bold text-white">
                  <Camera className="h-4 w-4" />
                  เปลี่ยนรูป
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center px-4 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-primary">
                  <Camera className="h-7 w-7" />
                </span>
                <b className="mt-3 text-sm">ถ่ายรูปขยะ</b>
                <small className="mt-1 text-xs text-brand-muted">
                  JPG, PNG หรือ WebP · ไม่เกิน 5 MB · 1 รูป
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
                aria-label="ลบรูป"
                className="ml-3 text-red-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-brand-canvas p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-primary">
              <Info className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-brand-body">
              AI จะตรวจภาพและเลือกประเภทให้อัตโนมัติ รายการที่จำแนกได้และผ่านการตรวจสอบจะได้รับคะแนน
              ส่วน PET/CAN จะเพิ่มยอดแลกกระทงเมื่ออนุมัติแล้ว
            </p>
          </div>

          <button
            type="submit"
            disabled={!file || loading || Boolean(result)}
            className="button-primary mt-5 w-full justify-center py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                กำลังย่อรูปและวิเคราะห์…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                ส่งรูปให้ AI ตรวจและบันทึก
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-brand-muted">
            ส่งเฉพาะรูปที่ถ่ายจากขยะจริง ระบบไม่ใช้ภาพตัวอย่างเพื่อรับคะแนน
          </p>
        </section>
      </form>
    </div>
  );
}

function ScanResult({ result, onReset }) {
  const { action, analysis } = result;
  const pending = action?.status === 'PENDING';
  const approved = action?.status === 'APPROVED';
  const rejected = action?.status === 'REJECTED';
  const Icon = pending ? Clock3 : rejected ? XCircle : CheckCircle2;
  const detectedCategory = analysis?.detectedCategory || action?.type;
  const categoryLabel =
    ACTION_METADATA[detectedCategory]?.nameThai || AI_CATEGORY_LABELS[detectedCategory] || detectedCategory;
  const canRecommendBin = analysis?.isValid && detectedCategory !== 'MANUAL_REVIEW';
  const binCode = canRecommendBin
    ? analysis?.recommendedBinColor || ACTION_METADATA[action?.type]?.binColor
    : null;
  const bin = binCode ? BIN_CATEGORIES[binCode] : null;
  const eventEligible = [ACTION_TYPES.RECYCLE_PET, ACTION_TYPES.RECYCLE_CAN].includes(action?.type);

  return (
    <section
      role="status"
      className={`rounded-2xl border p-4 ${pending ? 'border-amber-200 bg-amber-50 text-amber-950' : rejected ? 'border-red-200 bg-red-50 text-red-900' : 'border-brand-soft bg-white text-brand-ink'}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <b className="text-sm">
            {!action
              ? 'AI วิเคราะห์ภาพแล้ว'
              : pending
                ? 'ส่งเข้าคิวรอตรวจแล้ว'
                : approved
                  ? 'บันทึกภารกิจสำเร็จ'
                  : 'ระบบปฏิเสธรายการ'}
          </b>
          {categoryLabel && <p className="mt-1 text-sm font-extrabold">{categoryLabel}</p>}
          <p className="mt-1 text-xs leading-relaxed">
            {analysis?.thaiSummary || result.message}
          </p>

          {analysis?.confidence != null && (
            <p className="mt-2 text-[11px] font-semibold">
              ความมั่นใจของ AI {Math.round(Number(analysis.confidence) * 100)}%
            </p>
          )}

          {bin && (
            <div className="mt-3 rounded-xl bg-brand-canvas p-3 text-brand-ink">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                ถังที่แนะนำ
              </p>
              <p className="mt-1 text-sm font-extrabold">{bin.nameThai}</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-body">{bin.instructionsThai}</p>
            </div>
          )}

          {action ? (
            <>
              <p className="mt-2 text-[11px]">
                สถานะ: {action.status} · {Number(action.pointsAwarded || 0).toLocaleString('th-TH')} แต้ม
              </p>
              {eventEligible && pending && (
                <p className="mt-2 rounded-xl bg-white/80 p-2 text-[11px] leading-relaxed">
                  รายการ PET/CAN จะเพิ่มยอดแลกกระทงหลังได้รับอนุมัติ
                </p>
              )}
              {action.rejectReason && <p className="mt-1 text-xs">เหตุผล: {action.rejectReason}</p>}
            </>
          ) : (
            <p className="mt-2 rounded-xl bg-brand-canvas p-2 text-[11px] leading-relaxed text-brand-body">
              {result.message}
            </p>
          )}

          {Array.isArray(analysis?.detectedObjects) && analysis.detectedObjects.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-extrabold">สิ่งที่ AI ตรวจพบ</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {analysis.detectedObjects.map((object, index) => (
                  <span
                    key={`${object}-${index}`}
                    className="rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-semibold text-brand-body"
                  >
                    {object}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold underline">
            {action && <Link to="/profile">ดูประวัติ</Link>}
            {eventEligible && <Link to="/shop">ดูยอดแลกกระทง</Link>}
            <button type="button" onClick={onReset}>
              สแกนรูปถัดไป
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
