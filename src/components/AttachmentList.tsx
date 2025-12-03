import { AttachmentInfo, isVideoFile, isImageFile, formatFileSize } from '../types';
import { FileVideo, FileImage, File, Check } from 'lucide-react';

interface AttachmentListProps {
  attachments: AttachmentInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  attachmentUrls: Map<string, string>;
}

export function AttachmentList({ attachments, selectedIndex, onSelect, attachmentUrls }: AttachmentListProps) {
  const getFileIcon = (attachment: AttachmentInfo) => {
    if (isVideoFile(attachment.type, attachment.name)) {
      return <FileVideo className="w-5 h-5 text-purple-500" />;
    }
    if (isImageFile(attachment.type, attachment.name)) {
      return <FileImage className="w-5 h-5 text-green-500" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const getThumbnail = (attachment: AttachmentInfo) => {
    const url = attachmentUrls.get(attachment.token);
    if (url && isImageFile(attachment.type, attachment.name)) {
      return url;
    }
    return null;
  };

  if (attachments.length <= 1) return null;

  return (
    <div className="px-4 py-3 bg-white border-t border-gray-100">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {attachments.map((attachment, index) => {
          const isSelected = index === selectedIndex;
          const thumbnail = getThumbnail(attachment);
          
          return (
            <button
              key={attachment.token}
              onClick={() => onSelect(index)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                ${isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              {thumbnail ? (
                <img 
                  src={thumbnail} 
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                  {getFileIcon(attachment)}
                </div>
              )}
              
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {isVideoFile(attachment.type, attachment.name) && (
                <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/60 rounded text-[10px] text-white">
                  视频
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-2 text-xs text-gray-500 truncate">
        {attachments[selectedIndex]?.name} · {formatFileSize(attachments[selectedIndex]?.size || 0)}
      </div>
    </div>
  );
}
