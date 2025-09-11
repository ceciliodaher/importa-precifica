<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consultar Dados - Sistema Importa Precifica</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
<?php
// Configuração do banco
$db_config = [
    'host' => 'localhost',
    'dbname' => 'importa_precificacao', 
    'username' => 'root',
    'password' => ''
];

$pdo = null;
$erro_conexao = null;

try {
    $dsn = "mysql:host={$db_config['host']};dbname={$db_config['dbname']};charset=utf8mb4";
    $pdo = new PDO($dsn, $db_config['username'], $db_config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    $erro_conexao = $e->getMessage();
}

// Função para executar consulta
function executarConsulta($pdo, $sql, $params = []) {
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        return ['erro' => $e->getMessage()];
    }
}

// Obter estatísticas
$stats = [];
if ($pdo) {
    $stats['total_dis'] = executarConsulta($pdo, "SELECT COUNT(*) as total FROM declaracoes_importacao")[0]['total'] ?? 0;
    $stats['total_adicoes'] = executarConsulta($pdo, "SELECT COUNT(*) as total FROM adicoes")[0]['total'] ?? 0;
    $stats['total_mercadorias'] = executarConsulta($pdo, "SELECT COUNT(*) as total FROM mercadorias")[0]['total'] ?? 0;
    $stats['total_importadores'] = executarConsulta($pdo, "SELECT COUNT(*) as total FROM importadores")[0]['total'] ?? 0;
}
?>

<div class="container-fluid py-4">
    <div class="row">
        <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="h3 text-primary">
                    <i class="fas fa-search me-2"></i>
                    Consultar Dados do Sistema
                </h1>
                <div class="badge bg-info fs-6">
                    Base: <?php echo $db_config['dbname']; ?>
                </div>
            </div>

            <?php if ($erro_conexao): ?>
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Erro de Conexão</h5>
                <p><strong>Erro:</strong> <?php echo htmlspecialchars($erro_conexao); ?></p>
                <hr>
                <h6>Soluções:</h6>
                <ul class="mb-0">
                    <li>Verificar se o MySQL está rodando</li>
                    <li>Executar o script de criação: <code>mysql -u root -p &lt; sql/create_database_importa_precifica.sql</code></li>
                    <li>Conferir credenciais de acesso</li>
                    <li>No ServBay/WAMP: verificar se os serviços estão ativos</li>
                </ul>
            </div>
            <?php else: ?>

            <!-- Estatísticas -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3><?php echo number_format($stats['total_dis']); ?></h3>
                            <small>Declarações de Importação</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h3><?php echo number_format($stats['total_adicoes']); ?></h3>
                            <small>Adições</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3><?php echo number_format($stats['total_mercadorias']); ?></h3>
                            <small>Mercadorias</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body text-center">
                            <h3><?php echo number_format($stats['total_importadores']); ?></h3>
                            <small>Importadores</small>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Consultas Rápidas -->
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header bg-dark text-white">
                            <h6 class="mb-0"><i class="fas fa-bolt me-2"></i>Consultas Rápidas</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="list-group list-group-flush">
                                <a href="#" class="list-group-item list-group-item-action" onclick="mostrarTabela('dis')">
                                    <i class="fas fa-file-alt me-2"></i>Ver todas as DIs
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="mostrarTabela('importadores')">
                                    <i class="fas fa-building me-2"></i>Ver importadores
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="mostrarTabela('adicoes')">
                                    <i class="fas fa-plus me-2"></i>Ver adições
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="mostrarTabela('mercadorias')">
                                    <i class="fas fa-box me-2"></i>Ver mercadorias
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="mostrarTabela('tributos')">
                                    <i class="fas fa-percent me-2"></i>Ver tributos
                                </a>
                                <a href="#" class="list-group-item list-group-item-action" onclick="executarConsultaPersonalizada('status_tabelas')">
                                    <i class="fas fa-table me-2"></i>Status das tabelas
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Busca Específica -->
                    <div class="card mt-3">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="fas fa-search me-2"></i>Buscar DI Específica</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <input type="text" class="form-control" id="numeroDI" placeholder="Digite o número da DI" maxlength="12">
                            </div>
                            <button class="btn btn-primary w-100" onclick="buscarDI()">
                                <i class="fas fa-search me-2"></i>Buscar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Resultados -->
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header bg-success text-white d-flex justify-content-between">
                            <h6 class="mb-0">
                                <i class="fas fa-table me-2"></i>
                                <span id="titulo-resultado">Resultados</span>
                            </h6>
                            <small id="contador-resultado"></small>
                        </div>
                        <div class="card-body p-0">
                            <div id="resultado-consulta" class="p-4 text-center text-muted">
                                <i class="fas fa-database fa-3x mb-3"></i>
                                <p>Selecione uma consulta ao lado para ver os dados</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <?php endif; ?>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
