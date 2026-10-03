'use strict';
/* Pelotazo · base de datos: ligas y clubes (nombres reales, temporada 2025-26) y nombres para generar jugadores.
   Los jugadores son inventados. Los colores son aproximados y los escudos los sube el usuario en el editor.
   Formato de cada club: 'Nombre|ABR|reputación|camiseta|pantalón|2ª camiseta|Estadio' (colores en hexadecimal). */
const LIGAS_BASE = [
  { id: 'esp', nombre: 'LaLiga', pais: 'España', nac: 'ES', riqueza: 1.3, clubes: [
    'Real Madrid|RMA|95|f5f5f5|f5f5f5|1c2c5b|Santiago Bernabéu', 'FC Barcelona|BAR|93|a50044|004d98|f5d000|Camp Nou',
    'Atlético de Madrid|ATM|88|cb3524|1c2c5b|f5f5f5|Metropolitano', 'Athletic Club|ATH|81|ee2523|111111|f5f5f5|San Mamés',
    'Villarreal|VIL|81|ffe667|005187|0b1f4a|Estadio de la Cerámica', 'Real Betis|BET|79|00954c|f5f5f5|222222|Benito Villamarín',
    'Real Sociedad|RSO|79|0067b1|f5f5f5|f6d200|Anoeta', 'Sevilla|SEV|77|f5f5f5|f5f5f5|d4011d|Ramón Sánchez-Pizjuán',
    'Valencia|VAL|76|f5f5f5|111111|ff7f00|Mestalla', 'Girona|GIR|75|cd2534|f5f5f5|222222|Montilivi',
    'Celta de Vigo|CEL|74|8ac3ee|f5f5f5|e2002a|Balaídos', 'Osasuna|OSA|73|d91a21|0a346f|f5f5f5|El Sadar',
    'Rayo Vallecano|RAY|72|f5f5f5|f5f5f5|e53027|Estadio de Vallecas', 'Mallorca|MLL|72|e20613|111111|f5f5f5|Son Moix',
    'Getafe|GET|72|005999|005999|f5f5f5|Coliseum', 'Espanyol|ESP|72|007fc8|f5f5f5|222222|RCDE Stadium',
    'Alavés|ALA|70|0761af|f5f5f5|222222|Mendizorroza', 'Elche|ELC|68|f5f5f5|f5f5f5|05642c|Martínez Valero',
    'Levante|LEV|68|b4053f|004d98|f5f5f5|Ciutat de València', 'Real Oviedo|OVI|67|0047ab|f5f5f5|f5f5f5|Carlos Tartiere',
  ] },
  { id: 'ing', nombre: 'Premier League', pais: 'Inglaterra', nac: 'EN', riqueza: 1.8, clubes: [
    'Manchester City|MCI|93|6cabdd|f5f5f5|1c2c5b|Etihad Stadium', 'Liverpool|LIV|92|c8102e|c8102e|f5f5f5|Anfield',
    'Arsenal|ARS|90|ef0107|f5f5f5|1c2c5b|Emirates Stadium', 'Chelsea|CHE|88|034694|034694|f5f5f5|Stamford Bridge',
    'Manchester United|MUN|85|da291c|f5f5f5|111111|Old Trafford', 'Newcastle United|NEW|84|241f20|111111|f5f5f5|St James\' Park',
    'Tottenham Hotspur|TOT|84|f5f5f5|132257|132257|Tottenham Hotspur Stadium', 'Aston Villa|AVL|83|670e36|f5f5f5|95bfe5|Villa Park',
    'Brighton & Hove Albion|BHA|79|0057b8|f5f5f5|222222|Amex Stadium', 'Nottingham Forest|NFO|79|dd0000|f5f5f5|f5f5f5|City Ground',
    'Crystal Palace|CRY|78|1b458f|1b458f|f5f5f5|Selhurst Park', 'West Ham United|WHU|77|7a263a|f5f5f5|1bb1e7|London Stadium',
    'Bournemouth|BOU|76|da291c|111111|f5f5f5|Vitality Stadium', 'Brentford|BRE|76|e30613|111111|f5f5f5|Gtech Community Stadium',
    'Everton|EVE|76|003399|f5f5f5|f5f5f5|Hill Dickinson Stadium', 'Fulham|FUL|76|f5f5f5|111111|111111|Craven Cottage',
    'Wolverhampton Wanderers|WOL|74|fdb913|231f20|f5f5f5|Molineux', 'Leeds United|LEE|72|f5f5f5|f5f5f5|1d428a|Elland Road',
    'Burnley|BUR|70|6c1d45|f5f5f5|99d6ea|Turf Moor', 'Sunderland|SUN|70|eb172b|111111|f5f5f5|Stadium of Light',
  ] },
  { id: 'fra', nombre: 'Ligue 1', pais: 'Francia', nac: 'FR', riqueza: 1.0, clubes: [
    'Paris Saint-Germain|PSG|93|004170|004170|f5f5f5|Parc des Princes', 'Olympique de Marseille|OM|82|f5f5f5|f5f5f5|2faee0|Vélodrome',
    'AS Monaco|ASM|81|e51b22|f5f5f5|111111|Stade Louis II', 'Lille OSC|LIL|80|e01e13|1d2b5f|f5f5f5|Pierre-Mauroy',
    'Olympique Lyonnais|OL|80|f5f5f5|f5f5f5|1d3c87|Groupama Stadium', 'RC Lens|LEN|78|ffd700|111111|f5f5f5|Bollaert-Delelis',
    'OGC Nice|NIC|77|c8102e|111111|f5f5f5|Allianz Riviera', 'RC Strasbourg|STR|76|009fe3|f5f5f5|111111|Stade de la Meinau',
    'Stade Rennais|REN|76|e2001a|111111|f5f5f5|Roazhon Park', 'Stade Brestois|SB29|72|e30613|f5f5f5|f5f5f5|Francis-Le Blé',
    'Toulouse FC|TFC|72|6c3e98|f5f5f5|f5f5f5|Stadium de Toulouse', 'FC Nantes|NAN|71|fcd405|00843d|f5f5f5|La Beaujoire',
    'AJ Auxerre|AJA|69|f5f5f5|f5f5f5|0d3880|Abbé-Deschamps', 'Paris FC|PFC|69|1b2b5c|f5f5f5|f5f5f5|Stade Jean-Bouin',
    'Angers SCO|SCO|68|222222|f5f5f5|f5f5f5|Raymond-Kopa', 'Le Havre AC|HAC|67|7ab3e0|1b2b5c|f5f5f5|Stade Océane',
    'FC Lorient|FCL|67|f58220|111111|f5f5f5|Stade du Moustoir', 'FC Metz|MET|66|7b1131|f5f5f5|f5f5f5|Saint-Symphorien',
  ] },
  { id: 'ita', nombre: 'Serie A', pais: 'Italia', nac: 'IT', riqueza: 1.2, clubes: [
    'Inter|INT|90|1e4fa3|111111|f5f5f5|San Siro', 'Napoli|NAP|88|12a0d7|f5f5f5|f5f5f5|Diego Armando Maradona',
    'Juventus|JUV|86|f2f2f2|111111|222222|Allianz Stadium', 'Milan|MIL|86|c8102e|f5f5f5|f5f5f5|San Siro',
    'Atalanta|ATA|84|1e71b8|111111|f5f5f5|Gewiss Stadium', 'Roma|ROM|83|8e1f2f|f5f5f5|f5f5f5|Stadio Olimpico',
    'Lazio|LAZ|81|87d8f7|f5f5f5|111111|Stadio Olimpico', 'Fiorentina|FIO|80|482e92|f5f5f5|f5f5f5|Artemio Franchi',
    'Bologna|BOL|80|a21c26|1a2f48|f5f5f5|Renato Dall\'Ara', 'Como|COM|77|1a3a8c|f5f5f5|f5f5f5|Giuseppe Sinigaglia',
    'Torino|TOR|76|8a1e03|f5f5f5|f5f5f5|Stadio Olimpico Grande Torino', 'Udinese|UDI|73|222222|f5f5f5|f5f5f5|Bluenergy Stadium',
    'Genoa|GEN|72|a7182f|0a2240|f5f5f5|Luigi Ferraris', 'Cagliari|CAG|71|a3142c|0a2240|f5f5f5|Unipol Domus',
    'Parma|PAR|71|f5f5f5|111111|ffd200|Ennio Tardini', 'Sassuolo|SAS|71|00a752|111111|f5f5f5|Mapei Stadium',
    'Hellas Verona|VER|70|00205b|ffd700|ffd700|Marcantonio Bentegodi', 'Lecce|LEC|69|ffd200|e30613|f5f5f5|Via del Mare',
    'Pisa|PIS|68|1b1f3b|111111|f5f5f5|Arena Garibaldi', 'Cremonese|CRE|67|c8102e|f5f5f5|f5f5f5|Giovanni Zini',
  ] },
  { id: 'hol', nombre: 'Eredivisie', pais: 'Países Bajos', nac: 'NL', riqueza: .6, clubes: [
    'Ajax|AJA|83|f5f5f5|f5f5f5|1b1b1b|Johan Cruijff ArenA', 'PSV|PSV|82|e30613|f5f5f5|111111|Philips Stadion',
    'Feyenoord|FEY|82|e30613|111111|f5f5f5|De Kuip', 'AZ|AZ|78|e30613|f5f5f5|111111|AFAS Stadion',
    'FC Twente|TWE|76|e30613|f5f5f5|111111|De Grolsch Veste', 'FC Utrecht|UTR|75|e30613|f5f5f5|f5f5f5|Stadion Galgenwaard',
    'NEC Nijmegen|NEC|71|e30613|111111|f5f5f5|Goffertstadion', 'Go Ahead Eagles|GAE|70|e30613|ffd700|f5f5f5|De Adelaarshorst',
    'Heerenveen|HEE|70|0057a8|f5f5f5|f5f5f5|Abe Lenstra Stadion', 'Groningen|GRO|69|00843d|f5f5f5|f5f5f5|Euroborg',
    'PEC Zwolle|PEC|68|0057a8|f5f5f5|f5f5f5|MAC³PARK Stadion', 'Sparta Rotterdam|SPA|68|e30613|111111|f5f5f5|Het Kasteel',
    'NAC Breda|NAC|68|ffd700|111111|111111|Rat Verlegh Stadion', 'Fortuna Sittard|FOR|67|ffd700|00843d|f5f5f5|Fortuna Sittard Stadion',
    'Heracles Almelo|HER|67|222222|f5f5f5|f5f5f5|Erve Asito', 'Excelsior|EXC|65|e30613|111111|f5f5f5|Van Donge & De Roo Stadion',
    'FC Volendam|VOL|65|f58220|111111|f5f5f5|Kras Stadion', 'Telstar|TEL|64|f5f5f5|f5f5f5|e30613|BUKO Stadion',
  ] },
  { id: 'por', nombre: 'Liga Portugal', pais: 'Portugal', nac: 'PT', riqueza: .6, clubes: [
    'Benfica|SLB|85|e30613|f5f5f5|111111|Estádio da Luz', 'Sporting CP|SCP|84|00843d|111111|f5f5f5|José Alvalade',
    'FC Porto|FCP|84|0057a8|0057a8|f5f5f5|Estádio do Dragão', 'SC Braga|SCB|79|e30613|f5f5f5|111111|Estádio Municipal de Braga',
    'Vitória de Guimarães|VSC|74|f5f5f5|111111|111111|Estádio D. Afonso Henriques', 'FC Famalicão|FAM|71|1d3c87|f5f5f5|f5f5f5|Estádio Municipal 22 de Junho',
    'Santa Clara|SCL|70|e30613|f5f5f5|f5f5f5|Estádio de São Miguel', 'Estoril Praia|EST|69|ffd700|0057a8|f5f5f5|Estádio António Coimbra da Mota',
    'Gil Vicente|GIL|69|e30613|0057a8|f5f5f5|Estádio Cidade de Barcelos', 'Moreirense|MOR|68|00843d|f5f5f5|f5f5f5|Estádio de Moreira de Cónegos',
    'Rio Ave|RAV|68|00843d|f5f5f5|f5f5f5|Estádio dos Arcos', 'Casa Pia|CPA|67|222222|f5f5f5|f5f5f5|Estádio Pina Manique',
    'Arouca|ARO|67|ffd700|0057a8|f5f5f5|Estádio Municipal de Arouca', 'Nacional|CDN|66|222222|f5f5f5|f5f5f5|Estádio da Madeira',
    'Estrela da Amadora|EAM|66|e30613|f5f5f5|00843d|Estádio José Gomes', 'AVS|AVS|64|c8102e|f5f5f5|f5f5f5|Estádio do CD Aves',
    'Tondela|TON|64|ffd700|00843d|00843d|Estádio João Cardoso', 'Alverca|ALV|63|e30613|f5f5f5|f5f5f5|Complexo Desportivo do FC Alverca',
  ] },
  { id: 'mex', nombre: 'Liga MX', pais: 'México', nac: 'MX', riqueza: .7, clubes: [
    'América|AME|82|ffd200|0a2240|0a2240|Estadio Azteca', 'Tigres UANL|TIG|81|ffd200|0047ab|0047ab|Estadio Universitario',
    'Monterrey|MTY|81|0a2240|0a2240|f5f5f5|Estadio BBVA', 'Cruz Azul|CAZ|80|0047ab|0047ab|f5f5f5|Estadio Ciudad de los Deportes',
    'Toluca|TOL|80|e30613|f5f5f5|f5f5f5|Estadio Nemesio Díez', 'Guadalajara|GDL|79|e30613|0a2240|f5f5f5|Estadio Akron',
    'UNAM Pumas|PUM|76|f5f5f5|0a2240|c5a253|Estadio Olímpico Universitario', 'Pachuca|PAC|76|0047ab|f5f5f5|f5f5f5|Estadio Hidalgo',
    'León|LEO|75|00843d|f5f5f5|f5f5f5|Estadio León', 'Santos Laguna|SAN|72|00843d|f5f5f5|f5f5f5|Estadio Corona',
    'Atlas|ATL|72|e30613|111111|f5f5f5|Estadio Jalisco', 'Tijuana|TIJ|72|e30613|111111|f5f5f5|Estadio Caliente',
    'Necaxa|NCX|70|e30613|f5f5f5|f5f5f5|Estadio Victoria', 'Puebla|PUE|69|f5f5f5|0a2240|0a2240|Estadio Cuauhtémoc',
    'Atlético de San Luis|ASL|69|e30613|0a2240|f5f5f5|Estadio Alfonso Lastras', 'Querétaro|QRO|68|0047ab|111111|f5f5f5|Estadio Corregidora',
    'FC Juárez|JUA|68|e30613|00843d|f5f5f5|Estadio Olímpico Benito Juárez', 'Mazatlán FC|MAZ|67|6c3e98|f5f5f5|f5f5f5|Estadio El Encanto',
  ] },
  { id: 'ale', nombre: 'Bundesliga', pais: 'Alemania', nac: 'DE', riqueza: 1.2, clubes: [
    'Bayern München|FCB|93|dc052d|f5f5f5|f5f5f5|Allianz Arena', 'Borussia Dortmund|BVB|86|fde100|111111|111111|Signal Iduna Park',
    'Bayer Leverkusen|B04|85|e32221|111111|f5f5f5|BayArena', 'RB Leipzig|RBL|83|f5f5f5|f5f5f5|dd0741|Red Bull Arena',
    'Eintracht Frankfurt|SGE|81|e1000f|111111|f5f5f5|Deutsche Bank Park', 'VfB Stuttgart|VFB|80|f5f5f5|f5f5f5|e32219|MHPArena',
    'SC Freiburg|SCF|77|e30613|111111|f5f5f5|Europa-Park Stadion', 'Borussia Mönchengladbach|BMG|76|f5f5f5|f5f5f5|111111|Borussia-Park',
    'Mainz 05|M05|75|c3141e|f5f5f5|f5f5f5|Mewa Arena', 'Werder Bremen|SVW|75|1d9053|f5f5f5|f5f5f5|Weserstadion',
    'VfL Wolfsburg|WOB|75|65b32e|f5f5f5|f5f5f5|Volkswagen Arena', 'TSG Hoffenheim|TSG|75|1961b5|f5f5f5|f5f5f5|PreZero Arena',
    'Union Berlin|FCU|74|eb1923|f5f5f5|f5f5f5|Stadion An der Alten Försterei', 'FC Augsburg|FCA|73|ba3733|f5f5f5|f5f5f5|WWK Arena',
    'Hamburger SV|HSV|72|f5f5f5|e30613|0a2240|Volksparkstadion', '1. FC Köln|KOE|71|f5f5f5|f5f5f5|ed1c24|RheinEnergieStadion',
    'FC St. Pauli|STP|71|6c4a3a|f5f5f5|f5f5f5|Millerntor-Stadion', '1. FC Heidenheim|FCH|70|e2001a|0a2240|f5f5f5|Voith-Arena',
  ] },
];

