<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Importação de XMLs DI - Importa Precifica</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .drag-area {
            border: 2px dashed #ccc;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .drag-area.drag-over {
            border-color: #007bff;
            background-color: #f8f9fa;
        }
        .file-item {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 10px;
            margin: 5px 0;
        }
        .log-container {
            max-height: 400px;
            overflow-y: auto;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            font-family: monospace;
            font-size: 12px;
        }
        .progress-container {
            display: none;
        }
        .alert-custom {
            margin: 10px 0;
        }
        .stats-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin: 10px 0;
        }
        .btn-primary-custom {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 25px;
            padding: 12px 30px;
            font-weight: 600;
        }
        .btn-primary-custom:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
    </style>
</head>
<body>
<?php
// ===================================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// ===================================================================

// Configurações do banco de dados
$db_config = [
    'host' => 'localhost',
    'dbname' => 'importa_precificacao',
    'username' => 'root',
    'password' => '',
    'charset' => 'utf8mb4'
];

// Configurações de upload
$upload_config = [
    'max_file_size' => 50 * 1024 * 1024, // 50MB
    'allowed_extensions' => ['xml'],
    'upload_dir' => 'uploads/xml/'
];

// Criar diretório de upload se não existir
if (!file_exists($upload_config['upload_dir'])) {
    mkdir($upload_config['upload_dir'], 0777, true);
}

// ===================================================================
// CLASSE PRINCIPAL DO SISTEMA
// ===================================================================

class ImportadorDI {
    private $pdo;
    private $log = [];
    private $stats = [
        'dis_processadas' => 0,
        'adicoes_inseridas' => 0,
        'mercadorias_inseridas' => 0,
        'erros_encontrados' => 0,
        'tempo_inicio' => null,
        'tempo_fim' => null
    ];

    public function __construct($db_config) {
        $this->conectarBanco($db_config);
        $this->stats['tempo_inicio'] = microtime(true);
    }

