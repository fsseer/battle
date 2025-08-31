export const trainingRunSchema = {
  body: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const

export const trainingQuickSchema = {
  body: {
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string', enum: ['gold', 'stress'] },
    },
    additionalProperties: false,
  },
} as const

export const characterParamsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const

export const resourcesParamsSchema = {
  params: {
    type: 'object',
    required: ['characterId'],
    properties: {
      characterId: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const

export const battleParamsSchema = {
  params: {
    type: 'object',
    required: ['battleId'],
    properties: {
      battleId: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const

export const gameStateParamsSchema = {
  params: {
    type: 'object',
    required: ['characterId'],
    properties: {
      characterId: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const
