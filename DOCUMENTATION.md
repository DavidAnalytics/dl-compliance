# DL People & Compliance

## System documentation for DL Business Systems Ltd

Last updated 30 October 2026. Company number 17211065.

---

## 1. Purpose

DL People & Compliance is an in-house platform that does two jobs for DL Business Systems Ltd. It runs the company's HR, and it keeps the company on the right side of its UK sponsor licence duties for the worker it sponsors. It was built to replace a paid HR subscription and to avoid paying an external service for sponsor compliance, while staying inspection-ready at all times.

It is one application, reached by a single sign-in, that opens into two separate workspaces behind that login:

- **DL People**, the HR workspace.
- **DL Compliance**, the sponsor duties workspace.

Everything is live, hosted under the company's own accounts, with data held in the UK. It is reachable at app.dlbusinesssystems.com.

---

## 2. Who uses it, and what they can see

Access is controlled by role. People see only what their role allows, enforced both in the interface and at the database.

- **Administrator and HR (Jonathan).** Full access to both workspaces, every record, all approvals, and settings.
- **Employee (David, the sponsored worker).** A self-service portal only. Own details, own leave, own documents, and policies to read and acknowledge. No access to DL Compliance, to other people's data, or to staff HR functions. Staff accounts are kept out of the employee portal and employee accounts are kept out of the staff areas, enforced by route guards and by the database.
- **Viewer (optional, not yet assigned).** A read-only role available for an adviser or accountant if needed.

---

## 3. The HR workspace (DL People)

- **Dashboard.** Headcount, who is on leave, leave balances, upcoming leave, a news and events feed, and recent activity, all calculated from live records.
- **Employees.** A directory and full employee record: personal details, job title, department, manager and reporting line, contract type, employee number, emergency contacts, documents, and a history of changes including transfers and promotions. Create, edit and manage starters, movers and leavers. The register exports to CSV, and each worker profile exports a full record as a print-ready PDF.
- **Leave and holiday.** Entitlements and balances per person, a request and approval workflow, a team calendar, overlapping-leave checks, and working-day calculation that excludes weekends and England and Wales bank holidays. Approving a request records it so the compliance side stays in step. The request list exports to CSV.
- **Absence.** Sickness and other absence across the team.
- **Recruitment.** Vacancies and a candidate pipeline across stages, with CV links, interview notes, feedback and offers.
- **Onboarding.** New-starter checklists with a standard template, covering right to work, contracts, equipment, induction and training, with progress tracking.
- **Documents.** A secure store for contracts, offer letters and HR documents, with categories (including passport, National Insurance, visa or BRP, right to work and DBS), expiry reminders, and controlled access.
- **Policies.** A versioned policy library. Each policy holds a PDF, an effective date and a review date, all editable by HR. Replacing a PDF bumps the version, and staff acknowledgements are tracked per version so people are prompted to read a policy again when it changes.
- **News & Events.** HR posts company news, events and perks. Published posts appear on the employee overview and the HR dashboard. Posts can be saved as drafts and published later.

---

## 4. The Compliance workspace (DL Compliance)

Built to current UK sponsor guidance: Appendix D record-keeping, the 1 October 2026 right to work guide, and Part 3 sponsor duties.

- **Dashboard.** The DL Compliance Readiness Score across six domains, the items needing attention, and the engaged workers at a glance. Each domain box carries a hover hint explaining where its number comes from and what turns it green.
- **Engaged Workers.** The register and a full worker profile with a live compliance strip covering right to work, visa, documents, absence, DBS and salary. The register exports to CSV and each profile exports a full dossier to PDF.
- **Right to Work.** Records each check, the method used, the statutory excuse type under List A or List B, share code validation, and automatic follow-up scheduling for time-limited leave.
- **Employment and CoS.** Salary alignment against the going rate, going-rate reference data that HR maintains in Settings, per-period pay checks sourced from the payroll figures, and role-eligibility reviews.
- **Absence Monitoring.** Absence through the UKVI lens, with the 10 working day reporting trigger raised for qualifying unauthorised absence.
- **Documents and Retention.** The Appendix D record-keeping checklist per worker, with retention guidance.
- **Change Reporting.** A log of reportable events with the correct 10 or 20 working-day deadline calculated for each, and a record of what has been reported.
- **Audit Trail.** A complete, append-only record of every change, which cannot be edited or deleted. It also drives the recent-activity panels and each worker's activity log.
- **Reports.** An inspection-ready summary and a one-click audit pack for an officer or a mock audit.

---

## 5. The DL Compliance Readiness Score

The score is a single headline number out of 100 with a red, amber or green rating, computed from live data rather than entered by hand. It is recalculated every night and a dated snapshot is saved, so the trend over time is kept.

Six weighted domains make it up, and all six are measured from data the app holds:

- **Right to Work and Immigration Status (25%).** Each sponsored worker has a passed check on file, the statutory excuse has not lapsed, and no visa has expired.
- **Record-Keeping and Documentation (20%).** The Appendix D required documents are present for each worker.
- **Reporting and SMS Timeliness (20%).** No reportable event is past its deadline.
- **Monitoring (15%).** No visa has expired and there are no unresolved reportable absences.
- **Key Personnel and Governance (10%).** An Authorising Officer, a Key Contact and a Level 1 User are all named.
- **Recruitment and Suitability (10%).** Salaries meet the SOC going rate and DBS checks are on file where required.

The score reads low until the real records are entered, because it reflects exactly what is in the system. As right to work checks, documents and the other records are added, it rises on its own.

