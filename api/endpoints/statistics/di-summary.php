<?php
/**
 * API Endpoint: Resumo Completo por DI com Estatísticas
 * 
 * GET /api/statistics/di-summary.php?numero_di=XXXXXXXXX
 * 
 * Parâmetros:
 * - numero_di: número da DI (obrigatório)
 * 
 * Retorna estatísticas detalhadas de uma DI específica incluindo:
 * - Resumo geral da DI
 * - Análise de tributos por adição
 * - Taxa de câmbio calculada dinamicamente
 * - Totais consolidados
 * - Distribuição de valores por NCM
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../services/database-service.php';

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

    // Validar parâmetro numero_di - OBRIGATÓRIO sem fallback
    if (empty($_GET['numero_di'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Parâmetro numero_di é obrigatório'
        ]);
        exit;
    }

    $numero_di = trim($_GET['numero_di']);
    
    // Validar formato do número da DI
    if (!preg_match('/^\d{8,12}$/', $numero_di)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato inválido para número da DI. Deve conter entre 8 e 12 dígitos.'
        ]);
        exit;
    }

    // Buscar dados da DI
    $service = new DatabaseService();
    $resultado = $service->buscarDI($numero_di);
    
    if (!$resultado['success']) {
        $status_code = (strpos($resultado['error'], 'não encontrada') !== false) ? 404 : 500;
        http_response_code($status_code);
        echo json_encode($resultado);
        exit;
    }

    $di = $resultado['data'];
    
    // VALIDAR DADOS OBRIGATÓRIOS - NUNCA usar fallbacks
    if (empty($di['adicoes'])) {
        throw new Exception("DI {$numero_di} não possui adições - obrigatório para estatísticas");
    }

    // Inicializar estrutura de estatísticas
    $summary = [
        'numero_di' => $numero_di,
        'importador' => [
            'nome' => $di['importador_nome'] ?? '',
            'cnpj' => $di['importador_cnpj'] ?? '',
            'uf' => $di['importador_uf'] ?? ''
        ],
        'data_registro' => $di['data_registro'],
        'totais_gerais' => [
            'total_adicoes' => 0,
            'total_mercadorias' => 0,
            'valor_total_reais' => 0,
            'valor_total_usd' => 0,
            'taxa_cambio_media' => 0,
            'peso_bruto_total' => 0,
            'peso_liquido_total' => 0
        ],
        'analise_tributos' => [
            'ii_total' => 0,
            'ipi_total' => 0,
            'pis_total' => 0,
            'cofins_total' => 0,
            'total_tributos_federais' => 0
        ],
        'distribuicao_por_ncm' => [],
        'resumo_por_adicao' => []
    ];

    $taxa_cambio_acumulada = 0;
    $count_taxas_validas = 0;

    // Processar cada adição
    foreach ($di['adicoes'] as $adicao) {
        // VALIDAR dados obrigatórios da adição - NUNCA usar fallbacks
        if (!isset($adicao['valor_reais'])) {
            throw new Exception("Adição {$adicao['numero_adicao']} não possui valor_reais - obrigatório para cálculo");
        }
        
        if (!isset($adicao['valor_moeda_negociacao'])) {
            throw new Exception("Adição {$adicao['numero_adicao']} não possui valor_moeda_negociacao - obrigatório para taxa de câmbio");
        }

        $valor_reais = floatval($adicao['valor_reais']);
        $valor_usd = floatval($adicao['valor_moeda_negociacao']);
        
        // CALCULAR taxa de câmbio DINAMICAMENTE - NUNCA extrair
        if ($valor_usd <= 0) {
            throw new Exception("Adição {$adicao['numero_adicao']} possui valor_moeda_negociacao inválido: {$valor_usd}");
        }
        
        $taxa_cambio_adicao = $valor_reais / $valor_usd;
        $taxa_cambio_acumulada += $taxa_cambio_adicao;
        $count_taxas_validas++;

        // Acumular totais gerais
        $summary['totais_gerais']['total_adicoes']++;
        $summary['totais_gerais']['valor_total_reais'] += $valor_reais;
        $summary['totais_gerais']['valor_total_usd'] += $valor_usd;
        $summary['totais_gerais']['peso_bruto_total'] += floatval($adicao['peso_liquido'] ?? 0);
        $summary['totais_gerais']['peso_liquido_total'] += floatval($adicao['quantidade_estatistica'] ?? 0);

        // Contar mercadorias
        $total_mercadorias_adicao = count($adicao['mercadorias'] ?? []);
        $summary['totais_gerais']['total_mercadorias'] += $total_mercadorias_adicao;

        // Processar tributos da adição
        $tributos_adicao = [
            'ii' => 0,
            'ipi' => 0,
            'pis' => 0,
            'cofins' => 0,
            'total' => 0
        ];

        if (!empty($adicao['tributos'])) {
            $tributos = $adicao['tributos'];
            
            // Extrair valores de tributos - VALIDAR se existem
            $ii_valor = isset($tributos['ii_valor_devido']) ? floatval($tributos['ii_valor_devido']) : 0;
            $ipi_valor = isset($tributos['ipi_valor_devido']) ? floatval($tributos['ipi_valor_devido']) : 0;
            $pis_valor = isset($tributos['pis_valor_devido']) ? floatval($tributos['pis_valor_devido']) : 0;
            $cofins_valor = isset($tributos['cofins_valor_devido']) ? floatval($tributos['cofins_valor_devido']) : 0;

            $tributos_adicao['ii'] = $ii_valor;
            $tributos_adicao['ipi'] = $ipi_valor;
            $tributos_adicao['pis'] = $pis_valor;
            $tributos_adicao['cofins'] = $cofins_valor;
            $tributos_adicao['total'] = $ii_valor + $ipi_valor + $pis_valor + $cofins_valor;

            // Acumular no total geral
            $summary['analise_tributos']['ii_total'] += $ii_valor;
            $summary['analise_tributos']['ipi_total'] += $ipi_valor;
            $summary['analise_tributos']['pis_total'] += $pis_valor;
            $summary['analise_tributos']['cofins_total'] += $cofins_valor;
        }

        // Distribuição por NCM
        $ncm = $adicao['ncm'] ?? 'SEM_NCM';
        if (!isset($summary['distribuicao_por_ncm'][$ncm])) {
            $summary['distribuicao_por_ncm'][$ncm] = [
                'ncm' => $ncm,
                'descricao' => $adicao['descricao_ncm'] ?? 'Não informado',
                'total_adicoes' => 0,
                'valor_total_reais' => 0,
                'valor_total_usd' => 0,
                'tributos_total' => 0
            ];
        }
        
        $summary['distribuicao_por_ncm'][$ncm]['total_adicoes']++;
        $summary['distribuicao_por_ncm'][$ncm]['valor_total_reais'] += $valor_reais;
        $summary['distribuicao_por_ncm'][$ncm]['valor_total_usd'] += $valor_usd;
        $summary['distribuicao_por_ncm'][$ncm]['tributos_total'] += $tributos_adicao['total'];

        // Resumo por adição
        $summary['resumo_por_adicao'][] = [
            'numero_adicao' => $adicao['numero_adicao'],
            'ncm' => $ncm,
            'descricao_ncm' => $adicao['descricao_ncm'] ?? 'Não informado',
            'valor_reais' => $valor_reais,
            'valor_usd' => $valor_usd,
            'taxa_cambio' => $taxa_cambio_adicao,
            'total_mercadorias' => $total_mercadorias_adicao,
            'tributos' => $tributos_adicao
        ];
    }

    // Calcular taxa de câmbio média
    if ($count_taxas_validas > 0) {
        $summary['totais_gerais']['taxa_cambio_media'] = $taxa_cambio_acumulada / $count_taxas_validas;
    } else {
        throw new Exception("Nenhuma taxa de câmbio válida encontrada para DI {$numero_di}");
    }

    // Finalizar totais de tributos
    $summary['analise_tributos']['total_tributos_federais'] = 
        $summary['analise_tributos']['ii_total'] +
        $summary['analise_tributos']['ipi_total'] +
        $summary['analise_tributos']['pis_total'] +
        $summary['analise_tributos']['cofins_total'];

    // Converter distribuição por NCM para array
    $summary['distribuicao_por_ncm'] = array_values($summary['distribuicao_por_ncm']);

    // Ordenar distribuição por valor
    usort($summary['distribuicao_por_ncm'], function($a, $b) {
        return $b['valor_total_reais'] <=> $a['valor_total_reais'];
    });

    // Formatar valores monetários para resposta
    $summary['totais_gerais']['valor_total_reais'] = number_format($summary['totais_gerais']['valor_total_reais'], 2, '.', '');
    $summary['totais_gerais']['valor_total_usd'] = number_format($summary['totais_gerais']['valor_total_usd'], 2, '.', '');
    $summary['totais_gerais']['taxa_cambio_media'] = number_format($summary['totais_gerais']['taxa_cambio_media'], 4, '.', '');
    $summary['totais_gerais']['peso_bruto_total'] = number_format($summary['totais_gerais']['peso_bruto_total'], 3, '.', '');
    $summary['totais_gerais']['peso_liquido_total'] = number_format($summary['totais_gerais']['peso_liquido_total'], 3, '.', '');

    // Formatar tributos
    foreach (['ii_total', 'ipi_total', 'pis_total', 'cofins_total', 'total_tributos_federais'] as $campo) {
        $summary['analise_tributos'][$campo] = number_format($summary['analise_tributos'][$campo], 2, '.', '');
    }

    // Formatar distribuição por NCM
    foreach ($summary['distribuicao_por_ncm'] as &$ncm_data) {
        $ncm_data['valor_total_reais'] = number_format($ncm_data['valor_total_reais'], 2, '.', '');
        $ncm_data['valor_total_usd'] = number_format($ncm_data['valor_total_usd'], 2, '.', '');
        $ncm_data['tributos_total'] = number_format($ncm_data['tributos_total'], 2, '.', '');
    }

    // Formatar resumo por adição
    foreach ($summary['resumo_por_adicao'] as &$adicao_data) {
        $adicao_data['valor_reais'] = number_format($adicao_data['valor_reais'], 2, '.', '');
        $adicao_data['valor_usd'] = number_format($adicao_data['valor_usd'], 2, '.', '');
        $adicao_data['taxa_cambio'] = number_format($adicao_data['taxa_cambio'], 4, '.', '');
        
        foreach (['ii', 'ipi', 'pis', 'cofins', 'total'] as $tributo) {
            $adicao_data['tributos'][$tributo] = number_format($adicao_data['tributos'][$tributo], 2, '.', '');
        }
    }

    // Resposta de sucesso
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $summary,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em di-summary.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor: ' . $e->getMessage(),
        'timestamp' => date('c')
    ]);
}
?>