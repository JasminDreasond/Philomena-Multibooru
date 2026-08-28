/**
 * Ping/Pong Logic to plugin test.
 *
 * @param {import('../TinyServiceWorkerEngine.mjs').default} sw
 */
const TinyPingPwa = (sw) =>
  sw.addMessageListener('ping', ({ reply }) => {
    reply('pong', { msg: 'mio! :3' });
  });

export default TinyPingPwa;