    private function conectarBanco($config) {
        try {
            $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
            $this->pdo = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$config['charset']} COLLATE {$config['charset']}_unicode_ci"
            ]);
            $this->adicionarLog("✅ Conexão com banco de dados estabelecida com sucesso", "success");
        } catch (PDOException $e) {
            $this->adicionarLog("❌ Erro ao conectar com banco de dados: " . $e->getMessage(), "error");
            throw new Exception("Falha na conexão com banco de dados");
        }
    }

    public function processarXML($arquivo_xml) {
        try {
            $this->adicionarLog("📁 Iniciando processamento do arquivo: " . basename($arquivo_xml), "info");
            
            // Validar arquivo XML
            if (!$this->validarXML($arquivo_xml)) {
                throw new Exception("XML inválido ou mal formado");
            }

            // Carregar e parsear XML
            $xml = simplexml_load_file($arquivo_xml);
            if ($xml === false) {
                throw new Exception("Não foi possível carregar o arquivo XML");
            }

            // Processar cada declaração de importação
            $dis_processadas = 0;
            foreach ($xml->declaracaoImportacao as $declaracao) {
                $this->processarDeclaracaoImportacao($declaracao, file_get_contents($arquivo_xml));
                $dis_processadas++;
            }

            $this->stats['dis_processadas'] += $dis_processadas;
            $this->adicionarLog("✅ Processamento concluído: {$dis_processadas} DI(s) processada(s)", "success");
            
            return true;

        } catch (Exception $e) {
            $this->stats['erros_encontrados']++;
            $this->adicionarLog("❌ Erro no processamento: " . $e->getMessage(), "error");
            return false;
        }
    }

    private function validarXML($arquivo_xml) {
        // Verificar se arquivo existe
        if (!file_exists($arquivo_xml)) {
            $this->adicionarLog("❌ Arquivo não encontrado: " . $arquivo_xml, "error");
            return false;
        }

        // Verificar se é um XML válido
        $xml_content = file_get_contents($arquivo_xml);
        $xml = simplexml_load_string($xml_content);
        
        if ($xml === false) {
            $this->adicionarLog("❌ XML mal formado ou inválido", "error");
            return false;
        }

        // Verificar se contém estrutura DI
        if (!isset($xml->declaracaoImportacao)) {
            $this->adicionarLog("❌ XML não contém declaração de importação", "error");
            return false;
        }

        $this->adicionarLog("✅ XML validado com sucesso", "success");
        return true;
    }

    private function processarDeclaracaoImportacao($declaracao, $xml_original) {
        try {
            $this->pdo->beginTransaction();

            // Extrair dados da DI
            $numero_di = (string)$this->obterPrimeiro($declaracao, ['numeroDI', 'numero_di']);
            $this->adicionarLog("📋 Processando DI: {$numero_di}", "info");

            // Processar importador
            $importador_id = $this->processarImportador($declaracao);
            
            // Processar DI principal
            $this->processarDIPrincipal($declaracao, $importador_id, $xml_original);
            
            // Processar adições
            $this->processarAdicoes($declaracao, $numero_di);
            
            // Processar ICMS se presente
            $this->processarICMS($declaracao, $numero_di);
            
            // Processar pagamentos e acréscimos
            $this->processarPagamentos($declaracao, $numero_di);
            $this->processarAcrescimos($declaracao, $numero_di);

            // Registrar log de importação
            $this->registrarLogImportacao($numero_di, 'CONCLUIDO');

            $this->pdo->commit();
            $this->adicionarLog("✅ DI {$numero_di} processada com sucesso", "success");

        } catch (Exception $e) {
            $this->pdo->rollback();
            $this->adicionarLog("❌ Erro ao processar DI: " . $e->getMessage(), "error");
            throw $e;
        }
    }

    private function processarImportador($declaracao) {
        $cnpj = $this->obterPrimeiro($declaracao, ['importadorNumero', 'importador_numero']);
        $nome = $this->obterPrimeiro($declaracao, ['importadorNome', 'importador_nome']);
        
        if (!$cnpj || !$nome) {
            throw new Exception("CNPJ ou nome do importador não encontrado");
        }

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
            $this->obterPrimeiro($declaracao, ['importadorEnderecoLogradouro', 'importador_endereco_logradouro']),
            $this->obterPrimeiro($declaracao, ['importadorEnderecoNumero', 'importador_endereco_numero']),
            $this->obterPrimeiro($declaracao, ['importadorEnderecoComplemento', 'importador_endereco_complemento']),
            $this->obterPrimeiro($declaracao, ['importadorEnderecoBairro', 'importador_endereco_bairro']),
            $this->obterPrimeiro($declaracao, ['importadorEnderecoCidade', 'importador_endereco_cidade']),
            $this->obterPrimeiro($declaracao, ['importadorEnderecoMunicipio', 'importador_endereco_municipio']),
            $this->obterPrimeiro($declaracao, ['importadorEnderecoUf', 'importador_endereco_uf']),
            $this->obterPrimeiro($declaracao, ['importadorEnderecoCep', 'importador_endereco_cep']),
            $this->obterPrimeiro($declaracao, ['importadorNomeRepresentanteLegal', 'importador_representante_nome']),
            $this->obterPrimeiro($declaracao, ['importadorCpfRepresentanteLegal', 'importador_representante_cpf']),
            $this->obterPrimeiro($declaracao, ['importadorNumeroTelefone', 'importador_telefone'])
        ]);

        return $this->pdo->lastInsertId();
    }

    private function processarDIPrincipal($declaracao, $importador_id, $xml_original) {
        $numero_di = $this->obterPrimeiro($declaracao, ['numeroDI', 'numero_di']);
        $data_registro = $this->obterPrimeiro($declaracao, ['dataRegistro', 'data_registro']);

        // Converter data do formato YYYYMMDD para YYYY-MM-DD
        if (strlen($data_registro) === 8) {
            $data_registro = substr($data_registro, 0, 4) . '-' . 
                           substr($data_registro, 4, 2) . '-' . 
                           substr($data_registro, 6, 2);
        }

        // Verificar se DI já existe
        $stmt = $this->pdo->prepare("SELECT numero_di FROM declaracoes_importacao WHERE numero_di = ?");
        $stmt->execute([$numero_di]);
        if ($stmt->fetch()) {
            // Atualizar existente
            $sql = "UPDATE declaracoes_importacao SET 
                data_registro = ?, importador_id = ?, xml_original = ?, updated_at = CURRENT_TIMESTAMP
                WHERE numero_di = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$data_registro, $importador_id, $xml_original, $numero_di]);
            return;
        }

        // Inserir nova DI
        $sql = "INSERT INTO declaracoes_importacao (
            numero_di, data_registro, importador_id, urf_despacho_codigo, urf_despacho_nome,
            modalidade_codigo, modalidade_nome, situacao_entrega, carga_peso_bruto, carga_peso_liquido,
            carga_pais_procedencia_codigo, carga_pais_procedencia_nome, carga_urf_entrada_codigo,
            carga_urf_entrada_nome, carga_data_chegada, xml_original
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $data_chegada = $this->obterPrimeiro($declaracao, ['cargaDataChegada', 'carga_data_chegada']);
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
            $this->obterPrimeiro($declaracao, ['urfDespachoCodigo', 'urf_despacho_codigo']),
            $this->obterPrimeiro($declaracao, ['urfDespachoNome', 'urf_despacho_nome']),
            $this->obterPrimeiro($declaracao, ['modalidadeDespachoCodigo', 'modalidade_codigo']),
            $this->obterPrimeiro($declaracao, ['modalidadeDespachoNome', 'modalidade_nome']),
            $this->obterPrimeiro($declaracao, ['situacaoEntregaCarga', 'situacao_entrega']),
            $this->converterValor($this->obterPrimeiro($declaracao, ['cargaPesoBruto', 'carga_peso_bruto']), 'weight'),
            $this->converterValor($this->obterPrimeiro($declaracao, ['cargaPesoLiquido', 'carga_peso_liquido']), 'weight'),
            $this->obterPrimeiro($declaracao, ['cargaPaisProcedenciaCodigo', 'carga_pais_procedencia_codigo']),
            $this->obterPrimeiro($declaracao, ['cargaPaisProcedenciaNome', 'carga_pais_procedencia_nome']),
            $this->obterPrimeiro($declaracao, ['cargaUrfEntradaCodigo', 'carga_urf_entrada_codigo']),
            $this->obterPrimeiro($declaracao, ['cargaUrfEntradaNome', 'carga_urf_entrada_nome']),
            $data_chegada ?: null,
            $xml_original
        ]);
    }

    private function processarAdicoes($declaracao, $numero_di) {
        $adicoes_processadas = 0;
        
        foreach ($declaracao->adicao as $adicao) {
            $this->processarAdicao($adicao, $numero_di);
            $adicoes_processadas++;
        }
        
        $this->stats['adicoes_inseridas'] += $adicoes_processadas;
        $this->adicionarLog("📦 {$adicoes_processadas} adição(ões) processada(s)", "info");
    }

    private function processarAdicao($adicao, $numero_di) {
        // Processar fornecedor e fabricante
        $fornecedor_id = $this->processarFornecedor($adicao);
        $fabricante_id = $this->processarFabricante($adicao);

        // Inserir adição
        $sql = "INSERT INTO adicoes (
            numero_di, numero_adicao, ncm, descricao_ncm, peso_liquido, quantidade_estatistica,
            unidade_estatistica, aplicacao_mercadoria, condicao_mercadoria, condicao_venda_incoterm,
            condicao_venda_local, moeda_negociacao_codigo, moeda_negociacao_nome,
            valor_moeda_negociacao, valor_reais, frete_valor_reais, seguro_valor_reais,
            fornecedor_id, fabricante_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            descricao_ncm = VALUES(descricao_ncm),
            valor_reais = VALUES(valor_reais),
            updated_at = CURRENT_TIMESTAMP";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $numero_di,
            $this->obterPrimeiro($adicao, ['numeroAdicao', 'numero_adicao']),
            $this->obterPrimeiro($adicao, ['dadosMercadoriaCodigoNcm', 'ncm']),
            $this->obterPrimeiro($adicao, ['dadosMercadoriaNomeNcm', 'descricao_ncm']),
            $this->converterValor($this->obterPrimeiro($adicao, ['dadosMercadoriaPesoLiquido', 'peso_liquido']), 'weight'),
            $this->converterValor($this->obterPrimeiro($adicao, ['dadosMercadoriaMedidaEstatisticaQuantidade', 'quantidade_estatistica']), 'weight'),
            $this->obterPrimeiro($adicao, ['dadosMercadoriaMedidaEstatisticaUnidade', 'unidade_estatistica']),
            $this->obterPrimeiro($adicao, ['dadosMercadoriaAplicacao', 'aplicacao']),
            $this->obterPrimeiro($adicao, ['dadosMercadoriaCondicao', 'condicao']),
            $this->obterPrimeiro($adicao, ['condicaoVendaIncoterm', 'incoterm']),
            $this->obterPrimeiro($adicao, ['condicaoVendaLocal', 'local_venda']),
            $this->obterPrimeiro($adicao, ['condicaoVendaMoedaCodigo', 'moeda_codigo']),
            $this->obterPrimeiro($adicao, ['condicaoVendaMoedaNome', 'moeda_nome']),
            $this->converterValor($this->obterPrimeiro($adicao, ['condicaoVendaValorMoeda', 'valor_moeda']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['condicaoVendaValorReais', 'valor_reais']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['freteValorReais', 'frete_reais']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['seguroValorReais', 'seguro_reais']), 'monetary'),
            $fornecedor_id,
            $fabricante_id
        ]);

        $adicao_id = $this->pdo->lastInsertId();

        // Processar tributos da adição
        $this->processarTributos($adicao, $adicao_id);

        // Processar mercadorias da adição
        $this->processarMercadorias($adicao, $adicao_id);
    }

    private function processarTributos($adicao, $adicao_id) {
        $sql = "INSERT INTO tributos (
            adicao_id, ii_regime_codigo, ii_regime_nome, ii_aliquota_ad_valorem, ii_base_calculo,
            ii_valor_calculado, ii_valor_devido, ii_valor_recolher, ipi_aliquota_ad_valorem,
            ipi_valor_devido, ipi_valor_recolher, pis_aliquota_ad_valorem, pis_valor_devido,
            pis_valor_recolher, cofins_aliquota_ad_valorem, cofins_valor_devido, cofins_valor_recolher
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $adicao_id,
            $this->obterPrimeiro($adicao, ['iiRegimeTributacaoCodigo', 'ii_regime_codigo']),
            $this->obterPrimeiro($adicao, ['iiRegimeTributacaoNome', 'ii_regime_nome']),
            $this->converterValor($this->obterPrimeiro($adicao, ['iiAliquotaAdValorem', 'ii_aliquota']), 'percentage'),
            $this->converterValor($this->obterPrimeiro($adicao, ['iiBaseCalculo', 'ii_base_calculo']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['iiAliquotaValorCalculado', 'ii_valor_calculado']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['iiAliquotaValorDevido', 'ii_valor_devido']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['iiAliquotaValorRecolher', 'ii_valor_recolher']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['ipiAliquotaAdValorem', 'ipi_aliquota']), 'percentage'),
            $this->converterValor($this->obterPrimeiro($adicao, ['ipiAliquotaValorDevido', 'ipi_valor_devido']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['ipiAliquotaValorRecolher', 'ipi_valor_recolher']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['pisPasepAliquotaAdValorem', 'pis_aliquota']), 'percentage'),
            $this->converterValor($this->obterPrimeiro($adicao, ['pisPasepAliquotaValorDevido', 'pis_valor_devido']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['pisPasepAliquotaValorRecolher', 'pis_valor_recolher']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['cofinsAliquotaAdValorem', 'cofins_aliquota']), 'percentage'),
            $this->converterValor($this->obterPrimeiro($adicao, ['cofinsAliquotaValorDevido', 'cofins_valor_devido']), 'monetary'),
            $this->converterValor($this->obterPrimeiro($adicao, ['cofinsAliquotaValorRecolher', 'cofins_valor_recolher']), 'monetary')
        ]);
    }

    private function processarMercadorias($adicao, $adicao_id) {
        if (!isset($adicao->mercadoria)) {
            return;
        }

        foreach ($adicao->mercadoria as $mercadoria) {
            $sql = "INSERT INTO mercadorias (
                adicao_id, numero_sequencial_item, descricao_mercadoria, quantidade,
                unidade_medida, valor_unitario_usd
            ) VALUES (?, ?, ?, ?, ?, ?)";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $adicao_id,
                $this->obterPrimeiro($mercadoria, ['numeroSequencialItem', 'numero_sequencial']),
                $this->obterPrimeiro($mercadoria, ['descricaoMercadoria', 'descricao']),
                $this->converterValor($this->obterPrimeiro($mercadoria, ['quantidade']), 'weight'),
                $this->obterPrimeiro($mercadoria, ['unidadeMedida', 'unidade']),
                $this->converterValor($this->obterPrimeiro($mercadoria, ['valorUnitario', 'valor_unitario']), 'unit_value')
            ]);

            $this->stats['mercadorias_inseridas']++;
        }
    }

    private function processarFornecedor($adicao) {
        $nome = $this->obterPrimeiro($adicao, ['fornecedorNome', 'fornecedor_nome']);
        if (!$nome) return null;

        // Verificar se fornecedor existe
        $stmt = $this->pdo->prepare("SELECT id FROM fornecedores WHERE nome = ?");
        $stmt->execute([$nome]);
        $fornecedor = $stmt->fetch();
        
        if ($fornecedor) return $fornecedor['id'];

        // Inserir novo fornecedor
        $sql = "INSERT INTO fornecedores (nome, cidade, estado, pais, logradouro, numero, complemento) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $nome,
            $this->obterPrimeiro($adicao, ['fornecedorCidade', 'fornecedor_cidade']),
            $this->obterPrimeiro($adicao, ['fornecedorEstado', 'fornecedor_estado']),
            $this->obterPrimeiro($adicao, ['fornecedorPais', 'fornecedor_pais']),
            $this->obterPrimeiro($adicao, ['fornecedorLogradouro', 'fornecedor_logradouro']),
            $this->obterPrimeiro($adicao, ['fornecedorNumero', 'fornecedor_numero']),
            $this->obterPrimeiro($adicao, ['fornecedorComplemento', 'fornecedor_complemento'])
        ]);

        return $this->pdo->lastInsertId();
    }

    private function processarFabricante($adicao) {
        $nome = $this->obterPrimeiro($adicao, ['fabricanteNome', 'fabricante_nome']);
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
            $this->obterPrimeiro($adicao, ['fabricanteCidade', 'fabricante_cidade']),
            $this->obterPrimeiro($adicao, ['fabricanteEstado', 'fabricante_estado']),
            $this->obterPrimeiro($adicao, ['fabricantePais', 'fabricante_pais']),
            $this->obterPrimeiro($adicao, ['fabricanteLogradouro', 'fabricante_logradouro']),
            $this->obterPrimeiro($adicao, ['fabricanteNumero', 'fabricante_numero'])
        ]);

        return $this->pdo->lastInsertId();
    }

    private function processarICMS($declaracao, $numero_di) {
        if (!isset($declaracao->icms)) return;

        foreach ($declaracao->icms as $icms) {
            $sql = "INSERT INTO icms (
                numero_di, numero_sequencial, uf_icms, tipo_recolhimento_codigo,
                tipo_recolhimento_nome, valor_total_icms, data_registro, hora_registro, cpf_responsavel
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE valor_total_icms = VALUES(valor_total_icms)";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $numero_di,
                $this->obterPrimeiro($icms, ['numeroSequencialIcms', 'numero_sequencial']),
                $this->obterPrimeiro($icms, ['ufIcms', 'uf']),
                $this->obterPrimeiro($icms, ['codigoTipoRecolhimentoIcms', 'tipo_codigo']),
                $this->obterPrimeiro($icms, ['nomeTipoRecolhimentoIcms', 'tipo_nome']),
                $this->converterValor($this->obterPrimeiro($icms, ['valorTotalIcms', 'valor_total']), 'monetary'),
                $this->obterPrimeiro($icms, ['dataRegistro', 'data_registro']),
                $this->obterPrimeiro($icms, ['horaRegistro', 'hora_registro']),
                $this->obterPrimeiro($icms, ['cpfResponsavelRegistro', 'cpf_responsavel'])
            ]);
        }
    }

    private function processarPagamentos($declaracao, $numero_di) {
        if (!isset($declaracao->pagamento)) return;

        foreach ($declaracao->pagamento as $pagamento) {
            $sql = "INSERT INTO pagamentos (numero_di, codigo_receita, descricao_receita, valor, data_pagamento)
                    VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $numero_di,
                $this->obterPrimeiro($pagamento, ['codigoReceita', 'codigo']),
                $this->obterPrimeiro($pagamento, ['descricaoReceita', 'descricao']),
                $this->converterValor($this->obterPrimeiro($pagamento, ['valor']), 'monetary'),
                $this->obterPrimeiro($pagamento, ['dataPagamento', 'data'])
            ]);
        }
    }

    private function processarAcrescimos($declaracao, $numero_di) {
        if (!isset($declaracao->acrescimo)) return;

        foreach ($declaracao->acrescimo as $acrescimo) {
            $sql = "INSERT INTO acrescimos (numero_di, codigo_acrescimo, descricao_acrescimo, valor_reais)
                    VALUES (?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $numero_di,
                $this->obterPrimeiro($acrescimo, ['codigoAcrescimo', 'codigo']),
                $this->obterPrimeiro($acrescimo, ['descricaoAcrescimo', 'descricao']),
                $this->converterValor($this->obterPrimeiro($acrescimo, ['valorReais', 'valor']), 'monetary')
            ]);
        }
    }

    private function registrarLogImportacao($numero_di, $status) {
        $sql = "INSERT INTO importacoes_log (numero_di, status, tempo_processamento)
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                status = VALUES(status), 
                tempo_processamento = VALUES(tempo_processamento),
                updated_at = CURRENT_TIMESTAMP";

        $tempo_processamento = microtime(true) - $this->stats['tempo_inicio'];
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$numero_di, $status, $tempo_processamento]);
    }

    // ===================================================================
    // MÉTODOS AUXILIARES
    // ===================================================================

    private function obterPrimeiro($elemento, $campos) {
        foreach ($campos as $campo) {
            if (isset($elemento->$campo)) {
                return trim((string)$elemento->$campo);
            }
        }
        return null;
    }

    private function converterValor($valor, $tipo = 'integer') {
        if (!$valor || $valor === str_repeat('0', strlen($valor))) {
            return 0;
        }
        
        $valor_numerico = intval($valor);
        
        switch($tipo) {
            case 'monetary':
                return $valor_numerico / 100;
            case 'weight':
                return $valor_numerico / 100000;
            case 'unit_value':
                return $valor_numerico / 10000000;
            case 'percentage':
                return $valor_numerico / 100;
            case 'integer':
            default:
                return $valor_numerico;
        }
    }

    private function adicionarLog($mensagem, $tipo = "info") {
        $timestamp = date('H:i:s');
        $this->log[] = [
            'timestamp' => $timestamp,
            'tipo' => $tipo,
            'mensagem' => $mensagem
        ];
    }

    public function obterLog() {
        return $this->log;
    }

    public function obterEstatisticas() {
        $this->stats['tempo_fim'] = microtime(true);
        $this->stats['tempo_total'] = $this->stats['tempo_fim'] - $this->stats['tempo_inicio'];
        return $this->stats;
    }

    public function listarRegistros($limite = 100) {
        $sql = "SELECT 
                    di.numero_di,
                    di.data_registro,
                    imp.nome as importador_nome,
                    imp.endereco_uf,
                    di.total_adicoes,
                    COALESCE(SUM(a.valor_reais), 0) as valor_total,
                    di.created_at
                FROM declaracoes_importacao di
                LEFT JOIN importadores imp ON di.importador_id = imp.id  
                LEFT JOIN adicoes a ON di.numero_di = a.numero_di
                GROUP BY di.numero_di
                ORDER BY di.created_at DESC
                LIMIT ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$limite]);
        return $stmt->fetchAll();
    }
}

