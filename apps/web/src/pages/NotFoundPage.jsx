import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-start justify-center">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">ไม่พบหน้านี้</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
        ลิงก์อาจไม่ถูกต้องหรือหน้านี้ถูกย้ายแล้ว กลับไปหน้าแรกเพื่อเลือกเมนูอีกครั้ง
      </p>
      <Link to="/" className="button-primary mt-6">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        กลับหน้าแรก
      </Link>
    </main>
  );
}
