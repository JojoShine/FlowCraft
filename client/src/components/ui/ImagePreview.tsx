import { useState, type CSSProperties } from 'react';
import { artifactsApi } from '../../services/api';

interface ImagePreviewProps {
  artifactId: string;
  alt?: string;
  style?: CSSProperties;
  width?: number | string;
  height?: number | string;
}

export function ImagePreview({
  artifactId,
  alt = '',
  style,
  width,
  height,
}: ImagePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const src = artifactsApi.getFileUrl(artifactId);

  if (error) {
    return (
      <div style={{
        width: width || 100,
        height: height || 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-raised)',
        borderRadius: 8,
        color: 'var(--ink-3)',
        fontSize: 11,
        ...style,
      }}>
        加载失败
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: width,
      height: height,
      ...style,
    }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-raised)',
          borderRadius: 8,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 8,
          display: 'block',
          opacity: loading ? 0 : 1,
          transition: 'opacity 200ms',
        }}
      />
    </div>
  );
}
