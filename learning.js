/* Local learning tools. No accounts, telemetry, or external dependencies. */
(() => {
  "use strict";
  const lab = window.MathLab;
  if (!lab) return;
  const $ = id => document.getElementById(id);
  const storageKey = "mathlab.learning.v1";
  const courses = {common: "共同必修", A: "數學 A", advanced: "數學甲", enrichment: "延伸探索"};
  const moduleById = new Map(lab.modules.map(module => [module.id, module]));
  const forbidden = new Set(["__proto__", "prototype", "constructor"]);
  let records = Object.create(null);
  let noteModuleId = lab.getCurrentModule().id;
  let saveTimer;
  let noticeTimer;
  let formulasVisible = true;
  let previousFormulaVisibility = true;
  let storageAvailable = true;

  function notify(message) {
    const notice = $("appNotice");
    clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.hidden = false;
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 6500);
  }

  function plainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }

  function assertKeys(value, permitted, label) {
    if (!plainObject(value)) throw new Error(`${label}格式錯誤`);
    for (const key of Object.keys(value)) {
      if (forbidden.has(key) || !permitted.includes(key)) throw new Error(`${label}含有不支援的欄位`);
    }
  }

  function validateRecords(value) {
    if (!plainObject(value) || Object.keys(value).length > lab.modules.length) throw new Error("筆記清單格式錯誤");
    const result = Object.create(null);
    for (const [id, record] of Object.entries(value)) {
      if (forbidden.has(id) || !moduleById.has(id)) throw new Error("筆記含有不存在的模組");
      assertKeys(record, ["note", "favorite", "practiced", "updatedAt"], "筆記");
      if (typeof record.note !== "string" || record.note.length > 10000 ||
          typeof record.favorite !== "boolean" || typeof record.practiced !== "boolean" ||
          typeof record.updatedAt !== "string" || record.updatedAt.length > 40 ||
          !Number.isFinite(Date.parse(record.updatedAt)) ||
          new Date(record.updatedAt).toISOString() !== record.updatedAt) throw new Error("筆記內容或日期格式錯誤");
      result[id] = {note: record.note, favorite: record.favorite, practiced: record.practiced, updatedAt: record.updatedAt};
    }
    return result;
  }

  function getRecord(id) {
    return records[id] || {note: "", favorite: false, practiced: false, updatedAt: new Date().toISOString()};
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(storageKey, JSON.stringify({version: 1, records}));
      storageAvailable = true;
      $("noteStatus").textContent = "已儲存到這個瀏覽器。";
      return true;
    } catch {
      storageAvailable = false;
      $("noteStatus").textContent = "瀏覽器無法儲存；本次紀錄仍可匯出備份。";
      return false;
    }
  }

  function updateRecord(id, changes, immediate = true) {
    records[id] = {...getRecord(id), ...changes, updatedAt: new Date().toISOString()};
    if (immediate) persist();
    else {
      $("noteStatus").textContent = "正在儲存……";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(persist, 350);
    }
  }

  function readSaved() {
    try {
      const text = localStorage.getItem(storageKey);
      if (!text) return;
      if (text.length > 4 * 1024 * 1024) throw new Error("紀錄檔過大");
      const saved = JSON.parse(text);
      assertKeys(saved, ["version", "records"], "本機紀錄");
      if (saved.version !== 1) throw new Error("紀錄版本不支援");
      records = validateRecords(saved.records);
    } catch {
      storageAvailable = false;
      $("noteStatus").textContent = "現有紀錄無法讀取；請保留備份後再匯入。";
      notify("本機紀錄無法讀取，現有資料尚未覆寫。你仍可使用互動模組。");
    }
  }

  function renderCounters() {
    $("moduleCount").textContent = String(lab.modules.length);
    $("practiceCount").textContent = String(Object.values(records).filter(record => record.practiced).length);
    $("favoriteCount").textContent = String(Object.values(records).filter(record => record.favorite).length);
  }

  function filteredModules() {
    const query = $("moduleSearch").value.trim().toLocaleLowerCase();
    const course = $("courseFilter").value;
    const topic = $("topicFilter").value;
    return lab.modules.filter(module => {
      const searchText = module.searchText || [module.title, module.short, module.tag, module.examSignal, module.prompt].join(" ").toLocaleLowerCase();
      return (!query || searchText.includes(query)) &&
        (course === "all" || module.course === course || module.courses?.includes(course)) &&
        (topic === "all" || module.tag === topic) &&
        (!$("favoritesOnly").checked || getRecord(module.id).favorite);
    });
  }

  function resetFilters() {
    $("moduleSearch").value = "";
    $("courseFilter").value = "all";
    $("topicFilter").value = "all";
    $("favoritesOnly").checked = false;
    renderNavigation();
  }

  function renderNavigation() {
    const list = $("moduleList");
    const focusedId = list.contains(document.activeElement) ? document.activeElement.dataset.moduleId : null;
    const visible = filteredModules();
    const currentId = lab.getCurrentModule().id;
    const fragment = document.createDocumentFragment();
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "module-empty";
      const message = document.createElement("p");
      message.textContent = $("favoritesOnly").checked ? "目前篩選內還沒有收藏。點選模組旁的「收藏」可建立自己的清單。" : "找不到符合的模組。試試其他關鍵字，或清除篩選。";
      empty.append(message);
      const reset = document.createElement("button");
      reset.type = "button";
      reset.textContent = "顯示全部模組";
      reset.addEventListener("click", resetFilters);
      empty.append(reset);
      fragment.append(empty);
    }
    for (const module of visible) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `module-button${module.id === currentId ? " active" : ""}`;
      button.dataset.moduleId = module.id;
      if (module.id === currentId) button.setAttribute("aria-current", "true");
      const title = document.createElement("strong");
      title.textContent = module.short || module.title;
      const badges = document.createElement("span");
      badges.className = "module-badges";
      const topic = document.createElement("span");
      topic.textContent = module.tag;
      const mark = document.createElement("span");
      mark.className = "module-mark";
      const record = getRecord(module.id);
      mark.textContent = [record.favorite ? "★ 收藏" : "", record.practiced ? "✓ 已練習" : ""].filter(Boolean).join(" · ");
      badges.append(topic, mark);
      const course = document.createElement("span");
      course.textContent = courses[module.course] || "教學探索";
      button.append(title, badges, course);
      button.addEventListener("click", () => {
        if (saveTimer) persist();
        lab.selectModule(module.id);
        const next = [...list.querySelectorAll("button[data-module-id]")].find(item => item.dataset.moduleId === module.id);
        next?.focus({preventScroll: true});
      });
      fragment.append(button);
    }
    list.replaceChildren(fragment);
    $("filterCount").textContent = `${visible.length} / ${lab.modules.length} 個模組`;
    if (focusedId) [...list.querySelectorAll("button[data-module-id]")].find(button => button.dataset.moduleId === focusedId)?.focus({preventScroll: true});
  }

  function renderCurrentLearning() {
    const module = lab.getCurrentModule();
    noteModuleId = module.id;
    const record = getRecord(module.id);
    $("moduleNotes").value = record.note;
    $("moduleNotes").setAttribute("aria-label", `${module.short || module.title}的實驗筆記`);
    $("practicedCheck").checked = record.practiced;
    $("favoriteBtn").setAttribute("aria-pressed", String(record.favorite));
    $("favoriteBtn").textContent = record.favorite ? "★ 已收藏" : "☆ 收藏";
    $("currentCourse").textContent = courses[module.course] || "教學探索";
    if (storageAvailable) $("noteStatus").textContent = record.note ? "筆記已儲存到這個瀏覽器。" : "筆記只儲存在這個瀏覽器。";
    if ($("teacherMode").checked) setFormulaVisibility(false);
    renderCounters();
  }

  function setFormulaVisibility(visible) {
    formulasVisible = visible;
    $("formulaBox").hidden = !visible;
    $("formulaHiddenHint").hidden = visible;
    $("formulaToggle").textContent = visible ? "先隱藏公式" : "揭示公式";
    $("formulaToggle").setAttribute("aria-expanded", String(visible));
  }

  function setTeacherMode(enabled) {
    if (enabled) previousFormulaVisibility = formulasVisible;
    document.body.classList.toggle("teacher-mode", enabled);
    setFormulaVisibility(enabled ? false : previousFormulaVisibility);
    window.dispatchEvent(new Event("resize"));
    notify(enabled ? "已開啟課堂投影模式。先讓學生預測，再揭示公式。" : "已回到一般探索模式。");
  }

  function exportBackup() {
    if (saveTimer) persist();
    const state = lab.getState();
    const backup = {version: 1, moduleId: state.moduleId, parameters: state.parameters, records};
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const date = new Intl.DateTimeFormat("sv-SE", {timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
    link.download = `mathlab-learning-${date}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("已匯出學習紀錄，包含所有筆記、收藏、練習標記與目前實驗參數。");
  }

  function validateBackup(value) {
    assertKeys(value, ["version", "moduleId", "parameters", "records"], "匯入紀錄");
    if (value.version !== 1 || typeof value.moduleId !== "string" || !moduleById.has(value.moduleId)) throw new Error("版本或模組不支援");
    if (!plainObject(value.parameters)) throw new Error("參數格式錯誤");
    for (const key of Object.keys(value.parameters)) if (forbidden.has(key)) throw new Error("參數含有不支援的欄位");
    const parameters = lab.validateParameters(moduleById.get(value.moduleId), value.parameters);
    const imported = validateRecords(value.records);
    return {moduleId: value.moduleId, parameters, records: imported};
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("檔案超過 4 MB");
      const imported = validateBackup(JSON.parse(await file.text()));
      // Validate the entire file before selecting a module or changing any local data.
      if (saveTimer) persist();
      lab.selectModule(imported.moduleId, imported.parameters);
      records = Object.assign(Object.create(null), records, imported.records);
      const saved = persist();
      renderCurrentLearning();
      renderNavigation();
      notify(saved ? "已匯入學習紀錄，並還原實驗參數。相同模組的筆記已以匯入內容更新。" : "已匯入到本次工作階段；瀏覽器無法儲存，請匯出備份。");
    } catch (error) {
      notify(`匯入失敗：${error.message || "檔案格式錯誤"}。原有紀錄與實驗未變更。`);
    } finally {
      $("learningFile").value = "";
    }
  }

  function showShare() {
    $("shareURL").value = lab.createShareURL();
    $("sharePanel").hidden = false;
    $("shareBtn").setAttribute("aria-expanded", "true");
    $("shareURL").focus();
    $("shareURL").select();
  }

  function closeShare() {
    $("sharePanel").hidden = true;
    $("shareBtn").setAttribute("aria-expanded", "false");
    $("shareBtn").focus();
  }

  function safeLink(raw) {
    try {
      const url = new URL(raw, location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }

  function renderSources() {
    const evidence = window.MathLabEvidence;
    if (!evidence) return;
    const curriculum = evidence.curriculum;
    const allSources = Array.isArray(evidence.sources) ? evidence.sources : [];
    const officialSources = allSources.filter(source => source.type?.startsWith("official-"));
    const baselineSources = Array.isArray(curriculum) ? curriculum : curriculum?.sources || [];
    const curriculumSources = baselineSources.map(source => officialSources.find(item => item.id === source.id) || source);
    for (const source of officialSources) if (!curriculumSources.some(item => item.id === source.id)) curriculumSources.push(source);
    const research = allSources.filter(source => !source.type?.startsWith("official-"));
    const sourceTypes = {"journal-paper": "學術論文", preprint: "預印本", "technical-report": "技術報告", "engineering-document": "工程文件", "official-curriculum": "官方課綱來源", "official-exam": "官方考試來源", "official-exam-scope": "官方考試範圍"};
    for (const [hostId, sources, label] of [["curriculumSources", curriculumSources, "課綱與考試"], ["researchSources", research, "技術研究"]]) {
      const host = $(hostId);
      host.replaceChildren();
      if (hostId === "curriculumSources" && curriculum?.freshness) {
        const caution = document.createElement("p");
        caution.className = "evidence-caution curriculum-caution";
        caution.textContent = curriculum.freshness;
        host.append(caution);
      }
      for (const source of sources) {
        const card = document.createElement("article");
        card.className = "source-card";
        const kind = document.createElement("span");
        kind.className = "source-kind";
        kind.textContent = `${sourceTypes[source.type] || label}${source.year ? ` / ${source.year}` : ""}${source.status === "pending-network" ? " / 待原站核對" : ""}`;
        const title = document.createElement("h3");
        const url = safeLink(source.url);
        if (url) {
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = `${source.title || source.label || source.id} ↗`;
          title.append(link);
        } else title.textContent = source.title || source.label || source.id || "研究來源";
        card.append(kind, title);
        const affiliation = [source.authors, source.affiliation].filter(Boolean).join(" · ");
        for (const text of [affiliation, source.application || source.description, source.limitation ? `限制：${source.limitation}` : ""]) {
          if (!text) continue;
          const paragraph = document.createElement("p");
          paragraph.textContent = text;
          card.append(paragraph);
        }
        host.append(card);
      }
    }
  }

  const topics = [...new Set(lab.modules.map(module => module.tag))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  for (const topic of topics) {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    $("topicFilter").append(option);
  }
  readSaved();
  lab.renderNavigation = renderNavigation;
  lab.notify = notify;
  lab.learning = {storageKey, validateBackup, importBackup};
  $("moduleSearch").addEventListener("input", renderNavigation);
  for (const id of ["courseFilter", "topicFilter", "favoritesOnly"]) $(id).addEventListener("change", renderNavigation);
  $("clearFilters").addEventListener("click", resetFilters);
  $("favoriteBtn").addEventListener("click", () => {
    const id = lab.getCurrentModule().id;
    updateRecord(id, {favorite: !getRecord(id).favorite});
    renderCurrentLearning();
    renderNavigation();
  });
  $("moduleNotes").addEventListener("input", () => updateRecord(noteModuleId, {note: $("moduleNotes").value}, false));
  $("moduleNotes").addEventListener("blur", () => { if (saveTimer) persist(); });
  $("practicedCheck").addEventListener("change", () => {
    updateRecord(lab.getCurrentModule().id, {practiced: $("practicedCheck").checked});
    renderCounters();
    renderNavigation();
  });
  $("formulaToggle").addEventListener("click", () => setFormulaVisibility(!formulasVisible));
  $("teacherMode").addEventListener("change", () => setTeacherMode($("teacherMode").checked));
  $("exportLearning").addEventListener("click", exportBackup);
  $("importLearning").addEventListener("click", () => $("learningFile").click());
  $("learningFile").addEventListener("change", () => importBackup($("learningFile").files[0]));
  $("shareBtn").setAttribute("aria-controls", "sharePanel");
  $("shareBtn").setAttribute("aria-expanded", "false");
  $("shareBtn").addEventListener("click", showShare);
  $("closeShareBtn").addEventListener("click", closeShare);
  $("copyShareBtn").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText($("shareURL").value);
      notify("已複製實驗網址。分享內容不包含筆記。");
    } catch {
      $("shareURL").focus();
      $("shareURL").select();
      notify("請按 Ctrl+C（Mac：⌘C）複製已選取的網址。");
    }
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("sharePanel").hidden) closeShare(); });
  document.addEventListener("mathlab:modulechange", () => {
    if (saveTimer) persist();
    renderCurrentLearning();
    renderNavigation();
    if (!$("sharePanel").hidden) $("shareURL").value = lab.createShareURL();
  });
  document.addEventListener("mathlab:statechange", () => { if (!$("sharePanel").hidden) $("shareURL").value = lab.createShareURL(); });
  document.addEventListener("mathlab:error", event => notify(event.detail.message));
  window.addEventListener("pagehide", () => { if (saveTimer) persist(); });
  renderCurrentLearning();
  renderNavigation();
  renderSources();
})();
