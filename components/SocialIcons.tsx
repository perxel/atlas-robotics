type SocialLink = {
  platform?: string | null;
  url?: string | null;
  icon?: string | null;
} | null;

export default function SocialIcons({
  links,
  fallbackLabel = "Social link",
}: {
  links?: SocialLink[] | null;
  fallbackLabel?: string;
}) {
  const items = (links || []).filter(
    (link): link is NonNullable<SocialLink> => !!link && !!link.url
  );

  if (!items.length) return null;

  return (
    <ul className="flex gap-3">
      {items.map((link, i) => (
        <li key={i}>
          <a
            href={link.url!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.platform || link.icon || fallbackLabel}
            title={link.platform || link.icon || undefined}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent hover:bg-accent hover:text-accent-foreground"
          >
            {(link.icon || link.platform || "?").slice(0, 2)}
          </a>
        </li>
      ))}
    </ul>
  );
}
