# XManagmentStudio

Herramienta para revisar y dejar de seguir, en X, las cuentas que no te siguen de vuelta. Corre desde tu propia sesión en x.com mediante un bookmarklet. No usa la API de X, tokens ni credenciales.

Versión actual: 1.0.7. Cubre el Módulo 1, Mi cuenta.

Estado: la versión 1.0 quedó cerrada con la 1.0.6. La 1.0.7 es un parche. La lógica de dejar de seguir se revisa en la 1.1.

## Acceso

Página principal: https://maximoambro.github.io/XManagmentStudio/

La versión 1.0.7 tiene acceso abierto. Cualquiera puede instalar el bookmarklet desde esa página.

### Cambios en 1.0.7

Si tenías el marcador de la 1.0.6, borralo y arrastrá el nuevo. Cualquier cambio en `config.js` o en el script obliga a arrastrar el marcador otra vez. Si la pestaña tenía abierto el panel de la 1.0.6, el marcador nuevo lo reemplaza solo.

Importante si usaste la 1.0.6 con una cola de más de una cuenta: desde la segunda cuenta, esa versión registraba cada cuenta como hecha sin abrir su perfil ni hacer click, y la sumaba a los topes. La 1.0.7 lo corrige. Si corriste una cola así, revisá en X a quién seguís todavía antes de confiar en el historial.

- "Detener" pausa la cola y la conserva. El estado queda como "Pausado (detenido por el usuario)" y la lista no se reinicia.
- "Reanudar cola" se habilita siempre que haya una cola guardada y ningún proceso activo: después de "Detener", de una pausa por pestaña oculta, de un error o de una advertencia. Si falta el chequeo de sesión o la verificación del escaneo, el click lo explica en el log.
- Solo "Descartar cola" borra una cola con cuentas pendientes, y pide confirmación en el panel: el primer toque cambia el botón a "Confirmar descarte". Una cola que termina sin cuentas se borra sola, como antes. Cada borrado queda en el log con su motivo.
- Antes de retomar una acción interrumpida, el script revisa el perfil y decide solo con evidencia: "todavía la seguís" si aparece el botón de dejar de seguir, y "ya no la seguís" si aparecen el contenedor de acciones y el botón de seguir, sin el de dejar de seguir. Cualquier otra cosa es un error registrado, no un "ok". El log dice qué selector sirvió de evidencia.
- Si la cuenta interrumpida ya no se sigue, aunque la hayas dejado a mano, se registra como hecha y suma a los topes.
- Si al reanudar la hoja de confirmación de X sigue abierta, el script no toca nada: registra el error y deja la cola pausada. Cerrala a mano y apretá "Reanudar cola".
- Una parada en medio de una acción ("Detener", pestaña oculta o advertencia) deja esa acción como interrumpida, y se revisa al reanudar.

### Cambios en 1.0.6

Si tenías el marcador de la 1.0.5, borralo y arrastrá el nuevo. Cualquier cambio en `config.js` o en el script obliga a arrastrar el marcador otra vez. Si la pestaña tenía abierto el panel de la 1.0.5, el marcador nuevo lo reemplaza solo.

Si salís de la pestaña de X mientras corre un proceso, el proceso se pausa y hay que reanudarlo a mano.

- Pausa por pestaña oculta (`behavior.pauseOnHidden`). Si la pestaña de X queda oculta durante un escaneo o una cola de acciones, el proceso se pausa antes de la siguiente lectura o acción. El estado queda como "Pausado (pestaña oculta)" y el log registra la pausa.
- Escaneo pausado: se descarta, sin guardar resultado parcial. Volvé a la pestaña y escaneá de nuevo con el botón de siempre.
- Cola pausada: queda guardada. Si la pausa llegó en medio de una acción, esa acción se registra como interrumpida, no como error ni como advertencia, y la cuenta queda primera en la cola.
- Volver a la pestaña no reanuda nada. La cola se reanuda solo con "Reanudar cola".
- Al reanudar una acción interrumpida, el script revisa primero el perfil de esa cuenta. Si ya no la seguís, la registra como hecha sin volver a hacer click. Si todavía la seguís, la acción se reintenta.
- Mientras hay un proceso activo, el panel muestra debajo del estado: "Si salís de la pestaña de X, el proceso se pausa."
- Roadmap reordenado.

