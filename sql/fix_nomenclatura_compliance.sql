-- ===================================================================
-- Script de Correção - Conformidade com Nomenclatura
-- Sistema Importa Precifica - Alinhamento XML vs Banco de Dados
-- Baseado na análise do docs/nomenclatura.md
-- ===================================================================

USE `importa_precificacao`;

-- ===================================================================
-- FASE 1: ADICIONAR CAMPOS FALTANTES
-- ===================================================================

-- Adicionar campos de frete e seguro em moeda estrangeira na tabela adicoes
ALTER TABLE `adicoes` 
ADD COLUMN `frete_valor_moeda_negociada` DECIMAL(15,2) DEFAULT 0 AFTER `frete_valor_reais`,
ADD COLUMN `seguro_valor_moeda_negociada` DECIMAL(15,2) DEFAULT 0 AFTER `seguro_valor_reais`;

-- Verificar se alterações foram aplicadas
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'adicoes' 
    AND TABLE_SCHEMA = 'importa_precificacao'
    AND COLUMN_NAME IN ('frete_valor_moeda_negociada', 'seguro_valor_moeda_negociada');

-- ===================================================================
-- FASE 2: COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ===================================================================

-- Adicionar comentários explicativos nas tabelas para melhor documentação
ALTER TABLE `adicoes` 
    COMMENT = 'Adições de DI - Baseado na nomenclatura docs/nomenclatura.md',
    MODIFY COLUMN `frete_valor_moeda_negociada` DECIMAL(15,2) DEFAULT 0 
        COMMENT 'Frete na moeda de negociação - XML: freteValorMoedaNegociada',
    MODIFY COLUMN `seguro_valor_moeda_negociada` DECIMAL(15,2) DEFAULT 0 
        COMMENT 'Seguro na moeda de negociação - XML: seguroValorMoedaNegociada',
    MODIFY COLUMN `frete_valor_reais` DECIMAL(15,2) DEFAULT 0 
        COMMENT 'Frete em reais - XML: freteValorReais',
    MODIFY COLUMN `seguro_valor_reais` DECIMAL(15,2) DEFAULT 0 
        COMMENT 'Seguro em reais - XML: seguroValorReais';

-- Comentários na tabela mercadorias
ALTER TABLE `mercadorias`
    MODIFY COLUMN `valor_unitario_brl` DECIMAL(15,2) DEFAULT 0 
        COMMENT 'Valor unitário calculado em BRL baseado em USD',
    MODIFY COLUMN `codigo_produto` VARCHAR(50) 
        COMMENT 'Código do produto extraído do XML se disponível';

-- ===================================================================
-- FASE 3: ÍNDICES PARA PERFORMANCE
-- ===================================================================

-- Adicionar índices nos novos campos para otimização de consultas
ALTER TABLE `adicoes`
ADD INDEX `idx_frete_moeda` (`frete_valor_moeda_negociada`),
ADD INDEX `idx_seguro_moeda` (`seguro_valor_moeda_negociada`);

-- ===================================================================
-- FASE 4: VERIFICAÇÃO FINAL
-- ===================================================================

-- Script de verificação da conformidade
SELECT 
    'CONFORMIDADE VERIFICADA' as status,
    COUNT(*) as total_adicoes_com_novos_campos
FROM `adicoes` 
WHERE `frete_valor_moeda_negociada` IS NOT NULL 
    AND `seguro_valor_moeda_negociada` IS NOT NULL;

-- Mostrar estrutura atualizada da tabela adicoes
DESCRIBE `adicoes`;

-- ===================================================================
-- INFORMAÇÕES PARA MIGRAÇÃO
-- ===================================================================

-- Query para identificar registros que precisam de migração
-- (a ser executada após atualização do processor.php)
SELECT 
    numero_di,
    numero_adicao,
    valor_reais,
    frete_valor_reais,
    seguro_valor_reais,
    moeda_negociacao_codigo,
    -- Campos que serão populados via reprocessamento
    frete_valor_moeda_negociada,
    seguro_valor_moeda_negociada
FROM `adicoes` 
WHERE `frete_valor_moeda_negociada` = 0 
    AND `seguro_valor_moeda_negociada` = 0
    AND (`frete_valor_reais` > 0 OR `seguro_valor_reais` > 0)
LIMIT 10;

-- ===================================================================
-- OBSERVAÇÕES IMPORTANTES
-- ===================================================================

/*
CAMPOS ADICIONADOS:
1. adicoes.frete_valor_moeda_negociada - Para armazenar valor frete na moeda original
2. adicoes.seguro_valor_moeda_negociada - Para armazenar valor seguro na moeda original

CAMPOS EXISTENTES A SEREM POPULADOS:
1. mercadorias.valor_unitario_brl - Calcular baseado em valor_unitario_usd
2. mercadorias.codigo_produto - Extrair do XML se disponível

PRÓXIMOS PASSOS:
1. Atualizar XMLImportProcessor.php para popular estes campos
2. Criar script de migração para dados existentes
3. Testar com XMLs de amostra
4. Validar conformidade total com nomenclatura.md
*/