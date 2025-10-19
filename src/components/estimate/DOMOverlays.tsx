import React from "react";

interface Size {
  width: number;
  height: number;
}

interface DOMOverlaysProps {
  annotations: any[];
  visibleAnnotations: Set<string>;
  sheet: { file_name?: string; page_number?: number } | null;
  canvasSize: Size;
  imgNaturalSize: Size | null;
  forceShow: boolean;
  addProbes: boolean;
}

// Helper
const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const DOMOverlays: React.FC<DOMOverlaysProps> = ({
  annotations,
  visibleAnnotations,
  sheet,
  canvasSize,
  imgNaturalSize,
  forceShow,
  addProbes,
}) => {
  const isPDF = sheet?.file_name?.toLowerCase().endsWith('.pdf');
  const pageNum = sheet?.page_number || 1;
  const originalW = imgNaturalSize?.width ?? null;
  const originalH = imgNaturalSize?.height ?? null;
  const canvasW = canvasSize.width;
  const canvasH = canvasSize.height;

  // Compute display scale
  const displayScaleX = originalW ? canvasW / originalW : 1;
  const displayScaleY = originalH ? canvasH / originalH : 1;

  // Page offset for multi-page PDFs
  const pageOffsetY = isPDF && originalH ? (pageNum - 1) * originalH : 0;
  const tol = originalH ? Math.max(2, originalH * 0.005) : 2;
  const fixY = (y: number) => {
    if (!isPDF || !originalH || pageNum <= 1) return y;
    if (y >= pageOffsetY - tol) return y - pageOffsetY;
    return y;
  };

  // Pre-scan to decide scaling when needed
  let globalMaxX = 0;
  let globalMaxY = 0;
  let outOfBoundsCount = 0;

  annotations.forEach((annotation) => {
    try {
      const shape = typeof annotation.geometry === 'string' ? JSON.parse(annotation.geometry) : annotation.geometry;
      let maxX = 0;
      let maxY = 0;
      switch (annotation.annotation_type) {
        case 'rectangle':
          maxX = (shape.left || 0) + (shape.width || 0);
          maxY = fixY(shape.top || 0) + (shape.height || 0);
          break;
        case 'circle':
          maxX = (shape.left || 0) + (shape.radius || 0) * 2;
          maxY = fixY(shape.top || 0) + (shape.radius || 0) * 2;
          break;
        case 'line':
          maxX = Math.max(shape.x1 || 0, shape.x2 || 0);
          maxY = Math.max(fixY(shape.y1 || 0), fixY(shape.y2 || 0));
          break;
        case 'polygon':
          if (shape.points && Array.isArray(shape.points)) {
            maxX = Math.max(...shape.points.map((p: any) => p.x || 0));
            maxY = Math.max(...shape.points.map((p: any) => fixY(p.y || 0)));
          }
          break;
      }
      if (maxX > 0 || maxY > 0) {
        globalMaxX = Math.max(globalMaxX, maxX);
        globalMaxY = Math.max(globalMaxY, maxY);
        if (maxX > canvasW * 1.1 || maxY > canvasH * 1.1) outOfBoundsCount++;
      }
    } catch (e) {
      console.error('DOMOverlays scan error:', e);
    }
  });

  // Decide scaling
  let scaleX = 1;
  let scaleY = 1;
  let useDisplayScale = false;
  if (!isPDF && originalW && originalH) {
    useDisplayScale = true;
    scaleX = Math.max(0.01, displayScaleX);
    scaleY = Math.max(0.01, displayScaleY);
  } else if (originalW && originalH && globalMaxX > 0 && globalMaxY > 0) {
    const tolerance = 1.2;
    if (globalMaxX <= originalW * tolerance && globalMaxY <= originalH * tolerance) {
      useDisplayScale = true;
      scaleX = Math.max(0.01, displayScaleX);
      scaleY = Math.max(0.01, displayScaleY);
    }
  }
  if (!useDisplayScale && outOfBoundsCount > 0) {
    scaleX = globalMaxX > canvasW ? canvasW / globalMaxX : 1;
    scaleY = globalMaxY > canvasH ? canvasH / globalMaxY : 1;
    scaleX = Math.min(1, Math.max(0.01, scaleX));
    scaleY = Math.min(1, Math.max(0.01, scaleY));
  }

  const avgScale = (scaleX + scaleY) / 2;

  const filtered = annotations.filter((a) => forceShow || visibleAnnotations.size === 0 || visibleAnnotations.has(a.takeoff_item_id || ''));

  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 250 }}>
      <svg width={canvasW} height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`} className="absolute inset-0">
        {filtered.map((annotation) => {
          try {
            const shape = typeof annotation.geometry === 'string' ? JSON.parse(annotation.geometry) : annotation.geometry;
            const color = annotation.color || '#00BCD4';
            const strokeWidth = Math.max(2, (shape.strokeWidth || 2) * avgScale);

            if (annotation.annotation_type === 'rectangle') {
              const left = (shape.left || 0) * scaleX;
              const top = fixY(shape.top || 0) * scaleY;
              const width = (shape.width || 0) * scaleX;
              const height = (shape.height || 0) * scaleY;
              return (
                <g key={annotation.id}>
                  <rect x={left} y={top} width={width} height={height} fill={hexToRgba(color, 0.2)} stroke={color} strokeWidth={strokeWidth} />
                  {annotation.label && (
                    <text x={left + 6} y={top + 16} fontSize={12} fill="#111" style={{ fontFamily: 'Inter, sans-serif' }}>{annotation.label}</text>
                  )}
                  {addProbes && (
                    <rect x={left - 4} y={top - 4} width={8} height={8} fill="red" />
                  )}
                </g>
              );
            }

            if (annotation.annotation_type === 'circle') {
              const cx = (shape.left || 0) * scaleX;
              const cy = fixY(shape.top || 0) * scaleY;
              const r = (shape.radius || 0) * avgScale;
              return (
                <g key={annotation.id}>
                  <circle cx={cx} cy={cy} r={r} fill={hexToRgba(color, 0.6)} stroke={color} strokeWidth={strokeWidth} />
                  {addProbes && (<rect x={cx - 4} y={cy - 4} width={8} height={8} fill="red" />)}
                </g>
              );
            }

            if (annotation.annotation_type === 'line') {
              const x1 = (shape.x1 || 0) * scaleX;
              const y1 = fixY(shape.y1 || 0) * scaleY;
              const x2 = (shape.x2 || 0) * scaleX;
              const y2 = fixY(shape.y2 || 0) * scaleY;
              return (
                <g key={annotation.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={strokeWidth} />
                  {addProbes && (<rect x={x1 - 4} y={y1 - 4} width={8} height={8} fill="red" />)}
                </g>
              );
            }

            if (annotation.annotation_type === 'polygon') {
              const points = (shape.points || []).map((p: any) => `${(p.x || 0) * scaleX},${fixY(p.y || 0) * scaleY}`).join(' ');
              const first = (shape.points && shape.points[0]) ? {
                x: (shape.points[0].x || 0) * scaleX,
                y: fixY(shape.points[0].y || 0) * scaleY,
              } : null;
              return (
                <g key={annotation.id}>
                  <polygon points={points} fill="transparent" stroke={color} strokeWidth={strokeWidth} />
                  {annotation.label && first && (
                    <text x={first.x + 6} y={first.y + 16} fontSize={12} fill="#111" style={{ fontFamily: 'Inter, sans-serif' }}>{annotation.label}</text>
                  )}
                  {addProbes && first && (<rect x={first.x - 4} y={first.y - 4} width={8} height={8} fill="red" />)}
                </g>
              );
            }

            return null;
          } catch (e) {
            console.error('DOMOverlays render error:', e);
            return null;
          }
        })}
      </svg>
    </div>
  );
};