// ===================================================================
// PROCESSAMENTO DE REQUISIÇÕES
// ===================================================================

$resultado = null;
$erro = null;

// Processar upload de arquivo
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao'])) {
    try {
        $importador = new ImportadorDI($db_config);
        
        if ($_POST['acao'] === 'processar_arquivos') {
            if (!isset($_FILES['arquivos_xml']) || empty($_FILES['arquivos_xml']['name'][0])) {
                throw new Exception("Nenhum arquivo foi enviado");
            }

            $arquivos_processados = 0;
            $arquivos_com_erro = 0;

            // Processar cada arquivo enviado
            for ($i = 0; $i < count($_FILES['arquivos_xml']['name']); $i++) {
                if ($_FILES['arquivos_xml']['error'][$i] === UPLOAD_ERR_OK) {
                    $nome_arquivo = $_FILES['arquivos_xml']['name'][$i];
                    $arquivo_temp = $_FILES['arquivos_xml']['tmp_name'][$i];
                    
                    // Validar extensão
                    $extensao = strtolower(pathinfo($nome_arquivo, PATHINFO_EXTENSION));
                    if (!in_array($extensao, $upload_config['allowed_extensions'])) {
                        throw new Exception("Arquivo {$nome_arquivo} não é um XML válido");
                    }
                    
                    // Mover arquivo para diretório de upload
                    $caminho_destino = $upload_config['upload_dir'] . $nome_arquivo;
                    if (move_uploaded_file($arquivo_temp, $caminho_destino)) {
                        if ($importador->processarXML($caminho_destino)) {
                            $arquivos_processados++;
                        } else {
                            $arquivos_com_erro++;
                        }
                    }
                }
            }

            $resultado = [
                'sucesso' => true,
                'arquivos_processados' => $arquivos_processados,
                'arquivos_com_erro' => $arquivos_com_erro,
                'log' => $importador->obterLog(),
                'estatisticas' => $importador->obterEstatisticas(),
                'registros' => $importador->listarRegistros(50)
            ];
        }

    } catch (Exception $e) {
        $erro = $e->getMessage();
        if (isset($importador)) {
            $resultado = [
                'sucesso' => false,
                'erro' => $erro,
                'log' => $importador->obterLog(),
                'estatisticas' => $importador->obterEstatisticas()
            ];
        }
    }
}

