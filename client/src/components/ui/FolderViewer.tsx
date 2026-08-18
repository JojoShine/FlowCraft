import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { renderAsync } from 'docx-preview';
import DOMPurify from 'dompurify';
import { artifactsApi } from '../../services/api';

interface FileEntry {
  path: string;
  size: number;
  mimeType: string;
}

interface FolderViewerProps {
  artifactId: string;
  artifactName: string;
  fileTree: FileEntry[];
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: FileEntry;
}

function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isFolder: true, children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.children.push({
          name: part,
          path: file.path,
          isFolder: false,
          children: [],
          file,
        });
      } else {
        let folder = current.children.find(c => c.isFolder && c.name === part);
        if (!folder) {
          folder = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            isFolder: true,
            children: [],
          };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sort(n.children));
  };
  sort(root.children);

  return root;
}

function getExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

const iconColor = 'var(--ink-3)';
const iconStyle = { width: 14, height: 14, flexShrink: 0 };

function FileIcon({ name }: { name: string }) {
  const ext = getExt(name);

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    );
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
        <polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    );
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    );
  }
  if (ext === 'pdf') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    );
  }
  if (['html', 'htm'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    );
  }
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'css', 'scss'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
        <line x1="14" y1="4" x2="10" y2="20"/>
      </svg>
    );
  }
  if (['json', 'yaml', 'yml', 'toml', 'xml'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    );
  }
  if (['zip', 'tar', 'gz', 'rar'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M21 8v13H3V8"/>
        <path d="M1 3h22v5H1z"/>
        <path d="M10 12h4"/>
      </svg>
    );
  }
  if (['doc', 'docx'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    );
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  );
}

