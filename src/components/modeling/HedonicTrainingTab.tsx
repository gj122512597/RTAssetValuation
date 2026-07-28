import { useEffect, useState, createContext, useContext, type ReactNode } from 'react';
import {
  Card, Tag, Alert, Segmented, Table, Spin, Space, Button, Divider, Tooltip,
  Upload, Modal, Form, Input, InputNumber, message, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FormInstance } from 'antd';
import {
  DownloadOutlined, DatabaseOutlined, FunctionOutlined, UploadOutlined,
  PlusOutlined, SaveOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type { HedonicModel } from '@/utils/hedonicModel';
import { getActiveModel } from '@/services/modelService';
import type { PricingModel } from '@/types';
import {
  TRAINING_SAMPLES, FEATURE_META, COMPARATIVE_FEATS, HISTORICAL_FEATS,
} from '@/data/hedonicTrainingData';
import { trainingSamplesApi } from '@/api/client';
import * as XLSX from 'xlsx';

type Row = Record<string, any>;
type Method = PricingModel;
const NEW_ID = '__new__';

// -------------------------- 行内可编辑表格基础设施 --------------------------
const EditableContext = createContext<FormInstance | null>(null);
const EditableKeyContext = createContext<string | null>(null);

const EditableRow = ({ children, ...props }: any) => {
  const [form] = Form.useForm();
  return (
    <EditableContext.Provider value={form}>
      <tr {...props}>{children}</tr>
    </EditableContext.Provider>
  );
};

const EditableCell = ({ editable, dataIndex, inputType, record, children, ...rest }: any) => {
  const form = useContext(EditableContext);
  const editingKey = useContext(EditableKeyContext);
  const editing = editable ? editingKey === (record && record.id) : false;
  let childNode: ReactNode = children;
  if (editing) {
    childNode = (
      <Form.Item
        name={dataIndex}
        initialValue={record[dataIndex]}
        style={{ margin: 0 }}
        rules={inputType === 'number' ? [{ required: true, message: '必填' }] : undefined}
      >
        {inputType === 'number' ? (
          <InputNumber size="small" style={{ width: '100%' }} />
        ) : (
          <Input size="small" />
        )}
      </Form.Item>
    );
  }
  return <td {...rest}>{childNode}</td>;
};

// 操作列单元格（可访问当前行 form，用于保存校验）
const OperationCell = ({ record, editingKey, onEdit, onDelete, onSave, onCancelEdit }: any) => {
  const form = useContext(EditableContext);
  const editing = editingKey === record.id;
  if (editing) {
    return (
      <Space size={2}>
        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => onSave(record, form)}>
          保存
        </Button>
        <Button size="small" onClick={() => onCancelEdit()}>
          取消
        </Button>
      </Space>
    );
  }
  return (
    <Space size={2}>
      <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record.id)} />
      <Popconfirm title="确认删除该训练样本？" okText="删除" cancelText="取消" onConfirm={() => onDelete(record)}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  );
};

// 上传模板字段（中文表头 + 英文特征名），y_ln日租金 由后端自动计算，不要求上传
const TEMPLATE_FIELDS: { key: string; cn: string; numeric: boolean }[] = [
  { key: '序号', cn: '序号', numeric: true },
  { key: '资产名称', cn: '资产名称', numeric: false },
  { key: '挂牌编码', cn: '挂牌编码', numeric: false },
  { key: '行政区', cn: '行政区', numeric: false },
  { key: '商圈等级', cn: '商圈等级', numeric: false },
  { key: '经度', cn: '经度', numeric: true },
  { key: '纬度', cn: '纬度', numeric: true },
  { key: '建筑面积', cn: '建筑面积', numeric: true },
  { key: '真实月单位租金', cn: '真实月单位租金(元/㎡·月)', numeric: true },
  ...FEATURE_META.map((f) => ({ key: f.key, cn: f.cn, numeric: true })),
];

function betaColor(b: number) {
  if (b === 0) return 'text-gray-400';
  return b > 0 ? 'text-green-600' : 'text-rose-600';
}

