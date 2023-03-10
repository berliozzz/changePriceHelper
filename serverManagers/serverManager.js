import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';
import {market} from '../config.js';
import {isEmpty,getProxyUrl} from '../utils.js';

const proxyUrl = getProxyUrl();
axios.defaults.baseURL = market.baseUrl;
axios.defaults.params = { key: market.apiKey };
if (!isEmpty(proxyUrl)) {
  axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl);
}

export const getItemInfo = (hashName) => {
  const options = {
    method: 'GET',
    params: { hash_name: hashName },
    url: 'search-item-by-hash-name-specific'
  };

  return new Promise ((resolve, reject) => {
    axios(options)
      .then(response => {
        resolve(response);
      })
      .catch(error => {
        reject(error);
      });
  });
}
export const changePrice = (itemId, price, currency) => {
  const options = {
    method: 'GET',
    params: { item_id: itemId, price: price, cur: currency },
    url: 'set-price'
  };

  return new Promise ((resolve, reject) => {
    axios(options)
      .then(response => {
        resolve(response);
      })
      .catch(error => {
        reject(error);
      });
  });
}
export const pingPong = () => {
  const options = {
    method: 'GET',
    url: 'ping'
  };

  return new Promise ((resolve, reject) => {
    axios(options)
      .then(response => {
        resolve(response);
      })
      .catch(error => {
        reject(error);
      });
  });
}
export const getItems = () => {
  const options = {
    method: 'GET',
    url: 'items'
  };

  return new Promise ((resolve, reject) => {
    axios(options)
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}
export const tradeRequest = () => {
  const options = {
    method: 'GET',
    url: 'trade-request-give-p2p'
  };

  return new Promise ((resolve, reject) => {
    axios(options)
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}