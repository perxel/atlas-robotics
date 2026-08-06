import type { Locale } from "@/lib/i18n";

// UI chrome strings (headings, labels, empty states) that aren't part of any
// Tina collection. CMS content (nav, footer, catalog, blog, etc.) is
// translated in content/*/<locale>/* — this covers everything else.
export type Dictionary = {
  siteName: string;
  nav: { primary: string };
  catalog: {
    pageTitle: string;
    pageDescription: string;
    noTabs: string;
    noImages: string;
    viewTextVersion: string;
    inactiveSuffix: string;
    tabsAriaLabel: string;
    prevPage: string;
    nextPage: string;
    goToPage: (i: number, total: number) => string;
    imageFallback: (i: number) => string;
  };
  catalogText: {
    pageTitle: string;
    pageDescription: string;
    viewInteractive: string;
    inactiveSuffix: string;
  };
  storyCards: {
    pageTitle: string;
    pageDescription: string;
    noCards: string;
    tabsAriaLabel: string;
    downloadPdf: string;
    prev: string;
    next: string;
    prevAria: string;
    nextAria: string;
    goToCard: (i: number) => string;
  };
  blog: {
    pageTitle: string;
    noPosts: string;
  };
  contact: {
    pageTitle: string;
    pageDescription: string;
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
    siteName: "Demo Site",
    nav: { primary: "Primary" },
    catalog: {
      pageTitle: "Catalog",
      pageDescription: "Structured, CMS-driven tabbed viewer with swipe and arrow navigation.",
      noTabs: "No catalog tabs available.",
      noImages: "This tab has no images yet.",
      viewTextVersion: "View text-only version",
      inactiveSuffix: " (inactive)",
      tabsAriaLabel: "Catalog tabs",
      prevPage: "Previous page",
      nextPage: "Next page",
      goToPage: (i, total) => `Go to page ${i} of ${total}`,
      imageFallback: (i) => `Image ${i}`,
    },
    catalogText: {
      pageTitle: "Catalog (text version)",
      pageDescription:
        "A plain text, fully indexable alternative sourced from the same structured content as the interactive viewer.",
      viewInteractive: "View interactive version",
      inactiveSuffix: "(inactive)",
    },
    storyCards: {
      pageTitle: "Story Cards",
      pageDescription: "Click or swipe between records in this card based interactive component.",
      noCards: "No story cards available.",
      tabsAriaLabel: "Story cards",
      downloadPdf: "Download PDF attachment",
      prev: "‹ Prev",
      next: "Next ›",
      prevAria: "Previous card",
      nextAria: "Next card",
      goToCard: (i) => `Go to card ${i}`,
    },
    blog: {
      pageTitle: "Blog",
      noPosts: "No posts published yet.",
    },
    contact: {
      pageTitle: "Contact",
      pageDescription: "Send us a message and we'll get back to you.",
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
    siteName: "Trang Demo",
    nav: { primary: "Chính" },
    catalog: {
      pageTitle: "Danh Mục",
      pageDescription:
        "Trình xem dạng tab được điều khiển bởi CMS có cấu trúc, hỗ trợ vuốt và điều hướng mũi tên.",
      noTabs: "Chưa có tab danh mục nào.",
      noImages: "Tab này chưa có hình ảnh.",
      viewTextVersion: "Xem phiên bản văn bản",
      inactiveSuffix: " (ngừng hoạt động)",
      tabsAriaLabel: "Các tab danh mục",
      prevPage: "Trang trước",
      nextPage: "Trang sau",
      goToPage: (i, total) => `Đi đến trang ${i} trong ${total}`,
      imageFallback: (i) => `Hình ảnh ${i}`,
    },
    catalogText: {
      pageTitle: "Danh Mục (phiên bản văn bản)",
      pageDescription:
        "Một phiên bản văn bản thuần, có thể lập chỉ mục đầy đủ, lấy từ cùng nội dung có cấu trúc với trình xem tương tác.",
      viewInteractive: "Xem phiên bản tương tác",
      inactiveSuffix: "(ngừng hoạt động)",
    },
    storyCards: {
      pageTitle: "Thẻ Câu Chuyện",
      pageDescription: "Nhấp hoặc vuốt giữa các bản ghi trong thành phần thẻ tương tác này.",
      noCards: "Chưa có thẻ câu chuyện nào.",
      tabsAriaLabel: "Thẻ câu chuyện",
      downloadPdf: "Tải tệp đính kèm PDF",
      prev: "‹ Trước",
      next: "Sau ›",
      prevAria: "Thẻ trước",
      nextAria: "Thẻ sau",
      goToCard: (i) => `Đi đến thẻ ${i}`,
    },
    blog: {
      pageTitle: "Blog",
      noPosts: "Chưa có bài viết nào được đăng.",
    },
    contact: {
      pageTitle: "Liên Hệ",
      pageDescription: "Gửi tin nhắn cho chúng tôi, chúng tôi sẽ phản hồi sớm nhất.",
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
