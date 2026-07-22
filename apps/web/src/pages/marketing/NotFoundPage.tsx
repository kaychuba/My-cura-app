import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
      <Compass className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Page not found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="btn-primary inline-block text-sm">
        Back to home
      </Link>
    </div>
  );
}
