const meBox = document.getElementById("me");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("search-btn");
const listEl = document.getElementById("list");
const emptyPane = document.getElementById("empty-pane");
const chatPane = document.getElementById("chat-pane");
const chatAvatar = document.getElementById("chat-avatar");
const chatName = document.getElementById("chat-name");
const messagesEl = document.getElementById("messages");
const chatError = document.getElementById("chat-error");
const sendForm = document.getElementById("send-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const backBtn = document.getElementById("back");

const MAX_MESSAGE = 1000;
const MESSAGE_POLL_MS = 4000;
const LIST_POLL_MS = 15000;

let me = ""; // logged in username
let chats = []; // usernames I already chatted with
let found = []; // users found by the backend search
let query = ""; // current text in the search box
let searching = false; // backend search running
let searchError = "";
let searchRun = 0; // lets us ignore answers of an older search
let searchTimer = null;
let listState = "loading"; // loading | ready | error
let listMessage = "";

let activeUser = null; // username of the open chat
let messages = []; // messages from the server for the open chat
let pending = []; // messages that are being sent
let lastSignature = "";
let sending = false;

/* ---------- Helpers ---------- */

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function initial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    /* not json */
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

function toNames(data) {
  const raw = data.users || data.data || data.chats || data.list || [];
  const out = [];

  (Array.isArray(raw) ? raw : []).forEach((item) => {
    const name =
      typeof item === "string" ? item : item && (item.username || item.name);
    if (typeof name === "string" && name && name !== me && !out.includes(name))
      out.push(name);
  });

  return out;
}

// Accepts sender / from / username, message / content / text / value, created_at / time
function toMessages(data) {
  const raw = data.messages || data.data || data.chats || [];

  const list = (Array.isArray(raw) ? raw : [])
    .map((m) => ({
      from: String(m.sender ?? m.from ?? m.sender_username ?? m.username ?? ""),
      text: String(m.message ?? m.content ?? m.text ?? m.value ?? ""),
      time: m.created_at || m.time || m.timestamp || "",
    }))
    .filter((m) => m.text);

  // oldest first (only when every message has a usable time)
  if (list.every((m) => !isNaN(new Date(m.time)))) {
    list.sort((a, b) => new Date(a.time) - new Date(b.time));
  }
  return list;
}

function formatTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === new Date().toDateString()) return time;

  return (
    d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    ", " +
    time
  );
}

function setChatError(text) {
  chatError.textContent = text;
  chatError.classList.toggle("hidden", !text);
}

/* ---------- User list (left side) ---------- */

function listHeading(text) {
  return el(
    "p",
    "px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500",
    text,
  );
}

function listStatus(text, isError) {
  return el(
    "p",
    "px-3 py-3 text-sm " + (isError ? "text-red-500" : "text-neutral-500"),
    text,
  );
}

function userRow(name) {
  const active = name === activeUser;
  const row = el(
    "button",
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-neutral-800 active:bg-neutral-700 " +
      (active ? "bg-neutral-800" : ""),
  );
  row.type = "button";

  row.appendChild(
    el(
      "span",
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-base font-semibold text-blue-400",
      initial(name),
    ),
  );
  row.appendChild(
    el(
      "span",
      "min-w-0 flex-1 truncate text-base font-medium text-neutral-100",
      name,
    ),
  );

  row.addEventListener("click", () => openChat(name));
  return row;
}

