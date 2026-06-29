import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, BarChart3, Settings2, Upload, Download, RefreshCw, 
  HelpCircle, ChevronRight, FileSpreadsheet, Plus, CheckCircle2,
  AlertCircle, ArrowRightLeft, FileJson, X
} from 'lucide-react';
import { MajorVersion, SubVersion, ViewType } from './types';
import { initialMajorVersions, initialSubVersions } from './initialData';
import MajorVersionTable from './components/MajorVersionTable';
import VersionDetailDrawer from './components/VersionDetailDrawer';
import DashboardView from './components/DashboardView';

const STORAGE_KEYS = {
  MAJOR_VERSIONS: 'pm_major_versions',
  SUB_VERSIONS: 'pm_sub_versions'
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewType>('major');
  const [majorVersions, setMajorVersions] = useState<MajorVersion[]>([]);
  const [subVersions, setSubVersions] = useState<SubVersion[]>([]);
  
  // Drawer state
  const [selectedVersion, setSelectedVersion] = useState<MajorVersion | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Notification / Toast states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial State Hydration from local database API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [majorsRes, subsRes] = await Promise.all([
          fetch('/api/major-versions'),
          fetch('/api/sub-versions')
        ]);
        if (majorsRes.ok && subsRes.ok) {
          const majors = await majorsRes.json();
          const subs = await subsRes.json();
          setMajorVersions(majors);
          setSubVersions(subs);
        } else {
          throw new Error('Failed to fetch from local database');
        }
      } catch (err) {
        console.error("Failed to fetch data, fallback to defaults", err);
        setMajorVersions(initialMajorVersions);
        setSubVersions(initialSubVersions);
        showToast('连接本地数据库失败，已使用离线模拟数据运行', 'error');
      }
    };
    fetchData();
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 3. Version CRUD Operations
  const handleSaveVersion = (updatedVersion: MajorVersion) => {
    const updatedList = majorVersions.map(v => v.id === updatedVersion.id ? updatedVersion : v);
    setMajorVersions(updatedList);
    
    // Auto sync sub-version denormalized parent numbers
    const updatedSubList = subVersions.map(s => {
      if (s.majorVersionId === updatedVersion.id) {
        return { ...s, majorVersionNumber: updatedVersion.versionNumber };
      }
      return s;
    });
    setSubVersions(updatedSubList);

    // Persist to server database
    fetch(`/api/major-versions/${updatedVersion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedVersion)
    }).then(res => {
      if (res.ok) {
        showToast(`版本 [${updatedVersion.versionNumber}] 保存成功`, 'success');
      } else {
        showToast('保存版本到数据库失败', 'error');
      }
    }).catch(err => {
      console.error(err);
      showToast('连接数据库服务失败', 'error');
    });
  };

  const handleAddMajorVersion = (status?: string) => {
    const newId = `m_${Date.now()}`;
    const defaultNumber = `N${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}010${majorVersions.length + 1}`;
    
    const newVersion: MajorVersion = {
      id: newId,
      type: status === '已发布' ? '归档分支' : '定制主线',
      versionNumber: defaultNumber,
      priority: 3,
      status: (status as any) || '进行中',
      stage: '新版本规划中',
      releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      owner: '韩波',
      meetingMinutes: '',
      details: '新建版本，请双击或点击操作栏展开核心详情。',
    };

    const newList = [newVersion, ...majorVersions];
    setMajorVersions(newList);

    // Persist to server database
    fetch('/api/major-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVersion)
    }).catch(err => {
      console.error(err);
      showToast('创建版本保存到数据库失败', 'error');
    });
    
    // Automatically open drawer to let user configure the new row instantly
    setSelectedVersion(newVersion);
    setIsDrawerOpen(true);
    showToast(`成功创建版本 ${defaultNumber}，已为您自动展开编辑区`, 'success');
  };

  const handleDeleteMajorVersion = (id: string) => {
    const target = majorVersions.find(v => v.id === id);
    if (!target) return;

    if (window.confirm(`确定删除版本 [${target.versionNumber}] 吗？\n该版本下关联的所有RC版本也会一同删除！`)) {
      const filteredMajors = majorVersions.filter(v => v.id !== id);
      const filteredSubs = subVersions.filter(s => s.majorVersionId !== id);
      
      setMajorVersions(filteredMajors);
      setSubVersions(filteredSubs);

      if (selectedVersion?.id === id) {
        setIsDrawerOpen(false);
        setSelectedVersion(null);
      }

      // Persist to server database
      fetch(`/api/major-versions/${id}`, {
        method: 'DELETE'
      }).then(res => {
        if (res.ok) {
          showToast(`版本 [${target.versionNumber}] 及其下属RC版本已从数据库中删除`, 'info');
        } else {
          showToast('从数据库删除版本失败', 'error');
        }
      }).catch(err => {
        console.error(err);
        showToast('连接数据库服务失败', 'error');
      });
    }
  };

  // 4. SubVersion (RC) CRUD Operations
  const handleSaveSubVersion = (updatedSub: SubVersion) => {
    const updatedList = subVersions.map(s => s.id === updatedSub.id ? updatedSub : s);
    setSubVersions(updatedList);

    // Persist to server database
    fetch(`/api/sub-versions/${updatedSub.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSub)
    }).then(res => {
      if (res.ok) {
        showToast(`RC版本 ${updatedSub.subVersionNumber} 更新成功`, 'success');
      } else {
        showToast('保存RC版本到数据库失败', 'error');
      }
    }).catch(err => {
      console.error(err);
      showToast('连接数据库服务失败', 'error');
    });
  };

  const handleAddSubVersion = (majorId: string): SubVersion | null => {
    const parentVersion = majorVersions.find(v => v.id === majorId);
    if (!parentVersion) return null;

    const parentSubs = subVersions.filter(s => s.majorVersionId === majorId);
    const rcNum = parentSubs.length + 1;
    const isReleaseCandidate = rcNum < 5;
    const subNumber = isReleaseCandidate 
      ? `${parentVersion.versionNumber}RC${rcNum}`
      : `${parentVersion.versionNumber}_PATCH_${rcNum - 4}`;

    const newSub: SubVersion = {
      id: `s_${Date.now()}`,
      majorVersionId: majorId,
      majorVersionNumber: parentVersion.versionNumber,
      subVersionNumber: subNumber,
      status: '进行中',
      description: '',
      buildDate: new Date().toISOString().split('T')[0],
      branch: '',
      componentVersion: '',
      imageName: '',
      buildLink: '',
    };

    const newList = [...subVersions, newSub];
    setSubVersions(newList);

    // Persist to server database
    fetch('/api/sub-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub)
    }).catch(err => {
      console.error(err);
      showToast('保存新RC版本到数据库失败', 'error');
    });
    
    // Refresh the drawer details to show the newly added nested sub-version
    if (selectedVersion?.id === majorId) {
      setSelectedVersion({ ...parentVersion });
    }
    showToast(`成功添加RC版本 ${subNumber}`, 'success');
    return newSub;
  };

  const handleDeleteSubVersion = (subId: string) => {
    const target = subVersions.find(s => s.id === subId);
    if (!target) return;

    if (window.confirm(`确认删除RC版本 ${target.subVersionNumber} 吗？`)) {
      const filtered = subVersions.filter(s => s.id !== subId);
      setSubVersions(filtered);
      
      // Update drawer state
      if (selectedVersion) {
        setSelectedVersion({ ...selectedVersion });
      }

      // Persist to server database
      fetch(`/api/sub-versions/${subId}`, {
        method: 'DELETE'
      }).then(res => {
        if (res.ok) {
          showToast(`RC版本 ${target.subVersionNumber} 已从数据库中删除`, 'info');
        } else {
          showToast('从数据库删除RC版本失败', 'error');
        }
      }).catch(err => {
        console.error(err);
        showToast('连接数据库服务失败', 'error');
      });
    }
  };

  // 5. Backup Export/Import & Reset
  const handleExportData = () => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      majorVersions,
      subVersions
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `产品版本管理_备份_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('备份数据 JSON 文件已生成并下载', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.majorVersions) && Array.isArray(parsed.subVersions)) {
          fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              majorVersions: parsed.majorVersions,
              subVersions: parsed.subVersions
            })
          }).then(async res => {
            if (res.ok) {
              const data = await res.json();
              setMajorVersions(data.majorVersions);
              setSubVersions(data.subVersions);
              showToast(`导入成功！共加载并保存了 ${data.majorVersions.length} 个版本及 ${data.subVersions.length} 个RC版本。`, 'success');
              setIsImportModalOpen(false);
            } else {
              showToast('导入数据到数据库失败', 'error');
            }
          }).catch(err => {
            console.error(err);
            showToast('连接数据库服务失败', 'error');
          });
        } else {
          showToast('JSON 格式验证失败，必须含有 majorVersions 与 subVersions 数组结构。', 'error');
        }
      } catch (err) {
        showToast('JSON 解析失败，请提供完整合规的 JSON 文件。', 'error');
      }
    };
    fileReader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('您确定要将所有数据重置到最原始的示例状态吗？\n当前您做出的所有修改将会丢失！')) {
      fetch('/api/reset', {
        method: 'POST'
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          setMajorVersions(data.majorVersions);
          setSubVersions(data.subVersions);
          setIsDrawerOpen(false);
          setSelectedVersion(null);
          showToast('数据已成功重置为默认参考值并写入数据库', 'success');
        } else {
          showToast('重置数据库失败', 'error');
        }
      }).catch(err => {
        console.error(err);
        showToast('连接数据库服务失败', 'error');
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      
      {/* Dynamic Toast System */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-lg shadow-xl border text-sm transition-all animate-bounce ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toastMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="font-medium font-sans">{toastMessage.text}</span>
        </div>
      )}

      {/* Global Brand Header / Lark Style Layout Header */}
      <header className="bg-white border-b border-gray-200 shadow-xs px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        
        {/* Left Side: Logo & System Identifier */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <Layers size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span>产品版本生命周期管理平台</span>
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
              精细化跟踪版本需求规划与下级测试 RC、容器镜像生命周期
            </p>
          </div>
        </div>

        {/* Middle Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200/50">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-600 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 size={13} />
            📊 进度仪表盘
          </button>
          
          <button
            onClick={() => setActiveTab('major')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'major'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-600 hover:bg-slate-200/60'
            }`}
          >
            <FileSpreadsheet size={13} />
            📁 版本详情
          </button>

          <button
            onClick={() => setActiveTab('published')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'published'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-600 hover:bg-slate-200/60'
            }`}
          >
            <CheckCircle2 size={13} />
            📋 已发布记录
          </button>
        </div>

        {/* Right Side: Data Portability Controls */}
        <div className="flex items-center gap-2">
          
          {/* Import JSON button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/20 text-xs font-medium rounded-md transition"
            title="从本地备份 JSON 恢复数据"
          >
            <Upload size={13} />
            <span>导入备份</span>
          </button>

          {/* Export backup JSON */}
          <button
            onClick={handleExportData}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/20 text-xs font-medium rounded-md transition"
            title="将整个工作区导出为 JSON 包"
          >
            <Download size={13} />
            <span>导出备份</span>
          </button>

          {/* Reset button */}
          <button
            onClick={handleResetData}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-100 text-red-600 hover:bg-red-50 text-xs font-medium rounded-md transition"
            title="还原原始参考数据"
          >
            <RefreshCw size={13} />
            <span>还原数据</span>
          </button>

        </div>

      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">
        
        {activeTab === 'dashboard' && (
          <DashboardView 
            majorVersions={majorVersions} 
            subVersions={subVersions} 
          />
        )}

        {activeTab === 'major' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-gray-900">规划版本表</h2>
              </div>
            </div>
            <MajorVersionTable
              versions={majorVersions.filter(v => v.status !== '已发布')}
              subVersions={subVersions}
              onRowClick={(v) => {
                setSelectedVersion(v);
                setIsDrawerOpen(true);
              }}
              onAddRow={handleAddMajorVersion}
              onDeleteRow={handleDeleteMajorVersion}
              onUpdateRow={handleSaveVersion}
              onAddSubVersion={handleAddSubVersion}
              onDeleteSubVersion={handleDeleteSubVersion}
              onEditSubVersion={handleSaveSubVersion}
            />
          </div>
        )}

        {activeTab === 'published' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-gray-900">已发布与交付记录</h2>
                <p className="text-xs text-gray-400">已发布历史版本的归档记录，详细展示已发布版本进度及下级所有 RC版本。双击或点击抽屉可以查看详情。</p>
              </div>
            </div>
            <MajorVersionTable
              versions={majorVersions.filter(v => v.status === '已发布')}
              subVersions={subVersions}
              onRowClick={(v) => {
                setSelectedVersion(v);
                setIsDrawerOpen(true);
              }}
              onAddRow={handleAddMajorVersion}
              onDeleteRow={handleDeleteMajorVersion}
              onUpdateRow={handleSaveVersion}
              onAddSubVersion={handleAddSubVersion}
              onDeleteSubVersion={handleDeleteSubVersion}
              onEditSubVersion={handleSaveSubVersion}
              hideAddButton={true}
            />
          </div>
        )}

      </main>

      {/* Drawer: Detailed Attributes Panel (Nested Subversion Management Included) */}
      <VersionDetailDrawer
        version={selectedVersion}
        subVersions={subVersions}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedVersion(null);
        }}
        onSaveVersion={handleSaveVersion}
        onSaveSubVersion={handleSaveSubVersion}
        onDeleteSubVersion={handleDeleteSubVersion}
        onAddSubVersion={handleAddSubVersion}
      />

      {/* Backup Import Dialog Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-gray-100 max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X size={16} />
            </button>
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <FileJson size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900">导入备份数据</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                请选择您之前从该平台导出的备份 <code>.json</code> 文件。
                导入将覆盖当前浏览器保存的本地版本与测试包状态。
              </p>
              
              <div className="pt-4">
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportJSON}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-lg text-xs font-semibold text-gray-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/30 transition cursor-pointer"
                >
                  点击选择本地 JSON 备份文件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Footer info */}
      <footer className="bg-white border-t border-gray-200/60 py-4.5 px-6 text-center text-xs text-gray-400 font-sans mt-auto">
        产品版本生命周期管理系统 · © 2026 开发协同效能组
      </footer>

    </div>
  );
}
