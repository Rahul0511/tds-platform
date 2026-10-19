// Fixed TDS wording, taken verbatim from the BasisFormular sheet of
// TDS_Creator_EN_v6.xlsm. Editable afterwards on the "Text blocks" page.
//
// Body format: a line starting with "- " is a bullet, any other line is a
// paragraph. {{field}} is replaced with the product's value.

export const DEFAULT_TEXT_BLOCKS = [
  {
    key: 'fields_of_application',
    title: 'Fields of application',
    body: 'Sheet-fed offset printing presses with coating unit (anilox roller / chamber doctor blade) and suitable drying unit',
  },
  {
    key: 'rating_notes',
    title: 'Rating footnotes',
    body: [
      '*   From slippery to antislip (left to right)',
      '** The adhesive used should be recommended for varnished surfaces. Due to the reduced absorbency of a varnished surface, it is always better to leave out the adhesive flap. A test under practical conditions is recommended',
    ].join('\n'),
  },
  {
    key: 'foil_wrapping_note',
    title: 'Foil wrapping footnote',
    body: [
      '*  For Uncoated PP (110°C / 10kPas / 1 sec)',
      'Coated films should tested under practical conditions',
      'Acrylic coated films are not suitable',
    ].join('\n'),
  },
  {
    key: 'lab_disclaimer',
    title: 'Laboratory disclaimer',
    body: 'Please note: all specified values and properties have been determined by laboratory tests under defined conditions. The properties may also deviate slightly under different practical conditions.',
  },
  {
    key: 'processing_advice',
    title: 'Processing Advise',
    body: [
      '- Stir well before use',
      '- Recommended application weight: 4-6g/m² (wet)',
      '- Do not mix with other products',
      '- Only use solvent and alkali resistant inks. Unsuitable inks may bleed or change shade after varnishing',
      '- Only use ant set-off powders which are recommended for use with water-based OPVs',
      '- A delivery pile temperature of 35°C should not be exceeded, as this can otherwise lead to set off and blocking',
      '- Wash pipes and application units with water or, if necessary, with water / cleaning agent 19-470823-6. Avoid contamination of the coating with rinsing water. Dried coating residues can be removed with pure cleaner (observe safety instructions).',
    ].join('\n'),
  },
  {
    key: 'storage_handling',
    title: 'Storage and handling',
    body: [
      '- Store in a frost free and cool place',
      '- Store in the unopened original container. After opening, use as quickly as possible.',
      '- Shelf life: {{shelf_life_months}} months in unopened container, consume as soon as possible after opening',
      '- the viscosity may increase during storage. Before use stir well, check viscosity and dilute with a maximum of 5% water if necessary.',
    ].join('\n'),
  },
  {
    key: 'general_information',
    title: 'General Information',
    body: [
      '- the final surface properties only develop after the ink and varnish have completely dried.',
      '- If the contents of the packaging or processing aids affect the coating surface after printing, the suitability must be tested separately',
      '- Finishing with UV-varnish or hot foil requires a stable substrate surface. Metallic inks must be tape-resistant',
      '- The adhesion and scratch resistance of the UV varnish or hot foil stamping can vary depending on the surface properties of the substrate, the ink and the UV varnish or hot foil applied',
      '- Suitability for double-sided printing is influenced not only by the coating properties but also by the substrate, high ink coverage and slow-setting inks. We recommend a sufficient drying time before reprinting and a test under practical conditions.',
      '- The substrates used must be suitable for coating with aqueous OPVs.',
    ].join('\n'),
  },
  {
    key: 'compliance_intro',
    title: 'Compliance Management',
    body: [
      'For compliance with European food packaging legislation, please refer to the customer guide "Printing inks for food packaging":',
      'https://ink-safety-portal.siegwerk.com/regulatory-affairs/compliance.html',
    ].join('\n'),
  },
  {
    key: 'preservatives',
    title: 'Information on preservatives',
    body: 'Water-based products typically contain as in-can preservatives. The product contains isothiazolinone biocides, traces of methyl isothiazolinone (MIT) cannot be excluded. Such biocides may cause allergic skin reactions in already sensitized individuals.',
  },
  {
    key: 'legal_note',
    title: 'Legal note',
    body: [
      'Note: The information in this brochure reflects our current state of knowledge. It does not constitute a guarantee in the legal sense. Due to the different substrates and production conditions, this information sheet is only intended as non-binding advice. Before printing, the printer should carry out suitable tests to determine the suitability of the product for the intended purpose. This data sheet does not claim to be complete.',
      'We reserve the right to make changes to the product properties due to technical developments, changes in applicable law and production-related requirements.',
    ].join('\n'),
  },
  {
    key: 'footer',
    title: 'Footer',
    body: [
      'Siegwerk Druckfarben AG & Co. KGaA - www.siegwerk.com',
      'Siegwerk Büdingen GmbH – Industriestraße 36 – 63654 Büdingen',
    ].join('\n'),
  },
].map((b, i) => ({ ...b, sort_order: (i + 1) * 10 }));

export const DEFAULT_SETTINGS = {
  region: 'EMEA',
  series_title: 'WATER BASED SHEETFED OPV',
  product_prefix: 'FIX RAPID',
  language: 'EN',
  // 'two': Product safety and the following sections start on page 2.
  // 'one': everything on one page, scaled down to fit.
  page_layout: 'two',
};

// Values for which the Excel template hid the foil-wrapping footnote.
export const FOIL_NOTE_HIDDEN_FOR = ['no', 'not recommended', 'n.a.', 'n.a'];
