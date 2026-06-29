import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronDown, ChevronRight, Plus, Search, Filter, ArrowUpDown, Eye, Trash2, 
  Settings, Type, Calendar, User, AlignLeft, ShieldCheck, FileText, BadgeAlert, AlertCircle,
  FileEdit, Play, Terminal, Loader2, Download, Copy, Check
} from 'lucide-react';
import { MajorVersion, SubVersion } from '../types';
import { initialOwners, ownerAvatars } from '../initialData';

interface MajorVersionTableProps {
  versions: MajorVersion[];
  subVersions: SubVersion[];
  onRowClick: (version: MajorVersion) => void;
  onAddRow: (status?: string) => void;
  onDeleteRow: (id: string) => void;
  onUpdateRow: (updated: MajorVersion) => void;
  onAddSubVersion?: (majorId: string) => SubVersion | null;
  onDeleteSubVersion?: (subId: string) => void;
  onEditSubVersion?: (updatedSub: SubVersion) => void;
  hideAddButton?: boolean;
}

type GroupByField = 'priority' | 'owner' | 'none';

export default function MajorVersionTable({
  versions,
  subVersions,
  onRowClick,
  onAddRow,
  onDeleteRow,
  onUpdateRow,
  onAddSubVersion,
  onDeleteSubVersion,
  onEditSubVersion,
  hideAddButton = false
}: MajorVersionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByField>('none');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof MajorVersion>('versionNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Track expanded row IDs for inline sub-version lists
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Track subversion inline edit state inside the nested tables
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubForm, setEditSubForm] = useState<SubVersion | null>(null);

  // Jenkins build & terminal log state
  const [activeLogSubId, setActiveLogSubId] = useState<string | null>(null);
  const [activeLogContent, setActiveLogContent] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);

  // Track active polling intervals
  const activePollers = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Poll for building sub-versions automatically if any are building on load
  useEffect(() => {
    subVersions.forEach(sub => {
      if (sub.jenkinsStatus === 'building' && !activePollers.current[sub.id]) {
        startPollingSub(sub.id);
      }
    });

    return () => {
      // Clean up pollers
      Object.values(activePollers.current).forEach(clearInterval);
    };
  }, [subVersions]);

  // Keep active log modal content in sync with polling updates
  useEffect(() => {
    if (activeLogSubId) {
      const currentSub = subVersions.find(s => s.id === activeLogSubId);
      if (currentSub) {
        setActiveLogContent(currentSub.jenkinsBuildLog || '等待控制台输出...');
      }
    }
  }, [subVersions, activeLogSubId]);

  const startPollingSub = (subId: string) => {
    if (activePollers.current[subId]) clearInterval(activePollers.current[subId]);

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sub-versions');
        if (res.ok) {
          const subs = await res.json() as SubVersion[];
          const target = subs.find(s => s.id === subId);
          if (target) {
            if (onEditSubVersion) onEditSubVersion(target);
            if (target.jenkinsStatus !== 'building') {
              clearInterval(interval);
              delete activePollers.current[subId];
            }
          }
        }
      } catch (err) {
        clearInterval(interval);
        delete activePollers.current[subId];
      }
    }, 1000);

    activePollers.current[subId] = interval;
  };

  const handleTriggerBuild = async (subId: string) => {
    try {
      const res = await fetch(`/api/sub-versions/${subId}/trigger-build`, { method: 'POST' });
      if (res.ok) {
        const updatedSub = await res.json();
        if (onEditSubVersion) onEditSubVersion(updatedSub);
        startPollingSub(subId);
      }
    } catch (err) {
      console.error("Failed to trigger build:", err);
    }
  };

  const toggleRowExpand = (rowId: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const startSubEdit = (sub: SubVersion) => {
    setEditingSubId(sub.id);
    setEditSubForm({ ...sub });
  };

  const handleSubEditChange = (field: keyof SubVersion, value: any) => {
    if (!editSubForm) return;
    setEditSubForm({ ...editSubForm, [field]: value });
  };

  const saveSubEdit = () => {
    if (editSubForm && onEditSubVersion) {
      onEditSubVersion(editSubForm);
      setEditingSubId(null);
      setEditSubForm(null);
    }
  };

  const cancelSubEdit = () => {
    setEditingSubId(null);
    setEditSubForm(null);
  };

  // 1. Filtering & Searching
  const filteredVersions = useMemo(() => {
    return versions.filter(v => {
      const matchesSearch = 
        v.versionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.stage || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.owner || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.meetingMinutes || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = selectedPriority === 'all' || v.priority.toString() === selectedPriority;
      const matchesOwner = selectedOwner === 'all' || v.owner === selectedOwner;

      return matchesSearch && matchesPriority && matchesOwner;
    });
  }, [versions, searchTerm, selectedPriority, selectedOwner]);

  // 2. Sorting
  const sortedVersions = useMemo(() => {
    return [...filteredVersions].sort((a, b) => {
      // '进行中' always goes to the very top
      if (a.status === '进行中' && b.status !== '进行中') return -1;
      if (b.status === '进行中' && a.status !== '进行中') return 1;

      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredVersions, sortField, sortOrder]);

  // Toggle sorting
  const handleSort = (field: keyof MajorVersion) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 3. Grouping
  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return { '全部版本': sortedVersions };
    }

    return sortedVersions.reduce((acc, curr) => {
      let key = '';
      if (groupBy === 'priority') key = `P${curr.priority}`;
      else if (groupBy === 'owner') key = curr.owner;
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {} as Record<string, MajorVersion[]>);
  }, [sortedVersions, groupBy]);

  // Ordered group keys to keep group keys ordered
  const orderedGroupKeys = useMemo(() => {
    return Object.keys(groups);
  }, [groups]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const getPriorityBadgeColor = (p: number) => {
    switch (p) {
      case 1: return 'bg-blue-100 text-blue-700 font-bold border border-blue-200';
      case 2: return 'bg-orange-100 text-orange-700 font-bold border border-orange-200';
      case 3: return 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-200';
      case 4: return 'bg-purple-100 text-purple-700 font-bold border border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '进行中': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case '已发布': return 'bg-teal-50 text-teal-700 border border-teal-200';
      case '未开始': return 'bg-slate-100 text-slate-700 border border-slate-300';
      case '已挂起': return 'bg-rose-50 text-rose-700 border border-rose-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4" id="major-version-table-container">
      
      {/* Lark Spreadsheet Style Interactive Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        
        {/* Left Toolbar actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Add record button with Lark-style styling */}
          {!hideAddButton && (
            <button
              onClick={() => onAddRow()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition cursor-pointer"
            >
              <Plus size={14} /> 添加版本
            </button>
          )}

          {/* Grouping dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">分组方式:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByField)}
              className="border border-gray-200 bg-slate-50 px-2 py-1 rounded-md text-gray-700 hover:bg-slate-100 focus:outline-hidden text-xs"
            >
              <option value="priority">按优先级</option>
              <option value="owner">按负责人</option>
              <option value="none">不分组</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">优先级筛选:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="border border-gray-200 bg-slate-50 px-2 py-1 rounded-md text-gray-700 hover:bg-slate-100 focus:outline-hidden text-xs"
            >
              <option value="all">全部</option>
              <option value="1">P1</option>
              <option value="2">P2</option>
              <option value="3">P3</option>
              <option value="4">P4</option>
              <option value="5">P5</option>
            </select>
          </div>

          {/* Owner filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">负责人:</span>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="border border-gray-200 bg-slate-50 px-2 py-1 rounded-md text-gray-700 hover:bg-slate-100 focus:outline-hidden text-xs"
            >
              <option value="all">全部负责人</option>
              {initialOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Right Search Action */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="搜索版本号、负责人、阶段、纪要..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 hover:bg-slate-100/50"
          />
        </div>

      </div>

      {/* Spreadsheet Main Grid Area */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          
          <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
            
            {/* Table Columns Config Header */}
            <thead>
              <tr className="bg-slate-50/70 text-gray-500 font-semibold text-[11px] border-b border-gray-200 select-none">
                <th className="w-14 py-3 px-2 text-center text-gray-400">#</th>
                
                {/* Column: 版本类型 */}
                <th className="w-28 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Type size={12} className="text-gray-400" />
                    <span>版本类型</span>
                    <ArrowUpDown size={10} className="text-gray-400" />
                  </div>
                </th>

                {/* Column: 版本号 */}
                <th className="w-36 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('versionNumber')}>
                  <div className="flex items-center gap-1 text-gray-600 font-bold">
                    <Settings size={12} className="text-blue-500" />
                    <span>版本号</span>
                    <ArrowUpDown size={10} className="text-blue-400" />
                  </div>
                </th>

                {/* Column: 优先级 */}
                <th className="w-24 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('priority')}>
                  <div className="flex items-center gap-1 text-gray-600">
                    <BadgeAlert size={12} className="text-gray-400" />
                    <span>优先级</span>
                    <ArrowUpDown size={10} className="text-gray-400" />
                  </div>
                </th>

                {/* Column: 版本状态 */}
                <th className="w-28 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1 text-gray-600">
                    <FileText size={12} className="text-gray-400" />
                    <span>版本状态</span>
                    <ArrowUpDown size={10} className="text-gray-400" />
                  </div>
                </th>

                {/* Column: 版本阶段说明 */}
                <th className="w-44 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('stage')}>
                  <div className="flex items-center gap-1 text-gray-600">
                    <AlignLeft size={12} className="text-gray-400" />
                    <span>版本阶段说明</span>
                    <ArrowUpDown size={10} className="text-gray-400" />
                  </div>
                </th>

                {/* Column: 发布日期 */}
                <th className="w-32 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('releaseDate')}>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar size={12} className="text-gray-400" />
                    <span>计划发布日期</span>
                    <ArrowUpDown size={10} className="text-gray-400" />
                  </div>
                </th>

                {/* Column: 负责人 */}
                <th className="w-28 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('owner')}>
                  <div className="flex items-center gap-1 text-gray-600">
                    <User size={12} className="text-gray-400" />
                    <span>负责人</span>
                    <ArrowUpDown size={10} className="text-gray-400" />
                  </div>
                </th>

                {/* Column: 会议纪要 */}
                <th className="w-48 py-3 px-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('meetingMinutes')}>
                  <div className="flex items-center gap-1 text-gray-600">
                    <AlignLeft size={12} className="text-gray-400" />
                    <span>会议纪要摘要</span>
                  </div>
                </th>

                {/* Column: 下属RC小版本 (Feishu "关联版本" Badges) */}
                <th className="w-56 py-3 px-3">
                  <div className="flex items-center gap-1 text-gray-600">
                    <ShieldCheck size={12} className="text-green-500" />
                    <span>下属RC小版本</span>
                  </div>
                </th>

                {/* Actions column */}
                <th className="w-20 py-3 px-3 text-center text-gray-400">操作</th>
              </tr>
            </thead>

            {/* Table Rows Grouped */}
            <tbody className="divide-y divide-gray-100 text-xs">
              {orderedGroupKeys.map((groupKey) => {
                const groupRows = groups[groupKey];
                const isCollapsed = collapsedGroups[groupKey];
                const cleanGroupLabel = groupKey || '未分类';

                return (
                  <React.Fragment key={groupKey}>
                    {/* Collapsible Group Header Row */}
                    <tr className="bg-slate-100/40 font-medium text-gray-600 border-t border-b border-gray-100">
                      <td colSpan={11} className="py-2.5 px-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupKey)}
                            className="flex items-center gap-2 text-gray-800 focus:outline-hidden"
                          >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                              groupBy === 'status' ? getStatusColor(cleanGroupLabel) : 'bg-slate-200 text-gray-700'
                            }`}>
                              {cleanGroupLabel}
                            </span>
                            <span className="text-gray-400 text-[11px] font-mono">({groupRows.length} 条记录)</span>
                          </button>
                          
                          {/* Quick inline insert inside this group */}
                          <button
                            onClick={() => onAddRow(groupBy === 'status' ? cleanGroupLabel : undefined)}
                            className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5 font-semibold bg-white border border-gray-200 hover:border-blue-200 px-2 py-0.5 rounded-sm shadow-xs transition"
                          >
                            <Plus size={11} /> 快速插入
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Group Data Rows */}
                    {!isCollapsed && groupRows.map((row, idx) => {
                      // Find sub-versions corresponding to this major version
                      const connectedSubs = subVersions.filter(s => s.majorVersionId === row.id);
                      const isExpanded = !!expandedRowIds[row.id];

                      return (
                        <React.Fragment key={row.id}>
                          <tr 
                            className="hover:bg-slate-50/50 group/row transition duration-150 align-middle"
                          >
                            {/* Row Index with expand toggle button */}
                            <td className="py-2.5 px-2 text-center text-gray-400 font-mono select-none">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpand(row.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                  title={isExpanded ? "收起迭代小版本" : "展开迭代小版本"}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <span>{idx + 1}</span>
                              </div>
                            </td>

                            {/* Column: 版本类型 */}
                            <td className="py-2.5 px-3 text-gray-700 truncate font-sans">
                              {row.type}
                            </td>

                            {/* Column: 版本号 (Blue Clickable Link) */}
                            <td className="py-2.5 px-3 font-mono font-bold">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRowClick(row);
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1 text-left font-bold"
                              >
                                {row.versionNumber}
                              </button>
                            </td>

                            {/* Column: 优先级 (Editable select styled like a badge) */}
                            <td className="py-2.5 px-3">
                              <select
                                value={row.priority}
                                onChange={(e) => onUpdateRow({ ...row, priority: parseInt(e.target.value) })}
                                className={`cursor-pointer inline-flex items-center justify-center rounded-full text-[10px] font-semibold px-2 py-0.5 outline-hidden border ${getPriorityBadgeColor(row.priority)}`}
                              >
                                <option value="1">P1</option>
                                <option value="2">P2</option>
                                <option value="3">P3</option>
                                <option value="4">P4</option>
                                <option value="5">P5</option>
                              </select>
                            </td>

                            {/* Column: 版本状态 (Editable select styled like a badge) */}
                            <td className="py-2.5 px-3">
                              <select
                                value={row.status}
                                onChange={(e) => onUpdateRow({ ...row, status: e.target.value as any })}
                                className={`cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-medium outline-hidden ${getStatusColor(row.status)}`}
                              >
                                <option value="进行中">进行中</option>
                                <option value="测试中">测试中</option>
                                <option value="未开始">未开始</option>
                                <option value="已发布">已发布</option>
                                <option value="已挂起">已挂起</option>
                              </select>
                            </td>

                            {/* Column: 版本阶段说明 (Editable input) */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={row.stage || ''}
                                onChange={(e) => onUpdateRow({ ...row, stage: e.target.value })}
                                className="bg-transparent hover:bg-slate-100/80 focus:bg-white border-0 hover:border hover:border-gray-200 focus:border focus:border-blue-400 rounded-md px-1.5 py-1 text-gray-700 font-sans text-xs focus:ring-1 focus:ring-blue-500/10 focus:outline-hidden w-full transition"
                              />
                            </td>

                            {/* Column: 发布日期 (Editable date input) */}
                            <td className="py-2.5 px-3 text-gray-500 font-mono">
                              <input
                                type="date"
                                value={row.releaseDate || ''}
                                onChange={(e) => onUpdateRow({ ...row, releaseDate: e.target.value })}
                                className="bg-transparent hover:bg-slate-100/80 focus:bg-white border-0 hover:border hover:border-gray-200 focus:border focus:border-blue-400 rounded-md px-1 py-1 text-gray-600 font-mono text-xs focus:ring-1 focus:ring-blue-500/10 focus:outline-hidden w-full transition"
                              />
                            </td>

                            {/* Column: 负责人 (Editable select with avatar) */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-semibold text-[9px] flex items-center justify-center shrink-0">
                                  {ownerAvatars[row.owner] || row.owner.slice(0, 2)}
                                </span>
                                <select
                                  value={row.owner}
                                  onChange={(e) => onUpdateRow({ ...row, owner: e.target.value })}
                                  className="bg-transparent hover:bg-slate-100/80 focus:bg-white border-0 hover:border hover:border-gray-200 focus:border focus:border-blue-400 rounded-md py-0.5 px-1 font-sans font-medium text-gray-700 cursor-pointer text-xs focus:ring-1 focus:ring-blue-500/10 focus:outline-hidden"
                                >
                                  {initialOwners.map((owner) => (
                                    <option key={owner} value={owner}>{owner}</option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* Column: 会议纪要摘要 (Editable input) */}
                            <td className="py-2.5 px-3 text-gray-500 font-sans" title={row.meetingMinutes}>
                              <input
                                type="text"
                                value={row.meetingMinutes || ''}
                                onChange={(e) => onUpdateRow({ ...row, meetingMinutes: e.target.value })}
                                placeholder="输入会议纪要..."
                                className="bg-transparent hover:bg-slate-100/80 focus:bg-white border-0 hover:border hover:border-gray-200 focus:border focus:border-blue-400 rounded-md px-1.5 py-1 text-gray-500 font-sans text-xs focus:ring-1 focus:ring-blue-500/10 focus:outline-hidden w-full transition"
                              />
                            </td>

                            {/* Column: Under RCs (关联小版本药丸) */}
                            <td className="py-2.5 px-3 overflow-hidden">
                              <div className="flex flex-nowrap gap-1 items-center overflow-hidden whitespace-nowrap">
                                {connectedSubs.slice(0, 2).map((sub) => (
                                  <span 
                                    key={sub.id}
                                    className="px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-sm text-[10px] font-mono whitespace-nowrap"
                                    title={`${sub.subVersionNumber}: ${sub.status}`}
                                  >
                                    {sub.subVersionNumber}
                                  </span>
                                ))}
                                {connectedSubs.length > 2 && (
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-sm text-[9px] font-semibold shrink-0">
                                    +{connectedSubs.length - 2} RC
                                  </span>
                                )}
                                {connectedSubs.length === 0 && (
                                  <span className="text-gray-300 italic text-[10px]">无下属版本</span>
                                )}
                              </div>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-2.5 px-3 text-center align-middle">
                              <div className="flex items-center justify-center gap-1 opacity-60 group-hover/row:opacity-100 transition duration-150">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRowClick(row);
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                  title="查看/编辑详情"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRow(row.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                  title="删除记录"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline Expandable RC versions table */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40 hover:bg-slate-50/40" onClick={(e) => e.stopPropagation()}>
                              <td colSpan={11} className="py-3 px-6 border-b border-gray-100">
                                <div className="pl-6 pr-4 py-3 border-l-2 border-blue-500 bg-white rounded-r-lg shadow-sm space-y-3">
                                  
                                  {/* Inner Header with actions */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-gray-800 text-[13px]">RC版本及编译镜像 ({connectedSubs.length})</span>
                                      <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-slate-100 rounded-sm border">隶属于版本 {row.versionNumber}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onAddSubVersion) {
                                          const newSub = onAddSubVersion(row.id);
                                          if (newSub) {
                                            startSubEdit(newSub);
                                          }
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 text-[11px] font-bold rounded-md transition cursor-pointer border border-blue-100"
                                    >
                                      <Plus size={13} /> 添加RC版本
                                    </button>
                                  </div>

                                  {connectedSubs.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400 italic text-xs bg-slate-50/50 rounded-lg border border-dashed border-gray-200">
                                      该版本下暂无任何RC版本。点击右上方 “添加RC版本” 快速创建。
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-slate-50 shadow-xs">
                                      <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                                        <thead>
                                          <tr className="bg-slate-100/80 text-gray-500 font-semibold text-[10px] border-b border-gray-200">
                                            <th className="w-10 py-2.5 px-2 text-center text-gray-400">#</th>
                                            <th className="w-40 py-2.5 px-3 text-gray-600 font-bold">RC版本号</th>
                                            <th className="w-24 py-2.5 px-3 text-gray-600">测试状态</th>
                                            <th className="w-52 py-2.5 px-3 text-gray-600">修复缺陷/需求说明</th>
                                            <th className="w-28 py-2.5 px-3 text-gray-600">打包日期</th>
                                            <th className="w-24 py-2.5 px-3 text-gray-600">代码分支</th>
                                            <th className="w-36 py-2.5 px-3 text-gray-600">组件版本</th>
                                            <th className="w-44 py-2.5 px-3 text-gray-600">下属容器镜像名称</th>
                                            <th className="w-28 py-2.5 px-3 text-gray-600">构建包链接</th>
                                            <th className="w-44 py-2.5 px-3 text-gray-600">编译构建 (Jenkins)</th>
                                            <th className="w-36 py-2.5 px-3 text-gray-600">FTP 交付包</th>
                                            <th className="w-20 py-2.5 px-2 text-center text-gray-400">操作</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-[11px] font-sans text-gray-700">
                                          {connectedSubs.map((sub, sIdx) => {
                                            const isEditingSub = editingSubId === sub.id;
                                            
                                            if (isEditingSub && editSubForm) {
                                              return (
                                                <tr key={sub.id} className="bg-blue-50/20 font-sans">
                                                  <td className="py-2 px-2 text-center text-gray-400 font-mono">{sIdx + 1}</td>
                                                  <td className="p-1">
                                                    <input
                                                      type="text"
                                                      value={editSubForm.subVersionNumber}
                                                      onChange={(e) => handleSubEditChange('subVersionNumber', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                                                    />
                                                  </td>
                                                  <td className="p-1">
                                                    <select
                                                      value={editSubForm.status}
                                                      onChange={(e) => handleSubEditChange('status', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white"
                                                    >
                                                      <option value="进行中">进行中</option>
                                                      <option value="测试中">测试中</option>
                                                      <option value="待打包">待打包</option>
                                                      <option value="已发布">已发布</option>
                                                      <option value="挂起">挂起</option>
                                                    </select>
                                                  </td>
                                                  <td className="p-1">
                                                    <input
                                                      type="text"
                                                      value={editSubForm.description}
                                                      onChange={(e) => handleSubEditChange('description', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white"
                                                    />
                                                  </td>
                                                  <td className="p-1">
                                                    <input
                                                      type="date"
                                                      value={editSubForm.buildDate}
                                                      onChange={(e) => handleSubEditChange('buildDate', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white"
                                                    />
                                                  </td>
                                                  <td className="p-1">
                                                    <input
                                                      type="text"
                                                      value={editSubForm.branch}
                                                      onChange={(e) => handleSubEditChange('branch', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                                                    />
                                                  </td>
                                                  <td className="p-1">
                                                    <input
                                                      type="text"
                                                      value={editSubForm.componentVersion}
                                                      onChange={(e) => handleSubEditChange('componentVersion', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                                                    />
                                                  </td>
                                                  <td className="p-1">
                                                    <input
                                                      type="text"
                                                      value={editSubForm.imageName}
                                                      onChange={(e) => handleSubEditChange('imageName', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                                                    />
                                                  </td>
                                                  <td className="p-1">
                                                    <input
                                                      type="text"
                                                      value={editSubForm.buildLink}
                                                      onChange={(e) => handleSubEditChange('buildLink', e.target.value)}
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                                                    />
                                                  </td>
                                                  <td className="p-1 text-center text-gray-400">
                                                    -
                                                  </td>
                                                  <td className="p-1">
                                                    <input
                                                      type="text"
                                                      value={editSubForm.ftpUrl || ''}
                                                      onChange={(e) => handleSubEditChange('ftpUrl', e.target.value)}
                                                      placeholder="ftp://..."
                                                      className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                                                    />
                                                  </td>
                                                  <td className="p-1 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                      <button
                                                        type="button"
                                                        onClick={saveSubEdit}
                                                        className="px-1.5 py-0.5 bg-blue-600 text-white rounded-xs text-[10px] hover:bg-blue-700"
                                                      >
                                                        保存
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={cancelSubEdit}
                                                        className="px-1.5 py-0.5 border border-gray-300 text-gray-600 rounded-xs text-[10px] hover:bg-slate-100"
                                                      >
                                                        取消
                                                      </button>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            return (
                                              <tr key={sub.id} className="hover:bg-slate-100/50 group/subrow transition">
                                                <td className="py-2 px-2 text-center text-gray-400 font-mono">{sIdx + 1}</td>
                                                <td className="py-2 px-3 font-mono font-semibold text-gray-900">{sub.subVersionNumber}</td>
                                                <td className="py-2 px-3">
                                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                                                    sub.status === '已发布' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                                                    sub.status === '进行中' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    sub.status === '测试中' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                    sub.status === '待打包' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                                    'bg-rose-50 text-rose-700 border border-rose-200'
                                                  }`}>
                                                    {sub.status}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 text-gray-600 whitespace-normal break-all leading-relaxed">
                                                  {sub.description || <span className="text-gray-300 italic">空</span>}
                                                </td>
                                                <td className="py-2 px-3 text-gray-500 font-mono">{sub.buildDate || '-'}</td>
                                                <td className="py-2 px-3 text-gray-500 font-mono">{sub.branch || '-'}</td>
                                                <td className="py-2 px-3 text-gray-500 font-mono">{sub.componentVersion || '-'}</td>
                                                <td className="py-2 px-3 text-gray-500 font-mono truncate" title={sub.imageName}>
                                                  {sub.imageName || '-'}
                                                </td>
                                                <td className="py-2 px-3">
                                                  {sub.buildLink ? (
                                                    <span 
                                                      className="text-blue-600 hover:underline cursor-pointer font-mono truncate inline-block max-w-[120px]"
                                                      title="点击复制构建编号"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(sub.buildLink);
                                                        alert(`已复制构建包编号: ${sub.buildLink}`);
                                                      }}
                                                    >
                                                      {sub.buildLink}
                                                    </span>
                                                  ) : (
                                                    <span className="text-gray-300">-</span>
                                                  )}
                                                </td>
                                                
                                                {/* Jenkins Build Action */}
                                                <td className="py-2 px-3">
                                                  <div className="flex items-center gap-1.5">
                                                    {sub.jenkinsStatus === 'building' ? (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 text-[10px] animate-pulse">
                                                        <Loader2 size={10} className="animate-spin text-amber-600 shrink-0" />
                                                        <span>构建中...</span>
                                                      </span>
                                                    ) : sub.jenkinsStatus === 'success' ? (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">
                                                        <span>构建成功</span>
                                                      </span>
                                                    ) : sub.jenkinsStatus === 'failed' ? (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-100 text-[10px]">
                                                        <span>构建失败</span>
                                                      </span>
                                                    ) : (
                                                      <span className="text-gray-400 text-[10px]">未构建</span>
                                                    )}

                                                    <div className="flex items-center gap-1">
                                                      <button
                                                        type="button"
                                                        disabled={sub.jenkinsStatus === 'building'}
                                                        onClick={() => handleTriggerBuild(sub.id)}
                                                        className={`p-1 rounded-md transition ${
                                                          sub.jenkinsStatus === 'building' 
                                                            ? 'text-gray-300 bg-slate-100 cursor-not-allowed' 
                                                            : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                                                        }`}
                                                        title={sub.jenkinsStatus ? "重新触发构建" : "一键触发 Jenkins 编译"}
                                                      >
                                                        <Play size={11} className={sub.jenkinsStatus === 'building' ? '' : 'fill-current'} />
                                                      </button>

                                                      {sub.jenkinsBuildLog && (
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            setActiveLogSubId(sub.id);
                                                            setActiveLogContent(sub.jenkinsBuildLog || '');
                                                          }}
                                                          className="p-1 text-slate-500 hover:bg-slate-200 rounded-md transition"
                                                          title="查看构建日志 (Terminal)"
                                                        >
                                                          <Terminal size={11} />
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                </td>

                                                {/* FTP download column */}
                                                <td className="py-2 px-3">
                                                  {sub.ftpUrl ? (
                                                    <div className="flex items-center gap-1">
                                                      <a
                                                        href={sub.ftpUrl}
                                                        target="_blank"
                                                        referrerPolicy="no-referrer"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-medium text-[10px] truncate max-w-[120px]"
                                                        title={`FTP 交付包: ${sub.ftpUrl}`}
                                                      >
                                                        <Download size={10} />
                                                        <span>FTP交付包</span>
                                                      </a>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          navigator.clipboard.writeText(sub.ftpUrl || '');
                                                          alert('已复制 FTP 链接到剪贴板');
                                                        }}
                                                        className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 shrink-0"
                                                        title="复制 FTP 链接"
                                                      >
                                                        <Copy size={9} />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-300 italic">未发布交付件</span>
                                                  )}
                                                </td>

                                                <td className="py-2 px-2 text-center">
                                                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover/subrow:opacity-100 transition duration-150">
                                                    <button
                                                      type="button"
                                                      onClick={() => startSubEdit(sub)}
                                                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-slate-200 rounded-md transition"
                                                      title="编辑此小版本"
                                                    >
                                                      <FileEdit size={12} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => onDeleteSubVersion?.(sub.id)}
                                                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                                      title="删除此小版本"
                                                    >
                                                      <Trash2 size={12} />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Group Empty State */}
                    {!isCollapsed && groupRows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-4 text-center text-gray-400 italic bg-slate-50/50">
                          该分组内暂无记录
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

          </table>

        </div>
      </div>

      {/* Jenkins Terminal Live Logs Dialog */}
      {activeLogSubId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 text-slate-100 rounded-lg w-full max-w-3xl h-[500px] border border-slate-800 flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
            {/* Terminal Header */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-slate-400 text-xs font-semibold select-none ml-2">Jenkins Console Logs</span>
              </div>
              <button 
                onClick={() => {
                  setActiveLogSubId(null);
                  setActiveLogContent('');
                }}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                ✕
              </button>
            </div>
            {/* Terminal Body */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-950 text-slate-200 space-y-1 select-text selection:bg-slate-800">
              <div className="text-emerald-500 font-bold mb-2"># jenkins --job=build_rc_version --id={activeLogSubId}</div>
              {activeLogContent.split('\n').map((line, lIdx) => (
                <div key={lIdx} className="leading-5 whitespace-pre-wrap">{line}</div>
              ))}
              {/* If building, show a dynamic loading indicator line */}
              {subVersions.find(s => s.id === activeLogSubId)?.jenkinsStatus === 'building' && (
                <div className="text-amber-500 font-semibold animate-pulse flex items-center gap-1 mt-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block"></span>
                  [Pipeline] Building... polling latest console output...
                </div>
              )}
            </div>
            {/* Terminal Footer */}
            <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 select-none">
              <span>Status: {subVersions.find(s => s.id === activeLogSubId)?.jenkinsStatus === 'building' ? 'BUILDING' : 'COMPLETED'}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeLogContent);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
              >
                {copiedText ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>复制日志</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
