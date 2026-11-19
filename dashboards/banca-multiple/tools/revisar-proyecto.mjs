import { chromium } from 'playwright';

const n = await chromium.launch({ channel: 'chrome' });
const errs = [];
const p = await n.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8000/#/area/dashboards/comparativo-bancario', { waitUntil: 'networkidle' });
await p.waitForTimeout(2600);

const datos = await p.evaluate(() => {
  const cs = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return props.reduce((o, k) => (o[k] = c[k], o), {});
  };
  return {
    eyebrow: cs('#view-project .eyebrow', ['fontFamily', 'fontSize', 'textTransform', 'letterSpacing']),
    titulo: cs('#view-project .view-title', ['fontFamily', 'fontSize', 'fontWeight', 'color']),
    subtitulo: cs('#view-project .view-subtitle', ['fontFamily', 'fontStyle', 'fontSize', 'color']),
    lead: cs('#view-project .view-lead', ['fontSize', 'lineHeight', 'maxWidth']),
    dt: cs('.project-fields dt', ['fontFamily', 'fontSize', 'fontWeight', 'color']),
    dd: cs('.project-fields dd', ['fontSize', 'lineHeight', 'color']),
    item: cs('.project-fields > div', ['paddingTop', 'borderBottomWidth', 'borderBottomColor']),
    tecFuncion: cs('.tec-funcion', ['fontFamily', 'fontSize', 'textTransform', 'letterSpacing']),
    tecItems: cs('.tec-items', ['fontFamily', 'fontSize']),
    columnas: getComputedStyle(document.querySelector('.project-fields')).gridTemplateColumns,
    tecFull: getComputedStyle(document.querySelector('.field-tecnologias')).gridColumn,
    hallazgos: (document.querySelector('#hallazgos-host') || {}).textContent.slice(0, 60)
  };
});
console.log(JSON.stringify(datos, null, 1));
await p.screenshot({ path: 'evidencias/proyecto-despues.png' });
await p.screenshot({ path: 'evidencias/proyecto-despues-completo.png', fullPage: true });
console.log('errores:', JSON.stringify(errs));
await n.close();
