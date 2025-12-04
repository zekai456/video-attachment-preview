import { useState, useCallback, useEffect, useMemo } from 'react';
import { Table, Typography, Tag, Input, Select } from '@douyinfe/semi-ui';
import { IconVideo, IconLink, IconImage, IconCheckboxTick, IconUser, IconCalendar, IconHash } from '@douyinfe/semi-icons';

const { Text } = Typography;

// 字段类型图标映射
const getFieldIcon = (type: number) => {
  const iconStyle = { fontSize: 12, marginRight: 4, color: 'var(--semi-color-text-2)' };
  switch (type) {
    case 1: return <span style={iconStyle}>A</span>; // 文本
    case 2: return <IconHash style={iconStyle} />; // 数字
    case 3: return <span style={iconStyle}>⊙</span>; // 单选
    case 4: return <span style={iconStyle}>☰</span>; // 多选
    case 5: return <IconCalendar style={iconStyle} />; // 日期
    case 7: return <IconCheckboxTick style={iconStyle} />; // 复选框
    case 11: return <IconUser style={iconStyle} />; // 人员
    case 15: return <IconLink style={iconStyle} />; // URL
    case 17: return <IconImage style={iconStyle} />; // 附件
    default: return null;
  }
};

// 记录数据结构
export interface RecordData {
  id: string;
  values: Record<string, string | null>;
  hasVideo: boolean;
}

// 字段信息
export interface FieldInfo {
  id: string;
  name: string;
  type: number;
  options?: { id: string; name: string }[]; // 单选字段的选项
}

interface ViewPanelProps {
  records: RecordData[];
  fields: FieldInfo[];
  visibleFieldIds: string[];
  selectedRecord: string;
  videoUrl: string;
  onRecordSelect: (id: string) => void;
  onCellEdit?: (recordId: string, fieldId: string, value: string) => Promise<void>;
  fullWidth?: boolean;
  filterFieldId?: string;
  filterFieldName?: string;
}

// 可编辑单元格组件
function EditableCell({
  value,
  fieldId,
  fieldType,
  fieldOptions,
  recordId,
  onSave,
}: {
  value: string;
  fieldId: string;
  fieldType: number;
  fieldOptions?: { id: string; name: string }[];
  recordId: string;
  onSave?: (recordId: string, fieldId: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      setEditing(true);
      setEditValue(value);
    }
  }, [value, onSave]);

  const handleSave = useCallback(async () => {
    if (editValue !== value && onSave) {
      setSaving(true);
      try {
        await onSave(recordId, fieldId, editValue);
      } catch (e) {
        console.error('Save failed:', e);
        setEditValue(value);
      }
      setSaving(false);
    }
    setEditing(false);
  }, [editValue, value, onSave, recordId, fieldId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setEditing(false);
    }
  }, [handleSave, value]);

  // 单选字段类型 (type === 3)
  const isSingleSelect = fieldType === 3;
  
  if (editing) {
    // 单选字段使用下拉选择框
    if (isSingleSelect && fieldOptions && fieldOptions.length > 0) {
      return (
        <Select
          size="small"
          value={editValue}
          onChange={(v) => {
            setEditValue(v as string);
            if (onSave) {
              setSaving(true);
              onSave(recordId, fieldId, v as string).finally(() => {
                setSaving(false);
                setEditing(false);
              });
            }
          }}
          optionList={fieldOptions.map(opt => ({ value: opt.name, label: opt.name }))}
          style={{ width: 120 }}
          autoFocus
          onBlur={() => setEditing(false)}
          disabled={saving}
          filter
        />
      );
    }
    
    // 其他字段使用文本输入
    return (
      <Input
        size="small"
        value={editValue}
        onChange={setEditValue}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        style={{ width: '100%' }}
        disabled={saving}
      />
    );
  }

  // 单选字段用彩色标签显示
  if (isSingleSelect && value && value !== '-') {
    // 根据值选择颜色
    type TagColor = 'green' | 'red' | 'orange' | 'blue' | 'cyan' | 'purple' | 'pink' | 'amber' | 'lime' | 'teal';
    const getTagColor = (val: string): TagColor => {
      if (val.includes('通过') || val.includes('完成') || val.includes('成功')) return 'green';
      if (val.includes('不通过') || val.includes('失败') || val.includes('拒绝')) return 'red';
      if (val.includes('待') || val.includes('进行中')) return 'orange';
      // 根据字符串哈希选择颜色
      const colors: TagColor[] = ['blue', 'cyan', 'purple', 'pink', 'amber', 'lime', 'teal'];
      const hash = val.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return colors[hash % colors.length];
    };
    
    return (
      <div 
        onDoubleClick={handleDoubleClick}
        style={{ cursor: onSave ? 'pointer' : 'default', display: 'inline-block' }}
      >
        <Tag 
          color={getTagColor(value)}
          size="small"
        >
          {value}
        </Tag>
      </div>
    );
  }

  return (
    <Text 
      ellipsis={{ showTooltip: true }} 
      style={{ maxWidth: 150, cursor: onSave ? 'pointer' : 'default' }}
      onDoubleClick={handleDoubleClick}
    >
      {value}
    </Text>
  );
}

