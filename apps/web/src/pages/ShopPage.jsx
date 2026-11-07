import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PackageOpen,
  ShoppingBag,
  Ticket,
  X,
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function ShopPage() {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [tab, setTab] = useState('catalog');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [catalogResult, redemptionResult] = await Promise.allSettled([
      api.get('/api/marketplace/items'),
      api.get('/api/marketplace/redemptions'),
    ]);
    if (catalogResult.status === 'fulfilled')
      setItems(Array.isArray(catalogResult.value.data) ? catalogResult.value.data : []);
    else setError(catalogResult.reason?.message || 'โหลดรายการแลกของไม่สำเร็จ');
    if (redemptionResult.status === 'fulfilled')
      setRedemptions(Array.isArray(redemptionResult.value.data) ? redemptionResult.value.data : []);
    else
      setError((previous) =>
        previous
          ? `${previous} · โหลดคูปองไม่สำเร็จ`
          : redemptionResult.reason?.message || 'โหลดคูปองไม่สำเร็จ',
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const purchase = async () => {
    if (!selectedItem) return;
    setPurchasing(true);
    setError('');
    setNotice(null);
    try {
      const response = await api.post('/api/marketplace/purchase', {
        rewardItemId: selectedItem.id,
      });
      if (!response.success || !response.data?.redemption?.redemptionCode)
        throw new Error('ระบบไม่ได้ยืนยันการแลกรางวัล');
      setNotice(response.data.redemption);
      setSelectedItem(null);
      await Promise.all([refreshUser(), loadData()]);
    } catch (requestError) {
      setError(requestError.message || 'แลกรางวัลไม่สำเร็จ');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="SCHOOL MARKETPLACE"
        title="ร้านค้าสวัสดิการ"
        description="รายการและคูปองที่แสดงมาจากข้อมูลร้านค้าในระบบ"
        action={
          <div>
            <p className="text-xs font-semibold text-gray-500">แต้มคงเหลือในบัญชี</p>
            <p className="mt-1 text-lg font-black tabular-nums text-gray-900">
              {Number(user?.points || 0).toLocaleString('th-TH')}{' '}
              <small className="text-xs font-bold text-gray-500">แต้ม</small>
            </p>
          </div>
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
      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-brand-canvas p-4"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
          <div className="flex-1">
            <p className="text-sm font-extrabold text-brand-ink">แลกสำเร็จ · {notice.title}</p>
            <p className="mt-1 text-xs text-brand-body">รหัสคูปองของคุณ</p>
            <p className="mt-1 font-mono text-lg font-black tracking-wider text-brand-primary">
              {notice.redemptionCode}
            </p>
            <p className="mt-1 text-[11px] text-brand-muted">
              แสดงรหัสนี้ให้เจ้าหน้าที่เมื่อไปรับสิทธิ์
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="ปิด"
            className="text-brand-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="inline-flex w-fit rounded-2xl border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('catalog')}
          aria-pressed={tab === 'catalog'}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === 'catalog' ? 'bg-brand-primary text-white' : 'text-brand-muted'}`}
        >
          รายการแลกของ
        </button>
        <button
          type="button"
          onClick={() => setTab('vouchers')}
          aria-pressed={tab === 'vouchers'}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === 'vouchers' ? 'bg-brand-primary text-white' : 'text-brand-muted'}`}
        >
          คูปองของฉัน <span className="ml-1 opacity-70">{redemptions.length}</span>
        </button>
      </div>

      {tab === 'catalog' ? (
        <section className="page-enter">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="eyebrow">LIVE CATALOG</p>
              <h2 className="section-title">ของรางวัลที่มีในระบบ</h2>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="button-secondary !px-3 !py-2 text-[11px]"
              disabled={loading}
            >
              <span className={loading ? 'animate-spin' : ''}>↻</span>รีเฟรช
            </button>
          </div>
          {loading ? (
            <LoadingCards />
          ) : items.length === 0 ? (
            <Empty
              icon={PackageOpen}
              title="ยังไม่มีของรางวัล"
              description="เมื่อมีรายการเปิดใช้งานในระบบ รายการจะปรากฏที่นี่"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="reward-card group">
                  <div className="relative grid aspect-[16/9] place-items-center overflow-hidden bg-brand-canvas">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-primary">
                        <ShoppingBag className="h-7 w-7" />
                      </span>
                    )}
                    {item.stock <= 0 && (
                      <span className="absolute inset-0 grid place-items-center bg-brand-primary/70 text-sm font-black text-white">
                        สินค้าหมด
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-brand-ink">{item.title}</h3>
                      <span className="shrink-0 rounded-full bg-brand-canvas px-2.5 py-1 text-[10px] font-black text-brand-positive">
                        {Number(item.cost).toLocaleString('th-TH')} แต้ม
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-relaxed text-brand-muted">
                      {item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-brand-soft pt-3">
                      <span className="text-[11px] font-semibold text-brand-muted">
                        คงเหลือ {Number(item.stock).toLocaleString('th-TH')}
                      </span>
                      <button
                        type="button"
                        disabled={item.stock <= 0 || Number(user?.points || 0) < Number(item.cost)}
                        onClick={() => setSelectedItem(item)}
                        className="button-primary !px-3 !py-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {Number(user?.points || 0) < Number(item.cost) ? 'แต้มไม่พอ' : 'แลกรางวัล'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="page-enter">
          <div className="mb-3">
            <p className="eyebrow">YOUR VOUCHERS</p>
            <h2 className="section-title">คูปองและประวัติการแลก</h2>
          </div>
          {loading ? (
            <LoadingCards />
          ) : redemptions.length === 0 ? (
            <Empty
              icon={Ticket}
              title="ยังไม่มีคูปอง"
              description="แลกรางวัลจากรายการที่มี เพื่อรับรหัสคูปองของคุณ"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {redemptions.map((redemption) => (
                <article
                  key={redemption.id}
                  className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-canvas text-brand-positive">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold">{redemption.rewardTitle}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${redemption.status === 'CLAIMED' ? 'bg-slate-100 text-slate-600' : 'bg-brand-canvas text-brand-positive'}`}
                      >
                        {redemption.status === 'CLAIMED'
                          ? 'รับสิทธิ์แล้ว'
                          : redemption.status === 'PENDING'
                            ? 'พร้อมใช้'
                            : redemption.status}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-black tracking-wide text-brand-primary">
                      {redemption.redemptionCode}
                    </p>
                    <p className="mt-1 text-[10px] text-brand-muted">
                      ใช้ {Number(redemption.costAtPurchase).toLocaleString('th-TH')} แต้ม ·{' '}
                      {new Date(redemption.createdAt).toLocaleString('th-TH', {
                        dateStyle: 'medium',
                      })}
                    </p>
                    {redemption.rewardDescription && (
                      <p className="mt-2 text-xs text-brand-body">{redemption.rewardDescription}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedItem && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !purchasing) setSelectedItem(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="modal-card"
          >
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              disabled={purchasing}
              aria-label="ปิด"
              className="absolute right-4 top-4 rounded-full p-2 text-brand-muted hover:bg-brand-soft"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-canvas text-brand-positive">
              <Ticket className="h-6 w-6" />
            </span>
            <h2 id="confirm-title" className="mt-4 text-lg font-black">
              ยืนยันการแลกรางวัล
            </h2>
            <p className="mt-2 text-sm text-brand-body">{selectedItem.title}</p>
            <div className="mt-4 flex justify-between rounded-xl bg-brand-canvas p-3 text-sm">
              <span className="text-brand-muted">ใช้แต้มตามราคาปัจจุบัน</span>
              <b>{Number(selectedItem.cost).toLocaleString('th-TH')} แต้ม</b>
            </div>
            <div className="mt-2 flex justify-between px-1 text-xs text-brand-muted">
              <span>คงเหลือหลังแลกโดยประมาณ</span>
              <b>
                {Math.max(0, Number(user?.points || 0) - Number(selectedItem.cost)).toLocaleString(
                  'th-TH',
                )}{' '}
                แต้ม
              </b>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-brand-muted">
              ระบบจะตรวจราคา ยอดแต้ม และจำนวนสินค้าอีกครั้งก่อนยืนยัน
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setSelectedItem(null)}
                disabled={purchasing}
                className="button-secondary flex-1 justify-center"
              >
                ยกเลิก
              </button>
              <button
                onClick={purchase}
                disabled={purchasing}
                className="button-primary flex-1 justify-center"
              >
                {purchasing ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    กำลังแลก…
                  </>
                ) : (
                  'ยืนยันแลก'
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((id) => (
        <div key={id} className="overflow-hidden rounded-2xl border border-brand-soft bg-white">
          <div className="aspect-[16/9] animate-pulse bg-brand-soft" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-2/3 animate-pulse rounded bg-brand-soft" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-brand-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}
function Empty({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-canvas text-brand-positive">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-extrabold text-brand-ink">{title}</p>
      <p className="mt-1 text-xs text-brand-muted">{description}</p>
    </div>
  );
}
