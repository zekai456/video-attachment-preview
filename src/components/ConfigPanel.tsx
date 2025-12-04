import { Select, Button, Typography, Input, Tabs, TabPane, Divider } from '@douyinfe/semi-ui';
import { IconGridStroked } from '@douyinfe/semi-icons';

const { Text } = Typography;

interface Option {
  value: string;
  label: string;
}

interface ConfigPanelProps {
  tables: Option[];
  views: Option[];
  fields: Option[];
  allFields: Option[];
  selectedTable: string;
  selectedView: string;
  selectedField: string;
  filterField: string;
  visibleFields: string[];
  title: string;
  onTableChange: (value: string) => void;
  onViewChange: (value: string) => void;
  onFieldChange: (value: string) => void;
  onFilterFieldChange: (value: string) => void;
  onVisibleFieldsChange: (values: string[]) => void;
  onTitleChange: (value: string) => void;
  onPreview: () => void;
  onSave: () => void;
}

export function ConfigPanel({
  tables,
  views,
  fields,
  allFields,
  selectedTable,
  selectedView,
  selectedField,
  filterField,
  visibleFields,
  title,
  onTableChange,
  onViewChange,
  onFieldChange,
  onFilterFieldChange,
  onVisibleFieldsChange,
  onTitleChange,
  onPreview,
  onSave,
}: ConfigPanelProps) {
  // 获取选中的表名
  const selectedTableName = tables.find(t => t.value === selectedTable)?.label || '';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden',
    }}>
      <Tabs type="line" size="small" style={{ flex: 1, overflow: 'auto' }}>
        <TabPane tab="基础配置" itemKey="basic">
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 标题 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>标题</Text>
              <div style={{ marginLeft: 0 }}>
                <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>标题</Text>
                <Input
                  value={title}
                  onChange={(value) => onTitleChange(value)}
                  placeholder="请输入标题"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <Divider margin={0} />

            {/* 数据 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>数据</Text>
              <div style={{ marginLeft: 0 }}>
                <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>来源</Text>
                <Select
                  style={{ width: '100%' }}
                  value={selectedTable}
                  onChange={(value) => onTableChange(value as string)}
                  placeholder="请选择数据表"
                  optionList={tables.map(t => ({
                    value: t.value,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconGridStroked style={{ color: 'var(--semi-color-primary)' }} />
                        <span>{t.label}</span>
                      </div>
                    ),
                  }))}
                  renderSelectedItem={() => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconGridStroked style={{ color: 'var(--semi-color-primary)' }} />
                      <span>{selectedTableName}</span>
                    </div>
                  )}
                />
              </div>
            </div>

            <Divider margin={0} />

            {/* 数据可见范围 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>数据可见范围</Text>
              
              <div style={{ marginBottom: 16 }}>
                <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>视图</Text>
                <Select
                  style={{ width: '100%' }}
                  value={selectedView}
                  onChange={(value) => onViewChange(value as string)}
                  optionList={views}
                  placeholder="请选择视图"
                  disabled={!selectedTable}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>筛选条件</Text>
                <Select
                  style={{ width: '100%' }}
                  value={filterField}
                  onChange={(value) => onFilterFieldChange(value as string)}
                  optionList={[{ value: '', label: '不筛选' }, ...allFields]}
                  placeholder="选择筛选字段"
                  disabled={!selectedTable}
                />
                {filterField && (
                  <Text type="tertiary" size="small" style={{ marginTop: 4, display: 'block' }}>
                    将排除该字段值为"审核通过"的记录
                  </Text>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>可见字段</Text>
                <Select
                  style={{ width: '100%' }}
                  value={visibleFields}
                  onChange={(values) => onVisibleFieldsChange(values as string[])}
                  optionList={allFields}
                  placeholder="选择要显示的字段"
                  disabled={!selectedTable}
                  multiple
                  maxTagCount={3}
                  filter
                />
                <Text type="tertiary" size="small" style={{ marginTop: 4, display: 'block' }}>
                  选择在左侧表格中显示的字段，不选则显示前5个
                </Text>
              </div>
            </div>
          </div>
        </TabPane>

        <TabPane tab="自定义配置" itemKey="custom">
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 视频字段 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>视频设置</Text>
              <div>
                <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>视频附件字段</Text>
                <Select
                  style={{ width: '100%' }}
                  value={selectedField}
                  onChange={(value) => onFieldChange(value as string)}
                  optionList={fields}
                  placeholder="请选择附件字段"
                  disabled={!selectedTable}
                />
              </div>
            </div>

            <Divider margin={0} />

            {/* 预览按钮 */}
            <Button
              theme="light"
              onClick={onPreview}
              disabled={!selectedTable || !selectedView || !selectedField}
              block
            >
              加载预览数据
            </Button>
          </div>
        </TabPane>
      </Tabs>

      {/* 底部确认按钮 */}
      <div style={{ 
        padding: '16px 0',
        borderTop: '1px solid var(--semi-color-border)',
      }}>
        <Button
          theme="solid"
          type="primary"
          onClick={onSave}
          disabled={!selectedTable || !selectedView || !selectedField}
          block
        >
          确认
        </Button>
      </div>
    </div>
  );
}
