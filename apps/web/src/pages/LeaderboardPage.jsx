import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Crown, LoaderCircle, Trophy, Users } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [grade, setGrade] = useState('');
  const [classroom, setClassroom] = useState('');
  const [filters, setFilters] = useState({ grade: '', classroom: '' });
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.grade.trim())
      params.set('gradeLevel', filters.grade.trim().replace(/^ม\.?\s*/, ''));
    if (filters.classroom.trim()) params.set('classroom', filters.classroom.trim());
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setFilters({ grade, classroom }), 300);
    return () => window.clearTimeout(timeout);
  }, [grade, classroom]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .get(`/api/leaderboard${query ? `?${query}` : ''}`)
      .then((response) => {
        if (!active) return;
        setStudents(Array.isArray(response.data?.leaderboard) ? response.data.leaderboard : []);
        setStats(response.data?.schoolStats || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'โหลดอันดับไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const podium = students.slice(0, 3);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="SCHOOL IMPACT"
        title="กระดานผู้นำ"
        description="อันดับจากคะแนนที่บันทึกในระบบ · เรียงตามคะแนนรวมปัจจุบัน"
        action={
          <Link to="/" className="button-secondary">
            <Trophy className="h-4 w-4" />
            กลับภาพรวม
          </Link>
        }
      />
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3 page-enter" style={{ animationDelay: '40ms' }}>
        <Summary
          icon={Users}
          label="นักเรียนในระบบ"
          value={stats?.totalStudents}
          suffix="คน"
          loading={loading}
        />
        <Summary
          icon={Trophy}
          label="คะแนนหมุนเวียน"
          value={stats?.totalPointsEarned}
          suffix="แต้ม"
          loading={loading}
        />
        <Summary
          icon={Crown}
          label="ลดคาร์บอนสะสม"
          value={stats?.totalCo2SavedKg}
          suffix="กก. CO₂e"
          loading={loading}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <section className="leaderboard-hero page-enter" style={{ animationDelay: '80ms' }}>
          <p className="eyebrow text-brand-soft">CURRENT LEADERS</p>
          <h2 className="mt-1 text-xl font-black">ผู้มีคะแนนสูงสุด</h2>
          {loading ? (
            <LoadingState />
          ) : podium.length === 0 ? (
            <Empty text="ยังไม่มีข้อมูลอันดับที่ตรงกับตัวกรอง" />
          ) : (
            <div className="mt-6 space-y-3">
              {podium.map((student, index) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  current={student.id === user?.id}
                  featured={index === 0}
                />
              ))}
            </div>
          )}
          <p className="mt-6 text-[11px] leading-relaxed text-white/55">
            อันดับคำนวณจากคะแนนรวมตาม API ปัจจุบัน ตัวกรองรายเดือนยังไม่เปิดใช้ในบริการข้อมูล
          </p>
        </section>

        <section className="card-panel page-enter" style={{ animationDelay: '120ms' }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">STUDENT RANKING</p>
              <h2 className="section-title">อันดับนักเรียน</h2>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-[11px] font-extrabold text-brand-primary">
              สูงสุด 50 รายการ
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-bold text-brand-body">
              ระดับชั้น
              <input
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                placeholder="เช่น 2 หรือ ม.2"
                className="form-control mt-1 !py-2.5"
                inputMode="numeric"
              />
            </label>
            <label className="text-[11px] font-bold text-brand-body">
              ห้อง
              <input
                value={classroom}
                onChange={(event) => setClassroom(event.target.value)}
                placeholder="เช่น 1"
                className="form-control mt-1 !py-2.5"
              />
            </label>
          </div>
          {loading ? (
            <LoadingState />
          ) : students.length === 0 ? (
            <Empty text="ไม่พบข้อมูลนักเรียนตามตัวกรอง" />
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-brand-soft">
              {students.map((student, index) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  current={student.id === user?.id}
                  border={index !== 0}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Summary({ icon: Icon, label, value, suffix, loading }) {
  return (
    <div className="card-panel">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-canvas text-brand-positive">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold text-brand-muted">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums">
        {loading ? '…' : value == null ? '—' : Number(value).toLocaleString('th-TH')}{' '}
        <small className="text-[11px] font-bold text-brand-muted">{suffix}</small>
      </p>
    </div>
  );
}
function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-brand-muted">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      กำลังโหลดข้อมูล…
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="mt-4 rounded-2xl bg-white/5 p-6 text-center text-sm text-white/65">{text}</div>
  );
}
function StudentCard({ student, current, featured }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-4 ${featured ? 'border border-brand-accent/70 bg-brand-accent text-brand-primary' : 'border border-white/10 bg-white/[.08] text-white'}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/90 text-lg font-black text-brand-primary">
        {initial(student.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">
          #{student.rank} · {student.displayName}
          {current ? ' (ฉัน)' : ''}
        </p>
        <p className={`mt-1 text-[11px] ${featured ? 'text-brand-primary/75' : 'text-white/55'}`}>
          {room(student)}
        </p>
      </div>
      <span className="shrink-0 text-right">
        <b className="block text-sm font-black tabular-nums">
          {Number(student.points || 0).toLocaleString('th-TH')}
        </b>
        <small className={`text-[10px] ${featured ? 'text-brand-primary/75' : 'text-white/55'}`}>
          แต้ม
        </small>
      </span>
    </div>
  );
}
function StudentRow({ student, current, border }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 sm:px-4 ${border ? 'border-t border-brand-soft' : ''} ${current ? 'bg-brand-canvas' : 'bg-white'}`}
    >
      <span className="w-8 text-center text-xs font-black tabular-nums text-brand-muted">
        {student.rank}
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-black text-brand-primary">
        {initial(student.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-brand-ink">
          {student.displayName}
          {current ? ' · ฉัน' : ''}
        </p>
        <p className="mt-0.5 text-[10px] text-brand-muted">{room(student)}</p>
      </div>
      <b className="text-xs font-black tabular-nums text-brand-positive">
        {Number(student.points || 0).toLocaleString('th-TH')} <small>แต้ม</small>
      </b>
    </div>
  );
}
function initial(name) {
  return [...(name || '?')][0];
}
function room(student) {
  return student.gradeLevel
    ? `ม.${student.gradeLevel}/${student.classroom || '—'}`
    : 'ไม่ระบุชั้นเรียน';
}
