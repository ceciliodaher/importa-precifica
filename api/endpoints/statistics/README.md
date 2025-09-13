# Endpoints de Estatísticas - Dashboard

Este diretório contém os endpoints PHP para o dashboard de estatísticas do Sistema Expertzy de Importação e Precificação.

## Arquivos Criados

### 1. `di-summary.php`
**Resumo completo por DI com estatísticas**

- **Método**: GET
- **URL**: `/api/endpoints/statistics/di-summary.php?numero_di=XXXXXXXXX`
- **Parâmetros**:
  - `numero_di` (obrigatório): número da DI (8-12 dígitos)

**Retorna**:
- Resumo geral da DI (importador, data, totais)
- Análise de tributos por adição
- Taxa de câmbio calculada dinamicamente
- Distribuição de valores por NCM
- Totais consolidados

### 2. `tributos-analysis.php`
**Análise detalhada de tributos**

- **Método**: GET
- **URL**: `/api/endpoints/statistics/tributos-analysis.php?numero_di=XXXXXXXXX&[tipo_analise=detalhada]`
- **Parâmetros**:
  - `numero_di` (obrigatório): número da DI (8-12 dígitos)
  - `tipo_analise` (opcional): `detalhada` ou `resumida` (padrão: `detalhada`)

**Retorna**:
- Análise por tipo de tributo (II, IPI, PIS, COFINS)
- Comparação de alíquotas vs valores devidos
- Análise de base de cálculo por adição
- Efetividade tributária por NCM
- Indicadores de compliance fiscal

### 3. `global-stats.php`
**Estatísticas globais do sistema**

- **Método**: GET
- **URL**: `/api/endpoints/statistics/global-stats.php?[periodo=30d&detalhamento=completo]`
- **Parâmetros**:
  - `periodo` (opcional): `7d`, `30d`, `90d`, `1y`, `all` (padrão: `30d`)
  - `detalhamento` (opcional): `basico` ou `completo` (padrão: `completo`)

**Retorna**:
- Resumo geral (DIs, adições, importadores, etc.)
- Análise temporal de importações
- Ranking por estado, NCM e importadores
- Análise de tributos consolidada
- Indicadores de performance do sistema

## Características Implementadas

### ✅ Regras Críticas Seguidas
- **NUNCA usar fallbacks** para dados obrigatórios - sempre `throw Exception`
- **Taxa de câmbio SEMPRE calculada**: `valor_reais / valor_moeda_negociacao`
- **Nomenclatura EXATA**: `numero_di`, `valor_reais`, `valor_moeda_negociacao`, `ii_valor_devido`, etc.
- **Validação completa** de todos os dados antes de retornar

### ✅ Padrões Implementados
- Conecta ao banco MySQL usando `DatabaseService`
- Validação de dados obrigatórios sem fallbacks
- Cálculo dinâmico de taxa de câmbio
- Retorna JSON com estrutura consistente
- Tratamento de erros explícito
- Headers CORS para acesso via JavaScript
- Formatação adequada de valores monetários e percentuais

### ✅ Tratamento de Erros
- Validação de método HTTP (apenas GET)
- Validação de parâmetros obrigatórios
- Validação de formato de dados
- Tratamento de exceções com logs
- Códigos HTTP apropriados (400, 404, 500)

### ✅ Performance
- Queries otimizadas com JOINs eficientes
- Formatação de números apenas na resposta final
- Uso de prepared statements para segurança
- Limitação de resultados em rankings

## Estrutura de Resposta Padrão

```json
{
  "success": true,
  "data": {
    // Dados específicos do endpoint
  },
  "timestamp": "2025-09-13T10:30:45+00:00"
}
```

### Em caso de erro:
```json
{
  "success": false,
  "error": "Descrição do erro",
  "timestamp": "2025-09-13T10:30:45+00:00"
}
```

## Exemplos de Uso

### JavaScript (Frontend)
```javascript
// Estatísticas globais
fetch('/api/endpoints/statistics/global-stats.php?periodo=30d&detalhamento=completo')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Total DIs:', data.data.resumo_geral.total_dis);
      console.log('Valor total:', data.data.resumo_geral.valor_total_importado_reais);
    }
  });

// Resumo de DI específica
fetch('/api/endpoints/statistics/di-summary.php?numero_di=2300120746')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Taxa câmbio média:', data.data.totais_gerais.taxa_cambio_media);
      console.log('Total tributos:', data.data.analise_tributos.total_tributos_federais);
    }
  });

// Análise de tributos
fetch('/api/endpoints/statistics/tributos-analysis.php?numero_di=2300120746&tipo_analise=detalhada')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Carga tributária:', data.data.resumo_executivo.carga_tributaria_efetiva);
      console.log('Maior incidência:', data.data.resumo_executivo.maior_incidencia);
    }
  });
```

### PHP (Backend)
```php
// Usando curl
$url = 'http://localhost/api/endpoints/statistics/global-stats.php?periodo=30d';
$response = file_get_contents($url);
$data = json_decode($response, true);

if ($data['success']) {
    echo "Total de DIs: " . $data['data']['resumo_geral']['total_dis'];
}
```

## Testes

Execute o arquivo de teste para validar os endpoints:
```bash
php test-statistics-endpoints.php
```

## Dependências

- PHP 7.4+
- MySQL 5.7+
- Extensões PHP: PDO, curl, json
- Sistema Expertzy com banco de dados populado

## Logs

Todos os erros são registrados no log de erro do PHP via `error_log()`. Verifique os logs do servidor em caso de problemas.

## Segurança

- Validação rigorosa de parâmetros
- Prepared statements para prevenir SQL injection
- Headers CORS configurados
- Tratamento seguro de exceções sem exposição de dados sensíveis