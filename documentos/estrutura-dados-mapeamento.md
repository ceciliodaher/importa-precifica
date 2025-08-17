# Estrutura de Dados e Mapeamento
## Sistema de Importação e Precificação Expertzy

---

### 1. Mapeamento XML DI → Sistema

#### 1.1 Dados Gerais da DI

**Origem XML → Campos Sistema:**
```xml
<!-- Estrutura típica XML DI -->
<DI>
    <numero>2300120746</numero>
    <dataRegistro>20230102</dataRegistro>
    <urfDespacho>GOIANIA</urfDespacho>
    <modalidade>Normal</modalidade>
    <situacao>ENTREGA NAO AUTORIZADA</situacao>
    <importador>
        <nome>RAZAO SOCIAL DO IMPORTADOR</nome>
        <cnpj>00.000.000/0001-00</cnpj>
    </importador>
</DI>
```

**Mapeamento Sistema:**
```php
class DiData {
    public $numero_di;          // <- numero
    public $data_registro;      // <- dataRegistro
    public $urf_despacho;      // <- urfDespacho
    public $modalidade;        // <- modalidade
    public $situacao;          // <- situacao
    public $importador_nome;   // <- importador/nome
    public $importador_cnpj;   // <- importador/cnpj
    public $total_adicoes;     // Contagem automática
    public $valor_total_usd;   // Somatória das adições
    public $valor_total_brl;   // Conversão cambial
}
```

#### 1.2 Dados de Adições

**Estrutura por Adição:**
```php
class Adicao {
    public $numero_adicao;     // Sequencial (001, 002, etc.)
    public $ncm;               // Classificação fiscal
    public $descricao_ncm;     // Descrição oficial da NCM
    public $peso_liquido;      // Em quilogramas
    public $quantidade;        // Quantidade importada
    public $unidade;           // Unidade de medida
    public $valor_vmcv_usd;    // Valor FOB/CFR em USD
    public $valor_vmcv_brl;    // Valor FOB/CFR em BRL
    public $incoterm;          // Termo de comércio
    public $local_embarque;    // Porto/local de embarque
    public $moeda;             // Moeda da transação
    public $exportador;        // Dados do exportador
    public $pais_aquisicao;    // País de aquisição
    public $fabricante;        // Fabricante dos produtos
    public $pais_origem;       // País de origem
}
```

#### 1.3 Dados de Produtos por Adição

**Estrutura Detalhada:**
```php
class Produto {
    public $codigo_item;       // Código interno (IC0001, IC0002, etc.)
    public $adicao_numero;     // Referência à adição
    public $descricao;         // Descrição completa do produto
    public $ncm;               // NCM específica do produto
    public $peso_unitario;     // Peso por unidade
    public $quantidade_caixas; // Número de caixas
    public $quantidade_por_caixa; // Unidades por caixa
    public $quantidade_total;  // Total de unidades
    public $valor_unitario_usd; // Valor unitário em USD
    public $valor_total_usd;   // Valor total em USD
    public $valor_unitario_brl; // Valor unitário em BRL
    public $valor_total_brl;   // Valor total em BRL
}
```

### 2. Estrutura de Cálculos Tributários

#### 2.1 Base de Cálculo por Tributo

**Composição das Bases:**
```php
class BaseCalculoTributos {
    // Base para Imposto de Importação
    public $base_ii;           // Valor aduaneiro (FOB + frete + seguro)
    
    // Base para IPI
    public $base_ipi;          // Base II + II
    
    // Base para PIS/COFINS
    public $base_pis_cofins;   // Base IPI + IPI
    
    // Base para ICMS
    public $base_icms;         // Base PIS/COFINS + PIS + COFINS + despesas extras
    
    // Componentes adicionais
    public $frete_internacional; // Frete já incluído no CFR
    public $seguro_internacional; // Seguro internacional
    public $despesas_portuarias; // Capatazia, armazenagem, etc.
    public $despesas_bancarias;  // Câmbio, remessas
    public $despesas_administrativas; // Despachante, honorários
}
```

#### 2.2 Cálculos de Tributos

**Estrutura de Impostos:**
```php
class CalculoImpostos {
    // Imposto de Importação
    public $ii_aliquota;       // % do II para a NCM
    public $ii_base;           // Base de cálculo
    public $ii_valor;          // Valor calculado
    public $ii_regime;         // Regime de recolhimento
    
    // IPI
    public $ipi_aliquota;      // % do IPI para a NCM
    public $ipi_base;          // Base de cálculo
    public $ipi_valor;         // Valor calculado
    
    // PIS
    public $pis_aliquota;      // % do PIS para a NCM
    public $pis_base;          // Base de cálculo
    public $pis_valor;         // Valor calculado
    
    // COFINS
    public $cofins_aliquota;   // % da COFINS para a NCM
    public $cofins_base;       // Base de cálculo
    public $cofins_valor;      // Valor calculado
    
    // ICMS
    public $icms_aliquota;     // % do ICMS do estado
    public $icms_base;         // Base de cálculo
    public $icms_valor;        // Valor calculado
    public $icms_reducao;      // % de redução se aplicável
    public $icms_aliq_reduzida; // Alíquota após redução
    
    // Tributos especiais
    public $antidumping_valor; // Direito antidumping se aplicável
    public $siscomex_valor;    // Taxa Siscomex rateada
    public $afrmm_valor;       // AFRMM rateado
}
```

