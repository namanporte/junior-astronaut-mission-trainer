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
        className="inline-block border-b-2 border-dotted border-sky-500 text-sky-700 hover:text-sky-900 hover:scale-[1.03] font-bold cursor-help transition-all duration-150 focus-visible:outline-2 focus-visible:outline-sky-500 rounded-xs"
        aria-expanded={open}
      >
        {children ?? term}
      </button>

      {open && (
        <span
          role="tooltip"
          className="animate-modal-pop absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 rounded-2xl bg-slate-900 border-2 border-sky-400 shadow-xl px-3.5 py-2.5 text-left pointer-events-none"
        >
          <span className="block text-xs font-extrabold text-sky-300 mb-0.5">{term}</span>
          <span className="block text-xs text-white leading-snug font-medium">
            {definition}
          </span>
        </span>
      )}
    </span>
  );
}
