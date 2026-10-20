# G-DataHub 機械情報一括登録：現行仕様との照合（2026-10-20）

## 結論と位置付け

- `bulk_registration.html` は機械情報のCSV整理、および**同一ブラウザに保存された** `index.html` のNCサービス情報登録画面への下書き連携用フロントエンドである
- **実G-DataHub本番DBへの登録機能ではない**。認証付きAPI、DB更新、権限判定および全拠点重複照合は未実装
- **`db/schema.sql` / `docs/api_spec.md` は本リポジトリに含まれる試作・将来想定の定義**。稼働中のAWS SQL Serverの確定物理仕様や稼働APIと断定しない
- 現行の8項目CSVは**暫定の社内検討用レイアウト**。正本インポートの公式定義とは扱わない

## 確認した資料

1. `CON_G-DataHub_画面UI規定 (1).xlsx`：「概要」「登録・更新・削除画面規定」— 登録画面はIM-BIS利用、標準機能を最大限活用し、独自カスタマイズは例外的に検討。必須・桁数・入力形式・エラー表示・登録確認などを用途別に規定
2. `G-DataHub サービスデータ基盤構築プロジェクト／06 AWS SQL Server 機械情報との連携設計 (2026-08-09)` — AWS SQL Serverを機械情報の正本とする設計案。正式Database／Schema／Table／物理列／更新・削除方式は未確認（PoC前の要確認事項）
3. 本リポジトリ `db/schema.sql`、`docs/api_spec.md`、`js/state.js`、`js/master.js`

## 8項目CSVと試作NC基本情報テーブルの対応

| CSV列 | 試作テーブル `NC_BASIC_INFO` | 状態 | 理由・取扱い |
|---|---|---|---|
| `company_name` | 対応列なし | 未確定 | CSV専用。既存NC下書きには保存しない。顧客ID等との同一視は禁止 |
| `service_base_name` | 対応列なし | 未確定 | `service_base_code` は契約子テーブルの別概念。NC基本情報への自動割当ては禁止 |
| `nc_serial_no` | `nc_serial_no` | 試作上対応 | NVARCHAR(60)、PK／API構想の必須項目。文字列として保持 |
| `machine_serial_no` | `machine_serial_no` | 試作上対応 | NVARCHAR(100)、SQL草案ではNULL可。CSVの必須扱いは暫定 |
| `machine_model` | `machine_model` | 試作上対応 | NVARCHAR(100)、SQL草案ではNULL可。CSVの必須扱いは暫定 |
| `mtb_code` | `mtb_code` | 試作上対応 | NVARCHAR(50)、`MST_MTB` 外部キー候補。下書き追加時は現行マスタ照合 |
| `end_user` | `end_user` | 試作上対応 | NVARCHAR(100)。顧客内部IDとは別。会社名と顧客の同一視は禁止 |
| `export_country_code` | `export_country_code` | 試作上対応 | NVARCHAR(2)、輸出先国。**設置先国`COUNTRY_CODE`とは別概念**。下書き追加時はISO2マスタ照合 |

**他に必要になる可能性がある項目:** `MACHINE_ID`, `CUSTOMER_ID`, `SITE_CODE`, `INSTALLATION_DATE`, `MACHINE_STATUS_CODE` などはPhase 6の連携設計上の論理候補。どの列を機械登録時に求めるかは未確定。登録用CSVへ推測で追加しない。

## 実装済みの安全な連携

1. `bulk_registration.html` で行追加・複製・削除／ExcelのTSV貼り付け
2. CSV出力時は暫定8項目・共通情報・NCと機械の識別3項目について入力チェック
3. 「既存画面の下書きに追加」時はNCシリアルを必須とし、同一入力内とブラウザ内既存NC登録・下書きを重複チェック
4. 下書き追加時は設定済み`mtb_code`と`export_country_code`について、読み込み可能な現在のマスタとの一致と有効性を確認
5. 追加直前に内容を確認し、`js/state.js` の `addDraftBatch` で**既存ブラウザ内`cnc_drafts`に一回の書き込みで追加**。途中行だけが書き込まれないようにする
6. `index.html` から「下書き一覧」で編集・確認できる。会社名・サービス拠点名はNC基本情報の対応列がないため下書きには保存しない

## 本番連携に進むための未確定事項

| 優先 | 未確定事項 | 受領する情報・承認事項 |
|---|---|---|
| 必須 | AWS SQL Serverの機械情報正式スキーマ | Database／Schema／Table／カラム名／型／NULL／一意制約／必須項目／顧客・機械ID体系 |
| 必須 | 登録インターフェイス | 公式CSV取込方式または認証付きAPIの有無とI/F仕様（現行GitHub API文書は構想） |
| 必須 | 機械識別と重複・更新 | NC複数搭載、工作機械S/N重複、既存更新可否、承認・競合・エラー返却 |
| 必須 | マスタ・コード管理 | MTB／国／サービス拠点／顧客／設置先の正式コードと所属・権限 |
| 必須 | ユーザー権限・監査 | 拠点別登録範囲、認証、取込履歴、差戻し、個人情報非取込ポリシー |
| 必須 | UI実装基盤 | IM-BIS標準部品に沿った再実装範囲。現行静的HTMLをそのまま本番IM-BIS画面とは扱わない |

正式仕様を受領した後に、①列マッピングの承認、②API/CSV取込アダプタ開発、③検証環境での登録・エラー・冪等性テスト、④権限/監査確認の順で本番化する。APIやDB接続先を推測で追加しない。
