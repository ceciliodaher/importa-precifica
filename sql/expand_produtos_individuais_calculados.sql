-- ===================================================================
-- SCRIPT: Expansão da Tabela produtos_individuais_calculados
-- Data: 2025-09-13
-- Objetivo: Adicionar campos para ProductMemoryManager migration
-- Fase: 2.1 - Migração completa localStorage → database
-- ===================================================================

USE `importa_precificacao`;

-- ===================================================================
-- BACKUP EXISTING TABLE STRUCTURE
-- ===================================================================
CREATE TABLE IF NOT EXISTS `produtos_individuais_calculados_backup` AS 
SELECT * FROM `produtos_individuais_calculados` WHERE 1=0;

-- ===================================================================
-- ADD FIELDS FOR PRODUCTMEMORYMANAGER MIGRATION
-- ===================================================================

-- 1. Additional Product Details
ALTER TABLE `produtos_individuais_calculados` 
ADD COLUMN `product_id` VARCHAR(64) NULL AFTER `id`,           -- ProductMemoryManager ID
ADD COLUMN `origin_country` VARCHAR(3) NULL AFTER `codigo_produto`, -- Country of origin  
ADD COLUMN `manufacturer` VARCHAR(255) NULL AFTER `origin_country`,  -- Manufacturer info

-- 2. Additional Tax Details
ADD COLUMN `ii_aliquota_aplicada` DECIMAL(7,4) DEFAULT 0 AFTER `ii_valor_item`,  -- II rate applied
ADD COLUMN `ipi_aliquota_aplicada` DECIMAL(7,4) DEFAULT 0 AFTER `ipi_valor_item`, -- IPI rate applied
ADD COLUMN `pis_aliquota_aplicada` DECIMAL(7,4) DEFAULT 0 AFTER `pis_valor_item`, -- PIS rate applied
ADD COLUMN `cofins_aliquota_aplicada` DECIMAL(7,4) DEFAULT 0 AFTER `cofins_valor_item`, -- COFINS rate applied

-- 3. Additional Costs (ProductMemoryManager expenses)
ADD COLUMN `expenses_siscomex` DECIMAL(15,2) DEFAULT 0 AFTER `custo_unitario_final`,
ADD COLUMN `expenses_afrmm` DECIMAL(15,2) DEFAULT 0 AFTER `expenses_siscomex`,
ADD COLUMN `expenses_capatazia` DECIMAL(15,2) DEFAULT 0 AFTER `expenses_afrmm`,
ADD COLUMN `expenses_armazenagem` DECIMAL(15,2) DEFAULT 0 AFTER `expenses_capatazia`,
ADD COLUMN `expenses_outras` DECIMAL(15,2) DEFAULT 0 AFTER `expenses_armazenagem`,
ADD COLUMN `expenses_total` DECIMAL(15,2) DEFAULT 0 AFTER `expenses_outras`,

-- 4. Special Cases Flags (ProductMemoryManager special_cases)
ADD COLUMN `is_monofasico` BOOLEAN DEFAULT FALSE AFTER `expenses_total`,
ADD COLUMN `has_icms_st` BOOLEAN DEFAULT FALSE AFTER `is_monofasico`,
ADD COLUMN `has_cofins_adicional` BOOLEAN DEFAULT FALSE AFTER `has_icms_st`,
ADD COLUMN `industrial_use` BOOLEAN DEFAULT FALSE AFTER `has_cofins_adicional`,
ADD COLUMN `icms_st_value` DECIMAL(15,2) DEFAULT 0 AFTER `industrial_use`,
ADD COLUMN `cofins_adicional_value` DECIMAL(15,2) DEFAULT 0 AFTER `icms_st_value`,

-- 5. Exchange Rate and Metadata
ADD COLUMN `taxa_cambio` DECIMAL(10,6) DEFAULT 0 AFTER `cofins_adicional_value`,
ADD COLUMN `import_date` DATE NULL AFTER `taxa_cambio`,
ADD COLUMN `data_calculo` TIMESTAMP NULL AFTER `import_date`,

-- 6. Additional JSON field for flexible data storage
ADD COLUMN `dados_extras_json` LONGTEXT NULL AFTER `observacoes`,

-- 7. ProductMemoryManager compatibility
ADD COLUMN `sync_status` ENUM('pending', 'synced', 'error') DEFAULT 'pending' AFTER `dados_extras_json`,
ADD COLUMN `last_sync_at` TIMESTAMP NULL AFTER `sync_status`;

