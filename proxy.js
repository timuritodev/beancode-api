const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

// payment.alfabank.ru теперь подписан корнями НУЦ Минцифры (Russian Trusted Root + Sub CA),
// которых нет во встроенном хранилище Node → TLS падает с SELF_SIGNED_CERT_IN_CHAIN и
// оплата (register.do) / статус заказа (getOrderStatus.do) перестают работать.
// Создаём https-агент, который доверяет росс. корням ПЛЮС стандартным (tls.rootCertificates),
// и подключаем его только к прокси Альфы. Если файла сертификата нет — не роняем сервер,
// а лишь пишем предупреждение (оплата останется нерабочей, но остальной API живёт).
let alfaHttpsAgent; // undefined => прокси работает как прежде, без доп. CA
try {
	const russianCa = fs.readFileSync(
		path.join(__dirname, 'russian_trusted_ca.pem'),
		'utf8'
	);
	alfaHttpsAgent = new https.Agent({
		ca: [...tls.rootCertificates, russianCa],
	});
} catch (err) {
	console.error(
		'[proxy] Не удалось загрузить russian_trusted_ca.pem, оплата Альфа-Банка может не работать:',
		err.message
	);
}

const proxyOptionsStatus = {
	target: 'https://payment.alfabank.ru/payment/rest/getOrderStatus.do',
	changeOrigin: true,
	agent: alfaHttpsAgent,
	pathRewrite: {
		'^/api/api-status': '',
	},
};

const apiProxyStatus = createProxyMiddleware(
	'/api/api-status',
	proxyOptionsStatus
);

const proxyOptionsPay = {
	target: 'https://payment.alfabank.ru/payment/rest/register.do',
	changeOrigin: true,
	agent: alfaHttpsAgent,
	pathRewrite: {
		'^/api/api-pay': '',
	},
	onProxyReq: (proxyReq, req, res) => {
		// Получаем секретные данные из переменных окружения
		const userName = process.env.PAY_API_USERNAME;
		const password = process.env.PAY_API_PASSWORD;

		if (!userName || !password || !req.body) {
			return;
		}

		// bodyParser уже распарсил body как объект
		const formData = new URLSearchParams();

		// Добавляем userName и password первыми
		formData.append('userName', userName);
		formData.append('password', password);

		// Добавляем остальные поля из req.body (исключаем userName и password если они есть)
		for (const key in req.body) {
			if (
				key !== 'userName' &&
				key !== 'password' &&
				req.body[key] !== undefined &&
				req.body[key] !== null
			) {
				formData.append(key, String(req.body[key]));
			}
		}

		const bodyString = formData.toString();
		proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
		proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyString, 'utf8'));
		proxyReq.write(bodyString);
	},
};

const apiProxyPay = createProxyMiddleware('/api/api-pay', proxyOptionsPay);

const proxyOptionsDeliverAuth = {
	// target: "https://api.edu.cdek.ru/v2/oauth/token?parameters",
	target: 'https://api.cdek.ru/v2/oauth/token?parameters',
	changeOrigin: true,
	pathRewrite: {
		'^/api/api-auth': '',
	},
};

const apiProxyDeliverAuth = createProxyMiddleware(
	'/api/api-auth',
	proxyOptionsDeliverAuth
);

const proxyOptionsDeliver = {
	// target: "https://api.edu.cdek.ru/v2/orders",
	target: 'https://api.cdek.ru/v2/orders',
	changeOrigin: true,
	pathRewrite: {
		'^/api/api-delivery': '',
	},
	// timeout: 60000, // Увеличенное время ожидания
	// proxyTimeout: 60000,
	onProxyReq: (proxyReq, req, res) => {
		// console.log("Order request:", {
		//   method: req.method,
		//   url: proxyReq.path,
		//   headers: req.headers,
		//   body: JSON.stringify(req.body), // Преобразование тела в строку для логирования
		// });

		if (req.body) {
			let bodyData = JSON.stringify(req.body);
			// Установите Content-Length для тела запроса
			// proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
			// Запишите тело запроса
			proxyReq.write(bodyData);
		}
	},
	onProxyRes: (proxyRes, req, res) => {
		let data = '';
		proxyRes.on('data', (chunk) => {
			data += chunk;
		});
		proxyRes.on('end', () => {
			// console.log("Order response:", {
			//   statusCode: proxyRes.statusCode,
			//   headers: proxyRes.headers,
			//   body: data,
			// });
		});
	},
	onError: (err, req, res) => {
		// console.error("Proxy error:", err);
		res.writeHead(500, {
			'Content-Type': 'text/plain',
		});
		res.end(
			'Something went wrong. And we are reporting a custom error message.'
		);
	},
};

const apiProxyDeliver = createProxyMiddleware(
	'/api/api-delivery',
	proxyOptionsDeliver
);

const proxyOptionsDeliverPrice = {
	target: 'https://api.cdek.ru/v2/calculator/tariff',
	changeOrigin: true,
	pathRewrite: {
		'^/api/api-calculate': '',
	},
	// timeout: 60000, // Увеличенное время ожидания
	// proxyTimeout: 60000,
	onProxyReq: (proxyReq, req, res) => {
		// console.log("Order request:", {
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
		let data = '';
		proxyRes.on('data', (chunk) => {
			data += chunk;
		});
		proxyRes.on('end', () => {
			// console.log("Order response:", {
			//   statusCode: proxyRes.statusCode,
			//   headers: proxyRes.headers,
			//   body: data,
			// });
		});
	},
	onError: (err, req, res) => {
		// console.error("Proxy error:", err);
		res.writeHead(500, {
			'Content-Type': 'text/plain',
		});
		res.end(
			'Something went wrong. And we are reporting a custom error message.'
		);
	},
};

const proxyOptionsCountries = {
	target: 'https://api.cdek.ru/v2/location/cities',
	changeOrigin: true,
	pathRewrite: {
		'^/api/api-countries': '',
	},
};

const apiProxyCountries = createProxyMiddleware(
	'/api/api-countries',
	proxyOptionsCountries
);

const apiProxyDeliverPrice = createProxyMiddleware(
	'/api/api-calculate',
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
