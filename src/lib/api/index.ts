import { DemoExamApi } from './demo-api';
import { GoogleAppsScriptExamApi } from './apps-script-api';
import type { ExamApi } from './exam-api';

let singleton: ExamApi | null = null;

export function getExamApi(): ExamApi {
  if (singleton) return singleton;
  const mode = process.env.NEXT_PUBLIC_API_MODE || 'demo';
  singleton = mode === 'apps-script'
    ? new GoogleAppsScriptExamApi(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '')
    : new DemoExamApi();
  return singleton;
}

export * from './types';
