import { useState, useEffect, useCallback, useRef } from 'react';
import { bitable, FieldType, ITable } from '@lark-base-open/js-sdk';
import { AttachmentInfo, CachedUrls } from '../types';

export function useBitable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map());
  const [fieldName, setFieldName] = useState('Video Preview');
  const [recordName, setRecordName] = useState('');
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const tableRef = useRef<ITable | null>(null);
  const currentSelectionRef = useRef<{ fieldId: string; recordId: string } | null>(null);
  const urlCacheRef = useRef<CachedUrls>({});
  const recordIdsRef = useRef<string[]>([]);
  const attachmentFieldIdRef = useRef<string | null>(null);
  const primaryFieldIdRef = useRef<string | null>(null);
  const URL_CACHE_DURATION = 8 * 60 * 1000;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      setMessage('Loading...');
      
      const table = await bitable.base.getActiveTable();
      tableRef.current = table;
      
      const fieldMetaList = await table.getFieldMetaList();
      
      const attachmentFields = fieldMetaList.filter(f => f.type === FieldType.Attachment);
      if (attachmentFields.length === 0) {
        setError('No attachment field');
        setLoading(false);
        return;
      }
      
      const attachmentField = attachmentFields[0];
      attachmentFieldIdRef.current = attachmentField.id;
      setFieldName(attachmentField.name);
      
      const primaryField = fieldMetaList.find(f => f.isPrimary);
      if (primaryField) {
        primaryFieldIdRef.current = primaryField.id;
      }
      
      const view = await table.getActiveView();
      const recordIdList = await view.getVisibleRecordIdList();
      const recordIds = recordIdList.filter((id): id is string => id !== undefined);
      
      if (recordIds.length === 0) {
        setMessage('No records');
        setLoading(false);
        return;
      }
      
      recordIdsRef.current = recordIds;
      setTotalRecords(recordIds.length);
      
      setCurrentRecordIndex(0);
      await loadRecord(table, 0);
      
      setMessage(null);
      setLoading(false);
    } catch (err) {
      console.error('Init failed:', err);
      setError('Init failed');
      setLoading(false);
    }
  };

  const loadRecord = async (table: ITable, index: number) => {
    const recordId = recordIdsRef.current[index];
    const fieldId = attachmentFieldIdRef.current;
    
    if (!recordId || !fieldId) return;
    
    currentSelectionRef.current = { fieldId, recordId };
    
    if (primaryFieldIdRef.current) {
      try {
        const val = await table.getCellValue(primaryFieldIdRef.current, recordId);
        if (val && Array.isArray(val) && val.length > 0) {
          const first = val[0];
          if (first && typeof first === 'object' && 'text' in first) {
            setRecordName(String((first as {text?: string}).text || ''));
          } else {
            setRecordName(String(first || ''));
          }
        } else if (val) {
          setRecordName(String(val));
        } else {
          setRecordName('Record ' + (index + 1));
        }
      } catch {
        setRecordName('Record ' + (index + 1));
      }
    } else {
      setRecordName('Record ' + (index + 1));
    }
    
    const cellValue = await table.getCellValue(fieldId, recordId);
    
    if (!cellValue || !Array.isArray(cellValue) || cellValue.length === 0) {
      setAttachments([]);
      setAttachmentUrls(new Map());
      return;
    }

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

    const tokens = attachmentList.map(a => a.token);
    const urls = await getUrls(table, tokens, fieldId, recordId);
    setAttachmentUrls(urls);
  };

  const getUrls = async (
    table: ITable, 
    tokens: string[], 
    fieldId: string, 
    recordId: string
  ): Promise<Map<string, string>> => {
    const now = Date.now();
    const urlMap = new Map<string, string>();
    const toFetch: string[] = [];

    tokens.forEach(token => {
      const cached = urlCacheRef.current[token];
      if (cached && cached.expireAt > now) {
        urlMap.set(token, cached.url);
      } else {
        toFetch.push(token);
      }
    });

    if (toFetch.length > 0) {
      try {
        const urls = await table.getCellAttachmentUrls(toFetch, fieldId, recordId);
        toFetch.forEach((token, i) => {
          const url = urls[i];
          if (url) {
            urlMap.set(token, url);
            urlCacheRef.current[token] = { url, expireAt: now + URL_CACHE_DURATION };
          }
        });
      } catch (err) {
        console.error('Get URL failed:', err);
      }
    }

    return urlMap;
  };

  const goToRecord = useCallback(async (index: number) => {
    if (index < 0 || index >= recordIdsRef.current.length) return;
    if (!tableRef.current) return;
    
    setCurrentRecordIndex(index);
    await loadRecord(tableRef.current, index);
  }, []);

  const goNext = useCallback(() => {
    if (currentRecordIndex < totalRecords - 1) {
      goToRecord(currentRecordIndex + 1);
    }
  }, [currentRecordIndex, totalRecords, goToRecord]);

  const goPrev = useCallback(() => {
    if (currentRecordIndex > 0) {
      goToRecord(currentRecordIndex - 1);
    }
  }, [currentRecordIndex, goToRecord]);

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
      console.error('Refresh URL failed:', err);
    }
    return null;
  }, []);

  return {
    loading,
    error,
    message,
    attachments,
    attachmentUrls,
    fieldName,
    recordName,
    currentRecordIndex,
    totalRecords,
    goNext,
    goPrev,
    goToRecord,
    refreshAttachmentUrl
  };
}
