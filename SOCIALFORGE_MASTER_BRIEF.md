# SOCIALFORGE MASTER BRIEF

## Documento maestro de continuidad, dirección de proyecto y registro técnico

**Fecha de corte:** 27 de septiembre de 2026\
**Responsable de producto y propietario:** Ale (Alejandro)\
**Dirección de proyecto y coordinación técnica en ChatGPT:** asistente,
como jefa de proyecto\
**Herramienta de implementación asistida:** Claude, bajo tareas
delimitadas y revisables\
**Estado actual:** Build Windows #31 abre correctamente; interfaz
todavía es un placeholder.\
**Prioridad inmediata:** convertir SocialForge en una aplicación útil,
comenzando por inspeccionar la UI existente y construir el primer flujo
local de publicaciones.

------------------------------------------------------------------------

# 0. INSTRUCCIÓN DE RESURRECCIÓN

Si se pierde o termina una conversación, cargar este brief y continuar
desde el estado aquí registrado. No repetir investigaciones ya resueltas
salvo que aparezca evidencia nueva.

**Frase de continuidad:**

> SocialForge ya arranca. No estamos intentando revivirlo. Estamos
> construyendo lo que falta.

La fuente de verdad del código es:

`C:\Users\alejh\OneDrive\Docs-ForLatam\socialforge`

No usar carpetas de extracción o instaladores como si fueran el
repositorio fuente.

El siguiente paso al retomar es inspeccionar la UI y el frontend
actuales desde el repositorio verdadero, identificar sus componentes y
comandos existentes, y planear el primer flujo funcional sin inventar
una arquitectura paralela.

------------------------------------------------------------------------

# 1. DIRECCIÓN DE PROYECTO Y FORMA DE TRABAJO

Ale ha designado a ChatGPT como jefa de proyecto para SocialForge.
Claude será utilizado como herramienta de implementación bajo
instrucciones específicas y acotadas.

## Responsabilidades de la dirección del proyecto

-   Mantener una visión coherente del producto y su arquitectura.
-   Dividir el trabajo en tareas pequeñas, verificables y ordenadas.
-   Inspeccionar el estado real del repositorio antes de ordenar
    cambios.
-   Especificar archivos, alcance, criterios de aceptación y pruebas
    para cada tarea.
-   Evitar cambios colaterales y rediseños no solicitados.
-   Revisar los diffs, resultados de compilación y pruebas que Ale
    comparta.
-   Mantener actualizado este brief con hitos, decisiones, incidentes y
    estado.
-   Dar instrucciones paso a paso, especialmente para PowerShell y VS
    Code.
-   No afirmar que una tarea está terminada hasta contar con evidencia
    de compilación/prueba adecuada.

## Papel de Ale

Ale es el propietario del producto y toma las decisiones de producto. No
es necesario que programe ni que conozca internamente Rust, React o
Tauri. Las instrucciones operativas deben ser claras, copiables y de una
acción a la vez cuando haya riesgo técnico.

## Papel de Claude

Claude puede inspeccionar o modificar el repositorio cuando Ale le
proporcione las instrucciones. No debe recibir encargos abiertos como
"construye toda la aplicación" sin alcance ni criterios.

Cada tarea que se le delegue debe incluir:

1.  Contexto mínimo relevante.
2.  Objetivo concreto.
3.  Archivos que puede inspeccionar o modificar.
4.  Restricciones explícitas.
5.  Criterios de aceptación.
6.  Pruebas que debe ejecutar.
7.  Resumen de archivos modificados y resultados.
8.  Diff o evidencia verificable para revisión.

Claude no debe cambiar arquitectura, esquema de datos, dependencias,
nombres de producto ni archivos fuera del alcance sin autorización
previa.

------------------------------------------------------------------------

# 2. VISIÓN DEL PRODUCTO

SocialForge es una aplicación local-first para gestionar, preparar y
programar publicaciones en redes sociales.

