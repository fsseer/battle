export const registerSchema = {
  body: {
    type: 'object',
    required: ['loginId', 'password', 'confirm'],
    properties: {
      loginId: { type: 'string', minLength: 3, maxLength: 32 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
      confirm: { type: 'string', minLength: 8, maxLength: 128 },
      nickname: { type: 'string', minLength: 2, maxLength: 32 },
    },
    additionalProperties: false,
  },
} as const

export const loginSchema = {
  body: {
    type: 'object',
    required: ['loginId', 'password'],
    properties: {
      loginId: { type: 'string', minLength: 3, maxLength: 32 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
    additionalProperties: false,
  },
} as const