-- ===================================================================
-- UPDATE INDEXES FOR NEW FIELDS
-- ===================================================================

-- Index for ProductMemoryManager ID lookups
CREATE INDEX `idx_product_id` ON `produtos_individuais_calculados` (`product_id`);

-- Index for sync status queries
CREATE INDEX `idx_sync_status` ON `produtos_individuais_calculados` (`sync_status`, `last_sync_at`);

-- Index for import date queries
CREATE INDEX `idx_import_date` ON `produtos_individuais_calculados` (`import_date`);

-- Index for NCM analysis
CREATE INDEX `idx_ncm_estado` ON `produtos_individuais_calculados` (`ncm`, `estado_calculo`);

-- ===================================================================
-- UPDATE VIEW FOR CROQUINF COMPATIBILITY
-- ===================================================================

DROP VIEW IF EXISTS `view_produtos_croqui_nf`;

CREATE VIEW `view_produtos_croqui_nf` AS
SELECT 
    p.`numero_di`,
    p.`adicao_numero`,
    p.`produto_index`,
    p.`ncm`,
    p.`descricao`,
    p.`codigo_produto`,
    p.`unidade_medida`,
    p.`quantidade`,
    p.`valor_unitario_brl`,
    p.`valor_total_brl`,
    
    -- Tax values
    p.`ii_valor_item`,
    p.`ipi_valor_item`, 
    p.`pis_valor_item`,
    p.`cofins_valor_item`,
    p.`icms_valor_item`,
    
    -- Applied rates (NEW)
    p.`ii_aliquota_aplicada`,
    p.`ipi_aliquota_aplicada`,
    p.`pis_aliquota_aplicada`,
    p.`cofins_aliquota_aplicada`,
    p.`aliquota_icms_aplicada`,
    
    -- Costs and expenses
    p.`custo_total_item`,
    p.`custo_unitario_final`,
    p.`expenses_siscomex`,
    p.`expenses_afrmm`,
    p.`expenses_capatazia`,
    p.`expenses_armazenagem`,
    p.`expenses_outras`,
    p.`expenses_total`,
    
    -- Totals for PDF generation
    (p.`ii_valor_item` + p.`ipi_valor_item` + p.`pis_valor_item` + 
     p.`cofins_valor_item` + p.`icms_valor_item`) AS `total_tributos_item`,
    
    -- Metadata
    p.`estado_calculo`,
    p.`taxa_cambio`,
    p.`import_date`,
    p.`created_at`,
    
    -- Special cases
    p.`is_monofasico`,
    p.`has_icms_st`,
    p.`has_cofins_adicional`,
    p.`industrial_use`
    
FROM `produtos_individuais_calculados` p
WHERE p.`sync_status` = 'synced' 
ORDER BY p.`numero_di`, p.`adicao_numero`, p.`produto_index`;

-- ===================================================================
-- CREATE PROCEDURE FOR MIGRATION FROM LOCALSTORAGE
-- ===================================================================

DELIMITER //

CREATE PROCEDURE MigrateProductFromLocalStorage(
    IN p_product_id VARCHAR(64),
    IN p_numero_di VARCHAR(12), 
    IN p_json_data LONGTEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Insert product with JSON data for complex fields
    INSERT INTO produtos_individuais_calculados (
        product_id,
        numero_di,
        dados_extras_json,
        sync_status,
        created_at,
        last_sync_at
    ) VALUES (
        p_product_id,
        p_numero_di, 
        p_json_data,
        'synced',
        NOW(),
        NOW()
    );
    
    COMMIT;
END //

DELIMITER ;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Verify new columns exist
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'importa_precificacao' 
    AND TABLE_NAME = 'produtos_individuais_calculados'
    AND COLUMN_NAME IN ('product_id', 'expenses_siscomex', 'is_monofasico', 'taxa_cambio')
ORDER BY ORDINAL_POSITION;

-- Verify indexes
SHOW INDEX FROM produtos_individuais_calculados WHERE Key_name LIKE 'idx_%';

-- Verify view
SELECT COUNT(*) as total_products FROM view_produtos_croqui_nf;

-- ===================================================================
-- CLEANUP QUERIES (Run after successful migration)
-- ===================================================================

-- Drop backup table after successful migration
-- DROP TABLE IF EXISTS produtos_individuais_calculados_backup;

-- ===================================================================
-- SUCCESS MESSAGE
-- ===================================================================

SELECT 'Tabela produtos_individuais_calculados expandida com sucesso!' as status;
SELECT 'Pronta para migração ProductMemoryManager → Database' as next_step;