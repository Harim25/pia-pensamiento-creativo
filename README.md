# Bañoticias

Página web para saber qué baños de FIME tienen papel, jabón y agua antes de caminar hasta ahí, y para reportar en un toque lo que cada quien ve.

Proyecto del equipo **La Corregidora** para el PIA *¡Ingenieros al rescate!* de Pensamiento Creativo (FIME, UANL).

> **Estado actual:** la página ya está lista para conectarse a Supabase. Mientras `js/config.js` no tenga la URL y la llave, funciona en **modo de prueba**: usa reportes de ejemplo, el inicio de sesión es simulado y nada se guarda al recargar.

## El problema

Darse cuenta de que no hay rollo o jabón cuando ya estás adentro del baño es una frustración diaria en FIME: afecta la higiene básica y hace perder tiempo buscando otro baño en otro edificio, a veces con retardo a clase.

De la entrevista y de la dinámica de los 6 sombreros salió lo siguiente, que es lo que guía el diseño:

- El desabasto es constante y aleatorio: pasa a cualquier hora y en cualquier edificio, así que hace falta ver **todos** los baños.
- No solo faltan insumos; también hay **fallas**: dispensadores descompuestos, cerrojos que no cierran, puertas rotas.
- Todos traen celular, por eso la solución es una página web pensada primero para teléfono.
- La solución elegida es colaborativa: alumnos y personal reportan y consultan el estado de los baños.
- Riesgos que el equipo identificó y que hay que atender: reportes falsos (spam) y códigos QR falsos pegados sobre los originales (por eso no usamos QR).

## Qué hace

- Muestra el estado de todos los baños: papel, jabón, agua, toallas, fallas y si está abierto.
- Cualquiera puede consultar; para reportar hay que iniciar sesión (cualquier correo).
- Los reportes pueden llevar foto y comentario. Las fotos se reducen en el celular antes de subirse.
- Los reportes caducan a las 8 horas (`reportLifetimeHours` en `js/config.js`). Un baño sin reportes recientes aparece como «Sin reportes».
- Anti-spam: una persona no puede reportar el mismo baño dos veces en 10 minutos, ni más de 30 reportes al día.
- Los reportes de otras personas aparecen al momento (tiempo real).
- Las cuentas de intendencia ven una pestaña extra con los baños que necesitan atención y pueden marcarlos como atendidos.
- En «Mi cuenta» se elige el tema (automático, claro u oscuro) y se cierra sesión.

## Cómo verla

No hay que instalar nada. Lo más cómodo es un servidor local, por ejemplo la extensión **Live Server** de VS Code, o desde la terminal:

```bash
python -m http.server 5173
```

y luego entra a <http://localhost:5173>. En modo de prueba también abre con doble clic en `index.html`.

**Modo de prueba:** inicia sesión con cualquier correo y una contraseña de 6 caracteres o más. Si el correo empieza con `intendencia` (por ejemplo `intendencia@fime.mx`), entras como personal de intendencia.

## Conectar Supabase

Lo hace una sola vez quien administra el proyecto de Supabase:

1. **Crear las tablas.** En Supabase abre *SQL Editor → New query*, pega todo el archivo [`supabase/schema.sql`](supabase/schema.sql) y presiona *Run*. Crea las tablas, las reglas de seguridad, el límite anti-spam, el tiempo real y el bucket de fotos.
2. **Quitar la confirmación por correo** (recomendado). En *Authentication → Sign In / Providers → Email*, desactiva *Confirm email*. El plan gratuito solo manda unos pocos correos por hora, así que con la confirmación activada la gente no podría registrarse en la entrega.
3. **Poner la URL de la página.** En *Authentication → URL Configuration*, pon en *Site URL* la dirección donde está publicada la página.
4. **Pegar las llaves.** En `js/config.js` pon la URL del proyecto y la **Publishable key** (empieza con `sb_publishable_`), ambas en *Project Settings → API Keys*. Esa llave sí se puede subir a GitHub. **La secreta (`sb_secret_`) nunca va en el código ni en el README.**
5. **Cuentas de intendencia.** La persona crea su cuenta en la página y después, en el SQL Editor, corres:

   ```sql
   update public.profiles set role = 'staff' where email = 'correo@ejemplo.com';
   ```

