<?php
/**
 * Endpoint para salvar DI processada do XML
 * Sistema Importa Precifica v2.0
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit();
}

// Incluir configurações
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/database-service.php';

try {
    // Obter dados do request
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['numero_di'])) {
        throw new Exception('Dados inválidos');
    }
    
    $db = DatabaseConfig::getInstance()->getConnection();
    $service = new DatabaseService($db);
    
    // Verificar se DI já existe
    $stmt = $db->prepare("SELECT id FROM declaracoes_importacao WHERE numero_di = ?");
    $stmt->execute([$input['numero_di']]);
    $exists = $stmt->fetch();
    
    if ($exists) {
        // Atualizar DI existente
        $stmt = $db->prepare("
            UPDATE declaracoes_importacao 
            SET data_registro = ?,
                urf_despacho_codigo = ?,
                urf_despacho_nome = ?,
                total_adicoes = ?,
                updated_at = NOW()
            WHERE numero_di = ?
        ");
        
        $stmt->execute([
            $input['data_registro'] ?? null,
            $input['urf_despacho_codigo'] ?? null,
            $input['urf_despacho_nome'] ?? null,
            $input['total_adicoes'] ?? count($input['adicoes'] ?? []),
            $input['numero_di']
        ]);
        
        $di_id = $exists['id'];
        $message = 'DI atualizada com sucesso';
        
    } else {
        // Inserir nova DI
        
        // 1. Inserir ou buscar importador
        $importador_id = null;
        if (isset($input['importador'])) {
            $stmt = $db->prepare("
                INSERT INTO importadores (cnpj, nome, endereco_uf)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    nome = VALUES(nome),
                    endereco_uf = VALUES(endereco_uf),
                    id = LAST_INSERT_ID(id)
            ");
            
            $stmt->execute([
                $input['importador']['cnpj'] ?? null,
                $input['importador']['nome'] ?? null,
                $input['importador']['endereco_uf'] ?? null
            ]);
            
            $importador_id = $db->lastInsertId();
        }
        
        // 2. Inserir DI
        $stmt = $db->prepare("
            INSERT INTO declaracoes_importacao (
                numero_di,
                data_registro,
                importador_id,
                urf_despacho_codigo,
                urf_despacho_nome,
                modalidade_despacho_codigo,
                modalidade_despacho_nome,
                total_adicoes,
                peso_bruto,
                peso_liquido,
                via_transporte_codigo,
                via_transporte_nome
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['numero_di'],
            $input['data_registro'] ?? null,
            $importador_id,
            $input['urf_despacho_codigo'] ?? null,
            $input['urf_despacho_nome'] ?? null,
            $input['modalidade_codigo'] ?? null,
            $input['modalidade_nome'] ?? null,
            count($input['adicoes'] ?? []),
            $input['carga']['peso_bruto'] ?? null,
            $input['carga']['peso_liquido'] ?? null,
            $input['carga']['via_transporte_codigo'] ?? null,
            $input['carga']['via_transporte_nome'] ?? null
        ]);
        
        $di_id = $db->lastInsertId();
        $message = 'DI salva com sucesso';
    }
    
    // 3. Inserir adições (limpar antigas primeiro se update)
    if ($exists) {
        $stmt = $db->prepare("DELETE FROM adicoes WHERE numero_di = ?");
        $stmt->execute([$input['numero_di']]);
    }
    
    if (isset($input['adicoes']) && is_array($input['adicoes'])) {
        $stmt = $db->prepare("
            INSERT INTO adicoes (
                numero_di,
                numero_adicao,
                ncm,
                descricao_ncm,
                moeda_negociacao_codigo,
                moeda_negociacao_nome,
                valor_moeda_negociacao,
                valor_reais,
                peso_liquido,
                quantidade_estatistica,
                unidade_estatistica,
                condicao_venda_incoterm,
                condicao_venda_local
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($input['adicoes'] as $adicao) {
            $stmt->execute([
                $input['numero_di'],
                $adicao['numero_adicao'] ?? null,
                $adicao['ncm'] ?? null,
                $adicao['descricao_ncm'] ?? null,
                $adicao['moeda_negociacao_codigo'] ?? null,
                $adicao['moeda_negociacao_nome'] ?? null,
                $adicao['valor_moeda_negociacao'] ?? null,
                $adicao['valor_reais'] ?? null,
                $adicao['peso_liquido'] ?? null,
                $adicao['quantidade_estatistica'] ?? null,
                $adicao['unidade_estatistica'] ?? null,
                $adicao['condicao_venda_incoterm'] ?? null,
                $adicao['condicao_venda_local'] ?? null
            ]);
            
            // Inserir produtos da adição se existirem
            if (isset($adicao['produtos']) && is_array($adicao['produtos'])) {
                $stmtProd = $db->prepare("
                    INSERT INTO mercadorias (
                        numero_adicao,
                        numero_sequencial_item,
                        descricao_mercadoria,
                        quantidade,
                        unidade_medida,
                        valor_unitario,
                        codigo_produto
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                
                foreach ($adicao['produtos'] as $produto) {
                    $stmtProd->execute([
                        $adicao['numero_adicao'] ?? null,
                        $produto['numero_sequencial_item'] ?? null,
                        $produto['descricao_mercadoria'] ?? null,
                        $produto['quantidade'] ?? null,
                        $produto['unidade_medida'] ?? null,
                        $produto['valor_unitario_brl'] ?? $produto['valor_unitario_usd'] ?? null,
                        $produto['codigo'] ?? null
                    ]);
                }
            }
        }
    }
    
    // Log da importação
    $stmt = $db->prepare("
        INSERT INTO importacoes_log (
            numero_di,
            status,
            total_adicoes,
            total_mercadorias,
            mensagem
        ) VALUES (?, 'success', ?, ?, ?)
    ");
    
    $total_mercadorias = 0;
    if (isset($input['adicoes'])) {
        foreach ($input['adicoes'] as $adicao) {
            $total_mercadorias += count($adicao['produtos'] ?? []);
        }
    }
    
    $stmt->execute([
        $input['numero_di'],
        count($input['adicoes'] ?? []),
        $total_mercadorias,
        $message
    ]);
    
    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'message' => $message,
        'di_id' => $di_id,
        'numero_di' => $input['numero_di']
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>