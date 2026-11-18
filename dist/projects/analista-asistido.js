/* ==========================================================================
   PROYECTO · Analista asistido por IA
   Área: Agentes y sistemas de decisión
   --------------------------------------------------------------------------
   Módulo independiente. Cuando el proyecto se desarrolle, mount() dibujará la
   aplicación dentro del portafolio y devolverá { destroy, onResize }.

   Nota: si el proyecto necesita un modelo, llamará a un backend propio mediante
   una API. Las claves nunca se guardan en el navegador.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.PORTFOLIO_PROJECTS) return;

  window.PORTFOLIO_PROJECTS.register({
    id: 'analista-asistido',
    areaId: 'agentes',
    titulo: 'Analista asistido por IA',

    mount: function (host, api) {
      return api.placeholder(host, {
        titulo: 'Analista asistido por IA',
        puntos: [
          'Consultar datos y ejecutar cálculos',
          'Generar una visualización dentro de la misma vista',
          'Preparar un informe que una persona revisa antes de usarlo'
        ]
      });
    }
  });
})();