La intención es ofrecer una alternativa de costo accesible frente a
servicios como Metricool o Hootsuite, conservando el control del usuario
sobre sus datos y su flujo de programación.

Principios de producto:

-   Aplicación de escritorio.
-   Datos y programación principalmente locales.
-   SQLite local como almacenamiento principal.
-   Scheduler local, no dependiente de un servidor remoto para
    funcionar.
-   Backend remoto mínimo y deliberado.
-   Integración inicial prevista con Facebook Pages e Instagram.
-   Tokens y secretos fuera de SQLite, usando Keychain/almacenamiento
    seguro del sistema operativo.
-   Cloudflare Worker/D1 para servicios que sí requieran backend:
    licencias, entitlements, callbacks OAuth, webhooks y funciones
    remotas necesarias.
-   Diseño que permita evolucionar sin acoplar la operación principal a
    un SaaS central.

La promesa de marca que aparece actualmente en la aplicación es:

**"Tus redes sociales. Tu máquina. Tus datos."**

------------------------------------------------------------------------

# 3. FUENTE DE VERDAD Y ORÍGENES

## Repositorio local verdadero

`C:\Users\alejh\OneDrive\Docs-ForLatam\socialforge`

Este es el repositorio Git que se sincroniza con GitHub y desde el cual
se construyen los instaladores.

## GitHub remoto

`https://github.com/flabelicornio/socialforge.git`

Remote:

`origin https://github.com/flabelicornio/socialforge.git`

Branch de trabajo conocida:

`main`

## Último estado Git registrado

Commit:

`5ea2556786807b12ea8b0026189d717a41404553`

Abreviado: `5ea2556`

Mensaje: `actualizacion`

Fecha: `2026-09-26 21:59:57 -0600`

Autor: `flabelicornio`

En la comprobación realizada, el repositorio estaba limpio y alineado
con `origin/main`. Antes de nuevos cambios, volver a comprobar
`git status` y el HEAD real.

## Carpetas de artefactos o copias que NO son fuente de verdad

Durante el diagnóstico se usaron ubicaciones en E:, entre ellas:

-   `E:\socialforge-test`
-   `E:\socialforge-test\artifact31`
-   `E:\socialforge-extracted\socialforge`
-   `E:\sclf`
-   `E:\socialforge-msi-extracted`
-   `E:\SocialForge-Install`

Pueden contener instaladores, extracciones o copias de diagnóstico. No
usarlas para modificar el código fuente.

Una extracción antigua carecía de `004_link_url.sql` aunque su `main.rs`
lo referenciaba. Por ello, siempre inspeccionar el repositorio verdadero
antes de sacar conclusiones.

------------------------------------------------------------------------

# 4. ESTRUCTURA DEL REPOSITORIO

En la raíz se observaron:

-   `.git`
-   `.github`
-   `apps`
-   `design`
-   `docs`
-   `packages`
-   `worker`
-   `.gitignore`
-   `meta-config-context.md`
-   `package.json`
-   `README.md`
-   `SOCIALFORGE_MASTER_BRIEF.md`

Rutas conocidas:

-   Aplicación desktop: `apps\desktop`
-   Código Tauri/Rust: `apps\desktop\src-tauri`
-   Migraciones: `apps\desktop\src-tauri\migrations`
-   Workflow de build: `.github\workflows\build.yml`
-   Worker: `worker`

El framework y los archivos exactos del frontend todavía deben
inspeccionarse desde la fuente verdadera en la próxima sesión. No asumir
nombres de componentes antes de leer el árbol actual.

------------------------------------------------------------------------

# 5. ARQUITECTURA CONOCIDA

Tecnologías conocidas o indicadas por el repositorio y el pipeline:

-   Tauri
-   Rust
-   SQLite
-   frontend web
-   GitHub Actions
-   Cloudflare Worker
-   Cloudflare D1, para funciones remotas que lo requieran
-   Keychain del sistema operativo para tokens/secretos

Arquitectura conceptual:

