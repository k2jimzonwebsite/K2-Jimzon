/**
 * MAP-027 — development-only sample knowledge.
 *
 * This module exists so the knowledge surfaces can be worked on against a
 * database that has no approved rows yet. It is imported through a dynamic
 * `import()` behind `import.meta.env.DEV`, which a production build folds to
 * `false` — so Rollup drops this chunk entirely rather than shipping the text
 * as unreachable data, which is what the previous inline fixture did.
 *
 * It is a seed for an empty local database, never a fallback for a real one:
 * a SKU that has a record in the database is never seeded over.
 */

export const KNOWLEDGE_STATUS = {
  APPROVED: 'approved',
  DRAFT: 'draft',
  UNAVAILABLE: 'unavailable',
}

export const DEV_SEED = {
  'caffe-milano-gold': {
    fields: {
      description: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'A dark, cocoa-forward espresso blend roasted for moka and machine brewing. Whole beans, one kilogram.',
      },
      preparation: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Grind fine for espresso, medium-fine for moka. Keep the beans sealed and grind per use.',
      },
      storage: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Store sealed, away from heat and direct light. Do not refrigerate.',
      },
      uses: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Espresso, moka pot, or long black. Also works for cold brew if you grind coarse and steep overnight.',
      },
      pairings: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Good with the Mulino Bianco biscuits or anything hazelnut. Cuts through sweet pastries well.',
      },
      // A field that exists but has not been reviewed. It must not surface.
      certifications: { status: KNOWLEDGE_STATUS.DRAFT, value: 'Draft text pending staff review.' },
    },
    faqs: [
      {
        status: KNOWLEDGE_STATUS.APPROVED,
        question: 'Is this suitable for an espresso machine?',
        answer: 'Yes. Grind fine for espresso; the same beans also work in a moka pot at a slightly coarser grind.',
      },
      {
        status: KNOWLEDGE_STATUS.APPROVED,
        question: 'Are the beans already ground?',
        answer: 'No. This is sold as whole beans so it keeps longer after opening.',
      },
      {
        status: KNOWLEDGE_STATUS.DRAFT,
        question: 'Unreviewed question that must never appear publicly.',
        answer: 'Unreviewed answer.',
      },
    ],
  },
  'barilla-spaghetti': {
    fields: {
      description: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Durum wheat semolina spaghetti, cut N°5 — the standard everyday thickness.',
      },
      preparation: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Boil in well-salted water for 9–10 minutes for al dente. Reserve a little pasta water for the sauce.',
      },
      uses: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Carbonara, aglio e olio, or a simple pesto toss. Holds up to heavy meat sauces without breaking.',
      },
      pairings: {
        status: KNOWLEDGE_STATUS.APPROVED,
        value: 'Pairs with the Barilla pesto or Mutti passata already on the shelf.',
      },
    },
    faqs: [
      {
        status: KNOWLEDGE_STATUS.APPROVED,
        question: 'How long does it take to cook?',
        answer: '9–10 minutes in boiling salted water for al dente.',
      },
      {
        status: KNOWLEDGE_STATUS.APPROVED,
        question: 'What can I make with this on a weeknight?',
        answer: 'Aglio e olio needs only garlic, olive oil and chilli. About 15 minutes start to finish.',
      },
    ],
  },
}
