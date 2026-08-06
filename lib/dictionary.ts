import type { Locale } from "@/lib/i18n";

// UI chrome strings (headings, labels, empty states) that aren't part of any
// Tina collection. CMS content (nav, footer, catalog, blog, etc.) is
// translated in content/*/<locale>/* — this covers everything else.
export type Dictionary = {
  siteName: string;
  nav: { primary: string };
  home: {
    title: string;
    description: string;
    sections: {
      catalog: { label: string; description: string };
      storyCards: { label: string; description: string };
      blog: { label: string; description: string };
      contact: { label: string; description: string };
    };
  };
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
    home: {
      title: "TinaCMS Stack Proof of Concept",
      description:
        "A reusable internal demo validating Next.js App Router, TinaCMS with repo based media, two-locale routing, and a set of structured content components.",
      sections: {
        catalog: {
          label: "Catalog viewer",
          description: "Tabbed image viewer with swipe/arrow navigation and a text alternative.",
        },
        storyCards: {
          label: "Story cards",
          description: "Click or swipe between records in a card based component.",
        },
        blog: {
          label: "Blog",
          description: "Listing and detail pages sourced from structured content.",
        },
        contact: {
          label: "Contact",
          description: "A CMS-defined form that logs submissions server side.",
        },
      },
    },
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
      pageDescription: "This form is rendered entirely from structured content — no hardcoded fields.",
      send: "Send",
      sending: "Sending…",
      success: "Thanks — your message was logged server side.",
      error: "Something went wrong. Please try again.",
    },
    footer: { contactHeading: "Contact" },
    social: { fallbackLabel: "Social link" },
  },
  vi: {
    siteName: "Trang Demo",
    nav: { primary: "Chính" },
    home: {
      title: "Bằng Chứng Khái Niệm Nền Tảng TinaCMS",
      description:
        "Một bản demo nội bộ dùng lại được, xác thực Next.js App Router, TinaCMS với media lưu trong repo, định tuyến hai ngôn ngữ và bộ thành phần nội dung có cấu trúc.",
      sections: {
        catalog: {
          label: "Trình xem danh mục",
          description:
            "Trình xem ảnh dạng tab với điều hướng vuốt/mũi tên và một phiên bản văn bản thay thế.",
        },
        storyCards: {
          label: "Thẻ câu chuyện",
          description: "Nhấp hoặc vuốt giữa các bản ghi trong thành phần dạng thẻ.",
        },
        blog: {
          label: "Blog",
          description: "Trang danh sách và chi tiết được lấy từ nội dung có cấu trúc.",
        },
        contact: {
          label: "Liên hệ",
          description: "Một biểu mẫu được định nghĩa từ CMS, ghi lại dữ liệu gửi ở phía máy chủ.",
        },
      },
    },
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
      pageDescription:
        "Biểu mẫu này được hiển thị hoàn toàn từ nội dung có cấu trúc — không có trường nào được viết cứng.",
      send: "Gửi",
      sending: "Đang gửi…",
      success: "Cảm ơn — tin nhắn của bạn đã được ghi lại ở phía máy chủ.",
      error: "Đã xảy ra lỗi. Vui lòng thử lại.",
    },
    footer: { contactHeading: "Liên Hệ" },
    social: { fallbackLabel: "Liên kết mạng xã hội" },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
