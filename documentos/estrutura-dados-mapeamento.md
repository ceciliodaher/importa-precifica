# Estrutura de Dados e Mapeamento CORRIGIDA
## Sistema de Importação e Precificação Expertzy

---

### 1. Mapeamento Completo XML DI → Sistema

#### 1.1 Dados Gerais da DI (Extração Real)

**Mapeamento baseado no XML real fornecido:**
```xml
<!-- Estrutura real do XML DI 2300120746 -->
<declaracaoImportacao>
    <numeroDI>2300120746</numeroDI>
    <dataRegistro>20230102</dataRegistro>
    <urfDespachoCodigo>0120100</urfDespachoCodigo>
    <urfDespachoNome>GOIANIA</urfDespachoNome>
    <modalidadeDespachoCodigo>1</modalidadeDespachoCodigo>
    <modalidadeDespachoNome>Normal</modalidadeDespachoNome>
    <situacaoEntregaCarga>ENTREGA NAO AUTORIZADA</situacaoEntregaCarga>
    <totalAdicoes>016</totalAdicoes>
</xml>
```

**Mapeamento Sistema:**
```php
class DiData {
    public $numero_di;                    // <- numeroDI
    public $data_registro;                // <- dataRegistro (converter de AAAAMMDD)
    public $urf_despacho_codigo;          // <- urfDespachoCodigo
    public $urf_despacho_nome;            // <- urfDespachoNome
    public $modalidade_codigo;            // <- modalidadeDespachoCodigo
    public $modalidade_nome;              // <- modalidadeDespachoNome
    public $situacao_entrega;             // <- situacaoEntregaCarga
    public $total_adicoes;                // <- totalAdicoes
    
    // Dados do importador
    public $importador_nome;              // <- importadorNome
    public $importador_cnpj;              // <- importadorNumero
    public $importador_endereco_completo; // <- Concatenar todos campos de endereço
    public $importador_representante;     // <- importadorNomeRepresentanteLegal
    public $importador_cpf_representante; // <- importadorCpfRepresentanteLegal
    public $importador_telefone;          // <- importadorNumeroTelefone
    
    // Dados da carga
    public $carga_peso_bruto;             // <- cargaPesoBruto
    public $carga_peso_liquido;           // <- cargaPesoLiquido
    public $carga_pais_procedencia;       // <- cargaPaisProcedenciaNome
    public $carga_urf_entrada;            // <- cargaUrfEntradaNome
    public $carga_data_chegada;           // <- cargaDataChegada
    
    // Dados de transporte
    public $via_transporte;               // <- viaTransporteNome
    public $nome_veiculo;                 // <- viaTransporteNomeVeiculo
    public $nome_transportador;           // <- viaTransporteNomeTransportador
    
    // Valores totais calculados
    public $valor_total_fob_usd;          // <- Soma localEmbarqueTotalDolares
    public $valor_total_fob_brl;          // <- Soma localEmbarqueTotalReais
    public $valor_total_frete_usd;        // <- freteTotalDolares
    public $valor_total_frete_brl;        // <- freteTotalReais
    public $valor_aduaneiro_total_usd;    // <- localDescargaTotalDolares
    public $valor_aduaneiro_total_brl;    // <- localDescargaTotalReais
    
    // Informações complementares críticas
    public $informacao_complementar;      // <- informacaoComplementar (TEXTO COMPLETO)
    public $siscomex_valor;               // <- Extrair de informacaoComplementar ou pagamentos
    public $afrmm_valor;                  // <- Extrair de informacaoComplementar
    public $taxa_cambio_fob;              // <- Extrair de informacaoComplementar
    public $taxa_cambio_frete;            // <- Extrair de informacaoComplementar
}
```

#### 1.2 Dados Completos de Adições

