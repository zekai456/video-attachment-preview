import { useState, useEffect, useCallback, useRef } from 'react';
import { bitable, FieldType, IAttachmentField, ITable } from '@lark-base-open/js-sdk';
import { AttachmentInfo, CachedUrls } from '../types';

interface Selection {
  tableId: string | null;
  viewId: string | null;
  fieldId: string | null;
  recordId: string | null;
}

interface UseBitableResult {
  loading: boolean;
  error: string | null;
  currentIndex: number;
  totalRecords: number;
  attachments: AttachmentInfo[];
  attachmentUrls: Map<string, string>;
  goToRecord: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  refreshAttachmentUrl: (token: string) => Promise<string | null>;
}

export function useBitable(): UseBitableResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordIds, setRecordIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map());
  const [attachmentFieldId, setAttachmentFieldId] = useState<string | null>(null);
  
  const tableRef = useRef<ITable | null>(null);
  const urlCacheRef = useRef<CachedUrls>({});
  const URL_CACHE_DURATION = 8 * 60 * 1000; // 8分钟缓存（URL有效期10分钟）

  // 初始化
  useEffect(() => {
    initBitable();
    
    // 监听选择变化
    const off = bitable.base.onSelectionChange(handleSelectionChange);
    return () => off();
  }, []);

  const initBitable = async () => {
    try {
      setLoading(true);
      const table = await bitable.base.getActiveTable();
      tableRef.current = table;
      
      // 获取附件字段
      const attachmentFields = await table.getFieldListByType<IAttachmentField>(FieldType.Attachment);
      if (attachmentFields.length === 0) {
        setError('当前表格没有附件字段');
        setLoading(false);
        return;
      }
      setAttachmentFieldId(attachmentFields[0].id);

      // 获取当前视图的记录
      const view = await table.getActiveView();
      const visibleRecordIds = await view.getVisibleRecordIdList();
      setRecordIds(visibleRecordIds);
      setTotalRecords(visibleRecordIds.length);

      // 获取当前选中的记录
      const selection = await bitable.base.getSelection();
      if (selection.recordId && visibleRecordIds.includes(selection.recordId)) {
        const index = visibleRecordIds.indexOf(selection.recordId);
        setCurrentIndex(index);
        await loadAttachments(table, attachmentFields[0].id, selection.recordId);
      } else if (visibleRecordIds.length > 0) {
        setCurrentIndex(0);
        await loadAttachments(table, attachmentFields[0].id, visibleRecordIds[0]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('初始化失败:', err);
      setError('初始化失败，请刷新重试');
      setLoading(false);
    }
  };

  const handleSelectionChange = async (event: { data: Selection }) => {
    const { recordId } = event.data;
    if (!recordId || !tableRef.current || !attachmentFieldId) return;
    
    const index = recordIds.indexOf(recordId);
    if (index !== -1) {
      setCurrentIndex(index);
      await loadAttachments(tableRef.current, attachmentFieldId, recordId);
    }
  };

  const loadAttachments = async (table: ITable, fieldId: string, recordId: string) => {
    try {
      const cellValue = await table.getCellValue(fieldId, recordId);
      
      if (!cellValue || !Array.isArray(cellValue) || cellValue.length === 0) {
        setAttachments([]);
        setAttachmentUrls(new Map());
        return;
      }

      const attachmentList: AttachmentInfo[] = cellValue.map((item: any) => ({
        token: item.token,
        name: item.name,
        size: item.size || 0,
        type: item.type || '',
        timeStamp: item.timeStamp || Date.now()
      }));
      
      setAttachments(attachmentList);

      // 批量获取附件URL
      const tokens = attachmentList.map(a => a.token);
      const urls = await getAttachmentUrls(table, tokens, fieldId, recordId);
      setAttachmentUrls(urls);
    } catch (err) {
      console.error('加载附件失败:', err);
      setAttachments([]);
      setAttachmentUrls(new Map());
    }
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

    // 检查缓存
    tokens.forEach(token => {
      const cached = urlCacheRef.current[token];
      if (cached && cached.expireAt > now) {
        urlMap.set(token, cached.url);
      } else {
        tokensToFetch.push(token);
      }
    });

    // 获取未缓存的URL
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
    if (!tableRef.current || !attachmentFieldId || recordIds.length === 0) return null;
    
    try {
      const recordId = recordIds[currentIndex];
      const urls = await tableRef.current.getCellAttachmentUrls([token], attachmentFieldId, recordId);
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
  }, [currentIndex, recordIds, attachmentFieldId]);

  const goToRecord = useCallback(async (index: number) => {
    if (index < 0 || index >= totalRecords || !tableRef.current || !attachmentFieldId) return;
    
    setCurrentIndex(index);
    const recordId = recordIds[index];
    await loadAttachments(tableRef.current, attachmentFieldId, recordId);
  }, [totalRecords, recordIds, attachmentFieldId]);

  const goNext = useCallback(() => {
    if (currentIndex < totalRecords - 1) {
      goToRecord(currentIndex + 1);
    }
  }, [currentIndex, totalRecords, goToRecord]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      goToRecord(currentIndex - 1);
    }
  }, [currentIndex, goToRecord]);

  return {
    loading,
    error,
    currentIndex,
    totalRecords,
    attachments,
    attachmentUrls,
    goToRecord,
    goNext,
    goPrev,
    refreshAttachmentUrl
  };
}
