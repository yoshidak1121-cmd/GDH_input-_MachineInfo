# NCサービス情報登録システム

CNCサービス情報（NC情報・機械情報・輸出/設置情報・契約情報）を登録・管理するWebアプリケーションです。

---

## 機能概要

| 画面ID | 画面名 | 概要 |
|---|---|---|
| S01 | 一覧・検索画面 | 登録済みNC情報の検索・絞込み・新規登録開始 |
| S02 | 新規登録開始画面 | NCシリアル番号の入力・重複チェック |
| S03 | 基本情報登録（ウィザード Step 1） | NC情報・機械情報・NC販売情報の登録 |
| S04 | 輸出・設置情報登録（ウィザード Step 2） | 輸出先・現地販売店・エンドユーザ・設置日の登録 |
| S05 | 契約情報登録（ウィザード Step 3） | 契約情報の複数行登録（追加・削除・コピー） |
| S06 | 確認画面（ウィザード Step 4） | 登録内容確認・バリデーション表示 |
| S07 | 登録完了画面 | 登録完了・次操作の選択 |
| S08 | マスタ簡易登録ダイアログ | NCシステム型名・MTBマスタへの簡易追加 |
| S09 | 下書き・未完了一覧 | 入力途中データの再開・削除 |
| M01-M07 | マスタ管理画面 | 各種マスタの表示・有効化/無効化管理 |

---

## 画面遷移

```
S01 一覧・検索
  ↓ 新規登録
S02 新規登録開始（NCシリアル番号入力）
  ↓ 次へ
S03 基本情報登録（ウィザード Step1）
  ↓ 下書き保存 → S07（下書き完了）
  ↓ 次へ
S04 輸出・設置情報登録（Step2）
  ↓ 次へ or スキップ
S05 契約情報登録（Step3）
  ↓ 確認へ or 契約なしで確認へ
S06 確認（Step4）
  ↓ 登録
S07 登録完了
```

---

## 登録ステータス

| ステータス | 条件 |
|---|---|
| 下書き | NCシリアル番号のみ、主要情報不足 |
| 基本情報登録済み | Step1まで完了 |
| 設置情報登録済み | Step2まで完了 |
| 契約情報登録済み | 1件以上の契約情報あり |
| 契約未登録 | 基本情報はあるが契約0件 |
| 要確認 | 警告項目あり |
| 登録完了 | 必須・主要項目充足 |

---

## マスタ一覧

| ID | マスタ名 | ファイル |
|---|---|---|
| M01 | NCシステム型名マスタ | `data/nc_system_master.json` |
| M02 | MTBマスタ | `data/mtb_master.json` |
| M03 | 販売会社マスタ | `data/sales_company_master.json` |
| M04 | サービス拠点マスタ | `data/service_base_master.json` |
| M05 | 国コードISO2マスタ | `data/country_master.json` |
| M06 | 契約者区分マスタ | `data/contract_holder_type_master.json` |
| M07 | 契約タイプマスタ | `data/contract_type_master.json` |

### マスタ共通ルール
- `is_active: false` の値は新規入力時のドロップダウンに表示されない
- 既存データで使用中の場合は「表示名（無効）」として表示
- コードは登録後、原則変更不可
- 物理削除はしない（`is_active` で制御）

---

## DBスキーマ

→ `db/schema.sql` （SQL Server DDL）

| テーブル | 概要 |
|---|---|
| NC_BASIC_INFO | NC基本情報（親テーブル。PK: nc_serial_no） |
| NC_CONTRACT_INFO | 契約情報（子テーブル。FK: nc_serial_no） |
| MST_NC_SYSTEM_MODEL | M01マスタ |
| MST_MTB | M02マスタ |
| MST_SALES_COMPANY | M03マスタ |
| MST_SERVICE_BASE | M04マスタ |
| MST_COUNTRY_ISO2 | M05マスタ |
| MST_CONTRACT_HOLDER_TYPE | M06マスタ |
| MST_CONTRACT_TYPE | M07マスタ |

初期データ → `db/seed.sql`

---

## API仕様

→ `docs/api_spec.md` 参照

---

## ファイル構成

```
index.html              # メインSPA HTML（全画面テンプレート含む）
css/
  style.css             # スタイルシート（ウィザード・コントラクトテーブル含む）
js/
  app.js                # メインアプリケーション（ルーティング・画面管理）
  state.js              # 状態管理（localStorage永続化）
  master.js             # マスタデータ読込・選択肢生成
  contracts.js          # 契約テーブル管理（追加・削除・コピー・終了日計算）
  validation.js         # 入力バリデーション（ステップ別・全体）
  form.js               # フォームユーティリティ（後方互換）
  table.js              # テーブルレンダリング（後方互換）
data/
  nc_system_master.json
  mtb_master.json
  sales_company_master.json
  service_base_master.json
  country_master.json
  contract_holder_type_master.json  # 新規追加
  contract_type_master.json         # 新規追加
db/
  schema.sql            # SQL Server DDL（全テーブル定義）
  seed.sql              # 初期マスタデータ + サンプルデータ
docs/
  api_spec.md           # REST API仕様書
  specification.md      # システム仕様書
```

---

## 起動方法

バックエンドAPIなし（フロントエンドのみ）で動作します。データはブラウザの `localStorage` に保存されます。

1. 任意のWebサーバでホストして `index.html` を開く（例: VS Code の Live Server、Python の http.server など）

```bash
# Python 3
python -m http.server 8080
# → http://localhost:8080 でアクセス
```

2. `data/*.json` は同一オリジンから fetch されます。`file://` プロトコルでは CORS 制限により読込できない場合があります。その場合はフォールバックデータが使われます。

---

## 技術仕様（フロントエンドのみ実装）

- **フロントエンド**: バニラ HTML / CSS / JavaScript（ES Modules）
- **データ永続化**: `localStorage`（本番環境では SQL Server + REST API に置換想定）
- **推奨バックエンド**: FastAPI または ASP.NET Core
- **推奨DB**: SQL Server
- **認証**: 将来的に Microsoft Entra ID 連携できる構造

---

## バリデーション仕様

### エラー（保存不可）
- NCシリアル番号：必須・重複不可
- 契約行がある場合：契約タイプ・契約期間（1以上の整数）・契約開始日は必須
- メモ欄：300文字以内

### 警告（保存可能）
- 機械輸出日 < NC販売日
- 設置日 < 機械輸出日  
- 契約開始日 < 設置日
- 同一NC内で契約番号が重複

---

## 入力チェックフロー

1. 各ウィザードステップの「次へ」押下時にステップ内バリデーション実行
2. 確認画面で全項目の最終バリデーション実行（エラーあり時は「登録する」ボタン無効化）
3. 警告は表示されるが保存は可能

---

## 契約情報仕様

- NC基本情報（親）に対して複数の契約情報（子）を登録可能
- 契約終了日は自動計算: `契約開始日 + 契約期間（月数） - 1日`（DBには保存しない）
- 契約追加時のデフォルト値:
  - ご契約者: MTB
  - 三菱契約受託会社: NC販売会社
  - 契約タイプ: FULL
  - 契約期間: 24ヶ月
  - 契約開始日: 設置日
- 契約コピー時: 契約番号・開始日・メモはクリア
