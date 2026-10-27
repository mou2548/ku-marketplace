'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Shell } from '../../components/Shell';
import { SessionPanel } from '../../components/SessionPanel';
import { EndpointForm } from '../../components/EndpointForm';
import { ALL_STEPS } from '../../data/steps';

export default function StepPage() {
  const params = useParams<{ stepId: string }>();
  const stepIndex = ALL_STEPS.findIndex((s) => s.id === params.stepId);
  const step = ALL_STEPS[stepIndex];

  if (!step) {
    return (
      <Shell>
        <div className="page">
          <p>ไม่พบหน้านี้</p>
          <Link href="/">กลับหน้าแรก</Link>
        </div>
      </Shell>
    );
  }

  const prev = ALL_STEPS[stepIndex - 1];
  const next = ALL_STEPS[stepIndex + 1];

  return (
    <Shell>
      <div className="page">
        <header className="step-page-header">
          <p className="eyebrow">ขั้นที่ {step.step} จาก {ALL_STEPS.length}</p>
          <h1>{step.title}</h1>
          <p className="hero-desc">{step.description}</p>
        </header>

        <SessionPanel />

        <div className="endpoint-list">
          {step.endpoints.map((ep) => (
            <EndpointForm key={ep.id} endpoint={ep} />
          ))}
        </div>

        <div className="step-nav">
          {prev ? (
            <Link href={`/${prev.id}`} className="step-nav-btn prev">
              <ArrowLeft size={15} />
              ขั้นที่ {prev.step}: {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/${next.id}`} className="step-nav-btn next">
              ขั้นที่ {next.step}: {next.title}
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </Shell>
  );
}
