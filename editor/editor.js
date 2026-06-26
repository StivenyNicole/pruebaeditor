let config = null;
let baseHtml = '';
let updateTimer = null;
let selectedEditable = null;
let pendingImageTarget = null;

const editableTargets = [
  { selector: '#hero-text h1', path: 'textos.heroTitulo', label: 'Portada' },
  { selector: '.bible-card h3', path: 'promesa.titulo', label: 'Promesa' },
  { selector: '.bible-card-content p.italic', path: 'promesa.versiculo', label: 'Versiculo', unwrapQuotes: true },
  { selector: '.bible-card-content .mt-6', path: 'promesa.cita', label: 'Cita' },
  { selector: '.px-6.py-10 h2', path: 'textos.tituloPrincipal', label: 'Titulo' },
  { selector: '.px-6.py-10 h3', path: 'textos.saveTheDate', label: 'Save the date' },
  { selector: '.px-6.py-10 > p', path: 'textos.fechaCalendario', label: 'Mes calendario' },
  { selector: '.px-6.py-12.border-t h3', path: 'textos.celebra', label: 'Celebra' },
  { selector: '.mb-8.text-gray-600 > p:nth-child(1)', path: 'textos.ceremonia', label: 'Ceremonia' },
  { selector: '.mb-8.text-gray-600 > p:nth-child(2)', path: 'textos.recepcion', label: 'Recepcion' },
  { selector: '.mb-8.text-gray-600 .text-lg', path: 'evento.lugar', label: 'Lugar' },
  { selector: '.moments-heading h3', path: 'textos.momentosTitulo', label: 'Momentos' },
  { selector: 'h3.font-script.text-5xl.text-olive-800.mb-8', path: 'textos.vestimentaTitulo', label: 'Vestimenta' },
  { selector: '.max-w-sm .font-bold.text-gray-800', path: 'textos.vestimentaTipo', label: 'Tipo vestimenta' },
  { selector: '.max-w-sm .text-xs.text-gray-400.italic', path: 'textos.vestimentaNota', label: 'Nota vestimenta' },
  { selector: '.playlist-card h3', path: 'playlist.titulo', label: 'Playlist' },
  { selector: '.playlist-kicker', path: 'playlist.kicker', label: 'Kicker playlist' },
  { selector: '.playlist-copy', path: 'playlist.descripcion', label: 'Texto playlist' },
  { selector: '.memories-card h3', path: 'recuerdos.titulo', label: 'Recuerdos' },
  { selector: '.memories-kicker', path: 'recuerdos.kicker', label: 'Kicker recuerdos' },
  { selector: '.memories-copy', path: 'recuerdos.descripcion', label: 'Texto recuerdos' },
  { selector: '.gift-envelope-card .gift-copy', path: 'textos.regalosTexto', label: 'Regalos' },
  { selector: '.glass-panel h5', path: 'textos.contadorTitulo', label: 'Contador' },
  { selector: '.glass-panel > p', path: 'textos.contadorSubtitulo', label: 'Texto contador' },
  { selector: '.scroll-reveal h6', path: 'textos.transporteTitulo', label: 'Transporte' }
].filter((target) => target.path);

const imageTargets = [
  { selector: '.envelope-half img', path: 'multimedia.sobre', label: 'Sobre', all: true },
  { selector: '#carousel .slide', path: 'multimedia.carrusel', label: 'Carrusel', list: true },
  { selector: '.blurred-edges', path: 'multimedia.ilustracionPareja', label: 'Ilustracion' },
  { selector: '.moment-card img', path: 'multimedia.momentos', label: 'Momento', list: true },
  { selector: 'img[alt="Icono Vestimenta"]', path: 'multimedia.iconoVestimenta', label: 'Vestimenta' }
];

