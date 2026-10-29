// Starting translations for DE and FR. They are inserted once, with status
// "suggested", so a person has to review and approve them. Compliance and
// legal texts in particular must be checked by the responsible department.
//
// Matching is by the exact English source text: if the English wording in the
// database was changed, the seed for that text is skipped.

import { DEFAULT_PHRASES } from './seed-content.js';

export const DEFAULT_LANGUAGES = [
  { code: 'EN', name: 'English', sort_order: 10 },
  { code: 'DE', name: 'Deutsch', sort_order: 20 },
  { code: 'FR', name: 'Français', sort_order: 30 },
];

/** Fixed words of the TDS layout (EN source). Titles and headings come from the templates. */
export const LABELS = {
  product_name: 'Product Name',
  issue: 'Issue:',
  region: 'Region:',
  date: 'Date:',
  version: 'Version:',
  page: 'Page',
  yes: 'yes',
  no: 'no',
};

// Short texts: layout labels, template titles and headings, field labels,
// table columns and values. EN -> [DE, FR].
const TERMS = [
  // Layout labels
  ['Product Name', 'Produktname', 'Nom du produit'],
  ['Issue:', 'Ausgabe:', 'Édition :'],
  ['Region:', 'Region:', 'Région :'],
  ['Date:', 'Datum:', 'Date :'],
  ['Version:', 'Version:', 'Version :'],
  ['Page', 'Seite', 'Page'],
  ['yes', 'ja', 'oui'],
  ['no', 'nein', 'non'],

  // Document titles
  ['Technical Datasheet', 'Technisches Merkblatt', 'Fiche technique'],
  ['Technical Data Sheet', 'Technisches Merkblatt', 'Fiche technique'],
  ['Technical Information', 'Technische Information', 'Information technique'],
  ['To observe:', 'Zu beachten:', 'À observer :'],
  ['TECHNICAL DATA SHEET', 'TECHNISCHES MERKBLATT', 'FICHE TECHNIQUE'],
  ['WATER BASED SHEETFED OPV', 'WASSERBASIERTER BOGENOFFSET-DRUCKLACK', "VERNIS DE SURIMPRESSION OFFSET FEUILLES À L'EAU"],

  // Section titles and headings
  ['Description / Application', 'Beschreibung / Anwendung', 'Description / Application'],
  ['Product Safety', 'Produktsicherheit', 'Sécurité du produit'],
  ['Product safety', 'Produktsicherheit', 'Sécurité du produit'],
  ['Properties / Substrates', 'Eigenschaften / Bedruckstoffe', 'Propriétés / Supports'],
  ['Printing and processing instructions', 'Druck- und Verarbeitungshinweise', "Instructions d'impression et de mise en œuvre"],
  ['Shelf life', 'Lagerfähigkeit', 'Durée de conservation'],
  ['Product list', 'Produktliste', 'Liste des produits'],
  ['Product list special shades', 'Produktliste Sonderfarbtöne', 'Liste des produits – teintes spéciales'],
  ['Intended Use', 'Bestimmungsgemäße Verwendung', 'Usage prévu'],
  ['Properties', 'Eigenschaften', 'Propriétés'],
  ['Substrates', 'Bedruckstoffe', 'Supports'],
  ['Special applications', 'Spezielle Anwendungen', 'Applications spéciales'],
  ['Anilox rollers', 'Rasterwalzen', 'Rouleaux anilox'],
  ['Guidelines for use', 'Anwendungshinweise', "Conseils d'utilisation"],
  ['Cleaning', 'Reinigung', 'Nettoyage'],
  ['Product description', 'Produktbeschreibung', 'Description du produit'],
  ['Fields of application', 'Einsatzgebiete', "Domaines d'application"],
  ['Processing Advise', 'Verarbeitungshinweise', 'Conseils de mise en œuvre'],
  ['Storage and handling', 'Lagerung und Handhabung', 'Stockage et manipulation'],
  ['General Information', 'Allgemeine Hinweise', 'Informations générales'],
  ['Compliance Management', 'Compliance-Management', 'Gestion de la conformité'],
  ['Information on preservatives', 'Hinweis zu Konservierungsmitteln', 'Information sur les conservateurs'],

  // Key-value labels and formats
  ['Viscosity [Pa*s]', 'Viskosität [Pa*s]', 'Viscosité [Pa*s]'],
  ['CoF (DIN 53375)', 'Reibungskoeffizient (DIN 53375)', 'Coefficient de friction (DIN 53375)'],
  ['static', 'statisch', 'statique'],
  ['dynamic', 'dynamisch', 'dynamique'],
  ['Recommended substrates:', 'Empfohlene Bedruckstoffe:', 'Supports recommandés :'],
  ['Viscosity (upon delivery)', 'Viskosität (Lieferzustand)', 'Viscosité (à la livraison)'],
  ['DIN-Cup 4 / 23°C', 'DIN-Becher 4 / 23°C', 'Coupe DIN 4 / 23°C'],
  ['Mass Density', 'Dichte', 'Masse volumique'],
  ['Solid content', 'Festkörpergehalt', 'Extrait sec'],
  ['up to {value}', 'bis {value}', "jusqu'à {value}"],
  ['COF *', 'Reibungskoeffizient (COF) *', 'Coefficient de friction (COF) *'],
  ['Gluability **', 'Verklebbarkeit **', 'Collabilité **'],

  // Field labels
  ['Gloss', 'Glanz', 'Brillance'],
  ['Rub Resistance', 'Scheuerfestigkeit', 'Résistance au frottement'],
  ['Block Resistance', 'Blockfestigkeit', 'Résistance au bloquage'],
  ['Drying', 'Trocknung', 'Séchage'],
  ['Hot Foil Stamping', 'Heißfolienprägung', 'Marquage à chaud'],
  ['Foil Lamination', 'Folienkaschierung', 'Pelliculage'],
  ['UV-Coating', 'UV-Lackierung', 'Vernissage UV'],
  ['pH-value', 'pH-Wert', 'Valeur pH'],
  ['Double sided printing', 'Schön- und Widerdruck', 'Impression recto-verso'],
  ['Heat Resistance', 'Hitzebeständigkeit', 'Résistance à la chaleur'],
  ['Foil Wrapping', 'Folieneinschlag', 'Emballage sous film'],
  ['Deep-freezing of printed goods', 'Tiefkühlung der Druckprodukte', 'Surgélation des produits imprimés'],

  // Table columns and values
  ['Application', 'Anwendung', 'Application'],
  ['Screen [l/cm]', 'Raster [L/cm]', 'Linéature [l/cm]'],
  ['Dip volume [cm³/m²]', 'Schöpfvolumen [cm³/m²]', 'Volume de godet [cm³/m²]'],
  ['Product name', 'Produktname', 'Nom du produit'],
  ['Product number', 'Produktnummer', 'Numéro de produit'],
  ['Lightresistance on woolscale WS ISO 12040', 'Lichtechtheit Wollskala WS ISO 12040', 'Solidité à la lumière échelle de laine WS ISO 12040'],
  ['Alcali-/ Soap-Resistance ISO 2836', 'Alkali-/Seifenechtheit ISO 2836', 'Résistance aux alcalis/au savon ISO 2836'],
  ['Alcohol-Resistance ISO 2836', 'Alkoholechtheit ISO 2836', "Résistance à l'alcool ISO 2836"],
  ['Solvent-Resistance ISO 2836', 'Lösemittelechtheit ISO 2836', 'Résistance aux solvants ISO 2836'],
  ['Sterilization Resistance in Steam 121°C / 45 min', 'Sterilisationsbeständigkeit in Dampf 121°C / 45 min', 'Résistance à la stérilisation à la vapeur 121°C / 45 min'],
  ['Yes', 'Ja', 'Oui'],
  ['No', 'Nein', 'Non'],
  ['Limited', 'Bedingt', 'Limitée'],
];