**Estrutura detalhada por adição:**
```php
class Adicao {
    // Identificação
    public $numero_adicao;                    // <- Sequencial (extrair da posição)
    public $numero_sequencial_item;           // <- numeroSequencialItem
    
    // Classificação fiscal
    public $ncm;                              // <- dadosMercadoriaCodigoNcm
    public $descricao_ncm;                    // <- dadosMercadoriaNomeNcm
    public $codigo_naladi_sh;                 // <- dadosMercadoriaCodigoNaladiSH
    public $codigo_naladi_ncca;               // <- dadosMercadoriaCodigoNaladiNCCA
    
    // Medidas e quantidades
    public $peso_liquido;                     // <- dadosMercadoriaPesoLiquido
    public $quantidade_estatistica;           // <- dadosMercadoriaMedidaEstatisticaQuantidade
    public $unidade_estatistica;              // <- dadosMercadoriaMedidaEstatisticaUnidade
    public $aplicacao_mercadoria;             // <- dadosMercadoriaAplicacao
    public $condicao_mercadoria;              // <- dadosMercadoriaCondicao
    
    // Valores comerciais
    public $condicao_venda_incoterm;          // <- condicaoVendaIncoterm
    public $condicao_venda_local;             // <- condicaoVendaLocal
    public $moeda_negociacao_codigo;          // <- condicaoVendaMoedaCodigo
    public $moeda_negociacao_nome;            // <- condicaoVendaMoedaNome
    public $valor_moeda_negociacao;           // <- condicaoVendaValorMoeda
    public $valor_reais;                      // <- condicaoVendaValorReais
    
    // Método de valoração
    public $metodo_valoracao_codigo;          // <- condicaoVendaMetodoValoracaoCodigo
    public $metodo_valoracao_nome;            // <- condicaoVendaMetodoValoracaoNome
    
    // Dados do fornecedor/exportador
    public $fornecedor_nome;                  // <- fornecedorNome
    public $fornecedor_endereco_completo;     // <- Concatenar todos campos
    public $fornecedor_cidade;                // <- fornecedorCidade
    public $fornecedor_estado;                // <- fornecedorEstado
    
    // Dados do fabricante
    public $fabricante_nome;                  // <- fabricanteNome
    public $fabricante_endereco_completo;     // <- Concatenar todos campos
    public $fabricante_cidade;                // <- fabricanteCidade
    public $fabricante_estado;                // <- fabricanteEstado
    
    // Tributos federais - II
    public $ii_regime_codigo;                 // <- iiRegimeTributacaoCodigo
    public $ii_regime_nome;                   // <- iiRegimeTributacaoNome
    public $ii_aliquota_ad_valorem;           // <- iiAliquotaAdValorem (dividir por 10000)
    public $ii_base_calculo;                  // <- iiBaseCalculo (dividir por 100)
    public $ii_valor_calculado;               // <- iiAliquotaValorCalculado (dividir por 100)
    public $ii_valor_devido;                  // <- iiAliquotaValorDevido (dividir por 100)
    public $ii_valor_recolher;                // <- iiAliquotaValorRecolher (dividir por 100)
    
    // Tributos federais - IPI
    public $ipi_regime_codigo;                // <- ipiRegimeTributacaoCodigo
    public $ipi_regime_nome;                  // <- ipiRegimeTributacaoNome
    public $ipi_aliquota_ad_valorem;          // <- ipiAliquotaAdValorem (dividir por 10000)
    public $ipi_valor_devido;                 // <- ipiAliquotaValorDevido (dividir por 100)
    public $ipi_valor_recolher;               // <- ipiAliquotaValorRecolher (dividir por 100)
    
    // Tributos federais - PIS
    public $pis_aliquota_ad_valorem;          // <- pisAliquotaAdValorem (dividir por 10000)
    public $pis_valor_devido;                 // <- pisAliquotaValorDevido (dividir por 100)
    public $pis_valor_recolher;               // <- pisAliquotaValorRecolher (dividir por 100)
    
    // Tributos federais - COFINS
    public $cofins_aliquota_ad_valorem;       // <- cofinsAliquotaAdValorem (dividir por 10000)
    public $cofins_valor_devido;              // <- cofinsAliquotaValorDevido (dividir por 100)
    public $cofins_valor_recolher;            // <- cofinsAliquotaValorRecolher (dividir por 100)
    
    // Frete e seguro por adição
    public $frete_valor_moeda_negociada;      // <- freteValorMoedaNegociada (dividir por 100)
    public $frete_valor_reais;                // <- freteValorReais (dividir por 100)
    public $seguro_valor_moeda_negociada;     // <- seguroValorMoedaNegociada (dividir por 100)
    public $seguro_valor_reais;               // <- seguroValorReais (dividir por 100)
    
    // Relacionamento comercial
    public $codigo_relacao_comprador_vendedor; // <- codigoRelacaoCompradorVendedor
    public $codigo_vinculo_comprador_vendedor; // <- codigoVinculoCompradorVendedor
    
    // DCR (Drawback) se aplicável
    public $dcr_identificacao;                // <- dcrIdentificacao
    public $dcr_valor_devido;                 // <- dcrValorDevido (dividir por 100)
    public $dcr_valor_recolher;               // <- dcrValorRecolher (dividir por 100)
}
```

