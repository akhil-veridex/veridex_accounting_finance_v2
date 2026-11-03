import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterTenantPage from './pages/RegisterTenantPage';
import WorkspaceSelectPage from './pages/WorkspaceSelectPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import ModuleConfigPage from './pages/ModuleConfigPage';
import GLWorkspacePage from './pages/GLWorkspacePage';
import BillingWorkspacePage from './pages/BillingWorkspacePage';
import TreasuryWorkspacePage from './pages/TreasuryWorkspacePage';
import CommissionsWorkspacePage from './pages/CommissionsWorkspacePage';
import FinanceCloseWorkspacePage from './pages/FinanceCloseWorkspacePage';
import CounterpartiesPage from './pages/CounterpartiesPage';
import OrganizationSettingsPage from './pages/OrganizationSettingsPage';
import EventDefinitionsPage from './pages/EventDefinitionsPage';
import PostingRulesPage from './pages/PostingRulesPage';
import EventSimulatorPage from './pages/EventSimulatorPage';
import RuleTestCasesPage from './pages/RuleTestCasesPage';
import ConfigBundlePage from './pages/ConfigBundlePage';
import EventOperationsPage from './pages/EventOperationsPage';
import DimensionsPage from './pages/DimensionsPage';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import {
  ShieldCheck,
  Building2,
  Users,
  Sliders,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Receipt,
  Percent,
  Landmark,
  CalendarCheck,
  ChevronDown,
  Layers,
  Users2,
  Shield,
  FileCode,
  Play,
  FileCheck,
  FolderSync,
  Activity,
  RotateCcw,
  Tags,
  FileText,
  DollarSign,
  Lock,
  Globe,
  Building,
  Table,
  ArrowRightLeft,
  Download,
  Send,
  Calendar,
  Database,
  CreditCard,
  FileSpreadsheet,
  TrendingUp,
  ShieldAlert,
  Scale,
  Clock,
  PieChart
} from 'lucide-react';
import { authApi } from './services/api';

