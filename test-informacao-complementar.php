<?php
/**
 * Teste de extração de informações complementares
 * Testa se o SISCOMEX R$ 154,23 é extraído corretamente do XML 2520345968
 */

// Simular texto da informação complementar da DI 2520345968
$informacao_complementar = 'Taxa Siscomex.....: 154,23
PIS/COFINS (BASE).....: 513.215,74
ICMS.....: 13.703,92
VALOR DO ICMS EXONERADO.......: R$ 0,00
VALOR AFRMM.......: R$ 0,00
ADICAO.............: 001 NCM...........: 40151200
CFOP...............;
ATO CONCESSORIO....;
LI.................: 2531297326
Valor Aduaneiro....: 513.215,74
II.................: 14,40 Red: 0,00 R$ 0,00
IPI................; 0,00 Red: 0,00 R$ 0,00
Despesas Aduaneiras: 0,00
Taxa Siscomex......: 154,23
Base Calculo PIS...: 513.215,74
PIS................: 2,10 Red: 0,00 R$ 0,00
COFINS.............: 10,45 Red: 0,00 R$ 0,00
Base Calculo ICMS..: 527.073,89
ICMS...............: 2,60 Red: 0,00 R$ 13.703,92';

echo "=== TESTE DE EXTRAÇÃO DE INFORMAÇÕES COMPLEMENTARES ===\n\n";

// Testar diretamente os padrões regex
echo "Texto de entrada:\n";
echo substr($informacao_complementar, 0, 200) . "...\n\n";

// Teste específico para SISCOMEX
echo "=== TESTE REGEX SISCOMEX ===\n";
$siscomex_patterns = [
    '/Taxa\s+Siscomex\.+:\s*([\d,]+)/i',
    '/Siscomex\.+:\s*([\d,]+)/i',
    '/Taxa\s+de\s+utilizacao\s+do\s+siscomex[^\d]*?R?\$?\s*([\d\.,]+)/i',
    '/SISCOMEX[^\d]*?:?\s*([\d\.,]+)/i'
];

$siscomex_found = false;
foreach ($siscomex_patterns as $i => $pattern) {
    if (preg_match($pattern, $informacao_complementar, $matches)) {
        echo "✅ Pattern " . ($i + 1) . " matched: '{$matches[1]}'\n";
        $siscomex_found = true;
        
        // Testar conversão
        $valor = convertMonetaryString($matches[1]);
        echo "   Convertido para: R$ " . number_format($valor, 2, ',', '.') . "\n";
        break;
    }
}

if (!$siscomex_found) {
    echo "❌ Nenhum pattern SISCOMEX funcionou\n";
    echo "Vamos testar patterns individuais:\n";
    
    foreach ($siscomex_patterns as $i => $pattern) {
        echo "Pattern " . ($i + 1) . ": $pattern\n";
        if (preg_match($pattern, $informacao_complementar, $matches)) {
            echo "  ✅ Match: " . print_r($matches, true) . "\n";
        } else {
            echo "  ❌ No match\n";
        }
    }
}

// Teste conversão monetária
function convertMonetaryString($value) {
    if (empty($value)) return 0;
    
    // Remove tudo que não é dígito, vírgula ou ponto
    $value = preg_replace('/[^\d\.,]/', '', $value);
    
    // Se tem vírgula como separador decimal (padrão brasileiro)
    if (strpos($value, ',') !== false) {
        // Se tem ponto também, ponto é separador de milhares
        if (strpos($value, '.') !== false) {
            $value = str_replace('.', '', $value); // Remove separadores de milhares
        }
        $value = str_replace(',', '.', $value); // Vírgula vira ponto decimal
    }
    
    return floatval($value);
}

echo "\n=== TESTE CONVERSÃO MONETÁRIA ===\n";
$test_values = ['154,23', '154.23', '1.234,56', '1,234.56', '0,00'];
foreach ($test_values as $test_value) {
    $converted = convertMonetaryString($test_value);
    echo "'{$test_value}' → {$converted}\n";
}

echo "\n=== FIM DO TESTE ===\n";
?>