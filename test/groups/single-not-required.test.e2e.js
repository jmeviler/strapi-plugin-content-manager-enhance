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
      repeatable: false,
      required: false,
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
          field: {
            name: 'someString',
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.field).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'someString',
        })
      );
    });

    test('Creating entry with formdata works', async () => {
      const res = await rq.post('/', {
        formData: {
          data: JSON.stringify({
            field: {
              name: 'someValue',
            },
          }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.field).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'someValue',
        })
      );
    });

    test.each([[], 'someString', 128219, false])(
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

    test('Can send a null value', async () => {
      const res = await rq.post('/', {
        body: {
          field: null,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.field).toBe(null);
    });

    test('Can send input without the group field', async () => {
      const res = await rq.post('/', {
        body: {},
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.field).toBe(null);
    });
  });

  describe('GET entries', () => {
    test('Should return entries with their nested groups', async () => {
      const res = await rq.get('/');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        if (entry.field === null) return;

        expect(entry.field).toMatchObject({
          name: expect.any(String),
        });
      });
    });
  });

  describe('PUT entry', () => {
    test.each([[], 'someString', 128219, false])(
      'Throws when sending invalid updated field %p',
      async value => {
        const res = await rq.post('/', {
          body: {
            field: {
              name: 'someString',
            },
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

    test('Keeps the previous value if group not sent', async () => {
      const res = await rq.post('/', {
        body: {
          field: {
            name: 'someString',
          },
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

    test('Removes previous group if null sent', async () => {
      const res = await rq.post('/', {
        body: {
          field: {
            name: 'someString',
          },
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: null,
        },
      });

      const expectResult = {
        id: res.body.id,
        field: null,
      };

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject(expectResult);

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject(expectResult);
    });

    test('Replaces the previous group if sent without id', async () => {
      const res = await rq.post('/', {
        body: {
          field: {
            name: 'someString',
          },
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: {
            name: 'new String',
          },
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.field.id).not.toBe(res.body.field.id);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: {
          name: 'new String',
        },
      });

      const getRes = await rq.get(`/${res.body.id}`);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject({
        id: res.body.id,
        field: {
          name: 'new String',
        },
      });
    });

    test('Throws on invalid id in group', async () => {
      const res = await rq.post('/', {
        body: {
          field: {
            name: 'someString',
          },
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: {
            id: 'invalid_id',
            name: 'new String',
          },
        },
      });

      expect(updateRes.statusCode).toBe(400);
    });

    test('Updates group if previsous group id is sent', async () => {
      const res = await rq.post('/', {
        body: {
          field: {
            name: 'someString',
          },
        },
      });

      const updateRes = await rq.put(`/${res.body.id}`, {
        body: {
          field: {
            id: res.body.field.id, // send old id to update the previous group
            name: 'new String',
          },
        },
      });

      const expectedResult = {
        id: res.body.id,
        field: {
          id: res.body.field.id,
          name: 'new String',
        },
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
          field: {
            name: 'someString',
          },
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
