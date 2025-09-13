-- ===================================================================
-- SCRIPT: Criação da Tabela de Produtos Individuais Calculados
-- Data: 2025-09-13
-- Objetivo: Persistir produtos individuais calculados no banco estruturado
-- Substituir: Armazenamento JSON em calculos_salvos.resultados
-- ===================================================================

USE `importa_precificacao`;

-- ===================================================================
-- TABELA DE PRODUTOS INDIVIDUAIS CALCULADOS
-- Armazena os produtos calculados pelo ComplianceCalculator
-- Substitui armazenamento JSON na tabela calculos_salvos
-- ===================================================================

CREATE TABLE IF NOT EXISTS `produtos_individuais_calculados` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relacionamentos e Identificação
    `calculo_id` INT NOT NULL,                           -- FK para calculos_salvos.id
    `numero_di` VARCHAR(12) NOT NULL,                    -- FK para declaracoes_importacao
    `adicao_numero` VARCHAR(3) NOT NULL,                 -- Número da adição (001, 002, etc.)
    `produto_index` TINYINT UNSIGNED NOT NULL,           -- Índice do produto na adição (1-255)
    
    -- Dados do Produto (vindos da DI original)
    `ncm` VARCHAR(8) NOT NULL,                           -- NCM da adição
    `descricao` TEXT NOT NULL,                           -- Descrição do produto
    `codigo_produto` VARCHAR(50),                        -- Código do produto da DI
    `unidade_medida` VARCHAR(50),                        -- Unidade de medida (UN, KG, etc.)
    
    -- Valores Base (em BRL)
    `quantidade` DECIMAL(15,5) NOT NULL DEFAULT 0,       -- Quantidade do produto
    `valor_unitario_brl` DECIMAL(18,7) NOT NULL DEFAULT 0, -- Valor unitário em BRL
    `valor_total_brl` DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Valor total do produto
    
    -- Tributos Calculados por Produto (valores finais)
    `ii_valor_item` DECIMAL(15,2) NOT NULL DEFAULT 0,    -- II calculado por produto
    `ipi_valor_item` DECIMAL(15,2) NOT NULL DEFAULT 0,   -- IPI calculado por produto
    `pis_valor_item` DECIMAL(15,2) NOT NULL DEFAULT 0,   -- PIS calculado por produto
    `cofins_valor_item` DECIMAL(15,2) NOT NULL DEFAULT 0, -- COFINS calculado por produto
    `icms_valor_item` DECIMAL(15,2) NOT NULL DEFAULT 0,  -- ICMS calculado por produto
    
    -- Bases de Cálculo Detalhadas
    `base_icms_item` DECIMAL(15,2) NOT NULL DEFAULT 0,   -- Base ICMS por produto
    `aliquota_icms_aplicada` DECIMAL(7,4) NOT NULL DEFAULT 0, -- Alíquota ICMS aplicada (%)
    
    -- Custos Finais Calculados
    `custo_total_item` DECIMAL(15,2) NOT NULL DEFAULT 0, -- Custo final por produto
    `custo_unitario_final` DECIMAL(18,7) NOT NULL DEFAULT 0, -- Custo unitário final
    
    -- Metadados e Controle
    `estado_calculo` CHAR(2) NOT NULL,                   -- Estado usado no cálculo ICMS
    `hash_dados_origem` VARCHAR(64),                     -- Hash dos dados originais para validação
    `observacoes` TEXT,                                  -- Observações específicas do cálculo
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints e Integridade
    UNIQUE KEY `unique_produto_calculo` (`calculo_id`, `adicao_numero`, `produto_index`),
    FOREIGN KEY (`calculo_id`) REFERENCES `calculos_salvos`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`numero_di`) REFERENCES `declaracoes_importacao`(`numero_di`) ON DELETE CASCADE,
    
    -- Índices para Performance Otimizada
    INDEX `idx_numero_di` (`numero_di`),
    INDEX `idx_adicao_numero` (`adicao_numero`),
    INDEX `idx_ncm` (`ncm`),
    INDEX `idx_estado_calculo` (`estado_calculo`),
    INDEX `idx_custo_total` (`custo_total_item`),
    INDEX `idx_di_adicao` (`numero_di`, `adicao_numero`),
    INDEX `idx_calculo_produtos` (`calculo_id`, `adicao_numero`, `produto_index`),
    INDEX `idx_valor_unitario` (`valor_unitario_brl`),
    INDEX `idx_data_criacao` (`created_at`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Produtos individuais com tributos calculados pelo ComplianceCalculator - Substitui JSON em calculos_salvos';

-- ===================================================================
-- VIEW PARA CROQUI NF - OTIMIZADA PARA GERAÇÃO DE PDF
-- ===================================================================

CREATE OR REPLACE VIEW `view_produtos_croqui_nf` AS
SELECT 
    -- Identificação do Produto
    pic.id as produto_id,
    pic.numero_di,
    pic.adicao_numero,
    pic.produto_index,
    pic.ncm,
    pic.descricao,
    pic.codigo_produto,
    
    -- Dados Quantitativos
    pic.quantidade,
    pic.unidade_medida,
    pic.valor_unitario_brl,
    pic.valor_total_brl,
    
    -- Tributos Calculados
    pic.ii_valor_item,
    pic.ipi_valor_item,
    pic.pis_valor_item,
    pic.cofins_valor_item,
    pic.icms_valor_item,
    
    -- Custos Finais
    pic.base_icms_item,
    pic.aliquota_icms_aplicada,
    pic.custo_total_item,
    pic.custo_unitario_final,
    
    -- Dados da DI e Importador
    di.data_registro,
    di.taxa_cambio_calculada,
    imp.nome as importador_nome,
    imp.cnpj as importador_cnpj,
    imp.endereco_uf as importador_uf,
    imp.endereco_cidade as importador_cidade,
    
    -- Dados do Cálculo
    cs.estado_icms,
    cs.tipo_calculo,
    cs.created_at as data_calculo,
    pic.estado_calculo,
    
    -- Metadados
    pic.observacoes,
    pic.created_at as data_produto_calculado
    
FROM produtos_individuais_calculados pic
JOIN calculos_salvos cs ON pic.calculo_id = cs.id
JOIN declaracoes_importacao di ON pic.numero_di = di.numero_di
JOIN importadores imp ON di.importador_id = imp.id
ORDER BY pic.numero_di, pic.adicao_numero, pic.produto_index;

-- ===================================================================
-- VIEW PARA RESUMO DE CUSTOS POR ADIÇÃO
-- ===================================================================

CREATE OR REPLACE VIEW `view_custos_adicao_resumo` AS
SELECT 
    pic.numero_di,
    pic.adicao_numero,
    pic.ncm,
    
    -- Contadores
    COUNT(*) as total_produtos,
    
    -- Totalizadores por Adição
    SUM(pic.quantidade) as quantidade_total,
    SUM(pic.valor_total_brl) as valor_total_adicao,
    SUM(pic.ii_valor_item) as ii_total_adicao,
    SUM(pic.ipi_valor_item) as ipi_total_adicao,
    SUM(pic.pis_valor_item) as pis_total_adicao,
    SUM(pic.cofins_valor_item) as cofins_total_adicao,
    SUM(pic.icms_valor_item) as icms_total_adicao,
    SUM(pic.custo_total_item) as custo_total_adicao,
    
    -- Médias Calculadas
    AVG(pic.custo_unitario_final) as custo_unitario_medio,
    AVG(pic.aliquota_icms_aplicada) as aliquota_icms_media,
    
    -- Dados de Controle
    pic.estado_calculo,
    MAX(pic.created_at) as ultima_atualizacao
    
FROM produtos_individuais_calculados pic
GROUP BY pic.numero_di, pic.adicao_numero, pic.ncm, pic.estado_calculo
ORDER BY pic.numero_di, pic.adicao_numero;

-- ===================================================================
-- VIEW PARA ANÁLISE DE PRECIFICAÇÃO E COMPETITIVIDADE
-- ===================================================================

CREATE OR REPLACE VIEW `view_analise_precificacao` AS
SELECT 
    pic.numero_di,
    pic.ncm,
    pic.descricao,
    pic.codigo_produto,
    pic.quantidade,
    pic.estado_calculo,
    
    -- Custos Base
    pic.valor_unitario_brl as custo_base_unitario,
    pic.custo_unitario_final,
    
    -- Análise de Sobrecarga Tributária
    (pic.custo_unitario_final - pic.valor_unitario_brl) as sobrecarga_tributos_unitario,
    CASE 
        WHEN pic.valor_unitario_brl > 0 THEN
            ROUND(((pic.custo_unitario_final - pic.valor_unitario_brl) / pic.valor_unitario_brl * 100), 2)
        ELSE 0 
    END as percentual_sobrecarga,
    
    -- Detalhamento de Tributos por Percentual
    CASE 
        WHEN pic.valor_unitario_brl > 0 THEN
            ROUND((pic.ii_valor_item / pic.valor_unitario_brl * 100), 2)
        ELSE 0 
    END as percentual_ii,
    
    CASE 
        WHEN pic.valor_unitario_brl > 0 THEN
            ROUND((pic.icms_valor_item / pic.valor_unitario_brl * 100), 2)
        ELSE 0 
    END as percentual_icms,
    
    -- Dados Temporais para Análise de Tendências
    cs.created_at as data_calculo,
    MONTH(cs.created_at) as mes_calculo,
    YEAR(cs.created_at) as ano_calculo
    
FROM produtos_individuais_calculados pic
JOIN calculos_salvos cs ON pic.calculo_id = cs.id
WHERE pic.valor_unitario_brl > 0  -- Evitar divisão por zero
ORDER BY percentual_sobrecarga DESC, pic.numero_di, pic.adicao_numero;

-- ===================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ===================================================================

-- Adicionar comentários nas colunas principais para documentação
ALTER TABLE `produtos_individuais_calculados` 
COMMENT = 'Tabela de produtos individuais calculados - Substitui JSON em calculos_salvos para melhor performance e consultas estruturadas';

-- Log de criação
INSERT INTO `importacoes_log` (
    `numero_di`, 
    `status`, 
    `observacoes`
) VALUES (
    'SISTEMA', 
    'CONCLUIDO', 
    'Tabela produtos_individuais_calculados criada com sucesso - 2025-09-13'
);

-- ===================================================================
-- ÍNDICES ADICIONAIS PARA CONSULTAS ESPECÍFICAS
-- ===================================================================

-- Índice para consultas por faixa de valor (relatórios de precificação)
CREATE INDEX `idx_faixa_valor` ON `produtos_individuais_calculados` (
    `valor_unitario_brl`, 
    `custo_unitario_final`
);

-- Índice para consultas temporais (análises de tendência)
CREATE INDEX `idx_temporal_ncm` ON `produtos_individuais_calculados` (
    `ncm`, 
    `created_at`
);

-- Índice composto para consultas de dashboard
CREATE INDEX `idx_dashboard_stats` ON `produtos_individuais_calculados` (
    `estado_calculo`, 
    `ncm`, 
    `created_at`
);

-- ===================================================================
-- FINALIZAÇÃO
-- ===================================================================

SELECT 'Tabela produtos_individuais_calculados criada com sucesso!' as status;
SELECT 'Views otimizadas criadas para consultas de CroquiNF' as views_status;
SELECT 'Índices de performance aplicados' as indices_status;