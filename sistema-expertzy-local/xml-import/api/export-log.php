<?php
/**
 * API Export Log - Exporta logs de importação
 */

require_once __DIR__ . '/../processor.php';

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
    
    // Instanciar logger
    $logger = new ImportLogger();
    $export_data = $logger->exportLogs();
    
    $format = $_GET['format'] ?? 'json';
    $download = isset($_GET['download']) && $_GET['download'] === 'true';
    
    if ($format === 'json') {
        if ($download) {
            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="import-logs-' . date('Y-m-d') . '.json"');
        } else {
            header('Content-Type: application/json; charset=utf-8');
        }
        
        echo json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
    } else if ($format === 'html') {
        header('Content-Type: text/html; charset=utf-8');
        
        echo generateHtmlReport($export_data);
        
    } else {
        throw new Exception('Formato não suportado. Use: json, html');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function generateHtmlReport($data) {
    $html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Logs de Importação</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .log-entry { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .log-success { border-left: 4px solid #28a745; background: #f8fff9; }
        .log-error { border-left: 4px solid #dc3545; background: #fff8f8; }
        .log-warning { border-left: 4px solid #ffc107; background: #fffdf5; }
        .log-info { border-left: 4px solid #17a2b8; background: #f8fdff; }
        .timestamp { color: #666; font-size: 0.9em; }
        .context { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.9em; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; flex: 1; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
    </style>
</head>
<body>';

    $html .= '<div class="header">';
    $html .= '<h1>📄 Relatório de Logs de Importação</h1>';
    $html .= '<p><strong>Arquivo:</strong> ' . htmlspecialchars($data['filename']) . '</p>';
    $html .= '<p><strong>Total de Entradas:</strong> ' . $data['total_entries'] . '</p>';
    $html .= '<p><strong>Gerado em:</strong> ' . date('d/m/Y H:i:s') . '</p>';
    $html .= '</div>';

    // Estatísticas por tipo de log
    $stats = [
        'success' => 0,
        'error' => 0,
        'warning' => 0,
        'info' => 0
    ];
    
    foreach ($data['logs'] as $log) {
        $stats[$log['level']] = ($stats[$log['level']] ?? 0) + 1;
    }
    
    $html .= '<div class="stats">';
    $html .= '<div class="stat-card"><div class="stat-number" style="color: #28a745">' . $stats['success'] . '</div><div>Sucessos</div></div>';
    $html .= '<div class="stat-card"><div class="stat-number" style="color: #dc3545">' . $stats['error'] . '</div><div>Erros</div></div>';
    $html .= '<div class="stat-card"><div class="stat-number" style="color: #ffc107">' . $stats['warning'] . '</div><div>Avisos</div></div>';
    $html .= '<div class="stat-card"><div class="stat-number" style="color: #17a2b8">' . $stats['info'] . '</div><div>Informações</div></div>';
    $html .= '</div>';

    $html .= '<h2>Entradas do Log</h2>';
    
    foreach (array_reverse($data['logs']) as $log) {
        $level_class = 'log-' . $log['level'];
        $level_icon = [
            'success' => '✅',
            'error' => '❌',
            'warning' => '⚠️',
            'info' => 'ℹ️'
        ][$log['level']] ?? '📄';
        
        $html .= '<div class="log-entry ' . $level_class . '">';
        $html .= '<div><strong>' . $level_icon . ' ' . htmlspecialchars($log['message']) . '</strong></div>';
        $html .= '<div class="timestamp">' . date('d/m/Y H:i:s', strtotime($log['timestamp'])) . '</div>';
        
        if (!empty($log['context'])) {
            $html .= '<div class="context">' . htmlspecialchars(json_encode($log['context'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . '</div>';
        }
        
        $html .= '</div>';
    }
    
    $html .= '</body></html>';
    
    return $html;
}
?>