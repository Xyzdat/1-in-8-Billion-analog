import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adultSession, adultFinances } from './fixtures/adultSession.mjs';
import { decodeSession, decodeFinances } from '../src/api/sessionDecoders.ts';
import { toServerFamily } from '../src/game/serverPresentation.ts';
import { prepareSessionMutation } from '../src/game/sessionMutation.ts';
import { ApiError } from '../src/api/errors.ts';
import { getServerClockKey } from '../src/game/serverClock.ts';

test('0.8 accepts all adult fields and preserves absent/null blocks, zeros and old providers', () => {
  const session = adultSession();
  assert.equal(decodeSession(session), session);
  for (const adult of [undefined, null]) {
    const old = adultSession();
    old.simulation.adult = adult;
    assert.equal(decodeSession(old), old);
  }
  session.provider = '1in8b';
  delete session.simulation;
  assert.equal(decodeSession(session), session);
});

test('0.8 rejects malformed adult nested values', () => {
  for (const change of [
    (a) => { delete a.npcs; }, (a) => { a.traits.diligence = 101; },
    (a) => { a.career.monthlyPay = Infinity; }, (a) => { a.education.startedMonth = 1.5; },
    (a) => { a.partnership.cohabiting = 'false'; }, (a) => { a.npcs['friend-1'].parentIds = [2]; },
    (a) => { a.healthConditions[0].stage = 'INVALID'; }, (a) => { a.debts[0].missedPayments = -1; },
    (a) => { a.assets[0].ownershipPercent = 101; }, (a) => { a.stories[0].participants = null; },
    (a) => { a.memories[0].month = '400'; }, (a) => { a.currency = 'PPP_USD'; },
  ]) {
    const session = adultSession();
    change(session.simulation.adult);
    assert.throws(() => decodeSession(session));
  }
});

test('ledger flow is optional/nullable and financing leaves server totals intact', () => {
  const data = adultFinances();
  for (const flow of [undefined, null, 'OPERATING', 'FINANCING']) {
    data.ledger[0].flow = flow;
    assert.equal(decodeFinances(data).summary.income, 240000);
  }
  data.ledger[0].flow = 'SALARY';
  assert.throws(() => decodeFinances(data));
});

test('adult relatives retain IDs and current occupations without merging names or applying consequences', () => {
  const { simulation } = adultSession();
  const people = toServerFamily(simulation.family, simulation.adult);
  assert.equal(people.length, simulation.family.length);
  assert.equal(new Set(people.map((p) => p.id)).size, people.length);
  assert.equal(people.find((p) => p.id === 'friend-1').closeness, 0);
  assert.equal(people.find((p) => p.id === 'friend-2').occupation, 'Нет данных о занятиях');
  assert(people.some((p) => p.role === 'Партнёр'));
  assert(people.some((p) => p.role === 'Родственник по браку'));
  assert(!people.some((p) => p.occupation.includes('при рождении')));
});

for (const code of ['SPENDING_INSUFFICIENT_FUNDS', 'DECISION_CHANGED', 'VERSION_CONFLICT', 'SESSION_COMPLETE']) {
  test(`${code}: retry after a failed refresh only reads; a different choice uses current version`, async () => {
    const current = adultSession();
    const latest = structuredClone(current);
    latest.version += code === 'VERSION_CONFLICT' ? 1 : 0;
    let writes = 0;
    let reads = 0;
    const execute = prepareSessionMutation(current, () => ({
      idempotencyKey: 'original-key',
      execute: async () => { writes += 1; throw new ApiError('rejected', 'http', 409, { code }); },
    }), async (id) => {
      assert.equal(id, current.id);
      reads += 1;
      if (reads === 1) throw new ApiError('offline', 'network');
      return latest;
    });
    await assert.rejects(execute(new AbortController().signal));
    const result = await execute(new AbortController().signal);
    assert.equal(result.rejectedCode, code);
    assert.equal(writes, 1);
    assert.equal(reads, 2);
    assert.equal(result.session.id, current.id);
    assert.equal(getServerClockKey(result.session), getServerClockKey(current));
    const alternative = prepareSessionMutation(result.session, (snapshot) => {
      assert.equal(snapshot.version, latest.version);
      return { execute: async () => latest };
    }, async () => { throw new Error('unexpected refresh'); });
    assert.equal((await alternative(new AbortController().signal)).session, latest);
  });
}

test('network retries keep the original prepared command and idempotency key', async () => {
  let preparations = 0;
  let writes = 0;
  const session = adultSession();
  const execute = prepareSessionMutation(session, () => {
    preparations += 1;
    return { idempotencyKey: 'same-key', execute: async () => {
      writes += 1;
      if (writes === 1) throw new ApiError('lost response', 'network');
      return session;
    } };
  }, async () => { throw new Error('unexpected refresh'); });
  await assert.rejects(execute(new AbortController().signal));
  await execute(new AbortController().signal);
  assert.equal(preparations, 1);
  assert.equal(writes, 2);
});
