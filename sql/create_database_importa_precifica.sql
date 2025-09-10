-- ===================================================================
-- Script de Criação do Banco de Dados - Sistema Importa Precifica
-- Baseado na estrutura XML DI brasileira e nomenclatura.md
-- ===================================================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS `importa_precificacao`
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `importa_precificacao`;

-- ===================================================================
-- TABELAS PRINCIPAIS DE DADOS DI
-- ===================================================================

-- Tabela de Importadores
CREATE TABLE `importadores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `cnpj` VARCHAR(14) UNIQUE NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `endereco_logradouro` VARCHAR(255),
    `endereco_numero` VARCHAR(20),
    `endereco_complemento` VARCHAR(100),
    `endereco_bairro` VARCHAR(100),
    `endereco_cidade` VARCHAR(100),
    `endereco_municipio` VARCHAR(100),
    `endereco_uf` CHAR(2) NOT NULL,
    `endereco_cep` VARCHAR(9),
    `representante_nome` VARCHAR(255),
    `representante_cpf` VARCHAR(11),
    `telefone` VARCHAR(20),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_cnpj` (`cnpj`),
    INDEX `idx_uf` (`endereco_uf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Fornecedores
CREATE TABLE `fornecedores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(255) NOT NULL,
    `cidade` VARCHAR(100),
    `estado` VARCHAR(100),
    `pais` VARCHAR(100),
    `logradouro` VARCHAR(255),
    `numero` VARCHAR(20),
    `complemento` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Fabricantes
CREATE TABLE `fabricantes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(255) NOT NULL,
    `cidade` VARCHAR(100),
    `estado` VARCHAR(100),
    `pais` VARCHAR(100),
    `logradouro` VARCHAR(255),
    `numero` VARCHAR(20),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela principal de Declarações de Importação
CREATE TABLE `declaracoes_importacao` (
    `numero_di` VARCHAR(12) PRIMARY KEY,
    `data_registro` DATE NOT NULL,
    `importador_id` INT NOT NULL,
    `urf_despacho_codigo` VARCHAR(10),
    `urf_despacho_nome` VARCHAR(255),
    `modalidade_codigo` VARCHAR(10),
    `modalidade_nome` VARCHAR(255),
    `situacao_entrega` VARCHAR(100),
    `total_adicoes` INT DEFAULT 0,
    -- Dados da Carga
    `carga_peso_bruto` DECIMAL(15,5) DEFAULT 0,
    `carga_peso_liquido` DECIMAL(15,5) DEFAULT 0,
    `carga_pais_procedencia_codigo` VARCHAR(3),
    `carga_pais_procedencia_nome` VARCHAR(100),
    `carga_urf_entrada_codigo` VARCHAR(10),
    `carga_urf_entrada_nome` VARCHAR(255),
    `carga_data_chegada` DATE,
    `carga_via_transporte_codigo` VARCHAR(3),
    `carga_via_transporte_nome` VARCHAR(100),
    `carga_nome_veiculo` VARCHAR(255),
    `carga_nome_transportador` VARCHAR(255),
    -- Controle
    `taxa_cambio_calculada` DECIMAL(8,4),
    `xml_original` LONGTEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`importador_id`) REFERENCES `importadores`(`id`),
    INDEX `idx_data_registro` (`data_registro`),
    INDEX `idx_importador` (`importador_id`),
    INDEX `idx_pais_procedencia` (`carga_pais_procedencia_codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Adições
CREATE TABLE `adicoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_di` VARCHAR(12) NOT NULL,
    `numero_adicao` VARCHAR(3) NOT NULL,
    -- Dados da Mercadoria
    `ncm` VARCHAR(8) NOT NULL,
    `descricao_ncm` TEXT,
    `peso_liquido` DECIMAL(15,5) DEFAULT 0,
    `quantidade_estatistica` DECIMAL(15,5) DEFAULT 0,
    `unidade_estatistica` VARCHAR(50),
    `aplicacao_mercadoria` VARCHAR(50),
    `condicao_mercadoria` VARCHAR(50),
    -- Condições de Venda
    `condicao_venda_incoterm` VARCHAR(10),
    `condicao_venda_local` VARCHAR(255),
    `moeda_negociacao_codigo` VARCHAR(3),
    `moeda_negociacao_nome` VARCHAR(100),
    `valor_moeda_negociacao` DECIMAL(15,2) DEFAULT 0,
    `valor_reais` DECIMAL(15,2) DEFAULT 0,
    -- Frete e Seguro
    `frete_valor_moeda_negociada` DECIMAL(15,2) DEFAULT 0,
    `frete_valor_reais` DECIMAL(15,2) DEFAULT 0,
    `seguro_valor_moeda_negociada` DECIMAL(15,2) DEFAULT 0,
    `seguro_valor_reais` DECIMAL(15,2) DEFAULT 0,
    -- Relacionamentos
    `fornecedor_id` INT,
    `fabricante_id` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_adicao` (`numero_di`, `numero_adicao`),
    FOREIGN KEY (`numero_di`) REFERENCES `declaracoes_importacao`(`numero_di`) ON DELETE CASCADE,
    FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`),
    FOREIGN KEY (`fabricante_id`) REFERENCES `fabricantes`(`id`),
    INDEX `idx_ncm` (`ncm`),
    INDEX `idx_numero_adicao` (`numero_adicao`),
    INDEX `idx_valor_reais` (`valor_reais`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Mercadorias (produtos individuais)
CREATE TABLE `mercadorias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `adicao_id` INT NOT NULL,
    `numero_sequencial_item` VARCHAR(3) NOT NULL,
    `descricao_mercadoria` TEXT NOT NULL,
    `quantidade` DECIMAL(15,5) DEFAULT 0,
    `unidade_medida` VARCHAR(50),
    `valor_unitario_usd` DECIMAL(18,7) DEFAULT 0,
    `valor_unitario_brl` DECIMAL(15,2) DEFAULT 0,
    `codigo_produto` VARCHAR(50),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`adicao_id`) REFERENCES `adicoes`(`id`) ON DELETE CASCADE,
    INDEX `idx_adicao` (`adicao_id`),
    INDEX `idx_codigo_produto` (`codigo_produto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- TABELAS DE TRIBUTOS
-- ===================================================================

-- Tabela de Tributos por Adição
CREATE TABLE `tributos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `adicao_id` INT NOT NULL,
    -- Imposto de Importação (II)
    `ii_regime_codigo` VARCHAR(2),
    `ii_regime_nome` VARCHAR(100),
    `ii_aliquota_ad_valorem` DECIMAL(7,2) DEFAULT 0,
    `ii_base_calculo` DECIMAL(15,2) DEFAULT 0,
    `ii_valor_calculado` DECIMAL(15,2) DEFAULT 0,
    `ii_valor_devido` DECIMAL(15,2) DEFAULT 0,
    `ii_valor_recolher` DECIMAL(15,2) DEFAULT 0,
    -- IPI
    `ipi_regime_codigo` VARCHAR(2),
    `ipi_regime_nome` VARCHAR(100),
    `ipi_aliquota_ad_valorem` DECIMAL(7,2) DEFAULT 0,
    `ipi_valor_devido` DECIMAL(15,2) DEFAULT 0,
    `ipi_valor_recolher` DECIMAL(15,2) DEFAULT 0,
    -- PIS/PASEP
    `pis_regime_codigo` VARCHAR(2),
    `pis_regime_nome` VARCHAR(100),
    `pis_aliquota_ad_valorem` DECIMAL(7,2) DEFAULT 0,
    `pis_valor_devido` DECIMAL(15,2) DEFAULT 0,
    `pis_valor_recolher` DECIMAL(15,2) DEFAULT 0,
    -- COFINS
    `cofins_aliquota_ad_valorem` DECIMAL(7,2) DEFAULT 0,
    `cofins_valor_devido` DECIMAL(15,2) DEFAULT 0,
    `cofins_valor_recolher` DECIMAL(15,2) DEFAULT 0,
    -- Outros Tributos
    `cide_valor_devido` DECIMAL(15,2) DEFAULT 0,
    `cide_valor_recolher` DECIMAL(15,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`adicao_id`) REFERENCES `adicoes`(`id`) ON DELETE CASCADE,
    INDEX `idx_adicao` (`adicao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de ICMS por DI
CREATE TABLE `icms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_di` VARCHAR(12) NOT NULL,
    `numero_sequencial` VARCHAR(3),
    `uf_icms` CHAR(2) NOT NULL,
    `tipo_recolhimento_codigo` VARCHAR(2),
    `tipo_recolhimento_nome` VARCHAR(100),
    `valor_total_icms` DECIMAL(15,2) DEFAULT 0,
    `data_registro` DATE,
    `hora_registro` TIME,
    `cpf_responsavel` VARCHAR(11),
    `banco_codigo` VARCHAR(3),
    `agencia_codigo` VARCHAR(5),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`numero_di`) REFERENCES `declaracoes_importacao`(`numero_di`) ON DELETE CASCADE,
    INDEX `idx_numero_di` (`numero_di`),
    INDEX `idx_uf` (`uf_icms`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- TABELAS DE DESPESAS E PAGAMENTOS
-- ===================================================================

-- Tabela de Despesas Aduaneiras
CREATE TABLE `despesas_aduaneiras` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_di` VARCHAR(12) NOT NULL,
    `tipo_despesa` ENUM('SISCOMEX', 'AFRMM', 'CAPATAZIA', 'TAXA_CE', 'ANTI_DUMPING', 'MEDIDA_COMPENSATORIA', 'OUTROS') NOT NULL,
    `codigo_receita` VARCHAR(10),
    `descricao` VARCHAR(255),
    `valor` DECIMAL(15,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`numero_di`) REFERENCES `declaracoes_importacao`(`numero_di`) ON DELETE CASCADE,
    INDEX `idx_numero_di` (`numero_di`),
    INDEX `idx_tipo_despesa` (`tipo_despesa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Pagamentos
CREATE TABLE `pagamentos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_di` VARCHAR(12) NOT NULL,
    `codigo_receita` VARCHAR(10) NOT NULL,
    `descricao_receita` VARCHAR(255),
    `valor` DECIMAL(15,2) DEFAULT 0,
    `data_pagamento` DATE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`numero_di`) REFERENCES `declaracoes_importacao`(`numero_di`) ON DELETE CASCADE,
    INDEX `idx_numero_di` (`numero_di`),
    INDEX `idx_codigo_receita` (`codigo_receita`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Acréscimos
CREATE TABLE `acrescimos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_di` VARCHAR(12) NOT NULL,
    `codigo_acrescimo` VARCHAR(10) NOT NULL,
    `descricao_acrescimo` VARCHAR(255),
    `valor_reais` DECIMAL(15,2) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`numero_di`) REFERENCES `declaracoes_importacao`(`numero_di`) ON DELETE CASCADE,
    INDEX `idx_numero_di` (`numero_di`),
    INDEX `idx_codigo_acrescimo` (`codigo_acrescimo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- TABELAS DE CONTROLE E AUDITORIA
-- ===================================================================

-- Tabela de Log de Importações
CREATE TABLE `importacoes_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_di` VARCHAR(12),
    `arquivo_xml` VARCHAR(255),
    `status` ENUM('INICIADO', 'PROCESSANDO', 'CONCLUIDO', 'ERRO') DEFAULT 'INICIADO',
    `total_adicoes` INT DEFAULT 0,
    `total_mercadorias` INT DEFAULT 0,
    `tempo_processamento` INT, -- em segundos
    `erros_encontrados` TEXT,
    `observacoes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_numero_di` (`numero_di`),
    INDEX `idx_status` (`status`),
    INDEX `idx_data` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Cálculos Salvos
CREATE TABLE `calculos_salvos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `numero_di` VARCHAR(12) NOT NULL,
    `estado_icms` CHAR(2) NOT NULL,
    `tipo_calculo` VARCHAR(50), -- 'CONFORMIDADE', 'PRECIFICACAO', etc
    `dados_entrada` JSON,
    `dados_calculo` JSON,
    `resultados` JSON,
    `hash_dados` VARCHAR(64), -- MD5 dos dados para detectar mudanças
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`numero_di`) REFERENCES `declaracoes_importacao`(`numero_di`) ON DELETE CASCADE,
    INDEX `idx_numero_di` (`numero_di`),
    INDEX `idx_estado_icms` (`estado_icms`),
    INDEX `idx_tipo_calculo` (`tipo_calculo`),
    INDEX `idx_hash` (`hash_dados`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- VIEWS PARA CONSULTAS OTIMIZADAS
-- ===================================================================

-- View para listar DIs com resumo
CREATE VIEW `view_dis_resumo` AS
SELECT 
    di.numero_di,
    di.data_registro,
    imp.nome as importador_nome,
    imp.endereco_uf as importador_uf,
    di.total_adicoes,
    di.carga_peso_bruto,
    di.carga_peso_liquido,
    di.carga_pais_procedencia_nome,
    COALESCE(SUM(a.valor_reais), 0) as valor_total_reais,
    di.created_at
FROM declaracoes_importacao di
LEFT JOIN importadores imp ON di.importador_id = imp.id
LEFT JOIN adicoes a ON di.numero_di = a.numero_di
GROUP BY di.numero_di, di.data_registro, imp.nome, imp.endereco_uf, 
         di.total_adicoes, di.carga_peso_bruto, di.carga_peso_liquido, 
         di.carga_pais_procedencia_nome, di.created_at;

-- View para relatório de tributos por DI
CREATE VIEW `view_tributos_resumo` AS
SELECT 
    a.numero_di,
    a.numero_adicao,
    a.ncm,
    a.descricao_ncm,
    a.valor_reais,
    t.ii_valor_devido,
    t.ipi_valor_devido,
    t.pis_valor_devido,
    t.cofins_valor_devido,
    (t.ii_valor_devido + t.ipi_valor_devido + t.pis_valor_devido + t.cofins_valor_devido) as total_tributos
FROM adicoes a
LEFT JOIN tributos t ON a.id = t.adicao_id
WHERE a.valor_reais > 0;

-- View para produtos individuais com dados da adição
CREATE VIEW `view_produtos_completo` AS
SELECT 
    m.id,
    m.numero_sequencial_item,
    m.descricao_mercadoria,
    m.quantidade,
    m.unidade_medida,
    m.valor_unitario_brl,
    a.numero_di,
    a.numero_adicao,
    a.ncm,
    a.descricao_ncm,
    imp.endereco_uf as importador_uf
FROM mercadorias m
JOIN adicoes a ON m.adicao_id = a.id
JOIN declaracoes_importacao di ON a.numero_di = di.numero_di
JOIN importadores imp ON di.importador_id = imp.id;

-- ===================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ===================================================================

-- Índices compostos para consultas frequentes
CREATE INDEX `idx_adicoes_di_ncm` ON `adicoes` (`numero_di`, `ncm`);
CREATE INDEX `idx_tributos_valores` ON `tributos` (`ii_valor_devido`, `ipi_valor_devido`);
CREATE INDEX `idx_mercadorias_valor` ON `mercadorias` (`valor_unitario_brl`);
CREATE INDEX `idx_calculos_di_estado` ON `calculos_salvos` (`numero_di`, `estado_icms`);

-- ===================================================================
-- TRIGGERS PARA AUDITORIA E CONTROLE
-- ===================================================================

-- Trigger para atualizar total_adicoes na DI
DELIMITER //
CREATE TRIGGER `tr_atualizar_total_adicoes_insert` 
AFTER INSERT ON `adicoes` 
FOR EACH ROW
BEGIN
    UPDATE declaracoes_importacao 
    SET total_adicoes = (
        SELECT COUNT(*) 
        FROM adicoes 
        WHERE numero_di = NEW.numero_di
    )
    WHERE numero_di = NEW.numero_di;
END//

CREATE TRIGGER `tr_atualizar_total_adicoes_delete` 
AFTER DELETE ON `adicoes` 
FOR EACH ROW
BEGIN
    UPDATE declaracoes_importacao 
    SET total_adicoes = (
        SELECT COUNT(*) 
        FROM adicoes 
        WHERE numero_di = OLD.numero_di
    )
    WHERE numero_di = OLD.numero_di;
END//
DELIMITER ;

-- ===================================================================
-- DADOS INICIAIS E CONFIGURAÇÕES
-- ===================================================================

-- Inserir códigos de receita padrão para mapeamento
INSERT INTO `despesas_aduaneiras` (`numero_di`, `tipo_despesa`, `codigo_receita`, `descricao`, `valor`) VALUES
('TEMPLATE', 'SISCOMEX', '7811', 'Taxa SISCOMEX', 0),
('TEMPLATE', 'ANTI_DUMPING', '5529', 'Direito Anti-Dumping', 0),
('TEMPLATE', 'MEDIDA_COMPENSATORIA', '5622', 'Direito Compensatório', 0),
('TEMPLATE', 'CAPATAZIA', '16', 'Capatazia', 0),
('TEMPLATE', 'TAXA_CE', '17', 'Taxa CE (Conhecimento de Embarque)', 0);

-- Remover registros template após uso
-- DELETE FROM despesas_aduaneiras WHERE numero_di = 'TEMPLATE';

-- ===================================================================
-- COMENTÁRIOS FINAIS
-- ===================================================================

/*
Este script cria a estrutura completa do banco de dados para o Sistema Importa Precifica.

Principais características:
- Suporte completo à estrutura XML DI brasileira
- Relacionamentos otimizados com integridade referencial
- Índices para performance em consultas frequentes
- Views para relatórios e consultas complexas
- Sistema de auditoria com logs de importação
- Triggers para manter consistência de dados
- Suporte a cálculos salvos com versionamento
- Estrutura flexível para diferentes tipos de XML DI

Para usar este script:
1. Execute em um servidor MySQL 8.0+
2. Configurar usuário com privilégios adequados
3. Ajustar configurações de charset se necessário
4. Verificar espaço em disco para arquivos XML grandes

Tabelas principais: 11
Views: 3  
Triggers: 2
Índices adicionais: 4
*/