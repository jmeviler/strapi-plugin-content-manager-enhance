const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe.each([
  ['CONTENT MANAGER', '/content-manager/explorer/withgroup'],
  ['GENERATED API', '/withgroups'],
])('[%s] => Non repeatable and Not required group', (_, path) => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    const authRq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq: authRq });

    await modelsUtils.createGroup({
      name: 'somegroup',
      attributes: {
        name: {
          type: 'string',
        },
      },
    });

    await modelsUtils.createModelWithType('withgroup', 'group', {
      group: 'somegroup',
      repeatable: true,
      required: false,
      min: 1,
      max: 5,
    });

    rq = authRq.defaults({
      baseUrl: `http://localhost:1337${path}`,
    });
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteGroup('somegroup');
    await modelsUtils.deleteModel('withgroup');
  }, 60000);

  describe('POST new entry', () => {
    test('Creating entry with JSON works', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body.field).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            name: 'someString',
          }),
        ])
      );
    });

    test('Creating entry with formdata works', async () => {
      const res = await rq.post('/', {
        formData: {
          data: JSON.stringify({
            field: [
              {
                name: 'someValue',
              },
            ],
          }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body.field).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            name: 'someValue',
          }),
        ])
      );
    });

    test.each(['someString', 128219, false, {}, null])(
      'Throws if the field is not an object %p',
      async value => {
        const res = await rq.post('/', {
          body: {
            field: value,
          },
        });

        expect(res.statusCode).toBe(400);
      }
    );

    test('Throws when sending an empty array or an array with less then the min', async () => {
      const res = await rq.post('/', {
        body: {
          field: [],
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Throws when sending too many items', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'one',
            },
            {
              name: 'one',
            },
            {
              name: 'one',
            },
            {
              name: 'one',
            },
            {
              name: 'one',
            },
            {
              name: 'one',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Can send input without the group field', async () => {
      const res = await rq.post('/', {
        body: {},
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.field).toEqual([]);
    });
  });

  describe('GET entries', () => {
    test('Data is orderd in the order sent', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'firstString',
            },
            {
              name: 'someString',
            },
          ],
        },
      });

      const getRes = await rq.get(`/${res.body.id}`);
      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.field)).toBe(true);

      expect(getRes.body.field[0]).toMatchObject({
        name: 'firstString',
      });
      expect(getRes.body.field[1]).toMatchObject({
        name: 'someString',
      });
    });

    test('Should return entries with their nested groups', async () => {
      const res = await rq.get('/');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        expect(Array.isArray(entry.field)).toBe(true);

        if (entry.field.length === 0) return;

        expect(entry.field).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
            }),
          ])
        );
      });
    });
  });

  describe('PUT entry', () => {
    test.each(['someString', 128219, false, {}, null])(
      'Throws when sending invalid updated field %p',
      async value => {
        const res = await rq.post('/', {
          body: {
            field: [
              {
                name: 'someString',
              },
            ],
          },
        });

        const updateRes = await rq.put(`/${res.body.id}`, {
          body: {
            field: value,
          },
        });

        expect(updateRes.statusCode).toBe(400);

        // shouldn't have been updated
        const getRes = await rq.get(`/${res.body.id}`);

        expect(getRes.statusCode).toBe(200);
        expect(getRes.body).toMatchObject({
          id: res.body.id,
          field: res.body.field,
        });
      }
    );

    test('Updates order at each request', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
            {
              name: 'otherString',
            },
          ],
        },
      });

      expect(res.body.field[0]).toMatchObject({
        name: 'someString',
      });
      expect(res.body.field[1]).toMatchObject({
        name: 'otherString',
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: [
            {
              name: 'otherString',
            },
            {
              name: 'someString',
            },
          ],
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(Array.isArray(updateRes.body.field)).toBe(true);

      expect(updateRes.body.field[0]).toMatchObject({
        name: 'otherString',
      });
      expect(updateRes.body.field[1]).toMatchObject({
        name: 'someString',
      });

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.field)).toBe(true);

      expect(getRes.body.field[0]).toMatchObject({
        name: 'otherString',
      });
      expect(getRes.body.field[1]).toMatchObject({
        name: 'someString',
      });
    });

    test('Keeps the previous value if group not sent', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
            {
              name: 'otherString',
            },
          ],
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {},
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: res.body.field,
      });

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject({
        id: res.body.id,
        field: res.body.field,
      });
    });

    test('Throws when not enough items', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
          ],
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: [],
        },
      });

      expect(updateRes.statusCode).toBe(400);

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject(res.body);
    });

    test('Throws when too many items', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
          ],
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: [
            {
              name: 'someString',
            },
            {
              name: 'someString',
            },
            {
              name: 'someString',
            },
            {
              name: 'someString',
            },
            {
              name: 'someString',
            },
            {
              name: 'someString',
            },
          ],
        },
      });

      expect(updateRes.statusCode).toBe(400);

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject(res.body);
    });

    test('Replaces the previous groups if sent without id', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
          ],
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: [
            {
              name: 'new String',
            },
          ],
        },
      });

      expect(updateRes.statusCode).toBe(200);

      const oldIds = res.body.field.map(val => val.id);
      updateRes.body.field.forEach(val => {
        expect(oldIds.includes(val.id)).toBe(false);
      });

      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: [
          {
            name: 'new String',
          },
        ],
      });

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject({
        id: res.body.id,
        field: [
          {
            name: 'new String',
          },
        ],
      });
    });

    test('Throws on invalid id in group', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
          ],
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: [
            {
              id: 'invalid_id',
              name: 'new String',
            },
          ],
        },
      });

      expect(updateRes.statusCode).toBe(400);
    });

    test('Updates group with ids, create new ones and removes old ones', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'one',
            },
            {
              name: 'two',
            },
            {
              name: 'three',
            },
          ],
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: [
            {
              id: res.body.field[0].id, // send old id to update the previous group
              name: 'newOne',
            },
            {
              name: 'newTwo',
            },
            {
              id: res.body.field[2].id,
              name: 'three',
            },
            {
              name: 'four',
            },
          ],
        },
      });

      const expectedResult = {
        id: res.body.id,
        field: [
          {
            id: res.body.field[0].id,
            name: 'newOne',
          },
          {
            name: 'newTwo',
          },
          {
            id: res.body.field[2].id,
            name: 'three',
          },
          {
            name: 'four',
          },
        ],
      };

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject(expectedResult);

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject(expectedResult);
    });
  });

  describe('DELETE entry', () => {
    test('Returns entry with groups', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              name: 'someString',
            },
            {
              name: 'someOtherString',
            },
            {
              name: 'otherSomeString',
            },
          ],
        },
      });

      const deleteRes = await rq.delete(`/${res.body.id}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body).toMatchObject(res.body);

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(404);
    });
  });
});
