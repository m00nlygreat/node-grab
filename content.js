(function() {
  if (window.__nodeGrabInjected) return;
  window.__nodeGrabInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .node-grab-hover { outline: 2px solid #3f51b5 !important; cursor: crosshair !important; }
  `;
  document.head.appendChild(style);

  const root = document.documentElement;
  const body = document.body;
  const originalRootOverflow = root.style.overflow;
  const originalBodyOverflow = body.style.overflow;
  const originalRootOverflowPriority = root.style.getPropertyPriority('overflow');
  const originalBodyOverflowPriority = body.style.getPropertyPriority('overflow');

  function applyAutoOverflow() {
    root.style.setProperty('overflow', 'auto', 'important');
    body.style.setProperty('overflow', 'auto', 'important');
  }

  function restoreOverflow() {
    if (originalRootOverflow) {
      root.style.setProperty('overflow', originalRootOverflow, originalRootOverflowPriority);
    } else {
      root.style.removeProperty('overflow');
    }
    if (originalBodyOverflow) {
      body.style.setProperty('overflow', originalBodyOverflow, originalBodyOverflowPriority);
    } else {
      body.style.removeProperty('overflow');
    }
  }

  function startSelection() {
    let current;
    applyAutoOverflow();

    function mousemove(e) {
      if (current) current.classList.remove('node-grab-hover');
      current = e.target;
      current.classList.add('node-grab-hover');
    }

    function clickHandler(e) {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      selectElement(e.target);
    }

    function cleanup() {
      document.removeEventListener('mousemove', mousemove);
      document.removeEventListener('click', clickHandler, true);
      if (current) current.classList.remove('node-grab-hover');
    }

    document.addEventListener('mousemove', mousemove);
    document.addEventListener('click', clickHandler, true);
  }

  function selectElement(elem) {
    // hide all elements not related to selection
    const all = document.body.getElementsByTagName('*');
    for (const el of all) {
      if (!el.contains(elem) && el !== elem && !elem.contains(el)) {
        el.dataset.ngDisplay = el.style.display;
        el.style.display = 'none';
      }
    }

    const rect = elem.getBoundingClientRect();

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:fixed; top:${rect.top}px; left:${rect.left}px; width:${rect.width}px; height:${rect.height}px; resize:both; overflow:auto; border:2px dashed #3f51b5; background:white; z-index:2147483647;`;
    document.body.appendChild(wrapper);
    wrapper.appendChild(elem);

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed; top:10px; right:10px; z-index:2147483647; background:white; padding:8px; border:1px solid #ccc; font-family:sans-serif;';
      panel.innerHTML = `
        Width: <input type="number" id="ngWidth" value="${Math.round(rect.width)}" style="width:60px"> px
        <button id="ngMaxW">Max Width</button><br>
        Height: <input type="number" id="ngHeight" value="${Math.round(rect.height)}" style="width:60px"> px
        <button id="ngMaxH">Max Height</button><br>
        <button id="ngApply">Apply</button>
        <button id="ngCapture">Capture</button>`;
    document.body.appendChild(panel);

    document.getElementById('ngApply').onclick = () => {
      const w = parseInt(document.getElementById('ngWidth').value, 10);
      const h = parseInt(document.getElementById('ngHeight').value, 10);
      if (!isNaN(w)) wrapper.style.width = w + 'px';
      if (!isNaN(h)) wrapper.style.height = h + 'px';
      wrapper.style.overflow = 'auto';
    };

    document.getElementById('ngMaxW').onclick = () => {
      const w = elem.scrollWidth;
      wrapper.style.width = w + 'px';
      wrapper.style.overflow = 'auto';
      document.getElementById('ngWidth').value = w;
    };

    document.getElementById('ngMaxH').onclick = () => {
      const h = elem.scrollHeight;
      wrapper.style.height = h + 'px';
      wrapper.style.overflow = 'auto';
      document.getElementById('ngHeight').value = h;
    };

    document.getElementById('ngCapture').onclick = () => {
      const originalBorder = wrapper.style.border;
      const originalOutline = wrapper.style.outline;
      const originalBoxShadow = wrapper.style.boxShadow;
      const originalOverflow = wrapper.style.overflow;
      const hadFocus = wrapper.matches(':focus');
      const originalPanelDisplay = panel.style.display;
      wrapper.style.border = 'none';
      wrapper.style.outline = 'none';
      wrapper.style.boxShadow = 'none';
      wrapper.style.overflow = 'hidden';
      if (hadFocus) wrapper.blur();
      panel.style.display = 'none';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const r = wrapper.getBoundingClientRect();
          const scale = window.devicePixelRatio;
          const left = (r.left + window.scrollX) * scale;
          const top = (r.top + window.scrollY) * scale;
          const width = r.width * scale;
          const height = r.height * scale;
          chrome.runtime.sendMessage({ action: 'capture' }, (response) => {
            wrapper.style.border = originalBorder;
            wrapper.style.outline = originalOutline;
            wrapper.style.boxShadow = originalBoxShadow;
            wrapper.style.overflow = originalOverflow;
            if (hadFocus) wrapper.focus();
            panel.style.display = originalPanelDisplay;
            restoreOverflow();
            if (!response || chrome.runtime.lastError) {
              console.error('Capture failed', chrome.runtime.lastError);
              return;
            }
            const img = new Image();
            img.onload = function() {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
              const url = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = url;
              a.download = 'capture.png';
              document.body.appendChild(a);
              a.click();
              a.remove();
            };
            img.src = response.image;
          });
        });
      });
    };
  }

  startSelection();
})();
