# Baños FIME

Página web para saber qué baños de FIME tienen papel, jabón y agua antes de caminar hasta ahí, y para reportar en un toque lo que cada quien ve.

Proyecto del equipo **La Corregidora** para el PIA *¡Ingenieros al rescate!* de Pensamiento Creativo (FIME, UANL).

> **Estado actual:** versión de prueba. Los pisos, el estado de cada baño y los reportes son datos de ejemplo, y lo que se reporta solo cambia la pantalla de quien lo reporta (se pierde al recargar). Todavía no hay servidor ni base de datos.

## El problema

Darse cuenta de que no hay rollo o jabón cuando ya estás adentro del baño es una frustración diaria en FIME: afecta la higiene básica y hace perder tiempo buscando otro baño en otro edificio, a veces con retardo a clase.

De la entrevista y de la dinámica de los 6 sombreros salió lo siguiente, que es lo que guía el diseño:

- El desabasto es constante y aleatorio: pasa a cualquier hora y en cualquier edificio, así que hace falta ver **todos** los baños.
- No solo faltan insumos; también hay **fallas**: dispensadores descompuestos, cerrojos que no cierran, puertas rotas.
- Todos traen celular, por eso la solución es una página web pensada primero para teléfono.
- La solución elegida es colaborativa: alumnos y personal reportan y consultan el estado de los baños.
- Riesgos que el equipo identificó y que hay que atender: reportes falsos (spam) y códigos QR falsos pegados sobre los originales.

## Cómo verla

No hay que instalar nada. Abre `index.html` con doble clic y funciona.

Para trabajar es más cómodo un servidor local que recargue solo, por ejemplo la extensión **Live Server** de VS Code, o desde la terminal:

```bash
python -m http.server 5173
```

y luego entra a <http://localhost:5173>.

## Estructura

```
index.html            Estructura de la página (sin estilos ni lógica)
css/
  variables.css       Colores, sombras y tipografías (tema claro y oscuro)
  base.css            Reinicio y utilidades generales
  layout.css          Encabezado, resumen y pie
  components.css      Controles, filtros, tarjetas de edificio, reportes, aviso
  report-sheet.css    Hoja de reporte
js/
  data.js             Catálogos (insumos, fallas, edificios) y datos de ejemplo
  utils.js            Funciones de apoyo
  store.js            Estado de los baños y reglas (qué estado tiene, cómo se aplica un reporte)
  render.js           Dibuja el resumen, la lista y los reportes
  report-sheet.js     Formulario de reporte
  main.js             Filtros y eventos; aquí arranca todo
assets/               Ícono del sitio
prototipo/            Prototipo original en un solo archivo. Es referencia: no se edita
docs/                 Documentos de las actividades del curso (no se suben, ver .gitignore)
```

Los scripts se cargan en ese orden desde `index.html` y comparten un solo objeto global, `BanosFIME`. Se hizo así, sin `import`/`export`, para que la página abra con doble clic.

### Dónde tocar para cada cosa

| Quiero… | Archivo |
| --- | --- |
| Cambiar un color o una tipografía | `css/variables.css` |
| Agregar un insumo, una falla o un edificio | `js/data.js` |
| Cambiar cuándo un baño está «Con problemas» | `js/store.js` → `getStatus` |
| Cambiar cómo se ve una fila o una tarjeta | `js/render.js` y `css/components.css` |
| Cambiar las preguntas del reporte | `js/report-sheet.js` |
| Conectar un servidor | `js/store.js` (ver el comentario al inicio) |

## Pendientes

- [ ] Poner los edificios, pisos y baños reales de FIME en `js/data.js`.
- [ ] Guardar los reportes en un servidor para que todos vean lo mismo.
- [ ] Caducar reportes viejos (un «no hay papel» de hace 5 horas ya no es confiable).
- [ ] Permitir subir fotos a los reportes o comentarios
- [ ] Frenar reportes falsos: límite por persona, pedir varias confirmaciones, acceso con cuenta universitaria.
- [ ] Códigos QR por baño que abran directo su hoja de reporte.
- [ ] Hacer pantalla de login
- [ ] Hacer pantalla de configuracion general (esta por verse)
- [ ] Vista para intendencia con lo que hay que reabastecer o reparar.
- [ ] Publicar la página (por ejemplo con GitHub Pages).

## Cómo colaborar

1. Antes de empezar, baja lo último: `git pull`.

## Llaves de la base de datos
contraseña para entrar: lacorregidora10

SUPABASE_URL=https://loupbzmuxqyrkynhpwux.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_dXu2cfjLAGlxulAzD3M64Q_0yO801Np
SUPABASE_SECRET_KEY=sb_secret_snmzqhW9LM4M4mACZGpT0Q_Hq3nLm1R
SUPABASE_JWKS_URL=https://loupbzmuxqyrkynhpwux.supabase.co/auth/v1/.well-known/jwks.json
2. Crea una rama para tu cambio: `git checkout -b nombre-del-cambio`.
3. Haz el cambio y pruébalo en el navegador, en tamaño de celular y de computadora.
4. Sube la rama y abre un *pull request* para que alguien más del equipo lo revise.

Convenciones del código: los comentarios y los textos que ve el usuario van en español; los nombres de variables, funciones y clases CSS van en inglés. El estado de un baño siempre se muestra con texto e ícono, nunca solo con color.
