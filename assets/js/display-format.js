/* NOSHI display-only formatting: never changes inputs, APIs, storage or printed payloads. */
(function () {
  'use strict';
  const digitMap = '0123456789';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const excluded = 'SCRIPT,STYLE,NOSCRIPT,TEXTAREA,INPUT,SELECT,OPTION,PRE,CODE,SVG,MATH,TEMPLATE';
  const pattern = /(?:\b\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\b)|(?:\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b)|(?:(?:ر\.س|ريال)\s*[-−]?\d[\d,.]*)|(?:[-−]?\d[\d,.]*\s*(?:ر\.س|ريال))|(?:(?:صباح(?:اً|ا)?|مساء(?:ً|ا)?|(?<![\u0600-\u06FF])[صم])\s*\d{1,2}:\d{2})|(?:\d{1,2}:\d{2}\s*(?:صباح(?:اً|ا)?|مساء(?:ً|ا)?|[صم]))/g;
  function western(s) {
    return String(s).replace(/[٠-٩]/g, d => digitMap[arabic.indexOf(d)])
      .replace(/[۰-۹]/g, d => digitMap[persian.indexOf(d)]);
  }
  function formatPiece(text) {
    const date = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (date) return `${date[1]}/${date[2].padStart(2,'0')}/${date[3].padStart(2,'0')}`;
    const reversed = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (reversed) return `${reversed[3]}/${reversed[2].padStart(2,'0')}/${reversed[1].padStart(2,'0')}`;
    const money = text.match(/^(?:(ر\.س|ريال)\s*([-−]?\d[\d,.]*)|([-−]?\d[\d,.]*)\s*(ر\.س|ريال))$/);
    if (money) return `${money[1] || money[4]} ${money[2] || money[3]}`;
    const time = text.match(/^(?:(صباح(?:اً|ا)?|مساء(?:ً|ا)?|[صم])\s*(\d{1,2}:\d{2})|(\d{1,2}:\d{2})\s*(صباح(?:اً|ا)?|مساء(?:ً|ا)?|[صم]))$/);
    if (time) return `${time[1] || time[4]} ${time[2] || time[3]}`;
    return text;
  }
  function skip(el) {
    return !el || !!el.closest(excluded + ',[data-noshi-display-formatted],[contenteditable="true"],[data-noshi-display-skip]');
  }
  function formatNode(node) {
    if (!node || node.nodeType !== 3 || skip(node.parentElement)) return;
    const raw = node.nodeValue;
    const normalized = western(raw);
    pattern.lastIndex = 0;
    const matches = Array.from(normalized.matchAll(pattern));
    if (!matches.length) {
      if (normalized !== raw) node.nodeValue = normalized;
      return;
    }
    const frag = document.createDocumentFragment();
    let previous = 0;
    for (const match of matches) {
      if (match.index > previous) frag.appendChild(document.createTextNode(normalized.slice(previous, match.index)));
      const isolated = document.createElement('span');
      isolated.dir = 'ltr';
      isolated.setAttribute('data-noshi-display-formatted', '');
      isolated.style.unicodeBidi = 'isolate';
      isolated.style.direction = 'ltr';
      const formatted = formatPiece(match[0]);
      const prefixed = formatted.match(/^(ر\.س|ريال|صباح(?:اً|ا)?|مساء(?:ً|ا)?|[صم]) ([-−]?\d[\d,.:]*)$/);
      if (prefixed) {
        isolated.style.display = 'inline-flex';
        isolated.style.alignItems = 'baseline';
        isolated.style.gap = '.25em';
        const label = document.createElement('span');
        label.dir = 'rtl';
        label.textContent = prefixed[1];
        const digits = document.createElement('span');
        digits.dir = 'ltr';
        digits.textContent = prefixed[2];
        isolated.append(label, digits);
      } else isolated.textContent = formatted;
      frag.appendChild(isolated);
      previous = match.index + match[0].length;
    }
    if (previous < normalized.length) frag.appendChild(document.createTextNode(normalized.slice(previous)));
    node.parentNode.replaceChild(frag, node);
  }
  function scan(root) {
    if (!root || (root.nodeType !== 1 && root.nodeType !== 11)) return;
    if (root.nodeType === 1 && skip(root)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(formatNode);
  }
  function init() {
    scan(document.body);
    const observer = new MutationObserver(records => {
      for (const rec of records) {
        if (rec.type === 'characterData') formatNode(rec.target);
        else for (const node of rec.addedNodes) {
          if (node.nodeType === 3) formatNode(node);
          else scan(node);
        }
      }
    });
    observer.observe(document.body, { subtree:true, childList:true, characterData:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
  // Explicit helper for future render paths; not used for storage or APIs.
  window.NoshiDisplay = Object.freeze({ western, formatPiece });
})();
