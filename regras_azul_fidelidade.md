# Base de Conhecimento RAG: Azul Fidelidade (Regras de Retenção)

## Regras Operacionais Críticas (NÃO ALUCINAR)
1. A Azul NÃO possui Primeira Classe. Upgrades de cabine são APENAS para a Classe Executiva e APENAS em voos internacionais.
2. O Lounge Azul principal fica no aeroporto de Viracopos (VCP) e em Lisboa, Orlando, Fort Lauderdale.
3. Clientes da categoria Diamante JÁ POSSUEM cortesias ilimitadas no Espaço Azul (voo nacional) e 3 bagagens de 23kg grátis. NÃO ofereça isso como compensação para eles.
4. Clientes Safira têm direito a 2 bagagens de 23kg grátis.
5. Clientes Topázio têm direito a 1 bagagem de 23kg grátis.

## Catálogo de Ações de Retenção (Com Custos Fixos Internos)
O Árbitro Matemático só pode selecionar ações desta lista se o Retorno Líquido for > 0.
- `UPGRADE_EXECUTIVA`: Custo interno R$ 1.500,00. Aplicável apenas em voo internacional para reter clientes de altíssimo CLV.
- `ACESSO_LOUNGE_VCP`: Custo interno R$ 120,00. Útil para atritos em Viracopos.
- `ISENCAO_BAGAGEM_EXTRA`: Custo interno R$ 100,00. Oferecer 1 mala extra de 23kg (avaliar limite da categoria do cliente).
- `CORTESIA_ESPACO_AZUL`: Custo interno R$ 50,00. Assento com mais espaço em voo nacional. (Inútil para Diamante).
- `BONUS_5000_PONTOS`: Custo interno R$ 150,00 (Assumindo CPM interno de R$ 30).
- `MENSAGEM_EXECUTIVA_VIP`: Custo R$ 1,00. Apenas um pedido de desculpas humanizado assinado pela diretoria, sem custo de benefício agregado.
- `NAO_FAZER_NADA`: Custo R$ 0,00. Acionado quando nenhuma ação der lucro.