// Listar registros existentes para exibição inicial
try {
    $importador = new ImportadorDI($db_config);
    $registros_existentes = $importador->listarRegistros(50);
} catch (Exception $e) {
    $registros_existentes = [];
    $erro = "Erro ao conectar com banco de dados: " . $e->getMessage();
}
?>

<!-- Interface HTML -->
<div class="container-fluid py-4">
    <div class="row">
        <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="h3 text-primary">
                    <i class="fas fa-database me-2"></i>
                    Sistema de Importação de XMLs DI
                </h1>
                <div class="badge bg-secondary fs-6">
                    Importa Precifica v2.0
                </div>
            </div>

            <?php if ($erro): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <?php echo htmlspecialchars($erro); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
            <?php endif; ?>

            <?php if ($resultado && $resultado['sucesso']): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <strong>Importação concluída com sucesso!</strong><br>
                Processados: <?php echo $resultado['arquivos_processados']; ?> arquivo(s) | 
                Erros: <?php echo $resultado['arquivos_com_erro']; ?> arquivo(s)
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
            <?php endif; ?>

            <div class="row">
                <!-- Seção de Upload -->
                <div class="col-lg-8 col-md-7 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">
                                <i class="fas fa-cloud-upload-alt me-2"></i>
                                Upload de Arquivos XML DI
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="formUpload" method="post" enctype="multipart/form-data">
                                <input type="hidden" name="acao" value="processar_arquivos">
                                
                                <div class="drag-area mb-3" id="dragArea">
                                    <div class="text-center">
                                        <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                                        <h5>Arraste os arquivos XML aqui</h5>
                                        <p class="text-muted">ou clique para selecionar arquivos</p>
                                        <input type="file" name="arquivos_xml[]" id="arquivos" multiple accept=".xml" style="display: none;">
                                        <button type="button" class="btn btn-outline-primary" onclick="document.getElementById('arquivos').click()">
                                            <i class="fas fa-folder-open me-2"></i>
                                            Selecionar Arquivos
                                        </button>
                                    </div>
                                </div>

                                <div id="arquivosSelecionados" class="mb-3" style="display: none;">
                                    <h6>Arquivos Selecionados:</h6>
                                    <div id="listaArquivos"></div>
                                </div>

                                <div class="progress-container">
                                    <div class="progress mb-3">
                                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                             role="progressbar" style="width: 0%"></div>
                                    </div>
                                </div>

                                <button type="submit" class="btn btn-primary-custom btn-lg w-100" id="btnIniciarImportacao">
                                    <i class="fas fa-play me-2"></i>
                                    Iniciar Importação
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Estatísticas -->
                <div class="col-lg-4 col-md-5 mb-4">
                    <?php if ($resultado && isset($resultado['estatisticas'])): ?>
                    <div class="stats-card">
                        <h6 class="text-white-50 mb-3">Estatísticas da Importação</h6>
                        <div class="row text-center">
                            <div class="col-6 mb-2">
                                <div class="h4 mb-0"><?php echo $resultado['estatisticas']['dis_processadas']; ?></div>
                                <small>DIs Processadas</small>
                            </div>
                            <div class="col-6 mb-2">
                                <div class="h4 mb-0"><?php echo $resultado['estatisticas']['adicoes_inseridas']; ?></div>
                                <small>Adições</small>
                            </div>
                            <div class="col-6">
                                <div class="h4 mb-0"><?php echo $resultado['estatisticas']['mercadorias_inseridas']; ?></div>
                                <small>Mercadorias</small>
                            </div>
                            <div class="col-6">
                                <div class="h4 mb-0"><?php echo number_format($resultado['estatisticas']['tempo_total'], 2); ?>s</div>
                                <small>Tempo Total</small>
                            </div>
                        </div>
                    </div>
                    <?php else: ?>
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Instruções</h6>
                        </div>
                        <div class="card-body">
                            <ol class="mb-0">
                                <li class="mb-2">Selecione um ou mais arquivos XML de Declaração de Importação</li>
                                <li class="mb-2">Clique em "Iniciar Importação"</li>
                                <li class="mb-2">Aguarde o processamento</li>
                                <li>Verifique os registros inseridos abaixo</li>
                            </ol>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Log de Processamento -->
            <?php if ($resultado && isset($resultado['log']) && !empty($resultado['log'])): ?>
            <div class="card shadow-sm mb-4">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-list-alt me-2"></i>
                        Log de Processamento
                    </h6>
                </div>
                <div class="card-body p-0">
                    <div class="log-container">
                        <?php foreach ($resultado['log'] as $entry): ?>
                        <div class="log-entry">
                            <span class="text-muted">[<?php echo $entry['timestamp']; ?>]</span>
                            <span class="<?php 
                                echo $entry['tipo'] === 'error' ? 'text-danger' : 
                                    ($entry['tipo'] === 'success' ? 'text-success' : 'text-info'); 
                            ?>">
                                <?php echo htmlspecialchars($entry['mensagem']); ?>
                            </span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <!-- Lista de Registros -->
            <div class="card shadow-sm">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-table me-2"></i>
                        Registros no Banco de Dados
                        <?php if (!empty($registros_existentes)): ?>
                        <span class="badge bg-primary ms-2"><?php echo count($registros_existentes); ?></span>
                        <?php endif; ?>
                    </h6>
                </div>
                <div class="card-body p-0">
                    <?php if (empty($registros_existentes)): ?>
                    <div class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h6 class="text-muted">Nenhum registro encontrado</h6>
                        <p class="text-muted">Faça o upload de arquivos XML para popular o banco de dados</p>
                    </div>
                    <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Número DI</th>
                                    <th>Data Registro</th>
                                    <th>Importador</th>
                                    <th>UF</th>
                                    <th>Adições</th>
                                    <th>Valor Total</th>
                                    <th>Importado em</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($registros_existentes as $registro): ?>
                                <tr>
                                    <td>
                                        <code><?php echo htmlspecialchars($registro['numero_di']); ?></code>
                                    </td>
                                    <td><?php echo date('d/m/Y', strtotime($registro['data_registro'])); ?></td>
                                    <td class="text-truncate" style="max-width: 200px;" title="<?php echo htmlspecialchars($registro['importador_nome']); ?>">
                                        <?php echo htmlspecialchars($registro['importador_nome']); ?>
                                    </td>
                                    <td>
                                        <span class="badge bg-secondary"><?php echo $registro['endereco_uf']; ?></span>
                                    </td>
                                    <td>
                                        <span class="badge bg-info"><?php echo $registro['total_adicoes']; ?></span>
                                    </td>
                                    <td>R$ <?php echo number_format($registro['valor_total'], 2, ',', '.'); ?></td>
                                    <td class="text-muted">
                                        <?php echo date('d/m/Y H:i', strtotime($registro['created_at'])); ?>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const dragArea = document.getElementById('dragArea');
    const arquivosInput = document.getElementById('arquivos');
    const arquivosSelecionados = document.getElementById('arquivosSelecionados');
    const listaArquivos = document.getElementById('listaArquivos');
    const formUpload = document.getElementById('formUpload');
    const btnIniciar = document.getElementById('btnIniciarImportacao');
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.querySelector('.progress-bar');

    // Drag & Drop funcionalidade
    dragArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        dragArea.classList.add('drag-over');
    });

    dragArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dragArea.classList.remove('drag-over');
    });

    dragArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dragArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.name.toLowerCase().endsWith('.xml')
        );
        
        if (files.length > 0) {
            handleFiles(files);
        } else {
            alert('Por favor, selecione apenas arquivos XML.');
        }
    });

    dragArea.addEventListener('click', function() {
        arquivosInput.click();
    });

    arquivosInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });

    function handleFiles(files) {
        listaArquivos.innerHTML = '';
        
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item d-flex justify-content-between align-items-center';
            fileItem.innerHTML = `
                <div>
                    <i class="fas fa-file-code text-primary me-2"></i>
                    <span>${file.name}</span>
                    <small class="text-muted ms-2">(${(file.size / 1024).toFixed(1)} KB)</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerArquivo(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            listaArquivos.appendChild(fileItem);
        });

        if (files.length > 0) {
            arquivosSelecionados.style.display = 'block';
            btnIniciar.disabled = false;
        }
    }

    window.removerArquivo = function(index) {
        const dt = new DataTransfer();
        const files = arquivosInput.files;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) {
                dt.items.add(files[i]);
            }
        }
        
        arquivosInput.files = dt.files;
        handleFiles(Array.from(dt.files));
        
        if (dt.files.length === 0) {
            arquivosSelecionados.style.display = 'none';
            btnIniciar.disabled = true;
        }
    };

    // Submissão do formulário com barra de progresso
    formUpload.addEventListener('submit', function(e) {
        if (!arquivosInput.files || arquivosInput.files.length === 0) {
            e.preventDefault();
            alert('Por favor, selecione pelo menos um arquivo XML.');
            return;
        }

        btnIniciar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processando...';
        btnIniciar.disabled = true;
        progressContainer.style.display = 'block';
        
        // Simular progresso
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            progressBar.style.width = progress + '%';
        }, 500);

        // Parar simulação quando formulário for enviado
        setTimeout(() => {
            clearInterval(interval);
            progressBar.style.width = '100%';
        }, 2000);
    });

    // Auto-refresh da página após processamento (se necessário)
    <?php if ($resultado && $resultado['sucesso']): ?>
    setTimeout(() => {
        progressContainer.style.display = 'none';
        btnIniciar.innerHTML = '<i class="fas fa-play me-2"></i>Iniciar Importação';
        btnIniciar.disabled = false;
        arquivosSelecionados.style.display = 'none';
        arquivosInput.value = '';
        // Scroll para os resultados
        document.querySelector('.alert-success').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }, 1000);
    <?php endif; ?>
});
</script>

</body>
</html>