// Phrase library: DE and FR per phrase key, same line structure as the English.
const PHRASE_TRANSLATIONS = {
  'safety.food_line.yes': { DE: ['Lebensmittelverpackungen, Pharma oder Hygiene: **JA**'], FR: ["Emballages alimentaires, pharmaceutiques ou d'hygiène : **OUI**"] },
  'safety.food_line.no': { DE: ['Lebensmittelverpackungen, Pharma oder Hygiene: **NEIN**'], FR: ["Emballages alimentaires, pharmaceutiques ou d'hygiène : **NON**"] },
  'safety.nph': {
    DE: [
      '## Nur für Druckfarben für Lebensmittelverpackungen',
      'Diese Druckfarben sind nur für die Anwendung auf der lebensmittelabgewandten Seite von Lebensmittelverpackungen geeignet, sofern sie gemäß der einschlägigen Guten Herstellungspraxis (ein System, das sicherstellt, dass Produkte gleichbleibend nach Qualitätsstandards hergestellt und geprüft werden) und gemäß den Hinweisen in diesem Technischen Merkblatt verarbeitet werden.',
      'Drucker, Verarbeiter und Abpacker/Abfüller sind jeweils dafür verantwortlich, dass der fertige – bedruckte – Artikel für den/die vorgesehenen Zweck(e) geeignet ist und die Bestandteile von Farbe und Lack nicht in Mengen in das Lebensmittel übergehen, die gesetzliche, behördliche und branchenübliche Anforderungen überschreiten.',
      'Weitere regulatorische Informationen finden Sie im „Statement of Composition“ von Siegwerk.',
      'Bei besonderen Anwendungen wenden Sie sich bitte an Ihre anwendungstechnische Beratung.',
    ],
    FR: [
      '## Uniquement pour les encres pour emballages alimentaires',
      "Ces encres conviennent uniquement à une utilisation sur la face sans contact alimentaire des emballages alimentaires, à condition d'être appliquées selon les Bonnes Pratiques de Fabrication applicables (un système garantissant que les produits sont fabriqués et contrôlés de manière constante selon des normes de qualité) et selon les indications de la présente fiche technique.",
      "L'imprimeur, le transformateur et le conditionneur/remplisseur sont chacun responsables de garantir que l'article fini – imprimé – convient à l'usage ou aux usages prévus et que les composants de l'encre et du vernis ne migrent pas dans les aliments à des niveaux dépassant les exigences légales, réglementaires et industrielles.",
      'Pour toute information réglementaire complémentaire, veuillez consulter le « Statement of Composition » de Siegwerk.',
      "Pour des applications spécifiques, veuillez contacter votre service technique d'application.",
    ],
  },
  'safety.non_nph': {
    DE: [
      'Nur für Lebensmittelverpackungen zulässig, wenn die Verarbeitungsbedingungen ein Abklatschen in der Rolle oder im Stapel ausschließen und die Gestaltung des fertigen Druckerzeugnisses eine zuverlässige funktionelle Barriere gegen Migration gewährleistet.',
    ],
    FR: [
      "Acceptable pour les emballages alimentaires uniquement si les conditions de transformation excluent tout risque de maculage dans la bobine ou la pile et si la conception de l'article imprimé fini garantit une barrière fonctionnelle fiable contre la migration.",
    ],
  },
  'safety.know_how': {
    DE: [
      'Weitere Informationen finden Sie im Kundenleitfaden von Siegwerk „Druckfarben für Lebensmittelverpackungen“ („Know How“) unter https://www.siegwerk.com/en/our-responsibility/product-responsibility/customer-communications/food-packaging-safety.html; insbesondere ist Kapitel 5 „Die Farbauswahl des Druckers“ zu beachten.',
    ],
    FR: [
      "Pour plus d'informations, veuillez consulter le guide client de Siegwerk « Encres d'impression pour emballages alimentaires » (« Know How ») sur https://www.siegwerk.com/en/our-responsibility/product-responsibility/customer-communications/food-packaging-safety.html ; le chapitre 5 « Le choix de l'encre par l'imprimeur » doit notamment être respecté.",
    ],
  },
  doubt: {
    DE: ['Im Zweifelsfall wenden Sie sich bitte rechtzeitig an unsere technische Abteilung.'],
    FR: ['En cas de doute, veuillez contacter à temps notre service technique.'],
  },
  'shelf_life.inks': {
    DE: [
      'Die Farben dieser Serie haben unter normalen Bedingungen eine Lagerfähigkeit von **mindestens {{shelf_life_months}} Monaten**. Innerhalb dieses Zeitraums sind die Produkte entsprechend den Angaben dieses Merkblatts verwendbar.',
    ],
    FR: [
      'Dans des conditions normales, les encres de cette série se conservent **au moins {{shelf_life_months}} mois**. Pendant cette période, les produits sont utilisables conformément aux indications de la présente fiche technique.',
    ],
  },
  'shelf_life.varnish': {
    DE: [
      'Dieser Lack hat unter normalen Bedingungen eine Lagerfähigkeit von **mindestens {{shelf_life_months}} Monaten**. Innerhalb dieses Zeitraums ist das Produkt entsprechend den Angaben dieses Merkblatts verwendbar.',
    ],
    FR: [
      'Dans des conditions normales, ce vernis se conserve **au moins {{shelf_life_months}} mois**. Pendant cette période, le produit est utilisable conformément aux indications de la présente fiche technique.',
    ],
  },
  'shelf_life.product': {
    DE: [
      'Dieses Produkt hat unter normalen Bedingungen eine Lagerfähigkeit von **mindestens {{shelf_life_months}} Monaten**. Innerhalb dieses Zeitraums ist das Produkt entsprechend den Angaben dieses Merkblatts verwendbar.',
    ],
    FR: [
      'Dans des conditions normales, ce produit se conserve **au moins {{shelf_life_months}} mois**. Pendant cette période, le produit est utilisable conformément aux indications de la présente fiche technique.',
    ],
  },
  'shelf_life.conditions': {
    DE: [
      'Normale Bedingungen bedeuten:',
      '- Lagerung in fest verschlossenen, noch nicht angebrochenen Gebinden.',
      '- Temperaturen nicht über 20°C für Wochen bzw. 25°C für Tage.',
      '- Geöffnete Gebinde nicht direktem Sonnenlicht oder starken Lichtquellen aussetzen.',
    ],
    FR: [
      'Par conditions normales, on entend :',
      '- Stockage dans des emballages bien fermés et non entamés.',
      '- Températures ne dépassant pas 20°C pendant plusieurs semaines ou 25°C pendant quelques jours.',
      '- Ne pas exposer les emballages ouverts à la lumière directe du soleil ou à des sources lumineuses intenses.',
    ],
  },
  'cleaning.product': {
    DE: ['Das Produkt kann mit {{cleaning_agent}} von den Werkzeugen entfernt werden.'],
    FR: ["Le produit peut être éliminé des outils à l'aide de {{cleaning_agent}}."],
  },
  'disclaimer.advisory': {
    DE: [
      'Aufgrund der Unterschiede bei Bedruckstoffen, Verarbeitungsbedingungen und Prüfkriterien kann dieses Technische Merkblatt nur beratenden Charakter haben. Unsere Angaben entsprechen dem neuesten Stand unserer Kenntnisse und beruhen auf im Labor ermittelten Eigenschaften sowie auf Praxiserfahrungen. Eigene Versuche mit den Originalmaterialien unter den jeweiligen Bedingungen sind unerlässlich.',
      'Für Anwendungen, für die dieses Produkt nicht vorgesehen ist, übernehmen wir keine Haftung.',
    ],
    FR: [
      "En raison des différences entre les supports d'impression, les conditions de transformation et les critères d'essai, la présente fiche technique n'a qu'une valeur de conseil. Nos données reflètent l'état actuel de nos connaissances et reposent sur des caractéristiques établies en laboratoire ainsi que sur l'expérience pratique. Vos propres essais avec les matériaux d'origine dans les conditions respectives sont indispensables.",
      "Nous déclinons toute responsabilité pour les applications auxquelles ce produit n'est pas destiné.",
    ],
  },
  'nw.anilox_intro': {
    DE: ['Je nach Druckbild und Bedruckstoff können z. B. die folgenden oder noch feinere lasergravierte Rasterwalzen (mit Rakel) eingesetzt werden:'],
    FR: ["Selon le motif d'impression et le support, on peut utiliser par exemple les rouleaux anilox gravés au laser suivants, ou des rouleaux encore plus fins (avec racle) :"],
  },
  'nw.guidelines.inks': {
    DE: [
      'Vor Beginn des Druckauftrags müssen neue Materialien auf ihre Verträglichkeit mit den Farben dieser Serie bzw. mit der geplanten Farb-/Überdrucklack-Kombination geprüft werden, auch wenn ihre Eignung an einem vergleichbaren Typ derselben Bedruckstoffgruppe nachgewiesen ist.',
      'Die Andrucke, insbesondere auf Selbstklebeetiketten, sind nach dem Stanzen (vor allem an den Kanten) auf Haftung, Kratz- und Wasserfestigkeit (Nasskratz- und Nassscheuerfestigkeit), Haftung und Kratzfestigkeit nach dem Heißsiegeln, Beständigkeit der Druckfarbe gegenüber dem Füllgut sowie weitere anwendungsspezifische Anforderungen zu prüfen.',
      'Aufgrund der Nachhärtung können sich diese Eigenschaften in den ersten 24 Stunden nach dem Druck verändern. Bitte prüfen Sie daher nach einem Tag erneut.',
      'Folglich sind bei jedem neuen Auftrag, bei dem auf ein bekanntes Material, jedoch mit ungeprüften Farb- und Druckkombinationen gedruckt wird, die oben genannten Prüfungen ebenfalls durchzuführen.',
    ],
    FR: [
      "Avant de commencer le travail d'impression, les nouveaux matériaux doivent être testés quant à leur compatibilité avec les encres de cette série ou avec la combinaison encre/vernis de surimpression prévue, même si leur aptitude a été démontrée sur un type comparable du même groupe de supports.",
      "Les épreuves, en particulier sur étiquettes autocollantes, doivent être examinées après découpe (notamment sur les bords) pour l'adhérence, la résistance à la rayure et à l'eau (résistance à la rayure et au frottement humides), l'adhérence et la résistance à la rayure après thermoscellage, la résistance de l'encre imprimée au produit emballé et les autres exigences spécifiques à l'application.",
      "En raison de la post-polymérisation, ces propriétés peuvent évoluer pendant les 24 premières heures suivant l'impression. Veuillez donc effectuer un nouveau contrôle après un jour.",
      "Par conséquent, pour chaque nouveau travail réalisé sur un matériau connu mais avec des combinaisons d'encres et d'impression non testées, les essais mentionnés ci-dessus doivent également être effectués.",
    ],
  },
  'nw.guidelines.varnish': {
    DE: [
      'Vor Beginn des Druckauftrags müssen neue Materialien auf ihre Verträglichkeit mit der geplanten Lack-/Farbkombination geprüft werden, auch wenn ihre Eignung an einem vergleichbaren Typ derselben Bedruckstoffgruppe nachgewiesen ist.',
      'Die Andrucke, insbesondere auf Selbstklebeetiketten, sind nach dem Stanzen (vor allem an den Kanten) auf Haftung, Kratz- und Wasserfestigkeit (Nasskratz- und Nassscheuerfestigkeit), Beständigkeit gegenüber dem Füllgut sowie weitere auftragsspezifische Anforderungen zu prüfen. Aufgrund möglicher unterschiedlicher Materialschrumpfung und anderer Veränderungen sind diese Prüfungen nach einem Tag zu wiederholen.',
      'Verlauf/Verdruckbarkeit, mechanische Beständigkeiten (z. B. Haftung, Falzfestigkeit, Stanzfestigkeit), Wasser- und Wetterbeständigkeit und insbesondere die Beständigkeiten gegenüber dem Füllgut hängen weitgehend von den Eigenschaften der vorgedruckten Farben ab. Dies gilt besonders, wenn der Farbfilm an der Stanzkante freiliegt und damit seitlichem Angriff ausgesetzt ist.',
      'Folglich sind bei jedem neuen Auftrag, bei dem auf ein bekanntes Material, jedoch mit ungeprüften Farb- und Druckkombinationen gedruckt wird, die oben genannten Prüfungen ebenfalls durchzuführen.',
    ],
    FR: [
      "Avant de commencer le travail d'impression, les nouveaux matériaux doivent être testés quant à leur compatibilité avec la combinaison vernis/encres prévue, même si leur aptitude a été démontrée sur un type comparable du même groupe de supports.",
      "Les épreuves, en particulier sur étiquettes autocollantes, doivent être examinées après découpe (notamment sur les bords) pour l'adhérence, la résistance à la rayure et à l'eau (résistance à la rayure et au frottement humides), la résistance au produit emballé et les autres exigences spécifiques au travail. En raison d'un éventuel retrait différent des matériaux et d'autres modifications, ces contrôles doivent être répétés après un jour.",
      "L'étalement/l'imprimabilité, les résistances mécaniques (par ex. adhérence, résistance au pliage, résistance à la découpe), la résistance à l'eau et aux intempéries et en particulier les résistances aux produits emballés dépendent largement des propriétés des encres préimprimées. Cela s'applique tout particulièrement lorsque le film d'encre est exposé sur le bord de découpe et donc soumis à une attaque latérale.",
      "Par conséquent, pour chaque nouveau travail réalisé sur un matériau connu mais avec des combinaisons d'encres et d'impression non testées, les essais mentionnés ci-dessus doivent également être effectués.",
    ],
  },
  'nw.guidelines.adhesive': {
    DE: [
      'Vor Beginn eines Druckauftrags müssen alle neuen Materialien auf ihre Verträglichkeit mit der vorgesehenen Kombination aus Kaschierklebstoff und Farbe geprüft werden, auch wenn die Eignung bereits an einem vergleichbaren Bedruckstoff derselben Materialgruppe nachgewiesen wurde.',
      'Andrucke, insbesondere auf Selbstklebeetiketten, müssen nach dem Stanzen (vor allem an den Kanten) auf ihre Verbundhaftung geprüft werden. Bei Bedarf sind zusätzliche Prüfungen der Beständigkeit gegenüber Wasser, Füllgut und weiteren auftragsspezifischen Bedingungen durchzuführen.',
      'Aufgrund möglicher Materialschrumpfung oder anderer Veränderungen sind diese Prüfungen nach 24 Stunden zu wiederholen.',
      'Dementsprechend sind die oben genannten Prüfungen bei jedem neuen Auftrag mit einem bekannten Bedruckstoff, aber einer neuen Kombination aus Farben und Druckparametern durchzuführen.',
    ],
    FR: [
      "Avant de commencer un travail d'impression, tous les nouveaux matériaux doivent être testés quant à leur compatibilité avec la combinaison adhésif de contrecollage/encre prévue, même si l'aptitude a déjà été démontrée sur un support comparable du même groupe de matériaux.",
      "Les épreuves, en particulier sur étiquettes autocollantes, doivent être évaluées après découpe (notamment sur les bords) pour la force d'adhésion. Si nécessaire, des essais supplémentaires doivent être réalisés pour évaluer la résistance à l'eau, au produit emballé et aux autres conditions spécifiques au travail.",
      "En raison d'un éventuel retrait des matériaux ou d'autres modifications, ces évaluations doivent être répétées après 24 heures.",
      "En conséquence, les essais ci-dessus doivent être effectués pour chaque nouveau travail utilisant un support connu mais une nouvelle combinaison d'encres et de paramètres d'impression.",
    ],
  },
  'nw.varnish.ink_selection': {
    DE: [
      'Optimale Ergebnisse werden erzielt, wenn bei der Auswahl der Druckfarben folgende Kriterien beachtet werden:',
      '- Vorzugsweise radikalisch härtende UV-Buchdruck-, UV-Offset-, UV-Siebdruck- oder UV-Flexofarben.',
      '- Bestmögliche Haftung und Wasserbeständigkeit auf dem zu bedruckenden Bedruckstoff.',
      '- Bestmögliche Beständigkeit der verwendeten Farbserie gegenüber dem Füllgut.',
      '- Ausschluss bestimmter Farbtöne mit Pigmenten, die eine geringe Beständigkeit gegenüber dem vorgesehenen Füllgut aufweisen, z. B. geringe Licht- und Wetterechtheit.',
    ],
    FR: [
      "Des performances optimales sont obtenues en appliquant les critères suivants lors du choix des encres d'impression :",
      '- De préférence des encres UV radicalaires typographiques, offset, sérigraphiques ou flexographiques.',
      "- Meilleure adhérence et résistance à l'eau possibles sur le support à imprimer.",
      "- Meilleure résistance possible de la série d'encres utilisée au produit emballé.",
      '- Exclusion des teintes contenant des pigments peu résistants au produit emballé prévu, par ex. faible solidité à la lumière et aux intempéries.',
    ],
  },
  'nw.stir_up': {
    DE: ['Jede Farbe bzw. jeden Lack vor Gebrauch gut aufrühren. Vor allem Weiß, weißhaltige Farbtöne, Lacke, Mattlacke sowie Gold- und Silberfarben zeigen eine Sedimentation wesentlicher Bestandteile.'],
    FR: ['Bien homogénéiser chaque encre ou vernis avant emploi. Les blancs, les teintes contenant du blanc, les vernis, les vernis mats ainsi que les encres or et argent présentent notamment une sédimentation de composants essentiels.'],
  },
  'nw.sds.inks': {
    DE: ['Produkte nicht ohne Kenntnis der zugehörigen Sicherheitsdatenblätter handhaben. Wir liefern diese mit der ersten Lieferung.'],
    FR: ['Ne pas manipuler les produits sans avoir consulté les fiches de données de sécurité correspondantes. Nous les fournissons avec la première livraison.'],
  },
  'nw.sds.other': {
    DE: ['Bitte beachten Sie auch die Hinweise im Sicherheitsdatenblatt.'],
    FR: ['Veuillez également consulter les informations de la fiche de données de sécurité.'],
  },
  'nw.cleaning.inks': {
    DE: ['Die Farben können mit {{cleaning_agent}} von Walzen und Werkzeugen entfernt werden.', 'Reaktive UV-Verdünner sind zur Reinigung nicht geeignet.'],
    FR: ["Les encres peuvent être éliminées des rouleaux et des outils à l'aide de {{cleaning_agent}}.", 'Les diluants UV réactifs ne conviennent pas au nettoyage.'],
  },
  'nw.cleaning.varnish': {
    DE: ['Der Lack kann mit {{cleaning_agent}} von den Werkzeugen entfernt werden.'],
    FR: ["Le vernis peut être éliminé des outils à l'aide de {{cleaning_agent}}."],
  },
  'nw.cleaning.adhesive': {
    DE: ['Der Klebstoff kann mit {{cleaning_agent}} von den Werkzeugen entfernt werden.'],
    FR: ["L'adhésif peut être éliminé des outils à l'aide de {{cleaning_agent}}."],
  },
  'nw.light_resistance': {
    DE: [
      '## Lichtechtheit',
      'Die Lichtechtheitswerte beziehen sich auf einen Volltondruck. Die Lichtechtheit nimmt ab, wenn die Farbstärke reduziert wird oder Farben gemischt werden.',
      'Dies gilt auch für die anderen in der Produktliste genannten Beständigkeiten.',
      'Dieses TDS gilt auch für alle Farbmischungen, die aus den aufgeführten Grundkomponenten bestehen. Lichtechtheit und Beständigkeiten einer Mischung richten sich immer nach der geringsten bzw. schwächsten Eigenschaft der verwendeten Einzelkomponenten.',
    ],
    FR: [
      '## Résistance à la lumière',
      "Les valeurs de solidité à la lumière se rapportent à une impression en aplat. La solidité à la lumière diminue lorsque l'intensité de la couleur est réduite ou lorsque les couleurs sont mélangées.",
      "Cela s'applique également aux autres résistances mentionnées dans la liste des produits.",
      "Cette fiche technique est également valable pour tous les mélanges de couleurs composés des composants de base indiqués. La solidité à la lumière et les résistances d'un mélange correspondent toujours à la propriété la plus faible des composants individuels utilisés.",
    ],
  },
  'fp.guidelines': {
    DE: [
      'Vor Beginn des Druckauftrags müssen neue Materialien auf ihre Verträglichkeit mit den Farben dieser Serie geprüft werden, auch wenn ihre Eignung an einem vergleichbaren Typ derselben Bedruckstoffgruppe nachgewiesen ist.',
      'Bei jedem neuen Auftrag mit ungeprüften Farb- und Druckkombinationen sind Haftung, Beständigkeiten und weitere anwendungsspezifische Anforderungen vor der Produktion zu prüfen.',
    ],
    FR: [
      "Avant de commencer le travail d'impression, les nouveaux matériaux doivent être testés quant à leur compatibilité avec les encres de cette série, même si leur aptitude a été démontrée sur un type comparable du même groupe de supports.",
      "Pour chaque nouveau travail avec des combinaisons d'encres et d'impression non testées, l'adhérence, les résistances et les autres exigences spécifiques à l'application doivent être testées avant la production.",
    ],
  },
  'sf.intended.nph': {
    DE: ['{{sales_code}} ist für den Druck von NPH-Verpackungen (Nahrungsmittel, Pharma und Hygiene) in der Region EMEA bestimmt.'],
    FR: ["{{sales_code}} est destiné à l'impression d'emballages NPH (nutrition, pharmacie et hygiène) dans la zone EMEA."],
  },
  'sf.intended.dfc': {
    DE: ['{{sales_code}} ist für den Druck von Verpackungen mit direktem Lebensmittelkontakt in der Region EMEA bestimmt.'],
    FR: ["{{sales_code}} est destiné à l'impression d'emballages en contact direct avec les aliments dans la zone EMEA."],
  },
};

