// https://angular.io/guide/build#proxying-to-a-backend-server

// Spring backend – change port if your app runs on a different one (e.g. 8080)
const SPRING_BACKEND = 'http://localhost:8080';

const PROXY_CONFIG = {
  // Proxy API calls to Spring (auth, me, and any other /api paths you add)
 
  // IMPORTANT: Uncomment this to proxy /api requests
  '/api': {
    target: SPRING_BACKEND,
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
  },
  '/users/**': {
    target: 'https://api.github.com',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
  },
};

module.exports = PROXY_CONFIG;