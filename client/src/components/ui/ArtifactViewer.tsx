import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { marked } from 'marked';
import { renderAsync } from 'docx-preview';
import DOMPurify from 'dompurify';
import { artifactsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FolderViewer } from './FolderViewer';

interface ArtifactViewerProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    id: string;
    name: string;
    type: string;
    filePath?: string | null;
    content?: string | null;
    shareToken?: string | null;
  } | null;
}

type ViewerMode = 'image' | 'video' | 'audio' | 'pdf' | 'html' | 'markdown' | 'spreadsheet' | 'folder' | 'office' | 'doc' | 'docx' | 'unknown';

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function detectMode(name: string, type: string, filePath?: string | null, content?: string | null): ViewerMode {
  const ext = getExtension(name);

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif'];
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', '3gp'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'opus'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods'];
  const officeExts = ['ppt', 'pptx', 'odt', 'odp'];

  if (content) return 'folder';
  if (imageExts.includes(ext) || type === 'image') return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'doc' || ext === 'docx') return ext;
  if (spreadsheetExts.includes(ext) || type === 'spreadsheet') return 'spreadsheet';
  if (officeExts.includes(ext)) return 'office';
  return 'unknown';
}

const modeLabels: Record<ViewerMode, string> = {
  image: '图片预览',
  video: '视频播放',
  audio: '音频播放',
  pdf: 'PDF 预览',
  html: 'HTML 预览',
  markdown: 'Markdown 预览',
  spreadsheet: '表格预览',
  folder: '文件夹',
  office: '文档预览',
  doc: '文档预览',
  docx: '文档预览',
  unknown: '文件预览',
};

const mdPreviewCSS = `
  .md-preview { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--ink); line-height: 1.7; }
  .md-preview h1 { font-size: 1.8em; font-weight: 700; margin: 0.8em 0 0.4em; padding-bottom: 0.3em; border-bottom: 1px solid var(--border-subtle); }
  .md-preview h2 { font-size: 1.4em; font-weight: 600; margin: 0.8em 0 0.4em; padding-bottom: 0.2em; border-bottom: 1px solid var(--border-subtle); }
  .md-preview h3 { font-size: 1.15em; font-weight: 600; margin: 0.7em 0 0.3em; }
  .md-preview h4, .md-preview h5, .md-preview h6 { font-size: 1em; font-weight: 600; margin: 0.6em 0 0.2em; }
  .md-preview p { margin: 0.5em 0; }
  .md-preview a { color: var(--blue); text-decoration: none; }
  .md-preview a:hover { text-decoration: underline; }
  .md-preview code { font-family: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace"; font-size: 0.88em; background: var(--surface-raised); padding: 0.15em 0.4em; border-radius: 4px; }
  .md-preview pre { background: var(--ink); color: var(--ink-4); padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0.8em 0; }
  .md-preview pre code { background: none; padding: 0; color: inherit; font-size: 0.85em; }
  .md-preview blockquote { border-left: 3px solid var(--border-default); margin: 0.6em 0; padding: 0.3em 0 0.3em 16px; color: var(--ink-2); }
  .md-preview ul, .md-preview ol { padding-left: 1.5em; margin: 0.5em 0; }
  .md-preview li { margin: 0.2em 0; }
  .md-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 0.9em; }
  .md-preview th, .md-preview td { border: 1px solid var(--border-subtle); padding: 6px 12px; text-align: left; }
  .md-preview th { background: var(--surface-overlay); font-weight: 600; }
  .md-preview img { max-width: 100%; border-radius: 4px; }
  .md-preview hr { border: none; border-top: 1px solid var(--border-subtle); margin: 1.2em 0; }
  .md-preview input[type="checkbox"] { margin-right: 6px; }
`;

