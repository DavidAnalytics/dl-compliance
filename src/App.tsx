import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import type { AppKey } from '@/config/nav';
import { Login } from '@/pages/Login';
import { Home } from '@/pages/Home';
import { HrDashboard } from '@/pages/hr/HrDashboard';
import { Leave } from '@/pages/hr/Leave';
import { Absence } from '@/pages/hr/Absence';
import { Recruitment } from '@/pages/hr/Recruitment';
import { Onboarding } from '@/pages/hr/Onboarding';
import { Documents as HrDocuments } from '@/pages/hr/Documents';
import { ComplianceDashboard } from '@/pages/compliance/ComplianceDashboard';
import { RightToWork } from '@/pages/compliance/RightToWork';
import { Employment } from '@/pages/compliance/Employment';
import { AbsenceMonitoring } from '@/pages/compliance/AbsenceMonitoring';
import { ComplianceDocuments } from '@/pages/compliance/ComplianceDocuments';
import { ChangeReporting } from '@/pages/compliance/ChangeReporting';
import { AuditTrail } from '@/pages/compliance/AuditTrail';
import { Reports } from '@/pages/compliance/Reports';
import { WorkersRegister } from '@/pages/WorkersRegister';
import { WorkerForm } from '@/pages/WorkerForm';
import { WorkerProfile } from '@/pages/WorkerProfile';
import { Policies } from '@/pages/Policies';
import { ModulePlaceholder } from '@/pages/ModulePlaceholder';

function Shell({ app, children }: { app: AppKey; children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell app={app}>{children}</AppShell>
    </ProtectedRoute>
  );
}

const ph = (title: string, description: string, phase: string) => (
  <ModulePlaceholder title={title} description={description} phase={phase} />
);

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

      {/* HR app */}
      <Route path="/hr" element={<Shell app="hr"><HrDashboard /></Shell>} />
      <Route path="/hr/employees" element={<Shell app="hr"><WorkersRegister app="hr" /></Shell>} />
      <Route path="/hr/employees/new" element={<Shell app="hr"><WorkerForm app="hr" /></Shell>} />
      <Route path="/hr/employees/:id" element={<Shell app="hr"><WorkerProfile app="hr" /></Shell>} />
      <Route path="/hr/employees/:id/edit" element={<Shell app="hr"><WorkerForm app="hr" /></Shell>} />
      <Route path="/hr/leave" element={<Shell app="hr"><Leave /></Shell>} />
      <Route path="/hr/absence" element={<Shell app="hr"><Absence /></Shell>} />
      <Route path="/hr/recruitment" element={<Shell app="hr"><Recruitment /></Shell>} />
      <Route path="/hr/onboarding" element={<Shell app="hr"><Onboarding /></Shell>} />
      <Route path="/hr/documents" element={<Shell app="hr"><HrDocuments /></Shell>} />
      <Route path="/hr/policies" element={<Shell app="hr"><Policies /></Shell>} />
      <Route path="/hr/support" element={<Shell app="hr">{ph('Support', 'Raise and track support requests.', 'a later step')}</Shell>} />
      <Route path="/hr/settings" element={<Shell app="hr">{ph('Settings', 'Leave entitlements, departments, team and preferences.', 'a later step')}</Shell>} />

      {/* Compliance app */}
      <Route path="/compliance" element={<Shell app="compliance"><ComplianceDashboard /></Shell>} />
      <Route path="/compliance/workers" element={<Shell app="compliance"><WorkersRegister app="compliance" /></Shell>} />
      <Route path="/compliance/workers/new" element={<Shell app="compliance"><WorkerForm app="compliance" /></Shell>} />
      <Route path="/compliance/workers/:id" element={<Shell app="compliance"><WorkerProfile app="compliance" /></Shell>} />
      <Route path="/compliance/workers/:id/edit" element={<Shell app="compliance"><WorkerForm app="compliance" /></Shell>} />
      <Route path="/compliance/right-to-work" element={<Shell app="compliance"><RightToWork /></Shell>} />
      <Route path="/compliance/employment" element={<Shell app="compliance"><Employment /></Shell>} />
      <Route path="/compliance/absence" element={<Shell app="compliance"><AbsenceMonitoring /></Shell>} />
      <Route path="/compliance/documents" element={<Shell app="compliance"><ComplianceDocuments /></Shell>} />
      <Route path="/compliance/reporting" element={<Shell app="compliance"><ChangeReporting /></Shell>} />
      <Route path="/compliance/audit" element={<Shell app="compliance"><AuditTrail /></Shell>} />
      <Route path="/compliance/reports" element={<Shell app="compliance"><Reports /></Shell>} />
      <Route path="/compliance/settings" element={<Shell app="compliance">{ph('Settings', 'Organisation and licence, key personnel, going rates and alert thresholds.', 'an upcoming step')}</Shell>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
