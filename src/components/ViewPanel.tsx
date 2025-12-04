import { useState, useCallback } from 'react';
import { Table, Typography, Tag, Input, Select } from '@douyinfe/semi-ui';
import { IconVideo } from '@douyinfe/semi-icons';

const { Text } = Typography;

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
  // 确定要显示的字段
  const displayFields = visibleFieldIds.length > 0
    ? fields.filter(f => visibleFieldIds.includes(f.id))
    : fields.slice(0, 5);

  // 动态生成表格列
  const columns = [
    {
      title: '',
      dataIndex: 'hasVideo',
      width: 36,
      render: (hasVideo: boolean) => (
        <IconVideo style={{ 
          color: hasVideo ? 'var(--semi-color-primary)' : 'var(--semi-color-text-3)',
          opacity: hasVideo ? 1 : 0.3 
        }} />
      ),
    },
    ...displayFields.map((field) => ({
      title: field.name,
      dataIndex: `field_${field.id}`,
      width: field.id === filterFieldId ? 120 : undefined,
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
  ];

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* 左侧表格 */}
      <div style={{ 
        width: fullWidth ? '45%' : '55%', 
        minWidth: 300,
        borderRight: '1px solid var(--semi-color-border)',
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
        
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => record && onRecordSelect(record.id),
              style: {
                cursor: 'pointer',
                backgroundColor: record?.id === selectedRecord 
                  ? 'var(--semi-color-primary-light-default)' 
                  : undefined,
              },
            })}
            empty={
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                暂无数据
              </div>
            }
          />
        </div>
      </div>
      
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