#### 1.3 Dados de Produtos por Adição

**Estrutura detalhada por mercadoria:**
```php
class Produto {
    // Identificação
    public $adicao_numero;                    // <- Referência à adição pai
    public $numero_sequencial_item;           // <- numeroSequencialItem
    
    // Descrição
    public $descricao_mercadoria;             // <- descricaoMercadoria (TEXTO COMPLETO)
    
    // Quantidades e medidas
    public $quantidade;                       // <- quantidade (dividir por 1000000)
    public $unidade_medida;                   // <- unidadeMedida
    public $valor_unitario;                   // <- valorUnitario (dividir por 100000000000000)
    
    // Calculados (derivados)
    public $valor_total_item;                 // <- quantidade × valor_unitario
    public $peso_liquido_item;                // <- Rateado do peso total da adição
    public $frete_rateado_item;               // <- Rateado do frete da adição
    public $seguro_rateado_item;              // <- Rateado do seguro da adição
}
```

#### 1.4 Extração de Pagamentos e Taxas

**Estrutura de pagamentos realizados:**
```php
class PagamentoDI {
    public $codigo_receita;                   // <- codigoReceita
    public $valor_receita;                    // <- valorReceita (dividir por 100)
    public $data_pagamento;                   // <- dataPagamento
    public $banco_pagamento;                  // <- bancoPagamento
    public $agencia_pagamento;                // <- agenciaPagamento
    public $conta_pagamento;                  // <- contaPagamento
    
    // Mapeamento específico por código de receita:
    // 0086 = Imposto de Importação (II)
    // 1038 = Imposto sobre Produtos Industrializados (IPI)
    // 5602 = PIS/PASEP-Importação
    // 5629 = COFINS-Importação
    // 7811 = Taxa de Utilização do SISCOMEX
}
```

### 2. Alíquotas Reais de ICMS por Estado (2025)

