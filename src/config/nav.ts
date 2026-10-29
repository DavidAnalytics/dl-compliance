import {
  LayoutDashboard, Users, CalendarDays, CalendarOff, ShieldCheck, FileText,
  BadgeCheck, ClipboardList, Briefcase, ScrollText, History, PieChart,
  LifeBuoy, Settings, UserSearch, ClipboardCheck, FolderOpen, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const hrNav: NavItem[] = [
  { to: '/hr', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/hr/employees', label: 'Employees', icon: Users },
  { to: '/hr/leave', label: 'Leave & Holiday', icon: CalendarDays },
  { to: '/hr/absence', label: 'Absence', icon: CalendarOff },
  { to: '/hr/recruitment', label: 'Recruitment', icon: UserSearch },
  { to: '/hr/onboarding', label: 'Onboarding', icon: ClipboardCheck },
  { to: '/hr/documents', label: 'Documents', icon: FolderOpen },
  { to: '/hr/policies', label: 'Policies', icon: ScrollText },
];

export const hrFooterNav: NavItem[] = [
  { to: '/hr/support', label: 'Support', icon: LifeBuoy },
  { to: '/hr/settings', label: 'Settings', icon: Settings },
];

export const complianceNav: NavItem[] = [
  { to: '/compliance', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/compliance/workers', label: 'Engaged Workers', icon: Users },
  { to: '/compliance/right-to-work', label: 'Right to Work', icon: BadgeCheck },
  { to: '/compliance/employment', label: 'Employment & CoS', icon: Briefcase },
  { to: '/compliance/absence', label: 'Absence Monitoring', icon: CalendarOff },
  { to: '/compliance/documents', label: 'Documents', icon: FileText },
  { to: '/compliance/reporting', label: 'Change Reporting', icon: ClipboardList },
  { to: '/compliance/audit', label: 'Audit Trail', icon: History },
  { to: '/compliance/reports', label: 'Reports', icon: PieChart },
];

export const complianceFooterNav: NavItem[] = [
  { to: '/compliance/settings', label: 'Settings', icon: Settings },
];

export const workerNav: NavItem[] = [
  { to: '/me', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/me/details', label: 'My Details', icon: Users },
  { to: '/me/leave', label: 'My Leave', icon: CalendarDays },
  { to: '/me/documents', label: 'My Documents', icon: FolderOpen },
  { to: '/me/policies', label: 'Policies', icon: ScrollText },
];

export const APP_META = {
  hr: { name: 'DL People', tag: 'Human Resources', icon: Users, home: '/hr' },
  compliance: { name: 'DL Compliance', tag: 'Sponsor Duties', icon: ShieldCheck, home: '/compliance' },
  employee: { name: 'DL People', tag: 'My space', icon: Users, home: '/me' },
} as const;

export type AppKey = keyof typeof APP_META;
