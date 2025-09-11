<?php
/**
 * XML Import Processor
 * Sistema Expertzy - Processador de Importação de XMLs DI
 * Reutiliza lógica do povoar_importa_precifica.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configurações do banco de dados
$db_config = [
    'host' => 'localhost:3307',
    'dbname' => 'importa_precificacao',
    'username' => 'root',
    'password' => 'ServBay.dev',
    'charset' => 'utf8mb4'
];

class ImportLogger {
    private $logFile;
    
    public function __construct() {
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        $this->logFile = $logDir . '/import-log-' . date('Y-m-d') . '.json';
    }
    
    public function log($level, $message, $context = []) {
        $entry = [
            'timestamp' => date('c'),
            'level' => $level,
            'message' => $message,
            'context' => $context
        ];
        
        $logs = $this->getLogs();
        $logs[] = $entry;
        file_put_contents($this->logFile, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    public function getLogs() {
        if (!file_exists($this->logFile)) {
            return [];
        }
        $content = file_get_contents($this->logFile);
        return json_decode($content, true) ?: [];
    }
    
    public function exportLogs() {
        return [
            'filename' => basename($this->logFile),
            'logs' => $this->getLogs(),
            'total_entries' => count($this->getLogs())
        ];
    }
}

class XMLImportProcessor {
    private $pdo;
    private $logger;
    private $stats = [
        'dis_processadas' => 0,
        'adicoes_inseridas' => 0,
        'mercadorias_inseridas' => 0,
        'erros' => 0
    ];
    
    public function __construct($db_config) {
        $this->logger = new ImportLogger();
        
        try {
            $dsn = "mysql:host={$db_config['host']};dbname={$db_config['dbname']};charset={$db_config['charset']}";
            $this->pdo = new PDO($dsn, $db_config['username'], $db_config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$db_config['charset']} COLLATE {$db_config['charset']}_unicode_ci"
            ]);
            
            $this->logger->log('info', 'Conexão com banco de dados estabelecida', [
                'host' => $db_config['host'],
                'database' => $db_config['dbname']
            ]);
        } catch (PDOException $e) {
            $this->logger->log('error', 'Erro ao conectar com banco de dados', [
                'error' => $e->getMessage(),
                'host' => $db_config['host'],
                'database' => $db_config['dbname']
            ]);
            throw new Exception("Erro ao conectar com banco de dados: " . $e->getMessage());
        }
    }
    
    /**
     * Processa um arquivo XML de DI
     */
    public function processXML($xmlContent, $filename = 'unknown.xml') {
        $this->logger->log('info', 'Iniciando processamento de XML', [
            'filename' => $filename,
            'xml_size' => strlen($xmlContent)
        ]);
        
        try {
            // Parse XML
            $xml = simplexml_load_string($xmlContent);
            if ($xml === false) {
                $this->logger->log('error', 'XML inválido ou mal formado', [
                    'filename' => $filename,
                    'xml_preview' => substr($xmlContent, 0, 200)
                ]);
                throw new Exception("XML inválido ou mal formado");
            }
            
            // Verificar estrutura DI
            if (!isset($xml->declaracaoImportacao)) {
                $this->logger->log('error', 'XML não contém declaração de importação', [
                    'filename' => $filename,
                    'root_elements' => array_keys((array)$xml)
                ]);
                throw new Exception("XML não contém declaração de importação");
            }
            
            $result = [];
            $total_dis = count($xml->declaracaoImportacao);
            
            $this->logger->log('info', 'Processando DIs do XML', [
                'filename' => $filename,
                'total_dis' => $total_dis
            ]);
            
            // Processar cada DI no arquivo
            foreach ($xml->declaracaoImportacao as $declaracao) {
                $diResult = $this->processDeclaracaoImportacao($declaracao, $xmlContent);
                $result[] = $diResult;
            }
            
            $this->logger->log('success', 'XML processado com sucesso', [
                'filename' => $filename,
                'stats' => [
                    'dis_processadas' => $this->stats['dis_processadas'],
                    'adicoes' => $this->stats['adicoes_inseridas'],
                    'mercadorias' => $this->stats['mercadorias_inseridas'],
                    'erros' => $this->stats['erros']
                ]
            ]);
            
            return [
                'success' => true,
                'dis_processadas' => $this->stats['dis_processadas'],
                'details' => [
                    'adicoes' => $this->stats['adicoes_inseridas'],
                    'mercadorias' => $this->stats['mercadorias_inseridas']
                ],
                'results' => $result
            ];
            
        } catch (Exception $e) {
            $this->stats['erros']++;
            $this->logger->log('error', 'Erro no processamento de XML', [
                'filename' => $filename,
                'error' => $e->getMessage(),
                'stats_at_error' => $this->stats
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Processa uma declaração de importação individual
     */
    private function processDeclaracaoImportacao($declaracao, $xmlOriginal) {
        $this->pdo->beginTransaction();
        
        try {
            // Extrair número da DI
            $numero_di = $this->getFirstValue($declaracao, ['numeroDI', 'numero_di']);
            
            $this->logger->log('info', 'Processando DI individual', [
                'numero_di' => $numero_di
            ]);
            
            // Verificar se DI já existe
            $stmt = $this->pdo->prepare("SELECT numero_di FROM declaracoes_importacao WHERE numero_di = ?");
            $stmt->execute([$numero_di]);
            if ($stmt->fetch()) {
                $this->pdo->rollback();
                
                $this->logger->log('warning', 'DI duplicada encontrada', [
                    'numero_di' => $numero_di,
                    'action' => 'skipped'
                ]);
                
                return [
                    'numero_di' => $numero_di,
                    'status' => 'duplicate',
                    'message' => 'DI já existe no banco'
                ];
            }
            
            // Processar importador
            $importador_id = $this->processImportador($declaracao);
            
            // Processar DI principal
            $this->processDIPrincipal($declaracao, $importador_id, $xmlOriginal);
            
            // Processar adições
            $adicoes_count = $this->processAdicoes($declaracao, $numero_di);
            
            // ICMS não é processado da DI - calculado no frontend via aliquotas.json
            // $this->processICMS($declaracao, $numero_di);
            
            // Processar pagamentos e acréscimos
            $this->processPagamentos($declaracao, $numero_di);
            $this->processAcrescimos($declaracao, $numero_di);
            
            $this->pdo->commit();
            $this->stats['dis_processadas']++;
            
            $this->logger->log('success', 'DI processada com sucesso', [
                'numero_di' => $numero_di,
                'adicoes_inseridas' => $adicoes_count,
                'importador_id' => $importador_id
            ]);
            
            return [
                'numero_di' => $numero_di,
                'status' => 'success',
                'adicoes' => $adicoes_count
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            $this->stats['erros']++;
            
            $this->logger->log('error', 'Erro ao processar DI', [
                'numero_di' => $numero_di ?? 'desconhecido',
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }
    
    /**
     * Processa dados do importador
     */
    private function processImportador($declaracao) {
        $cnpj = $this->getFirstValue($declaracao, ['importadorNumero', 'importador_numero']);
        $nome = $this->getFirstValue($declaracao, ['importadorNome', 'importador_nome']);
        
        // Verificar se importador já existe
        $stmt = $this->pdo->prepare("SELECT id FROM importadores WHERE cnpj = ?");
        $stmt->execute([$cnpj]);
        $importador = $stmt->fetch();
        
        if ($importador) {
            return $importador['id'];
        }
        
        // Inserir novo importador
        $sql = "INSERT INTO importadores (
            cnpj, nome, endereco_logradouro, endereco_numero, endereco_complemento,
            endereco_bairro, endereco_cidade, endereco_municipio, endereco_uf, endereco_cep,
            representante_nome, representante_cpf, telefone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $cnpj,
            $nome,
            $this->getFirstValue($declaracao, ['importadorEnderecoLogradouro']),
            $this->getFirstValue($declaracao, ['importadorEnderecoNumero']),
            $this->getFirstValue($declaracao, ['importadorEnderecoComplemento']),
            $this->getFirstValue($declaracao, ['importadorEnderecoBairro']),
            $this->getFirstValue($declaracao, ['importadorEnderecoCidade']),
            $this->getFirstValue($declaracao, ['importadorEnderecoMunicipio']),
            $this->getFirstValue($declaracao, ['importadorEnderecoUf', 'importador_endereco_uf']),
            $this->getFirstValue($declaracao, ['importadorEnderecoCep']),
            $this->getFirstValue($declaracao, ['importadorNomeRepresentanteLegal']),
            $this->getFirstValue($declaracao, ['importadorCpfRepresentanteLegal']),
            $this->getFirstValue($declaracao, ['importadorNumeroTelefone'])
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Processa dados principais da DI
     */
    private function processDIPrincipal($declaracao, $importador_id, $xmlOriginal) {
        $numero_di = $this->getFirstValue($declaracao, ['numeroDI', 'numero_di']);
        $data_registro = $this->getFirstValue($declaracao, ['dataRegistro', 'data_registro']);
        
        // Converter data
        if (strlen($data_registro) === 8) {
            $data_registro = substr($data_registro, 0, 4) . '-' . 
                           substr($data_registro, 4, 2) . '-' . 
                           substr($data_registro, 6, 2);
        }
        
        // Contar adições
        $total_adicoes = 0;
        if (isset($declaracao->adicao)) {
            $total_adicoes = count($declaracao->adicao);
        }
        
        $sql = "INSERT INTO declaracoes_importacao (
            numero_di, data_registro, importador_id, urf_despacho_codigo, urf_despacho_nome,
            modalidade_codigo, modalidade_nome, situacao_entrega, total_adicoes,
            carga_peso_bruto, carga_peso_liquido, carga_pais_procedencia_codigo,
            carga_pais_procedencia_nome, carga_urf_entrada_codigo, carga_urf_entrada_nome,
            carga_data_chegada, xml_original
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $data_chegada = $this->getFirstValue($declaracao, ['cargaDataChegada']);
        if (strlen($data_chegada) === 8) {
            $data_chegada = substr($data_chegada, 0, 4) . '-' . 
                          substr($data_chegada, 4, 2) . '-' . 
                          substr($data_chegada, 6, 2);
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $numero_di,
            $data_registro,
            $importador_id,
            $this->getFirstValue($declaracao, ['urfDespachoCodigo']),
            $this->getFirstValue($declaracao, ['urfDespachoNome']),
            $this->getFirstValue($declaracao, ['modalidadeDespachoCodigo']),
            $this->getFirstValue($declaracao, ['modalidadeDespachoNome']),
            $this->getFirstValue($declaracao, ['situacaoEntregaCarga']),
            $total_adicoes,
            $this->convertValue($this->getFirstValue($declaracao, ['cargaPesoBruto']), 'weight'),
            $this->convertValue($this->getFirstValue($declaracao, ['cargaPesoLiquido']), 'weight'),
            $this->getFirstValue($declaracao, ['cargaPaisProcedenciaCodigo']),
            $this->getFirstValue($declaracao, ['cargaPaisProcedenciaNome']),
            $this->getFirstValue($declaracao, ['cargaUrfEntradaCodigo']),
            $this->getFirstValue($declaracao, ['cargaUrfEntradaNome']),
            $data_chegada ?: null,
            $xmlOriginal
        ]);
    }
    
    /**
     * Processa adições da DI
     */
    private function processAdicoes($declaracao, $numero_di) {
        if (!isset($declaracao->adicao)) {
            return 0;
        }
        
        $count = 0;
        foreach ($declaracao->adicao as $adicao) {
            $this->processAdicao($adicao, $numero_di);
            $count++;
        }
        
        $this->stats['adicoes_inseridas'] += $count;
        return $count;
    }
    
    /**
     * Processa uma adição individual
     */
    private function processAdicao($adicao, $numero_di) {
        // Processar fornecedor e fabricante
        $fornecedor_id = $this->processFornecedor($adicao);
        $fabricante_id = $this->processFabricante($adicao);
        
        // Inserir adição
        $sql = "INSERT INTO adicoes (
            numero_di, numero_adicao, ncm, descricao_ncm, peso_liquido, quantidade_estatistica,
            unidade_estatistica, aplicacao_mercadoria, condicao_mercadoria, condicao_venda_incoterm,
            condicao_venda_local, moeda_negociacao_codigo, moeda_negociacao_nome,
            valor_moeda_negociacao, valor_reais, frete_valor_moeda_negociada, frete_valor_reais, 
            seguro_valor_moeda_negociada, seguro_valor_reais, fornecedor_id, fabricante_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $numero_di,
            $this->getFirstValue($adicao, ['numeroAdicao']),
            $this->getFirstValue($adicao, ['dadosMercadoriaCodigoNcm']),
            $this->getFirstValue($adicao, ['dadosMercadoriaNomeNcm']),
            $this->convertValue($this->getFirstValue($adicao, ['dadosMercadoriaPesoLiquido']), 'weight'),
            $this->convertValue($this->getFirstValue($adicao, ['dadosMercadoriaMedidaEstatisticaQuantidade']), 'weight'),
            $this->getFirstValue($adicao, ['dadosMercadoriaMedidaEstatisticaUnidade']),
            $this->getFirstValue($adicao, ['dadosMercadoriaAplicacao']),
            $this->getFirstValue($adicao, ['dadosMercadoriaCondicao']),
            $this->getFirstValue($adicao, ['condicaoVendaIncoterm']),
            $this->getFirstValue($adicao, ['condicaoVendaLocal']),
            $this->getFirstValue($adicao, ['condicaoVendaMoedaCodigo']),
            $this->getFirstValue($adicao, ['condicaoVendaMoedaNome']),
            $this->convertValue($this->getFirstValue($adicao, ['condicaoVendaValorMoeda']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['condicaoVendaValorReais']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['freteValorMoedaNegociada']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['freteValorReais']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['seguroValorMoedaNegociada']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['seguroValorReais']), 'monetary'),
            $fornecedor_id,
            $fabricante_id
        ]);
        
        $adicao_id = $this->pdo->lastInsertId();
        
        // Processar tributos
        $this->processTributos($adicao, $adicao_id);
        
        // Processar mercadorias
        $this->processMercadorias($adicao, $adicao_id);
    }
    
    /**
     * Processa tributos da adição
     */
    private function processTributos($adicao, $adicao_id) {
        $sql = "INSERT INTO tributos (
            adicao_id, ii_aliquota_ad_valorem, ii_base_calculo, ii_valor_calculado,
            ii_valor_devido, ii_valor_recolher, ipi_aliquota_ad_valorem, ipi_valor_devido,
            ipi_valor_recolher, pis_aliquota_ad_valorem, pis_valor_devido, pis_valor_recolher,
            cofins_aliquota_ad_valorem, cofins_valor_devido, cofins_valor_recolher
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $adicao_id,
            $this->convertValue($this->getFirstValue($adicao, ['iiAliquotaAdValorem']), 'percentage'),
            $this->convertValue($this->getFirstValue($adicao, ['iiBaseCalculo']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['iiAliquotaValorCalculado']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['iiAliquotaValorDevido']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['iiAliquotaValorRecolher']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['ipiAliquotaAdValorem']), 'percentage'),
            $this->convertValue($this->getFirstValue($adicao, ['ipiAliquotaValorDevido']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['ipiAliquotaValorRecolher']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['pisPasepAliquotaAdValorem']), 'percentage'),
            $this->convertValue($this->getFirstValue($adicao, ['pisPasepAliquotaValorDevido']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['pisPasepAliquotaValorRecolher']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['cofinsAliquotaAdValorem']), 'percentage'),
            $this->convertValue($this->getFirstValue($adicao, ['cofinsAliquotaValorDevido']), 'monetary'),
            $this->convertValue($this->getFirstValue($adicao, ['cofinsAliquotaValorRecolher']), 'monetary')
        ]);
    }
    
    /**
     * Processa mercadorias da adição
     */
    private function processMercadorias($adicao, $adicao_id) {
        if (!isset($adicao->mercadoria)) {
            return;
        }
        
        // Obter taxa de câmbio da adição para cálculo BRL
        $valor_usd = $this->convertValue($this->getFirstValue($adicao, ['condicaoVendaValorMoeda']), 'monetary');
        $valor_brl = $this->convertValue($this->getFirstValue($adicao, ['condicaoVendaValorReais']), 'monetary');
        $taxa_cambio = ($valor_usd > 0 && $valor_brl > 0) ? ($valor_brl / $valor_usd) : 5.5; // Taxa padrão como fallback
        
        foreach ($adicao->mercadoria as $mercadoria) {
            $valor_unitario_usd = $this->convertValue($this->getFirstValue($mercadoria, ['valorUnitario']), 'unit_value');
            $valor_unitario_brl = $valor_unitario_usd * $taxa_cambio;
            
            $sql = "INSERT INTO mercadorias (
                adicao_id, numero_sequencial_item, descricao_mercadoria, quantidade,
                unidade_medida, valor_unitario_usd, valor_unitario_brl, codigo_produto
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $adicao_id,
                $this->getFirstValue($mercadoria, ['numeroSequencialItem']),
                $this->getFirstValue($mercadoria, ['descricaoMercadoria']),
                $this->convertValue($this->getFirstValue($mercadoria, ['quantidade']), 'weight'),
                $this->getFirstValue($mercadoria, ['unidadeMedida']),
                $valor_unitario_usd,
                $valor_unitario_brl,
                $this->getFirstValue($mercadoria, ['codigoMercadoria', 'codigoProduto', 'codigo'])
            ]);
            
            $this->stats['mercadorias_inseridas']++;
        }
    }
    
    /**
     * Processa fornecedor
     */
    private function processFornecedor($adicao) {
        $nome = $this->getFirstValue($adicao, ['fornecedorNome']);
        if (!$nome) return null;
        
        $stmt = $this->pdo->prepare("SELECT id FROM fornecedores WHERE nome = ?");
        $stmt->execute([$nome]);
        $fornecedor = $stmt->fetch();
        
        if ($fornecedor) return $fornecedor['id'];
        
        $sql = "INSERT INTO fornecedores (nome, cidade, estado, pais, logradouro, numero, complemento) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $nome,
            $this->getFirstValue($adicao, ['fornecedorCidade']),
            $this->getFirstValue($adicao, ['fornecedorEstado']),
            $this->getFirstValue($adicao, ['fornecedorPais']),
            $this->getFirstValue($adicao, ['fornecedorLogradouro']),
            $this->getFirstValue($adicao, ['fornecedorNumero']),
            $this->getFirstValue($adicao, ['fornecedorComplemento'])
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Processa fabricante
     */
    private function processFabricante($adicao) {
        $nome = $this->getFirstValue($adicao, ['fabricanteNome']);
        if (!$nome) return null;
        
        $stmt = $this->pdo->prepare("SELECT id FROM fabricantes WHERE nome = ?");
        $stmt->execute([$nome]);
        $fabricante = $stmt->fetch();
        
        if ($fabricante) return $fabricante['id'];
        
        $sql = "INSERT INTO fabricantes (nome, cidade, estado, pais, logradouro, numero) 
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $nome,
            $this->getFirstValue($adicao, ['fabricanteCidade']),
            $this->getFirstValue($adicao, ['fabricanteEstado']),
            $this->getFirstValue($adicao, ['fabricantePais']),
            $this->getFirstValue($adicao, ['fabricanteLogradouro']),
            $this->getFirstValue($adicao, ['fabricanteNumero'])
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * ICMS não é processado da DI - mantido para referência
     * ICMS é calculado no frontend usando aliquotas.json por estado
     */
    private function processICMS($declaracao, $numero_di) {
        // DESABILITADO: ICMS vem de aliquotas.json, não da DI
        // DI contém apenas <icms/> vazio - isso é normal
        return;
    }
    
    /**
     * Processa pagamentos
     */
    private function processPagamentos($declaracao, $numero_di) {
        if (!isset($declaracao->pagamento)) return;
        
        foreach ($declaracao->pagamento as $pagamento) {
            $sql = "INSERT INTO pagamentos (numero_di, codigo_receita, descricao_receita, valor, data_pagamento)
                    VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $numero_di,
                $this->getFirstValue($pagamento, ['codigoReceita']),
                $this->getFirstValue($pagamento, ['descricaoReceita']),
                $this->convertValue($this->getFirstValue($pagamento, ['valor']), 'monetary'),
                $this->getFirstValue($pagamento, ['dataPagamento'])
            ]);
        }
    }
    
    /**
     * Processa acréscimos
     */
    private function processAcrescimos($declaracao, $numero_di) {
        if (!isset($declaracao->acrescimo)) return;
        
        foreach ($declaracao->acrescimo as $acrescimo) {
            $sql = "INSERT INTO acrescimos (numero_di, codigo_acrescimo, descricao_acrescimo, valor_reais)
                    VALUES (?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $numero_di,
                $this->getFirstValue($acrescimo, ['codigoAcrescimo']),
                $this->getFirstValue($acrescimo, ['descricaoAcrescimo']),
                $this->convertValue($this->getFirstValue($acrescimo, ['valorReais']), 'monetary')
            ]);
        }
    }
    
    /**
     * Obtém instância do logger
     */
    public function getLogger() {
        return $this->logger;
    }
    
    /**
     * Obtém estatísticas do banco
     */
    public function getStats() {
        try {
            $stats = [];
            
            // Total de DIs
            $stmt = $this->pdo->query("SELECT COUNT(*) as total FROM declaracoes_importacao");
            $stats['total_dis'] = $stmt->fetch()['total'];
            
            // Total de adições
            $stmt = $this->pdo->query("SELECT COUNT(*) as total FROM adicoes");
            $stats['total_adicoes'] = $stmt->fetch()['total'];
            
            // Total de mercadorias
            $stmt = $this->pdo->query("SELECT COUNT(*) as total FROM mercadorias");
            $stats['total_mercadorias'] = $stmt->fetch()['total'];
            
            // Última importação
            $stmt = $this->pdo->query("SELECT MAX(created_at) as last FROM declaracoes_importacao");
            $last = $stmt->fetch()['last'];
            $stats['last_import'] = $last ? date('d/m/Y H:i', strtotime($last)) : null;
            
            return $stats;
        } catch (Exception $e) {
            return [
                'total_dis' => 0,
                'total_adicoes' => 0,
                'total_mercadorias' => 0,
                'last_import' => null
            ];
        }
    }
    
    /**
     * Valida conexão com banco
     */
    public function validateConnection() {
        try {
            $stmt = $this->pdo->query("SHOW TABLES");
            $tables = $stmt->rowCount();
            
            return [
                'connected' => true,
                'tables' => $tables
            ];
        } catch (Exception $e) {
            return [
                'connected' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Limpa banco de dados com tratamento de erro robusto
     */
    public function clearDatabase() {
        $this->logger->log('info', 'Iniciando limpeza do banco de dados');
        
        try {
            $this->pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
            
            // Tabelas em ordem de dependência (filhas primeiro)
            $tables = [
                'mercadorias', 'tributos', 'adicoes', 'icms', 
                'pagamentos', 'acrescimos', 'declaracoes_importacao',
                'fornecedores', 'fabricantes', 'importadores',
                'importacoes_log'
            ];
            
            $cleared_tables = [];
            $failed_tables = [];
            
            foreach ($tables as $table) {
                try {
                    // Tentar TRUNCATE primeiro (mais rápido)
                    $this->pdo->exec("TRUNCATE TABLE `$table`");
                    $cleared_tables[] = $table;
                    $this->logger->log('info', "Tabela truncada com sucesso", ['table' => $table]);
                    
                } catch (Exception $truncateError) {
                    // Fallback para DELETE se TRUNCATE falhar
                    try {
                        $this->pdo->exec("DELETE FROM `$table`");
                        $cleared_tables[] = $table;
                        $this->logger->log('warning', "Tabela limpa com DELETE (TRUNCATE falhou)", [
                            'table' => $table,
                            'truncate_error' => $truncateError->getMessage()
                        ]);
                        
                    } catch (Exception $deleteError) {
                        $failed_tables[] = [
                            'table' => $table,
                            'truncate_error' => $truncateError->getMessage(),
                            'delete_error' => $deleteError->getMessage()
                        ];
                        
                        $this->logger->log('error', "Falha ao limpar tabela", [
                            'table' => $table,
                            'truncate_error' => $truncateError->getMessage(),
                            'delete_error' => $deleteError->getMessage()
                        ]);
                    }
                }
            }
            
            $this->pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            
            if (empty($failed_tables)) {
                $this->logger->log('success', 'Banco de dados limpo com sucesso', [
                    'tables_cleared' => count($cleared_tables),
                    'cleared_tables' => $cleared_tables
                ]);
                
                return [
                    'success' => true,
                    'tables_cleared' => count($cleared_tables),
                    'details' => $cleared_tables
                ];
            } else {
                $this->logger->log('error', 'Limpeza parcial do banco - algumas tabelas falharam', [
                    'tables_cleared' => count($cleared_tables),
                    'tables_failed' => count($failed_tables),
                    'failed_details' => $failed_tables
                ]);
                
                return [
                    'success' => false,
                    'error' => 'Falha ao limpar algumas tabelas',
                    'tables_cleared' => count($cleared_tables),
                    'tables_failed' => count($failed_tables),
                    'failed_tables' => array_column($failed_tables, 'table')
                ];
            }
            
        } catch (Exception $e) {
            $this->logger->log('error', 'Erro geral na limpeza do banco de dados', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // Métodos auxiliares
    
    private function getFirstValue($element, $fields) {
        if (!is_array($fields)) {
            $fields = [$fields];
        }
        
        foreach ($fields as $field) {
            if (isset($element->$field)) {
                return trim((string)$element->$field);
            }
        }
        return null;
    }
    
    private function convertValue($value, $type = 'integer') {
        if (!$value || $value === str_repeat('0', strlen($value))) {
            return 0;
        }
        
        $numeric = intval($value);
        
        switch($type) {
            case 'monetary':
                return $numeric / 100;
            case 'weight':
                return $numeric / 100000;
            case 'unit_value':
                return $numeric / 10000000;
            case 'percentage':
                return $numeric / 100;
            default:
                return $numeric;
        }
    }
}

// Instanciar processador
$processor = new XMLImportProcessor($db_config);
?>