**Base de dados oficial conforme arquivo fornecido:**
```json
{
    "aliquotas_icms_2025": {
        "AC": {"aliquota_interna": 19.00, "fcp": null, "observacoes": ""},
        "AL": {"aliquota_interna": 20.00, "fcp": {"min": 1.00, "max": 2.00}, "observacoes": "19% + 1% FECOEP"},
        "AP": {"aliquota_interna": 18.00, "fcp": null, "observacoes": ""},
        "AM": {"aliquota_interna": 20.00, "fcp": {"min": 1.50, "max": 2.00}, "observacoes": ""},
        "BA": {"aliquota_interna": 20.50, "fcp": 2.00, "observacoes": ""},
        "CE": {"aliquota_interna": 20.00, "fcp": 2.00, "observacoes": ""},
        "DF": {"aliquota_interna": 20.00, "fcp": 2.00, "observacoes": ""},
        "ES": {"aliquota_interna": 17.00, "fcp": 2.00, "observacoes": ""},
        "GO": {"aliquota_interna": 19.00, "fcp": {"min": 0.00, "max": 2.00}, "observacoes": "Não cobra atualmente"},
        "MA": {"aliquota_interna": 23.00, "fcp": 2.00, "observacoes": "Nova alíquota desde 23/02/2025"},
        "MT": {"aliquota_interna": 17.00, "fcp": {"min": 0.00, "max": 2.00}, "observacoes": ""},
        "MS": {"aliquota_interna": 17.00, "fcp": {"min": 0.00, "max": 2.00}, "observacoes": ""},
        "MG": {"aliquota_interna": 18.00, "fcp": 2.00, "observacoes": ""},
        "PA": {"aliquota_interna": 19.00, "fcp": null, "observacoes": ""},
        "PB": {"aliquota_interna": 20.00, "fcp": 2.00, "observacoes": ""},
        "PR": {"aliquota_interna": 19.50, "fcp": 2.00, "observacoes": ""},
        "PE": {"aliquota_interna": 20.50, "fcp": 2.00, "observacoes": ""},
        "PI": {"aliquota_interna": 22.50, "fcp": 2.00, "observacoes": "Nova alíquota desde 01/04/2025"},
        "RJ": {"aliquota_interna": 22.00, "fcp": {"min": 0.00, "max": 4.00}, "observacoes": "20% + 2% FECP"},
        "RN": {"aliquota_interna": 20.00, "fcp": 2.00, "observacoes": "Nova alíquota desde 20/03/2025"},
        "RS": {"aliquota_interna": 17.00, "fcp": 2.00, "observacoes": ""},
        "RO": {"aliquota_interna": 19.50, "fcp": 2.00, "observacoes": ""},
        "RR": {"aliquota_interna": 20.00, "fcp": {"min": 0.00, "max": 2.00}, "observacoes": ""},
        "SC": {"aliquota_interna": 17.00, "fcp": null, "observacoes": ""},
        "SP": {"aliquota_interna": 18.00, "fcp": 2.00, "observacoes": ""},
        "SE": {"aliquota_interna": 20.00, "fcp": {"min": 1.00, "max": 2.00}, "observacoes": "19% + 1% FECOEP"},
        "TO": {"aliquota_interna": 20.00, "fcp": 2.00, "observacoes": ""}
    }
}
```

**Regras para FCP (Conforme orientação do Professor):**
```php
class FcpCalculator {
    public static function calculateFcp($estado, $valor_base) {
        $config = self::getFcpConfig($estado);
        
        if ($config === null) {
            return 0; // Estados sem FCP
        }
        
        // Aplicar regra do limite mínimo
        if (is_array($config)) {
            // Para faixas (ex: entre 1 e 2), considerar 1; até 2, considerar zero
            $aliquota = $config['min']; // Sempre usar o mínimo conforme orientação
        } else {
            $aliquota = $config; // Valor fixo
        }
        
        return $valor_base * ($aliquota / 100);
    }
}
```

### 3. Benefícios Fiscais Detalhados por Estado

#### 3.1 Goiás - COMEXPRODUZIR

**Configuração completa baseada nos arquivos fornecidos:**
```json
{
    "goias_comexproduzir": {
        "base_legal": "Lei Estadual nº 14.186/2002 e Decreto nº 5.686/2002",
        "mecanismo": "crédito_outorgado",
        "percentual_credito": 65,
        "aplicacao": "operacoes_interestaduais",
        
        "condicoes": {
            "desembaraço_obrigatorio": "Porto Seco de Anápolis",
            "entrada_fisica_obrigatoria": true,
            "perfil_comex_minimo": 95, // % do faturamento
            "excecoes_desembaraço": "Permitido desembaraço externo por exigência sanitária"
        },
        
        "contrapartidas": {
            "funproduzir": {
                "percentual": 5,
                "base_calculo": "valor_credito_outorgado",
                "obrigatorio": true
            },
            "protege": {
                "percentual": 15,
                "base_calculo": "valor_credito_outorgado",
                "obrigatorio": true
            },
            "multa_descumprimento_empregos": 20
        },
        
        "beneficio_adicional": {
            "vendas_internas": {
                "aliquota_efetiva": 4.00,
                "mecanismo": "reducao_base_calculo",
                "contrapartidas": false
            }
        },
        
        "calculo": {
            "formula_interestadual": "ICMS_devido × 0.35 + (credito_outorgado × 0.05) + (credito_outorgado × 0.15)",
            "formula_interna": "base_calculo × 0.04",
            "carga_efetiva_interestadual": 1.92, // % considerando contrapartidas
            "carga_efetiva_interna": 4.00
        }
    }
}
```

