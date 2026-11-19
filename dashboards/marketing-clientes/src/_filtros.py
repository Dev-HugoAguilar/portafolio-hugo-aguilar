from pathlib import Path
p = Path("ui/Filtros.tsx")
t = p.read_text(encoding="utf-8")

# 1) Prop onBuscar fuera de la firma del componente y del tipo.
t = t.replace("  onBuscar: (texto: string) => void;\n", "")
t = t.replace("  onBuscar,\n  onRestablecer,\n}: PropsFiltros) {\n  const [texto, setTexto] = useState(filtros.buscar);\n",
              "  onRestablecer,\n}: PropsFiltros) {\n")

# 2) Efectos del buscador (ya no existe el control).
t = t.replace("""  useEffect(() => {
    setTexto(filtros.buscar);
  }, [filtros.buscar]);

  useEffect(() => {
    if (texto === filtros.buscar) return;
    const temporizador = window.setTimeout(() => onBuscar(texto), 350);
    return () => window.clearTimeout(temporizador);
  }, [texto, filtros.buscar, onBuscar]);

""", "")

# 3) Chip de búsqueda.
t = t.replace("""  if (filtros.buscar.trim()) {
    activos.push({ clave: 'busqueda', texto: `«${filtros.buscar.trim()}»`, quitar: () => onBuscar('') });
  }
""", "")

# 4) Control visible: el modelo compacto no guarda eventos, así que buscar no filtra nada.
t = t.replace("""        <label className="mk-buscar">
          <IconoBuscar tamano={13} />
          <input
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Buscar evento, artículo o canal"
            aria-label="Buscar en la tabla de detalle"
            disabled={!habilitado}
          />
        </label>

""", "")
p.write_text(t, encoding="utf-8")
print("Filtros.tsx: buscador retirado")

p = Path("App.tsx")
t = p.read_text(encoding="utf-8")
t = t.replace("          onBuscar={setBusqueda}\n", "")
p.write_text(t, encoding="utf-8")
print("App.tsx: prop retirada")
