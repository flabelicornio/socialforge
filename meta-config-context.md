# Configuración actual de la app de Meta — SocialForge

## Datos de la app
- Nombre de la app: SocialForge
- Tipo de app: Business
- App ID: 1245604221092071
- Business Portfolio: LaTAM Studios

## Casos de uso seleccionados al crear la app
- Administrar mensajes y contenido en Instagram
- Administrar todos los aspectos de tu página

(Meta agregó automáticamente el producto "Facebook Login for Business" al elegir estos dos casos de uso.)

## Configuration creada en Facebook Login for Business
Estamos creando una "Configuration" dentro de Facebook Login for Business, con estos pasos:

### Paso: Token de acceso
- Opción elegida: "Token de acceso de usuario" (NO "Token de acceso de usuario del sistema")
- Caducidad: 60 días

### Paso: Activos
Marcados como requeridos:
- ✅ Páginas
- ✅ Cuentas de Instagram

Desmarcados (no requeridos):
- ❌ Cuentas publicitarias
- ❌ Catálogos
- ❌ Píxeles

### Paso: Permisos
**PROBLEMA ACTUAL:** el buscador de permisos solo permite seleccionar/muestra:
- business_management
- pages_show_list

Al escribir en el buscador los siguientes permisos, NO aparecen como opción:
- pages_manage_posts
- pages_read_engagement
- instagram_basic
- instagram_content_publish

## Lo que necesitamos lograr
Que la app pueda, usando su propia cuenta de desarrollador (modo Standard Access,
sin pasar por App Review todavía — eso lo haremos después):
1. Autenticar al usuario vía OAuth (Facebook Login for Business)
2. Listar las Páginas de Facebook que administra
3. Publicar posts (texto + imagen/video) en esas Páginas
4. Listar y publicar en la cuenta de Instagram Business ligada a esas Páginas

## Redirect URI configurado
```
https://socialforge.wolves-and-crows.workers.dev/oauth/facebook/callback
```

## Pregunta para Meta AI
¿Qué falta configurar en la app o en la Configuration para que los permisos
`pages_manage_posts`, `pages_read_engagement`, `instagram_basic` e
`instagram_content_publish` aparezcan como seleccionables en el paso de
Permisos de la Configuration de Facebook Login for Business? ¿Hace falta
agregar algún producto adicional (Pages API, Instagram Graph API), o algo
distinto en el paso de Casos de uso o Activos?
