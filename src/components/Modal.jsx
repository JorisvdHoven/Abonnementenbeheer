import { useEffect, useRef } from 'react';

const SIZE_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Herbruikbare modal-wrapper.
 * - Sluit met Escape (altijd actief).
 * - Sluit met klik op backdrop wanneer `closeOnBackdrop` true is (default false,
 *   om te voorkomen dat lange formulieren per ongeluk gesloten worden).
 * - `scrollable` zet max-h en overflow op de card (gebruik voor lange forms).
 * - Trapt focus binnen de modal en herstelt focus op de openende knop bij sluiten.
 *
 * Padding/spacing wordt door de caller bepaald via children.
 */
function Modal({ onClose, size = 'md', scrollable = false, closeOnBackdrop = false, ariaLabel, children }) {
  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    // Onthoud welk element focus had zodat we het kunnen herstellen
    previouslyFocused.current = document.activeElement;

    // Focus eerste focusable element in de modal
    const card = cardRef.current;
    if (card) {
      const first = card.querySelector(FOCUSABLE_SELECTOR);
      if (first) first.focus();
      else card.focus();
    }

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && card) {
        // Focus trap: cycle focus binnen de modal
        const focusable = Array.from(card.querySelectorAll(FOCUSABLE_SELECTOR))
          .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusable.length === 0) return;
        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      // Herstel focus op het element dat de modal opende
      if (previouslyFocused.current && previouslyFocused.current.focus) {
        previouslyFocused.current.focus();
      }
    };
  }, [onClose]);

  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`surface-card-strong w-full ${sizeClass} mx-4 ${scrollable ? 'max-h-[90vh] overflow-y-auto' : ''} focus:outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
