import SteamUser from 'steam-user';
import {getAuthCode} from 'steam-totp';
import SteamCommunity from 'steamcommunity';
import TradeOfferManager from 'steam-tradeoffer-manager';
import request from 'request';
import EventEmitter from 'events';
import fs from 'fs';
import {steam} from '../config.js';
import {isEmpty,getProxyUrl} from '../utils.js';

class SteamManager extends EventEmitter {};
let steamManager = new SteamManager;

const proxyUrl = getProxyUrl();
const userOptions = {autoRelogin: false};
if (!isEmpty(proxyUrl)) userOptions.httpProxy = proxyUrl;

const user = new SteamUser(userOptions);
const community = new SteamCommunity({request: request.defaults({proxy: proxyUrl})});
const manager = new TradeOfferManager({
	steam: user,
	community: community,
	language: 'en',
  cancelTime: 10 * 60 * 1000,
  pendingCancelTime: 1 * 60 * 1000
});

//********************* Variables **************************
let acceptOfferErrCount = 0;
let loginKey = '';

//*************** SteamManager Methods *********************
steamManager.sendItem = parameters => {
  const message = parameters.tradeoffermessage;
  const items = parameters.items;
  const tradeLink = `https://steamcommunity.com/tradeoffer/new/?partner=${parameters.partner}&token=${parameters.token}`;

  let tradeOffer = manager.createOffer(tradeLink);
  tradeOffer.addMyItems(items);
  tradeOffer.setMessage(message);
  
  return new Promise ((resolve, reject) => {
    tradeOffer.send((err, status) => {
      if (err) {
        reject(err);
      } else {
        resolve({status: status, id: tradeOffer.id});
      }
    });
  });
}

steamManager.acceptConfirmation = tradeOfferId => {
  return new Promise ((resolve, reject) => {
    community.acceptConfirmationForObject(steam.identitySecret, tradeOfferId, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve('Обмен успешно подтвержден.');
      }
    });
  });
}

//********************** Events ****************************
user.on('loggedOn', () => {
	console.log('logged on');
});

user.on('webSession', (sid, cookies) => {
  console.log('webSession event.');
	manager.setCookies(cookies);
  community.setCookies(cookies);
});

user.on('loginKey', key => {
  writeFileWithLoginKey(key)
    .then(res => console.log(res))
    .catch(err => console.log(err));
});

user.on('error', err => {
  console.log('node user: ' + err.message);
});

user.on('disconnected', (eresult, msg) => {
  console.log(`disconnected message: ${msg}`);
});

community.on('sessionExpired', err => {
  console.log(`SessionExpired emitted. Reason: ${err}`);
  try {
    if (!user.steamID) {
      // тут сначала удаляем токен, чтобы релолгин был без него,
      // так как он уже не валидный
      writeFileWithLoginKey('')
        .then(res => {
          console.log('Steam token cleared.');
          readFileWithLoginKey();
        })
        .catch(err => console.log(err));
    } else {
      user.webLogOn(err => {
        if (err) {
          console.log('webLogOn error: ' + err.message);
        }
      });
    }
  } catch (error) {
    console.log('Relogin error: ' + error);
  }
});

manager.on('newOffer', offer => {
  offer.getUserDetails((err, me, them) => {
    let partner = {};
    if (err) {
      console.log('getUserDetails error: ' + err.message);
      partner.escrowDays = 0;
      partner.personaName = 'Unknown user';
      partner.contexts = {
        '730': {
          asset_count: 3 
        }
      };
    } else {
      partner = them;
    }
    console.log('Новое предложение обмена от ' + partner.personaName);

    // если в предложении есть мои предметы
    if (offer.itemsToGive.length > 0) {
      console.log('В предложении есть мои предметы. Предложение не было принято.');
      return;
    }
    // предметы находятся на удержании
    if (partner.escrowDays != 0) {
      console.log(`У этого пользователя предметы на удержании ${partner.escrowDays} дня. Предложение не было принято.`);
      return;
    }
    acceptOffer(offer);
  });
});

manager.on('sentOfferCanceled', offer => {
  console.log('Обмен отменен, так как не был принят течение 10 минут.');
});

manager.on('sentPendingOfferCanceled', offer => {
  console.log('Обмен отменен, так как не был подтверждён.');
});

//*************** Help Functions ***************************
const acceptOffer = offer => {
  offer.accept((err, status) => {
    if (err) {
      console.log('accept offer: ' + err.message);
      if (acceptOfferErrCount < 3) {
        console.log('Пробую еще раз...');
        if (!(~err.message.indexOf('(28)'))) {
          acceptOfferErrCount++;
        }
        setTimeout(() => { acceptOffer(offer) }, 2 * 1000);
      } else {
        acceptOfferErrCount = 0;
        console.log('Не получилось принять предмет.');
      }
    } else {
      acceptOfferErrCount = 0;
      if (status == 'accepted') {
        console.log('Предложение успешно принято.');
      } else {
        console.log(`Предложение принято со статусом: ${status}`);
      }
    }
  });
}

const createLogOnOptions = () => {
  if (isEmpty(loginKey)) {
    return {
      accountName:      steam.accountName,
      password:         steam.password,
      twoFactorCode:    getAuthCode(steam.sharedSecret),
      rememberPassword: true
    }
  } else {
    return {
      accountName:      steam.accountName,
      loginKey:         loginKey, 
      rememberPassword: true
    }
  }
};

const readFileWithLoginKey = () => {
  fs.readFile('token.txt', 'utf8', (err, data) => {
    if (err) {
      console.log('readFile error: ' + err);
    } else {
      loginKey = data;
    }
    user.logOn(createLogOnOptions());
  });
}

const writeFileWithLoginKey = (key) => {
  return new Promise ((resolve, reject) => {
    fs.writeFile('token.txt', key, 'utf8', (err) => {
      if (!err) {
        resolve('Successful write to token.json.');
      } else {
        reject('writeFile token.json error: ' + err);
      }
    });
  });
}

const refreshWebSession = () => {
  if (user.steamID) {
    user.webLogOn();
  } else {
    readFileWithLoginKey();
  }
}

//************* Start steam manager *********************
readFileWithLoginKey();
setInterval(() => {
  refreshWebSession();
}, 30 * 60 * 1000);

export {steamManager as default};