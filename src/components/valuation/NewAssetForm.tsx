import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
  Button,
  Space,
  Divider,
  Typography,
} from 'antd';
import { EnvironmentOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type {
  BusinessType,
  DecorationLevel,
  CertificateStatus,
} from '@/types';
import { DEFAULT_NEW_ASSET, NewAssetInput } from './types';

const { Text } = Typography;

const BUSINESS_OPTIONS: { label: string; value: BusinessType }[] = [
  { label: '写字楼', value: 'office' },
  { label: '商铺', value: 'retail' },
  { label: '酒店', value: 'hotel' },
  { label: '公寓', value: 'apartment' },
  { label: '厂房', value: 'plant' },
  { label: '仓库', value: 'warehouse' },
];

const DECO_OPTIONS: { label: string; value: DecorationLevel }[] = [
  { label: '毛坯', value: 'rough' },
  { label: '简装', value: 'simple' },
  { label: '标准', value: 'standard' },
  { label: '精装', value: 'fine' },
];

const CERT_OPTIONS: { label: string; value: CertificateStatus }[] = [
  { label: '权证完整', value: 'complete' },
  { label: '权证待补', value: 'pending' },
  { label: '权证缺失', value: 'missing' },
];

// 预设坐标（与竞品热点一致，保证能检索到周边可比）
const PRESETS: { label: string; lng: number; lat: number }[] = [
  { label: '北京·国贸CBD', lng: 116.46, lat: 39.913 },
  { label: '北京·望京', lng: 116.47, lat: 39.996 },
  { label: '上海·陆家嘴', lng: 121.505, lat: 31.24 },
  { label: '上海·徐家汇', lng: 121.437, lat: 31.194 },
];

interface Props {
  loading: boolean;
  onSubmit: (input: NewAssetInput) => void;
}

export default function NewAssetForm({ loading, onSubmit }: Props) {
  const [form, setForm] = useState<NewAssetInput>(DEFAULT_NEW_ASSET);

  const set = <K extends keyof NewAssetInput>(key: K, val: NewAssetInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <Card
      size="small"
      title="① 新资产特征录入"
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => setForm(DEFAULT_NEW_ASSET)}
        >
          重置
        </Button>
      }
    >
      <Form layout="vertical" size="small">
        <Form.Item label="资产名称">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Form.Item>

        <Space size="middle" style={{ display: 'flex' }}>
          <Form.Item label="业态" style={{ flex: 1 }}>
            <Select
              value={form.businessType}
              options={BUSINESS_OPTIONS}
              onChange={(v) => set('businessType', v)}
            />
          </Form.Item>
          <Form.Item label="区域" style={{ flex: 1 }}>
            <Input value={form.region} onChange={(e) => set('region', e.target.value)} />
          </Form.Item>
        </Space>

        <Form.Item label="经纬度（驱动周边竞品检索）">
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ width: '50%' }}
              addonBefore="Lng"
              value={form.lng}
              step={0.001}
              onChange={(v) => set('lng', Number(v) || 0)}
            />
            <InputNumber
              style={{ width: '50%' }}
              addonBefore="Lat"
              value={form.lat}
              step={0.001}
              onChange={(v) => set('lat', Number(v) || 0)}
            />
          </Space.Compact>
          <div style={{ marginTop: 6 }}>
            <Space size={4} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EnvironmentOutlined /> 快捷定位：
              </Text>
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  size="small"
                  type="link"
                  style={{ padding: '0 4px', fontSize: 12 }}
                  onClick={() => setForm((f) => ({ ...f, lng: p.lng, lat: p.lat }))}
                >
                  {p.label}
                </Button>
              ))}
            </Space>
          </div>
        </Form.Item>

        <Space size="middle" style={{ display: 'flex' }}>
          <Form.Item label="建筑面积 ㎡" style={{ flex: 1 }}>
            <InputNumber
              style={{ width: '100%' }}
              min={50}
              max={500000}
              value={form.area}
              onChange={(v) => set('area', Number(v) || 0)}
            />
          </Form.Item>
          <Form.Item label="距地铁 m" style={{ flex: 1 }}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10000}
              value={form.subwayDistance}
              onChange={(v) => set('subwayDistance', Number(v) || 0)}
            />
          </Form.Item>
        </Space>

        <Form.Item label={`成新评分：${form.conditionScore}`}>
          <Slider min={1} max={10} value={form.conditionScore} onChange={(v) => set('conditionScore', v)} />
        </Form.Item>

        <Space size="middle" style={{ display: 'flex' }}>
          <Form.Item label="装修档位" style={{ flex: 1 }}>
            <Select value={form.decoration} options={DECO_OPTIONS} onChange={(v) => set('decoration', v)} />
          </Form.Item>
          <Form.Item label="权证状态" style={{ flex: 1 }}>
            <Select value={form.certificate} options={CERT_OPTIONS} onChange={(v) => set('certificate', v)} />
          </Form.Item>
        </Space>

        <Space size="middle" style={{ display: 'flex' }}>
          <Form.Item label={`学区质量：${form.schoolScore}`} style={{ flex: 1 }}>
            <Slider min={0} max={10} value={form.schoolScore} onChange={(v) => set('schoolScore', v)} />
          </Form.Item>
          <Form.Item label={`商业密度：${form.commercialDensity}`} style={{ flex: 1 }}>
            <Slider
              min={0}
              max={10}
              value={form.commercialDensity}
              onChange={(v) => set('commercialDensity', v)}
            />
          </Form.Item>
        </Space>

        <Space size="middle" style={{ display: 'flex' }}>
          <Form.Item label="装修年份" style={{ flex: 1 }}>
            <InputNumber
              style={{ width: '100%' }}
              min={1980}
              max={2025}
              value={form.lastRenovationYear}
              onChange={(v) => set('lastRenovationYear', Number(v) || 2024)}
            />
          </Form.Item>
          <Form.Item label={`免租期：${form.freeRentDays} 天`} style={{ flex: 1 }}>
            <Slider min={0} max={180} step={15} value={form.freeRentDays} onChange={(v) => set('freeRentDays', v)} />
          </Form.Item>
        </Space>

        <Space size="middle" style={{ display: 'flex' }}>
          <Form.Item label="核心CBD商圈" style={{ flex: 1 }}>
            <Switch checked={form.isCbd} onChange={(v) => set('isCbd', v)} />
          </Form.Item>
          <Form.Item label="内中环" style={{ flex: 1 }}>
            <Switch checked={form.isInner} onChange={(v) => set('isInner', v)} />
          </Form.Item>
        </Space>

        <Form.Item label={`周边检索半径：${form.radiusKm} km`}>
          <Slider min={1} max={10} value={form.radiusKm} onChange={(v) => set('radiusKm', v)} />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />

        <Button
          type="primary"
          block
          icon={<ThunderboltOutlined />}
          loading={loading}
          onClick={() => onSubmit(form)}
        >
          调用模型生成建议租金
        </Button>
      </Form>
    </Card>
  );
}
