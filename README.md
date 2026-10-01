# Garaje Masti Motor — web

Web estática (HTML + CSS + JS, sin dependencias ni build) para Garaje Masti Motor, taller mecánico en Errenteria.

## Ver en local

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

Para publicarla basta con subir la carpeta a cualquier hosting estático (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

## Concepto: «Del ruido a la señal»

Un coche llega con ruido (un síntoma) y sale con una señal limpia (diagnóstico y reparación). El sistema visual sale de ahí:

- **La Señal**: traza SVG generativa (`js/main.js → makeSignal`). Es ruidosa a la izquierda y limpia a la derecha, se calma con el scroll y reacciona al cursor.
- **Canales**: cada servicio es un canal (CH·01–05) con su propia forma de onda.
- **Calibre**: marcas de medición (`.tick`, `.gauge`, regla del hero) y códigos en mono.
- **Matrícula**: el campo de matrícula del formulario como componente propio.

| Elemento | Valor |
|---|---|
| Tipografía | Archivo variable (eje de anchura 62–125) + JetBrains Mono, autoalojadas en `assets/fonts` |
| Color | Hormigón `#ECEAE4` · Grafito `#121314` · Fósforo `#C8F43A` (solo sobre grafito o como fondo) |
| Grid | 12 columnas, márgenes y gutter fluidos con `clamp()` |
| Movimiento | Easing `cubic-bezier(.2,.7,0,1)`; todo se desactiva con `prefers-reduced-motion` |

## Datos del negocio usados (fuentes públicas: directorios de talleres)

- Dirección: Polígono Masti-Loidi 15, 20100 Errenteria (Gipuzkoa)
- Teléfono: 943 01 09 50 · Email: mastimotor@yahoo.es
- Horario: L–V 08:00–13:00 y 15:00–19:00
- Servicios: mecánica general, electricidad, electrónica, inyección electrónica, aire acondicionado
- Valoración: 4,6/5 (agregadores de opiniones)

## Pendiente de confirmar con el taller

1. **Teléfono, email, horario y valoración**: confirmar que siguen vigentes.
2. **Formulario**: ahora abre el correo del cliente con la solicitud ya redactada (`mailto:`), sin backend. Para recibir las solicitudes directamente, conectar Formspree o similar en el `submit` de `js/main.js`.
3. **Fotografía real del taller**: no hay fotos públicas utilizables. Tratamiento recomendado: detalles (manos, herramientas, equipo de diagnosis) en blanco y negro con mucho contraste, sin coches de catálogo.
4. **Dominio**: añadir `<link rel="canonical">`, `og:url`, `og:image` y `sitemap.xml` cuando exista el dominio.
5. **Textos legales**: aviso legal y política de privacidad (RGPD).
