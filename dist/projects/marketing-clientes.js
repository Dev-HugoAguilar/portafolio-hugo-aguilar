/* ==========================================================================
   PROYECTO: Marketing y clientes · Adquisición, conversión y retención
   --------------------------------------------------------------------------
   Tablero construido con React, TypeScript y D3 (carpeta
   `dashboards/marketing-clientes/`). Se compila a un módulo ESM en
   `dist/dashboards/marketing-clientes/` y este archivo solo lo carga y lo monta
   DENTRO del portafolio.

   Datos: la API del backend del portafolio (`/api/v1/marketing/*`), que sirve la
   versión publicada de la muestra pública de GA4 en BigQuery. El navegador nunca
   habla con BigQuery ni maneja credenciales de Google.

   Si no hay una versión publicada —este entorno no tiene acceso a BigQuery— el
   tablero lo dice y no muestra cifras.

   Base de la API (en orden): `opts.apiBase` → `window.PORTFOLIO_MARKETING_API` →
   `http://127.0.0.1:8010/api/v1/marketing`.
   ========================================================================== */

(function () {
  'use strict';

  var MODULO = 'dashboards/marketing-clientes/app.js';
  var ESTILOS = 'dashboards/marketing-clientes/app.css';

  var cargaModulo = null;
  var cargandoEstilos = false;

  function asegurarEstilos() {
    if (cargandoEstilos) return;
    if (document.querySelector('link[data-marketing-clientes]')) return;
    cargandoEstilos = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ESTILOS;
    link.setAttribute('data-marketing-clientes', '');
    document.head.appendChild(link);
  }

  function cargarAplicacion() {
    if (!cargaModulo) {
      cargaModulo = import(new URL(MODULO, document.baseURI).toString());
    }
    return cargaModulo;
  }

  function mensaje(host, titulo, detalle) {
    host.innerHTML = '';
    var caja = document.createElement('div');
    caja.className = 'mk-app';

    var aviso = document.createElement('div');
    aviso.className = 'mk-aviso mk-aviso--error';

    var t = document.createElement('p');
    t.className = 'mk-aviso-title';
    t.textContent = titulo;

    var p = document.createElement('p');
    p.textContent = detalle;

    aviso.appendChild(t);
    aviso.appendChild(p);
    caja.appendChild(aviso);
    host.appendChild(caja);
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'marketing-clientes',
    areaId: 'dashboards',
    titulo: 'Marketing y clientes',

    mount: function (host, api) {
      var vivo = true;
      var instancia = null;

      asegurarEstilos();
      host.innerHTML = '';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', 'mk-app', 'Cargando la aplicación…');
        espera.style.padding = '18px';
        espera.style.color = '#596273';
        espera.style.fontFamily = 'Inter, system-ui, sans-serif';
        host.appendChild(espera);
      }

      cargarAplicacion()
        .then(function (modulo) {
          if (!vivo) return;
          host.innerHTML = '';
          instancia = modulo.mount(host, { apiBase: window.PORTFOLIO_MARKETING_API });
        })
        .catch(function (error) {
          if (!vivo) return;
          mensaje(
            host,
            'No se pudo cargar la aplicación de marketing',
            'Comprueba que exista dist/dashboards/marketing-clientes/app.js. Detalle: ' +
              (error && error.message ? error.message : 'error desconocido')
          );
        });

      return {
        destroy: function () {
          vivo = false;
          if (instancia && typeof instancia.unmount === 'function') {
            instancia.unmount();
          }
          instancia = null;
          host.innerHTML = '';
        },
        onResize: function () {
          if (instancia && typeof instancia.resize === 'function') instancia.resize();
        }
      };
    }
  });
})();
