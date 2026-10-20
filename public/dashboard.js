const content = document.getElementById("content");
const filterBar = document.getElementById("filters");
const showMoreBtn = document.getElementById("showMore");
const login = document.getElementById("loginButton");
const loadError = document.getElementById("loadError");
const modalmessage = document.getElementsByClassName("modalmessage");
const text_msg = document.getElementById("text-msg");
const image_msg = document.getElementById("image-msg");
const doc_msg = document.getElementById("doc-msg");
const credentials_msg = document.getElementById("credentials-msg");
const chatbtn = document.getElementById("chatButton");
let isLoggedIn = false;
let isAdmin = false;
let searchQuery = "";
let liveFilter = "";
let editing = null;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACTIVE = [
  "bg-blue-500",
  "text-white",
  "hover:bg-blue-400",
  "active:bg-blue-600",
];
const INACTIVE = [
  "border",
  "border-neutral-800",
  "bg-neutral-900",
  "text-neutral-300",
  "hover:bg-neutral-800",
  "hover:text-white",
  "active:bg-neutral-700",
];

const CARD =
  "flex flex-col gap-4 min-h-0 rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm transition hover:border-neutral-700";

let store = { text: [], credentials: [], images: [], docs: [] };
let currentFilter = "public";
let page = 1;
let loading = false;

/* ---------- Helpers ---------- */

// DB column is `is_public`. Everything on the Public tab is public by definition,
// so we never rely on the field there. Elsewhere we read is_public (with a
// fallback to a legacy `public` field) and coerce it to a real boolean.
function readPublic(item, forcePublic) {
  if (forcePublic) return true;
  const v = item.is_public !== undefined ? item.is_public : item.public;
  return v === true || v === "true" || v === "t" || v === 1;
}

function normalize(data, forcePublic = false) {
  const raw = data.data;
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  const clean = (list) =>
    (Array.isArray(list) ? list : []).map((item) => ({
      ...item,
      is_public: readPublic(item, forcePublic),
    }));

  return {
    text: clean(src.text),
    credentials: clean(src.credentials),
    images: clean(src.images),
    docs: clean(src.docs),
  };
}

function isEmptyStore(s) {
  return (
    !s.text.length &&
    !s.credentials.length &&
    !s.images.length &&
    !s.docs.length
  );
}

// The server sends is_owner (other users' emails never reach the browser).
// Only the owner sees the visibility switch and badge.
function isOwner(item) {
  return isLoggedIn && item.is_owner === true;
}

// Owners can edit / delete their items. An admin can edit / delete any PUBLIC
// item (never credentials, they are always private).
function canManage(item) {
  if (!isLoggedIn) return false;
  if (isOwner(item)) return true;
  return isAdmin && item._type !== "credentials" && item.is_public === true;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "Uploaded at -";
  return (
    "Uploaded at " +
    d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  );
}

function byLatest(a, b) {
  return new Date(b.created_at) - new Date(a.created_at);
}

// Cloudinary helpers: insert transformations right after "/upload/"
function cloudinary(url, transform) {
  return url && url.includes("/upload/")
    ? url.replace("/upload/", "/upload/" + transform + "/")
    : url;
}

/* ---------- Cards ---------- */

// Copy button
function copyButton(value) {
  const btn = el(
    "button",
    "shrink-0 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white active:bg-neutral-700",
    "Copy",
  );

  btn.type = "button";

  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(value || "");
      btn.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = "Copy";
      }, 1200);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  });

  return btn;
}

function toggleButton(initial = false, onChange = null) {
  const btn = el(
    "button",
    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
  );

  btn.type = "button";
  btn.setAttribute("role", "switch");

  const knob = el(
    "span",
    "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
  );

  btn.appendChild(knob);

  let on = Boolean(initial);

  function paint() {
    btn.classList.toggle("bg-blue-500", on);
    btn.classList.toggle("bg-neutral-700", !on);

    // Reset the position explicitly in both states.
    knob.classList.toggle("translate-x-5", on);
    knob.classList.toggle("translate-x-0", !on);

    btn.setAttribute("aria-checked", String(on));
  }

  btn.addEventListener("click", () => {
    on = !on;
    paint();

    if (onChange) onChange(on);
  });
  btn.setValue = (v) => {
    on = v;
    paint();
  };
  paint();
  return btn;
}

const ICONS = {
  edit: '<path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />',
  trash:
    '<path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />',
  share:
    '<circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />',
  download:
    '<path d="M12 4v12m0 0-4-4m4 4 4-4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />',
};

const ACTION_BTN =
  "flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 active:bg-neutral-700";

function svgIcon(name) {
  return (
    '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    ICONS[name] +
    "</svg>"
  );
}

// Puts an icon + text label inside a button / link, returns the label span
function withIcon(node, icon, text) {
  node.innerHTML = svgIcon(icon);
  const label = el("span", "", text);
  node.appendChild(label);
  return label;
}

