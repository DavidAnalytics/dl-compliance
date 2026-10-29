import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Policies } from '@/pages/Policies';
import { WorkersRegister } from '@/pages/WorkersRegister';
import { WorkerForm } from '@/pages/WorkerForm';
import { WorkerProfile } from '@/pages/WorkerProfile';
import { ModulePlaceholder } from '@/pages/ModulePlaceholder';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function Placeholder(props: { title: string; description: string; phase: string }) {
  return <Shell><ModulePlaceholder {...props} /></Shell>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Shell><Dashboard /></Shell>} />

      {/* Workers */}
      <Route path="/workers" element={<Shell><WorkersRegister /></Shell>} />
      <Route path="/workers/new" element={<Shell><WorkerForm /></Shell>} />
      <Route path="/workers/:id" element={<Shell><WorkerProfile /></Shell>} />
      <Route path="/workers/:id/edit" element={<Shell><WorkerForm /></Shell>} />

      {/* Compliance modules (built out through Phase 1) */}
      <Route path="/right-to-work" element={<Placeholder title="Right to Work & eVisa" description="Share code checks, statutory excuse, and follow-up scheduling." phase="the next build step" />} />
      <Route path="/employment" element={<Placeholder title="Employment & CoS" description="SOC and salary alignment against going rates, and role-eligibility reviews." phase="an upcoming build step" />} />
      <Route path="/absences" element={<Placeholder title="Absence Monitoring" description="Absence and attendance, with the UKVI 10 working day trigger." phase="an upcoming build step" />} />
      <Route path="/documents" element={<Placeholder title="Documents & Retention" description="Appendix D checklist, uploads, acknowledgements and retention clocks." phase="an upcoming build step" />} />
      <Route path="/reporting" element={<Placeholder title="Change Reporting" description="Reportable events, working-day deadlines, and the SMS Copilot." phase="Phase 2" />} />
      <Route path="/policies" element={<Shell><Policies /></Shell>} />
      <Route path="/audit" element={<Placeholder title="Audit Trail" description="Complete, append-only activity log and the one-click audit pack." phase="an upcoming build step" />} />
      <Route path="/reports" element={<Placeholder title="Reports" description="Fixed compliance reports and the inspection audit pack." phase="an upcoming build step" />} />

      {/* HR modules */}
      <Route path="/leave" element={<Placeholder title="Leave & Holiday" description="Holiday entitlement, requests and balances." phase="later in Phase 1" />} />
      <Route path="/sickness" element={<Placeholder title="Sickness" description="Sickness absence, self-certification and fit notes." phase="later in Phase 1" />} />
      <Route path="/onboarding" element={<Placeholder title="Onboarding" description="New starter checklist and first-day compliance steps." phase="later in Phase 1" />} />
      <Route path="/hr-documents" element={<Placeholder title="HR Documents" description="Contracts, statements and general HR paperwork." phase="later in Phase 1" />} />

      {/* Settings */}
      <Route path="/settings" element={<Placeholder title="Settings" description="Organisation and licence, key personnel, going rates, alert thresholds and users." phase="an upcoming build step" />} />
    </Routes>
  );
}
