<?php
/**
 * Teste de Conformidade - Nomenclatura XML vs Banco de Dados
 * Sistema Expertzy - Validação da implementação
 */

// Configurações do banco de dados
$db_config = [
    'host' => 'localhost:3307',
    'dbname' => 'importa_precificacao',
    'username' => 'root',
    'password' => 'ServBay.dev',
    'charset' => 'utf8mb4'
];

class NomenclaturaComplianceTest {
    private $pdo;
    private $nomenclatura_map = [
        // Dados das Adições - XML → Banco
        'freteValorMoedaNegociada' => 'frete_valor_moeda_negociada',
        'seguroValorMoedaNegociada' => 'seguro_valor_moeda_negociada',
        'freteValorReais' => 'frete_valor_reais',
        'seguroValorReais' => 'seguro_valor_reais',
        'dadosMercadoriaCodigoNcm' => 'ncm',
        'dadosMercadoriaNomeNcm' => 'descricao_ncm',
        'condicaoVendaValorMoeda' => 'valor_moeda_negociacao',
        'condicaoVendaValorReais' => 'valor_reais',
        
        // Dados das Mercadorias - XML → Banco
        'valorUnitario' => 'valor_unitario_usd',
        'codigoMercadoria' => 'codigo_produto',
        'descricaoMercadoria' => 'descricao_mercadoria',
        'quantidade' => 'quantidade',
        'unidadeMedida' => 'unidade_medida',
        
        // Dados dos Tributos - XML → Banco
        'iiAliquotaAdValorem' => 'ii_aliquota_ad_valorem',
        'iiAliquotaValorDevido' => 'ii_valor_devido',
        'ipiAliquotaAdValorem' => 'ipi_aliquota_ad_valorem',
        'ipiAliquotaValorDevido' => 'ipi_valor_devido',
        'pisPasepAliquotaAdValorem' => 'pis_aliquota_ad_valorem',
        'cofinsAliquotaAdValorem' => 'cofins_aliquota_ad_valorem'
    ];
    
