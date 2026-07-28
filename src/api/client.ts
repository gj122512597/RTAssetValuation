/**
 * 前端 API 客户端 —— 调用数据后端（server/，默认 http://localhost:3001）
 *
 * 用途：
 *   - 前端从 SQLite 读取爬取的真实数据（替代/补充 mock）
 *   - 爬虫任务管理界面调用
 *
 * 使用：
 *   import { api } from '@/api/client';
 *   const competitors = await api.competitors.list({ region: '北京/朝阳' });
 */

import type { PricingModel } from '@/types';
import type { HedonicModel } from '@/utils/hedonicModel';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // 超时保护：10 秒未响应则中断（防止后端未启动时 fetch hang）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init,
    });
    if (!res.ok) {
      let msg = res.statusText;
      try { const body = await res.json(); msg = body.error || msg; } catch { /* ignore */ }
      throw new Error(`API ${res.status}: ${msg}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('请求超时（10s）—— 请确认后端服务已启动 (npm run server:dev)');
    }
    if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
      throw new Error('无法连接后端服务 —— 请确认 localhost:3001 已启动 (npm run server:dev)');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const competitorsApi = {
  list: (params?: { source?: string; region?: string; type?: string; lng?: number; lat?: number; radius_km?: number }) =>
    request<unknown[]>('/competitors' + qs(params || {})),
  get: (id: string) => request<unknown>(`/competitors/${id}`),
  create: (data: Record<string, unknown>) =>
    request<unknown>('/competitors', { method: 'POST', body: JSON.stringify(data) }),
  batchCreate: (items: Record<string, unknown>[]) =>
    request<{ total: number; saved: number; skipped: number }>('/competitors/batch', { method: 'POST', body: JSON.stringify({ items }) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/competitors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/competitors/${id}`, { method: 'DELETE' }),
};

export const transactionsApi = {
  list: (params?: { asset_id?: string; source?: string; region?: string; start_date?: string; end_date?: string }) =>
    request<unknown[]>('/transactions' + qs(params || {})),
  get: (id: string) => request<unknown>(`/transactions/${id}`),
  create: (data: Record<string, unknown>) =>
    request<unknown>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  batchCreate: (items: Record<string, unknown>[]) =>
    request<{ total: number; saved: number; skipped: number }>('/transactions/batch', { method: 'POST', body: JSON.stringify({ items }) }),
  delete: (id: string) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
};

export const poiApi = {
  list: (params?: { category?: string; asset_id?: string; region?: string; lng?: number; lat?: number; radius_km?: number }) =>
    request<unknown[]>('/poi' + qs(params || {})),
  statsByAsset: (assetId: string) =>
    request<{ category: string; count: number }[]>(`/poi/stats/by-asset/${assetId}`),
  batchCreate: (items: Record<string, unknown>[]) =>
    request<{ total: number; saved: number; skipped: number }>('/poi/batch', { method: 'POST', body: JSON.stringify({ items }) }),
  delete: (id: string) => request<void>(`/poi/${id}`, { method: 'DELETE' }),
};

export const governmentApi = {
  list: (params?: { source?: string; data_type?: string; region?: string; start_date?: string; end_date?: string }) =>
    request<unknown[]>('/government' + qs(params || {})),
  get: (id: string) => request<unknown>(`/government/${id}`),
  create: (data: Record<string, unknown>) =>
    request<unknown>('/government', { method: 'POST', body: JSON.stringify(data) }),
  batchCreate: (items: Record<string, unknown>[]) =>
    request<{ total: number; saved: number; skipped: number }>('/government/batch', { method: 'POST', body: JSON.stringify({ items }) }),
  delete: (id: string) => request<void>(`/government/${id}`, { method: 'DELETE' }),
};

export const crawlTasksApi = {
  list: (params?: { source?: string; status?: string; task_type?: string }) =>
    request<unknown[]>('/crawl-tasks' + qs(params || {})),
  get: (id: string) => request<unknown>(`/crawl-tasks/${id}`),
  create: (data: Record<string, unknown>) =>
    request<unknown>('/crawl-tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/crawl-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/crawl-tasks/${id}`, { method: 'DELETE' }),
  run: (id: string) => request<unknown>(`/crawl-tasks/${id}/run`, { method: 'POST' }),
  logs: (id: string, limit?: number) =>
    request<unknown[]>(`/crawl-tasks/${id}/logs` + qs({ limit })),
};

export const dataSourcesApi = {
  list: () => request<unknown[]>('/data-sources'),
  get: (id: string) => request<unknown>(`/data-sources/${id}`),
  create: (data: Record<string, unknown>) =>
    request<unknown>('/data-sources', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/data-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/data-sources/${id}`, { method: 'DELETE' }),
};

export const assetsApi = {
  list: (params?: { region?: string; type?: string; status?: string; received_batch?: string }) =>
    request<unknown[]>('/assets' + qs(params || {})),
  get: (id: string) => request<unknown>(`/assets/${id}`),
  create: (data: Record<string, unknown>) =>
    request<unknown>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/assets/${id}`, { method: 'DELETE' }),
};

export const statsApi = {
  overview: () =>
    request<Record<string, number>>('/stats'),
  sourceDistribution: () =>
    request<{ competitors: unknown[]; transactions: unknown[]; poi: unknown[]; government: unknown[] }>('/stats/source-distribution'),
};

export const modelsApi = {
  /** 获取训练好的 Hedonic 模型系数（comparative | historical） */
  get: (method: PricingModel) =>
    request<HedonicModel>('/models/hedonic/' + method),
  /** 服务端独立推理（模型系数不外泄）：{ method, features } → { prediction, contributions, name, r2 } */
  predict: (data: { method: PricingModel; features: Record<string, number> }) =>
    request<{
      prediction: number;
      contributions: { feature: string; contribution: number; source: string }[];
      name?: string;
      r2?: number;
    }>('/models/predict', { method: 'POST', body: JSON.stringify(data) }),
  /** 覆盖训练好的模型系数（上传真实训练结果） */
  put: (method: PricingModel, model: HedonicModel) =>
    request<{ method: string; message: string; model: HedonicModel }>(
      '/models/hedonic/' + method,
      { method: 'PUT', body: JSON.stringify(model) },
    ),
};

export const trainingSamplesApi = {
  /** 拉取训练样本池（内置 + 上传 + 手动新增） */
  list: () => request<Record<string, unknown>[]>('/training-samples'),
  /** 新增一条（source: upload / manual） */
  create: (data: Record<string, unknown>, source?: 'upload' | 'manual') =>
    request<Record<string, unknown>>('/training-samples', {
      method: 'POST',
      body: JSON.stringify({ data, source: source ?? 'manual' }),
    }),
  /** 更新一条 */
  update: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/training-samples/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),
  /** 删除一条 */
  delete: (id: string) => request<void>(`/training-samples/${id}`, { method: 'DELETE' }),
  /** 触发 Python 离线重训（全量重训含新样本） */
  refit: () => request<{ ok: boolean; stdout: string }>('/training-samples/refit', { method: 'POST' }),
};

export const api = {
  competitors: competitorsApi,
  transactions: transactionsApi,
  poi: poiApi,
  government: governmentApi,
  crawlTasks: crawlTasksApi,
  dataSources: dataSourcesApi,
  assets: assetsApi,
  stats: statsApi,
  models: modelsApi,
  trainingSamples: trainingSamplesApi,
};
