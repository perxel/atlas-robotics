"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        {/* No locale is available at this boundary (it replaces the root layout
            entirely), so both languages are shown rather than guessing one. */}
        <div style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <h1>Something went wrong / Đã xảy ra lỗi</h1>
          <button onClick={() => reset()}>Try again / Thử lại</button>
        </div>
      </body>
    </html>
  );
}
