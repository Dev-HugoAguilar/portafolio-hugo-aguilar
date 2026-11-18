/* ==========================================================================
   PROYECTOS DEL PORTAFOLIO — registro de módulos
   --------------------------------------------------------------------------
   Cada proyecto vive en su propio archivo dentro de dist/projects/ y se
   registra aquí. Así se pueden añadir casos uno por uno sin tocar la lógica de
   los demás ni la del sitio.

   CONTRATO DE UN MÓDULO

     window.PORTFOLIO_PROJECTS.register({
       id:       'slug-del-proyecto',        // coincide con content.js
       areaId:   'dashboards',               // área a la que pertenece
       titulo:   'Nombre del proyecto',
       mount:    function (host, api) {      // dibuja la aplicación dentro de host
         return {
           destroy:   function () {},        // limpia al salir del proyecto
           onResize:  function (size) {}     // opcional: el host cambió de tamaño
         };
       }
     });

   Reglas de la casa:
   - La aplicación se dibuja DENTRO del portafolio (vista de proyecto y modo
     ampliado). No se abre en otro sitio ni en otra pestaña.
   - Nada de claves de API en el navegador: si un proyecto necesita un modelo,
     llamará a un backend propio a través de una API.
   - Mientras un proyecto no esté desarrollado, mount() usa api.placeholder().

   API COMPARTIDA
     api.placeholder(host, opciones)  → marcador del espacio reservado
     api.el(tag, className, texto)    → creación rápida de elementos
     api.chip(estado)                 → etiqueta de estado
   ========================================================================== */

window.PORTFOLIO_PROJECTS = (function () {
  'use strict';

  var modules = {};
  var order = [];

  function register(module) {
    if (!module || !module.id || !module.areaId) return;
    if (modules[module.id]) {
      if (window.console && console.warn) console.warn('Proyecto duplicado: ' + module.id);
      return;
    }
    modules[module.id] = module;
    order.push(module.id);
  }

  function get(id) {
    return modules[id] || null;
  }

  function all() {
    return order.map(function (id) { return modules[id]; });
  }

  function forArea(areaId) {
    return all().filter(function (module) { return module.areaId === areaId; });
  }

  /* ---- utilidades compartidas por los módulos ---- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var ESTADO_LABELS = { previsto: 'Próximamente', desarrollo: 'En desarrollo', publicado: 'Publicado' };

  function chip(estado) {
    var node = el('span', 'chip', ESTADO_LABELS[estado] || ESTADO_LABELS.previsto);
    node.setAttribute('data-estado', estado || 'previsto');
    return node;
  }

  /* Marcador del espacio reservado para la aplicación de un proyecto */
  function placeholder(host, options) {
    var opts = options || {};

    host.innerHTML = '';

    var box = el('div', 'demo-placeholder');
    box.appendChild(el('p', 'micro-label', 'Espacio reservado'));

    if (opts.titulo) box.appendChild(el('h3', 'demo-placeholder-title', opts.titulo));

    if (opts.puntos && opts.puntos.length) {
      var list = el('ul', 'demo-placeholder-list');
      opts.puntos.forEach(function (punto) {
        list.appendChild(el('li', null, punto));
      });
      box.appendChild(list);
    }

    box.appendChild(el('p', 'note-inline',
      'La aplicación se montará aquí mismo cuando el proyecto esté desarrollado, ' +
      'con sus datos, sus controles y sus fuentes.'));

    host.appendChild(box);

    return {
      destroy: function () { host.innerHTML = ''; }
    };
  }

  return {
    register: register,
    get: get,
    all: all,
    forArea: forArea,
    placeholder: placeholder,
    el: el,
    chip: chip
  };
})();
