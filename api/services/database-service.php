<?php
/**
 * Database Service - Sistema Importa Precifica
 * 
 * Serviços de alto nível para operações no banco de dados
 */

require_once __DIR__ . '/../config/database.php';

class DatabaseService {
    private $db;
    private $config;

    public function __construct() {
        $this->config = DatabaseConfig::getInstance();
        $this->db = $this->config->getConnection();
    }

    // ===================================================================
    // SERVIÇOS DE DI (DECLARAÇÃO DE IMPORTAÇÃO)
    // ===================================================================

    /**
     * Listar DIs com paginação e filtros
     */
    public function listarDIs($page = 1, $limit = 50, $filters = []) {
        try {
            // Desabilitar temporariamente ONLY_FULL_GROUP_BY para compatibilidade
            $this->db->exec("SET sql_mode = (SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''))");
            
            $offset = ($page - 1) * $limit;
            
            // Query base
            $sql = "SELECT 
                        di.numero_di,
                        di.data_registro,
                        imp.nome as importador_nome,
                        imp.endereco_uf as importador_uf,
                        di.total_adicoes,
                        di.carga_peso_bruto,
                        di.carga_peso_liquido,
                        di.carga_pais_procedencia_nome,
                        COALESCE(SUM(a.valor_reais), 0) as valor_total_reais,
                        di.created_at,
                        di.updated_at
                    FROM declaracoes_importacao di
                    LEFT JOIN importadores imp ON di.importador_id = imp.id
                    LEFT JOIN adicoes a ON di.numero_di = a.numero_di";

            $where_conditions = [];
            $params = [];

            // Aplicar filtros
            if (!empty($filters['numero_di'])) {
                $where_conditions[] = "di.numero_di LIKE ?";
                $params[] = '%' . $filters['numero_di'] . '%';
            }

            if (!empty($filters['importador_nome'])) {
                $where_conditions[] = "imp.nome LIKE ?";
                $params[] = '%' . $filters['importador_nome'] . '%';
            }

            if (!empty($filters['uf'])) {
                $where_conditions[] = "imp.endereco_uf = ?";
                $params[] = $filters['uf'];
            }

            if (!empty($filters['data_inicio'])) {
                $where_conditions[] = "di.data_registro >= ?";
                $params[] = $filters['data_inicio'];
            }

            if (!empty($filters['data_fim'])) {
                $where_conditions[] = "di.data_registro <= ?";
                $params[] = $filters['data_fim'];
            }

            // Adicionar WHERE se há condições
            if (!empty($where_conditions)) {
                $sql .= " WHERE " . implode(" AND ", $where_conditions);
            }

            $sql .= " GROUP BY di.numero_di, di.data_registro, imp.nome, imp.endereco_uf,
                     di.total_adicoes, di.carga_peso_bruto, di.carga_peso_liquido,
                     di.carga_pais_procedencia_nome, di.created_at, di.updated_at, imp.id
                     ORDER BY di.data_registro DESC, di.created_at DESC
                     LIMIT ? OFFSET ?";

            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $resultados = $stmt->fetchAll();

            // Contar total de registros para paginação
            $count_sql = str_replace(
                ['SELECT di.numero_di,', 'GROUP BY', 'ORDER BY', 'LIMIT'],
                ['SELECT COUNT(DISTINCT di.numero_di) as total', '-- GROUP BY', '-- ORDER BY', '-- LIMIT'],
                substr($sql, 0, strpos($sql, 'GROUP BY'))
            );
            
            $count_params = array_slice($params, 0, -2); // Remove LIMIT e OFFSET
            $count_stmt = $this->db->prepare($count_sql);
            $count_stmt->execute($count_params);
            $count_result = $count_stmt->fetch();
            $total_registros = $count_result['total'] ?? 0;

            return [
                'success' => true,
                'data' => $resultados,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total_registros,
                    'last_page' => ceil($total_registros / $limit)
                ]
            ];

        } catch (PDOException $e) {
            error_log("Erro ao listar DIs: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Erro interno do servidor',
                'debug' => $e->getMessage()
            ];
        }
    }

    /**
     * Buscar DI específica com todos os dados relacionados
     */
    public function buscarDI($numero_di) {
        try {
            // Dados principais da DI
            $sql_di = "SELECT 
                           di.*,
                           imp.nome as importador_nome,
                           imp.cnpj as importador_cnpj,
                           imp.endereco_uf as importador_uf,
                           imp.endereco_cidade as importador_cidade
                       FROM declaracoes_importacao di
                       LEFT JOIN importadores imp ON di.importador_id = imp.id
                       WHERE di.numero_di = ?";

            $stmt = $this->db->prepare($sql_di);
            $stmt->execute([$numero_di]);
            $di = $stmt->fetch();

            if (!$di) {
                return [
                    'success' => false,
                    'error' => 'DI não encontrada'
                ];
            }

            // Buscar adições
            $di['adicoes'] = $this->buscarAdicoesDI($numero_di);

            // Buscar ICMS
            $di['icms'] = $this->buscarICMSDI($numero_di);

            // Buscar despesas, pagamentos, acréscimos
            $di['despesas'] = $this->buscarDespesasDI($numero_di);
            $di['pagamentos'] = $this->buscarPagamentosDI($numero_di);
            $di['acrescimos'] = $this->buscarAcrescimosDI($numero_di);

            return [
                'success' => true,
                'data' => $di
            ];

        } catch (PDOException $e) {
            error_log("Erro ao buscar DI {$numero_di}: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Erro interno do servidor',
                'debug' => $e->getMessage()
            ];
        }
    }

    /**
     * Buscar adições de uma DI
     */
    public function buscarAdicoesDI($numero_di, $numero_adicao = null) {
        try {
            $sql = "SELECT 
                        a.*,
                        f.nome as fornecedor_nome,
                        f.cidade as fornecedor_cidade,
                        f.pais as fornecedor_pais,
                        fab.nome as fabricante_nome,
                        fab.cidade as fabricante_cidade,
                        fab.pais as fabricante_pais
                    FROM adicoes a
                    LEFT JOIN fornecedores f ON a.fornecedor_id = f.id
                    LEFT JOIN fabricantes fab ON a.fabricante_id = fab.id
                    WHERE a.numero_di = ?";

            $params = [$numero_di];

            if ($numero_adicao) {
                $sql .= " AND a.numero_adicao = ?";
                $params[] = $numero_adicao;
            }

            $sql .= " ORDER BY a.numero_adicao";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $adicoes = $stmt->fetchAll();

            // Buscar tributos e mercadorias para cada adição
            foreach ($adicoes as &$adicao) {
                $adicao['tributos'] = $this->buscarTributosAdicao($adicao['id']);
                $adicao['mercadorias'] = $this->buscarMercadoriasAdicao($adicao['id']);
            }

            return $adicoes;

        } catch (PDOException $e) {
            error_log("Erro ao buscar adições da DI {$numero_di}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Buscar tributos de uma adição
     */
    public function buscarTributosAdicao($adicao_id) {
        try {
            $sql = "SELECT * FROM tributos WHERE adicao_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$adicao_id]);
            return $stmt->fetch() ?: [];
        } catch (PDOException $e) {
            error_log("Erro ao buscar tributos da adição {$adicao_id}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Buscar mercadorias de uma adição
     */
    public function buscarMercadoriasAdicao($adicao_id) {
        try {
            $sql = "SELECT * FROM mercadorias WHERE adicao_id = ? ORDER BY numero_sequencial_item";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$adicao_id]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Erro ao buscar mercadorias da adição {$adicao_id}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Buscar dados ICMS de uma DI
     */
    public function buscarICMSDI($numero_di) {
        try {
            $sql = "SELECT * FROM icms WHERE numero_di = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$numero_di]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Erro ao buscar ICMS da DI {$numero_di}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Buscar despesas aduaneiras de uma DI
     */
    public function buscarDespesasDI($numero_di) {
        try {
            $sql = "SELECT * FROM despesas_aduaneiras WHERE numero_di = ? ORDER BY tipo_despesa";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$numero_di]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Erro ao buscar despesas da DI {$numero_di}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Buscar pagamentos de uma DI
     */
    public function buscarPagamentosDI($numero_di) {
        try {
            $sql = "SELECT * FROM pagamentos WHERE numero_di = ? ORDER BY codigo_receita";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$numero_di]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Erro ao buscar pagamentos da DI {$numero_di}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Buscar acréscimos de uma DI
     */
    public function buscarAcrescimosDI($numero_di) {
        try {
            $sql = "SELECT * FROM acrescimos WHERE numero_di = ? ORDER BY codigo_acrescimo";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$numero_di]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Erro ao buscar acréscimos da DI {$numero_di}: " . $e->getMessage());
            return [];
        }
    }

    // ===================================================================
    // SERVIÇOS DE CÁLCULOS
    // ===================================================================

    /**
     * Salvar cálculo realizado
     */
    public function salvarCalculo($dados_calculo) {
        try {
            $this->db->beginTransaction();

            $sql = "INSERT INTO calculos_salvos (
                        numero_di, estado_icms, tipo_calculo, dados_entrada, 
                        dados_calculo, resultados, hash_dados
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        dados_entrada = VALUES(dados_entrada),
                        dados_calculo = VALUES(dados_calculo),
                        resultados = VALUES(resultados),
                        hash_dados = VALUES(hash_dados),
                        updated_at = CURRENT_TIMESTAMP";

            $hash_dados = md5(json_encode($dados_calculo));

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $dados_calculo['numero_di'],
                $dados_calculo['estado_icms'],
                $dados_calculo['tipo_calculo'] ?? 'CONFORMIDADE',
                json_encode($dados_calculo['dados_entrada'] ?? []),
                json_encode($dados_calculo['dados_calculo'] ?? []),
                json_encode($dados_calculo['resultados'] ?? []),
                $hash_dados
            ]);

            $calculo_id = $this->db->lastInsertId();
            $this->db->commit();

            return [
                'success' => true,
                'calculo_id' => $calculo_id,
                'message' => 'Cálculo salvo com sucesso'
            ];

        } catch (PDOException $e) {
            $this->db->rollback();
            error_log("Erro ao salvar cálculo: " . $e->getMessage());
            
            // Check for foreign key constraint violation
            if ($e->getCode() == '23000' && strpos($e->getMessage(), 'foreign key constraint fails') !== false) {
                if (strpos($e->getMessage(), 'numero_di') !== false) {
                    return [
                        'success' => false,
                        'error' => "DI '{$dados_calculo['numero_di']}' não existe no banco de dados. Importe a DI primeiro antes de salvar cálculos.",
                        'debug' => $e->getMessage(),
                        'error_type' => 'DI_NOT_FOUND'
                    ];
                }
            }
            
            return [
                'success' => false,
                'error' => 'Erro ao salvar cálculo no banco de dados',
                'debug' => $e->getMessage()
            ];
        }
    }

    /**
     * Buscar cálculos salvos
     */
    public function buscarCalculos($numero_di, $estado_icms = null, $tipo_calculo = null) {
        try {
            $sql = "SELECT * FROM calculos_salvos WHERE numero_di = ?";
            $params = [$numero_di];

            if ($estado_icms) {
                $sql .= " AND estado_icms = ?";
                $params[] = $estado_icms;
            }

            if ($tipo_calculo) {
                $sql .= " AND tipo_calculo = ?";
                $params[] = $tipo_calculo;
            }

            $sql .= " ORDER BY created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $calculos = $stmt->fetchAll();

            // Decodificar JSONs
            foreach ($calculos as &$calculo) {
                $calculo['dados_entrada'] = json_decode($calculo['dados_entrada'], true);
                $calculo['dados_calculo'] = json_decode($calculo['dados_calculo'], true);
                $calculo['resultados'] = json_decode($calculo['resultados'], true);
            }

            return [
                'success' => true,
                'data' => $calculos
            ];

        } catch (PDOException $e) {
            error_log("Erro ao buscar cálculos: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Erro interno do servidor',
                'debug' => $e->getMessage()
            ];
        }
    }

    // ===================================================================
    // SERVIÇOS DE ESTATÍSTICAS
    // ===================================================================

    /**
     * Obter estatísticas gerais do sistema
     */
    public function obterEstatisticas() {
        try {
            $stats = [];

            // Total de DIs
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM declaracoes_importacao");
            $stats['total_dis'] = $stmt->fetch()['total'];

            // Total de adições
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM adicoes");
            $stats['total_adicoes'] = $stmt->fetch()['total'];

            // Total de mercadorias
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM mercadorias");
            $stats['total_mercadorias'] = $stmt->fetch()['total'];

            // Total de importadores únicos
            $stmt = $this->db->query("SELECT COUNT(DISTINCT importador_id) as total FROM declaracoes_importacao");
            $stats['total_importadores'] = $stmt->fetch()['total'];

            // Valor total importado
            $stmt = $this->db->query("SELECT COALESCE(SUM(valor_reais), 0) as total FROM adicoes");
            $stats['valor_total_importado'] = $stmt->fetch()['total'];

            // DIs por estado
            $stmt = $this->db->query("
                SELECT imp.endereco_uf as uf, COUNT(*) as total
                FROM declaracoes_importacao di
                JOIN importadores imp ON di.importador_id = imp.id
                GROUP BY imp.endereco_uf
                ORDER BY total DESC
                LIMIT 10
            ");
            $stats['dis_por_estado'] = $stmt->fetchAll();

            // NCMs mais importados
            $stmt = $this->db->query("
                SELECT ncm, COUNT(*) as total, SUM(valor_reais) as valor_total
                FROM adicoes
                WHERE ncm IS NOT NULL
                GROUP BY ncm
                ORDER BY total DESC
                LIMIT 10
            ");
            $stats['ncms_mais_importados'] = $stmt->fetchAll();

            return [
                'success' => true,
                'data' => $stats
            ];

        } catch (PDOException $e) {
            error_log("Erro ao obter estatísticas: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Erro interno do servidor',
                'debug' => $e->getMessage()
            ];
        }
    }

    // ===================================================================
    // MÉTODOS DE ACESSO À CONEXÃO
    // ===================================================================

    /**
     * Obter conexão PDO para uso em endpoints específicos
     * 
     * @return PDO A conexão com o banco de dados
     */
    public function getConnection() {
        if (!$this->db) {
            throw new Exception('Conexão com banco de dados não está disponível');
        }
        return $this->db;
    }

    // ===================================================================
    // SERVIÇOS DE SISTEMA
    // ===================================================================

    /**
     * Testar status da conexão
     */
    public function testarConexao() {
        try {
            $info = $this->config->testConnection();
            return [
                'success' => true,
                'data' => $info
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Obter informações sobre as tabelas
     */
    public function obterInfoTabelas() {
        try {
            $tabelas = $this->config->getTables();
            $info = [];

            foreach ($tabelas as $tabela) {
                // Contar registros
                $stmt = $this->db->prepare("SELECT COUNT(*) as total FROM `{$tabela}`");
                $stmt->execute();
                $total = $stmt->fetch()['total'];

                $info[] = [
                    'nome' => $tabela,
                    'total_registros' => $total
                ];
            }

            return [
                'success' => true,
                'data' => $info
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Busca despesas aduaneiras extraídas de informações complementares
     */
    public function buscarDespesasAduaneiras($numero_di) {
        try {
            $sql = "
                SELECT 
                    tipo_despesa,
                    codigo_receita,
                    descricao,
                    valor,
                    created_at
                FROM despesas_aduaneiras
                WHERE numero_di = ?
                ORDER BY tipo_despesa, valor DESC
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$numero_di]);
            $despesas = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => $despesas,
                'total' => count($despesas)
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'error' => 'Erro ao buscar despesas aduaneiras: ' . $e->getMessage()
            ];
        }
    }
}
?>