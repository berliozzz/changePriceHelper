import {market,proxy} from './config.js';

export const filterActiveTrades = (item) => item.status == 2;
export const isEmpty = string => {
  if (string.trim() == '') {
    return true;
  }
  return false;
}
export const transformPrice = (price) => {
  if (market.currency == 'USD') {
    return `${price / 1000}$`;
  }
  if (market.currency == 'EUR') {
    return `${price / 1000}€`;
  }
  if (market.currency == 'RUB') {
    return `${price / 100}₽`;
  }
}
export const getProxyUrl = () => {
  if (!isEmpty(proxy.domen) && !isEmpty(proxy.port) && !isEmpty(proxy.user) && !isEmpty(proxy.password)) {
    return `http://${proxy.user}:${proxy.password}@${proxy.domen}:${proxy.port}`;
  }
  if (!isEmpty(proxy.domen) && !isEmpty(proxy.port) && isEmpty(proxy.user) && isEmpty(proxy.password)) {
    return `http://${proxy.domen}:${proxy.port}`;
  }
  return '';
}