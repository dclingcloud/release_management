import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { MajorVersion, SubVersion } from '../types';
import { Clock, CheckCircle2, AlertTriangle, Calendar, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardViewProps {
  majorVersions: MajorVersion[];
  subVersions: SubVersion[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export default function DashboardView({ majorVersions, subVersions }: DashboardViewProps) {
  // Current date anchor is 2026-06-29 as per system context
  const currentAnchorDate = new Date('2026-06-29');

  // 1. Calculations: General count cards
  const totalMajors = majorVersions.length;
  const inProgressMajors = majorVersions.filter(v => v.status === '进行中').length;
  const releasedMajors = majorVersions.filter(v => v.status === '已发布').length;
  const totalSubs = subVersions.length;

  // Calculate Delayed and Near-Delayed (about to delay) versions
  // Delayed: status !== '已发布' and releaseDate is in the past (before '2026-06-29')
  const delayedVersions = majorVersions
    .filter(v => {
      if (v.status === '已发布' || !v.releaseDate) return false;
      const release = new Date(v.releaseDate);
      return release.getTime() < currentAnchorDate.getTime();
    })
    .map(v => {
      const release = new Date(v.releaseDate!);
      const diffTime = currentAnchorDate.getTime() - release.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...v, daysOverdue: diffDays };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue); // sort by most overdue first

  // Upcoming / Near-Delayed: status !== '已发布' and releaseDate is within 14 days in the future
  const upcomingNearVersions = majorVersions
    .filter(v => {
      if (v.status === '已发布' || !v.releaseDate) return false;
      const release = new Date(v.releaseDate);
      const diffTime = release.getTime() - currentAnchorDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14; // Within 14 days
    })
    .map(v => {
      const release = new Date(v.releaseDate!);
      const diffTime = release.getTime() - currentAnchorDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...v, daysRemaining: diffDays };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining); // sort by nearest first

  // 2. Calculation: Priority Breakdown (P1 to P5)
  const priorityCounts = [1, 2, 3, 4, 5].map(p => {
    const count = majorVersions.filter(v => v.priority === p).length;
    return {
      name: `P${p}`,
      '版本数量': count
    };
  });

  // 3. Calculation: Release Calendar & upcoming deadlines (for all unreleased/released)
  const upcomingDeadlines = majorVersions
    .filter(v => v.releaseDate)
    .map(v => {
      const release = new Date(v.releaseDate);
      const diffTime = release.getTime() - currentAnchorDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...v,
        daysRemaining: diffDays,
      };
    })
    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

  // 4. Calculation: RC counts per major version (Release velocity indicator)
  const rcCountsData = majorVersions.map(m => {
    const rcs = subVersions.filter(s => s.majorVersionId === m.id).length;
    return {
      name: m.versionNumber,
      'RC版本个数': rcs
    };
  }).filter(item => item['RC版本个数'] > 0);

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Major Versions */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">版本总数</p>
            <h4 className="text-2xl font-bold text-gray-900 font-mono mt-0.5">{totalMajors}</h4>
            <span className="text-[10px] text-gray-400">包含所有状态大版本</span>
          </div>
        </div>

        {/* Released */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">已发布版本</p>
            <h4 className="text-2xl font-bold text-gray-900 font-mono mt-0.5">{releasedMajors}</h4>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-sm">
               占比 {totalMajors ? Math.round((releasedMajors / totalMajors) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Delayed Versions */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 transition-colors ${
          delayedVersions.length > 0 
            ? 'bg-rose-50/50 border-rose-100 text-rose-900 shadow-xs' 
            : 'bg-white border-gray-100 text-gray-900'
        }`}>
          <div className={`p-3 rounded-lg ${
            delayedVersions.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-gray-50 text-gray-400'
          }`}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">已逾期版本</p>
            <h4 className="text-2xl font-bold font-mono mt-0.5">{delayedVersions.length}</h4>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
              delayedVersions.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {delayedVersions.length > 0 ? '严重交付风险' : '暂无延期'}
            </span>
          </div>
        </div>

        {/* Upcoming Near-Delayed */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 transition-colors ${
          upcomingNearVersions.length > 0 
            ? 'bg-amber-50/50 border-amber-100 text-amber-900 shadow-xs' 
            : 'bg-white border-gray-100 text-gray-900'
        }`}>
          <div className={`p-3 rounded-lg ${
            upcomingNearVersions.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400'
          }`}>
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">临期预警 (14天内)</p>
            <h4 className="text-2xl font-bold font-mono mt-0.5">{upcomingNearVersions.length}</h4>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
              upcomingNearVersions.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {upcomingNearVersions.length > 0 ? '需重点关注出包' : '进度平稳'}
            </span>
          </div>
        </div>

      </div>

      {/* Overdue & Near-Deadline Risk Alert Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel 1: 已延期版本列表 */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1 rounded bg-rose-50 text-rose-600"><AlertCircle size={15} /></span>
                <span>已延期大版本 (延期警报)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                {delayedVersions.length} 个异常
              </span>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
              {delayedVersions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-3xl">🎉</span>
                  <p className="text-xs font-medium text-gray-500">太棒了！暂无任何延期大版本</p>
                  <p className="text-[10px] text-gray-400">所有版本计划均在合理节点内推进中</p>
                </div>
              ) : (
                delayedVersions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-rose-50/30 border border-rose-100/60 rounded-xl hover:bg-rose-50/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 font-mono">{v.versionNumber}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-rose-100 text-rose-700 font-medium">{v.type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">P{v.priority}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span>原定: <span className="font-mono">{v.releaseDate}</span></span>
                        <span>负责人: <span className="font-medium text-gray-700">{v.owner}</span></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block text-xs font-bold text-rose-600 bg-rose-100/80 px-2 py-1 rounded-lg font-mono">
                        逾期 {v.daysOverdue} 天
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="text-[10px] text-gray-400 pt-3 border-t border-slate-50 mt-4">
            * 延期规则: 状态不为“已发布”且计划日期小于当前系统日期 ({currentAnchorDate.toISOString().split('T')[0]}) 的所有版本。
          </div>
        </div>

        {/* Panel 2: 即将到期版本 */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1 rounded bg-amber-50 text-amber-600"><Clock size={15} /></span>
                <span>即将到期版本 (临期 14 天预警)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                {upcomingNearVersions.length} 个临近
              </span>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
              {upcomingNearVersions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-3xl">☕</span>
                  <p className="text-xs font-medium text-gray-500">暂无未来 14 天到期的大版本</p>
                  <p className="text-[10px] text-gray-400">短期内出包压力较为平缓</p>
                </div>
              ) : (
                upcomingNearVersions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-amber-50/30 border border-amber-100/60 rounded-xl hover:bg-amber-50/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 font-mono">{v.versionNumber}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-amber-100 text-amber-700 font-medium">{v.type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">P{v.priority}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span>计划: <span className="font-mono">{v.releaseDate}</span></span>
                        <span>负责人: <span className="font-medium text-gray-700">{v.owner}</span></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-xs font-bold px-2 py-1 rounded-lg font-mono ${
                        v.daysRemaining === 0 
                          ? 'bg-red-100 text-red-600' 
                          : v.daysRemaining <= 3 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-orange-100 text-orange-700'
                      }`}>
                        {v.daysRemaining === 0 ? '今天到期' : `仅剩 ${v.daysRemaining} 天`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="text-[10px] text-gray-400 pt-3 border-t border-slate-50 mt-4">
            * 临期规则: 状态不为“已发布”且计划到期日期在未来 14 天之内的所有版本。
          </div>
        </div>

      </div>

      {/* Secondary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Release Velocity (RC per major version) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-500" /> 迭代频次分析 (每个版本的RC数量)
          </h3>
          <div className="h-[240px]">
            {rcCountsData.length === 0 ? (
              <p className="text-xs text-gray-400">暂无迭代数据</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rcCountsData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="RC版本个数" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Priorities breakdown (Vertical stats) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> 优先级比重分布
            </h3>
            <div className="space-y-3">
              {priorityCounts.map((p, idx) => {
                const percentage = totalMajors ? Math.round((p['版本数量'] / totalMajors) * 100) : 0;
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700">{p.name} 优先级</span>
                      <span className="text-gray-500">{p['版本数量']}个 ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : idx === 2 ? '#10b981' : '#3b82f6'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50 text-[11px] text-gray-400 mt-4 leading-relaxed">
            * 优先级 P1 和 P2 代表需要首要保证出包率及重点交付的战略级定制/主线版本。
          </div>
        </div>

      </div>
    </div>
  );
}
