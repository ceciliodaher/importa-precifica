<?php
/**
 * API Import - Processa uploads de XML
 */

require_once __DIR__ . '/../processor.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }
    
    if (!isset($_FILES['arquivo'])) {
        throw new Exception('Nenhum arquivo enviado');
    }
    
    $arquivo = $_FILES['arquivo'];
    
    // Validar arquivo
    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Erro no upload do arquivo');
    }
    
    if (!str_ends_with(strtolower($arquivo['name']), '.xml')) {
        throw new Exception('Arquivo deve ser XML');
    }
    
    if ($arquivo['size'] > 50 * 1024 * 1024) { // 50MB
        throw new Exception('Arquivo muito grande (máximo 50MB)');
    }
    
    // Ler conteúdo do arquivo
    $xmlContent = file_get_contents($arquivo['tmp_name']);
    if (!$xmlContent) {
        throw new Exception('Não foi possível ler o arquivo');
    }
    
    // Processar XML
    global $processor;
    $result = $processor->processXML($xmlContent, $arquivo['name']);
    
    if (!$result['success']) {
        // Verificar se é DI duplicada
        if (strpos($result['error'], 'já existe') !== false) {
            echo json_encode([
                'success' => false,
                'duplicate' => true,
                'numero_di' => $result['numero_di'] ?? 'desconhecido',
                'error' => $result['error']
            ]);
            exit;
        }
        
        throw new Exception($result['error']);
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>