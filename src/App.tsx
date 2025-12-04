import { useEffect, useState, useCallback } from 'react';
import { dashboard, bitable, FieldType, IConfig as SDKConfig, IDataCondition } from '@lark-base-open/js-sdk';
import { Spin } from '@douyinfe/semi-ui';
import { ConfigPanel } from './components/ConfigPanel';
import { ViewPanel } from './components/ViewPanel';

// 仪表盘状态枚举
enum DashboardState {
  Create = 'Create',
  Config = 'Config',
  View = 'View',
  FullScreen = 'FullScreen',
}

// 自定义配置接口
interface ICustomConfig {
  tableId: string;
  viewId: string;
  attachmentFieldId: string;
}

// 表格选项
interface TableOption {
  value: string;
  label: string;
}

interface ViewOption {
  value: string;
  label: string;
}

interface FieldOption {
  value: string;
  label: string;
}

// 附件类型
interface AttachmentItem {
  token: string;
  name: string;
  type?: string;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DashboardState>(DashboardState.View);
  
  // 配置相关
  const [tables, setTables] = useState<TableOption[]>([]);
  const [views, setViews] = useState<ViewOption[]>([]);
  const [fields, setFields] = useState<FieldOption[]>([]);
  
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedView, setSelectedView] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  
  // 数据相关
  const [records, setRecords] = useState<Array<{id: string; name: string; hasVideo: boolean}>>([]);
  const [selectedRecord, setSelectedRecord] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  // 初始化
  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    try {
      setLoading(true);
      
      // 获取仪表盘状态
      const currentState = dashboard.state as DashboardState;
      console.log('Dashboard state:', currentState);
      setState(currentState);
      
      // 如果状态为空或未知，默认进入配置状态
      if (!currentState || (currentState !== DashboardState.View && currentState !== DashboardState.FullScreen)) {
        setState(DashboardState.Config);
      }
      
      // 获取所有表
      const tableList = await bitable.base.getTableList();
      const tableOptions: TableOption[] = [];
      for (const table of tableList) {
        const name = await table.getName();
        tableOptions.push({ value: table.id, label: name });
      }
      setTables(tableOptions);
      
      if (currentState === DashboardState.Create) {
        // 创建状态：自动选择第一个表
        if (tableOptions.length > 0) {
          await handleTableChange(tableOptions[0].value);
        }
      } else {
        // 配置/展示状态：读取已保存的配置
        try {
          const config = await dashboard.getConfig();
          const customConfig = config?.customConfig as ICustomConfig | undefined;
          if (customConfig) {
            const { tableId, viewId, attachmentFieldId } = customConfig;
            if (tableId) {
              setSelectedTable(tableId);
              await loadViews(tableId);
              await loadFields(tableId);
              
              if (viewId) setSelectedView(viewId);
              if (attachmentFieldId) setSelectedField(attachmentFieldId);
              
              // 加载记录数据
              if (viewId && attachmentFieldId) {
                await loadRecords(tableId, viewId, attachmentFieldId);
              }
            }
          }
        } catch (e) {
          console.log('No saved config yet');
          if (tableOptions.length > 0) {
            await handleTableChange(tableOptions[0].value);
          }
        }
      }
      
      // 监听配置变化
      dashboard.onConfigChange(async (event: { data: SDKConfig }) => {
        const customConfig = event.data?.customConfig as ICustomConfig | undefined;
        if (customConfig) {
          const { tableId, viewId, attachmentFieldId } = customConfig;
          if (tableId && viewId && attachmentFieldId) {
            await loadRecords(tableId, viewId, attachmentFieldId);
          }
        }
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Init failed:', err);
      setLoading(false);
    }
  };

  const loadViews = async (tableId: string) => {
    try {
      const table = await bitable.base.getTableById(tableId);
      const viewList = await table.getViewMetaList();
      const viewOptions: ViewOption[] = viewList.map((v: { id: string; name: string }) => ({
        value: v.id,
        label: v.name,
      }));
      setViews(viewOptions);
      return viewOptions;
    } catch (e) {
      console.error('Load views failed:', e);
      return [];
    }
  };

  const loadFields = async (tableId: string) => {
    try {
      const table = await bitable.base.getTableById(tableId);
      const fieldList = await table.getFieldMetaList();
      // 只获取附件类型的字段
      const attachmentFields = fieldList.filter((f: { type: FieldType }) => f.type === FieldType.Attachment);
      const fieldOptions: FieldOption[] = attachmentFields.map((f: { id: string; name: string }) => ({
        value: f.id,
        label: f.name,
      }));
      setFields(fieldOptions);
      return fieldOptions;
    } catch (e) {
      console.error('Load fields failed:', e);
      return [];
    }
  };

  const loadRecords = async (tableId: string, viewId: string, fieldId: string) => {
    try {
      const table = await bitable.base.getTableById(tableId);
      const view = await table.getViewById(viewId);
      const recordIdList = await view.getVisibleRecordIdList();
      
      const fieldMeta = await table.getFieldMetaList();
      const primaryField = fieldMeta.find((f: { isPrimary?: boolean }) => f.isPrimary);
      
      const recordList: Array<{id: string; name: string; hasVideo: boolean}> = [];
      
      for (const recordId of recordIdList) {
        if (!recordId) continue;
        
        let name = '';
        if (primaryField) {
          const val = await table.getCellValue(primaryField.id, recordId);
          if (val && Array.isArray(val) && val.length > 0) {
            const first = val[0] as { text?: string } | string;
            if (first && typeof first === 'object' && 'text' in first) {
              name = String(first.text || '');
            } else {
              name = String(first || '');
            }
          } else if (val) {
            name = String(val);
          }
        }
        
        // 检查是否有视频附件
        const attVal = await table.getCellValue(fieldId, recordId);
        let hasVideo = false;
        if (attVal && Array.isArray(attVal) && attVal.length > 0) {
          hasVideo = attVal.some((item) => {
            const att = item as AttachmentItem;
            const type = att.type || '';
            const fileName = att.name || '';
            return type.startsWith('video/') || 
                   /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);
          });
        }
        
        recordList.push({ id: recordId, name: name || `Record ${recordList.length + 1}`, hasVideo });
      }
      
      setRecords(recordList);
      
      // 自动选择第一条有视频的记录
      const firstVideo = recordList.find(r => r.hasVideo);
      if (firstVideo) {
        await handleRecordSelect(tableId, fieldId, firstVideo.id);
      }
    } catch (e) {
      console.error('Load records failed:', e);
    }
  };

  const handleTableChange = async (tableId: string) => {
    setSelectedTable(tableId);
    setSelectedView('');
    setSelectedField('');
    setRecords([]);
    setVideoUrl('');
    
    const viewOptions = await loadViews(tableId);
    const fieldOptions = await loadFields(tableId);
    
    // 自动选择第一个视图和字段
    if (viewOptions.length > 0) {
      setSelectedView(viewOptions[0].value);
    }
    if (fieldOptions.length > 0) {
      setSelectedField(fieldOptions[0].value);
    }
  };

  const handleViewChange = (viewId: string) => {
    setSelectedView(viewId);
  };

  const handleFieldChange = (fieldId: string) => {
    setSelectedField(fieldId);
  };

  const handleRecordSelect = useCallback(async (tableId: string, fieldId: string, recordId: string) => {
    setSelectedRecord(recordId);
    
    try {
      const table = await bitable.base.getTableById(tableId);
      const attVal = await table.getCellValue(fieldId, recordId);
      
      if (attVal && Array.isArray(attVal) && attVal.length > 0) {
        // 找到视频附件
        const videoAtt = attVal.find((item) => {
          const att = item as AttachmentItem;
          const type = att.type || '';
          const fileName = att.name || '';
          return type.startsWith('video/') || 
                 /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);
        });
        
        if (videoAtt) {
          const token = (videoAtt as AttachmentItem).token;
          const urls = await table.getCellAttachmentUrls([token], fieldId, recordId);
          if (urls[0]) {
            setVideoUrl(urls[0]);
          }
        }
      }
    } catch (e) {
      console.error('Get video URL failed:', e);
    }
  }, []);

  const handleSaveConfig = async () => {
    try {
      const dataConditions: IDataCondition[] = [{
        tableId: selectedTable,
      }];
      
      const config: SDKConfig = {
        dataConditions,
        customConfig: {
          tableId: selectedTable,
          viewId: selectedView,
          attachmentFieldId: selectedField,
        },
      };
      await dashboard.saveConfig(config);
    } catch (e) {
      console.error('Save config failed:', e);
    }
  };

  const handlePreview = async () => {
    if (selectedTable && selectedView && selectedField) {
      await loadRecords(selectedTable, selectedView, selectedField);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  console.log('Current state for render:', state);

  // 配置状态（Create 或 Config）- 显示配置面板
  const isConfigMode = state === DashboardState.Create || state === DashboardState.Config;
  
  if (isConfigMode) {
    return (
      <div className="dashboard-container">
        <div className="preview-area">
          <ViewPanel
            records={records}
            selectedRecord={selectedRecord}
            videoUrl={videoUrl}
            onRecordSelect={(id: string) => handleRecordSelect(selectedTable, selectedField, id)}
          />
        </div>
        <div className="config-panel">
          <ConfigPanel
            tables={tables}
            views={views}
            fields={fields}
            selectedTable={selectedTable}
            selectedView={selectedView}
            selectedField={selectedField}
            onTableChange={handleTableChange}
            onViewChange={handleViewChange}
            onFieldChange={handleFieldChange}
            onPreview={handlePreview}
            onSave={handleSaveConfig}
          />
        </div>
      </div>
    );
  }

  // 展示状态（View 或 FullScreen）
  return (
    <ViewPanel
      records={records}
      selectedRecord={selectedRecord}
      videoUrl={videoUrl}
      onRecordSelect={(id: string) => handleRecordSelect(selectedTable, selectedField, id)}
      fullWidth
    />
  );
}

export default App;
