import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { StudySession } from '../types';

interface DashboardProps {
  sessions: StudySession[];
}

export const Dashboard: React.FC<DashboardProps> = ({ sessions }) => {
  // Process data for charts
  
  // 1. Sessions per day (last 7 days)
  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const dailyData = getLast7Days().map(date => {
    const daySessions = sessions.filter(s => new Date(s.startTime).toISOString().startsWith(date));
    const totalDuration = daySessions.reduce((acc, curr) => acc + curr.duration, 0) / 3600; // in hours
    const avgConc = daySessions.length 
      ? daySessions.reduce((acc, curr) => acc + curr.concentration, 0) / daySessions.length 
      : 0;

    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      hours: parseFloat(totalDuration.toFixed(2)),
      concentration: parseFloat(avgConc.toFixed(1))
    };
  });

  // 2. Total Stats
  const totalHours = (sessions.reduce((acc, s) => acc + s.duration, 0) / 3600).toFixed(1);
  const globalAvgConc = sessions.length 
    ? (sessions.reduce((acc, s) => acc + s.concentration, 0) / sessions.length).toFixed(1) 
    : "0.0";
  const totalSessions = sessions.length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Study Time</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{totalHours}</span>
            <span className="text-sm text-slate-400">hours</span>
          </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Avg Concentration</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-brand-400">{globalAvgConc}</span>
            <span className="text-sm text-slate-400">/ 5.0</span>
          </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Sessions</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{totalSessions}</span>
            <span className="text-sm text-slate-400">sessions</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Daily Duration Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-6">Daily Study Hours (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{fill: '#334155', opacity: 0.2}}
                />
                <Bar dataKey="hours" name="Hours" radius={[4, 4, 0, 0]}>
                  {dailyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Concentration Trend Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-6">Avg. Concentration Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 5]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="concentration" 
                  name="Concentration"
                  stroke="#a855f7" 
                  strokeWidth={3} 
                  dot={{ fill: '#a855f7', strokeWidth: 2 }} 
                  activeDot={{ r: 6, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};