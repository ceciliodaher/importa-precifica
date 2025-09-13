<?php
/**
 * API Endpoint: Salvar Produtos Individuais Calculados
 * 
 * Recebe produtos individuais calculados do ComplianceCalculator
 * e os persiste na nova tabela estruturada produtos_individuais_calculados
 * 
 * Substitui o armazenamento JSON em calculos_salvos.resultados
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validar método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Método não permitido. Use POST.'
    ]);
    exit;
}

// Incluir serviços necessários
require_once '../services/database-service.php';

try {
    // Decodificar JSON do corpo da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido: ' . json_last_error_msg());
    }
    
    // Validar campos obrigatórios
    if (!isset($input['calculo_id']) || !is_numeric($input['calculo_id'])) {
        throw new Exception('Campo obrigatório ausente ou inválido: calculo_id');
    }
    
    if (!isset($input['produtos']) || !is_array($input['produtos'])) {
        throw new Exception('Campo obrigatório ausente ou inválido: produtos (deve ser array)');
    }
    
    if (empty($input['produtos'])) {
        throw new Exception('Array de produtos não pode estar vazio');
    }
    
    $calculo_id = intval($input['calculo_id']);
    $produtos = $input['produtos'];
    
    // Log da requisição para debug
    error_log("API salvar-produtos-individuais: Recebendo " . count($produtos) . " produtos para cálculo ID " . $calculo_id);
    
    // Inicializar conexão com banco
    $db = new DatabaseService();
    $pdo = $db->getConnection();
    
    // Validar que o calculo_id existe na tabela calculos_salvos
    $stmt = $pdo->prepare("SELECT numero_di, estado_icms FROM calculos_salvos WHERE id = ?");
    $stmt->execute([$calculo_id]);
    $calculo_info = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$calculo_info) {
        throw new Exception("Cálculo ID {$calculo_id} não encontrado na tabela calculos_salvos");
    }
    
    $numero_di = $calculo_info['numero_di'];
    $estado_icms = $calculo_info['estado_icms'];
    
    // Preparar statement para inserção dos produtos
    $sql_insert = "
        INSERT INTO produtos_individuais_calculados (
            calculo_id, numero_di, adicao_numero, produto_index,
            ncm, descricao, codigo_produto, unidade_medida,
            quantidade, valor_unitario_brl, valor_total_brl,
            ii_valor_item, ipi_valor_item, pis_valor_item, 
            cofins_valor_item, icms_valor_item, base_icms_item,
            aliquota_icms_aplicada, custo_total_item, custo_unitario_final,
            estado_calculo, hash_dados_origem, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";
    
    $stmt_insert = $pdo->prepare($sql_insert);
    
    // Iniciar transação
    $pdo->beginTransaction();
    
    $produtos_inseridos = 0;
    $produtos_com_erro = 0;
    $erros_detalhes = [];
    
    // Primeiro, limpar produtos existentes deste cálculo para evitar duplicatas
    $stmt_delete = $pdo->prepare("DELETE FROM produtos_individuais_calculados WHERE calculo_id = ?");
    $stmt_delete->execute([$calculo_id]);
    
    // Inserir cada produto individual
    foreach ($produtos as $index => $produto) {
        try {
            // Validar estrutura mínima do produto
            $campos_obrigatorios = ['adicao_numero', 'ncm', 'descricao'];
            foreach ($campos_obrigatorios as $campo) {
                if (!isset($produto[$campo]) || empty($produto[$campo])) {
                    throw new Exception("Campo obrigatório ausente no produto {$index}: {$campo}");
                }
            }
            
            // Extrair e validar dados do produto
            $adicao_numero = strval($produto['adicao_numero']);
            $produto_index = isset($produto['produto_index']) ? intval($produto['produto_index']) : ($index + 1);
            $ncm = strval($produto['ncm']);
            $descricao = strval($produto['descricao']);
            $codigo_produto = isset($produto['codigo_produto']) ? strval($produto['codigo_produto']) : 
                             (isset($produto['codigo']) ? strval($produto['codigo']) : null);
            $unidade_medida = isset($produto['unidade_medida']) ? strval($produto['unidade_medida']) : 'UN';
            
            // Valores numéricos com tratamento de fallback
            $quantidade = floatval($produto['quantidade'] ?? 0);
            $valor_unitario_brl = floatval($produto['valor_unitario_brl'] ?? $produto['valor_unitario'] ?? 0);
            $valor_total_brl = floatval($produto['valor_total_brl'] ?? $produto['valor_total'] ?? 0);
            
            // Tributos individuais
            $ii_valor_item = floatval($produto['ii_valor_item'] ?? $produto['ii_item'] ?? 0);
            $ipi_valor_item = floatval($produto['ipi_valor_item'] ?? $produto['ipi_item'] ?? 0);
            $pis_valor_item = floatval($produto['pis_valor_item'] ?? $produto['pis_item'] ?? 0);
            $cofins_valor_item = floatval($produto['cofins_valor_item'] ?? $produto['cofins_item'] ?? 0);
            $icms_valor_item = floatval($produto['icms_valor_item'] ?? $produto['icms_item'] ?? 0);
            
            // Base de cálculo e alíquota
            $base_icms_item = floatval($produto['base_icms_item'] ?? 0);
            $aliquota_icms_aplicada = floatval($produto['aliquota_icms_aplicada'] ?? 0);
            
            // Custos finais
            $custo_total_item = floatval($produto['custo_total_item'] ?? $produto['custo_total'] ?? 0);
            $custo_unitario_final = floatval($produto['custo_unitario_final'] ?? 0);
            
            // Se custo total não foi informado, calcular
            if ($custo_total_item == 0) {
                $custo_total_item = $valor_total_brl + $ii_valor_item + $ipi_valor_item + 
                                  $pis_valor_item + $cofins_valor_item + $icms_valor_item;
            }
            
            // Se custo unitário final não foi informado, calcular
            if ($custo_unitario_final == 0 && $quantidade > 0) {
                $custo_unitario_final = $custo_total_item / $quantidade;
            }
            
            // Metadados
            $estado_calculo = $estado_icms;
            $hash_dados_origem = md5($numero_di . $adicao_numero . $produto_index . $ncm . $quantidade . $valor_unitario_brl);
            $observacoes = isset($produto['observacoes']) ? strval($produto['observacoes']) : 
                          "Produto inserido via API em " . date('Y-m-d H:i:s');
            
            // Executar inserção
            $stmt_insert->execute([
                $calculo_id,
                $numero_di,
                $adicao_numero,
                $produto_index,
                $ncm,
                $descricao,
                $codigo_produto,
                $unidade_medida,
                $quantidade,
                $valor_unitario_brl,
                $valor_total_brl,
                $ii_valor_item,
                $ipi_valor_item,
                $pis_valor_item,
                $cofins_valor_item,
                $icms_valor_item,
                $base_icms_item,
                $aliquota_icms_aplicada,
                $custo_total_item,
                $custo_unitario_final,
                $estado_calculo,
                $hash_dados_origem,
                $observacoes
            ]);
            
            $produtos_inseridos++;
            
        } catch (Exception $produto_error) {
            $produtos_com_erro++;
            $erros_detalhes[] = [
                'produto_index' => $index,
                'erro' => $produto_error->getMessage(),
                'produto_data' => $produto
            ];
            
            error_log("Erro ao inserir produto {$index}: " . $produto_error->getMessage());
            
            // Se muitos erros, cancelar transação
            if ($produtos_com_erro > 5) {
                throw new Exception("Muitos erros ao processar produtos. Cancelando operação.");
            }
        }
    }
    
    // Verificar se pelo menos alguns produtos foram inseridos
    if ($produtos_inseridos == 0) {
        throw new Exception("Nenhum produto foi inserido com sucesso");
    }
    
    // Commit da transação
    $pdo->commit();
    
    // Log de sucesso
    error_log("API salvar-produtos-individuais: Sucesso - {$produtos_inseridos} produtos inseridos para DI {$numero_di}");
    
    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'message' => 'Produtos individuais salvos com sucesso',
        'dados' => [
            'calculo_id' => $calculo_id,
            'numero_di' => $numero_di,
            'estado_calculo' => $estado_icms,
            'produtos_inseridos' => $produtos_inseridos,
            'produtos_com_erro' => $produtos_com_erro,
            'total_produtos' => count($produtos)
        ],
        'erros' => $erros_detalhes,
        'timestamp' => date('c')
    ]);
    
} catch (Exception $e) {
    // Rollback em caso de erro
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    // Log do erro
    error_log("Erro na API salvar-produtos-individuais: " . $e->getMessage());
    
    // Resposta de erro
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'message' => $e->getMessage(),
        'debug_info' => [
            'input_received' => isset($input) ? array_keys($input) : null,
            'produtos_count' => isset($produtos) ? count($produtos) : null,
            'calculo_id' => isset($calculo_id) ? $calculo_id : null
        ],
        'timestamp' => date('c')
    ]);
}
?>