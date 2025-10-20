import React from "react";

interface Size {
  width: number;
  height: number;
}

interface DOMOverlaysProps {
  annotations: any[];
  visibleAnnotations: Set<string>;
  sheet: { file_name?: string; page_number?: number; ai_processing_width?: number; ai_processing_height?: number } | null;
  canvasSize: Size;
  imgNaturalSize: Size | null;
  aiProcessingSize: Size | null;
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
  aiProcessingSize,
}) => {
  const isPDF = sheet?.file_name?.toLowerCase().endsWith('.pdf');
  const pageNum = sheet?.page_number || 1;
  
  // Use AI processing dimensions if available, otherwise fall back to natural dimensions
  const referenceW = aiProcessingSize?.width ?? imgNaturalSize?.width ?? null;
  const referenceH = aiProcessingSize?.height ?? imgNaturalSize?.height ?? null;
  
  const canvasW = canvasSize.width;
  const canvasH = canvasSize.height;

  // Compute display scale from reference dimensions (AI processing or natural)
  const displayScaleX = referenceW ? canvasW / referenceW : 1;
  const displayScaleY = referenceH ? canvasH / referenceH : 1;

  console.log('DOMOverlays scaling:', {
    aiProcessing: aiProcessingSize,
    imgNatural: imgNaturalSize,
    reference: { width: referenceW, height: referenceH },
    canvas: { width: canvasW, height: canvasH },
    scale: { x: displayScaleX, y: displayScaleY }
  });

  // Page offset for multi-page PDFs
  const pageOffsetY = isPDF && referenceH ? (pageNum - 1) * referenceH : 0;
  const tol = referenceH ? Math.max(2, referenceH * 0.005) : 2;
  const fixY = (y: number) => {
    if (!isPDF || !referenceH || pageNum <= 1) return y;
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

  // Decide scaling - if AI processing dimensions are available, always use them
  let scaleX = 1;
  let scaleY = 1;
  let useDisplayScale = false;
  
  if (aiProcessingSize) {
    // AI processing dimensions are the source of truth - use them directly
    useDisplayScale = true;
    scaleX = Math.max(0.01, displayScaleX);
    scaleY = Math.max(0.01, displayScaleY);
    console.log('Using AI processing dimensions for scaling');
  } else if (!isPDF && referenceW && referenceH) {
    useDisplayScale = true;
    scaleX = Math.max(0.01, displayScaleX);
    scaleY = Math.max(0.01, displayScaleY);
  } else if (referenceW && referenceH && globalMaxX > 0 && globalMaxY > 0) {
    const tolerance = 1.2;
    if (globalMaxX <= referenceW * tolerance && globalMaxY <= referenceH * tolerance) {
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

  const filtered = annotations.filter((a) => visibleAnnotations.has(a.takeoff_item_id || ''));

  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 500 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="none" className="absolute inset-0">
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
                </g>
              );
            }

            if (annotation.annotation_type === 'polygon') {
              const points = (shape.points || []).map((p: any) => `${(p.x || 0) * scaleX},${fixY(p.y || 0) * scaleY}`).join(' ');
              return (
                <g key={annotation.id}>
                  <polygon points={points} fill="transparent" stroke={color} strokeWidth={strokeWidth} />
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