### 3. Sistema de Precificação

#### 3.1 Estrutura de Custos

**Composição Completa de Custos:**
```php
class EstruturaCustos {
    // Custos de importação
    public $valor_mercadoria;    // Valor FOB/CFR
    public $frete_internacional; // Frete incluído
    public $seguro_internacional; // Seguro incluído
    public $despesas_portuarias; // Custos portuários
    public $despesas_cambio;     // Custos de câmbio
    public $despesas_despacho;   // Despachante
    
    // Tributos de importação
    public $ii_valor;            // Imposto de Importação
    public $ipi_valor;           // IPI
    public $pis_valor;           // PIS
    public $cofins_valor;        // COFINS
    public $icms_valor;          // ICMS
    public $antidumping_valor;   // Antidumping
    public $siscomex_valor;      // Siscomex
    public $afrmm_valor;         // AFRMM
    
    // Custo total
    public $custo_total;         // Soma de todos os custos
    public $custo_unitario;      // Custo por unidade
}
```

#### 3.2 Parâmetros de Precificação

**Configuração por Tipo de Cliente:**
```php
class ParametrosPrecificacao {
    public $tipo_cliente;        // 'consumidor', 'revenda', 'industria'
    public $estado_destino;      // Estado de destino da mercadoria
    public $regime_tributario;   // 'real', 'presumido', 'simples'
    
    // Margens comerciais
    public $margem_bruta;        // % de margem bruta desejada
    public $margem_liquida;      // % de margem líquida alvo
    public $markup_padrao;       // Markup padrão para o segmento
    
    // Tributos de saída
    public $icms_saida_aliq;     // ICMS na saída
    public $icms_st_aplicavel;   // Se aplica substituição tributária
    public $icms_st_mva;         // MVA para ST
    public $pis_saida_aliq;      // PIS na saída
    public $cofins_saida_aliq;   // COFINS na saída
    public $ipi_saida_aliq;      // IPI na saída (se aplicável)
    
    // Benefícios fiscais
    public $beneficio_estadual;  // Código do benefício estadual
    public $reducao_icms;        // % de redução de ICMS
    public $credito_presumido;   // Crédito presumido aplicável
}
```

### 4. Tabelas de Referência

#### 4.1 Base de Alíquotas Tributárias

**Estrutura JSON para NCMs:**
```json
{
    "ncm_database": {
        "84099118": {
            "descricao": "Carburador para motocicleta",
            "ii": 0.16,
            "ipi": 0.0325,
            "pis_importacao": 0.0312,
            "cofins_importacao": 0.1437,
            "pis_saida_real": 0.0165,
            "cofins_saida_real": 0.076,
            "pis_saida_presumido": 0.0065,
            "cofins_saida_presumido": 0.03,
            "icms_estados": {
                "GO": {"aliquota": 0.17, "reducao": null},
                "SC": {"aliquota": 0.17, "reducao": null},
                "MG": {"aliquota": 0.18, "reducao": null},
                "ES": {"aliquota": 0.17, "reducao": null}
            },
            "st_aplicavel": false,
            "observacoes": "NCM típica para autopeças"
        }
    }
}
```

#### 4.2 Benefícios Fiscais por Estado

**Configuração de Incentivos:**
```json
{
    "beneficios_estaduais": {
        "GO": {
            "fomentar": {
                "ncms_elegiveis": ["84099*", "84133*"],
                "reducao_icms": 0.75,
                "condicoes": "Indústria ou revenda",
                "vigencia": "2025-12-31"
            },
            "produzir": {
                "ncms_elegiveis": ["87141*"],
                "diferimento": true,
                "condicoes": "Industrialização",
                "vigencia": "2025-12-31"
            }
        },
        "SC": {
            "pro_emprego": {
                "reducao_icms": 0.40,
                "investimento_minimo": 1000000,
                "empregos_minimos": 50
            }
        },
        "MG": {
            "pro_mg": {
                "credito_presumido": 0.30,
                "ncms_elegiveis": ["84*", "85*"],
                "condicoes": "Revenda ou industrialização"
            }
        },
        "ES": {
            "invest_es": {
                "diferimento_icms": true,
                "prazo_pagamento": 60,
                "condicoes": "Investimento em ativo fixo"
            }
        }
    }
}
```

