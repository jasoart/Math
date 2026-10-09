/* Browse human-reviewed topic labels from the user's ten uploaded papers. */
(() => {
  const host = document.getElementById("examExplorer");
  const evidence = window.MathLabEvidence;
  if (!host || !evidence?.exams) return;
  const field = (text, choices) => {
    const label = document.createElement("label"), select = document.createElement("select");
    label.textContent = text;
    for (const [value, text] of choices) { const o = document.createElement("option"); o.value=value; o.textContent=text; select.append(o); }
    label.append(select); return {label, select};
  };
  const exam = field("考科", evidence.exams.map(e=>[e.exam,e.label]));
  const year = field("年度", [["all","全部年度"],...[115,114,113,112,111].map(y=>[String(y),`${y} 年`])]);
  const topic = field("主要題型", [["all","全部題型"]]);
  const filters=document.createElement("div");filters.className="exam-filters";filters.append(exam.label,year.label,topic.label);
  const status=document.createElement("p");status.setAttribute("role","status");
  const summary=document.createElement("div");summary.className="exam-summary";
  const list=document.createElement("div");list.className="exam-questions";
  const provenance=document.createElement("p");provenance.className="evidence-caution";
  provenance.textContent="這 10 份試卷均由使用者上傳，尚未逐份核對官方原站版本與發布日期（包含 115 年）；分類與模型關聯為人工教學分析。";
  const more=document.createElement("button");more.type="button";more.className="exam-load-more";more.textContent="再顯示 20 題";
  host.replaceChildren(filters,provenance,status,summary,list,more);
  let visibleLimit=20;
  function updateTopics() {
    const dataset=evidence.exams.find(e=>e.exam===exam.select.value);
    const topics=[...new Set(dataset.documents.flatMap(d=>d.questions.map(q=>q.primaryTopic)))].sort();
    topic.select.replaceChildren(...[["all","全部題型"],...topics.map(t=>[t,t])].map(([value,text])=>{const o=document.createElement("option");o.value=value;o.textContent=text;return o;}));
  }
  function render() {
    const dataset=evidence.exams.find(e=>e.exam===exam.select.value);
    const docs=dataset.documents.filter(d=>year.select.value==="all"||String(d.year)===year.select.value);
    const questions=docs.flatMap(d=>d.questions.map(q=>({...q,year:d.year,filename:d.filename})));
    const selected=questions.filter(q=>topic.select.value==="all"||q.primaryTopic===topic.select.value);
    status.textContent=`${dataset.label}：顯示 ${selected.length}／${questions.length} 個編號題；複合題不拆成多題，不代表配分或命題機率。`;
    const counts=new Map();questions.forEach(q=>counts.set(q.primaryTopic,(counts.get(q.primaryTopic)||0)+1));
    summary.replaceChildren(...[...counts].sort((a,b)=>b[1]-a[1]).map(([name,n])=>{const p=document.createElement("span");p.className="topic-count";p.textContent=`${name} ${n} 題`;return p;}));
    const cards=selected.slice(0,visibleLimit).map(q=>{
      const article=document.createElement("article");article.className="exam-question";
      const title=document.createElement("h3");title.textContent=`${q.year} 年 · 第 ${q.number} 題 · ${q.primaryTopic}`;
      const p=document.createElement("p");p.textContent=q.summary;
      const source=document.createElement("small");source.textContent=`附件：${q.filename}${q.sourcePage?`，試卷第 ${q.sourcePage} 頁`:""}（上傳文件，官方版本未核驗）。對應程度：${({related:"相關概念",partial:"部分涵蓋",direct:"直接概念",covered:"概念涵蓋","core-concept":"核心概念"})[q.coverage]||q.coverage||"相關概念"}。`;
      article.append(title,p,source);
      if(q.uncertainty){const caution=document.createElement("p");caution.className="evidence-caution";caution.textContent=`閱讀限制：${q.uncertainty}`;article.append(caution);}
      const links=document.createElement("div");links.className="exam-links";
      const ids=[...new Set([...(q.extensionModuleIds||[]),...(q.moduleIds||[])])].filter(id=>window.MathLab.modules.some(m=>m.id===id));
      for(const id of ids){const m=window.MathLab.modules.find(m=>m.id===id);const button=document.createElement("button");button.type="button";button.textContent=`探索：${m.short}`;button.addEventListener("click",()=>{window.MathLab.selectModule(id);document.getElementById("moduleTitle").scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});document.getElementById("moduleTitle").focus({preventScroll:true});});links.append(button);}
      article.append(links);return article;
    });
    list.replaceChildren(...cards);
    more.hidden=selected.length<=visibleLimit;
    status.textContent+=` 已呈現前 ${Math.min(visibleLimit,selected.length)} 題。`;
  }
  exam.select.addEventListener("change",()=>{visibleLimit=20;updateTopics();render();});
  year.select.addEventListener("change",()=>{visibleLimit=20;render();});topic.select.addEventListener("change",()=>{visibleLimit=20;render();});
  more.addEventListener("click",()=>{visibleLimit+=20;render();});
  updateTopics();render();
})();
