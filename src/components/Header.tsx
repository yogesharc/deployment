import { Settings } from 'lucide-react';
import { ProjectSelector } from './ProjectSelector';
import { useStore } from '../store';

export function Header() {
  const { setView, view } = useStore();

  return (
    <div className="flex items-center gap-3 p-4 border-b border-vercel-gray-800">
      <div className="flex-1">
        <ProjectSelector />
      </div>
      <button
        onClick={() => setView(view === 'settings' ? 'deployments' : 'settings')}
        className={`p-2 rounded-lg transition-colors ${
          view === 'settings'
            ? 'bg-vercel-gray-700 text-vercel-white'
            : 'text-vercel-gray-400 hover:text-vercel-white hover:bg-vercel-gray-800'
        }`}
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
}