### 5. Estrutura de Banco de Dados (Opcional)

#### 5.1 Tabelas Principais

**Declarações de Importação:**
```sql
CREATE TABLE declaracoes_importacao (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_di VARCHAR(20) UNIQUE NOT NULL,
    data_registro DATE NOT NULL,
    urf_despacho VARCHAR(100),
    importador_cnpj VARCHAR(18),
    importador_nome VARCHAR(255),
    valor_total_usd DECIMAL(15,2),
    valor_total_brl DECIMAL(15,2),
    taxa_cambio DECIMAL(10,6),
    status_processamento ENUM('processando', 'concluido', 'erro'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Adições da DI:**
```sql
CREATE TABLE adicoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    di_id INT NOT NULL,
    numero_adicao VARCHAR(10) NOT NULL,
    ncm VARCHAR(10) NOT NULL,
    descricao_ncm TEXT,
    peso_liquido DECIMAL(12,3),
    quantidade DECIMAL(12,3),
    unidade VARCHAR(50),
    valor_vmcv_usd DECIMAL(15,2),
    valor_vmcv_brl DECIMAL(15,2),
    exportador VARCHAR(255),
    pais_origem VARCHAR(100),
    FOREIGN KEY (di_id) REFERENCES declaracoes_importacao(id)
);
```

**Produtos por Adição:**
```sql
CREATE TABLE produtos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    adicao_id INT NOT NULL,
    codigo_item VARCHAR(20),
    descricao TEXT NOT NULL,
    quantidade_caixas INT,
    quantidade_por_caixa INT,
    quantidade_total INT,
    peso_unitario DECIMAL(8,3),
    valor_unitario_usd DECIMAL(10,4),
    valor_total_usd DECIMAL(15,2),
    FOREIGN KEY (adicao_id) REFERENCES adicoes(id)
);
```

**Cálculos Tributários:**
```sql
CREATE TABLE calculos_tributarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    produto_id INT NOT NULL,
    ii_aliquota DECIMAL(6,4),
    ii_base DECIMAL(15,2),
    ii_valor DECIMAL(15,2),
    ipi_aliquota DECIMAL(6,4),
    ipi_base DECIMAL(15,2),
    ipi_valor DECIMAL(15,2),
    pis_aliquota DECIMAL(6,4),
    pis_valor DECIMAL(15,2),
    cofins_aliquota DECIMAL(6,4),
    cofins_valor DECIMAL(15,2),
    icms_aliquota DECIMAL(6,4),
    icms_base DECIMAL(15,2),
    icms_valor DECIMAL(15,2),
    custo_total DECIMAL(15,2),
    custo_unitario DECIMAL(10,4),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);
```

### 6. APIs e Interfaces de Dados

#### 6.1 Estrutura de Response JSON

**Formato da Resposta da API (dados dinâmicos conforme DI processada):**
```json
{
    "status": "success|error",
    "data": {
        "di": {
            "numero": "{numero_da_di_processada}",
            "data_registro": "{data_registro_extraida}",
            "importador": "{nome_importador_extraido}",
            "valor_total_usd": "{valor_calculado}",
            "valor_total_brl": "{valor_convertido}",
            "taxa_cambio": "{taxa_utilizada}"
        },
        "adicoes": [
            {
                "numero": "{numero_adicao}",
                "ncm": "{ncm_extraida}",
                "descricao": "{descricao_ncm_encontrada}",
                "produtos": [
                    {
                        "codigo": "{codigo_produto_extraido}",
                        "descricao": "{descricao_produto_extraida}",
                        "quantidade": "{quantidade_calculada}",
                        "custo_unitario": "{custo_calculado}",
                        "custo_total": "{custo_total_calculado}",
                        "tributos": {
                            "ii": "{valor_ii_calculado}",
                            "ipi": "{valor_ipi_calculado}",
                            "pis": "{valor_pis_calculado}",
                            "cofins": "{valor_cofins_calculado}",
                            "icms": "{valor_icms_calculado}"
                        }
                    }
                ]
            }
        ],
        "resumo": {
            "custo_total_importacao": "{soma_todos_custos}",
            "total_tributos": "{soma_todos_tributos}",
            "custo_mais_tributos": "{custo_final_calculado}"
        }
    },
    "timestamp": "{timestamp_processamento}"
}
```

#### 6.2 Endpoints da API

**Processamento de DI:**
```php
// POST /api/processar-di
class ProcessarDiController {
    public function processar(Request $request) {
        $xmlFile = $request->file('xml_di');
        
        // Validação do arquivo
        $validator = new XmlValidator();
        if (!$validator->validate($xmlFile)) {
            return response()->json(['error' => 'XML inválido'], 400);
        }
        
        // Processamento
        $processor = new DiProcessor();
        $data = $processor->parseXml($xmlFile);
        
        // Cálculos automáticos
        $calculator = new TributaryCalculator();
        $results = $calculator->calculateAll($data);
        
        return response()->json([
            'status' => 'success',
            'data' => $results
        ]);
    }
}
```

### 7. Validações e Regras de Negócio

#### 7.1 Validações de Entrada

**Regras para XML da DI:**
```php
class XmlValidationRules {
    public static $required_fields = [
        'numero_di' => 'required|numeric|digits:10',
        'data_registro' => 'required|date|format:Ymd',
        'adicoes' => 'required|array|min:1',
        'adicoes.*.ncm' => 'required|numeric|digits:8',
        'adicoes.*.valor_usd' => 'required|numeric|min:0.01'
    ];
    
