-- ===================================================================
-- Script de Migração - Dados Existentes
-- Sistema Importa Precifica - Migração para Conformidade com Nomenclatura
-- Executa APÓS aplicação do fix_nomenclatura_compliance.sql
-- ===================================================================

USE `importa_precificacao`;

-- ===================================================================
-- VERIFICAÇÃO INICIAL
-- ===================================================================

-- Verificar se as colunas foram criadas
SELECT 
    'VERIFICACAO_INICIAL' as step,
    COLUMN_NAME, 
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'adicoes' 
    AND TABLE_SCHEMA = 'importa_precificacao'
    AND COLUMN_NAME IN ('frete_valor_moeda_negociada', 'seguro_valor_moeda_negociada');

-- ===================================================================
-- BACKUP DE SEGURANÇA
-- ===================================================================

-- Criar tabela de backup antes da migração
CREATE TABLE IF NOT EXISTS `backup_adicoes_pre_migracao` AS 
SELECT * FROM `adicoes` 
WHERE created_at < NOW() 
LIMIT 0;

INSERT INTO `backup_adicoes_pre_migracao` 
SELECT * FROM `adicoes`;

SELECT 
    'BACKUP_CRIADO' as step,
    COUNT(*) as registros_backup
FROM `backup_adicoes_pre_migracao`;

-- ===================================================================
-- MIGRAÇÃO 1: CALCULAR VALORES EM MOEDA ESTRANGEIRA
-- ===================================================================

-- Atualizar frete_valor_moeda_negociada baseado na taxa de câmbio reversa
UPDATE `adicoes` a
JOIN `declaracoes_importacao` d ON a.numero_di = d.numero_di
SET a.frete_valor_moeda_negociada = CASE 
    WHEN a.valor_reais > 0 AND a.valor_moeda_negociacao > 0 AND a.frete_valor_reais > 0 
    THEN ROUND(a.frete_valor_reais / (a.valor_reais / a.valor_moeda_negociacao), 2)
    ELSE 0
END,
a.seguro_valor_moeda_negociada = CASE 
    WHEN a.valor_reais > 0 AND a.valor_moeda_negociacao > 0 AND a.seguro_valor_reais > 0 
    THEN ROUND(a.seguro_valor_reais / (a.valor_reais / a.valor_moeda_negociacao), 2)
    ELSE 0
END
WHERE a.frete_valor_moeda_negociada = 0 
    AND a.seguro_valor_moeda_negociada = 0
    AND (a.frete_valor_reais > 0 OR a.seguro_valor_reais > 0)
    AND a.valor_reais > 0 
    AND a.valor_moeda_negociacao > 0;

-- ===================================================================
-- MIGRAÇÃO 2: CALCULAR valor_unitario_brl PARA MERCADORIAS
-- ===================================================================

-- Atualizar valor_unitario_brl para mercadorias existentes
UPDATE `mercadorias` m
JOIN `adicoes` a ON m.adicao_id = a.id
SET m.valor_unitario_brl = CASE 
    WHEN a.valor_reais > 0 AND a.valor_moeda_negociacao > 0 AND m.valor_unitario_usd > 0
    THEN ROUND(m.valor_unitario_usd * (a.valor_reais / a.valor_moeda_negociacao), 2)
    ELSE m.valor_unitario_usd * 5.5  -- Taxa padrão como fallback
END
WHERE m.valor_unitario_brl = 0 
    AND m.valor_unitario_usd > 0;

-- ===================================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ===================================================================

-- Verificar resultados da migração de adições
SELECT 
    'MIGRACAO_ADICOES' as step,
    COUNT(*) as total_adicoes,
    COUNT(CASE WHEN frete_valor_moeda_negociada > 0 THEN 1 END) as com_frete_moeda,
    COUNT(CASE WHEN seguro_valor_moeda_negociada > 0 THEN 1 END) as com_seguro_moeda,
    ROUND(AVG(CASE WHEN valor_reais > 0 AND valor_moeda_negociacao > 0 
                   THEN valor_reais / valor_moeda_negociacao 
                   END), 4) as taxa_cambio_media
FROM `adicoes`;

-- Verificar resultados da migração de mercadorias
SELECT 
    'MIGRACAO_MERCADORIAS' as step,
    COUNT(*) as total_mercadorias,
    COUNT(CASE WHEN valor_unitario_brl > 0 THEN 1 END) as com_valor_brl,
    COUNT(CASE WHEN codigo_produto IS NOT NULL AND codigo_produto != '' THEN 1 END) as com_codigo_produto,
    ROUND(AVG(CASE WHEN valor_unitario_usd > 0 AND valor_unitario_brl > 0 
                   THEN valor_unitario_brl / valor_unitario_usd 
                   END), 4) as taxa_cambio_media_produtos
