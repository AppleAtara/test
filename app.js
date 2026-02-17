const state = {
  data: null,
  screen: "LIBRARY", // LIBRARY | EDITOR | OUTPUT
  search: "",
  selectedTemplateId: null,
  lastPrompt: "",
  form: {
    product: "iPhone 17 Pro Max",
    promoType: "ผ่อน 0%",
    promoText: "ผ่อน 0% นานสุด 36 เดือน*",
    mood: "Luxury",
    festival: "None",
    ratio: "4:5",
    presetId: "apple_clean",
    store: "Advice อาทาระมอลล์ ศรีราชา",
    contact: "LINE: @____ | โทร: ____"
  }
};

init();

async function init() {
  bindTopUI();
  bindBottomUI();

  const res = await fetch("./templates.json", { cache: "no-store" });
  state.data = await res.json();

  if (state.data?.meta?.brandLock) state.form.store = state.data.meta.brandLock;

  const toggle = document.getElementById("toggleUnlimited");
  toggle.checked = isUnlimited();
  toggle.addEventListener("change", () => {
    setUnlimited(toggle.checked);
    updateQuotaUI();
    updateBottomCTA();
    toast(toggle.checked ? "เปิดโหมดไม่จำกัด ✅" : "กลับสู่โควต้าฟรี");
  });

  updateQuotaUI();
  updateBottomCTA();
  render();
}

function bindTopUI() {
  const search = document.getElementById("searchInput");
  const back = document.getElementById("btnBack");

  search.addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    state.screen = "LIBRARY";
    render();
  });

  back.addEventListener("click", () => {
    if (state.screen === "OUTPUT") state.screen = "EDITOR";
    else if (state.screen === "EDITOR") state.screen = "LIBRARY";
    render();
  });
}

function bindBottomUI() {
  document.getElementById("btnFreeUse").addEventListener("click", () => {
    if (state.screen !== "EDITOR") {
      toast("ไปหน้าแก้ไขก่อนนะครับ");
      return;
    }

    const tpl = getSelectedTemplate();
    if (!tpl) return toast("ยังไม่ได้เลือกเทมเพลต");

    if (!isUnlimited()) {
      const ok = consumeQuota();
      updateQuotaUI();
      if (!ok) return;
    }

    state.lastPrompt = buildPrompt(tpl);
    state.screen = "OUTPUT";
    render();
    toast(isUnlimited() ? "Generate แล้ว ✅" : "ใช้โควต้าฟรีแล้ว ✅");
  });

  document.getElementById("btnCopy").addEventListener("click", async () => {
    if (!state.lastPrompt) return toast("ยังไม่มี Prompt ให้คัดลอก");
    await copyToClipboard(state.lastPrompt);
    toast("คัดลอกแล้ว ✅");
  });
}

function render() {
  const root = document.getElementById("appRoot");
  const back = document.getElementById("btnBack");

  back.classList.toggle("hidden", state.screen === "LIBRARY");

  if (!state.data) {
    root.innerHTML = `<div class="text-sm text-slate-600">กำลังโหลด…</div>`;
    return;
  }

  if (state.screen === "LIBRARY") root.innerHTML = renderLibrary();
  if (state.screen === "EDITOR") root.innerHTML = renderEditor();
  if (state.screen === "OUTPUT") root.innerHTML = renderOutput();

  updateBottomCTA();
  attachHandlers();
}

function renderLibrary() {
  const { rows, templates } = state.data;
  const q = state.search.toLowerCase();

  const filtered = templates.filter((t) => {
    if (!q) return true;
    return (t.title + " " + t.row).toLowerCase().includes(q);
  });

  const rowHtml = rows.map((r) => {
    const list = filtered.filter((t) => t.row === r.id);
    if (!list.length) return "";

    const cards = list.map((t) => `
      <button data-template="${t.id}"
        class="min-w-[220px] max-w-[220px] rounded-2xl border border-slate-200 bg-white overflow-hidden active:scale-[0.99]">
        <div class="h-32 bg-slate-100">
          <img src="${t.thumb}" class="h-32 w-full object-cover" alt="${escapeAttr(t.title)}">
        </div>
        <div class="p-3 text-left">
          <div class="text-sm font-semibold line-clamp-2">${escapeHtml(t.title)}</div>
          <div class="mt-1 text-xs text-slate-500">แตะเพื่อเลือก</div>
        </div>
      </button>
    `).join("");

    return `
      <section class="mt-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">${r.icon} ${r.title}</div>
          <div class="text-xs text-slate-500">${list.length} แบบ</div>
        </div>
        <div class="mt-3 flex gap-3 overflow-x-auto pb-2">
          ${cards}
        </div>
      </section>
    `;
  }).join("");

  return `
    <div class="text-sm text-slate-600">
      เลือกเทมเพลต Apple → ปรับรายละเอียด → กดใช้โควต้าฟรี → Copy ไปวาง Gemini Nanobanana
    </div>
    ${rowHtml || `<div class="mt-4 text-sm text-slate-600">ไม่พบเทมเพลต</div>`}
  `;
}

