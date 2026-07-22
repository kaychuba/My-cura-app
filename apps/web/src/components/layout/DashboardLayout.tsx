import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Calendar, Users, Heart, CreditCard, Pill,
  FileText, DollarSign, BarChart3, AlertTriangle, MessageSquare,
  GraduationCap, Settings, LogOut, Bell, Menu, X, Moon, Sun,
  ChevronRight, BookOpen, ShieldAlert, UploadCloud, Briefcase,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Logo } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '@my-cura/shared-types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: 'all' },
  { name: 'Scheduling', href: '/scheduling', icon: Calendar, roles: 'all' },
  { name: 'Care Workers', href: '/workers', icon: Users, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER] },
  { name: 'Service Users', href: '/service-users', icon: Heart, roles: 'all' },
  { name: 'Payroll', href: '/payroll', icon: CreditCard, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER] },
  { name: 'Medication (MAR)', href: '/mar', icon: Pill, roles: 'all' },
  { name: 'Reports', href: '/reports', icon: FileText, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER] },
  { name: 'Finance', href: '/finance', icon: DollarSign, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER] },
  { name: 'Incidents', href: '/incidents', icon: AlertTriangle, roles: 'all' },
  { name: 'Policies', href: '/policies', icon: BookOpen, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER] },
  { name: 'Whistleblowing', href: '/whistleblowing', icon: ShieldAlert, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER] },
  { name: 'Messaging', href: '/messaging', icon: MessageSquare, roles: 'all' },
  { name: 'Training', href: '/training', icon: GraduationCap, roles: 'all' },
  { name: 'Expenses', href: '/expenses', icon: CreditCard, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER] },
  { name: 'Recruitment', href: '/recruitment', icon: Briefcase, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER] },
  { name: 'Data Import', href: '/imports', icon: UploadCloud, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER] },
];

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const visibleNav = navigation.filter((item) =>
    item.roles === 'all' ||
    (user?.role && (item.roles as UserRole[]).includes(user.role as UserRole))
  );

  return (
    <div className="flex h-screen bg-surface-light dark:bg-slate-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <Logo size="sm" tone="solid" />
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                ${isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-4 flex-shrink-0">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <NotificationsBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


interface AppNotification {
  id: string; title: string; body: string; readAt?: string; createdAt: string;
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: count } = useQuery<{ count: number }>({
    queryKey: ['notif-count'],
    queryFn: async () => (await apiClient.get('/notifications/unread-count')).data,
    refetchInterval: 30_000,
  });

  const { data: items } = useQuery<{ data: AppNotification[] }>({
    queryKey: ['notif-list'],
    queryFn: async () => (await apiClient.get('/notifications?limit=10')).data,
    enabled: open,
  });

  const markAll = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {(count?.count ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count!.count > 99 ? '99+' : count!.count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-y-auto card p-0 z-50 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Notifications</p>
              {(count?.count ?? 0) > 0 && (
                <button className="text-xs font-medium text-primary-600 hover:underline" onClick={() => markAll.mutate()}>
                  Mark all read
                </button>
              )}
            </div>
            {(items?.data ?? []).length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No notifications</p>
            ) : (
              (items?.data ?? []).map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800 ${!n.readAt ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