### Cambios en 1.0.5

Si tenías el marcador de la 1.0.4, borralo y arrastrá el nuevo. Cualquier cambio en `config.js` o en el script obliga a arrastrar el marcador otra vez. Si la pestaña tenía abierto el panel de la 1.0.4, el marcador nuevo lo reemplaza solo.

- Contador final: al terminar, el script vuelve a tu perfil y espera a que el contador "Siguiendo" muestre un número antes de leerlo. En la 1.0.4 leía la pestaña "Siguiendo" de la lista, que no tiene número, y el escaneo quedaba sin verificar aunque las cuentas coincidieran.
- Una sola pasada: se quitó la segunda pasada, que alargaba el escaneo sin sumar marcas "Te sigue". Se quitó `scan.secondPass` de `config.js`. Una cuenta es mutual si su fila tiene la marca cuando se lee.
- El escaneo queda verificado solo si las cuentas leídas son iguales al contador del inicio, el contador final se pudo leer y coincide con el del inicio, y no se agotaron los reintentos de red.
- El escaneo no tiene pausas largas. Las lecturas usan la espera de siempre (`timing.readDelay`). Las pausas largas siguen solo en las acciones de dejar de seguir.

### Cambios en 1.0.4

Si tenías el marcador de la 1.0.3, borralo y arrastrá el nuevo. Cualquier cambio en `config.js` o en el script obliga a arrastrar el marcador otra vez. Si la pestaña tenía abierto el panel de la 1.0.3, el marcador nuevo lo reemplaza solo.

- Fin de la pasada: termina cuando las cuentas leídas llegan al contador o lo pasan y la última ronda no agregó cuentas, o cuando se agotan los intentos extra al final de la página. Ya no depende de que la cantidad sea exactamente igual. Si se leen más cuentas que el contador, el log registra el exceso.
- Verificación: el escaneo queda verificado solo si las cuentas fusionadas son exactamente iguales al contador.
- Un error de red mientras se lee la lista ya no frena el escaneo. Se reintenta hasta 3 veces, con una espera de 3 a 8 segundos (`scan.networkRetries` y `scan.networkWaitRange`). Si se agotan, la pasada queda incompleta y el escaneo, sin verificar. En las acciones de dejar de seguir, un error de red sigue frenando el proceso como antes.
- Solo cuentan los avatares que tienen cerca, en su fila, un botón o enlace "Siguiendo" (o "Following"). Las etiquetas están en `followingLabels` de `config.js`. El log registra cuántos avatares se ignoraron en cada pasada.
- El log registra cuántas cuentas leyó cada pasada y cuáles aparecieron solo en una de las dos, con hasta 20 handles por grupo.
- Al terminar, el contador "Siguiendo" se vuelve a leer. Si cambió durante el escaneo, queda sin verificar.
- Un escaneo hecho con la 1.0.2 no tenía segunda pasada. Si el panel todavía muestra uno de esa versión, volvé a escanear antes de revisar los non-mutuals.

### Cambios en 1.0.3

Si tenías el marcador de la 1.0.2, borralo y arrastrá el nuevo. Cualquier cambio en `config.js` o en el script obliga a arrastrar el marcador otra vez. Si la pestaña tenía abierto el panel de la 1.0.2, el marcador nuevo lo reemplaza solo.

- El contador "Siguiendo" de tu perfil se lee antes de escanear. Mientras escanea, el panel muestra "Leídas X de Y".
- Al llegar al final de la lista, si faltan cuentas frente al contador, el escaneo hace hasta 4 intentos extra: vuelve al final, espera entre 5 y 10 segundos y relee (`scan.endRetries` y `scan.endWaitRange`).
- Segunda pasada: terminada la primera lectura, vuelve al inicio y recorre la lista otra vez. Si una cuenta tuvo la marca "Te sigue" en cualquiera de las dos pasadas, queda como mutual. Se desactiva con `scan.secondPass: false`.
- La verificación de cordura se evalúa después de las dos pasadas y de los intentos extra.
- El log queda guardado en `xms.log` (últimas 200 líneas, `logMax`) y el panel lo muestra al cargar, con más alto y scroll propio. Cada línea lleva día, mes y hora.
- Botón "Copiar log": copia el log guardado completo al portapapeles.
- El log registra cada ronda sin cuentas nuevas, cada intento extra y el motivo por el que terminó cada pasada.