function renderList() {
  listEl.replaceChildren();

  if (listState === "loading") {
    listEl.appendChild(listStatus("Loading chats..."));
    return;
  }
  if (listState === "error") {
    listEl.appendChild(listStatus(listMessage, true));
    return;
  }

  const q = query.toLowerCase();

  // 1) instant: filter the chats we already have, 2) backend: other users from the database
  const mine = q ? chats.filter((n) => n.toLowerCase().includes(q)) : chats;
  const others = q ? found.filter((n) => !chats.includes(n)) : [];

  if (!q && !chats.length) {
    const box = el(
      "div",
      "flex flex-col items-center gap-2 px-6 py-12 text-center",
    );
    box.appendChild(
      el("p", "text-base font-medium text-neutral-300", "No chats yet"),
    );
    box.appendChild(
      el(
        "p",
        "text-sm text-neutral-500",
        "Message someone so they appear here. Use the search bar to find a user.",
      ),
    );
    listEl.appendChild(box);
    return;
  }

  if (mine.length) {
    if (q) listEl.appendChild(listHeading("Your chats"));
    mine.forEach((name) => listEl.appendChild(userRow(name)));
  }

  if (!q) return;

  if (others.length) {
    listEl.appendChild(listHeading("Other users"));
    others.forEach((name) => listEl.appendChild(userRow(name)));
  }

  if (searching) {
    listEl.appendChild(listStatus("Searching for more users..."));
  } else if (searchError) {
    listEl.appendChild(listStatus(searchError, true));
  } else if (!mine.length && !others.length) {
    listEl.appendChild(listStatus("No users found"));
  }
}

async function loadChatList() {
  try {
    const data = await postJSON("/chatlist", { username: me });
    chats = toNames(data);
    listState = "ready";
  } catch (err) {
    console.error(err);
    if (listState !== "ready") {
      listState = "error";
      listMessage = err.message;
    }
  }
  renderList();
}

/* ---------- Search (hybrid) ---------- */

function onSearchInput() {
  query = searchInput.value.trim();
  found = [];
  searchError = "";
  searchRun++; // anything still running belongs to an older text
  clearTimeout(searchTimer);

  if (!query) {
    searching = false;
    renderList();
    return;
  }

  searching = true;
  renderList(); // instant part: filters the list already on screen
  searchTimer = setTimeout(runSearch, 350);
}

async function runSearch() {
  clearTimeout(searchTimer);

  query = searchInput.value.trim();
  if (!query) return;

  const run = ++searchRun;
  searching = true;
  searchError = "";
  renderList();

  try {
    const data = await postJSON("/searchusers", { username: me, query });
    if (run !== searchRun) return;
    found = toNames(data);
  } catch (err) {
    if (run !== searchRun) return;
    console.error(err);
    found = [];
    searchError = err.message;
  } finally {
    if (run === searchRun) {
      searching = false;
      renderList();
    }
  }
}

searchInput.addEventListener("input", onSearchInput);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runSearch();
  }
});
searchBtn.addEventListener("click", runSearch);

/* ---------- Conversation (right side) ---------- */

function bubble(m) {
  const mine = m.from === me;
  const wrap = el(
    "div",
    "flex max-w-xs flex-col sm:max-w-md " +
      (mine ? "items-end self-end" : "items-start self-start"),
  );

  wrap.appendChild(
    el(
      "p",
      "whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm " +
        (mine
          ? "rounded-br-md bg-blue-500 text-white"
          : "rounded-bl-md bg-neutral-800 text-neutral-100"),
      m.text,
    ),
  );
  wrap.appendChild(
    el(
      "p",
      "mt-1 text-xs text-neutral-500",
      m.pending ? "Sending..." : formatTime(m.time),
    ),
  );

  return wrap;
}