const sectionTargets = [
  { selector: '.bible-card', id: 'promesa', label: 'Nuestra promesa' },
  { selector: '.px-6.py-10.text-center', id: 'fecha', label: 'Fecha' },
  { selector: '.moments-heading', id: 'momentosTitulo', label: 'Titulo momentos', groupSelector: '.moments-heading, .mosaic-container' },
  { selector: '.mosaic-container', id: 'momentosFotos', label: 'Fotos momentos' },
  { selector: '#playlistSection', id: 'playlist', label: 'Canciones' },
  { selector: '#memoriesSection', id: 'recuerdos', label: 'Recuerdos' }
];

const $ = (selector) => document.querySelector(selector);
const fields = () => [...document.querySelectorAll('[data-path]')];

function getValue(path) {
  return path.split('.').reduce((current, key) => current?.[key], config);
}

function setValue(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {};
    return current[key];
  }, config);
  target[last] = value;
}

function moveArrayItem(items, fromIndex, toIndex) {
  if (!Array.isArray(items) || toIndex < 0 || toIndex >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

function ensureStyleBucket() {
  if (!config.estilos || typeof config.estilos !== 'object') config.estilos = {};
  return config.estilos;
}

function getStyle(path) {
  return ensureStyleBucket()[path] || {};
}

function setStyle(path, property, value) {
  const styles = ensureStyleBucket();
  if (!styles[path]) styles[path] = {};

  if (value) {
    styles[path][property] = value;
  } else {
    delete styles[path][property];
  }
}

function syncJson() {
  $('#configJson').value = JSON.stringify(config, null, 2);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function syncField(path) {
  const field = fields().find((item) => item.dataset.path === path);
  if (field) field.value = normalizeForInput(path, getValue(path));
  syncJson();
}

function cleanEditableText(text, target) {
  const value = text.replace(/\s+/g, ' ').trim();
  return target.unwrapQuotes ? value.replace(/^["“”]+|["“”]+$/g, '') : value;
}

function parseConfig(source) {
  if (!source.includes('window.INVITACION_CONFIG')) {
    throw new Error('No encontre window.INVITACION_CONFIG. Revisa que config.js exista en la ruta raiz de esta invitacion.');
  }
  const scope = { INVITACION_CONFIG: null };
  const runner = new Function('window', `${source}; return window.INVITACION_CONFIG;`);
  return runner(scope);
}

async function fetchTextFrom(paths, expectedText) {
  const errors = [];

  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      const text = await response.text();
      if (response.ok && (!expectedText || text.includes(expectedText))) {
        return text;
      }
      errors.push(`${path}: ${response.status}`);
    } catch (error) {
      errors.push(`${path}: ${error.message}`);
    }
  }

  throw new Error(`No pude cargar el archivo requerido. Intentos: ${errors.join(' | ')}`);
}

function serializeConfig(data) {
  return `window.INVITACION_CONFIG = ${JSON.stringify(data, null, 2)};\n`;
}

function normalizeForInput(path, value) {
  if (path === 'evento.fechaCuentaRegresiva' && value) {
    return String(value).slice(0, 16);
  }
  return value ?? '';
}

function hydrateForm() {
  fields().forEach((field) => {
    const value = getValue(field.dataset.path);
    field.value = normalizeForInput(field.dataset.path, value);
  });

  $('#guestList').value = (config.formulario?.invitados || []).join('\n');
  $('#carouselList').value = (config.multimedia?.carrusel || []).join('\n');
  $('#momentsList').value = (config.multimedia?.momentos || []).join('\n');
  syncJson();
}

function syncFromForm() {
  fields().forEach((field) => {
    let value = field.value;
    if (field.type === 'number') value = Number(value || 0);
    setValue(field.dataset.path, value);
  });

  config.formulario.invitados = $('#guestList').value.split('\n').map((item) => item.trim()).filter(Boolean);
  config.multimedia.carrusel = $('#carouselList').value.split('\n').map((item) => item.trim()).filter(Boolean);
  config.multimedia.momentos = $('#momentsList').value.split('\n').map((item) => item.trim()).filter(Boolean);
  syncJson();
}

function buildPreviewHtml() {
  const inlineConfig = `<script>${serializeConfig(config).replace(/<\/script>/g, '<\\/script>')}<\/script>`;
  const previewStyle = `
    <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=Dancing+Script:wght@400;600;700&family=Great+Vibes&family=Lora:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700;800&family=Parisienne&family=Playfair+Display:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      #envelopeScreen,
      #musicToggle,
      audio { display: none !important; }
      #invitationContent { display: block !important; }
      #hero-text { display: flex !important; opacity: 1 !important; visibility: visible !important; }
      #hero-text h1,
      .hero-subtitle,
      .fade-text { opacity: 1 !important; visibility: visible !important; animation: none !important; }
      .slide:first-child { opacity: 1 !important; transform: scale(1.04) !important; }
      .reveal,
      .scroll-reveal,
      .bible-card,
      .moment-card { opacity: 1 !important; transform: none !important; filter: none !important; }
      .editor-image-wrap { position: relative !important; }
      .editor-image-action,
      .editor-section-action {
        position: absolute !important;
        z-index: 999999 !important;
        width: 34px !important;
        height: 34px !important;
        min-height: 34px !important;
        border: 0 !important;
        border-radius: 999px !important;
        display: grid !important;
        place-items: center !important;
        color: #fff !important;
        background: rgba(21, 29, 20, .78) !important;
        box-shadow: 0 12px 28px rgba(0,0,0,.24) !important;
        backdrop-filter: blur(10px) !important;
        cursor: pointer !important;
        font: 900 18px/1 Montserrat, sans-serif !important;
      }
      .editor-image-action { top: 10px !important; right: 10px !important; }
      .editor-section-tools {
        position: absolute !important;
        top: 10px !important;
        left: 10px !important;
        z-index: 999998 !important;
        display: flex !important;
        gap: 6px !important;
      }
      .editor-section-action {
        position: static !important;
        font-size: 13px !important;
      }
      body { min-height: 100vh; }
    </style>
  `;
  return baseHtml
    .replace(/<head>/, '<head><base href="../">')
    .replace(/<\/head>/, `${previewStyle}</head>`)
    .replace(/<script src="config\.js"><\/script>/, inlineConfig)
    .replace(/<script defer src="https:\/\/analytics\.pocketstiven\.com\/script\.js"[^>]*><\/script>/, '');
}

function renderPreview() {
  syncFromForm();
  hideToolbar();
  const frame = $('#previewFrame');
  frame.onload = () => {
    attachInlineEditing();
    $('#previewStatus').textContent = `Vista previa actualizada: ${new Date().toLocaleTimeString('es-CO')}`;
  };
  frame.srcdoc = buildPreviewHtml();
  $('#previewStatus').textContent = `Vista previa actualizada: ${new Date().toLocaleTimeString('es-CO')}`;
}

function schedulePreview() {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(renderPreview, 450);
}

function rgbToHex(color) {
  if (!color || color.startsWith('#')) return color || '#4f5b49';
  const match = color.match(/\d+/g);
  if (!match || match.length < 3) return '#4f5b49';
  return `#${match.slice(0, 3).map((value) => Number(value).toString(16).padStart(2, '0')).join('')}`;
}

function positionToolbar(element) {
  const toolbar = $('#inlineToolbar');
  const frame = $('#previewFrame');
  const frameRect = frame.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  toolbar.classList.remove('hidden');
  toolbar.setAttribute('aria-hidden', 'false');

  const top = Math.max(12, frameRect.top + rect.top - toolbar.offsetHeight - 12);
  const left = Math.min(
    window.innerWidth - toolbar.offsetWidth - 12,
    Math.max(12, frameRect.left + rect.left)
  );

  toolbar.style.top = `${top}px`;
  toolbar.style.left = `${left}px`;
}

function hideToolbar() {
  const toolbar = $('#inlineToolbar');
  if (!toolbar) return;

  toolbar.classList.add('hidden');
  toolbar.setAttribute('aria-hidden', 'true');

  if (selectedEditable?.element) {
    selectedEditable.element.removeAttribute('data-editor-active');
  }

  selectedEditable = null;
}

function applyStoredStyle(element, path) {
  Object.entries(getStyle(path)).forEach(([property, value]) => {
    if (value) element.style[property] = value;
  });
}

function selectEditable(element, target) {
  const doc = $('#previewFrame').contentDocument;
  doc?.querySelectorAll('[data-editor-active="true"]').forEach((item) => {
    item.removeAttribute('data-editor-active');
  });

  selectedEditable = { element, target };
  element.dataset.editorActive = 'true';
  element.contentEditable = 'true';
  element.spellcheck = false;
  element.focus();

  const computed = element.ownerDocument.defaultView.getComputedStyle(element);
  const savedStyle = getStyle(target.path);

  $('#inlineToolbarLabel').textContent = target.label;
  $('#inlineColor').value = rgbToHex(savedStyle.color || computed.color);
  $('#inlineFont').value = savedStyle.fontFamily || '';
  $('#inlineSize').value = parseInt(savedStyle.fontSize || computed.fontSize, 10) || 16;

  positionToolbar(element);
}

function applyInlineStyle(property, value) {
  if (!selectedEditable) return;

  selectedEditable.element.style[property] = value || '';
  setStyle(selectedEditable.target.path, property, value);
  syncJson();
  positionToolbar(selectedEditable.element);
}

function setImageValue(target, index, value) {
  if (target.list) {
    const list = getValue(target.path) || [];
    list[index] = value;
    setValue(target.path, list);
  } else {
    setValue(target.path, value);
  }
  hydrateForm();
}

function wrapImageForEditing(image, target, index) {
  const doc = image.ownerDocument;
  const wrapper = doc.createElement('span');
  wrapper.className = 'editor-image-wrap';
  wrapper.style.display = getComputedStyle(image).display === 'block' ? 'block' : 'inline-block';

  image.parentNode.insertBefore(wrapper, image);
  wrapper.appendChild(image);

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'editor-image-action';
  button.textContent = '⋯';
  button.title = `Cambiar ${target.label}`;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    pendingImageTarget = { image, target, index };
    $('#imagePicker').click();
  });
  wrapper.appendChild(button);
}

