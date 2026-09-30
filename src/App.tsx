/**
 * KK Shop Content Studio - Main Application Component
 * Thai grocery store in Taiwan (ร้านขอนแก่น)
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { MediaLibraryPage } from './pages/MediaLibraryPage';
import { ContentFactoryPage } from './pages/ContentFactoryPage';
import { ReelStudioPage } from './pages/ReelStudioPage';
import { ApprovalCenterPage } from './pages/ApprovalCenterPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { PublishedPostsPage } from './pages/PublishedPostsPage';
import { PerformancePage } from './pages/PerformancePage';
import { CharacterLibraryPage } from './pages/CharacterLibraryPage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { DashboardResponse, Product, ContentJob } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [selectedProductForContent, setSelectedProductForContent] = useState<Product | null>(null);
  const [selectedJobForSchedule, setSelectedJobForSchedule] = useState<ContentJob | null>(null);
  const [isAllReady, setIsAllReady] = useState<boolean>(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const [dash, status] = await Promise.all([
        api.getDashboard(),
        api.getStatus(),
      ]);
      setDashboardData(dash);
      setIsAllReady(status.allReady);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleSelectProductForContent = (product: Product) => {
    setSelectedProductForContent(product);
    setCurrentTab('factory');
  };

  const handleSelectJobForSchedule = (job: ContentJob) => {
    setSelectedJobForSchedule(job);
    setCurrentTab('scheduler');
  };

  const handleQuickApprove = async (jobId: string) => {
    try {
      await api.approveContent(jobId);
      loadDashboard();
    } catch (err: any) {
      console.error(`อนุมัติไม่สำเร็จ: ${err.message}`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-['Prompt',sans-serif] text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'dashboard') loadDashboard();
        }}
        waitingCount={dashboardData?.counts.waitingApproval || 0}
        scheduledCount={dashboardData?.counts.scheduled || 0}
        isAllReady={isAllReady}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Header */}
        <Header
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          waitingCount={dashboardData?.counts.waitingApproval || 0}
          onRefresh={loadDashboard}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardPage
                data={dashboardData}
                loading={loadingDashboard}
                onNavigate={setCurrentTab}
                onQuickApprove={handleQuickApprove}
              />
            )}

            {currentTab === 'products' && (
              <ProductsPage onSelectForContent={handleSelectProductForContent} />
            )}

            {currentTab === 'media' && <MediaLibraryPage />}

            {currentTab === 'factory' && (
              <ContentFactoryPage
                initialProduct={selectedProductForContent}
                onNavigateToApproval={() => {
                  setCurrentTab('approval');
                  loadDashboard();
                }}
              />
            )}

            {currentTab === 'reel-studio' && <ReelStudioPage />}

            {currentTab === 'approval' && (
              <ApprovalCenterPage onScheduleJob={handleSelectJobForSchedule} />
            )}

            {currentTab === 'scheduler' && (
              <SchedulerPage
                preselectedJob={selectedJobForSchedule}
                onNavigateToPublished={() => setCurrentTab('published')}
              />
            )}

            {currentTab === 'published' && (
              <PublishedPostsPage
                onNavigateToPerformance={() => setCurrentTab('performance')}
              />
            )}

            {currentTab === 'performance' && <PerformancePage />}

            {currentTab === 'characters' && <CharacterLibraryPage />}

            {currentTab === 'logs' && <LogsPage />}

            {currentTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
