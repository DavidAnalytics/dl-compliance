import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Policies } from '@/pages/Policies';
import { ModulePlaceholder } from '@/pages/ModulePlaceholder';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Shell><Dashboard /></Shell>} />

      <Route
        path="/workers"
        element={
          <Shell>
            <ModulePlaceholder
              title="Engaged Workers Register"
              description="The worker record: personal, employment and immigration fields."
              phase="Phase 1"
            />
          </Shell>
        }
      />
      <Route
        path="/right-to-work"
        element={
          <Shell>
            <ModulePlaceholder
              title="Right to Work & eVisa Checks"
              description="Share code checks, verification dates, and automatic follow-up scheduling."
              phase="Phase 1"
            />
          </Shell>
        }
      />
      <Route
        path="/absences"
        element={
          <Shell>
            <ModulePlaceholder
              title="Travel & Absence Records"
              description="Leave and absence log, with the UKVI 10 working day reporting trigger."
              phase="Phase 1"
            />
          </Shell>
        }
      />
      <Route
        path="/dbs"
        element={
          <Shell>
            <ModulePlaceholder
              title="DBS Tracking"
              description="Certificate type, issue date and renewal prompts for regulated roles."
              phase="Phase 1"
            />
          </Shell>
        }
      />
      <Route
        path="/documents"
        element={
          <Shell>
            <ModulePlaceholder
              title="Document Management & Acknowledgements"
              description="Appendix D record-keeping with retention dates and worker sign-off."
              phase="Phase 1"
            />
          </Shell>
        }
      />
      <Route path="/policies" element={<Shell><Policies /></Shell>} />
      <Route
        path="/reporting"
        element={
          <Shell>
            <ModulePlaceholder
              title="Reporting & SMS Copilot"
              description="Reportable events, deadlines, and AI-drafted SMS wording."
              phase="Phase 2"
            />
          </Shell>
        }
      />
      <Route
        path="/governance"
        element={
          <Shell>
            <ModulePlaceholder
              title="Key Personnel & AO Governance"
              description="Authorising Officer, Key Contact and SMS user roles."
              phase="Phase 1"
            />
          </Shell>
        }
      />
      <Route
        path="/audit"
        element={
          <Shell>
            <ModulePlaceholder
              title="Audit Trail & Compliance Reports"
              description="Timestamped, append-only activity log and inspection-ready export."
              phase="Phase 1"
            />
          </Shell>
        }
      />
    </Routes>
  );
}
