try {
  const baileys = require('@whiskeysockets/baileys');
  console.log('Baileys loaded OK');
  console.log('Has default:', typeof baileys.default);
  console.log('Has sendMessage:', typeof baileys.default?.sendMessage);
} catch(e) {
  console.log('FAIL:', e.message);
  console.log('Stack:', e.stack?.split('\n')[0]);
}