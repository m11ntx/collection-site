# M11NTX

## Business Rules

Versão: 1.0

---

# RN-001

## Publicar apenas produtos disponíveis

Somente produtos que possuam estoque disponível poderão aparecer no catálogo.

Regra:

Se pelo menos um tamanho possuir estoque > 0

Produto disponível.

Caso contrário

Produto indisponível.

---

# RN-002

## Produtos sem estoque

Produtos sem estoque NÃO devem ser removidos do banco de dados (JSON).

Eles devem receber:

available = false

Isso evita:

- download novamente
- recriação de imagens
- perda de informações

---

# RN-003

## Download de imagens

Nunca baixar uma imagem que já exista.

Fluxo

Produto

↓

Imagem existe?

↓

SIM

↓

Ignorar download

↓

Atualizar apenas os dados

---

# RN-004

## Atualização incremental

Durante uma sincronização apenas produtos alterados deverão ser atualizados.

Evitar recriar:

- imagens
- json
- assets

desnecessariamente.

---

# RN-005

## Atualização de estoque

Toda sincronização deverá atualizar:

available

sizes

stock

---

# RN-006

## Estrutura dos tamanhos

Cada produto deverá armazenar:

[
    {
        "size":"P",
        "stock":5
    },
    {
        "size":"M",
        "stock":0
    },
    {
        "size":"G",
        "stock":3
    }
]

---

# RN-007

## Disponibilidade

available

é calculado automaticamente.

Nunca editado manualmente.

Regra

Existe algum tamanho com estoque?

SIM

available = true

NÃO

available = false

---

# RN-008

## Assets

As imagens pertencem ao catálogo.

Nunca ao HTML.

Toda imagem deve estar referenciada no JSON.

---

# RN-009

## Slugs

Todos os arquivos utilizarão slug.

Exemplo

manchester-united-home-1999.webp

Nunca utilizar espaços.

Nunca utilizar acentos.

---

# RN-010

## Formato

Todas as imagens

WebP

Compressão

85%

---

# RN-011

## Cache

Imagens existentes nunca serão recriadas.

---

# RN-012

## JSON

Todos os JSON são a única fonte oficial da plataforma.

O HTML nunca possuirá dados hardcoded.
