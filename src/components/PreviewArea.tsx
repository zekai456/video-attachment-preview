import { useState, useEffect } from 'react';
import { AttachmentInfo, isVideoFile, isImageFile } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { ImageViewer } from './ImageViewer';
import { AttachmentList } from './AttachmentList';
import { EmptyState } from './EmptyState';
import { FileText, Download } from 'lucide-react';

interface PreviewAreaProps {
  attachments: AttachmentInfo[];
  attachmentUrls: Map<string, string>;
  onRefreshUrl: (token: string) => Promise<string | null>;
}

export function PreviewArea({ attachments, attachmentUrls, onRefreshUrl }: PreviewAreaProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [attachments]);

  if (attachments.length === 0) {
    return <EmptyState type="no-attachment" />;
  }

  const currentAttachment = attachments[selectedIndex];
  const currentUrl = attachmentUrls.get(currentAttachment?.token);

  const handleUrlError = async () => {
    if (currentAttachment) {
      await onRefreshUrl(currentAttachment.token);
    }
  };

  const handleDownload = () => {
    if (currentUrl) {
      const a = document.createElement('a');
      a.href = currentUrl;
      a.download = currentAttachment.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const renderPreview = () => {
    if (!currentAttachment || !currentUrl) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    const isVideo = isVideoFile(currentAttachment.type, currentAttachment.name);
    const isImage = isImageFile(currentAttachment.type, currentAttachment.name);

    if (isVideo) {
      return (
        <div className="flex-1 p-4 animate-fadeIn">
          <VideoPlayer 
            url={currentUrl} 
            name={currentAttachment.name}
            onError={handleUrlError}
          />
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex-1 p-4 animate-fadeIn">
          <ImageViewer 
            url={currentUrl} 
            name={currentAttachment.name}
          />
        </div>
      );
    }

    // 其他文件类型
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fadeIn">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium mb-1 text-center max-w-[200px] truncate">
          {currentAttachment.name}
        </p>
        <p className="text-gray-400 text-sm mb-4">此文件类型暂不支持预览</p>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          下载文件
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {renderPreview()}
      
      <AttachmentList
        attachments={attachments}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        attachmentUrls={attachmentUrls}
      />
    </div>
  );
}