function iconButton(icon, label, danger, onClick) {
  const btn = el(
    "button",
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 text-neutral-300 transition hover:bg-neutral-800 active:bg-neutral-700 " +
      (danger ? "hover:text-red-400" : "hover:text-white"),
  );
  btn.type = "button";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.innerHTML = svgIcon(icon);
  btn.addEventListener("click", onClick);
  return btn;
}

function shareButton(item) {
  const btn = el("button", ACTION_BTN);
  btn.type = "button";
  const label = withIcon(btn, "share", "Share");

  btn.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title || "Shared file",
          url: item.url,
        });
      } else {
        await navigator.clipboard.writeText(item.url || "");
        label.textContent = "Link copied";
        setTimeout(() => {
          label.textContent = "Share";
        }, 1500);
      }
    } catch (err) {
      if (!err || err.name !== "AbortError")
        console.error("Share failed:", err);
    }
  });

  return btn;
}

function downloadLink(item) {
  const link = el("a", ACTION_BTN);
  withIcon(link, "download", "Download");
  link.href = cloudinary(item.url, "fl_attachment");
  return link;
}

ICONS.sparkles =
  '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />';

// "Analyze with AI" button at the bottom of text / image / doc cards
function analyzeButton(item) {
  const btn = el(
    "button",
    "flex items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 active:bg-violet-500/30",
  );
  btn.type = "button";
  withIcon(btn, "sparkles", "Analyze with AI");
  btn.addEventListener("click", () => openAnalyze(item));
  return btn;
}

function flashError(message) {
  loadError.classList.remove("hidden");
  loadError.innerText = message;
  setTimeout(() => {
    loadError.innerText = "";
  }, 4000);
}

async function deleteItem(item, btn) {
  if (
    !confirm(
      'Delete "' + (item.title || "Untitled") + '"? This cannot be undone.',
    )
  )
    return;

  btn.disabled = true;
  try {
    const res = await fetch("/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: item._type, id: item.id }),
    });
    const data = await res.json();
    if (!res.ok || data.success !== true) {
      throw new Error(data.message || "Failed to delete");
    }

    store[item._type] = store[item._type].filter((x) => x.id !== item.id);
    render();
  } catch (err) {
    console.error(err);
    flashError(err.message || "Failed to delete");
    btn.disabled = false;
  }
}

function cardHeader(item, copyValue = null) {
  const header = el(
    "div",
    "flex w-full min-w-0 flex-1 items-start justify-between gap-3",
  );
  const box = el("div", "min-w-0 flex-1");

  const titleRow = el("div", "flex min-w-0 items-center gap-2");
  titleRow.appendChild(
    el(
      "h3",
      "min-w-0 truncate text-base font-bold text-neutral-100",
      item.title || "Untitled",
    ),
  );

  let badge = null;
  function paintBadge(isPublic) {
    if (!badge) return;
    badge.className =
      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
      (isPublic
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        : "border-amber-500/20 bg-amber-500/10 text-amber-400");
    badge.textContent = isPublic ? "Public" : "Private";
  }

  const owner = isOwner(item);

  // Badge only for the owner's own items (never label other people's public items "Private")
  if (owner) {
    badge = el("span");
    paintBadge(item.is_public === true);
    titleRow.appendChild(badge);
  }

  box.appendChild(titleRow);
  box.appendChild(
    el("p", "mt-1 text-xs text-neutral-500", formatDate(item.created_at)),
  );
  header.appendChild(box);

  const actions = el("div", "flex shrink-0 items-center gap-2 self-start");
  if (copyValue !== null) actions.appendChild(copyButton(copyValue));

  // Edit + delete: owner, or admin on public items
  if (canManage(item)) {
    const name = item.title || "Untitled";
    actions.appendChild(
      iconButton("edit", "Edit " + name, false, () => openEdit(item)),
    );
    actions.appendChild(
      iconButton("trash", "Delete " + name, true, (e) =>
        deleteItem(item, e.currentTarget),
      ),
    );
  }

  // Credentials can never be public, so no switch for them
  if (owner && item._type !== "credentials") {
    const toggle = toggleButton(item.is_public === true, async (value) => {
      toggle.disabled = true;
      try {
        const res = await fetch("/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item._type,
            id: item.id,
            public: value,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.success !== true) {
          throw new Error(data.message || "Failed to update visibility");
        }

        item.is_public = value;
        paintBadge(value);

        // On the Public tab, a card made private should disappear (and leave the store)
        if (currentFilter === "public" && !value) {
          store[item._type] = store[item._type].filter((x) => x.id !== item.id);
          header.closest("article")?.remove();
          if (!content.children.length) render();
        }
      } catch (err) {
        console.error(err);
        toggle.setValue(!value); // revert the knob
      } finally {
        toggle.disabled = false;
      }
    });
    toggle.setAttribute(
      "aria-label",
      `Public visibility for ${item.title || "Untitled"}`,
    );
    actions.appendChild(toggle);
  }

  header.appendChild(actions);
  return header;
}