## Estructura

```
index.html            Estructura de la página (sin estilos ni lógica)
css/
  variables.css       Colores, sombras y tipografías (tema claro y oscuro)
  base.css            Reinicio y utilidades generales
  layout.css          Encabezado, resumen y pie
  components.css      Controles, filtros, tarjetas, reportes, intendencia, botones
  sheets.css          Hojas (reporte, inicio de sesión, cuenta) y campos de formulario
js/
  theme.js            Tema claro/oscuro (se carga primero, en el <head>)
  config.js           URL y llave de Supabase y ajustes generales
  data.js             Catálogos (insumos, fallas, edificios, pisos) y datos de ejemplo
  utils.js            Funciones de apoyo (tiempo, fotos, avisos)
  api.js              Comunicación con Supabase, o el modo de prueba si no hay llaves
  store.js            Estado de los baños calculado a partir de los reportes
  render.js           Dibuja el resumen, la lista, los reportes y la vista de intendencia
  dialog.js           Abre y cierra las hojas
  auth.js             Inicio de sesión, crear cuenta y «Mi cuenta»
  report-sheet.js     Formulario de reporte con foto y comentario
  staff.js            Botón «Marcar como atendido» de intendencia
  main.js             Filtros, vistas y carga inicial; aquí arranca todo
supabase/
  schema.sql          Tablas, reglas de seguridad y bucket de fotos
assets/               Ícono del sitio
prototipo/            Prototipo original en un solo archivo. Es referencia: no se edita
docs/                 Documentos de las actividades del curso (no se suben, ver .gitignore)
```

Los scripts se cargan en ese orden desde `index.html` y comparten un solo objeto global, `BanosFIME`. Supabase se carga desde el CDN de jsDelivr con una etiqueta `<script>`, así que no hay que instalar nada ni usar `npm`.

### Dónde tocar para cada cosa

| Quiero… | Archivo |
| --- | --- |
| Cambiar un color o una tipografía | `css/variables.css` |
| Agregar un insumo, una falla o un edificio | `js/data.js` |
| Cambiar cuándo un baño está «Con problemas» | `js/store.js` → `getStatus` |
| Cambiar cómo se ve una fila o una tarjeta | `js/render.js` y `css/components.css` |
| Cambiar las preguntas del reporte | `js/report-sheet.js` |
| Cambiar cuánto duran los reportes | `js/config.js` → `reportLifetimeHours` |
| Cambiar los límites anti-spam | `supabase/schema.sql` → `before_report_insert` (y su copia en `js/api.js` para el modo de prueba) |
| Conectar la base de datos | `js/config.js` (ver «Conectar Supabase») |

## Pendientes

- [x] Registrar los edificios y pisos reales de FIME en `js/data.js`.
- [x] Guardar los reportes en un servidor para que todos vean lo mismo (falta conectar Supabase, ver arriba).
- [x] Caducar reportes viejos.
- [x] Permitir subir fotos a los reportes o comentarios.
- [x] Frenar reportes falsos: inicio de sesión, límite por persona y conteo de confirmaciones.
- [x] Hacer pantalla de login.
- [x] Hacer pantalla de configuración general (tema y cerrar sesión, en «Mi cuenta»).
- [ ] Publicar la página (por ejemplo con GitHub Pages).

## Cómo colaborar

1. Antes de empezar, baja lo último: `git pull`.
2. Crea una rama para tu cambio: `git checkout -b nombre-del-cambio`.
3. Haz el cambio y pruébalo en el navegador, en tamaño de celular y de computadora.
4. Sube la rama y abre un *pull request* para que alguien más del equipo lo revise.

Convenciones del código: los comentarios y los textos que ve el usuario van en español; los nombres de variables, funciones y clases CSS van en inglés. El estado de un baño siempre se muestra con texto e ícono, nunca solo con color.
