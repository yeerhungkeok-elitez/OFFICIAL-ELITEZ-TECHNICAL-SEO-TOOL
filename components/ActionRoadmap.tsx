'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Action Roadmap Component (V5)
// Shows the 4-week roadmap in a visual card grid.
// ─────────────────────────────────────────────────────────────────────────────

import type { RoadmapWeek, IssueSeverity } from '@/types/seo';

const WEEK_COLORS = [
  { bg: 'bg-red-50',   border: 'border-red-200',   badge: 'bg-red-100 text-red-700',   title: 'text-red-700'   },
  { bg: 'bg-blue-50',  border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700', title: 'text-blue-700'  },
  { bg: 'bg-green-50', border: 'border-green-200',  badge: 'bg-green-100 text-green-700',title: 'text-green-700' },
  { bg: 'bg-purple-50',border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700',title: 'text-purple-700'},
];

const PRI_BADGE: Record<IssueSeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-blue-100 text-blue-700',
};

interface Props {
  roadmap:   RoadmapWeek[];
  collapsed?: boolean;
}

export default function ActionRoadmap({ roadmap, collapsed = false }: Props) {
  return (
    <div className="space-y-4">
      {!collapsed ? (
        /* Full 4-column grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {roadmap.map((week, idx) => {
            const c = WEEK_COLORS[idx] ?? WEEK_COLORS[0];
            return (
              <div key={week.week} className={`rounded-2xl border-2 p-4 ${c.bg} ${c.border}`}>
                {/* Week badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                    Week {week.week}
                  </span>
                  <span className="text-xs text-slate-500">{week.tasks.length} tasks</span>
                </div>

                {/* Title */}
                <p className={`text-sm font-bold leading-tight mb-2 ${c.title}`}>
                  {week.title.replace(`Week ${week.week}: `, '')}
                </p>

                {/* Goal */}
                <p className="text-xs text-slate-500 italic mb-3 leading-relaxed">{week.goal}</p>

                {/* Tasks */}
                <div className="space-y-1.5">
                  {week.tasks.slice(0, 5).map((task, ti) => (
                    <div key={ti} className="flex items-start gap-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${PRI_BADGE[task.priority]}`}>
                        {task.priority.slice(0, 3).toUpperCase()}
                      </span>
                      <p className="text-xs text-slate-700 leading-tight">{task.task}</p>
                    </div>
                  ))}
                  {week.tasks.length > 5 && (
                    <p className="text-xs text-slate-400 italic">+{week.tasks.length - 5} more tasks…</p>
                  )}
                </div>

                {/* Expected outcome */}
                <div className="mt-3 pt-3 border-t border-current/10">
                  <p className="text-xs font-semibold text-slate-500 mb-1">✓ Expected Outcome</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{week.expectedOutcome}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Collapsed table view */
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="text-left p-2 font-semibold w-24">Week</th>
                <th className="text-left p-2 font-semibold">Title</th>
                <th className="text-left p-2 font-semibold hidden md:table-cell">Goal</th>
                <th className="text-left p-2 font-semibold">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roadmap.map((week, idx) => {
                const c = WEEK_COLORS[idx] ?? WEEK_COLORS[0];
                return (
                  <tr key={week.week} className="hover:bg-slate-50">
                    <td className="p-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                        Week {week.week}
                      </span>
                    </td>
                    <td className="p-2 font-medium text-slate-700">{week.title.replace(`Week ${week.week}: `, '')}</td>
                    <td className="p-2 text-slate-500 hidden md:table-cell">{week.goal}</td>
                    <td className="p-2 text-slate-600">{week.tasks.length} tasks</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