function textCard(item) {
  const card = el("article", CARD);

  card.appendChild(cardHeader(item, item.value || ""));
  card.appendChild(
    el(
      "p",
      "mt-3 max-h-20 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm text-neutral-300",
      item.value || "",
    ),
  );

  return card;
}

function fieldRow(label, valueNode, copyValue = null) {
  const row = el(
    "div",
    "flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2",
  );

  const left = el("div", "min-w-0");

  left.appendChild(el("p", "text-xs text-neutral-500", label));
  left.appendChild(valueNode);
  row.appendChild(left);

  if (copyValue !== null) {
    row.appendChild(copyButton(copyValue));
  }

  return { row, left };
}

function credentialCard(item) {
  const card = el("article", CARD);

  // Credential card does not have a copy button in the title
  card.appendChild(cardHeader(item));

  // Username
  const username = item.username || item.email || "";

  const usernameRow = fieldRow(
    "Username / email",
    el("p", "truncate text-sm text-neutral-200", username),
    username,
  );

  card.appendChild(usernameRow.row);

  // Password
  const password = item.password || "";
  const pass = el("p", "truncate text-sm text-neutral-200", "••••••••");
  const passwordRow = fieldRow("Password", pass, password);

  const toggle = el(
    "button",
    "shrink-0 text-xs font-medium text-blue-400 transition hover:text-blue-300",
    "Show",
  );

  toggle.type = "button";

  let shown = false;

  toggle.addEventListener("click", () => {
    shown = !shown;
    pass.textContent = shown ? password : "••••••••";
    toggle.textContent = shown ? "Hide" : "Show";
  });

  passwordRow.row.appendChild(toggle);
  card.appendChild(passwordRow.row);

  return card;
}

function imageCard(item) {
  const card = el("article", CARD);

  const link = el("a", "block");

  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener";

  const img = el(
    "img",
    "aspect-video w-full rounded-lg bg-neutral-950 object-cover",
  );

  img.src = cloudinary(item.url, "w_600,ar_16:9,c_fill,f_auto,q_auto");
  img.alt = item.title || "";
  img.loading = "lazy";

  link.appendChild(img);
  card.appendChild(link);

  // Title + Copy URL button
  card.appendChild(cardHeader(item, item.url));

  // Download + Share
  const actions = el("div", "flex gap-2");
  actions.appendChild(downloadLink(item));
  actions.appendChild(shareButton(item));
  card.appendChild(actions);

  return card;
}

function docCard(item) {
  const card = el("article", CARD);

  const top = el("div", "flex items-center gap-3");

  const icon = el(
    "span",
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400",
  );

  icon.innerHTML =
    '<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5M9 13h6m-6 4h6" /></svg>';

  top.appendChild(icon);

  // Title + Copy URL button
  top.appendChild(cardHeader(item, item.url));

  card.appendChild(top);

  const ext = (item.url || "").split("?")[0].split(".").pop();

  const badge = el(
    "span",
    "w-fit rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300",
    ext && ext.length <= 5 ? ext.toUpperCase() : "FILE",
  );

  card.appendChild(badge);

  const actions = el("div", "flex gap-2");

  const view = el(
    "a",
    "flex-1 rounded-lg bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-400 active:bg-blue-600",
    "View",
  );

  view.href = item.url;
  view.target = "_blank";
  view.rel = "noopener";

  const download = el(
    "a",
    "flex-1 rounded-lg border border-neutral-700 px-4 py-2 text-center text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 active:bg-neutral-700",
    "Download",
  );

  download.href = cloudinary(item.url, "fl_attachment");

  actions.appendChild(view);
  actions.appendChild(download);
  actions.appendChild(shareButton(item));
  card.appendChild(actions);

  return card;
}

const builders = {
  text: textCard,
  credentials: credentialCard,
  images: imageCard,
  docs: docCard,
};

/* ---------- Rendering & data loading ---------- */

function render() {
  content.replaceChildren();

  let items = [];

  if (
    currentFilter === "all" ||
    currentFilter === "public" ||
    currentFilter === "private"
  ) {
    Object.keys(builders).forEach((type) => {
      store[type].forEach((item) => {
        items.push({ type, item });
      });
    });
  } else if (builders[currentFilter]) {
    store[currentFilter].forEach((item) => {
      items.push({ type: currentFilter, item });
    });
  }

  items.sort((a, b) => byLatest(a.item, b.item));

  // Instant filter while typing (only the items already loaded; passwords are not searched)
  if (liveFilter) {
    items = items.filter(({ item }) =>
      [item.title, item.value, item.username].some(
        (field) =>
          typeof field === "string" && field.toLowerCase().includes(liveFilter),
      ),
    );
  }

  if (!items.length) {
    content.appendChild(
      el(
        "p",
        "col-span-full py-12 text-center text-sm text-neutral-500",
        liveFilter
          ? "No match in the loaded items. Press Enter to search everything."
          : searchQuery
            ? "No results found."
            : "Nothing uploaded yet.",
      ),
    );
    return;
  }

  items.forEach(({ type, item }) => {
    item._type = type;
    const card = builders[type](item);
    if (type !== "credentials") card.appendChild(analyzeButton(item));
    content.appendChild(card);
  });
}

