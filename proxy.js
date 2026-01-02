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
  // target: "https://api.edu.cdek.ru/v2/oauth/token?parameters",
  target: "https://api.cdek.ru/v2/oauth/token?parameters",
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
  // target: "https://api.edu.cdek.ru/v2/orders",
  target: "https://api.cdek.ru/v2/orders",
  changeOrigin: true,
  pathRewrite: {
    "^/api/api-delivery": "",
  },
  // timeout: 60000, // Увеличенное время ожидания
  // proxyTimeout: 60000,
  onProxyReq: (proxyReq, req, res) => {
    // console.log('Order request:', {
    //   method: req.method,
    //   url: proxyReq.path,
    //   headers: req.headers,
    //   body: JSON.stringify(req.body), // Преобразование тела в строку для логирования
    // });

    if (req.body) {
      let bodyData = JSON.stringify(req.body);
      // Установите Content-Length для тела запроса
      // proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // Запишите тело запроса
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    let data = "";
    proxyRes.on("data", (chunk) => {
      data += chunk;
    });
    proxyRes.on("end", () => {
      // console.log('Order response:', {
      //   statusCode: proxyRes.statusCode,
      //   headers: proxyRes.headers,
      //   body: data,
      // });
    });
  },
  onError: (err, req, res) => {
    // console.error('Proxy error:', err);
    res.writeHead(500, {
      "Content-Type": "text/plain",
    });
    res.end(
      "Something went wrong. And we are reporting a custom error message."
    );
  },
};

const apiProxyDeliver = createProxyMiddleware(
  "/api/api-delivery",
  proxyOptionsDeliver
);

const proxyOptionsDeliverPrice = {
  target: "https://api.cdek.ru/v2/calculator/tariff",
  changeOrigin: true,
  pathRewrite: {
    "^/api/api-calculate": "",
  },
  // timeout: 60000, // Увеличенное время ожидания
  // proxyTimeout: 60000,
  onProxyReq: (proxyReq, req, res) => {
    // console.log('Order request:', {
    //   method: req.method,
    //   url: proxyReq.path,
    //   headers: req.headers,
    //   body: JSON.stringify(req.body), // Преобразование тела в строку для логирования
    // });

    if (req.body) {
      let bodyData = JSON.stringify(req.body);
      // Установите Content-Length для тела запроса
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // Запишите тело запроса
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    let data = "";
    proxyRes.on("data", (chunk) => {
      data += chunk;
    });
    proxyRes.on("end", () => {
      // console.log('Order response:', {
      //   statusCode: proxyRes.statusCode,
      //   headers: proxyRes.headers,
      //   body: data,
      // });
    });
  },
  onError: (err, req, res) => {
    // console.error('Proxy error:', err);
    res.writeHead(500, {
      "Content-Type": "text/plain",
    });
    res.end(
      "Something went wrong. And we are reporting a custom error message."
    );
  },
};

const proxyOptionsCountries= {
  target: "https://api.cdek.ru/v2/location/cities",
  changeOrigin: true,
  pathRewrite: {
    "^/api/api-countries": "",
  },
};

const apiProxyCountries = createProxyMiddleware(
  "/api/api-countries",
  proxyOptionsCountries
);


const apiProxyDeliverPrice = createProxyMiddleware(
  "/api/api-calculate",
  proxyOptionsDeliverPrice
);

module.exports = {
  apiProxyStatus,
  apiProxyPay,
  apiProxyDeliverAuth,
  apiProxyDeliver,
  apiProxyDeliverPrice,
  apiProxyCountries,
};
