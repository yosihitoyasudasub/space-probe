# モバイルSafari起動失敗の調査と修正提案

作成日: 2025-11-09

## 📋 現状の問題

### 症状
- ✅ **PC Chrome/Edge**: 正常に起動
- ✅ **モバイルChrome (Android/iOS)**: 正常に起動
- ❌ **モバイルSafari (iOS)**: "問題が繰り返し起きました" エラー → 黒画面

### 重要な発見
**スタート画面すら表示されない** = ポストプロセッシングエフェクト以前の問題

- スタートボタンを押す前に失敗
- Three.jsの初期化段階でクラッシュ
- エフェクトが原因なら、スタート画面は表示されるはず

---

## 🔍 実施済みの最適化

### 1. シャドウマップ解像度の削減 ✅
```typescript
const shadowMapSize = isMobile ? 1024 : 4096;  // 94% VRAM削減
```

### 2. Bloom解像度の最適化 ✅
```typescript
const bloomResolution = isMobile
    ? new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2)  // 75%削減
    : new THREE.Vector2(window.innerWidth, window.innerHeight);
```

### 3. レンダラー最適化 ✅
- アンチエイリアシング: モバイルで無効化
- ピクセル比率: 1.0に制限 (デスクトップは2.0)

### 結果
**モバイルChromeでは成功、Safariでは失敗** → さらなる調査が必要

---

## 🎯 推定される根本原因

### 可能性1: WebGLコンテキスト作成の失敗 (最有力)
**Safari特有のWebGL制限:**
- 最大テクスチャサイズ制限が厳しい
- 同時に使用可能なテクスチャ数の制限
- WebGL拡張機能のサポート不足

**該当箇所:** `threeSetup.ts:480`
```typescript
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
```

**問題点:**
- WebGLコンテキスト作成時にエラーハンドリングなし
- 失敗時のフォールバックなし

---

### 可能性2: GLBモデルローディングの失敗
**該当箇所:** `threeSetup.ts:706-734`

**問題点:**
- GLBモデルのロード中にメモリ不足
- エラーハンドリングはあるが、フォールバック後も処理が続く可能性
- 非同期ロード中にプローブが不正な状態

**コード:**
```typescript
if (modelPath) {
    // Hide Voyager while loading GLB model
    probe.visible = false;  // ← ロード失敗時、プローブが非表示のまま
}
```

---

### 可能性3: 惑星テクスチャのローディング失敗
**該当箇所:** `threeSetup.ts:634-662`

**問題点:**
- 8つの惑星テクスチャを同時ロード
- テクスチャサイズが大きい可能性
- エラー時はフォールバック (solid color) だが、ローディング中のメモリスパイク

**コード:**
```typescript
for (const pd of solarDefs) {
    textureLoader.load(
        texturePath,
        (texture) => { /* 成功 */ },
        undefined,
        (error) => { /* フォールバック */ }
    );
}
```

---

### 可能性4: 星フィールドの生成負荷
**該当箇所:** `threeSetup.ts:786-836`

**問題点:**
- 8000個の星を一度に生成
- Float32Arrayの大量メモリ確保 (8000 × 3 × 2 = 48,000 floats = 192KB)
- モバイルでは過剰

```typescript
const starCount = STAR_FIELD_CONSTANTS.COUNT;  // 8000
```

---

### 可能性5: EffectComposer初期化の失敗
**該当箇所:** `threeSetup.ts:488-541`

**問題点:**
- RenderPass, BloomPass, FilmPass, VignettePass の4つのパス
- 各パスがフレームバッファを作成 → GPU VRAMを大量消費
- Safari特有のWebGL制限により失敗

---

## 🛠️ 修正提案

### 提案1: WebGLコンテキスト作成のエラーハンドリング強化 (優先度: 高)

**目的:** WebGL作成失敗時にユーザーに通知

```typescript
export function initThreeJS(canvas: HTMLCanvasElement, options?: { ... }) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log(`Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

    // WebGL capability check
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        throw new Error('WebGL not supported on this device');
    }

    // Check max texture size
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log(`Max texture size: ${maxTextureSize}x${maxTextureSize}`);

    if (isMobile && maxTextureSize < 2048) {
        console.warn('Device has very limited WebGL capabilities');
    }

    try {
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: !isMobile,
            powerPreference: isMobile ? 'low-power' : 'high-performance',
            failIfMajorPerformanceCaveat: false  // Safari対策
        });
        // ... 続く
    } catch (error) {
        console.error('WebGL renderer creation failed:', error);
        throw new Error('Failed to initialize 3D graphics. Your device may not support this application.');
    }
}
```

---

### 提案2: GLBモデルをモバイルで無効化 (優先度: 高)

**目的:** メモリ消費を削減し、ロード失敗リスクを排除

```typescript
const modelPath = options?.probeModelPath;

