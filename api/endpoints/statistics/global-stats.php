<?php
/**
 * API Endpoint: Estatísticas Globais do Banco
 * 
 * GET /api/statistics/global-stats.php?[periodo=30d&detalhamento=completo]
 * 
 * Parâmetros:
 * - periodo: período de análise [7d|30d|90d|1y|all] (opcional, padrão: 30d)
 * - detalhamento: nível de detalhamento [basico|completo] (opcional, padrão: completo)
 * 
 * Retorna estatísticas globais do sistema incluindo:
 * - Resumo geral (DIs, adições, importadores, etc.)
 * - Análise temporal de importações
 * - Ranking por estado, NCM e importadores
 * - Análise de tributos consolidada
 * - Indicadores de performance do sistema
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

    // Parâmetros opcionais com validação
    $periodo = $_GET['periodo'] ?? '30d';
    $detalhamento = $_GET['detalhamento'] ?? 'completo';
    
    // Validar parâmetros
    $periodos_validos = ['7d', '30d', '90d', '1y', 'all'];
    if (!in_array($periodo, $periodos_validos)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'período deve ser um de: ' . implode(', ', $periodos_validos)
        ]);
        exit;
    }

    $detalhamentos_validos = ['basico', 'completo'];
    if (!in_array($detalhamento, $detalhamentos_validos)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'detalhamento deve ser "basico" ou "completo"'
        ]);
        exit;
    }

    $service = new DatabaseService();
    
    // Calcular filtro temporal
    $where_temporal = '';
    $params_temporal = [];
    
    if ($periodo !== 'all') {
        switch ($periodo) {
            case '7d':
                $where_temporal = 'WHERE di.data_registro >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                break;
            case '30d':
                $where_temporal = 'WHERE di.data_registro >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                break;
            case '90d':
                $where_temporal = 'WHERE di.data_registro >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
                break;
            case '1y':
                $where_temporal = 'WHERE di.data_registro >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
                break;
        }
    }

    // Obter conexão do banco
    $db = DatabaseConfig::getInstance()->getConnection();

    // Inicializar estrutura de estatísticas
    $stats = [
        'parametros' => [
            'periodo' => $periodo,
            'detalhamento' => $detalhamento,
            'data_consulta' => date('c')
        ],
        'resumo_geral' => [
            'total_dis' => 0,
            'total_adicoes' => 0,
            'total_mercadorias' => 0,
            'total_importadores' => 0,
            'valor_total_importado_reais' => 0,
            'valor_total_importado_usd' => 0,
            'taxa_cambio_media' => 0,
            'total_tributos_federais' => 0,
            'carga_tributaria_media' => 0
        ],
        'distribuicao_temporal' => [],
        'ranking_estados' => [],
        'ranking_ncms' => [],
        'ranking_importadores' => []
    ];

    // Incluir análises detalhadas se solicitado
    if ($detalhamento === 'completo') {
        $stats['analise_tributos_consolidada'] = [];
        $stats['indicadores_sistema'] = [];
        $stats['tendencias_temporais'] = [];
    }

    // === RESUMO GERAL ===
    
    // Total de DIs
    $sql = "SELECT COUNT(*) as total FROM declaracoes_importacao di $where_temporal";
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['resumo_geral']['total_dis'] = $stmt->fetch()['total'];

    if ($stats['resumo_geral']['total_dis'] == 0) {
        // Retornar estatísticas vazias se não há dados
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $stats,
            'message' => 'Nenhuma DI encontrada para o período especificado',
            'timestamp' => date('c')
        ]);
        exit;
    }

    // Total de adições
    $sql = "SELECT COUNT(*) as total FROM adicoes a 
            JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
            $where_temporal";
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['resumo_geral']['total_adicoes'] = $stmt->fetch()['total'];

    // Total de mercadorias
    $sql = "SELECT COUNT(*) as total FROM mercadorias m 
            JOIN adicoes a ON m.adicao_id = a.id
            JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
            $where_temporal";
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['resumo_geral']['total_mercadorias'] = $stmt->fetch()['total'];

    // Total de importadores únicos
    $sql = "SELECT COUNT(DISTINCT di.importador_id) as total 
            FROM declaracoes_importacao di $where_temporal";
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['resumo_geral']['total_importadores'] = $stmt->fetch()['total'];

    // Valores totais e taxa de câmbio média
    $sql = "SELECT 
                COALESCE(SUM(a.valor_reais), 0) as total_reais,
                COALESCE(SUM(a.valor_moeda_negociacao), 0) as total_usd,
                COUNT(*) as count_adicoes
            FROM adicoes a 
            JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
            $where_temporal
            AND a.valor_reais > 0 AND a.valor_moeda_negociacao > 0";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $valores = $stmt->fetch();
    
    $stats['resumo_geral']['valor_total_importado_reais'] = floatval($valores['total_reais']);
    $stats['resumo_geral']['valor_total_importado_usd'] = floatval($valores['total_usd']);
    
    // Calcular taxa de câmbio média DINAMICAMENTE
    if ($valores['total_usd'] > 0) {
        $stats['resumo_geral']['taxa_cambio_media'] = $valores['total_reais'] / $valores['total_usd'];
    } else {
        throw new Exception("Não foi possível calcular taxa de câmbio - valores USD inválidos");
    }

    // Total de tributos federais
    $sql = "SELECT 
                COALESCE(SUM(t.ii_valor_devido), 0) + 
                COALESCE(SUM(t.ipi_valor_devido), 0) + 
                COALESCE(SUM(t.pis_valor_devido), 0) + 
                COALESCE(SUM(t.cofins_valor_devido), 0) as total_tributos
            FROM tributos t 
            JOIN adicoes a ON t.adicao_id = a.id
            JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
            $where_temporal";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['resumo_geral']['total_tributos_federais'] = floatval($stmt->fetch()['total_tributos']);

    // Carga tributária média
    if ($stats['resumo_geral']['valor_total_importado_reais'] > 0) {
        $stats['resumo_geral']['carga_tributaria_media'] = 
            ($stats['resumo_geral']['total_tributos_federais'] / $stats['resumo_geral']['valor_total_importado_reais']) * 100;
    }

    // === DISTRIBUIÇÃO TEMPORAL ===
    
    $sql_temporal = "SELECT 
                        DATE_FORMAT(di.data_registro, '%Y-%m') as mes,
                        COUNT(*) as total_dis,
                        COALESCE(SUM(a.valor_reais), 0) as valor_total,
                        COALESCE(AVG(a.valor_reais / NULLIF(a.valor_moeda_negociacao, 0)), 0) as taxa_cambio_media
                     FROM declaracoes_importacao di
                     LEFT JOIN adicoes a ON di.numero_di = a.numero_di
                     $where_temporal
                     GROUP BY DATE_FORMAT(di.data_registro, '%Y-%m')
                     ORDER BY mes DESC
                     LIMIT 12";
    
    $stmt = $db->prepare($sql_temporal);
    $stmt->execute($params_temporal);
    $stats['distribuicao_temporal'] = $stmt->fetchAll();

    // === RANKING ESTADOS ===
    
    $sql = "SELECT 
                imp.endereco_uf as uf,
                COUNT(DISTINCT di.numero_di) as total_dis,
                COALESCE(SUM(a.valor_reais), 0) as valor_total,
                COUNT(DISTINCT imp.id) as total_importadores
            FROM declaracoes_importacao di
            JOIN importadores imp ON di.importador_id = imp.id
            LEFT JOIN adicoes a ON di.numero_di = a.numero_di
            $where_temporal
            GROUP BY imp.endereco_uf
            ORDER BY valor_total DESC
            LIMIT 10";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['ranking_estados'] = $stmt->fetchAll();

    // === RANKING NCMs ===
    
    $sql = "SELECT 
                a.ncm,
                a.descricao_ncm,
                COUNT(*) as total_adicoes,
                COALESCE(SUM(a.valor_reais), 0) as valor_total,
                COALESCE(AVG(a.valor_reais), 0) as valor_medio
            FROM adicoes a
            JOIN declaracoes_importacao di ON a.numero_di = di.numero_di
            $where_temporal
            AND a.ncm IS NOT NULL AND a.ncm != ''
            GROUP BY a.ncm, a.descricao_ncm
            ORDER BY valor_total DESC
            LIMIT 15";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['ranking_ncms'] = $stmt->fetchAll();

    // === RANKING IMPORTADORES ===
    
    $sql = "SELECT 
                imp.nome,
                imp.cnpj,
                imp.endereco_uf as uf,
                COUNT(DISTINCT di.numero_di) as total_dis,
                COALESCE(SUM(a.valor_reais), 0) as valor_total
            FROM importadores imp
            JOIN declaracoes_importacao di ON imp.id = di.importador_id
            LEFT JOIN adicoes a ON di.numero_di = a.numero_di
            $where_temporal
            GROUP BY imp.id, imp.nome, imp.cnpj, imp.endereco_uf
            ORDER BY valor_total DESC
            LIMIT 10";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params_temporal);
    $stats['ranking_importadores'] = $stmt->fetchAll();

    // === ANÁLISES DETALHADAS (se solicitado) ===
    
    if ($detalhamento === 'completo') {
        
        // Análise consolidada de tributos
        $sql = "SELECT 
                    'II' as tributo,
                    COALESCE(SUM(t.ii_valor_devido), 0) as total_devido,
                    COALESCE(SUM(t.ii_base_calculo), 0) as total_base_calculo,
                    COUNT(CASE WHEN t.ii_valor_devido > 0 THEN 1 END) as adicoes_tributadas,
                    COALESCE(AVG(NULLIF(t.ii_aliquota_ad_valorem, 0)), 0) as aliquota_media
                FROM tributos t 
                JOIN adicoes a ON t.adicao_id = a.id
                JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
                $where_temporal
                
                UNION ALL
                
                SELECT 
                    'IPI' as tributo,
                    COALESCE(SUM(t.ipi_valor_devido), 0) as total_devido,
                    COALESCE(SUM(a.valor_reais + COALESCE(t.ii_valor_devido, 0)), 0) as total_base_calculo,
                    COUNT(CASE WHEN t.ipi_valor_devido > 0 THEN 1 END) as adicoes_tributadas,
                    COALESCE(AVG(NULLIF(t.ipi_aliquota_ad_valorem, 0)), 0) as aliquota_media
                FROM tributos t 
                JOIN adicoes a ON t.adicao_id = a.id
                JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
                $where_temporal
                
                UNION ALL
                
                SELECT 
                    'PIS' as tributo,
                    COALESCE(SUM(t.pis_valor_devido), 0) as total_devido,
                    COALESCE(SUM(t.pis_base_calculo), 0) as total_base_calculo,
                    COUNT(CASE WHEN t.pis_valor_devido > 0 THEN 1 END) as adicoes_tributadas,
                    COALESCE(AVG(NULLIF(t.pis_aliquota_ad_valorem, 0)), 0) as aliquota_media
                FROM tributos t 
                JOIN adicoes a ON t.adicao_id = a.id
                JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
                $where_temporal
                
                UNION ALL
                
                SELECT 
                    'COFINS' as tributo,
                    COALESCE(SUM(t.cofins_valor_devido), 0) as total_devido,
                    COALESCE(SUM(t.cofins_base_calculo), 0) as total_base_calculo,
                    COUNT(CASE WHEN t.cofins_valor_devido > 0 THEN 1 END) as adicoes_tributadas,
                    COALESCE(AVG(NULLIF(t.cofins_aliquota_ad_valorem, 0)), 0) as aliquota_media
                FROM tributos t 
                JOIN adicoes a ON t.adicao_id = a.id
                JOIN declaracoes_importacao di ON a.numero_di = di.numero_di 
                $where_temporal
                
                ORDER BY total_devido DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array_merge($params_temporal, $params_temporal, $params_temporal, $params_temporal));
        $stats['analise_tributos_consolidada'] = $stmt->fetchAll();

        // Indicadores do sistema
        $sql = "SELECT 
                    COUNT(DISTINCT di.numero_di) as dis_processadas,
                    MIN(di.data_registro) as primeira_di,
                    MAX(di.data_registro) as ultima_di,
                    DATEDIFF(MAX(di.data_registro), MIN(di.data_registro)) as periodo_dias,
                    COUNT(CASE WHEN a.valor_reais > 10000 THEN 1 END) as adicoes_alto_valor,
                    COUNT(CASE WHEN t.ii_valor_devido = 0 AND t.ipi_valor_devido = 0 THEN 1 END) as adicoes_sem_tributos
                FROM declaracoes_importacao di
                LEFT JOIN adicoes a ON di.numero_di = a.numero_di
                LEFT JOIN tributos t ON a.id = t.adicao_id
                $where_temporal";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params_temporal);
        $stats['indicadores_sistema'] = $stmt->fetch();

        // Tendências temporais (últimos meses)
        $sql = "SELECT 
                    DATE_FORMAT(di.data_registro, '%Y-%m') as mes,
                    COUNT(DISTINCT di.numero_di) as dis_mes,
                    COALESCE(SUM(a.valor_reais), 0) as valor_mes,
                    COALESCE(SUM(t.ii_valor_devido + t.ipi_valor_devido + t.pis_valor_devido + t.cofins_valor_devido), 0) as tributos_mes,
                    COUNT(DISTINCT imp.endereco_uf) as estados_ativos
                FROM declaracoes_importacao di
                LEFT JOIN adicoes a ON di.numero_di = a.numero_di
                LEFT JOIN tributos t ON a.id = t.adicao_id
                LEFT JOIN importadores imp ON di.importador_id = imp.id
                $where_temporal
                GROUP BY DATE_FORMAT(di.data_registro, '%Y-%m')
                ORDER BY mes DESC
                LIMIT 6";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params_temporal);
        $stats['tendencias_temporais'] = $stmt->fetchAll();
    }

    // === FORMATAÇÃO DE VALORES ===
    
    // Formatar resumo geral
    $stats['resumo_geral']['valor_total_importado_reais'] = 
        number_format($stats['resumo_geral']['valor_total_importado_reais'], 2, '.', '');
    $stats['resumo_geral']['valor_total_importado_usd'] = 
        number_format($stats['resumo_geral']['valor_total_importado_usd'], 2, '.', '');
    $stats['resumo_geral']['taxa_cambio_media'] = 
        number_format($stats['resumo_geral']['taxa_cambio_media'], 4, '.', '');
    $stats['resumo_geral']['total_tributos_federais'] = 
        number_format($stats['resumo_geral']['total_tributos_federais'], 2, '.', '');
    $stats['resumo_geral']['carga_tributaria_media'] = 
        number_format($stats['resumo_geral']['carga_tributaria_media'], 2, '.', '');

    // Formatar distribuição temporal
    foreach ($stats['distribuicao_temporal'] as &$periodo_data) {
        $periodo_data['valor_total'] = number_format(floatval($periodo_data['valor_total']), 2, '.', '');
        $periodo_data['taxa_cambio_media'] = number_format(floatval($periodo_data['taxa_cambio_media']), 4, '.', '');
    }

    // Formatar rankings
    foreach ($stats['ranking_estados'] as &$estado) {
        $estado['valor_total'] = number_format(floatval($estado['valor_total']), 2, '.', '');
    }

    foreach ($stats['ranking_ncms'] as &$ncm) {
        $ncm['valor_total'] = number_format(floatval($ncm['valor_total']), 2, '.', '');
        $ncm['valor_medio'] = number_format(floatval($ncm['valor_medio']), 2, '.', '');
    }

    foreach ($stats['ranking_importadores'] as &$importador) {
        $importador['valor_total'] = number_format(floatval($importador['valor_total']), 2, '.', '');
    }

    // Formatar análises detalhadas
    if ($detalhamento === 'completo') {
        foreach ($stats['analise_tributos_consolidada'] as &$tributo) {
            $tributo['total_devido'] = number_format(floatval($tributo['total_devido']), 2, '.', '');
            $tributo['total_base_calculo'] = number_format(floatval($tributo['total_base_calculo']), 2, '.', '');
            $tributo['aliquota_media'] = number_format(floatval($tributo['aliquota_media']), 2, '.', '');
        }

        foreach ($stats['tendencias_temporais'] as &$tendencia) {
            $tendencia['valor_mes'] = number_format(floatval($tendencia['valor_mes']), 2, '.', '');
            $tendencia['tributos_mes'] = number_format(floatval($tendencia['tributos_mes']), 2, '.', '');
        }
    }

    // Resposta de sucesso
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $stats,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em global-stats.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor: ' . $e->getMessage(),
        'timestamp' => date('c')
    ]);
}
?>