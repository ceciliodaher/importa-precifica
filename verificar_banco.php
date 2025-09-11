<?php
/**
 * Script de Verificação do Banco de Dados
 * Verifica se todas as tabelas foram criadas corretamente
 */

// Configuração da conexão
$host = 'localhost';
$dbname = 'importa_precificacao';
$username = 'root';
$password = '';

try {
    // Conectar ao banco
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Conexão com banco '$dbname' estabelecida com sucesso!\n\n";
    
    // Verificar versão do MySQL
    $stmt = $pdo->query("SELECT VERSION() as version");
    $version = $stmt->fetch()['version'];
    echo "📊 Versão do MySQL: $version\n\n";
    
    // Listar todas as tabelas
    echo "📋 TABELAS CRIADAS:\n";
    echo str_repeat("=", 50) . "\n";
    
    $stmt = $pdo->query("SHOW TABLES");
    $tabelas = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $tabelas_esperadas = [
        'declaracoes_importacao',
        'importadores', 
        'adicoes',
        'mercadorias',
        'tributos',
        'fornecedores',
        'fabricantes',
        'icms',
        'despesas_aduaneiras',
        'pagamentos',
        'acrescimos',
        'importacoes_log',
        'calculos_salvos'
    ];
    
    foreach ($tabelas_esperadas as $tabela_esperada) {
        if (in_array($tabela_esperada, $tabelas)) {
            echo "✅ $tabela_esperada\n";
        } else {
            echo "❌ $tabela_esperada (FALTANDO!)\n";
        }
    }
    
    echo "\n📈 VIEWS CRIADAS:\n";
    echo str_repeat("=", 30) . "\n";
    
    $stmt = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
    $views = $stmt->fetchAll();
    
    $views_esperadas = ['view_dis_resumo', 'view_tributos_resumo', 'view_produtos_completo'];
    
    foreach ($views_esperadas as $view_esperada) {
        $encontrou = false;
        foreach ($views as $view) {
            if ($view['Tables_in_' . $dbname] === $view_esperada) {
                echo "✅ $view_esperada\n";
                $encontrou = true;
                break;
            }
        }
        if (!$encontrou) {
            echo "❌ $view_esperada (FALTANDO!)\n";
        }
    }
    
    echo "\n📊 ESTATÍSTICAS DAS TABELAS:\n";
    echo str_repeat("=", 40) . "\n";
    
    foreach ($tabelas as $tabela) {
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM `$tabela`");
            $stmt->execute();
            $total = $stmt->fetch()['total'];
            
            printf("%-25s: %s registros\n", $tabela, number_format($total));
        } catch (Exception $e) {
            printf("%-25s: ERRO ao contar\n", $tabela);
        }
    }
    
    echo "\n🔍 TESTE DE INTEGRIDADE:\n";
    echo str_repeat("=", 35) . "\n";
    
    // Testar relacionamentos
    try {
        $stmt = $pdo->query("
            SELECT COUNT(*) as total 
            FROM declaracoes_importacao di 
            JOIN importadores imp ON di.importador_id = imp.id
        ");
        $relacionamento_di_imp = $stmt->fetch()['total'];
        echo "✅ Relacionamento DI -> Importadores: $relacionamento_di_imp registros\n";
        
        $stmt = $pdo->query("
            SELECT COUNT(*) as total 
            FROM adicoes a 
            JOIN declaracoes_importacao di ON a.numero_di = di.numero_di
        ");
        $relacionamento_adicoes_di = $stmt->fetch()['total'];
        echo "✅ Relacionamento Adições -> DI: $relacionamento_adicoes_di registros\n";
        
        $stmt = $pdo->query("
            SELECT COUNT(*) as total 
            FROM mercadorias m 
            JOIN adicoes a ON m.adicao_id = a.id
        ");
        $relacionamento_merc_adicoes = $stmt->fetch()['total'];
        echo "✅ Relacionamento Mercadorias -> Adições: $relacionamento_merc_adicoes registros\n";
        
    } catch (Exception $e) {
        echo "❌ Erro no teste de relacionamentos: " . $e->getMessage() . "\n";
    }
    
    echo "\n🎯 STATUS GERAL: ";
    if (count($tabelas) >= count($tabelas_esperadas)) {
        echo "✅ BANCO CRIADO CORRETAMENTE!\n";
    } else {
        echo "❌ BANCO INCOMPLETO - Execute o script SQL novamente\n";
    }
    
} catch (PDOException $e) {
    echo "❌ ERRO DE CONEXÃO:\n";
    echo "Erro: " . $e->getMessage() . "\n\n";
    echo "📋 SOLUÇÕES POSSÍVEIS:\n";
    echo "1. Verificar se MySQL está rodando\n";
    echo "2. Conferir usuário/senha (padrão: root sem senha)\n";
    echo "3. Criar o banco primeiro: mysql -u root -p < sql/create_database_importa_precifica.sql\n";
    echo "4. No ServBay/WAMP: verificar se serviços estão ativos\n";
}
?>