function renderMessages(forceBottom = false) {
  const nearBottom =
    messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <
    80;

  messagesEl.replaceChildren();

  const all = messages.concat(pending.filter((m) => m.to === activeUser));

  if (!all.length) {
    messagesEl.appendChild(
      el(
        "p",
        "m-auto text-sm text-neutral-500",
        "No messages yet. Say hi to " + activeUser + "!",
      ),
    );
    return;
  }

  all.forEach((m) => messagesEl.appendChild(bubble(m)));

  if (forceBottom || nearBottom) messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadMessages(force = false) {
  const user = activeUser;
  if (!user) return;

  try {
    const data = await postJSON("/getchats", { username: me, chatwith: user });
    if (user !== activeUser) return; // another chat was opened meanwhile

    const list = toMessages(data);
    const last = list[list.length - 1];
    const signature = list.length + "|" + (last ? last.time + last.text : "");

    if (!force && signature === lastSignature) return; // nothing new

    lastSignature = signature;
    messages = list;
    renderMessages(force);
    setChatError("");
  } catch (err) {
    if (user !== activeUser) return;
    console.error(err);
    if (force) {
      messagesEl.replaceChildren(
        el("p", "m-auto text-sm text-red-500", err.message),
      );
    }
  }
}

function openChat(name) {
  activeUser = name;
  messages = [];
  lastSignature = "";
  setChatError("");
  messageInput.value = "";

  chatName.textContent = name;
  chatAvatar.textContent = initial(name);
  messagesEl.replaceChildren(
    el("p", "m-auto text-sm text-neutral-500", "Loading messages..."),
  );

  chatPane.classList.remove("hidden");
  chatPane.classList.add("flex");
  emptyPane.classList.remove("md:flex"); // hide the "click any chat" message

  renderList(); // highlights the open chat
  loadMessages(true);

  // on phones focusing would open the keyboard before the messages are seen
  if (window.matchMedia("(min-width: 48rem)").matches) messageInput.focus();
}

function closeChat() {
  activeUser = null;

  chatPane.classList.add("hidden");
  chatPane.classList.remove("flex");
  emptyPane.classList.add("md:flex");

  renderList();
}

backBtn.addEventListener("click", closeChat);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && activeUser) closeChat();
});

sendForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = messageInput.value.trim();
  if (!text || !activeUser || sending) return;

  if (text.length > MAX_MESSAGE) {
    setChatError("Message is too long (max " + MAX_MESSAGE + " characters)");
    return;
  }

  const to = activeUser;
  const entry = {
    from: me,
    to,
    text,
    time: new Date().toISOString(),
    pending: true,
  };

  setChatError("");
  pending.push(entry);
  messageInput.value = "";
  sending = true;
  sendBtn.disabled = true;
  renderMessages(true);

  try {
    await postJSON("/sendchat", { username: me, chatwith: to, message: text });

    pending = pending.filter((m) => m !== entry);

    // the person now appears (at the top) in my chat list
    chats = [to].concat(chats.filter((n) => n !== to));
    renderList();

    if (to === activeUser) await loadMessages(true);
  } catch (err) {
    console.error(err);
    pending = pending.filter((m) => m !== entry);

    if (to === activeUser) {
      messageInput.value = text; // give the text back so it can be sent again
      setChatError(err.message);
      renderMessages(true);
    }
  } finally {
    sending = false;
    sendBtn.disabled = false;
  }
});

/* ---------- Start ---------- */

async function init() {
  try {
    // same route the dashboard uses: tells us if the user is logged in and the username
    const res = await fetch("/dashboard/data?page=1&type=public");
    const data = await res.json();

    if (!data.login) {
      window.location.href = "/login";
      return;
    }
    me = data.username || "";
  } catch (err) {
    console.error(err);
  }

  if (!me) {
    listState = "error";
    listMessage = "Could not load your account. Please refresh the page.";
    renderList();
    return;
  }

  meBox.replaceChildren(
    el(
      "div",
      "flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-400",
      initial(me),
    ),
    el("span", "", me),
  );
  meBox.classList.remove("hidden");
  meBox.classList.add("flex");

  await loadChatList();
}

// new messages without refreshing (paused while the tab is hidden)
setInterval(() => {
  if (!document.hidden && me && activeUser && !sending) loadMessages();
}, MESSAGE_POLL_MS);

setInterval(() => {
  if (!document.hidden && me && listState === "ready") loadChatList();
}, LIST_POLL_MS);

renderList();
init();
