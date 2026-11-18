/* ==========================================================================
   PROYECTO: Pulso comercial · Walmex
   --------------------------------------------------------------------------
   Tablero construido con React, TypeScript y D3 (carpeta
   `dashboards/pulso-comercial/`). Se compila a un módulo ESM en
   `dist/dashboards/pulso-comercial/` y este archivo solo lo carga y lo monta
   DENTRO del portafolio.

   Datos: la API del backend del portafolio (`/api/v1/walmex/*`), que sirve la
   versión publicada de los comunicados trimestrales y estados financieros de
   Walmex en MongoDB Atlas. El navegador nunca descarga los PDF oficiales ni
   habla con la base de datos.

   Base de la API (en orden): `opts.apiBase` → `window.PORTFOLIO_WALMEX_API` →
   `http://127.0.0.1:8010/api/v1/walmex`.
   ========================================================================== */

(function () {
  'use strict';

  var MODULO = 'dashboards/pulso-comercial/app.js';
  var ESTILOS = 'dashboards/pulso-comercial/app.css';

  var cargaModulo = null;
  var cargandoEstilos = false;

  function asegurarEstilos() {
    if (cargandoEstilos) return;
    if (document.querySelector('link[data-pulso-comercial]')) return;
    cargandoEstilos = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ESTILOS;
    link.setAttribute('data-pulso-comercial', '');
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
    caja.className = 'wm-app';
    var aviso = document.createElement('div');
    aviso.className = 'wm-aviso';
    var t = document.createElement('p');
    t.className = 'wm-aviso-titulo';
    t.textContent = titulo;
    var p = document.createElement('p');
    p.textContent = detalle;
    aviso.appendChild(t);
    aviso.appendChild(p);
    caja.appendChild(aviso);
    host.appendChild(caja);
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'pulso-comercial',
    areaId: 'dashboards',
    titulo: 'Pulso comercial · Walmex',

    mount: function (host, api) {
      var vivo = true;
      var instancia = null;

      asegurarEstilos();
      host.innerHTML = '';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', 'wm-app', 'Cargando la aplicación…');
        espera.style.padding = '18px';
        espera.style.color = '#596273';
        host.appendChild(espera);
      }

      cargarAplicacion()
        .then(function (modulo) {
          if (!vivo) return;
          host.innerHTML = '';
          instancia = modulo.mount(host, { apiBase: window.PORTFOLIO_WALMEX_API });
        })
        .catch(function (error) {
          if (!vivo) return;
          mensaje(
            host,
            'No se pudo cargar la aplicación de Walmex',
            'Comprueba que exista dist/dashboards/pulso-comercial/app.js. Detalle: ' +
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
