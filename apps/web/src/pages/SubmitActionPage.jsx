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

  const capturePhoto = async (candidate) => {
    if (!candidate) return;
    if (loading) return;
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
    setLoading(true);
    try {
      const body = new FormData();
      body.append('image', await compressImageForUpload(candidate));
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

  const openCamera = () => {
    if (!loading) fileInput.current?.click();
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

      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <section className="card-panel page-enter" style={{ animationDelay: '40ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">PHOTO · AI · ACTIVITY</p>
              <h2 className="section-title">ถ่ายรูปขยะ</h2>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[10px] font-extrabold text-brand-primary">
              ถ่ายครั้งเดียวจบ
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-brand-muted">
            ถ่ายเสร็จแล้ว AI จะบอกชนิดขยะ แนะนำถัง และบันทึกภารกิจให้อัตโนมัติ ไม่ต้องเลือกประเภท
          </p>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(event) => {
              void capturePhoto(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={openCamera}
            disabled={loading}
            aria-label={preview ? 'ถ่ายรูปขยะอีกครั้ง' : 'เปิดกล้องถ่ายรูปขยะ'}
            className={`evidence-uploader mt-5 ${preview ? 'has-image' : ''} disabled:cursor-wait`}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="ตัวอย่างรูปขยะที่เลือก"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-xl bg-brand-primary/90 px-3 py-2 text-xs font-bold text-white">
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {loading ? 'กำลังวิเคราะห์และบันทึก…' : 'ถ่ายรูปใหม่'}
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center px-4 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-primary">
                  <Camera className="h-7 w-7" />
                </span>
                <b className="mt-3 text-sm">ถ่ายรูปขยะ</b>
                <small className="mt-1 text-xs text-brand-muted">
                  เปิดกล้องแล้วถ่าย 1 รูป · JPG, PNG หรือ WebP · ไม่เกิน 5 MB
                </small>
              </span>
            )}
          </button>

          {file && (
            <div className="mt-3 rounded-xl bg-brand-canvas px-3 py-2 text-xs">
              <span className="block truncate font-semibold">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}

          {loading && (
            <p role="status" className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-brand-primary">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              กำลังให้ AI วิเคราะห์และบันทึกภารกิจ…
            </p>
          )}

          {error && file && !loading && (
            <button type="button" onClick={() => void capturePhoto(file)} className="button-secondary mt-3 w-full justify-center">
              ลองวิเคราะห์รูปนี้อีกครั้ง
            </button>
          )}

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-brand-canvas p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-primary">
              <Info className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-brand-body">
              ผลลัพธ์จะแสดงชนิดขยะ สิ่งที่ AI พบ คำแนะนำเมื่อจำแนกได้ ความมั่นใจ คะแนน และสถานะการตรวจทันทีที่วิเคราะห์เสร็จ
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ScanResult({ result, onReset }) {
  const { action, analysis } = result;
  const pending = action?.status === 'PENDING';
  const approved = action?.status === 'APPROVED';
  const rejected = action?.status === 'REJECTED';
  const manualReview = Boolean(analysis && (!analysis.isValid || analysis.detectedCategory === 'MANUAL_REVIEW'));
  const statusLabel = pending ? 'รอตรวจ' : approved ? 'อนุมัติแล้ว' : rejected ? 'ไม่ผ่าน' : action?.status;
  const Icon = pending ? Clock3 : rejected ? XCircle : manualReview ? AlertCircle : CheckCircle2;
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
      className={`rounded-2xl border p-4 ${pending || manualReview ? 'border-amber-200 bg-amber-50 text-amber-950' : rejected ? 'border-red-200 bg-red-50 text-red-900' : 'border-brand-soft bg-white text-brand-ink'}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <b className="text-sm">
            {manualReview
              ? 'AI ยังจำแนกประเภทไม่ได้'
              : !action
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
                สถานะ: {statusLabel} · {Number(action.pointsAwarded || 0).toLocaleString('th-TH')} แต้ม
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
