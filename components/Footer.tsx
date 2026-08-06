import { getFooter, getSiteSettings } from "@/lib/tina-content";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import SocialIcons from "./SocialIcons";

export default async function Footer({ locale }: { locale: Locale }) {
  const [footer, settings] = await Promise.all([getFooter(locale), getSiteSettings(locale)]);
  const dict = getDictionary(locale);

  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        {footer?.columns?.map(
          (col, i) =>
            col && (
              <div key={i}>
                <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {col.links?.map(
                    (link, j) =>
                      link && (
                        <li key={j}>
                          <a href={link.url || "#"} className="hover:text-foreground">
                            {link.label}
                          </a>
                        </li>
                      )
                  )}
                </ul>
              </div>
            )
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold">{dict.footer.contactHeading}</h3>
          <p className="text-sm text-muted-foreground">{footer?.contactInfo?.address}</p>
          <p className="text-sm text-muted-foreground">{footer?.contactInfo?.phone}</p>
          <p className="text-sm text-muted-foreground">{footer?.contactInfo?.email}</p>
          <div className="mt-4">
            <SocialIcons links={settings?.socialLinks} fallbackLabel={dict.social.fallbackLabel} />
          </div>
        </div>
      </div>

      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {settings?.title || dict.siteName}
      </div>
    </footer>
  );
}
