const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type float', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createModelWithType('withfloat', 'float');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteModel('withfloat');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const inputValue = 12.31;
    const res = await rq.post('/content-manager/explorer/withfloat', {
      body: {
        field: inputValue,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: inputValue,
    });
  });

  test('Create entry with value input Formdata', async () => {
    const inputValue = 23.1;
    const res = await rq.post('/content-manager/explorer/withfloat', {
      formData: {
        data: JSON.stringify({ field: inputValue }),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: inputValue,
    });
  });

  test('Create entry with integer should convert to float', async () => {
    const inputValue = 1821;
    const res = await rq.post('/content-manager/explorer/withfloat', {
      body: {
        field: inputValue,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 1821.0,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/withfloat');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(entry => {
      expect(entry.field).toEqual(expect.any(Number));
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/withfloat', {
      body: {
        field: 11.2,
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/withfloat/${res.body.id}`,
      {
        body: {
          field: 14,
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 14.0,
    });
  });
});
