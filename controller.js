import * as serverManager from './serverManagers/serverManager.js';
import steamManager from './serverManagers/steamServerManager.js';
import * as utils from './utils.js';
import {items, market} from './config.js';

/********************* Timers *********************/
let pingPongTimer;
let itemsTimer;
let getPriceTimer;

/********************** Variables *********************/
let itemRequestErrCount = 0;
let steamErrCount = 0;
let trades = []; 

/********************** Constants *********************/
const SEC = 1000;

/******************** API methods *********************/
const getItemInfo = (item) => {
  serverManager.getItemInfo(item.market_hash_name)
    .then(res => {
      checkItemState(res.data, item);
    })
    .catch(err => console.log(`getItemInfo err: ${err.message}`));
}
const changePrice = (itemId, price, currency) => {
  serverManager.changePrice(itemId, price, currency)
  .then(res => {
    if (res.data.success) {
      console.log(`the price has been changed to ${utils.transformPrice(price)}`);
    } else {
      console.log(`changePrice data err: ${res.data.error}`);
    }
  })
  .catch(err => console.log(`changePrice err: ${err.message}`));
}
const pingPong = () => {
  serverManager.pingPong()
    .then(res => {
      if (!res.data.success) {
        console.log(`pingPong data err: ${res.data}`);
      }
    })
    .catch(err => console.log(`pingPong err: ${err.message}`));
}
const getItems = () => {
  serverManager.getItems()
    .then(res => {
      if (res.data.success) {
        if (!res.data.items) return;
        trades = res.data.items;
        const activeTrades = trades.filter(utils.filterActiveTrades);
        if (activeTrades.length > 0) {
          tradeRequest();
        }
      } else {
        console.log('getItems data error: ' + res.data.error);
      }
    })
    .catch(err => console.log(`getItems err: ${err.message}`));
}
const tradeRequest = () => {
  serverManager.tradeRequest() 
    .then(res => {
      if (res.data.success) {
        itemRequestErrCount = 0;
        sendItem(res.data.offer);
      } else {
        console.log('tradeRequest err:' + res.data.message);
        if (itemRequestErrCount != 3) {
          console.log('Пробую еще раз...');
          tradeRequest();
          itemRequestErrCount++;
        } else {
          itemRequestErrCount = 0;
          console.log('Не удалось передать предмет.');
        }
      }
    })
    .catch(err => console.log(`tradeRequest err: ${err.message}`));
}

/****************** Help functions *******************/
const checkItemState = (res, myItem) => {
  const bestPrice = res.data[0].price;
  const secondPrice = res.data[1].price;
  let myItemPrice = 0;
  
  for (const item of res.data) {
    if (item.id === myItem.item_id) {
      myItemPrice = item.price;
      break;
    }
  }

  const price = priceCalculation(bestPrice, myItemPrice, myItem, secondPrice);
  if (price != 0) changePrice(myItem.item_id, price, market.currency);
}
const priceCalculation = (bestPrice, myItemPrice, myItem, secondPrice) => {
  if (bestPrice != myItemPrice && bestPrice > myItem.minPrice) {
    return bestPrice - 3;
  } else if (bestPrice < myItem.minPrice && myItemPrice != myItem.maxPrice) {
    return myItem.maxPrice;
  } else if (bestPrice == myItemPrice && myItemPrice < secondPrice - 3) {
    return secondPrice - 3;
  }
  return 0;
}
const startBot = () => {
  for (const item of items) {
    getItemInfo(item);
  }
}

/**************** Steam Server Manager ****************/
function sendItem(params) {
  steamManager.sendItem(params)
    .then(data => {
      if (data.status == 'pending') {
        steamErrCount = 0;
        console.log('Обмен отправлен и ожидает мобильного подтверждения...');
        setTimeout(() => { acceptConfirmation(data.id, params) }, 500);
      } else {
        console.log('status: ' + data.status);
      }
    })
    .catch(err => {
      console.log('sendItem: ' + err.message);
      if (~err.message.indexOf('(15)')) {
        console.log('Ошибка отправки предмета, данный профиль не может обмениваться: ' + params.profile);
      }
      if (steamErrCount > 5) {
        setTimeout(() => { sendItem(params) }, 5 * SEC);
      } else {
        steamErrCount = 0;
      }
    });
}
function acceptConfirmation(confirmationid, params) {
  steamManager.acceptConfirmation(confirmationid)
    .then(res => {
      steamErrCount = 0;
      console.log(res);
    })
    .catch(err => {
      console.log('acceptConfirmation: ' + err.message);
      if (steamErrCount > 5) {
        setTimeout(() => { acceptConfirmation(confirmationid, params) }, 5 * SEC);
      } else {
        steamErrCount = 0;
      }
    });
}

/***************** Start timers **********************/
pingPong();
pingPongTimer = setInterval(() => pingPong(), 119 * SEC);
getPriceTimer = setInterval(() => startBot(), market.requestInterval * SEC);
itemsTimer = setInterval(() => getItems(), 31 * SEC);