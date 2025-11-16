# 効果音システムのセットアップガイド

このドキュメントでは、ゲームの効果音システムの設定方法と音声ファイルの配置方法を説明します。

## 📁 音声ファイルの配置

音声ファイルは `public/sounds/` ディレクトリに配置してください。以下のディレクトリ構造に従ってください：

```
public/
  sounds/
    engine/
      thrust-loop.webm       # エンジン噴射音（WebM形式）
      thrust-loop.mp3        # エンジン噴射音（MP3形式）
      idle-loop.webm         # アイドリング音（WebM形式）
      idle-loop.mp3          # アイドリング音（MP3形式）
    events/
      slingshot.webm         # スリングショット通過音
      slingshot.mp3
      fuel-low.webm          # 燃料警告音
      fuel-low.mp3
      mission-complete.webm  # ミッション達成音
      mission-complete.mp3
    ambient/
      space-ambience.webm    # 宇宙環境音（ループ）
      space-ambience.mp3
    ui/
      click.webm             # UIクリック音
      click.mp3
      hover.webm             # UIホバー音
      hover.mp3
```

## 🎵 音声ファイルの形式

Howler.jsは以下のフォーマットをサポートしています：

- **WebM**: Chrome/Android向け（推奨・高圧縮・軽量）
- **MP3**: iOS/Safari向け（圧縮・互換性高い）
- **WAV**: 全ブラウザ対応（非圧縮・高品質・ファイルサイズ大）

**推奨**: 最低1つのフォーマット（WAVのみでもOK）を用意すれば動作します。複数形式を用意すると、Howler.jsが自動的にブラウザに最適な形式を選択します。

### ファイルサイズの比較（目安）
- WAV: 約10MB/分（非圧縮）
- MP3: 約1MB/分（圧縮）
- WebM: 約0.5MB/分（高圧縮）

**結論**:
- テスト用・プロトタイプ: **WAVのみでOK**（簡単）
- 本番環境: WebM + MP3 を推奨（軽量・互換性）

## 🎮 現在実装されている効果音

### 1. エンジン噴射音（ENGINE_THRUST）
- **トリガー**: 上矢印キー（↑）を押している間
- **動作**: ループ再生
- **特徴**:
  - 速度に応じてピッチが変化（低速: 1.0x、高速: 1.5x）
  - 燃料切れで自動停止
  - 光跡表示と連動

### 2. その他の効果音（未実装）
以下の効果音は定義済みですが、まだゲーム内では使用されていません：

- **ENGINE_IDLE**: アイドリング音
- **SLINGSHOT**: スリングショット通過音
- **FUEL_LOW**: 燃料警告音（燃料10%以下）
- **MISSION_COMPLETE**: ミッション達成音
- **SPACE_AMBIENCE**: 宇宙環境音（常時ループ）
- **UI_CLICK**: UIクリック音
- **UI_HOVER**: UIホバー音

## 🔧 設定のカスタマイズ

効果音の設定は `src/lib/soundConstants.ts` で変更できます：

```typescript
export const SOUND_EFFECTS = {
    ENGINE_THRUST: {
        src: ['/sounds/engine/thrust-loop.webm', '/sounds/engine/thrust-loop.mp3'],
        volume: 0.4,      // 音量（0.0 - 1.0）
        loop: true,       // ループ再生
        rate: 1.0         // ピッチ（1.0 = 通常）
    },
    // ... 他の効果音
};
```

### ボリューム調整
- `volume`: 個別の音量（0.0 - 1.0）
- `masterVolume`: 全体の音量（`useSoundEffects`で制御）

### ピッチ調整
- `rate`: 再生速度/ピッチ（0.5 = 半分の速度、2.0 = 2倍の速度）
- GameCanvas.tsxで速度に応じて動的に変更可能

## 🎚️ 効果音のオン/オフ

将来的にHUDまたは設定パネルに効果音のオン/オフスイッチを追加できます：

```typescript
// useSoundEffects から取得
const { enabled, setEnabled, masterVolume, setMasterVolume } = soundEffects;

// 効果音を無効化
setEnabled(false);

// マスターボリュームを調整
setMasterVolume(0.7); // 0.0 - 1.0
```

## 📱 モバイル対応

### 自動アンロック機能
Howler.jsは、ユーザーの最初のタップ（STARTボタン）で音声を自動的にアンロックします。

### 最適化
- **HTML5 Audio**: 全ての効果音でHTML5 Audioを使用（モバイルSafari完全対応）
- **ピッチ調整**: HTML5 Audioでもrate()メソッドでピッチ変更可能
- **事前ロード**: STARTボタンクリック時に効果音をプリロード

## 🛠️ トラブルシューティング

### 音が鳴らない場合

1. **ファイルの配置を確認**
   - `public/sounds/` ディレクトリに正しく配置されているか
   - ファイル名が `soundConstants.ts` の定義と一致しているか

2. **ブラウザのコンソールを確認**
   - 404エラーが出ていないか
   - "Sound effects initialized" のログが表示されているか

3. **ユーザーインタラクションを確認**
   - モバイルでは、STARTボタンをタップした後でないと音が鳴りません

4. **ブラウザのミュート設定を確認**
   - タブがミュートされていないか

### 音声ファイルがない場合

音声ファイルを用意していない場合でも、システムはエラーなく動作します。Howler.jsがファイル読み込みに失敗しても、ゲームプレイには影響しません。

## 🎼 推奨する音源

### 無料の効果音サイト
- **Freesound**: https://freesound.org/
- **Zapsplat**: https://www.zapsplat.com/
- **Pixabay**: https://pixabay.com/sound-effects/

### 検索キーワード
- エンジン音: "engine loop", "thruster", "rocket engine"
- スリングショット: "whoosh", "flyby", "pass"
- 環境音: "space ambience", "drone", "hum"
- UI音: "click", "beep", "button"

## 📝 今後の拡張

以下の機能を追加できます：

1. **スリングショット効果音**: 惑星接近時の自動再生
2. **燃料警告音**: 燃料10%以下でループ再生
3. **ミッション達成音**: ミッション完了時のファンファーレ
4. **環境音**: 常時ループする宇宙の静寂感
5. **UI効果音**: ボタンクリック、ホバー時の音
6. **3D音響**: 惑星の位置に応じた立体音響

## 🔗 関連ファイル

- `src/lib/soundConstants.ts` - 効果音の定義
- `src/components/SoundEffectsManager.tsx` - 効果音管理システム
- `src/components/GameCanvas.tsx` - エンジン音の再生制御
- `src/app/page.tsx` - 効果音システムの初期化
