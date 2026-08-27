'use client';

import type { FieldDef } from '../data/types';

export function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === 'select') {
    return (
      <label className="field">
        <span className="field-label">
          {field.label} {field.required && <span className="required">*</span>}
        </span>
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'boolean') {
    return (
      <label className="field">
        <span className="field-label">
          {field.label} {field.required && <span className="required">*</span>}
        </span>
        <select value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')}>
          <option value="true">ใช่</option>
          <option value="false">ไม่ใช่</option>
        </select>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className="field field-wide">
        <span className="field-label">
          {field.label} {field.required && <span className="required">*</span>}
        </span>
        <textarea
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      </label>
    );
  }

  if (field.type === 'number') {
    return (
      <label className="field">
        <span className="field-label">
          {field.label} {field.required && <span className="required">*</span>}
        </span>
        <input
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </label>
    );
  }

  if (field.type === 'date') {
    return (
      <label className="field">
        <span className="field-label">
          {field.label} {field.required && <span className="required">*</span>}
        </span>
        <input type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  if (field.type === 'number-array' || field.type === 'text-array') {
    return (
      <label className="field">
        <span className="field-label">
          {field.label} {field.required && <span className="required">*</span>}
        </span>
        <input
          type="text"
          value={String(value ?? '')}
          placeholder={field.placeholder ?? 'เช่น 1,2,3'}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  // text (default)
  return (
    <label className="field">
      <span className="field-label">
        {field.label} {field.required && <span className="required">*</span>}
      </span>
      <input
        type="text"
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
