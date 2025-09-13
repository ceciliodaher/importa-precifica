<?php
/**
 * API Validate - Valida conexão com banco
 */

require_once __DIR__ . '/../processor.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Método não permitido');
    }
    
    global $processor;
    $validation = $processor->validateConnection();
    
    echo json_encode($validation);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'connected' => false,
        'error' => $e->getMessage()
    ]);
}
?>