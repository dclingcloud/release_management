import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { MajorVersion, SubVersion } from '../types';
import { Clock, CheckCircle2, AlertTriangle, Users, Calendar, BarChart3, TrendingUp } from 'lucide-react';

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

  // 2. Calculation: Version Status distribution
  const statusCounts = majorVersions.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));

  // 3. Calculation: Owner Workload (how many major versions they have)
  const ownerCounts = majorVersions.reduce((acc, curr) => {
    acc[curr.owner] = (acc[curr.owner] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ownerData = Object.keys(ownerCounts).map(owner => ({
    name: owner,
    '负责版本数': ownerCounts[owner],
    '负责RC版本数': subVersions.filter(s => {
      const parent = majorVersions.find(m => m.id === s.majorVersionId);
      return parent?.owner === owner;
    }).length
  }));

  // 4. Calculation: Priority Breakdown (P1 to P5)
  const priorityCounts = [1, 2, 3, 4, 5].map(p => {
    const count = majorVersions.filter(v => v.priority === p).length;
    return {
      name: `P${p}`,
      '版本数量': count
    };
  });

  // 5. Calculation: Release Calendar & upcoming deadlines
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

  // 6. Calculation: RC counts per major version (Release velocity indicator)
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
            <span className="text-[10px] text-gray-400">包含主线及定制分支</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">进行中版本</p>
            <h4 className="text-2xl font-bold text-gray-900 font-mono mt-0.5">{inProgressMajors}</h4>
            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-sm">
               占比 {totalMajors ? Math.round((inProgressMajors / totalMajors) * 100) : 0}%
            </span>
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
              已归档包
            </span>
          </div>
        </div>

        {/* Total Sub-versions (RCs) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">RC版本总数</p>
            <h4 className="text-2xl font-bold text-gray-900 font-mono mt-0.5">{totalSubs}</h4>
            <span className="text-[10px] text-gray-400">平均每个版本出 {(totalMajors ? (totalSubs / totalMajors).toFixed(1) : 0)} 个包</span>
          </div>
        </div>

      </div>

      {/* Main Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Status Distribution (Pie Chart) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs col-span-1">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" /> 版本状态分布
          </h3>
          <div className="h-[240px] flex items-center justify-center">
            {statusData.length === 0 ? (
              <p className="text-xs text-gray-400">暂无状态数据</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}个版本`, '数量']} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} style={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Owner Workload (Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-500" /> 研发负责人负载分析 (双维度)
          </h3>
          <div className="h-[240px]">
            {ownerData.length === 0 ? (
              <p className="text-xs text-gray-400">暂无负责人数据</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ownerData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Legend iconSize={10} style={{ fontSize: '11px' }} />
                  <Bar dataKey="负责版本数" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="负责RC版本数" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 3. Release Velocity (RC per major version) */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-500" /> 迭代频次分析 (每个版本的RC数量)
          </h3>
          <div className="h-[260px]">
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

        {/* 4. Priorities breakdown (Vertical stats) */}
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

      {/* Release calendar deadlines (Target timeline list) */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-blue-500" /> 2026版本计划发布倒计时表 (按时间递增)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50 text-gray-500">
                <th className="py-2.5 px-4 font-semibold">版本号 / 类型</th>
                <th className="py-2.5 px-4 font-semibold">负责人</th>
                <th className="py-2.5 px-4 font-semibold">状态</th>
                <th className="py-2.5 px-4 font-semibold">优先级</th>
                <th className="py-2.5 px-4 font-semibold text-right">计划发布日期</th>
                <th className="py-2.5 px-4 font-semibold text-right">距离发布</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {upcomingDeadlines.slice(0, 8).map((v) => {
                const isOverdue = v.daysRemaining < 0 && v.status !== '已发布';
                const isToday = v.daysRemaining === 0;
                const isReleased = v.status === '已发布';

                return (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{v.versionNumber}</span>
                        <span className="text-gray-400">({v.type})</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-gray-600">{v.owner}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        isReleased ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-sm font-mono font-semibold">
                        P{v.priority}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-gray-600">{v.releaseDate}</td>
                    <td className="py-2 px-4 text-right">
                      {isReleased ? (
                        <span className="text-emerald-600 font-medium">已成功发布</span>
                      ) : isOverdue ? (
                        <span className="text-rose-600 font-medium">逾期 {Math.abs(v.daysRemaining)} 天</span>
                      ) : isToday ? (
                        <span className="text-amber-600 font-bold">今天到期</span>
                      ) : (
                        <span className="text-blue-600 font-semibold">{v.daysRemaining} 天后</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
