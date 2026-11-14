import { useEffect, useRef, useState } from 'react';
import { GLOSSARY_TERMS, GlossaryTermKey } from '../data/scienceData';

interface GlossaryTermProps {
  term: GlossaryTermKey;
  children?: React.ReactNode;
}

export function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (
        e instanceof MouseEvent &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleOutside);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleOutside);
    };
  }, [open]);

  const definition = GLOSSARY_TERMS[term];

  return (
    <span
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="border-b-2 border-dotted border-cyan-400 text-cyan-200 hover:text-cyan-100 font-semibold cursor-help focus-visible:outline-2 focus-visible:outline-cyan-300 rounded-xs"
        aria-expanded={open}
      >
        {children ?? term}
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 rounded-xl bg-[#0A1328] border border-cyan-400/70 shadow-[0_8px_28px_rgba(0,0,0,0.65)] px-3 py-2 text-left pointer-events-none"
        >
          <span className="block text-[11px] font-bold text-cyan-300 mb-0.5">{term}</span>
          <span className="block text-xs text-slate-100 leading-snug font-normal">
            {definition}
          </span>
        </span>
      )}
    </span>
  );
}
