-- ===================================================================
-- Script de Correção - Tamanhos de Campos
-- Sistema Importa Precifica - Correção de truncamento de dados
-- Problema: Campos VARCHAR muito pequenos para dados reais
-- ===================================================================

USE `importa_precificacao`;

-- ===================================================================
-- VERIFICAÇÃO INICIAL
-- ===================================================================

-- Mostrar tamanhos atuais dos campos problemáticos
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'importa_precificacao'
    AND COLUMN_NAME IN ('situacao_entrega')
    AND CHARACTER_MAXIMUM_LENGTH IS NOT NULL;

-- ===================================================================
-- CORREÇÕES DE TAMANHOS DE CAMPOS
-- ===================================================================

-- Corrigir campo situacao_entrega (atual: 100, necessário: 255+)
ALTER TABLE `declaracoes_importacao` 
    MODIFY COLUMN `situacao_entrega` VARCHAR(255)
    COMMENT 'Situação da entrega da carga - aumentado para suportar textos longos';

-- ===================================================================
-- VERIFICAÇÃO PÓS-CORREÇÃO
-- ===================================================================

-- Verificar se alterações foram aplicadas
SELECT 
    'CORRECAO_APLICADA' as status,
    COLUMN_NAME,
    CHARACTER_MAXIMUM_LENGTH as novo_tamanho
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'importa_precificacao'
    AND COLUMN_NAME = 'situacao_entrega';

-- ===================================================================
-- TESTE COM DADOS LONGOS
-- ===================================================================

-- Verificar se há dados na tabela que precisam ser testados
SELECT 
    'TESTE_CAPACIDADE' as teste,
    COUNT(*) as total_registros,
    MAX(LENGTH(situacao_entrega)) as maior_texto_atual
FROM `declaracoes_importacao`
WHERE situacao_entrega IS NOT NULL;

-- ===================================================================
-- OBSERVAÇÕES
-- ===================================================================

/*
PROBLEMA CORRIGIDO:
- Campo situacao_entrega aumentado de VARCHAR(100) para VARCHAR(255)
- Suporta agora textos como "ENTREGA CONDICIONADA A APRESENTACAO E RETENCAO DOS SEGUINTES DOCUMENTOS: DOCUMENTO DE EXONERACAO DO ICMS"

OUTROS CAMPOS QUE PODEM PRECISAR DE AUMENTO FUTURO:
- Verificar se há outros campos com truncamento similar
- Aplicar correções conforme necessário

RESULTADO ESPERADO:
- XML 2518173187.xml deve importar sem erro de truncamento
- Sistema mantém funcionalidade completa
*/