### Cambios en 1.0.2

Si tenías el marcador de la 1.0.1, borralo y arrastrá el nuevo. Si la pestaña de x.com tenía abierto el panel de la 1.0.1, recargala antes de usar el marcador nuevo. Desde la 1.0.2, una versión nueva reemplaza sola a la anterior en la misma pestaña.

- El escaneo ya no lee la lista de followers. Lee solo tu following y toma como mutual a cada cuenta que tiene la marca "Te sigue" (o "Follows you"). Las etiquetas están en `followsYouLabels` de `config.js`.
- Las cuentas se leen por la imagen de avatar (`img[src*="profile_images"]`) dentro de `main`, porque X quitó los `data-testid` de la lista.
- Verificación de cordura: el escaneo queda verificado solo si encontró al menos una marca "Te sigue" y si la cantidad de cuentas leídas coincide con el contador "Siguiendo" de tu perfil. Si no, las tres acciones y "Reanudar cola" quedan deshabilitadas y el panel muestra el motivo.
- Un escaneo guardado por una versión anterior no está verificado. Hay que escanear de nuevo antes de actuar.
- Antes de dejar de seguir, el script confirma que el perfil abierto muestra "@cuenta" y que no tiene la marca "Te sigue".

### Cambios en 1.0.1

- El usuario propio se detecta por el `aria-label` del enlace al perfil ("Perfil" o "Profile"), no por `data-testid`. Las etiquetas están en `profileLabels` de `config.js`.
- Las rutas que nunca son un usuario (home, explore, notifications y otras) están en `reservedPaths` y se descartan.
- Antes de escanear o de dejar de seguir, el panel chequea la sesión y muestra el primer problema que encuentra. Si el chequeo falla, los botones quedan bloqueados.
- Si una lista se lee vacía, el log indica qué selector no encontró nada.

## Advertencia de riesgo

Usar automatizaciones puede contravenir las reglas de X y provocar restricciones o el cierre de la cuenta. Los valores por defecto (pausas largas, 20 acciones por sesión, 100 por día) reducen el riesgo pero no lo eliminan. Si X muestra una advertencia, el proceso se detiene. Antes de reanudar, revisá tu cuenta y esperá.

Usalo bajo tu responsabilidad.

## Instalación

1. Abrí https://maximoambro.github.io/XManagmentStudio/
2. Mostrá la barra de marcadores del navegador (Ctrl+Shift+B en Chrome y Edge).
3. Arrastrá el botón "XManagmentStudio" a la barra.

La página arma el bookmarklet con el contenido de `config.js` y `xmanagmentstudio.js`. El código queda entero dentro del marcador, así que no carga nada externo desde x.com.

Cualquier cambio en `config.js` o en `xmanagmentstudio.js`, incluida una versión nueva, obliga a arrastrar el marcador otra vez. El marcador viejo sigue corriendo el código viejo. Borralo de la barra y arrastrá el nuevo desde la página.

### Alternativa: consola

Si tu navegador no ejecuta bookmarklets en x.com:

1. Copiá el código desde la misma página ("Copiar código").
2. En x.com, abrí la consola (F12, pestaña Console).
3. Pegá el código y apretá Enter. Chrome puede pedir que escribas `allow pasting` primero.

### Probar en local

`index.html` lee los scripts con `fetch`, así que no funciona abierto como archivo. Levantá un servidor estático en la carpeta del proyecto, por ejemplo:

```
python -m http.server 8000
```

y abrí `http://localhost:8000`.

## Uso

1. Entrá a x.com con tu sesión iniciada.
2. Hacé clic en el marcador. Se abre un panel a la derecha con el chequeo de sesión. Si dice "Sesión detectada: @tuusuario.", podés seguir. Si muestra otro mensaje, resolvé lo que indica; los botones quedan bloqueados hasta entonces.
3. Tocá "Escanear following". El script abre tu perfil para leer el contador "Siguiendo", recorre `/{usuario}/following` una vez con desplazamiento automático hasta el final y al terminar vuelve a tu perfil para leer el contador otra vez. No lee la lista de followers. Dejá la pestaña abierta y visible. El panel muestra "Leídas X de Y" mientras avanza. Si salís de la pestaña, el escaneo se pausa y se descarta: volvé y escaneá de nuevo.
4. Al terminar, el panel muestra los non-mutuals: cuentas que seguís y que no tienen la marca "Te sigue". Debajo aparece si el escaneo quedó verificado o el motivo por el que no. Sin verificación, las acciones no se habilitan.
5. Marcá cuentas con los checkboxes. Hay botones para seleccionar y deseleccionar todo, y un contador de seleccionadas.
6. Elegí una acción:
   - Dejar de seguir a todos los non-mutuals.
   - Dejar de seguir a los seleccionados.
   - Dejar de seguir a todos menos los seleccionados.

