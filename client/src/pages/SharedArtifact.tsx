import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';
import { artifactsApi, publicApi } from '../services/api';

interface SharedArtifactData {
  id: string;
  name: string;
  type: string;
  filePath: string | null;
  content: string | null;
}

type ViewerMode = 'image' | 'video' | 'audio' | 'pdf' | 'html' | 'markdown' | 'spreadsheet' | 'folder' | 'office' | 'doc' | 'docx' | 'unknown';

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function detectMode(name: string, type: string, filePath?: string | null, content?: string | null): ViewerMode {
  const ext = filePath ? getExtension(filePath) : '';
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

const mdPreviewCSS = `
  .md-preview { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #18181b; line-height: 1.7; }
  .md-preview h1 { font-size: 1.8em; font-weight: 700; margin: 0.8em 0 0.4em; padding-bottom: 0.3em; border-bottom: 1px solid #e4e4e7; }
  .md-preview h2 { font-size: 1.4em; font-weight: 600; margin: 0.8em 0 0.4em; padding-bottom: 0.2em; border-bottom: 1px solid #e4e4e7; }
  .md-preview h3 { font-size: 1.15em; font-weight: 600; margin: 0.7em 0 0.3em; }
  .md-preview p { margin: 0.5em 0; }
  .md-preview a { color: #2563eb; text-decoration: none; }
  .md-preview code { font-family: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace"; font-size: 0.88em; background: #f4f4f5; padding: 0.15em 0.4em; border-radius: 4px; }
  .md-preview pre { background: #18181b; color: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 0.8em 0; }
  .md-preview pre code { background: none; padding: 0; color: inherit; font-size: 0.85em; }
  .md-preview blockquote { border-left: 3px solid #d4d4d8; margin: 0.6em 0; padding: 0.3em 0 0.3em 16px; color: #71717a; }
  .md-preview ul, .md-preview ol { padding-left: 1.5em; margin: 0.5em 0; }
  .md-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 0.9em; }
  .md-preview th, .md-preview td { border: 1px solid #e4e4e7; padding: 6px 12px; text-align: left; }
  .md-preview th { background: #f4f4f5; font-weight: 600; }
  .md-preview img { max-width: 100%; border-radius: 4px; }
`;

export function SharedArtifact() {
  const { token } = useParams<{ token: string }>();
  const [artifact, setArtifact] = useState<SharedArtifactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [docError, setDocError] = useState(false);
  const [sheetData, setSheetData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const mode = useMemo(() => {
    if (!artifact) return 'unknown';
    return detectMode(artifact.name, artifact.type, artifact.filePath, artifact.content);
  }, [artifact]);

  const fileUrl = useMemo(() => {
    if (!artifact || !token) return '';
    return artifactsApi.getPublicFileUrl(token);
  }, [artifact, token]);

  const folderFileUrl = useMemo(() => {
    return (filePath: string) => token ? artifactsApi.getPublicFolderFileUrl(token, filePath) : '';
  }, [token]);

  useEffect(() => {
    if (!token) return;
    publicApi.getArtifact(token)
      .then(res => setArtifact(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!artifact || !token) return;

    if (mode === 'html') {
      fetch(fileUrl).then(r => r.text()).then(setHtmlContent).catch(() => {});
    }

    if (mode === 'markdown') {
      fetch(fileUrl).then(r => r.text()).then(async text => {
        const parsed = await marked(text);
        setHtmlContent(DOMPurify.sanitize(typeof parsed === 'string' ? parsed : ''));
      }).catch(() => {});
    }

    if (mode === 'doc') {
      setDocError(false);
      const previewUrl = artifactsApi.getPublicPreviewUrl(token);
      fetch(previewUrl)
        .then(r => {
          if (!r.ok) throw new Error('preview failed');
          return r.text();
        })
        .then(text => {
          setHtmlContent(DOMPurify.sanitize(text));
        })
        .catch(() => {
          setDocError(true);
        });
    }

    if (mode === 'spreadsheet') {
      fetch(fileUrl).then(r => r.arrayBuffer()).then(buf => {
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
        if (json.length > 0) {
          setSheetData({
            headers: (json[0] as string[]).map(String),
            rows: json.slice(1).map(row => (row as string[]).map(String)),
          });
        }
      }).catch(() => {});
    }
  }, [artifact, token, mode, fileUrl]);

  useEffect(() => {
    if (mode !== 'docx' || !fileUrl) return;
    setDocxLoading(true);
    setDocxError(false);

    fetch(fileUrl)
      .then(r => r.arrayBuffer())
      .then(async buf => {
        const container = docxContainerRef.current;
        if (!container) { setDocxLoading(false); return; }
        container.innerHTML = '';
        try {
          await renderAsync(buf, container, undefined, {
            className: 'docx-body',
            inWrapper: true,
            ignoreWidth: true,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
          });
          container.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.removeProperty('max-width');
          });
          container.querySelectorAll('col').forEach(col => {
            col.style.removeProperty('width');
          });
          setDocxLoading(false);
        } catch {
          setDocxError(true);
          setDocxLoading(false);
        }
      })
      .catch(() => { setDocxError(true); setDocxLoading(false); });
  }, [mode, fileUrl]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fafafa' }}>
        <div style={{ fontSize: 13, color: '#71717a' }}>加载中...</div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fafafa', gap: 12 }}>
        <div style={{ fontSize: 14, color: '#18181b', fontWeight: 500 }}>链接无效或已过期</div>
        <div style={{ fontSize: 13, color: '#71717a' }}>该分享链接不存在或已被取消</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case 'image':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
            <img src={fileUrl} alt={artifact.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
          </div>
        );
      case 'video':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
            <video src={fileUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 4 }}>
              您的浏览器不支持视频播放
            </video>
          </div>
        );
      case 'audio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#18181b' }}>{artifact.name}</div>
            <audio src={fileUrl} controls autoPlay style={{ width: 400, maxWidth: '80%' }}>
              您的浏览器不支持音频播放
            </audio>
          </div>
        );
      case 'pdf':
        return <iframe src={fileUrl} title={artifact.name} style={{ width: '100%', height: '100%', border: 'none' }} />;
      case 'html':
        if (!htmlContent) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>加载中...</div>;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        return <iframe src={URL.createObjectURL(blob)} title={artifact.name} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />;
      case 'markdown':
        if (!htmlContent) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>加载中...</div>;
        return (
          <>
            <style>{mdPreviewCSS}</style>
            <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#fff', display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '32px 40px', maxWidth: 800, width: '100%' }}>
                <div className="md-preview" dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>
          </>
        );
      case 'doc':
        if (docError) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>该文档格式暂不支持预览，请下载后使用其他软件打开</div>;
        if (!htmlContent) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>加载中...</div>;
        return (
          <>
            <style>{`
              .doc-preview { font-family: 'Times New Roman', 'SimSun', serif; color: #18181b; line-height: 1.8; }
              .doc-preview p { margin: 0.5em 0; text-indent: 2em; font-size: 14px; }
              .doc-preview * { color: inherit !important; }
              .doc-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
              .doc-preview th, .doc-preview td { border: 1px solid #e4e4e7 !important; padding: 6px 12px; text-align: left; font-size: 14px; }
              .doc-preview th { background: #f4f4f5 !important; font-weight: 600; }
              @media(prefers-color-scheme:dark) {
                .doc-preview { color: #e4e4e7; }
                .doc-preview th, .doc-preview td { border-color: #3f3f46 !important; }
                .doc-preview th { background: #27272a !important; }
                .doc-preview td { background: #18181b !important; }
              }
            `}</style>
            <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#fff', display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '32px 40px', maxWidth: 800, width: '100%' }}>
                <div className="doc-preview" dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>
          </>
        );
      case 'docx':
        if (docxError) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}><div style={{ fontSize: 13, color: '#71717a' }}>该文档格式暂不支持预览，请下载后使用其他软件打开</div><a href={fileUrl} download style={{ fontSize: 12, color: '#18181b', textDecoration: 'underline' }}>下载文件</a></div>;
        return (
          <>
            <style>{`
              .docx-wrapper { background: #fff !important; }
              .docx-wrapper > section.docx { box-shadow: 0 1px 3px rgba(0,0,0,0.12); margin: 0 auto 16px !important; }
            `}</style>
            <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#fafafa', display: 'flex', justifyContent: 'center' }}>
              <div ref={docxContainerRef} style={{ padding: '16px 0', maxWidth: 900, width: '100%' }} />
            </div>
            {docxLoading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 13, color: '#71717a' }}>加载中...</div>}
          </>
        );
      case 'spreadsheet':
        if (!sheetData) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>加载中...</div>;
        return (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 2, background: '#f4f4f5', border: '1px solid #e4e4e7', padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#71717a' }}>#</th>
                  {sheetData.headers.map((h, i) => (
                    <th key={i} style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f4f4f5', border: '1px solid #e4e4e7', padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#71717a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetData.rows.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ background: '#fafafa', border: '1px solid #e4e4e7', padding: '4px 10px', color: '#a1a1aa', textAlign: 'center' }}>{ri + 1}</td>
                    {sheetData.headers.map((_, ci) => (
                      <td key={ci} style={{ border: '1px solid #e4e4e7', padding: '4px 10px', color: '#18181b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[ci] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'folder': {
        const fileTree = artifact.content ? JSON.parse(artifact.content) : [];
        return <PublicFolderViewer artifactId={artifact.id} artifactName={artifact.name} fileTree={fileTree} token={token!} folderFileUrl={folderFileUrl} />;
      }
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#71717a' }}>该文件类型暂不支持预览</div>
            <a href={fileUrl} download style={{ fontSize: 12, color: '#18181b', textDecoration: 'underline' }}>下载文件</a>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fafafa' }}>
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid #e4e4e7', background: '#fff',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#18181b' }}>{artifact.name}</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderContent()}
      </div>
    </div>
  );
}

function PublicDocxPreview({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    setLoading(true);
    setError(false);

    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => renderAsync(buf, container, undefined, {
        className: 'docx-body',
        inWrapper: true,
        ignoreWidth: true,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      }).then(() => {
        container.querySelectorAll('table').forEach(table => {
          table.style.width = '100%';
          table.style.removeProperty('max-width');
        });
        container.querySelectorAll('col').forEach(col => {
          col.style.removeProperty('width');
        });
        setLoading(false);
      }))
      .catch(() => { setError(true); setLoading(false); });
  }, [url]);

  return (
    <>
      <style>{`
        .docx-wrapper { background: #fff !important; }
        .docx-wrapper > section.docx { box-shadow: 0 1px 3px rgba(0,0,0,0.12); margin: 0 auto 16px !important; }
      `}</style>
      <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#fafafa', display: 'flex', justifyContent: 'center' }}>
        <div ref={containerRef} style={{ padding: '16px 0', maxWidth: 900, width: '100%' }} />
      </div>
      {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 13, color: '#71717a' }}>加载中...</div>}
      {error && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>该文档格式暂不支持预览</div>}
    </>
  );
}

function PublicFolderViewer({ artifactName, fileTree, token, folderFileUrl }: {
  artifactId: string;
  artifactName: string;
  fileTree: { path: string; size: number; mimeType: string }[];
  token: string;
  folderFileUrl: (filePath: string) => string;
}) {
  const defaultPath = useMemo(() => {
    const indexFile = fileTree.find(f => f.path === 'index.html' || f.path.endsWith('/index.html'));
    return indexFile?.path || fileTree[0]?.path || null;
  }, [fileTree]);

  const [selectedPath, setSelectedPath] = useState<string | null>(defaultPath);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selectedFile = useMemo(() => fileTree.find(f => f.path === selectedPath), [fileTree, selectedPath]);

  const tree = useMemo(() => {
    const root: { name: string; path: string; isFolder: boolean; children: any[] } = { name: 'root', path: '', isFolder: true, children: [] };
    for (const file of fileTree) {
      const parts = file.path.split('/');
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current.children.push({ name: part, path: file.path, isFolder: false, children: [], file });
        } else {
          let folder = current.children.find((c: any) => c.isFolder && c.name === part);
          if (!folder) {
            folder = { name: part, path: parts.slice(0, i + 1).join('/'), isFolder: true, children: [] };
            current.children.push(folder);
          }
          current = folder;
        }
      }
    }
    return root;
  }, [fileTree]);

  const ext = (name: string) => name.split('.').pop()?.toLowerCase() || '';
  const url = selectedFile ? folderFileUrl(selectedFile.path) : '';
  const fileExt = selectedFile ? ext(selectedFile.path) : '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(fileExt);
  const isHtml = fileExt === 'html' || fileExt === 'htm';
  const isPdf = fileExt === 'pdf';
  const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(fileExt);
  const isDocx = fileExt === 'docx';

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {sidebarOpen && (
        <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #e4e4e7', overflow: 'auto', padding: '8px 0', background: '#f4f4f5' }}>
          <div style={{ padding: '6px 12px 10px', fontSize: 11, fontWeight: 600, color: '#71717a', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{artifactName}</span>
            <button onClick={() => setSidebarOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#a1a1aa', padding: 0, display: 'flex', alignItems: 'center' }} title="隐藏侧栏">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>
          {tree.children.map((child: any) => (
            <PublicTreeItem key={child.path || child.name} node={child} depth={0} selectedPath={selectedPath} onSelect={setSelectedPath} />
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedFile ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '6px 16px', fontSize: 12, color: '#71717a', borderBottom: '1px solid #e4e4e7', background: '#fafafa', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} style={{ border: '1px solid #e4e4e7', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#71717a', padding: '3px 5px', display: 'flex', alignItems: 'center' }} title="显示文件列表">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                </button>
              )}
              {selectedFile.path.split('/').pop()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {isImage && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}><img src={url} alt={selectedFile.path} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>}
              {isHtml && <iframe src={url} title={selectedFile.path} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', height: '100%', border: 'none' }} />}
              {isPdf && <iframe src={url} title={selectedFile.path} style={{ width: '100%', height: '100%', border: 'none' }} />}
              {isVideo && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><video src={url} controls style={{ maxWidth: '100%', maxHeight: '100%' }} /></div>}
              {isDocx && <PublicDocxPreview url={url} />}
              {!isImage && !isHtml && !isPdf && !isVideo && !isDocx && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>
                  该文件类型暂不支持预览
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>
            选择左侧文件进行预览
          </div>
        )}
      </div>
    </div>
  );
}

function PublicTreeItem({ node, depth, selectedPath, onSelect }: { node: any; depth: number; selectedPath: string | null; onSelect: (path: string) => void }) {
  const [expanded, setExpanded] = useState(true);

  if (node.isFolder) {
    return (
      <div>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', paddingLeft: depth * 16 + 8,
            cursor: 'pointer', fontSize: 12, color: '#71717a',
            borderRadius: 4, transition: 'background 100ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e4e4e7'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: '#a1a1aa', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span>{node.name}</span>
        </div>
        {expanded && node.children.map((child: any) => (
          <PublicTreeItem key={child.path || child.name} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;
  return (
    <div
      onClick={() => onSelect(node.path)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', paddingLeft: depth * 16 + 22,
        cursor: 'pointer', fontSize: 12,
        color: isSelected ? '#18181b' : '#71717a',
        background: isSelected ? '#e4e4e7' : 'transparent',
        fontWeight: isSelected ? 500 : 400,
        borderRadius: 4, transition: 'all 100ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#e4e4e7'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
    </div>
  );
}
