/**
 * 模型服务：拉取「训练好的 Hedonic 模型」并做推理
 *
 * - 优先从后端 GET /api/models/hedonic/:method 获取你训练好的系数
 * - 后端未启动时（演示模式）自动回退到前端内置 HEDONIC_* 模型，保证页面始终可用
 */
import { api } from '@/api/client';
import { HEDONIC_COMPARATIVE, HEDONIC_HISTORICAL, HedonicModel } from '@/utils/hedonicModel';
import type { PricingModel } from '@/types';

export async function getActiveModel(method: PricingModel): Promise<HedonicModel> {
  try {
    return await api.models.get(method);
  } catch {
    return method === 'comparative' ? HEDONIC_COMPARATIVE : HEDONIC_HISTORICAL;
  }
}
