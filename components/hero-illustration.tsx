import Image from 'next/image';

const FEATURES = [
  {
    label: 'Název a právní status',
    detail: 'Aktivní · V likvidaci · Zaniklý · V insolvenci',
  },
  {
    label: 'Adresa sídla s mapou',
    detail: 'Geokódování přes Nominatim, zobrazení v OpenStreetMap',
  },
  {
    label: 'IČO · DIČ · Datum vzniku',
    detail: 'Přímé napojení na rejstřík ARES, cache 7 dní',
  },
];

export function HeroIllustration() {
  return (
    <div className="flex flex-col items-center gap-5">
      <Image
        src="/hero.svg"
        alt="Ilustrace ověřování firmy"
        width={200}
        height={150}
        priority
        className="opacity-90 dark:opacity-70"
      />
      <div className="flex w-full flex-col gap-px overflow-hidden rounded-xl border border-[var(--border)]">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-4 bg-[var(--background)] px-4 py-3.5 transition-colors hover:bg-[var(--surface)]"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--border)]">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]/50" />
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-snug font-medium">{f.label}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
