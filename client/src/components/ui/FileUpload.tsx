import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export function FileUpload({
  onUpload,
  accept,
  multiple = false,
  label,
  hint = '点击上传或拖拽文件到此处',
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = multiple ? files[0] : files[0];
      await handleFile(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setFileName(file.name);
    try {
      await onUpload(file);
    } catch (error) {
      console.error('[FileUpload] Upload failed:', error);
      setFileName(null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--ink-2)',
          letterSpacing: '-0.01em',
        }}>
          {label}
        </label>
      )}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${isDragging ? 'var(--ink)' : 'var(--border-default)'}`,
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          transition: 'all 150ms',
          color: 'var(--ink-3)',
          background: isDragging ? 'var(--canvas)' : 'transparent',
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!disabled && !uploading) {
            e.currentTarget.style.borderColor = 'var(--ink-3)';
            e.currentTarget.style.color = 'var(--ink-2)';
            e.currentTarget.style.background = 'var(--canvas)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.color = 'var(--ink-3)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled || uploading}
        />
        {uploading ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span style={{ fontSize: 12 }}>上传中...</span>
          </>
        ) : fileName ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: 'var(--ink)' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--ink)' }}>{fileName}</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ fontSize: 12 }}>{hint}</span>
            {accept && (
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>支持格式: {accept}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