---

## 6. Automation

All of the following run on schedule inside Supabase, at no cost on the current plan.

- **Readiness score (nightly, 05:45).** Recomputes all six domains from live data and saves a dated snapshot.
- **Alerts engine (nightly, 06:00).** Builds alerts from every date that matters: visa expiry, right to work follow-ups, DBS renewals, document expiry, reporting deadlines and role reviews. Alerts are raised within 90 days and when overdue, and appear on the in-app alerts bell for staff.
- **Alert email digest (nightly, 06:15).** Emails the open alerts to HR so nothing is missed without logging in. Sent from the company domain through Resend.
- **Leave request alerts (immediate).** When the employee submits a leave request, an alert appears at once on the staff dashboard bell, and clears automatically when the request is approved or rejected.
- **Nightly backup and systems check (nightly, 02:30).** Exports the full database to a dated file and emails it to backups@dlbusinesssystems.com, with a systems check at the top confirming every scheduled job ran, or warning if one failed. This gives an off-platform copy of the data and a daily health signal, since an email that stops arriving is itself a warning.

---

## 7. Accounts and passwords

- Each person signs in with an email and password.
- A self-service password reset is on the sign-in screen. Either person can request a reset link for either account, and the link is delivered to that account's inbox.
- A logged-in user can change their password from the profile menu.
- Multi-factor authentication for the administrator account is planned as the final step before full handover, set up with Jonathan present so recovery is tested.

---

## 8. Search

Staff have a single search box in the header that looks across people, policies, documents, right-to-work checks and reportable events at once. Results appear grouped as you type, and selecting one opens that record, with a worker going straight to their profile.

---

## 9. Settings

Settings is where the configuration the platform runs on is maintained, without developer involvement.

- **Compliance settings.** Organisation and licence details, the SMS key personnel, and the SOC going rates. The key personnel feed the governance domain of the score and the going rates feed the recruitment domain.
- **HR settings.** Leave entitlement per employee, departments, leave types, and bank holidays.

---

## 10. How it is built

- **Interface.** A responsive web application in React, Vite and TypeScript, styled with a purple and indigo design system. It works on desktop, tablet and mobile.
- **Database, security and files.** Supabase, which provides a Postgres database, user login, and private file storage, in the London region so data stays in the UK.
- **Hosting.** Netlify serves the application from the company's own account, deploying automatically when code is pushed.
- **Source control.** The code lives in the company's own GitHub repository.
- **Scheduled jobs and email.** The nightly jobs run inside Supabase on pg_cron, with the email-sending functions holding the Resend key server-side.

---

## 11. Security and data protection

- All data is held in the UK (Supabase London region).
- Row-level security is on for every table, so the database itself enforces who can see what, not just the interface. An employee can only ever read their own records.
- Files are stored in a private bucket and served only through short-lived signed links.
- The audit log is append-only and cannot be altered.
- Access is least-privilege: people see only what their role needs.
- The Resend sending key is held server-side only and never exposed in the application.
- A nightly off-platform backup is emailed to a company inbox, independent of the live database.
- Leaked-password protection and administrator MFA are available to switch on, recommended before full handover.
- The company is the data controller. Supabase, Netlify and Resend are data processors.

---

## 12. Integrations and external services

- **FreeAgent** remains the payroll system. The platform does not run payroll. It captures payslips and checks pay per period against the going rate. An automatic pull from FreeAgent is a possible future enhancement.
- **Resend** delivers the alert digest and the nightly backup email. The company's domain is verified for sending.
- **Supabase, Netlify, GitHub** host the database, the site and the code, all under the company's own accounts.

---

## 13. Regulatory basis

The compliance logic follows current UK Home Office sponsor guidance, specifically Appendix D record-keeping duties, the Employer's guide to right to work checks effective 1 October 2026, and Part 3 sponsor duties and compliance. Working-day calculations use the official England and Wales bank holidays. The system is an internal record-keeping aid and is not a substitute for legal advice. Reporting thresholds and going rates are held as editable settings so they can be kept current as the rules change.

---

## 14. Running costs

The platform currently runs on free tiers across Supabase, Netlify and Resend, so the ongoing cost is effectively nil at this volume. This replaces the previous HR subscription and the cost of an external compliance service. The main free-tier trade-off is that managed daily database backups are a paid feature, which is why the platform runs its own nightly export to an off-platform inbox instead. A paid Supabase tier, roughly 20 to 25 pounds a month, would add managed point-in-time recovery if wanted later. A free Supabase project also pauses after about a week of no activity, which does not arise in daily use.

---

## 15. What is configured, and what to populate

Live and working: both workspaces, every feature above, the access control, the readiness score, the nightly automation, the backups and the systems check.

Still to be populated with real data, which does not block anything:

- The sponsored worker's full details, including visa, CoS and salary.
- The sponsor licence number and rating, in Compliance settings.
- Going rates for the relevant SOC codes, from the current gov.uk figures.
- The policy PDFs uploaded to the library.

One configuration step is required for password reset links to work: the Site URL and a redirect URL must be set in the Supabase authentication settings to app.dlbusinesssystems.com.

---

## 16. Assumptions and limitations

The platform was built for a company sponsoring a single worker, scaled to grow. It assumes England and Wales working days, payroll handled in FreeAgent, and HR approvals routed to the administrator. It is an internal system rather than legal advice, so the policy templates and the compliance outputs should be reviewed by an HR or immigration adviser before they are relied on, and the going rates and reportable-event rules should be kept current from gov.uk as the rules change.
