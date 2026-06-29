export interface MajorVersion {
  id: string;
  type: string; // e.g. "主线", "SZXJ-N26040103", "城市云-N26040103"
  versionNumber: string; // e.g. "N26040104"
  priority: 1 | 2 | 3 | 4 | 5; // Badge 1, 2, 3, 4, 5
  status: '进行中' | '已发布' | '未开始' | '已挂起';
  stage: string; // e.g. "Release需要出版本", "研发中"
  releaseDate: string; // e.g. "2026-06-26"
  owner: string; // e.g. "韩波"
  meetingMinutes?: string; // Meeting minutes
  nextStageRDDDL?: string; // target RDD DL date
  nextStageQADDL?: string; // target QA DL date
  details?: string; // Additional descriptions/notes
  ftpUrl?: string; // FTP release file download URL
  aiReview?: string; // Cached AI Review
}

export interface SubVersion {
  id: string;
  majorVersionId: string; // FK to MajorVersion
  majorVersionNumber: string; // Denormalized for display/sorting
  subVersionNumber: string; // e.g. "N26040104RC1", "N26040104RC2", "Release"
  status: '进行中' | '已发布' | '测试中' | '待打包' | '挂起';
  description: string; // e.g. "9542,8465,8406", "已完成的全部需求"
  buildDate: string; // e.g. "2026-06-04"
  branch: string; // e.g. "26.04", "26.04-CSY"
  componentVersion: string; // e.g. "ngpm-26.04.1.4"
  imageName: string; // e.g. "NGPM-N26040104-RC1"
  buildLink: string; // e.g. "26.04.1.4-61843-meson"
  buildLinkUrl?: string; // Optional actual URL
  jenkinsStatus?: 'idle' | 'building' | 'success' | 'failed'; // Jenkins trigger state
  jenkinsBuildLog?: string; // Live log content
  ftpUrl?: string; // FTP package link
}

export type ViewType = 'major' | 'published' | 'dashboard';
