'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Loader2, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import type { EndpointDef } from '../data/types';
import { rawRequest, setToken, type RawResult } from '../lib/api';
import { useSession, type SessionData } from '../lib/session-store';
import { DynamicField } from './DynamicField';

function extractNumericId(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+)(?!.*\d)/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function findValueInBody(body: unknown, keys: string[]): unknown {
  if (!body || typeof body !== 'object') return undefined;
  // เจาะเข้า envelope { statusCode, message, data: { data: {...} } } อัตโนมัติ
  const candidates: unknown[] = [
    body,
    (body as any)?.data,
    (body as any)?.data?.data,
    ...(Array.isArray((body as any)?.data?.data) ? [(body as any).data.data[0]] : []),
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      for (const key of keys) {
        if (key in (candidate as object)) return (candidate as Record<string, unknown>)[key];
      }
    }
  }
  return undefined;
}

export function EndpointForm({ endpoint }: { endpoint: EndpointDef }) {
  const { session, update } = useSession();
  const [open, setOpen] = useState(false);

  const initialParams = useMemo(
    () =>
      Object.fromEntries(
        (endpoint.params ?? []).map((p) => [
          p.name,
          p.sessionKey && session[p.sessionKey] !== undefined ? String(session[p.sessionKey]) : '',
        ]),
      ),
    [endpoint.params], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [paramValues, setParamValues] = useState<Record<string, string>>(initialParams);

  const initialFields = useMemo(
    () =>
      Object.fromEntries(
        (endpoint.fields ?? []).map((f) => {
          if (f.sessionKey && session[f.sessionKey] !== undefined) return [f.name, session[f.sessionKey]];
          return [f.name, f.defaultValue ?? (f.type === 'boolean' ? true : '')];
        }),
      ),
    [endpoint.fields], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(initialFields);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RawResult | null>(null);
  const [capturedNote, setCapturedNote] = useState<string | null>(null);

  function resolvePath() {
    return (endpoint.params ?? []).reduce(
      (acc, p) => acc.replace(`:${p.name}`, encodeURIComponent(paramValues[p.name] || '')),
      endpoint.path,
    );
  }

  function buildBody(): object | undefined {
    if (!endpoint.fields || endpoint.fields.length === 0) return undefined;
    const body: Record<string, unknown> = {};
    for (const f of endpoint.fields) {
      const raw = fieldValues[f.name];
      if (raw === '' || raw === undefined) continue;
      if (f.type === 'number-array') {
        body[f.name] = String(raw)
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n));
      } else if (f.type === 'text-array') {
        body[f.name] = String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        body[f.name] = raw;
      }
    }
    return body;
  }

  async function handleSend() {
    setLoading(true);
    setResult(null);
    setCapturedNote(null);

    try {
      let res: RawResult;
      if (endpoint.isFileUpload) {
        if (!file) {
          setLoading(false);
          return;
        }
        const fd = new FormData();
        fd.append('file', file);
        res = await rawRequest(endpoint.method, resolvePath(), undefined, true, fd);
      } else {
        res = await rawRequest(endpoint.method, resolvePath(), buildBody());
      }

      setResult(res);

      if (res.ok && endpoint.captures) {
        const patch: Partial<SessionData> = {};
        const notes: string[] = [];
        for (const rule of endpoint.captures) {
          const raw = findValueInBody(res.body, rule.responseKeys);
          if (raw === undefined) continue;
          const value = rule.numeric ? extractNumericId(raw) : raw;
          if (value === undefined) continue;
          (patch as any)[rule.sessionKey] = value;
          notes.push(`${rule.sessionKey} = ${value}`);
          if (rule.sessionKey === 'accessToken' && typeof value === 'string') setToken(value);
        }
        if (notes.length > 0) {
          update(patch);
          setCapturedNote(`เก็บอัตโนมัติ: ${notes.join(', ')}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`ep-card ${open ? 'ep-open' : ''}`}>
      <button className="ep-header" onClick={() => setOpen((v) => !v)}>
        <span className={`ep-method m-${endpoint.method}`}>{endpoint.method}</span>
        <span className="ep-path">{endpoint.path}</span>
        <span className="ep-label">{endpoint.label}</span>
        <span className="ep-badges">
          {endpoint.needsAdmin ? (
            <span className="ep-tag ep-tag-admin">admin</span>
          ) : endpoint.needsAuth ? (
            <span className="ep-tag ep-tag-auth">login</span>
          ) : (
            <span className="ep-tag ep-tag-public">public</span>
          )}
        </span>
        <ChevronDown className="ep-chevron" size={16} />
      </button>

      {open && (
        <div className="ep-body">
          {endpoint.hint && (
            <p className="ep-hint">
              <Lightbulb size={14} /> {endpoint.hint}
            </p>
          )}

          {endpoint.params && endpoint.params.length > 0 && (
            <div className="ep-params">
              {endpoint.params.map((p) => (
                <label className="field field-narrow" key={p.name}>
                  <span className="field-label">{p.label}</span>
                  <input
                    value={paramValues[p.name] ?? ''}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          )}

          {endpoint.isFileUpload ? (
            <label className="field field-wide">
              <span className="field-label">เลือกไฟล์รูปภาพ (JPEG/PNG/WEBP, ไม่เกิน 5MB)</span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            endpoint.fields &&
            endpoint.fields.length > 0 && (
              <div className="ep-fields">
                {endpoint.fields.map((f) => (
                  <DynamicField
                    key={f.name}
                    field={f}
                    value={fieldValues[f.name]}
                    onChange={(v) => setFieldValues((prev) => ({ ...prev, [f.name]: v }))}
                  />
                ))}
              </div>
            )
          )}

          <button className="ep-send" onClick={handleSend} disabled={loading}>
            {loading ? <Loader2 className="spin" size={15} /> : null}
            {loading ? 'กำลังส่ง...' : `ส่งคำขอ`}
          </button>

          {capturedNote && <p className="ep-captured">✓ {capturedNote}</p>}

          {result && (
            <div className={`ep-result ${result.ok ? 'ok' : 'err'}`}>
              <div className="ep-result-head">
                {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                <span>
                  {result.status} · {result.durationMs}ms
                </span>
              </div>
              <pre>{JSON.stringify(result.body, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