function FolderIcon({ open }: { open?: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1"/>
        <path d="M20.42 12.42l-2.78-2.79A2 2 0 0 0 16.22 9H5"/>
        <path d="M3.58 12.42l2.78 6.79A2 2 0 0 0 8.18 21h9.64a2 2 0 0 0 1.82-1.18l2.78-6.79"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function ZoomControls({ scale, onZoomIn, onZoomOut, onZoomReset }: {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}) {
  const btnStyle: React.CSSProperties = {
    width: 26, height: 26, border: '1px solid var(--border-subtle)', borderRadius: 5,
    background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: 'var(--ink-2)', transition: 'all 120ms',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={onZoomOut} style={btnStyle} title="缩小">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button
        onClick={onZoomReset}
        style={{
          ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 11,
          fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", minWidth: 42,
        }}
        title="重置缩放"
      >
        {Math.round(scale * 100)}%
      </button>
      <button onClick={onZoomIn} style={btnStyle} title="放大">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

function FilePreview({ artifactId, filePath, mimeType, scale }: { artifactId: string; filePath: string; mimeType: string; scale: number }) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const url = artifactsApi.getFolderFileUrl(artifactId, filePath);
  const ext = getExt(filePath);

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'flac'].includes(ext);
  const isPdf = ext === 'pdf';
  const isHtml = ext === 'html' || ext === 'htm';
  const isMarkdown = ext === 'md' || ext === 'markdown';
  const isDocx = ext === 'docx';
  const isDoc = ext === 'doc';
  const isText = ['txt', 'log', 'csv', 'json', 'yaml', 'yml', 'toml', 'xml', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'css', 'scss', 'sh', 'bat', 'sql', 'env', 'gitignore', 'dockerignore', 'makefile', 'dockerfile'].includes(ext) || mimeType.startsWith('text/');

  useEffect(() => {
    setTextContent(null);
    setLoading(true);
  }, [filePath]);

  if (isImage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, background: 'var(--canvas)' }}>
        <img src={url} alt={filePath} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4, transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 150ms' }} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, background: '#000' }}>
        <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }} />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40 }}>
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <audio src={url} controls autoPlay style={{ width: 400 }} />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="fv-scroll" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <iframe src={url} title={filePath} style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, border: 'none', transform: `scale(${scale})`, transformOrigin: '0 0' }} />
      </div>
    );
  }

  if (isHtml) {
    return (
      <div className="fv-scroll" style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--surface)' }}>
        <div style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, transformOrigin: '0 0', transform: `scale(${scale})` }}>
          <iframe src={url} title={filePath} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', height: '100%', border: 'none', background: 'var(--surface)' }} />
        </div>
      </div>
    );
  }

  if (isMarkdown) {
    return <MarkdownPreview url={url} scale={scale} />;
  }

  if (isDocx) {
    return <DocxPreview url={url} scale={scale} />;
  }

  if (isDoc) {
    return <DocPreview artifactId={artifactId} filePath={filePath} scale={scale} />;
  }

  if (isText) {
    if (loading && textContent === null) {
      fetch(url)
        .then(r => r.text())
        .then(t => { setTextContent(t); setLoading(false); })
        .catch(() => setLoading(false));
      return <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>加载中...</div>;
    }
    return (
      <div className="fv-scroll" style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--canvas)', display: 'flex', justifyContent: 'center' }}>
        <pre style={{
          margin: 0, padding: 20,
          fontSize: 13 * scale, lineHeight: 1.6, fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
          color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          maxWidth: 900, width: '100%',
        }}>
          {textContent || '(空文件)'}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div style={{ color: 'var(--ink-3)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40 }}>
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>该文件类型暂不支持预览</div>
      <a href={url} download style={{ fontSize: 12, color: 'var(--ink)', textDecoration: 'underline' }}>下载文件</a>
    </div>
  );
}

const markdownCSS = `
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

function MarkdownPreview({ url, scale }: { url: string; scale: number }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setHtml(null);
    setLoading(true);
    setError(false);
    fetch(url)
      .then(r => r.text())
      .then(async text => {
        const parsed = await marked(text);
        const raw = typeof parsed === 'string' ? parsed : '';
        setHtml(DOMPurify.sanitize(raw));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [url]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>加载中...</div>;
  if (error || !html) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--red)', fontSize: 13 }}>加载失败</div>;

  return (
    <>
      <style>{markdownCSS}</style>
      <div className="fv-scroll" style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--surface)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ transformOrigin: 'top center', transform: `scale(${scale})`, padding: '32px 40px', maxWidth: 800, width: '100%' }}>
          <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </>
  );
}

function DocxPreview({ url, scale }: { url: string; scale: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    fetch(url)
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
      }).then(() => setLoading(false)))
      .catch(() => { setError(true); setLoading(false); });
  }, [url]);

  if (error) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--red)', fontSize: 13 }}>加载失败，请尝试下载后打开</div>;

  return (
    <>
      <style>{`
        .docx-wrapper { background: var(--surface) !important; padding: 0 !important; }
        .docx-wrapper > section.docx { box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important; margin: 24px auto !important; }
        .docx-wrapper .docx .page { margin: 0 auto !important; }
      `}</style>
      <div className="fv-scroll" style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--surface-overlay)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ transformOrigin: 'top center', transform: `scale(${scale})`, width: '100%', maxWidth: 900 }}>
          <div ref={containerRef} />
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>加载中...</div>}
        </div>
      </div>
    </>
  );
}

function DocPreview({ artifactId, filePath, scale }: { artifactId: string; filePath: string; scale: number }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const previewUrl = artifactsApi.getFolderPreviewUrl(artifactId, filePath);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setHtmlContent(null);
    fetch(previewUrl)
      .then(r => r.text())
      .then(text => { setHtmlContent(DOMPurify.sanitize(text)); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [previewUrl]);

  if (error) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--red)', fontSize: 13 }}>加载失败，请尝试下载后打开</div>;

  return (
    <>
      <style>{`
        .doc-fv-preview { font-family: 'Times New Roman', 'SimSun', serif; color: var(--ink); line-height: 1.8; }
        .doc-fv-preview p { margin: 0.5em 0; text-indent: 2em; font-size: 14px; }
      `}</style>
      <div className="fv-scroll" style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--surface)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ transformOrigin: 'top center', transform: `scale(${scale})`, width: '100%', maxWidth: 800, padding: '24px 32px' }}>
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>加载中...</div>}
          {htmlContent && <div className="doc-fv-preview" dangerouslySetInnerHTML={{ __html: htmlContent }} />}
        </div>
      </div>
    </>
  );
}

function TreeItem({ node, depth, selectedPath, onSelect }: { node: TreeNode; depth: number; selectedPath: string | null; onSelect: (path: string) => void }) {
  const [expanded, setExpanded] = useState(true);

  if (node.isFolder) {
    return (
      <div>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', paddingLeft: depth * 16 + 8,
            cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)',
            borderRadius: 4, transition: 'background 100ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--ink-4)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <FolderIcon open={expanded} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
        </div>
        {expanded && node.children.map(child => (
          <TreeItem key={child.path || child.name} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
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
        color: isSelected ? 'var(--ink)' : 'var(--ink-2)',
        background: isSelected ? 'var(--surface-raised)' : 'transparent',
        fontWeight: isSelected ? 500 : 400,
        borderRadius: 4, transition: 'all 100ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-raised)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <FileIcon name={node.name} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
    </div>
  );
}

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.05;

const hideScrollbarCSS = `
  .fv-scroll::-webkit-scrollbar { display: none; }
  .fv-scroll { scrollbar-width: none; -ms-overflow-style: none; }
`;

export function FolderViewer({ artifactId, artifactName, fileTree }: FolderViewerProps) {
  const tree = useMemo(() => buildTree(fileTree), [fileTree]);
  const defaultPath = useMemo(() => {
    const indexFile = fileTree.find(f => f.path === 'index.html' || f.path.endsWith('/index.html'));
    return indexFile?.path || fileTree[0]?.path || null;
  }, [fileTree]);
  const [selectedPath, setSelectedPath] = useState<string | null>(defaultPath);
  const [scale, setScale] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedFile = useMemo(() => fileTree.find(f => f.path === selectedPath), [fileTree, selectedPath]);

  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(ZOOM_MAX, Math.round((s + ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(ZOOM_MIN, Math.round((s - ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomReset = useCallback(() => setScale(1), []);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--surface)' }}>
      <style>{hideScrollbarCSS}</style>
      {/* Left: File tree */}
      {sidebarOpen && (
        <div className="fv-scroll" style={{
          width: 260, flexShrink: 0,
          borderRight: '1px solid var(--border-subtle)',
          overflow: 'auto', padding: '8px 0',
          background: 'var(--surface-raised)',
        }}>
          <div style={{
            padding: '6px 12px 10px', fontSize: 11, fontWeight: 600,
            color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{artifactName}</span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                width: 20, height: 20, border: 'none', borderRadius: 4,
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink-4)', transition: 'all 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--ink-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-4)'; }}
              title="隐藏侧栏"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>
          {tree.children.map(child => (
            <TreeItem key={child.path || child.name} node={child} depth={0} selectedPath={selectedPath} onSelect={setSelectedPath} />
          ))}
        </div>
      )}

      {/* Right: File preview */}
      <div className="fv-scroll" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedFile ? (
          <>
            <div style={{
              padding: '6px 16px', fontSize: 12, color: 'var(--ink-3)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--canvas)', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    width: 24, height: 24, border: '1px solid var(--border-subtle)', borderRadius: 5,
                    background: 'var(--surface)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ink-2)', transition: 'all 120ms', flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
                  title="显示侧栏"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                </button>
              )}
              <FileIcon name={selectedFile.path} />
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{selectedFile.path.split('/').pop()}</span>
              <span style={{ marginLeft: 'auto', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", fontSize: 11 }}>
                {selectedFile.size < 1024 ? `${selectedFile.size} B` : selectedFile.size < 1024 * 1024 ? `${(selectedFile.size / 1024).toFixed(1)} KB` : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`}
              </span>
              <ZoomControls scale={scale} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onZoomReset={handleZoomReset} />
            </div>
            <div className="fv-scroll" style={{ flex: 1, overflow: 'hidden' }}>
              <FilePreview artifactId={artifactId} filePath={selectedFile.path} mimeType={selectedFile.mimeType} scale={scale} />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>
            选择左侧文件进行预览
          </div>
        )}
      </div>
    </div>
  );
}
