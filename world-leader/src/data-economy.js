/* =====================================================================
   WORLD LEADER · DATOS · ECONOMÍA AMPLIADA (Fase 2)
   Más materias primas y empresas, industrias y palancas de política.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  Object.assign(D.COMMODITIES, { pla: { n: 'Plata', p: .3, vol: .07 }, niq: { n: 'Níquel', p: .26, vol: .09 } });
  const EXTRA = { pla: 'MX4,PE3,CN3,BO2,CL2,AU2,PL2,RU2,AR1', niq: 'ID5,PH3,RU3,CA2,AU2,BR2,CU2,CN1' };
  for (const k in EXTRA) EXTRA[k].split(',').forEach(x => { const c = D.C[x.slice(0, 2)]; if (c) c.rec[k] = +x.slice(2); });
  D.STOCK_SECTORS.ind = 'Industria';
  [['AMZN', 'Amazon', 'US', 'tec', 220, 0], ['GOOGL', 'Alphabet', 'US', 'tec', 250, .3], ['META', 'Meta', 'US', 'tec', 700, .3], ['XOM', 'ExxonMobil', 'US', 'ene', 115, 3.4], ['BA', 'Boeing', 'US', 'def', 210, 0], ['BRK', 'Berkshire Hathaway', 'US', 'fin', 500, 0],
  ['NVO', 'Novo Nordisk', 'DK', 'far', 60, 2.5], ['ASML', 'ASML', 'NL', 'tec', 900, .8], ['SAP', 'SAP', 'DE', 'tec', 260, 1], ['SIE', 'Siemens', 'DE', 'ind', 230, 2.2], ['AIR', 'Airbus', 'FR', 'def', 200, 1.5], ['TTE', 'TotalEnergies', 'FR', 'ene', 62, 5.5],
  ['HSBA', 'HSBC', 'GB', 'fin', 13, 5], ['BYD', 'BYD', 'CN', 'aut', 14, 1], ['CATL', 'CATL', 'CN', 'ind', 50, 1], ['SONY', 'Sony', 'JP', 'tec', 28, .6], ['INFY', 'Infosys', 'IN', 'tec', 18, 2.5], ['TATA', 'Tata Motors', 'IN', 'aut', 8, .5],
  ['RIO', 'Rio Tinto', 'AU', 'min', 65, 6], ['GLEN', 'Glencore', 'CH', 'min', 4.5, 3], ['EC', 'Ecopetrol', 'CO', 'ene', 9, 12], ['YPF', 'YPF', 'AR', 'ene', 35, 0], ['MELI', 'MercadoLibre', 'AR', 'tec', 2300, 0], ['CEMEX', 'Cemex', 'MX', 'ind', 9, 1],
  ['ITUB', 'Itaú Unibanco', 'BR', 'fin', 7, 5], ['EMBR', 'Embraer', 'BR', 'def', 60, 0], ['SAN', 'Banco Santander', 'ES', 'fin', 10, 3], ['ITX', 'Inditex', 'ES', 'con', 50, 3], ['IBE', 'Iberdrola', 'ES', 'ene', 17, 3.5], ['ENI', 'Eni', 'IT', 'ene', 16, 6],
  ['RACE', 'Ferrari', 'IT', 'aut', 420, .7], ['SHOP', 'Shopify', 'CA', 'tec', 150, 0], ['RY', 'Royal Bank of Canada', 'CA', 'fin', 145, 3.3], ['SBER', 'Sberbank', 'RU', 'fin', 3, 8]]
    .forEach(a => D.COMPANIES.push({ id: a[0], n: a[1], home: a[2], sec: a[3], p: a[4], y: a[5] }));
  // Cadenas de suministro: cada nivel de industria consume materias primas (u/turno) y exporta valor (mM$/turno)
  D.INDUSTRY = {
    man: { n: 'Manufactura', d: 'Acero y energía convertidos en bienes.', inp: { hie: .6, pet: .4 }, out: 1.0, cost: 1.2 },
    tec: { n: 'Electrónica', d: 'Tierras raras, cobre y litio convertidos en chips y baterías.', inp: { tie: .3, cob: .3, lit: .2 }, out: 1.6, cost: 2 },
    agr: { n: 'Agroindustria', d: 'Grano, café y cacao convertidos en alimentos de marca.', inp: { tri: .8, caf: .3 }, out: .7, cost: .8 }
  };
  // Palancas de política económica: tres posiciones cada una
  D.LEVERS = {
    rate: { n: 'Tipo de interés', o: ['Bajo', 'Neutral', 'Alto'], d: ['Más crecimiento y empleo; sube la inflación y cae la moneda', 'Sin sesgo', 'Frena la inflación y sostiene la moneda; menos crecimiento y más paro'] },
    tar: { n: 'Aranceles', o: ['Libre comercio', 'Moderados', 'Altos'], d: ['Más comercio y precios bajos; tu industria queda expuesta', 'Sin sesgo', 'Recaudan y protegen tu industria; menos comercio, más inflación y socios molestos'] },
    fis: { n: 'Gasto público', o: ['Austeridad', 'Normal', 'Expansivo'], d: ['Ahorra un 6%; menos crecimiento, más paro y sectores populares molestos', 'Sin sesgo', 'Gasta un 7% más; más crecimiento y empleo, más inflación'] }
  };
  // Bloques a los que se puede pedir el ingreso: regiones admitidas (vacío = cualquiera) y PIB mínimo
  D.BLOC_JOIN = { OTAN: ['EUR', 'AMN'], UE: ['EUR'], ASEAN: ['ASI'], UA: ['AFR'], LA: ['MOR', 'AFR'], MERCOSUR: ['AMS'], OTSC: ['ASI', 'EUR'], OCS: ['ASI', 'EUR', 'MOR'], BRICS: [], G7: [] };
  D.P5 = ['US', 'RU', 'CN', 'FR', 'GB']; // consejo reducido con derecho a veto
})();
