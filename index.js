var tryfer = require('tryfer');
var Scribe = require('scribe').Scribe;

function ZipkinMiddleware(options) {
	this.serviceName = options.serviceName || 'default-express-app';
	this.scribeHost = options.scribeHost || "localhost";
	this.scribePort = options.scribePort || 1463;
	this.scribeCategory = options.scribeCategory || 'zipkin';
	this.scribeClient = new Scribe(this.scribeHost, this.scribePort, { autoReconnect: true });
	this.zipkinTracer = false;
	this.tryfer = tryfer;
}

ZipkinMiddleware.prototype.initialize = function(ready) {
	if (this.zipkinTracer) {
		throw new Exception("Middleware has already been initialised");
	}

	if (!this.scribeClient.opened) {
		this.scribeClient.open(function(error) {
			if (error) {
				ready(error);
				return;
			}

			this.zipkinTracer = new tryfer.node_tracers.ZipkinTracer(this.scribeClient, this.scribeCategory, { maxTraces:5 });
			tryfer.tracers.pushTracer(this.zipkinTracer);
			ready(null, true);
		}.bind(this));
		return;
	}

	this.zipkinTracer = new tryfer.node_tracers.ZipkinTracer(this.scribeClient, this.scribeCategory, { maxTraces:5 });
	tryfer.tracers.pushTracer(this.zipkinTracer);
	process.nextTick(function() { ready(null, true); });
};

ZipkinMiddleware.prototype.install = function() {
	return function(request, response, next) {
		if (!this.zipkinTracer) {
			throw new Exception("The middleware must be initialised before serving requests. Try something like `middleware.initialise(function(error, ready) { app.listen(..); })`");
		}

		var trace = tryfer.trace.Trace.fromRequest(request, this.serviceName);
		trace.record(tryfer.trace.Annotation.serverRecv());

		// Add function the the request object to add annotations to the
		// trace
		request.addTraceAnnotation = function(key, value) {
			trace.record(tryfer.trace.Annotation.string(key, value));
		};

		// Add some basic annotations for HTTP requests:
		request.addTraceAnnotation('http.url', request.originalUrl);

		// Shim the response end method so we can immediately record the
		// serverSend event.
		var originalResponseEnd = response.end;
		response.end = function() {
			var returnValue = originalResponseEnd.apply(response, arguments);
			trace.record(tryfer.trace.Annotation.serverSend());
			return returnValue;
		};

		next();
	}.bind(this);
};
module.exports = ZipkinMiddleware;
