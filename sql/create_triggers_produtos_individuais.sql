-- ===================================================================
-- SCRIPT: Triggers para Produtos Individuais Calculados
-- Data: 2025-09-13
-- Objetivo: Manter sincronização e integridade entre tabelas relacionadas
-- ===================================================================

USE `importa_precificacao`;

-- ===================================================================
-- TRIGGER PARA LIMPEZA EM CASCATA
-- Remove produtos individuais quando cálculo pai for deletado
-- ===================================================================

DELIMITER //

DROP TRIGGER IF EXISTS `tr_cleanup_produtos_calculo_delete`//

CREATE TRIGGER `tr_cleanup_produtos_calculo_delete` 
AFTER DELETE ON `calculos_salvos` 
FOR EACH ROW
BEGIN
    DECLARE produtos_removidos INT DEFAULT 0;
    
    -- Contar produtos que serão removidos para log
    SELECT COUNT(*) INTO produtos_removidos
    FROM produtos_individuais_calculados 
    WHERE calculo_id = OLD.id;
    
    -- Remover produtos individuais do cálculo deletado
    DELETE FROM produtos_individuais_calculados 
    WHERE calculo_id = OLD.id;
    
    -- Log da operação
    INSERT INTO importacoes_log (
        numero_di, 
        status, 
        observacoes
    ) VALUES (
        OLD.numero_di,
        'CONCLUIDO',
        CONCAT('Trigger: Removidos ', produtos_removidos, ' produtos individuais do cálculo ID ', OLD.id)
    );
    
END//

-- ===================================================================
-- TRIGGER PARA ATUALIZAÇÃO DE HASH E CONTROLE
-- Atualiza hash no cálculo pai quando produtos são inseridos
-- ===================================================================

DROP TRIGGER IF EXISTS `tr_atualizar_hash_produtos_insert`//

CREATE TRIGGER `tr_atualizar_hash_produtos_insert` 
AFTER INSERT ON `produtos_individuais_calculados` 
FOR EACH ROW
BEGIN
    DECLARE hash_atual VARCHAR(64);
    
    -- Obter hash atual do cálculo
    SELECT hash_dados INTO hash_atual 
    FROM calculos_salvos 
    WHERE id = NEW.calculo_id;
    
    -- Atualizar hash incluindo dados do novo produto
    UPDATE calculos_salvos 
    SET 
        updated_at = CURRENT_TIMESTAMP,
        hash_dados = MD5(CONCAT(
            COALESCE(hash_atual, ''), 
            NEW.adicao_numero, 
            NEW.produto_index, 
            NEW.ncm,
            NEW.custo_total_item
        ))
    WHERE id = NEW.calculo_id;
    
END//

-- ===================================================================
-- TRIGGER PARA CONTROLE DE ATUALIZAÇÕES
-- Registra quando produtos individuais são modificados
-- ===================================================================

DROP TRIGGER IF EXISTS `tr_auditoria_produtos_update`//

CREATE TRIGGER `tr_auditoria_produtos_update` 
AFTER UPDATE ON `produtos_individuais_calculados` 
FOR EACH ROW
BEGIN
    -- Verificar se houve mudança significativa nos valores
    IF (ABS(OLD.custo_total_item - NEW.custo_total_item) > 0.01) OR
       (OLD.estado_calculo != NEW.estado_calculo) THEN
        
        -- Log da alteração significativa
        INSERT INTO importacoes_log (
            numero_di, 
            status, 
            observacoes
        ) VALUES (
            NEW.numero_di,
            'CONCLUIDO',
            CONCAT(
                'Produto ID ', NEW.id, ' atualizado: ',
                'Custo anterior R$ ', ROUND(OLD.custo_total_item, 2),
                ' → Custo novo R$ ', ROUND(NEW.custo_total_item, 2),
                ' | Estado: ', OLD.estado_calculo, ' → ', NEW.estado_calculo
            )
        );
        
        -- Atualizar timestamp do cálculo pai
        UPDATE calculos_salvos 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.calculo_id;
        
    END IF;
    
END//

-- ===================================================================
-- TRIGGER PARA VALIDAÇÃO DE INTEGRIDADE
-- Valida dados antes da inserção
-- ===================================================================

DROP TRIGGER IF EXISTS `tr_validacao_produtos_insert`//