export function ArtifactViewer({ isOpen, onClose, artifact }: ArtifactViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState(false);
  const [sheetData, setSheetData] = useState<{ headers: string[]; rows: string[][]; sheetNames: string[]; activeSheet: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role !== 'viewer';
  const [showShare, setShowShare] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(artifact?.shareToken || null);
  const [shareCopied, setShareCopied] = useState(false);

  const mode = useMemo(() => {
    if (!artifact) return 'unknown';
    return detectMode(artifact.name, artifact.type, artifact.filePath, artifact.content);
  }, [artifact]);

  const fileUrl = useMemo(() => {
    if (!artifact) return '';
    return artifactsApi.getFileUrl(artifact.id);
  }, [artifact]);

  useEffect(() => {
    if (!isOpen || !artifact) {
      setHtmlContent(null);
      setDocxLoading(false);
      setDocxError(false);
      setSheetData(null);
      setLoading(false);
      setShowShare(false);
      setShareToken(null);
      setShareCopied(false);
      return;
    }

    if (mode === 'html') {
      setLoading(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(text => {
          setHtmlContent(text);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    if (mode === 'markdown') {
      setLoading(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(async text => {
          const parsed = await marked(text);
          const raw = typeof parsed === 'string' ? parsed : '';
          setHtmlContent(DOMPurify.sanitize(raw));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    if (mode === 'doc') {
      setLoading(true);
      const previewUrl = artifactsApi.getPreviewUrl(artifact.id);
      fetch(previewUrl)
        .then(res => res.text())
        .then(text => {
          setHtmlContent(DOMPurify.sanitize(text));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    if (mode === 'docx') {
      setDocxLoading(true);
      setDocxError(false);
    }

    if (mode === 'spreadsheet') {
      setLoading(true);
      fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(buf => {
          const wb = XLSX.read(buf);
          const sheetNames = wb.SheetNames;
          const activeSheet = sheetNames[0];
          const ws = wb.Sheets[activeSheet];
          const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
          if (json.length === 0) {
            setSheetData({ headers: [], rows: [], sheetNames, activeSheet });
          } else {
            const headers = (json[0] as string[]).map(String);
            const rows = json.slice(1).map(row => (row as string[]).map(String));
            setSheetData({ headers, rows, sheetNames, activeSheet });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, artifact, mode, fileUrl]);

  useEffect(() => {
    if (mode !== 'docx' || !isOpen || !fileUrl || !docxContainerRef.current) return;
    const container = docxContainerRef.current;
    container.innerHTML = '';
    setDocxLoading(true);

    fetch(fileUrl)
      .then(r => r.arrayBuffer())
      .then(buf => renderAsync(buf, container, undefined, {
        className: 'docx-body',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      }).then(() => setDocxLoading(false)))
      .catch(() => { setDocxError(true); setDocxLoading(false); });
  }, [mode, isOpen, fileUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !artifact) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = artifact.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSheetChange = (sheetName: string) => {
    if (!artifact) return;
    setLoading(true);
    fetch(fileUrl)
      .then(res => res.arrayBuffer())
      .then(buf => {
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
        if (json.length === 0) {
          setSheetData(prev => prev ? { ...prev, activeSheet: sheetName, headers: [], rows: [] } : null);
        } else {
          const headers = (json[0] as string[]).map(String);
          const rows = json.slice(1).map(row => (row as string[]).map(String));
          setSheetData(prev => prev ? { ...prev, activeSheet: sheetName, headers, rows } : null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const renderContent = () => {
    switch (mode) {
      case 'image':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
            <img
              src={fileUrl}
              alt={artifact.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }}
            />
          </div>
        );

      case 'video':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
            <video
              src={fileUrl}
              controls
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 4 }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        );

      case 'audio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
            <div style={{
              width: 120, height: 120, borderRadius: 16, background: 'var(--surface-raised)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48 }}>
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{artifact.name}</div>
            <audio src={fileUrl} controls autoPlay style={{ width: 400, maxWidth: '80%' }}>
              您的浏览器不支持音频播放
            </audio>
          </div>
        );

      case 'pdf':
        return (
          <iframe
            src={fileUrl}
            title={artifact.name}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4 }}
          />
        );

      case 'html':
        if (loading) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
            </div>
          );
        }
        if (htmlContent) {
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          return (
            <iframe
              src={blobUrl}
              title={artifact.name}
              sandbox="allow-scripts allow-same-origin"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4, background: 'var(--surface)' }}
            />
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: 13, color: 'var(--red)' }}>加载失败</div>
          </div>
        );

      case 'markdown':
        if (loading) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
            </div>
          );
        }
        if (htmlContent) {
          return (
            <>
              <style>{mdPreviewCSS}</style>
              <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--surface)', display: 'flex', justifyContent: 'center' }}>
                <div style={{ padding: '32px 40px', maxWidth: 800, width: '100%' }}>
                  <div className="md-preview" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </div>
              </div>
            </>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: 13, color: 'var(--red)' }}>加载失败</div>
          </div>
        );

      case 'doc':
        if (loading) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
            </div>
          );
        }
        if (htmlContent) {
          return (
            <>
              <style>{`
                .doc-preview { font-family: 'Times New Roman', 'SimSun', serif; color: var(--ink); line-height: 1.8; }
                .doc-preview p { margin: 0.5em 0; text-indent: 2em; font-size: 14px; }
              `}</style>
              <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--surface)', display: 'flex', justifyContent: 'center' }}>
                <div style={{ padding: '32px 40px', maxWidth: 800, width: '100%' }}>
                  <div className="doc-preview" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </div>
              </div>
            </>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: 13, color: 'var(--red)' }}>加载失败</div>
          </div>
        );

      case 'docx':
        return (
          <>
            <style>{`
              .docx-wrapper { background: var(--surface) !important; padding: 0 !important; }
              .docx-wrapper > section.docx { box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important; margin: 24px auto !important; }
              .docx-wrapper .docx .page { margin: 0 auto !important; }
            `}</style>
            <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--surface-overlay)', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 900 }}>
                <div ref={docxContainerRef} />
                {docxLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>加载中...</div>
                )}
                {docxError && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--red)', fontSize: 13 }}>加载失败，请尝试下载后打开</div>
                )}
              </div>
            </div>
          </>
        );

      case 'spreadsheet':
        if (loading) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
            </div>
          );
        }
        if (sheetData) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)' }}>
              {sheetData.sheetNames.length > 1 && (
                <div style={{
                  display: 'flex', gap: 4, padding: '8px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  overflowX: 'auto', flexShrink: 0,
                }}>
                  {sheetData.sheetNames.map(name => (
                    <button
                      key={name}
                      onClick={() => handleSheetChange(name)}
                      style={{
                        height: 28, padding: '0 12px', borderRadius: 6,
                        border: '1px solid var(--border-default)',
                        background: name === sheetData.activeSheet ? 'var(--ink)' : 'transparent',
                        color: name === sheetData.activeSheet ? 'var(--canvas)' : 'var(--ink-2)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {sheetData.headers.length > 0 ? (
                  <table style={{
                    width: '100%', borderCollapse: 'collapse',
                    fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                  }}>
                    <thead>
                      <tr>
                        <th style={{
                          position: 'sticky', top: 0, left: 0, zIndex: 2,
                          background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)',
                          padding: '6px 10px', textAlign: 'left', fontWeight: 600,
                          color: 'var(--ink-2)', whiteSpace: 'nowrap',
                        }}>#</th>
                        {sheetData.headers.map((h, i) => (
                          <th key={i} style={{
                            position: 'sticky', top: 0, zIndex: 1,
                            background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)',
                            padding: '6px 10px', textAlign: 'left', fontWeight: 600,
                            color: 'var(--ink-2)', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetData.rows.map((row, ri) => (
                        <tr key={ri}>
                          <td style={{
                            background: 'var(--canvas)', border: '1px solid var(--border-subtle)',
                            padding: '4px 10px', color: 'var(--ink-3)', textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}>{ri + 1}</td>
                          {sheetData.headers.map((_, ci) => (
                            <td key={ci} style={{
                              border: '1px solid var(--border-subtle)',
                              padding: '4px 10px', color: 'var(--ink)',
                              maxWidth: 300, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{row[ci] || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>该工作表为空</div>
                  </div>
                )}
              </div>
              <div style={{
                padding: '6px 16px', borderTop: '1px solid var(--border-subtle)',
                fontSize: 11, color: 'var(--ink-3)', flexShrink: 0,
              }}>
                共 {sheetData.rows.length} 行
              </div>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: 13, color: 'var(--red)' }}>加载失败</div>
          </div>
        );

      case 'folder': {
        const fileTree = artifact.content ? JSON.parse(artifact.content) : [];
        return (
          <FolderViewer
            artifactId={artifact.id}
            artifactName={artifact.name}
            fileTree={fileTree}
          />
        );
      }

      case 'office':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 16, background: 'var(--surface-raised)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{artifact.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', maxWidth: 300 }}>
              该文件格式需要下载后使用对应应用打开
            </div>
            <button
              onClick={handleDownload}
              style={{
                marginTop: 8, height: 36, padding: '0 20px', borderRadius: 8,
                background: 'var(--ink)', color: 'var(--canvas)', border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              下载文件
            </button>
          </div>
        );

      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 16, background: 'var(--surface-raised)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{artifact.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>暂不支持预览该文件格式</div>
            <button
              onClick={handleDownload}
              style={{
                marginTop: 8, height: 36, padding: '0 20px', borderRadius: 8,
                background: 'var(--ink)', color: 'var(--canvas)', border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              下载文件
            </button>
          </div>
        );
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'var(--overlay)', backdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column',
        background: 'var(--canvas)',
      }}>
        {/* Header */}
        <div style={{
          height: 48, padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {artifact.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
              {modeLabels[mode]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isAdmin && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    if (showShare) { setShowShare(false); return; }
                    setShowShare(true);
                    if (!shareToken) {
                      artifactsApi.share(artifact.id).then(res => setShareToken(res.data.shareToken));
                    }
                  }}
                  style={{
                    height: 30, padding: '0 12px', borderRadius: 6,
                    border: '1px solid var(--border-default)', background: showShare ? 'var(--surface-raised)' : 'transparent',
                    fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  分享
                </button>
                {showShare && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 1000,
                    background: 'var(--surface)', border: '1px solid var(--border-default)',
                    borderRadius: 8, padding: 12, minWidth: 320,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}>
                    {shareToken ? (
                      <>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>公开链接（任何人可通过此链接查看）</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            readOnly
                            value={`${window.location.origin}/flowcraft/share/${shareToken}`}
                            style={{
                              flex: 1, height: 30, padding: '0 8px', borderRadius: 6, fontSize: 12,
                              border: '1px solid var(--border-subtle)', background: 'var(--canvas)',
                              color: 'var(--ink)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                            }}
                            onClick={e => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/flowcraft/share/${shareToken}`);
                              setShareCopied(true);
                              setTimeout(() => setShareCopied(false), 1500);
                            }}
                            style={{
                              height: 30, padding: '0 10px', borderRadius: 6, border: 'none',
                              background: 'var(--ink)', color: 'var(--canvas)',
                              fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            {shareCopied ? '已复制' : '复制'}
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            artifactsApi.unshare(artifact.id).then(() => { setShareToken(null); setShowShare(false); });
                          }}
                          style={{
                            marginTop: 8, background: 'none', border: 'none', padding: 0,
                            fontSize: 11, color: 'var(--ink-3)', cursor: 'pointer', textDecoration: 'underline',
                          }}
                        >
                          取消分享
                        </button>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>生成链接中...</div>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleDownload}
              style={{
                height: 30, padding: '0 12px', borderRadius: 6,
                border: '1px solid var(--border-default)', background: 'transparent',
                fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              下载
            </button>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 6,
                border: '1px solid var(--border-default)', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--ink-2)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderContent()}
        </div>
      </div>
    </>
  );
}
