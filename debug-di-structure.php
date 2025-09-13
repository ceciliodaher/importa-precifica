<?php
/**
 * Debug DI Data Structure
 */

echo "=== Debugging DI Data Structure ===\n\n";

require_once 'api/services/database-service.php';

try {
    $service = new DatabaseService();
    
    // Get DI structure
    $result = $service->buscarDI("2300120746", false);
    
    if (!$result['success']) {
        throw new Exception('Failed to load DI: ' . $result['error']);
    }
    
    echo "✅ DI loaded successfully\n\n";
    
    echo "=== DI Data Structure ===\n";
    echo "Keys available:\n";
    foreach (array_keys($result['data']) as $key) {
        echo "  - $key\n";
    }
    
    echo "\n=== First level data ===\n";
    foreach ($result['data'] as $key => $value) {
        if (is_array($value)) {
            echo "$key: [array with " . count($value) . " items]\n";
            if (count($value) > 0 && is_array($value[0])) {
                echo "  First item keys: " . implode(', ', array_keys($value[0])) . "\n";
            }
        } elseif (is_object($value)) {
            echo "$key: [object]\n";
        } else {
            echo "$key: " . (strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value) . "\n";
        }
    }
    
    // Check if we have importador data in the main DI record
    echo "\n=== Importador Information ===\n";
    if (isset($result['data']['importador_nome'])) {
        echo "importador_nome: " . $result['data']['importador_nome'] . "\n";
    }
    if (isset($result['data']['importador_uf'])) {
        echo "importador_uf: " . $result['data']['importador_uf'] . "\n";
    }
    
    // Check JSON response format
    echo "\n=== Raw JSON Response (first 500 chars) ===\n";
    echo substr(json_encode($result, JSON_PRETTY_PRINT), 0, 500) . "...\n";
    
} catch (Exception $e) {
    echo "❌ Debug failed: " . $e->getMessage() . "\n";
}
?>