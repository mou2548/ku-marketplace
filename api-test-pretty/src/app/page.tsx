'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Shell } from '../components/Shell';
import { SessionPanel } from '../components/SessionPanel';
import { ALL_STEPS } from '../data/steps';

export default function Home() {
  return (
    <Shell>
      <div className="page">
        <header className="page-hero">
          <p className="eyebrow">คู่มือทดสอบระบบ</p>
          <h1>ทดสอบ KU Marketplace API ทีละขั้น</h1>
          <p className="hero-desc">
            คอนโซลนี้พาไล่ทดสอบทุก endpoint ของ backend ตามลำดับที่ user จริงจะใช้งาน — สมัคร
            สมาชิก → ลงของขาย → ซื้อขาย → นัดรับ → รายงานปัญหา → แจกของ ทุกครั้งที่สร้างอะไรสำเร็จ
            ระบบจะจำ ID ไว้ให้อัตโนมัติ แล้วเติมลงฟอร์มขั้นถัดไปให้เอง ไม่ต้อง copy-paste เอง
          </p>
        </header>

        <SessionPanel />

        <section className="journey">
          <h2>ลำดับขั้นตอนทั้งหมด</h2>
          <div className="journey-grid">
            {ALL_STEPS.map((step) => (
              <Link href={`/${step.id}`} key={step.id} className="journey-card">
                <span className="journey-step">ขั้นที่ {step.step}</span>
                <span className="journey-title">{step.title}</span>
                <span className="journey-desc">{step.description}</span>
                <span className="journey-count">{step.endpoints.length} endpoint</span>
                <ArrowRight className="journey-arrow" size={16} />
              </Link>
            ))}
          </div>
        </section>

        <section className="tips">
          <h2>เกร็ดที่ควรรู้ก่อนเริ่ม</h2>
          <ul>
            <li>
              <b>เริ่มจากขั้นที่ 1 เสมอ</b> — verify OTP หรือ login สำเร็จจะเก็บ token ให้อัตโนมัติ
              endpoint อื่นที่ต้อง login จะแนบ token นี้ให้เองทุกครั้ง
            </li>
            <li>
              <b>endpoint สีแดง (admin)</b> ต้องตั้ง <code>isAdmin = true</code> ให้ user นั้นตรง
              database ก่อน แล้ว login/verify ใหม่อีกครั้งเพื่อออก token ใบใหม่ — เพราะสิทธิ์ admin
              ถูกฝังอยู่ใน token ตั้งแต่ตอนออก ไม่ใช่เช็คสดจาก database ทุกครั้ง
            </li>
            <li>
              <b>ID ที่ระบบจำให้อัตโนมัติ</b> ดูได้ที่กล่อง &quot;ค่าที่จำไว้ในระบบ&quot; ด้านบนของทุกหน้า
              กดปุ่ม copy เพื่อเอาไปใช้ที่อื่นได้ทันที
            </li>
            <li>
              <b>Response ที่เห็น</b> เป็นค่าดิบเต็มๆ ตามที่ backend ตอบจริง (รวม envelope{' '}
              <code>statusCode / message / data</code>) เพื่อให้เห็นว่าการห่อ response ทำงานถูกต้อง
            </li>
          </ul>
        </section>
      </div>
    </Shell>
  );
}
