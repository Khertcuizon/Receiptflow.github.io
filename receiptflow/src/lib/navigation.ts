import {
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  ScanLine,
  Settings,
  Tags,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan-receipt', label: 'Scan Receipt', icon: ScanLine },
  { to: '/receipts', label: 'Receipts', icon: ReceiptText },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/daily-tracker', label: 'Daily Tracker', icon: CalendarDays },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/reports', label: 'Reports', icon: ChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
];
