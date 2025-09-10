<?php
/**
 * API Endpoint: Buscar Declaração de Importação Específica
 * 
 * GET /api/buscar-di.php?numero_di=XXXXXXXXX
 * 
 * Parâmetros:
 * - numero_di: número da DI (obrigatório)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

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

    // Validar parâmetro numero_di
    if (empty($_GET['numero_di'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Parâmetro numero_di é obrigatório'
        ]);
        exit;
    }

    $numero_di = trim($_GET['numero_di']);
    
    // Validar formato do número da DI (11 ou 12 dígitos)
    if (!preg_match('/^\d{11,12}$/', $numero_di)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato inválido para número da DI. Deve conter 11 ou 12 dígitos.'
        ]);
        exit;
    }

    // Executar busca
    $service = new DatabaseService();
    $resultado = $service->buscarDI($numero_di);
    
    if (!$resultado['success']) {
        $status_code = (strpos($resultado['error'], 'não encontrada') !== false) ? 404 : 500;
        http_response_code($status_code);
        echo json_encode($resultado);
        exit;
    }

    // Formatar dados da DI
    $di = $resultado['data'];
    
    // Formatar valores monetários e percentuais
    if (!empty($di['adicoes'])) {
        foreach ($di['adicoes'] as &$adicao) {
            $adicao['valor_reais'] = number_format($adicao['valor_reais'], 2, '.', '');
            $adicao['valor_moeda_negociacao'] = number_format($adicao['valor_moeda_negociacao'], 2, '.', '');
            $adicao['frete_valor_reais'] = number_format($adicao['frete_valor_reais'], 2, '.', '');
            $adicao['seguro_valor_reais'] = number_format($adicao['seguro_valor_reais'], 2, '.', '');
            
            // Formatar pesos
            $adicao['peso_liquido'] = number_format($adicao['peso_liquido'], 5, '.', '');
            $adicao['quantidade_estatistica'] = number_format($adicao['quantidade_estatistica'], 5, '.', '');
            
            // Formatar tributos se existirem
            if (!empty($adicao['tributos'])) {
                $tributos = &$adicao['tributos'];
                $campos_monetarios = [
                    'ii_base_calculo', 'ii_valor_calculado', 'ii_valor_devido', 'ii_valor_recolher',
                    'ipi_valor_devido', 'ipi_valor_recolher',
                    'pis_valor_devido', 'pis_valor_recolher',
                    'cofins_valor_devido', 'cofins_valor_recolher'
                ];
                
                foreach ($campos_monetarios as $campo) {
                    if (isset($tributos[$campo])) {
                        $tributos[$campo] = number_format($tributos[$campo], 2, '.', '');
                    }
                }
                
                $campos_percentuais = [
                    'ii_aliquota_ad_valorem', 'ipi_aliquota_ad_valorem',
                    'pis_aliquota_ad_valorem', 'cofins_aliquota_ad_valorem'
                ];
                
                foreach ($campos_percentuais as $campo) {
                    if (isset($tributos[$campo])) {
                        $tributos[$campo] = number_format($tributos[$campo], 2, '.', '');
                    }
                }
            }
            
            // Formatar mercadorias se existirem
            if (!empty($adicao['mercadorias'])) {
                foreach ($adicao['mercadorias'] as &$mercadoria) {
                    $mercadoria['quantidade'] = number_format($mercadoria['quantidade'], 5, '.', '');
                    $mercadoria['valor_unitario_usd'] = number_format($mercadoria['valor_unitario_usd'], 7, '.', '');
                    $mercadoria['valor_unitario_brl'] = number_format($mercadoria['valor_unitario_brl'], 2, '.', '');
                }
            }
        }
    }
    
    // Formatar datas
    if ($di['data_registro']) {
        $di['data_registro_formatada'] = date('d/m/Y', strtotime($di['data_registro']));
    }
    
    if ($di['carga_data_chegada']) {
        $di['carga_data_chegada_formatada'] = date('d/m/Y', strtotime($di['carga_data_chegada']));
    }
    
    // Formatar pesos da carga
    $di['carga_peso_bruto'] = number_format($di['carga_peso_bruto'], 5, '.', '');
    $di['carga_peso_liquido'] = number_format($di['carga_peso_liquido'], 5, '.', '');
    
    // Formatar valores de despesas, pagamentos e acréscimos
    if (!empty($di['despesas'])) {
        foreach ($di['despesas'] as &$despesa) {
            $despesa['valor'] = number_format($despesa['valor'], 2, '.', '');
        }
    }
    
    if (!empty($di['pagamentos'])) {
        foreach ($di['pagamentos'] as &$pagamento) {
            $pagamento['valor'] = number_format($pagamento['valor'], 2, '.', '');
        }
    }
    
    if (!empty($di['acrescimos'])) {
        foreach ($di['acrescimo'] as &$acrescimo) {
            $acrescimo['valor_reais'] = number_format($acrescimo['valor_reais'], 2, '.', '');
        }
    }
    
    if (!empty($di['icms'])) {
        foreach ($di['icms'] as &$icms_item) {
            $icms_item['valor_total_icms'] = number_format($icms_item['valor_total_icms'], 2, '.', '');
        }
    }
    
    // Calcular totais gerais
    $total_valor_adicoes = 0;
    $total_tributos = 0;
    
    if (!empty($di['adicoes'])) {
        foreach ($di['adicoes'] as $adicao) {
            $total_valor_adicoes += floatval(str_replace(',', '', $adicao['valor_reais']));
            
            if (!empty($adicao['tributos'])) {
                $tributos = $adicao['tributos'];
                $total_tributos += floatval(str_replace(',', '', $tributos['ii_valor_devido'] ?? 0));
                $total_tributos += floatval(str_replace(',', '', $tributos['ipi_valor_devido'] ?? 0));
                $total_tributos += floatval(str_replace(',', '', $tributos['pis_valor_devido'] ?? 0));
                $total_tributos += floatval(str_replace(',', '', $tributos['cofins_valor_devido'] ?? 0));
            }
        }
    }
    
    $di['resumo'] = [
        'total_adicoes' => count($di['adicoes'] ?? []),
        'total_mercadorias' => array_sum(array_map(function($a) { return count($a['mercadorias'] ?? []); }, $di['adicoes'] ?? [])),
        'valor_total_adicoes' => number_format($total_valor_adicoes, 2, '.', ''),
        'total_tributos_federais' => number_format($total_tributos, 2, '.', ''),
        'custo_total_estimado' => number_format($total_valor_adicoes + $total_tributos, 2, '.', '')
    ];

    // Resposta de sucesso
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $di,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em buscar-di.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'timestamp' => date('c')
    ]);
}
?>