``` text
             SOCIALFORGE DESKTOP
                      |
          +-----------+-----------+
          |                       |
      Frontend                Tauri / Rust
          |                       |
          +-----------+-----------+
                      |
                   SQLite
                      |
              Scheduler local
                      |
             +--------+---------+
             |                  |
          Meta APIs        Cloudflare Worker
                                |
                           D1 / servicios
```

Esta es una arquitectura de intención. Antes de modificarla,
inspeccionar el código actual y distinguir lo ya implementado de lo
planificado.

------------------------------------------------------------------------

# 6. MODELO DE DATOS CONOCIDO

## Tabla `posts`

En la DB inspeccionada se observaron estas columnas:

-   `id`
-   `workspace_id`
-   `text`
-   `platforms`
-   `media_ids`
-   `link_url`
-   `scheduled_for`
-   `status`
-   `failure_reason`
-   `created_at`
-   `updated_at`

No alterar el esquema sin revisar todas las consultas y comandos que lo
usan y sin crear una migración nueva.

## Tabla `accounts`

Después de la migración 005, se verificaron:

-   `id`
-   `workspace_id`
-   `platform`
-   `display_name`
-   `connected_at`
-   `external_account_id`
-   `extra_json`

`external_account_id` identifica la cuenta o página real de la
plataforma. `extra_json` guarda metadatos adicionales.

Los tokens de acceso no deben almacenarse en SQLite. El comentario de la
migración 005 señala que deben vivir en el Keychain del sistema
operativo.

------------------------------------------------------------------------

# 7. INCIDENTE CRÍTICO DE ARRANQUE, RESUELTO

## Síntoma original

El MSI instalaba correctamente, pero `socialforge.exe` mostraba una
ventana aproximadamente un segundo y se cerraba.

Código de salida observado:

`ExitCode = 101`

Las primeras pruebas de consola y backtrace no mostraron una explicación
visible. No se encontraron informes WER relevantes en las ubicaciones
consultadas.

## Build comprobada

GitHub Actions:

-   Workflow: `Build Desktop App`
-   Build #31
-   Run ID: `36293019345`
-   Commit: `5ea2556`
-   Artifact ID: `10922474225`

Artifact descargado:

`E:\socialforge-windows-latest (1).zip`

Tamaño: `7758536` bytes

SHA256 ZIP:

`bed4fbc060f350faa97ba7f67a5db950890379ae009c64ed218d59a3fddc226c`

MSI contenido:

`release\bundle\msi\SocialForge_0.1.0_x64_en-US.msi`

SHA256 MSI #31:

`EC08CCB4C64CC45469DB339DC4570B25763D6C93F360FD5C023F0DF5402CF021`

El MSI anterior que se había probado tenía hash distinto:

`9B60670642A91DA6CB80CE3EE34A53137880C4898DE95406C544DAFB5ADC94E8`

Por lo tanto, aquel instalador anterior no era el artefacto #31.

## DB local que causaba el problema

Ruta:

`C:\Users\alejh\AppData\Roaming\studios.latam.socialforge\socialforge.db`

Estado antes de la reparación:

-   Tamaño: `81920` bytes
-   `PRAGMA integrity_check`: `ok`
-   `PRAGMA user_version`: `3`
-   La tabla `posts` ya tenía `link_url`.
-   `accounts` todavía no tenía `external_account_id` ni `extra_json`.

Migración 004:

Archivo: `apps\desktop\src-tauri\migrations\004_link_url.sql`

Contenido:

``` sql
ALTER TABLE posts ADD COLUMN link_url TEXT;
```

Migración 005:

Archivo: `apps\desktop\src-tauri\migrations\005_account_external_id.sql`

Contenido relevante:

``` sql
ALTER TABLE accounts ADD COLUMN external_account_id TEXT;
ALTER TABLE accounts ADD COLUMN extra_json TEXT;
```

En `main.rs`, el migrador manual usa `PRAGMA user_version`, recorre las
migraciones y ejecuta las que tienen versión superior a la versión
registrada. El código observado usa `expect("migración falló")` ante un
error de `execute_batch`, lo que puede causar un panic.

