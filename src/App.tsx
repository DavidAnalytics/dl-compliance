import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { isWorker } from '@/lib/roles';
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
import { MyOverview } from '@/pages/me/MyOverview';
import { MyDetails } from '@/pages/me/MyDetails';
import { MyLeave } from '@/pages/me/MyLeave';
import { MyDocuments } from '@/pages/me/MyDocuments';
import { MyPolicies } from '@/pages/me/MyPolicies';

// Employees (workers) cannot reach staff areas.
function RequireStaff({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <div className="flex min-h-screen items-center justify-center text-ink-faint">Loading…</div>;
  if (isWorker(profile.role)) return <Navigate to="/me" replace />;
  return <>{children}</>;
}

function StaffShell({ app, children }: { app: AppKey; children: React.ReactNode }) {
  return <ProtectedRoute><RequireStaff><AppShell app={app}>{children}</AppShell></RequireStaff></ProtectedRoute>;
}
function EmpShell({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><AppShell app="employee">{children}</AppShell></ProtectedRoute>;
}

function RoleHome() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-ink-faint">Loading…</div>;
  if (isWorker(profile?.role)) return <Navigate to="/me" replace />;
  return <Home />;
}

const ph = (title: string, description: string, phase: string) => <ModulePlaceholder title={title} description={description} phase={phase} />;

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />

      {/* Employee portal */}
      <Route path="/me" element={<EmpShell><MyOverview /></EmpShell>} />
      <Route path="/me/details" element={<EmpShell><MyDetails /></EmpShell>} />
      <Route path="/me/leave" element={<EmpShell><MyLeave /></EmpShell>} />
      <Route path="/me/documents" element={<EmpShell><MyDocuments /></EmpShell>} />
      <Route path="/me/policies" element={<EmpShell><MyPolicies /></EmpShell>} />

      {/* HR app (staff only) */}
      <Route path="/hr" element={<StaffShell app="hr"><HrDashboard /></StaffShell>} />
      <Route path="/hr/employees" element={<StaffShell app="hr"><WorkersRegister app="hr" /></StaffShell>} />
      <Route path="/hr/employees/new" element={<StaffShell app="hr"><WorkerForm app="hr" /></StaffShell>} />
      <Route path="/hr/employees/:id" element={<StaffShell app="hr"><WorkerProfile app="hr" /></StaffShell>} />
      <Route path="/hr/employees/:id/edit" element={<StaffShell app="hr"><WorkerForm app="hr" /></StaffShell>} />
      <Route path="/hr/leave" element={<StaffShell app="hr"><Leave /></StaffShell>} />
      <Route path="/hr/absence" element={<StaffShell app="hr"><Absence /></StaffShell>} />
      <Route path="/hr/recruitment" element={<StaffShell app="hr"><Recruitment /></StaffShell>} />
      <Route path="/hr/onboarding" element={<StaffShell app="hr"><Onboarding /></StaffShell>} />
      <Route path="/hr/documents" element={<StaffShell app="hr"><HrDocuments /></StaffShell>} />
      <Route path="/hr/policies" element={<StaffShell app="hr"><Policies /></StaffShell>} />
      <Route path="/hr/support" element={<StaffShell app="hr">{ph('Support', 'Raise and track support requests.', 'a later step')}</StaffShell>} />
      <Route path="/hr/settings" element={<StaffShell app="hr">{ph('Settings', 'Leave entitlements, departments, team and preferences.', 'a later step')}</StaffShell>} />

      {/* Compliance app (staff only) */}
      <Route path="/compliance" element={<StaffShell app="compliance"><ComplianceDashboard /></StaffShell>} />
      <Route path="/compliance/workers" element={<StaffShell app="compliance"><WorkersRegister app="compliance" /></StaffShell>} />
      <Route path="/compliance/workers/new" element={<StaffShell app="compliance"><WorkerForm app="compliance" /></StaffShell>} />
      <Route path="/compliance/workers/:id" element={<StaffShell app="compliance"><WorkerProfile app="compliance" /></StaffShell>} />
      <Route path="/compliance/workers/:id/edit" element={<StaffShell app="compliance"><WorkerForm app="compliance" /></StaffShell>} />
      <Route path="/compliance/right-to-work" element={<StaffShell app="compliance"><RightToWork /></StaffShell>} />
      <Route path="/compliance/employment" element={<StaffShell app="compliance"><Employment /></StaffShell>} />
      <Route path="/compliance/absence" element={<StaffShell app="compliance"><AbsenceMonitoring /></StaffShell>} />
      <Route path="/compliance/documents" element={<StaffShell app="compliance"><ComplianceDocuments /></StaffShell>} />
      <Route path="/compliance/reporting" element={<StaffShell app="compliance"><ChangeReporting /></StaffShell>} />
      <Route path="/compliance/audit" element={<StaffShell app="compliance"><AuditTrail /></StaffShell>} />
      <Route path="/compliance/reports" element={<StaffShell app="compliance"><Reports /></StaffShell>} />
      <Route path="/compliance/settings" element={<StaffShell app="compliance">{ph('Settings', 'Organisation and licence, key personnel, going rates and alert thresholds.', 'an upcoming step')}</StaffShell>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
