'use client';

import { useState } from 'react';
import { Copy, CheckCheck } from 'lucide-react';
import { useSession } from '../lib/session-store';

const LABELS: Record<string, string> = {
  accessToken: 'Access Token',
  email: 'อีเมล',
  isAdmin: 'เป็น Admin',
  lastOtp: 'OTP ล่าสุด',
  itemId: 'Item ID',
  postId: 'Post ID',
  offerId: 'Offer ID',
  transactionId: 'Transaction ID',
  appointmentId: 'Appointment ID',
  giveawayId: 'Giveaway ID',
  ticketId: 'Ticket ID',
  recipientId: 'Recipient ID',
  reportId: 'Report ID',
  appealId: 'Appeal ID',
  paymentId: 'Payment ID',
  lastQrToken: 'QR Token ล่าสุด',
  lastUploadUrl: 'URL รูปที่อัปโหลดล่าสุด',
};

export function SessionPanel() {
  const { session } = useSession();
  const [copied, setCopied] = useState<string | null>(null);
  const entries = Object.entries(session).filter(([, v]) => v !== undefined && v !== '');

  async function copy(key: string, value: unknown) {
    await navigator.clipboard.writeText(String(value));
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  if (entries.length === 0) {
    return (
      <div className="session-panel empty">
        <p>ยังไม่มีค่าที่จำไว้ — เริ่มจากขั้นที่ 1 (เข้าสู่ระบบ) ก่อนครับ</p>
      </div>
    );
  }

  return (
    <div className="session-panel">
      <div className="session-panel-title">ค่าที่จำไว้ในระบบ (auto-fill ให้ฟอร์มถัดไป)</div>
      <div className="session-grid">
        {entries.map(([key, value]) => (
          <div className="session-item" key={key}>
            <span className="session-key">{LABELS[key] ?? key}</span>
            <span className="session-value" title={String(value)}>
              {String(value)}
            </span>
            <button className="session-copy" onClick={() => copy(key, value)}>
              {copied === key ? <CheckCheck size={13} /> : <Copy size={13} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
