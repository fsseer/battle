export type TrainingCategory = 'BASIC' | 'WEAPON'
export type TrainingId =
  | 'basic.conditioning'
  | 'basic.one_hand'
  | 'adv.conditioning'
  | 'adv.one_hand'
  // Basic stat trainings (beginner/intermediate/advanced)
  | 'basic.str.beginner' | 'basic.str.intermediate' | 'basic.str.advanced'
  | 'basic.agi.beginner' | 'basic.agi.intermediate' | 'basic.agi.advanced'
  | 'basic.int.beginner' | 'basic.int.intermediate' | 'basic.int.advanced'
  // Weapon trainings (one-hand / two-hand / dual-sword)
  | 'weapon.one_hand.beginner' | 'weapon.one_hand.intermediate' | 'weapon.one_hand.advanced'
  | 'weapon.two_hand.beginner' | 'weapon.two_hand.intermediate' | 'weapon.two_hand.advanced'
  | 'weapon.dual.beginner' | 'weapon.dual.intermediate' | 'weapon.dual.advanced'

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
  // Basic: Strength
  { id: 'basic.str.beginner', name: '힘 훈련 - 초급', category: 'BASIC', apCost: 4, stressDelta: +2, description: '기초 근력 연습' },
  { id: 'basic.str.intermediate', name: '힘 훈련 - 중급', category: 'BASIC', apCost: 6, stressDelta: +4, description: '중량 훈련' },
  { id: 'basic.str.advanced', name: '힘 훈련 - 상급(유료)', category: 'BASIC', apCost: 8, stressDelta: +6, goldCost: 20, description: '고강도 근력 프로그램' },
  // Basic: Agility
  { id: 'basic.agi.beginner', name: '민첩 훈련 - 초급', category: 'BASIC', apCost: 4, stressDelta: +2, description: '풋워크/기초 순발력' },
  { id: 'basic.agi.intermediate', name: '민첩 훈련 - 중급', category: 'BASIC', apCost: 6, stressDelta: +4, description: '콘 드릴/라더 훈련' },
  { id: 'basic.agi.advanced', name: '민첩 훈련 - 상급(유료)', category: 'BASIC', apCost: 8, stressDelta: +6, goldCost: 20, description: '고강도 순발력 프로그램' },
  // Basic: Intelligence
  { id: 'basic.int.beginner', name: '지능 훈련 - 초급', category: 'BASIC', apCost: 4, stressDelta: +1, description: '전술 기초 이론' },
  { id: 'basic.int.intermediate', name: '지능 훈련 - 중급', category: 'BASIC', apCost: 6, stressDelta: +2, description: '상황 대처 시뮬레이션' },
  { id: 'basic.int.advanced', name: '지능 훈련 - 상급(유료)', category: 'BASIC', apCost: 8, stressDelta: +3, goldCost: 15, description: '고급 전술/상대 분석' },
  // Weapon: One-hand (sword+shield 포함)
  { id: 'weapon.one_hand.beginner', name: '한손검 훈련 - 초급', category: 'WEAPON', apCost: 4, stressDelta: +2, weaponKind: 'ONE_HAND', weaponXp: 40 },
  { id: 'weapon.one_hand.intermediate', name: '한손검 훈련 - 중급', category: 'WEAPON', apCost: 6, stressDelta: +4, weaponKind: 'ONE_HAND', weaponXp: 80 },
  { id: 'weapon.one_hand.advanced', name: '한손검 훈련 - 상급(유료)', category: 'WEAPON', apCost: 8, stressDelta: +6, goldCost: 30, weaponKind: 'ONE_HAND', weaponXp: 140 },
  // Weapon: Two-hand
  { id: 'weapon.two_hand.beginner', name: '양손검 훈련 - 초급', category: 'WEAPON', apCost: 4, stressDelta: +2, weaponKind: 'TWO_HAND', weaponXp: 40 },
  { id: 'weapon.two_hand.intermediate', name: '양손검 훈련 - 중급', category: 'WEAPON', apCost: 6, stressDelta: +4, weaponKind: 'TWO_HAND', weaponXp: 80 },
  { id: 'weapon.two_hand.advanced', name: '양손검 훈련 - 상급(유료)', category: 'WEAPON', apCost: 8, stressDelta: +6, goldCost: 30, weaponKind: 'TWO_HAND', weaponXp: 140 },
  // Weapon: Dual-sword (임시로 DAGGER 숙련에 매핑)
  { id: 'weapon.dual.beginner', name: '쌍검 훈련 - 초급', category: 'WEAPON', apCost: 4, stressDelta: +2, weaponKind: 'DAGGER', weaponXp: 40 },
  { id: 'weapon.dual.intermediate', name: '쌍검 훈련 - 중급', category: 'WEAPON', apCost: 6, stressDelta: +4, weaponKind: 'DAGGER', weaponXp: 80 },
  { id: 'weapon.dual.advanced', name: '쌍검 훈련 - 상급(유료)', category: 'WEAPON', apCost: 8, stressDelta: +6, goldCost: 30, weaponKind: 'DAGGER', weaponXp: 140 },
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