El botón de la acción es la única confirmación. Al tocarlo, se arma la cola y arranca. Dejá la pestaña de X visible mientras corre. Si salís, la cola se pausa y queda guardada. Para seguir, volvé a la pestaña y apretá "Reanudar cola".

Cualquier parada pausa la cola y la deja guardada: "Detener", la pestaña oculta, un error o una advertencia. La cola solo se borra con "Descartar cola" o cuando no le quedan cuentas.

Para cada cuenta, el script abre su perfil, confirma que muestra "@cuenta", verifica que la seguís y que no tiene la marca "Te sigue", toca "Siguiendo" y confirma. Si la cuenta te sigue desde el escaneo, se omite.

### Barra de estado

- Estado: inactivo, activo, pausado (pausa larga, error, pestaña oculta o detenido por el usuario), detenido (advertencia o tope).
- Sesión: acciones hechas en esta pestaña sobre el tope por sesión.
- Hoy: acciones del día sobre el tope diario. Se reinicia con la fecha local.
- Pausa larga en: acciones que faltan para la próxima pausa larga.
- Espera: tiempo restante de la espera en curso.

### Botones de control

- Detener: pausa el proceso en curso. En una cola, la deja guardada y el estado pasa a "Pausado (detenido por el usuario)". En un escaneo, el escaneo se descarta sin guardar resultado parcial.
- Reanudar cola: retoma la cola guardada desde la cuenta pendiente. Se habilita siempre que haya una cola guardada y ningún proceso activo, venga de "Detener", de la pestaña oculta, de un error o de una advertencia. Volver a la pestaña no reanuda nada por sí solo.
- Descartar cola: borra la cola pendiente. El primer toque pide confirmación en el panel ("Confirmar descarte"). El historial no se toca.

## Cómo funciona

### Ritmo

| Parámetro | Valor por defecto |
|---|---|
| Espera entre acciones de escritura | 35 a 85 segundos, aleatorio |
| Espera entre lecturas del escaneo | 1 a 5 segundos, aleatorio |
| Pausa larga | cada 8 a 12 acciones, de 5 a 15 minutos |
| Tope por sesión | 20 acciones |
| Tope por día | 100 acciones |

Los topes se pueden cambiar desde el panel (sección "Topes"). El resto se cambia en `config.js`.

Hay un solo proceso activo a la vez, también entre pestañas.

### Detección de advertencias

El proceso se detiene de inmediato y guarda la cola si detecta:

- una respuesta HTTP 429 o un error de red en las llamadas a la API interna de X que hace la página mientras corre el proceso;
- un mensaje de límite de acciones o de error genérico en la interfaz de X;
- el botón de dejar de seguir o la confirmación deshabilitados;
- una redirección a inicio de sesión, verificación o cuenta bloqueada.

Solo se reanuda a mano.

### Persistencia

Todo se guarda en el `localStorage` de x.com:

| Clave | Contenido |
|---|---|
| `xms.history` | historial de acciones: cuenta, acción, resultado, fecha y hora |
| `xms.queue` | cola pendiente |
| `xms.daily` | contador del día |
| `xms.settings` | topes elegidos en el panel |
| `xms.scan` | último escaneo |
| `xms.state` | estado del proceso y contador de pausa larga |
| `xms.errors` | errores registrados |
| `xms.log` | últimas líneas del log del panel |

El contador de sesión va en `sessionStorage`. Se reinicia al abrir una pestaña nueva, no al recargar.

Una cuenta registrada como hecha en el historial no se vuelve a procesar. Cada operación fallida se reintenta hasta 2 veces con espera creciente (15 y 30 segundos). Si sigue fallando, el proceso se pausa y el error queda registrado. La cuenta queda primera en la cola.

