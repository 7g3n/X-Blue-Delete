(() => {
  "use strict";

  const HIDDEN_ATTR = "data-x-blue-delete-hidden";
  const REASON_ATTR = "data-x-blue-delete-reason";

  const HREF_PATTERNS = [
    /\/i\/premium(?:[_/-]|$|\?)/i,
    /premium[-_]sign[-_]up/i,
    /subscribe[-_]to[-_]premium/i,
    /\/i\/verified[-_]orgs/i,
    /verified[-_]orgs[-_]sign[-_]up/i,
    /\/settings\/premium/i,
    /\/settings\/monetization/i,
    /\/verified[-_]orgs/i,
    /\/verified-organizations/i,
    /\/subscriptions\/(?:subscribe|sign_up)/i
  ];

  const EXACT_CTA_TEXT = new Set([
    "get verified",
    "subscribe to premium",
    "upgrade to premium",
    "upgrade",
    "verify now",
    "認証される",
    "アップグレードする",
    "アップグレード",
    "プレミアムにアップグレード",
    "プレミアムプラスにアップグレード",
    "premium plusにアップグレード",
    "premium+にアップグレード",
    "プレミアムに登録",
    "premiumに登録",
    "premiumへアップグレード"
  ]);

  const STRONG_TEXT_PATTERNS = [
    /you(?:'|')?re not verified/i,
    /you are not verified/i,
    /get verified/i,
    /subscribe to premium/i,
    /upgrade to premium/i,
    /upgrade/i,
    /x premium/i,
    /premium plus/i,
    /premium\+/i,
    /verified organizations?/i,
    /verified orgs/i,
    /creator subscriptions?/i,
    /blue checkmarks?/i,
    /verification badge/i,
    /save \d+%/i,
    /\d+%\s*off/i,
    /まだ認証されていません/,
    /認証を受けると/,
    /今すぐプロフィールをアップグレード/,
    /認証される/,
    /プレミアムにアップグレード/,
    /プレミアムプラスにアップグレード/,
    /premium plusにアップグレード/i,
    /premium\+にアップグレード/i,
    /アップグレードする/,
    /最も強力なグローバルネットワーク/,
    /未来を形作る会話/,
    /表示される広告がゼロ/,
    /広告がゼロ/,
    /返信が最優先/,
    /他のメリット/,
    /\d+%\s*オフ/,
    /x premium/i,
    /プレミアムに登録/,
    /premiumに登録/i,
    /premiumへアップグレード/i,
    /広告のないブラウジング/,
    /返信の強化/,
    /青いチェックマーク/,
    /認証バッジ/,
    /認証済み組織/,
    /クリエイターサブスクリプション/
  ];

  const CARD_CONTEXT_PATTERNS = [
    /premium/i,
    /premium plus/i,
    /verified/i,
    /verification/i,
    /subscription/i,
    /upgrade/i,
    /off/i,
    /認証/,
    /プレミアム/,
    /プレミアムプラス/,
    /アップグレード/,
    /オフ/,
    /広告のない/,
    /サブスクリプション/
  ];

  const FOLLOWING_SORT_LABELS = [
    "フォロー中",
    "Following"
  ];

  const LATEST_SORT_LABELS = [
    "最新",
    "Latest"
  ];

  const SORT_MENU_LABELS = [
    "並べ替え",
    "Sort"
  ];

  const POPULAR_SORT_LABELS = [
    "人気",
    "おすすめ",
    "Popular",
    "Top",
    "Recommended"
  ];

  const INTERACTIVE_SELECTOR = [
    "a[href]",
    "button",
    "[role='button']",
    "[role='link']"
  ].join(",");

  const DIRECT_SELECTOR = [
    "a[href]",
    "button",
    "[role='button']",
    "[role='link']",
    "[aria-label]"
  ].join(",");

  const CARD_SELECTOR = [
    "aside div",
    "nav a",
    "nav [role='button']",
    "[role='dialog']",
    "[aria-modal='true']",
    "[data-testid='sheetDialog']",
    "[data-testid='BottomBar']",
    "[data-testid='sidebarColumn'] div"
  ].join(",");

  const MAX_TEXT_LENGTH = 1400;
  const MAX_TEXT_SCAN_NODES = 450;
  const SORT_RECHECK_INTERVAL_MS = 1600;
  const SORT_LOCKED_INTERVAL_MS = 45000;

  let scheduled = false;
  let observer = null;
  let sortInFlight = false;
  let lastSortCheckAt = 0;
  let latestSortLockedUntil = 0;
  let lastRouteKey = "";
  const openedSortRoutes = new Set();

  const normalizeText = (value) =>
    (value || "")
      .replace(/\s+/g, " ")
      .trim();

  const getText = (element) =>
    normalizeText(element?.innerText || element?.textContent || "");

  const hasPremiumHref = (element) => {
    const href = element?.getAttribute?.("href") || "";
    if (!href) {
      return false;
    }
    return HREF_PATTERNS.some((pattern) => pattern.test(href));
  };

  const hasStrongPromoText = (text) =>
    STRONG_TEXT_PATTERNS.some((pattern) => pattern.test(text));

  const hasCardContextText = (text) =>
    CARD_CONTEXT_PATTERNS.some((pattern) => pattern.test(text));

  const isExactCta = (text) => {
    const value = normalizeText(text).toLowerCase();
    return EXACT_CTA_TEXT.has(value);
  };

  const isInsidePost = (element) => {
    const article = element?.closest?.("article");
    return Boolean(article && article.contains(element));
  };

  const isVisible = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
  };

  const textMatchesAny = (text, labels) => {
    const value = normalizeText(text).toLowerCase();
    return labels.some((label) => value === label.toLowerCase());
  };

  const textIncludesAny = (text, labels) => {
    const value = normalizeText(text).toLowerCase();
    return labels.some((label) => value.includes(label.toLowerCase()));
  };

  const hide = (element, reason) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    if (element === document.documentElement || element === document.body) {
      return;
    }

    element.setAttribute(HIDDEN_ATTR, "true");
    element.setAttribute(REASON_ATTR, reason);
  };

  const findDialogContainer = (element) => {
    const dialog = element.closest?.("[aria-modal='true'], [role='dialog']");
    if (!dialog) {
      return null;
    }

    let container = dialog;
    for (let depth = 0; depth < 4; depth += 1) {
      const parent = container.parentElement;
      if (!parent || parent === document.body) {
        break;
      }

      const style = window.getComputedStyle(parent);
      if (style.position === "fixed" || style.position === "absolute") {
        container = parent;
      }
    }

    return container;
  };

  const findPromoContainer = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const direct = element.closest("a[href], button, [role='button'], [role='link']");
    if (direct && (hasPremiumHref(direct) || isExactCta(getText(direct)) || isExactCta(direct.getAttribute("aria-label")))) {
      return direct;
    }

    const dialog = findDialogContainer(element);
    if (dialog && hasStrongPromoText(getText(dialog))) {
      return dialog;
    }

    let best = null;
    let current = element;

    for (let depth = 0; current && current !== document.body && depth < 9; depth += 1) {
      if (current.matches?.("article")) {
        break;
      }

      const text = getText(current);
      if (text.length > MAX_TEXT_LENGTH) {
        current = current.parentElement;
        continue;
      }

      const hasInteractive = Boolean(current.querySelector?.(INTERACTIVE_SELECTOR));
      const strong = hasStrongPromoText(text);
      const contextual = hasCardContextText(text) && hasInteractive;

      if (strong || contextual) {
        best = current;
        if (hasInteractive && text.length > 8) {
          return current;
        }
      }

      current = current.parentElement;
    }

    return best || direct;
  };

  const cleanDirectCandidates = (root) => {
    root.querySelectorAll?.(DIRECT_SELECTOR).forEach((element) => {
      if (element.hasAttribute(HIDDEN_ATTR)) {
        return;
      }

      const label = normalizeText(element.getAttribute("aria-label"));
      const text = getText(element);
      const combined = `${label} ${text}`.trim();
      const premiumHref = hasPremiumHref(element);
      const exactCta = isExactCta(label) || isExactCta(text);
      const strongText = combined.length <= 180 && hasStrongPromoText(combined);

      if (!premiumHref && !exactCta && !strongText) {
        return;
      }

      if (isInsidePost(element) && !premiumHref) {
        return;
      }

      const target = findPromoContainer(element);
      hide(target || element, premiumHref ? "premium-link" : "premium-cta");
    });
  };

  const cleanCards = (root) => {
    root.querySelectorAll?.(CARD_SELECTOR).forEach((element) => {
      if (element.hasAttribute(HIDDEN_ATTR) || isInsidePost(element)) {
        return;
      }

      const text = getText(element);
      if (!text || text.length > MAX_TEXT_LENGTH || !hasStrongPromoText(text)) {
        return;
      }

      const hasInteractive = Boolean(element.querySelector?.(INTERACTIVE_SELECTOR));
      const isDialog = element.matches("[aria-modal='true'], [role='dialog']");
      const hasDismiss = Boolean(element.querySelector?.("[aria-label='Close' i], [aria-label='閉じる']"));

      if (hasInteractive || isDialog || hasDismiss) {
        hide(findPromoContainer(element) || element, "premium-card");
      }
    });
  };

  const cleanTextMatches = (root) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const text = normalizeText(node.nodeValue);
          if (!text || text.length > 220) {
            return NodeFilter.FILTER_REJECT;
          }

          return hasStrongPromoText(text)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let count = 0;
    while (count < MAX_TEXT_SCAN_NODES) {
      const node = walker.nextNode();
      if (!node) {
        break;
      }

      count += 1;
      const parent = node.parentElement;
      if (!parent || parent.hasAttribute(HIDDEN_ATTR) || isInsidePost(parent)) {
        continue;
      }

      const target = findPromoContainer(parent);
      hide(target || parent, "premium-text");
    }
  };

  const clickElement = (element) => {
    if (!element || !isVisible(element)) {
      return false;
    }

    const options = {
      bubbles: true,
      cancelable: true,
      view: window
    };

    element.dispatchEvent(new MouseEvent("mouseover", options));
    element.dispatchEvent(new MouseEvent("mousedown", options));
    element.dispatchEvent(new MouseEvent("mouseup", options));
    element.click();
    return true;
  };

  const getRouteKey = () =>
    `${location.pathname}${location.search}`;

  const resetSortRouteStateIfNeeded = () => {
    const routeKey = getRouteKey();
    if (routeKey === lastRouteKey) {
      return routeKey;
    }

    lastRouteKey = routeKey;
    latestSortLockedUntil = 0;
    if (openedSortRoutes.size > 20) {
      openedSortRoutes.clear();
    }

    return routeKey;
  };

  const findSortMenu = (root) => {
    const candidates = root.querySelectorAll?.([
      "[role='menu']",
      "[role='listbox']",
      "[role='dialog']",
      "[aria-modal='true']",
      "[data-testid='Dropdown']",
      "[data-testid='sheetDialog']"
    ].join(",")) || [];

    return Array.from(candidates).find((element) => {
      if (!isVisible(element) || isInsidePost(element)) {
        return false;
      }

      const text = getText(element);
      return text.length <= 800
        && textIncludesAny(text, LATEST_SORT_LABELS)
        && (textIncludesAny(text, SORT_MENU_LABELS) || textIncludesAny(text, POPULAR_SORT_LABELS));
    }) || null;
  };

  const findLatestOption = (menu) => {
    const candidates = menu.querySelectorAll?.([
      "button",
      "[role='menuitem']",
      "[role='option']",
      "[role='button']",
      "[tabindex]"
    ].join(",")) || [];

    return Array.from(candidates).find((element) => {
      if (!isVisible(element) || element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
        return false;
      }

      const text = getText(element) || normalizeText(element.getAttribute("aria-label"));
      return textMatchesAny(text, LATEST_SORT_LABELS);
    }) || null;
  };

  const selectVisibleLatestSort = (root) => {
    const menu = findSortMenu(root);
    if (!menu) {
      return false;
    }

    const latestOption = findLatestOption(menu);
    if (!latestOption) {
      return false;
    }

    if (clickElement(latestOption)) {
      latestSortLockedUntil = Date.now() + SORT_LOCKED_INTERVAL_MS;
      return true;
    }

    return false;
  };

  const isFollowingSortTrigger = (element) => {
    if (!isVisible(element) || isInsidePost(element)) {
      return false;
    }

    if (element.closest("[data-testid='UserCell'], [data-testid='userActions']")) {
      return false;
    }

    const text = getText(element) || normalizeText(element.getAttribute("aria-label"));
    if (!textMatchesAny(text, FOLLOWING_SORT_LABELS)) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const looksLikeDropdown = element.hasAttribute("aria-expanded")
      || element.hasAttribute("aria-haspopup")
      || Boolean(element.querySelector("svg"));
    const nearTopNavigation = rect.top >= -10 && rect.top <= Math.min(window.innerHeight * 0.45, 320);

    return looksLikeDropdown && nearTopNavigation;
  };

  const findFollowingSortTrigger = (root) => {
    const candidates = root.querySelectorAll?.("button, [role='button'], [aria-expanded], [aria-haspopup]") || [];
    return Array.from(candidates).find(isFollowingSortTrigger) || null;
  };

  const forceLatestFollowingSort = (root) => {
    const now = Date.now();
    const routeKey = resetSortRouteStateIfNeeded();

    if (selectVisibleLatestSort(root)) {
      return;
    }

    if (sortInFlight || now < latestSortLockedUntil || now - lastSortCheckAt < SORT_RECHECK_INTERVAL_MS) {
      return;
    }

    lastSortCheckAt = now;
    if (openedSortRoutes.has(routeKey)) {
      return;
    }

    const trigger = findFollowingSortTrigger(root);
    if (!trigger) {
      return;
    }

    openedSortRoutes.add(routeKey);
    sortInFlight = true;

    if (!clickElement(trigger)) {
      sortInFlight = false;
      return;
    }

    [120, 320, 700].forEach((delay) => {
      window.setTimeout(() => {
        selectVisibleLatestSort(document.body || document.documentElement);
      }, delay);
    });

    window.setTimeout(() => {
      sortInFlight = false;
    }, 900);
  };

  const clean = () => {
    const root = document.body || document.documentElement;
    if (!root) {
      return;
    }

    cleanDirectCandidates(root);
    cleanCards(root);
    cleanTextMatches(root);
    forceLatestFollowingSort(root);
  };

  const scheduleClean = () => {
    if (scheduled) {
      return;
    }

    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      clean();
    });
  };

  const start = () => {
    scheduleClean();

    if (observer) {
      return;
    }

    observer = new MutationObserver(scheduleClean);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  };

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();
