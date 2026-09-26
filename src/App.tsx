import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginModal } from './components/LoginModal';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { QuotesList } from './components/QuotesList';
import { QuoteModal } from './components/QuoteModal';
import { WorkOrdersList } from './components/WorkOrdersList';
import { WorkOrderModal } from './components/WorkOrderModal';
import { ClientsList } from './components/ClientsList';
import { TechniciansList } from './components/TechniciansList';
import { ServicesList } from './components/ServicesList';
import { UsersList } from './components/UsersList';
import { CompaniesList } from './components/CompaniesList';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { ShareModal } from './components/ShareModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { DevDriveSettingsModal } from './components/DevDriveSettingsModal';
import { DemoReturnBanner } from './components/DemoReturnBanner';
import { DemoDashboard } from './components/DemoDashboard';
import { CommercialPresentationModal } from './components/CommercialPresentationModal';
import { SplashScreen } from './components/SplashScreen';
import { Quote, WorkOrder } from './types';
import { api } from './services/api';

function MainApp() {
  const { user, activeCompany, companies, isSupervisor, authLoading, isBackendWakingUp, brandColor } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Recupera e sincroniza automaticamente os dados da nuvem para o SQLite local após deploys
  React.useEffect(() => {
    if (user) {
      api.syncCloudToLocal().catch((err) => {
        console.warn('Auto cloud sync error:', err);
      });
    }
  }, [user?.id]);

  // Enforce role-based tab restrictions strictly according to prompt
  const isDev = user?.role === 'DEV';
  const isManagerOrAdmin = user?.role === 'GERENTE' || user?.role === 'ADM';

  // Fallback if current tab is not allowed for user role
  const activeSafeTab = React.useMemo(() => {
    if (isDev) {
      if (['companies', 'demo', 'services', 'clients', 'technicians', 'quotes', 'work-orders', 'users', 'dashboard'].includes(currentTab)) {
        return currentTab;
      }
      return 'companies';
    }
    if (isManagerOrAdmin) {
      if (['dashboard', 'quotes', 'work-orders', 'clients', 'technicians', 'services', 'users'].includes(currentTab)) {
        return currentTab;
      }
      return 'dashboard';
    }
    if (user?.role === 'SUPERVISOR') {
      if (['dashboard', 'quotes', 'work-orders', 'clients', 'technicians', 'services'].includes(currentTab)) {
        return currentTab;
      }
      return 'dashboard';
    }
    // TÉCNICO: only dashboard, quotes, work-orders
    if (['dashboard', 'quotes', 'work-orders'].includes(currentTab)) {
      return currentTab;
    }
    return 'dashboard';
  }, [currentTab, isDev, isManagerOrAdmin, user?.role]);

  // Modals state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<WorkOrder | null>(null);

  // PDF Preview State
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfType, setPdfType] = useState<'ORÇAMENTO' | 'ORDEM DE SERVIÇO'>('ORÇAMENTO');
  const [pdfDoc, setPdfDoc] = useState<Quote | WorkOrder | null>(null);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareType, setShareType] = useState<'ORÇAMENTO' | 'ORDEM DE SERVIÇO'>('ORÇAMENTO');
  const [shareDoc, setShareDoc] = useState<Quote | WorkOrder | null>(null);

  // Google Drive Modal State
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveType, setDriveType] = useState<'ORÇAMENTO' | 'ORDEM DE SERVIÇO'>('ORÇAMENTO');
  const [driveDoc, setDriveDoc] = useState<Quote | WorkOrder | null>(null);

  // Commercial Presentation Modal State
  const [presentationModalOpen, setPresentationModalOpen] = useState(false);

  // DEV Google Drive Designated Account Modal State
  const [driveSettingsModalOpen, setDriveSettingsModalOpen] = useState(false);

  // Exibe a SplashScreen enquanto o estado de autenticação e os dados iniciais estão carregando,
  // ou enquanto o servidor backend em nuvem (Render/Cloud) está acordando de cold-start
  if (authLoading) {
    return (
      <SplashScreen
        brandColor={brandColor || '#2563eb'}
        isBackendWakingUp={isBackendWakingUp}
        statusText={isBackendWakingUp ? 'Conectando ao servidor em nuvem...' : 'Carregando ecossistema CAST QUOTE...'}
      />
    );
  }

  // Unauthenticated screen
  if (!user) {
    return <LoginModal />;
  }

  // Quick Action Triggers
  const handleNewQuote = () => {
    setQuoteToEdit(null);
    setQuoteModalOpen(true);
  };

  const handleEditQuote = (q: Quote) => {
    setQuoteToEdit(q);
    setQuoteModalOpen(true);
  };

  const handleViewQuote = (q: Quote) => {
    setPdfType('ORÇAMENTO');
    setPdfDoc(q);
    setPdfModalOpen(true);
  };

  const handleOpenQuotePdf = (q: Quote) => {
    setPdfType('ORÇAMENTO');
    setPdfDoc(q);
    setPdfModalOpen(true);
  };

  const handleOpenQuoteShare = (q: Quote) => {
    setShareType('ORÇAMENTO');
    setShareDoc(q);
    setShareModalOpen(true);
  };

  const handleOpenQuoteDrive = (q: Quote) => {
    setDriveType('ORÇAMENTO');
    setDriveDoc(q);
    setDriveModalOpen(true);
  };

  const handleNewWorkOrder = () => {
    setOrderToEdit(null);
    setOrderModalOpen(true);
  };

  const handleEditWorkOrder = (o: WorkOrder) => {
    setOrderToEdit(o);
    setOrderModalOpen(true);
  };

  const handleViewWorkOrder = (o: WorkOrder) => {
    setPdfType('ORDEM DE SERVIÇO');
    setPdfDoc(o);
    setPdfModalOpen(true);
  };

  const handleOpenOrderPdf = (o: WorkOrder) => {
    setPdfType('ORDEM DE SERVIÇO');
    setPdfDoc(o);
    setPdfModalOpen(true);
  };

  const handleOpenOrderShare = (o: WorkOrder) => {
    setShareType('ORDEM DE SERVIÇO');
    setShareDoc(o);
    setShareModalOpen(true);
  };

  const handleOpenOrderDrive = (o: WorkOrder) => {
    setDriveType('ORDEM DE SERVIÇO');
    setDriveDoc(o);
    setDriveModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Navigation */}
      <Navbar
        currentTab={activeSafeTab}
        onSelectTab={setCurrentTab}
        onNewQuote={handleNewQuote}
        onNewWorkOrder={handleNewWorkOrder}
        onOpenPresentation={() => setPresentationModalOpen(true)}
        onOpenDriveSettings={() => setDriveSettingsModalOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-16">
        {activeSafeTab === 'dashboard' && (
          <Dashboard
            onSelectTab={setCurrentTab}
            onNewQuote={handleNewQuote}
            onNewWorkOrder={handleNewWorkOrder}
            onViewQuote={handleViewQuote}
            onViewWorkOrder={handleViewWorkOrder}
            onOpenPresentation={() => setPresentationModalOpen(true)}
            onOpenDriveSettings={() => setDriveSettingsModalOpen(true)}
          />
        )}

        {activeSafeTab === 'quotes' && (
          <QuotesList
            onNewQuote={handleNewQuote}
            onEditQuote={handleEditQuote}
            onViewQuote={handleViewQuote}
            onOpenPdf={handleOpenQuotePdf}
            onOpenShare={handleOpenQuoteShare}
            onOpenDrive={isDev ? handleOpenQuoteDrive : undefined}
          />
        )}

        {activeSafeTab === 'work-orders' && (
          <WorkOrdersList
            onNewWorkOrder={handleNewWorkOrder}
            onEditWorkOrder={handleEditWorkOrder}
            onViewWorkOrder={handleViewWorkOrder}
            onOpenPdf={handleOpenOrderPdf}
            onOpenShare={handleOpenOrderShare}
            onOpenDrive={isDev ? handleOpenOrderDrive : undefined}
          />
        )}

        {activeSafeTab === 'clients' && <ClientsList />}

        {activeSafeTab === 'technicians' && <TechniciansList />}

        {activeSafeTab === 'services' && <ServicesList />}

        {activeSafeTab === 'users' && <UsersList />}

        {activeSafeTab === 'companies' && <CompaniesList />}

        {activeSafeTab === 'demo' && isDev && (
          <DemoDashboard
            onSelectTab={setCurrentTab}
            onNewQuote={handleNewQuote}
            onNewWorkOrder={handleNewWorkOrder}
            onOpenPresentation={() => setPresentationModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      {quoteModalOpen && (
        <QuoteModal
          isOpen={quoteModalOpen}
          onClose={() => setQuoteModalOpen(false)}
          onSaved={() => {
            // Trigger refresh by updating state or triggering reload
          }}
          quoteToEdit={quoteToEdit}
        />
      )}

      {orderModalOpen && (
        <WorkOrderModal
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          onSaved={() => {
            // Trigger refresh
          }}
          orderToEdit={orderToEdit}
        />
      )}

      {/* Modals with automatic company context resolution (especially for independent DEV) */}
      {(() => {
        const getEffectiveCompany = (doc: any) => {
          if (doc?.company_id) {
            const found = companies.find((c) => c.id === doc.company_id);
            if (found) return found;
          }
          return activeCompany || companies[0] || null;
        };

        return (
          <>
            {pdfModalOpen && (
              <PdfPreviewModal
                isOpen={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                type={pdfType}
                data={pdfDoc}
                company={getEffectiveCompany(pdfDoc)}
                onOpenShare={() => {
                  setPdfModalOpen(false);
                  setShareType(pdfType);
                  setShareDoc(pdfDoc);
                  setShareModalOpen(true);
                }}
                onOpenDrive={(user?.role === 'ADM' || user?.role === 'DEV') ? () => {
                  setPdfModalOpen(false);
                  setDriveType(pdfType);
                  setDriveDoc(pdfDoc);
                  setDriveModalOpen(true);
                } : undefined}
              />
            )}

            {shareModalOpen && (
              <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                type={shareType}
                data={shareDoc}
                company={getEffectiveCompany(shareDoc)}
              />
            )}

            {driveModalOpen && (
              <GoogleDriveModal
                isOpen={driveModalOpen}
                onClose={() => setDriveModalOpen(false)}
                type={driveType}
                data={driveDoc}
                company={getEffectiveCompany(driveDoc)}
              />
            )}

            {presentationModalOpen && (
              <CommercialPresentationModal
                isOpen={presentationModalOpen}
                onClose={() => setPresentationModalOpen(false)}
              />
            )}

            {driveSettingsModalOpen && (
              <DevDriveSettingsModal
                isOpen={driveSettingsModalOpen}
                onClose={() => setDriveSettingsModalOpen(false)}
              />
            )}
          </>
        );
      })()}

      <DemoReturnBanner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
