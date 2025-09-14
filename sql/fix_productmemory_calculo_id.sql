-- ===================================================================
-- FIX: Tornar calculo_id nullable para ProductMemoryManager
-- Data: 2025-09-14
-- Problema: calculo_id é obrigatório mas ProductMemoryManager pode trabalhar independente
-- Solução: Permitir NULL em calculo_id para uso direto do ProductMemoryManager
-- ===================================================================

USE `importa_precificacao`;

-- Remover constraint FK temporariamente
ALTER TABLE `produtos_individuais_calculados` 
DROP FOREIGN KEY `produtos_individuais_calculados_ibfk_1`;

-- Tornar calculo_id nullable
ALTER TABLE `produtos_individuais_calculados` 
MODIFY COLUMN `calculo_id` INT NULL DEFAULT NULL;

-- Recriar FK com ON DELETE SET NULL para permitir valores nulos
ALTER TABLE `produtos_individuais_calculados` 
ADD CONSTRAINT `fk_calculo_id` 
FOREIGN KEY (`calculo_id`) 
REFERENCES `calculos_salvos`(`id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Verificar mudança
DESCRIBE produtos_individuais_calculados;

SELECT 'calculo_id agora permite NULL - ProductMemoryManager compatível!' as status;