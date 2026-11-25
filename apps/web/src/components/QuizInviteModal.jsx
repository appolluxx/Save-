import React from 'react';
import { ClipboardCheck, ExternalLink, X } from 'lucide-react';

const QUIZ_FORM_URL = 'https://forms.gle/TgufEw6v9QHUGvaX8';

export function QuizInviteModal({ onClose, onDismiss }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-invite-title"
        className="modal-card relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
          className="absolute right-4 top-4 rounded-full p-2 text-brand-muted hover:bg-brand-soft"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-canvas text-brand-positive">
          <ClipboardCheck className="h-6 w-6" />
        </span>
        <h2 id="quiz-invite-title" className="mt-4 text-lg font-black">
          ช่วยทำแบบทดสอบให้หน่อยนะ
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-body">
          ร่วมตอบแบบทดสอบผ่าน Google Forms เพื่อช่วยสนับสนุน SaveRaks ได้ที่นี่
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href={QUIZ_FORM_URL}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="button-primary flex-1 justify-center"
          >
            ทำแบบทดสอบ
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onDismiss}
            className="button-secondary flex-1 justify-center"
          >
            ไม่ต้องแสดงอีก
          </button>
        </div>
      </section>
    </div>
  );
}
