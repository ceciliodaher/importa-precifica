<?php
/**
 * API Endpoint: Consultar Produtos para Croqui NF
 * 
 * Consulta produtos individuais calculados da tabela estruturada
 * para geração do Croqui NF PDF
 * 
 * Substitui a consulta JSON em calculos_salvos.resultados
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validar método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Método não permitido. Use GET.'
    ]);
    exit;
}

// Incluir serviços necessários
require_once '../services/database-service.php';

try {
    // Extrair parâmetros da query string
    $numero_di = isset($_GET['numero_di']) ? trim($_GET['numero_di']) : null;
    $calculo_id = isset($_GET['calculo_id']) ? intval($_GET['calculo_id']) : null;
    $estado_calculo = isset($_GET['estado_calculo']) ? trim($_GET['estado_calculo']) : null;
    $formato = isset($_GET['formato']) ? trim($_GET['formato']) : 'completo';
    $adicao_numero = isset($_GET['adicao_numero']) ? trim($_GET['adicao_numero']) : null;
    
    // Validar parâmetros obrigatórios
    if (!$numero_di && !$calculo_id) {
        throw new Exception('Parâmetro obrigatório ausente: numero_di ou calculo_id');
    }
    
    if ($numero_di && strlen($numero_di) < 10) {
        throw new Exception('numero_di deve ter pelo menos 10 caracteres');
    }
    
    // Log da consulta para debug
    $params_log = [
        'numero_di' => $numero_di,
        'calculo_id' => $calculo_id,
        'estado_calculo' => $estado_calculo,
        'formato' => $formato
    ];
    error_log("API consultar-produtos-croqui: " . json_encode($params_log));
    
    // Inicializar conexão com banco
    $db = new DatabaseService();
    $pdo = $db->getConnection();
    
    // Construir query baseada nos parâmetros
    if ($formato === 'completo') {
        // Query completa usando a VIEW otimizada
        $sql = "
            SELECT 
                produto_id, numero_di, adicao_numero, produto_index,
                ncm, descricao, codigo_produto, quantidade, unidade_medida,
                valor_unitario_brl, valor_total_brl,
                ii_valor_item, ipi_valor_item, pis_valor_item, 
                cofins_valor_item, icms_valor_item,
                base_icms_item, aliquota_icms_aplicada,
                custo_total_item, custo_unitario_final,
                data_registro, taxa_cambio_calculada,
                importador_nome, importador_cnpj, importador_uf, importador_cidade,
                estado_icms, tipo_calculo, data_calculo, estado_calculo,
                observacoes, data_produto_calculado
            FROM view_produtos_croqui_nf
            WHERE 1=1
        ";
    } else {
        // Query simples para listagem rápida
        $sql = "
            SELECT 
                id as produto_id, numero_di, adicao_numero, produto_index,
                ncm, descricao, codigo_produto, quantidade,
                valor_total_brl, custo_total_item, estado_calculo
            FROM produtos_individuais_calculados
            WHERE 1=1
        ";
    }
    
    $params = [];
    
    // Adicionar filtros conforme parâmetros
    if ($numero_di) {
        $sql .= " AND numero_di = ?";
        $params[] = $numero_di;
    }
    
    if ($calculo_id) {
        $sql .= " AND " . ($formato === 'completo' ? "produto_id IN (SELECT id FROM produtos_individuais_calculados WHERE calculo_id = ?)" : "calculo_id = ?");
        $params[] = $calculo_id;
    }
    
    if ($estado_calculo) {
        $sql .= " AND estado_calculo = ?";
        $params[] = $estado_calculo;
    }
    
    if ($adicao_numero) {
        $sql .= " AND adicao_numero = ?";
        $params[] = $adicao_numero;
    }
    
    // Ordenar por adição e produto
    $sql .= " ORDER BY adicao_numero, produto_index";
    
    // Executar consulta
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Se não encontrou produtos, tentar buscar por critérios mais amplos
    if (empty($produtos) && $numero_di) {
        // Buscar qualquer produto desta DI
        $sql_fallback = "
            SELECT 
                id as produto_id, numero_di, adicao_numero, produto_index,
                ncm, descricao, codigo_produto, quantidade,
                valor_total_brl, custo_total_item, estado_calculo,
                created_at
            FROM produtos_individuais_calculados
            WHERE numero_di = ?
            ORDER BY created_at DESC, adicao_numero, produto_index
            LIMIT 50
        ";
        
        $stmt_fallback = $pdo->prepare($sql_fallback);
        $stmt_fallback->execute([$numero_di]);
        $produtos = $stmt_fallback->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($produtos)) {
            error_log("API consultar-produtos-croqui: Fallback - encontrados " . count($produtos) . " produtos para DI {$numero_di}");
        }
    }
    
    // Se ainda não encontrou, verificar se a DI existe
    if (empty($produtos) && $numero_di) {
        $stmt_di = $pdo->prepare("SELECT numero_di FROM declaracoes_importacao WHERE numero_di = ?");
        $stmt_di->execute([$numero_di]);
        $di_existe = $stmt_di->fetch();
        
        if (!$di_existe) {
            throw new Exception("DI {$numero_di} não encontrada no sistema");
        }
        
        // Verificar se há cálculos para esta DI
        $stmt_calc = $pdo->prepare("SELECT COUNT(*) as total FROM calculos_salvos WHERE numero_di = ?");
        $stmt_calc->execute([$numero_di]);
        $total_calculos = $stmt_calc->fetch()['total'];
        
        if ($total_calculos == 0) {
            throw new Exception("Nenhum cálculo encontrado para a DI {$numero_di}. Execute o cálculo de impostos primeiro.");
        } else {
            throw new Exception("DI {$numero_di} tem {$total_calculos} cálculo(s), mas nenhum produto individual foi salvo. Verifique o processo de cálculo.");
        }
    }
    
    // Preparar dados de resumo
    $resumo = [
        'total_produtos' => count($produtos),
        'total_adicoes' => 0,
        'valor_total_geral' => 0,
        'custo_total_geral' => 0,
        'impostos_total_geral' => 0
    ];
    
    $adicoes_unicas = [];
    foreach ($produtos as $produto) {
        $adicoes_unicas[$produto['adicao_numero']] = true;
        $resumo['valor_total_geral'] += floatval($produto['valor_total_brl'] ?? 0);
        $resumo['custo_total_geral'] += floatval($produto['custo_total_item'] ?? 0);
    }
    $resumo['total_adicoes'] = count($adicoes_unicas);
    $resumo['impostos_total_geral'] = $resumo['custo_total_geral'] - $resumo['valor_total_geral'];
    
    // Agrupar produtos por adição para facilitar processamento no frontend
    $produtos_por_adicao = [];
    foreach ($produtos as $produto) {
        $adicao = $produto['adicao_numero'];
        if (!isset($produtos_por_adicao[$adicao])) {
            $produtos_por_adicao[$adicao] = [
                'adicao_numero' => $adicao,
                'ncm' => $produto['ncm'],
                'produtos' => [],
                'totais' => [
                    'quantidade_total' => 0,
                    'valor_total' => 0,
                    'custo_total' => 0,
                    'impostos_total' => 0
                ]
            ];
        }
        
        $produtos_por_adicao[$adicao]['produtos'][] = $produto;
        $produtos_por_adicao[$adicao]['totais']['quantidade_total'] += floatval($produto['quantidade'] ?? 0);
        $produtos_por_adicao[$adicao]['totais']['valor_total'] += floatval($produto['valor_total_brl'] ?? 0);
        $produtos_por_adicao[$adicao]['totais']['custo_total'] += floatval($produto['custo_total_item'] ?? 0);
        $produtos_por_adicao[$adicao]['totais']['impostos_total'] = 
            $produtos_por_adicao[$adicao]['totais']['custo_total'] - 
            $produtos_por_adicao[$adicao]['totais']['valor_total'];
    }
    
    // Converter para array indexado
    $produtos_por_adicao = array_values($produtos_por_adicao);
    
    // Preparar metadados da consulta
    $metadados = [
        'numero_di' => $numero_di,
        'calculo_id' => $calculo_id,
        'estado_calculo' => $estado_calculo,
        'formato' => $formato,
        'timestamp_consulta' => date('c'),
        'parametros_consulta' => $params_log
    ];
    
    // Log de sucesso
    error_log("API consultar-produtos-croqui: Sucesso - {$resumo['total_produtos']} produtos encontrados para DI {$numero_di}");
    
    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'message' => 'Produtos consultados com sucesso',
        'produtos' => $produtos,
        'produtos_por_adicao' => $produtos_por_adicao,
        'resumo' => $resumo,
        'metadados' => $metadados
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // Log do erro
    error_log("Erro na API consultar-produtos-croqui: " . $e->getMessage());
    
    // Resposta de erro
    http_response_code($e->getMessage() === 'Método não permitido. Use GET.' ? 405 : 500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro na consulta de produtos',
        'message' => $e->getMessage(),
        'debug_info' => [
            'numero_di' => isset($numero_di) ? $numero_di : null,
            'calculo_id' => isset($calculo_id) ? $calculo_id : null,
            'estado_calculo' => isset($estado_calculo) ? $estado_calculo : null,
            'formato' => isset($formato) ? $formato : null
        ],
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}
?>