const TENANT_TYPE_BADGES = {
  CARRIER: { label: 'Carrier', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  MGA: { label: 'MGA', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  BROKER: { label: 'Broker', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  OTHER: { label: 'Enterprise', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' }
};

export default function App() {
  const { user, currentWorkspace, availableWorkspaces, roles, loading, logout } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [glSection, setGlSection] = useState('journals');
  const [commSection, setCommSection] = useState('overview');
  const [billSection, setBillSection] = useState('overview');
  const [treasSection, setTreasSection] = useState('overview');
  const [closeSection, setCloseSection] = useState('overview');
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('v_sb_collapsed') === '1'; } catch { return false; }
  });

  React.useEffect(() => {
    document.body.classList.toggle('sb-collapsed', sidebarCollapsed);
    try { localStorage.setItem('v_sb_collapsed', sidebarCollapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  const handleNavSelect = (key, updateUrl = true) => {
    if (updateUrl) {
      try {
        let tab = key;
        let subtab = '';
        if (key.startsWith('gl:')) { tab = 'gl'; subtab = key.slice(3); }
        else if (key.startsWith('comm:')) { tab = 'commissions_fiduciary'; subtab = key.slice(5); }
        else if (key.startsWith('bill:')) { tab = 'billing_ar'; subtab = key.slice(5); }
        else if (key.startsWith('treas:')) { tab = 'treasury_bank_rec'; subtab = key.slice(6); }
        else if (key.startsWith('close:')) { tab = 'finance_close'; subtab = key.slice(6); }

        const search = subtab ? ('?tab=' + tab + '&subtab=' + subtab) : ('?tab=' + tab);
        window.history.pushState(null, '', window.location.pathname + search + '#' + key);
      } catch (e) { /* ignore */ }
    }
    if (key.startsWith('gl:')) {
      setGlSection(key.slice(3));
      setActiveTab('gl');
    } else if (key.startsWith('comm:')) {
      setCommSection(key.slice(5));
      setActiveTab('commissions_fiduciary');
    } else if (key.startsWith('bill:')) {
      setBillSection(key.slice(5));
      setActiveTab('billing_ar');
    } else if (key.startsWith('treas:')) {
      setTreasSection(key.slice(6));
      setActiveTab('treasury_bank_rec');
    } else if (key.startsWith('close:')) {
      setCloseSection(key.slice(6));
      setActiveTab('finance_close');
    } else {
      setActiveTab(key);
    }
  };

  // Synchronize deep-link URL params & hash routing on load and browser navigation (Top Level Hook)
  React.useEffect(() => {
    const syncFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      const tabParam = urlParams.get('tab');
      const subtabParam = urlParams.get('subtab');

      if (pageParam) {
        handleNavSelect(pageParam, false);
        return;
      }
      if (tabParam) {
        const prefixMap = {
          'gl': 'gl:',
          'commissions_fiduciary': 'comm:',
          'billing_ar': 'bill:',
          'treasury_bank_rec': 'treas:',
          'finance_close': 'close:'
        };
        const pfx = prefixMap[tabParam];
        if (pfx && subtabParam) {
          handleNavSelect(pfx + subtabParam, false);
          return;
        } else {
          handleNavSelect(tabParam, false);
          return;
        }
      }

      const rawHash = window.location.hash.replace(/^#\/?/, '');
      if (rawHash) {
        handleNavSelect(rawHash, false);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, []);


  const handleClearTestData = async () => {
    const confirmed = window.confirm(
      `⚠️ Clear Test Data for "${currentWorkspace?.name || 'this workspace'}"?\n\nThis will remove all test Invoices, Payments, Installment Schedules, Billing Accounts, Journals, and Counterparties for this tenant.\n\nYour user account and workspace login will remain active.`
    );
    if (!confirmed) return;

    setClearingData(true);
    try {
      await authApi.resetDevData();
      alert('✅ Test data cleared successfully! Reloading clean workspace.');
      window.location.reload();
    } catch (err) {
      alert(`❌ Failed to clear test data: ${err.message}`);
    } finally {
      setClearingData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-mono">Initializing Veridex One SaaS Session...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (authView === 'register') {
      return <RegisterTenantPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  // Modal for Workspace Switcher
  if (showWorkspaceSwitcher) {
    return (
      <WorkspaceSelectPage
        onProceed={() => {
          setShowWorkspaceSwitcher(false);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // Overview and Master Data Navigation
  const financialNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
  ];
  const masterDataNavItems = [
    { id: 'counterparties', label: 'Counterparties', icon: Users2 }
  ];

  // General Ledger sub-pages (each opens the GL workspace on that section)
  const glNavItems = [
    { id: 'gl:journals', label: 'Journal Register', icon: FileText },
    { id: 'gl:trial_balance', label: 'Trial Balance', icon: DollarSign },
    { id: 'gl:coa', label: 'Chart of Accounts (COA)', icon: BookOpen },
    { id: 'gl:periods', label: 'Fiscal Periods & Lock', icon: Lock },
    { id: 'gl:rules', label: 'Posting Rules', icon: Sliders },
    { id: 'gl:fx', label: 'Exchange Rates', icon: Globe }
  ];

  // Billing, Treasury and Finance Close sub-pages (each opens its workspace on that section)
  const billNavItems = [
    { id: 'bill:overview', label: 'AR Overview', icon: Layers },
    { id: 'bill:schedules', label: 'Installment Schedules', icon: Calendar },
    { id: 'bill:invoices', label: 'Invoices & Lines', icon: FileText },
    { id: 'bill:snapshots', label: 'Policy Snapshots & References', icon: Database },
    { id: 'bill:payments', label: 'Payments & Waterfall', icon: DollarSign },
    { id: 'bill:accounts', label: 'Billing Accounts', icon: CreditCard },
    { id: 'bill:plans', label: 'Billing Plans (4-Pay)', icon: Sliders },
    { id: 'bill:adjustments', label: 'Adjustments & Waivers', icon: Receipt }
  ];
  const treasNavItems = [
    { id: 'treas:overview', label: 'Treasury Overview', icon: Landmark },
    { id: 'treas:reconciliation', label: '2-Pane Bank Reconciliation', icon: FileCheck },
    { id: 'treas:statements', label: 'Bank Statement Feeds', icon: FileSpreadsheet },
    { id: 'treas:processors', label: 'Processor Settlements', icon: TrendingUp },
    { id: 'treas:returns', label: 'NSF Returns & Dishonors', icon: RotateCcw },
    { id: 'treas:refunds', label: 'Disbursed Refunds', icon: CreditCard },
    { id: 'treas:dunning', label: 'Dunning & Collections', icon: ShieldAlert }
  ];
  const closeNavItems = [
    { id: 'close:overview', label: 'Overview', icon: CalendarCheck },
    { id: 'close:checklist', label: '7-Step Close Checklist', icon: FileCheck },
    { id: 'close:reconciliation', label: 'Subledger Reconciliation', icon: Scale },
    { id: 'close:upr', label: 'UPR & Earned Premium', icon: Clock },
    { id: 'close:trial_balance', label: 'Trial Balance', icon: Layers },
    { id: 'close:financial_statements', label: 'Financial Statements', icon: PieChart },
    // Hidden from the sidebar for now (page and route are kept intact)
    { id: 'close:export_batches', label: 'ERP Export Batches', icon: Download, hidden: true }
  ];

  // Commissions & Settlements sub-pages (each opens the workspace on that section)
  const commNavItems = [
    { id: 'comm:overview', label: 'Overview & Chain', icon: FileText },
    { id: 'comm:agreements', label: 'Agreements', icon: Building },
    { id: 'comm:schedules', label: 'Commission Schedules', icon: Layers },
    { id: 'comm:profit_schedules', label: 'Profit Commission', icon: Table },
    { id: 'comm:splits', label: 'Producer Splits', icon: ArrowRightLeft },
    { id: 'comm:transactions', label: 'Commission Register', icon: DollarSign },
    { id: 'comm:fiduciary', label: 'Fiduciary Trust & Sweeps', icon: ShieldCheck },
    { id: 'comm:bordereaux', label: 'Bordereaux Runs', icon: Download },
    { id: 'comm:settlements', label: 'Carrier Settlements', icon: Send }
  ];

  // Accounting Configuration & Rules-Driven Engine Navigation
  const rulesNavItems = [
    { id: 'event_definitions', label: 'Event Definitions', icon: FileCode },
    { id: 'posting_rules', label: 'Journal Entry Rules', icon: Sliders },
    { id: 'dimensions', label: 'Accounting Dimensions', icon: Tags },
    { id: 'event_simulator', label: 'Event Simulator', icon: Play },
    { id: 'event_operations', label: 'Event Operations', icon: Activity },
    { id: 'rule_tests', label: 'Rule Test Cases', icon: FileCheck },
    { id: 'config_bundle', label: 'Configuration Bundle', icon: FolderSync }
  ];

  // Administration Navigation (Role-Guarded)
  const isAdmin = roles.includes('TENANT_ADMIN') || user?.is_platform_admin;
  const adminNavItems = [
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'settings', label: 'Organization Settings', icon: Sliders },
    { id: 'modules', label: 'Module Configuration', icon: Layers }
  ];

  const tenantType = currentWorkspace?.tenant_type || 'MGA';
  const typeBadge = TENANT_TYPE_BADGES[tenantType] || TENANT_TYPE_BADGES.MGA;

  const activeKey = activeTab === "gl" ? `gl:${glSection}` : activeTab === "commissions_fiduciary" ? `comm:${commSection}` : activeTab === "billing_ar" ? `bill:${billSection}` : activeTab === "treasury_bank_rec" ? `treas:${treasSection}` : activeTab === "finance_close" ? `close:${closeSection}` : activeTab;

  const navGroups = [
    { id: 'financial', label: 'Overview', icon: LayoutDashboard, items: financialNavItems },
    { id: 'master_data', label: 'Master Data', icon: Users2, items: masterDataNavItems },
    { id: 'gl', label: 'General Ledger', icon: BookOpen, items: glNavItems },
    { id: 'billing', label: 'Billing & Accounts Receivable', icon: Receipt, items: billNavItems },
    { id: 'commissions', label: 'Commissions & Settlements', icon: Percent, items: commNavItems },
    { id: 'treasury', label: 'Treasury & Bank Reconciliation', icon: Landmark, items: treasNavItems },
    { id: 'close', label: 'Finance Close & Financial Reports', icon: CalendarCheck, items: closeNavItems },
    { id: 'rules', label: 'Accounting Configuration', icon: Sliders, items: rulesNavItems },
    ...(isAdmin ? [{ id: 'admin', label: 'Administration', icon: Shield, items: adminNavItems }] : [])
  ];
  const activeGroup = navGroups.find(g => g.items.some(i => i.id === activeKey));
  const activeItem = activeGroup?.items.find(i => i.id === activeKey);
  const breadcrumbs = {
    section: activeGroup?.label || 'Workspace',
    page: activeItem?.label || 'Dashboard'
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar
        groups={navGroups}
        activeTab={activeKey}
        onSelect={handleNavSelect}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />
      <Header
        breadcrumbs={breadcrumbs}
        workspace={currentWorkspace}
        typeLabel={typeBadge.label}
        onSwitchWorkspace={() => setShowWorkspaceSwitcher(true)}
        onClearTestData={handleClearTestData}
        clearing={clearingData}
        user={user}
        roles={roles}
        onLogout={logout}
      />

      <main className="main-content" id="main-content">
          {activeTab === 'dashboard' && <TenantDashboardPage onNavigateTab={setActiveTab} />}
          {activeTab === 'gl' && <GLWorkspacePage section={glSection} onNavigateTab={setActiveTab} />}
          {activeTab === 'billing_ar' && <BillingWorkspacePage section={billSection} onSectionChange={setBillSection} />}
          {activeTab === 'commissions_fiduciary' && <CommissionsWorkspacePage section={commSection} />}
          {activeTab === 'treasury_bank_rec' && <TreasuryWorkspacePage section={treasSection} onSectionChange={setTreasSection} />}
          {activeTab === 'finance_close' && <FinanceCloseWorkspacePage section={closeSection} />}
          {activeTab === 'counterparties' && <CounterpartiesPage />}
          {activeTab === 'event_definitions' && <EventDefinitionsPage />}
          {activeTab === 'posting_rules' && <PostingRulesPage />}
          {activeTab === 'dimensions' && <DimensionsPage />}
          {activeTab === 'event_simulator' && <EventSimulatorPage />}
          {activeTab === 'event_operations' && <EventOperationsPage />}
          {activeTab === 'rule_tests' && <RuleTestCasesPage />}
          {activeTab === 'config_bundle' && <ConfigBundlePage />}
          {activeTab === 'users' && <UserManagementPage />}
          {activeTab === 'settings' && <OrganizationSettingsPage />}
          {activeTab === 'modules' && <ModuleConfigPage />}
      </main>
    </>
  );
}
