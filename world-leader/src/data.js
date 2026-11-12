/* =====================================================================
   WORLD LEADER · 1. DATOS (editables)
   Todo lo que hay aquí son tablas: países, líderes, partidos, rasgos,
   leyes, unidades, eventos, empresas. El motor nunca escribe en DATA.
   ===================================================================== */
(function () {
  const WL = globalThis.WL = globalThis.WL || {};
  const D = WL.DATA = {};

  D.REGIONS = { AMN: 'Norteamérica', AMC: 'Centroamérica y Caribe', AMS: 'Sudamérica', EUR: 'Europa', AFR: 'África', MOR: 'Medio Oriente', ASI: 'Asia', OCE: 'Oceanía' };
  D.REGIMES = { dem: 'Democracia', hib: 'Régimen híbrido', aut: 'Autoritario', com: 'Partido único', mon: 'Monarquía', mil: 'Junta militar', teo: 'Teocracia' };
  D.IDEO = { '-2': 'Izquierda', '-1': 'Centroizquierda', '0': 'Centro', '1': 'Centroderecha', '2': 'Derecha' };

  // Bloques: def = defensa mutua implícita, com = libre comercio implícito, rel = afinidad base entre miembros
  D.BLOCS = {
    OTAN: { n: 'OTAN', def: 1, rel: 30, c: '#3d7fd9' }, UE: { n: 'Unión Europea', com: 1, rel: 25, c: '#2f5fc4' },
    G7: { n: 'G7', rel: 15, c: '#5a8be0' }, BRICS: { n: 'BRICS', rel: 12, c: '#d98a2b' },
    OTSC: { n: 'OTSC', def: 1, rel: 25, c: '#c0392b' }, OCS: { n: 'Org. de Shanghái', rel: 10, c: '#c96a2b' },
    ASEAN: { n: 'ASEAN', com: 1, rel: 15, c: '#1fa67a' }, LA: { n: 'Liga Árabe', rel: 10, c: '#2e9e4f' },
    UA: { n: 'Unión Africana', rel: 8, c: '#8fae2f' }, MERCOSUR: { n: 'Mercosur', com: 1, rel: 12, c: '#12a3a8' }
  };

  // Materias primas: p = precio base (miles de millones de $ por unidad), vol = volatilidad
  D.COMMODITIES = {
    pet: { n: 'Petróleo', p: .32, vol: .07 }, gas: { n: 'Gas natural', p: .2, vol: .08 }, car: { n: 'Carbón', p: .1, vol: .05 },
    oro: { n: 'Oro', p: .5, vol: .04 }, cob: { n: 'Cobre', p: .24, vol: .06 }, lit: { n: 'Litio', p: .28, vol: .1 },
    hie: { n: 'Hierro', p: .14, vol: .05 }, ura: { n: 'Uranio', p: .36, vol: .07 }, tie: { n: 'Tierras raras', p: .44, vol: .08 },
    tri: { n: 'Trigo y granos', p: .12, vol: .06 }, caf: { n: 'Café y cacao', p: .1, vol: .07 }
  };
  D.PROD = [0, 2, 6, 14, 28, 45]; // unidades/turno según nivel de recurso 0-5

  /* ---- PAÍSES ----
     iso|población (M)|PIB (miles de M$)|militares activos (miles)|líder|partido|ideología -2..2|régimen|bloques|recursos(nivel 1-5)
     El build añade nombre en español, capital, región, coordenadas, fronteras y área.
     Todos los líderes nacen con verificado:false: corrígelos en el Editor del juego o aquí. */
  const ROWS = `
US|340|29200|1330|Donald Trump|Partido Republicano|2|dem|OTAN,G7|pet5,gas5,car4,tri5,oro3,cob3,ura1,tie2,hie2
CA|40|2240|68|Mark Carney|Partido Liberal|-1|dem|OTAN,G7|pet4,gas4,tri4,ura4,oro3,hie3,cob2
MX|131|1850|412|Claudia Sheinbaum|Morena|-1|dem||pet3,cob2,oro2,gas1,caf1,lit1
GT|18|113|22|Bernardo Arévalo|Movimiento Semilla|-1|dem||caf2
BZ|0.4|3.3|1.5|Johnny Briceño|Partido Popular Unido|-1|dem||
SV|6.4|35|25|Nayib Bukele|Nuevas Ideas|1|hib||caf1
HN|10.8|37|15|Nasry Asfura|Partido Nacional|2|dem||caf2
NI|7|19|12|Daniel Ortega|FSLN|-2|aut||caf1,oro1
CR|5.2|95|0|Laura Fernández|Pueblo Soberano|1|dem||caf1
PA|4.5|87|0|José Raúl Mulino|Realizando Metas|1|dem||cob1
CU|11|105|49|Miguel Díaz-Canel|Partido Comunista de Cuba|-2|com||
HT|11.8|26|1|Alix Didier Fils-Aimé|Gobierno de transición|0|hib||
DO|11.4|127|56|Luis Abinader|PRM|0|dem||oro1
JM|2.8|20|4|Andrew Holness|Partido Laborista de Jamaica|1|dem||
TT|1.5|28|4|Kamla Persad-Bissessar|Congreso Nacional Unido|0|dem||gas2,pet1
BS|0.4|15|1.3|Philip Davis|Partido Liberal Progresista|0|dem||
BB|0.28|7|0.6|Mia Mottley|Partido Laborista de Barbados|-1|dem||
LC|0.18|2.5|0|Philip J. Pierre|Partido Laborista de Santa Lucía|-1|dem||
VC|0.1|1.1|0|Godwin Friday|Nuevo Partido Democrático|1|dem||
GD|0.12|1.4|0|Dickon Mitchell|Congreso Nacional Democrático|-1|dem||
AG|0.09|2.2|0.2|Gaston Browne|Partido Laborista de Antigua y Barbuda|-1|dem||
DM|0.07|0.7|0|Roosevelt Skerrit|Partido Laborista de Dominica|-1|dem||
KN|0.05|1.1|0.3|Terrance Drew|Partido Laborista de San Cristóbal y Nieves|-1|dem||
BR|212|2180|367|Luiz Inácio Lula da Silva|Partido de los Trabajadores|-1|dem|BRICS,MERCOSUR|hie5,pet4,caf5,tri4,oro2,lit1,tie2
AR|46|640|77|Javier Milei|La Libertad Avanza|2|dem|MERCOSUR|lit4,tri4,gas3,pet2,cob1,oro1
CL|19.8|340|69|José Antonio Kast|Partido Republicano|2|dem||cob5,lit4,hie1,oro1
CO|52|420|260|Gustavo Petro|Pacto Histórico|-2|dem||pet2,car3,caf3,oro1
PE|34|290|81|José Jerí|Somos Perú|1|hib||cob4,oro3,gas1,caf1
VE|28|110|123|Delcy Rodríguez|PSUV|-2|aut||pet3,gas2,oro1,hie1
EC|18|125|40|Daniel Noboa|Acción Democrática Nacional|1|dem||pet2,cob1,oro1,caf1
BO|12.4|48|34|Rodrigo Paz|Partido Demócrata Cristiano|0|dem||gas2,lit3
PY|6.9|46|14|Santiago Peña|Partido Colorado|2|dem|MERCOSUR|tri2
UY|3.4|82|21|Yamandú Orsi|Frente Amplio|-1|dem|MERCOSUR|tri1
GY|0.8|24|3|Irfaan Ali|PPP/C|-1|dem||pet3,oro1
SR|0.63|4.5|2|Jennifer Geerlings-Simons|Partido Nacional Democrático|-1|dem||oro1,pet1
GB|68.5|3650|140|Keir Starmer|Partido Laborista|-1|dem|OTAN,G7|pet2,gas2
FR|68.5|3200|203|Emmanuel Macron|Renacimiento|0|dem|OTAN,UE,G7|ura1,tri3
DE|84|4700|181|Friedrich Merz|CDU|1|dem|OTAN,UE,G7|car2
IT|59|2400|165|Giorgia Meloni|Hermanos de Italia|2|dem|OTAN,UE,G7|
ES|48.8|1750|124|Pedro Sánchez|PSOE|-1|dem|OTAN,UE|
PT|10.6|310|27|Luís Montenegro|PSD|1|dem|OTAN,UE|lit1
NL|18|1250|41|Rob Jetten|D66|0|dem|OTAN,UE|gas1
BE|11.8|670|23|Bart De Wever|N-VA|1|dem|OTAN,UE|
LU|0.67|93|1|Luc Frieden|CSV|1|dem|OTAN,UE|
IE|5.3|580|8|Micheál Martin|Fianna Fáil|0|dem|UE|
CH|8.9|940|20|Guy Parmelin|Consejo Federal (UDC)|1|dem||
AT|9.1|540|22|Christian Stocker|ÖVP|1|dem|UE|
DK|6|430|15|Mette Frederiksen|Socialdemócratas|-1|dem|OTAN,UE|
SE|10.6|620|15|Ulf Kristersson|Partido Moderado|1|dem|OTAN,UE|hie3
NO|5.6|500|23|Jonas Gahr Støre|Partido Laborista|-1|dem|OTAN|pet4,gas5
FI|5.6|305|24|Petteri Orpo|Coalición Nacional|1|dem|OTAN,UE|
IS|0.39|33|0|Kristrún Frostadóttir|Alianza Socialdemócrata|-1|dem|OTAN|
PL|36.6|920|202|Donald Tusk|Coalición Cívica|0|dem|OTAN,UE|car3,cob2
CZ|10.9|350|27|Andrej Babiš|ANO|1|dem|OTAN,UE|
SK|5.4|145|18|Robert Fico|Smer|-1|dem|OTAN,UE|
HU|9.6|230|32|Péter Magyar|Tisza|1|dem|OTAN,UE|
RO|19|385|72|Nicușor Dan|Independiente|0|dem|OTAN,UE|gas1
BG|6.4|115|37|Rosen Zhelyazkov|GERB|1|dem|OTAN,UE|
GR|10.4|260|143|Kyriakos Mitsotakis|Nueva Democracia|1|dem|OTAN,UE|
HR|3.9|93|17|Andrej Plenković|HDZ|1|dem|OTAN,UE|
SI|2.1|73|7|Robert Golob|Movimiento Libertad|-1|dem|OTAN,UE|
RS|6.6|90|28|Aleksandar Vučić|SNS|1|hib||cob1,lit1
BA|3.2|29|10|Denis Bećirović|SDP|0|dem||
ME|0.62|8|2|Milojko Spajić|Europa Ahora|0|dem|OTAN|
MK|1.8|17|8|Hristijan Mickoski|VMRO-DPMNE|1|dem|OTAN|
AL|2.7|27|8|Edi Rama|Partido Socialista|-1|dem|OTAN|
XK|1.6|11|5|Albin Kurti|Vetëvendosje|-1|dem||
EE|1.4|43|7|Kristen Michal|Partido Reformista|1|dem|OTAN,UE|
LV|1.9|45|7|Evika Siliņa|Nueva Unidad|1|dem|OTAN,UE|
LT|2.9|85|23|Inga Ruginienė|Partido Socialdemócrata|-1|dem|OTAN,UE|
BY|9.1|76|48|Aleksandr Lukashenko|Belaya Rus|0|aut|OTSC|
UA|37|190|900|Volodímir Zelenski|Servidor del Pueblo|0|dem||tri4,hie3,car2,lit1,ura1
MD|2.4|18|6|Maia Sandu|PAS|0|dem||
RU|144|2100|1320|Vladímir Putin|Rusia Unida|2|aut|BRICS,OTSC,OCS|pet5,gas5,car4,tri5,oro4,ura3,hie4,cob2,tie2
MT|0.55|24|2|Robert Abela|Partido Laborista|-1|dem|UE|
CY|1.3|35|12|Nikos Christodoulides|Independiente|0|dem|UE|
AD|0.08|3.9|0|Xavier Espot|Demócratas por Andorra|1|dem||
MC|0.04|9|0|Alberto II|Casa Grimaldi|1|mon||
LI|0.04|8|0|Brigitte Haas|Unión Patriótica|1|dem||
SM|0.034|2|0|Capitanes Regentes|PDCS|0|dem||
VA|0.001|0.3|0.1|León XIV|Santa Sede|0|teo||
TR|85.5|1350|355|Recep Tayyip Erdoğan|AKP|2|hib|OTAN|car2,oro1
GE|3.7|34|21|Irakli Kobajidze|Sueño Georgiano|1|hib||
AM|3|26|43|Nikol Pashinián|Contrato Civil|0|dem|OTSC|cob1
AZ|10.2|75|68|Ilham Alíyev|Nuevo Azerbaiyán|1|aut||pet3,gas3
IL|9.9|540|170|Benjamín Netanyahu|Likud|2|dem||gas2
PS|5.4|14|0|Mahmud Abás|Fatah|0|hib|LA|
LB|5.4|28|60|Joseph Aoun|Independiente|0|hib|LA|
SY|23|21|100|Ahmed al-Sharaa|Gobierno de transición|1|aut|LA|pet1
JO|11.4|53|100|Abdalá II|Monarquía hachemita|1|mon|LA|
IQ|45|265|193|Mohammed Shia al-Sudani|Marco de Coordinación|0|hib|LA|pet5,gas2
IR|90|400|610|Mojtaba Jamenei|República Islámica|2|teo|BRICS,OCS|pet4,gas5,cob2,hie2,ura1
SA|36|1100|257|Mohamed bin Salmán|Casa de Saúd|2|mon|LA|pet5,gas3,oro1
AE|10|540|63|Mohamed bin Zayed|Monarquía federal|1|mon|LA,BRICS|pet4,gas3
QA|3|220|17|Tamim bin Hamad Al Thani|Casa de Thani|1|mon|LA|gas5,pet2
KW|4.9|160|18|Mishal Al-Ahmad Al-Sabah|Casa de Sabah|1|mon|LA|pet4
BH|1.6|47|8|Hamad bin Isa Al Jalifa|Casa de Jalifa|1|mon|LA|pet1
OM|5.3|107|43|Haitham bin Tariq|Casa de Al Said|1|mon|LA|pet3,gas2
YE|40|19|40|Rashad al-Alimi|Consejo de Liderazgo Presidencial|0|hib|LA|pet1
CN|1410|18800|2035|Xi Jinping|Partido Comunista de China|-2|com|BRICS,OCS|car5,tie5,hie4,oro4,pet3,gas3,tri5,lit3,cob2,ura1
JP|124|4100|247|Sanae Takaichi|Partido Liberal Democrático|2|dem|G7|
KR|51.7|1870|500|Lee Jae-myung|Partido Democrático|-1|dem||
KP|26|28|1280|Kim Jong-un|Partido del Trabajo de Corea|-2|com||car2,ura1,tie1
TW|23.4|800|170|Lai Ching-te|Partido Progresista Democrático|-1|dem||
MN|3.5|23|10|Gombojavyn Zandanshatar|Partido del Pueblo de Mongolia|-1|dem||car3,cob3,oro1,ura1
IN|1440|4100|1455|Narendra Modi|BJP|2|dem|BRICS,OCS|car4,hie3,tri5,tie1,ura1
PK|245|375|654|Shehbaz Sharif|PML-N|1|hib|OCS|car1,gas1,tri2
BD|173|450|163|Tarique Rahman|BNP|1|dem||gas1
LK|22|99|150|Anura Kumara Dissanayake|Poder Popular Nacional|-2|dem||
NP|30|43|97|Balendra Shah|Partido Rastriya Swatantra|0|dem||
BT|0.8|3|8|Tshering Tobgay|Partido Democrático Popular|0|dem||
MV|0.52|7|4|Mohamed Muizzu|Congreso Nacional del Pueblo|1|dem||
AF|42|17|170|Hibatullah Akhundzada|Talibán|2|teo||lit1,cob1
KZ|20|290|39|Kasim-Yomart Tokáyev|Amanat|1|aut|OTSC,OCS|pet4,ura5,car3,gas2,cob2,tri3,hie2
UZ|36.5|115|48|Shavkat Mirziyóyev|Partido Liberal Democrático|1|aut|OCS|gas3,oro3,ura3,cob1
TM|6.5|83|37|Serdar Berdimuhamédov|Partido Democrático|1|aut||gas4,pet1
KG|7.1|17|11|Sadyr Zhapárov|Mekenchil|1|aut|OTSC,OCS|oro2
TJ|10.3|14|9|Emomali Rahmon|Partido Democrático Popular|1|aut|OTSC,OCS|
TH|71.7|545|360|Anutin Charnvirakul|Bhumjaithai|1|hib|ASEAN|tri2
VN|100|480|482|To Lam|Partido Comunista de Vietnam|-2|com|ASEAN|tie3,caf4,pet1,car2,tri3
MY|34.5|440|113|Anwar Ibrahim|Pakatan Harapan|-1|dem|ASEAN|pet2,gas3,tie1
SG|5.9|550|51|Lawrence Wong|Partido de Acción Popular|1|hib|ASEAN|
ID|280|1400|395|Prabowo Subianto|Gerindra|1|dem|ASEAN,BRICS|car5,gas3,pet2,cob3,oro3,caf3,tri2
PH|115|470|150|Ferdinand Marcos Jr.|Partido Federal de Filipinas|1|dem|ASEAN|cob1,oro2
MM|54.5|65|150|Min Aung Hlaing|Junta militar (USDP)|2|mil|ASEAN|gas2,tie3,cob1
KH|17|47|124|Hun Manet|Partido Popular de Camboya|1|aut|ASEAN|
LA|7.7|16|29|Thongloun Sisoulith|Partido Popular Revolucionario|-2|com|ASEAN|cob1
BN|0.45|15|7|Hassanal Bolkiah|Sultanato|1|mon|ASEAN|pet2,gas2
TL|1.4|2|2|Xanana Gusmão|CNRT|-1|dem|ASEAN|pet1
AU|26.8|1800|58|Anthony Albanese|Partido Laborista|-1|dem||hie5,car5,lit5,oro4,gas4,ura4,tie3,tri3,cob2
NZ|5.2|260|9|Christopher Luxon|Partido Nacional|1|dem||
PG|10.5|32|4|James Marape|Pangu Pati|0|dem||oro2,gas2,cob2
FJ|0.93|6|4|Sitiveni Rabuka|Alianza Popular|0|dem||oro1
SB|0.75|1.7|0|Jeremiah Manele|Partido OUR|0|dem||
VU|0.33|1.2|0|Jotham Napat|Partido de Líderes|0|dem||
WS|0.22|1.1|0|La'auli Leuatea Schmidt|FAST|0|dem||
TO|0.1|0.5|0.5|Lord Fakafanua|Independiente|1|dem||
KI|0.13|0.3|0|Taneti Maamau|Tobwaan Kiribati|0|dem||
FM|0.11|0.5|0|Wesley Simina|Independiente|0|dem||
MH|0.04|0.3|0|Hilda Heine|Independiente|0|dem||
PW|0.018|0.3|0|Surangel Whipps Jr.|Independiente|0|dem||
NR|0.012|0.15|0|David Adeang|Independiente|0|dem||
TV|0.011|0.06|0|Feleti Teo|Independiente|0|dem||
DZ|46|265|139|Abdelmadjid Tebboune|FLN|0|aut|LA,UA|gas4,pet3,hie1
EG|113|380|439|Abdelfatah El-Sisi|Futuro de la Nación|1|aut|LA,UA,BRICS|gas2,pet2,oro1,tri2
LY|7|48|32|Abdul Hamid Dbeibah|Gobierno de Unidad Nacional|0|hib|LA,UA|pet4,gas1
TN|12.3|53|36|Kais Saied|Independiente|0|aut|LA,UA|
MA|37.5|155|196|Mohamed VI|Monarquía alauí|1|mon|LA,UA|cob1
SD|49|30|100|Abdel Fattah al-Burhan|Consejo Soberano (militar)|1|mil|LA,UA|oro3,pet1
SS|11.5|5|53|Salva Kiir|SPLM|0|aut|UA|pet2
ET|128|160|162|Abiy Ahmed|Partido de la Prosperidad|0|hib|UA,BRICS|caf4,oro1
ER|3.7|2.6|120|Isaías Afewerki|PFDJ|-2|aut|UA|oro1,cob1
DJ|1.1|4.3|10|Ismaïl Omar Guelleh|RPP|0|aut|UA,LA|
SO|18.5|13|15|Hassan Sheikh Mohamud|Unión por la Paz y el Desarrollo|0|hib|UA,LA|
KE|56|125|24|William Ruto|UDA|1|dem|UA|caf2
UG|49|58|45|Yoweri Museveni|NRM|1|aut|UA|caf3,oro1,pet1
TZ|68|85|27|Samia Suluhu Hassan|CCM|-1|aut|UA|oro3,caf1,gas1
RW|14|14|33|Paul Kagame|Frente Patriótico Ruandés|1|aut|UA|caf1
BI|13.5|4|30|Évariste Ndayishimiye|CNDD-FDD|0|aut|UA|caf1
CD|105|72|134|Félix Tshisekedi|UDPS|-1|hib|UA|cob5,oro2,lit2,tie1,ura1
CG|6.2|15|10|Denis Sassou-Nguesso|PCT|-1|aut|UA|pet2
GA|2.5|21|5|Brice Oligui Nguema|Unión Democrática de Constructores|1|aut|UA|pet2,hie1
GQ|1.7|12|1.5|Teodoro Obiang|PDGE|1|aut|UA|pet2,gas1
CM|29|53|25|Paul Biya|RDPC|1|aut|UA|pet1,caf1
CF|5.8|2.8|9|Faustin-Archange Touadéra|MCU|0|aut|UA|oro1,ura1
TD|18.5|18|33|Mahamat Déby|MPS|1|aut|UA|pet2
NE|27|19|33|Abdourahamane Tchiani|Junta militar (CNSP)|1|mil|UA|ura4,oro1,pet1
NG|227|250|230|Bola Tinubu|APC|0|dem|UA|pet4,gas4
BJ|13.7|21|12|Romuald Wadagni|UPR-BR|1|hib|UA|
TG|9|9.5|9|Faure Gnassingbé|UNIR|1|aut|UA|
GH|34|82|16|John Mahama|NDC|-1|dem|UA|oro4,pet1,caf1
CI|29|87|22|Alassane Ouattara|RHDP|1|hib|UA|caf3,oro2,pet1
BF|23|21|12|Ibrahim Traoré|Junta militar (MPSR)|-1|mil|UA|oro3
ML|23|21|21|Assimi Goïta|Junta militar|0|mil|UA|oro3,lit1
SN|18|33|17|Bassirou Diomaye Faye|PASTEF|-1|dem|UA|gas1,pet1,oro1
GM|2.7|2.5|4|Adama Barrow|NPP|0|dem|UA|
GW|2.1|2.1|4|Horta Inta-A|Junta militar|0|mil|UA|
GN|14|25|12|Mamady Doumbouya|GMD|1|aut|UA|hie2,oro2
SL|8.8|7|9|Julius Maada Bio|SLPP|-1|dem|UA|hie1,oro1
LR|5.4|4.8|2|Joseph Boakai|Partido de la Unidad|0|dem|UA|hie1,oro1
MR|4.9|11|16|Mohamed Ould Ghazouani|El Insaf|1|aut|UA,LA|hie2,oro1,gas1
CV|0.6|2.8|1|Ulisses Correia e Silva|MpD|1|dem|UA|
ST|0.23|0.8|0.3|Américo Ramos|ADI|0|dem|UA|
AO|36.7|115|107|João Lourenço|MPLA|-1|aut|UA|pet4,oro1
ZM|20.5|28|15|Hakainde Hichilema|UPND|1|dem|UA|cob4
ZW|16.5|36|29|Emmerson Mnangagwa|ZANU-PF|-1|aut|UA|lit3,oro2,car1
MW|21|11|11|Peter Mutharika|DPP|1|dem|UA|ura1
MZ|34|23|11|Daniel Chapo|FRELIMO|-1|aut|UA|gas3,car2
BW|2.7|20|9|Duma Boko|UDC|-1|dem|UA|cob1
NA|2.6|13|10|Netumbo Nandi-Ndaitwah|SWAPO|-1|dem|UA|ura4,oro1,lit1
ZA|63|410|72|Cyril Ramaphosa|ANC|-1|dem|UA,BRICS|oro4,car4,hie3,ura1,tie1
LS|2.3|2.4|2|Sam Matekane|Revolución por la Prosperidad|1|dem|UA|
SZ|1.2|5|3|Mswati III|Monarquía absoluta|1|mon|UA|
MG|31|18|13|Michael Randrianirina|Junta militar (CAPSAT)|0|mil|UA|tie1
MU|1.3|16|0|Navin Ramgoolam|Partido Laborista|-1|dem|UA|
SC|0.1|2.2|0.4|Patrick Herminie|Seychelles Unidas|-1|dem|UA|
KM|0.87|1.5|0.5|Azali Assoumani|CRC|0|aut|UA,LA|`;

  D.NUKES = ['US', 'RU', 'CN', 'FR', 'GB', 'IN', 'PK', 'KP', 'IL'];
  const STAB = { HT: 15, SD: 14, SS: 18, YE: 18, SY: 30, LY: 28, MM: 22, SO: 20, AF: 35, ML: 30, BF: 28, NE: 35, CD: 32, VE: 35, UA: 50, LB: 32, IQ: 42, PK: 40, ET: 38, NG: 42, CF: 22, TD: 35, GW: 30, MG: 35, PS: 25, KP: 55, IR: 40, CU: 42, BO: 45, PE: 38, EC: 42, CO: 48, MZ: 38, CM: 40, BD: 42, NP: 42, KE: 48, ZW: 40, BY: 55, RU: 58, CN: 72 };
  // Personalidad de IA (0-1). Lo no listado se deriva del régimen + ruido con semilla.
  D.PERSONALITY = {
    RU: { agres: .85, expan: .85 }, KP: { agres: .8, expan: .3 }, CN: { agres: .55, expan: .7 }, US: { agres: .6, expan: .35 },
    IL: { agres: .5, expan: .1 }, IR: { agres: .65, expan: .4 }, TR: { agres: .6, expan: .55 }, AZ: { agres: .7, expan: .7 },
    RW: { agres: .65, expan: .6 }, VE: { agres: .5, expan: .5 }, ER: { agres: .7, expan: .4 }, ET: { agres: .55, expan: .5 },
    PK: { agres: .55, expan: .3 }, RS: { agres: .5, expan: .5 }, IN: { agres: .4, expan: .3 }, SA: { agres: .45, expan: .3 },
    CH: { agres: .02, expan: 0 }, CR: { agres: .02, expan: 0 }, JP: { agres: .15, expan: .05 }, DE: { agres: .12, expan: .05 },
    CA: { agres: .12, expan: .05 }, MX: { agres: .12, expan: .05 }, BR: { agres: .15, expan: .1 }, VA: { agres: 0, expan: 0 }
  };

  // Relaciones iniciales entre pares (se suman a la afinidad por bloque/región/ideología)
  D.PAIRS = [['US', 'IR', -70], ['US', 'KP', -70], ['US', 'RU', -45], ['US', 'CN', -35], ['US', 'CU', -45], ['US', 'VE', -30], ['US', 'NI', -40],
  ['RU', 'UA', -90], ['RU', 'GB', -50], ['RU', 'PL', -55], ['RU', 'EE', -50], ['RU', 'LV', -50], ['RU', 'LT', -50], ['RU', 'DE', -35], ['RU', 'FR', -35],
  ['RU', 'FI', -45], ['RU', 'SE', -40], ['RU', 'NO', -35], ['RU', 'CZ', -40], ['RU', 'RO', -40], ['RU', 'GE', -35], ['RU', 'MD', -40], ['RU', 'JP', -25],
  ['RU', 'BY', 45], ['RU', 'CN', 35], ['RU', 'KP', 35], ['RU', 'IR', 30], ['RU', 'IN', 25], ['RU', 'RS', 30], ['RU', 'CU', 30], ['RU', 'VE', 30], ['RU', 'NI', 25],
  ['RU', 'ML', 30], ['RU', 'BF', 30], ['RU', 'NE', 25], ['RU', 'HU', 5], ['RU', 'KZ', 10],
  ['CN', 'TW', -75], ['CN', 'JP', -35], ['CN', 'IN', -35], ['CN', 'PH', -35], ['CN', 'AU', -20], ['CN', 'VN', -15], ['CN', 'PK', 45], ['CN', 'KP', 35],
  ['IN', 'PK', -75], ['IN', 'BD', -10], ['IN', 'JP', 20], ['IN', 'US', 15], ['KR', 'KP', -80], ['JP', 'KP', -65], ['KR', 'JP', 5],
  ['IL', 'IR', -90], ['IL', 'PS', -80], ['IL', 'SY', -50], ['IL', 'LB', -50], ['IL', 'US', 55], ['SA', 'IR', -45], ['SA', 'YE', -30], ['AE', 'IR', -25],
  ['AE', 'SA', 20], ['PK', 'SA', 30], ['EG', 'SA', 25], ['JO', 'SA', 20], ['AM', 'AZ', -60], ['TR', 'GR', -30], ['TR', 'AM', -40], ['TR', 'AZ', 45], ['TR', 'CY', -45],
  ['RS', 'XK', -70], ['MA', 'DZ', -55], ['ET', 'ER', -45], ['ET', 'EG', -35], ['SD', 'SS', -30], ['CD', 'RW', -60], ['VE', 'GY', -50], ['VE', 'CO', -20], ['VE', 'CU', 40],
  ['US', 'JP', 45], ['US', 'KR', 45], ['US', 'AU', 45], ['US', 'GB', 25], ['US', 'TW', 40], ['US', 'PH', 35], ['US', 'SA', 25], ['US', 'MX', 10], ['US', 'CA', 15],
  ['GB', 'AU', 35], ['GB', 'CA', 30], ['AU', 'NZ', 45], ['MX', 'ES', 15], ['ES', 'PT', 20], ['FR', 'DE', 15], ['BR', 'AR', 5],
  ['UA', 'PL', 40], ['UA', 'GB', 40], ['UA', 'US', 20], ['UA', 'DE', 30], ['UA', 'BY', -50], ['AF', 'PK', -35], ['TH', 'KH', -45],
  ['DZ', 'FR', -25], ['ML', 'FR', -45], ['BF', 'FR', -45], ['NE', 'FR', -45], ['EG', 'SD', 15], ['IR', 'IQ', 15], ['SY', 'TR', 15]];
  D.TREATIES0 = [['def', 'US', 'JP'], ['def', 'US', 'KR'], ['def', 'US', 'AU'], ['def', 'US', 'PH'], ['def', 'AU', 'NZ'], ['def', 'CN', 'KP'], ['def', 'PK', 'SA'],
  ['ali', 'US', 'IL'], ['ali', 'RU', 'KP'], ['ali', 'CN', 'PK'], ['com', 'US', 'MX'], ['com', 'US', 'CA'], ['com', 'MX', 'CA'], ['com', 'CN', 'RU'], ['com', 'CN', 'AU'],
  ['com', 'JP', 'AU'], ['com', 'CN', 'BR'], ['com', 'IN', 'AE'], ['com', 'GB', 'AU'], ['com', 'CL', 'CN'], ['com', 'KR', 'US'], ['com', 'JP', 'US'], ['com', 'CN', 'SA'], ['com', 'IN', 'RU']];
  D.WARS0 = [['RU', 'UA']];
  D.SANC0 = [['US', 'RU'], ['GB', 'RU'], ['DE', 'RU'], ['FR', 'RU'], ['JP', 'RU'], ['CA', 'RU'], ['US', 'IR'], ['US', 'KP'], ['US', 'CU']];

  /* ---- PARTIDOS (congreso del jugador): [nombre, ideología, % escaños, 1 = coalición de gobierno] ----
     Países no listados usan un congreso genérico construido alrededor del partido gobernante real. */
  D.PARTIES = {
    US: [['Partido Republicano', 2, 51, 1], ['Partido Demócrata', -1, 48], ['Independientes', 0, 1]],
    MX: [['Morena', -1, 50, 1], ['PVEM', 0, 13, 1], ['PT', -2, 9, 1], ['PAN', 2, 14], ['PRI', 0, 8], ['Movimiento Ciudadano', -1, 6]],
    BR: [['PT', -1, 14, 1], ['PL', 2, 19], ['União Brasil', 1, 12], ['PP', 1, 10], ['MDB', 0, 9, 1], ['PSD', 0, 9, 1], ['Republicanos', 1, 8], ['PSB', -1, 4, 1], ['PSOL', -2, 3, 1], ['Otros', 0, 12]],
    DE: [['CDU/CSU', 1, 33, 1], ['SPD', -1, 19, 1], ['AfD', 2, 24], ['Los Verdes', -1, 14], ['Die Linke', -2, 10]],
    IN: [['BJP', 2, 44, 1], ['Congreso (INC)', -1, 18], ['Samajwadi', -1, 7], ['AITC', -1, 5], ['DMK', -1, 4], ['TDP', 0, 3, 1], ['JD(U)', 0, 2, 1], ['Otros', 0, 17]],
    RU: [['Rusia Unida', 2, 72, 1], ['Partido Comunista (PCFR)', -2, 13], ['LDPR', 2, 5], ['Rusia Justa', -1, 6], ['Gente Nueva', 0, 4]],
    CN: [['Partido Comunista de China', -2, 72, 1], ['Partidos del Frente Unido', -1, 28, 1]],
    CA: [['Partido Liberal', -1, 49, 1], ['Partido Conservador', 1, 42], ['Bloc Québécois', -1, 6], ['NDP', -2, 2], ['Verdes', -1, 1]],
    GB: [['Partido Laborista', -1, 63, 1], ['Partido Conservador', 1, 19], ['Liberal Demócratas', 0, 11], ['Reform UK', 2, 1], ['SNP', -1, 1], ['Otros', 0, 5]],
    FR: [['Ensemble (Renacimiento)', 0, 28, 1], ['Agrupación Nacional', 2, 25], ['Nuevo Frente Popular', -2, 33], ['Los Republicanos', 1, 8, 1], ['Otros', 0, 6]],
    ES: [['PSOE', -1, 35, 1], ['PP', 1, 39], ['Vox', 2, 9], ['Sumar', -2, 8, 1], ['ERC', -1, 2, 1], ['Junts', 1, 2], ['EH Bildu', -2, 2, 1], ['PNV', 0, 1, 1], ['Otros', 0, 2]],
    IT: [['Hermanos de Italia', 2, 30, 1], ['Partido Democrático', -1, 18], ['Movimiento 5 Estrellas', -1, 13], ['Lega', 2, 16, 1], ['Forza Italia', 1, 11, 1], ['Otros', 0, 12]],
    AR: [['La Libertad Avanza', 2, 37, 1], ['Unión por la Patria', -1, 38], ['PRO', 1, 9, 1], ['UCR', 0, 5], ['Otros', 0, 11]],
    CL: [['Partido Republicano', 2, 22, 1], ['Chile Vamos', 1, 18, 1], ['Nacional Libertario', 2, 5, 1], ['Unidad por Chile', -1, 40], ['Partido de la Gente', 0, 9], ['Otros', 0, 6]],
    CO: [['Pacto Histórico', -2, 20, 1], ['Partido Liberal', 0, 17], ['Partido Conservador', 1, 14], ['Centro Democrático', 2, 9], ['Cambio Radical', 1, 9], ['Alianza Verde', -1, 8, 1], ['Partido de la U', 0, 8], ['Otros', 0, 15]],
    PE: [['Somos Perú', 0, 8, 1], ['Fuerza Popular', 2, 18], ['Alianza para el Progreso', 1, 12, 1], ['Perú Libre', -2, 10], ['Renovación Popular', 2, 8], ['Acción Popular', 0, 8], ['Otros', 0, 36]],
    VE: [['PSUV', -2, 90, 1], ['Oposición', 1, 10]],
    EC: [['ADN', 1, 44, 1], ['Revolución Ciudadana', -2, 44], ['Pachakutik', -1, 6], ['PSC', 1, 3], ['Otros', 0, 3]],
    GT: [['Movimiento Semilla', -1, 14, 1], ['Vamos', 1, 24], ['UNE', 0, 17], ['Cabal', 0, 11], ['Otros', 0, 34]],
    JP: [['PLD', 2, 42, 1], ['Ishin', 1, 8, 1], ['Partido Democrático Constitucional', -1, 32], ['DPP', 0, 6], ['Komeito', 0, 5], ['Otros', 0, 7]],
    KR: [['Partido Democrático', -1, 57, 1], ['Poder Popular', 1, 36], ['Reconstrucción de Corea', -1, 4], ['Otros', 0, 3]],
    AU: [['Partido Laborista', -1, 62, 1], ['Coalición Liberal-Nacional', 1, 29], ['Verdes', -2, 1], ['Independientes', 0, 8]],
    TR: [['AKP', 2, 45, 1], ['CHP', -1, 23], ['MHP', 2, 8, 1], ['DEM', -2, 9], ['İYİ', 1, 5], ['Otros', 0, 10]],
    ZA: [['ANC', -1, 40, 1], ['Alianza Democrática', 1, 22, 1], ['MK', -2, 14], ['EFF', -2, 10], ['IFP', 1, 4, 1], ['Otros', 0, 10]],
    NG: [['APC', 0, 55, 1], ['PDP', 0, 30], ['Partido Laborista', -1, 9], ['Otros', 0, 6]],
    PL: [['Coalición Cívica', 0, 34, 1], ['Ley y Justicia (PiS)', 2, 42], ['Tercera Vía', 0, 14, 1], ['Lewica', -1, 6, 1], ['Konfederacja', 2, 4]],
    UA: [['Servidor del Pueblo', 0, 56, 1], ['Solidaridad Europea', 1, 6], ['Batkivshchyna', 0, 6], ['Otros', 0, 32]],
    IL: [['Likud', 2, 27, 1], ['Yesh Atid', 0, 20], ['Sionismo Religioso', 2, 12, 1], ['Shas', 1, 9, 1], ['Unidad Nacional', 1, 7], ['Judaísmo Unido de la Torá', 1, 6, 1], ['Otros', 0, 19]],
    ID: [['Gerindra', 1, 15, 1], ['PDI-P', -1, 19], ['Golkar', 1, 18, 1], ['PKB', 0, 12, 1], ['NasDem', 0, 12, 1], ['Otros', 0, 24, 1]],
    PT: [['AD (PSD/CDS)', 1, 40, 1], ['Chega', 2, 26], ['Partido Socialista', -1, 25], ['Iniciativa Liberal', 1, 4], ['Otros', -1, 5]],
    NL: [['D66', 0, 17, 1], ['PVV', 2, 17], ['VVD', 1, 15, 1], ['GroenLinks-PvdA', -1, 13], ['CDA', 0, 12, 1], ['JA21', 2, 6], ['Otros', 0, 20]]
  };

  /* ---- SUBDIVISIONES con partido gobernante (Fase 1: 7 países). Formato "Nombre:Partido" ---- */
  const SUBS = {
    US: 'Alabama:R,Alaska:R,Arizona:D,Arkansas:R,California:D,Colorado:D,Connecticut:D,Delaware:D,Florida:R,Georgia:R,Hawái:D,Idaho:R,Illinois:D,Indiana:R,Iowa:R,Kansas:D,Kentucky:D,Luisiana:R,Maine:D,Maryland:D,Massachusetts:D,Míchigan:D,Minnesota:D,Misisipi:R,Misuri:R,Montana:R,Nebraska:R,Nevada:R,Nuevo Hampshire:R,Nueva Jersey:D,Nuevo México:D,Nueva York:D,Carolina del Norte:D,Dakota del Norte:R,Ohio:R,Oklahoma:R,Oregón:D,Pensilvania:D,Rhode Island:D,Carolina del Sur:R,Dakota del Sur:R,Tennessee:R,Texas:R,Utah:R,Vermont:R,Virginia:D,Washington:D,Virginia Occidental:R,Wisconsin:D,Wyoming:R',
    MX: 'Ciudad de México:Morena,Aguascalientes:PAN,Baja California:Morena,Baja California Sur:Morena,Campeche:Morena,Chiapas:Morena,Chihuahua:PAN,Coahuila:PRI,Colima:Morena,Durango:PRI,Guanajuato:PAN,Guerrero:Morena,Hidalgo:Morena,Jalisco:MC,Estado de México:Morena,Michoacán:Morena,Morelos:Morena,Nayarit:Morena,Nuevo León:MC,Oaxaca:Morena,Puebla:Morena,Querétaro:PAN,Quintana Roo:Morena,San Luis Potosí:PVEM,Sinaloa:Morena,Sonora:Morena,Tabasco:Morena,Tamaulipas:Morena,Tlaxcala:Morena,Veracruz:Morena,Yucatán:Morena,Zacatecas:Morena',
    BR: 'Distrito Federal:MDB,Acre:PP,Alagoas:MDB,Amapá:Solidariedade,Amazonas:União,Bahía:PT,Ceará:PT,Espírito Santo:PSB,Goiás:União,Maranhão:PSB,Mato Grosso:União,Mato Grosso del Sur:PP,Minas Gerais:Novo,Pará:MDB,Paraíba:PSB,Paraná:PSD,Pernambuco:PSD,Piauí:PT,Río de Janeiro:PL,Río Grande del Norte:PT,Río Grande del Sur:PSD,Rondonia:União,Roraima:PP,Santa Catarina:PL,São Paulo:Republicanos,Sergipe:PSD,Tocantins:Republicanos',
    DE: 'Berlín:CDU,Baden-Wurtemberg:Verdes,Baviera:CSU,Brandeburgo:SPD,Bremen:SPD,Hamburgo:SPD,Hesse:CDU,Mecklemburgo-Pomerania:SPD,Baja Sajonia:SPD,Renania del Norte-Westfalia:CDU,Renania-Palatinado:SPD,Sarre:SPD,Sajonia:CDU,Sajonia-Anhalt:CDU,Schleswig-Holstein:CDU,Turingia:CDU',
    IN: 'Delhi:BJP,Andhra Pradesh:TDP,Arunachal Pradesh:BJP,Assam:BJP,Bihar:JD(U),Chhattisgarh:BJP,Goa:BJP,Guyarat:BJP,Haryana:BJP,Himachal Pradesh:INC,Jharkhand:JMM,Karnataka:INC,Kerala:CPI(M),Madhya Pradesh:BJP,Maharashtra:BJP,Manipur:BJP,Meghalaya:NPP,Mizoram:ZPM,Nagaland:NDPP,Odisha:BJP,Punyab:AAP,Rajastán:BJP,Sikkim:SKM,Tamil Nadu:DMK,Telangana:INC,Tripura:BJP,Uttar Pradesh:BJP,Uttarakhand:BJP,Bengala Occidental:AITC',
    RU: 'Moscú:RU,San Petersburgo:RU,Óblast de Moscú:RU,Tartaristán:RU,Baskortostán:RU,Chechenia:RU,Daguestán:RU,Krasnodar:RU,Rostov:RU,Volgogrado:RU,Samara:RU,Nizhni Nóvgorod:RU,Sverdlovsk:RU,Cheliábinsk:RU,Tiumén:RU,Novosibirsk:RU,Omsk:RU,Krasnoyarsk:RU,Irkutsk:RU,Yakutia:RU,Jabárovsk:RU,Primorie:RU,Sajalín:RU,Kaliningrado:RU,Múrmansk:RU,Smolensk:RU,Jakasia:PCFR,Oriol:PCFR,Uliánovsk:PCFR,Chuvasia:RJ',
    CN: 'Pekín:PCCh,Tianjin:PCCh,Hebei:PCCh,Shanxi:PCCh,Mongolia Interior:PCCh,Liaoning:PCCh,Jilin:PCCh,Heilongjiang:PCCh,Shanghái:PCCh,Jiangsu:PCCh,Zhejiang:PCCh,Anhui:PCCh,Fujian:PCCh,Jiangxi:PCCh,Shandong:PCCh,Henan:PCCh,Hubei:PCCh,Hunan:PCCh,Cantón:PCCh,Guangxi:PCCh,Hainan:PCCh,Chongqing:PCCh,Sichuan:PCCh,Guizhou:PCCh,Yunnan:PCCh,Tíbet:PCCh,Shaanxi:PCCh,Gansu:PCCh,Qinghai:PCCh,Ningxia:PCCh,Xinjiang:PCCh'
  };
  // Partido local que cuenta como "oficialismo" (el del jugador) en cada país con subdivisiones
  D.SUB_RULING = { US: 'R', MX: 'Morena', BR: 'PT', DE: 'CDU', IN: 'BJP', RU: 'RU', CN: 'PCCh' };
  D.SUBS = {};
  for (const k in SUBS) D.SUBS[k] = SUBS[k].split(',').map(s => { const [n, p] = s.split(':'); return { n, p }; });
  D.TERR_NAMES = ['Capital', 'Norte', 'Sur', 'Este', 'Oeste', 'Centro', 'Noreste', 'Noroeste', 'Sureste', 'Suroeste', 'Litoral', 'Altiplano'];

  /* ---- SECTORES POBLACIONALES: w = peso electoral base ---- */
  D.SECTORS = {
    obr: { n: 'Obreros', w: .20 }, emp: { n: 'Empresarios', w: .08 }, jov: { n: 'Jóvenes', w: .16 }, rel: { n: 'Religiosos', w: .12 },
    rur: { n: 'Rurales', w: .12 }, mil: { n: 'Militares', w: .04 }, med: { n: 'Clase media', w: .18 }, jub: { n: 'Jubilados', w: .10 }
  };

  /* ---- ÁRBOL DE PERSONALIDAD: rama, nivel (el nivel N exige el N-1 de la misma rama) ----
     m = modificadores permanentes; start = cambios al empezar. Cada rasgo da y quita. */
  D.TRAIT_POINTS = 4;
  D.BRANCHES = { car: 'Carisma', dip: 'Diplomacia', pod: 'Poder', int: 'Intelecto', som: 'Sombra' };
  D.TRAITS = [
    { id: 'carismatico', b: 'car', t: 1, n: 'Carismático', pro: 'Los sectores te quieren antes: +20% a toda mejora de afinidad, +3 pts en elecciones', con: '−3% de recaudación: las cuentas te aburren', m: { secGain: .2, elect: 3, income: -.03 } },
    { id: 'populista', b: 'car', t: 2, n: 'Populista', pro: '+4 pts en elecciones; obreros y rurales empiezan +10', con: 'Empresarios empiezan −12', m: { elect: 4 }, start: { sec: { obr: 10, rur: 10, emp: -12 } } },
    { id: 'idolo', b: 'car', t: 3, n: 'Ídolo de masas', pro: 'Escándalos a la mitad, +1 capital político por turno', con: '−0.05 pp de crecimiento por turno: gobiernas para la tribuna', m: { scandal: -.5, cp: 1, growth: -.05 } },
    { id: 'diplomatico', b: 'dip', t: 1, n: 'Diplomático', pro: '+25% a mejoras de relación, +8 a que acepten tus tratados', con: '−8% de fuerza militar', m: { relGain: .25, treatyAcc: 8, atk: -.08 } },
    { id: 'negociador', b: 'dip', t: 2, n: 'Negociador', pro: '+25% de ingresos por comercio; te prestan ayuda más fácil', con: '+10% al costo de unidades', m: { tradeInc: .25, aid: 12, unitCost: .1 } },
    { id: 'pacifista', b: 'dip', t: 3, n: 'Pacifista', pro: 'Estabilidad +0.2/turno y reputación pacífica creciente', con: '−15% de fuerza militar; militares empiezan −10', m: { stabT: .2, repPazT: 1, atk: -.15 }, start: { sec: { mil: -10 } } },
    { id: 'belicista', b: 'pod', t: 1, n: 'Belicista', pro: '+15% de fuerza militar, unidades 15% más baratas; militares +10', con: '−20% a mejoras de relación', m: { atk: .15, unitCost: -.15, relGain: -.2 }, start: { sec: { mil: 10 } } },
    { id: 'estratega', b: 'pod', t: 2, n: 'Estratega', pro: '−25% de bajas y +5% de fuerza', con: '−3% de recaudación', m: { casual: -.25, atk: .05, income: -.03 } },
    { id: 'autoritario', b: 'pod', t: 3, n: 'Mano de hierro', pro: 'Puedes gobernar por decreto; +15% de votos en el congreso; estabilidad +0.15/turno', con: 'Reputación democrática −20; jóvenes −10', m: { lawVote: .15, decree: 1, stabT: .15 }, start: { rep: { dem: -20 }, sec: { jov: -10 } } },
    { id: 'tecnocrata', b: 'int', t: 1, n: 'Tecnócrata', pro: '+0.08 pp de crecimiento por turno, +6% de recaudación', con: '−15% a mejoras de afinidad: no conectas', m: { growth: .08, income: .06, secGain: -.15 } },
    { id: 'economista', b: 'int', t: 2, n: 'Economista', pro: 'Dividendos +50%, comercio +10%, sin comisiones en bolsa', con: '−2 pts en elecciones', m: { divid: .5, tradeInc: .1, fee: 1, elect: -2 } },
    { id: 'visionario', b: 'int', t: 3, n: 'Visionario', pro: '+0.08 pp de crecimiento y +1 capital político por turno', con: '−3 pts en elecciones: pocos entienden el plan', m: { growth: .08, cp: 1, elect: -3 } },
    { id: 'corrupto', b: 'som', t: 1, n: 'Corrupto', pro: 'Fondos reservados: +0.12% del PIB por turno; comprar votos cuesta la mitad', con: 'Escándalos +80% más probables; confianza mundial −10', m: { graft: 1, bribe: .5, scandal: .8 }, start: { rep: { conf: -10 } } },
    { id: 'intrigante', b: 'som', t: 2, n: 'Intrigante', pro: 'Ves las consecuencias ocultas de cada decisión; traicionar cuesta 40% menos', con: '−10% a mejoras de relación', m: { spy: 1, betray: -.4, relGain: -.1 } },
    { id: 'titiritero', b: 'som', t: 3, n: 'Titiritero', pro: '+10% de votos en el congreso, +1 capital político por turno', con: 'Escándalos +40%; −5 a que acepten tus tratados', m: { lawVote: .1, cp: 1, scandal: .4, treatyAcc: -5 } }
  ];

  /* ---- UNIDADES Y BASES. cost/up en miles de M$ (se escalan por nivel de costos del país) ---- */
  D.CATS = { tierra: 'Tierra', aire: 'Aire', mar: 'Mar' };
  D.UNITS = {
    inf: { n: 'Infantería', cat: 'tierra', pow: 1, cost: .15, up: .012, men: 5000, res: {} },
    tan: { n: 'Blindados', cat: 'tierra', pow: 3, cost: .5, up: .03, men: 600, res: { hie: 1, pet: 1 } },
    art: { n: 'Artillería', cat: 'tierra', pow: 2, cost: .3, up: .018, men: 500, res: { hie: 1 } },
    caz: { n: 'Cazas', cat: 'aire', pow: 5, cost: 1.2, up: .07, men: 150, res: { tie: 1, pet: 1 } },
    bom: { n: 'Bombarderos', cat: 'aire', pow: 8, cost: 2.5, up: .12, men: 200, res: { tie: 1, pet: 2 } },
    dro: { n: 'Drones', cat: 'aire', pow: 2.5, cost: .35, up: .015, men: 50, res: { tie: 1 } },
    fra: { n: 'Fragatas', cat: 'mar', pow: 5, cost: 1.4, up: .06, men: 250, res: { hie: 2 } },
    sub: { n: 'Submarinos', cat: 'mar', pow: 9, cost: 3, up: .1, men: 120, res: { hie: 2, ura: 1 } },
    por: { n: 'Portaaviones', cat: 'mar', pow: 40, cost: 13, up: .5, men: 5000, res: { hie: 8, ura: 2, pet: 3 } }
  };
  D.BASES = {
    cuartel: { n: 'Cuartel', cat: 'tierra', cost: 2, up: .05, cap: 8 },
    aerea: { n: 'Base aérea', cat: 'aire', cost: 5, up: .12, cap: 3 },
    naval: { n: 'Base naval', cat: 'mar', cost: 6, up: .15, cap: 2 }
  };

  /* ---- LEYES ----
     eco: -2 izquierda … 2 derecha · auth: -1 libertades … 1 control · maj: mayoría necesaria
     sec: afinidad por sector (golpe inmediato + nueva línea base) · rep: reputación
     per: efectos permanentes mientras siga vigente:
       cost (% PIB/año), tax (pp de presión fiscal), grow (pp/turno), stab (estabilidad objetivo),
       trade (% ingresos de comercio), prodMul (% producción de materias primas), mil (% fuerza), oilSave, cap, elect
     grp: leyes del mismo grupo se excluyen entre sí. once: efecto inmediato extra (fx). */
  D.LAWCATS = { edu: 'Educación', eco: 'Economía', imp: 'Impuestos', rel: 'Religión', com: 'Comercio', ext: 'Comercio exterior', net: 'Internet', vj: 'Videojuegos', sal: 'Salud', seg: 'Seguridad', mil: 'Defensa', soc: 'Sociedad' };
  D.LAWS = [
    { id: 'edu_publica', cat: 'edu', n: 'Educación pública universal', d: 'Escuela y universidad gratuitas.', eco: -1, sec: { jov: 8, obr: 5, med: 4, emp: -3 }, per: { cost: .25, grow: .12 } },
    { id: 'becas_tec', cat: 'edu', n: 'Becas tecnológicas', d: 'Formación masiva en ciencia e ingeniería.', eco: 0, sec: { jov: 6, emp: 4 }, per: { cost: .12, grow: .1 } },
    { id: 'edu_religiosa', cat: 'edu', n: 'Educación religiosa en las aulas', d: 'La fe vuelve al plan de estudios.', eco: 1, auth: .5, grp: 'edurel', sec: { rel: 12, jov: -8, med: -2 }, rep: { dem: -3 } },
    { id: 'edu_laica', cat: 'edu', n: 'Aulas estrictamente laicas', d: 'Ningún credo dentro de la escuela pública.', eco: -1, grp: 'edurel', sec: { rel: -10, jov: 5, med: 3 } },
    { id: 'salario_min', cat: 'eco', n: 'Aumento del salario mínimo', d: 'Sube el piso salarial un 20%.', eco: -1, sec: { obr: 12, jov: 3, emp: -8 }, per: { grow: -.04 } },
    { id: 'privatizar', cat: 'eco', n: 'Privatización de empresas estatales', d: 'Venta de activos públicos: caja inmediata.', eco: 2, grp: 'prop', sec: { emp: 12, obr: -10 }, per: { grow: .06 }, once: [['$g', 3]] },
    { id: 'nacionalizar', cat: 'eco', n: 'Nacionalización de recursos estratégicos', d: 'El subsuelo es de la nación.', eco: -2, grp: 'prop', sec: { emp: -14, obr: 8, rur: 3 }, per: { prodMul: .25 }, once: [['stockHome', .8], ['relAll', -4, 'Nacionalizaste inversiones', 'rich']] },
    { id: 'renta_basica', cat: 'eco', n: 'Renta básica universal', d: 'Un ingreso mensual para todos.', eco: -2, sec: { obr: 10, jov: 8, jub: 5, emp: -8 }, per: { cost: .6, stab: 4 } },
    { id: 'desregular', cat: 'eco', n: 'Desregulación de mercados', d: 'Menos trámites, menos controles.', eco: 2, sec: { emp: 10, obr: -6 }, per: { grow: .12, stab: -2 } },
    { id: 'imp_fortunas', cat: 'imp', n: 'Impuesto a las grandes fortunas', d: 'Que pague más quien más tiene.', eco: -2, grp: 'imp', sec: { emp: -14, obr: 7, med: 2 }, per: { tax: 2.5, grow: -.05 } },
    { id: 'imp_recorte', cat: 'imp', n: 'Recorte general de impuestos', d: 'Menos carga para familias y empresas.', eco: 2, grp: 'imp', sec: { emp: 10, med: 8, obr: 2 }, per: { tax: -3, grow: .1 } },
    { id: 'iva', cat: 'imp', n: 'Aumento del IVA', d: 'Dos puntos más al consumo.', eco: 0, sec: { obr: -7, med: -6, jub: -5 }, per: { tax: 2 } },
    { id: 'lib_culto', cat: 'rel', n: 'Ley de libertad de culto', d: 'El Estado garantiza todas las creencias.', eco: 0, auth: -.5, grp: 'relig', sec: { rel: 3, jov: 3 }, rep: { dem: 5 } },
    { id: 'rel_oficial', cat: 'rel', n: 'Religión oficial del Estado', d: 'Una fe, un Estado.', eco: 1, auth: 1, grp: 'relig', sec: { rel: 15, jov: -10, med: -4 }, rep: { dem: -10 } },
    { id: 'pymes', cat: 'com', n: 'Apoyo a pequeñas empresas', d: 'Crédito blando y menos papeleo.', eco: 0, sec: { emp: 6, med: 6 }, per: { cost: .1, grow: .06 } },
    { id: 'antimonopolio', cat: 'com', n: 'Ley antimonopolio', d: 'Se trocean los gigantes del mercado.', eco: -1, sec: { emp: -7, med: 5, obr: 3 }, per: { grow: .03 } },
    { id: 'libre_comercio', cat: 'ext', n: 'Apertura comercial total', d: 'Aranceles a cero.', eco: 2, grp: 'arancel', sec: { emp: 8, rur: -8, obr: -5 }, per: { trade: .3, grow: .08 } },
    { id: 'proteccionismo', cat: 'ext', n: 'Aranceles proteccionistas', d: 'Primero lo hecho en casa.', eco: -1, grp: 'arancel', sec: { rur: 8, obr: 7, emp: -5 }, per: { trade: -.3, grow: -.04 }, once: [['relAll', -5, 'Subiste los aranceles', 'trade']] },
    { id: 'net_libre', cat: 'net', n: 'Internet libre y neutral', d: 'Sin bloqueos ni carriles rápidos.', eco: 0, auth: -1, grp: 'net', sec: { jov: 10, med: 3 }, rep: { dem: 6 } },
    { id: 'net_control', cat: 'net', n: 'Control estatal de internet', d: 'Filtros, registro de usuarios y apagones selectivos.', eco: 0, auth: 1, grp: 'net', sec: { jov: -15, med: -4 }, rep: { dem: -15 }, per: { stab: 5 } },
    { id: 'banda_ancha', cat: 'net', n: 'Plan nacional de banda ancha', d: 'Fibra hasta el último pueblo.', eco: -1, sec: { rur: 8, jov: 5 }, per: { cost: .15, grow: .08 } },
    { id: 'vj_industria', cat: 'vj', n: 'Incentivos a la industria del videojuego', d: 'Estudios locales con ventajas fiscales.', eco: 1, grp: 'vj', sec: { jov: 9, emp: 3 }, per: { cost: .05, grow: .04 } },
    { id: 'vj_restriccion', cat: 'vj', n: 'Restricción de videojuegos a menores', d: 'Horarios límite y verificación de edad.', eco: 0, auth: .5, grp: 'vj', sec: { jov: -12, rel: 6, jub: 4 } },
    { id: 'esports', cat: 'vj', n: 'E-sports como deporte nacional', d: 'Liga oficial y becas para jugadores.', eco: 0, sec: { jov: 7, jub: -2 }, per: { cost: .02 } },
    { id: 'salud_universal', cat: 'sal', n: 'Sanidad universal', d: 'Cobertura pública para toda la población.', eco: -2, grp: 'salud', sec: { obr: 10, jub: 12, rur: 6, emp: -5 }, per: { cost: .5, stab: 4 } },
    { id: 'salud_privada', cat: 'sal', n: 'Privatización de la sanidad', d: 'El seguro privado sustituye al hospital público.', eco: 2, grp: 'salud', sec: { emp: 8, jub: -12, obr: -8 }, per: { cost: -.25 } },
    { id: 'vacunas', cat: 'sal', n: 'Campaña nacional de vacunación', d: 'Prevención masiva y reservas sanitarias.', eco: 0, sec: { jub: 5, med: 3 }, per: { cost: .08 } },
    { id: 'mano_dura', cat: 'seg', n: 'Mano dura contra el crimen', d: 'Más penas, más cárceles, más patrullas.', eco: 1, auth: 1, grp: 'seg', sec: { med: 6, jub: 6, jov: -6 }, rep: { dem: -5 }, per: { stab: 6 } },
    { id: 'policia_comunitaria', cat: 'seg', n: 'Policía comunitaria', d: 'Prevención y cercanía con los barrios.', eco: -1, auth: -.5, grp: 'seg', sec: { jov: 4, med: 3 }, per: { cost: .1, stab: 3 } },
    { id: 'vigilancia', cat: 'seg', n: 'Vigilancia masiva', d: 'Cámaras, datos y escuchas sin orden judicial.', eco: 0, auth: 1, sec: { jov: -8 }, rep: { dem: -10 }, per: { stab: 4 } },
    { id: 'servicio_militar', cat: 'mil', n: 'Servicio militar obligatorio', d: 'Un año de filas para todos.', eco: 0, auth: .5, sec: { mil: 10, jov: -12 }, per: { mil: .05, cap: .5 } },
    { id: 'gasto_defensa', cat: 'mil', n: 'Aumento del gasto en defensa', d: 'Más presupuesto para las fuerzas armadas.', eco: 1, sec: { mil: 12, emp: 3, jov: -3 }, per: { cost: .3, mil: .1 } },
    { id: 'edad_jubilacion', cat: 'soc', n: 'Subir la edad de jubilación', d: 'Tres años más de trabajo.', eco: 1, sec: { jub: -15, obr: -8, emp: 6 }, per: { cost: -.3 } },
    { id: 'reforma_agraria', cat: 'soc', n: 'Reforma agraria', d: 'Tierra para quien la trabaja.', eco: -2, sec: { rur: 14, emp: -8 }, per: { grow: .03 } },
    { id: 'transicion_verde', cat: 'soc', n: 'Transición energética verde', d: 'Renovables y fin gradual del petróleo.', eco: -1, sec: { jov: 9, emp: -4, rur: -2 }, rep: { gen: 5 }, per: { cost: .3, oilSave: .25 } },
    { id: 'fronteras_abiertas', cat: 'soc', n: 'Fronteras abiertas a la migración', d: 'Visados ágiles y regularización.', eco: 0, auth: -1, grp: 'mig', sec: { emp: 5, jov: 3, obr: -6, rur: -5 }, per: { grow: .08 } },
    { id: 'fronteras_cerradas', cat: 'soc', n: 'Cierre de fronteras', d: 'Cupos mínimos y deportaciones.', eco: 1, auth: 1, grp: 'mig', sec: { obr: 5, rur: 5, emp: -5, jov: -3 }, rep: { gen: -5 }, per: { grow: -.04 } },
    { id: 'prensa_libre', cat: 'soc', n: 'Ley de libertad de prensa', d: 'Blindaje legal a periodistas y fuentes.', eco: 0, auth: -1, grp: 'prensa', sec: { jov: 4, med: 4 }, rep: { dem: 10 }, per: { scandal: .3 } },
    { id: 'reeleccion', cat: 'soc', n: 'Reelección indefinida', d: 'Reforma constitucional: sin límite de mandatos.', eco: 0, auth: 1, maj: .66, sec: { jov: -5, med: -5, obr: -2 }, rep: { dem: -25 }, per: { elect: 6, stab: -4 } }
  ];

  /* ---- EMPRESAS REALES (bolsa simulada, precios aproximados en $) ---- */
  D.STOCK_SECTORS = { tec: 'Tecnología', ene: 'Energía', def: 'Defensa', far: 'Farmacéutica', aut: 'Automotriz', fin: 'Finanzas', min: 'Minería', con: 'Consumo', log: 'Logística' };
  D.COMPANIES = [
    ['AAPL', 'Apple', 'US', 'tec', 230, .5], ['MSFT', 'Microsoft', 'US', 'tec', 480, .7], ['NVDA', 'NVIDIA', 'US', 'tec', 180, .1], ['TSLA', 'Tesla', 'US', 'aut', 400, 0],
    ['LMT', 'Lockheed Martin', 'US', 'def', 480, 2.7], ['PFE', 'Pfizer', 'US', 'far', 26, 6], ['JPM', 'JPMorgan Chase', 'US', 'fin', 300, 1.8], ['ARAMCO', 'Saudi Aramco', 'SA', 'ene', 7, 5.5],
    ['TSM', 'TSMC', 'TW', 'tec', 290, 1.2], ['SSNG', 'Samsung Electronics', 'KR', 'tec', 60, 2], ['TM', 'Toyota', 'JP', 'aut', 200, 2.8], ['VOW', 'Volkswagen', 'DE', 'aut', 110, 5],
    ['RHM', 'Rheinmetall', 'DE', 'def', 1800, .5], ['NESN', 'Nestlé', 'CH', 'con', 95, 3.5], ['LVMH', 'LVMH', 'FR', 'con', 620, 2], ['SHEL', 'Shell', 'GB', 'ene', 36, 4],
    ['PBR', 'Petrobras', 'BR', 'ene', 12, 9], ['VALE', 'Vale', 'BR', 'min', 11, 7], ['AMX', 'América Móvil', 'MX', 'tec', 20, 2.5], ['FEMSA', 'FEMSA', 'MX', 'con', 95, 2],
    ['TCEHY', 'Tencent', 'CN', 'tec', 80, .8], ['BABA', 'Alibaba', 'CN', 'tec', 160, 1], ['RIL', 'Reliance Industries', 'IN', 'ene', 17, .4], ['BHP', 'BHP', 'AU', 'min', 28, 5],
    ['GAZP', 'Gazprom', 'RU', 'ene', 2, 0], ['MAERSK', 'Maersk', 'DK', 'log', 2000, 4]
  ].map(a => ({ id: a[0], n: a[1], home: a[2], sec: a[3], p: a[4], y: a[5] }));

  /* ---- EVENTOS DEL MUNDO (titulares con efecto, sin decisión) ----
     {X} = país elegido según x: 'any' | 'prod:pet' (productor) | 'unstable' */
  D.WORLD_EVENTS = [
    { t: 'La OPEP recorta producción: el petróleo se dispara', w: 5, fx: [['price', 'pet', 1.22], ['stock', 'ene', 1.08]] },
    { t: 'Sobreoferta de crudo hunde los precios', w: 4, fx: [['price', 'pet', .82], ['stock', 'ene', .92]] },
    { t: 'Boom de la inteligencia artificial impulsa a las tecnológicas', w: 5, fx: [['stock', 'tec', 1.12], ['price', 'tie', 1.1]] },
    { t: 'Pinchazo tecnológico: Wall Street cierra en rojo', w: 4, fx: [['stock', 'tec', .86], ['sent', -.03]] },
    { t: 'Sequía histórica arruina cosechas en medio mundo', w: 4, fx: [['price', 'tri', 1.3], ['price', 'caf', 1.15]] },
    { t: 'Cosecha récord abarata los alimentos', w: 3, fx: [['price', 'tri', .85]] },
    { t: 'Huelga minera en {X} sacude el mercado del cobre', w: 3, x: 'prod:cob', fx: [['price', 'cob', 1.2], ['cstab', -3]] },
    { t: 'Nuevo yacimiento gigante de litio en {X}', w: 3, x: 'prod:lit', fx: [['price', 'lit', .82], ['cgdp', 1.5]] },
    { t: 'Fiebre del coche eléctrico: el litio toca máximos', w: 3, fx: [['price', 'lit', 1.25], ['stock', 'aut', 1.06]] },
    { t: 'Los inversores huyen al oro ante la incertidumbre', w: 4, fx: [['price', 'oro', 1.12], ['sent', -.02]] },
    { t: 'Terremoto devastador en {X}', w: 4, x: 'any', fx: [['cstab', -8], ['cgdp', -2]] },
    { t: 'Inundaciones históricas en {X}', w: 4, x: 'any', fx: [['cstab', -5], ['cgdp', -1]] },
    { t: 'Protestas masivas paralizan {X}', w: 5, x: 'unstable', fx: [['cstab', -9]] },
    { t: 'Milagro económico en {X}: crecimiento récord', w: 3, x: 'any', fx: [['cgdp', 2.5], ['cstab', 4]] },
    { t: 'Crisis bancaria regional: se contrae el crédito', w: 3, fx: [['stock', 'fin', .85], ['sent', -.04]] },
    { t: 'Bloqueo en una ruta marítima clave encarece los fletes', w: 3, fx: [['stock', 'log', 1.15], ['price', 'pet', 1.08], ['price', 'gas', 1.1]] },
    { t: 'Ola de frío dispara el precio del gas', w: 3, fx: [['price', 'gas', 1.28]] },
    { t: 'Avance médico histórico eleva a las farmacéuticas', w: 3, fx: [['stock', 'far', 1.15]] },
    { t: 'Carrera armamentista: los fabricantes de armas baten récords', w: 3, fx: [['stock', 'def', 1.12], ['price', 'ura', 1.1]] },
    { t: 'Renace la energía nuclear: el uranio escasea', w: 3, fx: [['price', 'ura', 1.22]] },
    { t: 'China restringe la exportación de tierras raras', w: 3, fx: [['price', 'tie', 1.3], ['stock', 'tec', .95]] },
    { t: 'Euforia bursátil: las bolsas marcan máximos', w: 4, fx: [['stock', 'all', 1.06], ['sent', .03]] }
  ];

  /* ---- EVENTOS INTERACTIVOS DEL JUGADOR ----
     if: condiciones declarativas · tgt: cómo se elige el país {T} · opts: 2-4 decisiones
     fx = consecuencias visibles · hid = consecuencias ocultas (solo las ve un Intrigante)
     Vocabulario fx: ['$',B] ['$g',%PIB] ['stab',n] ['cp',n] ['sec',id|'all',n] ['rep',eje,n] ['rel','T',n,motivo]
       ['grow',pp,turnos] ['price',mat,mult] ['stock',sector,mult] ['prod',mat,niveles] ['units',cat,%]
       ['flag',nombre] ['later',turnos,prob,fx,titular] ['chance',prob,fxSi,fxNo] ['relAll',n,motivo,filtro] ['over',motivo] */
  D.EVENTS = [
    { id: 'crisis_fin', w: 5, if: { turnGte: 4, once: 1 }, t: 'Crisis financiera global', x: 'Los bancos caen en cadena y el crédito se congela. Tu ministro de Hacienda espera instrucciones antes de que abran los mercados.', pre: [['stock', 'all', .8], ['sent', -.06]],
      opts: [{ t: 'Rescatar a la banca', fx: [['$g', -2], ['sec', 'emp', 8], ['sec', 'obr', -8], ['stab', 3]] },
      { t: 'Austeridad: recortar el gasto', fx: [['sec', 'all', -5], ['stab', -5], ['grow', -.3, 3]], hid: [['later', 4, 1, [['grow', .25, 6]], 'La austeridad empieza a dar frutos: vuelve la inversión']] },
      { t: 'Imprimir dinero', fx: [['$g', 2], ['sec', 'obr', 3]], hid: [['later', 3, .8, [['sec', 'all', -7], ['stab', -6], ['grow', -.3, 4]], 'La inflación se desboca tras la emisión masiva de dinero']] }] },
    { id: 'desastre', w: 6, t: 'Catástrofe natural', x: 'Un terremoto arrasa una de tus regiones. Hay miles de damnificados y las cámaras del mundo apuntan hacia ti.',
      opts: [{ t: 'Emergencia nacional: todo el presupuesto necesario', fx: [['$g', -1.2], ['sec', 'all', 5], ['stab', 3]] },
      { t: 'Pedir ayuda internacional', fx: [['$g', .5], ['sec', 'mil', -3], ['rep', 'gen', -2]], hid: [['relAll', 2, 'Aceptaste su ayuda humanitaria', 'friends']] },
      { t: 'Minimizar los daños ante la prensa', fx: [['$g', -.2], ['sec', 'rur', -6]], hid: [['later', 2, .7, [['sec', 'all', -8], ['stab', -6]], 'Se filtra el abandono de las víctimas del terremoto']] }] },
    { id: 'escandalo', w: 6, scandal: 1, t: 'Escándalo de corrupción', x: 'Un ministro de tu círculo cercano aparece en una trama de sobornos. La prensa tiene los documentos.',
      opts: [{ t: 'Destituirlo y colaborar con la justicia', fx: [['cp', -2], ['sec', 'med', 4], ['rep', 'conf', 3]] },
      { t: 'Encubrirlo', fx: [['cp', 1]], hid: [['chance', .55, [['later', 2, 1, [['sec', 'all', -10], ['stab', -8], ['rep', 'conf', -8], ['flag', 'scandal']], 'El encubrimiento sale a la luz: piden tu renuncia']], [['sec', 'emp', 2]]]] },
      { t: 'Culpar a la prensa de una campaña sucia', fx: [['rep', 'dem', -6], ['sec', 'jov', -5], ['sec', 'rur', 3]] }] },
    { id: 'pandemia', w: 3, if: { turnGte: 6, once: 1 }, t: 'Pandemia', x: 'Un virus respiratorio desconocido se extiende por tres continentes. Tus epidemiólogos piden actuar ya.', pre: [['stock', 'far', 1.25], ['stock', 'log', .85], ['price', 'pet', .8]],
      opts: [{ t: 'Confinamiento total', fx: [['grow', -.8, 3], ['sec', 'jub', 8], ['sec', 'emp', -10], ['stab', 2]] },
      { t: 'Medidas moderadas', fx: [['grow', -.3, 3], ['sec', 'all', -2]] },
      { t: 'Seguir como si nada', fx: [['sec', 'emp', 6]], hid: [['later', 2, .75, [['sec', 'all', -9], ['sec', 'jub', -10], ['stab', -10]], 'Los hospitales colapsan: el país te culpa por no actuar']] }] },
    { id: 'yacimiento', w: 4, if: { once: 1 }, t: 'Descubrimiento de un yacimiento', x: 'Geólogos estatales confirman una reserva enorme de litio bajo suelo público.',
      opts: [{ t: 'Explotación 100% estatal', fx: [['prod', 'lit', 2], ['sec', 'obr', 6], ['sec', 'emp', -6], ['$g', -.5]] },
      { t: 'Concesión a una multinacional', fx: [['prod', 'lit', 1], ['$g', 1.5], ['sec', 'emp', 6], ['sec', 'rur', -5]] },
      { t: 'Declarar la zona reserva ecológica', fx: [['sec', 'jov', 9], ['sec', 'emp', -4], ['rep', 'gen', 4]] }] },
    { id: 'golpe', w: 30, if: { any: [{ stabLt: 30 }, { secLt: ['mil', 28] }], cool: 6 }, t: 'Ruido de sables', x: 'Inteligencia detecta a un grupo de generales preparando tu derrocamiento. Tienes horas.',
      opts: [{ t: 'Purgar a la cúpula militar', fx: [['units', 'tierra', -10], ['sec', 'mil', -8], ['rep', 'dem', -6], ['stab', 6]] },
      { t: 'Comprar su lealtad', fx: [['$g', -1], ['sec', 'mil', 15], ['rep', 'conf', -2]] },
      { t: 'Llamar al pueblo a las calles', fx: [['chanceAppr', [['stab', 12], ['sec', 'all', 4], ['rep', 'dem', 5]], [['over', 'golpe']]]] }] },
    { id: 'huelga', w: 12, if: { secLt: ['obr', 36], cool: 5 }, t: 'Huelga general', x: 'Los sindicatos paralizan puertos, fábricas y transporte. Cada día cuesta una fortuna.',
      opts: [{ t: 'Ceder a sus demandas', fx: [['$g', -.8], ['sec', 'obr', 14], ['sec', 'emp', -6]] },
      { t: 'Reprimir y declarar ilegal la huelga', fx: [['sec', 'obr', -10], ['sec', 'jov', -6], ['stab', -6], ['rep', 'dem', -8], ['sec', 'emp', 5]] },
      { t: 'Sentarte a negociar en persona', fx: [['cp', -3], ['sec', 'obr', 6], ['grow', -.1, 1]] }] },
    { id: 'cumbre', w: 6, t: 'Cumbre internacional', x: 'Te invitan a una cumbre de jefes de Estado. {T} estará en la mesa principal.', tgt: 'rival',
      opts: [{ t: 'Asistir y tender puentes', fx: [['$', -.3], ['relAll', 4, 'Tu papel en la cumbre', 'big'], ['rep', 'paz', 3]] },
      { t: 'Usar el podio para denunciar a {T}', fx: [['rel', 'T', -15, 'Lo denunciaste en la cumbre'], ['relAll', 5, 'Denunciaste a su rival', 'enemiesOfT'], ['sec', 'mil', 3]] },
      { t: 'No asistir', fx: [['relAll', -2, 'Faltaste a la cumbre', 'big'], ['cp', 1]] }] },
    { id: 'refugiados', w: 8, if: { neighborTrouble: 1, cool: 6 }, t: 'Crisis de refugiados', x: 'Decenas de miles de personas huyen de {T} y se agolpan en tu frontera.', tgt: 'troubledNeighbor',
      opts: [{ t: 'Abrir la frontera y acogerlos', fx: [['$g', -.4], ['rep', 'gen', 8], ['sec', 'rur', -6], ['sec', 'jov', 3], ['rel', 'T', 6, 'Acogiste a sus refugiados']] },
      { t: 'Cerrar la frontera', fx: [['rep', 'gen', -8], ['sec', 'rur', 5], ['rel', 'T', -6, 'Cerraste la frontera a los suyos']] },
      { t: 'Exigir fondos a la ONU antes de decidir', fx: [['cp', -1], ['chance', .5, [['$g', .3], ['rep', 'gen', 2]], [['rep', 'gen', -3], ['sec', 'all', -2]]]] }] },
    { id: 'ciberataque', w: 7, if: { rival: 1 }, t: 'Ciberataque', x: 'Un ataque informático tumba tu red eléctrica durante horas. Las huellas apuntan a {T}.', tgt: 'rival',
      opts: [{ t: 'Represalia cibernética', fx: [['rel', 'T', -12, 'Guerra cibernética'], ['sec', 'mil', 4]], hid: [['chance', .3, [['$g', -.6], ['stab', -3]], []]] },
      { t: 'Denunciarlo ante la ONU', fx: [['rel', 'T', -6, 'Lo acusaste ante la ONU'], ['rep', 'paz', 3]] },
      { t: 'Callar y blindar las redes', fx: [['$g', -.3], ['sec', 'mil', -3]] }] },
    { id: 'asilo', w: 5, t: 'Un líder caído pide asilo', x: 'El expresidente de {T}, derrocado y perseguido, aterriza sin permiso en tu capital y solicita protección.', tgt: 'any',
      opts: [{ t: 'Concederle asilo', fx: [['rel', 'T', -12, 'Diste asilo a su enemigo'], ['rep', 'gen', 5], ['rep', 'dem', 2]] },
      { t: 'Negárselo', fx: [['rep', 'gen', -3]] },
      { t: 'Entregarlo al nuevo gobierno', fx: [['rel', 'T', 15, 'Entregaste al prófugo'], ['rep', 'conf', -5], ['sec', 'jov', -3]] }] },
    { id: 'soborno', w: 7, t: 'Una oferta discreta', x: 'Un consorcio extranjero ofrece una "donación" a cambio de un contrato de infraestructura sin licitación.',
      opts: [{ t: 'Aceptar', fx: [['$g', .8]], hid: [['chance', .5, [['later', 3, 1, [['sec', 'all', -8], ['rep', 'conf', -6], ['flag', 'scandal']], 'Estalla el caso de la licitación amañada']], []]] },
      { t: 'Rechazar con cortesía', fx: [['sec', 'emp', -2]] },
      { t: 'Denunciarlo públicamente', fx: [['sec', 'med', 5], ['sec', 'emp', -5], ['rep', 'conf', 4]] }] },
    { id: 'estudiantes', w: 12, if: { secLt: ['jov', 36], cool: 5 }, t: 'Protestas estudiantiles', x: 'Las universidades están tomadas y las marchas crecen cada noche.',
      opts: [{ t: 'Dialogar y prometer reformas', fx: [['cp', -2], ['sec', 'jov', 10]] },
      { t: 'Desalojar por la fuerza', fx: [['sec', 'jov', -10], ['sec', 'jub', 3], ['stab', -4], ['rep', 'dem', -7]] },
      { t: 'Esperar a que se cansen', fx: [['stab', -3]], hid: [['chance', .5, [['sec', 'jov', 4]], [['stab', -6], ['sec', 'med', -4]]]] }] },
    { id: 'avance', w: 5, t: 'Avance científico nacional', x: 'Un laboratorio público logra un salto en baterías de nueva generación.',
      opts: [{ t: 'Invertir para liderar el sector', fx: [['$g', -.6], ['grow', .25, 8], ['sec', 'jov', 4]] },
      { t: 'Vender la patente al mejor postor', fx: [['$g', 1.2], ['sec', 'jov', -3]] },
      { t: 'Clasificarlo para uso militar', fx: [['units', 'aire', 8], ['sec', 'mil', 6], ['sec', 'emp', -3]] }] },
    { id: 'frontera', w: 8, if: { rival: 1, cool: 5 }, t: 'Incidente fronterizo', x: 'Una patrulla de {T} abre fuego contra tus soldados. Hay bajas en ambos lados.', tgt: 'rival',
      opts: [{ t: 'Movilizar tropas a la zona', fx: [['rel', 'T', -12, 'Movilizaste tropas tras el incidente'], ['sec', 'mil', 6], ['$g', -.2], ['rep', 'paz', -4]] },
      { t: 'Enviar diplomáticos', fx: [['rel', 'T', 5, 'Calmaste el incidente fronterizo'], ['sec', 'mil', -6], ['rep', 'paz', 4]] },
      { t: 'Exigir una disculpa pública', fx: [['chance', .45, [['rel', 'T', 3, 'Se disculpó por el incidente'], ['sec', 'all', 3]], [['rel', 'T', -8, 'Ignoró tu exigencia'], ['sec', 'mil', -3]]]] }] },
    { id: 'clero', w: 9, if: { secLt: ['rel', 38], cool: 6 }, t: 'El púlpito contra el palacio', x: 'Los principales líderes religiosos llaman a "corregir el rumbo moral" de tu gobierno.',
      opts: [{ t: 'Reunirte con ellos y ceder en algo', fx: [['sec', 'rel', 10], ['sec', 'jov', -4]] },
      { t: 'Recordarles la separación Iglesia-Estado', fx: [['sec', 'rel', -6], ['sec', 'jov', 5], ['sec', 'med', 2]] },
      { t: 'Ignorarlos', fx: [['sec', 'rel', -3], ['stab', -2]] }] },
    { id: 'deuda', w: 30, if: { debt: 1, cool: 4 }, t: 'Crisis de deuda', x: 'Los acreedores exigen garantías. Sin un plan creíble, nadie te prestará un dólar más.',
      opts: [{ t: 'Aceptar el plan del FMI', fx: [['$g', 6], ['sec', 'all', -8], ['stab', -5], ['grow', -.2, 4]] },
      { t: 'Declarar la moratoria', fx: [['$g', 10], ['relAll', -8, 'No pagaste tu deuda', 'rich'], ['rep', 'conf', -15], ['stock', 'home', .7], ['grow', -.4, 4]] },
      { t: 'Vender reservas estratégicas', fx: [['$g', 4], ['sellRes', .7], ['sec', 'mil', -4]] }] },
    { id: 'sequia', w: 6, t: 'Sequía', x: 'Meses sin lluvia. Las cosechas se pierden y el precio del pan sube cada semana.', pre: [['price', 'tri', 1.15]],
      opts: [{ t: 'Subsidios de emergencia al campo', fx: [['$g', -.5], ['sec', 'rur', 10]] },
      { t: 'Importar grano masivamente', fx: [['$g', -.3], ['sec', 'obr', 4], ['sec', 'rur', -4]] },
      { t: 'Racionamiento', fx: [['sec', 'all', -4], ['stab', -3]] }] },
    { id: 'videojuego', w: 5, t: 'Polémica por un videojuego', x: 'Un videojuego hecho en tu país arrasa en ventas mundiales... y escandaliza a medio parlamento por su violencia.',
      opts: [{ t: 'Presumirlo como orgullo nacional', fx: [['sec', 'jov', 8], ['sec', 'rel', -5], ['grow', .05, 4]] },
      { t: 'Prohibir su venta', fx: [['sec', 'jov', -10], ['sec', 'rel', 6], ['sec', 'jub', 3], ['rep', 'dem', -3]] },
      { t: 'No opinar', fx: [['sec', 'jov', 1]] }] },
    { id: 'filtracion', w: 5, if: { ally: 1 }, t: 'Filtración incómoda', x: 'Documentos filtrados prueban que tus servicios espiaban al gobierno de {T}, tu aliado.', tgt: 'ally',
      opts: [{ t: 'Disculparte personalmente', fx: [['rel', 'T', -6, 'Lo espiaste, pero te disculpaste'], ['sec', 'mil', -3], ['rep', 'conf', 2]] },
      { t: 'Negarlo todo', fx: [['rel', 'T', -14, 'Lo espiaste y lo negaste'], ['rep', 'conf', -6]] },
      { t: 'Culpar a un mando intermedio', fx: [['rel', 'T', -9, 'Espionaje entre aliados'], ['sec', 'mil', -6]] }] },
    { id: 'fuga', w: 8, if: { secLt: ['emp', 34], cool: 6 }, t: 'Fuga de capitales', x: 'Las grandes fortunas sacan su dinero del país. La moneda cae cada mañana.',
      opts: [{ t: 'Control de capitales', fx: [['sec', 'emp', -8], ['stock', 'home', .85], ['rep', 'dem', -3], ['stab', 2]] },
      { t: 'Amnistía fiscal para que vuelvan', fx: [['$g', .8], ['sec', 'emp', 10], ['sec', 'obr', -7]] },
      { t: 'Subir los tipos de interés', fx: [['grow', -.25, 3], ['sec', 'emp', 4], ['sec', 'med', -4]] }] }
  ];

  // Nombres para líderes generados (golpes, elecciones de la IA)
  D.NAMES = {
    AMN: [['James', 'Sarah', 'Michael', 'Emily', 'Robert', 'Laura'], ['Whitfield', 'Harlan', 'Brooks', 'Delacroix', 'Mercer', 'Calloway', 'Tremblay']],
    AMC: [['Carlos', 'María', 'Rafael', 'Lucía', 'Héctor', 'Ana'], ['Montenegro', 'Arriaga', 'Solís', 'Barrios', 'Quintanilla', 'Pineda', 'Zelaya']],
    AMS: [['Mateo', 'Valentina', 'Joaquín', 'Camila', 'Thiago', 'Renata'], ['Arismendi', 'Cárdenas', 'Bustamante', 'Ferreira', 'Otero', 'Salvatierra', 'Lacerda']],
    EUR: [['Lukas', 'Sofia', 'Pierre', 'Anna', 'Marco', 'Elena', 'Jan'], ['Lindqvist', 'Moreau', 'Kowalczyk', 'Bianchi', 'Novák', 'Hartmann', 'Petrenko', 'Van Daal']],
    MOR: [['Omar', 'Layla', 'Khalid', 'Yasmin', 'Tariq', 'Nadia'], ['al-Masri', 'Haddad', 'Demir', 'Rahmani', 'al-Tamimi', 'Sabbagh', 'Karimi']],
    AFR: [['Kwame', 'Amina', 'Sékou', 'Fatou', 'Tendai', 'Ngozi'], ['Okonkwo', 'Diallo', 'Mensah', 'Kamara', 'Mwangi', 'Nkosi', 'Traoré', 'Abebe']],
    ASI: [['Wei', 'Mei', 'Arjun', 'Priya', 'Hiroshi', 'Minh', 'Aigul'], ['Tanaka', 'Zhang', 'Sharma', 'Nguyen', 'Park', 'Rahman', 'Suzuki', 'Bekov']],
    OCE: [['Jack', 'Mia', 'Tane', 'Aroha', 'Sione', 'Leilani'], ['Fletcher', 'Tuilagi', 'Ngata', 'Wardle', 'Kalani', 'Morrison']]
  };
  D.GEN_PARTIES = { '-2': ['Frente Popular', 'Movimiento Socialista'], '-1': ['Alianza Progresista', 'Partido Socialdemócrata'], '0': ['Unión de Centro', 'Coalición Cívica'], '1': ['Partido Liberal', 'Alianza Republicana'], '2': ['Frente Nacional', 'Movimiento Patriótico'] };

  /* ---- Fusión con los metadatos geográficos generados en el build (WL.META) ---- */
  D.C = {};
  const META = WL.META || {};
  ROWS.trim().split('\n').forEach(line => {
    const [iso, pop, gdp, mil, lider, partido, ideo, reg, blocs, rec] = line.split('|');
    const m = META[iso] || { n: iso, cap: '', reg: 'EUR', lat: 0, lon: 0, area: 1000, land: false, bord: [], px: 0, idx: 0 };
    const recursos = {};
    (rec || '').split(',').filter(Boolean).forEach(r => { recursos[r.slice(0, 3)] = +r.slice(3); });
    const gpc = gdp / pop;
    const base = { dem: 62, hib: 50, aut: 52, com: 62, mon: 62, mil: 34, teo: 45 }[reg];
    D.C[iso] = {
      iso, n: m.n, cap: m.cap, region: m.reg, lat: m.lat, lon: m.lon, area: m.area, land: m.land, bord: m.bord, px: m.px, idx: m.idx,
      pop: +pop, gdp: +gdp, mil: +mil, lider: { n: lider, verificado: false }, partido, ideo: +ideo, reg,
      blocs: blocs ? blocs.split(',') : [], rec: recursos, nuke: D.NUKES.includes(iso),
      stab: STAB[iso] || Math.round(base + Math.max(-12, Math.min(14, (gpc - 10) / 2)))
    };
  });
})();
