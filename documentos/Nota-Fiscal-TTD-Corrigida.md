# Incentivos Fiscais de ICMS para Importação em Santa Catarina: TTD 409, 410 e 411

## Esclarecimentos Preliminares

Os principais incentivos fiscais para importação no estado são conhecidos como **TTD 409, TTD 410 e TTD 411**. Estes benefícios estão previstos no **Art. 246 do Anexo 02 do RICMS/SC** e proporcionam **diferimento do ICMS na importação**, alterando significativamente a forma de emissão das notas fiscais e proporcionando vantagens competitivas para empresas estabelecidas em Santa Catarina.

## Tratamentos Tributários Diferenciados em Santa Catarina

### TTD 409 - Características Principais

O **TTD 409** é o regime inicial para empresas importadoras, oferecendo:

- **Diferimento do ICMS** na importação de mercadorias para comercialização
- **Antecipação de 2,6%** nos primeiros 36 meses, reduzindo para **1%** posteriormente
- **Dispensa de garantia** para a importação
- **Crédito presumido** nas operações de saída

### TTD 410 - Evolução do TTD 409

O **TTD 410** representa uma evolução do TTD 409, sendo possível migrar após **24 meses** e faturamento mínimo de **R$ 24 milhões anuais**:

- **Dispensa da antecipação** do ICMS a cada desembaraço aduaneiro
- **Diferimento total** do ICMS na importação
- **Não exige garantias**

### TTD 411 - Diferencial com Garantia

O **TTD 411** possui características distintas:

- **Exige apresentação de garantia real ou fidejussória ao Estado**
- **Dispensa a antecipação** do pagamento do ICMS
- **Diferimento total** do ICMS na importação
- **Maior flexibilidade** nas operações fiscais

## Impactos na Emissão de Notas Fiscais de Importação

### Situação Normal (Sem Benefício Fiscal)

Na importação tradicional sem incentivos:

- **ICMS devido integralmente** no desembaraço aduaneiro
- **Alíquota padrão de 17%** aplicada sobre o valor aduaneiro
- **ICMS destacado normalmente** na nota fiscal de importação
- **Pagamento imediato** no momento da nacionalização da mercadoria

### Com Benefícios Fiscais (TTD 409/410/411)

**CORREÇÃO FUNDAMENTAL**: As empresas beneficiárias têm tratamento diferenciado na emissão da nota fiscal:

**Diferimento do ICMS:**

- ICMS **não é recolhido** no momento do desembaraço aduaneiro
- **Pagamento diferido** para a etapa seguinte de circulação da mercadoria
- **Melhoria significativa** no fluxo de caixa das empresas importadoras

**Emissão da Nota Fiscal - REGRAS CORRETAS:**

**Para TTD 409:**

- **CST 51 (Diferimento)** obrigatório
- **Base de cálculo**: Valor integral conforme legislação
- **ICMS destacado**: Valor total do ICMS como se não houvesse diferimento
- **Percentual de diferimento**: Informado conforme o regime
- **Valor ICMS devido**: Apenas a antecipação (2,6% ou 1%)
- **Campo cBenef**: SC830015 (obrigatório desde maio/2023)

**Para TTD 410/411:**

- **CST 51 (Diferimento)** obrigatório
- **Base de cálculo**: Valor integral conforme legislação
- **ICMS destacado**: Valor total do ICMS
- **Percentual de diferimento**: 100%
- **Valor ICMS devido**: R$ 0,00
- **Campo cBenef**: SC830015 (obrigatório)

**IMPORTANTE**: É **VEDADO não destacar o ICMS na nota fiscal**. O § 4º do Art. 1º do Anexo 3 do RICMS/SC estabelece que "É vedado o destaque do imposto em documento fiscal correspondente à operação abrangida por diferimento", mas isso se refere ao **ICMS EFETIVAMENTE PAGO**, não ao destaque fiscal do valor total do imposto para fins de escrituração.

## Tabela Comparativa Corrigida

| **Aspecto**             | **Situação Normal**         | **TTD 409**                | **TTD 410**            | **TTD 411**                  |
|:----------------------- |:--------------------------- |:-------------------------- |:---------------------- |:---------------------------- |
| **ICMS na Importação**  | 17% integral no desembaraço | 2,6% (36m) / 1% (após 36m) | 0% (diferimento total) | 0% (diferimento c/ garantia) |
| **CST na NF-e**         | 00 (Tributado)              | 51 (Diferimento)           | 51 (Diferimento)       | 51 (Diferimento)             |
| **Destaque ICMS na NF** | Sim (17%)                   | Sim, mas diferido          | Sim, mas diferido      | Sim, mas diferido            |
| **Valor ICMS Devido**   | Total (17%)                 | Antecipação (2,6%/1%)      | R$ 0,00                | R$ 0,00                      |
| **Campo cBenef**        | Não                         | SC830015                   | SC830015               | SC830015                     |
| **Garantia Exigida**    | Não                         | Não                        | Não                    | Sim                          |
| **Diferimento do ICMS** | Não                         | Parcial                    | Total                  | Total                        |
| **Crédito Presumido**   | Não                         | Sim (30% ou 70%)           | Sim (variável)         | Sim (variável)               |

## Exemplo Numérico Detalhado - CORRIGIDO

Considerando uma importação de US$ 10.000 (R\$ 52.000 com câmbio R$ 5,20):

### Cálculo da Base de Cálculo do ICMS

