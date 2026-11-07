import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';

export function WelcomePage() {
  const navigate = useNavigate();
  const { isStaffOrAdmin } = useAuth();

  function handleProceed() {
    navigate(isStaffOrAdmin ? '/admin' : '/');
  }

  return (
    <main className="welcome-shell page-enter">
      <div className="welcome-content">
        <p className="eyebrow">โรงเรียนสุรศักดิ์มนตรี</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
          ยินดีต้อนรับเข้าสู่
        </h1>
        <BrandLogo className="mx-auto mt-5 h-24 w-24 rounded-2xl object-contain" />

        <img
          src="/assets/figma/mascot-earth.png"
          alt="มาสคอต SaveRaks กอดโลก"
          className="mascot-float mx-auto my-8 h-56 w-auto object-contain sm:h-64"
        />

        <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-600">
          ร่วมบันทึกกิจกรรม ดูผลกระทบ และช่วยกันดูแลพื้นที่โรงเรียนของเรา
        </p>
        <button
          type="button"
          onClick={handleProceed}
          className="button-primary mt-8 w-full justify-center"
        >
          ไปต่อ <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
