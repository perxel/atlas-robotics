import type { Locale } from "@/lib/i18n";

// UI chrome strings (headings, labels, empty states) that aren't part of any
// Tina collection. CMS content (nav, footer, catalog, blog, etc.) is
// translated in content/*/<locale>/* — this covers everything else.
export type Dictionary = {
  siteName: string;
  nav: { primary: string };
  breadcrumb: { home: string };
  blog: {
    pageTitle: string;
    noPosts: string;
    viewAll: string;
  };
  products: {
    pageTitle: string;
    pageDescription: string;
    noProducts: string;
    viewDetails: string;
    getStarted: string;
  };
  newsletter: {
    emailLabel: string;
    emailPlaceholder: string;
    submitLabel: string;
    sending: string;
    success: string;
    error: string;
  };
  contact: {
    send: string;
    sending: string;
    success: string;
    error: string;
    fields: {
      name: { label: string; placeholder: string };
      email: { label: string; placeholder: string };
      message: { label: string; placeholder: string };
    };
  };
  footer: {
    contactHeading: string;
  };
  social: {
    fallbackLabel: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    siteName: "Lorem ipsum",
    nav: { primary: "Primary" },
    breadcrumb: { home: "Home" },
    blog: {
      pageTitle: "Blog",
      noPosts: "No posts published yet.",
      viewAll: "View all posts",
    },
    products: {
      pageTitle: "Products",
      pageDescription: "Everything Lorem ipsum ships, in one place.",
      noProducts: "No products published yet.",
      viewDetails: "View details",
      getStarted: "Get started",
    },
    newsletter: {
      emailLabel: "Email address",
      emailPlaceholder: "you@example.com",
      submitLabel: "Subscribe",
      sending: "Subscribing…",
      success: "You're in — check your inbox to confirm.",
      error: "Something went wrong. Please try again.",
    },
    contact: {
      send: "Send",
      sending: "Sending…",
      success: "Thanks — your message was logged server side.",
      error: "Something went wrong. Please try again.",
      fields: {
        name: { label: "Name", placeholder: "Your name" },
        email: { label: "Email", placeholder: "you@example.com" },
        message: { label: "Message", placeholder: "How can we help?" },
      },
    },
    footer: { contactHeading: "Contact" },
    social: { fallbackLabel: "Social link" },
  },
  vi: {
    siteName: "Lorem ipsum",
    nav: { primary: "Chính" },
    breadcrumb: { home: "Trang chủ" },
    blog: {
      pageTitle: "Blog",
      noPosts: "Chưa có bài viết nào được đăng.",
      viewAll: "Xem tất cả bài viết",
    },
    products: {
      pageTitle: "Sản Phẩm",
      pageDescription: "Toàn bộ sản phẩm của Lorem ipsum, tại một nơi.",
      noProducts: "Chưa có sản phẩm nào được đăng.",
      viewDetails: "Xem chi tiết",
      getStarted: "Bắt đầu ngay",
    },
    newsletter: {
      emailLabel: "Địa chỉ email",
      emailPlaceholder: "ban@example.com",
      submitLabel: "Đăng ký",
      sending: "Đang đăng ký…",
      success: "Đã đăng ký — kiểm tra hộp thư để xác nhận nhé.",
      error: "Đã xảy ra lỗi. Vui lòng thử lại.",
    },
    contact: {
      send: "Gửi",
      sending: "Đang gửi…",
      success: "Cảm ơn — tin nhắn của bạn đã được ghi lại ở phía máy chủ.",
      error: "Đã xảy ra lỗi. Vui lòng thử lại.",
      fields: {
        name: { label: "Họ và Tên", placeholder: "Tên của bạn" },
        email: { label: "Email", placeholder: "ban@example.com" },
        message: { label: "Lời Nhắn", placeholder: "Chúng tôi có thể giúp gì cho bạn?" },
      },
    },
    footer: { contactHeading: "Liên Hệ" },
    social: { fallbackLabel: "Liên kết mạng xã hội" },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
