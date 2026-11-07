import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Info,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  UploadCloud,
} from 'lucide-react';
import { BIN_CATEGORIES } from '@saveraks/shared/constants';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.jsx';

const sample = '/assets/figma/sample-bottles-vision.jpg';
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function VisionPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(sample);
  const [sampleSelected, setSampleSelected] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview(sample);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectFile = (candidate) => {
    if (!candidate) return;
    if (!allowedTypes.includes(candidate.type)) {
      setError('รองรับไฟล์ JPG, PNG หรือ WebP เท่านั้น');
      return;
    }
    if (candidate.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }
    setFile(candidate);
    setSampleSelected(false);
    setAnalysis(null);
    setError('');
  };

  const analyze = async () => {
    if (!file && sampleSelected) {
      setError('เลือกภาพจากอุปกรณ์ก่อนเริ่มวิเคราะห์ ภาพตัวอย่างยังไม่ได้ส่งให้ AI');
      return;
    }
    if (!file) {
      setError('กรุณาเลือกภาพที่ต้องการวิเคราะห์');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await api.upload('/api/actions/scan-preview', body);
      if (!response.success || !response.data) throw new Error('ระบบไม่ได้ส่งผลวิเคราะห์กลับมา');
      setAnalysis(response.data);
    } catch (requestError) {
      setError(requestError.message || 'วิเคราะห์ภาพไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const needsManualReview = analysis?.detectedCategory === 'MANUAL_REVIEW' || !analysis?.isValid;
  const bin = analysis && !needsManualReview ? BIN_CATEGORIES[analysis.recommendedBinColor] : null;
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="AI WASTE GUIDE"
        title="สแกนก่อนทิ้ง"
        description="อัปโหลดภาพเพื่อรับผลวิเคราะห์จากระบบ พร้อมคำแนะนำถังขยะ 4 สี"
        action={
          <Link to="/submit" className="button-secondary">
            บันทึกภารกิจ <ArrowRight className="h-4 w-4" />
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
      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="card-panel page-enter" style={{ animationDelay: '40ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">01 · PHOTO</p>
              <h2 className="section-title">ภาพที่ต้องการตรวจ</h2>
            </div>
            <span className="rounded-full bg-brand-canvas px-3 py-1 text-[10px] font-extrabold text-brand-positive">
              JPG · PNG · WebP
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-[24px] bg-brand-soft">
            <img
              src={preview}
              alt={sampleSelected ? 'ภาพตัวอย่างสำหรับเริ่มต้น' : 'ภาพที่เลือกสำหรับวิเคราะห์'}
              className="h-full w-full object-cover"
            />
            {sampleSelected && (
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-brand-ink shadow-sm">
                ภาพตัวอย่าง · ยังไม่วิเคราะห์
              </span>
            )}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-primary/65 text-white backdrop-blur-sm">
                <RefreshCw className="h-9 w-9 animate-spin text-brand-positive" />
                <span className="mt-3 text-sm font-extrabold">กำลังวิเคราะห์ภาพ…</span>
                <small className="mt-1 text-xs text-white/70">รอผลจากระบบ AI</small>
              </div>
            )}
            {!loading && analysis && (
              <span
                className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white ${needsManualReview ? 'bg-amber-700' : 'bg-brand-primary'}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {needsManualReview ? 'รอตรวจสอบเพิ่มเติม' : 'วิเคราะห์เสร็จแล้ว'}
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="button-primary justify-center"
            >
              <Camera className="h-4 w-4" />
              ถ่ายหรือเลือกภาพ
            </button>
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !file}
              className="button-secondary justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ScanLine className="h-4 w-4" />
              {loading ? 'กำลังวิเคราะห์…' : 'วิเคราะห์ภาพ'}
            </button>
          </div>
          {!file && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-xs font-bold text-brand-body hover:bg-brand-canvas"
            >
              <UploadCloud className="h-4 w-4" />
              เลือกภาพของคุณ · ไม่เกิน 5 MB
            </button>
          )}
        </div>

        <div className="card-panel page-enter" style={{ animationDelay: '80ms' }}>
          <div>
            <p className="eyebrow">02 · RESULT</p>
            <h2 className="section-title">คำแนะนำการคัดแยก</h2>
          </div>
          {!analysis ? (
            <div className="mt-5 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-brand-canvas px-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-primary">
                <ScanLine className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-sm font-extrabold">ยังไม่มีผลวิเคราะห์</h3>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-brand-muted">
                เลือกภาพจริงจากอุปกรณ์ แล้วกด “วิเคราะห์ภาพ” เพื่อเรียกใช้ระบบ AI
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div
                className={`rounded-2xl p-4 ${needsManualReview ? 'bg-amber-50' : 'bg-brand-canvas'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                      {needsManualReview ? 'CLASSIFICATION STATUS' : 'AI CLASSIFICATION'}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-brand-ink">
                      {needsManualReview ? 'ยังจำแนกไม่ได้' : analysis.detectedCategory}
                    </h3>
                  </div>
                  {!needsManualReview && (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-brand-positive">
                      {Math.round(Number(analysis.confidence) * 100)}% มั่นใจ
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-brand-body">
                  {analysis.thaiSummary}
                </p>
              </div>
              {bin && (
                <div className="flex items-start gap-3 rounded-2xl border border-brand-soft p-4">
                  <span
                    className="mt-0.5 h-4 w-4 shrink-0 rounded-full ring-4 ring-black/5"
                    style={{ backgroundColor: bin.hexColor }}
                  />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                      ถังที่แนะนำ
                    </p>
                    <h3 className="mt-1 text-sm font-extrabold text-brand-ink">{bin.nameThai}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-brand-body">
                      {bin.instructionsThai}
                    </p>
                  </div>
                </div>
              )}
              {Array.isArray(analysis.detectedObjects) && analysis.detectedObjects.length > 0 && (
                <div>
                  <p className="text-xs font-extrabold text-brand-ink">สิ่งที่ระบบตรวจพบ</p>
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
              {needsManualReview && (
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  <Info className="h-4 w-4 shrink-0" />
                  ระบบยังให้คำแนะนำถังจากภาพนี้ไม่ได้{' '}
                  {analysis.isValid
                    ? 'รายละเอียดนี้ควรผ่านการตรวจจากเจ้าหน้าที่ก่อน'
                    : 'ระบบระบุว่าภาพนี้ยังไม่ใช่หลักฐานกิจกรรมรักษ์โลกที่ยืนยันได้'}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setAnalysis(null);
                  setFile(null);
                  setSampleSelected(true);
                  setError('');
                }}
                className="button-secondary w-full justify-center"
              >
                <RefreshCw className="h-4 w-4" />
                เริ่มใหม่
              </button>
            </div>
          )}
          <p className="mt-5 text-[11px] leading-relaxed text-brand-muted">
            ผลสแกนเป็นคำแนะนำเบื้องต้น การตรวจหลักฐานเพื่อรับแต้มใช้ flow ส่งภารกิจและผลตรวจจากระบบ
          </p>
        </div>
      </section>
    </div>
  );
}
