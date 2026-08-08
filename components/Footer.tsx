import { type Locale, CMSDictionary, getFooter, getSiteSettings } from "@/lib/cms-server";
import { translateText } from "@/cms/multilingual";
import SocialIcons from "./SocialIcons";

export default async function Footer({ locale }: { locale: Locale }) {
  const [footer, settings, uiDictionary] = await Promise.all([
    getFooter(locale),
    getSiteSettings(locale),
    CMSDictionary.loadMap(locale),
  ]);
  const t = (text: string) => translateText(uiDictionary, text);

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
          <h3 className="mb-3 text-sm font-semibold">{t("Contact")}</h3>
          <p className="text-sm text-muted-foreground">{footer?.contactInfo?.address}</p>
          <p className="text-sm text-muted-foreground">{footer?.contactInfo?.phone}</p>
          <p className="text-sm text-muted-foreground">{footer?.contactInfo?.email}</p>
          <div className="mt-4">
            <SocialIcons links={settings?.socialLinks} fallbackLabel={t("Social link")} />
          </div>
        </div>
      </div>

      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {settings?.title || t("Lorem ipsum")}
      </div>
    </footer>
  );
}
