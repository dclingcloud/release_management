import React from 'react';
import { MajorVersion, SubVersion } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface PublishedRoadmapProps {
  versions: MajorVersion[];
  subVersions: SubVersion[];
  onVersionClick: (version: MajorVersion) => void;
}

// Extract N2303, N2506, etc.
function extractPrefix(versionNumber: string): string {
  const match = versionNumber.match(/N\d{4}/);
  if (match) return match[0];
  const match2 = versionNumber.match(/N\d{2}\.\d{2}/);
  if (match2) return match2[0];
  const match3 = versionNumber.match(/N\d{2,}/);
  if (match3) return match3[0];
  return "其他";
}

export default function PublishedRoadmap({
  versions,
  subVersions,
  onVersionClick
}: PublishedRoadmapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Filter and sort by releaseDate
  const publishedVersions = React.useMemo(() => {
    return [...versions]
      .filter(v => v.status === '已发布')
      .sort((a, b) => {
        const dateA = a.releaseDate || '0000-00-00';
        const dateB = b.releaseDate || '0000-00-00';
        return dateA.localeCompare(dateB);
      });
  }, [versions]);

  // Compute available prefixes based on published versions
  const prefixesWithDates = React.useMemo(() => {
    const map: Record<string, string> = {};
    publishedVersions.forEach(v => {
      const prefix = extractPrefix(v.versionNumber);
      const date = v.releaseDate || '0000-00-00';
      if (!map[prefix] || date.localeCompare(map[prefix]) > 0) {
        map[prefix] = date;
      }
    });
    return map;
  }, [publishedVersions]);

  const uniquePrefixes = React.useMemo(() => {
    return Object.keys(prefixesWithDates).sort((a, b) => {
      return prefixesWithDates[b].localeCompare(prefixesWithDates[a]);
    });
  }, [prefixesWithDates]);

  // State for selected prefix (default to most recent)
  const [selectedPrefix, setSelectedPrefix] = React.useState<string>('');

  React.useEffect(() => {
    if (uniquePrefixes.length > 0 && !selectedPrefix) {
      setSelectedPrefix(uniquePrefixes[0]);
    }
  }, [uniquePrefixes, selectedPrefix]);

  // If previous selected prefix is no longer in the list (or list changed), reset it
  React.useEffect(() => {
    if (uniquePrefixes.length > 0 && selectedPrefix && !uniquePrefixes.includes(selectedPrefix)) {
      setSelectedPrefix(uniquePrefixes[0]);
    }
  }, [uniquePrefixes, selectedPrefix]);

  const filteredVersions = React.useMemo(() => {
    if (!selectedPrefix) return publishedVersions;
    return publishedVersions.filter(v => extractPrefix(v.versionNumber) === selectedPrefix);
  }, [publishedVersions, selectedPrefix]);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 200;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (publishedVersions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-150 p-4 text-center text-gray-400 text-[11px]">
        暂无已发布版本的记录，无法生成路线图。
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 rounded-xl border border-slate-200/60 p-3 shadow-2xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600">
            <Calendar size={12} />
          </span>
          <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            已发布版本时间轴
          </h3>

          {/* Prefix Selector */}
          {uniquePrefixes.length > 0 && (
            <div className="flex items-center gap-1.5 ml-4">
              <Filter size={10} className="text-gray-400 shrink-0" />
              <select
                value={selectedPrefix}
                onChange={(e) => setSelectedPrefix(e.target.value)}
                className="text-[10px] bg-white border border-slate-200 hover:border-slate-300 rounded-md py-0.5 px-1.5 font-medium text-gray-600 focus:outline-hidden focus:ring-1 focus:ring-blue-500/20"
                id="roadmap-prefix-select"
              >
                {uniquePrefixes.map(pfx => (
                  <option key={pfx} value={pfx}>
                    {pfx} 系列 ({publishedVersions.filter(v => extractPrefix(v.versionNumber) === pfx).length}个)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Scroll Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-gray-500 hover:text-gray-700 transition"
            title="向左滚动"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-gray-500 hover:text-gray-700 transition"
            title="向右滚动"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Timeline Viewport */}
      <div className="relative overflow-hidden w-full">
        {filteredVersions.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-[11px] bg-white rounded-lg border border-dashed border-slate-200">
            该系列暂无已发布的版本
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Connector Line */}
            <div className="absolute left-8 right-8 top-[0.4rem] h-[1.5px] bg-slate-200 z-0" />

            <div
              ref={containerRef}
              className="flex gap-4 overflow-x-auto pt-1 pb-1 px-4 scroll-smooth scrollbar-none snap-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredVersions.map((version) => (
                <div 
                  key={version.id} 
                  className="relative flex flex-col items-center snap-start group min-w-[130px] max-w-[130px] pb-1"
                >
                  {/* Timeline Dot */}
                  <div className="relative z-10 select-none mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-500 shadow-sm group-hover:scale-125 group-hover:border-blue-600 transition-all flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-blue-500 group-hover:bg-blue-600" />
                    </div>
                  </div>

                  {/* Tiny Card Block */}
                  <div
                    onClick={() => onVersionClick(version)}
                    className="w-full bg-white border border-slate-150 hover:border-blue-400 hover:shadow-xs rounded-lg p-2 cursor-pointer transition-all duration-150 flex flex-col items-center text-center space-y-1 relative"
                    id={`roadmap-node-${version.id}`}
                  >
                    <div 
                      className="text-[10px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate w-full"
                      title={version.versionNumber}
                    >
                      {version.versionNumber}
                    </div>
                    
                    <div className="text-[8px] text-gray-400 font-mono">
                      {version.releaseDate}
                    </div>

                    <div className="flex gap-1 items-center justify-center pt-0.5">
                      <span className="text-[8px] px-1 bg-slate-100 text-slate-500 rounded truncate max-w-[55px]">
                        {version.type}
                      </span>
                      {version.ftpUrl && (
                        <span className="text-[8px] text-blue-500" title="已发布大版本交付件">
                          📦
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