function attachImageEditing() {
  const doc = $('#previewFrame').contentDocument;
  if (!doc) return;

  imageTargets.forEach((target) => {
    doc.querySelectorAll(target.selector).forEach((image, index) => {
      if (image.dataset.editorImageReady === 'true') return;
      image.dataset.editorImageReady = 'true';
      wrapImageForEditing(image, target, index);
    });
  });
}

function ensureOrderConfig() {
  if (!Array.isArray(config.seccionesOrden)) {
    config.seccionesOrden = sectionTargets.map((section) => section.id);
  }
  return config.seccionesOrden;
}

function moveSection(sectionId, direction) {
  const order = ensureOrderConfig();
  const index = order.indexOf(sectionId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
  config.seccionesOrden = moveArrayItem(order, index, nextIndex);
  syncJson();
  renderPreview();
}

function applySectionOrder(doc) {
  const order = ensureOrderConfig();
  const sections = new Map(sectionTargets.map((section) => [section.id, section]));
  const anchor = doc.querySelector('#invitationContent .invitation-container');
  const footer = doc.querySelector('footer');
  if (!anchor) return;

  order.forEach((id) => {
    const section = sections.get(id);
    if (!section) return;
    doc.querySelectorAll(section.groupSelector || section.selector).forEach((element) => {
      anchor.insertBefore(element, footer || null);
    });
  });
}

function attachSectionControls() {
  const doc = $('#previewFrame').contentDocument;
  if (!doc) return;

  sectionTargets.forEach((section) => {
    const element = doc.querySelector(section.selector);
    if (!element || element.dataset.editorSectionReady === 'true') return;
    element.dataset.editorSectionReady = 'true';
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';

    const tools = doc.createElement('div');
    tools.className = 'editor-section-tools';
    tools.innerHTML = `
      <button type="button" class="editor-section-action" title="Subir sección">↑</button>
      <button type="button" class="editor-section-action" title="Bajar sección">↓</button>
    `;
    const [up, down] = tools.querySelectorAll('button');
    up.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      moveSection(section.id, -1);
    });
    down.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      moveSection(section.id, 1);
    });
    element.appendChild(tools);
  });
}