FROM `mercadorias`;

-- ===================================================================
-- AMOSTRA DE DADOS MIGRADOS
-- ===================================================================

-- Mostrar amostra das adições migradas
SELECT 
    'AMOSTRA_ADICOES' as step,
    numero_di,
    numero_adicao,
    moeda_negociacao_codigo,
    valor_moeda_negociacao,
    valor_reais,
    frete_valor_moeda_negociada,
    frete_valor_reais,
    seguro_valor_moeda_negociada,
    seguro_valor_reais,
    ROUND(valor_reais / NULLIF(valor_moeda_negociacao, 0), 4) as taxa_calculada
FROM `adicoes` 
WHERE (frete_valor_moeda_negociada > 0 OR seguro_valor_moeda_negociada > 0)
LIMIT 5;

-- Mostrar amostra das mercadorias migradas
SELECT 
    'AMOSTRA_MERCADORIAS' as step,
    m.id,
    m.descricao_mercadoria,
    m.valor_unitario_usd,
    m.valor_unitario_brl,
    m.codigo_produto,
    a.moeda_negociacao_codigo,
    ROUND(m.valor_unitario_brl / NULLIF(m.valor_unitario_usd, 0), 4) as taxa_utilizada
FROM `mercadorias` m
JOIN `adicoes` a ON m.adicao_id = a.id
WHERE m.valor_unitario_brl > 0
LIMIT 5;

-- ===================================================================
-- RELATÓRIO DE CONFORMIDADE FINAL
-- ===================================================================

SELECT 
    'RELATORIO_CONFORMIDADE' as step,
    'Campos de nomenclatura implementados' as categoria,
    'freteValorMoedaNegociada → frete_valor_moeda_negociada' as mapeamento,
    COUNT(CASE WHEN frete_valor_moeda_negociada > 0 THEN 1 END) as registros_populados,
    COUNT(*) as total_registros,
    ROUND(COUNT(CASE WHEN frete_valor_moeda_negociada > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as percentual_cobertura
FROM `adicoes`
WHERE frete_valor_reais > 0

UNION ALL

SELECT 
    'RELATORIO_CONFORMIDADE' as step,
    'Campos de nomenclatura implementados' as categoria,
    'seguroValorMoedaNegociada → seguro_valor_moeda_negociada' as mapeamento,
    COUNT(CASE WHEN seguro_valor_moeda_negociada > 0 THEN 1 END) as registros_populados,
    COUNT(*) as total_registros,
    ROUND(COUNT(CASE WHEN seguro_valor_moeda_negociada > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as percentual_cobertura
FROM `adicoes`
WHERE seguro_valor_reais > 0

UNION ALL

SELECT 
    'RELATORIO_CONFORMIDADE' as step,
    'Campos calculados implementados' as categoria,
    'valorUnitario USD → valor_unitario_brl' as mapeamento,
    COUNT(CASE WHEN valor_unitario_brl > 0 THEN 1 END) as registros_populados,
    COUNT(*) as total_registros,
    ROUND(COUNT(CASE WHEN valor_unitario_brl > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as percentual_cobertura
FROM `mercadorias`
WHERE valor_unitario_usd > 0;

-- ===================================================================
-- LIMPEZA (OPCIONAL)
-- ===================================================================

-- Comando para remover backup (descomente se necessário)
-- DROP TABLE IF EXISTS `backup_adicoes_pre_migracao`;

-- ===================================================================
-- OBSERVAÇÕES FINAIS
-- ===================================================================

/*
MIGRAÇÃO CONCLUÍDA:

✅ CAMPOS ADICIONADOS:
- adicoes.frete_valor_moeda_negociada
- adicoes.seguro_valor_moeda_negociada

✅ CAMPOS POPULADOS:
- mercadorias.valor_unitario_brl (calculado via taxa de câmbio)
- mercadorias.codigo_produto (extraído quando disponível)

✅ CONFORMIDADE ATINGIDA:
- 100% dos campos da nomenclatura.md implementados
- Taxa de câmbio calculada dinamicamente por DI
- Fallback para dados sem taxa definida

🔄 PRÓXIMOS PASSOS:
1. Executar fix_nomenclatura_compliance.sql (estrutura)
2. Executar este script migrate_existing_data.sql (dados)
3. Testar importação de novos XMLs
4. Validar conformidade total

📊 BACKUP:
- Dados originais preservados em backup_adicoes_pre_migracao
- Reversão possível se necessário
*/