import { useLocation, useNavigate } from 'react-router';
import { ChevronLeft, Home } from 'lucide-react';
import { getNavItemForPath } from '../../app-navigation';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentItem = getNavItemForPath(location.pathname);

  if (!currentItem || currentItem.path === '/dashboard') {
    return null;
  }

  return (
    <div className="flex h-10 w-full shrink-0 items-center gap-2 border-b border-[#e5e5e5] bg-[#fafafa] px-4 text-xs text-[#737373] transition-colors duration-300 dark:border-app-border dark:bg-app-surface dark:text-[#a3a3a3]">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="flex min-w-0 items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-[#f0f0f0] hover:text-[#0d0d12] dark:hover:bg-[#171717] dark:hover:text-[#fafafa]"
      >
        <Home size={14} className="shrink-0" />
        <span className="truncate">{'\u05e8\u05d0\u05e9\u05d9'}</span>
      </button>
      <ChevronLeft size={14} className="shrink-0 text-[#a3a3a3] dark:text-[#525252]" />
      <button
        type="button"
        onClick={() => navigate(currentItem.path)}
        className="min-w-0 truncate rounded-md px-2 py-1 font-medium text-[#0d0d12] transition-colors hover:bg-[#f0f0f0] dark:text-[#fafafa] dark:hover:bg-[#171717]"
      >
        {currentItem.label}
      </button>
    </div>
  );
};
