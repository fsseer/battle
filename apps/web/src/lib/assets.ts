import { Assets } from '@pixi/assets'

export type TextureKey = 'fighter_red' | 'fighter_blue' | 'spark' | 'trail'

const manifest = {
  bundles: [
    {
      name: 'core',
      assets: [
        // 예시 자산 경로 (없으면 무시). 추후 실제 스프라이트 추가 예정
        // { alias: 'fighter_red', src: '/sprites/fighter_red.png' },
        // { alias: 'fighter_blue', src: '/sprites/fighter_blue.png' },
        // { alias: 'spark', src: '/sprites/spark.png' },
        // { alias: 'trail', src: '/sprites/trail.png' },
      ],
    },
  ],
}

let registered = false

export async function loadAssets() {
  if (!registered) {
    try { await Assets.init({ manifest }) } catch { /* ignore */ }
    registered = true
  }
  try {
    await Assets.loadBundle('core')
  } catch {
    // 자산이 아직 없으면 조용히 무시 (프로시저럴 드로잉을 사용)
  }
}


