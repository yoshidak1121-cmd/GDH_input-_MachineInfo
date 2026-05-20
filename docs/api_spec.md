# NCサービス情報登録システム – API仕様書

ベースURL: `https://{host}/api/v1`

認証: Bearer Token（将来的に Microsoft Entra ID 連携）

---

## 共通仕様

### レスポンス形式

```json
{
  "success": true,
  "data": { ... },
  "errors": [],
  "warnings": []
}
```

エラー時:

```json
{
  "success": false,
  "data": null,
  "errors": ["NCシリアル番号は必須です。"],
  "warnings": []
}
```

### 日付形式

- リクエスト/レスポンスともに `YYYY-MM-DD`

### ページング

```
GET /api/v1/nc-records?page=1&per_page=30&sort=updated_at&order=desc
```

---

## NC基本情報 (NC_BASIC_INFO)

### 一覧取得

```
GET /api/v1/nc-records
```

クエリパラメータ:

| パラメータ | 型 | 説明 |
|---|---|---|
| nc_serial_no | string | 部分一致 |
| nc_system_model | string | 完全一致 |
| end_user | string | 部分一致 |
| registration_status | string | 完全一致 |
| page | int | ページ番号（デフォルト1） |
| per_page | int | 件数（デフォルト30、最大100） |
| sort | string | ソートフィールド（デフォルト updated_at） |
| order | string | asc / desc（デフォルト desc） |

レスポンス:

```json
{
  "success": true,
  "data": {
    "total": 100,
    "page": 1,
    "per_page": 30,
    "items": [
      {
        "nc_serial_no": "SN-2024-001",
        "nc_system_model": "FCA830H-4SV",
        "mtb_display_name": "DMG MORI",
        "machine_model": "NVX5100",
        "end_user": "サンプル工業株式会社",
        "nc_sales_company_display_name": "三菱電機（日本）",
        "installation_date": "2024-05-01",
        "contract_count": 2,
        "registration_status": "契約情報登録済み",
        "updated_at": "2024-05-15T12:00:00Z"
      }
    ]
  }
}
```

### 単件取得

```
GET /api/v1/nc-records/{nc_serial_no}
```

レスポンス: NC基本情報 + 契約情報配列

```json
{
  "success": true,
  "data": {
    "nc_serial_no": "SN-2024-001",
    "nc_system_model": "FCA830H-4SV",
    "nc_bom_no": null,
    "nc_spec_no": null,
    "machine_model": "NVX5100",
    "machine_serial_no": "M-2024-001",
    "mtb_code": "DMGMORI",
    "machine_memo": null,
    "nc_sales_date": "2024-03-01",
    "nc_sales_company_code": "MEJ",
    "nc_sales_memo": null,
    "machine_agent": null,
    "machine_agent_memo": null,
    "export_date": "2024-04-15",
    "export_country_code": "JP",
    "shipment_memo": null,
    "local_dealer": null,
    "local_dealer_memo": null,
    "end_user": "サンプル工業株式会社",
    "end_user_memo": null,
    "installation_date": "2024-05-01",
    "registration_status": "契約情報登録済み",
    "created_at": "2024-03-01T10:00:00Z",
    "updated_at": "2024-05-15T12:00:00Z",
    "contracts": [
      {
        "contract_detail_id": 1,
        "nc_serial_no": "SN-2024-001",
        "contract_holder_type_code": "MTB",
        "contract_owner_code": "MEJ",
        "service_base_code": "MEAK",
        "contract_no": "C-2024-001",
        "contract_type_code": "FULL",
        "contract_period_month": 24,
        "contract_start_date": "2024-05-01",
        "contract_memo": null
      }
    ]
  }
}
```

### 新規登録

```
POST /api/v1/nc-records
```

リクエストボディ: NC基本情報（contracts配列含む）

バリデーション:
- `nc_serial_no` 必須・一意
- `contract_period_month` >= 1（契約行がある場合）
- `contract_type_code` 必須（契約行がある場合）
- `contract_start_date` 必須（契約行がある場合）

### 更新

```
PUT /api/v1/nc-records/{nc_serial_no}
```

### 下書き保存

```
PUT /api/v1/nc-records/{nc_serial_no}/draft
```

リクエストボディ: 途中まで入力した NC基本情報（contracts配列任意）

下書き保存時は最小バリデーション（nc_serial_no のみ必須）

### 削除（論理削除）

```
DELETE /api/v1/nc-records/{nc_serial_no}
```

---

## NC契約情報 (NC_CONTRACT_INFO)

### 契約一覧取得（NC単位）

```
GET /api/v1/nc-records/{nc_serial_no}/contracts
```

### 契約追加

```
POST /api/v1/nc-records/{nc_serial_no}/contracts
```

### 契約更新

```
PUT /api/v1/nc-records/{nc_serial_no}/contracts/{contract_detail_id}
```

### 契約削除（論理削除）

```
DELETE /api/v1/nc-records/{nc_serial_no}/contracts/{contract_detail_id}
```

---

## NCシリアル番号重複チェック

```
GET /api/v1/nc-records/check?nc_serial_no={value}
```

レスポンス:

```json
{ "success": true, "data": { "exists": false } }
```

---

## マスタAPI（共通パターン）

全マスタは以下の共通パターン:

```
GET    /api/v1/masters/{type}         全件取得（is_active=trueのみ、またはall）
POST   /api/v1/masters/{type}         新規登録
PUT    /api/v1/masters/{type}/{code}  更新（コード変更不可）
PATCH  /api/v1/masters/{type}/{code}/deactivate  無効化
PATCH  /api/v1/masters/{type}/{code}/activate    有効化
```

`{type}` 一覧:

| type | テーブル |
|---|---|
| nc-system-models | MST_NC_SYSTEM_MODEL |
| mtb | MST_MTB |
| sales-companies | MST_SALES_COMPANY |
| service-bases | MST_SERVICE_BASE |
| countries | MST_COUNTRY_ISO2 |
| contract-holder-types | MST_CONTRACT_HOLDER_TYPE |
| contract-types | MST_CONTRACT_TYPE |

クエリパラメータ:

| パラメータ | 説明 |
|---|---|
| active_only | true（デフォルト）/ false |

### 三菱契約受託会社候補取得

```
GET /api/v1/masters/contract-owners
```

販売会社マスタ + サービス拠点マスタの `can_be_contract_owner=true AND is_active=true` を統合して返却。

レスポンス:

```json
{
  "success": true,
  "data": [
    { "code": "MEJ", "display_name": "三菱電機（日本）", "company_type": "SALES" },
    { "code": "MEAK", "display_name": "MEAK (Korea)", "company_type": "SERVICE" }
  ]
}
```

---

## 下書き一覧

```
GET /api/v1/drafts
```

`registration_status` が `下書き`, `基本情報登録済み`, `設置情報登録済み`, `契約未登録` の未完了レコードを返却。

---

## 権限

| エンドポイント | 管理者 | 製造部門 | 販売部門 | サービス部門 | 一般 |
|---|---|---|---|---|---|
| GET NC一覧/単件 | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST/PUT NC基本情報 | ✓ | ✓ | ✓ | ✓ | - |
| POST/PUT 契約情報 | ✓ | - | ✓ | ✓ | - |
| DELETE | ✓ | - | - | - | - |
| マスタ GET | ✓ | ✓ | ✓ | ✓ | ✓ |
| マスタ POST/PUT | ✓ | NC・MTBのみ | 販売会社のみ | 拠点のみ | - |
| マスタ 無効化 | ✓ | - | - | - | - |
