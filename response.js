/* eslint-disable no-console */
const Bottleneck = require('bottleneck');
const readToken = require('./readToken');
const authenticatedCall = require('./authenticatedCall');

const API_PREFIX = 'https://api.spotify.com/v1/';

const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 40 });

const apiCall = async ({ url, method, query, body, json }) => {
  const token = await readToken();
  if (!token) return null;
  const accessToken = token.access_token;
  try {
    return await authenticatedCall(url, {
      method: method || 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      query,
      body,
      json,
    });
  } catch (e) {
    if (!e.response) {
      console.error(url, e);
      return e;
    } else if (e.response.statusCode === 502) {
      return apiCall({ url, method, query, body });
    } else if (e.response.body === '') {
      const { statusCode, statusMessage } = e.response;
      console.error({ statusCode, statusMessage });
    } else {
      return e.response.body;
    }
  }
  return null;
};

const api = limiter.wrap(async request => await apiCall(request));

const getPaged = async request => {
  const response = { items: [] };
  const type = request.query && request.query.type;
  do {
    const page = await api(request);
    if (!page) break;
    if (page.error) {
      request.url = null;
    } else {
      request.query = undefined;
      const body = type ? page[`${type}s`] : page;
      request.url = body.next;
      response.items = response.items.concat(body.items);
    }
  } while (request.url);
  return response;
};

const getMultiple = async args => {
  const { ids, max, label, ...request } = args;

  const items = ids.filter(
    (v, i, a) => a.indexOf(v) === i && typeof v === 'string',
  );
  if (items.length) {
    for (let i = 0; i < Math.ceil(items.length / max); i++) {
      request.query = {
        ids: items.slice(0 + i * max, (i + 1) * max).join(','),
      };
      const page = await api(request);
      for (let j = 0; j < items.length; j++) {
        items[j] =
          page[label].find(item => item && item.id === items[j]) || items[j];
      }
    }
  }
  return items;
};

const response = async args => {
  args.url = API_PREFIX + args.url;
  if (args.label) return await getMultiple(args);
  if (args.type === 'paged') return await getPaged(args);
  return await api(args);
};

module.exports = response;
