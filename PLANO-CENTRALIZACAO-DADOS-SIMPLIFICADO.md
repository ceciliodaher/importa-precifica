# Plano Simplificado - Remoção de Hardcoded Data Críticos

## Princípio: KISS (Keep It Simple, Stupid)
Centralizar **APENAS** dados que mudam com legislação. Fórmulas e conversões permanecem no código.

## Arquivos de Configuração

### ✅ Já Existentes e Funcionando
1. **aliquotas.json** - Alíquotas ICMS por estado (completo)
2. **beneficios.json** - Benefícios fiscais por estado (completo)
3. **config.json** - Configurações do sistema

### ✅ Criado
4. **import-fees.json** - Taxas SISCOMEX, AFRMM (25%), outras taxas de importação

## Correções Necessárias de Hardcoded Data

### 🔴 CRÍTICO - Alíquotas Incorretas

#### PricingEngine.js (linha 111)
```javascript
// INCORRETO - Hardcoded e com valores errados
const stateAliquotas = {
    'GO': 17, 'SC': 17, 'ES': 17, 'MG': 18, 'SP': 18
};

// CORREÇÃO: Carregar de aliquotas.json onde GO = 19%
```

#### DIProcessor.js (linha 996)  
```javascript
// HARDCODED
const afrmm = freteValorReais * 0.25;

// CORREÇÃO: Carregar de import-fees.json
```

### 🟡 MÉDIO - Referências Duplicadas

#### PricingEngine.js (linhas 174-190)
```javascript
// Benefícios fiscais duplicados (já estão em beneficios.json)
GO: { rate: 67, description: '67% de crédito outorgado' }
SC: { rate: 75, description: '75% de diferimento' }
ES: { effective_rate: 9, description: 'Alíquota efetiva 9%' }

// CORREÇÃO: Usar beneficios.json
```

## O Que NÃO Precisa Mudar

### ✅ Fórmulas (permanecem no código)
- Cálculo ICMS por dentro: `valor / (1 - aliquota/100)`
- Base ICMS importação (complexa, já funciona)
- Conversões de peso DI: `/100000` (padrão SISCOMEX)

### ✅ Constantes Técnicas (permanecem no código)
- Tolerâncias de validação
- Divisores de conversão
- Timeouts e limites

### ✅ Regras de Negócio (definidas pelo usuário)
- Markups
- Descontos
- Estratégias de preço

## Plano de Ação Simplificado

### Passo 1: Criar ConfigLoader.js
Módulo simples para carregar os 4 arquivos de configuração:
```javascript
class ConfigLoader {
    async loadAll() {
        this.aliquotas = await fetch('aliquotas.json');
        this.beneficios = await fetch('beneficios.json');
        this.importFees = await fetch('import-fees.json');
        this.config = await fetch('config.json');
    }
}
```

### Passo 2: Corrigir PricingEngine.js
- Remover `stateAliquotas` hardcoded
- Usar ConfigLoader para alíquotas ICMS

### Passo 3: Corrigir DIProcessor.js
- Remover AFRMM 25% hardcoded
- Usar ConfigLoader para import-fees

### Passo 4: Eliminar Duplicações
- Remover benefícios fiscais duplicados do PricingEngine
- Usar ConfigLoader para beneficios.json

## Resultado Final

✅ **Sistema mantém funcionalidade atual**
✅ **Alíquotas atualizáveis sem tocar código**
✅ **Sem complicações desnecessárias**
✅ **Fórmulas corretas permanecem intactas**

## NÃO FAZER

❌ Não mover fórmulas para JSON
❌ Não mover conversões técnicas para JSON
❌ Não criar dezenas de arquivos de configuração
❌ Não alterar o que já funciona corretamente

---

**Filosofia**: Se não está quebrado e não muda com legislação, não mexa!