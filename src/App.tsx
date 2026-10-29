import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import type { AppKey } from '@/config/nav';
import { Login } from '@/pages/Login';
import { Home } from '@/pages/Home';
import { HrDashboard } from '@/pages/hr/HrDashboard';
import { Leave } from '@/pages/hr/Leave';
import { Absence } from '@/pages/hr/Absence';
import { ComplianceDashboard } from '@/pages/compliance/ComplianceDashboard';
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
      <Route path="/hr/recruitment" element={<Shell app="hr">{ph('Recruitment', 'Vacancies, hiring requests and applicant stages.', 'an upcoming step')}</Shell>} />
      <Route path="/hr/onboarding" element={<Shell app="hr">{ph('Onboarding', 'New starter checklists, equipment, training and induction.', 'an upcoming step')}</Shell>} />
      <Route path="/hr/documents" element={<Shell app="hr">{ph('Documents', 'Contracts, offer letters and HR documents, with expiry reminders.', 'an upcoming step')}</Shell>} />
      <Route path="/hr/policies" element={<Shell app="hr"><Policies /></Shell>} />
      <Route path="/hr/support" element={<Shell app="hr">{ph('Support', 'Raise and track support requests.', 'a later step')}</Shell>} />
      <Route path="/hr/settings" element={<Shell app="hr">{ph('Settings', 'Leave entitlements, departments, team and preferences.', 'a later step')}</Shell>} />

      {/* Compliance app */}
      <Route path="/compliance" element={<Shell app="compliance"><ComplianceDashboard /></Shell>} />
      <Route path="/compliance/workers" element={<Shell app="compliance"><WorkersRegister app="compliance" /></Shell>} />
      <Route path="/compliance/workers/new" element={<Shell app="compliance"><WorkerForm app="compliance" /></Shell>} />
      <Route path="/compliance/workers/:id" element={<Shell app="compliance"><WorkerProfile app="compliance" /></Shell>} />
      <Route path="/compliance/workers/:id/edit" element={<Shell app="compliance"><WorkerForm app="compliance" /></Shell>} />
      <Route path="/compliance/right-to-work" element={<Shell app="compliance">{ph('Right to Work & eVisa', 'Share code checks, statutory excuse and follow-up scheduling.', 'the next build step')}</Shell>} />
      <Route path="/compliance/employment" element={<Shell app="compliance">{ph('Employment & CoS', 'SOC and salary alignment against going rates, and role-eligibility reviews.', 'an upcoming step')}</Shell>} />
      <Route path="/compliance/absence" element={<Shell app="compliance">{ph('Absence Monitoring', 'Absence and attendance, with the UKVI 10 working day trigger.', 'an upcoming step')}</Shell>} />
      <Route path="/compliance/documents" element={<Shell app="compliance">{ph('Documents & Retention', 'Appendix D checklist, uploads, acknowledgements and retention clocks.', 'an upcoming step')}</Shell>} />
      <Route path="/compliance/reporting" element={<Shell app="compliance">{ph('Change Reporting', 'Reportable events, working-day deadlines, and the SMS Copilot.', 'Phase 2')}</Shell>} />
      <Route path="/compliance/audit" element={<Shell app="compliance">{ph('Audit Trail', 'Complete, append-only activity log and the one-click audit pack.', 'an upcoming step')}</Shell>} />
      <Route path="/compliance/reports" element={<Shell app="compliance">{ph('Reports', 'Fixed compliance reports and the inspection audit pack.', 'an upcoming step')}</Shell>} />
      <Route path="/compliance/settings" element={<Shell app="compliance">{ph('Settings', 'Organisation and licence, key personnel, going rates and alert thresholds.', 'an upcoming step')}</Shell>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