#### 3.2 Santa Catarina - TTDs

**Sistema completo de TTDs:**
```json
{
    "santa_catarina_ttds": {
        "ttd_409": {
            "fase_1": {
                "periodo": "primeiros_36_meses",
                "aliquota_antecipacao_importacao": 2.6,
                "operacoes_interestaduais": {
                    "aliquota_destaque": 4.0,
                    "aliquota_efetiva": 2.6
                },
                "operacoes_internas": {
                    "contribuintes_normais": {
                        "aliquota_destaque": 4.0,
                        "aliquota_efetiva": 2.6
                    },
                    "simples_sem_st": {
                        "aliquota_destaque": 12.0,
                        "aliquota_efetiva": 7.6
                    },
                    "simples_com_st": {
                        "aliquota_destaque": 4.0,
                        "aliquota_efetiva": 2.6
                    },
                    "pessoas_fisicas": {
                        "aliquota_destaque": 17.0,
                        "aliquota_efetiva": 17.0
                    }
                },
                "fundo_educacao": 0.4
            },
            
            "fase_2": {
                "periodo": "apos_36_meses",
                "aliquota_antecipacao_importacao": 1.0,
                "operacoes_interestaduais": {
                    "aliquota_destaque": 4.0,
                    "aliquota_efetiva": 1.0
                },
                "operacoes_internas": {
                    "contribuintes_normais": {
                        "aliquota_destaque": 4.0,
                        "aliquota_efetiva": 1.0
                    },
                    "simples_sem_st": {
                        "aliquota_destaque": 12.0,
                        "aliquota_efetiva": 3.6
                    },
                    "simples_com_st": {
                        "aliquota_destaque": 4.0,
                        "aliquota_efetiva": 1.0
                    },
                    "pessoas_fisicas": {
                        "aliquota_destaque": 17.0,
                        "aliquota_efetiva": 17.0
                    }
                },
                "fundo_educacao": 0.4
            }
        },
        
        "ttd_410": {
            "requisitos": {
                "historico_ttd_409": "24_meses",
                "faturamento_minimo_anual": 24000000
            },
            "diferimento_importacao": 100,
            "operacoes_interestaduais": {
                "aliquota_destaque": 4.0,
                "aliquota_efetiva": 0.6
            },
            "operacoes_internas": {
                "contribuintes_normais": {
                    "aliquota_destaque": 4.0,
                    "aliquota_efetiva": 0.6
                },
                "simples_sem_st": {
                    "aliquota_destaque": 12.0,
                    "aliquota_efetiva": 3.6
                },
                "simples_com_st": {
                    "aliquota_destaque": 4.0,
                    "aliquota_efetiva": 0.6
                },
                "pessoas_fisicas": {
                    "aliquota_destaque": 17.0,
                    "aliquota_efetiva": 17.0
                }
            },
            "fundo_educacao": 0.4
        }
    }
}
```

#### 3.3 Demais Estados

**Baseado no arquivo de análise comparativa:**
```json
{
    "outros_estados": {
        "minas_gerais": {
            "programa": "Corredor de Importação",
            "mecanismo": "diferimento + crédito presumido",
            "diferimento_importacao": 100,
            "credito_presumido": {
                "sem_similar_nacional": {
                    "interestaduais": 2.5,
                    "internas": 5.0
                },
                "com_similar_nacional": {
                    "interestaduais": 3.0,
                    "internas": 6.0
                }
            },
            "contrapartidas": false
        },
        
        "rondonia": {
            "programa": "Crédito Presumido",
            "credito_presumido_interestadual": 85,
            "carga_efetiva": 0.6,
            "contrapartidas": false
        },
        
        "mato_grosso": {
            "programa": "Diferimento Total",
            "diferimento_importacao": 100,
            "recolhimento": "saidas_subsequentes"
        },
        
        "alagoas": {
            "programa": "Compensação Precatórios",
            "mecanismo": "creditos_judiciais",
            "economia_potencial": "até 90%",
            "desvantagem": "custo_transacao_precatorios"
        },
        
        "espirito_santo": {
            "programa": "INVEST-ES Importação",
            "diferimento_importacao": 100,
            "reducao_saida_cd": 75,
            "taxa_administrativa": 0.5,
            "exigencia_cd": "1000m2_minimo"
        }
    }
}
```

