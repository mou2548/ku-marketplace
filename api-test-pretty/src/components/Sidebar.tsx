'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Key,
  Box,
  Tag,
  Receipt,
  Calendar,
  Star,
  Flag,
  Gift,
  Image as ImageIcon,
  Check,
  Home,
  RotateCcw,
} from 'lucide-react';
import { ALL_STEPS } from '../data/steps';
import { useSession, type SessionData } from '../lib/session-store';

const ICONS: Record<string, React.ElementType> = {
  key: Key,
  box: Box,
  tag: Tag,
  receipt: Receipt,
  calendar: Calendar,
  star: Star,
  flag: Flag,
  gift: Gift,
  image: ImageIcon,
};

// เงื่อนไข "ถือว่าขั้นนี้เริ่มไปแล้ว" ต่อ step — ใช้ตัดสิน checkmark บน progress rail
const STEP_COMPLETE: Record<string, (s: SessionData) => boolean> = {
  auth: (s) => Boolean(s.accessToken),
  items: (s) => s.itemId !== undefined,
  posts: (s) => s.postId !== undefined,
  transactions: (s) => s.transactionId !== undefined,
  appointments: (s) => s.appointmentId !== undefined,
  membership: (s) => s.paymentId !== undefined,
  report: (s) => s.reportId !== undefined,
  giveaways: (s) => s.giveawayId !== undefined,
  uploads: (s) => Boolean(s.lastUploadUrl),
};

export function Sidebar() {
  const pathname = usePathname();
  const { session, reset } = useSession();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">KU</div>
        <div>
          <div className="brand-title">Marketplace</div>
          <div className="brand-subtitle">API Console</div>
        </div>
      </div>

      <Link href="/" className={`sidebar-home ${pathname === '/' ? 'active' : ''}`}>
        <Home size={16} />
        <span>เริ่มต้น / คู่มือ</span>
      </Link>

      <nav className="sidebar-rail">
        {ALL_STEPS.map((step, idx) => {
          const Icon = ICONS[step.icon] ?? Box;
          const done = STEP_COMPLETE[step.id]?.(session) ?? false;
          const isActive = pathname === `/${step.id}`;
          const isLast = idx === ALL_STEPS.length - 1;

          return (
            <div className="rail-item" key={step.id}>
              <div className="rail-track">
                <div className={`rail-dot ${done ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                  {done ? <Check size={12} /> : step.step}
                </div>
                {!isLast && <div className={`rail-line ${done ? 'done' : ''}`} />}
              </div>
              <Link href={`/${step.id}`} className={`rail-label ${isActive ? 'active' : ''}`}>
                <Icon size={15} />
                <span>{step.title}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <button className="sidebar-reset" onClick={reset}>
        <RotateCcw size={13} />
        ล้าง session ทั้งหมด
      </button>
    </aside>
  );
}
