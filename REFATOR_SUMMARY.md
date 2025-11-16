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
