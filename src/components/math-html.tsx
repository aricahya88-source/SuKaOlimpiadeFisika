'use client';

import katex from 'katex';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';

const DISPLAY_PLACEHOLDER_PREFIX = '%%SAINS_MASEMBA_KATEX_BLOCK_';
const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong',
  'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'form', 'svg']);
const GLOBAL_ATTRIBUTES = new Set(['class', 'title']);
const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  col: new Set(['span']),
};

function normalizeGoogleDriveImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed, window.location.origin);
    const host = url.hostname.toLowerCase();
    if (host === 'drive.google.com' || host === 'drive.usercontent.google.com') {
      let fileId = url.searchParams.get('id') || '';
      if (!fileId) {
        const match = url.pathname.match(/\/file\/d\/([^/]+)/i);
        fileId = match?.[1] || '';
      }
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`;
      }
    }
  } catch {}

  return trimmed;
}

function safeUrl(value: string, type: 'href' | 'src') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  if (type === 'src' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmed)) return trimmed;
  const normalized = type === 'src' ? normalizeGoogleDriveImageUrl(trimmed) : trimmed;
  try {
    const url = new URL(normalized, window.location.origin);
    if (type === 'href' && ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return normalized;
    if (type === 'src' && ['http:', 'https:'].includes(url.protocol)) return normalized;
  } catch {}
  return '';
}

export function sanitizeStoredHtml(source: string) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const documentNode = new DOMParser().parseFromString(`<body>${String(source || '')}</body>`, 'text/html');
  const elements = Array.from(documentNode.body.querySelectorAll('*'));

  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      if (DROP_WITH_CONTENT.has(tag)) element.remove();
      else element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const allowed = GLOBAL_ATTRIBUTES.has(name) || TAG_ATTRIBUTES[tag]?.has(name);
      if (!allowed || name.startsWith('on') || name === 'style' || name === 'srcset') {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === 'href' || name === 'src') {
        const cleaned = safeUrl(attribute.value, name);
        if (cleaned) element.setAttribute(name, cleaned);
        else element.removeAttribute(name);
      }
    }

    if (tag === 'a' && element.getAttribute('target') === '_blank') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
    if (tag === 'img') {
      element.setAttribute('loading', 'lazy');
      element.removeAttribute('class');
    }
  }

  const walker = documentNode.createTreeWalker(documentNode.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  let comment = walker.nextNode();
  while (comment) {
    comments.push(comment);
    comment = walker.nextNode();
  }
  for (const item of comments) item.parentNode?.removeChild(item);
  return documentNode.body.innerHTML;
}

function decodeHtmlEntities(value: string) {
  return String(value || '')
    .replace(/&amp;(le|ge|ne|times|middot|plusmn|radic|infin|deg);/gi, '&$1;')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&lt;|&#60;/gi, '<')
    .replace(/&gt;|&#62;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&le;|&#8804;/gi, '≤')
    .replace(/&ge;|&#8805;/gi, '≥')
    .replace(/&ne;|&#8800;/gi, '≠')
    .replace(/&times;|&#215;/gi, '×')
    .replace(/&middot;|&#183;/gi, '·')
    .replace(/&plusmn;|&#177;/gi, '±')
    .replace(/&radic;|&#8730;/gi, '√')
    .replace(/&infin;|&#8734;/gi, '∞')
    .replace(/&deg;|&#176;/gi, '°')
    .replace(/&amp;|&#38;/gi, '&');
}

function normalizeExpression(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr)>/gi, '\n')
    .replace(/<(?:p|div|li|tr)(?:\s[^>]*)?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function renderExpression(expression: string, displayMode: boolean) {
  const normalized = normalizeExpression(expression);
  if (!normalized) return '';

  try {
    return katex.renderToString(normalized, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'htmlAndMathml',
    });
  } catch {
    const delimiter = displayMode ? ['\\[', '\\]'] : ['\\(', '\\)'];
    const escaped = normalized.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
    return `<code>${delimiter[0]}${escaped}${delimiter[1]}</code>`;
  }
}

function looksLikeDollarMath(expression: string) {
  const normalized = normalizeExpression(expression);
  if (!normalized) return false;
  if (/\s/.test(normalized) && !/[\\^_={}<>+\-*/=]/.test(normalized)) return false;
  return true;
}

function protectDisplayMath(source: string, renderedBlocks: string[]) {
  const store = (expression: string) => {
    const index = renderedBlocks.push(renderExpression(expression, true)) - 1;
    return `${DISPLAY_PLACEHOLDER_PREFIX}${index}%%`;
  };

  return source
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expression) => store(String(expression)))
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expression) => store(String(expression)));
}

function renderInlineMathInText(text: string) {
  const withParentheses = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expression) =>
    renderExpression(String(expression), false),
  );

  return withParentheses.replace(/(^|[^\\])\$(?!\$)([^$]+?)\$/g, (match, prefix, expression) => {
    if (!looksLikeDollarMath(String(expression))) return match;
    return `${prefix}${renderExpression(String(expression), false)}`;
  });
}

function normalizePlainTextLineBreaks(source: string) {
  const value = String(source || '');
  const hasBlockMarkup = /<(?:p|div|br|ul|ol|li|table|blockquote|h[1-6])\b/i.test(value);
  return hasBlockMarkup ? value : value.replace(/\r\n?|\n/g, '<br>');
}

export function renderMathHtml(html: string) {
  const sanitized = sanitizeStoredHtml(normalizePlainTextLineBreaks(String(html || '')));
  const renderedBlocks: string[] = [];
  const protectedHtml = protectDisplayMath(sanitized, renderedBlocks);
  const renderedInline = protectedHtml
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith('<') ? part : renderInlineMathInText(part)))
    .join('');

  return renderedInline.replace(
    new RegExp(`${DISPLAY_PLACEHOLDER_PREFIX}(\\d+)%%`, 'g'),
    (_, index) => renderedBlocks[Number(index)] || '',
  );
}

type LightboxState = { src: string; alt: string } | null;

function ImageLightbox({ image, onClose }: { image: NonNullable<LightboxState>; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(4, Number((value + .25).toFixed(2))));
      if (event.key === '-') setZoom((value) => Math.max(1, Number((value - .25).toFixed(2))));
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const setSafeZoom = (next: number) => {
    const value = Math.min(4, Math.max(1, Number(next.toFixed(2))));
    setZoom(value);
    if (value === 1) setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (zoom <= 1) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setPan({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    dragRef.current = null;
    setDragging(false);
  };

  const dialog = <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Pratinjau gambar soal" onClick={onClose}>
    <div className="image-lightbox-toolbar" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => setSafeZoom(zoom - .25)} disabled={zoom <= 1} aria-label="Perkecil gambar" title="Zoom out"><Minus size={19}/></button>
      <button type="button" onClick={() => { setSafeZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Kembalikan ukuran gambar" title="Ukuran awal"><RotateCcw size={18}/></button>
      <button type="button" onClick={() => setSafeZoom(zoom + .25)} disabled={zoom >= 4} aria-label="Perbesar gambar" title="Zoom in"><Plus size={19}/></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" className="close" onClick={onClose} aria-label="Tutup gambar" title="Tutup"><X size={21}/></button>
    </div>
    <div className={`image-lightbox-stage${zoom > 1 ? ' pannable' : ''}${dragging ? ' dragging' : ''}`} onClick={(event) => event.stopPropagation()}>
      <img
        src={image.src}
        alt={image.alt}
        draggable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => zoom > 1 ? setSafeZoom(1) : setSafeZoom(2)}
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
      />
      {zoom > 1 && <div className="image-lightbox-hint">Geser gambar untuk melihat bagian lain</div>}
    </div>
  </div>;

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : null;
}

export function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  return <>
    <button type="button" className="zoomable-image-button" onClick={() => setLightbox({ src, alt })} aria-label={`${alt}. Klik untuk memperbesar`}>
      <img className={className} src={src} alt={alt} draggable={false}/>
    </button>
    {lightbox && <ImageLightbox image={lightbox} onClose={() => setLightbox(null)}/>} 
  </>;
}

export function MathHtml({ html, className, imageZoom = false }: { html: string; className?: string; imageZoom?: boolean }) {
  const [rendered, setRendered] = useState('');
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  useEffect(() => {
    setRendered(renderMathHtml(html || ''));
  }, [html]);

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!imageZoom) return;
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    event.preventDefault();
    setLightbox({ src: target.currentSrc || target.src, alt: target.alt || 'Gambar soal' });
  };

  return <>
    <div
      className={`${className || ''}${imageZoom ? ' image-zoom-enabled' : ''}`.trim()}
      style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden' }}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
    {lightbox && <ImageLightbox image={lightbox} onClose={() => setLightbox(null)}/>} 
  </>;
}

export function toSpeechText(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$|\$/g, ' ')
    .replace(/\\\[|\\\]|\\\(|\\\)/g, ' ')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 per $2')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'akar dari $1')
    .replace(/\\times|\\cdot/g, ' kali ')
    .replace(/\\div/g, ' bagi ')
    .replace(/\\pi/g, ' pi ')
    .replace(/\\Delta/g, ' delta ')
    .replace(/\\leq?|≤/g, ' kurang dari atau sama dengan ')
    .replace(/\\geq?|≥/g, ' lebih dari atau sama dengan ')
    .replace(/\^2/g, ' kuadrat')
    .replace(/\^3/g, ' pangkat tiga')
    .replace(/=/g, ' sama dengan ')
    .replace(/\+/g, ' ditambah ')
    .replace(/-/g, ' dikurangi ')
    .replace(/\s+/g, ' ')
    .trim();
}
