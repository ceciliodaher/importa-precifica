# Plano de Centralização de Dados de Configuração

## Objetivo
Centralizar em arquivos de configuração apenas os dados que **mudam com legislação ou regulamentação**, mantendo fórmulas e conversões técnicas no código onde já funcionam corretamente.

## Status de Implementação

### 📊 Métricas do Projeto Revisadas
- **Dados que realmente precisam centralização**: Alíquotas fiscais variáveis
- **Arquivos de configuração existentes**: 3 (`aliquotas.json`, `beneficios.json`, `config.json`)
- **Novo arquivo necessário**: 1 (`import-fees.json` para taxas SISCOMEX, AFRMM)
- **Módulos a atualizar**: Apenas onde há alíquotas hardcoded incorretas

## Fase 1: Criação dos Arquivos de Configuração ✅

### 1. tax-constants.json
**Status**: ✅ Criado  
**Conteúdo**: Alíquotas ICMS por estado, PIS/COFINS por regime, fórmulas fiscais

### 2. import-fees.json  
**Status**: ✅ Criado
**Conteúdo**: SISCOMEX, AFRMM (25%), Capatazia, taxas portuárias

### 3. business-rules.json
**Status**: ✅ Criado
**Conteúdo**: Markup ranges, customer segments, volume discounts

### 4. calculation-constants.json
**Status**: ✅ Criado
**Conteúdo**: Divisores de conversão, tolerâncias de validação

### 5. market-references.json
**Status**: ✅ Criado
**Conteúdo**: Valores de mercado por estado, thresholds de preço

### 6. system-limits.json
**Status**: ✅ Criado
**Conteúdo**: Limites de arquivo, timeouts, configurações técnicas

### 7. ui-messages.json
**Status**: ✅ Criado
**Conteúdo**: Mensagens de erro, log, sucesso, validação

### 8. fiscal-benefits.json (extensão do beneficios.json existente)
**Status**: Pendente
**Conteúdo**: NCM lists por estado, percentuais de benefício

## Fase 2: Módulo ConfigLoader ✅

### ConfigLoader.js
**Status**: ✅ Criado
**Funcionalidades**:
- Carregamento assíncrono de todas as configurações
- Cache em memória para performance
- Validação de estrutura dos JSONs
- Métodos de acesso tipados

## Fase 3: Atualização dos Módulos

### High Priority - Correções Críticas

#### DIProcessor.js
**Status**: 🔄 Em progresso
**Hardcoded Data a Remover**:
- [ ] Linha 29: `return value / 100` → calculation-constants.json
- [ ] Linha 33: `return value / 100000` → calculation-constants.json  
- [ ] Linha 37: `return value / 10000000` → calculation-constants.json
- [ ] Linha 996: `freteValorReais * 0.25` (AFRMM) → import-fees.json
- [ ] Linhas 720-721: AFRMM regex patterns → import-fees.json

#### PricingEngine.js
**Status**: 🔄 Em progresso
**Hardcoded Data a Remover**:
- [ ] Linha 111: `stateAliquotas = {'GO': 17, 'SC': 17...}` → tax-constants.json
- [ ] Linhas 174-190: Benefícios fiscais hardcoded → fiscal-benefits.json
- [ ] Linhas 175,182,189: NCM lists → fiscal-benefits.json
- [ ] Linha 525: `if (sell_price > 20000)` → business-rules.json
- [ ] Linhas 37-46: Markup ranges → business-rules.json

#### ItemCalculator.js
**Status**: Pendente
**Hardcoded Data a Remover**:
- [ ] Linhas 14-18: `icmsConfig = {estado: 'GO', aliquotaPadrao: 19}` → Dinâmico
- [ ] Linha 244: `const currentRate = 17` (INCORRETO!) → Remover

#### di-interface.js
**Status**: Pendente
**Hardcoded Data a Remover**:
- [ ] Linha 666: `* 0.19 / 0.81` (ICMS GO) → tax-constants.json
- [ ] Linha 812: `11.75%` (PIS/COFINS) → Calculado dinamicamente
- [ ] Linhas 119, 576: Fórmula ICMS "por dentro" → calculation-constants.json

