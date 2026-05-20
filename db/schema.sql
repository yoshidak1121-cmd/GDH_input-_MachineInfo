-- ============================================================
-- NCサービス情報登録システム - SQL Server DDL
-- DB: SQL Server 2019 以降
-- ============================================================

-- ============================================================
-- マスタテーブル
-- ============================================================

-- M01: NCシステム型名マスタ
IF OBJECT_ID('MST_NC_SYSTEM_MODEL', 'U') IS NOT NULL DROP TABLE MST_NC_SYSTEM_MODEL;
CREATE TABLE MST_NC_SYSTEM_MODEL (
  code              NVARCHAR(50)  NOT NULL,
  display_name      NVARCHAR(100) NOT NULL,
  series_name       NVARCHAR(100) NULL,
  model_name        NVARCHAR(100) NULL,
  nc_control_unit   NVARCHAR(100) NULL,
  display_unit      NVARCHAR(100) NULL,
  display_size_inch DECIMAL(5,1)  NULL,
  touch_panel       BIT           NOT NULL DEFAULT 0,
  is_active         BIT           NOT NULL DEFAULT 1,
  display_order     INT           NOT NULL DEFAULT 0,
  note              NVARCHAR(300) NULL,
  created_at        DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at        DATETIME      NOT NULL DEFAULT GETDATE(),
  CONSTRAINT PK_MST_NC_SYSTEM_MODEL PRIMARY KEY (code)
);

-- M02: MTBマスタ（機械メーカ）
IF OBJECT_ID('MST_MTB', 'U') IS NOT NULL DROP TABLE MST_MTB;
CREATE TABLE MST_MTB (
  code          NVARCHAR(50)  NOT NULL,
  display_name  NVARCHAR(100) NOT NULL,
  is_active     BIT           NOT NULL DEFAULT 1,
  display_order INT           NOT NULL DEFAULT 0,
  note          NVARCHAR(300) NULL,
  created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at    DATETIME      NOT NULL DEFAULT GETDATE(),
  CONSTRAINT PK_MST_MTB PRIMARY KEY (code)
);

-- M03: 販売会社マスタ
IF OBJECT_ID('MST_SALES_COMPANY', 'U') IS NOT NULL DROP TABLE MST_SALES_COMPANY;
CREATE TABLE MST_SALES_COMPANY (
  code                  NVARCHAR(20)  NOT NULL,
  display_name          NVARCHAR(100) NOT NULL,
  can_be_contract_owner BIT           NOT NULL DEFAULT 1,
  company_type          NVARCHAR(20)  NOT NULL DEFAULT 'SALES',  -- SALES / SERVICE
  is_active             BIT           NOT NULL DEFAULT 1,
  display_order         INT           NOT NULL DEFAULT 0,
  note                  NVARCHAR(300) NULL,
  created_at            DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at            DATETIME      NOT NULL DEFAULT GETDATE(),
  CONSTRAINT PK_MST_SALES_COMPANY PRIMARY KEY (code)
);

-- M04: サービス拠点マスタ
IF OBJECT_ID('MST_SERVICE_BASE', 'U') IS NOT NULL DROP TABLE MST_SERVICE_BASE;
CREATE TABLE MST_SERVICE_BASE (
  code                  NVARCHAR(20)  NOT NULL,
  display_name          NVARCHAR(100) NOT NULL,
  can_be_contract_owner BIT           NOT NULL DEFAULT 1,
  company_type          NVARCHAR(20)  NOT NULL DEFAULT 'SERVICE',
  is_active             BIT           NOT NULL DEFAULT 1,
  display_order         INT           NOT NULL DEFAULT 0,
  note                  NVARCHAR(300) NULL,
  created_at            DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at            DATETIME      NOT NULL DEFAULT GETDATE(),
  CONSTRAINT PK_MST_SERVICE_BASE PRIMARY KEY (code)
);

