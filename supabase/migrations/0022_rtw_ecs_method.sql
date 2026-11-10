-- Migration 0022: add the Employer Checking Service as a right to work check
-- method, used by the Right to Work Check Wizard for pending-application cases.
-- ADD VALUE must run outside the transaction that uses it.
alter type rtw_method add value if not exists 'employer_checking_service';
