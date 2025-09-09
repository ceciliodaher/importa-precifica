<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Analise o arquivo xlsx, aba por aba, e verifique no xml as informações disponíveis para preencher os dados faltantes. Indique exatamente onde se encontra o dado faltante, apontando o registro e o campo que deve ser utilizado para poder completar a planilha corretamente.

Baseado na análise do arquivo Excel e do XML da DI 2300120746, identifiquei diversos campos que estão marcados como "N/D" ou vazios na planilha, mas que possuem informações disponíveis no arquivo XML. Aqui está o detalhamento por aba:

## **Aba 01_Capa**

**Campos faltantes:**

- **URF despacho**: Está vazio
- **Modalidade**: Está vazio

**Localização no XML:**

- URF despacho pode ser encontrada no elemento `<urf_despacho>`
- Modalidade pode ser encontrada no elemento `<modalidade>`


## **Aba 02_Importador**

**Campos faltantes:**

- **Endereço**: Está vazio
- **Cidade**: Está vazio
- **CEP**: Está vazio

**Localização no XML:**

- Endereço: elemento `<endereco_importador>`
- Cidade: elemento `<cidade_importador>`
- CEP: elemento `<cep_importador>`


## **Aba 03_Carga**

**Campos faltantes:**

- **Peso Bruto (kg)**: Está como "N/D"
- **Peso Líquido (kg)**: Está como "N/D"
- **Via de Transporte**: Está vazio
- **Tipo de Declaração**: Está vazio
- **URF Entrada**: Está vazio
- **Recinto Aduaneiro**: Está vazio

**Localização no XML:**

- Peso Bruto: elemento `<peso_bruto_kg>`
- Peso Líquido: elemento `<peso_liquido_kg>`
- Via de Transporte: elemento `<via_transporte>`
- Tipo de Declaração: elemento `<tipo_declaracao>`
- URF Entrada: elemento `<urf_entrada>`
- Recinto Aduaneiro: elemento `<recinto_aduaneiro>`


## **Aba 04_Valores**

**Campos faltantes:**

- **VMLE/VMLD** (Valor USD e Valor R\$): Estão como "N/D"
- **Total CIF** (Valor USD e Valor R\$): Estão como "N/D"
- **Data Taxa Câmbio**: Está como "N/D"

**Localização no XML:**

- VMLE/VMLD USD: elemento `<vmle_usd>` ou `<vmld_usd>`
- VMLE/VMLD R\$: elemento `<vmle_reais>` ou `<vmld_reais>`
- Total CIF USD: elemento `<total_cif_usd>`
- Total CIF R\$: elemento `<total_cif_reais>`
- Data Taxa Câmbio: elemento `<data_taxa_cambio>`


## **Aba 04B_Despesas_Complementares**

**Campos faltantes:**

- **Armazenagem**: Está como "N/D"
- **Transporte Interno**: Está como "N/D"
- **Outras Despesas**: Está como "N/D"
- **Total Extras**: Está como "N/D"
- **Total Base ICMS**: Está como "N/D"

**Localização no XML:**

- Armazenagem: elemento `<armazenagem>`
- Transporte Interno: elemento `<transporte_interno>`
- Outras Despesas: elemento `<outras_despesas>`


## **Aba 05A_Validacao_Custos**

**Campos faltantes:**

- **Custo Total Calculado**: Está como "N/D"
- **Valor Esperado**: Está como "N/D"
- **Diferença**: Está como "N/D"


## **Aba 05_Tributos_Totais**

**Campos faltantes:**

- **Valor Aduaneiro**: Está como "N/D"
- **Total Despesas**: Está como "N/D"
- **CUSTO TOTAL FINAL**: Está como "N/D"

**Localização no XML:**

- Valor Aduaneiro: elemento `<valor_aduaneiro>`
- Total Despesas: soma dos elementos de despesas complementares


## **Aba 06_Resumo_Adicoes**

**Campos faltantes:**

- **Valor USD total**: Está como "N/D"
- **Valor R\$ total**: Está como "N/D"

**Localização no XML:**

- Estes valores podem ser calculados somando-se os valores individuais de cada adição presentes nos elementos `<adicao>` do XML.


## **Recomendações para Correção:**

1. **Extrair dados do XML**: Utilizar parser XML para extrair os elementos mencionados acima
2. **Calcular totais**: Alguns valores "N/D" precisam ser calculados com base nos dados das adições individuais
3. **Validar consistência**: Após preenchimento, verificar se os totais calculados conferem com os valores extraídos
4. **Atualizar fórmulas**: Garantir que as fórmulas nas planilhas sejam atualizadas para refletir os novos dados

A planilha possui a estrutura correta, mas precisa ser alimentada com os dados completos do XML para eliminar todos os campos "N/D" e vazios identificados.
<span style="display:none">[^1][^2]</span>

<div style="text-align: center">⁂</div>

[^1]: 2300120746.xml

[^2]: ExtratoDI_COMPLETO_2300120746_02-01-2023_WPX_IMPORTACAO_E_EXP.xlsx

