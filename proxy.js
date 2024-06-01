const { createProxyMiddleware } = require("http-proxy-middleware");

const proxyOptionsStatus = {
  target: "https://payment.alfabank.ru/payment/rest/getOrderStatus.do",
  changeOrigin: true,
  pathRewrite: {
    "^/api/api-status": "",
  },
};

const apiProxyStatus = createProxyMiddleware(
  "/api/api-status",
  proxyOptionsStatus
);

const proxyOptionsPay = {
  target: "https://payment.alfabank.ru/payment/rest/register.do",
  changeOrigin: true,
  pathRewrite: {
    "^/api/api-pay": "",
  },
};

const apiProxyPay = createProxyMiddleware("/api/api-pay", proxyOptionsPay);

const proxyOptionsDeliverAuth = {
  target: "https://api.edu.cdek.ru/v2/oauth/token?parameters",
    // target: 'https://api.cdek.ru/v2/oauth/token?parameters',
  changeOrigin: true,
  pathRewrite: {
    "^/api/api-auth": "",
  },
};

const apiProxyDeliverAuth = createProxyMiddleware(
  "/api/api-auth",
  proxyOptionsDeliverAuth
);

const proxyOptionsDeliver = {
  target: "https://api.edu.cdek.ru/v2/orders",
  //   target: 'https://api.cdek.ru/v2/orders',
  changeOrigin: true,
  pathRewrite: {
    "^/api/api-delivery": "",
  },
  timeout: 30000, 
      proxyTimeout: 30000
};

const apiProxyDeliver = createProxyMiddleware(
  "/api/api-delivery",
  proxyOptionsDeliver
);

module.exports = {
  apiProxyStatus,
  apiProxyPay,
  apiProxyDeliverAuth,
  apiProxyDeliver,
};
