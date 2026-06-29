import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, ChevronRight, Plus, Search, Filter, ArrowUpDown, Trash2, 
  Settings, Type, Calendar, AlignLeft, ShieldCheck, Link2, DownloadCloud, FileEdit, Globe
} from 'lucide-react';
import { SubVersion, MajorVersion } from '../types';

interface SubVersionTableProps {
  subVersions: SubVersion[];
  majorVersions: MajorVersion[];
  onAddSubVersion: (majorVersionId: string) => SubVersion | null;
  onDeleteSubVersion: (id: string) => void;
  onEditSubVersion: (subVer: SubVersion) => void;
}

export default function SubVersionTable({
  subVersions,
  majorVersions,
  onAddSubVersion,
  onDeleteSubVersion,
  onEditSubVersion
}: SubVersionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Track collapsed groups (grouped by Parent Version Number)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Track active inline edit row ID
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SubVersion | null>(null);

  // 1. Filtering & Searching
  const filteredSubs = useMemo(() => {
    return subVersions.filter(s => {
      const matchesSearch = 
        s.subVersionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.majorVersionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.branch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.componentVersion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.imageName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.buildLink || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParent = selectedParent === 'all' || s.majorVersionId === selectedParent;
      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;

      return matchesSearch && matchesParent && matchesStatus;
    });
  }, [subVersions, searchTerm, selectedParent, selectedStatus]);

  // 2. Grouping by Parent Version
  const groups = useMemo(() => {
    return filteredSubs.reduce((acc, curr) => {
      const key = curr.majorVersionNumber;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {} as Record<string, SubVersion[]>);
  }, [filteredSubs]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '进行中': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case '已发布': return 'bg-teal-50 text-teal-700 border border-teal-200';
      case '测试中': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case '待打包': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case '挂起': return 'bg-rose-50 text-rose-700 border border-rose-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Start inline edit
  const startEdit = (sv: SubVersion) => {
    setEditingRowId(sv.id);
    setEditForm({ ...sv });
  };

  const handleEditChange = (field: keyof SubVersion, value: any) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const saveEdit = () => {
    if (editForm) {
      onEditSubVersion(editForm);
      setEditingRowId(null);
      setEditForm(null);
    }
  };

  // Helper to resolve parent ID from parent Name for insert
  const getParentIdByName = (name: string): string => {
    const p = majorVersions.find(m => m.versionNumber === name || m.type === name);
    return p ? p.id : (majorVersions[0]?.id || '');
  };

  return (
    <div className="space-y-4" id="sub-version-table-container">
      
      {/* Search and Filters Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Quick Filter: Parent Major Version */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">版本过滤:</span>
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              className="border border-gray-200 bg-slate-50 px-2 py-1 rounded-md text-gray-700 hover:bg-slate-100 focus:outline-hidden text-xs"
            >
              <option value="all">全部版本</option>
              {majorVersions.map(m => (
                <option key={m.id} value={m.id}>{m.versionNumber} ({m.type})</option>
              ))}
            </select>
          </div>

          {/* Quick Filter: Sub Version Status */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">RC版本状态:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-200 bg-slate-50 px-2 py-1 rounded-md text-gray-700 hover:bg-slate-100 focus:outline-hidden text-xs"
            >
              <option value="all">全部状态</option>
              <option value="进行中">进行中</option>
              <option value="测试中">测试中</option>
              <option value="待打包">待打包</option>
              <option value="已发布">已发布</option>
              <option value="挂起">挂起</option>
            </select>
          </div>

        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="搜索子版本、分支、镜像、构建..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 hover:bg-slate-100/50"
          />
        </div>

      </div>

      {/* Main Grid spreadsheet */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          
          <table className="w-full text-left border-collapse table-fixed min-w-[1300px]">
            
            {/* Header definition */}
            <thead>
              <tr className="bg-slate-50/70 text-gray-500 font-semibold text-[11px] border-b border-gray-200 select-none">
                <th className="w-10 py-3 px-2 text-center text-gray-400">#</th>
                <th className="w-44 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><Type size={11} className="text-gray-400" />所属版本</div></th>
                <th className="w-48 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><ShieldCheck size={11} className="text-blue-500" />RC版本号</div></th>
                <th className="w-24 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><Settings size={11} className="text-gray-400" />状态</div></th>
                <th className="w-72 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><AlignLeft size={11} className="text-gray-400" />阶段说明 / 修复需求</div></th>
                <th className="w-28 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><Calendar size={11} className="text-gray-400" />打包日期</div></th>
                <th className="w-28 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><Globe size={11} className="text-gray-400" />分支版本</div></th>
                <th className="w-36 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><Type size={11} className="text-gray-400" />组件版本</div></th>
                <th className="w-48 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><DownloadCloud size={11} className="text-gray-400" />容器镜像</div></th>
                <th className="w-48 py-3 px-3"><div className="flex items-center gap-1 text-gray-600"><Link2 size={11} className="text-blue-500" />构建版本链接</div></th>
                <th className="w-24 py-3 px-3 text-center text-gray-400">操作</th>
              </tr>
            </thead>

            {/* Grouped Rows */}
            <tbody className="divide-y divide-gray-100 text-xs">
              {Object.keys(groups).map((groupKey) => {
                const groupRows = groups[groupKey];
                const isCollapsed = collapsedGroups[groupKey];
                const parentId = getParentIdByName(groupKey);

                return (
                  <React.Fragment key={groupKey}>
                    
                    {/* Collapsible Group Header */}
                    <tr className="bg-slate-50 font-medium text-gray-600 border-t border-b border-gray-100">
                      <td colSpan={11} className="py-2.5 px-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupKey)}
                            className="flex items-center gap-1.5 text-gray-800 font-semibold focus:outline-hidden"
                          >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            <span className="font-mono text-blue-600">{groupKey}</span>
                            <span className="text-gray-400 text-[11px] font-normal">({groupRows.length} 个子版本)</span>
                          </button>

                          {/* Quick sub-version insert under this major version */}
                          <button
                            type="button"
                            onClick={() => {
                              const newSub = onAddSubVersion(parentId);
                              if (newSub) {
                                startEdit(newSub);
                              }
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5 font-semibold bg-white border border-gray-200 hover:border-blue-200 px-2.5 py-0.5 rounded-sm shadow-xs transition"
                          >
                            <Plus size={11} /> 插入小版本
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Group Data Rows */}
                    {!isCollapsed && groupRows.map((row, idx) => {
                      const isEditing = editingRowId === row.id && editForm;

                      if (isEditing && editForm) {
                        return (
                          <tr key={row.id} className="bg-slate-50/80 font-sans align-middle">
                            <td className="py-2 px-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                            
                            {/* Edit: Parent Number */}
                            <td className="p-1">
                              <select
                                value={editForm.majorVersionId}
                                onChange={(e) => {
                                  const mId = e.target.value;
                                  const parent = majorVersions.find(mv => mv.id === mId);
                                  handleEditChange('majorVersionId', mId);
                                  handleEditChange('majorVersionNumber', parent?.versionNumber || '');
                                }}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white"
                              >
                                {majorVersions.map(m => (
                                  <option key={m.id} value={m.id}>{m.versionNumber}</option>
                                ))}
                              </select>
                            </td>

                            {/* Edit: Sub Version Number */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={editForm.subVersionNumber}
                                onChange={(e) => handleEditChange('subVersionNumber', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                              />
                            </td>

                            {/* Edit: Status */}
                            <td className="p-1">
                              <select
                                value={editForm.status}
                                onChange={(e) => handleEditChange('status', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white"
                              >
                                <option value="进行中">进行中</option>
                                <option value="测试中">测试中</option>
                                <option value="待打包">待打包</option>
                                <option value="已发布">已发布</option>
                                <option value="挂起">挂起</option>
                              </select>
                            </td>

                            {/* Edit: Description */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={editForm.description}
                                onChange={(e) => handleEditChange('description', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white"
                                placeholder="输入Bug/需求ID"
                              />
                            </td>

                            {/* Edit: Build Date */}
                            <td className="p-1">
                              <input
                                type="date"
                                value={editForm.buildDate}
                                onChange={(e) => handleEditChange('buildDate', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white"
                              />
                            </td>

                            {/* Edit: Branch */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={editForm.branch}
                                onChange={(e) => handleEditChange('branch', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                              />
                            </td>

                            {/* Edit: Component version */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={editForm.componentVersion}
                                onChange={(e) => handleEditChange('componentVersion', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                              />
                            </td>

                            {/* Edit: Image Name */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={editForm.imageName}
                                onChange={(e) => handleEditChange('imageName', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                              />
                            </td>

                            {/* Edit: Build Link */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={editForm.buildLink}
                                onChange={(e) => handleEditChange('buildLink', e.target.value)}
                                className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded-sm bg-white font-mono"
                              />
                            </td>

                            {/* Save Actions */}
                            <td className="p-1 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  className="px-1.5 py-0.5 bg-blue-600 text-white rounded-sm text-[10px] hover:bg-blue-700"
                                >
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRowId(null)}
                                  className="px-1.5 py-0.5 border border-gray-300 text-gray-600 rounded-sm text-[10px] hover:bg-slate-100"
                                >
                                  取消
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      }

                      return (
                        <tr 
                          key={row.id}
                          className="hover:bg-blue-50/20 group/row transition duration-150 align-top"
                        >
                          {/* index */}
                          <td className="py-3 px-2 text-center text-gray-400 font-mono select-none">
                            {idx + 1}
                          </td>

                          {/* Major parent */}
                          <td className="py-3 px-3 text-gray-500 font-mono">
                            {row.majorVersionNumber}
                          </td>

                          {/* Sub version number */}
                          <td className="py-3 px-3 font-mono font-semibold text-gray-900">
                            {row.subVersionNumber}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(row.status)}`}>
                              {row.status}
                            </span>
                          </td>

                          {/* Stage description / items */}
                          <td className="py-3 px-3 text-gray-700 font-sans leading-relaxed break-all whitespace-normal">
                            {row.description || <span className="text-gray-300 italic">空</span>}
                          </td>

                          {/* Build date */}
                          <td className="py-3 px-3 text-gray-500 font-mono">
                            {row.buildDate || <span className="text-gray-300">-</span>}
                          </td>

                          {/* Branch version */}
                          <td className="py-3 px-3 text-gray-600 font-mono">
                            {row.branch || <span className="text-gray-300">-</span>}
                          </td>

                          {/* Component version */}
                          <td className="py-3 px-3 text-gray-600 font-mono">
                            {row.componentVersion || <span className="text-gray-300">-</span>}
                          </td>

                          {/* Container Image */}
                          <td className="py-3 px-3 text-gray-500 font-mono select-all truncate" title={row.imageName}>
                            {row.imageName || <span className="text-gray-300">-</span>}
                          </td>

                          {/* Build link */}
                          <td className="py-3 px-3">
                            {row.buildLink ? (
                              <span 
                                className="text-blue-600 hover:underline cursor-pointer font-mono font-medium truncate inline-flex items-center gap-0.5"
                                title="点击复制构建包编号"
                                onClick={() => {
                                  navigator.clipboard.writeText(row.buildLink);
                                  alert(`已复制构建包编号: ${row.buildLink}`);
                                }}
                              >
                                <Link2 size={11} className="inline" />
                                {row.buildLink}
                              </span>
                            ) : (
                              <span className="text-gray-300 italic">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center align-middle">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition duration-150">
                              <button
                                onClick={() => startEdit(row)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                title="编辑"
                              >
                                <FileEdit size={13} />
                              </button>
                              <button
                                onClick={() => onDeleteSubVersion(row.id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                title="删除"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}

                    {/* Group Empty */}
                    {!isCollapsed && groupRows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-4 text-center text-gray-400 italic bg-slate-50/50">
                          本版本下暂无测试包及RC记录
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
    </div>
  );
}