```
Valor CIF: R$ 52.000,00
II (12%): R$ 6.240,00
IPI (10%): R$ 5.824,00
PIS (1,65%): R$ 1.057,06
COFINS (7,6%): R$ 4.868,86
SISCOMEX + AFRMM: R$ 500,00
Subtotal: R$ 70.489,92

Base ICMS (por dentro) = R$ 70.489,92 ÷ 0,83 = R$ 84.924,00
ICMS integral (17%) = R$ 14.437,08
```

### Nota Fiscal de Importação - TTD 409

```xml
<ICMS>
  <ICMS51>
    <orig>1</orig> <!-- Mercadoria Estrangeira -->
    <CST>51</CST> <!-- Diferimento -->
    <modBC>3</modBC> <!-- Valor da operação -->
    <vBC>84924.00</vBC> <!-- Base integral -->
    <pICMS>17.00</pICMS> <!-- Alíquota integral -->
    <vICMSOp>14437.08</vICMSOp> <!-- ICMS como se não houvesse diferimento -->
    <pDif>85.00</pDif> <!-- Percentual de diferimento -->
    <vICMSDif>12271.52</vICMSDif> <!-- Valor diferido -->
    <vICMS>2165.56</vICMS> <!-- Antecipação devida (2,6%) -->
    <cBenef>SC830015</cBenef> <!-- Código obrigatório -->
  </ICMS51>
</ICMS>
```

### Operações de Saída

**TTD 409 - Operação Interna (SC):**

- **Alíquota destacada**: 4%
- **Crédito presumido**: 30%
- **Alíquota efetiva**: 2,8%
- **Incorporação do ICMS diferido** na base de cálculo

**TTD 409 - Operação Interestadual:**

- **Alíquota destacada**: 12%
- **Crédito presumido**: 70%
- **Alíquota efetiva**: 3,6%

## Registro SPED Fiscal - CORRIGIDO

### Registros Obrigatórios para TTD

**Registro C170 - Itens:**

```
|C170|001|NCM|Descrição|UN|Qtd|Vl_Unit|Vl_Item|0|0|51|84924.00|17.00|14437.08|SC830015|
```

**Registro C197 - Ajuste de Diferimento:**

```
|C197|SC050001|TTD 409 - Diferimento|NCM|84924.00|17.00|12271.52|
```

**Registro E111 - Ajuste na Apuração:**

```
|E111|SC070002|TTD 409 - Antecipação|2165.56|
```

**Registro E115 - Informações Declaratórias:**

```
|E115|SC830015|14437.08||
```

## Obrigações Acessórias Específicas

### Mensais

- **DIME** com Quadro 46 (créditos DCIP)
- **EFD ICMS/IPI** com registros específicos
- **Fundos estaduais** (0,4% - até dia 20)

### Eventuais

- **DCIP** (antes da utilização do crédito presumido)
- **Renovação do TTD** (conforme termo de concessão)

## Vantagens Competitivas dos Incentivos

### Fluxo de Caixa

- **Liberação imediata de capital** que seria imobilizado no pagamento do ICMS
- **Redução do risco** de bloqueio por erros no pagamento de guias
- **Agilização** na liberação da Declaração de Importação

### Redução da Carga Tributária

- **Economia de 65% a 90%** no ICMS efetivo através dos TTDs
- **Alíquotas competitivas** comparado a outros estados brasileiros
- **Crédito presumido** significativo nas operações de saída

## Considerações Importantes

### Requisitos Específicos

- **Mercadorias sujeitas** ao regime devem constar na legislação específica
- **Algumas mercadorias são vedadas** aos incentivos fiscais
- **Análise de viabilidade tributária** prévia necessária

### Migração Entre Regimes

- **TTD 409 para TTD 410**: Após 24 meses e faturamento mínimo
- **TTD 411**: Alternativa com garantia
- **Cada regime** possui termo de concessão específico

### Compliance Fiscal

- **Prazo antecipação**: Até 5 dias da data da DI
- **DCIP**: Obrigatório antes da utilização do crédito
- **Campo cBenef**: Obrigatório desde maio/2023
- **Fundos estaduais**: Pagamento em dia para manter benefício

## Pontos de Atenção Críticos

### Emissão Correta da Nota Fiscal

1. **CST 51 obrigatório** para diferimento
2. **Campo cBenef preenchido** com SC830015
3. **ICMS destacado** com valor total da operação
4. **Percentual de diferimento** informado corretamente
5. **Informações complementares** citando a base legal

### Riscos Fiscais

- **Perda do benefício** por descumprimento de obrigações
- **Rejeição da NF-e** por preenchimento incorreto
- **Autuação fiscal** por falta de segregação adequada
- **Glosa de créditos** por escrituração incorreta

Os incentivos fiscais de Santa Catarina representam uma **significativa vantagem competitiva** para empresas importadoras, mas exigem **rigoroso cumprimento** das normas fiscais e **emissão correta** das notas fiscais conforme a legislação estadual vigente.

---

**NOTA IMPORTANTE**: Este documento foi corrigido para refletir as práticas corretas de emissão de notas fiscais de importação com TTD em Santa Catarina, conforme o RICMS/SC e orientações da SEFAZ-SC. A principal correção refere-se ao **destaque obrigatório do ICMS** na nota fiscal, mesmo com diferimento, utilizando o **CST 51** e informando corretamente os valores e percentuais de diferimento.