## Causa demostrada

La base tenía el esquema de la migración 004 aplicada, pero el contador
`user_version` seguía en 3.

El programa interpretaba que debía volver a ejecutar 004. SQLite
rechazaba la operación porque `posts.link_url` ya existía. El
`expect("migración falló")` provocaba el panic y el proceso terminaba
con código 101.

Cadena:

``` text
user_version = 3
        |
migración 004 considerada pendiente
        |
ADD COLUMN link_url
        |
link_url ya existe
        |
execute_batch falla
        |
expect("migración falló")
        |
Rust panic / ExitCode 101
```

## Respaldo creado

Antes de modificar la DB se creó:

`C:\Users\alejh\AppData\Roaming\studios.latam.socialforge\socialforge.db.backup-2026-09-27`

Tamaño verificado: `81920` bytes, igual al archivo original al momento
de la copia.

No borrar este respaldo sin autorización y sin confirmar que existen
copias posteriores seguras.

## Reparación controlada realizada

Se comprobó que el proceso `socialforge.exe` estaba cerrado.

Con Python y SQLite se cambió únicamente:

`PRAGMA user_version` de `3` a `4`.

No se alteraron manualmente tablas ni datos.

Después se lanzó el mismo ejecutable instalado. La aplicación permaneció
abierta. La migración 005 se ejecutó automáticamente.

Verificación posterior:

-   `user_version = 5`
-   `accounts` contiene `external_account_id` y `extra_json`
-   `integrity_check = ok`

Esto demuestra que el MSI #31 arranca con la DB reparada y que la
migración 005 se ejecutó correctamente.

## Conclusión

El problema observado no era que el MSI #31 no pudiera arrancar. Era la
discrepancia entre el contador de migraciones y el esquema de una DB
existente.

La instalación actual funciona, pero el código del migrador sigue
necesitando endurecimiento antes de distribuir futuras versiones.

------------------------------------------------------------------------

# 8. ESTADO ACTUAL DE LA APLICACIÓN INSTALADA

Instalación:

`C:\Program Files\SocialForge\`

Ejecutable:

`C:\Program Files\SocialForge\socialforge.exe`

Acceso de desinstalación observado:

`C:\Program Files\SocialForge\Uninstall SocialForge.lnk`

La aplicación abre correctamente y muestra:

``` text
ES   EN

# SocialForge

Tus redes sociales. Tu máquina. Tus datos.

## Próximas publicaciones