// Disable GLB models on mobile to reduce memory usage
if (modelPath && !isMobile) {
    // Load GLB only on desktop
    probe.visible = false;
    loadGLBProbe(/* ... */);
} else {
    console.log('Using built-in Voyager probe (Mobile or no GLB specified)');
    // Voyager probe already created and visible
}
```

---

### 提案3: 星フィールドの削減 (優先度: 中)

**目的:** 初期化時のメモリスパイクを削減

```typescript
export const STAR_FIELD_CONSTANTS = {
    COUNT: isMobile ? 2000 : 8000,  // モバイルで75%削減
    // ... その他は同じ
} as const;
```

または動的に:

```typescript
function createStarField() {
    const starCount = isMobile ? 2000 : STAR_FIELD_CONSTANTS.COUNT;
    console.log(`Creating ${starCount} stars`);
    // ... 続く
}
```

---

### 提案4: 惑星テクスチャの遅延ロード (優先度: 中)

**目的:** 初期化時のテクスチャロード負荷を分散

```typescript
// モバイルでは惑星テクスチャを無効化 (solid colorのみ)
const shouldLoadTextures = !isMobile;

if (shouldLoadTextures) {
    textureLoader.load(texturePath, /* ... */);
} else {
    console.log(`Skipping texture for ${pd.id} (Mobile mode)`);
    // solid color materialのみ使用
}
```

---

### 提案5: ポストプロセッシングの段階的無効化 (優先度: 中)

**目的:** Safariでシェーダー負荷を最小化

**段階1: Film Grain + Vignette無効化 (モバイルのみ)**
```typescript
if (!isMobile) {
    const filmPass = new FilmPass(0.15, false);
    composer.addPass(filmPass);

    const vignettePass = new ShaderPass(VignetteShader);
    composer.addPass(vignettePass);
}
```

**段階2: Bloomも無効化 (Safariのみ)**
```typescript
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (!isMobile || !isSafari) {
    const bloomPass = new UnrealBloomPass(/* ... */);
    composer.addPass(bloomPass);
}
```

**段階3: EffectComposer完全無効化 (最後の手段)**
```typescript
if (isMobile && isSafari) {
    // Use direct rendering without post-processing
    return { /* ... */, composer: { render: () => renderer.render(scene, camera) } };
}
```

---

### 提案6: 初期化を段階的に実行 (優先度: 低)

**目的:** どの段階で失敗しているか特定

```typescript
export function initThreeJS(canvas: HTMLCanvasElement, options?: { ... }) {
    try {
        console.log('[Init] Step 1: Device detection');
        const isMobile = /* ... */;

        console.log('[Init] Step 2: Scene creation');
        const scene = new THREE.Scene();

        console.log('[Init] Step 3: Camera creation');
        const camera = /* ... */;

        console.log('[Init] Step 4: Renderer creation');
        const renderer = /* ... */;

        console.log('[Init] Step 5: Post-processing setup');
        const composer = /* ... */;

        console.log('[Init] Step 6: Lighting setup');
        // ...

        console.log('[Init] Step 7: Planet creation');
        // ...

        console.log('[Init] Step 8: Star field creation');
        // ...

        console.log('[Init] Complete!');
        return { /* ... */ };
    } catch (error) {
        console.error('[Init] Failed at step:', error);
        throw error;
    }
}
```

---

## 📊 優先度付き実装ロードマップ

### フェーズ1: 緊急対応 (即実施)
1. ✅ WebGLコンテキスト作成のエラーハンドリング強化
2. ✅ GLBモデルをモバイルで無効化
3. ✅ 初期化ログの追加 (どこで失敗しているか特定)

### フェーズ2: 最適化 (Safariテスト後)
4. ⏳ 星フィールドの削減 (8000 → 2000)
5. ⏳ Film Grain + Vignette無効化 (モバイル)
6. ⏳ 惑星テクスチャの遅延ロード

### フェーズ3: 最終手段 (必要に応じて)
7. 🔄 Bloom無効化 (Safari)
8. 🔄 EffectComposer完全無効化 (Safari)

---

## 🧪 検証手順

### 1. Safariコンソールログの確認
- 開発者ツールを開く: Settings > Safari > Advanced > Web Inspector
- どの初期化ステップで失敗しているか確認

### 2. WebGL Reportの確認
- https://webglreport.com/ にアクセス
- SafariのWebGL対応状況を確認
- Max Texture Size, Max Renderbuffer Sizeを確認

### 3. 段階的なテスト
```
テスト1: GLBモデル無効化のみ
テスト2: + 星フィールド削減
テスト3: + Film Grain/Vignette無効化
テスト4: + Bloom無効化
テスト5: + EffectComposer無効化
```

---

## 📝 次回作業時のチェックリスト

- [ ] Safariのコンソールエラーメッセージを確認
- [ ] WebGL Reportで端末のWebGL仕様を確認
- [ ] 提案1 (WebGLエラーハンドリング) を実装
- [ ] 提案2 (GLBモデル無効化) を実装
- [ ] 提案3 (星フィールド削減) を実装
- [ ] 各段階でSafariテスト
- [ ] 成功したら REFACTOR_SUMMARY.md に記録
- [ ] コミット & プッシュ

---

## 🔗 参考リンク

- [Safari WebGL制限](https://webkit.org/blog/8892/introducing-the-gpu-process-for-webgl/)
- [Three.js モバイル最適化](https://threejs.org/docs/#manual/en/introduction/How-to-use-post-processing)
- [WebGL Compatibility Table](https://caniuse.com/webgl)

---

**作成者メモ:**
現在の修正 (シャドウマップ削減 + Bloom最適化) ではSafariでの起動に成功していない。
スタート画面すら表示されないため、初期化段階での根本的な問題がある。
次回は提案1-3を優先的に実装し、段階的にテストする。