function renderEditor() {
  const tpl = getSelectedTemplate();
  if (!tpl) {
    state.screen = "LIBRARY";
    return renderLibrary();
  }

  const dd = state.data.dropdowns;
  const presets = state.data.presets.map((p) => option(p.id, p.name, state.form.presetId)).join("");

  return `
    <section class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div class="h-44 bg-slate-100">
        <img src="${tpl.thumb}" class="h-44 w-full object-cover" alt="${escapeAttr(tpl.title)}">
      </div>
      <div class="p-4">
        <div class="text-xs text-slate-500">กำลังแก้ไขเทมเพลต</div>
        <div class="text-lg font-semibold">${escapeHtml(tpl.title)}</div>

        <div class="mt-4 grid gap-3">
          ${selectField("รุ่นสินค้า", "product", dd.products, state.form.product)}
          ${selectField("ประเภทโปร", "promoType", dd.promoTypes, state.form.promoType)}
          ${textField("ข้อความโปร", "promoText", state.form.promoText, "เช่น ลดเพิ่ม / ผ่อน 0% / วันนี้เท่านั้น")}
          ${selectField("Mood", "mood", dd.moods, state.form.mood)}
          ${selectField("Festival", "festival", dd.festivals, state.form.festival)}
          ${selectField("สัดส่วนภาพ", "ratio", dd.ratios, state.form.ratio)}
          ${selectPreset("Apple Style Preset", "presetId", presets)}
          ${textField("ชื่อร้าน (ล็อกสาขาได้)", "store", state.form.store, "")}
          ${textField("เบอร์/Line", "contact", state.form.contact, "LINE: ... | โทร: ...")}
        </div>

        <div class="mt-4">
          <div class="text-sm font-semibold">Live Preview (ยังไม่ปล่อย Prompt จนกดโควต้าฟรี)</div>
          <pre class="mt-2 whitespace-pre-wrap text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 leading-relaxed">${escapeHtml(buildPrompt(tpl))}</pre>
        </div>

        <div class="mt-4 text-xs text-slate-500">
          * กดปุ่มด้านล่างเพื่อไปหน้า Prompt ที่คัดลอกได้
        </div>
      </div>
    </section>
  `;
}

