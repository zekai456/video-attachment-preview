import { useState } from 'react';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { PreviewArea } from './components/PreviewArea';
import { EmptyState } from './components/EmptyState';
import { useBitable } from './hooks/useBitable';
import { TabType } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('attachment');
  
  const {
    loading,
    error,
    currentIndex,
    totalRecords,
    attachments,
    attachmentUrls,
    goNext,
    goPrev,
    refreshAttachmentUrl
  } = useBitable();

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <EmptyState type="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-white">
        <EmptyState type="error" message={error} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <Header
        currentIndex={currentIndex}
        totalRecords={totalRecords}
        onPrev={goPrev}
        onNext={goNext}
      />
      
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <PreviewArea
        attachments={attachments}
        attachmentUrls={attachmentUrls}
        onRefreshUrl={refreshAttachmentUrl}
      />
    </div>
  );
}

export default App;
