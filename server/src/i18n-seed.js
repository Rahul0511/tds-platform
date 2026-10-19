// Starting translations for DE and FR. They are inserted once, with status
// "suggested", so a person has to review and approve them. Compliance and
// legal texts in particular must be checked by the responsible department.
//
// Matching is by the exact English source text: if the English wording in the
// database was changed, the seed for that text is skipped.

import { DEFAULT_TEXT_BLOCKS } from './seed-defaults.js';

export const DEFAULT_LANGUAGES = [
  { code: 'EN', name: 'English', sort_order: 10 },
  { code: 'DE', name: 'Deutsch', sort_order: 20 },
  { code: 'FR', name: 'Français', sort_order: 30 },
];

/** Fixed words printed on every TDS (EN source). */
export const LABELS = {
  title: 'TECHNICAL DATA SHEET',
  region: 'Region:',
  date: 'Date:',
  version: 'Version:',
  product_description: 'Product description',
  recommended_substrates: 'Recommended substrates:',
  'rating.gloss': 'Gloss',
  'rating.rub': 'Rub Resistance',
  'rating.blocking': 'Block Resistance',
  'rating.drying': 'Drying',
  'rating.cof': 'COF *',
  'rating.hot_foil': 'Hot Foil Stamping',
  'rating.foil_lamination': 'Foil Lamination',
  'rating.uv_coating': 'UV-Coating',
  'rating.gluability': 'Gluability **',
  'phys.viscosity': 'Viscosity (upon delivery)',
  'phys.viscosity_note': 'DIN-Cup 4 / 23°C',
  'phys.density': 'Mass Density',
  'phys.solids': 'Solid content',
  'phys.ph': 'pH-value',
  'phys.double_sided': 'Double sided printing',
  'phys.heat_resistance': 'Heat Resistance',
  'phys.foil_wrapping': 'Foil Wrapping',
  'phys.deep_freezing': 'Deep-freezing of printed goods',
  up_to: 'up to',
  product_safety: 'Product safety',
  intended_use: 'Intended Use',
  page: 'Page',
};

const LABELS_DE = {
  title: 'TECHNISCHES MERKBLATT',
  region: 'Region:',
  date: 'Datum:',
  version: 'Version:',
  product_description: 'Produktbeschreibung',
  recommended_substrates: 'Empfohlene Bedruckstoffe:',
  'rating.gloss': 'Glanz',
  'rating.rub': 'Scheuerfestigkeit',
  'rating.blocking': 'Blockfestigkeit',
  'rating.drying': 'Trocknung',
  'rating.cof': 'Reibungskoeffizient (COF) *',
  'rating.hot_foil': 'Heißfolienprägung',
  'rating.foil_lamination': 'Folienkaschierung',
  'rating.uv_coating': 'UV-Lackierung',
  'rating.gluability': 'Verklebbarkeit **',
  'phys.viscosity': 'Viskosität (Lieferzustand)',
  'phys.viscosity_note': 'DIN-Becher 4 / 23°C',
  'phys.density': 'Dichte',
  'phys.solids': 'Festkörpergehalt',
  'phys.ph': 'pH-Wert',
  'phys.double_sided': 'Schön- und Widerdruck',
  'phys.heat_resistance': 'Hitzebeständigkeit',
  'phys.foil_wrapping': 'Folieneinschlag',
  'phys.deep_freezing': 'Tiefkühlung der Druckprodukte',
  up_to: 'bis',
  product_safety: 'Produktsicherheit',
  intended_use: 'Bestimmungsgemäße Verwendung',
  page: 'Seite',
};

const LABELS_FR = {
  title: 'FICHE TECHNIQUE',
  region: 'Région :',
  date: 'Date :',
  version: 'Version :',
  product_description: 'Description du produit',
  recommended_substrates: 'Supports recommandés :',
  'rating.gloss': 'Brillance',
  'rating.rub': 'Résistance au frottement',
  'rating.blocking': 'Résistance au bloquage',
  'rating.drying': 'Séchage',
  'rating.cof': 'Coefficient de friction (COF) *',
  'rating.hot_foil': 'Marquage à chaud',
  'rating.foil_lamination': 'Pelliculage',
  'rating.uv_coating': 'Vernissage UV',
  'rating.gluability': 'Collabilité **',
  'phys.viscosity': 'Viscosité (à la livraison)',
  'phys.viscosity_note': 'Coupe DIN 4 / 23°C',
  'phys.density': 'Masse volumique',
  'phys.solids': 'Extrait sec',
  'phys.ph': 'Valeur pH',
  'phys.double_sided': 'Impression recto-verso',
  'phys.heat_resistance': 'Résistance à la chaleur',
  'phys.foil_wrapping': 'Emballage sous film',
  'phys.deep_freezing': 'Surgélation des produits imprimés',
  up_to: "jusqu'à",
  product_safety: 'Sécurité du produit',
  intended_use: 'Usage prévu',
  page: 'Page',
};