-- M05: 国コードISO2マスタ
IF OBJECT_ID('MST_COUNTRY_ISO2', 'U') IS NOT NULL DROP TABLE MST_COUNTRY_ISO2;
CREATE TABLE MST_COUNTRY_ISO2 (
  code          NVARCHAR(2)   NOT NULL,
  display_name  NVARCHAR(100) NOT NULL,
  is_active     BIT           NOT NULL DEFAULT 1,
  display_order INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at    DATETIME      NOT NULL DEFAULT GETDATE(),
  CONSTRAINT PK_MST_COUNTRY_ISO2 PRIMARY KEY (code)
);

-- M06: 契約者区分マスタ
IF OBJECT_ID('MST_CONTRACT_HOLDER_TYPE', 'U') IS NOT NULL DROP TABLE MST_CONTRACT_HOLDER_TYPE;
CREATE TABLE MST_CONTRACT_HOLDER_TYPE (
  code          NVARCHAR(30)  NOT NULL,
  display_name  NVARCHAR(100) NOT NULL,
  description   NVARCHAR(300) NULL,
  is_active     BIT           NOT NULL DEFAULT 1,
  display_order INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at    DATETIME      NOT NULL DEFAULT GETDATE(),
  CONSTRAINT PK_MST_CONTRACT_HOLDER_TYPE PRIMARY KEY (code)
);

-- M07: 契約タイプマスタ
IF OBJECT_ID('MST_CONTRACT_TYPE', 'U') IS NOT NULL DROP TABLE MST_CONTRACT_TYPE;
CREATE TABLE MST_CONTRACT_TYPE (
  code                   NVARCHAR(30)  NOT NULL,
  display_name           NVARCHAR(100) NOT NULL,
  description            NVARCHAR(300) NULL,
  standard_period_month  INT           NULL,
  is_active              BIT           NOT NULL DEFAULT 1,
  display_order          INT           NOT NULL DEFAULT 0,
  created_at             DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at             DATETIME      NOT NULL DEFAULT GETDATE(),
  CONSTRAINT PK_MST_CONTRACT_TYPE PRIMARY KEY (code)
);

-- ============================================================
-- トランザクションテーブル
-- ============================================================

-- 親テーブル: NC基本情報
IF OBJECT_ID('NC_CONTRACT_INFO', 'U') IS NOT NULL DROP TABLE NC_CONTRACT_INFO;
IF OBJECT_ID('NC_BASIC_INFO', 'U') IS NOT NULL DROP TABLE NC_BASIC_INFO;

CREATE TABLE NC_BASIC_INFO (
  nc_serial_no            NVARCHAR(60)  NOT NULL,
  nc_system_model         NVARCHAR(100) NULL,
  nc_bom_no               NVARCHAR(30)  NULL,
  nc_spec_no              NVARCHAR(20)  NULL,
  machine_model           NVARCHAR(100) NULL,
  machine_serial_no       NVARCHAR(100) NULL,
  mtb_code                NVARCHAR(50)  NULL,
  machine_memo            NVARCHAR(300) NULL,
  nc_sales_date           DATE          NULL,
  nc_sales_company_code   NVARCHAR(20)  NULL,
  nc_sales_memo           NVARCHAR(300) NULL,
  machine_agent           NVARCHAR(100) NULL,
  machine_agent_memo      NVARCHAR(300) NULL,
  export_date             DATE          NULL,
  export_country_code     NVARCHAR(2)   NULL,
  shipment_memo           NVARCHAR(300) NULL,
  local_dealer            NVARCHAR(100) NULL,
  local_dealer_memo       NVARCHAR(300) NULL,
  end_user                NVARCHAR(100) NULL,
  end_user_memo           NVARCHAR(300) NULL,
  installation_date       DATE          NULL,
  registration_status     NVARCHAR(30)  NOT NULL DEFAULT N'下書き',
  is_deleted              BIT           NOT NULL DEFAULT 0,
  created_at              DATETIME      NOT NULL DEFAULT GETDATE(),
  created_by              NVARCHAR(100) NULL,
  updated_at              DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_by              NVARCHAR(100) NULL,
  CONSTRAINT PK_NC_BASIC_INFO PRIMARY KEY (nc_serial_no),
  CONSTRAINT FK_NC_BASIC_MTB
    FOREIGN KEY (mtb_code) REFERENCES MST_MTB(code),
  CONSTRAINT FK_NC_BASIC_SALES_COMPANY
    FOREIGN KEY (nc_sales_company_code) REFERENCES MST_SALES_COMPANY(code),
  CONSTRAINT FK_NC_BASIC_COUNTRY
    FOREIGN KEY (export_country_code) REFERENCES MST_COUNTRY_ISO2(code),
  CONSTRAINT CK_NC_BASIC_STATUS CHECK (
    registration_status IN (
      N'下書き', N'基本情報登録済み', N'設置情報登録済み',
      N'契約情報登録済み', N'契約未登録', N'要確認', N'登録完了'
    )
  )
);