async function mostrarTabela(tabela) {
    const titulo = document.getElementById('titulo-resultado');
    const contador = document.getElementById('contador-resultado');
    const resultado = document.getElementById('resultado-consulta');
    
    titulo.textContent = `Carregando ${tabela}...`;
    contador.textContent = '';
    resultado.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Carregando...</div>';
    
    try {
        const response = await fetch(`?acao=consultar&tabela=${tabela}`);
        const data = await response.json();
        
        if (data.erro) {
            throw new Error(data.erro);
        }
        
        titulo.textContent = `Tabela: ${tabela}`;
        contador.textContent = `${data.length} registros`;
        
        if (data.length === 0) {
            resultado.innerHTML = '<div class="text-center p-4 text-muted"><i class="fas fa-inbox fa-2x mb-3"></i><br>Nenhum registro encontrado</div>';
            return;
        }
        
        // Criar tabela
        let html = '<div class="table-responsive"><table class="table table-striped table-hover mb-0"><thead class="table-dark">';
        
        // Cabeçalhos
        const colunas = Object.keys(data[0]);
        html += '<tr>';
        colunas.forEach(coluna => {
            html += `<th>${coluna}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Dados (limitar a 50 registros para não sobrecarregar)
        const limite = Math.min(data.length, 50);
        for (let i = 0; i < limite; i++) {
            html += '<tr>';
            colunas.forEach(coluna => {
                let valor = data[i][coluna];
                
                // Formatação especial
                if (valor === null || valor === '') {
                    valor = '<span class="text-muted">-</span>';
                } else if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
                    // Data
                    valor = new Date(valor).toLocaleDateString('pt-BR');
                } else if (typeof valor === 'number' && coluna.includes('valor')) {
                    // Valor monetário
                    valor = 'R$ ' + valor.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                }
                
                html += `<td>${valor}</td>`;
            });
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
        
        if (data.length > 50) {
            html += `<div class="text-center p-3 bg-light"><small class="text-muted">Mostrando primeiros 50 de ${data.length} registros</small></div>`;
        }
        
        resultado.innerHTML = html;
        
    } catch (error) {
        titulo.textContent = 'Erro';
        contador.textContent = '';
        resultado.innerHTML = `<div class="alert alert-danger m-3"><strong>Erro:</strong> ${error.message}</div>`;
    }
}

async function buscarDI() {
    const numeroDI = document.getElementById('numeroDI').value.trim();
    
    if (!numeroDI) {
        alert('Digite o número da DI');
        return;
    }
    
    if (!/^\d{11,12}$/.test(numeroDI)) {
        alert('Número da DI deve ter 11 ou 12 dígitos');
        return;
    }
    
    const titulo = document.getElementById('titulo-resultado');
    const contador = document.getElementById('contador-resultado');
    const resultado = document.getElementById('resultado-consulta');
    
    titulo.textContent = `Buscando DI ${numeroDI}...`;
    contador.textContent = '';
    resultado.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Buscando...</div>';
    
    try {
        const response = await fetch(`?acao=buscar_di&numero_di=${numeroDI}`);
        const data = await response.json();
        
        if (data.erro) {
            throw new Error(data.erro);
        }
        
        titulo.textContent = `DI: ${numeroDI}`;
        contador.textContent = 'Dados completos';
        
        // Mostrar dados da DI de forma estruturada
        let html = '<div class="p-3">';
        
        // Informações básicas
        html += '<h6 class="text-primary">Informações Básicas</h6>';
        html += '<table class="table table-sm">';
        html += `<tr><td><strong>Número DI:</strong></td><td>${data.numero_di}</td></tr>`;
        html += `<tr><td><strong>Data Registro:</strong></td><td>${new Date(data.data_registro).toLocaleDateString('pt-BR')}</td></tr>`;
        html += `<tr><td><strong>Importador:</strong></td><td>${data.importador_nome}</td></tr>`;
        html += `<tr><td><strong>UF:</strong></td><td>${data.importador_uf}</td></tr>`;
        html += '</table>';
        
        // Estatísticas
        html += '<h6 class="text-success mt-4">Estatísticas</h6>';
        html += '<div class="row">';
        html += `<div class="col-md-3"><div class="card bg-light"><div class="card-body text-center"><h5>${data.total_adicoes || 0}</h5><small>Adições</small></div></div></div>`;
        html += `<div class="col-md-3"><div class="card bg-light"><div class="card-body text-center"><h5>R$ ${parseFloat(data.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h5><small>Valor Total</small></div></div></div>`;
        html += `<div class="col-md-3"><div class="card bg-light"><div class="card-body text-center"><h5>${parseFloat(data.carga_peso_liquido || 0).toLocaleString('pt-BR')} kg</h5><small>Peso Líquido</small></div></div></div>`;
        html += `<div class="col-md-3"><div class="card bg-light"><div class="card-body text-center"><h5>${data.carga_pais_procedencia_nome || 'N/A'}</h5><small>País Origem</small></div></div></div>`;
        html += '</div>';
        
        html += '</div>';
        resultado.innerHTML = html;
        
    } catch (error) {
        titulo.textContent = 'DI não encontrada';
        contador.textContent = '';
        resultado.innerHTML = `<div class="alert alert-warning m-3"><strong>Atenção:</strong> ${error.message}</div>`;
    }
}

async function executarConsultaPersonalizada(tipo) {
    const titulo = document.getElementById('titulo-resultado');
    const contador = document.getElementById('contador-resultado');
    const resultado = document.getElementById('resultado-consulta');
    
    titulo.textContent = 'Executando consulta...';
    contador.textContent = '';
    resultado.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Processando...</div>';
    
    try {
        const response = await fetch(`?acao=${tipo}`);
        const data = await response.json();
        
        if (data.erro) {
            throw new Error(data.erro);
        }
        
        titulo.textContent = 'Status das Tabelas';
        contador.textContent = `${data.length} tabelas`;
        
        let html = '<div class="table-responsive"><table class="table table-striped mb-0">';
        html += '<thead class="table-dark"><tr><th>Tabela</th><th>Registros</th><th>Status</th></tr></thead><tbody>';
        
        data.forEach(item => {
            const status = item.total > 0 ? '<span class="badge bg-success">Com dados</span>' : '<span class="badge bg-secondary">Vazia</span>';
            html += `<tr><td><strong>${item.tabela}</strong></td><td>${item.total.toLocaleString()}</td><td>${status}</td></tr>`;
        });
        
        html += '</tbody></table></div>';
        resultado.innerHTML = html;
        
    } catch (error) {
        titulo.textContent = 'Erro';
        contador.textContent = '';
        resultado.innerHTML = `<div class="alert alert-danger m-3"><strong>Erro:</strong> ${error.message}</div>`;
    }
}
</script>

<?php
// Processar requisições AJAX
if (isset($_GET['acao']) && $pdo) {
    header('Content-Type: application/json');
    
    switch ($_GET['acao']) {
        case 'consultar':
            $tabela = $_GET['tabela'] ?? '';
            $tabelas_permitidas = ['declaracoes_importacao', 'importadores', 'adicoes', 'mercadorias', 'tributos', 'fornecedores', 'fabricantes', 'icms', 'despesas_aduaneiras', 'pagamentos', 'acrescimos'];
            
            if (!in_array($tabela, $tabelas_permitidas)) {
                echo json_encode(['erro' => 'Tabela não permitida']);
                exit;
            }
            
            // Mapear nomes amigáveis
            $tabela_real = $tabela;
            if ($tabela === 'dis') $tabela_real = 'declaracoes_importacao';
            
            $resultado = executarConsulta($pdo, "SELECT * FROM `$tabela_real` ORDER BY created_at DESC LIMIT 100");
            echo json_encode($resultado);
            break;
            
        case 'buscar_di':
            $numero_di = $_GET['numero_di'] ?? '';
            if (!preg_match('/^\d{11,12}$/', $numero_di)) {
                echo json_encode(['erro' => 'Número de DI inválido']);
                exit;
            }
            
            $sql = "SELECT di.*, imp.nome as importador_nome, imp.endereco_uf as importador_uf,
                           COALESCE(SUM(a.valor_reais), 0) as valor_total
                    FROM declaracoes_importacao di
                    LEFT JOIN importadores imp ON di.importador_id = imp.id
                    LEFT JOIN adicoes a ON di.numero_di = a.numero_di
                    WHERE di.numero_di = ?
                    GROUP BY di.numero_di";
                    
            $resultado = executarConsulta($pdo, $sql, [$numero_di]);
            
            if (empty($resultado)) {
                echo json_encode(['erro' => 'DI não encontrada']);
            } else {
                echo json_encode($resultado[0]);
            }
            break;
            
        case 'status_tabelas':
            $tabelas = [
                'declaracoes_importacao' => 'Declarações de Importação',
                'importadores' => 'Importadores',
                'adicoes' => 'Adições',
                'mercadorias' => 'Mercadorias',
                'tributos' => 'Tributos',
                'fornecedores' => 'Fornecedores',
                'fabricantes' => 'Fabricantes',
                'icms' => 'ICMS',
                'despesas_aduaneiras' => 'Despesas Aduaneiras',
                'pagamentos' => 'Pagamentos',
                'acrescimos' => 'Acréscimos',
                'importacoes_log' => 'Log de Importações',
                'calculos_salvos' => 'Cálculos Salvos'
            ];
            
            $resultado = [];
            foreach ($tabelas as $tabela => $nome) {
                $count = executarConsulta($pdo, "SELECT COUNT(*) as total FROM `$tabela`");
                $resultado[] = [
                    'tabela' => $nome,
                    'total' => $count[0]['total'] ?? 0
                ];
            }
            
            echo json_encode($resultado);
            break;
            
        default:
            echo json_encode(['erro' => 'Ação não reconhecida']);
    }
    exit;
}
?>

</body>
</html>