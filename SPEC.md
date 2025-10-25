# SPEC.md - 宇宙探査機シミュレーションゲーム 仕様書兼設計書

バージョン: 1.5
最終更新日: 2025-10-25
プロジェクト: space-probe-game-next

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [機能仕様](#3-機能仕様)
4. [物理エンジン設計](#4-物理エンジン設計)
5. [コンポーネント設計](#5-コンポーネント設計)
6. [技術詳細](#6-技術詳細)
7. [ディレクトリ構造とファイル説明](#7-ディレクトリ構造とファイル説明)
8. [テスト戦略](#8-テスト戦略)
9. [既知の制約事項と今後の改善案](#9-既知の制約事項と今後の改善案)
10. [開発・ビルド・デプロイ](#10-開発ビルドデプロイ)

---

## 1. プロジェクト概要

### 1.1 プロジェクト名
**space-probe-game-next** - 宇宙探査機シミュレーションゲーム

### 1.2 目的
リアルタイムの3D宇宙物理シミュレーションを通じて、惑星の重力スイングバイを利用した探査機の航行を体験できるWebアプリケーションを提供する。

### 1.3 主要機能
- **リアルタイム3D描画**: Three.jsによる太陽系の可視化
- **N体物理シミュレーション**: 中央星と複数惑星（太陽系規模）の重力相互作用
- **スイングバイ検出**: 惑星への接近通過による速度増加イベントの自動検出
- **インタラクティブ操作**: キーボードによる探査機の推進操作
- **リアルタイムHUD**: 速度、距離、燃料、スイングバイ回数の表示
- **パラメータ調整UI**: 重力定数、探査機速度倍率、中央星質量の実行時調整
- **軌跡可視化**: 探査機の移動経路をCatmull-Rom曲線で滑らかに表示
- **カメラ操作**: OrbitControlsによる自由視点移動

### 1.4 使用技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| フレームワーク | Next.js | latest | Reactベースのフルスタックフレームワーク（App Router） |
| UIライブラリ | React | latest | コンポーネントベースUI構築 |
| 3Dレンダリング | Three.js | 0.160.0 | WebGL抽象化、3Dシーン管理 |
| 言語 | TypeScript | latest | 型安全性とコード品質向上 |
| テスト | Vitest | 3.2.4 | 単体テストランナー |
| リンター | ESLint | latest | コード品質チェック |
| パッケージ管理 | npm | - | 依存関係管理 |

---

## 2. システムアーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────┐
│         Browser (Client Side)           │
├─────────────────────────────────────────┤
│  Next.js (App Router) - SSR/CSR         │
│  ┌─────────────────────────────────┐   │
│  │   React Component Tree          │   │
│  │                                 │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │  Page (page.tsx)        │   │   │
│  │  │  - State Management     │   │   │
│  │  │  - Parameter Props      │   │   │
│  │  └──────────┬──────────────┘   │   │
│  │             │                   │   │
│  │   ┌─────────┼──────────────┐   │   │
│  │   │         │              │   │   │
│  │   ▼         ▼              ▼   │   │
│  │  GameCanvas  HUD        Controls│   │
│  │  ("use client")                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Three.js Layer                │   │
│  │  (WebGL Context)                │   │
│  │  - Scene, Camera, Renderer      │   │
│  │  - Meshes (Star, Planets, Probe)│   │
│  │  - OrbitControls                │   │
│  │  - Trail Visualization          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Physics Engine (physics.ts)   │   │
│  │  - N-body simulation            │   │
│  │  - Leapfrog/Verlet integration  │   │
│  │  - Swing-by detection           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 2.2 データフロー

```
User Input (Keyboard)
        │
        ▼
   GameCanvas ──────► threeSetup.ts ──────► physics.ts
        │              (initThreeJS)         (stepBodies)
        │                    │                     │
        │                    │                     ▼
        │                    │              Physics State
        │                    │                     │
        │                    ▼                     │
        │             Visual Sync ◄────────────────┘
        │            (mesh.position)
        │
        └─────────────► HUD State Update
                       (throttled 200ms)
                              │
                              ▼
                         HUD Display
```

### 2.3 フレームワーク構造

- **App Router**: Next.js 13+のApp Routerを使用
- **Client Components**: Three.jsを使用するコンポーネントは`"use client"`ディレクティブで明示的にクライアントサイドレンダリング
- **SSR回避**: Three.jsがブラウザAPIに依存するため、関連コンポーネントはクライアント専用

---

## 3. 機能仕様

### 3.1 ゲームの目的と仕組み

プレイヤーは宇宙探査機を操作し、太陽系内の惑星の重力を利用したスイングバイ（重力アシスト）を行いながら、より遠くへ、より速く航行することを目指す。

### 3.2 操作方法

| 操作 | 説明 |
|------|------|
| **← →** | 左右方向に推進（X軸） |
| **↑** | 前進加速（-Z方向） |
| **↓** | 減速（+Z方向） |
| **R** | シミュレーションをリスタート |
| **マウスドラッグ** | カメラの回転（OrbitControls） |
| **マウスホイール** | カメラのズームイン/アウト |

**推進力の詳細:**
- 各キー入力により、探査機の速度ベクトルに `dvScale = 0.02` のデルタを加算
- 1フレームあたり複数回の物理サブステップで適用されるため、累積効果あり

### 3.3 カメラ視点切り替え

プレイヤーはUIから3種類のカメラ視点を選択できます。

#### 3.3.1 視点モード

| 視点モード | 説明 | カメラ位置 | OrbitControls |
|-----------|------|-----------|--------------|
| **自由視点（マウス操作）** | マウスで自由にカメラを操作できる | ユーザー操作に依存 | 有効 |
| **真上視点（太陽中心）** | 太陽系を真上から俯瞰する | (0, 1500, 0) → (0, 0, 0) | 無効 |
| **探査機追従視点** | 探査機を後方から追従する | 探査機の後方150ユニット、上方80ユニット | 無効 |

#### 3.3.2 実装詳細

**真上視点:**
```typescript
camera.position.set(0, 1500, 0);
camera.lookAt(0, 0, 0);
controls.enabled = false;
```
- 太陽を中心に太陽系全体を俯瞰
- 惑星の配置と軌道が一目で分かる
- 軌道計画に最適

**探査機追従視点:**
```typescript
// 速度方向から逆算してカメラ位置を決定
const velNorm = velocity.clone().normalize();
const camOffset = velNorm.multiplyScalar(-150);  // 150ユニット後方
const camPos = probePos.clone().add(camOffset);
camPos.y += 80;  // 80ユニット上方

camera.position.copy(camPos);
camera.lookAt(probePos);
controls.enabled = false;
```
- 探査機の進行方向に応じて自動的にカメラが回転
- 探査機が静止している場合は固定オフセットを使用
- 探査機の動きを直感的に把握できる

**自由視点:**
```typescript
controls.enabled = true;
controls.update();
```
- OrbitControlsが有効
- マウスドラッグで回転、ホイールでズーム
- 好きな角度から観察可能

#### 3.3.3 UI配置

画面左下に視点切り替えボタンを独立配置：
- **配置**: 画面左下（bottom: 20px, left: 20px）
- **レイアウト**: 3つのボタンを横並びに配置
- **スタイル**:
  - 現在選択中の視点は緑色で発光（box-shadow付き）
  - 非選択の視点は半透明背景
  - ホバー時に浮き上がりエフェクト

**実装箇所:**
- `CameraControls.tsx`: 独立したカメラ視点切り替えコンポーネント
- `GameCanvas.tsx:165-202`: カメラ位置更新ロジック
- `page.tsx`: カメラ視点の状態管理

### 3.4 HUD表示内容（インタラクティブUI）

#### 3.4.1 コンパクト1行表示

画面左上に探査機データを1行で表示：

**表示形式:**
```
[グラフ] [ミッション] [操作方法] [設定] | 状態:Running, 速度:20.0km/s, 距離:5.23AU, 燃料:90.3%, スイングバイ:2回
```

| 項目 | 単位 | 説明 |
|------|------|------|
| **状態** | - | `Idle`, `Running`（速度 > 0.001）, または `Fuel Depleted`（燃料切れ） |
| **速度** | km/s | 探査機の速度ベクトルの大きさ（地球公転速度基準で換算） |
| **距離** | AU | 探査機が移動した累積距離（天文単位） |
| **燃料** | % | 残燃料（0-100%）、推進操作で消費される |
| **スイングバイ** | 回 | スイングバイ成功回数 |

**更新頻度:**
- 200msごとにスロットリング
- または、速度・距離・燃料・スイング回数・状態が閾値を超えて変化した場合に即時更新

#### 3.4.2 ドロップダウンパネル

HUDに4つのボタンを配置し、クリックでパネルを展開/折りたたみ：

**ボタン一覧:**
- **グラフ**: 速度と距離のリアルタイムグラフを表示
- **ミッション**: ミッション進捗を表示
- **操作方法**: キーボード操作の説明を表示
- **設定**: シミュレーション設定（物理パラメータ）を表示

**動作:**
- 4つのボタンは排他的に動作（1つ開くと他は閉じる）
- パネルはHUDの下に展開（top: 60px, left: 20px）
- スライドダウンアニメーション付き

#### 3.4.3 リアルタイムグラフ

**仕様:**
- **速度グラフ**: 緑色（#00ff88）、最大100ポイント保存
- **距離グラフ**: 青色（#00aaff）、最大100ポイント保存
- **描画方式**: Canvas API（軽量・高速）
- **表示内容**:
  - 現在値（リアルタイム更新）
  - 最小値・最大値
  - グリッド線（4分割）
  - 自動スケーリング

**データ保存:**
```typescript
interface DataPoint {
    time: number;  // 経過時間（秒）
    value: number; // 速度または距離
}
```

#### 3.4.4 ミッション進捗システム

**ミッション一覧:**
1. **1 AU到達**: 地球の公転軌道半径に到達
2. **5 AU到達**: 木星軌道付近に到達
3. **高速飛行**: 20 km/s以上の速度を達成
4. **スイングバイマスター**: 3回以上のスイングバイ実行
5. **燃料節約**: 燃料50%以上残して5 AU到達

**表示内容:**
- 全体進捗（完了数/総ミッション数）
- 各ミッションの達成状態（チェックマーク付き）
- 進捗バー（現在値/目標値）
- 達成時のシマーアニメーション

#### 3.4.5 視覚効果

**アニメーション:**
- 状態に応じた色変化（燃料低下時は黄色で点滅）
- パネル展開時のスライドダウン
- ミッション達成時のシマー効果
- ボタンホバー時の浮き上がり効果

**スタイリング:**
- 半透明背景（rgba(0, 0, 0, 0.7-0.8)）
- 緑/青のサイバーパンク風配色
- 境界線とシャドウによる視認性向上

### 3.5 シミュレーション設定UI

HUDの「設定」ボタンをクリックすると、ドロップダウンパネルで以下のパラメータ調整が可能：

**パラメータ調整スライダー:**

| パラメータ | 範囲 | デフォルト | 説明 |
|-----------|------|-----------|------|
| **Probe speed multiplier** | 0.95 - 1.50 | 1.05 | 探査機の初期速度倍率（地球公転速度の何倍か、現実的な範囲に制限） |
| **Gravity G** | 0.01 - 1.0 | 0.133 | 重力定数（調整済み） |
| **Star mass** | 50,000 - 500,000 | 333,000 | 中央星の質量（太陽質量、地球質量比） |

**UIデザイン:**
- カスタムスタイルのスライダー（緑色のサム、半透明トラック）
- リアルタイムで値を表示
- パネルはHUDと統一されたデザイン

**注意:** パラメータ変更は次回リスタート（R キー）時に反映される。

### 3.6 UI全体の配置

**画面左上（HUD）:**
- コンパクト1行表示（探査機データ + ドロップダウンボタン）
- パネル展開エリア（グラフ/ミッション/操作方法/設定）

**画面左下:**
- カメラ視点切り替えボタン（自由視点 | 真上視点 | 探査機追従）

**旧UIからの変更点:**
- 右上のControlsパネルを削除
- すべての機能をHUDとカメラコントロールに統合
- 画面占有率を大幅に削減
- 3D表示の視認性を向上

### 3.7 太陽系の構成

シミュレーション内の天体：

| 天体 | 距離（AU） | 半径 | 色 | 質量（地球質量比） | 備考 |
|------|-----------|------|----|--------------------|------|
| **中央星** | 0 | 5 | 黄色 | 4000（デフォルト） | 発光マテリアル |
| **Mercury** | 0.39 | 3 | グレー | 0.055 | 水星相当 |
| **Venus** | 0.72 | 5 | 淡黄色 | 0.815 | 金星相当 |
| **Earth** | 1.00 | 5.5 | 青 | 1.0 | 地球相当 |
| **Mars** | 1.52 | 4 | 赤 | 0.107 | 火星相当 |
| **Jupiter** | 5.20 | 14 | オレンジ | 317.8 | 木星相当 |
| **Saturn** | 9.58 | 12 | 淡黄色 | 95.16 | 土星相当 |
| **Uranus** | 19.20 | 9 | 水色 | 14.5 | 天王星相当 |
| **Neptune** | 30.05 | 9 | 青紫 | 17.1 | 海王星相当 |
| **探査機** | 1.0（初期） | - | 複数色 | 1 | プレイヤー操作、地球軌道から出発、ボイジャー型デザイン |

**単位系:**
- 1 AU = 100 シーン単位
- 全惑星は初期状態で円軌道に近い速度で配置
- 探査機の初期速度: 地球公転速度の1.05倍（5%の脱出速度）

**縮尺の注意:**
- **距離**: 非常に厳密（誤差 < 1%）
- **惑星の直径**: 視認性のためデフォルメ（実際の比率より大きく表示）
- **太陽の直径**: 実際は地球の109倍だが、シミュレーションでは0.91倍（ゲームプレイのため）

#### 3.7.1 探査機の3Dデザイン

**デザインコンセプト:**
ボイジャー探査機をモチーフにしたリアルな3Dモデル。THREE.jsのジオメトリを組み合わせて構築。

**実装方式:**
- `THREE.Group`を使用して複数のパーツを組み立て
- 各パーツに適切なマテリアル（メタリック、発光など）を適用
- スケール3倍で視認性を確保

**パーツ構成（8パーツ）:**

| パーツ名 | ジオメトリ | サイズ | 色/マテリアル | 位置 | 説明 |
|---------|-----------|-------|-------------|------|------|
| **本体** | CylinderGeometry | 半径0.5, 高さ0.4, 10角形 | 灰色, metalness: 0.6 | 中央 | 探査機のメインボディ |
| **パラボラアンテナ** | CylinderGeometry | 半径1.2, 高さ0.1, 32角形 | 白色, metalness: 0.8 | 前方+0.3 | 地球との通信用アンテナ |
| **アンテナフィード** | ConeGeometry | 半径0.15, 高さ0.4 | 灰色 | 前方+0.5 | アンテナ中央の受信部 |
| **RTGブーム** | CylinderGeometry | 半径0.05, 長さ3 | 濃灰色 | 左-1.5 | 電源部を支える腕 |
| **RTG電源** | BoxGeometry | 0.2×0.2×0.3 | 暗色, emissive: 赤 | 左-3.0 | 放射性同位体熱電気転換器 |
| **マグネトメーターブーム** | CylinderGeometry | 半径0.03, 長さ4 | 灰色 | 右+2.0 | センサーを支える腕 |
| **マグネトメーターセンサー** | BoxGeometry | 0.15×0.15×0.15 | オレンジ色 | 右+4.0 | 磁場測定装置 |
| **科学機器プラットフォーム** | BoxGeometry | 0.4×0.3×0.3 | 中灰色 | 上+0.35 | カメラや分光計などの搭載部 |

**実装詳細:**

**実装箇所:** `src/lib/threeSetup.ts:140-209`

**コード構造:**
```typescript
const probe = new THREE.Group();

// 各パーツを作成してprobeに追加
probe.add(body);
probe.add(dish);
probe.add(feed);
probe.add(rtgBoom);
probe.add(rtg);
probe.add(magBoom);
probe.add(magSensor);
probe.add(instruments);

// スケーリング（視認性向上のため3倍）
probe.scale.set(3, 3, 3);

scene.add(probe);
```

**視覚的特徴:**
- **メタリック質感**: 宇宙船らしい金属的な表面（metalness: 0.6-0.8）
- **RTG発光**: 電源部が薄く赤く発光（emissive: 0x330000）
- **非対称構造**: 左右に異なる長さのブームが伸びる（実際のボイジャーと同様）
- **スケール調整**: 全体を3倍に拡大して詳細を視認可能に

**物理シミュレーション上の扱い:**
- 衝突判定用の半径: 0.6シーン単位（元の球体と同じ）
- 視覚モデルのスケールと物理モデルのサイズは独立
- 質量: 1（地球質量単位、実際は無視できるほど小さいが計算上の値）

**スイングバイ時の視覚効果:**
- 本体（probe.children[0]）が赤く発光（emissive: 0xff4444）
- 0.5秒後に元の色に戻る
- THREE.Groupに対応した実装（`threeSetup.ts:762-775`）

**デザインの意図:**
- **教育的価値**: 実際の宇宙探査機の構造を学べる
- **没入感**: リアルな形状でゲーム体験を向上
- **視認性**: スケールとマテリアルで見やすさを確保

#### 3.7.2 GLBモデル読み込み機能

**概要:**
外部の3Dモデルファイル（GLB/GLTF形式）を読み込んで、探査機として表示する機能。カスタムの3Dモデルを使用することで、より多様なビジュアル表現が可能になります。

**実装方式:**
- `GLTFLoader`を使用してGLB/GLTFファイルを非同期読み込み
- 読み込み成功時：GLBモデルで探査機を置き換え
- 読み込み失敗時：Voyagerプローブ（3.7.1）にフォールバック

**実装箇所:**
- `src/lib/threeSetup.ts:136-189` - `loadGLBProbe()` 関数
- `src/lib/threeSetup.ts:263-290` - 初期化時のGLBロード処理

**モデルファイルの配置:**
```
public/
  └── models/
      └── space_fighter.glb  (または任意のGLBファイル)
```

**コード構造:**
```typescript
function loadGLBProbe(
    modelPath: string,
    onLoad: (model: THREE.Group) => void,
    onError: (error: any) => void
): void {
    const loader = new GLTFLoader();
    loader.load(
        modelPath,
        (gltf) => {
            const model = gltf.scene;

            // スケールと回転の調整
            model.scale.set(0.05, 0.05, 0.05);
            model.rotation.y = Math.PI;

            // マテリアルの明るさ調整
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    // 色を1.1倍明るく
                    child.material.color.multiplyScalar(1.1);
                }
            });

            onLoad(model);
        },
        (progress) => { /* 進捗表示 */ },
        (error) => { onError(error); }
    );
}
```

**初期化フロー:**
1. `createVoyagerProbe()`でVoyagerプローブを作成（即座に表示）
2. `loadGLBProbe()`でGLBモデルを非同期読み込み開始
3. 読み込み成功時：
   - シーンからVoyagerプローブを削除
   - GLBモデルを同じ位置に配置
   - `probe`参照を更新
4. 読み込み失敗時：Voyagerプローブをそのまま使用

**マテリアル調整:**
- **色の明るさ**: 1.1倍に調整（暗いモデルの視認性向上）
- **メタルネス**: 1.2倍に増加（金属的な反射を強調）
- **ラフネス**: 0.7倍に減少（表面を滑らかに）

**スケール・回転の調整:**
```typescript
model.scale.set(0.05, 0.05, 0.05);  // サイズ調整
model.rotation.y = Math.PI;          // 180度回転（向き調整）
```

**ロギング:**
- 読み込み進捗: `"Loading model: XX%"`
- 成功: `"GLB model loaded successfully: /models/space_fighter.glb"`
- 置き換え完了: `"Probe replaced with GLB model successfully"`
- 失敗: `"Failed to load GLB model, using Voyager probe as fallback"`

**利点:**
- **カスタマイズ性**: Blender等で作成した任意の3Dモデルを使用可能
- **フォールバック安全性**: ロード失敗時も動作継続
- **非同期処理**: ロード中もゲームは動作

**制約事項:**
- GLB/GLTF形式のみ対応
- モデルのスケールと向きは手動調整が必要
- ファイルサイズが大きいとロードに時間がかかる

#### 3.7.3 探査機の自動回転（速度ベクトル追従）

**概要:**
探査機が進行方向（速度ベクトル）を向くように自動的に回転する機能。より自然で直感的な視覚表現を実現します。

**実装方式:**
- Quaternion補間（Slerp）による滑らかな回転
- 速度ベクトルから目標回転を計算
- 毎フレーム少しずつ回転（急激な変化を回避）

**実装箇所:** `src/lib/threeSetup.ts:801-824`

**アルゴリズム:**
```typescript
// 1. 速度チェック
const speed = state.velocity.length();
if (speed > 0.1) {  // 閾値以上の速度がある場合のみ

    // 2. 目標方向の計算
    const direction = state.velocity.clone().normalize();

    // 3. 目標回転行列の作成
    const targetMatrix = new THREE.Matrix4();
    targetMatrix.lookAt(
        new THREE.Vector3(0, 0, 0),
        direction.negate(),  // モデルの前方が逆向きなので反転
        new THREE.Vector3(0, 1, 0)
    );

    // 4. Quaternionに変換
    const targetQuaternion = new THREE.Quaternion();
    targetQuaternion.setFromRotationMatrix(targetMatrix);

    // 5. 滑らか補間（Slerp）
    const rotationSpeed = 0.15;  // 15%/フレーム
    probe.quaternion.slerp(targetQuaternion, rotationSpeed);
}
```

**パラメータ:**

| パラメータ | 値 | 説明 |
|-----------|---|------|
| **速度閾値** | 0.1 | この速度以下では回転しない（静止時の不要な回転を防止） |
| **回転速度** | 0.15 | 毎フレーム15%ずつ目標に近づく（0.0-1.0の範囲） |
| **Up Vector** | (0, 1, 0) | Y軸を上方向として使用 |
| **方向反転** | あり | `.negate()`で反転（モデルの前方が逆向きのため） |

**回転速度の調整:**
```typescript
const rotationSpeed = 0.15;  // デフォルト（滑らか）
const rotationSpeed = 0.05;  // より滑らか（ゆっくり）
const rotationSpeed = 0.30;  // より速く（キビキビ）
const rotationSpeed = 1.0;   // 即座に回転（補間なし）
```

**数学的背景:**
- **Slerp (Spherical Linear Interpolation)**: 球面線形補間
  - 2つのQuaternion間を最短経路で補間
  - 回転速度が一定で、ジンバルロックが発生しない
  - `quaternion.slerp(target, alpha)`: alphaの値（0-1）で補間率を制御

**方向反転の理由:**
3Dモデルの前方向は制作ソフトによって異なるため、`direction.negate()`で反転しています。
- Blender: -Y軸または+Y軸が前方
- Unity: +Z軸が前方
- 使用中のモデル: 反転が必要

**動作フロー:**
1. 探査機が推進力で加速
2. 速度ベクトルが変化
3. 速度が0.1以上なら回転処理開始
4. 現在の向きから目標向きへ徐々に回転
5. 滑らかに進行方向を向く

**視覚的効果:**
- **没入感の向上**: 探査機が「飛んでいる」感覚
- **直感的理解**: どの方向に進んでいるか一目でわかる
- **滑らかな動き**: 急激な回転がなく自然

**最適化:**
- 速度が低い時は回転処理をスキップ（CPU負荷軽減）
- Quaternion計算は毎フレーム実行だが軽量

**既知の制約:**
- モデルによっては方向調整（`.negate()`の有無）が必要
- Up Vectorの選択もモデルに依存

#### 3.7.4 ドロップダウンメニューによるモデル選択

**概要:**
ユーザーがHUD上のドロップダウンメニューから探査機の3Dモデルをリアルタイムで選択・切り替えできる機能。15種類のモデルから自由に選択可能。

**実装方式:**
- モデルリストを定数として定義
- HUDにセレクトボックスを配置
- 選択変更時にシーン全体を再初期化してモデルを切り替え

**実装箇所:**
- `src/app/page.tsx:16-33` - PROBE_MODELS定数（モデルリスト）
- `src/app/page.tsx:53` - selectedModel状態管理
- `src/components/HUD.tsx:131-145` - ドロップダウンUI
- `src/components/GameCanvas.tsx:50-55` - モデルパス取得とthreeSetup連携
- `src/lib/threeSetup.ts:193, 290-320` - probeModelPathオプション対応
- `src/app/globals.css:602-644` - CSSスタイリング

**利用可能なモデル（15種類）:**

| value | label | ファイル名 |
|-------|-------|-----------|
| voyager | Voyager (Built-in) | null（組み込み） |
| space_fighter | Space Fighter | space_fighter.glb |
| voyager_satellite | Voyager Satellite | voyager_space_satellite__draft.glb |
| lucy_probe | Lucy NASA Probe | lucy__nasa_space_probe__free_download.glb |
| space_shuttle | Space Shuttle | space_shuttle.glb |
| space_shuttle_2 | Space Shuttle 2 | space_shuttle_2.glb |
| space_ship | Space Ship | space_ship.glb |
| space_ship_2 | Space Ship 2 | space_ship_2.glb |
| space_fighter_3 | Space Fighter 3 | space_fighter_3.glb |
| lego_scooter | LEGO Space Scooter | lego_885_-_space_scooter.glb |
| sputnik | Retro Sputnik | space_retro_sputnik.glb |
| unipersonal | Unipersonal Vessel | unipersonal_space_vessel.glb |
| yamato_2205 | Yamato 2205 | space_battleship_yamato_2205.glb |
| yamato_refit | Yamato Refit | space_battleship_yamato_refit.glb |
| station_2001 | Space Station (2001) | space_station_v_2001_a_space_odyssey.glb |

**UI配置:**
```
HUD上部: [設定] [重力井戸☑] | [モデル: ▼Space Fighter] | 状態: Running...
```

ドロップダウンは重力井戸チェックボックスの右隣に配置。

**データ構造:**
```typescript
export const PROBE_MODELS = [
    { value: 'voyager', label: 'Voyager (Built-in)', path: null },
    { value: 'space_fighter', label: 'Space Fighter', path: '/models/space_fighter.glb' },
    // ... 他のモデル
];
```

**状態管理フロー:**
1. ユーザーがドロップダウンでモデルを選択
2. `selectedModel` stateが更新される
3. `GameCanvas`の`useEffect`が`selectedModel`の変更を検知
4. `PROBE_MODELS`から対応するモデルのpathを取得
5. `initThreeJS()`に`probeModelPath`を渡してシーン再初期化
6. GLBローダーが新しいモデルを読み込み
7. 探査機が新しいモデルに置き換わる

**シーン再初期化:**
```typescript
// GameCanvas.tsx
const modelData = PROBE_MODELS.find(m => m.value === selectedModel);
const probeModelPath = modelData?.path ?? null;

let threeObj = initThreeJS(canvas, {
    probeSpeedMult,
    G: gravityG,
    starMass,
    gravityGridEnabled,
    probeModelPath  // 選択されたモデルのパス
});
```

**threeSetupでの処理:**
```typescript
// threeSetup.ts
const modelPath = options?.probeModelPath;
if (modelPath) {
    // GLBモデルをロード
    loadGLBProbe(modelPath, onLoad, onError);
} else {
    // 組み込みVoyagerプローブを使用
    console.log('Using built-in Voyager probe');
}
```

**CSSスタイリング:**
```css
.model-selector {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    font-size: 12px;
    color: #0ff;
}

.model-dropdown {
    background: rgba(0, 20, 40, 0.9);
    color: #0ff;
    border: 1px solid #0ff;
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 11px;
    transition: all 0.2s ease;
}

.model-dropdown:hover {
    border-color: #0f0;
}
```

**依存関係の追加:**
```typescript
// GameCanvas.tsx useEffect dependencies
}, [hudSetters, probeSpeedMult, gravityG, starMass, selectedModel]);
```

`selectedModel`が変更されるとシーン全体が再初期化される。

**利点:**
- **多様性**: 15種類のモデルから選択可能
- **即座の反映**: ドロップダウン変更で即座に切り替わる
- **拡張性**: `PROBE_MODELS`配列に追加するだけで新モデル対応
- **フォールバック**: 組み込みVoyagerがあるため、GLB無しでも動作

**ユーザビリティ:**
- シンプルで直感的な操作
- 視覚的フィードバック（ホバー時のハイライト）
- サイバーパンク風のデザインで統一感

**注意事項:**
- モデル切り替え時はシーン全体が再初期化されるため、燃料・スリングショット回数などの状態がリセットされる
- 各GLBモデルのスケール・回転は手動調整が必要（現在は一律0.05倍スケール）
- モデルファイルは`public/models/`に配置する必要がある

**今後の改善案:**
- モデル切り替え時に状態を保持する機能
- モデルごとに最適なスケール・回転を事前設定
- サムネイル画像の表示
- モデルのプリロード（初回表示の高速化）

### 3.8 軌道可視化

**惑星公転軌道の表示:**

全ての惑星の公転軌道を視覚的に表示します（実装: `threeSetup.ts:269-300`）。

**仕様:**
- **形状**: 円形の線（LineBasicMaterial）
- **半径**: 各惑星の軌道半径（rAU × AU）
- **セグメント数**: 128（滑らかな円を描画）
- **色**: 各惑星の色に対応
- **透明度**: 30%（opacity: 0.3）
- **目的**: 太陽系の構造を理解しやすくし、軌道計画の参考にする

**実装例:**
```typescript
for (const pd of solarDefs) {
    const orbitRadius = pd.rAU * AU;
    const segments = 128;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * orbitRadius;
        const z = Math.sin(theta) * orbitRadius;
        points.push(new THREE.Vector3(x, 0, z));
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({
        color: pd.color,
        transparent: true,
        opacity: 0.3
    });

    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(orbitLine);
}
```

### 3.9 星フィールド（背景星）

探査機の移動時にスピード感を演出するため、背景に大量の星を表示します。

#### 3.9.1 概要

**目的:**
- 探査機の高速移動時にスピード感を演出
- パララックス効果により視覚的な深度を表現
- 宇宙空間の臨場感を向上

**実装方式:**
- 静的な星フィールド（色のバリエーション付き）
- Three.jsのPointsMaterialを使用した効率的なレンダリング

#### 3.9.2 仕様

**星の数:** 8,000個

**配置:**
- 球状にランダム配置（半径5,000-15,000シーン単位）
- 球面座標系を使用した均等分布
- 探査機を中心とした広大な範囲をカバー

**色のバリエーション:**
| 色 | 比率 | RGB値 | 説明 |
|----|------|-------|------|
| 純白 | 70% | (1.0, 1.0, 1.0) | ほとんどの星 |
| 青白い | 15% | (0.8, 0.9, 1.0) | 高温星を表現 |
| 黄白い | 15% | (1.0, 0.95, 0.8) | 低温星を表現 |

**視覚プロパティ:**
- **サイズ**: 10ピクセル
- **サイズ減衰**: 有効（距離に応じてサイズが変化）
- **透明度**: 80%（opacity: 0.8）
- **頂点カラー**: 各星が個別の色を持つ

#### 3.9.3 実装詳細

**実装箇所:** `src/lib/threeSetup.ts:166-221`

**コード例:**
```typescript
function createStarField() {
    const starCount = 8000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        // Position: random spherical distribution
        const radius = 5000 + Math.random() * 10000; // 5000-15000 range
        const theta = Math.random() * Math.PI * 2;   // 0-2π
        const phi = Math.acos(2 * Math.random() - 1); // 0-π (uniform sphere)

        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = radius * Math.cos(phi);

        // Color: mostly white, occasionally bluish or yellowish
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            // White
            starColors[i * 3] = 1;
            starColors[i * 3 + 1] = 1;
            starColors[i * 3 + 2] = 1;
        } else if (colorChoice < 0.85) {
            // Bluish white
            starColors[i * 3] = 0.8;
            starColors[i * 3 + 1] = 0.9;
            starColors[i * 3 + 2] = 1;
        } else {
            // Yellowish white
            starColors[i * 3] = 1;
            starColors[i * 3 + 1] = 0.95;
            starColors[i * 3 + 2] = 0.8;
        }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 10,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}
```

#### 3.9.4 スピード感の演出メカニズム

**パララックス効果:**
1. 探査機が移動するとカメラも動く（追従視点または自由視点）
2. 背景の星が相対的に流れて見える
3. 近くの星は速く、遠くの星はゆっくり動く（視差効果）
4. 速度が速いほど星の流れも速くなる

**最も効果が顕著な状況:**
- **探査機追従視点**: 星が前方から流れてくる感覚
- **高速移動時**: スイングバイ後の加速直後
- **燃料を使った連続推進**: 加速感が視覚的に伝わる

**視点別の見え方:**
| 視点モード | 星の見え方 | スピード感 |
|-----------|-----------|----------|
| 探査機追従 | 前方から流れてくる | ⭐⭐⭐⭐⭐ |
| 真上視点 | 軌跡と星が同時に見える | ⭐⭐⭐ |
| 自由視点 | カメラ操作に応じて変化 | ⭐⭐⭐⭐ |

#### 3.9.5 パフォーマンス最適化

**効率的なレンダリング:**
- `BufferGeometry`を使用（頂点データを効率的に管理）
- `PointsMaterial`を使用（軽量なレンダリング）
- 静的オブジェクト（毎フレーム更新不要）

**パフォーマンス影響:**
- 8,000個の点のレンダリング
- GPU負荷：低（PointsMaterialは軽量）
- CPU負荷：なし（静的オブジェクト）

**想定パフォーマンス:**
- 60 FPS維持（一般的なGPU）
- 他の描画要素（惑星、軌道、UI）との併用でも問題なし

#### 3.9.6 デザイン上の意図

**元のHTML版との対応:**
元の`space_probe_game.html`では、白い点として星を表示していました。これにより：
- 探査機の移動がより実感できた
- スイングバイの速度増加が視覚的に明確だった
- ゲームプレイの没入感が向上していた

**今回の実装での改善点:**
- 色のバリエーションで視覚的な深度を追加
- より現実的な星空の表現
- Three.jsの機能を活用した高品質なレンダリング

### 3.10 燃料システム

探査機の推進操作（矢印キー入力）には燃料が必要です。燃料が切れると推進できなくなり、スイングバイを活用した効率的な軌道設計が重要になります。

#### 3.10.1 基本仕様

**初期燃料:**
- 100.0%

**燃料消費方式:**
- delta-v比例消費方式（案B）
- 適用したdelta-vの大きさに比例して燃料を消費

**消費計算式:**
```typescript
dvMagnitude = √(dv_x² + dv_y² + dv_z²)
fuelConsumed = dvMagnitude × FUEL_CONSUMPTION_RATE
fuel = max(0, fuel - fuelConsumed)
```

**定数:**
```typescript
FUEL_CONSUMPTION_RATE = 1.0  // threeSetup.ts:38
dvScale = 0.02              // GameCanvas.tsx:95 (単一方向推進の delta-v)
```

#### 3.10.2 消費量の例

| 操作 | delta-v | 消費量 (%) | 可能回数 |
|------|---------|-----------|---------|
| 単一方向 (↑のみ) | 0.02 | 0.02 | 5000回 (約83秒) |
| 斜め推進 (↑← 同時) | 0.028 | 0.028 | 3571回 (約60秒) |
| 4方向同時 | 0.04 | 0.04 | 2500回 (約42秒) |

**推進可能時間:**
- 単一方向連続推進: 約83秒 (60fps想定)
- 実際のゲームプレイ: 60-100秒程度（斜め推進やバースト推進を含む）

#### 3.10.3 燃料切れ時の挙動

**燃料が0%になった場合:**
1. **推進不可**: 矢印キーを押しても探査機は加速しない
2. **ステータス更新**: HUDのステータスが `Fuel Depleted` に変更される
3. **慣性航行**: 既存の速度は維持され、重力の影響を受け続ける
4. **スイングバイ可能**: 燃料がなくてもスイングバイは実行できる

**実装箇所:**
- `GameCanvas.tsx:152-171`: 燃料チェックと消費ロジック
- `threeSetup.ts:569-574`: ステータス更新ロジック

#### 3.10.4 実装詳細

**燃料消費ロジック（GameCanvas.tsx:152-171）:**
```typescript
if (dv[0] !== 0 || dv[1] !== 0 || dv[2] !== 0) {
    // Calculate fuel consumption based on delta-v magnitude
    const dvMagnitude = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2]);
    const fuelConsumed = dvMagnitude * PHYSICS_SCALE.FUEL_CONSUMPTION_RATE;

    // Check if enough fuel available
    if (state.fuel > 0) {
        // Consume fuel
        state.fuel = Math.max(0, state.fuel - fuelConsumed);

        // Apply thrust
        applyDeltaVToProbe(dv);
    }
    // If fuel depleted, thrust is not applied
}
```

**ステータス更新ロジック（threeSetup.ts:569-574）:**
```typescript
// Update status: check fuel first, then velocity
if (state.fuel <= 0) {
    state.status = 'Fuel Depleted';
} else {
    state.status = state.velocity.length() > 1e-3 ? 'Running' : 'Idle';
}
```

#### 3.10.5 ゲームデザインへの影響

**戦略性の向上:**
- プレイヤーは限られた燃料でいかに遠くへ到達するかを考える必要がある
- スイングバイは燃料を消費しないため、その価値が大幅に向上
- 効率的な軌道計画が重要になる

**難易度バランス:**
- 初心者: 木星・土星への到達に十分な燃料がある
- 中級者: 複数のスイングバイで燃料を節約する戦略が必要
- 上級者: 最小燃料での外縁天体到達を目指す

**スイングバイの価値:**
| 方法 | 速度増加 | 燃料消費 |
|------|---------|---------|
| 推進のみ | 制御可能 | 大量消費 |
| スイングバイ | 惑星質量に依存 | ゼロ |

木星スイングバイ1回で得られる速度増加（deltaV ≈ 0.5-2.0 scene units/sec）は、推進で得ようとすると燃料25-100%相当の価値があります。

#### 3.10.6 パラメータ調整

消費率を変更する場合：

```typescript
// 消費率を0.5にすると、推進可能時間が2倍
FUEL_CONSUMPTION_RATE: 0.5  // Easy mode

// 消費率を2.0にすると、推進可能時間が半分
FUEL_CONSUMPTION_RATE: 2.0  // Hard mode
```

**推奨値:** 1.0（デフォルト）
- バランスが良い
- スイングバイの価値を実感できる
- 初心者でも十分にプレイ可能

### 3.11 重力井戸グリッド可視化

重力による時空の歪みを視覚的に表現するため、恒星と惑星の重力ポテンシャルに応じて湾曲する3Dグリッドを表示できます。

#### 3.11.1 概要

**目的:**
- 重力の強さを視覚的に理解できるようにする
- 恒星や惑星周辺の重力井戸（gravity well）を3D表現
- 一般相対性理論的な時空の歪みの直感的な理解を促進

**実装方式:**
- Three.jsのPlaneGeometryをワイヤーフレーム表示
- 各頂点のY座標を重力ポテンシャルに応じて変形
- 通常のGridHelperと切り替え可能

#### 3.11.2 仕様

**グリッドサイズ:** 7000 × 7000 シーン単位（通常グリッドと同一）

**分割数:** 200 × 200（高解像度で滑らかな曲面を実現）

**配置:**
- XZ平面（水平面）に配置
- グリッド外縁（遠方）をY=0付近に配置
- 惑星軌道平面と揃える

**視覚プロパティ:**
- **色**: 0xd3d3d3（ライトグレー）
- **ワイヤーフレーム**: 有効
- **透明度**: 0.05（非常に薄く、背景として機能）
- **マテリアル**: MeshBasicMaterial

#### 3.11.3 重力ポテンシャル計算

**基準ポテンシャル:**
- グリッドの4隅での重力ポテンシャルの平均値を基準として使用
- これにより、グリッド外縁がY=0付近に配置される

**頂点変形の計算式:**
```typescript
// 各頂点(x, z)での重力ポテンシャル
totalPotential = Σ (-(G × mass) / distance)  // 全天体の寄与

// 基準ポテンシャルとの相対値
relativeDepth = (totalPotential - referencePotential) × depthScale

// Y座標に適用
vertex.y = relativeDepth
```

**深さスケール係数:**
- `depthScale = 50`（視覚効果のための調整係数）
- この値により、太陽の重力井戸が視覚的に認識できる深さになる

#### 3.11.4 実装詳細

**実装箇所:** `src/lib/threeSetup.ts:72-93`, `738-806`

**グリッド生成:**
```typescript
const gridSize = 7000;
const gridDivisions = 200;
const gravityWellGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
gravityWellGeometry.rotateX(-Math.PI / 2); // XZ平面に回転

const gravityWellMaterial = new THREE.MeshBasicMaterial({
    color: 0xd3d3d3,
    wireframe: true,
    transparent: true,
    opacity: 0.05
});

const gravityWellMesh = new THREE.Mesh(gravityWellGeometry, gravityWellMaterial);
scene.add(gravityWellMesh);
```

**更新ロジック:**
- 毎フレーム、全天体の位置に基づいてグリッドの頂点を再計算
- `stepSimulation`関数内で`updateGravityWellGrid()`を呼び出し
- 頂点位置の更新後、`computeVertexNormals()`で法線を再計算

#### 3.11.5 UI制御

**チェックボックス配置:**
- HUD内、設定ボタンの右隣
- `src/components/HUD.tsx:118-125`で実装

**表示形式:**
```
[グラフ] [ミッション] [操作方法] [設定] [✓ 重力井戸] | 状態:Running, ...
```

**動作:**
- チェックON: 重力井戸グリッドを表示、通常GridHelperを非表示
- チェックOFF: 通常GridHelperを表示、重力井戸グリッドを非表示

**状態管理:**
- `src/app/page.tsx:32`: `gravityGridEnabled`状態
- `src/components/GameCanvas.tsx`: propとして受け取り、Three.jsに伝達

#### 3.11.6 視覚効果の特徴

**太陽の重力井戸:**
- 中心部で最も深く湾曲
- 質量が333,000（地球質量比）のため、非常に顕著

**惑星の重力井戸:**
- 木星: 明確に認識可能な浅いくぼみ
- 土星: 木星より浅いが視認可能
- 地球・金星・火星: 非常に浅く、ほとんど見えない
- 質量比が正確に反映されている

**グリッド外縁:**
- Y=0付近に配置
- 惑星の軌道平面と視覚的に一致
- 遠方での基準面として機能

#### 3.11.7 パフォーマンス

**頂点数:** 200 × 200 = 40,000頂点

**更新頻度:** 毎フレーム（60 FPS）

**計算量:**
- 各頂点で全天体（9個）との距離計算
- 40,000 × 9 = 360,000回の距離計算/フレーム

**最適化:**
- 距離が0.1未満の場合はスキップ（ゼロ除算回避）
- 探査機（質量が小さい）はスキップ
- BufferGeometryによる効率的なGPU転送

**想定パフォーマンス:**
- 一般的なGPUで60 FPS維持
- CPU負荷: 中程度（頂点計算）
- GPU負荷: 低（ワイヤーフレーム描画）

#### 3.11.8 教育的価値

**物理的理解:**
- 重力が時空を歪める様子を視覚化
- 一般相対性理論の直感的な理解
- 惑星の質量と重力の関係を実感

**ゲームプレイへの貢献:**
- スイングバイのタイミングを視覚的に把握
- 重力の影響範囲を確認
- 軌道計画の参考になる

#### 3.11.9 通常グリッドとの比較

| 項目 | 通常グリッド | 重力井戸グリッド |
|------|------------|----------------|
| **分割数** | 1000 | 200 × 200 (40,000頂点) |
| **形状** | 平面、線のみ | 湾曲した平面、ワイヤーフレーム |
| **色** | 0x444444/0x222222 | 0xd3d3d3 |
| **透明度** | 不透明 | 0.05（非常に薄い） |
| **更新** | 静的 | 動的（毎フレーム更新） |
| **CPU負荷** | なし | 中 |
| **用途** | 基準面、スケール感 | 重力の視覚化 |

---

## 4. 物理エンジン設計

### 4.1 数学モデル

**N体重力シミュレーション:**

各天体 `i` に対する加速度：

```
a_i = Σ (G * m_j * (r_j - r_i)) / |r_j - r_i|^3    (j ≠ i)
```

- `G`: 重力定数（デフォルト 1.0）
- `m_j`: 天体 j の質量
- `r_i`, `r_j`: 天体 i, j の位置ベクトル
- ソフトニング項: `dist² + softening²` でゼロ除算回避（softening = 0.5）

### 4.2 積分手法

**Leapfrog / Velocity-Verlet 法:**

1. **半ステップ速度計算:**
   ```
   v_{n+1/2} = v_n + a_n * (dt/2)
   ```

2. **全ステップ位置更新:**
   ```
   r_{n+1} = r_n + v_{n+1/2} * dt
   ```

3. **新位置での加速度計算:**
   ```
   a_{n+1} = computeAcceleration(r_{n+1})
   ```

4. **全ステップ速度更新:**
   ```
   v_{n+1} = v_{n+1/2} + a_{n+1} * (dt/2)
   ```

**特徴:**
- Semi-Implicit Euler法より高精度
- エネルギー保存性が良好
- 実装が簡潔でリアルタイムシミュレーションに適している

### 4.3 固定タイムステップ

**Accumulator Pattern:**

```typescript
const fixedTimeStep = 1 / 60; // 60 Hz
let accumulator = 0;
let lastTime = performance.now() / 1000;

const animate = () => {
    const now = performance.now() / 1000;
    let delta = now - lastTime;
    lastTime = now;

    // スパイラル・オブ・デス回避
    if (delta > 0.25) delta = 0.25;

    accumulator += delta;
    while (accumulator >= fixedTimeStep) {
        stepSimulation(fixedTimeStep);
        accumulator -= fixedTimeStep;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};
```

**メリット:**
- フレームレート非依存の物理演算
- 異なるFPS環境でも同一の結果
- 決定論的シミュレーション

### 4.4 スイングバイ検出アルゴリズム

スイングバイの検出は `src/lib/physics.ts:120-147` で実装されており、以下の3つの条件をすべて満たした場合に検出されます。

#### 4.4.1 検出条件の詳細

**条件1: 距離判定（Encounter Radius）**

```typescript
const encounterMultiplier = opts?.encounterMultiplier ?? 2.5;
const encounterRadius = Math.max((other.radius || 1) * encounterMultiplier, 1.0);

if (dist <= encounterRadius) {
    // 探査機が惑星の影響圏内に入った
}
```

**計算式:**
```
encounterRadius = 惑星の半径 × 2.5

例:
- 木星（半径14） → encounterRadius = 35
- 地球（半径5.5） → encounterRadius = 13.75
- 水星（半径3）  → encounterRadius = 7.5
```

**意味:**
- 探査機と惑星の距離が `encounterRadius` 以下になると「接近した」と判定
- これが緑色リング（影響圏可視化）の大きさと一致

---

**条件2: 速度増加判定（Delta-V）**

```typescript
const speedBefore = vecLen(vHalf[i]);      // 物理計算前の速度
const speedAfter = vecLen(probe.velocity); // 物理計算後の速度
const deltaV = speedAfter - speedBefore;   // 速度の変化量

const deltaVThreshold = opts?.deltaVThreshold ?? 0.05;

if (deltaV > deltaVThreshold) {
    // 十分な加速が得られた
}
```

**現在の設定値（`threeSetup.ts:334-338`）:**
```typescript
const swingOptions = {
    encounterMultiplier: 2.5,
    deltaVThreshold: 0.01,  // この値
    minGap: 0.4
};
```

**意味:**
- 速度が **0.01以上** 増加した場合のみスイングバイとして検出
- 速度が減少した場合（deltaV < 0）は検出されない
- わずかな変化（deltaV < 0.01）も検出されない

**なぜこの条件が必要か:**
- 単に接近しただけではスイングバイではない
- 実際に加速効果が得られた場合のみカウント
- ノイズ的な小さな変化を除外

---

**条件3: クールダウン時間（Min Gap）**

```typescript
const gap = opts?.minGap ?? 0.5;
const lastAt = other._lastEncounterAt || 0;

if (simTime - lastAt > gap) {
    // 前回のスイングバイから十分な時間が経過
}
```

**意味:**
- 同じ惑星で連続してスイングバイが検出されるのを防ぐ
- 0.4秒以上の間隔が必要
- 惑星の影響圏内を長時間滞在しても、1回だけカウント

**なぜこの条件が必要か:**
- 影響圏内にいる間、毎フレーム検出されてしまうのを防ぐ
- 1回の接近で1回のスイングバイとしてカウント

#### 4.4.2 完全な検出ロジック

```typescript
// physics.ts:120-147
for (let i = 0; i < n; i++) {
    if (!bodies[i].isProbe) continue;  // 探査機以外はスキップ

    const probe = bodies[i];
    const speedBefore = vecLen(vHalf[i]);      // ステップ前の速度
    const speedAfter = vecLen(probe.velocity); // ステップ後の速度

    for (let j = 0; j < n; j++) {
        if (i === j) continue;  // 自分自身はスキップ

        const other = bodies[j];
        if (other.mass < 1e-6) continue;  // 質量が小さすぎる天体はスキップ

        // 距離計算
        const rx = probe.position[0] - other.position[0];
        const ry = probe.position[1] - other.position[1];
        const rz = probe.position[2] - other.position[2];
        const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);

        // パラメータ取得
        const encounterMultiplier = opts?.encounterMultiplier ?? 2.5;
        const deltaVThreshold = opts?.deltaVThreshold ?? 0.05;
        const gap = opts?.minGap ?? 0.5;
        const encounterRadius = Math.max((other.radius || 1) * encounterMultiplier, 1.0);
        const lastAt = other._lastEncounterAt || 0;

        // === 3つの条件チェック ===
        if (dist <= encounterRadius &&           // 条件1: 距離
            simTime - lastAt > gap) {            // 条件3: クールダウン

            const deltaV = speedAfter - speedBefore;

            if (deltaV > deltaVThreshold) {      // 条件2: 速度増加
                // スイングバイ検出！
                events.swingBys.push({
                    probeId: probe.id,
                    bodyId: other.id,
                    deltaV,
                    time: simTime
                });
                other._lastEncounterAt = simTime;  // 検出時刻を記録
            }
        }
    }
}
```

#### 4.4.3 検出パラメータの調整履歴

現在の設定値（DEBUG.md セクション3で最適化）:
```typescript
const swingOptions = {
    encounterMultiplier: 2.5,   // 影響圏 = 惑星半径 × 2.5
    deltaVThreshold: 0.01,      // 最小速度増加量 = 0.01
    minGap: 0.4                 // クールダウン = 0.4秒
};
```

**調整理由:**
- `encounterMultiplier`: 2.2 → 2.5（影響圏を少し広げて検出しやすく）
- `deltaVThreshold`: 0.03 → 0.01（閾値を下げて弱い効果も検出）
- `minGap`: 0.6 → 0.4（連続検出の間隔を短縮）

詳細は `DEBUG.md セクション2-3` を参照。

#### 4.4.4 検出パラメータの効果

| パラメータ | 値 | 効果 | 変更すると... |
|-----------|-----|------|--------------|
| **encounterMultiplier** | 2.5 | 影響圏の大きさ | 大きくする → 検出しやすくなる |
| **deltaVThreshold** | 0.01 | 最小速度増加 | 小さくする → 弱い効果も検出 |
| **minGap** | 0.4秒 | 連続検出の間隔 | 小さくする → 同じ惑星で複数回検出可能 |

#### 4.4.5 実際の検出例

**例1: 木星でのスイングバイ成功**
```
1. 探査機が木星に接近
   → dist = 30（木星の半径14 × 2.5 = 35以下）
   ✅ 条件1: クリア

2. 前回の検出から0.4秒以上経過
   → simTime - lastAt = 5.2秒
   ✅ 条件3: クリア

3. 速度が増加
   → speedBefore = 29.5
   → speedAfter = 30.3
   → deltaV = 0.8（0.01より大きい）
   ✅ 条件2: クリア

→ スイングバイ検出！
→ コンソール: "Swing-by detected at t=5.20: probe around Jupiter deltaV=0.800"
→ HUDカウンター +1
```

**例2: 地球でのスイングバイ（失敗例）**
```
1. 探査機が地球に接近
   → dist = 12（地球の半径5.5 × 2.5 = 13.75以下）
   ✅ 条件1: クリア

2. 前回の検出から0.4秒以上経過
   ✅ 条件3: クリア

3. 速度増加が小さすぎる
   → speedBefore = 29.5
   → speedAfter = 29.506
   → deltaV = 0.006（0.01より小さい）
   ❌ 条件2: 失敗

→ スイングバイ検出されず
→ 影響圏内だが効果が小さすぎる
```

#### 4.4.6 惑星ごとの検出難易度

| 惑星 | 質量 | 影響圏半径 | 典型的なdeltaV | 検出難易度 |
|------|------|-----------|--------------|----------|
| **木星** | 317.8 | 35 | 0.5-1.5 | ★（易） |
| **土星** | 95.16 | 30 | 0.3-0.8 | ★★（易） |
| **海王星** | 17.1 | 22.5 | 0.1-0.3 | ★★★（中） |
| **天王星** | 14.5 | 22.5 | 0.1-0.3 | ★★★（中） |
| **金星** | 0.815 | 12.5 | 0.005-0.015 | ★★★★（難） |
| **地球** | 1.0 | 13.75 | 0.006-0.018 | ★★★★（難） |
| **火星** | 0.107 | 10 | 0.001-0.003 | ★★★★★（極難） |
| **水星** | 0.055 | 7.5 | <0.001 | ★★★★★（極難） |

**推奨ターゲット:**
- 初心者: 木星、土星
- 中級者: 天王星、海王星
- 上級者: 地球、金星（deltaVが閾値ギリギリ）

#### 4.4.7 イベント処理

スイングバイ検出時の処理（`threeSetup.ts:551-583`）:

1. **コンソールログ出力:**
   ```
   Swing-by detected at t=5.20: probe around Jupiter deltaV=0.800
   ```

2. **HUDカウンター増加:**
   ```typescript
   state.slingshots += 1;
   ```

3. **赤いマーカー表示:**
   - 惑星位置に赤い球体を表示（半径0.8）
   - 1.2秒後に自動削除

4. **探査機の発光効果:**
   - マテリアルの`emissive`色を赤色に変更
   - 0.5秒後に元に戻る

### 4.5 重心（COM）補正

システムの重心が静止するように初期条件を補正：

**速度補正:**
```typescript
const totalMomentum = Σ (m_i * v_i)
const comVelocity = totalMomentum / Σ m_i
for each body:
    body.velocity -= comVelocity
```

**位置補正:**
```typescript
const comPosition = Σ (m_i * r_i) / Σ m_i
for each body:
    body.position -= comPosition
```

これにより、系全体が座標原点から漂流することを防ぐ。

### 4.6 速度単位の換算

シミュレーション内部の速度（scene units/sec）を実際の速度（km/s）に換算する方法。

#### 4.6.1 換算の必要性

HUDに表示される速度は、プレイヤーが実際の宇宙探査機との比較を行えるように、実際の単位系（km/s）で表示する必要があります。しかし、シミュレーション内部では独自の単位系（scene units/sec）を使用しているため、換算が必要です。

#### 4.6.2 換算係数の導出

**地球公転速度を基準にした換算:**

1. **シミュレーション内の地球公転速度:**
   ```typescript
   v_earth = sqrt((G × M_sun) / r_earth)
   v_earth = sqrt((0.133 × 333,000) / 100)
   v_earth ≈ 21.0 scene units/sec
   ```

2. **実際の地球公転速度:**
   - 約 **30 km/s**（天文学的実測値）

3. **換算係数:**
   ```typescript
   VELOCITY_TO_KM_PER_SEC = 30 km/s / 21.0 scene units/sec
                          ≈ 1.43 km/s per scene unit/sec
   ```

#### 4.6.3 実装

**定数定義（`threeSetup.ts:31-38`）:**
```typescript
export const PHYSICS_SCALE = {
    // ... 他のスケール定数 ...

    // Velocity conversion: scene units/sec to km/s
    // Based on Earth orbital velocity: ~21 scene units/sec = 30 km/s (real)
    VELOCITY_TO_KM_PER_SEC: 1.43,  // multiply scene velocity by this to get km/s

    // Fuel consumption rate: % consumed per unit delta-v
    // With dvScale = 0.02, single direction thrust consumes 0.02% per frame
    // Total fuel = 100%, allows ~5000 frames (~83 seconds at 60fps) of continuous thrust
    FUEL_CONSUMPTION_RATE: 1.0,
};
```

**HUD更新時の換算（`GameCanvas.tsx:190-196`）:**
```typescript
const speed = state.velocity ? state.velocity.length() : 0;
const speedKmPerSec = speed * PHYSICS_SCALE.VELOCITY_TO_KM_PER_SEC;
// ...
hudSetters.setVelocity(speedKmPerSec);  // km/s単位で表示
```

#### 4.6.4 換算結果の妥当性

**換算例:**
- 探査機速度 25 scene units/sec → **35.7 km/s**

**実際の宇宙探査機との比較:**
| 探査機 | 速度 (km/s) | 用途 |
|-------|-----------|------|
| ボイジャー1号 | 17 | 太陽系脱出 |
| ニューホライズンズ | 16 | 冥王星探査（史上最速） |
| パーカー・ソーラー・プローブ | 最大192 | 太陽接近時 |
| **一般的な外惑星探査機** | **30-40** | **木星・土星探査** |

**結論:** 換算後の速度（35.7 km/s）は、地球軌道から外惑星へ向かう探査機として**非常に現実的**です。

#### 4.6.5 速度スケールの意味

この換算により、プレイヤーは以下を実感できます：
- 地球軌道速度 ≈ 30 km/s
- わずか5%の加速（1.05倍）で外惑星へ到達可能な軌道へ
- スイングバイによる数 km/s の加速の重要性
- 実際の宇宙探査と同じオーダーの速度感覚

---

## 5. コンポーネント設計

### 5.1 コンポーネント階層

```
page.tsx (Client Component)
├─ GameCanvas.tsx (Client Component)
│  └─ threeSetup.ts (Three.js初期化モジュール)
│     └─ physics.ts (物理エンジンモジュール)
├─ HUD.tsx (インタラクティブUI統合コンポーネント)
│  ├─ MiniChart.tsx (リアルタイムグラフ表示)
│  ├─ MissionProgress.tsx (ミッション進捗表示)
│  ├─ ControlsHelp.tsx (操作方法表示)
│  └─ SettingsPanel.tsx (シミュレーション設定)
└─ CameraControls.tsx (カメラ視点切り替え)
```

### 5.2 各コンポーネントの責務

#### 5.2.1 page.tsx

**責務:**
- アプリケーションのルートコンポーネント
- HUD用のReact state管理（useState）
- シミュレーションパラメータ管理（probeSpeedMult, gravityG, starMass）
- 子コンポーネントへのprops配布

**主要state:**
```typescript
const [status, setStatus] = useState<string>('Idle');
const [velocity, setVelocity] = useState<number>(0);
const [distance, setDistance] = useState<number>(0);
const [fuel, setFuel] = useState<number>(100);
const [slingshots, setSlingshots] = useState<number>(0);
const [probeSpeedMult, setProbeSpeedMult] = useState<number>(1.1);
const [gravityG, setGravityG] = useState<number>(1.0);
const [starMass, setStarMass] = useState<number>(4000);
```

**HUD settersの安定化:**
```typescript
const hudSetters = React.useMemo(
    () => ({ setStatus, setVelocity, setDistance, setFuel, setSlingshots }),
    []
);
```
- `useMemo`により、setterオブジェクトの参照を固定
- `GameCanvas`の`useEffect`依存配列に含めても不要な再実行を防ぐ

#### 5.2.2 GameCanvas.tsx

**責務:**
- HTMLCanvasElementの管理（useRef）
- Three.jsの初期化とクリーンアップ
- 固定タイムステップアニメーションループ
- キーボード入力処理
- 物理シミュレーションステップの呼び出し
- HUD更新のスロットリング
- 軌跡ポイントの追加
- OrbitControlsの更新

**Props:**
```typescript
interface Props {
    hudSetters?: HUDSetters;
    probeSpeedMult?: number;
    gravityG?: number;
    starMass?: number;
}
```

**キーイベント処理:**
- `keydown`/`keyup`で入力状態を管理
- 各物理ステップ前にデルタvを計算し適用
- `R`キーでシーンを破棄・再初期化

**HUD更新ロジック:**
```typescript
const shouldUpdateTime = nowMs - lastMs > 200; // 200msスロットリング
const largeChange = Math.abs(speed - lastVals.velocity) > 0.5 || /* 他の閾値チェック */;

if (shouldUpdateTime || largeChange) {
    // setState呼び出し
}
```

#### 5.2.3 threeSetup.ts

**責務:**
- Three.jsシーンの構築（Scene, Camera, Renderer）
- 照明の設定（AmbientLight, DirectionalLight）
- 天体メッシュの作成と配置
- OrbitControlsの初期化
- 軌跡（trail）可視化のセットアップ
- 物理エンジンとの統合
- 重心補正の実行
- スイングバイイベントのビジュアルフィードバック

**エクスポート関数:**
```typescript
export function initThreeJS(
    canvas: HTMLCanvasElement,
    options?: { probeSpeedMult?: number; G?: number; starMass?: number }
): {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    dispose: () => void;
    state: ProbeState;
    probe: THREE.Mesh;
    controls: OrbitControls;
    addTrailPoint: (p: THREE.Vector3) => void;
    stepSimulation: (dt: number) => void;
}
```

**内部処理フロー:**
1. シーン・カメラ・レンダラーの生成
2. 中央星と8惑星のメッシュ作成
3. 各天体を`Body`型の配列に登録
4. 円軌道速度の計算と初期速度設定
5. 重心速度・位置の補正
6. OrbitControlsとTrail機能の初期化
7. `stepSimulation`関数の定義（physics.tsを呼び出し、結果をメッシュに反映）

**グローバルAPI:**
- `window.__applyDeltaVToProbe(dv: Vec3)`: 探査機の速度を外部から変更するためのデバッグAPI

#### 5.2.4 physics.ts

**責務:**
- Three.jsに依存しない純粋な物理演算
- N体シミュレーションの実装
- Leapfrog/Velocity-Verlet積分器
- スイングバイ検出ロジック
- ベクトル演算ユーティリティ

**エクスポート型:**
```typescript
export type Vec3 = [number, number, number];

export type Body = {
    id: string;
    mass: number;
    position: Vec3;
    velocity: Vec3;
    radius?: number;
    isProbe?: boolean;
    isStatic?: boolean;
    _lastEncounterAt?: number;
};

export type StepResult = {
    bodies: Body[];
    events: { swingBys: Array<{ probeId: string; bodyId: string; deltaV: number; time: number }> };
};
```

**主要関数:**
```typescript
export function stepBodies(
    origBodies: Body[],
    dt: number,
    G = 1.0,
    simTime = 0,
    softening = 0.1,
    opts?: SwingByOptions
): StepResult
```

**ユニットテスト可能:**
- 純粋関数として設計
- ブラウザAPIに依存しない
- Vitestでテスト実行可能

#### 5.2.5 HUD.tsx

**責務:**
- 探査機のテレメトリ情報を1行のコンパクト表示
- ドロップダウンパネルの統合管理
- 4つのボタンの排他的な動作制御
- 子コンポーネント（グラフ、ミッション、操作方法、設定）の条件付きレンダリング

**Props:**
```typescript
interface HUDProps {
    status?: string;
    velocity?: number;
    distance?: number;
    fuel?: number;
    slingshots?: number;
    velocityHistory?: DataPoint[];
    distanceHistory?: DataPoint[];
    probeSpeedMult?: number;
    setProbeSpeedMult?: (v: number) => void;
    gravityG?: number;
    setGravityG?: (v: number) => void;
    starMass?: number;
    setStarMass?: (v: number) => void;
}
```

**内部state:**
- `showCharts`: グラフパネルの表示状態
- `showMissions`: ミッションパネルの表示状態
- `showHelp`: 操作方法パネルの表示状態
- `showSettings`: 設定パネルの表示状態

**排他制御:**
- 1つのパネルが開くと、他のパネルは自動的に閉じる

#### 5.2.6 MiniChart.tsx

**責務:**
- 速度または距離のリアルタイムグラフを描画
- Canvas APIを使用した軽量レンダリング
- 自動スケーリングとグリッド線の表示

**Props:**
```typescript
interface MiniChartProps {
    data: DataPoint[];
    color: string;
    label: string;
    unit: string;
    width?: number;
    height?: number;
}
```

**描画処理:**
- グリッド線（4分割）
- データポイントの折れ線グラフ
- 現在値の点表示
- 最小値・最大値のテキスト表示

#### 5.2.7 MissionProgress.tsx

**責務:**
- 5つのミッションの進捗を表示
- 達成状態の判定とビジュアル化
- 全体進捗率の計算

**Props:**
```typescript
interface MissionProgressProps {
    distance: number;
    velocity: number;
    slingshots: number;
    fuel: number;
}
```

**ミッション定義:**
- 各ミッションのID、タイトル、説明、目標値、達成条件

#### 5.2.8 ControlsHelp.tsx

**責務:**
- キーボード操作方法の表示
- 静的な情報表示（props不要）

**表示内容:**
- 矢印キーの説明
- Rキーの説明
- 注意事項

#### 5.2.9 SettingsPanel.tsx

**責務:**
- シミュレーションパラメータのスライダーUI
- リアルタイムで値を表示

**Props:**
```typescript
interface SettingsPanelProps {
    probeSpeedMult: number;
    setProbeSpeedMult: (v: number) => void;
    gravityG: number;
    setGravityG: (v: number) => void;
    starMass: number;
    setStarMass: (v: number) => void;
}
```

#### 5.2.10 CameraControls.tsx

**責務:**
- カメラ視点切り替えボタンの表示
- 画面左下に独立配置

**Props:**
```typescript
interface CameraControlsProps {
    cameraView: CameraView;
    setCameraView: (v: CameraView) => void;
}
```

**表示内容:**
- 自由視点ボタン
- 真上視点ボタン
- 探査機追従ボタン

#### 5.2.11 Controls.tsx（廃止）

**旧仕様:**
- シミュレーションパラメータの調整UI
- カメラ視点切り替えボタン
- 操作方法のガイド表示

**現在の状態:**
- このコンポーネントは使用されていません（display: none）
- 機能はHUD.tsx、SettingsPanel.tsx、CameraControls.tsxに分割されました

---

## 6. 技術詳細

### 6.1 Three.js統合

**初期化パターン:**
```typescript
useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scene, camera, renderer, dispose } = initThreeJS(canvas);

    // アニメーションループ開始
    const animate = () => { /* ... */ };
    requestAnimationFrame(animate);

    return () => {
        cancelAnimationFrame(rafRef.current);
        dispose();
    };
}, [/* dependencies */]);
```

**メモリ管理:**
- `dispose()`関数でジオメトリ・マテリアル・レンダラーを明示的に破棄
- コンポーネントアンマウント時に`useEffect`のクリーンアップで実行

### 6.2 パフォーマンス最適化

#### 6.2.1 HUD更新のスロットリング

**問題:**
- 60FPSループで毎フレームsetStateを呼ぶとReactの再レンダリング負荷が高い

**解決策:**
- 200msスロットリング（最大5Hz更新）
- 閾値ベースの即時更新（大きな変化時のみ）

#### 6.2.2 Setter参照の安定化

**問題:**
- 親コンポーネントの再レンダリングでsetter関数オブジェクトが再生成される
- `GameCanvas`の`useEffect`依存配列に含まれる場合、不要な再実行が発生

**解決策:**
- `useMemo`で空依存配列を指定し、参照を固定

#### 6.2.3 軌跡の間引き

**実装:**
- 最大2000ポイントでリングバッファ化
- Catmull-Rom曲線で滑らかに補間
- 分割数を動的調整（最大3000セグメント）

#### 6.2.4 レンダラー設定

```typescript
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
```
- 高DPIディスプレイでの過剰なピクセル描画を抑制
- PixelRatioを2に制限

### 6.3 型安全性

**TypeScript設定:**
- `strict: true`（厳格モード）
- すべてのコンポーネント・関数に明示的な型注釈
- `THREE.Vector3`や`Body`型による型推論の活用

**既知の型警告:**
- `three/examples/jsm`（OrbitControlsなど）の型宣言が不完全
- ランタイムには影響しないが、エディタ上で警告が表示される可能性

---

## 7. ディレクトリ構造とファイル説明

```
space-probe-game-next/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # アプリケーションルートレイアウト
│   │   ├── page.tsx            # メインページ（状態管理・履歴データ管理）
│   │   └── globals.css         # グローバルスタイル（HUD、UI配置、アニメーション）
│   ├── components/
│   │   ├── GameCanvas.tsx      # Three.jsキャンバス・アニメーションループ
│   │   ├── HUD.tsx             # インタラクティブUI統合・ドロップダウン制御
│   │   ├── MiniChart.tsx       # リアルタイムグラフ描画（Canvas）
│   │   ├── MissionProgress.tsx # ミッション進捗表示
│   │   ├── ControlsHelp.tsx    # 操作方法表示
│   │   ├── SettingsPanel.tsx   # シミュレーション設定UI
│   │   ├── CameraControls.tsx  # カメラ視点切り替えボタン
│   │   └── Controls.tsx        # パラメータ調整UI（廃止・非表示）
│   ├── lib/
│   │   ├── threeSetup.ts       # Three.js初期化・シーン構築
│   │   ├── physics.ts          # N体物理エンジン
│   │   └── __tests__/
│   │       ├── physics.test.ts         # 物理エンジン基本テスト
│   │       └── physics.swingby.test.ts # スイングバイ検出テスト
│   └── types/
│       └── index.d.ts          # グローバル型定義
├── public/                     # 静的アセット（未使用）
├── node_modules/               # 依存パッケージ
├── package.json                # プロジェクト設定・依存関係
├── package-lock.json           # 依存バージョンロック
├── next.config.js              # Next.js設定
├── tsconfig.json               # TypeScript設定
├── vitest.config.ts            # Vitestテスト設定
├── README.md                   # プロジェクト説明（簡易）
├── REFACTOR_SUMMARY.md         # リファクタリング記録・変更履歴
├── Coding.md                   # 実装詳細レポート
└── SPEC.md                     # 本ドキュメント（仕様書兼設計書）
```

### 7.1 主要ファイル詳細

| ファイル | 行数（概算） | 主要な責務 |
|---------|-------------|-----------|
| `src/app/page.tsx` | 87 | 状態管理、コンポーネント統合、履歴データ管理 |
| `src/components/GameCanvas.tsx` | 170 | Three.js統合、アニメーションループ、入力処理 |
| `src/components/HUD.tsx` | 193 | インタラクティブUI統合、ドロップダウン制御 |
| `src/components/MiniChart.tsx` | 105 | リアルタイムグラフ描画（Canvas） |
| `src/components/MissionProgress.tsx` | 106 | ミッション進捗表示 |
| `src/components/ControlsHelp.tsx` | 20 | 操作方法表示 |
| `src/components/SettingsPanel.tsx` | 62 | シミュレーション設定UI |
| `src/components/CameraControls.tsx` | 37 | カメラ視点切り替えボタン |
| `src/components/Controls.tsx` | 37 | パラメータ調整UI（廃止・非表示） |
| `src/lib/threeSetup.ts` | 350 | Three.jsシーン構築、天体配置、物理統合 |
| `src/lib/physics.ts` | 151 | N体物理エンジン、スイングバイ検出 |

---

## 8. テスト戦略

### 8.1 ユニットテスト

**テストフレームワーク:** Vitest 3.2.4

**テスト対象:**
- `physics.ts`の純粋関数
- N体シミュレーションの数値安定性
- スイングバイ検出ロジック

**テストファイル:**

#### 8.1.1 `src/lib/__tests__/physics.test.ts`

**目的:** 基本的な物理演算の動作確認

**テストケース:**
- 2体（中央星と探査機）での軌道運動の保存性確認
- `stepBodies`が正常に実行され、body配列が返されること

#### 8.1.2 `src/lib/__tests__/physics.swingby.test.ts`

**目的:** スイングバイ検出の精度確認

**テストケース:**
- 3体（中央星、惑星、探査機）での近接通過シナリオ
- 5000ステップ（100秒相当）のシミュレーション
- 少なくとも1回以上のスイングバイイベントが検出されること

**実行方法:**
```bash
npm test
```

**期待結果:**
```
✓ src/lib/__tests__/physics.test.ts (1)
✓ src/lib/__tests__/physics.swingby.test.ts (1)

Test Files  2 passed (2)
     Tests  2 passed (2)
```

### 8.2 統合テスト（未実装）

**提案:**
- Playwrightなどを用いたE2Eテスト
- ブラウザ環境でのThree.jsレンダリング確認
- キーボード操作の自動化
- スクリーンショット比較

### 8.3 パフォーマンステスト（未実装）

**提案:**
- Chrome DevToolsのPerformanceプロファイラ
- FPS計測（60FPS維持の確認）
- メモリリーク検出（長時間実行時）

---

## 9. 既知の制約事項と今後の改善案

### 9.1 既知の制約事項

#### 9.1.1 型宣言の不完全性

**問題:**
- `three/examples/jsm/controls/OrbitControls`の型宣言が不完全
- エディタ上で型警告が表示される（ランタイムには影響なし）

**対策:**
- `@types/three`の最新版への更新
- 必要に応じて`src/types/index.d.ts`に型宣言を追加

#### 9.1.2 物理モデルの簡略化

**現状:**
- 中央星と惑星のみの多体重力（他の惑星同士の相互作用も計算されるが小さい）
- ソフトニング項による数値安定化（物理的に厳密ではない）
- 燃料消費が未実装（HUDは常に100%表示）

**将来の改善:**
- より高精度な積分器（RK4など）
- 燃料消費ロジックの実装
- 相対論的効果の考慮（高速度時）

#### 9.1.3 グローバルAPI依存

**問題:**
- `window.__applyDeltaVToProbe`によるデルタv適用
- グローバル汚染、テストの困難さ

**改善案:**
- `initThreeJS`の戻り値に`applyDeltaVToProbe`関数を含める
- `GameCanvas`側で明示的に保持・呼び出し

#### 9.1.4 SSR対応の不完全性

**現状:**
- `"use client"`により完全にクライアントサイドレンダリング
- Next.jsのSSRメリットを活かせていない

**影響:**
- 初回ロード時のJavaScriptバンドルが大きい
- SEOへの影響は限定的（ゲームアプリのため）

### 9.2 今後の改善案（優先度順）

#### 優先度: 高

1. **物理エンジンの詳細実装**
   - 燃料消費ロジックの追加
   - スイングバイによる燃料節約効果の可視化
   - 積分器の精度向上（RK4への移行検討）

2. **型警告の解消**
   - `@types/three`の更新
   - カスタム型宣言の追加

3. **ユニットテストの拡充**
   - エネルギー保存性のテスト
   - 角運動量保存性のテスト
   - エッジケース（衝突、遠距離）のテスト

#### 優先度: 中

4. **パフォーマンス最適化**
   - ArrowHelperの再利用（方向指示器の追加を検討する場合）
   - 惑星ジオメトリのLOD（Level of Detail）
   - PixelRatioとCSSサイズの整合性確認

5. **HUD・UI改善**
   - スイングバイ統計（累積速度増加、最高速度記録など）
   - ミッションモード（目標距離到達、燃料制限など）
   - タッチデバイス対応（仮想ジョイスティック）

6. **スイングバイ閾値のUI化**
   - `encounterMultiplier`, `deltaVThreshold`, `minGap`をControlsに追加
   - 実行時調整可能にする

#### 優先度: 低

7. **アクセシビリティ改善**
   - ARIA属性の追加
   - キーボードフォーカス管理
   - スクリーンリーダー対応

8. **デプロイ自動化**
   - Vercel連携
   - GitHub ActionsによるCI/CD
   - 自動テスト実行・ビルド検証

9. **追加機能**
   - 多体重力の可視化（重力ポテンシャル等高線など）
   - タイムワープ（シミュレーション速度変更）
   - リプレイ機能（軌道の記録・再生）

---

## 10. 開発・ビルド・デプロイ

### 10.1 開発環境のセットアップ

**前提条件:**
- Node.js 18以上
- npm 9以上

**手順:**
```bash
# リポジトリのクローン（またはディレクトリへ移動）
cd space-probe-game-next

# 依存パッケージのインストール
npm install

# 開発サーバーの起動（ホットリロード有効）
npm run dev
```

**ブラウザアクセス:**
```
http://localhost:3000
```

### 10.2 テストの実行

```bash
# ユニットテストの実行（Vitest）
npm test

# ウォッチモード（ファイル変更時に自動再実行）
npm test -- --watch

# カバレッジレポート生成
npm test -- --coverage
```

### 10.3 プロダクションビルド

```bash
# 最適化ビルド
npm run build

# ビルド成果物の確認
# .next/static/
# .next/server/

# ローカルでプロダクションサーバー起動
npm start
```

### 10.4 リンターの実行

```bash
# ESLintによるコードチェック
npm run lint

# 自動修正可能な問題を修正
npm run lint -- --fix
```

### 10.5 デプロイ（Vercel推奨）

**Vercel連携手順:**
1. GitHubリポジトリにプッシュ
2. Vercelダッシュボードで「New Project」
3. リポジトリを選択し、自動検出されるNext.js設定を確認
4. 「Deploy」をクリック

**自動化:**
- mainブランチへのプッシュで自動デプロイ
- プルリクエストごとにプレビューデプロイ

**環境変数:**
- 現在、環境変数は不要（すべてクライアントサイド）
- 将来的にAPIキーなどが必要な場合、Vercelの環境変数設定を使用

### 10.6 トラブルシューティング

#### 問題: TypeScript型エラーが解消されない

**解決策:**
```bash
# TypeScript Language Serverの再起動（VS Code）
Ctrl+Shift+P → "TypeScript: Restart TS server"

# node_modulesの再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 問題: Three.jsの型警告

**原因:**
- `three/examples/jsm`の型宣言が不完全

**対処:**
- ランタイムには影響しないため、警告を無視
- 必要に応じて`src/types/index.d.ts`に型宣言を追加

#### 問題: ブラウザで「Module not found」エラー

**原因:**
- 開発サーバーの再起動が必要

**対処:**
```bash
# 開発サーバーを停止（Ctrl+C）
npm run dev
```

#### 問題: 物理シミュレーションが不安定

**確認項目:**
- ブラウザのパフォーマンスモニタでFPSを確認
- `fixedTimeStep`が適切か（推奨: 1/60）
- スパイラル・オブ・デス回避のクランプ処理（delta > 0.25）が動作しているか

---

## 付録

### A. 参考文献・資料

- **Three.js公式ドキュメント:** https://threejs.org/docs/
- **Next.js公式ドキュメント:** https://nextjs.org/docs
- **Leapfrog積分法:** Wikipedia - Leapfrog integration
- **N体問題:** Wikipedia - N-body problem
- **スイングバイ（重力アシスト）:** NASA - Gravity Assist

### B. ライセンス

**MIT License**

Copyright (c) 2025 space-probe-game-next Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### C. 変更履歴（本ドキュメント）

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-22 | 1.0 | 初版作成 - 全セクション完成 |
| 2025-10-24 | 1.1 | UIの大幅改善 - インタラクティブHUD、グラフ、ミッション進捗、カメラコントロール分離 |
| 2025-10-25 | 1.2 | 視覚化の改善 - 背景星のサイズ変更(2→10)、グリッド分割数変更(140→1000)、重力井戸グリッド可視化機能追加 |
| 2025-10-25 | 1.3 | 探査機の3Dデザイン - ボイジャー型探査機の実装、8パーツ構成、メタリック質感、スケール3倍 |

---

**ドキュメント終了**

本仕様書兼設計書は、プロジェクトの理解と保守を目的として作成されました。
質問やフィードバックがある場合は、プロジェクトのIssueトラッカーまたはコントリビューターに連絡してください。
