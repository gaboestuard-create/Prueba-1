// Capa 1: DATOS. Todo el contenido y el balance viven aquí; el motor no trae números propios.
// Agregar un negocio, producto, local o distrito es agregar un objeto a estas listas.
const DATOS = {
  balance: {
    horaInicio: 8,
    // Personaje (puntos por hora de juego, escala 0-100)
    energiaHora: 5, energiaTrabajo: 3, suenoHora: 12.5, hambreHora: 3, hambreSueno: 1.5, animoHora: 1.2,
    rendimientoBajo: 0.4, habJugador: 50, cargaMax: 600,
    comerCasa: { costo: 6, hambre: 60 }, comerFuera: { costo: 14, hambre: 50 },
    ocio: { costo: 25, horas: 2, animo: 35 },
    viaje: { mismo: { horas: 0, costo: 2 }, otro: { horas: 1, costo: 8 } },
    // Negocios
    depositoDias: 3, reventaEquipo: 0.3, valorEquipo: 0.5,
    interior: [0, 600, 1500, 3500], interiorEfecto: 0.06,
    marketing: [0, 20, 50, 100], mktEfecto: 0.4,
    toleranciaPrecio: 0.5, elasticidad: 1, fueraDeGiro: 0.4,
    suciedadCliente: 0.12, suciedadMiembro: 0.015, limpiezaHora: 0.08, limpiarJugador: 60,
    repInicial: 50, repVel: 0.02,
    pesosRep: { servicio: 0.3, precio: 0.3, limpieza: 0.15, stock: 0.25 },
    membresia: { bajaBase: 0.01, bajaMax: 0.08 },
    // Empleados
    sueldoBase: 5, sueldoHab: 0.03, horasTurno: 8, candidatoDias: 4, candidatosPorBusqueda: 3,
    // La agencia cobra por candidato: rápido es caro, esperar es barato.
    agencia: [{ dias: 1, costo: 300 }, { dias: 3, costo: 150 }, { dias: 7, costo: 60 }],
    // Satisfacción 0-100 por empleado: sube si se cumplen sus condiciones, baja por cada una rota. En 0 renuncia.
    satisfaccion: { inicial: 70, sube: 1, baja: 6, animoJefe: 25, bajaJefe: 2, aumento: 0.05, subeAumento: 20 },
    capacitar: { costo: 150, dias: 3, mejora: 20 },
    // Dinero
    impuesto: 0.15, impuestoPeriodo: 14, impuestoPlazo: 5, impuestoRecargo: 0.1, diasQuiebra: 3,
    prestamo: { base: 4000, patrimonio: 0.5, reputacion: 40, interesSemanal: 0.012, semanas: 26 },
  },

  dineroInicial: [3000, 5000, 8000],
  dificultades: {
    facil: { nombre: 'Fácil', meta: 50000, demanda: 1.15, costos: 0.9 },
    normal: { nombre: 'Normal', meta: 100000, demanda: 1, costos: 1 },
    dificil: { nombre: 'Difícil', meta: 250000, demanda: 0.9, costos: 1.1 },
  },

  turnos: [
    { id: 'manana', nombre: 'Mañana', de: 6, a: 14 },
    { id: 'tarde', nombre: 'Tarde', de: 14, a: 22 },
    { id: 'noche', nombre: 'Noche', de: 22, a: 6 },
  ],
  semana: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  jornadas: { medio: { nombre: 'Medio tiempo', maxDias: 3 }, completo: { nombre: 'Tiempo completo', maxDias: 6 } },
  demandas: { finesLibres: 'Fines de semana libres' },
  cursos: [{ id: 'rrhh', nombre: 'Curso básico de RR. HH.', costo: 250, horas: 4, desc: 'Sin este curso no puedes contratar.' }],
  // Cada mueble atiende cierta cantidad de clientes por hora (o socios). cats: categorías de producto que exhibe.
  muebles: {
    estante: { nombre: 'Estante', costo: 150, capacidad: 20, cats: ['abarrotes'] },
    refrigerador: { nombre: 'Refrigerador', costo: 250, capacidad: 20, cats: ['bebidas'] },
    maquina: { nombre: 'Máquina de espresso', costo: 1200, capacidad: 14, cats: ['cafe'] },
    vitrina: { nombre: 'Vitrina de panadería', costo: 400, capacidad: 20, cats: ['reposteria'] },
    caja: { nombre: 'Caja registradora', costo: 350, capacidad: 24 },
    estacion: { nombre: 'Estación de ejercicio', costo: 1500, capacidad: 40 },
    casilleros: { nombre: 'Casilleros', costo: 500, capacidad: 120 },
    regadera: { nombre: 'Regadera', costo: 700, capacidad: 120 },
  },
  habilidades: [
    { id: 'servicio', nombre: 'Servicio' },
    { id: 'limpieza', nombre: 'Limpieza' },
  ],

  // forma: polígono en el mapa (360 x 300). trafico/precio/renta multiplican los valores base.
  distritos: [
    { id: 'alto', nombre: 'Altos del Mirador', clase: 'alta', trafico: 0.75, precio: 1.4, renta: 2, forma: '0,0 360,0 360,85 0,110', demanda: { abarrotes: 0.7, bebidas: 0.9, cafe: 1.3, reposteria: 1.2, fitness: 1.5 } },
    { id: 'medio', nombre: 'Villa Jacarandá', clase: 'media', trafico: 1, precio: 1, renta: 1, forma: '0,110 360,85 360,190 0,205', demanda: { abarrotes: 1, bebidas: 1, cafe: 1, reposteria: 1, fitness: 1 } },
    { id: 'obrero', nombre: 'Barrio Fundidores', clase: 'trabajadora', trafico: 1.2, precio: 0.9, renta: 0.7, forma: '0,220 360,205 360,300 0,300', demanda: { abarrotes: 1.2, bebidas: 1.1, cafe: 0.7, reposteria: 0.8, fitness: 0.6 } },
  ],

  // peso: unidades que pide en promedio cada cliente atendido. merma: fracción del stock que se pierde cada noche.
  productos: {
    agua: { nombre: 'Agua', costo: 0.35, mercado: 0.9, sugerido: 0.85, cat: 'bebidas', peso: 0.35 },
    refresco: { nombre: 'Refresco', costo: 0.7, mercado: 1.5, sugerido: 1.45, cat: 'bebidas', peso: 0.35 },
    botana: { nombre: 'Botana', costo: 0.8, mercado: 1.6, sugerido: 1.55, cat: 'abarrotes', peso: 0.3 },
    pan: { nombre: 'Pan de caja', costo: 1.2, mercado: 2.2, sugerido: 2.15, cat: 'abarrotes', peso: 0.2 },
    leche: { nombre: 'Leche', costo: 0.9, mercado: 1.6, sugerido: 1.55, cat: 'bebidas', peso: 0.25 },
    enlatado: { nombre: 'Enlatados', costo: 1, mercado: 1.9, sugerido: 1.85, cat: 'abarrotes', peso: 0.15 },
    cafe: { nombre: 'Café americano', costo: 0.5, mercado: 2.5, sugerido: 2.4, cat: 'cafe', peso: 0.6 },
    latte: { nombre: 'Latte', costo: 0.9, mercado: 3.8, sugerido: 3.7, cat: 'cafe', peso: 0.35 },
    pandulce: { nombre: 'Pan dulce', costo: 0.8, mercado: 2.4, sugerido: 2.3, cat: 'reposteria', peso: 0.3, merma: 0.3 },
    sandwich: { nombre: 'Sándwich', costo: 1.8, mercado: 5, sugerido: 4.8, cat: 'reposteria', peso: 0.2, merma: 0.3 },
    membresia: { nombre: 'Membresía semanal', costo: 0, mercado: 30, sugerido: 29, cat: 'fitness', peso: 1 },
  },

  // modelo 'inventario': clientes por hora que compran productos del stock.
  // modelo 'membresia': socios que pagan por semana; clientesBase = interesados por día.
  // muebles: los que el negocio necesita para abrir; su capacidad es la del mueble que menos da.
  // productos: su giro. Una tienda puede vender otros productos si compra el mueble, pero se venden menos.
  // velocidad: clientes por hora que atiende una persona. curva: afluencia por hora del día (0-23).
  negocios: [
    { id: 'tienda', nombre: 'Tienda de conveniencia', corto: 'Tienda', modelo: 'inventario', desc: 'Muchos productos y margen bajo. Vive del volumen y de no quedarse sin mercancía.', productos: ['agua', 'refresco', 'botana', 'pan', 'leche', 'enlatado'], clientesBase: 16, velocidad: 16, servicios: 14, horario: [7, 22], muebles: ['estante', 'refrigerador', 'caja'], curva: [0.1, 0.05, 0.05, 0.05, 0.1, 0.2, 0.5, 0.8, 0.9, 0.7, 0.6, 0.7, 0.9, 1, 0.8, 0.6, 0.6, 0.8, 1, 1, 0.8, 0.6, 0.4, 0.2] },
    { id: 'cafeteria', nombre: 'Cafetería', corto: 'Cafetería', modelo: 'inventario', desc: 'Margen alto y hora pico en la mañana. Atender es lento y el pan se echa a perder.', productos: ['cafe', 'latte', 'pandulce', 'sandwich'], clientesBase: 20, velocidad: 9, servicios: 22, horario: [6, 18], muebles: ['maquina', 'vitrina', 'caja'], curva: [0, 0, 0, 0, 0, 0.2, 0.7, 1, 1, 0.8, 0.5, 0.4, 0.6, 0.6, 0.4, 0.4, 0.5, 0.5, 0.3, 0.2, 0.1, 0, 0, 0] },
    { id: 'gimnasio', nombre: 'Gimnasio', corto: 'Gimnasio', modelo: 'membresia', desc: 'Sin inventario. Los socios llegan poco a poco y se van si el lugar está sucio, lleno o sin personal.', productos: ['membresia'], clientesBase: 6, velocidad: 0, servicios: 38, horario: [6, 22], muebles: ['estacion', 'casilleros', 'regadera'] },
  ],

  // espacio: máximo de muebles. almacen: unidades de mercancía que caben.
  locales: [
    { id: 'o1', nombre: 'Esquina del Mercado', corto: 'Mercado', distrito: 'obrero', trafico: 1.15, renta: 70, almacen: 600, espacio: 10, x: 265, y: 240 },
    { id: 'o2', nombre: 'Callejón de la Fragua', corto: 'Fragua', distrito: 'obrero', trafico: 0.85, renta: 45, almacen: 400, espacio: 8, x: 330, y: 262 },
    { id: 'm1', nombre: 'Plaza Jacarandá', corto: 'Plaza', distrito: 'medio', trafico: 1.2, renta: 95, almacen: 600, espacio: 12, x: 60, y: 160 },
    { id: 'm2', nombre: 'Avenida 12', corto: 'Av. 12', distrito: 'medio', trafico: 0.9, renta: 65, almacen: 450, espacio: 10, x: 225, y: 140 },
    { id: 'a1', nombre: 'Paseo del Mirador', corto: 'Paseo', distrito: 'alto', trafico: 1.2, renta: 100, almacen: 600, espacio: 14, x: 90, y: 62 },
    { id: 'a2', nombre: 'Calle Alta', corto: 'C. Alta', distrito: 'alto', trafico: 0.9, renta: 75, almacen: 450, espacio: 10, x: 210, y: 50 },
  ],
  proveedores: [
    { id: 'mayoreo', nombre: 'Central de Mayoreo', corto: 'Mayoreo', distrito: 'obrero', productos: ['agua', 'refresco', 'botana', 'pan', 'leche', 'enlatado'], x: 195, y: 266 },
    { id: 'tostadora', nombre: 'Tostadora y Horno Jacarandá', corto: 'Tostadora', distrito: 'medio', productos: ['cafe', 'latte', 'pandulce', 'sandwich'], x: 305, y: 150 },
  ],
  empleos: [
    { id: 'bodega', nombre: 'Bodega de paquetería', corto: 'Empleo', distrito: 'obrero', pagoHora: 11, horas: 4, x: 140, y: 250 },
  ],
  // animo: puntos por hora de sueño. novedad: bono extra al mudarte, se desvanece 15% cada día.
  departamentos: [
    { id: 'cuarto', nombre: 'Cuarto rentado', corto: 'Casa', distrito: 'obrero', renta: 18, animo: 0.5, novedad: 0, x: 50, y: 262 },
    { id: 'depa', nombre: 'Departamento en Jacarandá', corto: 'Casa', distrito: 'medio', renta: 55, animo: 1.5, novedad: 20, x: 150, y: 152 },
    { id: 'loft', nombre: 'Loft con vista', corto: 'Casa', distrito: 'alto', renta: 160, animo: 3, novedad: 40, x: 310, y: 42 },
  ],
  eventos: [], // reservado para fases siguientes
  nombres: ['Marisol Peña', 'Iván Robles', 'Lucía Bermúdez', 'Tomás Aguirre', 'Renata Solís', 'Óscar Meza', 'Paola Cifuentes', 'Hugo Zamora', 'Daniela Ortiz', 'Emilio Carranza', 'Fernanda Luján', 'Raúl Espino', 'Citlali Mora', 'Andrés Baeza', 'Julia Rentería', 'Mateo Villalobos'],
};
if (typeof module !== 'undefined') module.exports = DATOS;
