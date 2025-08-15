import type { WeaponKind } from '@prisma/client'

export type StatKey = 'str'|'agi'|'int'|'luck'|'fate'

export type SkillDef = {
  id: string
  name: string
  category: 'WEAPON'|'CHARACTER'|'SPECIAL'
  weaponKind?: WeaponKind
  reqStats?: Partial<Record<StatKey, number>>
  unlock?: { prof?: { kind: WeaponKind, level: number }, itemId?: string }
  description?: string
}

export const SKILLS: SkillDef[] = [
  { id: 'slash', name: '베기', category: 'WEAPON', weaponKind: 'ONE_HAND', unlock: { prof: { kind: 'ONE_HAND', level: 1 } }, reqStats: { str: 6 } },
  { id: 'power_strike', name: '강력한 일격', category: 'WEAPON', weaponKind: 'TWO_HAND', unlock: { prof: { kind: 'TWO_HAND', level: 2 } }, reqStats: { str: 10 } },
  { id: 'shield_bash', name: '방패 가격', category: 'WEAPON', weaponKind: 'SHIELD', unlock: { prof: { kind: 'SHIELD', level: 1 } }, reqStats: { str: 8 } },
  { id: 'focus_mind', name: '집중', category: 'CHARACTER', reqStats: { int: 8 }, description: '명중/회피 소폭 상승(라운드 1)' },
  { id: 'lucky_break', name: '천운', category: 'CHARACTER', reqStats: { luck: 10 }, description: '치명타 확률 증가(라운드 1)' },
]

export type TraitDef = {
  id: string
  name: string
  description?: string
  unlock?: { stat?: { key: StatKey, min: number }, prof?: { kind: WeaponKind, level: number } }
}

export const TRAITS: TraitDef[] = [
  { id: 'toughness', name: '강인함', description: '피해 감소 소폭', unlock: { stat: { key: 'str', min: 10 } } },
  { id: 'duelist', name: '결투가', description: '단검/한손 무기 숙련시 명중 상승', unlock: { prof: { kind: 'ONE_HAND', level: 3 } } },
]

export type SkillState = 'usable'|'locked_prof'|'locked_stat'|'locked_item'

export function evaluateSkills(params: {
  stats: Record<StatKey, number>
  profs: Partial<Record<WeaponKind, number>>
  equippedKinds: WeaponKind[]
}) {
  const result = SKILLS.map(s => {
    const needProf = s.unlock?.prof
    const needItem = s.unlock?.itemId
    const needStats = s.reqStats ?? {}

    // weapon category gating by equip (loose: if same kind equipped OR character skill)
    const equippedOk = s.category !== 'WEAPON' || params.equippedKinds.includes(s.weaponKind as WeaponKind)

    let state: SkillState = 'usable'
    const missing: any = {}

    if (!equippedOk && s.category === 'WEAPON') {
      state = 'locked_item' // 장비 미충족(무기 종류 불일치) 표현용
    }

    if (needProf) {
      const lvl = params.profs[needProf.kind] ?? 0
      if (lvl < needProf.level) {
        state = 'locked_prof'
        missing.prof = { kind: needProf.kind, need: needProf.level, have: lvl }
      }
    }
    // stat gate (only if not already blocked harder)
    const unmetStats = Object.entries(needStats).filter(([k, v]) => (params.stats[k as StatKey] ?? 0) < (v as number))
    if (unmetStats.length && state === 'usable') {
      state = 'locked_stat'
      missing.stats = unmetStats.map(([k, v]) => ({ key: k, need: v, have: params.stats[k as StatKey] ?? 0 }))
    }
    if (needItem) {
      // 장비 아이템 전용 스킬은 구현 보류. 상태만 표시
      if (state === 'usable') {
        state = 'locked_item'
        missing.itemId = needItem
      }
    }
    return { skill: s, state, missing }
  })
  return result
}

export function evaluateTraits(params: {
  stats: Record<StatKey, number>
  profs: Partial<Record<WeaponKind, number>>
}) {
  return TRAITS.map(t => {
    let unlocked = false
    if (t.unlock?.stat) {
      unlocked = (params.stats[t.unlock.stat.key] ?? 0) >= t.unlock.stat.min
    }
    if (!unlocked && t.unlock?.prof) {
      unlocked = (params.profs[t.unlock.prof.kind] ?? 0) >= t.unlock.prof.level
    }
    return { trait: t, unlocked }
  })
}


