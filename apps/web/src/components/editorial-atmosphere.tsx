import { CursorGlow } from './cursor-glow';

/**
 * Atmosfera di pagina riusabile: 2 mesh-blob fluttuanti + cursor glow
 * opzionale. Va inserita come primo figlio di un `relative overflow-hidden`,
 * sotto al contenuto principale.
 */
export function EditorialAtmosphere({
  variant = 'default',
  withCursor = false,
}: {
  variant?: 'default' | 'pomodoro' | 'oliva' | 'oro';
  withCursor?: boolean;
}) {
  // Combinazione di blob per ogni variante.
  const blobs =
    variant === 'pomodoro'
      ? [
          {
            kind: 'pomodoro',
            pos: '-left-32 top-12',
            size: 'h-[28rem] w-[28rem]',
            anim: 'animate-float-x',
          },
          { kind: 'oro', pos: '-right-24 top-64', size: 'h-80 w-80', anim: 'animate-float-y' },
        ]
      : variant === 'oliva'
        ? [
            {
              kind: 'oliva',
              pos: '-right-32 top-12',
              size: 'h-[28rem] w-[28rem]',
              anim: 'animate-float-y',
            },
            {
              kind: 'pomodoro',
              pos: '-left-24 top-64',
              size: 'h-72 w-72',
              anim: 'animate-float-x',
            },
          ]
        : variant === 'oro'
          ? [
              {
                kind: 'oro',
                pos: 'right-1/4 top-12',
                size: 'h-[24rem] w-[24rem]',
                anim: 'animate-float-z',
              },
              {
                kind: 'oliva',
                pos: '-left-24 bottom-12',
                size: 'h-72 w-72',
                anim: 'animate-float-y',
              },
            ]
          : [
              {
                kind: 'oliva',
                pos: '-right-32 top-12',
                size: 'h-80 w-80',
                anim: 'animate-float-y',
              },
              {
                kind: 'pomodoro',
                pos: '-left-24 top-64',
                size: 'h-72 w-72',
                anim: 'animate-float-x',
              },
            ];

  const cursorColor =
    variant === 'pomodoro'
      ? 'hsl(var(--pomodoro))'
      : variant === 'oro'
        ? 'hsl(var(--oro))'
        : 'hsl(var(--oliva))';

  return (
    <>
      {withCursor ? <CursorGlow color={cursorColor} size={520} /> : null}
      {blobs.map((b, i) => (
        <div
          key={i}
          aria-hidden
          className={`mesh-blob mesh-blob--${b.kind} ${b.anim} ${b.pos} ${b.size} opacity-40`}
        />
      ))}
    </>
  );
}
