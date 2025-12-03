import { TabType } from '../types';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-2 px-4 py-2 bg-white">
      <button
        onClick={() => onTabChange('cover')}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
          ${activeTab === 'cover'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
      >
        封面
      </button>
      <button
        onClick={() => onTabChange('attachment')}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
          ${activeTab === 'attachment'
            ? 'bg-orange-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
      >
        附件
      </button>
    </div>
  );
}
