import React, { useState } from 'react';
import {
  Bike,
  BusFront,
  Footprints,
  Activity,
  Recycle,
  TreePine,
  CupSoda,
  Zap,
} from 'lucide-react';

const ACTIVITY_PRESENTATION = {
  RECYCLE_PET: {
    title: 'รีไซเคิลขวด PET',
    shortTitle: 'ขวด PET',
    icon: Recycle,
  },
  RECYCLING_PET: {
    title: 'รีไซเคิลขวด PET',
    shortTitle: 'ขวด PET',
    icon: Recycle,
  },
  RECYCLE_CAN: {
    title: 'รีไซเคิลกระป๋อง',
    shortTitle: 'กระป๋อง',
    icon: Recycle,
  },
  RECYCLING_CAN: {
    title: 'รีไซเคิลกระป๋อง',
    shortTitle: 'กระป๋อง',
    icon: Recycle,
  },
  RECYCLE_PAPER: {
    title: 'รีไซเคิลกระดาษ',
    shortTitle: 'กระดาษ',
    icon: Recycle,
  },
  RECYCLING_PAPER: {
    title: 'รีไซเคิลกระดาษ',
    shortTitle: 'กระดาษ',
    icon: Recycle,
  },
  REUSE_CONTAINER: {
    title: 'ใช้ภาชนะส่วนตัว',
    shortTitle: 'ใช้ซ้ำ',
    icon: CupSoda,
  },
  ZERO_WASTE: {
    title: 'ลดขยะใช้ครั้งเดียว',
    shortTitle: 'ลดขยะ',
    icon: CupSoda,
  },
  PLANT_TREE: {
    title: 'ปลูกและดูแลต้นไม้',
    shortTitle: 'ต้นไม้',
    icon: TreePine,
  },
  TREE_PLANTING: {
    title: 'ปลูกและดูแลต้นไม้',
    shortTitle: 'ต้นไม้',
    icon: TreePine,
  },
  COMMUTE_PUBLIC: {
    title: 'เดินทางด้วยขนส่งสาธารณะ',
    shortTitle: 'ขนส่ง',
    icon: BusFront,
  },
  COMMUTE: {
    title: 'เดินทางด้วยขนส่งสาธารณะ',
    shortTitle: 'ขนส่ง',
    icon: BusFront,
  },
  COMMUTE_WALK: {
    title: 'เดินมาโรงเรียน',
    shortTitle: 'เดิน',
    icon: Footprints,
  },
  WALK: { title: 'เดินมาโรงเรียน', shortTitle: 'เดิน', icon: Footprints },
  COMMUTE_BICYCLE: {
    title: 'ปั่นจักรยานมาโรงเรียน',
    shortTitle: 'จักรยาน',
    icon: Bike,
  },
  BICYCLE: {
    title: 'ปั่นจักรยานมาโรงเรียน',
    shortTitle: 'จักรยาน',
    icon: Bike,
  },
  TREE_PLANT: {
    title: 'ปลูกและดูแลต้นไม้',
    shortTitle: 'ต้นไม้',
    icon: TreePine,
  },
  ENERGY_SAVING: { title: 'ประหยัดพลังงาน', shortTitle: 'พลังงาน', icon: Zap },
};

function getActivityPresentation(type) {
  const normalizedType = String(type || '').toUpperCase();
  return (
    ACTIVITY_PRESENTATION[normalizedType] || {
      title: String(type || 'กิจกรรมรักษ์โลก').replaceAll('_', ' '),
      shortTitle: 'กิจกรรม',
      icon: Activity,
    }
  );
}

function formatNumber(value, maximumFractionDigits = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('th-TH', { maximumFractionDigits }) : '0';
}

function formatActivityDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function ActivityFeedItem({ action }) {
  const [imageFailed, setImageFailed] = useState(false);
  const presentation = getActivityPresentation(action.type);
  const ActivityIcon = presentation.icon;
  const displayName = action.user?.displayName || 'สมาชิกโรงเรียน';
  const initials = Array.from(displayName.trim()).slice(0, 1).join('') || 'ส';
  const imageUrl = action.thumbnailUrl || action.imageUrl;
  const gradeLevel = String(action.user?.gradeLevel || '');
  const className =
    action.user?.gradeLevel && action.user?.classroom
      ? `${gradeLevel.startsWith('ม.') ? gradeLevel : `ม.${gradeLevel}`}/${action.user.classroom}`
      : 'ชุมชนโรงเรียน';

  return (
    <article className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3.5 px-4 py-4 sm:grid-cols-[4.75rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
      <div className="h-[4.25rem] w-[4.25rem] overflow-hidden bg-gray-100 sm:h-[4.75rem] sm:w-[4.75rem]">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={`หลักฐานกิจกรรม${presentation.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-brand-primary"
            aria-hidden="true"
          >
            <ActivityIcon className="h-6 w-6" strokeWidth={1.8} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {action.user?.avatarUrl ? (
            <img
              src={action.user.avatarUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover"
              loading="lazy"
            />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
              aria-hidden="true"
            >
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-brand-ink">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {className}
              {formatActivityDate(action.createdAt)
                ? ` · ${formatActivityDate(action.createdAt)}`
                : ''}
            </p>
          </div>
        </div>

        <h3 className="mt-3 break-words text-sm font-extrabold leading-snug text-brand-ink">
          {action.aiSummaryThai || presentation.title}
        </h3>

        <div className="mt-3 grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-200 pt-2.5">
          <div className="pr-2">
            <p className="feed-eyebrow">แต้ม</p>
            <p className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums text-brand-ink">
              +{formatNumber(action.pointsAwarded)}{' '}
              <span className="text-[10px] font-medium text-gray-500">SRT</span>
            </p>
          </div>
          <div className="px-2">
            <p className="feed-eyebrow">ลด CO₂e</p>
            <p className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums text-brand-ink">
              {formatNumber(action.co2SavedKg, 2)}{' '}
              <span className="text-[10px] font-medium text-gray-500">kg</span>
            </p>
          </div>
          <div className="min-w-0 pl-2">
            <p className="feed-eyebrow">ภารกิจ</p>
            <p
              className="mt-0.5 truncate text-sm font-bold text-brand-ink"
              title={presentation.title}
            >
              {presentation.shortTitle}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