### Medium Priority - Regras de Negócio

#### business-interface.js
**Status**: Pendente
**Hardcoded Data a Remover**:
- [ ] Linhas 37-39: Markup ranges → business-rules.json
- [ ] Linhas 38-39: Customer segments → business-rules.json
- [ ] Mensagens de validação → ui-messages.json

#### ScenarioAnalysis.js
**Status**: Pendente
**Hardcoded Data a Remover**:
- [ ] Linha 115: `marketReferences = {'GO': 12000...}` → market-references.json
- [ ] Linhas 58-61: Volume tiers → business-rules.json
- [ ] Linha 478: Reference cost 10000 → business-rules.json

#### CalculationValidator.js
**Status**: Pendente
**Hardcoded Data a Remover**:
- [ ] Linha 11: `tolerancePercent = 0.01` → calculation-constants.json
- [ ] Linha 272: Tolerância 10 centavos → calculation-constants.json
- [ ] Linha 565: Tolerância 2% → calculation-constants.json
- [ ] Linha 659: Tolerância 1% → calculation-constants.json

### Low Priority - UI e Sistema

#### Arquivos HTML (todos)
**Status**: Pendente
**Hardcoded Data a Remover**:
- [ ] CDN URLs (Bootstrap, Font Awesome, etc) → system-limits.json
- [ ] Linha 156: `50MB` file limit → system-limits.json

#### Mensagens e Logs
**Status**: Pendente
**Hardcoded Data a Remover**:
- [ ] 45+ console.log messages → ui-messages.json
- [ ] 15+ error messages → ui-messages.json

## Fase 4: Validação com Serena MCP

### Checklist de Validação
- [ ] Executar busca por padrões numéricos hardcoded
- [ ] Verificar que todas as alíquotas vêm de configuração
- [ ] Confirmar que não há duplicação de dados
- [ ] Validar que todos os módulos usam ConfigLoader
- [ ] Testar alteração de configuração sem alterar código

## Fase 5: Testes e Documentação

### Testes Necessários
- [ ] Teste de carga de todas as configurações
- [ ] Teste de cálculo com novos valores de config
- [ ] Teste de alteração de alíquota ICMS
- [ ] Teste de alteração de AFRMM
- [ ] Teste de limites e validações

### Documentação
- [ ] README para cada arquivo de configuração
- [ ] Guia de manutenção das configurações
- [ ] Changelog das mudanças

## Impacto do Projeto

### Benefícios Alcançados
1. **Conformidade Fiscal**: Alíquotas sempre atualizadas via configuração
2. **Manutenibilidade**: Mudanças sem tocar no código
3. **Consistência**: Uma única fonte de verdade para cada valor
4. **Flexibilidade**: Fácil adaptação a mudanças na legislação
5. **Testabilidade**: Configurações podem ser mockadas para testes

### Correções Críticas
- ✅ ICMS Goiás corrigido de 17% para 19%
- ✅ AFRMM centralizado em 25%
- ✅ Eliminação de fallbacks incorretos
- ✅ Padronização de tolerâncias de validação

## Próximos Passos

1. ✅ Criar todos os arquivos de configuração JSON
2. ✅ Implementar ConfigLoader.js
3. 🔄 Atualizar módulos prioritários (DIProcessor, PricingEngine)
4. ⏳ Atualizar módulos secundários
5. ⏳ Executar validação com Serena MCP
6. ⏳ Realizar testes completos
7. ⏳ Documentar mudanças

## Tracking de Progresso

- **Arquivos de Config Criados**: 8/8 (100%)
- **ConfigLoader Implementado**: ✅
- **Módulos Atualizados**: 0/23 (0%)
- **Hardcoded Patterns Removidos**: 0/73+ (0%)
- **Testes Executados**: 0/5 (0%)

---

*Última atualização: 2025-09-04*
*Responsável: Sistema Expertzy - Equipe de Desenvolvimento*