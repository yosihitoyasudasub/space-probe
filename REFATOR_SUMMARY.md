# リファクタリング・修正履歴

このファイルには、プロジェクトの主要なリファクタリングとバグ修正の履歴を記録します。

---

## 2025-01-16: リセットボタンの動作修正

### 問題
リセットボタンを押すと、一瞬シミュレーション画面が表示された後に "How to Play" 画面が表示されていた。本来の仕様では、リセット時はシミュレーションを直接リセット＆再スタートし、"How to Play" 画面は表示しない。

### 原因
リセット時に `handleInitialized` コールバックが呼ばれ、常に `setShowInstructions(true)` が実行されていたため。

### 修正内容

#### 1. page.tsx (165-172行目)
`handleInitialized` 内で初回起動とリセットを区別するようにした：

```typescript
// Handle initialization complete from GameCanvas
const handleInitialized = () => {
    setIsInitialized(true);
    setIsLoading(false);
    // Only show instructions on first initialization, not on restart
    if (!isSimulationStarted) {
        setShowInstructions(true);
    }
};
```

**変更点**:
- `isSimulationStarted` の状態をチェック
- 初回のみ（`!isSimulationStarted`）"How to Play" 画面を表示
- リセット時（`isSimulationStarted === true`）は表示しない

#### 2. GameCanvas.tsx (187-189行目)
`restartSimulation` 関数の最初で、シミュレーション継続状態を明示的に保持：

```typescript
// Expose restart function for touch controls
const restartSimulation = () => {
    // Keep simulation started (don't show "How to Play" screen)
    isSimulationStartedRef.current = true;

    try {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } catch (e) {}
    // ... 以下、シーンの破棄と再初期化
};
```

**変更点**:
- `isSimulationStartedRef.current = true` を明示的に設定
- シミュレーションが継続中であることを保証

### 結果
- ✅ **初回起動時**: ローディング → "How to Play" 画面 → START → シミュレーション開始
- ✅ **リセット時**: シミュレーションが即座にリセット＆再スタート（"How to Play" 画面を経由しない）
- ✅ 一瞬のちらつきなし

### 影響範囲
- `src/app/page.tsx`: `handleInitialized` 関数
- `src/components/GameCanvas.tsx`: `restartSimulation` 関数

### 関連ファイル
- `src/app/page.tsx`
- `src/components/GameCanvas.tsx`

---

## 2025-01-16: 初回ロード時の "How to Play" 画面表示修正

### 問題
前回の修正後、初回ロード時に "How to Play" 画面が表示されなくなった。

### 原因
`isSimulationStarted` は START ボタンをクリックした時点で `true` になるが、`handleInitialized` はその後（GLBモデルのロード完了時）に呼ばれる。そのため、`handleInitialized` 内の条件 `if (!isSimulationStarted)` が常に `false` になり、"How to Play" 画面が表示されなかった。

### 修正内容

#### page.tsx (54行目, 166-174行目)
初回ロードとリセットを区別するための ref を追加：

```typescript
const isFirstLoadRef = useRef<boolean>(true); // Track if this is the first load

// Handle initialization complete from GameCanvas
const handleInitialized = () => {
    setIsInitialized(true);
    setIsLoading(false);
    // Only show instructions on first load, not on restart
    if (isFirstLoadRef.current) {
        setShowInstructions(true);
        isFirstLoadRef.current = false; // Mark as no longer first load
    }
};
```

**変更点**:
- `isFirstLoadRef` を追加（初期値: `true`）
- `handleInitialized` 内で `isFirstLoadRef.current` をチェック
- 初回のみ "How to Play" 画面を表示
- 表示後に `isFirstLoadRef.current = false` に設定

### 結果
- ✅ **初回起動時**: ローディング → GLBロード完了 → "How to Play" 画面 → START → シミュレーション開始
- ✅ **リセット時**: シミュレーションが即座にリセット＆再スタート（"How to Play" 画面を経由しない）

### 影響範囲
- `src/app/page.tsx`: `isFirstLoadRef` の追加と `handleInitialized` 関数

### 関連ファイル
- `src/app/page.tsx`

---

## 2025-01-16: リセット時のモデル・テクスチャ再ロードの最適化

