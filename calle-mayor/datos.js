// Capa 1: DATOS. Contenido y balance del juego. El motor no trae números propios:
// un negocio, categoría de producto, acción o evento nuevo se agrega aquí.
const DATOS = {
  inicio: { dinero: 300, hora: 8 },

  balance: {
    mejoras: [null, 0.8, 1.8, 4], // costo de subir a nivel 2, 3 y 4, como múltiplo del costo del negocio
    mejoraCap: 0.4, // capacidad extra por nivel
    mejoraCalidad: 12, // puntos de calidad por nivel
    valorNegocio: 0.5, // lo que cuenta en patrimonio, y lo que recuperas al vender
    diasLote: 150, // precio de un terreno = renta diaria × esto
    reventaLote: 0.9,
    comision: 0.005, // comisión por operación en bolsa
    probEvento: 0.3, // probabilidad diaria de una noticia que mueve el mercado
    diasQuiebra: 5, // días seguidos en números rojos antes de la quiebra
    repVel: 0.03,
  },

  // Personas que pasan por un lote normal en cada hora del día (0-23).
  trafico: [10, 6, 4, 3, 4, 10, 35, 80, 120, 120, 110, 120, 150, 160, 140, 120, 125, 150, 165, 150, 120, 80, 45, 20],

  // Qué fracción del interés de una categoría hay a cada hora.
  curvas: {
    dia: [0, 0, 0, 0, 0, 0, 0.2, 0.5, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 1, 0.95, 0.85, 0.6, 0.4, 0.2, 0.1, 0],
    manana: [0, 0, 0, 0, 0, 0.2, 0.7, 1, 1, 0.85, 0.6, 0.5, 0.55, 0.5, 0.45, 0.45, 0.5, 0.45, 0.35, 0.25, 0.1, 0, 0, 0],
    comida: [0.2, 0.1, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.6, 1, 1, 0.8, 0.5, 0.4, 0.5, 0.8, 1, 1, 0.8, 0.6, 0.4],
  },

  // trafico: multiplica la gente que pasa. renta: por día, solo para locales.
  lotes: [
    { id: 'l1', nombre: 'Calle Mayor 2', corto: 'N.º 2', trafico: 0.8, renta: 35 },
    { id: 'l2', nombre: 'Calle Mayor 8', corto: 'N.º 8', trafico: 0.9, renta: 45 },
    { id: 'l3', nombre: 'Calle Mayor 14', corto: 'N.º 14', trafico: 1, renta: 55 },
    { id: 'l4', nombre: 'Esquina Hidalgo', corto: 'Esquina', trafico: 1.35, renta: 110, esquina: true },
    { id: 'l5', nombre: 'Calle Mayor 22', corto: 'N.º 22', trafico: 1, renta: 55 },
    { id: 'l6', nombre: 'Calle Mayor 28', corto: 'N.º 28', trafico: 1.1, renta: 70 },
    { id: 'l7', nombre: 'Calle Mayor 34', corto: 'N.º 34', trafico: 1.15, renta: 75 },
    { id: 'l8', nombre: 'Esquina Juárez', corto: 'Esquina', trafico: 1.3, renta: 100, esquina: true },
    { id: 'l9', nombre: 'Calle Mayor 46', corto: 'N.º 46', trafico: 0.95, renta: 50 },
    { id: 'l10', nombre: 'Calle Mayor 52', corto: 'N.º 52', trafico: 0.85, renta: 40 },
  ],

  // clase: puesto (paga permiso, no renta), local (paga renta del lote), estudio (crea productos).
  // rango: índice del rango que lo desbloquea. capBase: clientes por hora por empleado.
  // interes: fracción de la gente que pasa que quiere comprar. curva: ver arriba.
  negocios: {
    limonada: { nombre: 'Puesto de limonada', corto: 'Limonada', clase: 'puesto', rango: 0, costo: 150, permiso: 4, sueldo: 12, empMax: 2, capBase: 8, costoUnidad: 0.35, precioRef: 2, interes: 0.07, cat: 'bebida', curva: 'dia', horario: [9, 20], calidad: 45, color: '#F2C230', desc: 'Barato de abrir. Vive del calor y del volumen.' },
    hotdogs: { nombre: 'Carrito de hot dogs', corto: 'Hot dogs', clase: 'puesto', rango: 0, costo: 700, permiso: 8, sueldo: 15, empMax: 2, capBase: 9, costoUnidad: 1.1, precioRef: 4.5, interes: 0.06, cat: 'comida', curva: 'comida', horario: [11, 23], calidad: 45, color: '#D8553A', desc: 'Fuerte a la hora de la comida y por la noche.' },
    flores: { nombre: 'Puesto de flores', corto: 'Flores', clase: 'puesto', rango: 0, costo: 1100, permiso: 6, sueldo: 15, empMax: 2, capBase: 4, costoUnidad: 3, precioRef: 12, interes: 0.018, cat: 'flores', curva: 'dia', horario: [8, 19], calidad: 50, color: '#C2588F', desc: 'Pocos clientes, mucho margen por ramo.' },
    cafeteria: { nombre: 'Cafetería', corto: 'Café', clase: 'local', rango: 1, costo: 6000, sueldo: 35, empMax: 4, capBase: 14, costoUnidad: 0.8, precioRef: 3.5, interes: 0.22, cat: 'cafe', curva: 'manana', horario: [7, 20], calidad: 55, color: '#7B4B2A', desc: 'Hora pico en la mañana. Necesita personal para no hacer filas.' },
    panaderia: { nombre: 'Panadería', corto: 'Panadería', clase: 'local', rango: 1, costo: 5000, sueldo: 32, empMax: 3, capBase: 16, costoUnidad: 0.45, precioRef: 2.2, interes: 0.24, cat: 'comida', curva: 'manana', horario: [6, 19], calidad: 55, color: '#D9963F', desc: 'Mucho volumen, ticket bajo. Madruga.' },
    taller: { nombre: 'Taller de bicis', corto: 'Bicis', clase: 'local', rango: 1, costo: 9000, sueldo: 40, empMax: 3, capBase: 3, costoUnidad: 5, precioRef: 24, interes: 0.025, cat: 'servicio', curva: 'dia', horario: [9, 19], calidad: 55, color: '#4C7A34', desc: 'Pocos clientes y buen margen. Cada mecánico atiende tres por hora.' },
    boutique: { nombre: 'Boutique de ropa', corto: 'Boutique', clase: 'local', rango: 1, costo: 14000, sueldo: 45, empMax: 3, capBase: 4, costoUnidad: 16, precioRef: 42, interes: 0.022, cat: 'ropa', curva: 'dia', horario: [10, 21], calidad: 60, color: '#3B5B8C', desc: 'Ticket alto. Le encanta la quincena.' },
    tiendita: { nombre: 'Tiendita de la esquina', corto: 'Tiendita', clase: 'local', interior: true, rango: 1, costo: 5000, sueldo: 30, empMax: 6, capBase: 0, costoUnidad: 0, precioRef: 2, interes: 0.2, cat: 'tienda', curva: 'dia', horario: [7, 22], calidad: 50, color: '#2E86AB', desc: 'Entras al local: acomodas muebles, surtes anaqueles, haces pedidos y pones cajeros.' },
    estudio: { nombre: 'Estudio de producto', corto: 'Estudio', clase: 'estudio', rango: 2, costo: 15000, sueldo: 80, empMax: 4, capBase: 0, costoUnidad: 0, precioRef: 0, interes: 0, cat: 'estudio', curva: 'dia', horario: [9, 18], calidad: 60, color: '#2E6F8E', desc: 'Diseña y lanza tus propios productos al mercado. Más diseñadores, desarrollo más rápido.' },
    // Fábricas: no atienden clientes. Cada línea produce capLinea unidades al día de un producto tuyo
    // de las categorías que sirve, y necesita porLinea obreros. energia: costo diario por línea encendida.
    planta: { nombre: 'Planta de alimentos', corto: 'Planta', clase: 'fabrica', rango: 2, costo: 25000, sueldo: 40, empMax: 8, capBase: 0, costoUnidad: 0, precioRef: 0, interes: 0, cat: 'fabrica', curva: 'dia', horario: [6, 22], calidad: 55, color: '#A2533F', sirve: ['bebida', 'snack'], capLinea: 500, porLinea: 2, energia: 30, desc: 'Fabrica tus bebidas y snacks. Cada unidad propia te cuesta una tercera parte de lo que cobra la maquila.' },
    ensamble: { nombre: 'Planta de ensamble', corto: 'Ensamble', clase: 'fabrica', rango: 3, costo: 120000, sueldo: 60, empMax: 8, capBase: 0, costoUnidad: 0, precioRef: 0, interes: 0, cat: 'fabrica', curva: 'dia', horario: [6, 22], calidad: 55, color: '#56707E', sirve: ['audifonos', 'tenis', 'telefono'], capLinea: 90, porLinea: 2, energia: 120, desc: 'Arma tus audífonos, tenis y teléfonos. Donde el margen es grande, producir tú cambia el juego.' },
    restaurante: { nombre: 'Restaurante', corto: 'Restaurante', clase: 'local', rango: 3, costo: 45000, sueldo: 45, empMax: 6, capBase: 8, costoUnidad: 6, precioRef: 18, interes: 0.12, cat: 'restaurante', curva: 'comida', horario: [12, 24], calidad: 60, color: '#8A2E3B', desc: 'La joya de la calle. Comida y cena llenas si tienes con quién atender.' },
  },

  marketing: [
    { nombre: 'Nada', costo: 0, efecto: 0 },
    { nombre: 'Volantes', costo: 8, efecto: 0.15 },
    { nombre: 'Redes', costo: 30, efecto: 0.3 },
    { nombre: 'Espectacular', costo: 90, efecto: 0.5 },
  ],

  rangos: [
    { nombre: 'Emprendedor', min: 0, desbloquea: 'Puestos callejeros' },
    { nombre: 'Comerciante', min: 2000, desbloquea: 'Locales comerciales y compra de terrenos' },
    { nombre: 'Empresario', min: 15000, desbloquea: 'Estudio de producto, planta de alimentos y bolsa de valores' },
    { nombre: 'Magnate', min: 100000, desbloquea: 'Restaurante, planta de ensamble, mejoras de nivel 4 y productos de alta gama' },
    { nombre: 'Tycoon', min: 1000000, desbloquea: 'Tu nombre en la historia de la ciudad' },
  ],

  // Productos que diseñas en el estudio. ideal: reparto perfecto de calidad, diseño y marketing.
  // mercado: unidades al día que vendería un 10 en su mejor momento. precio: lo que paga la tienda por unidad.
  // costo: lo que cobra la maquila por fabricarla. propio: lo que cuesta en tu planta (solo si alguna planta la sirve).
  // presupuestoRef: con ese presupuesto y la mezcla ideal, un estudio sin experiencia saca 7.5.
  categorias: {
    bebida: { nombre: 'Bebida energética', rango: 2, mercado: 900, precio: 3, costo: 1.8, propio: 0.6, dias: 6, ideal: [0.5, 0.2, 0.3], presupuestoRef: 8000 },
    snack: { nombre: 'Snack saludable', rango: 2, mercado: 1300, precio: 2, costo: 1.3, propio: 0.5, dias: 5, ideal: [0.55, 0.25, 0.2], presupuestoRef: 6000 },
    app: { nombre: 'App móvil', rango: 2, mercado: 3000, precio: 1, costo: 0, dias: 10, ideal: [0.3, 0.5, 0.2], presupuestoRef: 20000 },
    audifonos: { nombre: 'Audífonos', rango: 3, mercado: 200, precio: 60, costo: 35, propio: 18, dias: 12, ideal: [0.45, 0.35, 0.2], presupuestoRef: 40000 },
    tenis: { nombre: 'Tenis', rango: 3, mercado: 180, precio: 75, costo: 45, propio: 25, dias: 10, ideal: [0.3, 0.3, 0.4], presupuestoRef: 45000 },
    videojuego: { nombre: 'Videojuego', rango: 3, mercado: 500, precio: 18, costo: 0, dias: 16, ideal: [0.35, 0.45, 0.2], presupuestoRef: 80000 },
    telefono: { nombre: 'Teléfono', rango: 3, mercado: 320, precio: 450, costo: 290, propio: 150, dias: 24, ideal: [0.45, 0.4, 0.15], presupuestoRef: 400000 },
  },

  // Empresas ficticias. deriva y vol son diarias; beta: cuánto les pegan las noticias del mercado.
  acciones: [
    { id: 'BRS', nombre: 'Bebidas Brisa', precio: 24, deriva: 0.0006, vol: 0.02, beta: 0.9 },
    { id: 'NBL', nombre: 'Nébula Software', precio: 58, deriva: 0.0012, vol: 0.035, beta: 1.5 },
    { id: 'FAU', nombre: 'Ferrovía Austral', precio: 31, deriva: 0.0004, vol: 0.012, beta: 0.6 },
    { id: 'CRA', nombre: 'Cementos Roca Alta', precio: 17, deriva: 0.0005, vol: 0.018, beta: 1.1 },
    { id: 'FDV', nombre: 'Frutos del Valle', precio: 12, deriva: 0.0003, vol: 0.022, beta: 0.8 },
    { id: 'BMD', nombre: 'Banco Meridiano', precio: 44, deriva: 0.0007, vol: 0.015, beta: 1.3 },
  ],

  // efectos: trafico, cat:<categoría de negocio> (multiplican) y bolsa (rendimiento diario extra).
  eventos: [
    { id: 'calor', titulo: 'Ola de calor', texto: 'el termómetro marca 34 °C y la limonada vuela.', dias: 3, tag: 'clima', efectos: { 'cat:bebida': 1.8, 'cat:cafe': 0.75 } },
    { id: 'lluvia', titulo: 'Semana de lluvias', texto: 'poca gente en la calle; el café caliente se defiende.', dias: 2, tag: 'clima', efectos: { trafico: 0.65, 'cat:cafe': 1.35 } },
    { id: 'festival', titulo: 'Festival en Calle Mayor', texto: 'cierran la calle a los autos y se llena de gente.', dias: 1, tag: 'calle', efectos: { trafico: 1.8 } },
    { id: 'quincena', titulo: 'Día de quincena', texto: 'la gente cobró y quiere gastar.', dias: 1, tag: 'calle', efectos: { 'cat:ropa': 1.6, 'cat:restaurante': 1.4, 'cat:servicio': 1.2 } },
    { id: 'influencer', titulo: 'Una influencer recomienda la calle', texto: 'su video sobre Calle Mayor pasa del millón de vistas.', dias: 2, tag: 'calle', efectos: { trafico: 1.3 } },
    { id: 'obras', titulo: 'Obras en la avenida', texto: 'desvían a los peatones hacia Calle Mayor.', dias: 3, tag: 'calle', efectos: { trafico: 1.15 } },
    { id: 'dia-flores', titulo: 'Se acerca el Día de las Madres', texto: 'todos buscan un ramo.', dias: 2, tag: 'calle', efectos: { 'cat:flores': 2.2 } },
    { id: 'rally', titulo: 'Euforia en la bolsa', texto: 'los índices suben por tercera sesión seguida.', dias: 3, tag: 'bolsa', rango: 2, efectos: { bolsa: 0.012 } },
    { id: 'crisis', titulo: 'Pánico financiero', texto: 'un banco extranjero quiebra y arrastra a los mercados.', dias: 4, tag: 'bolsa', rango: 2, efectos: { bolsa: -0.025 } },
    { id: 'moda', titulo: 'Nueva moda', texto: 'todo el mundo habla de {cat}.', dias: 1, tag: 'mercado', rango: 2, efectos: {} },
  ],

  // ---- Fase 2 ----
  // Colores de marca que puede elegir el jugador (el morado es del rival).
  coloresMarca: ['#E4572E', '#2E86AB', '#1C8F4E', '#F4B41A', '#D62E6F', '#2D3047'],

  // El rival abre negocios en lotes libres, compite en precio y puede quebrar o venderte sus locales.
  rival: {
    nombre: 'Grupo Ferrán', corto: 'FERRÁN', color: '#5C3D99',
    dineroInicial: 2500, diaInicio: 6, maxNegocios: 3, cadaDias: [3, 6], // abre uno nuevo cada 3 a 6 días
    lotesLibresMin: 3, // nunca ocupa los últimos lotes libres: la calle no se ahoga
    apoyo: 30, apoyoPorRango: 80, // lo que le inyectan sus socios cada día
    descuento: 0.9, // arranca con precios 10% abajo del de la zona
    diasRojosCierre: 6, sobreprecioCompra: 1.3,
  },

  // Cadena: con varios negocios del mismo giro, los insumos salen más baratos y la fama se comparte.
  cadena: { descuentoInsumos: 0.08, maxDescuento: 0.24, rep: 3 },

  // Situaciones con dos salidas. requiere: alguna de estas condiciones (tipo:x, clase:x, rival, empleados).
  // efectos: dinero, dineroPct (del patrimonio), rep (todos los negocios de la calle), evento {titulo, dias, efectos},
  // pagos {monto, dias}, paro (días de huelga en plantas), rivalPausa (días), rivalDinero, quitaEmpleado, azar {prob, si, no}.
  decisiones: [
    { id: 'inspector', titulo: 'Visita del inspector', texto: 'Un inspector de salubridad encontró detalles en tus negocios: pisos, etiquetas, una tarja que gotea.',
      opciones: [
        { texto: 'Arreglar todo hoy', detalle: '−$400, la reputación sube', efectos: { dinero: -400, rep: 5 }, resultado: 'Todo quedó impecable y los clientes lo notan.' },
        { texto: 'Pedir prórroga', detalle: 'gratis, la reputación baja', efectos: { rep: -6 }, resultado: 'Corre el rumor de que tus negocios no están limpios.' },
      ] },
    { id: 'influencer', titulo: 'Una creadora de contenido quiere filmar', texto: 'Tiene 800 mil seguidores y quiere grabar un video recorriendo tus negocios.',
      opciones: [
        { texto: 'Pagarle el video', detalle: '−$600, más gente 3 días', efectos: { dinero: -600, evento: { titulo: 'Tu calle se hizo viral', dias: 3, efectos: { trafico: 1.3 } } }, resultado: 'El video despega: llega gente que nunca había pisado Calle Mayor.' },
        { texto: 'Decir que no', detalle: 'nada cambia', efectos: {}, resultado: 'Se va a filmar con Grupo Ferrán.' },
      ] },
    { id: 'angel', titulo: 'Un inversionista toca la puerta', rango: 1, texto: 'Te ofrece efectivo hoy a cambio de una parte de tus ganancias durante dos semanas.',
      opciones: [
        { texto: 'Aceptar el dinero', detalle: '+20% de tu patrimonio hoy, luego pagos diarios', efectos: { dineroPct: 0.2, pagos: { dias: 14 } }, resultado: 'Entra el dinero. Durante 14 días le pagarás su parte.' },
        { texto: 'Seguir solo', detalle: 'nada cambia', efectos: {}, resultado: 'Prefieres no deberle a nadie.' },
      ] },
    { id: 'catering', titulo: 'Pedido para una boda', texto: 'Una familia quiere 300 bocadillos para mañana. Tu gente tendría que doblar turno.',
      opciones: [
        { texto: 'Aceptar el pedido', detalle: '+$900, tu equipo queda agotado', efectos: { dinero: 900, rep: -3 }, resultado: 'La boda fue un éxito; tu gente llega desvelada al día siguiente.' },
        { texto: 'Rechazarlo', detalle: 'nada cambia', efectos: {}, resultado: 'La familia busca a otro proveedor.' },
      ] },
    { id: 'proveedor', titulo: 'Insumos baratos', texto: 'Un proveedor nuevo ofrece insumos 30% más baratos. Nadie conoce bien su calidad.',
      opciones: [
        { texto: 'Probarlo una semana', detalle: 'insumos −30% por 7 días, la reputación baja', efectos: { evento: { titulo: 'Insumos de oferta', dias: 7, efectos: { insumos: 0.7 } }, rep: -5 }, resultado: 'Ahorras en insumos; algunos clientes notan la diferencia.' },
        { texto: 'Quedarte con el de siempre', detalle: 'nada cambia', efectos: {}, resultado: 'Mejor lo conocido.' },
      ] },
    { id: 'concurso', titulo: 'Concurso de la mejor limonada', requiere: ['tipo:limonada'], texto: 'El mercado organiza un concurso. La inscripción cuesta $150 y el premio es de $800.',
      opciones: [
        { texto: 'Inscribirse', detalle: '−$150, puedes ganar $800', efectos: { dinero: -150, azar: { prob: 0.55, si: { dinero: 800, rep: 8, resultado: '¡Ganaste! Tu limonada es la mejor de la ciudad.' }, no: { resultado: 'Quedaste en tercer lugar. Por poco.' } } }, resultado: '' },
        { texto: 'Pasar', detalle: 'nada cambia', efectos: {}, resultado: 'Este año no compites.' },
      ] },
    { id: 'huelga', titulo: 'Los obreros amenazan con huelga', requiere: ['clase:fabrica'], texto: 'Piden un bono por el ritmo de trabajo de las últimas semanas.',
      opciones: [
        { texto: 'Pagar el bono', detalle: '−$1,500', efectos: { dinero: -1500 }, resultado: 'Las plantas siguen trabajando a todo vapor.' },
        { texto: 'Aguantar la huelga', detalle: 'tus plantas se detienen 2 días', efectos: { paro: 2 }, resultado: 'Las plantas paran: dos días de pura maquila.' },
      ] },
    { id: 'ruido', titulo: 'Los vecinos se quejan', requiere: ['tipo:restaurante', 'clase:fabrica'], texto: 'Dicen que el ruido no los deja dormir y juntan firmas.',
      opciones: [
        { texto: 'Insonorizar', detalle: '−$1,200', efectos: { dinero: -1200, rep: 2 }, resultado: 'Paredes nuevas y vecinos tranquilos.' },
        { texto: 'Ignorarlos', detalle: 'la reputación baja', efectos: { rep: -8 }, resultado: 'Las firmas llegan al periódico local.' },
      ] },
    { id: 'caza', titulo: 'Ferrán quiere a tu gente', requiere: ['rival'], texto: 'Grupo Ferrán le ofreció más sueldo a uno de tus mejores empleados.',
      opciones: [
        { texto: 'Igualar la oferta', detalle: '−$500', efectos: { dinero: -500 }, resultado: 'Se queda contigo, y se nota agradecido.' },
        { texto: 'Dejarlo ir', detalle: 'pierdes un empleado', efectos: { quitaEmpleado: true, rivalDinero: 300 }, resultado: 'Se va con Ferrán. Hay que reorganizar turnos.' },
      ] },
    { id: 'tregua', titulo: 'Ferrán propone una tregua', requiere: ['rival'], texto: 'El director de Grupo Ferrán te invita a comer: quiere dejar de pelearse la calle un tiempo.',
      opciones: [
        { texto: 'Aceptar la tregua', detalle: 'no abre nada en 12 días', efectos: { rivalPausa: 12 }, resultado: 'Ferrán se queda quieto un par de semanas.' },
        { texto: 'Rechazarla', detalle: 'tu fama sube, Ferrán se enoja', efectos: { rep: 3, rivalDinero: 1500 }, resultado: 'Ferrán consigue más socios y viene con todo.' },
      ] },
    { id: 'entrevista', titulo: 'Te quieren entrevistar', rango: 2, texto: 'Un periódico de negocios quiere tu historia: del carrito a la empresa.',
      opciones: [
        { texto: 'Dar la entrevista', detalle: 'más gente y fama', efectos: { rep: 4, evento: { titulo: 'Sales en el periódico', dias: 2, efectos: { trafico: 1.15 } } }, resultado: 'La nota sale en portada de la sección de negocios.' },
        { texto: 'Declinar', detalle: 'nada cambia', efectos: {}, resultado: 'Prefieres el perfil bajo.' },
      ] },
  ],

  // Metas cortas con premio en efectivo.
  hitos: [
    { id: 'primer-negocio', nombre: 'Primera venta', texto: 'Abre tu primer negocio', premio: 50 },
    { id: 'tres-negocios', nombre: 'Esto va en serio', texto: 'Ten 3 negocios a la vez', premio: 200 },
    { id: 'primer-local', nombre: 'Con llave', texto: 'Abre tu primer local', premio: 500 },
    { id: 'dia-mil', nombre: 'Día de mil', texto: 'Cierra un día con $1,000 de utilidad', premio: 500 },
    { id: 'terreno', nombre: 'Dueño de la tierra', texto: 'Compra un terreno', premio: 800 },
    { id: 'cadena', nombre: 'Cadena', texto: 'Ten 3 negocios del mismo giro', premio: 1000 },
    { id: 'gana-rival', nombre: 'Primera victoria', texto: 'Saca a Ferrán de un lote: que cierre o cómprale', premio: 1500 },
    { id: 'nota-ocho', nombre: 'La prensa te quiere', texto: 'Lanza un producto con nota de 8 o más', premio: 2000 },
    { id: 'planta', nombre: 'Hecho en casa', texto: 'Abre tu primera planta', premio: 3000 },
    { id: 'diez-mil', nombre: 'Éxito de ventas', texto: 'Vende 10,000 unidades de un producto', premio: 5000 },
    { id: 'calle-llena', nombre: 'La calle es tuya', texto: 'Ten 8 negocios en Calle Mayor', premio: 10000 },
    { id: 'sin-rival', nombre: 'Monopolio', texto: 'Saca a Ferrán de 3 lotes y que no le quede ninguno', premio: 25000 },
  ],

  // ---- Modos, ofertas de compra y finales ----
  modos: {
    historia: { nombre: 'Historia', desc: 'Siete capítulos con Doña Chela, Ferrán y Capital Vega. Varios finales.' },
    sandbox: { nombre: 'Sandbox', desc: 'Calle libre para probar. Tú eliges con cuánto empiezas y si hay rival.', dineros: [300, 5000, 50000] },
  },

  // Quién puede comprarte negocios. Ferrán paga con su efectivo y se queda el local; Vega cierra y libera el lote.
  compradores: {
    ferran: { nombre: 'Grupo Ferrán', persona: 'ferran', color: '#5C3D99' },
    vega: { nombre: 'Capital Vega', persona: 'vega', color: '#2F4858' },
  },
  ofertas: {
    dias: 3, // cuánto dura una oferta en la mesa
    inicio: 0.85, baja: 0.07, piso: 0.5, // en rojo: % de lo invertido, que baja cada día que sigues en rojo
    probRojo: 0.6, maxAbiertas: 2,
    probPremio: 0.035, premio: [1.1, 1.4], // a veces, cuando te va bien, ofrecen más de lo que vale
    regatear: 0.15, probRegatear: 0.5,
  },
  // Plazo del banco: días seguidos en rojo antes del final. Con más negocios, más plazo para salvarte vendiendo.
  quiebra: { diasBase: 5, diasPorNegocio: 2, maxExtra: 6 },

  personajes: {
    chela: { nombre: 'Doña Chela', rol: 'Te rentó tu primer carrito', color: '#C2588F' },
    ferran: { nombre: 'Ulises Ferrán', rol: 'Director de Grupo Ferrán', color: '#5C3D99' },
    vega: { nombre: 'Valeria Vega', rol: 'Socia de Capital Vega', color: '#2F4858' },
    ortiz: { nombre: 'Lic. Ortiz', rol: 'Ejecutivo del Banco Meridiano', color: '#3B5B8C' },
  },

  // Capítulos del modo historia. objetivo: lo que ve el jugador; el motor revisa cada uno por su id.
  capitulos: [
    { id: 'carrito', titulo: 'El carrito', objetivo: 'Abre tu primer puesto y junta $1,000 de patrimonio.', intro: 'cap1', cierre: 'cap1-fin' },
    { id: 'local', titulo: 'Llave en mano', objetivo: 'Llega a Comerciante y abre tu primer local.', intro: 'cap2', cierre: 'cap2-fin' },
    { id: 'ferran', titulo: 'La guerra de precios', objetivo: 'Saca a Ferrán de un lote: que cierre o cómprale uno.', intro: 'cap3', cierre: 'cap3-fin' },
    { id: 'marca', titulo: 'Marca propia', objetivo: 'Llega a Empresario y lanza un producto con nota de 7.5 o más.', intro: 'cap4', cierre: 'cap4-fin' },
    { id: 'planta', titulo: 'Hecho en casa', objetivo: 'Abre una planta y fabrica 5,000 unidades propias.', intro: 'cap5', cierre: 'cap5-fin' },
    { id: 'oferta', titulo: 'La oferta', objetivo: 'Llega a Magnate: $100,000 de patrimonio.', intro: 'cap6', cierre: 'cap6-fin' },
    { id: 'calle', titulo: 'Calle Mayor', objetivo: 'Saca a Ferrán de toda la calle y llega a $500,000 de patrimonio.', intro: 'cap7', cierre: null },
  ],

  // Diálogos: cada línea es { q: personaje, t: texto }. La última puede traer opciones.
  dialogos: {
    cap1: [
      { q: 'chela', t: 'Así que tú eres el muchacho del que me habló tu tía. Bienvenido a Calle Mayor.' },
      { q: 'chela', t: 'Treinta años vendí tamales en esta esquina. Hoy la calle está medio vacía, pero la gente sigue pasando. Eso es lo que importa.' },
      { q: 'chela', t: 'Empieza chiquito: un puesto de limonada. Toca un lote libre y ábrelo. Cuando juntes mil pesos de patrimonio, platicamos.' },
    ],
    'cap1-fin': [
      { q: 'chela', t: '¡Mírate nomás! Mil pesos y ni un mes. Ya sabes lo que es cuadrar la caja al final del día.' },
      { q: 'chela', t: 'Un carrito da para comer. Un local da para crecer. Esa es la siguiente.' },
    ],
    cap2: [
      { q: 'chela', t: 'Un local paga renta, tiene que abrir aunque llueva y necesita gente que lo atienda. No es juego.' },
      { q: 'chela', t: 'Junta para llegar a Comerciante y abre tu primer local. Una cafetería en una buena esquina no falla.' },
    ],
    'cap2-fin': [
      { q: 'chela', t: 'Ya tienes llave propia. Ahora sí te van a empezar a ver.' },
      { q: 'chela', t: 'Y no solo los clientes. Ayer vi a unos de traje midiendo los lotes vacíos. Ten cuidado.' },
    ],
    cap3: [
      { q: 'ferran', t: 'Buenas. Ulises Ferrán, de Grupo Ferrán. Tenemos negocios en media ciudad y ahora queremos esta calle.' },
      { q: 'ferran', t: 'Nada personal. Vamos a abrir donde haya lugar y a vender más barato que tú. Así funciona el mercado.' },
      { q: 'chela', t: 'Ya lo oíste. Puedes ganarle en precio hasta que sus números no den, o comprarle un negocio si te alcanza. Sácalo de un lote.' },
    ],
    'cap3-fin': [
      { q: 'ferran', t: 'Bien jugado. No pensé que aguantaras la guerra de precios.' },
      { q: 'ferran', t: 'Esto no se acaba aquí. Nos vemos en la calle.' },
      { q: 'chela', t: 'Le pegaste donde duele: en la cartera. Ahora piensa más grande.' },
    ],
    cap4: [
      { q: 'chela', t: 'Vender lo que otros fabrican tiene techo. Las marcas que duran tienen productos propios.' },
      { q: 'chela', t: 'Cuando seas Empresario, abre un estudio y lanza algo que la prensa califique con 7.5 o más. Prueba, equivócate, aprende.' },
    ],
    'cap4-fin': [
      { q: 'vega', t: 'Valeria Vega, de Capital Vega. Leí la reseña de tu producto. Muy prometedor.' },
      { q: 'vega', t: 'Nosotros invertimos en empresas que crecen. Y también compramos las que se tropiezan. Tenlo presente.' },
    ],
    cap5: [
      { q: 'chela', t: 'Cada lata que mandas a maquilar le deja ganancia a otro. Con planta propia, la ganancia es tuya.' },
      { q: 'chela', t: 'Abre una planta y fabrica cinco mil unidades propias. Asígnale tus productos a las líneas y no te olvides de los obreros.' },
    ],
    'cap5-fin': [
      { q: 'chela', t: 'Humo saliendo de una chimenea con tu nombre. Mi difunto Ramón no lo creería.' },
      { q: 'ferran', t: 'Veo que ya fabricas. Interesante. Pronto vamos a tener que hablar en serio, tú y yo.' },
    ],
    cap6: [
      { q: 'chela', t: 'Ya no eres el del carrito. La gente de la calle te saluda por tu nombre.' },
      { q: 'chela', t: 'Llega a cien mil de patrimonio y ya veremos quién toca a tu puerta.' },
    ],
    'cap6-fin': [
      { q: 'ferran', t: 'Te propongo algo: fusionemos las dos empresas. Tú pones la calle y la marca; yo pongo la ciudad entera.' },
      { q: 'vega', t: 'O véndenos todo. Capital Vega paga una vez y media lo que vale tu empresa, en efectivo, hoy.' },
      { q: 'chela', t: 'O no le vendas a nadie y quédate con toda la calle. Eso sí: Ferrán no se va a dejar.',
        opciones: [
          { texto: 'Fusionarte con Ferrán', detalle: 'final: socios', final: 'socios' },
          { texto: 'Vender todo a Capital Vega', detalle: 'final: vendido', final: 'vendido' },
          { texto: 'Ir por toda la calle', detalle: 'sigue el capítulo 7', final: 'calle' },
        ] },
    ],
    cap7: [
      { q: 'ferran', t: 'Así que no hay trato. Muy bien. Grupo Ferrán no se va de Calle Mayor sin pelear.' },
      { q: 'chela', t: 'Para ganarle tienes que sacarlo de todos sus lotes y llegar a medio millón. Yo aquí te veo.' },
    ],
    'ferran-llega': [
      { q: 'ferran', t: 'Ulises Ferrán, de Grupo Ferrán. Acabamos de abrir en tu calle. Que gane el mejor precio.' },
    ],
    'banco-rojo': [
      { q: 'ortiz', t: 'Buenas noches. Le hablo del Banco Meridiano: su cuenta amaneció en números rojos.' },
      { q: 'ortiz', t: 'Le damos unos días de gracia. Si no regulariza, tendremos que cerrar la cuenta. Mientras tanto le van a llegar ofertas por sus negocios: evalúelas con calma.' },
    ],
  },

  finales: {
    calle: { titulo: 'Calle Mayor es tuya', tipo: 'bueno', persona: 'chela', texto: 'Ferrán vendió su último lote y se fue a otra ciudad. Cada toldo de la calle lleva tu color. Doña Chela puso tu foto junto a la de Don Ramón, en la fonda.' },
    socios: { titulo: 'Socios', tipo: 'bueno', persona: 'ferran', texto: 'Ferrán y tú firmaron la fusión. La nueva empresa abre en doce ciudades y tu nombre va primero en el letrero. Calle Mayor sigue siendo el corazón de todo.' },
    vendido: { titulo: 'Vendido', tipo: 'agridulce', persona: 'vega', texto: 'Capital Vega te pagó una fortuna y cambió los letreros en una semana. Tú ves la calle desde un café que ya no es tuyo, con la cuenta más llena que nunca.' },
    comprado: { titulo: 'Ferrán se queda con tu negocio', tipo: 'derrota', persona: 'ferran', texto: 'El banco cerró tu cuenta y Grupo Ferrán compró tu negocio por lo que quedaba de la deuda. Tu carrito sigue en la calle, ahora en morado.' },
    quiebra: { titulo: 'Quiebra', tipo: 'derrota', persona: 'ortiz', texto: 'Tras días en números rojos, el banco cerró tu empresa. Grupo Ferrán y Capital Vega se repartieron tus locales en un remate.' },
  },

  // ---- Vecindad: lo que hay en los lotes de al lado cambia cuánta gente entra ----
  // a y b son categorías de negocio (cat) o clases (clase:x). efecto: lo que gana (o pierde) a por tener a b al lado.
  // Se aplica a tus negocios y a los de Ferrán por igual; el total se limita entre −40% y +50%.
  vecindad: [
    { a: 'cafe', b: 'comida', efecto: 0.15, texto: 'el pan se acompaña con café' },
    { a: 'comida', b: 'cafe', efecto: 0.15, texto: 'el café se acompaña con pan' },
    { a: 'bebida', b: 'comida', efecto: 0.1, texto: 'quien come, tiene sed' },
    { a: 'comida', b: 'bebida', efecto: 0.1, texto: 'quien toma algo, se antoja' },
    { a: 'ropa', b: 'cafe', efecto: 0.1, texto: 'la gente pasea entre compras' },
    { a: 'cafe', b: 'ropa', efecto: 0.1, texto: 'entre compras se toma un café' },
    { a: 'ropa', b: 'flores', efecto: 0.1, texto: 'calle bonita para pasear' },
    { a: 'flores', b: 'restaurante', efecto: 0.12, texto: 'cenas con flores en la mesa' },
    { a: 'restaurante', b: 'flores', efecto: 0.08, texto: 'la entrada se ve bonita' },
    { a: 'cafe', b: 'clase:estudio', efecto: 0.1, texto: 'los diseñadores viven de café' },
    { a: 'servicio', b: 'cafe', efecto: 0.08, texto: 'esperan su bici con un café' },
    { a: 'mismo', b: 'mismo', efecto: -0.1, texto: 'compiten pared con pared' },
    { a: 'tienda', b: 'clase:fabrica', efecto: -0.15, texto: 'el ruido y el humo espantan' },
  ],

  // ---- Anaquel: tus productos a la venta en tus propios negocios ----
  // giros: en qué categorías de negocio cabe cada categoría de producto. tasa: fracción de clientes que lo compra
  // con nota 10. sobreprecio: el precio de mostrador sobre el de mayoreo. fama: impulso máximo a las ventas en tiendas
  // de fuera según lo vendido ayer en las tuyas (porCada unidades = +100% de ese impulso).
  anaquel: {
    giros: { bebida: ['bebida', 'comida', 'cafe', 'tienda'], snack: ['bebida', 'comida', 'cafe', 'tienda'], audifonos: ['ropa'], tenis: ['ropa'], telefono: ['ropa', 'servicio'] },
    tasa: 0.25, sobreprecio: 1.5, fama: 0.3, porCada: 400,
  },

  // ---- Interior de los locales (por ahora la tiendita) ----
  // Cuadrícula de ancho × fondo. La puerta está al frente, al centro; sus casillas y las de enfrente quedan libres.
  // tam: casillas que ocupa sin girar. Las cajas atienden por el lado del frente (y + 1).
  interior: {
    ancho: 10, fondo: 8, puerta: [4, 5], bodega: 800,
    muebles: {
      caja: { nombre: 'Caja registradora', costo: 600, tam: [2, 1], cap: 14, mejora: { nombre: 'Caja rápida', costo: 900, cap: 24 }, desc: 'Cada caja con cajero atiende a cierta cantidad de clientes por hora.' },
      anaquel: { nombre: 'Anaquel', costo: 300, tam: [2, 1], para: 'seco', capacidad: 60, mejora: { nombre: 'Anaquel alto', costo: 400, capacidad: 110 }, desc: 'Exhibe un producto seco: botanas, abarrotes, dulces o limpieza.' },
      refri: { nombre: 'Refrigerador', costo: 900, tam: [1, 1], para: 'frio', capacidad: 50, mejora: { nombre: 'Refri de doble puerta', costo: 1100, capacidad: 100 }, desc: 'Mantiene frías las bebidas. Sin refri no vendes refrescos ni agua.' },
      planta: { nombre: 'Planta', costo: 120, tam: [1, 1], decor: 3, desc: 'Decoración: sube un poco la reputación.' },
    },
    productos: {
      refresco: { nombre: 'Refrescos', costo: 0.7, precioRef: 1.5, demanda: 0.35, para: 'frio', color: '#D1495B' },
      agua: { nombre: 'Agua', costo: 0.3, precioRef: 0.9, demanda: 0.25, para: 'frio', color: '#5FA8D9' },
      botanas: { nombre: 'Botanas', costo: 0.8, precioRef: 1.6, demanda: 0.3, para: 'seco', color: '#F2C230' },
      abarrotes: { nombre: 'Abarrotes', costo: 1.1, precioRef: 2.2, demanda: 0.25, para: 'seco', color: '#81B29A' },
      dulces: { nombre: 'Dulces', costo: 0.3, precioRef: 0.8, demanda: 0.2, para: 'seco', color: '#E07A5F' },
      limpieza: { nombre: 'Limpieza', costo: 1.8, precioRef: 3.5, demanda: 0.12, para: 'seco', color: '#7D5BA6' },
    },
    itemsPorCliente: 1.6,
    calidades: {
      basico: { nombre: 'Básico', costo: 0.8, acepta: -0.1, rep: -8 },
      normal: { nombre: 'Normal', costo: 1, acepta: 0, rep: 0 },
      premium: { nombre: 'Premium', costo: 1.3, acepta: 0.15, rep: 8 },
    },
    reponerHora: 60, // unidades que mueve un reponedor de la bodega a los anaqueles cada hora
    express: 1.25, // pedir para ya cuesta más que el pedido automático de la noche
    apretado: 0.45, // si quedan libres menos de este tanto de casillas, la gente se estorba
    // Acomodo con el que abre una tiendita nueva.
    inicial: [
      { tipo: 'caja', x: 7, y: 5, rot: 0 },
      { tipo: 'anaquel', x: 1, y: 2, rot: 0, prod: 'botanas' },
      { tipo: 'anaquel', x: 1, y: 4, rot: 0, prod: 'abarrotes' },
      { tipo: 'refri', x: 7, y: 0, rot: 0, prod: 'refresco' },
      { tipo: 'refri', x: 8, y: 0, rot: 0, prod: 'agua' },
    ],
  },
};
if (typeof module !== 'undefined') module.exports = DATOS;
