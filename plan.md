You are setting up a proof of concept demo to validate a technology stack for future client website projects. This is a reusable internal demo, not tied to any specific client. Do not reference any client name anywhere in code, comments, content, or file names. Use generic placeholder content throughout.

DESIGN NOTE: This is a functional proof of concept, not a polished build. Use plain Tailwind defaults, minimal styling, no custom design system, no animation beyond what's functionally required (e.g. swipe/arrow behavior). Speed and working functionality matter far more than visual quality.

TESTING NOTE: Do not use browser automation, screenshots, or any live interaction testing (no Claude in Chrome, no Playwright, no manual click-through). Verification is limited to: the dev server starting without errors, and a production build completing without errors or type errors. Do not attempt to visually verify UI behavior.

STACK
Next.js (App Router, TypeScript, Tailwind CSS)
TinaCMS with repo based media (not an external media provider)
Two locales: en and vi

GOAL
Prove out the following before committing to this stack for real client work:
1. Two language routing, content editing, and SEO (hreflang, canonical, per page metadata)
2. A global site settings singleton (title, logo, favicon, default SEO, social links)
3. Global nav and footer as structured, editable content, consuming site settings for socials
4. A tabbed viewer component driven by structured CMS content, with swipe and arrow navigation, plus a text based accessible alternative
5. A card based interactive component with click or swipe between records
6. A blog with listing and detail pages
7. A generic third party booking widget embed with fallback link and click tracking
8. A contact page with a form defined as structured content (no need to actually send anywhere, log to console/server is fine)
9. PDF upload through Tina's media manager

Work through every phase below in order, start to finish, without stopping for review between phases. Only stop if a phase fails outright and you cannot proceed. Summarize all phases together at the end.

PHASE 1: Scaffold
Create a new Next.js App Router project with TypeScript and Tailwind. Confirm the dev server starts without errors.

PHASE 2: TinaCMS setup
Install TinaCMS. Configure repo based media (media.tina in tina/config.ts, publicFolder "public", a mediaRoot folder). Confirm the local Tina admin and GraphQL server boot without errors.

PHASE 3: i18n and SEO
Set up Next.js App Router locale routing for en and vi using directory based routing ([locale] segment). Structure Tina content collections using directory based localization per Tina's internationalization guide. Add a language switcher. Add a reusable SEO object (meta title, meta description, og image) to every content collection built in later phases. Implement hreflang and canonical tags in the root layout based on locale and current path.

PHASE 4: Site settings singleton
Create a Tina Single Document Collection named "site-settings" (not a list, one document per locale) with: site title, logo image, favicon image, default SEO object (fallback meta title/description/og image), and a list of social links (platform name, URL, icon identifier). This becomes the single source of truth for phase 5's nav/footer.

PHASE 5: Global nav and footer
Create a Tina collection or global document for site wide navigation links and footer content (columns of links, contact info fields). Build a sticky header component and footer component. Both should pull social icons/links from site-settings rather than duplicating them.

PHASE 6: Tabbed viewer collection and component
Create a Tina collection named "catalog" with four to six tabs (placeholder names like "Category A", "Category B"). Each tab needs: name, intro copy, an ordered list of image pages (separate desktop and mobile image fields, each with alt text), active or inactive status, effective date.

Build the viewer UI:
Desktop arrow navigation, mobile swipe navigation
Page indicator
Deep linking to a specific tab via URL
Tab switch always resets to page one
Active tab state styling
A toggleable or separately routed plain text version of the same content for accessibility and indexability, sourced from the same Tina fields rather than duplicated content

PHASE 7: Card component
Create a Tina collection named "story-cards" with primary image, secondary image, title, subtitle, a short list of name/value attributes, and body copy. Build a UI where users click or swipe between records, with active state.

PHASE 8: Blog
Create a Tina collection named "blog" with title, slug, cover image (with alt text), author, publish date, excerpt, and rich text body, plus the SEO object from phase 3. Build listing and detail pages. Add one sample post per locale.

PHASE 9: Booking widget integration
Add a generic placeholder booking widget embed (an iframe or script placeholder standing in for a real third party booking provider) on a "Book" CTA. Implement: a fallback text link shown if the widget fails to load, a GA4/GTM style tracking event fired on booking CTA clicks (a stubbed dataLayer.push is fine, no real GTM account needed), and lazy loading so it doesn't block page render.

PHASE 10: Contact page and form
Create a Tina collection named "contact-form-config" where each document defines a form field (label, field type such as text/email/textarea, required boolean, sort order). Build a standalone /contact page rendering the form from this collection's data rather than hardcoded fields, plus a Next.js API route that logs submissions server side. No actual email sending or destination link needed.

PHASE 11: PDF upload test
Add an image type field to any collection (Tina's image field type accepts non image files including PDF by default through repo based media). Confirm the field is wired up correctly in code (no live upload testing needed).

PHASE 12: Verify and report
Run a production build (npm run build or equivalent). Fix any build errors or type errors until the build completes cleanly. Report a summary of all phases: what was built, any features that required Tina Cloud specifically versus working fully offline in local dev mode, and any rough edges that would matter for a real client build.

Do not add authentication or deployment configuration. Do not add an events or gallery collection. Do not use any browser automation or visual testing tools. Run all twelve phases to completion in one continuous session.