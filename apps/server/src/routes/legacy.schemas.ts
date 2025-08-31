export const adminGrantGoldSchema = {
  body: {
    type: 'object',
    properties: {
      amount: { type: 'number', minimum: 0, default: 1000 },
    },
    additionalProperties: false,
  },
} as const

export const shopBuySchema = {
  body: {
    type: 'object',
    required: ['itemId'],
    properties: {
      itemId: { type: 'string', minLength: 1 },
      quantity: { type: 'number', minimum: 1, default: 1 },
    },
    additionalProperties: false,
  },
} as const

export const shopSellSchema = {
  body: {
    type: 'object',
    required: ['itemId'],
    properties: {
      itemId: { type: 'string', minLength: 1 },
      quantity: { type: 'number', minimum: 1, default: 1 },
    },
    additionalProperties: false,
  },
} as const

export const checkIdQuerySchema = {
  querystring: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 3, maxLength: 32 },
    },
    additionalProperties: false,
  },
} as const

export const shopCatalogQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      shop: { type: 'string', enum: ['market', 'restaurant'], default: 'market' },
    },
    additionalProperties: false,
  },
} as const
