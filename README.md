# Zipkin express middleware


## API

The zipkin-middleware object can be created with an options object that
accepts the following options:

| Key              | Description                                           | Default       |
|------------------|-------------------------------------------------------|---------------|
| 'scribeHost'     | The host the scribe daemon is running on              | `'localhost'` |
| 'scribePort'     | The port the scribe daemon is listening on            | `1463`        |
| 'scribeCategory' | The name of the category to send the Zipkin traces to | `'zipkin'`    |

For example:

```JS
var zipkinMiddleware = new ZipkinMiddleware({
	scribeHost: '10.0.0.3',
	scribePort: 1234,
	scribeCategory: 'my-custom-category'
});
```

### Using the middleware

The created middleware object needs to be installed on a route using the `install` method,
for example:

```JS
var zipkinMiddleware = new ZipkinMiddleware();
app.use(zipkinMiddleware.install());
```

Additionally the middleware *must be* initialised before starting the HTTP
server using the `initialize`, async method.

```JS
var zipkinMiddleware = new ZipkinMiddleware();
zipkinMiddleware.initialize(function(error, ready) {
	if (error) { throw error; }
	app.listen(myAppsPort, bindAddress);
});
```

# Basic Usage

```JS

var express = require('express');
var app = express();

var ZipkinMiddleware = require('zipkin-middleware');

// Create a new Middleware object
var zipkinMiddleware = new ZipkinMiddleware();

// Install the middleware
app.use(zipkinMiddleware.install());

// Create routes etc. as normal
app.get('/', function(request, response) {
	request.addTraceAnnotation('some', 'extra data to attach to the trace');

	response.send("Hello World");
});

// Because the middleware needs to asynchronously connect to the scribe daemon
// we need to initialise it for the first time before serving requests in
// order to capture all requests.
zipkinMiddleware.initialise(function(error, ready) {
	if (error) {
		throw error;
	}

	// Once connected, start the http server
	app.listen(8080, 'localhost');
});
```

# License

MIT