### 4. Interface Editável de Alíquotas

#### 4.1 Sistema de Alíquotas Editáveis por Item

**Estrutura de campos editáveis:**
```php
class AliquotasEditaveis {
    // Alíquotas ICMS editáveis por item
    public $icms_aliquota_interna;            // Editável por item
    public $icms_aliquota_interestadual;      // Editável por item
    public $icms_reducao_base;                // % de redução editável
    public $icms_aliquota_reduzida;           // Alíquota após redução
    
    // FCP editável por item conforme regras
    public $fcp_aliquota;                     // Editável respeitando min/max por estado
    public $fcp_aplicavel;                    // Boolean editável
    
    // Substituição Tributária editável
    public $st_aplicavel;                     // Boolean editável por item
    public $st_mva;                           // MVA editável por item
    public $st_base_calculo;                  // Editável
    public $st_valor;                         // Calculado
    
    // Benefícios específicos editáveis
    public $beneficio_fiscal_aplicavel;       // Boolean editável
    public $tipo_beneficio;                   // Dropdown selecionável
    public $percentual_beneficio;             // Editável conforme programa
    
    // Observações
    public $observacoes_item;                 // Campo texto livre editável
}
```

#### 4.2 Interface de Edição por Item

**Componente React para edição:**
```javascript
const EditableAliquotaItem = ({ item, onUpdate }) => {
    const [icmsAliquota, setIcmsAliquota] = useState(item.icms_aliquota_interna);
    const [fcpAliquota, setFcpAliquota] = useState(item.fcp_aliquota);
    const [stAplicavel, setStAplicavel] = useState(item.st_aplicavel);
    const [beneficioTipo, setBeneficioTipo] = useState(item.tipo_beneficio);
    
    const estadoLimites = getEstadoLimites(item.estado_destino);
    
    return (
        <div className="aliquotas-editaveis">
            <div className="campo-editavel">
                <label>ICMS Alíquota (%)</label>
                <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="30"
                    value={icmsAliquota}
                    onChange={(e) => setIcmsAliquota(e.target.value)}
                />
            </div>
            
            <div className="campo-editavel">
                <label>FCP (%) - Limite: {estadoLimites.fcp_max}%</label>
                <input 
                    type="number" 
                    step="0.01" 
                    min={estadoLimites.fcp_min || 0}
                    max={estadoLimites.fcp_max || 0}
                    value={fcpAliquota}
                    onChange={(e) => setFcpAliquota(e.target.value)}
                    disabled={!estadoLimites.fcp_aplicavel}
                />
            </div>
            
            <div className="campo-editavel">
                <label>
                    <input 
                        type="checkbox" 
                        checked={stAplicavel}
                        onChange={(e) => setStAplicavel(e.target.checked)}
                    />
                    Substituição Tributária
                </label>
            </div>
            
            <div className="campo-editavel">
                <label>Benefício Fiscal</label>
                <select 
                    value={beneficioTipo}
                    onChange={(e) => setBeneficioTipo(e.target.value)}
                >
                    <option value="">Sem benefício</option>
                    <option value="comexproduzir">COMEXPRODUZIR (GO)</option>
                    <option value="ttd_409">TTD 409 (SC)</option>
                    <option value="ttd_410">TTD 410 (SC)</option>
                    <option value="corredor_mg">Corredor Importação (MG)</option>
                    <option value="credito_ro">Crédito Presumido (RO)</option>
                </select>
            </div>
        </div>
    );
};
```

### 5. Sistema de Validação e Cálculos

#### 5.1 Validação de Alíquotas por Estado

