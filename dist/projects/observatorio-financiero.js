/* ==========================================================================
   PROYECTO · Observatorio financiero de México
   Área: Dashboards y visualización
   --------------------------------------------------------------------------
   Módulo independiente. Cuando el proyecto se desarrolle, mount() dibujará la
   aplicación dentro del portafolio y devolverá { destroy, onResize }.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.PORTFOLIO_PROJECTS) return;

  window.PORTFOLIO_PROJECTS.register({
    id: 'observatorio-financiero',
    areaId: 'dashboards',
    titulo: 'Observatorio financiero de México',

    mount: function (host, api) {
      return api.placeholder(host, {
        titulo: 'Observatorio financiero',
        puntos: [
          'Indicadores por periodo y región',
          'Filtros, mapas y comparación entre series',
          'Fuentes públicas citadas en cada vista'
        ]
      });
    }
  });
})();
