const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type enumeration', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createModelWithType('withenumeration', 'enumeration', {
      enum: ['one', 'two'],
    });
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteModel('withenumeration');
  }, 60000);

  test('Create entry value enumeration input JSON', async () => {
    const res = await rq.post('/content-manager/explorer/withenumeration', {
      body: {
        field: 'one',
      },
    });

    expect(res.statusCode).toBe(200); // should return 201
    expect(res.body).toMatchObject({
      field: 'one',
    });
  });

  test('Create entry value enumeration input Formdata', async () => {
    const res = await rq.post('/content-manager/explorer/withenumeration', {
      formData: {
        data: JSON.stringify({ field: 'two' }),
      },
    });

    expect(res.statusCode).toBe(200); // should return 201
    expect(res.body).toMatchObject({
      field: 'two',
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/withenumeration');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(entry => {
      expect(['one', 'two'].includes(entry.field)).toBe(true);
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/withenumeration', {
      body: {
        field: 'two',
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/withenumeration/${res.body.id}`,
      {
        body: {
          field: 'one',
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 'one',
    });
  });

  /*
   * Waiting validation of input to work
   */
  test.todo('Throws an error when the enumeration value is not in the options');
});
