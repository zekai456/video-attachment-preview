import { useState } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageViewerProps {
  url: string;
  name: string;
}

export function ImageViewer({ url, name }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-xl p-8">
        <div className="text-gray-400 text-center">
          <p>图片加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-xl overflow-hidden group">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center overflow-hidden p-4">
        <img
          src={url}
          alt={name}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{ 
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          draggable={false}
        />
      </div>

      {/* 工具栏 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        
        <span className="text-sm text-gray-600 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          title="放大"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        
        <div className="w-px h-5 bg-gray-200" />
        
        <button
          onClick={handleRotate}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          title="旋转"
        >
          <RotateCw className="w-4 h-4 text-gray-600" />
        </button>
        
        <button
          onClick={handleDownload}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          title="下载"
        >
          <Download className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
