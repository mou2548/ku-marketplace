import type { SessionData } from '../lib/session-store';

export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'boolean'
  | 'textarea'
  | 'checkbox'
  | 'date'
  | 'number-array'
  | 'text-array';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  sessionKey?: keyof SessionData;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

export interface ParamDef {
  name: string;
  label: string;
  sessionKey?: keyof SessionData;
}

export interface CaptureRule {
  responseKeys: string[]; // เช็คทั้ง camelCase และ snake_case ที่เป็นไปได้
  sessionKey: keyof SessionData;
  numeric?: boolean; // ถ้า true จะ extract เลขจาก string แบบ "post_001" ด้วย
}

export interface EndpointDef {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  label: string;
  needsAuth: boolean;
  needsAdmin?: boolean;
  params?: ParamDef[];
  fields?: FieldDef[];
  captures?: CaptureRule[];
  hint?: string;
  isFileUpload?: boolean;
}

export interface StepGroup {
  id: string;
  step: number;
  title: string;
  icon: string;
  description: string;
  endpoints: EndpointDef[];
}