export function ViewPanel({
  records,
  fields,
  visibleFieldIds,
  selectedRecord,
  videoUrl,
  onRecordSelect,
  onCellEdit,
  fullWidth = false,
  filterFieldId,
  filterFieldName,
}: ViewPanelProps) {
  // 表格宽度百分比
  const [tableWidth, setTableWidth] = useState(fullWidth ? 45 : 55);
  const [isDragging, setIsDragging] = useState(false);

  // 处理拖拽分隔条
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const container = document.getElementById('view-panel-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    // 限制范围 30% - 80%
    setTableWidth(Math.max(30, Math.min(80, newWidth)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 监听鼠标事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 确定要显示的字段
  const displayFields = visibleFieldIds.length > 0
    ? fields.filter(f => visibleFieldIds.includes(f.id))
    : fields.slice(0, 5);

  // 动态生成表格列（使用 useMemo 优化性能）
  const columns = useMemo(() => [
    // 行号列
    {
      title: '#',
      dataIndex: 'rowIndex',
      width: 50,
      fixed: 'left' as const,
      render: (_: unknown, __: RecordData, index: number) => (
        <Text type="tertiary" size="small" style={{ fontFamily: 'monospace' }}>
          {index + 1}
        </Text>
      ),
    },
    // 视频图标列
    {
      title: '',
      dataIndex: 'hasVideo',
      width: 32,
      fixed: 'left' as const,
      render: (hasVideo: boolean) => (
        <IconVideo style={{ 
          fontSize: 14,
          color: hasVideo ? 'var(--semi-color-primary)' : 'var(--semi-color-text-3)',
          opacity: hasVideo ? 1 : 0.3 
        }} />
      ),
    },
    // 数据字段列
    ...displayFields.map((field) => ({
      title: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {getFieldIcon(field.type)}
          <span>{field.name}</span>
        </div>
      ),
      dataIndex: `field_${field.id}`,
      width: 140,
      ellipsis: true,
      render: (_: unknown, record: RecordData) => {
        const value = record.values[field.id] || '-';
        return (
          <EditableCell
            value={value}
            fieldId={field.id}
            fieldType={field.type}
            fieldOptions={field.options}
            recordId={record.id}
            onSave={onCellEdit}
          />
        );
      },
    })),
  ], [displayFields, filterFieldId, onCellEdit]);

  return (
    <div 
      id="view-panel-container"
      style={{ 
        display: 'flex', 
        height: '100%', 
        width: '100%',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* 左侧表格 */}
      <div style={{ 
        width: `${tableWidth}%`, 
        minWidth: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--semi-color-bg-0)',
      }}>
        {/* 表头信息 */}
        <div style={{ 
          padding: '8px 12px', 
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text strong>记录列表</Text>
          <Text type="tertiary" size="small">
            {records.length} 条记录
            {filterFieldName && ` · 筛选: ${filterFieldName} ≠ 审核通过`}
            {onCellEdit && ' · 双击编辑'}
          </Text>
        </div>
        
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 'max-content', y: 'calc(100vh - 200px)' }}
            virtualized
            onRow={(record) => ({
              onClick: () => record && onRecordSelect(record.id),
              style: {
                cursor: 'pointer',
                backgroundColor: record?.id === selectedRecord 
                  ? 'rgba(var(--semi-blue-0), 0.5)' 
                  : undefined,
              },
            })}
            empty={
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                暂无数据
              </div>
            }
            style={{ 
              '--semi-table-thead-bg': 'var(--semi-color-bg-1)',
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* 可拖拽分隔条 */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 6,
          cursor: 'col-resize',
          background: isDragging ? 'var(--semi-color-primary)' : 'var(--semi-color-border)',
          transition: isDragging ? 'none' : 'background 0.2s',
          flexShrink: 0,
        }}
        title="拖拽调整大小"
      />
      
      {/* 右侧视频预览 */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        minHeight: 200,
      }}>
        {videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            autoPlay
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            color: 'rgba(255,255,255,0.5)',
          }}>
            <IconVideo size="extra-large" />
            <Text style={{ marginTop: 16, color: 'inherit' }}>
              {records.length > 0 ? '请选择一条记录预览视频' : '暂无视频数据'}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
