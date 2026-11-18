"""Reconstruye el HTML aprobado sin paquetes externos ni reentrenamiento."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'marketing_customer_project/dashboard'
template=(p/'template-v2.html').read_text(encoding='utf-8')
assert template.count('__DATA__')==1
html=template.replace('__DATA__',(p/'data-v2.json').read_text(encoding='utf-8'))
(p/'index.html').write_bytes(html.encode('utf-8'))  # bytes exactos: sin traducir el fin de línea
print('HTML generado:',p/'index.html')
