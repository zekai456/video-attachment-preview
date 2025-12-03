export interface AttachmentInfo {
  token: string;
  name: string;
  size: number;
  type: string;
  timeStamp: number;
}

export interface RecordAttachment {
  recordId: string;
  fieldId: string;
  attachments: AttachmentInfo[];
}

export type TabType = 'cover' | 'attachment';

export interface CachedUrls {
  [token: string]: {
    url: string;
    expireAt: number;
  };
}

// 判断是否为视频文件
export const isVideoFile = (type: string, name: string): boolean => {
  const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  
  if (videoTypes.some(t => type.toLowerCase().includes(t))) return true;
  return videoExtensions.some(ext => name.toLowerCase().endsWith(ext));
};

// 判断是否为图片文件
export const isImageFile = (type: string, name: string): boolean => {
  const imageTypes = ['image/'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  
  if (imageTypes.some(t => type.toLowerCase().includes(t))) return true;
  return imageExtensions.some(ext => name.toLowerCase().endsWith(ext));
};

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