### 問題
リセットボタンを押すたびに、探査機の 3D モデル（GLBファイル）とテクスチャが毎回再ロードされていた。これにより：
- ネットワーク遅延（GLBファイルの再ダウンロード）
- CPU負荷（GLBファイルの再パース）
- GPU負荷（テクスチャの再作成、シェーダーの再コンパイル）
- リセットに数秒かかる

### 原因
`GameCanvas.tsx` の `restartSimulation` 関数が、毎回シーン全体を破棄（`dispose()`）して `initThreeJS` を再呼び出ししていたため。

### 修正内容

#### 1. threeSetup.ts (1525-1530行目)
COM補正後の初期状態を保存：

```typescript
// Save initial state after COM corrections for reset functionality
const initialBodyStates = bodies.map(b => ({
    id: b.id,
    position: [...b.position] as [number, number, number],
    velocity: [...b.velocity] as [number, number, number]
}));
```

#### 2. threeSetup.ts (1926-1988行目)
`resetSimulation` 関数を新規追加：

```typescript
// Reset simulation to initial state without reloading models/textures
function resetSimulation() {
    // Restore all bodies to their initial positions and velocities
    for (const initState of initialBodyStates) {
        const body = bodies.find(b => b.id === initState.id);
        if (body) {
            body.position = [...initState.position];
            body.velocity = [...initState.velocity];
        }
    }

    // Update visual meshes to match reset positions
    // (星、惑星、探査機の位置をリセット)

    // Reset state
    state.position.copy(probe.position);
    // ... 燃料、距離などのステートをリセット

    // Clear trail
    trailPoints.length = 0;
    trailGeometry.setFromPoints([]);

    // Hide light trails
    if ((probe as any).lightTrails) {
        const lightTrails = (probe as any).lightTrails;
        lightTrails.forEach((trail: any) => {
            trail.visible = false;
        });
    }
}
```

**機能**:
- 全天体（星、惑星、探査機）の位置・速度を初期値に復元
- 探査機の位置・回転をリセット
- 物理ステート（燃料、距離、スリングショット回数など）をリセット
- トレイル（軌道の軌跡）をクリア
- 光跡を非表示に
- **モデル・テクスチャは保持**（再ロードしない）

#### 3. threeSetup.ts (1988行目)
return 文に `resetSimulation` を追加：

```typescript
return { ..., resetSimulation };
```

#### 4. GameCanvas.tsx (170行目)
`resetSimulation` を受け取るように修正：

```typescript
let { scene, camera, ..., resetSimulation } = threeObj;
```

#### 5. GameCanvas.tsx (187-203行目)
`restartSimulation` 関数を大幅に簡素化：

```typescript
const restartSimulation = () => {
    // Keep simulation started (don't show "How to Play" screen)
    isSimulationStartedRef.current = true;

    // Reset grid states to hidden
    if (setGravityGridEnabled) setGravityGridEnabled(false);
    if (setGridEnabled) setGridEnabled(false);

    // Call resetSimulation from threeSetup (no model reload)
    if (resetSimulation) {
        resetSimulation();
    }

    // Reset animation loop timing
    lastTime = performance.now() / 1000;
    accumulator = 0;
};
```

**変更点**:
- `dispose()` の呼び出しを削除（シーンを破棄しない）
- `initThreeJS` の再呼び出しを削除（再初期化しない）
- `resetSimulation()` を呼ぶだけに簡素化

### 結果

#### 以前の動作：
1. GLBファイルの再ダウンロード（ネットワーク）
2. GLBファイルの再パース（CPU）
3. テクスチャの再作成（GPU）
4. カスタムシェーダーの再コンパイル（GPU）
5. 全シーンの再構築
6. **リセットに数秒かかる**

#### 最適化後の動作：
1. 物理状態のみリセット（位置・速度・燃料など）
2. モデル・テクスチャ・シェーダーは保持
3. **ほぼ瞬時にリセット完了**

### パフォーマンス改善
- ✅ リセット時間: 数秒 → ほぼ瞬時
- ✅ ネットワーク通信: なし
- ✅ CPU/GPU負荷: 大幅削減
- ✅ メモリ使用量: 安定

### 影響範囲
- `src/lib/threeSetup.ts`: `initialBodyStates` 保存、`resetSimulation` 関数追加
- `src/components/GameCanvas.tsx`: `restartSimulation` 関数の簡素化

### 関連ファイル
- `src/lib/threeSetup.ts`
- `src/components/GameCanvas.tsx`

---
