import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adultSession } from './fixtures/adultSession.mjs';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { toServerFamily } from '../src/game/serverPresentation.ts';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';

function contact(status = 'IN_TOUCH') {
  return { status, trackedSinceMonth: 0, lastContactMonth: null, statusSinceMonth: 0, reason: 'INITIALIZED' };
}

test('0.8.1 accepts optional/nullable contacts, all statuses/reasons and zero game months', () => {
  const session = adultSession();
  const person = session.simulation.family[0];
  for (const value of [undefined, null, contact('IN_TOUCH'), contact('RARE_CONTACT'), contact('NO_CONTACT')]) {
    person.contact = value;
    assert.equal(decodeSession(session), session);
  }
  person.contact = contact();
  person.contact.lastContactMonth = 0;
  for (const reason of ['INITIALIZED', 'INTERACTION', 'HOUSEHOLD', 'TIME_APART', 'PLAYER_CHOICE', 'RECONNECTED']) {
    person.contact.reason = reason;
    assert.equal(decodeSession(session).simulation.family[0].contact.lastContactMonth, 0);
  }
  session.provider = '1in8b';
  delete session.simulation;
  assert.equal(decodeSession(session), session);
});

test('0.8.1 rejects unknown statuses and malformed contact fields', () => {
  for (const change of [
    (c) => { c.status = 'DIVORCED'; }, (c) => { c.reason = 'UNKNOWN'; },
    (c) => { c.trackedSinceMonth = -1; }, (c) => { c.statusSinceMonth = 1.5; },
    (c) => { c.lastContactMonth = -1; }, (c) => { c.lastContactMonth = '240'; },
    (c) => { delete c.lastContactMonth; }, (c) => { delete c.reason; },
  ]) {
    const session = adultSession();
    const value = contact();
    change(value);
    session.simulation.family[0].contact = value;
    assert.throws(() => decodeSession(session));
  }
});

test('contact labels use only server status, independent of closeness or marriage; death takes priority', () => {
  const { simulation } = adultSession();
  const partner = simulation.family.find((p) => p.role === 'partner');
  partner.contact = contact('IN_TOUCH');
  partner.closeness = 0;
  simulation.adult.partnership.status = 'DIVORCED';
  const friend = simulation.family.find((p) => p.id === 'friend-1');
  friend.contact = contact('NO_CONTACT');
  friend.closeness = 100;
  simulation.family.find((p) => p.id === 'friend-2').contact = contact('RARE_CONTACT');
  simulation.family.find((p) => !p.alive).contact = contact('NO_CONTACT');
  const original = structuredClone(simulation);
  const people = toServerFamily(simulation.family, simulation.adult);
  assert.equal(people.find((p) => p.id === partner.id).contactLabel, 'Общаемся');
  assert.equal(people.find((p) => p.id === friend.id).contactLabel, 'Связь прервана');
  assert.equal(people.find((p) => p.id === 'friend-2').contactLabel, 'Редко общаемся');
  assert.equal(people.find((p) => !p.alive).contactLabel, undefined);
  assert.equal(people.find((p) => p.id === 'mother-custom-id').contactLabel, undefined);
  assert.deepEqual(simulation, original);
});

for (const accepted of [false, true]) {
  test(`server ${accepted ? 'accepts' : 'declines'} reconnection; sending a message and reloading never invent contact`, async () => {
    let saved = adultSession();
    const id = saved.id;
    const person = (snapshot) => snapshot.simulation.family.find((p) => p.id === 'friend-1');
    person(saved).contact = contact('NO_CONTACT');
    const decision = (id) => ({ id, title: 'Вернуться к общению?', options: [{ id: 'write', label: 'Написать' }] });
    saved.state.pendingDecision = decision('contact-story-CHOICE');
    let writes = 0;
    const api = createSessionsApi(createApiClient({
      baseUrl: '/api',
      fetcher: async (url, options) => {
        if (url.endsWith('/guest')) return new Response(null, { status: 204 });
        if (options.method === 'POST') {
          const body = JSON.parse(options.body);
          assert.equal(body.expectedVersion, saved.version);
          assert(options.headers.get('Idempotency-Key'));
          writes += 1;
          saved = structuredClone(saved);
          saved.version += 1;
          if (url.endsWith('/step')) {
            saved.simulation.elapsedMonths += 2;
            saved.simulation.monthOfYear = 2;
            saved.state.pendingDecision = accepted ? decision('contact-story-CONVERSATION') : null;
          } else {
            assert(url.includes('/decisions/'));
            assert.equal(body.optionId, 'write');
            if (url.includes('CONVERSATION')) {
              person(saved).contact = {
                ...contact('IN_TOUCH'), reason: 'RECONNECTED',
                lastContactMonth: saved.simulation.elapsedMonths,
                statusSinceMonth: saved.simulation.elapsedMonths,
              };
            }
            saved.state.pendingDecision = null;
          }
        } else {
          assert.equal(url, `/api/v1/sessions/${id}`);
        }
        return Response.json(saved);
      },
    }));
    let snapshot = await api.getSession(id);
    snapshot = await api.prepareAnswer(id, snapshot.state.pendingDecision.id, 'write', snapshot.version).execute();
    assert.equal(person(snapshot).contact.status, 'NO_CONTACT');
    assert.deepEqual(await api.getSession(id), snapshot);
    snapshot = await api.prepareProgress(snapshot).execute();
    assert.equal(person(snapshot).contact.status, 'NO_CONTACT');
    if (accepted) {
      snapshot = await api.prepareAnswer(id, snapshot.state.pendingDecision.id, 'write', snapshot.version).execute();
    }
    assert.equal(snapshot.id, id);
    assert.equal(person(snapshot).contact.status, accepted ? 'IN_TOUCH' : 'NO_CONTACT');
    assert.deepEqual(await api.getSession(id), snapshot);
    assert.equal(writes, accepted ? 3 : 2);
  });
}
