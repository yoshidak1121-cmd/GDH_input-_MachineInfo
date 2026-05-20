-- ============================================================
-- NCサービス情報登録システム - 初期シードデータ
-- ============================================================

-- M01: NCシステム型名マスタ
INSERT INTO MST_NC_SYSTEM_MODEL (code,display_name,series_name,model_name,nc_control_unit,display_unit,display_size_inch,touch_panel,is_active,display_order) VALUES
('FCA80P-2EA','FCA80P-2EA','E80シリーズ','E80 TypeA','FCU8-MU514-001','FCU8-DU121-13',8.4,0,1,1),
('FCA80P-2EB','FCA80P-2EB','E80シリーズ','E80 TypeB','FCU8-MU513-001','FCU8-DU121-13',8.4,0,1,2),
('FCA80H-4A','FCA80H-4A','M80シリーズ','M80 TypeA','FCU8-MU512-001','FCU8-DU141-32',10.4,1,1,3),
('FCA80H-8A','FCA80H-8A','M80シリーズ','M80 TypeA','FCU8-MU512-001','FCU8-DU181-32',15.0,1,1,4),
('FCA830H-4S','FCA830H-4S','M800Sシリーズ','M830S','FCU8-MU542-001','FCU8-DU141-31',10.4,1,1,5),
('FCA830H-4SV','FCA830H-4SV','M800VSシリーズ','M830VS','FCU8-MU551-001','FCU8-DU142-31',10.4,1,1,6),
('FCA850H-4SV','FCA850H-4SV','M800VSシリーズ','M850VS','FCU8-MA551-001','FCU8-DU142-31',10.4,1,1,7),
('FCA80H-4AV','FCA80H-4AV','M80Vシリーズ','M80V TypeA','FCU8-MU522-001','FCU8-DU142-32',10.4,1,1,8),
('FCA80H-4BV','FCA80H-4BV','M80Vシリーズ','M80V TypeB','FCU8-MU521-001','FCU8-DU142-32',10.4,1,1,9);

-- M02: MTBマスタ
INSERT INTO MST_MTB (code,display_name,is_active,display_order) VALUES
('DMGMORI','DMG MORI',1,1),
('MAZAK','MAZAK',1,2),
('OKUMA','OKUMA',1,3),
('MAKINO','牧野フライス',1,4),
('FANUC','FANUC',1,5),
('HAAS','Haas Automation',1,6),
('DOOSAN','Doosan Machine Tools',1,7),
('HWACHEON','Hwacheon',1,8);

-- M03: 販売会社マスタ
INSERT INTO MST_SALES_COMPANY (code,display_name,can_be_contract_owner,company_type,is_active,display_order) VALUES
('MEJ','三菱電機（日本）',1,'SALES',1,1),
('MEE','Mitsubishi Electric Europe',1,'SALES',1,2),
('MEAM','Mitsubishi Electric Americas',1,'SALES',1,3),
('MEAP','Mitsubishi Electric Asia Pacific',1,'SALES',1,4);

-- M04: サービス拠点マスタ
INSERT INTO MST_SERVICE_BASE (code,display_name,can_be_contract_owner,company_type,is_active,display_order) VALUES
('MEAU','MEAU (Australia)',1,'SERVICE',1,1),
('MEB','MEB (Belgium/Europe)',1,'SERVICE',1,2),
('MEU','MEU (USA)',1,'SERVICE',1,3),
('MEACH','MEACH (China)',1,'SERVICE',1,4),
('MEAK','MEAK (Korea)',1,'SERVICE',1,5),
('MEAP','MEAP (Asia Pacific)',1,'SERVICE',1,6),
('MESM','MESM (Southeast Asia)',1,'SERVICE',1,7),
('MEVN','MEVN (Vietnam)',1,'SERVICE',1,8),
('MEIN','MEIN (India)',1,'SERVICE',1,9),
('ME-TWN','ME-TWN (Taiwan)',1,'SERVICE',1,10),
('MMEG','MMEG (Germany)',1,'SERVICE',1,11),
('MELAP','MELAP (Latin America Pacific)',1,'SERVICE',1,12),
('MEAUST','MEAUST (Austria)',1,'SERVICE',1,13),
('MEI','MEI (Italy)',1,'SERVICE',1,14);

-- M05: 国コードISO2マスタ
INSERT INTO MST_COUNTRY_ISO2 (code,display_name,is_active,display_order) VALUES
('JP','日本',1,1),
('US','アメリカ合衆国',1,2),
('DE','ドイツ',1,3),
('CN','中国',1,4),
('TH','タイ',1,5),
('IN','インド',1,6),
('KR','韓国',1,7),
('TW','台湾',1,8),
('AU','オーストラリア',1,9),
('VN','ベトナム',1,10),
('IT','イタリア',1,11),
('FR','フランス',1,12),
('GB','英国',1,13),
('MX','メキシコ',1,14),
('BR','ブラジル',1,15),
('BE','ベルギー',1,16),
('AT','オーストリア',1,17),
('SG','シンガポール',1,18),
('MY','マレーシア',1,19),
('ID','インドネシア',1,20);

-- M06: 契約者区分マスタ
INSERT INTO MST_CONTRACT_HOLDER_TYPE (code,display_name,description,is_active,display_order) VALUES
('MTB','MTB',N'機械メーカが契約者となる場合',1,1),
('DEALER','Dealer',N'代理店が契約者となる場合',1,2),
('ENDUSER','EndUser',N'エンドユーザが契約者となる場合',1,3);

-- M07: 契約タイプマスタ
INSERT INTO MST_CONTRACT_TYPE (code,display_name,description,standard_period_month,is_active,display_order) VALUES
('FULL','FULL',N'フル契約',24,1,1),
('PARTS','PARTS',N'パーツ契約',24,1,2),
('EWC','EWC',N'延長保証契約',12,1,3);

-- ============================================================
-- サンプルデータ（開発・テスト用）
-- ============================================================

INSERT INTO NC_BASIC_INFO (
  nc_serial_no, nc_system_model, machine_model, machine_serial_no, mtb_code,
  nc_sales_date, nc_sales_company_code,
  export_date, export_country_code,
  end_user, installation_date,
  registration_status, created_by, updated_by
) VALUES
('SN-2024-001', 'FCA830H-4SV', 'NVX5100', 'M-2024-001', 'DMGMORI',
 '2024-03-01', 'MEJ',
 '2024-04-15', 'JP',
 N'サンプル工業株式会社', '2024-05-01',
 N'契約情報登録済み', 'seed', 'seed'),
('SN-2024-002', 'FCA80H-4AV', 'VARIAXIS j-500', 'M-2024-002', 'MAZAK',
 '2024-06-01', 'MEE',
 '2024-07-20', 'DE',
 'Sample GmbH', '2024-08-01',
 N'契約未登録', 'seed', 'seed'),
('SN-2024-003', 'FCA850H-4SV', NULL, NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 N'下書き', 'seed', 'seed');

INSERT INTO NC_CONTRACT_INFO (
  nc_serial_no, contract_holder_type_code, contract_owner_code, service_base_code,
  contract_no, contract_type_code, contract_period_month, contract_start_date,
  contract_memo, created_by, updated_by
) VALUES
('SN-2024-001','MTB','MEJ','MEAK','C-2024-001','FULL',24,'2024-05-01',NULL,'seed','seed'),
('SN-2024-001','DEALER','MEE','MEB','C-2024-002','PARTS',12,'2026-05-01',N'延長オプション','seed','seed');