Todavía no hay publicaciones.
```

Fuera de los controles normales de la ventana, actualmente solo hay
selector de idioma y contenido de bienvenida. No hay todavía botones o
navegación funcional para crear publicaciones, gestionar cuentas,
calendario o configuración.

Por tanto:

**El arranque está resuelto. La UI funcional y los flujos de producto
todavía están por construir.**

No cerrar ni modificar la instalación de referencia innecesariamente. Se
puede usar para pruebas manuales.

------------------------------------------------------------------------

# 9. ICONOS Y MARCA

Los iconos que aparecen en el MSI #31 son un placeholder generado por el
pipeline.

Ale había creado/proporcionado iconos personalizados en otra
conversación y desea recuperarlos e incorporarlos. Es posible que los
iconos finales no estén actualmente aplicados en el repositorio o que
Claude haya dejado el placeholder.

Pendiente:

-   localizar los archivos originales;
-   confirmar su formato y transparencia;
-   eliminar fondos si corresponde;
-   generar tamaños/formatos adecuados para Tauri y Windows;
-   actualizar los recursos correctos;
-   compilar un nuevo artefacto y comprobar visualmente el instalador y
    la app.

No priorizar los iconos por encima del primer flujo funcional. No
inventar ni recrear los archivos originales sin que Ale los proporcione
o identifique.

------------------------------------------------------------------------

# 10. PIPELINE DE BUILD Y DISTRIBUCIÓN

Workflow:

`.github/workflows/build.yml`

Nombre: `Build Desktop App`

Disparadores conocidos:

-   push a `main`
-   `workflow_dispatch`

Matrix observada:

-   Ubuntu 22.04
-   Windows latest
-   macOS latest con target `aarch64-apple-darwin`

Pasos principales:

-   checkout;
-   Node 20;
-   Rust stable;
-   cache de Rust;
-   instalación de dependencias;
-   generación de iconos con Tauri;
-   build mediante `tauri-apps/tauri-action@v0`;
-   upload de artifacts mediante `actions/upload-artifact@v4`.

Los artifacts se suben desde rutas bajo:

`apps/desktop/src-tauri/target/**/bundle/`

y:

`apps/desktop/src-tauri/target/**/release/bundle/`

La build #31 es la referencia Windows funcional actual, con la salvedad
de que su DB fue reparada localmente.

Para futuros builds: identificar siempre el run, commit, artifact y hash
del MSI antes de instalar. No confundir un MSI antiguo con el artefacto
recién generado.

------------------------------------------------------------------------

# 11. HISTORIAL TÉCNICO RELEVANTE

Últimos commits conocidos:

``` text
5ea2556  actualizacion
f8b7cb7  actualizacion
55f1356  actualizacion
02b655a  Fix database connection lifetime
d716b78  actualizacion
17fc95a  actualizacion
54d8d7c  Update main.rs with keychain commands
26d63de  Revise SOCIALFORGE_MASTER_BRIEF with recent changes
89b9af6  Add missing migration 004_link_url
bef5a00  Add SocialForge master brief
```

### `89b9af6`

Añadió el archivo `004_link_url.sql` con
`ALTER TABLE posts ADD COLUMN link_url TEXT;`.

### `02b655a`

Corrigió un lifetime en `get_conn`, cambiando la firma para explicitar
la vida útil de `State` y el `MutexGuard`. Es una corrección de
Rust/lifetime y no debe confundirse con el bug de migraciones.

### `54d8d7c`

Actualizó `main.rs` con comandos relacionados con Keychain.

### `5ea2556` y `f8b7cb7`

Cambios al Master Brief. No fueron cambios de código de la aplicación,
según los `git show --stat` revisados.

------------------------------------------------------------------------

# 12. PLAN DE PRODUCTO: AHORA SÍ, LO QUE FALTA

El objetivo es pasar de una app que abre a un producto que completa un
flujo útil de principio a fin.

No implementar todas las fases en una sola tarea.

## Fase 0: inspección y mapa real del frontend

**Siguiente tarea inmediata.**

Desde el repositorio verdadero:

1.  Comprobar `git status --short --branch` y HEAD.
2.  Inspeccionar `apps\desktop` y `apps\desktop\src-tauri`.
3.  Identificar framework frontend, punto de entrada, componente raíz,
    estilos y sistema de idioma.
4.  Identificar comandos Tauri ya registrados y cómo se invocan desde el
    frontend.
5.  Identificar comandos CRUD existentes para posts, workspaces, cuentas
    y settings.
6.  Revisar `package.json`, configuración Tauri y archivos relevantes.
7.  Registrar qué existe realmente y qué es solo placeholder.

No modificar archivos durante esta fase. La salida debe ser un mapa de
arquitectura real, con rutas y responsabilidades.

## Fase 1: robustecer migraciones

Antes de distribuir una nueva versión:

-   inspeccionar todo el sistema actual;
-   diseñar manejo seguro de errores;
-   evitar que un fallo de migración termine en panic sin información;
-   considerar transacciones y migraciones atómicas;
-   detectar estados de esquema que ya tengan una columna aunque el
    contador esté atrasado;
-   definir estrategia segura para instalaciones nuevas y
    actualizaciones;
-   agregar pruebas de migración;
-   probar DB limpia y DB heredada;
-   no hacer que `IF NOT EXISTS` o una tolerancia genérica oculte
    incompatibilidades sin validar el esquema.

La corrección debe diseñarse con conocimiento del código completo y de
las migraciones 001--005. No realizar un parche aislado sin revisar el
flujo entero.

## Fase 2: dashboard funcional

Convertir la pantalla placeholder en un dashboard coherente con:

-   botón/acción Nueva publicación;
-   lista de próximas publicaciones;
-   publicaciones recientes;
-   cuentas conectadas o estado vacío;
-   acceso a configuración.

La UI debe mantener coherencia con la marca y permitir ES/EN. El diseño
visual debe ser limpio y funcional, sin sobrecargar el primer
incremento.

## Fase 3: composer

Flujo previsto:

``` text
Nueva publicación
       |
       +-- texto
       +-- medios (posteriormente)
       +-- enlace
       +-- selección de plataformas
       |
       +-- guardar borrador
       +-- programar
       +-- publicar ahora (cuando integración esté lista)
