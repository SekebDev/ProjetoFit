-- Limpa as sessoes que ficaram orfas: abertas (finishedAt null) E sem dia
-- (planDayId null, zerado pelo SetNull quando o plano foi editado no meio do
-- treino).
--
-- Esse par e um estado travado: o painel oferece "continuar treino", mas nao ha
-- /workout/[planDayId] pra onde ir, e fechar so acontece la dentro. A sessao
-- nunca sai da frente e esconde o proximo treino pra sempre.
--
-- O codigo ja nao produz mais esse estado (plans.service re-vincula as sessoes
-- abertas aos dias recriados, e activeSession ignora orfa), mas as linhas
-- criadas antes da correcao continuam no banco. Esta migration as limpa.
--
-- O destino depende do que ha pra perder, exatamente como o runtime decide em
-- plans.service.rebindSessoesAbertas:

-- 1. Orfa VAZIA e apagada. Nao ha dado do usuario a preservar, e encerra-la
--    seria pior que inutil: a sequencia conta qualquer sessao com finishedAt
--    preenchido, SEM olhar se ha serie registrada (progress/streak-query.ts), e
--    o /progress soma o total de sessoes encerradas do mesmo jeito. Fechar aqui
--    daria ao usuario um dia de sequencia por um treino que ele nunca fez — e
--    depois nao haveria como distinguir o dia fabricado do legitimo.
DELETE FROM "WorkoutSession" s
WHERE s."finishedAt" IS NULL
  AND s."planDayId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SetLog" l WHERE l."sessionId" = s.id
  );

-- 2. Orfa COM series vai pro historico encerrada: o treino aconteceu de fato, e
--    o dado do usuario nao pode sumir.
--
--    finishedAt = date e durationSec = 0 de proposito: nao da pra saber quando o
--    treino foi abandonado, e inventar uma duracao poluiria as estatisticas de
--    tempo. Duracao zero e honesto.
--
--    Sem conceder XP: o treino nao foi concluido pelo usuario, foi interrompido.
UPDATE "WorkoutSession"
SET "finishedAt" = "date",
    "durationSec" = 0
WHERE "finishedAt" IS NULL
  AND "planDayId" IS NULL;
