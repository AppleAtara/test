// Apple Social Prompt Studio - Mobile-first mini SPA
// No build tools. Just fetch templates.json + render.

const state = {
  data: null,
  view: "dashboard", // dashboard | template | builder
  search: "",
  selectedCategory: null,
  selectedTemplateId: null,
  lastGeneratedPrompt: "",
  form: {
    product: "iPhone 17 Pro Max",
    mood: "Luxury",
    festival: "None",
    promoText: "ผ่อน 0% นานสุด 36 เดือน*",
    store: "Advice อาทาระมอลล์ ศรีราชา",
    contact: "LINE: @____ | โทร: ____",
    ratio: "4:5",
    presetId: "apple_clean"
  }
};

const $ = (id) => document.getElementById(id);

init();

async function init() {
  bindGlobalUI();

  const res = await fetch("./templates.json", { cache: "no-store" });
  state.data = await res.json();

  // Brand lock default
  if (state.data?.meta?.brandLock) {
    state.form.store = state.data.meta.brandLock;
  }

  render();
}

function bindGlobalUI() {
  $("searchInput").addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    state.view = "dashboard";
    render();
  });

  $("btnClearSearch").addEventListener("click", () => {
    state.search = "";
    $("searchInput").value = "";
    render();
  });

  $("btnQuickGenerate").addEventListener("click", () => {
    // If in builder → generate from current form + selected template/preset
    // If not in builder → pick first matching template and generate
    const tpl = getSelectedTemplate() || getFirstTemplateMatch();
    if (!tpl) return toast("ยังไม่มีเทมเพลตให้ Generate");
    state.selectedTemplateId = tpl.id;
    const prompt = buildPrompt(tpl);
    state.lastGeneratedPrompt = prompt;
    render();
    toast("Generate แล้ว ✅");
  });

  $("btnCopy").addEventListener("click", async () => {
    const text = state.lastGeneratedPrompt || "";
    if (!text) return toast("ยังไม่มีข้อความให้คัดลอก");
    await copyToClipboard(text);
    toast("คัดลอกแล้ว ✅");
  });

  $("btnAbout").addEventListener("click", () => {
    alert("Apple Social Prompt Studio\n\nMobile-first Prompt CMS สำหรับพนักงานขาย\nWorkflow: เลือกหมวด → ปรับฟอร์ม → Generate → Copy ไปวาง Gemini");
  });
}

function render() {
  const root = $("appRoot");
  if (!state.data) {
    root.innerHTML = `<div class="text-sm text-slate-600">กำลังโหลด…</div>`;
    return;
  }

  if (state.view === "dashboard") root.innerHTML = renderDashboard();
  if (state.view === "template") root.innerHTML = renderTemplateDetail();
  if (state.view === "builder") root.innerHTML = renderBuilder();

  // Keep last generated prompt visible somewhere when exists
  attachHandlers();
}

function renderDashboard() {
  const { categories, templates } = state.data;
  const q = state.search.toLowerCase();

  const filteredTemplates = templates.filter(t => {
    if (!q) return true;
    return (t.title + " " + t.category + " " + t.prompt).toLowerCase().includes(q);
  });

  const categoryCards = categories.map(c => {
    const count = templates.filter(t => t.category === c.id).length;
    return `
      <button data-cat="${c.id}"
        class="rounded-2xl bg-white border border-slate-200 p-4 text-left active:scale-[0.99]">
        <div class="text-2xl">${c.icon}</div>
        <div class="mt-2 font-semibold">${c.name}</div>
        <div class="text-xs text-slate-600">${count} Templates</div>
      </button>
    `;
  }).join("");

  const list = filteredTemplates.slice(0, 12).map(t => `
    <button data-template="${t.id}"
      class="w-full rounded-2xl bg-white border border-slate-200 p-4 text-left active:scale-[0.99]">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="font-semibold">${escapeHtml(t.title)}</div>
          <div class="text-xs text-slate-600">หมวด: ${labelCategory(t.category)}</div>
        </div>
        <div class="text-xs px-3 py-2 rounded-xl bg-slate-900 text-white">เปิด</div>
      </div>
    </button>
  `).join("");

  return `
    <section>
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold">หมวดหมู่</h2>
        <span class="text-xs text-slate-600">แตะเพื่อเลือก</span>
      </div>
      <div class="mt-3 grid grid-cols-2 gap-3">
        ${categoryCards}
      </div>
    </section>

    <section class="mt-6">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold">${state.search ? "ผลการค้นหา" : "เทมเพลตแนะนำ"}</h2>
        <span class="text-xs text-slate-600">${filteredTemplates.length} รายการ</span>
      </div>
      <div class="mt-3 flex flex-col gap-3">
        ${list || `<div class="text-sm text-slate-600">ไม่พบเทมเพลต</div>`}
      </div>
    </section>

    ${renderPreviewPanel()}
  `;
}