    public static $business_rules = [
        'valor_total_consistencia' => 'A soma das adições deve igual ao valor total da DI',
        'peso_total_consistencia' => 'A soma dos pesos deve ser consistente',
        'ncm_valida' => 'NCM deve existir na tabela da Receita Federal'
    ];
}
```

#### 7.2 Regras de Cálculo Tributário

**Sequência de Cálculos:**
```php
class TaxCalculationSequence {
    public function calculate($adicao) {
        // 1. Base II = Valor Aduaneiro (FOB + Frete + Seguro)
        $base_ii = $adicao->valor_fob + $adicao->frete + $adicao->seguro;
        
        // 2. II = Base II × Alíquota II
        $ii_valor = $base_ii * $adicao->ii_aliquota;
        
        // 3. Base IPI = Base II + II
        $base_ipi = $base_ii + $ii_valor;
        
        // 4. IPI = Base IPI × Alíquota IPI
        $ipi_valor = $base_ipi * $adicao->ipi_aliquota;
        
        // 5. Base PIS/COFINS = Base IPI + IPI
        $base_pis_cofins = $base_ipi + $ipi_valor;
        
        // 6. PIS = Base PIS × Alíquota PIS
        $pis_valor = $base_pis_cofins * $adicao->pis_aliquota;
        
        // 7. COFINS = Base COFINS × Alíquota COFINS
        $cofins_valor = $base_pis_cofins * $adicao->cofins_aliquota;
        
        // 8. Base ICMS = Base PIS/COFINS + PIS + COFINS + Despesas Extras
        $base_icms = $base_pis_cofins + $pis_valor + $cofins_valor + $adicao->despesas_extras;
        
        // 9. ICMS = Base ICMS × Alíquota ICMS (com reduções se aplicável)
        $icms_valor = $base_icms * $adicao->icms_aliquota_efetiva;
        
        return [
            'bases' => compact('base_ii', 'base_ipi', 'base_pis_cofins', 'base_icms'),
            'tributos' => compact('ii_valor', 'ipi_valor', 'pis_valor', 'cofins_valor', 'icms_valor')
        ];
    }
}
```

### 8. Configurações e Personalizações

#### 8.1 Arquivo de Configuração Principal

**config/app_config.php:**
```php
<?php
return [
    'app' => [
        'name' => 'Sistema Expertzy Importação',
        'version' => '1.0.0',
        'environment' => 'production'
    ],
    
    'upload' => [
        'max_file_size' => 50 * 1024 * 1024, // 50MB
        'allowed_extensions' => ['xml'],
        'temp_directory' => '/data/uploads/',
        'auto_cleanup_hours' => 24
    ],
    
    'calculation' => [
        'default_exchange_rate_source' => 'bcb', // Banco Central
        'precision_decimals' => 4,
        'rounding_mode' => 'round_half_up'
    ],
    
    'reporting' => [
        'default_format' => 'pdf',
        'include_watermark' => true,
        'logo_path' => '/assets/expertzy-logo.png'
    ],
    
    'database' => [
        'use_database' => false, // Usar BD ou arquivos
        'connection' => 'mysql',
        'backup_to_files' => true
    ]
];
```

#### 8.2 Templates Customizáveis

**Estrutura de Templates:**
```php
class TemplateManager {
    private $templates_path = '/data/templates/';
    
    public function loadTemplate($type, $client = 'default') {
        $template_file = $this->templates_path . $type . '_' . $client . '.json';
        
        if (!file_exists($template_file)) {
            $template_file = $this->templates_path . $type . '_default.json';
        }
        
        return json_decode(file_get_contents($template_file), true);
    }
    
    public function saveTemplate($type, $client, $data) {
        $template_file = $this->templates_path . $type . '_' . $client . '.json';
        return file_put_contents($template_file, json_encode($data, JSON_PRETTY_PRINT));
    }
}
```

---

*Esta especificação serve como base técnica para o desenvolvimento do sistema, garantindo consistência na estrutura de dados e facilidade de manutenção e evolução da solução.*

*© 2025 Expertzy Inteligência Tributária*