CREATE TRIGGER `tr_validacao_produtos_insert` 
BEFORE INSERT ON `produtos_individuais_calculados` 
FOR EACH ROW
BEGIN
    -- Validar valores não podem ser negativos
    IF NEW.quantidade < 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Quantidade não pode ser negativa';
    END IF;
    
    IF NEW.valor_unitario_brl < 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Valor unitário não pode ser negativo';
    END IF;
    
    -- Validar NCM tem formato correto (8 dígitos)
    IF LENGTH(NEW.ncm) != 8 OR NEW.ncm NOT REGEXP '^[0-9]{8}$' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'NCM deve ter exatamente 8 dígitos numéricos';
    END IF;
    
    -- Validar estado tem 2 caracteres
    IF LENGTH(NEW.estado_calculo) != 2 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Estado deve ter exatamente 2 caracteres';
    END IF;
    
    -- Calcular custo total automaticamente se não fornecido
    IF NEW.custo_total_item = 0 OR NEW.custo_total_item IS NULL THEN
        SET NEW.custo_total_item = NEW.valor_total_brl + 
                                   NEW.ii_valor_item + 
                                   NEW.ipi_valor_item + 
                                   NEW.pis_valor_item + 
                                   NEW.cofins_valor_item + 
                                   NEW.icms_valor_item;
    END IF;
    
    -- Calcular custo unitário final automaticamente se não fornecido
    IF NEW.custo_unitario_final = 0 OR NEW.custo_unitario_final IS NULL THEN
        IF NEW.quantidade > 0 THEN
            SET NEW.custo_unitario_final = NEW.custo_total_item / NEW.quantidade;
        END IF;
    END IF;
    
    -- Gerar hash dos dados de origem se não fornecido
    IF NEW.hash_dados_origem IS NULL OR NEW.hash_dados_origem = '' THEN
        SET NEW.hash_dados_origem = MD5(CONCAT(
            NEW.numero_di,
            NEW.adicao_numero,
            NEW.produto_index,
            NEW.ncm,
            NEW.quantidade,
            NEW.valor_unitario_brl
        ));
    END IF;
    
END//

-- ===================================================================
-- TRIGGER PARA ESTATÍSTICAS AUTOMÁTICAS
-- Atualiza contadores na tabela de DI
-- ===================================================================

DROP TRIGGER IF EXISTS `tr_atualizar_estatisticas_di`//

CREATE TRIGGER `tr_atualizar_estatisticas_di` 
AFTER INSERT ON `produtos_individuais_calculados` 
FOR EACH ROW
BEGIN
    -- Atualizar estatísticas da DI (pode criar campo se necessário)
    -- Por enquanto apenas registrar no log para auditoria
    INSERT INTO importacoes_log (
        numero_di, 
        status, 
        total_adicoes,
        observacoes
    ) VALUES (
        NEW.numero_di,
        'CONCLUIDO',
        (SELECT COUNT(DISTINCT adicao_numero) 
         FROM produtos_individuais_calculados 
         WHERE numero_di = NEW.numero_di),
        CONCAT('Produto individual inserido: Adição ', NEW.adicao_numero, ', Produto ', NEW.produto_index)
    );
    
END//

DELIMITER ;

-- ===================================================================
-- FUNÇÃO AUXILIAR PARA CONSULTA DE PRODUTOS DE UMA DI
-- ===================================================================

DELIMITER //

DROP FUNCTION IF EXISTS `fn_contar_produtos_di`//

CREATE FUNCTION `fn_contar_produtos_di`(
    p_numero_di VARCHAR(12)
) RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_produtos INT DEFAULT 0;
    
    SELECT COUNT(*) INTO total_produtos
    FROM produtos_individuais_calculados
    WHERE numero_di = p_numero_di;
    
    RETURN total_produtos;
END//

-- ===================================================================
-- FUNÇÃO PARA CALCULAR CUSTO TOTAL DE UMA DI
-- ===================================================================

DROP FUNCTION IF EXISTS `fn_custo_total_di`//