El historial se escribe antes de sacar la cuenta de la cola. Si algo corta entre los dos pasos, la cola se limpia contra el historial en la siguiente vuelta.

## Configuración

`config.js` concentra:

- selectores del DOM de X;
- rutas de following y perfil (la de followers queda, sin uso desde la 1.0.2);
- textos que cuentan como advertencia, en español e inglés;
- rutas que cuentan como redirección a verificación;
- etiquetas del enlace al perfil propio (`profileLabels`), de la marca "Te sigue" (`followsYouLabels`), del botón "Siguiendo" de cada fila (`followingLabels`) y rutas que nunca son un usuario (`reservedPaths`);
- rangos de pausas, reintentos y tiempos de espera;
- topes por defecto;
- claves de almacenamiento.

Cuando X cambia su interfaz, lo normal es que solo haya que tocar los selectores.

## Archivos

| Archivo | Función |
|---|---|
| `index.html` | página de GitHub Pages: bookmarklet y código para la consola |
| `xmanagmentstudio.js` | lógica y panel flotante |
| `config.js` | selectores, pausas, topes y claves |
| `README.md` | este documento |

## Limitaciones conocidas

- El proceso no corre en segundo plano. Con la pestaña de X oculta, el navegador frena los temporizadores y X no dibuja las filas que no están a la vista, así que el script pausa el escaneo o la cola. El escaneo pausado se descarta. La cola se reanuda a mano con "Reanudar cola".
- Si la ventana es muy angosta, X esconde el enlace al perfil y el chequeo de sesión falla. Agrandá la ventana.
- Los `aria-label` dependen del idioma de la interfaz de X. Si usás un idioma distinto de español o inglés, agregá la etiqueta del enlace al perfil en `profileLabels`.
- Depende del DOM de X. Si X cambia los selectores, el escaneo o la acción fallan hasta actualizar `config.js`.
- Los textos "Te sigue" y "Siguiendo" dependen del idioma de la interfaz. Si usás otro idioma, agregá la marca en `followsYouLabels` y el texto del botón en `followingLabels`.
- Si pasás el mouse sobre el botón "Siguiendo" de una fila mientras escanea, X puede cambiar su texto y esa fila no se cuenta en esa ronda. Dejá el mouse fuera de la lista.
- Si el contador del perfil está abreviado (por ejemplo "1,2 mil"), no coincide con lo leído y el escaneo queda sin verificar.
- El escaneo de cuentas grandes tarda. Con 2000 cuentas seguidas, cuenta varios minutos, más hasta 4 esperas de 5 a 10 segundos si faltan cuentas al final.
- Si algo falla en un escaneo, tocá "Copiar log" y guardá el texto. Ahí figura por qué terminó la lectura.
- Si la marca "Te sigue" de una fila tarda en aparecer y la fila sale de la pantalla antes, esa cuenta queda como non-mutual. El chequeo en su perfil antes de dejar de seguir la vuelve a revisar.
- La detección de 429 se apoya en observar `fetch` y `XMLHttpRequest` de la página. Si X cambia cómo hace sus llamadas, queda la detección por mensajes y redirecciones.
- Si X deja de mostrar la marca "Te sigue" en una cuenta que sí te sigue, esa cuenta aparece como non-mutual. El chequeo en su perfil antes de dejar de seguir la vuelve a revisar.

## Roadmap

La versión 1.0 (Módulo 1, Mi cuenta: escaneo de following, non-mutuals y acciones masivas con selección) quedó cerrada con la 1.0.6.

| Versión | Alcance |
|---|---|
| 1.1 | Lógica de dejar de seguir. |
| 1.2 | Scrapeo de otra cuenta: followers de un @usuario y seguir a N cuentas con tope. |
| 1.3 | Cuentas con interacción directa: likes, retweets y citas de un tweet propio. Seguir a todos, a los seleccionados o a N. |
| 2.0 | Traducción a español, inglés, portugués, turco, indonesio, árabe (con soporte RTL) e hindi. |
| 2.1 | Control de acceso por administrador. |
| 3.0 | Funcionamiento continuo y rápido, sin provocar el cierre de la cuenta por scrapeo sospechoso. |

La 3.0 está sin definir. Velocidad y bajo riesgo van en direcciones opuestas, y todavía no hay un método para tener las dos.
