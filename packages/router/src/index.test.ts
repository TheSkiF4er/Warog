import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryRouter, matchRoute, type RouteDefinition } from './index.js';

const Home = () => 'home';
const User = ({ params }: { params: Record<string, string> }) => `user:${params.id}`;

const routes: RouteDefinition[] = [
  { path: '/', component: Home },
  { path: '/users/:id', component: User }
];

test('matchRoute matches static routes', () => {
  const match = matchRoute('/', routes);
  assert.ok(match);
  assert.equal(match.path, '/');
  assert.deepEqual(match.params, {});
});

test('matchRoute matches params', () => {
  const match = matchRoute('/users/42', routes);
  assert.ok(match);
  assert.deepEqual(match.params, { id: '42' });
});

test('createMemoryRouter navigates between routes', () => {
  const router = createMemoryRouter(routes, '/');
  assert.equal(router.current.get()?.component({ params: {} }), 'home');
  router.navigate('/users/99');
  assert.equal(router.path.get(), '/users/99');
  assert.equal(router.current.get()?.component({ params: { id: '99' } }), 'user:99');
});
