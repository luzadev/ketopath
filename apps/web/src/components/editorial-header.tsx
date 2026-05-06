/**
 * Header tipografico riusabile in stile "asimmetrico off-grid".
 * Chapter marker gigante (numero romano) come art di sfondo,
 * eyebrow defilata, titolo che può sbordare dal bordo sinistro,
 * sottotitolo indentato in colonna stretta.
 *
 * Va wrappato in un padre `relative overflow-hidden` (la pagina lo è
 * già di norma). Il chapter marker è in stroke trasparente, decorativo.
 */
export function EditorialHeader({
  chapter,
  eyebrow,
  title,
  accent,
  subtitle,
  rightSlot,
}: {
  /** Numero romano grande (es. "II", "IV", "VII") usato come art di sfondo. */
  chapter: string;
  /** Eyebrow in alto. */
  eyebrow: string;
  /** Titolo principale. */
  title: string;
  /** Parola/parole da evidenziare in gradient italico (sostituisce nel titolo). */
  accent?: string;
  /** Sottotitolo italic, indentato. */
  subtitle?: string;
  /** Slot opzionale a destra del titolo (es. CTA "rigenera", date pickers). */
  rightSlot?: React.ReactNode;
}) {
  let titleNode: React.ReactNode = title;
  if (accent) {
    const idx = title.toLowerCase().indexOf(accent.toLowerCase());
    if (idx >= 0) {
      titleNode = (
        <>
          {title.slice(0, idx)}
          <span className="text-gradient italic">{title.slice(idx, idx + accent.length)}</span>
          {title.slice(idx + accent.length)}
        </>
      );
    }
  }

  return (
    <header className="relative pb-6 pt-10 sm:pt-16">
      {/* Chapter marker decorativo */}
      <span
        aria-hidden
        className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-2 -top-4 select-none italic sm:-top-12"
      >
        {chapter}
      </span>

      <div className="relative grid grid-cols-12 items-end gap-6">
        <div className="col-span-12 md:col-span-9">
          <p className="editorial-eyebrow animate-fade-up">{eyebrow}</p>
          <h1 className="font-display text-display text-ink animate-fade-up mt-4 font-medium leading-[0.95] tracking-tight [animation-delay:120ms]">
            {titleNode}
            <span className="text-pomodoro">.</span>
          </h1>
          {subtitle ? (
            <p className="font-display text-ink-soft animate-fade-up mt-5 max-w-2xl text-xl italic leading-snug [animation-delay:240ms]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {rightSlot ? (
          <div className="animate-fade-up col-span-12 [animation-delay:360ms] md:col-span-3 md:flex md:justify-end">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </header>
  );
}