-- 子テーブル: NC契約情報
CREATE TABLE NC_CONTRACT_INFO (
  contract_detail_id        BIGINT        NOT NULL IDENTITY(1,1),
  nc_serial_no              NVARCHAR(60)  NOT NULL,
  contract_holder_type_code NVARCHAR(30)  NULL,
  contract_owner_code       NVARCHAR(20)  NULL,
  service_base_code         NVARCHAR(20)  NULL,
  contract_no               NVARCHAR(20)  NULL,
  contract_type_code        NVARCHAR(30)  NULL,
  contract_period_month     INT           NULL,
  contract_start_date       DATE          NULL,
  contract_memo             NVARCHAR(300) NULL,
  is_deleted                BIT           NOT NULL DEFAULT 0,
  created_at                DATETIME      NOT NULL DEFAULT GETDATE(),
  created_by                NVARCHAR(100) NULL,
  updated_at                DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_by                NVARCHAR(100) NULL,
  CONSTRAINT PK_NC_CONTRACT_INFO PRIMARY KEY (contract_detail_id),
  CONSTRAINT FK_NC_CONTRACT_BASIC
    FOREIGN KEY (nc_serial_no) REFERENCES NC_BASIC_INFO(nc_serial_no),
  CONSTRAINT FK_NC_CONTRACT_HOLDER_TYPE
    FOREIGN KEY (contract_holder_type_code) REFERENCES MST_CONTRACT_HOLDER_TYPE(code),
  CONSTRAINT FK_NC_CONTRACT_TYPE
    FOREIGN KEY (contract_type_code) REFERENCES MST_CONTRACT_TYPE(code),
  CONSTRAINT FK_NC_CONTRACT_SERVICE_BASE
    FOREIGN KEY (service_base_code) REFERENCES MST_SERVICE_BASE(code),
  CONSTRAINT CK_NC_CONTRACT_PERIOD CHECK (contract_period_month IS NULL OR contract_period_month >= 1)
);

-- ============================================================
-- インデックス
-- ============================================================

CREATE INDEX IX_NC_BASIC_STATUS     ON NC_BASIC_INFO (registration_status) WHERE is_deleted = 0;
CREATE INDEX IX_NC_BASIC_END_USER   ON NC_BASIC_INFO (end_user)            WHERE is_deleted = 0;
CREATE INDEX IX_NC_BASIC_NC_MODEL   ON NC_BASIC_INFO (nc_system_model)     WHERE is_deleted = 0;
CREATE INDEX IX_NC_CONTRACT_SERIAL  ON NC_CONTRACT_INFO (nc_serial_no)     WHERE is_deleted = 0;
CREATE INDEX IX_NC_CONTRACT_NO      ON NC_CONTRACT_INFO (contract_no)      WHERE is_deleted = 0;