// nacionalidades: nombre para mostrar y nombres/apellidos con los que se inventan los jugadores
const NACIONES = {
  ES: { nombre: 'España', n: 'Alejandro Pablo Sergio Álvaro Javier Adrián Hugo Iván Marcos Rubén Diego Raúl Carlos Jorge Víctor Mario Unai Aitor Iker Gorka Pedro Manuel Óscar Alberto Nacho Borja Íñigo Dani Samuel Marc Pol Jordi Eric Gerard Asier Joel Hugo Martín Bruno Óliver',
    a: 'García Martínez López Sánchez Romero Navarro Torres Domínguez Vázquez Ramos Gil Serrano Molina Morales Ortega Delgado Castro Ortiz Rubio Marín Sanz Iglesias Medina Garrido Cortés Castillo Santos Lozano Guerrero Cano Prieto Méndez Calvo Gallego Vidal León Herrera Peña Flores Cabrera Campos Vega Fuentes Carrasco Caballero Reyes Nieto Aguilar Pascual Herrero Montero Hidalgo Lorenzo Giménez Ibáñez Ferrer Durán Benítez Mora Vicente Arias Vargas Carmona Crespo Román Pastor Soto Sáez Velasco Moya Soler Parra Esteban Bravo Gallardo Rojas Pardo Merino Franco Espinosa Lara Rivas Rivera Casado Arroyo Redondo Camacho Vera Otero Luque Galán Montes Ríos Sierra Segura Carrillo Soriano Arrieta Etxeberria Zubiaurre Aranburu Goikoetxea Olabe Urkiza' },
  EN: { nombre: 'Inglaterra', n: 'Jack Harry George Oliver Charlie James Thomas Callum Jamie Lewis Kyle Ryan Connor Ben Sam Josh Luke Adam Joe Tom Dan Will Alfie Archie Freddie Mason Reece Jordan Liam Owen Ethan Toby Max Leo Noah',
    a: 'Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green Hall Wood Jackson Clarke Harris Lewis Hughes Turner Hill Cooper Ward Morris Moore Clark Lee King Baker Harrison Morgan Allen Scott Phillips Watson Davis Parker Price Bennett Young Griffiths Mitchell Kelly Cook Carter Richardson Bailey Collins Bell Shaw Murphy Miller Cox Richards Khan Marshall Anderson Simpson Ellis Adams Wilkinson Foster Chapman Russell Webb Holmes Stevens Fletcher Barker Pearson Hudson Lawrence Gibson Palmer Mills Knight Fox Doyle Burton Hayes' },
  FR: { nombre: 'Francia', n: 'Lucas Hugo Théo Maxime Antoine Louis Nathan Enzo Mathis Clément Julien Romain Benjamin Thomas Quentin Florian Adrien Bastien Yanis Rayan Ibrahim Moussa Mamadou Kévin Axel Hugo Noah Malik Sacha Loïc Jérémy Bryan Steve Wilfried',
    a: 'Martin Bernard Dubois Durand Lefebvre Moreau Laurent Simon Michel Leroy Roux Bertrand Morel Fournier Girard Bonnet Dupont Lambert Fontaine Rousseau Vincent Lefèvre Faure Mercier Blanc Guérin Boyer Garnier Chevalier Legrand Gauthier Perrin Robin Morin Nicolas Henry Roussel Mathieu Masson Marchand Duval Denis Dumont Lemaire Noël Meyer Dufour Meunier Brun Blanchard Giraud Joly Rivière Brunet Gaillard Barbier Arnaud Diallo Traoré Koné Camara Sissoko Cissé Diarra Bamba Fofana Kanté Mendy Gomis Sané' },
  IT: { nombre: 'Italia', n: 'Alessandro Lorenzo Matteo Andrea Francesco Gabriele Riccardo Tommaso Federico Davide Simone Luca Marco Giacomo Nicolò Pietro Daniele Stefano Filippo Manuel Christian Mattia Edoardo Gianluca Samuele Michele Emanuele Alberto Fabio Giorgio',
    a: 'Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De Luca Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile Martinelli Vitale Lombardo Serra Coppola De Santis Marchetti Parisi Villa Ferraro Ferri Fabbri Bianco Marini Grasso Valentini Messina Sala De Angelis Gatti Pellegrini Palumbo Sanna Farina Rizzi Monti Cattaneo Morelli Amato Silvestri Mazza Testa Grassi Carbone Giuliani Benedetti Barone Rossetti Caputo Montanari Guerra Palmieri Bernardi Fiore' },
  NL: { nombre: 'Países Bajos', n: 'Daan Sem Lucas Milan Levi Luuk Bram Thijs Jesse Ruben Stijn Niels Joep Tim Jasper Bas Koen Wout Sven Teun Jens Mees Floris Lars Ryan Jurriën Quinten Micky Calvin Noa',
    a: 'de Jong Jansen de Vries van den Berg Bakker Janssen Visser Smit Meijer de Boer Mulder de Groot Bos Vos Peters Hendriks van Leeuwen Dekker Brouwer de Wit Dijkstra Smits de Graaf van der Meer van der Linden Kok Jacobs de Haan Vermeulen van den Heuvel van der Veen van den Broek de Bruijn van der Heijden Schouten van Beek Willems van Vliet Hoekstra Maas Verhoeven Koster van Dam van der Wal Prins Blom Huisman de Lange Kuipers van Wijk Post Veenstra Timmermans Wijnaldum Koopmans' },
  PT: { nombre: 'Portugal', n: 'João Rodrigo Martim Tiago Diogo Afonso Tomás Gonçalo Duarte Rúben Nuno Bruno André Pedro Miguel Rafael Francisco Vasco Hélder Fábio Ricardo Gustavo Vítor Simão Renato Leonardo Henrique Samuel',
    a: 'Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Gonçalves Gomes Lopes Marques Alves Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes Nunes Soares Vieira Monteiro Cardoso Rocha Neves Coelho Cruz Cunha Pires Ramos Reis Simões Antunes Matos Fonseca Machado Araújo Barbosa Tavares Lourenço Castro Figueiredo Azevedo Freitas Henriques Magalhães Batista Brito Guerreiro Dias Valente Quaresma Patrício' },
  MX: { nombre: 'México', n: 'Luis José Juan Carlos Jesús Miguel Ángel Alexis Diego Érick Uriel Santiago Emiliano Rodrigo Héctor Israel Edson Fernando Raúl Eduardo Ricardo Jorge Alan Brian Kevin César Julián Omar Iván Óscar Ulises Jair Marcelo Sebastián Andrés Gilberto Efraín',
    a: 'Hernández García Martínez López González Rodríguez Pérez Sánchez Ramírez Cruz Flores Gómez Morales Vázquez Reyes Jiménez Torres Díaz Gutiérrez Ruiz Mendoza Aguilar Ortiz Moreno Castillo Romero Álvarez Méndez Chávez Rivera Juárez Ramos Domínguez Herrera Medina Castro Vargas Guzmán Velázquez Muñoz Rojas Contreras Salazar Luna Ortega Guerrero Estrada Bautista Cortés Soto Alvarado Espinoza Lara Ávila Ríos Cervantes Silva Delgado Vega Márquez Sandoval Carrillo León Mejía Solís Ibarra Robles Valdez Cisneros Rosales Campos Fuentes Navarro Peña Pacheco Ochoa Zúñiga' },
  DE: { nombre: 'Alemania', n: 'Lukas Leon Finn Jonas Paul Luca Felix Max Elias Noah Niklas Tim Jan Moritz Julian Tobias Florian Kai Marvin Dennis Kevin Pascal Robin Sebastian Jannik Malte Lennart Nico Benedikt Joshua',
    a: 'Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Schmitt Werner Schmitz Krause Meier Lehmann Schmid Schulze Maier Köhler Herrmann König Walter Mayer Huber Kaiser Fuchs Peters Lang Scholz Möller Weiß Jung Hahn Schubert Vogel Friedrich Keller Günther Frank Berger Winkler Roth Beck Lorenz Baumann Franke Albrecht Schuster Ludwig Böhm Winter Kraus Schumacher Krämer Vogt Stein Jäger Otto Sommer Groß Seidel Heinrich Brandt Haas' },
  BR: { nombre: 'Brasil', n: 'Gabriel Lucas Matheus Vinícius Rafael Guilherme Thiago Felipe Bruno Igor Caio Wesley Douglas Pedro Henrique Danilo Fabrício Murilo Rogério Júnior Alisson Éder Anderson',
    a: 'Souza Lima Barbosa Ribeiro Nascimento Moura Cavalcanti Batista Rocha Teixeira Farias Duarte Campos Andrade Carvalho Araújo Pereira Freitas Santana Moraes Pinheiro Vasconcelos Bezerra Assis Brandão' },
  AR: { nombre: 'Argentina', n: 'Matías Nicolás Agustín Facundo Franco Joaquín Tomás Gonzalo Ezequiel Leandro Gastón Maximiliano Federico Santiago Valentín Thiago Lucas Emiliano Juan Cristian',
    a: 'Fernández Romero Acosta Benítez Medina Herrera Aguirre Pereyra Giménez Molina Sosa Ledesma Paz Quiroga Ojeda Correa Godoy Ferreyra Ríos Coronel Cabral Villalba Peralta Moyano Carrizo' },
  SN: { nombre: 'Senegal', n: 'Moussa Ibrahima Cheikh Abdou Mamadou Ismaila Youssouf Seydou Amadou Oumar Bakary Lamine Pape Idrissa Babacar Mbaye Saliou Alioune',
    a: 'Diop Ndiaye Sarr Diallo Ba Fall Sow Gueye Faye Cissé Kouyaté Traoré Keita Coulibaly Konaté Sylla Touré Thiam Niang Seck Mbaye Dieng Ndour' },
};
// une las partículas con la palabra siguiente ("de Jong", "van der Meer", "De Luca")
const unirParticulas = l => { const r = []; let pre = ''; for (const w of l) { if (/^(de|van|der|den|De)$/.test(w)) pre += w + ' '; else { r.push(pre + w); pre = ''; } } return r; };
for (const k in NACIONES) { NACIONES[k].n = NACIONES[k].n.split(' '); NACIONES[k].a = unirParticulas(NACIONES[k].a.split(' ')); }
// de dónde vienen los extranjeros de cada liga
const EXTRANJEROS = { ES: 'AR BR FR PT SN', EN: 'FR BR ES PT NL SN DE AR', FR: 'SN PT BR ES', IT: 'BR AR FR ES NL SN', NL: 'BR DE SN PT', PT: 'BR BR AR ES', MX: 'AR AR BR ES', DE: 'NL FR BR SN ES' };
// plantilla tipo de 23 jugadores (puestos)
const PLANTILLA_TIPO = ['POR', 'POR', 'POR', 'DFC', 'DFC', 'DFC', 'DFC', 'LD', 'LD', 'LI', 'LI', 'MCD', 'MCD', 'MC', 'MC', 'MC', 'MCO', 'EI', 'EI', 'ED', 'ED', 'DC', 'DC'];
// cómo se reparten los atributos según el puesto (diferencia respecto a la media)
const PERFIL_PUESTO = {
  POR: { vel: -22, pas: -14, tir: -40, def: -18, reg: -28, par: 2 },
  DFC: { vel: -6, pas: -8, tir: -25, def: 4, reg: -15, par: -55 },
  LD: { vel: 4, pas: -3, tir: -18, def: 0, reg: -5, par: -55 }, LI: { vel: 4, pas: -3, tir: -18, def: 0, reg: -5, par: -55 },
  MCD: { vel: -5, pas: 0, tir: -12, def: 2, reg: -6, par: -55 }, MC: { vel: -3, pas: 4, tir: -6, def: -6, reg: 0, par: -55 },
  MCO: { vel: 0, pas: 4, tir: 0, def: -20, reg: 4, par: -55 },
  MI: { vel: 6, pas: 1, tir: -6, def: -12, reg: 3, par: -55 }, MD: { vel: 6, pas: 1, tir: -6, def: -12, reg: 3, par: -55 },
  EI: { vel: 8, pas: -2, tir: 0, def: -25, reg: 5, par: -55 }, ED: { vel: 8, pas: -2, tir: 0, def: -25, reg: 5, par: -55 },
  DC: { vel: 3, pas: -8, tir: 5, def: -30, reg: 0, par: -55 },
};
const PUESTOS = Object.keys(PERFIL_PUESTO);
const NOMBRE_PUESTO = { POR: 'Portero', DFC: 'Defensa central', LD: 'Lateral derecho', LI: 'Lateral izquierdo', MCD: 'Mediocentro defensivo', MC: 'Centrocampista', MCO: 'Mediapunta', MI: 'Interior izquierdo', MD: 'Interior derecho', EI: 'Extremo izquierdo', ED: 'Extremo derecho', DC: 'Delantero centro' };
