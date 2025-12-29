import { ChevronDown } from 'lucide-react';
import { useDeployments } from '../hooks/useDeployments';

export function ProjectSelector() {
  const { projects, selectedProjectId, selectProject } = useDeployments();

  return (
    <div className="relative">
      <select
        value={selectedProjectId || ''}
        onChange={(e) => selectProject(e.target.value || null)}
        className="w-full appearance-none bg-vercel-gray-800 border border-vercel-gray-700 rounded-lg px-4 py-2.5 pr-10 text-sm text-vercel-white focus:outline-none focus:border-vercel-blue transition-colors cursor-pointer"
      >
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vercel-gray-400 pointer-events-none" />
    </div>
  );
}