// Text block bodies: same line structure as the English seed ("- " = bullet).
const BLOCKS = {
  fields_of_application: {
    title: ['Einsatzgebiete', "Domaines d'application"],
    DE: ['Bogenoffsetdruckmaschinen mit Lackwerk (Rasterwalze / Kammerrakel) und geeigneter Trocknung'],
    FR: ["Presses offset feuilles équipées d'un groupe de vernissage (rouleau anilox / racle à chambre) et d'un système de séchage adapté"],
  },
  rating_notes: {
    DE: [
      '*   Von glatt bis rutschfest (von links nach rechts)',
      '** Der verwendete Klebstoff sollte für lackierte Oberflächen empfohlen sein. Aufgrund der geringeren Saugfähigkeit einer lackierten Oberfläche ist es stets besser, die Klebelasche auszusparen. Ein Test unter Praxisbedingungen wird empfohlen',
    ],
    FR: [
      '*   De glissant à antidérapant (de gauche à droite)',
      "** La colle utilisée doit être recommandée pour les surfaces vernies. En raison de l'absorption réduite d'une surface vernie, il est toujours préférable d'épargner la patte de collage. Un essai dans les conditions réelles est recommandé",
    ],
  },
  foil_wrapping_note: {
    DE: [
      '*  Für unbeschichtetes PP (110°C / 10kPas / 1 sec)',
      'Beschichtete Folien sollten unter Praxisbedingungen getestet werden',
      'Acrylbeschichtete Folien sind nicht geeignet',
    ],
    FR: [
      '*  Pour PP non couché (110°C / 10kPas / 1 s)',
      'Les films couchés doivent être testés dans les conditions réelles',
      'Les films à revêtement acrylique ne conviennent pas',
    ],
  },
  lab_disclaimer: {
    DE: [
      'Bitte beachten: Alle angegebenen Werte und Eigenschaften wurden durch Labortests unter definierten Bedingungen ermittelt. Unter abweichenden Praxisbedingungen können die Eigenschaften leicht abweichen.',
    ],
    FR: [
      "Remarque : toutes les valeurs et propriétés indiquées ont été déterminées par des essais en laboratoire dans des conditions définies. Dans d'autres conditions réelles, les propriétés peuvent légèrement différer.",
    ],
  },
  processing_advice: {
    title: ['Verarbeitungshinweise', 'Conseils de mise en œuvre'],
    DE: [
      '- Vor Gebrauch gut aufrühren',
      '- Empfohlenes Auftragsgewicht: 4-6 g/m² (nass)',
      '- Nicht mit anderen Produkten mischen',
      '- Nur lösemittel- und alkalibeständige Druckfarben verwenden. Ungeeignete Farben können nach dem Lackieren bluten oder ihren Farbton verändern',
      '- Nur Druckbestäubungspuder verwenden, die für wasserbasierte Drucklacke empfohlen sind',
      '- Eine Stapeltemperatur in der Auslage von 35°C sollte nicht überschritten werden, da es sonst zu Abliegen und Blocken kommen kann',
      '- Leitungen und Auftragswerke mit Wasser bzw. bei Bedarf mit Wasser / Reinigungsmittel 19-470823-6 reinigen. Eine Verunreinigung des Lackes durch Spülwasser vermeiden. Eingetrocknete Lackreste können mit unverdünntem Reiniger entfernt werden (Sicherheitshinweise beachten).',
    ],
    FR: [
      '- Bien homogénéiser avant emploi',
      "- Grammage d'application recommandé : 4-6 g/m² (humide)",
      "- Ne pas mélanger avec d'autres produits",
      '- Utiliser uniquement des encres résistantes aux solvants et aux alcalis. Des encres inadaptées peuvent migrer ou changer de nuance après vernissage',
      "- Utiliser uniquement des poudres anti-maculage recommandées pour les vernis de surimpression à l'eau",
      '- La température de la pile en sortie ne doit pas dépasser 35°C, sous peine de maculage et de bloquage',
      "- Nettoyer les conduites et les groupes d'application à l'eau ou, si nécessaire, avec un mélange eau / nettoyant 19-470823-6. Éviter toute contamination du vernis par l'eau de rinçage. Les résidus de vernis secs peuvent être éliminés avec le nettoyant pur (respecter les consignes de sécurité).",
    ],
  },
  storage_handling: {
    title: ['Lagerung und Handhabung', 'Stockage et manipulation'],
    DE: [
      '- Frostfrei und kühl lagern',
      '- Im ungeöffneten Originalgebinde lagern. Nach dem Öffnen möglichst schnell verbrauchen.',
      '- Lagerfähigkeit: {{shelf_life_months}} Monate im ungeöffneten Gebinde, nach dem Öffnen möglichst bald verbrauchen',
      '- Die Viskosität kann während der Lagerung ansteigen. Vor Gebrauch gut aufrühren, Viskosität prüfen und bei Bedarf mit maximal 5 % Wasser verdünnen.',
    ],
    FR: [
      "- Stocker au frais et à l'abri du gel",
      "- Stocker dans l'emballage d'origine non ouvert. Après ouverture, utiliser le plus rapidement possible.",
      '- Durée de conservation : {{shelf_life_months}} mois en emballage non ouvert ; après ouverture, utiliser dès que possible',
      "- La viscosité peut augmenter pendant le stockage. Avant emploi, bien homogénéiser, contrôler la viscosité et diluer si nécessaire avec 5 % d'eau au maximum.",
    ],
  },
  general_information: {
    title: ['Allgemeine Hinweise', 'Informations générales'],
    DE: [
      '- Die endgültigen Oberflächeneigenschaften stellen sich erst nach vollständiger Trocknung von Farbe und Lack ein.',
      '- Wirken Füllgut oder Verarbeitungshilfsmittel nach dem Druck auf die Lackoberfläche ein, ist die Eignung gesondert zu prüfen',
      '- Die Veredelung mit UV-Lack oder Heißfolie erfordert eine stabile Untergrundoberfläche. Metallicfarben müssen tesafest sein',
      '- Haftung und Kratzfestigkeit des UV-Lackes bzw. der Heißfolienprägung können je nach Oberflächeneigenschaften des Bedruckstoffs, der Farbe und des aufgebrachten UV-Lackes bzw. der Heißfolie variieren',
      '- Die Eignung für den Schön- und Widerdruck hängt nicht nur von den Lackeigenschaften ab, sondern auch vom Bedruckstoff, hoher Farbbelegung und langsam wegschlagenden Farben. Wir empfehlen eine ausreichende Trocknungszeit vor dem Widerdruck sowie einen Test unter Praxisbedingungen.',
      '- Die verwendeten Bedruckstoffe müssen für die Lackierung mit wässrigen Drucklacken geeignet sein.',
    ],
    FR: [
      "- Les propriétés de surface définitives ne sont atteintes qu'après séchage complet de l'encre et du vernis.",
      "- Si le contenu de l'emballage ou des auxiliaires de transformation agissent sur la surface vernie après impression, l'aptitude doit être vérifiée séparément",
      '- La finition au vernis UV ou au marquage à chaud nécessite une surface de support stable. Les encres métallisées doivent résister au test du ruban adhésif',
      "- L'adhérence et la résistance à la rayure du vernis UV ou du marquage à chaud peuvent varier selon les propriétés de surface du support, de l'encre et du vernis UV ou du film à chaud appliqués",
      "- L'aptitude à l'impression recto-verso dépend non seulement des propriétés du vernis, mais aussi du support, d'une forte couverture d'encre et d'encres à pénétration lente. Nous recommandons un temps de séchage suffisant avant l'impression du verso ainsi qu'un essai dans les conditions réelles.",
      '- Les supports utilisés doivent être aptes au vernissage avec des vernis de surimpression aqueux.',
    ],
  },
  compliance_intro: {
    title: ['Compliance-Management', 'Gestion de la conformité'],
    DE: [
      'Zur Einhaltung der europäischen Gesetzgebung für Lebensmittelverpackungen beachten Sie bitte den Kundenleitfaden „Druckfarben für Lebensmittelverpackungen“:',
      'https://ink-safety-portal.siegwerk.com/regulatory-affairs/compliance.html',
    ],
    FR: [
      "Pour la conformité à la législation européenne sur les emballages alimentaires, veuillez consulter le guide client « Encres d'impression pour emballages alimentaires » :",
      'https://ink-safety-portal.siegwerk.com/regulatory-affairs/compliance.html',
    ],
  },
  preservatives: {
    title: ['Hinweis zu Konservierungsmitteln', 'Information sur les conservateurs'],
    DE: [
      'Wasserbasierte Produkte enthalten üblicherweise Topfkonservierungsmittel. Das Produkt enthält Isothiazolinon-Biozide; Spuren von Methylisothiazolinon (MIT) können nicht ausgeschlossen werden. Solche Biozide können bei bereits sensibilisierten Personen allergische Hautreaktionen hervorrufen.',
    ],
    FR: [
      "Les produits à base d'eau contiennent généralement des conservateurs en pot. Le produit contient des biocides de type isothiazolinone ; des traces de méthylisothiazolinone (MIT) ne peuvent être exclues. Ces biocides peuvent provoquer des réactions cutanées allergiques chez les personnes déjà sensibilisées.",
    ],
  },
  legal_note: {
    DE: [
      'Hinweis: Die Angaben in diesem Merkblatt entsprechen unserem derzeitigen Kenntnisstand. Sie stellen keine Zusicherung im Rechtssinne dar. Aufgrund der unterschiedlichen Bedruckstoffe und Produktionsbedingungen ist dieses Merkblatt nur als unverbindliche Beratung zu verstehen. Vor dem Druck sollte der Drucker durch geeignete Tests die Eignung des Produkts für den vorgesehenen Zweck prüfen. Dieses Merkblatt erhebt keinen Anspruch auf Vollständigkeit.',
      'Änderungen der Produkteigenschaften aufgrund technischer Weiterentwicklungen, geänderter Rechtslage und produktionsbedingter Anforderungen behalten wir uns vor.',
    ],
    FR: [
      "Remarque : les informations contenues dans cette fiche reflètent l'état actuel de nos connaissances. Elles ne constituent pas une garantie au sens juridique. En raison de la diversité des supports et des conditions de production, cette fiche n'a qu'une valeur de conseil non contraignant. Avant l'impression, l'imprimeur doit effectuer des essais appropriés afin de vérifier l'aptitude du produit à l'usage prévu. Cette fiche technique ne prétend pas être exhaustive.",
      "Nous nous réservons le droit de modifier les propriétés du produit en raison d'évolutions techniques, de modifications de la législation applicable et d'exigences liées à la production.",
    ],
  },
};

