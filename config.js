/*
 * XManagmentStudio - configuracion.
 * Todos los selectores, rutas, patrones de texto, pausas, topes y claves
 * de almacenamiento viven aca. La logica en xmanagmentstudio.js no tiene
 * ningun selector propio.
 *
 * Tiempos en milisegundos salvo que el nombre diga otra cosa.
 */
window.XMS_CONFIG = {
  version: '1.0.7',

  // Ritmo y pausas
  timing: {
    writeDelay: { min: 35000, max: 85000 },      // entre dejar de seguir
    readDelay: { min: 1000, max: 5000 },         // entre lecturas del escaneo
    longPauseEvery: { min: 8, max: 12 },         // cada cuantas acciones
    longPauseDuration: { min: 300000, max: 900000 }, // 5 a 15 minutos
    retryBase: 15000,                            // espera del primer reintento
    retryFactor: 2,                              // multiplicador por reintento
    maxRetries: 2,
    navTimeout: 20000,                           // espera de carga de una ruta
    elementTimeout: 10000,                       // espera de un boton o dialogo
    confirmTimeout: 8000,                        // espera del cambio de estado tras dejar de seguir
    clickSettle: { min: 600, max: 1500 }         // pausa corta entre click y confirmacion
  },

  // Comportamiento del proceso
  behavior: {
    pauseOnHidden: true      // pausa el escaneo o la cola si la pestana de X queda oculta
  },

  // Topes por defecto. Se pueden cambiar desde el panel.
  limits: {
    perSession: 20,
    perDay: 100
  },

  // Escaneo
  scan: {
    maxStallRounds: 5,       // rondas sin cuentas nuevas al final de la lista
    maxRounds: 3000,         // corte de seguridad
    scrollFactor: 0.85,      // fraccion de la altura de la ventana por desplazamiento
    endRetries: 4,           // intentos extra al llegar al final si faltan cuentas
    endWaitRange: { min: 5000, max: 10000 }, // espera entre intentos extra
    networkRetries: 3,       // reintentos ante un error de red durante la lectura
    networkWaitRange: { min: 3000, max: 8000 } // espera entre reintentos de red
  },

  // Rutas de x.com. {user} se reemplaza por el nombre de usuario.
  routes: {
    following: '/{user}/following',
    followers: '/{user}/followers',
    profile: '/{user}'
  },

  // Selectores DOM
  selectors: {
    nav: 'nav',
    header: 'header',
    navLink: 'a[href]',
    main: 'main',
    avatarImg: 'img[src*="profile_images"]',
    followingCountLink: 'a[href$="/following"]',
    linkByHref: 'a[href="{path}"]',
    profileActions: '[data-testid="placementTracking"]',
    unfollowButton: 'button[data-testid$="-unfollow"]',
    followButton: 'button[data-testid$="-follow"]',
    confirmUnfollow: '[data-testid="confirmationSheetConfirm"]',
    toast: '[data-testid="toast"]',
    alert: '[role="alert"]',
    sheetDialog: '[data-testid="sheetDialog"]',
    errorDetail: '[data-testid="error-detail"]'
  },

  // Formato valido de nombre de usuario en un href de celda
  handlePattern: '^/([A-Za-z0-9_]{1,15})$',

  // aria-label del enlace al perfil propio en la navegacion. Depende del idioma de la interfaz.
  // Se comparan sin distinguir mayusculas.
  profileLabels: ['Perfil', 'Profile'],

  // Texto exacto de la marca de una cuenta que te sigue. Depende del idioma de la interfaz.
  // Se compara sin espacios en los bordes.
  followsYouLabels: ['Te sigue', 'Follows you'],

  // Texto exacto del boton o enlace "Siguiendo" en cada fila de la lista de following.
  // Un avatar sin ese boton cerca no cuenta como cuenta de la lista. Depende del idioma.
  followingLabels: ['Siguiendo', 'Following'],

  // Rutas de una sola palabra que nunca son un usuario. Se comparan sin distinguir mayusculas.
  reservedPaths: [
    'home', 'explore', 'notifications', 'messages', 'search', 'settings', 'compose',
    'i', 'login', 'logout', 'signup', 'tos', 'privacy', 'jobs', 'communities',
    'premium', 'lists', 'bookmarks', 'account', 'hashtag'
  ],

  // Rutas que indican verificacion o cierre de sesion
  blockedPaths: [
    '^/login',
    '^/i/flow/login',
    '^/i/flow/signup',
    '^/logout',
    '^/account/access',
    '^/account/locked',
    '^/i/flow/consent',
    '^/i/flow/verify',
    '^/i/flow/single_sign_on'
  ],

  // Textos de la interfaz de X que indican limite o error. Se comparan en minusculas.
  warningTexts: [
    'rate limit',
    'limit exceeded',
    'you are unable to follow more people',
    'unable to perform this action',
    'something went wrong',
    'try again later',
    'try reloading',
    'temporarily restricted',
    'limite',
    'límite',
    'algo salió mal',
    'algo salio mal',
    'inténtalo de nuevo más tarde',
    'intentalo de nuevo mas tarde',
    'vuelve a intentarlo',
    'restringida temporalmente',
    'no puedes seguir a más'
  ],

  // Llamadas de red observadas mientras corre un proceso.
  // Se marca advertencia ante 429 o error de red en URLs que coincidan.
  network: {
    watchPatterns: ['/i/api/', 'api.x.com', 'api.twitter.com']
  },

  // Claves de almacenamiento
  storage: {
    history: 'xms.history',
    queue: 'xms.queue',
    daily: 'xms.daily',
    settings: 'xms.settings',
    scan: 'xms.scan',
    state: 'xms.state',
    errors: 'xms.errors',
    lock: 'xms.lock',
    session: 'xms.session',  // sessionStorage
    log: 'xms.log'
  },

  lockStaleMs: 120000,       // un bloqueo sin latido por mas de esto se considera abandonado
  historyMax: 5000,
  logMax: 200,               // lineas del log que se guardan
  errorsMax: 200,

  ui: {
    rootId: 'xms-root',
    width: 380,
    zIndex: 2147483000
  }
};
