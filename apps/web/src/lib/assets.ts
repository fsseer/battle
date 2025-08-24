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
let bundleLoaded = false

export async function loadAssets() {
  try {
    // Assets 초기화 (한 번만)
    if (!registered) {
      try {
        // PIXI.js Assets가 이미 초기화되었는지 더 정확하게 확인
        if (typeof Assets !== 'undefined' && Assets.cache && Assets.cache.get('fighter_red')) {
          console.log('[Assets] AssetManager already initialized, skipping init')
          registered = true
        } else {
          await Assets.init({ manifest })
          registered = true
          console.log('[Assets] AssetManager initialized successfully')
        }
      } catch (error) {
        // 이미 초기화된 경우 무시
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (
          errorMessage.includes('already initialized') ||
          errorMessage.includes('AssetManager already initialized')
        ) {
          console.log('[Assets] AssetManager already initialized, continuing')
          registered = true
        } else {
          console.warn('[Assets] AssetManager initialization failed:', error)
          // 에러가 발생해도 계속 진행 (프로시저럴 드로잉 사용)
          registered = true
        }
      }
    }

    // 번들 로드 (한 번만)
    if (!bundleLoaded) {
      try {
        // 번들이 이미 로드되었는지 확인
        if (Assets.cache && Assets.cache.get('fighter_red')) {
          console.log('[Assets] Core bundle already loaded, skipping load')
          bundleLoaded = true
        } else {
          await Assets.loadBundle('core')
          bundleLoaded = true
          console.log('[Assets] Core bundle loaded successfully')
        }
      } catch (error) {
        console.warn('[Assets] Core bundle loading failed:', error)
        // 자산이 아직 없으면 조용히 무시 (프로시저럴 드로잉을 사용)
        bundleLoaded = true // 실패해도 다시 시도하지 않음
      }
    }
  } catch (error) {
    console.warn('[Assets] Unexpected error in loadAssets:', error)
    // 에러가 발생해도 플래그를 설정하여 재시도 방지
    registered = true
    bundleLoaded = true
  }
}