// Header user chip + the "login to upload" hints in the upload modal
function applySession(data) {
  const loggedIn = data.login === true;

  Array.from(modalmessage).forEach((element) => {
    element.classList.toggle("hidden", loggedIn);
  });
  credentials_msg.innerText = loggedIn ? "" : "login to upload credentials";
  image_msg.innerText = loggedIn ? "" : "login to upload Images";
  doc_msg.innerText = loggedIn ? "" : "login to upload Docs";

  login.classList.remove("hidden");
  if (!loggedIn) return;

  // The chip below has its own border, so drop the button's own border/padding
  // (otherwise the username sits inside two boxes)
  login.classList.remove(
    "border",
    "border-neutral-700",
    "px-4",
    "py-2",
    "hover:bg-neutral-800",
    "active:bg-neutral-700",
  );
  login.replaceChildren();

  const user = el(
    "div",
    "flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200",
  );

  const avatar = el(
    "div",
    "flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-400",
    (data.username || "?").charAt(0).toUpperCase(),
  );

  const username = el("span", "", data.username || "User");

  user.append(avatar, username);
  login.appendChild(user);
}

async function loadData(append = false) {
  if (loading) return;
  loadError.innerText = "";
  if (!append) content.innerHTML = "";
  loading = true;
  showMoreBtn.disabled = true;

  const searching = searchQuery !== "";

  try {
    const url = searching
      ? `/dashboard/search?type=${encodeURIComponent(currentFilter)}&q=${encodeURIComponent(searchQuery)}`
      : currentFilter === "public"
        ? `/dashboard/data?page=${page}&type=public`
        : `/dashboard/data2?page=${page}&type=${encodeURIComponent(currentFilter)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success === false) {
      if (append) page--;
      if (searching) showMoreBtn.classList.add("hidden");
      loadError.classList.remove("hidden");
      loadError.innerText = data.message;
      return;
    }

    isLoggedIn = data.login === true;
    if (isLoggedIn) {
      chatbtn.classList.remove("hidden");
    }
    isAdmin = data.admin === true;
    applySession(data);

    const result = normalize(data, currentFilter === "public");

    if (isEmptyStore(result)) {
      if (append) {
        // Nothing more to load: keep what is already on screen
        page--;
        showMoreBtn.classList.add("hidden");
        loadError.classList.remove("hidden");
        loadError.innerText = "No more data available";
        setTimeout(() => {
          loadError.innerText = "";
        }, 4000);
        return;
      }
      store = result;
      render();
      showMoreBtn.classList.add("hidden");
      return;
    }

    if (!append) {
      store = result;
    } else {
      Object.keys(store).forEach((type) => {
        store[type].push(...result[type]);
      });
    }

    render();

    // Search returns a single page of results, so no "Show more" while searching
    showMoreBtn.classList.toggle("hidden", searching);
    showMoreBtn.textContent = "Show more";
  } catch (err) {
    console.error(err);

    if (append) {
      page--; // roll back so the next click retries the same page
    } else {
      content.replaceChildren(
        el(
          "p",
          "col-span-full py-12 text-center text-sm text-red-500",
          "Failed to load data.",
        ),
      );
    }
  } finally {
    loading = false;
    showMoreBtn.disabled = false;
  }
}

// Reload from the first page (used after filter change or upload)
function reload() {
  page = 1;
  loadData();
}

function setFilter(name) {
  currentFilter = name;
  page = 1;

  store = { text: [], credentials: [], images: [], docs: [] };

  filterBar.querySelectorAll("[data-filter]").forEach((btn) => {
    const active = btn.dataset.filter === name;

    btn.classList.remove(...(active ? INACTIVE : ACTIVE));
    btn.classList.add(...(active ? ACTIVE : INACTIVE));
  });

  loadData();
}

filterBar.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-filter]");

  if (!btn || !filterBar.contains(btn)) return;

  const filter = btn.dataset.filter;
  if (!filter || filter === currentFilter) return;

  setFilter(filter);
});

showMoreBtn.addEventListener("click", async () => {
  if (loading) return;

  page++;
  await loadData(true);
});

loadData();

/* ---------- AI analysis ---------- */

// [code, name] - the code is what the server expects (English first, then A-Z)
const LANGUAGES = [
  ["en", "English"],
  ["as", "Assamese"],
  ["bn", "Bengali"],
  ["bho", "Bhojpuri"],
  ["brx", "Bodo"],
  ["doi", "Dogri"],
  ["gu", "Gujarati"],
  ["hi", "Hindi"],
  ["kn", "Kannada"],
  ["ks", "Kashmiri"],
  ["kok", "Konkani"],
  ["mai", "Maithili"],
  ["ml", "Malayalam"],
  ["mni", "Manipuri (Meitei)"],
  ["mr", "Marathi"],
  ["ne", "Nepali"],
  ["or", "Odia"],
  ["pa", "Punjabi"],
  ["sa", "Sanskrit"],
  ["sat", "Santali"],
  ["sd", "Sindhi"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["ur", "Urdu"],
];

const analyzeModal = document.getElementById("analyze-modal");
const analyzeItemLabel = document.getElementById("analyze-item");
const analyzeSelect = document.getElementById("analyze-language");
const analyzeStart = document.getElementById("analyze-start");
const analysisModal = document.getElementById("analysis-modal");
const analysisTitle = document.getElementById("analysis-title");
const analysisSub = document.getElementById("analysis-sub");
const analysisBody = document.getElementById("analysis-body");
const analysisCopy = document.getElementById("analysis-copy");

let analyzeTarget = null; // { type, id, title } of the card that was clicked
let analysisRun = 0; // lets us ignore an answer that arrives after the modal was closed

LANGUAGES.forEach(([code, name]) => {
  const option = el("option", "", name);
  option.value = code;
  analyzeSelect.appendChild(option);
});

try {
  const saved = localStorage.getItem("analyzeLanguage");
  if (saved && LANGUAGES.some(([code]) => code === saved))
    analyzeSelect.value = saved;
} catch (err) {
  /* storage can be blocked, the default is fine */
}

function showOverlay(node) {
  node.classList.remove("hidden");
  node.classList.add("flex");
}

function hideOverlay(node) {
  node.classList.add("hidden");
  node.classList.remove("flex");
}

function openAnalyze(item) {
  analyzeTarget = {
    type: item._type,
    id: item.id,
    title: item.title || "Untitled",
  };
  analyzeItemLabel.textContent = analyzeTarget.title;
  showOverlay(analyzeModal);
}

function closeAnalysis() {
  analysisRun++; // any request still running is now ignored
  hideOverlay(analysisModal);
}

function showAnalysisLoading() {
  analysisBody.replaceChildren();
  const row = el("div", "flex items-center gap-3 text-neutral-400");
  row.appendChild(
    el(
      "span",
      "h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-blue-400",
    ),
  );
  row.appendChild(el("span", "", "Analyzing..."));
  analysisBody.appendChild(row);
}

analyzeStart.addEventListener("click", async () => {
  if (!analyzeTarget) return;

  const target = analyzeTarget;
  const code = analyzeSelect.value;
  const languageName =
    analyzeSelect.options[analyzeSelect.selectedIndex].textContent;

  try {
    localStorage.setItem("analyzeLanguage", code);
  } catch (err) {
    /* optional */
  }

  hideOverlay(analyzeModal);

  const run = ++analysisRun;
  analysisTitle.textContent = target.title;
  analysisSub.textContent = "AI summary in " + languageName;
  analysisCopy.classList.add("hidden");
  showAnalysisLoading();
  showOverlay(analysisModal);

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: target.type,
        id: target.id,
        language: code,
      }),
    });
    const data = await res.json();

    if (run !== analysisRun) return; // closed while waiting

    if (!res.ok || data.success !== true) {
      throw new Error(data.message || "Analysis failed");
    }

    analysisBody.textContent = data.result;
    analysisCopy.classList.remove("hidden");
  } catch (err) {
    if (run !== analysisRun) return;
    console.error(err);
    analysisBody.replaceChildren(
      el(
        "p",
        "text-red-500",
        err instanceof SyntaxError
          ? "Something went wrong. Please try again."
          : err.message,
      ),
    );
  }
});

analysisCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(analysisBody.textContent || "");
    analysisCopy.textContent = "Copied";
    setTimeout(() => {
      analysisCopy.textContent = "Copy";
    }, 1200);
  } catch (err) {
    console.error("Copy failed:", err);
  }
});

document
  .getElementById("close-analyze")
  .addEventListener("click", () => hideOverlay(analyzeModal));
document
  .getElementById("close-analysis")
  .addEventListener("click", closeAnalysis);

analyzeModal.addEventListener("click", (e) => {
  if (e.target === analyzeModal) hideOverlay(analyzeModal);
});
analysisModal.addEventListener("click", (e) => {
  if (e.target === analysisModal) closeAnalysis();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!analysisModal.classList.contains("hidden")) closeAnalysis();
  else if (!analyzeModal.classList.contains("hidden"))
    hideOverlay(analyzeModal);
});

/* ---------- Search ---------- */

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

function runSearch() {
  searchQuery = searchInput.value.trim();
  page = 1;
  store = { text: [], credentials: [], images: [], docs: [] };
  loadData();
}

searchBtn.addEventListener("click", runSearch);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runSearch();
  }
});

// Clearing the box brings the normal list back
// Typing filters what is already on screen instantly; Enter / Search asks the backend
searchInput.addEventListener("input", () => {
  liveFilter = searchInput.value.trim().toLowerCase();

  if (liveFilter === "" && searchQuery !== "") {
    runSearch(); // box cleared: bring the normal list back
  } else {
    render();
  }
});

/* ---------- Upload modal ---------- */

const modal = document.getElementById("upload-modal");
const title = document.getElementById("upload-title");
const backBtn = document.getElementById("back-upload");
const views = modal.querySelectorAll("[data-view]");

const titles = {
  menu: "Upload",
  text: "Upload text",
  credentials: "Upload credentials",
  images: "Upload images",
  docs: "Upload docs",
};

function showView(name) {
  views.forEach((view) => {
    const active = view.dataset.view === name;
    view.classList.toggle("hidden", !active);
    view.classList.toggle(name === "menu" ? "grid" : "flex", active);
    if (!active) view.classList.remove("flex", "grid");
  });
  title.textContent = titles[name];
  backBtn.classList.toggle("hidden", name === "menu");
  backBtn.classList.toggle("flex", name !== "menu");
}

function openModal() {
  resetEditMode();
  showView("menu");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal() {
  resetEditMode();
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

document.getElementById("open-upload").addEventListener("click", openModal);
document.getElementById("close-upload").addEventListener("click", closeModal);
backBtn.addEventListener("click", () => showView("menu"));

modal.querySelectorAll("[data-target]").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.target));
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

const text_title = document.getElementById("text-title");
const text_content = document.getElementById("text-content");
const text_submit = document.getElementById("text-submit");
const image_file = document.getElementById("image-file");
const image_title = document.getElementById("image-title");
const image_submit = document.getElementById("image-submit");
const doc_file = document.getElementById("doc-file");
const doc_title = document.getElementById("doc-title");
const doc_submit = document.getElementById("doc-submit");
const credentials_title = document.getElementById("credentials-title");
const credentials_username = document.getElementById("credentials-username");
const credentials_password = document.getElementById("credentials-password");
const credentials_submit = document.getElementById("credentials-submit");

/* ---------- Edit (re-uses the upload modal) ---------- */

const EDIT_FORMS = {
  text: { submit: text_submit, msg: text_msg },
  credentials: { submit: credentials_submit, msg: credentials_msg },
  images: { submit: image_submit, msg: image_msg },
  docs: { submit: doc_submit, msg: doc_msg },
};

const EDIT_TITLES = {
  text: "Edit text",
  credentials: "Edit credentials",
  images: "Edit image",
  docs: "Edit document",
};

// The "choose a file" boxes are hidden while editing (only the title can change)
const FILE_PICKERS = [image_file, doc_file].map((input) =>
  input.closest("label"),
);

function openEdit(item) {
  const type = item._type;
  editing = { type, item };

  if (type === "text") {
    text_title.value = item.title || "";
    text_content.value = item.value || "";
  } else if (type === "credentials") {
    credentials_title.value = item.title || "";
    credentials_username.value = item.username || "";
    credentials_password.value = item.password || "";
  } else if (type === "images") {
    image_title.value = item.title || "";
  } else if (type === "docs") {
    doc_title.value = item.title || "";
  }

  FILE_PICKERS.forEach((label) => {
    label.style.display = "none";
  });

  const { submit, msg } = EDIT_FORMS[type];
  msg.textContent = "";
  submit.textContent = "Update";
  submit.disabled = false;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  showView(type);
  title.textContent = EDIT_TITLES[type];
  backBtn.classList.add("hidden"); // no going back to the upload menu while editing
  backBtn.classList.remove("flex");
}

// Puts the modal back to normal "upload" mode
function resetEditMode() {
  if (!editing) return;

  const { type } = editing;
  editing = null;

  const { submit, msg } = EDIT_FORMS[type];
  submit.textContent = "Upload";
  submit.disabled = false;
  msg.textContent = "";

  FILE_PICKERS.forEach((label) => {
    label.style.display = "";
  });

  text_title.value = "";
  text_content.value = "";
  credentials_title.value = "";
  credentials_username.value = "";
  credentials_password.value = "";
  image_title.value = "";
  doc_title.value = "";
}

async function submitEdit() {
  const { type, item } = editing;
  const { submit, msg } = EDIT_FORMS[type];

  const fail = (text) => {
    msg.textContent = text;
    setTimeout(() => {
      msg.textContent = "";
    }, 4000);
  };

  let payload; // what the server receives
  let changes; // what we apply to the card afterwards

  if (type === "text") {
    if (!text_title.value || !text_content.value)
      return fail("Please fill all fields");
    if (text_title.value.length > 100)
      return fail("Title is too long (max 100 characters)");
    if (text_content.value.length > 10000)
      return fail("Content is too long (max 10000 characters)");
    payload = { title: text_title.value, content: text_content.value };
    changes = { title: text_title.value, value: text_content.value };
  } else if (type === "credentials") {
    if (
      !credentials_title.value ||
      !credentials_username.value ||
      !credentials_password.value
    ) {
      return fail("Please fill all fields");
    }
    if (credentials_title.value.length > 100)
      return fail("Title is too long (max 100 characters)");
    if (
      credentials_password.value.length > 100 ||
      credentials_username.value.length > 100
    ) {
      return fail("Username or password is too long (max 100 characters)");
    }
    payload = {
      title: credentials_title.value,
      username: credentials_username.value,
      password: credentials_password.value,
    };
    changes = { ...payload };
  } else {
    const newTitle = type === "images" ? image_title.value : doc_title.value;
    if (!newTitle) return fail("Please fill all fields");
    if (newTitle.length > 100)
      return fail("Title is too long (max 100 characters)");
    payload = { title: newTitle };
    changes = { title: newTitle };
  }

  submit.disabled = true;

  try {
    const res = await fetch("/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id: item.id, ...payload }),
    });
    const data = await res.json();

    if (!res.ok || data.success !== true) {
      throw new Error(data.message || "Failed to update");
    }

    Object.assign(item, changes);
    render();

    msg.classList.replace("text-red-800", "text-green-800");
    msg.textContent = "Updated successfully";

    setTimeout(() => {
      closeModal();
      msg.classList.replace("text-green-800", "text-red-800");
    }, 1000);
  } catch (err) {
    console.error(err);
    submit.disabled = false;
    fail(err.message || "Failed to update");
  }
}

// TEXT UPLOAD
text_submit.addEventListener("click", async (e) => {
  if (editing) {
    e.preventDefault();
    submitEdit();
    return;
  }
  e.preventDefault();
  text_submit.disabled = true;
  setTimeout(() => {
    text_submit.disabled = false;
  }, 1500);

  if (!text_title.value || !text_content.value) {
    text_msg.textContent = "Please fill all fields";
    setTimeout(() => {
      text_msg.textContent = "";
    }, 4000);
    return;
  }

  if (text_title.value.length > 100) {
    text_msg.textContent = "Title is too long (max 100 characters)";
    setTimeout(() => {
      text_msg.textContent = "";
    }, 4000);
    return;
  }

  if (text_content.value.length > 10000) {
    text_msg.textContent = "Content is too long (max 10000 characters)";
    setTimeout(() => {
      text_msg.textContent = "";
    }, 4000);
    return;
  }

  const response = await fetch("/upload/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: text_title.value,
      content: text_content.value,
    }),
  });

  const data = await response.json();

  if (data.success) {
    text_msg.classList.replace("text-red-800", "text-green-800");
    text_msg.textContent = "Text uploaded successfully";

    setTimeout(() => {
      text_msg.textContent = "";
      closeModal();
      text_msg.classList.replace("text-green-800", "text-red-800");
    }, 1500);

    text_title.value = "";
    text_content.value = "";
    reload();
  } else {
    text_msg.textContent = data.message;
    setTimeout(() => {
      text_msg.textContent = "";
    }, 4000);
  }
});

// CREDENTIALS UPLOAD
credentials_submit.addEventListener("click", async (e) => {
  if (editing) {
    e.preventDefault();
    submitEdit();
    return;
  }
  e.preventDefault();
  credentials_submit.disabled = true;
  setTimeout(() => {
    credentials_submit.disabled = false;
  }, 2000);

  if (
    !credentials_title.value ||
    !credentials_username.value ||
    !credentials_password.value
  ) {
    credentials_msg.textContent = "Please fill all fields";
    setTimeout(() => {
      credentials_msg.textContent = "";
    }, 4000);
    return;
  }

  if (credentials_title.value.length > 100) {
    credentials_msg.textContent = "Title is too long (max 100 characters)";
    setTimeout(() => {
      credentials_msg.textContent = "";
    }, 4000);
    return;
  }

  if (
    credentials_password.value.length > 100 ||
    credentials_username.value.length > 100
  ) {
    credentials_msg.textContent =
      "Username or password is too long (max 100 characters)";
    setTimeout(() => {
      credentials_msg.textContent = "";
    }, 4000);
    return;
  }

  const response = await fetch("/upload/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: credentials_title.value,
      username: credentials_username.value,
      password: credentials_password.value,
    }),
  });

  const data = await response.json();

  if (data.success) {
    credentials_msg.classList.replace("text-red-800", "text-green-800");
    credentials_msg.textContent = "Credentials uploaded successfully";

    setTimeout(() => {
      credentials_msg.textContent = "";
      closeModal();
      credentials_msg.classList.replace("text-green-800", "text-red-800");
    }, 1500);

    credentials_title.value = "";
    credentials_username.value = "";
    credentials_password.value = "";
    reload();
  } else {
    credentials_msg.textContent = data.message;
    setTimeout(() => {
      credentials_msg.textContent = "";
    }, 4000);
  }
});

// IMAGE FILE SELECTION
image_file.addEventListener("change", () => {
  const fileName = image_file
    .closest("label")
    .querySelector("[data-file-name]");

  if (image_file.files.length > 1) {
    image_msg.textContent = "Only 1 image can be selected";
    image_file.value = "";
    fileName.textContent = "No file selected";
    setTimeout(() => {
      image_msg.textContent = "";
    }, 4000);
    return;
  }

  if (image_file.files.length === 0) {
    fileName.textContent = "No file selected";
    return;
  }

  const file = image_file.files[0];

  if (file.size > MAX_UPLOAD_BYTES) {
    image_msg.textContent = "Image size must be 5 MB or less";
    image_file.value = "";
    fileName.textContent = "No file selected";
    setTimeout(() => {
      image_msg.textContent = "";
    }, 4000);
    return;
  }

  image_msg.textContent = "";
  fileName.textContent = file.name;
});

// DOCUMENT FILE SELECTION
doc_file.addEventListener("change", () => {
  const fileName = doc_file.closest("label").querySelector("[data-file-name]");

  if (doc_file.files.length > 1) {
    doc_msg.textContent = "Only 1 document can be selected";
    doc_file.value = "";
    fileName.textContent = "No file selected";
    setTimeout(() => {
      doc_msg.textContent = "";
    }, 4000);
    return;
  }

  if (doc_file.files.length === 0) {
    fileName.textContent = "No file selected";
    return;
  }

  const file = doc_file.files[0];

  if (file.size > MAX_UPLOAD_BYTES) {
    doc_msg.textContent = "Document size must be 5 MB or less";
    doc_file.value = "";
    fileName.textContent = "No file selected";
    setTimeout(() => {
      doc_msg.textContent = "";
    }, 4000);
    return;
  }

  doc_msg.textContent = "";
  fileName.textContent = file.name;
});

// IMAGE UPLOAD
image_submit.addEventListener("click", async (e) => {
  if (editing) {
    e.preventDefault();
    submitEdit();
    return;
  }
  e.preventDefault();
  image_submit.disabled = true;
  setTimeout(() => {
    image_submit.disabled = false;
  }, 2000);

  if (!image_title.value || !image_file.files.length) {
    image_msg.textContent = "Please fill all fields";
    setTimeout(() => {
      image_msg.textContent = "";
    }, 4000);
    return;
  }

  if (image_title.value.length > 100) {
    image_msg.textContent = "Title is too long (max 100 characters)";
    setTimeout(() => {
      image_msg.textContent = "";
    }, 4000);
    return;
  }

  if (image_file.files.length > 1) {
    image_msg.textContent = "Only 1 image can be selected";
    setTimeout(() => {
      image_msg.textContent = "";
    }, 4000);
    return;
  }

  const file = image_file.files[0];

  if (file.size > MAX_UPLOAD_BYTES) {
    image_msg.textContent = "Image size must be 5 MB or less";
    setTimeout(() => {
      image_msg.textContent = "";
    }, 4000);
    return;
  }

  const formData = new FormData();

  formData.append("title", image_title.value);
  formData.append("file", file);

  const response = await fetch("/upload/image", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    image_msg.classList.replace("text-red-800", "text-green-800");
    image_msg.textContent = "Image uploaded successfully";

    setTimeout(() => {
      image_msg.textContent = "";
      closeModal();
      image_msg.classList.replace("text-green-800", "text-red-800");
    }, 1500);

    image_title.value = "";
    image_file.value = "";
    image_file.closest("label").querySelector("[data-file-name]").textContent =
      "No file selected";
    reload();
  } else {
    image_msg.textContent = data.message;
    setTimeout(() => {
      image_msg.textContent = "";
    }, 4000);
  }
});

// DOCUMENT UPLOAD
doc_submit.addEventListener("click", async (e) => {
  if (editing) {
    e.preventDefault();
    submitEdit();
    return;
  }
  e.preventDefault();
  doc_submit.disabled = true;
  setTimeout(() => {
    doc_submit.disabled = false;
  }, 2000);

  if (!doc_title.value || !doc_file.files.length) {
    doc_msg.textContent = "Please fill all fields";
    setTimeout(() => {
      doc_msg.textContent = "";
    }, 4000);
    return;
  }

  if (doc_title.value.length > 100) {
    doc_msg.textContent = "Title is too long (max 100 characters)";
    setTimeout(() => {
      doc_msg.textContent = "";
    }, 4000);
    return;
  }

  if (doc_file.files.length > 1) {
    doc_msg.textContent = "Only 1 document can be selected";
    setTimeout(() => {
      doc_msg.textContent = "";
    }, 4000);
    return;
  }

  const file = doc_file.files[0];

  if (file.size > 5 * 1024 * 1024) {
    doc_msg.textContent = "Document size must be 5 MB or less";
    setTimeout(() => {
      doc_msg.textContent = "";
    }, 4000);
    return;
  }

  const formData = new FormData();

  formData.append("title", doc_title.value);
  formData.append("file", file);

  const response = await fetch("/upload/doc", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    doc_msg.classList.replace("text-red-800", "text-green-800");
    doc_msg.textContent = "Document uploaded successfully";

    setTimeout(() => {
      doc_msg.textContent = "";
      closeModal();
      doc_msg.classList.replace("text-green-800", "text-red-800");
    }, 1500);

    doc_title.value = "";
    doc_file.value = "";
    doc_file.closest("label").querySelector("[data-file-name]").textContent =
      "No file selected";
    reload();
  } else {
    doc_msg.textContent = data.message;
    setTimeout(() => {
      doc_msg.textContent = "";
    }, 4000);
  }
});
