// Root fallback for the paths middleware.ts's matcher deliberately excludes
// (_next, api, admin, favicon.ico, dotted files) — those never get an
// x-locale header, so app/[locale]/not-found.tsx's CMS-driven 404 can't run
// for them. Same reasoning as app/global-error.tsx: no locale context is
// available at this boundary, so both languages are shown rather than
// guessing one.
export default function RootNotFound() {
  return (
    <div style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>Page not found / Không tìm thấy trang / 页面未找到</h1>
      <a href="/">Back to home / Về trang chủ / 返回首页</a>
    </div>
  );
}
