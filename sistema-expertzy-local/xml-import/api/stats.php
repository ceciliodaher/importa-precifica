<?php
/**
 * API Stats - Retorna estatísticas do banco
 */

require_once '../processor.php';

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
    $stats = $processor->getStats();
    
    echo json_encode($stats);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'total_dis' => 0,
        'total_adicoes' => 0,
        'total_mercadorias' => 0,
        'last_import' => null
    ]);
}
?>