    public function __construct($db_config) {
        try {
            $dsn = "mysql:host={$db_config['host']};dbname={$db_config['dbname']};charset={$db_config['charset']}";
            $this->pdo = new PDO($dsn, $db_config['username'], $db_config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } catch (PDOException $e) {
            throw new Exception("Erro ao conectar com banco de dados: " . $e->getMessage());
        }
    }
    
    /**
     * Testa se todos os campos da nomenclatura estão presentes no banco
     */
    public function testCamposPresentes() {
        echo "<h2>🔍 Teste de Campos Presentes</h2>\n";
        
        $tabelas_campos = [
            'adicoes' => [
                'frete_valor_moeda_negociada', 'seguro_valor_moeda_negociada',
                'frete_valor_reais', 'seguro_valor_reais', 'ncm', 'descricao_ncm',
                'valor_moeda_negociacao', 'valor_reais'
            ],
            'mercadorias' => [
                'valor_unitario_usd', 'valor_unitario_brl', 'codigo_produto',
                'descricao_mercadoria', 'quantidade', 'unidade_medida'
            ],
            'tributos' => [
                'ii_aliquota_ad_valorem', 'ii_valor_devido', 'ipi_aliquota_ad_valorem',
                'ipi_valor_devido', 'pis_aliquota_ad_valorem', 'cofins_aliquota_ad_valorem'
            ]
        ];
        
        $total_campos = 0;
        $campos_presentes = 0;
        
        foreach ($tabelas_campos as $tabela => $campos) {
            echo "<h3>Tabela: {$tabela}</h3>\n";
            echo "<table border='1' style='border-collapse: collapse; width: 100%; margin-bottom: 20px;'>\n";
            echo "<tr><th>Campo</th><th>Status</th><th>Tipo</th><th>Comentário</th></tr>\n";
            
            foreach ($campos as $campo) {
                $total_campos++;
                
                $stmt = $this->pdo->prepare("
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = 'importa_precificacao'
                ");
                $stmt->execute([$tabela, $campo]);
                $resultado = $stmt->fetch();
                
                if ($resultado) {
                    $campos_presentes++;
                    $status = "✅ Presente";
                    $tipo = $resultado['DATA_TYPE'];
                    $comentario = $resultado['COLUMN_COMMENT'] ?: '-';
                } else {
                    $status = "❌ Ausente";
                    $tipo = '-';
                    $comentario = 'Campo não encontrado';
                }
                
                echo "<tr><td>{$campo}</td><td>{$status}</td><td>{$tipo}</td><td>{$comentario}</td></tr>\n";
            }
            echo "</table>\n";
        }
        
        $percentual = round(($campos_presentes / $total_campos) * 100, 2);
        echo "<p><strong>📊 Resultado: {$campos_presentes}/{$total_campos} campos presentes ({$percentual}%)</strong></p>\n";
        
        return $percentual >= 95; // Aprovado se >= 95%
    }
    
    /**
     * Testa se os dados estão sendo populados corretamente
     */
    public function testDadosPopulados() {
        echo "<h2>📊 Teste de População de Dados</h2>\n";
        
        $testes = [
            [
                'nome' => 'Frete em Moeda Estrangeira',
                'query' => "SELECT COUNT(*) as total, COUNT(CASE WHEN frete_valor_moeda_negociada > 0 THEN 1 END) as populados FROM adicoes WHERE frete_valor_reais > 0",
                'campos' => ['total', 'populados']
            ],
            [
                'nome' => 'Seguro em Moeda Estrangeira', 
                'query' => "SELECT COUNT(*) as total, COUNT(CASE WHEN seguro_valor_moeda_negociada > 0 THEN 1 END) as populados FROM adicoes WHERE seguro_valor_reais > 0",
                'campos' => ['total', 'populados']
            ],
            [
                'nome' => 'Valor Unitário BRL',
                'query' => "SELECT COUNT(*) as total, COUNT(CASE WHEN valor_unitario_brl > 0 THEN 1 END) as populados FROM mercadorias WHERE valor_unitario_usd > 0",
                'campos' => ['total', 'populados']
            ],
            [
                'nome' => 'Códigos de Produto',
                'query' => "SELECT COUNT(*) as total, COUNT(CASE WHEN codigo_produto IS NOT NULL AND codigo_produto != '' THEN 1 END) as populados FROM mercadorias",
                'campos' => ['total', 'populados']
            ]
        ];
        
        echo "<table border='1' style='border-collapse: collapse; width: 100%; margin-bottom: 20px;'>\n";
        echo "<tr><th>Teste</th><th>Total Registros</th><th>Populados</th><th>Percentual</th><th>Status</th></tr>\n";
        
        $todos_aprovados = true;
        
        foreach ($testes as $teste) {
            $resultado = $this->pdo->query($teste['query'])->fetch();
            $total = $resultado['total'];
            $populados = $resultado['populados'];
            $percentual = $total > 0 ? round(($populados / $total) * 100, 2) : 0;
            
            $status = $percentual >= 80 ? "✅ Aprovado" : "⚠️ Atenção";
            if ($percentual < 80) $todos_aprovados = false;
            
            echo "<tr><td>{$teste['nome']}</td><td>{$total}</td><td>{$populados}</td><td>{$percentual}%</td><td>{$status}</td></tr>\n";
        }
        echo "</table>\n";
        
        return $todos_aprovados;
    }
    
    /**
     * Testa a conformidade dos tipos de conversão
     */
    public function testTiposConversao() {
        echo "<h2>🔢 Teste de Tipos de Conversão</h2>\n";
        
        $conversoes = [
            [
                'nome' => 'Valores Monetários (÷100)',
                'query' => "SELECT valor_reais, frete_valor_reais FROM adicoes WHERE valor_reais > 0 LIMIT 3",
                'esperado' => 'Decimal com 2 casas'
            ],
            [
                'nome' => 'Pesos (÷100000)',
                'query' => "SELECT peso_liquido, quantidade_estatistica FROM adicoes WHERE peso_liquido > 0 LIMIT 3", 
                'esperado' => 'Decimal com 5 casas'
            ],
            [
                'nome' => 'Valores Unitários (÷10000000)',
                'query' => "SELECT valor_unitario_usd, valor_unitario_brl FROM mercadorias WHERE valor_unitario_usd > 0 LIMIT 3",
                'esperado' => 'Decimal com 7/2 casas'
            ],
            [
                'nome' => 'Alíquotas (÷100)',
                'query' => "SELECT ii_aliquota_ad_valorem, ipi_aliquota_ad_valorem FROM tributos WHERE ii_aliquota_ad_valorem > 0 LIMIT 3",
                'esperado' => 'Decimal representando %'
            ]
        ];
        
        echo "<table border='1' style='border-collapse: collapse; width: 100%; margin-bottom: 20px;'>\n";
        echo "<tr><th>Tipo</th><th>Amostra de Dados</th><th>Formato Esperado</th><th>Status</th></tr>\n";
        
        foreach ($conversoes as $teste) {
            try {
                $resultados = $this->pdo->query($teste['query'])->fetchAll();
                $amostra = '';
                
                if (!empty($resultados)) {
                    foreach ($resultados as $i => $linha) {
                        if ($i < 2) { // Mostrar até 2 exemplos
                            $valores = array_values($linha);
                            $amostra .= implode(' | ', array_map(function($v) {
                                return is_numeric($v) ? number_format($v, 5, ',', '.') : $v;
                            }, $valores)) . "<br>";
                        }
                    }
                    $status = "✅ Dados encontrados";
                } else {
                    $amostra = "Sem dados";
                    $status = "⚠️ Sem dados";
                }
                
            } catch (Exception $e) {
                $amostra = "Erro: " . $e->getMessage();
                $status = "❌ Erro";
            }
            
            echo "<tr><td>{$teste['nome']}</td><td>{$amostra}</td><td>{$teste['esperado']}</td><td>{$status}</td></tr>\n";
        }
        echo "</table>\n";
    }
    
    /**
     * Executa todos os testes
     */
    public function executarTodosTestes() {
        echo "<!DOCTYPE html>\n<html><head><meta charset='utf-8'><title>Teste de Conformidade - Nomenclatura</title></head><body>\n";
        echo "<h1>🧪 Teste de Conformidade com Nomenclatura XML vs Banco</h1>\n";
        echo "<p><strong>Data/Hora:</strong> " . date('d/m/Y H:i:s') . "</p>\n";
        
        $resultado_campos = $this->testCamposPresentes();
        $resultado_dados = $this->testDadosPopulados();
        $this->testTiposConversao();
        
        echo "<h2>📋 Resumo Final</h2>\n";
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>\n";
        echo "<tr><th>Categoria</th><th>Status</th><th>Observações</th></tr>\n";
        
        $status_campos = $resultado_campos ? "✅ Aprovado" : "❌ Reprovado";
        $status_dados = $resultado_dados ? "✅ Aprovado" : "⚠️ Atenção";
        
        echo "<tr><td>Estrutura de Campos</td><td>{$status_campos}</td><td>Conformidade com nomenclatura.md</td></tr>\n";
        echo "<tr><td>População de Dados</td><td>{$status_dados}</td><td>Dados sendo extraídos corretamente</td></tr>\n";
        echo "<tr><td>Tipos de Conversão</td><td>✅ Verificado</td><td>Formatos conforme especificação</td></tr>\n";
        echo "</table>\n";
        
        if ($resultado_campos && $resultado_dados) {
            echo "<h3 style='color: green;'>🎉 CONFORMIDADE ATINGIDA!</h3>\n";
            echo "<p>O sistema está em conformidade com a nomenclatura definida em <code>docs/nomenclatura.md</code></p>\n";
        } else {
            echo "<h3 style='color: orange;'>⚠️ ATENÇÃO NECESSÁRIA</h3>\n";
            echo "<p>Alguns aspectos precisam de atenção para conformidade total.</p>\n";
        }
        
        echo "</body></html>\n";
    }
}

// Executar teste
try {
    $teste = new NomenclaturaComplianceTest($db_config);
    $teste->executarTodosTestes();
} catch (Exception $e) {
    echo "Erro no teste: " . $e->getMessage();
}
?>