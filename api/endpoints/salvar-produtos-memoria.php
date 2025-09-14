<?php
/**
 * API Endpoint: Salvar Produtos na Memória
 * 
 * POST /api/salvar-produtos-memoria.php
 * 
 * Salva produtos na tabela produtos_individuais_calculados
 * Para uso com ProductMemoryManager database migration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Lidar com preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../services/database-service.php';

try {
    // Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Método não permitido. Use POST.'
        ]);
        exit;
    }

    // Ler dados JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'JSON inválido: ' . json_last_error_msg()
        ]);
        exit;
    }

    // Validar estrutura dos dados
    if (!isset($data['products']) || !is_array($data['products'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Campo "products" obrigatório e deve ser array'
        ]);
        exit;
    }

    $service = new DatabaseService();
    $products = $data['products'];
    $lastSyncTime = $data['lastSyncTime'] ?? date('c');
    
    $savedCount = 0;
    $updatedCount = 0;
    $errors = [];
    
    // Begin transaction for atomic operation
    $db = $service->getConnection();
    $db->beginTransaction();
    
    try {
        foreach ($products as $product) {
            // Validar campos obrigatórios
            $requiredFields = ['id', 'di_number'];
            foreach ($requiredFields as $field) {
                if (empty($product[$field])) {
                    throw new Exception("Campo obrigatório ausente: {$field}");
                }
            }
            
            // Check if product already exists
            $checkQuery = "
                SELECT id FROM produtos_individuais_calculados 
                WHERE product_id = :product_id
            ";
            
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindValue(':product_id', $product['id'], PDO::PARAM_STR);
            $checkStmt->execute();
            $existingId = $checkStmt->fetchColumn();
            
            if ($existingId) {
                // UPDATE existing product
                $updateQuery = "
                    UPDATE produtos_individuais_calculados SET
                        numero_di = :numero_di,
                        adicao_numero = :adicao_numero,
                        ncm = :ncm,
                        descricao = :descricao,
                        codigo_produto = :codigo_produto,
                        quantidade = :quantidade,
                        unidade_medida = :unidade_medida,
                        valor_unitario_brl = :valor_unitario_brl,
                        valor_total_brl = :valor_total_brl,
                        
                        -- Tax values
                        ii_valor_item = :ii_valor_item,
                        ipi_valor_item = :ipi_valor_item,
                        pis_valor_item = :pis_valor_item,
                        cofins_valor_item = :cofins_valor_item,
                        icms_valor_item = :icms_valor_item,
                        
                        -- Applied rates
                        ii_aliquota_aplicada = :ii_aliquota_aplicada,
                        ipi_aliquota_aplicada = :ipi_aliquota_aplicada,
                        pis_aliquota_aplicada = :pis_aliquota_aplicada,
                        cofins_aliquota_aplicada = :cofins_aliquota_aplicada,
                        aliquota_icms_aplicada = :aliquota_icms_aplicada,
                        
                        -- Expenses
                        expenses_siscomex = :expenses_siscomex,
                        expenses_afrmm = :expenses_afrmm,
                        expenses_capatazia = :expenses_capatazia,
                        expenses_armazenagem = :expenses_armazenagem,
                        expenses_outras = :expenses_outras,
                        expenses_total = :expenses_total,
                        
                        -- Special cases
                        is_monofasico = :is_monofasico,
                        has_icms_st = :has_icms_st,
                        has_cofins_adicional = :has_cofins_adicional,
                        industrial_use = :industrial_use,
                        icms_st_value = :icms_st_value,
                        cofins_adicional_value = :cofins_adicional_value,
                        
                        -- Metadata
                        taxa_cambio = :taxa_cambio,
                        import_date = :import_date,
                        estado_calculo = :estado_calculo,
                        dados_extras_json = :dados_extras_json,
                        sync_status = 'synced',
                        last_sync_at = NOW(),
                        updated_at = NOW()
                        
                    WHERE product_id = :product_id
                ";
                
                $stmt = $db->prepare($updateQuery);
                $updatedCount++;
            } else {
                // INSERT new product
                $insertQuery = "
                    INSERT INTO produtos_individuais_calculados (
                        product_id,
                        numero_di,
                        adicao_numero,
                        ncm,
                        descricao,
                        codigo_produto,
                        quantidade,
                        unidade_medida,
                        valor_unitario_brl,
                        valor_total_brl,
                        
                        -- Tax values
                        ii_valor_item,
                        ipi_valor_item,
                        pis_valor_item,
                        cofins_valor_item,
                        icms_valor_item,
                        
                        -- Applied rates
                        ii_aliquota_aplicada,
                        ipi_aliquota_aplicada,
                        pis_aliquota_aplicada,
                        cofins_aliquota_aplicada,
                        aliquota_icms_aplicada,
                        
                        -- Expenses
                        expenses_siscomex,
                        expenses_afrmm,
                        expenses_capatazia,
                        expenses_armazenagem,
                        expenses_outras,
                        expenses_total,
                        
                        -- Special cases
                        is_monofasico,
                        has_icms_st,
                        has_cofins_adicional,
                        industrial_use,
                        icms_st_value,
                        cofins_adicional_value,
                        
                        -- Metadata
                        taxa_cambio,
                        import_date,
                        estado_calculo,
                        dados_extras_json,
                        sync_status,
                        last_sync_at,
                        created_at,
                        updated_at
                        
                    ) VALUES (
                        :product_id,
                        :numero_di,
                        :adicao_numero,
                        :ncm,
                        :descricao,
                        :codigo_produto,
                        :quantidade,
                        :unidade_medida,
                        :valor_unitario_brl,
                        :valor_total_brl,
                        
                        -- Tax values
                        :ii_valor_item,
                        :ipi_valor_item,
                        :pis_valor_item,
                        :cofins_valor_item,
                        :icms_valor_item,
                        
                        -- Applied rates
                        :ii_aliquota_aplicada,
                        :ipi_aliquota_aplicada,
                        :pis_aliquota_aplicada,
                        :cofins_aliquota_aplicada,
                        :aliquota_icms_aplicada,
                        
                        -- Expenses
                        :expenses_siscomex,
                        :expenses_afrmm,
                        :expenses_capatazia,
                        :expenses_armazenagem,
                        :expenses_outras,
                        :expenses_total,
                        
                        -- Special cases
                        :is_monofasico,
                        :has_icms_st,
                        :has_cofins_adicional,
                        :industrial_use,
                        :icms_st_value,
                        :cofins_adicional_value,
                        
                        -- Metadata
                        :taxa_cambio,
                        :import_date,
                        :estado_calculo,
                        :dados_extras_json,
                        'synced',
                        NOW(),
                        NOW(),
                        NOW()
                    )
                ";
                
                $stmt = $db->prepare($insertQuery);
                $savedCount++;
            }
            
            // Bind common parameters
            $stmt->bindValue(':product_id', $product['id'], PDO::PARAM_STR);
            $stmt->bindValue(':numero_di', $product['di_number'], PDO::PARAM_STR);
            $stmt->bindValue(':adicao_numero', $product['addition_number'] ?? '001', PDO::PARAM_STR);
            $stmt->bindValue(':ncm', $product['ncm'] ?? '', PDO::PARAM_STR);
            $stmt->bindValue(':descricao', $product['description'] ?? '', PDO::PARAM_STR);
            $stmt->bindValue(':codigo_produto', $product['codigo'] ?? '', PDO::PARAM_STR);
            $stmt->bindValue(':quantidade', $product['quantity'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':unidade_medida', $product['unit'] ?? 'UN', PDO::PARAM_STR);
            
            // Base costs
            $baseCosts = $product['base_costs'] ?? [];
            $stmt->bindValue(':valor_unitario_brl', ($baseCosts['cif_brl'] ?? 0) / max(1, $product['quantity'] ?? 1), PDO::PARAM_STR);
            $stmt->bindValue(':valor_total_brl', $baseCosts['cif_brl'] ?? 0, PDO::PARAM_STR);
            
            // Tax values
            $stmt->bindValue(':ii_valor_item', $baseCosts['ii'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':ipi_valor_item', $baseCosts['ipi'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':pis_valor_item', $baseCosts['pis_import'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':cofins_valor_item', $baseCosts['cofins_import'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':icms_valor_item', $baseCosts['icms_import'] ?? 0, PDO::PARAM_STR);
            
            // Applied rates (default to 0 if not available)
            $stmt->bindValue(':ii_aliquota_aplicada', 0, PDO::PARAM_STR);
            $stmt->bindValue(':ipi_aliquota_aplicada', 0, PDO::PARAM_STR);
            $stmt->bindValue(':pis_aliquota_aplicada', 0, PDO::PARAM_STR);
            $stmt->bindValue(':cofins_aliquota_aplicada', 0, PDO::PARAM_STR);
            $stmt->bindValue(':aliquota_icms_aplicada', 0, PDO::PARAM_STR);
            
            // Expenses
            $expenses = $baseCosts['expenses'] ?? [];
            $stmt->bindValue(':expenses_siscomex', $expenses['siscomex'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':expenses_afrmm', $expenses['afrmm'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':expenses_capatazia', $expenses['capatazia'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':expenses_armazenagem', $expenses['armazenagem'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':expenses_outras', $expenses['outras'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':expenses_total', $baseCosts['total_base_cost'] ?? 0, PDO::PARAM_STR);
            
            // Special cases
            $specialCases = $product['special_cases'] ?? [];
            $stmt->bindValue(':is_monofasico', $specialCases['is_monofasico'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':has_icms_st', $specialCases['has_icms_st'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':has_cofins_adicional', $specialCases['has_cofins_adicional'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':industrial_use', $specialCases['industrial_use'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':icms_st_value', $baseCosts['icms_st'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':cofins_adicional_value', $baseCosts['cofins_adicional'] ?? 0, PDO::PARAM_STR);
            
            // Metadata
            $metadata = $product['metadata'] ?? [];
            $stmt->bindValue(':taxa_cambio', $metadata['exchange_rate'] ?? 5.5, PDO::PARAM_STR);
            $stmt->bindValue(':import_date', $metadata['import_date'] ?? date('Y-m-d'), PDO::PARAM_STR);
            $stmt->bindValue(':estado_calculo', $metadata['state'] ?? 'SP', PDO::PARAM_STR);
            
            // Store complete product as JSON for flexibility
            $stmt->bindValue(':dados_extras_json', json_encode($product, JSON_UNESCAPED_UNICODE), PDO::PARAM_STR);
            
            // Execute statement
            $stmt->execute();
        }
        
        // Commit transaction
        $db->commit();
        
        // Success response
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Produtos salvos com sucesso',
            'data' => [
                'total_processed' => count($products),
                'saved_new' => $savedCount,
                'updated_existing' => $updatedCount,
                'sync_time' => $lastSyncTime,
                'errors' => $errors
            ],
            'timestamp' => date('c')
        ], JSON_PRETTY_PRINT);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Erro em salvar-produtos-memoria.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'message' => 'Falha ao salvar produtos na memória',
        'details' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
}
?>