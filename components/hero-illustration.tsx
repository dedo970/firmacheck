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
      <div className="w-full flex flex-col gap-px border border-[var(--border)] rounded-xl overflow-hidden">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-4 px-4 py-3.5 bg-[var(--background)] hover:bg-[var(--surface)] transition-colors"
          >
            <div className="mt-0.5 h-5 w-5 rounded-md border border-[var(--border)] flex items-center justify-center shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]/50" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{f.label}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
