<?php
/**
 * API Endpoint: Análise Detalhada de Tributos
 * 
 * GET /api/statistics/tributos-analysis.php?numero_di=XXXXXXXXX&[tipo_analise=detalhada]
 * 
 * Parâmetros:
 * - numero_di: número da DI (obrigatório)
 * - tipo_analise: tipo de análise [detalhada|resumida] (opcional, padrão: detalhada)
 * 
 * Retorna análise completa dos tributos de uma DI incluindo:
 * - Análise por tipo de tributo (II, IPI, PIS, COFINS)
 * - Comparação de alíquotas vs valores devidos
 * - Análise de base de cálculo por adição
 * - Efetividade tributária por NCM
 * - Indicadores de compliance fiscal
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
    $tipo_analise = $_GET['tipo_analise'] ?? 'detalhada';
    
    // Validar formato do número da DI
    if (!preg_match('/^\d{8,12}$/', $numero_di)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato inválido para número da DI. Deve conter entre 8 e 12 dígitos.'
        ]);
        exit;
    }

    // Validar tipo de análise
    if (!in_array($tipo_analise, ['detalhada', 'resumida'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'tipo_analise deve ser "detalhada" ou "resumida"'
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
        throw new Exception("DI {$numero_di} não possui adições - obrigatório para análise de tributos");
    }

    // Inicializar estrutura de análise
    $analysis = [
        'numero_di' => $numero_di,
        'tipo_analise' => $tipo_analise,
        'resumo_executivo' => [
            'total_tributos_devidos' => 0,
            'carga_tributaria_efetiva' => 0, // % sobre valor CIF
            'maior_incidencia' => '',
            'total_base_calculo' => 0
        ],
        'analise_por_tributo' => [
            'ii' => [
                'nome' => 'Imposto de Importação',
                'total_devido' => 0,
                'total_base_calculo' => 0,
                'aliquota_media_ponderada' => 0,
                'participacao_percentual' => 0,
                'adicoes_tributadas' => 0
            ],
            'ipi' => [
                'nome' => 'Imposto sobre Produtos Industrializados',
                'total_devido' => 0,
                'total_base_calculo' => 0,
                'aliquota_media_ponderada' => 0,
                'participacao_percentual' => 0,
                'adicoes_tributadas' => 0
            ],
            'pis' => [
                'nome' => 'Programa de Integração Social',
                'total_devido' => 0,
                'total_base_calculo' => 0,
                'aliquota_media_ponderada' => 0,
                'participacao_percentual' => 0,
                'adicoes_tributadas' => 0
            ],
            'cofins' => [
                'nome' => 'Contribuição para Financiamento da Seguridade Social',
                'total_devido' => 0,
                'total_base_calculo' => 0,
                'aliquota_media_ponderada' => 0,
                'participacao_percentual' => 0,
                'adicoes_tributadas' => 0
            ]
        ],
        'analise_por_adicao' => [],
        'indicadores_compliance' => [
            'adicoes_com_tributos_zerados' => 0,
            'adicoes_com_aliquotas_diferenciadas' => 0,
            'ncms_com_isencao' => [],
            'potenciais_inconsistencias' => []
        ]
    ];

    // Incluir análise detalhada apenas se solicitada
    if ($tipo_analise === 'detalhada') {
        $analysis['analise_detalhada_por_ncm'] = [];
        $analysis['comparativo_aliquotas'] = [];
    }

    $valor_cif_total = 0;
    $total_geral_tributos = 0;

    // Processar cada adição
    foreach ($di['adicoes'] as $adicao) {
        // VALIDAR dados obrigatórios da adição - NUNCA usar fallbacks
        if (!isset($adicao['valor_reais'])) {
            throw new Exception("Adição {$adicao['numero_adicao']} não possui valor_reais - obrigatório para análise");
        }

        $valor_cif_adicao = floatval($adicao['valor_reais']);
        $valor_cif_total += $valor_cif_adicao;

        $tributos_adicao = [
            'numero_adicao' => $adicao['numero_adicao'],
            'ncm' => $adicao['ncm'] ?? 'SEM_NCM',
            'descricao_ncm' => $adicao['descricao_ncm'] ?? 'Não informado',
            'valor_cif' => $valor_cif_adicao,
            'tributos_detalhados' => [],
            'total_tributos' => 0,
            'carga_tributaria_adicao' => 0
        ];

        $total_tributos_adicao = 0;
        $tem_tributos_zerados = true;
        $tem_aliquotas_diferenciadas = false;

        // Processar tributos se existirem
        if (!empty($adicao['tributos'])) {
            $tributos = $adicao['tributos'];

            // Processar cada tipo de tributo
            $tipos_tributo = [
                'ii' => ['valor_devido', 'base_calculo', 'aliquota_ad_valorem'],
                'ipi' => ['valor_devido', 'base_calculo', 'aliquota_ad_valorem'],
                'pis' => ['valor_devido', 'base_calculo', 'aliquota_ad_valorem'],
                'cofins' => ['valor_devido', 'base_calculo', 'aliquota_ad_valorem']
            ];

            foreach ($tipos_tributo as $tipo => $campos) {
                $valor_devido_key = $tipo . '_' . $campos[0];
                $base_calculo_key = $tipo . '_' . $campos[1];
                $aliquota_key = $tipo . '_' . $campos[2];

                $valor_devido = isset($tributos[$valor_devido_key]) ? floatval($tributos[$valor_devido_key]) : 0;
                $base_calculo = isset($tributos[$base_calculo_key]) ? floatval($tributos[$base_calculo_key]) : 0;
                $aliquota = isset($tributos[$aliquota_key]) ? floatval($tributos[$aliquota_key]) : 0;

                // Acumular no análise geral
                $analysis['analise_por_tributo'][$tipo]['total_devido'] += $valor_devido;
                $analysis['analise_por_tributo'][$tipo]['total_base_calculo'] += $base_calculo;
                
                if ($valor_devido > 0) {
                    $analysis['analise_por_tributo'][$tipo]['adicoes_tributadas']++;
                    $tem_tributos_zerados = false;
                }

                if ($aliquota > 0 && $aliquota != 1.65 && $aliquota != 9.25) { // PIS/COFINS padrão
                    $tem_aliquotas_diferenciadas = true;
                }

                // Adicionar aos detalhes da adição
                $tributos_adicao['tributos_detalhados'][$tipo] = [
                    'nome' => $analysis['analise_por_tributo'][$tipo]['nome'],
                    'valor_devido' => $valor_devido,
                    'base_calculo' => $base_calculo,
                    'aliquota_aplicada' => $aliquota,
                    'aliquota_efetiva' => $base_calculo > 0 ? ($valor_devido / $base_calculo * 100) : 0
                ];

                $total_tributos_adicao += $valor_devido;
                $total_geral_tributos += $valor_devido;
            }
        }

        $tributos_adicao['total_tributos'] = $total_tributos_adicao;
        $tributos_adicao['carga_tributaria_adicao'] = $valor_cif_adicao > 0 ? 
            ($total_tributos_adicao / $valor_cif_adicao * 100) : 0;

        $analysis['analise_por_adicao'][] = $tributos_adicao;

        // Indicadores de compliance
        if ($tem_tributos_zerados) {
            $analysis['indicadores_compliance']['adicoes_com_tributos_zerados']++;
        }

        if ($tem_aliquotas_diferenciadas) {
            $analysis['indicadores_compliance']['adicoes_com_aliquotas_diferenciadas']++;
        }

        // Análise detalhada por NCM (se solicitada)
        if ($tipo_analise === 'detalhada') {
            $ncm = $adicao['ncm'] ?? 'SEM_NCM';
            if (!isset($analysis['analise_detalhada_por_ncm'][$ncm])) {
                $analysis['analise_detalhada_por_ncm'][$ncm] = [
                    'ncm' => $ncm,
                    'descricao' => $adicao['descricao_ncm'] ?? 'Não informado',
                    'total_adicoes' => 0,
                    'valor_total' => 0,
                    'tributos_total' => 0,
                    'carga_tributaria_media' => 0
                ];
            }

            $analysis['analise_detalhada_por_ncm'][$ncm]['total_adicoes']++;
            $analysis['analise_detalhada_por_ncm'][$ncm]['valor_total'] += $valor_cif_adicao;
            $analysis['analise_detalhada_por_ncm'][$ncm]['tributos_total'] += $total_tributos_adicao;
        }
    }

    // Finalizar cálculos gerais
    $analysis['resumo_executivo']['total_tributos_devidos'] = $total_geral_tributos;
    $analysis['resumo_executivo']['total_base_calculo'] = $valor_cif_total;
    $analysis['resumo_executivo']['carga_tributaria_efetiva'] = $valor_cif_total > 0 ? 
        ($total_geral_tributos / $valor_cif_total * 100) : 0;

    // Calcular participação percentual e alíquotas médias ponderadas
    $maior_valor = 0;
    $maior_tributo = '';

    foreach ($analysis['analise_por_tributo'] as $tipo => &$tributo_data) {
        if ($total_geral_tributos > 0) {
            $tributo_data['participacao_percentual'] = 
                ($tributo_data['total_devido'] / $total_geral_tributos * 100);
        }

        if ($tributo_data['total_base_calculo'] > 0) {
            $tributo_data['aliquota_media_ponderada'] = 
                ($tributo_data['total_devido'] / $tributo_data['total_base_calculo'] * 100);
        }

        if ($tributo_data['total_devido'] > $maior_valor) {
            $maior_valor = $tributo_data['total_devido'];
            $maior_tributo = $tributo_data['nome'];
        }
    }

    $analysis['resumo_executivo']['maior_incidencia'] = $maior_tributo;

    // Finalizar análise detalhada por NCM
    if ($tipo_analise === 'detalhada' && !empty($analysis['analise_detalhada_por_ncm'])) {
        foreach ($analysis['analise_detalhada_por_ncm'] as &$ncm_data) {
            $ncm_data['carga_tributaria_media'] = $ncm_data['valor_total'] > 0 ? 
                ($ncm_data['tributos_total'] / $ncm_data['valor_total'] * 100) : 0;
        }
        
        // Converter para array e ordenar por valor
        $analysis['analise_detalhada_por_ncm'] = array_values($analysis['analise_detalhada_por_ncm']);
        usort($analysis['analise_detalhada_por_ncm'], function($a, $b) {
            return $b['valor_total'] <=> $a['valor_total'];
        });
    }

    // Identificar potenciais inconsistências
    foreach ($analysis['analise_por_adicao'] as $adicao_data) {
        if ($adicao_data['carga_tributaria_adicao'] > 50) {
            $analysis['indicadores_compliance']['potenciais_inconsistencias'][] = [
                'tipo' => 'CARGA_TRIBUTARIA_ALTA',
                'adicao' => $adicao_data['numero_adicao'],
                'descricao' => "Carga tributária de {$adicao_data['carga_tributaria_adicao']}% parece elevada"
            ];
        }

        if ($adicao_data['total_tributos'] == 0 && $adicao_data['valor_cif'] > 1000) {
            $analysis['indicadores_compliance']['potenciais_inconsistencias'][] = [
                'tipo' => 'TRIBUTOS_ZERADOS_VALOR_ALTO',
                'adicao' => $adicao_data['numero_adicao'],
                'descricao' => "Adição com valor alto (R$ {$adicao_data['valor_cif']}) mas tributos zerados"
            ];
        }
    }

    // Formatar valores monetários e percentuais
    $analysis['resumo_executivo']['total_tributos_devidos'] = 
        number_format($analysis['resumo_executivo']['total_tributos_devidos'], 2, '.', '');
    $analysis['resumo_executivo']['total_base_calculo'] = 
        number_format($analysis['resumo_executivo']['total_base_calculo'], 2, '.', '');
    $analysis['resumo_executivo']['carga_tributaria_efetiva'] = 
        number_format($analysis['resumo_executivo']['carga_tributaria_efetiva'], 2, '.', '');

    foreach ($analysis['analise_por_tributo'] as &$tributo_data) {
        $tributo_data['total_devido'] = number_format($tributo_data['total_devido'], 2, '.', '');
        $tributo_data['total_base_calculo'] = number_format($tributo_data['total_base_calculo'], 2, '.', '');
        $tributo_data['aliquota_media_ponderada'] = number_format($tributo_data['aliquota_media_ponderada'], 2, '.', '');
        $tributo_data['participacao_percentual'] = number_format($tributo_data['participacao_percentual'], 2, '.', '');
    }

    foreach ($analysis['analise_por_adicao'] as &$adicao_data) {
        $adicao_data['valor_cif'] = number_format($adicao_data['valor_cif'], 2, '.', '');
        $adicao_data['total_tributos'] = number_format($adicao_data['total_tributos'], 2, '.', '');
        $adicao_data['carga_tributaria_adicao'] = number_format($adicao_data['carga_tributaria_adicao'], 2, '.', '');

        foreach ($adicao_data['tributos_detalhados'] as &$tributo_detail) {
            $tributo_detail['valor_devido'] = number_format($tributo_detail['valor_devido'], 2, '.', '');
            $tributo_detail['base_calculo'] = number_format($tributo_detail['base_calculo'], 2, '.', '');
            $tributo_detail['aliquota_aplicada'] = number_format($tributo_detail['aliquota_aplicada'], 2, '.', '');
            $tributo_detail['aliquota_efetiva'] = number_format($tributo_detail['aliquota_efetiva'], 2, '.', '');
        }
    }

    if ($tipo_analise === 'detalhada' && !empty($analysis['analise_detalhada_por_ncm'])) {
        foreach ($analysis['analise_detalhada_por_ncm'] as &$ncm_data) {
            $ncm_data['valor_total'] = number_format($ncm_data['valor_total'], 2, '.', '');
            $ncm_data['tributos_total'] = number_format($ncm_data['tributos_total'], 2, '.', '');
            $ncm_data['carga_tributaria_media'] = number_format($ncm_data['carga_tributaria_media'], 2, '.', '');
        }
    }

    // Resposta de sucesso
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $analysis,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em tributos-analysis.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor: ' . $e->getMessage(),
        'timestamp' => date('c')
    ]);
}
?>