import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [showRoles, setShowRoles] = useState(false);

  if (!showRoles) {
    return (
      <main className="onboarding-page page-enter">
        <BrandLogo className="h-20 w-20 rounded-2xl object-contain" />
        <div className="my-auto flex flex-col items-center">
          <h1 className="mt-8 text-center text-3xl font-black leading-tight tracking-tight text-gray-900 sm:text-4xl">
            เริ่มต้นเล็ก ๆ
            <br />
            เพื่อโรงเรียนที่น่าอยู่
          </h1>
          <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-gray-600">
            ทุกการกระทำเล็ก ๆ ช่วยสร้างพื้นที่ที่ดีขึ้นได้
          </p>
          <img
            src="/assets/figma/mascot-dance.png"
            alt="มาสคอต SaveRaks"
            className="mascot-float my-7 h-56 w-auto object-contain"
          />
          <p className="max-w-sm text-center text-sm font-medium leading-relaxed text-gray-600">
            บันทึกภารกิจ ดูผลลัพธ์ และชวนเพื่อนร่วมทำสิ่งดี ๆ ไปด้วยกัน
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRoles(true)}
          className="button-primary w-full justify-center"
        >
          ไปต่อ
        </button>
      </main>
    );
  }

  return (
    <main className="onboarding-page page-enter">
      <div className="relative w-full pt-3 text-center">
        <button
          type="button"
          onClick={() => setShowRoles(false)}
          className="absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-50"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <BrandLogo className="mx-auto h-16 w-16 rounded-2xl object-contain" />
        <h1 className="mt-6 text-2xl font-black tracking-tight text-gray-900">
          เลือกประเภทผู้ใช้งาน
        </h1>
        <p className="mt-2 text-sm text-gray-500">เพื่อเข้าสู่ระบบ SaveRaks</p>
      </div>

      <div className="my-auto grid w-full gap-4 sm:grid-cols-2">
        <RoleCard
          image="/assets/figma/pixel-student.png"
          label="นักเรียน"
          description="เข้าร่วมภารกิจและติดตามคะแนน"
          onClick={() => navigate('/login?role=student')}
        />
        <RoleCard
          image="/assets/figma/pixel-teacher.png"
          label="คุณครู / เจ้าหน้าที่"
          description="ดูแลหลักฐานและข้อมูลโรงเรียน"
          onClick={() => navigate('/login?role=staff')}
        />
      </div>
    </main>
  );
}

function RoleCard({ image, label, description, onClick }) {
  return (
    <button type="button" onClick={onClick} className="role-card">
      <img src={image} alt="" aria-hidden="true" className="h-28 w-28 object-contain" />
      <span className="mt-3 text-base font-extrabold text-gray-900">{label}</span>
      <span className="mt-1 text-xs leading-relaxed text-gray-500">{description}</span>
    </button>
  );
}
