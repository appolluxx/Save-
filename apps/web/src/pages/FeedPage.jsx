import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  MapPinned,
  Recycle,
  ScanLine,
  Trophy,
  Users,
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { ActivityFeedItem } from '../features/feed/ActivityFeedItem.jsx';

const SHORTCUTS = [
  { to: '/vision', label: 'สแกนขยะ', detail: 'ดูแนวทางคัดแยก', icon: ScanLine },
  {
    to: '/submit',
    label: 'บันทึกภารกิจ',
    detail: 'ส่งกิจกรรมพร้อมหลักฐาน',
    icon: Camera,
  },
  {
    to: '/map',
    label: 'แผนที่รายงาน',
    detail: 'ดูจุดที่ชุมชนแจ้งไว้',
    icon: MapPinned,
  },
  {
    to: '/leaderboard',
    label: 'กระดานผู้นำ',
    detail: 'ติดตามคะแนนสะสม',
    icon: Trophy,
  },
];

export function FeedPage() {
  const { user, connectionError } = useAuth();
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.allSettled([api.get('/api/actions?limit=5'), api.get('/api/leaderboard')])
      .then(([actionsResult, leaderboardResult]) => {
        if (!active) return;

        if (actionsResult.status === 'fulfilled') {
          const actions = actionsResult.value.data?.actions;
          setFeed(Array.isArray(actions) ? actions : []);
        } else {
          setFeedError(actionsResult.reason?.message || 'โหลดกิจกรรมไม่สำเร็จ');
        }

        if (leaderboardResult.status === 'fulfilled') {
          setStats(leaderboardResult.value.data?.schoolStats || null);
        } else {
          setStatsError(leaderboardResult.reason?.message || 'โหลดสถิติโรงเรียนไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const pageAction = user ? (
    <div className="text-right">
      <p className="text-xs font-semibold text-gray-500">คะแนนของฉัน</p>
      <p className="mt-0.5 text-lg font-black tabular-nums text-gray-900">
        {Number(user.points || 0).toLocaleString('th-TH')}
        <span className="ml-1 text-xs font-bold text-gray-500">แต้ม</span>
      </p>
    </div>
  ) : null;

  return (
    <div className="page-stack feed-page">
      <PageHeader
        eyebrow="SAVE RAKS · CAMPUS ECO"
        title="พื้นที่รักษ์โลก"
        description="กิจกรรมและข้อมูลที่บันทึกจากชุมชนโรงเรียน"
        action={pageAction}
      />

      <section className="dashboard-hero page-enter">
        <div className="dashboard-hero-copy">
          <p className="dashboard-kicker">ลงมือทีละอย่าง เปลี่ยนโรงเรียนไปด้วยกัน</p>
          <h2 className="dashboard-hero-title">
            ทุกภารกิจเล็ก ๆ
            <br className="hidden sm:block" /> สร้างผลลัพธ์ที่วัดได้
          </h2>
          <p className="dashboard-hero-description">
            บันทึกกิจกรรมพร้อมหลักฐาน ดูผลที่ได้รับการยืนยัน และชวนเพื่อนร่วมดูแลพื้นที่ของเรา
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/submit" className="button-lime">
              <Camera aria-hidden="true" className="h-4 w-4" />
              บันทึกภารกิจ
            </Link>
            <Link to="/vision" className="button-outline-light">
              <ScanLine aria-hidden="true" className="h-4 w-4" />
              สแกนขยะ
            </Link>
          </div>
        </div>

        <div className="dashboard-metrics" aria-label="สถิติรวมของโรงเรียน">
          <StatMetric
            icon={Users}
            label="นักเรียนที่ร่วม"
            value={stats?.totalStudents}
            loading={loading}
          />
          <StatMetric
            icon={Activity}
            label="แต้มที่หมุนเวียน"
            value={stats?.totalPointsEarned}
            suffix="แต้ม"
            loading={loading}
          />
          <StatMetric
            icon={Recycle}
            label="ลดคาร์บอนสะสม"
            value={stats?.totalCo2SavedKg}
            suffix="กก. CO₂e"
            loading={loading}
          />
        </div>
      </section>
      {statsError && !connectionError && (
        <div className="feedback-message is-error" role="status">
          {statsError}
        </div>
      )}

      <section aria-labelledby="quick-actions-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">START HERE</p>
            <h2 id="quick-actions-title" className="section-title">
              เลือกสิ่งที่อยากทำ
            </h2>
          </div>
          <Link to="/shop" className="text-link hidden sm:inline-flex">
            ดูร้านค้าสวัสดิการ <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="quick-actions">
          {SHORTCUTS.map(({ to, label, detail, icon: Icon }) => (
            <Link key={to} to={to} className="quick-action-link">
              <Icon aria-hidden="true" className="h-5 w-5 text-brand-primary" strokeWidth={1.9} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-gray-900">{label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-500">{detail}</span>
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
            </Link>
          ))}
        </div>
        <Link to="/shop" className="text-link mt-4 sm:hidden">
          ดูร้านค้าสวัสดิการ <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>

      <section className="card-panel page-enter" aria-labelledby="community-feed-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">COMMUNITY FEED</p>
            <h2 id="community-feed-title" className="section-title">
              กิจกรรมล่าสุด
            </h2>
          </div>
          <span className="verified-label">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            อนุมัติแล้ว
          </span>
        </div>

        {feedError && connectionError ? (
          <p className="mt-5 text-sm text-gray-500" role="status">
            รายการกิจกรรมจะแสดงเมื่อเชื่อมต่อเซิร์ฟเวอร์ได้
          </p>
        ) : feedError ? (
          <div role="alert" className="feedback-message is-error mt-5">
            {feedError}
          </div>
        ) : loading ? (
          <LoadingRows />
        ) : feed.length === 0 ? (
          <div className="empty-inline mt-5">
            <Activity aria-hidden="true" className="h-5 w-5" />
            <p>ยังไม่มีรายการกิจกรรมที่อนุมัติให้แสดง</p>
          </div>
        ) : (
          <div className="feed-list mt-3">
            {feed.map((item) => (
              <ActivityFeedItem key={item.id} action={item} />
            ))}
          </div>
        )}

        <Link to="/leaderboard" className="text-link mt-5">
          ดูผลกระทบและอันดับ <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function StatMetric({ icon: Icon, label, value, suffix, loading }) {
  return (
    <div className="feed-metric">
      <div className="flex items-center gap-2 text-white/75">
        <Icon aria-hidden="true" className="h-4 w-4" />
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black leading-none tabular-nums text-white">
        {loading ? (
          <span className="inline-block h-6 w-14 animate-pulse rounded bg-white/20" />
        ) : value == null ? (
          '—'
        ) : (
          Number(value).toLocaleString('th-TH')
        )}
      </p>
      {suffix && <p className="mt-1 text-[11px] font-semibold text-white/60">{suffix}</p>}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mt-5 divide-y divide-gray-200" role="status" aria-label="กำลังโหลดกิจกรรม">
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex gap-3 py-4">
          <span className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            <span className="block h-3 w-1/2 animate-pulse rounded bg-gray-100" />
          </span>
        </div>
      ))}
    </div>
  );
}