// Sheetfed phrases (unchanged wording of the first release).
const SF_BLOCKS = {
  'nw.guidelines.opaque_white': {
    DE: [
      'Vor Beginn des Druckauftrags müssen neue Materialien auf ihre Verträglichkeit mit den Deckweiß-Druckfarben dieser Serie bzw. mit der geplanten Farb-/Überdrucklack-Kombination geprüft werden, auch wenn ihre Eignung auf einem vergleichbaren Typ derselben Bedruckstoffgruppe nachgewiesen ist.',
      'Die Andrucke, insbesondere auf Selbstklebeetiketten, sind nach dem Stanzen (vor allem an den Kanten) auf Haftung, Kratz- und Wasserfestigkeit (Nasskratz- und Nassscheuerfestigkeit), Haftung und Kratzfestigkeit nach dem Heißsiegeln, Beständigkeit der gedruckten Farbe gegenüber dem Füllgut sowie weitere anwendungsspezifische Anforderungen zu prüfen.',
      'Aufgrund der Nachhärtung können sich diese Eigenschaften in den ersten 24 Stunden nach dem Druck verändern. Bitte daher nach einem Tag erneut prüfen.',
      'Folglich sind bei jedem neuen Auftrag, bei dem auf ein bekanntes Material, jedoch mit ungeprüften Farb- und Druckkombinationen gedruckt wird, die oben genannten Prüfungen ebenfalls durchzuführen.',
    ],
    FR: [
      "Avant de lancer le travail d'impression, les nouveaux matériaux doivent être contrôlés quant à leur compatibilité avec les encres blanches couvrantes de cette série ou avec la combinaison encre/vernis de surimpression prévue, même si leur aptitude sur un type comparable du même groupe de supports a été démontrée.",
      "Les épreuves, en particulier sur étiquettes autocollantes, doivent être examinées après découpe (surtout sur les bords) quant à l'adhérence, la résistance à la rayure et à l'eau (rayure et frottement humides), l'adhérence et la résistance à la rayure après thermoscellage, la résistance de l'encre imprimée au contenu de l'emballage et aux autres exigences spécifiques à l'application.",
      'En raison de la post-réticulation, ces propriétés peuvent évoluer pendant les 24 premières heures suivant l’impression. Veuillez donc effectuer un nouveau contrôle après un jour.',
      "Par conséquent, pour chaque nouveau travail imprimé sur un matériau connu mais avec des combinaisons d'encres et d'impression non testées, les essais mentionnés ci-dessus doivent également être réalisés.",
    ],
  },
  'sf.fields_of_application': {
    DE: ['Bogenoffsetdruckmaschinen mit Lackwerk (Rasterwalze / Kammerrakel) und geeigneter Trocknung'],
    FR: ["Presses offset feuilles équipées d'un groupe de vernissage (rouleau anilox / racle à chambre) et d'un système de séchage adapté"],
  },
  'sf.rating_notes': {
    DE: [
      '*   Von glatt bis rutschfest (von links nach rechts)',
      '** Der verwendete Klebstoff sollte für lackierte Oberflächen empfohlen sein. Aufgrund der geringeren Saugfähigkeit einer lackierten Oberfläche ist es stets besser, die Klebelasche auszusparen. Ein Test unter Praxisbedingungen wird empfohlen',
    ],
    FR: [
      '*   De glissant à antidérapant (de gauche à droite)',
      "** La colle utilisée doit être recommandée pour les surfaces vernies. En raison de l'absorption réduite d'une surface vernie, il est toujours préférable d'épargner la patte de collage. Un essai dans les conditions réelles est recommandé",
    ],
  },
  'sf.foil_wrapping_note': {
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
  'sf.lab_disclaimer': {
    DE: [
      'Bitte beachten: Alle angegebenen Werte und Eigenschaften wurden durch Labortests unter definierten Bedingungen ermittelt. Unter abweichenden Praxisbedingungen können die Eigenschaften leicht abweichen.',
    ],
    FR: [
      "Remarque : toutes les valeurs et propriétés indiquées ont été déterminées par des essais en laboratoire dans des conditions définies. Dans d'autres conditions réelles, les propriétés peuvent légèrement différer.",
    ],
  },
  'sf.processing_advice': {
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
  'sf.storage_handling': {
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
  'sf.general_information': {
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
  'sf.compliance_intro': {
    DE: [
      'Zur Einhaltung der europäischen Gesetzgebung für Lebensmittelverpackungen beachten Sie bitte den Kundenleitfaden „Druckfarben für Lebensmittelverpackungen“:',
      'https://ink-safety-portal.siegwerk.com/regulatory-affairs/compliance.html',
    ],
    FR: [
      "Pour la conformité à la législation européenne sur les emballages alimentaires, veuillez consulter le guide client « Encres d'impression pour emballages alimentaires » :",
      'https://ink-safety-portal.siegwerk.com/regulatory-affairs/compliance.html',
    ],
  },
  'sf.preservatives': {
    DE: [
      'Wasserbasierte Produkte enthalten üblicherweise Topfkonservierungsmittel. Das Produkt enthält Isothiazolinon-Biozide; Spuren von Methylisothiazolinon (MIT) können nicht ausgeschlossen werden. Solche Biozide können bei bereits sensibilisierten Personen allergische Hautreaktionen hervorrufen.',
    ],
    FR: [
      "Les produits à base d'eau contiennent généralement des conservateurs en pot. Le produit contient des biocides de type isothiazolinone ; des traces de méthylisothiazolinone (MIT) ne peuvent être exclues. Ces biocides peuvent provoquer des réactions cutanées allergiques chez les personnes déjà sensibilisées.",
    ],
  },
  'sf.legal_note': {
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

// Compliance texts by intended use: EN, DE, FR (blank lines of the first release removed).
const SF_COMPLIANCE = {
  'sf.compliance.nph': [
    'Further regulatory information can be found in Siegwerk\'s "Statement of Composition".\n\nThe product is suitable for use on the non-food contact side of food packaging provided it is used in accordance with the relevant Good Manufacturing Practices (GMP) and in accordance with the information in this Technical Data Sheet. Application on the food contact side is not recommended.\nThe printer, converter and packer/filler are legally responsible for ensuring that the finished article is suitable for the intended purpose(s) and that the ink and coating components do not migrate into the food in quantities that exceed legal and industry requirements.',
    'Weitere regulatorische Informationen finden Sie im „Statement of Composition“ von Siegwerk.\n\nDas Produkt ist für die Anwendung auf der lebensmittelabgewandten Seite von Lebensmittelverpackungen geeignet, sofern es gemäß der einschlägigen Guten Herstellungspraxis (GMP) und gemäß den Angaben in diesem Technischen Merkblatt eingesetzt wird. Eine Anwendung auf der lebensmittelzugewandten Seite wird nicht empfohlen.\nDrucker, Verarbeiter und Abpacker/Abfüller sind rechtlich dafür verantwortlich, dass der fertige Artikel für den/die vorgesehenen Zweck(e) geeignet ist und die Bestandteile von Farbe und Lack nicht in Mengen in das Lebensmittel übergehen, die gesetzliche und branchenübliche Anforderungen überschreiten.',
    "Des informations réglementaires complémentaires figurent dans le « Statement of Composition » de Siegwerk.\n\nLe produit convient à une utilisation sur la face externe (sans contact alimentaire) des emballages alimentaires, à condition d'être utilisé conformément aux Bonnes Pratiques de Fabrication (BPF) applicables et aux informations de la présente fiche technique. L'application sur la face en contact avec les aliments n'est pas recommandée.\nL'imprimeur, le transformateur et le conditionneur/remplisseur sont légalement responsables de garantir que l'article fini convient à l'usage ou aux usages prévus et que les composants de l'encre et du vernis ne migrent pas dans les aliments en quantités dépassant les exigences légales et industrielles.",
  ],
  'sf.compliance.dfc': [
    'Further regulatory information can be found in Siegwerk\'s "Statement of Composition".\n\nThe product is suitable for use on the non-food contact side of food packaging provided it is used in accordance with the relevant Good Manufacturing Practices (GMP) and in accordance with the information in this Technical Data Sheet. Application on the food contact side is only recommended for dry foods and dry and fatty foods. Additionally, an individual migration test under practical conditions (due to high variety of substrates and application weights) is mandatory. The printer, converter and packer/filler are legally responsible for ensuring that the finished article is suitable for the intended purpose(s) and that the ink and coating components do not migrate into the food in quantities that exceed legal and industry requirements. For information on the food legislation assessment of this product, please contact our PSR-Department. \nEmail: psr-emea@siegwerk.com',
    'Weitere regulatorische Informationen finden Sie im „Statement of Composition“ von Siegwerk.\n\nDas Produkt ist für die Anwendung auf der lebensmittelabgewandten Seite von Lebensmittelverpackungen geeignet, sofern es gemäß der einschlägigen Guten Herstellungspraxis (GMP) und gemäß den Angaben in diesem Technischen Merkblatt eingesetzt wird. Eine Anwendung auf der lebensmittelzugewandten Seite wird nur für trockene sowie trockene und fetthaltige Lebensmittel empfohlen. Zusätzlich ist eine individuelle Migrationsprüfung unter Praxisbedingungen (aufgrund der großen Vielfalt an Bedruckstoffen und Auftragsgewichten) zwingend erforderlich. Drucker, Verarbeiter und Abpacker/Abfüller sind rechtlich dafür verantwortlich, dass der fertige Artikel für den/die vorgesehenen Zweck(e) geeignet ist und die Bestandteile von Farbe und Lack nicht in Mengen in das Lebensmittel übergehen, die gesetzliche und branchenübliche Anforderungen überschreiten. Für Informationen zur lebensmittelrechtlichen Bewertung dieses Produkts wenden Sie sich bitte an unsere PSR-Abteilung.\nE-Mail: psr-emea@siegwerk.com',
    "Des informations réglementaires complémentaires figurent dans le « Statement of Composition » de Siegwerk.\n\nLe produit convient à une utilisation sur la face externe (sans contact alimentaire) des emballages alimentaires, à condition d'être utilisé conformément aux Bonnes Pratiques de Fabrication (BPF) applicables et aux informations de la présente fiche technique. L'application sur la face en contact avec les aliments n'est recommandée que pour les aliments secs ainsi que secs et gras. De plus, un essai de migration individuel dans les conditions réelles (en raison de la grande diversité des supports et des grammages) est obligatoire. L'imprimeur, le transformateur et le conditionneur/remplisseur sont légalement responsables de garantir que l'article fini convient à l'usage ou aux usages prévus et que les composants de l'encre et du vernis ne migrent pas dans les aliments en quantités dépassant les exigences légales et industrielles. Pour toute information sur l'évaluation de ce produit au regard de la législation alimentaire, veuillez contacter notre service PSR.\nE-mail : psr-emea@siegwerk.com",
  ],
};

// Drop-down values and product descriptions of the Sheetfed Excel: EN -> [DE, FR].
const PHRASES = [
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
  const flat = (s) => s.replace(/ ?\n\n/g, '\n').replace(/ \n/g, '\n');

  for (const [en, de, fr] of TERMS) put(en, de, fr);
  for (const p of DEFAULT_PHRASES) {
    const t = PHRASE_TRANSLATIONS[p.key] ?? SF_BLOCKS[p.key];
    if (t) put(p.body, t.DE.join('\n'), t.FR.join('\n'));
    const c = SF_COMPLIANCE[p.key];
    if (c) put(p.body, flat(c[1]), flat(c[2]));
  }
  for (const [en, de, fr] of PHRASES) put(en, de, fr);
  return dict;
}