/** 当前模型系数卡片 + 训练数据表（动态数据源 + 上传 + 行内编辑 + 重训） */
export default function HedonicTrainingTab() {
  const [method, setMethod] = useState<Method>('comparative');
  const [models, setModels] = useState<Partial<Record<Method, HedonicModel>>>({});
  const [loadingModel, setLoadingModel] = useState(true);

  const [samples, setSamples] = useState<Row[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<{ before: number; after: number } | null>(null);

  const loadModels = async () => {
    const [comparative, historical] = await Promise.all([
      getActiveModel('comparative'),
      getActiveModel('historical'),
    ]);
    setModels({ comparative, historical });
  };

  const loadSamples = async () => {
    setLoadingSamples(true);
    try {
      const list = (await trainingSamplesApi.list()) as Row[];
      setSamples(list);
    } catch {
      message.warning('无法连接后端，暂用内置静态训练数据（不可增训，请启动 npm run server:dev）');
      setSamples(TRAINING_SAMPLES as unknown as Row[]);
    } finally {
      setLoadingSamples(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [comparative, historical] = await Promise.all([
          getActiveModel('comparative'),
          getActiveModel('historical'),
        ]);
        if (alive) setModels({ comparative, historical });
      } finally {
        if (alive) setLoadingModel(false);
      }
    })();
    loadSamples();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const model = models[method];

  // 系数表：按方法取对应特征
  const featKeys = method === 'comparative' ? COMPARATIVE_FEATS : HISTORICAL_FEATS;
  const impTotal = (model && Object.values(model.feature_importance).reduce((a, b) => a + b, 0)) || 1;

  const coefColumns: ColumnsType<any> = [
    {
      title: '特征',
      dataIndex: 'cn',
      width: 160,
      render: (_v, r) => (
        <div>
          <div className="font-medium text-ink-800">{r.cn}</div>
          <div className="text-[11px] text-ink-400 font-mono">{r.key}</div>
        </div>
      ),
    },
    {
      title: '系数 β',
      dataIndex: 'beta',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <span className={'font-mono font-semibold ' + betaColor(v)}>{v >= 0 ? '+' : ''}{v}</span>
      ),
    },
    {
      title: '特征均值 μ',
      dataIndex: 'mu',
      width: 100,
      align: 'right',
      render: (v: number) => <span className="font-mono text-ink-600">{v.toFixed(4)}</span>,
    },
    {
      title: '特征重要度',
      dataIndex: 'imp',
      width: 200,
      render: (v: number) => {
        const pct = (v / impTotal) * 100;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded bg-ink-100 overflow-hidden">
              <div className="h-full bg-brand" style={{ width: `${Math.max(pct, 1)}%` }} />
            </div>
            <span className="text-xs text-ink-500 font-mono w-12 text-right">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
    {
      title: '说明',
      key: 'desc',
      render: (_v, r) =>
        r.constant ? (
          <Tooltip title={r.desc}>
            <Tag color="default">无来源·常量(β=0)</Tag>
          </Tooltip>
        ) : (
          <span className="text-xs text-ink-400">{r.desc}</span>
        ),
    },
  ];

  const coefData = featKeys.map((k) => {
    const meta = FEATURE_META.find((f) => f.key === k)!;
    return {
      key: k,
      cn: meta.cn,
      beta: model?.coefficients[k] ?? 0,
      mu: model?.feature_means[k] ?? 0,
      imp: model?.feature_importance[k] ?? 0,
      constant: meta.constant,
      desc: meta.desc,
    };
  });

  // 训练数据表列定义（可编辑）
  const baseDefs: any[] = [
    { title: '序号', dataIndex: '序号', width: 52, align: 'center', editable: false, inputType: 'number' as const, render: (v: number) => v },
    { title: '资产名称', dataIndex: '资产名称', width: 132, editable: true, inputType: 'text' as const },
    { title: '行政区', dataIndex: '行政区', width: 84, editable: true, inputType: 'text' as const },
    { title: '商圈等级', dataIndex: '商圈等级', width: 100, editable: true, inputType: 'text' as const },
    { title: '经度', dataIndex: '经度', width: 104, align: 'right', editable: true, inputType: 'number' as const, render: (v: number) => (v != null ? v.toFixed(4) : '') },
    { title: '纬度', dataIndex: '纬度', width: 104, align: 'right', editable: true, inputType: 'number' as const, render: (v: number) => (v != null ? v.toFixed(4) : '') },
    { title: '建筑面积(㎡)', dataIndex: '建筑面积', width: 104, align: 'right', editable: true, inputType: 'number' as const },
    { title: '真实月租(元/㎡·月)', dataIndex: '真实月单位租金', width: 132, align: 'right', editable: true, inputType: 'number' as const },
    { title: 'y=ln(日租金)', dataIndex: 'y_ln日租金', width: 104, align: 'right', editable: false, inputType: 'number' as const, render: (v: number) => (v != null ? v.toFixed(4) : '') },
  ];
  const featDefs = FEATURE_META.map((f) => ({
    title: f.cn,
    dataIndex: f.key,
    width: 92,
    align: 'right' as const,
    editable: true,
    inputType: 'number' as const,
    render: (v: number) =>
      f.constant ? <span className="text-gray-300">{v}</span> : <span className="font-mono text-ink-700">{v}</span>,
  }));
  const sourceCol: any = {
    title: '来源',
    dataIndex: 'source',
    width: 80,
    editable: false,
    inputType: 'text' as const,
    render: (s: string) => {
      const map: Record<string, { c: string; t: string }> = {
        builtin: { c: 'default', t: '内置' },
        upload: { c: 'blue', t: '上传' },
        manual: { c: 'green', t: '手动' },
      };
      const m = map[s] || { c: 'default', t: s || '内置' };
      return <Tag color={m.c}>{m.t}</Tag>;
    },
  };
  const columns: any[] = [
    ...baseDefs,
    { title: '12 维 Hedonic 特征向量', children: featDefs as any },
    sourceCol,
    {
      title: '操作',
      dataIndex: 'op',
      width: 130,
      fixed: 'right',
      editable: false,
      inputType: 'text' as const,
      render: (_: any, record: Row) => (
        <OperationCell
          record={record}
          editingKey={editingKey}
          onEdit={setEditingKey}
          onCancelEdit={() => setEditingKey(null)}
          onDelete={onDelete}
          onSave={onSave}
        />
      ),
    },
  ];

  const mergedColumns = columns.map((col) => {
    const c = col as any;
    if (c.editable) {
      return { ...c, onCell: (record: Row) => ({ editable: true, dataIndex: c.dataIndex, inputType: c.inputType, record }) };
    }
    if (c.children) {
      return {
        ...c,
        children: c.children.map((cc: any) =>
          cc.editable
            ? { ...cc, onCell: (record: Row) => ({ editable: true, dataIndex: cc.dataIndex, inputType: cc.inputType, record }) }
            : cc,
        ),
      };
    }
    return c;
  });

  // -------------------------- 样本增删改 --------------------------
  const onDelete = async (record: Row) => {
    try {
      await trainingSamplesApi.delete(String(record.id));
      message.success('已删除');
      loadSamples();
    } catch (e: any) {
      message.error('删除失败：' + (e.message || e));
    }
  };

  const onSave = async (record: Row, form: FormInstance) => {
    try {
      const values = await form.validateFields();
      const payload = { ...record, ...values };
      if (record.id === NEW_ID) {
        await trainingSamplesApi.create(payload, 'manual');
      } else {
        await trainingSamplesApi.update(String(record.id), payload);
      }
      setEditingKey(null);
      message.success('已保存');
      loadSamples();
    } catch (e: any) {
      if (e?.errorFields) message.warning('请填写必填项');
      else message.error('保存失败：' + (e.message || e));
    }
  };

  const onAdd = () => {
    const nextSeq = samples.reduce((m, s) => Math.max(m, Number(s['序号'] || 0)), 0) + 1;
    const blank: Row = {
      id: NEW_ID,
      序号: nextSeq,
      资产名称: '',
      行政区: '',
      商圈等级: '',
      经度: 0,
      纬度: 0,
      建筑面积: 0,
      真实月单位租金: 0,
      ...FEATURE_META.reduce((a, f) => ((a[f.key] = 0), a), {} as Row),
    };
    setSamples([blank, ...samples]);
    setEditingKey(NEW_ID);
  };

  // -------------------------- Excel 上传 --------------------------
  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];
      const cleaned: Row[] = [];
      const errors: string[] = [];
      raw.forEach((r, i) => {
        const rent = Number(r['真实月单位租金'] ?? r['真实月租'] ?? 0);
        if (!rent || rent <= 0) {
          errors.push(`第 ${i + 1} 行缺少有效「真实月单位租金」`);
          return;
        }
        const obj: Row = { ...r };
        obj['真实月单位租金'] = rent;
        FEATURE_META.forEach((f) => {
          if (obj[f.key] !== undefined) obj[f.key] = Number(obj[f.key]);
        });
        ['经度', '纬度', '建筑面积', '序号'].forEach((k) => {
          if (obj[k] !== undefined) obj[k] = Number(obj[k]);
        });
        cleaned.push(obj);
      });
      if (cleaned.length === 0) {
        message.error('未解析到有效样本：' + errors.join('；'));
        return;
      }
      if (errors.length) message.warning(`已跳过 ${errors.length} 行：${errors.join('；')}`);
      setPreviewRows(cleaned);
      setPreviewOpen(true);
    } catch (e: any) {
      message.error('解析失败：' + (e.message || e));
    }
  };

  const confirmImport = async () => {
    setPreviewOpen(false);
    let ok = 0;
    for (const row of previewRows) {
      try {
        await trainingSamplesApi.create(row, 'upload');
        ok += 1;
      } catch {
        /* 跳过单行错误 */
      }
    }
    setPreviewRows([]);
    message.success(`已导入 ${ok} 条训练样本`);
    loadSamples();
  };

  const downloadTemplate = () => {
    const aoa = [TEMPLATE_FIELDS.map((f) => f.cn)];
    [TRAINING_SAMPLES[0], TRAINING_SAMPLES[1]].forEach((s) => {
      aoa.push(TEMPLATE_FIELDS.map((f) => (s as any)[f.key] ?? ''));
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '训练样本');
    XLSX.writeFile(wb, 'hedonic_training_template.xlsx');
  };

  const exportCsv = () => {
    const headers = [
      '序号', '资产名称', '挂牌编码', '行政区', '商圈等级', '经度', '纬度', '建筑面积',
      '真实月单位租金', 'y_ln日租金', ...FEATURE_META.map((f) => f.key),
    ];
    const lines = samples.map((s) =>
      [
        s['序号'], s['资产名称'], s['挂牌编码'], s['行政区'], s['商圈等级'], s['经度'], s['纬度'], s['建筑面积'],
        s['真实月单位租金'], s['y_ln日租金'], ...FEATURE_META.map((f) => s[f.key]),
      ].join(','),
    );
    const csv = '﻿' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hedonic_training_samples.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------- 训练（重训） --------------------------
  const onTrain = async () => {
    setTraining(true);
    const before = model?.r2 ?? 0;
    try {
      const res = (await trainingSamplesApi.refit()) as any;
      if (!res.ok) throw new Error(res.error || 'refit 失败');
      await loadModels();
      const fresh = await getActiveModel(method);
      setTrainResult({ before, after: fresh.r2 });
      message.success('模型已重训并更新（含全部样本）');
    } catch (e: any) {
      message.error('训练失败：' + (e.message || e));
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-5">
      <Alert
        type="info"
        showIcon
        icon={<DatabaseOutlined />}
        message="当前模型由你上传的《青岛商业办公_HedonicMVP_数据宽表.xlsx》中「办公用房出租」样本训练而来"
        description="系数实时取自后端（GET /api/models/hedonic/:method）。训练数据表为经 ETL 派生后的完整特征矩阵——你现在可以「上传 Excel」或「新增一行」补充样本，再点「重训模型」让系数随新数据更新（这是 MVP 演示级模型，n 较小，系数符号部分反直觉属正常过拟合噪声）。"
      />

      {/* 方法切换 + 模型概要 */}
      <Card size="small">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Segmented
            value={method}
            onChange={(v) => setMethod(v as Method)}
            options={[
              { label: '市场比较法（12 维）', value: 'comparative' },
              { label: '历史数据法（4 维）', value: 'historical' },
            ]}
          />
          {loadingModel && <Spin size="small" />}
          {model && (
            <Space size={4} wrap>
              <Tag color="blue">{model.name}</Tag>
              <Tag color="geekblue">R² = {model.r2.toFixed(4)}</Tag>
              <Tag color="green">基准日租金 ≈ {model.base_score.toFixed(3)} 元/㎡·天</Tag>
              <Tag>截距 β₀ = {model.intercept.toFixed(4)}</Tag>
            </Space>
          )}
          {trainResult && (
            <Tag color="purple">
              重训 R²：{trainResult.before.toFixed(4)} → {trainResult.after.toFixed(4)}
            </Tag>
          )}
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={training}
            onClick={onTrain}
            className="ml-auto"
          >
            重训模型
          </Button>
        </div>

        {/* 系数表 */}
        <div className="font-semibold text-sm text-ink-700 mb-2 flex items-center gap-1">
          <FunctionOutlined className="text-brand" /> 当前模型权重系数（ln(日租金) = β₀ + Σ βᵢ·xᵢ）
        </div>
        <Table
          size="small"
          rowKey="key"
          columns={coefColumns}
          dataSource={coefData}
          pagination={false}
          scroll={{ x: 720 }}
        />
        <p className="text-[11px] text-ink-400 mt-2">
          注：灰色「无来源·常量」特征在青岛宽表中无对应字段，ETL 只能填固定值，拟合后 β=0、对预测无贡献。
          特征重要度为各 |βᵢ| 在标准化空间下的相对占比。
        </p>
      </Card>

      {/* 训练数据表 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">训练数据 · {samples.length} 条样本（ETL 后特征矩阵）</span>}
        extra={
          <Space size={4} wrap>
            <Button size="small" icon={<PlusOutlined />} onClick={onAdd}>
              新增一行
            </Button>
            <Upload
              accept=".xlsx,.xls,.csv"
              showUploadList={false}
              beforeUpload={(file) => {
                handleUpload(file as unknown as File);
                return false;
              }}
            >
              <Button size="small" icon={<UploadOutlined />}>
                上传 Excel
              </Button>
            </Upload>
            <Button size="small" icon={<DownloadOutlined />} onClick={downloadTemplate}>
              模板
            </Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>
              导出 CSV
            </Button>
          </Space>
        }
      >
        {loadingSamples ? (
          <div className="py-8 flex justify-center">
            <Spin />
          </div>
        ) : (
          <EditableKeyContext.Provider value={editingKey}>
            <Form component={false}>
              <Table
                size="small"
                rowKey="id"
                columns={mergedColumns}
                dataSource={samples}
                pagination={false}
                scroll={{ x: 2000 }}
                bordered
                components={{ body: { row: EditableRow, cell: EditableCell } }}
              />
            </Form>
          </EditableKeyContext.Provider>
        )}
        <Divider className="my-3" />
        <p className="text-xs text-ink-500 leading-relaxed">
          说明：原表无独立「街道地址」列，地址用「行政区」表示；经纬度为真实 GCJ-02 坐标，可在地图打点。
          真实月单位租金 = 整间月租金 ÷ 建筑面积（原表「单位租金」列名误标为整间月租金，已修正）；
          y = ln(日租金) = ln(真实月单位租金 ÷ 30)。上传 Excel 请使用「模板」列结构，y_ln日租金 由系统自动计算。
          新增/编辑后点「重训模型」即把新样本纳入全量拟合；来源标签区分「内置 / 上传 / 手动」。
        </p>
      </Card>

      {/* 上传预览确认 */}
      <Modal
        title={`确认导入 ${previewRows.length} 条训练样本`}
        open={previewOpen}
        onOk={confirmImport}
        onCancel={() => setPreviewOpen(false)}
        okText="确认导入"
        cancelText="取消"
        width={1200}
      >
        <div className="max-h-[60vh] overflow-auto">
          <Table
            size="small"
            rowKey={(r, i) => String(i)}
            pagination={false}
            scroll={{ x: 1400 }}
            columns={[
              { title: '资产名称', dataIndex: '资产名称', width: 120 },
              { title: '行政区', dataIndex: '行政区', width: 80 },
              { title: '真实月单位租金', dataIndex: '真实月单位租金', width: 110, align: 'right' },
              ...FEATURE_META.map((f) => ({
                title: f.cn,
                dataIndex: f.key,
                width: 90,
                align: 'right' as const,
              })),
            ]}
            dataSource={previewRows}
          />
        </div>
      </Modal>
    </div>
  );
}
