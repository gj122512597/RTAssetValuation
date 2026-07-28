/**
 * 模型服务：拉取「训练好的 Hedonic 模型」并做推理
 *
 * - getActiveModel：优先从后端 GET /api/models/hedonic/:method 取训练好的系数
 * - predictAsset：★ 真正调用「后端独立推理」POST /api/models/predict
 *     模型系数留在服务端（SQLite），前端只拿到预测值与 SHAP 贡献分解，不外泄
 * - 后端不可用时（演示模式）自动回退到前端内置 HEDONIC_* 模型做本地推理，保证页面始终可用
 */
import {
  HEDONIC_COMPARATIVE,
  HEDONIC_HISTORICAL,
  hedonicPredict,
  HedonicModel,
  ShapRow,
} from '@/utils/hedonicModel';
import { api } from '@/api/client';
import type { PricingModel } from '@/types';

export async function getActiveModel(method: PricingModel): Promise<HedonicModel> {
  try {
    return await api.models.get(method);
  } catch {
    return method === 'comparative' ? HEDONIC_COMPARATIVE : HEDONIC_HISTORICAL;
  }
}

export interface ServerPredict {
  prediction: number;
  contributions: ShapRow[];
  name: string;
  r2: number;
  /** true = 后端独立推理；false = 前端内置模型兜底推理 */
  serverSide: boolean;
}

/**
 * 真正调用后端独立推理 API（POST /api/models/predict）获取资产估价。
 * 后端负责从 SQLite 加载模型系数并计算，前端仅接收预测值与贡献分解。
 */
export async function predictAsset(
  method: PricingModel,
  features: Record<string, number>,
): Promise<ServerPredict> {
  try {
    const r = await api.models.predict({ method, features });
    return {
      prediction: r.prediction,
      contributions: r.contributions,
      name: r.name ?? (method === 'comparative' ? '市场比较法' : '历史数据法'),
      r2: r.r2 ?? 0,
      serverSide: true,
    };
  } catch {
    // 后端不可用 → 前端内置模型兜底推理（系数与后端一致）
    const model = method === 'comparative' ? HEDONIC_COMPARATIVE : HEDONIC_HISTORICAL;
    const { prediction, contributions } = hedonicPredict(model, features);
    return {
      prediction,
      contributions,
      name: model.name + '（本地兜底）',
      r2: model.r2,
      serverSide: false,
    };
  }
}