```

Primero construir el flujo local y persistente. No simular publicación
remota como si fuera real.

## Fase 4: CRUD y persistencia local

Probar:

-   crear borrador/publicación;
-   guardar;
-   listar;
-   editar;
-   eliminar con confirmación;
-   recuperar después de cerrar y reabrir;
-   validar campos;
-   manejar errores visibles.

Prueba de aceptación mínima:

``` text
crear publicación
→ guardar
→ aparece en lista
→ cerrar app
→ abrir app
→ publicación sigue presente
```

La UI debe conectarse a los comandos Tauri/Rust existentes o implementar
comandos nuevos solo si hacen falta y están diseñados.

## Fase 5: scheduler local

Implementar/verificar:

-   fecha y hora;
-   zona horaria;
-   cola local;
-   estados y transiciones;
-   ejecución a la hora programada;
-   reintentos;
-   errores visibles;
-   comportamiento con suspensión/cierre/reinicio del equipo;
-   prevención de publicaciones duplicadas.

Documentar límites del scheduler local, especialmente si la app está
cerrada o el equipo suspendido.

## Fase 6: cuentas y credenciales

-   conexión de cuenta;
-   selección de plataforma;
-   OAuth;
-   selección de Facebook Page;
-   asociación de Instagram profesional cuando corresponda;
-   persistencia de IDs externos y metadatos;
-   almacenamiento seguro de tokens;
-   desconexión/revocación y errores de autorización.

## Fase 7: integración Meta

Primera integración prevista:

-   Facebook Pages;
-   Instagram.

Verificar permisos, requisitos de cuenta, flujo OAuth, endpoints
vigentes, formatos y restricciones de publicación antes de implementar.
No asumir que cualquier perfil personal puede publicar mediante API.

## Fase 8: medios

-   selección/importación local de imágenes y videos;
-   almacenamiento y referencias locales;
-   thumbnails;
-   validación de formatos/tamaños;
-   asociación a publicaciones;
-   carga/transmisión a plataformas al publicar.

## Fase 9: Cloudflare y monetización

-   Worker;
-   D1 donde sea necesario;
-   licencias;
-   entitlements;
-   callbacks OAuth;
-   webhooks;
-   planes/precios.

No trasladar el scheduler local a la nube por conveniencia accidental.

## Fase 10: distribución y QA

Casos obligatorios:

1.  instalación limpia;
2.  primer arranque con DB nueva;
3.  migraciones 001--005;
4.  actualización desde DB existente;
5.  actualización con esquema y `user_version` desalineados;
6.  persistencia;
7.  desinstalación y reinstalación;
8.  manejo de errores;
9.  verificación de versión/hash del MSI;
10. verificación de iconos y recursos.

------------------------------------------------------------------------

# 13. PROTOCOLO PARA CADA TAREA DE IMPLEMENTACIÓN

Cada tarea se hará en un ciclo controlado:

1.  **Inspección:** confirmar estado Git y leer archivos actuales.
2.  **Especificación:** objetivo, alcance, archivos, restricciones y
    criterios.
3.  **Implementación:** Claude modifica solo lo autorizado.
4.  **Revisión:** inspeccionar resumen y diff; buscar cambios
    inesperados.
5.  **Pruebas:** ejecutar pruebas y build pertinentes.
6.  **Git:** revisar `git diff`, `git status`, y commits.
7.  **Build:** esperar a que GitHub Actions construya el commit
    correcto.
8.  **Artefacto:** verificar run, commit, nombre y hash.
9.  **Prueba real:** instalar/probar cuando corresponda.
10. **Registro:** actualizar el brief con el resultado real.

No avanzar a la siguiente fase si falla un criterio de aceptación
esencial.

------------------------------------------------------------------------

# 14. PROTOCOLO DE SEGURIDAD Y DIAGNÓSTICO

Regla general:

**Observar → respaldar → formular hipótesis → probar sin modificar →
hacer cambio mínimo → verificar.**

No borrar AppData ni la DB para resolver un problema por reflejo.

No modificar bases de datos sin:

-   comprobar que la aplicación está cerrada;
-   crear respaldo verificable;
-   conocer exactamente la operación;
-   comprobar resultado inmediatamente.

No reinstalar repetidamente sin identificar qué artefacto se está
instalando.

No tratar como fuente de verdad una carpeta extraída, un MSI o un
directorio de build.

No afirmar que algo funciona porque compila solamente. Distinguir
compilación, instalación, arranque y prueba funcional.

------------------------------------------------------------------------

# 15. ESTADO ACTUAL RESUMIDO

## Confirmado funcionando

-   Repositorio verdadero y remoto identificados.
-   Build #31 identificada.
-   MSI #31 instalado en Windows.
-   Aplicación Tauri abre y permanece abierta después de corregir el
    estado de la DB.
-   SQLite está íntegra.
-   Migración 005 se ejecutó.
-   DB local reporta `user_version = 5`.
-   La UI placeholder aparece correctamente.
-   El selector ES/EN está visible.

## Todavía no construido o no verificado

-   Dashboard funcional.
-   Composer.
-   CRUD de publicaciones desde UI.
-   Persistencia desde UI.
-   Scheduler completo.
-   Conexión de cuentas.
-   OAuth/Meta funcional.
-   Publicación real.
-   Gestión de medios.
-   Licencias y monetización.
-   Migraciones robustas y pruebas automatizadas.
-   Iconos finales.
-   Pruebas de instalación limpia y actualización.

------------------------------------------------------------------------

# 16. PRÓXIMA ACCIÓN EXACTA

Al retomar, no pedirle a Claude que empiece a construir pantallas
todavía.

Primero, desde PowerShell en el repo verdadero:

``` powershell
cd "C:\Users\alejh\OneDrive\Docs-ForLatam\socialforge"
git status --short --branch
git log -1 --oneline
```

Después inspeccionar, sin editar:

-   `apps\desktop\package.json` (si existe);
-   `apps\desktop\src`;
-   `apps\desktop\src-tauri\src\main.rs`;
-   `apps\desktop\src-tauri\tauri.conf.json`;
-   comandos Tauri y llamadas `invoke`;
-   sistema actual de idioma;
-   CSS/estilos.

La dirección del proyecto debe convertir esa inspección en una primera
tarea acotada para Claude.

**Primer objetivo de producto recomendado:** Dashboard → Nueva
publicación → guardar localmente → reaparecer tras reiniciar.

------------------------------------------------------------------------

# 17. DECLARACIÓN FINAL DE CONTINUIDAD

SocialForge no está terminado, pero ya superó el primer umbral técnico:
la aplicación Windows arranca con la base de datos existente y las
migraciones llegan a versión 5.

El siguiente capítulo no es seguir reinstalando ni investigar el
arranque sin motivo. Es construir la experiencia de usuario, con pasos
pequeños y pruebas reales.

**SocialForge ya arranca. Ahora vamos a construir lo que falta.**