function renderTemplateDetail() {
  const tpl = getSelectedTemplate();
  if (!tpl) {
    state.view = "dashboard";
    return renderDashboard();
  }

  const example = buildPrompt(tpl);

  return `
    <section class="rounded-2xl bg-white border border-slate-200 p-4">
      <div class="text-xs text-slate-600">หมวด: ${labelCategory(tpl.category)}</div>
      <div class="mt-1 text-lg font-semibold">${escapeHtml(tpl.title)}</div>

      <div class="mt-4">
        <div class="text-sm font-semibold">ตัวอย่าง Prompt</div>
        <pre class="mt-2 whitespace-pre-wrap text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 leading-relaxed">${escapeHtml(example)}</pre>
      </div>

      <div class="mt-4 flex gap-2">
        <button data-go="builder"
          class="flex-1 rounded-2xl bg-slate-900 text-white py-3 text-sm font-semibold active:scale-[0.99]">
          ปรับแต่ง
        </button>
        <button data-copy="${tpl.id}"
          class="w-32 rounded-2xl bg-white border border-slate-200 py-3 text-sm font-semibold active:scale-[0.99]">
          คัดลอก
        </button>
      </div>
    </section>

    ${renderPreviewPanel()}
  `;
}

function renderBuilder() {
  const tpl = getSelectedTemplate() || getFirstTemplateMatch();
  if (!tpl) return `<div class="text-sm text-slate-600">ไม่พบเทมเพลต</div>`;

  const presets = state.data.presets.map(p => `
    <option value="${p.id}" ${p.id === state.form.presetId ? "selected" : ""}>${p.name}</option>
  `).join("");

  const ratios = ["1:1", "4:5", "16:9"].map(r => `
    <option value="${r}" ${r === state.form.ratio ? "selected" : ""}>${r}</option>
  `).join("");

  const moods = ["Luxury", "Minimal", "Dynamic", "Cute", "Trustworthy"].map(m => `
    <option value="${m}" ${m === state.form.mood ? "selected" : ""}>${m}</option>
  `).join("");

  const festival = ["None", "New Year", "Valentine", "Songkran", "Mother's Day", "Christmas", "Chinese New Year"].map(f => `
    <option value="${f}" ${f === state.form.festival ? "selected" : ""}>${f}</option>
  `).join("");

  const live = buildPrompt(tpl);
  state.lastGeneratedPrompt = live;

  return `
    <section class="rounded-2xl bg-white border border-slate-200 p-4">
      <div class="text-xs text-slate-600">กำลังแก้ไข: ${escapeHtml(tpl.title)}</div>
      <div class="mt-1 text-lg font-semibold">Prompt Builder</div>

      <div class="mt-4 grid gap-3">
        ${field("เลือกรุ่นสินค้า", "product", state.form.product, "เช่น iPhone 17, MacBook Air M4")}
        ${selectField("Apple Style Preset", "presetId", presets)}
        ${selectField("Mood", "mood", moods)}
        ${selectField("Festival", "festival", festival)}
        ${textarea("ข้อความโปร", "promoText", state.form.promoText, "เช่น ผ่อน 0% นานสุด 36 เดือน* | Flash Sale วันนี้เท่านั้น")}
        ${field("ชื่อร้าน", "store", state.form.store, "ล็อกเป็นสาขา Advice อาทาระมอลล์ ศรีราชา")}
        ${field("เบอร์/Line", "contact", state.form.contact, "เช่น LINE: @advice_sriracha | โทร: 0xx-xxx-xxxx")}
        ${selectField("สัดส่วนภาพ", "ratio", ratios)}
      </div>

      <div class="mt-5">
        <div class="text-sm font-semibold">Live Preview (พร้อม Copy ไปวาง Gemini)</div>
        <pre id="livePreview" class="mt-2 whitespace-pre-wrap text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 leading-relaxed">${escapeHtml(live)}</pre>

        <div class="mt-3 flex gap-2">
          <button data-generate="1"
            class="flex-1 rounded-2xl bg-slate-900 text-white py-3 text-sm font-semibold active:scale-[0.99]">
            Generate
          </button>
          <button data-copy-live="1"
            class="w-32 rounded-2xl bg-white border border-slate-200 py-3 text-sm font-semibold active:scale-[0.99]">
            Copy
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderPreviewPanel() {
  const has = !!state.lastGeneratedPrompt;
  return `
    <section class="mt-6">
      <div class="text-sm font-semibold">Prompt ล่าสุด</div>
      <div class="mt-2 rounded-2xl bg-white border border-slate-200 p-3">
        <pre class="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">${has ? escapeHtml(state.lastGeneratedPrompt) : "ยังไม่มี — ลองกด Quick Generate ด้านล่าง"}</pre>
      </div>
    </section>
  `;
}

function attachHandlers() {
  // Category click
  document.querySelectorAll("[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-cat");
      state.selectedCategory = cat;
      // Open first template in category
      const tpl = state.data.templates.find(t => t.category === cat);
      if (tpl) {
        state.selectedTemplateId = tpl.id;
        state.view = "template";
      }
      render();
    });
  });

  // Template card click
  document.querySelectorAll("[data-template]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.selectedTemplateId = btn.getAttribute("data-template");
      state.view = "template";
      render();
    });
  });

  // Go builder
  document.querySelectorAll("[data-go='builder']").forEach(btn => {
    btn.addEventListener("click", () => {
      state.view = "builder";
      render();
    });
  });

  // Copy from template detail
  document.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy");
      const tpl = state.data.templates.find(t => t.id === id);
      const text = tpl ? buildPrompt(tpl) : "";
      if (!text) return toast("คัดลอกไม่สำเร็จ");
      state.lastGeneratedPrompt = text;
      await copyToClipboard(text);
      toast("คัดลอกแล้ว ✅");
      render();
    });
  });

  // Builder inputs
  document.querySelectorAll("[data-field]").forEach(el => {
    el.addEventListener("input", () => {
      const key = el.getAttribute("data-field");
      state.form[key] = el.value;
      // Auto refresh preview
      const tpl = getSelectedTemplate() || getFirstTemplateMatch();
      if (tpl) state.lastGeneratedPrompt = buildPrompt(tpl);
      const preview = $("livePreview");
      if (preview) preview.textContent = state.lastGeneratedPrompt;
    });
  });

  // Generate in builder
  document.querySelectorAll("[data-generate='1']").forEach(btn => {
    btn.addEventListener("click", () => {
      const tpl = getSelectedTemplate() || getFirstTemplateMatch();
      if (!tpl) return toast("ไม่มีเทมเพลต");
      state.lastGeneratedPrompt = buildPrompt(tpl);
      const preview = $("livePreview");
      if (preview) preview.textContent = state.lastGeneratedPrompt;
      toast("Generate แล้ว ✅");
      render();
    });
  });

  // Copy in builder
  document.querySelectorAll("[data-copy-live='1']").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!state.lastGeneratedPrompt) return toast("ยังไม่มีข้อความ");
      await copyToClipboard(state.lastGeneratedPrompt);
      toast("คัดลอกแล้ว ✅");
    });
  });
}

function getSelectedTemplate() {
  if (!state.selectedTemplateId) return null;
  return state.data.templates.find(t => t.id === state.selectedTemplateId) || null;
}

function getFirstTemplateMatch() {
  const q = state.search.toLowerCase();
  const list = state.data.templates.filter(t => {
    if (!q) return true;
    return (t.title + " " + t.category + " " + t.prompt).toLowerCase().includes(q);
  });
  return list[0] || state.data.templates[0] || null;
}

function buildPrompt(tpl) {
  const preset = state.data.presets.find(p => p.id === state.form.presetId);
  const style = preset ? preset.style : "clean Apple marketing aesthetic";

  // festival helper: if template already specifies theme, keep it. Otherwise inject user festival.
  const festivalLine = state.form.festival && state.form.festival !== "None"
    ? ` Theme: ${state.form.festival}.`
    : "";

  let out = tpl.prompt;
  out = out.replaceAll("{style}", style);
  out = out.replaceAll("{product}", state.form.product);
  out = out.replaceAll("{mood}", state.form.mood);
  out = out.replaceAll("{festival}", state.form.festival);
  out = out.replaceAll("{promoText}", state.form.promoText);
  out = out.replaceAll("{store}", state.form.store);
  out = out.replaceAll("{contact}", state.form.contact);
  out = out.replaceAll("{ratio}", state.form.ratio);

  // If template doesn't mention Theme: and user selected festival, append softly.
  if (!/Theme:/i.test(out) && festivalLine) out += festivalLine;

  // Add “Nanobanana-friendly” ending lock
  out += " Output: single image poster, no watermarks, readable Thai typography spacing, keep safe margins for text, professional advertising quality.";

  return out.trim();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // fallback
    const proxy = $("clipboardProxy");
    proxy.value = text;
    proxy.select();
    document.execCommand("copy");
    proxy.value = "";
    return true;
  }
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.add("hidden"), 1400);
}

function labelCategory(id) {
  const c = state.data.categories.find(x => x.id === id);
  return c ? c.name : id;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function field(label, key, value, placeholder) {
  return `
    <label class="grid gap-1">
      <span class="text-xs font-semibold text-slate-700">${label}</span>
      <input data-field="${key}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"
        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
    </label>
  `;
}

function textarea(label, key, value, placeholder) {
  return `
    <label class="grid gap-1">
      <span class="text-xs font-semibold text-slate-700">${label}</span>
      <textarea data-field="${key}" rows="3" placeholder="${escapeAttr(placeholder)}"
        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function selectField(label, key, optionsHtml) {
  return `
    <label class="grid gap-1">
      <span class="text-xs font-semibold text-slate-700">${label}</span>
      <select data-field="${key}"
        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
        ${optionsHtml}
      </select>
    </label>
  `;
}

function escapeAttr(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
