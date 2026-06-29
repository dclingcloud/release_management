import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, User, Tag, ExternalLink, Hash, Clock, FileText, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { MajorVersion, SubVersion } from '../types';
import { initialOwners, ownerAvatars } from '../initialData';

interface VersionDetailDrawerProps {
  version: MajorVersion | null;
  subVersions: SubVersion[];
  isOpen: boolean;
  onClose: () => void;
  onSaveVersion: (updated: MajorVersion) => void;
  onSaveSubVersion: (subVer: SubVersion) => void;
  onDeleteSubVersion: (subVerId: string) => void;
  onAddSubVersion: (majorVerId: string) => SubVersion | null;
}

export default function VersionDetailDrawer({
  version,
  subVersions,
  isOpen,
  onClose,
  onSaveVersion,
  onSaveSubVersion,
  onDeleteSubVersion,
  onAddSubVersion
}: VersionDetailDrawerProps) {
  if (!isOpen || !version) return null;

  // Filter sub-versions belonging to this major version
  const associatedSubs = subVersions.filter(sv => sv.majorVersionId === version.id);

  // Local state for main version fields to avoid re-rendering parent on every keystroke
  const [formData, setFormData] = useState<MajorVersion>({ ...version });
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subFormData, setSubFormData] = useState<SubVersion | null>(null);

  // AI states
  const [aiReleaseNotes, setAiReleaseNotes] = useState<string>('');
  const [aiRiskAssessment, setAiRiskAssessment] = useState<string>('');
  const [isLoadingReleaseNotes, setIsLoadingReleaseNotes] = useState(false);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);

  // Clear AI states when selecting a new version
  React.useEffect(() => {
    setAiReleaseNotes('');
    setAiRiskAssessment('');
  }, [version?.id]);

  const handleGenerateReleaseNotes = async () => {
    setIsLoadingReleaseNotes(true);
    setAiReleaseNotes('');
    try {
      const res = await fetch('/api/ai/release-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionNumber: formData.versionNumber,
          subVersions: associatedSubs
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiReleaseNotes(data.notes || '没有提炼出有效的发布日志');
      } else {
        setAiReleaseNotes('生成失败，请检查后端服务');
      }
    } catch (err) {
      console.error(err);
      setAiReleaseNotes('请求失败，请检查网络或服务连接');
    } finally {
      setIsLoadingReleaseNotes(false);
    }
  };

  const handleGenerateRiskAssessment = async () => {
    setIsLoadingRisk(true);
    setAiRiskAssessment('');
    try {
      const res = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: formData
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiRiskAssessment(data.assessment || '没有提炼出有效的评估报告');
      } else {
        setAiRiskAssessment('分析评估失败，请检查后端服务');
      }
    } catch (err) {
      console.error(err);
      setAiRiskAssessment('请求失败，请检查网络或服务连接');
    } finally {
      setIsLoadingRisk(false);
    }
  };

  // Update form data if version prop changes
  React.useEffect(() => {
    setFormData({ ...version });
  }, [version]);

  const handleChange = (field: keyof MajorVersion, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onSaveVersion(updated); // auto-save on field change or blur
  };

  const handleSubChange = (field: keyof SubVersion, value: any) => {
    if (!subFormData) return;
    setSubFormData({ ...subFormData, [field]: value });
  };

  const startEditSub = (sv: SubVersion) => {
    setEditingSubId(sv.id);
    setSubFormData({ ...sv });
  };

  const saveSubEdit = () => {
    if (subFormData) {
      onSaveSubVersion(subFormData);
      setEditingSubId(null);
      setSubFormData(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="version-detail-drawer">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-3xl w-full bg-white shadow-2xl flex flex-col h-full transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-600 border border-blue-100">
              {formData.type || '未命名'}
            </span>
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              {formData.versionNumber || '版本详情'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: Basic Metadata Fields (Feishu Side Sheet Style) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">核心属性</h3>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Type */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Tag size={13} /> 版本类型
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  placeholder="如: 主线"
                />
              </div>

              {/* Version Number */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Hash size={13} /> 版本号
                </label>
                <input
                  type="text"
                  value={formData.versionNumber}
                  onChange={(e) => handleChange('versionNumber', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                  placeholder="如: N26040104"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Clock size={13} /> 版本状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as any)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="未开始">未开始</option>
                  <option value="进行中">进行中</option>
                  <option value="已发布">已发布</option>
                  <option value="已挂起">已挂起</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> 优先级
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', parseInt(e.target.value) as any)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value={1}>P1 - 极高</option>
                  <option value={2}>P2 - 高</option>
                  <option value={3}>P3 - 中</option>
                  <option value={4}>P4 - 低</option>
                  <option value={5}>P5 - 极低</option>
                </select>
              </div>

              {/* Version Stage */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <FileText size={13} /> 版本阶段说明
                </label>
                <input
                  type="text"
                  value={formData.stage}
                  onChange={(e) => handleChange('stage', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  placeholder="如: Release需要出版本"
                />
              </div>

              {/* Owner */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <User size={13} /> 负责人
                </label>
                <select
                  value={formData.owner}
                  onChange={(e) => handleChange('owner', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  {initialOwners.map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>

              {/* Release Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Calendar size={13} /> 计划发布日期
                </label>
                <input
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => handleChange('releaseDate', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Next Stage RDDDL */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Calendar size={13} /> 下一阶段 RDDDL
                </label>
                <input
                  type="date"
                  value={formData.nextStageRDDDL || ''}
                  onChange={(e) => handleChange('nextStageRDDDL', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Next Stage QADDL */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Calendar size={13} /> 下一阶段 QADDL
                </label>
                <input
                  type="date"
                  value={formData.nextStageQADDL || ''}
                  onChange={(e) => handleChange('nextStageQADDL', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Meeting Minutes and Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">会议纪要 & 备注说明</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">会议纪要摘要</label>
                <textarea
                  value={formData.meetingMinutes || ''}
                  onChange={(e) => handleChange('meetingMinutes', e.target.value)}
                  rows={2}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  placeholder="记录关键会议决议..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">版本背景/详情说明</label>
                <textarea
                  value={formData.details || ''}
                  onChange={(e) => handleChange('details', e.target.value)}
                  rows={3}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  placeholder="输入此版本包含的核心需求或定制背景..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <ExternalLink size={13} /> 大版本 FTP 交付物理路径 (若已发布)
                </label>
                <input
                  type="text"
                  value={formData.ftpUrl || ''}
                  onChange={(e) => handleChange('ftpUrl', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                  placeholder="ftp://ftp.internal/release/..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Nested Sub-versions Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                下属RC版本 ({associatedSubs.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  const newSub = onAddSubVersion(version.id);
                  if (newSub) {
                    startEditSub(newSub);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-sm hover:bg-blue-50 transition"
              >
                <Plus size={14} /> 新增RC版本
              </button>
            </div>

            {associatedSubs.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs bg-slate-50">
                暂无细分RC版本，点击右上角快速添加RC版本（如RC1, RC2）
              </div>
            ) : (
              <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100">
                {associatedSubs.map((sv) => {
                  const isEditing = editingSubId === sv.id;
                  
                  if (isEditing && subFormData) {
                    return (
                      <div key={sv.id} className="p-4 bg-slate-50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-gray-500">RC版本号</label>
                            <input
                              type="text"
                              value={subFormData.subVersionNumber}
                              onChange={(e) => handleSubChange('subVersionNumber', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-hidden focus:border-blue-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500">状态</label>
                            <select
                              value={subFormData.status}
                              onChange={(e) => handleSubChange('status', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-hidden focus:border-blue-500"
                            >
                              <option value="进行中">进行中</option>
                              <option value="测试中">测试中</option>
                              <option value="待打包">待打包</option>
                              <option value="已发布">已发布</option>
                              <option value="挂起">挂起</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500">分支</label>
                            <input
                              type="text"
                              value={subFormData.branch}
                              onChange={(e) => handleSubChange('branch', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500">提测日期</label>
                            <input
                              type="date"
                              value={subFormData.buildDate}
                              onChange={(e) => handleSubChange('buildDate', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-hidden"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[11px] text-gray-500">需求 / BUG (逗号分隔ID)</label>
                            <input
                              type="text"
                              value={subFormData.description}
                              onChange={(e) => handleSubChange('description', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-hidden"
                              placeholder="例如: 9542, 8465, 8406"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500">容器镜像名称</label>
                            <input
                              type="text"
                              value={subFormData.imageName}
                              onChange={(e) => handleSubChange('imageName', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-hidden font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500">构建构建链接 (Meson ID)</label>
                            <input
                              type="text"
                              value={subFormData.buildLink}
                              onChange={(e) => handleSubChange('buildLink', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-hidden font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingSubId(null)}
                            className="px-2.5 py-1 text-xs border border-gray-200 hover:bg-white text-gray-600 rounded-sm"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={saveSubEdit}
                            className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-medium"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={sv.id} className="p-3.5 hover:bg-slate-50 flex items-start justify-between gap-4 group transition">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-gray-800">
                            {sv.subVersionNumber}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            sv.status === '已发布' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                            sv.status === '测试中' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            sv.status === '待打包' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {sv.status}
                          </span>
                          {sv.branch && (
                            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded-sm font-mono">
                              分支: {sv.branch}
                            </span>
                          )}
                          {sv.buildDate && (
                            <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                              <Calendar size={10} /> {sv.buildDate}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed break-words font-sans">
                          {sv.description || <span className="text-gray-300 italic">暂无需求/修复记录描述</span>}
                        </p>

                        {(sv.imageName || sv.buildLink) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1.5">
                            {sv.imageName && (
                              <div className="text-[10px] text-gray-400 truncate font-mono">
                                镜像: <span className="text-gray-600 select-all">{sv.imageName}</span>
                              </div>
                            )}
                            {sv.buildLink && (
                              <div className="text-[10px] text-blue-500 hover:underline cursor-pointer truncate font-mono flex items-center gap-0.5">
                                <ExternalLink size={10} /> 构建: {sv.buildLink}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                        <button
                          type="button"
                          onClick={() => startEditSub(sv)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="编辑"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSubVersion(sv.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: AI Intelligent Assistant Section */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-50 text-blue-600">
                <ShieldCheck size={16} />
              </span>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                🤖 AI 智能协同交付专区
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoadingReleaseNotes}
                onClick={handleGenerateReleaseNotes}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-50 text-blue-700 disabled:text-gray-400 font-medium text-xs rounded-md transition shadow-2xs border border-blue-100 disabled:border-slate-100"
              >
                {isLoadingReleaseNotes ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>正在提炼发布日志...</span>
                  </>
                ) : (
                  <>
                    <span>✨ 智能生成 Release Notes</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isLoadingRisk}
                onClick={handleGenerateRiskAssessment}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-50 text-indigo-700 disabled:text-gray-400 font-medium text-xs rounded-md transition shadow-2xs border border-indigo-100 disabled:border-slate-100"
              >
                {isLoadingRisk ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>正在评估风险排期...</span>
                  </>
                ) : (
                  <>
                    <span>📊 智能风险排期双重评估</span>
                  </>
                )}
              </button>
            </div>

            {/* Release Notes Output */}
            {aiReleaseNotes && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">🤖 AI 提炼交付日志 (Release Notes)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(aiReleaseNotes);
                        alert('已成功复制发布日志到剪贴板');
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      复制日志
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('details', (formData.details || '') + '\n\n' + aiReleaseNotes);
                        alert('已成功追加至下方大版本详情说明中');
                      }}
                      className="text-emerald-600 hover:underline"
                    >
                      追加至详情说明
                    </button>
                  </div>
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-md text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto border border-slate-800 shadow-inner select-all">
                  {aiReleaseNotes}
                </pre>
              </div>
            )}

            {/* Risk Assessment Output */}
            {aiRiskAssessment && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">📊 AI 智能质量与排期风险评估报告</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(aiRiskAssessment);
                        alert('已成功复制风险评估报告到剪贴板');
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      复制评估
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('meetingMinutes', (formData.meetingMinutes || '') + '\n\nAI风险提示:\n' + aiRiskAssessment);
                        alert('已成功追加至上方会议纪要中');
                      }}
                      className="text-emerald-600 hover:underline"
                    >
                      追加至会议纪要
                    </button>
                  </div>
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-md text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto border border-slate-800 shadow-inner select-all">
                  {aiRiskAssessment}
                </pre>
              </div>
            )}
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveVersion(formData);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            确定保存
          </button>
        </div>
      </div>
    </div>
  );
}
