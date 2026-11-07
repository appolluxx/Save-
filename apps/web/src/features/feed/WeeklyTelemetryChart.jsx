import React from 'react';

export function WeeklyTelemetryChart({ telemetry, loading, unavailable }) {
  const days = Array.isArray(telemetry?.days) ? telemetry.days : [];
  const isUnavailable = unavailable || (telemetry && !Array.isArray(telemetry.days));
  const maxCount = Math.max(1, ...days.map((day) => Number(day.actions || 0)));

  return (
    <section
      aria-labelledby="weekly-telemetry-title"
      className="feed-section-sheet px-4 py-5 sm:px-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="feed-eyebrow">MON — SUN</p>
          <h2 id="weekly-telemetry-title" className="mt-1 text-base font-bold text-brand-ink">
            กิจกรรมสัปดาห์นี้
          </h2>
        </div>
        {telemetry && !isUnavailable ? (
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums text-brand-ink">
              {Number(telemetry.totalActions || 0).toLocaleString('th-TH')} ครั้ง
            </p>
            <p className="text-xs text-gray-500">
              {Number(telemetry.totalCo2SavedKg || 0).toLocaleString('th-TH', {
                maximumFractionDigits: 2,
              })}{' '}
              kgCO₂e
            </p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div
          className="mt-4 grid h-28 grid-cols-7 items-end gap-3"
          aria-label="กำลังโหลดข้อมูลสัปดาห์นี้"
        >
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex h-full flex-col items-center justify-end gap-2">
              <div
                className="w-full animate-pulse rounded-t-sm bg-gray-100"
                style={{ height: `${28 + (index % 3) * 13}%` }}
              />
              <span className="h-3 w-5 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : isUnavailable ? (
        <p className="mt-6 border-t border-gray-100 pt-4 text-sm text-gray-500">
          ขณะนี้ยังโหลดข้อมูลรายสัปดาห์ไม่ได้
        </p>
      ) : (
        <>
          <div
            className="mt-4 grid h-28 grid-cols-7 items-end gap-2 sm:gap-3"
            role="list"
            aria-label="จำนวนกิจกรรมรายวัน ตั้งแต่วันจันทร์ถึงวันอาทิตย์"
          >
            {days.map((day, index) => {
              const count = Number(day.actions || 0);
              const height = count === 0 ? 2 : Math.max(12, (count / maxCount) * 100);
              const isCurrentDay = index === telemetry.currentDayIndex;

              return (
                <div
                  key={day.date}
                  role="listitem"
                  aria-label={`${day.label}: ${count} กิจกรรม${isCurrentDay ? ' วันนี้' : ''}`}
                  className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[10px] font-semibold tabular-nums text-gray-500">
                    {count}
                  </span>
                  <div className="flex h-16 w-full items-end border-b border-gray-200">
                    <div
                      className={`w-full rounded-t-[2px] ${isCurrentDay ? 'bg-brand-primary' : 'bg-gray-300'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span
                    className={`text-[11px] ${isCurrentDay ? 'font-bold text-brand-primary' : 'text-gray-500'}`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          {Number(telemetry.totalActions || 0) === 0 ? (
            <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
              สัปดาห์นี้ยังไม่มีกิจกรรมที่ได้รับการอนุมัติ
            </p>
          ) : (
            <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
              แสดงเฉพาะกิจกรรมที่ได้รับการอนุมัติในเขตเวลาโรงเรียน
            </p>
          )}
        </>
      )}
    </section>
  );
}