CREATE FUNCTION `fn_custo_total_di`(
    p_numero_di VARCHAR(12),
    p_estado_calculo CHAR(2)
) RETURNS DECIMAL(15,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE custo_total DECIMAL(15,2) DEFAULT 0;
    
    SELECT COALESCE(SUM(custo_total_item), 0) INTO custo_total
    FROM produtos_individuais_calculados
    WHERE numero_di = p_numero_di 
      AND estado_calculo = p_estado_calculo;
    
    RETURN custo_total;
END//

DELIMITER ;

-- ===================================================================
-- PROCEDURE PARA MIGRAÇÃO DE DADOS EXISTENTES
-- ===================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_migrar_produtos_individuais`//

CREATE PROCEDURE `sp_migrar_produtos_individuais`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE calc_id INT;
    DECLARE di_numero VARCHAR(12);
    DECLARE estado_icms CHAR(2);
    DECLARE produtos_json JSON;
    DECLARE produtos_count INT;
    DECLARE i INT DEFAULT 0;
    DECLARE total_migrados INT DEFAULT 0;
    
    -- Cursor para calculos_salvos com produtos_individuais em JSON
    DECLARE calc_cursor CURSOR FOR 
        SELECT id, numero_di, estado_icms, 
               JSON_EXTRACT(resultados, '$.produtos_individuais') as produtos
        FROM calculos_salvos 
        WHERE JSON_EXTRACT(resultados, '$.produtos_individuais') IS NOT NULL
          AND JSON_LENGTH(JSON_EXTRACT(resultados, '$.produtos_individuais')) > 0
          -- Evitar duplicar dados já migrados
          AND id NOT IN (SELECT DISTINCT calculo_id FROM produtos_individuais_calculados);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            @p1 = MESSAGE_TEXT;
        INSERT INTO importacoes_log (numero_di, status, observacoes)
        VALUES ('MIGRACAO', 'ERRO', CONCAT('Erro na migração: ', @p1));
        ROLLBACK;
    END;
    
    -- Log início da migração
    INSERT INTO importacoes_log (numero_di, status, observacoes)
    VALUES ('MIGRACAO', 'INICIADO', 'Iniciando migração de produtos individuais de JSON para tabela estruturada');
    
    START TRANSACTION;
    
    OPEN calc_cursor;
    
    read_loop: LOOP
        FETCH calc_cursor INTO calc_id, di_numero, estado_icms, produtos_json;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET produtos_count = JSON_LENGTH(produtos_json);
        SET i = 0;
        
        -- Inserir cada produto individual
        WHILE i < produtos_count DO
            INSERT INTO produtos_individuais_calculados (
                calculo_id, numero_di, adicao_numero, produto_index,
                ncm, descricao, codigo_produto, unidade_medida,
                quantidade, valor_unitario_brl, valor_total_brl,
                ii_valor_item, ipi_valor_item, pis_valor_item, 
                cofins_valor_item, icms_valor_item, base_icms_item,
                aliquota_icms_aplicada, estado_calculo
            ) VALUES (
                calc_id,
                di_numero,
                COALESCE(JSON_UNQUOTE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].adicao_numero'))), '001'),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].produto_index')), i + 1),
                COALESCE(JSON_UNQUOTE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].ncm'))), '00000000'),
                COALESCE(JSON_UNQUOTE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].descricao'))), 'Produto sem descrição'),
                JSON_UNQUOTE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].codigo'))),
                COALESCE(JSON_UNQUOTE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].unidade_medida'))), 'UN'),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].quantidade')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].valor_unitario_brl')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].valor_total_brl')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].ii_item')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].ipi_item')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].pis_item')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].cofins_item')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].icms_item')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].base_icms_item')), 0),
                COALESCE(JSON_EXTRACT(produtos_json, CONCAT('$[', i, '].aliquota_icms_aplicada')), 0),
                estado_icms
            );
            
            SET i = i + 1;
            SET total_migrados = total_migrados + 1;
        END WHILE;
        
    END LOOP;
    
    CLOSE calc_cursor;
    
    COMMIT;
    
    -- Log sucesso da migração
    INSERT INTO importacoes_log (numero_di, status, observacoes)
    VALUES ('MIGRACAO', 'CONCLUIDO', 
           CONCAT('Migração concluída com sucesso: ', total_migrados, ' produtos individuais migrados'));
    
    SELECT total_migrados as produtos_migrados;
    
END//

DELIMITER ;

-- ===================================================================
-- FINALIZAÇÃO E LOG
-- ===================================================================

INSERT INTO importacoes_log (
    numero_di, 
    status, 
    observacoes
) VALUES (
    'SISTEMA', 
    'CONCLUIDO', 
    'Triggers e procedures para produtos_individuais_calculados criados com sucesso - 2025-09-13'
);

SELECT 'Triggers de sincronização criados com sucesso!' as triggers_status;
SELECT 'Procedures de migração disponíveis!' as procedures_status;