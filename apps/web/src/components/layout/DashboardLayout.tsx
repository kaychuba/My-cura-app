import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Calendar, Users, Heart, CreditCard, Pill,
  FileText, DollarSign, BarChart3, AlertTriangle, MessageSquare,
  GraduationCap, Settings, LogOut, Bell, Menu, X, Moon, Sun,
  ChevronRight, BookOpen, ShieldAlert,
} from 'lucide-react';
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
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">My-Cura</span>
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

          <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
