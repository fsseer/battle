import { Assets } from '@pixi/assets'

export type TextureKey = 'fighter_red' | 'fighter_blue' | 'spark' | 'trail'

const manifest = {
  bundles: [
    {
      name: 'core',
      assets: [
        { alias: 'fighter_red', src: '/sprites/fighter_red.svg' },
        { alias: 'fighter_blue', src: '/sprites/fighter_blue.svg' },
        { alias: 'spark', src: '/sprites/spark.svg' },
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


