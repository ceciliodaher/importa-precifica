<?php
/**
 * API Endpoint: Consultar Produtos da Memória
 * 
 * GET /api/consultar-produtos-memoria.php
 * 
 * Retorna produtos salvos na memória (tabela produtos_individuais_calculados)
 * Para uso com ProductMemoryManager
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Lidar com preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../services/database-service.php';

try {
    // Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Método não permitido. Use GET.'
        ]);
        exit;
    }

    $service = new DatabaseService();
    
    // Query to get products from memory table
    $query = "
        SELECT 
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
            created_at,
            dados_extras_json
            
        FROM produtos_individuais_calculados 
        WHERE sync_status = 'synced'
        ORDER BY created_at DESC, numero_di, adicao_numero, produto_index
        LIMIT 1000
    ";
    
    $db = $service->getConnection();
    $stmt = $db->prepare($query);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Transform database results to ProductMemoryManager format
    $products = [];
    
    foreach ($results as $row) {
        $product = [
            'id' => $row['product_id'] ?: 'prod_' . uniqid(),
            'di_number' => $row['numero_di'],
            'addition_number' => $row['adicao_numero'],
            'ncm' => $row['ncm'],
            'description' => $row['descricao'],
            'quantity' => floatval($row['quantidade']),
            'unit' => $row['unidade_medida'] ?: 'UN',
            
            // Base costs structure for ProductMemoryManager
            'base_costs' => [
                'cif_brl' => floatval($row['valor_total_brl']),
                'ii' => floatval($row['ii_valor_item']),
                'ipi' => floatval($row['ipi_valor_item']),
                'pis_import' => floatval($row['pis_valor_item']),
                'cofins_import' => floatval($row['cofins_valor_item']),
                'cofins_adicional' => floatval($row['cofins_adicional_value']),
                'icms_import' => floatval($row['icms_valor_item']),
                'icms_st' => floatval($row['icms_st_value']),
                'expenses' => [
                    'siscomex' => floatval($row['expenses_siscomex']),
                    'afrmm' => floatval($row['expenses_afrmm']),
                    'capatazia' => floatval($row['expenses_capatazia']),
                    'armazenagem' => floatval($row['expenses_armazenagem']),
                    'outras' => floatval($row['expenses_outras'])
                ],
                'total_base_cost' => floatval($row['expenses_total'])
            ],
            
            // Special cases
            'special_cases' => [
                'is_monofasico' => (bool) $row['is_monofasico'],
                'has_icms_st' => (bool) $row['has_icms_st'],
                'has_cofins_adicional' => (bool) $row['has_cofins_adicional'],
                'industrial_use' => (bool) $row['industrial_use']
            ],
            
            // Metadata
            'metadata' => [
                'exchange_rate' => floatval($row['taxa_cambio']),
                'import_date' => $row['import_date'],
                'state' => $row['estado_calculo'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['created_at']
            ]
        ];
        
        // Add extra JSON data if available
        if (!empty($row['dados_extras_json'])) {
            $extraData = json_decode($row['dados_extras_json'], true);
            if ($extraData) {
                $product = array_merge($product, $extraData);
            }
        }
        
        $products[] = $product;
    }
    
    // Response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $products,
        'count' => count($products),
        'message' => count($products) . ' produtos carregados da memória',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em consultar-produtos-memoria.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'message' => 'Falha ao consultar produtos da memória',
        'timestamp' => date('c')
    ]);
}
?>