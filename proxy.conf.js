// https://angular.io/guide/build#proxying-to-a-backend-server

// Spring backend – change port if your app runs on a different one (e.g. 8080)
const SPRING_BACKEND = 'http://localhost:8080';

const PROXY_CONFIG = {
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  },
  "/uploads": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
};

module.exports = PROXY_CONFIG;