function attachInlineEditing() {
  const frame = $('#previewFrame');
  const doc = frame.contentDocument;
  if (!doc) return;

  applySectionOrder(doc);

  const style = doc.createElement('style');
  style.textContent = `
    [data-editor-path] { cursor: text !important; outline-offset: 6px; }
    [data-editor-path]:hover,
    [data-editor-active="true"] { outline: 2px dashed rgba(79, 91, 73, .72) !important; }
  `;
  doc.head.appendChild(style);

  editableTargets.forEach((target) => {
    doc.querySelectorAll(target.selector).forEach((element) => {
      element.dataset.editorPath = target.path;
      element.title = `Editar ${target.label}`;
      applyStoredStyle(element, target.path);

      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectEditable(element, target);
      });

      element.addEventListener('input', () => {
        setValue(target.path, cleanEditableText(element.innerText, target));
        syncField(target.path);
      });
    });
  });

  doc.addEventListener('click', (event) => {
    if (!event.target.closest('[data-editor-path]')) hideToolbar();
  });

  attachImageEditing();
  attachSectionControls();
}

function downloadFile(fileName, content, type = 'text/javascript') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function initEditor() {
  const [configSource, htmlSource] = await Promise.all([
    fetchTextFrom(['../config.js', './config.js', '/config.js'], 'window.INVITACION_CONFIG'),
    fetchTextFrom(['../index.html', './index.html', '/index.html'], '<!DOCTYPE html>')
  ]);

  config = parseConfig(configSource);
  baseHtml = htmlSource;
  hydrateForm();
  renderPreview();

  fields().forEach((field) => field.addEventListener('input', schedulePreview));
  ['guestList', 'carouselList', 'momentsList'].forEach((id) => {
    $(`#${id}`).addEventListener('input', schedulePreview);
  });

  $('#refreshPreview').addEventListener('click', renderPreview);
  $('#downloadConfig').addEventListener('click', () => {
    syncFromForm();
    downloadFile('config.js', serializeConfig(config));
  });
  $('#applyJson').addEventListener('click', () => {
    try {
      config = JSON.parse($('#configJson').value);
      hydrateForm();
      renderPreview();
      $('#previewStatus').textContent = 'JSON aplicado correctamente.';
    } catch (error) {
      $('#previewStatus').textContent = `JSON inválido: ${error.message}`;
    }
  });

  $('#mobilePreview').addEventListener('click', () => {
    $('#previewWrap').classList.add('mobile');
    $('#previewWrap').classList.remove('desktop');
  });
  $('#desktopPreview').addEventListener('click', () => {
    $('#previewWrap').classList.add('desktop');
    $('#previewWrap').classList.remove('mobile');
  });

  $('#inlineColor').addEventListener('input', (event) => {
    applyInlineStyle('color', event.target.value);
  });
  $('#inlineFont').addEventListener('change', (event) => {
    applyInlineStyle('fontFamily', event.target.value);
  });
  $('#inlineSize').addEventListener('input', (event) => {
    const size = Number(event.target.value || 0);
    applyInlineStyle('fontSize', size ? `${size}px` : '');
  });
  $('#inlineDone').addEventListener('click', hideToolbar);
  window.addEventListener('resize', () => {
    if (selectedEditable) positionToolbar(selectedEditable.element);
  });
  $('#imagePicker').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || !pendingImageTarget) return;

    const dataUrl = await readFileAsDataUrl(file);
    pendingImageTarget.image.src = dataUrl;
    setImageValue(pendingImageTarget.target, pendingImageTarget.index, dataUrl);
    pendingImageTarget = null;
    event.target.value = '';
    renderPreview();
  });

  if (window.lucide) window.lucide.createIcons();
}

initEditor().catch((error) => {
  $('#previewStatus').textContent = `No se pudo cargar el editor: ${error.message}`;
});