function renderOutput() {
  const tpl = getSelectedTemplate();
  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-4">
      <div class="text-xs text-slate-500">Prompt สำหรับ Gemini Nanobanana</div>
      <div class="mt-1 text-lg font-semibold">${tpl ? escapeHtml(tpl.title) : "Prompt"}</div>

      <pre class="mt-3 whitespace-pre-wrap text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 leading-relaxed">${escapeHtml(state.lastPrompt || "")}</pre>

      <div class="mt-3 flex gap-2">
        <button data-go="editor"
          class="flex-1 rounded-2xl bg-white border border-slate-200 py-3 text-sm font-semibold active:scale-[0.99]">
          แก้ไขอีกครั้ง
        </button>
        <button data-copy="1"
          class="w-32 rounded-2xl bg-slate-900 text-white py-3 text-sm font-semibold active:scale-[0.99]">
          Copy
        </button>
      </div>
    </section>
  `;
}

function attachHandlers() {
  document.querySelectorAll("[data-template]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedTemplateId = btn.getAttribute("data-template");
      state.screen = "EDITOR";
      render();
    });
  });

  document.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("change", () => {
      const k = el.getAttribute("data-field");
      state.form[k] = el.value;
      render();
    });
    el.addEventListener("input", () => {
      const k = el.getAttribute("data-field");
      state.form[k] = el.value;
    });
  });

  document.querySelectorAll("[data-go='editor']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.screen = "EDITOR";
      render();
    });
  });

  document.querySelectorAll("[data-copy='1']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!state.lastPrompt) return toast("ยังไม่มี Prompt");
      await copyToClipboard(state.lastPrompt);
      toast("คัดลอกแล้ว ✅");
    });
  });

  updateQuotaUI();
}

function buildPrompt(tpl) {
  const preset = state.data.presets.find((p) => p.id === state.form.presetId);
  const style = preset ? preset.style : "clean Apple marketing aesthetic";

  const tailLock = " Output: single image poster, no watermark, high readability, keep safe margins for Thai text, professional advertising quality.";

  let out = tpl.basePrompt;
  out = out.replaceAll("{style}", style);
  out = out.replaceAll("{product}", state.form.product);
  out = out.replaceAll("{promoText}", `${state.form.promoType}: ${state.form.promoText}`);
  out = out.replaceAll("{mood}", state.form.mood);
  out = out.replaceAll("{festival}", state.form.festival);
  out = out.replaceAll("{ratio}", state.form.ratio);
  out = out.replaceAll("{store}", state.form.store);
  out = out.replaceAll("{contact}", state.form.contact);

  if (state.form.festival !== "None" && !/Theme:/i.test(out)) {
    out += ` Theme: ${state.form.festival}.`;
  }

  return (out + tailLock).trim();
}

function getSelectedTemplate() {
  if (!state.selectedTemplateId) return null;
  return state.data.templates.find((t) => t.id === state.selectedTemplateId) || null;
}

function quotaKey() { return "apple_prompt_quota_v1"; }
function unlimitedKey() { return "apple_prompt_unlimited_v1"; }

function isUnlimited() {
  return localStorage.getItem(unlimitedKey()) === "1";
}

function setUnlimited(on) {
  localStorage.setItem(unlimitedKey(), on ? "1" : "0");
}

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getQuota() {
  const perDay = Number(state.data?.meta?.freeQuotaPerDay ?? 3);
  const raw = localStorage.getItem(quotaKey());
  let obj = raw ? JSON.parse(raw) : null;
  const t = todayKey();

  if (!obj || obj.day !== t) {
    obj = { day: t, used: 0, perDay };
    localStorage.setItem(quotaKey(), JSON.stringify(obj));
  }
  obj.perDay = perDay;
  return obj;
}

function consumeQuota() {
  const q = getQuota();
  if (q.used >= q.perDay) {
    toast("โควต้าฟรีหมดแล้ว (รีเซ็ตพรุ่งนี้)");
    return false;
  }
  q.used += 1;
  localStorage.setItem(quotaKey(), JSON.stringify(q));
  return true;
}

function updateBottomCTA() {
  const btn = document.getElementById("btnFreeUse");
  btn.textContent = isUnlimited() ? "Generate Prompt" : "ใช้โควต้าฟรี";
}

function updateQuotaUI() {
  const label = document.getElementById("quotaLabel");
  const pill = document.getElementById("togglePill");
  const dot = document.getElementById("toggleDot");

  if (isUnlimited()) {
    label.textContent = "Unlimited";
    if (pill && dot) {
      pill.classList.remove("bg-slate-200");
      pill.classList.add("bg-slate-900");
      dot.style.left = "1.5rem";
    }
    return;
  }

  const q = state.data ? getQuota() : { used: 0, perDay: 0 };
  const left = Math.max(0, q.perDay - q.used);
  label.textContent = `${left}/${q.perDay} วันนี้`;

  if (pill && dot) {
    pill.classList.remove("bg-slate-900");
    pill.classList.add("bg-slate-200");
    dot.style.left = "0.125rem";
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const proxy = document.getElementById("clipboardProxy");
    proxy.value = text;
    proxy.select();
    document.execCommand("copy");
    proxy.value = "";
    return true;
  }
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.add("hidden"), 1400);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function option(value, label, selected) {
  return `<option value="${escapeAttr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function escapeAttr(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function selectField(label, key, arr, selected) {
  const opts = arr.map((v) => option(v, v, selected)).join("");
  return `
    <label class="grid gap-1">
      <span class="text-xs font-semibold text-slate-700">${label}</span>
      <select data-field="${key}" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
        ${opts}
      </select>
    </label>
  `;
}

function selectPreset(label, key, optionsHtml) {
  return `
    <label class="grid gap-1">
      <span class="text-xs font-semibold text-slate-700">${label}</span>
      <select data-field="${key}" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
        ${optionsHtml}
      </select>
    </label>
  `;
}

function textField(label, key, value, placeholder) {
  return `
    <label class="grid gap-1">
      <span class="text-xs font-semibold text-slate-700">${label}</span>
      <input data-field="${key}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"
        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
    </label>
  `;
}
