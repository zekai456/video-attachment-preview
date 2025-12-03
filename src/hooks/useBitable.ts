import { useState, useEffect, useCallback, useRef } from 'react';
import { bitable, FieldType, ITable } from '@lark-base-open/js-sdk';
import { AttachmentInfo, CachedUrls } from '../types';

// Dashboard 状态枚举
enum DashboardState {
  View = 'View',
  Config = 'Config',
  Create = 'Create'
}

interface Selection {
  tableId: string | null;
  viewId: string | null;
  fieldId: string | null;
  recordId: string | null;
}

interface UseBitableResult {
  loading: boolean;
  error: string | null;
  attachments: AttachmentInfo[];
  attachmentUrls: Map<string, string>;
  fieldName: string;
  isDashboard: boolean;
  isConfigMode: boolean;
  currentRecordIndex: number;
  totalRecords: number;
  goNext: () => void;
  goPrev: () => void;
  refreshAttachmentUrl: (token: string) => Promise<string | null>;
}

export function useBitable(): UseBitableResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map());
  const [fieldName, setFieldName] = useState<string>('附件预览');
  const [isDashboard, setIsDashboard] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const tableRef = useRef<ITable | null>(null);
  const currentSelectionRef = useRef<{ fieldId: string; recordId: string } | null>(null);
  const urlCacheRef = useRef<CachedUrls>({});
  const attachmentFieldIdsRef = useRef<Set<string>>(new Set());
  const recordIdsRef = useRef<string[]>([]);
  const dashboardFieldIdRef = useRef<string | null>(null);
  const URL_CACHE_DURATION = 8 * 60 * 1000;

  // 初始化
  useEffect(() => {
    initBitable();
  }, []);

  const initBitable = async () => {
    try {
      setLoading(true);
      
      // 检测是否在仪表盘环境
      let dashboardState: DashboardState | null = null;
      try {
        // @ts-ignore - dashboard 可能不存在
        if (bitable.dashboard && typeof bitable.dashboard.getState === 'function') {
          // @ts-ignore
          const state = await bitable.dashboard.getState();
          if (state) {
            dashboardState = state;
          }
        }
      } catch (e) {
        console.log('非仪表盘环境:', e);
        // 不在仪表盘环境，继续使用边栏模式
      }
      
      if (dashboardState) {
        console.log('仪表盘模式，状态:', dashboardState);
        setIsDashboard(true);
        setIsConfigMode(dashboardState === DashboardState.Config);
        try {
          await initDashboard(dashboardState);
        } catch (dashErr) {
          console.error('仪表盘初始化失败，回退到边栏模式:', dashErr);
          // 回退到边栏模式
          setIsDashboard(false);
          await initSidebar();
        }
      } else {
        // 边栏模式
        console.log('边栏模式');
        await initSidebar();
      }
      
      setLoading(false);
    } catch (err) {
      console.error('初始化失败:', err);
      setError('初始化失败，请刷新重试');
      setLoading(false);
    }
  };

  // 仪表盘模式初始化
  const initDashboard = async (state: DashboardState) => {
    try {
      // 获取仪表盘配置
      // @ts-ignore
      const config = await bitable.dashboard.getConfig();
      console.log('仪表盘配置:', config);
      
      // 如果没有配置，尝试使用当前活动表格
      if (!config || !config.dataConditions || config.dataConditions.length === 0) {
        console.log('无数据源配置，尝试使用当前表格');
        // 回退：使用当前活动表格
        const table = await bitable.base.getActiveTable();
        if (table) {
          await initWithTable(table);
          return;
        }
        
        if (state === DashboardState.Config) {
          setError('请配置数据源：选择包含附件的表格和字段');
        } else {
          setError('未配置数据源，请在表格中打开此插件');
        }
        return;
      }

      const dataCondition = config.dataConditions[0];
      const tableId = dataCondition.tableId;
      
      const table = await bitable.base.getTableById(tableId);
      tableRef.current = table;
      
      // 获取附件字段
      const fieldMetaList = await table.getFieldMetaList();
      const attachmentFields = fieldMetaList.filter(f => f.type === FieldType.Attachment);
      
      if (attachmentFields.length === 0) {
        setError('所选表格没有附件字段');
        return;
      }
      
      // 使用第一个附件字段或配置的字段
      const fieldId = attachmentFields[0].id;
      dashboardFieldIdRef.current = fieldId;
      setFieldName(attachmentFields[0].name);
      
      // 获取数据
      // @ts-ignore
      const data = await bitable.dashboard.getData();
      if (data && data.length > 0) {
        const recordIds = data.map((row: { recordId: string }) => row.recordId).filter(Boolean);
        recordIdsRef.current = recordIds;
        setTotalRecords(recordIds.length);
        
        if (recordIds.length > 0) {
          setCurrentRecordIndex(0);
          await loadAttachmentsForRecord(table, fieldId, recordIds[0]);
        }
      }
      
      // 监听配置变化
      // @ts-ignore
      bitable.dashboard.onConfigChange(async () => {
        // @ts-ignore
        await initDashboard(await bitable.dashboard.getState());
      });
      
      // 监听数据变化
      // @ts-ignore
      bitable.dashboard.onDataChange(async () => {
        // @ts-ignore
        const newData = await bitable.dashboard.getData();
        if (newData && newData.length > 0) {
          const recordIds = newData.map((row: { recordId: string }) => row.recordId).filter(Boolean);
          recordIdsRef.current = recordIds;
          setTotalRecords(recordIds.length);
          
          if (recordIds.length > 0 && dashboardFieldIdRef.current) {
            await loadAttachmentsForRecord(tableRef.current!, dashboardFieldIdRef.current, recordIds[0]);
          }
        }
      });
      
    } catch (err) {
      console.error('仪表盘初始化失败:', err);
      throw err; // 抛出错误让上层处理回退
    }
  };

  // 使用指定表格初始化（仪表盘回退用）
  const initWithTable = async (table: ITable) => {
    tableRef.current = table;
    
    const fieldMetaList = await table.getFieldMetaList();
    const attachmentFields = fieldMetaList.filter(f => f.type === FieldType.Attachment);
    
    if (attachmentFields.length === 0) {
      setError('当前表格没有附件字段');
      return;
    }
    
    const fieldId = attachmentFields[0].id;
    dashboardFieldIdRef.current = fieldId;
    attachmentFieldIdsRef.current = new Set(attachmentFields.map(f => f.id));
    setFieldName(attachmentFields[0].name);
    
    // 获取视图记录
    const view = await table.getActiveView();
    const recordIdList = await view.getVisibleRecordIdList();
    const recordIds = recordIdList.filter((id): id is string => id !== undefined);
    
    if (recordIds.length > 0) {
      recordIdsRef.current = recordIds;
      setTotalRecords(recordIds.length);
      setCurrentRecordIndex(0);
      await loadAttachmentsForRecord(table, fieldId, recordIds[0]);
    }
    
    // 监听选择变化
    bitable.base.onSelectionChange(handleSelectionChange);
  };

  // 边栏模式初始化
  const initSidebar = async () => {
    const table = await bitable.base.getActiveTable();
    tableRef.current = table;
    
    // 获取所有附件字段的ID
    const fieldMetaList = await table.getFieldMetaList();
    const attachmentFieldIds = fieldMetaList
      .filter(field => field.type === FieldType.Attachment)
      .map(field => field.id);
    
    if (attachmentFieldIds.length === 0) {
      setError('当前表格没有附件字段');
      return;
    }
    
    attachmentFieldIdsRef.current = new Set(attachmentFieldIds);

    // 获取当前选中
    const selection = await bitable.base.getSelection();
    if (selection.fieldId && selection.recordId) {
      await loadCellAttachments(table, selection.fieldId, selection.recordId);
    }
    
    // 监听选择变化
    bitable.base.onSelectionChange(handleSelectionChange);
  };

  const handleSelectionChange = async (event: { data: Selection }) => {
    const { fieldId, recordId } = event.data;
    if (!fieldId || !recordId || !tableRef.current) return;
    
    await loadCellAttachments(tableRef.current, fieldId, recordId);
  };
  
  // 仪表盘模式加载附件
  const loadAttachmentsForRecord = async (table: ITable, fieldId: string, recordId: string) => {
    currentSelectionRef.current = { fieldId, recordId };
    
    const cellValue = await table.getCellValue(fieldId, recordId);
    
    if (!cellValue || !Array.isArray(cellValue) || cellValue.length === 0) {
      setAttachments([]);
      setAttachmentUrls(new Map());
      return;
    }

    await processAttachments(table, fieldId, recordId, cellValue);
  };
  
  // 仪表盘翻页
  const goNext = useCallback(async () => {
    if (currentRecordIndex >= totalRecords - 1) return;
    if (!tableRef.current || !dashboardFieldIdRef.current) return;
    
    const newIndex = currentRecordIndex + 1;
    setCurrentRecordIndex(newIndex);
    await loadAttachmentsForRecord(
      tableRef.current, 
      dashboardFieldIdRef.current, 
      recordIdsRef.current[newIndex]
    );
  }, [currentRecordIndex, totalRecords]);

  const goPrev = useCallback(async () => {
    if (currentRecordIndex <= 0) return;
    if (!tableRef.current || !dashboardFieldIdRef.current) return;
    
    const newIndex = currentRecordIndex - 1;
    setCurrentRecordIndex(newIndex);
    await loadAttachmentsForRecord(
      tableRef.current, 
      dashboardFieldIdRef.current, 
      recordIdsRef.current[newIndex]
    );
  }, [currentRecordIndex]);

  const loadCellAttachments = async (table: ITable, fieldId: string, recordId: string) => {
    try {
      // 保存当前选中
      currentSelectionRef.current = { fieldId, recordId };
      
      // 获取字段信息
      const fieldMeta = await table.getFieldMetaById(fieldId);
      
      // 检查是否是附件字段
      if (fieldMeta.type !== FieldType.Attachment) {
        // 不是附件字段，尝试查找该记录中的第一个有附件的字段
        const attachmentFieldIds = Array.from(attachmentFieldIdsRef.current);
        
        for (const attFieldId of attachmentFieldIds) {
          const cellValue = await table.getCellValue(attFieldId, recordId);
          if (cellValue && Array.isArray(cellValue) && cellValue.length > 0) {
            const attFieldMeta = await table.getFieldMetaById(attFieldId);
            setFieldName(attFieldMeta.name);
            currentSelectionRef.current = { fieldId: attFieldId, recordId };
            await processAttachments(table, attFieldId, recordId, cellValue);
            return;
          }
        }
        
        // 该记录没有任何附件
        setFieldName('附件预览');
        setAttachments([]);
        setAttachmentUrls(new Map());
        return;
      }
      
      // 是附件字段
      setFieldName(fieldMeta.name);
      const cellValue = await table.getCellValue(fieldId, recordId);
      
      if (!cellValue || !Array.isArray(cellValue) || cellValue.length === 0) {
        setAttachments([]);
        setAttachmentUrls(new Map());
        return;
      }

      await processAttachments(table, fieldId, recordId, cellValue);
    } catch (err) {
      console.error('加载附件失败:', err);
      setAttachments([]);
      setAttachmentUrls(new Map());
    }
  };

  const processAttachments = async (
    table: ITable, 
    fieldId: string, 
    recordId: string, 
    cellValue: unknown[]
  ) => {
    const attachmentList: AttachmentInfo[] = cellValue.map((item: unknown) => {
      const att = item as { token: string; name: string; size?: number; type?: string; timeStamp?: number };
      return {
        token: att.token,
        name: att.name,
        size: att.size || 0,
        type: att.type || '',
        timeStamp: att.timeStamp || Date.now()
      };
    });
    
    setAttachments(attachmentList);

    // 批量获取附件URL
    const tokens = attachmentList.map(a => a.token);
    const urls = await getAttachmentUrls(table, tokens, fieldId, recordId);
    setAttachmentUrls(urls);
  };

  const getAttachmentUrls = async (
    table: ITable, 
    tokens: string[], 
    fieldId: string, 
    recordId: string
  ): Promise<Map<string, string>> => {
    const now = Date.now();
    const urlMap = new Map<string, string>();
    const tokensToFetch: string[] = [];

    tokens.forEach(token => {
      const cached = urlCacheRef.current[token];
      if (cached && cached.expireAt > now) {
        urlMap.set(token, cached.url);
      } else {
        tokensToFetch.push(token);
      }
    });

    if (tokensToFetch.length > 0) {
      try {
        const urls = await table.getCellAttachmentUrls(tokensToFetch, fieldId, recordId);
        tokensToFetch.forEach((token, index) => {
          const url = urls[index];
          if (url) {
            urlMap.set(token, url);
            urlCacheRef.current[token] = {
              url,
              expireAt: now + URL_CACHE_DURATION
            };
          }
        });
      } catch (err) {
        console.error('获取附件URL失败:', err);
      }
    }

    return urlMap;
  };

  const refreshAttachmentUrl = useCallback(async (token: string): Promise<string | null> => {
    if (!tableRef.current || !currentSelectionRef.current) return null;
    
    const { fieldId, recordId } = currentSelectionRef.current;
    
    try {
      const urls = await tableRef.current.getCellAttachmentUrls([token], fieldId, recordId);
      if (urls[0]) {
        urlCacheRef.current[token] = {
          url: urls[0],
          expireAt: Date.now() + URL_CACHE_DURATION
        };
        setAttachmentUrls(prev => new Map(prev).set(token, urls[0]));
        return urls[0];
      }
    } catch (err) {
      console.error('刷新URL失败:', err);
    }
    return null;
  }, []);

  return {
    loading,
    error,
    attachments,
    attachmentUrls,
    fieldName,
    isDashboard,
    isConfigMode,
    currentRecordIndex,
    totalRecords,
    goNext,
    goPrev,
    refreshAttachmentUrl
  };
}
