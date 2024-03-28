class Service {
    constructor(login, secret, baseUrl = 'https://api.cdek.ru/v2') {
        this.login = login;
        this.secret = secret;
        this.baseUrl = baseUrl;
    }

    process(requestData, body) {
        this.requestData = {...requestData, ...JSON.parse(body)};

        if (!this.requestData.action) {
            this.sendValidationError('Action is required');
        }

        this.getAuthToken();

        switch (this.requestData.action) {
            case 'offices':
                this.sendResponse(this.getOffices());
                break;
            case 'calculate':
                this.sendResponse(this.calculate());
                break;
            default:
                this.sendValidationError('Unknown action');
        }
    }

    sendValidationError(message) {
        this.http_response_code(400);
        console.log('Content-Type: application/json');
        console.log('X-Service-Version: 3.9.6');
        console.log(JSON.stringify({ message }));
        process.exit();
    }

    http_response_code(code) {
        console.log(`HTTP/1.0 ${code}`);
    }

    getAuthToken() {
        const token = this.httpRequest('oauth/token', {
            grant_type: 'client_credentials',
            client_id: this.login,
            client_secret: this.secret,
        }, true);
        const result = JSON.parse(token.result);
        if (!result.access_token) {
            throw new Error('Server not authorized to CDEK API');
        }

        this.authToken = result.access_token;
    }

    httpRequest(method, data, useFormData = false, useJson = false) {
        let url = `${this.baseUrl}/${method}`;
        let headers = {
            'Accept': 'application/json',
            'X-App-Name': 'widget_pvz',
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        let requestOptions = {
            method: 'GET',
            headers: headers,
        };

        if (useFormData) {
            requestOptions.method = 'POST';
            requestOptions.body = data;
        } else if (useJson) {
            headers['Content-Type'] = 'application/json';
            requestOptions.method = 'POST';
            requestOptions.body = JSON.stringify(data);
        } else {
            url += '?' + new URLSearchParams(data).toString();
        }

        return fetch(url, requestOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => ({ result: data }));
    }

    sendResponse(data) {
        this.http_response_code(200);
        console.log('Content-Type: application/json');
        console.log('X-Service-Version: 3.9.6');
        if (data.addedHeaders) {
            data.addedHeaders.forEach(header => console.log(header));
        }
        console.log(data.result);
        process.exit();
    }

    getOffices() {
        return this.httpRequest('deliverypoints', this.requestData);
    }

    calculate() {
        return this.httpRequest('calculator/tarifflist', this.requestData, false, true);
    }
}

const service = new Service(
    /* Put your account for integration here */ 'feedQ34gghIQJBPpDAEBKkmJ6BCIuWxZ',
    /* Put your password for integration here */ 'nL8I0JZSwECyehnN3KJoeclHOUI4Rxlc'
);
service.process({}, '');
