<?php
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Endpoint teste funcionando',
    'timestamp' => date('c'),
    'php_version' => PHP_VERSION
]);
?>