**Classe de validação:**
```php
class ValidadorAliquotas {
    private static $limites_estados = [
        'GO' => ['icms_max' => 19.00, 'fcp_min' => 0.00, 'fcp_max' => 2.00],
        'SC' => ['icms_max' => 17.00, 'fcp_min' => null, 'fcp_max' => null],
        'MG' => ['icms_max' => 18.00, 'fcp_min' => 2.00, 'fcp_max' => 2.00],
        'ES' => ['icms_max' => 17.00, 'fcp_min' => 2.00, 'fcp_max' => 2.00],
        // ... todos os estados conforme tabela oficial
    ];
    
    public static function validarAliquotaIcms($estado, $aliquota) {
        $limite = self::$limites_estados[$estado]['icms_max'];
        return $aliquota >= 0 && $aliquota <= $limite;
    }
    
    public static function validarAliquotaFcp($estado, $aliquota) {
        $config = self::$limites_estados[$estado];
        
        if ($config['fcp_min'] === null) {
            return $aliquota == 0; // Estado sem FCP
        }
        
        return $aliquota >= $config['fcp_min'] && $aliquota <= $config['fcp_max'];
    }
    
    public static function aplicarRegraMinimaFcp($estado, $faixa_min, $faixa_max) {
        // Conforme orientação: entre 1 e 2, considerar 1; até 2, considerar zero
        if ($faixa_min > 0) {
            return $faixa_min; // "entre X e Y" = usar X
        } else {
            return 0; // "até X" = usar zero
        }
    }
}
```

### 6. Extração Completa de Informações Complementares

#### 6.1 Parser de Informações Complementares

**Classe para extrair dados críticos:**
```php
class InformacaoComplementarParser {
    public static function extrairDados($informacao_complementar) {
        $dados_extraidos = [];
        
        // Extrair taxa SISCOMEX
        if (preg_match('/TAXA DE UTILIZACAO DO SISCOMEX.*?R\$\s*([\d.,]+)/', $informacao_complementar, $matches)) {
            $dados_extraidos['siscomex_valor'] = self::parseValor($matches[1]);
        }
        
        // Extrair AFRMM
        if (preg_match('/AFRMM.*?R\$\s*([\d.,]+)/', $informacao_complementar, $matches)) {
            $dados_extraidos['afrmm_valor'] = self::parseValor($matches[1]);
        }
        
        // Extrair taxas de câmbio
        if (preg_match('/FOB.*?DOLAR.*?(\d+[,.]?\d*)/', $informacao_complementar, $matches)) {
            $dados_extraidos['taxa_cambio_fob'] = self::parseValor($matches[1]);
        }
        
        if (preg_match('/FRETE.*?DOLAR.*?(\d+[,.]?\d*)/', $informacao_complementar, $matches)) {
            $dados_extraidos['taxa_cambio_frete'] = self::parseValor($matches[1]);
        }
        
        // Extrair responsáveis legais
        if (preg_match_all('/(\w+\s+[\w\s]+)\s+CPF:\s*([\d.-]+)/', $informacao_complementar, $matches, PREG_SET_ORDER)) {
            $dados_extraidos['responsaveis_legais'] = [];
            foreach ($matches as $match) {
                $dados_extraidos['responsaveis_legais'][] = [
                    'nome' => trim($match[1]),
                    'cpf' => $match[2]
                ];
            }
        }
        
        // Extrair detalhes do container
        if (preg_match('/CONTAINER[.\s]+(\w+).*?PESO BRUTO\s*([\d.,]+)/', $informacao_complementar, $matches)) {
            $dados_extraidos['container_numero'] = $matches[1];
            $dados_extraidos['container_peso_bruto'] = self::parseValor($matches[2]);
        }
        
        // Extrair totais da DI
        if (preg_match('/FOB.*?USD\$\s*([\d.,]+).*?R\$\s*([\d.,]+)/', $informacao_complementar, $matches)) {
            $dados_extraidos['total_fob_usd'] = self::parseValor($matches[1]);
            $dados_extraidos['total_fob_brl'] = self::parseValor($matches[2]);
        }
        
        return $dados_extraidos;
    }
    
    private static function parseValor($valor_string) {
        // Remove pontos de milhares e converte vírgulas para pontos
        $valor_limpo = preg_replace('/\.(?=\d{3})/', '', $valor_string);
        $valor_limpo = str_replace(',', '.', $valor_limpo);
        return floatval($valor_limpo);
    }
}
```