// Header rules, drop-down values, product descriptions, settings: EN -> [DE, FR].
const PHRASES = [
  [
    'is intended for printing on NPH (Nutrition, Pharma and Hygiene) packaging in the EMEA.',
    'ist für den Druck von NPH-Verpackungen (Nahrungsmittel, Pharma und Hygiene) in der Region EMEA bestimmt.',
    "est destiné à l'impression d'emballages NPH (nutrition, pharmacie et hygiène) dans la zone EMEA.",
  ],
  [
    'Further regulatory information can be found in Siegwerk\'s "Statement of Composition".\n\nThe product is suitable for use on the non-food contact side of food packaging provided it is used in accordance with the relevant Good Manufacturing Practices (GMP) and in accordance with the information in this Technical Data Sheet. Application on the food contact side is not recommended.\nThe printer, converter and packer/filler are legally responsible for ensuring that the finished article is suitable for the intended purpose(s) and that the ink and coating components do not migrate into the food in quantities that exceed legal and industry requirements.',
    'Weitere regulatorische Informationen finden Sie im „Statement of Composition“ von Siegwerk.\n\nDas Produkt ist für die Anwendung auf der lebensmittelabgewandten Seite von Lebensmittelverpackungen geeignet, sofern es gemäß der einschlägigen Guten Herstellungspraxis (GMP) und gemäß den Angaben in diesem Technischen Merkblatt eingesetzt wird. Eine Anwendung auf der lebensmittelzugewandten Seite wird nicht empfohlen.\nDrucker, Verarbeiter und Abpacker/Abfüller sind rechtlich dafür verantwortlich, dass der fertige Artikel für den/die vorgesehenen Zweck(e) geeignet ist und die Bestandteile von Farbe und Lack nicht in Mengen in das Lebensmittel übergehen, die gesetzliche und branchenübliche Anforderungen überschreiten.',
    "Des informations réglementaires complémentaires figurent dans le « Statement of Composition » de Siegwerk.\n\nLe produit convient à une utilisation sur la face externe (sans contact alimentaire) des emballages alimentaires, à condition d'être utilisé conformément aux Bonnes Pratiques de Fabrication (BPF) applicables et aux informations de la présente fiche technique. L'application sur la face en contact avec les aliments n'est pas recommandée.\nL'imprimeur, le transformateur et le conditionneur/remplisseur sont légalement responsables de garantir que l'article fini convient à l'usage ou aux usages prévus et que les composants de l'encre et du vernis ne migrent pas dans les aliments en quantités dépassant les exigences légales et industrielles.",
  ],
  [
    'Further regulatory information can be found in Siegwerk\'s "Statement of Composition".\n\nThe product is suitable for use on the non-food contact side of food packaging provided it is used in accordance with the relevant Good Manufacturing Practices (GMP) and in accordance with the information in this Technical Data Sheet. Application on the food contact side is only recommended for dry foods and dry and fatty foods. Additionally, an individual migration test under practical conditions (due to high variety of substrates and application weights) is mandatory. The printer, converter and packer/filler are legally responsible for ensuring that the finished article is suitable for the intended purpose(s) and that the ink and coating components do not migrate into the food in quantities that exceed legal and industry requirements. For information on the food legislation assessment of this product, please contact our PSR-Department. \nEmail: psr-emea@siegwerk.com',
    'Weitere regulatorische Informationen finden Sie im „Statement of Composition“ von Siegwerk.\n\nDas Produkt ist für die Anwendung auf der lebensmittelabgewandten Seite von Lebensmittelverpackungen geeignet, sofern es gemäß der einschlägigen Guten Herstellungspraxis (GMP) und gemäß den Angaben in diesem Technischen Merkblatt eingesetzt wird. Eine Anwendung auf der lebensmittelzugewandten Seite wird nur für trockene sowie trockene und fetthaltige Lebensmittel empfohlen. Zusätzlich ist eine individuelle Migrationsprüfung unter Praxisbedingungen (aufgrund der großen Vielfalt an Bedruckstoffen und Auftragsgewichten) zwingend erforderlich. Drucker, Verarbeiter und Abpacker/Abfüller sind rechtlich dafür verantwortlich, dass der fertige Artikel für den/die vorgesehenen Zweck(e) geeignet ist und die Bestandteile von Farbe und Lack nicht in Mengen in das Lebensmittel übergehen, die gesetzliche und branchenübliche Anforderungen überschreiten. Für Informationen zur lebensmittelrechtlichen Bewertung dieses Produkts wenden Sie sich bitte an unsere PSR-Abteilung.\nE-Mail: psr-emea@siegwerk.com',
    "Des informations réglementaires complémentaires figurent dans le « Statement of Composition » de Siegwerk.\n\nLe produit convient à une utilisation sur la face externe (sans contact alimentaire) des emballages alimentaires, à condition d'être utilisé conformément aux Bonnes Pratiques de Fabrication (BPF) applicables et aux informations de la présente fiche technique. L'application sur la face en contact avec les aliments n'est recommandée que pour les aliments secs ainsi que secs et gras. De plus, un essai de migration individuel dans les conditions réelles (en raison de la grande diversité des supports et des grammages) est obligatoire. L'imprimeur, le transformateur et le conditionneur/remplisseur sont légalement responsables de garantir que l'article fini convient à l'usage ou aux usages prévus et que les composants de l'encre et du vernis ne migrent pas dans les aliments en quantités dépassant les exigences légales et industrielles. Pour toute information sur l'évaluation de ce produit au regard de la législation alimentaire, veuillez contacter notre service PSR.\nE-mail : psr-emea@siegwerk.com",
  ],

  // Drop-down values
  ['yes', 'ja', 'oui'],
  ['not recommended', 'nicht empfohlen', 'non recommandé'],
  ['n.a.', 'k. A.', 'n.a.'],
  ['n.a', 'k. A.', 'n.a.'],
  ['Conditionally , test recommended', 'Bedingt, Test empfohlen', 'Sous conditions, essai recommandé'],
  ['test recommended', 'Test empfohlen', 'Essai recommandé'],
  ['Paper and board, coated', 'Papier und Karton, gestrichen', 'Papier et carton couchés'],
  [
    'Non absorbent substrates and well coated board and paper',
    'Nicht saugende Bedruckstoffe sowie gut gestrichener Karton und Papier',
    'Supports non absorbants et papiers et cartons bien couchés',
  ],
  ['Labelpaper and board, coated', 'Etikettenpapier und Karton, gestrichen', 'Papier étiquette et carton couchés'],
  ['Non absorbent substrates and coated labelpaper', 'Nicht saugende Bedruckstoffe und gestrichenes Etikettenpapier', 'Supports non absorbants et papier étiquette couché'],
  ['paper and board, coated and absorbent', 'Papier und Karton, gestrichen und saugfähig', 'papier et carton, couchés et absorbants'],

  // Settings
  ['WATER BASED SHEETFED OPV', 'WASSERBASIERTER BOGENOFFSET-DRUCKLACK', "VERNIS DE SURIMPRESSION OFFSET FEUILLES À L'EAU"],

  // Product descriptions
  [
    'Gloss Primer for Inline-Varnishing with UV-Coating. The primer must be completely covered by the UV varnish. Not suitable for off-line finishing and partial overprinting',
    'Glänzender Primer für die Inline-Lackierung mit UV-Lack. Der Primer muss vollständig mit UV-Lack überdeckt werden. Nicht geeignet für Offline-Veredelung und partielles Überdrucken',
    'Primaire brillant pour le vernissage en ligne avec vernis UV. Le primaire doit être entièrement recouvert par le vernis UV. Ne convient pas à la finition hors ligne ni à la surimpression partielle',
  ],
  [
    'Gloss Primer for Inline-Varnishing with UV-Coating. The primer must be completely covered by the UV varnish. Not suitable for off-line finishing and partial overvarnishing',
    'Glänzender Primer für die Inline-Lackierung mit UV-Lack. Der Primer muss vollständig mit UV-Lack überdeckt werden. Nicht geeignet für Offline-Veredelung und partielles Überlackieren',
    'Primaire brillant pour le vernissage en ligne avec vernis UV. Le primaire doit être entièrement recouvert par le vernis UV. Ne convient pas à la finition hors ligne ni au survernissage partiel',
  ],
  ['Gloss Protective coating for the production of IML-Labels', 'Glänzender Schutzlack für die Herstellung von IML-Etiketten', "Vernis de protection brillant pour la fabrication d'étiquettes IML"],
  ['Gloss Protective coating for the production of printed products.', 'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen.', 'Vernis de protection brillant pour la fabrication de produits imprimés.'],
  [
    'Gloss Protective coating for the production of printed products. Fast drying, suitabel for perfecting',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Schnell trocknend, geeignet für den Schön- und Widerdruck',
    "Vernis de protection brillant pour la fabrication de produits imprimés. Séchage rapide, adapté à l'impression recto-verso",
  ],
  [
    'Gloss Protective coating for the production of printed products. Fast drying.',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Schnell trocknend.',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Séchage rapide.',
  ],
  [
    'Gloss Protective coating for the production of printed products. High Level of Gloss',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Hoher Glanz',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Brillance élevée',
  ],
  [
    'Gloss Protective coating for the production of printed products. High Level of Heat resistance',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Hohe Hitzebeständigkeit',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Résistance élevée à la chaleur',
  ],
  [
    'Gloss Protective coating for the production of printed products. High Level of Rub resistance',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Hohe Scheuerfestigkeit',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Résistance élevée au frottement',
  ],
  [
    'Gloss Protective coating for the production of printed products. High Value of COF (Antislip)',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Hoher Reibungskoeffizient (rutschhemmend)',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Coefficient de friction élevé (antidérapant)',
  ],
  [
    'Gloss Protective coating for the production of printed products. Suitable as Primer for UV-Varnishing and Foil-lamination',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Geeignet als Primer für UV-Lackierung und Folienkaschierung',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Convient comme primaire pour le vernissage UV et le pelliculage',
  ],
  [
    'Gloss Protective coating for the production of printed products. Very High Value of static COF (Antislip)',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Sehr hoher statischer Reibungskoeffizient (rutschhemmend)',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Coefficient de friction statique très élevé (antidérapant)',
  ],
  [
    'Gloss Protective coating for the production of printed products. Very high Level of Gloss',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Sehr hoher Glanz',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Très haute brillance',
  ],
  [
    'Gloss Protective coating for the production of printed products. Very low tendency for crackling.',
    'Glänzender Schutzlack für die Herstellung von Druckerzeugnissen. Sehr geringe Neigung zur Rissbildung.',
    'Vernis de protection brillant pour la fabrication de produits imprimés. Très faible tendance au craquelage.',
  ],
  [
    'Gloss Protective coating with good fat and grease resistance. Suitable for direct Food Contact (see page 2 – paragraph “Product safety”).',
    'Glänzender Schutzlack mit guter Fett- und Ölbeständigkeit. Geeignet für den direkten Lebensmittelkontakt (siehe Seite 2 – Abschnitt „Produktsicherheit“).',
    'Vernis de protection brillant avec une bonne résistance aux graisses. Convient au contact alimentaire direct (voir page 2 – paragraphe « Sécurité du produit »).',
  ],
  [
    'Gloss protective coating for films and non-absorbent surfaces. Visible under UV light',
    'Glänzender Schutzlack für Folien und nicht saugende Oberflächen. Unter UV-Licht sichtbar',
    'Vernis de protection brillant pour films et surfaces non absorbantes. Visible sous lumière UV',
  ],
  ['Matt Protective coating for the production of printed products', 'Matter Schutzlack für die Herstellung von Druckerzeugnissen', 'Vernis de protection mat pour la fabrication de produits imprimés'],
  [
    'Matt Protective coating for the production of printed products.\nExcellent matt effect with a very homogeneous and uniform appearance.',
    'Matter Schutzlack für die Herstellung von Druckerzeugnissen.\nAusgezeichneter Matteffekt mit sehr homogenem und gleichmäßigem Erscheinungsbild.',
    'Vernis de protection mat pour la fabrication de produits imprimés.\nExcellent effet mat avec un aspect très homogène et uniforme.',
  ],
  [
    'Matt Protective coating for the production of printed products. Very good matt effect.',
    'Matter Schutzlack für die Herstellung von Druckerzeugnissen. Sehr guter Matteffekt.',
    'Vernis de protection mat pour la fabrication de produits imprimés. Très bon effet mat.',
  ],
  [
    'Matt protective coating for films and non-absorbent surfaces. Visible under UV light',
    'Matter Schutzlack für Folien und nicht saugende Oberflächen. Unter UV-Licht sichtbar',
    'Vernis de protection mat pour films et surfaces non absorbantes. Visible sous lumière UV',
  ],
  [
    'Semimatt Protective coating for the production of printed products',
    'Seidenmatter Schutzlack für die Herstellung von Druckerzeugnissen',
    'Vernis de protection satiné pour la fabrication de produits imprimés',
  ],
  [
    'Semimatt Protective coating for the production of printed products. Fast Drying',
    'Seidenmatter Schutzlack für die Herstellung von Druckerzeugnissen. Schnell trocknend',
    'Vernis de protection satiné pour la fabrication de produits imprimés. Séchage rapide',
  ],
];

/** EN source text -> { DE, FR }. */
export function seedDictionary() {
  const dict = new Map();
  const put = (en, de, fr) => en && dict.set(en, { DE: de, FR: fr });

  for (const [key, en] of Object.entries(LABELS)) put(en, LABELS_DE[key], LABELS_FR[key]);
  for (const b of DEFAULT_TEXT_BLOCKS) {
    const t = BLOCKS[b.key];
    if (!t) continue;
    if (t.title) put(b.title, t.title[0], t.title[1]);
    put(b.body, t.DE.join('\n'), t.FR.join('\n'));
  }
  // The footer only holds company names and the address: the same in every language.
  const footer = DEFAULT_TEXT_BLOCKS.find((b) => b.key === 'footer');
  if (footer) put(footer.body, footer.body, footer.body);
  for (const [en, de, fr] of PHRASES) put(en, de, fr);
  return dict;
}
