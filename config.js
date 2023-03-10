export const steam = {
  accountName: '',
  password: '',
  sharedSecret: '',
  identitySecret: '',
  steamApiKey: ''
}
export const market = {
  apiKey: '',
  baseUrl: 'https://market.csgo.com/api/v2/',
  requestInterval: 5, // Delay between requests on market.csgo.com (in seconds)
  currency: 'USD' // USD, EUR or RUB
}
export const proxy = {
  domen: '',
  port: '',
  user: '',
  password: ''
}
/*
* The item must contain: item_id, market_hash_name, maxPrice and minPrice
*  For example:
* {
*   item_id: 0123456789,
*   market_hash_name: 'M4A1-S | Leaded Glass (Minimal Wear)',
*   maxPrice: 8000, // 1USD = 1000, 1EUR = 1000, 1RUB = 100
*   minPrice: 6500
* }
*/
export const items = [
  
];