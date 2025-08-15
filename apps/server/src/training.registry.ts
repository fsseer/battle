export type TrainingCategory = 'BASIC' | 'WEAPON'
export type TrainingId =
  | 'basic.conditioning'
  | 'basic.one_hand'
  | 'adv.conditioning'
  | 'adv.one_hand'

export type TrainingItem = {
  id: TrainingId
  name: string
  category: TrainingCategory
  description?: string
  apCost: number
  stressDelta: number // + increases stress, - decreases
  goldCost?: number
  weaponKind?: 'ONE_HAND' | 'TWO_HAND' | 'SHIELD' | 'DAGGER' | 'SPEAR' | 'AXE'
  weaponXp?: number
}

export const TRAINING_CATALOG: TrainingItem[] = [
  {
    id: 'basic.conditioning',
    name: '기초 체력 단련',
    category: 'BASIC',
    description: '기초 근지구력과 코어를 단련합니다.',
    apCost: 5,
    stressDelta: +3,
  },
  {
    id: 'basic.one_hand',
    name: '기초 무기술(한손검)',
    category: 'WEAPON',
    description: '기본 자세/베기/막기 연습.',
    apCost: 5,
    stressDelta: +4,
    weaponKind: 'ONE_HAND',
    weaponXp: 50,
  },
  {
    id: 'adv.conditioning',
    name: '상급 체력 단련(유료)',
    category: 'BASIC',
    description: '고강도 인터벌. 금화를 소모합니다.',
    apCost: 8,
    stressDelta: +6,
    goldCost: 20,
  },
  {
    id: 'adv.one_hand',
    name: '상급 무기술 코칭(유료, 한손검)',
    category: 'WEAPON',
    description: '코치와 1:1 드릴. 금화를 소모합니다.',
    apCost: 8,
    stressDelta: +6,
    goldCost: 30,
    weaponKind: 'ONE_HAND',
    weaponXp: 120,
  },
]