### 7. Estrutura de Resposta da API (Dados Reais)

**Response baseado na DI real 2300120746:**
```json
{
    "status": "success",
    "data": {
        "di_info": {
            "numero": "2300120746",
            "data_registro": "2023-01-02",
            "urf_despacho": "GOIANIA",
            "modalidade": "Normal",
            "situacao": "ENTREGA NAO AUTORIZADA",
            "total_adicoes": 16,
            "importador": {
                "nome": "WPX IMPORTACAO E EXPORTACAO DE PECAS LTDA",
                "cnpj": "40.462.206/0001-58",
                "endereco": "DIREITA, 333, QUADRA3 - SET SOL NASCENTE - GOIANIA/GO - 74210-126",
                "representante": "RICARDO DE SOUZA CARVALHO",
                "cpf_representante": "256.160.678-30"
            }
        },
        "totais_di": {
            "valor_fob_usd": 105733.13,
            "valor_fob_brl": 551683.75,
            "valor_frete_usd": 2651.00,
            "valor_frete_brl": 13832.12,
            "valor_aduaneiro_usd": 108384.13,
            "valor_aduaneiro_brl": 565515.87,
            "taxa_cambio_fob": 5.2177,
            "taxa_cambio_frete": 5.2177
        },
        "tributos_pagos": {
            "ii_valor": 79185.09,
            "ipi_valor": 33320.00,
            "pis_valor": 14050.41,
            "cofins_valor": 67648.25,
            "siscomex_valor": 493.56,
            "afrmm_valor": 1256.77
        },
        "adicoes": [
            {
                "numero": "001",
                "ncm": "73181500",
                "descricao_ncm": "-- Outros parafusos e pinos ou pernos, mesmo com as por",
                "peso_liquido_kg": 213480,
                "valor_moeda_usd": 6346.13,
                "valor_reais": 33112.20,
                "incoterm": "CFR",
                "local": "PORTO DE SANTOS",
                "moeda": "DOLAR DOS EUA",
                "fabricante": "JINKAIDA AUTO MOTOR PARTS CO.,LTD",
                "pais_origem": "CHINA, REPUBLICA POPULAR",
                "tributos": {
                    "ii": {
                        "aliquota": 1.60,
                        "base_calculo": 33113.45,
                        "valor_devido": 5297.95
                    },
                    "ipi": {
                        "aliquota": 6.50,
                        "valor_devido": 2496.74
                    },
                    "pis": {
                        "aliquota": 3.12,
                        "valor_devido": 1056.31
                    },
                    "cofins": {
                        "aliquota": 9.65,
                        "valor_devido": 3195.32
                    }
                },
                "produtos": [
                    {
                        "item": "01",
                        "descricao": "120017 - PARAFUSO PHILIPS 5X16 PARA MOTOCICLETA MARCA DURA RACE COMPATIVEL TODAY/TITAN125 EM CX COM 8000 UNIDADES",
                        "quantidade": 1000,
                        "unidade": "CAIXA",
                        "valor_unitario_usd": 53.125
                    }
                ]
            }
        ],
        "informacoes_complementares": {
            "texto_completo": "[TEXTO COMPLETO DA INFORMACAO COMPLEMENTAR]",
            "dados_extraidos": {
                "responsaveis_legais": [
                    {"nome": "RICARDO DE SOUZA CARVALHO", "cpf": "256.160.678-30"},
                    {"nome": "ALESSANDRO DE SOUZA MELO", "cpf": "533.399.081-68"}
                ],
                "container_numero": "SUDU6183973",
                "container_peso_bruto": 25952.71
            }
        }
    },
    "timestamp": "2025-08-17T10:30:00Z"
}
```

---

*Esta especificação corrigida reflete dados reais extraídos do XML fornecido e incorpora as alíquotas oficiais por estado, regras corretas do FCP e benefícios fiscais detalhados conforme documentação de referência.*

*© 2025 Expertzy Inteligência Tributária*